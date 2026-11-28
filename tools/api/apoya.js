// «Apoya SolFlag» (28/11): saldo y movimientos de la wallet de donaciones, leídos de la cadena (Helius).
// GET /api/apoya → { v, w, sol, usdc, solUsd, mov: [{ t, sol, usdc, de, sig }] } (lo más nuevo primero).
// Entradas (sol/usdc > 0) = donaciones; salidas (< 0) = gastos pagados desde la wallet. 5 min en la caché:
// solo cuesta créditos cuando alguien abre la página (~12 créditos por vuelta).
export const DONA = "2DbYrSYgn3tdiEnWy6gU95JZYmhQ11cdLWsrM6H7kN16";
export const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const WSOL = "So11111111111111111111111111111111111111112";

const rpc = (env, fetchFn, method, params) => fetchFn(env.SOLANA_RPC, { method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) }).then((r) => r.json()).catch(() => null);

// lo que cambia una transacción en la wallet w: SOL (sin contar la comisión si la paga otro) y USDC, y quién envía
export function movimiento(t, w) {
  if (!t || !t.meta || t.meta.err || !t.transaction) return null;
  const keys = (t.transaction.message && t.transaction.message.accountKeys || []).map((k) => k.pubkey || k);
  const i = keys.indexOf(w);
  const sol = i >= 0 ? ((t.meta.postBalances[i] || 0) - (t.meta.preBalances[i] || 0)) / 1e9 : 0;
  let usdc = 0, de = null;
  const amt = (b) => Number(b && b.uiTokenAmount && b.uiTokenAmount.uiAmount) || 0;
  const pre = {}, post = {};
  (t.meta.preTokenBalances || []).forEach((b) => { if (b.mint === USDC) pre[b.owner] = (pre[b.owner] || 0) + amt(b); });
  (t.meta.postTokenBalances || []).forEach((b) => { if (b.mint === USDC) post[b.owner] = (post[b.owner] || 0) + amt(b); });
  usdc = (post[w] || 0) - (pre[w] || 0);
  if (usdc > 0) { for (const o in pre) if (o !== w && (post[o] || 0) < pre[o]) { de = o; break; } }
  else if (sol > 0 && keys[0] !== w) de = keys[0];
  const r6 = (x) => Math.round(x * 1e6) / 1e6;
  if (Math.abs(sol) < 1e-6 && Math.abs(usdc) < 1e-6) return null;
  return { t: t.blockTime, sol: r6(sol), usdc: r6(usdc), de, sig: t.transaction.signatures && t.transaction.signatures[0] };
}

export async function apoya(env, fetchFn) {
  const w = DONA;
  const [bal, tok, txs, px] = await Promise.all([
    rpc(env, fetchFn, "getBalance", [w]),
    rpc(env, fetchFn, "getTokenAccountsByOwner", [w, { mint: USDC }, { encoding: "jsonParsed" }]),
    rpc(env, fetchFn, "getTransactionsForAddress", [w, { transactionDetails: "full", sortOrder: "desc", limit: 100,
      encoding: "jsonParsed", maxSupportedTransactionVersion: 0, filters: { status: "succeeded" } }]),
    fetchFn("https://lite-api.jup.ag/price/v3?ids=" + WSOL).then((r) => r.ok ? r.json() : null).catch(() => null),
  ]);
  if (!bal || !bal.result || !tok || !tok.result) return null;
  const usdc = (tok.result.value || []).reduce((s, a) => s + (Number(a.account.data.parsed.info.tokenAmount.uiAmount) || 0), 0);
  const data = txs && txs.result && txs.result.data;
  const p = px && px[WSOL] && Number(px[WSOL].usdPrice);
  return { v: 1, w, sol: bal.result.value / 1e9, usdc, solUsd: p > 0 ? p : null,
    mov: Array.isArray(data) ? data.map((t) => movimiento(t, w)).filter(Boolean) : null };
}
