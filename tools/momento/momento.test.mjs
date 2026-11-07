import test from "node:test";
import assert from "node:assert/strict";
import { shape, candidates, MAX_HOLDERS } from "./forma.mjs";

test("candidates skip stables and wrappers and keep the trending rank", () => {
  const j = {
    data: [
      { attributes: { name: "SOL / USDC" }, relationships: { base_token: { data: { id: "solana_So11111111111111111111111111111111111111112" } } } },
      { attributes: { name: "ABC / SOL", pool_created_at: "2026-11-07T08:00:00Z" }, relationships: { base_token: { data: { id: "solana_Abc1111111111111111111111111111111111pump" } } } },
      { attributes: { name: "ABC / USDC" }, relationships: { base_token: { data: { id: "solana_Abc1111111111111111111111111111111111pump" } } } },
      { attributes: { name: "JITOSOL / SOL" }, relationships: { base_token: { data: { id: "solana_J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn" } } } }
    ],
    included: [
      { id: "solana_Abc1111111111111111111111111111111111pump", attributes: { symbol: "ABC", name: "Abc", image_url: "missing.png" } },
      { id: "solana_J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn", attributes: { symbol: "JitoSOL" } }
    ]
  };
  const c = candidates(j);
  assert.equal(c.length, 1);
  assert.equal(c[0].sym, "ABC");
  assert.equal(c[0].rank, 2);
  assert.equal(c[0].img, null);
  assert.ok(c[0].created > 0);
});

test("shape keeps the biggest holders, marks groups and drops groups left with one member", () => {
  const holders = [];
  for (let i = 0; i < 50; i++) holders.push({ addr: "w" + i, pct: 50 - i, type: i === 0 ? "pool" : "person" });
  const m = { mint: "M", mode: "young", ageDays: 0.123456, creator: "w3", holders,
    groups: [{ id: "A", funder: "F", members: ["w1", "w2", "w45"], pct: 51.2345 }, { id: "B", funder: "G", members: ["w46", "w47"], pct: 9 }],
    signals: [{ code: "MAP_GROUP", s: "bad", data: {} }] };
  const o = shape(m, { at: 5, rank: 1, sym: "ABC" }, (a) => (a === "w4" ? { name: "Binance" } : null));
  assert.equal(o.holders.length, MAX_HOLDERS);
  assert.equal(o.holders[0].a, "w0");
  assert.equal(o.holders[1].g, "A");
  assert.equal(o.holders[3].cr, 1);
  assert.equal(o.holders[4].name, "Binance");
  assert.deepEqual(o.groups.map((g) => g.id), ["A"]);
  assert.equal(o.groups[0].n, 3);
  assert.equal(o.groups[0].pct, 51.23);
  assert.equal(o.age, 0.12);
  assert.deepEqual(o.signals, [{ code: "MAP_GROUP", s: "bad" }]);
});
