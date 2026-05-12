# 07_handoff.md

## Что было сделано (последняя сессия, 2026-05-12, v1.7.0.0.3)

**Pip-Boy сайдбар для terminal темы.** Подробности — `04_changelog.md`.

Кратко:
- `ThemeDecorations` расширен слотами `SidebarShell` (обёртка) и
  `SidebarContent` (полная замена контента).
- Для terminal: полноэкранное CLI-меню (`TerminalSidebarContent`) с тэбами
  BIOMES/TILES/TOOLS/ROADS/INFO. Список слева, hex-preview справа.
- WebGL барель применяется к сайдбару через пайплайн: DOM → html2canvas-pro
  snapshot → offscreen canvas → `compositeRegistry` → CRTOverlay композит
  → шейдер.
- CRT-вкл/выкл анимация (вспышка + scaleX/Y) в offscreen drawImage.
- Клики реализованы через forward-barrel ремаппинг в `CRTOverlay.tsx`.
- Сайдбар стартует закрытым.
- Наклейка RobCo перенесена с сайдбара на корпус (правый нижний bezel).
- Старые CI workflow runs удалены.

## Что не сделано / отложено

- **Boot-typing анимация** для Pip-Boy меню (построчное раскрытие).
  Сейчас CRT-флэш показывает всё разом. На следующую итерацию.
- **Анимация открытия меню как у настоящего Pip-Boy** — можно усложнить
  (флэш + сканлайн расширяется + сигнал-шум). Сейчас простой scaleX/Y.
- **Mantine Popover/Dropdown** в terminal не используется, но если
  понадобится — Portal-рендеринг даст рассинхрон с барель-позицией.
- **Расширение до 50 тайлов + формальная биомная архитектура** (см. план
  в `03_active_plan.md`) — не начато.

## Что было сделано (предыдущая сессия, 2026-05-11, v1.7.0.0.0)

Большой апгрейд UI + новая система тем + WebGL пост-эффект.

### Theme registry (новая архитектура)
- `src/themes/types.ts` — интерфейсы `ThemeDecorations` (слоты) и `ThemeDef`.
- `src/themes/registry.ts` — массив `THEMES`, хук `useThemeDecorations()`.
- `src/themes/terminal.tsx` — 3 React-компонента-декорации для CRT темы.
- `AppTheme` тип расширен: добавлен `"terminal"`.
- `HelpModal` читает темы из реестра (4 карточки автоматически).

### Тема Fallout — декорации
- L-скобы в углах header/navbar/footer + заклёпки + hazard-полоса. Через multi-background, не трогая Mantine `position: fixed`.

### Тема Terminal — RobCo CRT
- Цвета: фосфор `#88ff60`, металл `#1c2418`, янтарь `#f8d840`.
- Корпус: эмбосс на header/navbar/footer, вертикальная вентиляция в хедере, 4 knob в углах сайдбара (SVG), 3 заклёпки между правыми knob.
- POWER LED в футере с пульсацией.
- Boot-последовательность «> ROBCO INDUSTRIES…» один раз за сессию.
- Канвас как CRT-экран через WebGL шейдер.

### WebGL CRT post-effect
- `src/render/CRTOverlay.tsx` — оверлей `<canvas>` поверх Konva. RAF копирует Konva-Layer canvas'ы на offscreen composite, грузит как WebGL текстуру, рисует фул-скрин квад с шейдером.
- Шейдер: barrel `0.12`, chromatic `0.003`, scanline `0.14`, glow на ярких пикселях, виньетка, blend полупрозрачных пикселей источника с `u_bg` чтобы Konva unifying-tint (sand alpha 0.10) не выходил как opaque.
- Inverse coord transform: monkey-patch `stage.getPointerPosition` применяет `barrelForward()` — клики попадают в визуально-кликнутый хекс.

### Багфиксы за цикл
- Скролл навбара через `AppShell.Section grow component={ScrollArea}`.
- Zoom-overlay: `position: fixed` в корне AppShell.
- Canvas-host позиционирование: `position: fixed` с явными `top/left/right/bottom` (Mantine.Main растянут на весь viewport, `inset:0` попадал в viewport).
- ResizeObserver на canvas-host — Konva ловит каждый кадр CSS-анимации сайдбара.
- StatusBar переписан: левые айтемы tool/hex/tile теперь видны.
- Burger в TopBar заменил невидимый ActionIcon.

## На чём остановились
- v1.7.0.0.0, билд зелёный.
- В браузере проверял через Playwright self-check скриншоты.
- WebGL CRT работает с inverse coord — кликам не врёт (вариант Б из обсуждения).

## Что проверить следующим шагом
1. Переключение тем default ↔ night ↔ fallout ↔ terminal — все 4 рендерятся без артефактов.
2. На terminal: hex clicks попадают в правильный хекс (особенно у углов где бочка максимальна).
3. На terminal: bend и черный bezel видны, но не съедают слишком много экрана.
4. Boot-overlay при первом заходе на terminal тему. После одного раза не повторяется (sessionStorage).
5. Resize окна / сворачивание сайдбара — WebGL канвас и хексы синхронно меняют размер.
6. Производительность на больших картах (100×100+) с включённой terminal темой — RAF compositing layers может быть тяжёлым.

## Backlog
- Расширить registry: больше слотов декораций (HeaderExtras, NavbarOverlay, MapBackdrop).
- Темы для конкретных сеттингов (medieval, cyberpunk) — каждая со своими SVG-декорациями.
- Реальная barrel distortion с инверсной формулой для координат (она уже есть, но проверить точность у самых углов).
- Auto-save, brush size, bucket fill, map metadata, resize map, mini-map, multi-line labels, high-contrast palette.

## Полезные файлы
- `src/themes/` — types, registry, terminal decorations.
- `src/render/CRTOverlay.tsx` — WebGL пост-эффект.
- `src/styles.css` — все темы как `[data-theme="..."]`-блоки.
- `src/App.tsx` — AppShell layout + слоты декораций.
- `src/components/StatusBar.tsx` — `rightExtras` prop для inject декораций.
- `scripts/screenshot*.mjs`, `scripts/debug-*.mjs` — Playwright self-check.
- `backup/pre-v1.7.0.0.0-*.tar.gz` — снапшот перед коммитом v1.7.0.0.0.
