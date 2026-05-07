# 05_module_map.md

## Корневые входные точки
- `index.html` → `src/main.tsx` → `src/App.tsx`.

## Карта модулей

### `src/hex/`
- `hex.ts` — axial-математика (pointy-top), `axialToPixel`, `pixelToAxial`, `hexCorners`, `edgeMidpoint`, `neighbors`, `rectMap`.

### `src/tiles/`
- `types.ts` — `BiomeId` (14), `BiomeDef`, `TileDef`, `IconKind` (40+ уникальных), `DecorationDef`, `GlowDef`, `RoadType`.
- `fallout.ts` — `FALLOUT_BIOMES` (14), `FALLOUT_TILES` (35), `ROAD_TYPES`.

### `src/store/`
- `mapStore.ts` — zustand-store, undo/redo, действия.

### `src/io/`
- `saveJson.ts` — сериализация и скачивание JSON.
- `loadJson.ts` — парсинг JSON-файла.
- `exportPng.ts` — экспорт текущего Stage в PNG.

### `src/render/`
- `noise.ts` — `valueNoise2D`, `fbm2`, `noiseVec` (2D vector field), `hash2`/`hash3`, `rand`. Детерминированный шум в мировых координатах.
- `displaced.ts` — wavy hex polygon: `displacedHexPolygonForCell`, `getDisplacedPoly` (LRU-кэш 5000), `pathDisplacedHex`, `withDisplacedHexClip`, `clearDisplacedCache`.
- `biomeSprite.ts` — per-cell sprite cache: `getBiomeSprite()` запекает displaced texture+glow+lighting в offscreen canvas; `clearBiomeSpriteCache()` инвалидация. LRU 5000.
- `drawHex.ts` — нативные canvas-функции:
  - Базовые: `pathHex`, `drawHexFill` (legacy, для совместимости), `drawHexStroke`.
  - Rich: `drawHexFillRich` (multi-stipple + decoration + glow + vignette + highlight), `drawDecoration` (pebbles/cracks/specks/tufts/ripples).
  - Иконки: `drawIcon` (24 типа), `drawIconEnhanced` (shadow + highlight wrap).
  - Дороги: `drawRoadPaths` (Chaikin smoothing).

### `src/components/`
- `App-level`: `TopBar.tsx`, `Toolbar.tsx`, `TilePalette.tsx`, `StatusBar.tsx`.
- `Canvas`: `HexGridCanvas.tsx` — Stage с двумя Layer (sceneFunc-Shape для тайлов/иконок/дорог/сетки + Layer для подписей), pan/zoom, hit-test, viewport culling.

### Корень `src/`
- `main.tsx`, `App.tsx`, `styles.css`.

## Где искать
- Тип карты в JSON: `src/io/saveJson.ts` (`SavedMap`, version 3).
- Миграция со старых версий: `src/io/loadJson.ts` (V2_TO_V3_BIOME, V2_KEPT_TILES).
- Биомы и тайлы (палитра): `src/tiles/fallout.ts` — `FALLOUT_BIOMES` (террейны) + `FALLOUT_TILES` (features).
- Биом ↔ Тайл логика покраски: `src/store/mapStore.ts` (`paintMode`, `activeBiomeId`, `paint`/`erase` dispatch).
- Hotkeys / undo: `src/App.tsx` (глобальные обработчики).
- Дороги (модель/snap/free-hand): `src/store/mapStore.ts` (`RoadPath`, `draftPoints`, `freeHandRoad`) + `src/components/HexGridCanvas.tsx` (`snapToHexFeature`).
