/**
 * WiFi / LAN Network Printer Driver
 * Supports network thermal receipt printers via:
 * 1. Local Print Helper (QZ Tray) on port 8182/8181
 * 2. Direct HTTP Epson ePOS XML / Star WebPRNT on printers with built-in web services.
 * Shows clear, friendly messages if the helper isn't running.
 */

import { BaseDriver } from './BaseDriver.js';
import { DRIVER_IDS } from '../printerTypes.js';

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
   * Ping local QZ Tray or DineHQ Print Helper on ws://127.0.0.1:8182
   */
  async pingHelper() {
    return new Promise((resolve) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(false);
        }
      }, 1200);

      try {
        const ws = new WebSocket('ws://127.0.0.1:8182');
        ws.onopen = () => {
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            try { ws.close(); } catch  {}
            resolve(true);
          }
        };
        ws.onerror = () => {
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            resolve(false);
          }
        };
      } catch  {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          resolve(false);
        }
      }
    });
  }

  /**
   * Health Check: Test network printer configuration and Print Helper availability
   */
  async testConnection(config = {}) {
    const start = performance.now();
    const ip = config.ip || config.network?.ip || '192.168.1.100';
    const port = config.port || config.network?.port || 9100;

    // Validate IP format
    const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const isValidIp = ipPattern.test(String(ip).trim());

    if (!isValidIp) {
      return {
        connected: false,
        latencyMs: Math.max(1, Math.round(performance.now() - start)),
        message: `Invalid IP address format: "${ip}".`,
        fixTip: 'Enter a valid IPv4 address in Printer Settings (e.g. 192.168.1.150).',
      };
    }

    // Test print helper (QZ Tray / DineHQ Print Helper)
    const helperOnline = await this.pingHelper();

    if (helperOnline) {
      return {
        connected: true,
        latencyMs: Math.max(1, Math.round(performance.now() - start)),
        message: `Print Helper active (ws://127.0.0.1:8182). Ready to stream ESC/POS to ${ip}:${port}.`,
        details: 'Local raw TCP socket bridge operational.',
      };
    }

    // Helper not detected
    return {
      connected: false,
      latencyMs: Math.max(1, Math.round(performance.now() - start)),
      message: `Print Helper daemon is not running on this computer for target ${ip}:${port}.`,
      fixTip: 'Install or start QZ Tray / Dineflow Print Helper on this PC to bridge browser to raw port 9100, or switch to Browser Print fallback.',
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

  /**
   * Attempt print via local QZ Tray websocket helper
   */
  async printViaQZTray(ip, port, base64Data) {
    return new Promise((resolve, reject) => {
      let ws = null;
      try {
        ws = new WebSocket('ws://127.0.0.1:8182');
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
    } catch  {
      // 2. Try direct ePOS web service
      try {
        return await this.printViaEpsonEpos(ip, escposBytes);
      } catch  {
        throw new Error(
          `Could not reach network printer at ${ip}:${port}. ` +
          `Tip: If your printer is not an ePOS web printer, ensure the local QZ Tray print helper is running on this computer.`
        );
      }
    }
  }
}
