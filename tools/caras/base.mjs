// Base de wallets de SolFlag: lo que se va sabiendo de cada wallet en cada lanzamiento revisado, estudio o prueba,
// para ir trazando poco a poco un mapa propio de Solana. Todo son datos públicos de la cadena.
//
//   wallets: { addr: { first, last, ph (transacciones por hora, si se midió), roles: {payer, funder, creator, group,
//              sniper...}, tokens: [últimos mints], nTok (tokens distintos), label (si se sabe a mano) } }
//   merged:  aportes ya sumados (archivos de tools/caras/aportes)
//
// Una observación es { addr, ph?, role?, token?, at?, label? }.

export const DAY = 86400e3;
export const EXCHANGE_PH = 100;     // igual que el motor: los orígenes de grupos reales hacen de 0 a 50 por hora
export const PLATFORM_PH = 300;     // por encima, exchange o plataforma seguro, haga lo que haga
export const KEEP_UNKNOWN_DAYS = 3; // una wallet vista una vez y sin nada especial se olvida pronto
export const KEEP_KNOWN_DAYS = 180;
export const TYPES = ["exchange", "granja", "repartidor", "creador en serie", "sniper"];

export function emptyBase() { return { v: 1, wallets: {}, merged: [] }; }

export function observe(base, o, now) {
  if (!o || !o.addr) return;
  const at = o.at || now;
  const w = base.wallets[o.addr] || (base.wallets[o.addr] = { first: at, last: at, roles: {}, tokens: [], nTok: 0 });
  w.first = Math.min(w.first, at); w.last = Math.max(w.last, at);
  if (typeof o.ph === "number" && isFinite(o.ph)) { w.ph = Math.round(o.ph); w.phAt = at; }
  if (o.role) w.roles[o.role] = (w.roles[o.role] || 0) + 1;
  if (o.token && w.tokens.indexOf(o.token) < 0) {
    w.tokens.push(o.token); w.nTok++;
    if (w.tokens.length > 20) w.tokens.shift();
  }
  if (o.label) w.label = o.label;
}

// Qué es una wallet según lo que se sabe de ella (null si nada la distingue de una persona normal)
export function classify(w) {
  if (!w) return null;
  if (w.label) return w.label;
  const r = w.roles || {}, ph = w.ph;
  if (ph >= PLATFORM_PH) return "exchange";
  // da el primer SOL a holders de tokens distintos y mueve mucho: un exchange pequeño, no un equipo
  if (ph > EXCHANGE_PH && ((r.funder || 0) + (r.group || 0)) > 0 && w.nTok >= 2) return "exchange";
  if ((r.payer || 0) >= 3) return "granja";
  if ((r.sniper || 0) >= 3) return "sniper";
  if ((r.funder || 0) + (r.group || 0) >= 2) return "repartidor";
  if ((r.creator || 0) >= 3) return "creador en serie";
  return null;
}

export function pruneBase(base, now) {
  Object.keys(base.wallets).forEach(function (a) {
    const w = base.wallets[a], age = now - w.last, known = !!classify(w);
    if ((!known && w.nTok < 2 && age > KEEP_UNKNOWN_DAYS * DAY) || age > (known ? KEEP_KNOWN_DAYS : 30) * DAY) delete base.wallets[a];
  });
  return base;
}

// Suma un archivo de aportes (una lista de observaciones) una sola vez
export function mergeAporte(base, name, list, now) {
  if (base.merged.indexOf(name) >= 0) return 0;
  (list || []).forEach(function (o) { observe(base, o, now); });
  base.merged.push(name);
  return (list || []).length;
}

// Lo que se publica: las wallets que se sabe qué son, y aparte la lista de exchanges (lo más útil para la web)
export function publishBase(base, now) {
  const wallets = {}, exchanges = {}, count = {};
  Object.keys(base.wallets).forEach(function (a) {
    const w = base.wallets[a], t = classify(w);
    if (!t) return;
    count[t] = (count[t] || 0) + 1;
    wallets[a] = { t: t, ph: w.ph === undefined ? null : w.ph, n: w.nTok, roles: w.roles, last: w.last };
    if (t === "exchange") exchanges[a] = w.ph === undefined ? null : w.ph;
  });
  return {
    base: { v: 1, updated: now, seen: Object.keys(base.wallets).length, count: count, wallets: wallets },
    exchanges: { v: 1, updated: now, exchanges: exchanges }
  };
}
