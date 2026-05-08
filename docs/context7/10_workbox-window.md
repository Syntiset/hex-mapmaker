# workbox-window

Context7 ID: `/googlechrome/workbox`

## Регистрация и события
```js
import { Workbox } from 'workbox-window';

if ('serviceWorker' in navigator) {
  const wb = new Workbox('/sw.js');

  wb.addEventListener('waiting', () => {
    if (confirm('Доступно обновление! Перезагрузить?')) {
      wb.messageSkipWaiting();
      window.location.reload();
    }
  });

  wb.addEventListener('controlling', e => { if (e.isUpdate) location.reload(); });
  wb.register();
}
```

## vite-plugin-pwa
- Сменить `registerType: 'autoUpdate'` → `'prompt'`
- Подписаться на `waiting`

## Ограничения
- Только PWA (в Electron — electron-updater)
