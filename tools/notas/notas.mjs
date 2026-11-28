// Historial de la nota (28/11/2026; maqueta aprobada maquetas/historial-nota/historial-nota.html).
// Una vez al día (lo lanza ecosistema.yml justo después de hacer perfiles.json) calcula la nota de SolFlag de cada
// token de perfiles.json con el MISMO motor y versión que la web (analyzeToken + perfil = puntos por apartado) y la
// guarda en D1, tabla notas: una fila por token y día con los puntos, el nivel, el apartado y cada chequeo [k, col, p, d].
// La ficha (tools/api/ficha.js) la lee para «Nota de SolFlag, día a día».
// Coste medido el 28/11: 4 llamadas a Helius por token (getAccountInfo, getTokenLargestAccounts, 2 getMultipleAccounts).
// Necesita SOLANA_RPC, CF_API_TOKEN, CF_ACCOUNT_ID y CF_D1_ID. Si un token falla, se salta (ese día no tiene nota).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createScanner } from "solana-risk-engine";

export const TABLA = "CREATE TABLE IF NOT EXISTS notas (m TEXT NOT NULL, dia TEXT NOT NULL, pts INTEGER, tier TEXT, ap TEXT, ck TEXT, PRIMARY KEY (m, dia))";
const POR_CONSULTA = 16;   // D1: 100 parámetros por consulta, 6 por fila

// lo que se guarda de un resultado del motor (null si no tiene puntos: sin mercado)
export function fila(m, dia, res) {
  const p = res && res.perfil;
  if (!p || typeof p.pts !== "number") return null;
  const ck = (p.checks || []).map((c) => [c.k, c.col, c.p, c.d === undefined ? null : c.d]);
  return [m, dia, Math.round(p.pts), p.tier || null, p.ap || null, JSON.stringify(ck)];
}

async function main() {
  const RPC = process.env.SOLANA_RPC || "";
  const { CF_API_TOKEN, CF_ACCOUNT_ID, CF_D1_ID } = process.env;
  const prueba = process.env.NOTAS_PRUEBA === "1";   // en local: calcula y enseña, sin tocar D1
  if (!RPC || (!prueba && (!CF_API_TOKEN || !CF_ACCOUNT_ID || !CF_D1_ID))) { console.log("notas: faltan secretos, no se hace nada"); return; }
  const url = "https://api.cloudflare.com/client/v4/accounts/" + CF_ACCOUNT_ID + "/d1/database/" + CF_D1_ID + "/query";
  const d1 = async (sql, params) => {
    const r = await fetch(url, { method: "POST", headers: { authorization: "Bearer " + CF_API_TOKEN, "content-type": "application/json" }, body: JSON.stringify({ sql, params: params || [] }) });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || !j.success) throw new Error("D1 " + r.status + ": " + JSON.stringify((j && j.errors) || "").slice(0, 200));
  };
  // perfiles.json: el recién hecho por el trabajo del Ecosistema o, si no está, el publicado
  const local = process.env.OUT_DIR && path.join(process.env.OUT_DIR, "perfiles.json");
  const perf = local && fs.existsSync(local) ? JSON.parse(fs.readFileSync(local, "utf8")) : await (await fetch("https://solflag.com/datos/perfiles.json")).json();
  const mints = Object.keys(perf.t || {});
  const dia = new Date().toISOString().slice(0, 10);
  const sc = createScanner({ rpcUrl: RPC });
  const filas = []; let fallos = 0;
  for (let i = 0; i < mints.length; i += 3) {   // de 3 en 3: no pasar del límite de Helius ni de DexScreener
    await Promise.all(mints.slice(i, i + 3).map(async (m) => {
      try { const f = fila(m, dia, await sc.analyzeToken(m, { perfil: perf.t[m] || null })); if (f) filas.push(f); else fallos++; }
      catch (e) { fallos++; console.log("notas:", m.slice(0, 6), e.message); }
    }));
  }
  if (prueba) { filas.forEach((f) => console.log(f[0].slice(0, 6), f[2], f[3], f[4])); console.log(`prueba: ${filas.length} de ${mints.length} · ${fallos} sin nota`); return; }
  await d1(TABLA);
  for (let i = 0; i < filas.length; i += POR_CONSULTA) {
    const lote = filas.slice(i, i + POR_CONSULTA);
    await d1("INSERT OR REPLACE INTO notas (m, dia, pts, tier, ap, ck) VALUES " + lote.map(() => "(?, ?, ?, ?, ?, ?)").join(", "), lote.flat());
  }
  console.log(`notas ${dia}: ${filas.length} de ${mints.length} tokens guardados · ${fallos} sin nota`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
