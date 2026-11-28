// «Nota de SolFlag, día a día» en la ficha (28/11/2026; maqueta aprobada maquetas/historial-nota/historial-nota.html).
// Lee la tabla notas de D1 (la llena tools/notas/notas.mjs una vez al día con el mismo motor que la web) y pinta:
// la nota de hoy con su nivel, hace 7 y 30 días, la gráfica en escalones sobre las franjas de color del Escáner
// (7 d / 30 d / Todo) y la lista de cambios con el apartado que la movió y el dato de antes y de ahora.
// Los nombres y el dato de cada chequeo son los del Escáner (CK_NOM y ckDet de index.html), en es y en.

import { nf, usd } from "./ficha.js";

const DAY = 86400000;
export const NOTA_MAX = 400;   // filas leídas como mucho (algo más de un año)

const NOM = {
  es: { copia: "¿Es una copia?", oficial: "Token oficial", claves: "Claves del emisor", precio: "Precio frente al real", reservas: "Reservas",
    liquidez: "Liquidez", mover: "El emisor puede mover tokens", comision: "Comisión al transferir", uso: "Uso", control: "Control del creador",
    reparto: "Quién lo tiene", wallet: "Una wallet grande", lp: "Liquidez bloqueada", volumen: "Volumen 24 h", edad: "Antigüedad",
    creador: "Creador y su historial", codigo: "¿Siguen construyendo?", negocio: "¿El token gana con el negocio?", comisiones: "Comisiones",
    tendencia: "Tendencia de las comisiones", ingresos: "Ingresos propios", depositos: "Depósitos", auditorias: "Auditorías",
    traders: "Actividad real", organico: "Compradores reales", titulares: "Titulares", titularesC: "Titulares en 24 h",
    crear: "Puede crear más", congelar: "Puede congelar", desbloqueos: "Desbloqueos", hackeo: "Hackeos" },
  en: { copia: "Is it a copy?", oficial: "Official token", claves: "Issuer keys", precio: "Price vs the real asset", reservas: "Reserves",
    liquidez: "Liquidity", mover: "The issuer can move tokens", comision: "Transfer fee", uso: "Usage", control: "Creator control",
    reparto: "Who holds it", wallet: "One big wallet", lp: "Locked liquidity", volumen: "24h volume", edad: "Age",
    creador: "Creator and track record", codigo: "Are they still building?", negocio: "Does the token earn from the business?", comisiones: "Fees",
    tendencia: "Fee trend", ingresos: "Own revenue", depositos: "Deposits", auditorias: "Audits",
    traders: "Real activity", organico: "Real buyers", titulares: "Holders", titularesC: "Holders in 24h",
    crear: "Can mint more", congelar: "Can freeze", desbloqueos: "Unlocks", hackeo: "Hacks" },
};
const TXT = {
  es: { tit: "Nota de SolFlag, día a día", hoy: "Hoy", h7: "Hace 7 días", h30: "Hace 30 días", todo: "Todo", d7: "7 d", d30: "30 d",
    tope: "el tope de una meme", falta: "Aún no lo tenemos", nada: "—",
    empieza: (f) => "Empezamos a guardarla el " + f + ". Aquí verás cada día cómo cambia y por qué.",
    sinCambios: (f) => "Sin cambios desde el " + f + ".",
    otros: "Cambió el cálculo de un apartado.",
    pie: "La calculamos cada día con el mismo motor del Escáner. Solo cambia cuando cambia un apartado; los días sin cambios no salen en la lista.",
    como: "Cómo se decide la nota →", aria: (a, b, n) => "Nota de SolFlag en los últimos " + n + " días: de " + a + " a " + b,
    niv: { RED: "Rojo", ORANGE: "Naranja", YELLOW: "Amarillo", GREEN: "Verde", DIAMOND: "Diamante" },
    det: {
      control: (c) => c.p > 0 ? "Nadie puede crear más ni congelar" : c.p <= -25 ? "Puede congelar tu saldo" : "Cobra o ejecuta código al transferir",
      oficial: (c) => c.p > 0 ? "Es el token del proyecto o de un emisor revisado" : "Emisor que aún no hemos revisado",
      claves: (c) => c.p > 0 ? "Sin cambios" : "Han cambiado sin revisar",
      crear: "Pueden crear más tokens", congelar: "Pueden congelar saldos", mover: "Puede mover o quemar tokens de cualquiera",
      comision: "Puede cobrar una comisión al transferir", lp: "Solo una parte está bloqueada", creador: "Sus tokens anteriores siguen vivos",
      uso: "Se usa mucho", copia: "Copia de otro token", edad: "Más de dos años", ingresos: "El proyecto se queda una parte" },
    en30: " en 30 días", top10: "Las 10 mayores tienen el ", mayor: "La mayor tiene el ", anos: " años", dias: " días",
    traders: " wallets en 24 h", sobre: " sobre 100", wallets: " wallets", defillama: " en DefiLlama", codigo: (d) => "Último cambio hace " + d + " días",
    nadaBloq: "Nada bloqueado", libera: (a, b) => "Se libera el " + a + " en 30 días · bloqueado el " + b,
    hackeo: " sin devolver en el último año", hackViejo: "Uno antiguo", negocio0: "Nada vuelve al token" },
  en: { tit: "SolFlag score, day by day", hoy: "Today", h7: "7 days ago", h30: "30 days ago", todo: "All", d7: "7d", d30: "30d",
    tope: "the top for a meme", falta: "We do not have it yet", nada: "—",
    empieza: (f) => "We started saving it on " + f + ". Here you will see every day how it changes and why.",
    sinCambios: (f) => "No changes since " + f + ".",
    otros: "The way one section is scored changed.",
    pie: "We work it out every day with the same engine as the Scanner. It only moves when a section changes; days without changes are not listed.",
    como: "How the score is decided →", aria: (a, b, n) => "SolFlag score over the last " + n + " days: from " + a + " to " + b,
    niv: { RED: "Red", ORANGE: "Orange", YELLOW: "Yellow", GREEN: "Green", DIAMOND: "Diamond" },
    det: {
      control: (c) => c.p > 0 ? "Nobody can mint more or freeze" : c.p <= -25 ? "Can freeze your balance" : "Charges or runs code on transfers",
      oficial: (c) => c.p > 0 ? "The project token or a reviewed issuer" : "An issuer we have not reviewed yet",
      claves: (c) => c.p > 0 ? "No changes" : "Changed without review",
      crear: "More tokens can be minted", congelar: "Balances can be frozen", mover: "Can move or burn anyone's tokens",
      comision: "Can charge a fee on transfers", lp: "Only part of it is locked", creador: "Their earlier tokens are still alive",
      uso: "Used a lot", copia: "Copy of another token", edad: "More than two years", ingresos: "The project keeps a share" },
    en30: " in 30 days", top10: "The top 10 hold ", mayor: "The largest holds ", anos: " years", dias: " days",
    traders: " wallets in 24h", sobre: " out of 100", wallets: " wallets", defillama: " on DefiLlama", codigo: (d) => "Last change " + d + " days ago",
    nadaBloq: "Nothing locked", libera: (a, b) => "Unlocks " + a + " in 30 days · still locked " + b,
    hackeo: " not returned in the last year", hackViejo: "An old one", negocio0: "Nothing goes back to the token" },
};
// color de cada nivel y franjas de la barra del Escáner (0-25-50-75-90-110)
const COL = { RED: "#ff6b6b", ORANGE: "#fb923c", YELLOW: "#fbbf24", GREEN: "#4ade80", DIAMOND: "#7dd3fc" };
const BANDAS = [[0, 25, "#ff6b6b"], [25, 50, "#fb923c"], [50, 75, "#fbbf24"], [75, 90, "#4ade80"], [90, 110, "#7dd3fc"]];

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const pct = (x, L) => nf(Math.round(Number((x * 1000).toPrecision(12))) / 10, 1, L) + (L === "en" ? "%" : " %");

// el dato de un chequeo en una línea (como ckDet de la web)
export function dato(c, L) {
  const x = TXT[L] || TXT.es, d = c.d;
  if (c.col === "falta") return x.falta;
  if (d === null || d === undefined) { const f = x.det[c.k]; return typeof f === "function" ? f(c) : f || ""; }
  switch (c.k) {
    case "liquidez": case "volumen": case "depositos": return usd(d, L);
    case "comisiones": case "ingresos": return usd(d, L) + x.en30;
    case "negocio": return d > 0 ? usd(d, L) + x.en30 : x.negocio0;
    case "reparto": return x.top10 + pct(d / 100, L);
    case "wallet": return x.mayor + pct(d / 100, L);
    case "edad": return d >= 365 ? nf(d / 365, 1, L) + x.anos : Math.round(d) + x.dias;
    case "tendencia": case "titularesC": case "precio": return (d > 0 ? "+" : "") + pct(d, L);
    case "traders": return nf(d, 0, L) + x.traders;
    case "organico": return Math.round(d) + x.sobre;
    case "titulares": return nf(d, 0, L) + x.wallets;
    case "auditorias": return d + x.defillama;
    case "codigo": return x.codigo(d);
    case "desbloqueos": return !d.lib && !d.bloq ? x.nadaBloq : x.libera(pct(d.lib / 100, L), pct(d.bloq / 100, L));
    case "hackeo": return d > 0 ? usd(d, L) + x.hackeo : x.hackViejo;
  }
  return "";
}

// filas de D1 → [{dia, pts, tier, ap, ck: [{k, col, p, d}]}] ordenadas por día
export function leer(rows) {
  return (rows || []).map((r) => {
    let ck = [];
    try { ck = JSON.parse(r.ck || "[]").map(([k, col, p, d]) => ({ k, col, p, d })); } catch (e) {}
    return { dia: r.dia, pts: r.pts, tier: r.tier, ap: r.ap, ck };
  }).filter((r) => typeof r.pts === "number").sort((a, b) => (a.dia < b.dia ? -1 : 1));
}

// antes → ahora sin repetir el principio común: «Las 10 mayores tienen el 37 % → 29 %» (con «·», entero)
export function antesAhora(a, b) {
  if (!a || !b || a === b) return b || a || "";
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const pre = a.slice(0, i).lastIndexOf(" ") + 1;
  return a + " → " + (pre >= 8 && a.indexOf("·") < 0 && b.indexOf("·") < 0 ? b.slice(pre) : b);
}

// los días en que cambió la nota, con los chequeos cuyos puntos cambiaron (de antes → ahora), el más reciente primero
export function cambios(serie) {
  const out = [];
  for (let i = 1; i < serie.length; i++) {
    const a = serie[i - 1], b = serie[i];
    if (a.pts === b.pts) continue;
    const ant = {}; a.ck.forEach((c) => { ant[c.k] = c; });
    const ck = [];
    b.ck.forEach((c) => { const o = ant[c.k]; if (!o || o.p !== c.p) ck.push({ k: c.k, antes: o || null, ahora: c }); delete ant[c.k]; });
    Object.values(ant).forEach((o) => { if (o.p) ck.push({ k: o.k, antes: o, ahora: null }); });
    ck.sort((x, y) => Math.abs(((y.ahora && y.ahora.p) || 0) - ((y.antes && y.antes.p) || 0)) - Math.abs(((x.ahora && x.ahora.p) || 0) - ((x.antes && x.antes.p) || 0)));
    out.push({ dia: b.dia, de: a.pts, a: b.pts, ck });
  }
  return out.reverse();
}

const fechaDia = (dia, L) => { const [, m, d] = dia.split("-"); return L === "en" ? +m + "/" + +d : +d + "/" + +m; };
const diaMs = (dia) => Date.parse(dia + "T00:00:00Z");

// gráfica en escalones de los últimos n días (n = 0: todo); el eje empieza en la franja de debajo del mínimo
function grafica(serie, n, L, x) {
  const fin = diaMs(serie[serie.length - 1].dia);
  const s = n ? serie.filter((r) => diaMs(r.dia) > fin - n * DAY) : serie;
  if (s.length < 2) return "";
  const ini = diaMs(s[0].dia), span = Math.max(fin - ini, DAY);
  const min = Math.min.apply(null, s.map((r) => r.pts)), Y0 = BANDAS.map((b) => b[0]).filter((b) => b <= min - 5).pop() || 0;
  const W = 640, H = 190, PL = 30, PR = 10, PT = 10, PB = 24;
  const X = (t) => PL + ((t - ini) / span) * (W - PL - PR), Y = (v) => PT + (1 - (Math.max(v, Y0) - Y0) / (110 - Y0)) * (H - PT - PB);
  let g = "";
  BANDAS.filter((b) => b[1] > Y0).forEach(([a, b, c]) => {
    const lo = Math.max(a, Y0);
    g += '<rect x="' + PL + '" y="' + Y(b) + '" width="' + (W - PL - PR) + '" height="' + (Y(lo) - Y(b)) + '" fill="' + c + '" opacity=".07"/>' +
      '<line x1="' + PL + '" x2="' + (W - PR) + '" y1="' + Y(b) + '" y2="' + Y(b) + '" stroke="' + c + '" stroke-opacity=".18" stroke-dasharray="2 4"/>' +
      '<text x="' + (PL - 6) + '" y="' + (Y(b) + 4) + '" text-anchor="end">' + b + "</text>";
  });
  let d = "M" + X(ini).toFixed(1) + "," + Y(s[0].pts).toFixed(1), puntos = "";
  for (let i = 1; i < s.length; i++) {
    const t = X(diaMs(s[i].dia)).toFixed(1);
    d += "H" + t + "V" + Y(s[i].pts).toFixed(1);
    if (s[i].pts !== s[i - 1].pts) puntos += '<circle class="pt" data-d="' + s[i].dia + '" cx="' + t + '" cy="' + Y(s[i].pts).toFixed(1) + '" r="5" fill="#05040d" stroke="' + (COL[s[i].tier] || "#f1eeff") + '" stroke-width="2.5"/>';
  }
  const ult = s[s.length - 1];
  const marcas = [s[0], s[Math.floor((s.length - 1) / 2)], ult].filter((r, i, a) => a.indexOf(r) === i);
  const ejeX = marcas.map((r, i) => '<text x="' + X(diaMs(r.dia)).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="' + (r === s[0] ? "start" : r === ult ? "end" : "middle") + '">' + fechaDia(r.dia, L) + "</text>").join("");
  return '<svg class="hn-g" data-r="' + n + '" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(x.aria(s[0].pts, ult.pts, Math.round(span / DAY))) + '">' + g +
    '<path d="' + d + '" fill="none" stroke="#f1eeff" stroke-width="2" stroke-linejoin="round"/>' + puntos +
    '<circle cx="' + X(fin).toFixed(1) + '" cy="' + Y(ult.pts).toFixed(1) + '" r="4" fill="' + (COL[ult.tier] || "#f1eeff") + '"/>' + ejeX + "</svg>";
}

// la tarjeta entera (cuerpo; el título lo pone la ficha). rows = filas de D1; "" si no hay ninguna
export function notaHTML(rows, L, como) {
  const x = TXT[L] || TXT.es, nom = NOM[L] || NOM.es;
  const serie = leer(rows);
  if (!serie.length) return "";
  const hoy = serie[serie.length - 1], fin = diaMs(hoy.dia);
  const hace = (n) => { const r = serie.filter((s) => diaMs(s.dia) <= fin - n * DAY).pop(); return r || null; };
  const dif = (r) => { if (!r) return ""; const d = hoy.pts - r.pts; return '<b class="' + (d > 0 ? "lo" : d < 0 ? "hi" : "") + '">' + (d > 0 ? "+" : "") + d + "</b>"; };
  const niv = x.niv[hoy.tier] || "";
  const topeMeme = hoy.ap === "meme" && hoy.tier === "GREEN" && hoy.pts >= 90;
  const r7 = hace(7), r30 = hace(30);
  let cab = '<div class="hn-top"><div><span>' + x.hoy + '</span><b style="color:' + (COL[hoy.tier] || "inherit") + '">' + hoy.pts + "</b><small>/ 110" + (niv ? " · " + niv + (topeMeme ? ", " + x.tope : "") : "") + "</small></div>" +
    (r7 ? "<div><span>" + x.h7 + "</span><b>" + r7.pts + "</b>" + dif(r7) + "</div>" : "") + (r30 ? "<div><span>" + x.h30 + "</span><b>" + r30.pts + "</b>" + dif(r30) + "</div>" : "");
  if (serie.length < 2) return cab + '</div><p class="hn-pie">' + x.empieza(fechaDia(serie[0].dia, L)) + ' <a href="' + como + '">' + x.como + "</a></p>";
  // rangos: con una semana o menos, una sola gráfica; luego 7 d y 30 d, y «Todo» cuando hay más de 30 días
  const dias = (fin - diaMs(serie[0].dia)) / DAY;
  const rangos = dias <= 7 ? [[0, x.todo]] : [[7, x.d7], [30, x.d30]].concat(dias > 30 ? [[0, x.todo]] : []);
  const sel = dias <= 7 ? 0 : 30;
  const svgs = rangos.map(([n]) => grafica(serie, n, L, x).replace("<svg ", "<svg " + (n === sel ? "" : "hidden "))).join("");
  if (rangos.length > 1) cab += '<div class="hn-r">' + rangos.map(([n, s]) => '<button type="button" data-r="' + n + '" aria-pressed="' + (n === sel) + '">' + s + "</button>").join("") + "</div>";
  cab += "</div>";
  const cs = cambios(serie);
  const lista = cs.length ? '<ol class="hn-l">' + cs.slice(0, 20).map((c) => {
    const s = c.a - c.de;
    const porque = c.ck.slice(0, 2).map((k) => {
      const ant = k.antes ? dato(k.antes, L) : "", aho = k.ahora ? dato(k.ahora, L) : "";
      return '<span class="hn-t"><em>' + esc(nom[k.k] || k.k) + "</em>" + esc(antesAhora(ant, aho)) + "</span>";
    }).join("") || '<span class="hn-t">' + x.otros + "</span>";
    return '<li data-d="' + c.dia + '"><span class="when">' + fechaDia(c.dia, L) + '</span><span class="hn-d ' + (s > 0 ? "lo" : "hi") + '">' + c.de + " → " + c.a + " <i>" + (s > 0 ? "+" : "") + s + '</i></span><span class="hn-ws">' + porque + "</span></li>";
  }).join("") + "</ol>" : '<p class="hn-pie">' + x.sinCambios(fechaDia(serie[0].dia, L)) + "</p>";
  return cab + svgs + lista + '<p class="hn-pie">' + x.pie + ' <a href="' + como + '">' + x.como + "</a></p>";
}

export const NOTA_TIT = { es: TXT.es.tit, en: TXT.en.tit };
export const NOTA_CSS = ".hn-top{display:flex;align-items:flex-end;gap:26px;flex-wrap:wrap;margin-bottom:8px}.hn-top span{display:block;color:var(--dim);font-size:12px}" +
  ".hn-top b{font:600 26px Fraunces,serif;margin-right:6px}.hn-top b.lo,.hn-top b.hi{font:700 13px Manrope,sans-serif}.hn-top small{color:var(--dim);font-size:12px}" +
  ".hn-r{margin-left:auto;display:flex;gap:4px}.hn-r button{font:600 12px Manrope,sans-serif;color:var(--dim);background:none;border:1px solid var(--line);border-radius:8px;padding:4px 10px;cursor:pointer}" +
  ".hn-r button[aria-pressed=true]{background:var(--tq);color:var(--bg);border-color:var(--tq)}.hn-g{display:block;width:100%;height:auto;font:11px monospace;fill:var(--dim)}.hn-g[hidden]{display:none}.hn-g .pt{cursor:pointer}" +
  ".hn-l{list-style:none;margin:10px 0 0;padding:0}.hn-l li{display:grid;grid-template-columns:52px 96px minmax(0,1fr);gap:10px;align-items:baseline;padding:9px 0;border-top:1px solid var(--line2)}" +
  ".hn-l li.on{background:rgba(142,197,207,.06)}.hn-d{font:700 13px monospace}.hn-d i{font-style:normal;font-weight:600;opacity:.8}.hn-ws{display:flex;flex-direction:column;gap:4px}.hn-t{font-size:13px}" +
  ".hn-t em{font-style:normal;font-size:11px;color:var(--dim);border:1px solid var(--line);border-radius:99px;padding:1px 8px;margin-right:8px;white-space:nowrap}" +
  ".hn-pie{margin:10px 0 0;font-size:12px;color:var(--dim)}.hn-pie a{color:var(--tq)}" +
  "@media (max-width:600px){.hn-l li{grid-template-columns:44px minmax(0,1fr)}.hn-ws{grid-column:1/-1}.hn-r{margin-left:0}.hn-g{min-height:150px}}";
export const NOTA_JS = '<script>(function(){var c=document.querySelector(".hn");if(!c)return;' +
  'c.querySelectorAll(".hn-r button").forEach(function(b){b.onclick=function(){c.querySelectorAll(".hn-r button").forEach(function(o){o.setAttribute("aria-pressed",o===b);});' +
  'c.querySelectorAll(".hn-g").forEach(function(g){if(g.getAttribute("data-r")===b.getAttribute("data-r"))g.removeAttribute("hidden");else g.setAttribute("hidden","");});};});' +
  'c.addEventListener("click",function(e){var p=e.target.closest&&e.target.closest(".pt");if(!p)return;c.querySelectorAll(".hn-l li").forEach(function(l){var on=l.getAttribute("data-d")===p.getAttribute("data-d");l.classList.toggle("on",on);if(on)l.scrollIntoView({block:"nearest",behavior:"smooth"});});});})();</script>';
