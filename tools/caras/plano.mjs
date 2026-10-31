// Plano del dinero, fase 2: guarda para siempre los enlaces de cada lanzamiento que ve el recolector, en Cloudflare D1
// (base de datos SQLite, privada). Antes esos enlaces se tiraban al día siguiente y solo quedaban contadores en la base.
//
//   lanz    un token nuevo: quién pagó la creación (py), quién lo creó (cr), quién financió al creador (fu),
//           plataforma, fecha, liquidez, nivel de SolFlag si se analizó, si lo lanzó una cara conocida y,
//           a las 24 h, si murió (dead24) y su capitalización (mc24)
//   compras quien compró en los primeros bloques (d = bloques después de la creación; solo tokens analizados,
//           hasta BUYERS_MAX por token): la base para reconocer snipers
//
// Necesita CF_API_TOKEN (permiso D1: Edit), CF_ACCOUNT_ID y CF_D1_ID. Sin ellos no hace nada.
// Lo pendiente de subir vive en el estado del recolector (state.planoQ): si D1 falla, se reintenta en la siguiente.

export const BUYERS_MAX = 5;          // compradores por token (cada uno cuesta una petición al RPC)
export const BUYERS_SLOTS = 2;        // hasta cuántos bloques después de la creación cuenta como «primer bloque»
export const QUEUE_MAX = 20000;       // filas pendientes como mucho, por si D1 está caído muchos días
const MAX_PARAMS = 100;               // límite de D1 de valores por consulta

export const LANZ = ["m", "t", "plat", "dex", "py", "cr", "fu", "liq", "lvl", "cara", "dead24", "mc24"];
export const COMPRAS = ["m", "w", "d", "sig"];

export const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS lanz (m TEXT PRIMARY KEY, t INTEGER, plat TEXT, dex TEXT, py TEXT, cr TEXT, fu TEXT, liq INTEGER, lvl TEXT, cara TEXT, dead24 INTEGER, mc24 INTEGER, up INTEGER)",
  "CREATE INDEX IF NOT EXISTS lanz_py ON lanz(py)",
  "CREATE INDEX IF NOT EXISTS lanz_cr ON lanz(cr)",
  "CREATE INDEX IF NOT EXISTS lanz_fu ON lanz(fu)",
  "CREATE INDEX IF NOT EXISTS lanz_t ON lanz(t)",
  "CREATE TABLE IF NOT EXISTS compras (m TEXT, w TEXT, d INTEGER, sig TEXT, PRIMARY KEY (m, w))",
  "CREATE INDEX IF NOT EXISTS compras_w ON compras(w)"
];

export function emptyQueue() { return { l: {}, c: [] }; }

// Apunta (o completa) la fila de un lanzamiento; lo que ya estaba y ahora no viene se conserva
export function queueLaunch(q, row) {
  const cur = q.l[row.m] || (q.l[row.m] = { m: row.m });
  LANZ.forEach(function (k) { if (row[k] !== undefined && row[k] !== null) cur[k] = row[k]; });
  return cur;
}
export function queueBuyers(q, m, buyers) {
  buyers.forEach(function (b) { q.c.push({ m: m, w: b.w, d: b.d, sig: b.sig }); });
}
export function queueSize(q) { return Object.keys(q.l).length + q.c.length; }
// Si D1 lleva mucho caído, se quedan las filas más nuevas
export function trimQueue(q) {
  const ks = Object.keys(q.l);
  if (ks.length > QUEUE_MAX) ks.sort(function (a, b) { return (q.l[a].t || 0) - (q.l[b].t || 0); }).slice(0, ks.length - QUEUE_MAX).forEach(function (k) { delete q.l[k]; });
  if (q.c.length > QUEUE_MAX) q.c = q.c.slice(q.c.length - QUEUE_MAX);
}

// Compradores del primer bloque a partir de la página más antigua de firmas del token (la que trae la creación):
// firmas sin error hasta BUYERS_SLOTS bloques después de la creación, sin la propia creación. Devuelve las firmas a
// mirar, con d = bloques de diferencia; quién firmó se averigua después (una petición por firma).
export function buyerCandidates(page) {
  const ok = (page || []).filter(function (s) { return s && s.signature && s.slot != null; });
  if (!ok.length) return [];
  const asc = ok.slice().sort(function (a, b) { return a.slot - b.slot; });
  const s0 = asc[0].slot, creation = ok[ok.length - 1].signature;   // la página viene de más nueva a más antigua
  return asc.filter(function (s) { return !s.err && s.signature !== creation && s.slot - s0 <= BUYERS_SLOTS; })
    .slice(0, BUYERS_MAX).map(function (s) { return { sig: s.signature, d: s.slot - s0 }; });
}

// INSERT de varias filas a la vez, troceado para no pasar de MAX_PARAMS valores. En lanz, una fila repetida
// completa la que había (COALESCE: lo nuevo manda si viene, lo viejo se queda si no); en compras se ignora.
export function upsertStatements(table, cols, rows, now) {
  const all = table === "lanz" ? cols.concat(["up"]) : cols;
  const per = Math.max(1, Math.floor(MAX_PARAMS / all.length)), out = [];
  for (let i = 0; i < rows.length; i += per) {
    const part = rows.slice(i, i + per), params = [];
    part.forEach(function (r) { all.forEach(function (c) { const v = c === "up" ? now : r[c]; params.push(v === undefined ? null : typeof v === "boolean" ? (v ? 1 : 0) : v); }); });
    const values = part.map(function () { return "(" + all.map(function () { return "?"; }).join(",") + ")"; }).join(",");
    let sql = "INSERT INTO " + table + " (" + all.join(",") + ") VALUES " + values;
    if (table === "lanz") sql += " ON CONFLICT(m) DO UPDATE SET " + all.filter(function (c) { return c !== "m"; }).map(function (c) { return c + "=COALESCE(excluded." + c + "," + c + ")"; }).join(",");
    else sql += " ON CONFLICT DO NOTHING";
    out.push({ sql: sql, params: params });
  }
  return out;
}

export function d1Config(env) {
  const e = env || process.env;
  if (!e.CF_API_TOKEN || !e.CF_ACCOUNT_ID || !e.CF_D1_ID) return null;
  return { url: (e.CF_API_BASE || "https://api.cloudflare.com/client/v4") + "/accounts/" + e.CF_ACCOUNT_ID + "/d1/database/" + e.CF_D1_ID + "/query", token: e.CF_API_TOKEN };
}

async function query(cfg, st) {
  const r = await fetch(cfg.url, { method: "POST", headers: { Authorization: "Bearer " + cfg.token, "Content-Type": "application/json" }, body: JSON.stringify(st) });
  const j = await r.json().catch(function () { return null; });
  if (!r.ok || !j || !j.success) throw new Error("D1 " + r.status + ": " + JSON.stringify((j && j.errors) || "").slice(0, 200));
  return j.result;
}

// Sube todo lo pendiente. Devuelve { lanz, compras } subidas; lo que no se pudo subir sigue en la cola.
export async function flush(cfg, q, now) {
  const done = { lanz: 0, compras: 0 };
  if (!cfg || !queueSize(q)) return done;
  for (const sql of SCHEMA) await query(cfg, { sql: sql });
  const rows = Object.values(q.l);
  for (const st of upsertStatements("lanz", LANZ, rows, now)) await query(cfg, st);
  done.lanz = rows.length; q.l = {};
  for (const st of upsertStatements("compras", COMPRAS, q.c, now)) await query(cfg, st);
  done.compras = q.c.length; q.c = [];
  return done;
}
