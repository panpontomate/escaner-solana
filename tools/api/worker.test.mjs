// Tests de la API con una base SQLite en memoria que imita a D1 (mismas tablas que tools/caras/plano.mjs)
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { handle, V } from "./worker.js";
import { SCHEMA } from "../caras/plano.mjs";

const A = "PAY1111111111111111111111111111111", B = "FUND111111111111111111111111111111", C = "BUY1111111111111111111111111111111";
const M1 = "Mint111111111111111111111111111111", M2 = "Mint222222222222222222222222222222", M3 = "Mint333333333333333333333333333333";

// D1 en pequeño: prepare(sql).bind(...).all() -> { results }
function d1() {
  const db = new DatabaseSync(":memory:");
  SCHEMA.forEach((s) => db.exec(s));
  const ins = db.prepare("INSERT INTO lanz (m,t,plat,dex,py,cr,fu,liq,lvl,cara,dead24,mc24,up) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)");
  ins.run(M1, 1000, "pump_fun", "pump-fun", A, A, B, 0, "HIGH", null, 1, 0, 1);
  ins.run(M2, 2000, "pump_fun", "pump-fun", A, "CRE2222222222222222222222222222222", B, 0, "MEDIUM", null, 0, 50000, 1);
  ins.run(M3, 3000, "pump_fun", "pump-fun", A, A, null, 0, "HIGH", null, null, null, 1);
  const buy = db.prepare("INSERT INTO compras (m,w,d,sig) VALUES (?,?,?,?)");
  buy.run(M1, C, 0, "s1"); buy.run(M2, C, 1, "s2"); buy.run(M2, A, 0, "s3");
  return { prepare: (sql) => ({ bind: (...args) => ({ all: async () => ({ results: db.prepare(sql).all(...args) }) }) }) };
}
const env = { DB: d1() };
const get = async (path, method) => { const r = await handle(new Request("https://api.solflag.com" + path, { method: method || "GET" }), env); return { status: r.status, body: r.status === 204 ? null : await r.json(), h: r.headers }; };

test("wallet: counts per role, latest launches with its roles, first-block buys", async () => {
  const { status, body, h } = await get("/api/wallet/" + A);
  assert.equal(status, 200);
  assert.equal(h.get("access-control-allow-origin"), "*");
  assert.equal(body.v, V);
  assert.equal(body.known, true);
  assert.deepEqual(body.roles.payer, { n: 3, resolved: 2, dead24: 1 });
  assert.deepEqual(body.roles.creator, { n: 2, resolved: 1, dead24: 1 });
  assert.deepEqual(body.roles.funder, { n: 0, resolved: 0, dead24: 0 });
  assert.deepEqual(body.launches.map((l) => [l.m, l.roles.join("+")]), [[M3, "payer+creator"], [M2, "payer"], [M1, "payer+creator"]]);
  assert.equal(body.launches[0].dead24, null);       // still waiting for its 24 h result
  assert.equal(body.firstBuys.n, 1);
  assert.equal(body.firstBuys.list[0].blocks, 0);
});

test("wallet a buyer only appears in first buys", async () => {
  const { body } = await get("/api/wallet/" + C);
  assert.deepEqual(body.roles.payer, { n: 0, resolved: 0, dead24: 0 });
  assert.deepEqual([body.firstBuys.n, body.firstBuys.resolved, body.firstBuys.dead24], [2, 2, 1]);
});

test("an unknown wallet is a normal answer, not an error", async () => {
  const { status, body } = await get("/api/wallet/Unknown11111111111111111111111111111");
  assert.equal(status, 200);
  assert.equal(body.known, false);
  assert.deepEqual(body.launches, []);
});

test("token: who is behind it with their history (without this launch) and its first buyers", async () => {
  const { status, body } = await get("/api/token/" + M2);
  assert.equal(status, 200);
  assert.deepEqual(body.token, { m: M2, t: 2000, plat: "pump_fun", dex: "pump-fun", lvl: "MEDIUM", dead24: false, mc24: 50000 });
  assert.deepEqual(body.behind.payer, { wallet: A, n: 2, resolved: 1, dead24: 1 });
  assert.deepEqual(body.behind.funder, { wallet: B, n: 1, resolved: 1, dead24: 1 });
  assert.deepEqual(body.firstBuyers, [{ wallet: A, blocks: 0 }, { wallet: C, blocks: 1 }]);
});

test("bad requests: not an address, unknown token, wrong path or method", async () => {
  assert.equal((await get("/api/wallet/<script>")).status, 400);
  assert.equal((await get("/api/token/" + "Nope1111111111111111111111111111111")).status, 404);
  assert.equal((await get("/api/other/" + A)).status, 404);
  assert.equal((await get("/api/wallet/" + A, "POST")).status, 405);
  assert.equal((await get("/api/wallet/" + A, "OPTIONS")).status, 204);
});

test("a database failure answers 503 instead of crashing", async () => {
  const bad = { DB: { prepare: () => ({ bind: () => ({ all: async () => { throw new Error("down"); } }) }) } };
  const r = await handle(new Request("https://x/api/wallet/" + A), bad);
  assert.equal(r.status, 503);
});
