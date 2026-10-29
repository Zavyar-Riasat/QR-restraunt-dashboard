// Electron Main Process for DineHQ Restaurant Owner Dashboard
// Handles USB device detection, port-independent auto-reconnect, and silent Windows printing.

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow = null;
let usbModule = null;

// Try loading native usb module if available
try {
  usbModule = require('usb');
} catch  {
  // Optional native usb dependency, fallback to standard device polling
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'DineHQ Kitchen & POS Command Center',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    icon: path.join(__dirname, '../public/favicon.ico'),
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const startUrl = isDev
    ? (process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173')
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  // Setup USB attach/detach listeners if usb module is active
  if (usbModule) {
    try {
      usbModule.on('attach', (device) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          const desc = device.deviceDescriptor || {};
          mainWindow.webContents.send('printer:usb-device-changed', {
            type: 'attach',
            vendorId: desc.idVendor,
            productId: desc.idProduct,
          });
        }
      });

      usbModule.on('detach', (device) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          const desc = device.deviceDescriptor || {};
          mainWindow.webContents.send('printer:usb-device-changed', {
            type: 'detach',
            vendorId: desc.idVendor,
            productId: desc.idProduct,
          });
        }
      });
    } catch (err) {
      console.warn('USB hardware listener notice:', err);
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Setup IPC Communication Handlers
function setupIpcHandlers() {
  // 1. Get all installed Windows system printers (silent spooler)
  ipcMain.handle('printer:get-system-printers', async () => {
    if (!mainWindow) return [];
    try {
      const printers = await mainWindow.webContents.getPrintersAsync();
      return printers.map((p) => ({
        name: p.name,
        displayName: p.displayName || p.name,
        description: p.description || '',
        status: p.status,
        isDefault: p.isDefault,
        isInstalledWindows: true,
      }));
    } catch (err) {
      console.error('Failed to get system printers:', err);
      return [];
    }
  });

  // 2. Silent Print through Windows printer spooler by deviceName
  ipcMain.handle('printer:print-system', async (event, { deviceName, html, copies = 1, silent = true }) => {
    if (!mainWindow) throw new Error('No active window to print');

    return new Promise((resolve, reject) => {
      // Create hidden window for silent formatted receipt printing
      const printWin = new BrowserWindow({
        show: false,
        webPreferences: { nodeIntegration: false },
      });

      printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html || '<html><body>Printing...</body></html>')}`);

      printWin.webContents.on('did-finish-load', () => {
        printWin.webContents.print(
          {
            silent: silent !== false,
            printBackground: true,
            deviceName: deviceName || undefined,
            copies: Math.max(1, copies),
          },
          (success, failureReason) => {
            printWin.close();
            if (success) {
              resolve({ success: true, method: 'Windows Silent Spooler', deviceName });
            } else {
              reject(new Error(`Windows spooler error: ${failureReason}`));
            }
          }
        );
      });
    });
  });

  // 3. Scan USB devices (matched strictly by VID/PID, port-independent)
  ipcMain.handle('printer:get-usb-devices', async () => {
    if (!usbModule) return [];
    try {
      const devices = usbModule.getDeviceList();
      return devices.map((d) => {
        const desc = d.deviceDescriptor || {};
        return {
          vendorId: desc.idVendor,
          productId: desc.idProduct,
          deviceClass: desc.bDeviceClass,
          serialNumber: '',
        };
      });
    } catch (e) {
      console.warn('Error reading USB device list:', e);
      return [];
    }
  });

  // 4. Auto-detect connected ESC/POS thermal printer
  ipcMain.handle('printer:auto-detect', async () => {
    if (!usbModule) return null;
    try {
      const devices = usbModule.getDeviceList();
      const KNOWN_VIDS = [
        0x04b8, 0x1fc9, 0x0416, 0x0483, 0x0fe6, 0x0471, 0x0493, 0x0525, 0x1a86,
        0x28e9, 0x0519, 0x1504, 0x1d90, 0x20d1,
      ];

      for (const d of devices) {
        const desc = d.deviceDescriptor || {};
        if (desc.bDeviceClass === 0x07 || KNOWN_VIDS.includes(desc.idVendor)) {
          return {
            vendorId: desc.idVendor,
            productId: desc.idProduct,
            name: `USB Thermal Printer (0x${desc.idVendor.toString(16)}:0x${desc.idProduct.toString(16)})`,
            deviceClass: desc.bDeviceClass,
          };
        }
      }
      return null;
    } catch  {
      return null;
    }
  });
}
