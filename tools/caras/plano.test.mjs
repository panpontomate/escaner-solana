import test from "node:test";
import assert from "node:assert/strict";
import { emptyQueue, queueLaunch, queueBuyers, queueSize, trimQueue, buyerCandidates, upsertStatements, d1Config, SCHEMA, LANZ, COMPRAS, BUYERS_MAX, QUEUE_MAX } from "./plano.mjs";

let sqlite = null;
try { sqlite = await import("node:sqlite"); } catch (e) { /* Node sin SQLite: se salta la prueba con base de datos */ }

test("queueLaunch: la fila de la resolución completa la del lanzamiento sin borrar lo que ya había", () => {
  const q = emptyQueue();
  queueLaunch(q, { m: "M", t: 1, py: "P", cr: "C", lvl: "HIGH" });
  queueLaunch(q, { m: "M", t: 1, py: "P", cr: "C", fu: undefined, dead24: true, mc24: 900 });
  assert.deepEqual(q.l.M, { m: "M", t: 1, py: "P", cr: "C", lvl: "HIGH", dead24: true, mc24: 900 });
  queueBuyers(q, "M", [{ w: "W", d: 0, sig: "S" }]);
  assert.equal(queueSize(q), 2);
});

test("trimQueue: si D1 lleva mucho caído se quedan las filas más nuevas", () => {
  const q = emptyQueue();
  for (let i = 0; i < QUEUE_MAX + 5; i++) q.l["M" + i] = { m: "M" + i, t: i };
  trimQueue(q);
  assert.equal(Object.keys(q.l).length, QUEUE_MAX);
  assert.ok(!q.l.M0 && q.l["M" + (QUEUE_MAX + 4)]);
});

test("buyerCandidates: firmas sin error en los 2 bloques siguientes a la creación, sin la creación, como mucho 5", () => {
  // la página llega de más nueva a más antigua; la última es la creación (bloque 100)
  const page = [
    { signature: "late", slot: 103 }, { signature: "b6", slot: 102 }, { signature: "b5", slot: 102 }, { signature: "b4", slot: 101 },
    { signature: "fail", slot: 101, err: { x: 1 } }, { signature: "b3", slot: 101 }, { signature: "b2", slot: 100 }, { signature: "b1", slot: 100 },
    { signature: "creation", slot: 100 }
  ];
  const c = buyerCandidates(page);
  assert.equal(c.length, BUYERS_MAX);
  assert.ok(!c.some((x) => ["creation", "late", "fail"].includes(x.sig)));
  assert.deepEqual(c.map((x) => x.d), [0, 0, 1, 1, 2]);
  assert.deepEqual(buyerCandidates([]), []);
  assert.deepEqual(buyerCandidates(null), []);
});

test("upsertStatements: trocea para no pasar de 100 valores por consulta", () => {
  const rows = Array.from({ length: 20 }, (_, i) => ({ m: "M" + i, t: i, dead24: i % 2 === 0 }));
  const st = upsertStatements("lanz", LANZ, rows, 5);
  assert.ok(st.every((s) => s.params.length <= 100));
  assert.equal(st.reduce((n, s) => n + s.params.length, 0), 20 * (LANZ.length + 1));
  assert.equal(st[0].params[LANZ.indexOf("dead24")], 1);          // los booleanos van como 1/0
  assert.match(st[0].sql, /ON CONFLICT\(m\) DO UPDATE SET t=COALESCE\(excluded\.t,t\)/);
});

test("d1Config: sin los tres secretos no hace nada", () => {
  assert.equal(d1Config({ CF_API_TOKEN: "x", CF_ACCOUNT_ID: "a" }), null);
  assert.equal(d1Config({ CF_API_TOKEN: "x", CF_ACCOUNT_ID: "a", CF_D1_ID: "d" }).url, "https://api.cloudflare.com/client/v4/accounts/a/d1/database/d/query");
});

test("el SQL funciona en SQLite (lo mismo que usa D1)", { skip: !sqlite && "Node sin node:sqlite" }, () => {
  const db = new sqlite.DatabaseSync(":memory:");
  SCHEMA.forEach((s) => db.exec(s));
  SCHEMA.forEach((s) => db.exec(s));                                // se puede repetir en cada ejecución
  const run = (sts) => sts.forEach((s) => db.prepare(s.sql).run(...s.params));
  run(upsertStatements("lanz", LANZ, [{ m: "M", t: 1, py: "P", cr: "C", lvl: "HIGH" }, { m: "N", t: 2 }], 10));
  run(upsertStatements("lanz", LANZ, [{ m: "M", t: 1, py: "P", dead24: true, mc24: 900 }], 20));
  const r = db.prepare("SELECT * FROM lanz WHERE m = 'M'").get();
  assert.equal(r.cr, "C"); assert.equal(r.lvl, "HIGH"); assert.equal(r.dead24, 1); assert.equal(r.mc24, 900); assert.equal(r.up, 20);
  const buyers = [{ m: "M", w: "W1", d: 0, sig: "S1" }, { m: "M", w: "W2", d: 1, sig: "S2" }];
  run(upsertStatements("compras", COMPRAS, buyers, 10));
  run(upsertStatements("compras", COMPRAS, buyers, 10));            // repetidas: se ignoran
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM compras").get().n, 2);
  // muchas filas a la vez
  run(upsertStatements("lanz", LANZ, Array.from({ length: 50 }, (_, i) => ({ m: "X" + i, t: i, py: "P" })), 30));
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM lanz WHERE py = 'P'").get().n, 51);
});
