# Zod

Context7 ID: `/colinhacks/zod`

## safeParse — без исключений
```ts
import { z } from 'zod';
const CellSchema = z.object({ q: z.number(), r: z.number(), biome: z.string(), label: z.string().optional() });
const MapV3 = z.object({ version: z.literal(3), name: z.string(), cells: z.array(CellSchema) });

const r = MapV3.safeParse(parsedJson);
if (!r.success) console.error(r.error.issues);
else loadMap(r.data); // типизировано
```

## Discriminated union для миграций
```ts
const AnyMap = z.discriminatedUnion('version', [
  z.object({ version: z.literal(2), /*...*/ }),
  z.object({ version: z.literal(3), /*...*/ }),
]);
```

## Характеристики
- TS-вывод типов из схемы
- Детальные ошибки с path
- v3 ~14 kB, v4-mini ~7 kB

## Ограничения
- Большие вложенные схемы → TS-компиляция медленнее (v3)
