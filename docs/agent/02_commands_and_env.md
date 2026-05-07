# 02_commands_and_env.md

## Установка
- `npm install`

## Команды
- Dev: `npm run dev` (Vite, http://localhost:5173)
- Build: `npm run build` (`tsc -b && vite build`)
- Lint: `npm run lint`
- Preview production-сборки: `npm run preview`
- Typecheck отдельно: `npx tsc -b --noEmit`

## Переменные среды
- На текущий момент не используются.

## Платформенные нюансы
### Windows
- Проект работает в Windows из коробки. Используем npm, не yarn/pnpm.
- В Bash-командах для путей пользоваться Unix-стилем (`/c/Users/...`).

## Частые проблемы запуска
- Если порт 5173 занят — Vite сам поднимет следующий свободный.
- При проблемах с Konva/canvas в Node — мы не используем SSR, всё клиентское, проблем быть не должно.
