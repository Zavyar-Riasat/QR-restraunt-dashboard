import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Bike,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  Navigation,
  ExternalLink,
  AlertCircle,
  FileText,
  DollarSign,
  Package,
  ShieldCheck,
  Check,
  Store,
  ChevronDown,
} from 'lucide-react';
import { orderService } from '../services/orderService';
import {
  formatPKR,
  computeOrderPaymentState,
  normalizePhone,
  formatPhone,
} from '../utils/currencyUtils';
import { format12HourTime } from '../utils/dateUtils';
import { buildGoogleMapsNavUrl, buildOsmNavUrl } from '../config/mapConfig';
import { restaurantService } from '../services/restaurantService';

import LeafletMap from '../components/Map/LeafletMap.jsx';

export default function RiderDeliveryPage() {
  const { token } = useParams();
  const [orderData, setOrderData] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const loadOrder = async () => {
    if (!token) return;
    try {
      const res = await orderService.getOrderByRiderToken(token);
      if (res?.order) {
        setOrderData(res);
        const rest = restaurantService.getRestaurant(res.restaurantId || res.order.restaurant_id || 'rest-101');
        setRestaurant(rest);
      } else {
        setOrderData(null);
      }
    } catch (err) {
      console.warn('Error loading rider order:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();

    // Listen to real-time status updates broadcasted across tabs/windows
    const handleStatusUpdated = () => {
      loadOrder();
    };

    window.addEventListener('dinehq_order_status_updated', handleStatusUpdated);
    window.addEventListener('storage', handleStatusUpdated);

    return () => {
      window.removeEventListener('dinehq_order_status_updated', handleStatusUpdated);
      window.removeEventListener('storage', handleStatusUpdated);
    };
  }, [token]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Status update handlers (Picked Up, Delivered)
  const handleMarkPickedUp = async () => {
    try {
      setActionLoading(true);
      const updated = orderService.updateOrderByRiderToken(token, 'out_for_delivery');
      if (updated) {
        setOrderData((prev) => (prev ? { ...prev, order: updated } : prev));
        showToast('Status updated: Picked Up!');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkDelivered = async () => {
    try {
      setActionLoading(true);
      const updated = orderService.updateOrderByRiderToken(token, 'completed');
      if (updated) {
        setOrderData((prev) => (prev ? { ...prev, order: updated } : prev));
        showToast('Status updated: Delivered!');
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-3 border-[#F26B1D] border-t-transparent animate-spin mx-auto" />
          <p className="font-bold text-sm text-[#2B2118]">Opening Rider Delivery Link...</p>
        </div>
      </div>
    );
  }

  // Not Found State
  if (!orderData || !orderData.order) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-[#F0E4D7] shadow-xl p-8 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h1 className="font-heading font-extrabold text-xl text-[#2B2118]">
              Delivery Link Not Found
            </h1>
            <p className="text-xs text-[#7A6A5C] mt-1.5 leading-relaxed">
              This rider delivery token is invalid or has been removed. Please ask the restaurant manager to resend the delivery link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { order, isExpired, completedTime } = orderData;
  const isDelivered = order.status === 'completed' || order.status === 'delivered';
  const isOutForDelivery = order.status === 'out_for_delivery';
  const isPendingPickup = order.status === 'new' || order.status === 'preparing';

  // 24-Hour Expiration State
  if (isExpired) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-[#F0E4D7] shadow-xl p-8 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">
              Link Expired
            </span>
            <h1 className="font-heading font-extrabold text-xl text-[#2B2118] mt-2">
              Delivery Link Expired
            </h1>
            <p className="text-xs text-[#7A6A5C] mt-1.5 leading-relaxed">
              For customer privacy and security, rider links automatically expire 24 hours after completion.
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] text-xs font-mono text-[#7A6A5C]">
            Order #{order.id} • Completed {completedTime ? new Date(completedTime).toLocaleDateString() : ''}
          </div>
        </div>
      </div>
    );
  }

  const lat = order.latitude || order.location_coords?.lat;
  const lng = order.longitude || order.location_coords?.lng;
  const paymentState = computeOrderPaymentState(order);
  const remainingToCollect = paymentState.remainingBalance;
  const isFullyPaid = paymentState.paymentStatus === 'paid' || remainingToCollect <= 0;
  const isPartialPaid = paymentState.paymentStatus === 'partial' && remainingToCollect > 0;
  const cleanPhoneDigits = order.customer_phone
    ? normalizePhone(order.customer_phone) || order.customer_phone.replace(/\D/g, '')
    : '';
  const customerTelHref = cleanPhoneDigits.startsWith('92')
    ? `tel:+${cleanPhoneDigits}`
    : `tel:${cleanPhoneDigits}`;

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-[#2B2118] pb-12 font-sans selection:bg-[#F26B1D]/20">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[999] bg-[#2B2118] text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-[#1F9D55]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Mobile App Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#F0E4D7] px-4 py-3 shadow-2xs">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#F26B1D] text-white flex items-center justify-center shadow-md shadow-orange-500/20">
              <Bike className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-extrabold text-sm text-[#2B2118]">
                  {restaurant?.name || 'Dineflow Restaurant'}
                </span>
                <span className="text-[10px] font-bold text-[#F26B1D] bg-[#FFF1E6] px-1.5 py-0.2 rounded">
                  Rider
                </span>
              </div>
              <p className="text-[11px] font-mono text-[#7A6A5C]">
                Order #{order.id}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                isDelivered
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : isOutForDelivery
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              {isDelivered
                ? '✓ Delivered'
                : isOutForDelivery
                ? '🛵 On The Way'
                : '⏳ Ready for Pickup'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-xl mx-auto px-4 pt-4 space-y-4">
        {/* 1. Live Rider Status Action Buttons (Big Thumb-friendly Buttons) */}
        <section className="bg-white rounded-3xl p-4 sm:p-5 border border-[#F0E4D7] shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs text-[#7A6A5C]">
            <span className="font-bold uppercase tracking-wider text-[10px]">
              Delivery Live Status
            </span>
            {order.picked_up_at && (
              <span className="font-mono text-[11px]">
                Picked up at {format12HourTime(order.picked_up_at).timeOnly}
              </span>
            )}
          </div>

          {isPendingPickup && (
            <button
              type="button"
              id="rider-picked-up-btn"
              disabled={actionLoading}
              onClick={handleMarkPickedUp}
              className="w-full py-4 px-5 rounded-2xl bg-[#F26B1D] hover:bg-[#D95A12] active:scale-[0.98] text-white font-extrabold text-base transition flex items-center justify-center gap-2.5 shadow-lg shadow-orange-500/25 cursor-pointer disabled:opacity-50"
            >
              <Bike className="w-5 h-5 stroke-[2.5]" />
              <span>{actionLoading ? 'Updating...' : 'Picked Up — Start Delivery'}</span>
            </button>
          )}

          {isOutForDelivery && (
            <button
              type="button"
              id="rider-delivered-btn"
              disabled={actionLoading}
              onClick={handleMarkDelivered}
              className="w-full py-4 px-5 rounded-2xl bg-[#1F9D55] hover:bg-[#188044] active:scale-[0.98] text-white font-extrabold text-base transition flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/25 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
              <span>{actionLoading ? 'Updating...' : 'Delivered to Customer'}</span>
            </button>
          )}

          {isDelivered && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-1">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <h3 className="font-extrabold text-base text-emerald-950">
                Order Completed & Delivered
              </h3>
              <p className="text-xs text-emerald-800">
                Delivered at {format12HourTime(order.delivered_at || order.completed_at).timeOnly} • Great job!
              </p>
            </div>
          )}
        </section>

        {/* 2. Total to Collect (Rs.) & Payment Status (High-contrast for Rider) */}
        <section
          className={`rounded-3xl p-5 border text-center space-y-1.5 shadow-xs ${
            !isFullyPaid
              ? 'bg-gradient-to-br from-[#FFF9F2] to-[#FFF1E6] border-[#F26B1D]/40 text-[#2B2118]'
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#7A6A5C]">
            {!isFullyPaid
              ? isPartialPaid
                ? 'Remaining Balance to Collect from Customer'
                : 'Total to Collect from Customer'
              : 'Payment Status'}
          </span>

          <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-[#2B2118]">
            {!isFullyPaid ? (
              <span className="text-[#F26B1D]">{formatPKR(remainingToCollect)}</span>
            ) : (
              <span className="text-[#1F9D55]">Rs. 0 (Already Paid)</span>
            )}
          </div>

          <div className="pt-1 flex items-center justify-center gap-1.5">
            <span
              className={`px-3 py-0.5 rounded-full text-xs font-bold ${
                !isFullyPaid
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              }`}
            >
              {!isFullyPaid
                ? isPartialPaid
                  ? `Partial Payment (Rs. ${paymentState.amountPaid.toLocaleString()} paid) • Collect Rs. ${remainingToCollect.toLocaleString()}`
                  : 'Cash on Delivery • Collect Cash'
                : '✓ Paid Online / Paid at Store • Do Not Collect'}
            </span>
          </div>
        </section>

        {/* 3. Customer Contact & Tap-to-Call */}
        <section className="bg-white rounded-3xl p-5 border border-[#F0E4D7] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A6A5C]">
              Customer Contact
            </span>
            {order.customer_phone && (
              <span className="text-xs font-mono font-bold text-slate-700">
                {formatPhone(order.customer_phone)}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-heading font-extrabold text-[#2B2118]">
                {order.customer_name || 'Customer'}
              </h2>
              <p className="text-xs text-[#7A6A5C]">
                Recipient for delivery
              </p>
            </div>

            {order.customer_phone && (
              <a
                href={customerTelHref}
                id="rider-call-customer-btn"
                className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 transition cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>Call Customer</span>
              </a>
            )}
          </div>

          {/* Full Delivery Address & Landmark */}
          <div className="pt-3 border-t border-[#F0E4D7] space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#F26B1D] shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <p className="text-sm font-bold text-[#2B2118] leading-snug">
                  {order.customer_address || 'Customer Delivery Address'}
                </p>

                {(order.house_flat || order.area_landmark) && (
                  <div className="flex items-center gap-2 flex-wrap text-xs text-[#7A6A5C] pt-0.5">
                    {order.house_flat && (
                      <span className="bg-[#FFF9F2] px-2 py-0.5 rounded-md border border-[#F0E4D7] font-semibold text-[#2B2118]">
                        House/Flat: {order.house_flat}
                      </span>
                    )}
                    {order.area_landmark && (
                      <span className="bg-[#FFF9F2] px-2 py-0.5 rounded-md border border-[#F0E4D7] font-semibold text-[#2B2118]">
                        Landmark: {order.area_landmark}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Note */}
            {(order.delivery_notes || order.customer_notes) && (
              <div className="p-3 rounded-2xl bg-[#FEF3D9] border border-[#FCE1A8] text-xs text-[#2B2118] space-y-0.5">
                <div className="font-extrabold text-[#F5A623] uppercase text-[10px] tracking-wider">
                  Gate & Delivery Note:
                </div>
                <p className="font-medium leading-relaxed">
                  {order.delivery_notes || order.customer_notes}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* 4. Interactive Map with Pin & Big Plain Directions Buttons */}
        <section className="bg-white rounded-3xl p-5 border border-[#F0E4D7] shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-xs text-[#2B2118]">
              <MapPin className="w-4 h-4 text-[#F26B1D]" />
              <span>Doorstep Pin Location</span>
            </div>
            {order.accuracy && (
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                GPS Accuracy: ±{Math.round(order.accuracy)}m
              </span>
            )}
          </div>

          {/* Leaflet Map Preview (without "Leaflet" text, with compact "i" attribution icon) */}
          <div className="rounded-2xl border border-[#F0E4D7] overflow-hidden bg-slate-100 shadow-inner">
            <Suspense
              fallback={
                <div className="w-full h-56 flex items-center justify-center text-xs text-slate-400">
                  Loading OpenStreetMap...
                </div>
              }
            >
              <LeafletMap
                center={{
                  lat: Number(lat || 31.4187),
                  lng: Number(lng || 73.0791),
                }}
                zoom={17}
                draggable={false}
                interactive={true}
                height="220px"
                popupText={order.customer_address}
              />
            </Suspense>
          </div>

          {/* Big Plain Directions Buttons: Navigate & OSM */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <a
              href={buildGoogleMapsNavUrl(order)}
              target="_blank"
              rel="noopener noreferrer"
              id="rider-navigate-btn"
              className="py-3.5 px-4 rounded-2xl bg-[#F26B1D] hover:bg-[#D95A12] active:scale-[0.98] text-white font-extrabold text-sm transition flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 cursor-pointer"
            >
              <Navigation className="w-4 h-4 fill-white" />
              <span>Navigate (Google / Apple)</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>

            <a
              href={buildOsmNavUrl(lat, lng, 18)}
              target="_blank"
              rel="noopener noreferrer"
              id="rider-osm-btn"
              className="py-3.5 px-4 rounded-2xl bg-white border border-[#7A6A5C] hover:bg-[#FFF9F2] active:scale-[0.98] text-[#2B2118] font-extrabold text-sm transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
            >
              <span>Open in OpenStreetMap</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>
          </div>
        </section>

        {/* 5. Items Summary (Package Verification for Rider) */}
        <section className="bg-white rounded-3xl p-5 border border-[#F0E4D7] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A6A5C]">
              Package Checklist ({order.items?.length || 0} items)
            </span>
            <span className="text-[11px] font-mono text-[#7A6A5C]">
              Subtotal: {formatPKR(order.subtotal || 0)}
            </span>
          </div>

          <div className="divide-y divide-slate-100 rounded-2xl bg-[#FFFDF9] border border-[#F0E4D7] overflow-hidden">
            {(order.items || []).map((item, idx) => (
              <div key={idx} className="p-3 flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5">
                  <span className="font-mono font-bold text-xs bg-[#FFF1E6] text-[#F26B1D] px-2 py-0.5 rounded-lg shrink-0 mt-0.5">
                    {item.quantity}x
                  </span>
                  <div>
                    <p className="font-bold text-xs text-[#2B2118]">{item.title}</p>
                    {item.choices && item.choices.length > 0 && (
                      <p className="text-[11px] text-[#7A6A5C] pt-0.5">
                        {item.choices.join(' • ')}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-[10px] text-amber-800 italic pt-0.5">
                        Note: {item.notes}
                      </p>
                    )}
                  </div>
                </div>

                <span className="font-mono font-bold text-xs text-[#7A6A5C] shrink-0">
                  {formatPKR(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 flex items-center justify-between text-xs text-[#7A6A5C] px-1">
            <span>Delivery Fee: {formatPKR(order.delivery_fee || 0)}</span>
            <span className="font-extrabold text-sm text-[#2B2118] font-mono">
              Total: {formatPKR(order.total_payable)}
            </span>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center py-4 space-y-1 text-xs text-[#7A6A5C]">
          <p className="font-medium">
            Powered by <strong>Dineflow Rider Logistics</strong>
          </p>
          <p className="text-[10px] text-slate-400">
            Link auto-expires 24 hours after completion. Drive safely!
          </p>
        </footer>
      </main>
    </div>
  );
}
