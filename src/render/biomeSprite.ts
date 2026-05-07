// Per-cell biome sprite cache. Bakes the displaced-clipped biome texture +
// glow + lighting of one hex into an offscreen canvas, so drawScene can
// composite each cell with a single drawImage instead of running ~100
// canvas operations per cell per frame.
//
// Cache key includes (biomeId, q, r, neighborMask, sizeKey) — anything that
// changes the visual content invalidates the sprite.

import type { BiomeDef } from "../tiles/types";
import {
  drawHexGlow,
  drawHexLighting,
  drawHexTexture,
  pathHex,
} from "./drawHex";
import { pathDisplacedHex } from "./displaced";

const SPRITE_MARGIN = 1.3; // hex extends up to size*0.18 past edge; 1.3 gives slack
const CACHE_LIMIT = 5000;

const cache = new Map<string, HTMLCanvasElement>();

export function clearBiomeSpriteCache() {
  cache.clear();
}

function makeKey(
  biomeId: string,
  q: number,
  r: number,
  mask: number,
  sizeKey: number,
): string {
  return `${biomeId}|${q},${r}|${mask}|${sizeKey}`;
}

function buildSprite(
  biome: BiomeDef,
  q: number,
  r: number,
  size: number,
  mask: number,
): HTMLCanvasElement {
  const half = Math.ceil(size * SPRITE_MARGIN);
  const dim = half * 2;
  const c = document.createElement("canvas");
  c.width = dim;
  c.height = dim;
  const ctx = c.getContext("2d");
  if (!ctx) return c;

  // Local coordinate system: center of hex at (half, half).
  const cx = half;
  const cy = half;

  // Pass 1 — texture inside displaced (wavy) clip.
  ctx.save();
  ctx.beginPath();
  pathDisplacedHex(ctx, q, r, cx, cy, size, mask);
  ctx.clip();
  drawHexTexture(ctx, q, r, cx, cy, size, biome);
  ctx.restore();

  // Pass 2 — ambient glow (no clip).
  drawHexGlow(ctx, cx, cy, size, biome);

  // Pass 3 — depth lighting in clean hex clip.
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
  half: number; // half-dimension in world pixels (centre→edge of sprite)
}

export function getBiomeSprite(
  biome: BiomeDef,
  q: number,
  r: number,
  size: number,
  mask: number,
): BiomeSprite {
  const sizeKey = Math.round(size);
  const key = makeKey(biome.id, q, r, mask, sizeKey);
  let canvas = cache.get(key);
  if (canvas) {
    cache.delete(key);
    cache.set(key, canvas);
  } else {
    canvas = buildSprite(biome, q, r, size, mask);
    if (cache.size >= CACHE_LIMIT) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(key, canvas);
  }
  return { canvas, half: Math.ceil(size * SPRITE_MARGIN) };
}
