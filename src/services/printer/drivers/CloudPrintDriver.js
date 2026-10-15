/**
 * Cloud Print Driver (PrintNode API Integration)
 * Allows restaurant owners to dispatch print jobs via the PrintNode cloud printing service
 * to remote branches or kitchen receipt printers anywhere in the world.
 */

import { BaseDriver } from './BaseDriver';
import { DRIVER_IDS } from '../printerTypes';

export class CloudPrintDriver extends BaseDriver {
  constructor() {
    super(DRIVER_IDS.CLOUD, 'Cloud Print (PrintNode)');
  }

  isSupported() {
    return true;
  }

  isConnected() {
    return true;
  }

  uint8ToBase64(bytes) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Fetch connected printers for the provided PrintNode API Key
   */
  async getPrinters(apiKey) {
    if (!apiKey) throw new Error('PrintNode API Key is required.');

    const res = await fetch('https://api.printnode.com/printers', {
      headers: {
        Authorization: 'Basic ' + window.btoa(apiKey + ':'),
      },
    });

    if (!res.ok) {
      throw new Error(`PrintNode authentication failed (HTTP ${res.status}). Verify your API key.`);
    }

    const data = await res.json();
    return data.map((p) => ({
      id: p.id,
      name: p.name,
      computer: p.computer?.name || '',
      state: p.state,
    }));
  }

  async print(job, config = {}) {
    const cloudCfg = config.cloud || {};
    const apiKey = cloudCfg.apiKey;
    const printerId = cloudCfg.printerId;

    if (!apiKey) {
      throw new Error('Please enter your PrintNode API Key in Printer Settings.');
    }
    if (!printerId) {
      throw new Error('Please select a Cloud Printer in Printer Settings.');
    }

    const escposBytes = await this.formatJobToEscpos(job, config);
    const base64Data = this.uint8ToBase64(escposBytes);

    const payload = {
      printerId: parseInt(printerId, 10),
      title: `DineHQ Order #${job.order?.id || '---'}`,
      contentType: 'raw_base64',
      content: base64Data,
      source: 'DineHQ Kitchen Dashboard',
    };

    const res = await fetch('https://api.printnode.com/printjobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + window.btoa(apiKey + ':'),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`PrintNode error (${res.status}): ${errText}`);
    }

    const result = await res.json();
    return { success: true, method: 'Cloud Print (PrintNode)', jobId: result };
  }
}
