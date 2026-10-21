/**
 * Bluetooth Thermal Printer Driver (Web Bluetooth)
 * Provides one-click "Connect Bluetooth Printer" for BLE thermal printers,
 * remembers the paired device, and transfers ESC/POS binary data with MTU chunking.
 */

import { BaseDriver } from './BaseDriver.js';
import { DRIVER_IDS } from '../printerTypes.js';
import { isWebBluetoothSupported } from '../capabilities.js';

// Widely used 16-bit and 128-bit Bluetooth Thermal Printer Service & Characteristic UUIDs
const BLE_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard Printer Service
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC transparent UART
  '0000ae30-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
];

export class BluetoothDriver extends BaseDriver {
  constructor() {
    super(DRIVER_IDS.BLUETOOTH, 'Bluetooth Thermal Printer');
    this.bleDevice = null;
    this.characteristic = null;
  }

  isSupported() {
    return isWebBluetoothSupported();
  }

  isConnected() {
    return Boolean(this.bleDevice?.gatt?.connected && this.characteristic);
  }

  /**
   * Health Check: Test Bluetooth readiness on Android / Chrome
   */
  async testConnection(config = {}) {
    const start = performance.now();

    if (!this.isSupported()) {
      return {
        connected: false,
        latencyMs: 0,
        message: 'Web Bluetooth is not supported in this browser.',
        fixTip: 'Use Google Chrome on Android or desktop with Bluetooth enabled, or use Browser Print.',
      };
    }

    try {
      // 1. Device already connected in active memory
      if (this.bleDevice?.gatt?.connected && this.characteristic) {
        return {
          connected: true,
          latencyMs: Math.max(1, Math.round(performance.now() - start)),
          message: `Active Bluetooth connection to "${this.bleDevice.name || 'Receipt Printer'}".`,
          device: this.bleDevice.name || 'Bluetooth Printer',
        };
      }

      // 2. Query previously granted Bluetooth devices if API available (Chrome 85+)
      if (navigator.bluetooth?.getDevices) {
        const paired = await navigator.bluetooth.getDevices();
        if (paired && paired.length > 0) {
          const target = config.deviceId
            ? paired.find((d) => d.id === config.deviceId) || paired[0]
            : paired[0];

          return {
            connected: true,
            latencyMs: Math.max(1, Math.round(performance.now() - start)),
            message: `Paired Bluetooth printer recognized: "${target.name || 'BLE Printer'}".`,
            device: target.name || 'Bluetooth Receipt Printer',
          };
        }
      }

      // 3. Supported on device, but not yet paired
      return {
        connected: false,
        latencyMs: Math.max(1, Math.round(performance.now() - start)),
        message: 'Web Bluetooth is ready on this Android / Chrome device, but no printer is currently paired.',
        fixTip: 'Turn on your Bluetooth printer, verify Bluetooth is ON in Android settings, and click "Scan Bluetooth" in Printer Settings.',
      };
    } catch (err) {
      return {
        connected: false,
        latencyMs: Math.max(1, Math.round(performance.now() - start)),
        message: `Bluetooth check notice: ${err.message}`,
        fixTip: 'Ensure Bluetooth is turned ON and location permission is granted for Chrome.',
      };
    }
  }

  /**
   * Request Bluetooth device from browser dialog
   */
  async connect() {
    if (!this.isSupported()) {
      throw new Error('Bluetooth printing is not supported in this browser.');
    }

    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: BLE_PRINTER_SERVICES,
      });

      this.bleDevice = device;

      // Connect to GATT server to verify characteristic
      const char = await this.getWritableCharacteristic(device);
      this.characteristic = char;

      return {
        name: device.name || 'Bluetooth Receipt Printer',
        id: device.id,
      };
    } catch (err) {
      if (err.name === 'NotFoundError') {
        throw new Error('No Bluetooth printer was selected.');
      }
      throw err;
    }
  }

  async disconnect() {
    if (this.bleDevice?.gatt?.connected) {
      this.bleDevice.gatt.disconnect();
    }
    this.bleDevice = null;
    this.characteristic = null;
    return true;
  }

  /**
   * Locate a writable characteristic for ESC/POS output
   */
  async getWritableCharacteristic(device) {
    if (!device.gatt.connected) {
      await device.gatt.connect();
    }

    // Try known services
    for (const serviceUuid of BLE_PRINTER_SERVICES) {
      try {
        const service = await device.gatt.getPrimaryService(serviceUuid);
        const characteristics = await service.getCharacteristics();
        for (const c of characteristics) {
          if (c.properties.write || c.properties.writeWithoutResponse) {
            return c;
          }
        }
      } catch (_e) {
        // service not present on this model, check next
      }
    }

    // Fallback: discover all primary services
    try {
      const services = await device.gatt.getPrimaryServices();
      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        for (const c of characteristics) {
          if (c.properties.write || c.properties.writeWithoutResponse) {
            return c;
          }
        }
      }
    } catch (err) {
      console.warn('Error enumerating BLE services:', err);
    }

    throw new Error('Could not find a writable print channel on the selected Bluetooth device.');
  }

  /**
   * Send ESC/POS commands chunked into MTU-safe packets (100 bytes)
   */
  async print(job, config = {}) {
    if (!this.isSupported()) {
      throw new Error('Bluetooth is not supported in this browser.');
    }

    let device = this.bleDevice;

    if (!device) {
      // Prompt user to connect
      device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: BLE_PRINTER_SERVICES,
      });
      this.bleDevice = device;
    }

    const characteristic = await this.getWritableCharacteristic(device);
    this.characteristic = characteristic;

    const escposBytes = await this.formatJobToEscpos(job, config);

    // BLE MTU chunking (100 bytes per slice with small inter-packet delay)
    const chunkSize = 100;
    for (let i = 0; i < escposBytes.length; i += chunkSize) {
      const chunk = escposBytes.slice(i, i + chunkSize);
      if (characteristic.writeValueWithoutResponse) {
        await characteristic.writeValueWithoutResponse(chunk);
      } else {
        await characteristic.writeValue(chunk);
      }
      // Small pause so printer buffer does not overflow
      if (escposBytes.length > chunkSize) {
        await new Promise((r) => setTimeout(r, 20));
      }
    }

    return { success: true, method: 'Bluetooth Thermal' };
  }
}
