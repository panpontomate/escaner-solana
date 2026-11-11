// Fondo de las páginas sueltas (blog, datos y acierto, privacidad, términos): la nebulosa de puntos de la portada
// (estilo del 11/11), arriba a la derecha y un poco abajo a la izquierda, fuera de la columna de texto en lo posible.
// Se pinta una vez (y al cambiar el tamaño) y queda quieta: no gasta nada mientras se lee.
(function(){
  var cv = document.createElement("canvas"); cv.setAttribute("aria-hidden", "true");
  cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none";
  document.body.insertBefore(cv, document.body.firstChild);
  function makeNoise(seed){
    var P = new Uint8Array(512), V = new Float32Array(256), s = seed;
    function r(){ s = s*16807 % 2147483647; return (s-1)/2147483646; }
    for (var i = 0; i < 256; i++){ P[i] = i; V[i] = r(); }
    for (i = 255; i > 0; i--){ var j = Math.floor(r()*(i+1)), t = P[i]; P[i] = P[j]; P[j] = t; }
    for (i = 0; i < 256; i++) P[i+256] = P[i];
    function vn(x, y){ var xi = Math.floor(x), yi = Math.floor(y), xf = x-xi, yf = y-yi; xi &= 255; yi &= 255;
      var u = xf*xf*(3-2*xf), v = yf*yf*(3-2*yf), a = V[P[P[xi]+yi]], b = V[P[P[xi+1]+yi]], c = V[P[P[xi]+yi+1]], d = V[P[P[xi+1]+yi+1]];
      return a + (b-a)*u + (c-a)*v + (a-b-c+d)*u*v; }
    function fbm(x, y, o){ var t = 0, a = .5, n = 0; for (var k = 0; k < o; k++){ t += vn(x, y)*a; n += a; x = x*2.02 + 13.7; y = y*2.02 + 7.1; a *= .5; } return t/n; }
    return {fbm:fbm, rnd:r};
  }
  function sm(a, b, x){ x = Math.max(0, Math.min(1, (x-a)/(b-a))); return x*x*(3-2*x); }
  var C1 = [139,92,246], C2 = [192,38,211], C3 = [122,184,196];
  function mix(a, b, t){ return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]; }
  function paint(){
    var W = innerWidth, H = innerHeight, D = Math.min(2, window.devicePixelRatio || 1), step = W > 960 ? 6 : 5;
    cv.width = Math.round(W*D); cv.height = Math.round(H*D);
    var x = cv.getContext("2d"); x.setTransform(D, 0, 0, D, 0, 0); x.clearRect(0, 0, W, H);
    var N = makeNoise(41), K = 3.2/Math.max(W, 900), col = Math.min(860, W), m0 = (W - col)/2;
    for (var py = step/2; py < H; py += step){
      var odd = Math.round(py/step) % 2 ? step/2 : 0;
      for (var px = step/2 + odd; px < W; px += step){
        var u = px/W, v = py/H, X = px*K, Y = py*K;
        // gas: una banda en diagonal arriba a la derecha y otra más débil abajo a la izquierda
        var d1 = Math.abs((v - .55) + u*.85), d2 = Math.abs((v - 1.55) + u*.85);
        var shape = Math.exp(-d1*d1/.03)*.9*sm(.45, .8, u) + Math.exp(-((u - .85)*(u - .85) + (v - .08)*(v - .08))/.04) + Math.exp(-d2*d2/.02)*.45*(1 - sm(.15, .4, u));
        // detrás del texto, mucho menos
        var ed = Math.min(px - m0, W - m0 - px), inCol = m0 > 40 ? .35 + .65*(1 - sm(-80, 80, ed)) : .3;
        var qx = N.fbm(X, Y, 3), qy = N.fbm(X + 5.2, Y + 1.3, 3), g = N.fbm(X + 2.4*qx, Y + 2.4*qy, 5);
        var dust = N.fbm(X*2.1 + 40, Y*2.1 + 9, 4); dust = Math.pow(1 - Math.abs(2*dust - 1), 6);
        var b = sm(.38, .78, g)*Math.min(1, shape)*inCol*(1 - dust*.75)*1.2; if (b < .04) continue;
        var h = N.fbm(X*.6 + 31, Y*.6 + 3, 3), tc = u*.9 + (h - .5)*1.1, c = tc < .5 ? mix(C3, C1, sm(.12, .5, tc)) : mix(C1, C2, sm(.5, .9, tc));
        x.fillStyle = "rgba(" + (c[0]+b*60|0) + "," + (c[1]+b*50|0) + "," + (c[2]+b*40|0) + "," + Math.min(1, .25 + b*.9) + ")";
        x.beginPath(); x.arc(px, py, Math.min(step*.62, .35 + b*step*.6), 0, 6.283); x.fill();
      }
    }
    for (var i = 0; i < W*H/9000; i++){ x.fillStyle = "rgba(241,238,255," + (.2 + N.rnd()*.5) + ")"; x.fillRect(N.rnd()*W, N.rnd()*H, 1.2, 1.2); }
  }
  var rt, lw = innerWidth; addEventListener("resize", function(){ if (Math.abs(innerWidth - lw) < 40 && innerWidth <= 960) return; lw = innerWidth; clearTimeout(rt); rt = setTimeout(paint, 250); });
  paint();
})();
