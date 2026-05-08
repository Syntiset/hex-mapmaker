# simplex-noise.js — процедурные текстуры

Context7: `/jwagner/simplex-noise.js` (v4)

## Базовое использование
```js
import { createNoise2D } from 'simplex-noise';
import alea from 'alea';
const noise2D = createNoise2D(alea('seed-string')); // [-1, 1]
const v = noise2D(x, y);
```

## Сидирование от hash3(q,r)
```ts
const noise = createNoise2D(alea(`biome-${q}-${r}`));
```
alea принимает строку — не нужно конвертировать hash в число.

## Производительность
- 72M ops/sec (бенчмарк автора)
- 40 000 вызовов (200×200 px sprite) ≈ 0.5 мс
- **Только при бейке** в LRU. На каждый кадр — нельзя.

## fBm (fractal Brownian motion) — 4 октавы для richness
```ts
function fbm(noise2D, x, y, octaves = 4, lacunarity = 2.0, gain = 0.5) {
  let value = 0, amp = 1, freq = 1, max = 0;
  for (let i = 0; i < octaves; i++) {
    value += noise2D(x * freq, y * freq) * amp;
    max += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return value / max; // [-1, 1]
}
```

## Turbulence (выбоины, потёртости)
```ts
Math.abs(noise2D(x, y)) // [0, ~1]
// в каждой октаве fBm
```

## Ridged noise (трещины, гребни)
```ts
1.0 - Math.abs(noise2D(x, y))
```

## Domain warp (потёки, искажение)
```ts
function domainWarp(noise2D, x, y, strength = 0.3) {
  const dx = noise2D(x, y);
  const dy = noise2D(x + 5.2, y + 1.3); // офсеты убирают корреляцию
  return noise2D(x + strength * dx, y + strength * dy);
}
```

## Бандл
- simplex-noise: ~3 KB
- alea: ~1 KB
- **+4 KB total**
