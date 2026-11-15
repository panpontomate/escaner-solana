// API pública de SolFlag (Cloudflare Worker delante de la base D1 «solflag-plano» que llena el recolector).
// Solo hechos de la cadena: quién pagó, creó o financió cada lanzamiento, quién compró en los primeros bloques y
// cómo acabó a las 24 h. Sin etiquetas personales.
//
//   GET  /api/wallet/<dirección>   lo que se sabe de una wallet en los lanzamientos registrados
//   GET  /api/token/<mint>         un lanzamiento: quién está detrás (con su historial) y sus primeros compradores
//   GET  /api/portada              lo de las últimas 24 h para la portada: lanzamientos por DEX y nivel, creadores
//                                  en serie, financiadores de varios creadores y quién compra en los primeros bloques
//   GET  /api/ventas/<mint>?w=<w1,w2…>&desde=<unix>   compras y ventas de ese token de hasta 5 wallets desde que nació
//                                  (Helius), para las marcas de la gráfica; 30 min en la caché
//   GET  /api/logo/<mint>         el logo del token (getAsset de Helius), una semana en la caché
//   GET  /api/acciones            acciones tokenizadas frente a la acción real: prima, bolsa abierta, liquidez (acciones.js)
//   GET  /api/cotiza/<mint>        dónde se negocia: pools de la cadena y exchanges con comisión, identidad y MiCA (cotiza.js)
//   GET  /api/top/<mint>           mayores cuentas del token (Helius, 2 min en caché, 30/min por conexión)
//   (por token.solflag.com, la ficha pública de cada token: ver ficha.js)
//   POST /api/visto/<mint>         la web avisa de que alguien escaneó ese token: se apunta solo el token y cuántas
//                                  veces (tabla pedidos), nada de quién. El recolector lo analiza después él mismo
//
// Formato versión 1 (v: 1). Si cambia de forma incompatible, sube v.
// Cada respuesta se guarda 5 min en la caché de Cloudflare para no repetir consultas a D1.

import { ficha, HOST as FICHA_HOST } from "./ficha.js";
import { acciones } from "./acciones.js";
import { cotiza } from "./cotiza.js";

export const V = 1;
export const LIST = 25;            // lanzamientos y compras que se devuelven, los más recientes
export const CACHE_S = 300;
const ADDR = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const ROLES = [["payer", "py"], ["creator", "cr"], ["funder", "fu"]];

const HEAD = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "cache-control": "public, max-age=" + CACHE_S,
  "x-content-type-options": "nosniff"
};
const json = (body, status) => new Response(JSON.stringify(body), { status: status || 200, headers: HEAD });
// los errores no se guardan en ninguna caché: un 404 o un 503 de paso no debe quedarse en el navegador
const fail = (status, error) => new Response(JSON.stringify({ v: V, error: error }), { status: status, headers: Object.assign({}, HEAD, { "cache-control": "no-store" }) });

// Resumen de un grupo de lanzamientos: cuántos, cuántos tienen ya el resultado de 24 h y cuántos murieron
const SUM = "COUNT(*) AS n, SUM(dead24 IS NOT NULL) AS resolved, SUM(dead24 = 1) AS dead24";
const tally = (r) => ({ n: r.n || 0, resolved: r.resolved || 0, dead24: r.dead24 || 0 });
const launch = (r) => {
  const o = { m: r.m, t: r.t, plat: r.plat, dex: r.dex, lvl: r.lvl, tr: r.tr || undefined, dead24: r.dead24 == null ? null : !!r.dead24, mc24: r.mc24 };
  Object.keys(o).forEach((k) => { if (o[k] == null && k !== "dead24") delete o[k]; });
  return o;
};

async function all(db, sql, args) { return (await db.prepare(sql).bind(...args).all()).results || []; }

export async function wallet(db, a) {
  const roles = {};
  const counts = await all(db, ROLES.map(([k, c]) => "SELECT '" + k + "' AS role, " + SUM + " FROM lanz WHERE " + c + " = ?1").join(" UNION ALL "), [a]);
  counts.forEach((r) => { roles[r.role] = tally(r); });
  const rows = await all(db, "SELECT * FROM lanz WHERE py = ?1 OR cr = ?1 OR fu = ?1 ORDER BY t DESC LIMIT " + LIST, [a]);
  const launches = rows.map((r) => Object.assign(launch(r), { roles: ROLES.filter(([, c]) => r[c] === a).map(([k]) => k) }));
  const bsum = (await all(db, "SELECT COUNT(*) AS n, SUM(l.dead24 IS NOT NULL) AS resolved, SUM(l.dead24 = 1) AS dead24 FROM compras c LEFT JOIN lanz l ON l.m = c.m WHERE c.w = ?1", [a]))[0] || {};
  const brows = await all(db, "SELECT c.m, c.d, l.t, l.plat, l.dex, l.lvl, l.tr, l.dead24, l.mc24 FROM compras c LEFT JOIN lanz l ON l.m = c.m WHERE c.w = ?1 ORDER BY l.t DESC LIMIT " + LIST, [a]);
  const buys = Object.assign(tally(bsum), { list: brows.map((r) => Object.assign(launch(r), { blocks: r.d })) });
  const known = Object.values(roles).some((r) => r.n) || buys.n > 0;
  return { v: V, wallet: a, known: known, roles: roles, launches: launches, firstBuys: buys };
}

export async function token(db, m) {
  const r = (await all(db, "SELECT * FROM lanz WHERE m = ?1", [m]))[0];
  if (!r) return null;
  const behind = {};
  for (const [k, c] of ROLES) {
    if (!r[c]) continue;
    // historial de esa wallet en el mismo papel, sin contar este lanzamiento
    const h = (await all(db, "SELECT " + SUM + " FROM lanz WHERE " + c + " = ?1 AND m <> ?2", [r[c], m]))[0] || {};
    behind[k] = Object.assign({ wallet: r[c] }, tally(h));
  }
  const buyers = (await all(db, "SELECT w, d FROM compras WHERE m = ?1 ORDER BY d, w", [m])).map((b) => ({ wallet: b.w, blocks: b.d }));
  return { v: V, token: launch(r), cara: r.cara || undefined, behind: behind, firstBuyers: buyers };
}

// Portada: las últimas 24 h. Devuelve TOP de cada lista (la web quita después los exchanges conocidos).
// spark: lanzamientos (o compras) en 8 tramos de 3 h, del más antiguo al más reciente
export const TOP = 12, DAY = 86400000, SLOT = 10800000;
export async function portada(db, now) {
  // ph(n, k): marcadores ?k … ?(k+n-1) para un IN
  const since = now - DAY, ph = (n, k) => Array.from({ length: n }, (_, i) => "?" + (i + k)).join(",");
  const spark = (rows, list) => { const by = {}; list.forEach((x) => { x.spark = by[x.w] = [0, 0, 0, 0, 0, 0, 0, 0]; });
    rows.forEach((r) => { const b = Math.max(0, Math.min(7, r.b)); if (by[r.w]) by[r.w][b] += r.n; }); };
  const tot = (await all(db, "SELECT COUNT(*) AS n, SUM(lvl = 'HIGH') AS hi, SUM(lvl IS NOT NULL) AS lv FROM lanz WHERE t > ?1", [since]))[0] || {};
  const dex = (await all(db, "SELECT dex, COUNT(*) AS n, SUM(lvl = 'HIGH') AS hi, SUM(lvl = 'MEDIUM') AS me, SUM(lvl = 'LOW') AS lo FROM lanz WHERE t > ?1 AND dex IS NOT NULL GROUP BY dex ORDER BY n DESC LIMIT 8", [since]))
    .map((r) => ({ dex: r.dex, n: r.n, hi: r.hi || 0, me: r.me || 0, lo: r.lo || 0 }));

  const creators = (await all(db, "SELECT cr AS w, COUNT(*) AS n, SUM(lvl = 'HIGH') AS hi, MAX(t) AS last FROM lanz WHERE t > ?1 AND cr IS NOT NULL GROUP BY cr HAVING n > 1 ORDER BY n DESC LIMIT " + TOP, [since]))
    .map((r) => ({ w: r.w, n: r.n, hi: r.hi || 0, last: r.last }));
  if (creators.length) {
    const ws = creators.map((c) => c.w), byW = {};
    creators.forEach((c) => { byW[c.w] = c; });
    (await all(db, "SELECT cr AS w, " + SUM + " FROM lanz WHERE cr IN (" + ph(ws.length, 1) + ") GROUP BY cr", ws))
      .forEach((r) => { Object.assign(byW[r.w], { all: tally(r) }); });
    spark(await all(db, "SELECT cr AS w, CAST((t - ?1) / " + SLOT + " AS INTEGER) AS b, COUNT(*) AS n FROM lanz WHERE t > ?1 AND cr IN (" + ph(ws.length, 2) + ") GROUP BY cr, b", [since].concat(ws)), creators);
  }

  const funders = (await all(db, "SELECT fu AS w, COUNT(DISTINCT cr) AS c, COUNT(*) AS n, MIN(t) AS first FROM lanz WHERE t > ?1 AND fu IS NOT NULL GROUP BY fu HAVING c > 1 ORDER BY c DESC, n DESC LIMIT " + TOP, [since]))
    .map((r) => ({ w: r.w, creators: r.c, n: r.n }));
  if (funders.length) {
    const ws = funders.map((f) => f.w);
    spark(await all(db, "SELECT fu AS w, CAST((t - ?1) / " + SLOT + " AS INTEGER) AS b, COUNT(*) AS n FROM lanz WHERE t > ?1 AND fu IN (" + ph(ws.length, 2) + ") GROUP BY fu, b", [since].concat(ws)), funders);
  }

  const buyers = (await all(db, "SELECT c.w AS w, COUNT(*) AS n, SUM(c.d = 0) AS d0 FROM compras c JOIN lanz l ON l.m = c.m WHERE l.t > ?1 GROUP BY c.w HAVING n > 1 ORDER BY n DESC LIMIT " + TOP, [since]))
    .map((r) => ({ w: r.w, n: r.n, d0: r.d0 || 0 }));
  if (buyers.length) {
    const ws = buyers.map((b) => b.w), byW = {};
    buyers.forEach((b) => { byW[b.w] = b; });
    (await all(db, "SELECT w, COUNT(*) AS n FROM compras WHERE w IN (" + ph(ws.length, 1) + ") GROUP BY w", ws))
      .forEach((r) => { byW[r.w].all = r.n; });
    spark(await all(db, "SELECT c.w AS w, CAST((l.t - ?1) / " + SLOT + " AS INTEGER) AS b, COUNT(*) AS n FROM compras c JOIN lanz l ON l.m = c.m WHERE l.t > ?1 AND c.w IN (" + ph(ws.length, 2) + ") GROUP BY c.w, b", [since].concat(ws)), buyers);
  }
  return { v: V, since: since, until: now, launches: { n: tot.n || 0, analyzed: tot.lv || 0, high: tot.hi || 0 }, dex: dex, creators: creators, funders: funders, buyers: buyers };
}

const PEDIDOS = "CREATE TABLE IF NOT EXISTS pedidos (m TEXT PRIMARY KEY, n INTEGER, t0 INTEGER, t1 INTEGER, hecho INTEGER)";
// un token ya procesado que no llegó a la base (o se quitó, como los viejos que estrenaban pool) vuelve a la cola si
// alguien lo escanea otra vez: así la ficha puede decir «escanéalo y lo analizaremos» sin mentir
const SEEN = "INSERT INTO pedidos (m, n, t0, t1) VALUES (?1, 1, ?2, ?2) ON CONFLICT(m) DO UPDATE SET n = n + 1, t1 = ?2";
const AGAIN = "UPDATE pedidos SET hecho = NULL WHERE m = ?1 AND hecho IS NOT NULL AND NOT EXISTS (SELECT 1 FROM lanz WHERE lanz.m = ?1)";

// Apunta un token escaneado. Si la tabla aún no existe (antes de la primera ejecución del recolector), la crea
export async function seen(db, m, now) {
  try { await db.prepare(SEEN).bind(m, now).run(); }
  catch (e) { await db.prepare(PEDIDOS).bind().run(); await db.prepare(SEEN).bind(m, now).run(); }
  try { await db.prepare(AGAIN).bind(m).run(); } catch (e) { /* sin tabla lanz todavía: no hay nada que repetir */ }
}

async function visto(req, env, m) {
  const empty = (status) => new Response(null, { status: status, headers: { "access-control-allow-origin": "*", "cache-control": "no-store" } });
  if (!ADDR.test(m)) return empty(400);
  // límite por conexión con el limitador de Cloudflare (lo guarda él, de paso y en memoria; aquí no se apunta la IP)
  if (env.VISTO_LIMIT) {
    const { success } = await env.VISTO_LIMIT.limit({ key: req.headers.get("cf-connecting-ip") || "?" });
    if (!success) return empty(429);
  }
  try { await seen(env.DB, m, Date.now()); return empty(204); }
  catch (e) { return empty(503); }
}

// Logo de un token con getAsset de Helius (secreto SOLANA_RPC), para que la web no gaste GeckoTerminal en eso
// (15/11). null = no tiene logo; undefined = el RPC no contestó (no se guarda en la caché)
export async function logo(env, m, fetchFn) {
  if (!env.SOLANA_RPC) return undefined;
  const j = await fetchFn(env.SOLANA_RPC, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getAsset", params: { id: m } }) })
    .then((r) => r.json()).catch(() => null);
  if (!j) return undefined;
  const c = j.result && j.result.content;
  if (!c) return j.error ? null : undefined;
  const f = (c.files || []).find((x) => x && x.uri && /^image\//.test(x.mime || "image/"));
  return logoUrl((c.links && c.links.image) || (f && f.uri) || null);
}
// Mayores cuentas de un token (getTokenLargestAccounts) con Helius, para el análisis de la web (15/11): el RPC público
// que las da (Solana Vibe Station) va en cola a 1 por segundo y era el paso más lento del veredicto (~1,6 s en móvil).
// Devuelve el «result» de la llamada tal cual, o undefined si Helius no contestó (la web vuelve entonces al público)
export async function top(env, m, fetchFn) {
  if (!env.SOLANA_RPC) return undefined;
  const j = await fetchFn(env.SOLANA_RPC, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTokenLargestAccounts", params: [m] }) })
    .then((r) => r.ok ? r.json() : null).catch(() => null);
  return j && j.result && Array.isArray(j.result.value) ? j.result : undefined;
}
// ipfs.io y dweb.link contestan 429 a menudo: lo de IPFS va por la pasarela de Pump.fun. Todo pasa por el CDN de
// Helius a 192 px (un logo de 320 KB queda en ~13 KB y en su caché)
export const LOGO_CDN = "https://cdn.helius-rpc.com/cdn-cgi/image/width=192/";
export function logoUrl(u) {
  if (!u || typeof u !== "string") return null;
  const cid = u.match(/^ipfs:\/\/(?:ipfs\/)?([A-Za-z0-9]+)(\/[^?#]*)?/) || u.match(/^https:\/\/[^/]+\/ipfs\/([A-Za-z0-9]+)(\/[^?#]*)?/);
  if (cid) u = "https://pump.mypinata.cloud/ipfs/" + cid[1] + (cid[2] || "");
  return /^https:\/\//.test(u) ? LOGO_CDN + u : null;
}

// Marcas de la gráfica (15/11): lo que compraron y vendieron de este token el creador y los compradores del lanzamiento,
// desde que nació, con getTransactionsForAddress de Helius (100 transacciones por wallet, ~10 créditos). La web la
// pide solo cuando las últimas 300 operaciones de GeckoTerminal no llegan al nacimiento del token
export const VENTAS_MAX = 5;
export function cambio(t, m, w) {
  if (!t || !t.meta || t.meta.err || !t.transaction) return null;
  let d = 0;
  const add = (b, sg) => { if (b && b.mint === m && b.owner === w) d += sg * (Number(b.uiTokenAmount && b.uiTokenAmount.uiAmount) || 0); };
  (t.meta.preTokenBalances || []).forEach((b) => add(b, -1));
  (t.meta.postTokenBalances || []).forEach((b) => add(b, 1));
  if (Math.abs(d) < 1e-9) return null;
  const keys = (t.transaction.message && t.transaction.message.accountKeys || []).map((k) => k.pubkey || k);
  const i = keys.indexOf(w), sol = i >= 0 ? ((t.meta.postBalances[i] || 0) - (t.meta.preBalances[i] || 0)) / 1e9 : 0;
  return { t: t.blockTime, d: d, sol: Math.round(sol * 1e6) / 1e6, sig: t.transaction.signatures && t.transaction.signatures[0] };
}
export async function ventas(env, m, ws, desde, fetchFn) {
  const out = {};
  // cuándo nació el token: su transacción más antigua (la web solo sabe la fecha del pool, que en un graduado es posterior)
  const f = await fetchFn(env.SOLANA_RPC, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTransactionsForAddress", params: [m, { transactionDetails: "signatures", sortOrder: "asc", limit: 1 }] }) })
    .then((r) => r.json()).catch(() => null);
  const born = f && f.result && f.result.data && f.result.data[0] && f.result.data[0].blockTime;
  if (born && born < desde) desde = born;
  for (const w of ws) {
    const j = await fetchFn(env.SOLANA_RPC, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTransactionsForAddress", params: [w, { transactionDetails: "full", sortOrder: "asc", limit: 100,
        encoding: "jsonParsed", maxSupportedTransactionVersion: 0, filters: { blockTime: { gte: desde } } }] }) })
      .then((r) => r.json()).catch(() => null);
    const data = j && j.result && j.result.data;
    // full: si son menos de 100, está toda su historia desde que nació el token
    out[w] = Array.isArray(data) ? { ev: data.map((t) => cambio(t, m, w)).filter(Boolean), full: data.length < 100 } : null;
  }
  return { v: V, mint: m, desde: desde, wallets: out };
}

export async function handle(req, env) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: Object.assign({}, HEAD, { "access-control-allow-methods": "GET, POST", "access-control-max-age": "86400" }) });
  const p = new URL(req.url).pathname.replace(/\/+$/, "").split("/");
  if (req.method === "POST" && p.length === 4 && p[1] === "api" && p[2] === "visto") return visto(req, env, p[3]);
  if (req.method !== "GET") return fail(405, "only GET");
  if (p.length === 3 && p[1] === "api" && p[2] === "portada") {
    try { return json(await portada(env.DB, Date.now())); } catch (e) { return fail(503, "database unavailable"); }
  }
  if (p.length === 4 && p[1] === "api" && p[2] === "ventas") {
    if (!ADDR.test(p[3])) return fail(400, "not a Solana address");
    const q = new URL(req.url).searchParams, ws = String(q.get("w") || "").split(",").filter((w) => ADDR.test(w)).slice(0, VENTAS_MAX);
    const desde = Math.floor(Number(q.get("desde")));
    if (!ws.length || !(desde > 1.6e9) || desde > Date.now() / 1000) return fail(400, "use ?w=<wallets>&desde=<unix seconds>");
    if (!env.SOLANA_RPC) return fail(503, "rpc unavailable");
    if (env.VENTAS_LIMIT) {
      const { success } = await env.VENTAS_LIMIT.limit({ key: req.headers.get("cf-connecting-ip") || "?" });
      if (!success) return fail(429, "too many requests");
    }
    const v = await ventas(env, p[3], ws, desde, fetch);
    const res = json(v);
    // si alguna wallet no contestó, que no se quede media hora en la caché
    res.headers.set("cache-control", "public, max-age=" + (Object.values(v.wallets).some((x) => !x) ? 60 : 1800));
    return res;
  }
  if (p.length === 4 && p[1] === "api" && p[2] === "logo") {
    if (!ADDR.test(p[3])) return fail(400, "not a Solana address");
    const img = await logo(env, p[3], fetch);
    if (img === undefined) return fail(503, "rpc unavailable");
    const res = json({ v: V, mint: p[3], img: img });
    // un logo no cambia: una semana en la caché; si aún no tiene, se vuelve a mirar en una hora
    res.headers.set("cache-control", "public, max-age=" + (img ? 604800 : 3600));
    return res;
  }
  if (p.length === 4 && p[1] === "api" && p[2] === "top") {
    if (!ADDR.test(p[3])) return fail(400, "not a Solana address");
    if (!env.SOLANA_RPC) return fail(503, "rpc unavailable");
    if (env.TOP_LIMIT) {
      const { success } = await env.TOP_LIMIT.limit({ key: req.headers.get("cf-connecting-ip") || "?" });
      if (!success) return fail(429, "too many requests");
    }
    const r = await top(env, p[3], fetch);
    if (!r) return fail(503, "rpc unavailable");
    const res = json({ v: V, mint: p[3], result: r });
    res.headers.set("cache-control", "public, max-age=120");   // las mayores cuentas cambian poco en 2 min; cada token nuevo, 1 crédito
    return res;
  }
  if (p.length === 3 && p[1] === "api" && p[2] === "acciones") {
    try {
      const a = await acciones(env), res = json(a);
      // si falta algún precio, que no se quede 5 min en la caché
      if (a.filas.some((f) => f.precio === null || f.real === null) || (a.dolares || []).some((d) => d.valor === null)) res.headers.set("cache-control", "public, max-age=60");
      return res;
    } catch (e) { return fail(503, "prices unavailable"); }
  }
  if (p.length === 4 && p[1] === "api" && p[2] === "cotiza") {
    if (!ADDR.test(p[3])) return fail(400, "not a Solana address");
    try {
      const c = await cotiza(env, p[3]), res = json(c);
      if (c.cex === null) res.headers.set("cache-control", "public, max-age=60");   // CoinGecko no contestó: reintentar pronto
      return res;
    } catch (e) { return fail(503, "markets unavailable"); }
  }
  // /api/<tipo>/<dirección>
  if (p.length !== 4 || p[1] !== "api" || !/^(wallet|token)$/.test(p[2])) return fail(404, "use /api/wallet/<address> or /api/token/<mint>");
  if (!ADDR.test(p[3])) return fail(400, "not a Solana address");
  try {
    if (p[2] === "wallet") return json(await wallet(env.DB, p[3]));
    const t = await token(env.DB, p[3]);
    return t ? json(t) : fail(404, "token not in the registry");
  } catch (e) {
    return fail(503, "database unavailable");
  }
}

export default {
  async fetch(req, env, ctx) {
    const cache = typeof caches !== "undefined" ? caches.default : null;
    if (cache && req.method === "GET") {
      const hit = await cache.match(req);
      if (hit) return hit;
    }
    // token.solflag.com: la ficha pública de cada token (ficha.js); el resto, la API
    const res = new URL(req.url).hostname === FICHA_HOST ? await ficha(req, env) : await handle(req, env);
    if (cache && req.method === "GET" && res.status === 200) ctx.waitUntil(cache.put(req, res.clone()));
    return res;
  }
};
