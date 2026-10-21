/**
 * Abstract Base Printer Driver
 * Defines the contract that every DineHQ printer connection method implements.
 */

import { EscposEncoder } from '../escposEncoder.js';
import { jobContainsUrdu, renderReceiptToCanvas } from '../receiptCanvasRenderer.js';
import { PAPER_SIZES, TEMPLATE_TYPES } from '../printerTypes.js';
import { formatPKR } from '../../../utils/currencyUtils.js';
import { buildGoogleMapsNavUrl } from '../../../config/mapConfig.js';

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

  async testConnection(_config = {}) {
    return {
      connected: this.isConnected(),
      message: `${this.name} communication pipeline ready.`,
      latencyMs: 5,
    };
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

      const isDelivery = job.templateType === TEMPLATE_TYPES.DELIVERY;

      // Header
      encoder.align('center');
      encoder.size('double');
      encoder.bold(true);
      encoder.line(restaurant?.name || (isDelivery ? 'DELIVERY DISPATCH' : 'KITCHEN RECEIPT'));
      encoder.size('normal');
      encoder.bold(false);
      encoder.line(isDelivery ? 'DELIVERY DISPATCH SLIP' : 'KITCHEN ORDER TICKET (KOT)');
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
      if (order?.house_flat) encoder.line(`House/Flat: ${order.house_flat}`);
      if (order?.area_landmark) encoder.line(`Landmark: ${order.area_landmark}`);
      if (order?.customer_address) encoder.line(`Address: ${order.customer_address}`);
      if (order?.latitude && order?.longitude) {
        encoder.line(`GPS Pin: ${Number(order.latitude).toFixed(6)}, ${Number(order.longitude).toFixed(6)}${order.accuracy ? ` (±${Math.round(order.accuracy)}m)` : ''}`);
      }
      const riderNotes = order?.rider_notes || order?.delivery_notes || order?.customer_notes;
      if (riderNotes) {
        encoder.bold(true);
        encoder.line(`NOTE: ${riderNotes}`);
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
              encoder.line(`  • ${c}`);
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

      // QR Code for Delivery Navigation or Customer Reordering
      const qrUrl = isDelivery
        ? buildGoogleMapsNavUrl(order)
        : (reorderQrUrl || `${window?.location?.origin || ''}/${restaurant?.slug || ''}`);
      const qrTitle = isDelivery ? 'SCAN FOR GOOGLE MAPS NAVIGATION' : 'SCAN TO REORDER DIRECTLY';
      if (qrUrl) {
        encoder.align('center');
        encoder.feed(1);
        encoder.qrCode(qrUrl, is58mm ? 4 : 5);
        encoder.feed(1);
        encoder.line(qrTitle);
        encoder.line(qrUrl);
        encoder.feed(1);
      }

      // Footer
      encoder.align('center');
      encoder.line(`Thank you for ordering with ${restaurant?.name || 'us'}!`);
      encoder.line('DineHQ Direct Online Kitchen');
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
