// Filtro de entrada del recolector (15/11/2026). Cada ejecución ve ~100 lanzamientos nuevos y solo puede analizar con el
// motor REG_MAX (40). Antes iban por orden de llegada y con segundos de vida (casi todos valían lo mismo, ~3–4 k$);
// ahora cada lanzamiento espera a la ejecución siguiente (~30 min) y, en esa segunda mirada (DexScreener: cuánto vale,
// liquidez, compras de la última hora, y quién está detrás), los análisis completos van a los que más prometen. Una parte de los huecos (AZAR) se
// sigue dando al azar entre el resto, para que las cifras de «Datos y acierto» puedan medirse sin el sesgo del filtro.
// Los que no se analizan siguen contando con sus datos básicos (quién pagó, cómo acabaron a las 24 h).
//
// Los umbrales salen del estudio «Los que llegaron lejos» (tools/estudio): lo que tenían AL NACER los que pasaron de
// 250.000 $ en 7 días con volumen real (tools/estudio/informe-maximos.md). Hacia fuera nunca «van a subir»: solo «merecen una segunda mirada».
import { classify } from "./base.mjs";

export const AZAR = 0.25;        // parte de los huecos de cada ejecución que se da al azar (muestra sin sesgo): 10 de 40
export const SERIE_MAX = 20;     // con más lanzamientos en la base, una wallet es de las que lanzan en serie

// Puntos de un lanzamiento. f: la segunda mirada (par: si DexScreener lo tiene, mc, liq, buys: compras de la última
// hora); t: quién está detrás
// (payer, creator, funder); base: la base de wallets. Devuelve { p, por } (por: los motivos, para el log y las pruebas)
export function puntos(f, t, base) {
  let p = 0; const por = [];
  const add = (n, k) => { p += n; por.push(k); };
  const liq = f.liq || 0, mc = f.mc || 0, buys = f.buys || 0;
  if (f.par === false) add(-1, "sinPar");                // DexScreener aún no lo tiene (o ya no tiene mercado)
  // liquidez: el factor más fuerte y el más difícil de inflar. Estudio del 15/11 (13.344 lanzamientos, 52 llegaron a
  // 250 k$ con volumen real): con menos de 10 k$ llegaron 3 de 12.384; 10–25 k$, el 1,7 %; 25–50 k$, el 7 %; ≥50 k$, el 15 %
  if (liq >= 50e3) add(4, "liq50k"); else if (liq >= 25e3) add(3, "liq25k"); else if (liq >= 10e3) add(2, "liq10k");
  // la capitalización sola engaña (73 «valían» más de 1 M$ en un pool casi vacío): solo suma si la liquidez la sostiene
  if (mc >= 100e3 && liq >= 10e3 && mc <= liq * 100) add(1, "mc100k");
  // ritmo de compras en la última hora
  if (buys >= 100) add(2, "compras100"); else if (buys >= 30) add(1, "compras30");
  // quién está detrás: de 1.449 lanzamientos pagados por wallets con más de 20, ninguno llegó lejos
  const W = (base && base.wallets) || {};
  const quien = [t.payer, t.creator, t.funder].filter(Boolean).map((a) => W[a]).filter(Boolean);
  if (quien.some((w) => classify(w) === "granja")) add(-5, "granja");
  else if (quien.some((w) => (w.nTok || 0) > SERIE_MAX)) add(-4, "serie");
  else if (quien.some((w) => classify(w) === "creador en serie")) add(-2, "creadorSerie");
  return { p, por };
}

// Elige qué lanzamientos se analizan. lista: [{ mint, p }] en orden de llegada; n: huecos; rnd: función aleatoria.
// Devuelve { mint: "prio" | "azar" }. Los primeros n − n·AZAR por puntos (empate: el que llegó antes) y el resto al azar
// entre los que quedan
export function elegir(lista, n, rnd = Math.random, azar = Math.round(n * AZAR)) {
  const out = {};
  if (n <= 0) return out;
  const nAzar = Math.min(azar, n), nPrio = n - nAzar;
  const orden = lista.map((x, i) => ({ x, i })).sort((a, b) => b.x.p - a.x.p || a.i - b.i);
  orden.slice(0, nPrio).forEach((o) => { out[o.x.mint] = "prio"; });
  const resto = orden.slice(nPrio).map((o) => o.x.mint);
  for (let k = 0; k < nAzar && resto.length; k++) out[resto.splice(Math.floor(rnd() * resto.length), 1)[0]] = "azar";
  return out;
}
