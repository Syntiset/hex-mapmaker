# globalCompositeOperation — встроенные blend-режимы

26 режимов в Canvas 2D API. Работает на OffscreenCanvas без ограничений.

## Ключевые режимы

| Режим | Что делает | Для чего |
|---|---|---|
| `multiply` | dst × src → темнее | тёмная текстура (грязь, тени, ожоги) |
| `darken` | min(dst, src) | тёмные пятна без артефактов |
| `color-burn` | инверт ÷ src → очень тёмно | выжженные края |
| `screen` | противоположность multiply → светлее | свечение, радиация, огонь |
| `color-dodge` | dst ÷ инверт src | яркие ореолы |
| `overlay` | multiply если тёмное, screen если светлое | усиление контраста |
| `soft-light` | мягкий overlay | атмосферный тон биома |
| `hard-light` | overlay с перевёрнутыми слоями | металл, резкий контраст |
| `hue` | luma+chroma dst, hue src | тон без изменения яркости |
| `color` | luma dst, hue+chroma src | перекраска с сохранением светотени |

## Pipeline слоёв (стандартный для richness)

```
pass 1: base fill              → source-over   базовый цвет биома (НЕПРОЗРАЧНЫЙ!)
pass 2: noise albedo texture   → multiply       simplex-текстура темнее основы
pass 3: edge vignette          → multiply       радиальный градиент к краям
pass 4: directional highlight  → screen         градиент со смещением (псевдо-light)
pass 5: color tint             → soft-light    тон атмосферы (cool/warm)
pass 6: glow                   → screen         radiation, fire, отдельный layer
pass 7: icon                   → source-over    иконка тайла
```

## Паттерн использования
```ts
ctx.save();
ctx.globalCompositeOperation = 'multiply';
ctx.drawImage(noiseCanvas, 0, 0);
ctx.restore(); // обязательно — иначе режим "протекает"
```

## Производительность
- GPU-операция, **сама не тормозит**
- Попиксельный `ImageData` в 10-50× дороже `drawImage`
- `Math.floor()` координат при `drawImage` — избегает субпиксельного AA

## Типичные ошибки
- `multiply` на прозрачном фоне → чёрный (нужен непрозрачный base layer)
- `overlay` без alpha-ограничения → выбивает в чистый белый/чёрный (alpha 0.3-0.6)
- Забыть `restore()` → режим уезжает на следующие пассы
