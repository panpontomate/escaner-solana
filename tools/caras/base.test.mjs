import test from "node:test";
import assert from "node:assert/strict";
import { emptyBase, observe, classify, pruneBase, mergeAporte, publishBase, DAY } from "./base.mjs";

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
