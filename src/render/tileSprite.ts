// Per-cell tile (feature) sprite cache. Same idea as biomeSprite — bake the
// tile's decoration + glow + icon (with drop shadow) into an offscreen canvas
// so drawScene composites each tile with a single drawImage instead of
// running 2-3 canvas passes per cell per frame.
//
// Cache key: (tileId, q, r, sizeKey). The (q, r) component is needed because
// some icons (tree variants, debris, ash specks, ruin walls) and tile
// decorations seed their procedural variation from hash3(q, r, ...).

import type { TileDef } from "../tiles/types";
import {
  drawHexGlow,
  drawHexTexture,
  drawIconEnhanced,
  pathHex,
} from "./drawHex";

const SPRITE_MARGIN = 1.2; // small slack so drop shadow + glow fit
const CACHE_LIMIT = 2000;
const DPR = typeof window !== "undefined" ? Math.max(1, window.devicePixelRatio || 1) : 1;
const SPRITE_SCALE = Math.max(3, Math.ceil(DPR * 2));

const cache = new Map<string, HTMLCanvasElement>();

export function clearTileSpriteCache() {
  cache.clear();
}

function makeKey(
  tileId: string,
  q: number,
  r: number,
  sizeKey: number,
): string {
  return `${tileId}|${q},${r}|${sizeKey}`;
}

function buildSprite(
  tile: TileDef,
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

  // Pass 1 — tile decoration overlay inside clean hex clip.
  if (tile.decoration) {
    ctx.save();
    ctx.beginPath();
    pathHex(ctx, cx, cy, size);
    ctx.clip();
    drawHexTexture(ctx, q, r, cx, cy, size, tile);
    ctx.restore();
  }

  // Pass 2 — tile glow (no clip; halo extends within sprite bbox).
  drawHexGlow(ctx, cx, cy, size, tile);

  // Pass 3 — icon with drop shadow.
  if (tile.icon !== "none") {
    drawIconEnhanced(ctx, q, r, cx, cy, size, tile);
  }

  return c;
}

export interface TileSprite {
  canvas: HTMLCanvasElement;
  half: number;
  dim: number;
}

export function getTileSprite(
  tile: TileDef,
  q: number,
  r: number,
  size: number,
): TileSprite {
  const sizeKey = Math.round(size);
  const key = makeKey(tile.id, q, r, sizeKey);
  let canvas = cache.get(key);
  if (canvas) {
    cache.delete(key);
    cache.set(key, canvas);
  } else {
    canvas = buildSprite(tile, q, r, size);
    if (cache.size >= CACHE_LIMIT) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(key, canvas);
  }
  const half = Math.ceil(size * SPRITE_MARGIN);
  return { canvas, half, dim: half * 2 };
}
