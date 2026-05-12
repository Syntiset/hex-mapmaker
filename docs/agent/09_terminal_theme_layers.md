# 09_terminal_theme_layers.md

Карта слоёв и потока данных для темы **Terminal** (RobCo CRT).

## Z-stack в `.canvas-host` (от нижнего к верхнему)

```
canvas-host (DOM div, position: fixed, top: HEADER_H, ...)
│
├── Konva Stage (default stacking, без z-index)
│   └── Layer'ы с гекс-картой, дорогами, подписями
│
├── CRTOverlay <canvas>                          z-index: 3
│   └── WebGL фрагмент-шейдер
│       — берёт Konva как текстуру каждый RAF
│       — применяет: barrel дисторсию, chromatic aberration,
│                    scanlines, glow, vignette, inner-fade
│       — внутри [0,1]: пишет цвет (alpha = 1)
│       — снаружи [0,1]: пишет прозрачность (alpha = 0)
│
└── .terminal-screen-overlay                     z-index: 6
    │   (DOM-контейнер для всех CSS-декораций экрана)
    │
    ├── .terminal-screen-area                    z-index: 5
    │   │   (inset 3%, border-radius 8%, overflow:hidden)
    │   ├── .terminal-flicker                    (CSS mix-blend-mode: screen, мерцает 60Hz)
    │   └── .terminal-sweep                      (CSS keyframes 7s, полоса развёртки сверху-вниз)
    │
    ├── .terminal-bezel-frame                    z-index: 6
    │       (DOM-bezel сам по себе, заполняет всю площадь canvas-host,
    │        clip-path: path(evenodd, ...) — задаёт форму корпуса.
    │        clip-path рассчитывается в JS через barrelInverse + ResizeObserver.
    │        Внешний прямоугольник + внутренняя barrel-curve с evenodd fill-rule
    │        → bezel виден только в зоне корпуса, экран в центре прозрачный.)
    │
    └── .terminal-bezel                          z-index: 7
        │   (Слой декораций корпуса — всегда поверх frame'а)
        ├── .terminal-bezel-screw .tl/.tr/.bl/.br   (крестовые винты по углам)
        ├── .terminal-bezel-model                    (MODEL: TERMLINK-30, верх-центр)
        └── .terminal-bezel-brand                    (ROBCO INDUSTRIES, низ-центр)
```

Дополнительно, глобально на body:

| z-index | Что |
|---|---|
| **9999** | `body::before` — горизонтальные сканлайны через всю страницу (`mix-blend-mode: multiply`) |
| **10000** | `.terminal-boot` — boot-overlay при первой загрузке (один раз за сессию через `sessionStorage`) |

## Поток данных

```
Konva отрисовала кадр
       ↓
RAF в CRTOverlay копирует все <canvas> Layer'ов на offscreen 2D canvas
       ↓
Offscreen загружается как WebGL texture
       ↓
gl.drawArrays(TRIANGLE_STRIP, 0, 4) → фрагмент-шейдер для каждого пикселя:
       │
       ├── distort(v_uv) = v_uv + (v_uv - 0.5) * barrel * |v_uv - 0.5|²
       │
       ├── Если distort(uv) выходит за [0,1] → gl_FragColor.a = 0 (прозрачность)
       │
       └── Иначе → сэмпл текстуры с хроматикой + glow + scanlines + inner-fade
                  → gl_FragColor.rgb = обработанный цвет, .a = 1
       ↓
DOM-bezel-frame (z:6) накладывается поверх. clip-path с evenodd:
       │
       │  outer rect (0,0 → w,h) + inner barrel-curve
       │  evenodd: рендерится только зона МЕЖДУ outer и inner
       │  → bezel виден ТОЛЬКО в области корпуса, экран открыт
       ↓
DOM-decor (z:7): винты + MODEL + ROBCO поверх всего
```

## Inverse-coord transform (клики)

Когда юзер кликает по визуально-видимому хексу:

```
pointer event (x, y) на canvas-host
       ↓
Konva.Stage.getPointerPosition() — monkey-patched в CRTOverlay
       ↓
barrelForward(x, y, w, h, k) — точное JS-зеркало шейдера:
   ux = (x/w - 0.5)
   uy = (y/h - 0.5)
   r² = ux² + uy²
   shifted = (ux + ux*k*r², uy + uy*k*r²)
       ↓
Возвращаем (shifted.x * w, shifted.y * h) — точку в исходнике
       ↓
Konva получает координату того хекса, который ВИЗУАЛЬНО под курсором
(а не где он нарисован в исходнике до бочки)
```

## Размер DOM clip-path

`barrelInverse(ux, uy, k)` — Newton fixed-point iteration в `src/render/barrelPath.ts`:
- 8 итераций, сходится на 6-7 верных знаков
- Считается для 32 точек на каждой стороне квадрата `[0,1]` (всего 128 точек по периметру)
- Получается SVG-path `"M x1,y1 L x2,y2 ... Z"` в пикселях canvas-host
- `buildBezelClipPath(k, w, h)` собирает «outer rect + inner curve» с evenodd
- `inset = 1.2%` сжатие к центру — DOM-bezel чуть «налезает» на WebGL-curve чтобы закрыть тонкий стык между alpha-fade'ом шейдера и clip-path'ом

## Ключевые файлы

| Файл | Что делает |
|---|---|
| `src/render/CRTOverlay.tsx` | WebGL canvas + шейдер + RAF + monkey-patch getPointerPosition |
| `src/render/barrelPath.ts` | `barrelInverse()` + `buildBezelClipPath()` |
| `src/themes/terminal.tsx` | `TerminalScreenOverlay` — JSX-структура слоёв + ResizeObserver |
| `src/themes/types.ts` | `ThemeDecorations` интерфейс со слотами |
| `src/themes/registry.ts` | Регистрация темы + `useThemeDecorations` хук |
| `src/styles.css` | Все CSS-стили `[data-theme="terminal"]`, `.terminal-*` классы |

## Параметры шейдера (CRTOverlay props)

- `barrel = 0.35` — сила бочки. Влияет на размер «корпуса» вокруг экрана.
- `chromatic = 0.003` — амплитуда RGB-сдвига.
- `scanline = 0.14` — глубина сканлайнов.

Если меняешь `barrel` — также автоматически пересчитывается clip-path DOM-bezel'а через `useMemo`, эти значения должны совпадать.
