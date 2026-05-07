# 01_architecture.md

## Общая схема
SPA на Vite + React. Канвас — Konva через `react-konva`. Стейт карты — zustand-store. Сохранение/загрузка — JSON-файлы через `file-saver`/`<input type=file>`. Экспорт — `stage.toDataURL()` → PNG.

## Подсистемы

### `src/hex/`
- Ответственность: математика гексов (axial ↔ pixel, соседи, hit-test, генерация набора координат прямоугольной карты).
- Стиль гекса: **pointy-top**, axial `(q, r)`. Источник — Red Blob Games.
- Не содержит React/Konva — чистые функции.

### `src/tiles/`
- `types.ts` — типы `TileDef` и `TerrainId`.
- `<setting>.ts` (например `fallout.ts`) — массив `TileDef` для сеттинга. Описывает id, имя, цвет заливки/обводки, иконку (декоративные фигуры).
- Точка расширения для новых сеттингов.

### `src/store/mapStore.ts`
- zustand-store. Хранит `grid` (cols/rows/hexSize), `cells: Record<"q,r", Cell>` (только закрашенные/подписанные), `tool`, `activeTile`, `setting`, undo/redo стек снапшотов.
- Действия: `paint`, `erase`, `setLabel`, `setTool`, `setActiveTile`, `undo`, `redo`, `loadMap`, `newMap`.

### `src/components/`
- `TopBar` — New/Open/Save/Export/Undo/Redo, отображает имя файла.
- `Toolbar` — выбор инструмента (paint/erase/label/pan).
- `TilePalette` — превью тайлов активного сеттинга, выбор активного.
- `HexGridCanvas` — Konva Stage с pan/zoom, рендер сетки и контента, обработка кликов/драга.
- `StatusBar` — координаты гекса под курсором.

### `src/io/`
- `saveJson.ts` / `loadJson.ts` — сериализация состояния карты.
- `exportPng.ts` — экспорт текущего Stage в PNG.

## Главный поток данных
1. Пользователь кликает по канвасу → `HexGridCanvas` через hit-test получает `(q, r)`.
2. В зависимости от `tool` вызывается action в `mapStore` (`paint`, `erase`, `setLabel`).
3. Store пушит снапшот в undo-стек и обновляет `cells`.
4. React-Konva перерисовывает только изменённые `<HexCell>` (memo по `(q, r)`).

## Архитектурные инварианты
- Координаты гексов всегда axial `(q, r)`. Pixel-координаты — только в момент рендера/hit-test.
- Все мутации `cells` — через zustand-actions, никогда напрямую.
- JSON-схема имеет поле `version`. Любое breaking-изменение → миграция в `loadJson`.
- Компоненты не импортируют конкретный сеттинг — только активный через store.

## Что сюда не входит
- Конкретные значения цветов (это в `src/tiles/fallout.ts`).
- Конкретные команды npm (см. `02_commands_and_env.md`).
