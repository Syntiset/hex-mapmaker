// Deterministic 2D value noise. Sampled in world coordinates so adjacent
// hexes agree on shared edge displacement.

export function hash2(ix: number, iy: number): number {
  let h = (ix | 0) * 374761393 + (iy | 0) * 668265263;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function hash3(q: number, r: number, layer: number): number {
  let h = (q | 0) * 374761393 + (r | 0) * 668265263 + (layer | 0) * 2147483647;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

export function valueNoise2D(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  const top = a * (1 - fx) + b * fx;
  const bot = c * (1 - fx) + d * fx;
  return top * (1 - fy) + bot * fy;
}

export function fbm2(x: number, y: number): number {
  return 0.65 * valueNoise2D(x, y) + 0.35 * valueNoise2D(x * 2.13 + 5.7, y * 2.13 - 3.1);
}

// 2D vector noise field, components in [-1, +1].
export function noiseVec(x: number, y: number, scale: number): [number, number] {
  const sx = x * scale;
  const sy = y * scale;
  const nx = fbm2(sx, sy) * 2 - 1;
  const ny = fbm2(sx + 91.7, sy - 47.3) * 2 - 1;
  return [nx, ny];
}

// Deterministic per-cell pseudo-random in [0, 1).
export function rand(seed: number, i: number): number {
  let h = (Math.imul((seed * 1e6) | 0, 374761393) ^ Math.imul(i + 1, 2654435761)) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
