// GET /api/acciones — activos tokenizados en Solana (acciones, fondos y materias primas) frente al precio real.
// v2 (21/11/2026): la lista ya no va a mano. Cada día el recolector del Ecosistema (tools/ecosistema/datos.mjs, con
// hacerLista de aquí) mira TODOS los tokens de los emisores comprobados de emisores.json (xStocks, Backpack, Ondo) y
// guarda en datos/acciones-lista.json los que tienen al menos 10 k$ de liquidez. La API lee esa lista (si no llega,
// usa ACCIONES de abajo) y saca de Jupiter, en una sola consulta por cada 50, el precio del token (ya ajustado por
// splits y dividendos) y el de la acción real (stockData). Liquidez y volumen: DexScreener, solo pools contra USDC,
// USDT o SOL (un pool contra otro token, como GLDx/ORE, daba precios falsos). Twelve Data ya no hace falta.

export const LISTA_URL = "https://solflag.com/datos/acciones-lista.json";
export const LIQ_MIN = 10000;
// respaldo si la lista diaria no llega: [token, acción, emisor, mint]
export const ACCIONES = [
  ["TSLAx", "TSLA", "xStocks", "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB"],
  ["NVDAx", "NVDA", "xStocks", "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh"],
  ["AAPLx", "AAPL", "xStocks", "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp"],
  ["SPYx", "SPY", "xStocks", "XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W"],
  ["QQQx", "QQQ", "xStocks", "Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ"],
  ["MSTRx", "MSTR", "xStocks", "XsP7xzNPvEHS1m6qfanPUGjNmdnmsLKEoNAnHjdxxyZ"],
  ["CRCLx", "CRCL", "xStocks", "XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1"],
  ["METAx", "META", "xStocks", "Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu"],
  ["GOOGLx", "GOOGL", "xStocks", "XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN"],
  ["AMZNx", "AMZN", "xStocks", "Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg"],
  ["COINx", "COIN", "xStocks", "Xs7ZdzSHLU9ftNJsii5fCeJhoRWSC32SQGzGQtePxNu"],
  ["HOODx", "HOOD", "xStocks", "XsvNBAYkrDRNhA7wPHQfX3ZUXZyZLdnCQDfHZ56bzpg"],
  ["MSFTx", "MSFT", "xStocks", "XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX"],
  ["GLDx", "GLD", "xStocks", "Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re"]
];
// dólares y fondos con emisor comprobado (emisores.json): [token, emisor, mint, página de reservas]
export const DOLARES = [
  ["USDC", "Circle", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "https://www.circle.com/transparency"],
  ["USDT", "Tether", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", "https://tether.to/en/transparency"],
  ["PYUSD", "Paxos", "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo", "https://www.paxos.com/pyusd-transparency"],
  ["USDG", "Paxos", "2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH", "https://paxos.com/usdg-transparency"],
  ["EURC", "Circle", "HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr", "https://www.circle.com/transparency"],
  ["USDY", "Ondo", "A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6", "https://ondo.finance/usdy"]
];
const NO_ACCION = new Set(DOLARES.map((d) => d[2]));

// ---------- la lista diaria (la usa tools/ecosistema/datos.mjs) ----------
// Materias primas y fondos (lo demás son acciones). Por el ticker de la acción real.
export const MATERIAS = { GLD: "Oro", USO: "Petróleo", URA: "Uranio", SLV: "Plata", IAU: "Oro" };
export const FONDOS = new Set(["SPY", "QQQ", "TQQQ", "SQQQ", "EWY", "EWZ", "UVXY", "SCHH", "DRAM", "IWM", "DIA", "VTI", "VOO", "ARKK", "TLT"]);
const QUOTES = new Set(["USDC", "USDT", "SOL", "WSOL"]);
// Emisor corto y ticker de la acción a partir del token
export function clasificar(emisor, sym, nombre) {
  const em = /xStocks/.test(emisor) ? "xStocks" : /Backpack/.test(emisor) ? "Backpack" : /Ondo/.test(emisor) ? "Ondo" : emisor;
  const und = em === "xStocks" ? sym.replace(/x$/, "") : em === "Ondo" ? sym.replace(/on$/, "") : sym;
  const limpio = String(nombre || und).replace(/ xStock$/i, "").replace(/\s*-\s*Backpack.*$/i, "").replace(/ \(Ondo.*\)$/i, "").trim() || und;
  return { tok: sym, accion: und, nombre: limpio, emisor: em, cat: MATERIAS[und] ? "mat" : FONDOS.has(und) ? "fon" : "acc" };
}
// El mejor pool de cada token entre los que cotizan contra USDC, USDT o SOL
export function mejoresPools(pares) {
  const mejor = {};
  (Array.isArray(pares) ? pares : []).forEach((p) => {
    const a = p.baseToken && p.baseToken.address, q = p.quoteToken && String(p.quoteToken.symbol || "").toUpperCase(), L = (p.liquidity && p.liquidity.usd) || 0;
    if (!a || !QUOTES.has(q)) return;
    if (!mejor[a] || L > mejor[a].liq) mejor[a] = { liq: L, vol: (p.volume && p.volume.h24) || 0, precio: Number(p.priceUsd) || null, sym: p.baseToken.symbol, nombre: p.baseToken.name };
  });
  return mejor;
}
// Recorre los tokens de los emisores de acciones de emisores.json y devuelve los que tienen mercado
export async function hacerLista(emisores, fetchFn, espera) {
  fetchFn = fetchFn || fetch; espera = espera || ((ms) => new Promise((ok) => setTimeout(ok, ms)));
  const todos = [];
  for (const e of emisores) if (/xStocks|Backpack|Ondo/.test(e.name)) for (const m of Object.keys(e.mints || {})) if (!NO_ACCION.has(m)) todos.push({ m, emisor: e.name });
  const pools = {};
  for (let i = 0; i < todos.length; i += 30) {
    const lote = todos.slice(i, i + 30).map((x) => x.m);
    let r = null;
    for (let t = 0; t < 4 && !r; t++) { r = await fetchFn("https://api.dexscreener.com/tokens/v1/solana/" + lote.join(",")).then((x) => x.ok ? x.json() : null).catch(() => null); if (!r) await espera(2500 * (t + 1)); }
    if (!r) throw new Error("DexScreener no contesta");
    Object.assign(pools, mejoresPools(r));
    await espera(250);
  }
  return todos.filter((x) => pools[x.m] && pools[x.m].liq >= LIQ_MIN).sort((a, b) => pools[b.m].liq - pools[a.m].liq)
    .map((x) => Object.assign({ mint: x.m }, clasificar(x.emisor, pools[x.m].sym, pools[x.m].nombre)));
}

// ---------- la API ----------
// ¿Bolsa de EE. UU. abierta? Lunes a viernes, 9:30–16:00 de Nueva York (no cuenta festivos)
export function bolsaAbierta(ahora) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(new Date(ahora)).map((x) => [x.type, x.value]));
  const min = (Number(p.hour) % 24) * 60 + Number(p.minute);
  return !/Sat|Sun/.test(p.weekday) && min >= 570 && min < 960;
}
async function jsonCache(cache, clave, segs, pedir) {
  const k = "https://cache.solflag.internal/" + clave;
  const g = cache ? await cache.match(k) : null;
  if (g) return g.json();
  const v = await pedir();
  if (v && cache) await cache.put(k, new Response(JSON.stringify(v), { headers: { "cache-control": "public, max-age=" + segs } }));
  return v;
}
async function lista(fetchFn, cache) {
  const l = await jsonCache(cache, "acciones-lista-v1", 3600, () => fetchFn(LISTA_URL).then((r) => r.ok ? r.json() : null).catch(() => null));
  if (l && Array.isArray(l.filas) && l.filas.length) return l.filas;
  return ACCIONES.map(([tok, und, emisor, mint]) => Object.assign({ mint }, clasificar(emisor, tok, und)));
}
// Jupiter price v3 (hasta 50 por consulta): usdPrice del token y stockData.price de la acción real
async function jupiter(fetchFn, mints) {
  const out = {};
  for (let i = 0; i < mints.length; i += 50) {
    const j = await fetchFn("https://lite-api.jup.ag/price/v3?ids=" + mints.slice(i, i + 50).join(",")).then((r) => r.ok ? r.json() : null).catch(() => null);
    if (j && typeof j === "object" && !Array.isArray(j)) Object.assign(out, j);
  }
  return out;
}
// DexScreener a veces no contesta a las IPs de Cloudflare: los últimos buenos se guardan una hora
async function pools(fetchFn, cache, mints) {
  const out = {};
  for (let i = 0; i < mints.length; i += 30) {
    const lote = mints.slice(i, i + 30), k = "https://cache.solflag.internal/dex-acciones/" + i;
    let j = null;
    for (let n = 0; n < 2 && !j; n++) { const r = await fetchFn("https://api.dexscreener.com/tokens/v1/solana/" + lote.join(",")).then((x) => x.ok ? x.json() : null).catch(() => null); if (Array.isArray(r) && r.length) j = r; }
    if (j && cache) await cache.put(k, new Response(JSON.stringify(j), { headers: { "cache-control": "public, max-age=3600" } }));
    if (!j && cache) { const v = await cache.match(k); if (v) j = await v.json(); }
    Object.assign(out, mejoresPools(j || []));
  }
  return out;
}
// Multiplicador de cada token (extensión «scaled UI amount»: splits y dividendos reinvertidos) y circulación de los
// dólares, leídos de la cadena y guardados 6 h. El precio de Jupiter ya viene ajustado: el multiplicador solo se usa
// para avisar «ajustado por splits» y como respaldo si Jupiter no da precio (DexScreener lo da sin ajustar)
export function multiplicador(estado, ahora) {
  if (!estado) return 1;
  const nuevo = Number(estado.newMultiplier), viejo = Number(estado.multiplier), desde = Number(estado.newMultiplierEffectiveTimestamp) * 1000;
  const m = desde && ahora >= desde ? nuevo : viejo;
  return m > 0 ? m : 1;
}
async function cadena(env, fetchFn, cache, mints, ahora) {
  return jsonCache(cache, "acciones-cadena-v1-" + mints.length, 21600, async () => {
    const helius = /helius/.test(env.SOLANA_RPC || ""), TAM = helius ? 100 : 10;
    const rpcs = [env.SOLANA_RPC, "https://solana-rpc.publicnode.com", "https://api.mainnet-beta.solana.com"].filter(Boolean);
    const out = {};
    for (let i = 0; i < mints.length; i += TAM) {
      const lote = mints.slice(i, i + TAM);
      let vals = null;
      for (const rpc of rpcs) {
        const j = await fetchFn(rpc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getMultipleAccounts", params: [lote, { encoding: "jsonParsed" }] }) })
          .then((r) => r.json()).catch(() => null);
        vals = j && j.result && j.result.value;
        if (Array.isArray(vals)) break;
      }
      if (!Array.isArray(vals)) return null;   // sin guardar: se reintenta en la siguiente petición
      vals.forEach((v, n) => {
        const inf = v && v.data && v.data.parsed && v.data.parsed.info;
        const sc = ((inf && inf.extensions) || []).find((e) => e.extension === "scaledUiAmountConfig");
        out[lote[n]] = multiplicador(sc && sc.state, ahora);
        if (inf && inf.supply) out["s:" + lote[n]] = Number(inf.supply) / Math.pow(10, inf.decimals || 0);
      });
    }
    return out;
  });
}

export async function acciones(env, opts) {
  opts = opts || {};
  const fetchFn = opts.fetch || fetch, ahora = opts.ahora || Date.now();
  const cache = opts.cache !== undefined ? opts.cache : (typeof caches !== "undefined" ? caches.default : null);
  const L = await lista(fetchFn, cache);
  const mints = L.map((f) => f.mint), dm = DOLARES.map((d) => d[2]);
  const [jup, dex, ch] = await Promise.all([jupiter(fetchFn, mints.concat(dm)), pools(fetchFn, cache, mints), cadena(env, fetchFn, cache, mints.concat(dm), ahora)]);
  const mult = ch || {}, abierta = bolsaAbierta(ahora);
  const filas = L.map((f) => {
    const j = jup[f.mint] || {}, d = dex[f.mint] || {}, k = mult[f.mint] || 1;
    const precio = Number(j.usdPrice) > 0 ? Number(j.usdPrice) : (d.precio ? d.precio / k : null);
    const real = j.stockData && Number(j.stockData.price) > 0 ? Number(j.stockData.price) : null;
    return { tok: f.tok, accion: f.accion, nombre: f.nombre, emisor: f.emisor, cat: f.cat, mint: f.mint,
      precio: precio ? Math.round(precio * 1e4) / 1e4 : null, mult: k, real: real, abierta: abierta,
      prima: precio && real ? Math.round((precio / real - 1) * 10000) / 100 : null, liq: Math.round(d.liq || 0), vol24: Math.round(d.vol || 0) };
  });
  const dolares = DOLARES.map(([tok, emisor, mint, reservas]) => {
    const enSolana = mult["s:" + mint] || null, v = Number(jup[mint] && jup[mint].usdPrice), precio = v > 0 ? Math.round(v * 1e4) / 1e4 : null;
    return { tok: tok, emisor: emisor, mint: mint, reservas: reservas, enSolana: enSolana ? Math.round(enSolana) : null, precio: precio,
      valor: enSolana && precio ? Math.round(enSolana * precio) : null };
  });
  return { v: 2, t: ahora, multiplicadores: !!ch, dolares: dolares, bolsa: abierta ? "abierta" : "cerrada", filas: filas,
    fuentes: "Precio del token y de la acción: Jupiter (con la bolsa cerrada, el último precio fuera de horario). Liquidez: DexScreener." };
}
