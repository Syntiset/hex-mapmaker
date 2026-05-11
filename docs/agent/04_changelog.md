# 04_changelog.md

## 2026-05-11 — v1.7.0.0.0 — Theme registry, Terminal CRT тема, WebGL пост-эффект

### Theme registry (`src/themes/`)

- **`types.ts`:** интерфейсы `ThemeDecorations` (слоты `ScreenOverlay`, `FooterRightExtras`, `BootSequence`) и `ThemeDef`. Открыт для расширения новыми слотами.
- **`registry.ts`:** массив `THEMES` (default / night / fallout / terminal). Хук `useThemeDecorations()` отдаёт декорации текущей темы из стора. Каждая тема может иметь опциональный объект `decorations` с React-компонентами.
- **`terminal.tsx`:** 3 декорационных компонента — `TerminalScreenOverlay` (CRT flicker + sweep-полоса развёртки), `TerminalPowerLED` (янтарная пульсирующая LED у правого края футера), `TerminalBootSequence` (одноразовая boot-последовательность RobCo с печатью построчно, dismiss кликом или таймером, состояние в `sessionStorage`).
- **App.tsx** рендерит слоты из реестра — у тем без декораций ничего не появляется. HelpModal читает темы из реестра вместо локального массива (4 карточки автоматически).
- **`AppTheme` type** расширен: `"default" | "night" | "fallout" | "terminal"`.

### Fallout тема — декорации

- L-скобы в углах хедера/навбара (`--fo-bracket-tl/tr/bl`), вертикальная цепочка заклёпок на правом краю сайдбара (`--fo-rivet`), жёлто-чёрная hazard-полоса по верху футера (`--fo-hazard`). Реализовано через `multi-background` поверх существующего градиента — НЕ трогает `position: fixed` который Mantine выставляет на header/navbar/footer (предыдущая попытка через `::before` его сломала).

### Terminal тема — CRT-стилизация

- **Цветовая палитра:** фосфорно-зелёный (`#88ff60`), металл-олива для корпуса (`#1c2418`), янтарь для LED (`#f8d840`).
- **Корпус UI** (header/navbar/footer): эмбосс-градиент (светлый верх → тёмный низ), вертикальная вентиляция по центру хедера, 4 круглых металлических knob в углах сайдбара (SVG с радиальным градиентом и насечкой), 3 заклёпки между правыми knob.
- **Канвас как CRT-экран** через WebGL пост-эффект (см. ниже).

### WebGL CRT пост-эффект (`src/render/CRTOverlay.tsx`)

- **Шейдер:** бочкообразная дисторсия (`barrel=0.12`, формула `uv + c * barrel * r2`), хроматическая аберрация (R/G/B сэмплятся со сдвигом по `c * chromatic`), сканлайны через `sin(uv.y * res.y * 1.4)`, фосфорный glow на ярких пикселях (`pow(max(col-0.6, 0), 2) * 0.6`), мягкая виньетка. Прозрачные пиксели источника композитятся с `u_bg = #040a04` чтобы не выходить как 100% opaque (Konva unifying tint рисует sand с alpha 0.10 на весь viewport — без альфа-blend в шейдере это давало полосу sand при painting).
- **Pipeline:** оверлейная `<canvas>` поверх HexGridCanvas, в RAF собирает все Konva-Layer canvas'ы через `drawImage` на offscreen composite-canvas, загружает как WebGL texture, рисует фул-скрин квад с шейдером.
- **Inverse coord transform (вариант Б из обсуждения):** monkey-patch `stage.getPointerPosition` применяет `barrelForward(x, y, w, h, k)` — точное JS-зеркало формулы шейдера. Клики ловятся ровно по тому хексу, который визуально под курсором. Без патча клики бы попадали в исходные (unwarped) координаты — расхождение до ~10px у углов.
- **Активность:** только когда `theme === "terminal"`, иначе компонент возвращает `null`.

### Багфиксы из этого цикла

- **Скролл навбара:** `AppShell.Section grow component={ScrollArea}` — длинный список тайлов больше не вылезает за пределы навбара на статусбар.
- **Zoom-overlay положение:** перенесён из `canvas-host` в корень AppShell с `position: fixed`. Mantine.Main растянут на весь viewport (header/footer у него `position: fixed` сверху), `inset: 0` на canvas-host попадал в viewport — overlay с `bottom: 12` оказывался поверх футера.
- **Canvas-host позиционирование:** `position: fixed` с явными `top: HEADER_H`, `left: NAVBAR_W * sidebarOpen`, `right: 0`, `bottom: FOOTER_H` — теперь canvas занимает ровно видимую область между UI-планками, скругление визуально работает.
- **ResizeObserver вместо useEffect-на-sidebarOpen:** Konva ловит каждый кадр CSS-анимации сворачивания сайдбара, не остаётся с устаревшим размером (был баг «справа кусок карты отрезается»).
- **StatusBar переписан:** `Box` + `Divider` + flex-spacer вместо вложенных `Group` с `c="dimmed"` — левые айтемы (tool / hex / tile) теперь не теряются за хинтом и Помощью.
- **Burger в TopBar:** замена невидимого ActionIcon в Main на штатный Mantine `Burger` слева в хедере.
- **TopBar layout:** `NumberInput` без labels (теперь инлайн `Text` рядом) — всё помещается в 44px высоты header'а.
- **PWA + dist:** убрана временная папка `tmp/` из git, добавлена в `.gitignore`.

### Playwright self-check (`scripts/`)

- `screenshot.mjs` — снимает страницу с заданной темой/областью клипа.
- `screenshot-noboot.mjs` — то же, но c пред-проставленным `sessionStorage` чтобы boot-overlay не показывался.
- `annotate-zoom.mjs` — рисует красные круги на углах canvas-host для визуальной верификации скругления/искажений.
- `debug-radius.mjs`, `debug-overflow.mjs`, `test-collapse.mjs`, `test-paint.mjs` — диагностические скрипты для расследования багов с layout и фильтрами.

### Размер бандла v1.7.0.0.0

- JS: 944 KB (gzip 288 KB) — Mantine + WebGL overlay + theme registry
- CSS: 220 KB (gzip 32 KB) — добавились декорации тем (SVG data URIs внутри CSS)

## 2026-05-10 — v1.6.0 — Mantine UI

- **Mantine** установлен (`@mantine/core`, `@mantine/hooks`, `@mantine/notifications`, `@mantine/modals`). `MantineProvider` оборачивает приложение в `src/main.tsx`, `defaultColorScheme="dark"`, кастомные цветовые шкалы `wasteland` и `radiation` (зелёный/жёлтый под текущий стиль).
- **`src/ui/mantineTheme.ts`:** `createTheme` + `cssVariablesResolver`, который мапит `--mantine-color-body/text/default/dark-*` на наши `--bg/--panel/--border/--text` — темы (`data-theme="night|fallout"`) каскадом проникают в Mantine компоненты без отдельной настройки на тему.
- **Layout:** `App.tsx` переписан на `AppShell` (Header 44px / Navbar 300px / Footer 30px / Main). `useEffect` для resize слушает `sidebarOpen` чтобы canvas пересчитал размер при сворачивании сайдбара.
- **TopBar:** `Group` + `Divider` с зонами; `NumberInput` для cols/rows; `Menu` для Недавних (вместо самописного dropdown с outside-click); `Button`/`ActionIcon`/`Tooltip`. Подтверждение «потерять работу» — через `modals.openConfirmModal`. Сообщения «сохранено / открыто / экспорт» — через `notifications.show` (top-right, auto-close).
- **Toolbar:** `SegmentedControl` для Биом/Тайл (вместо ручного toggle), `SimpleGrid` 2×N для инструментов с `Tooltip` на каждом, `Select` для типа дороги (с `withinPortal` чтобы не обрезалось сайдбаром), `Switch` для free-hand/grid.
- **TilePalette:** `SimpleGrid 4` для биомов, `Tabs variant="pills"` для категорий тайлов, `ScrollArea.Autosize` для длинного списка, `HoverCard` для превью (replace ручного `hover-preview` div + long-press logic).
- **StatusBar:** `Group` с разделителями, `Text` цветовыми токенами Mantine, `Button variant="subtle"` для «? Помощь».
- **HelpModal:** `Modal` с `Tabs` (desktop/touch/themes), `Kbd` для горячих клавиш, `Alert` для warning'ов, `SimpleGrid` для theme-card.
- **styles.css:** убраны устаревшие классы (`.topbar`, `.toolbar`, `.tile-btn`, `.modal-*`, `.statusbar-*`, `.recent-menu`, `.hover-preview`, `.help-row`). Остались CSS-переменные тем + переопределения `.mantine-AppShell-header/navbar/footer` под текущий военный стиль и fallout-декорации (двойная граница, scanlines `body::before`).
- **Размер бандла:** JS 940 KB (gzip 287), CSS 212 KB (gzip 31). Прирост ~250 KB JS / ~200 KB CSS — стоимость Mantine.

## 2026-05-09 — v1.5.2 — Система тем + редизайн UI

- **Система тем:** `src/store/themeStore.ts` — zustand + persist. Три темы: `default` (военный тёмный), `night` (синий, для игры в темноте), `fallout` (CRT-зелень, scanlines, ржавые границы). Переключение в «? Помощь» → вкладка «🎨 Темы». Тема сохраняется в localStorage, восстанавливается при загрузке.
- **CSS темы:** `[data-theme="night"]` и `[data-theme="fallout"]` через CSS variables. Fallout: двойная граница topbar/statusbar с ржавым отливом, scanlines `::before` overlay, более яркий accent glow.
- **Редизайн UI:** полный рерайт `styles.css`. Стиль — military angular (`--radius: 1px`). TopBar разбит на зоны с разделителями (бренд | размер+новая | файлы | отмена/повтор). Toolbar: режим как pill-переключатель сверху, инструменты в 2-колоночной сетке с символьными иконками. Сайдбар 280px. Секции палитры с заголовками `БИОМЫ ────`. StatusBar: плашки с разделителями. Tile list: левый accent-border на активном.

## 2026-05-08 — v1.5.1 — Новые иконки убежищ (vault gear)

- **`vault` / `vault-sealed` / `vault-open`:** иконки переработаны с нуля. Шестерня рисуется Canvas2D — 9 прямоугольных зубьев (каждый отдельным замкнутым путём, промежутки прозрачны), 9 спиц, 9 болтов на кольце, тёмный диск лица, золотая «V» в центре. Прежний drop-shadow круг `#111` под шестернёй удалён — он просвечивал через прозрачные зазоры между зубьями.
- **`vault-sealed`:** та же шестерня с alpha 0.7 + цепи крест-накрест + замок по центру. Перенесён в общий `case`-блок с `drawVaultGear`, старый мёртвый код удалён.
- **`vault-open`:** тёмный туннель слева + шестерня сдвинута вправо и повёрнута. Лишний `case "vault-open"` (дублировался ниже) удалён.
- **Ржавые варианты:** добавлены три новых тайла — `vault-rusted`, `vault-sealed-rusted`, `vault-open-rusted`. Те же иконки, но градиент шестерни и лица в рыжем диапазоне (`#7a3010` → `#4a1a06`), `iconColor` ржавый `#c04a0a`. Определение через `tile.id.includes("rusted")` без дублирования кода рисования.

## 2026-05-07 — v1.5.0 — Electron .exe + PWA-обёртка

Web-приложение теперь можно запускать как нативное Windows-приложение и устанавливать как PWA на любом устройстве с современным браузером.

- **Electron desktop:** `electron/main.cjs` — главный процесс (BrowserWindow 1400×900, sandbox+contextIsolation+nodeIntegration:false, dev/prod ветка по `app.isPackaged`). Меню скрыто (`autoHideMenuBar: true`). В dev — грузит `http://localhost:5173` + DevTools; в prod — `dist/index.html` локально.
- **Сборка:** `electron-builder` с двумя target'ами: NSIS installer и portable. Артефакты в `release/`. Output:
  - `Hex Map Maker-X.X.X-x64.exe` (NSIS, ~100 МБ)
  - `Hex Map Maker-X.X.X-portable.exe` (single file, ~100 МБ)
  Code-sign не настроен — Windows SmartScreen покажет «Unknown publisher» при первом запуске.
- **Скрипты:**
  - `npm run electron:dev` — concurrently запускает Vite dev + Electron, ждёт через `wait-on http://localhost:5173`. Hot reload работает в Electron-окне.
  - `npm run electron:pack` — сборка в `release/win-unpacked/` без installer (для дебага).
  - `npm run electron:build` — полная сборка installer + portable.
- **PWA:** добавлен `vite-plugin-pwa` с `registerType: 'autoUpdate'`, manifest (`favicon.svg` как иконка для всех размеров через `purpose: 'any maskable'`), service worker от Workbox. На Chrome/Edge desktop появится кнопка «Установить приложение», на Android Chrome — «Добавить на главный экран» (поведение fullscreen-PWA, оффлайн через precache).
- **Vite config:** `base: './'` — относительные пути в build, чтобы тот же `dist/` грузился из `file://` (Electron) и из любого статичного хостинга.
- **package.json:** version `0.0.0 → 1.4.2`, добавлены `main`, `description`, `author`, секция `build` для electron-builder.
- **`.gitignore`:** добавлены `release/` (артефакты Electron) и `dev-dist/` (PWA dev SW).

## 2026-05-07 — v1.4.2 — Кнопка помощи в StatusBar, x2 vegetation, фикс микросетки

- **Help-кнопка в StatusBar:** `helpOpen` поднят в `App.tsx`, `HelpModal` рендерится один раз там же. `TopBar` и `StatusBar` получают `onOpenHelp` пропом. В StatusBar убрана текстовая подсказка про «полный список», вместо неё кнопка «? Помощь» справа после хинтов.
- **iconScale в `TileDef`:** добавлено опциональное поле, по умолчанию 1. В `tileSprite.buildSprite` margin спрайта масштабируется на `iconScale` (чтобы иконка не вышла за canvas), и `drawIconEnhanced` вызывается с `size * iconScale`. На 9 тайлах (`lone-tree`, `sparse-grove`, `grove`, `dense-forest`, `dead-grove`, `dense-deadwood`, `birch-cluster`, `mutated-flora`, `fungal-bloom`) выставлено `iconScale: 2` — деревья/грибы стали в 2× крупнее и читаемее.
- **Микро-сетка между гексами:** на швах был виден тёмный hairline — антиалиас хекс-клипа в спрайте давал ~50% alpha на самом ребре, под которым просвечивал BG `#262620`. Фикс: BG-pass в `drawScene` теперь рисует **per-cell**: каждая клетка получает фон с собственным `biome.fill` (или дефолт для пустых), хекс инфлейтнут на `+0.5` — соседние BG-фоны перекрываются на ~1px, шов вместо тёмного фона показывает биом-цвет соседа. Спрайт-клип сам остался ровно на `size` (никаких bleed'ов).

## 2026-05-07 — v1.4.1 — Симметричное смешение биомов + аккуратный stipple

Большой пересмотр рендера биомов на стыках после долгого диагноза асимметрии переходов (ранее: blob N/W перетекал в соседа, S/E — нет, из-за row-major порядка отрисовки и glow-margin без хекс-клипа).

- **`biomeSprite.ts`:** добавлен Pass 0 — solid `biome.fill` под клиппингом hex shape. Раньше внутри спрайта между stipple-точками был **прозрачный фон**, через который соседи Pass 1-blob'а просвечивали асимметрично. Теперь каждый гекс — плотно непрозрачный «остров» собственного цвета.
- **Pass 1 blob удалён.** Был источником асимметрии (один цвет затирал другой при overlap). Базовый цвет теперь полностью внутри спрайта.
- **`drawNeighbourTint` + Pass 3 (новое):** для каждого биом-гекса по всем 6 сторонам, если у соседа другой биом — рисуется радиальная капля **внутри собственного гекса** (clip к pathHex), цветом **соседа**, центр смещён на `0.7*size` к ребру, радиус `0.7*size`, alpha до `0x50`. Симметрично по конструкции (каждый гекс отвечает за свою половину перехода). Никаких прямоугольных strip'ов → нет угловых артефактов и треугольников, которые были в неудачных попытках.
- **`drawHexGlow` вынесен из спрайта в Pass 4 runtime** после всех биом-операций. Раньше был в `buildSprite` без хекс-клипа → glow поздно-нарисованной клетки видна на ранних соседях, у поздних — затирается. Теперь рисуется поверх всего одинаково во все стороны.
- **`dotFitsInHex` (новое):** хелпер проверки «помещается ли круг радиуса `r` целиком в pointy-top hex с апофемой `a`». 3 неравенства проекций на нормали рёбер с margin `(a - r)`. Применён в `stippleLayer` (3 слоя точек) и во всех 5 типах `drawDecoration` (pebbles, cracks, specks, tufts, ripples). Точки/декорации, которые НЕ помещаются целиком, пропускаются (`continue`) → больше нет половинок и обрубков на швах гекса.

### Что НЕ делалось в этой итерации
- Иконки тайлов (`drawIcon`/`drawIconEnhanced`) — там обрезов user не отметил, оставлены как есть.
- Cracks (трещины) — pathlength может превышать апофему, для них margin консервативный `0.35*size`, но трещина может всё равно выйти за гекс. Если бросится в глаза — отдельной итерацией.

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
