/**
 * Known ESC/POS Thermal Printer Vendor Registry & USB Class Definitions
 * DineHQ identifies printers strictly by Vendor ID (VID) and Product ID (PID),
 * never by port or physical bus path.
 */

export const USB_CLASS_PRINTER = 0x07;

/**
 * Common ESC/POS Thermal Receipt & Kitchen Printer USB Vendors
 */
export const KNOWN_ESCPOS_VENDORS = [
  { vid: 0x04b8, name: 'Epson (TM Series)' },
  { vid: 0x1fc9, name: 'Xprinter / NII' },
  { vid: 0x0416, name: 'Xprinter / Winbond POS' },
  { vid: 0x0483, name: 'STMicroelectronics / Generic POS-80' },
  { vid: 0x0fe6, name: 'Rongta / ICS Thermal' },
  { vid: 0x0471, name: 'Philips / POS-58 Mini' },
  { vid: 0x0493, name: 'MAG Technology / POS-80 Roll' },
  { vid: 0x0525, name: 'Netchip / Zjiang ZJ-58/80' },
  { vid: 0x1a86, name: 'QinHeng / CH340 USB Thermal' },
  { vid: 0x28e9, name: 'GigaDevice / Milestone Thermal' },
  { vid: 0x0519, name: 'Star Micronics' },
  { vid: 0x1504, name: 'Bixolon / Samsung' },
  { vid: 0x1d90, name: 'Citizen Systems' },
  { vid: 0x20d1, name: 'HPRT Thermal' },
  { vid: 0x0dd4, name: 'Custom Engineering POS' },
  { vid: 0x1208, name: 'Zebra Technologies' },
  { vid: 0x067b, name: 'Prolific USB-Serial Thermal' },
  { vid: 0x10c4, name: 'Silicon Labs CP210x POS' },
];

/**
 * Filter list for WebUSB requestDevice
 */
export const WEBUSB_PRINTER_FILTERS = [
  // Class 7: USB Printer class
  { classCode: USB_CLASS_PRINTER },
  // Explicit Known ESC/POS vendor IDs
  ...KNOWN_ESCPOS_VENDORS.map((v) => ({ vendorId: v.vid })),
];

/**
 * Check if a WebUSB or Electron USB device is a printer
 */
export function isUsbPrinterDevice(device) {
  if (!device) return false;

  // 1. Check Device Class 0x07
  if (device.deviceClass === USB_CLASS_PRINTER) return true;

  // 2. Check Interface Classes in configuration
  if (device.configuration && Array.isArray(device.configuration.interfaces)) {
    for (const iface of device.configuration.interfaces) {
      if (Array.isArray(iface.alternates)) {
        for (const alt of iface.alternates) {
          if (alt.interfaceClass === USB_CLASS_PRINTER) return true;
        }
      }
    }
  }

  // 3. Check Known Vendor IDs
  const vid = Number(device.vendorId);
  if (KNOWN_ESCPOS_VENDORS.some((v) => v.vid === vid)) {
    return true;
  }

  // 4. Check product name hints
  const name = (device.productName || '').toLowerCase();
  if (
    name.includes('printer') ||
    name.includes('pos') ||
    name.includes('thermal') ||
    name.includes('receipt') ||
    name.includes('xprinter') ||
    name.includes('epson') ||
    name.includes('rongta')
  ) {
    return true;
  }

  return false;
}

/**
 * Match a USB device strictly by Vendor ID + Product ID (and optional serial/label)
 * NEVER relies on port, path, or dynamic bus ID.
 */
export function matchesUsbPrinterProfile(device, profile) {
  if (!device || !profile) return false;

  const devVid = Number(device.vendorId);
  const devPid = Number(device.productId);
  const profVid = Number(profile.vendorId ?? profile.connection?.vendorId);
  const profPid = Number(profile.productId ?? profile.connection?.productId);

  if (!profVid || !profPid) return false;
  if (devVid !== profVid || devPid !== profPid) return false;

  // If a specific serial number is saved on the profile, verify it matches
  const profSerial = profile.serialNumber || profile.connection?.serialNumber;
  if (profSerial && device.serialNumber) {
    return String(profSerial).trim() === String(device.serialNumber).trim();
  }

  return true;
}

/**
 * Friendly name for a USB Vendor ID
 */
export function getVendorName(vendorId) {
  const vid = Number(vendorId);
  const found = KNOWN_ESCPOS_VENDORS.find((v) => v.vid === vid);
  return found ? found.name : `USB (0x${vid.toString(16).padStart(4, '0')})`;
}

/**
 * Format hex VID:PID
 */
export function formatVidPid(vid, pid) {
  const v = (Number(vid) || 0).toString(16).padStart(4, '0');
  const p = (Number(pid) || 0).toString(16).padStart(4, '0');
  return `0x${v}:0x${p}`;
}

/**
 * Find matching USB device from a list of devices based on VID+PID
 */
export function findMatchingUsbDevice(devices = [], profile) {
  if (!Array.isArray(devices) || !profile) return null;
  return devices.find((device) => matchesUsbPrinterProfile(device, profile)) || null;
}

