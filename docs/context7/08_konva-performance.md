# Konva — performance техники

Context7 ID: `/konvajs/site`

## listening: false
```jsx
<Layer listening={false}> <Rect fill="lightgray" /> </Layer>
```
Отключает hit detection — фоновый слой не перехватывает события.

## cache()
```js
group.cache(); // → offscreen canvas
```

## transformsEnabled
```js
new Konva.Rect({ transformsEnabled: 'position' }); // 'all' | 'position' | 'none'
```

## perfectDrawEnabled: false
```js
new Konva.Shape({ perfectDrawEnabled: false }); // быстрее, без AA на границах
```

## batchDraw
```js
layer.batchDraw(); // одна перерисовка после серии изменений
```

## drawHitFromCache
```js
shape.cache(); shape.drawHitFromCache();
```

## FastLayer — без hit detection вообще

## Konva.pixelRatio = 1 — отключить HiDPI масштабирование глобально

## Применимо к проекту
- `listening: false` на BG-слое
- `cache()` уже есть (sprite cache)
- `transformsEnabled: 'position'` на гексах
