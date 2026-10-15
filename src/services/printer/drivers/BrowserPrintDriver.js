/**
 * Browser Print Driver
 * Universal driver utilizing window.print() and dynamic CSS @page rules
 * for 58mm, 80mm, and A4 paper sizes with KOT, Customer Bill, and Delivery Slip templates.
 */

import { BaseDriver } from './BaseDriver';
import { DRIVER_IDS, PAPER_SIZES, TEMPLATE_TYPES } from '../printerTypes';
import { printerService } from '../printerService';
import { generateReceiptHtml } from '../templateHtmlGenerator';
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

  async print(job, config = {}) {
    if (!this.isSupported()) {
      throw new Error('Browser printing is not available on this platform.');
    }

    const paperSize = config.paperSize || job.paperSize || PAPER_SIZES.SIZE_80MM;
    const templateType = job.templateType || TEMPLATE_TYPES.KOT;
    const templateSettings = job.templateSettings || printerService.getTemplateSettings();

    // 1. Inject Dynamic @page style tag into document head
    const styleId = 'dinehq-dynamic-page-print-style';
    let styleEl = document.getElementById(styleId);
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
        #dinehq-browser-print-portal,
        #dinehq-browser-print-portal * {
          visibility: visible !important;
        }
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

    // 2. Generate direct QR Code if requested or if customer bill
    const qrUrl = job.reorderQrUrl || `${window?.location?.origin || ''}/${job.restaurant?.slug || ''}`;
    let qrDataUrl = '';
    if (qrUrl && templateType === TEMPLATE_TYPES.BILL) {
      try {
        qrDataUrl = await QRCode.toDataURL(qrUrl, {
          margin: 1,
          width: paperSize === PAPER_SIZES.SIZE_58MM ? 100 : 130,
        });
      } catch (err) {
        console.warn('BrowserPrint QR generation error:', err);
      }
    }

    // 3. Build Print DOM container
    let portal = document.getElementById('dinehq-browser-print-portal');
    if (!portal) {
      portal = document.createElement('div');
      portal.id = 'dinehq-browser-print-portal';
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
    });

    // 4. Trigger print
    window.print();

    // 5. Cleanup after short delay
    setTimeout(() => {
      if (portal) portal.innerHTML = '';
      if (styleEl) styleEl.textContent = '';
    }, 1500);

    return { success: true, method: this.name, templateType, paperSize };
  }
}
