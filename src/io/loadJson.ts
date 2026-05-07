import type { SavedMap } from "./saveJson";
import type { Cell, RoadPath } from "../store/mapStore";
import type { BiomeId } from "../tiles/types";
import { axialToPixel } from "../hex/hex";

// v1 stored roads as { keys: string[] } of axial coords. Migrate to pixel points.
interface LegacyRoadV1 {
  id: string;
  typeId: string;
  keys: string[];
}

function migrateRoadsV1ToV2(legacy: LegacyRoadV1[], hexSize: number): RoadPath[] {
  return legacy.map((p) => ({
    id: p.id,
    typeId: p.typeId,
    points: p.keys.map((k) => {
      const [q, r] = k.split(",").map(Number);
      return axialToPixel(q, r, hexSize);
    }),
  }));
}

// v2 → v3: tiles split into biomes + features. Old `tileId` could refer to
// either depending on what kind of tile it was. Map each old id to either
// biomeId or a kept tileId. Dropped variations fall back to a sibling biome.
const V2_TO_V3_BIOME: Record<string, BiomeId> = {
  wasteland: "wasteland",
  sand: "sand",
  ash: "ash",
  "salt-flats": "sand",      // dropped → fallback
  "dust-storm": "ash",        // dropped → fallback
  forest: "forest",
  "pine-forest": "pine-forest",
  "birch-grove": "forest",    // dropped → fallback
  "burned-forest": "burned-forest",
  swamp: "swamp",
  water: "water",
  lake: "water",              // dropped → fallback
  "river-bend": "water",      // dropped → fallback
  coastline: "water",         // dropped → fallback
  toxic: "toxic",
  mountain: "mountain",
  peak: "peak",
  cliff: "cliff",
  "rocky-path": "mountain",   // dropped → fallback
  irradiated: "irradiated",
  anomaly: "anomaly",
  radstorm: "irradiated",     // dropped → fallback
};

const V2_KEPT_TILES = new Set([
  "settlement", "megacity", "trader-post", "diner", "factory", "slum",
  "ruins", "concrete", "raider", "tower", "gas",
  "mine", "cave-entrance", "quarry",
  "debris", "wreck", "minefield", "crater", "graveyard",
  "glowing-pool", "mutated-flora", "fungal-bloom",
  "vault", "vault-sealed", "vault-open", "bunker", "bos-outpost", "enclave-base",
]);

interface CellV2 { tileId?: string; label?: string }

function migrateCellsV2ToV3(cellsV2: Record<string, CellV2>): Record<string, Cell> {
  const out: Record<string, Cell> = {};
  for (const k in cellsV2) {
    const c = cellsV2[k];
    const next: Cell = {};
    if (c.label) next.label = c.label;
    if (c.tileId) {
      const asBiome = V2_TO_V3_BIOME[c.tileId];
      if (asBiome) {
        next.biomeId = asBiome;
      } else if (V2_KEPT_TILES.has(c.tileId)) {
        next.tileId = c.tileId;
      }
      // Unknown tileId: dropped silently.
    }
    if (next.biomeId || next.tileId || next.label) out[k] = next;
  }
  return out;
}

interface RawMap {
  version: number;
  setting: string;
  grid: SavedMap["grid"];
  cells: Record<string, CellV2>;
  roadPaths?: unknown;
}

export async function loadJsonFile(file: File): Promise<SavedMap> {
  const text = await file.text();
  const data = JSON.parse(text) as RawMap;
  if (data.version !== 1 && data.version !== 2 && data.version !== 3) {
    throw new Error(`Неподдерживаемая версия карты: ${data.version}`);
  }
  if (!data.grid || !data.cells) {
    throw new Error("Некорректный формат файла карты");
  }

  // v1 → v2 (roads only): tileId in cells stays the same shape.
  let roadPaths: RoadPath[];
  if (data.version === 1) {
    roadPaths = migrateRoadsV1ToV2((data.roadPaths ?? []) as LegacyRoadV1[], data.grid.hexSize);
  } else {
    roadPaths = (data.roadPaths ?? []) as RoadPath[];
  }

  // v1/v2 → v3: cells split into biomes + tiles.
  let cells: Record<string, Cell>;
  if (data.version === 3) {
    cells = data.cells as Record<string, Cell>;
  } else {
    cells = migrateCellsV2ToV3(data.cells);
  }

  return {
    version: 3,
    setting: data.setting,
    grid: data.grid,
    cells,
    roadPaths,
  };
}
