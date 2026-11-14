import test from "node:test";
import assert from "node:assert/strict";
import { emptyBase, observe, classify, pruneBase, mergeAporte, publishBase, equipos, EQ_MIN, DAY } from "./base.mjs";

const NOW = 1e12;

test("observe accumulates roles, distinct tokens and the latest rate", () => {
  const b = emptyBase();
  observe(b, { addr: "A", role: "funder", token: "t1", at: NOW - DAY }, NOW);
  observe(b, { addr: "A", role: "funder", token: "t1" }, NOW);
  observe(b, { addr: "A", role: "group", token: "t2", ph: 54.4 }, NOW);
  assert.deepEqual(b.wallets.A.roles, { funder: 2, group: 1 });
  assert.equal(b.wallets.A.nTok, 2);
  assert.equal(b.wallets.A.ph, 54);
  assert.equal(b.wallets.A.first, NOW - DAY);
});

test("classify: exchanges by rate, farms, distributors, serial creators, labels", () => {
  assert.equal(classify({ ph: 900, roles: {}, nTok: 0 }), "exchange");
  assert.equal(classify({ ph: 250, roles: { funder: 1, group: 1 }, nTok: 2 }), "exchange");   // funds holders of two tokens, busy
  assert.equal(classify({ ph: 250, roles: { funder: 1 }, nTok: 1 }), null);                   // busy but one token: unknown
  assert.equal(classify({ ph: 54, roles: { group: 2 }, nTok: 1 }), "repartidor");
  assert.equal(classify({ roles: { payer: 3 }, nTok: 3 }), "granja");
  assert.equal(classify({ roles: { creator: 3 }, nTok: 3 }), "creador en serie");
  assert.equal(classify({ roles: { creator: 1 }, nTok: 1 }), null);
  assert.equal(classify({ roles: {}, nTok: 0, label: "exchange" }), "exchange");
});

test("classify: a busy wallet with more than 3 own launches is not an exchange; a named one still is", () => {
  assert.equal(classify({ ph: 900, roles: { payer: 130, own: 124 }, nTok: 130 }), "granja");   // bot like Ejcw…DVgZ
  assert.equal(classify({ ph: 191, roles: { payer: 130, own: 124, funder: 7 }, nTok: 137 }), "granja");
  assert.equal(classify({ ph: 900, roles: { payer: 3, own: 3 }, nTok: 3 }), "exchange");       // its own token or two: BNB, PUMP
  assert.equal(classify({ ph: 900, roles: { payer: 46 }, nTok: 46 }), "exchange");             // pays for others, creates nothing
  assert.equal(classify({ ph: 900, roles: { payer: 9, own: 9 }, nTok: 9, label: "exchange" }), "exchange");
});

test("prune forgets one-off unknown wallets after 3 days, keeps known ones", () => {
  const b = emptyBase();
  observe(b, { addr: "ONE", role: "creator", token: "t", at: NOW - 4 * DAY }, NOW);
  observe(b, { addr: "EX", ph: 5000, at: NOW - 40 * DAY }, NOW);
  observe(b, { addr: "OLD", role: "creator", token: "a", at: NOW - 40 * DAY }, NOW);
  observe(b, { addr: "OLD", role: "creator", token: "b", at: NOW - 40 * DAY }, NOW);
  pruneBase(b, NOW);
  assert.deepEqual(Object.keys(b.wallets), ["EX"]);
});

test("aportes are merged once and publish lists what is known", () => {
  const b = emptyBase();
  assert.equal(mergeAporte(b, "a.json", [{ addr: "EX", ph: 1200 }, { addr: "D", role: "group", token: "x", ph: 30 }, { addr: "D", role: "group", token: "y" }], NOW), 3);
  assert.equal(mergeAporte(b, "a.json", [{ addr: "EX", ph: 1200 }], NOW), 0);
  const p = publishBase(b, NOW);
  assert.deepEqual(Object.keys(p.base.wallets).sort(), ["D", "EX"]);
  assert.equal(p.base.wallets.D.t, "repartidor");
  assert.deepEqual(p.exchanges.exchanges, { EX: 1200 });
  assert.deepEqual(p.base.count, { exchange: 1, repartidor: 1 });
});

test("groups: published only from EQ_MIN launches, members kept and listed even with no type", () => {
  const b = emptyBase();
  for (let i = 0; i < EQ_MIN; i++) observe(b, { addr: "A" + (i % 2), eq: "e1", token: "t" + i, at: NOW }, NOW);
  observe(b, { addr: "B", eq: "e2", token: "x", at: NOW }, NOW);
  observe(b, { addr: "B", eq: "e2", token: "y", at: NOW }, NOW);
  assert.deepEqual(equipos(b), { e1: { w: 2, n: EQ_MIN }, e2: { w: 1, n: 2 } });
  const p = publishBase(b, NOW);
  assert.deepEqual(p.base.equipos, { e1: { w: 2, n: EQ_MIN } });
  assert.equal(p.base.wallets.A0.eq, "e1");
  assert.equal(p.base.wallets.A0.t, null);
  assert.equal(p.base.wallets.B, undefined);
  observe(b, { addr: "A0", eq: "otro", at: NOW }, NOW);
  assert.equal(b.wallets.A0.eq, "e1");          // el primer grupo se queda
  pruneBase(b, NOW + 20 * DAY);
  assert.ok(b.wallets.A0 && b.wallets.B);        // un miembro de grupo no se olvida a los 3 días
});
