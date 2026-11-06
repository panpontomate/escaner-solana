// "Caras conocidas": partes sin red del recolector, para poder probarlas.
//
// Una cara es una wallet que está detrás de lanzamientos: quien pagó la creación del token, quien
// financió al creador o el propio creador. Las granjas cambian de creador en cada lanzamiento,
// pero el dinero sale de la misma wallet: así se las reconoce aunque el creador sea nuevo.
//
// Estado entre ejecuciones:
//   tokens: tokens de menos de 24 h esperando resultado { t, seen, payer, funder, creator, rug, liq }
//   faces:  contadores por wallet { n, done, dead, roles: {payer, funder, creator}, last, ex: [{m, t}] }
//   infra:  wallets comprobadas { at, ph (transacciones por hora), infra (exchange o plataforma) }

export const DAY = 86400e3;
export const DEAD_MCAP = 10000;        // igual que CREATOR_DEAD_MCAP del motor
export const PULL_MIN_LIQ = 1000;     // liquidez mínima al verlo para que cuente si se la quitan
export const PULL_DROP = 0.95;        // la liquidez cayó más de esto: le quitaron el pool aunque quede capitalización
export const DRY_LIQ = 1000;          // registro: fuera de la curva y con menos liquidez que esto no se puede vender, aunque
                                       // DexScreener dé una capitalización enorme (LUMI, 31/10: 434 M$ con 0 $ de liquidez)
export const THIN_LIQ = 0.002;        // registro: fuera de la curva y con liquidez por debajo del 0,2 % de la capitalización
                                       // tampoco se puede vender (DAKU, 1/11: 118 M$ con 61 k$; desde el 6/11/2026)
export const RC_FAIL_PCT = 0.5, RC_FAIL_MIN = 10, RC_ALERT_RUNS = 3;   // RugCheck caído: avisar tras 3 ejecuciones seguidas
export const INFRA_PER_HOUR = 300;     // más transacciones por hora: exchange o plataforma, no una persona
export const FUNDER_PER_HOUR = 100;    // quien solo financia creadores: a partir de aquí suele ser un exchange pequeño (estudio de 200 tokens, 28/10)
// casi todo lo nuevo muere (86 % en la muestra del 28/10): el aviso es "lanza en serie y casi nada despega"
// y el rojo, que sube el veredicto, pide 10 lanzamientos sin que despegue ninguno
export const WARN_MIN = 3, WARN_PCT = 0.8, BAD_MIN = 10, BAD_PCT = 0.95;
export const KEEP_DAYS = 30;           // una cara sin lanzamientos en 30 días se olvida
export const SINGLE_DAYS = 3;          // y una que solo salió una vez, a los 3 días
export const ROLES = ["payer", "funder", "creator"];

export function emptyState() { return { tokens: {}, faces: {}, infra: {} }; }

// Nivel de una cara según sus lanzamientos ya resueltos (más de 24 h): mismo criterio que el
// historial del creador del motor
export function faceLevel(done, dead) {
  if (done >= BAD_MIN && dead / done >= BAD_PCT) return "bad";
  if (done >= WARN_MIN && dead / done >= WARN_PCT) return "warn";
  return null;
}

// Le quitaron la liquidez: tenía al menos PULL_MIN_LIQ y le queda menos del 5 %. En la curva de Pump.fun
// no se mira, porque DexScreener da 0 $ de liquidez aunque el token siga vivo
export function isPulled(liq0, liq, curve) {
  return !curve && liq0 >= PULL_MIN_LIQ && (liq || 0) < liq0 * (1 - PULL_DROP);
}

// Todos los pares de DexScreener del token siguen en la curva de Pump.fun
export function onCurve(pairs) {
  return !!(pairs && pairs.length && pairs.every(function (p) { return /^pump-?fun$/.test(p.dexId || ""); }));
}

// Un token "no despegó" si a las 24 h su capitalización no llega a 10.000 $, RugCheck lo marca como rug
// o le quitaron la liquidez
export function isDead(t) {
  return !!t.rug || !(t.mcap >= DEAD_MCAP) || isPulled(t.liq, t.liqNow, t.cv);
}

// RugCheck sin responder: cuenta las ejecuciones seguidas en las que falló en al menos la mitad de los tokens
// nuevos (si hay 10 o más; con menos no se cuenta nada). Devuelve el contador nuevo y, si toca, el aviso: al
// llegar a RC_ALERT_RUNS y cuando vuelve
export function rcWatch(down, nuevos, fallos) {
  down = down || 0;
  if (nuevos < RC_FAIL_MIN) return { down: down, msg: null };
  if (fallos >= nuevos * RC_FAIL_PCT) {
    const next = down + 1;
    return { down: next, msg: next === RC_ALERT_RUNS ? "⚠️ SolFlag: RugCheck no responde desde hace " + next +
      " ejecuciones del recolector (" + fallos + " de " + nuevos + " tokens nuevos sin datos). El registro los apunta sin creador ni lanzador (nrc)." : null };
  }
  return { down: 0, msg: down >= RC_ALERT_RUNS ? "✅ SolFlag: RugCheck vuelve a responder." : null };
}

// Wallets de un token, cada una con su papel (sin repetir: el creador que se pagó su lanzamiento cuenta como pagador)
export function facesOf(t) {
  const out = [];
  ROLES.forEach(function (r) {
    const a = t[r];
    if (a && !out.some(function (x) { return x.addr === a; })) out.push({ addr: a, role: r });
  });
  return out;
}

// Token nuevo: se apunta y suma un lanzamiento a cada una de sus caras
export function addToken(state, mint, t) {
  if (state.tokens[mint]) return false;
  state.tokens[mint] = t;
  facesOf(t).forEach(function (f) {
    const a = state.faces[f.addr] || (state.faces[f.addr] = { n: 0, done: 0, dead: 0, roles: {}, last: 0, ex: [] });
    a.n++; a.roles[f.role] = (a.roles[f.role] || 0) + 1; a.last = Math.max(a.last, t.t || 0);
  });
  return true;
}

// Resultado a las 24 h: se suma a sus caras y el token se olvida. Devuelve si murió (undefined si no estaba)
export function resolveToken(state, mint, mcap, liq, curve) {
  const t = state.tokens[mint];
  if (!t) return undefined;
  t.mcap = mcap; t.liqNow = liq; t.cv = !!curve;
  const dead = isDead(t);
  facesOf(t).forEach(function (f) {
    const a = state.faces[f.addr];
    if (!a) return;
    a.done++;
    if (dead) { a.dead++; a.ex.unshift({ m: mint, t: t.t || 0 }); a.ex = a.ex.slice(0, 3); }
  });
  delete state.tokens[mint];
  return dead;
}

// Datos de un lanzamiento que llegaron tarde (RugCheck no respondió al verlo): suma las caras que faltaban.
// known: lo que ya se sabía (el pagador), para no contar dos veces la misma wallet.
// Si el token aún espera su resultado, esas caras se cuentan al resolverlo; si ya se resolvió, out = { dead, t }
// cuenta el resultado ya (sin out no se cuenta nada: no se sabría si murió)
export function addRolesLate(state, mint, roles, known, out) {
  const pend = state.tokens[mint];
  if (!pend && !out) return 0;
  const t = Object.assign({}, pend || Object.assign({ t: out.t }, known));
  const before = facesOf(t).map(function (f) { return f.addr; });
  ROLES.forEach(function (r) { if (roles[r] && !t[r]) t[r] = roles[r]; });
  const added = facesOf(t).filter(function (f) { return before.indexOf(f.addr) < 0; });
  added.forEach(function (f) {
    const a = state.faces[f.addr] || (state.faces[f.addr] = { n: 0, done: 0, dead: 0, roles: {}, last: 0, ex: [] });
    a.n++; a.roles[f.role] = (a.roles[f.role] || 0) + 1; a.last = Math.max(a.last, t.t || 0);
    if (!pend) { a.done++; if (out.dead) { a.dead++; a.ex.push({ m: mint, t: t.t || 0 }); a.ex.sort(function (x, y) { return y.t - x.t; }); a.ex = a.ex.slice(0, 3); } }
  });
  if (pend) ROLES.forEach(function (r) { if (t[r]) pend[r] = t[r]; });
  return added.length;
}

function counts(state, addr) {
  // solo cuentan las wallets ya comprobadas que no son exchanges ni plataformas
  const i = state.infra[addr], r = state.faces[addr].roles || {};
  if (!i || i.infra) return false;
  return !(!r.payer && !r.creator && i.ph > FUNDER_PER_HOUR);
}

// Lista pública:
//   faces: { addr: { lvl, n, done, dead, roles, last, ex: [mints que no despegaron] } }
//   mints: { mint: addr } tokens de menos de 24 h lanzados por una cara marcada
export function buildList(state, now) {
  const faces = {}, mints = {};
  Object.keys(state.faces).forEach(function (addr) {
    const a = state.faces[addr], lvl = faceLevel(a.done, a.dead);
    if (!lvl || !counts(state, addr)) return;
    faces[addr] = { lvl: lvl, n: a.n, done: a.done, dead: a.dead, roles: a.roles, last: a.last, ex: a.ex.map(function (x) { return x.m; }) };
  });
  Object.keys(state.tokens).forEach(function (m) {
    facesOf(state.tokens[m]).forEach(function (f) {
      const c = faces[f.addr];
      if (!c) return;
      const prev = mints[m] && faces[mints[m]];
      // si un token tiene varias caras marcadas, se queda la peor
      if (!prev || (prev.lvl === "warn" && c.lvl === "bad") || (prev.lvl === c.lvl && c.dead > prev.dead)) mints[m] = f.addr;
    });
  });
  return { v: 1, updated: now, faces: faces, mints: mints };
}

// Olvida caras viejas o de un solo lanzamiento, tokens que se quedaron sin resolver una semana
// y comprobaciones de actividad de más de 7 días (se vuelven a hacer)
export function prune(state, now) {
  Object.keys(state.faces).forEach(function (a) {
    const f = state.faces[a], age = now - f.last;
    if (age > KEEP_DAYS * DAY || (f.n < 2 && age > SINGLE_DAYS * DAY)) delete state.faces[a];
  });
  Object.keys(state.tokens).forEach(function (m) {
    if (now - (state.tokens[m].seen || 0) > 7 * DAY) delete state.tokens[m];
  });
  Object.keys(state.infra).forEach(function (a) {
    if (now - state.infra[a].at > 7 * DAY || !state.faces[a]) delete state.infra[a];
  });
  return state;
}

// Wallets que ya salen en 2 o más lanzamientos y no se han comprobado: a esas se les mira la actividad
export function needInfraCheck(state) {
  return Object.keys(state.faces).filter(function (a) { return state.faces[a].n >= 2 && !state.infra[a]; })
    .sort(function (a, b) { return state.faces[b].n - state.faces[a].n; });
}

// Transacciones por hora en sus últimas firmas (hasta 1000)
export function perHour(sigs) {
  if (!sigs || sigs.length < 2) return 0;
  const span = (sigs[0].blockTime - sigs[sigs.length - 1].blockTime) / 3600;
  return span > 0 ? sigs.length / span : sigs.length * 3600;
}

// ----- Datos del lanzamiento leídos de la cadena (sin depender de RugCheck) -----
// Pump.fun guarda el creador dentro de la instrucción de creación: 8 bytes de discriminador, nombre, símbolo y uri
// (cada uno con 4 bytes de longitud) y luego 32 bytes con la dirección del creador. Sirve para create y create_v2.
// RugCheck tarda en tenerlo en los tokens de pocos minutos y a veces no responde (31/10/2026)
export const PUMP_PROGRAM = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export function b58decode(s) {
  let n = 0n;
  for (const c of s) { const i = B58.indexOf(c); if (i < 0) return null; n = n * 58n + BigInt(i); }
  const out = [];
  while (n > 0n) { out.unshift(Number(n & 255n)); n >>= 8n; }
  for (const c of s) { if (c !== "1") break; out.unshift(0); }
  return Uint8Array.from(out);
}
export function b58encode(b) {
  let n = 0n, s = "";
  for (const x of b) n = n * 256n + BigInt(x);
  while (n > 0n) { s = B58[Number(n % 58n)] + s; n /= 58n; }
  for (const x of b) { if (x !== 0) break; s = "1" + s; }
  return s;
}
// tx: getTransaction en jsonParsed. Devuelve el creador o null si no es una creación de Pump.fun de ese token
export function pumpCreator(tx, mint) {
  const m = tx && tx.transaction && tx.transaction.message;
  if (!m) return null;
  const inner = ((tx.meta && tx.meta.innerInstructions) || []).map(function (x) { return x.instructions; });
  const all = (m.instructions || []).concat.apply(m.instructions || [], inner);
  for (const ix of all) {
    if (ix.programId !== PUMP_PROGRAM || !ix.data || !ix.accounts || ix.accounts[0] !== mint) continue;
    const d = b58decode(ix.data);
    if (!d) continue;
    let o = 8, ok = true;
    for (let k = 0; k < 3 && ok; k++) {
      if (o + 4 > d.length) { ok = false; break; }
      o += 4 + (d[o] | (d[o + 1] << 8) | (d[o + 2] << 16) | (d[o + 3] << 24));
      if (o > d.length) ok = false;
    }
    if (ok && o + 32 <= d.length) return b58encode(d.slice(o, o + 32));
  }
  return null;
}
// Lanzador a partir del dex de GeckoTerminal (mismos nombres que usa RugCheck en launchpad.platform)
const DEX_PLAT = { "pump-fun": "pump_fun", pumpfun: "pump_fun", "raydium-launchlab": "raydium_launchlab", "meteora-dbc": "meteora_dbc" };
export function platFromDex(dex) { return DEX_PLAT[dex] || undefined; }
