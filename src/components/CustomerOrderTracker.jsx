import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  Truck,
  Phone,
  Utensils,
  ShoppingBag,
  ArrowLeft,
  XCircle,
  AlertCircle,
  Copy,
  Check,
  X,
  Star,
} from 'lucide-react';
import { formatPKR } from '../utils/currencyUtils';
import { format12HourTime } from '../utils/dateUtils';
import { orderService } from '../services/orderService';

const STATUS_STEPS = [
  { key: 'received', label: 'Received', icon: Clock, desc: 'Kitchen received your order' },
  { key: 'out_for_delivery', label: 'Ready / Dispatch', icon: Truck, desc: 'Ready for pickup or out with rider' },
  { key: 'completed', label: 'Completed', icon: CheckCircle2, desc: 'Order delivered / enjoyed' },
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

  // Rating State for Completed / Delivered orders
  const [orderRating, setOrderRating] = useState(() => {
    if (initialOrder?.customer_rating) return initialOrder.customer_rating;
    if (targetOrderId) return orderService.getOrderRating(targetOrderId);
    return null;
  });
  const [ratingInput, setRatingInput] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingTags, setRatingTags] = useState(['😋 Delicious Food']);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [ratingSuccessMsg, setRatingSuccessMsg] = useState(false);
  const [isEditingRating, setIsEditingRating] = useState(false);

  // Sync rating from storage or order updates
  useEffect(() => {
    if (!targetOrderId) return;
    const existing = orderService.getOrderRating(targetOrderId) || order?.customer_rating;
    if (existing) {
      setOrderRating(existing);
      setRatingInput(existing.rating || 5);
      setRatingComment(existing.comment || '');
      setRatingTags(existing.tags || []);
    }
  }, [targetOrderId, order?.status, order?.customer_rating]);

  // Listen for real-time rating updates
  useEffect(() => {
    const handleRated = (e) => {
      if (e.detail?.orderId === targetOrderId && e.detail?.ratingData) {
        setOrderRating(e.detail.ratingData);
        setRatingInput(e.detail.ratingData.rating || 5);
        setRatingComment(e.detail.ratingData.comment || '');
        setRatingTags(e.detail.ratingData.tags || []);
      }
    };
    window.addEventListener('dinehq_order_rated', handleRated);
    return () => window.removeEventListener('dinehq_order_rated', handleRated);
  }, [targetOrderId]);

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
  let activeIndex = 0;
  if (currentStatus === 'completed' || currentStatus === 'delivered') {
    activeIndex = 2;
  } else if (currentStatus === 'out_for_delivery' || currentStatus === 'ready') {
    activeIndex = 1;
  } else {
    activeIndex = 0;
  }

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(order.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const phoneForCall = restaurant?.phone || restaurant?.whatsapp_number || '03001234567';

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-3xl border border-[#F0E4D7] shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in duration-300">
      {/* Top Banner (Sticky header) */}
      <div className="p-4 sm:p-5 bg-[#FFF9F2] border-b border-[#F0E4D7] shrink-0">
        <div className="flex items-center justify-between gap-2 mb-3">
          <button
            type="button"
            onClick={onClose || onNewOrder}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#FFF1E6] text-[#2B2118] hover:text-[#F26B1D] border border-[#F0E4D7] text-xs font-bold shadow-2xs transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Menu</span>
          </button>

          {(onClose || onNewOrder) && (
            <button
              type="button"
              onClick={onClose || onNewOrder}
              className="p-1.5 rounded-xl bg-white hover:bg-[#FFF1E6] text-[#7A6A5C] hover:text-[#2B2118] border border-[#F0E4D7] transition cursor-pointer"
              title="Close Tracker"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

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
              ) : order.order_type === 'pickup' || order.order_type === 'takeaway' ? (
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

      {/* Scrollable Body Content */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#F0E4D7]">
        {/* Live Stepper Tracker */}
        <div className="p-5 sm:p-6 bg-white">
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
            </div>

            {/* Stepper Progress Bar */}
            <div className="relative pt-2">
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
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

      {/* Customer Food & Experience Rating (When order is completed / delivered) */}
      {(activeIndex >= 2 || currentStatus === 'completed' || currentStatus === 'delivered') && (
        <div className="p-5 sm:p-6 bg-white border-b border-[#F0E4D7]">
          {orderRating && !isEditingRating ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#FFF9F2] to-amber-500/5 border border-amber-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <Star className="w-4 h-4 fill-white" />
                  </div>
                  <div>
                    <h4 className="font-heading font-extrabold text-sm text-[#2B2118]">
                      You rated this order {orderRating.rating}/5 ⭐
                    </h4>
                    <p className="text-[11px] text-[#7A6A5C]">
                      Thank you! Your feedback helps {restaurant?.name || 'the kitchen'} stay delicious.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingRating(true)}
                  className="text-xs font-bold text-[#F26B1D] hover:underline px-2 py-1 cursor-pointer"
                >
                  Edit
                </button>
              </div>
              {orderRating.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {orderRating.tags.map((t, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded-full bg-white border border-amber-200 text-[11px] font-bold text-[#7A6A5C]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {orderRating.comment && (
                <p className="text-xs italic text-[#2B2118] bg-white/80 p-2.5 rounded-xl border border-amber-100">
                  "{orderRating.comment}"
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#FFF9F2] to-white border border-[#F0E4D7] shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#F26B1D]">
                    Order Delivered • How was it?
                  </span>
                  <h4 className="font-heading font-extrabold text-base text-[#2B2118]">
                    Rate Your Meal & Experience
                  </h4>
                  <p className="text-xs text-[#7A6A5C]">
                    How was the food from {restaurant?.name || 'the kitchen'}?
                  </p>
                </div>
                {isEditingRating && (
                  <button
                    type="button"
                    onClick={() => setIsEditingRating(false)}
                    className="text-xs font-bold text-[#7A6A5C] hover:text-[#2B2118] cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {/* Star Picker */}
              <div className="flex flex-col items-center gap-1.5 py-1">
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRatingInput(star)}
                      className="p-1 cursor-pointer transition transform hover:scale-110 active:scale-95"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          star <= (hoverRating || ratingInput)
                            ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                            : 'text-slate-300 fill-slate-100'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-xs font-bold text-[#F26B1D]">
                  {ratingInput === 5
                    ? 'Outstanding & Delicious! ⭐'
                    : ratingInput === 4
                    ? 'Very good! 😋'
                    : ratingInput === 3
                    ? 'Good & tasty 😊'
                    : ratingInput === 2
                    ? 'Fair 🙂'
                    : 'Needs improvement 😕'}
                </span>
              </div>

              {/* Quick Praise Tags */}
              <div className="flex flex-wrap gap-1.5 justify-center">
                {[
                  '🔥 Piping Hot',
                  '⚡ Fast Delivery',
                  '😋 Delicious Food',
                  '📦 Great Packaging',
                  '👌 Polite Rider',
                  '💰 Great Value',
                ].map((tag) => {
                  const isSelected = ratingTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setRatingTags((prev) =>
                          prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                        );
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-bold border transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#2B2118] text-white border-[#2B2118]'
                          : 'bg-white text-[#7A6A5C] border-[#F0E4D7] hover:border-[#F26B1D]'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>

              {/* Optional Comment */}
              <textarea
                rows={2}
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="Write a brief comment about taste, portion, or delivery (optional)..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#F0E4D7] bg-white text-xs font-medium text-[#2B2118] placeholder:text-[#9E8E81] focus:outline-none focus:ring-2 focus:ring-[#F26B1D]"
              />

              {/* Submit Button */}
              <div className="flex items-center justify-between gap-3">
                {ratingSuccessMsg ? (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Rating submitted! Thank you.</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-[#7A6A5C]">
                    Helps improve food quality
                  </span>
                )}
                <button
                  type="button"
                  disabled={isSubmittingRating}
                  onClick={async () => {
                    setIsSubmittingRating(true);
                    try {
                      const res = await orderService.submitOrderRating(
                        order.id,
                        {
                          rating: ratingInput,
                          comment: ratingComment,
                          tags: ratingTags,
                        },
                        restaurant?.id || order.restaurant_id
                      );
                      setOrderRating(res);
                      setIsEditingRating(false);
                      setRatingSuccessMsg(true);
                      setTimeout(() => setRatingSuccessMsg(false), 3000);
                    } catch (err) {
                      console.warn('Failed to submit rating:', err);
                    } finally {
                      setIsSubmittingRating(false);
                    }
                  }}
                  className="px-5 py-2 rounded-xl bg-[#F26B1D] hover:bg-[#d95a12] text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingRating ? 'Submitting...' : 'Submit Rating'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
                : order.order_type === 'pickup' || order.order_type === 'takeaway'
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
      </div>

      {/* Bottom Action Buttons (Sticky footer) */}
      <div className="p-3.5 sm:p-4 bg-[#FFF9F2] border-t border-[#F0E4D7] shrink-0 flex flex-col sm:flex-row items-center gap-2">
        <a
          href={`tel:${phoneForCall}`}
          className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-[#2B2118] font-bold text-xs border border-[#F0E4D7] shadow-2xs flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <Phone className="w-3.5 h-3.5 text-[#F26B1D]" />
          <span>Call Restaurant</span>
        </a>

        <button
          type="button"
          onClick={onNewOrder || onClose}
          style={{ backgroundColor: primaryColor }}
          className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl text-white font-bold text-xs shadow-md hover:brightness-95 flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Menu</span>
        </button>
      </div>
    </div>
  );
}
