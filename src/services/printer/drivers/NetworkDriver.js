/**
 * WiFi / LAN Network Printer Driver
 * Supports network thermal receipt printers via:
 * 1. Local Print Helper (QZ Tray) on port 8182/8181
 * 2. Direct HTTP Epson ePOS XML / Star WebPRNT on printers with built-in web services.
 * Shows clear, friendly messages if the helper isn't running.
 */

import { BaseDriver } from './BaseDriver';
import { DRIVER_IDS } from '../printerTypes';

export class NetworkDriver extends BaseDriver {
  constructor() {
    super(DRIVER_IDS.NETWORK, 'WiFi / Network Thermal Printer');
  }

  isSupported() {
    return true;
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

  /**
   * Attempt print via local QZ Tray websocket helper
   */
  async printViaQZTray(ip, port, base64Data) {
    return new Promise((resolve, reject) => {
      let ws = null;
      try {
        ws = new WebSocket('ws://localhost:8182');
      } catch (err) {
        return reject(err);
      }

      const timer = setTimeout(() => {
        if (ws) ws.close();
        reject(new Error('Helper connection timed out.'));
      }, 3500);

      ws.onopen = () => {
        // Send raw network print packet
        const message = {
          call: 'raw',
          params: {
            printer: {
              host: ip,
              port: parseInt(port, 10) || 9100,
            },
            data: [
              {
                type: 'raw',
                format: 'base64',
                data: base64Data,
              },
            ],
          },
        };
        ws.send(JSON.stringify(message));
      };

      ws.onmessage = (_event) => {
        clearTimeout(timer);
        ws.close();
        resolve({ success: true, method: 'Network (QZ Tray)' });
      };

      ws.onerror = (err) => {
        clearTimeout(timer);
        reject(err);
      };
    });
  }

  /**
   * Attempt print via Epson ePOS HTTP XML direct web service
   */
  async printViaEpsonEpos(ip, escposBytes) {
    const url = `http://${ip}/cgi-bin/epos/service.cgi?devid=local_printer&timeout=10000`;
    const base64Data = this.uint8ToBase64(escposBytes);

    const xmlPayload = `
      <s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
        <s:Body>
          <epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">
            <command>${base64Data}</command>
          </epos-print>
        </s:Body>
      </s:Envelope>
    `.trim();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'If-Modified-Since': 'Thu, 01 Jan 1970 00:00:00 GMT',
      },
      body: xmlPayload,
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) {
      throw new Error(`Printer HTTP error: ${response.status}`);
    }

    return { success: true, method: 'Epson ePOS Web' };
  }

  async print(job, config = {}) {
    const ip = config.network?.ip || job.networkIp;
    const port = config.network?.port || job.networkPort || 9100;

    if (!ip) {
      throw new Error('Please configure the printer IP address in Settings.');
    }

    const escposBytes = await this.formatJobToEscpos(job, config);
    const base64Data = this.uint8ToBase64(escposBytes);

    // 1. Try local QZ Tray helper first
    try {
      return await this.printViaQZTray(ip, port, base64Data);
    } catch (_qzErr) {
      // 2. Try direct ePOS web service
      try {
        return await this.printViaEpsonEpos(ip, escposBytes);
      } catch (_eposErr) {
        throw new Error(
          `Could not reach network printer at ${ip}:${port}. ` +
          `Tip: If your printer is not an ePOS web printer, ensure the local QZ Tray print helper is running on this computer.`
        );
      }
    }
  }
}
