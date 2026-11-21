/* Vista COMPLETA de los activos tokenizados (21/11/2026, maqueta aprobada maquetas/escaner/activos-completo.html).
   La misma en Ecosistema › Activos tokenizados (/ecosistema/?ap=rwa) y en /acciones/ (y en inglés). Uso:
     SFActivos.pinta(contenedor, { reales: [{ n, m, sym, tok, logo }], en: true|false })
   Datos: https://api.solflag.com/api/acciones?v=2 (tools/api/acciones.js: lista diaria de emisores comprobados con
   ≥10 k$ de liquidez, precios de Jupiter). «Qué puede hacer el emisor» va en una ventana (botón Información). */
(function () {
  const API = "https://api.solflag.com/api/acciones?v=3";   // v3: saltar la respuesta de 14 guardada en navegadores (21/11)
  const ES = {
    bolsaA: "<b>Bolsa de EE. UU. abierta</b> · precios de hace menos de 15 min", bolsaC: "<b>Bolsa cerrada</b> · el token puede despegarse de la acción",
    dol: "Dólares digitales,", dolS: "con su letra pequeña", hoy: "En Solana hoy", comp: "con emisor comprobado",
    hd: ["Token", "En Solana", "Precio", "El emisor puede…", "Claves", "Reservas"], crear: "crear", congelar: "congelar", mover: "mover tus tokens", comision: "poner comisión", vig: "vigiladas",
    info: "ⓘ Información", tok: "Lo que vale el token,", tokS: "y lo que vale la acción",
    cats: [["todas", "Todas"], ["acc", "Acciones"], ["fon", "Fondos"], ["mat", "Materias primas"]],
    busca: "Busca: Tesla, NVDA, oro, SPY…", th: ["Token", "Precio token", "En bolsa", "Diferencia", "Liquidez", "Volumen 24 h"],
    ninguno: "Ninguno con ese nombre. Si tienes su dirección, pégala en el Escáner y lo analizamos.", de: "de", ant: "← Anteriores", sig: "Siguientes →",
    srcT: "Solo tokens de emisores comprobados (xStocks, Backpack, Ondo) con al menos 10 k$ de liquidez; la lista se rehace cada día. Precio del token y de la acción: Jupiter (con la bolsa cerrada, el último precio fuera de horario). Liquidez: DexScreener.",
    reales: "Otros activos reales", realesS: "crédito, fondos y más, por valor tokenizado", rth: ["Proyecto", "Valor tokenizado", "Token"], sinTok: "sin token",
    realesSrc: "Valor en Solana: DefiLlama. Son proyectos que tokenizan crédito o fondos; no tienen un precio «real» con el que comparar.",
    que: "Qué miramos en un activo tokenizado", queS: "No importa quién lo lanzó en Pump.fun, sino:",
    queL: ["¿Es la dirección oficial del emisor? (y sus copias)", "Respaldo, custodio e informes", "Quién puede congelar y por qué (es normal aquí)", "Desvío frente al precio real", "Dónde cotiza"],
    fin: "Son datos, no recomendaciones. Powered by CoinGecko.", cargando: "Cargando precios…", error: "No se pudieron cargar los precios. Prueba a recargar en un momento.",
    emi: "Qué puede hacer el emisor con tus tokens", emiS: "la letra pequeña", cerrar: "Cerrar",
    emiC: [["xStocks · acciones", [["Mover o quemar tus tokens sin tu firma", "(delegado permanente)"], ["Pausar todos los envíos", "· hoy no está pausado"], ["Ajusta por splits y dividendos", "con un multiplicador"], ["Congelar tu cuenta y crear más", ", como cualquier emisor regulado"]]],
      ["Backpack · acciones", [["Mover o quemar tus tokens sin tu firma", "(delegado permanente)"], ["Pausar todos los envíos", "· hoy no está pausado"], ["Puede añadir una regla a cada envío", "· hoy ninguna"], ["Congelar tu cuenta y crear más", ""]]],
      ["Ondo · acciones", [["No puede mover tus tokens", "(sin delegado permanente)"], ["Pausar todos los envíos", "· hoy no está pausado"], ["Poco mercado en Solana:", "su precio puede no seguir a la acción"]]],
      ["Dólares digitales", [["Todos pueden congelar tu cuenta", "por orden judicial o sanciones"], ["PYUSD y USDG pueden mover tus tokens", "y cobrar comisión (hoy 0 %)"], ["Claves comprobadas cada mañana", ": si cambian, lo avisamos"]]]],
    ojo: "Desde la cadena no se ve si la acción o el dinero real existen detrás del token: eso depende del emisor, su custodio y sus informes de reservas.",
    nombre: { "Gold": "Oro", "United States Oil Fund, LP": "Petróleo" }, mat: { GLD: "Oro", USO: "Petróleo", URA: "Uranio" }
  };
  const EN = {
    bolsaA: "<b>US market open</b> · prices under 15 min old", bolsaC: "<b>Market closed</b> · the token can drift from the stock",
    dol: "Digital dollars,", dolS: "with their fine print", hoy: "On Solana today", comp: "with a verified issuer",
    hd: ["Token", "On Solana", "Price", "The issuer can…", "Keys", "Reserves"], crear: "mint", congelar: "freeze", mover: "move your tokens", comision: "charge a fee", vig: "watched",
    info: "ⓘ Information", tok: "What the token is worth,", tokS: "and what the stock is worth",
    cats: [["todas", "All"], ["acc", "Stocks"], ["fon", "Funds"], ["mat", "Commodities"]],
    busca: "Search: Tesla, NVDA, gold, SPY…", th: ["Token", "Token price", "On the market", "Gap", "Liquidity", "Volume 24 h"],
    ninguno: "None with that name. If you have its address, paste it in the Scanner and we will analyze it.", de: "of", ant: "← Previous", sig: "Next →",
    srcT: "Only tokens from verified issuers (xStocks, Backpack, Ondo) with at least $10k of liquidity; the list is rebuilt every day. Token and stock price: Jupiter (with the market closed, the last after-hours price). Liquidity: DexScreener.",
    reales: "Other real-world assets", realesS: "credit, funds and more, by tokenized value", rth: ["Project", "Tokenized value", "Token"], sinTok: "no token",
    realesSrc: "Value on Solana: DefiLlama. These projects tokenize credit or funds; there is no “real” price to compare with.",
    que: "What we check in a tokenized asset", queS: "It's not about who launched it on Pump.fun, but:",
    queL: ["Is it the issuer's official address? (and its copies)", "Backing, custodian and reports", "Who can freeze and why (normal here)", "Gap to the real price", "Where it trades"],
    fin: "Data, not recommendations. Powered by CoinGecko.", cargando: "Loading prices…", error: "Couldn't load the prices. Try reloading in a moment.",
    emi: "What the issuer can do with your tokens", emiS: "the fine print", cerrar: "Close",
    emiC: [["xStocks · stocks", [["Move or burn your tokens without your signature", "(permanent delegate)"], ["Pause all transfers", "· not paused today"], ["Adjusts for splits and dividends", "with a multiplier"], ["Freeze your account and mint more", ", like any regulated issuer"]]],
      ["Backpack · stocks", [["Move or burn your tokens without your signature", "(permanent delegate)"], ["Pause all transfers", "· not paused today"], ["Can add a rule to every transfer", "· none today"], ["Freeze your account and mint more", ""]]],
      ["Ondo · stocks", [["Cannot move your tokens", "(no permanent delegate)"], ["Pause all transfers", "· not paused today"], ["Thin market on Solana:", "its price may not follow the stock"]]],
      ["Digital dollars", [["All can freeze your account", "by court order or sanctions"], ["PYUSD and USDG can move your tokens", "and charge a fee (0% today)"], ["Keys checked every morning", ": if they change, we flag it"]]]],
    ojo: "The chain can't show whether the stock or the real money exists behind the token: that depends on the issuer, its custodian and its reserve reports.",
    nombre: { "United States Oil Fund, LP": "Oil" }, mat: { GLD: "Gold", USO: "Oil", URA: "Uranium" }
  };
  const COLOR = { MCD: "#da291c", GME: "#e4002b", AVGO: "#cc092f", INTC: "#0071c5", TQQQ: "#2a6fdb", PLTR: "#333", KO: "#f40009", NFLX: "#e50914", ORCL: "#c74634", UNH: "#002677", TSLA: "#cc0000", NVDA: "#76b900", AAPL: "#555", SPY: "#1f3a93", QQQ: "#2a6fdb", MSTR: "#d9480f", CRCL: "#2775ca", META: "#0866ff", GOOGL: "#34a853", AMZN: "#ff9900", COIN: "#0052ff", HOOD: "#00c805", MSFT: "#00a4ef", GLD: "#c9a227", USO: "#3b3b3b", URA: "#4d7c0f", MU: "#0066b3", AMD: "#111", SPCX: "#222" };
  const DCOL = { USDC: "#2775ca", USDT: "#26a17b", PYUSD: "#0e3d8c", USDG: "#1d1d1f", EURC: "#2775ca", USDY: "#1f2a44" };
  const PUEDE = { PYUSD: 1, USDG: 1 };
  const POR = 20;
  const CSS = `
.sfa{--l:rgba(196,181,253,.14);--l2:rgba(196,181,253,.3);--m:#a99fd6;--m2:#8f86bb;--q:#7ab8c4;--v:#4ade80;--r:#ff6b6b;--a:#fbbf24;--tx:#f1eeff}
.sfa .k{font:800 11px Manrope,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--q)}
.sfa .mono{font-family:"IBM Plex Mono",monospace}
.sfa h2{margin:0;font:700 1.9rem/1.15 Fraunces,serif;letter-spacing:-.01em;color:var(--q)}
.sfa h2 small{font:500 1.45rem Fraunces,serif;color:var(--tx);margin-left:4px}
.sfa .card{background:rgba(8,6,22,.9);border:1px solid var(--l);border-radius:20px;padding:18px 22px;margin-bottom:18px}
.sfa .sq{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:8px;font:800 8.5px Manrope,sans-serif;color:#fff;flex:none}
.sfa .pill{display:inline-block;font:700 .74rem "IBM Plex Mono",monospace;padding:2px 7px;border-radius:999px;border:1px solid}
.sfa .pill.ok{color:var(--v);border-color:rgba(74,222,128,.4);background:rgba(74,222,128,.08)}
.sfa .pill.wa{color:var(--a);border-color:rgba(251,191,36,.4);background:rgba(251,191,36,.08)}
.sfa .pill.no{color:var(--r);border-color:rgba(255,107,107,.4);background:rgba(255,107,107,.08)}
.sfa .pill.gr{color:var(--m2);border-color:var(--l2)}
.sfa .cin{overflow:hidden;border-top:1px solid var(--l);border-bottom:1px solid var(--l);margin-bottom:20px;padding:14px 0;-webkit-mask:linear-gradient(90deg,transparent,#000 4%,#000 96%,transparent);mask:linear-gradient(90deg,transparent,#000 4%,#000 96%,transparent)}
.sfa .cin .tk{display:flex;gap:36px;width:max-content;animation:sfacin 220s linear infinite}
.sfa .cin:hover .tk{animation-play-state:paused}
@keyframes sfacin{to{transform:translateX(-50%)}}
@media (prefers-reduced-motion:reduce){ .sfa .cin .tk{animation:none} }
.sfa .ci{display:flex;align-items:center;gap:10px;font-size:1rem;white-space:nowrap}
.sfa .ci .sq{width:32px;height:32px;font-size:9.5px;border-radius:9px}
.sfa .ci small{color:var(--m2)}.sfa .ci .mono{font-weight:600;font-size:1.02rem}.sfa .ci .pill{font-size:.82rem}
.sfa .dolc{position:relative;padding-bottom:52px}
.sfa .dtop{display:grid;grid-template-columns:auto 1fr;gap:6px 26px;align-items:center;margin:12px 0 6px}
.sfa .dtot b{display:block;font:600 2.1rem/1 Fraunces,serif}.sfa .dtot span:last-child{font-size:.76rem;color:var(--m2)}
.sfa .dbar{display:flex;height:10px;border-radius:6px;overflow:hidden;background:rgba(255,255,255,.05)}.sfa .dbar i{display:block;height:100%}
.sfa .dleg{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:8px;font-size:.76rem;color:var(--m)}
.sfa .dleg b{color:var(--tx);font-family:"IBM Plex Mono",monospace;font-weight:600}
.sfa .dleg i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:5px}
.sfa .dt,.sfa .t,.sfa .ar{display:grid;gap:12px;align-items:center;min-height:46px;padding:4px 2px;border-top:1px solid var(--l);font-size:.86rem}
.sfa .dt{grid-template-columns:26px minmax(0,1.2fr) .9fr .8fr minmax(0,2fr) 86px 1fr}
.sfa .t{grid-template-columns:26px minmax(0,1.5fr) .9fr .9fr 92px .8fr .8fr;cursor:pointer}
.sfa .t:hover{background:rgba(139,92,246,.06)}
.sfa .ar{grid-template-columns:26px minmax(0,1fr) 1fr 1fr;min-height:44px}
.sfa .h{min-height:30px;font:700 10.5px Manrope,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--m2);border-top:0;margin-top:8px;cursor:default}
.sfa .h:hover{background:none}.sfa .h>span{text-align:right}.sfa .h>span:nth-child(2){text-align:left}.sfa .dt.h>span:nth-child(5),.sfa .dt.h>span:nth-child(6),.sfa .dt.h>span:nth-child(7){text-align:left}.sfa .t.h .c{text-align:center}
.sfa .n{min-width:0}.sfa .n b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sfa .n small{display:block;color:var(--m2);font-size:.74rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:-2px}
.sfa .x{text-align:right;font:600 .86rem "IBM Plex Mono",monospace;white-space:nowrap}.sfa .x.m{color:var(--m)}.sfa .c{text-align:center}
.sfa .em{font:700 .66rem Manrope,sans-serif;padding:1px 6px;border-radius:5px;margin-left:6px;vertical-align:1px}
.sfa .em.xStocks{color:#8ec5cf;background:rgba(122,184,196,.14)}.sfa .em.Backpack{color:#f0abfc;background:rgba(240,171,252,.14)}.sfa .em.Ondo{color:#fbbf24;background:rgba(251,191,36,.14)}
.sfa .em .c2{display:none}
.sfa .can{display:flex;flex-wrap:wrap;gap:4px}
.sfa .can i{font:700 .7rem Manrope,sans-serif;font-style:normal;padding:2px 7px;border-radius:6px;background:rgba(255,255,255,.06);color:#d8d2f5}
.sfa .can i.c2{background:rgba(251,191,36,.12);color:var(--a)}
.sfa .vig{font:700 .7rem Manrope,sans-serif;color:var(--v);border:1px solid rgba(74,222,128,.4);border-radius:999px;padding:2px 8px}
.sfa .an{color:inherit;text-decoration:none;border-bottom:1px dotted rgba(122,184,196,.55)}.sfa .an:hover{color:var(--q);border-bottom-color:var(--q)}
.sfa .dt a.rs{color:var(--q);text-decoration:none;font-size:.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sfa .inf{position:absolute;right:20px;bottom:14px;font:700 .82rem Manrope,sans-serif;color:var(--q);background:rgba(122,184,196,.08);border:1px solid rgba(122,184,196,.4);border-radius:999px;padding:6px 14px;cursor:pointer}
.sfa .inf:hover{background:rgba(122,184,196,.16)}
.sfa .hd2{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:8px 14px}
.sfa .bol{display:inline-flex;align-items:center;gap:7px;font-size:.76rem;color:var(--m);border:1px solid var(--l2);border-radius:999px;padding:3px 10px}
.sfa .bol i{width:7px;height:7px;border-radius:50%;background:var(--m2);flex:none}.sfa .bol.on i{background:var(--v)}
.sfa .barra{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin:14px 0 6px}
.sfa .f{display:flex;flex-wrap:wrap;gap:6px}
.sfa .f button{font:600 .82rem Manrope,sans-serif;color:#d8d2f5;background:rgba(255,255,255,.04);border:1px solid var(--l2);border-radius:999px;padding:5px 12px;cursor:pointer}
.sfa .f button span{color:var(--m2);font-size:.72rem;margin-left:3px}
.sfa .f button.on{background:var(--q);border-color:var(--q);color:#0b1720}.sfa .f button.on span{color:#0b1720}
.sfa .q{margin-left:auto;display:flex;align-items:center;gap:8px;border:1px solid var(--l2);border-radius:12px;padding:6px 12px;min-width:260px;background:rgba(5,4,13,.5)}
.sfa .q input{flex:1;background:none;border:0;color:var(--tx);font:500 .88rem Manrope,sans-serif;outline:none;min-width:0}
.sfa .q svg{width:15px;height:15px;stroke:var(--m2);fill:none;stroke-width:2;flex:none}
.sfa .pag{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:12px;font-size:.8rem;color:var(--m2)}
.sfa .pag button{font:700 .82rem Manrope,sans-serif;color:var(--q);background:none;border:1px solid var(--l2);border-radius:999px;padding:5px 14px;cursor:pointer}
.sfa .pag button[disabled]{opacity:.35;cursor:default}
.sfa .vacio{padding:18px 4px;color:var(--m);font-size:.88rem;border-top:1px solid var(--l)}
.sfa .src{font-size:.76rem;color:var(--m2);margin:10px 0 0}
.sfa .ar img{width:26px;height:26px;border-radius:8px}
.sfa .que{border-left:3px solid var(--q);border-radius:4px 14px 14px 4px;padding:13px 18px;background:linear-gradient(120deg,rgba(122,184,196,.1),rgba(255,255,255,.015) 75%);margin-bottom:12px}
.sfa .que .top b{font:600 1.02rem Fraunces,serif}.sfa .que .top span{font-size:.84rem;color:var(--m);margin-left:10px}
.sfa .que ul{list-style:none;margin:9px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.sfa .que li{font-size:.82rem;padding:4px 10px;border-radius:999px;background:rgba(5,4,13,.45);border:1px solid var(--l)}
.sfa-velo{position:fixed;inset:0;z-index:80;background:rgba(5,4,13,.72);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);display:grid;place-items:center;padding:16px}
.sfa-velo[hidden]{display:none}
.sfa-vent{position:relative;max-width:1000px;width:100%;max-height:calc(100vh - 32px);overflow:auto;background:#0c0a1e;border:1px solid rgba(251,191,36,.35);border-left:3px solid #fbbf24;border-radius:4px 14px 14px 4px;box-shadow:0 30px 80px rgba(0,0,0,.6);padding:20px 24px;color:#f1eeff;font:15px/1.5 Manrope,sans-serif}
.sfa-vent .top b{font:600 1.1rem Fraunces,serif}.sfa-vent .top span{font-size:.86rem;color:#a99fd6;margin-left:10px}
.sfa-vent .tres{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-top:12px}
.sfa-vent .tres div{font-size:.82rem;color:#a99fd6}
.sfa-vent .tres .k{display:block;margin-bottom:6px;font:800 10.5px Manrope,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#fbbf24}
.sfa-vent .tres p{margin:0 0 5px}.sfa-vent .tres p b{color:#f1eeff;font-weight:600}
.sfa-vent .ojo{margin:12px 0 0;font-size:.78rem;color:#8f86bb}
.sfa-vent .cerrar{position:absolute;top:10px;right:12px;font:700 1rem Manrope,sans-serif;color:#a99fd6;background:none;border:0;cursor:pointer;padding:6px}
@media (max-width:1000px){ .sfa-vent .tres{grid-template-columns:1fr 1fr} .sfa .t{grid-template-columns:26px minmax(0,1.5fr) .9fr .9fr 92px .8fr}.sfa .t .vol{display:none} }
@media (max-width:760px){
  .sfa h2{font-size:1.5rem}.sfa h2 small{font-size:1.15rem}.sfa .card{padding:14px}
  .sfa .q{margin-left:0;min-width:0;width:100%}
  .sfa .t{grid-template-columns:26px minmax(0,1fr) auto 80px;gap:8px}.sfa .t .real,.sfa .t .liq,.sfa .t .vol{display:none}
  .sfa .em .c1{display:none}.sfa .em .c2{display:inline}
  .sfa .dtop{grid-template-columns:1fr}
  .sfa .dt{grid-template-columns:26px minmax(0,1fr) auto;gap:8px}.sfa .dt .pr,.sfa .dt .vg,.sfa .dt .rs{display:none}.sfa .dt .cn{grid-column:2/-1}.sfa .dt.h .cn{display:none}
  .sfa-vent .tres{grid-template-columns:1fr}
  .sfa .ar{grid-template-columns:26px minmax(0,1fr) auto}.sfa .ar .tk{display:none}
}`;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let mem = null;
  function pinta(box, opts) {
    opts = opts || {};
    const T = opts.en ? EN : ES, loc = opts.en ? "en-US" : "es-ES";
    const fx = (n, d) => n == null ? "—" : n.toLocaleString(loc, { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: "always" });
    const fm = (n) => opts.en ? (n >= 1e9 ? "$" + fx(n / 1e9, 2) + "B" : n >= 1e6 ? "$" + fx(n / 1e6, 1) + "M" : n >= 1e3 ? "$" + fx(n / 1e3, 0) + "k" : "$" + fx(n, 0))
      : (n >= 1e9 ? fx(n / 1e9, 2) + " mil M$" : n >= 1e6 ? fx(n / 1e6, 1) + " M$" : n >= 1e3 ? fx(n / 1e3, 0) + " k$" : fx(n, 0) + " $");
    const usd = (n, d) => opts.en ? "$" + fx(n, d) : fx(n, d) + " $";
    const sq = (t, c) => '<span class="sq" style="background:' + (c || "#3b3b6d") + '">' + esc(String(t).slice(0, 4)) + "</span>";
    const prima = (f) => { if (f.prima == null) return '<span class="pill gr">—</span>'; const c = f.liq < 20000 ? "gr" : Math.abs(f.prima) < 1 ? "ok" : Math.abs(f.prima) < 3 ? "wa" : "no"; return '<span class="pill ' + c + '">' + (f.prima > 0 ? "+" : "") + fx(f.prima, 2) + (opts.en ? "%" : " %") + "</span>"; };
    const nom = (f) => (T.mat[f.accion] ? T.mat[f.accion] + " · " : "") + (T.nombre[f.nombre] || f.nombre || f.accion);
    const norm = (t) => String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (!document.getElementById("sfa-css")) { const st = document.createElement("style"); st.id = "sfa-css"; st.textContent = CSS; document.head.appendChild(st); }
    box.classList.add("sfa");
    box.innerHTML = '<p class="src">' + T.cargando + "</p>";
    let F = "todas", Q = "", pag = 0, A = null;
    const lista = () => A.filas.filter((f) => f.precio != null && (F === "todas" || f.cat === F) && (!Q || norm(f.tok + " " + f.accion + " " + nom(f) + " " + f.emisor).includes(norm(Q))));
    function tabla() {
      const l = lista(), ini = pag * POR, fin = Math.min(l.length, ini + POR);
      const fila = (f) => '<div class="t" data-m="' + esc(f.mint) + '">' + sq(f.accion, COLOR[f.accion]) + '<span class="n"><b><a class="an" href="' + (opts.en ? "/en/" : "/") + "?token=" + esc(f.mint) + '">' + esc(f.tok) + '</a> <span class="em ' + esc(f.emisor) + '"><span class="c1">' + esc(f.emisor) + '</span><span class="c2">' + (f.emisor === "Backpack" ? "BP" : f.emisor === "xStocks" ? "xS" : "On") + "</span></span></b><small>" + esc(nom(f)) + "</small></span>" +
        '<span class="x">' + usd(f.precio, 2) + '</span><span class="x m real">' + (f.real ? usd(f.real, 2) : "—") + '</span><span class="c">' + prima(f) + '</span><span class="x m liq">' + fm(f.liq) + '</span><span class="x m vol">' + fm(f.vol24) + "</span></div>";
      return (l.length ? l.slice(ini, fin).map(fila).join("") : '<div class="vacio">' + T.ninguno + "</div>") +
        '<div class="pag"><span>' + (l.length ? ini + 1 + "–" + fin + " " + T.de + " " + l.length : "") + '</span><span><button type="button" data-p="-1"' + (pag ? "" : " disabled") + ">" + T.ant + '</button> <button type="button" data-p="1"' + (fin < l.length ? "" : " disabled") + ">" + T.sig + "</button></span></div>";
    }
    function todo() {
      const fs = A.filas.filter((f) => f.precio != null), dol = (A.dolares || []).filter((x) => x.enSolana && x.valor), tot = dol.reduce((s, x) => s + x.valor, 0), ab = A.bolsa === "abierta";
      const ci = (f) => '<span class="ci">' + sq(f.accion, COLOR[f.accion]) + "<b>" + esc(f.tok) + "</b><small>" + esc(nom(f)) + '</small><span class="mono">' + usd(f.precio, 2) + "</span>" + prima(f) + "</span>";
      const una = fs.slice(0, 40).map(ci).join("");
      const reales = (opts.reales || []);
      box.innerHTML = (una ? '<div class="cin"><div class="tk">' + una + una + "</div></div>" : "") +
        (dol.length ? '<section class="card dolc"><h2>' + T.dol + " <small>" + T.dolS + "</small></h2>" +
          '<div class="dtop"><div class="dtot"><span class="k">' + T.hoy + "</span><b>" + (opts.en ? "$" + fx(tot / 1e6, 0) + "M" : fx(tot / 1e6, 0) + " M$") + "</b><span>" + T.comp + '</span></div><div><div class="dbar">' + dol.map((x) => '<i style="width:' + (x.valor / tot * 100) + "%;background:" + DCOL[x.tok] + '"></i>').join("") + '</div><div class="dleg">' + dol.map((x) => '<span><i style="background:' + DCOL[x.tok] + '"></i>' + x.tok + " <b>" + fm(x.valor) + "</b> · " + fx(x.valor / tot * 100, x.valor / tot < 0.1 ? 1 : 0) + (opts.en ? "%" : " %") + "</span>").join("") + "</div></div></div>" +
          '<div class="dt h"><span></span><span>' + T.hd[0] + "</span><span>" + T.hd[1] + '</span><span class="pr">' + T.hd[2] + '</span><span class="cn">' + T.hd[3] + '</span><span class="vg">' + T.hd[4] + '</span><span class="rs">' + T.hd[5] + "</span></div>" +
          dol.map((x) => '<div class="dt">' + sq(x.tok, DCOL[x.tok]) + '<span class="n"><b><a class="an" href="' + (opts.en ? "/en/" : "/") + "?token=" + esc(x.mint) + '">' + x.tok + "</a></b><small>" + esc(x.emisor) + '</small></span><span class="x">' + fx(x.enSolana / 1e6, x.enSolana < 1e8 ? 1 : 0) + ' M</span><span class="x m pr">' + usd(x.precio, 4) + '</span><span class="can cn"><i>' + T.crear + "</i><i>" + T.congelar + "</i>" + (PUEDE[x.tok] ? '<i class="c2">' + T.mover + '</i><i class="c2">' + T.comision + "</i>" : "") + '</span><span class="vg"><span class="vig">' + T.vig + '</span></span><a class="rs" href="' + esc(x.reservas) + '" target="_blank" rel="noopener">' + esc(new URL(x.reservas).hostname.replace("www.", "")) + " ↗</a></div>").join("") +
          '<button type="button" class="inf" data-sfainf>' + T.info + "</button></section>" : "") +
        '<section class="card"><div class="hd2"><h2>' + T.tok + " <small>" + T.tokS + '</small></h2><span class="bol' + (ab ? " on" : "") + '"><i></i><span>' + (ab ? T.bolsaA : T.bolsaC) + "</span></span></div>" +
          '<div class="barra"><div class="f">' + T.cats.map(([k, n]) => '<button type="button" data-f="' + k + '" class="' + (F === k ? "on" : "") + '">' + n + " <span>" + (k === "todas" ? fs.length : fs.filter((f) => f.cat === k).length) + "</span></button>").join("") + "</div>" +
          '<label class="q"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg><input data-q placeholder="' + T.busca + '" value="' + esc(Q) + '"></label></div>' +
          '<div class="t h"><span></span><span>' + T.th[0] + "</span><span>" + T.th[1] + '</span><span class="real">' + T.th[2] + '</span><span class="c">' + T.th[3] + '</span><span class="liq">' + T.th[4] + '</span><span class="vol">' + T.th[5] + "</span></div>" +
          '<div data-tb>' + tabla() + '</div><p class="src">' + T.srcT + "</p></section>" +
        (reales.length ? '<section class="card"><h2>' + T.reales + " <small>" + T.realesS + "</small></h2>" +
          '<div class="ar h"><span></span><span>' + T.rth[0] + "</span><span>" + T.rth[1] + '</span><span class="tk">' + T.rth[2] + "</span></div>" +
          reales.map((r) => '<div class="ar">' + (/^https:\/\//.test(r.logo || "") ? '<img src="' + esc(r.logo) + '" alt="" loading="lazy">' : sq(r.n)) + "<span><b>" + esc(r.n) + '</b></span><span class="x">' + fm(r.m) + '</span><span class="x m tk">' + (r.tok && r.sym ? esc(r.sym) : T.sinTok) + "</span></div>").join("") +
          '<p class="src">' + T.realesSrc + "</p></section>" : "") +
        '<div class="que"><div class="top"><b>' + T.que + "</b><span>" + T.queS + "</span></div><ul>" + T.queL.map((x) => "<li>" + x + "</li>").join("") + "</ul></div>" +
        '<p class="src">' + T.fin + "</p>";
    }
    // la ventana del emisor, una sola vez por página
    if (!document.getElementById("sfa-velo")) {
      const v = document.createElement("div"); v.id = "sfa-velo"; v.className = "sfa-velo"; v.hidden = true;
      v.innerHTML = '<div class="sfa-vent" role="dialog" aria-modal="true" aria-label="' + T.emi + '"><button type="button" class="cerrar" data-sfacerrar aria-label="' + T.cerrar + '">✕</button><div class="top"><b>' + T.emi + "</b><span>" + T.emiS + '</span></div><div class="tres">' +
        T.emiC.map(([t, ps]) => '<div><span class="k">' + t + "</span>" + ps.map(([b, r]) => "<p><b>" + b + "</b>" + (r && r[0] !== "," && r[0] !== ":" ? " " : "") + r + "</p>").join("") + "</div>").join("") + '</div><p class="ojo">' + T.ojo + "</p></div>";
      document.body.appendChild(v);
      v.addEventListener("click", (e) => { if (e.target === v || e.target.closest("[data-sfacerrar]")) v.hidden = true; });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") v.hidden = true; });
    }
    // los manejadores se añaden una vez por contenedor y llaman a los de la última vista (sin pisar los de la página)
    if (!box._sfa) { box._sfa = {}; box.addEventListener("click", (e) => box._sfa.click && box._sfa.click(e)); box.addEventListener("input", (e) => box._sfa.input && box._sfa.input(e)); }
    box._sfa.click = (e) => {
      if (e.target.closest("[data-sfainf]")) { document.getElementById("sfa-velo").hidden = false; return; }
      const b = e.target.closest("[data-f]"); if (b) { F = b.dataset.f; pag = 0; todo(); return; }
      const p = e.target.closest("[data-p]"); if (p && !p.disabled) { pag += +p.dataset.p; box.querySelector("[data-tb]").innerHTML = tabla(); return; }
      const t = e.target.closest(".t[data-m]"); if (t && !e.target.closest("a")) location.href = (opts.en ? "/en/" : "/") + "?token=" + t.dataset.m;
    };
    box._sfa.input = (e) => { if (e.target.matches("[data-q]")) { Q = e.target.value; pag = 0; box.querySelector("[data-tb]").innerHTML = tabla(); } };
    (mem || (mem = fetch(API).then((r) => r.ok ? r.json() : null).catch(() => null))).then((j) => {
      if (!j || !Array.isArray(j.filas)) { mem = null; box.innerHTML = '<p class="src">' + T.error + "</p>"; return; }
      A = j; todo();
      if (opts.alContar) opts.alContar(j.filas.filter((f) => f.precio != null).length + (j.dolares || []).filter((x) => x.enSolana && x.valor).length + (opts.reales || []).length);
    });
  }
  // los datos de la API (la misma petición que usa la vista), para contar sin pintar
  function datos() { return mem || (mem = fetch(API).then((r) => r.ok ? r.json() : null).catch(() => null)); }
  window.SFActivos = { pinta: pinta, datos: datos };
})();
