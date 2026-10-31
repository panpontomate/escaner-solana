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
