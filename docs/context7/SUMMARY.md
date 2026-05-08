# Context7 Research Summary — Hex Map Maker

Дата: 2026-05-07

## Топ-3: взять прямо сейчас

### 1. Vitest — [`05_vitest.md`](./05_vitest.md) ✅ УСТАНОВЛЕНО (2026-05-08)
- Добавлены скрипты: `npm test` (watch), `npm run test:run` (одноразово).
- Покрыто тестами: `src/hex/hex.test.ts` (13 тестов — координаты, соседи, rectMap, hexCorners), `src/io/loadJson.test.ts` (9 тестов — миграции v1/v2/v3 + ошибки валидации).
- Все 22 теста зелёные.

- **Что:** тестовый фреймворк, встроенный в Vite-экосистему. Jest-совместимый API.
- **Плюсы:** нулевая настройка (читает наш `vite.config.ts`), TS нативно, watch через HMR.
- **Минусы:** dev-only зависимость, на бандл не влияет.
- **Риски:** нет.
- **Где у нас:** `src/hex/hex.ts` (математика — критическая, любой регресс ломает координаты), `src/io/loadJson.ts` (миграции v1→v2→v3 не покрыты тестами — баг = тихая порча карт).
- **Аргумент:** оба модуля — фундамент. Сейчас «работает потому что работает». Vitest даёт страховку.
- **Установка:** `npm install -D vitest`.

### 2. Zod — [`07_zod.md`](./07_zod.md) ✅ УСТАНОВЛЕНО (2026-05-08)
- Внедрено в `src/io/loadJson.ts`: схема `RawMapSchema` (version, grid, cells, roadPaths) с `safeParse`.
- Битый JSON / отсутствие grid / отрицательный hexSize / неподдерживаемая версия — все дают читаемое сообщение «Некорректный формат: <path> — <причина>» вместо тихого краша.
- Логика разделена: `parseMapJson(unknown)` — чистая, тестируемая; `loadJsonFile(File)` — обёртка с чтением файла.

- **Что:** TypeScript-first валидация JSON-схем с автовыводом типов.
- **Плюсы:** `safeParse` без исключений, читаемые ошибки с path, `discriminatedUnion('version', [...])` идеально для миграций карт.
- **Минусы:** +14 kB (v3) / +7 kB (v4 mini) к бандлу.
- **Риски:** низкие. При росте схемы — медленнее TS-компиляция (v3).
- **Где у нас:** `src/io/loadJson.ts` — сейчас ручные if-проверки, при битом JSON приложение падает или молча грузит мусор. Zod даёт типизированный happy-path и читаемое сообщение пользователю.
- **Аргумент:** карты — главный артефакт пользователя. Их сохранность важнее +7 kB.
- **Установка:** `npm install zod`.

### 3. react-hotkeys-hook — [`03_react-hotkeys-hook.md`](./03_react-hotkeys-hook.md) ✅ УСТАНОВЛЕНО (2026-05-08)
- В `src/App.tsx` заменён ручной `useEffect` с `addEventListener('keydown')` на 9 декларативных `useHotkeys(...)` вызовов.
- Хоткеи: Ctrl/Cmd+Z (undo), Ctrl/Cmd+Y / Ctrl+Shift+Z (redo), B/T (mode), R/E/L (tool), Space (pan keydown/keyup).
- Библиотека сама игнорирует input/textarea — больше не надо вручную проверять `isTextTarget`.

- **Что:** декларативный хук горячих клавиш.
- **Плюсы:** заменяет `window.addEventListener('keydown')` + ref-cycle в `App.tsx`. Поддержка scopes (модалки vs canvas), `enableOnFormTags` (работа в input), per-component activation.
- **Минусы:** +6 kB.
- **Риски:** возможны конфликты при отсутствии scopes — лечится `{ scopes: 'canvas' }`.
- **Где у нас:** `src/App.tsx:70-122` — крупный `useEffect` ручного key handling. После замены — каждый хоткей в своём компоненте, ближе к действию.
- **Аргумент:** текущая реализация работает, но при росте (модалки, диалоги, input-поля) разбухнет. Лучше переписать сейчас, пока хоткеев мало.
- **Установка:** `npm install react-hotkeys-hook`.

## Полезно при росте проекта

### Dexie.js / idb-keyval — [`01_dexie.md`](./01_dexie.md)
- **Когда:** мульти-карты, автосейв, размер карты выходит за лимиты localStorage (~5 MB).
- **Плюсы:** `useLiveQuery` для реактивного списка карт, нет лимитов на запись.
- **Минусы:** Dexie +35 kB (idb-keyval — 2 kB, без query-API).
- **Риски:** очистка кеша браузера = потеря всех карт; нужен `navigator.storage.persist()`.
- **Совет:** начать с idb-keyval (просто `set/get`), на Dexie переходить если понадобятся фильтры.

### Immer — [`06_immer.md`](./06_immer.md)
- **Когда:** mapStore разрастётся вложенными обновлениями (cells × roads × labels).
- **Плюсы:** `state.cells[k].biome = x` вместо spread-цепочек, встроен в `zustand/middleware/immer`.
- **Минусы:** мелкий Proxy-оверхед, +3.4 kB.
- **Риски:** случайная мутация state вне `produce` — TS не ловит.

### Comlink — [`04_comlink.md`](./04_comlink.md)
- **Когда:** генерация/экспорт начнут блокировать UI (>100ms).
- **Плюсы:** прозрачный async API над postMessage, 1.8 kB.
- **Минусы:** Vite-специфичный синтаксис воркеров, отладка сложнее.
- **Риски:** ошибки в воркере без proper error handling — теряются.

### simplex-noise — [`02_simplex-noise.md`](./02_simplex-noise.md)
- **Когда:** появится фича «сгенерировать карту» (procedural terrain).
- **Плюсы:** 2.7 kB, сидируемый (воспроизводимые карты), zero-dep.
- **Риски:** нет.

### electron-updater — [`09_electron-updater.md`](./09_electron-updater.md)
- **Когда:** Electron станет основным каналом распространения.
- **Плюсы:** silent autoupdate через GitHub Releases.
- **Минусы:** требует подписи .exe (Windows SmartScreen иначе ругается); GH_TOKEN в CI.
- **Риски:** плохой rollout = принудительная перезагрузка не вовремя.

### workbox-window — [`10_workbox-window.md`](./10_workbox-window.md)
- **Когда:** PWA станет важна и захочется явно показывать «доступно обновление».
- **Плюсы:** контроль над skipWaiting / refresh.
- **Минусы:** vite-plugin-pwa уже настраивает SW — нужно сменить `registerType: 'autoUpdate'` → `'prompt'`.
- **Риски:** неправильный skipWaiting = белый экран при несовместимом кеше.

### html-to-image — [`11_html-to-image.md`](./11_html-to-image.md)
- **Когда:** появится HTML-легенда поверх Konva (название, легенда биомов, шкала).
- **Плюсы:** PNG из любого DOM.
- **Минусы:** для Konva-canvas избыточен (есть `stage.toDataURL()`).
- **Риски:** cross-origin ресурсы — облом без CORS.

## Можно пропустить (пока)

| Lib | Почему | Когда взять |
|---|---|---|
| clsx [`14`](./14_clsx.md) | className-конкатенаций мало (canvas-based UI) | когда станет надоедать |
| @tanstack/react-virtual [`13`](./13_tanstack-virtual.md) | палитра тайлов маленькая (35 шт) | если тайлов >200 |
| react-colorful [`12`](./12_react-colorful.md) | цвета биомов хардкоды | при кастомных цветах меток/дорог |

## Итоговая таблица

| Библиотека | Приоритет | Бандл | Риск | Файл |
|---|---|---|---|---|
| vitest | ✅ установлено | dev-only | низкий | [05](./05_vitest.md) |
| zod | ✅ установлено | 7–14 kB | низкий | [07](./07_zod.md) |
| react-hotkeys-hook | ✅ установлено | 6 kB | низкий | [03](./03_react-hotkeys-hook.md) |
| idb-keyval / dexie | при росте | 2 / 35 kB | средний | [01](./01_dexie.md) |
| immer | при росте | 3.4 kB | низкий | [06](./06_immer.md) |
| comlink | при тормозах | 1.8 kB | средний | [04](./04_comlink.md) |
| simplex-noise | при фиче «генерация» | 2.7 kB | нет | [02](./02_simplex-noise.md) |
| konva tuning | по факту лагов | — | — | [08](./08_konva-performance.md) |
| electron-updater | при дистрибуции | в builder | средний | [09](./09_electron-updater.md) |
| workbox-window | при PWA-фокусе | ~5 kB | средний | [10](./10_workbox-window.md) |
| html-to-image | при HTML-легенде | 15 kB | средний | [11](./11_html-to-image.md) |
| clsx | по желанию | 0.2 kB | нет | [14](./14_clsx.md) |
| @tanstack/react-virtual | по задаче | 6 kB | низкий | [13](./13_tanstack-virtual.md) |
| react-colorful | по задаче | 2.8 kB | нет | [12](./12_react-colorful.md) |
