/**
 * Template HTML Generator for Direct Printouts
 * Generates adapted concise HTML for KOT, Customer Bill, and Delivery Slip
 * supporting 58mm, 80mm, and A4 paper sizes, Rs. currency, 12-hour time,
 * and compact spacing with only the restaurant menu QR code (no location maps QR).
 */

import { formatPKR } from '../../utils/currencyUtils.js';
import { format12HourTime } from '../../utils/dateUtils.js';
import { TEMPLATE_TYPES, PAPER_SIZES } from './printerTypes.js';

export function generateReceiptHtml({
  templateType = TEMPLATE_TYPES.KOT,
  paperSize = PAPER_SIZES.SIZE_80MM,
  order,
  restaurant,
  settings = {},
  qrDataUrl = '',
  salesSummary = null,
}) {
  const {
    showLogo = false, // Default is NO as requested by owner
    showPhone = true,
    footerMessage = 'Thank you for ordering with us! Visit again soon.',
    language = 'en', // 'en'
    fontSize = 'normal', // 'normal' | 'large'
  } = settings;

  const is58mm = paperSize === PAPER_SIZES.SIZE_58MM;
  const isA4 = paperSize === PAPER_SIZES.SIZE_A4;
  const isLarge = fontSize === 'large';
  const showUrdu = false;
  const showEnglish = true;

  const dateInfo = format12HourTime(order?.created_at);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const table = order?.table || order?.tableNumber;
  const params = new URLSearchParams();
  if (table) params.set('table', table);
  if (order?.id) params.set('order', order.id);
  const qs = params.toString();
  const reorderUrl = `${origin}/${restaurant?.slug || 'burgersmoke'}${qs ? `?${qs}` : ''}`;

  // Font sizing styles
  const baseFontSize = is58mm ? (isLarge ? '11px' : '10px') : isA4 ? (isLarge ? '14px' : '12px') : isLarge ? '12px' : '11px';

  // 1. KITCHEN ORDER TICKET (KOT)
  if (templateType === TEMPLATE_TYPES.KOT) {
    return `
      <div style="font-size: ${baseFontSize}; line-height: 1.18; color: #000; font-family: monospace, -apple-system, sans-serif;">
        <!-- Header -->
        <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 3px; margin-bottom: 3px;">
          ${showLogo && restaurant?.logo_url ? `
            <img src="${restaurant.logo_url}" style="max-height: 28px; max-width: 100px; margin: 0 auto 2px auto; display: block; object-fit: contain;" />
          ` : ''}
          <h2 style="font-size: ${is58mm ? '13px' : '15px'}; font-weight: 900; margin: 0; text-transform: uppercase;">
            ${restaurant?.name || 'KITCHEN TICKET'}
          </h2>
          <div style="font-size: 9px; font-weight: bold; margin-top: 1px;">
            KOT
          </div>
        </div>

        <!-- Compact Order # & Table/Type Banner -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding: 3px 0; margin-bottom: 4px;">
          <div>
            <span style="font-size: ${is58mm ? '18px' : '22px'}; font-weight: 900; font-family: monospace; letter-spacing: -0.5px;">
              #${order?.id || '---'}
            </span>
            <span style="display: inline-block; background: #000; color: #fff; font-weight: 900; font-size: ${is58mm ? '10px' : '11px'}; padding: 1px 5px; border-radius: 2px; text-transform: uppercase; margin-left: 4px;">
              ${order?.table ? `TABLE: ${order.table}` : order?.order_type === 'pickup' ? 'TAKEAWAY' : 'DELIVERY'}
            </span>
          </div>
          <div style="font-size: 9px; font-weight: bold; text-align: right; line-height: 1.1;">
            <div>${dateInfo.timeOnly}</div>
            <div style="color: #555;">${dateInfo.dateOnly}</div>
          </div>
        </div>

        <!-- Order Notes (Highlighted Box) -->
        ${order?.customer_notes ? `
          <div style="background: #fff8e1; border: 1px solid #000; padding: 3px 5px; margin-bottom: 4px; font-weight: bold; font-size: 10px; border-radius: 2px; word-break: break-word;">
            <span style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #b78103;">
              NOTES:
            </span>
            <span>${order.customer_notes}</span>
          </div>
        ` : ''}

        <!-- Items in bold text with quantity first, indented choices, NO PRICES -->
        <div style="margin-bottom: 4px;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #000; font-size: 9px; font-weight: 900; padding-bottom: 2px; margin-bottom: 2px; text-transform: uppercase;">
            <span>QTY & ITEM</span>
            <span>READY</span>
          </div>

          ${(order?.items || []).map((item) => `
            <div style="padding: 2px 0; border-bottom: 1px dotted #ccc;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="font-size: ${is58mm ? '12px' : '13px'}; font-weight: 900; word-break: break-word; flex: 1;">
                  <span style="display: inline-block; background: #000; color: #fff; padding: 1px 4px; border-radius: 2px; margin-right: 3px; font-family: monospace;">
                    ${item.quantity}x
                  </span>
                  <span>${item.title}</span>
                </div>
                <div style="width: 12px; height: 12px; border: 1px solid #000; border-radius: 2px; margin-left: 4px; flex-shrink: 0; margin-top: 1px;"></div>
              </div>

              ${item.dealItems ? `
                <div style="font-size: 9px; font-weight: bold; color: #444; padding-left: 14px; font-style: italic; word-break: break-word; margin-top: 1px;">
                  * ${item.dealItems}
                </div>
              ` : ''}

              ${Array.isArray(item.choices) && item.choices.length > 0 ? `
                <div style="padding-left: 14px; font-size: 10px; font-weight: bold; color: #333; margin-top: 1px;">
                  ${item.choices.map((c) => `<div style="word-break: break-word;">• ${c}</div>`).join('')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>

        <!-- Footer -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #000; padding-top: 3px; font-size: 9px; font-weight: bold;">
          <div>TOTAL: ${(order?.items || []).reduce((acc, i) => acc + (parseInt(i.quantity, 10) || 1), 0)} ITEMS</div>
          <div style="font-size: 8px; color: #666;">Dineflow Kitchen</div>
        </div>
      </div>
    `;
  }

  // 2. CUSTOMER BILL
  if (templateType === TEMPLATE_TYPES.BILL) {
    return `
      <div style="font-size: ${baseFontSize}; line-height: 1.18; color: #000; font-family: monospace, -apple-system, sans-serif;">
        <!-- Logo & Header -->
        <div style="text-align: center; border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 3px;">
          ${showLogo && restaurant?.logo_url ? `
            <img src="${restaurant.logo_url}" style="max-height: 28px; max-width: 100px; margin: 0 auto 2px auto; display: block; object-fit: contain;" />
          ` : ''}
          <h1 style="font-size: ${is58mm ? '14px' : '16px'}; font-weight: 900; margin: 0; text-transform: uppercase;">
            ${restaurant?.name || 'Customer Bill'}
          </h1>
          ${showPhone && (restaurant?.phone || restaurant?.whatsapp_number) ? `
            <div style="font-size: 10px; font-weight: bold; margin-top: 1px;">Ph: +${restaurant?.phone || restaurant?.whatsapp_number}</div>
          ` : ''}
          <div style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #555; margin-top: 1px;">
            Tax Invoice / Receipt
          </div>
        </div>

        <!-- Meta Details -->
        <div style="font-size: 10px; border-bottom: 1px dashed #000; padding-bottom: 3px; margin-bottom: 3px;">
          <div style="display: flex; justify-content: space-between;">
            <span>Order #: <strong style="font-family: monospace;">#${order?.id || '---'}</strong></span>
            <span>${dateInfo.timeOnly} • ${dateInfo.dateOnly}</span>
          </div>
          ${(order?.customer_name || order?.customer_phone) ? `
            <div style="display: flex; justify-content: space-between; color: #444;">
              <span>${order.customer_name || 'Customer'}</span>
              ${order.customer_phone ? `<span>+${order.customer_phone}</span>` : ''}
            </div>
          ` : ''}
        </div>

        <!-- Items with Quantity & Rs. Price -->
        <div style="margin-bottom: 4px;">
          <table style="width: 100%; border-collapse: collapse; font-size: ${baseFontSize};">
            <thead>
              <tr style="border-bottom: 1px solid #000; font-size: 9px; font-weight: 900; text-transform: uppercase;">
                <th style="text-align: left; padding: 1px 0;">ITEM</th>
                <th style="text-align: center; padding: 1px 2px; width: 26px;">QTY</th>
                <th style="text-align: right; padding: 1px 0; width: 55px;">PRICE</th>
              </tr>
            </thead>
            <tbody>
              ${(order?.items || []).map((item) => `
                <tr style="vertical-align: top; border-bottom: 1px dotted #eee;">
                  <td style="padding: 2px 0; word-break: break-word;">
                    <div style="font-weight: bold;">${item.title}</div>
                    ${item.dealItems ? `<div style="font-size: 8px; color: #555; padding-left: 3px;">* ${item.dealItems}</div>` : ''}
                    ${(item.choices || []).map((c) => `<div style="font-size: 8px; color: #555; padding-left: 3px;">• ${c}</div>`).join('')}
                  </td>
                  <td style="padding: 2px 2px; text-align: center; font-weight: bold; font-family: monospace;">
                    ${item.quantity}
                  </td>
                  <td style="padding: 2px 0; text-align: right; font-weight: bold; font-family: monospace; white-space: nowrap;">
                    ${formatPKR((item.unitPrice || 0) * (item.quantity || 1))}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Subtotal, Delivery, Discount, and Bold Total -->
        <div style="border-top: 1px solid #000; padding-top: 3px; font-size: 10px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 1px; color: #333;">
            <span>Subtotal:</span>
            <span style="font-family: monospace; font-weight: bold;">${formatPKR(order?.subtotal || 0)}</span>
          </div>

          ${Number(order?.delivery_fee) > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 1px; color: #333;">
              <span>Delivery Fee:</span>
              <span style="font-family: monospace; font-weight: bold;">${formatPKR(order.delivery_fee)}</span>
            </div>
          ` : ''}

          ${Number(order?.discount) > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 1px; color: #0a0; font-weight: bold;">
              <span>Discount:</span>
              <span style="font-family: monospace;">-${formatPKR(order.discount)}</span>
            </div>
          ` : ''}

          <!-- BOLD CONCISE TOTAL -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #000; padding-top: 3px; margin-top: 2px; font-size: ${is58mm ? '13px' : '15px'}; font-weight: 900;">
            <span>TOTAL:</span>
            <span style="font-family: monospace; font-weight: 900;">${formatPKR(order?.total_payable || 0)}</span>
          </div>

          <!-- Payment Method -->
          <div style="text-align: center; margin-top: 2px;">
            <span style="display: inline-block; background: #f0f0f0; border: 1px solid #ccc; padding: 1px 6px; border-radius: 2px; font-size: 9px; font-weight: bold; text-transform: uppercase;">
              Payment: ${order?.payment_method || 'Cash on Delivery'}
            </span>
          </div>
        </div>

        <!-- Footer Message -->
        ${footerMessage ? `
          <div style="text-align: center; border-top: 1px dashed #000; padding-top: 3px; margin-top: 3px; font-size: 9px; font-weight: bold; word-break: break-word;">
            <div>${footerMessage}</div>
          </div>
        ` : ''}

        <!-- Bottom Restaurant QR Code -->
        ${qrDataUrl ? `
          <div style="text-align: center; border-top: 1px dashed #ccc; padding-top: 3px; margin-top: 3px;">
            <img src="${qrDataUrl}" style="margin: 0 auto; display: block; max-width: ${is58mm ? '52px' : '68px'};" alt="Restaurant Menu QR" />
            <div style="font-size: 8px; font-weight: bold; margin-top: 1px; text-transform: uppercase;">Scan to Order</div>
            ${order?.id ? `
              <div style="font-size: 7px; color: #555; word-break: break-all; margin-top: 1px;">
                /${restaurant?.slug || 'menu'}?order=${order.id}${order?.table ? `&table=${order.table}` : ''}
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }

  // 3. DELIVERY SLIP (No location QR, only Restaurant Menu QR)
  if (templateType === TEMPLATE_TYPES.DELIVERY) {
    return `
      <div style="font-size: ${baseFontSize}; line-height: 1.18; color: #000; font-family: monospace, -apple-system, sans-serif;">
        <!-- Header -->
        <div style="text-align: center; border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 3px;">
          ${showLogo && restaurant?.logo_url ? `
            <img src="${restaurant.logo_url}" style="max-height: 28px; max-width: 100px; margin: 0 auto 2px auto; display: block; object-fit: contain;" />
          ` : ''}
          <h1 style="font-size: ${is58mm ? '13px' : '15px'}; font-weight: 900; margin: 0; text-transform: uppercase;">
            DELIVERY DISPATCH SLIP
          </h1>
          <div style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #555; margin-top: 1px;">
            Rider Manifest
          </div>
        </div>

        <!-- Order & Time -->
        <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; border-bottom: 1px dashed #000; padding-bottom: 2px; margin-bottom: 3px;">
          <span>Order: <strong style="font-size: 12px; font-family: monospace;">#${order?.id || '---'}</strong></span>
          <span>${dateInfo.timeOnly}</span>
        </div>

        <!-- Customer Name & Phone in 1 line -->
        <div style="background: #f7f7f7; border: 1px solid #000; padding: 3px 5px; margin-bottom: 3px; border-radius: 2px; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
          <strong style="text-transform: uppercase;">${order?.customer_name || 'Guest Customer'}</strong>
          ${order?.customer_phone ? `<span style="font-family: monospace; font-weight: 900;">+${order.customer_phone}</span>` : ''}
        </div>

        <!-- Full Delivery Address -->
        <div style="border: 1px solid #000; padding: 4px 6px; font-weight: bold; font-size: 11px; word-break: break-word; border-radius: 2px; background: #fff; margin-bottom: 3px;">
          <div style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #444; margin-bottom: 1px;">
            DELIVERY ADDRESS:
          </div>
          ${order?.house_flat ? `<div style="font-weight: 900; color: #111;">House/Flat: ${order.house_flat}</div>` : ''}
          ${order?.area_landmark ? `<div style="font-size: 10px; color: #444;">Landmark: ${order.area_landmark}</div>` : ''}
          <div>${order?.customer_address || 'Counter Pickup (No delivery address)'}</div>
          ${(order?.latitude && order?.longitude) ? `
            <div style="font-size: 8px; font-family: monospace; font-weight: bold; color: #1b5e20; margin-top: 2px; padding-top: 2px; border-top: 1px dotted #ccc;">
              GPS Pin: ${Number(order.latitude).toFixed(5)}, ${Number(order.longitude).toFixed(5)}
            </div>
          ` : ''}
        </div>

        <!-- Rider Notes / Customer Instructions -->
        ${(order?.rider_notes || order?.delivery_notes || order?.customer_notes) ? `
          <div style="background: #fff8e1; border: 1px solid #000; padding: 3px 5px; margin-bottom: 3px; font-weight: bold; font-size: 10px; border-radius: 2px; word-break: break-word;">
            <span style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #b78103;">RIDER NOTE:</span>
            <span>${order?.rider_notes || order?.delivery_notes || order?.customer_notes}</span>
          </div>
        ` : ''}

        <!-- Items with Quantity & Rs. Price (Like Customer Bill) -->
        <div style="margin-bottom: 4px;">
          <table style="width: 100%; border-collapse: collapse; font-size: ${baseFontSize};">
            <thead>
              <tr style="border-bottom: 1px solid #000; font-size: 9px; font-weight: 900; text-transform: uppercase;">
                <th style="text-align: left; padding: 1px 0;">ITEM</th>
                <th style="text-align: center; padding: 1px 2px; width: 26px;">QTY</th>
                <th style="text-align: right; padding: 1px 0; width: 55px;">PRICE</th>
              </tr>
            </thead>
            <tbody>
              ${(order?.items || []).map((item) => `
                <tr style="vertical-align: top; border-bottom: 1px dotted #eee;">
                  <td style="padding: 2px 0; word-break: break-word;">
                    <div style="font-weight: bold;">${item.title}</div>
                    ${item.dealItems ? `<div style="font-size: 8px; color: #555; padding-left: 3px;">* ${item.dealItems}</div>` : ''}
                    ${(item.choices || []).map((c) => `<div style="font-size: 8px; color: #555; padding-left: 3px;">• ${c}</div>`).join('')}
                  </td>
                  <td style="padding: 2px 2px; text-align: center; font-weight: bold; font-family: monospace;">
                    ${item.quantity}
                  </td>
                  <td style="padding: 2px 0; text-align: right; font-weight: bold; font-family: monospace; white-space: nowrap;">
                    ${formatPKR((item.unitPrice || 0) * (item.quantity || 1))}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Subtotal, Delivery Fee, Discount, and Bold Total -->
        <div style="border-top: 1px solid #000; padding-top: 3px; font-size: 10px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 1px; color: #333;">
            <span>Subtotal:</span>
            <span style="font-family: monospace; font-weight: bold;">${formatPKR(order?.subtotal || 0)}</span>
          </div>

          ${Number(order?.delivery_fee) > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 1px; color: #333;">
              <span>Delivery Fee:</span>
              <span style="font-family: monospace; font-weight: bold;">${formatPKR(order.delivery_fee)}</span>
            </div>
          ` : ''}

          ${Number(order?.discount) > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 1px; color: #0a0; font-weight: bold;">
              <span>Discount:</span>
              <span style="font-family: monospace;">-${formatPKR(order.discount)}</span>
            </div>
          ` : ''}

          <!-- BOLD CONCISE TOTAL / CASH TO COLLECT -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #000; padding-top: 3px; margin-top: 2px; font-size: ${is58mm ? '13px' : '15px'}; font-weight: 900;">
            <span>${order?.payment_method?.toLowerCase()?.includes('cash') || !order?.payment_method ? 'CASH TO COLLECT:' : 'TOTAL PAYABLE:'}</span>
            <span style="font-family: monospace; font-weight: 900;">${formatPKR(order?.total_payable || 0)}</span>
          </div>

          <!-- Payment Method -->
          <div style="text-align: center; margin-top: 2px;">
            <span style="display: inline-block; background: #f0f0f0; border: 1px solid #ccc; padding: 1px 6px; border-radius: 2px; font-size: 9px; font-weight: bold; text-transform: uppercase;">
              Payment: ${order?.payment_method || 'Cash on Delivery'}
            </span>
          </div>
        </div>

        <!-- Footer Message -->
        ${footerMessage ? `
          <div style="text-align: center; border-top: 1px dashed #000; padding-top: 3px; margin-top: 3px; font-size: 9px; font-weight: bold; word-break: break-word;">
            <div>${footerMessage}</div>
          </div>
        ` : ''}

        <!-- Bottom Restaurant Menu QR (Restaurant QR only, never location maps) -->
        ${qrDataUrl ? `
          <div style="text-align: center; border-top: 1px dashed #000; padding-top: 3px; margin-top: 3px;">
            <img src="${qrDataUrl}" style="margin: 0 auto; display: block; max-width: ${is58mm ? '48px' : '60px'};" alt="Restaurant Menu QR" />
            <div style="font-size: 8px; font-weight: bold; margin-top: 1px; text-transform: uppercase;">Restaurant Menu & Reorder</div>
          </div>
        ` : ''}

        <!-- Sign-off -->
        <div style="text-align: center; border-top: 1px dotted #ccc; padding-top: 2px; font-size: 8px; color: #777;">
          <div>${restaurant?.name || 'Restaurant'} • Dineflow Rider Dispatch</div>
        </div>
      </div>
    `;
  }

  // 4. TODAY'S SALES SUMMARY (Optimized for 80mm paper)
  if (templateType === TEMPLATE_TYPES.SALES_SUMMARY || salesSummary) {
    const summary = salesSummary || order?.salesSummary || {};
    const topItems = summary.topItems || [];
    const dateFormatted = summary.date || dateInfo.dateOnly;
    const timeFormatted = summary.time || dateInfo.timeOnly;

    return `
      <div style="font-size: ${baseFontSize}; line-height: 1.18; color: #000; font-family: monospace, -apple-system, sans-serif;">
        <!-- Header -->
        <div style="text-align: center; border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 3px;">
          ${showLogo && restaurant?.logo_url ? `
            <img src="${restaurant.logo_url}" style="max-height: 28px; max-width: 100px; margin: 0 auto 2px auto; display: block; object-fit: contain;" />
          ` : ''}
          <h1 style="font-size: ${is58mm ? '14px' : '16px'}; font-weight: 900; margin: 0; text-transform: uppercase;">
            ${restaurant?.name || 'Restaurant'}
          </h1>
          ${showPhone && (restaurant?.phone || restaurant?.whatsapp_number) ? `
            <div style="font-size: 10px; font-weight: bold; margin-top: 1px;">Ph: +${restaurant?.phone || restaurant?.whatsapp_number}</div>
          ` : ''}
          <div style="display: inline-block; background: #000; color: #fff; font-size: 10px; font-weight: 900; padding: 1px 6px; border-radius: 2px; margin-top: 2px; text-transform: uppercase;">
            TODAY'S SALES SUMMARY
          </div>
        </div>

        <!-- Meta: Date & Shift Time -->
        <div style="font-size: 10px; border-bottom: 1px dashed #000; padding-bottom: 3px; margin-bottom: 3px;">
          <div style="display: flex; justify-content: space-between;">
            <span>Report Date:</span>
            <span style="font-weight: bold;">${dateFormatted}</span>
          </div>
          <div style="display: flex; justify-content: space-between; color: #555;">
            <span>Generated At:</span>
            <span>${timeFormatted}</span>
          </div>
        </div>

        <!-- Highlight KPI Box -->
        <div style="border: 1px solid #000; background: #f8f8f8; padding: 4px 6px; margin-bottom: 3px; border-radius: 2px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #ccc; padding-bottom: 2px; margin-bottom: 2px;">
            <span style="font-size: 9px; font-weight: 900; text-transform: uppercase;">ORDERS:</span>
            <span style="font-size: 13px; font-weight: 900; font-family: monospace;">
              ${summary.totalOrders || 0}
            </span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 10px; font-weight: 900; text-transform: uppercase;">TOTAL:</span>
            <span style="font-size: ${is58mm ? '14px' : '17px'}; font-weight: 900; font-family: monospace;">
              ${formatPKR(summary.totalSales || 0)}
            </span>
          </div>
        </div>

        <!-- Payment Breakdown: Cash vs Online -->
        <div style="margin-bottom: 3px;">
          <div style="font-size: 9px; font-weight: 900; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 1px; margin-bottom: 2px;">
            PAYMENT BREAKDOWN
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: ${baseFontSize};">
            <tbody>
              <tr style="border-bottom: 1px dotted #ccc;">
                <td style="padding: 2px 0; font-weight: bold;">
                  <span>Cash on Delivery</span>
                  <div style="font-size: 8px; color: #555;">${summary.cashSales?.count || 0} orders</div>
                </td>
                <td style="padding: 2px 0; text-align: right; font-weight: 900; font-family: monospace; white-space: nowrap;">
                  ${formatPKR(summary.cashSales?.total || 0)}
                </td>
              </tr>
              <tr style="border-bottom: 1px dotted #ccc;">
                <td style="padding: 2px 0; font-weight: bold;">
                  <span>Online / Card</span>
                  <div style="font-size: 8px; color: #555;">${summary.onlineSales?.count || 0} orders</div>
                </td>
                <td style="padding: 2px 0; text-align: right; font-weight: 900; font-family: monospace; white-space: nowrap;">
                  ${formatPKR(summary.onlineSales?.total || 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Top 5 Items -->
        <div style="margin-bottom: 4px;">
          <div style="font-size: 9px; font-weight: 900; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 1px; margin-bottom: 2px; display: flex; justify-content: space-between;">
            <span>TOP ITEMS</span>
            <span>QTY / REVENUE</span>
          </div>

          ${topItems.length > 0 ? `
            <table style="width: 100%; border-collapse: collapse; font-size: ${baseFontSize};">
              <tbody>
                ${topItems.map((item, idx) => `
                  <tr style="border-bottom: 1px dotted #eee; vertical-align: top;">
                    <td style="padding: 2px 0; word-break: break-word;">
                      <span style="font-weight: 900; margin-right: 3px;">#${idx + 1}</span>
                      <span style="font-weight: bold;">${item.title}</span>
                    </td>
                    <td style="padding: 2px 0; text-align: right; font-family: monospace; white-space: nowrap;">
                      <span style="font-weight: 900; display: inline-block; background: #eee; padding: 1px 3px; border-radius: 2px; margin-right: 3px; font-size: 9px;">
                        ${item.quantity}x
                      </span>
                      <span style="font-weight: bold;">${formatPKR(item.revenue || 0)}</span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : `
            <div style="font-size: 9px; font-style: italic; color: #666; padding: 2px 0;">No sales recorded yet today.</div>
          `}
        </div>

        <!-- System Footer Note -->
        <div style="border-top: 1px solid #000; padding-top: 3px; font-size: 8px; text-align: center; color: #555;">
          <div>Dineflow Restaurant POS & Management</div>
        </div>
      </div>
    `;
  }

  return '';
}
