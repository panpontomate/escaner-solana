// Nebulosa de puntos de SolFlag (maquetas portada-aprobada y resultado-aprobado del 11/11).
// Pinta cada <canvas data-neb="hero|head|panel"> y las separaciones <canvas data-seam="N">, que se abren del centro
// a los lados al llegar a ellas. Se pinta una vez (y al cambiar de tamaño): no hay animación continua.
(function(){
var RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
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
// cada punto toma el brillo y el color del gas en su sitio; shape(u, v) da cuánto gas cabe ahí (0..1)
function paintDots(cv, seed, shape, step, gain, W, H){
  var D = Math.min(2, devicePixelRatio || 1); W = W || cv.clientWidth; H = H || cv.clientHeight; if (!W || !H) return false;
  cv.width = W*D; cv.height = H*D; var x = cv.getContext("2d"); x.setTransform(D, 0, 0, D, 0, 0); x.clearRect(0, 0, W, H);
  var N = makeNoise(seed), K = 3.2/Math.max(W, 900);
  for (var py = step/2; py < H; py += step){
    var odd = Math.round(py/step) % 2 ? step/2 : 0;
    for (var px = step/2 + odd; px < W; px += step){
      var u = px/W, v = py/H, X = px*K, Y = py*K;
      var qx = N.fbm(X, Y, 3), qy = N.fbm(X + 5.2, Y + 1.3, 3), g = N.fbm(X + 2.4*qx, Y + 2.4*qy, 5);
      var dust = N.fbm(X*2.1 + 40, Y*2.1 + 9, 4); dust = Math.pow(1 - Math.abs(2*dust - 1), 6);
      var b = sm(.38, .78, g)*shape(u, v)*(1 - dust*.75)*gain; if (b < .04) continue;
      var h = N.fbm(X*.6 + 31, Y*.6 + 3, 3), tc = u*.9 + (h - .5)*1.1, col = tc < .5 ? mix(C3, C1, sm(.12, .5, tc)) : mix(C1, C2, sm(.5, .9, tc));
      var rr = Math.min(step*.62, .35 + b*step*.6);
      x.fillStyle = "rgba(" + (col[0]+b*60|0) + "," + (col[1]+b*50|0) + "," + (col[2]+b*40|0) + "," + Math.min(1, .25 + b*.9) + ")";
      x.beginPath(); x.arc(px, py, rr, 0, 6.283); x.fill();
    }
  }
  for (var i = 0; i < W*H/9000; i++){ x.fillStyle = "rgba(241,238,255," + (.2 + N.rnd()*.5) + ")"; x.fillRect(N.rnd()*W, N.rnd()*H, 1.2, 1.2); }
  return true;
}
var SHAPES = {
  // portada: filamento ancho en diagonal que se abre detrás del Escáner, con menos gas detrás del titular
  hero: function(){ var wide = innerWidth > 960; return [function(u, v){
    var d = Math.abs((v - .95) + u*.85), band = Math.exp(-d*d/(wide ? .03 : .06));
    var arm = Math.exp(-Math.pow((v - .08) - (u - .55)*.25, 2)/.012)*sm(.4, .75, u);
    var core = Math.exp(-((u - .66)*(u - .66)*1.6 + (v - .3)*(v - .3))/.05);
    var text = wide ? 1 - .7*Math.exp(-((u - .22)*(u - .22) + (v - .52)*(v - .52)*.6)/.03) : .45;
    return Math.min(1, band*.85 + core*.9 + arm*.6)*text*(1 - sm(.8, 1, v)); }, wide ? 6 : 5, 1.25]; },
  // resultado: entra por arriba a la derecha y se aparta del nombre del token
  head: function(){ return [function(u, v){ var d = Math.abs((v - .95) + u*.85);
    return Math.min(1, Math.exp(-d*d/.03)*.8 + Math.exp(-((u - .8)*(u - .8) + (v - .15)*(v - .15))/.05))*sm(.35, .7, u)*(1 - sm(.75, 1, v)); }, 6, 1.2]; },
  // cierre de la portada: entra por la derecha
  panel: function(){ return [function(u, v){ return sm(.72, 1, u)*(1 - .4*Math.abs(v - .5)); }, 6, 1.4]; }
};
var items = [];
document.querySelectorAll("canvas[data-neb]").forEach(function(cv){
  items.push({cv:cv, w:0, h:0, paint:function(){ var s = SHAPES[cv.getAttribute("data-neb")](); return paintDots(cv, 41, s[0], s[1], s[2]); }});
});
document.querySelectorAll("canvas[data-seam]").forEach(function(cv){
  var it = {cv:cv, w:0, h:0, open:RM ? 1 : 0, go:RM, img:null};
  it.draw = function(){
    var D = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight; if (!W || !H || !it.img) return;
    cv.width = W*D; cv.height = H*D; var x = cv.getContext("2d"); x.setTransform(D, 0, 0, D, 0, 0);
    var half = W/2*it.open; if (half <= 0) return;
    x.save(); x.beginPath(); x.rect(W/2 - half, 0, half*2, H); x.clip(); x.drawImage(it.img, 0, 0, it.img.width, it.img.height, 0, 0, W, H); x.restore();
  };
  it.paint = function(){ var W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return false; it.img = document.createElement("canvas");
    paintDots(it.img, +cv.getAttribute("data-seam")*97, function(u, v){ var dv = (v - .5)/.16; return Math.exp(-dv*dv)*(1 - Math.pow(Math.abs(u - .5)*2, 3)*.6); }, 5, 1.35, W, H);
    it.draw(); return true; };
  items.push(it);
});
// se pinta cuando el lienzo tiene tamaño (el del resultado está oculto hasta que se analiza algo) y al cambiarlo
function check(){ items.forEach(function(it){ var W = it.cv.clientWidth, H = it.cv.clientHeight;
  if (W && H && (Math.abs(W - it.w) > 40 || Math.abs(H - it.h) > 40)){ if (it.paint()){ it.w = W; it.h = H; } } }); }
if (window.ResizeObserver){ var rt, ro = new ResizeObserver(function(){ clearTimeout(rt); rt = setTimeout(check, 120); }); items.forEach(function(it){ ro.observe(it.cv); }); }
else addEventListener("resize", check);
check();
// las separaciones se abren del centro hacia los lados la primera vez que se ven
if (!RM && window.IntersectionObserver){
  var io = new IntersectionObserver(function(es){ es.forEach(function(e){
    var it = items.filter(function(q){ return q.cv === e.target; })[0]; if (!it || !e.isIntersecting || it.go) return;
    it.go = true; io.unobserve(e.target); var t0 = performance.now();
    (function step(now){ var k = Math.min(1, (now - t0)/1800); it.open = 1 - Math.pow(1 - k, 3); it.draw(); if (k < 1) requestAnimationFrame(step); })(t0);
  }); }, {threshold:.4});
  items.forEach(function(it){ if (it.draw) io.observe(it.cv); });
} else items.forEach(function(it){ if (it.draw){ it.open = 1; it.draw(); } });
})();
