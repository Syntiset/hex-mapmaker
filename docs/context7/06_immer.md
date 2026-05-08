# Immer

Context7 ID: `/websites/immerjs_github_io_immer`

## produce
```js
import { produce } from 'immer';
const next = produce(state, draft => {
  draft[1].done = true;
  draft.push({ title: 'New' });
});
```

## Zustand + immer middleware
```ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

const useMapStore = create(immer((set) => ({
  cells: {},
  setCell: (q, r, biome) => set(s => {
    s.cells[`${q},${r}`] = { biome };
  }),
})));
```

## Характеристики
- 3.4 kB core
- Структурное шаринг
- Поддержка Map/Set

## Ограничения
- Proxy overhead (мелкий)
- Классы — через `@immerable`
