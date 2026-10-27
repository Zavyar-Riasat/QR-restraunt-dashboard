/**
 * Dineflow Desktop Application - Main Process
 * Electron wrapper for the Dineflow owner kitchen and POS dashboard.
 */

const path = require('path');
const { app, ipcMain, shell } = require('electron');
const config = require('./config');
const windowManager = require('./windowManager');
const trayManager = require('./trayManager');
const alertService = require('./alertService');
const printService = require('./printService');
const autoUpdaterService = require('./autoUpdater');

// 1. Enforce Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[Main] Another instance is already running. Quitting.');
  app.quit();
  process.exit(0);
}

let mainWindow = null;
const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

// 2. Focus existing window on second instance attempt
app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
});

function loadDashboard(win) {
  const targetUrl = config.getDashboardUrl(isDev);
  console.log(`[Main] Loading dashboard from: ${targetUrl}`);
  win.loadURL(targetUrl);
}

function loadOfflinePage(win, failedUrl) {
  const offlineHtmlPath = path.join(__dirname, 'offline.html');
  const targetParam = encodeURIComponent(failedUrl || config.getDashboardUrl(isDev));
  win.loadFile(offlineHtmlPath, {
    query: { url: targetParam },
  });
}

// 3. App Ready: Initialize all services & create window
app.whenReady().then(() => {
  console.log('----------------------------------------------------');
  console.log(`   Dineflow Desktop v${app.getVersion()} Starting...   `);
  console.log('----------------------------------------------------');

  // Create main window with persistent bounds
  mainWindow = windowManager.createMainWindow();

  // Initialize auto-launch ("Start with Windows") by default on first launch
  windowManager.initDefaultAutoLaunch();

  // Initialize order alerts & notifications
  alertService.init(mainWindow);

  // Initialize system tray icon and menu
  trayManager.init(mainWindow, autoUpdaterService);

  // Initialize USB attach/detach hardware monitoring
  printService.initUsbListeners(mainWindow);

  // Initialize OTA background updater
  autoUpdaterService.init(mainWindow);

  // Load the target dashboard URL
  loadDashboard(mainWindow);

  // 4. Handle Offline Network Failures
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    // -105 (NAME_NOT_RESOLVED), -106 (INTERNET_DISCONNECTED), -102 (CONNECTION_REFUSED), -118 (TIMED_OUT)
    const isNetworkError = [
      'ERR_INTERNET_DISCONNECTED',
      'ERR_NAME_NOT_RESOLVED',
      'ERR_CONNECTION_REFUSED',
      'ERR_CONNECTION_TIMED_OUT',
      'ERR_ADDRESS_UNREACHABLE',
      'ERR_NETWORK_CHANGED',
    ].some((term) => errorDescription.includes(term) || errorCode < -100);

    if (isNetworkError && !validatedURL.includes('offline.html')) {
      console.warn(`[Main] Network load failed (${errorDescription}), loading friendly offline screen.`);
      loadOfflinePage(mainWindow, validatedURL);
    }
  });

  // 5. Security: Navigation Restrictions
  // Allow navigation only to our domain/localhost. External links open in default browser.
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    if (navigationUrl.startsWith('file://')) {
      return; // Local offline fallback page
    }

    if (!config.isAllowedOrigin(navigationUrl)) {
      console.warn(`[Security] Blocked unauthorized internal navigation to: ${navigationUrl}`);
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  // Security: Window Open Handler (target="_blank" or window.open)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.log(`[Security] Opening external link in user's default browser: ${url}`);
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // IPC HANDLERS
  setupIpcHandlers();
});

function setupIpcHandlers() {
  // System Info
  ipcMain.handle('app:get-system-info', () => ({
    name: 'Dineflow Desktop',
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    electronVersion: process.versions.electron,
    isPackaged: app.isPackaged,
  }));

  // Printers List
  ipcMain.handle('printer:get-system-printers', async () => {
    return printService.getSystemPrinters(mainWindow?.webContents);
  });

  // Silent Print HTML
  ipcMain.handle('printer:print-system', async (_event, options) => {
    return printService.printHtmlSilent(options?.html, options);
  });
  ipcMain.handle('printer:print-silent', async (_event, options) => {
    return printService.printHtmlSilent(options?.html, options);
  });

  // Raw ESC/POS bytes (Network TCP 9100, Serial COM, USB)
  ipcMain.handle('printer:print-raw-escpos', async (_event, params) => {
    return printService.printRawEscPos(params || {});
  });

  // Alerts
  ipcMain.handle('alert:trigger-order', (_event, order) => {
    alertService.triggerNewOrderAlert(order);
    return { success: true };
  });

  ipcMain.handle('alert:stop', () => {
    alertService.stopAlarm();
    return { success: true };
  });

  ipcMain.handle('alert:is-muted', () => {
    return alertService.isMuted();
  });

  ipcMain.handle('alert:toggle-mute', () => {
    const muted = alertService.toggleMute();
    trayManager.updateContextMenu(autoUpdaterService);
    return muted;
  });

  // Windows Auto-Launch
  ipcMain.handle('window:is-auto-launch', () => {
    return windowManager.isStartWithWindowsEnabled();
  });

  ipcMain.handle('window:set-auto-launch', (_event, enabled) => {
    const ok = windowManager.setStartWithWindows(enabled);
    trayManager.updateContextMenu(autoUpdaterService);
    return ok;
  });

  // Window Controls
  ipcMain.handle('window:minimize-to-tray', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.hide();
    }
    return true;
  });

  // Reconnection from Offline Screen
  ipcMain.handle('app:retry-connection', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      loadDashboard(mainWindow);
    }
    return true;
  });

  // Updater
  ipcMain.handle('updater:check', () => {
    autoUpdaterService.checkForUpdatesManual();
    return true;
  });
}

// Quit when all windows are closed if on macOS or when explicitly quitting
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && app.isQuitting) {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  alertService.stopAlarm();
});
