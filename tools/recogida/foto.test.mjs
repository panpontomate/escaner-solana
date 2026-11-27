import test from "node:test";
import assert from "node:assert/strict";
import { motivoFoto, cambioQuien, FOTO_MOV, FOTO_QUIETO, FOTO_SENAL } from "./recoger.mjs";

const T = Date.UTC(2026, 10, 28, 12, 0), H = 3600e3;
const tranquilo = { liq: 1e6, vol: { h1: 1000, h24: 48000 } };

test("foto: la primera vez siempre", () => assert.equal(motivoFoto(0, 0, tranquilo, [], 0, T), "primera"));
test("foto: un token tranquilo, cada 8 h", () => {
  assert.equal(motivoFoto(T - 3 * H, 0, tranquilo, [], 1e6, T), null);
  assert.equal(motivoFoto(T - FOTO_QUIETO, 0, tranquilo, [], 1e6, T), "toca");
});
test("foto: uno que se ha movido en los últimos 3 días, cada 2 h", () => {
  assert.equal(motivoFoto(T - H, T - 864e5, tranquilo, [], 1e6, T), null);
  assert.equal(motivoFoto(T - FOTO_MOV, T - 864e5, tranquilo, [], 1e6, T), "se mueve");
  assert.equal(motivoFoto(T - FOTO_MOV, T - 4 * 864e5, tranquilo, [], 1e6, T), null);   // hace más de 3 días: vuelve a tranquilo
});
test("foto: señal gratis (ballena, volumen raro o liquidez que cae), con 30 min desde la última", () => {
  assert.equal(motivoFoto(T - H, 0, tranquilo, [{ usd: 15000 }], 1e6, T), "señal");
  assert.equal(motivoFoto(T - H, 0, { liq: 1e6, vol: { h1: 40000, h24: 96000 } }, [], 1e6, T), "señal");
  assert.equal(motivoFoto(T - H, 0, { liq: 7e5, vol: { h1: 1000, h24: 48000 } }, [], 1e6, T), "señal");
  assert.equal(motivoFoto(T - FOTO_SENAL / 2, 0, tranquilo, [{ usd: 15000 }], 1e6, T), null);
  assert.equal(motivoFoto(T - H, 0, tranquilo, [{ usd: 5000 }], 1e6, T), null);
});
test("cambio en las 20 mayores: 0,3 puntos o más", () => {
  assert.equal(cambioQuien([10, 30, 5, 0], { mayor: 10.1, top10w: 30.2, exch: 5, proy: 0 }), false);
  assert.equal(cambioQuien([10, 30, 5, 0], { mayor: 10, top10w: 30, exch: 5.4, proy: 0 }), true);
  assert.equal(cambioQuien(null, { mayor: 1, top10w: 1, exch: 1 }), false);
});
