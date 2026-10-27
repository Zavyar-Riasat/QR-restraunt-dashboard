import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Generate a high-resolution QR code data URL with an optional centered restaurant logo.
 */
export async function generateTableQrDataUrl(tableUrl, logoUrl) {
  const canvas = document.createElement('canvas');
  await QRCode.toCanvas(canvas, tableUrl, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 440,
    color: { dark: '#090d16', light: '#ffffff' },
  });

  if (logoUrl) {
    try {
      const ctx = canvas.getContext('2d');
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';

      await new Promise((resolve) => {
        logoImg.onload = resolve;
        logoImg.onerror = () => resolve(); // graceful fallback
        logoImg.src = logoUrl;
      });

      if (logoImg.width > 0) {
        const center = 220;
        const boxSize = 92;
        const radius = 18;

        // White protective plate
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 4;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(center - boxSize / 2, center - boxSize / 2, boxSize, boxSize, radius);
        } else {
          ctx.rect(center - boxSize / 2, center - boxSize / 2, boxSize, boxSize);
        }
        ctx.fill();
        ctx.stroke();

        // Draw centered logo inside plate
        const padding = 10;
        const drawSize = boxSize - padding * 2;
        ctx.drawImage(
          logoImg,
          center - boxSize / 2 + padding,
          center - boxSize / 2 + padding,
          drawSize,
          drawSize
        );
      }
    } catch (err) {
      console.warn('Unable to embed center logo on QR canvas:', err);
    }
  }

  return canvas.toDataURL('image/png');
}

/**
 * Generates and downloads a single high-quality PDF containing all table QRs,
 * with each table on its own standee card and table number printed large under the QR.
 */
import { getAppBaseUrl } from '../config/appConfig.js';

export async function downloadAllTableQrsPdf({ restaurant, tables, origin: customOrigin }) {
  if (!tables || tables.length === 0) {
    alert('No tables found to export.');
    return;
  }

  const origin = customOrigin || getAppBaseUrl();
  const slug = restaurant?.slug || 'burgersmoke';
  const storeName = restaurant?.name || 'Restaurant';
  const phone = restaurant?.phone || restaurant?.whatsapp_number || '923001234567';
  const logoUrl = restaurant?.logo_url;

  // Initialize jsPDF in A5 portrait format (148 x 210 mm)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // Create temporary offscreen container for html2canvas rendering
  const container = document.createElement('div');
  container.id = 'table-qr-pdf-render-scratch';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '560px'; // 560px width matches A5 300dpi ratio
  container.style.height = '792px';
  container.style.background = '#ffffff';
  container.style.zIndex = '-9999';
  document.body.appendChild(container);

  try {
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      const tableNum = table.table_number || String(i + 1);
      const tableName = table.name || `Table ${tableNum}`;
      const section = table.section || 'Main Hall';
      const capacity = table.capacity || 4;
      const tableUrl = `${origin}/${slug}?table=${tableNum}`;

      // Generate QR data URL with logo centered
      const qrDataUrl = await generateTableQrDataUrl(tableUrl, logoUrl);

      // Render clean, modern table card markup
      container.innerHTML = `
        <div style="width: 560px; height: 792px; box-sizing: border-box; padding: 36px 32px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #ffffff; border: 3px solid #0f172a; border-radius: 28px;">
          
          <!-- Top Header & Branding -->
          <div style="width: 100%; display: flex; flex-direction: column; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 6px;">
              ${
                logoUrl
                  ? `<img src="${logoUrl}" style="width: 38px; height: 38px; object-fit: contain; border-radius: 8px; border: 1px solid #e2e8f0; padding: 2px;" />`
                  : ''
              }
              <div style="font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; text-transform: uppercase;">
                ${storeName}
              </div>
            </div>
            <div style="display: inline-block; background: #ea580c; color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
              Table Self-Ordering • میز سے آرڈر
            </div>
          </div>

          <!-- Central High-Resolution QR with Centered Logo -->
          <div style="margin: 16px 0; display: flex; flex-direction: column; align-items: center;">
            <div style="background: #ffffff; padding: 12px; border-radius: 24px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 2px solid #0f172a;">
              <img src="${qrDataUrl}" style="width: 260px; height: 260px; display: block;" />
            </div>
          </div>

          <!-- LARGE TABLE NUMBER PRINTED PROMINENTLY -->
          <div style="width: 100%; display: flex; flex-direction: column; align-items: center; margin-bottom: 8px;">
            <div style="font-size: 44px; font-weight: 900; color: #0f172a; line-height: 1; letter-spacing: -1px; text-transform: uppercase;">
              TABLE #${tableNum}
            </div>
            <div style="font-size: 13px; font-weight: 700; color: #64748b; margin-top: 4px;">
              ${tableName} • ${section} • Seats ${capacity}
            </div>
          </div>

          <!-- Call to Action Text -->
          <div style="width: 100%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 12px 16px; box-sizing: border-box;">
            <div style="font-size: 18px; font-weight: 900; color: #ea580c; text-transform: uppercase; letter-spacing: 0.5px;">
              Scan to Order
            </div>
            <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px; font-family: 'Noto Nastaliq Urdu', system-ui, sans-serif;" dir="rtl">
              آرڈر کے لیے اسکین کریں
            </div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px; font-weight: 600;">
              Aim your phone camera at the QR code above to browse the full live menu & order.
            </div>
          </div>

          <!-- Footer Contact & URL -->
          <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #cbd5e1; padding-top: 10px; font-size: 11px; color: #475569; font-weight: 700;">
            <div>Ph: +${phone}</div>
            <div style="font-family: monospace; font-size: 10px; color: #94a3b8;">${tableUrl}</div>
          </div>

        </div>
      `;

      // Allow image/DOM repaint
      await new Promise((r) => setTimeout(r, 60));

      const canvas = await html2canvas(container, {
        scale: 2.2, // crisp print resolution
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const pageImgData = canvas.toDataURL('image/jpeg', 0.95);

      if (i > 0) {
        pdf.addPage('a5', 'portrait');
      }

      pdf.addImage(pageImgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    }

    pdf.save(`${slug}-all-table-qrs.pdf`);
  } catch (err) {
    console.error('Error generating all table QRs PDF:', err);
    alert('Failed to generate PDF. Please try again.');
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}
