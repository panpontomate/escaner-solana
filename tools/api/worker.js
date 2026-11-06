// API pública de SolFlag (Cloudflare Worker delante de la base D1 «solflag-plano» que llena el recolector).
// Solo lectura y solo hechos de la cadena: quién pagó, creó o financió cada lanzamiento, quién compró en los
// primeros bloques y cómo acabó a las 24 h. Sin etiquetas personales.
//
//   GET /api/wallet/<dirección>   lo que se sabe de una wallet en los lanzamientos registrados
//   GET /api/token/<mint>         un lanzamiento: quién está detrás (con su historial) y sus primeros compradores
//
// Formato versión 1 (v: 1). Si cambia de forma incompatible, sube v.
// Cada respuesta se guarda 5 min en la caché de Cloudflare para no repetir consultas a D1.

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
const fail = (status, error) => json({ v: V, error: error }, status);

// Resumen de un grupo de lanzamientos: cuántos, cuántos tienen ya el resultado de 24 h y cuántos murieron
const SUM = "COUNT(*) AS n, SUM(dead24 IS NOT NULL) AS resolved, SUM(dead24 = 1) AS dead24";
const tally = (r) => ({ n: r.n || 0, resolved: r.resolved || 0, dead24: r.dead24 || 0 });
const launch = (r) => {
  const o = { m: r.m, t: r.t, plat: r.plat, dex: r.dex, lvl: r.lvl, dead24: r.dead24 == null ? null : !!r.dead24, mc24: r.mc24 };
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
  const brows = await all(db, "SELECT c.m, c.d, l.t, l.plat, l.dex, l.lvl, l.dead24, l.mc24 FROM compras c LEFT JOIN lanz l ON l.m = c.m WHERE c.w = ?1 ORDER BY l.t DESC LIMIT " + LIST, [a]);
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

export async function handle(req, env) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: Object.assign({}, HEAD, { "access-control-allow-methods": "GET", "access-control-max-age": "86400" }) });
  if (req.method !== "GET") return fail(405, "only GET");
  const p = new URL(req.url).pathname.replace(/\/+$/, "").split("/");
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
    const res = await handle(req, env);
    if (cache && req.method === "GET" && res.status === 200) ctx.waitUntil(cache.put(req, res.clone()));
    return res;
  }
};
