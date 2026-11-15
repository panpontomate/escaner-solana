// GET /api/cotiza/<mint> — dónde se negocia un token (maqueta aprobada el 13/11, maquetas\web\donde-cotiza*.html):
//   pools de la cadena (DexScreener) con su enlace directo, y exchanges centralizados (CoinGecko, tickers) cruzados con
//   la lista revisada a mano (exchanges.js): comisión, si piden identidad y si tienen licencia MiCA.
// El coste real de comprar y vender en la cadena lo calcula el navegador con Jupiter (no hace falta pasar por aquí).
// CoinGecko gratis limita por minuto: sus datos se guardan 6 h por token; con el secreto COINGECKO_KEY (clave «demo»)
// se usa la clave. DexScreener a veces no contesta a Cloudflare: reintento y, si no, el último dato bueno (1 h).

import { EXCHANGES, LOCALES, NO_SON_EXCHANGES, REVISADO, MICA_FUENTE } from "./exchanges.js";

const SOL = "So11111111111111111111111111111111111111112";
export const MIN_VOL = 25000;     // exchanges con menos volumen al día no se enseñan
export const MIN_LIQ = 1000;      // pools con menos liquidez, tampoco
export const DUDOSO = 1;          // diferencia de compra-venta de más del 1 %: precio poco fiable
const CG_S = 21600, DEX_OK_S = 3600;
// solo enlaces https: el de cada exchange llega tal cual de CoinGecko
export const seguro = (u) => typeof u === "string" && /^https:\/\/[^\s"'<>]+$/.test(u) ? u : null;
const memo = (k) => "https://cache.solflag.internal/cotiza/" + k;

// Enlace directo al pool en su DEX (comprobados el 13/11); si no sabemos enlazarlo, la ruta de Jupiter
export function rutaJupiter(mint) { return "https://jup.ag/swap?sell=" + SOL + "&buy=" + mint; }
export function enlacePool(dexId, label, pool, mint) {
  if (dexId === "meteora" && label === "DLMM") return "https://app.meteora.ag/dlmm/" + pool;
  if (dexId === "meteora" && label === "DYN") return "https://app.meteora.ag/pools/" + pool;
  if (dexId === "orca") return "https://www.orca.so/pools/" + pool;
  if (dexId === "raydium") return "https://raydium.io/swap/?inputMint=sol&outputMint=" + mint;
  if (dexId === "pancakeswap") return "https://pancakeswap.finance/swap?chain=sol&inputCurrency=" + SOL + "&outputCurrency=" + mint;
  return rutaJupiter(mint);
}
const NOMBRE_DEX = { meteora: "Meteora", orca: "Orca", raydium: "Raydium", pancakeswap: "PancakeSwap", pumpswap: "PumpSwap", pumpfun: "Pump.fun" };

async function guardado(cache, k) { const r = cache ? await cache.match(memo(k)) : null; return r ? r.json() : null; }
async function guardar(cache, k, v, s) { if (cache) await cache.put(memo(k), new Response(JSON.stringify(v), { headers: { "cache-control": "public, max-age=" + s } })); }

export function pools(pairs, mint) {
  return (Array.isArray(pairs) ? pairs : [])
    .filter((p) => p && p.baseToken && p.quoteToken && (p.baseToken.address === mint || p.quoteToken.address === mint))
    .map((p) => {
      const label = (p.labels || [])[0] || "";
      return { dex: (NOMBRE_DEX[p.dexId] || p.dexId) + (label && label !== "wp" ? " " + label : ""), par: p.baseToken.symbol + " / " + p.quoteToken.symbol,
        liq: Math.round((p.liquidity && p.liquidity.usd) || 0), vol: Math.round((p.volume && p.volume.h24) || 0), url: enlacePool(p.dexId, label, p.pairAddress, mint) };
    })
    .filter((p) => p.liq >= MIN_LIQ).sort((a, b) => b.liq - a.liq);
}

// Agrupa los tickers por exchange (su par con menos diferencia y el volumen sumado) y les pone lo que sabemos
export function exchanges(tickers) {
  const by = {};
  for (const x of Array.isArray(tickers) ? tickers : []) {
    const n = x && x.market && x.market.name;
    if (!n || x.is_stale || x.is_anomaly || NO_SON_EXCHANGES.some((d) => n.indexOf(d) === 0)) continue;
    const vol = (x.converted_volume && x.converted_volume.usd) || 0, sp = Number(x.bid_ask_spread_percentage) || null;
    const b = by[n] || (by[n] = { n: n, vol: 0, sp: null, par: "", url: seguro(x.trade_url) });
    b.vol += vol;
    if (sp != null && (b.sp == null || sp < b.sp)) { b.sp = sp; b.par = x.base + " / " + x.target; if (seguro(x.trade_url)) b.url = seguro(x.trade_url); }
  }
  return Object.values(by).filter((b) => b.vol >= MIN_VOL && b.sp != null).map((b) => {
    const e = EXCHANGES[b.n] || {}, fee = typeof e.fee === "number" ? e.fee : null;
    const o = { n: b.n.replace(/ Exchange$/, "").replace(/ \| Kripto$/, ""), par: b.par, sp: Math.round(b.sp * 1000) / 1000, vol: Math.round(b.vol), url: b.url,
      fee: fee, cost: fee == null ? null : Math.round((b.sp + 2 * fee) * 100) / 100, id: e.id || "?" };
    ["feeNote", "lim", "src", "mica", "aviso"].forEach((k) => { if (e[k] !== undefined) o[k] = e[k]; });
    o.g = b.sp > DUDOSO ? "dudoso" : LOCALES[b.n] ? "local" : fee != null ? "ok" : "sinfee";
    if (LOCALES[b.n]) o.pais = LOCALES[b.n];
    return o;
  }).sort((a, b) => (a.cost == null) - (b.cost == null) || (a.cost || 0) - (b.cost || 0) || b.vol - a.vol);
}

// Nombre, símbolo y logo del token, del par con más liquidez en el que aparece
export function ficha(pairs, mint) {
  const ps = (Array.isArray(pairs) ? pairs : []).filter((p) => p && p.baseToken && p.quoteToken && (p.baseToken.address === mint || p.quoteToken.address === mint))
    .sort((a, b) => ((b.liquidity && b.liquidity.usd) || 0) - ((a.liquidity && a.liquidity.usd) || 0));
  if (!ps.length) return null;
  const t = ps[0].baseToken.address === mint ? ps[0].baseToken : ps[0].quoteToken;
  const conLogo = ps.find((p) => p.baseToken.address === mint && p.info && p.info.imageUrl);
  return { sym: t.symbol || null, name: t.name || null, img: conLogo ? conLogo.info.imageUrl : null };
}

async function dexscreener(fetchFn, cache, mint) {
  for (let n = 0; n < 2; n++) {
    const j = await fetchFn("https://api.dexscreener.com/token-pairs/v1/solana/" + mint).then((r) => r.ok ? r.json() : null).catch(() => null);
    if (Array.isArray(j)) { await guardar(cache, "dex/" + mint, j, DEX_OK_S); return j; }
  }
  return (await guardado(cache, "dex/" + mint)) || [];
}

async function coingecko(env, fetchFn, cache, mint) {
  const g = await guardado(cache, "cg/" + mint);
  if (g) return g;
  const url = "https://api.coingecko.com/api/v3/coins/solana/contract/" + mint + "?localization=false&tickers=true&market_data=false&community_data=false&developer_data=false";
  const r = await fetchFn(url, env.COINGECKO_KEY ? { headers: { "x-cg-demo-api-key": env.COINGECKO_KEY } } : undefined).catch(() => null);
  if (r && r.status === 404) { const v = { tickers: [] }; await guardar(cache, "cg/" + mint, v, CG_S); return v; }   // no lo tiene: no cotiza en exchanges
  const j = r && r.ok ? await r.json().catch(() => null) : null;
  if (!j) return null;   // límite o fallo: sin guardar, se reintenta en la próxima petición
  const v = { id: j.id || null, tickers: j.tickers || [] };
  await guardar(cache, "cg/" + mint, v, CG_S);
  return v;
}

// Nivel con el que lo apuntamos al lanzarse (D1, tabla lanz), o null: la página «Ver todos» no enseña dónde comprar
// un token que salió en rojo o naranja (o en riesgo alto, el nivel antiguo), venga de donde venga el enlace.
// tr = los cinco niveles (motor 0.6.0, 14/11); si no está, el de siempre
async function nivelLanz(env, mint) {
  if (!env || !env.DB) return null;
  try { const r = await env.DB.prepare("SELECT lvl, tr FROM lanz WHERE m = ?1").bind(mint).first(); return (r && (r.tr || r.lvl)) || null; }
  catch (e) { return null; }
}

export async function cotiza(env, mint, opts) {
  opts = opts || {};
  const fetchFn = opts.fetch || fetch;
  const cache = opts.cache !== undefined ? opts.cache : (typeof caches !== "undefined" ? caches.default : null);
  const [pares, cg, nivel] = await Promise.all([dexscreener(fetchFn, cache, mint), coingecko(env, fetchFn, cache, mint), nivelLanz(env, mint)]);
  return {
    v: 1, mint: mint, t: Date.now(), nivel: nivel,
    ruta: rutaJupiter(mint),
    token: ficha(pares, mint),
    pools: pools(pares, mint),
    cex: cg ? exchanges(cg.tickers) : null,      // null: CoinGecko no contestó (no es lo mismo que «no cotiza»)
    revisado: REVISADO, mica: MICA_FUENTE,
    fuentes: "Pools: DexScreener. Exchanges: CoinGecko. Comisión, identidad y MiCA: revisado a mano en la web de cada exchange y en el registro de la ESMA."
  };
}
