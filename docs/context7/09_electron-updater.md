# electron-updater

Context7 ID: `/electron-userland/electron-builder` (updater входит в состав)

## main process
```ts
import { autoUpdater } from 'electron-updater';

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('update-available', info => mainWin.webContents.send('upd-available', info));
autoUpdater.on('update-downloaded', info => mainWin.webContents.send('upd-downloaded', info));

app.whenReady().then(() => autoUpdater.checkForUpdatesAndNotify());

ipcMain.on('install-update', () => autoUpdater.quitAndInstall(false, true));
```

## Публикация (electron-builder.yml)
```yaml
publish:
  - provider: github
    owner: Syntiset
    repo: hex-mapmaker
```
```bash
GH_TOKEN=ghp_xxx npx electron-builder --publish always
```

## Провайдеры: github, generic (HTTP), s3

## Ограничения
- Без подписи .exe Windows SmartScreen ругается
- Private repo → токен на клиенте
