/**
 * USB Thermal Printer Driver (WebUSB & Web Serial)
 * Provides one-click "Connect USB Printer", persists device selection,
 * and sends raw ESC/POS binary commands directly to the thermal hardware.
 */

import { BaseDriver } from './BaseDriver';
import { DRIVER_IDS } from '../printerTypes';
import { isWebUSBSupported, isWebSerialSupported } from '../capabilities';

export class UsbThermalDriver extends BaseDriver {
  constructor() {
    super(DRIVER_IDS.USB, 'USB Thermal Printer');
    this.usbDevice = null;
    this.serialPort = null;
  }

  isSupported() {
    return isWebUSBSupported() || isWebSerialSupported();
  }

  isConnected() {
    return Boolean(this.usbDevice?.opened || this.serialPort?.readable);
  }

  /**
   * Request USB printer pairing from the user and remember it.
   */
  async connect() {
    if (isWebUSBSupported()) {
      try {
        // Request device without restrictive class filter so all vendor-specific POS printers match
        const device = await navigator.usb.requestDevice({ filters: [] });
        this.usbDevice = device;

        const info = {
          name: device.productName || 'USB Thermal Receipt Printer',
          vendorId: device.vendorId,
          productId: device.productId,
          serialNumber: device.serialNumber || '',
        };

        return info;
      } catch (err) {
        if (err.name === 'NotFoundError') {
          throw new Error('No USB printer was selected.');
        }
        // Fallback to WebSerial if USB was blocked or failed
        if (isWebSerialSupported()) {
          return this.connectSerial();
        }
        throw err;
      }
    } else if (isWebSerialSupported()) {
      return this.connectSerial();
    }

    throw new Error('Direct USB printer connection is not supported in this browser.');
  }

  async connectSerial() {
    const port = await navigator.serial.requestPort();
    this.serialPort = port;
    const info = port.getInfo ? port.getInfo() : {};
    return {
      name: 'Serial / USB Thermal Printer',
      vendorId: info.usbVendorId,
      productId: info.usbProductId,
    };
  }

  async disconnect() {
    if (this.usbDevice?.opened) {
      await this.usbDevice.close();
    }
    this.usbDevice = null;

    if (this.serialPort) {
      try {
        await this.serialPort.close();
      } catch (e) {
        console.warn('Error closing serial port:', e);
      }
      this.serialPort = null;
    }
    return true;
  }

  /**
   * Print job to the USB printer via ESC/POS commands
   */
  async print(job, config = {}) {
    const escposBytes = await this.formatJobToEscpos(job, config);

    // 1. Try WebUSB first
    if (isWebUSBSupported()) {
      let device = this.usbDevice;

      // If device not in memory, attempt auto-reconnect via paired devices
      if (!device && config.usbVendorId && config.usbProductId) {
        const pairedDevices = await navigator.usb.getDevices();
        device = pairedDevices.find(
          (d) => d.vendorId === config.usbVendorId && d.productId === config.usbProductId
        );
      }

      if (!device) {
        // Request connection
        device = await navigator.usb.requestDevice({ filters: [] });
      }

      if (device) {
        this.usbDevice = device;
        if (!device.opened) {
          await device.open();
        }

        // Select active configuration
        if (!device.configuration) {
          await device.selectConfiguration(1);
        }

        // Locate bulk OUT endpoint for sending printer commands
        let targetInterfaceNumber = 0;
        let targetEndpointNumber = null;

        for (const iface of device.configuration.interfaces) {
          for (const alt of iface.alternates) {
            for (const ep of alt.endpoints) {
              if (ep.direction === 'out') {
                targetInterfaceNumber = iface.interfaceNumber;
                targetEndpointNumber = ep.endpointNumber;
                break;
              }
            }
            if (targetEndpointNumber !== null) break;
          }
          if (targetEndpointNumber !== null) break;
        }

        if (targetEndpointNumber === null) {
          targetEndpointNumber = 1; // standard default endpoint
        }

        try {
          await device.claimInterface(targetInterfaceNumber);
        } catch (e) {
          console.warn('Interface already claimed or shared:', e);
        }

        // Send binary ESC/POS payload
        await device.transferOut(targetEndpointNumber, escposBytes);
        return { success: true, method: 'USB Thermal' };
      }
    }

    // 2. Try WebSerial
    if (isWebSerialSupported()) {
      let port = this.serialPort;
      if (!port) {
        port = await navigator.serial.requestPort();
        this.serialPort = port;
      }
      await port.open({ baudRate: 9600 });
      const writer = port.writable.getWriter();
      await writer.write(escposBytes);
      writer.releaseLock();
      return { success: true, method: 'Serial USB Thermal' };
    }

    throw new Error('No compatible USB printer connection could be established.');
  }
}
