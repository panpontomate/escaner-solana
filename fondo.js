// Fondo de las páginas sueltas (blog, datos y acierto, privacidad, términos): la nebulosa del On-chain Map, estrellas y unas
// burbujas de jabón en los márgenes, para que se vean como el resto de SolFlag. Se pinta una vez (y al cambiar el tamaño),
// a baja resolución y quieto: no gasta nada mientras se lee.
(function(){
  var cv = document.createElement("canvas"); cv.setAttribute("aria-hidden", "true");
  cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none";
  document.body.insertBefore(cv, document.body.firstChild);
  function rng(s){ return function(){ s = s*16807 % 2147483647; return (s-1)/2147483646; }; }
  function paint(){
    var W = innerWidth, H = innerHeight, D2 = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W*D2); cv.height = Math.round(H*D2);
    var x = cv.getContext("2d"); x.setTransform(D2, 0, 0, D2, 0, 0);
    var R = rng(12*7 + 3), S = 5, w = Math.ceil(W/S), h = Math.ceil(H/S), P = new Uint8Array(512), i, j;
    for (i = 0; i < 256; i++) P[i] = i;
    for (i = 255; i > 0; i--){ j = Math.floor(R()*(i+1)); var t = P[i]; P[i] = P[j]; P[j] = t; }
    for (i = 0; i < 256; i++) P[i+256] = P[i];
    function vn(a, b){ var xi = Math.floor(a), yi = Math.floor(b), xf = a-xi, yf = b-yi; xi &= 255; yi &= 255;
      var p = P[P[xi]+yi]/255, q = P[P[xi+1]+yi]/255, r = P[P[xi]+yi+1]/255, d = P[P[xi+1]+yi+1]/255, sx = xf*xf*(3-2*xf), sy = yf*yf*(3-2*yf);
      return p + (q-p)*sx + (r-p)*sy + (p-q-r+d)*sx*sy; }
    function fbm(a, b, o){ var v = 0, am = .5, n = 0; for (var k = 0; k < o; k++){ v += vn(a, b)*am; n += am; a = a*2.03 + 17.1; b = b*2.03 + 9.7; am *= .5; } return v/n; }
    function sm(a, b, v){ v = Math.max(0, Math.min(1, (v-a)/(b-a))); return v*v*(3-2*v); }
    var u = Math.max(700, Math.min(W, H)), k2 = 2.6/u, blobs = [];
    for (i = 0; i < 3; i++){ var an = R()*6.283, dd = (.45 + R()*.4)*u; blobs.push([W/2 + Math.cos(an)*dd*1.3, H/2 + Math.sin(an)*dd*.8, (.45 + R()*.35)*u]); }
    var img = x.createImageData(w, h), D = img.data;
    for (var py = 0; py < h; py++) for (var px = 0; px < w; px++){
      var X = px*S, Y = py*S, nx = X*k2, ny = Y*k2, qx = fbm(nx, ny, 3), qy = fbm(nx + 5.2, ny + 1.3, 3);
      var g = fbm(nx + 2.2*qx, ny + 2.2*qy, 5), hue = fbm(nx*.5 + 31, ny*.5 + 7, 3), reg = .18;
      for (i = 0; i < 3; i++){ var bx = X - blobs[i][0], by = Y - blobs[i][1]; reg += Math.exp(-(bx*bx + by*by)/(blobs[i][2]*blobs[i][2])); }
      var gas = sm(.42, .85, g)*Math.min(1, reg), dn = fbm(nx*1.7 + 50, ny*1.7 + 20, 4), dust = Math.pow(1 - Math.abs(2*dn - 1), 7)*sm(.2, .6, reg);
      var rr = 11, gg = 7, bb = 34, mA = sm(.3, .7, hue), a1 = gas*(1 - dust*.85);
      rr += a1*(230*(1-mA) + 255*mA)*.3; gg += a1*(80*(1-mA) + 120*mA)*.3; bb += a1*(240*(1-mA) + 170*mA)*.3;
      rr += gas*gas*22; gg += gas*gas*18; bb += gas*gas*45;
      var o = (py*w + px)*4; D[o] = rr; D[o+1] = gg; D[o+2] = bb; D[o+3] = 255; }
    var nc = document.createElement("canvas"); nc.width = w; nc.height = h; nc.getContext("2d").putImageData(img, 0, 0);
    x.imageSmoothingQuality = "high"; x.drawImage(nc, 0, 0, W, H);
    // estrellas
    var ns = Math.round(W*H/4200);
    for (i = 0; i < ns; i++){ x.globalAlpha = .15 + R()*.45; x.fillStyle = "#fff"; x.beginPath(); x.arc(R()*W, R()*H, Math.pow(R(), 3)*1.5 + .3, 0, 6.283); x.fill(); }
    x.globalAlpha = 1;
    // burbujas de jabón solo en los márgenes (fuera de la columna de texto)
    var col = Math.min(860, W - 32), m0 = (W - col)/2;
    if (m0 > 60){ var cols = ["#c4b5fd", "#7ab8c4", "#f9a8d4", "#c4b5fd"];
      for (i = 0; i < 7; i++){ var left = i % 2 === 0, r = 10 + R()*Math.min(46, m0*.35), cx = left ? r + 12 + R()*(m0 - 2*r - 24) : W - m0 + r + 12 + R()*(m0 - 2*r - 24), cy = r + R()*(H - 2*r);
        if (m0 - 2*r - 24 > 0) bubble(x, cx, cy, r, cols[i % 4]); } }
  }
  function bubble(x, cx, cy, r, col){
    x.save(); x.translate(cx, cy);
    var g = x.createRadialGradient(-r*.28, -r*.4, 0, 0, 0, r); g.addColorStop(0, "rgba(255,255,255,.1)"); g.addColorStop(.7, "rgba(255,255,255,.03)"); g.addColorStop(.93, col); g.addColorStop(1, "rgba(255,255,255,.05)");
    x.globalAlpha = .45; x.fillStyle = g; x.beginPath(); x.arc(0, 0, r, 0, 6.283); x.fill();
    x.globalAlpha = .6; x.strokeStyle = col; x.lineWidth = Math.max(1, r*.06); x.beginPath(); x.arc(0, 0, r, 0, 6.283); x.stroke();
    x.globalAlpha = .5; var hl = x.createRadialGradient(-r*.34, -r*.42, 0, -r*.34, -r*.42, r*.4); hl.addColorStop(0, "rgba(255,255,255,.85)"); hl.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = hl; x.beginPath(); x.arc(-r*.34, -r*.42, r*.4, 0, 6.283); x.fill();
    x.globalAlpha = .85; x.fillStyle = "#fff"; x.beginPath(); x.arc(-r*.42, -r*.46, Math.max(.8, r*.08), 0, 6.283); x.fill();
    x.restore(); }
  var rt; addEventListener("resize", function(){ clearTimeout(rt); rt = setTimeout(paint, 250); });
  paint();
})();
