import React, { useState, useEffect, useId } from 'react';
import {
  User,
  Phone,
  MapPin,
  FileText,
  AlertCircle,
  Truck,
  ShoppingBag,
  Utensils,
  ArrowLeft,
  CheckCircle2,
  Navigation,
  CreditCard,
  Banknote,
  Sparkles,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { handleDirectOrderCheckout, validatePakistaniPhone } from '../utils/checkoutUtils';
import { formatPKR } from '../utils/currencyUtils';
import DeliveryLocationPicker from './DeliveryLocationPicker';

export default function DirectOrderCheckout({
  cart,
  restaurant,
  onBack,
  onOrderPlaced,
}) {
  const primaryColor = restaurant?.primary_color || '#F26B1D';

  // Read table parameter from URL if customer scanned a table-specific QR code
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialTable = urlParams?.get('table') || urlParams?.get('t') || '';

  const [orderType, setOrderType] = useState(initialTable ? 'dine_in' : 'delivery');
  const [tableNumber, setTableNumber] = useState(initialTable);
  const [placedSuccessOrder, setPlacedSuccessOrder] = useState(null);

  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
  });

  const [deliveryLocation, setDeliveryLocation] = useState({
    latitude: null,
    longitude: null,
    accuracy: null,
    formattedAddress: '',
    houseFlat: '',
    areaLandmark: '',
    deliveryNote: '',
  });

  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');
  const [honeypot, setHoneypot] = useState(''); // Bot trap
  const [idempotencyKey] = useState(() => `idemp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);

  const [isLocating, setIsLocating] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Calculate pricing
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const isFreeDelivery = restaurant?.delivery_mode === 'free';
  const isHiddenDelivery = restaurant?.delivery_mode === 'none';
  const rawDeliveryFee = (isFreeDelivery || isHiddenDelivery) ? 0 : (Number(restaurant?.delivery_fee) || 0);

  // Delivery fee only applies to delivery orders
  const deliveryFee = orderType === 'delivery' ? rawDeliveryFee : 0;
  const finalTotal = subtotal + deliveryFee;

  const isKitchenOpen = restaurant?.is_open !== false;
  const checkMinOrder = restaurant?.show_min_order !== false;
  const minOrder = checkMinOrder ? (Number(restaurant?.min_order_amount) || 0) : 0;
  const meetsMinOrder = orderType !== 'delivery' || !checkMinOrder || minOrder === 0 || subtotal >= minOrder;

  // Phone validation status
  const phoneValidation = customer.phone ? validatePakistaniPhone(customer.phone) : null;

  // Geolocation quick filler
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const coordsStr = `GPS Pin: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} (maps.google.com/?q=${latitude},${longitude})`;
        setCustomer((prev) => ({
          ...prev,
          address: prev.address ? `${prev.address.trim()}\n[${coordsStr}]` : coordsStr,
        }));
        setIsLocating(false);
        setLocationSuccess(true);
        setTimeout(() => setLocationSuccess(false), 4000);
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        alert('Could not retrieve location. Please type your address manually.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Honeypot bot protection
    if (honeypot) {
      console.warn('Bot submission blocked.');
      return;
    }

    if (orderType !== 'dine_in' && !customer.name.trim()) {
      setFormError('Please enter your full name.');
      return;
    }

    if (orderType !== 'dine_in') {
      if (!phoneValidation || !phoneValidation.isValid) {
        setFormError(phoneValidation?.error || 'Please enter a valid Pakistani phone number (e.g. 0300 1234567).');
        return;
      }
    } else {
      if (customer.phone?.trim() && phoneValidation && !phoneValidation.isValid) {
        setFormError(phoneValidation?.error || 'Please enter a valid Pakistani phone number or leave blank.');
        return;
      }
    }

    if (orderType === 'dine_in' && !tableNumber.trim()) {
      setFormError('Please enter your table number.');
      return;
    }

    if (orderType === 'delivery' && !deliveryLocation.formattedAddress.trim()) {
      setFormError('Please enter your full delivery address.');
      return;
    }

    if (!isKitchenOpen) {
      setFormError('Kitchen is currently paused for direct orders.');
      return;
    }

    if (!meetsMinOrder) {
      setFormError(`Minimum order amount for delivery is Rs. ${minOrder}. Please add Rs. ${minOrder - subtotal} more.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await handleDirectOrderCheckout({
        cart,
        restaurant,
        customerDetails: {
          ...customer,
          name: customer.name.trim() || (orderType === 'dine_in' ? `Table ${tableNumber}` : 'Guest Customer'),
          address: orderType === 'delivery' ? deliveryLocation.formattedAddress.trim() : customer.address,
          phone: phoneValidation?.normalized || customer.phone?.trim() || '',
          orderType,
          tableNumber: orderType === 'dine_in' ? tableNumber : null,
          paymentMethod,
          honeypot,
          idempotencyKey,
          // Delivery Geolocation and Structured Address
          latitude: orderType === 'delivery' ? deliveryLocation.latitude : null,
          longitude: orderType === 'delivery' ? deliveryLocation.longitude : null,
          accuracy: orderType === 'delivery' ? deliveryLocation.accuracy : null,
          houseFlat: orderType === 'delivery' ? deliveryLocation.houseFlat : null,
          areaLandmark: orderType === 'delivery' ? deliveryLocation.areaLandmark : null,
          deliveryNotes: orderType === 'delivery' ? (deliveryLocation.deliveryNote || customer.notes) : customer.notes,
        },
      });

      if (result.success) {
        setPlacedSuccessOrder(result.order);
        if (onOrderPlaced) {
          onOrderPlaced(result.order);
        }
        // Automatically refresh this page with the order tracking parameter preserved
        setTimeout(() => {
          try {
            const url = new URL(window.location.href);
            url.searchParams.set('order', result.order.id);
            window.location.href = url.toString();
          } catch {
            window.location.reload();
          }
        }, 1100);
      }
    } catch (err) {
      setFormError(err.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (placedSuccessOrder) {
    return (
      <div className="p-8 text-center space-y-4 bg-gradient-to-b from-emerald-50 via-white to-white rounded-3xl border border-emerald-200 shadow-sm animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
          <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
        </div>
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 font-bold bg-emerald-100/60 px-2.5 py-1 rounded-full border border-emerald-200">
            Order Confirmed
          </span>
          <h3 className="text-xl font-heading font-extrabold text-[#2B2118] mt-2">
            Order #{placedSuccessOrder.id} Placed!
          </h3>
          <p className="text-xs text-[#7A6A5C] mt-1 max-w-sm mx-auto">
            Your dishes have been transmitted directly to the kitchen.
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-emerald-100/50 border border-emerald-200 max-w-xs mx-auto flex items-center justify-center gap-2 text-xs text-emerald-800 font-semibold">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
          <span>Refreshing page & opening tracker...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top back button */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-[#7A6A5C] hover:text-[#2B2118] transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Cart items</span>
        </button>
      )}

      {/* Kitchen Paused Alert */}
      {!isKitchenOpen && (
        <div className="p-3.5 rounded-2xl bg-[#FDECEC] border border-[#F9C3C5] text-[#E5484D] text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#E5484D] shrink-0" />
          <span>This kitchen is temporarily paused. Orders cannot be submitted right now.</span>
        </div>
      )}

      {/* Minimum Order Warning */}
      {!meetsMinOrder && isKitchenOpen && orderType === 'delivery' && (
        <div className="p-3.5 rounded-2xl bg-[#FEF3D9] border border-[#FCE1A8] text-[#B87000] text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#F5A623] shrink-0" />
          <span>
            Minimum order for delivery is <strong>{formatPKR(minOrder)}</strong>. Add{' '}
            <strong>{formatPKR(minOrder - subtotal)}</strong> more to proceed.
          </span>
        </div>
      )}

      {/* Error Banner */}
      {formError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Dining / Order Type Selector */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider">
          Dining Preference *
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setOrderType('delivery')}
            className={`py-2.5 px-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
              orderType === 'delivery'
                ? 'border-[#F26B1D] bg-[#FFF1E6] text-[#2B2118] ring-1 ring-[#F26B1D] font-extrabold shadow-2xs'
                : 'border-[#F0E4D7] bg-white text-[#7A6A5C] hover:border-[#FCD8BF]'
            }`}
          >
            <Truck className="w-4 h-4 text-[#F26B1D]" />
            <span className="text-xs">Delivery</span>
          </button>

          <button
            type="button"
            onClick={() => setOrderType('pickup')}
            className={`py-2.5 px-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
              orderType === 'pickup'
                ? 'border-[#F26B1D] bg-[#FFF1E6] text-[#2B2118] ring-1 ring-[#F26B1D] font-extrabold shadow-2xs'
                : 'border-[#F0E4D7] bg-white text-[#7A6A5C] hover:border-[#FCD8BF]'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-blue-600" />
            <span className="text-xs">Takeaway</span>
          </button>

          <button
            type="button"
            onClick={() => setOrderType('dine_in')}
            className={`py-2.5 px-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
              orderType === 'dine_in'
                ? 'border-[#F26B1D] bg-[#FFF1E6] text-[#2B2118] ring-1 ring-[#F26B1D] font-extrabold shadow-2xs'
                : 'border-[#F0E4D7] bg-white text-[#7A6A5C] hover:border-[#FCD8BF]'
            }`}
          >
            <Utensils className="w-4 h-4 text-[#1F9D55]" />
            <span className="text-xs">Dine-In</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Hidden Honeypot Field for Bot Spam Prevention */}
        <div style={{ display: 'none', opacity: 0, position: 'absolute', left: '-9999px' }} aria-hidden="true">
          <input
            type="text"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {/* Customer Name */}
        <div>
          <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider mb-1">
            Your Name {orderType === 'dine_in' ? '(Optional)' : '*'}
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-[#9E8E81] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              required={orderType !== 'dine_in'}
              placeholder={orderType === 'dine_in' ? `Table ${tableNumber || 'Guest'}` : 'e.g. Ali Ahmed'}
              value={customer.name}
              onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-[#2B2118] text-xs focus:outline-none focus:border-[#F26B1D] focus:bg-white transition"
            />
          </div>
        </div>

        {/* Phone Number with Pakistani Validation */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider">
              Phone Number {orderType === 'dine_in' ? '(Optional)' : '*'}
            </label>
            {phoneValidation && (
              <span
                className={`text-[10px] font-bold ${
                  phoneValidation.isValid ? 'text-[#1F9D55]' : 'text-amber-600'
                }`}
              >
                {phoneValidation.isValid ? `✓ ${phoneValidation.display}` : 'Pakistani Format (03XX)'}
              </span>
            )}
          </div>
          <div className="relative">
            <Phone className="w-4 h-4 text-[#9E8E81] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="tel"
              required={orderType !== 'dine_in'}
              placeholder={orderType === 'dine_in' ? '0300 1234567 (Optional)' : '0300 1234567'}
              value={customer.phone}
              onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#FFF9F2] border text-[#2B2118] text-xs font-mono focus:outline-none focus:bg-white transition ${
                customer.phone && !phoneValidation?.isValid
                  ? 'border-amber-400 focus:border-amber-500'
                  : 'border-[#F0E4D7] focus:border-[#F26B1D]'
              }`}
            />
          </div>
        </div>

        {/* Dine-in Table Number Field */}
        {orderType === 'dine_in' && (
          <div>
            <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider mb-1">
              Table Number *
            </label>
            <div className="relative">
              <Utensils className="w-4 h-4 text-[#9E8E81] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                placeholder="e.g. 5 or T-12"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-[#2B2118] text-xs font-bold focus:outline-none focus:border-[#F26B1D] focus:bg-white transition"
              />
            </div>
            <p className="text-[11px] text-[#7A6A5C] mt-1">
              {initialTable
                ? `✓ Table #${initialTable} auto-filled from your QR code scan.`
                : 'Enter the table number shown on your table stand.'}
            </p>
          </div>
        )}

        {/* Pickup Notice */}
        {orderType === 'pickup' && (
          <div className="p-3 rounded-xl bg-[#FFF1E6] border border-[#FCD8BF] text-xs text-[#7A6A5C]">
            <p className="font-bold text-[#2B2118]">🛍️ Self Pick-Up at Restaurant Counter</p>
            <p className="mt-0.5 text-[11px]">
              Your order will be freshly prepared. Collect it directly at the kitchen counter when ready.
            </p>
          </div>
        )}

        {/* Delivery Location & Structured Address */}
        {orderType === 'delivery' && (
          <DeliveryLocationPicker
            locationData={deliveryLocation}
            onChange={setDeliveryLocation}
            primaryColor={primaryColor}
            restaurant={restaurant}
          />
        )}

        {/* Special Instructions (Kitchen Notes) */}
        <div>
          <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider mb-1">
            Notes for Kitchen (Optional)
          </label>
          <div className="relative">
            <FileText className="w-4 h-4 text-[#9E8E81] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="e.g. Extra sauce, no onions, call on arrival"
              value={customer.notes}
              onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-[#2B2118] text-xs focus:outline-none focus:border-[#F26B1D] focus:bg-white transition"
            />
          </div>
        </div>

        {/* Payment Method Selector */}
        <div>
          <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider mb-1.5">
            Payment Method
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <label
              className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition ${
                paymentMethod === 'Cash on Delivery' || paymentMethod === 'Pay at Counter'
                  ? 'bg-[#FFF1E6] border-[#F26B1D] ring-1 ring-[#F26B1D] font-bold text-[#2B2118]'
                  : 'bg-white border-[#F0E4D7] text-[#7A6A5C] hover:border-[#FCD8BF]'
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={orderType === 'delivery' ? 'Cash on Delivery' : 'Pay at Counter'}
                checked={paymentMethod === 'Cash on Delivery' || paymentMethod === 'Pay at Counter'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-3.5 h-3.5 text-[#F26B1D] focus:ring-[#F26B1D]"
              />
              <Banknote className="w-4 h-4 text-[#1F9D55] shrink-0" />
              <span>{orderType === 'delivery' ? 'Cash on Delivery' : 'Pay at Counter'}</span>
            </label>

            {/* Optional JazzCash / Easypaisa */}
            {restaurant?.jazzcash_number && (
              <label
                className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition ${
                  paymentMethod === 'JazzCash'
                    ? 'bg-[#FFF1E6] border-[#F26B1D] ring-1 ring-[#F26B1D] font-bold text-[#2B2118]'
                    : 'bg-white border-[#F0E4D7] text-[#7A6A5C] hover:border-[#FCD8BF]'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="JazzCash"
                  checked={paymentMethod === 'JazzCash'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-3.5 h-3.5 text-[#F26B1D] focus:ring-[#F26B1D]"
                />
                <CreditCard className="w-4 h-4 text-rose-600 shrink-0" />
                <span>JazzCash</span>
              </label>
            )}
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="pt-2 border-t border-[#F0E4D7] space-y-1.5 text-xs text-[#7A6A5C]">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-mono font-bold text-[#2B2118]">{formatPKR(subtotal)}</span>
          </div>

          {orderType === 'delivery' && restaurant?.delivery_mode !== 'none' && (
            <div className="flex justify-between text-[#7A6A5C]">
              <span className="flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-[#9E8E81]" />
                <span>Delivery</span>
              </span>
              <span className="font-mono font-semibold">
                {isFreeDelivery ? 'Free' : formatPKR(deliveryFee)}
              </span>
            </div>
          )}

          <div className="flex justify-between pt-2 border-t border-[#F0E4D7] text-sm font-extrabold text-[#2B2118]">
            <span>Total Payable</span>
            <span className="font-mono text-base" style={{ color: primaryColor }}>
              {formatPKR(finalTotal)}
            </span>
          </div>
        </div>

        {/* Direct In-App Submit Order Button */}
        <button
          type="submit"
          disabled={isSubmitting || !isKitchenOpen || !meetsMinOrder}
          style={{ backgroundColor: primaryColor }}
          className="w-full py-3.5 px-4 rounded-xl text-white font-extrabold text-sm active:scale-[0.99] transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-95"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Placing your order directly...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>
                {!isKitchenOpen
                  ? 'Kitchen Paused'
                  : !meetsMinOrder
                  ? `Min Order: ${formatPKR(minOrder)}`
                  : `Place Order • ${formatPKR(finalTotal)}`}
              </span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
