# UI Redesign — итоги

Дата: 2026-05-08

## Сводка по темам

| Тема | Топ-1 рекомендация |
|---|---|
| Рендер тайлов | Canvas2D procedural (gradient depth + cel outline + noise overlay), без новых deps |
| UI компоненты | **Mantine** — 100+ готовых компонентов, runtime темизация, нет Tailwind |
| Темы с декорациями | CSS custom properties + `data-theme` + SVG из SVGRepo (CC0) |

---

## Тема 1 — рендер тайлов
[`01_tile-rendering.md`](./01_tile-rendering.md)

**Решение:** улучшать handcrafted рендер техниками которые уже работают на биомах.
1. **Все тайлы:** radial gradient depth + cel-shading outline + noise overlay через composite
2. **Сложные (vault/bunker/factory):** SVG template strings → ImageBitmap (масштабируется без блюра)
3. **Точечно:** Konva.Filters.Emboss для выраженного рельефа

**PixiJS — отложить.** Замена react-konva не оправдана на этом этапе.

---

## Тема 2 — UI компоненты
[`02_ui-system.md`](./02_ui-system.md)

**Решение:** Mantine.

Причины:
- 100+ компонентов (AppShell, Sidebar, Tooltip, Select, Modal) — не писать с нуля
- Нет Tailwind — нет порога входа
- `useMantineColorScheme()` для runtime смены темы
- CSS variables `--mantine-color-*` легко переопределяются под сеттинг
- Активная разработка, React 19 поддержка

**Альтернатива:** shadcn/ui если готов учить Tailwind ради полного контроля над кодом.

---

## Тема 3 — система тем
[`03_themes-decorations.md`](./03_themes-decorations.md)

**Решение:** Гибрид CSS custom properties + React Context (опционально).

База:
```css
[data-theme="medieval"] { --accent: ...; --sidebar-corner: url('/themes/medieval/corner.svg'); }
```
```js
document.documentElement.dataset.theme = 'medieval';
```

Расширение через React Context — только для анимированных декораций (glitch, scanlines).

**Источник SVG:** SVGRepo (CC0 — без атрибуции).

---

## Связанные решения

| Выбор | Следствие |
|---|---|
| Mantine | Темизация через `MantineProvider` + разный `createTheme`. Параллельно `data-theme` для своих SVG-декораций. |
| Mantine | Не смешивать с shadcn/ui (разные стилистики Tailwind/CSS). |
| `data-theme` | Не конфликтует с `data-mantine-color-scheme` (разные атрибуты). |
| Canvas2D detailing | Sprite cache не меняется. Noise через существующий simplex. |

---

## Риски

- **Mantine + текущий CSS:** Mantine ставит свои глобальные сбросы → проверить что dark theme не сломается при `import '@mantine/core/styles.css'`.
- **Мульти-темы Mantine:** разный `createTheme` на сеттинг — нужно динамически передавать в `MantineProvider`.
- **SVG лицензии:** проверять каждый файл с SVGRepo (CC0 vs CC-BY vs MIT).
- **SVG + CSS currentColor:** SVG через `background-image` не наследует `currentColor`. Для темизируемых декораций — либо inline (React), либо hardcoded fill в SVG, либо CSS filter для перекраски.
- **Konva.Filters CPU:** не применять ко всем тайлам сразу. Только точечно.

---

## Порядок внедрения (если решим делать)

1. **Темизация база** (CSS vars + `data-theme`) — быстро, без deps. Превратит текущий стиль в "тему Fallout".
2. **Mantine** — постепенно. Начать с одного компонента (например Select для палитры), не переписывать всё сразу.
3. **Тайл-рендер** — параллельно с UI, в drawHex.ts. Не зависит от UI-стека.
4. **Декорации первой темы** — после того как базовая темизация работает.
