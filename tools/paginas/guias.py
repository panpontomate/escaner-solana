# Genera las guías (/guias/<slug>/ y /en/guides/<slug>/) con el mismo aspecto que «Cómo funciona».
# Uso: python tools/paginas/guias.py   (desde la raíz del repo). Cada guía: textos es/en, preguntas frecuentes
# (van también como datos estructurados FAQPage para Google) y su dirección en las dos lenguas.
# Las cifras salen de «Cómo funciona» y del registro: si cambia una regla, cambiarla también aquí.
import json, os, re

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BASE = "https://solflag.com"

def plantilla():
    s = open(os.path.join(RAIZ, "como-funciona", "index.html"), encoding="utf-8").read()
    cabeza = s[: s.index("<title>")]
    estilo = s[s.index("<link href=\"/fonts/fonts.css\""): s.index("</head>")]
    cuerpo = s[s.index("<body>"): s.index("</header>") + len("</header>")]
    pie = s[s.index("<footer>"):]
    return cabeza, estilo, cuerpo, pie

def pagina(g, L, otra):
    cabeza, estilo, cuerpo, pie = plantilla()
    t = g[L]
    url = BASE + g["url"][L]
    alt_es, alt_en = BASE + g["url"]["es"], BASE + g["url"]["en"]
    faq = {"@context": "https://schema.org", "@graph": [
        {"@type": "Article", "headline": t["h1"], "description": t["desc"], "inLanguage": L, "url": url,
         "datePublished": g["fecha"], "dateModified": g["fecha"],
         "author": {"@type": "Organization", "name": "SolFlag", "url": BASE + "/"},
         "publisher": {"@type": "Organization", "name": "SolFlag", "logo": {"@type": "ImageObject", "url": BASE + "/marca/apple-touch-icon.png"}}},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub("<[^>]+>", "", a)}} for q, a in t["faq"]]}]}
    if not t["faq"]:   # la página que reúne las guías: sin preguntas, es una colección
        faq = {"@context": "https://schema.org", "@type": "CollectionPage", "name": t["h1"], "description": t["desc"], "inLanguage": L, "url": url}
    h = cabeza
    h += "<title>" + t["title"] + "</title>\n"
    h += '<meta name="description" content="' + t["desc"] + '">\n'
    h += '<meta property="og:title" content="' + t["title"] + '">\n<meta property="og:description" content="' + t["desc"] + '">\n'
    h += '<meta property="og:url" content="' + url + '">\n<meta property="og:image" content="' + BASE + ("/og-en.png" if L == "en" else "/og.png") + '?v=2">\n'
    h += '<meta property="og:type" content="article">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:site" content="@solflagTeam">\n'
    h += '<link rel="canonical" href="' + url + '">\n'
    h += '<link rel="alternate" hreflang="es" href="' + alt_es + '">\n<link rel="alternate" hreflang="en" href="' + alt_en + '">\n<link rel="alternate" hreflang="x-default" href="' + alt_en + '">\n'
    h += '<script type="application/ld+json">' + json.dumps(faq, ensure_ascii=False) + "</script>\n"
    h += '<script data-goatcounter="https://solflag.goatcounter.com/count" async src="/count.js"></script>\n'
    h += estilo + GUIA_CSS + "</head>\n"
    c = cuerpo
    if L == "en":
        c = c.replace('href="/?v=escaner">Escáner', 'href="/en/?v=escaner">Scanner').replace('href="/?v=lista">Mi lista', 'href="/en/?v=lista">My list')
        c = c.replace('href="/?v=confluencia">Confluencia', 'href="/en/?v=confluencia">Confluence').replace('href="/acciones/">Acciones', 'href="/en/stocks/">Stocks')
        c = c.replace("Bot de Telegram", "Telegram bot").replace('aria-label="Secciones"', 'aria-label="Sections"').replace('href="/" title="SolFlag"', 'href="/en/" title="SolFlag"')
    c = re.sub(r'<a class="plang"[^>]*>[^<]*</a>', '<a class="plang" href="' + otra + '" hreflang="' + ("es" if L == "en" else "en") + '" title="' + ("Versión en español" if L == "en" else "English version") + '">' + ("ES" if L == "en" else "EN") + "</a>", c)
    h += c.replace('<html lang="es">', '<html lang="' + L + '">') + "\n"
    h += '<section class="intro"><p class="kick">' + t["kick"] + "</p><h1>" + t["h1"] + "</h1>" + t["intro"] + "</section>\n"
    h += t["cuerpo"]
    h += '<article><h2>' + t["faqT"] + "</h2>" + "".join("<h3>" + q + "</h3><p>" + a + "</p>" for q, a in t["faq"]) + "</article>\n"
    p = pie
    if L == "en":
        for a, b in [('href="/">Escáner', 'href="/en/">Scanner'), ('href="/acciones/">Acciones', 'href="/en/stocks/">Stocks'), ('href="/blog/">Blog', 'href="/en/blog/">Blog'),
                     ('href="/acierto/">Datos y acierto', 'href="/en/accuracy/">Data and accuracy'), ('href="/como-funciona/">Cómo funciona', 'href="/en/how-it-works/">How it works'),
                     ('href="/guias/">Guías', 'href="/en/guides/">Guides'), ('href="/privacidad/">Privacidad', 'href="/en/privacy/">Privacy'), ('href="/terminos/">Términos', 'href="/en/terms/">Terms'),
                     (">Código abierto<", ">Open source<"), ("SolFlag es una herramienta orientativa, no consejo financiero.", "SolFlag is a guidance tool, not financial advice.")]:
            p = p.replace(a, b)
    h += p
    if L == "en": h = h.replace('<html lang="es">', '<html lang="en">')
    return h

GUIA_CSS = """<style>
/* Guías (15/11): mismo aspecto que «Cómo funciona»; pasos numerados y una llamada al escáner al final */
.paso{display:flex;gap:14px;align-items:baseline}.paso span{flex:none;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:rgba(122,184,196,.16);color:var(--kick);font-weight:800}
.cta{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:8px}
.cta a.go{display:inline-flex;align-items:center;min-height:46px;padding:0 20px;border-radius:14px;background:var(--accent);color:#140e31;font-weight:800;text-decoration:none}
.stats4{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:22px 0 0}
.stats4 div{border:1px solid var(--line);border-radius:16px;padding:14px 16px}.stats4 b{display:block;font:700 1.7rem/1.1 Fraunces,Georgia,serif;color:#f7f4ff}.stats4 span{color:var(--muted);font-size:.88rem}
@media (max-width:620px){.stats4{grid-template-columns:1fr}}
</style>
"""

G1 = {
  "fecha": "2026-11-15",
  "url": {"es": "/guias/token-solana-seguro/", "en": "/en/guides/is-a-solana-token-safe/"},
  "es": {
    "title": "Cómo saber si un token de Solana es seguro antes de comprarlo · SolFlag",
    "desc": "Cinco comprobaciones antes de comprar un token de Solana: quién lo controla, quién lo tiene, si puedes vender, quién está detrás y de quién depende. Con datos de miles de lanzamientos.",
    "kick": "Guía", "h1": "Cómo saber si un token de Solana es seguro antes de comprarlo",
    "intro": """<p>En Solana se lanzan miles de tokens al día y casi todos acaban mal. Antes de comprar, hay cinco cosas que se pueden comprobar en la cadena. Ninguna dice si un token va a subir; dicen si alguien puede quitarte el dinero.</p>
<div class="stats4"><div><b>99 %</b><span>de los tokens nuevos muere en su primera semana (registro de SolFlag)</span></div><div><b>86 %</b><span>nunca llega a 10.000 $ de capitalización</span></div><div><b>&lt; 2 de 100</b><span>tokens de Pump.fun llegan a graduar</span></div></div>""",
    "cuerpo": """<article><div class="paso"><span>1</span><h2>¿Alguien puede cambiar las reglas?</h2></div>
<p>Lo primero es saber si alguien puede tocar el token después de que compres. Se lee directamente en la cuenta del token (en Solscan, «Mint Authority» y «Freeze Authority»).</p>
<ul><li><b>Puede crear más tokens</b> (la clave de emisión sigue activa y es de una persona): puede diluir tu parte a cero en un segundo.</li>
<li><b>Puede congelar</b> (la clave de congelar está activa): puede dejarte sin poder vender. Los dólares digitales la llevan por ley; en una memecoin, no tiene sentido.</li>
<li><b>Cobra al moverlo</b> o tiene extensiones de Token-2022 que cambian lo que puedes hacer con tu saldo (gancho al mover, nace congelado, no transferible).</li></ul>
<p class="nota">Si la clave de emisión está activa y es de una persona, no hace falta mirar más: esa persona decide cuánto vale lo tuyo.</p></article>

<article><div class="paso"><span>2</span><h2>¿Quién lo tiene?</h2></div>
<p>Mira cuánto tienen las mayores wallets. Una sola persona con mucho puede hundir el precio con una venta.</p>
<ul><li><b>Preocupante:</b> una sola wallet con más del 15 % o las 10 mayores con más del 50 %.</li>
<li><b>Muy concentrado:</b> una wallet con más del 30 % o las 10 mayores con más del 70 %.</li></ul>
<p>Antes de contar, sigue cada cuenta grande hasta su dueño: un pool de liquidez, un programa o un exchange no es una persona que vaya a vender. Y fíjate en si varias de las grandes recibieron el SOL de la misma wallet: puede ser una sola persona repartida para parecer más descentralizada de lo que es.</p></article>

<article><div class="paso"><span>3</span><h2>¿Podrás vender?</h2></div>
<p>Que haya un precio no basta: hace falta dinero real al otro lado para poder salir.</p>
<ul><li><b>Poca liquidez:</b> por debajo de 50.000 $ ya es delicado, y por debajo de 10.000 $ vender una cantidad normal mueve mucho el precio.</li>
<li><b>Liquidez inflada:</b> si el lado real del pool (SOL, USDC o USDT) es menos del 5 % de lo que se anuncia. Vimos un token que anunciaba 12,9 M$ con 52 $ reales detrás.</li>
<li><b>Liquidez sin bloquear</b> en un mercado de menos de 90 días: el creador puede llevarse el dinero del pool.</li>
<li><b>Volumen inflado:</b> si el 80 % o más del volumen es de wallets que compran y venden lo mismo, el movimiento es de mentira.</li></ul></article>

<article><div class="paso"><span>4</span><h2>¿Quién está detrás?</h2></div>
<p>Un solo token no enseña mucho; lo que hizo antes quien lo lanzó, sí.</p>
<ul><li><b>Lanzamientos en serie:</b> quien pagó su creación lanzó 2 o más tokens en 24 horas. En 100 tokens de Pump.fun, una wallet lanzó 7 copias del mismo nombre en 10 minutos.</li>
<li><b>Historial:</b> de sus tokens anteriores, cuántos no despegaron. Si el 80 % de 3 o más no llegó a nada, este probablemente tampoco.</li>
<li><b>Copias:</b> el mismo símbolo que un token famoso (USDC, SOL…) con otra dirección, o el mismo nombre que otro más antiguo con más mercado. Comprueba siempre la dirección, no el nombre.</li></ul></article>

<article><div class="paso"><span>5</span><h2>¿De quién depende?</h2></div>
<p>Algunos tokens valen lo que vale la promesa de alguien: el dólar de Circle, la acción que custodia un emisor o el puente que guarda el original. No es malo, pero conviene saberlo: si el emisor o el puente fallan, el token también. Comprueba que la dirección es la que publica el emisor en su web oficial, nunca la de un agregador.</p>
<p class="nota">Si sigue en la curva de Pump.fun: en nuestro registro (8.767 tokens) menos de 2 de cada 100 llegan a graduar y, de los que gradúan, 9 de cada 10 mueren en un día. Graduar no es ir bien.</p></article>

<article><h2>Hazlo en diez segundos</h2>
<p>SolFlag comprueba todo esto por ti: pegas la dirección y te dice qué ha encontrado, con números y el motivo de cada aviso. Es gratis, sin registro y sin conectar tu wallet. Cada regla, con su cifra y su porqué, está en <a href="/como-funciona/">Cómo funciona</a>, y cómo acierta, con los fallos incluidos, en <a href="/acierto/">Datos y acierto</a>.</p>
<div class="cta"><a class="go" href="/?v=escaner">Comprobar un token →</a><a href="/como-funciona/">Cómo se decide el nivel</a></div></article>
""",
    "faqT": "Preguntas frecuentes",
    "faq": [
      ("¿Un token en verde es seguro?", "No hay garantías. En SolFlag, verde quiere decir que los chequeos no encontraron ninguna alerta y que el token tiene 7 días o más de mercado. Un token en verde puede caer y uno en rojo puede subir: lo que dice el nivel es si hay señales de que alguien pueda quitarte el dinero."),
      ("¿Bloquear la liquidez hace seguro un token?", "Ayuda, pero no basta. Con la liquidez bloqueada el creador no puede vaciar el pool, pero sí puede tener casi todo el supply, crear más tokens si la clave de emisión sigue activa o lanzar otro igual al día siguiente."),
      ("¿Cómo sé que es la dirección buena?", "Copia la dirección desde la web o las redes oficiales del proyecto, nunca desde un buscador de tokens por el nombre. Hay copias con el mismo nombre y el mismo símbolo; lo único que no se puede copiar es la dirección."),
      ("¿Esto es consejo financiero?", "No. SolFlag es una herramienta orientativa que explica lo que se ve en la cadena; no recomienda comprar ni vender nada.")],
  },
  "en": {
    "title": "How to check if a Solana token is safe before you buy · SolFlag",
    "desc": "Five checks before buying a Solana token: who controls it, who holds it, whether you can sell, who is behind it and what it depends on. With data from thousands of launches.",
    "kick": "Guide", "h1": "How to check if a Solana token is safe before you buy",
    "intro": """<p>Thousands of tokens launch on Solana every day and almost all of them end badly. Before you buy, there are five things you can check on-chain. None of them tells you whether a token will go up; they tell you whether someone can take your money.</p>
<div class="stats4"><div><b>99%</b><span>of new tokens die in their first week (SolFlag registry)</span></div><div><b>86%</b><span>never reach a $10,000 market cap</span></div><div><b>&lt; 2 in 100</b><span>Pump.fun tokens ever graduate</span></div></div>""",
    "cuerpo": """<article><div class="paso"><span>1</span><h2>Can someone change the rules?</h2></div>
<p>First, find out whether anyone can touch the token after you buy. It is written in the token's account (on Solscan, «Mint Authority» and «Freeze Authority»).</p>
<ul><li><b>They can mint more</b> (the mint authority is still active and belongs to a person): they can dilute your share to zero in a second.</li>
<li><b>They can freeze</b> (the freeze authority is active): they can stop you from selling. Digital dollars carry it by law; in a memecoin it makes no sense.</li>
<li><b>It charges a fee to move</b> or has Token-2022 extensions that change what you can do with your balance (transfer hook, frozen by default, non-transferable).</li></ul>
<p class="nota">If the mint authority is active and belongs to a person, you don't need to look any further: that person decides what yours is worth.</p></article>

<article><div class="paso"><span>2</span><h2>Who holds it?</h2></div>
<p>Look at how much the largest wallets hold. One person with a lot can crash the price with a single sale.</p>
<ul><li><b>Worrying:</b> a single wallet with more than 15% or the top 10 with more than 50%.</li>
<li><b>Very concentrated:</b> a single wallet with more than 30% or the top 10 with more than 70%.</li></ul>
<p>Before counting, trace every big account to its owner: a liquidity pool, a program or an exchange is not a person about to sell. And check whether several of the big ones got their SOL from the same wallet: it may be one person split up to look more decentralised than it is.</p></article>

<article><div class="paso"><span>3</span><h2>Will you be able to sell?</h2></div>
<p>A price is not enough: there has to be real money on the other side so you can get out.</p>
<ul><li><b>Low liquidity:</b> under $50,000 is already delicate, and under $10,000 selling a normal amount moves the price a lot.</li>
<li><b>Inflated liquidity:</b> when the real side of the pool (SOL, USDC or USDT) is less than 5% of what is shown. We saw a token showing $12.9M with $52 of real money behind it.</li>
<li><b>Unlocked liquidity</b> in a market younger than 90 days: the creator can take the money out of the pool.</li>
<li><b>Inflated volume:</b> when 80% or more of the volume comes from wallets that buy and sell the same amounts, the activity is fake.</li></ul></article>

<article><div class="paso"><span>4</span><h2>Who is behind it?</h2></div>
<p>One token doesn't show much; what its launcher did before does.</p>
<ul><li><b>Serial launches:</b> whoever paid for its creation launched 2 or more tokens in 24 hours. In 100 Pump.fun tokens, one wallet launched 7 copies of the same name in 10 minutes.</li>
<li><b>Track record:</b> how many of their previous tokens never took off. If 80% of 3 or more went nowhere, this one probably won't either.</li>
<li><b>Copies:</b> the same ticker as a famous token (USDC, SOL…) with a different address, or the same name as an older one with a bigger market. Always check the address, not the name.</li></ul></article>

<article><div class="paso"><span>5</span><h2>What does it depend on?</h2></div>
<p>Some tokens are worth what someone's promise is worth: Circle's dollar, the share an issuer holds in custody or the bridge that keeps the original. That's not bad, but you should know it: if the issuer or the bridge fails, so does the token. Check that the address is the one the issuer publishes on its official site, never one from an aggregator.</p>
<p class="nota">If it is still on the Pump.fun curve: in our registry (8,767 tokens) fewer than 2 in 100 graduate and, of those that do, 9 in 10 die within a day. Graduating is not doing well.</p></article>

<article><h2>Do it in ten seconds</h2>
<p>SolFlag checks all of this for you: paste the address and it tells you what it found, with numbers and the reason for every warning. Free, no sign-up and no wallet connection. Every rule, with its threshold and why, is in <a href="/en/how-it-works/">How it works</a>, and how often it gets it right, mistakes included, in <a href="/en/accuracy/">Data and accuracy</a>.</p>
<div class="cta"><a class="go" href="/en/?v=escaner">Check a token →</a><a href="/en/how-it-works/">How the level is decided</a></div></article>
""",
    "faqT": "Frequently asked questions",
    "faq": [
      ("Is a green token safe?", "There are no guarantees. On SolFlag, green means the checks found no warning and the token has 7 days or more of market. A green token can fall and a red one can rise: the level tells you whether there are signs that someone could take your money."),
      ("Does locked liquidity make a token safe?", "It helps, but it isn't enough. With locked liquidity the creator can't empty the pool, but they can still hold almost all of the supply, mint more if the mint authority is still active, or launch an identical token tomorrow."),
      ("How do I know it is the right address?", "Copy the address from the project's official website or socials, never from a token search by name. There are copies with the same name and the same ticker; the only thing that can't be copied is the address."),
      ("Is this financial advice?", "No. SolFlag is a guidance tool that explains what can be seen on-chain; it doesn't recommend buying or selling anything.")],
  },
}

G2 = {
  "fecha": "2026-11-15",
  "url": {"es": "/guias/quien-tiene-un-token-solana/", "en": "/en/guides/who-holds-a-solana-token/"},
  "es": {
    "title": "Cómo ver quién tiene un token de Solana (y si las ballenas son de verdad) · SolFlag",
    "desc": "Cómo saber quién tiene un token de Solana: las mayores cuentas, a quién pertenecen, qué es un pool o un exchange y cómo ver si varias ballenas son la misma persona.",
    "kick": "Guía", "h1": "Cómo ver quién tiene un token de Solana",
    "intro": """<p>La lista de mayores holders de un explorador engaña: muchas de esas cuentas no son personas. Un pool de liquidez, un programa o un exchange aparecen arriba sin ser ballenas, y una sola persona puede esconderse repartida en varias wallets. Así se separa una cosa de otra.</p>""",
    "cuerpo": """<article><div class="paso"><span>1</span><h2>Mira las mayores cuentas, no el nombre</h2></div>
<p>En Solscan, la pestaña «Holders» del token enseña las cuentas con más saldo. Cuidado: cada línea es una <b>cuenta de token</b>, no una wallet. Hay que mirar su dueño («Owner») para saber de quién es.</p>
<p>Las 20 mayores bastan para ver el reparto: si ahí no hay nadie con mucho, el resto tampoco lo tiene.</p></article>

<article><div class="paso"><span>2</span><h2>Separa lo que no es una persona</h2></div>
<ul><li><b>Pools de liquidez y programas</b> (Raydium, Meteora, Orca, la curva de Pump.fun…): guardan los tokens del mercado, no van a vender por su cuenta.</li>
<li><b>Exchanges con nombre:</b> es el dinero de sus usuarios. Se enseñan, pero no cuentan como ballena.</li>
<li><b>Cuentas muy activas</b> (cientos de movimientos en pocas horas): suelen ser bots, exchanges o creadores de mercado. No se esconden si tienen mucho: tener el 10 % o más ya es un riesgo, sea quien sea.</li>
<li><b>Creadores de mercado con nombre</b> (Wintermute, DWF Labs, con dirección publicada): sí cuentan, porque pueden vender mucho de golpe.</li></ul></article>

<article><div class="paso"><span>3</span><h2>Cuánto es demasiado</h2></div>
<p>Con lo que queda (las que parecen personas):</p>
<ul><li><b>Preocupante:</b> una sola wallet con más del 15 % o las 10 mayores con más del 50 %.</li>
<li><b>Muy concentrado:</b> una sola wallet con más del 30 % o las 10 mayores con más del 70 %.</li></ul>
<p>Un ejemplo real del 15/11: en $STONK, 16 de las 20 mayores cuentas parecen personas y suman el 24,5 % del supply; la mayor tiene el 5,4 %. Está repartido.</p>
<p class="nota">En dólares digitales y tokens de acciones las grandes wallets son la tesorería del emisor, custodios y exchanges: PYUSD tenía el 56 % en una sola y es normal.</p></article>

<article><div class="paso"><span>4</span><h2>¿Varias ballenas son la misma persona?</h2></div>
<p>Una forma de parecer más repartido de lo que es: una persona crea varias wallets nuevas y les manda SOL desde la misma. Para verlo, mira quién pagó la <b>primera transacción</b> de cada una de las grandes. Si varias comparten ese origen, pueden ser la misma persona o el mismo equipo.</p>
<p>Es una pista, no una prueba: si el origen es un exchange o una cuenta con mucho movimiento, de ahí recibe dinero mucha gente sin relación entre sí, y no cuenta.</p></article>

<article><div class="paso"><span>5</span><h2>Mira quién compró al nacer</h2></div>
<p>Hay wallets que compran en los primeros bloques de muchos lanzamientos. Están en el 84 % de los lanzamientos, así que tenerlas no dice nada del token. Lo que importa es si <b>siguen teniendo tokens para vender</b>: eso se ve si aparecen entre las mayores.</p></article>

<article><h2>Todo esto, en un clic</h2>
<p>En SolFlag, el apartado <b>Ballenas</b> de cada token hace estos pasos por ti: separa pools, programas y exchanges, marca las cuentas muy activas, agrupa las wallets que comparten financiador y te dice qué parte del supply tienen las personas. Gratis y sin conectar tu wallet.</p>
<div class="cta"><a class="go" href="/?v=escaner">Ver las ballenas de un token →</a><a href="/como-funciona/">Cómo funciona</a></div></article>
""",
    "faqT": "Preguntas frecuentes",
    "faq": [
      ("¿Por qué el mayor holder suele ser un pool?", "Porque el pool de liquidez guarda los tokens que se compran y se venden en ese mercado. No es una persona y no va a vender por su cuenta, por eso no cuenta como ballena."),
      ("¿Una wallet con mucho siempre es mala señal?", "No siempre: puede ser un exchange, un custodio o la tesorería de un emisor. Pero en una memecoin, una persona con más del 30 % puede hundir el precio con una sola venta."),
      ("¿Cómo sé si varias wallets son de la misma persona?", "Mira quién les dio el primer SOL. Si varias de las mayores lo recibieron de la misma wallet, probablemente son del mismo dueño o equipo. Es una pista que conviene comprobar en Solscan antes de sacar conclusiones."),
      ("¿Esto es consejo financiero?", "No. SolFlag explica lo que se ve en la cadena; no recomienda comprar ni vender.")],
  },
  "en": {
    "title": "How to see who holds a Solana token (and whether the whales are real) · SolFlag",
    "desc": "How to find out who holds a Solana token: the largest accounts, who owns them, what a pool or an exchange is, and how to tell whether several whales are the same person.",
    "kick": "Guide", "h1": "How to see who holds a Solana token",
    "intro": """<p>An explorer's top holders list is misleading: many of those accounts aren't people. A liquidity pool, a program or an exchange show up at the top without being whales, and one person can hide split across several wallets. Here is how to tell them apart.</p>""",
    "cuerpo": """<article><div class="paso"><span>1</span><h2>Look at the largest accounts, not the name</h2></div>
<p>On Solscan, the token's «Holders» tab lists the accounts with the biggest balances. Careful: each line is a <b>token account</b>, not a wallet. You have to look at its «Owner» to know whose it is.</p>
<p>The top 20 are enough to see the split: if nobody there holds a lot, nobody further down does either.</p></article>

<article><div class="paso"><span>2</span><h2>Separate what isn't a person</h2></div>
<ul><li><b>Liquidity pools and programs</b> (Raydium, Meteora, Orca, the Pump.fun curve…): they hold the market's tokens and won't sell on their own.</li>
<li><b>Named exchanges:</b> it is their users' money. Shown, but not counted as whales.</li>
<li><b>Very active accounts</b> (hundreds of moves in a few hours): usually bots, exchanges or market makers. They aren't hidden if they hold a lot: holding 10% or more is already a risk, whoever it is.</li>
<li><b>Named market makers</b> (Wintermute, DWF Labs, with a published address): they do count, because they can sell a lot at once.</li></ul></article>

<article><div class="paso"><span>3</span><h2>How much is too much</h2></div>
<p>With what's left (the ones that look like people):</p>
<ul><li><b>Worrying:</b> a single wallet with more than 15% or the top 10 with more than 50%.</li>
<li><b>Very concentrated:</b> a single wallet with more than 30% or the top 10 with more than 70%.</li></ul>
<p>A real example from 15 Nov: in $STONK, 16 of the 20 largest accounts look like people and hold 24.5% of the supply; the largest has 5.4%. It is spread out.</p>
<p class="nota">In digital dollars and tokenized stocks the big wallets are the issuer's treasury, custodians and exchanges: PYUSD had 56% in a single one and that is normal.</p></article>

<article><div class="paso"><span>4</span><h2>Are several whales the same person?</h2></div>
<p>One way to look more spread out than it is: a person creates several new wallets and sends them SOL from the same one. To spot it, check who paid for the <b>first transaction</b> of each big wallet. If several share that origin, they may be the same person or team.</p>
<p>It is a hint, not proof: if the origin is an exchange or a very busy account, lots of unrelated people get money from there, and it doesn't count.</p></article>

<article><div class="paso"><span>5</span><h2>Check who bought at launch</h2></div>
<p>Some wallets buy in the first blocks of many launches. They are in 84% of launches, so having them says nothing about the token. What matters is whether they <b>still hold tokens to sell</b>: you see that if they show up among the largest holders.</p></article>

<article><h2>All of this, in one click</h2>
<p>On SolFlag, every token's <b>Whales</b> section does these steps for you: it separates pools, programs and exchanges, flags very active accounts, groups wallets that share a funder and tells you how much of the supply people hold. Free and without connecting your wallet.</p>
<div class="cta"><a class="go" href="/en/?v=escaner">See a token's whales →</a><a href="/en/how-it-works/">How it works</a></div></article>
""",
    "faqT": "Frequently asked questions",
    "faq": [
      ("Why is the top holder usually a pool?", "Because the liquidity pool holds the tokens that are bought and sold in that market. It isn't a person and won't sell on its own, so it doesn't count as a whale."),
      ("Is a wallet with a lot always a bad sign?", "Not always: it can be an exchange, a custodian or an issuer's treasury. But in a memecoin, one person with more than 30% can crash the price with a single sale."),
      ("How do I know if several wallets belong to the same person?", "Check who gave them their first SOL. If several of the largest received it from the same wallet, they probably share an owner or team. It is a hint worth checking on Solscan before drawing conclusions."),
      ("Is this financial advice?", "No. SolFlag explains what can be seen on-chain; it doesn't recommend buying or selling.")],
  },
}

G3 = {
  "fecha": "2026-11-15",
  "url": {"es": "/guias/rug-pull-solana/", "en": "/en/guides/solana-rug-pull/"},
  "es": {
    "title": "Qué es un rug pull en Solana y cómo detectarlo antes de comprar · SolFlag",
    "desc": "Las formas más comunes de rug pull en Solana (sacar la liquidez, crear más tokens, vender todo, congelar, lanzar en serie) y la señal que deja cada una antes de que pase.",
    "kick": "Guía", "h1": "Qué es un rug pull en Solana y cómo detectarlo",
    "intro": """<p>Un <i>rug pull</i> («tirar de la alfombra») es cuando quien está detrás de un token se lleva el dinero y deja a los compradores con algo que ya no vale nada. Casi todos dejan una señal en la cadena antes de pasar. Estas son las formas más comunes y cómo verlas.</p>""",
    "cuerpo": """<article><div class="paso"><span>1</span><h2>Se lleva la liquidez</h2></div>
<p>El creador pone el dinero del pool y, cuando ha entrado gente, lo retira. Sin liquidez nadie puede vender.</p>
<p><b>La señal:</b> la liquidez no está bloqueada ni quemada en un mercado de pocos días. En SolFlag sale en ámbar por debajo del 60 % bloqueado y en rojo por debajo del 20 %, en mercados de menos de 90 días.</p></article>

<article><div class="paso"><span>2</span><h2>Crea más tokens y los vende</h2></div>
<p>Si la clave de emisión sigue activa, el creador puede fabricar millones de tokens nuevos de la nada y venderlos contra el pool.</p>
<p><b>La señal:</b> «Mint Authority» activa y de una persona. Es de las más graves: no hace falta nada más para quitarte el dinero.</p></article>

<article><div class="paso"><span>3</span><h2>Vende lo que se guardó</h2></div>
<p>El creador o su grupo se quedan con buena parte del supply (a veces repartido en varias wallets para disimular) y venden de golpe cuando el precio sube.</p>
<p><b>La señal:</b> mucha concentración entre las mayores wallets de personas, o varias grandes financiadas desde la misma. Después, en la gráfica de SolFlag se marca cuándo vendió el creador y los compradores del lanzamiento.</p></article>

<article><div class="paso"><span>4</span><h2>Te congela para que no vendas</h2></div>
<p>Con la clave de congelar activa, pueden bloquear tu saldo: puedes comprar pero no vender. También pasa con comisiones al mover que se suben hasta el 100 %.</p>
<p><b>La señal:</b> «Freeze Authority» activa en una memecoin, o extensiones de Token-2022 como comisión al transferir o gancho al mover.</p></article>

<article><div class="paso"><span>5</span><h2>Lanza, abandona y vuelve a lanzar</h2></div>
<p>Es lo más común: granjas que lanzan decenas de tokens al día, cada uno con un creador nuevo, recogen lo que entra y pasan al siguiente. El 15/11 vimos una wallet con 48 lanzamientos en un día y otra con 388 en total, de los que 367 murieron en 24 horas.</p>
<p><b>La señal:</b> quien pagó la creación lanzó 2 o más tokens en 24 horas, o la mayoría de sus tokens anteriores no despegó. Como cambian de creador, hay que mirar quién pagó y quién le dio el primer SOL.</p></article>

<article><div class="paso"><span>6</span><h2>Finge un mercado que no existe</h2></div>
<p>Liquidez inflada (un pool que anuncia millones con unos pocos dólares reales detrás) o volumen hecho por las mismas wallets comprando y vendiendo para parecer que hay interés.</p>
<p><b>La señal:</b> el lado real del pool es menos del 5 % de lo anunciado, o el 80 % o más del volumen es de ida y vuelta.</p></article>

<article><h2>Antes de comprar, compruébalo</h2>
<p>SolFlag mira todas estas señales en cada token y te dice cuál encontró, con números. Un token con una de estas trampas sale en <b>rojo</b>. No decimos «estafa»: enseñamos los hechos y el motivo de cada aviso.</p>
<div class="cta"><a class="go" href="/?v=escaner">Comprobar un token →</a><a href="/guias/token-solana-seguro/">Guía: cómo saber si un token es seguro</a></div></article>
""",
    "faqT": "Preguntas frecuentes",
    "faq": [
      ("¿Se puede recuperar el dinero de un rug pull?", "Casi nunca. Las transacciones en Solana no se pueden deshacer y quien lo hace suele mover el dinero rápido. Por eso lo útil es mirar las señales antes de comprar."),
      ("¿Un token con la liquidez bloqueada no puede ser un rug pull?", "Sí puede: aunque no se pueda sacar la liquidez, el creador puede vender lo que se guardó, crear más tokens si la clave de emisión está activa o congelar saldos."),
      ("¿Todos los tokens que mueren son un rug pull?", "No. La mayoría de tokens nuevos mueren porque nadie los compra, sin trampa. Un rug pull es cuando alguien de dentro se lleva el dinero; las señales de esta guía son las que lo permiten."),
      ("¿Esto es consejo financiero?", "No. SolFlag es una herramienta orientativa: explica lo que se ve en la cadena y no recomienda comprar ni vender.")],
  },
  "en": {
    "title": "What a rug pull on Solana is and how to spot it before you buy · SolFlag",
    "desc": "The most common kinds of rug pull on Solana (pulling liquidity, minting more, dumping, freezing, serial launches) and the sign each one leaves before it happens.",
    "kick": "Guide", "h1": "What a rug pull on Solana is and how to spot it",
    "intro": """<p>A <i>rug pull</i> is when whoever is behind a token takes the money and leaves buyers holding something worthless. Almost all of them leave a sign on-chain before it happens. These are the most common kinds and how to see them.</p>""",
    "cuerpo": """<article><div class="paso"><span>1</span><h2>Pulling the liquidity</h2></div>
<p>The creator puts money into the pool and, once people have bought in, takes it out. Without liquidity nobody can sell.</p>
<p><b>The sign:</b> the liquidity isn't locked or burned in a market only days old. On SolFlag it shows amber below 60% locked and red below 20%, in markets younger than 90 days.</p></article>

<article><div class="paso"><span>2</span><h2>Minting more and selling it</h2></div>
<p>If the mint authority is still active, the creator can print millions of new tokens out of nothing and sell them into the pool.</p>
<p><b>The sign:</b> «Mint Authority» active and owned by a person. One of the most serious: nothing else is needed to take your money.</p></article>

<article><div class="paso"><span>3</span><h2>Dumping what they kept</h2></div>
<p>The creator or their group keep a big part of the supply (sometimes split across several wallets to hide it) and sell all at once when the price goes up.</p>
<p><b>The sign:</b> high concentration among the largest people wallets, or several big ones funded from the same wallet. Afterwards, SolFlag's chart marks when the creator and the launch buyers sold.</p></article>

<article><div class="paso"><span>4</span><h2>Freezing you so you can't sell</h2></div>
<p>With the freeze authority active they can lock your balance: you can buy but not sell. The same happens with transfer fees raised up to 100%.</p>
<p><b>The sign:</b> «Freeze Authority» active on a memecoin, or Token-2022 extensions like transfer fees or transfer hooks.</p></article>

<article><div class="paso"><span>5</span><h2>Launch, abandon, launch again</h2></div>
<p>The most common one: farms that launch dozens of tokens a day, each with a new creator, collect what comes in and move on to the next. On 15 Nov we saw one wallet with 48 launches in a day and another with 388 in total, 367 of which died within 24 hours.</p>
<p><b>The sign:</b> whoever paid for its creation launched 2 or more tokens in 24 hours, or most of their previous tokens went nowhere. Since they change creators, check who paid and who gave the creator their first SOL.</p></article>

<article><div class="paso"><span>6</span><h2>Faking a market that isn't there</h2></div>
<p>Inflated liquidity (a pool showing millions with a few real dollars behind it) or volume made by the same wallets buying and selling to fake interest.</p>
<p><b>The sign:</b> the real side of the pool is less than 5% of what is shown, or 80% or more of the volume is round trips.</p></article>

<article><h2>Check before you buy</h2>
<p>SolFlag looks for all these signs on every token and tells you which ones it found, with numbers. A token with one of these traps shows <b>red</b>. We don't say «scam»: we show the facts and the reason for every warning.</p>
<div class="cta"><a class="go" href="/en/?v=escaner">Check a token →</a><a href="/en/guides/is-a-solana-token-safe/">Guide: how to check if a token is safe</a></div></article>
""",
    "faqT": "Frequently asked questions",
    "faq": [
      ("Can you get money back from a rug pull?", "Almost never. Solana transactions can't be undone and whoever does it usually moves the money fast. That is why it pays to check the signs before buying."),
      ("Can a token with locked liquidity still be a rug pull?", "Yes: even if the liquidity can't be pulled, the creator can dump what they kept, mint more if the mint authority is active, or freeze balances."),
      ("Is every token that dies a rug pull?", "No. Most new tokens die because nobody buys them, with no trap involved. A rug pull is when an insider takes the money; the signs in this guide are what make it possible."),
      ("Is this financial advice?", "No. SolFlag is a guidance tool: it explains what can be seen on-chain and doesn't recommend buying or selling.")],
  },
}

GUIAS = [G1, G2, G3]

# Página que reúne las guías: /guias/ y /en/guides/
INDICE = {
  "url": {"es": "/guias/", "en": "/en/guides/"},
  "es": {"title": "Guías de Solana: tokens, ballenas y rug pulls · SolFlag", "desc": "Guías cortas y con datos para revisar un token de Solana antes de comprar: si es seguro, quién lo tiene y cómo se detecta un rug pull.", "kick": "Guías", "h1": "Guías para revisar un token de Solana", "p": "Cortas, con los números de miles de lanzamientos y sin humo."},
  "en": {"title": "Solana guides: tokens, whales and rug pulls · SolFlag", "desc": "Short, data-backed guides to check a Solana token before you buy: whether it is safe, who holds it and how to spot a rug pull.", "kick": "Guides", "h1": "Guides to check a Solana token", "p": "Short, with numbers from thousands of launches and no hype."},
}
def indice(L, otra):
    t = INDICE[L]
    lista = "".join('<article><h2><a href="' + x["url"][L] + '" style="color:inherit;text-decoration:none">' + x[L]["h1"] + "</a></h2><p>" + x[L]["desc"] + '</p><div class="cta"><a class="go" href="' + x["url"][L] + '">' + ("Leer la guía →" if L == "es" else "Read the guide →") + "</a></div></article>\n" for x in GUIAS)
    g = {"fecha": "2026-11-15", "url": INDICE["url"], L: {"title": t["title"], "desc": t["desc"], "kick": t["kick"], "h1": t["h1"], "intro": "<p>" + t["p"] + "</p>", "faqT": "", "faq": [], "cuerpo": lista}}
    return pagina(g, L, otra).replace("<article><h2></h2></article>\n", "")

if __name__ == "__main__":
    for g in GUIAS:
        for L in ("es", "en"):
            otra = g["url"]["en" if L == "es" else "es"]
            d = os.path.join(RAIZ, g["url"][L].strip("/").replace("/", os.sep))
            os.makedirs(d, exist_ok=True)
            open(os.path.join(d, "index.html"), "w", encoding="utf-8", newline="\n").write(pagina(g, L, otra))
            print("escrita", g["url"][L])
    for L in ("es", "en"):
        d = os.path.join(RAIZ, INDICE["url"][L].strip("/").replace("/", os.sep))
        os.makedirs(d, exist_ok=True)
        open(os.path.join(d, "index.html"), "w", encoding="utf-8", newline="\n").write(indice(L, INDICE["url"]["en" if L == "es" else "es"]))
        print("escrita", INDICE["url"][L])
