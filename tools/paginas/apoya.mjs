// «Apoya SolFlag» (28/11, maqueta aprobada maquetas/apoya): donar · saldo de la wallet en directo · en qué se usa.
// node tools/paginas/apoya.mjs → apoya/index.html y en/support/index.html (cabecera, pie y fondo de Cómo funciona).
// El saldo y las donaciones los lee la página de https://api.solflag.com/api/apoya (tools/api/apoya.js).
// GASTOS: cambiar aquí cuando cambie lo que se paga (y volver a generar). COSTES_MES: total de cada mes desde noviembre de 2026.
import fs from "fs";
import { createRequire } from "module";
const qrgen = createRequire(import.meta.url)("./vendor/qrcode-generator.cjs");

const DIR = "2DbYrSYgn3tdiEnWy6gU95JZYmhQ11cdLWsrM6H7kN16";
const COSTES_MES = { "2026-11": 44, "2026-12": 93 };   // a partir del último, se repite el último
const DESDE = "2026-11";

// QR de verdad (solana:<dirección>), corrección alta por el logo del centro
const q = qrgen(0, "H"); q.addData("solana:" + DIR); q.make();
const N = q.getModuleCount(); let qr = "";
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (q.isDark(y, x)) qr += `<rect x="${x}" y="${y}" width="1.02" height="1.02"/>`;
const c = N / 2;
const qrSvg = (al) => `<svg viewBox="-2 -2 ${N + 4} ${N + 4}" class="qr" role="img" aria-label="${al}"><rect x="-2" y="-2" width="${N + 4}" height="${N + 4}" fill="#fff"/><g fill="#05040d">${qr}</g><circle cx="${c}" cy="${c}" r="${N * 0.11}" fill="#fff"/><text x="${c}" y="${c + N * 0.045}" text-anchor="middle" font-size="${N * 0.12}" font-weight="800" fill="#7c3aed">SF</text></svg>`;
const ini = DIR.slice(0, 6), fin = DIR.slice(-6);

const T = {
  es: {
    src: "como-funciona/index.html", out: "apoya/index.html", url: "https://solflag.com/apoya/", alt: "https://solflag.com/en/support/",
    altLang: "en", altHref: "/en/support/", altTitle: "English version", altBtn: "EN", oldAlt: "/en/how-it-works/",
    title: "Apoya SolFlag", desc: "SolFlag es gratis, sin token ni anuncios. Dona en SOL o USDC, mira el saldo de la cartera en directo y en qué se gasta cada dólar.",
    kick: "Apoya SolFlag", h1: "Gratis para todos.<br>Si te sirve, ayuda a que siga así.",
    intro: "SolFlag no tiene token ni anuncios. Lo pagamos con lo que cuesta mirar la cadena cada día. Si quieres ayudar, aquí puedes donar, ver cuánto hay en la cartera en todo momento y en qué se gasta.",
    k1: "1 · Donar", h2a: "Desde cualquier wallet de Solana", n1: "SOL o USDC, en la red de Solana. Escanea el código con el móvil o copia la dirección.",
    qrAl: "Código QR para donar a SolFlag", copiar: "Copiar dirección", copiado: "Copiada ✓", abrir: "Abrir en mi wallet", msg: "Gracias",
    av1: `<b>Comprueba el principio y el final</b> antes de enviar: empieza por <b>${ini}</b> y acaba en <b>${fin}</b>. Hay quien copia direcciones parecidas.`,
    av2: "Solo red <b>Solana</b>. Desde otra red (Ethereum, BNB…) el dinero se pierde.",
    av3: "SolFlag <b>nunca</b> te escribirá para pedirte dinero. Esta página es el único sitio.",
    k2: "2 · La cartera, en directo", vivo: "de la cadena", h2b: "Cuánto hay ahora mismo", n2: "Es una wallet pública: lo que ves aquí lo puede comprobar cualquiera en Solscan.",
    sTot: "Saldo total", sTotS: "se actualiza cada 5 minutos", sMes: "Recibido este mes",
    vacio: "Todavía no hay donaciones. Aquí saldrá cada una, con su transacción.", fuente: "Datos de la cadena", solscan: "Ver la cartera en Solscan ↗",
    k3: "3 · En qué se usa", h2c: "Lo que cuesta SolFlag cada mes",
    acuK: "Lo que llevamos puesto de nuestro bolsillo", acuS: "desde noviembre de 2026 · cada mes sin donaciones se suma aquí",
    th: ["Mes", "Gastos", "Donaciones", "Resultado", "Acumulado"], prev: "previsto",
    gastos: [
      ["Datos de la cadena (Helius)", "leer Solana: quién tiene cada token, ballenas, lanzamientos · desde el 23/12, 49 $ al mes", "0 $"],
      ["Servidores (Cloudflare)", "la API, las fichas de cada token y la base de datos", "5 $"],
      ["Asistente para programar (Claude Pro)", "con él se escribe y se revisa el código de SolFlag", "20 $"],
      ["Cuenta de X (Premium)", "@solflagTeam: avisos y novedades · 8 €", "9 $"],
      ["Grok", "8 €", "9 $"],
      ["Dominio solflag.com", "al año 13 $", "1 $"],
      ["Bot de Telegram", "@SolFlagBot y el canal Radar · alojamiento gratis", "0 $"],
      ["Horas de trabajo", "unas 120–180 h al mes (4–6 h al día) · no se cobran", "0 $"],
    ],
    tot: "Total al mes", totS: "desde el 23/12, con Helius: 93 $",
    sig: [["Si sobra", "más tokens vigilados, ballenas al minuto y avisos más rápidos."], ["Cada mes", "publicamos aquí en qué se ha gastado, con las transacciones."], ["Nunca", "se compra ni se vende ningún token con este dinero."]],
    nota: "Donar no da acceso a nada especial: SolFlag sigue siendo igual para todos. Las donaciones van a una wallet que solo se usa para esto.",
    loc: "es-ES",
    js: { cubre: "Este mes las donaciones cubren el <b>{p} %</b> de los costes ({d} de {c}).", resto: " El resto lo pagamos de nuestro bolsillo.",
      ninguna: "todavía ninguna", una: "de 1 donación", varias: "de {n} donaciones", error: "No se pudo leer la cartera ahora. Puedes verla en Solscan.",
      hoy: "hoy", ayer: "ayer", gasto: "gasto", meses: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"] },
  },
  en: {
    src: "en/how-it-works/index.html", out: "en/support/index.html", url: "https://solflag.com/en/support/", alt: "https://solflag.com/apoya/",
    altLang: "es", altHref: "/apoya/", altTitle: "Versión en español", altBtn: "ES", oldAlt: "/como-funciona/",
    title: "Support SolFlag", desc: "SolFlag is free, with no token and no ads. Donate in SOL or USDC, see the wallet balance live and where every dollar goes.",
    kick: "Support SolFlag", h1: "Free for everyone.<br>If it helps you, help keep it that way.",
    intro: "SolFlag has no token and no ads. We pay for what it costs to read the chain every day. If you want to help, here you can donate, see what is in the wallet at any moment and what it is spent on.",
    k1: "1 · Donate", h2a: "From any Solana wallet", n1: "SOL or USDC, on the Solana network. Scan the code with your phone or copy the address.",
    qrAl: "QR code to donate to SolFlag", copiar: "Copy address", copiado: "Copied ✓", abrir: "Open in my wallet", msg: "Thanks",
    av1: `<b>Check the start and the end</b> before sending: it starts with <b>${ini}</b> and ends with <b>${fin}</b>. Some people copy look-alike addresses.`,
    av2: "<b>Solana</b> network only. From another network (Ethereum, BNB…) the money is lost.",
    av3: "SolFlag will <b>never</b> message you asking for money. This page is the only place.",
    k2: "2 · The wallet, live", vivo: "on-chain", h2b: "What is in it right now", n2: "It is a public wallet: anyone can check what you see here on Solscan.",
    sTot: "Total balance", sTotS: "updates every 5 minutes", sMes: "Received this month",
    vacio: "No donations yet. Each one will show up here, with its transaction.", fuente: "On-chain data", solscan: "See the wallet on Solscan ↗",
    k3: "3 · Where it goes", h2c: "What SolFlag costs each month",
    acuK: "What we have paid out of our own pocket", acuS: "since November 2026 · every month without donations adds up here",
    th: ["Month", "Costs", "Donations", "Result", "Running total"], prev: "expected",
    gastos: [
      ["Chain data (Helius)", "reading Solana: who holds each token, whales, launches · from 23 Dec, $49 a month", "$0"],
      ["Servers (Cloudflare)", "the API, each token's page and the database", "$5"],
      ["Coding assistant (Claude Pro)", "used to write and review SolFlag's code", "$20"],
      ["X account (Premium)", "@solflagTeam: alerts and news · €8", "$9"],
      ["Grok", "€8", "$9"],
      ["solflag.com domain", "$13 a year", "$1"],
      ["Telegram bot", "@SolFlagBot and the Radar channel · free hosting", "$0"],
      ["Working hours", "about 120–180 h a month (4–6 h a day) · unpaid", "$0"],
    ],
    tot: "Total per month", totS: "from 23 Dec, with Helius: $93",
    sig: [["If there is extra", "more tokens watched, whales by the minute and faster alerts."], ["Every month", "we publish here what it was spent on, with the transactions."], ["Never", "is any token bought or sold with this money."]],
    nota: "Donating gives no special access: SolFlag stays the same for everyone. Donations go to a wallet used only for this.",
    loc: "en-US",
    js: { cubre: "This month donations cover <b>{p}%</b> of the costs ({d} of {c}).", resto: " We pay the rest out of our own pocket.",
      ninguna: "none yet", una: "from 1 donation", varias: "from {n} donations", error: "Could not read the wallet right now. You can see it on Solscan.",
      hoy: "today", ayer: "yesterday", gasto: "expense", meses: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] },
  },
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

for (const lang of ["es", "en"]) {
  const t = T[lang];
  const src = fs.readFileSync(t.src, "utf8");
  let cab = src.slice(0, src.indexOf("</header>") + 9);
  const oldUrl = (cab.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  cab = cab.replace(/<title>[^<]*<\/title>/, `<title>${t.title} · SolFlag</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, "$1" + esc(t.desc))
    .replace(/(<meta property="og:title" content=")[^"]*/, "$1" + t.title + " · SolFlag")
    .replace(/(<meta property="og:description" content=")[^"]*/, "$1" + esc(t.desc))
    .split(oldUrl).join(t.url)
    .replace(new RegExp(`(<link rel="alternate" hreflang="${t.altLang}" href=")[^"]+`), "$1" + t.alt)
    .replace(`class="plang" href="${t.oldAlt}"`, `class="plang" href="${t.altHref}"`)
    .replace("</head>", `<link href="/apoya/apoya.css?v=1" rel="stylesheet">\n</head>`);
  const pie = src.slice(src.indexOf("<footer>"));
  const J = Object.assign({}, t.js, { dir: DIR, costes: COSTES_MES, desde: DESDE, loc: t.loc, prev: t.prev, copiado: t.copiado, copiar: t.copiar });
  const cuerpo = `<article>
<div class="ap-hero">
  <p class="kick">${t.kick}</p>
  <h1>${t.h1}</h1>
  <p>${t.intro}</p>
</div>

<section class="ap-sec">
  <p class="kick">${t.k1}</p>
  <h2>${t.h2a}</h2>
  <p class="n">${t.n1}</p>
  <div class="don">
    ${qrSvg(t.qrAl)}
    <div>
      <p class="dir" translate="no"><b>${ini}</b>${DIR.slice(6, -6)}<b>${fin}</b></p>
      <div class="bts"><button class="bt pri" type="button" id="ap-copiar">${t.copiar}</button><a class="bt" href="solana:${DIR}?label=SolFlag&amp;message=${t.msg}">${t.abrir}</a></div>
      <ul>
        <li>${t.av1}</li>
        <li>${t.av2}</li>
        <li>${t.av3}</li>
      </ul>
    </div>
  </div>
</section>

<section class="ap-sec">
  <p class="kick">${t.k2} <span class="vivo" style="margin-left:10px"><i></i>${t.vivo}</span></p>
  <h2>${t.h2b}</h2>
  <p class="n">${t.n2}</p>
  <div class="sal">
    <div><span>${t.sTot}</span><b id="ap-tot" class="cargando">—</b><small>${t.sTotS}</small></div>
    <div><span>SOL</span><b id="ap-sol" class="cargando">—</b><small id="ap-solu">&nbsp;</small></div>
    <div><span>USDC</span><b id="ap-usdc" class="cargando">—</b><small id="ap-usdcu">&nbsp;</small></div>
    <div><span>${t.sMes}</span><b id="ap-mes" class="cargando">—</b><small id="ap-mesn">&nbsp;</small></div>
  </div>
  <ul class="ult" id="ap-ult" hidden></ul>
  <p class="n" id="ap-vacio" style="margin:14px 0 4px;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.08)">${t.vacio}</p>
  <p class="ap-src">${t.fuente} · <a href="https://solscan.io/account/${DIR}" target="_blank" rel="noopener">${t.solscan}</a></p>
</section>

<section class="ap-sec">
  <p class="kick">${t.k3}</p>
  <h2>${t.h2c}</h2>
  <div class="cub"><div class="bar"><i id="ap-bar"></i></div><p id="ap-cubre">&nbsp;</p></div>
  <div class="acu">
    <p class="k">${t.acuK}</p>
    <p class="big"><span id="ap-acu">—</span><small>${t.acuS}</small></p>
    <table>
      <thead><tr>${t.th.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody id="ap-meses"></tbody>
    </table>
  </div>
  <table class="gas">
${t.gastos.map(([a, b, v]) => `    <tr><td>${a}<small>${b}</small></td><td>${v}</td></tr>`).join("\n")}
    <tr class="tot"><td>${t.tot}<small>${t.totS}</small></td><td>${lang === "es" ? "44 $" : "$44"}</td></tr>
  </table>
  <div class="sig">
${t.sig.map(([a, b]) => `    <div><b>${a}</b><span>${b}</span></div>`).join("\n")}
  </div>
  <p class="ap-nota">${t.nota}</p>
</section>
</article>
<script>
(function(){
var L=${JSON.stringify(J)};
var $=function(i){return document.getElementById(i)};
function usd(v){var n=Math.round(v).toLocaleString(L.loc);return L.loc==="en-US"?(v<0?"−$"+n.replace("-",""):"$"+n):n.replace("-","−")+" $"}
function num(v,d){return v.toLocaleString(L.loc,{maximumFractionDigits:d})}
function mesDe(ts){var d=new Date(ts*1000);return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)}
function coste(m){var k=Object.keys(L.costes).sort(),c=L.costes[k[k.length-1]];k.forEach(function(x){if(x<=m)c=L.costes[x]});return L.costes[m]!=null?L.costes[m]:c}
function sig(m){var y=+m.slice(0,4),mo=+m.slice(5);mo++;if(mo>12){mo=1;y++}return y+"-"+("0"+mo).slice(-2)}
function nombre(m){var s=L.meses[+m.slice(5)-1];return s.charAt(0).toUpperCase()+s.slice(1)+" "+m.slice(0,4)}
function cuando(ts){var d=new Date(ts*1000),h=new Date(),a=new Date(Date.now()-864e5),hh=d.toLocaleTimeString(L.loc,{hour:"numeric",minute:"2-digit"});
  if(d.toDateString()===h.toDateString())return L.hoy+", "+hh;if(d.toDateString()===a.toDateString())return L.ayer+", "+hh;return d.toLocaleDateString(L.loc,{day:"numeric",month:"short"})}
function corta(w){return w?w.slice(0,4)+"…"+w.slice(-4):""}
var bt=$("ap-copiar");bt.onclick=function(){(navigator.clipboard?navigator.clipboard.writeText(L.dir):Promise.reject()).then(function(){bt.textContent=L.copiado;bt.classList.add("ok");setTimeout(function(){bt.textContent=L.copiar;bt.classList.remove("ok")},2000)}).catch(function(){})};
function meses(don){
  var hoy=mesDe(Date.now()/1000),filas=[],acu=0,m=L.desde;
  while(m<=hoy){var c=coste(m),d=don[m]||0,r=d-c;acu+=r;filas.push("<tr><td>"+nombre(m)+"</td><td>"+usd(c)+"</td><td>"+usd(d)+"</td><td class='"+(r<0?"neg":"")+"'>"+usd(r)+"</td><td class='"+(acu<0?"neg":"")+"'>"+usd(acu)+"</td></tr>");m=sig(m)}
  var n=sig(hoy),cn=coste(n);
  filas.push("<tr class='prev'><td>"+nombre(n)+"<br><small>"+L.prev+"</small></td><td>"+usd(cn)+"</td><td>—</td><td class='neg'>"+usd(-cn)+"</td><td class='neg'>"+usd(acu-cn)+"</td></tr>");
  $("ap-meses").innerHTML=filas.join("");$("ap-acu").textContent=usd(acu);$("ap-acu").style.color=acu<0?"":"#4ade80";
  var ch=coste(hoy),dh=don[hoy]||0,p=Math.min(100,Math.round(dh/ch*100));
  $("ap-bar").style.width=p+"%";$("ap-cubre").innerHTML=L.cubre.replace("{p}",p).replace("{d}",usd(dh)).replace("{c}",usd(ch))+(p<100?L.resto:"");
}
meses({});
function carga(){
  fetch("https://api.solflag.com/api/apoya").then(function(r){return r.ok?r.json():null}).then(function(a){
    if(!a)throw 0;var px=a.solUsd||0,hoy=mesDe(Date.now()/1000),don={},n=0;
    ["ap-tot","ap-sol","ap-usdc","ap-mes"].forEach(function(i){$(i).classList.remove("cargando")});
    $("ap-tot").textContent=usd(a.sol*px+a.usdc);$("ap-sol").textContent=num(a.sol,3);$("ap-solu").textContent="≈ "+usd(a.sol*px);
    $("ap-usdc").textContent=num(a.usdc,2);$("ap-usdcu").textContent="≈ "+usd(a.usdc);
    var mov=a.mov||[],ult=[];
    mov.forEach(function(x){var v=(x.sol>0?x.sol*px:0)+(x.usdc>0?x.usdc:0);if(v>0){var m=mesDe(x.t);don[m]=(don[m]||0)+v;if(m===hoy)n++}});
    $("ap-mes").textContent=usd(don[hoy]||0);$("ap-mesn").textContent=n===0?L.ninguna:n===1?L.una:L.varias.replace("{n}",n);
    mov.slice(0,8).forEach(function(x){var ent=x.sol>0||x.usdc>0,q=x.usdc?num(Math.abs(x.usdc),2)+" USDC":num(Math.abs(x.sol),3)+" SOL";
      ult.push("<li><span class='h'>"+cuando(x.t)+"</span><span class='c"+(ent?"":" out")+"'>"+(ent?"+":"−")+q+"</span><span class='w'>"+(ent?(x.de?"<a href='https://solscan.io/account/"+x.de+"' target='_blank' rel='noopener'>"+corta(x.de)+"</a> · ":""):L.gasto+" · ")+"<a href='https://solscan.io/tx/"+x.sig+"' target='_blank' rel='noopener'>tx ↗</a>"+(x.sol&&!x.usdc&&px?" · ≈ "+usd(Math.abs(x.sol)*px):"")+"</span></li>")});
    $("ap-ult").innerHTML=ult.join("");$("ap-ult").hidden=!ult.length;$("ap-vacio").hidden=!!ult.length;
    meses(don);
  }).catch(function(){$("ap-vacio").textContent=L.error});
}
carga();setInterval(carga,300000);
})();
</script>
`;
  fs.mkdirSync(t.out.slice(0, t.out.lastIndexOf("/")), { recursive: true });
  fs.writeFileSync(t.out, cab + "\n" + cuerpo + pie);
  console.log("ok", t.out);
}
