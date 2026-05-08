# Иконки для Konva canvas — Hex Map Maker

Дата: 2026-05-08

## Сводная таблица

| Библиотека | SVG/path программно | TS | Tree-shake | Стиль для Fallout | Лицензия |
|---|---|---|---|---|---|
| **iconify + game-icons** | ✅ `icon.body` напрямую | частично | ✅ per-file | **идеально** | MIT + CC BY 3.0 |
| **lucide** (`@lucide/icons`) | ✅ `buildLucideSvg` / `.node[]` | ✅ | ✅ | UI-only, чистый | ISC |
| **tabler-icons** | ✅ Vite `?raw` SVG import | ✅ | ✅ | средне (технический) | MIT |
| **phosphor-icons/react** | ⚠ только через `renderToStaticMarkup` | ✅ | ✅ (per-file) | средне (fill/bold) | MIT |
| **react-icons** | ⚠ только через `renderToStaticMarkup` | частично | ✅ (subpath) | зависит от набора | MIT + varies |
| **game-icons** standalone | через iconify или CDN fetch | нет | через iconify | **идеально** | CC BY 3.0 |

---

## Топ-1: @iconify + @iconify-icons/game-icons

**Почему именно она:**

1. **Прямой SVG API.** `icon.body` — строка SVG-внутренностей, доступна без React/DOM/SSR. Для нашего offscreen-canvas-рендера это критично.
2. **Тематика.** game-icons.net — 4000 постап/фэнтези иконок: `bunker`, `radioactive`, `ruins`, `mine-truck`, `watchtower`, `skull-crossed-bones`, `barbed-wire`, `crossroads`, `oil-pump`, `dungeon-gate`. Идеально под Fallout.
3. **Bundle.** `@iconify-icons/game-icons/<name>` — по одному файлу, tree-shake полный. Берём только то, что нужно.
4. **Не ломает архитектуру.** Иконки превращаются в `HTMLImageElement` и кэшируются в существующем sprite cache (`biomeSprite.ts`). Никаких изменений pipeline.

**Минус:** game-icons.net — **CC BY 3.0**, нужна атрибуция (строчка «Icons: game-icons.net» в About / footer / Help).

---

## Комбинированный подход (рекомендую)

| Где | Чем |
|---|---|
| **Тайлы карты** (бункер, vault, поселение, мутафлора...) | `@iconify-icons/game-icons/*` |
| **UI-элементы** (кнопки топбара, тулбар, сайдбар) | `lucide-react` (DOM-компоненты) |

Разделение даёт постапную атмосферу карте + чистый UI вокруг, без смешения стилей в одном слое.

---

## Пример интеграции в Konva sprite cache

```ts
// src/render/iconLoader.ts
import { iconToSVG } from '@iconify/utils';
import bunker from '@iconify-icons/game-icons/bunker';
import radioactive from '@iconify-icons/game-icons/radioactive';
import ruins from '@iconify-icons/game-icons/ruins';

const ICONS = { bunker, radioactive, ruins } as const;
type IconKey = keyof typeof ICONS;

const cache = new Map<string, HTMLImageElement>();

export function getIconImage(key: IconKey, size: number, color: string): HTMLImageElement | null {
  const cacheKey = `${key}|${size}|${color}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const { attributes, body } = iconToSVG(ICONS[key], { height: size });
  const colored = body.replace(/currentColor/g, color);
  const attrStr = Object.entries(attributes).map(([k, v]) => `${k}="${v}"`).join(' ');
  const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" ${attrStr}>${colored}</svg>`;

  const img = new Image();
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
  // sync-API — возвращаем сразу, при первом рендере img ещё не загружен
  // но Konva вызывает batchDraw на onload, или мы предзагружаем при init
  cache.set(cacheKey, img);
  return img;
}

// Использование:
// const img = getIconImage('bunker', 48, '#8B7355');
// if (img.complete) ctx.drawImage(img, cx-24, cy-24, 48, 48);
```

При интеграции в `tileSprite.ts`:
- Иконки предзагружаются при старте (Promise.all → resolve когда все `img.onload` отстреляли).
- Sprite cache работает как сейчас, только вместо 30 ручных рисующих функций — один путь через `getIconImage`.

---

## Альтернатива без runtime-зависимости (если боимся CC BY)

Tabler Icons через Vite `?raw`:
```ts
import bunkerSvg from '@tabler/icons/icons/outline/building-castle.svg?raw';
```
Минусы: Tabler — outline технический стиль, тематически беднее. Зато MIT, никакой атрибуции.

---

## Установка для топ-1

```bash
npm install @iconify/utils @iconify-icons/game-icons
```

`@iconify-icons/game-icons` — пустой shell, нужно ставить отдельные иконки по требованию:
```bash
npm install @iconify-icons/game-icons/bunker
```
Либо разово установить весь набор `@iconify-json/game-icons` и брать через `getIcon('game-icons:bunker')`.

---

## Рекомендация

**Брать iconify + game-icons.** Заменит ~30 ручных функций рисования на единый pipeline с предсказуемым стилем. Атрибуция CC BY — копеечная цена за 4000 готовых тематических иконок.
