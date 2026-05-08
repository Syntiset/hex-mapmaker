# Rough.js — sketchy/hand-drawn эффекты

Context7: `/rough-stuff/rough`. Бандл: **~9 KB min+gz**.

## Базовое использование
```ts
import rough from 'roughjs';

const rc = rough.canvas(canvasElement);
rc.path('M...Z', options);   // SVG path
rc.rectangle(x, y, w, h, options);
rc.circle(cx, cy, diameter, options);
```

## Ключевые параметры
```ts
{
  roughness: 1.5,         // 0=ровно, 3+=очень рваный
  bowing: 1,              // изгиб линий
  stroke: '#5a4a2a',
  strokeWidth: 1.5,
  fill: 'rgba(80,60,20,0.3)',
  fillStyle: 'hachure',   // 'hachure'|'cross-hatch'|'zigzag'|'dots'|'solid'|'dashed'
  hachureAngle: 45,       // угол штриховки
  hachureGap: 6,          // расстояние между штрихами (px)
  fillWeight: 1,          // толщина штриховки
  seed: hash3(q, r)       // КРИТИЧНО для sprite cache (стабильность)
}
```

## OffscreenCanvas совместимость
```ts
const rc = rough.canvas(off as unknown as HTMLCanvasElement);
```
Rough использует только `getContext('2d')`, DOM не трогает. Работает в Worker'е.

## Pointy-top hex как SVG path
```ts
function hexSvgPath(size: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 180 * (60 * i - 30);
    pts.push(`${size * Math.cos(a)},${size * Math.sin(a)}`);
  }
  return `M ${pts.join(' L ')} Z`;
}

rc.path(hexSvgPath(hexSize), {
  roughness: 0.7, stroke: '#3a3024', strokeWidth: 1, fill: 'none',
  seed: hash3(q, r),
});
```

## Hachure ВНУТРИ гекса (clip обязателен)
```ts
ctx.save();
ctx.beginPath();
pathHex(ctx, 0, 0, size);
ctx.clip();
rc.path(hexSvgPath(size), {
  fillStyle: 'hachure',
  fill: '#7a6a40',
  stroke: 'none',
  hachureAngle: 30,
  hachureGap: 5,
  seed: hash3(q, r),
});
ctx.restore();
```

## Риски
- Без `seed` — каждый рендер выглядит по-новому, sprite cache бесполезен
- Seed нестабилен между **версиями** rough.js — обновление либы инвалидирует cache LRU (приемлемо)
- Hachure без clip — выходит за hex border
