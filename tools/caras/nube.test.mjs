import test from "node:test";
import assert from "node:assert/strict";
import { pick } from "./nube.mjs";

test("pick: se queda con la memoria guardada más tarde", () => {
  assert.equal(pick({ at: 2 }, { at: 1 }), "local");
  assert.equal(pick({ at: 1 }, { at: 2 }), "remote");
  assert.equal(pick({ at: 2 }, { at: 2 }), "local");
});

test("pick: si falta una, usa la otra; sin fecha cuenta como la más vieja", () => {
  assert.equal(pick(null, { at: 1 }), "remote");
  assert.equal(pick({ at: 1 }, null), "local");
  assert.equal(pick({}, { at: 1 }), "remote");
  assert.equal(pick({ at: 1 }, {}), "local");
});
