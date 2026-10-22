/**
 * DineHQ Desktop Secure Preload Script
 * Exposes a sandboxed, promise-based API using contextBridge.
 * Follows Electron security best practices:
 * - contextIsolation: true
 * - nodeIntegration: false
 * - No raw Node/Electron objects exposed to renderer
 */

const { contextBridge, ipcRenderer } = require('electron');

const desktopAPI = {
  isDesktop: true,
  isElectron: true,

  // 1. System Info
  getSystemInfo: () => ipcRenderer.invoke('app:get-system-info'),

  // 2. Printer Management (Silent printing & raw ESC/POS)
  getSystemPrinters: () => ipcRenderer.invoke('printer:get-system-printers'),
  getPrinters: () => ipcRenderer.invoke('printer:get-system-printers'),
  printSystem: (options) => ipcRenderer.invoke('printer:print-system', options),
  printSilent: (options) => ipcRenderer.invoke('printer:print-silent', options),
  printRawEscPos: (params) => ipcRenderer.invoke('printer:print-raw-escpos', params),

  // 3. Hardware USB event subscriptions
  onUsbDeviceChanged: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('printer:usb-device-changed', handler);
    return () => ipcRenderer.removeListener('printer:usb-device-changed', handler);
  },

  // 4. Alerts & Notifications
  triggerNewOrderAlert: (order) => ipcRenderer.invoke('alert:trigger-order', order),
  stopAlertSound: () => ipcRenderer.invoke('alert:stop'),
  isSoundMuted: () => ipcRenderer.invoke('alert:is-muted'),
  toggleSoundMute: () => ipcRenderer.invoke('alert:toggle-mute'),

  // 5. Windows Auto-Launch & Window Control
  isStartWithWindows: () => ipcRenderer.invoke('window:is-auto-launch'),
  setStartWithWindows: (enabled) => ipcRenderer.invoke('window:set-auto-launch', enabled),
  minimizeToTray: () => ipcRenderer.invoke('window:minimize-to-tray'),

  // 6. Offline Screen & Connection
  retryConnection: () => ipcRenderer.invoke('app:retry-connection'),

  // 7. Auto-Update Lifecycle
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  onUpdateStatus: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const channels = [
      'update:checking',
      'update:available',
      'update:not-available',
      'update:download-progress',
      'update:downloaded',
      'update:error',
    ];
    const listeners = channels.map((channel) => {
      const handler = (_event, data) => callback({ status: channel.replace('update:', ''), data });
      ipcRenderer.on(channel, handler);
      return { channel, handler };
    });
    return () => {
      listeners.forEach(({ channel, handler }) => ipcRenderer.removeListener(channel, handler));
    };
  },
};

// Expose on both modern and legacy namespaces for seamless compatibility
contextBridge.exposeInMainWorld('dinehqDesktop', desktopAPI);
contextBridge.exposeInMainWorld('electronAPI', desktopAPI);
contextBridge.exposeInMainWorld('dinehqElectron', desktopAPI);
