// Per-cell biome sprite cache. Bakes biome texture + glow + lighting into an
// offscreen canvas so drawScene composites each cell with one drawImage
// instead of running ~100 canvas operations per cell per frame.
//
// Cache key: (biomeId, q, r, sizeKey). The (q, r) component keeps stipple
// patterns unique per cell — same biome twice would otherwise tile visibly.
//
// Soft-blend between biomes is handled by `drawBiomeBlob` at runtime in
// HexGridCanvas (radial gradient that extends past the hex with alpha
// falloff). Sprites carry only what stays inside the hex.

import type { BiomeDef } from "../tiles/types";
import {
  drawHexLighting,
  drawHexTexture,
  pathHex,
} from "./drawHex";
import { bakeNoiseTile } from "./noiseTexture";

const SPRITE_MARGIN = 1.2; // small slack for glow extending past hex
const CACHE_LIMIT = 2000;
const DPR = typeof window !== "undefined" ? Math.max(1, window.devicePixelRatio || 1) : 1;
const SPRITE_SCALE = Math.max(3, Math.ceil(DPR * 2));

const cache = new Map<string, HTMLCanvasElement>();

export function clearBiomeSpriteCache() {
  cache.clear();
}

function makeKey(
  biomeId: string,
  q: number,
  r: number,
  sizeKey: number,
): string {
  return `${biomeId}|${q},${r}|${sizeKey}`;
}

function buildSprite(
  biome: BiomeDef,
  q: number,
  r: number,
  size: number,
): HTMLCanvasElement {
  const half = Math.ceil(size * SPRITE_MARGIN);
  const dim = half * 2;
  const c = document.createElement("canvas");
  c.width = dim * SPRITE_SCALE;
  c.height = dim * SPRITE_SCALE;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.scale(SPRITE_SCALE, SPRITE_SCALE);

  const cx = half;
  const cy = half;
  // Pass 0 — solid biome.fill base inside hex clip.
  ctx.save();
  ctx.beginPath();
  pathHex(ctx, cx, cy, size);
  ctx.clip();
  ctx.fillStyle = biome.fill;
  ctx.fillRect(cx - size, cy - size, size * 2, size * 2);
  ctx.restore();

  // Pass 0.5 — noise albedo + edge vignette (composite blending).
  // Делает базовый цвет биома неоднородным — на нём появляются естественные
  // светлые/тёмные пятна. Шум сэмплируется по world-координатам (q*size, r*size),
  // чтобы соседние гексы продолжали одну картинку без видимых швов.
  ctx.save();
  ctx.beginPath();
  pathHex(ctx, cx, cy, size);
  ctx.clip();

  // Noise overlay через soft-light: модулирует яркость ±, не выбивая в ч/б.
  // Канвас рисуется в логическом разрешении (≈dim px), drawImage сам растянет
  // его до SPRITE_SCALE — лёгкая интерполяция работает в нашу пользу.
  const noiseW = Math.ceil(dim);
  const noiseH = Math.ceil(dim);
  const noiseTile = bakeNoiseTile(
    noiseW,
    noiseH,
    q * size * 2,
    r * size * 2,
    size * 0.4,                  // noise scale: меньше = крупнее пятна
    biome.noiseStrength ?? 0.4,  // strength: per-biome override (см. types.ts)
  );
  ctx.globalCompositeOperation = "soft-light";
  ctx.drawImage(noiseTile, 0, 0);

  // Edge vignette через multiply: затемняет края гекса на ~25%.
  const grad = ctx.createRadialGradient(cx, cy, size * 0.35, cx, cy, size * 1.05);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(1, "rgba(210,210,210,1)");
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = grad;
  ctx.fillRect(cx - size, cy - size, size * 2, size * 2);

  ctx.restore();

  // Pass 1 — texture (stipple + decoration) inside clean hex clip.
  ctx.save();
  ctx.beginPath();
  pathHex(ctx, cx, cy, size);
  ctx.clip();
  drawHexTexture(ctx, q, r, cx, cy, size, biome);
  ctx.restore();

  // Glow moved to a runtime post-pass in HexGridCanvas (drawn after all biome
  // sprites + edge-blends so each glow lands symmetrically on every neighbour).

  // Pass 2 — depth lighting in clean hex clip.
  ctx.save();
  ctx.beginPath();
  pathHex(ctx, cx, cy, size);
  ctx.clip();
  drawHexLighting(ctx, cx, cy, size);
  ctx.restore();

  return c;
}

export interface BiomeSprite {
  canvas: HTMLCanvasElement;
  half: number;
  dim: number;
}

export function getBiomeSprite(
  biome: BiomeDef,
  q: number,
  r: number,
  size: number,
): BiomeSprite {
  const sizeKey = Math.round(size);
  const key = makeKey(biome.id, q, r, sizeKey);
  let canvas = cache.get(key);
  if (canvas) {
    cache.delete(key);
    cache.set(key, canvas);
  } else {
    canvas = buildSprite(biome, q, r, size);
    if (cache.size >= CACHE_LIMIT) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(key, canvas);
  }
  const half = Math.ceil(size * SPRITE_MARGIN);
  return { canvas, half, dim: half * 2 };
}
