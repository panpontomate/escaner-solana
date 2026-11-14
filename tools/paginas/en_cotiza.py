# Genera en/markets/index.html (inglés) desde cotiza/index.html (la única fuente, en español).
# Uso: python tools/paginas/en_cotiza.py   (desde la raíz del repo). Falla si algún texto ya no aparece.
import re, sys
SRC, DST = "cotiza/index.html", "en/markets/index.html"
T = [
  ('<html lang="es">', '<html lang="en">'),
  ("<title>Dónde cotiza · SolFlag</title>", "<title>Where it trades · SolFlag</title>"),
  ('<meta name="description" content="Dónde se compra y se vende un token de Solana: en la cadena y en exchanges, lo que cuesta entrar y salir, si piden identidad y si tienen licencia MiCA.">',
   '<meta name="description" content="Where a Solana token is bought and sold: on-chain and on exchanges, what it costs to get in and out, whether they ask for ID and whether they hold a MiCA licence.">'),
  ('<link rel="alternate" hreflang="en" href="https://solflag.com/en/markets/">', '<link rel="alternate" hreflang="es" href="https://solflag.com/cotiza/">'),
  ('<a class="logo" href="/" title="SolFlag">', '<a class="logo" href="/en/" title="SolFlag">'),
  ('<nav class="pnav" aria-label="Secciones"><a href="/?v=escaner" aria-current="page">Escáner</a><a href="/?v=lista">Mi lista</a><a href="/?v=confluencia">Confluencia</a><a href="/acciones/">Acciones</a><a class="pbot" href="https://t.me/SolFlagBot" target="_blank" rel="noopener">Bot de Telegram</a></nav>',
   '<nav class="pnav" aria-label="Sections"><a href="/en/?v=escaner" aria-current="page">Scanner</a><a href="/en/?v=lista">My list</a><a href="/en/?v=confluencia">Confluence</a><a href="/en/stocks/">Stocks</a><a class="pbot" href="https://t.me/SolFlagBot" target="_blank" rel="noopener">Telegram bot</a></nav>'),
  ('<a class="plang" id="lang" href="/en/markets/" hreflang="en" title="English version">EN</a>', '<a class="plang" id="lang" href="/cotiza/" hreflang="es" title="Versión en español">ES</a>'),
  ('<a class="back" id="back" href="/">← Volver al análisis</a>', '<a class="back" id="back" href="/en/">← Back to the analysis</a>'),
  ('<p class="k">DÓNDE COTIZA · TODOS LOS SITIOS</p>', '<p class="k">WHERE IT TRADES · EVERY VENUE</p>'),
  ('<h1 id="tn">Cargando…</h1>', '<h1 id="tn">Loading…</h1>'),
  ('<div class="stop" id="stop" hidden><b>Riesgo alto:</b> no enlazamos sitios para comprarlo. Te enseñamos dónde se negocia y, sobre todo, lo que cuesta salir.</div>',
   '<div class="stop" id="stop" hidden><b>High risk:</b> we do not link to places to buy it. We show where it trades and, above all, what it costs to get out.</div>'),
  ('<b>Sin enlaces para comprar:</b> antes, analiza el token en el <a id="scanit" href="/">Escáner</a>. Desde su análisis verás aquí los enlaces directos.',
   '<b>No links to buy:</b> first, analyze the token in the <a id="scanit" href="/en/">Scanner</a>. From its analysis you will see the direct links here.'),
  ('<h2>Los mejores<span>para entrar y salir.</span></h2><p>Los tres más baratos de cada lado. En la cadena compras desde tu wallet; en un exchange, desde tu cuenta allí.</p>',
   '<h2>The best<span>to get in and out.</span></h2><p>The three cheapest on each side. On-chain you buy from your wallet; on an exchange, from your account there.</p>'),
  ('<span class="k" style="font-size:12px">EN LA CADENA</span><span class="tg no">NO PIDE IDENTIDAD</span>', '<span class="k" style="font-size:12px">ON-CHAIN</span><span class="tg no">NO ID NEEDED</span>'),
  ('<span class="k" style="font-size:12px">EN EXCHANGES</span><span class="tg">CON IDENTIDAD COMPROBADA</span>', '<span class="k" style="font-size:12px">ON EXCHANGES</span><span class="tg">ID RULES CHECKED</span>'),
  ('<p class="load">Cargando…</p>', '<p class="load">Loading…</p>'),
  ('<h2>MiCA<span>quién tiene licencia en la UE.</span></h2><p>MiCA es la ley europea de criptoactivos. Desde julio de 2026, como tarde, solo las empresas autorizadas pueden ofrecer estos servicios en la UE. Lo comprobamos en el <a id="esma" href="#" target="_blank" rel="noopener">registro oficial de la ESMA</a>.</p>',
   '<h2>MiCA<span>who is licensed in the EU.</span></h2><p>MiCA is the EU crypto-asset law. Since July 2026 at the latest, only authorised firms can offer these services in the EU. We check the <a id="esma" href="#" target="_blank" rel="noopener">official ESMA register</a>.</p>'),
  ('<h2>Todos los sitios<span>por grupos.</span></h2><p>Coste = diferencia entre precio de compra y de venta + lo que cobra el sitio al comprar y al vender. Identidad, según su propia ayuda: pulsa la etiqueta para verla.</p>',
   '<h2>Every venue<span>by group.</span></h2><p>Cost = bid-ask spread + what the venue charges to buy and to sell. ID rules come from its own help pages: tap the label to see them.</p>'),
  ('<button class="chip on" data-f="all">Todos</button><button class="chip" data-f="d">En la cadena</button><button class="chip" data-f="x">Exchanges</button>',
   '<button class="chip on" data-f="all">All</button><button class="chip" data-f="d">On-chain</button><button class="chip" data-f="x">Exchanges</button>'),
  ('<label><input type="checkbox" id="onlyMica"> Solo con licencia MiCA</label>', '<label><input type="checkbox" id="onlyMica"> MiCA licence only</label>'),
  ('<label><input type="checkbox" id="noId"> Sin identidad (o hasta un tope)</label>', '<label><input type="checkbox" id="noId"> No ID (or up to a limit)</label>'),
  ('<p class="fine"><b>Cómo se calcula.</b> En la cadena, la cotización de Jupiter ya incluye la comisión de cada pool; falta la de tu app. En un exchange: diferencia de su par más barato + comisión al comprar + comisión al vender, del nivel normal y sin descuentos por su token. No incluye lo que cobran por retirar a tu wallet. «Hasta un tope»: deja operar y retirar sin identidad hasta esa cantidad al día, según su web. Comisión, identidad y MiCA revisadas a mano el <span id="rev"></span>. El volumen lo declara cada exchange.</p>',
   '<p class="fine"><b>How it is worked out.</b> On-chain, the Jupiter quote already includes each pool fee; your app fee is not included. On an exchange: spread of its cheapest pair + fee to buy + fee to sell, at the standard tier and without token discounts. Withdrawal fees to your wallet are not included. «Up to a limit»: you can trade and withdraw without ID up to that amount per day, according to its website. Fees, ID and MiCA checked by hand on <span id="rev"></span>. Volume is self-reported by each exchange.</p>'),
  ('<p class="fine">Los botones «Ir» llevan directamente al par en cada sitio. SolFlag no cobra nada de ninguno y el orden nunca depende de eso. Es información, no una recomendación de compra. Pools: DexScreener · Exchanges: <a href="https://www.coingecko.com/" target="_blank" rel="noopener">Powered by CoinGecko</a></p>',
   '<p class="fine">The «Go» buttons take you straight to the pair on each venue. SolFlag is not paid by any of them and the order never depends on that. This is information, not a recommendation to buy. Pools: DexScreener · Exchanges: <a href="https://www.coingecko.com/" target="_blank" rel="noopener">Powered by CoinGecko</a></p>'),
  ("""  <a href="/">Escáner</a>
  <a href="/acciones/">Acciones</a>
  <a href="/blog/">Blog</a>
  <a href="/acierto/">Datos y acierto</a>
  <a href="/privacidad/">Privacidad</a>
  <a href="/terminos/">Términos</a>""", """  <a href="/en/">Scanner</a>
  <a href="/en/stocks/">Stocks</a>
  <a href="/en/accuracy/">Data and accuracy</a>
  <a href="/en/privacy/">Privacy</a>
  <a href="/en/terms/">Terms</a>"""),
  ("<p>Pools: DexScreener. Exchanges: CoinGecko. Coste en la cadena: Jupiter. SolFlag es una herramienta orientativa, no consejo financiero.</p>", "<p>Pools: DexScreener. Exchanges: CoinGecko. On-chain cost: Jupiter. SolFlag is a guidance tool, not financial advice.</p>"),
  # --- código: formatos y textos
  ('n.toLocaleString("es-ES",', 'n.toLocaleString("en-US",'),
  ('const money = (n) => fx(Math.round(n), 0) + " $";', 'const money = (n) => "$" + fx(Math.round(n), 0);'),
  ('const pct = (p) => fx(p, 2) + " %";', 'const pct = (p) => fx(p, 2) + "%";'),
  ('rel="noopener">Ir ↗</a>`', 'rel="noopener">Go ↗</a>`'),
  ("""'<span class="tg no">NO PIDE</span>'""", """'<span class="tg no">NONE</span>'"""),
  ('target="_blank" rel="noopener">OBLIGATORIA ↗</a>`', 'target="_blank" rel="noopener">REQUIRED ↗</a>`'),
  ('target="_blank" rel="noopener">HASTA UN TOPE ↗</a><small>sin ella: ${esc(x.lim || "")}</small>`', 'target="_blank" rel="noopener">UP TO A LIMIT ↗</a><small>without it: ${esc(x.lim || "")}</small>`'),
  ("""'<span class="tg">SIN COMPROBAR</span>'""", """'<span class="tg">NOT CHECKED</span>'"""),
  ('title="Aviso público del regulador">AVISO ${', 'title="Public warning from the regulator">WARNING ${'),
  ('document.title = "Dónde cotiza " + (t.sym', 'document.title = "Where it trades " + (t.sym'),
  ('$("addr").innerHTML = "La dirección buena: "', '$("addr").innerHTML = "The right address: "'),
  ('"Lo más barato y lo más privado: en la cadena." : "En la cadena, sin identidad."}</b> Comprar y vender 1.000 $ cuesta un ${pct(ROUTE)} y nadie te pide identidad.` : D.pools.length ? "<b>Se negocia en la cadena.</b> Comprar y vender ahí no pide identidad." : "<b>Sin mercado en la cadena.</b>";',
   '"Cheapest and most private: on-chain." : "On-chain, with no ID."}</b> Buying and selling $1,000 costs ${pct(ROUTE)} and nobody asks for ID.` : D.pools.length ? "<b>It trades on-chain.</b> Buying and selling there needs no ID." : "<b>No on-chain market.</b>";'),
  ('if (best) v += ` En los exchanges, lo más barato ronda el ${pct(best.cost)} (${esc(best.n)}).`;', 'if (best) v += ` On exchanges, the cheapest is about ${pct(best.cost)} (${esc(best.n)}).`;'),
  ('else if (D.cex && !D.cex.length) v += " No cotiza en ningún exchange centralizado.";', 'else if (D.cex && !D.cex.length) v += " It is not listed on any centralized exchange.";'),
  ('<span>En la cadena</span><em class="good">ida y vuelta · sin identidad</em>', '<span>On-chain</span><em class="good">round trip · no ID</em>'),
  ('<span>Pools</span><em>con 1.000 $ de liquidez o más</em>', '<span>Pools</span><em>with $1,000 of liquidity or more</em>'),
  ('<span>Exchanges</span><em>con 25.000 $ al día o más</em>', '<span>Exchanges</span><em>with $25,000 a day or more</em>'),
  ('<span>Sin identidad hasta un tope</span><em class="mid">los demás la piden</em>', '<span>No ID up to a limit</span><em class="mid">the rest ask for it</em>'),
  ('row(1, "Mejor ruta de Jupiter", "reparte tu compra entre todos los pools", ROUTE != null ? `<b class="${tone(ROUTE)}">${pct(ROUTE)}</b><small>ida y vuelta</small>` : "<small>sin ruta ahora</small>", "", D.ruta)',
   'row(1, "Best Jupiter route", "splits your trade across every pool", ROUTE != null ? `<b class="${tone(ROUTE)}">${pct(ROUTE)}</b><small>round trip</small>` : "<small>no route now</small>", "", D.ruta)'),
  ('esc(p.par) + " · el pool con más liquidez" + (i ? " tras el anterior" : ""), `<b>${money(p.liq)}</b><small>liquidez</small>`', 'esc(p.par) + (i ? " · next deepest pool" : " · deepest pool"), `<b>${money(p.liq)}</b><small>liquidity</small>`'),
  ("""'<p class="load">Sin pools con liquidez.</p>'""", """'<p class="load">No pools with liquidity.</p>'"""),
  ("""'<p class="load">No se pudo consultar ahora. Vuelve a probar en un rato.</p>' : !D.cex.length ? '<p class="load">No cotiza en ningún exchange centralizado.</p>' : !con.length ? '<p class="load">Cotiza en exchanges que aún no hemos revisado.</p>'""",
   """'<p class="load">Could not check right now. Try again in a while.</p>' : !D.cex.length ? '<p class="load">Not listed on any centralized exchange.</p>' : !con.length ? '<p class="load">Listed on exchanges we have not reviewed yet.</p>'"""),
  ('esc(x.par) + " · comisión " + (x.feeNote ? "hasta " : "") + pct(x.fee), `<b class="${tone(x.cost)}">~${pct(x.cost)}</b><small>ida y vuelta</small>`', 'esc(x.par) + " · fee " + (x.feeNote ? "up to " : "") + pct(x.fee), `<b class="${tone(x.cost)}">~${pct(x.cost)}</b><small>round trip</small>`'),
  ('"~" + pct(x.cost) + "<small>ida y vuelta</small>" : \'<span class="muted">comisión sin publicar</span>\'', '"~" + pct(x.cost) + "<small>round trip</small>" : \'<span class="muted">fee not published</span>\''),
  ('<p>${esc(x.mica[0])} · autoriza ${esc(x.mica[1])} · desde el ${esc(x.mica[2])}</p>', '<p>${esc(x.mica[0])} · licensed by ${esc(x.mica[1])} · since ${esc(x.mica[2])}</p>'),
  ("""'<p class="muted">Ninguno de los exchanges donde cotiza tiene licencia MiCA.</p>'""", """'<p class="muted">None of the exchanges where it trades holds a MiCA licence.</p>'"""),
  ('` (<a href="${esc(x.aviso[2])}" target="_blank" rel="noopener">aviso público de la ${esc(x.aviso[0])} del ${esc(x.aviso[1])}</a>)`', '` (<a href="${esc(x.aviso[2])}" target="_blank" rel="noopener">public warning from ${esc(x.aviso[0])} on ${esc(x.aviso[1])}</a>)`'),
  ('`<b>Sin licencia MiCA: ${no.length} ${no.length === 1 ? "exchange" : "exchanges"} de esta lista.</b><p>Entre ellos ${nom.join(", ")}. No estar en el registro no quiere decir que sean una estafa: quiere decir que no están autorizados para ofrecer servicios en la UE, y si algo sale mal no tienes la protección de la ley europea.</p>`',
   '`<b>No MiCA licence: ${no.length} ${no.length === 1 ? "exchange" : "exchanges"} on this list.</b><p>Among them ${nom.join(", ")}. Not being on the register does not mean they are a scam: it means they are not authorised to offer services in the EU, and if something goes wrong you do not have the protection of EU law.</p>`'),
  ('out.push({ grp: "En la cadena", sub: "desde tu wallet · no piden identidad" });', 'out.push({ grp: "On-chain", sub: "from your wallet · no ID" });'),
  ('grp("Exchanges", "del más barato al más caro", f(G.ok));', 'grp("Exchanges", "from cheapest to most expensive", f(G.ok));'),
  ('grp("Sin comisión publicada", "solo sabemos su diferencia de precio · por diferencia", f(G.sinfee));', 'grp("Fee not published", "we only know their spread · by spread", f(G.sinfee));'),
  ('grp("Locales", "solo en su moneda (lira turca, rupia…)", G.local); grp("Precio poco fiable", "diferencia de compra-venta de más del 1 %: su volumen no cuadra", G.dudoso);', 'grp("Local", "only in their own currency (Turkish lira, rupee…)", G.local); grp("Unreliable price", "bid-ask spread above 1%: their volume does not add up", G.dudoso);'),
  ('<b>Mejor ruta de Jupiter</b><small>reparte tu compra entre los pools de abajo</small>', '<b>Best Jupiter route</b><small>splits your trade across the pools below</small>'),
  ('<span class="r c4 muted">incluida</span><span class="c5"><span class="tg no">NO PIDE</span></span><span class="r num c6">—</span>', '<span class="r c4 muted">included</span><span class="c5"><span class="tg no">NONE</span></span><span class="r num c6">—</span>'),
  ('<small>de liquidez · en la ruta</small></span><span class="r c4 muted">incluida</span><span class="c5"><span class="tg no">NO PIDE</span></span>', '<small>liquidity · in the route</small></span><span class="r c4 muted">included</span><span class="c5"><span class="tg no">NONE</span></span>'),
  ('`<span class="r muted">dif. ${pct(r.sp)}<small>+ comisión ?</small></span>`', '`<span class="r muted">spread ${pct(r.sp)}<small>+ fee ?</small></span>`'),
  ("""'<div class="lr h"><span class="n">#</span><span>DÓNDE · PAR</span><span class="r">IDA Y VUELTA</span><span class="r c4">COMISIÓN</span><span class="c5">IDENTIDAD</span><span class="r c6">VOL. 24 H</span><span></span></div>'""",
   """'<div class="lr h"><span class="n">#</span><span>WHERE · PAIR</span><span class="r">ROUND TRIP</span><span class="r c4">FEE</span><span class="c5">ID</span><span class="r c6">24H VOL.</span><span></span></div>'"""),
  ("""'<p class="load">Nada con estos filtros.</p>'""", """'<p class="load">Nothing with these filters.</p>'"""),
  ('<button id="prev" ${page ? "" : "disabled"}>← Anterior</button>', '<button id="prev" ${page ? "" : "disabled"}>← Previous</button>'),
  ('${Math.min(to, items.length)} de ${items.length}</span><button id="next" ${page < pages - 1 ? "" : "disabled"}>Siguiente →</button>', '${Math.min(to, items.length)} of ${items.length}</span><button id="next" ${page < pages - 1 ? "" : "disabled"}>Next →</button>'),
  ('$("rev").textContent = D.revisado.split("-").reverse().join("/");', '$("rev").textContent = D.revisado;'),
  ('{ $("tn").textContent = "Falta el token"; $("verdict").innerHTML = \'Abre esta página desde el análisis de un token en el <a href="/">Escáner</a>.\'; }', '{ $("tn").textContent = "No token given"; $("verdict").innerHTML = \'Open this page from a token analysis in the <a href="/en/">Scanner</a>.\'; }'),
  ('$("back").href = "/?token=" + encodeURIComponent(MINT); $("lang").href = "/en/markets/?t="', '$("back").href = "/en/?token=" + encodeURIComponent(MINT); $("lang").href = "/cotiza/?t="'),
  ('.catch(() => { $("tn").textContent = "No se pudo cargar"; $("verdict").textContent = "Prueba a recargar en un momento."; });', '.catch(() => { $("tn").textContent = "Could not load"; $("verdict").textContent = "Try reloading in a moment."; });'),
  ("// cielo de estrellas detrás de toda la página (el mismo que Acciones)", "// starry sky behind the whole page (the same as Stocks)"),
]
s = open(SRC, encoding="utf-8").read()
falta = [a[:70] for a, b in T if a not in s]
if falta:
    sys.exit("No encuentro en cotiza/index.html:\n  " + "\n  ".join(falta))
for a, b in T: s = s.replace(a, b)
# texto que siga en español (fuera de comentarios /* */ y //)
cuerpo = re.sub(r"/\*[\s\S]*?\*/|//[^\n]*", "", s)
resto = sorted(set(m.group(0) for m in re.finditer(r"[^<>\"'`]*[áéíóúñ¿¡][^<>\"'`]*", cuerpo) if m.group(0).strip()))
import os; os.makedirs(os.path.dirname(DST), exist_ok=True)
open(DST, "w", encoding="utf-8", newline="").write(s)
print(DST, "escrito ·", len(T), "cambios")
for r in resto: print("  ¿sigue en español?", r.strip()[:90])
