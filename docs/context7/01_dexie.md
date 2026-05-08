# Dexie.js / idb-keyval — IndexedDB хранилище

Context7 ID: `/websites/dexie`, альтернатива `/jakearchibald/idb-keyval`.

## Dexie — схема и операции
```js
import Dexie from 'dexie';
const db = new Dexie('MapMakerDB');
db.version(1).stores({ maps: '++id, name, updatedAt' });
await db.maps.put({ name: 'Wasteland', updatedAt: Date.now(), data: mapJson });
const all = await db.maps.toArray();
```

## useLiveQuery (реактивный хук)
```js
import { useLiveQuery } from 'dexie-react-hooks';
const maps = useLiveQuery(() => db.maps.orderBy('updatedAt').reverse().toArray());
```

## idb-keyval (минимум)
```js
import { get, set, createStore } from 'idb-keyval';
const store = createStore('mapmaker-db', 'maps');
await set('autosave', mapJson, store);
```

## Ограничения
- IndexedDB квота — ~50% свободного диска в браузере
- В Electron квот нет
- В SW требует доп. настройки
