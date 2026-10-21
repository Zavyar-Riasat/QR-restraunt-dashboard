/**
 * Android RawBT Driver
 * Dispatches print jobs to the native RawBT print service app on Android devices
 * using the rawbt: intent protocol and base64 ESC/POS payloads.
 */

import { BaseDriver } from './BaseDriver.js';
import { DRIVER_IDS } from '../printerTypes.js';
import { isAndroid } from '../capabilities.js';

export class RawBtDriver extends BaseDriver {
  constructor() {
    super(DRIVER_IDS.RAWBT, 'Android RawBT App');
    this.installGuideUrl = 'https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter';
  }

  isSupported() {
    return isAndroid();
  }

  isConnected() {
    return true;
  }

  /**
   * Health Check: Test Android RawBT bridge readiness
   */
  async testConnection(_config = {}) {
    const start = performance.now();

    if (!this.isSupported()) {
      return {
        connected: false,
        latencyMs: 0,
        message: 'RawBT is an Android-only print service.',
        fixTip: 'RawBT requires an Android tablet or phone. On Windows, Mac, or iOS, select "Browser Print" or "USB Printer".',
      };
    }

    // On Android: check if RawBT local service port 40213 is responding
    let backgroundServiceActive = false;
    try {
      const res = await fetch('http://localhost:40213/health', {
        method: 'GET',
        signal: AbortSignal.timeout(600),
      });
      if (res.ok) backgroundServiceActive = true;
    } catch (_) {}

    return {
      connected: true,
      latencyMs: Math.max(1, Math.round(performance.now() - start)),
      message: backgroundServiceActive
        ? 'Android RawBT print service is running locally on port 40213.'
        : 'Android device confirmed: RawBT intent scheme (rawbt:) is ready to dispatch print jobs.',
      details: 'One-tap direct printing enabled for Android.',
    };
  }

  /**
   * Helper to convert Uint8Array into base64 string
   */
  uint8ToBase64(bytes) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  async print(job, config = {}) {
    const escposBytes = await this.formatJobToEscpos(job, config);
    const base64Data = this.uint8ToBase64(escposBytes);

    // RawBT URI scheme
    const intentUrl = `rawbt:data:application/octet-stream;base64,${base64Data}`;

    // Trigger intent via link click
    const link = document.createElement('a');
    link.href = intentUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => link.remove(), 1000);

    return {
      success: true,
      method: 'Android RawBT',
      details: 'Dispatched to RawBT app.',
    };
  }
}
