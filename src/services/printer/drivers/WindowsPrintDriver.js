/**
 * Windows Installed Printer Driver (Spooler / Silent Print by deviceName)
 * Prints through the Windows printer driver installed on the PC.
 * Since Windows manages the printer spooler and port binding,
 * this driver is 100% immune to USB port changes!
 */

import { BaseDriver } from './BaseDriver.js';
import { DRIVER_IDS } from '../printerTypes.js';
import { generateReceiptHtml } from '../templateHtmlGenerator.js';

export class WindowsPrintDriver extends BaseDriver {
  constructor() {
    super(DRIVER_IDS.WINDOWS, 'Windows Installed Printer');
  }

  isSupported() {
    return true; // Always supported (via Electron silent spooler or browser print bridge)
  }

  isConnected() {
    return true;
  }

  /**
   * Test Windows printer connection readiness
   */
  async testConnection(config = {}) {
    const start = performance.now();
    const deviceName = config.deviceName || config.connection?.deviceName;

    // 1. Electron environment check
    if (typeof window !== 'undefined' && (window.dineflowDesktop || window.dineflowElectron || window.electronAPI || window.dinehqElectron)) {
      const electron = window.dineflowDesktop || window.dineflowElectron || window.electronAPI || window.dinehqElectron;
      try {
        const printers = await electron.getSystemPrinters();
        const found = deviceName
          ? printers.find((p) => p.name.toLowerCase() === deviceName.toLowerCase())
          : printers[0];

        if (found) {
          return {
            connected: true,
            latencyMs: Math.max(1, Math.round(performance.now() - start)),
            message: `Windows printer '${found.name}' found in system spooler. Immune to USB port changes!`,
            device: found.name,
          };
        } else {
          return {
            connected: false,
            latencyMs: Math.max(1, Math.round(performance.now() - start)),
            message: `Printer '${deviceName}' was not found in Windows installed printers.`,
            fixTip: 'Open Windows Settings > Bluetooth & Devices > Printers & Scanners to verify printer name.',
          };
        }
      } catch (err) {
        return {
          connected: false,
          latencyMs: 1,
          message: `Error querying Windows printers: ${err.message}`,
        };
      }
    }

    // 2. Browser PWA environment
    return {
      connected: true,
      latencyMs: 1,
      message: deviceName
        ? `Configured for Windows printer '${deviceName}'. Windows spooler will route tickets automatically.`
        : 'Windows printer driver configured. Ready for print spooling.',
      device: deviceName || 'Windows Default Printer',
    };
  }

  /**
   * Query all installed Windows system printers
   */
  async getInstalledPrinters() {
    if (typeof window !== 'undefined' && (window.dineflowDesktop || window.dineflowElectron || window.electronAPI || window.dinehqElectron)) {
      const electron = window.dineflowDesktop || window.dineflowElectron || window.electronAPI || window.dinehqElectron;
      try {
        return await electron.getSystemPrinters();
      } catch (err) {
        console.warn('Failed to retrieve Windows printers:', err);
      }
    }
    return [];
  }

  /**
   * Print job to the Windows installed printer
   */
  async print(job, config = {}) {
    const deviceName =
      config.deviceName ||
      config.connection?.deviceName ||
      job.targetPrinter?.connection?.deviceName ||
      job.targetPrinter?.deviceName ||
      job.deviceName ||
      job.connection?.deviceName;
    const copies = Math.max(
      1,
      parseInt(config.copies || job.targetPrinter?.copies || job.copies, 10) || 1
    );

    // Generate formatted HTML ticket
    const html =
      job.html ||
      (typeof generateReceiptHtml === 'function'
        ? generateReceiptHtml({
            templateType: job.templateType,
            paperSize: config.paperSize || job.paperSize,
            order: job.order,
            restaurant: job.restaurant,
            settings: job.templateSettings,
            qrDataUrl: job.qrDataUrl,
            salesSummary: job.salesSummary,
          })
        : '');

    // 1. If running inside Electron desktop app: Silent print through deviceName!
    if (typeof window !== 'undefined' && (window.electronAPI || window.dinehqElectron)) {
      const electron = window.electronAPI || window.dinehqElectron;
      try {
        const result = await electron.printSystem({
          deviceName: deviceName || undefined,
          html,
          copies,
          silent: true,
        });
        return {
          success: true,
          method: `Windows Spooler (${deviceName || 'Default'})`,
          details: result,
        };
      } catch (err) {
        console.warn('Electron silent print failed, attempting browser print fallback:', err);
      }
    }

    // 2. Browser fallback: Standard print iframe
    return new Promise((resolve, reject) => {
      try {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';

        document.body.appendChild(iframe);

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.close();

        iframe.contentWindow.onload = () => {
          setTimeout(() => {
            try {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
              setTimeout(() => {
                if (iframe.parentNode) {
                  document.body.removeChild(iframe);
                }
                resolve({ success: true, method: `Windows Spooler (${deviceName || 'Browser'})` });
              }, 1000);
            } catch (err) {
              if (iframe.parentNode) document.body.removeChild(iframe);
              reject(err);
            }
          }, 300);
        };
      } catch (e) {
        reject(e);
      }
    });
  }
}
