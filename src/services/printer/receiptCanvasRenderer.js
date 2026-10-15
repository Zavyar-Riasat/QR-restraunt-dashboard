/**
 * Thermal Receipt Canvas Renderer
 * Renders receipts containing Urdu / Nastaliq text to a high-contrast 1-bit bitmap
 * so thermal receipt printers can print Urdu flawlessly without missing characters or gibberish.
 */

import QRCode from 'qrcode';
import { PAPER_SIZES } from './printerTypes';
import { formatPKR } from '../../utils/currencyUtils';

/**
 * Check if text contains Arabic / Urdu Unicode script characters
 */
export function containsUrdu(text) {
  if (!text) return false;
  return /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(String(text));
}

/**
 * Checks whether an entire print job contains any Urdu text
 */
export function jobContainsUrdu(job) {
  if (!job) return false;
  const { order, restaurant } = job;
  if (containsUrdu(restaurant?.name)) return true;
  if (!order) return false;

  if (containsUrdu(order.customer_name)) return true;
  if (containsUrdu(order.customer_address)) return true;
  if (containsUrdu(order.customer_notes)) return true;

  if (Array.isArray(order.items)) {
    for (const item of order.items) {
      if (containsUrdu(item.title)) return true;
      if (containsUrdu(item.dealItems)) return true;
      if (Array.isArray(item.choices)) {
        for (const c of item.choices) {
          if (containsUrdu(c)) return true;
        }
      }
    }
  }

  return false;
}

/**
 * Helper to wrap text into multiple lines within a max pixel width on canvas
 */
function wrapText(ctx, text, maxWidth) {
  const words = String(text || '').split(' ');
  const lines = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Render a complete high-contrast receipt onto an HTML5 Canvas.
 * Width is precisely locked to 384px (58mm) or 576px (80mm) at 203 DPI.
 */
export async function renderReceiptToCanvas(job) {
  const { order, restaurant, paperSize = PAPER_SIZES.SIZE_80MM, reorderQrUrl } = job;
  const is58mm = paperSize === PAPER_SIZES.SIZE_58MM;

  // Dimensions
  const width = is58mm ? 384 : 576;
  const padding = is58mm ? 12 : 20;
  const contentWidth = width - padding * 2;

  // Create working offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  // Temporary initial height, will re-size dynamically
  canvas.height = 2400;
  const ctx = canvas.getContext('2d');

  // Fill background pure white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'top';

  let y = 14;

  // 1. Restaurant Header
  const restName = restaurant?.name || 'KITCHEN ORDER TICKET';
  ctx.font = is58mm
    ? 'bold 22px "Noto Nastaliq Urdu", "Poppins", Arial, sans-serif'
    : 'bold 28px "Noto Nastaliq Urdu", "Poppins", Arial, sans-serif';
  ctx.textAlign = 'center';

  const nameLines = wrapText(ctx, restName, contentWidth);
  for (const line of nameLines) {
    ctx.fillText(line, width / 2, y);
    y += is58mm ? 26 : 34;
  }

  // Subtitle
  ctx.font = is58mm ? '12px "Poppins", monospace' : '14px "Poppins", monospace';
  ctx.fillText('KITCHEN ORDER TICKET (KOT)', width / 2, y);
  y += is58mm ? 18 : 22;

  // Order Number
  ctx.font = is58mm ? 'bold 18px "Poppins", monospace' : 'bold 22px "Poppins", monospace';
  ctx.fillText(`ORDER #${order?.id || '---'}`, width / 2, y);
  y += is58mm ? 22 : 28;

  // Date / Time
  const dateStr = order?.created_at
    ? new Date(order.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
    : new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  ctx.font = is58mm ? '11px "Poppins", monospace' : '13px "Poppins", monospace';
  ctx.fillText(dateStr, width / 2, y);
  y += is58mm ? 18 : 24;

  // Dashed separator
  const drawDashedRule = (yPos) => {
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(padding, yPos);
    ctx.lineTo(width - padding, yPos);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
  };

  drawDashedRule(y);
  y += 10;

  // 2. Customer Information
  ctx.textAlign = 'left';
  const labelFont = is58mm ? 'bold 12px "Poppins", sans-serif' : 'bold 14px "Poppins", sans-serif';
  const valueFont = is58mm
    ? '13px "Noto Nastaliq Urdu", "Poppins", Arial, sans-serif'
    : '15px "Noto Nastaliq Urdu", "Poppins", Arial, sans-serif';

  // Customer Name
  if (order?.customer_name) {
    ctx.font = labelFont;
    ctx.fillText('Customer: ', padding, y);
    const labelW = ctx.measureText('Customer: ').width;
    ctx.font = valueFont;
    ctx.fillText(order.customer_name, padding + labelW, y);
    y += is58mm ? 18 : 22;
  }

  // Phone
  if (order?.customer_phone) {
    ctx.font = labelFont;
    ctx.fillText('Phone: ', padding, y);
    const labelW = ctx.measureText('Phone: ').width;
    ctx.font = valueFont;
    ctx.fillText(`+${order.customer_phone}`, padding + labelW, y);
    y += is58mm ? 18 : 22;
  }

  // Address
  if (order?.customer_address) {
    ctx.font = labelFont;
    ctx.fillText('Address: ', padding, y);
    const labelW = ctx.measureText('Address: ').width;
    ctx.font = valueFont;
    const addrLines = wrapText(ctx, order.customer_address, contentWidth - labelW);
    for (let i = 0; i < addrLines.length; i++) {
      ctx.fillText(addrLines[i], i === 0 ? padding + labelW : padding, y);
      y += is58mm ? 18 : 22;
    }
  }

  // Special Notes (highlighted)
  if (order?.customer_notes) {
    y += 4;
    ctx.fillStyle = '#f0f0f0';
    const noteLines = wrapText(ctx, `NOTE: ${order.customer_notes}`, contentWidth - 16);
    const boxHeight = noteLines.length * (is58mm ? 20 : 24) + 10;
    ctx.fillRect(padding, y, contentWidth, boxHeight);
    ctx.fillStyle = '#000000';

    ctx.font = is58mm
      ? 'bold 13px "Noto Nastaliq Urdu", "Poppins", Arial, sans-serif'
      : 'bold 15px "Noto Nastaliq Urdu", "Poppins", Arial, sans-serif';
    let noteY = y + 6;
    for (const line of noteLines) {
      ctx.fillText(line, padding + 8, noteY);
      noteY += is58mm ? 20 : 24;
    }
    y += boxHeight + 6;
  }

  y += 6;
  drawDashedRule(y);
  y += 10;

  // 3. Table Column Headers
  ctx.font = is58mm ? 'bold 12px "Poppins", monospace' : 'bold 14px "Poppins", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('ITEM', padding, y);
  ctx.textAlign = 'right';
  ctx.fillText('TOTAL', width - padding, y);
  y += is58mm ? 16 : 20;

  // 4. Order Items
  if (Array.isArray(order?.items)) {
    for (const item of order.items) {
      const itemTitle = `${item.quantity}x ${item.title}`;
      const itemTotal = formatPKR((item.unitPrice || 0) * (item.quantity || 1));

      ctx.font = is58mm
        ? 'bold 13px "Noto Nastaliq Urdu", "Poppins", Arial, sans-serif'
        : 'bold 15px "Noto Nastaliq Urdu", "Poppins", Arial, sans-serif';

      ctx.textAlign = 'right';
      ctx.fillText(itemTotal, width - padding, y);
      const priceW = ctx.measureText(itemTotal).width;

      ctx.textAlign = 'left';
      const maxTitleW = contentWidth - priceW - 10;
      const titleLines = wrapText(ctx, itemTitle, maxTitleW);

      for (let tIdx = 0; tIdx < titleLines.length; tIdx++) {
        ctx.fillText(titleLines[tIdx], padding, y);
        y += is58mm ? 18 : 22;
      }

      // Deal items bundle description
      if (item.dealItems) {
        ctx.font = is58mm ? '11px "Poppins", sans-serif' : '13px "Poppins", sans-serif';
        const dealLines = wrapText(ctx, `📦 ${item.dealItems}`, contentWidth - 16);
        for (const dl of dealLines) {
          ctx.fillText(dl, padding + 12, y);
          y += is58mm ? 15 : 18;
        }
      }

      // Selected Variant Choices
      if (Array.isArray(item.choices) && item.choices.length > 0) {
        ctx.font = is58mm
          ? '11px "Noto Nastaliq Urdu", "Poppins", sans-serif'
          : '13px "Noto Nastaliq Urdu", "Poppins", sans-serif';
        for (const c of item.choices) {
          ctx.fillText(`↳ ${c}`, padding + 12, y);
          y += is58mm ? 15 : 18;
        }
      }

      y += 4;
    }
  }

  y += 4;
  drawDashedRule(y);
  y += 10;

  // 5. Totals & Pricing Breakdown
  ctx.font = is58mm ? '12px "Poppins", monospace' : '14px "Poppins", monospace';

  // Subtotal
  ctx.textAlign = 'left';
  ctx.fillText('Subtotal:', padding, y);
  ctx.textAlign = 'right';
  ctx.fillText(formatPKR(order?.subtotal || 0), width - padding, y);
  y += is58mm ? 18 : 22;

  // Delivery Fee (if any)
  if (order?.delivery_fee > 0) {
    ctx.textAlign = 'left';
    ctx.fillText('Delivery Fee:', padding, y);
    ctx.textAlign = 'right';
    ctx.fillText(formatPKR(order.delivery_fee), width - padding, y);
    y += is58mm ? 18 : 22;
  }

  // Grand Total Due
  y += 4;
  ctx.beginPath();
  ctx.moveTo(padding, y);
  ctx.lineTo(width - padding, y);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.stroke();
  y += 8;

  ctx.font = is58mm ? 'bold 16px "Poppins", monospace' : 'bold 20px "Poppins", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('TOTAL DUE:', padding, y);
  ctx.textAlign = 'right';
  ctx.fillText(formatPKR(order?.total_payable || 0), width - padding, y);
  y += is58mm ? 26 : 32;

  drawDashedRule(y);
  y += 12;

  // 6. Direct Reorder QR Code
  const qrUrl = reorderQrUrl || `${window?.location?.origin || ''}/${restaurant?.slug || ''}`;
  if (qrUrl) {
    try {
      const qrDataUrl = await QRCode.toDataURL(qrUrl, {
        margin: 1,
        width: is58mm ? 130 : 170,
        errorCorrectionLevel: 'M',
      });

      const qrImg = new Image();
      await new Promise((resolve, reject) => {
        qrImg.onload = resolve;
        qrImg.onerror = reject;
        qrImg.src = qrDataUrl;
      });

      const qrX = (width - qrImg.width) / 2;
      ctx.drawImage(qrImg, qrX, y);
      y += qrImg.height + 6;

      ctx.textAlign = 'center';
      ctx.font = is58mm ? 'bold 10px "Poppins", sans-serif' : 'bold 12px "Poppins", sans-serif';
      ctx.fillText('SCAN TO REORDER DIRECTLY', width / 2, y);
      y += is58mm ? 14 : 18;

      ctx.font = is58mm ? '9px "Poppins", monospace' : '11px "Poppins", monospace';
      ctx.fillText(qrUrl, width / 2, y);
      y += is58mm ? 16 : 20;
    } catch (e) {
      console.warn('QR code generation for canvas receipt skipped:', e);
    }
  }

  // 7. Footer
  ctx.textAlign = 'center';
  ctx.font = is58mm ? '10px "Poppins", sans-serif' : '12px "Poppins", sans-serif';
  ctx.fillText(`Thank you for ordering with ${restaurant?.name || 'us'}!`, width / 2, y);
  y += is58mm ? 14 : 18;

  ctx.font = is58mm ? '9px "Poppins", sans-serif' : '11px "Poppins", sans-serif';
  ctx.fillText('DineHQ Direct WhatsApp Ordering', width / 2, y);
  y += 24;

  // Crop final canvas to exact height used
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = width;
  finalCanvas.height = y;
  const finalCtx = finalCanvas.getContext('2d');
  finalCtx.drawImage(canvas, 0, 0, width, y, 0, 0, width, y);

  return finalCanvas;
}
