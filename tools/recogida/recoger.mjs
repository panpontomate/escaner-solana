// Recogida de datos de los tokens de la portada (24/11/2026). Cada 15 min (GitHub Actions, workflow recogida.yml):
//   · gratis: precio, volumen, compras/ventas y liquidez del pool principal (DexScreener, una petición para todos) y
//     las operaciones de más de 1.000 $ con su wallet (GeckoTerminal, las nuevas desde la última vista);
//   · cada 30 min (con SOLANA_RPC de Helius): las 20 mayores cuentas y la cantidad de tokens;
//     cada cuenta va como [cuenta, cantidad, dueño] y los dueños ya vistos se guardan en estado.json (25/11).
// Guarda una línea JSON por foto en <SALIDA>/AAAA-MM-DD.jsonl y la memoria (lo último visto) en <SALIDA>/estado.json.
// Sirve para el simulador: dos semanas mirando qué se ve antes de los movimientos, sin estrategia fijada.
import fs from "node:fs";
import path from "node:path";

export const TOKENS = [
  ["PUMP", "pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn", "defi"], ["JUP", "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", "defi"],
  ["MET", "METvsvVRapdj9cFLzq4Tr43xK4tAjQfwX76z3n6mWQL", "defi"], ["RAY", "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", "defi"],
  ["SANC", "CLoUDKc4Ane7HeQcPpE3YHnznRxhMimJ4MyaUqyHFzAu", "defi"], ["JTO", "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL", "defi"],
  ["ORCA", "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE", "defi"], ["KMNO", "KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS", "defi"],
  ["CARDS", "CARDSccUMFKoPRZxt5vt3ksUbxEFEcnZ3H2pd3dKxYjp", "juegos"], ["ORE", "oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp", "juegos"],
  ["ATLAS", "ATLASXmbPQxBUYbxPsV97usA3fPQYEqzQBUHgiFCUsXx", "juegos"],
  ["USDC", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "rwa"], ["PYUSD", "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo", "rwa"],
  ["HUMA", "HUMA1821qVDKta3u2ovmfDQeW2fSQouSKE8fkF44wvGw", "rwa"],
  ["GRASS", "Grass7B4RdKfBCjTKgSqnXkqjwiGvQyFbuSCUJr3XXjs", "ia"], ["IO", "BZLbGTNCSFfoth2GYDtwr7e4imWzpR5jqcUuGEwr646K", "ia"],
  ["RENDER", "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof", "otros"], ["MASK", "HuAXPyDWDaMYFKuwQHpqL1oPnj93zdzWmtvFGzCeCUa7", "otros"],
  ["MPLX", "METAewgxyPbgwsseH8T16a39CQ5VyVxZi9zXiDPY18m", "otros"],
  ["PENGU", "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv", "meme"], ["TRUMP", "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN", "meme"],
  ["BONK", "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", "meme"], ["WIF", "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", "meme"],
  ["FARTCOIN", "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump", "meme"],
  ["ME", "MEFNBXixkEbait3xn9bkm8WsJzXtVsaJEn4c8Sam21u", "apps"], ["TNSR", "TNSRxcUxoT9xBG3de7PiJyTDYu7kskLqcpddxnEJAS6", "apps"],
  ["SKR", "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3", "apps"]
];
const SALIDA = process.env.SALIDA || "recogida";
const RPC = process.env.SOLANA_RPC || "";
const MIN_USD = 1000;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
async function json(u, init, intentos = 3) {
  for (let i = 0; i < intentos; i++) {
    try { const r = await fetch(u, init); if (r.status === 429) { await espera(4000 * (i + 1)); continue; } if (!r.ok) return null; return await r.json(); }
    catch { await espera(1500); }
  }
  return null;
}
const rpc = (method, params) => json(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) }).then((j) => j && j.result);

// el pool principal de cada token (el de más liquidez donde el token es la base) y sus cifras de DexScreener
export function pools(pares, mints) {
  const out = {};
  for (const p of pares || []) {
    const m = p && p.baseToken && p.baseToken.address;
    if (!mints.includes(m)) continue;
    const liq = (p.liquidity && p.liquidity.usd) || 0;
    if (!out[m] || liq > out[m].liq) out[m] = { pool: p.pairAddress, dex: p.dexId, liq: Math.round(liq), precio: Number(p.priceUsd) || null,
      vol: p.volume || null, tx: p.txns || null, cambio: p.priceChange || null, mcap: p.marketCap || null };
  }
  return out;
}
// sin operaciones grandes posibles: su pool movió menos de MIN_USD en la última hora (DexScreener) → no se pregunta a
// GeckoTerminal (30 por minuto, era lo que alargaba la recogida); lo perdido se recupera en la siguiente vuelta
export const quieto = (p) => !!(p && p.vol && typeof p.vol.h1 === "number" && p.vol.h1 < MIN_USD);
// operaciones grandes nuevas (más recientes que la última vista de ese pool)
export function nuevas(data, desde, mint) {
  return (data || []).map((d) => d.attributes || {}).filter((a) => !a.is_anomalous)
    .map((a) => ({ t: Date.parse(a.block_timestamp), lado: a.from_token_address === mint ? "vende" : a.to_token_address === mint ? "compra" : null,
      usd: Math.round(Number(a.volume_in_usd) || 0), w: a.tx_from_address, tx: a.tx_hash,
      amt: Number(a.from_token_address === mint ? a.from_token_amount : a.to_token_amount) || 0 }))
    .filter((x) => x.t > desde && x.lado && x.w).sort((a, b) => a.t - b.t);
}
// Marcas de la gráfica que no se pierden (25/11): las operaciones grandes de los 27 y de hasta 20 tokens de los más
// analizados en la web en las últimas 6 h (tabla pedidos, la llena /api/visto) van a D1, tabla ops; la web las lee con
// /api/marcas/<mint>. Se guardan 30 días. Necesita CF_API_TOKEN, CF_ACCOUNT_ID y CF_D1_ID (sin ellos no se guarda nada).
export const OPS_SCHEMA = ["CREATE TABLE IF NOT EXISTS ops (m TEXT, tx TEXT, t INTEGER, sell INTEGER, usd INTEGER, w TEXT, amt REAL, PRIMARY KEY (m, tx))",
  "CREATE INDEX IF NOT EXISTS ops_mt ON ops (m, t)"];
// D1 admite 100 parámetros por consulta: 14 filas de 7
export function opsInsert(m, ops) {
  const out = [];
  for (let i = 0; i < ops.length; i += 14) {
    const l = ops.slice(i, i + 14);
    out.push({ sql: "INSERT INTO ops (m, tx, t, sell, usd, w, amt) VALUES " + l.map(() => "(?,?,?,?,?,?,?)").join(",") + " ON CONFLICT DO NOTHING",
      params: l.flatMap((o) => [m, o.tx, o.t, o.lado === "vende" ? 1 : 0, o.usd, o.w, o.amt || 0]) });
  }
  return out;
}
const D1 = process.env.CF_API_TOKEN && process.env.CF_ACCOUNT_ID && process.env.CF_D1_ID
  ? { url: "https://api.cloudflare.com/client/v4/accounts/" + process.env.CF_ACCOUNT_ID + "/d1/database/" + process.env.CF_D1_ID + "/query", token: process.env.CF_API_TOKEN } : null;
async function d1(st) {
  const r = await fetch(D1.url, { method: "POST", headers: { authorization: "Bearer " + D1.token, "content-type": "application/json" }, body: JSON.stringify(st) });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j || !j.success) throw new Error("D1 " + r.status + ": " + JSON.stringify((j && j.errors) || "").slice(0, 200));
  return j.result;
}
// «Quién la tiene» (25/11): de las 20 mayores cuentas, qué parte del total tienen las wallets (sin pools ni exchanges
// conocidos), los exchanges conocidos y los programas (bloqueos, pools…). tipo = {dueño: "w" | "x" | "p"}; números en %.
export function quienDe(top, supply, tipo) {
  const sup = Number(supply); if (!(sup > 0) || !top || !top.length) return null;
  const por = {};
  for (const [, n, d] of top) if (d) por[d] = (por[d] || 0) + Number(n);
  const de = (k) => Object.entries(por).filter(([d]) => tipo[d] === k).sort((a, b) => b[1] - a[1]);
  const w = de("w"), x = de("x"), p = de("p"), pc = (v) => Math.round(v / sup * 1000) / 10;
  return { mayor: w.length ? pc(w[0][1]) : 0, top10w: pc(w.slice(0, 10).reduce((a, y) => a + y[1], 0)), exch: pc(x.reduce((a, y) => a + y[1], 0)), pools: pc(p.reduce((a, y) => a + y[1], 0)) };
}
export const QUIEN_SCHEMA = "CREATE TABLE IF NOT EXISTS quien (m TEXT PRIMARY KEY, t INTEGER, mayor REAL, top10w REAL, exch REAL, pools REAL)";
// wallets de exchanges conocidos: la lista del motor (src/known.js), leída de jsDelivr una vez al día
async function exchangesConocidos(est, ahora) {
  if (est.exch && est.exch.t > ahora - 864e5) return new Set(est.exch.l);
  const txt = await fetch("https://cdn.jsdelivr.net/npm/solana-risk-engine@latest/src/known.js").then((r) => r.ok ? r.text() : "").catch(() => "");
  const l = [...txt.matchAll(/"([1-9A-HJ-NP-Za-km-z]{32,44})":\s*\{[^}]*t:\s*"exchange"/g)].map((x) => x[1]);
  if (l.length) est.exch = { t: ahora, l };
  return new Set(l.length ? l : (est.exch && est.exch.l) || []);
}
// dueño de cada cuenta de token (respuesta jsonParsed de getMultipleAccounts); las que no existen o no son de token, fuera
export function duenos(cuentas, valores) {
  const out = {};
  cuentas.forEach((c, i) => { const o = valores[i] && valores[i].data && valores[i].data.parsed && valores[i].data.parsed.info && valores[i].data.parsed.info.owner; if (o) out[c] = o; });
  return out;
}

async function main() {
  fs.mkdirSync(SALIDA, { recursive: true });
  const fEst = path.join(SALIDA, "estado.json");
  let est = {}; try { est = JSON.parse(fs.readFileSync(fEst, "utf8")); } catch {}
  est.ult = est.ult || {};
  const ahora = Date.now();
  // todos los tokens del Ecosistema de hoy que están en Solana (25/11; antes solo las memecoins): «Quién la tiene» y ballenas
  const eco = await json("https://solflag.com/datos/ecosistema.json");
  const LISTA = TOKENS.slice();
  const AP = { "DeFi": "defi", "Juegos": "juegos", "Activos tokenizados": "rwa", "IA": "ia", "Otros": "otros", "Apps y bots": "apps", "Meme": "meme" };
  for (const r of ((eco && eco.rows) || []).filter((r) => r.mint && !r.cad))
    if (!LISTA.some((t) => t[1] === r.mint)) LISTA.push([r.sym, r.mint, AP[r.ap] || "otros"]);
  const mints = LISTA.map((t) => t[1]);
  // 1) DexScreener: hasta 30 tokens por petición
  let pares = [];
  for (let i = 0; i < mints.length; i += 30) pares = pares.concat((await json("https://api.dexscreener.com/tokens/v1/solana/" + mints.slice(i, i + 30).join(","))) || []);
  const P = pools(pares, mints);
  // GeckoTerminal con tope de 6 min por vuelta (25/11: con 93 tokens una vuelta llegó a 12 min y GitHub la canceló; sus 429
  // desde GitHub alargan cada llamada): primero los pools con más volumen en la última hora; lo que no dé tiempo, la siguiente vuelta
  const vh = (m) => (P[m] && P[m].vol && P[m].vol.h1) || 0;
  LISTA.sort((x, y) => vh(y[1]) - vh(x[1]));
  const finGT = Date.now() + 6 * 60000;
  // 2) Helius cada 30 min (la foto de los minutos 0–14 y 30–44)
  const conHelius = !!RPC && Math.floor(new Date(ahora).getUTCMinutes() / 15) % 2 === 0;
  const filas = [], porMint = {};
  for (const [sym, m, ap] of LISTA) {
    const p = P[m] || null, f = { t: ahora, sym, m, ap, dx: p };
    if (p && p.pool && !quieto(p) && Date.now() < finGT) {
      const j = await json("https://api.geckoterminal.com/api/v2/networks/solana/pools/" + p.pool + "/trades?trade_volume_in_usd_greater_than=" + MIN_USD);
      const ops = nuevas(j && j.data, est.ult[p.pool] || ahora - 3600000, m);
      if (j) { f.ops = ops; porMint[m] = ops; if (ops.length) est.ult[p.pool] = ops[ops.length - 1].t; else if (!est.ult[p.pool]) est.ult[p.pool] = ahora - 3600000; }
      await espera(2200);   // GeckoTerminal: 30 por minuto
    }
    if (conHelius) {
      const [big, sup] = await Promise.all([rpc("getTokenLargestAccounts", [m]), rpc("getTokenSupply", [m])]);
      if (big && big.value) f.top = big.value.map((x) => [x.address, x.uiAmountString]);
      if (sup && sup.value) f.supply = sup.value.uiAmountString;
    }
    filas.push(f);
  }
  // 3) de quién es cada una de las 20 mayores cuentas: solo las que no estaban ya en estado.json (getMultipleAccounts, 100 por petición)
  est.duenos = est.duenos || {};
  const faltan = [...new Set(filas.flatMap((f) => (f.top || []).map((x) => x[0])))].filter((c) => !(c in est.duenos));
  for (let i = 0; i < faltan.length; i += 100) {
    const lote = faltan.slice(i, i + 100), r = await rpc("getMultipleAccounts", [lote, { encoding: "jsonParsed" }]);
    if (r && r.value) Object.assign(est.duenos, duenos(lote, r.value));
  }
  for (const f of filas) if (f.top) f.top = f.top.map(([c, n]) => [c, n, est.duenos[c] || null]);
  // 3b) qué es cada dueño: exchange conocido, wallet (cuenta del System Program) o programa; solo los que no sabíamos
  est.tipo = est.tipo || {};
  const EXCH = conHelius ? await exchangesConocidos(est, ahora) : new Set();
  const nuevosD = [...new Set(filas.flatMap((f) => (f.top || []).map((x) => x[2]).filter(Boolean)))].filter((d) => !(d in est.tipo));
  for (let i = 0; i < nuevosD.length; i += 100) {
    const lote = nuevosD.slice(i, i + 100), r = await rpc("getMultipleAccounts", [lote, { encoding: "base64", dataSlice: { offset: 0, length: 0 } }]);
    if (r && r.value) lote.forEach((d, k) => { const a = r.value[k]; est.tipo[d] = !a || a.owner === "11111111111111111111111111111111" ? "w" : "p"; });
  }
  const tipo = {}; for (const [d, t] of Object.entries(est.tipo)) tipo[d] = EXCH.has(d) ? "x" : t;
  const quien = filas.map((f) => f.top && f.supply ? [f.m, quienDe(f.top, f.supply, tipo)] : null).filter((x) => x && x[1]);
  // 4) los más analizados en la web (no van al .jsonl, solo a D1): la primera vez, todas sus operaciones grandes
  let extra = [];
  if (D1) try {
    const r = await d1({ sql: "SELECT m FROM pedidos WHERE t1 > ? ORDER BY n DESC LIMIT 60", params: [ahora - 6 * 3600000] });
    extra = ((r[0] && r[0].results) || []).map((x) => x.m).filter((m) => !mints.includes(m)).slice(0, 20);
  } catch (e) { console.log("pedidos:", e.message); }
  if (extra.length) {
    const PX = pools(await json("https://api.dexscreener.com/tokens/v1/solana/" + extra.join(",")), extra);
    for (const m of extra) {
      const p = PX[m]; if (!p || !p.pool || quieto(p) || Date.now() > finGT) continue;
      const j = await json("https://api.geckoterminal.com/api/v2/networks/solana/pools/" + p.pool + "/trades?trade_volume_in_usd_greater_than=" + MIN_USD);
      if (j) { const ops = nuevas(j.data, est.ult[p.pool] || 0, m); porMint[m] = ops; if (ops.length) est.ult[p.pool] = ops[ops.length - 1].t; }
      await espera(2200);
    }
  }
  for (const [k, t] of Object.entries(est.ult)) if (t < ahora - 7 * 864e5) delete est.ult[k];   // pools que ya no se miran
  // la primera vez, también lo que ya estaba en los .jsonl (desde el 24/11)
  if (D1 && !est.opsD1) for (const fi of fs.readdirSync(SALIDA).filter((x) => /^\d{4}-\d\d-\d\d\.jsonl$/.test(x)))
    for (const l of fs.readFileSync(path.join(SALIDA, fi), "utf8").split("\n")) { if (!l) continue; const f = JSON.parse(l); if (f.ops && f.ops.length) porMint[f.m] = (porMint[f.m] || []).concat(f.ops); }
  let enD1 = 0;
  if (D1) try {
    for (const sql of OPS_SCHEMA) await d1({ sql });
    for (const [m, ops] of Object.entries(porMint)) for (const st of opsInsert(m, ops)) { await d1(st); }
    enD1 = Object.values(porMint).reduce((s, o) => s + o.length, 0);
    await d1({ sql: "DELETE FROM ops WHERE t < ?", params: [ahora - 30 * 864e5] });
    est.opsD1 = est.opsD1 || ahora;
  } catch (e) { console.log("ops:", e.message); }
  if (D1 && quien.length) try {
    await d1({ sql: QUIEN_SCHEMA });
    for (let i = 0; i < quien.length; i += 16) { const l = quien.slice(i, i + 16);
      await d1({ sql: "INSERT INTO quien (m, t, mayor, top10w, exch, pools) VALUES " + l.map(() => "(?,?,?,?,?,?)").join(",") + " ON CONFLICT(m) DO UPDATE SET t=excluded.t, mayor=excluded.mayor, top10w=excluded.top10w, exch=excluded.exch, pools=excluded.pools",
        params: l.flatMap(([m, q]) => [m, ahora, q.mayor, q.top10w, q.exch, q.pools]) }); }
  } catch (e) { console.log("quien:", e.message); }
  const dia = new Date(ahora).toISOString().slice(0, 10);
  fs.appendFileSync(path.join(SALIDA, dia + ".jsonl"), filas.map((f) => JSON.stringify(f)).join("\n") + "\n");
  est.ultima = ahora;
  fs.writeFileSync(fEst, JSON.stringify(est));
  console.log(`recogida: ${filas.length} tokens · ${filas.filter((f) => f.dx).length} con pool · ${filas.reduce((s, f) => s + (f.ops ? f.ops.length : 0), 0)} operaciones grandes nuevas · Helius ${conHelius ? "sí" : "no"} · ${extra.length} más analizados · ${enD1} operaciones a D1 · quién la tiene: ${quien.length}`);
}
if (import.meta.url === "file://" + process.argv[1] || process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) main();
