# 07_handoff.md

## Что было сделано (последняя сессия, 2026-05-07 v1.1.0)

**Wavy/displaced функционал удалён целиком.**

После v1.0.0 (per-cell sprite cache) пошла серия итераций (v1.0.6–v1.0.15) пытаясь починить визуальные артефакты на стыках биомов: «обрезанные» точки, «отъедание» одного биома другим, светлые полосы вдоль швов. Каждая фикса перемещала проблему в другое место. Корень был в **двунаправленной wavy-границе** (vector noise) + sample-vs-clip mismatch (см. ISSUE-003 в `06_known_issues.md` для подробного разбора).

После force-push отката до v1.0.5 (`ab1ad98`) и нескольких попыток фикса (sample-в-полигоне, inward-only wavy) пришли к выводу: wavy не оправдывает сложности. **Удалён модуль целиком.**

Что удалено:
- `src/render/displaced.ts` — модуль удалён физически
- `pointInPolygon`, `sampleInWavyPolygon`, `sampleInSafeHex`, `sampleArea` в `drawHex.ts`
- `EDGE_TO_NEIGHBOR_OFFSET` / `clearDisplacedCache` импорты
- `neighborMask` вычисление в `drawScene`
- `mask` поле в sprite cache key

Что вернулось/упрощено:
- Чистые шестиугольные рёбра гексов
- Soft blob blending: runtime `drawBiomeBlob` (radial gradient до 1.25*size с alpha falloff) перетекает в соседей
- Stipple/decoration — простой rectangular sampling
- Sprite cache: `(biomeId, q, r, hexSize)`

## На чём остановились
- v1.1.0 коммит, push на `origin/main`, бэкап локально перед чисткой
- Сборка зелёная, ждём подтверждения визуала на тесте

## Что проверить следующим шагом
1. `npm run dev` — нарисовать карту со смесью биомов, убедиться: рёбра ровные шестиугольные, цвета соседей мягко перетекают через blob alpha falloff
2. Производительность: `~50×50` карта, pan/zoom — без лагов (sprite cache работает)
3. Save/load JSON v3 — round-trip чистый
4. Палитровые превью (биомы и тайлы в сайдбаре) — без артефактов

## Backlog (что можно делать дальше)
- Расширение функционала: тонкие настройки blob radius / alpha (в `drawBiomeBlob` хардкод сейчас)
- Реальные художественные тайлы (PNG-ассеты вместо процедурных) — отдельная итерация
- Слои / Fog of War для показа игрокам
- Кисть размером > 1
- Импорт фоновой картинки и наложение прозрачной hex-сетки сверху

## Полезные файлы
- `src/render/drawHex.ts` — все рендер-функции, decoration switch
- `src/render/biomeSprite.ts` — sprite cache, чистая архитектура без wavy
- `src/render/noise.ts` — низкоуровневый шум (используется для hash в stipple)
- `src/components/HexGridCanvas.tsx` — drawScene, biomes/tiles разделены
- `src/tiles/fallout.ts` — палитра 14 биомов + 35 тайлов
- `docs/agent/06_known_issues.md` — ISSUE-003 разбор wavy-сериала (для будущей справки если когда-то снова захочется)
