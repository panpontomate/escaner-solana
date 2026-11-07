// Mapa del momento: una vez por hora prepara el On-chain Map del token que más se mueve en Solana (tendencia de
// GeckoTerminal, 1 h) y lo deja como un archivo pequeño, datos/momento.json, que la página Escáner dibuja en miniatura.
// Calcularlo en el navegador de cada visitante serían cientos de peticiones; así se hace una vez para todos.
//
// Uso: node tools/momento/momento.mjs     (RPC en SOLANA_RPC; publica en PUB_DIR/datos, o en la raíz del repo)
// Lleva su propio motor (package.json de esta carpeta) para no cambiar la versión con la que juzga el registro.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, connectionMap, knownWallet } from "solana-risk-engine";
import { shape, candidates, MAX_HOLDERS } from "./forma.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUB = process.env.PUB_DIR ? path.resolve(process.env.PUB_DIR) : path.join(HERE, "..", "..");
const OUT = path.join(PUB, "datos", "momento.json");
const RPC = process.env.SOLANA_RPC || "https://solana-rpc.publicnode.com";
const GT = "https://api.geckoterminal.com/api/v2/networks/solana/";
export const EVERY_MS = 55 * 60000;   // el recolector pasa cada 30 min: así se rehace una vez por hora
const TRIES = 3;                      // si el primero de la tendencia falla, se prueba con el siguiente
function fresh() {
  try { const o = JSON.parse(fs.readFileSync(OUT, "utf8")); return o && o.at && Date.now() - o.at < EVERY_MS; }
  catch (e) { return false; }
}

async function main() {
  if (fresh() && !process.argv.includes("--ya")) { console.log("momento: el de hace menos de una hora sigue valiendo"); return; }
  const res = await fetch(GT + "trending_pools?include=base_token&duration=1h&page=1", { headers: { accept: "application/json" }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error("GeckoTerminal " + res.status);
  const list = candidates(await res.json()).slice(0, TRIES);
  for (const c of list) {
    const t0 = Date.now();
    try {
      const client = createClient({ rpcUrl: RPC, signal: AbortSignal.timeout(240000) });
      const m = await connectionMap(client, c.mint, { createdAt: c.created || undefined, max: MAX_HOLDERS });
      const out = shape(m, { at: Date.now(), rank: c.rank, sym: c.sym, name: c.name, img: c.img }, knownWallet);
      fs.mkdirSync(path.dirname(OUT), { recursive: true });
      fs.writeFileSync(OUT, JSON.stringify(out));
      console.log("momento: $" + c.sym + " (#" + c.rank + ") · " + out.holders.length + " holders · " + out.groups.length + " grupos · " + Math.round((Date.now() - t0) / 1000) + " s");
      return;
    } catch (e) {
      console.log("::notice::momento: $" + c.sym + " no se pudo mapear (" + (e && e.message || e) + "), pruebo con el siguiente");
    }
  }
  console.log("::warning::momento: ningún token de la tendencia se pudo mapear; se queda el anterior");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.log("::warning::momento: " + (e && e.message || e)); });
}
