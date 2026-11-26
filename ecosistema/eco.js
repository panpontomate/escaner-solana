// Página Ecosistema, la misma en es (/ecosistema/) y en (/en/ecosystem/): el idioma sale de <html lang>.
// Lee /datos/ecosistema.json (tools/ecosistema/datos.mjs, una vez al día) y pinta los apartados del Escáner
// con los 10 primeros de cada grupo, cada grupo con su medida. Maqueta aprobada el 20/11/2026.
(function () {
  const EN = document.documentElement.lang === "en";
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const dec = (n, d) => n.toFixed(d).replace(".", EN ? "." : ",");
  const fm = (n) => n == null ? "—" : EN
    ? (n >= 1e9 ? "$" + dec(n / 1e9, 1) + "B" : n >= 1e6 ? "$" + dec(n / 1e6, 1) + "M" : "$" + Math.round(n / 1e3) + "k")
    : (n >= 1e9 ? dec(n / 1e9, 1) + " B$" : n >= 1e6 ? dec(n / 1e6, 1) + " M$" : Math.round(n / 1e3) + " k$");
  const fp = (p) => "$" + (p >= 1 ? dec(p, 2) : p >= 0.01 ? dec(p, 4) : p.toPrecision(3).replace(".", EN ? "." : ","));
  const sp = EN ? "" : " ";
  const pc1 = (x) => x == null || Math.abs(x) < 0.0005 ? "" : (x > 0 ? "+" : "") + dec(x * 100, 1) + sp + "%";
  const pc = (x) => x == null ? "—" : (x > 0 ? "+" : "") + Math.round(x * 100) + sp + "%";
  const fk = (n) => n >= 1e6 ? dec(n / 1e6, 1) + (EN ? "M" : " M") : n >= 1e3 ? Math.round(n / 1e3) + (EN ? "k" : " k") : String(n);

  // Apartados (los del Escáner + «Apps y bots» y «Otros»): nombre interno (el de los datos), nombre y descripción
  const AP = EN ? [
    ["Meme", "Meme", "Solana memecoins, by market cap, and the launchpads where they are born (Pump, BONK.fun…), by the fees they charge."],
    ["Activos tokenizados", "Tokenized assets", "Stablecoins by money circulating on Solana; stocks, funds and credit by tokenized value."],
    ["DeFi", "DeFi", "DEXs, lending, staking, derivatives, bridges and the rest of Solana DeFi, measured by what they charge, what they keep and what reaches their token."],
    ["Juegos", "Games", "Games, collectible cards, gamified mining and games of chance on Solana: those that charge, by what they charge; those with only a token, by what it's worth and how many people trade it."],
    ["IA", "AI", "AI agents and projects on Solana, by their token (CoinGecko). Their real on-chain usage is not measured yet."],
    ["Apps y bots", "Apps and bots", "Trading apps and bots, wallets and data: the tools people trade with, measured by fees."],
    ["Otros", "Other", "DePIN, privacy, payments, tools and social: what isn't DeFi or games, measured by what it charges."],
  ] : [
    ["Meme", "Meme", "Las memecoins de Solana, por su capitalización, y las lanzaderas donde nacen (Pump, BONK.fun…), por las comisiones que cobran."],
    ["Activos tokenizados", "Activos tokenizados", "Stablecoins por dinero en circulación en Solana; acciones, fondos y crédito por valor tokenizado."],
    ["DeFi", "DeFi", "DEX, préstamos, staking, derivados, puentes y el resto de la DeFi de Solana, medidos por lo que cobran, lo que se quedan y lo que llega a su token."],
    ["Juegos", "Juegos", "Juegos, cartas coleccionables, minería con juego y azar en Solana: los que cobran, por lo que cobran; los que solo tienen token, por lo que vale y cuánta gente lo mueve."],
    ["IA", "IA", "Agentes y proyectos de IA en Solana, por su token (CoinGecko). Aún no medimos su uso real en la cadena."],
    ["Apps y bots", "Apps y bots", "Apps y bots de trading, wallets y datos: las herramientas con las que se opera, medidas por las comisiones que cobran."],
    ["Otros", "Otros", "DePIN, privacidad, pagos, herramientas y social: lo que no es DeFi ni juego, medido por lo que cobra."],
  ];
  const GR = EN ? { "Lanzaderas": "Launchpads", "Apps de trading": "Trading apps", "Bots de Telegram": "Telegram bots", "Datos": "Data",
    "Activos reales": "Real-world assets", "Agregadores": "Aggregators", "Préstamos": "Lending", "Derivados": "Derivatives", "Oráculos": "Oracles",
    "Puentes": "Bridges", "Liquidez": "Liquidity", "Rendimiento": "Yield", "Predicciones": "Prediction markets", "Juegos": "Games", "Azar": "Games of chance",
    "Cartas físicas": "Physical cards", "Minería con juego": "Gamified mining", "Agentes de IA": "AI agents", "Proyectos de IA": "AI projects",
    "Privacidad": "Privacy", "Pagos": "Payments", "Herramientas": "Tools" } : {};
  const T = EN ? {
    todos: "All", med: { fees: "fees, 30 d", circ: "circulating on Solana", valor: "tokenized value", token: "token market cap" },
    todasCad: " · all its chains", enSol: " · on Solana", vsMes: " vs prev. month", volumen: " volume 24 h", comis: " in fees", partes: "Its parts", parte30: " fees, 30 d",
    depos: " deposited", tit: " holders", h24: " 24 h", trad: (t, o) => `${t} traders 24 h · ${o} organic`, cap: " market cap",
    sinTok: "No token", vale: "Analyze ›", frente: "vs the market", sinHist: "No history yet",
    head: ["#", "Project", "Usage", "Keeps 30 d", "Back to the token", "Price · 24 h", "Value × revenue", "vs market"], valeT: "How many times its token is worth what the protocol earns in a year", ingT: "What the protocol keeps of the fees it charges, last 30 days (DefiLlama)", holdT: "What the protocol spent in 30 days on buying back its token or paying those who hold it (DefiLlama). × = how many times its token is worth that in a year",
    titT: "Wallets holding the token (Jupiter)", tradT: "Wallets that bought or sold in 24 h; organic = buyers that don't look like bots (Jupiter)",
    proto: " projects", ver: (a) => `See ${a} ›`, ninguno: "None in this tab.", elige: "The largest in each section. Pick one to see it in full.",
    k: { dfFees: "DeFi charges in 30 d", dfDep: "Deposited", jgFees: "They charge in 30 d", jgTrad: "Traders in 24 h, all", feesSol: "Solana fees, 30 d", vsMesK: "vs previous month", protoSin: "Projects · no token", stSol: "Stablecoins on Solana", valTok: "Tokenized value (top 10)", feesAp: "Section fees, 30 d", mercVs: "Market vs prev. month" },
    nuevoTop: (d, a) => `With token since ${d} · ${a}`, nuevoH: (n) => `${n} now has a token`,
    nuevoP: (m, med) => `It showed up here without a token, with ${m} (${med}).`,
    nuevoW: "Copies with the same name usually appear: check the address on its official website before buying.",
    fecha: (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    error: "Couldn't load the data. Try again in a moment.",
  } : {
    todos: "Todos", med: { fees: "comisiones 30 d", circ: "en circulación en Solana", valor: "valor tokenizado", token: "capitalización del token" },
    todasCad: " · todas sus cadenas", enSol: " · en Solana", vsMes: " vs mes ant.", volumen: " de volumen 24 h", comis: " de comisiones", partes: "Sus partes", parte30: " de comisiones, 30 d",
    depos: " depositados", tit: " titulares", h24: " 24 h", trad: (t, o) => `${t} traders 24 h · ${o} orgánicos`, cap: " de capitalización",
    sinTok: "Sin token", vale: "Analizar ›", frente: "frente al mercado", sinHist: "Aún sin histórico",
    head: ["#", "Proyecto", "Uso", "Se queda 30 d", "Devuelve al token", "Precio · 24 h", "Vale × ingresos", "Vs. mercado"], valeT: "Cuántas veces vale su token lo que ingresa el protocolo en un año", ingT: "Lo que se queda el protocolo de las comisiones que cobra, últimos 30 días (DefiLlama)", holdT: "Lo que el protocolo gastó en 30 días en recomprar su token o pagar a quien lo tiene (DefiLlama). × = cuántas veces vale su token eso en un año",
    titT: "Wallets que tienen el token (Jupiter)", tradT: "Wallets que compraron o vendieron en 24 h; orgánicos = compradores que no parecen bots (Jupiter)",
    proto: " proyectos", ver: (a) => `Ver ${a} ›`, ninguno: "Ninguno en esta pestaña.", elige: "Los mayores de cada apartado. Elige uno para verlo entero.",
    k: { dfFees: "Cobra la DeFi en 30 d", dfDep: "Depositado", jgFees: "Cobran en 30 d", jgTrad: "Traders en 24 h, todos", feesSol: "Comisiones en Solana, 30 d", vsMesK: "vs mes anterior", protoSin: "Proyectos · sin token", stSol: "Stablecoins en Solana", valTok: "Valor tokenizado (los 10)", feesAp: "Comisiones del apartado, 30 d", mercVs: "Mercado vs mes anterior" },
    nuevoTop: (d, a) => `Con token desde el ${d} · ${a}`, nuevoH: (n) => `${n} ya tiene token`,
    nuevoP: (m, med) => `Salía aquí sin token, con ${m} (${med}).`,
    nuevoW: "Suelen salir copias con el mismo nombre: comprueba la dirección en su web oficial antes de comprar.",
    fecha: (d) => d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }),
    error: "No se pudieron cargar los datos. Prueba de nuevo en un momento.",
  };
  const apNom = (a) => (AP.find((x) => x[0] === a) || [a, a])[1];
  const grNom = (g) => GR[g] || g;

  // logo que no carga → iniciales
  document.addEventListener("error", (e) => { const im = e.target; if (im.tagName === "IMG" && im.dataset.i) { const s = document.createElement("span"); s.className = "av"; s.textContent = im.dataset.i; im.replaceWith(s); } }, true);
  const ini = (r) => esc((r.sym || r.n).slice(0, 2).toUpperCase());
  const av = (r) => /^https:\/\//.test(r.logo || "") ? `<img src="${esc(r.logo)}" alt="" loading="lazy" width="28" height="28" data-i="${ini(r)}">` : `<span class="av">${ini(r)}</span>`;

  let D, ap = "Todos", tipo = "todos", grupo = "Todos", orden = "m", nRwa = null;
  // ?ap=defi (desde el Escáner, 21/11): abre directamente ese apartado
  const AP_COD = { meme: "Meme", rwa: "Activos tokenizados", defi: "DeFi", juegos: "Juegos", ia: "IA", apps: "Apps y bots", otros: "Otros" };
  const apUrl = AP_COD[new URLSearchParams(location.search).get("ap")];
  if (apUrl) ap = apUrl;
  const enTipo = (r) => tipo === "todos" || (tipo === "nuevo" ? !!r.nuevo : (tipo === "con") === r.tok);
  const deAp = () => D.rows.filter((r) => ap === "Todos" || r.ap === ap);

  function cabecera() {
    const rs = deAp();
    $("#aps").innerHTML = ["Todos", ...AP.map((a) => a[0])].map((a) => {
      // Activos tokenizados: lo que enseña la vista completa (activos, dólares y otros activos reales), cuando ya ha cargado
      const rwaFilas = D.rows.filter((r) => r.ap === "Activos tokenizados").length;
      const n = a === "Todos" ? D.rows.length + (nRwa != null ? nRwa - rwaFilas : 0) : a === "Activos tokenizados" && nRwa != null ? nRwa : D.rows.filter((r) => r.ap === a).length;
      return n ? `<button class="${a === ap ? "on" : ""}" data-a="${esc(a)}">${esc(a === "Todos" ? T.todos : apNom(a))}<em>${n}</em></button>` : "";
    }).join("");
    const d = AP.find((a) => a[0] === ap);
    $("#apdesc").textContent = d ? d[2] : TD.intro;
    const fees = rs.filter((r) => r.med === "fees"), val = rs.filter((r) => r.med === "valor");
    const sinTok = rs.filter((r) => !r.tok).length;
    let k;
    if (ap === "Activos tokenizados") k = [[T.k.stSol, fm(D.totStables)], [T.k.vsMesK, pc(D.mercado.circ), D.mercado.circ], [T.k.valTok, fm(val.reduce((s, r) => s + (r.m || 0), 0))]];
    else if (ap === "Todos") k = [[T.k.feesSol, fm(D.totFees30)], [T.k.vsMesK, pc(D.mercado.fees), D.mercado.fees], [T.k.protoSin, rs.length + " · " + sinTok]];
    else if (ap === "DeFi") k = [[T.k.dfFees, fm(fees.reduce((s, r) => s + r.m, 0))], [T.k.dfDep, fm(rs.reduce((s, r) => s + (r.tvl || 0), 0))], [T.k.mercVs, pc(D.mercado.fees), D.mercado.fees]];
    else if (ap === "Juegos") k = [[T.k.jgFees, fm(fees.reduce((s, r) => s + r.m, 0))], [T.k.jgTrad, fk(rs.reduce((s, r) => s + (r.trad || 0), 0))], [T.k.protoSin, rs.length + " · " + sinTok]];
    else k = [[T.k.feesAp, fm(fees.reduce((s, r) => s + r.m, 0))], [T.k.mercVs, pc(D.mercado.fees), D.mercado.fees], [T.k.protoSin, rs.length + " · " + sinTok]];
    $("#mk").innerHTML = k.map(([t, v, s]) => `<div><small>${t}</small><b class="${s == null ? "" : s < 0 ? "dn" : "up"}">${v}</b></div>`).join("");
    $("#nTodos").textContent = rs.length; $("#nCon").textContent = rs.filter((r) => r.tok).length; $("#nSin").textContent = sinTok;
    const nNuevo = rs.filter((r) => r.nuevo).length;
    $("#nNuevo").textContent = nNuevo; $("#tNuevo").hidden = !D.rows.some((r) => r.nuevo);
    const gs = {}; rs.filter(enTipo).forEach((r) => gs[r.gr] = (gs[r.gr] || 0) + 1);
    if (grupo !== "Todos" && !gs[grupo]) grupo = "Todos";
    $("#chips").innerHTML = ap === "Todos" ? "" : [["Todos", rs.filter(enTipo).length], ...Object.entries(gs).sort((a, b) => b[1] - a[1])]
      .map(([g, n]) => `<button class="${g === grupo ? "on" : ""}" data-g="${esc(g)}">${esc(g === "Todos" ? T.todos : grNom(g))} <span>${n}</span></button>`).join("");
  }

  const HEAD = () => `<div class="row h"><span class="i">${T.head[0]}</span><span>${T.head[1]}</span><span class="num">${T.head[2]}</span><span class="num vol" title="${T.ingT}">${T.head[3]}</span><span class="num vol" title="${T.holdT}">${T.head[4]}</span><span class="num vol">${T.head[5]}</span><span class="num vol" title="${T.valeT}">${T.head[6]}</span><span class="num">${T.head[7]}</span><span class="go"></span></div>`;
  function fila(r, i) {
    const w = r.rel == null ? 0 : Math.min(35, Math.abs(r.rel) * 35);
    const bar = r.rel == null ? "" : `<span class="b"><i style="${r.rel >= 0 ? "left:50%" : "right:50%"};width:${w}px;background:${r.rel >= 0 ? "var(--ver)" : "var(--rojo)"}"></i></span>`;
    const medida = T.med[r.med] + (r.todas ? T.todasCad : r.med === "valor" ? T.enSol : "");
    const extra = r.med === "fees" || r.med === "circ" ? (r.c == null ? "" : pc(r.c) + T.vsMes) : r.med === "token" ? (r.vol ? fm(r.vol) + T.volumen : "") : r.f30 ? fm(r.f30) + T.comis : "";
    const sub = (ap === "Todos" ? esc(apNom(r.ap)) + " · " : "") + esc(grNom(r.gr)) + (r.tvl ? " · " + fm(r.tvl) + T.depos : "");
    const tit = r.tit != null ? `<small title="${T.titT}">${fk(r.tit)}${T.tit}${r.titC != null && Math.abs(r.titC) >= 0.0005 ? ` <span class="${r.titC >= 0 ? "up" : "dn"}">${pc1(r.titC)}${T.h24}</span>` : ""}</small>` : "";
    const trad = r.trad != null ? `<small title="${T.tradT}">${T.trad(fk(r.trad), fk(r.org || 0))}</small>` : "";
    const precio = r.cad ? `<small>${EN ? "token on" : "token en"} ${esc(r.cad)}</small>` : r.tok ? (r.precio != null ? fp(r.precio) + ` <span class="pc ${r.c24 >= 0 ? "up" : "dn"}">${pc1(r.c24)}</span>` : "—") + (r.mcap ? `<small>${fm(r.mcap)}${T.cap}</small>` : "") : `<span class="sin">${T.sinTok}</span>`;
    const ir = r.mint && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(r.mint) ? `<a class="go" href="${EN ? "/en/" : "/"}?token=${r.mint}">${T.vale}</a>` : `<span class="go"></span>`;
    return `<div class="row"><span class="i">${i + 1}</span>
      <span class="nm">${av(r)}<span><b>${tok(r) ? `<a href="${tok(r)}">${esc(r.n)}</a>` : esc(r.n)}${r.sym ? ` <span class="sym">${esc(r.sym)}</span>` : ""}</b><small>${sub}</small>${tit}</span></span>
      <span class="num">${r.m ? fm(r.m) : "—"}<small class="med">${r.m ? medida : ""}</small><small>${extra}</small>${trad}</span>
      <span class="num vol">${fm(r.r30)}</span>
      <span class="num vol" title="${T.holdT}">${r.h30 == null ? "—" : fm(r.h30) + (r.mcap && r.h30 > 0 ? `<small>×${dec(r.mcap / (r.h30 * 12), 1)}</small>` : "")}</span>
      <span class="num vol">${precio}</span>
      <span class="num vol">${r.anios == null ? "—" : "×" + dec(r.anios, 1)}</span>
      ${r.rel == null && r.med === "token" ? `<span class="rel"></span>` : `<span class="rel"><span class="num ${r.rel >= 0 ? "up" : "dn"}" title="${r.rel == null && r.med !== "fees" && r.med !== "circ" ? T.sinHist : ""}">${pc(r.rel)}</span>${bar}<small>${T.frente}</small></span>`}
      ${ir}</div>`;
  }
  const ordena = (rs) => rs.sort((a, b) => orden === "anios" ? (a.anios ?? 1e18) - (b.anios ?? 1e18) : (b[orden] ?? -1e18) - (a[orden] ?? -1e18));

  function tarjetas(rs) {
    return `<div class="grid2">${rs.map((r) => `<div class="card"><div class="top">${T.nuevoTop(T.fecha(new Date(r.nuevo)), esc(apNom(r.ap)) + " · " + esc(grNom(r.gr)))}</div>
      <h3>${T.nuevoH(esc(r.n))}</h3><p>${T.nuevoP(fm(r.m), T.med[r.med])}</p><p class="warn">${T.nuevoW}</p>
      ${r.mint ? `<a class="btn" href="${EN ? "/en/" : "/"}?token=${esc(r.mint)}">${T.vale}</a>` : ""}</div>`).join("")}</div>`;
  }

  // ---------- Meme (21/11, maqueta maquetas/escaner/ecosistema-meme.html): lanzaderas con nuestro registro y memecoins con señal ----------
  const MZ = EN ? {
    datoK: "SolFlag registry", dato: (p, n, d, v) => `of the ${n} new tokens we saw being born since ${d} were dead after 24 h. Only ${v} were still alive. Before buying something newborn, check who is behind it.`,
    lzH: "Launchpads,", lzS: "where they are born and how many survive", lzTh: ["Launchpad", "Earns 30 d", "Its token", "Born", "Alive after 24 h"],
    parte: "part of Pump.fun (shown whole in DeFi)", enDefi: "listed in DeFi · DEX", cadena: "on-chain: ", nuevo: "new", sinTok: "No token", conTok: "has a token", noReg: "Not in our registry yet",
    vivos: (v, n) => `${v} of ${n} alive`,
    lzSrc: (d) => `Fees: DefiLlama (30 days, vs the previous month; “new” if it barely earned last month). Born and alive after 24 h: SolFlag registry since ${d}, with the launches our collector sees (a sample, not all). “Alive” = still has money in it and trading after 24 h.`,
    mmH: "Memecoins,", mmS: "who holds them and who moves them", mmTh: ["Memecoin", "Worth · 24 h", "Holders", "Who holds it", "Whales 24 h", "Signal"],
    ley: ["10 largest wallets", "the project", "exchanges and custodians", "programs (locks, pools)", "the rest"], mayor: (p) => `largest wallet <b${p >= 15 ? ' class="a"' : ""}>${p}%</b>`, top10: (p) => ` · top 10: ${p}%`,
    noSigue: "not tracked yet", sinOps: "no large trades", compran: (v) => "buy " + v, venden: (v) => "sell " + v, trs: " traders",
    unaW: (p) => `One wallet holds ${p}%`, enProg: (p) => `${p}% sits in programs (locks or pools)`, venden2: "Whales are selling more than they buy",
    barT: (w, x, p) => `10 largest wallets ${w}% · exchanges ${x}% · programs ${p}%`,
    quienSrc: " Who holds it: the token's 20 largest accounts and their owner (Helius); “exchange” = a known exchange wallet; “program” = a program account (locks, pools…); the rest are wallets that are neither a pool nor a known exchange (people or custodians). Whales: buys and sells over $1,000 in the last 24 h, stored by SolFlag.",
    org: (n) => n === 1 ? "1 organic" : n + " organic",
    bots: (t, o) => `${t} traders and ${o === 0 ? "no organic ones" : o === 1 ? "1 organic" : o + " organic"}: mostly bots`, poco: (t) => `Little trading: ${t} traders yesterday`,
    gana: (x) => `Gaining holders: ${x} in 24 h`, orgP: (x) => `${x}% organic buyers`,
    mmSrc: "The 10 most valuable memecoins born on Solana. Market cap and volume: CoinGecko. Holders and traders: Jupiter (organic = buyers that don't look like bots). Being very active is not a buy recommendation.",
    queH: "What we check in a meme", queS: "The usual flags:", queL: ["Can they mint more or freeze you?", "Who holds it (pools excluded)", "Can you sell, and what does it cost?", "Who launched it and their track record", "What it depends on (the Pump.fun curve)"],
    notas: { raydium_launchlab: "Raydium LaunchLab, used by BONK.fun and others", meteora_dbc: "Meteora's curve, used by Bags and others" },
  } : {
    datoK: "Dato del registro de SolFlag", dato: (p, n, d, v) => `de los ${n} tokens nuevos que vimos nacer desde el ${d} estaban muertos a las 24 h. Solo ${v} seguían con vida. Antes de comprar algo recién nacido, mira quién está detrás.`,
    lzH: "Lanzaderas,", lzS: "dónde nacen y cuántas sobreviven", lzTh: ["Lanzadera", "Cobra 30 d", "Su token", "Nacieron", "Vivos a las 24 h"],
    parte: "parte de Pump.fun (va entera en DeFi)", enDefi: "va en DeFi · DEX", cadena: "en la cadena: ", nuevo: "nuevo", sinTok: "Sin token", conTok: "con token", noReg: "Aún no lo registramos",
    vivos: (v, n) => `${v} de ${n} vivos`,
    lzSrc: (d) => `Comisiones: DefiLlama (30 días, frente al mes anterior; «nuevo» si el mes anterior casi no cobró). Nacieron y vivos a las 24 h: registro de SolFlag desde el ${d}, con los lanzamientos que ve nuestro recolector (una muestra, no todos). «Vivo» = sigue con dinero dentro y movimiento a las 24 h.`,
    mmH: "Memecoins,", mmS: "quién las tiene y quién las mueve", mmTh: ["Memecoin", "Vale · 24 h", "Titulares", "Quién la tiene", "Ballenas 24 h", "Señal"],
    ley: ["10 mayores wallets", "del proyecto", "exchanges y custodios", "programas (bloqueos, pools)", "el resto"], mayor: (p) => `la mayor wallet <b${p >= 15 ? ' class="a"' : ""}>${p} %</b>`, top10: (p) => ` · las 10 mayores ${p} %`,
    noSigue: "aún no la seguimos", sinOps: "sin operaciones grandes", compran: (v) => "compran " + v, venden: (v) => "venden " + v, trs: " traders",
    unaW: (p) => `Una sola wallet tiene el ${p} %`, enProg: (p) => `El ${p} % está en programas (bloqueos o pools)`, venden2: "Las ballenas venden más de lo que compran",
    barT: (w, x, p) => `10 mayores wallets ${w} % · exchanges ${x} % · programas ${p} %`,
    quienSrc: " Quién la tiene: las 20 mayores cuentas del token (Helius) y su dueño; «exchange» = wallet de un exchange conocido; «programa» = cuenta de un programa (bloqueos, pools…); el resto, wallets que no son pool ni exchange conocido (personas o custodios). Ballenas: compras y ventas de más de 1.000 $ en las últimas 24 h, guardadas por SolFlag.",
    org: (n) => n === 1 ? "1 orgánico" : n + " orgánicos",
    bots: (t, o) => `${t} traders y ${o === 0 ? "ninguno orgánico" : o === 1 ? "1 orgánico" : o + " orgánicos"}: casi todo bots`, poco: (t) => `Poco movimiento: ${t} traders ayer`,
    gana: (x) => `Gana titulares: ${x} en 24 h`, orgP: (x) => `${x} % de compradores orgánicos`,
    mmSrc: "Las 10 memecoins nacidas en Solana que más valen. Capitalización y volumen: CoinGecko. Titulares y traders: Jupiter (orgánicos = compradores que no parecen bots). Que se mueva mucho no es una recomendación de compra.",
    queH: "Qué miramos en una meme", queS: "Las banderas de siempre:", queL: ["¿Pueden crear más o congelarte?", "Quién lo tiene (sin contar pools)", "¿Puedes vender y cuánto te cuesta?", "Quién lo lanzó y su historial", "De qué depende (la curva de Pump.fun)"],
    notas: { raydium_launchlab: "LaunchLab de Raydium, que usan BONK.fun y otras", meteora_dbc: "curva de Meteora, que usan Bags y otras" },
  };
  // lanzadera de DefiLlama → plataforma en nuestro registro (launchpad.platform de RugCheck)
  const PLAT = { "Pump.fun": "pump_fun", "BONK.fun": "raydium_launchlab", "Bags": "meteora_dbc", "StonkFun": "stonk_fun", "Rapid Launch": "rapidlaunch" };
  let REG = null, regPide = null, QZ = null, qzPide = null;
  // «Quién la tiene» en todos los apartados con token (26/11, maqueta maquetas/web/ecosistema-quien-todos.html): la última
  // foto de la recogida (/api/quien: barra, mayor wallet, mn = «nombre|función» si es del propio proyecto, av = último aviso
  // de 24 h). La señal pone primero lo de las ballenas.
  const pideQZ = () => { if (!QZ && !qzPide) qzPide = fetch("https://api.solflag.com/api/quien?v=2").then((r) => r.ok ? r.json() : null).catch(() => null).then((j) => { QZ = (j && j.quien) || {}; pinta(); }); };
  const QB = EN ? {
    th: "Who holds it", tit: (n) => n + " holders", rol: { treasury: "treasury", issuer: "issuer", creator: "token creator" },
    proyL: (rol, n, p) => `project: ${n} ${rol} <b>${p}%</b>`,
    envio: (p, x) => `The largest wallet sent ${p}% to ${x} today`, baja: (de, a) => a == null ? `A top wallet dropped from ${de}% and left the top 20` : `A top wallet dropped from ${de}% to ${a}%`,
    sube: (a) => `A wallet grew to ${a}%`, entra: (a) => `A wallet enters the top 20 with ${a}%`, unExch: "an exchange",
    pj: (rol, n, p) => `The ${rol} of ${n} holds ${p}%`, unaW: (p) => `One single wallet holds ${p}%`, venden: "Whales sell more than they buy",
    src: " «Who holds it»: the 20 largest accounts by owner (wallets, known exchanges and custodians, programs), a snapshot every 2 h (Helius). The project's own wallets (treasury, issuer, creator) are named; the largest wallet can still belong to the project without us knowing.",
  } : {
    th: "Quién la tiene", tit: (n) => n + " titulares", rol: { treasury: "tesorería", issuer: "emisor", creator: "creador del token" },
    proyL: (rol, n, p) => `del proyecto: ${rol} de ${n} <b>${p} %</b>`,
    envio: (p, x) => `La mayor wallet mandó el ${p} % a ${x} hoy`, baja: (de, a) => a == null ? `Una de las mayores wallets bajó del ${de} % y salió del top 20` : `Una de las mayores wallets bajó del ${de} % al ${a} %`,
    sube: (a) => `Una wallet sube al ${a} %`, entra: (a) => `Una wallet entra en el top 20 con el ${a} %`, unExch: "un exchange",
    pj: (rol, n, p) => `La ${rol} de ${n} tiene el ${p} %`.replace("La emisor", "El emisor").replace("La creador", "El creador"), unaW: (p) => `Una sola wallet tiene el ${p} %`, venden: "Las ballenas venden más de lo que compran",
    src: " «Quién la tiene»: las 20 mayores cuentas de cada token, por dueño (wallets, exchanges y custodios conocidos, programas), foto cada 2 h (Helius). Las wallets del propio proyecto (tesorería, emisor, creador) van con su nombre; la mayor wallet puede ser del proyecto aunque no lo sepamos.",
  };
  const qzDe = (r) => QZ && r.mint && QZ[r.mint] ? QZ[r.mint] : null;
  const n1 = (x) => x.toLocaleString(EN ? "en-US" : "es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const mnDe = (q) => { if (!q || !q.mn) return null; const [n, r] = q.mn.split("|"); return { n, rol: QB.rol[r] || QB.rol.treasury }; };
  // celda: barra de las 20 mayores, la mayor wallet (o de quién es) y, si se pide, los titulares
  const quienCel = (r, cls, tit) => { const q = qzDe(r), t = tit && r.tit != null ? `<small>${QB.tit(fk(r.tit))}</small>` : "";
    if (!QZ) return `<span class="mq-q ${cls}"><span class="mz-na">…</span></span>`;
    if (!q) return `<span class="mq-q ${cls}"><span class="mz-na">${r.tok && !r.cad ? MZ.noSigue : "—"}</span>${t}</span>`;
    const resto = Math.max(0, 100 - q.top10w - (q.proy || 0) - q.exch - q.pools), p = mnDe(q);
    return `<span class="mq-q ${cls}"><span class="mq-bar" title="${esc(MZ.barT(num(q.top10w, 1), num(q.exch, 1), num(q.pools, 1)))}"><i class="w" style="width:${q.top10w}%"></i><i class="j" style="width:${q.proy || 0}%"></i><i class="x" style="width:${q.exch}%"></i><i class="p" style="width:${q.pools}%"></i><i class="r" style="width:${resto}%"></i></span>` +
      `<small>${MZ.mayor(n1(q.mayor))}</small>${q.proy >= 1 && p ? `<small class="mq-pj">${QB.proyL(esc(p.rol), esc(p.n), n1(q.proy))}</small>` : ""}${t}</span>`; };
  // señal de las ballenas (o "" si no hay nada que decir)
  const senalB = (r) => { const q = qzDe(r); if (!q) return "";
    const a = q.av, p = mnDe(q);
    if (a && a[1] === "envio") return `<span class="mz-sen mz-a">${QB.envio(n1(a[2] - (a[3] || 0)), esc(a[4] || QB.unExch))}</span>`;
    if (a && a[1] === "baja") return `<span class="mz-sen mz-a">${QB.baja(n1(a[2]), a[3] == null ? null : n1(a[3]))}</span>`;
    if (a && (a[1] === "sube" || a[1] === "entra")) return `<span class="mz-sen mz-v">${a[1] === "entra" ? QB.entra(n1(a[3])) : QB.sube(n1(a[3]))}</span>`;
    if (q.mayor >= 30) return `<span class="mz-sen mz-a">${QB.unaW(n1(q.mayor))}</span>`;
    if (q.proy >= 30 && p) return `<span class="mz-sen mz-a">${QB.pj(esc(p.rol), esc(p.n), n1(q.proy))}</span>`;
    if (q.vende > (q.compra || 0) * 1.5 && q.vende >= 5e3) return `<span class="mz-sen mz-r">${QB.venden}</span>`;
    return ""; };
  const num = (n, d) => n.toLocaleString(EN ? "en-US" : "es-ES", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0, useGrouping: "always" });
  const tok = (r) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(r.mint || "") ? (EN ? "/en/" : "/") + "?token=" + r.mint : null;
  function memeVista() {
    if (!REG && !regPide) regPide = fetch("https://api.solflag.com/api/lanzaderas").then((r) => r.ok ? r.json() : null).catch(() => null).then((j) => { REG = j || {}; if (ap === "Meme") pinta(); });
    pideQZ();
    const rs = D.rows.filter((r) => r.ap === "Meme");
    const memes = rs.filter((r) => r.gr === "Memecoins").sort((a, b) => (b.m || 0) - (a.m || 0));
    const lz = rs.filter((r) => r.gr === "Lanzaderas").map((r) => Object.assign({}, r));
    const pump = D.rows.find((r) => r.n === "Pump.fun" && r.partes), pp = pump && pump.partes.find((p) => p.gr === "Lanzaderas");
    if (pp) lz.push(Object.assign({}, pump, { n: "Pump.fun", m: pp.m, c: pp.c, parte: true }));
    const stk = D.rows.find((r) => r.n === "StonkFun" && r.ap !== "Meme"); if (stk) lz.push(Object.assign({}, stk, { enDefi: true }));
    lz.sort((a, b) => (b.m || 0) - (a.m || 0));
    const reg = REG && REG.plats, tot = REG && REG.total, desde = REG && REG.desde ? new Date(REG.desde).toLocaleDateString(EN ? "en-GB" : "es-ES", { day: "numeric", month: EN ? "short" : "numeric" }) : "";
    const cambio = (c) => c == null ? "" : c > 5 ? `<span class="mz-nuevo">${MZ.nuevo}</span>` : `<span class="${c >= 0 ? "up" : "dn"}">${pc1(c) || pc(c)}</span>`;
    const nom = (r, extra) => { const h = tok(r); const n = `${esc(r.n)}${r.sym && r.tok !== false ? ` <small>${esc(r.sym)}</small>` : ""}`; return `<span class="mz-n"><b>${h ? `<a href="${h}">${n}</a>` : n}</b>${extra != null ? `<small>${extra}</small>` : ""}</span>`; };
    const lzFila = (r, i) => { const k = PLAT[r.n], g = reg && k && reg[k], v = g ? g.con - g.muertos : 0;
      const sub = r.parte ? MZ.parte : r.enDefi ? MZ.enDefi : k && MZ.notas[k] ? MZ.cadena + MZ.notas[k] : "";
      return `<div class="mz-t mz-lz"><span class="mz-i">${i + 1}</span>${av(r)}${nom(r, esc(sub))}<span class="mz-x">${fm(r.m)}<small>${cambio(r.c)}</small></span>` +
        `<span class="mz-x mz-m mz-tok">${r.tok ? (r.mcap ? fm(r.mcap) + `<small><span class="${(r.c24 || 0) >= 0 ? "up" : "dn"}">${pc1(r.c24)}</span></small>` : MZ.conTok) : `<span class="mz-sin">${MZ.sinTok}</span>`}</span>` +
        `<span class="mz-x mz-m mz-nac">${g ? num(g.n) : "—"}</span>` +
        (g && g.con ? `<span class="mz-viv"><b>${num(v / g.con * 100, 1)}${sp}%</b><small>${MZ.vivos(num(v), num(g.con))}</small></span>` : `<span class="mz-na">${reg ? MZ.noReg : "…"}</span>`) + "</div>"; };
    const qz = (r) => QZ && r.mint && QZ[r.mint] ? QZ[r.mint] : null;
    const senal = (r) => { const q = qz(r);
      if (q && q.mayor >= 15) return `<span class="mz-sen mz-a">${MZ.unaW(num(q.mayor, 1))}</span>`;
      if (q && q.pools >= 50) return `<span class="mz-sen mz-a">${MZ.enProg(num(q.pools))}</span>`;
      if (q && q.vende > (q.compra || 0) * 1.5 && q.vende >= 5e3) return `<span class="mz-sen mz-r">${MZ.venden2}</span>`;
      if (r.trad >= 50 && r.org != null && r.org / r.trad < 0.02) return `<span class="mz-sen mz-r">${MZ.bots(num(r.trad), r.org)}</span>`;
      if (r.trad != null && r.trad < 100) return `<span class="mz-sen mz-a">${MZ.poco(r.trad)}</span>`;
      if (r.titC != null && r.titC >= 0.001) return `<span class="mz-sen mz-v">${MZ.gana(pc1(r.titC))}</span>`;
      if (r.org != null && r.trad && r.org / r.trad >= 0.03) return `<span class="mz-sen mz-v">${MZ.orgP(num(r.org / r.trad * 100))}</span>`;
      return "<span></span>"; };
    const quienC = (r) => { const q = qz(r); if (!QZ) return '<span class="mz-na">…</span>'; if (!q) return `<span class="mz-na">${MZ.noSigue}</span>`;
      const resto = Math.max(0, 100 - q.top10w - (q.proy || 0) - q.exch - q.pools);
      return `<span class="mq-q"><span class="mq-bar" title="${esc(MZ.barT(num(q.top10w, 1), num(q.exch, 1), num(q.pools, 1)))}"><i class="w" style="width:${q.top10w}%"></i><i class="j" style="width:${q.proy || 0}%"></i><i class="x" style="width:${q.exch}%"></i><i class="p" style="width:${q.pools}%"></i><i class="r" style="width:${resto}%"></i></span>` +
        `<small>${MZ.mayor(num(q.mayor, 1))}${MZ.top10(num(q.top10w))}</small></span>`; };
    const ballC = (r) => { const q = qz(r); if (!q) return '<span class="mz-na mq-bc">—</span>'; if (!q.n) return `<span class="mz-na mq-bc">${MZ.sinOps}</span>`;
      return `<span class="mq-b"><span class="up">${MZ.compran(fm(q.compra || 0))}</span><span class="dn">${MZ.venden(fm(q.vende || 0))}</span></span>`; };
    const mmFila = (r, i) => `<div class="mz-t mq"><span class="mz-i">${i + 1}</span>${av(r)}${nom(r)}<span class="mz-x">${fm(r.m)}<small><span class="${(r.c24 || 0) >= 0 ? "up" : "dn"}">${pc1(r.c24)}</span></small></span>` +
      `<span class="mz-x mq-tit">${r.tit != null ? fk(r.tit) : "—"}<small>${r.trad != null ? fk(r.trad) + MZ.trs : "&nbsp;"}</small></span>${quienC(r)}${ballC(r)}${senal(r)}${goV(r)}</div>`;
    const ley = `<p class="mq-ley">${["w", "j", "x", "p", "r"].map((c, k) => `<span><i class="${c}"></i>${MZ.ley[k]}</span>`).join("")}</p>`;
    $("#lista").innerHTML =
      (tot && tot.con ? `<div class="mz-dato"><span class="mz-k">${MZ.datoK}</span><b>${num(tot.muertos / tot.con * 100, 1)}${sp}%</b><p>${MZ.dato(0, num(tot.con), desde, num(tot.con - tot.muertos))}</p></div>` : "") +
      `<section class="mz-card"><h2>${MZ.lzH} <small>${MZ.lzS}</small></h2><div class="mz-t mz-lz mz-h"><span></span><span></span><span>${MZ.lzTh[0]}</span><span>${MZ.lzTh[1]}</span><span class="mz-tok">${MZ.lzTh[2]}</span><span class="mz-nac">${MZ.lzTh[3]}</span><span>${MZ.lzTh[4]}</span></div>` +
        lz.map(lzFila).join("") + `<p class="mz-src">${MZ.lzSrc(desde || "30/10")}</p></section>` +
      `<section class="mz-card"><h2>${MZ.mmH} <small>${MZ.mmS}</small></h2>${ley}<div class="mz-t mq mz-h"><span class="mz-i"></span><span></span><span>${MZ.mmTh[0]}</span><span>${MZ.mmTh[1]}</span><span class="mq-tit">${MZ.mmTh[2]}</span><span class="mq-lq">${MZ.mmTh[3]}</span><span class="mq-lq">${MZ.mmTh[4]}</span><span class="mq-lq">${MZ.mmTh[5]}</span><span class="go"></span></div>` +
        memes.map(mmFila).join("") + `<p class="mz-src">${MZ.mmSrc}${MZ.quienSrc}</p></section>` +
      `<div class="mz-que"><div class="top"><b>${MZ.queH}</b><span>${MZ.queS}</span></div><ul>${MZ.queL.map((x) => `<li>${x}</li>`).join("")}</ul></div>`;
  }

  // ---------- IA (21/11, maqueta maquetas/escaner/ecosistema-ia.html): agentes y proyectos, con código y señal ----------
  const IA = EN ? {
    dato: (a, b) => `AI tokens show no public code or haven't touched it in over 6 months. Without code there is no way to check the agent or product exists: only the name is left.`,
    ag: ["AI agents,", "the ones that claim to act on-chain on their own"], pr: ["AI projects,", "networks, data and compute for AI"],
    th: ["Project", "Worth · 24 h", "Who holds it", "Traders 24 h", "Code", "Signal"],
    sinCod: "No public code", cod1: "Changed 1 day ago", codN: (n) => `Changed ${n} days ago`, codP: (n) => `${n} days without changes`,
    bots: (v) => `Worth ${v} and mostly traded by bots`, pocos: (v, n) => `Worth ${v} and ${n} people traded it yesterday`,
    bloq: (b, l) => `${b}% still locked${l ? ", releases " + l + "% this month" : ""}`, vivo: (p) => `Live code and ${p}% organic buyers`,
    src: "Market cap: CoinGecko. Holders and traders: Jupiter (organic = buyers that don't look like bots). Code: GitHub linked from CoinGecko (last change). Unlocks: Streamflow. Today's data; not recommendations.",
    queH: "What we check in an AI token", queS: "Many are memes under another name:", queL: ["Does the agent really act on-chain?", "Who is behind it and their track record", "Who holds it", "Can you sell?", "Promises with no timeline"],
  } : {
    dato: (a, b) => `tokens de IA no enseñan código público o lo tienen parado hace más de 6 meses. Sin código no se puede comprobar que el agente o el producto existan: solo queda el nombre.`,
    ag: ["Agentes de IA,", "los que dicen actuar solos en la cadena"], pr: ["Proyectos de IA,", "redes, datos y cómputo para IA"],
    th: ["Proyecto", "Vale · 24 h", "Quién la tiene", "Traders 24 h", "Código", "Señal"],
    sinCod: "Sin código público", cod1: "Cambiado hace 1 día", codN: (n) => `Cambiado hace ${n} días`, codP: (n) => `${n} días sin cambios`,
    bots: (v) => `Vale ${v} y casi todo lo mueven bots`, pocos: (v, n) => `Vale ${v} y lo movieron ${n} personas ayer`,
    bloq: (b, l) => `${b} % aún bloqueado${l ? ", suelta " + l + " % este mes" : ""}`, vivo: (p) => `Código vivo y ${p} % de compradores orgánicos`,
    src: "Capitalización: CoinGecko. Titulares y traders: Jupiter (orgánicos = compradores que no parecen bots). Código: GitHub enlazado desde CoinGecko (último cambio). Desbloqueos: Streamflow. Datos del día; no son recomendaciones.",
    queH: "Qué miramos en un token de IA", queS: "Muchos son memes con otro nombre:", queL: ["¿El agente opera de verdad en la cadena?", "Quién está detrás y su historial", "Quién lo tiene", "¿Puedes vender?", "Promesas sin calendario"],
  };
  let PERF = null, perfPide = null;
  const pidePerf = () => perfPide || (perfPide = fetch("/datos/perfiles.json", { cache: "no-cache" }).then((r) => r.ok ? r.json() : null).catch(() => null).then((j) => { PERF = (j && j.t) || {}; }));
  function iaVista() {
    if (!PERF) pidePerf().then(() => { if (ap === "IA") pinta(); });
    pideQZ();
    const P = PERF || {};
    const rs = D.rows.filter((r) => r.ap === "IA").map((r) => { const p = (r.mint && P[r.mint]) || {}; return Object.assign({}, r, { cod: p.cod || null, dl: p.dl || null, cap: r.mcap || r.m }); }).sort((a, b) => (b.cap || 0) - (a.cap || 0));
    const num = (n, d) => n.toLocaleString(EN ? "en-US" : "es-ES", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0, useGrouping: "always" });
    const href = (r) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(r.mint || "") ? (EN ? "/en/" : "/") + "?token=" + r.mint : null;
    const cod = (r) => { if (!PERF) return '<span class="mz-na">…</span>'; if (!r.cod || r.cod.dias == null) return `<span class="mz-cod s">${IA.sinCod}</span>`;
      const t = r.cod.dias <= 1 ? IA.cod1 : r.cod.dias <= 30 ? IA.codN(r.cod.dias) : IA.codP(r.cod.dias);
      return `<span class="mz-cod ${r.cod.dias <= 30 ? "v" : "p"}"><a href="${esc(r.cod.url)}" target="_blank" rel="noopener">${t} ↗</a></span>`; };
    const senal = (r) => { const sb = senalB(r); if (sb) return sb;
      if (r.trad >= 50 && r.org != null && r.org / r.trad < 0.05) return `<span class="mz-sen mz-r">${IA.bots(fm(r.cap))}</span>`;
      if (r.trad != null && r.trad < 50 && r.cap >= 1e6) return `<span class="mz-sen mz-r">${IA.pocos(fm(r.cap), r.trad)}</span>`;
      if (r.dl && r.dl.bloq >= 20) return `<span class="mz-sen mz-a">${IA.bloq(num(r.dl.bloq), r.dl.lib >= 0.1 ? num(r.dl.lib, 1) : "")}</span>`;
      if (r.cod && r.cod.dias != null && r.cod.dias <= 30 && r.org != null && r.trad && r.org / r.trad >= 0.05) return `<span class="mz-sen mz-v">${IA.vivo(num(r.org / r.trad * 100))}</span>`;
      return "<span></span>"; };
    const fila = (r, i) => { const h = href(r), n = `${esc(r.n)}${r.sym ? ` <small>${esc(r.sym)}</small>` : ""}`;
      return `<div class="mz-t mz-ia"><span class="mz-i">${i + 1}</span>${av(r)}<span class="mz-n"><b>${h ? `<a href="${h}">${n}</a>` : n}</b></span>` +
        `<span class="mz-x">${fm(r.cap)}<small><span class="${(r.c24 || 0) >= 0 ? "up" : "dn"}">${pc1(r.c24)}</span></small></span>` +
        quienCel(r, "ia-q", true) +
        `<span class="mz-x">${r.trad != null ? fk(r.trad) : "—"}<small>${r.org != null ? MZ.org(r.org) : "&nbsp;"}</small></span><span class="mz-codc">${cod(r)}</span>${PERF ? senal(r) : "<span></span>"}</div>`; };
    const tabla = (t, l) => l.length ? `<section class="mz-card"><h2>${t[0]} <small>${t[1]}</small></h2><div class="mz-t mz-ia mz-h"><span></span><span></span><span>${IA.th[0]}</span><span>${IA.th[1]}</span><span class="ia-q">${IA.th[2]}</span><span>${IA.th[3]}</span><span class="mz-codc">${IA.th[4]}</span><span>${IA.th[5]}</span></div>${l.map(fila).join("")}</section>` : "";
    const np = rs.filter((r) => !r.cod || r.cod.dias == null || r.cod.dias > 180).length;
    $("#lista").innerHTML = (PERF ? `<div class="mz-dato"><span class="mz-k">${EN ? "Fact" : "Dato"}</span><b>${np} ${EN ? "of" : "de"} ${rs.length}</b><p>${IA.dato()}</p></div>` : "") +
      tabla(IA.ag, rs.filter((r) => r.gr === "Agentes de IA")) + tabla(IA.pr, rs.filter((r) => r.gr !== "Agentes de IA")) +
      `<p class="mz-src">${IA.src}</p><div class="mz-que"><div class="top"><b>${IA.queH}</b><span>${IA.queS}</span></div><ul>${IA.queL.map((x) => `<li>${x}</li>`).join("")}</ul></div>`;
  }

  // ---------- DeFi, Juegos, Apps y bots y Otros (maquetas del 23/11 en maquetas/web/ecosistema-*.html, subidas el 25/11) ----------
  const V = EN ? {
    dato: "Fact", tokEn: "token on", sinPrecio: "no price", noAplica: "n/a", vsMes: " vs prev. month",
    copias: (n) => `⚠ On Solana there are only copies with this name (${n})`, fuera: "Earns mostly outside Solana",
    devQ: (p) => `Returns ${p}% of what it keeps to the token`, devC: (p) => `Returns ${p}% of what it charges to the token`,
    vx: (x) => `Its token is worth ${x} times what it earns in a year`, vxC: (x) => `Its token is worth ${x} times what it charges in a year`,
    vxPoco: (v, m) => `Its token is worth ${v} and it charges ${m} a month on Solana`,
    bloq: (b) => `${b}% still locked`, masMes: (m) => `Charges more than last month with the market at ${m}`, pierde: "Losing usage faster than the market",
    deQueda: (p) => `${p}% of what it keeps`, deCobra: (p) => `${p}% of what it charges`,
    proy: (n) => n === 1 ? "1 project" : n + " projects", cobran: (m) => ` · charge ${m} in 30 days`, depos: (m) => ` · ${m} deposited`, verOtros: (n) => `See the other ${n}`,
    mano: (s) => `Taken by hand from ${s}, 24 Nov 2026`,
    mes: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], aud: "✓ audited", bloqT: (b, l) => `${b}% still locked${l ? ", releases " + l + "% this month" : ""}`,
    hack: (f, p) => `Hacked in ${f}: ${p} lost`, perd: (p) => p + " lost", devuelto: "returned",
    rH: "Risks this month", rS: "Tokens that unlock and protocols hacked in the last year.", rDl: "🔓 Unlocks this month", rHk: "⚠ Hacked in the last year",
    suelta: (l, b) => `releases <em>${l}%</em> of the total · ${b}% still locked`, nada: "Nothing this month", ninguno: "None",
    df: { th: ["Project", "Charges · 30 d", "Keeps", "Deposited", "Back to the token", "Token", "Value × revenue", "Signal"],
      sub: { DEX: "where tokens are swapped", Agregadores: "find the best price across all DEXs", Staking: "SOL that works and earns interest", MEV: "transaction ordering and its tips",
        "Préstamos": "borrow and lend against collateral", Derivados: "futures and leverage", Puentes: "move money between chains", "Oráculos": "prices and data for contracts",
        Rendimiento: "vaults and strategies that chase yield", Liquidez: "manage liquidity positions", Predicciones: "bet on outcomes" },
      dato: (a, b, n, r) => `Of every $100 Solana DeFi charges, ${a} go to Pump.fun and ${b} to Jupiter. The other ${n} projects share ${r}.`, de100: (n) => `${n} of 100`,
      vH: "What goes back to holders", vS: "Buybacks or payouts in the last 30 days: the business money that reaches the token.",
      src: (f) => `“Charges”: fees users pay in 30 days. “Keeps”: the part the protocol keeps (the rest goes to liquidity providers or validators). “Back to the token”: buybacks or payouts to holders in 30 days. “Deposited”: money inside the protocol on Solana. “Value × revenue”: its token's value divided by what it keeps in a year. All from DefiLlama and Solana only; market cap from CoinGecko. Data from ${f}; not recommendations.`,
      queH: "What we check in a DeFi protocol", queS: "Being widely used doesn't mean its token wins:", queL: ["How much of what it charges does it keep?", "Does anything reach the token?", "How much is left to unlock", "Who can change the contracts?", "Audits and hacks"], nav: "DeFi groups" },
    jg: { th: ["Project", "Usage", "Token", "Back to the token", "Who holds it", "Traders 24 h", "Signal"],
      gr: [["Cartas físicas", "Physical cards,", "real cards stored in a vault and turned into tokens"], ["Minería con juego", "Gamified mining,", "mining a token by playing rounds on-chain"], ["Juegos", "Games,", "games with their own token"], ["Azar", "Games of chance,", "casinos, betting and roulettes"]],
      cobra: "charges 30 d", vale: "worth", h24: " 24 h", y: " and ",
      dato: (ns, v, n, c, m, t) => `The 3 most valuable game tokens (${ns}: ${v} together) were traded by ${n} people in 24 h. ${c}, which charges ${m} a month, had ${t}.`,
      src: (f) => `“Usage”: what it charges in 30 days (DefiLlama, Solana only) or, if it charges nothing measurable, what its token is worth (CoinGecko). “Back to the token”: buybacks or payouts to holders in 30 days (DefiLlama). Holders and traders: Jupiter (organic = buyers that don't look like bots). Unlocks: Streamflow. Data from ${f}; not recommendations.`,
      queH: "What we check in a game token", queS: "Many have a token and hardly any players:", queL: ["Can you play it today?", "How many people really trade it", "How much is left to unlock", "If it charges, does the token gain from it?", "Is it a game or a casino?"] },
    ab: { th: ["Project", "Charges · 30 d", "Keeps", "Share of group", "Vs. market", "Token", "Signal"],
      gr: [["Apps de trading", "Trading apps,", "web terminals to buy and sell"], ["Bots de Telegram", "Telegram bots,", "buy and sell from the chat"], ["Wallets", "Wallets,", "where you keep your tokens and sign"], ["Datos", "Data,", "charts and token lists"]],
      tot: (m, n) => `${m} in 30 days among ${n}`,
      dato: (v, a, b, s, n) => `Trading apps charge ${v} times more than Telegram bots: ${a} vs ${b} in 30 days. And ${s} of ${n} have no token: using them has nothing to do with buying one.`,
      src: (mk, f) => `Fees and what each one keeps: DefiLlama (only what's charged on Solana). “Share of group”: its part of what the whole group charges. “Vs. market”: how much it changed in 30 days compared with all Solana fees (${mk}). Market cap: CoinGecko. Data from ${f}; not recommendations.`,
      queH: "What we check in an app or a bot", queS: "Using it means giving it power over your money:", queL: ["Who holds your keys?", "How much it charges per trade", "If it has a token, does it gain from the business?", "Hacks and key leaks", "Copy trading: who's on the other side"] },
    ot: { th: ["Project", "Charges · 30 d", "Keeps", "Back to the token", "Token", "Traders 24 h", "Value × revenue", "Signal"],
      sub: { DePIN: "networks of real devices paid for their use", "Privacidad": "hide balances and transfers", Pagos: "get paid, pay and distribute tokens", Herramientas: "what other projects use to work", Social: "news and networks" },
      dato: (m, p, v, x) => `Render Network charges the most in this section (${m} in 30 days) and returns ${p}% to the token. Even so, its token is worth ${v}: ${x} times what it earns in a year.`,
      src: (f) => `“Charges”: fees users pay in 30 days. “Keeps”: the part the protocol keeps. “Back to the token”: buybacks or payouts to holders in 30 days. “Value × revenue”: its token's value divided by what it keeps in a year. Fees: DefiLlama (Solana only). Market cap: CoinGecko. Traders: Jupiter. Data from ${f}; not recommendations.`,
      queH: "What we check here", queS: "Each group is a different business:", queL: ["Are there real devices or users behind it?", "Does anything reach the token?", "Privacy: who controls the contract?", "How much is left to unlock", "How many people really trade it"] },
  } : {
    dato: "Dato", tokEn: "token en", sinPrecio: "sin precio", noAplica: "no aplica", vsMes: " vs mes ant.",
    copias: (n) => `⚠ En Solana solo hay copias con este nombre (${n})`, fuera: "Cobra sobre todo fuera de Solana",
    devQ: (p) => `Devuelve al token el ${p} % de lo que se queda`, devC: (p) => `Devuelve al token el ${p} % de lo que cobra`,
    vx: (x) => `Su token vale ${x} veces lo que ingresa en un año`, vxC: (x) => `Su token vale ${x} veces lo que cobra en un año`,
    vxPoco: (v, m) => `Su token vale ${v} y en Solana cobra ${m} al mes`,
    bloq: (b) => `${b} % aún bloqueado`, masMes: (m) => `Cobra más que el mes pasado con el mercado en ${m}`, pierde: "Pierde uso más rápido que el mercado",
    deQueda: (p) => `${p} % de lo que se queda`, deCobra: (p) => `${p} % de lo que cobra`,
    proy: (n) => n === 1 ? "1 proyecto" : n + " proyectos", cobran: (m) => ` · cobran ${m} en 30 días`, depos: (m) => ` · ${m} depositados`, verOtros: (n) => `Ver los otros ${n}`,
    mano: (s) => `Dato a mano de ${s}, 24/11/2026`,
    mes: ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sep.", "oct.", "nov.", "dic."], aud: "✓ auditado", bloqT: (b, l) => `${b} % aún bloqueado${l ? ", suelta " + l + " % este mes" : ""}`,
    hack: (f, p) => `Hackeado en ${f}: ${p} perdidos`, perd: (p) => p + " perdidos", devuelto: "devuelto",
    rH: "Riesgos de este mes", rS: "Tokens que se desbloquean y protocolos hackeados en el último año.", rDl: "🔓 Se desbloquea este mes", rHk: "⚠ Hackeados en el último año",
    suelta: (l, b) => `suelta <em>${l} %</em> del total · quedan ${b} % bloqueados`, nada: "Nada este mes", ninguno: "Ninguno",
    df: { th: ["Proyecto", "Cobra · 30 d", "Se queda", "Depositado", "Devuelve al token", "Token", "Vale × ingresos", "Señal"],
      sub: { DEX: "donde se cambian tokens", Agregadores: "buscan el mejor precio entre todos los DEX", Staking: "SOL que trabaja y cobra intereses", MEV: "el orden de las transacciones y sus propinas",
        "Préstamos": "pedir y prestar con garantía", Derivados: "futuros y apalancamiento", Puentes: "mover dinero entre cadenas", "Oráculos": "precios y datos para los contratos",
        Rendimiento: "bóvedas y estrategias que buscan intereses", Liquidez: "gestionar posiciones de liquidez", Predicciones: "apostar a resultados" },
      dato: (a, b, n, r) => `De cada 100 $ que cobra la DeFi de Solana, ${a} se los lleva Pump.fun y ${b} Jupiter. Los otros ${n} proyectos se reparten ${r}.`, de100: (n) => `${n} de 100`,
      vH: "Lo que vuelve a los titulares", vS: "Recompras o reparto de los últimos 30 días: el dinero del negocio que llega al token.",
      src: (f) => `«Cobra»: comisiones que pagan los usuarios en 30 días. «Se queda»: la parte que se queda el protocolo (el resto va a quien pone la liquidez o a los validadores). «Devuelve al token»: recompras o reparto a titulares en 30 días. «Depositado»: dinero dentro del protocolo en Solana. «Vale × ingresos»: lo que vale su token dividido entre lo que se queda en un año. Todo de DefiLlama y solo en Solana; capitalización de CoinGecko. Datos del ${f}; no son recomendaciones.`,
      queH: "Qué miramos en un protocolo DeFi", queS: "Que se use mucho no significa que su token gane:", queL: ["¿Cuánto se queda de lo que cobra?", "¿Llega algo al token?", "Cuánto queda por desbloquear", "¿Quién puede cambiar los contratos?", "Auditorías y hackeos"], nav: "Grupos de DeFi" },
    jg: { th: ["Proyecto", "Uso", "Token", "Devuelve al token", "Quién la tiene", "Traders 24 h", "Señal"],
      gr: [["Cartas físicas", "Cartas físicas,", "cartas reales guardadas en una cámara y convertidas en tokens"], ["Minería con juego", "Minería con juego,", "minar un token jugando rondas en la cadena"], ["Juegos", "Juegos,", "juegos con su propio token"], ["Azar", "Azar,", "casinos, apuestas y ruletas"]],
      cobra: "cobra 30 d", vale: "vale", h24: " 24 h", y: " y ",
      dato: (ns, v, n, c, m, t) => `Los 3 tokens de juegos que más valen (${ns}: ${v} juntos) los movieron ${n} personas en 24 h. ${c}, que cobra ${m} al mes, tuvo ${t}.`,
      src: (f) => `«Uso»: lo que cobra en 30 días (DefiLlama, solo en Solana) o, si no cobra nada medible, lo que vale su token (CoinGecko). «Devuelve al token»: recompras o reparto a titulares en 30 días (DefiLlama). Titulares y traders: Jupiter (orgánicos = compradores que no parecen bots). Desbloqueos: Streamflow. Datos del ${f}; no son recomendaciones.`,
      queH: "Qué miramos en un token de juego", queS: "Muchos tienen token y casi ningún jugador:", queL: ["¿Se puede jugar hoy?", "Cuánta gente lo mueve de verdad", "Cuánto queda por desbloquear", "Si cobra, ¿gana el token con ello?", "¿Es un juego o un casino?"] },
    ab: { th: ["Proyecto", "Cobra · 30 d", "Se queda", "Cuota del grupo", "Vs. mercado", "Token", "Señal"],
      gr: [["Apps de trading", "Apps de trading,", "terminales web para comprar y vender"], ["Bots de Telegram", "Bots de Telegram,", "comprar y vender desde el chat"], ["Wallets", "Wallets,", "donde guardas tus tokens y firmas"], ["Datos", "Datos,", "gráficas y listas de tokens"]],
      tot: (m, n) => `${m} en 30 días entre ${n}`,
      dato: (v, a, b, s, n) => `Las apps de trading cobran ${v} veces más que los bots de Telegram: ${a} frente a ${b} en 30 días. Y ${s} de ${n} no tienen token: usarlas no tiene nada que ver con comprar uno.`,
      src: (mk, f) => `Comisiones y lo que se queda cada uno: DefiLlama (solo lo cobrado en Solana). «Cuota del grupo»: su parte de lo que cobra todo el grupo. «Vs. mercado»: cuánto cambió en 30 días comparado con todas las comisiones de Solana (${mk}). Capitalización: CoinGecko. Datos del ${f}; no son recomendaciones.`,
      queH: "Qué miramos en una app o un bot", queS: "Usarla es darle permiso sobre tu dinero:", queL: ["¿Quién guarda tus claves?", "Cuánto cobra por operación", "Si tiene token, ¿gana con el negocio?", "Hackeos y fugas de claves", "Copiar operaciones: quién está al otro lado"] },
    ot: { th: ["Proyecto", "Cobra · 30 d", "Se queda", "Devuelve al token", "Token", "Traders 24 h", "Vale × ingresos", "Señal"],
      sub: { DePIN: "redes de aparatos reales que cobran por su uso", "Privacidad": "esconder saldos y movimientos", Pagos: "cobrar, pagar y repartir tokens", Herramientas: "lo que usan otros proyectos para funcionar", Social: "noticias y redes" },
      dato: (m, p, v, x) => `Render Network es el que más cobra de este apartado (${m} en 30 días) y devuelve al token el ${p} %. Aun así, su token vale ${v}: ${x} veces lo que ingresa en un año.`,
      src: (f) => `«Cobra»: comisiones que pagan los usuarios en 30 días. «Se queda»: la parte que se queda el protocolo. «Devuelve al token»: recompras o reparto a titulares en 30 días. «Vale × ingresos»: lo que vale su token dividido entre lo que se queda en un año. Comisiones: DefiLlama (solo Solana). Capitalización: CoinGecko. Traders: Jupiter. Datos del ${f}; no son recomendaciones.`,
      queH: "Qué miramos aquí", queS: "Cada grupo es un negocio distinto:", queL: ["¿Hay aparatos o usuarios reales detrás?", "¿Llega algo al token?", "Privacidad: ¿quién controla el contrato?", "Cuánto queda por desbloquear", "Cuánta gente lo mueve de verdad"] },
  };
  // tokens de proyectos que cobran sobre todo en otras cadenas: aquí solo contamos Solana, así que «vale × ingresos» engaña
  const MULTI = new Set(["CAKE", "FLUID", "GMX", "ACX", "THOR", "DBR", "W", "EDGE"]);
  // grupos sin depósitos (y HumidiFi, que pone su propio dinero): «no aplica» en vez de «—»
  const SIN_DEP = new Set(["Agregadores", "Puentes", "MEV", "Oráculos", "Predicciones"]);
  const fmv = (n) => n == null ? "—" : n < 1e3 ? (EN ? "$" + Math.round(n) : Math.round(n) + " $") : fm(n);
  const pcv = (x) => (x > 0 ? "+" : "") + Math.round(x * 100) + sp + "%";
  const dec0 = (x) => num(x, x < 10 ? 1 : 0);
  const fechaV = () => new Date(D.fecha).toLocaleDateString(EN ? "en-GB" : "es-ES");
  const sumaV = (l, k) => l.reduce((s, r) => s + (r[k] || 0), 0);
  const goV = (r) => tok(r) ? `<a class="go" href="${tok(r)}">${T.vale}</a>` : `<span class="go"></span>`;
  const nomV = (r) => { const h = tok(r), n = esc(r.n === "Render Network BME" ? "Render Network" : r.n); return `<span class="mz-n"><b>${h ? `<a href="${h}">${n}</a>` : n}</b></span>`; };
  const sinV = `<span class="ab-sin">${T.sinTok}</span>`;
  const cadV = (r) => `<span class="cad"><small>${V.tokEn}</small><b>${esc(r.cad)}</b>${r.gecko ? `<a href="https://www.coingecko.com/${EN ? "en/coins" : "es/monedas"}/${esc(r.gecko)}" target="_blank" rel="noopener">CoinGecko ↗</a>` : ""}</span>`;
  const tokV = (r) => r.cad ? cadV(r) : r.tok ? `<span class="df-tok"><b>${esc(r.sym)}</b><small>${r.mcap ? fm(r.mcap) : V.sinPrecio}</small>${qMini(r)}</span>` : sinV;
  // barra pequeña de «quién la tiene» debajo del token (DeFi, Apps y bots, Otros), con la mayor wallet en el título
  const qMini = (r) => { const q = qzDe(r); if (!q) return ""; const resto = Math.max(0, 100 - q.top10w - (q.proy || 0) - q.exch - q.pools), p = mnDe(q);
    return `<span class="mq-bar mq-mini" title="${esc((p ? p.rol + " · " + p.n + ": " : "") + MZ.barT(num(q.top10w, 1), num(q.exch, 1), num(q.pools, 1)))}"><i class="w" style="width:${q.top10w}%"></i><i class="j" style="width:${q.proy || 0}%"></i><i class="x" style="width:${q.exch}%"></i><i class="p" style="width:${q.pools}%"></i><i class="r" style="width:${resto}%"></i></span>`; };
  const manoV = (t) => t ? `<small class="mano" title="${esc(V.mano(t.src))}">${esc(EN ? t.en : t.es)}</small>` : "";
  const cambioV = (r) => `<small><span class="${(r.c || 0) >= 0 ? "up" : "dn"}">${r.c == null ? "&nbsp;" : pcv(r.c) + V.vsMes}</span></small>`;
  const datoV = (b, p) => `<div class="mz-dato"><span class="mz-k">${V.dato}</span><b>${b}</b><p>${p}</p></div>`;
  const queV = (q) => `<div class="mz-que"><div class="top"><b>${q.queH}</b><span>${q.queS}</span></div><ul>${q.queL.map((x) => `<li>${x}</li>`).join("")}</ul></div>`;
  const tit2 = (t, s, tot) => `<h2>${t} <small>${s}</small><span class="ab-tot">${tot}</span></h2>`;
  // filas del apartado con lo que viene de perfiles.json (devuelve al token, desbloqueos)
  const deApV = (a) => D.rows.filter((r) => r.ap === a).map((r) => { const p = (PERF && r.mint && PERF[r.mint]) || {}, ing = r.r30 || null;
    return Object.assign({}, r, { h30: p.h30 ?? null, dl: p.dl || null, hk: r.hk || p.hk || null, aud: r.aud || p.aud || null, ing, cap: r.mcap || (r.med === "token" ? r.m : null),
      rel: r.med === "fees" && r.c != null && D.mercado.fees != null ? (1 + r.c) / (1 + D.mercado.fees) - 1 : null,
      vx: r.tok && !r.cad && r.mcap && ing >= 1e3 && !MULTI.has(r.sym) ? r.mcap / (ing * 12) : null }); });
  const devV = (r) => r.h30 ? `${fm(r.h30)}<small>${r.ing ? V.deQueda(Math.min(100, Math.round(r.h30 / r.ing * 100))) : "&nbsp;"}</small>` : `<span class="mz-na">—</span>`;
  const vxV = (r) => r.vx != null ? `${dec0(r.vx)}×` : `<span class="mz-na">—</span>`;
  const MK = () => pcv(D.mercado.fees || 0);
  let navIO = null;

  // riesgos de DeFi (25/11, maqueta maquetas/web/ecosistema-defi-riesgos.html): el hackeo va arriba (tira y señal), bajo el nombre solo desbloqueo y auditoría
  const fechaHk = (d) => { const x = new Date(d * 1000); return V.mes[x.getUTCMonth()] + " " + x.getUTCFullYear(); };
  const hkUlt = (r) => r.hk && r.hk.length ? r.hk.slice().sort((a, b) => b.d - a.d)[0] : null;
  const hkAnio = (r) => { const h = hkUlt(r); return h && Date.now() / 1000 - h.d < 365 * 86400 ? h : null; };
  const rgsV = (r) => { const o = [];
    if (r.dl && r.dl.bloq >= 0.5) o.push(`<span class="rg rg-d" title="${esc(V.bloqT(num(r.dl.bloq, 1), r.dl.lib >= 0.1 ? num(r.dl.lib, 1) : ""))}">🔓 ${num(r.dl.bloq, 1)}${sp}%</span>`);
    if (r.aud) o.push(`<span class="rg rg-a">${V.aud}</span>`);
    return o.length ? `<small class="rgs">${o.join("")}</small>` : ""; };
  function defiVista() {
    const rs = deApV("DeFi"), q = V.df; pideQZ();
    const senal = (r) => {
      const hy = hkAnio(r); if (hy && hy.p >= 1e5) return `<span class="mz-sen mz-r">${V.hack(fechaHk(hy.d), fm(hy.p))}</span>`;
      const sb = senalB(r); if (sb) return sb;
      if (r.cad) return r.copias ? `<span class="mz-sen mz-a">${V.copias(r.copias)}</span>` : `<span class="mz-sen mz-a">${V.fuera}</span>`;
      if (r.h30 && r.ing && r.h30 / r.ing >= 0.3 && r.h30 >= 50e3) return `<span class="mz-sen mz-v">${V.devQ(Math.min(100, Math.round(r.h30 / r.ing * 100)))}</span>`;
      if (r.tok && MULTI.has(r.sym)) return `<span class="mz-sen mz-a">${V.fuera}</span>`;
      if (r.vx != null && r.vx >= 50) return `<span class="mz-sen mz-r">${V.vx(num(r.vx))}</span>`;
      if (r.dl && r.dl.bloq >= 10) return `<span class="mz-sen mz-a">${V.bloq(num(r.dl.bloq))}</span>`;
      if (r.c != null && r.c > 0 && r.m >= 50e3) return `<span class="mz-sen mz-v">${V.masMes(MK())}</span>`;
      if (r.rel != null && r.rel <= -0.4 && r.m >= 10e3) return `<span class="mz-sen mz-a">${V.pierde}</span>`;
      return "<span></span>"; };
    const dep = (r) => r.tvl ? fm(r.tvl) : r.mano && r.mano.dep ? manoV(r.mano.dep) : SIN_DEP.has(r.gr) || r.n === "HumidiFi" ? `<span class="mz-na">${V.noAplica}</span>` : "—";
    const queda = (r) => (r.r30 != null ? fmv(r.r30) : "—") + (r.mano ? manoV(r.mano.q) : "");
    const fila = (r, i) => `<div class="mz-t df"><span class="mz-i">${i + 1}</span>${av(r)}${nomV(r).slice(0, -7) + rgsV(r) + "</span>"}<span class="mz-x">${fmv(r.m)}${cambioV(r)}</span>` +
      `<span class="mz-x">${queda(r)}</span><span class="mz-x df-tvl">${dep(r)}</span><span class="mz-x df-dev">${devV(r)}</span>${tokV(r)}<span class="mz-x df-vx">${vxV(r)}</span>${senal(r)}${goV(r)}</div>`;
    const head = `<div class="mz-t df mz-h"><span class="mz-i"></span><span></span><span>${q.th[0]}</span><span>${q.th[1]}</span><span>${q.th[2]}</span><span class="df-tvl">${q.th[3]}</span><span class="df-dev">${q.th[4]}</span><span class="df-tk">${q.th[5]}</span><span class="df-vx">${q.th[6]}</span><span class="df-sen">${q.th[7]}</span><span class="go"></span></div>`;
    const grupos = [...new Set(rs.map((r) => r.gr))].map((g) => ({ g, l: rs.filter((r) => r.gr === g).sort((a, b) => (b.m || 0) - (a.m || 0)) })).sort((a, b) => sumaV(b.l, "m") - sumaV(a.l, "m"));
    const slug = (g) => "g-" + g.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const nav = `<nav class="df-nav" aria-label="${q.nav}">${grupos.map(({ g, l }) => `<a href="#${slug(g)}">${esc(grNom(g))}<em>${l.length}</em></a>`).join("")}</nav>`;
    const tarj = grupos.map(({ g, l }) => { const resto = l.slice(5);
      return `<section class="mz-card df-g" id="${slug(g)}">${tit2(esc(grNom(g)) + ",", q.sub[g] || "", V.proy(l.length) + V.cobran(fm(sumaV(l, "m"))) + (sumaV(l, "tvl") ? V.depos(fm(sumaV(l, "tvl"))) : ""))}${head}` +
        l.slice(0, 5).map(fila).join("") + (resto.length ? `<details class="df-mas"><summary>${V.verOtros(resto.length)}</summary>${resto.map((r, i) => fila(r, i + 5)).join("")}</details>` : "") + `</section>`; }).join("");
    const tot = sumaV(rs, "m"), pf = rs.find((r) => r.n === "Pump.fun"), jup = rs.find((r) => r.n === "Jupiter");
    let dato = "";
    if (pf && jup && tot) { const c1 = Math.round(pf.m / tot * 100), c2 = Math.round((pf.m + jup.m) / tot * 100); dato = datoV(q.de100(c2), q.dato(c1, c2 - c1, rs.length - 2, 100 - c2)); }
    const dev = rs.filter((r) => r.h30 && r.h30 >= 50e3).sort((a, b) => b.h30 - a.h30).slice(0, 8);
    const tira = dev.length ? `<section class="df-vuelve"><div class="top"><b>${q.vH}</b><span>${q.vS}</span></div>` + dev.map((r) => `<div class="fv">${av(r)}<span class="fv-n">${esc(r.sym)}</span><span class="fv-b"><i style="width:${Math.max(2, Math.round(r.h30 / dev[0].h30 * 100))}%"></i></span><span class="fv-v">${fm(r.h30)}</span><span class="fv-p">${MULTI.has(r.sym) ? V.fuera : r.ing ? V.deQueda(Math.min(100, Math.round(r.h30 / r.ing * 100))) : ""}</span></div>`).join("") + `</section>` : "";
    const dlMes = rs.filter((r) => r.dl && r.dl.lib >= 0.1).sort((a, b) => b.dl.lib - a.dl.lib);
    const hk12 = rs.filter(hkAnio).sort((a, b) => hkUlt(b).d - hkUlt(a).d);
    const riesgo = dlMes.length || hk12.length ? `<section class="df-riesgo"><div class="top"><b>${V.rH}</b><span>${V.rS}</span></div><div class="rcols">` +
      `<div><h4>${V.rDl}</h4>${dlMes.map((r) => `<div class="ri">${av(r)}<b>${esc(r.sym || r.n)}</b><span>${V.suelta(num(r.dl.lib, 1), num(r.dl.bloq, 1))}</span></div>`).join("") || `<p class="mz-na">${V.nada}</p>`}</div>` +
      `<div><h4>${V.rHk}</h4>${hk12.map((r) => { const h = hkUlt(r); return `<div class="ri">${av(r)}<b>${esc(r.n)}</b><span>${fechaHk(h.d)} · <em class="r">${h.p >= 1e5 ? V.perd(fm(h.p)) : V.devuelto}</em></span></div>`; }).join("") || `<p class="mz-na">${V.ninguno}</p>`}</div></div></section>` : "";
    $("#lista").innerHTML = nav + dato + tira + riesgo + tarj + `<p class="mz-src">${q.src(fechaV())}</p>` + queV(q);
    // la píldora del grupo que se está viendo, encendida
    if (navIO) navIO.disconnect();
    const as = [...document.querySelectorAll(".df-nav a")], vis = new Map();
    navIO = new IntersectionObserver((es) => { es.forEach((e) => vis.set(e.target.id, e.isIntersecting ? e.intersectionRect.height : 0));
      let best = null, h = 0; vis.forEach((v, k) => { if (v > h) { h = v; best = k; } });
      as.forEach((a) => { const on = a.getAttribute("href") === "#" + best; a.classList.toggle("on", on); if (on && a.parentNode.scrollWidth > a.parentNode.clientWidth) a.parentNode.scrollLeft = a.offsetLeft - a.parentNode.clientWidth / 2 + a.offsetWidth / 2; }); },
      { rootMargin: "-140px 0px -40% 0px", threshold: [0, .1, .3, .6, 1] });
    document.querySelectorAll(".df-g").forEach((s) => navIO.observe(s));
  }

  function juegosVista() {
    const rs = deApV("Juegos"), q = V.jg; pideQZ();
    const senal = (r) => { const sb = senalB(r); if (sb) return sb;
      if (r.trad != null && r.trad < 50 && r.cap >= 1e6) return `<span class="mz-sen mz-r">${IA.pocos(fm(r.cap), r.trad)}</span>`;
      if (r.trad >= 50 && r.org != null && r.org / r.trad < 0.02) return `<span class="mz-sen mz-r">${IA.bots(fm(r.cap))}</span>`;
      if (r.med === "fees" && r.h30 && r.m && r.h30 / r.m >= 0.5) return `<span class="mz-sen mz-v">${V.devC(Math.round(r.h30 / r.m * 100))}</span>`;
      if (r.dl && r.dl.bloq >= 10) return `<span class="mz-sen mz-a">${IA.bloq(num(r.dl.bloq), r.dl.lib >= 0.1 ? num(r.dl.lib, 1) : "")}</span>`;
      if (r.med === "fees" && r.c != null && r.c > 0 && r.m >= 1e3) return `<span class="mz-sen mz-v">${V.masMes(MK())}</span>`;
      if (r.rel != null && r.rel <= -0.4) return `<span class="mz-sen mz-a">${V.pierde}</span>`;
      return "<span></span>"; };
    const fila = (r, i) => {
      const uso = r.med === "fees" ? `${fmv(r.m)}<small>${q.cobra} · <span class="${(r.c || 0) >= 0 ? "up" : "dn"}">${r.c == null ? "" : pcv(r.c)}</span></small>`
        : `${fm(r.cap)}<small>${q.vale} · <span class="${(r.c24 || 0) >= 0 ? "up" : "dn"}">${r.c24 == null ? "" : pcv(r.c24) + q.h24}</span></small>`;
      const dev = r.med === "fees" && r.h30 && r.m ? `${fm(r.h30)}<small>${V.deCobra(Math.round(r.h30 / r.m * 100))}</small>` : `<span class="mz-na">—</span>`;
      const tk = r.cad ? cadV(r) : r.tok ? `<b class="jg-sym">${esc(r.sym)}</b>` : sinV;
      return `<div class="mz-t jg"><span class="mz-i">${i + 1}</span>${av(r)}${nomV(r)}<span class="mz-x">${uso}</span><span class="jg-tk">${tk}</span><span class="mz-x jg-dev">${dev}</span>` +
        quienCel(r, "jg-q", true) + `<span class="mz-x">${r.trad != null ? fk(r.trad) : "—"}<small>${r.org != null ? MZ.org(r.org) : "&nbsp;"}</small></span>${senal(r)}${goV(r)}</div>`; };
    const head = `<div class="mz-t jg mz-h"><span class="mz-i"></span><span></span><span>${q.th[0]}</span><span>${q.th[1]}</span><span class="jg-tk">${q.th[2]}</span><span class="jg-dev">${q.th[3]}</span><span class="jg-q">${q.th[4]}</span><span>${q.th[5]}</span><span class="jg-sen">${q.th[6]}</span><span class="go"></span></div>`;
    const tarj = q.gr.map(([g, t1, t2]) => {
      const tf = g === "Juegos" || g === "Azar" ? -1 : 1;
      const l = rs.filter((r) => r.gr === g).sort((a, b) => tf * ((b.med === "fees") - (a.med === "fees")) || (b.med === "fees" ? (b.m || 0) - (a.m || 0) : (b.cap || 0) - (a.cap || 0)));
      if (!l.length) return "";
      const cob = sumaV(l.filter((r) => r.med === "fees"), "m");
      return `<section class="mz-card">${tit2(t1, t2, V.proy(l.length) + (cob ? V.cobran(fm(cob)) : ""))}${head}${l.map(fila).join("")}</section>`; }).join("");
    const top3 = rs.filter((r) => r.med === "token" && r.cap).sort((a, b) => b.cap - a.cap).slice(0, 3);
    const cc = rs.filter((r) => r.med === "fees").sort((a, b) => (b.m || 0) - (a.m || 0))[0];
    let dato = "";
    if (top3.length === 3 && cc && cc.trad != null) { const nT = sumaV(top3, "trad"), ns = top3.map((r) => r.n).join(", ").replace(/, ([^,]*)$/, q.y + "$1");
      dato = datoV(num(nT), q.dato(esc(ns), fm(sumaV(top3, "cap")), num(nT), esc(cc.n), fm(cc.m), num(cc.trad))); }
    $("#lista").innerHTML = dato + tarj + `<p class="mz-src">${q.src(fechaV())}</p>` + queV(q);
  }

  function appsVista() {
    const rs = deApV("Apps y bots"), q = V.ab; pideQZ();
    const senal = (r) => { const sb = senalB(r); if (sb) return sb;
      if (r.cad) return r.copias ? `<span class="mz-sen mz-a">${V.copias(r.copias)}</span>` : `<span class="mz-sen mz-a">${V.fuera}</span>`;
      if (r.tok && r.mcap && r.m) { const x = r.mcap / (r.m * 12);
        if (r.m < 5e3) return `<span class="mz-sen mz-a">${V.vxPoco(fm(r.mcap), fmv(r.m))}</span>`;
        return `<span class="mz-sen ${x >= 20 ? "mz-r" : "mz-a"}">${V.vxC(x >= 20 ? num(x) : num(x, 1))}</span>`; }
      if (r.c != null && r.c > 0) return `<span class="mz-sen mz-v">${V.masMes(MK())}</span>`;
      if (r.rel != null && r.rel <= -0.4) return `<span class="mz-sen mz-a">${V.pierde}</span>`;
      return "<span></span>"; };
    const fila = (r, i, tot) => { const cu = tot ? r.m / tot : 0;
      const tk = r.cad ? cadV(r) : r.tok ? `<span class="ab-tok">${esc(r.sym)}<small>${r.mcap ? fm(r.mcap) : V.sinPrecio}</small>${qMini(r)}</span>` : sinV;
      return `<div class="mz-t ab"><span class="mz-i">${i + 1}</span>${av(r)}${nomV(r)}<span class="mz-x">${fmv(r.m)}${cambioV(r)}</span><span class="mz-x ab-q">${r.r30 ? fmv(r.r30) : "—"}</span>` +
        `<span class="ab-cuota"><i style="width:${Math.max(2, Math.round(cu * 100))}%"></i><em>${cu >= 0.01 ? Math.round(cu * 100) + sp + "%" : "&lt;1" + sp + "%"}</em></span>` +
        `<span class="ab-relc">${r.rel == null ? "" : `<span class="ab-rel ${r.rel >= 0 ? "up" : "dn"}">${pcv(r.rel)}</span>`}</span>${tk}${senal(r)}${goV(r)}</div>`; };
    const head = `<div class="mz-t ab mz-h"><span class="mz-i"></span><span></span><span>${q.th[0]}</span><span>${q.th[1]}</span><span class="ab-q">${q.th[2]}</span><span class="ab-cuota-h">${q.th[3]}</span><span class="ab-relc">${q.th[4]}</span><span class="ab-tok-h">${q.th[5]}</span><span class="ab-sen-h">${q.th[6]}</span><span class="go"></span></div>`;
    const tarj = q.gr.map(([g, t1, t2]) => { const l = rs.filter((r) => r.gr === g).sort((a, b) => (b.m || 0) - (a.m || 0)), tot = sumaV(l, "m");
      return l.length ? `<section class="mz-card">${tit2(t1, t2, q.tot(fm(tot), l.length))}${head}${l.map((r, i) => fila(r, i, tot)).join("")}</section>` : ""; }).join("");
    const apps = sumaV(rs.filter((r) => r.gr === "Apps de trading"), "m"), bots = sumaV(rs.filter((r) => r.gr === "Bots de Telegram"), "m");
    const veces = bots ? Math.round(apps / bots) : 0;
    $("#lista").innerHTML = (veces >= 2 ? datoV(veces + "×", q.dato(veces, fm(apps), fm(bots), rs.filter((r) => !r.tok).length, rs.length)) : "") + tarj +
      `<p class="mz-src">${q.src(MK(), fechaV())}</p>` + queV(q);
  }

  function otrosVista() {
    const rs = deApV("Otros"), q = V.ot; pideQZ();
    const senal = (r) => { const sb = senalB(r); if (sb) return sb;
      if (r.trad != null && r.trad < 50 && r.cap >= 1e6) return `<span class="mz-sen mz-r">${IA.pocos(fm(r.cap), r.trad)}</span>`;
      if (r.h30 && r.ing && r.h30 / r.ing >= 0.3 && r.h30 >= 30e3) return `<span class="mz-sen mz-v">${V.devQ(Math.min(100, Math.round(r.h30 / r.ing * 100)))}</span>`;
      if (r.vx != null && r.vx >= 50) return `<span class="mz-sen mz-r">${V.vx(num(r.vx))}</span>`;
      if (r.c != null && r.c > 0 && r.m >= 30e3) return `<span class="mz-sen mz-v">${V.masMes(MK())}</span>`;
      if (r.rel != null && r.rel <= -0.4 && r.m >= 10e3) return `<span class="mz-sen mz-a">${V.pierde}</span>`;
      return "<span></span>"; };
    const fila = (r, i) => `<div class="mz-t ot"><span class="mz-i">${i + 1}</span>${av(r)}${nomV(r)}<span class="mz-x">${fmv(r.m)}${cambioV(r)}</span>` +
      `<span class="mz-x ot-q">${r.ing ? fmv(r.ing) : "—"}</span><span class="mz-x ot-dev">${devV(r)}</span>${tokV(r)}` +
      `<span class="mz-x ot-tr">${r.trad != null ? fk(r.trad) : "—"}<small>${r.org != null ? MZ.org(r.org) : "&nbsp;"}</small></span><span class="mz-x ot-vx">${vxV(r)}</span>${senal(r)}${goV(r)}</div>`;
    const head = `<div class="mz-t ot mz-h"><span class="mz-i"></span><span></span><span>${q.th[0]}</span><span>${q.th[1]}</span><span class="ot-q">${q.th[2]}</span><span class="ot-dev">${q.th[3]}</span><span class="ot-tk">${q.th[4]}</span><span class="ot-tr">${q.th[5]}</span><span class="ot-vx">${q.th[6]}</span><span class="ot-sen">${q.th[7]}</span><span class="go"></span></div>`;
    const grupos = [...new Set(rs.map((r) => r.gr))].map((g) => ({ g, l: rs.filter((r) => r.gr === g).sort((a, b) => (b.m || 0) - (a.m || 0)) })).sort((a, b) => sumaV(b.l, "m") - sumaV(a.l, "m"));
    const tarj = grupos.map(({ g, l }) => `<section class="mz-card">${tit2(esc(grNom(g)) + ",", q.sub[g] || "", V.proy(l.length) + V.cobran(fm(sumaV(l, "m"))))}${head}${l.map(fila).join("")}</section>`).join("");
    const rn = rs.find((r) => /^Render Network/.test(r.n));
    const dato = rn && rn.vx && rn.h30 && rn.ing ? datoV(num(rn.vx) + "×", q.dato(fm(rn.m), Math.round(rn.h30 / rn.ing * 100), fm(rn.mcap), num(rn.vx))) : "";
    $("#lista").innerHTML = dato + tarj + `<p class="mz-src">${q.src(fechaV())}</p>` + queV(q);
  }
  const VISTA = { "DeFi": defiVista, "Juegos": juegosVista, "Apps y bots": appsVista, "Otros": otrosVista };

  // ---------- «Todos» (maqueta maquetas/web/ecosistema-todos.html, 25/11): un bloque por apartado con su «Dato», sus mayores
  // con las dos columnas que importan en él y «Ver X ›». DeFi, el más grande, arriba a todo el ancho con más columnas ----------
  const TD = EN ? {
    intro: "The largest in each section and the most striking fact about each one. Pick one to see it in full.",
    sub: { "Meme": "memecoins and where they are born", "Activos tokenizados": "stablecoins, stocks and funds", "DeFi": "DEXs, lending, staking…", "Juegos": "games, cards and chance",
      "IA": "AI agents and projects", "Apps y bots": "trading, wallets and data", "Otros": "DePIN, payments, privacy…" },
    meme: (n) => `of the ${n} new tokens we saw being born were dead after 24 h.`,
    rwa: (c) => `in stablecoins on Solana (${c} vs the previous month). Plus tokenized stocks and funds.`,
    defi: (n) => `Of every $100 Solana DeFi charges, ${n} go to Pump.fun and Jupiter.`, de100: (n) => `${n} of 100`,
    juegos: (c, m, t) => `people traded the 3 most valuable game tokens in 24 h. ${c}, which charges ${m} a month, had ${t}.`,
    ia: "AI tokens show no public code or haven't touched it in over 6 months.", de: (a, b) => `${a} of ${b}`,
    apps: (s, n) => `more is what trading apps charge vs Telegram bots. And ${s} of ${n} have no token.`,
    otros: (p) => `is how many times Render's token is worth what it earns in a year, even though it returns ${p}% to the token.`,
    th: { vale: "Worth · 24 h", trad: "Traders 24 h", sol: "On Solana", d30: "30 days", cobra: "Charges · 30 d", queda: "Keeps", dep: "Deposited", dev: "Back to the token", tok: "Token", uso: "Usage", cod: "Code" },
    circ: "in circulation", tokz: "tokenized", cob30: "charges 30 d", vale: "worth", org: (n) => n + " organic", sinCod: "no code", hoy: "changed today", hace: (d) => d + " d ago", parado: (d) => d + " d idle", el: (p) => p + "%",
  } : {
    intro: "Los mayores de cada apartado y lo más llamativo de cada uno. Elige uno para verlo entero.",
    sub: { "Meme": "las memecoins y dónde nacen", "Activos tokenizados": "stablecoins, acciones y fondos", "DeFi": "DEX, préstamos, staking…", "Juegos": "juegos, cartas y azar",
      "IA": "agentes y proyectos de IA", "Apps y bots": "trading, wallets y datos", "Otros": "DePIN, pagos, privacidad…" },
    meme: (n) => `de los ${n} tokens nuevos que vimos nacer estaban muertos a las 24 h.`,
    rwa: (c) => `en stablecoins en Solana (${c} frente al mes anterior). Además, acciones y fondos tokenizados.`,
    defi: (n) => `De cada 100 $ que cobra la DeFi de Solana, ${n} se los llevan Pump.fun y Jupiter.`, de100: (n) => `${n} de 100`,
    juegos: (c, m, t) => `personas movieron en 24 h los 3 tokens de juegos que más valen. ${c}, que cobra ${m} al mes, tuvo ${t}.`,
    ia: "tokens de IA no enseñan código público o lo tienen parado hace más de 6 meses.", de: (a, b) => `${a} de ${b}`,
    apps: (s, n) => `cobran las apps de trading frente a los bots de Telegram. Y ${s} de ${n} no tienen token.`,
    otros: (p) => `vale el token de Render lo que ingresa en un año, aunque devuelve al token el ${p} %.`,
    th: { vale: "Vale · 24 h", trad: "Traders 24 h", sol: "En Solana", d30: "30 días", cobra: "Cobra · 30 d", queda: "Se queda", dep: "Depositado", dev: "Devuelve al token", tok: "Token", uso: "Uso", cod: "Código" },
    circ: "en circulación", tokz: "tokenizado", cob30: "cobra 30 d", vale: "vale", org: (n) => n + (n === 1 ? " orgánico" : " orgánicos"), sinCod: "sin código", hoy: "cambiado hoy", hace: (d) => "hace " + d + " d", parado: (d) => d + " d parado", el: (p) => "el " + p + sp + "%",
  };
  function todosVista() {
    if (!REG && !regPide) regPide = fetch("https://api.solflag.com/api/lanzaderas").then((r) => r.ok ? r.json() : null).catch(() => null).then((j) => { REG = j || {}; if (ap === "Todos") pinta(); });
    const de = (a) => deApV(a).filter(enTipo).map((r) => Object.assign(r, { cod: (PERF && r.mint && PERF[r.mint] && PERF[r.mint].cod) || null }));
    const top = (l, n) => l.slice().sort((a, b) => (b.m || 0) - (a.m || 0)).slice(0, n || 4);
    const sumaM = (l) => sumaV(l, "m");
    const trad = (r) => `${r.trad != null ? fk(r.trad) : "—"}<small>${r.org != null ? TD.org(r.org) : "&nbsp;"}</small>`;
    const c24 = (r) => `<small><span class="${(r.c24 || 0) >= 0 ? "up" : "dn"}">${r.c24 == null ? "&nbsp;" : pc1(r.c24)}</span></small>`;
    const B = [];
    { // DeFi, a todo el ancho
      const l = de("DeFi"), tot = sumaM(l), pf = l.find((r) => r.n === "Pump.fun"), jp = l.find((r) => r.n === "Jupiter");
      const c2 = pf && jp && tot ? Math.round((pf.m + jp.m) / tot * 100) : null;
      const dep = (r) => r.tvl ? fm(r.tvl) : r.mano && r.mano.dep ? manoV(r.mano.dep) : SIN_DEP.has(r.gr) || r.n === "HumidiFi" ? `<span class="mz-na">${V.noAplica}</span>` : "—";
      B.push({ a: "DeFi", ancho: 1, big: c2 != null ? TD.de100(c2) : "", txt: c2 != null ? TD.defi(c2) : "", th: [TD.th.cobra, TD.th.queda, TD.th.dep, TD.th.dev, TD.th.tok], rs: top(l, 6),
        c: (r) => [`${fmv(r.m)}${cambioV(r)}`, (r.r30 != null ? fmv(r.r30) : "—") + (r.mano ? manoV(r.mano.q) : ""), dep(r), r.h30 ? `${fm(r.h30)}<small>${r.ing ? TD.el(Math.min(100, Math.round(r.h30 / r.ing * 100))) : "&nbsp;"}</small>` : `<span class="mz-na">—</span>`, tokV(r)] });
    }
    { const l = de("Meme").filter((r) => r.gr === "Memecoins"), t = REG && REG.total;
      B.push({ a: "Meme", big: t && t.con ? num(t.muertos / t.con * 100, 1) + sp + "%" : "", txt: t && t.con ? TD.meme(num(t.con)) : "", th: [TD.th.vale, TD.th.trad], rs: top(l), c: (r) => [`${fm(r.m)}${c24(r)}`, trad(r)] }); }
    { const l = de("Activos tokenizados");
      B.push({ a: "Activos tokenizados", big: fm(D.totStables), txt: TD.rwa(pc(D.mercado.circ)), th: [TD.th.sol, TD.th.d30], rs: top(l),
        c: (r) => [`${fm(r.m)}<small>${r.med === "circ" ? TD.circ : TD.tokz}</small>`, r.c == null ? "—" : `<span class="${r.c >= 0 ? "up" : "dn"}">${pc(r.c)}</span>`] }); }
    { const l = de("Juegos"), t3 = l.filter((r) => r.med === "token" && r.cap).sort((a, b) => b.cap - a.cap).slice(0, 3), cc = l.filter((r) => r.med === "fees").sort((a, b) => (b.m || 0) - (a.m || 0))[0];
      const ok = t3.length === 3 && cc && cc.trad != null, nT = sumaV(t3, "trad");
      B.push({ a: "Juegos", big: ok ? num(nT) : "", txt: ok ? TD.juegos(esc(cc.n), fm(cc.m), num(cc.trad)) : "", th: [TD.th.uso, TD.th.trad],
        rs: l.slice().sort((a, b) => (b.med === "fees") - (a.med === "fees") || (b.m || 0) - (a.m || 0)).slice(0, 4),
        c: (r) => [r.med === "fees" ? `${fmv(r.m)}<small>${TD.cob30}</small>` : `${fm(r.cap)}<small>${TD.vale}</small>`, trad(r)] }); }
    { const l = de("IA"), sin = l.filter((r) => !r.cod || r.cod.dias == null || r.cod.dias > 180).length;
      B.push({ a: "IA", big: PERF && l.length ? TD.de(sin, l.length) : "", txt: PERF && l.length ? TD.ia : "", th: [TD.th.vale, TD.th.cod], rs: top(l),
        c: (r) => [`${fm(r.m)}${c24(r)}`, !r.cod || r.cod.dias == null ? `<span class="mz-na">${TD.sinCod}</span>` : r.cod.dias <= 30 ? `<span class="up">${r.cod.dias < 1 ? TD.hoy : TD.hace(r.cod.dias)}</span>` : `<span class="mz-na">${TD.parado(r.cod.dias)}</span>`] }); }
    { const l = de("Apps y bots"), apps = sumaM(l.filter((r) => r.gr === "Apps de trading")), bots = sumaM(l.filter((r) => r.gr === "Bots de Telegram")), v = bots ? Math.round(apps / bots) : 0;
      B.push({ a: "Apps y bots", big: v >= 2 ? v + "×" : "", txt: v >= 2 ? TD.apps(l.filter((r) => !r.tok).length, l.length) : "", th: [TD.th.cobra, TD.th.tok], rs: top(l),
        c: (r) => [`${fmv(r.m)}${cambioV(r)}`, r.cad ? `<span class="mz-na">${V.tokEn} ${esc(r.cad)}</span>` : r.tok ? `<b class="td-sy">${esc(r.sym)}</b>` : sinV] }); }
    { const l = de("Otros"), rn = l.find((r) => /^Render Network/.test(r.n)), ok = rn && rn.vx && rn.h30 && rn.ing;
      B.push({ a: "Otros", big: ok ? num(rn.vx) + "×" : "", txt: ok ? TD.otros(Math.round(rn.h30 / rn.ing * 100)) : "", th: [TD.th.cobra, TD.th.dev], rs: top(l),
        c: (r) => [`${fmv(r.m)}${cambioV(r)}`, r.h30 ? fm(r.h30) : `<span class="mz-na">—</span>`] }); }
    const bloque = (b) => { const cls = b.ancho ? "tdw" : "tdr", nom = apNom(b.a);
      return `<section class="mz-card td${b.ancho ? " td-ancho" : ""}"><div class="td-cab"><h2>${esc(nom)}, <small>${TD.sub[b.a]}</small></h2><button class="td-ver" data-a="${esc(b.a)}">${T.ver(esc(nom))}</button></div>` +
        (b.big ? `<p class="td-dato"><b>${b.big}</b> ${b.txt}</p>` : "") +
        `<div class="mz-t ${cls} mz-h"><span class="mz-i"></span><span></span><span>${EN ? "Project" : "Proyecto"}</span>${b.th.map((h, i) => `<span class="td-c${i}">${h}</span>`).join("")}<span class="go"></span></div>` +
        (b.rs.length ? b.rs.map((r, i) => { const c = b.c(r); return `<div class="mz-t ${cls}"><span class="mz-i">${i + 1}</span>${av(r)}${nomV(r)}${c.map((x, k) => k === 4 ? x : `<span class="mz-x td-c${k}">${x}</span>`).join("")}${goV(r)}</div>`; }).join("") : `<div class="vacio">${T.ninguno}</div>`) + `</section>`; };
    $("#apdesc").textContent = TD.intro;
    $("#lista").innerHTML = `<div class="tds">${B.map(bloque).join("")}</div>`;
  }

  function pinta() {
    cabecera();
    if (navIO && ap !== "DeFi") { navIO.disconnect(); navIO = null; }
    // Activos tokenizados (21/11): la vista completa, la misma que /acciones/ (acciones/activos.js)
    const rwa = ap === "Activos tokenizados" && window.SFActivos;
    document.querySelector(".tabs").style.display = rwa || ap === "Meme" || ap === "IA" || VISTA[ap] ? "none" : "";
    if (VISTA[ap] && tipo !== "nuevo") { $("#bar").style.display = "none"; $("#lista").classList.remove("sfa"); VISTA[ap](); return; }
    if (ap === "IA" && tipo !== "nuevo") { $("#bar").style.display = "none"; $("#lista").classList.remove("sfa"); iaVista(); return; }
    if (ap === "Meme" && tipo !== "nuevo") { $("#bar").style.display = "none"; $("#lista").classList.remove("sfa"); memeVista(); return; }
    if (rwa) {
      $("#bar").style.display = "none";
      const reales = D.rows.filter((r) => r.ap === ap && r.gr === "Activos reales" && !/mansory/i.test(r.n)).sort((a, b) => (b.m || 0) - (a.m || 0));
      window.SFActivos.pinta($("#lista"), { en: EN, reales, alContar: (n) => { if (nRwa !== n) { nRwa = n; cabecera(); } } });
      return;
    }
    $("#lista").classList.remove("sfa");
    if ($("#lista")._sfa) $("#lista")._sfa = { };
    $("#bar").style.display = ap === "Todos" || tipo === "nuevo" ? "none" : "";
    if (tipo === "nuevo") { const rs = deAp().filter((r) => r.nuevo).sort((a, b) => b.nuevo.localeCompare(a.nuevo)); $("#lista").innerHTML = rs.length ? tarjetas(rs) : `<div class="tbl"><div class="vacio">${T.ninguno}</div></div>`; return; }
    if (ap === "Todos") { todosVista(); return; }
    const rs = ordena(deAp().filter((r) => enTipo(r) && (grupo === "Todos" || r.gr === grupo)));
    $("#lista").innerHTML = `<div class="tbl">${HEAD()}${rs.length ? rs.map(fila).join("") : `<div class="vacio">${T.ninguno}</div>`}</div>`;
  }

  const elegirAp = (a) => { ap = a; grupo = "Todos"; pinta(); };
  function arrancar(datos) {
    D = datos;
    D.rows.forEach((r) => {
      const mk = r.med === "circ" ? D.mercado.circ : r.med === "fees" ? D.mercado.fees : null;
      r.rel = r.c == null || mk == null ? null : (1 + r.c) / (1 + mk) - 1;
      r.anios = r.tok && r.mcap && r.r30 ? r.mcap / (r.r30 * 12) : null;
    });
    $("#fecha").textContent = T.fecha(new Date(D.fecha));
    pidePerf().then(() => { D.rows.forEach((r) => { const p = r.tok && r.mint && PERF[r.mint]; r.h30 = p && p.h30 != null ? p.h30 : null; }); pinta(); });
    // el número de Activos tokenizados, desde el principio (lo que enseña su vista completa)
    if (window.SFActivos) window.SFActivos.datos().then((j) => { if (!j || !Array.isArray(j.filas)) return; const reales = D.rows.filter((r) => r.ap === "Activos tokenizados" && r.gr === "Activos reales" && !/mansory/i.test(r.n)).length; nRwa = j.filas.filter((f) => f.precio != null).length + (j.dolares || []).filter((d) => d.enSolana && d.valor).length + reales; cabecera(); });
    $("#mkF").textContent = pc(D.mercado.fees); $("#mkC").textContent = pc(D.mercado.circ);
    $("#aps").onclick = (e) => { const b = e.target.closest("button"); if (b) elegirAp(b.dataset.a); };
    $("#lista").onclick = (e) => { const b = e.target.closest(".cab button, .td-ver"); if (b) { elegirAp(b.dataset.a); window.scrollTo({ top: $("#aps").offsetTop - 90, behavior: "smooth" }); } };
    $("#chips").onclick = (e) => { const b = e.target.closest("button"); if (b) { grupo = b.dataset.g; pinta(); } };
    $("#sort").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; orden = b.dataset.s; [...$("#sort").children].forEach((x) => x.classList.toggle("on", x === b)); pinta(); };
    $(".tabs").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; [...document.querySelectorAll(".tabs button")].forEach((x) => x.classList.toggle("on", x === b)); tipo = b.dataset.k; pinta(); };
    pinta();
    if (apUrl) window.scrollTo({ top: document.getElementById("aps").offsetTop - 90 });
  }
  fetch("/datos/ecosistema.json", { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(arrancar).catch(() => { $("#lista").innerHTML = `<div class="tbl"><div class="estado">${T.error}</div></div>`; });
})();
