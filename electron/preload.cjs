// Preload script exposing DineHQ Electron desktop capabilities safely to renderer
const { contextBridge, ipcRenderer } = require('electron');

const electronAPI = {
  isElectron: true,

  // Get installed Windows printers for silent spooling
  getSystemPrinters: () => ipcRenderer.invoke('printer:get-system-printers'),

  // Silent print by deviceName
  printSystem: (options) => ipcRenderer.invoke('printer:print-system', options),

  // Get USB devices list
  getUsbDevices: () => ipcRenderer.invoke('printer:get-usb-devices'),

  // Auto detect thermal printer
  autoDetectPrinter: () => ipcRenderer.invoke('printer:auto-detect'),

  // Subscribe to USB attach/detach events
  onUsbDeviceChanged: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('printer:usb-device-changed', handler);
    return () => ipcRenderer.removeListener('printer:usb-device-changed', handler);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
contextBridge.exposeInMainWorld('dinehqElectron', electronAPI);
