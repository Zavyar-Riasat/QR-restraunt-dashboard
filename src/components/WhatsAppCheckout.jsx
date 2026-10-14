import React, { useState } from 'react';
import { Send, MapPin, User, Phone, FileText, Sparkles, ShieldCheck, ArrowLeft, Truck, AlertCircle } from 'lucide-react';
import { handleWhatsAppCheckout } from '../utils/checkoutUtils';
import { formatPKR } from '../utils/currencyUtils';

export default function WhatsAppCheckout({
  cart,
  restaurant,
  onBack,
  onOrderPlaced,
}) {
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const isFreeDelivery = restaurant?.delivery_mode === 'free';
  const isHiddenDelivery = restaurant?.delivery_mode === 'none';
  const deliveryFee = (isFreeDelivery || isHiddenDelivery) ? 0 : (Number(restaurant?.delivery_fee) || 0);

  const checkMinOrder = restaurant?.show_min_order !== false;
  const minOrder = checkMinOrder ? (Number(restaurant?.min_order_amount) || 0) : 0;
  const finalTotal = subtotal + deliveryFee;

  const isKitchenOpen = restaurant?.is_open !== false;
  const meetsMinOrder = !checkMinOrder || minOrder === 0 || subtotal >= minOrder;

  const onSubmit = (e) => {
    e.preventDefault();
    if (!customer.name.trim() || !customer.address.trim()) {
      alert('Please enter your name and delivery address.');
      return;
    }

    if (!isKitchenOpen) {
      alert('Kitchen is currently paused for direct orders.');
      return;
    }

    if (!meetsMinOrder) {
      alert(`Minimum order amount is Rs. ${minOrder}. Please add Rs. ${minOrder - subtotal} more to order.`);
      return;
    }

    setIsSubmitting(true);
    const success = handleWhatsAppCheckout({
      cart,
      restaurant,
      customerDetails: customer,
    });

    if (success && onOrderPlaced) {
      onOrderPlaced();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Cart items</span>
      </button>

      {/* Kitchen Status Alert if Paused */}
      {!isKitchenOpen && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>This kitchen is temporarily paused. Orders cannot be submitted right now.</span>
        </div>
      )}

      {/* Minimum Order Warning */}
      {!meetsMinOrder && isKitchenOpen && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Minimum order for delivery is <strong>{formatPKR(minOrder)}</strong>. Add{' '}
            <strong>{formatPKR(minOrder - subtotal)}</strong> more to proceed.
          </span>
        </div>
      )}

      {/* Customer Delivery Form */}
      <form onSubmit={onSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Your Name *
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              required
              placeholder="e.g. Ali Ahmed"
              value={customer.name}
              onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Phone Number (Optional)
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="tel"
              placeholder="e.g. 03001234567"
              value={customer.phone}
              onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:outline-none focus:border-emerald-500 focus:bg-white transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Delivery Address *
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <textarea
              rows="2"
              required
              placeholder="House/Apt #, Street, Area, City..."
              value={customer.address}
              onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
              className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white resize-none transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Special Instructions (Optional)
          </label>
          <div className="relative">
            <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="e.g. Extra spicy, don't ring bell"
              value={customer.notes}
              onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="pt-2 border-t border-slate-200 space-y-1.5 text-xs text-slate-600">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-mono font-bold text-slate-800">{formatPKR(subtotal)}</span>
          </div>

          {restaurant?.delivery_mode !== 'none' && (
            <div className="flex justify-between text-slate-600">
              <span className="flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-slate-400" />
                <span>Delivery</span>
              </span>
              <span className="font-mono font-semibold">
                {isFreeDelivery ? 'Free' : formatPKR(deliveryFee)}
              </span>
            </div>
          )}

          <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-extrabold text-slate-900">
            <span>Total Payable</span>
            <span className="font-mono text-emerald-700 text-base">{formatPKR(finalTotal)}</span>
          </div>
        </div>

        {/* Submit to WhatsApp Button */}
        <button
          type="submit"
          disabled={isSubmitting || !isKitchenOpen || !meetsMinOrder}
          className="w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          <span>
            {!isKitchenOpen
              ? 'Kitchen Paused'
              : !meetsMinOrder
              ? `Min Order: ${formatPKR(minOrder)}`
              : `Send WhatsApp Order (${formatPKR(finalTotal)})`}
          </span>
        </button>
      </form>
    </div>
  );
}
