// Tests de «Apoya SolFlag» (apoya.js): qué cuenta como donación y quién la envía
import test from "node:test";
import assert from "node:assert/strict";
import { movimiento, apoya, DONA, USDC } from "./apoya.js";

const X = "Donante11111111111111111111111111111";
const tx = (keys, pre, post, preT = [], postT = [], err = null) => ({ blockTime: 100, transaction: { signatures: ["sig1"], message: { accountKeys: keys.map((k) => ({ pubkey: k })) } },
  meta: { err, preBalances: pre, postBalances: post, preTokenBalances: preT, postTokenBalances: postT } });
const tb = (owner, n) => ({ mint: USDC, owner, uiTokenAmount: { uiAmount: n } });

test("SOL recibido: donación con quien la envía", () => {
  assert.deepEqual(movimiento(tx([X, DONA], [2e9, 0], [1.5e9 - 5000, 0.5e9]), DONA), { t: 100, sol: 0.5, usdc: 0, de: X, sig: "sig1" });
});
test("USDC recibido: donación del dueño que baja", () => {
  const m = movimiento(tx([X, DONA], [1e9, 1e9], [1e9 - 5000, 1e9], [tb(X, 30), tb(DONA, 0)], [tb(X, 5), tb(DONA, 25)]), DONA);
  assert.equal(m.usdc, 25); assert.equal(m.sol, 0); assert.equal(m.de, X);
});
test("salida (gasto) y transacciones fallidas o sin cambio", () => {
  assert.equal(movimiento(tx([DONA, X], [1e9, 0], [0.4e9, 0.6e9]), DONA).sol, -0.6);
  assert.equal(movimiento(tx([X, DONA], [2e9, 0], [1e9, 1e9], [], [], { e: 1 }), DONA), null);
  assert.equal(movimiento(tx([X, DONA], [2e9, 5], [2e9, 5]), DONA), null);
});
test("apoya junta saldo, USDC, precio y movimientos; sin RPC devuelve null", async () => {
  const f = async (url, o) => {
    if (String(url).includes("jup.ag")) return { ok: true, json: async () => ({ So11111111111111111111111111111111111111112: { usdPrice: 140 } }) };
    const q = JSON.parse(o.body), r = { getBalance: { value: 2e9 },
      getTokenAccountsByOwner: { value: [{ account: { data: { parsed: { info: { tokenAmount: { uiAmount: 12 } } } } } }] },
      getTransactionsForAddress: { data: [tx([X, DONA], [2e9, 0], [1e9, 1e9])] } }[q.method];
    return { ok: true, json: async () => ({ result: r }) };
  };
  const a = await apoya({ SOLANA_RPC: "rpc" }, f);
  assert.equal(a.sol, 2); assert.equal(a.usdc, 12); assert.equal(a.solUsd, 140); assert.equal(a.mov.length, 1);
  assert.equal(await apoya({ SOLANA_RPC: "rpc" }, async () => ({ ok: false, json: async () => ({}) })), null);
});
