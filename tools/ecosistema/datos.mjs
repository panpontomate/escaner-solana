// Datos de la página Ecosistema (solflag.com/ecosistema/), maqueta aprobada el 20/11/2026
// (maquetas/web/radar-ecosistema.html). Lo lanza una vez al día .github/workflows/ecosistema.yml.
// Uso: OUT_DIR=carpeta SOLANA_RPC=… node tools/ecosistema/datos.mjs
//   → escribe OUT_DIR/ecosistema.json (lo que lee la página) y OUT_DIR/ecosistema-historial.json (memoria diaria).
// Sin SOLANA_RPC de Helius, xStocks sale con su valor de todas las cadenas (CoinGecko) en vez del de Solana.
// COINGECKO_KEY (clave «demo», opcional): menos esperas por límite de CoinGecko.
// Cada protocolo va a un APARTADO (los mismos del Escáner + «Apps y bots» y «Otros») y a un GRUPO dentro.
// Se cogen los 10 primeros de cada grupo, cada grupo con su medida:
//   comisiones 30 d (DefiLlama fees) · stablecoins: dinero en circulación en Solana (DefiLlama stablecoins)
//   activos reales: valor en Solana (TVL de DefiLlama o, para nuestra lista de emisores, emitido × precio de Jupiter).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hacerLista } from "../api/acciones.js";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const EMISORES = path.join(AQUI, "../../emisores.json");
const OUT = process.env.OUT_DIR || AQUI;
const CGH = process.env.COINGECKO_KEY ? { headers: { "x-cg-demo-api-key": process.env.COINGECKO_KEY } } : undefined;
const POR_GRUPO = 10;
const j = async (u, o) => { const r = await fetch(u, o); if (!r.ok) throw new Error(u + " → " + r.status); return r.json(); };

// DefiLlama category → [apartado, grupo]
const MAPA = {
  "Launchpad": ["Meme", "Lanzaderas"],
  "Trading App": ["Apps y bots", "Apps de trading"], "Telegram Bot": ["Apps y bots", "Bots de Telegram"],
  "Wallets": ["Apps y bots", "Wallets"], "Coins Tracker": ["Apps y bots", "Datos"], "Portfolio Tracker": ["Apps y bots", "Datos"],
  "Interface": ["Apps y bots", "Apps de trading"], "DCA Tools": ["Apps y bots", "Apps de trading"], "Transaction Execution": ["Apps y bots", "Apps de trading"],
  "RWA": ["Activos tokenizados", "Activos reales"],
  "Dexs": ["DeFi", "DEX"], "DEX Aggregator": ["DeFi", "Agregadores"],
  "Lending": ["DeFi", "Préstamos"], "NFT Lending": ["DeFi", "Préstamos"], "Uncollateralized Lending": ["DeFi", "Préstamos"], "CDP": ["DeFi", "Préstamos"],
  "Derivatives": ["DeFi", "Derivados"], "Options": ["DeFi", "Derivados"], "Basis Trading": ["DeFi", "Derivados"],
  "Liquid Staking": ["DeFi", "Staking"], "Staking Pool": ["DeFi", "Staking"], "Liquid Restaking": ["DeFi", "Staking"], "Restaking": ["DeFi", "Staking"],
  "MEV": ["DeFi", "MEV"], "Oracle": ["DeFi", "Oráculos"],
  "Bridge": ["DeFi", "Puentes"], "Cross Chain Bridge": ["DeFi", "Puentes"], "Bridge Aggregator": ["DeFi", "Puentes"], "Bridge Aggregators": ["DeFi", "Puentes"],
  "Liquidity Manager": ["DeFi", "Liquidez"], "Liquidity Automation": ["DeFi", "Liquidez"],
  "Yield": ["DeFi", "Rendimiento"], "Yield Aggregator": ["DeFi", "Rendimiento"], "Onchain Capital Allocator": ["DeFi", "Rendimiento"], "Risk Curators": ["DeFi", "Rendimiento"],
  "Prediction Market": ["DeFi", "Predicciones"], "OTC Marketplace": ["DeFi", "DEX"],
  "Gaming": ["Juegos", "Juegos"], "Luck Games": ["Juegos", "Azar"], "Physical TCG": ["Juegos", "Cartas físicas"], "Gamified Mining": ["Juegos", "Minería con juego"],
  "AI Agents": ["IA", "Agentes de IA"],
  "DePIN": ["Otros", "DePIN"], "Privacy": ["Otros", "Privacidad"], "Payments": ["Otros", "Pagos"], "SoFi": ["Otros", "Social"],
  "Domains": ["Otros", "Herramientas"], "Services": ["Otros", "Herramientas"], "Developer Tools": ["Otros", "Herramientas"], "DAO Service Provider": ["Otros", "Herramientas"],
};
// Productos sumados: el grupo sale del producto que más cobra, salvo estos (a mano).
const FORZAR = { "Metaplex": "Developer Tools", "Jupiter": "DEX Aggregator", "Drift": "Derivatives" };

const [fees, rev, protos, lite, stables] = await Promise.all([
  j("https://api.llama.fi/overview/fees/solana?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true"),
  j("https://api.llama.fi/overview/fees/solana?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyRevenue"),
  j("https://api.llama.fi/protocols"),
  j("https://api.llama.fi/lite/protocols2?b=2"),
  j("https://stablecoins.llama.fi/stablecoins?includePrices=true"),
]);
const P = Object.fromEntries(protos.map((p) => [String(p.id), p]));
const PADRE = Object.fromEntries(lite.parentProtocols.map((p) => [p.id, p]));
const REV = Object.fromEntries(rev.protocols.map((p) => [String(p.defillamaId), p.total30d || 0]));
const tvlSol = (p) => (p && p.chainTvls && typeof p.chainTvls.Solana === "number" ? p.chainTvls.Solana : 0);
const logo = (u) => u ? u.replace(/\?.*$/, "") + "?w=48&h=48" : "";

// 1) Protocolos con comisiones (productos sumados por protocolo padre)
const SEPARAR = new Set(["parent#pump"]);
const porPadre = {};
for (const x of fees.protocols) {
  if (!(x.total30d > 0) || x.category === "Chain") continue;
  // Pump va separado por producto: pump.fun es lanzadera, PumpSwap es un DEX, Terminal y la app son apps.
  const k = SEPARAR.has(x.parentProtocol) ? x.parentProtocol + "#" + x.defillamaId : x.parentProtocol || "solo#" + x.defillamaId;
  (porPadre[k] ||= []).push(x);
}
const rows = [];
for (const [k, hijos] of Object.entries(porPadre)) {
  const sep = SEPARAR.has(hijos[0].parentProtocol);
  const padre = PADRE[sep ? hijos[0].parentProtocol : k];
  const top = hijos.slice().sort((a, b) => b.total30d - a.total30d)[0];
  const n = padre && !sep ? padre.name : top.displayName || top.name;
  const cat = FORZAR[n] || top.category;
  const m = MAPA[cat]; if (!m) continue;
  const f30 = hijos.reduce((s, h) => s + (h.total30d || 0), 0);
  const f60 = hijos.reduce((s, h) => s + (h.total60dto30d || 0), 0);
  const info = padre || P[String(top.defillamaId)] || {};
  const sym = info.symbol && info.symbol !== "-" ? info.symbol : "";
  rows.push({
    ids: hijos.map((h) => String(h.defillamaId)), pid: hijos[0].parentProtocol || null,
    n, ap: m[0], gr: m[1], med: "fees", m: f30, c: f60 > 0 ? f30 / f60 - 1 : null,
    r30: hijos.reduce((s, h) => s + (REV[String(h.defillamaId)] || 0), 0) || null,
    tvl: hijos.reduce((s, h) => s + tvlSol(P[String(h.defillamaId)]), 0) || null,
    tok: !!(info.gecko_id || sym), sym, gecko: info.gecko_id || null, mcap: info.mcap || null,
    logo: logo(info.logo || top.logo), addr: info.address || (P[String(top.defillamaId)] || {}).address || null,
  });
}
// Cambios de apartado decididos a mano (23/11): StonkFun es un DEX como Pump.fun (antes Meme › Lanzaderas);
// Infinity Gaming y SOLPUMP son casinos según su propia descripción; Solflare es una wallet (DefiLlama la pone en Privacy)
const MOVER = { "StonkFun": ["DeFi", "DEX"], "Infinity Gaming": ["Juegos", "Azar"], "SOLPUMP": ["Juegos", "Azar"], "Solflare": ["Apps y bots", "Wallets"] };
const mover = (l) => { for (const r of l) if (MOVER[r.n]) [r.ap, r.gr] = MOVER[r.n]; };
mover(rows);
const totFees30 = fees.total30d, totFees60 = fees.total60dto30d;

// 2) Activos reales: valor en Solana. a) TVL de DefiLlama de los protocolos RWA en Solana
const rwa = {};
for (const p of protos) {
  if (p.category !== "RWA" || tvlSol(p) < 1e5) continue;
  const padre = p.parentProtocol && PADRE[p.parentProtocol];
  const n = padre ? padre.name : p.name;
  const sym = (padre || p).symbol;
  rwa[n] ||= { n, ap: "Activos tokenizados", gr: "Activos reales", med: "valor", m: 0, c: null, r30: null, tvl: null,
    tok: !!((padre || p).gecko_id || (sym && sym !== "-")), sym: sym && sym !== "-" ? sym : "", gecko: (padre || p).gecko_id || null,
    mcap: (padre || p).mcap || null, logo: logo((padre || p).logo), fuente: "DefiLlama" };
  rwa[n].m += tvlSol(p);
}
// b) Emisores de acciones y fondos tokenizados: capitalización de su categoría en CoinGecko (todas sus cadenas).
//    xStocks, con la clave de Helius (SOLANA_RPC con helius), se calcula EN SOLANA: lo emitido menos lo que guardan
//    las cuentas del emisor (sus claves de emisores.json + 9U76…, que tiene cuenta en TODOS sus tokens: bóveda),
//    por el precio de la acción que da Jupiter (stockData) o, si no, su precio con ≥10 k$ de liquidez.
//    (Lo emitido sin restar no sirve: xStocks crea tokens de antemano que siguen en sus cuentas.)
const RPC_HELIUS = /helius/.test(process.env.SOLANA_RPC || "") ? process.env.SOLANA_RPC : null;
const BOVEDA_XSTOCKS = "9U76mo3WuP28s4kYJ9CMH1CiQh6Ph3r5Zg5awZM5vMQd";
async function xstocksEnSolana() {
  const e = JSON.parse(fs.readFileSync(EMISORES, "utf8")).emisores.find((x) => x.name.startsWith("xStocks"));
  const call = async (m, p) => { const r = await j(RPC_HELIUS, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: m, params: p }) }); if (r.error) throw new Error(m + ": " + r.error.message); return r.result; };
  const mints = Object.keys(e.mints), sup = {}, dec = {};
  for (let i = 0; i < mints.length; i += 100) {
    const r = await call("getMultipleAccounts", [mints.slice(i, i + 100), { encoding: "jsonParsed" }]);
    r.value.forEach((a, k) => { const inf = a?.data?.parsed?.info; if (inf) { sup[mints[i + k]] = Number(inf.supply); dec[mints[i + k]] = inf.decimals; } });
  }
  const guard = {};
  for (const own of [...e.keys, BOVEDA_XSTOCKS]) for (let pg = 1; ; pg++) {
    const t = (await call("getTokenAccounts", { owner: own, limit: 1000, page: pg })).token_accounts || [];
    for (const a of t) guard[a.mint] = (guard[a.mint] || 0) + Number(a.amount);
    if (t.length < 1000) break;
  }
  const circ = {};
  for (const m of mints) { const c = ((sup[m] || 0) - (guard[m] || 0)) / 10 ** (dec[m] ?? 8); if (c > 0) circ[m] = c; }
  const ids = Object.keys(circ); let valor = 0;
  for (let i = 0; i < ids.length; i += 50) {
    let r = null;
    for (let t = 0; t < 6 && !r; t++) { await new Promise((ok) => setTimeout(ok, t ? 4000 * t : 1100)); r = await j("https://lite-api.jup.ag/price/v3?ids=" + ids.slice(i, i + 50).join(",")).catch(() => null); }
    if (!r) throw new Error("Jupiter no responde");
    for (const [m, v] of Object.entries(r)) {
      const p = v?.stockData?.price ? v.stockData.price * (v.scaledUiConfig?.multiplier || 1) : v?.liquidity >= 10000 ? v.usdPrice : null;
      if (p) valor += circ[m] * p;
    }
  }
  return valor;
}
const CATS = { "xStocks": "xstocks-ecosystem", "Ondo Finance": "ondo-tokenized-assets", "Securitize": "securitize-ecosystem", "Remora Markets": "remora-markets-tokenized-rstocks" };
const LOGOS = { "xStocks": "xstocks", "Ondo Finance": "ondo-finance", "Securitize": "securitize", "Remora Markets": "remora-markets" };
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
// CoinGecko gratis da 429 si se le pide seguido (y más desde GitHub): se reintenta con esperas crecientes.
const cgj = async (u) => { for (let t = 0; t < 6; t++) { const r = await fetch(u, CGH).catch(() => null); if (r && r.ok) return r.json(); await espera(15000 * (t + 1)); } throw new Error(u.split("?")[0] + " no responde"); };
const cg = await cgj("https://api.coingecko.com/api/v3/coins/categories");
for (const [n, id] of Object.entries(CATS)) {
  const c = cg.find((x) => x.id === id); if (!c || !c.market_cap) continue;
  let valor = c.market_cap, todas = true;
  if (n === "xStocks" && RPC_HELIUS) { const v = await xstocksEnSolana().catch((e) => (console.log("xStocks en Solana:", e.message), null)); if (v) { valor = v; todas = false; } }
  const fila = rows.find((r) => r.n === n) || rwa[n];
  if (fila) {
    if (fila.med === "fees") { fila.f30 = fila.m; fila.c = null; }
    fila.ap = "Activos tokenizados"; fila.gr = "Activos reales"; fila.med = "valor"; fila.m = valor; fila.todas = todas;
    delete rwa[n]; if (!rows.includes(fila)) rows.push(fila);
  } else rows.push({ n, ap: "Activos tokenizados", gr: "Activos reales", med: "valor", m: valor, c: null, r30: null, tvl: null, tok: false, sym: "", gecko: null, mcap: null,
    logo: "https://icons.llamao.fi/icons/protocols/" + LOGOS[n] + "?w=48&h=48", todas });
  console.log(n, Math.round(valor / 1e6), "M$", todas ? "(CoinGecko, todas las cadenas)" : "(en Solana, calculado)");
}
// Los RWA que venían por comisiones pasan a medirse por valor (si lo tienen); las comisiones quedan como dato.
for (const r of rows) if (r.gr === "Activos reales" && r.med === "fees") {
  const v = rwa[r.n]; r.f30 = r.m; r.med = "valor"; r.m = v ? v.m : null; r.c = null; if (v) delete rwa[r.n];
}
rows.push(...Object.values(rwa));

// 3) Stablecoins: dinero en circulación en Solana
const val = (o) => o ? (o.peggedUSD ?? Object.values(o)[0] ?? 0) : 0;
let stTot = 0, stPrev = 0;
const st = [];
for (const a of stables.peggedAssets) {
  const c = a.chainCirculating && a.chainCirculating.Solana; if (!c) continue;
  const ahora = val(c.current) * (a.pegType === "peggedUSD" ? 1 : (a.price || 1)), antes = val(c.circulatingPrevMonth) * (a.pegType === "peggedUSD" ? 1 : (a.price || 1));
  stTot += ahora; stPrev += antes;
  if (ahora > 1e6) st.push({ n: a.name, ap: "Activos tokenizados", gr: "Stablecoins", med: "circ", m: ahora, c: antes > 0 ? ahora / antes - 1 : null,
    r30: null, tvl: null, tok: true, sym: a.symbol, gecko: a.gecko_id || null, mcap: null, logo: "", emisor: a.name });
}
// Hylo cobra comisiones pero su medida aquí es su dólar (hyUSD), que ya sale en la lista de stablecoins.
const sinHylo = rows.filter((r) => !(r.n === "Hylo"));
// 3b) IA y Juegos: DefiLlama recoge muy pocos porque casi no cobran en la cadena. Se completan con los tokens de
//     esas categorías de CoinGecko que están en Solana, medidos por capitalización (falta medir su uso real: Helius).
const CG_APS = [["meme-token", "Meme", "Memecoins"], ["ai-agents", "IA", "Agentes de IA"], ["artificial-intelligence", "IA", "Proyectos de IA"], ["gaming", "Juegos", "Juegos"]];
// «De Solana» = Solana es su ÚNICA cadena (fuera los puenteados: ApeCoin, GALA, Aethir…; la categoría solana-ecosystem de CoinGecko también los mete).
const soloSolana = (c) => { const ks = Object.keys(c.platforms || {}).filter((k) => k && c.platforms[k]); return ks.length === 1 && ks[0] === "solana"; };
const cgLista = await cgj("https://api.coingecko.com/api/v3/coins/list?include_platform=true");
const MINT = Object.fromEntries(cgLista.filter((c) => c.platforms && c.platforms.solana).map((c) => [c.id, c.platforms.solana]));
// Nacidas en Solana que luego se copiaron a otras cadenas: entran aunque no sean «solo Solana» (lista a mano, CoinGecko ids).
const NACIDAS_SOLANA = ["bonk", "dogwifcoin", "pudgy-penguins", "ponke", "gigachad-2", "myro", "slerf", "jeo-boden", "ai16z"];
const enSolana = new Set([...cgLista.filter(soloSolana).map((c) => c.id), ...NACIDAS_SOLANA]);
// Las lanzaderas no bloquean su token como memecoin (BONK.fun usa el id de BONK).
const yaEsta = new Set([...sinHylo, ...st].filter((r) => r.gr !== "Lanzaderas").map((r) => r.gecko).filter(Boolean));
const tk = [];
for (const [cat, apN, grN] of CG_APS) {
  for (let pg = 1; pg <= 2; pg++) {
    await espera(2500);
    const l = await cgj(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=${cat}&order=market_cap_desc&per_page=250&page=${pg}&price_change_percentage=24h`);
    for (const c of l) {
      if (!enSolana.has(c.id) || yaEsta.has(c.id) || !(c.market_cap > 1e6) || !(c.total_volume > 1e4)) continue;
      yaEsta.add(c.id);
      tk.push({ n: c.name, ap: apN, gr: grN, med: "token", m: c.market_cap, c: null, r30: null, tvl: null, tok: true, sym: (c.symbol || "").toUpperCase(),
        gecko: c.id, mcap: c.market_cap, vol: c.total_volume, precio: c.current_price, c24: c.price_change_percentage_24h != null ? c.price_change_percentage_24h / 100 : null, logo: c.image || "" });
    }
    if (l.length < 250) break;
  }
}
console.log("IA y juegos de CoinGecko en Solana:", tk.length);
// 3c) DePIN (26/11, decidido por el usuario): io.net y Nosana pasan de IA a Otros › DePIN (son redes de GPUs) y entra Helium,
//     que no está en ninguna de esas categorías. Su «uso real» es la red: ver redDePIN más abajo.
for (const r of tk) if (r.gecko === "io" || r.gecko === "nosana") { r.ap = "Otros"; r.gr = "DePIN"; }
// 26/11 (usuario, maqueta ecosistema-ia-aporta): Grass y NATIX son redes de aparatos o internet de la gente → DePIN;
// clawpump.tech es una lanzadera de tokens de agentes → Meme
for (const r of tk) if (r.gecko === "grass" || r.gecko === "natix-network") { r.ap = "Otros"; r.gr = "DePIN"; } else if (r.gecko === "clawpump-tech") { r.ap = "Meme"; r.gr = "Memecoins"; }
if (!yaEsta.has("helium")) {
  const hl = await cgj("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=helium&price_change_percentage=24h").catch(() => []);
  for (const c of hl) tk.push({ n: "Helium", ap: "Otros", gr: "DePIN", med: "token", m: c.market_cap, c: null, r30: null, tvl: null, tok: true, sym: (c.symbol || "").toUpperCase(),
    gecko: c.id, mcap: c.market_cap, vol: c.total_volume, precio: c.current_price, c24: c.price_change_percentage_24h != null ? c.price_change_percentage_24h / 100 : null, logo: c.image || "" });
}
const todas = [...sinHylo, ...st, ...tk];
mover(todas);   // los de CoinGecko (Infinity Gaming, SOLPUMP) llegan después

// 4) Los 10 primeros de cada grupo
const sel = [];
const grupos = {};
for (const r of todas) (grupos[r.ap + "|" + r.gr] ||= []).push(r);
// 24/11: en DeFi, lo que se mide por comisiones solo entra si cobra al menos 1.000 $ al mes (fuera los casi muertos:
// Nirvana cobraba 17 $/mes, sin ficha en CoinGecko y con 3 $ de liquidez; FBYT, 128 $)
const DEFI_MIN = 1000;
// fuera a mano (24/11): Loan Meme — su web (loanmeme.com) es un dominio caducado
const FUERA = new Set(["Loan Meme"]);
const entra = (r) => (r.m > 0 || r.f30 > 0) && !FUERA.has(r.n) && !(r.ap === "DeFi" && r.med === "fees" && !(r.m >= DEFI_MIN));
for (const lista of Object.values(grupos)) sel.push(...lista.filter(entra).sort((a, b) => (b.m || 0) - (a.m || 0)).slice(0, POR_GRUPO));

// 5) Precios de CoinGecko (una petición)
const ids = [...new Set(sel.filter((r) => r.gecko).map((r) => r.gecko))];
try {
  const pr = await cgj("https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&include_24hr_change=true&include_market_cap=true&ids=" + ids.join(","));
  for (const r of sel) { const p = r.gecko && pr[r.gecko]; if (p) { r.precio = p.usd; r.c24 = p.usd_24h_change != null ? p.usd_24h_change / 100 : null; if (p.usd_market_cap) r.mcap = p.usd_market_cap; } }
} catch (e) { console.log("CoinGecko:", e.message); }
for (const r of sel) if (r.gr === "Stablecoins") r.mcap = null;

// 6) Titulares y traders de Jupiter (gratis, hasta 100 tokens por petición): cuánta gente lo tiene y cuánta opera,
//    separando la actividad orgánica de los bots. Sirve en todos los apartados con token en Solana.
// 23/11: sin ficha en CoinGecko (H081, FBYT…) la dirección sale de DefiLlama («solana:<mint>»)
const mintDe = (r) => (r.gecko && MINT[r.gecko]) || (/^solana:/.test(r.addr || "") ? r.addr.slice(7) : null);
const conMint = sel.filter((r) => r.tok && mintDe(r));
for (let i = 0; i < conMint.length; i += 100) {
  const lote = conMint.slice(i, i + 100);
  const l = await j("https://lite-api.jup.ag/tokens/v2/search?query=" + lote.map(mintDe).join(",")).catch(() => []);
  const por = Object.fromEntries(l.map((t) => [t.id, t]));
  for (const r of lote) {
    const t = por[mintDe(r)]; if (!t) continue;
    r.mint = t.id; r.tit = t.holderCount ?? null;
    if (!r.logo && String(t.icon || "").startsWith("https://")) r.logo = t.icon;               // stablecoins: DefiLlama no trae logo
    const d = t.stats24h || {};
    r.titC = d.holderChange != null ? d.holderChange / 100 : null;
    r.trad = d.numTraders ?? null; r.org = d.numOrganicBuyers ?? null;
    r.orgScore = t.organicScore != null ? Math.round(t.organicScore) : null;
  }
}
const CADENA = { base: "Base", arbitrum: "Arbitrum", robinhood: "Robinhood Chain", bsc: "BNB Chain", avax: "Avalanche", fantom: "Fantom", polygon: "Polygon", optimism: "Optimism", ethereum: "Ethereum" };
for (const r of sel) if (r.tok && !r.mint && r.addr && !/^solana:/.test(r.addr)) { const k = r.addr.includes(":") ? r.addr.split(":")[0] : "ethereum"; r.cad = CADENA[k] || k; }
// copias en Solana con el mismo símbolo (23/11): la web avisa «En Solana solo hay copias con este nombre»
for (const r of sel.filter((x) => x.cad && x.sym)) {
  const l = await j("https://lite-api.jup.ag/tokens/v2/search?query=" + encodeURIComponent(r.sym)).catch(() => []);
  if (Array.isArray(l)) r.copias = l.filter((t) => (t.symbol || "").toUpperCase() === r.sym.toUpperCase()).length;   // sin respuesta: sin dato, no «0 copias»
  await new Promise((ok) => setTimeout(ok, 1200));
}
console.log("con titulares de Jupiter:", sel.filter((r) => r.tit != null).length);

// Datos a mano con su fuente (24/11, aprobados por el usuario): lo que DefiLlama no da. q = lo que se queda; dep = depositado.
const MANO = {
  "Harmonic": { r30: 0, q: { es: "se queda 0 %", en: "keeps 0%" }, src: "docs.harmonic.gg (100 % de la propina al validador)" },
  "Lulo": { q: { es: "cobra el 10 % del rendimiento", en: "charges 10% of the yield" }, src: "lulo.fi (FAQ)" },
  "LP Agent": { dep: { es: "600 k$+ (todas las cadenas)", en: "$600k+ (all chains)" }, src: "lpagent.io" },
};
for (const r of sel) { const x = MANO[r.n]; if (!x) continue; if ("r30" in x) r.r30 = x.r30; r.mano = { q: x.q || null, dep: x.dep || null, src: x.src, f: "2026-11-24" }; }
// dfdvSOL: DefiLlama no da lo depositado; sale de la cadena: tokens emitidos × su precio en Jupiter (24/11)
const DFDV = "sctmB7GPi5L2Q5G9tUSzXvhZ4YiDMEGcRov9KfArQpx", dfdv = sel.find((r) => r.n === "dfdvSOL");
if (dfdv && !dfdv.tvl) try {
  const [a, p] = await Promise.all([
    j(process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getAccountInfo", params: [DFDV, { encoding: "jsonParsed" }] }) }),
    j("https://lite-api.jup.ag/price/v3?ids=" + DFDV),
  ]);
  const inf = a.result.value.data.parsed.info, precio = p[DFDV] && p[DFDV].usdPrice;
  if (precio) dfdv.tvl = Number(inf.supply) / 10 ** inf.decimals * precio;
} catch (e) { console.log("dfdvSOL:", e.message.replace(/api-key=[^&\s]+/, "api-key=***")); }

const hoy = new Date();
const dia = hoy.toISOString().slice(0, 10);
// Memoria diaria: la medida de cada fila y quién no tenía token. Con ella sale
//   · el cambio a 30 días donde la fuente no lo da (activos reales, IA, juegos), y
//   · «Acaba de sacar token»: filas que hoy tienen token y que en los últimos 30 días salieron SIN token al menos 3 días.
const HIST = path.join(OUT, "ecosistema-historial.json");
let hist = {};
try { hist = JSON.parse(fs.readFileSync(HIST, "utf8")); } catch {}
if (!hist.dias) hist = { dias: {} };
// Supply de cada token (para la EMISIÓN: cuántos se crean o se queman al mes). Se lee en la cadena (RPC propio si hay).
const RPC_SUP = process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";
const conMintSel = sel.filter((r) => r.mint), sup = {}, supplyCrudo = {};
for (let i = 0; i < conMintSel.length; i += 100) {
  const lote = conMintSel.slice(i, i + 100);
  const r = await j(RPC_SUP, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getMultipleAccounts", params: [lote.map((x) => x.mint), { encoding: "jsonParsed" }] }) }).catch(() => null);
  (r && r.result ? r.result.value : []).forEach((a, k) => { const inf = a && a.data && a.data.parsed && a.data.parsed.info; if (inf) { sup[lote[k].mint] = Number(inf.supply) / 10 ** inf.decimals; supplyCrudo[lote[k].mint] = Number(inf.supply); } });
}
// DePIN: lo que hace cada red hoy, de su fuente pública (sin Helius). a = la cifra principal; se guarda cada día para el cambio a 30 d
await redDePIN(sel);
hist.dias[dia] = { m: Object.fromEntries(sel.filter((r) => r.m > 0).map((r) => [r.n, Math.round(r.m)])), sin: sel.filter((r) => !r.tok).map((r) => r.n), sup,
  red: Object.fromEntries(sel.filter((r) => r.red && r.red.a > 0).map((r) => [r.n, r.red.a])) };
for (const d of Object.keys(hist.dias)) if ((hoy - new Date(d)) / 864e5 > 400) delete hist.dias[d];
const dias = Object.keys(hist.dias).sort();
const viejo = dias.filter((d) => (hoy - new Date(d)) / 864e5 >= 28).pop();
// IA y Memes (medidos por capitalización, «token»): solo con nuestro historial desde el 1/12 (decisión del 24/11),
// así que el cambio a 30 días no sale hasta el 31/12; antes, «sin dato a 30 días»
if (viejo) for (const r of sel) if (r.red && hist.dias[viejo].red && hist.dias[viejo].red[r.n] > 0) r.red.c30 = r.red.a / hist.dias[viejo].red[r.n] - 1;
if (viejo) for (const r of sel) if (r.c == null && (r.med !== "token" || viejo >= "2026-12-01") && hist.dias[viejo].m[r.n] > 0 && r.m > 0) r.c = r.m / hist.dias[viejo].m[r.n] - 1;
// Emisión a 30 días: cambio del supply frente a hace ≥28 días (positivo = se crearon tokens; negativo = se quemaron)
const viejoSup = dias.filter((d) => (hoy - new Date(d)) / 864e5 >= 28 && hist.dias[d].sup).pop();
if (viejoSup) for (const r of sel) { const a = hist.dias[viejoSup].sup[r.mint], b = sup[r.mint]; if (a > 0 && b != null) r.emi30 = b / a - 1; }
for (const r of sel) {
  if (!r.tok) continue;
  const sinDias = dias.filter((d) => d !== dia && (hoy - new Date(d)) / 864e5 <= 30 && hist.dias[d].sin.includes(r.n));
  if (sinDias.length >= 3) r.nuevo = dias.find((d) => d > sinDias[sinDias.length - 1]) || dia;   // primer día que salió con token
}
// Código de apartado (apc): lo usa la pestaña Escáner, que en inglés no puede comparar con el nombre en español
const APC = { "Meme": "meme", "Activos tokenizados": "rwa", "DeFi": "defi", "Juegos": "juegos", "IA": "ia", "Apps y bots": "apps", "Otros": "otros" };
for (const r of sel) r.apc = APC[r.ap] || "otros";
// SOL, la red (26/11, maqueta ecosistema-sol.html): precio (CoinGecko), lo que cobra la red y lo depositado en DeFi
// (DefiLlama), staking y transacciones (la propia cadena, RPC público). Si algo falla, ese dato sale vacío.
const sol = await solRed().catch((e) => { console.log("sol:", e.message); return null; });
if (sol) { hist.dias[dia].sol = { pct: sol.pct, tx: sol.tx, fees30: sol.fees30 };
  const vS = dias.filter((d) => (hoy - new Date(d)) / 864e5 >= 28 && hist.dias[d].sol).pop();
  if (vS) { const o = hist.dias[vS].sol; sol.c30 = { pct: o.pct != null && sol.pct != null ? sol.pct - o.pct : null, tx: o.tx > 0 && sol.tx ? sol.tx / o.tx - 1 : null, fees30: o.fees30 > 0 && sol.fees30 ? sol.fees30 / o.fees30 - 1 : null }; } }
const D = {
  fecha: hoy.toISOString(),
  mercado: { fees: totFees60 > 0 ? totFees30 / totFees60 - 1 : null, circ: stPrev > 0 ? stTot / stPrev - 1 : null },
  totFees30, totStables: stTot, sol,
  rows: sel,
};
if (sel.length < 100) throw new Error("Solo " + sel.length + " filas: algo ha fallado, no se publica");

// 7) perfiles.json (21/11): lo que el Escáner necesita para los PUNTOS POR APARTADO de cada token (motor, perfil.js)
//    y que no está en la cadena. Una entrada por dirección; si varias filas comparten token (Pump.fun: lanzadera,
//    PumpSwap, Terminal, app), se suman como UNA empresa. Campos: ver scoreProfile en solana-risk-engine/src/perfil.js
const perfiles = await hacerPerfiles(sel).catch((e) => { console.log("perfiles:", e.message); return null; });
// 8) Una empresa con varias partes se ve como UNA fila (21/11, decisión del usuario): Pump.fun va en DeFi · DEX (22/11: compite con Raydium y Meteora) con
//    sus partes debajo. Se hace después de los perfiles, que ya las suman por su cuenta a partir de las filas sueltas.
const NOMBRE_EMPRESA = { "parent#pump": "Pump.fun" };
for (const pid of SEPARAR) {
  const ps = sel.filter((r) => r.pid === pid); if (ps.length < 2) continue;
  const conTok = ps.find((r) => r.mint) || ps.find((r) => r.tok) || ps[0], padre = PADRE[pid] || {};
  const m = ps.reduce((s, r) => s + r.m, 0), m60 = ps.reduce((s, r) => s + (r.c != null && r.c > -1 ? r.m / (1 + r.c) : 0), 0);
  const suma = (k) => ps.reduce((s, r) => s + (r[k] || 0), 0) || null;
  const una = { ...conTok, ids: ps.flatMap((r) => r.ids || []), n: NOMBRE_EMPRESA[pid] || padre.name || conTok.n, ap: "DeFi", gr: "DEX", apc: "defi", med: "fees",
    m, c: m60 > 0 ? m / m60 - 1 : null, r30: suma("r30"), tvl: suma("tvl"), logo: logo(padre.logo) || conTok.logo,
    partes: ps.slice().sort((a, b) => b.m - a.m).map((r) => ({ n: r.n, gr: r.gr, m: Math.round(r.m), c: r.c })) };
  delete una.nuevo;
  sel.splice(sel.indexOf(ps[0]), 0, una);
  for (const r of ps) sel.splice(sel.indexOf(r), 1);
}
// 9) Hackeos y auditorías en CADA fila (25/11), tenga token o no: la vista de DeFi los enseña en «Riesgos de este mes»
//    y en la señal. hk = [{d: unix s, p: $ perdidos y no devueltos}] (DefiLlama hacks), aud = nº de auditorías (o 1 si hay enlace)
const HACKS = await j("https://api.llama.fi/hacks").catch(() => []);
for (const r of sel) {
  const ids = new Set(r.ids || []);
  if (!ids.size && !r.pid) continue;
  const hk = HACKS.filter((h) => ids.has(String(h.defillamaId)) || (r.pid && h.parentProtocolId === r.pid));
  if (hk.length) r.hk = hk.map((h) => ({ d: h.date, p: Math.max(0, Math.round((h.amount || 0) - (h.returnedFunds || 0))) }));
  const ps = [...ids].map((id) => P[id]).filter(Boolean), aud = Math.max(0, ...ps.map((p) => +p.audits || 0));
  if (aud || ps.some((p) => (p.audit_links || []).length)) r.aud = aud || 1;
}
console.log("con hackeos:", sel.filter((r) => r.hk).length, "· auditados:", sel.filter((r) => r.aud).length);
for (const r of sel) { delete r.ids; delete r.pid; delete r.addr; }
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(HIST, JSON.stringify(hist));
fs.writeFileSync(path.join(OUT, "ecosistema.json"), JSON.stringify(D));
if (perfiles && Object.keys(perfiles.t).length >= 50) fs.writeFileSync(path.join(OUT, "perfiles.json"), JSON.stringify(perfiles));
else console.log("perfiles.json no se escribe (pocos tokens): se queda el de ayer");
// 9) Lista diaria de activos tokenizados (21/11): todos los tokens de los emisores comprobados de acciones (xStocks,
//    Backpack, Ondo) con al menos 10 k$ de liquidez contra USDC/USDT/SOL. La lee /api/acciones. Si falla, se queda la de ayer.
try {
  const filas = await hacerLista(JSON.parse(fs.readFileSync(EMISORES, "utf8")).emisores);
  if (filas.length >= 20) fs.writeFileSync(path.join(OUT, "acciones-lista.json"), JSON.stringify({ fecha: hoy.toISOString(), filas }));
  console.log("acciones-lista:", filas.length, "activos");
} catch (e) { console.log("acciones-lista:", e.message); }
const cuenta = {};
for (const r of sel) cuenta[r.ap + " · " + r.gr] = (cuenta[r.ap + " · " + r.gr] || 0) + 1;
console.log(sel.length, "filas ·", sel.filter((r) => r.nuevo).length, "acaban de sacar token"); console.log(cuenta);

async function hacerPerfiles(sel) {
  const [hold, hacks] = await Promise.all([
    j("https://api.llama.fi/overview/fees/solana?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyHoldersRevenue").catch(() => ({ protocols: [] })),
    j("https://api.llama.fi/hacks").catch(() => []),
  ]);
  const HOLD = Object.fromEntries(hold.protocols.map((p) => [String(p.defillamaId), p.total30d || 0]));
  const t = {};
  for (const r of sel) {
    if (!r.mint) continue;
    const e = t[r.mint] ||= { ap: r.apc, ids: new Set(), pids: new Set() };
    if (r.med === "fees") {
      e.f30 = (e.f30 || 0) + r.m; e.f60 = (e.f60 || 0) + (r.c != null && r.c > -1 ? r.m / (1 + r.c) : 0);
      if (r.r30) e.r30 = (e.r30 || 0) + r.r30;
      for (const id of r.ids || []) { e.ids.add(id); if (HOLD[id]) e.h30 = (e.h30 || 0) + HOLD[id]; }
      if (r.pid) e.pids.add(r.pid);
      (e.partes ||= []).push([r.n, Math.round(r.m)]);   // cada parte de la empresa con lo que cobra
      // el apartado de la fila que más cobra (Pump: PumpSwap, así que DeFi)
      if (!e.top || r.m > e.top) { e.top = r.m; e.ap = r.apc; }
    }
    if (r.tvl) e.tvl = (e.tvl || 0) + r.tvl;
    if (r.trad != null) e.trad = r.trad; if (r.orgScore != null) e.org = r.orgScore;
    if (r.tit != null) e.tit = r.tit; if (r.titC != null) e.titC = r.titC;
    if (r.gecko) e.gecko = r.gecko;
    if (r.mcap) e.mcap = Math.round(r.mcap);
  }
  // apartado decidido a mano: Pump.fun es UNA empresa de DeFi (decisión del usuario 22/11; antes apps), con PumpSwap como la parte que más cobra
  // (23/11) StonkFun también: DeFi · DEX
  const AP_FORZADO = { pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn: "defi", "6GmAFSYs4gk3FDao5FzzySQpPZaWsa4rUJHacpMpUNgx": "defi" };
  for (const [mint, e] of Object.entries(t)) {
    if (AP_FORZADO[mint]) e.ap = AP_FORZADO[mint];
    if (e.f60 > 0) e.c = Math.round((e.f30 / e.f60 - 1) * 1000) / 1000;
    const ps = [...e.ids].map((id) => P[id]).filter(Boolean);
    const aud = Math.max(0, ...ps.map((p) => +p.audits || 0)); if (aud || ps.some((p) => (p.audit_links || []).length)) e.aud = aud || 1;
    const desde = Math.min(...ps.map((p) => p.listedAt || Infinity)); if (isFinite(desde)) e.desde = desde;
    const hk = hacks.filter((h) => e.ids.has(String(h.defillamaId)) || (h.parentProtocolId && e.pids.has(h.parentProtocolId)));
    if (hk.length) e.hk = hk.map((h) => ({ d: h.date, p: Math.max(0, Math.round((h.amount || 0) - (h.returnedFunds || 0))) }));
    for (const k of ["f30", "r30", "h30", "tvl"]) if (e[k] != null) e[k] = Math.round(e[k]);
    if (e.partes && e.partes.length < 2) delete e.partes; else if (e.partes) e.partes.sort((a, b) => b[1] - a[1]);
    delete e.ids; delete e.pids; delete e.top; delete e.f60;
  }
  // IA: ¿hay código público y se mueve? (GitHub enlazado desde CoinGecko; con GITHUB_TOKEN en Actions, 1.000/h)
  const WEB_MANO = { "alchemist-ai": "https://alchemistai.app", "virtual-protocol": "https://app.virtuals.io", "perle": "https://www.perle.ai", "kled-ai": "https://kled.ai", "tokenos-ai": "https://tokenos.ai" };
  const GH = process.env.GITHUB_TOKEN ? { headers: { authorization: "Bearer " + process.env.GITHUB_TOKEN } } : undefined;
  for (const e of Object.values(t).filter((x) => x.ap === "ia" && x.gecko)) {
    const c = await cgj(`https://api.coingecko.com/api/v3/coins/${e.gecko}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`).catch(() => null);
    await espera(2500);
    // GitHub a mano cuando CoinGecko no lo enlaza (26/11: ARC es el token de Rig, la librería de 0xPlaygrounds)
    const GH_MANO = { "ai-rig-complex": "https://github.com/0xPlaygrounds/rig" };
    const u = GH_MANO[e.gecko] || ((((c || {}).links || {}).repos_url || {}).github || []).find((x) => /github\.com\/[^/]+/.test(x));
    // ¿su web carga hoy? (la de CoinGecko o la de la lista; 26/11: alchemistai.app daba error 500)
    const web = WEB_MANO[e.gecko] || (((c || {}).links || {}).homepage || []).find((x) => /^https?:\/\//.test(x || ""));
    if (web) { const r = await fetch(web, { redirect: "follow", signal: AbortSignal.timeout(15000), headers: { "user-agent": "Mozilla/5.0 (compatible; SolFlag/1.0; +https://solflag.com)" } }).catch(() => null);
      e.web = { u: web, ok: !!(r && r.status < 400), s: r ? r.status : 0 }; }
    if (!u) { e.cod = { dias: null }; continue; }
    const [, own, repo] = u.match(/github\.com\/([^/#?]+)\/?([^/#?]*)/);
    let lista = [];
    if (repo) { const r = await fetch("https://api.github.com/repos/" + own + "/" + repo, GH).catch(() => null); if (r && r.ok) lista = [await r.json()]; }
    if (!lista.length) for (const tipo of ["orgs", "users"]) { const r = await fetch("https://api.github.com/" + tipo + "/" + own + "/repos?sort=pushed&per_page=30", GH).catch(() => null); if (r && r.ok) { lista = await r.json(); break; } }
    const ult = lista.filter((x) => !x.fork).map((x) => x.pushed_at).sort().pop();
    const st = lista.length === 1 ? lista[0].stargazers_count : null;   // estrellas, cuando es un solo repositorio
    e.cod = ult ? Object.assign({ dias: Math.round((Date.now() - Date.parse(ult)) / 864e5), repos: lista.length, url: u }, st != null ? { st } : {}) : { dias: null };
  }
  // Desbloqueos de Streamflow (% del supply que se libera en 30 días y lo que sigue bloqueado): solo proyectos y solo
  // con el RPC de Helius (getProgramAccounts es pesado para el RPC público)
  // contratos de Streamflow de un token (null si el RPC falla; el error va al log una vez)
  let errDl = false;
  const streamflow = (mint) => j(RPC_HELIUS, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getProgramAccounts", params: ["strmRqUCoQUgGUan5YhzUZa6KqdzwX5L6FpUxfmKg5m", { encoding: "base64", filters: [{ memcmp: { offset: 177, bytes: mint } }] }] }) })
    .then((x) => { if (x.error && !errDl) { errDl = true; console.log("desbloqueos: el RPC contesta", JSON.stringify(x.error).slice(0, 200)); } return x.result || null; })
    .catch((x) => { if (!errDl) { errDl = true; console.log("desbloqueos:", x.message.replace(/api-key=[^&\s]+/, "api-key=***")); } return null; });
  // prueba de control: Kamino tiene contratos en Streamflow; si no salen, el RPC no sirve para esto y el dato queda «aún no lo tenemos»
  const control = RPC_HELIUS ? await streamflow("KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS") : null;
  const dlOk = !!(control && control.length);
  if (RPC_HELIUS && !dlOk) console.log("desbloqueos: la prueba de control (Kamino) no encuentra contratos; no se guardan desbloqueos hoy");
  if (dlOk) for (const [mint, e] of Object.entries(t)) {
    if (e.ap === "meme" || e.ap === "rwa") continue;
    const acc = await streamflow(mint);
    await espera(150);
    if (!acc) continue;
    if (!acc.length) { e.dl = null; continue; }
    const s = supplyCrudo[mint]; if (!s) continue;
    const u = (d, o) => Number(d.readBigUInt64LE(o)), ahora = Date.now() / 1000, mes = ahora + 30 * 86400; let lib = 0, bloq = 0;
    for (const a of acc) { const d = Buffer.from(a.account.data[0], "base64"); if (d.length < 457 || u(d, 25)) continue;
      const dep = u(d, 417), start = u(d, 409), period = u(d, 425) || 1, app = u(d, 433), cliff = u(d, 441) || start, ca = u(d, 449);
      const v = (x) => x < cliff ? 0 : Math.min(dep, ca + Math.floor((x - cliff) / period) * app); const resto = dep - v(ahora); if (resto <= 0) continue; bloq += resto; lib += v(mes) - v(ahora); }
    e.dl = { lib: Math.round(10000 * lib / s) / 100, bloq: Math.round(10000 * bloq / s) / 100 };
  }
  // Apps de Solana con token que el Ecosistema aún no tiene en su lista (decidido 21/11): apartado y actividad de Jupiter
  // 25/11: + Seeker (SKR, Solana Mobile), el 3.º de Apps y bots en la portada y la recogida
  const EXTRA = { MEFNBXixkEbait3xn9bkm8WsJzXtVsaJEn4c8Sam21u: "apps", TNSRxcUxoT9xBG3de7PiJyTDYu7kskLqcpddxnEJAS6: "apps", SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3: "apps" };
  const faltan = Object.keys(EXTRA).filter((m) => !t[m]);
  if (faltan.length) {
    const l = await j("https://lite-api.jup.ag/tokens/v2/search?query=" + faltan.join(",")).catch(() => []);
    for (const m of faltan) { const x = l.find((y) => y.id === m) || {}, d = x.stats24h || {};
      t[m] = { ap: EXTRA[m], trad: d.numTraders ?? null, org: x.organicScore != null ? Math.round(x.organicScore) : null, tit: x.holderCount ?? null, titC: d.holderChange != null ? d.holderChange / 100 : null }; }
  }
  // «Qué es» escrito a mano (21/11): tools/ecosistema/descripciones.json, {dirección: {es, en}}; el resto lo monta la web
  try { const D = JSON.parse(fs.readFileSync(path.join(AQUI, "descripciones.json"), "utf8")); for (const [m, q] of Object.entries(D)) if (t[m] && q && q.es) t[m].que = { es: q.es, en: q.en || q.es }; } catch (x) { console.log("descripciones:", x.message); }
  for (const e of Object.values(t)) delete e.gecko;
  console.log("perfiles:", Object.keys(t).length, "tokens ·", Object.values(t).filter((e) => e.dl).length, "con desbloqueos ·", Object.values(t).filter((e) => e.cod && e.cod.dias != null).length, "con código");
  return { fecha: new Date().toISOString(), t };
}

// «La red hoy» de las redes DePIN (26/11). Cada fuente por separado: si una falla, esa fila sale sin el dato.
//   io.net    explorador público: GPUs activas (a), registradas (t), verificadas (v)
//   Nosana    panel público: wallets en staking (a), trabajos de GPU hechos (h) y dólares pagados a los nodos (p)
//   Render    estadísticas de la fundación (JSON dentro de la página): nodos (a) y fotogramas renderizados (h)
//   Helium    API de entidades: puntos de acceso registrados (a = IoT + móvil); los activos ya no los publica
//   Hivemapper  lo que publica la empresa en beemaps.com/llms.txt (km únicos y totales); emp = cifra de la empresa
async function redDePIN(filas) {
  const de = (g) => filas.find((r) => r.gecko === g);
  const tj = (u) => fetch(u, { headers: { "user-agent": "SolFlag/1.0 (+https://solflag.com)" }, signal: AbortSignal.timeout(20000) }).then((r) => r.ok ? r.json() : null).catch(() => null);
  const tt = (u) => fetch(u, { headers: { "user-agent": "SolFlag/1.0 (+https://solflag.com)" }, signal: AbortSignal.timeout(20000) }).then((r) => r.ok ? r.text() : "").catch(() => "");
  let r;
  if ((r = de("io"))) { const x = await tj("https://api.io.solutions/v1/io-explorer/network/info"), d = x && x.data && x.data[0];
    if (d && d.active_gpu >= 0) r.red = { k: "gpu", a: d.active_gpu, t: d.total_gpu, v: d.verified_gpu }; }
  if ((r = de("nosana"))) { const [st, jb] = await Promise.all([tj("https://dashboard.k8s.prd.nos.ci/api/stats"), tj("https://dashboard.k8s.prd.nos.ci/api/jobs/stats")]);
    if (st && st.stakers > 0) r.red = { k: "stake", a: st.stakers, h: jb && jb.completed ? Number(jb.completed) : null, p: jb && jb.usdReward ? Math.round(Number(jb.usdReward)) : null }; }
  if ((r = de("render-token"))) { const h = await tt("https://stats.renderfoundation.com"), m = /frames\\?":(\d+),\\?"nodes\\?":(\d+)/.exec(h);
    if (m) r.red = { k: "nodos", a: Number(m[2]), h: Number(m[1]) }; }
  if ((r = de("helium"))) { const [i, mo] = await Promise.all(["iot", "mobile"].map((n) => tj("https://entities.nft.helium.io/v2/hotspots/pagination-metadata?subnetwork=" + n)));
    if (i && mo && i.totalItems > 0) r.red = { k: "reg", a: i.totalItems + mo.totalItems, iot: i.totalItems, mob: mo.totalItems }; }
  if ((r = de("hivemapper"))) { const h = await tt("https://beemaps.com/llms.txt"), t = /([\d.]+)M\+? km mapped/i.exec(h), u = /([\d.]+)M unique km/i.exec(h);
    if (u) r.red = { k: "km", a: Math.round(Number(u[1]) * 1e6), t: t ? Math.round(Number(t[1]) * 1e6) : null, emp: true }; }
  console.log("DePIN:", filas.filter((x) => x.red).map((x) => x.n + " " + x.red.a).join(" · "));
}

async function solRed() {
  const tj = (u, o) => fetch(u, Object.assign({ signal: AbortSignal.timeout(25000) }, o || {})).then((r) => r.ok ? r.json() : null).catch(() => null);
  const rpc = (m, p) => tj("https://api.mainnet-beta.solana.com", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: m, params: p || [] }) }).then((x) => x && x.result);
  const [cg, fees, chains, sup, va, perf] = await Promise.all([
    cgj("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_market_cap=true&include_24hr_change=true").catch(() => null),
    tj("https://api.llama.fi/summary/fees/solana?dataType=dailyFees"), tj("https://api.llama.fi/v2/chains"),
    rpc("getSupply", [{ excludeNonCirculatingAccountsList: true }]), rpc("getVoteAccounts"), rpc("getRecentPerformanceSamples", [60])]);
  const c = cg && cg.solana, ch = (chains || []).find((x) => x.name === "Solana");
  const staked = va ? [...va.current, ...va.delinquent].reduce((a, v) => a + v.activatedStake, 0) / 1e9 : null, total = sup ? sup.value.total / 1e9 : null;
  let tx = 0, secs = 0; for (const s of perf || []) { tx += s.numTransactions; secs += s.samplePeriodSecs; }
  const out = { precio: c ? c.usd : null, mcap: c ? Math.round(c.usd_market_cap) : null, c24: c && c.usd_24h_change != null ? c.usd_24h_change / 100 : null,
    fees30: fees && fees.total30d ? Math.round(fees.total30d) : null, tvl: ch ? Math.round(ch.tvl) : null,
    pct: staked && total ? Math.round(staked / total * 1000) / 10 : null, val: va ? va.current.length : null,
    tx: secs ? Math.round(tx / secs * 86400) : null, tps: secs ? Math.round(tx / secs) : null };
  console.log("SOL:", JSON.stringify(out));
  return out.precio || out.fees30 || out.pct ? out : null;
}
