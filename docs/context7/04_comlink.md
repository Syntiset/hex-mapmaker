# Comlink — Web Workers без боли

Context7 ID: `/googlechromelabs/comlink`

## main
```js
import * as Comlink from 'comlink';
const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
const api = Comlink.wrap(worker);
const result = await api.generateTerrain(seed, w, h);
```

## worker
```js
import * as Comlink from 'comlink';
Comlink.expose({
  generateTerrain(seed, w, h) { return computeNoise(seed, w, h); }
});
```

## Характеристики
- 1.8 kB min+gz
- Прозрачный async API через Proxy
- TS типизация воркер-API

## Ограничения
- structured clone (без функций/DOM)
- В Vite — `?worker` или `new URL(..., import.meta.url)`
