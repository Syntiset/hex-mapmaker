import { useEffect, useMemo, useRef, useState } from "react";
import { useMapStore } from "../store/mapStore";
import {
  drawBiomeRich,
  drawHexStroke,
  drawIconEnhanced,
  pathHex,
} from "../render/drawHex";
import type { BiomeDef, TileDef } from "../tiles/types";
import { FALLOUT_TILE_CATEGORIES } from "../tiles/fallout";

const PREVIEW = 52;
const HOVER_PREVIEW = 140;

function TilePreview({ tile, biome, size = PREVIEW }: { tile: TileDef; biome: BiomeDef; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);
    const hexS = size * 0.42;
    const cx = size / 2;
    const cy = size / 2;
    ctx.save();
    ctx.beginPath();
    pathHex(ctx, cx, cy, hexS);
    ctx.clip();
    drawBiomeRich(ctx, 0, 0, cx, cy, hexS, biome);
    ctx.restore();
    drawIconEnhanced(ctx, 0, 0, cx, cy, hexS, tile);
    drawHexStroke(ctx, cx, cy, hexS, biome.stroke, 1);
  }, [tile, biome, size]);
  return <canvas ref={ref} width={size} height={size} />;
}

function BiomePreview({ biome, size = PREVIEW }: { biome: BiomeDef; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);
    const hexS = size * 0.42;
    const cx = size / 2;
    const cy = size / 2;
    ctx.save();
    ctx.beginPath();
    pathHex(ctx, cx, cy, hexS);
    ctx.clip();
    drawBiomeRich(ctx, 0, 0, cx, cy, hexS, biome);
    ctx.restore();
    drawHexStroke(ctx, cx, cy, hexS, biome.stroke, 1);
  }, [biome, size]);
  return <canvas ref={ref} width={size} height={size} />;
}

interface HoverState {
  kind: "biome" | "tile";
  id: string;
  x: number;
  y: number;
}

export function TilePalette() {
  const tiles = useMapStore((s) => s.tiles);
  const biomes = useMapStore((s) => s.biomes);
  const activeId = useMapStore((s) => s.activeTileId);
  const setActive = useMapStore((s) => s.setActiveTile);
  const setTool = useMapStore((s) => s.setTool);
  const setPaintMode = useMapStore((s) => s.setPaintMode);
  const activeBiomeId = useMapStore((s) => s.activeBiomeId);
  const setActiveBiome = useMapStore((s) => s.setActiveBiome);
  const paintMode = useMapStore((s) => s.paintMode);

  const [category, setCategory] = useState<string>("all");
  const [hover, setHover] = useState<HoverState | null>(null);

  const activeBiome = biomes.find((b) => b.id === activeBiomeId) ?? biomes[0];

  const tileById = useMemo(() => new Map(tiles.map((t) => [t.id, t])), [tiles]);
  const visibleTiles = useMemo(() => {
    if (category === "all") return tiles;
    const cat = FALLOUT_TILE_CATEGORIES.find((c) => c.id === category);
    if (!cat) return tiles;
    return cat.tileIds.map((id) => tileById.get(id)).filter((t): t is TileDef => !!t);
  }, [category, tiles, tileById]);

  const hoverBiome = hover?.kind === "biome" ? biomes.find((b) => b.id === hover.id) : undefined;
  const hoverTile = hover?.kind === "tile" ? tileById.get(hover.id) : undefined;

  // Don't auto-switch tool when picking from palette — preserves erase, road, etc.
  // Only nudge to paint if current tool isn't a paint-related one already.
  function ensurePaintCompatibleTool() {
    const cur = useMapStore.getState().tool;
    if (cur !== "paint" && cur !== "erase") setTool("paint");
  }

  return (
    <div className="palette">
      <h3>Биомы</h3>
      <div className="palette-grid">
        {biomes.map((b) => (
          <button
            key={b.id}
            className={paintMode === "biome" && activeBiomeId === b.id ? "tile-btn active" : "tile-btn"}
            onClick={() => {
              setActiveBiome(b.id);
              setPaintMode("biome");
              ensurePaintCompatibleTool();
            }}
            onMouseEnter={(e) => setHover({ kind: "biome", id: b.id, x: e.clientX, y: e.clientY })}
            onMouseMove={(e) => setHover((h) => (h && h.id === b.id ? { ...h, x: e.clientX, y: e.clientY } : h))}
            onMouseLeave={() => setHover((h) => (h && h.id === b.id ? null : h))}
            title={b.name}
          >
            <BiomePreview biome={b} />
            <span>{b.name}</span>
          </button>
        ))}
      </div>

      <h3 style={{ marginTop: 14 }}>Тайлы</h3>
      <div className="palette-hint" title="Превью показывает тайл поверх активного биома">
        Поверх: {activeBiome.name}
      </div>
      <div className="palette-categories">
        <button
          className={category === "all" ? "active" : ""}
          onClick={() => setCategory("all")}
        >Все</button>
        {FALLOUT_TILE_CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={category === c.id ? "active" : ""}
            onClick={() => setCategory(c.id)}
          >{c.name}</button>
        ))}
      </div>
      <div className="tile-list">
        {visibleTiles.map((t) => (
          <button
            key={t.id}
            className={paintMode === "tile" && activeId === t.id ? "tile-row active" : "tile-row"}
            onClick={() => {
              setActive(t.id);
              setPaintMode("tile");
              ensurePaintCompatibleTool();
            }}
            onMouseEnter={(e) => setHover({ kind: "tile", id: t.id, x: e.clientX, y: e.clientY })}
            onMouseMove={(e) => setHover((h) => (h && h.id === t.id ? { ...h, x: e.clientX, y: e.clientY } : h))}
            onMouseLeave={() => setHover((h) => (h && h.id === t.id ? null : h))}
            title={t.name}
          >
            {t.name}
          </button>
        ))}
      </div>

      {hover && (hoverBiome || hoverTile) && (() => {
        const offset = 16;
        const px = Math.min(hover.x + offset, window.innerWidth - HOVER_PREVIEW - 20);
        const py = Math.min(hover.y + offset, window.innerHeight - HOVER_PREVIEW - 40);
        return (
          <div className="hover-preview" style={{ left: px, top: py, width: HOVER_PREVIEW }}>
            {hoverBiome && <BiomePreview biome={hoverBiome} size={HOVER_PREVIEW} />}
            {hoverTile && <TilePreview tile={hoverTile} biome={activeBiome} size={HOVER_PREVIEW} />}
            <div className="hp-name">
              {hoverBiome?.name ?? hoverTile?.name}
              {hoverTile && <div style={{ fontSize: 9, color: "#7f7a60", marginTop: 2 }}>поверх: {activeBiome.name}</div>}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
