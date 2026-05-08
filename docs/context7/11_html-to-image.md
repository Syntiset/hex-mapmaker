# html-to-image

Context7 ID: `/bubkoo/html-to-image`

## toPng
```tsx
import { toPng } from 'html-to-image';

const dataUrl = await toPng(ref.current, {
  backgroundColor: '#1a1a1a',
  pixelRatio: window.devicePixelRatio || 2,
  cacheBust: true,
});
```

## Форматы: toPng / toJpeg / toBlob / toSvg

## Характеристики
- SVG foreignObject + canvas
- Поддерживает кастомные шрифты, CSS, псевдоэлементы

## Ограничения
- Konva canvas не нужен — у Konva есть `stage.toDataURL()`
- Cross-origin без CORS — облом
- backdrop-filter, некоторые clip-path — нестабильно
