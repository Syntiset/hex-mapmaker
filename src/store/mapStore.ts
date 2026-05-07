import { create } from "zustand";
import { FALLOUT_BIOMES, FALLOUT_BIOME_DEFAULT, FALLOUT_TILES, ROAD_TYPES } from "../tiles/fallout";
import type { BiomeDef, BiomeId, RoadType, TileDef } from "../tiles/types";

export type Tool = "paint" | "erase" | "label" | "road" | "road-erase" | "pan";

// Paint mode controls what the "paint" tool writes:
// - "biome": sets cell.biomeId from activeBiomeId
// - "tile" : sets cell.tileId  from activeTileId
export type PaintMode = "biome" | "tile";

export interface Cell {
  biomeId?: BiomeId;
  tileId?: string;
  label?: string;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface RoadPath {
  id: string;
  typeId: string;
  points: Point2D[]; // world-pixel coordinates of path nodes
}

export interface GridConfig {
  cols: number;
  rows: number;
  hexSize: number;
}

type Snapshot = { cells: Record<string, Cell>; roadPaths: RoadPath[] };

export interface MapState {
  grid: GridConfig;
  cells: Record<string, Cell>;
  roadPaths: RoadPath[];
  draftPoints: Point2D[] | null; // path being drawn right now (not yet committed)
  tool: Tool;
  paintMode: PaintMode;
  activeTileId: string;
  activeRoadId: string;
  activeBiomeId: BiomeId;
  setting: string;
  tiles: TileDef[];
  biomes: BiomeDef[];
  roads: RoadType[];
  showGrid: boolean;
  freeHandRoad: boolean;
  history: Snapshot[];
  future: Snapshot[];

  setTool: (t: Tool) => void;
  setPaintMode: (m: PaintMode) => void;
  setActiveTile: (id: string) => void;
  setActiveRoad: (id: string) => void;
  setActiveBiome: (id: BiomeId) => void;
  paint: (key: string) => void; // dispatches by paintMode
  erase: (key: string) => void; // erases by paintMode (biome or tile)
  beginRoadPath: (pt: Point2D) => void;
  continueRoadPath: (pt: Point2D) => void;
  commitRoadPath: () => void;
  eraseRoadNear: (pt: Point2D, radius: number) => void;
  setLabel: (key: string, text: string) => void;
  toggleGrid: () => void;
  toggleFreeHandRoad: () => void;
  undo: () => void;
  redo: () => void;
  newMap: (cols: number, rows: number) => void;
  loadMap: (data: { grid: GridConfig; cells: Record<string, Cell>; roadPaths?: RoadPath[] }) => void;
}

const HISTORY_LIMIT = 100;
let _pathIdCounter = 0;

function snap(s: { cells: Record<string, Cell>; roadPaths: RoadPath[] }): Snapshot {
  return { cells: { ...s.cells }, roadPaths: [...s.roadPaths] };
}

function pushHistory(s: MapState) {
  return { history: [...s.history, snap(s)].slice(-HISTORY_LIMIT), future: [] as Snapshot[] };
}

// Squared distance from point P to segment AB.
function distSqPointToSegment(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const ex = p.x - a.x, ey = p.y - a.y;
    return ex * ex + ey * ey;
  }
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + t * dx, cy = a.y + t * dy;
  const ex = p.x - cx, ey = p.y - cy;
  return ex * ex + ey * ey;
}

function pathHitsPoint(path: RoadPath, pt: Point2D, radius: number): boolean {
  const r2 = radius * radius;
  if (path.points.length === 1) {
    const ex = path.points[0].x - pt.x, ey = path.points[0].y - pt.y;
    return ex * ex + ey * ey <= r2;
  }
  for (let i = 0; i < path.points.length - 1; i++) {
    if (distSqPointToSegment(pt, path.points[i], path.points[i + 1]) <= r2) return true;
  }
  return false;
}

export const useMapStore = create<MapState>((set, get) => ({
  grid: { cols: 30, rows: 30, hexSize: 36 },
  cells: {},
  roadPaths: [],
  draftPoints: null,
  tool: "paint",
  paintMode: "biome",
  activeTileId: FALLOUT_TILES[0].id,
  activeRoadId: ROAD_TYPES[0].id,
  activeBiomeId: FALLOUT_BIOME_DEFAULT.id,
  setting: "fallout",
  tiles: FALLOUT_TILES,
  biomes: FALLOUT_BIOMES,
  roads: ROAD_TYPES,
  showGrid: true,
  freeHandRoad: false,
  history: [],
  future: [],

  setTool: (t) => set({ tool: t }),
  setPaintMode: (m) => set({ paintMode: m }),
  setActiveTile: (id) => set({ activeTileId: id }),
  setActiveRoad: (id) => set({ activeRoadId: id }),
  setActiveBiome: (id) => set({ activeBiomeId: id }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleFreeHandRoad: () => set((s) => ({ freeHandRoad: !s.freeHandRoad })),

  paint: (key) => {
    const s = get();
    const cur = s.cells[key];
    if (s.paintMode === "biome") {
      if (cur?.biomeId === s.activeBiomeId) return;
      set({
        ...pushHistory(s),
        cells: { ...s.cells, [key]: { ...cur, biomeId: s.activeBiomeId } },
      });
    } else {
      if (cur?.tileId === s.activeTileId) return;
      set({
        ...pushHistory(s),
        cells: { ...s.cells, [key]: { ...cur, tileId: s.activeTileId } },
      });
    }
  },

  erase: (key) => {
    const s = get();
    const cur = s.cells[key];
    if (!cur) return;
    const cells = { ...s.cells };
    if (s.paintMode === "biome") {
      if (!cur.biomeId) return;
      const next: Cell = { ...cur };
      delete next.biomeId;
      if (!next.tileId && !next.label) delete cells[key];
      else cells[key] = next;
    } else {
      if (!cur.tileId) return;
      const next: Cell = { ...cur };
      delete next.tileId;
      if (!next.biomeId && !next.label) delete cells[key];
      else cells[key] = next;
    }
    set({ ...pushHistory(s), cells });
  },

  beginRoadPath: (pt) => {
    set({ draftPoints: [pt] });
  },

  continueRoadPath: (pt) => {
    const s = get();
    if (!s.draftPoints) return;
    const last = s.draftPoints[s.draftPoints.length - 1];
    if (last.x === pt.x && last.y === pt.y) return;
    set({ draftPoints: [...s.draftPoints, pt] });
  },

  commitRoadPath: () => {
    const s = get();
    if (!s.draftPoints || s.draftPoints.length === 0) return;
    const newPath: RoadPath = {
      id: String(++_pathIdCounter),
      typeId: s.activeRoadId,
      points: s.draftPoints,
    };
    set({
      ...pushHistory(s),
      roadPaths: [...s.roadPaths, newPath],
      draftPoints: null,
    });
  },

  eraseRoadNear: (pt, radius) => {
    const s = get();
    const filtered = s.roadPaths.filter((p) => !pathHitsPoint(p, pt, radius));
    if (filtered.length === s.roadPaths.length) return;
    set({ ...pushHistory(s), roadPaths: filtered });
  },

  setLabel: (key, text) => {
    const s = get();
    const cur = s.cells[key] ?? {};
    if ((cur.label ?? "") === text) return;
    const cells = { ...s.cells };
    const next: Cell = { ...cur };
    if (text) next.label = text;
    else delete next.label;
    if (!next.tileId && !next.label) delete cells[key];
    else cells[key] = next;
    set({ ...pushHistory(s), cells });
  },

  undo: () => {
    const s = get();
    if (s.history.length === 0) return;
    const prev = s.history[s.history.length - 1];
    set({
      cells: prev.cells,
      roadPaths: prev.roadPaths,
      history: s.history.slice(0, -1),
      future: [...s.future, snap(s)],
    });
  },

  redo: () => {
    const s = get();
    if (s.future.length === 0) return;
    const next = s.future[s.future.length - 1];
    set({
      cells: next.cells,
      roadPaths: next.roadPaths,
      history: [...s.history, snap(s)],
      future: s.future.slice(0, -1),
    });
  },

  newMap: (cols, rows) => {
    const s = get();
    set({ grid: { ...s.grid, cols, rows }, cells: {}, roadPaths: [], draftPoints: null, history: [], future: [] });
  },

  loadMap: (data) =>
    set({ grid: data.grid, cells: data.cells, roadPaths: data.roadPaths ?? [], draftPoints: null, history: [], future: [] }),
}));
