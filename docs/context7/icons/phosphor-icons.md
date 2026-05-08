# Phosphor Icons

Context7: `/phosphor-icons/react`

## Пакет
- `@phosphor-icons/react` — React-компоненты, 6 весов: thin/light/regular/bold/fill/duotone

## SVG программно — неудобно
Прямого SVG API нет. Path-данные внутри JSX. Чтобы получить строку:
```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { HouseIcon } from '@phosphor-icons/react/dist/ssr/House';

const svgStr = renderToStaticMarkup(<HouseIcon size={48} weight="bold" />);
```
Требует React SSR ради простой строки.

## TS / tree-shaking
- Полная типизация
- Per-icon импорт обязателен (`@phosphor-icons/react/dist/csr/House`), иначе 9000+ экспортов тормозят dev-сборку

## Стиль
Bold/fill — атмосфернее Lucide. Есть `Radioactive`, `Buildings`, `Vault`, `Skull`. Variant `duotone` — необычный двухтоновый.

## Лицензия
MIT.

## Вердикт
Для UI с вариативностью весов — норм. Для canvas-рендера — geremmy через `renderToStaticMarkup`. Тематика беднее game-icons.
