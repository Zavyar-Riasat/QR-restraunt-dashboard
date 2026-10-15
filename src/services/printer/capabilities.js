/**
 * Device & Browser Capability Detector
 * Intelligently hides unsupported connection methods (e.g. WebUSB/Bluetooth on Safari or iOS)
 * instead of throwing cryptic errors at the owner.
 */

import { DRIVER_IDS } from './printerTypes';

export function isWebUSBSupported() {
  return typeof navigator !== 'undefined' && 'usb' in navigator;
}

export function isWebSerialSupported() {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

export function isWebBluetoothSupported() {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

export function isAndroid() {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

export function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isSafari() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|Edg/i.test(ua);
}

/**
 * Returns available driver definitions tailored to the current client device.
 * Unsupported hardware bridges are cleanly hidden.
 */
export function getAvailableDrivers() {
  const drivers = [];

  // 1. Browser Print is universal and works on all platforms (iOS, Android, Windows, Mac, Linux)
  drivers.push({
    id: DRIVER_IDS.BROWSER,
    name: 'This Device (Standard Printer)',
    badge: 'Universal',
    description: 'Uses your computer/phone print dialog. Works with any regular or thermal printer already installed on this device.',
    isSupported: true,
    requiresPairing: false,
  });

  // 2. USB Thermal Printer (WebUSB / WebSerial)
  const usbSupported = isWebUSBSupported() || isWebSerialSupported();
  if (usbSupported) {
    drivers.push({
      id: DRIVER_IDS.USB,
      name: 'USB Thermal Printer',
      badge: 'Fast & Direct',
      description: 'Plug your thermal receipt printer into a USB port. Pairs once and prints instantly without popups.',
      isSupported: true,
      requiresPairing: true,
    });
  }

  // 3. Bluetooth Thermal Printer (BLE)
  if (isWebBluetoothSupported()) {
    drivers.push({
      id: DRIVER_IDS.BLUETOOTH,
      name: 'Bluetooth Thermal Printer',
      badge: 'Wireless',
      description: 'Connect directly to your wireless Bluetooth receipt printer.',
      isSupported: true,
      requiresPairing: true,
    });
  }

  // 4. Android RawBT
  if (isAndroid()) {
    drivers.push({
      id: DRIVER_IDS.RAWBT,
      name: 'Android RawBT App',
      badge: 'Android POS',
      description: 'One-tap direct printing on Android tablets & phones via the free RawBT print service.',
      isSupported: true,
      requiresPairing: false,
      installGuideUrl: 'https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter',
    });
  }

  // 5. Network Printer (LAN / WiFi)
  // Available on all platforms; connects via QZ Tray helper or direct printer web service
  drivers.push({
    id: DRIVER_IDS.NETWORK,
    name: 'WiFi / LAN Network Printer',
    badge: 'Kitchen Network',
    description: 'Print to a shared kitchen printer over your restaurant WiFi using its local IP address.',
    isSupported: true,
    requiresPairing: true,
  });

  // 6. Cloud Print (PrintNode) - always listed, can be toggled via feature flag
  drivers.push({
    id: DRIVER_IDS.CLOUD,
    name: 'Cloud Print (PrintNode)',
    badge: 'Remote Cloud',
    description: 'Print automatically to any branch even when you are away from the restaurant.',
    isSupported: true,
    requiresPairing: true,
    isCloud: true,
  });

  return drivers;
}
