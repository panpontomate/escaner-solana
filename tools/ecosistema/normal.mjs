// «Los 3 que más se mueven hoy» de la portada (27/11/2026): una vez al día, lo que suele mover cada token de la lista
// fija (los de la recogida) en su pool principal. La web compara con eso las últimas 24 h de ese mismo pool
// (DexScreener, en el momento) y pide el porqué a /api/ballenas.
// Pool principal: el de más liquidez en DexScreener. Lo normal: media diaria de los 7 días anteriores (velas de día de
// GeckoTerminal, sin la de hoy, que va a medias). Va en GitHub Actions porque GeckoTerminal no contesta a Cloudflare.
// Escribe <OUT_DIR>/normal.json: { hecho, t: { mint: [símbolo, apartado, pool, normal $/día, días] } }.
import fs from "node:fs";
import path from "node:path";
import { TOKENS } from "../recogida/recoger.mjs";

const OUT = process.env.OUT_DIR || "datos";
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
async function json(u, intentos = 4) {
  for (let i = 0; i < intentos; i++) {
    try { const r = await fetch(u, { headers: { accept: "application/json" } }); if (r.status === 429) { await espera(15000); continue; } if (!r.ok) return null; return await r.json(); }
    catch { await espera(2000); }
  }
  return null;
}
// velas de día [t, o, h, l, c, vol], la más nueva primero: media de las 7 anteriores a la de hoy (mínimo 3)
export function normalDe(lista, hoy = Date.now()) {
  const inicioHoy = Math.floor(hoy / 864e5) * 86400;   // en segundos, como GeckoTerminal
  const prev = (lista || []).filter((x) => x[0] < inicioHoy).slice(0, 7).map((x) => +x[5]).filter((v) => v >= 0);
  if (prev.length < 3) return null;
  return [prev.reduce((a, b) => a + b, 0) / prev.length, prev.length];
}
async function main() {
  const t = {};
  const pares = await json("https://api.dexscreener.com/tokens/v1/solana/" + TOKENS.map((x) => x[1]).join(",")) || [];
  for (const [sym, mint, ap] of TOKENS) {
    const p = pares.filter((x) => x.baseToken && x.baseToken.address === mint).sort((a, b) => ((b.liquidity && b.liquidity.usd) || 0) - ((a.liquidity && a.liquidity.usd) || 0))[0];
    if (!p) continue;
    const j = await json(`https://api.geckoterminal.com/api/v2/networks/solana/pools/${p.pairAddress}/ohlcv/day?limit=8&currency=usd&token=${mint}`);
    const n = normalDe(j && j.data && j.data.attributes && j.data.attributes.ohlcv_list);
    if (n) t[mint] = [sym, ap, p.pairAddress, Math.round(n[0]), n[1]];
    await espera(2200);
  }
  const n = Object.keys(t).length;
  console.log(`normal: ${n} de ${TOKENS.length} tokens`);
  if (n >= 15) fs.writeFileSync(path.join(OUT, "normal.json"), JSON.stringify({ hecho: new Date().toISOString(), t }));
}
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) main();
