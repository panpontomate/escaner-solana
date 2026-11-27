import test from "node:test";
import assert from "node:assert/strict";
import { normalDe } from "./normal.mjs";

const hoy = Date.UTC(2026, 10, 27, 20, 0);
const dia = (d) => Date.UTC(2026, 10, d) / 1000;

test("normal: media de los 7 días anteriores, sin la vela de hoy", () => {
  const l = [[dia(27), 0, 0, 0, 0, 999999], ...[26, 25, 24, 23, 22, 21, 20, 19].map((d, i) => [dia(d), 0, 0, 0, 0, (i + 1) * 100])];
  assert.deepEqual(normalDe(l, hoy), [400, 7]);
});
test("normal: con menos de 3 días anteriores no hay dato", () => {
  assert.equal(normalDe([[dia(27), 0, 0, 0, 0, 5], [dia(26), 0, 0, 0, 0, 5], [dia(25), 0, 0, 0, 0, 5]], hoy), null);
  assert.equal(normalDe(null, hoy), null);
});
