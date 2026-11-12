// Tests de la API con una base SQLite en memoria que imita a D1 (mismas tablas que tools/caras/plano.mjs)
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { handle, V, portada, DAY } from "./worker.js";
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

test("visto: a token already processed but not in lanz goes back to the queue; one in lanz stays done", async () => {
  const e = { DB: d1() };
  const post = (m) => handle(new Request("https://api.solflag.com/api/visto/" + m, { method: "POST" }), e);
  const OUT = "Mint999999999999999999999999999999";
  await post(OUT); await post(M1);
  e.DB.raw.prepare("UPDATE pedidos SET hecho = 5").run();
  await post(OUT); await post(M1);
  const h = (m) => e.DB.raw.prepare("SELECT hecho, n FROM pedidos WHERE m = ?").get(m);
  assert.equal(h(OUT).hecho, null);       // back in the queue
  assert.equal(h(OUT).n, 2);
  assert.equal(h(M1).hecho, 5);           // already in lanz: nothing to redo
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

test("portada: last 24 h by DEX, serial creators, multi-creator funders and first-block buyers", async () => {
  const p = await portada(env.DB, 3000 + DAY - 1);   // ventana (2999, …]: M1 y M2 se quedan fuera, solo M3
  assert.equal(p.launches.n, 1);
  const q = await portada(env.DB, 1500);             // las tres caben (t > 1500 - DAY)
  assert.equal(q.v, V);
  assert.deepEqual(q.launches, { n: 3, analyzed: 3, high: 2 });
  assert.deepEqual(q.dex, [{ dex: "pump-fun", n: 3, hi: 2, me: 1, lo: 0 }]);
  assert.equal(q.creators.length, 1);
  assert.equal(q.creators[0].w, A);
  assert.equal(q.creators[0].n, 2);
  assert.deepEqual(q.creators[0].all, { n: 2, resolved: 1, dead24: 1 });
  assert.equal(q.creators[0].spark.reduce((a, b) => a + b, 0), 2);
  assert.deepEqual(q.funders.map((f) => [f.w, f.creators, f.n]), [[B, 2, 2]]);
  assert.deepEqual(q.buyers.map((b) => [b.w, b.n, b.d0, b.all]), [[C, 2, 1, 2]]);
  const r = await get("/api/portada");
  assert.equal(r.status, 200);
  assert.equal(r.body.v, V);
});

test("errors are never cached", async () => {
  const r = await get("/api/other/" + A);
  assert.equal(r.status, 404);
  assert.equal(r.h.get("cache-control"), "no-store");
  assert.match((await get("/api/portada")).h.get("cache-control"), /max-age=300/);
});

test("acciones: prima frente a la acción real, con caché y como mucho LOTE acciones por petición", async () => {
  const { acciones, ACCIONES, LOTE } = await import("./acciones.js");
  const calls = [];
  const fakeFetch = async (url) => {
    calls.push(url);
    if (url.includes("twelvedata")) {
      const syms = new URL(url).searchParams.get("symbol").split(",");
      const body = {}; syms.forEach((s) => { body[s] = { close: "100", is_market_open: false, timestamp: 1 }; });
      return new Response(JSON.stringify(syms.length === 1 ? body[syms[0]] : body));
    }
    return new Response(JSON.stringify([{ baseToken: { address: ACCIONES[0][3] }, priceUsd: "101", liquidity: { usd: 5000 }, volume: { h24: 10 } }]));
  };
  const store = new Map();
  const cache = { match: async (k) => store.has(k) ? new Response(store.get(k)) : undefined, put: async (k, r) => { store.set(k, await r.text()); } };
  const r = await acciones({ TWELVE_DATA_KEY: "k" }, { fetch: fakeFetch, cache });
  const td = calls.filter((u) => u.includes("twelvedata"));
  assert.equal(td.length, 1);
  assert.equal(new URL(td[0]).searchParams.get("symbol").split(",").length, LOTE);
  assert.equal(r.filas[0].prima, 1);          // 101 frente a 100
  assert.equal(r.bolsa, "cerrada");
  // la segunda petición usa lo guardado y pide solo las que faltan
  calls.length = 0;
  await acciones({ TWELVE_DATA_KEY: "k" }, { fetch: fakeFetch, cache });
  const td2 = calls.filter((u) => u.includes("twelvedata"));
  assert.ok(!new URL(td2[0]).searchParams.get("symbol").split(",").includes("TSLA"));
  // sin clave: filas sin precio real, sin romperse
  const sin = await acciones({}, { fetch: fakeFetch, cache: null });
  assert.equal(sin.filas[0].real, null);
});

test("acciones: el multiplicador de split se aplica desde su fecha", async () => {
  const { multiplicador } = await import("./acciones.js");
  const e = { multiplier: "1", newMultiplier: "10", newMultiplierEffectiveTimestamp: 1000 };
  assert.equal(multiplicador(e, 999 * 1000), 1);
  assert.equal(multiplicador(e, 1000 * 1000), 10);
  assert.equal(multiplicador(null, 0), 1);
});
