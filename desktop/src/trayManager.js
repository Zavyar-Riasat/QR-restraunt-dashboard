/**
 * System Tray Manager
 * Provides system tray icon and context menu for DineHQ:
 * - "Open DineHQ"
 * - "Mute Sound Alerts"
 * - "Start with Windows"
 * - "Check for Updates..."
 * - "Quit"
 */

const path = require('path');
const { app, Tray, Menu } = require('electron');
const windowManager = require('./windowManager');
const alertService = require('./alertService');

class TrayManager {
  constructor() {
    this.tray = null;
    this.mainWindow = null;
  }

  init(win, updater) {
    this.mainWindow = win;
    const trayIconPath = path.join(__dirname, '..', 'assets', 'tray-icon.png');

    this.tray = new Tray(trayIconPath);
    this.tray.setToolTip('DineHQ Kitchen & POS');

    this.updateContextMenu(updater);

    // Left-click / Double-click toggles or shows window
    this.tray.on('click', () => {
      this.toggleWindow();
    });

    this.tray.on('double-click', () => {
      this.showWindow();
    });
  }

  showWindow() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    if (this.mainWindow.isMinimized()) {
      this.mainWindow.restore();
    }
    this.mainWindow.show();
    this.mainWindow.focus();
  }

  toggleWindow() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    if (this.mainWindow.isVisible()) {
      this.mainWindow.hide();
    } else {
      this.showWindow();
    }
  }

  updateContextMenu(updater) {
    if (!this.tray) return;

    const isMuted = alertService.isMuted();
    const isAutoLaunch = windowManager.isStartWithWindowsEnabled();

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open DineHQ',
        click: () => this.showWindow(),
        icon: undefined,
      },
      { type: 'separator' },
      {
        label: 'Mute Sound Alerts',
        type: 'checkbox',
        checked: isMuted,
        click: (item) => {
          alertService.setMuted(item.checked);
          this.updateContextMenu(updater);
        },
      },
      {
        label: 'Start with Windows',
        type: 'checkbox',
        checked: isAutoLaunch,
        click: (item) => {
          windowManager.setStartWithWindows(item.checked);
          this.updateContextMenu(updater);
        },
      },
      { type: 'separator' },
      {
        label: 'Check for Updates...',
        click: () => {
          if (updater && typeof updater.checkForUpdatesManual === 'function') {
            updater.checkForUpdatesManual();
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Quit DineHQ',
        click: () => {
          app.isQuitting = true;
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  destroy() {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}

module.exports = new TrayManager();
