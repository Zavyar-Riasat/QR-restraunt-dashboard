/**
 * Android RawBT Driver
 * Dispatches print jobs to the native RawBT print service app on Android devices
 * using the rawbt: intent protocol and base64 ESC/POS payloads.
 */

import { BaseDriver } from './BaseDriver';
import { DRIVER_IDS } from '../printerTypes';
import { isAndroid } from '../capabilities';

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
