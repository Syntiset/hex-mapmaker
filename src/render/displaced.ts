// Displaced hex polygon: hex with wavy boundary that matches between
// adjacent hexes, producing organic biome borders without seams.

import { hexCorners } from "../hex/hex";
import { noiseVec } from "./noise";

interface Pt { x: number; y: number }

const SAMPLES_PER_EDGE = 10;
const AMPLITUDE_FACTOR = 0.30; // fraction of hexSize
const FREQ_FACTOR = 1 / 1.7; // noise wavelength relative to hexSize

// Edge index i → NEIGHBOR_OFFSETS index. Edge 0 is between corners[0] and corners[1]
// (right side, E neighbor); edge 1 is lower-right (SE); etc.
// hex.ts NEIGHBOR_OFFSETS order: 0=E, 1=NE, 2=NW, 3=W, 4=SW, 5=SE
export const EDGE_TO_NEIGHBOR_OFFSET = [0, 5, 4, 3, 2, 1];

// Sample N+1 points along an edge with noise displacement.
// Endpoints (corners) stay fixed via sin(πt) mask — critical for 3-way junctions.
// Edge corners are canonicalized lexicographically so adjacent hexes interpolate
// in identical (lo → hi) order, ensuring shared edges produce identical points.
function edgePoints(a: Pt, b: Pt, size: number, includeStart: boolean): Pt[] {
  const lexLessAB = a.x < b.x || (a.x === b.x && a.y < b.y);
  const lo = lexLessAB ? a : b;
  const hi = lexLessAB ? b : a;
  const reversed = !lexLessAB;

  const amp = size * AMPLITUDE_FACTOR;
  const freq = FREQ_FACTOR / size;

  const canonical: Pt[] = [];
  for (let i = 0; i <= SAMPLES_PER_EDGE; i++) {
    const t = i / SAMPLES_PER_EDGE;
    const x = lo.x + (hi.x - lo.x) * t;
    const y = lo.y + (hi.y - lo.y) * t;
    if (i === 0 || i === SAMPLES_PER_EDGE) {
      canonical.push({ x, y });
      continue;
    }
    const [nx, ny] = noiseVec(x, y, freq);
    const m = Math.sin(Math.PI * t) * amp;
    canonical.push({ x: x + nx * m, y: y + ny * m });
  }

  // Restore original (a → b) traversal order for the caller.
  const seq = reversed ? canonical.slice().reverse() : canonical;
  return includeStart ? seq : seq.slice(1);
}

// Per-cell displaced polygon: wavy edges only where the corresponding neighbor
// is filled. Empty-neighbor edges stay straight so the hex's own fill never
// gets "carved" inward into the dark background.
//
// neighborMask is a 6-bit value: bit k = edge k has a filled neighbor.
export function displacedHexPolygonForCell(
  cx: number,
  cy: number,
  size: number,
  neighborMask: number,
): Pt[] {
  const corners = hexCorners(cx, cy, size);
  const out: Pt[] = [];
  for (let k = 0; k < 6; k++) {
    const A = corners[k];
    const B = corners[(k + 1) % 6];
    const wavy = ((neighborMask >> k) & 1) === 1;
    if (wavy) {
      const seg = edgePoints(A, B, size, k === 0);
      for (const p of seg) out.push(p);
    } else {
      // Straight edge: just the endpoints.
      if (k === 0) out.push(A);
      out.push(B);
    }
  }
  return out;
}

const polyCache = new Map<string, Float32Array>();
const CACHE_LIMIT = 5000;

export function getDisplacedPoly(
  q: number,
  r: number,
  cx: number,
  cy: number,
  size: number,
  neighborMask: number,
): Float32Array {
  const sizeKey = Math.round(size);
  const key = `${q},${r}|${sizeKey}|${neighborMask}`;
  const hit = polyCache.get(key);
  if (hit) {
    polyCache.delete(key);
    polyCache.set(key, hit);
    return hit;
  }
  const poly = displacedHexPolygonForCell(cx, cy, size, neighborMask);
  const arr = new Float32Array(poly.length * 2);
  for (let i = 0; i < poly.length; i++) {
    arr[i * 2] = poly[i].x;
    arr[i * 2 + 1] = poly[i].y;
  }
  if (polyCache.size >= CACHE_LIMIT) {
    const oldest = polyCache.keys().next().value;
    if (oldest !== undefined) polyCache.delete(oldest);
  }
  polyCache.set(key, arr);
  return arr;
}

export function clearDisplacedCache() {
  polyCache.clear();
}

export function pathDisplacedHex(
  ctx: CanvasRenderingContext2D,
  q: number,
  r: number,
  cx: number,
  cy: number,
  size: number,
  neighborMask: number,
) {
  const arr = getDisplacedPoly(q, r, cx, cy, size, neighborMask);
  ctx.moveTo(arr[0], arr[1]);
  for (let i = 2; i < arr.length; i += 2) {
    ctx.lineTo(arr[i], arr[i + 1]);
  }
  ctx.closePath();
}

export function withDisplacedHexClip(
  ctx: CanvasRenderingContext2D,
  q: number,
  r: number,
  cx: number,
  cy: number,
  size: number,
  neighborMask: number,
  fn: () => void,
) {
  ctx.save();
  ctx.beginPath();
  pathDisplacedHex(ctx, q, r, cx, cy, size, neighborMask);
  ctx.clip();
  fn();
  ctx.restore();
}
