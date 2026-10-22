/**
 * Device & Browser Capability Detector
 * Intelligently hides unsupported connection methods (e.g. WebUSB/Bluetooth on Safari or iOS)
 * instead of throwing cryptic errors at the owner.
 */

import { DRIVER_IDS } from './printerTypes.js';

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
  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function isSafari() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|Edg|OPR/i.test(ua);
}

/**
 * Checks if a specific printer connection type is supported on the current device and browser.
 * On iPhone / iPad Safari: WebUSB, Web Bluetooth, and Android RawBT are strictly unsupported
 * and hidden to prevent confusion and avoid runtime exceptions.
 */
export function isPrinterTypeSupported(typeId) {
  // iPhone / iPad Safari strictly does NOT support WebUSB, Web Bluetooth, or Android RawBT
  if (isIOS()) {
    if (
      typeId === DRIVER_IDS.USB ||
      typeId === DRIVER_IDS.BLUETOOTH ||
      typeId === DRIVER_IDS.RAWBT ||
      typeId === DRIVER_IDS.WINDOWS
    ) {
      return false;
    }
    return true; // Browser Print & Network (via Print Helper or web gateway) are supported
  }

  switch (typeId) {
    case DRIVER_IDS.USB:
      return isWebUSBSupported() || isWebSerialSupported();
    case DRIVER_IDS.BLUETOOTH:
      return isWebBluetoothSupported();
    case DRIVER_IDS.RAWBT:
      return isAndroid();
    case DRIVER_IDS.BROWSER:
    case DRIVER_IDS.NETWORK:
    case DRIVER_IDS.CLOUD:
    default:
      return true;
  }
}

/**
 * Returns comprehensive hardware and driver diagnostic information
 * for the current client device.
 */
export function getPlatformDiagnostics() {
  const isApple = isIOS();
  const isGoogleAndroid = isAndroid();
  const isAppleSafari = isSafari();
  const hasUSB = isWebUSBSupported();
  const hasSerial = isWebSerialSupported();
  const hasBLE = isWebBluetoothSupported();

  let osName = 'Desktop (Windows / Mac / Linux)';
  if (isApple) osName = 'Apple iOS (iPhone / iPad)';
  else if (isGoogleAndroid) osName = 'Android Mobile / Tablet';
  else if (typeof navigator !== 'undefined' && /Windows/i.test(navigator.userAgent)) osName = 'Windows PC';
  else if (typeof navigator !== 'undefined' && /Mac/i.test(navigator.userAgent)) osName = 'macOS';

  let browserName = 'Web Browser';
  if (typeof navigator !== 'undefined') {
    if (/Chrome/i.test(navigator.userAgent) && !/Edg/i.test(navigator.userAgent)) browserName = 'Google Chrome';
    else if (/Edg/i.test(navigator.userAgent)) browserName = 'Microsoft Edge';
    else if (isAppleSafari) browserName = 'Apple Safari';
    else if (/Firefox/i.test(navigator.userAgent)) browserName = 'Mozilla Firefox';
  }

  let recommendedDriver = DRIVER_IDS.BROWSER;
  if (isApple) {
    recommendedDriver = DRIVER_IDS.BROWSER;
  } else if (isGoogleAndroid) {
    recommendedDriver = hasBLE ? DRIVER_IDS.BLUETOOTH : DRIVER_IDS.RAWBT;
  } else if (hasUSB) {
    recommendedDriver = DRIVER_IDS.USB;
  }

  return {
    osName,
    browserName,
    isIOS: isApple,
    isSafari: isAppleSafari,
    isAndroid: isGoogleAndroid,
    hasWebUSB: hasUSB,
    hasWebSerial: hasSerial,
    hasWebBluetooth: hasBLE,
    recommendedDriver,
    supportedTypes: [
      DRIVER_IDS.BROWSER,
      hasUSB ? DRIVER_IDS.USB : null,
      hasBLE && !isApple ? DRIVER_IDS.BLUETOOTH : null,
      isGoogleAndroid ? DRIVER_IDS.RAWBT : null,
      DRIVER_IDS.NETWORK,
      DRIVER_IDS.CLOUD,
    ].filter(Boolean),
  };
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

  // 2. USB Thermal Printer (WebUSB / WebSerial) - Hidden on iOS Safari
  if (isPrinterTypeSupported(DRIVER_IDS.USB)) {
    drivers.push({
      id: DRIVER_IDS.USB,
      name: 'USB Thermal Printer',
      badge: 'Fast & Direct',
      description: 'Plug your thermal receipt printer into a USB port. Pairs once and prints instantly without popups.',
      isSupported: true,
      requiresPairing: true,
    });
  }

  // 3. Bluetooth Thermal Printer (BLE) - Hidden on iOS Safari
  if (isPrinterTypeSupported(DRIVER_IDS.BLUETOOTH)) {
    drivers.push({
      id: DRIVER_IDS.BLUETOOTH,
      name: 'Bluetooth Thermal Printer',
      badge: 'Wireless',
      description: 'Connect directly to your wireless Bluetooth receipt printer.',
      isSupported: true,
      requiresPairing: true,
    });
  }

  // 4. Android RawBT - Android only, hidden on iOS
  if (isPrinterTypeSupported(DRIVER_IDS.RAWBT)) {
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
