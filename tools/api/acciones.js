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
const DEX_OK = "https://cache.solflag.internal/dexscreener/acciones";
async function precios(fetchFn, cache) {
  const url = "https://api.dexscreener.com/tokens/v1/solana/" + ACCIONES.map((a) => a[3]).join(",");
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

export async function acciones(env, opts) {
  opts = opts || {};
  const fetchFn = opts.fetch || fetch;
  const cache = opts.cache !== undefined ? opts.cache : (typeof caches !== "undefined" ? caches.default : null);
  const unders = [...new Set(ACCIONES.map((a) => a[1]))];
  const cot = {};
  for (const s of unders) { const g = await guardado(cache, s); if (g) cot[s] = g; }
  Object.assign(cot, await pedir(unders.filter((s) => !cot[s]).slice(0, LOTE), env, cache, fetchFn));

  // precio, liquidez y volumen del token: el par con más liquidez de DexScreener
  const dex = await precios(fetchFn, cache);
  const mejor = {};
  (Array.isArray(dex) ? dex : []).forEach((p) => {
    const a = p.baseToken && p.baseToken.address, L = (p.liquidity && p.liquidity.usd) || 0;
    if (a && (!mejor[a] || L > mejor[a].liq)) mejor[a] = { precio: Number(p.priceUsd) || null, liq: L, vol: (p.volume && p.volume.h24) || 0 };
  });

  const filas = ACCIONES.map(([tok, und, emisor, mint]) => {
    const d = mejor[mint] || {}, q = cot[und] || null;
    const prima = d.precio && q && q.p ? Math.round((d.precio / q.p - 1) * 10000) / 100 : null;
    return { tok: tok, accion: und, emisor: emisor, mint: mint, precio: d.precio || null, real: q ? q.p : null,
      abierta: q ? q.abierta : null, prima: prima, liq: Math.round(d.liq || 0), vol24: Math.round(d.vol || 0) };
  });
  const abierta = Object.values(cot).some((q) => q.abierta);
  return { v: 1, t: Date.now(), bolsa: Object.keys(cot).length ? (abierta ? "abierta" : "cerrada") : null, filas: filas,
    fuentes: "Precio del token: DexScreener. Precio de la acción: Twelve Data." };
}
