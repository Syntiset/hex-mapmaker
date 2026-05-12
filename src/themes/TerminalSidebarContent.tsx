import { useEffect, useRef, useState } from "react";
import { useMapStore, type Tool } from "../store/mapStore";
import { FALLOUT_TILE_CATEGORIES } from "../tiles/fallout";
import type { BiomeDef, TileDef } from "../tiles/types";
import { drawBiomeRich, drawHexStroke, drawIconEnhanced, pathHex } from "../render/drawHex";

const TOOLS: { id: Tool; key: string; label: string }[] = [
  { id: "paint",      key: "P", label: "PAINT" },
  { id: "erase",      key: "E", label: "ERASE" },
  { id: "road",       key: "R", label: "ROAD" },
  { id: "road-erase", key: "X", label: "ROAD-X" },
  { id: "label",      key: "L", label: "LABEL" },
  { id: "pan",        key: "V", label: "PAN" },
];

const PREVIEW_SIZE = 96;

function HexPreview({
  biome,
  tile,
  size = PREVIEW_SIZE,
}: { biome: BiomeDef; tile?: TileDef; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);
    const hexS = size * 0.42;
    const cx = size / 2, cy = size / 2;
    ctx.save();
    ctx.beginPath();
    pathHex(ctx, cx, cy, hexS);
    ctx.clip();
    drawBiomeRich(ctx, 0, 0, cx, cy, hexS, biome);
    ctx.restore();
    if (tile) drawIconEnhanced(ctx, 0, 0, cx, cy, hexS, tile);
    drawHexStroke(ctx, cx, cy, hexS, biome.stroke, 1);
  }, [biome, tile, size]);
  return <canvas ref={ref} width={size} height={size} className="cli-hex-preview" />;
}

function pad2(n: number): string { return n < 10 ? `0${n}` : `${n}`; }

function asLabel(s: string): string {
  return s.toUpperCase().replace(/Ё/g, "Е");
}

export function TerminalSidebarContent() {
  const tool = useMapStore((s) => s.tool);
  const setTool = useMapStore((s) => s.setTool);
  const paintMode = useMapStore((s) => s.paintMode);
  const setPaintMode = useMapStore((s) => s.setPaintMode);
  const showGrid = useMapStore((s) => s.showGrid);
  const toggleGrid = useMapStore((s) => s.toggleGrid);
  const freeHandRoad = useMapStore((s) => s.freeHandRoad);
  const toggleFreeHandRoad = useMapStore((s) => s.toggleFreeHandRoad);
  const roads = useMapStore((s) => s.roads);
  const activeRoadId = useMapStore((s) => s.activeRoadId);
  const setActiveRoad = useMapStore((s) => s.setActiveRoad);
  const biomes = useMapStore((s) => s.biomes);
  const activeBiomeId = useMapStore((s) => s.activeBiomeId);
  const setActiveBiome = useMapStore((s) => s.setActiveBiome);
  const tiles = useMapStore((s) => s.tiles);
  const activeTileId = useMapStore((s) => s.activeTileId);
  const setActiveTile = useMapStore((s) => s.setActiveTile);

  const [category, setCategory] = useState<string>("all");

  const activeBiome = biomes.find((b) => b.id === activeBiomeId) ?? biomes[0];
  const activeTile = tiles.find((t) => t.id === activeTileId) ?? tiles[0];

  const visibleTiles = (() => {
    if (category === "all") return tiles;
    const cat = FALLOUT_TILE_CATEGORIES.find((c) => c.id === category);
    if (!cat) return tiles;
    const byId = new Map(tiles.map((t) => [t.id, t]));
    return cat.tileIds.map((id) => byId.get(id)).filter((t): t is TileDef => !!t);
  })();

  function ensurePaintTool() {
    const cur = useMapStore.getState().tool;
    if (cur !== "paint" && cur !== "erase") setTool("paint");
  }

  function onPickBiome(id: string) {
    setActiveBiome(id as never);
    setPaintMode("biome");
    ensurePaintTool();
  }
  function onPickTile(id: string) {
    setActiveTile(id);
    setPaintMode("tile");
    ensurePaintTool();
  }

  const categories: { id: string; name: string }[] = [
    { id: "all", name: "ALL" },
    ...FALLOUT_TILE_CATEGORIES.map((c) => ({ id: c.id, name: asLabel(c.name).slice(0, 6) })),
  ];

  return (
    <div className="cli">
      <div className="cli-header">&gt; ROBCO MAP EDITOR v1.7</div>
      <div className="cli-rule">─────────────────────────</div>

      <div className="cli-section">&gt; MODE</div>
      <div className="cli-row" onClick={() => setPaintMode("biome")}>
        {paintMode === "biome" ? "▶" : " "} [B] BIOME
      </div>
      <div className="cli-row" onClick={() => setPaintMode("tile")}>
        {paintMode === "tile" ? "▶" : " "} [T] TILE
      </div>

      <div className="cli-section">&gt; TOOL</div>
      {TOOLS.map((t) => (
        <div key={t.id} className={`cli-row ${tool === t.id ? "is-active" : ""}`} onClick={() => setTool(t.id)}>
          {tool === t.id ? "▶" : " "} [{t.key}] {t.label}
        </div>
      ))}

      <div className="cli-section">&gt; ROAD</div>
      <div className="cli-roads">
        {roads.map((r) => (
          <span
            key={r.id}
            className={`cli-tag ${activeRoadId === r.id ? "is-active" : ""}`}
            onClick={() => { setActiveRoad(r.id); setTool("road"); }}
          >
            {asLabel(r.name)}
          </span>
        ))}
      </div>
      <div className="cli-row cli-toggle" onClick={toggleFreeHandRoad}>
        [{freeHandRoad ? "X" : " "}] FREE-HAND
      </div>
      <div className="cli-row cli-toggle" onClick={toggleGrid}>
        [{showGrid ? "X" : " "}] GRID
      </div>

      <div className="cli-split">
        <div className="cli-list">
          <div className="cli-section">&gt; BIOMES</div>
          {biomes.map((b, i) => (
            <div
              key={b.id}
              className={`cli-row ${paintMode === "biome" && activeBiomeId === b.id ? "is-active" : ""}`}
              onClick={() => onPickBiome(b.id)}
            >
              {paintMode === "biome" && activeBiomeId === b.id ? "▶" : " "} [{pad2(i + 1)}] {asLabel(b.name)}
            </div>
          ))}

          <div className="cli-section">&gt; TILES</div>
          <div className="cli-cats">
            {categories.map((c) => (
              <span
                key={c.id}
                className={`cli-tag ${category === c.id ? "is-active" : ""}`}
                onClick={() => setCategory(c.id)}
              >
                {c.name}
              </span>
            ))}
          </div>
          {visibleTiles.map((t, i) => (
            <div
              key={t.id}
              className={`cli-row ${paintMode === "tile" && activeTileId === t.id ? "is-active" : ""}`}
              onClick={() => onPickTile(t.id)}
            >
              {paintMode === "tile" && activeTileId === t.id ? "▶" : " "} [{pad2(i + 1)}] {asLabel(t.name)}
            </div>
          ))}
        </div>

        <div className="cli-preview">
          <div className="cli-preview-block">
            <HexPreview biome={activeBiome} />
            <div className="cli-preview-name">{asLabel(activeBiome.name)}</div>
            <div className="cli-preview-hint">BIOME</div>
          </div>
          <div className="cli-preview-block">
            <HexPreview biome={activeBiome} tile={activeTile} />
            <div className="cli-preview-name">{asLabel(activeTile.name)}</div>
            <div className="cli-preview-hint">TILE</div>
          </div>
        </div>
      </div>

      <div className="cli-footer">&gt; READY_<span className="cli-cursor"> </span></div>
    </div>
  );
}
