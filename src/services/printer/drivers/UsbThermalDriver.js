/**
 * USB Thermal Printer Driver (WebUSB & Web Serial + Electron)
 * Provides port-independent auto-reconnection:
 * Identifies printers strictly by USB Vendor ID (VID) + Product ID (PID),
 * never by port or physical bus path.
 *
 * Features:
 *  - Auto-reconnects silently in background when port changes or device is plugged in.
 *  - Support for Electron desktop app USB events (usb.on('attach'/'detach')).
 *  - Disambiguates identical printers via serial number or owner station label.
 *  - Auto-detects USB printer-class (0x07) and known ESC/POS devices.
 *  - Emits port-change event when browser permission needs 1-tap re-authorization.
 */

import { BaseDriver } from './BaseDriver.js';
import { DRIVER_IDS } from '../printerTypes.js';
import { isWebUSBSupported, isWebSerialSupported } from '../capabilities.js';
import {
  isUsbPrinterDevice,
  matchesUsbPrinterProfile,
  KNOWN_ESCPOS_VENDORS,
  WEBUSB_PRINTER_FILTERS,
  formatVidPid,
} from '../usbRegistry.js';

export class UsbThermalDriver extends BaseDriver {
  constructor() {
    super(DRIVER_IDS.USB, 'USB Thermal Printer');
    this.usbDevice = null;
    this.serialPort = null;
    this.isReconnecting = false;
    this.lastKnownProfile = null;

    // Listen for WebUSB hardware connect/disconnect events
    if (typeof window !== 'undefined' && navigator.usb?.addEventListener) {
      navigator.usb.addEventListener('connect', (event) => {
        this.handleHardwareUsbEvent('connect', event.device);
      });
      navigator.usb.addEventListener('disconnect', (event) => {
        this.handleHardwareUsbEvent('disconnect', event.device);
      });
    }

    // Listen for Electron desktop app attach/detach events if running in Electron
    if (typeof window !== 'undefined' && (window.electronAPI || window.dinehqElectron)) {
      const electron = window.electronAPI || window.dinehqElectron;
      if (typeof electron.onUsbDeviceChanged === 'function') {
        electron.onUsbDeviceChanged((data) => {
          this.handleElectronUsbEvent(data);
        });
      }
    }
  }

  isSupported() {
    return isWebUSBSupported() || isWebSerialSupported();
  }

  isConnected() {
    return Boolean(this.usbDevice?.opened || this.serialPort?.readable);
  }

  /**
   * Handle WebUSB hardware attach/detach
   */
  async handleHardwareUsbEvent(type, device) {
    if (type === 'connect') {
      if (this.lastKnownProfile) {
        await this.autoReconnect(this.lastKnownProfile);
      }
    } else if (type === 'disconnect') {
      if (this.usbDevice && device && this.usbDevice.vendorId === device.vendorId && this.usbDevice.productId === device.productId) {
        this.usbDevice = null;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('dinehq:printer-status-changed', {
              detail: { status: 'reconnecting', reason: 'USB printer unplugged or port changed' },
            })
          );
        }
      }
    }
  }

  /**
   * Handle Electron desktop app attach/detach
   */
  async handleElectronUsbEvent(data) {
    if (data.type === 'attach') {
      if (this.lastKnownProfile) {
        await this.autoReconnect(this.lastKnownProfile);
      }
    } else if (data.type === 'detach') {
      if (this.lastKnownProfile && data.vendorId === this.lastKnownProfile.vendorId) {
        this.usbDevice = null;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('dinehq:printer-status-changed', {
              detail: { status: 'reconnecting', reason: 'USB printer detached' },
            })
          );
        }
      }
    }
  }

  /**
   * Health Check: Test USB connection readiness on Chrome / Windows / Electron
   */
  async testConnection(config = {}) {
    const start = performance.now();

    if (!this.isSupported()) {
      return {
        connected: false,
        latencyMs: 0,
        message: 'WebUSB is not supported in this browser.',
        fixTip: 'Use Google Chrome or Microsoft Edge on Windows, or use Windows Installed Printer / Browser Print.',
      };
    }

    try {
      // 1. Device already open and claimed
      if (this.usbDevice?.opened) {
        return {
          connected: true,
          latencyMs: Math.max(1, Math.round(performance.now() - start)),
          message: `USB port open and active (${this.usbDevice.productName || 'Thermal POS Printer'}). Port-independent link OK.`,
          device: this.usbDevice.productName || 'USB Thermal POS',
        };
      }

      // 2. Try background auto-reconnect by VID + PID
      const targetVid = config.usbVendorId || config.vendorId || config.connection?.vendorId;
      const targetPid = config.usbProductId || config.productId || config.connection?.productId;

      if (targetVid && targetPid) {
        const reconnected = await this.autoReconnect({
          vendorId: targetVid,
          productId: targetPid,
          serialNumber: config.serialNumber || config.connection?.serialNumber,
        });

        if (reconnected.connected) {
          return {
            connected: true,
            latencyMs: Math.max(1, Math.round(performance.now() - start)),
            message: `Recognized and connected to USB Thermal Printer: ${reconnected.device.productName || 'POS Printer'} (VID 0x${targetVid.toString(16)}:0x${targetPid.toString(16)}).`,
            device: reconnected.device.productName || 'USB Thermal POS',
          };
        }
      }

      // 3. Check for any previously granted WebUSB devices
      if (isWebUSBSupported() && navigator.usb?.getDevices) {
        const pairedDevices = await navigator.usb.getDevices();
        if (pairedDevices && pairedDevices.length > 0) {
          const target = pairedDevices[0];
          return {
            connected: true,
            latencyMs: Math.max(1, Math.round(performance.now() - start)),
            message: `USB Thermal printer recognized: ${target.productName || 'POS Printer'} (${formatVidPid(target.vendorId, target.productId)}).`,
            device: target.productName || 'USB Thermal POS',
          };
        }
      }

      // 4. Check for WebSerial ports
      if (isWebSerialSupported() && navigator.serial?.getPorts) {
        const serialPorts = await navigator.serial.getPorts();
        if (serialPorts && serialPorts.length > 0) {
          return {
            connected: true,
            latencyMs: Math.max(1, Math.round(performance.now() - start)),
            message: 'Serial USB port recognized and available.',
            device: 'Serial USB Thermal',
          };
        }
      }

      // If WebUSB is supported but no device paired yet:
      return {
        connected: false,
        latencyMs: Math.max(1, Math.round(performance.now() - start)),
        message: 'No paired USB printer found matching this configuration.',
        fixTip: 'Connect your printer to any USB port, turn power ON, and click "Connect USB" or "Auto-Detect".',
      };
    } catch (err) {
      return {
        connected: false,
        latencyMs: Math.max(1, Math.round(performance.now() - start)),
        message: `USB connection notice: ${err.message}`,
        fixTip: 'Check USB cable connection and verify another program is not exclusively locking the printer.',
      };
    }
  }

  /**
   * Silently auto-reconnects to the saved printer profile across ANY USB port.
   * Matches strictly by VID + PID, never by port or bus path!
   */
  async autoReconnect(profile) {
    if (!profile) return { connected: false };
    this.lastKnownProfile = profile;

    const targetVid = Number(profile.vendorId ?? profile.connection?.vendorId);
    const targetPid = Number(profile.productId ?? profile.connection?.productId);
    const targetSerial = profile.serialNumber || profile.connection?.serialNumber;

    if (!targetVid || !targetPid) return { connected: false };

    // 1. If currently opened device already matches VID/PID
    if (this.usbDevice?.opened) {
      if (this.usbDevice.vendorId === targetVid && this.usbDevice.productId === targetPid) {
        return { connected: true, device: this.usbDevice };
      }
    }

    // 2. Query all granted WebUSB devices
    if (isWebUSBSupported() && navigator.usb?.getDevices) {
      try {
        const devices = await navigator.usb.getDevices();
        const matchedDevice = devices.find((d) =>
          matchesUsbPrinterProfile(d, {
            vendorId: targetVid,
            productId: targetPid,
            serialNumber: targetSerial,
          })
        );

        if (matchedDevice) {
          this.usbDevice = matchedDevice;
          if (!matchedDevice.opened) {
            await matchedDevice.open();
          }
          if (!matchedDevice.configuration) {
            await matchedDevice.selectConfiguration(1);
          }
          try {
            await matchedDevice.claimInterface(0);
          } catch (_) {}

          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('dinehq:printer-status-changed', {
                detail: { status: 'connected', device: matchedDevice },
              })
            );
          }

          return { connected: true, device: matchedDevice, reconnected: true };
        }
      } catch (err) {
        console.warn('Silent WebUSB auto-reconnect notice:', err);
      }
    }

    // 3. If port changed and browser lost device permission
    // Notify application to show the single-tap Reconnect banner (NOT the full setup wizard)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('dinehq_printer_port_changed', {
          detail: {
            profile,
            targetVid,
            targetPid,
            message: 'Printer moved to a new port — tap Reconnect',
          },
        })
      );
    }

    return { connected: false, requiresUserGesture: true };
  }

  /**
   * One-tap Quick Reconnect:
   * Called when user taps the "Printer moved to a new port - tap Reconnect" banner.
   * Prompts the browser device selector specifically filtered to the known VID/PID or printer class.
   */
  async quickReconnect(profile = null) {
    const target = profile || this.lastKnownProfile;
    const targetVid = target ? Number(target.vendorId ?? target.connection?.vendorId) : null;
    const targetPid = target ? Number(target.productId ?? target.connection?.productId) : null;

    if (!isWebUSBSupported()) {
      throw new Error('WebUSB is not supported in this browser.');
    }

    // Filter by specific VID/PID if known, otherwise printer class
    const filters = [];
    if (targetVid) {
      filters.push(targetPid ? { vendorId: targetVid, productId: targetPid } : { vendorId: targetVid });
    } else {
      filters.push({ classCode: 0x07 });
    }

    const device = await navigator.usb.requestDevice({ filters });
    this.usbDevice = device;

    if (!device.opened) {
      await device.open();
    }
    if (!device.configuration) {
      await device.selectConfiguration(1);
    }
    try {
      await device.claimInterface(0);
    } catch (_) {}

    const info = {
      name: device.productName || 'USB Thermal Receipt Printer',
      vendorId: device.vendorId,
      productId: device.productId,
      serialNumber: device.serialNumber || '',
    };

    this.lastKnownProfile = info;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('dinehq:printer-status-changed', {
          detail: { status: 'connected', device },
        })
      );
      window.dispatchEvent(new CustomEvent('dinehq_printer_reconnected_dismiss_banner'));
    }

    return info;
  }

  /**
   * Auto-detect thermal printer fallback:
   * Scans all USB printer-class devices (class 0x07) and known ESC/POS vendor IDs.
   */
  async autoDetectPrinter() {
    // 1. Check Electron auto-detect if running on desktop app
    if (typeof window !== 'undefined' && (window.electronAPI || window.dinehqElectron)) {
      const electron = window.electronAPI || window.dinehqElectron;
      try {
        const detected = await electron.autoDetectPrinter();
        if (detected) return detected;
      } catch (e) {}
    }

    // 2. Check already paired WebUSB devices
    if (isWebUSBSupported() && navigator.usb?.getDevices) {
      try {
        const devices = await navigator.usb.getDevices();
        const candidate = devices.find((d) => isUsbPrinterDevice(d));
        if (candidate) {
          return {
            name: candidate.productName || 'USB Thermal Printer',
            vendorId: candidate.vendorId,
            productId: candidate.productId,
            serialNumber: candidate.serialNumber || '',
            deviceClass: candidate.deviceClass,
          };
        }
      } catch (e) {}
    }

    // 3. Fallback: prompt user to pick from known printer vendors or printer class
    if (isWebUSBSupported()) {
      try {
        const device = await navigator.usb.requestDevice({
          filters: WEBUSB_PRINTER_FILTERS,
        });
        if (device) {
          return {
            name: device.productName || 'USB Thermal Printer',
            vendorId: device.vendorId,
            productId: device.productId,
            serialNumber: device.serialNumber || '',
            deviceClass: device.deviceClass,
          };
        }
      } catch (err) {
        if (err.name === 'NotFoundError') {
          return null; // User cancelled prompt
        }
        throw err;
      }
    }

    return null;
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

        this.lastKnownProfile = info;
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
      try {
        await this.usbDevice.close();
      } catch (e) {}
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

      // If device not in memory or opened, attempt auto-reconnect via VID + PID (port-independent)
      const targetVid = config.usbVendorId || config.vendorId || config.connection?.vendorId;
      const targetPid = config.usbProductId || config.productId || config.connection?.productId;
      const targetSerial = config.serialNumber || config.connection?.serialNumber;

      if (!device || !device.opened) {
        if (targetVid && targetPid) {
          const reconnected = await this.autoReconnect({
            vendorId: targetVid,
            productId: targetPid,
            serialNumber: targetSerial,
          });
          if (reconnected.connected) {
            device = reconnected.device;
          }
        }
      }

      // If still not found, check paired devices directly
      if (!device && targetVid && targetPid) {
        const pairedDevices = await navigator.usb.getDevices();
        device = pairedDevices.find((d) =>
          matchesUsbPrinterProfile(d, {
            vendorId: targetVid,
            productId: targetPid,
            serialNumber: targetSerial,
          })
        );
      }

      if (!device) {
        // If device has moved to new port and permission needs 1-tap grant
        throw new Error('PRINTER_PORT_CHANGED');
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
