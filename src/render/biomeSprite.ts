// Per-cell biome sprite cache. Bakes the displaced-clipped biome texture +
// glow + lighting of one hex into an offscreen canvas, so drawScene can
// composite each cell with a single drawImage instead of running ~100
// canvas operations per cell per frame.
//
// Cache key includes (biomeId, q, r, neighborMask, sizeKey) — anything that
// changes the visual content invalidates the sprite.

import type { BiomeDef } from "../tiles/types";
import { axialToPixel } from "../hex/hex";
import {
  drawHexGlow,
  drawHexLighting,
  drawHexTexture,
  pathHex,
} from "./drawHex";
import { displacedHexPolygonForCell } from "./displaced";

const SPRITE_MARGIN = 1.3; // hex extends up to size*0.18 past edge; 1.3 gives slack
const CACHE_LIMIT = 2000;  // each sprite ~94×3 px² × 4B ≈ 320KB → max ~640MB worst-case; realistic ≪
// Bake sprites at supersampled resolution so they stay crisp on:
//  - HiDPI / Retina (DPR > 1)
//  - Windows fractional scaling (DPR 1.25 / 1.5 — common cause of slight blur)
//  - Modest zoom-in (factor 1.5–2× before pixellation)
// Floor of 3× ensures clean integer-ish downsample to all common DPRs.
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
  // Backing store at SPRITE_SCALE× resolution; logical coords stay at world units.
  c.width = dim * SPRITE_SCALE;
  c.height = dim * SPRITE_SCALE;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.scale(SPRITE_SCALE, SPRITE_SCALE);

  // Critical: compute the wavy displaced polygon in WORLD coordinates so the
  // noise field samples line up with adjacent hexes. If we sampled noise in
  // sprite-local coords (everyone centred at (half, half)), neighbours would
  // sample at mismatched offsets (e.g. A's right midpoint at (half+apothem)
  // vs B's left midpoint at (half-apothem)) → different displacements → tiny
  // gaps and overlapping texture across the shared edge.
  const world = axialToPixel(q, r, size);
  const polyWorld = displacedHexPolygonForCell(world.x, world.y, size, mask);

  // Translate world polygon into sprite-local coords (centre of hex at (half, half)).
  const dx = half - world.x;
  const dy = half - world.y;

  const cx = half;
  const cy = half;

  // Pass 1 — texture inside displaced (wavy) clip.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(polyWorld[0].x + dx, polyWorld[0].y + dy);
  for (let i = 1; i < polyWorld.length; i++) {
    ctx.lineTo(polyWorld[i].x + dx, polyWorld[i].y + dy);
  }
  ctx.closePath();
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
  dim: number;  // world-pixel dimension (2 × half) for explicit drawImage sizing
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
  const half = Math.ceil(size * SPRITE_MARGIN);
  return { canvas, half, dim: half * 2 };
}
