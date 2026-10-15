import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { formatPKR } from '../../utils/currencyUtils';
import { format12HourTime } from '../../utils/dateUtils';
import { PAPER_SIZES, TEMPLATE_TYPES } from '../../services/printer/printerTypes';
import {
  ChefHat,
  Receipt,
  Truck,
  MapPin,
  Phone,
  User,
  Clock,
  AlertTriangle,
  QrCode,
  DollarSign,
  Utensils,
} from 'lucide-react';

export default function PrintTemplateRenderer({
  templateType = TEMPLATE_TYPES.KOT, // 'kot' | 'bill' | 'delivery'
  paperSize = PAPER_SIZES.SIZE_80MM, // '58mm' | '80mm' | 'a4'
  order,
  restaurant,
  settings = {},
  isLivePrint = false,
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
  const isLargeFont = fontSize === 'large';
  const showUrdu = language === 'ur' || language === 'both';
  const showEnglish = language === 'en' || language === 'both';

  const dateInfo = format12HourTime(order?.created_at);
  const reorderUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/${
    restaurant?.slug || 'burgersmoke'
  }`;

  // Container width styling
  const getContainerStyle = () => {
    if (is58mm) {
      return {
        width: '54mm',
        maxWidth: '100%',
        padding: '6px',
        fontSize: isLargeFont ? '12px' : '11px',
      };
    }
    if (isA4) {
      return {
        width: '100%',
        maxWidth: '190mm',
        padding: '24px',
        fontSize: isLargeFont ? '15px' : '13px',
      };
    }
    // Default 80mm
    return {
      width: '76mm',
      maxWidth: '100%',
      padding: '12px',
      fontSize: isLargeFont ? '13px' : '12px',
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
        <div className="space-y-3">
          {/* Top Header: Restaurant & KOT Banner */}
          <div className="text-center pb-2 border-b-2 border-dashed border-black space-y-1">
            <h2 className="font-extrabold text-sm sm:text-base uppercase tracking-wider">
              {restaurant?.name || 'KITCHEN ORDER TICKET'}
            </h2>
            <div className="flex items-center justify-center gap-1.5 font-bold text-xs">
              {showEnglish && <span>KITCHEN ORDER TICKET (KOT)</span>}
              {showUrdu && showEnglish && <span>•</span>}
              {showUrdu && <span className="font-sans">رسید برائے کچن</span>}
            </div>
          </div>

          {/* Big Order Number & Table/Delivery Type Banner */}
          <div className="text-center py-1 border-b-2 border-black space-y-1.5">
            <div className="text-2xl sm:text-3xl font-black tracking-tight font-mono">
              #{order?.id || 'TEST-101'}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="px-2.5 py-0.5 rounded-sm bg-black text-white font-black text-xs uppercase tracking-wider">
                {order?.table
                  ? `TABLE: ${order.table}`
                  : order?.order_type === 'pickup'
                  ? 'PICKUP / TAKEAWAY'
                  : 'DELIVERY ORDER'}
              </span>

              <span className="text-[11px] font-bold text-slate-800">
                🕒 {dateInfo.timeOnly}
              </span>
            </div>
            <div className="text-[10px] text-slate-600 font-semibold">{dateInfo.dateOnly}</div>
          </div>

          {/* Kitchen Notes in Highlighted Box */}
          {order?.customer_notes && (
            <div className="p-2.5 rounded-sm border-2 border-black bg-amber-50 text-black font-extrabold text-xs space-y-0.5">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-amber-900">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>KITCHEN ORDER NOTES</span>
                {showUrdu && <span className="font-sans">(خصوصی ہدایت)</span>}
              </div>
              <p className="break-words font-sans text-xs leading-snug">
                {order.customer_notes}
              </p>
            </div>
          )}

          {/* Items List in LARGE bold text with quantity first, Indented Choices, NO PRICES */}
          <div className="pt-1">
            <div className="flex justify-between items-center pb-1 mb-2 border-b border-black text-[11px] font-black uppercase">
              <span>QTY & ITEM DETAILS</span>
              <span>KITCHEN READY</span>
            </div>

            <div className="divide-y divide-dashed divide-slate-300">
              {(order?.items || []).map((item, idx) => (
                <div key={idx} className="py-2 space-y-1">
                  {/* Large Quantity First + Item Name */}
                  <div className="flex items-start justify-between gap-1">
                    <div className="font-black text-sm sm:text-base leading-tight break-words flex-1">
                      <span className="inline-block bg-black text-white px-1.5 py-0.2 rounded-xs mr-1.5 font-mono text-sm sm:text-base font-black">
                        {item.quantity} x
                      </span>
                      <span className="font-extrabold">{item.title}</span>
                    </div>
                    {/* Kitchen checkbox square */}
                    <div className="w-4 h-4 border-2 border-black rounded-xs shrink-0 mt-0.5" />
                  </div>

                  {/* Deals contents */}
                  {item.dealItems && (
                    <div className="pl-6 text-[10px] font-bold text-slate-700 italic break-words">
                      * Includes: {item.dealItems}
                    </div>
                  )}

                  {/* Indented Options and Extras */}
                  {Array.isArray(item.choices) && item.choices.length > 0 && (
                    <div className="pl-6 space-y-0.5 pt-0.5">
                      {item.choices.map((choice, cIdx) => (
                        <div
                          key={cIdx}
                          className="text-[11px] font-extrabold text-slate-800 break-words flex items-start gap-1"
                        >
                          <span className="text-slate-500">↳</span>
                          <span>{choice}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Summary Ticket Footer */}
          <div className="pt-2 border-t-2 border-black text-center text-[10px] font-bold space-y-1">
            <div>
              TOTAL ITEMS:{' '}
              {(order?.items || []).reduce((acc, i) => acc + (parseInt(i.quantity, 10) || 1), 0)}{' '}
              DISHES
            </div>
            <div className="text-[9px] text-slate-500 font-mono">DineHQ Smart Kitchen Ticket</div>
          </div>
        </div>
      )}

      {/* ========================================================
          TEMPLATE 2: CUSTOMER BILL
          ======================================================== */}
      {templateType === TEMPLATE_TYPES.BILL && (
        <div className="space-y-3">
          {/* Header with Logo, Name, Phone */}
          <div className="text-center pb-2 border-b border-black space-y-1">
            {showLogo && restaurant?.logo_url && (
              <img
                src={restaurant.logo_url}
                alt="Logo"
                className="max-h-12 max-w-[140px] mx-auto mb-1.5 object-contain"
              />
            )}

            <h1 className="font-extrabold text-base sm:text-lg uppercase tracking-tight">
              {restaurant?.name || 'Restaurant Bill'}
            </h1>

            {showPhone && restaurant?.whatsapp_number && (
              <div className="text-[11px] font-bold text-slate-700">
                Ph: +{restaurant.whatsapp_number}
              </div>
            )}

            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
              {showEnglish && <span>Official Tax Invoice / Receipt</span>}
              {showUrdu && showEnglish && <span> • </span>}
              {showUrdu && <span className="font-sans">کسٹمر بل</span>}
            </div>
          </div>

          {/* Order Meta Details */}
          <div className="text-[11px] space-y-0.5 pb-2 border-b border-dashed border-black">
            <div className="flex justify-between font-bold">
              <span>Order #:</span>
              <span className="font-mono font-extrabold">#{order?.id || '---'}</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>Date & Time:</span>
              <span>{dateInfo.full12Hour}</span>
            </div>
            {order?.customer_name && (
              <div className="flex justify-between text-slate-700">
                <span>Customer:</span>
                <span className="font-bold">{order.customer_name}</span>
              </div>
            )}
            {order?.customer_phone && (
              <div className="flex justify-between text-slate-700">
                <span>Phone:</span>
                <span>+{order.customer_phone}</span>
              </div>
            )}
          </div>

          {/* Item List with Quantity and Price in Rs. */}
          <div className="pt-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-black text-[10px] font-bold uppercase">
                  <th className="py-1">ITEM</th>
                  <th className="py-1 text-center w-10">QTY</th>
                  <th className="py-1 text-right w-20">AMOUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dotted divide-slate-300">
                {(order?.items || []).map((item, idx) => (
                  <tr key={idx} className="align-top">
                    <td className="py-1.5 pr-1">
                      <div className="font-bold break-words">{item.title}</div>
                      {item.dealItems && (
                        <div className="text-[9px] text-slate-500 italic pl-1">
                          * {item.dealItems}
                        </div>
                      )}
                      {Array.isArray(item.choices) &&
                        item.choices.map((c, cIdx) => (
                          <div key={cIdx} className="text-[9px] text-slate-500 pl-1">
                            ↳ {c}
                          </div>
                        ))}
                    </td>
                    <td className="py-1.5 text-center font-bold font-mono">
                      {item.quantity}
                    </td>
                    <td className="py-1.5 text-right font-bold font-mono whitespace-nowrap">
                      {formatPKR((item.unitPrice || 0) * (item.quantity || 1))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Subtotal, Delivery Fee, Discount, and Bold Large Total */}
          <div className="pt-2 border-t-2 border-black space-y-1 text-xs">
            <div className="flex justify-between text-slate-700">
              <span>Subtotal:</span>
              <span className="font-mono font-bold">{formatPKR(order?.subtotal || 0)}</span>
            </div>

            {Number(order?.delivery_fee) > 0 && (
              <div className="flex justify-between text-slate-700">
                <span>Delivery Fee:</span>
                <span className="font-mono font-bold">{formatPKR(order.delivery_fee)}</span>
              </div>
            )}

            {Number(order?.discount) > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Discount / Deal Promo:</span>
                <span className="font-mono">-{formatPKR(order.discount)}</span>
              </div>
            )}

            {/* Bold, Large TOTAL */}
            <div className="flex justify-between items-center pt-2 mt-1 border-t-2 border-black text-sm sm:text-base font-black">
              <span>
                {showEnglish && <span>TOTAL PAYABLE:</span>}
                {showUrdu && showEnglish && <br />}
                {showUrdu && <span className="font-sans text-xs">کل رقم واجب الادا:</span>}
              </span>
              <span className="font-mono text-base sm:text-lg font-black text-black">
                {formatPKR(order?.total_payable || 0)}
              </span>
            </div>

            {/* Payment Method Badge */}
            <div className="pt-2 pb-1 text-center">
              <span className="px-2.5 py-1 rounded-sm bg-slate-100 border border-slate-300 font-extrabold text-[11px] inline-block uppercase">
                Payment: {order?.payment_method || 'Cash on Delivery'}
              </span>
            </div>
          </div>

          {/* Footer Message */}
          {footerMessage && (
            <div className="text-center pt-2 border-t border-dashed border-black space-y-1">
              <p className="text-[11px] font-bold text-slate-800 break-words leading-tight">
                {footerMessage}
              </p>
              {showUrdu && (
                <p className="text-[10px] font-sans font-bold text-slate-700">
                  تشریف آوری کا بہت شکریہ!
                </p>
              )}
            </div>
          )}

          {/* Bottom QR Code for Reordering */}
          <div className="pt-2 text-center space-y-1 border-t border-dashed border-slate-300">
            <div className="flex justify-center p-1">
              <QRCodeSVG
                value={reorderUrl}
                size={is58mm ? 70 : 85}
                level="M"
                includeMargin={false}
              />
            </div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-700">
              Scan to View Menu & Reorder
            </div>
            <div className="text-[8px] font-mono text-slate-500 break-all">{reorderUrl}</div>
          </div>
        </div>
      )}

      {/* ========================================================
          TEMPLATE 3: DELIVERY SLIP
          ======================================================== */}
      {templateType === TEMPLATE_TYPES.DELIVERY && (
        <div className="space-y-3">
          {/* Header */}
          <div className="text-center pb-2 border-b-2 border-black space-y-1">
            <h1 className="font-black text-base sm:text-lg uppercase tracking-tight">
              DELIVERY DISPATCH SLIP
            </h1>
            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              {showEnglish && <span>Rider Delivery & Address Manifest</span>}
              {showUrdu && showEnglish && <span> • </span>}
              {showUrdu && <span className="font-sans">ڈلیوری سلپ</span>}
            </div>
          </div>

          {/* Order # and Time */}
          <div className="flex justify-between items-center text-xs font-bold pb-2 border-b border-dashed border-black">
            <span>
              Order: <span className="font-mono font-black text-sm">#{order?.id || '---'}</span>
            </span>
            <span>🕒 {dateInfo.timeOnly}</span>
          </div>

          {/* Customer Name & Phone */}
          <div className="p-2.5 rounded-sm border-2 border-black bg-slate-50 space-y-1 text-xs">
            <div className="flex items-center gap-1.5 font-black text-sm">
              <User className="w-4 h-4 shrink-0" />
              <span className="uppercase">{order?.customer_name || 'Guest Customer'}</span>
            </div>

            {order?.customer_phone && (
              <div className="flex items-center gap-1.5 font-black text-sm text-slate-900 pt-0.5">
                <Phone className="w-4 h-4 shrink-0 text-emerald-700" />
                <span className="font-mono">+{order.customer_phone}</span>
              </div>
            )}
          </div>

          {/* Full Delivery Address (High Visibility) */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-700">
              <MapPin className="w-3.5 h-3.5 text-rose-600" />
              <span>Full Delivery Address:</span>
            </div>
            <div className="p-2.5 rounded-sm border-2 border-black font-extrabold text-xs sm:text-sm leading-snug break-words">
              {order?.customer_address || 'Counter Pickup (No Delivery Address provided)'}
            </div>
          </div>

          {/* Rider Notes / Customer Instructions */}
          {(order?.rider_notes || order?.customer_notes) && (
            <div className="p-2.5 rounded-sm border-2 border-black bg-amber-50 space-y-0.5 text-xs font-bold">
              <div className="flex items-center gap-1 text-[10px] uppercase font-black text-amber-900">
                <Truck className="w-3.5 h-3.5" />
                <span>Rider Special Notes:</span>
              </div>
              <p className="break-words font-sans text-xs">
                {order.rider_notes || order.customer_notes}
              </p>
            </div>
          )}

          {/* Items Summary Preview */}
          <div className="pt-1">
            <div className="text-[10px] font-bold uppercase pb-1 border-b border-black flex justify-between">
              <span>ITEMS IN PARCEL</span>
              <span>QTY</span>
            </div>
            <div className="divide-y divide-dashed divide-slate-300 text-xs">
              {(order?.items || []).map((item, idx) => (
                <div key={idx} className="py-1 flex justify-between font-semibold">
                  <span className="break-words pr-2">{item.title}</span>
                  <span className="font-mono font-bold shrink-0">{item.quantity}x</span>
                </div>
              ))}
            </div>
          </div>

          {/* Big High-Visibility Box: Total Cash to Collect */}
          <div className="p-3 my-2 border-2 border-black bg-emerald-50 rounded-sm text-center space-y-1">
            <div className="text-[11px] uppercase font-black tracking-wider text-emerald-900">
              {showEnglish && <span>CASH TO COLLECT FROM CUSTOMER</span>}
              {showUrdu && showEnglish && <br />}
              {showUrdu && <span className="font-sans text-[10px]">گاہک سے وصول کرنے والی رقم</span>}
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-black">
              {formatPKR(order?.total_payable || 0)}
            </div>
            <div className="text-[10px] font-bold text-slate-700">
              Payment Method: {order?.payment_method || 'Cash on Delivery'}
            </div>
          </div>

          {/* Bottom Dispatch Sign-off */}
          <div className="pt-2 border-t border-black text-center text-[10px] font-bold text-slate-600">
            <div>Restaurant: {restaurant?.name || 'Kitchen'}</div>
            <div className="text-[9px] text-slate-400">DineHQ Automated Rider Dispatch</div>
          </div>
        </div>
      )}
    </div>
  );
}
