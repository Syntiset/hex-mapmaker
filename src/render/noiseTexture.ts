// Процедурная noise-текстура для биомов.
// Один общий simplex2D с фиксированным сидом — карта повторяема между сессиями.
// Каждая ячейка сэмплит шум по своим world-координатам, поэтому вариативность
// получается естественно: соседние гексы продолжают одну и ту же картинку шума.

import { createNoise2D } from "simplex-noise";
import alea from "alea";

const noise2D = createNoise2D(alea("mapmaker-noise-v1"));

function fbm(x: number, y: number, octaves = 4, lacunarity = 2.0, gain = 0.5): number {
  let value = 0,
    amp = 1,
    freq = 1,
    max = 0;
  for (let i = 0; i < octaves; i++) {
    value += noise2D(x * freq, y * freq) * amp;
    max += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return value / max; // [-1, 1]
}

function domainWarp(x: number, y: number, strength = 0.3): number {
  const dx = noise2D(x, y);
  const dy = noise2D(x + 5.2, y + 1.3);
  return fbm(x + strength * dx, y + strength * dy, 4);
}

// Возвращает offscreen canvas с шумом в виде серого изображения.
// 128 = нейтрально (под soft-light/overlay = без эффекта).
// strength ∈ [0, 1] — насколько сильно шум модулирует яркость.
export function bakeNoiseTile(
  width: number,
  height: number,
  worldOffsetX: number,
  worldOffsetY: number,
  noiseScale: number,
  strength = 0.5,
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  const data = ctx.createImageData(width, height);
  const buf = data.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const wx = (worldOffsetX + x) / noiseScale;
      const wy = (worldOffsetY + y) / noiseScale;
      const n = domainWarp(wx, wy, 0.3); // [-1, 1]
      const grey = Math.max(0, Math.min(255, Math.round(128 + n * 127 * strength)));
      const i = (y * width + x) * 4;
      buf[i] = grey;
      buf[i + 1] = grey;
      buf[i + 2] = grey;
      buf[i + 3] = 255;
    }
  }
  ctx.putImageData(data, 0, 0);
  return c;
}
