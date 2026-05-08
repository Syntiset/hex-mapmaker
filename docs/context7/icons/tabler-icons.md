# Tabler Icons

Context7: `/tabler/tabler-icons`

## Пакеты
- `@tabler/icons` — raw SVG-файлы + JSON-дерево
- `@tabler/icons-react` — React-компоненты

## SVG программно (Vite `?raw`)
```ts
import bunkerSvg from '@tabler/icons/icons/outline/building-castle.svg?raw';

const sized = bunkerSvg.replace(/width="24"/, 'width="48"').replace(/height="24"/, 'height="48"');
const img = new Image();
img.src = 'data:image/svg+xml,' + encodeURIComponent(sized);
```

## TS / tree-shaking
- Полная типизация в react-варианте
- Tree-shaking работает, ~1-2 KB на иконку

## Стиль
Outline 24×24, stroke-width=2. Технический/UI-стиль. Постап-тематики мало (`barrier-block`, `radioactive`, `mine`), но клин и аккуратный.

## Лицензия
MIT.

## Вердикт
Хорошая альтернатива Lucide для UI. Для Fallout-тайлов — тематически беднее game-icons.
