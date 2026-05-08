# simplex-noise.js

Context7 ID: `/jwagner/simplex-noise.js`

## Базовое использование (v4)
```js
import { createNoise2D } from 'simplex-noise';
const noise2D = createNoise2D();
const value = noise2D(q * 0.05, r * 0.05); // [-1..1]
```

## Сидируемый шум
```js
import alea from 'alea';
import { createNoise2D } from 'simplex-noise';
const prng = alea('mySeed');
const noise2D = createNoise2D(prng);
```

## Характеристики
- 2.7 kB min+gz, без зависимостей
- 2D / 3D / 4D
- TS из коробки

## Миграция v3 → v4
- `new SimplexNoise()` → `createNoise2D()`
