import test from "node:test";
import assert from "node:assert/strict";
import { avisosBallenas, volumenes, avisoVolumen, avisosDiarios, elegir, resumenDia, MAX_DIA } from "./radar.mjs";

const M = "MEFNBXixkEbait3xn9bkm8WsJzXtVsaJEn4c8Sam21u", W = "32WMXy2CjmgweedFaUuNVHj6yM3DyVWH6eLQ4g2PHzkw";
const info = { [M]: { sym: "ME", n: "Magic Eden", ap: "apps" } };
const T = Date.UTC(2026, 10, 27, 11, 0);

test("ballenas: baja de 5 puntos avisa con tokens y dólares; 2 puntos no", () => {
  const a = avisosBallenas([[M, T, "baja", W, 27.6, 22.6, null, null, 49639912, 0.04291], [M, T, "baja", "x", 10, 8, null, null, 1, 1]], info, { [W]: "w" }, {});
  assert.equal(a.length, 1);
  assert.match(a[0].text, /27\.6%/); assert.match(a[0].text, /22\.6%/); assert.match(a[0].text, /\$2\.1M/);
});
test("ballenas: las del propio proyecto solo si mandan a un exchange", () => {
  const p = { [W]: "j" }, pj = { [W]: ["Magic Eden", "treasury"] };
  assert.equal(avisosBallenas([[M, T, "baja", W, 30, 20, null, null, 1e8, 0.04]], info, p, pj).length, 0);
  const e = avisosBallenas([[M, T, "envio", W, 30, 20, "X", "Binance", 1e8, 0.04]], info, p, pj);
  assert.equal(e.length, 1); assert.match(e[0].text, /Binance/); assert.match(e[0].text, /project's own wallet/);
});
test("volumen: solo con 50 k$ o más y ordenado por veces", () => {
  const normal = { t: { a: ["A", "defi", "pa", 100000, 7], b: ["B", "defi", "pb", 10000, 7], c: ["C", "defi", "pc", 1000, 7] } };
  const pares = [{ pairAddress: "pa", volume: { h24: 450000 } }, { pairAddress: "pb", volume: { h24: 60000 } }, { pairAddress: "pc", volume: { h24: 40000 } }];
  const L = volumenes(normal, pares, { a: { sym: "A" }, b: { sym: "B" }, c: { sym: "C" } });
  assert.deepEqual(L.map((x) => x.sym), ["B", "A"]);
  const v = avisoVolumen(L[0], [[T, 1, 20000], [T, 0, 5000]]);
  assert.match(v.text, /6× its usual volume/); assert.match(v.text, /sold \$20k net/);
});
test("diarios: comisiones de más de un 30 % en proyectos de más de 300 k$ y web caída", () => {
  const eco = { rows: [{ n: "Big", ap: "DeFi", med: "fees", m: 7.5e6, c: -0.59, sym: "BIG", mint: "m1" }, { n: "Small", ap: "DeFi", med: "fees", m: 1e5, c: -0.9 },
    { n: "Calm", ap: "DeFi", med: "fees", m: 5e6, c: 0.1 }, { n: "Alch", ap: "IA", med: "vale", m: 1, c: 0, sym: "ALCH", mint: "m2" }] };
  const out = avisosDiarios(eco, { t: { m2: { web: { u: "https://alchemistai.app", ok: false, s: 500 } } } }, T);
  assert.deepEqual(out.map((x) => x.k), ["u:Big:-", "w:m2"]);
  assert.match(out[0].text, /down 59%/); assert.match(out[0].text, /was about \$18\.3M/);
});
test("elegir: tope del día, sin repetir y un aviso por token", () => {
  const st = {}, c = (k, m, pri = 3) => ({ k, m, pri, text: k, resumen: k });
  const l = [c("v:a", "a"), c("b:a:w", "a"), ...Array.from({ length: 8 }, (_, i) => c("w:" + i, "t" + i))];
  const out = elegir(l, st, T);
  assert.equal(out.length, MAX_DIA); assert.equal(out.filter((x) => x.m === "a").length, 1);
  assert.equal(elegir([c("v:a", "a")], st, T + 3600e3).length, 0);
  const r = resumenDia(st, [{ sym: "MPLX", x: 4.6 }], Date.UTC(2026, 10, 27, 20, 5));
  assert.match(r.text, /MPLX 4\.6×/); assert.match(r.text, /Alerts today:<\/b> 6/);
  assert.equal(resumenDia(st, [], Date.UTC(2026, 10, 27, 20, 30)), null);
});
