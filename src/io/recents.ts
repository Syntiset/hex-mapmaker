import type { SavedMap } from "./saveJson";

const KEY = "mapmaker.recents.v1";
const LIMIT = 5;

export interface RecentEntry {
  name: string;
  savedAt: number; // ms epoch
  data: SavedMap;
}

function read(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as RecentEntry[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(list: RecentEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // localStorage may be full — drop oldest and retry.
    if (list.length > 1) write(list.slice(0, list.length - 1));
  }
}

export function listRecents(): RecentEntry[] {
  return read();
}

export function pushRecent(name: string, data: SavedMap) {
  const cleanName = name.replace(/\.json$/i, "");
  const cur = read().filter((e) => e.name !== cleanName);
  const next = [{ name: cleanName, savedAt: Date.now(), data }, ...cur].slice(0, LIMIT);
  write(next);
}

export function clearRecents() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
