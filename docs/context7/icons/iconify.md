# @iconify (utils + icon packs)

Context7: `/iconify/iconify`

## Пакеты
- `@iconify/utils` — фреймворк-независимые утилиты (`iconToSVG`)
- `@iconify-icons/<prefix>/<name>` — иконка пофайлово (tree-shake)
- `@iconify/json` — весь набор 275k+ (~80 MB, для build-скриптов)

## SVG программно — критичный плюс
```ts
import { iconToSVG } from '@iconify/utils';
import bunker from '@iconify-icons/game-icons/bunker';

const { attributes, body } = iconToSVG(bunker, { height: 48 });
// body — строка SVG-внутренностей (без <svg> обёртки)
const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" ${
  Object.entries(attributes).map(([k,v]) => `${k}="${v}"`).join(' ')
}>${body}</svg>`;

const img = new Image();
img.src = 'data:image/svg+xml;base64,' + btoa(svgStr);
img.onload = () => offCtx.drawImage(img, x, y, 48, 48);
```

## game-icons.net через iconify (prefix `game-icons`)
~4000 тематических иконок: bunker, radioactive, ruins, mine-truck, watchtower, skull-crossed-bones, treasure-map, barbed-wire, shack — идеально под Fallout.

## TS / tree-shaking
- `IconifyIcon` тип; имена — строки (compile-time проверка только если импортишь сам файл)
- `@iconify-icons/<prefix>/<name>` — каждая иконка отдельный файл, минимальный бандл

## Лицензия
- `@iconify/*`: MIT
- game-icons.net: **CC BY 3.0** — нужна атрибуция (строчка в About / footer)

## Вердикт
**Топ-1 для тайлов карты.** Прямой доступ к `icon.body`, тематика 100% Fallout.
