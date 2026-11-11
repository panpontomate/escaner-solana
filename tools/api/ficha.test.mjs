// Tests de la ficha pública (token.solflag.com) con una base SQLite en memoria que imita a D1 y un DexScreener falso
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { ficha, mercado, usd } from "./ficha.js";
import worker from "./worker.js";
import { SCHEMA } from "../caras/plano.mjs";

const A = "PAY1111111111111111111111111111111", B = "FUND111111111111111111111111111111", C = "BUY1111111111111111111111111111111";
const M1 = "Mint111111111111111111111111111111", M2 = "Mint222222222222222222222222222222", M3 = "Mint333333333333333333333333333333";
const DEX = "Mint444444444444444444444444444444", NADA = "Mint555555555555555555555555555555";
const T = Date.UTC(2026, 10, 7, 1, 35);

function d1() {
  const db = new DatabaseSync(":memory:");
  SCHEMA.forEach((s) => db.exec(s));
  const ins = db.prepare("INSERT INTO lanz (m,t,plat,dex,py,cr,fu,liq,lvl,cara,dead24,mc24,up) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)");
  ins.run(M1, T, "pump_fun", "pump-fun", A, A, B, 2503, "HIGH", "serie", 1, 2605, 1);
  ins.run(M2, T + 1000, "pump_fun", "pump-fun", A, A, B, 0, "MEDIUM", null, 1, 900, 1);
  ins.run(M3, T + 2000, "pump_fun", "pump-fun", A, A, null, 0, "HIGH", null, null, null, 1);
  const buy = db.prepare("INSERT INTO compras (m,w,d,sig) VALUES (?,?,?,?)");
  buy.run(M1, C, 0, "s1"); buy.run(M2, C, 1, "s2");
  db.prepare("INSERT INTO pedidos (m,n,t0,t1,hecho) VALUES (?,?,?,?,?)").run(M1, 3, T, T, T);
  return { prepare: (sql) => ({ bind: (...args) => ({ all: async () => ({ results: db.prepare(sql).all(...args) }) }) }) };
}
const env = { DB: d1() };
const pair = (m, o) => Object.assign({ baseToken: { address: m, name: "Slignal Coin", symbol: "SLIGNAL" }, dexId: "raydium", liquidity: { usd: 1000 }, marketCap: 5000, pairCreatedAt: T, info: { imageUrl: "https://img.example/x.png" } }, o || {});
const fakeFetch = (pairs) => async (url) => {
  if (url.includes("dexscreener")) { const m = url.split("/").pop(); return pairs[m] || []; }
  if (url.includes("/datos/registro/")) return { tokens: { [M1]: { m: M1, s: "SLIGNAL", d7: { dead: true, mc: 100 } } } };
  return null;
};
const get = async (path, pairs) => { const r = await ficha(new Request("https://token.solflag.com" + path), env, fakeFetch(pairs || {})); return { status: r.status, body: await r.text(), h: r.headers }; };

test("ficha completa: quién está detrás (pagó y creó juntos), compradores, otros tokens y el registro a 7 días", async () => {
  const { status, body, h } = await get("/" + M1, { [M1]: [pair(M1)] });
  assert.equal(status, 200);
  assert.match(h.get("content-type"), /text\/html/);
  assert.match(body, /<title>Slignal Coin \(\$SLIGNAL\) · Ficha del token · SolFlag<\/title>/);
  assert.match(body, /<link rel="canonical" href="https:\/\/token\.solflag\.com\/Mint1111/);
  assert.match(body, /property="og:image" content="https:\/\/img\.example\/x\.png"/);
  assert.match(body, /RIESGO ALTO/);
  assert.match(body, /<b>Pagó y creó<\/b>/);                         // la misma wallet, una sola vez
  assert.match(body, /Su creador ha lanzado 2 tokens más: de los 1 que ya cumplieron 24 h murieron 1\./);
  assert.match(body, /Cara conocida/);
  assert.match(body, /seguía vivo|murió/);
  assert.match(body, /A los 7 días/);                                 // del registro publicado
  assert.match(body, /Consultas en SolFlag<\/td><td class="val ">3/);
  assert.match(body, /href="https:\/\/token\.solflag\.com\/Mint222222222222222222222222222222"/); // otro token del creador
  assert.match(body, /href="https:\/\/solflag\.com\/\?wallet=BUY1111111111111111111111111111111"/);
  assert.doesNotMatch(body, /Ficha parcial/);
});

test("un nombre de token con HTML no se ejecuta: se escapa", async () => {
  const evil = pair(M1, { baseToken: { address: M1, name: "<script>alert(1)</script>", symbol: "\"><img src=x onerror=alert(1)>" }, info: { imageUrl: "javascript:alert(1)" } });
  const { body } = await get("/" + M1, { [M1]: [evil] });
  assert.doesNotMatch(body, /<script>alert/);
  assert.doesNotMatch(body, /<img src=x/);
  assert.doesNotMatch(body, /javascript:alert/);
  assert.match(body, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test("token que no está en la base pero tiene mercado: ficha con aviso y sin registro", async () => {
  const { status, body } = await get("/" + DEX, { [DEX]: [pair(DEX, { baseToken: { address: DEX, name: "Grande", symbol: "BIG" }, marketCap: 51e6, liquidity: { usd: 2.29e6 } })] });
  assert.equal(status, 200);
  assert.match(body, /Aún no está en nuestra base/);
  assert.match(body, /Fuera del registro de aciertos/);
  assert.match(body, /51 M\$/);
});

test("ficha parcial: en la base pero sin pagador ni compradores", async () => {
  const { body } = await get("/" + M3, {});
  assert.match(body, /RIESGO ALTO/);
  assert.match(body, /Aún no han pasado 24 h|No disponible/);
  assert.match(body, /sin mercado/);
});

test("no encontrado y dirección no válida: 404 sin indexar", async () => {
  const a = await get("/" + NADA, {}), b = await get("/no-es-una-direccion", {});
  assert.equal(a.status, 404); assert.equal(b.status, 404);
  assert.match(a.body, /noindex/);
  assert.match(a.body, /\?token=Mint5555/);
});

test("sitemap, robots y la raíz", async () => {
  const s = await get("/sitemap.xml");
  assert.equal(s.status, 200);
  assert.equal((s.body.match(/<loc>/g) || []).length, 3);
  assert.match(s.body, /<loc>https:\/\/token\.solflag\.com\/Mint3333/);
  const r = await get("/robots.txt");
  assert.match(r.body, /Sitemap: https:\/\/token\.solflag\.com\/sitemap\.xml/);
  const root = await ficha(new Request("https://token.solflag.com/"), env, fakeFetch({}));
  assert.equal(root.status, 302);
});

test("el Worker manda token.solflag.com a la ficha y api.solflag.com a la API", async () => {
  const ctx = { waitUntil() {} };
  const api = await worker.fetch(new Request("https://api.solflag.com/api/token/" + M1), env, ctx);
  assert.match(api.headers.get("content-type"), /json/);
  const t = await worker.fetch(new Request("https://token.solflag.com/robots.txt"), env, ctx);
  assert.match(await t.text(), /Sitemap/);
});

test("mercado: el par principal es el de más liquidez y solo cuentan los pares donde el token es la base", () => {
  const mk = mercado([pair(M1, { dexId: "orca", liquidity: { usd: 10 } }), pair(M1, { dexId: "raydium", liquidity: { usd: 500 } }),
    { baseToken: { address: "OTRO" }, quoteToken: { address: M1 }, liquidity: { usd: 9e9 } }], M1);
  assert.equal(mk.dex, "raydium");
  assert.equal(mk.liq, 510);
  assert.deepEqual(mk.dexes.map((x) => x.dex), ["raydium", "orca"]);
  assert.equal(mercado([], M1), null);
  assert.equal(usd(2503), "2.503 $");
  assert.equal(usd(5.64e6), "5,64 M$");
});

test("ficha en inglés: /en/<mint> con textos y números en inglés y enlaces a la web en inglés", async () => {
  const { status, body } = await get("/en/" + M1, { [M1]: [pair(M1)] });
  assert.equal(status, 200);
  assert.match(body, /<html lang="en">/);
  assert.match(body, /<title>Slignal Coin \(\$SLIGNAL\) · Token file · SolFlag<\/title>/);
  assert.match(body, /HIGH RISK/);
  assert.match(body, /<b>Paid and created<\/b>/);
  assert.match(body, /Its creator has launched 2 more tokens: of the 1 that already turned 24 h, 1 died\./);
  assert.match(body, /\$2,503/);
  assert.match(body, /href="https:\/\/solflag\.com\/en\/\?wallet=BUY1111/);
  assert.match(body, /href="https:\/\/token\.solflag\.com\/en\/Mint2222/);            // otro token del creador, en inglés
  assert.match(body, /<link rel="canonical" href="https:\/\/token\.solflag\.com\/en\/Mint1111/);
  assert.match(body, /hreflang="es" href="https:\/\/token\.solflag\.com\/Mint1111/);
  assert.match(body, /class="plang" href="https:\/\/token\.solflag\.com\/Mint1111[^"]*"[^>]*>ES</);
  assert.doesNotMatch(body, /Pagó|Quién está detrás|Capitalización/);
});

test("la ficha en español enlaza a su versión en inglés; el sitemap lleva las dos", async () => {
  const { body } = await get("/" + M1, { [M1]: [pair(M1)] });
  assert.match(body, /hreflang="en" href="https:\/\/token\.solflag\.com\/en\/Mint1111/);
  assert.match(body, />EN<\/a>/);
  const s = await get("/sitemap.xml");
  assert.match(s.body, /xmlns:xhtml=/);
  assert.match(s.body, /<xhtml:link rel="alternate" hreflang="en" href="https:\/\/token\.solflag\.com\/en\/Mint3333/);
  const nf = await get("/en/" + NADA, {});
  assert.equal(nf.status, 404);
  assert.match(nf.body, /We couldn't find this token/);
  const root = await ficha(new Request("https://token.solflag.com/en"), env, fakeFetch({}));
  assert.equal(root.headers.get("location"), "https://solflag.com/en/");
});

test("topes de lectura: un comprador con muchos lanzamientos sale como «200+» y no se leen más filas", async () => {
  const { TOPE_COMPRAS } = await import("./ficha.js");
  const db = new DatabaseSync(":memory:");
  SCHEMA.forEach((s) => db.exec(s));
  db.prepare("INSERT INTO lanz (m,t,plat,dex,py,cr,fu,liq,lvl,cara,dead24,mc24,up) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").run(M1, T, "pump_fun", "pump-fun", A, A, null, 0, "HIGH", null, 1, 0, 1);
  const buy = db.prepare("INSERT INTO compras (m,w,d,sig) VALUES (?,?,?,?)");
  buy.run(M1, C, 0, "s");
  for (let i = 0; i < TOPE_COMPRAS + 50; i++) buy.run("Otro" + String(i).padStart(30, "0"), C, 0, "s" + i);
  const e = { DB: { prepare: (sql) => ({ bind: (...a) => ({ all: async () => ({ results: db.prepare(sql).all(...a) }) }) }) } };
  const r = await ficha(new Request("https://token.solflag.com/" + M1), e, fakeFetch({}));
  const body = await r.text();
  assert.ok(body.includes(">" + TOPE_COMPRAS + "+</td>"), "sale «200+»");
  assert.match(r.headers.get("cache-control"), /max-age=21600/);
});
