/**
 * Abstract Base Printer Driver
 * Defines the contract that every DineHQ printer connection method implements.
 */

import { EscposEncoder } from '../escposEncoder';
import { jobContainsUrdu, renderReceiptToCanvas } from '../receiptCanvasRenderer';
import { PAPER_SIZES } from '../printerTypes';
import { formatPKR } from '../../../utils/currencyUtils';

export class BaseDriver {
  constructor(id, name) {
    this.id = id;
    this.name = name;
  }

  isSupported() {
    return true;
  }

  isConnected() {
    return true;
  }

  async connect(_options = {}) {
    return true;
  }

  async disconnect() {
    return true;
  }

  async print(_job, _options = {}) {
    throw new Error(`print(job) not implemented for ${this.name}`);
  }

  /**
   * Universal ESC/POS Binary Formatter.
   * If receipt contains Urdu, automatically rasterizes via high-contrast Canvas.
   * If pure English/numbers, outputs high-speed native ESC/POS commands.
   */
  async formatJobToEscpos(job, config = {}) {
    const encoder = new EscposEncoder();
    encoder.init();

    // Cash Drawer Kick before printing (if enabled)
    if (config.kickCashDrawer || job.kickCashDrawer) {
      encoder.kickDrawer();
    }

    const isUrdu = jobContainsUrdu(job);
    const paperSize = config.paperSize || job.paperSize || PAPER_SIZES.SIZE_80MM;
    const is58mm = paperSize === PAPER_SIZES.SIZE_58MM;
    const charWidth = is58mm ? 32 : 48;

    if (isUrdu) {
      // 1. Urdu / Nastaliq Raster Printing Mode
      // Thermal hardware lacks Urdu fonts, so we rasterize onto canvas & send 1-bit bitmap
      const canvas = await renderReceiptToCanvas({ ...job, paperSize });
      encoder.align('center');
      encoder.rasterImage(canvas);
      encoder.feed(2);
    } else {
      // 2. Ultra-fast Native ESC/POS Formatting (English & numbers)
      const { order, restaurant, reorderQrUrl } = job;

      // Header
      encoder.align('center');
      encoder.size('double');
      encoder.bold(true);
      encoder.line(restaurant?.name || 'KITCHEN RECEIPT');
      encoder.size('normal');
      encoder.bold(false);
      encoder.line('KITCHEN ORDER TICKET (KOT)');
      encoder.bold(true);
      encoder.line(`ORDER #${order?.id || '---'}`);
      encoder.bold(false);
      const dateStr = order?.created_at
        ? new Date(order.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
        : new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
      encoder.line(dateStr);
      encoder.rule(charWidth, '-');

      // Customer Info
      encoder.align('left');
      if (order?.customer_name) encoder.line(`Customer: ${order.customer_name}`);
      if (order?.customer_phone) encoder.line(`Phone: +${order.customer_phone}`);
      if (order?.customer_address) encoder.line(`Address: ${order.customer_address}`);
      if (order?.customer_notes) {
        encoder.bold(true);
        encoder.line(`NOTE: ${order.customer_notes}`);
        encoder.bold(false);
      }
      encoder.rule(charWidth, '-');

      // Items Table
      encoder.bold(true);
      encoder.twoColumns('ITEM', 'TOTAL', charWidth);
      encoder.bold(false);

      if (Array.isArray(order?.items)) {
        for (const item of order.items) {
          const titleStr = `${item.quantity}x ${item.title}`;
          const priceStr = formatPKR((item.unitPrice || 0) * (item.quantity || 1));
          encoder.twoColumns(titleStr, priceStr, charWidth);

          if (item.dealItems) {
            encoder.line(`  * ${item.dealItems}`);
          }
          if (Array.isArray(item.choices)) {
            for (const c of item.choices) {
              encoder.line(`  ↳ ${c}`);
            }
          }
        }
      }
      encoder.rule(charWidth, '-');

      // Totals
      encoder.twoColumns('Subtotal:', formatPKR(order?.subtotal || 0), charWidth);
      if (order?.delivery_fee > 0) {
        encoder.twoColumns('Delivery Fee:', formatPKR(order.delivery_fee), charWidth);
      }
      encoder.rule(charWidth, '=');
      encoder.bold(true);
      encoder.size('double-height');
      encoder.twoColumns('TOTAL DUE:', formatPKR(order?.total_payable || 0), charWidth);
      encoder.size('normal');
      encoder.bold(false);
      encoder.rule(charWidth, '-');

      // QR Code for Reordering
      const qrUrl = reorderQrUrl || `${window?.location?.origin || ''}/${restaurant?.slug || ''}`;
      if (qrUrl) {
        encoder.align('center');
        encoder.feed(1);
        encoder.qrCode(qrUrl, is58mm ? 4 : 5);
        encoder.feed(1);
        encoder.line('SCAN TO REORDER DIRECTLY');
        encoder.line(qrUrl);
        encoder.feed(1);
      }

      // Footer
      encoder.align('center');
      encoder.line(`Thank you for ordering with ${restaurant?.name || 'us'}!`);
      encoder.line('DineHQ Direct WhatsApp Ordering');
    }

    // Cut Paper (if enabled)
    if (config.cutPaper !== false && job.cutPaper !== false) {
      encoder.cut(true);
    } else {
      encoder.feed(3);
    }

    return encoder.encode();
  }
}
