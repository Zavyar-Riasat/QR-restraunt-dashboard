/**
 * DineHQ Desktop Auto-Updater Service
 * Powered by electron-updater for seamless OTA application updates.
 */

const { dialog, Notification, app } = require('electron');
const config = require('./config');

let autoUpdater = null;
try {
  const updaterModule = require('electron-updater');
  autoUpdater = updaterModule.autoUpdater;
} catch {
  // Optional in dev
}

class AutoUpdaterService {
  constructor() {
    this.mainWindow = null;
    this.isChecking = false;
  }

  init(win) {
    this.mainWindow = win;

    if (!autoUpdater) {
      console.info('[AutoUpdater] electron-updater module not loaded (normal in dev unpacked run).');
      return;
    }

    if (!config.get('autoUpdate', true)) {
      console.info('[AutoUpdater] Auto-updates disabled in config.');
      return;
    }

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    // Optional custom feed URL
    const feedUrl = config.get('updateFeedUrl');
    if (feedUrl && autoUpdater.setFeedURL) {
      try {
        autoUpdater.setFeedURL(feedUrl);
      } catch (e) {
        console.warn('[AutoUpdater] Could not set custom feed URL:', e.message);
      }
    }

    autoUpdater.on('checking-for-update', () => {
      console.log('[AutoUpdater] Checking for updates...');
      this.sendToRenderer('update:checking');
    });

    autoUpdater.on('update-available', (info) => {
      console.log('[AutoUpdater] Update available:', info.version);
      this.sendToRenderer('update:available', info);

      if (Notification.isSupported()) {
        new Notification({
          title: 'DineHQ Update Available',
          body: `Version ${info.version} is downloading in the background.`,
          icon: require('path').join(__dirname, '..', 'assets', 'icon.png'),
        }).show();
      }
    });

    autoUpdater.on('update-not-available', (info) => {
      console.log('[AutoUpdater] Up to date (version ' + (info?.version || app.getVersion()) + ').');
      this.sendToRenderer('update:not-available', info);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      this.sendToRenderer('update:download-progress', progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('[AutoUpdater] Update downloaded:', info.version);
      this.sendToRenderer('update:downloaded', info);

      dialog
        .showMessageBox(this.mainWindow || null, {
          type: 'info',
          buttons: ['Restart & Install Now', 'Later on Exit'],
          defaultId: 0,
          title: 'DineHQ Update Ready',
          message: `A new version of DineHQ (${info.version}) has been downloaded.`,
          detail: 'Would you like to restart the application now to apply the update?',
        })
        .then(({ response }) => {
          if (response === 0) {
            app.isQuitting = true;
            autoUpdater.quitAndInstall();
          }
        });
    });

    autoUpdater.on('error', (err) => {
      console.warn('[AutoUpdater] Update notice:', err.message);
      this.sendToRenderer('update:error', err.message);
    });

    // Check 10 seconds after launch, then every 4 hours
    setTimeout(() => {
      this.checkForUpdates();
    }, 10000);

    setInterval(() => {
      this.checkForUpdates();
    }, 4 * 60 * 60 * 1000);
  }

  sendToRenderer(channel, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  checkForUpdates() {
    if (!autoUpdater || !app.isPackaged) return;
    try {
      autoUpdater.checkForUpdates().catch((err) => {
        console.warn('[AutoUpdater] Check failed:', err.message);
      });
    } catch (err) {
      console.warn('[AutoUpdater] Error triggering check:', err.message);
    }
  }

  checkForUpdatesManual() {
    if (!autoUpdater || !app.isPackaged) {
      dialog.showMessageBox(this.mainWindow || null, {
        type: 'info',
        title: 'Check for Updates',
        message: 'You are running in development mode.',
        detail: `DineHQ Desktop v${app.getVersion()}. Updates are enabled in packaged builds.`,
        buttons: ['OK'],
      });
      return;
    }

    autoUpdater
      .checkForUpdates()
      .then((result) => {
        if (!result || !result.updateInfo) {
          dialog.showMessageBox(this.mainWindow || null, {
            type: 'info',
            title: 'Check for Updates',
            message: 'You have the latest version of DineHQ.',
            detail: `DineHQ v${app.getVersion()} is currently up to date.`,
            buttons: ['OK'],
          });
        }
      })
      .catch((err) => {
        dialog.showMessageBox(this.mainWindow || null, {
          type: 'warning',
          title: 'Update Check',
          message: 'Unable to check for updates right now.',
          detail: err.message,
          buttons: ['OK'],
        });
      });
  }
}

module.exports = new AutoUpdaterService();
