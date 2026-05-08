# react-hotkeys-hook

Context7 ID: `/johannesklauss/react-hotkeys-hook`

## Базовый хук
```tsx
import { useHotkeys } from 'react-hotkeys-hook';

useHotkeys('ctrl+s, meta+s', (e) => { e.preventDefault(); saveMap(); });
useHotkeys(['b', 'e', 'r'], (_, h) => setTool(h.keys.join('')));
useHotkeys('z', undo, { enabled: !isDrawing });
useHotkeys('escape', closeModal, { enableOnFormTags: ['INPUT'] });
```

## Опции
- `enabled` (bool|fn), `scopes`, `preventDefault`, `keyup/keydown`
- `enableOnFormTags` — работа в input

## Преимущества
- Декларативно, без глобального реестра
- TS нативно, scopes для модалок
