// Entradas del blog del 16 al 23 de noviembre (preparadas el 24/11), una por día, en español e inglés.
// Uso (una sola vez): node tools/paginas/blog-16-23nov.mjs  → las pone delante de la del 15/11 en blog/ y en/blog/.
import fs from "node:fs";

const E = [
  { id: "analisis-mas-limpio", d: "2026-11-23", tags: [["Análisis", "Analysis"], ["Mejora", "Improvement"]],
    es: { t: "Un análisis más limpio y «Quién está detrás» más claro",
      b: `<p>Tres retoques en el resultado de un token:</p>
  <ul>
    <li><b>Sin la leyenda de colores:</b> la barra de puntos ya enseña el nivel y lo que suma o resta, así que la leyenda solo repetía lo mismo.</li>
    <li><b>«Quién está detrás», con un texto más claro</b> sobre qué guardamos en el registro y desde cuándo.</li>
    <li><b>Más rápido en tokens grandes:</b> las cuentas con más saldo se recuerdan 10 minutos, así no esperas de nuevo si vuelves al mismo token.</li>
  </ul>` },
    en: { t: "A cleaner analysis and a clearer «Who is behind»",
      b: `<p>Three touches on the result of a token:</p>
  <ul>
    <li><b>No colour legend:</b> the points bar already shows the tier and what adds or subtracts, so the legend only repeated it.</li>
    <li><b>«Who is behind», with clearer text</b> about what our registry keeps and since when.</li>
    <li><b>Faster on big tokens:</b> the largest holders are remembered for 10 minutes, so you don't wait again when you come back to the same token.</li>
  </ul>` } },

  { id: "mas-rapida", d: "2026-11-22", tags: [["Rendimiento", "Performance"], ["Ecosistema", "Ecosystem"]],
    es: { t: "Una web más rápida y la liquidez que de verdad cuenta",
      b: `<p>Hoy el trabajo ha sido sobre todo de velocidad:</p>
  <ul>
    <li><b>Portada más ligera:</b> los tokens en tendencia se analizan cuando llegas a verlos, no todos al entrar, y se recuerdan 10 minutos.</li>
    <li><b>El resultado sale antes:</b> primero la cabecera con el nivel y, enseguida, el resto de bloques.</li>
    <li><b>La liquidez del pool más grande:</b> el motor (versiones 0.7.1 y 0.7.2) mira todos los pools de cada token y se queda con el más grande, también en las listas. Antes podía tomar uno pequeño y dar una liquidez más baja de la real.</li>
  </ul>
  <p>En el Ecosistema, una columna nueva, <b>«Devuelve al token»</b>: cuánto de lo que gana un proyecto vuelve a los que tienen su token (recompras, quemas o reparto). Pump.fun pasa a DeFi, junto a los otros mercados. Y en el móvil, la cabecera ya no se transparenta y el botón de pantalla completa de la gráfica está en la línea del precio.</p>` },
    en: { t: "A faster site and the liquidity that really counts",
      b: `<p>Today was mostly about speed:</p>
  <ul>
    <li><b>Lighter home page:</b> trending tokens are analysed when you reach them, not all at once, and remembered for 10 minutes.</li>
    <li><b>The result shows up sooner:</b> first the header with the tier and, right after, the other blocks.</li>
    <li><b>Liquidity of the biggest pool:</b> the engine (versions 0.7.1 and 0.7.2) looks at every pool of a token and keeps the biggest one, in lists too. Before, it could pick a small one and show less liquidity than the real one.</li>
  </ul>
  <p>In the Ecosystem, a new column, <b>«Gives back to the token»</b>: how much of what a project earns goes back to its token holders (buybacks, burns or sharing). Pump.fun moves to DeFi, next to the other markets. And on mobile the header is no longer see-through and the chart's full-screen button sits on the price line.</p>` } },

  { id: "puntos-por-apartado", d: "2026-11-21", tags: [["Escáner", "Scanner"], ["Motor", "Engine"], ["Novedad", "New"]],
    es: { t: "Cada token, medido por lo que es: puntos por apartado",
      b: `<p>Hasta ahora SolFlag juzgaba un dólar digital como si fuera una memecoin. Circle puede congelar USDC o crear más: en un meme eso es una bandera roja; en una stablecoin regulada, es como funciona.</p>
  <h3>Siete apartados, siete formas de medir</h3>
  <p>Cada token se detecta como <b>meme, activo tokenizado, DeFi, juego, IA, app u otro</b>, y se mide con sus propias reglas. Un meme: quién lo controla, si hay una wallet grande, liquidez y antigüedad. Un activo tokenizado: si es del emisor oficial, si cambiaron sus claves y si hay reservas. DeFi: comisiones reales, auditorías, hackeos y desbloqueos. IA: si hay código público y si alguien sigue trabajando en él.</p>
  <p>El resultado es <b>una barra de 0 a 110</b> en la que cada chequeo dice si suma o resta. Lo que todavía no sabemos no cuenta ni a favor ni en contra. Viene con la versión 0.7.0 del motor.</p>
  <h3>Y además</h3>
  <ul>
    <li><b>El Escáner, por apartados:</b> cada uno con su propia vista, más compacta.</li>
    <li><b>Activos tokenizados:</b> una lista automática de 110 (xStocks y Backpack) con precios de Jupiter, y el oro tokenizado ya sale bien. «Acciones» deja el menú: su vista completa está en el Ecosistema.</li>
    <li><b>«Lo que pasó»</b> pasa al apartado de Ballenas.</li>
    <li>En el Ecosistema, las lanzaderas de memes con nuestro registro (cuántos tokens nacen y cuántos sobreviven) y la IA con su código y su señal.</li>
  </ul>` },
    en: { t: "Each token, measured by what it is: points by section",
      b: `<p>Until now SolFlag judged a digital dollar as if it were a memecoin. Circle can freeze USDC or mint more: on a meme that's a red flag; on a regulated stablecoin, that's just how it works.</p>
  <h3>Seven sections, seven ways to measure</h3>
  <p>Every token is detected as <b>meme, tokenized asset, DeFi, game, AI, app or other</b>, and measured by its own rules. A meme: who controls it, one big wallet, liquidity and age. A tokenized asset: is it the official issuer, did its keys change, are there reserves. DeFi: real fees, audits, hacks and unlocks. AI: is there public code and is anyone still working on it.</p>
  <p>The result is <b>one bar from 0 to 110</b> where each check shows if it adds or subtracts. What we don't know yet counts neither for nor against. It comes with version 0.7.0 of the engine.</p>
  <h3>Also</h3>
  <ul>
    <li><b>The Scanner, by section:</b> each one with its own, more compact view.</li>
    <li><b>Tokenized assets:</b> an automatic list of 110 (xStocks and Backpack) with Jupiter prices, and tokenized gold now shows right. «Stocks» leaves the menu: its full view lives in the Ecosystem.</li>
    <li><b>«What happened»</b> moves to the Whales section.</li>
    <li>In the Ecosystem, meme launchpads with our registry (how many tokens are born and how many survive) and AI with its code and signal.</li>
  </ul>` } },

  { id: "ecosistema", d: "2026-11-20", tags: [["Ecosistema", "Ecosystem"], ["Novedad", "New"]],
    es: { t: "Nueva página: el Ecosistema, todo Solana por apartados",
      b: `<p>Solana no son solo memecoins. Hoy estrenamos <a href="/ecosistema/">Ecosistema</a>: todo Solana ordenado por apartados (memes, activos tokenizados, DeFi, juegos, IA, apps y bots y otros), con los 10 primeros de cada grupo.</p>
  <p>Cada proyecto se mide por su <b>uso real</b>: lo que cobra en comisiones, el dinero en circulación, el valor tokenizado o su capitalización, según lo que sea. Salen los que tienen token y los que no, cuánta gente lo tiene y cuánta opera (datos de Jupiter), y una marca para los que <b>acaban de sacar token</b>. Los datos se recogen una vez al día. Está en el menú, justo después del Escáner.</p>
  <h3>Más emisores de confianza</h3>
  <p>Añadimos a la lista de emisores Ethena (USDe), World Liberty Financial con BitGo (USD1) y Solstice (USX y eUSX), con su página oficial de direcciones y sus claves comprobadas en la cadena. También las claves nuevas de Paxos para PYUSD y USDG, y las 95 acciones tokenizadas de Backpack. CASH se queda fuera: su emisor no publica su dirección en Solana.</p>` },
    en: { t: "New page: the Ecosystem, all of Solana by section",
      b: `<p>Solana isn't only memecoins. Today we launch the <a href="/en/ecosystem/">Ecosystem</a>: all of Solana sorted by section (memes, tokenized assets, DeFi, games, AI, apps and bots, and other), with the top 10 of each group.</p>
  <p>Each project is measured by its <b>real use</b>: fees it charges, money in circulation, tokenized value or market cap, depending on what it is. You see projects with and without a token, how many people hold it and how many trade it (Jupiter data), and a mark for those that <b>just launched a token</b>. Data is collected once a day. It's in the menu, right after the Scanner.</p>
  <h3>More trusted issuers</h3>
  <p>We added Ethena (USDe), World Liberty Financial with BitGo (USD1) and Solstice (USX and eUSX) to the issuers list, with their official address page and their keys checked on chain. Also Paxos' new keys for PYUSD and USDG, and Backpack's 95 tokenized stocks. CASH stays out: its issuer doesn't publish its Solana address.</p>` } },

  { id: "mi-lista-pulsar", d: "2026-11-19", tags: [["Mi lista", "My list"], ["Mejora", "Improvement"]],
    es: { t: "Mi lista: pulsa y analiza",
      b: `<p>En Mi lista, pulsar una wallet que sigues, la tarjeta o su nombre, abre su análisis. Antes el nombre solo subía la página. Lo mismo con el nombre de los tokens y con el historial de wallets.</p>
  <p>Y en la portada, nombres más claros: «Tokens calientes» pasa a <b>«Tokens en tendencia»</b> y «Billeteras calientes de hoy», a <b>«Las wallets del día»</b>.</p>` },
    en: { t: "My list: tap to analyse",
      b: `<p>In My list, tapping a wallet you follow, its card or its name, opens its analysis. Before, the name only scrolled the page up. Same with token names and the wallet history.</p>
  <p>And on the home page, clearer names: the hot tokens list is now <b>«Trending tokens»</b> and today's hot wallets, <b>«Wallets of the day»</b>.</p>` } },

  { id: "mi-lista-nombres", d: "2026-11-18", tags: [["Arreglo", "Fix"]],
    es: { t: "Arreglo en Mi lista y una limpieza por dentro",
      b: `<p>El detalle por wallet de Mi lista vuelve a enseñar el nombre de cada wallet: salía «[object Object]».</p>
  <p>Además hemos quitado código que ya no se usaba (el radar antiguo de la portada, restos del mapa anterior y doce funciones sueltas). No se ve, pero la web pesa menos.</p>` },
    en: { t: "A fix in My list and some cleaning inside",
      b: `<p>The per-wallet detail in My list shows each wallet's name again: it said «[object Object]».</p>
  <p>We also removed code that was no longer used (the old home-page radar, leftovers of the previous map and twelve loose functions). You can't see it, but the site is lighter.</p>` } },

  { id: "radar-telegram", d: "2026-11-17", tags: [["Radar", "Radar"], ["Telegram", "Telegram"], ["Novedad", "New"]],
    es: { t: "El Radar, ahora en Telegram",
      b: `<p>Estrenamos el canal <a href="https://t.me/SolFlagRadar" target="_blank" rel="noopener">t.me/SolFlagRadar</a>. Avisa cuando <b>una cara conocida</b>, una wallet que ya lanzó otros tokens, saca uno nuevo con liquidez.</p>
  <p>A las 24 horas, el propio canal contesta a cada aviso con lo que pasó: si el token sigue vivo o murió. Y a las 21:00 publica el resumen del día, con cuántos de los avisados murieron. Son hechos de la cadena, no acusaciones.</p>` },
    en: { t: "The Radar, now on Telegram",
      b: `<p>We launch the <a href="https://t.me/SolFlagRadar" target="_blank" rel="noopener">t.me/SolFlagRadar</a> channel. It alerts when <b>a known face</b>, a wallet that already launched other tokens, launches a new one with liquidity.</p>
  <p>After 24 hours the channel replies to each alert with what happened: whether the token is still alive or died. And at 21:00 it posts the day's summary, with how many of the alerted tokens died. Facts from the chain, not accusations.</p>` } },

  { id: "aviso-regulador", d: "2026-11-16", tags: [["Dónde cotiza", "Where it trades"], ["Arreglo", "Fix"]],
    es: { t: "Dónde cotiza: el aviso del regulador, bien visible",
      b: `<p>En «Dónde cotiza», la etiqueta roja que avisa de que un regulador ha alertado sobre un exchange (por ejemplo, «AVISO AFM» en MEXC) se veía como una bola cortada. Ahora sale como una etiqueta normal, que se lee entera.</p>` },
    en: { t: "Where it trades: the regulator warning, clearly visible",
      b: `<p>In «Where it trades», the red label that says a regulator has warned about an exchange (for example, «AFM WARNING» on MEXC) looked like a cut-off ball. It now shows as a normal label you can read in full.</p>` } }
];

const MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MESC = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONC = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fecha = (d, en, corta) => { const [y, m, dd] = d.split("-").map(Number); return en ? `${dd} ${(corta ? MONC : MON)[m - 1]} ${y}` : corta ? `${dd} ${MESC[m - 1]} ${y}` : `${dd} de ${MES[m - 1]} de ${y}`; };

function aplicar(file, en) {
  let h = fs.readFileSync(file, "utf8");
  if (h.includes(`id="${E[0].id}"`)) { console.log(file, ": ya estaban"); return; }
  const L = en ? "en" : "es", url = en ? "https://solflag.com/en/blog/" : "https://solflag.com/blog/";
  const idx = E.map((e) => `    <a href="#${e.id}"><time datetime="${e.d}">${fecha(e.d, en, true)}</time><b>${e[L].t}</b></a>\n`).join("");
  const art = E.map((e) => `<article id="${e.id}">
  <time datetime="${e.d}">${fecha(e.d, en)}</time>
  <h2>${e[L].t}</h2>
  <div class="tags">${e.tags.map((t) => `<span>${t[en ? 1 : 0]}</span>`).join("")}</div>
  ${e[L].b}
  <div class="share"><a href="https://x.com/intent/post?text=${encodeURIComponent("SolFlag: " + e[L].t)}&amp;url=${encodeURIComponent(url + "#" + e.id)}" target="_blank" rel="noopener">${en ? "Share on X" : "Compartir en X"}</a><a href="#${e.id}">${en ? "Link to this post" : "Enlace a esta entrada"}</a></div>
</article>

`).join("");
  const a = '    <a href="#grafica-grande">', b = '<article id="grafica-grande">';
  if (!h.includes(a) || !h.includes(b)) throw new Error(file + ": no encuentro la entrada del 15/11");
  h = h.replace(a, idx + a).replace(b, art + b);
  fs.writeFileSync(file, h);
  console.log(file, ": +", E.length, "entradas");
}
aplicar("blog/index.html", false);
aplicar("en/blog/index.html", true);
