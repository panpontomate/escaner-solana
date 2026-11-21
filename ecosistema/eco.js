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
    head: ["#", "Project", "Usage", "Revenue 30 d", "Price · 24 h", "Value × revenue", "vs the market"], valeT: "How many times its token is worth what the protocol earns in a year",
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
    head: ["#", "Proyecto", "Uso", "Ingresos 30 d", "Precio · 24 h", "Vale × ingresos", "Frente al mercado"], valeT: "Cuántas veces vale su token lo que ingresa el protocolo en un año",
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

  const HEAD = () => `<div class="row h"><span class="i">${T.head[0]}</span><span>${T.head[1]}</span><span class="num">${T.head[2]}</span><span class="num vol">${T.head[3]}</span><span class="num vol">${T.head[4]}</span><span class="num vol" title="${T.valeT}">${T.head[5]}</span><span class="num">${T.head[6]}</span><span class="go"></span></div>`;
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
      <span class="num vol">${precio}</span>
      <span class="num vol">${r.anios == null ? "—" : "×" + dec(r.anios, 1)}</span>
      <span class="rel"><span class="num ${r.rel >= 0 ? "up" : "dn"}" title="${r.rel == null && r.med !== "fees" && r.med !== "circ" ? T.sinHist : ""}">${pc(r.rel)}</span>${bar}<small>${T.frente}</small></span>
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

  function pinta() {
    cabecera();
    // Activos tokenizados (21/11): la vista completa, la misma que /acciones/ (acciones/activos.js)
    const rwa = ap === "Activos tokenizados" && window.SFActivos;
    document.querySelector(".tabs").style.display = rwa ? "none" : "";
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
        const top = rs.slice().sort((x, y) => (y.m || 0) - (x.m || 0)).slice(0, 5);
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
