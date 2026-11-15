import { test } from "node:test";
import assert from "node:assert/strict";
import { cotiza, pools, exchanges, enlacePool, rutaJupiter } from "./cotiza.js";

const M = "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN";
const par = (dexId, label, liq, extra) => Object.assign({ dexId, labels: label ? [label] : undefined, pairAddress: "P" + dexId + label,
  baseToken: { address: M, symbol: "JUP" }, quoteToken: { address: "So1", symbol: "SOL" }, liquidity: { usd: liq }, volume: { h24: 10 } }, extra || {});
const tick = (name, sp, vol, extra) => Object.assign({ market: { name }, base: "JUP", target: "USDT", bid_ask_spread_percentage: sp,
  converted_volume: { usd: vol }, trade_url: "https://" + name + "/JUP" }, extra || {});

test("enlaces directos a cada DEX y, si no se sabe, la ruta de Jupiter", () => {
  assert.equal(enlacePool("meteora", "DLMM", "X", M), "https://app.meteora.ag/dlmm/X");
  assert.equal(enlacePool("orca", "wp", "Y", M), "https://www.orca.so/pools/Y");
  assert.match(enlacePool("raydium", "CLMM", "Z", M), /raydium\.io\/swap\/\?inputMint=sol&outputMint=JUP/);
  assert.equal(enlacePool("meteora", "DYN2", "W", M), rutaJupiter(M));
});

test("pools: solo los de este token y con liquidez, de más a menos", () => {
  const p = pools([par("orca", "wp", 5000), par("meteora", "DLMM", 90000), par("raydium", "", 500), par("orca", "", 9e5, { baseToken: { address: "otro", symbol: "X" } })], M);
  assert.deepEqual(p.map((x) => x.dex), ["Meteora DLMM", "Orca"]);
});

test("exchanges: comisión, coste, grupos y DEX quitados", () => {
  const c = exchanges([
    tick("Binance", 0.07, 1e6), tick("Binance", 0.2, 5e5, { target: "TRY" }),
    tick("Meteora", 0.5, 1e6), tick("Raro", 0.1, 1e5), tick("BitDelta", 6, 2e7),
    tick("BtcTurk | Kripto", 0.1, 1e5), tick("Pequeño", 0.05, 1000), tick("Viejo", 0.05, 1e6, { is_stale: true })
  ]);
  const by = Object.fromEntries(c.map((x) => [x.n, x]));
  assert.ok(!by.Meteora && !by["Pequeño"] && !by.Viejo);
  assert.equal(by.Binance.vol, 1500000);
  assert.equal(by.Binance.sp, 0.07);
  assert.equal(by.Binance.cost, 0.27);                  // 0,07 + 2 × 0,10
  assert.equal(by.Binance.id, "obligatoria");
  assert.equal(by.Raro.g, "sinfee");
  assert.equal(by.BitDelta.g, "dudoso");
  assert.equal(by.BtcTurk.g, "local");
  assert.equal(c[0].n, "Binance");                      // los que tienen coste, primero
});

test("si CoinGecko no contesta, cex es null; si no tiene el token, lista vacía", async () => {
  const f = (cg) => async (u) => u.includes("dexscreener") ? { ok: true, json: async () => [par("orca", "wp", 5000)] } : cg;
  const caido = await cotiza({}, M, { cache: null, fetch: f({ ok: false, status: 429 }) });
  assert.equal(caido.cex, null);
  assert.equal(caido.pools.length, 1);
  const nada = await cotiza({}, M, { cache: null, fetch: f({ ok: false, status: 404 }) });
  assert.deepEqual(nada.cex, []);
});

test("ficha: nombre, símbolo y logo del par con más liquidez", async () => {
  const { ficha } = await import("./cotiza.js");
  const f = ficha([par("orca", "wp", 5000), par("meteora", "DLMM", 9e4, { info: { imageUrl: "https://x/logo.png" }, baseToken: { address: M, symbol: "JUP", name: "Jupiter" } })], M);
  assert.deepEqual(f, { sym: "JUP", name: "Jupiter", img: "https://x/logo.png" });
  assert.equal(ficha([], M), null);
});

test("enlaces de CoinGecko: solo https; nivel del lanzamiento desde D1", async () => {
  const { seguro } = await import("./cotiza.js");
  assert.equal(seguro("https://www.binance.com/en/trade/JUP_USDT"), "https://www.binance.com/en/trade/JUP_USDT");
  assert.equal(seguro("javascript:alert(1)"), null);
  assert.equal(seguro("http://x.com"), null);
  const c = exchanges([tick("Binance", 0.07, 1e6, { trade_url: "javascript:alert(1)" })]);
  assert.equal(c[0].url, null);
  const DB = { prepare: () => ({ bind: () => ({ first: async () => ({ lvl: "HIGH" }) }) }) };
  const f = async (u) => u.includes("dexscreener") ? { ok: true, json: async () => [] } : { ok: false, status: 404 };
  assert.equal((await cotiza({ DB }, M, { cache: null, fetch: f })).nivel, "HIGH");
  assert.equal((await cotiza({}, M, { cache: null, fetch: f })).nivel, null);
  // los cinco niveles, si ya están guardados
  const DB5 = { prepare: () => ({ bind: () => ({ first: async () => ({ lvl: "HIGH", tr: "ORANGE" }) }) }) };
  assert.equal((await cotiza({ DB: DB5 }, M, { cache: null, fetch: f })).nivel, "ORANGE");
});
