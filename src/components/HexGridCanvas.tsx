import { forwardRef, useEffect, useMemo, useRef } from "react";
import { Stage, Layer, Shape, Text, Group, Rect } from "react-konva";
import type Konva from "konva";
import {
  axialKey,
  axialToPixel,
  coordInBounds,
  edgeMidpoint,
  hexHeight,
  hexWidth,
  NEIGHBOR_OFFSETS,
  pixelToAxial,
} from "../hex/hex";
import { useMapStore } from "../store/mapStore";
import {
  drawHexGlow,
  drawHexStroke,
  drawNeighbourTint,
  drawRoadPaths,
  pathHex,
} from "../render/drawHex";
import { clearBiomeSpriteCache, getBiomeSprite } from "../render/biomeSprite";
import { clearTileSpriteCache, getTileSprite } from "../render/tileSprite";

interface PixelPt { x: number; y: number }

export interface ViewState { scale: number; pos: { x: number; y: number } }

interface Props {
  width: number;
  height: number;
  onHover: (key: string | null) => void;
  viewState: ViewState;
  setViewState: (v: ViewState | ((prev: ViewState) => ViewState)) => void;
  panOverride?: boolean;
}

export const HexGridCanvas = forwardRef<Konva.Stage, Props>(function HexGridCanvas(
  { width, height, onHover, viewState, setViewState, panOverride = false },
  ref,
) {
  const scale = viewState.scale;
  const pos = viewState.pos;
  const setScale = (s: number) => setViewState((v) => ({ ...v, scale: s }));
  const setPos = (p: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) =>
    setViewState((v) => ({ ...v, pos: typeof p === "function" ? p(v.pos) : p }));
  const grid = useMapStore((s) => s.grid);
  const cells = useMapStore((s) => s.cells);
  const tiles = useMapStore((s) => s.tiles);
  const biomes = useMapStore((s) => s.biomes);
  const roads = useMapStore((s) => s.roads);
  const roadPaths = useMapStore((s) => s.roadPaths);
  const draftPoints = useMapStore((s) => s.draftPoints);
  const activeRoadId = useMapStore((s) => s.activeRoadId);
  const storeTool = useMapStore((s) => s.tool);
  const tool = panOverride ? "pan" : storeTool;
  const showGrid = useMapStore((s) => s.showGrid);
  const freeHandRoad = useMapStore((s) => s.freeHandRoad);
  const paint = useMapStore((s) => s.paint);
  const erase = useMapStore((s) => s.erase);
  const beginRoadPath = useMapStore((s) => s.beginRoadPath);
  const continueRoadPath = useMapStore((s) => s.continueRoadPath);
  const commitRoadPath = useMapStore((s) => s.commitRoadPath);
  const eraseRoadNear = useMapStore((s) => s.eraseRoadNear);
  const setLabel = useMapStore((s) => s.setLabel);
  const cancelRoadPath = useMapStore((s) => s.cancelRoadPath);
  const undo = useMapStore((s) => s.undo);

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

  const dragging = useRef(false);
  const painting = useRef(false);
  const lastKey = useRef<string | null>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ dist: number; cx: number; cy: number; scale: number } | null>(null);
  const lastActionRef = useRef<"paint" | "erase" | "road" | "road-erase" | null>(null);

  // Recenter on grid change.
  useEffect(() => {
    setPos({ x: hw, y: hh });
  }, [hw, hh, grid.cols, grid.rows]);

  // Invalidate sprite caches when world hexSize changes.
  useEffect(() => {
    clearBiomeSpriteCache();
    clearTileSpriteCache();
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
    const evt = e.evt;
    pointersRef.current.set(evt.pointerId, { x: evt.clientX, y: evt.clientY });

    // Two-finger pinch gesture: revert any action that the first pointer's
    // pointerdown already triggered (paint/erase/road-erase add to history;
    // road draft is cleared without commit). Then capture pinch state.
    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const dx = pts[0].x - pts[1].x, dy = pts[0].y - pts[1].y;
      pinchRef.current = {
        dist: Math.hypot(dx, dy),
        cx: (pts[0].x + pts[1].x) / 2,
        cy: (pts[0].y + pts[1].y) / 2,
        scale,
      };
      const last = lastActionRef.current;
      if (last === "road") cancelRoadPath();
      else if (last === "paint" || last === "erase" || last === "road-erase") undo();
      lastActionRef.current = null;
      painting.current = false;
      lastKey.current = null;
      dragging.current = false;
      return;
    }

    if (tool === "pan" || evt.button === 1 || evt.button === 2) {
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
      lastActionRef.current = "road";
      return;
    }
    if (tool === "road-erase") {
      const before = useMapStore.getState().roadPaths.length;
      eraseRoadNear(world, grid.hexSize * 0.5);
      if (useMapStore.getState().roadPaths.length !== before) lastActionRef.current = "road-erase";
      return;
    }
    if (!hx) return;
    lastKey.current = hx.key;
    if (tool === "paint") { paint(hx.key); lastActionRef.current = "paint"; }
    else if (tool === "erase") { erase(hx.key); lastActionRef.current = "erase"; }
    else if (tool === "label") {
      const current = cells[hx.key]?.label ?? "";
      const text = window.prompt("Подпись гекса:", current);
      if (text !== null) setLabel(hx.key, text.trim());
    }
  }

  function handlePointerMove(e: Konva.KonvaEventObject<PointerEvent>) {
    const stage = e.target.getStage();
    if (!stage) return;
    const evt = e.evt;

    // Pinch update — two pointers active.
    if (pointersRef.current.has(evt.pointerId)) {
      pointersRef.current.set(evt.pointerId, { x: evt.clientX, y: evt.clientY });
    }
    if (pointersRef.current.size === 2 && pinchRef.current) {
      const pts = Array.from(pointersRef.current.values());
      const dx = pts[0].x - pts[1].x, dy = pts[0].y - pts[1].y;
      const dist = Math.hypot(dx, dy);
      const cx = (pts[0].x + pts[1].x) / 2;
      const cy = (pts[0].y + pts[1].y) / 2;
      const ratio = dist / Math.max(1, pinchRef.current.dist);
      const newScale = Math.max(0.15, Math.min(4, pinchRef.current.scale * ratio));
      // Anchor zoom around current midpoint, plus translate by midpoint delta.
      setViewState((v) => {
        const wx = (cx - v.pos.x) / v.scale;
        const wy = (cy - v.pos.y) / v.scale;
        return {
          scale: newScale,
          pos: { x: cx - wx * newScale, y: cy - wy * newScale },
        };
      });
      pinchRef.current = { dist, cx, cy, scale: newScale };
      return;
    }

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

  function handlePointerUp(e?: Konva.KonvaEventObject<PointerEvent>) {
    if (e) pointersRef.current.delete(e.evt.pointerId);
    else pointersRef.current.clear();
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size > 0) return;
    if (painting.current && tool === "road") commitRoadPath();
    painting.current = false;
    dragging.current = false;
    lastKey.current = null;
    lastActionRef.current = null;
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
    // Collect cells with biomes (terrain layer) and cells with tiles (features).
    const biomed: { q: number; r: number; cx: number; cy: number; biome: ReturnType<typeof biomeById.get> }[] = [];
    const tiled: { q: number; r: number; cx: number; cy: number; tile: ReturnType<typeof tileById.get> }[] = [];

    for (const { q, r, cx, cy } of visibleCoords) {
      const cell = cells[axialKey(q, r)];
      if (!cell) continue;
      if (cell.biomeId) {
        const biome = biomeById.get(cell.biomeId);
        if (biome) biomed.push({ q, r, cx, cy, biome });
      }
      if (cell.tileId) {
        const tile = tileById.get(cell.tileId);
        if (tile) tiled.push({ q, r, cx, cy, tile });
      }
    }

    // BG layer per-cell with biome.fill (or default empty colour). Hex shape is
    // slightly inflated (+0.5) so the antialiased fade falls just outside the
    // geometric edge — adjacent BG fills overlap by ~1 px at the seam, fully
    // covering the gap. The biome sprite drawn on top has its own clip at
    // exact hex size; its antialiased edge composites over our inflated BG of
    // the OWN biome's colour → seam shows biome colour, not dark fallback.
    const biomeByKey = new Map<string, NonNullable<ReturnType<typeof biomeById.get>>>();
    for (const b of biomed) {
      if (b.biome) biomeByKey.set(axialKey(b.q, b.r), b.biome);
    }
    for (const { q, r, cx, cy } of visibleCoords) {
      const k = axialKey(q, r);
      const biome = biomeByKey.get(k);
      raw.fillStyle = biome?.fill ?? "#262620";
      raw.beginPath();
      pathHex(raw, cx, cy, grid.hexSize + 0.5);
      raw.fill();
    }

    // ── BIOME LAYER ──
    // Solid biome base is now baked INTO the sprite (Pass 0 in biomeSprite.ts).
    // The previous runtime blob with no clip caused asymmetric cross-biome
    // colour bleed (later-drawn cells overpainted earlier ones in row-major
    // order). With opaque sprites, cross-biome blending is the sole job of
    // Pass 3 (edge-blend) which is symmetric by construction.

    // Pass 2 — composite cached per-cell sprite (solid base + texture + lighting).
    // Sprite is built once per (biomeId, q, r, hexSize) and reused across
    // frames. Sprites are baked at SPRITE_SCALE× backing-store resolution so
    // they stay crisp on HiDPI; drawImage passes explicit world-pixel size.
    for (const b of biomed) {
      if (!b.biome) continue;
      const sprite = getBiomeSprite(b.biome, b.q, b.r, grid.hexSize);
      raw.drawImage(
        sprite.canvas,
        b.cx - sprite.half,
        b.cy - sprite.half,
        sprite.dim,
        sprite.dim,
      );
    }

    // Pass 3 — neighbour tint blobs. For each biomed cell, for each of its 6
    // sides where the neighbour has a DIFFERENT biome, paint a soft radial
    // blob inside the cell's own hex (clipped) in the neighbour's colour.
    // Symmetric by construction (every cell paints its own side). Smooth
    // radial falloff → no corner artefacts.
    for (const b of biomed) {
      if (!b.biome) continue;
      for (let s = 0; s < 6; s++) {
        const off = NEIGHBOR_OFFSETS[s];
        const nKey = axialKey(b.q + off.q, b.r + off.r);
        const nCell = cells[nKey];
        if (!nCell?.biomeId || nCell.biomeId === b.biome.id) continue;
        const nBiome = biomeById.get(nCell.biomeId);
        if (!nBiome) continue;
        drawNeighbourTint(raw, b.cx, b.cy, grid.hexSize, s, nBiome);
      }
    }

    // Pass 4 — symmetric ambient glow runtime overlay. Glow used to be baked
    // into each biome sprite without hex-clip, which produced an asymmetric
    // bleed (late-drawn cells' glow visible only on N/W neighbours, covered
    // by S/E neighbours' sprites). Now drawn AFTER all biome sprites and
    // edge-blends so each glow lands on every neighbour identically.
    for (const b of biomed) {
      if (!b.biome) continue;
      drawHexGlow(raw, b.cx, b.cy, grid.hexSize, b.biome);
    }

    // ── TILE LAYER (features on top of biome) ──
    // Cached per-cell tile sprite — bakes decoration + glow + icon (with
    // drop shadow) into an offscreen canvas. Replaces 3 runtime passes
    // with one drawImage. Same cache strategy as biome sprite.
    for (const t of tiled) {
      if (!t.tile) continue;
      const sprite = getTileSprite(t.tile, t.q, t.r, grid.hexSize);
      raw.drawImage(
        sprite.canvas,
        t.cx - sprite.half,
        t.cy - sprite.half,
        sprite.dim,
        sprite.dim,
      );
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
      onPointerCancel={(e) => handlePointerUp(e)}
      onWheel={handleWheel}
      onContextMenu={(e) => e.evt.preventDefault()}
      style={{ background: "#1a1a14", cursor: tool === "pan" ? "grab" : "crosshair", touchAction: "none" }}
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
