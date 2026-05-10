# Тема 3 — система тем с декорациями

## Контекст
Тема ≠ только цвета. Декорации:
- Fallout: ржавые металлические уголки, потёртая текстура, monochrome green-CRT
- Medieval: венки роз по краям сайдбара, орнаментальные рамки
- Cyberpunk: неоновые бордеры, scanlines, glitch

## Вариант A — CSS custom properties + SVG backgrounds
```css
:root { --accent: #4caf50; --sidebar-corner: url('/themes/fallout/corner.svg'); }
[data-theme="medieval"] { --accent: #8b4513; --sidebar-corner: url('/themes/medieval/rose-corner.svg'); }
```
```css
.sidebar::before {
  content: ''; background-image: var(--sidebar-corner);
  position: absolute; top: 0; left: 0; width: 80px; height: 80px;
}
```
Переключение: `document.documentElement.dataset.theme = 'medieval'`

**Плюсы:** ноль зависимостей, мгновенно, без React re-render, новая тема = CSS-блок + SVG-файлы.
**Минусы:** только CSS-декорации (нет JS-логики, сложные анимации только через CSS keyframes).

## Вариант B — React Context + theme objects
```ts
type Theme = {
  colors: { accent: string; bg: string };
  decorations: {
    sidebarCorner: React.ReactNode;
    scanlines: boolean;
  };
};
```
**Плюсы:** декорации = полноценные React-компоненты с логикой/анимациями.
**Минусы:** сложнее, React re-render при смене темы, для CSS vars всё равно нужен `setProperty`.

## Вариант C — CSS-in-JS (styled-components / emotion)
**Минусы:** runtime overhead, проблемы с React 19 Concurrent Mode, +15-25 KB gzip, декорации всё равно через CSS.
**Вердикт:** не рекомендуется.

## Вариант D — Tailwind theme + plugin
Имеет смысл только если уже взяли shadcn/ui. Не добавляет ничего сверх Варианта A.

## Вариант E — Готовые коллекции декоративных SVG
- **SVGRepo** (svgrepo.com) — 500K+ бесплатных SVG, фильтр "frame/border/ornament", лицензии CC0/MIT/CC-BY. Хорошо для роз, ржавых уголков, неоновых рамок.
- **The Noun Project** — иконки, не декоративные рамки.
- Специализированных npm-пакетов для UI-орнаментов **не существует** в зрелом виде.

**Workflow:**
1. Скачать SVG с SVGRepo (CC0).
2. Адаптировать через `currentColor` или fill=.
3. Положить в `public/themes/<setting>/corner.svg`.
4. Подключить через CSS variable.

## Итоговая рекомендация — Гибрид A + B

**База — Вариант A:**
- Цвета/шрифты/отступы — CSS variables + `data-theme`.
- Простые декорации (уголки, текстуры) — CSS background-image.

**Расширение — Вариант B только для анимаций:**
- Glitch/scanlines/fog — React-компонент в теме.

```ts
type AppTheme = {
  id: 'fallout' | 'medieval' | 'cyberpunk';
  decorations?: { SidebarCorner?: React.FC };
};
```

**Сложность новой темы:** очень низкая (CSS-блок + SVG). Если нужна анимация — один React-компонент.

**SVG-источник:** SVGRepo (CC0 = без атрибуции). Проверять лицензию каждого файла.
