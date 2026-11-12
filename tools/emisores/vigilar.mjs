// Vigila las claves de control de los tokens oficiales de emisores (emisores.json). Si una clave que no
// está en la lista aparece en un token oficial, busca la transacción que la cambió y quién la firmó, y
// escribe el aviso en aviso.md (el workflow lo manda por Telegram y abre un issue). No cambia la lista:
// una clave nueva solo se añade tras comprobarla en la fuente oficial del emisor.
// Uso: SOLANA_RPC=<url> node tools/emisores/vigilar.mjs [emisores.json]
import fs from "node:fs";

const RPC = process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";
const lista = JSON.parse(fs.readFileSync(process.argv[2] || "emisores.json", "utf8")).emisores;

async function rpc(method, params) {
  for (let n = 0; n < 3; n++) {
    const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
    const j = await r.json().catch(() => null);
    if (j && j.result !== undefined) return j.result;
    await new Promise((ok) => setTimeout(ok, 1500 * (n + 1)));
  }
  throw new Error(method + " sin respuesta");
}

// Las mismas claves que lee el motor (getMint/extKeys): autoridades de mint y freeze y las de las extensiones
function claves(p) {
  const out = [p.mintAuthority, p.freezeAuthority];
  (p.extensions || []).forEach((e) => Object.keys(e.state || {}).forEach((k) => {
    const v = e.state[k];
    if (typeof v === "string" && /authority$|^delegate$|^programId$/i.test(k)) out.push(v);
  }));
  return [...new Set(out.filter(Boolean))];
}

// Instrucciones de las últimas transacciones del token que ponen una de las claves nuevas
async function quienCambio(mint, nuevas) {
  const firmas = await rpc("getSignaturesForAddress", [mint, { limit: 100 }]);
  const hallado = [];
  for (const f of firmas) {
    if (f.err) continue;
    const tx = await rpc("getTransaction", [f.signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }]);
    if (!tx) continue;
    const ins = tx.transaction.message.instructions.concat(...((tx.meta && tx.meta.innerInstructions) || []).map((x) => x.instructions));
    for (const i of ins) {
      const info = i.parsed && i.parsed.info;
      if (!info) continue;
      const puesta = Object.values(info).find((v) => typeof v === "string" && nuevas.includes(v) && v !== mint);
      if (!puesta) continue;
      const firmantes = tx.transaction.message.accountKeys.filter((a) => a.signer).map((a) => a.pubkey);
      hallado.push({ tipo: i.parsed.type + (info.authorityType ? " (" + info.authorityType + ")" : ""), nueva: puesta,
        anterior: info.authority || info.multisigAuthority || null, firmantes, firma: f.signature,
        fecha: f.blockTime ? new Date(f.blockTime * 1000).toISOString().slice(0, 16).replace("T", " ") + " UTC" : "?" });
    }
    if (nuevas.every((k) => hallado.some((h) => h.nueva === k))) break;
  }
  return hallado;
}

const corto = (k) => k.slice(0, 6) + "…" + k.slice(-4);
const avisos = [];
for (const e of lista) {
  for (const [mint, fuente] of Object.entries(e.mints || {})) {
    const cuenta = await rpc("getAccountInfo", [mint, { encoding: "jsonParsed" }]);
    const p = cuenta && cuenta.value && cuenta.value.data && cuenta.value.data.parsed && cuenta.value.data.parsed.info;
    if (!p) { avisos.push(`• ${e.name} ${corto(mint)}: no se pudo leer el token`); continue; }
    const nuevas = claves(p).filter((k) => !e.keys.includes(k));
    console.log(e.name, corto(mint), nuevas.length ? "CLAVES NUEVAS: " + nuevas.join(", ") : "ok");
    if (!nuevas.length) continue;
    const cambios = await quienCambio(mint, nuevas).catch(() => []);
    const lineas = [`• ${e.name}, token ${mint}`, `  Claves nuevas: ${nuevas.join(", ")}`, `  Fuente oficial para comprobarlo: ${fuente}`];
    for (const c of cambios) {
      const porAnterior = c.anterior && e.keys.includes(c.anterior);
      lineas.push(`  ${c.fecha} · ${c.tipo} → ${corto(c.nueva)} · firmado por ${c.firmantes.map(corto).join(", ")}` +
        (porAnterior ? " (la clave anterior era del emisor)" : " (la clave anterior NO está en nuestra lista)") +
        ` · https://solscan.io/tx/${c.firma}`);
    }
    if (!cambios.length) lineas.push("  No encontré la transacción del cambio en las 100 últimas del token.");
    avisos.push(lineas.join("\n"));
  }
}

if (avisos.length) {
  fs.writeFileSync("aviso.md", "Claves de control nuevas en tokens oficiales de emisores. En la web salen en ámbar («claves cambiadas, pendiente de verificar») hasta que se compruebe y se añada la clave a emisores.json.\n\n" + avisos.join("\n\n") + "\n");
  console.log("\n" + fs.readFileSync("aviso.md", "utf8"));
} else console.log("Todas las claves coinciden con emisores.json");
