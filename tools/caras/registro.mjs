// Registro de tokens: lo que SolFlag diría de cada lanzamiento nuevo al verlo, y cómo acabó a las 24 h y a
// los 7 días. Sirve para medir cuánto acierta («de los marcados en rojo murió el X %») y ajustar los límites
// con datos. Partes sin red, para poder probarlas.
//
// Se publica en datos/registro/AAAA-MM-DD.json (un archivo por día de lanzamiento) y datos/registro/indice.json
// (resumen por día y nivel). Hasta entonces los tokens viven en state.reg (la caché del colector). Cada día se
// escribe solo dos veces, porque git guarda todas las versiones de un archivo: cuando todos sus tokens tienen el
// resultado de 24 h y cuando tienen el de 7 días (o ya no se va a saber).
//
// Cada token (claves cortas: el registro crece cada día):
//   m mint · s símbolo · t creado (ms) · d dex · p plataforma
//   a cuándo se analizó · l nivel (HIGH, MEDIUM, LOW, NO_DATA…) · v gravedad · ty tipo
//   f señales que no son ok («CODIGO:b» rojo, «CODIGO:w» amarillo, «CODIGO:n» sin comprobar)
//   liq liquidez · mc capitalización · w1 / w10 % de la mayor wallet y de las 10 mayores (personas)
//   py pagador · fu financiador · cr creador · rug marcado como rug por RugCheck · cara nivel de cara conocida
//   nrc = 1: RugCheck no respondió al verlo (sin creador ni lanzador, y el motor tampoco pudo mirar al creador;
//   pasó el 31/10/2026 de 01 a 15 h UTC, antes de existir esta marca). Para apartarlos al medir señales de creador
//   rcl = 1: RugCheck respondió más tarde y se completaron p, cr, fu y rug (desde el 2/11/2026; también los del 31/10).
//   El nivel l y las señales f NO cambian: se calcularon sin el creador, por eso sigue nrc = 1
//   h24 / d7 resultado: { mc, liq, dead, cv?, pull?, dry?, dx?, gr? } (dead = no llega a DEAD_MCAP, rug, le quitaron
//   la liquidez o no la tiene; cv = sigue en la curva de Pump.fun; pull = muerto porque la liquidez cayó más de un 95 %;
//   dry = muerto porque fuera de la curva le queda menos de DRY_LIQ de liquidez aunque la capitalización diga otra
//   cosa (desde el 2/11/2026, también en los días ya publicados), o liquidez por debajo del 0,2 % de la capitalización
//   (THIN_LIQ, desde el 6/11/2026);
//   dx = dex de su mercado principal en ese momento; gr = salió en la curva de Pump.fun y ya tiene mercado
//   fuera de ella: graduó. Desde el 1/11/2026, para estudiar qué tokens de la curva llegan a graduar)

import { DAY, DEAD_MCAP, DRY_LIQ, THIN_LIQ, isPulled, onCurve } from "./lib.mjs";

export const REG_DAYS = 7;          // último resultado: a los 7 días
export const LEVEL_ORDER = ["HIGH", "MEDIUM", "LOW", "SPAM", "NO_DATA", "NO_MARKET"];

const round = (x, d) => (typeof x === "number" && isFinite(x) ? Math.round(x * Math.pow(10, d || 0)) / Math.pow(10, d || 0) : undefined);
const S = { bad: "b", warn: "w", na: "n" };

export function dayOf(ms) { return new Date(ms).toISOString().slice(0, 10); }

// Entrada nueva a partir del resultado del motor (analyzeToken) y de lo que el colector sabe del lanzamiento
// ev: engine version that judged it (from 0.4.9 on), so accuracy per level can be split by version
export function regEntry(mint, launch, r, now, face, ev) {
  const e = { m: mint, t: launch.t || now, a: now };
  if (ev) e.ev = ev;
  if (launch.dex) e.d = launch.dex;
  if (launch.plat) e.p = launch.plat;
  if (r) {
    if (r.sym && r.sym.length <= 24) e.s = r.sym;
    e.l = r.lvl; e.v = r.sev; if (r.type) e.ty = r.type;
    const f = [];
    (r.lights || []).forEach(function (l) {
      (l.items || []).forEach(function (i) {
        if (S[i.s]) f.push(i.code + ":" + S[i.s]);
        if (i.code === "CON_OK" || i.code === "CON_HIGH" || i.code === "CON_ISSUER") { e.w1 = round(i.data && i.data.w1, 1); e.w10 = round(i.data && i.data.w10, 1); }
      });
    });
    if (f.length) e.f = f;
    const p = r.pair;
    if (p) { e.liq = round(p.liquidity && p.liquidity.usd); e.mc = round(p.marketCap || p.fdv); }
  } else e.l = "ERROR";
  if (launch.payer) e.py = launch.payer;
  if (launch.funder) e.fu = launch.funder;
  if (launch.creator) e.cr = launch.creator;
  if (launch.rug) e.rug = true;
  if (launch.nrc) e.nrc = 1;
  if (face) e.cara = face;
  Object.keys(e).forEach(function (k) { if (e[k] === undefined) delete e[k]; });
  return e;
}

// RugCheck respondió tarde: completa los datos fijos del lanzamiento, sin tocar el nivel (se calculó sin ellos).
// info = { plat, creator, funder, rug }. Devuelve true si cambió algo
export function regFill(e, info) {
  if (!e) return false;
  let ch = false;
  [["p", "plat"], ["cr", "creator"], ["fu", "funder"]].forEach(function (k) {
    if (info[k[1]] && !e[k[0]]) { e[k[0]] = info[k[1]]; ch = true; }
  });
  if (info.rug && !e.rug) { e.rug = true; ch = true; }
  if (!e.nrc || !e.rcl) ch = true;
  e.nrc = 1; e.rcl = 1;
  return ch;
}

// Tokens de un día que se quedaron sin datos de RugCheck antes de existir la marca nrc (sin lanzador ni creador):
// se marcan nrc = 1 y se devuelven para pedirlos otra vez
export function regMissing(reg, day) {
  return Object.keys(reg).filter(function (m) {
    const e = reg[m];
    if (dayOf(e.t) !== day || e.p || e.cr || e.rcl) return false;
    e.nrc = 1;
    return true;
  });
}

// Tokens del registro a los que les toca resultado: "h24" a las 24 h, "d7" a los 7 días
export function regDue(reg, now) {
  const out = { h24: [], d7: [] };
  Object.keys(reg).forEach(function (m) {
    const e = reg[m];
    if (!e.h24 && now - e.t >= DAY) out.h24.push(m);
    else if (e.h24 && !e.d7 && now - e.t >= REG_DAYS * DAY) out.d7.push(m);
  });
  return out;
}

// Salió en la curva de Pump.fun (el dex que dio GeckoTerminal al verlo nacer)
export function fromCurve(e) { return /^pump-?fun$/.test((e && e.d) || ""); }

// Resultado de una etapa (pairs = pares de DexScreener de ese token; sin pares, el token no tiene mercado)
export function regResolve(e, stage, pairs) {
  let mc = 0, liq = 0, best = null, bestLiq = -1;
  (pairs || []).forEach(function (p) {
    const l = (p.liquidity && p.liquidity.usd) || 0;
    mc = Math.max(mc, p.marketCap || p.fdv || 0);
    liq = Math.max(liq, l);
    if (l > bestLiq) { best = p; bestLiq = l; }
  });
  const r = { mc: Math.round(mc), liq: Math.round(liq) };
  if (best && best.dexId) r.dx = best.dexId;
  // en la curva de Pump.fun DexScreener da liquidez 0 aunque el token siga vivo
  if (onCurve(pairs)) r.cv = true;
  // graduó: nació en la curva y ya tiene algún mercado fuera de ella (PumpSwap, Raydium, Meteora…)
  if (fromCurve(e) && (pairs || []).some(function (p) { return p.dexId && !/^pump-?fun$/.test(p.dexId); })) r.gr = true;
  e[stage] = r;
  return regRecheck(e, stage);
}

// Muerto o no según el resultado guardado. Se puede repetir: sirve también para corregir resultados antiguos
export function regRecheck(e, stage) {
  const r = e[stage];
  if (!r) return e;
  const pull = isPulled(e.liq, r.liq, r.cv);
  const dry = !r.cv && (!(r.liq >= DRY_LIQ) || r.liq < r.mc * THIN_LIQ);
  r.dead = !!e.rug || !(r.mc >= DEAD_MCAP) || pull || dry;
  if (pull && r.mc >= DEAD_MCAP) r.pull = true; else delete r.pull;
  if (dry && !pull && !e.rug && r.mc >= DEAD_MCAP) r.dry = true; else delete r.dry;
  return e;
}

// Vuelve a juzgar un día ya publicado con la regla de hoy. Devuelve true si cambió algo
export function regRejudge(file) {
  if (!file || !file.tokens) return false;
  const before = JSON.stringify(file.tokens);
  Object.keys(file.tokens).forEach(function (m) { regRecheck(file.tokens[m], "h24"); regRecheck(file.tokens[m], "d7"); });
  return JSON.stringify(file.tokens) !== before;
}

// Ya tiene los dos resultados
export function regDone(e) { return !!(e.h24 && e.d7); }

// Días listos para publicar. pub recuerda lo publicado de cada día (1 = con 24 h, 2 = final). Devuelve
// [{ day, final, entries }] y saca del estado los tokens de los días finales
export function regPublish(reg, pub, now) {
  const byDay = {};
  Object.keys(reg).forEach(function (m) { (byDay[dayOf(reg[m].t)] = byDay[dayOf(reg[m].t)] || []).push(reg[m]); });
  const out = [];
  Object.keys(byDay).sort().forEach(function (day) {
    const es = byDay[day], end = Date.parse(day + "T00:00:00Z") + DAY;
    if (now < end + 3600e3) return;                                   // el día aún recibe tokens
    const final = es.every(regDone) || now > end + (REG_DAYS + 2) * DAY;
    const first = !pub[day] && es.every(function (e) { return e.h24; });
    if (!final && !first) return;
    out.push({ day: day, final: final, entries: es });
    pub[day] = final ? 2 : 1;
    if (final) es.forEach(function (e) { delete reg[e.m]; });
  });
  Object.keys(pub).forEach(function (d) { if (now - Date.parse(d + "T00:00:00Z") > 30 * DAY) delete pub[d]; });
  return out;
}

// Resumen de un día: por nivel inicial y por señal, cuántos hay, cuántos tienen ya resultado y cuántos murieron;
// alive = los que siguen vivos en su último resultado ({ m, s, l nivel, at h24|d7, mc })
export function daySummary(tokens) {
  const by = {}, sig = {}, filtro = {}, alive = [], cur = { n: 0, h24: 0, gr24: 0, d7: 0, gr7: 0 };
  const blank = function () { return { n: 0, h24: 0, dead24: 0, d7: 0, dead7: 0 }; };
  const count = function (s, e) {
    s.n++;
    if (e.h24) { s.h24++; if (e.h24.dead) s.dead24++; }
    if (e.d7) { s.d7++; if (e.d7.dead) s.dead7++; }
  };
  Object.keys(tokens).forEach(function (m) {
    const e = tokens[m], k = e.l || "ERROR";
    // tokens nacidos en la curva de Pump.fun y cuántos graduaron (solo los resueltos desde el 1/11 tienen gr/dx)
    if (fromCurve(e)) {
      cur.n++;
      if (e.h24 && e.h24.dx !== undefined) { cur.h24++; if (e.h24.gr) cur.gr24++; }
      if (e.d7 && e.d7.dx !== undefined) { cur.d7++; if (e.d7.gr) cur.gr7++; }
    }
    // los elegidos por el filtro de entrada (sel prio o grupo, desde el 14/11) no cuentan en los porcentajes: están
    // sesgados hacia lo que más promete. Cuentan los de antes (sin sel) y la muestra al azar (sel azar)
    if (e.sel && e.sel !== "azar") { filtro[e.sel] = (filtro[e.sel] || 0) + 1; }
    else {
      count(by[k] || (by[k] = blank()), e);
      // cada señal (sin el color): cuántos tokens la tenían y cuántos murieron
      (e.f || []).forEach(function (f) { const c = f.split(":")[0]; count(sig[c] || (sig[c] = blank()), e); });
    }
    // los que siguen vivos en su último resultado: los fallos de los marcados en rojo, a la vista
    const last = e.d7 ? "d7" : e.h24 ? "h24" : null;
    if (last && !e[last].dead) alive.push({ m: e.m, s: e.s, l: k, at: last, mc: e[last].mc });
  });
  const levels = {};
  LEVEL_ORDER.concat(["ERROR"]).forEach(function (k) { if (by[k]) levels[k] = by[k]; });
  const out = { n: Object.keys(tokens).length, levels: levels };
  if (cur.n) out.curve = cur;
  if (Object.keys(filtro).length) out.filtro = filtro;   // cuántos se analizaron por prioridad (fuera de los %)
  out.sig = {};
  Object.keys(sig).sort().forEach(function (c) { out.sig[c] = sig[c]; });
  out.alive = alive;
  return out;
}

// Une lo que hay publicado de un día con las entradas nuevas o actualizadas
export function mergeDay(file, day, entries, now) {
  const out = file && file.tokens ? file : { v: 1, day: day, tokens: {} };
  entries.forEach(function (e) { out.tokens[e.m] = e; });
  out.updated = now;
  return out;
}

// Red de seguridad: un token que se quedó en el estado mucho más de lo previsto se olvida
export function regPrune(reg, now) {
  Object.keys(reg).forEach(function (m) { if (now - reg[m].t > (REG_DAYS + 5) * DAY) delete reg[m]; });
  return reg;
}
