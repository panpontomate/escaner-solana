// Radar de SolFlag: avisos en el canal público t.me/SolFlagRadar (aprobado 17/11/2026, maqueta en
// maquetas/telegram-radar/radar-aviso.html). Salta cuando un token recién analizado lo pagó, creó o financió una
// «cara conocida» mala (muchos tokens muertos) y ya tiene liquidez de verdad. Como mucho MAX_HORA por hora y nunca la
// misma wallet dos veces en WALLET_H horas. Además, un resumen del día a las 21:00 de Madrid.
// Publica @SolFlagBot solo con sendMessage (nunca getUpdates: chocaría con su polling en Bot-Hosting).

export const LIQ_MIN = 2000;
export const MAX_HORA = 3;
export const WALLET_H = 6;
export const RESUMEN_H = 21;
const H = 3600e3;

const ROLES = [
  ["payer", "paid for this launch"],
  ["creator", "created this token"],
  ["funder", "funded this launch"],
];
const PLAT = { pump_fun: "Pump.fun", "pump-fun": "Pump.fun", pumpswap: "PumpSwap", raydium: "Raydium", meteora: "Meteora",
  letsbonk: "LetsBonk", bonk: "LetsBonk", moonshot: "Moonshot", orca: "Orca" };

export function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
const corto = (m) => m.slice(0, 6) + "…" + m.slice(-7);
const usd = (n) => "$" + (n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "k" : Math.round(n));
const mil = (n) => Number(n).toLocaleString("en-US");

// La peor cara mala del lanzamiento (la que más tokens muertos tiene). t = state.tokens[m]; faces = buildList().faces
export function caraMala(t, faces) {
  let mejor = null;
  ROLES.forEach(function (r) {
    const addr = t && t[r[0]], f = addr && faces[addr];
    if (!f || f.lvl !== "bad" || !f.done) return;
    if (!mejor || f.dead > mejor.dead) mejor = { addr: addr, rol: r[0], txt: r[1], done: f.done, dead: f.dead };
  });
  // si quien pagó también lo creó, se cuenta como «paid for this launch»
  if (mejor && mejor.rol === "creator" && t.payer === mejor.addr) { mejor.rol = "payer"; mejor.txt = ROLES[0][1]; }
  return mejor;
}

// Avisos que tocan en esta ejecución. e = entradas del registro recién analizadas; st = state.radar (se modifica)
export function elegirAvisos(entradas, tokens, faces, st, now) {
  st.enviados = (st.enviados || []).filter((x) => now - x.at < 24 * H);
  const cand = [];
  entradas.forEach(function (e) {
    if (!e || !e.m || (e.liq || 0) < LIQ_MIN) return;
    if (st.enviados.some((x) => x.m === e.m)) return;
    const c = caraMala(tokens[e.m] || { payer: e.py, creator: e.cr, funder: e.fu }, faces);
    if (c) cand.push({ e: e, c: c });
  });
  cand.sort((a, b) => (b.e.liq || 0) - (a.e.liq || 0));
  const out = [];
  for (const x of cand) {
    if (st.enviados.filter((s) => now - s.at < H).length >= MAX_HORA) break;
    if (st.enviados.some((s) => s.w === x.c.addr && now - s.at < WALLET_H * H)) continue;
    st.enviados.push({ m: x.e.m, w: x.c.addr, at: now });
    out.push(x);
  }
  return out;
}

function edad(t, now) {
  const min = Math.max(1, Math.round((now - t) / 60e3));
  return min < 60 ? min + " min ago" : Math.round(min / 60) + " h ago";
}

// Texto y botones de un aviso (HTML de Telegram)
export function textoAviso(x, now) {
  const e = x.e, c = x.c;
  const plat = PLAT[e.p] || PLAT[e.d];
  const sym = e.s ? "$" + esc(e.s) : corto(e.m);
  const l = ["🚩 <b>Known face, new launch</b>", "",
    "<b>" + sym + "</b>" + (plat ? " · " + plat : "") + " · launched " + edad(e.t, now), "",
    "The wallet that " + c.txt + " has launched <b>" + mil(c.done) + " tokens</b> before.",
    (c.dead === c.done ? "<b>All " + mil(c.dead) + " were dead</b>" : "<b>" + mil(c.dead) + " were dead</b>") + " within 24 hours.", ""];
  const extra = [];
  extra.push("💧 Liquidity " + usd(e.liq) + (e.mc ? " · Market cap " + usd(e.mc) : ""));
  if ((e.f || []).some((f) => f.indexOf("COPYCAT:") === 0)) extra.push("⚠️ Also: copies the name of an older token");
  l.push(extra.join("\n"), "", "<code>" + e.m + "</code>", "", "<i>Data, not accusations. Not financial advice.</i>");
  return {
    text: l.join("\n"),
    botones: [[{ text: "🔍 Who's behind it", url: "https://token.solflag.com/en/" + e.m },
      { text: "📊 Scan on SolFlag", url: "https://solflag.com/en/?token=" + e.m }]],
  };
}

// Fecha y hora de Madrid
export function madrid(now) {
  const p = {};
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date(now)).forEach((x) => { p[x.type] = x.value; });
  return { dia: p.year + "-" + p.month + "-" + p.day, hora: +p.hour };
}

// Resumen del día: una vez, en la primera ejecución desde las 21:00 de Madrid. reg = state.reg
export function resumenDia(reg, st, now) {
  const m = madrid(now);
  if (m.hora < RESUMEN_H || st.resumen === m.dia) return null;
  const hoy = Object.values(reg).filter((e) => e && e.a && madrid(e.a).dia === m.dia && e.l !== "ERROR");
  if (!hoy.length) return null;
  st.resumen = m.dia;
  const caras = hoy.filter((e) => e.cara === "bad").length;
  const buenos = hoy.filter((e) => e.tr === "YELLOW" || e.tr === "GREEN" || e.tr === "DIAMOND").length;
  return { text: ["📋 <b>Today on Solana launches</b>", "",
    "We analysed <b>" + mil(hoy.length) + "</b> new tokens.",
    "<b>" + mil(caras) + "</b> were launched by wallets with a long trail of dead tokens.",
    (buenos ? "Only <b>" + mil(buenos) + "</b> got a yellow level or better." : "None got a yellow level or better."), "",
    "Paste any token to @SolFlagBot for a second opinion."].join("\n") };
}

export async function enviar(token, chat, msg) {
  const body = { chat_id: chat, text: msg.text, parse_mode: "HTML", disable_web_page_preview: true };
  if (msg.botones) body.reply_markup = { inline_keyboard: msg.botones };
  const r = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error("Telegram: " + (j.description || r.status));
}
