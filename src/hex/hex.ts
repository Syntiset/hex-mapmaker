// Pointy-top hex math (axial coords q, r). Reference: Red Blob Games.

export interface Axial {
  q: number;
  r: number;
}

export interface Point {
  x: number;
  y: number;
}

export const SQRT3 = Math.sqrt(3);

// Side index 0..5 corresponds to neighbour direction (E, NE, NW, W, SW, SE).
// Edge midpoint angle (degrees) = 60 * sideIndex.
export const NEIGHBOR_OFFSETS: Axial[] = [
  { q: +1, r: 0 },  // 0 E
  { q: +1, r: -1 }, // 1 NE
  { q: 0,  r: -1 }, // 2 NW
  { q: -1, r: 0 },  // 3 W
  { q: -1, r: +1 }, // 4 SW
  { q: 0,  r: +1 }, // 5 SE
];

export function axialKey(q: number, r: number): string {
  return `${q},${r}`;
}

export function parseKey(key: string): Axial {
  const [q, r] = key.split(",").map(Number);
  return { q, r };
}

export function neighborKey(q: number, r: number, side: number): string {
  const o = NEIGHBOR_OFFSETS[side];
  return axialKey(q + o.q, r + o.r);
}

export function axialToPixel(q: number, r: number, size: number): Point {
  const x = size * SQRT3 * (q + r / 2);
  const y = size * 1.5 * r;
  return { x, y };
}

export function pixelToAxial(x: number, y: number, size: number): Axial {
  const q = ((SQRT3 / 3) * x - (1 / 3) * y) / size;
  const r = ((2 / 3) * y) / size;
  return axialRound(q, r);
}

export function axialRound(qf: number, rf: number): Axial {
  const xf = qf;
  const zf = rf;
  const yf = -xf - zf;
  let rx = Math.round(xf);
  let ry = Math.round(yf);
  let rz = Math.round(zf);
  const dx = Math.abs(rx - xf);
  const dy = Math.abs(ry - yf);
  const dz = Math.abs(rz - zf);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy > dz) ry = -rx - rz;
  else rz = -rx - ry;
  return { q: rx, r: rz };
}

export function hexCorners(cx: number, cy: number, size: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    pts.push({ x: cx + size * Math.cos(angle), y: cy + size * Math.sin(angle) });
  }
  return pts;
}

// Midpoint of side `i` (0..5) — radius = apothem = size*sqrt(3)/2, angle = 60*i deg.
export function edgeMidpoint(cx: number, cy: number, size: number, side: number): Point {
  const a = (Math.PI / 180) * (60 * side);
  const r = (size * SQRT3) / 2;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

// Generate axial coords for a rectangular map (cols x rows), offset-style.
export function rectMap(cols: number, rows: number): Axial[] {
  const out: Axial[] = [];
  for (let r = 0; r < rows; r++) {
    const rOffset = Math.floor(r / 2);
    for (let q = -rOffset; q < cols - rOffset; q++) {
      out.push({ q, r });
    }
  }
  return out;
}

export function coordInBounds(q: number, r: number, cols: number, rows: number) {
  if (r < 0 || r >= rows) return false;
  const rOffset = Math.floor(r / 2);
  return q >= -rOffset && q < cols - rOffset;
}

export function hexWidth(size: number): number {
  return SQRT3 * size;
}

export function hexHeight(size: number): number {
  return 2 * size;
}
