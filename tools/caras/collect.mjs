// Recolector de "caras conocidas". Lo ejecuta GitHub Actions cada 30 minutos (.github/workflows/caras.yml):
//   1. apunta los tokens nuevos de GeckoTerminal con su creador (RugCheck), quien pagó la creación y quien financió al creador
//   2. a las 24 h mira si despegaron (capitalización en DexScreener) o si RugCheck los marca como rug
//   3. comprueba si las wallets que se repiten son exchanges o plataformas (muchas transacciones por hora) para no marcarlas
//   4. va apuntando en la base de wallets de SolFlag todo lo que ve (quién paga, financia o crea lanzamientos, cuántas
//      transacciones por hora hace cada wallet) y suma los aportes de estudios y pruebas (tools/caras/aportes)
//   5. registro de tokens: analiza con el motor (como la web) hasta REG_MAX tokens nuevos y apunta cómo acabaron a las
//      24 h y a los 7 días (datos/registro, ver registro.mjs)
//   5b. tokens que la gente escaneó en la web (tabla pedidos de D1): quién está detrás, por su propio camino
//   6. escribe caras.json y datos/base.json + datos/exchanges.json (lo que lee la web; van en la rama "datos") y tools/caras/estado.json (lo que
//      recuerda entre ejecuciones; no va en git, lo guardan Cloudflare KV y la caché de Actions, ver nube.mjs)
//
// Uso: node tools/caras/collect.mjs            (RPC en la variable SOLANA_RPC; si no, uno público)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DAY, oldToken, INFRA_PER_HOUR, rcWatch, emptyState, addToken, addRolesLate, pumpCreator, platFromDex, resolveToken, onCurve, buildList, prune, needInfraCheck, perHour } from "./lib.mjs";
import { emptyBase, observe, classify, mergeAporte, pruneBase, publishBase, equipos, EQ_MIN } from "./base.mjs";
import { regEntry, regDue, regResolve, regRecheck, regRejudge, regPrune, regPublish, regFill, regMissing, dayOf, daySummary, mergeDay } from "./registro.mjs";
import { createClient, analyzeToken } from "solana-risk-engine";
import { emptyQueue, queueLaunch, queueBuyers, buyerCandidates, trimQueue, d1Config, flush, pedidosPendientes, marcarPedidos, pedidoLaunch, PEDIDOS_MAX, fromHelius, HELIUS_LIMIT, sinPagador } from "./plano.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STATE = path.join(HERE, "estado.json");
// lo publicado (caras.json y datos/) vive en la rama "datos", que el workflow saca en PUB_DIR; en local, la raíz del repo
const PUB = process.env.PUB_DIR ? path.resolve(process.env.PUB_DIR) : path.join(HERE, "..", "..");
const OUT = path.join(PUB, "caras.json");
const DATOS = path.join(PUB, "datos");
const APORTES = path.join(HERE, "aportes");
// version of the engine, pinned exactly in package.json: written in each registry entry
const ENGINE_V = JSON.parse(fs.readFileSync(path.join(HERE, "package.json"), "utf8")).dependencies["solana-risk-engine"];
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
// lastFail: por qué falló la última petición (código HTTP, "tiempo" o "red"), para contar los motivos
let lastFail = null;
async function getJson(url) {
  lastFail = null;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(15000) });
      if (r.status === 429) { lastFail = 429; await sleep(4000 * (i + 1)); continue; }
      // error del servidor: también se reintenta (antes se daba por perdido a la primera, el 31/10 con RugCheck)
      if (r.status >= 500) { lastFail = r.status; await sleep(1500 * (i + 1)); continue; }
      if (!r.ok) { lastFail = r.status; return null; }
      return await r.json();
    } catch (e) { lastFail = e && e.name === "TimeoutError" ? "tiempo" : "red"; await sleep(1500); }
  }
  return null;
}
// RugCheck: si se cae (RC_BREAK fallos seguidos de servidor) se deja de llamar en esta ejecución (cada fallo cuesta hasta ~45 s)
// y lo que falte se pide en las siguientes (state.rcQ)
const RUGCHECK = "https://api.rugcheck.xyz/v1/tokens/";
const RC_BREAK = 5, RC_TRIES = 6, RC_RETRY = +process.env.RC_RETRY || 60;   // 150 hizo durar 19 min una ejecución (2/11)
let rcStreak = 0;
async function rugcheck(mint, log) {
  if (rcStreak >= RC_BREAK) { (log.rcMotivos = log.rcMotivos || {}).cortado = (log.rcMotivos.cortado || 0) + 1; return null; }
  const rc = await getJson(RUGCHECK + mint + "/report");
  await sleep(600);
  // un 4xx (p. ej. 400 «unable to generate report» en tokens de pocos minutos) es que aún no tiene el token, no que
  // esté caído: no cuenta para cortar. Solo cuentan 429, 5xx, tiempo agotado y red
  const down = !lastFail || lastFail === 429 || typeof lastFail === "string" || lastFail >= 500;
  if (rc || !down) rcStreak = 0; else { rcStreak++; log.rcCaido = (log.rcCaido || 0) + 1; }
  if (rc) return rc;
  const k = String(lastFail || "vacío");
  (log.rcMotivos = log.rcMotivos || {})[k] = (log.rcMotivos[k] || 0) + 1;
  return null;
}
const rcInfo = (rc) => ({ creator: rc.creator || undefined, rug: !!rc.rugged, plat: (rc.launchpad && rc.launchpad.platform) || rc.deployPlatform || undefined });
async function signersOf(sig) {
  const tx = await rpc("getTransaction", [sig, { maxSupportedTransactionVersion: 1, encoding: "jsonParsed", commitment: "confirmed" }]);
  const keys = tx && tx.transaction && tx.transaction.message.accountKeys;
  return keys ? keys.filter((k) => k.signer).map((k) => k.pubkey) : null;
}
// Firmantes de la primera transacción de una dirección y la página de firmas más antigua (la que trae la creación);
// null si tiene más de 3000 (no se puede saber barato)
async function earliest(addr) {
  let before = null;
  for (let i = 0; i < 3; i++) {
    const page = await rpc("getSignaturesForAddress", [addr, before ? { limit: 1000, before } : { limit: 1000 }]);
    if (!page || !page.length) return null;
    if (page.length < 1000) {
      const tx = await rpc("getTransaction", [page[page.length - 1].signature, { maxSupportedTransactionVersion: 1, encoding: "jsonParsed", commitment: "confirmed" }]);
      const keys = tx && tx.transaction && tx.transaction.message.accountKeys;
      return { signers: keys ? keys.filter((k) => k.signer).map((k) => k.pubkey) : null, page, tx };
    }
    before = page[page.length - 1].signature;
  }
  return null;
}
// Si el RPC es Helius y earliest() se rinde (más de 3000 firmas), una llamada a getTransactionsForAddress con las más
// antiguas primero (10 créditos por cada 100 tx). Con tope por ejecución: el plan gratuito da 1 M de créditos al mes
// y el recolector ya gasta ~500 k (11/11/2026). HELIUS_MAX llamadas por ejecución, como mucho
const HELIUS = /helius/i.test(RPC), HELIUS_MAX = +process.env.HELIUS_MAX || 20;
let heliusCalls = 0;
async function heliusEarliest(addr) {
  if (!HELIUS || heliusCalls >= HELIUS_MAX) return null;
  heliusCalls++;
  const res = await rpc("getTransactionsForAddress", [addr, { transactionDetails: "full", sortOrder: "asc", limit: HELIUS_LIMIT,
    encoding: "jsonParsed", maxSupportedTransactionVersion: 1, filters: { status: "any" } }]);
  return fromHelius(res);
}
async function earliestDeep(addr) { return (await earliest(addr)) || (await heliusEarliest(addr)); }
async function firstSigners(addr) { const e = await earliestDeep(addr); return e && e.signers; }
// firmantes de un comprador: de lo que ya trajo Helius o, si no, una petición
async function buyerSigners(me, sig) { return (me.txs && me.txs[sig]) || (await signersOf(sig)); }

// la primera vez (caché vacía) arranca con los tokens del estudio del 28/10
const SEED = path.join(HERE, "semilla.json");
const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : fs.existsSync(SEED) ? JSON.parse(fs.readFileSync(SEED, "utf8")) : emptyState();
prune(state, now);
// tokens ya vistos (2 días) para no apuntar dos veces uno que ya se resolvió
state.seen = state.seen || {};
Object.keys(state.seen).forEach((m) => { if (now - state.seen[m] > 2 * DAY) delete state.seen[m]; });
// Compras en los primeros bloques: cuentan como «sniper» en la base (una vez por token y wallet; con 3 o más
// lanzamientos, classify() la marca como sniper y el motor la reconoce entre las ballenas). Antes del 14/11
// solo se guardaban en D1 y la base no tenía ningún sniper
function sniperSeen(m, buyers, at) {
  buyers.forEach(function (b) {
    const w = state.base.wallets[b.w];
    if (w && w.tokens.indexOf(m) >= 0) return;
    observe(state.base, { addr: b.w, role: "sniper", token: m, at: at || now }, now);
  });
}
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
// Grupos de wallets conectadas (base.mjs, desde el estudio del 14/11). Un lanzamiento en el que paga, crea o financia
// una wallet de un grupo pasa a contar para el grupo, y las otras wallets de detrás entran en él. Ni exchanges ni
// granjas (pagan la creación de tokens de mucha gente, como un servicio): meterían en el grupo a creadores sin relación.
// Si el grupo ya tiene EQ_MIN lanzamientos, el token se analiza y se le buscan los primeros compradores aunque esta
// ejecución ya haya llegado a REG_MAX (como mucho EQ_EXTRA de más)
const EQ = equipos(state.base), EQ_EXTRA = 10;
const sinGrupo = (w) => { const c = classify(w); return c === "exchange" || c === "granja"; };
const eqDe = (a) => { const w = a && state.base.wallets[a]; return w && w.eq && !sinGrupo(w) ? w.eq : null; };
const eqFuerte = (a) => { const e = eqDe(a); return e && EQ[e] && EQ[e].n >= EQ_MIN ? e : null; };
state.reg = regPrune(state.reg || {}, now);
state.regPub = state.regPub || {};
// plano del dinero (plano.mjs): enlaces de cada lanzamiento pendientes de subir a Cloudflare D1
const D1 = d1Config();
state.planoQ = D1 ? state.planoQ || emptyQueue() : undefined;
// caras ya marcadas antes de esta ejecución: para apuntar si un token nuevo lo lanzó una
const knownFaces = buildList(state, now).faces;
const faceOf = (t) => ["payer", "funder", "creator"].map((k) => knownFaces[t[k]] && knownFaces[t[k]].lvl)
  .reduce((w, l) => (l === "bad" || w === "bad" ? "bad" : l || w), null);

// RugCheck pendiente: tokens que se apuntaron sin su respuesta. La primera vez entran también los del 31/10/2026,
// cuando RugCheck estuvo caído de 01 a 15 h UTC sin que el recolector lo marcara
state.rcQ = state.rcQ || {};
if (!state.rcSeed) {
  regMissing(state.reg, "2026-10-31").forEach((m) => { state.rcQ[m] = { n: 0 }; });
  state.rcSeed = 1;
}

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
  let nrc = false, prio = false;
  const extra = () => log.registro >= REG_MAX && (log.grupoExtra || 0) < EQ_EXTRA;
  try {
    const rc = await rugcheck(f.mint, log);
    // sin respuesta: se apunta igual (nrc) y se vuelve a pedir en las siguientes ejecuciones
    if (!rc) { nrc = true; log.sinRugCheck = (log.sinRugCheck || 0) + 1; state.rcQ[f.mint] = { n: 0 }; }
    if (rc) { const i = rcInfo(rc); t.creator = i.creator; t.rug = i.rug; t.plat = i.plat; }
    const me = await earliestDeep(f.mint);                  // quien pagó la creación del token (Helius si hay > 3000 firmas)
    // un token viejo que estrena pool no es un lanzamiento: fuera del registro, de las 24 h y de quién está detrás
    if (oldToken(f.t, rc && rc.detectedAt, me && me.page)) {
      state.seen[f.mint] = now; delete state.rcQ[f.mint]; log.viejos = (log.viejos || 0) + 1;
      if (log.sinRugCheck && !rc) log.sinRugCheck--;
      continue;
    }
    if (me && me.signers && me.signers[0]) t.payer = me.signers[0];
    // creador y lanzador leídos de la cadena cuando RugCheck no los da (caído, o el token es de hace minutos)
    if (!t.creator) { const c = pumpCreator(me && me.tx, f.mint); if (c) { t.creator = c; log.creadorCadena = (log.creadorCadena || 0) + 1; } }
    if (!t.plat || t.plat === "unknown") t.plat = platFromDex(f.dex) || t.plat;
    if (extra() && (eqFuerte(t.payer) || eqFuerte(t.creator))) prio = true;
    // compradores de los primeros bloques, solo en los que se analizan (cada uno es una petición más)
    if (D1 && me && (log.registro < REG_MAX || prio)) {
      const buyers = [];
      for (const b of buyerCandidates(me.page)) {
        try { const s = await buyerSigners(me, b.sig); if (s && s[0]) buyers.push({ w: s[0], d: b.d, sig: b.sig }); } catch (e) { log.errores++; }
      }
      queueBuyers(state.planoQ, f.mint, buyers);
      sniperSeen(f.mint, buyers, f.t);
      log.compras = (log.compras || 0) + buyers.length;
    }
    if (t.creator) {
      const cs = await firstSigners(t.creator);             // quien pagó la primera transacción del creador
      if (cs && cs[0] && cs[0] !== t.creator && cs[0] !== t.payer) t.funder = cs[0];
    }
    if (!prio && extra() && eqFuerte(t.funder)) prio = true;
  } catch (e) { log.errores++; }
  const detras = [t.payer, t.creator, t.funder].filter(Boolean), eqT = detras.map(eqDe).find(Boolean);
  if (eqT) {
    detras.forEach((a) => { if (!sinGrupo(state.base.wallets[a])) observe(state.base, { addr: a, eq: eqT, token: f.mint, at: f.t }, now); });
    log.grupo = (log.grupo || 0) + 1;
  }
  addToken(state, f.mint, t); state.seen[f.mint] = now; log.nuevos++;
  if (prio) log.grupoExtra = (log.grupoExtra || 0) + 1;
  if (log.registro < REG_MAX || prio) {
    let r = null;
    try {
      // cada token con su propio límite de tiempo: uno que se atasque no se come la ejecución
      r = await analyzeToken(createClient({ rpcUrl: RPC, signal: AbortSignal.timeout(45000) }), f.mint);
    } catch (e) { log.errores++; }
    state.reg[f.mint] = regEntry(f.mint, Object.assign({ plat: t.plat, dex: f.dex, nrc: nrc }, t), r, Date.now(), faceOf(t), ENGINE_V);
    if (state.reg[f.mint].liq) t.liq = state.reg[f.mint].liq;   // la liquidez del análisis, si la hay, es la buena
    log.registro++;
  }
  if (D1) queueLaunch(state.planoQ, { m: f.mint, t: f.t, plat: t.plat, dex: f.dex, py: t.payer, cr: t.creator, fu: t.funder, liq: t.liq,
    lvl: state.reg[f.mint] && state.reg[f.mint].l, cara: faceOf(t) || undefined });
  if (t.payer) observe(state.base, { addr: t.payer, role: "payer", token: f.mint, at: f.t }, now);
  if (t.funder) observe(state.base, { addr: t.funder, role: "funder", token: f.mint, at: f.t }, now);
  if (t.creator && t.creator !== t.payer) observe(state.base, { addr: t.creator, role: "creator", token: f.mint, at: f.t }, now);
  else if (t.creator) observe(state.base, { addr: t.creator, role: "own", at: f.t }, now);
}

// 1b. RugCheck otra vez para los que se quedaron sin respuesta: se completan creador, lanzador, financiador y rug
// en el registro (sin tocar el nivel), las caras, la base de wallets y el plano. Cada uno se intenta RC_TRIES veces
const recovered = {};                                      // día -> entradas del registro completadas
for (const m of Object.keys(state.rcQ).slice(0, RC_RETRY)) {
  if (rcStreak >= RC_BREAK) break;                         // sigue caído: en la siguiente ejecución
  const q = state.rcQ[m], pend = state.tokens[m], e = state.reg[m];
  if (!pend && !e) { delete state.rcQ[m]; continue; }      // ya no queda dónde apuntarlo
  const rc = await rugcheck(m, log);
  if (!rc) { if (++q.n >= RC_TRIES) { delete state.rcQ[m]; log.rcPerdidos = (log.rcPerdidos || 0) + 1; } continue; }
  delete state.rcQ[m];
  // RugCheck llega tarde y dice que el token es viejo: se quita de lo pendiente (lo ya publicado lo arregla la limpieza)
  if (oldToken((pend && pend.t) || (e && e.t) || now, rc.detectedAt, null)) {
    delete state.tokens[m]; delete state.reg[m];
    log.viejosTarde = (log.viejosTarde || 0) + 1; continue;
  }
  const info = rcInfo(rc), payer = (pend && pend.payer) || (e && e.py);
  try {
    if (info.creator) {
      const cs = await firstSigners(info.creator);
      if (cs && cs[0] && cs[0] !== info.creator && cs[0] !== payer) info.funder = cs[0];
    }
  } catch (err) { log.errores++; }
  if (pend) { if (info.plat && !pend.plat) pend.plat = info.plat; if (info.rug) pend.rug = true; }
  const at = (pend && pend.t) || (e && e.t) || now;
  addRolesLate(state, m, { creator: info.creator, funder: info.funder }, { payer: payer }, !pend && e && e.h24 ? { dead: !!e.h24.dead, t: at } : null);
  if (e && regFill(e, info)) (recovered[dayOf(e.t)] = recovered[dayOf(e.t)] || []).push(e);
  if (info.funder) observe(state.base, { addr: info.funder, role: "funder", token: m, at: at }, now);
  if (info.creator && info.creator !== payer) observe(state.base, { addr: info.creator, role: "creator", token: m, at: at }, now);
  else if (info.creator) observe(state.base, { addr: info.creator, role: "own", at: at }, now);
  if (D1) queueLaunch(state.planoQ, { m: m, t: at, plat: info.plat, cr: info.creator, fu: info.funder });
  log.rcRecuperados = (log.rcRecuperados || 0) + 1;
}
log.rcPendientes = Object.keys(state.rcQ).length;
if (process.env.GITHUB_ACTIONS && (log.rcRecuperados || log.rcPendientes))
  console.log("::notice::RugCheck: " + (log.rcRecuperados || 0) + " tokens completados más tarde, " + log.rcPendientes + " pendientes");

// 2. resultado a las 24 h (DexScreener acepta 30 tokens por petición)
const due = Object.keys(state.tokens).filter((m) => now - state.tokens[m].t > DAY);
for (let i = 0; i < due.length; i += 30) {
  const part = due.slice(i, i + 30);
  const pairs = await getJson("https://api.dexscreener.com/tokens/v1/solana/" + part.join(","));
  if (!Array.isArray(pairs)) continue;                     // fallo de red: se reintenta en la siguiente ejecución
  part.forEach((m) => {
    const ps = pairs.filter((p) => p.baseToken && p.baseToken.address === m), t = state.tokens[m];
    const mc = ps.reduce((s, p) => Math.max(s, p.marketCap || p.fdv || 0), 0);
    const dead = resolveToken(state, m, mc, ps.reduce((s, p) => Math.max(s, (p.liquidity && p.liquidity.usd) || 0), 0), onCurve(ps));
    // la fila entera otra vez: así también entran los que ya estaban pendientes antes de existir el plano
    if (D1 && t && dead !== undefined) queueLaunch(state.planoQ, { m, t: t.t, plat: t.plat, dex: t.dex, py: t.payer, cr: t.creator, fu: t.funder,
      liq: t.liq, dead24: dead, mc24: Math.round(mc) });
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

// RugCheck caído: aviso visible en la ejecución y, tras varias seguidas, por Telegram (y otro cuando vuelve)
if (log.sinRugCheck && process.env.GITHUB_ACTIONS) console.log((log.rcCaido ? "::warning::" : "::notice::") + "RugCheck no respondió en " + log.sinRugCheck + " de " + log.nuevos + " tokens nuevos (motivos: " + JSON.stringify(log.rcMotivos || {}) + "); se vuelven a pedir en las siguientes ejecuciones");
{
  // solo las caídas de verdad (no los 400 de tokens que RugCheck aún no tiene) cuentan para el aviso por Telegram
  const w = rcWatch(state.rcDown, log.nuevos, log.rcCaido || 0);
  state.rcDown = w.down;
  const TG = process.env.AVISO_TELEGRAM_TOKEN, CHAT = process.env.AVISO_TELEGRAM_CHAT;
  if (w.msg && TG && CHAT) {
    try { await fetch("https://api.telegram.org/bot" + TG + "/sendMessage", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: CHAT, text: w.msg }) }); }
    catch (e) { log.errores++; }
  }
}

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

// 5b. tokens escaneados en la web (tabla pedidos, la llena la API): quién pagó, creó y financió, y los primeros
// compradores, a lanz. No entran en state.tokens ni en el registro: se miran tarde, así que su nivel y su resultado a
// 24 h no serían los del lanzamiento y falsearían el acierto. En tokens con más de 3000 firmas, earliest() no llega a
// la creación: solo queda el creador (RugCheck) y, si se puede, quien lo financió
const PED_MAX = +process.env.PEDIDOS_MAX || PEDIDOS_MAX;
const pedidosOk = [];
if (D1 && PED_MAX > 0) {
  let ms = [];
  try { ms = await pedidosPendientes(D1, PED_MAX); } catch (e) { log.pedidos = "D1 falló al leer"; }
  let guardados = 0;
  for (const m of ms) {
    const info = {};
    try {
      // la API acepta cualquier dirección: solo se sigue si de verdad es un token
      const acc = await rpc("getAccountInfo", [m, { encoding: "jsonParsed" }]);
      const isMint = !!(acc && acc.value && acc.value.data && acc.value.data.parsed && acc.value.data.parsed.type === "mint");
      if (!isMint) { if (acc) pedidosOk.push(m); continue; }   // sin respuesta del RPC: se reintenta en la siguiente
      const rc = await rugcheck(m, log);
      if (rc) { const i = rcInfo(rc); info.creator = i.creator; info.plat = i.plat; }
      const me = await earliestDeep(m);
      if (me && me.page && me.page.length && me.page[me.page.length - 1].blockTime) info.t = me.page[me.page.length - 1].blockTime * 1000;
      if (me && me.signers && me.signers[0]) info.payer = me.signers[0];
      if (!info.creator) { const c = pumpCreator(me && me.tx, m); if (c) info.creator = c; }
      if (me) {
        const buyers = [];
        for (const b of buyerCandidates(me.page)) {
          try { const s = await buyerSigners(me, b.sig); if (s && s[0]) buyers.push({ w: s[0], d: b.d, sig: b.sig }); } catch (e) { log.errores++; }
        }
        queueBuyers(state.planoQ, m, buyers);
        sniperSeen(m, buyers, info.t);
      }
      if (info.creator) {
        const cs = await firstSigners(info.creator);
        if (cs && cs[0] && cs[0] !== info.creator && cs[0] !== info.payer) info.funder = cs[0];
      }
      // sin creador ni pagador y RugCheck caído: se deja pendiente para la siguiente
      if (!info.creator && !info.payer && rcStreak > 0) continue;
      if (info.creator || info.payer) { queueLaunch(state.planoQ, pedidoLaunch(m, info)); guardados++; }
      pedidosOk.push(m);
    } catch (e) { log.errores++; }
  }
  if (ms.length) log.pedidos = guardados + " de " + ms.length + " tokens pedidos";
}

// 5c. fichas antiguas sin pagador (más de 3000 firmas cuando las vimos): con lo que sobre del tope de Helius, unas
// pocas por ejecución. Solo se completa quién pagó, quién financió y los primeros compradores (nunca la fecha, el nivel
// ni las 24 h). state.heliusHechos recuerda las intentadas para no repetirlas
if (D1 && HELIUS) {
  const hh = state.heliusHechos || (state.heliusHechos = {});
  let rows = [];
  try { rows = (await sinPagador(D1, 80)).filter(function (r) { return !hh[r.m]; }); } catch (e) { log.completadas = "D1 falló al leer"; }
  let hechas = 0;
  for (const r of rows) {
    if (heliusCalls + 2 > HELIUS_MAX) break;               // cada ficha: la creación y, si hace falta, el financiador
    hh[r.m] = now;
    try {
      const me = await heliusEarliest(r.m);
      if (!me || !me.signers || !me.signers[0]) continue;
      const row = { m: r.m, py: me.signers[0] };
      const cr = r.cr || pumpCreator(me.tx, r.m);
      if (cr && !r.cr) row.cr = cr;
      const fs = await firstSigners(cr || row.py);
      if (fs && fs[0] && fs[0] !== cr && fs[0] !== row.py) row.fu = fs[0];
      queueLaunch(state.planoQ, row);
      const buyers = [];
      for (const b of buyerCandidates(me.page)) { const w = me.txs[b.sig]; if (w && w[0]) buyers.push({ w: w[0], d: b.d, sig: b.sig }); }
      queueBuyers(state.planoQ, r.m, buyers);
      sniperSeen(r.m, buyers, r.t);
      hechas++;
    } catch (e) { log.errores++; }
  }
  if (hechas) log.completadas = hechas;
}
if (heliusCalls) log.helius = heliusCalls;

// plano del dinero: subir a D1 lo pendiente; si falla, se queda en la cola para la siguiente ejecución
if (D1) {
  try {
    const up = await flush(D1, state.planoQ, now); log.plano = up.lanz + " lanzamientos, " + up.compras + " compras";
    // los pedidos se dan por hechos solo cuando ya están en lanz
    try { await marcarPedidos(D1, pedidosOk, now); } catch (e) { log.pedidos = (log.pedidos || "") + " (no se pudieron marcar, se repiten)"; }
  }
  catch (e) { log.plano = "D1 falló (" + e.message.slice(0, 120) + "), se reintenta"; trimQueue(state.planoQ); }
  // en Actions, como aviso visible en la ejecución (se lee sin iniciar sesión, a diferencia del registro)
  if (process.env.GITHUB_ACTIONS) console.log((log.plano.startsWith("D1") ? "::warning::" : "::notice::") + "Plano del dinero: " + log.plano);
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
// los días ya publicados también se vuelven a juzgar si cambia la regla de «muerto» (solo se reescriben si cambian)
// días ya publicados con tokens que RugCheck completó más tarde: se reescriben con los datos nuevos
// (los que aún no se han publicado los llevarán al publicarse)
Object.keys(recovered).forEach((day) => {
  const fp = path.join(REG, day + ".json");
  if (!fs.existsSync(fp)) return;
  const file = mergeDay(JSON.parse(fs.readFileSync(fp, "utf8")), day, recovered[day], now);
  fs.writeFileSync(fp, JSON.stringify(file));
  log.diasCompletados = (log.diasCompletados ? log.diasCompletados + ", " : "") + day + " (" + recovered[day].length + ")";
});
if (fs.existsSync(REG)) {
  const ip = path.join(REG, "indice.json"), fixed = [];
  const index = fs.existsSync(ip) ? JSON.parse(fs.readFileSync(ip, "utf8")) : { v: 1, days: {} };
  fs.readdirSync(REG).filter((f) => /^\d{4}-\d\d-\d\d\.json$/.test(f)).forEach((f) => {
    const fp = path.join(REG, f), file = JSON.parse(fs.readFileSync(fp, "utf8"));
    // también los días del índice sin el resumen por señal (sig, desde el 6/11/2026): se completan una vez
    if (!regRejudge(file) && index.days[file.day] && index.days[file.day].sig) return;
    fs.writeFileSync(fp, JSON.stringify(file));
    index.days[file.day] = Object.assign(daySummary(file.tokens), { final: !!file.final });
    fixed.push(file.day);
  });
  if (fixed.length) { index.updated = now; fs.writeFileSync(ip, JSON.stringify(index)); log.diasRejuzgados = fixed.join(", "); }
}
log.pendientesRegistro = Object.keys(state.reg).length;
log.base = Object.keys(state.base.wallets).length; log.conocidas = Object.keys(pub.base.wallets).length; log.exchanges = Object.keys(pub.exchanges.exchanges).length;
console.log(JSON.stringify(Object.assign(log, { tokens: Object.keys(state.tokens).length, seguidas: Object.keys(state.faces).length, caras: Object.keys(list.faces).length, marcados: Object.keys(list.mints).length })));
