# 04_changelog.md

## 2026-05-07 — v1.4.1 — фикс асимметричного blob-blending

- **Bug:** мягкий переход между биомами работал только на N/W (с S/E соседи затирали кайму). Корень — порядок отрисовки: blob (Pass 1) → биомные спрайты (Pass 2). Спрайт каждой клетки имел glow-кайму без хекс-клипа (см. `drawHexGlow`), которая затирала Pass 1-blob соседей. Поскольку обход row-major, glow-кайма от late-drawn клетки покрывала early-drawn соседей (N/W), а её собственный glow в S/E соседей затирался их же спрайтами.
- **Fix:** инвертирован порядок — спрайты сначала, blob после. Blob переделан в **fringe-only** radial gradient (alpha 0 внутри гекса, peak `0x70` на ребре, 0 на 1.25*size). Теперь кайма ложится **поверх всех 6 соседей** одинаково, не перекрывая текстуру/иконку собственного гекса. Тайл-спрайты по-прежнему рисуются после blob-pass, иконки сверху.
- Файлы: `src/render/drawHex.ts` (`drawBiomeBlob` переписан), `src/components/HexGridCanvas.tsx` (`drawScene` — order swap).

## 2026-05-07 — v1.4.0 — Help-модалка + long-press preview на тач

- **HelpModal (`src/components/HelpModal.tsx`):** новый компонент с двумя табами «🖥 ПК / мышь» и «📱 Тач / планшет». Дефолтный таб — по `window.matchMedia("(pointer: coarse)")` (тач-устройства открывают сразу свою секцию). Закрытие — Esc / клик по backdrop / крестик.
- **TopBar:** добавлена кнопка «? Помощь» открывающая модалку.
- **StatusBar hint** переписан: вместо мышиной шпаргалки указывает на B/T/R/E/L/Space/Ctrl-Z/Y и кнопку Помощь.
- **Long-press preview (тач):** в `TilePalette` добавлен таймер 450мс на `pointerdown` для биомов и тайлов (только если `pointerType !== "mouse"`). По истечении — popup-превью. Движение пальца > 10px → отмена. Клик подавляется через `suppressClick` ref, чтобы long-press не выбирал элемент. Тап вне `.hover-preview` закрывает превью (window pointerdown listener активен только пока висит touch-preview). Hover-listener'ы для мыши не дёргают touch-preview (проверка `h.fromTouch`).
- **CSS:** `.modal*`, `.help-row`, `.help-note`, `kbd`-стили.

## 2026-05-07 — v1.3.2 — Toolbar mode-buttons + tach pinch revert

- **Toolbar:** кнопки «Биом / Тайл» в `Toolbar.tsx` тоже форсили `setTool("paint")` (пропущены в v1.3.1). Заменены на тот же conditional что в палитре: переключают только `paintMode`, инструмент трогают только если он не paint и не erase.
- **Pinch revert:** при тач-pinch первый палец успевал зарегистрировать `pointerdown` и сделать paint/erase/road-erase до того, как второй палец вызывал pinch detection. Теперь:
  - `lastActionRef` запоминает тип действия в pointerdown.
  - На входе в pinch (size === 2): для paint/erase/road-erase → `undo()`, для road → новый action `cancelRoadPath()` (просто сбрасывает draftPoints без коммита).
  - На pointerup сбрасывается обратно в null.
- **Store:** добавлен `cancelRoadPath` action в `mapStore.ts`.
- **Vite config:** `server.allowedHosts` для `.loca.lt` / `.trycloudflare.com` / `.ngrok-free.app` / `.ngrok.app` — чтобы dev-сервер открывался через тоннели.

## 2026-05-07 — v1.3.1 — QoL фиксы по фидбеку

- **Bug:** B/T (и клик по биому/тайлу в палитре) больше не переключают инструмент на «кисть». Теперь B/T меняют только `paintMode`, оставляя текущий tool. Палитра имеет helper `ensurePaintCompatibleTool()` — нудит к paint только если текущий tool ни paint, ни erase (т.е. road/label/pan). Erase сохраняется при смене биома или тайла.
- **Space-pan:** переписан на pan-override-флаг. Раньше Space менял `store.tool` на pan и возвращал на keyup — на практике не срабатывал стабильно. Теперь App держит локальный `spacePan` (window keydown/up + blur), пробрасывает в `HexGridCanvas` как пропс `panOverride`. Внутри Canvas: `tool = panOverride ? "pan" : storeTool`. Курсор сразу становится grab, store не мутируется, конфликтов нет.
- **Hover preview UX:** секция тайлов в `TilePalette` переделана из `palette-grid` (превью + имя) в `tile-list` (вертикальный список текстовых строк). Hover popup (140px) живёт как был — теперь это единственное место, где видно превью тайла. Биомы остались гридом 4×N (их 14, читается без проблем).
- **Hotkeys 1-9 удалены.** При 14 биомах и 35 тайлах не помещаются логично; user попросил «либо решить, либо снести» — снесли. Можно вернуть позже scoped к текущей категории, если будет нужно.

## 2026-05-07 — v1.3.0 — QoL пакет: hotkeys, zoom, категории, hover preview, recent, touch

Шесть фич одной серией (приоритеты из `08_ideas.md`).

- **Hotkeys (`src/App.tsx`):** `B`/`T` переключают paint mode (биом/тайл) и активируют кисть, `R` — дорога, `E` — ластик, `L` — подпись. `Space` (hold) — временный pan, отпуск возвращает прежний инструмент. `1`–`9` — выбор биома/тайла по индексу в текущем paintMode. Игнорятся при фокусе на input/textarea/contenteditable. `Ctrl+Z`/`Ctrl+Y`/`Ctrl+Shift+Z` уже были — не трогали.
- **Zoom-пресеты + Fit:** view-state (scale, pos) поднят из `HexGridCanvas` в `App` через пропы `viewState`/`setViewState` + экспортированный тип `ViewState`. Overlay-блок справа-снизу canvas-host: `1×`/`2×`/`4×`/`Fit` + readout процентов. `Fit` считает bbox по `rectMap(grid)` и подгоняет scale/pos под текущие размеры canvas-host. Zoom-кнопки центрируются вокруг текущего центра viewport.
- **Категории тайлов:** новый `FALLOUT_TILE_CATEGORIES` в `src/tiles/fallout.ts` (7 групп: Поселения / Руины / Подземелья / Опасности / Растительность / Радиация / Убежища). В `TilePalette` — таб-бар над сеткой тайлов со state `category`. Таб «Все» показывает всё; биомная сетка не группируется (всего 14, помещается).
- **Hover preview:** `TilePalette` отслеживает hover на кнопках биомов и тайлов, показывает фиксированный popup-`<div>` 140px на курсоре с увеличенным превью + именем + (для тайла) поясняющим «поверх: <биом>».
- **Recent files (`src/io/recents.ts`):** localStorage `mapmaker.recents.v1`, до 5 записей `{name, savedAt, data: SavedMap}`. Записываются в `pushRecent()` при save/open. В `TopBar` — dropdown «Недавние ▾» с click-outside закрытием. При load из recent — confirm если есть несохранённая работа.
- **Touch support (pinch-zoom):** `HexGridCanvas` ведёт `pointersRef` (Map) и `pinchRef`. При втором pointer down фиксирует начальную дистанцию + scale, при move с 2 pointer'ами — масштабирует относительно midpoint и переносит. Painting/road в момент входа в pinch отменяются. Pointer up удаляет id, при выходе из pinch очищает ссылку. `touch-action: none` на Stage — браузер не перехватывает жест. `onPointerCancel` тоже подключён.

## 2026-05-07 — v1.2.0 — Per-cell tile sprite cache
- Та же оптимизация что для биомов (v1.0.0), но теперь и для тайлов. До этого 3 runtime-прохода per cell per frame: decoration в clean hex clip, glow без клипа, drawIconEnhanced (icon + drop shadow). На иконках типа `megacity` (кластер небоскрёбов), `raider` (палатка + спайк + череп), `factory` (трубы с дымом) — десятки canvas-операций per icon per frame.
- Добавлен `src/render/tileSprite.ts` параллельно `biomeSprite.ts`. Сигнатура: `getTileSprite(tile, q, r, size)` → запекает (decoration в clean clip + glow без клипа + drawIconEnhanced) в offscreen canvas. `clearTileSpriteCache()` — инвалидация при смене hexSize.
- Cache key: `(tileId, q, r, sizeKey)`. (q, r) обязателен — иконки tree/deadtree/ash/debris/ruin и tile decoration используют hash3(q, r, ...) для процедурных вариаций.
- Backing store DPR-aware: `SPRITE_SCALE = max(3, ceil(DPR × 2))`. LRU 2000.
- В `drawScene` 3 цикла свёрнуты в один `drawImage` per tile. Импорт `drawHexGlow`/`drawHexTexture`/`drawIconEnhanced` из drawHex убран из HexGridCanvas (теперь только в `tileSprite.ts`).

## 2026-05-07 — v1.1.0 — Wavy/displaced функционал удалён
- **Удалён wavy-clip / displaced polygon целиком.** Включая `src/render/displaced.ts` (модуль удалён физически), `pointInPolygon`, `sampleInWavyPolygon`, `sampleArea`, всё safe-hex sampling, neighborMask вычисление в drawScene. Wavy создавал двунаправленную асимметрию границ → биомы выглядели «отъедающими» друг друга, что породило целую серию итераций v1.0.6–v1.0.15 (откачены через force push до v1.0.5). Подробный разбор причин — ISSUE-003 в `06_known_issues.md`.
- **Возвращены чистые шестиугольные рёбра** + soft blob blending. Runtime `drawBiomeBlob` рисует radial gradient с alpha falloff на радиусе 1.25*size — этот «хвост» blob'а перекрывается с blob'ами соседей, давая мягкие цветовые переходы оптически (без сложного геометрического клипа).
- **Sprite cache упрощён**: ключ `(biomeId, q, r, hexSize)` без `mask`. Каждая ячейка имеет уникальный stipple-pattern за счёт (q, r) hash, при изменении соседа sprite не пересобирается.
- **Stipple/decoration возвращены к простому rectangular sampling** в bbox вокруг центра гекса. Canvas clean-hex clip обрезает естественно.
- **Бекап локальной копии** перед чисткой: `backup/src-20260507-095821-pre-soft-disable/` (исключён из git).
- **Документация:** ISSUE-003 в `06_known_issues.md` сохранён как урок (причины, эволюция фикса, финальное решение — отказ от wavy).

## 2026-05-07 — v1.0.0 — Per-cell sprite cache
- **Производительность:** при 30+ заполненных гексах FPS на вкладке падал. Корень — каждый кадр на каждый biomed гекс выполнялось ~100 canvas-операций (60-точечный displaced clip + 86 stipple arc-заливок + decoration + 2 градиента + clean clip + 2 градиента lighting). Для 30 ячеек это ~3000 операций per frame. Пересчитывалось при каждом панорамировании / зуме / покраске.
- Добавлен модуль `src/render/biomeSprite.ts` с per-cell sprite cache:
  - Каждая клетка с биомом запекается в offscreen `HTMLCanvasElement` размером `2 × hexSize * 1.3` с `(displaced clip + texture + glow + lighting)` в локальных координатах.
  - Кэш ключ: `(biomeId, q, r, neighborMask, hexSize)`. LRU 5000 записей.
  - В `drawScene` passes 2-4 (texture/glow/lighting) свёрнуты в один `ctx.drawImage(sprite, ...)`. Blob-проход остался runtime — он перетекает в соседей и не может быть запечён в локальный sprite.
- Кэш инвалидируется одновременно с displaced cache (при смене integer-size). При покраске соседнего гекса меняется `neighborMask` — старый sprite становится stale, новый ключ → cache miss → пересборка только пострадавших ячеек.
- Ожидаемый эффект: с 30 ячейками per-frame работа уменьшается с ~100×30 = 3000 до ~30 drawImage'ей плюс runtime blobs/иконок/дорог. Карты с сотнями гексов должны работать без лагов.
- Git: проект инициализирован как репозиторий, залит в `https://github.com/Syntiset/hex-mapmaker` (private).

## 2026-05-06 (поздний вечер) — v0.9.2
- Добавлено: **11 уникальных иконок** для тайлов, которые раньше переиспользовали базовые иконки и различались лишь цветом:
  - `megacity` — кластер небоскрёбов с окнами (вместо settlement-houses)
  - `trader-post` — крытый фургон + стопка бочек (вместо settlement)
  - `diner` — здание с неоновой вывеской «EAT» на столбе (раньше использовало `gas` — было нелепо)
  - `factory` — корпус с пиловидной крышей + 2 трубы с дымом (вместо tower)
  - `slum` — наклонённые лачуги с гофрированной жестью (вместо ruin)
  - `cave` — зубчатый зев пещеры с сталактитами (вместо mine)
  - `quarry` — ступенчатые кольца карьера + кирка (вместо mine)
  - `vault-sealed` — vault-шестерня + цепной X-крест с замком (вместо vault)
  - `vault-open` — сияющее отверстие, шестерня откатилась в сторону (вместо vault)
  - `bos-outpost` — бункер + мачта с тарелкой + шестерня БС (вместо bunker)
  - `enclave` — гексагональная база + большая E + холодные синие огни (вместо bunker)
- Изменено: соответствующие tile-записи в `fallout.ts` переключены на новые `icon` значения. iconColor/iconColor2 подобраны под новые формы.
- Исправлено: `dense-forest` / `dense-deadwood` теперь действительно покрывают почти весь гекс — параметры count 14→18, scale 0.65→0.55, spread 1.05→1.55, ySpread 0.95→1.30. Раньше деревья кучковались в центре несмотря на «густой» в названии.
- Удалено: `drawIconEnhanced` второй проход с `globalCompositeOperation = "lighter"` и белой заливкой — давал «призрачные» дубликаты на сложных иконках (леса, рейдер, мегаполис и т.д.). Остался только drop shadow.

## 2026-05-06 (вечер) — v0.9.1
- UX-фиксы по результатам v0.9:
  - **Удалён dropdown активного биома из Toolbar** — был дублированием палитры биомов слева.
  - **Sidebar расширен** с 220px до 360px, палитра теперь в 4 колонки (было 2). Текст кнопок уменьшен до 10px с word-wrap.
  - **Добавлены 7 forest-density тайлов** (features, биом-агностичны): Одинокое дерево, Редкая роща, Роща, Густой лес, Сухая роща, Густой сухостой, Берёзовая роща.
- В `IconKind` добавлены: `tree-lone`, `tree-sparse`, `tree-dense`, `deadtree-sparse`, `deadtree-dense`, `birch`. `drawIcon` для tree/deadtree рефакторен с параметрами count/scale/spread/colors — все 8 case'ов идут через единый блок.
- Берёза рисуется отдельным алгоритмом: белый ствол `#d8d2bc` + тёмные горизонтальные полоски бересты.

## 2026-05-06 (день) — v0.9 (BREAKING)
- **Архитектурный рефактор биом ↔ тайл.** Прежняя модель (биом = категория палитры тайлов, тайлы привязаны к биому) была неверной. Правильная модель:
  - **Биом** — окружение/террейн, источник палитры фона. Полное `BiomeDef`: fill/fill2/fill3/glow/decoration. 14 биомов: Пустошь, Песок, Пепел, Лес, Хвойный лес, Сгоревший лес, Болото, Вода, Токс. вода, Горы, Пик, Обрыв, Радзона, Аномалия.
  - **Тайл** — feature/локация на гексе, биом-агностична. Слим `TileDef`: только icon/iconColor/iconColor2/glow?/decoration?. 28 тайлов: settlement/megacity/trader-post/diner/factory/slum, ruins/concrete/tower/gas/raider, mine/cave-entrance/quarry, debris/wreck/minefield/crater/graveyard, glowing-pool/mutated-flora/fungal-bloom, vault/vault-sealed/vault-open/bunker/bos-outpost/enclave-base.
  - **Cell** = `{ biomeId?, tileId?, label? }` — может содержать одно, другое или оба.
- **UX**: добавлен mode-toggle «Биом / Тайл» в Toolbar (выбирает что пишется кистью), добавлен dropdown активного биома. `paintMode` и `activeBiomeId` в mapStore.
- **Render**: новый порядок passes — biome layer (blob → texture в displaced clip → glow → lighting в clean clip) ниже tile layer (decoration → glow → icon).
- **TilePalette**: ungrouped flat list биомов (вверху) и тайлов (снизу). Превью тайла показывает иконку поверх **активного биома** — наглядно, как тайл будет выглядеть на текущем фоне. Биом превью — только биом без иконки.
- **JSON v3 + миграция v1/v2 → v3.** Старые `tileId` в cells мапятся: terrain-тайлы (wasteland/forest/water/mountain и пр.) → `biomeId`, feature-тайлы (settlement/vault/raider и пр.) → `tileId`. Удалённые варианты (salt-flats, dust-storm, birch-grove, lake, river-bend, coastline, radstorm, rocky-path) фолбэкаются на ближайший биом.
- **Удалено**: устаревший `drawHexFill`. Все рендерные функции теперь работают с `BiomeDef` или structural `PaintLayer`.
- Файлы: `src/tiles/types.ts`, `src/tiles/fallout.ts`, `src/store/mapStore.ts`, `src/components/HexGridCanvas.tsx`, `src/components/Toolbar.tsx`, `src/components/TilePalette.tsx`, `src/render/drawHex.ts`, `src/io/saveJson.ts`, `src/io/loadJson.ts`, `src/styles.css`.

## 2026-05-06 (утро следующего дня) — v0.8
- Добавлено: биомная архитектура. Введён тип `BiomeId` (7 биомов: wasteland / urban / irradiated / forest / mountain / water / vault) и `BIOMES` массив с базовым тоном каждого биома. Поле `biome: BiomeId` стало обязательным в `TileDef`.
- Добавлено: 26 новых тайлов, общее число 24 → **50**. Распределение:
  - **Пустоши** (10): + Солончак, + Пыльная буря к существующим 8.
  - **Поселения** (11): + Мегаполис, + Торговый пост, + Закусочная, + Завод, + Трущобы к существующим 6.
  - **Радиация** (5): + Рад. лужа, + Мутафлора, + Радиошторм к существующим 2.
  - **Леса** (6): + Хвойный лес, + Берёзы, + Сгоревший лес, + Грибной мутант к существующим 2.
  - **Горы** (7): + Пик, + Обрыв, + Скалистая тропа, + Пещера, + Карьер к существующим 2.
  - **Воды** (5): + Озеро, + Река, + Берег к существующим 2.
  - **Убежища** (6): + Запеч. убежище, + Откр. убежище, + БС-пост, + База Анклава к существующим 2.
- Стратегия для новых тайлов: переиспользование существующих `IconKind` (нет новых иконок), различие за счёт цвета палитры биома + decoration + glow. Цвета новых тайлов согласованы с muted-палитрой биома.
- Изменено: `TilePalette` теперь группирует тайлы по биомам с заголовками секций. Каждая секция показывает: цветную точку биома, имя, счётчик. Порядок секций фиксирован (`BIOMES` массив).
- Стили: добавлены `.biome-section`, `.biome-header`, `.biome-dot`, `.biome-count` в `src/styles.css`.

## 2026-05-06 (поздняя ночь) — v0.7
- Изменено: палитра 24 тайлов переведена в balanced muted стиль. Saturation снижена на 30–40%, lightness сохранена. Тёплые остаются тёплыми, холодные — холодными, но все приглушены до общего тонального диапазона. Карта теперь смотрится как одна выгоревшая местность с локальными вариациями, а не коллаж из ярких категорий.
- Изменено: glow alpha и colors для irradiated, vault, anomaly, toxic, water, raider, settlement приглушены — биом-свечения больше не «опознавательные знаки», а нативные подсветки.
- Изменено: ROAD_TYPES — оттенки highway centerLine и dirt/trail чуть приглушены под общую палитру.
- Изменено: unifying tint в drawScene ослаблен (multiply alpha 0.18→0.10, dark normal alpha 0.06→0.03) — теперь базовые цвета не «давятся» дополнительным overlay'ом, поскольку они уже muted сами по себе.
- Откат: удалены преждевременно добавленные `BiomeId` / `BiomeDef` / `BIOMES` из `src/tiles/types.ts` — биомная архитектура (формальная группировка) отложена до следующей итерации.

## 2026-05-06 — v0.6
- Добавлено: органичные шумовые границы между биомами. Соседние гексы разных типов теперь перетекают через изломанную «обкусанную» границу в стиле Worldographer — без зазоров и перекрытий. Технически: каждый заполненный гекс рендерится в displaced polygon (60 точек), точки которого смещены 2D-вектором шума, сэмплируемым в МИРОВЫХ координатах. Соседи на shared edge получают идентичные смещения. Углы рёбер канонизируются лексикографически и закрепляются маской `sin(πt)` — критично для 3-way junctions (стыков 3 биомов).
- Добавлено: процедурный апгрейд деталей внутри тайла:
  - Multi-layer stipple (3 слоя: крупные пятна `fill2`, средние `fill3`, мелкие точки) — текстура заметно богаче.
  - Decoration scatter (5 типов: `pebbles`, `cracks`, `specks`, `tufts`, `ripples`) — мелкие декоративные элементы per-biome.
  - Ambient glow overlay (`tile.glow`) — биомы со свечением (rad, vault, anomaly, water, settlement).
  - Drop shadow + soft highlight (`drawIconEnhanced`) поверх существующих иконок без правки их кода.
  - Усиленный vertical gradient в base fill + увеличенная vignette.
- Добавлено: 3 новых модуля рендера:
  - `src/render/noise.ts` — value noise + fbm + 2D noiseVec + детерминированные хеши.
  - `src/render/displaced.ts` — `displacedHexPolygon`, `getDisplacedPoly` (LRU-кэш на 5000 ключей), `withDisplacedHexClip`, `clearDisplacedCache`.
  - В `drawHex.ts` добавлены `drawHexFillRich`, `drawDecoration`, `drawIconEnhanced` (старые функции остались для палитры).
- Изменено: `TileDef` расширен полями `fill3`, `glow`, `decoration`. Заполнено для всех 24 тайлов в `fallout.ts`.
- Изменено: палитра использует `drawHexFillRich` + `drawIconEnhanced`, но в clean hex clip (без displaced) — на 52px wavy выглядит «помято».
- Изменено: контур сетки стал полупрозрачным `rgba(58,58,48,0.55)` — сетка как «логический» оверлей поверх изломанных границ.
- Производительность: кэш displaced-полигонов инвалидируется при смене `grid.hexSize` (через useEffect).

## 2026-05-06 — v0.5
- Изменено: модель дорог переработана. Теперь хранятся как `points: {x,y}[]` в мировых пикселях (раньше — массив axial-ключей `keys: string[]`). Это позволило отвязаться от центров гексов и решить фундаментальное ограничение pointy-top сетки (центры соседей не выровнены вертикально → невозможно нарисовать прямую дорогу через несколько гексов вверх).
- Добавлено: два режима рисования дорог, переключаются чекбоксом «Free-hand» в Toolbar:
  - **Snap (по умолчанию):** курсор притягивается к ближайшему характерному элементу текущего гекса (центр + 6 edge midpoints + 6 вершин = 13 кандидатов). E/W edge midpoints в pointy-top находятся точно на вертикальной оси соседних сверху гексов — это даёт натуральные прямые вертикальные дороги.
  - **Free-hand:** точки сэмплируются по движению мыши с порогом `hexSize * 0.12` (защита от тысяч точек за drag).
- Изменено: рендер дорог переведён на Chaikin smoothing (3 итерации, corner-cutting) вместо Catmull-Rom через bezierCurveTo. Даёт плавную линию без зигзагов между точками.
- Изменено: «Снять дорогу» теперь работает не «по гексу», а по близости курсора к линии (`point-to-segment` дистанция, радиус `hexSize * 0.5`). Точечная очистка любого участка.
- Добавлено: JSON-схема v2. Автомиграция v1 → v2 при загрузке: старые `keys: string[]` конвертируются в `points` через `axialToPixel` с `hexSize` сохранённой карты.

## 2026-05-04 (ночь) — v0.4
- Исправлено: дороги переведены на единую «spoke»-модель — каждый активный сосед = луч от центра к мидпойнту ребра. Убрана quadratic-кривая, создававшая U-дуги и «короны» при 2–6 соседях. Round lineCap/lineJoin делает ступицу гладкой для любого числа веток.

## 2026-05-04 (поздний вечер) — v0.3
- Изменено: дороги между двумя соседями теперь рисуются гладкой quadratic-кривой через центр (вместо ломаных лучей). Перекрёстки 3+ — по-прежнему лучи. Изолированный гекс-дорога — диск.
- Изменено: дорожные типы переработаны (шоссе с жёлтой солидной разметкой, ж/д как пунктир-«шпалы», убраны странные центр.линии у грунтовки/тропы).
- Добавлено: коллизия подписей — пересекающиеся pill-метки автоматически складываются вертикально (greedy AABB).
- Изменено: визуал тайлов значительно улучшен — radial vignette + light highlight + стипл-текстура с детерминированным per-cell seed; иконки переделаны (settlement = кластер домов, ruins = ломаная стена с аркой, mountain = две вершины с тенью и снегом, vault = ринг с болтами и V, gas = навес+колонка+«GAS», raider = палатка+пика со скальпом, mine = арочный вход+кирки, bunker = бетонный купол, wreck = ржавый авто, minefield = ⚠ знаки и т.д.).

## 2026-05-04 (вечер) — v0.2
- Изменено: рендер канваса переписан на единый `<Shape sceneFunc>` + viewport culling. Сняты лаги на больших картах.
- Добавлено: система дорог как соединений между соседними гексами (типы: шоссе, асфальт, грунтовка, тропа, ж/д). Инструменты «Дорога» и «Снять дорогу», выбор типа в Toolbar.
- Изменено: подписи вынесены на отдельный Konva-Layer поверх всего; рендерятся pill'ом с автошириной — больше не обрезаются гексом.
- Добавлено: расширена палитра (24 тайла Fallout) и переработаны иконки (детальнее).
- Удалено: `src/components/HexCell.tsx` (заменён нативным `src/render/drawHex.ts`).

## 2026-05-04 — v0.1
- Добавлено: скаффолд Vite + React + TypeScript.
- Добавлено: зависимости `react-konva`, `konva`, `zustand`, `file-saver`.
- Добавлено: каркас памяти проекта (`CLAUDE.md`, `docs/agent/*`).
- Добавлено: MVP редактора — hex math, рендер сетки, палитра Fallout (10 плейсхолдер-тайлов), покраска/стирание, undo/redo, инструмент подписей, save/load JSON, export PNG, тёмная Fallout-тема.
