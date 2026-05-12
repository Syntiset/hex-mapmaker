# 00_current_state.md

## Назначение проекта
- Что делает: web-редактор гексагональных карт для GURPS, в стиле Hexographer/Worldographer.
- Для кого: ведущий GURPS-кампании (один пользователь, не программист).
- Текущая ветка / релиз: pre-MVP, разработка в `main`.

## Что уже реализовано
- Скаффолд Vite + React + TypeScript, зависимости установлены.
- Каркас памяти (`CLAUDE.md` + `docs/agent/`).
- **v1.3.0 QoL пакет:** hotkeys (B/T/R/E/L, 1-9, Space-pan, Ctrl+Z/Y), zoom-пресеты 1×/2×/4×/Fit (overlay), категории тайлов в палитре (7 групп + «Все»), hover preview popup, recent files (localStorage, ≤5), touch pinch-zoom (`touch-action: none`).
- Редактор v1.2.0: hex math, sceneFunc-рендер с viewport culling. **Биом ↔ Тайл архитектура**: биом — окружение/террейн (14 биомов с полной палитрой), тайл — feature/локация (35 тайлов с уникальными иконками для каждой группы, биом-агностичны). Cell хранит `biomeId` + `tileId`. UI: mode toggle «Биом / Тайл», палитра биомов и тайлов в 4 колонки в сайдбаре 360px. Рендер: чистые шестиугольные гексы с **soft blob blending** (radial gradient с alpha falloff в соседа) для мягких цветовых переходов. **Двойной sprite cache** (биомы и тайлы запечены в offscreen canvas) для производительности — на каждый кадр только drawImage'ы. Покраска/стирание (с разделением биом/тайл), undo/redo, инструмент дорог (snap-to-hex-feature и free-hand), удаление дорог по близости к линии, подписи поверх, save/load JSON (v3 с миграцией v1/v2), export PNG.

## Критические ограничения
- Все тайлы — процедурные плейсхолдеры (без художественных ассетов).
- Один сеттинг — Fallout. Структура расширяема, UI выбора сеттинга — позже.
- Производительность: проверено на ~50×50 после переписки на sceneFunc — лагов нет; для 200×200 не замерялось.

## Канонические входные точки
- Frontend: `src/main.tsx` → `src/App.tsx`.
- CLI / scripts: только npm scripts из `package.json`.

## Внешние зависимости
- React 19, Vite 8, TypeScript ~6, react-konva, konva, zustand, file-saver.
- **Mantine** (v8) — `@mantine/core`, `@mantine/hooks`, `@mantine/notifications`, `@mantine/modals`.
- **Playwright** (dev only) — для self-check скриншотов после изменений UI/CRT.

## Темы (4 шт.)
- `default` — тёмный военный (исходный).
- `night` — глубокий синий, низкий контраст.
- `fallout` — олива, L-скобы в углах, заклёпки, hazard-полоса на футере.
- `terminal` — RobCo CRT: металл-корпус + 4 круглых knob в углах сайдбара + WebGL пост-эффект (бочка `barrel=0.12`, хроматика, сканлайны, фосфорный glow, чёрный bezel вокруг кривого экрана). Boot-overlay «> ROBCO INDUSTRIES…» один раз за сессию. Янтарный POWER LED в футере.
- Архитектура расширяемая: `src/themes/registry.ts` + `ThemeDecorations` слоты (`ScreenOverlay`, `FooterRightExtras`, `BootSequence`). Новая тема = `ThemeDef` в массив + опциональный объект декораций.

## Текущие риски
- Производительность Konva на больших картах не замерялась.
- WebGL CRT-overlay копирует все Konva-Layer canvas'ы каждый RAF — на 200×200 может быть тяжеловато; не профилировал.
- Schema JSON — версия 3, есть миграция с v1/v2.

## Дата обновления
- 2026-05-12 (v1.7.0.0.1)
