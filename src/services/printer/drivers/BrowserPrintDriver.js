/**
 * Browser Print Driver
 * Universal driver utilizing window.print() and dynamic CSS @page rules
 * for 58mm, 80mm, and A4 paper sizes with KOT, Customer Bill, and Delivery Slip templates.
 */

import { BaseDriver } from './BaseDriver.js';
import { DRIVER_IDS, PAPER_SIZES, TEMPLATE_TYPES } from '../printerTypes.js';
import { printerService } from '../printerService.js';
import { generateReceiptHtml } from '../templateHtmlGenerator.js';
import QRCode from 'qrcode';

export class BrowserPrintDriver extends BaseDriver {
  constructor() {
    super(DRIVER_IDS.BROWSER, 'This Device (Browser Print)');
  }

  isSupported() {
    return typeof window !== 'undefined' && typeof window.print === 'function';
  }

  isConnected(config = {}) {
    // Only return connected if physically verified or confirmed on this workstation
    return Boolean(config?.verifiedConnected || config?.lastPrintSuccess);
  }

  /**
   * Health Check: Test Browser Print readiness (A4, 80mm, 58mm)
   */
  async testConnection(config = {}) {
    const start = performance.now();
    const isAvail = this.isSupported();
    const paperSize = config.paperSize || PAPER_SIZES.SIZE_80MM;
    const isVerified = Boolean(config?.verifiedConnected || config?.lastPrintSuccess);

    // If running in Electron, verify against actual installed system printers
    if (typeof window !== 'undefined' && (window.dineflowDesktop || window.dineflowElectron || window.electronAPI || window.dinehqElectron)) {
      const electron = window.dineflowDesktop || window.dineflowElectron || window.electronAPI || window.dinehqElectron;
      try {
        if (typeof electron.getSystemPrinters === 'function') {
          const sysPrinters = await electron.getSystemPrinters();
          if (Array.isArray(sysPrinters) && sysPrinters.length > 0) {
            return {
              connected: true,
              latencyMs: Math.max(1, Math.round(performance.now() - start)),
              message: `System printer active: ${sysPrinters[0]?.name || 'Default Printer'}. Ready for ${paperSize}.`,
              device: sysPrinters[0]?.name || 'Windows Default Printer',
            };
          }
        }
      } catch  {}
    }

    if (!isAvail) {
      return {
        connected: false,
        latencyMs: 0,
        message: 'Browser printing is not supported in this runtime environment.',
        fixTip: 'Open Dineflow in Google Chrome, Microsoft Edge, or a modern browser.',
      };
    }

    if (isVerified) {
      return {
        connected: true,
        latencyMs: Math.max(1, Math.round(performance.now() - start)),
        message: `Browser printer verified and active for ${paperSize === PAPER_SIZES.SIZE_A4 ? 'A4 regular printer' : `${paperSize} receipt printer`}.`,
        details: 'Hardware link verified via test print on this workstation.',
      };
    }

    return {
      connected: false,
      latencyMs: Math.max(1, Math.round(performance.now() - start)),
      message: 'No physical printer has been connected or verified on this computer yet.',
      fixTip: 'Connect your printer to this PC, ensure power is ON, and run "Test Print" to verify output.',
    };
  }

  async print(job, config = {}) {
    if (!this.isSupported()) {
      throw new Error('Browser printing is not available on this platform.');
    }

    const paperSize = config.paperSize || job.paperSize || PAPER_SIZES.SIZE_80MM;
    const templateType = job.templateType || TEMPLATE_TYPES.KOT;
    const templateSettings = job.templateSettings || printerService.getTemplateSettings();

    // 1. Inject Dynamic @page style tag into document head
    const styleId = 'dineflow-dynamic-page-print-style';
    let styleEl = document.getElementById(styleId) || document.getElementById('dinehq-dynamic-page-print-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    let pageCssRule = '@page { size: 80mm auto; margin: 0; }';
    let containerWidth = '76mm';

    if (paperSize === PAPER_SIZES.SIZE_58MM) {
      pageCssRule = '@page { size: 58mm auto; margin: 0; }';
      containerWidth = '54mm';
    } else if (paperSize === PAPER_SIZES.SIZE_A4) {
      pageCssRule = '@page { size: A4 portrait; margin: 10mm; }';
      containerWidth = '190mm';
    }

    styleEl.textContent = `
      @media print {
        ${pageCssRule}
        body * {
          visibility: hidden !important;
        }
        #dineflow-browser-print-portal,
        #dineflow-browser-print-portal *,
        #dinehq-browser-print-portal,
        #dinehq-browser-print-portal * {
          visibility: visible !important;
        }
        #dineflow-browser-print-portal,
        #dinehq-browser-print-portal {
          position: fixed !important;
          left: 0 !important;
          top: 0 !important;
          width: ${containerWidth} !important;
          max-width: 100% !important;
          margin: 0 auto !important;
          padding: 8px !important;
          background: #ffffff !important;
          color: #000000 !important;
          box-shadow: none !important;
          border: none !important;
          display: block !important;
          z-index: 99999 !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Nastaliq Urdu", monospace, sans-serif !important;
        }
      }
    `;

    // 2. Generate direct QR Code (Restaurant Menu / Reorder QR only, never location maps)
    let qrDataUrl = '';
    if (templateType === TEMPLATE_TYPES.BILL || templateType === TEMPLATE_TYPES.DELIVERY) {
      const origin = window?.location?.origin || '';
      const slug = job.restaurant?.slug || 'burgersmoke';
      let qrUrl = job.reorderQrUrl;
      if (!qrUrl) {
        const table = job.order?.table || job.order?.tableNumber;
        const orderId = job.order?.id;
        const params = new URLSearchParams();
        if (table) params.set('table', table);
        if (orderId) params.set('order', orderId);
        const qs = params.toString();
        qrUrl = `${origin}/${slug}${qs ? `?${qs}` : ''}`;
      }
      if (qrUrl) {
        try {
          qrDataUrl = await QRCode.toDataURL(qrUrl, {
            margin: 1,
            width: paperSize === PAPER_SIZES.SIZE_58MM ? 65 : 85,
            errorCorrectionLevel: 'M',
          });
        } catch (err) {
          console.warn('BrowserPrint QR generation error:', err);
        }
      }
    }

    // 3. Build Print DOM container
    let portal = document.getElementById('dineflow-browser-print-portal') || document.getElementById('dinehq-browser-print-portal');
    if (!portal) {
      portal = document.createElement('div');
      portal.id = 'dineflow-browser-print-portal';
      document.body.appendChild(portal);
    }

    const { order, restaurant } = job;

    portal.innerHTML = generateReceiptHtml({
      templateType,
      paperSize,
      order,
      restaurant,
      settings: templateSettings,
      qrDataUrl,
      salesSummary: job.salesSummary,
    });

    // 4. Trigger print (skip blocking print dialog during automated health check diagnostics)
    if (!config.skipDialog && !job.isHealthCheck) {
      try {
        if (typeof window !== 'undefined' && typeof window.print === 'function') {
          window.print();
        }
      } catch (e) {
        console.warn('window.print call notice:', e);
      }
    }

    // 5. Cleanup after short delay
    setTimeout(() => {
      if (portal) portal.innerHTML = '';
      if (styleEl) styleEl.textContent = '';
    }, 1500);

    return { success: true, method: this.name, templateType, paperSize };
  }
}
