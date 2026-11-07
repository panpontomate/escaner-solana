// Forma del Mapa del momento (sin el motor, para poder probarla sin instalar nada): qué candidatos de la tendencia
// sirven y cómo se recorta el mapa del motor para la miniatura de la página Escáner
export const MAX_HOLDERS = 40;        // lo que se dibuja en la miniatura
// estables y envoltorios: no tienen nada que enseñar en un mapa
const SKIP = new Set(["So11111111111111111111111111111111111111112", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"]);
const SKIP_SYM = /^(W?SOL|USDC|USDT|PYUSD|USDG|EURC|USD1|FDUSD|JITOSOL|MSOL|BNSOL|JUPSOL|CBBTC|WBTC|WETH)$/i;

const round = (x, d) => Math.round(x * Math.pow(10, d)) / Math.pow(10, d);

// El mapa del motor, recortado a lo que hace falta para dibujar: holders (los MAX_HOLDERS mayores), grupos y avisos
export function shape(m, meta, known) {
  const hs = (m.holders || []).slice().sort((a, b) => b.pct - a.pct).slice(0, MAX_HOLDERS);
  const keep = new Set(hs.map((h) => h.addr));
  const groups = (m.groups || []).map((g) => ({ id: g.id, f: g.funder, n: g.members.length, pct: round(g.pct, 2),
    m: g.members.filter((a) => keep.has(a)) })).filter((g) => g.m.length >= 2);
  const gOf = {};
  groups.forEach((g) => g.m.forEach((a) => { gOf[a] = g.id; }));
  return {
    v: 1, at: meta.at, dur: "1h", rank: meta.rank, mint: m.mint, sym: meta.sym, name: meta.name || "", img: meta.img || null,
    mode: m.mode, age: m.ageDays == null ? null : round(m.ageDays, 2), n: (m.holders || []).length,
    holders: hs.map((h) => {
      const kw = known && known(h.addr), o = { a: h.addr, p: round(h.pct, 3), t: h.type || "person" };
      if (gOf[h.addr]) o.g = gOf[h.addr];
      if (kw && kw.name) o.name = kw.name;
      if (h.addr === m.creator) o.cr = 1;
      return o;
    }),
    groups: groups.map((g) => ({ id: g.id, f: g.f, n: g.n, pct: g.pct })),
    signals: (m.signals || []).map((s) => ({ code: s.code, s: s.s }))
  };
}

// Candidatos: los primeros de la tendencia de la última hora que no son estables ni envoltorios
export function candidates(j) {
  const toks = {};
  (j.included || []).forEach((t) => { toks[t.id] = t.attributes || {}; });
  const out = [], seen = new Set();
  (j.data || []).forEach((p, i) => {
    const rel = p.relationships || {}, id = rel.base_token && rel.base_token.data && rel.base_token.data.id;
    const mint = id && id.replace(/^solana_/, ""), t = toks[id] || {};
    if (!mint || seen.has(mint) || SKIP.has(mint) || SKIP_SYM.test(t.symbol || "")) return;
    seen.add(mint);
    const img = t.image_url && !/missing/.test(t.image_url) ? t.image_url : null;
    out.push({ mint, rank: i + 1, sym: t.symbol || String((p.attributes || {}).name || "?").split(" / ")[0], name: t.name || "", img,
      created: Date.parse((p.attributes || {}).pool_created_at) || null });
  });
  return out;
}

