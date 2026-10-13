import React, { useState } from 'react';
import {
  Bell,
  Clock,
  MapPin,
  Phone,
  User,
  CheckCircle2,
  AlertCircle,
  Truck,
  ChefHat,
  MessageCircle,
  Package,
  Search,
  Filter,
  Volume2,
  VolumeX,
  Printer,
  ExternalLink,
  X,
  XCircle,
} from 'lucide-react';
import { formatPKR } from '../utils/currencyUtils';
import { playKitchenChime } from '../services/orderService';

export default function OrdersFeed({
  orders = [],
  onUpdateStatus,
  restaurant,
  soundEnabled = true,
  onToggleSound,
  newOrderAlert,
}) {
  const [filter, setFilter] = useState('all'); // all, active, completed, cancelled
  const [search, setSearch] = useState('');
  const [printingOrder, setPrintingOrder] = useState(null);

  const filteredOrders = orders.filter((order) => {
    const matchesFilter =
      filter === 'all'
        ? true
        : filter === 'active'
        ? order.status === 'new' || order.status === 'preparing' || order.status === 'out_for_delivery'
        : order.status === filter;

    const query = search.toLowerCase();
    const matchesSearch =
      (order.id || '').toLowerCase().includes(query) ||
      (order.customer_name || '').toLowerCase().includes(query) ||
      (order.customer_phone || '').toLowerCase().includes(query) ||
      (order.customer_address || '').toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold animate-pulse">
            <Bell className="w-3.5 h-3.5 text-amber-600" />
            <span>New Order</span>
          </span>
        );
      case 'preparing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold">
            <ChefHat className="w-3.5 h-3.5 text-indigo-600" />
            <span>In Kitchen</span>
          </span>
        );
      case 'out_for_delivery':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-xs font-bold">
            <Truck className="w-3.5 h-3.5 text-sky-600" />
            <span>Out for Delivery</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Completed</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return null;
    }
  };

  const handleWhatsAppCustomer = (order) => {
    const cleanPhone = (order.customer_phone || '').replace(/\D/g, '');
    if (!cleanPhone) {
      alert('No customer phone number available.');
      return;
    }
    const storeName = restaurant?.name || 'Kitchen';
    const text = encodeURIComponent(
      `Hello ${order.customer_name}! 👋\nThis is ${storeName} regarding your order #${order.id}.\nYour order is currently ${order.status.replace(/_/g, ' ')}!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  return (
    <div className={`bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6 ${printingOrder ? 'print:p-0 print:border-none print:shadow-none print:bg-transparent print:space-y-0' : ''}`}>
      {/* Background Feed Content (Hidden when printing KOT modal) */}
      <div className={`space-y-6 ${printingOrder ? 'no-print' : ''}`}>
        {/* Live Order Incoming Alert Banner */}
      {newOrderAlert && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white font-bold text-xs flex items-center justify-between shadow-lg shadow-emerald-600/20 animate-bounce">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>{newOrderAlert}</span>
          </div>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md font-mono">Just Now</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-heading font-extrabold text-slate-900 tracking-tight">
                Live Kitchen Order Feed
              </h2>
              <p className="text-xs text-slate-500">
                Track incoming customer direct WhatsApp orders, print tickets, and dispatch deliveries.
              </p>
            </div>
          </div>
        </div>

        {/* Audio Controls, Search & Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Audio Chime Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleSound}
              className={`p-1.5 px-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                soundEnabled
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
              }`}
              title={soundEnabled ? 'Kitchen audio alert is ON (Click to mute)' : 'Kitchen audio alert is MUTED (Click to unmute)'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{soundEnabled ? 'Bell ON' : 'Bell Muted'}</span>
            </button>

            <button
              type="button"
              onClick={playKitchenChime}
              className="p-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition cursor-pointer hidden md:flex items-center gap-1"
              title="Test kitchen order chime"
            >
              <Bell className="w-3 h-3 text-amber-500" />
              <span>Test Bell</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order ID, name, phone..."
              className="pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                filter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({orders.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                filter === 'active' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active ({orders.filter((o) => o.status === 'new' || o.status === 'preparing' || o.status === 'out_for_delivery').length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                filter === 'completed' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Completed ({orders.filter((o) => o.status === 'completed').length})
            </button>
          </div>
        </div>
      </div>

      {/* Orders Grid / Cards */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
          <Package className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No orders match this filter</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            When customers place direct orders from your menu, they will appear here in real time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className={`p-5 rounded-2xl border transition shadow-xs flex flex-col justify-between ${
                order.status === 'new'
                  ? 'bg-amber-50/40 border-amber-300'
                  : order.status === 'preparing'
                  ? 'bg-indigo-50/30 border-indigo-200'
                  : 'bg-white border-slate-200/90'
              }`}
            >
              {/* Order Header */}
              <div>
                <div className="flex items-start justify-between pb-3 border-b border-slate-200/70 gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-slate-900 text-sm">
                        #{order.id}
                      </span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-800 mt-0.5 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{order.customer_name}</span>
                    </div>
                  </div>

                  <div>{getStatusBadge(order.status)}</div>
                </div>

                {/* Delivery Info */}
                <div className="py-2.5 space-y-1 text-xs text-slate-600 border-b border-slate-100">
                  {order.customer_phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono">+{order.customer_phone}</span>
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-1.5 flex-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="leading-snug">{order.customer_address}</span>
                    </div>
                    {order.customer_address && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customer_address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline shrink-0"
                        title="Open delivery location in Google Maps"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Maps</span>
                      </a>
                    )}
                  </div>
                  {order.customer_notes && (
                    <div className="p-2 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 text-[11px] font-medium mt-1">
                      <span className="font-bold">Note: </span>
                      <span>{order.customer_notes}</span>
                    </div>
                  )}
                </div>

                {/* Ordered Items */}
                <div className="py-3 space-y-2">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Ordered Dishes ({order.items?.length || 0})
                  </p>
                  <div className="space-y-1.5">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="text-xs bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>
                            {item.quantity}x {item.title}
                          </span>
                          <span className="font-mono">{formatPKR(item.unitPrice * item.quantity)}</span>
                        </div>
                        {item.dealItems && (
                          <div className="text-[11px] text-amber-700 font-medium mt-0.5">
                            📦 Bundle: {item.dealItems}
                          </div>
                        )}
                        {item.choices && item.choices.length > 0 && (
                          <div className="text-[10px] text-slate-500 mt-0.5 space-y-0.5">
                            {item.choices.map((c, cIdx) => (
                              <div key={cIdx} className="pl-2 border-l border-slate-300">
                                ↳ {c}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Order Footer & Actions */}
              <div className="pt-3 border-t border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="space-y-0.5 text-slate-500">
                    <div>Subtotal: <span className="font-mono text-slate-700">{formatPKR(order.subtotal)}</span></div>
                    {order.delivery_fee > 0 && (
                      <div>Delivery Fee: <span className="font-mono text-slate-700">{formatPKR(order.delivery_fee)}</span></div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Payable</span>
                    <span className="text-base font-extrabold text-slate-900 font-mono">
                      {formatPKR(order.total_payable)}
                    </span>
                  </div>
                </div>

                {/* Workflow Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {order.status === 'new' && (
                    <button
                      onClick={() => onUpdateStatus(order.id, 'preparing')}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ChefHat className="w-3.5 h-3.5" />
                      <span>Accept & Prepare</span>
                    </button>
                  )}

                  {order.status === 'preparing' && (
                    <button
                      onClick={() => onUpdateStatus(order.id, 'out_for_delivery')}
                      className="flex-1 py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Dispatch for Delivery</span>
                    </button>
                  )}

                  {order.status === 'out_for_delivery' && (
                    <button
                      onClick={() => onUpdateStatus(order.id, 'completed')}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Delivered</span>
                    </button>
                  )}

                  {/* Print Kitchen Order Ticket (KOT) */}
                  <button
                    onClick={() => setPrintingOrder(order)}
                    className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-200"
                    title="Print 80mm Kitchen Order Ticket (KOT)"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>Print KOT</span>
                  </button>

                  {/* Direct WhatsApp Messaging */}
                  <button
                    onClick={() => handleWhatsAppCustomer(order)}
                    className="py-2 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    title="Send WhatsApp update to customer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </button>

                  {/* Cancel / Reject Order (if active) */}
                  {(order.status === 'new' || order.status === 'preparing') && (
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to cancel order #${order.id}?`)) {
                          onUpdateStatus(order.id, 'cancelled');
                        }
                      }}
                      className="py-2 px-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                      title="Cancel order"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      {/* Thermal Kitchen Order Ticket (KOT) Modal */}
      {printingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 print:static print:bg-transparent print:p-0 print:backdrop-blur-none print:block print:m-0 print:inset-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 print:border-none print:shadow-none print:rounded-none print:max-w-none print:w-auto print:mx-auto print:overflow-visible print:p-0 print:m-0">
            {/* Modal Header (Hidden on Print) */}
            <div className="no-print p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-600" />
                <h3 className="font-heading font-extrabold text-slate-900 text-sm">
                  Kitchen Order Ticket (KOT)
                </h3>
              </div>
              <button
                onClick={() => setPrintingOrder(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thermal Docket Receipt Preview */}
            <div
              id="kot-thermal-receipt"
              className="p-5 overflow-y-auto max-h-[70vh] bg-amber-50/20 font-mono text-xs text-slate-900 space-y-3 print:max-h-none print:overflow-visible print:bg-white print:p-3 print:text-black print:space-y-2.5"
            >
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <h4 className="font-bold text-sm uppercase">{restaurant?.name || 'Kitchen'}</h4>
                <p className="text-[10px] text-slate-500">KITCHEN ORDER TICKET (KOT)</p>
                <p className="text-xs font-bold mt-1">ORDER #{printingOrder.id}</p>
                <p className="text-[10px] text-slate-500">
                  {new Date(printingOrder.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </p>
              </div>

              {/* Customer Info */}
              <div className="space-y-0.5 text-[11px] pb-2 border-b border-dashed border-slate-300">
                <p><strong>Customer:</strong> {printingOrder.customer_name}</p>
                {printingOrder.customer_phone && <p><strong>Phone:</strong> +{printingOrder.customer_phone}</p>}
                <p><strong>Address:</strong> {printingOrder.customer_address}</p>
                {printingOrder.customer_notes && (
                  <p className="text-amber-800 font-bold bg-amber-100/60 p-1 rounded mt-1">
                    NOTE: {printingOrder.customer_notes}
                  </p>
                )}
              </div>

              {/* Itemized List */}
              <div className="space-y-1.5 py-1">
                <div className="flex justify-between font-bold text-[11px] border-b border-slate-200 pb-1">
                  <span>ITEM</span>
                  <span>TOTAL</span>
                </div>
                {printingOrder.items?.map((item, i) => (
                  <div key={i} className="space-y-0.5">
                    <div className="flex justify-between font-bold">
                      <span>{item.quantity}x {item.title}</span>
                      <span>{formatPKR(item.unitPrice * item.quantity)}</span>
                    </div>
                    {item.dealItems && (
                      <p className="text-[10px] text-slate-600 pl-2">📦 {item.dealItems}</p>
                    )}
                    {item.choices?.map((c, cIdx) => (
                      <p key={cIdx} className="text-[10px] text-slate-500 pl-2">↳ {c}</p>
                    ))}
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="pt-2 border-t border-dashed border-slate-300 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatPKR(printingOrder.subtotal)}</span>
                </div>
                {printingOrder.delivery_fee > 0 && (
                  <div className="flex justify-between">
                    <span>Delivery Fee:</span>
                    <span>{formatPKR(printingOrder.delivery_fee)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-300">
                  <span>TOTAL DUE:</span>
                  <span>{formatPKR(printingOrder.total_payable)}</span>
                </div>
              </div>

              <div className="text-center pt-2 text-[10px] text-slate-400 border-t border-dashed border-slate-300">
                <p>Direct WhatsApp Order</p>
                <p>{restaurant?.name || 'Kitchen Order Ticket'}</p>
              </div>
            </div>

            {/* Actions (Hidden on Print) */}
            <div className="no-print p-4 border-t border-slate-100 flex items-center gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Ticket</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintingOrder(null)}
                className="py-2.5 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
