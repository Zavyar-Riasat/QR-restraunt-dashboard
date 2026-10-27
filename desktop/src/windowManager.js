/**
 * Window State and Lifecycle Manager
 * Handles size/position persistence, single-instance verification,
 * tray-minimize interception, and Windows auto-launch.
 */

const fs = require('fs');
const path = require('path');
const { app, screen, BrowserWindow } = require('electron');
const config = require('./config');

class WindowManager {
  constructor() {
    this.stateFilePath = path.join(app.getPath('userData'), 'window-state.json');
    this.state = this.loadState();
    this.saveTimeout = null;
  }

  loadState() {
    const defaultState = {
      width: 1360,
      height: 860,
      x: undefined,
      y: undefined,
      isMaximized: false,
    };

    try {
      if (fs.existsSync(this.stateFilePath)) {
        const saved = JSON.parse(fs.readFileSync(this.stateFilePath, 'utf8'));
        // Validate if saved coordinates are visible on an active display
        if (saved.x !== undefined && saved.y !== undefined) {
          const visible = screen.getAllDisplays().some((display) => {
            const { x, y, width, height } = display.bounds;
            return (
              saved.x >= x - 50 &&
              saved.x < x + width &&
              saved.y >= y - 50 &&
              saved.y < y + height
            );
          });
          if (!visible) {
            saved.x = undefined;
            saved.y = undefined;
          }
        }
        return { ...defaultState, ...saved };
      }
    } catch (err) {
      console.warn('[WindowManager] Failed to load window state:', err.message);
    }

    return defaultState;
  }

  saveState(win) {
    if (!win || win.isDestroyed()) return;

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      try {
        if (!win.isDestroyed()) {
          const isMaximized = win.isMaximized();
          if (!isMaximized) {
            const bounds = win.getBounds();
            this.state.x = bounds.x;
            this.state.y = bounds.y;
            this.state.width = bounds.width;
            this.state.height = bounds.height;
          }
          this.state.isMaximized = isMaximized;
          fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2), 'utf8');
        }
      } catch (err) {
        console.warn('[WindowManager] Failed to save window state:', err.message);
      }
    }, 400);
  }

  createMainWindow() {
    const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');

    const win = new BrowserWindow({
      width: this.state.width,
      height: this.state.height,
      x: this.state.x,
      y: this.state.y,
      minWidth: 1024,
      minHeight: 700,
      title: 'Dineflow Kitchen & POS Command Center',
      backgroundColor: '#FFFDF9',
      show: false, // Show gracefully on ready-to-show
      icon: iconPath,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        spellcheck: false,
      },
    });

    if (this.state.isMaximized) {
      win.maximize();
    }

    win.once('ready-to-show', () => {
      win.show();
      win.focus();
    });

    // Save bounds on resize and move
    ['resize', 'move', 'close'].forEach((evt) => {
      win.on(evt, () => this.saveState(win));
    });

    // Intercept close event: minimize to system tray instead of closing app
    win.on('close', (event) => {
      if (!app.isQuitting) {
        event.preventDefault();
        win.hide();
        console.log('[WindowManager] Window minimized to system tray.');
      }
    });

    return win;
  }

  // -------------------------------------------------------------
  // Windows Auto-Launch ("Start with Windows")
  // -------------------------------------------------------------
  isStartWithWindowsEnabled() {
    try {
      const settings = app.getLoginItemSettings();
      return Boolean(settings.openAtLogin);
    } catch {
      return false;
    }
  }

  setStartWithWindows(enable) {
    try {
      app.setLoginItemSettings({
        openAtLogin: Boolean(enable),
        path: process.execPath,
        args: ['--hidden'],
      });
      config.saveUserSetting('startWithWindows', Boolean(enable));
      console.log(`[WindowManager] Start with Windows set to: ${enable}`);
      return true;
    } catch (err) {
      console.warn('[WindowManager] Failed to set auto-launch:', err.message);
      return false;
    }
  }

  initDefaultAutoLaunch() {
    // If not configured yet, set to true by default
    const savedSetting = config.get('startWithWindows', null);
    if (savedSetting === null || savedSetting === true) {
      this.setStartWithWindows(true);
    }
  }
}

module.exports = new WindowManager();
