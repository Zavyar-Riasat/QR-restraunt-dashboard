import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  ChefHat,
  Truck,
  Sparkles,
  Phone,
  MapPin,
  Utensils,
  ShoppingBag,
  RefreshCw,
  ArrowLeft,
  XCircle,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { formatPKR } from '../utils/currencyUtils';
import { format12HourTime } from '../utils/dateUtils';
import { orderService } from '../services/orderService';

const STATUS_STEPS = [
  { key: 'new', label: 'Received', icon: Clock, desc: 'Kitchen received your order' },
  { key: 'preparing', label: 'Cooking', icon: ChefHat, desc: 'Chef is preparing your dishes' },
  { key: 'out_for_delivery', label: 'Ready / Dispatch', icon: Truck, desc: 'Ready for pickup or out with rider' },
  { key: 'completed', label: 'Completed', icon: Sparkles, desc: 'Order delivered / enjoyed' },
];

export default function CustomerOrderTracker({
  order: initialOrder,
  orderId,
  restaurant,
  onClose,
  onNewOrder,
}) {
  const [order, setOrder] = useState(initialOrder || null);
  const [loading, setLoading] = useState(!initialOrder);
  const [copied, setCopied] = useState(false);
  const primaryColor = restaurant?.primary_color || '#F26B1D';

  const targetOrderId = initialOrder?.id || orderId;

  // Poll order status every 5 seconds to provide real-time updates as kitchen advances status
  useEffect(() => {
    if (!targetOrderId) return;

    let isMounted = true;

    const fetchUpdatedOrder = async () => {
      try {
        const updated = await orderService.getOrderById(targetOrderId, restaurant?.id);
        if (updated && isMounted) {
          setOrder(updated);
          setLoading(false);
        }
      } catch (err) {
        console.warn('Tracker polling notice:', err);
      }
    };

    fetchUpdatedOrder();
    const interval = setInterval(fetchUpdatedOrder, 5000);

    const handleStatusUpdate = (e) => {
      if (e.detail?.orderId === targetOrderId && isMounted) {
        fetchUpdatedOrder();
      }
    };

    const handleStorage = (e) => {
      if (e.key && e.key.includes('dinehq_orders') && isMounted) {
        fetchUpdatedOrder();
      }
    };

    window.addEventListener('dinehq_order_status_updated', handleStatusUpdate);
    window.addEventListener('storage', handleStorage);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('dinehq_order_status_updated', handleStatusUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [targetOrderId, restaurant?.id]);

  if (loading && !order) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-[#F26B1D] animate-spin mx-auto" />
        <p className="text-sm font-bold text-slate-700">Loading your order status...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 text-center space-y-4 bg-white rounded-3xl border border-slate-200">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
        <h3 className="font-heading font-extrabold text-slate-800 text-lg">Order Not Found</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          We could not locate this order. It might have expired or been placed on another device.
        </p>
        <button
          onClick={onNewOrder || onClose}
          className="px-5 py-2.5 rounded-xl bg-[#F26B1D] text-white text-xs font-bold shadow-md cursor-pointer hover:brightness-95"
        >
          Return to Menu
        </button>
      </div>
    );
  }

  // Calculate current active step index
  const currentStatus = order.status || 'new';
  const isCancelled = currentStatus === 'cancelled';
  let activeIndex = STATUS_STEPS.findIndex((s) => s.key === currentStatus || (currentStatus === 'ready' && s.key === 'out_for_delivery'));
  if (activeIndex === -1) {
    activeIndex = currentStatus === 'completed' ? 3 : 0;
  }

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(order.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const phoneForCall = restaurant?.phone || restaurant?.whatsapp_number || '03001234567';

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-3xl border border-[#F0E4D7] shadow-xl overflow-hidden animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="p-5 sm:p-6 bg-[#FFF9F2] border-b border-[#F0E4D7] relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A6A5C]">
                Direct Kitchen Order
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#1F9D55] animate-ping" />
            </div>

            <div className="flex items-center gap-2 mt-1">
              <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-[#2B2118] tracking-tight">
                #{order.id}
              </h2>
              <button
                onClick={handleCopyOrderId}
                className="p-1 rounded-lg bg-white border border-[#F0E4D7] text-[#7A6A5C] hover:text-[#2B2118] transition cursor-pointer"
                title="Copy Order ID"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#1F9D55]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-xs text-[#7A6A5C] mt-0.5 font-medium">
              Placed at {order.created_at ? (format12HourTime(order.created_at)?.timeOnly || 'Just now') : 'Just now'}
            </p>
          </div>

          {/* Dining Type Pill */}
          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#F0E4D7] text-xs font-extrabold text-[#2B2118] shadow-2xs">
              {order.order_type === 'dine_in' ? (
                <>
                  <Utensils className="w-3.5 h-3.5 text-[#F26B1D]" />
                  <span>Dine-In {order.table_number ? `• T-${order.table_number}` : ''}</span>
                </>
              ) : order.order_type === 'pickup' ? (
                <>
                  <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
                  <span>Takeaway Pickup</span>
                </>
              ) : (
                <>
                  <Truck className="w-3.5 h-3.5 text-[#1F9D55]" />
                  <span>Doorstep Delivery</span>
                </>
              )}
            </span>
            {restaurant?.prep_time && (
              <p className="text-[11px] text-[#7A6A5C] font-mono mt-1">
                Est: ~{restaurant.prep_time}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Live Stepper Tracker */}
      <div className="p-5 sm:p-6 border-b border-[#F0E4D7] bg-white">
        {isCancelled ? (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-3">
            <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
            <div>
              <p className="text-sm font-extrabold text-rose-900">This order was cancelled</p>
              <p className="text-xs text-rose-700 font-normal mt-0.5">
                Please contact the kitchen directly if you have any questions.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#7A6A5C]">
                Kitchen Progress
              </span>
              <span
                style={{ color: primaryColor }}
                className="text-xs font-bold flex items-center gap-1.5 font-mono"
              >
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Live status synced</span>
              </span>
            </div>

            {/* Stepper Progress Bar */}
            <div className="relative pt-2">
              <div className="grid grid-cols-4 gap-1 sm:gap-2">
                {STATUS_STEPS.map((step, idx) => {
                  const isDone = idx < activeIndex;
                  const isCurrent = idx === activeIndex;
                  const StepIcon = step.icon;

                  return (
                    <div key={step.key} className="flex flex-col items-center text-center">
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center transition shadow-2xs mb-2 ${
                          isDone
                            ? 'bg-[#E7F6EC] text-[#1F9D55] border border-[#C0E9CE]'
                            : isCurrent
                            ? 'text-white shadow-md animate-pulse'
                            : 'bg-[#FFF9F2] text-[#9E8E81] border border-[#F0E4D7]'
                        }`}
                        style={{
                          backgroundColor: isCurrent ? primaryColor : undefined,
                        }}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                        ) : (
                          <StepIcon className="w-5 h-5" />
                        )}
                      </div>

                      <span
                        className={`text-[11px] font-bold leading-tight ${
                          isCurrent
                            ? 'text-[#2B2118]'
                            : isDone
                            ? 'text-[#1F9D55]'
                            : 'text-[#9E8E81]'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Status Message Highlight */}
              <div
                className="mt-4 p-3.5 rounded-2xl text-xs font-medium border flex items-center gap-2.5"
                style={{
                  backgroundColor: '#FFF9F2',
                  borderColor: '#F0E4D7',
                }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0 animate-ping"
                  style={{ backgroundColor: primaryColor }}
                />
                <span className="text-[#2B2118] font-bold">
                  {STATUS_STEPS[activeIndex]?.desc || 'Your order is being processed'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Customer & Location Card */}
      <div className="p-5 sm:p-6 border-b border-[#F0E4D7] bg-[#FFF9F2]/40 space-y-3 text-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A6A5C]">
          Order Destination & Contact
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-2xl bg-white border border-[#F0E4D7] space-y-1">
            <span className="text-[10px] font-bold text-[#7A6A5C] uppercase">Customer</span>
            <p className="font-bold text-[#2B2118]">{order.customer_name}</p>
            <p className="text-[#7A6A5C] font-mono">{order.customer_phone}</p>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-[#F0E4D7] space-y-1">
            <span className="text-[10px] font-bold text-[#7A6A5C] uppercase">
              {order.order_type === 'dine_in'
                ? 'Table Placement'
                : order.order_type === 'pickup'
                ? 'Pickup Point'
                : 'Delivery Destination'}
            </span>
            <p className="font-bold text-[#2B2118] break-words">
              {order.customer_address || 'At counter'}
            </p>
          </div>
        </div>

        {order.customer_notes && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <strong className="block text-[10px] uppercase font-bold text-amber-800">
              Kitchen Instructions:
            </strong>
            <span>{order.customer_notes}</span>
          </div>
        )}
      </div>

      {/* Ordered Items List */}
      <div className="p-5 sm:p-6 space-y-3 bg-white">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A6A5C]">
          Ordered Items ({order.items?.reduce((sum, it) => sum + (it.quantity || 1), 0) || 0})
        </span>

        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {order.items?.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] flex items-start justify-between gap-3 text-xs"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-[#F26B1D]">{item.quantity}x</span>
                  <span className="font-bold text-[#2B2118] truncate">{item.title}</span>
                  {item.dealBadge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                      {item.dealBadge}
                    </span>
                  )}
                </div>
                {item.choices && item.choices.length > 0 && (
                  <div className="mt-0.5 space-y-0.5">
                    {item.choices.map((c, cIdx) => (
                      <p key={cIdx} className="text-[11px] text-[#7A6A5C] truncate">
                        ↳ {c}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              <span className="font-mono font-bold text-[#2B2118] shrink-0">
                {formatPKR((Number(item.unitPrice) || 0) * (Number(item.quantity) || 1))}
              </span>
            </div>
          ))}
        </div>

        {/* Pricing Summary */}
        <div className="pt-3 border-t border-[#F0E4D7] space-y-1.5 text-xs text-[#7A6A5C]">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-mono font-bold text-[#2B2118]">
              {formatPKR(order.subtotal || order.total_payable)}
            </span>
          </div>
          {Number(order.delivery_fee) > 0 && (
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span className="font-mono font-bold text-[#2B2118]">
                {formatPKR(order.delivery_fee)}
              </span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-[#F0E4D7] text-sm font-extrabold text-[#2B2118]">
            <div className="flex flex-col">
              <span>Total Payable</span>
              <span className="text-[10px] font-medium text-[#7A6A5C]">
                {order.payment_method || 'Cash on Delivery'}
              </span>
            </div>
            <span className="font-mono text-base" style={{ color: primaryColor }}>
              {formatPKR(order.total_payable)}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="p-4 sm:p-5 bg-[#FFF9F2] border-t border-[#F0E4D7] flex flex-col sm:flex-row items-center gap-2.5">
        <a
          href={`tel:${phoneForCall}`}
          className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-white hover:bg-slate-50 text-[#2B2118] font-bold text-xs border border-[#F0E4D7] shadow-2xs flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <Phone className="w-4 h-4 text-[#F26B1D]" />
          <span>Call Restaurant</span>
        </a>

        <button
          type="button"
          onClick={onNewOrder || onClose}
          style={{ backgroundColor: primaryColor }}
          className="w-full sm:w-1/2 py-3 px-4 rounded-xl text-white font-bold text-xs shadow-md hover:brightness-95 flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <Utensils className="w-4 h-4" />
          <span>Browse Menu</span>
        </button>
      </div>
    </div>
  );
}
