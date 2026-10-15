/**
 * Template HTML Generator for Direct Printouts
 * Generates adapted HTML for KOT, Customer Bill, and Delivery Slip
 * supporting 58mm, 80mm, and A4 paper sizes, Rs. currency, 12-hour time,
 * and text wrapping.
 */

import { formatPKR } from '../../utils/currencyUtils';
import { format12HourTime } from '../../utils/dateUtils';
import { TEMPLATE_TYPES, PAPER_SIZES } from './printerTypes';

export function generateReceiptHtml({
  templateType = TEMPLATE_TYPES.KOT,
  paperSize = PAPER_SIZES.SIZE_80MM,
  order,
  restaurant,
  settings = {},
  qrDataUrl = '',
}) {
  const {
    showLogo = true,
    showPhone = true,
    footerMessage = 'Thank you for ordering with us! Visit again soon.',
    language = 'both', // 'en' | 'ur' | 'both'
    fontSize = 'normal', // 'normal' | 'large'
  } = settings;

  const is58mm = paperSize === PAPER_SIZES.SIZE_58MM;
  const isA4 = paperSize === PAPER_SIZES.SIZE_A4;
  const isLarge = fontSize === 'large';
  const showUrdu = language === 'ur' || language === 'both';
  const showEnglish = language === 'en' || language === 'both';

  const dateInfo = format12HourTime(order?.created_at);
  const reorderUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/${
    restaurant?.slug || 'burgersmoke'
  }`;

  // Font sizing styles
  const baseFontSize = is58mm ? (isLarge ? '12px' : '11px') : isA4 ? (isLarge ? '15px' : '13px') : isLarge ? '14px' : '12px';

  // 1. KITCHEN ORDER TICKET (KOT)
  if (templateType === TEMPLATE_TYPES.KOT) {
    return `
      <div style="font-size: ${baseFontSize}; line-height: 1.35; color: #000; font-family: monospace, -apple-system, sans-serif;">
        <!-- Header -->
        <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
          <h2 style="font-size: ${is58mm ? '15px' : '18px'}; font-weight: 900; margin: 0; text-transform: uppercase;">
            ${restaurant?.name || 'KITCHEN TICKET'}
          </h2>
          <div style="font-size: 11px; font-weight: bold; margin-top: 2px;">
            ${showEnglish ? 'KITCHEN ORDER TICKET (KOT)' : ''}
            ${showUrdu && showEnglish ? ' • ' : ''}
            ${showUrdu ? '<span style="font-family: sans-serif;">رسید برائے کچن</span>' : ''}
          </div>
        </div>

        <!-- Big Order # & Table/Type -->
        <div style="text-align: center; border-bottom: 2px solid #000; padding: 6px 0; margin-bottom: 8px;">
          <div style="font-size: ${is58mm ? '24px' : '30px'}; font-weight: 900; font-family: monospace; letter-spacing: -0.5px;">
            #${order?.id || '---'}
          </div>
          <div style="margin-top: 4px;">
            <span style="display: inline-block; background: #000; color: #fff; font-weight: 900; font-size: ${is58mm ? '11px' : '13px'}; padding: 2px 8px; border-radius: 2px; text-transform: uppercase;">
              ${order?.table ? `TABLE: ${order.table}` : order?.order_type === 'pickup' ? 'PICKUP / TAKEAWAY' : 'DELIVERY ORDER'}
            </span>
          </div>
          <div style="font-size: 11px; font-weight: bold; margin-top: 4px;">
            🕒 ${dateInfo.timeOnly} &nbsp;•&nbsp; ${dateInfo.dateOnly}
          </div>
        </div>

        <!-- Order Notes (Highlighted Box) -->
        ${order?.customer_notes ? `
          <div style="background: #f4f4f4; border: 2px solid #000; padding: 6px 8px; margin-bottom: 8px; font-weight: bold; font-size: 11px; border-radius: 3px; word-break: break-word;">
            <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; margin-bottom: 2px;">
              ⚠️ KITCHEN NOTES ${showUrdu ? '<span style="font-family: sans-serif;">(خصوصی ہدایت)</span>' : ''}:
            </div>
            <div>${order.customer_notes}</div>
          </div>
        ` : ''}

        <!-- Items in LARGE bold text with quantity first, indented choices, NO PRICES -->
        <div style="margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #000; font-size: 10px; font-weight: 900; padding-bottom: 3px; margin-bottom: 4px; text-transform: uppercase;">
            <span>QTY & ITEM</span>
            <span>READY</span>
          </div>

          ${(order?.items || []).map((item) => `
            <div style="padding: 4px 0; border-bottom: 1px dashed #ccc;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="font-size: ${is58mm ? '13px' : '15px'}; font-weight: 900; word-break: break-word; flex: 1;">
                  <span style="display: inline-block; background: #000; color: #fff; padding: 1px 5px; border-radius: 2px; margin-right: 4px; font-family: monospace;">
                    ${item.quantity} x
                  </span>
                  <span>${item.title}</span>
                </div>
                <div style="width: 14px; height: 14px; border: 2px solid #000; border-radius: 2px; margin-left: 6px; flex-shrink: 0; margin-top: 2px;"></div>
              </div>

              ${item.dealItems ? `
                <div style="font-size: 10px; font-weight: bold; color: #444; padding-left: 20px; font-style: italic; word-break: break-word; margin-top: 2px;">
                  * ${item.dealItems}
                </div>
              ` : ''}

              ${Array.isArray(item.choices) && item.choices.length > 0 ? `
                <div style="padding-left: 20px; font-size: 11px; font-weight: bold; color: #333; margin-top: 2px;">
                  ${item.choices.map((c) => `<div style="word-break: break-word;">↳ ${c}</div>`).join('')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>

        <!-- Footer -->
        <div style="text-align: center; border-top: 2px solid #000; padding-top: 6px; font-size: 10px; font-weight: bold;">
          <div>TOTAL DISHES: ${(order?.items || []).reduce((acc, i) => acc + (parseInt(i.quantity, 10) || 1), 0)} ITEMS</div>
          <div style="font-size: 9px; color: #666; margin-top: 2px;">DineHQ Kitchen Station</div>
        </div>
      </div>
    `;
  }

  // 2. CUSTOMER BILL
  if (templateType === TEMPLATE_TYPES.BILL) {
    return `
      <div style="font-size: ${baseFontSize}; line-height: 1.35; color: #000; font-family: monospace, -apple-system, sans-serif;">
        <!-- Logo & Header -->
        <div style="text-align: center; border-bottom: 1px solid #000; padding-bottom: 6px; margin-bottom: 6px;">
          ${showLogo && restaurant?.logo_url ? `
            <img src="${restaurant.logo_url}" style="max-height: 48px; max-width: 140px; margin: 0 auto 4px auto; display: block; object-fit: contain;" />
          ` : ''}
          <h1 style="font-size: ${is58mm ? '16px' : '20px'}; font-weight: 900; margin: 0; text-transform: uppercase;">
            ${restaurant?.name || 'Customer Bill'}
          </h1>
          ${showPhone && restaurant?.whatsapp_number ? `
            <div style="font-size: 11px; font-weight: bold; margin-top: 2px;">Ph: +${restaurant.whatsapp_number}</div>
          ` : ''}
          <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #444; margin-top: 2px;">
            ${showEnglish ? 'Tax Invoice / Receipt' : ''}
            ${showUrdu && showEnglish ? ' • ' : ''}
            ${showUrdu ? '<span style="font-family: sans-serif;">کسٹمر بل</span>' : ''}
          </div>
        </div>

        <!-- Meta Details -->
        <div style="font-size: 11px; border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
          <div style="display: flex; justify-content: space-between; font-weight: bold;">
            <span>Order #:</span>
            <span style="font-family: monospace; font-weight: 900;">#${order?.id || '---'}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Date/Time:</span>
            <span>${dateInfo.full12Hour}</span>
          </div>
          ${order?.customer_name ? `
            <div style="display: flex; justify-content: space-between;">
              <span>Customer:</span>
              <span style="font-weight: bold;">${order.customer_name}</span>
            </div>
          ` : ''}
          ${order?.customer_phone ? `
            <div style="display: flex; justify-content: space-between;">
              <span>Phone:</span>
              <span>+${order.customer_phone}</span>
            </div>
          ` : ''}
        </div>

        <!-- Items with Quantity & Rs. Price -->
        <div style="margin-bottom: 8px;">
          <table style="width: 100%; border-collapse: collapse; font-size: ${baseFontSize};">
            <thead>
              <tr style="border-bottom: 1px solid #000; font-size: 10px; font-weight: 900; text-transform: uppercase;">
                <th style="text-align: left; padding: 2px 0;">ITEM</th>
                <th style="text-align: center; padding: 2px 4px; width: 30px;">QTY</th>
                <th style="text-align: right; padding: 2px 0; width: 65px;">PRICE</th>
              </tr>
            </thead>
            <tbody>
              ${(order?.items || []).map((item) => `
                <tr style="vertical-align: top; border-bottom: 1px dotted #ddd;">
                  <td style="padding: 3px 0; word-break: break-word;">
                    <div style="font-weight: bold;">${item.title}</div>
                    ${item.dealItems ? `<div style="font-size: 9px; color: #555; padding-left: 4px;">* ${item.dealItems}</div>` : ''}
                    ${(item.choices || []).map((c) => `<div style="font-size: 9px; color: #555; padding-left: 4px;">↳ ${c}</div>`).join('')}
                  </td>
                  <td style="padding: 3px 4px; text-align: center; font-weight: bold; font-family: monospace;">
                    ${item.quantity}
                  </td>
                  <td style="padding: 3px 0; text-align: right; font-weight: bold; font-family: monospace; white-space: nowrap;">
                    ${formatPKR((item.unitPrice || 0) * (item.quantity || 1))}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Subtotal, Delivery, Discount, and Bold Large Total -->
        <div style="border-top: 1px solid #000; padding-top: 6px; font-size: 11px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>Subtotal:</span>
            <span style="font-family: monospace; font-weight: bold;">${formatPKR(order?.subtotal || 0)}</span>
          </div>

          ${Number(order?.delivery_fee) > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span>Delivery Fee:</span>
              <span style="font-family: monospace; font-weight: bold;">${formatPKR(order.delivery_fee)}</span>
            </div>
          ` : ''}

          ${Number(order?.discount) > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: #0a0; font-weight: bold;">
              <span>Discount / Promo:</span>
              <span style="font-family: monospace;">-${formatPKR(order.discount)}</span>
            </div>
          ` : ''}

          <!-- BOLD, LARGE TOTAL -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #000; padding-top: 6px; margin-top: 4px; font-size: ${is58mm ? '15px' : '18px'}; font-weight: 900;">
            <span>TOTAL:</span>
            <span style="font-family: monospace; font-weight: 900;">${formatPKR(order?.total_payable || 0)}</span>
          </div>

          <!-- Payment Method -->
          <div style="text-align: center; margin-top: 6px;">
            <span style="display: inline-block; background: #f0f0f0; border: 1px solid #ccc; padding: 2px 8px; border-radius: 2px; font-size: 10px; font-weight: bold; text-transform: uppercase;">
              Payment: ${order?.payment_method || 'Cash on Delivery'}
            </span>
          </div>
        </div>

        <!-- Footer Message -->
        ${footerMessage ? `
          <div style="text-align: center; border-top: 1px dashed #000; padding-top: 6px; margin-top: 6px; font-size: 11px; font-weight: bold; word-break: break-word;">
            <div>${footerMessage}</div>
            ${showUrdu ? '<div style="font-family: sans-serif; font-size: 10px; margin-top: 2px;">تشریف آوری کا بہت شکریہ!</div>' : ''}
          </div>
        ` : ''}

        <!-- Bottom QR Code -->
        ${qrDataUrl ? `
          <div style="text-align: center; border-top: 1px dashed #ccc; padding-top: 6px; margin-top: 6px;">
            <img src="${qrDataUrl}" style="margin: 0 auto; display: block; max-width: ${is58mm ? '75px' : '90px'};" />
            <div style="font-size: 9px; font-weight: bold; margin-top: 2px; text-transform: uppercase;">Scan to View Menu & Reorder</div>
            <div style="font-size: 8px; color: #666; font-family: monospace; word-break: break-all;">${reorderUrl}</div>
          </div>
        ` : ''}
      </div>
    `;
  }

  // 3. DELIVERY SLIP
  if (templateType === TEMPLATE_TYPES.DELIVERY) {
    return `
      <div style="font-size: ${baseFontSize}; line-height: 1.35; color: #000; font-family: monospace, -apple-system, sans-serif;">
        <!-- Header -->
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 6px;">
          <h1 style="font-size: ${is58mm ? '15px' : '18px'}; font-weight: 900; margin: 0; text-transform: uppercase;">
            DELIVERY DISPATCH SLIP
          </h1>
          <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #444; margin-top: 2px;">
            ${showEnglish ? 'Rider Delivery Manifest' : ''}
            ${showUrdu && showEnglish ? ' • ' : ''}
            ${showUrdu ? '<span style="font-family: sans-serif;">ڈلیوری سلپ</span>' : ''}
          </div>
        </div>

        <!-- Order & Time -->
        <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; border-bottom: 1px dashed #000; padding-bottom: 4px; margin-bottom: 6px;">
          <span>Order: <strong style="font-size: 14px; font-family: monospace;">#${order?.id || '---'}</strong></span>
          <span>🕒 ${dateInfo.timeOnly}</span>
        </div>

        <!-- Customer Name & Phone -->
        <div style="background: #f7f7f7; border: 2px solid #000; padding: 6px 8px; margin-bottom: 6px; border-radius: 3px;">
          <div style="font-size: 13px; font-weight: 900; text-transform: uppercase;">
            👤 ${order?.customer_name || 'Guest Customer'}
          </div>
          ${order?.customer_phone ? `
            <div style="font-size: 13px; font-weight: 900; margin-top: 2px; font-family: monospace;">
              📞 +${order.customer_phone}
            </div>
          ` : ''}
        </div>

        <!-- Full Delivery Address (High Visibility) -->
        <div style="margin-bottom: 6px;">
          <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; margin-bottom: 2px;">
            📍 DELIVERY ADDRESS:
          </div>
          <div style="border: 2px solid #000; padding: 6px 8px; font-weight: 900; font-size: ${is58mm ? '12px' : '14px'}; word-break: break-word; border-radius: 3px;">
            ${order?.customer_address || 'Counter Pickup (No delivery address)'}
          </div>
        </div>

        <!-- Rider Notes / Customer Instructions -->
        ${order?.rider_notes || order?.customer_notes ? `
          <div style="background: #fff8e1; border: 2px solid #000; padding: 6px 8px; margin-bottom: 6px; font-weight: bold; font-size: 11px; border-radius: 3px; word-break: break-word;">
            <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; margin-bottom: 2px;">
              🛵 RIDER NOTES:
            </div>
            <div>${order.rider_notes || order.customer_notes}</div>
          </div>
        ` : ''}

        <!-- Items Summary -->
        <div style="margin-bottom: 6px; font-size: 11px;">
          <div style="border-bottom: 1px solid #000; font-size: 10px; font-weight: 900; padding-bottom: 2px; margin-bottom: 3px; display: flex; justify-content: space-between;">
            <span>PARCEL ITEMS</span>
            <span>QTY</span>
          </div>
          ${(order?.items || []).map((item) => `
            <div style="display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px dashed #eee; font-weight: bold;">
              <span style="word-break: break-word; padding-right: 6px;">${item.title}</span>
              <span style="font-family: monospace;">${item.quantity}x</span>
            </div>
          `).join('')}
        </div>

        <!-- Big Cash to Collect Box -->
        <div style="border: 2px solid #000; background: #e8f5e9; padding: 8px; text-align: center; border-radius: 3px; margin-bottom: 6px;">
          <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #1b5e20;">
            ${showEnglish ? 'CASH TO COLLECT FROM CUSTOMER' : ''}
            ${showUrdu && showEnglish ? '<br />' : ''}
            ${showUrdu ? '<span style="font-family: sans-serif; font-size: 10px;">گاہک سے وصول کرنے والی رقم</span>' : ''}
          </div>
          <div style="font-size: ${is58mm ? '20px' : '26px'}; font-weight: 900; font-family: monospace; margin: 3px 0;">
            ${formatPKR(order?.total_payable || 0)}
          </div>
          <div style="font-size: 10px; font-weight: bold;">
            Method: ${order?.payment_method || 'Cash on Delivery'}
          </div>
        </div>

        <!-- Sign-off -->
        <div style="text-align: center; border-top: 1px solid #000; padding-top: 4px; font-size: 9px; color: #666;">
          <div>Restaurant: ${restaurant?.name || 'Kitchen'}</div>
          <div>DineHQ Automated Rider Dispatch</div>
        </div>
      </div>
    `;
  }

  return '';
}
