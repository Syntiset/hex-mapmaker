# lucide / @lucide/icons

Context7: `/lucide-icons/lucide`

## Пакеты
- `lucide-react` — React-компоненты (DOM)
- `@lucide/icons` — фреймворк-независимые данные (нужно для canvas)

## SVG/path программно
```ts
import { buildLucideSvg, buildLucideDataUri } from '@lucide/icons/builders';
import { House } from '@lucide/icons';

const svgStr = buildLucideSvg(House, { size: 24, color: '#c0a060' });
const dataUri = buildLucideDataUri(House, { size: 48 });
// House.node — массив [tag, attrs] tuples; path.d доступен напрямую
```

## TS / tree-shaking
- Полная типизация (`LucideIconData`, `LucideIcon`)
- Per-icon импорт = одна иконка в бандле (~1-3 KB)

## Стиль
Stroke-иконки, минималистичные, stroke-width=2. Хороши для UI, **не** для постап-тайлов.

## Лицензия
ISC.

## Вердикт
Лучший выбор для UI-кнопок. Для тайлов — слишком «чистый», не атмосферный.
