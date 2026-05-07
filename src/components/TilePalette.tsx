import { useEffect, useRef } from "react";
import { useMapStore } from "../store/mapStore";
import {
  drawBiomeRich,
  drawHexStroke,
  drawIconEnhanced,
  pathHex,
} from "../render/drawHex";
import type { BiomeDef, TileDef } from "../tiles/types";

const PREVIEW = 52;

function TilePreview({ tile, biome }: { tile: TileDef; biome: BiomeDef }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, PREVIEW, PREVIEW);
    const size = PREVIEW * 0.42;
    const cx = PREVIEW / 2;
    const cy = PREVIEW / 2;

    // Render the biome as backdrop, then the tile icon on top.
    ctx.save();
    ctx.beginPath();
    pathHex(ctx, cx, cy, size);
    ctx.clip();
    drawBiomeRich(ctx, 0, 0, cx, cy, size, biome);
    ctx.restore();

    drawIconEnhanced(ctx, 0, 0, cx, cy, size, tile);
    drawHexStroke(ctx, cx, cy, size, biome.stroke, 1);
  }, [tile, biome]);
  return <canvas ref={ref} width={PREVIEW} height={PREVIEW} />;
}

function BiomePreview({ biome }: { biome: BiomeDef }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, PREVIEW, PREVIEW);
    const size = PREVIEW * 0.42;
    const cx = PREVIEW / 2;
    const cy = PREVIEW / 2;
    ctx.save();
    ctx.beginPath();
    pathHex(ctx, cx, cy, size);
    ctx.clip();
    drawBiomeRich(ctx, 0, 0, cx, cy, size, biome);
    ctx.restore();
    drawHexStroke(ctx, cx, cy, size, biome.stroke, 1);
  }, [biome]);
  return <canvas ref={ref} width={PREVIEW} height={PREVIEW} />;
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

  const activeBiome = biomes.find((b) => b.id === activeBiomeId) ?? biomes[0];

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
              setTool("paint");
            }}
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
      <div className="palette-grid">
        {tiles.map((t) => (
          <button
            key={t.id}
            className={paintMode === "tile" && activeId === t.id ? "tile-btn active" : "tile-btn"}
            onClick={() => {
              setActive(t.id);
              setPaintMode("tile");
              setTool("paint");
            }}
            title={t.name}
          >
            <TilePreview tile={t} biome={activeBiome} />
            <span>{t.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
