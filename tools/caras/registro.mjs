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
//   h24 / d7 resultado: { mc, liq, dead, cv?, pull? } (dead = no llega a DEAD_MCAP, rug o le quitaron la
//   liquidez; cv = sigue en la curva de Pump.fun; pull = muerto porque la liquidez cayó más de un 95 %)

import { DAY, DEAD_MCAP } from "./lib.mjs";

export const REG_DAYS = 7;          // último resultado: a los 7 días
export const PULL_MIN_LIQ = 1000;   // liquidez mínima al analizarlo para que cuente si se la quitan
export const PULL_DROP = 0.95;      // la liquidez cayó más de esto: le quitaron el pool aunque quede capitalización
export const LEVEL_ORDER = ["HIGH", "MEDIUM", "LOW", "SPAM", "NO_DATA", "NO_MARKET"];

const round = (x, d) => (typeof x === "number" && isFinite(x) ? Math.round(x * Math.pow(10, d || 0)) / Math.pow(10, d || 0) : undefined);
const S = { bad: "b", warn: "w", na: "n" };

export function dayOf(ms) { return new Date(ms).toISOString().slice(0, 10); }

// Entrada nueva a partir del resultado del motor (analyzeToken) y de lo que el colector sabe del lanzamiento
export function regEntry(mint, launch, r, now, face) {
  const e = { m: mint, t: launch.t || now, a: now };
  if (launch.dex) e.d = launch.dex;
  if (launch.plat) e.p = launch.plat;
  if (r) {
    if (r.sym && r.sym.length <= 24) e.s = r.sym;
    e.l = r.lvl; e.v = r.sev; if (r.type) e.ty = r.type;
    const f = [];
    (r.lights || []).forEach(function (l) {
      (l.items || []).forEach(function (i) {
        if (S[i.s]) f.push(i.code + ":" + S[i.s]);
        if (i.code === "CON_OK" || i.code === "CON_HIGH") { e.w1 = round(i.data && i.data.w1, 1); e.w10 = round(i.data && i.data.w10, 1); }
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
  if (face) e.cara = face;
  Object.keys(e).forEach(function (k) { if (e[k] === undefined) delete e[k]; });
  return e;
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

// Resultado de una etapa (pairs = pares de DexScreener de ese token; sin pares, el token no tiene mercado)
export function regResolve(e, stage, pairs) {
  let mc = 0, liq = 0;
  (pairs || []).forEach(function (p) {
    mc = Math.max(mc, p.marketCap || p.fdv || 0);
    liq = Math.max(liq, (p.liquidity && p.liquidity.usd) || 0);
  });
  const r = { mc: Math.round(mc), liq: Math.round(liq) };
  // en la curva de Pump.fun DexScreener da liquidez 0 aunque el token siga vivo
  if (pairs && pairs.length && pairs.every(function (p) { return /^pump-?fun$/.test(p.dexId || ""); })) r.cv = true;
  e[stage] = r;
  return regRecheck(e, stage);
}

// Muerto o no según el resultado guardado. Se puede repetir: sirve también para corregir resultados antiguos
export function regRecheck(e, stage) {
  const r = e[stage];
  if (!r) return e;
  const pull = !r.cv && e.liq >= PULL_MIN_LIQ && r.liq < e.liq * (1 - PULL_DROP);
  r.dead = !!e.rug || !(r.mc >= DEAD_MCAP) || pull;
  if (pull && r.mc >= DEAD_MCAP) r.pull = true; else delete r.pull;
  return e;
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

// Resumen de un día: por nivel inicial, cuántos hay, cuántos tienen ya resultado y cuántos murieron
export function daySummary(tokens) {
  const by = {};
  Object.keys(tokens).forEach(function (m) {
    const e = tokens[m], k = e.l || "ERROR";
    const s = by[k] || (by[k] = { n: 0, h24: 0, dead24: 0, d7: 0, dead7: 0 });
    s.n++;
    if (e.h24) { s.h24++; if (e.h24.dead) s.dead24++; }
    if (e.d7) { s.d7++; if (e.d7.dead) s.dead7++; }
  });
  const levels = {};
  LEVEL_ORDER.concat(["ERROR"]).forEach(function (k) { if (by[k]) levels[k] = by[k]; });
  return { n: Object.keys(tokens).length, levels: levels };
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
