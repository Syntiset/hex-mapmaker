import { hexCorners } from "../hex/hex";
import type { RoadPath } from "../store/mapStore";
import type { BiomeDef, DecorationDef, GlowDef, RoadType, TileDef } from "../tiles/types";
import { hash3, rand } from "./noise";

// Structural type accepted by texture/glow passes — both BiomeDef and TileDef
// fit (TileDef just lacks fill2/fill3 and only has optional decoration/glow).
interface PaintLayer {
  fill2?: string;
  fill3?: string;
  glow?: GlowDef;
  decoration?: DecorationDef;
}

type Ctx = CanvasRenderingContext2D;

// Deterministic per-cell pseudo-random (mulberry-ish).
function hashSeed(q: number, r: number): number {
  let h = ((q | 0) * 374761393) ^ ((r | 0) * 668265263);
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function pathHex(ctx: Ctx, cx: number, cy: number, size: number) {
  const pts = hexCorners(cx, cy, size);
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < 6; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

export function drawHexStroke(
  ctx: Ctx,
  cx: number,
  cy: number,
  size: number,
  color: string,
  width = 1,
) {
  ctx.beginPath();
  pathHex(ctx, cx, cy, size);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

// ============================================================
// Rich fill — multi-layer stipple + decoration + glow + lighting.
// Caller is expected to set up hex (or displaced-hex) clip before calling.
// ============================================================

function stippleLayer(
  ctx: Ctx,
  q: number,
  r: number,
  cx: number,
  cy: number,
  size: number,
  color: string,
  layerIdx: number,
  count: number,
  baseRadius: number,
  alphaMin: number,
  alphaSpan: number,
) {
  const seed = hash3(q, r, layerIdx);
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const u = rand(seed, i * 2);
    const v = rand(seed, i * 2 + 1);
    const px = cx + (u - 0.5) * size * 1.85;
    const py = cy + (v - 0.5) * size * 1.85;
    const rr = baseRadius * (0.4 + rand(seed, i * 2 + 100) * 0.7);
    ctx.globalAlpha = alphaMin + rand(seed, i * 2 + 200) * alphaSpan;
    ctx.beginPath();
    ctx.arc(px, py, rr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawDecoration(
  ctx: Ctx,
  q: number,
  r: number,
  cx: number,
  cy: number,
  size: number,
  dec: DecorationDef,
) {
  if (dec.kind === "none" || dec.density <= 0) return;
  const seed = hash3(q, r, 7);
  ctx.save();

  switch (dec.kind) {
    case "pebbles": {
      const n = Math.round(6 + dec.density * 8);
      for (let i = 0; i < n; i++) {
        // Centre of pebble inside r=0.55*size; pebble half-width up to 0.1*size
        // → max extent ≈ 0.65*size, safely inside displaced clip.
        const a = rand(seed, i * 3) * Math.PI * 2;
        const rad = Math.sqrt(rand(seed, i * 3 + 1)) * size * 0.55;
        const px = cx + Math.cos(a) * rad;
        const py = cy + Math.sin(a) * rad;
        const rx = size * (0.05 + rand(seed, i * 3 + 2) * 0.05);
        const ry = rx * (0.55 + rand(seed, i * 3 + 50) * 0.3);
        // shadow under
        ctx.fillStyle = "rgba(0,0,0,0.32)";
        ctx.beginPath();
        ctx.ellipse(px, py + ry * 0.65, rx * 1.05, ry * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        // body
        ctx.fillStyle = dec.color;
        ctx.beginPath();
        ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        // highlight (top half)
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.beginPath();
        ctx.ellipse(px - rx * 0.2, py - ry * 0.25, rx * 0.55, ry * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    // All decoration positions are constrained to a SAFE INSCRIBED CIRCLE
    // smaller than the hex apothem (≈0.866*size) minus the worst-case wavy
    // displacement (0.18*size). Safe radius ≈ 0.62*size — guarantees no
    // shape-decoration ever crosses the displaced clip regardless of mask.
    case "cracks": {
      const n = Math.round(2 + dec.density * 2);
      const safeR = size * 0.60; // clamp segment ends to this radius
      ctx.strokeStyle = dec.color;
      ctx.lineWidth = Math.max(1, size * 0.025);
      ctx.lineCap = "round";
      for (let i = 0; i < n; i++) {
        const a0 = rand(seed, i * 5) * Math.PI * 2;
        const r0 = Math.sqrt(rand(seed, i * 5 + 1)) * size * 0.35;
        const sx = cx + Math.cos(a0) * r0;
        const sy = cy + Math.sin(a0) * r0;
        const segs = 3 + Math.floor(rand(seed, i * 5 + 2) * 3);
        ctx.beginPath();
        let px = sx, py = sy;
        ctx.moveTo(px, py);
        for (let s = 0; s < segs; s++) {
          const angle = rand(seed, i * 5 + 10 + s) * Math.PI * 2;
          const len = size * (0.06 + rand(seed, i * 5 + 20 + s) * 0.10);
          let nx = px + Math.cos(angle) * len;
          let ny = py + Math.sin(angle) * len;
          // Clamp end-point onto the safe disk so the crack never wanders
          // out of the worst-case wavy clip boundary.
          const dx = nx - cx, dy = ny - cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > safeR) {
            nx = cx + (dx / d) * safeR;
            ny = cy + (dy / d) * safeR;
          }
          px = nx; py = ny;
          ctx.lineTo(px, py);
        }
        ctx.globalAlpha = 0.7;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "specks": {
      const n = Math.round(12 + dec.density * 24);
      ctx.fillStyle = dec.color;
      for (let i = 0; i < n; i++) {
        const a = rand(seed, i * 4) * Math.PI * 2;
        const rad = Math.sqrt(rand(seed, i * 4 + 1)) * size * 0.62;
        const px = cx + Math.cos(a) * rad;
        const py = cy + Math.sin(a) * rad;
        const rr = size * (0.012 + rand(seed, i * 4 + 2) * 0.022);
        ctx.globalAlpha = 0.55 + rand(seed, i * 4 + 3) * 0.4;
        ctx.beginPath();
        ctx.arc(px, py, rr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "tufts": {
      const n = Math.round(5 + dec.density * 7);
      ctx.strokeStyle = dec.color;
      ctx.lineWidth = Math.max(1, size * 0.025);
      ctx.lineCap = "round";
      for (let i = 0; i < n; i++) {
        // Centre of cluster inside r=0.50*size; blades extend up to 0.16*size
        // upward → tuft tip at most 0.66*size from centre, still inside safe zone
        // when the base is in the upper half of safe disk.
        const a = rand(seed, i * 6) * Math.PI * 2;
        const rad = Math.sqrt(rand(seed, i * 6 + 1)) * size * 0.50;
        const px = cx + Math.cos(a) * rad;
        const py = cy + Math.sin(a) * rad;
        const blades = 3 + Math.floor(rand(seed, i * 6 + 2) * 3);
        for (let b = 0; b < blades; b++) {
          const ox = (b - blades / 2) * size * 0.04;
          const tilt = (rand(seed, i * 6 + 10 + b) - 0.5) * size * 0.06;
          const h = size * (0.08 + rand(seed, i * 6 + 20 + b) * 0.08);
          ctx.beginPath();
          ctx.moveTo(px + ox, py);
          ctx.lineTo(px + ox + tilt, py - h);
          ctx.stroke();
        }
      }
      break;
    }
    case "ripples": {
      const n = Math.round(3 + dec.density * 4);
      ctx.strokeStyle = dec.color;
      ctx.lineWidth = Math.max(1, size * 0.025);
      ctx.lineCap = "round";
      for (let i = 0; i < n; i++) {
        const a = rand(seed, i * 4) * Math.PI * 2;
        const rad = Math.sqrt(rand(seed, i * 4 + 1)) * size * 0.40;
        const px = cx + Math.cos(a) * rad;
        const py = cy + Math.sin(a) * rad;
        const rr = size * (0.08 + rand(seed, i * 4 + 2) * 0.10);
        const start = rand(seed, i * 4 + 3) * Math.PI * 2;
        const len = Math.PI * (0.6 + rand(seed, i * 4 + 4) * 0.6);
        ctx.globalAlpha = 0.5 + rand(seed, i * 4 + 5) * 0.4;
        ctx.beginPath();
        ctx.arc(px, py, rr, start, start + len);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
  }
  ctx.restore();
}

// Soft radial blob — biome's base color with alpha falloff to the edges.
// Drawn WITHOUT clip so neighboring blobs overlap and their colors blend
// optically along the seam. This is the primary mechanism for smooth biome
// transitions — wavy clip handles only stipple/decoration patterns above.
export function drawBiomeBlob(
  ctx: Ctx,
  cx: number,
  cy: number,
  size: number,
  biome: BiomeDef,
) {
  const blob = ctx.createRadialGradient(cx, cy, size * 0.3, cx, cy, size * 1.25);
  blob.addColorStop(0, biome.fill);
  blob.addColorStop(0.55, biome.fill);
  blob.addColorStop(0.85, biome.fill + "b0");
  blob.addColorStop(1, biome.fill + "00");
  ctx.fillStyle = blob;
  ctx.fillRect(cx - size * 1.3, cy - size * 1.3, size * 2.6, size * 2.6);
}

// Stipple + decoration — the textured "look" of the biome. Caller must set
// up the displaced hex clip beforehand so textures end at the wavy edge.
export function drawHexTexture(
  ctx: Ctx,
  q: number,
  r: number,
  cx: number,
  cy: number,
  size: number,
  layer: PaintLayer,
) {
  if (layer.fill2) {
    stippleLayer(ctx, q, r, cx, cy, size, layer.fill2, 1, 18, size * 0.18, 0.30, 0.30);
    stippleLayer(ctx, q, r, cx, cy, size, layer.fill3 ?? layer.fill2, 2, 28, size * 0.10, 0.20, 0.25);
    stippleLayer(ctx, q, r, cx, cy, size, layer.fill2, 3, 40, size * 0.04, 0.18, 0.22);
  }
  if (layer.decoration) {
    drawDecoration(ctx, q, r, cx, cy, size, layer.decoration);
  }
}

// Glow ambient — drawn WITHOUT clip so glow extends naturally past the
// hex boundary, contributing to the optical blend with neighbors.
export function drawHexGlow(
  ctx: Ctx,
  cx: number,
  cy: number,
  size: number,
  layer: PaintLayer,
) {
  if (!layer.glow) return;
  const g = layer.glow;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * g.radius);
  const a = Math.round(g.alpha * 255).toString(16).padStart(2, "0");
  grad.addColorStop(0, g.color + a);
  grad.addColorStop(1, g.color + "00");
  ctx.fillStyle = grad;
  ctx.fillRect(cx - size * 1.3, cy - size * 1.3, size * 2.6, size * 2.6);
}

// Vignette + top highlight — depth and lighting cues. Caller must set up a
// CLEAN hex clip so depth shading is bounded by the logical hex shape.
export function drawHexLighting(ctx: Ctx, cx: number, cy: number, size: number) {
  const vig = ctx.createRadialGradient(cx, cy, size * 0.35, cx, cy, size * 1.05);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.32)");
  ctx.fillStyle = vig;
  ctx.fillRect(cx - size * 1.1, cy - size * 1.1, size * 2.2, size * 2.2);

  const hi = ctx.createLinearGradient(cx, cy - size, cx, cy + size * 0.2);
  hi.addColorStop(0, "rgba(255,255,255,0.10)");
  hi.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = hi;
  ctx.fillRect(cx - size * 1.1, cy - size * 1.1, size * 2.2, size * 2.2);
}

// Combined biome rendering — used by palette previews where there's no
// neighbor to blend with. Caller sets the clip.
export function drawBiomeRich(
  ctx: Ctx,
  q: number,
  r: number,
  cx: number,
  cy: number,
  size: number,
  biome: BiomeDef,
) {
  ctx.fillStyle = biome.fill;
  ctx.fillRect(cx - size * 1.1, cy - size * 1.1, size * 2.2, size * 2.2);
  drawHexTexture(ctx, q, r, cx, cy, size, biome);
  drawHexGlow(ctx, cx, cy, size, biome);
  drawHexLighting(ctx, cx, cy, size);
}

// ============================================================
// Icons
// ============================================================

function shadow(ctx: Ctx, fn: () => void, color = "rgba(0,0,0,0.45)", blur = 2, dy = 1) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetY = dy;
  fn();
  ctx.restore();
}

export function drawIcon(
  ctx: Ctx,
  q: number,
  r: number,
  cx: number,
  cy: number,
  size: number,
  tile: TileDef,
) {
  const c = tile.iconColor ?? "#0a0a08";
  const c2 = tile.iconColor2 ?? c;
  const s = size * 0.74;
  const seed = hashSeed(q, r);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = c;
  ctx.strokeStyle = c;

  switch (tile.icon) {
    case "rad": {
      shadow(ctx, () => {
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.13, 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < 3; i++) {
          ctx.save();
          ctx.rotate((i * 120 * Math.PI) / 180);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, s * 0.5, (-32 * Math.PI) / 180, (32 * Math.PI) / 180);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      });
      break;
    }
    case "skull":
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.32, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "ruin": {
      // Crumbling wall silhouette with arched window + side blocks
      shadow(ctx, () => {
        // main wall
        ctx.beginPath();
        ctx.moveTo(-s * 0.45, s * 0.4);
        ctx.lineTo(-s * 0.45, -s * 0.05);
        ctx.lineTo(-s * 0.3, -s * 0.25);
        ctx.lineTo(-s * 0.18, -s * 0.05);
        ctx.lineTo(-s * 0.05, -s * 0.3);
        ctx.lineTo(s * 0.05, -s * 0.05);
        ctx.lineTo(s * 0.2, -s * 0.35);
        ctx.lineTo(s * 0.32, -s * 0.05);
        ctx.lineTo(s * 0.45, -s * 0.2);
        ctx.lineTo(s * 0.45, s * 0.4);
        ctx.closePath();
        ctx.fill();
      });
      // arched window — dark hollow inside the wall silhouette
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.beginPath();
      ctx.moveTo(-s * 0.12, s * 0.25);
      ctx.lineTo(-s * 0.12, s * 0.0);
      ctx.quadraticCurveTo(0, -s * 0.12, s * 0.12, s * 0.0);
      ctx.lineTo(s * 0.12, s * 0.25);
      ctx.closePath();
      ctx.fill();
      // base shadow
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(-s * 0.5, s * 0.4, s * 1.0, s * 0.06);
      break;
    }

    case "settlement": {
      // cluster of 3 small houses
      const houses = [
        { x: -s * 0.32, y: s * 0.05, w: s * 0.32, h: s * 0.28 },
        { x: s * 0.04,  y: -s * 0.05, w: s * 0.36, h: s * 0.36 },
        { x: -s * 0.06, y: s * 0.22, w: s * 0.22, h: s * 0.16 },
      ];
      for (const h of houses) {
        // body
        ctx.fillStyle = c;
        ctx.fillRect(h.x, h.y, h.w, h.h);
        // roof
        ctx.beginPath();
        ctx.moveTo(h.x - s * 0.04, h.y);
        ctx.lineTo(h.x + h.w / 2, h.y - s * 0.18);
        ctx.lineTo(h.x + h.w + s * 0.04, h.y);
        ctx.closePath();
        ctx.fill();
        // door
        ctx.fillStyle = c2;
        ctx.fillRect(h.x + h.w * 0.4, h.y + h.h * 0.45, h.w * 0.2, h.h * 0.55);
      }
      // shadow
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(-s * 0.45, s * 0.42, s * 0.9, s * 0.05);
      break;
    }

    case "vault": {
      // Big circular blast door with bolts ring + inset V
      shadow(ctx, () => {
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.46, 0, Math.PI * 2);
        ctx.fillStyle = "#2a3850";
        ctx.fill();
      });
      // outer ring
      ctx.strokeStyle = "#15203a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.46, 0, Math.PI * 2);
      ctx.stroke();
      // bolts
      ctx.fillStyle = c2;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * s * 0.38, Math.sin(a) * s * 0.38, s * 0.04, 0, Math.PI * 2);
        ctx.fill();
      }
      // V emblem
      ctx.fillStyle = c;
      ctx.font = `bold ${s * 0.55}px Consolas, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("V", 0, s * 0.04);
      break;
    }

    case "tree":
    case "deadtree":
    case "tree-lone":
    case "tree-sparse":
    case "tree-dense":
    case "deadtree-sparse":
    case "deadtree-dense":
    case "birch": {
      // count and size depend on density variant
      let count = 6;
      let scale = 1.0;     // crown size multiplier
      let spread = 0.95;   // x-spread of tree positions
      let ySpread = 0.7;
      let trunkColor = "#2a1c10";
      let crownColor = c;
      let highlightColor = "rgba(255,255,255,0.08)";

      switch (tile.icon) {
        case "tree-lone":
          count = 1; scale = 1.55; spread = 0; ySpread = 0;
          break;
        case "tree-sparse":
          count = 3; scale = 0.95; spread = 0.8; ySpread = 0.55;
          break;
        case "tree-dense":
          count = 18; scale = 0.55; spread = 1.55; ySpread = 1.30;
          break;
        case "deadtree-sparse":
          count = 3; scale = 0.95; spread = 0.8; ySpread = 0.55;
          break;
        case "deadtree-dense":
          count = 18; scale = 0.55; spread = 1.55; ySpread = 1.30;
          break;
        case "birch":
          count = 5; scale = 1.0; spread = 0.9; ySpread = 0.6;
          trunkColor = "#d8d2bc"; // birch bark white
          highlightColor = "rgba(255,255,255,0.18)";
          break;
        default:
          // "tree" / "deadtree" — medium density
          count = 6; scale = 1.0;
      }

      const trees = [];
      for (let i = 0; i < count; i++) {
        const x = count === 1 ? 0 : (rand(seed, i) - 0.5) * s * spread;
        const y = count === 1 ? 0 : (rand(seed, i + 50) - 0.4) * s * ySpread;
        const h = s * (0.32 + rand(seed, i + 100) * 0.18) * scale;
        trees.push({ x, y, h });
      }
      trees.sort((a, b) => a.y - b.y);
      for (const t of trees) {
        // trunk
        ctx.fillStyle = trunkColor;
        ctx.fillRect(t.x - s * 0.025, t.y + t.h * 0.45, s * 0.05, t.h * 0.25);
        // crown
        ctx.fillStyle = crownColor;
        ctx.beginPath();
        ctx.moveTo(t.x, t.y - t.h * 0.4);
        ctx.lineTo(t.x + t.h * 0.32, t.y + t.h * 0.45);
        ctx.lineTo(t.x - t.h * 0.32, t.y + t.h * 0.45);
        ctx.closePath();
        ctx.fill();
        // highlight stripe
        ctx.fillStyle = highlightColor;
        ctx.beginPath();
        ctx.moveTo(t.x, t.y - t.h * 0.4);
        ctx.lineTo(t.x + t.h * 0.1, t.y + t.h * 0.45);
        ctx.lineTo(t.x - t.h * 0.05, t.y + t.h * 0.45);
        ctx.closePath();
        ctx.fill();
        // birch — dark horizontal stripes on trunk
        if (tile.icon === "birch") {
          ctx.fillStyle = "#3a342c";
          for (let k = 0; k < 3; k++) {
            ctx.fillRect(
              t.x - s * 0.025,
              t.y + t.h * 0.5 + k * t.h * 0.07,
              s * 0.05,
              t.h * 0.025,
            );
          }
        }
      }
      break;
    }

    case "mountain": {
      // Two peaks with shadow side and snow
      shadow(ctx, () => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(-s * 0.6, s * 0.4);
        ctx.lineTo(-s * 0.18, -s * 0.4);
        ctx.lineTo(s * 0.05, s * 0.0);
        ctx.lineTo(s * 0.32, -s * 0.25);
        ctx.lineTo(s * 0.6, s * 0.4);
        ctx.closePath();
        ctx.fill();
      });
      // shadow side (right of each peak)
      ctx.fillStyle = "rgba(0,0,0,0.32)";
      ctx.beginPath();
      ctx.moveTo(-s * 0.18, -s * 0.4);
      ctx.lineTo(s * 0.05, s * 0.0);
      ctx.lineTo(-s * 0.05, s * 0.4);
      ctx.lineTo(-s * 0.6, s * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s * 0.32, -s * 0.25);
      ctx.lineTo(s * 0.6, s * 0.4);
      ctx.lineTo(s * 0.45, s * 0.4);
      ctx.lineTo(s * 0.18, s * 0.05);
      ctx.closePath();
      ctx.fill();
      // snow caps
      ctx.fillStyle = c2;
      ctx.beginPath();
      ctx.moveTo(-s * 0.18, -s * 0.4);
      ctx.lineTo(-s * 0.02, -s * 0.18);
      ctx.lineTo(-s * 0.34, -s * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s * 0.32, -s * 0.25);
      ctx.lineTo(s * 0.45, -s * 0.05);
      ctx.lineTo(s * 0.2, -s * 0.05);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case "crater": {
      // concentric rings — crater rim shading
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.lineWidth = s * 0.06;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = s * 0.04;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.36, 0, Math.PI * 2);
      ctx.stroke();
      // dark center
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.28);
      grad.addColorStop(0, "rgba(0,0,0,0.85)");
      grad.addColorStop(1, "rgba(0,0,0,0.0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2);
      ctx.fill();
      // glow rim
      ctx.fillStyle = c2 ?? "#3a2a1a";
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.08, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case "water": {
      // wave lines with highlight
      ctx.strokeStyle = c;
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      const ys = [-s * 0.28, -s * 0.05, s * 0.18, s * 0.38];
      for (const y of ys) {
        ctx.beginPath();
        ctx.moveTo(-s * 0.55, y);
        for (let x = -s * 0.55; x < s * 0.55; x += s * 0.22) {
          ctx.quadraticCurveTo(x + s * 0.05, y - s * 0.1, x + s * 0.11, y);
          ctx.quadraticCurveTo(x + s * 0.16, y + s * 0.1, x + s * 0.22, y);
        }
        ctx.stroke();
      }
      // glint
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-s * 0.18, -s * 0.32);
      ctx.lineTo(s * 0.05, -s * 0.32);
      ctx.stroke();
      break;
    }

    case "swamp": {
      // tussocks of grass
      const tufts = [
        { x: -s * 0.32, y: s * 0.05 },
        { x: s * 0.0, y: s * 0.25 },
        { x: s * 0.3, y: s * 0.0 },
        { x: s * 0.05, y: -s * 0.22 },
        { x: -s * 0.22, y: -s * 0.28 },
      ];
      for (const t of tufts) {
        ctx.fillStyle = c2;
        ctx.beginPath();
        ctx.ellipse(t.x, t.y + s * 0.04, s * 0.15, s * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = c;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let i = -1; i <= 1; i++) {
          const x = t.x + i * s * 0.06;
          ctx.moveTo(x, t.y);
          ctx.lineTo(x + i * s * 0.02, t.y - s * 0.16);
        }
        ctx.stroke();
      }
      break;
    }

    case "sand": {
      // wavy dunes, two layers
      ctx.strokeStyle = c;
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 3; i++) {
        const y = -s * 0.25 + i * s * 0.25;
        ctx.beginPath();
        ctx.moveTo(-s * 0.55, y);
        ctx.bezierCurveTo(-s * 0.2, y - s * 0.18, s * 0.1, y + s * 0.18, s * 0.55, y);
        ctx.stroke();
      }
      break;
    }

    case "ash": {
      // scattered specks
      ctx.fillStyle = c;
      for (let i = 0; i < 18; i++) {
        const a = rand(seed, i * 3) * Math.PI * 2;
        const r2 = s * (0.1 + rand(seed, i * 3 + 1) * 0.45);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r2, Math.sin(a) * r2, s * 0.04, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case "debris": {
      // jagged shards (rebar / scrap)
      for (let i = 0; i < 4; i++) {
        const x = (rand(seed, i + 5) - 0.5) * s * 0.7;
        const y = (rand(seed, i + 25) - 0.5) * s * 0.5;
        const sx = rand(seed, i + 50) > 0.5 ? 1 : -1;
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + sx * s * 0.18, y - s * 0.22);
        ctx.lineTo(x + sx * s * 0.28, y + s * 0.05);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }

    case "concrete": {
      // tiled slabs with cracks
      ctx.strokeStyle = c;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, -s * 0.18);
      ctx.lineTo(s * 0.5, -s * 0.18);
      ctx.moveTo(-s * 0.5, s * 0.18);
      ctx.lineTo(s * 0.5, s * 0.18);
      ctx.moveTo(-s * 0.05, -s * 0.4);
      ctx.lineTo(0.05, s * 0.4);
      ctx.stroke();
      // crack
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, s * 0.05);
      ctx.lineTo(-s * 0.1, -s * 0.05);
      ctx.lineTo(s * 0.05, s * 0.1);
      ctx.lineTo(s * 0.3, s * 0.0);
      ctx.stroke();
      break;
    }

    case "raider": {
      // tent + spike with skull + flame
      // tent
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(-s * 0.45, s * 0.3);
      ctx.lineTo(-s * 0.1, -s * 0.25);
      ctx.lineTo(s * 0.0, s * 0.3);
      ctx.closePath();
      ctx.fill();
      // tent door
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.beginPath();
      ctx.moveTo(-s * 0.18, s * 0.3);
      ctx.lineTo(-s * 0.1, -s * 0.05);
      ctx.lineTo(-s * 0.02, s * 0.3);
      ctx.closePath();
      ctx.fill();
      // spike
      ctx.fillStyle = c;
      ctx.fillRect(s * 0.25 - 1, -s * 0.05, 2, s * 0.4);
      // skull on spike
      ctx.fillStyle = c2;
      ctx.beginPath();
      ctx.arc(s * 0.25, -s * 0.12, s * 0.09, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1a0a08";
      ctx.fillRect(s * 0.21, -s * 0.13, s * 0.03, s * 0.04);
      ctx.fillRect(s * 0.27, -s * 0.13, s * 0.03, s * 0.04);
      break;
    }

    case "tower": {
      // 4-leg lattice
      ctx.strokeStyle = c;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-s * 0.32, s * 0.4);
      ctx.lineTo(-s * 0.12, -s * 0.4);
      ctx.lineTo(s * 0.12, -s * 0.4);
      ctx.lineTo(s * 0.32, s * 0.4);
      ctx.stroke();
      // crossbars
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 4; i++) {
        const t = i / 3;
        const yL = -s * 0.4 + t * s * 0.8;
        const xL = -s * 0.12 + t * (-s * 0.2);
        const xR = s * 0.12 + t * s * 0.2;
        ctx.beginPath();
        ctx.moveTo(xL, yL);
        ctx.lineTo(xR, yL);
        ctx.stroke();
      }
      // top platform + antenna
      ctx.fillStyle = c;
      ctx.fillRect(-s * 0.2, -s * 0.5, s * 0.4, s * 0.1);
      ctx.fillRect(-1, -s * 0.65, 2, s * 0.18);
      // red light
      ctx.fillStyle = "#e02020";
      ctx.beginPath();
      ctx.arc(0, -s * 0.65, s * 0.04, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case "gas": {
      // canopy on posts + pump + sign
      ctx.fillStyle = c2;
      ctx.fillRect(-s * 0.45, -s * 0.45, s * 0.9, s * 0.12);
      ctx.fillRect(-s * 0.4, -s * 0.45, s * 0.05, s * 0.6);
      ctx.fillRect(s * 0.35, -s * 0.45, s * 0.05, s * 0.6);
      // pump body
      ctx.fillStyle = c;
      ctx.fillRect(-s * 0.12, -s * 0.2, s * 0.24, s * 0.45);
      ctx.fillStyle = "#e0e0e0";
      ctx.fillRect(-s * 0.08, -s * 0.16, s * 0.16, s * 0.1);
      // sign
      ctx.fillStyle = c;
      ctx.fillRect(-s * 0.18, -s * 0.6, s * 0.36, s * 0.18);
      ctx.fillStyle = "#e0c060";
      ctx.font = `bold ${s * 0.16}px Consolas, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("GAS", 0, -s * 0.5);
      break;
    }

    case "mine": {
      // arched entrance with crossed picks
      shadow(ctx, () => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(-s * 0.4, s * 0.35);
        ctx.lineTo(-s * 0.4, -s * 0.05);
        ctx.quadraticCurveTo(0, -s * 0.45, s * 0.4, -s * 0.05);
        ctx.lineTo(s * 0.4, s * 0.35);
        ctx.closePath();
        ctx.fill();
      });
      // entrance interior
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.moveTo(-s * 0.25, s * 0.35);
      ctx.lineTo(-s * 0.25, -s * 0.0);
      ctx.quadraticCurveTo(0, -s * 0.3, s * 0.25, -s * 0.0);
      ctx.lineTo(s * 0.25, s * 0.35);
      ctx.closePath();
      ctx.fill();
      // crossed picks
      ctx.strokeStyle = c2;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-s * 0.18, s * 0.05);
      ctx.lineTo(s * 0.18, s * 0.28);
      ctx.moveTo(s * 0.18, s * 0.05);
      ctx.lineTo(-s * 0.18, s * 0.28);
      ctx.stroke();
      break;
    }

    case "bunker": {
      // concrete dome
      shadow(ctx, () => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(0, s * 0.1, s * 0.45, Math.PI, 0);
        ctx.lineTo(s * 0.48, s * 0.3);
        ctx.lineTo(-s * 0.48, s * 0.3);
        ctx.closePath();
        ctx.fill();
      });
      // observation slit
      ctx.fillStyle = "#000";
      ctx.fillRect(-s * 0.22, -s * 0.05, s * 0.44, s * 0.07);
      // BoS gear logo
      ctx.fillStyle = c2;
      ctx.beginPath();
      ctx.arc(0, s * 0.18, s * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(0, s * 0.18, s * 0.04, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case "graveyard": {
      // 3 crosses with shadow at base
      const crosses = [
        { x: -s * 0.28, y: s * 0.0 },
        { x: s * 0.0, y: -s * 0.05 },
        { x: s * 0.28, y: s * 0.08 },
      ];
      for (const cr of crosses) {
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.beginPath();
        ctx.ellipse(cr.x, cr.y + s * 0.28, s * 0.12, s * 0.04, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = c2;
        ctx.fillRect(cr.x - s * 0.035, cr.y - s * 0.22, s * 0.07, s * 0.5);
        ctx.fillRect(cr.x - s * 0.14, cr.y - s * 0.1, s * 0.28, s * 0.07);
      }
      break;
    }

    case "anomaly": {
      // glowing spiral
      ctx.strokeStyle = c;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let t = 0; t < Math.PI * 4; t += 0.1) {
        const rr = s * 0.05 + (t / (Math.PI * 4)) * s * 0.42;
        const x = Math.cos(t) * rr;
        const y = Math.sin(t) * rr;
        if (t === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // glow center
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.3);
      grad.addColorStop(0, c2 + "ff");
      grad.addColorStop(1, c2 + "00");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case "minefield": {
      // 3 warning triangles
      const signs = [
        { x: -s * 0.3, y: -s * 0.05 },
        { x: s * 0.0, y: s * 0.2 },
        { x: s * 0.3, y: -s * 0.1 },
      ];
      for (const sg of signs) {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(sg.x, sg.y - s * 0.2);
        ctx.lineTo(sg.x + s * 0.18, sg.y + s * 0.12);
        ctx.lineTo(sg.x - s * 0.18, sg.y + s * 0.12);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#1a1a14";
        ctx.font = `bold ${s * 0.18}px Consolas, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("!", sg.x, sg.y - s * 0.02);
      }
      break;
    }

    case "wreck": {
      // rusted car silhouette
      shadow(ctx, () => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(-s * 0.45, s * 0.18);
        ctx.lineTo(-s * 0.32, -s * 0.05);
        ctx.lineTo(-s * 0.05, -s * 0.12);
        ctx.lineTo(s * 0.18, -s * 0.05);
        ctx.lineTo(s * 0.45, s * 0.05);
        ctx.lineTo(s * 0.45, s * 0.18);
        ctx.closePath();
        ctx.fill();
      });
      // window
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, -s * 0.05);
      ctx.lineTo(-s * 0.08, -s * 0.13);
      ctx.lineTo(s * 0.12, -s * 0.07);
      ctx.lineTo(s * 0.18, s * 0.0);
      ctx.closePath();
      ctx.fill();
      // wheels
      ctx.fillStyle = "#0a0a08";
      ctx.beginPath();
      ctx.arc(-s * 0.25, s * 0.22, s * 0.1, 0, Math.PI * 2);
      ctx.arc(s * 0.25, s * 0.22, s * 0.1, 0, Math.PI * 2);
      ctx.fill();
      // rust spot
      ctx.fillStyle = c2;
      ctx.beginPath();
      ctx.arc(-s * 0.05, s * 0.05, s * 0.08, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case "megacity": {
      // Cluster of skyscrapers of varying heights with windows
      const buildings = [
        { x: -s * 0.46, w: s * 0.18, h: s * 0.55 },
        { x: -s * 0.24, w: s * 0.16, h: s * 0.40 },
        { x: -s * 0.04, w: s * 0.20, h: s * 0.70 },
        { x: s * 0.20,  w: s * 0.16, h: s * 0.45 },
        { x: s * 0.38,  w: s * 0.14, h: s * 0.55 },
      ];
      shadow(ctx, () => {
        ctx.fillStyle = c;
        for (const b of buildings) {
          ctx.fillRect(b.x, s * 0.42 - b.h, b.w, b.h);
        }
      });
      // windows — small bright squares
      ctx.fillStyle = c2 ?? "#d8c060";
      for (let i = 0; i < buildings.length; i++) {
        const b = buildings[i];
        const rows = Math.floor(b.h / (s * 0.10));
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < 2; col++) {
            if (rand(seed, i * 23 + row * 7 + col) > 0.35) {
              ctx.fillRect(
                b.x + s * 0.025 + col * (b.w * 0.5),
                s * 0.42 - b.h + s * 0.06 + row * s * 0.10,
                s * 0.04, s * 0.05,
              );
            }
          }
        }
      }
      // ground shadow
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(-s * 0.5, s * 0.42, s * 1.0, s * 0.05);
      break;
    }

    case "trader-post": {
      // Covered wagon + barrels + crates
      shadow(ctx, () => {
        // wagon canvas (rounded top)
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(-s * 0.45, s * 0.25);
        ctx.lineTo(-s * 0.45, -s * 0.05);
        ctx.quadraticCurveTo(-s * 0.20, -s * 0.30, s * 0.05, -s * 0.05);
        ctx.lineTo(s * 0.05, s * 0.25);
        ctx.closePath();
        ctx.fill();
        // canvas stripes
        ctx.strokeStyle = "rgba(0,0,0,0.30)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          const t = (i + 1) / 4;
          ctx.beginPath();
          ctx.moveTo(-s * 0.45 + t * s * 0.5, s * 0.25);
          ctx.lineTo(-s * 0.45 + t * s * 0.5, -s * 0.05);
          ctx.stroke();
        }
      });
      // wagon wheels
      ctx.fillStyle = "#1a120a";
      ctx.beginPath();
      ctx.arc(-s * 0.34, s * 0.30, s * 0.08, 0, Math.PI * 2);
      ctx.arc(-s * 0.04, s * 0.30, s * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c2 ?? "#7a5832";
      ctx.beginPath();
      ctx.arc(-s * 0.34, s * 0.30, s * 0.03, 0, Math.PI * 2);
      ctx.arc(-s * 0.04, s * 0.30, s * 0.03, 0, Math.PI * 2);
      ctx.fill();
      // barrels stacked on right
      const bcol = c2 ?? "#7a5832";
      for (let i = 0; i < 3; i++) {
        const bx = s * 0.20 + (i % 2) * s * 0.16;
        const by = s * 0.10 + Math.floor(i / 2) * s * -0.20;
        ctx.fillStyle = bcol;
        ctx.fillRect(bx - s * 0.07, by - s * 0.10, s * 0.14, s * 0.20);
        ctx.strokeStyle = "#1a120a";
        ctx.lineWidth = 1;
        ctx.strokeRect(bx - s * 0.07, by - s * 0.10, s * 0.14, s * 0.20);
        ctx.beginPath();
        ctx.moveTo(bx - s * 0.07, by - s * 0.04);
        ctx.lineTo(bx + s * 0.07, by - s * 0.04);
        ctx.moveTo(bx - s * 0.07, by + s * 0.04);
        ctx.lineTo(bx + s * 0.07, by + s * 0.04);
        ctx.stroke();
      }
      // ground line
      ctx.fillStyle = "rgba(0,0,0,0.30)";
      ctx.fillRect(-s * 0.5, s * 0.40, s * 1.0, s * 0.04);
      break;
    }

    case "diner": {
      // 50s roadside diner — long body, neon "EAT" sign on top
      shadow(ctx, () => {
        // body
        ctx.fillStyle = c;
        ctx.fillRect(-s * 0.48, s * 0.0, s * 0.96, s * 0.38);
        // roof slab
        ctx.fillStyle = "#2c2620";
        ctx.fillRect(-s * 0.52, -s * 0.06, s * 1.04, s * 0.08);
      });
      // windows
      ctx.fillStyle = c2 ?? "#e0c060";
      ctx.fillRect(-s * 0.40, s * 0.06, s * 0.22, s * 0.14);
      ctx.fillRect(s * 0.18, s * 0.06, s * 0.22, s * 0.14);
      // door
      ctx.fillStyle = "#1a1410";
      ctx.fillRect(-s * 0.07, s * 0.10, s * 0.14, s * 0.28);
      ctx.fillStyle = c2 ?? "#e0c060";
      ctx.beginPath();
      ctx.arc(s * 0.04, s * 0.24, s * 0.012, 0, Math.PI * 2);
      ctx.fill();
      // sign post
      ctx.fillStyle = "#2a2018";
      ctx.fillRect(-s * 0.02, -s * 0.30, s * 0.04, s * 0.24);
      // neon sign box
      ctx.fillStyle = "#a02828";
      ctx.fillRect(-s * 0.22, -s * 0.50, s * 0.44, s * 0.20);
      ctx.strokeStyle = "#e8c050";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-s * 0.22, -s * 0.50, s * 0.44, s * 0.20);
      ctx.fillStyle = "#e8c050";
      ctx.font = `bold ${s * 0.16}px Consolas, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("EAT", 0, -s * 0.40);
      // ground shadow
      ctx.fillStyle = "rgba(0,0,0,0.30)";
      ctx.fillRect(-s * 0.5, s * 0.38, s * 1.0, s * 0.05);
      break;
    }

    case "factory": {
      // Industrial complex — wide building + 2 chimneys with smoke
      shadow(ctx, () => {
        // base hall
        ctx.fillStyle = c;
        ctx.fillRect(-s * 0.46, s * 0.06, s * 0.92, s * 0.36);
        // sawtooth roof
        ctx.fillStyle = "#2a2218";
        ctx.beginPath();
        ctx.moveTo(-s * 0.46, s * 0.06);
        for (let i = 0; i < 4; i++) {
          const x0 = -s * 0.46 + i * s * 0.23;
          ctx.lineTo(x0 + s * 0.115, -s * 0.04);
          ctx.lineTo(x0 + s * 0.23, s * 0.06);
        }
        ctx.closePath();
        ctx.fill();
        // chimneys
        ctx.fillStyle = c;
        ctx.fillRect(-s * 0.32, -s * 0.55, s * 0.10, s * 0.50);
        ctx.fillRect(s * 0.16, -s * 0.42, s * 0.10, s * 0.42);
      });
      // chimney caps
      ctx.fillStyle = "#1a120a";
      ctx.fillRect(-s * 0.34, -s * 0.57, s * 0.14, s * 0.04);
      ctx.fillRect(s * 0.14, -s * 0.44, s * 0.14, s * 0.04);
      // smoke puffs
      ctx.fillStyle = "rgba(220,220,220,0.40)";
      ctx.beginPath();
      ctx.arc(-s * 0.27, -s * 0.65, s * 0.09, 0, Math.PI * 2);
      ctx.arc(-s * 0.16, -s * 0.68, s * 0.07, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s * 0.21, -s * 0.50, s * 0.07, 0, Math.PI * 2);
      ctx.fill();
      // windows
      ctx.fillStyle = c2 ?? "#5a4630";
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(-s * 0.40 + i * s * 0.22, s * 0.18, s * 0.12, s * 0.10);
      }
      // ground shadow
      ctx.fillStyle = "rgba(0,0,0,0.30)";
      ctx.fillRect(-s * 0.5, s * 0.42, s * 1.0, s * 0.05);
      break;
    }

    case "slum": {
      // Cluster of leaning corrugated shacks
      const shacks = [
        { x: -s * 0.42, y: s * 0.10, w: s * 0.30, h: s * 0.30, lean: -s * 0.05 },
        { x: -s * 0.10, y: s * -0.02, w: s * 0.32, h: s * 0.42, lean: s * 0.04 },
        { x: s * 0.20, y: s * 0.08, w: s * 0.26, h: s * 0.32, lean: -s * 0.03 },
      ];
      shadow(ctx, () => {
        for (const sh of shacks) {
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.moveTo(sh.x + sh.lean, sh.y);
          ctx.lineTo(sh.x + sh.w + sh.lean, sh.y);
          ctx.lineTo(sh.x + sh.w, sh.y + sh.h);
          ctx.lineTo(sh.x, sh.y + sh.h);
          ctx.closePath();
          ctx.fill();
        }
      });
      // corrugated tin slats
      ctx.strokeStyle = "rgba(0,0,0,0.45)";
      ctx.lineWidth = 1;
      for (const sh of shacks) {
        for (let k = 0; k < 5; k++) {
          const tx = sh.x + (k + 0.5) * (sh.w / 5);
          ctx.beginPath();
          ctx.moveTo(tx + sh.lean * (1 - 0), sh.y + s * 0.01);
          ctx.lineTo(tx + sh.lean * 0.0 * 0, sh.y + sh.h * 0.5);
          ctx.stroke();
        }
        // dark door
        ctx.fillStyle = "#0a0806";
        const dw = sh.w * 0.20;
        ctx.fillRect(sh.x + sh.w * 0.4, sh.y + sh.h * 0.5, dw, sh.h * 0.5);
      }
      // ground shadow
      ctx.fillStyle = "rgba(0,0,0,0.30)";
      ctx.fillRect(-s * 0.5, s * 0.42, s * 1.0, s * 0.04);
      break;
    }

    case "cave": {
      // Irregular jagged cave mouth in the rock face with stalactites
      shadow(ctx, () => {
        ctx.fillStyle = "#080604";
        ctx.beginPath();
        ctx.moveTo(-s * 0.42, s * 0.40);
        ctx.lineTo(-s * 0.40, s * 0.05);
        ctx.lineTo(-s * 0.32, -s * 0.10);
        ctx.lineTo(-s * 0.20, s * 0.04);
        ctx.lineTo(-s * 0.10, -s * 0.20);
        ctx.lineTo(s * 0.04, -s * 0.05);
        ctx.lineTo(s * 0.16, -s * 0.22);
        ctx.lineTo(s * 0.30, -s * 0.06);
        ctx.lineTo(s * 0.40, s * 0.05);
        ctx.lineTo(s * 0.42, s * 0.40);
        ctx.closePath();
        ctx.fill();
      });
      // stalactite teeth at the cave mouth
      ctx.fillStyle = c2 ?? "#7e6a4c";
      const teethX = [-s * 0.28, -s * 0.14, s * 0.0, s * 0.14, s * 0.28];
      const teethTop = [s * 0.0, -s * 0.06, s * 0.04, -s * 0.08, s * 0.02];
      for (let i = 0; i < teethX.length; i++) {
        ctx.beginPath();
        ctx.moveTo(teethX[i], teethTop[i]);
        ctx.lineTo(teethX[i] + s * 0.04, teethTop[i] + s * 0.14);
        ctx.lineTo(teethX[i] - s * 0.04, teethTop[i] + s * 0.14);
        ctx.closePath();
        ctx.fill();
      }
      // bottom small stones
      ctx.fillStyle = c;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(-s * 0.30 + i * s * 0.20, s * 0.36, s * 0.04, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case "quarry": {
      // Open pit — concentric stepped terraces (top-down view)
      shadow(ctx, () => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.ellipse(0, s * 0.02, s * 0.56, s * 0.36, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      // step rings (descending)
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.beginPath();
      ctx.ellipse(0, s * 0.04, s * 0.42, s * 0.27, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.36)";
      ctx.beginPath();
      ctx.ellipse(0, s * 0.06, s * 0.28, s * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.beginPath();
      ctx.ellipse(0, s * 0.08, s * 0.14, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      // pebble debris around the rim
      ctx.fillStyle = c2 ?? "#3a342c";
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + 0.4;
        const rr = s * 0.62;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr * 0.55, s * 0.045, 0, Math.PI * 2);
        ctx.fill();
      }
      // a small pickaxe at the rim
      ctx.strokeStyle = c2 ?? "#3a342c";
      ctx.lineWidth = s * 0.025;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(s * 0.32, -s * 0.30);
      ctx.lineTo(s * 0.46, -s * 0.16);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.38, -s * 0.34);
      ctx.lineTo(s * 0.52, -s * 0.20);
      ctx.stroke();
      break;
    }

    case "vault-sealed": {
      // Vault gear with a chain X across — locked
      shadow(ctx, () => {
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.46, 0, Math.PI * 2);
        ctx.fillStyle = "#262e3e";
        ctx.fill();
      });
      ctx.strokeStyle = "#0e151f";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.46, 0, Math.PI * 2);
      ctx.stroke();
      // dimmed bolts
      ctx.fillStyle = c2 ?? "#888";
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * s * 0.38, Math.sin(a) * s * 0.38, s * 0.04, 0, Math.PI * 2);
        ctx.fill();
      }
      // X-cross of heavy chain
      ctx.strokeStyle = c;
      ctx.lineWidth = s * 0.08;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-s * 0.34, -s * 0.34);
      ctx.lineTo(s * 0.34, s * 0.34);
      ctx.moveTo(s * 0.34, -s * 0.34);
      ctx.lineTo(-s * 0.34, s * 0.34);
      ctx.stroke();
      // chain link dots
      ctx.fillStyle = "#1a1612";
      for (let i = -3; i <= 3; i++) {
        const t = i / 3;
        ctx.beginPath();
        ctx.arc(t * s * 0.34, t * s * 0.34, s * 0.022, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-t * s * 0.34, t * s * 0.34, s * 0.022, 0, Math.PI * 2);
        ctx.fill();
      }
      // padlock at center
      ctx.fillStyle = c;
      ctx.fillRect(-s * 0.10, -s * 0.04, s * 0.20, s * 0.16);
      ctx.strokeStyle = c;
      ctx.lineWidth = s * 0.04;
      ctx.beginPath();
      ctx.arc(0, -s * 0.04, s * 0.07, Math.PI, 0);
      ctx.stroke();
      break;
    }

    case "vault-open": {
      // Vault rolled-open — bright opening, gear pushed aside to the right
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.46);
      grad.addColorStop(0, "#f0f4ff");
      grad.addColorStop(0.4, "#80b8d8");
      grad.addColorStop(1, "#1c2840");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.46, 0, Math.PI * 2);
      ctx.fill();
      // outer rim
      ctx.strokeStyle = "#15203a";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.46, 0, Math.PI * 2);
      ctx.stroke();
      // gear rolled aside (right)
      shadow(ctx, () => {
        ctx.fillStyle = "#3a4658";
        ctx.beginPath();
        ctx.arc(s * 0.42, s * 0.04, s * 0.34, 0, Math.PI * 2);
        ctx.fill();
      });
      // bolts on rolled gear
      ctx.fillStyle = c2 ?? "#dddddd";
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(s * 0.42 + Math.cos(a) * s * 0.28, s * 0.04 + Math.sin(a) * s * 0.28, s * 0.035, 0, Math.PI * 2);
        ctx.fill();
      }
      // V emblem on rolled gear
      ctx.fillStyle = c;
      ctx.font = `bold ${s * 0.32}px Consolas, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("V", s * 0.42, s * 0.06);
      // floor lights inside opening
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(-s * 0.30 + i * s * 0.10, s * 0.02, s * 0.018, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case "bos-outpost": {
      // Military comms outpost — small bunker + tall mast with dish
      shadow(ctx, () => {
        ctx.fillStyle = c;
        ctx.fillRect(-s * 0.40, s * 0.05, s * 0.80, s * 0.32);
      });
      // roof slab
      ctx.fillStyle = "#1a1c1e";
      ctx.fillRect(-s * 0.42, s * 0.0, s * 0.84, s * 0.06);
      // door
      ctx.fillStyle = "#0a0806";
      ctx.fillRect(-s * 0.30, s * 0.13, s * 0.10, s * 0.24);
      // window slits
      ctx.fillStyle = c2 ?? "#1c1e22";
      ctx.fillRect(-s * 0.10, s * 0.10, s * 0.12, s * 0.05);
      ctx.fillRect(s * 0.08, s * 0.10, s * 0.12, s * 0.05);
      // antenna mast
      ctx.fillStyle = c;
      ctx.fillRect(-s * 0.02, -s * 0.55, s * 0.04, s * 0.55);
      // mast cross-braces
      ctx.strokeStyle = c;
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const y = -s * 0.50 + i * s * 0.12;
        ctx.beginPath();
        ctx.moveTo(-s * 0.06, y);
        ctx.lineTo(s * 0.06, y);
        ctx.stroke();
      }
      // satellite dish
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(0, -s * 0.55, s * 0.11, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#0a0806";
      ctx.beginPath();
      ctx.arc(0, -s * 0.55, s * 0.07, Math.PI, 0);
      ctx.fill();
      // BoS gear emblem on the wall
      ctx.fillStyle = c2 ?? "#c8a040";
      ctx.beginPath();
      ctx.arc(s * 0.18, s * 0.20, s * 0.07, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const tx = s * 0.18 + Math.cos(a) * s * 0.10;
        const ty = s * 0.20 + Math.sin(a) * s * 0.10;
        ctx.fillRect(tx - s * 0.01, ty - s * 0.01, s * 0.02, s * 0.02);
      }
      // ground shadow
      ctx.fillStyle = "rgba(0,0,0,0.30)";
      ctx.fillRect(-s * 0.5, s * 0.37, s * 1.0, s * 0.04);
      break;
    }

    case "enclave": {
      // Heavy hexagonal concrete base + central comms tower with E emblem
      shadow(ctx, () => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(-s * 0.36, s * 0.35);
        ctx.lineTo(-s * 0.46, s * 0.10);
        ctx.lineTo(-s * 0.30, -s * 0.18);
        ctx.lineTo(s * 0.30, -s * 0.18);
        ctx.lineTo(s * 0.46, s * 0.10);
        ctx.lineTo(s * 0.36, s * 0.35);
        ctx.closePath();
        ctx.fill();
      });
      // dark deck on top
      ctx.fillStyle = "#0e1014";
      ctx.fillRect(-s * 0.30, -s * 0.26, s * 0.60, s * 0.10);
      // central mast
      ctx.strokeStyle = "#0e1014";
      ctx.lineWidth = s * 0.035;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.26);
      ctx.lineTo(0, -s * 0.58);
      ctx.stroke();
      // dish on top
      ctx.fillStyle = "#0e1014";
      ctx.beginPath();
      ctx.arc(0, -s * 0.58, s * 0.10, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = c2 ?? "#88b0c8";
      ctx.beginPath();
      ctx.arc(0, -s * 0.58, s * 0.05, Math.PI, 0);
      ctx.fill();
      // cool blue corner lights
      ctx.fillStyle = "#5078c8";
      ctx.beginPath();
      ctx.arc(-s * 0.30, -s * 0.18, s * 0.025, 0, Math.PI * 2);
      ctx.arc(s * 0.30, -s * 0.18, s * 0.025, 0, Math.PI * 2);
      ctx.fill();
      // big E emblem
      ctx.fillStyle = c2 ?? "#88b0c8";
      ctx.font = `bold ${s * 0.30}px Consolas, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("E", 0, s * 0.04);
      // entry slit
      ctx.fillStyle = "#040608";
      ctx.fillRect(-s * 0.06, s * 0.20, s * 0.12, s * 0.15);
      break;
    }

    default:
      break;
  }
  ctx.restore();
}

// drawIconEnhanced — wraps drawIcon with a subtle drop shadow.
// Previous version added a "lighter"-composited highlight pass that produced
// visible ghost duplicates on multi-element icons (trees, raider tent, etc.).
export function drawIconEnhanced(
  ctx: Ctx,
  q: number,
  r: number,
  cx: number,
  cy: number,
  size: number,
  tile: TileDef,
) {
  if (tile.icon === "none") return;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = size * 0.18;
  ctx.shadowOffsetY = size * 0.07;
  drawIcon(ctx, q, r, cx, cy, size, tile);
  ctx.restore();
}

// ============================================================
// Roads — Chaikin-smoothed polyline rendering
// ============================================================

type Pt = { x: number; y: number };

// One iteration of Chaikin's corner-cutting. Endpoints preserved.
function chaikinIter(pts: Pt[]): Pt[] {
  if (pts.length < 3) return pts;
  const out: Pt[] = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i], q = pts[i + 1];
    out.push({ x: 0.75 * p.x + 0.25 * q.x, y: 0.75 * p.y + 0.25 * q.y });
    out.push({ x: 0.25 * p.x + 0.75 * q.x, y: 0.25 * p.y + 0.75 * q.y });
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function smoothPath(pts: Pt[], iterations = 3): Pt[] {
  let r = pts;
  for (let i = 0; i < iterations; i++) r = chaikinIter(r);
  return r;
}

function strokePolyline(ctx: Ctx, pts: Pt[]) {
  if (pts.length === 0) return;
  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, ctx.lineWidth * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle as string;
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
}

export function drawRoadPaths(
  ctx: Ctx,
  paths: RoadPath[],
  roadTypeMap: Map<string, RoadType>,
  hexSize: number,
) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const path of paths) {
    const road = roadTypeMap.get(path.typeId);
    if (!road) continue;
    const w = Math.max(2, road.width * hexSize);
    const smooth = smoothPath(path.points, 3);

    ctx.lineWidth = w;
    ctx.strokeStyle = road.color;
    if (road.dash) ctx.setLineDash(road.dash.map((d) => d * hexSize));
    else ctx.setLineDash([]);
    strokePolyline(ctx, smooth);

    if (road.centerLine) {
      ctx.lineWidth = Math.max(1, w * 0.18);
      ctx.strokeStyle = road.centerLine;
      ctx.setLineDash([]);
      strokePolyline(ctx, smooth);
    }
  }

  ctx.setLineDash([]);
  ctx.restore();
}
