// GET /api/acciones — acciones tokenizadas en Solana frente a la acción real: precio del token (DexScreener),
// precio de la acción (Twelve Data, clave en el secreto TWELVE_DATA_KEY), prima o descuento, si la bolsa está
// abierta y la liquidez para salir. Solo tokens cuyas claves son las del emisor (comprobado con el motor el 12/11).
//
// Twelve Data gratis: 8 créditos por minuto y 800 al día, uno por acción. Cada precio se guarda en la caché de
// Cloudflare (20 min con la bolsa abierta; 6 h cerrada, cuando el precio apenas cambia: unas 23 consultas al día por acción) y en cada petición se refrescan como mucho LOTE acciones.

export const ACCIONES = [
  // [token, acción, emisor, mint]
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
  ["GLDx", "GLD", "xStocks", "Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re"],
  // añadidas el 12/11 (claves de xStocks comprobadas con el motor; solo las de 10.000 $ de liquidez o más)
  ["MCDx", "MCD", "xStocks", "XsqE9cRRpzxcGKDXj1BJ7Xmg4GRhZoyY1KpmGSxAWT2"],
  ["GMEx", "GME", "xStocks", "Xsf9mBktVB9BSU5kf4nHxPq5hCBJ2j2ui3ecFGxPRGc"],
  ["AVGOx", "AVGO", "xStocks", "XsgSaSvNSqLTtFuyWPBhK9196Xb9Bbdyjj4fH3cPJGo"],
  ["INTCx", "INTC", "xStocks", "XshPgPdXFRWB8tP1j82rebb2Q9rPgGX37RuqzohmArM"],
  ["TQQQx", "TQQQ", "xStocks", "XsjQP3iMAaQ3kQScQKthQpx9ALRbjKAjQtHg6TFomoc"],
  ["PLTRx", "PLTR", "xStocks", "XsoBhf2ufR8fTyNSjqfU71DYGaE6Z3SUGAidpzriAA4"],
  ["KOx", "KO", "xStocks", "XsaBXg8dU5cPM6ehmVctMkVqoiRG2ZjMo1cyBJ3AykQ"],
  ["DFDVx", "DFDV", "xStocks", "Xs2yquAgsHByNzx68WJC55WHjHBvG9JsMB7CWjTLyPy"],
  ["BRK.Bx", "BRK.B", "xStocks", "Xs6B6zawENwAbWVi7w92rjazLuAr5Az59qgWKcNb45x"],
  ["PEPx", "PEP", "xStocks", "Xsv99frTRUeornyvCfvhnDesQDWuvns1M852Pez91vF"],
  ["NFLXx", "NFLX", "xStocks", "XsEH7wWfJJu2ZT3UCFeVfALnVA6CP5ur7Ee11KmzVpL"],
  ["ORCLx", "ORCL", "xStocks", "XsjFwUPiLofddX5cWFHW35GCbXcSu1BCUGfxoQAQjeL"],
  ["UNHx", "UNH", "xStocks", "XszvaiXGPwvk2nwb3o9C1CX4K6zH8sez11E6uyup6fe"],
  ["XOMx", "XOM", "xStocks", "XsaHND8sHyfMfsWPj6kSdd5VwvCayZvjYgKmmcNL5qh"],
  ["SPYon", "SPY", "Ondo", "k18WJUULWheRkSpSquYGdNNmtuE2Vbw1hpuUi92ondo"],
  ["AAPLon", "AAPL", "Ondo", "123mYEnRLM2LLYsJW3K6oyYh8uP1fngj732iG638ondo"]
];
export const LOTE = 7;
// dólares y fondos con emisor comprobado (emisores.json): [token, emisor, mint, página de reservas]
export const DOLARES = [
  ["USDC", "Circle", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "https://www.circle.com/transparency"],
  ["USDT", "Tether", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", "https://tether.to/en/transparency"],
  ["PYUSD", "Paxos", "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo", "https://www.paxos.com/pyusd-transparency"],
  ["USDG", "Paxos", "2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH", "https://paxos.com/usdg-transparency"],
  ["EURC", "Circle", "HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr", "https://www.circle.com/transparency"],
  ["USDY", "Ondo", "A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6", "https://ondo.finance/usdy"]
];
const CLAVE = (s) => "https://cache.solflag.internal/twelvedata/" + s;

async function guardado(cache, s) {
  if (!cache) return null;
  const r = await cache.match(CLAVE(s));
  return r ? r.json() : null;
}

// Pide a Twelve Data las acciones que faltan (como mucho LOTE) y las guarda. Devuelve { símbolo: cotización }
async function pedir(syms, env, cache, fetchFn) {
  if (!syms.length || !env.TWELVE_DATA_KEY) return {};
  const r = await fetchFn("https://api.twelvedata.com/quote?symbol=" + syms.join(",") + "&apikey=" + encodeURIComponent(env.TWELVE_DATA_KEY));
  const j = await r.json().catch(() => null);
  if (!j) return {};
  const lista = syms.length === 1 ? { [syms[0]]: j } : j;
  const out = {};
  for (const s of syms) {
    const q = lista[s];
    if (!q || q.code || !q.close) continue;   // error de Twelve Data (clave, límite, símbolo)
    const v = { p: Number(q.close), abierta: q.is_market_open === true, t: Number(q.timestamp) * 1000 || null };
    out[s] = v;
    if (cache) await cache.put(CLAVE(s), new Response(JSON.stringify(v), { headers: { "cache-control": "public, max-age=" + (v.abierta ? 1200 : 21600) } }));
  }
  return out;
}

// DexScreener a veces no contesta a las IPs compartidas de Cloudflare: un reintento y, si sigue fallando, los
// últimos precios buenos (guardados una hora)
async function precios(fetchFn, cache, mints, clave) {
  const url = "https://api.dexscreener.com/tokens/v1/solana/" + mints.join(",");
  const DEX_OK = "https://cache.solflag.internal/dexscreener/" + clave;
  for (let n = 0; n < 2; n++) {
    const j = await fetchFn(url).then((r) => r.ok ? r.json() : null).catch(() => null);
    if (Array.isArray(j) && j.length) {
      if (cache) await cache.put(DEX_OK, new Response(JSON.stringify(j), { headers: { "cache-control": "public, max-age=3600" } }));
      return j;
    }
  }
  const viejo = cache ? await cache.match(DEX_OK) : null;
  return viejo ? viejo.json() : [];
}

// Multiplicador de cada token (extensión «scaled UI amount»): con un split (Netflix 10 por 1) o dividendos
// reinvertidos, cada token pasa a valer varias acciones. DexScreener da el precio sin aplicarlo, así que el precio
// comparable con la acción es precio / multiplicador. Se lee de la cadena y se guarda 6 h
const MULT = "https://cache.solflag.internal/multiplicadores";
export function multiplicador(estado, ahora) {
  if (!estado) return 1;
  const nuevo = Number(estado.newMultiplier), viejo = Number(estado.multiplier), desde = Number(estado.newMultiplierEffectiveTimestamp) * 1000;
  const m = desde && ahora >= desde ? nuevo : viejo;
  return m > 0 ? m : 1;
}
async function multiplicadores(env, fetchFn, cache, ahora) {
  const g = cache ? await cache.match(MULT) : null;
  if (g) return g.json();
  const TODAS = ACCIONES.concat(DOLARES.map((d) => [d[0], null, d[1], d[2]]));
  // el RPC público de PublicNode admite 10 cuentas por consulta; si no contesta (desde Cloudflare puede
  // rechazarlo), el oficial de Solana
  const rpcs = [env.SOLANA_RPC, "https://solana-rpc.publicnode.com", "https://api.mainnet-beta.solana.com"].filter(Boolean);
  const out = {};
  for (let i = 0; i < TODAS.length; i += 10) {
    const lote = TODAS.slice(i, i + 10);
    let vals = null;
    for (const rpc of rpcs) {
      const j = await fetchFn(rpc, { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getMultipleAccounts", params: [lote.map((a) => a[3]), { encoding: "jsonParsed" }] }) })
        .then((r) => r.json()).catch(() => null);
      vals = j && j.result && j.result.value;
      if (Array.isArray(vals)) break;
    }
    if (!Array.isArray(vals)) return out;   // sin guardar: se reintenta en la siguiente petición
    vals.forEach((v, n) => {
      const ex = v && v.data && v.data.parsed && v.data.parsed.info && v.data.parsed.info.extensions;
      const sc = (ex || []).find((e) => e.extension === "scaledUiAmountConfig");
      out[lote[n][3]] = multiplicador(sc && sc.state, ahora);
      const inf = v && v.data && v.data.parsed && v.data.parsed.info;
      if (inf && inf.supply) out["s:" + lote[n][3]] = Number(inf.supply) / Math.pow(10, inf.decimals || 0);
    });
  }
  if (cache) await cache.put(MULT, new Response(JSON.stringify(out), { headers: { "cache-control": "public, max-age=21600" } }));
  return out;
}

export async function acciones(env, opts) {
  opts = opts || {};
  const fetchFn = opts.fetch || fetch;
  const cache = opts.cache !== undefined ? opts.cache : (typeof caches !== "undefined" ? caches.default : null);
  const unders = [...new Set(ACCIONES.map((a) => a[1]))];
  const cot = {};
  for (const s of unders) { const g = await guardado(cache, s); if (g) cot[s] = g; }
  Object.assign(cot, await pedir(unders.filter((s) => !cot[s]).slice(0, LOTE), env, cache, fetchFn));

  // precio, liquidez y volumen del token: el par con más liquidez de DexScreener
  const dex = await precios(fetchFn, cache, ACCIONES.map((a) => a[3]), "acciones");
  const mejor = {};
  (Array.isArray(dex) ? dex : []).forEach((p) => {
    const a = p.baseToken && p.baseToken.address, L = (p.liquidity && p.liquidity.usd) || 0;
    if (a && (!mejor[a] || L > mejor[a].liq)) mejor[a] = { precio: Number(p.priceUsd) || null, liq: L, vol: (p.volume && p.volume.h24) || 0 };
  });

  const mult = await multiplicadores(env, fetchFn, cache, Date.now());
  const filas = ACCIONES.map(([tok, und, emisor, mint]) => {
    const d = mejor[mint] || {}, q = cot[und] || null, k = mult[mint] || 1;
    const precio = d.precio ? d.precio / k : null;   // precio de lo que ves en tu wallet, comparable con la acción
    const prima = precio && q && q.p ? Math.round((precio / q.p - 1) * 10000) / 100 : null;
    return { tok: tok, accion: und, emisor: emisor, mint: mint, precio: precio ? Math.round(precio * 1e4) / 1e4 : null, mult: k, real: q ? q.p : null,
      abierta: q ? q.abierta : null, prima: prima, liq: Math.round(d.liq || 0), vol24: Math.round(d.vol || 0) };
  });
  // dólares: circulación en Solana (de la cadena) y precio (el par con más liquidez)
  const dexD = await precios(fetchFn, cache, DOLARES.map((d) => d[2]), "dolares");
  const mejorD = {};
  (Array.isArray(dexD) ? dexD : []).forEach((p) => {
    const a = p.baseToken && p.baseToken.address, L = (p.liquidity && p.liquidity.usd) || 0;
    if (a && (!mejorD[a] || L > mejorD[a].liq)) mejorD[a] = { precio: Number(p.priceUsd) || null, liq: L };
  });
  const dolares = DOLARES.map(([tok, emisor, mint, reservas]) => {
    const enSolana = mult["s:" + mint] || null, precio = (mejorD[mint] || {}).precio || null;
    return { tok: tok, emisor: emisor, mint: mint, reservas: reservas, enSolana: enSolana ? Math.round(enSolana) : null, precio: precio,
      valor: enSolana && precio ? Math.round(enSolana * precio) : null };
  });
  const abierta = Object.values(cot).some((q) => q.abierta);
  return { v: 1, t: Date.now(), multiplicadores: ACCIONES.every((a) => mult[a[3]] !== undefined), dolares: dolares, bolsa: Object.keys(cot).length ? (abierta ? "abierta" : "cerrada") : null, filas: filas,
    fuentes: "Precio del token: DexScreener. Precio de la acción: Twelve Data." };
}
