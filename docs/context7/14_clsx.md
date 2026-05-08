# clsx

Context7 ID: `/lukeed/clsx`

```js
import { clsx } from 'clsx';
clsx('btn', isActive && 'btn-active');           // 'btn btn-active'
clsx({ 'tile-selected': isSelected });           // 'tile-selected'
clsx('base', { mod: true }, null, undefined);    // 'base mod'
```

## Характеристики
- 239 байт min
- Быстрее classnames
- TS из коробки
- `clsx/lite` — только строки, ещё меньше

## Ограничения
- Только className (не style)
