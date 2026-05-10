# Тема 1 — улучшение рендера тайлов

Источники: konvajs/site, pixijs/pixijs (Context7)

## Контекст
~30 handcrafted-тайлов в drawHex.ts. Биомы выглядят насыщенно после noise+composite, тайлы — как плейсхолдеры. game-icons через iconify уже пробовали — не зашло.

## Вариант A — Canvas2D + procedural детализация (без новых зависимостей)
**Техники:**
- **Radial gradient depth** — на форму тайла кладётся полупрозрачный radialGradient (светлее в центре → темнее к краям). Объём без шейдеров.
- **Cel-shading outline** — жирный тёмный stroke по контуру + 1-2 highlight-stroke со смещением. Стиль постап-арта.
- **Noise overlay** через `globalCompositeOperation = 'overlay'/'multiply'` (то же что для биомов). Фактура без растровых ассетов.
- **Drop-shadow** через `ctx.shadowBlur + ctx.shadowColor` перед рисованием — глубина за один проход.
- **Упрощённая иконография** — не пытаться нарисовать фотореалистичный спрайт. 1 крупный path (силуэт здания) + 1-2 акцента (окно, мачта).

**Плюсы:** нулевая интеграция, инкрементально, согласуется с биомами.
**Минусы:** ручной труд по каждому из 30+ тайлов.
**ROI:** высокий.

## Вариант B — PixiJS (WebGL/WebGPU)
Полноценный 2D-движок. Кастомные GLSL шейдеры через `Filter.from({ gl: { vertex, fragment } })`. Batch rendering, cacheAsTexture.
**Минус:** замена react-konva = переписка HexGridCanvas.tsx + всех событий (drag/click/hover). Оценка 2-4 недели. Высокий риск регрессии.
**Вердикт:** избыточно.

## Вариант C — Konva filters (недоиспользованное)
- `node.cache().filters([Konva.Filters.Emboss])` — рельеф
- `Konva.Filters.Noise` — гранж
- `Konva.Filters.Enhance` / `HSL` — контраст/тон
- CSS-string filters: `node.filters(['brightness(1.2)', 'contrast(1.3)'])` — нативная производительность
**Минус:** Konva Filters работают через CPU pixel manipulation, дороги для большого числа тайлов.
**Вердикт:** точечно на ключевых тайлах (vault/bunker).

## Вариант D — SVG template strings → ImageBitmap
Тайл как inline SVG-строка → `createImageBitmap(new Blob([svgStr], {type:'image/svg+xml'}))` → текущий sprite cache.
**Плюсы:** масштабируется без блюра, легко темизируется (CSS variables в SVG), без deps.
**Минусы:** asynce первый рендер, нет composite внутри SVG→canvas pipeline.
**Вердикт:** для 3-5 самых сложных тайлов (vault, bunker, factory).

## Вариант E — two.js / paper.js
Vector libs. **Минус:** не дают нового качества vs прямого canvas2D. Лишние deps.
**Вердикт:** не рекомендуется.

## Итоговая рекомендация
1. **Canvas2D procedural detailing** на все тайлы (gradient depth + cel outline + noise overlay).
2. **SVG template strings** для 3-5 сложных тайлов.
3. **Konva filters** точечно (Emboss на vault).

PixiJS отложить.
