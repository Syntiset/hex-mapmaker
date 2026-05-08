import { describe, it, expect } from "vitest";
import {
  axialKey,
  axialToPixel,
  axialRound,
  coordInBounds,
  hexCorners,
  hexHeight,
  hexWidth,
  neighborKey,
  parseKey,
  pixelToAxial,
  rectMap,
  SQRT3,
} from "./hex";

describe("axialKey / parseKey", () => {
  it("симметричны", () => {
    expect(parseKey(axialKey(3, -2))).toEqual({ q: 3, r: -2 });
    expect(parseKey(axialKey(0, 0))).toEqual({ q: 0, r: 0 });
  });
});

describe("axialToPixel / pixelToAxial", () => {
  it("центр (0,0) → (0,0)", () => {
    expect(axialToPixel(0, 0, 40)).toEqual({ x: 0, y: 0 });
  });

  it("обратное преобразование возвращает исходные axial-координаты", () => {
    for (const [q, r] of [[0, 0], [1, 0], [0, 1], [-3, 2], [5, -4]]) {
      const p = axialToPixel(q, r, 40);
      const back = pixelToAxial(p.x, p.y, 40);
      expect(Object.is(back.q, -0) ? 0 : back.q).toBe(q);
      expect(Object.is(back.r, -0) ? 0 : back.r).toBe(r);
    }
  });
});

describe("axialRound", () => {
  it("целочисленные значения не меняет", () => {
    expect(axialRound(2, -1)).toEqual({ q: 2, r: -1 });
  });
  it("округляет к ближайшему гексу", () => {
    expect(axialRound(0.1, 0.1)).toEqual({ q: 0, r: 0 });
  });
});

describe("neighborKey", () => {
  it("шесть направлений возвращают разные ключи", () => {
    const set = new Set<string>();
    for (let s = 0; s < 6; s++) set.add(neighborKey(0, 0, s));
    expect(set.size).toBe(6);
  });
  it("E (0) сосед (0,0) = (1,0)", () => {
    expect(neighborKey(0, 0, 0)).toBe("1,0");
  });
});

describe("hexCorners", () => {
  it("возвращает 6 точек", () => {
    expect(hexCorners(0, 0, 40)).toHaveLength(6);
  });
  it("все углы лежат на радиусе size от центра", () => {
    for (const p of hexCorners(0, 0, 40)) {
      const r = Math.sqrt(p.x * p.x + p.y * p.y);
      expect(r).toBeCloseTo(40, 5);
    }
  });
});

describe("rectMap / coordInBounds", () => {
  it("rectMap(3,2) даёт 6 ячеек", () => {
    expect(rectMap(3, 2)).toHaveLength(6);
  });
  it("каждая координата из rectMap проходит coordInBounds", () => {
    const map = rectMap(5, 4);
    for (const { q, r } of map) {
      expect(coordInBounds(q, r, 5, 4)).toBe(true);
    }
  });
  it("за пределами — false", () => {
    expect(coordInBounds(0, -1, 5, 4)).toBe(false);
    expect(coordInBounds(5, 0, 5, 4)).toBe(false);
  });
});

describe("hexWidth / hexHeight", () => {
  it("pointy-top: width = SQRT3*size, height = 2*size", () => {
    expect(hexWidth(40)).toBeCloseTo(SQRT3 * 40, 5);
    expect(hexHeight(40)).toBe(80);
  });
});
