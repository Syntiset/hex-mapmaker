# react-icons

Context7: `/react-icons/react-icons`

## Пакет
- `react-icons` — агрегатор 30+ наборов (FontAwesome, Material, Bootstrap, Heroicons, Tabler, Lucide, Phosphor, Ant, Remix...) — итого 44 000+ иконок
- `@react-icons/all-files` — version с per-file импортом

## SVG программно — неудобно
Внутренняя `IconTree` не публичный API. Чтобы получить SVG:
```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { FaRadiation } from 'react-icons/fa';
const svg = renderToStaticMarkup(<FaRadiation size={48} />);
```

## TS / tree-shaking
- Subpath импорт `react-icons/fa` — tree-shake работает (~1-3 KB / иконка)
- Импорт всего набора (`import * from 'react-icons/fa'`) — 500 KB+

## Стиль
Зависит от набора. FontAwesome solid — fill, тяжёлые, постап-совместимые.

## Лицензия
MIT (пакет). Лицензии иконок — разные (FA: CC BY 4.0, и т.п.).

## Вердикт
Удобно для UI (один пакет — много стилей). Для canvas — awkward через SSR. Тематически game-icons всё ещё лучше для тайлов.
