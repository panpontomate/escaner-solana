import test from "node:test";
import assert from "node:assert/strict";
import { faceLevel, isDead, onCurve, facesOf, emptyState, addToken, resolveToken, buildList, prune, needInfraCheck, perHour, DAY } from "./lib.mjs";

const NOW = 1e12;
const ok = { at: NOW, infra: false };

test("faceLevel uses the creator-history thresholds", () => {
  assert.equal(faceLevel(2, 2), null);
  assert.equal(faceLevel(3, 3), "warn");
  assert.equal(faceLevel(5, 3), null);       // 60% dead
  assert.equal(faceLevel(10, 10), "bad");
  assert.equal(faceLevel(10, 9), "warn");    // 90%: one took off, not red
  assert.equal(faceLevel(20, 19), "bad");
  assert.equal(faceLevel(10, 8), "warn");
});

test("isDead: under $10k, no market or rug", () => {
  assert.equal(isDead({ mcap: 9999 }), true);
  assert.equal(isDead({}), true);
  assert.equal(isDead({ mcap: 50000 }), false);
  assert.equal(isDead({ mcap: 50000, rug: true }), true);
  // the pool was pulled ($23k -> $5) even if the market cap still reads $12.5k
  assert.equal(isDead({ mcap: 12550, liq: 23217, liqNow: 5 }), true);
  assert.equal(isDead({ mcap: 50000, liq: 20000, liqNow: 2000 }), false);   // a 90 % drop is not enough
  assert.equal(isDead({ mcap: 50000, liq: 900, liqNow: 0 }), false);        // too little at the start to tell
  assert.equal(isDead({ mcap: 40000, liq: 5000, liqNow: 0, cv: true }), false);   // still on the Pump.fun curve
  assert.equal(isDead({ mcap: 50000 }), false);                             // no starting liquidity known: as before
});

test("facesOf keeps one role per wallet", () => {
  assert.deepEqual(facesOf({ payer: "A", creator: "A", funder: "B" }), [{ addr: "A", role: "payer" }, { addr: "B", role: "funder" }]);
});

test("a payer behind dead launches is flagged even with fresh creators, and its next launch too", () => {
  const s = emptyState();
  s.infra = { P: ok, Q: ok, X: { at: NOW, infra: true } };
  for (let i = 0; i < 4; i++) { addToken(s, "m" + i, { t: NOW - 2 * DAY, payer: "P", creator: "c" + i }); resolveToken(s, "m" + i, 3000); }
  addToken(s, "live", { t: NOW - 2 * DAY, payer: "Q" }); resolveToken(s, "live", 1e6);
  for (let i = 0; i < 5; i++) { addToken(s, "x" + i, { t: NOW - 2 * DAY, payer: "X" }); resolveToken(s, "x" + i, 0); }   // exchange: ignored
  addToken(s, "new", { t: NOW - 3600e3, payer: "P", creator: "fresh" });
  const l = buildList(s, NOW);
  assert.deepEqual(Object.keys(l.faces), ["P"]);
  assert.deepEqual(l.faces.P, { lvl: "warn", n: 5, done: 4, dead: 4, roles: { payer: 5 }, last: NOW - 3600e3, ex: ["m3", "m2", "m1"] });
  assert.deepEqual(l.mints, { new: "P" });
  assert.deepEqual(Object.keys(s.tokens), ["new"]);    // resolved tokens are folded into the counters
});

test("a creator funded by a wallet with successful launches is not flagged", () => {
  const s = emptyState(); s.infra = { F: ok };
  for (let i = 0; i < 5; i++) { addToken(s, "m" + i, { t: NOW - 2 * DAY, funder: "F", creator: "c" + i }); resolveToken(s, "m" + i, i < 3 ? 2000 : 80000); }
  assert.deepEqual(buildList(s, NOW).faces, {});      // 3 of 5 dead = 60%
});

test("funder-only wallets over 100 tx/h are small exchanges; payers keep the 300 limit", () => {
  const s = emptyState();
  s.infra = { F: { at: NOW, ph: 180, infra: false }, G: { at: NOW, ph: 60, infra: false }, P: { at: NOW, ph: 180, infra: false } };
  for (let i = 0; i < 3; i++) {
    addToken(s, "f" + i, { t: NOW - 2 * DAY, funder: "F", creator: "c" + i }); resolveToken(s, "f" + i, 0);
    addToken(s, "g" + i, { t: NOW - 2 * DAY, funder: "G", creator: "d" + i }); resolveToken(s, "g" + i, 0);
    addToken(s, "p" + i, { t: NOW - 2 * DAY, payer: "P", creator: "e" + i }); resolveToken(s, "p" + i, 0);
  }
  assert.deepEqual(Object.keys(buildList(s, NOW).faces).sort(), ["G", "P"]);
});

test("wallets not yet checked for activity never count", () => {
  const s = emptyState();
  for (let i = 0; i < 4; i++) { addToken(s, "m" + i, { t: NOW - 2 * DAY, payer: "P" }); resolveToken(s, "m" + i, 0); }
  assert.deepEqual(buildList(s, NOW).faces, {});
  assert.deepEqual(needInfraCheck(s), ["P"]);
});

test("prune forgets one-off faces after 3 days, others after 30, stale tokens and infra checks", () => {
  const s = emptyState();
  s.faces = { one: { n: 1, last: NOW - 4 * DAY }, two: { n: 2, last: NOW - 4 * DAY }, old: { n: 9, last: NOW - 31 * DAY } };
  s.tokens = { stuck: { seen: NOW - 8 * DAY }, ok: { seen: NOW } };
  s.infra = { two: { at: NOW - 8 * DAY }, old: { at: NOW } };
  prune(s, NOW);
  assert.deepEqual(Object.keys(s.faces), ["two"]);
  assert.deepEqual(Object.keys(s.tokens), ["ok"]);
  assert.deepEqual(Object.keys(s.infra), []);
});

test("perHour", () => {
  assert.equal(perHour([{ blockTime: 7200 }, { blockTime: 3600 }, { blockTime: 0 }]), 1.5);
  assert.equal(perHour([]), 0);
});

test("a face counts the launches whose pool was pulled as dead", () => {
  const s = emptyState();
  addToken(s, "r", { t: NOW - 2 * DAY, payer: "P", liq: 48052 });
  resolveToken(s, "r", 67433, 51, false);
  addToken(s, "c", { t: NOW - 2 * DAY, payer: "P", liq: 5000 });
  resolveToken(s, "c", 40000, 0, onCurve([{ dexId: "pumpfun" }]));
  assert.deepEqual([s.faces.P.done, s.faces.P.dead], [2, 1]);
  assert.equal(onCurve([{ dexId: "pumpfun" }, { dexId: "pumpswap" }]), false);
  assert.equal(onCurve([]), false);
});
