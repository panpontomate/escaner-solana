// Entrada del blog del 24/11 (es y en): la pone delante de la del 23/11. Uso: node tools/paginas/blog-24nov.mjs
import fs from "node:fs";
const id = "una-wallet-grande", d = "2026-11-24";
const es = { t: "Cuando una sola wallet puede hundir un token",
  tags: ["Escáner", "Gráfica", "Novedad"],
  b: `<p>Esta mañana, un token muy seguido de Solana cayó más de un 50 % en cinco minutos: una wallet vendió de golpe. Al mirarlo con SolFlag vimos lo que se nos escapaba: una sola wallet tenía casi la mitad del token y aun así salía en amarillo. Lo hemos cambiado.</p>
  <h3>Una wallet grande pesa más</h3>
  <p>En un meme, lo que tiene la wallet más grande ya no resta a saltos: resta poco a poco, un punto por cada punto por encima del 15 %. Y si una sola wallet de una persona (sin contar pools ni exchanges) tiene el 40 % o más, el token sale <b>como mucho en naranja</b>. Ese token pasa de amarillo con 60 puntos a naranja con 39.</p>
  <h3>De quién es y cuándo se movió</h3>
  <p>La bandera «Una wallet grande» ahora dice si es la wallet de una persona y cuándo se movió por última vez («Se movió hoy, a las 17:19»), con su enlace a Solscan.</p>
  <h3>Caídas bruscas en la gráfica</h3>
  <p>Nueva marca rosa: cuando el precio cae más de un 30 % en un minuto, sale en la vela y en «Lo que pasó», con <b>quién vendió en ese momento</b>, cuántos tokens y su valor aproximado. Son hechos de la cadena, no acusaciones.</p>
  <h3>Y además</h3>
  <ul>
    <li>Arriba del resultado, en vez de «Lo que resta: …», unas etiquetas con lo que resta y su dato («Una wallet grande · 49,2 %»).</li>
    <li>La tarjeta de banderas dice solo su apartado: «Meme», «DeFi»…</li>
    <li>En la portada vuelve «Financia creadores» en «Las wallets del día».</li>
    <li>«Cómo funciona», con menos texto repetido.</li>
  </ul>` };
const en = { t: "When a single wallet can sink a token",
  tags: ["Scanner", "Chart", "New"],
  b: `<p>This morning a widely followed Solana token fell more than 50% in five minutes: one wallet sold all at once. Looking at it with SolFlag we saw what we were missing: one wallet held almost half the token and it still showed yellow. We changed that.</p>
  <h3>One big wallet weighs more</h3>
  <p>On a meme, what the biggest wallet holds no longer subtracts in steps: it subtracts gradually, one point per point above 15%. And if one person's wallet (pools and exchanges excluded) holds 40% or more, the token is <b>orange at best</b>. That token goes from yellow with 60 points to orange with 39.</p>
  <h3>Whose it is and when it moved</h3>
  <p>The «One big wallet» flag now says whether it is one person's wallet and when it last moved («It moved today, at 17:19»), with its Solscan link.</p>
  <h3>Sudden crashes on the chart</h3>
  <p>A new pink mark: when the price falls more than 30% in one minute, it shows on the candle and in «What happened», with <b>who sold at that moment</b>, how many tokens and their approximate value. Facts from the chain, not accusations.</p>
  <h3>Also</h3>
  <ul>
    <li>At the top of the result, instead of «What subtracts: …», tags with what subtracts and its figure («One big wallet · 49.2%»).</li>
    <li>The flags card only says its section: «Meme», «DeFi»…</li>
    <li>On the home page, «Funds creators» is back in «Wallets of the day».</li>
    <li>«How it works», with less repeated text.</li>
  </ul>` };
function aplicar(file, L, en) {
  let h = fs.readFileSync(file, "utf8");
  if (h.includes(`id="${id}"`)) { console.log(file, ": ya estaba"); return; }
  const url = en ? "https://solflag.com/en/blog/" : "https://solflag.com/blog/";
  const corta = en ? "24 Nov 2026" : "24 nov 2026", larga = en ? "24 November 2026" : "24 de noviembre de 2026";
  const idx = `    <a href="#${id}"><time datetime="${d}">${corta}</time><b>${L.t}</b></a>\n`;
  const art = `<article id="${id}">
  <time datetime="${d}">${larga}</time>
  <h2>${L.t}</h2>
  <div class="tags">${L.tags.map((t) => `<span>${t}</span>`).join("")}</div>
  ${L.b}
  <div class="share"><a href="https://x.com/intent/post?text=${encodeURIComponent("SolFlag: " + L.t)}&amp;url=${encodeURIComponent(url + "#" + id)}" target="_blank" rel="noopener">${en ? "Share on X" : "Compartir en X"}</a><a href="#${id}">${en ? "Link to this post" : "Enlace a esta entrada"}</a></div>
</article>

`;
  const a = '    <a href="#analisis-mas-limpio">', b = '<article id="analisis-mas-limpio">';
  if (!h.includes(a) || !h.includes(b)) throw new Error(file + ": no encuentro la entrada del 23/11");
  h = h.replace(a, idx + a).replace(b, art + b);
  fs.writeFileSync(file, h);
  console.log(file, ": + entrada del 24/11");
}
aplicar("blog/index.html", es, false);
aplicar("en/blog/index.html", en, true);
