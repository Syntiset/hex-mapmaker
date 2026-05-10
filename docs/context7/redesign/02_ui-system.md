# Тема 2 — система UI компонентов

Источники: shadcn-ui/ui, mantinedev/mantine, radix-ui/primitives (Context7)

## Контекст
React 19 + Vite, dark theme + зелёный акцент, моноширинный шрифт, голый CSS. Планируются темы (Fallout / medieval / cyberpunk).

## Вариант A — shadcn/ui
CLI копирует компоненты прямо в `src/components/ui/`. Tailwind v4 + Radix под капотом. Темизация через CSS custom properties в globals.css.

**Установка:** `npx shadcn@latest init -t vite` → `npx shadcn@latest add button select tooltip ...`

**Плюсы:** полное владение кодом, гибкость стилей, нативная темизация через CSS vars.
**Минусы:** Tailwind utility-first требует привыкания, поддержка компонентов на нас, нет "переключателя тем" из коробки.

## Вариант B — Mantine
Полноценная библиотека: 100+ компонентов, 70+ хуков. `MantineProvider` + `createTheme`. Авто-генерация CSS variables (`--mantine-color-*`).

**Темизация:**
```tsx
const falloutTheme = createTheme({ colors: { brand: ['#...', ...10 shades] }, primaryColor: 'brand' });
<MantineProvider theme={falloutTheme} defaultColorScheme="dark">...</MantineProvider>
```
`useMantineColorScheme()` для runtime смены.

**Установка:** `npm i @mantine/core @mantine/hooks` + `import '@mantine/core/styles.css'`

**Плюсы:** AppShell, NavLink, ActionIcon, Tooltip, Select, Modal, Notifications — всё из коробки. Нет Tailwind. Runtime theme switching.
**Минусы:** ~100 KB gzip, стиль "modern" нейтральный (может конфликтовать с постап-стилем), CSS specificity battles при кастомизации, глобальные CSS сбросы.

## Вариант C — Radix UI (headless)
Только примитивы без стилей. Лучшая accessibility (ARIA, keyboard, focus trap).
**Минусы:** все стили на нас, нет AppShell/Sidebar (только Dialog/Select/Tabs), много кода на каждый компонент.
**Вердикт:** хороший фундамент, но медленно для нашего темпа.

## Вариант D — Tailwind alone
Utility-CSS + темизация через CSS variables. Без компонентов.
**Вердикт:** имеет смысл только в связке с shadcn/ui.

## Вариант E — Чистый CSS + design tokens
Продолжение текущего подхода: CSS custom properties как design tokens.
**Плюсы:** ноль deps, полный контроль.
**Минусы:** нет готовых компонентов, нет accessibility из коробки.

## Итоговая рекомендация
**Mantine** — для нашего проекта быстрее всего даст результат:
1. 100+ готовых компонентов (сайдбар, кнопки, тултипы, селекты — уже готовы).
2. Runtime смена темы через разный `createTheme`.
3. CSS variables `--mantine-color-*` переопределяемы.
4. Vite + React 19 нативная поддержка.

**Альтернатива:** shadcn/ui если хочется владеть кодом компонентов и Tailwind не пугает.
