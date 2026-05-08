# Vitest

Context7 ID: `/vitest-dev/vitest`

## Базовый тест
```ts
import { describe, it, expect } from 'vitest';
import { hexDistance } from '../src/hex/hex';

describe('hex math', () => {
  it('сосед = 1', () => {
    expect(hexDistance({q:0,r:0}, {q:1,r:0})).toBe(1);
  });
});
```

## In-source тесты
```ts
export function hexDistance(a, b) { /* ... */ }
if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;
  it('self = 0', () => expect(hexDistance(a,a)).toBe(0));
}
```

## vite.config.ts
```ts
export default defineConfig({ test: { globals: true, environment: 'node' } });
```

## Преимущества
- Использует тот же vite.config.ts
- Jest-совместимый API
- TS/ESM нативно, watch через HMR
