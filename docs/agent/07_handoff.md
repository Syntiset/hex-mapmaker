# 07_handoff.md

## Что было сделано (последняя сессия, 2026-05-07 v1.3.0)

QoL-пакет из 6 пунктов из `08_ideas.md`, реализован одной серией:

1. **Hotkeys** в `src/App.tsx` — клавиши инструментов (B/T/R/E/L), Space-hold pan, цифры 1–9 для палитры. Ctrl+Z/Y уже были, оставлены.
2. **Zoom presets + Fit** — view-state поднят в App, overlay-кнопки в `canvas-host`. `ViewState` экспортируется из `HexGridCanvas`.
3. **Категории тайлов** — `FALLOUT_TILE_CATEGORIES` (7 групп) в `src/tiles/fallout.ts`, таб-бар в `TilePalette` со state `category`.
4. **Hover preview** — фиксированный popup 140px на курсоре, для биомов и тайлов.
5. **Recent files** — `src/io/recents.ts` (localStorage), dropdown в `TopBar`, до 5 записей.
6. **Touch pinch-zoom** — `pointersRef` + `pinchRef` в `HexGridCanvas`, `touch-action: none` на Stage.

## На чём остановились
- v1.3.0, билд зелёный (`npm run build`).
- В браузере вживую не тестировал — пользователь обещал прокатать сам.

## Что проверить следующим шагом
1. Все хоткеи живые: B/T/R/E/L, 1-9, Space-hold, Ctrl+Z/Y. Особенно проверить, что Space возвращает старый инструмент.
2. Zoom: 1×/2×/4× центрируют корректно, Fit вмещает полную карту.
3. Категории палитры: «Все» показывает 35 тайлов, каждая категория — нужное подмножество.
4. Hover preview не дёргается, не выходит за viewport.
5. Recent files: save → проявляется в дропдауне; reload страницы — список сохраняется (localStorage).
6. Touch (если есть тач-устройство): pinch-zoom работает, drag одним пальцем = paint, не скроллит страницу.

## Backlog (что осталось из `08_ideas.md`)
- Auto-save в localStorage (страховка от крэша)
- Brush size > 1
- Bucket fill
- Map metadata (title/author/description)
- Resize map
- Mini-map / координаты hex / layer toggles
- Multi-line labels, стили подписей
- Color-blind palette / High-contrast

## Полезные файлы
- `src/App.tsx` — глобальные хоткеи, view-state, fit-to-screen, zoom overlay
- `src/components/HexGridCanvas.tsx` — controlled view-state через пропы, pinch-zoom
- `src/components/TilePalette.tsx` — категории + hover preview
- `src/components/TopBar.tsx` — recent files dropdown
- `src/io/recents.ts` — localStorage helpers
- `src/tiles/fallout.ts` — `FALLOUT_TILE_CATEGORIES`
- `src/styles.css` — `.zoom-overlay`, `.palette-categories`, `.hover-preview`, `.recent-menu`
