# game-icons.net

Самостоятельного популярного npm-пакета нет. Доступ через:
1. **Iconify** (рекомендуется) — `@iconify-icons/game-icons/<name>` или prefix `game-icons` в `@iconify/json`
2. **Прямой fetch** — `https://game-icons.net/icons/<category>/<name>.svg`
3. **CDN sprite** — один большой SVG-спрайт + `<use>`

## Через Iconify
```ts
import { iconToSVG } from '@iconify/utils';
import bunker from '@iconify-icons/game-icons/bunker';

const { attributes, body } = iconToSVG(bunker, { height: 48 });
// сборка SVG-строки → Image → drawImage
```

## Стиль
Монохромные **fill**-иконки 512×512. Темы: фэнтези, постап, выживание, военное. Релевантные:
`bunker`, `radioactive`, `wasteland`, `ruins`, `skull-crossed-bones`, `mine-truck`, `radiation-symbol`, `shack`, `watchtower`, `crossroads`, `treasure-map`, `barbed-wire`, `dungeon-gate`, `desert-skull`, `crawl-tunnel`, `oil-pump`.

**Идеальное совпадение с Fallout-эстетикой.**

## Лицензия
**CC BY 3.0** — атрибуция обязательна. Коммерческое использование разрешено.

## Вердикт
Лучший источник тематических иконок для карты. Доставка — через Iconify.
