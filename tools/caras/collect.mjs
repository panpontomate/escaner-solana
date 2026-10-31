// Recolector de "caras conocidas". Lo ejecuta GitHub Actions cada 30 minutos (.github/workflows/caras.yml):
//   1. apunta los tokens nuevos de GeckoTerminal con su creador (RugCheck), quien pagó la creación y quien financió al creador
//   2. a las 24 h mira si despegaron (capitalización en DexScreener) o si RugCheck los marca como rug
//   3. comprueba si las wallets que se repiten son exchanges o plataformas (muchas transacciones por hora) para no marcarlas
//   4. va apuntando en la base de wallets de SolFlag todo lo que ve (quién paga, financia o crea lanzamientos, cuántas
//      transacciones por hora hace cada wallet) y suma los aportes de estudios y pruebas (tools/caras/aportes)
//   5. registro de tokens: analiza con el motor (como la web) hasta REG_MAX tokens nuevos y apunta cómo acabaron a las
//      24 h y a los 7 días (datos/registro, ver registro.mjs)
//   6. escribe caras.json y datos/base.json + datos/exchanges.json (lo que lee la web; van en la rama "datos") y tools/caras/estado.json (lo que
//      recuerda entre ejecuciones; no va en git, lo guardan Cloudflare KV y la caché de Actions, ver nube.mjs)
//
// Uso: node tools/caras/collect.mjs            (RPC en la variable SOLANA_RPC; si no, uno público)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DAY, INFRA_PER_HOUR, emptyState, addToken, resolveToken, onCurve, buildList, prune, needInfraCheck, perHour } from "./lib.mjs";
import { emptyBase, observe, mergeAporte, pruneBase, publishBase } from "./base.mjs";
import { regEntry, regDue, regResolve, regRecheck, regPrune, regPublish, daySummary, mergeDay } from "./registro.mjs";
import { createClient, analyzeToken } from "solana-risk-engine";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STATE = path.join(HERE, "estado.json");
// lo publicado (caras.json y datos/) vive en la rama "datos", que el workflow saca en PUB_DIR; en local, la raíz del repo
const PUB = process.env.PUB_DIR ? path.resolve(process.env.PUB_DIR) : path.join(HERE, "..", "..");
const OUT = path.join(PUB, "caras.json");
const DATOS = path.join(PUB, "datos");
const APORTES = path.join(HERE, "aportes");
const RPC = process.env.SOLANA_RPC || "https://solana-rpc.publicnode.com";
const MAX_NEW = +process.env.CARAS_MAX_NEW || 120;      // tokens nuevos por ejecución
const MAX_INFRA = 40;                                    // comprobaciones de actividad por ejecución
const REG_MAX = +process.env.REG_MAX || 40;              // tokens nuevos analizados con el motor por ejecución
const REG = path.join(DATOS, "registro");
const QUOTES = ["So11111111111111111111111111111111111111112", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = Date.now();

async function rpc(method, params) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
      if (r.status === 429) { await sleep(1500 * (i + 1)); continue; }
      const j = await r.json();
      if (j.error) throw new Error(j.error.message);
      return j.result;
    } catch (e) { if (i === 3) throw e; await sleep(800 * (i + 1)); }
  }
  return null;
}
async function getJson(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { accept: "application/json" } });
      if (r.status === 429) { await sleep(4000 * (i + 1)); continue; }
      return r.ok ? await r.json() : null;
    } catch (e) { await sleep(1500); }
  }
  return null;
}
// Firmantes de la primera transacción de una dirección; null si tiene más de 3000 (no se puede saber barato)
async function firstSigners(addr) {
  let before = null;
  for (let i = 0; i < 3; i++) {
    const page = await rpc("getSignaturesForAddress", [addr, before ? { limit: 1000, before } : { limit: 1000 }]);
    if (!page || !page.length) return null;
    if (page.length < 1000) {
      const tx = await rpc("getTransaction", [page[page.length - 1].signature, { maxSupportedTransactionVersion: 1, encoding: "jsonParsed", commitment: "confirmed" }]);
      const keys = tx && tx.transaction && tx.transaction.message.accountKeys;
      return keys ? keys.filter((k) => k.signer).map((k) => k.pubkey) : null;
    }
    before = page[page.length - 1].signature;
  }
  return null;
}

// la primera vez (caché vacía) arranca con los tokens del estudio del 28/10
const SEED = path.join(HERE, "semilla.json");
const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : fs.existsSync(SEED) ? JSON.parse(fs.readFileSync(SEED, "utf8")) : emptyState();
prune(state, now);
// tokens ya vistos (2 días) para no apuntar dos veces uno que ya se resolvió
state.seen = state.seen || {};
Object.keys(state.seen).forEach((m) => { if (now - state.seen[m] > 2 * DAY) delete state.seen[m]; });
const log = { nuevos: 0, resueltos: 0, infra: 0, errores: 0, aportes: 0, registro: 0, regResueltos: 0 };
// base de wallets: vive en el mismo estado; los aportes nuevos se suman una vez
state.base = state.base || emptyBase();
if (fs.existsSync(APORTES)) {
  fs.readdirSync(APORTES).filter((f) => f.endsWith(".json")).sort().forEach((f) => {
    try { log.aportes += mergeAporte(state.base, f, JSON.parse(fs.readFileSync(path.join(APORTES, f), "utf8")), now); }
    catch (e) { log.errores++; }
  });
}
pruneBase(state.base, now);
state.reg = regPrune(state.reg || {}, now);
state.regPub = state.regPub || {};
// caras ya marcadas antes de esta ejecución: para apuntar si un token nuevo lo lanzó una
const knownFaces = buildList(state, now).faces;
const faceOf = (t) => ["payer", "funder", "creator"].map((k) => knownFaces[t[k]] && knownFaces[t[k]].lvl)
  .reduce((w, l) => (l === "bad" || w === "bad" ? "bad" : l || w), null);

// 1. tokens nuevos
const fresh = [];
for (let p = 1; p <= 5 && fresh.length < MAX_NEW; p++) {
  const d = await getJson("https://api.geckoterminal.com/api/v2/networks/solana/new_pools?page=" + p);
  if (!d || !d.data) break;
  d.data.forEach((pool) => {
    const id = pool.relationships && pool.relationships.base_token && pool.relationships.base_token.data.id;
    const mint = id && id.replace(/^solana_/, "");
    if (!mint || QUOTES.includes(mint) || state.tokens[mint] || state.seen[mint] || fresh.some((f) => f.mint === mint)) return;
    fresh.push({ mint, t: Date.parse(pool.attributes.pool_created_at) || now, dex: pool.relationships.dex && pool.relationships.dex.data.id,
      liq: Math.round(parseFloat(pool.attributes.reserve_in_usd)) || undefined });
  });
  await sleep(2500);   // GeckoTerminal: 30 peticiones por minuto
}
for (const f of fresh.slice(0, MAX_NEW)) {
  const t = { t: f.t, seen: now, dex: f.dex, liq: f.liq };
  try {
    const rc = await getJson("https://api.rugcheck.xyz/v1/tokens/" + f.mint + "/report");
    await sleep(600);
    if (rc) { t.creator = rc.creator || undefined; t.rug = !!rc.rugged; t.plat = (rc.launchpad && rc.launchpad.platform) || rc.deployPlatform || undefined; }
    const ms = await firstSigners(f.mint);                  // quien pagó la creación del token
    if (ms && ms[0]) t.payer = ms[0];
    if (t.creator) {
      const cs = await firstSigners(t.creator);             // quien pagó la primera transacción del creador
      if (cs && cs[0] && cs[0] !== t.creator && cs[0] !== t.payer) t.funder = cs[0];
    }
  } catch (e) { log.errores++; }
  addToken(state, f.mint, t); state.seen[f.mint] = now; log.nuevos++;
  if (log.registro < REG_MAX) {
    let r = null;
    try {
      // cada token con su propio límite de tiempo: uno que se atasque no se come la ejecución
      r = await analyzeToken(createClient({ rpcUrl: RPC, signal: AbortSignal.timeout(45000) }), f.mint);
    } catch (e) { log.errores++; }
    state.reg[f.mint] = regEntry(f.mint, Object.assign({ plat: t.plat, dex: f.dex }, t), r, Date.now(), faceOf(t));
    if (state.reg[f.mint].liq) t.liq = state.reg[f.mint].liq;   // la liquidez del análisis, si la hay, es la buena
    log.registro++;
  }
  if (t.payer) observe(state.base, { addr: t.payer, role: "payer", token: f.mint, at: f.t }, now);
  if (t.funder) observe(state.base, { addr: t.funder, role: "funder", token: f.mint, at: f.t }, now);
  if (t.creator && t.creator !== t.payer) observe(state.base, { addr: t.creator, role: "creator", token: f.mint, at: f.t }, now);
}

// 2. resultado a las 24 h (DexScreener acepta 30 tokens por petición)
const due = Object.keys(state.tokens).filter((m) => now - state.tokens[m].t > DAY);
for (let i = 0; i < due.length; i += 30) {
  const part = due.slice(i, i + 30);
  const pairs = await getJson("https://api.dexscreener.com/tokens/v1/solana/" + part.join(","));
  if (!Array.isArray(pairs)) continue;                     // fallo de red: se reintenta en la siguiente ejecución
  part.forEach((m) => {
    const ps = pairs.filter((p) => p.baseToken && p.baseToken.address === m);
    resolveToken(state, m, ps.reduce((s, p) => Math.max(s, p.marketCap || p.fdv || 0), 0),
      ps.reduce((s, p) => Math.max(s, (p.liquidity && p.liquidity.usd) || 0), 0), onCurve(ps));
    log.resueltos++;
  });
  await sleep(400);
}
// resultados del registro: a las 24 h y a los 7 días
const regDueNow = regDue(state.reg, now);
for (const stage of ["h24", "d7"]) {
  const list = regDueNow[stage];
  for (let i = 0; i < list.length; i += 30) {
    const part = list.slice(i, i + 30);
    const pairs = await getJson("https://api.dexscreener.com/tokens/v1/solana/" + part.join(","));
    if (!Array.isArray(pairs)) continue;                   // fallo de red: en la siguiente
    part.forEach((m) => {
      regResolve(state.reg[m], stage, pairs.filter((p) => p.baseToken && p.baseToken.address === m));
      log.regResueltos++;
    });
    await sleep(400);
  }
}

// los resultados ya guardados se vuelven a juzgar, por si cambió la regla de «muerto»
Object.keys(state.reg).forEach((m) => { regRecheck(state.reg[m], "h24"); regRecheck(state.reg[m], "d7"); });

// 3. exchanges y plataformas
for (const a of needInfraCheck(state).slice(0, MAX_INFRA)) {
  try {
    const sigs = await rpc("getSignaturesForAddress", [a, { limit: 1000 }]);
    const ph = perHour(sigs);
    state.infra[a] = { at: now, ph: Math.round(ph), infra: ph > INFRA_PER_HOUR };
    observe(state.base, { addr: a, ph: ph }, now);
    log.infra++;
  } catch (e) { log.errores++; }
}

// 4. guardar (at: cuándo se guardó, para elegir la copia más nueva entre la caché y Cloudflare, ver nube.mjs)
state.at = Date.now();
fs.writeFileSync(STATE, JSON.stringify(state));
const list = buildList(state, now);
// solo se reescribe si cambia algo, para no hacer un commit cada 30 minutos sin novedades
const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
if (JSON.stringify([prev.faces, prev.mints]) !== JSON.stringify([list.faces, list.mints])) fs.writeFileSync(OUT, JSON.stringify(list));
// base de wallets publicada: igual, solo si cambia lo que se sabe (no la fecha)
const pub = publishBase(state.base, now);
if (!fs.existsSync(DATOS)) fs.mkdirSync(DATOS);
[["base.json", pub.base, "wallets"], ["exchanges.json", pub.exchanges, "exchanges"]].forEach(([f, data, key]) => {
  const fp = path.join(DATOS, f), old = fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp, "utf8")) : {};
  if (JSON.stringify(old[key]) !== JSON.stringify(data[key])) fs.writeFileSync(fp, JSON.stringify(data));
});
// registro: un archivo por día de lanzamiento (dos veces: con 24 h y final) y un índice con el resumen de cada día
const ready = regPublish(state.reg, state.regPub, now);
if (ready.length) {
  if (!fs.existsSync(REG)) fs.mkdirSync(REG, { recursive: true });
  const ip = path.join(REG, "indice.json");
  const index = fs.existsSync(ip) ? JSON.parse(fs.readFileSync(ip, "utf8")) : { v: 1, days: {} };
  ready.forEach(({ day, final, entries }) => {
    const fp = path.join(REG, day + ".json");
    const file = mergeDay(fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp, "utf8")) : null, day, entries, now);
    file.final = final;
    fs.writeFileSync(fp, JSON.stringify(file));
    index.days[day] = Object.assign(daySummary(file.tokens), { final: final });
  });
  index.updated = now;
  fs.writeFileSync(ip, JSON.stringify(index));
  fs.writeFileSync(STATE, JSON.stringify(state));
  log.diasPublicados = ready.map((x) => x.day + (x.final ? " final" : " 24h")).join(", ");
}
log.pendientesRegistro = Object.keys(state.reg).length;
log.base = Object.keys(state.base.wallets).length; log.conocidas = Object.keys(pub.base.wallets).length; log.exchanges = Object.keys(pub.exchanges.exchanges).length;
console.log(JSON.stringify(Object.assign(log, { tokens: Object.keys(state.tokens).length, seguidas: Object.keys(state.faces).length, caras: Object.keys(list.faces).length, marcados: Object.keys(list.mints).length })));
