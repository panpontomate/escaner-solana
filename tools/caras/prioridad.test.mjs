import test from "node:test";
import assert from "node:assert/strict";
import { puntos, elegir, AZAR } from "./prioridad.mjs";
import { emptyBase, observe } from "./base.mjs";

const NOW = Date.UTC(2026, 10, 15, 12);

test("points: size at birth and buyers add, the people behind can take it away", () => {
  const base = emptyBase();
  assert.equal(puntos({ mc: 3000 }, {}, base).p, 0);
  assert.equal(puntos({ mc: 120e3, liq: 30e3, buyers: 60 }, {}, base).p, 7);
  assert.deepEqual(puntos({ mc: 25e3, buyers: 20 }, {}, base).por, ["mc20k", "comp15"]);
  // a farm paid the creation: it falls behind a tiny token
  for (let i = 0; i < 3; i++) observe(base, { addr: "FARM", role: "payer", token: "T" + i, at: NOW }, NOW);
  assert.equal(puntos({ mc: 60e3 }, { payer: "FARM" }, base).p, -2);
  assert.ok(puntos({ mc: 60e3 }, { payer: "FARM" }, base).por.includes("granja"));
  // a wallet behind more than 20 launches (any role)
  for (let i = 0; i < 21; i++) observe(base, { addr: "SER", role: "funder", token: "S" + i, at: NOW }, NOW);
  assert.ok(puntos({}, { funder: "SER" }, base).por.includes("serie"));
  // unknown wallets change nothing
  assert.equal(puntos({ mc: 6e3 }, { payer: "NEW", creator: "NEW2" }, base).p, 1);
});

test("choose: the best by points, ties by arrival, and the random share among the rest", () => {
  const lista = [{ mint: "a", p: 0 }, { mint: "b", p: 5 }, { mint: "c", p: 5 }, { mint: "d", p: -5 }, { mint: "e", p: 1 }];
  assert.deepEqual(elegir(lista, 2, () => 0, 0), { b: "prio", c: "prio" });
  // 3 slots, 1 random: b and c by points, the random one is the first left (rnd 0) in points order: e
  assert.deepEqual(elegir(lista, 3, () => 0, 1), { b: "prio", c: "prio", e: "azar" });
  // the random share can land on anyone, even a farm
  assert.equal(elegir(lista, 3, () => 0.99, 1).d, "azar");
  // more slots than launches: all of them
  assert.equal(Object.keys(elegir(lista, 40)).length, 5);
  assert.deepEqual(elegir(lista, 0), {});
  // with the default share, 40 slots out of 100: 30 by points, 10 at random
  const cien = Array.from({ length: 100 }, (_, i) => ({ mint: "m" + i, p: i % 7 }));
  const s = Object.values(elegir(cien, 40));
  assert.equal(s.filter((x) => x === "prio").length, 40 - AZAR);
  assert.equal(s.filter((x) => x === "azar").length, AZAR);
});
