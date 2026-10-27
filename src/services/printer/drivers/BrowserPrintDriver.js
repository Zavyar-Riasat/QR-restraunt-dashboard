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

  isConnected() {
    return true;
  }

  /**
   * Health Check: Test Browser Print readiness (A4, 80mm, 58mm)
   */
  async testConnection(config = {}) {
    const start = performance.now();
    const isAvail = this.isSupported();
    const paperSize = config.paperSize || PAPER_SIZES.SIZE_80MM;

    return {
      connected: isAvail,
      latencyMs: Math.max(1, Math.round(performance.now() - start)),
      message: isAvail
        ? `Browser print engine active and ready for ${paperSize === PAPER_SIZES.SIZE_A4 ? 'A4 regular printer' : `${paperSize} receipt printer`}.`
        : 'Browser printing is not supported in this runtime environment.',
      details: 'Universal driver: works on Windows, macOS, Android, and iPhone Safari without external drivers.',
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
