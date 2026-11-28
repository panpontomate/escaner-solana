import test from "node:test";
import assert from "node:assert/strict";
import { leer, cambios, dato, notaHTML } from "./nota.js";
import { pagina } from "./ficha.js";

const ck = (liq, rep) => JSON.stringify([["control", "suma", 15, null], ["reparto", rep >= 0 ? "suma" : "resta", rep, 30], ["liquidez", liq >= 0 ? "suma" : "resta", liq, liq >= 0 ? 312000 : 168000]]);
const fila = (dia, pts, tier, liq, rep) => ({ dia, pts, tier, ap: "meme", ck: ck(liq, rep) });
const ROWS = [fila("2026-11-30", 81, "GREEN", -4, 10), fila("2026-11-28", 88, "GREEN", 3, 10), fila("2026-11-29", 88, "GREEN", 3, 10)];

test("nota: leer ordena por día y descarta filas rotas", () => {
  const s = leer(ROWS.concat([{ dia: "2026-11-27", pts: null, ck: "[]" }, { dia: "2026-11-26", pts: 70, ck: "no es json" }]));
  assert.deepEqual(s.map((r) => r.dia), ["2026-11-26", "2026-11-28", "2026-11-29", "2026-11-30"]);
  assert.deepEqual(s[0].ck, []);
});

test("nota: cambios solo los días que cambia, con el apartado que la movió", () => {
  const c = cambios(leer(ROWS));
  assert.equal(c.length, 1);
  assert.equal(c[0].dia, "2026-11-30");
  assert.equal(c[0].de, 88); assert.equal(c[0].a, 81);
  assert.equal(c[0].ck.length, 1);
  assert.equal(c[0].ck[0].k, "liquidez");
  assert.equal(dato(c[0].ck[0].antes, "es"), "312.000 $");
  assert.equal(dato(c[0].ck[0].ahora, "es"), "168.000 $");
});

test("nota: el dato de cada chequeo, como en el Escáner", () => {
  assert.equal(dato({ k: "reparto", col: "suma", p: 10, d: 22.95 }, "es"), "Las 10 mayores tienen el 23 %");
  assert.equal(dato({ k: "reparto", col: "suma", p: 10, d: 22.95 }, "en"), "The top 10 hold 23%");
  assert.equal(dato({ k: "control", col: "suma", p: 15, d: null }, "es"), "Nadie puede crear más ni congelar");
  assert.equal(dato({ k: "edad", col: "suma", p: 10, d: 1433 }, "es"), "3,9 años");
  assert.equal(dato({ k: "liquidez", col: "falta", p: 0, d: null }, "en"), "We do not have it yet");
});

test("nota: sin filas no hay tarjeta; con una, la nota de hoy y desde cuándo", () => {
  assert.equal(notaHTML([], "es", "#"), "");
  const h = notaHTML([ROWS[1]], "es", "#");
  assert.match(h, /88/);
  assert.match(h, /Empezamos a guardarla el 28\/11/);
  assert.doesNotMatch(h, /<svg/);
});

test("nota: con varios días, gráfica y lista de cambios en los dos idiomas", () => {
  const es = notaHTML(ROWS, "es", "#");
  assert.match(es, /<svg class="hn-g"/);
  assert.match(es, /88 → 81/);
  assert.match(es, /<em>Liquidez<\/em>312\.000 \$ → 168\.000 \$/);
  const en = notaHTML(ROWS, "en", "#");
  assert.match(en, /<em>Liquidity<\/em>\$312,000 → \$168,000/);
  assert.match(en, /11\/30/);
});

test("nota: la ficha numera las tarjetas solas y solo pone la de la nota si hay notas", () => {
  const d = { lanz: null, consultas: 0, roles: [], buyers: [], others: [], notas: [] };
  const mk = { name: "Bonk", symbol: "BONK", image: null, mc: 1e8, liq: 2e5, dex: "raydium", created: Date.UTC(2022, 11, 25), vol: 1e5, ch: 1, dexes: [{ dex: "raydium", liq: 2e5 }] };
  const sin = pagina("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", d, mk, null, Date.UTC(2026, 10, 30), "es");
  assert.doesNotMatch(sin, /day by day|día a día/);
  assert.match(sin, /<span class="n">10<\/span> Otros tokens/);
  const con = pagina("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", Object.assign({}, d, { notas: ROWS }), mk, null, Date.UTC(2026, 10, 30), "es");
  assert.match(con, /<span class="n">05<\/span> Nota de SolFlag, día a día/);
  assert.match(con, /<span class="n">11<\/span> Otros tokens/);
  assert.match(con, /\.hn-top/);
});
