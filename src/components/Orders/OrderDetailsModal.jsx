import React, { Suspense, lazy, useState } from 'react';
import {
  X,
  Phone,
  MapPin,
  Clock,
  User,
  Truck,
  ChefHat,
  CheckCircle2,
  Navigation,
  ExternalLink,
  Bike,
  FileText,
  } from 'lucide-react';
import { formatPKR, computeOrderPaymentState } from '../../utils/currencyUtils';
import { format12HourTime } from '../../utils/dateUtils';
import { buildGoogleMapsNavUrl, buildOsmNavUrl } from '../../config/mapConfig';
import SendToRiderMenu from './SendToRiderMenu';
import { TEMPLATE_TYPES } from '../../services/printer/printerTypes';
import { orderService } from '../../services/orderService';

const LeafletMap = lazy(() => import('../Map/LeafletMap.jsx'));

export default function OrderDetailsModal({
  order,
  isOpen,
  onClose,
  restaurant,
  onUpdateStatus,
  onPrintTicket,
  currentUser: _currentUser,
  onOrderUpdated,
}) {
  const [activeOrder, setActiveOrder] = useState(order);

  // Sync activeOrder if order prop changes
  React.useEffect(() => {
    setActiveOrder(order);
  }, [order]);

  if (!isOpen || !activeOrder) return null;

  const currentOrder = activeOrder;
  const _paymentState = computeOrderPaymentState(currentOrder);
  const dateInfo = format12HourTime(currentOrder.created_at);
  const isDelivery = currentOrder.order_type === 'delivery';
  const lat = currentOrder.latitude || currentOrder.location_coords?.lat;
  const lng = currentOrder.longitude || currentOrder.location_coords?.lng;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#F0E4D7] bg-[#FFF9F2] flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-extrabold text-[#2B2118] text-lg">
                Order #{currentOrder.id}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                  currentOrder.status === 'new'
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : currentOrder.status === 'preparing'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : currentOrder.status === 'out_for_delivery' || currentOrder.status === 'ready'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {currentOrder.status === 'new'
                  ? 'New Order'
                  : currentOrder.status === 'preparing'
                  ? 'Preparing in Kitchen'
                  : currentOrder.status === 'out_for_delivery'
                  ? 'Out for Delivery'
                  : currentOrder.status === 'ready'
                  ? 'Ready for Counter Pickup'
                  : currentOrder.status === 'completed'
                  ? 'Completed'
                  : 'Cancelled'}
              </span>

              {isDelivery ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-extrabold border border-amber-200">
                  🛵 Delivery
                </span>
              ) : currentOrder.order_type === 'dine_in' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 text-xs font-extrabold border border-purple-200">
                  🍽️ Dine-In {(currentOrder.table_number || currentOrder.table) ? `• Table ${currentOrder.table_number || currentOrder.table}` : ''}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 text-xs font-extrabold border border-blue-200">
                  🛍️ Takeaway / Pickup
                </span>
              )}
            </div>

            <p className="text-xs text-[#7A6A5C] flex items-center gap-1.5 mt-1">
              <Clock className="w-3.5 h-3.5 text-[#9E8E81]" />
              <span>Placed at {dateInfo.timeOnly}, {dateInfo.dateOnly}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Delivery Order: Send to Rider Button in Order Details */}
            {isDelivery && (
              <SendToRiderMenu
                order={currentOrder}
                restaurant={restaurant}
                buttonSize="default"
                onRiderAssigned={(_ordId, rider) => {
                  const nextAssigned = rider
                    ? {
                        id: rider.id,
                        name: rider.name,
                        phone: rider.phone,
                        assigned_at: new Date().toISOString(),
                      }
                    : null;
                  const nextOrder = { ...currentOrder, assigned_rider: nextAssigned };
                  setActiveOrder(nextOrder);
                  if (onOrderUpdated) onOrderUpdated(nextOrder);
                }}
              />
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Interactive 4-Stage Kitchen Progress Manager */}
          {currentOrder.status !== 'cancelled' && onUpdateStatus && (
            <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#7A6A5C]">
                  Kitchen Progress
                </span>
                <span className="text-[11px] font-bold text-[#F26B1D]">
                  Click any stage to update customer live tracker
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {/* Stage 1: Received */}
                <div className="flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-extrabold select-none">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mb-1" />
                  <span>Received</span>
                </div>

                {/* Stage 2: Cooking */}
                <button
                  type="button"
                  onClick={() => {
                    onUpdateStatus(currentOrder.id, 'preparing');
                    const nextOrder = { ...currentOrder, status: 'preparing' };
                    setActiveOrder(nextOrder);
                    if (onOrderUpdated) onOrderUpdated(nextOrder);
                  }}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl border text-xs font-extrabold transition cursor-pointer ${
                    currentOrder.status === 'preparing'
                      ? 'bg-[#F26B1D] border-[#F26B1D] text-white shadow-md shadow-orange-500/20'
                      : currentOrder.status === 'out_for_delivery' || currentOrder.status === 'ready' || currentOrder.status === 'completed'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-[#FFF1E6] hover:border-[#F26B1D] hover:text-[#F26B1D]'
                      : 'bg-white border-[#F0E4D7] text-[#7A6A5C] hover:border-[#F26B1D] hover:text-[#2B2118]'
                  }`}
                >
                  <ChefHat className="w-5 h-5 mb-1" />
                  <span>Cooking</span>
                </button>

                {/* Stage 3: Ready / Dispatch */}
                <button
                  type="button"
                  onClick={() => {
                    const nextStatus = isDelivery ? 'out_for_delivery' : 'ready';
                    onUpdateStatus(currentOrder.id, nextStatus);
                    const nextOrder = { ...currentOrder, status: nextStatus };
                    setActiveOrder(nextOrder);
                    if (onOrderUpdated) onOrderUpdated(nextOrder);
                  }}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl border text-xs font-extrabold transition cursor-pointer ${
                    currentOrder.status === 'out_for_delivery' || currentOrder.status === 'ready'
                      ? 'bg-[#F26B1D] border-[#F26B1D] text-white shadow-md shadow-orange-500/20'
                      : currentOrder.status === 'completed'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-[#FFF1E6] hover:border-[#F26B1D] hover:text-[#F26B1D]'
                      : 'bg-white border-[#F0E4D7] text-[#7A6A5C] hover:border-[#F26B1D] hover:text-[#2B2118]'
                  }`}
                >
                  <Truck className="w-5 h-5 mb-1" />
                  <span>Ready / Dispatch</span>
                </button>

                {/* Stage 4: Completed */}
                <button
                  type="button"
                  onClick={() => {
                    onUpdateStatus(currentOrder.id, 'completed');
                    const nextOrder = { ...currentOrder, status: 'completed', payment_status: 'paid', explicit_paid: true };
                    setActiveOrder(nextOrder);
                    if (onOrderUpdated) onOrderUpdated(nextOrder);
                    onClose();
                  }}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl border text-xs font-extrabold transition cursor-pointer ${
                    currentOrder.status === 'completed'
                      ? 'bg-[#1F9D55] border-[#1F9D55] text-white shadow-md shadow-emerald-500/20'
                      : 'bg-white border-[#F0E4D7] text-[#7A6A5C] hover:bg-emerald-600 hover:border-emerald-600 hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 mb-1" />
                  <span>Completed</span>
                </button>
              </div>
            </div>
          )}
          {/* Assigned Rider Banner (if assigned) */}
          {currentOrder.assigned_rider && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Bike className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Assigned Delivery Rider
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-emerald-950">
                    {currentOrder.assigned_rider.name}
                  </div>
                </div>
              </div>

              {currentOrder.assigned_rider.phone && (
                <a
                  href={`tel:${currentOrder.assigned_rider.phone}`}
                  className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Call Rider</span>
                </a>
              )}
            </div>
          )}

          {/* Customer & Address Details */}
          <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#F26B1D]" />
                <span className="font-bold text-sm text-[#2B2118]">
                  {currentOrder.customer_name || 'Walk-in Guest'}
                </span>
              </div>

              {currentOrder.customer_phone && (
                <a
                  href={`tel:+${currentOrder.customer_phone.replace(/\D/g, '')}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-[#F0E4D7] text-emerald-700 font-mono text-xs font-bold hover:bg-emerald-50 transition"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>+{currentOrder.customer_phone}</span>
                </a>
              )}
            </div>

            {/* Address */}
            {currentOrder.customer_address && (
              <div className="pt-2 border-t border-[#F0E4D7]/70 space-y-1">
                <div className="flex items-start gap-1.5 text-xs text-[#2B2118]">
                  <MapPin className="w-4 h-4 text-[#F26B1D] shrink-0 mt-0.5" />
                  <div className="space-y-0.5 flex-1">
                    <p className="font-semibold leading-relaxed">
                      {currentOrder.customer_address}
                    </p>
                    {(currentOrder.house_flat || currentOrder.area_landmark) && (
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-[#7A6A5C] pt-0.5">
                        {currentOrder.house_flat && (
                          <span className="bg-white px-2 py-0.5 rounded border border-[#F0E4D7]">
                            House/Flat: {currentOrder.house_flat}
                          </span>
                        )}
                        {currentOrder.area_landmark && (
                          <span className="bg-white px-2 py-0.5 rounded border border-[#F0E4D7]">
                            Landmark: {currentOrder.area_landmark}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Navigation Links */}
                {isDelivery && (
                  <div className="flex items-center gap-2 pt-2">
                    <a
                      href={buildGoogleMapsNavUrl(currentOrder)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-[#F26B1D] text-[#F26B1D] text-xs font-bold hover:bg-[#FFF1E6] transition shadow-2xs"
                    >
                      <Navigation className="w-3.5 h-3.5 text-[#F26B1D]" />
                      <span>Google / Apple Maps</span>
                      <ExternalLink className="w-3 h-3 opacity-70" />
                    </a>

                    {lat && lng && (
                      <a
                        href={buildOsmNavUrl(lat, lng, 18)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-[#7A6A5C] text-[#2B2118] text-xs font-bold hover:bg-slate-50 transition shadow-2xs"
                      >
                        <span>OpenStreetMap</span>
                        <ExternalLink className="w-3 h-3 opacity-70" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Delivery Note */}
            {(currentOrder.delivery_notes || currentOrder.customer_notes) && (
              <div className="p-2.5 rounded-xl bg-[#FEF3D9] border border-[#FCE1A8] text-xs text-[#2B2118]">
                <strong className="text-[#F5A623]">Delivery / Kitchen Note: </strong>
                <span>{currentOrder.delivery_notes || currentOrder.customer_notes}</span>
              </div>
            )}
          </div>

          {/* Embedded Map (for Delivery Orders with pin) */}
          {isDelivery && lat && lng && (
            <div className="rounded-2xl border border-[#F0E4D7] overflow-hidden bg-slate-100 shadow-2xs">
              <div className="px-3.5 py-1.5 bg-[#FFF9F2] border-b border-[#F0E4D7] flex items-center justify-between text-xs font-mono font-bold">
                <span className="flex items-center gap-1 text-[#2B2118]">
                  <MapPin className="w-3.5 h-3.5 text-[#F26B1D]" />
                  <span>Pin: {Number(lat).toFixed(6)}, {Number(lng).toFixed(6)}</span>
                </span>
                {currentOrder.accuracy && (
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Accuracy: ±{Math.round(currentOrder.accuracy)}m
                  </span>
                )}
              </div>
              <div className="relative w-full h-44">
                <Suspense
                  fallback={
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                      Loading Map...
                    </div>
                  }
                >
                  <LeafletMap
                    center={{ lat: Number(lat), lng: Number(lng) }}
                    zoom={16}
                    draggable={false}
                    interactive={true}
                    height="176px"
                    popupText={currentOrder.customer_address}
                  />
                </Suspense>
              </div>
            </div>
          )}

          {/* Items Summary */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-[#7A6A5C] uppercase tracking-wider">
              Ordered Items ({currentOrder.items?.length || 0})
            </h4>
            <div className="divide-y divide-slate-100 rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden">
              {(currentOrder.items || []).map((item, idx) => (
                <div key={idx} className="p-3 flex items-start justify-between gap-3 bg-white">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs bg-[#FFF1E6] text-[#F26B1D] px-2 py-0.5 rounded-md font-mono">
                        {item.quantity}x
                      </span>
                      <span className="font-bold text-xs text-[#2B2118]">
                        {item.title}
                      </span>
                      {item.dealBadge && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                          {item.dealBadge}
                        </span>
                      )}
                    </div>
                    {item.choices && item.choices.length > 0 && (
                      <p className="text-[11px] text-[#7A6A5C] pl-8 pt-0.5">
                        {item.choices.join(' • ')}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-[10px] text-amber-800 pl-8 pt-0.5 italic">
                        Note: {item.notes}
                      </p>
                    )}
                  </div>
                  <div className="font-mono font-bold text-xs text-[#2B2118]">
                    {formatPKR(item.unitPrice * item.quantity)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment & Financial Section */}
          <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-xs text-[#2B2118] uppercase tracking-wider">
                  Payment Status
                </span>
                {currentOrder.payment_status === 'paid' && (currentOrder.explicit_paid || currentOrder.status === 'completed') ? (
                  <>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Paid in Full</span>
                    </span>
                    {currentOrder.status !== 'completed' && restaurant?.id && (
                      <button
                        type="button"
                        onClick={() => {
                          orderService.updateOrderPaymentStatus(restaurant.id, currentOrder.id, false);
                          const nextOrder = { ...currentOrder, payment_status: 'unpaid', explicit_paid: false };
                          setActiveOrder(nextOrder);
                          if (onOrderUpdated) onOrderUpdated(nextOrder);
                        }}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white border border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-800 transition cursor-pointer"
                      >
                        Mark Unpaid
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      <span>Unpaid • Bill Pending</span>
                    </span>
                    {restaurant?.id && (
                      <button
                        type="button"
                        onClick={() => {
                          orderService.updateOrderPaymentStatus(restaurant.id, currentOrder.id, true);
                          const nextOrder = { ...currentOrder, payment_status: 'paid', explicit_paid: true };
                          setActiveOrder(nextOrder);
                          if (onOrderUpdated) onOrderUpdated(nextOrder);
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer shadow-2xs"
                      >
                        ✓ Mark Paid
                      </button>
                    )}
                  </>
                )}
              </div>

              <div className="text-right">
                <span className="text-[10px] text-[#7A6A5C] font-semibold block uppercase">Total Amount</span>
                <span className="font-mono text-base font-black text-emerald-800">
                  {formatPKR(currentOrder.total_payable || 0)}
                </span>
              </div>
            </div>

            {/* Subtotal & Delivery details */}
            <div className="pt-2 border-t border-[#F0E4D7]/70 space-y-1 text-[11px] text-[#7A6A5C]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-mono font-medium">{formatPKR(currentOrder.subtotal || 0)}</span>
              </div>
              {currentOrder.delivery_fee > 0 && (
                <div className="flex justify-between">
                  <span>Delivery Fee:</span>
                  <span className="font-mono font-medium">{formatPKR(currentOrder.delivery_fee)}</span>
                </div>
              )}
              <div className="flex justify-between pt-0.5">
                <span>Payment Method:</span>
                <span className="font-bold uppercase text-[#2B2118]">
                  {currentOrder.payment_method || 'Cash on Delivery'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 border-t border-[#F0E4D7] bg-[#FFF9F2] flex items-center justify-between gap-2 flex-wrap">
          {/* Quick Print actions */}
          <div className="flex items-center gap-1.5">
            {onPrintTicket && (
              <>
                <button
                  type="button"
                  onClick={() => onPrintTicket(currentOrder, TEMPLATE_TYPES.KOT)}
                  className="px-2.5 py-1.5 rounded-xl bg-white border border-[#F0E4D7] text-[#2B2118] text-xs font-bold hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
                >
                  <ChefHat className="w-3.5 h-3.5 text-amber-500" />
                  <span>KOT</span>
                </button>
                <button
                  type="button"
                  onClick={() => onPrintTicket(currentOrder, TEMPLATE_TYPES.BILL)}
                  className="px-2.5 py-1.5 rounded-xl bg-white border border-[#F0E4D7] text-[#2B2118] text-xs font-bold hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <span>Bill</span>
                </button>
                {isDelivery && (
                  <button
                    type="button"
                    onClick={() => onPrintTicket(currentOrder, TEMPLATE_TYPES.DELIVERY)}
                    className="px-2.5 py-1.5 rounded-xl bg-white border border-[#F0E4D7] text-[#2B2118] text-xs font-bold hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Truck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Slip</span>
                  </button>
                )}
              </>
            )}
          </div>

          {/* Workflow Action Button */}
          <div className="flex items-center gap-2">
            {currentOrder.status === 'new' && onUpdateStatus && (
              <button
                type="button"
                onClick={() => {
                  onUpdateStatus(currentOrder.id, 'preparing');
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-[#F26B1D] text-white font-bold text-xs hover:bg-[#D95A12] transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-orange-500/20"
              >
                <ChefHat className="w-4 h-4" />
                <span>Accept & Prepare</span>
              </button>
            )}
            {currentOrder.status === 'preparing' && onUpdateStatus && (
              <button
                type="button"
                onClick={() => {
                  onUpdateStatus(currentOrder.id, isDelivery ? 'out_for_delivery' : 'ready');
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-[#F5A623] text-white font-bold text-xs hover:bg-[#D98E16] transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
              >
                <Truck className="w-4 h-4" />
                <span>{isDelivery ? 'Dispatch for Delivery' : 'Mark Ready'}</span>
              </button>
            )}
            {(currentOrder.status === 'out_for_delivery' || currentOrder.status === 'ready') && onUpdateStatus && (
              <button
                type="button"
                onClick={() => {
                  onUpdateStatus(currentOrder.id, 'completed');
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-[#1F9D55] text-white font-bold text-xs hover:bg-[#188044] transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-green-500/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isDelivery ? 'Mark Delivered' : 'Complete Order'}</span>
              </button>
            )}
          </div>
        </div>
      </div>


    </div>
  );
}
