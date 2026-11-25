// Tests de la API con una base SQLite en memoria que imita a D1 (mismas tablas que tools/caras/plano.mjs)
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { handle, V, portada, DAY, logo, LOGO_CDN, ventas, cambio, top, caida, salidas, rpcValido } from "./worker.js";
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

test("lanzaderas: suma por plataforma, sin plataforma va a unknown, y el total", async () => {
  const { lanzaderas } = await import("./worker.js");
  const db = { prepare: () => ({ bind: () => ({ all: async () => ({ results: [
    { plat: "pump_fun", n: 10, con: 8, muertos: 7, desde: 2000 }, { plat: null, n: 2, con: 2, muertos: 2, desde: 1000 }, { plat: "unknown", n: 1, con: 1, muertos: 0, desde: 3000 }] }) }),
    all: async () => ({ results: [] }) }) };
  const r = await lanzaderas(db);
  assert.deepEqual(r.plats.pump_fun, { n: 10, con: 8, muertos: 7 });
  assert.deepEqual(r.plats.unknown, { n: 3, con: 3, muertos: 2 });
  assert.deepEqual(r.total, { n: 13, con: 11, muertos: 9 });
  assert.equal(r.desde, 1000);
});

test("acciones: lista diaria, precios de Jupiter (token y acción) y pools solo contra USDC/USDT/SOL", async () => {
  const { acciones, LISTA_URL } = await import("./acciones.js");
  const M = "Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re";
  const calls = [];
  const fakeFetch = async (url) => {
    calls.push(url);
    if (url === LISTA_URL) return new Response(JSON.stringify({ filas: [{ mint: M, tok: "GLDx", accion: "GLD", nombre: "Gold", emisor: "xStocks", cat: "mat" }] }));
    if (url.includes("jup.ag")) return new Response(JSON.stringify({ [M]: { usdPrice: 101, stockData: { price: 100 } } }));
    if (url.includes("dexscreener")) return new Response(JSON.stringify([
      { baseToken: { address: M }, quoteToken: { symbol: "ORE" }, priceUsd: "50", liquidity: { usd: 900000 }, volume: { h24: 1 } },
      { baseToken: { address: M }, quoteToken: { symbol: "USDC" }, priceUsd: "101", liquidity: { usd: 113000 }, volume: { h24: 7 } }]));
    return new Response("{}");
  };
  const r = await acciones({}, { fetch: fakeFetch, cache: null, ahora: Date.UTC(2026, 10, 21, 15, 0) });   // sábado
  assert.equal(r.v, 2);
  assert.equal(r.filas[0].prima, 1);          // 101 frente a 100
  assert.equal(r.filas[0].liq, 113000);       // el pool contra ORE no cuenta
  assert.equal(r.filas[0].cat, "mat");
  assert.equal(r.bolsa, "cerrada");
  assert.ok(!calls.some((u) => u.includes("twelvedata")));
  // sin lista diaria: la de respaldo
  const sin = await acciones({}, { fetch: async (u) => u === LISTA_URL ? new Response("no", { status: 404 }) : fakeFetch(u), cache: null });
  assert.ok(sin.filas.length >= 10);
});

test("acciones: clasificar token (emisor corto, ticker de la acción, categoría) y bolsa abierta en hora de Nueva York", async () => {
  const { clasificar, bolsaAbierta, hacerLista } = await import("./acciones.js");
  assert.deepEqual(clasificar("xStocks (Backed)", "TSLAx", "Tesla xStock"), { tok: "TSLAx", accion: "TSLA", nombre: "Tesla", emisor: "xStocks", cat: "acc" });
  assert.equal(clasificar("Backpack Securities", "USO", "United States Oil Fund, LP - Backpack Securities").cat, "mat");
  assert.equal(clasificar("Backpack Securities", "SPY", "SPDR - Backpack").cat, "fon");
  assert.equal(clasificar("Ondo", "AAPLon", "Apple (Ondo Tokenized)").accion, "AAPL");
  assert.equal(bolsaAbierta(Date.UTC(2026, 10, 20, 15, 0)), true);    // viernes 10:00 en Nueva York
  assert.equal(bolsaAbierta(Date.UTC(2026, 10, 20, 22, 0)), false);   // viernes 17:00
  assert.equal(bolsaAbierta(Date.UTC(2026, 10, 21, 15, 0)), false);   // sábado
  // la lista: solo emisores de acciones, con 10 k$ o más contra USDC/SOL, de más a menos liquidez
  const em = [{ name: "xStocks (Backed)", mints: { A: 1, B: 1 } }, { name: "Backpack Securities", mints: { C: 1 } }, { name: "Circle", mints: { D: 1 } }];
  const dex = async () => new Response(JSON.stringify([
    { baseToken: { address: "A", symbol: "TSLAx", name: "Tesla xStock" }, quoteToken: { symbol: "USDC" }, liquidity: { usd: 20000 } },
    { baseToken: { address: "B", symbol: "MUx", name: "Micron xStock" }, quoteToken: { symbol: "USDC" }, liquidity: { usd: 500 } },
    { baseToken: { address: "C", symbol: "MU", name: "Micron - Backpack Securities" }, quoteToken: { symbol: "SOL" }, liquidity: { usd: 90000 } }]));
  const l = await hacerLista(em, dex, async () => {});
  assert.deepEqual(l.map((x) => x.tok), ["MU", "TSLAx"]);
  assert.equal(l[0].emisor, "Backpack");
});

test("acciones: el multiplicador de split se aplica desde su fecha", async () => {
  const { multiplicador } = await import("./acciones.js");
  const e = { multiplier: "1", newMultiplier: "10", newMultiplierEffectiveTimestamp: 1000 };
  assert.equal(multiplicador(e, 999 * 1000), 1);
  assert.equal(multiplicador(e, 1000 * 1000), 10);
  assert.equal(multiplicador(null, 0), 1);
});

test("logo: Helius getAsset gives the image through the CDN at 192 px; IPFS goes by the Pump.fun gateway; no logo is null; no RPC answer is undefined", async () => {
  const env = { SOLANA_RPC: "https://rpc.example" };
  const answer = (j) => async () => ({ json: async () => j });
  assert.equal(await logo(env, M1, answer({ result: { content: { files: [{ uri: "https://ipfs.io/ipfs/bafyX", mime: "image/png" }], links: { image: "https://ipfs.io/ipfs/bafyX" } } } })), LOGO_CDN + "https://pump.mypinata.cloud/ipfs/bafyX");
  assert.equal(await logo(env, M1, answer({ result: { content: { files: [], links: { image: "https://static.jup.ag/jup/icon.png" } } } })), LOGO_CDN + "https://static.jup.ag/jup/icon.png");
  assert.equal(await logo(env, M1, answer({ result: { content: { files: [{ uri: "ipfs://bafyY/logo.png", mime: "image/png" }], links: {} } } })), LOGO_CDN + "https://pump.mypinata.cloud/ipfs/bafyY/logo.png");
  assert.equal(await logo(env, M1, answer({ result: { content: { files: [], links: { image: "http://insecure.example/a.png" } } } })), null);
  assert.equal(await logo(env, M1, answer({ result: { content: { files: [], links: {} } } })), null);
  assert.equal(await logo(env, M1, answer({ error: { message: "not found" } })), null);
  assert.equal(await logo(env, M1, async () => { throw new Error("down"); }), undefined);
  assert.equal(await logo({}, M1, answer({})), undefined);
});

test("ventas: token change of each wallet per transaction, SOL change and whether the whole history came back", async () => {
  const W = "WAL1111111111111111111111111111111", tx = (pre, post, solPre, solPost, err) => ({ blockTime: 1800000000, transaction: { signatures: ["sig"], message: { accountKeys: [{ pubkey: W }] } },
    meta: { err: err || null, preBalances: [solPre], postBalances: [solPost],
      preTokenBalances: pre === null ? [] : [{ mint: M1, owner: W, uiTokenAmount: { uiAmount: pre } }], postTokenBalances: [{ mint: M1, owner: W, uiTokenAmount: { uiAmount: post } }] } });
  assert.deepEqual(cambio(tx(null, 1000, 5e9, 4e9), M1, W), { t: 1800000000, d: 1000, sol: -1, sig: "sig" });       // compra
  assert.deepEqual(cambio(tx(1000, 400, 4e9, 4.5e9), M1, W), { t: 1800000000, d: -600, sol: 0.5, sig: "sig" });      // vende 600
  assert.equal(cambio(tx(1000, 1000, 4e9, 4e9), M1, W), null);                                                        // no toca el token
  assert.equal(cambio(tx(1000, 0, 4e9, 5e9, { x: 1 }), M1, W), null);                                                 // fallida
  const env = { SOLANA_RPC: "https://rpc.example" };
  const v = await ventas(env, M1, [W, A], 1700000000, async (u, init) => { const q = JSON.parse(init.body).params;
    return { json: async () => q[0] === M1 ? { result: { data: [{ blockTime: 1690000000 }] } } : q[0] === W ? { result: { data: [tx(null, 1000, 5e9, 4e9), tx(1000, 0, 4e9, 6e9)] } } : { error: { message: "x" } } }; });
  assert.equal(v.wallets[W].ev.length, 2); assert.equal(v.wallets[W].full, true); assert.equal(v.wallets[A], null);
  assert.equal(v.desde, 1690000000);   // el nacimiento del token, si es anterior a lo que dice la web
  assert.equal((await handle(new Request("https://api.solflag.com/api/ventas/" + M1 + "?w=" + W), env)).status, 400);   // falta desde
});

test("top: mayores cuentas con Helius; sin respuesta o sin lista, undefined (la web vuelve al RPC público)", async () => {
  const env = { SOLANA_RPC: "https://helius.example" };
  const ok = async () => ({ ok: true, json: async () => ({ result: { context: { slot: 1 }, value: [{ address: "A", uiAmount: 5 }] } }) });
  assert.deepEqual(await top(env, "Mint1", ok), { context: { slot: 1 }, value: [{ address: "A", uiAmount: 5 }] });
  assert.equal(await top(env, "Mint1", async () => ({ ok: true, json: async () => ({ error: { message: "x" } }) })), undefined);
  assert.equal(await top(env, "Mint1", async () => { throw new Error("red"); }), undefined);
  assert.equal(await top({}, "Mint1", ok), undefined);
});

test("caida: las wallets que más tokens soltaron en la ventana, sin el pool; ventana de más de 30 min, 400", async () => {
  const P = "Pool111111111111111111111111111111111111111", M = "Mint111111111111111111111111111111111111111";
  const bal = (owner, ui) => ({ mint: M, owner: owner, uiTokenAmount: { uiAmount: ui } });
  const tx = (owner, antes, despues, t) => ({ blockTime: t, transaction: { signatures: ["sig" + t] },
    meta: { preTokenBalances: [bal(owner, antes), bal(P, 1000)], postTokenBalances: [bal(owner, despues), bal(P, 1000 + antes - despues)] } });
  assert.deepEqual(salidas(tx("V1", 50, 0, 1), M), { V1: -50, [P]: 50 });
  const env = { SOLANA_RPC: "https://helius.example" };
  let llamadas = 0;
  const c = await caida(env, P, M, 1700000000, 1700000600, async () => { llamadas++;
    return { json: async () => ({ result: { data: [tx("V1", 7000, 0, 1700000010), tx("V2", 300, 100, 1700000020), tx("V1", 600, 0, 1700000030), tx("C1", 0, 400, 1700000040)] } }) }; });
  assert.equal(llamadas, 1); assert.equal(c.completo, true); assert.equal(c.ops, 4);
  assert.deepEqual(c.vendedores.map((v) => [v.w, v.tok, v.n]), [["V1", 7600, 2], ["V2", 200, 1]]);   // el comprador C1 y el pool no salen
  assert.equal(await caida(env, P, M, 1700000000, 1700000600, async () => ({ json: async () => ({ error: { message: "x" } }) })), null);
  const r = await handle(new Request("https://api.solflag.com/api/caida/" + P + "?m=" + M + "&desde=1700000000&hasta=1700009999"), env);
  assert.equal(r.status, 400);
});

test("/api/rpc: solo métodos de lectura, sin lotes y con tope de cuentas", async () => {
  const A = "So11111111111111111111111111111111111111112";
  assert.equal(rpcValido({ method: "getAccountInfo", params: [A, { encoding: "base64" }] }), true);
  assert.equal(rpcValido({ method: "getMultipleAccounts", params: [[A, A], { encoding: "jsonParsed" }] }), true);
  assert.equal(rpcValido({ method: "getMultipleAccounts", params: [Array(101).fill(A)] }), false);
  assert.equal(rpcValido({ method: "getProgramAccounts", params: [A] }), false);
  assert.equal(rpcValido({ method: "sendTransaction", params: ["abc"] }), false);
  assert.equal(rpcValido([{ method: "getAccountInfo", params: [A] }]), false);
  const r = await handle(new Request("https://api.solflag.com/api/rpc", { method: "POST", body: JSON.stringify({ method: "getProgramAccounts", params: [A] }) }), { SOLANA_RPC: "https://x" });
  assert.equal(r.status, 400);
});
