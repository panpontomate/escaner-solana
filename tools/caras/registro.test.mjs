import test from "node:test";
import assert from "node:assert/strict";
import { regEntry, regDue, regResolve, regRecheck, regRejudge, regDone, daySummary, mergeDay, regPrune, regPublish, dayOf, regFill, regMissing } from "./registro.mjs";
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
  // with the engine version
  assert.equal(regEntry("M1", { t: NOW }, result, NOW, null, "0.4.9").ev, "0.4.9");
  // the engine failed: the launch is still recorded
  assert.deepEqual(regEntry("M2", { t: NOW, rug: true }, null, NOW), { m: "M2", t: NOW, a: NOW, l: "ERROR", rug: true });
  // RugCheck did not answer: marked so creator signals can be measured without them
  assert.equal(regEntry("M3", { t: NOW, nrc: true }, result, NOW).nrc, 1);
  assert.equal(regEntry("M3", { t: NOW, nrc: false }, result, NOW).nrc, undefined);
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

test("dead when the liquidity is pulled, but not on a Pump.fun curve", () => {
  // the pool went from $23k to $5: a rug even if the market cap still reads $12.5k
  assert.deepEqual(regResolve({ liq: 23217 }, "h24", [{ dexId: "meteora", marketCap: 12550, liquidity: { usd: 5 } }]).h24,
    { mc: 12550, liq: 5, dead: true, pull: true, dx: "meteora" });
  // a 90 % drop is not enough
  assert.equal(regResolve({ liq: 20000 }, "h24", [{ marketCap: 50000, liquidity: { usd: 2000 } }]).h24.dead, false);
  // too little liquidity at the start to call it pulled, but $1 left is dead anyway (dry)
  assert.deepEqual(regResolve({ liq: 900 }, "h24", [{ marketCap: 50000, liquidity: { usd: 1 } }]).h24, { mc: 50000, liq: 1, dead: true, dry: true });
  // still on the curve: DexScreener says $0 liquidity, the token is alive
  assert.deepEqual(regResolve({ liq: 5000 }, "h24", [{ dexId: "pumpfun", marketCap: 40000, liquidity: { usd: 0 } }]).h24,
    { mc: 40000, liq: 0, cv: true, dead: false, dx: "pumpfun" });
  // an old result is judged again with the new rule, and repeating it changes nothing
  const old = { liq: 48052, h24: { mc: 67433, liq: 51, dead: false } };
  regRecheck(old, "h24"); regRecheck(old, "h24");
  assert.deepEqual(old.h24, { mc: 67433, liq: 51, dead: true, pull: true });
  assert.equal(regRecheck({ liq: 100 }, "d7").d7, undefined);
});

test("dead without liquidity off the curve, whatever the market cap says", () => {
  // LUMI, 31/10: $434M market cap and $0 liquidity, no starting liquidity known
  assert.deepEqual(regResolve({}, "h24", [{ dexId: "meteora", marketCap: 434161491, liquidity: { usd: 0 } }]).h24,
    { mc: 434161491, liq: 0, dead: true, dry: true, dx: "meteora" });
  // no liquidity field at all counts as none
  assert.equal(regResolve({}, "h24", [{ marketCap: 90000 }]).h24.dry, true);
  // $1,000 is enough
  assert.equal(regResolve({}, "h24", [{ marketCap: 90000, liquidity: { usd: 1000 } }]).h24.dead, false);
  // under $10k it is dead for that reason: no dry mark
  assert.deepEqual(regResolve({}, "h24", [{ marketCap: 5000, liquidity: { usd: 0 } }]).h24, { mc: 5000, liq: 0, dead: true });
  // on the curve, $0 liquidity is normal
  assert.equal(regResolve({}, "h24", [{ dexId: "pumpfun", marketCap: 20000, liquidity: { usd: 0 } }]).h24.dead, false);
});

test("a published day is judged again with today's rule, only once", () => {
  const file = { v: 1, day: "2026-10-31", final: false, tokens: {
    a: { m: "a", h24: { mc: 434161491, liq: 0, dead: false } },
    b: { m: "b", h24: { mc: 65273909, liq: 663429, dead: false } },
    c: { m: "c", h24: { mc: 2678, liq: 0, cv: true, dead: true } } } };
  assert.equal(regRejudge(file), true);
  assert.deepEqual(file.tokens.a.h24, { mc: 434161491, liq: 0, dead: true, dry: true });
  assert.equal(file.tokens.b.h24.dead, false);
  assert.equal(regRejudge(file), false);
  assert.equal(regRejudge(null), false);
  assert.equal(daySummary(file.tokens).levels.ERROR.dead24, 2);
});

test("graduation: born on the Pump.fun curve and now with a market outside it", () => {
  const born = () => ({ m: "g", d: "pump-fun", liq: 2100 });
  // still on the curve: not graduated
  const a = regResolve(born(), "h24", [{ dexId: "pumpfun", marketCap: 9000, liquidity: { usd: 0 } }]).h24;
  assert.deepEqual([a.dx, a.cv, a.gr], ["pumpfun", true, undefined]);
  // graduated to PumpSwap (the curve pair can still be listed): main market = the most liquid one
  const b = regResolve(born(), "h24", [{ dexId: "pumpfun", marketCap: 70000, liquidity: { usd: 0 } }, { dexId: "pumpswap", marketCap: 71000, liquidity: { usd: 24000 } }]).h24;
  assert.deepEqual([b.dx, b.cv, b.gr, b.dead], ["pumpswap", undefined, true, false]);
  // graduated and then died: both are recorded
  const c = regResolve(born(), "d7", [{ dexId: "pumpswap", marketCap: 3000, liquidity: { usd: 900 } }]).d7;
  assert.deepEqual([c.gr, c.dead], [true, true]);
  // no market at all: neither
  assert.deepEqual(regResolve(born(), "h24", []).h24, { mc: 0, liq: 0, dead: true });
  // born outside the curve (Meteora, LaunchLab...): gr is only about Pump.fun, dx is still kept
  const d = regResolve({ m: "x", d: "meteora-dbc" }, "h24", [{ dexId: "meteora", marketCap: 50000, liquidity: { usd: 9000 } }]).h24;
  assert.deepEqual([d.dx, d.gr], ["meteora", undefined]);
  // day summary: curve tokens, how many have a graduation result and how many graduated
  const tokens = { a: Object.assign(born(), { l: "HIGH", h24: a }), b: Object.assign(born(), { l: "HIGH", h24: b, d7: c }),
    old: { d: "pump-fun", l: "HIGH", h24: { mc: 1, liq: 0, dead: true } }, x: { d: "meteora-dbc", l: "MEDIUM", h24: d } };
  assert.deepEqual(daySummary(tokens).curve, { n: 3, h24: 2, gr24: 1, d7: 1, gr7: 1 });   // "old" was resolved before dx existed
});

test("day summary by starting level, and merging into the published day", () => {
  const tokens = {
    a: { l: "HIGH", h24: { dead: true }, d7: { dead: true } },
    b: { l: "HIGH", h24: { dead: false } },
    c: { l: "LOW" },
    d: { l: "ERROR" }
  };
  const sum = daySummary(tokens);
  assert.deepEqual({ n: sum.n, levels: sum.levels }, { n: 4, levels: {
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

test("regFill completes launch data that RugCheck gave late, without touching the level", () => {
  const e = { m: "A", t: NOW, l: "MEDIUM", f: ["MKT_NEW:w"], py: "PAY" };
  assert.equal(regFill(e, { plat: "pump_fun", creator: "CR", funder: "FU", rug: false }), true);
  assert.deepEqual(e, { m: "A", t: NOW, l: "MEDIUM", f: ["MKT_NEW:w"], py: "PAY", p: "pump_fun", cr: "CR", fu: "FU", nrc: 1, rcl: 1 });
  assert.equal(regFill(e, { plat: "other", creator: "X" }), false);          // never overwrites what is known
  assert.equal(e.cr, "CR");
  assert.equal(regFill(e, { rug: true }), true); assert.equal(e.rug, true);
  assert.equal(regFill(undefined, { creator: "X" }), false);
});

test("regMissing picks a day's entries without launchpad nor creator and marks them nrc", () => {
  const d = Date.parse("2026-10-31T05:00:00Z");
  const reg = { a: { m: "a", t: d }, b: { m: "b", t: d, p: "pump_fun", cr: "C" }, c: { m: "c", t: d + DAY }, r: { m: "r", t: d, rcl: 1 } };
  assert.deepEqual(regMissing(reg, "2026-10-31"), ["a"]);
  assert.equal(reg.a.nrc, 1); assert.equal(reg.b.nrc, undefined); assert.equal(reg.c.nrc, undefined);
});

test("day summary per signal and the tokens still alive (the misses)", () => {
  const tokens = {
    a: { m: "a", s: "A", l: "HIGH", f: ["MKT_NEW:w", "CTL_SERIAL_CREATOR:b"], h24: { dead: true }, d7: { dead: true } },
    b: { m: "b", s: "B", l: "HIGH", f: ["MKT_NEW:w"], h24: { dead: false, mc: 9000 }, d7: { dead: false, mc: 50000 } },
    c: { m: "c", s: "C", l: "MEDIUM", f: ["MKT_NEW:b"], h24: { dead: false, mc: 7000 } },
    d: { m: "d", l: "LOW" }
  };
  const sum = daySummary(tokens);
  assert.deepEqual(sum.sig, {
    CTL_SERIAL_CREATOR: { n: 1, h24: 1, dead24: 1, d7: 1, dead7: 1 },
    MKT_NEW: { n: 3, h24: 3, dead24: 1, d7: 2, dead7: 1 }
  });
  assert.deepEqual(sum.alive, [
    { m: "b", s: "B", l: "HIGH", at: "d7", mc: 50000 },
    { m: "c", s: "C", l: "MEDIUM", at: "h24", mc: 7000 }
  ]);
});

test("dry also when liquidity is tiny next to the market cap (under 0.2 %)", () => {
  assert.equal(regResolve({}, "h24", [{ dexId: "pumpswap", marketCap: 118751314, liquidity: { usd: 60919 } }]).h24.dry, true);
  const xto = regResolve({}, "h24", [{ dexId: "pumpswap", marketCap: 65273909, liquidity: { usd: 663429 } }]).h24;   // 1 %: alive
  assert.equal(xto.dead, false);
  assert.equal(regResolve({}, "h24", [{ dexId: "pump-fun", marketCap: 50000, liquidity: { usd: 0 } }]).h24.dead, false);   // on the curve
});

test("summary: launches picked by the entry filter stay out of the percentages, the random sample counts", () => {
  const tokens = {
    a: { m: "a", l: "HIGH", h24: { dead: true } },
    b: { m: "b", l: "HIGH", sel: "azar", h24: { dead: false } },
    c: { m: "c", l: "HIGH", sel: "prio", h24: { dead: false }, f: ["MKT_NEW:w"] },
    d: { m: "d", l: "MEDIUM", sel: "grupo", h24: { dead: true } }
  };
  const sum = daySummary(tokens);
  assert.equal(sum.n, 4);
  assert.deepEqual(sum.levels, { HIGH: { n: 2, h24: 2, dead24: 1, d7: 0, dead7: 0 } });
  assert.deepEqual(sum.sig, {});
  assert.deepEqual(sum.filtro, { prio: 1, grupo: 1 });
  // the ones still alive are listed whatever the reason they were analysed
  assert.equal(sum.alive.length, 2);
  assert.equal(daySummary({ a: tokens.a }).filtro, undefined);
});
