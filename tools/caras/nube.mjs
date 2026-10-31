// Memoria del recolector en Cloudflare Workers KV, para no depender solo de la caché de Actions (GitHub la borra si no
// se usa en 7 días o si pasa de 10 GB). La caché sigue como respaldo: se usa la copia más reciente de las dos.
//
//   node tools/caras/nube.mjs bajar   antes de recolectar: trae la memoria de Cloudflare si es más nueva que la de la caché
//   node tools/caras/nube.mjs subir   después: guarda la memoria (clave "estado") y una copia del día que dura 9 días
//
// Necesita los secretos CF_API_TOKEN (permiso Workers KV Storage: Edit), CF_ACCOUNT_ID y CF_KV_ID. Sin ellos no hace nada.
// Nunca hace fallar el recolector: si Cloudflare falla, avisa y sigue con la caché. Y si al bajar no pudo leer Cloudflare
// (error que no sea "todavía no existe"), al subir no pisa lo que hay allí con una memoria que podría ser más vieja.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STATE = path.join(HERE, "estado.json");
const MARK = path.join(process.env.RUNNER_TEMP || os.tmpdir(), "caras-nube-ok");
const KEEP_DAYS = 9;

// Elige la memoria a usar: la que tenga la fecha de guardado (at) más reciente; sin fecha cuenta como la más vieja.
export function pick(local, remote) {
  if (!remote) return "local";
  if (!local) return "remote";
  return (remote.at || 0) > (local.at || 0) ? "remote" : "local";
}

const warn = (m) => console.log("::warning::" + m);

async function main(cmd) {
  const { CF_API_TOKEN: tok, CF_ACCOUNT_ID: acc, CF_KV_ID: ns } = process.env;
  if (!tok || !acc || !ns) { console.log("Cloudflare sin configurar: la memoria sigue solo en la caché de Actions"); return; }
  const url = `${process.env.CF_API_BASE || "https://api.cloudflare.com/client/v4"}/accounts/${acc}/storage/kv/namespaces/${ns}/values/`;
  const auth = { Authorization: "Bearer " + tok };

  if (cmd === "bajar") {
    const r = await fetch(url + "estado", { headers: auth });
    if (r.status === 404) { console.log("Todavía no hay memoria en Cloudflare: se creará al terminar"); fs.writeFileSync(MARK, "1"); return; }
    if (!r.ok) { warn(`Cloudflare respondió ${r.status} al leer la memoria; sigo con la de la caché y hoy no la piso`); return; }
    let remote;
    try { remote = JSON.parse(zlib.gunzipSync(Buffer.from(await r.arrayBuffer())).toString("utf8")); }
    catch (e) { warn("La memoria de Cloudflare no se puede leer; sigo con la caché y hoy no la piso"); return; }
    const local = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : null;
    const use = pick(local, remote);
    if (use === "remote") fs.writeFileSync(STATE, JSON.stringify(remote));
    console.log(`Memoria: uso la de ${use === "remote" ? "Cloudflare" : "la caché"} (Cloudflare ${remote.at ? new Date(remote.at).toISOString() : "sin fecha"}, caché ${local && local.at ? new Date(local.at).toISOString() : local ? "sin fecha" : "vacía"})`);
    fs.writeFileSync(MARK, "1");
    return;
  }

  if (cmd === "subir") {
    if (!fs.existsSync(MARK)) { console.log("No subo la memoria a Cloudflare porque al empezar no se pudo leer"); return; }
    if (!fs.existsSync(STATE)) { warn("No hay estado.json que subir"); return; }
    const body = zlib.gzipSync(fs.readFileSync(STATE));
    const day = new Date().toISOString().slice(0, 10);
    for (const key of ["estado", `estado-${day}?expiration_ttl=${KEEP_DAYS * 86400}`]) {
      const r = await fetch(url + key, { method: "PUT", headers: Object.assign({ "Content-Type": "application/octet-stream" }, auth), body });
      if (!r.ok) { warn(`Cloudflare respondió ${r.status} al guardar ${key.split("?")[0]}: ${(await r.text()).slice(0, 200)}`); continue; }
      console.log(`Guardado en Cloudflare: ${key.split("?")[0]} (${Math.round(body.length / 1024)} KB comprimido)`);
    }
    return;
  }
  throw new Error("uso: node tools/caras/nube.mjs bajar|subir");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main(process.argv[2]).catch((e) => { warn("Cloudflare: " + e.message); });
}
