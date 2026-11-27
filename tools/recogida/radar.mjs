// Radar de SolFlag, versión 2 (27/11/2026; maqueta aprobada maquetas/telegram-radar/radar-proyectos.html).
// El canal t.me/SolFlagRadar deja los lanzamientos de Pump.fun y avisa de lo que pasa en los proyectos que seguimos
// (los 27 de la portada y el Ecosistema). Lo llama la recogida en cada vuelta (cada 15 min). Tipos:
//   1 ballenas   una de las 20 mayores wallets baja o sube ≥ 3 puntos, entra una nueva con ≥ 3 %, o manda a un exchange
//                (de la foto de Helius, cada 2 h; las wallets del propio proyecto solo si mandan a un exchange)
//   2 volumen    un token de los 27 mueve ≥ 3 veces su volumen normal en 24 h (≥ 50 k$), con el porqué (ops de D1)
//   4 uso real   un proyecto que cobra > 300 k$ al mes cambia sus comisiones más de un 30 % en 30 días (Ecosistema)
//   5 novedades  web caída de un proyecto (perfiles.json), hackeo nuevo (DefiLlama, campo hk), acaba de sacar token
//   6 resumen    a las 21:00 de Madrid
// Límites: MAX_DIA avisos al día (lo demás va al resumen) y un aviso por token y tipo (cada uno con su espera).
// En inglés, como el canal. Hechos, nunca «scam». Publica @SolFlagBot solo con sendMessage.
import { madrid } from "../caras/radar.mjs";

export const MAX_DIA = 6;
export const VECES_MIN = 3, VOL_MIN = 50000, PUNTOS_MIN = 3, FEES_MIN = 300000, FEES_CAMBIO = 0.3;
const H = 3600e3, D = 864e5;
// cuánto se espera antes de repetir el mismo aviso (por clave)
export const ESPERA = { b: D, v: D, u: 30 * D, w: 7 * D, hk: 365 * D, nt: 365 * D };
const SITE = "https://solflag.com/en/";
const APN = { defi: "DeFi", juegos: "Games", apps: "Apps and bots", rwa: "Tokenized assets", ia: "AI", otros: "Other", meme: "Meme" };
const APK = { DeFi: "defi", Juegos: "juegos", "Apps y bots": "apps", "Activos tokenizados": "rwa", IA: "ia", Otros: "otros", Meme: "meme" };

export const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const usd = (n) => "$" + (n >= 1e9 ? (n / 1e9).toFixed(1) + "B" : n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? Math.round(n / 1e3) + "k" : Math.round(n));
const num = (n) => n >= 1e9 ? (n / 1e9).toFixed(1) + "B" : n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? Math.round(n / 1e3) + "k" : String(Math.round(n));
const pc = (v) => (Math.round(v * 10) / 10) + "%";
const veces = (v) => (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10) + "×";
const corta = (w) => w ? w.slice(0, 4) + "…" + w.slice(-5) : "";
const hhmm = (t) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" }).format(new Date(t));
const scan = (m, sym) => [{ text: "📊 Scan " + (sym ? "$" + sym : "on SolFlag"), url: SITE + "?token=" + m }];
const ecoBtn = (ap) => ap && APN[ap] ? [{ text: "🌐 Ecosystem: " + APN[ap], url: SITE + "ecosystem/?ap=" + ap }] : [];
const titulo = (sym, n) => "$" + esc(sym) + (n && n.toUpperCase() !== String(sym).toUpperCase() ? " · " + esc(n) : "");

// 1) ballenas. av = filas nuevas de la tabla avisos [m, t, k, w, de, a, dest, dn, tok, precio]; info[m] = {sym, n, ap};
//    tipo[w] = "w" | "x" | "p" | "j" (j = del propio proyecto); pj[w] = [nombre, función]
export function avisosBallenas(av, info, tipo, pj) {
  const out = [];
  for (const [m, t, k, w, de, a, , dn, tok, precio] of av || []) {
    const i = info[m]; if (!i || k === "exch") continue;
    const proy = tipo[w] === "j";
    let ok = false, l1 = "", cab = "🐋 <b>Big holder moved: " + titulo(i.sym, i.n) + "</b>";
    const val = precio ? " (about <b>" + usd(Math.abs(tok) * precio) + "</b>)" : "";
    if (k === "envio") { ok = true; cab = "🐋 <b>Big holder sent tokens to an exchange: " + titulo(i.sym, i.n) + "</b>";
      l1 = "A wallet holding <b>" + pc(de) + "</b> sent <b>" + num(tok) + " " + esc(i.sym) + "</b>" + val + " to <b>" + esc(dn || "an exchange") + "</b>." + (a != null ? " It now has <b>" + pc(a) + "</b>." : ""); }
    else if (proy) continue;
    else if (k === "baja" && (a == null ? de >= PUNTOS_MIN : de - a >= PUNTOS_MIN)) { ok = true;
      l1 = "A wallet holding <b>" + pc(de) + "</b> of the supply " + (a == null ? "is no longer in the top 20." : "now has <b>" + pc(a) + "</b>.") + "\nThat's <b>" + num(tok) + " " + esc(i.sym) + "</b> out" + val + "."; }
    else if (k === "sube" && a - de >= PUNTOS_MIN) { ok = true;
      l1 = "A wallet holding <b>" + pc(de) + "</b> of the supply now has <b>" + pc(a) + "</b>.\nThat's <b>" + num(tok) + " " + esc(i.sym) + "</b> in" + val + "."; }
    else if (k === "entra" && a >= PUNTOS_MIN) { ok = true;
      l1 = "A new wallet came into the top 20 with <b>" + pc(a) + "</b> of the supply" + val + "."; }
    if (!ok) continue;
    const quien = proy && pj[w] ? "It's the project's own wallet (" + esc(pj[w][0]) + ", " + esc(pj[w][1]) + ")." : "Not an exchange or a project wallet in our list.";
    out.push({ k: "b:" + m + ":" + w, pri: k === "envio" ? 1 : 3, m, resumen: "$" + i.sym + ": " + (k === "envio" ? "a big holder sent " + num(tok) + " to " + (dn || "an exchange") : k === "entra" ? "a new wallet came in with " + pc(a) : k === "sube" ? "a big holder went from " + pc(de) + " to " + pc(a) : "a big holder went from " + pc(de) + " to " + (a == null ? "out of the top 20" : pc(a))),
      text: [cab, "", l1, "", quien, "", "<code>" + corta(w) + "</code>", "", "<i>A move, not necessarily a sale. Not financial advice.</i>"].join("\n"),
      botones: [scan(m, i.sym)] });
  }
  return out;
}

// 2) volumen. normal = normal.json; pares = respuesta de DexScreener; info[m] = {sym, n, ap}. Devuelve la lista entera,
//    ordenada (para el resumen); los que pasan el listón llevan aviso
export function volumenes(normal, pares, info) {
  const L = [];
  for (const [m, a] of Object.entries((normal && normal.t) || {})) {
    const p = (pares || []).find((x) => x && x.pairAddress === a[2]); const v = p && p.volume && p.volume.h24;
    if (!v || !(a[3] > 0) || !info[m]) continue;
    L.push({ m, sym: info[m].sym, n: info[m].n, ap: info[m].ap, hoy: v, nor: a[3], x: v / a[3], c24: p.priceChange && p.priceChange.h24 });
  }
  return L.filter((t) => t.hoy >= VOL_MIN).sort((a, b) => b.x - a.x);
}
// ops = [[t, sell, usd]] de las últimas 24 h de ese token (tabla ops)
export function avisoVolumen(t, ops) {
  const W = ops.filter((o) => o[2] >= 10000), com = W.filter((o) => !o[1]).reduce((s, o) => s + o[2], 0), ven = W.filter((o) => o[1]).reduce((s, o) => s + o[2], 0);
  const big = ops.slice().sort((a, b) => b[2] - a[2])[0];
  const por = W.length ? "Why: whales over $10k " + (com >= ven ? "<b>bought " + usd(com - ven) + " net</b>" : "<b>sold " + usd(ven - com) + " net</b>") + " (" + usd(com) + " in, " + usd(ven) + " out)."
    : "Why: no whale trades over $10k today.";
  const l = ["📈 <b>" + titulo(t.sym, t.n) + " is trading " + veces(t.x) + " its usual volume</b>", "",
    "Last 24 h: <b>" + usd(t.hoy) + "</b> · usual day: <b>" + usd(t.nor) + "</b>", "",
    por + (big ? " Largest trade: a <b>" + usd(big[2]) + " " + (big[1] ? "sell" : "buy") + "</b> at " + hhmm(big[0]) + "." : "")];
  if (typeof t.c24 === "number") l.push("Price 24 h: <b>" + (t.c24 > 0 ? "+" : "") + pc(t.c24) + "</b>");
  if (!W.length) l.push("", "<i>Volume without whales: many small traders, not one big one.</i>");
  return { k: "v:" + t.m, pri: 2, m: t.m, text: l.join("\n"), botones: [scan(t.m, t.sym).concat(ecoBtn(t.ap))], resumen: "$" + t.sym + " traded " + veces(t.x) + " its usual volume" };
}

// 4 y 5) una vez al día, con el Ecosistema (eco) y perfiles.json (perf.t[mint].web = {u, ok, s})
export function avisosDiarios(eco, perf, ahora) {
  const out = [], rows = (eco && eco.rows) || [];
  const fees = rows.filter((r) => r.med === "fees" && r.m > FEES_MIN && typeof r.c === "number" && Math.abs(r.c) > FEES_CAMBIO).sort((a, b) => b.m - a.m);
  for (const r of fees) {
    const ap = APK[r.ap] || null, antes = r.m / (1 + r.c), baja = r.c < 0;
    const l = [(baja ? "📉" : "📈") + " <b>" + esc(r.n) + " fees " + (baja ? "down " : "up ") + Math.round(Math.abs(r.c) * 100) + "% in 30 days</b>" + (r.sym ? " · $" + esc(r.sym) : ""), "",
      "It earns <b>" + usd(r.m) + " a month</b> (it was about " + usd(antes) + ")." + (ap ? " Ecosystem · " + APN[ap] + "." : ""), "",
      "<i>Fees are what users actually pay to use it. Source: DefiLlama.</i>"];
    out.push({ k: "u:" + r.n + ":" + (baja ? "-" : "+"), pri: 4, m: r.mint || null, text: l.join("\n"),
      botones: [(r.mint ? scan(r.mint, r.sym) : []).concat(ecoBtn(ap))].filter((x) => x.length), resumen: r.n + " fees " + (baja ? "−" : "+") + Math.round(Math.abs(r.c) * 100) + "% in 30 days" });
  }
  for (const r of rows) {
    const ap = APK[r.ap] || null;
    for (const h of r.hk || []) if (h.d * 1000 > ahora - 3 * D) out.push({ k: "hk:" + r.n + ":" + h.d, pri: 0, m: r.mint || null, resumen: "Hack: " + r.n,
      text: ["🚨 <b>Hack: " + esc(r.n) + "</b>", "", (h.p ? "<b>" + usd(h.p) + "</b> taken (DefiLlama)." : "Reported by DefiLlama."), "If you use it, check your funds.", "", "<i>From the Ecosystem" + (ap ? " · " + APN[ap] : "") + ".</i>"].join("\n"),
      botones: [ecoBtn(ap)].filter((x) => x.length) });
    if (r.nuevo && r.mint) out.push({ k: "nt:" + r.mint, pri: 2, m: r.mint, resumen: r.n + " launched a token ($" + r.sym + ")",
      text: ["🆕 <b>" + esc(r.n) + " launched a token: $" + esc(r.sym) + "</b>", "", "A project from our Ecosystem that had no token until now." + (r.copias ? " Watch out: there are already <b>" + r.copias + " copies</b> with the same name." : ""), "", "<code>" + esc(r.mint) + "</code>", "", "<i>Check the address before buying anything with this name.</i>"].join("\n"),
      botones: [scan(r.mint, r.sym).concat(ecoBtn(ap))] });
  }
  for (const [m, p] of Object.entries((perf && perf.t) || {})) {
    if (!p || !p.web || p.web.ok !== false) continue;
    const r = rows.find((x) => x.mint === m); if (!r) continue;
    const ap = APK[r.ap] || null, host = String(p.web.u || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
    out.push({ k: "w:" + m, pri: 3, m, resumen: r.n + ": website down",
      text: ["⚠️ <b>" + esc(r.n) + ": its website is down</b>" + (r.sym ? " · $" + esc(r.sym) : ""), "", esc(host) + " answers with an error" + (p.web.s ? " (" + p.web.s + ")" : "") + " in today's check.", "", "<i>We check the site and code of these projects once a day.</i>"].join("\n"),
      botones: [scan(m, r.sym).concat(ecoBtn(ap))] });
  }
  return out;
}

// st = estado del radar (en estado.json de la recogida). Quita lo ya avisado dentro de su espera y aplica el tope del
// día; devuelve los que se mandan. Los que no caben van al resumen (st.hoy.mas)
export function elegir(cands, st, ahora) {
  const dia = madrid(ahora).dia;
  st.k = st.k || {};
  for (const [k, t] of Object.entries(st.k)) if (ahora - t > 365 * D) delete st.k[k];
  if (!st.hoy || st.hoy.dia !== dia) st.hoy = { dia, n: 0, res: [], mas: [] };
  const espera = (k) => ESPERA[k.split(":")[0]] || D;
  const libres = cands.filter((c) => !(st.k[c.k] && ahora - st.k[c.k] < espera(c.k))).sort((a, b) => a.pri - b.pri);
  const out = [];
  for (const c of libres) {
    st.k[c.k] = ahora;
    // un aviso por token y día, aunque sea de otro tipo (salvo hackeos)
    const otro = c.m && c.pri > 0 && out.some((x) => x.m === c.m);
    if (st.hoy.n >= MAX_DIA || otro) { st.hoy.mas.push(c.resumen); continue; }
    st.hoy.n++; st.hoy.res.push(c.resumen); out.push(c);
  }
  return out;
}

// 6) resumen del día: una vez, en la primera vuelta desde las 21:00 de Madrid. top = volumenes() de ahora
export function resumenDia(st, top, ahora) {
  const m = madrid(ahora);
  if (m.hora < 21 || st.resumen === m.dia) return null;
  st.resumen = m.dia;
  const hoy = st.hoy && st.hoy.dia === m.dia ? st.hoy : { n: 0, res: [], mas: [] };
  const l = ["📋 <b>Today in the projects we follow</b>"];
  if (top && top.length) l.push("", "<b>Moving most</b> (vs their usual volume)", top.slice(0, 3).map((t, i) => (i + 1) + ". $" + esc(t.sym) + " " + veces(t.x)).join(" · "));
  const todo = hoy.res.concat(hoy.mas);
  if (todo.length) l.push("", "<b>What happened</b>", ...todo.slice(0, 8).map((x) => "· " + esc(x)));
  l.push("", "<b>Alerts today:</b> " + hoy.n, "", "<i>solflag.com · the ecosystem right now</i>");
  return { text: l.join("\n"), botones: [[{ text: "🌐 The ecosystem right now", url: SITE }]] };
}
