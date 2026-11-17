import test from "node:test";
import assert from "node:assert/strict";
import { caraMala, elegirAvisos, textoAviso, resumenDia, madrid, esc, MAX_HORA } from "./radar.mjs";

const H = 3600e3;
const NOW = Date.UTC(2026, 10, 15, 19, 0);   // 20:00 en Madrid
const faces = {
  MALA: { lvl: "bad", n: 26, done: 26, dead: 25 },
  PEOR: { lvl: "bad", n: 153, done: 141, dead: 140 },
  REGULAR: { lvl: "warn", n: 6, done: 6, dead: 6 },
};
const ent = (m, liq, extra) => Object.assign({ m: m + "x".repeat(40), t: NOW - H, a: NOW, liq: liq, mc: 13517, p: "pump_fun", s: "XCAT", f: [] }, extra);

test("caraMala: solo caras «bad» y se queda la de más muertos", () => {
  assert.equal(caraMala({ payer: "REGULAR" }, faces), null);
  const c = caraMala({ payer: "MALA", funder: "PEOR" }, faces);
  assert.equal(c.addr, "PEOR"); assert.equal(c.rol, "funder");
  assert.equal(caraMala({ payer: "MALA", creator: "MALA" }, faces).txt, "paid for this launch");
});

test("elegirAvisos: liquidez mínima, máximo por hora, wallet repetida y token repetido", () => {
  const tokens = {};
  const es = [ent("A", 1999), ent("B", 9000), ent("C", 8000), ent("D", 7000), ent("E", 6000), ent("F", 5000)];
  es.forEach((e, i) => { tokens[e.m] = { payer: i % 2 ? "MALA" : "PEOR" }; });
  const st = {};
  const out = elegirAvisos(es, tokens, faces, st, NOW);
  // B (MALA) y C (PEOR) entran; D y E repiten wallet en < 6 h; A no llega a 2.000 $
  assert.deepEqual(out.map((x) => x.e.m[0]), ["B", "C"]);
  assert.equal(elegirAvisos(es, tokens, faces, st, NOW + 60e3).length, 0);
  // otra hora con wallets nuevas: tope por hora
  const muchos = "GHIJK".split("").map((k) => ent(k, 5000));
  muchos.forEach((e, i) => { tokens[e.m] = { payer: "W" + i }; faces["W" + i] = { lvl: "bad", done: 5, dead: 5 }; });
  const st2 = {};
  assert.equal(elegirAvisos(muchos, tokens, faces, st2, NOW).length, MAX_HORA);
});

test("textoAviso: texto aprobado, escapa el símbolo y lleva botones", () => {
  const e = ent("A", 8827, { s: "<b>X&Y", f: ["COPYCAT:w"] });
  const m = textoAviso({ e: e, c: { txt: "paid for this launch", done: 26, dead: 25 } }, NOW);
  assert.match(m.text, /Known face, new launch/);
  assert.match(m.text, /\$&lt;b&gt;X&amp;Y<\/b> · Pump\.fun · launched 1 h ago/);
  assert.match(m.text, /has launched <b>26 tokens<\/b> before/);
  assert.match(m.text, /<b>25 were dead<\/b> within 24 hours/);
  assert.match(m.text, /Liquidity \$8\.8k · Market cap \$13\.5k/);
  assert.match(m.text, /copies the name/);
  assert.match(m.text, /Not financial advice/);
  assert.equal(m.botones[0][0].url, "https://token.solflag.com/en/" + e.m);
  const todos = textoAviso({ e: ent("B", 5000), c: { txt: "x", done: 5, dead: 5 } }, NOW);
  assert.match(todos.text, /All 5 were dead/);
});

test("resumenDia: una vez al día desde las 21:00 de Madrid", () => {
  const reg = { a: { a: NOW, cara: "bad", tr: "RED" }, b: { a: NOW, tr: "YELLOW" }, c: { a: NOW, tr: "ORANGE", l: "ERROR" } };
  const st = {};
  assert.equal(resumenDia(reg, st, NOW), null);                 // 20:00 todavía no
  const r = resumenDia(reg, st, NOW + H + 7 * 60e3);           // 21:07
  assert.match(r.text, /analysed <b>2<\/b>/);
  assert.match(r.text, /<b>1<\/b> were launched/);
  assert.match(r.text, /Only <b>1<\/b> got a yellow/);
  assert.equal(resumenDia(reg, st, NOW + 2 * H), null);         // ya enviado hoy
});

test("madrid y esc", () => {
  assert.deepEqual(madrid(NOW), { dia: "2026-11-15", hora: 20 });
  assert.equal(esc("a<b>&"), "a&lt;b&gt;&amp;");
});
