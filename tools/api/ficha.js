// Ficha pública de cada token en https://token.solflag.com/<mint> (en inglés: /en/<mint>). Maqueta aprobada:
// maquetas/escaner/ficha-token-ejemplos.html. La sirve el mismo Worker que la API (worker.js la llama cuando la
// petición llega por token.solflag.com): HTML ya hecho, para que Google la lea y que al compartir el enlace salga la
// vista previa de ESE token.
//
// De dónde sale cada cosa:
//   · nuestra base D1 (la llena el recolector): quién pagó, creó y financió, con su historial; primeros compradores;
//     liquidez, nivel al lanzarse y resultado a 24 h; otros tokens del creador; cuántas veces se escaneó (pedidos)
//   · el registro publicado (solflag.com/datos/registro/AAAA-MM-DD.json): el resultado a los 7 días
//   · DexScreener, al abrirla: nombre, logo, capitalización y liquidez de hoy, y dónde cotiza
// Lo que no está (token grande que vimos tarde, sin compradores…) se dice en cada apartado, sin inventar.
// Solo hechos de la cadena: nunca «scam». Todo lo que viene de fuera (nombre, símbolo, logo) se escapa.
// Los textos están en la tabla T (es / en): la página es la misma en los dos idiomas.
//
//   GET /<mint>  ·  GET /en/<mint>   la ficha
//   GET /sitemap.xml                 las fichas de nuestra base (con su versión en inglés), para Google
//   GET /robots.txt
//   GET /  ·  GET /en                a solflag.com

export const HOST = "token.solflag.com";
const ADDR = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const DAY = 86400000;
const SITEMAP_MAX = 40000;      // el límite de un sitemap es 50.000 direcciones
const OTHERS = 8;               // otros tokens del creador que se enseñan
const SERIE = 3;                // desde cuántos lanzamientos se habla de «en serie»
const REPITE = 10;              // un comprador que entró en el primer bloque de 10 o más lanzamientos más: repetidor
// Topes de lectura: D1 cobra por fila leída, y una wallet en serie puede tener miles de lanzamientos. Se cuenta
// hasta el tope y la ficha dice «200+» o «1.000+». (11/11: Google leyó las 21.500 fichas en horas)
export const TOPE_COMPRAS = 200, TOPE_HISTORIAL = 1000;

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const short = (a) => (a ? a.slice(0, 4) + "…" + a.slice(-4) : "");
const pad = (n) => String(n).padStart(2, "0");
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// números: en español con el punto de miles también en 4 cifras (2.503) y sin ceros de sobra (51 y no 51,00);
// en inglés, 2,503 y 5.64
export function nf(n, d, lang) {
  const [i, f] = Math.abs(n).toFixed(d || 0).split(".");
  const dec = f ? f.replace(/0+$/, "") : "", en = lang === "en";
  return (n < 0 ? "-" : "") + i.replace(/\B(?=(\d{3})+(?!\d))/g, en ? "," : ".") + (dec ? (en ? "." : ",") + dec : "");
}
export function usd(n, lang) {
  if (n == null || !isFinite(n)) return "—";
  if (lang === "en") {
    if (n >= 1e9) return "$" + nf(n / 1e9, 2, "en") + "B";
    if (n >= 1e6) return "$" + nf(n / 1e6, n >= 1e8 ? 0 : 2, "en") + "M";
    return "$" + nf(n, 0, "en");
  }
  if (n >= 1e9) return nf(n / 1e9, 2) + " mil M$";
  if (n >= 1e6) return nf(n / 1e6, n >= 1e8 ? 0 : 2) + " M$";
  return nf(n) + " $";
}
function fechas(lang) {
  const en = lang === "en";
  const dm = (t) => { const d = new Date(t); return en ? MON[d.getUTCMonth()] + " " + d.getUTCDate() : pad(d.getUTCDate()) + "/" + pad(d.getUTCMonth() + 1); };
  const fecha = (t) => { const d = new Date(t); return en ? dm(t) + ", " + d.getUTCFullYear() : dm(t) + "/" + d.getUTCFullYear(); };
  const hora = (t) => { const d = new Date(t); return pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()); };
  return { dm: dm, fecha: fecha, hora: hora, fechaHora: (t) => fecha(t) + " · " + hora(t) + " UTC" };
}

// ---- textos. Las funciones reciben números ya formateados
const T = {
  es: {
    lang: "es", path: "", web: "https://solflag.com/", acierto: "https://solflag.com/acierto/", cc: "deed.es",
    nav: [["?v=escaner", "Escáner"], ["?v=lista", "Mi lista"], ["?v=confluencia", "Confluencia"]], bot: "Bot de Telegram", otro: "EN", otroTit: "English version",
    niveles: { HIGH: ["RIESGO ALTO", "ALTO"], MEDIUM: ["RIESGO MEDIO", "MEDIO"], LOW: ["RIESGO BAJO", "BAJO"], SPAM: ["SPAM", "SPAM"], NO_DATA: ["SIN DATOS", "SIN DATOS"], NO_MARKET: ["SIN MERCADO", "SIN MERCADO"] },
    curva: "curva de pump.fun",
    roles: { py: "pagó", cr: "creó", fu: "financió" }, y: " y ",
    motCr: (n, uno, res, dead) => "Su creador ha lanzado " + n + (uno ? " token más" : " tokens más") + (res ? ": de los " + res + " que ya cumplieron 24 h murieron " + dead + "." : "."),
    motFu: (n, res, dead) => "Quien financió al creador ha financiado " + n + " lanzamientos más" + (res ? ": murieron " + dead + " de " + res + " en 24 h." : "."),
    motNada: "Su creador no tiene más lanzamientos en nuestra base.",
    descNivel: (nv, d24) => "Riesgo " + nv.toLowerCase() + " al lanzarse" + (d24 == null ? "" : d24 ? ", murió en 24 h" : ", seguía vivo a las 24 h"),
    descHoy: (v) => "Capitalización hoy " + v, descFin: "Quién lo lanzó, quién lo financió y quién compró primero, en la ficha de SolFlag.",
    titulo: " · Ficha del token · SolFlag",
    estados: { nada: "sin datos", vivo: "con mercado hoy", muerto: "muerto en 24 h", seco: "sin liquidez hoy", vivo24: "vivo a las 24 h", espera: "esperando las 24 h" },
    sinLogo: "sin logo", dir: "Dirección", lanz: "Lanzamiento", plat: "Plataforma", dex: "DEX", estado: "Estado", consultas: "Consultas en SolFlag",
    chCara: "Cara conocida", chCreador: "Creador en serie", chFin: "Financiador en serie", chRep: (n) => (n === 1 ? "Un comprador repetidor" : n + " compradores repetidores"),
    selloDef: "Lo que dijo SolFlag al verlo nacer.", tarde: "Lo vimos tarde: no lo analizamos al lanzarse, así que no entra en el registro de aciertos.", noBase: "No está en nuestra base: no lo vimos nacer.",
    ahora: "Autoridades, liquidez bloqueada y reparto de holders se calculan al momento con el motor de SolFlag.", analizar: "Analizar en vivo",
    liqIni: "Liquidez inicial", curvaSin: "en la curva o sin dato", noNacer: "no lo vimos nacer", cap24: "Capitalización a 24 h", aunNo: "aún no",
    vol: "Volumen 24 h", enPrecio: " % en precio", hoyK: "Hoy", sinMercado: "sin mercado", liqHoy: (v) => "liquidez " + v,
    antesDel: (f) => "antes del " + f, antes: "antes", finTit: "Financiación del creador", quienFin: "Quién financió", haFin: (n) => n + " lanzamientos más", haFinK: "Ha financiado",
    finNo: "No disponible: no llegamos a la primera transacción del creador", noDisp: "No disponible",
    pagoCreo: "Pagó y creó", pago: "Pagó", creo: "Creó", quienPago: "Quién pagó", noDispMin: "no disponible", creaTit: "Creación del token", liq: "Liquidez",
    mismoBloque: "mismo bloque", compTit: "Primeras compras", comp2: "Compradores en 2 bloques", bloque0: "En el bloque 0", repK: "Repetidores", repV: (n, lista) => n + " (" + lista + " lanzamientos más)",
    compNo: "No disponible: no lo analizamos al nacer o ya tenía demasiadas transacciones",
    h24Tit: "Primeras 24 horas", murio: "¿Murió?", si: "sí", no: "no", cap: "Capitalización", aun24: "Aún no han pasado 24 h", noSeguia: "No disponible: no lo seguíamos",
    d7Tit: "A los 7 días", d7k: "7 días", muerto: "¿Muerto?", salidas: "Salidas de dinero", salidasNo: "Pendiente: lo estamos estudiando",
    hoy: "hoy", actual: "Estado actual", precio24: "Precio 24 h", mercado: "Mercado", ninguno: "ninguno",
    thMom: "Momento", thVer: "Veredicto", thRes: "Resultado", alLanzarse: "Al lanzarse", a24: "A las 24 h", a7: "A los 7 días", esperando: "esperando", murioV: "murió", seguiaVivo: "seguía vivo", muertoV: "muerto", elDia: (f) => "el " + f,
    enRegistro: "Entra en el registro público de aciertos:", datosAcierto: "Datos y acierto", fueraRegistro: "Fuera del registro de aciertos: no lo analizamos al lanzarse.",
    thSitio: "Sitio", ningunMercado: "Ningún mercado activo.", coste: "Coste de entrar y salir: próximamente.",
    chipCara: "cara conocida", chipFinSerie: "financiador en serie", chipSerie: "en serie", chipHist: "con historial", chipNada: "sin más lanzamientos con nosotros",
    wallet: "Wallet", otrosFin: "Otros financiados", otrosLanz: "Otros lanzamientos", muertos24: "Muertos en 24 h", de: " de ",
    detrasNo: "No llegamos a saber quién lo lanzó: tenía demasiadas transacciones cuando lo vimos.", detrasNoBase: "No está en nuestra base todavía.",
    thBloque: "Bloque", thOtros: "Otros lanz.", compNoTabla: "No disponible: no lo analizamos al nacer o tenía demasiadas transacciones.", compNoBase: "No disponible.",
    thToken: "Token", thFecha: "Fecha", thNivel: "Nivel", vivoV: "vivo", ningunoBase: "Ninguno en nuestra base.",
    avisoNoBase: (link) => "<b>Aún no está en nuestra base.</b> No lo vimos nacer, así que no sabemos quién lo lanzó ni quién compró primero. " + link + " y lo analizaremos en la próxima media hora.", escanealo: "Escanéalo en SolFlag",
    avisoParcial: "<b>Ficha parcial.</b> Lo vimos tarde o ya tenía demasiadas transacciones: lo que falta se indica en cada apartado.",
    fichaTec: "Ficha técnica", historial: "historial del token", actualizada: "Actualizada", compartir: "Compartir", copiado: "Enlace copiado", vigilar: "Vigilar en Telegram",
    secciones: ["Identificación", "Veredicto al lanzarse", "Riesgo técnico ahora", "Cifras clave", "Historial cronológico", "Qué dijimos y qué pasó", "Dónde cotiza", "Quién está detrás", "Primeros compradores", "Otros tokens del mismo creador"],
    fuentes: "Fuentes", fuentesTxt: "Base de SolFlag, RugCheck, DexScreener y nodos de Solana", citar: "Citar esta ficha", datos: "datos", correccion: "Corrección", algunDato: "¿Algún dato está mal?", pide: "Pide que lo corrijamos", asunto: "Corrección ficha ",
    nota: "Nota", notaTxt: "Solo hechos de la cadena. No es consejo de inversión.",
    nfTit: "Token no encontrado · SolFlag", nfH: "No encontramos este token", nfNoBase: "No está en nuestra base ni tiene mercado en DexScreener. ", nfInval: "Esa dirección no es válida. ", nfBusca: "Búscalo en el escáner de SolFlag"
  },
  en: {
    lang: "en", path: "en/", web: "https://solflag.com/en/", acierto: "https://solflag.com/en/accuracy/", cc: "deed.en",
    nav: [["?v=escaner", "Scanner"], ["?v=lista", "My list"], ["?v=confluencia", "Confluence"]], bot: "Telegram bot", otro: "ES", otroTit: "Versión en español",
    niveles: { HIGH: ["HIGH RISK", "HIGH"], MEDIUM: ["MEDIUM RISK", "MEDIUM"], LOW: ["LOW RISK", "LOW"], SPAM: ["SPAM", "SPAM"], NO_DATA: ["NO DATA", "NO DATA"], NO_MARKET: ["NO MARKET", "NO MARKET"] },
    curva: "pump.fun curve",
    roles: { py: "paid", cr: "created", fu: "funded" }, y: " and ",
    motCr: (n, uno, res, dead) => "Its creator has launched " + n + (uno ? " more token" : " more tokens") + (res ? ": of the " + res + " that already turned 24 h, " + dead + " died." : "."),
    motFu: (n, res, dead) => "Whoever funded the creator has funded " + n + " more launches" + (res ? ": " + dead + " of " + res + " died within 24 h." : "."),
    motNada: "Its creator has no other launches in our database.",
    descNivel: (nv, d24) => nv.charAt(0) + nv.slice(1).toLowerCase() + " risk at launch" + (d24 == null ? "" : d24 ? ", died within 24 h" : ", still alive at 24 h"),
    descHoy: (v) => "Market cap today " + v, descFin: "Who launched it, who funded it and who bought first, in its SolFlag file.",
    titulo: " · Token file · SolFlag",
    estados: { nada: "no data", vivo: "trading today", muerto: "dead within 24 h", seco: "no liquidity today", vivo24: "alive at 24 h", espera: "waiting for 24 h" },
    sinLogo: "no logo", dir: "Address", lanz: "Launch", plat: "Platform", dex: "DEX", estado: "Status", consultas: "Lookups on SolFlag",
    chCara: "Known face", chCreador: "Serial creator", chFin: "Serial funder", chRep: (n) => (n === 1 ? "One repeat buyer" : n + " repeat buyers"),
    selloDef: "What SolFlag said when it was born.", tarde: "We saw it late: we didn't analyze it at launch, so it isn't in the accuracy record.", noBase: "Not in our database: we didn't see it launch.",
    ahora: "Authorities, locked liquidity and holder distribution are calculated live by the SolFlag engine.", analizar: "Analyze live",
    liqIni: "Initial liquidity", curvaSin: "on the curve or no data", noNacer: "we didn't see it launch", cap24: "Market cap at 24 h", aunNo: "not yet",
    vol: "24 h volume", enPrecio: "% in price", hoyK: "Today", sinMercado: "no market", liqHoy: (v) => "liquidity " + v,
    antesDel: (f) => "before " + f, antes: "before", finTit: "Creator funding", quienFin: "Funded by", haFin: (n) => n + " more launches", haFinK: "Has funded",
    finNo: "Not available: we couldn't reach the creator's first transaction", noDisp: "Not available",
    pagoCreo: "Paid and created", pago: "Paid", creo: "Created", quienPago: "Paid by", noDispMin: "not available", creaTit: "Token creation", liq: "Liquidity",
    mismoBloque: "same block", compTit: "First buys", comp2: "Buyers in 2 blocks", bloque0: "In block 0", repK: "Repeat buyers", repV: (n, lista) => n + " (" + lista + " more launches)",
    compNo: "Not available: we didn't analyze it at launch or it already had too many transactions",
    h24Tit: "First 24 hours", murio: "Died?", si: "yes", no: "no", cap: "Market cap", aun24: "24 h haven't passed yet", noSeguia: "Not available: we weren't following it",
    d7Tit: "After 7 days", d7k: "7 days", muerto: "Dead?", salidas: "Money outflows", salidasNo: "Pending: we're studying it",
    hoy: "today", actual: "Current status", precio24: "24 h price", mercado: "Market", ninguno: "none",
    thMom: "When", thVer: "Verdict", thRes: "Outcome", alLanzarse: "At launch", a24: "At 24 h", a7: "After 7 days", esperando: "waiting", murioV: "died", seguiaVivo: "still alive", muertoV: "dead", elDia: (f) => "on " + f,
    enRegistro: "It's part of the public accuracy record:", datosAcierto: "Data & accuracy", fueraRegistro: "Not in the accuracy record: we didn't analyze it at launch.",
    thSitio: "Where", ningunMercado: "No active market.", coste: "Cost to get in and out: coming soon.",
    chipCara: "known face", chipFinSerie: "serial funder", chipSerie: "serial", chipHist: "has history", chipNada: "no other launches with us",
    wallet: "Wallet", otrosFin: "Other funded", otrosLanz: "Other launches", muertos24: "Dead within 24 h", de: " of ",
    detrasNo: "We couldn't find out who launched it: it had too many transactions when we saw it.", detrasNoBase: "Not in our database yet.",
    thBloque: "Block", thOtros: "Other launches", compNoTabla: "Not available: we didn't analyze it at launch or it had too many transactions.", compNoBase: "Not available.",
    thToken: "Token", thFecha: "Date", thNivel: "Level", vivoV: "alive", ningunoBase: "None in our database.",
    avisoNoBase: (link) => "<b>Not in our database yet.</b> We didn't see it launch, so we don't know who launched it or who bought first. " + link + " and we'll analyze it within the next half hour.", escanealo: "Scan it on SolFlag",
    avisoParcial: "<b>Partial file.</b> We saw it late or it already had too many transactions: what's missing is noted in each section.",
    fichaTec: "Token file", historial: "token history", actualizada: "Updated", compartir: "Share", copiado: "Link copied", vigilar: "Watch on Telegram",
    secciones: ["Identification", "Verdict at launch", "Technical risk now", "Key figures", "Timeline", "What we said and what happened", "Where it trades", "Who is behind it", "First buyers", "Other tokens by the same creator"],
    fuentes: "Sources", fuentesTxt: "SolFlag database, RugCheck, DexScreener and Solana nodes", citar: "Cite this file", datos: "data", correccion: "Correction", algunDato: "Is any data wrong?", pide: "Ask us to fix it", asunto: "Correction token file ",
    nota: "Note", notaTxt: "On-chain facts only. Not investment advice.",
    nfTit: "Token not found · SolFlag", nfH: "We couldn't find this token", nfNoBase: "It's not in our database and has no market on DexScreener. ", nfInval: "That address isn't valid. ", nfBusca: "Look it up in the SolFlag scanner"
  }
};
export const NIVEL_CLASE = { HIGH: "hi", MEDIUM: "mi", LOW: "lo", SPAM: "hi", NO_DATA: "", NO_MARKET: "" };
const PLAT = { pump_fun: "pump.fun", pumpfun: "pump.fun", "pump-fun": "pump.fun", bonk: "LetsBonk", raydium_launchlab: "Raydium LaunchLab",
  launchlab: "Raydium LaunchLab", moonshot: "Moonshot", bags: "Bags", stonkfun: "Stonk.fun", believe: "Believe", meteora_dbc: "Meteora DBC" };
const DEXN = { pumpswap: "PumpSwap", raydium: "Raydium", meteora: "Meteora", orca: "Orca", "raydium-clmm": "Raydium CLMM", "raydium-cp": "Raydium CPMM",
  meteoradbc: "Meteora DBC", launchlab: "Raydium LaunchLab" };
const platName = (p) => PLAT[p] || p || "—";
const dexName = (d, t) => (d === "pump-fun" || d === "pumpfun" ? t.curva : DEXN[d] || d || "—");

async function all(db, sql, args) { return (await db.prepare(sql).bind(...args).all()).results || []; }
const SUM = "COUNT(*) AS n, SUM(dead24 IS NOT NULL) AS resolved, SUM(dead24 = 1) AS dead24";

// Todo lo que la base sabe del token. lanz null si no está (puede estar solo en pedidos)
export async function datosBase(db, m) {
  const r = (await all(db, "SELECT * FROM lanz WHERE m = ?1", [m]))[0] || null;
  const ped = (await all(db, "SELECT n FROM pedidos WHERE m = ?1", [m]).catch(() => []))[0];
  const out = { lanz: r, consultas: ped ? ped.n : 0, roles: [], buyers: [], others: [] };
  if (!r) return out;
  // quién está detrás: cada wallet una vez, con todos sus papeles en este token y su historial en el papel principal
  const seen = {};
  for (const c of ["py", "cr", "fu"]) {
    const w = r[c]; if (!w) continue;
    if (seen[w]) { seen[w].cols.push(c); continue; }
    const h = (await all(db, "SELECT " + SUM + " FROM (SELECT dead24 FROM lanz WHERE " + c + " = ?1 AND m <> ?2 LIMIT " + TOPE_HISTORIAL + ")", [w, m]))[0] || {};
    seen[w] = { wallet: w, col: c, cols: [c], n: h.n || 0, resolved: h.resolved || 0, dead24: h.dead24 || 0, tope: (h.n || 0) >= TOPE_HISTORIAL };
    out.roles.push(seen[w]);
  }
  out.buyers = await all(db, "SELECT c.w, c.d, (SELECT COUNT(*) FROM (SELECT 1 FROM compras x WHERE x.w = c.w AND x.m <> c.m LIMIT " + TOPE_COMPRAS + ")) AS otros FROM compras c WHERE c.m = ?1 ORDER BY c.d, c.w", [m]);
  if (r.cr) out.others = await all(db, "SELECT m, t, lvl, dead24 FROM lanz WHERE cr = ?1 AND m <> ?2 ORDER BY t DESC LIMIT " + OTHERS, [r.cr, m]);
  return out;
}

// DexScreener: pares donde el token es la base; el principal, el de más liquidez
export function mercado(pairs, m) {
  const ps = (Array.isArray(pairs) ? pairs : []).filter((p) => p && p.baseToken && p.baseToken.address === m);
  if (!ps.length) return null;
  ps.sort((a, b) => ((b.liquidity && b.liquidity.usd) || 0) - ((a.liquidity && a.liquidity.usd) || 0));
  const p = ps[0], dexes = {};
  ps.forEach((x) => { const k = x.dexId || "?"; dexes[k] = (dexes[k] || 0) + ((x.liquidity && x.liquidity.usd) || 0); });
  const img = p.info && p.info.imageUrl;
  return { name: p.baseToken.name, symbol: p.baseToken.symbol, image: /^https:\/\//.test(img || "") ? img : null,
    mc: p.marketCap || p.fdv || null, liq: ps.reduce((s, x) => s + ((x.liquidity && x.liquidity.usd) || 0), 0),
    dex: p.dexId, created: ps.reduce((t, x) => (x.pairCreatedAt && x.pairCreatedAt < t ? x.pairCreatedAt : t), Infinity),
    vol: p.volume && p.volume.h24, ch: p.priceChange && p.priceChange.h24,
    dexes: Object.keys(dexes).map((k) => ({ dex: k, liq: dexes[k] })).sort((a, b) => b.liq - a.liq) };
}

async function getJSON(url, ttl) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000), cf: { cacheTtl: ttl, cacheEverything: true } });
    return r.ok ? await r.json() : null;
  } catch (e) { return null; }
}

// Frase del veredicto: el hecho más fuerte que tenemos, en números
function motivo(d, t, n) {
  const by = (c) => d.roles.find((x) => x.cols.includes(c));
  const cr = by("cr") || by("py"), fu = by("fu");
  const nn = (x) => n(x.n) + (x.tope ? "+" : "");
  if (cr && cr.n && (cr.n >= SERIE || !(fu && fu.n >= SERIE))) return t.motCr(nn(cr), cr.n === 1, cr.resolved && !cr.tope ? n(cr.resolved) : 0, n(cr.dead24));
  if (fu && fu.n >= SERIE) return t.motFu(nn(fu), fu.resolved && !fu.tope ? n(fu.resolved) : 0, n(fu.dead24));
  if (cr) return t.motNada;
  return "";
}

const card = (n, title, body) => '<section class="card"><h2><span class="n">' + n + "</span> " + title + "</h2>" + body + "</section>";
const kv = (rows) => '<table class="kv">' + rows.map(([k, v, c]) => "<tr><td>" + k + '</td><td class="val ' + (c || "") + '">' + v + "</td></tr>").join("") + "</table>";
const f = (k, v, c) => '<span class="f">' + k + "<b" + (c ? ' class="' + c + '"' : "") + ">" + v + "</b></span>";
const na = (s) => '<span class="na">' + s + "</span>";
const ev = (when, title, fields, cls) => '<div class="ev ' + (cls || "") + '"><div class="when">' + when + '</div><div class="node"></div><div class="what"><b>' + title + '</b><div class="fields">' + fields + "</div></div></div>";
export const fichaUrl = (m, lang) => "https://" + HOST + "/" + (lang === "en" ? "en/" : "") + m;

// La página entera. d = datosBase, mk = mercado, reg = entrada del registro (o null), lang = "es" | "en"
export function pagina(m, d, mk, reg, now, lang) {
  const t = T[lang] || T.es, L = t.lang, F = fechas(L);
  const n = (x, dd) => nf(x, dd, L), $ = (x) => usd(x, L);
  const wlink = (w) => '<a href="' + t.web + "?wallet=" + esc(w) + '">' + esc(short(w)) + "</a>";
  const scan = t.web + "?token=" + esc(m);
  const r = d.lanz, url = fichaUrl(m, L);
  const name = (mk && mk.name) || (reg && reg.s) || short(m), sym = (mk && mk.symbol) || (reg && reg.s) || "";
  const nivel = r && r.lvl && t.niveles[r.lvl] ? t.niveles[r.lvl] : null, ncls = r && r.lvl ? NIVEL_CLASE[r.lvl] || "" : "";
  const born = r ? r.t : mk && isFinite(mk.created) ? mk.created : null;
  const dead = r && r.dead24 === 1, vivoHoy = mk && mk.mc && mk.liq > 0;
  const parcial = !r || (!r.py && !d.buyers.length);
  const mot = r ? motivo(d, t, n) : "";
  const pct = (x) => (x > 0 ? "+" : "") + n(x, 1) + (L === "en" ? "%" : " %");

  // ---- textos para Google y la vista previa
  const descBits = [];
  if (nivel) descBits.push(t.descNivel(nivel[1], r.dead24 == null ? null : dead));
  if (mot) descBits.push(mot.replace(/\.$/, ""));
  if (mk && mk.mc) descBits.push(t.descHoy($(mk.mc)));
  const desc = (descBits.length ? descBits.join(". ") + ". " : "") + t.descFin;
  const title = name + (sym && sym !== name ? " ($" + sym + ")" : "") + t.titulo;

  // ---- 01 identificación
  const es_ = t.estados;
  const estado = !r && !mk ? [es_.nada, ""] : vivoHoy ? [es_.vivo, "lo"] : dead ? [es_.muerto, "hi"] : mk ? [es_.seco, "hi"] : r && r.dead24 === 0 ? [es_.vivo24, "lo"] : [es_.espera, ""];
  const ident = '<div class="id"><div class="avatar">' + (mk && mk.image ? '<img src="' + esc(mk.image) + '" alt="" referrerpolicy="no-referrer">' : t.sinLogo) +
    "</div><div><h1>" + esc(name) + "</h1><small>" + esc(sym ? "$" + sym : "") + "</small></div></div>" +
    kv([[t.dir, '<span class="mono" title="' + esc(m) + '">' + esc(short(m)) + "</span>"],
      [t.lanz, born ? F.fechaHora(born) : "—"],
      [t.plat, r ? esc(platName(r.plat)) : "—"],
      [t.dex, esc(dexName((mk && mk.dex) || (r && r.dex), t))],
      [t.estado, estado[0], estado[1]],
      [t.consultas, n(d.consultas)]]);

  // ---- 02 veredicto al lanzarse
  const chips = [];
  if (r && r.cara) chips.push([t.chCara, "r"]);
  const crr = d.roles.find((x) => x.cols.includes("cr")), fur = d.roles.find((x) => x.cols.includes("fu"));
  if (crr && crr.n >= SERIE) chips.push([t.chCreador, "r"]);
  if (fur && fur.n >= SERIE) chips.push([t.chFin, "r"]);
  const rep = d.buyers.filter((b) => b.otros >= REPITE);
  if (rep.length) chips.push([t.chRep(rep.length), "y"]);
  const veredicto = nivel
    ? '<div class="sello ' + esc(r.lvl) + '"><b>' + nivel[0] + "</b><span>" + esc(mot || t.selloDef) + "</span></div>" +
      (chips.length ? '<div class="alert">' + chips.map(([s, c]) => '<span class="' + c + '">' + s + "</span>").join("") + "</div>" : "")
    : '<div class="pad">' + na(r ? t.tarde : t.noBase) + "</div>";

  // ---- 03 riesgo técnico ahora: se calcula al momento en el escáner
  const ahora = '<div class="pad"><p class="muted">' + t.ahora + '</p><a class="cta" href="' + scan + '">' + t.analizar + "</a></div>";

  // ---- 04 cifras clave
  const st = (k, v, sub, cls) => '<div class="st"><span>' + k + '</span><b class="' + (v === "—" ? "" : "on ") + (cls || "") + '">' + v + "</b>" + (sub ? na(sub) : "") + "</div>";
  const cifras = '<div class="stats">' +
    st(t.liqIni, r && r.liq ? $(r.liq) : "—", r ? (r.liq ? "" : t.curvaSin) : t.noNacer) +
    st(t.cap24, r && r.mc24 != null && r.dead24 != null ? $(r.mc24) : "—", r ? (r.dead24 == null ? t.aunNo : "") : t.noNacer, dead ? "hi" : "") +
    st(t.vol, mk && mk.vol != null ? $(mk.vol) : "—", mk && mk.ch != null ? pct(mk.ch).replace(/ ?%$/, "") + t.enPrecio : "") +
    st(t.hoyK, mk && mk.mc ? $(mk.mc) : t.sinMercado, mk && mk.liq ? t.liqHoy($(mk.liq)) : "", mk && mk.mc ? "" : "hi") + "</div>";

  // ---- 05 historial
  const evs = [];
  const fu = r && r.fu, py = r && r.py, cr = r && r.cr;
  evs.push(fu ? ev(born ? t.antesDel(F.dm(born)) : t.antes, t.finTit, f(t.quienFin, wlink(fu)) + (fur ? f(t.haFinK, t.haFin(n(fur.n) + (fur.tope ? "+" : ""))) : ""))
    : ev("—", t.finTit, na(r ? t.finNo : t.noDisp), "na-ev"));
  const quien = py && cr && py === cr ? f(t.pagoCreo, wlink(py)) : (py ? f(t.pago, wlink(py)) : "") + (cr ? f(t.creo, wlink(cr)) : "") + (!py ? f(t.quienPago, t.noDispMin, "dim") : "");
  evs.push(ev(born ? F.dm(born) + " · " + F.hora(born) : "—", t.creaTit, quien + (r ? f(t.plat, esc(platName(r.plat))) : "") + (r && r.liq ? f(t.liq, $(r.liq)) : "")));
  if (d.buyers.length) {
    const b0 = d.buyers.filter((b) => b.d === 0).length;
    evs.push(ev(t.mismoBloque, t.compTit, f(t.comp2, n(d.buyers.length)) + f(t.bloque0, n(b0)) +
      (rep.length ? f(t.repK, t.repV(n(rep.length), rep.map((b) => n(b.otros) + (b.otros >= TOPE_COMPRAS ? "+" : "")).join(t.y)), "hi") : "")));
  } else evs.push(ev("—", t.compTit, na(r ? t.compNo : t.noDisp), "na-ev"));
  if (r && r.dead24 != null) evs.push(ev(born ? F.dm(born + DAY) : "24 h", t.h24Tit, f(t.murio, dead ? t.si : t.no, dead ? "hi" : "lo") + (r.mc24 != null ? f(t.cap, $(r.mc24)) : "")));
  else evs.push(ev("—", t.h24Tit, na(r && born && now - born < DAY ? t.aun24 : t.noSeguia), r ? "p" : "na-ev"));
  if (reg && reg.d7) evs.push(ev(born ? F.dm(born + 7 * DAY) : t.d7k, t.d7Tit, f(t.muerto, reg.d7.dead ? t.si : t.no, reg.d7.dead ? "hi" : "lo") + (reg.d7.mc != null ? f(t.cap, $(reg.d7.mc)) : "")));
  evs.push(ev("—", t.salidas, na(t.salidasNo), "p"));
  evs.push(ev(t.hoy, t.actual, mk ? f(t.cap, $(mk.mc)) + f(t.liq, $(mk.liq)) + (mk.ch != null ? f(t.precio24, pct(mk.ch), mk.ch >= 0 ? "lo" : "hi") : "") : f(t.mercado, t.ninguno, "hi")));

  // ---- 06 qué dijimos y qué pasó
  let dijimos = '<table class="tb"><tr><th>' + t.thMom + "</th><th>" + t.thVer + "</th><th>" + t.thRes + "</th></tr>";
  if (nivel) {
    dijimos += '<tr><td class="val">' + t.alLanzarse + '</td><td class="val ' + ncls + '">' + nivel[1] + '</td><td class="val">—</td></tr>';
    dijimos += '<tr><td class="val">' + t.a24 + '</td><td class="val">—</td><td class="val ' + (r.dead24 == null ? "" : dead ? "hi" : "lo") + '">' + (r.dead24 == null ? t.esperando : dead ? t.murioV : t.seguiaVivo) + "</td></tr>";
    dijimos += '<tr><td class="val">' + t.a7 + '</td><td class="val">—</td><td class="val ' + (reg && reg.d7 ? (reg.d7.dead ? "hi" : "lo") : "") + '">' + (reg && reg.d7 ? (reg.d7.dead ? t.muertoV : t.seguiaVivo) : born ? t.elDia(F.dm(born + 7 * DAY)) : "—") + "</td></tr>";
    dijimos += '<tr><td colspan="3" class="na">' + t.enRegistro + ' <a href="' + t.acierto + '">' + t.datosAcierto + "</a>.</td></tr>";
  } else dijimos += '<tr><td colspan="3" class="na">' + t.fueraRegistro + "</td></tr>";
  dijimos += "</table>";

  // ---- 07 dónde cotiza
  let cotiza = '<table class="tb"><tr><th>' + t.thSitio + "</th><th>" + t.liq + "</th></tr>";
  cotiza += mk && mk.dexes.length ? mk.dexes.slice(0, 5).map((x) => '<tr><td class="val">' + esc(dexName(x.dex, t)) + '</td><td class="val">' + $(x.liq) + "</td></tr>").join("")
    : '<tr><td colspan="2" class="na">' + t.ningunMercado + "</td></tr>";
  cotiza += '<tr><td colspan="2" class="na">' + t.coste + "</td></tr></table>";

  // ---- 08 quién está detrás
  const detras = d.roles.length ? d.roles.map((x) => {
    const lab = x.cols.map((c) => t.roles[c]).join(t.y), serie = x.n >= SERIE;
    const chip = r.cara && x.col !== "fu" ? '<span class="chip hi">' + t.chipCara + "</span>" : serie ? '<span class="chip hi">' + (x.col === "fu" ? t.chipFinSerie : t.chipSerie) + "</span>" : '<span class="chip">' + (x.n ? t.chipHist : t.chipNada) + "</span>";
    return '<div class="per"><div class="r"><b>' + lab.charAt(0).toUpperCase() + lab.slice(1) + "</b>" + chip + '</div><div class="fields">' + f(t.wallet, wlink(x.wallet)) +
      f(x.col === "fu" ? t.otrosFin : t.otrosLanz, n(x.n) + (x.tope ? "+" : "")) + (x.resolved && !x.tope ? f(t.muertos24, n(x.dead24) + t.de + n(x.resolved), x.dead24 === x.resolved ? "hi" : "") : "") + "</div></div>";
  }).join("") : '<div class="pad">' + na(r ? t.detrasNo : t.detrasNoBase) + "</div>";

  // ---- 09 primeros compradores
  let comp = '<table class="tb"><tr><th>#</th><th>' + t.wallet + "</th><th>" + t.thBloque + "</th><th>" + t.thOtros + "</th></tr>";
  comp += d.buyers.length ? d.buyers.map((b, i) => '<tr><td class="val">' + (i + 1) + '</td><td class="val">' + wlink(b.w) + '</td><td class="val">' + (b.d ? "+" + b.d : "0") +
    '</td><td class="val ' + (b.otros >= REPITE ? "hi" : b.otros >= 3 ? "mi" : "") + '">' + n(b.otros) + (b.otros >= TOPE_COMPRAS ? "+" : "") + "</td></tr>").join("")
    : '<tr><td colspan="4" class="na">' + (r ? t.compNoTabla : t.compNoBase) + "</td></tr>";
  comp += "</table>";

  // ---- 10 otros tokens del creador
  let otros = '<table class="tb"><tr><th>' + t.thToken + "</th><th>" + t.thFecha + "</th><th>" + t.thNivel + "</th><th>24 h</th></tr>";
  otros += d.others.length ? d.others.map((o) => { const nv = t.niveles[o.lvl]; return '<tr><td class="val"><a href="' + fichaUrl(esc(o.m), L) + '">' + esc(o.m.slice(0, 6)) + "…</a></td><td class=\"val\">" + F.dm(o.t) +
    '</td><td class="val ' + (NIVEL_CLASE[o.lvl] || "") + '">' + (nv ? nv[1] : "—") + '</td><td class="val ' + (o.dead24 === 1 ? "hi" : "") + '">' + (o.dead24 == null ? t.esperando : o.dead24 ? t.murioV : t.vivoV) + "</td></tr>"; }).join("")
    : '<tr><td colspan="4" class="na">' + t.ningunoBase + "</td></tr>";
  otros += "</table>";

  const aviso = !r ? '<div class="warn">' + t.avisoNoBase('<a href="' + scan + '">' + t.escanealo + "</a>") + "</div>"
    : parcial ? '<div class="warn">' + t.avisoParcial + "</div>" : "";
  const hoy = F.fecha(now), S = t.secciones;
  const img = mk && mk.image ? mk.image : "https://solflag.com/" + (L === "en" ? "og-en.png" : "og.png") + "?v=2";
  const otroUrl = fichaUrl(m, L === "en" ? "es" : "en");

  return '<!doctype html><html lang="' + L + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    "<title>" + esc(title) + '</title><meta name="description" content="' + esc(desc) + '"><link rel="canonical" href="' + url + '">' +
    '<link rel="alternate" hreflang="es" href="' + fichaUrl(m, "es") + '"><link rel="alternate" hreflang="en" href="' + fichaUrl(m, "en") + '"><link rel="alternate" hreflang="x-default" href="' + fichaUrl(m, "es") + '">' +
    '<meta property="og:type" content="website"><meta property="og:site_name" content="SolFlag"><meta property="og:locale" content="' + (L === "en" ? "en_US" : "es_ES") + '"><meta property="og:title" content="' + esc(title) + '">' +
    '<meta property="og:description" content="' + esc(desc) + '"><meta property="og:url" content="' + url + '"><meta property="og:image" content="' + esc(img) + '">' +
    '<meta name="twitter:card" content="' + (mk && mk.image ? "summary" : "summary_large_image") + '"><meta name="twitter:site" content="@solflagTeam">' +
    '<link rel="icon" href="https://solflag.com/marca/solflag-icono.svg?v=1" type="image/svg+xml"><link rel="apple-touch-icon" href="https://solflag.com/marca/apple-touch-icon.png"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
    '<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600&family=Manrope:wght@400;600;700&family=Barlow+Condensed:wght@600;700&family=Unbounded:wght@700&display=swap" rel="stylesheet">' +
    "<style>" + CSS + "</style></head><body>" + cabecera(t, otroUrl) +
    '<div class="wrap"><header class="top"><span class="doc"><b>' + t.fichaTec + "</b> · " + t.historial + '</span><span class="num">' + HOST + "/" + t.path + esc(m) + '</span><span class="sp"></span>' +
    '<span class="doc">' + t.actualizada + " " + hoy + '</span><button class="btn" id="share" type="button">' + t.compartir + "</button>" +
    '<a class="btn" href="https://t.me/SolFlagBot">' + t.vigilar + '</a><a class="btn" href="' + scan + '">' + t.analizar + "</a></header>" + aviso +
    '<div class="grid"><div class="col">' + card("01", S[0], ident) + card("02", S[1], veredicto) + card("03", S[2], ahora) +
    '</div><div class="col">' + card("04", S[3], cifras) + card("05", S[4], '<div class="tl">' + evs.join("") + "</div>") +
    '<div class="two">' + card("06", S[5], dijimos) + card("07", S[6], cotiza) + "</div>" +
    '</div><div class="col">' + card("08", S[7], detras) + card("09", S[8], comp) + card("10", S[9], otros) + "</div></div>" +
    '<footer class="card"><div class="foot"><div><b>' + t.fuentes + "</b>" + t.fuentesTxt + " · " + hoy + "</div>" +
    "<div><b>" + t.citar + '</b><span class="mono">' + url + "</span> · " + t.datos + ' <a href="https://creativecommons.org/licenses/by-nc/4.0/' + t.cc + '">CC BY-NC 4.0</a></div>' +
    "<div><b>" + t.correccion + "</b>" + t.algunDato + ' <a href="mailto:solflag.team@gmail.com?subject=' + encodeURIComponent(t.asunto + m) + '">' + t.pide + "</a></div>" +
    "<div><b>" + t.nota + "</b>" + t.notaTxt + "</div></div></footer></div>" +
    '<script>document.getElementById("share").onclick=function(){var u=location.href,t=document.title;if(navigator.share)navigator.share({title:t,url:u}).catch(function(){});else if(navigator.clipboard)navigator.clipboard.writeText(u).then(function(){var b=document.getElementById("share");b.textContent=' + JSON.stringify(t.copiado) + ";setTimeout(function(){b.textContent=" + JSON.stringify(t.compartir) + "},1800)});};</script>" +
    '<script src="https://solflag.com/fondo.js?v=20261111d" defer></script></body></html>';
}

export function noEncontrado(m, lang) {
  const t = T[lang] || T.es;
  return '<!doctype html><html lang="' + t.lang + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + t.nfTit + "</title>" +
    '<meta name="robots" content="noindex"><link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600&family=Manrope:wght@400;700&family=Unbounded:wght@700&display=swap" rel="stylesheet"><style>' + CSS + "</style></head><body>" + cabecera(t, null) +
    '<div class="wrap"><section class="card"><div class="pad"><h1 class="nf">' + t.nfH + '</h1><p class="muted">' + (m ? t.nfNoBase : t.nfInval) +
    '<a href="' + t.web + (m ? "?token=" + esc(m) : "") + '">' + t.nfBusca + '</a>.</p></div></section></div><script src="https://solflag.com/fondo.js?v=20261111d" defer></script></body></html>';
}

const HTML_HEAD = { "content-type": "text/html; charset=utf-8", "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin" };
const page = (body, status, ttl) => new Response(body, { status: status, headers: Object.assign({}, HTML_HEAD, { "cache-control": ttl ? "public, max-age=" + ttl : "no-store" }) });

export async function sitemap(db) {
  const rows = await all(db, "SELECT m, t FROM lanz ORDER BY t DESC LIMIT " + SITEMAP_MAX, []);
  const alt = (m) => '<xhtml:link rel="alternate" hreflang="es" href="' + fichaUrl(m, "es") + '"/><xhtml:link rel="alternate" hreflang="en" href="' + fichaUrl(m, "en") + '"/>';
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    rows.map((r) => "<url><loc>" + fichaUrl(r.m, "es") + "</loc><lastmod>" + new Date(r.t).toISOString().slice(0, 10) + "</lastmod>" + alt(r.m) + "</url>").join("\n") + "\n</urlset>\n";
}

// fetchJSON(url, ttl) se puede cambiar en los tests
export async function ficha(req, env, fetchJSON) {
  const get = fetchJSON || getJSON;
  let path = new URL(req.url).pathname.replace(/\/+$/, ""), lang = "es";
  if (req.method !== "GET" && req.method !== "HEAD") return new Response(null, { status: 405 });
  if (path === "/en" || path.startsWith("/en/")) { lang = "en"; path = path.slice(3); }
  if (path === "") return Response.redirect(T[lang].web, 302);
  if (path === "/robots.txt" && lang === "es") return new Response("User-agent: *\nAllow: /\nSitemap: https://" + HOST + "/sitemap.xml\n", { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=86400" } });
  if (path === "/sitemap.xml" && lang === "es") {
    try { return new Response(await sitemap(env.DB), { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } }); }
    catch (e) { return new Response("", { status: 503 }); }
  }
  const m = path.slice(1);
  if (!ADDR.test(m)) return page(noEncontrado(null, lang), 404);
  let d;
  try { d = await datosBase(env.DB, m); } catch (e) { d = { lanz: null, consultas: 0, roles: [], buyers: [], others: [] }; }
  const day = d.lanz ? new Date(d.lanz.t).toISOString().slice(0, 10) : null;
  const [pairs, regDay] = await Promise.all([
    get("https://api.dexscreener.com/tokens/v1/solana/" + m, 300),
    day && d.lanz.lvl ? get("https://solflag.com/datos/registro/" + day + ".json", 3600) : null
  ]);
  const mk = mercado(pairs, m), reg = regDay && regDay.tokens ? regDay.tokens[m] || null : null;
  if (!d.lanz && !mk) return page(noEncontrado(m, lang), 404);
  return page(pagina(m, d, mk, reg, Date.now(), lang), 200, 21600);   // 6 h en la caché de Cloudflare
}

const LOGO = '<img class="ico" src="https://solflag.com/marca/solflag-icono.svg?v=1" alt="" width="42" height="42">';
function cabecera(t, otroUrl) {
  return '<header class="site"><a class="logo" href="' + t.web + '" title="SolFlag">' + LOGO + '<span class="wm">Solflag</span></a>' +
    '<nav class="pnav">' + t.nav.map(([q, s]) => '<a href="' + t.web + q + '">' + s + "</a>").join("") + '<a class="pbot" href="https://t.me/SolFlagBot">' + t.bot + "</a></nav>" +
    (otroUrl ? '<a class="plang" href="' + otroUrl + '" hreflang="' + (t.lang === "en" ? "es" : "en") + '" title="' + t.otroTit + '">' + t.otro + "</a>" : "") + "</header>";
}

const CSS = ":root{\n  --bg:#05040d; --card:rgba(8,6,22,.92); --line:rgba(196,181,253,.16); --line2:rgba(196,181,253,.09);\n  --txt:#f1eeff; --dim:#a99fd6; --tq:#8ec5cf; --hi:#ff6b6b; --mid:#fbbf24; --lo:#4ade80;\n}\n*{box-sizing:border-box}\nhtml{background:var(--bg);overflow-x:clip}\nbody{margin:0;background:none;color:var(--txt);font:14px/1.45 Manrope,sans-serif;min-height:100vh}\n.wrap{max-width:1680px;margin:0 auto;padding:20px 24px 48px}\n/* barra superior tipo expediente */\n.top{display:flex;align-items:center;gap:18px;flex-wrap:wrap;border:1px solid var(--line);border-radius:14px;background:var(--card);padding:12px 18px;margin-bottom:16px}\n.logo{font:700 24px 'Barlow Condensed',sans-serif;letter-spacing:.05em;color:var(--tq)}\n.doc{font:600 13px 'Barlow Condensed',sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--dim)}\n.doc b{color:var(--txt);font-size:16px;letter-spacing:.08em}\n.num{font:13px monospace;color:var(--dim);border:1px dashed var(--line);border-radius:8px;padding:4px 10px}\n.top .sp{flex:1}\n.btn{border:1px solid var(--line);border-radius:10px;padding:7px 12px;font-weight:600;font-size:13px;white-space:nowrap}\n.leg{display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--dim);margin:0 4px 14px}\n.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;vertical-align:1px}\n.d-ya{background:var(--lo)} .d-mo{background:var(--tq)} .d-pe{background:var(--mid)}\n/* rejilla de 3 columnas */\n.grid{display:grid;grid-template-columns:320px minmax(0,1fr) 400px;gap:16px;align-items:start}\n.col{display:flex;flex-direction:column;gap:16px;min-width:0}\n.card{background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden}\n.card h2{margin:0;font:600 13px 'Barlow Condensed',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--tq);padding:10px 14px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:8px}\n.card h2 .n{color:var(--dim);font-weight:600}\n.card h2 .dot{margin:0 0 0 auto}\n.pad{padding:12px 14px}\n/* tablas campo/valor */\ntable{width:100%;border-collapse:collapse}\ntd,th{padding:7px 14px;border-bottom:1px solid var(--line2);text-align:left;vertical-align:top}\ntr:last-child td{border-bottom:0}\n.kv td:first-child{color:var(--dim);width:44%;font-size:13px}\n.v{color:var(--dim);opacity:.55;font-family:monospace}\nth{font:600 11px 'Barlow Condensed',sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--dim);background:rgba(196,181,253,.05)}\n.tb td{color:var(--dim);opacity:.55;font-family:monospace}\n/* identidad */\n.id{display:flex;gap:12px;align-items:center;padding:14px}\n.avatar{width:56px;height:56px;border-radius:50%;border:1px dashed var(--line);display:grid;place-items:center;color:var(--dim);font-size:11px;flex:none}\n.id h1{margin:0;font:600 22px Fraunces,serif}\n.id small{color:var(--dim)}\n.sello{margin:0 14px 14px;border:2px dashed var(--line);border-radius:12px;padding:14px;text-align:center}\n.sello b{display:block;font:600 18px Fraunces,serif;margin-bottom:4px}\n.sello span{color:var(--dim);font-size:12px}\n.bar{display:flex;height:8px;border-radius:99px;overflow:hidden;margin-top:10px}\n.bar i{flex:1}\n/* historial cronológico */\n.tl{position:relative;padding:6px 14px 6px 14px}\n.ev{display:grid;grid-template-columns:130px 22px minmax(0,1fr);gap:0 10px;padding:10px 0;border-bottom:1px solid var(--line2)}\n.ev:last-child{border-bottom:0}\n.when{font:12px monospace;color:var(--dim);padding-top:2px}\n.node{position:relative}\n.node:before{content:\"\";position:absolute;left:10px;top:-12px;bottom:-12px;width:2px;background:var(--line)}\n.node:after{content:\"\";position:absolute;left:5px;top:4px;width:12px;height:12px;border-radius:50%;background:var(--bg);border:2px solid var(--tq)}\n.ev.p .node:after{border-color:var(--mid)}\n.what b{display:block;margin-bottom:4px}\n.fields{display:flex;flex-wrap:wrap;gap:6px}\n.f{font-size:12px;color:var(--dim);border:1px solid var(--line2);border-radius:7px;padding:3px 8px}\n.f em{font-style:normal;opacity:.55;font-family:monospace;margin-left:6px}\n/* cifras grandes */\n.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))}\n.st{padding:14px;border-right:1px solid var(--line2)}\n.st:last-child{border-right:0}\n.st span{display:block;color:var(--dim);font-size:12px}\n.st b{display:block;font:600 24px Fraunces,serif;color:var(--dim);opacity:.5;margin-top:4px}\n.two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}\n/* personas */\n.per{padding:12px 14px;border-bottom:1px solid var(--line2)}\n.per:last-child{border-bottom:0}\n.per .r{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px}\n.per .r b{font-size:14px}\n.chip{font-size:11px;color:var(--dim);border:1px dashed var(--line);border-radius:99px;padding:1px 8px}\nfooter.card{margin-top:16px}\n.foot{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))}\n.foot div{padding:12px 14px;border-right:1px solid var(--line2);color:var(--dim);font-size:13px}\n.foot div:last-child{border-right:0}\n.foot b{display:block;color:var(--txt);margin-bottom:4px;font-size:13px}\n@media (max-width:1280px){ .grid{grid-template-columns:300px minmax(0,1fr)} .grid>.col:last-child{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr))} }\n@media (max-width:900px){ .grid{grid-template-columns:1fr} .grid>.col:last-child{grid-template-columns:1fr} .two,.foot{grid-template-columns:1fr} .stats{grid-template-columns:repeat(2,minmax(0,1fr))} .ev{grid-template-columns:96px 22px minmax(0,1fr)} .wrap{padding:16px} }\n/* cabecera de la web (como las páginas sueltas) */\n.site{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:10px 26px;min-height:68px;max-width:1680px;margin:0 auto;padding:0 24px;background:rgba(5,4,13,.6);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}\n.site .logo{display:flex;align-items:center;gap:11px;text-decoration:none}\n.site .logo svg,.site .logo .ico{width:42px;height:42px;flex:none}\n.wm{display:inline-block;font-family:Unbounded,'Arial Black',sans-serif;font-weight:700;font-size:26px;line-height:1.15;letter-spacing:-.03em;background:linear-gradient(90deg,#7fd0dc,#9fb4f2 50%,#c4b5fd);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-mask-image:linear-gradient(90deg,#000 55%,rgba(0,0,0,.3));mask-image:linear-gradient(90deg,#000 55%,rgba(0,0,0,.3))}\n.pnav{display:flex;align-items:center;gap:4px 24px;margin-left:auto;font-weight:700;font-size:.95rem}\n.pnav a{color:#d8d2f5;text-decoration:none;padding:8px 0}\n.plang{width:40px;height:40px;display:grid;place-items:center;border:1px solid rgba(196,181,253,.3);border-radius:50%;color:var(--tq);font-size:.8rem;font-weight:700;text-decoration:none;flex:none}\n@media (max-width:760px){ .pnav a:not(.pbot){display:none} .site{padding:0 16px} .site .logo svg,.site .logo .ico{width:36px;height:36px} .wm{font-size:21px} }\n@media (max-width:420px){ .pnav{display:none} .plang{margin-left:auto} }\n.btn{background:rgba(255,255,255,.04)}\n.top .logo{display:none}\n.num{max-width:100%;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.val{color:var(--txt);font-family:monospace;font-size:13px}\n.tb td.val, .tb td.ok{opacity:1;color:var(--txt)}\n.na{color:var(--dim);font-style:italic;font-size:12px}\n.f b{font-weight:600;color:var(--txt);margin-left:6px;font-family:monospace}\n.st b.on{opacity:1;color:var(--txt)}\n.hi{color:var(--hi)!important} .lo{color:var(--lo)!important} .mi{color:var(--mid)!important}\n.sello.HIGH{border-color:var(--hi);border-style:solid} .sello.HIGH b{color:var(--hi)}\n.sello.LOW{border-color:var(--lo);border-style:solid} .sello.LOW b{color:var(--lo)}\n.warn{border:1px solid var(--mid);background:rgba(251,191,36,.08);border-radius:12px;padding:10px 14px;margin:0 0 14px;font-size:13px;color:var(--txt)}\n.warn b{color:var(--mid)}\n.ev.na-ev .node:after{border-color:var(--dim);border-style:dashed}\n.ev.na-ev .what b{color:var(--dim)}\n.alert{display:flex;gap:8px;flex-wrap:wrap;padding:0 14px 14px}\n.alert span{font-size:12px;border-radius:99px;padding:3px 10px;border:1px solid var(--line)}\n.alert .r{border-color:var(--hi);color:var(--hi)} .alert .g{border-color:var(--lo);color:var(--lo)} .alert .y{border-color:var(--mid);color:var(--mid)}\n.tb td.na,.tb td.val{opacity:1}.tb td.na{color:var(--dim)}\na{color:var(--tq)}.val a,.f a{color:inherit;text-decoration:none;border-bottom:1px dotted var(--line)}.val a:hover,.f a:hover{color:var(--tq)}\n.mono{font-family:monospace}.muted{color:var(--dim);margin:0 0 12px}.dim{opacity:.6}\n.avatar{overflow:hidden}.avatar img{width:100%;height:100%;object-fit:cover}\n.cta{display:inline-block;background:var(--tq);color:var(--bg);font-weight:700;border-radius:10px;padding:9px 14px;text-decoration:none}\nbutton.btn{font:600 13px Manrope,sans-serif;color:var(--txt);cursor:pointer}a.btn{color:var(--txt);text-decoration:none}\n.nf{margin:0 0 8px;font:600 24px Fraunces,serif}\n.foot .mono{word-break:break-all}\n.warn a{color:var(--mid)}";
