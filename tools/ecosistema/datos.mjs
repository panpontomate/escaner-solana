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
    n, ap: m[0], gr: m[1], med: "fees", m: f30, c: f60 > 0 ? f30 / f60 - 1 : null,
    r30: hijos.reduce((s, h) => s + (REV[String(h.defillamaId)] || 0), 0) || null,
    tvl: hijos.reduce((s, h) => s + tvlSol(P[String(h.defillamaId)]), 0) || null,
    tok: !!(info.gecko_id || sym), sym, gecko: info.gecko_id || null, mcap: info.mcap || null,
    logo: logo(info.logo || top.logo),
  });
}
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
const todas = [...sinHylo, ...st, ...tk];

// 4) Los 10 primeros de cada grupo
const sel = [];
const grupos = {};
for (const r of todas) (grupos[r.ap + "|" + r.gr] ||= []).push(r);
for (const lista of Object.values(grupos)) sel.push(...lista.filter((r) => r.m > 0 || r.f30 > 0).sort((a, b) => (b.m || 0) - (a.m || 0)).slice(0, POR_GRUPO));

// 5) Precios de CoinGecko (una petición)
const ids = [...new Set(sel.filter((r) => r.gecko).map((r) => r.gecko))];
try {
  const pr = await cgj("https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&include_24hr_change=true&include_market_cap=true&ids=" + ids.join(","));
  for (const r of sel) { const p = r.gecko && pr[r.gecko]; if (p) { r.precio = p.usd; r.c24 = p.usd_24h_change != null ? p.usd_24h_change / 100 : null; if (p.usd_market_cap) r.mcap = p.usd_market_cap; } }
} catch (e) { console.log("CoinGecko:", e.message); }
for (const r of sel) if (r.gr === "Stablecoins") r.mcap = null;

// 6) Titulares y traders de Jupiter (gratis, hasta 100 tokens por petición): cuánta gente lo tiene y cuánta opera,
//    separando la actividad orgánica de los bots. Sirve en todos los apartados con token en Solana.
const conMint = sel.filter((r) => r.gecko && MINT[r.gecko]);
for (let i = 0; i < conMint.length; i += 100) {
  const lote = conMint.slice(i, i + 100);
  const l = await j("https://lite-api.jup.ag/tokens/v2/search?query=" + lote.map((r) => MINT[r.gecko]).join(",")).catch(() => []);
  const por = Object.fromEntries(l.map((t) => [t.id, t]));
  for (const r of lote) {
    const t = por[MINT[r.gecko]]; if (!t) continue;
    r.mint = t.id; r.tit = t.holderCount ?? null;
    const d = t.stats24h || {};
    r.titC = d.holderChange != null ? d.holderChange / 100 : null;
    r.trad = d.numTraders ?? null; r.org = d.numOrganicBuyers ?? null;
    r.orgScore = t.organicScore != null ? Math.round(t.organicScore) : null;
  }
}
console.log("con titulares de Jupiter:", sel.filter((r) => r.tit != null).length);

const hoy = new Date();
const dia = hoy.toISOString().slice(0, 10);
// Memoria diaria: la medida de cada fila y quién no tenía token. Con ella sale
//   · el cambio a 30 días donde la fuente no lo da (activos reales, IA, juegos), y
//   · «Acaba de sacar token»: filas que hoy tienen token y que en los últimos 30 días salieron SIN token al menos 3 días.
const HIST = path.join(OUT, "ecosistema-historial.json");
let hist = {};
try { hist = JSON.parse(fs.readFileSync(HIST, "utf8")); } catch {}
if (!hist.dias) hist = { dias: {} };
hist.dias[dia] = { m: Object.fromEntries(sel.filter((r) => r.m > 0).map((r) => [r.n, Math.round(r.m)])), sin: sel.filter((r) => !r.tok).map((r) => r.n) };
for (const d of Object.keys(hist.dias)) if ((hoy - new Date(d)) / 864e5 > 400) delete hist.dias[d];
const dias = Object.keys(hist.dias).sort();
const viejo = dias.filter((d) => (hoy - new Date(d)) / 864e5 >= 28).pop();
if (viejo) for (const r of sel) if (r.c == null && hist.dias[viejo].m[r.n] > 0 && r.m > 0) r.c = r.m / hist.dias[viejo].m[r.n] - 1;
for (const r of sel) {
  if (!r.tok) continue;
  const sinDias = dias.filter((d) => d !== dia && (hoy - new Date(d)) / 864e5 <= 30 && hist.dias[d].sin.includes(r.n));
  if (sinDias.length >= 3) r.nuevo = dias.find((d) => d > sinDias[sinDias.length - 1]) || dia;   // primer día que salió con token
}
const D = {
  fecha: hoy.toISOString(),
  mercado: { fees: totFees60 > 0 ? totFees30 / totFees60 - 1 : null, circ: stPrev > 0 ? stTot / stPrev - 1 : null },
  totFees30, totStables: stTot,
  rows: sel,
};
if (sel.length < 100) throw new Error("Solo " + sel.length + " filas: algo ha fallado, no se publica");
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(HIST, JSON.stringify(hist));
fs.writeFileSync(path.join(OUT, "ecosistema.json"), JSON.stringify(D));
const cuenta = {};
for (const r of sel) cuenta[r.ap + " · " + r.gr] = (cuenta[r.ap + " · " + r.gr] || 0) + 1;
console.log(sel.length, "filas ·", sel.filter((r) => r.nuevo).length, "acaban de sacar token"); console.log(cuenta);
