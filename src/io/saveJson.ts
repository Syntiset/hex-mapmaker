import { saveAs } from "file-saver";
import type { Cell, GridConfig, RoadPath } from "../store/mapStore";

export interface SavedMap {
  version: 3;
  setting: string;
  grid: GridConfig;
  cells: Record<string, Cell>;
  roadPaths?: RoadPath[];
}

export function saveJson(map: Omit<SavedMap, "version">, filename = "map.json") {
  const out: SavedMap = { ...map, version: 3 };
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
  saveAs(blob, filename);
}
