// Builds the English page (en/index.html) from the Spanish one (index.html), which stays the only source.
// Usage: node build-en.js      (run it after every change to index.html, then commit both)
//
// It translates exact string literals of the scripts and exact text/attributes of the markup using
// i18n/en.js, applies the code changes listed there, and fails if a code change no longer matches or if
// Spanish text is left untranslated, so the English page never silently falls behind.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CODE, TEXT } from "./i18n/en.js";

const root = dirname(fileURLToPath(import.meta.url));
let html = readFileSync(join(root, "index.html"), "utf8");
const used = new Set(), problems = [];

for (const [from, to] of CODE) {
  if (!html.includes(from)) { problems.push("code change no longer matches: " + from.slice(0, 80)); continue; }
  html = html.split(from).join(to);
}

// Walks a script and calls fn(raw, quote) for every string literal, skipping comments and regex literals
function mapLiterals(js, fn) {
  let out = "", i = 0, last = "";
  const regexAfter = /[(,=:[!&|?{};+\-*%<>~^]$/;
  while (i < js.length) {
    const c = js[i], n = js[i + 1];
    if (c === "/" && n === "/") { const e = js.indexOf("\n", i); const j = e < 0 ? js.length : e; out += js.slice(i, j); i = j; continue; }
    if (c === "/" && n === "*") { const j = js.indexOf("*/", i + 2) + 2; out += js.slice(i, j); i = j; continue; }
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < js.length && js[j] !== c) { if (js[j] === "\\") j++; j++; }
      const raw = js.slice(i + 1, j);
      out += c === "`" ? js.slice(i, j + 1) : fn(raw, c);
      i = j + 1; last = c; continue;
    }
    if (c === "/" && (regexAfter.test(last) || /(^|[^\w$])(return|typeof|in|of)$/.test(js.slice(Math.max(0, i - 8), i).trimEnd()) || last === "")) {
      let j = i + 1, cls = false;
      while (j < js.length) { const d = js[j]; if (d === "\\") { j += 2; continue; } if (d === "[") cls = true; else if (d === "]") cls = false; else if (d === "/" && !cls) break; else if (d === "\n") break; j++; }
      out += js.slice(i, j + 1); i = j + 1; last = "/"; continue;
    }
    out += c;
    if (!/\s/.test(c)) last = c;
    i++;
  }
  return out;
}

function quoteFor(text, q) {
  if (text.includes(q)) problems.push("translation contains its own quote " + q + ": " + text.slice(0, 60));
  return q + text + q;
}

const parts = html.split(/(<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>)/);
for (let k = 0; k < parts.length; k++) {
  const p = parts[k];
  if (/^<script/.test(p)) {
    const open = p.match(/^<script\b[^>]*>/)[0], body = p.slice(open.length, p.length - "</script>".length);
    parts[k] = open + mapLiterals(body, (raw, q) => {
      if (Object.prototype.hasOwnProperty.call(TEXT, raw)) { used.add(raw); return quoteFor(TEXT[raw], q); }
      return q + raw + q;
    }) + "</script>";
  } else if (!/^<style/.test(p)) {
    parts[k] = p
      .replace(/>([^<>]+)</g, (m, t) => {
        const key = t.replace(/\s+/g, " ").trim();
        if (!key || !Object.prototype.hasOwnProperty.call(TEXT, key)) return m;
        used.add(key);
        return ">" + t.match(/^\s*/)[0] + TEXT[key] + t.match(/\s*$/)[0] + "<";
      })
      .replace(/(\s(?:title|placeholder|aria-label|content|alt)=")([^"]*)"/g, (m, a, v) => {
        if (!Object.prototype.hasOwnProperty.call(TEXT, v)) return m;
        used.add(v);
        return a + TEXT[v] + '"';
      });
  }
}
html = parts.join("");

// Anything that still reads as Spanish is a missing translation (the internal keys below are expected)
const KEYS = new Set(["SIN DATOS", "SIN MERCADO", "ALTO", "MEDIO", "BAJO", "TODOS", "TOKENIZADO", "PUENTEADO", "CREADOR", "ABIERTO",
  "programa", "activa", "cancelado", "helius", "dex", "sol", "con", "spam", "wallet", "token", "hoy", "es", "esc.lista", "esc.conf"]);
const SPANISH = /[áéíóúñ¿¡]|\b(de|del|que|las|los|una|para|por|sin|con|más|pulsa|riesgo|wallets? que|aún|todavía|también)\b/i;
const left = new Set();
for (const p of html.split(/(<script\b[^>]*>[\s\S]*?<\/script>)/)) {
  if (!/^<script/.test(p)) {
    for (const m of p.replace(/<style[\s\S]*?<\/style>/g, "").matchAll(/>([^<>]+)</g)) { const t = m[1].replace(/\s+/g, " ").trim(); if (t && SPANISH.test(t)) left.add("text: " + t); }
    continue;
  }
  mapLiterals(p.replace(/^<script\b[^>]*>|<\/script>$/g, ""), (raw, q) => {
    const words = raw.replace(/<[^>]*>/g, " ").replace(/\[?data-[\w-]+(=')?\]?/g, " ");   // attribute names like data-del are code
    if (!KEYS.has(raw) && !/^esc\./.test(raw) && SPANISH.test(words)) left.add("js: " + raw.slice(0, 110));
    return q + raw + q;
  });
}
for (const k of Object.keys(TEXT)) if (!used.has(k)) problems.push("translation never used (text changed in index.html?): " + k.slice(0, 80));
for (const t of left) problems.push("still Spanish: " + t);

mkdirSync(join(root, "en"), { recursive: true });
writeFileSync(join(root, "en", "index.html"), html);
console.log(`en/index.html written · ${used.size} texts translated · ${CODE.length} code changes`);
if (problems.length) { console.log(problems.length + " problems:\n" + problems.map((p) => "  - " + p).join("\n")); process.exitCode = 1; }
