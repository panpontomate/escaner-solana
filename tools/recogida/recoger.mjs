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
  ["ME", "MEFNBXixkEbait3xn9bkm8WsJzXtVsaJEn4c8Sam21u", "apps"], ["TNSR", "TNSRxcUxoT9xBG3de7PiJyTDYu7kskLqcpddxnEJAS6", "apps"]
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
// operaciones grandes nuevas (más recientes que la última vista de ese pool)
export function nuevas(data, desde, mint) {
  return (data || []).map((d) => d.attributes || {}).filter((a) => !a.is_anomalous)
    .map((a) => ({ t: Date.parse(a.block_timestamp), lado: a.from_token_address === mint ? "vende" : a.to_token_address === mint ? "compra" : null,
      usd: Math.round(Number(a.volume_in_usd) || 0), w: a.tx_from_address, tx: a.tx_hash }))
    .filter((x) => x.t > desde && x.lado && x.w).sort((a, b) => a.t - b.t);
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
  const ahora = Date.now(), mints = TOKENS.map((t) => t[1]);
  // 1) DexScreener: hasta 30 tokens por petición
  const pares = await json("https://api.dexscreener.com/tokens/v1/solana/" + mints.join(","));
  const P = pools(pares, mints);
  // 2) Helius cada 30 min (la foto de los minutos 0–14 y 30–44)
  const conHelius = !!RPC && Math.floor(new Date(ahora).getUTCMinutes() / 15) % 2 === 0;
  const filas = [];
  for (const [sym, m, ap] of TOKENS) {
    const p = P[m] || null, f = { t: ahora, sym, m, ap, dx: p };
    if (p && p.pool) {
      const j = await json("https://api.geckoterminal.com/api/v2/networks/solana/pools/" + p.pool + "/trades?trade_volume_in_usd_greater_than=" + MIN_USD);
      const ops = nuevas(j && j.data, est.ult[p.pool] || ahora - 3600000, m);
      if (j) { f.ops = ops; if (ops.length) est.ult[p.pool] = ops[ops.length - 1].t; else if (!est.ult[p.pool]) est.ult[p.pool] = ahora - 3600000; }
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
  const dia = new Date(ahora).toISOString().slice(0, 10);
  fs.appendFileSync(path.join(SALIDA, dia + ".jsonl"), filas.map((f) => JSON.stringify(f)).join("\n") + "\n");
  est.ultima = ahora;
  fs.writeFileSync(fEst, JSON.stringify(est));
  console.log(`recogida: ${filas.length} tokens · ${filas.filter((f) => f.dx).length} con pool · ${filas.reduce((s, f) => s + (f.ops ? f.ops.length : 0), 0)} operaciones grandes nuevas · Helius ${conHelius ? "sí" : "no"}`);
}
if (import.meta.url === "file://" + process.argv[1] || process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) main();
