import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { formatPKR } from '../../utils/currencyUtils';
import { format12HourTime } from '../../utils/dateUtils';
import { PAPER_SIZES, TEMPLATE_TYPES } from '../../services/printer/printerTypes';

export default function PrintTemplateRenderer({
  templateType = TEMPLATE_TYPES.KOT, // 'kot' | 'bill' | 'delivery' | 'sales_summary'
  paperSize = PAPER_SIZES.SIZE_80MM, // '58mm' | '80mm' | 'a4'
  order,
  restaurant,
  settings = {},
  isLivePrint = false,
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
  const isLargeFont = fontSize === 'large';
  const showUrdu = false;
  const showEnglish = true;

  const dateInfo = format12HourTime(order?.created_at);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const table = order?.table || order?.tableNumber;
  const params = new URLSearchParams();
  if (table) params.set('table', table);
  if (order?.id) params.set('order', order.id);
  const qs = params.toString();
  // Restaurant Menu / Reorder URL (only restaurant QR is permitted)
  const reorderUrl = `${origin}/${restaurant?.slug || 'burgersmoke'}${qs ? `?${qs}` : ''}`;

  // Ultra-compact container width & padding styling
  const getContainerStyle = () => {
    if (is58mm) {
      return {
        width: '54mm',
        maxWidth: '100%',
        padding: '3px 4px',
        fontSize: isLargeFont ? '11px' : '10px',
        lineHeight: '1.2',
      };
    }
    if (isA4) {
      return {
        width: '100%',
        maxWidth: '190mm',
        padding: '16px',
        fontSize: isLargeFont ? '14px' : '12px',
        lineHeight: '1.25',
      };
    }
    // Default 80mm
    return {
      width: '76mm',
      maxWidth: '100%',
      padding: '6px 8px',
      fontSize: isLargeFont ? '12px' : '11px',
      lineHeight: '1.2',
    };
  };

  return (
    <div
      style={getContainerStyle()}
      className={`mx-auto bg-white text-black font-mono select-none overflow-hidden ${
        isLivePrint ? 'p-0 shadow-none' : 'border border-slate-300 shadow-sm rounded-sm'
      }`}
    >
      {/* ========================================================
          TEMPLATE 1: KITCHEN ORDER TICKET (KOT)
          ======================================================== */}
      {templateType === TEMPLATE_TYPES.KOT && (
        <div className="space-y-1.5">
          {/* Top Header: Restaurant Logo & KOT Banner */}
          <div className="text-center pb-1 border-b border-dashed border-black">
            {showLogo && restaurant?.logo_url && (
              <img
                src={restaurant.logo_url}
                alt="Logo"
                className="max-h-7 max-w-[100px] mx-auto mb-0.5 object-contain"
              />
            )}

            <h2 className="font-extrabold text-xs sm:text-sm uppercase tracking-wide leading-tight">
              {restaurant?.name || 'KITCHEN ORDER TICKET'}
            </h2>
            <div className="flex items-center justify-center gap-1 font-bold text-[10px] text-slate-800">
              <span>KOT</span>
            </div>
          </div>

          {/* Compact Order Number & Table/Type Banner */}
          <div className="py-1 border-b-2 border-black flex items-center justify-between gap-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black font-mono tracking-tight">
                #{order?.id || '---'}
              </span>
              <span className="px-1.5 py-0.5 rounded-xs bg-black text-white font-black text-[10px] uppercase">
                {order?.table
                  ? `TABLE: ${order.table}`
                  : order?.order_type === 'pickup'
                  ? 'TAKEAWAY'
                  : 'DELIVERY'}
              </span>
            </div>

            <div className="text-right text-[10px] font-bold text-slate-700 leading-tight">
              <div>{dateInfo.timeOnly}</div>
              <div className="text-[9px] text-slate-500">{dateInfo.dateOnly}</div>
            </div>
          </div>

          {/* Kitchen Notes in Highlighted Box */}
          {order?.customer_notes && (
            <div className="p-1 px-1.5 rounded-xs border border-black bg-amber-50 text-black font-bold text-[11px] leading-tight">
              <span className="text-[9px] uppercase tracking-wider text-amber-900 font-black mr-1">
                NOTES:
              </span>
              <span className="break-words font-sans">{order.customer_notes}</span>
            </div>
          )}

          {/* Items List in bold text with quantity first, Indented Choices, NO PRICES */}
          <div className="pt-0.5">
            <div className="flex justify-between items-center pb-0.5 mb-1 border-b border-black text-[10px] font-black uppercase">
              <span>QTY & ITEM DETAILS</span>
              <span>READY</span>
            </div>

            <div className="divide-y divide-dotted divide-slate-300">
              {(order?.items || []).map((item, idx) => (
                <div key={idx} className="py-1 space-y-0.5">
                  {/* Quantity First + Item Name */}
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="font-black text-xs sm:text-sm leading-tight break-words flex-1">
                      <span className="inline-block bg-black text-white px-1 py-0.2 rounded-xs mr-1 font-mono text-xs sm:text-sm font-black">
                        {item.quantity}x
                      </span>
                      <span className="font-extrabold">{item.title}</span>
                    </div>
                    {/* Kitchen checkbox square */}
                    <div className="w-3.5 h-3.5 border border-black rounded-xs shrink-0 mt-0.5" />
                  </div>

                  {/* Deals contents */}
                  {item.dealItems && (
                    <div className="pl-5 text-[9px] font-bold text-slate-600 italic break-words">
                      * {item.dealItems}
                    </div>
                  )}

                  {/* Indented Options and Extras */}
                  {Array.isArray(item.choices) && item.choices.length > 0 && (
                    <div className="pl-5 space-y-0 pt-0">
                      {item.choices.map((choice, cIdx) => (
                        <div
                          key={cIdx}
                          className="text-[10px] font-bold text-slate-700 break-words leading-tight"
                        >
                          • {choice}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Summary Ticket Footer */}
          <div className="pt-1 border-t border-black flex justify-between items-center text-[9px] font-bold text-slate-700">
            <span>
              TOTAL: {(order?.items || []).reduce((acc, i) => acc + (parseInt(i.quantity, 10) || 1), 0)} ITEMS
            </span>
            <span className="text-[8px] text-slate-400 font-mono">Dineflow Kitchen</span>
          </div>
        </div>
      )}

      {/* ========================================================
          TEMPLATE 2: CUSTOMER BILL
          ======================================================== */}
      {templateType === TEMPLATE_TYPES.BILL && (
        <div className="space-y-1.5">
          {/* Header with Logo, Name, Phone */}
          <div className="text-center pb-1 border-b border-black">
            {showLogo && restaurant?.logo_url && (
              <img
                src={restaurant.logo_url}
                alt="Logo"
                className="max-h-7 max-w-[110px] mx-auto mb-0.5 object-contain"
              />
            )}

            <h1 className="font-extrabold text-sm sm:text-base uppercase tracking-tight leading-tight">
              {restaurant?.name || 'Restaurant Bill'}
            </h1>

            {showPhone && (restaurant?.phone || restaurant?.whatsapp_number) && (
              <div className="text-[10px] font-bold text-slate-700 leading-tight">
                Ph: +{restaurant?.phone || restaurant?.whatsapp_number}
              </div>
            )}

            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
              <span>Official Tax Invoice / Receipt</span>
            </div>
          </div>

          {/* Order Meta Details */}
          <div className="text-[10px] pb-1 border-b border-dashed border-black leading-snug">
            <div className="flex justify-between font-bold">
              <span>Order #: <span className="font-mono font-extrabold">#{order?.id || '---'}</span></span>
              <span className="text-slate-700">{dateInfo.timeOnly} • {dateInfo.dateOnly}</span>
            </div>
            {(order?.customer_name || order?.customer_phone) && (
              <div className="flex justify-between text-slate-700">
                <span className="font-semibold truncate mr-1">{order.customer_name || 'Customer'}</span>
                {order.customer_phone && <span className="font-mono shrink-0">+{order.customer_phone}</span>}
              </div>
            )}
          </div>

          {/* Item List with Quantity and Price in Rs. */}
          <div className="pt-0.5">
            <table className="w-full text-left border-collapse text-[11px] leading-tight">
              <thead>
                <tr className="border-b border-black text-[9px] font-bold uppercase">
                  <th className="py-0.5">ITEM</th>
                  <th className="py-0.5 text-center w-8">QTY</th>
                  <th className="py-0.5 text-right w-16">AMOUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dotted divide-slate-200">
                {(order?.items || []).map((item, idx) => (
                  <tr key={idx} className="align-top">
                    <td className="py-1 pr-1">
                      <div className="font-bold break-words">{item.title}</div>
                      {item.dealItems && (
                        <div className="text-[8px] text-slate-500 italic pl-1 leading-tight">
                          * {item.dealItems}
                        </div>
                      )}
                      {Array.isArray(item.choices) &&
                        item.choices.map((c, cIdx) => (
                          <div key={cIdx} className="text-[8px] text-slate-600 pl-1 leading-tight">
                            • {c}
                          </div>
                        ))}
                    </td>
                    <td className="py-1 text-center font-bold font-mono">
                      {item.quantity}
                    </td>
                    <td className="py-1 text-right font-bold font-mono whitespace-nowrap">
                      {formatPKR((item.unitPrice || 0) * (item.quantity || 1))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Subtotal, Delivery Fee, Discount, and Bold Total */}
          <div className="pt-1 border-t border-black space-y-0.5 text-[11px]">
            <div className="flex justify-between text-slate-700 leading-tight">
              <span>Subtotal:</span>
              <span className="font-mono font-bold">{formatPKR(order?.subtotal || 0)}</span>
            </div>

            {Number(order?.delivery_fee) > 0 && (
              <div className="flex justify-between text-slate-700 leading-tight">
                <span>Delivery Fee:</span>
                <span className="font-mono font-bold">{formatPKR(order.delivery_fee)}</span>
              </div>
            )}

            {Number(order?.discount) > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold leading-tight">
                <span>Discount / Deal Promo:</span>
                <span className="font-mono">-{formatPKR(order.discount)}</span>
              </div>
            )}

            {/* Bold, Concise TOTAL */}
            <div className="flex justify-between items-center pt-1 mt-0.5 border-t-2 border-black text-xs sm:text-sm font-black">
              <span>TOTAL PAYABLE:</span>
              <span className="font-mono text-sm sm:text-base font-black text-black">
                {formatPKR(order?.total_payable || 0)}
              </span>
            </div>

            {/* Payment Method Badge */}
            <div className="pt-0.5 text-center">
              <span className="px-1.5 py-0.5 rounded-xs bg-slate-100 border border-slate-300 font-extrabold text-[9px] inline-block uppercase">
                Payment: {order?.payment_method || 'Cash on Delivery'}
              </span>
            </div>
          </div>

          {/* Footer Message */}
          {footerMessage && (
            <div className="text-center pt-1 border-t border-dashed border-black leading-tight">
              <p className="text-[10px] font-bold text-slate-800 break-words">
                {footerMessage}
              </p>
            </div>
          )}

          {/* Bottom Restaurant QR Code for Reordering (Restaurant QR only) */}
          <div className="pt-1 text-center space-y-0.5 border-t border-dashed border-slate-300">
            <div className="flex justify-center py-0.5">
              <QRCodeSVG
                value={reorderUrl}
                size={is58mm ? 52 : 68}
                level="M"
                includeMargin={false}
              />
            </div>
            <div className="text-[8px] font-bold uppercase tracking-wider text-slate-700">
              Scan to Order
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TEMPLATE 3: DELIVERY SLIP (Full Bill with Item Prices & Address)
          ======================================================== */}
      {templateType === TEMPLATE_TYPES.DELIVERY && (
        <div className="space-y-1.5">
          {/* Header */}
          <div className="text-center pb-1 border-b border-black">
            {showLogo && restaurant?.logo_url && (
              <img
                src={restaurant.logo_url}
                alt="Logo"
                className="max-h-7 max-w-[100px] mx-auto mb-0.5 object-contain"
              />
            )}
            <h1 className="font-extrabold text-sm sm:text-base uppercase tracking-tight leading-tight">
              {restaurant?.name || 'Restaurant'}
            </h1>
            {showPhone && (restaurant?.phone || restaurant?.whatsapp_number) && (
              <div className="text-[10px] font-bold text-slate-700 leading-tight">
                Ph: +{restaurant?.phone || restaurant?.whatsapp_number}
              </div>
            )}
            <div className="text-[9px] font-bold text-slate-600 uppercase tracking-wider leading-tight">
              <span>DELIVERY INVOICE & DISPATCH SLIP</span>
            </div>
          </div>

          {/* Order # and Time */}
          <div className="text-[10px] pb-1 border-b border-dashed border-black leading-snug">
            <div className="flex justify-between font-bold">
              <span>Order #: <span className="font-mono font-extrabold">#{order?.id || '---'}</span></span>
              <span className="text-slate-700">{dateInfo.timeOnly} • {dateInfo.dateOnly}</span>
            </div>
            {(order?.customer_name || order?.customer_phone) && (
              <div className="flex justify-between text-slate-700 font-semibold">
                <span className="truncate mr-1">{order.customer_name || 'Customer'}</span>
                {order.customer_phone && <span className="font-mono shrink-0">+{order.customer_phone}</span>}
              </div>
            )}
          </div>

          {/* Full Delivery Address */}
          <div className="p-1.5 px-2 rounded-xs border border-black bg-white text-xs leading-snug space-y-0.5">
            <div className="text-[9px] font-black uppercase tracking-wider text-slate-700">
              DELIVERY ADDRESS:
            </div>
            {order?.house_flat && (
              <div className="font-black text-slate-950">
                House/Flat: {order.house_flat}
              </div>
            )}
            {order?.area_landmark && (
              <div className="font-bold text-slate-700 text-[11px]">
                Landmark: {order.area_landmark}
              </div>
            )}
            <div className="font-extrabold break-words">
              {order?.customer_address || 'Counter Pickup (No Delivery Address provided)'}
            </div>
            {(order?.latitude && order?.longitude) && (
              <div className="text-[9px] font-bold text-emerald-800 font-mono pt-0.5 border-t border-slate-200">
                GPS Pin: {Number(order.latitude).toFixed(5)}, {Number(order.longitude).toFixed(5)}
                {order.accuracy ? ` (±${Math.round(order.accuracy)}m)` : ''}
              </div>
            )}
          </div>

          {/* Rider Notes / Customer Instructions */}
          {(order?.rider_notes || order?.delivery_notes || order?.customer_notes) && (
            <div className="p-1 px-1.5 rounded-xs border border-black bg-amber-50 text-[10px] font-bold leading-tight">
              <span className="uppercase font-black text-amber-900 mr-1">Rider Note:</span>
              <span className="break-words font-sans">
                {order.rider_notes || order.delivery_notes || order.customer_notes}
              </span>
            </div>
          )}

          {/* Item List with Quantity and Price of Every Item (Just like Customer Bill) */}
          <div className="pt-0.5">
            <table className="w-full text-left border-collapse text-[11px] leading-tight">
              <thead>
                <tr className="border-b border-black text-[9px] font-bold uppercase">
                  <th className="py-0.5">ITEM</th>
                  <th className="py-0.5 text-center w-8">QTY</th>
                  <th className="py-0.5 text-right w-16">AMOUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dotted divide-slate-200">
                {(order?.items || []).map((item, idx) => (
                  <tr key={idx} className="align-top">
                    <td className="py-1 pr-1">
                      <div className="font-bold break-words">{item.title}</div>
                      {item.dealItems && (
                        <div className="text-[8px] text-slate-500 italic pl-1 leading-tight">
                          * {item.dealItems}
                        </div>
                      )}
                      {Array.isArray(item.choices) &&
                        item.choices.map((c, cIdx) => (
                          <div key={cIdx} className="text-[8px] text-slate-600 pl-1 leading-tight">
                            • {c}
                          </div>
                        ))}
                    </td>
                    <td className="py-1 text-center font-bold font-mono">
                      {item.quantity}
                    </td>
                    <td className="py-1 text-right font-bold font-mono whitespace-nowrap">
                      {formatPKR((item.unitPrice || 0) * (item.quantity || 1))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Subtotal, Delivery Fee, Discount, and Bold Total */}
          <div className="pt-1 border-t border-black space-y-0.5 text-[11px]">
            <div className="flex justify-between text-slate-700 leading-tight">
              <span>Subtotal:</span>
              <span className="font-mono font-bold">{formatPKR(order?.subtotal || 0)}</span>
            </div>

            {Number(order?.delivery_fee) > 0 && (
              <div className="flex justify-between text-slate-700 leading-tight">
                <span>Delivery Fee:</span>
                <span className="font-mono font-bold">{formatPKR(order.delivery_fee)}</span>
              </div>
            )}

            {Number(order?.discount) > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold leading-tight">
                <span>Discount / Deal Promo:</span>
                <span className="font-mono">-{formatPKR(order.discount)}</span>
              </div>
            )}

            {/* Bold, Concise TOTAL / CASH TO COLLECT */}
            <div className="flex justify-between items-center pt-1 mt-0.5 border-t-2 border-black text-xs sm:text-sm font-black">
              <span>
                {order?.payment_method?.toLowerCase()?.includes('cash') || !order?.payment_method
                  ? 'CASH TO COLLECT:'
                  : 'TOTAL PAYABLE:'}
              </span>
              <span className="font-mono text-sm sm:text-base font-black text-black">
                {formatPKR(order?.total_payable || 0)}
              </span>
            </div>

            {/* Payment Method Badge */}
            <div className="pt-0.5 text-center">
              <span className="px-1.5 py-0.5 rounded-xs bg-slate-100 border border-slate-300 font-extrabold text-[9px] inline-block uppercase">
                Payment: {order?.payment_method || 'Cash on Delivery'}
              </span>
            </div>
          </div>

          {/* Footer Message */}
          {footerMessage && (
            <div className="text-center pt-1 border-t border-dashed border-black leading-tight">
              <p className="text-[10px] font-bold text-slate-800 break-words">
                {footerMessage}
              </p>
            </div>
          )}

          {/* Restaurant Menu & Reorder QR (Only Restaurant QR, never location maps) */}
          <div className="pt-1 text-center space-y-0.5 border-t border-dashed border-slate-300">
            <div className="flex justify-center py-0.5">
              <QRCodeSVG
                value={reorderUrl}
                size={is58mm ? 48 : 60}
                level="M"
                includeMargin={false}
              />
            </div>
            <div className="text-[8px] font-bold uppercase tracking-wider text-slate-700">
              Restaurant Menu & Reorder
            </div>
            <div className="text-[8px] text-slate-500 pt-0.5">
              {restaurant?.name || 'Restaurant'} • Dineflow Rider Dispatch
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TEMPLATE 4: TODAY'S SALES SUMMARY (80mm)
          ======================================================== */}
      {(templateType === TEMPLATE_TYPES.SALES_SUMMARY || salesSummary) && (
        <div className="space-y-1.5">
          {/* Header */}
          <div className="text-center pb-1 border-b border-black">
            {showLogo && restaurant?.logo_url && (
              <img
                src={restaurant.logo_url}
                alt="Logo"
                className="max-h-7 max-w-[100px] mx-auto mb-0.5 object-contain"
              />
            )}
            <h1 className="font-black text-xs sm:text-sm uppercase tracking-tight leading-tight">
              {restaurant?.name || 'Restaurant Sales'}
            </h1>
            {showPhone && (restaurant?.phone || restaurant?.whatsapp_number) && (
              <div className="text-[10px] font-bold text-slate-700 leading-tight">
                Ph: +{restaurant?.phone || restaurant?.whatsapp_number}
              </div>
            )}
            <div className="inline-block bg-black text-white text-[10px] font-black px-1.5 py-0.2 rounded-xs uppercase tracking-wider mt-0.5">
              TODAY'S SALES SUMMARY
            </div>
          </div>

          {/* Meta Info */}
          <div className="text-[10px] space-y-0 pb-1 border-b border-dashed border-black leading-snug">
            <div className="flex justify-between font-bold">
              <span>Report Date:</span>
              <span>{salesSummary?.date || dateInfo.dateOnly}</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>Generated At:</span>
              <span>{salesSummary?.time || dateInfo.timeOnly}</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>Register / Shift:</span>
              <span className="font-bold">All Counters & Online</span>
            </div>
          </div>

          {/* Highlights KPI Box */}
          <div className="p-1.5 px-2 border border-black bg-slate-50 rounded-xs space-y-0.5">
            <div className="flex justify-between items-center pb-0.5 border-b border-dashed border-slate-300">
              <span className="text-[10px] font-black uppercase">TOTAL ORDERS:</span>
              <span className="text-sm font-black font-mono">
                {salesSummary?.totalOrders || 0} ORDERS
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase">TOTAL SALES:</span>
              <span className="text-sm sm:text-base font-black font-mono">
                {formatPKR(salesSummary?.totalSales || 0)}
              </span>
            </div>
            {salesSummary?.averageOrderValue && (
              <div className="flex justify-between text-[9px] font-bold text-slate-600">
                <span>Avg Order Value:</span>
                <span>{formatPKR(salesSummary.averageOrderValue)}</span>
              </div>
            )}
          </div>

          {/* Payment Breakdown: Cash vs Online */}
          <div>
            <div className="text-[9px] font-black uppercase tracking-wider pb-0.5 mb-0.5 border-b border-black">
              PAYMENT BREAKDOWN
            </div>
            <div className="divide-y divide-dotted divide-slate-300 text-[10px]">
              <div className="py-0.5 flex justify-between items-center">
                <div>
                  <div className="font-bold">Cash on Delivery / Counter</div>
                  <div className="text-[8px] text-slate-500">
                    {salesSummary?.cashSales?.count || 0} orders
                  </div>
                </div>
                <div className="font-mono font-black text-right">
                  {formatPKR(salesSummary?.cashSales?.total || 0)}
                </div>
              </div>
              <div className="py-0.5 flex justify-between items-center">
                <div>
                  <div className="font-bold">Online (JazzCash/Easypaisa/Card)</div>
                  <div className="text-[8px] text-slate-500">
                    {salesSummary?.onlineSales?.count || 0} orders
                  </div>
                </div>
                <div className="font-mono font-black text-right">
                  {formatPKR(salesSummary?.onlineSales?.total || 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Top 5 Items */}
          <div>
            <div className="text-[9px] font-black uppercase tracking-wider pb-0.5 mb-0.5 border-b border-black flex justify-between">
              <span>TOP ITEMS</span>
              <span>QTY / AMOUNT</span>
            </div>
            <div className="divide-y divide-dotted divide-slate-200 text-[10px]">
              {(salesSummary?.topItems || []).length > 0 ? (
                salesSummary.topItems.map((item, idx) => (
                  <div key={idx} className="py-0.5 flex justify-between items-start">
                    <div className="pr-1 flex-1 truncate">
                      <span className="font-black mr-1">#{idx + 1}</span>
                      <span className="font-bold">{item.title}</span>
                    </div>
                    <div className="text-right shrink-0 font-mono text-[9px]">
                      <span className="inline-block bg-slate-100 font-bold px-1 py-0.2 rounded-xs mr-0.5">
                        {item.quantity}x
                      </span>
                      <span className="font-bold">{formatPKR(item.revenue || 0)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-1 text-[9px] text-slate-500 italic text-center">
                  No order items recorded yet today.
                </div>
              )}
            </div>
          </div>

          {/* System Footer Note */}
          <div className="pt-1 border-t border-black text-center text-[8px] text-slate-600 font-bold">
            Dineflow Restaurant POS & Shift Audit
          </div>
        </div>
      )}
    </div>
  );
}
