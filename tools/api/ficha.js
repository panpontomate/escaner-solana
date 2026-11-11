// Ficha pública de cada token en https://token.solflag.com/<mint> (maqueta aprobada: maquetas/escaner/ficha-token-ejemplos.html).
// La sirve el mismo Worker que la API (worker.js la llama cuando la petición llega por token.solflag.com): HTML ya hecho,
// para que Google la lea y que al compartir el enlace salga la vista previa de ESE token.
//
// De dónde sale cada cosa:
//   · nuestra base D1 (la llena el recolector): quién pagó, creó y financió, con su historial; primeros compradores;
//     liquidez, nivel al lanzarse y resultado a 24 h; otros tokens del creador; cuántas veces se escaneó (pedidos)
//   · el registro publicado (solflag.com/datos/registro/AAAA-MM-DD.json): el resultado a los 7 días
//   · DexScreener, al abrirla: nombre, logo, capitalización y liquidez de hoy, y dónde cotiza
// Lo que no está (token grande que vimos tarde, sin compradores…) se dice en cada apartado, sin inventar.
// Solo hechos de la cadena: nunca «scam». Todo lo que viene de fuera (nombre, símbolo, logo) se escapa.
//
//   GET /<mint>        la ficha
//   GET /sitemap.xml   las fichas de nuestra base, para Google
//   GET /robots.txt
//   GET /              a solflag.com

export const HOST = "token.solflag.com";
const ADDR = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const DAY = 86400000;
const SITEMAP_MAX = 45000;      // el límite de un sitemap es 50.000 direcciones
const OTHERS = 8;               // otros tokens del creador que se enseñan
const SERIE = 3;                // desde cuántos lanzamientos se habla de «en serie»
const REPITE = 10;              // un comprador que entró en el primer bloque de 10 o más lanzamientos más: repetidor

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const short = (a) => (a ? a.slice(0, 4) + "…" + a.slice(-4) : "");
const pad = (n) => String(n).padStart(2, "0");
const fecha = (t) => { const d = new Date(t); return pad(d.getUTCDate()) + "/" + pad(d.getUTCMonth() + 1) + "/" + d.getUTCFullYear(); };
const fechaHora = (t) => { const d = new Date(t); return fecha(t) + " · " + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()) + " UTC"; };
const diaMes = (t) => { const d = new Date(t); return pad(d.getUTCDate()) + "/" + pad(d.getUTCMonth() + 1); };
// números al estilo español con el punto de miles también en 4 cifras (2.503) y sin ceros de sobra (51 y no 51,00)
export function nf(n, d) {
  const [i, f] = Math.abs(n).toFixed(d || 0).split(".");
  const dec = f ? f.replace(/0+$/, "") : "";
  return (n < 0 ? "-" : "") + i.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (dec ? "," + dec : "");
}
export function usd(n) {
  if (n == null || !isFinite(n)) return "—";
  if (n >= 1e9) return nf(n / 1e9, 2) + " mil M$";
  if (n >= 1e6) return nf(n / 1e6, n >= 1e8 ? 0 : 2) + " M$";
  return nf(n) + " $";
}

export const NIVEL = { HIGH: ["RIESGO ALTO", "hi", "ALTO"], MEDIUM: ["RIESGO MEDIO", "mi", "MEDIO"], LOW: ["RIESGO BAJO", "lo", "BAJO"],
  SPAM: ["SPAM", "hi", "SPAM"], NO_DATA: ["SIN DATOS", "", "SIN DATOS"], NO_MARKET: ["SIN MERCADO", "", "SIN MERCADO"] };
const PLAT = { pump_fun: "pump.fun", pumpfun: "pump.fun", "pump-fun": "pump.fun", bonk: "LetsBonk", raydium_launchlab: "Raydium LaunchLab",
  launchlab: "Raydium LaunchLab", moonshot: "Moonshot", bags: "Bags", stonkfun: "Stonk.fun", believe: "Believe", meteora_dbc: "Meteora DBC" };
const DEXN = { "pump-fun": "curva de pump.fun", pumpfun: "curva de pump.fun", pumpswap: "PumpSwap", raydium: "Raydium", meteora: "Meteora",
  orca: "Orca", "raydium-clmm": "Raydium CLMM", "raydium-cp": "Raydium CPMM", meteoradbc: "Meteora DBC", launchlab: "Raydium LaunchLab" };
const platName = (p) => PLAT[p] || p || "—";
const dexName = (d) => DEXN[d] || d || "—";

async function all(db, sql, args) { return (await db.prepare(sql).bind(...args).all()).results || []; }
const SUM = "COUNT(*) AS n, SUM(dead24 IS NOT NULL) AS resolved, SUM(dead24 = 1) AS dead24";

// Todo lo que la base sabe del token. null si no está en lanz (puede estar solo en pedidos)
export async function datosBase(db, m) {
  const r = (await all(db, "SELECT * FROM lanz WHERE m = ?1", [m]))[0] || null;
  const ped = (await all(db, "SELECT n FROM pedidos WHERE m = ?1", [m]).catch(() => []))[0];
  const out = { lanz: r, consultas: ped ? ped.n : 0, roles: [], buyers: [], others: [] };
  if (!r) return out;
  // quién está detrás: cada wallet una vez, con todos sus papeles en este token y su historial en el papel principal
  const roles = [["py", "pagó"], ["cr", "creó"], ["fu", "financió"]], seen = {};
  for (const [c, label] of roles) {
    const w = r[c]; if (!w) continue;
    if (seen[w]) { seen[w].labels.push(label); seen[w].cols.push(c); continue; }
    const h = (await all(db, "SELECT " + SUM + " FROM lanz WHERE " + c + " = ?1 AND m <> ?2", [w, m]))[0] || {};
    seen[w] = { wallet: w, col: c, cols: [c], labels: [label], n: h.n || 0, resolved: h.resolved || 0, dead24: h.dead24 || 0 };
    out.roles.push(seen[w]);
  }
  out.buyers = await all(db, "SELECT c.w, c.d, (SELECT COUNT(*) FROM compras x WHERE x.w = c.w AND x.m <> c.m) AS otros FROM compras c WHERE c.m = ?1 ORDER BY c.d, c.w", [m]);
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
function motivo(d) {
  const by = (c) => d.roles.find((x) => x.cols.includes(c));
  const cr = by("cr") || by("py"), fu = by("fu");
  if (cr && cr.n && (cr.n >= SERIE || !(fu && fu.n >= SERIE))) return "Su creador ha lanzado " + nf(cr.n) + (cr.n === 1 ? " token más" : " tokens más") + (cr.resolved ? ": de los " + nf(cr.resolved) + " que ya cumplieron 24 h murieron " + nf(cr.dead24) + "." : ".");
  if (fu && fu.n >= SERIE) return "Quien financió al creador ha financiado " + nf(fu.n) + " lanzamientos más" + (fu.resolved ? ": murieron " + nf(fu.dead24) + " de " + nf(fu.resolved) + " en 24 h." : ".");
  if (cr) return "Su creador no tiene más lanzamientos en nuestra base.";
  return "";
}

const card = (n, title, body) => '<section class="card"><h2><span class="n">' + n + "</span> " + title + "</h2>" + body + "</section>";
const kv = (rows) => '<table class="kv">' + rows.map(([k, v, c]) => "<tr><td>" + k + '</td><td class="val ' + (c || "") + '">' + v + "</td></tr>").join("") + "</table>";
const f = (k, v, c) => '<span class="f">' + k + "<b" + (c ? ' class="' + c + '"' : "") + ">" + v + "</b></span>";
const na = (t) => '<span class="na">' + t + "</span>";
const ev = (when, title, fields, cls) => '<div class="ev ' + (cls || "") + '"><div class="when">' + when + '</div><div class="node"></div><div class="what"><b>' + title + '</b><div class="fields">' + fields + "</div></div></div>";
const wlink = (w) => '<a href="https://solflag.com/?wallet=' + esc(w) + '">' + esc(short(w)) + "</a>";
const tlink = (m, txt) => '<a href="https://' + HOST + "/" + esc(m) + '">' + esc(txt || short(m)) + "</a>";

// La página entera. d = datosBase, mk = mercado, reg = entrada del registro (o null)
export function pagina(m, d, mk, reg, now) {
  const r = d.lanz, url = "https://" + HOST + "/" + m;
  const name = (mk && mk.name) || (reg && reg.s) || short(m), sym = (mk && mk.symbol) || (reg && reg.s) || "";
  const nivel = r && r.lvl ? NIVEL[r.lvl] : null;
  const born = r ? r.t : mk && isFinite(mk.created) ? mk.created : null;
  const dead = r && r.dead24 === 1, vivoHoy = mk && mk.mc && mk.liq > 0;
  const parcial = !r || (!r.py && !d.buyers.length);
  const mot = r ? motivo(d) : "";

  // ---- textos para Google y la vista previa
  const descBits = [];
  if (nivel) descBits.push("Riesgo " + nivel[2].toLowerCase() + " al lanzarse" + (r.dead24 != null ? (dead ? ", murió en 24 h" : ", seguía vivo a las 24 h") : ""));
  if (mot) descBits.push(mot.replace(/\.$/, ""));
  if (mk && mk.mc) descBits.push("Capitalización hoy " + usd(mk.mc));
  const desc = (descBits.length ? descBits.join(". ") + ". " : "") + "Quién lo lanzó, quién lo financió y quién compró primero, en la ficha de SolFlag.";
  const title = name + (sym && sym !== name ? " ($" + sym + ")" : "") + " · Ficha del token · SolFlag";

  // ---- 01 identificación
  const estado = !r && !mk ? ["sin datos", ""] : vivoHoy ? ["con mercado hoy", "lo"] : dead ? ["muerto en 24 h", "hi"] : mk ? ["sin liquidez hoy", "hi"] : r && r.dead24 === 0 ? ["vivo a las 24 h", "lo"] : ["esperando las 24 h", ""];
  const ident = '<div class="id"><div class="avatar">' + (mk && mk.image ? '<img src="' + esc(mk.image) + '" alt="" referrerpolicy="no-referrer">' : "sin logo") +
    "</div><div><h1>" + esc(name) + "</h1><small>" + esc(sym ? "$" + sym : "") + "</small></div></div>" +
    kv([["Dirección", '<span class="mono" title="' + esc(m) + '">' + esc(short(m)) + "</span>"],
      ["Lanzamiento", born ? fechaHora(born) : "—"],
      ["Plataforma", r ? esc(platName(r.plat)) : "—"],
      ["DEX", esc(dexName((mk && mk.dex) || (r && r.dex)))],
      ["Estado", estado[0], estado[1]],
      ["Consultas en SolFlag", nf(d.consultas)]]);

  // ---- 02 veredicto al lanzarse
  const chips = [];
  if (r && r.cara) chips.push(["Cara conocida", "r"]);
  const crr = d.roles.find((x) => x.cols.includes("cr")), fur = d.roles.find((x) => x.cols.includes("fu"));
  if (crr && crr.n >= SERIE) chips.push(["Creador en serie", "r"]);
  if (fur && fur.n >= SERIE) chips.push(["Financiador en serie", "r"]);
  const rep = d.buyers.filter((b) => b.otros >= REPITE);
  if (rep.length) chips.push([rep.length === 1 ? "Un comprador repetidor" : rep.length + " compradores repetidores", "y"]);
  const veredicto = nivel
    ? '<div class="sello ' + esc(r.lvl) + '"><b>' + nivel[0] + "</b><span>" + esc(mot || "Lo que dijo SolFlag al verlo nacer.") + "</span></div>" +
      (chips.length ? '<div class="alert">' + chips.map(([t, c]) => '<span class="' + c + '">' + t + "</span>").join("") + "</div>" : "")
    : '<div class="pad">' + na(r ? "Lo vimos tarde: no lo analizamos al lanzarse, así que no entra en el registro de aciertos." : "No está en nuestra base: no lo vimos nacer.") + "</div>";

  // ---- 03 riesgo técnico ahora: se calcula al momento en el escáner
  const ahora = '<div class="pad"><p class="muted">Autoridades, liquidez bloqueada y reparto de holders se calculan al momento con el motor de SolFlag.</p>' +
    '<a class="cta" href="https://solflag.com/?token=' + esc(m) + '">Analizar en vivo</a></div>';

  // ---- 04 cifras clave
  const st = (k, v, sub, cls) => '<div class="st"><span>' + k + '</span><b class="' + (v === "—" ? "" : "on ") + (cls || "") + '">' + v + "</b>" + (sub ? na(sub) : "") + "</div>";
  const cifras = '<div class="stats">' +
    st("Liquidez inicial", r && r.liq ? usd(r.liq) : "—", r ? (r.liq ? "" : "en la curva o sin dato") : "no lo vimos nacer") +
    st("Capitalización a 24 h", r && r.mc24 != null && r.dead24 != null ? usd(r.mc24) : "—", r ? (r.dead24 == null ? "aún no" : "") : "no lo vimos nacer", dead ? "hi" : "") +
    st("Volumen 24 h", mk && mk.vol != null ? usd(mk.vol) : "—", mk && mk.ch != null ? (mk.ch > 0 ? "+" : "") + nf(mk.ch, 1) + " % en precio" : "") +
    st("Hoy", mk && mk.mc ? usd(mk.mc) : "sin mercado", mk && mk.liq ? "liquidez " + usd(mk.liq) : "", mk && mk.mc ? "" : "hi") + "</div>";

  // ---- 05 historial
  const evs = [];
  const fu = r && r.fu, py = r && r.py, cr = r && r.cr;
  evs.push(fu ? ev(born ? "antes del " + diaMes(born) : "antes", "Financiación del creador", f("Quién financió", wlink(fu)) + (fur ? f("Ha financiado", nf(fur.n) + " lanzamientos más") : ""))
    : ev("—", "Financiación del creador", na(r ? "No disponible: no llegamos a la primera transacción del creador" : "No disponible"), "na-ev"));
  const quien = py && cr && py === cr ? f("Pagó y creó", wlink(py)) : (py ? f("Pagó", wlink(py)) : "") + (cr ? f("Creó", wlink(cr)) : "") + (!py ? f("Quién pagó", "no disponible", "dim") : "");
  evs.push(ev(born ? diaMes(born) + " · " + fechaHora(born).slice(13, 18) : "—", "Creación del token", quien + (r ? f("Plataforma", esc(platName(r.plat))) : "") + (r && r.liq ? f("Liquidez", usd(r.liq)) : "")));
  if (d.buyers.length) {
    const b0 = d.buyers.filter((b) => b.d === 0).length;
    evs.push(ev("mismo bloque", "Primeras compras", f("Compradores en 2 bloques", nf(d.buyers.length)) + f("En el bloque 0", nf(b0)) +
      (rep.length ? f("Repetidores", nf(rep.length) + " (" + rep.map((b) => nf(b.otros)).join(" y ") + " lanzamientos más)", "hi") : "")));
  } else evs.push(ev("—", "Primeras compras", na(r ? "No disponible: no lo analizamos al nacer o ya tenía demasiadas transacciones" : "No disponible"), "na-ev"));
  if (r && r.dead24 != null) evs.push(ev(born ? diaMes(born + DAY) : "24 h", "Primeras 24 horas", f("¿Murió?", dead ? "sí" : "no", dead ? "hi" : "lo") + (r.mc24 != null ? f("Capitalización", usd(r.mc24)) : "")));
  else evs.push(ev("—", "Primeras 24 horas", na(r && born && now - born < DAY ? "Aún no han pasado 24 h" : "No disponible: no lo seguíamos"), r ? "p" : "na-ev"));
  if (reg && reg.d7) evs.push(ev(born ? diaMes(born + 7 * DAY) : "7 días", "A los 7 días", f("¿Muerto?", reg.d7.dead ? "sí" : "no", reg.d7.dead ? "hi" : "lo") + (reg.d7.mc != null ? f("Capitalización", usd(reg.d7.mc)) : "")));
  evs.push(ev("—", "Salidas de dinero", na("Pendiente: lo estamos estudiando"), "p"));
  evs.push(ev("hoy", "Estado actual", mk ? f("Capitalización", usd(mk.mc)) + f("Liquidez", usd(mk.liq)) + (mk.ch != null ? f("Precio 24 h", (mk.ch > 0 ? "+" : "") + nf(mk.ch, 1) + " %", mk.ch >= 0 ? "lo" : "hi") : "") : f("Mercado", "ninguno", "hi")));

  // ---- 06 qué dijimos y qué pasó
  let dijimos = '<table class="tb"><tr><th>Momento</th><th>Veredicto</th><th>Resultado</th></tr>';
  if (nivel) {
    dijimos += '<tr><td class="val">Al lanzarse</td><td class="val ' + nivel[1] + '">' + nivel[2] + '</td><td class="val">—</td></tr>';
    dijimos += '<tr><td class="val">A las 24 h</td><td class="val">—</td><td class="val ' + (r.dead24 == null ? "" : dead ? "hi" : "lo") + '">' + (r.dead24 == null ? "esperando" : dead ? "murió" : "seguía vivo") + "</td></tr>";
    dijimos += '<tr><td class="val">A los 7 días</td><td class="val">—</td><td class="val ' + (reg && reg.d7 ? (reg.d7.dead ? "hi" : "lo") : "") + '">' + (reg && reg.d7 ? (reg.d7.dead ? "muerto" : "seguía vivo") : born ? "el " + diaMes(born + 7 * DAY) : "—") + "</td></tr>";
    dijimos += '<tr><td colspan="3" class="na">Entra en el registro público de aciertos: <a href="https://solflag.com/acierto/">Datos y acierto</a>.</td></tr>';
  } else dijimos += '<tr><td colspan="3" class="na">Fuera del registro de aciertos: no lo analizamos al lanzarse.</td></tr>';
  dijimos += "</table>";

  // ---- 07 dónde cotiza
  let cotiza = '<table class="tb"><tr><th>Sitio</th><th>Liquidez</th></tr>';
  cotiza += mk && mk.dexes.length ? mk.dexes.slice(0, 5).map((x) => '<tr><td class="val">' + esc(dexName(x.dex)) + '</td><td class="val">' + usd(x.liq) + "</td></tr>").join("")
    : '<tr><td colspan="2" class="na">Ningún mercado activo.</td></tr>';
  cotiza += '<tr><td colspan="2" class="na">Coste de entrar y salir: próximamente.</td></tr></table>';

  // ---- 08 quién está detrás
  const detras = d.roles.length ? d.roles.map((x) => {
    const lab = x.labels.join(" y "), serie = x.n >= SERIE;
    const chip = r.cara && x.col !== "fu" ? '<span class="chip hi">cara conocida</span>' : serie ? '<span class="chip hi">' + (x.col === "fu" ? "financiador en serie" : "en serie") + "</span>" : '<span class="chip">' + (x.n ? "con historial" : "sin más lanzamientos con nosotros") + "</span>";
    return '<div class="per"><div class="r"><b>' + lab.charAt(0).toUpperCase() + lab.slice(1) + "</b>" + chip + '</div><div class="fields">' + f("Wallet", wlink(x.wallet)) +
      f(x.col === "fu" ? "Otros financiados" : "Otros lanzamientos", nf(x.n)) + (x.resolved ? f("Muertos en 24 h", nf(x.dead24) + " de " + nf(x.resolved), x.dead24 === x.resolved ? "hi" : "") : "") + "</div></div>";
  }).join("") : '<div class="pad">' + na(r ? "No llegamos a saber quién lo lanzó: tenía demasiadas transacciones cuando lo vimos." : "No está en nuestra base todavía.") + "</div>";

  // ---- 09 primeros compradores
  let comp = '<table class="tb"><tr><th>#</th><th>Wallet</th><th>Bloque</th><th>Otros lanz.</th></tr>';
  comp += d.buyers.length ? d.buyers.map((b, i) => '<tr><td class="val">' + (i + 1) + '</td><td class="val">' + wlink(b.w) + '</td><td class="val">' + (b.d ? "+" + b.d : "0") +
    '</td><td class="val ' + (b.otros >= REPITE ? "hi" : b.otros >= 3 ? "mi" : "") + '">' + nf(b.otros) + "</td></tr>").join("")
    : '<tr><td colspan="4" class="na">' + (r ? "No disponible: no lo analizamos al nacer o tenía demasiadas transacciones." : "No disponible.") + "</td></tr>";
  comp += "</table>";

  // ---- 10 otros tokens del creador
  let otros = '<table class="tb"><tr><th>Token</th><th>Fecha</th><th>Nivel</th><th>24 h</th></tr>';
  otros += d.others.length ? d.others.map((o) => { const nv = NIVEL[o.lvl]; return '<tr><td class="val">' + tlink(o.m, o.m.slice(0, 6) + "…") + '</td><td class="val">' + diaMes(o.t) +
    '</td><td class="val ' + (nv ? nv[1] : "") + '">' + (nv ? nv[2] : "—") + '</td><td class="val ' + (o.dead24 === 1 ? "hi" : "") + '">' + (o.dead24 == null ? "esperando" : o.dead24 ? "murió" : "vivo") + "</td></tr>"; }).join("")
    : '<tr><td colspan="4" class="na">Ninguno en nuestra base.</td></tr>';
  otros += "</table>";

  const aviso = !r ? '<div class="warn"><b>Aún no está en nuestra base.</b> No lo vimos nacer, así que no sabemos quién lo lanzó ni quién compró primero. <a href="https://solflag.com/?token=' + esc(m) + '">Escanéalo en SolFlag</a> y lo analizaremos en la próxima media hora.</div>'
    : parcial ? '<div class="warn"><b>Ficha parcial.</b> Lo vimos tarde o ya tenía demasiadas transacciones: lo que falta se indica en cada apartado.</div>' : "";
  const hoy = fecha(now);
  const img = mk && mk.image ? mk.image : "https://solflag.com/og.png";

  return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    "<title>" + esc(title) + '</title><meta name="description" content="' + esc(desc) + '"><link rel="canonical" href="' + url + '">' +
    '<meta property="og:type" content="website"><meta property="og:site_name" content="SolFlag"><meta property="og:title" content="' + esc(title) + '">' +
    '<meta property="og:description" content="' + esc(desc) + '"><meta property="og:url" content="' + url + '"><meta property="og:image" content="' + esc(img) + '">' +
    '<meta name="twitter:card" content="' + (mk && mk.image ? "summary" : "summary_large_image") + '"><meta name="twitter:site" content="@solflagTeam">' +
    '<link rel="icon" href="https://solflag.com/favicon.ico"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
    '<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600&family=Manrope:wght@400;600;700&family=Barlow+Condensed:wght@600;700&display=swap" rel="stylesheet">' +
    "<style>" + CSS + "</style></head><body>" + HEADER +
    '<div class="wrap"><header class="top"><span class="doc"><b>Ficha técnica</b> · historial del token</span><span class="num">' + HOST + "/" + esc(m) + '</span><span class="sp"></span>' +
    '<span class="doc">Actualizada ' + hoy + '</span><button class="btn" id="share" type="button">Compartir</button>' +
    '<a class="btn" href="https://t.me/SolFlagBot">Vigilar en Telegram</a><a class="btn" href="https://solflag.com/?token=' + esc(m) + '">Analizar en vivo</a></header>' + aviso +
    '<div class="grid"><div class="col">' + card("01", "Identificación", ident) + card("02", "Veredicto al lanzarse", veredicto) + card("03", "Riesgo técnico ahora", ahora) +
    '</div><div class="col">' + card("04", "Cifras clave", cifras) + card("05", "Historial cronológico", '<div class="tl">' + evs.join("") + "</div>") +
    '<div class="two">' + card("06", "Qué dijimos y qué pasó", dijimos) + card("07", "Dónde cotiza", cotiza) + "</div>" +
    '</div><div class="col">' + card("08", "Quién está detrás", detras) + card("09", "Primeros compradores", comp) + card("10", "Otros tokens del mismo creador", otros) + "</div></div>" +
    '<footer class="card"><div class="foot"><div><b>Fuentes</b>Base de SolFlag, RugCheck, DexScreener y nodos de Solana · ' + hoy + "</div>" +
    '<div><b>Citar esta ficha</b><span class="mono">' + url + '</span> · datos <a href="https://creativecommons.org/licenses/by-nc/4.0/deed.es">CC BY-NC 4.0</a></div>' +
    '<div><b>Corrección</b>¿Algún dato está mal? <a href="mailto:solflag.team@gmail.com?subject=' + encodeURIComponent("Corrección ficha " + m) + '">Pide que lo corrijamos</a></div>' +
    "<div><b>Nota</b>Solo hechos de la cadena. No es consejo de inversión.</div></div></footer></div>" +
    '<script>document.getElementById("share").onclick=function(){var u=location.href,t=document.title;if(navigator.share)navigator.share({title:t,url:u}).catch(function(){});else if(navigator.clipboard)navigator.clipboard.writeText(u).then(function(){var b=document.getElementById("share");b.textContent="Enlace copiado";setTimeout(function(){b.textContent="Compartir"},1800)});};</script>' +
    '<script src="https://solflag.com/fondo.js?v=20261111d" defer></script></body></html>';
}

export function noEncontrado(m) {
  return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Token no encontrado · SolFlag</title>' +
    '<meta name="robots" content="noindex"><link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600&family=Manrope:wght@400;700&display=swap" rel="stylesheet"><style>' + CSS + "</style></head><body>" + HEADER +
    '<div class="wrap"><section class="card"><div class="pad"><h1 class="nf">No encontramos este token</h1><p class="muted">' + (m ? "No está en nuestra base ni tiene mercado en DexScreener. " : "Esa dirección no es válida. ") +
    '<a href="https://solflag.com/' + (m ? "?token=" + esc(m) : "") + '">Búscalo en el escáner de SolFlag</a>.</p></div></section></div><script src="https://solflag.com/fondo.js?v=20261111d" defer></script></body></html>';
}

const HTML_HEAD = { "content-type": "text/html; charset=utf-8", "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin" };
const page = (body, status, ttl) => new Response(body, { status: status, headers: Object.assign({}, HTML_HEAD, { "cache-control": ttl ? "public, max-age=" + ttl : "no-store" }) });

export async function sitemap(db) {
  const rows = await all(db, "SELECT m, t FROM lanz ORDER BY t DESC LIMIT " + SITEMAP_MAX, []);
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    rows.map((r) => "<url><loc>https://" + HOST + "/" + r.m + "</loc><lastmod>" + new Date(r.t).toISOString().slice(0, 10) + "</lastmod></url>").join("\n") + "\n</urlset>\n";
}

// fetchJSON(url, ttl) se puede cambiar en los tests
export async function ficha(req, env, fetchJSON) {
  const get = fetchJSON || getJSON;
  const path = new URL(req.url).pathname.replace(/\/+$/, "");
  if (req.method !== "GET" && req.method !== "HEAD") return new Response(null, { status: 405 });
  if (path === "") return Response.redirect("https://solflag.com/", 302);
  if (path === "/robots.txt") return new Response("User-agent: *\nAllow: /\nSitemap: https://" + HOST + "/sitemap.xml\n", { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=86400" } });
  if (path === "/sitemap.xml") {
    try { return new Response(await sitemap(env.DB), { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } }); }
    catch (e) { return new Response("", { status: 503 }); }
  }
  const m = path.slice(1);
  if (!ADDR.test(m)) return page(noEncontrado(null), 404);
  let d;
  try { d = await datosBase(env.DB, m); } catch (e) { d = { lanz: null, consultas: 0, roles: [], buyers: [], others: [] }; }
  const day = d.lanz ? new Date(d.lanz.t).toISOString().slice(0, 10) : null;
  const [pairs, regDay] = await Promise.all([
    get("https://api.dexscreener.com/tokens/v1/solana/" + m, 300),
    day && d.lanz.lvl ? get("https://solflag.com/datos/registro/" + day + ".json", 3600) : null
  ]);
  const mk = mercado(pairs, m), reg = regDay && regDay.tokens ? regDay.tokens[m] || null : null;
  if (!d.lanz && !mk) return page(noEncontrado(m), 404);
  return page(pagina(m, d, mk, reg, Date.now()), 200, 300);
}

const HEADER = '<header class="site"><a class="logo" href="https://solflag.com/" title="SolFlag"><svg viewBox="0 0 46 46" aria-hidden="true"><circle cx="23" cy="23" r="22" fill="#3a2a80" stroke="#a78bfa" stroke-width="2"/><g fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><path d="M23 10.5l4 2.3v4.6l-4 2.3-4-2.3v-4.6z"/><path d="M19 12.8l4 2.3 4-2.3M23 15.1v4.6"/><path d="M14 24l4 2.3v4.6l-4 2.3-4-2.3v-4.6z"/><path d="M10 26.3l4 2.3 4-2.3M14 28.6v4.6"/><path d="M32 24l4 2.3v4.6l-4 2.3-4-2.3v-4.6z"/><path d="M28 26.3l4 2.3 4-2.3M32 28.6v4.6"/><path d="M19 15.1l-4.6 2.6v6.3M27 15.1l4.6 2.6v6.3M18 30.9L23 33.8l5-2.9"/></g></svg><span class="wm"><span class="wm-a">sol</span><span class="wm-b">flag</span></span></a>' +
  '<nav class="pnav"><a href="https://solflag.com/?v=escaner">Escáner</a><a href="https://solflag.com/?v=lista">Mi lista</a><a href="https://solflag.com/?v=confluencia">Confluencia</a><a class="pbot" href="https://t.me/SolFlagBot">Bot de Telegram</a></nav></header>';

const CSS = ":root{\n  --bg:#05040d; --card:rgba(8,6,22,.92); --line:rgba(196,181,253,.16); --line2:rgba(196,181,253,.09);\n  --txt:#f1eeff; --dim:#a99fd6; --tq:#8ec5cf; --hi:#ff6b6b; --mid:#fbbf24; --lo:#4ade80;\n}\n*{box-sizing:border-box}\nhtml{background:var(--bg);overflow-x:clip}\nbody{margin:0;background:none;color:var(--txt);font:14px/1.45 Manrope,sans-serif;min-height:100vh}\n.wrap{max-width:1680px;margin:0 auto;padding:20px 24px 48px}\n/* barra superior tipo expediente */\n.top{display:flex;align-items:center;gap:18px;flex-wrap:wrap;border:1px solid var(--line);border-radius:14px;background:var(--card);padding:12px 18px;margin-bottom:16px}\n.logo{font:700 24px 'Barlow Condensed',sans-serif;letter-spacing:.05em;color:var(--tq)}\n.doc{font:600 13px 'Barlow Condensed',sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--dim)}\n.doc b{color:var(--txt);font-size:16px;letter-spacing:.08em}\n.num{font:13px monospace;color:var(--dim);border:1px dashed var(--line);border-radius:8px;padding:4px 10px}\n.top .sp{flex:1}\n.btn{border:1px solid var(--line);border-radius:10px;padding:7px 12px;font-weight:600;font-size:13px;white-space:nowrap}\n.leg{display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--dim);margin:0 4px 14px}\n.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;vertical-align:1px}\n.d-ya{background:var(--lo)} .d-mo{background:var(--tq)} .d-pe{background:var(--mid)}\n/* rejilla de 3 columnas */\n.grid{display:grid;grid-template-columns:320px minmax(0,1fr) 400px;gap:16px;align-items:start}\n.col{display:flex;flex-direction:column;gap:16px;min-width:0}\n.card{background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden}\n.card h2{margin:0;font:600 13px 'Barlow Condensed',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--tq);padding:10px 14px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:8px}\n.card h2 .n{color:var(--dim);font-weight:600}\n.card h2 .dot{margin:0 0 0 auto}\n.pad{padding:12px 14px}\n/* tablas campo/valor */\ntable{width:100%;border-collapse:collapse}\ntd,th{padding:7px 14px;border-bottom:1px solid var(--line2);text-align:left;vertical-align:top}\ntr:last-child td{border-bottom:0}\n.kv td:first-child{color:var(--dim);width:44%;font-size:13px}\n.v{color:var(--dim);opacity:.55;font-family:monospace}\nth{font:600 11px 'Barlow Condensed',sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--dim);background:rgba(196,181,253,.05)}\n.tb td{color:var(--dim);opacity:.55;font-family:monospace}\n/* identidad */\n.id{display:flex;gap:12px;align-items:center;padding:14px}\n.avatar{width:56px;height:56px;border-radius:50%;border:1px dashed var(--line);display:grid;place-items:center;color:var(--dim);font-size:11px;flex:none}\n.id h1{margin:0;font:600 22px Fraunces,serif}\n.id small{color:var(--dim)}\n.sello{margin:0 14px 14px;border:2px dashed var(--line);border-radius:12px;padding:14px;text-align:center}\n.sello b{display:block;font:600 18px Fraunces,serif;margin-bottom:4px}\n.sello span{color:var(--dim);font-size:12px}\n.bar{display:flex;height:8px;border-radius:99px;overflow:hidden;margin-top:10px}\n.bar i{flex:1}\n/* historial cronológico */\n.tl{position:relative;padding:6px 14px 6px 14px}\n.ev{display:grid;grid-template-columns:130px 22px minmax(0,1fr);gap:0 10px;padding:10px 0;border-bottom:1px solid var(--line2)}\n.ev:last-child{border-bottom:0}\n.when{font:12px monospace;color:var(--dim);padding-top:2px}\n.node{position:relative}\n.node:before{content:\"\";position:absolute;left:10px;top:-12px;bottom:-12px;width:2px;background:var(--line)}\n.node:after{content:\"\";position:absolute;left:5px;top:4px;width:12px;height:12px;border-radius:50%;background:var(--bg);border:2px solid var(--tq)}\n.ev.p .node:after{border-color:var(--mid)}\n.what b{display:block;margin-bottom:4px}\n.fields{display:flex;flex-wrap:wrap;gap:6px}\n.f{font-size:12px;color:var(--dim);border:1px solid var(--line2);border-radius:7px;padding:3px 8px}\n.f em{font-style:normal;opacity:.55;font-family:monospace;margin-left:6px}\n/* cifras grandes */\n.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))}\n.st{padding:14px;border-right:1px solid var(--line2)}\n.st:last-child{border-right:0}\n.st span{display:block;color:var(--dim);font-size:12px}\n.st b{display:block;font:600 24px Fraunces,serif;color:var(--dim);opacity:.5;margin-top:4px}\n.two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}\n/* personas */\n.per{padding:12px 14px;border-bottom:1px solid var(--line2)}\n.per:last-child{border-bottom:0}\n.per .r{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px}\n.per .r b{font-size:14px}\n.chip{font-size:11px;color:var(--dim);border:1px dashed var(--line);border-radius:99px;padding:1px 8px}\nfooter.card{margin-top:16px}\n.foot{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))}\n.foot div{padding:12px 14px;border-right:1px solid var(--line2);color:var(--dim);font-size:13px}\n.foot div:last-child{border-right:0}\n.foot b{display:block;color:var(--txt);margin-bottom:4px;font-size:13px}\n@media (max-width:1280px){ .grid{grid-template-columns:300px minmax(0,1fr)} .grid>.col:last-child{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr))} }\n@media (max-width:900px){ .grid{grid-template-columns:1fr} .grid>.col:last-child{grid-template-columns:1fr} .two,.foot{grid-template-columns:1fr} .stats{grid-template-columns:repeat(2,minmax(0,1fr))} .ev{grid-template-columns:96px 22px minmax(0,1fr)} .wrap{padding:16px} }\n/* cabecera de la web (como las páginas sueltas) */\n.site{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:10px 26px;min-height:68px;max-width:1680px;margin:0 auto;padding:0 24px;background:rgba(5,4,13,.6);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}\n.site .logo{display:flex;align-items:center;gap:11px;text-decoration:none}\n.site .logo svg{width:42px;height:42px;flex:none}\n.wm{font:700 30px/1 'Barlow Condensed','Arial Narrow',sans-serif}.wm-a{color:#fff}.wm-b{color:#c4b5fd}\n.pnav{display:flex;align-items:center;gap:4px 24px;margin-left:auto;font-weight:700;font-size:.95rem}\n.pnav a{color:#d8d2f5;text-decoration:none;padding:8px 0}\n.plang{width:40px;height:40px;display:grid;place-items:center;border:1px solid rgba(196,181,253,.3);border-radius:50%;color:var(--tq);font-size:.8rem;font-weight:700;text-decoration:none;flex:none}\n@media (max-width:760px){ .pnav a:not(.pbot){display:none} .site{padding:0 16px} .site .logo svg{width:36px;height:36px} .wm{font-size:26px} }\n@media (max-width:420px){ .pnav{display:none} .plang{margin-left:auto} }\n.btn{background:rgba(255,255,255,.04)}\n.top .logo{display:none}\n.num{max-width:100%;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.val{color:var(--txt);font-family:monospace;font-size:13px}\n.tb td.val, .tb td.ok{opacity:1;color:var(--txt)}\n.na{color:var(--dim);font-style:italic;font-size:12px}\n.f b{font-weight:600;color:var(--txt);margin-left:6px;font-family:monospace}\n.st b.on{opacity:1;color:var(--txt)}\n.hi{color:var(--hi)!important} .lo{color:var(--lo)!important} .mi{color:var(--mid)!important}\n.sello.HIGH{border-color:var(--hi);border-style:solid} .sello.HIGH b{color:var(--hi)}\n.sello.LOW{border-color:var(--lo);border-style:solid} .sello.LOW b{color:var(--lo)}\n.warn{border:1px solid var(--mid);background:rgba(251,191,36,.08);border-radius:12px;padding:10px 14px;margin:0 0 14px;font-size:13px;color:var(--txt)}\n.warn b{color:var(--mid)}\n.ev.na-ev .node:after{border-color:var(--dim);border-style:dashed}\n.ev.na-ev .what b{color:var(--dim)}\n.alert{display:flex;gap:8px;flex-wrap:wrap;padding:0 14px 14px}\n.alert span{font-size:12px;border-radius:99px;padding:3px 10px;border:1px solid var(--line)}\n.alert .r{border-color:var(--hi);color:var(--hi)} .alert .g{border-color:var(--lo);color:var(--lo)} .alert .y{border-color:var(--mid);color:var(--mid)}\n.tb td.na,.tb td.val{opacity:1}.tb td.na{color:var(--dim)}\na{color:var(--tq)}.val a,.f a{color:inherit;text-decoration:none;border-bottom:1px dotted var(--line)}.val a:hover,.f a:hover{color:var(--tq)}\n.mono{font-family:monospace}.muted{color:var(--dim);margin:0 0 12px}.dim{opacity:.6}\n.avatar{overflow:hidden}.avatar img{width:100%;height:100%;object-fit:cover}\n.cta{display:inline-block;background:var(--tq);color:var(--bg);font-weight:700;border-radius:10px;padding:9px 14px;text-decoration:none}\nbutton.btn{font:600 13px Manrope,sans-serif;color:var(--txt);cursor:pointer}a.btn{color:var(--txt);text-decoration:none}\n.nf{margin:0 0 8px;font:600 24px Fraunces,serif}\n.foot .mono{word-break:break-all}\n.warn a{color:var(--mid)}";
