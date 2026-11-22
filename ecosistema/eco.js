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
    ["DeFi", "DeFi", "DEXs, lending, derivatives, staking, bridges… measured by fees."],
    ["Juegos", "Games", "Games, games of chance, physical cards and gamified mining. Those that charge on-chain, by fees; the rest, by their token (CoinGecko). Real players are not measured yet."],
    ["IA", "AI", "AI agents and projects on Solana, by their token (CoinGecko). Their real on-chain usage is not measured yet."],
    ["Apps y bots", "Apps and bots", "Trading apps and bots, wallets and data: the tools people trade with, measured by fees."],
    ["Otros", "Other", "DePIN, privacy, payments, social and tools."],
  ] : [
    ["Meme", "Meme", "Las memecoins de Solana, por su capitalización, y las lanzaderas donde nacen (Pump, BONK.fun…), por las comisiones que cobran."],
    ["Activos tokenizados", "Activos tokenizados", "Stablecoins por dinero en circulación en Solana; acciones, fondos y crédito por valor tokenizado."],
    ["DeFi", "DeFi", "DEX, préstamos, derivados, staking, puentes…, medidos por comisiones."],
    ["Juegos", "Juegos", "Juegos, azar, cartas físicas y minería con juego. Los que cobran en la cadena, por comisiones; los demás, por su token (CoinGecko). Aún no medimos jugadores reales."],
    ["IA", "IA", "Agentes y proyectos de IA en Solana, por su token (CoinGecko). Aún no medimos su uso real en la cadena."],
    ["Apps y bots", "Apps y bots", "Apps y bots de trading, wallets y datos: las herramientas con las que se opera, medidas por comisiones."],
    ["Otros", "Otros", "DePIN, privacidad, pagos, social y herramientas."],
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
    k: { feesSol: "Solana fees, 30 d", vsMesK: "vs previous month", protoSin: "Projects · no token", stSol: "Stablecoins on Solana", valTok: "Tokenized value (top 10)", feesAp: "Section fees, 30 d", mercVs: "Market vs prev. month" },
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
    k: { feesSol: "Comisiones en Solana, 30 d", vsMesK: "vs mes anterior", protoSin: "Proyectos · sin token", stSol: "Stablecoins en Solana", valTok: "Valor tokenizado (los 10)", feesAp: "Comisiones del apartado, 30 d", mercVs: "Mercado vs mes anterior" },
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
    $("#apdesc").textContent = d ? d[2] : T.elige;
    const fees = rs.filter((r) => r.med === "fees"), val = rs.filter((r) => r.med === "valor");
    const sinTok = rs.filter((r) => !r.tok).length;
    let k;
    if (ap === "Activos tokenizados") k = [[T.k.stSol, fm(D.totStables)], [T.k.vsMesK, pc(D.mercado.circ), D.mercado.circ], [T.k.valTok, fm(val.reduce((s, r) => s + (r.m || 0), 0))]];
    else if (ap === "Todos") k = [[T.k.feesSol, fm(D.totFees30)], [T.k.vsMesK, pc(D.mercado.fees), D.mercado.fees], [T.k.protoSin, rs.length + " · " + sinTok]];
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
    const precio = r.tok ? (r.precio != null ? fp(r.precio) + ` <span class="pc ${r.c24 >= 0 ? "up" : "dn"}">${pc1(r.c24)}</span>` : "—") + (r.mcap ? `<small>${fm(r.mcap)}${T.cap}</small>` : "") : `<span class="sin">${T.sinTok}</span>`;
    const ir = r.mint && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(r.mint) ? `<a class="go" href="${EN ? "/en/" : "/"}?token=${r.mint}">${T.vale}</a>` : `<span class="go"></span>`;
    return `<div class="row"><span class="i">${i + 1}</span>
      <span class="nm">${av(r)}<span><b>${esc(r.n)}${r.sym ? ` <span class="sym">${esc(r.sym)}</span>` : ""}</b><small>${sub}</small>${tit}</span></span>
      <span class="num">${r.m ? fm(r.m) : "—"}<small class="med">${r.m ? medida : ""}</small><small>${extra}</small>${trad}</span>
      <span class="num vol">${fm(r.r30)}</span>
      <span class="num vol" title="${T.holdT}">${r.h30 == null ? "—" : fm(r.h30) + (r.mcap && r.h30 > 0 ? `<small>×${dec(r.mcap / (r.h30 * 12), 1)}</small>` : "")}</span>
      <span class="num vol">${precio}</span>
      <span class="num vol">${r.anios == null ? "—" : "×" + dec(r.anios, 1)}</span>
      ${r.rel == null && r.med === "token" ? `<span class="rel"></span>` : `<span class="rel"><span class="num ${r.rel >= 0 ? "up" : "dn"}" title="${r.rel == null && r.med !== "fees" && r.med !== "circ" ? T.sinHist : ""}">${pc(r.rel)}</span>${bar}<small>${T.frente}</small></span>`}
      ${ir}</div>${partes(r)}`;
  }
  // una empresa con varias partes (Pump.fun, 21/11): una fila y debajo lo que cobra cada parte
  function partes(r) {
    if (!r.partes || r.partes.length < 2) return "";
    return `<div class="partes"><span class="pk">${T.partes}</span>${r.partes.map((p) => `<span><b>${esc(p.n)}</b> ${esc(grNom(p.gr))} · ${fm(p.m)}${T.parte30}${p.c == null ? "" : ` <em class="${p.c >= 0 ? "up" : "dn"}">${pc(p.c)}</em>`}</span>`).join("")}</div>`;
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
    parte: "part of Pump.fun (shown whole in DeFi)", cadena: "on-chain: ", nuevo: "new", sinTok: "No token", conTok: "has a token", noReg: "Not in our registry yet",
    vivos: (v, n) => `${v} of ${n} alive`,
    lzSrc: (d) => `Fees: DefiLlama (30 days, vs the previous month; “new” if it barely earned last month). Born and alive after 24 h: SolFlag registry since ${d}, with the launches our collector sees (a sample, not all). “Alive” = still has money in it and trading after 24 h.`,
    mmH: "Memecoins,", mmS: "who really trades them", mmTh: ["Memecoin", "Worth · 24 h", "Volume 24 h", "Holders", "Traders 24 h", "Signal"],
    org: (n) => n === 1 ? "1 organic" : n + " organic",
    bots: (t, o) => `${t} traders and ${o === 0 ? "no organic ones" : o === 1 ? "1 organic" : o + " organic"}: mostly bots`, poco: (t) => `Little trading: ${t} traders yesterday`,
    gana: (x) => `Gaining holders: ${x} in 24 h`, orgP: (x) => `${x}% organic buyers`,
    mmSrc: "The 10 most valuable memecoins born on Solana. Market cap and volume: CoinGecko. Holders and traders: Jupiter (organic = buyers that don't look like bots). Being very active is not a buy recommendation.",
    queH: "What we check in a meme", queS: "The usual flags:", queL: ["Can they mint more or freeze you?", "Who holds it (pools excluded)", "Can you sell, and what does it cost?", "Who launched it and their track record", "What it depends on (the Pump.fun curve)"],
    notas: { raydium_launchlab: "Raydium LaunchLab, used by BONK.fun and others", meteora_dbc: "Meteora's curve, used by Bags and others" },
  } : {
    datoK: "Dato del registro de SolFlag", dato: (p, n, d, v) => `de los ${n} tokens nuevos que vimos nacer desde el ${d} estaban muertos a las 24 h. Solo ${v} seguían con vida. Antes de comprar algo recién nacido, mira quién está detrás.`,
    lzH: "Lanzaderas,", lzS: "dónde nacen y cuántas sobreviven", lzTh: ["Lanzadera", "Cobra 30 d", "Su token", "Nacieron", "Vivos a las 24 h"],
    parte: "parte de Pump.fun (va entera en DeFi)", cadena: "en la cadena: ", nuevo: "nuevo", sinTok: "Sin token", conTok: "con token", noReg: "Aún no lo registramos",
    vivos: (v, n) => `${v} de ${n} vivos`,
    lzSrc: (d) => `Comisiones: DefiLlama (30 días, frente al mes anterior; «nuevo» si el mes anterior casi no cobró). Nacieron y vivos a las 24 h: registro de SolFlag desde el ${d}, con los lanzamientos que ve nuestro recolector (una muestra, no todos). «Vivo» = sigue con dinero dentro y movimiento a las 24 h.`,
    mmH: "Memecoins,", mmS: "quién las mueve de verdad", mmTh: ["Memecoin", "Vale · 24 h", "Volumen 24 h", "Titulares", "Traders 24 h", "Señal"],
    org: (n) => n === 1 ? "1 orgánico" : n + " orgánicos",
    bots: (t, o) => `${t} traders y ${o === 0 ? "ninguno orgánico" : o === 1 ? "1 orgánico" : o + " orgánicos"}: casi todo bots`, poco: (t) => `Poco movimiento: ${t} traders ayer`,
    gana: (x) => `Gana titulares: ${x} en 24 h`, orgP: (x) => `${x} % de compradores orgánicos`,
    mmSrc: "Las 10 memecoins nacidas en Solana que más valen. Capitalización y volumen: CoinGecko. Titulares y traders: Jupiter (orgánicos = compradores que no parecen bots). Que se mueva mucho no es una recomendación de compra.",
    queH: "Qué miramos en una meme", queS: "Las banderas de siempre:", queL: ["¿Pueden crear más o congelarte?", "Quién lo tiene (sin contar pools)", "¿Puedes vender y cuánto te cuesta?", "Quién lo lanzó y su historial", "De qué depende (la curva de Pump.fun)"],
    notas: { raydium_launchlab: "LaunchLab de Raydium, que usan BONK.fun y otras", meteora_dbc: "curva de Meteora, que usan Bags y otras" },
  };
  // lanzadera de DefiLlama → plataforma en nuestro registro (launchpad.platform de RugCheck)
  const PLAT = { "Pump.fun": "pump_fun", "BONK.fun": "raydium_launchlab", "Bags": "meteora_dbc", "StonkFun": "stonk_fun", "Rapid Launch": "rapidlaunch" };
  let REG = null, regPide = null;
  const num = (n, d) => n.toLocaleString(EN ? "en-US" : "es-ES", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0, useGrouping: "always" });
  const tok = (r) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(r.mint || "") ? (EN ? "/en/" : "/") + "?token=" + r.mint : null;
  function memeVista() {
    if (!REG && !regPide) regPide = fetch("https://api.solflag.com/api/lanzaderas").then((r) => r.ok ? r.json() : null).catch(() => null).then((j) => { REG = j || {}; if (ap === "Meme") pinta(); });
    const rs = D.rows.filter((r) => r.ap === "Meme");
    const memes = rs.filter((r) => r.gr === "Memecoins").sort((a, b) => (b.m || 0) - (a.m || 0));
    const lz = rs.filter((r) => r.gr === "Lanzaderas").map((r) => Object.assign({}, r));
    const pump = D.rows.find((r) => r.n === "Pump.fun" && r.partes), pp = pump && pump.partes.find((p) => p.gr === "Lanzaderas");
    if (pp) lz.push(Object.assign({}, pump, { n: "Pump.fun", m: pp.m, c: pp.c, parte: true }));
    lz.sort((a, b) => (b.m || 0) - (a.m || 0));
    const reg = REG && REG.plats, tot = REG && REG.total, desde = REG && REG.desde ? new Date(REG.desde).toLocaleDateString(EN ? "en-GB" : "es-ES", { day: "numeric", month: EN ? "short" : "numeric" }) : "";
    const cambio = (c) => c == null ? "" : c > 5 ? `<span class="mz-nuevo">${MZ.nuevo}</span>` : `<span class="${c >= 0 ? "up" : "dn"}">${pc1(c) || pc(c)}</span>`;
    const nom = (r, extra) => { const h = tok(r); const n = `${esc(r.n)}${r.sym && r.tok !== false ? ` <small>${esc(r.sym)}</small>` : ""}`; return `<span class="mz-n"><b>${h ? `<a href="${h}">${n}</a>` : n}</b>${extra != null ? `<small>${extra}</small>` : ""}</span>`; };
    const lzFila = (r, i) => { const k = PLAT[r.n], g = reg && k && reg[k], v = g ? g.con - g.muertos : 0;
      const sub = r.parte ? MZ.parte : k && MZ.notas[k] ? MZ.cadena + MZ.notas[k] : "";
      return `<div class="mz-t mz-lz"><span class="mz-i">${i + 1}</span>${av(r)}${nom(r, esc(sub))}<span class="mz-x">${fm(r.m)}<small>${cambio(r.c)}</small></span>` +
        `<span class="mz-x mz-m mz-tok">${r.tok ? (r.mcap ? fm(r.mcap) + `<small><span class="${(r.c24 || 0) >= 0 ? "up" : "dn"}">${pc1(r.c24)}</span></small>` : MZ.conTok) : `<span class="mz-sin">${MZ.sinTok}</span>`}</span>` +
        `<span class="mz-x mz-m mz-nac">${g ? num(g.n) : "—"}</span>` +
        (g && g.con ? `<span class="mz-viv"><b>${num(v / g.con * 100, 1)}${sp}%</b><small>${MZ.vivos(num(v), num(g.con))}</small></span>` : `<span class="mz-na">${reg ? MZ.noReg : "…"}</span>`) + "</div>"; };
    const senal = (r) => {
      if (r.trad >= 50 && r.org != null && r.org / r.trad < 0.02) return `<span class="mz-sen mz-r">${MZ.bots(num(r.trad), r.org)}</span>`;
      if (r.trad != null && r.trad < 100) return `<span class="mz-sen mz-a">${MZ.poco(r.trad)}</span>`;
      if (r.titC != null && r.titC >= 0.001) return `<span class="mz-sen mz-v">${MZ.gana(pc1(r.titC))}</span>`;
      if (r.org != null && r.trad && r.org / r.trad >= 0.03) return `<span class="mz-sen mz-v">${MZ.orgP(num(r.org / r.trad * 100))}</span>`;
      return "<span></span>"; };
    const mmFila = (r, i) => `<div class="mz-t mz-mm"><span class="mz-i">${i + 1}</span>${av(r)}${nom(r)}<span class="mz-x">${fm(r.m)}<small><span class="${(r.c24 || 0) >= 0 ? "up" : "dn"}">${pc1(r.c24)}</span></small></span>` +
      `<span class="mz-x mz-m mz-vol">${r.vol ? fm(r.vol) : "—"}</span><span class="mz-x mz-m mz-tit">${r.tit != null ? fk(r.tit) : "—"}<small>${r.titC != null && Math.abs(r.titC) >= 0.0005 ? `<span class="${r.titC >= 0 ? "up" : "dn"}">${pc1(r.titC)}</span>` : "&nbsp;"}</small></span>` +
      `<span class="mz-x">${r.trad != null ? fk(r.trad) : "—"}<small>${r.org != null ? MZ.org(r.org) : "&nbsp;"}</small></span>${senal(r)}</div>`;
    $("#lista").innerHTML =
      (tot && tot.con ? `<div class="mz-dato"><span class="mz-k">${MZ.datoK}</span><b>${num(tot.muertos / tot.con * 100, 1)}${sp}%</b><p>${MZ.dato(0, num(tot.con), desde, num(tot.con - tot.muertos))}</p></div>` : "") +
      `<section class="mz-card"><h2>${MZ.lzH} <small>${MZ.lzS}</small></h2><div class="mz-t mz-lz mz-h"><span></span><span></span><span>${MZ.lzTh[0]}</span><span>${MZ.lzTh[1]}</span><span class="mz-tok">${MZ.lzTh[2]}</span><span class="mz-nac">${MZ.lzTh[3]}</span><span>${MZ.lzTh[4]}</span></div>` +
        lz.map(lzFila).join("") + `<p class="mz-src">${MZ.lzSrc(desde || "30/10")}</p></section>` +
      `<section class="mz-card"><h2>${MZ.mmH} <small>${MZ.mmS}</small></h2><div class="mz-t mz-mm mz-h"><span></span><span></span><span>${MZ.mmTh[0]}</span><span>${MZ.mmTh[1]}</span><span class="mz-vol">${MZ.mmTh[2]}</span><span class="mz-tit">${MZ.mmTh[3]}</span><span>${MZ.mmTh[4]}</span><span>${MZ.mmTh[5]}</span></div>` +
        memes.map(mmFila).join("") + `<p class="mz-src">${MZ.mmSrc}</p></section>` +
      `<div class="mz-que"><div class="top"><b>${MZ.queH}</b><span>${MZ.queS}</span></div><ul>${MZ.queL.map((x) => `<li>${x}</li>`).join("")}</ul></div>`;
  }

  // ---------- IA (21/11, maqueta maquetas/escaner/ecosistema-ia.html): agentes y proyectos, con código y señal ----------
  const IA = EN ? {
    dato: (a, b) => `AI tokens show no public code or haven't touched it in over 6 months. Without code there is no way to check the agent or product exists: only the name is left.`,
    ag: ["AI agents,", "the ones that claim to act on-chain on their own"], pr: ["AI projects,", "networks, data and compute for AI"],
    th: ["Project", "Worth · 24 h", "Holders", "Traders 24 h", "Code", "Signal"],
    sinCod: "No public code", cod1: "Changed 1 day ago", codN: (n) => `Changed ${n} days ago`, codP: (n) => `${n} days without changes`,
    bots: (v) => `Worth ${v} and mostly traded by bots`, pocos: (v, n) => `Worth ${v} and ${n} people traded it yesterday`,
    bloq: (b, l) => `${b}% still locked${l ? ", releases " + l + "% this month" : ""}`, vivo: (p) => `Live code and ${p}% organic buyers`,
    src: "Market cap: CoinGecko. Holders and traders: Jupiter (organic = buyers that don't look like bots). Code: GitHub linked from CoinGecko (last change). Unlocks: Streamflow. Today's data; not recommendations.",
    queH: "What we check in an AI token", queS: "Many are memes under another name:", queL: ["Does the agent really act on-chain?", "Who is behind it and their track record", "Who holds it", "Can you sell?", "Promises with no timeline"],
  } : {
    dato: (a, b) => `tokens de IA no enseñan código público o lo tienen parado hace más de 6 meses. Sin código no se puede comprobar que el agente o el producto existan: solo queda el nombre.`,
    ag: ["Agentes de IA,", "los que dicen actuar solos en la cadena"], pr: ["Proyectos de IA,", "redes, datos y cómputo para IA"],
    th: ["Proyecto", "Vale · 24 h", "Titulares", "Traders 24 h", "Código", "Señal"],
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
    const P = PERF || {};
    const rs = D.rows.filter((r) => r.ap === "IA").map((r) => { const p = (r.mint && P[r.mint]) || {}; return Object.assign({}, r, { cod: p.cod || null, dl: p.dl || null, cap: r.mcap || r.m }); }).sort((a, b) => (b.cap || 0) - (a.cap || 0));
    const num = (n, d) => n.toLocaleString(EN ? "en-US" : "es-ES", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0, useGrouping: "always" });
    const href = (r) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(r.mint || "") ? (EN ? "/en/" : "/") + "?token=" + r.mint : null;
    const cod = (r) => { if (!PERF) return '<span class="mz-na">…</span>'; if (!r.cod || r.cod.dias == null) return `<span class="mz-cod s">${IA.sinCod}</span>`;
      const t = r.cod.dias <= 1 ? IA.cod1 : r.cod.dias <= 30 ? IA.codN(r.cod.dias) : IA.codP(r.cod.dias);
      return `<span class="mz-cod ${r.cod.dias <= 30 ? "v" : "p"}"><a href="${esc(r.cod.url)}" target="_blank" rel="noopener">${t} ↗</a></span>`; };
    const senal = (r) => {
      if (r.trad >= 50 && r.org != null && r.org / r.trad < 0.05) return `<span class="mz-sen mz-r">${IA.bots(fm(r.cap))}</span>`;
      if (r.trad != null && r.trad < 50 && r.cap >= 1e6) return `<span class="mz-sen mz-r">${IA.pocos(fm(r.cap), r.trad)}</span>`;
      if (r.dl && r.dl.bloq >= 20) return `<span class="mz-sen mz-a">${IA.bloq(num(r.dl.bloq), r.dl.lib >= 0.1 ? num(r.dl.lib, 1) : "")}</span>`;
      if (r.cod && r.cod.dias != null && r.cod.dias <= 30 && r.org != null && r.trad && r.org / r.trad >= 0.05) return `<span class="mz-sen mz-v">${IA.vivo(num(r.org / r.trad * 100))}</span>`;
      return "<span></span>"; };
    const fila = (r, i) => { const h = href(r), n = `${esc(r.n)}${r.sym ? ` <small>${esc(r.sym)}</small>` : ""}`;
      return `<div class="mz-t mz-ia"><span class="mz-i">${i + 1}</span>${av(r)}<span class="mz-n"><b>${h ? `<a href="${h}">${n}</a>` : n}</b></span>` +
        `<span class="mz-x">${fm(r.cap)}<small><span class="${(r.c24 || 0) >= 0 ? "up" : "dn"}">${pc1(r.c24)}</span></small></span>` +
        `<span class="mz-x mz-m mz-tit">${r.tit != null ? fk(r.tit) : "—"}<small>${r.titC != null && Math.abs(r.titC) >= 0.0005 ? `<span class="${r.titC >= 0 ? "up" : "dn"}">${pc1(r.titC)}</span>` : "&nbsp;"}</small></span>` +
        `<span class="mz-x">${r.trad != null ? fk(r.trad) : "—"}<small>${r.org != null ? MZ.org(r.org) : "&nbsp;"}</small></span><span class="mz-codc">${cod(r)}</span>${PERF ? senal(r) : "<span></span>"}</div>`; };
    const tabla = (t, l) => l.length ? `<section class="mz-card"><h2>${t[0]} <small>${t[1]}</small></h2><div class="mz-t mz-ia mz-h"><span></span><span></span><span>${IA.th[0]}</span><span>${IA.th[1]}</span><span class="mz-tit">${IA.th[2]}</span><span>${IA.th[3]}</span><span class="mz-codc">${IA.th[4]}</span><span>${IA.th[5]}</span></div>${l.map(fila).join("")}</section>` : "";
    const np = rs.filter((r) => !r.cod || r.cod.dias == null || r.cod.dias > 180).length;
    $("#lista").innerHTML = (PERF ? `<div class="mz-dato"><span class="mz-k">${EN ? "Fact" : "Dato"}</span><b>${np} ${EN ? "of" : "de"} ${rs.length}</b><p>${IA.dato()}</p></div>` : "") +
      tabla(IA.ag, rs.filter((r) => r.gr === "Agentes de IA")) + tabla(IA.pr, rs.filter((r) => r.gr !== "Agentes de IA")) +
      `<p class="mz-src">${IA.src}</p><div class="mz-que"><div class="top"><b>${IA.queH}</b><span>${IA.queS}</span></div><ul>${IA.queL.map((x) => `<li>${x}</li>`).join("")}</ul></div>`;
  }

  function pinta() {
    cabecera();
    // Activos tokenizados (21/11): la vista completa, la misma que /acciones/ (acciones/activos.js)
    const rwa = ap === "Activos tokenizados" && window.SFActivos;
    document.querySelector(".tabs").style.display = rwa || ap === "Meme" || ap === "IA" ? "none" : "";
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
    if (ap === "Todos") {
      $("#lista").innerHTML = AP.map(([a, nom]) => {
        const rs = D.rows.filter((r) => r.ap === a && enTipo(r));
        if (!D.rows.some((r) => r.ap === a)) return "";
        // en «Todos», lo que se mide por capitalización y casi nadie usa (menos de 20 traders en 24 h, o sin dato de traders) no entra en los 5 primeros (22/11: Infinity Gaming, 43 M$ y 1 trader)
        const top = rs.filter((r) => !(r.med === "token" && (r.trad == null || r.trad < 20))).sort((x, y) => (y.m || 0) - (x.m || 0)).slice(0, 5);
        return `<div class="blq"><div class="cab"><h3>${esc(nom)}</h3><span>${rs.length}${T.proto}</span><button data-a="${esc(a)}">${T.ver(esc(nom))}</button></div>
          <div class="tbl">${HEAD()}${top.length ? top.map(fila).join("") : `<div class="vacio">${T.ninguno}</div>`}</div></div>`;
      }).join("");
      return;
    }
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
    $("#lista").onclick = (e) => { const b = e.target.closest(".cab button"); if (b) { elegirAp(b.dataset.a); window.scrollTo({ top: $("#aps").offsetTop - 90, behavior: "smooth" }); } };
    $("#chips").onclick = (e) => { const b = e.target.closest("button"); if (b) { grupo = b.dataset.g; pinta(); } };
    $("#sort").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; orden = b.dataset.s; [...$("#sort").children].forEach((x) => x.classList.toggle("on", x === b)); pinta(); };
    $(".tabs").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; [...document.querySelectorAll(".tabs button")].forEach((x) => x.classList.toggle("on", x === b)); tipo = b.dataset.k; pinta(); };
    pinta();
    if (apUrl) window.scrollTo({ top: document.getElementById("aps").offsetTop - 90 });
  }
  fetch("/datos/ecosistema.json", { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(arrancar).catch(() => { $("#lista").innerHTML = `<div class="tbl"><div class="estado">${T.error}</div></div>`; });
})();
