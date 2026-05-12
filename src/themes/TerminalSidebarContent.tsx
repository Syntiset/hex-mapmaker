import { useEffect, useRef, useState } from "react";
import { useMapStore, type Tool } from "../store/mapStore";
import { FALLOUT_TILE_CATEGORIES } from "../tiles/fallout";
import type { BiomeDef, TileDef } from "../tiles/types";
import { drawBiomeRich, drawHexStroke, drawIconEnhanced, pathHex } from "../render/drawHex";

const TOOLS: { id: Tool; key: string; label: string; desc: string }[] = [
  { id: "paint",      key: "P", label: "PAINT",     desc: "Покрасить гекс активным биомом/тайлом." },
  { id: "erase",      key: "E", label: "ERASE",     desc: "Стереть биом или тайл из гекса." },
  { id: "road",       key: "R", label: "ROAD",      desc: "Рисовать дорогу (snap-to-hex или free-hand)." },
  { id: "road-erase", key: "X", label: "ROAD-X",    desc: "Удалить дорогу из выбранного гекса." },
  { id: "label",      key: "L", label: "LABEL",     desc: "Поставить текстовую подпись." },
  { id: "pan",        key: "V", label: "PAN",       desc: "Двигать камеру (зажатый палец)." },
];

const TABS = ["BIOMES", "TILES", "TOOLS", "ROADS", "INFO"] as const;
type Tab = typeof TABS[number];

const PREVIEW_LG = 156;

function HexPreview({
  biome,
  tile,
  size,
}: { biome: BiomeDef; tile?: TileDef; size: number }) {
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
  return <canvas ref={ref} width={size} height={size} className="pip-hex-preview" />;
}

function pad2(n: number): string { return n < 10 ? `0${n}` : `${n}`; }
function asLabel(s: string): string { return s.toUpperCase().replace(/Ё/g, "Е"); }

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
  const grid = useMapStore((s) => s.grid);

  const [tab, setTab] = useState<Tab>("BIOMES");
  const [category, setCategory] = useState<string>("all");
  const [hoverBiome, setHoverBiome] = useState<string | null>(null);
  const [hoverTile, setHoverTile] = useState<string | null>(null);

  const activeBiome = biomes.find((b) => b.id === activeBiomeId) ?? biomes[0];
  const activeTile = tiles.find((t) => t.id === activeTileId) ?? tiles[0];
  const previewBiome = hoverBiome ? biomes.find((b) => b.id === hoverBiome) ?? activeBiome : activeBiome;
  const previewTile = hoverTile ? tiles.find((t) => t.id === hoverTile) ?? activeTile : activeTile;
  const activeToolDef = TOOLS.find((t) => t.id === tool) ?? TOOLS[0];

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

  const categories = [{ id: "all", name: "ALL" }, ...FALLOUT_TILE_CATEGORIES];

  return (
    <div className="pip">
      <div className="pip-statbar">
        <div className="pip-statbar-title">ROBCO MAP EDITOR v1.7</div>
        <div className="pip-statbar-stats">
          <span>MODE: <b>{paintMode === "biome" ? "BIOME" : "TILE"}</b></span>
          <span>TOOL: <b>{activeToolDef.label}</b></span>
          <span>GRID: <b>{grid.cols}×{grid.rows}</b></span>
        </div>
      </div>

      <div className="pip-tabs">
        {TABS.map((t) => (
          <div
            key={t}
            className={`pip-tab ${tab === t ? "is-active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </div>
        ))}
      </div>

      {tab === "BIOMES" && (
        <div className="pip-body">
          <div className="pip-col-list">
            <div className="pip-list-header">BIOMES ({biomes.length})</div>
            {biomes.map((b, i) => (
              <div
                key={b.id}
                className={`pip-row ${paintMode === "biome" && activeBiomeId === b.id ? "is-active" : ""}`}
                onClick={() => onPickBiome(b.id)}
                onPointerEnter={() => setHoverBiome(b.id)}
                onPointerLeave={() => setHoverBiome(null)}
              >
                <span className="pip-row-marker">{paintMode === "biome" && activeBiomeId === b.id ? "▶" : " "}</span>
                <span className="pip-row-id">[{pad2(i + 1)}]</span>
                <span className="pip-row-name">{asLabel(b.name)}</span>
              </div>
            ))}
          </div>
          <div className="pip-col-detail">
            <HexPreview biome={previewBiome} size={PREVIEW_LG} />
            <div className="pip-detail-name">{asLabel(previewBiome.name)}</div>
            <div className="pip-detail-rule">─────────────</div>
            <div className="pip-detail-line">FILL: <span style={{ color: previewBiome.fill }}>■■■</span></div>
            <div className="pip-detail-line">STROKE: <span style={{ color: previewBiome.stroke }}>━━</span></div>
            {previewBiome.decoration && (
              <div className="pip-detail-line">DECOR: {previewBiome.decoration.kind.toUpperCase()}</div>
            )}
            {previewBiome.glow && (
              <div className="pip-detail-line">GLOW: ON</div>
            )}
          </div>
        </div>
      )}

      {tab === "TILES" && (
        <div className="pip-body">
          <div className="pip-col-list">
            <div className="pip-list-header">
              TILES ({visibleTiles.length}) │ {asLabel(activeBiome.name)}
            </div>
            <div className="pip-cats">
              {categories.map((c) => (
                <span
                  key={c.id}
                  className={`pip-tag ${category === c.id ? "is-active" : ""}`}
                  onClick={() => setCategory(c.id)}
                >
                  {asLabel(c.name)}
                </span>
              ))}
            </div>
            {visibleTiles.map((t, i) => (
              <div
                key={t.id}
                className={`pip-row ${paintMode === "tile" && activeTileId === t.id ? "is-active" : ""}`}
                onClick={() => onPickTile(t.id)}
                onPointerEnter={() => setHoverTile(t.id)}
                onPointerLeave={() => setHoverTile(null)}
              >
                <span className="pip-row-marker">{paintMode === "tile" && activeTileId === t.id ? "▶" : " "}</span>
                <span className="pip-row-id">[{pad2(i + 1)}]</span>
                <span className="pip-row-name">{asLabel(t.name)}</span>
              </div>
            ))}
          </div>
          <div className="pip-col-detail">
            <HexPreview biome={activeBiome} tile={previewTile} size={PREVIEW_LG} />
            <div className="pip-detail-name">{asLabel(previewTile.name)}</div>
            <div className="pip-detail-rule">─────────────</div>
            <div className="pip-detail-line">ON: {asLabel(activeBiome.name)}</div>
          </div>
        </div>
      )}

      {tab === "TOOLS" && (
        <div className="pip-body">
          <div className="pip-col-list">
            <div className="pip-list-header">TOOLS</div>
            <div className="pip-list-header" style={{ marginTop: 4, opacity: 0.7 }}>MODE</div>
            <div className={`pip-row ${paintMode === "biome" ? "is-active" : ""}`} onClick={() => setPaintMode("biome")}>
              <span className="pip-row-marker">{paintMode === "biome" ? "▶" : " "}</span>
              <span className="pip-row-id">[B]</span>
              <span className="pip-row-name">BIOME</span>
            </div>
            <div className={`pip-row ${paintMode === "tile" ? "is-active" : ""}`} onClick={() => setPaintMode("tile")}>
              <span className="pip-row-marker">{paintMode === "tile" ? "▶" : " "}</span>
              <span className="pip-row-id">[T]</span>
              <span className="pip-row-name">TILE</span>
            </div>
            <div className="pip-list-header" style={{ marginTop: 8, opacity: 0.7 }}>ACTION</div>
            {TOOLS.map((t) => (
              <div key={t.id} className={`pip-row ${tool === t.id ? "is-active" : ""}`} onClick={() => setTool(t.id)}>
                <span className="pip-row-marker">{tool === t.id ? "▶" : " "}</span>
                <span className="pip-row-id">[{t.key}]</span>
                <span className="pip-row-name">{t.label}</span>
              </div>
            ))}
          </div>
          <div className="pip-col-detail pip-col-detail-text">
            <div className="pip-detail-name">{activeToolDef.label}</div>
            <div className="pip-detail-rule">─────────────</div>
            <div className="pip-detail-paragraph">{activeToolDef.desc}</div>
            <div className="pip-detail-rule">─────────────</div>
            <div className="pip-detail-line">CURRENT MODE: {paintMode === "biome" ? "BIOME" : "TILE"}</div>
            <div className="pip-detail-line">ACTIVE BIOME: {asLabel(activeBiome.name)}</div>
            <div className="pip-detail-line">ACTIVE TILE: {asLabel(activeTile.name)}</div>
          </div>
        </div>
      )}

      {tab === "ROADS" && (
        <div className="pip-body">
          <div className="pip-col-list">
            <div className="pip-list-header">ROAD TYPES</div>
            {roads.map((r, i) => (
              <div
                key={r.id}
                className={`pip-row ${activeRoadId === r.id ? "is-active" : ""}`}
                onClick={() => { setActiveRoad(r.id); setTool("road"); }}
              >
                <span className="pip-row-marker">{activeRoadId === r.id ? "▶" : " "}</span>
                <span className="pip-row-id">[{pad2(i + 1)}]</span>
                <span className="pip-row-name">{asLabel(r.name)}</span>
              </div>
            ))}
            <div className="pip-list-header" style={{ marginTop: 8 }}>OPTIONS</div>
            <div className="pip-row pip-toggle" onClick={toggleFreeHandRoad}>
              <span className="pip-row-marker">[{freeHandRoad ? "X" : " "}]</span>
              <span className="pip-row-name">FREE-HAND</span>
            </div>
          </div>
          <div className="pip-col-detail pip-col-detail-text">
            <div className="pip-detail-name">ROADS</div>
            <div className="pip-detail-rule">─────────────</div>
            <div className="pip-detail-paragraph">
              {freeHandRoad
                ? "Free-hand mode: дорога рисуется по точкам пальцем, без привязки к гексам."
                : "Snap mode: дорога идёт от центра / угла / середины ребра гекса к соседу."}
            </div>
          </div>
        </div>
      )}

      {tab === "INFO" && (
        <div className="pip-body">
          <div className="pip-col-list">
            <div className="pip-list-header">SETTINGS</div>
            <div className="pip-row pip-toggle" onClick={toggleGrid}>
              <span className="pip-row-marker">[{showGrid ? "X" : " "}]</span>
              <span className="pip-row-name">GRID OVERLAY</span>
            </div>
            <div className="pip-list-header" style={{ marginTop: 8 }}>HOTKEYS</div>
            <div className="pip-row pip-hint"><span className="pip-row-id">[B]</span><span className="pip-row-name">MODE BIOME</span></div>
            <div className="pip-row pip-hint"><span className="pip-row-id">[T]</span><span className="pip-row-name">MODE TILE</span></div>
            <div className="pip-row pip-hint"><span className="pip-row-id">[R]</span><span className="pip-row-name">ROAD TOOL</span></div>
            <div className="pip-row pip-hint"><span className="pip-row-id">[E]</span><span className="pip-row-name">ERASE</span></div>
            <div className="pip-row pip-hint"><span className="pip-row-id">[L]</span><span className="pip-row-name">LABEL</span></div>
            <div className="pip-row pip-hint"><span className="pip-row-id">SP</span><span className="pip-row-name">PAN</span></div>
            <div className="pip-row pip-hint"><span className="pip-row-id">CZ</span><span className="pip-row-name">UNDO</span></div>
            <div className="pip-row pip-hint"><span className="pip-row-id">CY</span><span className="pip-row-name">REDO</span></div>
          </div>
          <div className="pip-col-detail pip-col-detail-text">
            <div className="pip-detail-name">ROBCO TERMLINK-30</div>
            <div className="pip-detail-rule">─────────────</div>
            <div className="pip-detail-paragraph">
              UNIFIED OPERATING SYSTEM v1.7. Карта-генератор для пустошного картографа.
              Все операции необратимы только при выходе. Используй [CZ] для отката.
            </div>
            <div className="pip-detail-rule">─────────────</div>
            <div className="pip-detail-line">GRID: {grid.cols} × {grid.rows}</div>
            <div className="pip-detail-line">BIOMES LOADED: {biomes.length}</div>
            <div className="pip-detail-line">TILES LOADED: {tiles.length}</div>
            <div className="pip-detail-line">ROAD TYPES: {roads.length}</div>
          </div>
        </div>
      )}

      <div className="pip-footer">
        <span>&gt; READY_</span>
        <span className="pip-cursor"> </span>
      </div>
    </div>
  );
}
