import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Shape, Text, Group, Rect } from "react-konva";
import type Konva from "konva";
import {
  NEIGHBOR_OFFSETS,
  axialKey,
  axialToPixel,
  coordInBounds,
  edgeMidpoint,
  hexHeight,
  hexWidth,
  pixelToAxial,
} from "../hex/hex";
import { useMapStore } from "../store/mapStore";
import {
  drawBiomeBlob,
  drawHexGlow,
  drawHexLighting,
  drawHexStroke,
  drawHexTexture,
  drawIconEnhanced,
  drawRoadPaths,
  pathHex,
} from "../render/drawHex";
import {
  EDGE_TO_NEIGHBOR_OFFSET,
  clearDisplacedCache,
  withDisplacedHexClip,
} from "../render/displaced";

interface PixelPt { x: number; y: number }

interface Props {
  width: number;
  height: number;
  onHover: (key: string | null) => void;
}

export const HexGridCanvas = forwardRef<Konva.Stage, Props>(function HexGridCanvas(
  { width, height, onHover },
  ref,
) {
  const grid = useMapStore((s) => s.grid);
  const cells = useMapStore((s) => s.cells);
  const tiles = useMapStore((s) => s.tiles);
  const biomes = useMapStore((s) => s.biomes);
  const roads = useMapStore((s) => s.roads);
  const roadPaths = useMapStore((s) => s.roadPaths);
  const draftPoints = useMapStore((s) => s.draftPoints);
  const activeRoadId = useMapStore((s) => s.activeRoadId);
  const tool = useMapStore((s) => s.tool);
  const showGrid = useMapStore((s) => s.showGrid);
  const freeHandRoad = useMapStore((s) => s.freeHandRoad);
  const paint = useMapStore((s) => s.paint);
  const erase = useMapStore((s) => s.erase);
  const beginRoadPath = useMapStore((s) => s.beginRoadPath);
  const continueRoadPath = useMapStore((s) => s.continueRoadPath);
  const commitRoadPath = useMapStore((s) => s.commitRoadPath);
  const eraseRoadNear = useMapStore((s) => s.eraseRoadNear);
  const setLabel = useMapStore((s) => s.setLabel);

  const tileById = useMemo(() => new Map(tiles.map((t) => [t.id, t])), [tiles]);
  const biomeById = useMemo(() => new Map(biomes.map((b) => [b.id, b])), [biomes]);
  const roadTypeMap = useMemo(() => new Map(roads.map((rd) => [rd.id, rd])), [roads]);

  // All paths to render = committed + current draft preview
  const allPaths = useMemo(() => {
    if (!draftPoints || draftPoints.length === 0) return roadPaths;
    return [...roadPaths, { id: "__draft__", typeId: activeRoadId, points: draftPoints }];
  }, [roadPaths, draftPoints, activeRoadId]);

  const hw = hexWidth(grid.hexSize);
  const hh = hexHeight(grid.hexSize);

  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: hw, y: hh });
  const dragging = useRef(false);
  const painting = useRef(false);
  const lastKey = useRef<string | null>(null);

  // Recenter on grid change.
  useEffect(() => {
    setPos({ x: hw, y: hh });
  }, [hw, hh, grid.cols, grid.rows]);

  // Invalidate displaced-polygon cache when world hexSize changes.
  useEffect(() => {
    clearDisplacedCache();
  }, [grid.hexSize]);

  // Compute viewport in world coords, with margin equal to one hex.
  const view = useMemo(() => {
    const margin = grid.hexSize * 2;
    return {
      minX: (-pos.x) / scale - margin,
      maxX: (width - pos.x) / scale + margin,
      minY: (-pos.y) / scale - margin,
      maxY: (height - pos.y) / scale + margin,
    };
  }, [pos, scale, width, height, grid.hexSize]);

  // List of cells (q, r) that we may need to render this frame: union of
  // grid cells in viewport + cells with content outside viewport stays unrendered.
  const visibleCoords = useMemo(() => {
    const out: { q: number; r: number; cx: number; cy: number }[] = [];
    // Approximate axial range from viewport rectangle.
    const topLeft = pixelToAxial(view.minX, view.minY, grid.hexSize);
    const bottomRight = pixelToAxial(view.maxX, view.maxY, grid.hexSize);
    const minR = Math.max(0, topLeft.r - 1);
    const maxR = Math.min(grid.rows - 1, bottomRight.r + 1);
    for (let r = minR; r <= maxR; r++) {
      const rOffset = Math.floor(r / 2);
      // axial q at given r corresponds to pixel x = size*sqrt(3)*(q + r/2).
      // From viewport: solve q range.
      const qMin = Math.max(-rOffset, Math.floor(view.minX / hw - r / 2) - 1);
      const qMax = Math.min(grid.cols - rOffset - 1, Math.ceil(view.maxX / hw - r / 2) + 1);
      for (let q = qMin; q <= qMax; q++) {
        const { x, y } = axialToPixel(q, r, grid.hexSize);
        out.push({ q, r, cx: x, cy: y });
      }
    }
    return out;
  }, [view, grid.cols, grid.rows, grid.hexSize, hw]);

  // Labels with collision-avoidance: stack vertically when overlapping.
  const labelEntries = useMemo(() => {
    const raw: { key: string; cx: number; cy: number; text: string }[] = [];
    for (const k in cells) {
      const cell = cells[k];
      if (!cell.label) continue;
      const [q, r] = k.split(",").map(Number);
      const { x, y } = axialToPixel(q, r, grid.hexSize);
      raw.push({ key: k, cx: x, cy: y, text: cell.label });
    }
    raw.sort((a, b) => a.cy - b.cy || a.cx - b.cx);

    const fontSize = Math.max(11, grid.hexSize * 0.42);
    const padX = fontSize * 0.4;
    const padY = fontSize * 0.18;
    const offY = grid.hexSize * 0.55;
    const placed: { x1: number; y1: number; x2: number; y2: number }[] = [];
    return raw.map((l) => {
      const tw = l.text.length * fontSize * 0.58;
      const w = tw + padX * 2;
      const h = fontSize + padY * 2;
      let y = l.cy + offY - h / 2;
      const x = l.cx - w / 2;
      let tries = 0;
      while (
        tries < 40 &&
        placed.some(
          (p) =>
            !(x + w <= p.x1 || x >= p.x2 || y + h <= p.y1 || y >= p.y2),
        )
      ) {
        y += h + 3;
        tries++;
      }
      placed.push({ x1: x, y1: y, x2: x + w, y2: y + h });
      return { ...l, x, y, w, h, fontSize, padX, padY, tw };
    });
  }, [cells, grid.hexSize]);

  function getWorldPointer(stage: Konva.Stage): PixelPt | null {
    const pt = stage.getPointerPosition();
    if (!pt) return null;
    return { x: (pt.x - pos.x) / scale, y: (pt.y - pos.y) / scale };
  }

  function getHexAtWorld(world: PixelPt): { q: number; r: number; key: string } | null {
    const { q, r } = pixelToAxial(world.x, world.y, grid.hexSize);
    if (!coordInBounds(q, r, grid.cols, grid.rows)) return null;
    return { q, r, key: axialKey(q, r) };
  }

  // Snap a world-pixel point to the nearest "feature" of its hex:
  // hex center, 6 edge midpoints, or 6 corners — total 13 candidates.
  // This produces clean roads that follow the hex grid (variant A from research).
  function snapToHexFeature(world: PixelPt): PixelPt {
    const hx = getHexAtWorld(world);
    if (!hx) return world;
    const { x: cx, y: cy } = axialToPixel(hx.q, hx.r, grid.hexSize);
    const candidates: PixelPt[] = [{ x: cx, y: cy }];
    for (let s = 0; s < 6; s++) candidates.push(edgeMidpoint(cx, cy, grid.hexSize, s));
    // Corners: shared between 3 hexes — natural junction points.
    const angles = [-30, 30, 90, 150, 210, 270];
    for (const a of angles) {
      const rad = (Math.PI / 180) * a;
      candidates.push({ x: cx + grid.hexSize * Math.cos(rad), y: cy + grid.hexSize * Math.sin(rad) });
    }
    let best = candidates[0];
    let bestD = Infinity;
    for (const c of candidates) {
      const dx = c.x - world.x, dy = c.y - world.y;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  function handlePointerDown(e: Konva.KonvaEventObject<PointerEvent>) {
    const stage = e.target.getStage();
    if (!stage) return;
    if (tool === "pan" || e.evt.button === 1 || e.evt.button === 2) {
      dragging.current = true;
      return;
    }
    painting.current = true;
    lastKey.current = null;
    const world = getWorldPointer(stage);
    if (!world) return;
    const hx = getHexAtWorld(world);
    if (tool === "road") {
      const pt = freeHandRoad ? world : snapToHexFeature(world);
      beginRoadPath(pt);
      return;
    }
    if (tool === "road-erase") {
      eraseRoadNear(world, grid.hexSize * 0.5);
      return;
    }
    if (!hx) return;
    lastKey.current = hx.key;
    if (tool === "paint") paint(hx.key);
    else if (tool === "erase") erase(hx.key);
    else if (tool === "label") {
      const current = cells[hx.key]?.label ?? "";
      const text = window.prompt("Подпись гекса:", current);
      if (text !== null) setLabel(hx.key, text.trim());
    }
  }

  function handlePointerMove(e: Konva.KonvaEventObject<PointerEvent>) {
    const stage = e.target.getStage();
    if (!stage) return;
    const world = getWorldPointer(stage);
    if (world) {
      const hx = getHexAtWorld(world);
      onHover(hx ? hx.key : null);
    }
    if (dragging.current) {
      setPos((p) => ({ x: p.x + e.evt.movementX, y: p.y + e.evt.movementY }));
      return;
    }
    if (!painting.current || !world) return;
    if (tool === "road") {
      const pt = freeHandRoad ? world : snapToHexFeature(world);
      // Throttle free-hand: only add point if it moved enough
      if (freeHandRoad && draftPoints && draftPoints.length > 0) {
        const last = draftPoints[draftPoints.length - 1];
        const dx = pt.x - last.x, dy = pt.y - last.y;
        if (dx * dx + dy * dy < (grid.hexSize * 0.12) ** 2) return;
      }
      continueRoadPath(pt);
      return;
    }
    if (tool === "road-erase") {
      eraseRoadNear(world, grid.hexSize * 0.5);
      return;
    }
    const hx = getHexAtWorld(world);
    if (!hx || hx.key === lastKey.current) return;
    lastKey.current = hx.key;
    if (tool === "paint") paint(hx.key);
    else if (tool === "erase") erase(hx.key);
  }

  function handlePointerUp() {
    if (painting.current && tool === "road") commitRoadPath();
    painting.current = false;
    dragging.current = false;
    lastKey.current = null;
  }

  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;
    const oldScale = scale;
    const pt = stage.getPointerPosition();
    if (!pt) return;
    const mousePointTo = { x: (pt.x - pos.x) / oldScale, y: (pt.y - pos.y) / oldScale };
    const direction = e.evt.deltaY > 0 ? 1 : -1;
    const factor = direction > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.15, Math.min(4, oldScale * factor));
    setScale(newScale);
    setPos({
      x: pt.x - mousePointTo.x * newScale,
      y: pt.y - mousePointTo.y * newScale,
    });
  }

  // sceneFunc draws all visible hexes + roads in one pass.
  const drawScene = (ctx: Konva.Context) => {
    const c = ctx as unknown as { _context: CanvasRenderingContext2D };
    const raw = c._context;
    raw.save();
    // Empty hex background fill (default color) for cells in the grid.
    raw.fillStyle = "#262620";
    raw.beginPath();
    for (const { cx, cy } of visibleCoords) {
      pathHex(raw, cx, cy, grid.hexSize);
    }
    raw.fill();

    // Collect cells with biomes (terrain layer) and cells with tiles (features).
    // Both layers are rendered in passes; a cell can have one, the other, or both.
    const biomed: { q: number; r: number; cx: number; cy: number; biome: ReturnType<typeof biomeById.get>; mask: number }[] = [];
    const tiled: { q: number; r: number; cx: number; cy: number; tile: ReturnType<typeof tileById.get> }[] = [];

    for (const { q, r, cx, cy } of visibleCoords) {
      const cell = cells[axialKey(q, r)];
      if (!cell) continue;
      if (cell.biomeId) {
        const biome = biomeById.get(cell.biomeId);
        if (biome) {
          // Wavy clip mask: only edges where neighbor also has a biome.
          let mask = 0;
          for (let edge = 0; edge < 6; edge++) {
            const off = NEIGHBOR_OFFSETS[EDGE_TO_NEIGHBOR_OFFSET[edge]];
            const nq = q + off.q, nr = r + off.r;
            if (!coordInBounds(nq, nr, grid.cols, grid.rows)) continue;
            if (cells[axialKey(nq, nr)]?.biomeId) mask |= 1 << edge;
          }
          biomed.push({ q, r, cx, cy, biome, mask });
        }
      }
      if (cell.tileId) {
        const tile = tileById.get(cell.tileId);
        if (tile) tiled.push({ q, r, cx, cy, tile });
      }
    }

    // ── BIOME LAYER ──
    // Pass 1 — soft radial blob with biome's base color (no clip).
    // Adjacent biome blobs overlap and blend optically along their seam.
    for (const b of biomed) {
      if (!b.biome) continue;
      drawBiomeBlob(raw, b.cx, b.cy, grid.hexSize, b.biome);
    }

    // Pass 2 — biome textures (stipple + decoration) inside displaced wavy clip.
    for (const b of biomed) {
      if (!b.biome) continue;
      withDisplacedHexClip(raw, b.q, b.r, b.cx, b.cy, grid.hexSize, b.mask, () => {
        if (b.biome) drawHexTexture(raw, b.q, b.r, b.cx, b.cy, grid.hexSize, b.biome);
      });
    }

    // Pass 3 — ambient biome glow (no clip).
    for (const b of biomed) {
      if (!b.biome) continue;
      drawHexGlow(raw, b.cx, b.cy, grid.hexSize, b.biome);
    }

    // Pass 4 — depth lighting in clean hex clip.
    for (const b of biomed) {
      raw.save();
      raw.beginPath();
      pathHex(raw, b.cx, b.cy, grid.hexSize);
      raw.clip();
      drawHexLighting(raw, b.cx, b.cy, grid.hexSize);
      raw.restore();
    }

    // ── TILE LAYER (features on top of biome) ──
    // Pass 5 — tile decoration overlay (e.g., raider campfire pebbles) inside clean hex clip.
    for (const t of tiled) {
      if (!t.tile?.decoration) continue;
      raw.save();
      raw.beginPath();
      pathHex(raw, t.cx, t.cy, grid.hexSize);
      raw.clip();
      // Reuse drawHexTexture but it expects a TileDef-like with fill2. We
      // call drawDecoration directly through a tile-shaped wrapper.
      drawHexTexture(raw, t.q, t.r, t.cx, t.cy, grid.hexSize, t.tile);
      raw.restore();
    }

    // Pass 6 — tile glow (no clip; feature halo).
    for (const t of tiled) {
      if (!t.tile) continue;
      drawHexGlow(raw, t.cx, t.cy, grid.hexSize, t.tile);
    }

    // Pass 7 — icons.
    for (const t of tiled) {
      if (!t.tile || t.tile.icon === "none") continue;
      drawIconEnhanced(raw, t.q, t.r, t.cx, t.cy, grid.hexSize, t.tile);
    }

    // Roads
    drawRoadPaths(raw, allPaths, roadTypeMap, grid.hexSize);

    // Grid contour — soft outline on EVERY visible hex (filled + empty).
    if (showGrid) {
      const color = "rgba(60,60,48,0.40)";
      raw.strokeStyle = color;
      raw.lineWidth = 1;
      for (const { cx, cy } of visibleCoords) {
        drawHexStroke(raw, cx, cy, grid.hexSize, color, 1);
      }
    }

    // Unifying tint — a thin warm-sepia overlay across the whole map area.
    // Pulls every biome toward a common tone, killing the "patchy clipart"
    // contrast between biomes without erasing their identity.
    if (biomed.length > 0 || tiled.length > 0) {
      raw.save();
      raw.globalCompositeOperation = "multiply";
      raw.globalAlpha = 0.10;
      raw.fillStyle = "#a48050";
      raw.fillRect(view.minX, view.minY, view.maxX - view.minX, view.maxY - view.minY);
      raw.restore();
      raw.save();
      raw.globalAlpha = 0.03;
      raw.fillStyle = "#3a2a18";
      raw.fillRect(view.minX, view.minY, view.maxX - view.minX, view.maxY - view.minY);
      raw.restore();
    }

    raw.restore();
  };

  return (
    <Stage
      ref={ref}
      width={width}
      height={height}
      x={pos.x}
      y={pos.y}
      scaleX={scale}
      scaleY={scale}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        handlePointerUp();
        onHover(null);
      }}
      onWheel={handleWheel}
      onContextMenu={(e) => e.evt.preventDefault()}
      style={{ background: "#1a1a14", cursor: tool === "pan" ? "grab" : "crosshair" }}
    >
      <Layer listening={false}>
        <Shape sceneFunc={drawScene} />
      </Layer>
      <Layer listening={false}>
        {labelEntries.map((l) => (
          <Group key={l.key} x={l.x} y={l.y} listening={false}>
            <Rect
              width={l.w}
              height={l.h}
              fill="rgba(10,10,8,0.85)"
              stroke="#f4d03f"
              strokeWidth={1}
              cornerRadius={3}
            />
            <Text
              x={l.padX}
              y={l.padY}
              width={l.tw}
              height={l.fontSize}
              text={l.text}
              fontSize={l.fontSize}
              fontStyle="bold"
              fontFamily="Consolas, monospace"
              fill="#f4d03f"
              align="center"
            />
          </Group>
        ))}
      </Layer>
    </Stage>
  );
});
