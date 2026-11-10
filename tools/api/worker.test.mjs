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
  return { raw: db, prepare: (sql) => ({ bind: (...args) => ({ all: async () => ({ results: db.prepare(sql).all(...args) }), run: async () => db.prepare(sql).run(...args) }) }) };
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
  assert.equal((await get("/api/visto/" + A)).status, 404);           // visto is only POST
  assert.equal((await get("/api/wallet/" + A, "OPTIONS")).status, 204);
});

test("a database failure answers 503 instead of crashing", async () => {
  const bad = { DB: { prepare: () => ({ bind: () => ({ all: async () => { throw new Error("down"); } }) }) } };
  const r = await handle(new Request("https://x/api/wallet/" + A), bad);
  assert.equal(r.status, 503);
});

test("visto: counts each scan of a token, stores nothing about who", async () => {
  const e = { DB: d1() };
  const post = (m) => handle(new Request("https://api.solflag.com/api/visto/" + m, { method: "POST" }), e);
  assert.equal((await post(M1)).status, 204);
  assert.equal((await post(M1)).status, 204);
  assert.equal((await post("<script>")).status, 400);
  const rows = e.DB.raw.prepare("SELECT * FROM pedidos").all();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].m, M1);
  assert.equal(rows[0].n, 2);
  assert.equal(rows[0].hecho, null);
  assert.deepEqual(Object.keys(rows[0]).sort(), ["hecho", "m", "n", "t0", "t1"]);
});

test("visto creates the table if the collector has not yet", async () => {
  const db = new DatabaseSync(":memory:");
  const e = { DB: { raw: db, prepare: (sql) => ({ bind: (...a) => ({ run: async () => db.prepare(sql).run(...a) }) }) } };
  const r = await handle(new Request("https://x/api/visto/" + M2, { method: "POST" }), e);
  assert.equal(r.status, 204);
  assert.equal(db.prepare("SELECT n FROM pedidos").get().n, 1);
});

test("visto: over the rate limit answers 429 and stores nothing", async () => {
  const e = { DB: d1(), VISTO_LIMIT: { limit: async () => ({ success: false }) } };
  const r = await handle(new Request("https://x/api/visto/" + M1, { method: "POST" }), e);
  assert.equal(r.status, 429);
  assert.equal(e.DB.raw.prepare("SELECT COUNT(*) AS c FROM pedidos").get().c, 0);
});
