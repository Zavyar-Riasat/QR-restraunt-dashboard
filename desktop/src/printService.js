/**
 * DineHQ Desktop Silent Printing & Hardware Service
 * Supports:
 * 1. System printers listing (webContents.getPrintersAsync())
 * 2. Silent HTML printing to Windows printers (webContents.print({ silent: true, deviceName }))
 * 3. Raw ESC/POS byte printing:
 *    - Network thermal printers (TCP port 9100 via Node net.Socket)
 *    - Serial / Bluetooth thermal printers (COM ports)
 *    - Direct USB thermal printers (VID/PID matching & endpoint transfer)
 */

const net = require('net');
const fs = require('fs');
const { BrowserWindow } = require('electron');

let usbModule = null;
try {
  usbModule = require('usb');
} catch {
  // Optional native dependency
}

let serialPortModule = null;
try {
  serialPortModule = require('serialport');
} catch {
  // Optional native dependency
}

class PrintService {
  constructor() {
    this.usbListenersInitialized = false;
  }

  initUsbListeners(mainWindow) {
    if (this.usbListenersInitialized || !usbModule || !mainWindow) return;
    this.usbListenersInitialized = true;

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
      console.warn('[PrintService] USB attach/detach notice:', err.message);
    }
  }

  /**
   * Get all installed Windows system printers
   */
  async getSystemPrinters(webContents) {
    if (!webContents) return [];
    try {
      const printers = await webContents.getPrintersAsync();
      return printers.map((p) => ({
        name: p.name,
        displayName: p.displayName || p.name,
        isDefault: Boolean(p.isDefault),
        status: p.status,
        description: p.description || '',
      }));
    } catch (err) {
      console.warn('[PrintService] Failed to get system printers:', err.message);
      return [];
    }
  }

  /**
   * Print HTML silently to a specific printer by deviceName
   */
  async printHtmlSilent(htmlContent, options = {}) {
    return new Promise((resolve, reject) => {
      if (!htmlContent) {
        return reject(new Error('htmlContent is required for silent printing.'));
      }

      const printWin = new BrowserWindow({
        show: false,
        width: 400,
        height: 600,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

      printWin.webContents.on('did-finish-load', () => {
        const printOpts = {
          silent: true,
          printBackground: true,
          deviceName: options.deviceName || '',
          copies: options.copies || 1,
          color: options.color !== false,
          margins: options.margins || {
            marginType: 'none',
          },
          pageSize: options.pageSize || {
            width: 80000, // 80mm in microns
            height: 297000,
          },
        };

        printWin.webContents.print(printOpts, (success, failureReason) => {
          printWin.destroy();
          if (success) {
            resolve({ success: true });
          } else {
            reject(new Error(`Print failed: ${failureReason || 'Unknown error'}`));
          }
        });
      });

      printWin.webContents.on('did-fail-load', (e, code, desc) => {
        printWin.destroy();
        reject(new Error(`Failed to load receipt HTML: ${desc} (code ${code})`));
      });
    });
  }

  /**
   * Normalize input data (array, string, base64, buffer) into a Buffer
   */
  normalizeDataBuffer(data) {
    if (Buffer.isBuffer(data)) return data;
    if (Array.isArray(data)) return Buffer.from(data);
    if (typeof data === 'string') {
      // Check if base64 encoded
      if (data.startsWith('base64:')) {
        return Buffer.from(data.slice(7), 'base64');
      }
      return Buffer.from(data, 'utf8');
    }
    return Buffer.from(data || []);
  }

  /**
   * Send raw ESC/POS bytes to Network, Serial/Bluetooth, or USB printer
   * @param {Object} params - { type: 'network'|'serial'|'usb', target, data }
   */
  async printRawEscPos({ type, target, data }) {
    const rawBuffer = this.normalizeDataBuffer(data);
    if (!rawBuffer || rawBuffer.length === 0) {
      throw new Error('No data provided to printRawEscPos.');
    }

    switch (type) {
      case 'network':
      case 'tcp':
        return this.printToNetwork(target, rawBuffer);

      case 'serial':
      case 'bluetooth':
      case 'com':
        return this.printToSerial(target, rawBuffer);

      case 'usb':
        return this.printToUsb(target, rawBuffer);

      default:
        throw new Error(`Unsupported raw print type: ${type}. Expected network, serial, or usb.`);
    }
  }

  /**
   * 1. Raw Network Printing (TCP Port 9100)
   */
  async printToNetwork(target, buffer) {
    return new Promise((resolve, reject) => {
      let host = '192.168.1.100';
      let port = 9100;

      if (typeof target === 'string') {
        const parts = target.split(':');
        host = parts[0];
        if (parts[1]) port = parseInt(parts[1], 10);
      } else if (target && typeof target === 'object') {
        host = target.host || target.ip || host;
        port = target.port || port;
      }

      console.log(`[PrintService] Sending ${buffer.length} raw bytes to network printer at ${host}:${port}`);

      const socket = new net.Socket();
      socket.setTimeout(6000);

      socket.connect(port, host, () => {
        socket.write(buffer, () => {
          socket.end();
          resolve({ success: true, bytesSent: buffer.length });
        });
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error(`Connection to network printer ${host}:${port} timed out.`));
      });

      socket.on('error', (err) => {
        socket.destroy();
        reject(new Error(`Network printer error (${host}:${port}): ${err.message}`));
      });
    });
  }

  /**
   * 2. Raw Serial / Bluetooth COM Port Printing
   */
  async printToSerial(target, buffer) {
    const portName = typeof target === 'string' ? target : (target && target.port) || 'COM1';
    console.log(`[PrintService] Sending ${buffer.length} raw bytes to serial/bluetooth port ${portName}`);

    // If serialport library is available, use it
    if (serialPortModule && serialPortModule.SerialPort) {
      return new Promise((resolve, reject) => {
        const port = new serialPortModule.SerialPort({
          path: portName,
          baudRate: (target && target.baudRate) || 9600,
          autoOpen: true,
        });

        port.on('open', () => {
          port.write(buffer, (err) => {
            port.drain(() => {
              port.close();
              if (err) return reject(err);
              resolve({ success: true, bytesSent: buffer.length });
            });
          });
        });

        port.on('error', (err) => {
          reject(new Error(`Serial port ${portName} error: ${err.message}`));
        });
      });
    }

    // Native Windows COM port stream fallback
    if (process.platform === 'win32') {
      return new Promise((resolve, reject) => {
        const winComPath = `\\\\.\\${portName}`;
        try {
          const stream = fs.createWriteStream(winComPath);
          stream.write(buffer, (err) => {
            stream.end();
            if (err) return reject(err);
            resolve({ success: true, bytesSent: buffer.length });
          });
          stream.on('error', (err) => {
            reject(new Error(`Failed to write to Windows COM port ${portName}: ${err.message}`));
          });
        } catch (err) {
          reject(new Error(`Could not open Windows COM port ${portName}: ${err.message}`));
        }
      });
    }

    throw new Error(`Serial port printing not supported on this platform without serialport module.`);
  }

  /**
   * 3. Raw Direct USB Printing
   */
  async printToUsb(target, buffer) {
    if (!usbModule) {
      throw new Error('Native USB module is not loaded. Use Windows system printer spooling instead.');
    }

    let vendorId = target?.vendorId;
    let productId = target?.productId;

    const devices = usbModule.getDeviceList();
    let targetDevice = null;

    if (vendorId && productId) {
      targetDevice = devices.find((d) => {
        const desc = d.deviceDescriptor;
        return desc && desc.idVendor === vendorId && desc.idProduct === productId;
      });
    }

    // Auto-detect printer class 0x07 if not specified
    if (!targetDevice) {
      targetDevice = devices.find((d) => {
        const desc = d.deviceDescriptor;
        return desc && desc.bDeviceClass === 0x07;
      });
    }

    if (!targetDevice) {
      throw new Error('Target USB thermal printer not found.');
    }

    return new Promise((resolve, reject) => {
      try {
        targetDevice.open();
        const iface = targetDevice.interfaces[0];
        if (iface.isKernelDriverActive && iface.isKernelDriverActive()) {
          try {
            iface.detachKernelDriver();
          } catch {}
        }
        iface.claim();

        const outEndpoint = iface.endpoints.find((ep) => ep.direction === 'out');
        if (!outEndpoint) {
          targetDevice.close();
          return reject(new Error('USB printer out-endpoint not found.'));
        }

        outEndpoint.transfer(buffer, (err) => {
          try {
            iface.release(() => {
              targetDevice.close();
              if (err) return reject(err);
              resolve({ success: true, bytesSent: buffer.length });
            });
          } catch {
            if (err) return reject(err);
            resolve({ success: true, bytesSent: buffer.length });
          }
        });
      } catch (err) {
        reject(new Error(`USB transfer error: ${err.message}`));
      }
    });
  }
}

module.exports = new PrintService();
