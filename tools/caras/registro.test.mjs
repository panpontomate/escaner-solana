import test from "node:test";
import assert from "node:assert/strict";
import { regEntry, regDue, regResolve, regDone, daySummary, mergeDay, regPrune, regPublish, dayOf } from "./registro.mjs";
import { DAY } from "./lib.mjs";

const NOW = Date.UTC(2026, 9, 29, 12);
const result = {
  sym: "CATBOT", lvl: "MEDIUM", sev: 2, type: "OPEN",
  lights: [
    { k: "control", s: "warn", items: [{ code: "COPYCAT", s: "warn", data: { n: 14 } }] },
    { k: "concentration", s: "ok", items: [{ code: "CON_OK", s: "ok", data: { w1: 0.0833, w10: 0.6788 } }] },
    { k: "market", s: "bad", items: [{ code: "MKT_LIQ_VERY_LOW", s: "bad", data: { liq: 900 } }, { code: "MKT_NEW", s: "warn" }] },
    { k: "dependency", s: "na", items: [{ code: "CON_UNAVAILABLE", s: "na" }] }
  ],
  pair: { liquidity: { usd: 900.4 }, marketCap: 47055.38 }
};

test("an entry keeps the verdict, the signals that are not ok and the launch wallets, in short keys", () => {
  const e = regEntry("M1", { t: NOW - 600e3, dex: "pump-fun", plat: "pump_fun", payer: "P", funder: "F", creator: "C" }, result, NOW, "warn");
  assert.deepEqual(e, { m: "M1", t: NOW - 600e3, a: NOW, d: "pump-fun", p: "pump_fun", s: "CATBOT", l: "MEDIUM", v: 2, ty: "OPEN",
    f: ["COPYCAT:w", "MKT_LIQ_VERY_LOW:b", "MKT_NEW:w", "CON_UNAVAILABLE:n"], w1: 0.1, w10: 0.7, liq: 900, mc: 47055,
    py: "P", fu: "F", cr: "C", cara: "warn" });
  // the engine failed: the launch is still recorded
  assert.deepEqual(regEntry("M2", { t: NOW, rug: true }, null, NOW), { m: "M2", t: NOW, a: NOW, l: "ERROR", rug: true });
});

test("results at 24 h and 7 days, dead under $10k or rug", () => {
  const reg = { a: { m: "a", t: NOW - 2 * DAY }, b: { m: "b", t: NOW - 3600e3 }, c: { m: "c", t: NOW - 8 * DAY, h24: { dead: true } }, d: { m: "d", t: NOW - 3 * DAY, h24: {} } };
  assert.deepEqual(regDue(reg, NOW), { h24: ["a"], d7: ["c"] });
  regResolve(reg.a, "h24", [{ marketCap: 8000, liquidity: { usd: 3000 } }, { fdv: 12000, liquidity: { usd: 500 } }]);
  assert.deepEqual(reg.a.h24, { mc: 12000, liq: 3000, dead: false });
  assert.deepEqual(regResolve({ rug: true }, "h24", [{ marketCap: 90000 }]).h24.dead, true);
  assert.deepEqual(regResolve({}, "d7", []).d7, { mc: 0, liq: 0, dead: true });   // no market left
  assert.equal(regDone(reg.c), false);
  regResolve(reg.c, "d7", []);
  assert.equal(regDone(reg.c), true);
});

test("day summary by starting level, and merging into the published day", () => {
  const tokens = {
    a: { l: "HIGH", h24: { dead: true }, d7: { dead: true } },
    b: { l: "HIGH", h24: { dead: false } },
    c: { l: "LOW" },
    d: { l: "ERROR" }
  };
  assert.deepEqual(daySummary(tokens), { n: 4, levels: {
    HIGH: { n: 2, h24: 2, dead24: 1, d7: 1, dead7: 1 }, LOW: { n: 1, h24: 0, dead24: 0, d7: 0, dead7: 0 }, ERROR: { n: 1, h24: 0, dead24: 0, d7: 0, dead7: 0 } } });
  const f = mergeDay(null, "2026-10-29", [{ m: "a", l: "LOW" }], NOW);
  mergeDay(f, "2026-10-29", [{ m: "a", l: "LOW", h24: { dead: true } }, { m: "b", l: "HIGH" }], NOW + 1);
  assert.deepEqual(Object.keys(f.tokens), ["a", "b"]);
  assert.equal(f.tokens.a.h24.dead, true);
  assert.equal(f.updated, NOW + 1);
  assert.equal(dayOf(NOW), "2026-10-29");
});

test("each day is published twice: once all have the 24 h result, and when final", () => {
  const D = Date.UTC(2026, 9, 27), pub = {};
  const reg = { a: { m: "a", t: D + 3600e3 }, b: { m: "b", t: D + 5 * 3600e3 }, c: { m: "c", t: D + DAY + 60e3 } };
  assert.deepEqual(regPublish(reg, pub, D + DAY + 1800e3), []);             // day still open
  assert.deepEqual(regPublish(reg, pub, D + 2 * DAY), []);                  // no 24 h results yet
  reg.a.h24 = { dead: true };
  assert.deepEqual(regPublish(reg, pub, D + 2 * DAY + 3600e3), []);         // b still missing
  reg.b.h24 = { dead: false };
  let out = regPublish(reg, pub, D + 2 * DAY + 5400e3);
  assert.deepEqual(out.map((x) => [x.day, x.final, x.entries.length]), [["2026-10-27", false, 2]]);
  assert.deepEqual(regPublish(reg, pub, D + 2 * DAY + 7200e3), []);         // not again until final
  reg.a.d7 = { dead: true }; reg.b.d7 = { dead: true };
  out = regPublish(reg, pub, D + 8 * DAY);
  assert.deepEqual(out.map((x) => [x.day, x.final]), [["2026-10-27", true]]);
  assert.deepEqual(Object.keys(reg), ["c"]);                                // the final day leaves the state
  assert.deepEqual(pub, { "2026-10-27": 2 });
  // a day whose results never came is still published, as final, 9 days after it ended
  const reg2 = { x: { m: "x", t: D } }, pub2 = {};
  assert.deepEqual(regPublish(reg2, pub2, D + 9 * DAY), []);
  assert.deepEqual(regPublish(reg2, pub2, D + 10 * DAY + 1).map((x) => x.final), [true]);
});

test("pending entries are dropped after 12 days", () => {
  const reg = { old: { t: NOW - 13 * DAY }, young: { t: NOW - DAY } };
  assert.deepEqual(Object.keys(regPrune(reg, NOW)), ["young"]);
});
