import { describe, it, expect } from "vitest";
import { parseMapJson } from "./loadJson";

const baseGrid = { cols: 10, rows: 10, hexSize: 40 };

describe("parseMapJson — happy path", () => {
  it("v3 проходит без миграций", () => {
    const map = parseMapJson({
      version: 3,
      setting: "fallout",
      grid: baseGrid,
      cells: { "0,0": { biomeId: "wasteland" } },
      roadPaths: [],
    });
    expect(map.version).toBe(3);
    expect(map.cells["0,0"]).toEqual({ biomeId: "wasteland" });
  });

  it("v2 → v3 миграция: tileId 'wasteland' → biomeId 'wasteland'", () => {
    const map = parseMapJson({
      version: 2,
      setting: "fallout",
      grid: baseGrid,
      cells: { "0,0": { tileId: "wasteland" } },
    });
    expect(map.cells["0,0"]).toEqual({ biomeId: "wasteland" });
  });

  it("v2 → v3: feature-тайл сохраняется как tileId", () => {
    const map = parseMapJson({
      version: 2,
      setting: "fallout",
      grid: baseGrid,
      cells: { "1,2": { tileId: "settlement", label: "Megaton" } },
    });
    expect(map.cells["1,2"]).toEqual({ tileId: "settlement", label: "Megaton" });
  });

  it("v1 дороги: axial keys → pixel points", () => {
    const map = parseMapJson({
      version: 1,
      setting: "fallout",
      grid: baseGrid,
      cells: {},
      roadPaths: [{ id: "r1", typeId: "highway", keys: ["0,0", "1,0"] }],
    });
    expect(map.roadPaths).toHaveLength(1);
    expect(map.roadPaths![0].points).toHaveLength(2);
    expect(map.roadPaths![0].points[0]).toEqual({ x: 0, y: 0 });
  });

  it("неизвестный v2-tileId молча отбрасывается", () => {
    const map = parseMapJson({
      version: 2,
      setting: "fallout",
      grid: baseGrid,
      cells: { "0,0": { tileId: "non-existent-tile" } },
    });
    expect(map.cells["0,0"]).toBeUndefined();
  });
});

describe("parseMapJson — ошибки", () => {
  it("неподдерживаемая версия", () => {
    expect(() => parseMapJson({
      version: 99,
      setting: "fallout",
      grid: baseGrid,
      cells: {},
    })).toThrow(/Некорректный формат/);
  });

  it("отсутствует grid", () => {
    expect(() => parseMapJson({
      version: 3,
      setting: "fallout",
      cells: {},
    })).toThrow(/Некорректный формат/);
  });

  it("отрицательный hexSize отвергается", () => {
    expect(() => parseMapJson({
      version: 3,
      setting: "fallout",
      grid: { cols: 10, rows: 10, hexSize: -1 },
      cells: {},
    })).toThrow(/Некорректный формат/);
  });

  it("полный мусор отвергается", () => {
    expect(() => parseMapJson({ foo: "bar" })).toThrow(/Некорректный формат/);
    expect(() => parseMapJson(null)).toThrow();
  });
});
