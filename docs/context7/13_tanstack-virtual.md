# @tanstack/react-virtual

Context7 ID: `/tanstack/virtual`

## useVirtualizer
```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

const v = useVirtualizer({
  count: tiles.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 60,
  overscan: 5,
});

<div ref={parentRef} style={{ height: 400, overflow: 'auto' }}>
  <div style={{ height: v.getTotalSize(), position: 'relative' }}>
    {v.getVirtualItems().map(it => (
      <div key={it.key} style={{ position:'absolute', top:0, transform:`translateY(${it.start}px)`, height:it.size }}>
        <TileCard tile={tiles[it.index]} />
      </div>
    ))}
  </div>
</div>
```

## Характеристики
- Headless UI, ~6 kB
- Vertical / horizontal / grid

## Ограничения
- Нужен явный scrollable контейнер
