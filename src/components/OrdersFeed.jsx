import React, { useState, useEffect } from 'react';
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
  MoreVertical,
  RefreshCw,
  Sparkles,
  FileText,
} from 'lucide-react';
import { formatPKR } from '../utils/currencyUtils';
import { playKitchenChime } from '../services/orderService';
import { QRCodeSVG } from 'qrcode.react';
import { printerService } from '../services/printer/printerService';
import { DRIVER_IDS, PAPER_SIZE_SPECS, TEMPLATE_TYPES } from '../services/printer/printerTypes';
import PrinterStatusBadge from './Printer/PrinterStatusBadge';
import PrintTemplateRenderer from './Printer/PrintTemplateRenderer';

export default function OrdersFeed({
  orders = [],
  onUpdateStatus,
  restaurant,
  soundEnabled = true,
  onToggleSound,
  newOrderAlert,
  onOpenPrinterSettings,
}) {
  const [filter, setFilter] = useState('all'); // all, active, completed, cancelled
  const [search, setSearch] = useState('');
  const [printingOrder, setPrintingOrder] = useState(null);
  const [openMenuOrderId, setOpenMenuOrderId] = useState(null);
  const [printerConfig, setPrinterConfig] = useState(() => printerService.getConfig());
  const [directPrintingId, setDirectPrintingId] = useState(null);
  const [printSuccessToast, setPrintSuccessToast] = useState(null);
  const [fallbackAlert, setFallbackAlert] = useState(null);
  const [isModalPrinting, setIsModalPrinting] = useState(false);
  const [modalTemplateType, setModalTemplateType] = useState(TEMPLATE_TYPES.KOT);
  const [modalPaperSize, setModalPaperSize] = useState(() => printerService.getConfig().paperSize || '80mm');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const reorderUrl = `${origin}/${restaurant?.slug || 'burgersmoke'}`;

  useEffect(() => {
    return printerService.subscribe((cfg) => setPrinterConfig(cfg));
  }, []);

  useEffect(() => {
    const handleFallbackEvent = (e) => {
      const { originalDriver, errorMessage } = e.detail || {};
      setFallbackAlert({
        message: `${originalDriver || 'Thermal printer'} was unavailable (${errorMessage || 'Connection failed'}). We automatically opened standard browser print instead.`,
      });
      setTimeout(() => setFallbackAlert(null), 12000);
    };

    window.addEventListener('dinehq:printer-fallback', handleFallbackEvent);
    return () => window.removeEventListener('dinehq:printer-fallback', handleFallbackEvent);
  }, []);

  const handleDirectPrint = async (order, printType = null) => {
    try {
      setDirectPrintingId(order.id);
      const res = await printerService.print(
        {
          order,
          restaurant,
          reorderUrl,
        },
        printType ? { printType } : {}
      );

      if (res.usedFallback) {
        setFallbackAlert({
          message: `${res.printerName || res.originalDriver || 'Thermal printer'} was unavailable. Switched to standard browser print.`,
        });
      } else {
        setPrintSuccessToast(`Order #${order.id} printed to ${res.printerName || res.driver || 'printer'}!`);
        setTimeout(() => setPrintSuccessToast(null), 3000);
      }
    } catch (err) {
      setFallbackAlert({
        message: `Print error: ${err.message}`,
      });
    } finally {
      setDirectPrintingId(null);
    }
  };

  const handleModalPrint = async () => {
    if (!printingOrder) return;
    try {
      setIsModalPrinting(true);
      const res = await printerService.print({
        order: printingOrder,
        restaurant,
        reorderUrl,
        templateType: modalTemplateType,
        paperSize: modalPaperSize,
      });

      if (res.usedFallback) {
        setFallbackAlert({
          message: `${res.printerName || res.originalDriver || 'Thermal printer'} was unavailable. Switched to standard browser print.`,
        });
      } else {
        setPrintSuccessToast(`Order #${printingOrder.id} printed successfully!`);
        setTimeout(() => setPrintSuccessToast(null), 3000);
      }
    } catch (err) {
      alert(`Print error: ${err.message}`);
    } finally {
      setIsModalPrinting(false);
    }
  };

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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDECEC] border border-[#F9C3C5] text-[#E5484D] text-xs font-bold animate-pulse">
            <Bell className="w-3.5 h-3.5 text-[#E5484D]" />
            <span>New Order</span>
          </span>
        );
      case 'preparing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF3D9] border border-[#FCE1A8] text-[#F5A623] text-xs font-bold">
            <ChefHat className="w-3.5 h-3.5 text-[#F5A623]" />
            <span>Preparing</span>
          </span>
        );
      case 'out_for_delivery':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E7F6EC] border border-[#C0E9CE] text-[#1F9D55] text-xs font-bold">
            <Truck className="w-3.5 h-3.5 text-[#1F9D55]" />
            <span>Ready / Out</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F0E4D7] border border-[#E5D7C7] text-[#7A6A5C] text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#7A6A5C]" />
            <span>Completed</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEE4E2] border border-[#FECDCA] text-[#D92D20] text-xs font-bold">
            <AlertCircle className="w-3.5 h-3.5 text-[#D92D20]" />
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
    <div className={`bg-white border border-[#F0E4D7] rounded-3xl p-6 sm:p-7 shadow-xs space-y-6 ${printingOrder ? 'print:p-0 print:border-none print:shadow-none print:bg-transparent print:space-y-0' : ''}`}>
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

      {/* Printer Fallback Warning Banner */}
      {fallbackAlert && (
        <div className="p-3.5 rounded-2xl bg-[#FEF3D9] border border-[#FCE1A8] text-[#2B2118] text-xs font-semibold flex items-center justify-between gap-3 shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#F5A623] shrink-0" />
            <span>{fallbackAlert.message}</span>
          </div>
          {onOpenPrinterSettings && (
            <button
              type="button"
              onClick={onOpenPrinterSettings}
              className="px-2.5 py-1 rounded-xl bg-white border border-[#F26B1D] text-[#F26B1D] hover:bg-[#FFF1E6] text-xs font-bold transition cursor-pointer shrink-0"
            >
              Printer Settings
            </button>
          )}
        </div>
      )}

      {/* Quick Print Success Toast */}
      {printSuccessToast && (
        <div className="p-3 rounded-2xl bg-[#E7F6EC] border border-[#C0E9CE] text-[#1F9D55] text-xs font-bold flex items-center gap-2 shadow-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-[#1F9D55] shrink-0" />
          <span>{printSuccessToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#F0E4D7]">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#FFF1E6] text-[#F26B1D] flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-heading font-extrabold text-[#2B2118] tracking-tight">
                Orders
              </h2>
              <p className="text-xs text-[#7A6A5C]">
                Incoming orders, tickets, and status.
              </p>
            </div>
          </div>
        </div>

        {/* Audio Controls, Printer Badge & Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Printer Status Badge */}
          {onOpenPrinterSettings && (
            <PrinterStatusBadge onOpenSettings={onOpenPrinterSettings} />
          )}

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

          <div className="flex rounded-xl bg-[#FFF9F2] p-1 border border-[#F0E4D7] text-xs font-bold">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filter === 'all' ? 'bg-[#F26B1D] text-white shadow-xs' : 'text-[#7A6A5C] hover:text-[#2B2118]'
              }`}
            >
              All ({orders.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filter === 'active' ? 'bg-[#F26B1D] text-white shadow-xs' : 'text-[#7A6A5C] hover:text-[#2B2118]'
              }`}
            >
              Active ({orders.filter((o) => o.status === 'new' || o.status === 'preparing' || o.status === 'out_for_delivery').length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filter === 'completed' ? 'bg-[#F26B1D] text-white shadow-xs' : 'text-[#7A6A5C] hover:text-[#2B2118]'
              }`}
            >
              Completed ({orders.filter((o) => o.status === 'completed').length})
            </button>
          </div>
        </div>
      </div>

      {/* Orders Grid / Cards */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-[#F0E4D7] rounded-3xl bg-[#FFF9F2]/50">
          <Package className="w-12 h-12 text-[#9E8E81] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#2B2118]">No orders match this filter</h3>
          <p className="text-xs text-[#7A6A5C] mt-1 max-w-sm mx-auto">
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
                  ? 'bg-[#FDECEC]/30 border-[#F9C3C5]'
                  : order.status === 'preparing'
                  ? 'bg-[#FEF3D9]/30 border-[#FCE1A8]'
                  : order.status === 'out_for_delivery'
                  ? 'bg-[#E7F6EC]/30 border-[#C0E9CE]'
                  : 'bg-white border-[#F0E4D7]'
              }`}
            >
              {/* Order Header */}
              <div>
                <div className="flex items-start justify-between pb-3 border-b border-[#F0E4D7] gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-[#2B2118] text-sm">
                        #{order.id}
                      </span>
                      <span className="text-[11px] text-[#7A6A5C] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#9E8E81]" />
                        <span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    </div>
                    <div className="text-base sm:text-lg font-black text-[#2B2118] mt-1 flex items-center gap-2">
                      <User className="w-4 h-4 text-[#F26B1D] shrink-0" />
                      <span>{order.customer_name || 'Walk-in / Direct Customer'}</span>
                    </div>
                  </div>

                  <div>{getStatusBadge(order.status)}</div>
                </div>

                {/* Delivery Info */}
                <div className="py-2.5 space-y-1 text-xs text-[#7A6A5C] border-b border-[#F0E4D7]/70">
                  {order.customer_phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#9E8E81]" />
                      <span className="font-mono">+{order.customer_phone}</span>
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-1.5 flex-1">
                      <MapPin className="w-3.5 h-3.5 text-[#9E8E81] shrink-0 mt-0.5" />
                      <span className="leading-snug">{order.customer_address}</span>
                    </div>
                  </div>
                  {order.customer_notes && (
                    <div className="p-2 rounded-lg bg-[#FEF3D9] border border-[#FCE1A8] text-[#2B2118] text-[11px] font-medium mt-1">
                      <span className="font-bold text-[#F5A623]">Note: </span>
                      <span>{order.customer_notes}</span>
                    </div>
                  )}
                </div>

                {/* Ordered Items */}
                <div className="py-3 space-y-2">
                  <p className="text-[11px] font-bold text-[#7A6A5C] uppercase tracking-wider">
                    Ordered Dishes ({order.items?.length || 0})
                  </p>
                  <div className="space-y-1.5">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="text-xs bg-[#FFF9F2] p-2 rounded-xl border border-[#F0E4D7]">
                        <div className="flex justify-between font-bold text-[#2B2118]">
                          <span>
                            {item.quantity}x {item.title}
                          </span>
                          <span className="font-mono">{formatPKR(item.unitPrice * item.quantity)}</span>
                        </div>
                        {item.dealItems && (
                          <div className="text-[11px] text-[#D95A12] font-semibold mt-0.5">
                            📦 Bundle: {item.dealItems}
                          </div>
                        )}
                        {item.choices && item.choices.length > 0 && (
                          <div className="text-[10px] text-[#7A6A5C] mt-0.5 space-y-0.5">
                            {item.choices.map((c, cIdx) => (
                              <div key={cIdx} className="pl-2 border-l border-[#F0E4D7]">
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
              <div className="pt-3 border-t border-[#F0E4D7] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="space-y-0.5 text-[#7A6A5C]">
                    <div>Subtotal: <span className="font-mono text-[#2B2118] font-bold">{formatPKR(order.subtotal)}</span></div>
                    {order.delivery_fee > 0 && (
                      <div>Delivery Fee: <span className="font-mono text-[#2B2118] font-bold">{formatPKR(order.delivery_fee)}</span></div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-[#9E8E81] uppercase tracking-wider block">Total Payable</span>
                    <span className="text-xl sm:text-2xl font-black text-[#2B2118] font-mono">
                      {formatPKR(order.total_payable)}
                    </span>
                  </div>
                </div>

                {/* Workflow Dominant Button + "..." Secondary Actions Menu */}
                <div className="flex items-center gap-2 pt-1 relative">
                  {order.status === 'new' && (
                    <button
                      onClick={() => onUpdateStatus(order.id, 'preparing')}
                      className="flex-1 py-3 px-4 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] active:scale-[0.99] text-white text-sm font-extrabold transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-orange-500/20"
                    >
                      <ChefHat className="w-4 h-4 text-white" />
                      <span>Accept & Prepare</span>
                    </button>
                  )}

                  {order.status === 'preparing' && (
                    <button
                      onClick={() => onUpdateStatus(order.id, 'out_for_delivery')}
                      className="flex-1 py-3 px-4 rounded-xl bg-[#F5A623] hover:bg-[#D98E16] active:scale-[0.99] text-white text-sm font-extrabold transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-500/20"
                    >
                      <Truck className="w-4 h-4 text-white" />
                      <span>Dispatch for Delivery</span>
                    </button>
                  )}

                  {order.status === 'out_for_delivery' && (
                    <button
                      onClick={() => onUpdateStatus(order.id, 'completed')}
                      className="flex-1 py-3 px-4 rounded-xl bg-[#1F9D55] hover:bg-[#188044] active:scale-[0.99] text-white text-sm font-extrabold transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-green-500/20"
                    >
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Mark Delivered</span>
                    </button>
                  )}

                  {order.status === 'completed' && (
                    <div className="flex-1 py-2.5 px-3 rounded-xl bg-[#F0E4D7] border border-[#E5D7C7] text-[#7A6A5C] text-xs font-bold text-center flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-[#7A6A5C]" />
                      <span>Order Fulfilled</span>
                    </div>
                  )}

                  {order.status === 'cancelled' && (
                    <div className="flex-1 py-2.5 px-3 rounded-xl bg-[#FEE4E2] border border-[#FECDCA] text-[#D92D20] text-xs font-bold text-center flex items-center justify-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-[#D92D20]" />
                      <span>Order Cancelled</span>
                    </div>
                  )}

                  {/* Quick 1-Click Print Ticket Button */}
                  <button
                    type="button"
                    disabled={directPrintingId === order.id}
                    onClick={() => handleDirectPrint(order)}
                    className="p-3 rounded-xl bg-white hover:bg-[#FFF1E6] text-[#F26B1D] transition cursor-pointer border border-[#F26B1D] hover:border-[#D95A12] flex items-center justify-center shadow-2xs shrink-0"
                    title="1-Click Print KOT Receipt"
                  >
                    {directPrintingId === order.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-[#F26B1D]" />
                    ) : (
                      <Printer className="w-4 h-4" />
                    )}
                  </button>

                  {/* "..." Dropdown Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenMenuOrderId(openMenuOrderId === order.id ? null : order.id)}
                      className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer border border-slate-200 hover:border-slate-300 flex items-center justify-center"
                      title="More actions"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {openMenuOrderId === order.id && (
                      <>
                        <div
                          className="fixed inset-0 z-30"
                          onClick={() => setOpenMenuOrderId(null)}
                        />
                        <div className="absolute right-0 bottom-full mb-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                          <button
                            onClick={() => {
                              handleDirectPrint(order, 'kot');
                              setOpenMenuOrderId(null);
                            }}
                            className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 transition cursor-pointer"
                          >
                            <Printer className="w-4 h-4 text-amber-500" />
                            <span>Print KOT Ticket</span>
                          </button>

                          <button
                            onClick={() => {
                              handleDirectPrint(order, 'bill');
                              setOpenMenuOrderId(null);
                            }}
                            className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 transition cursor-pointer"
                          >
                            <FileText className="w-4 h-4 text-blue-500" />
                            <span>Print Customer Bill</span>
                          </button>

                          {order.customer_address && (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customer_address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => setOpenMenuOrderId(null)}
                              className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 transition"
                            >
                              <ExternalLink className="w-4 h-4 text-slate-500" />
                              <span>View in Maps</span>
                            </a>
                          )}

                          {order.customer_phone && (
                            <button
                              onClick={() => {
                                handleWhatsAppCustomer(order);
                                setOpenMenuOrderId(null);
                              }}
                              className="w-full px-3.5 py-2 text-left text-xs font-bold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5 transition cursor-pointer"
                            >
                              <MessageCircle className="w-4 h-4 text-emerald-600" />
                              <span>WhatsApp Customer</span>
                            </button>
                          )}

                          {(order.status === 'new' || order.status === 'preparing') && (
                            <div className="pt-1 mt-1 border-t border-slate-100">
                              <button
                                onClick={() => {
                                  setOpenMenuOrderId(null);
                                  if (confirm(`Are you sure you want to cancel order #${order.id}?`)) {
                                    onUpdateStatus(order.id, 'cancelled');
                                  }
                                }}
                                className="w-full px-3.5 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition cursor-pointer"
                              >
                                <XCircle className="w-4 h-4 text-rose-500" />
                                <span>Cancel Order</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
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
                <Printer className="w-4 h-4 text-[#F26B1D]" />
                <h3 className="font-heading font-extrabold text-slate-900 text-sm">
                  Print Order #{printingOrder.id}
                </h3>
              </div>
              <button
                onClick={() => setPrintingOrder(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Template & Paper Size Selectors Bar */}
            <div className="no-print p-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setModalTemplateType(TEMPLATE_TYPES.KOT)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    modalTemplateType === TEMPLATE_TYPES.KOT
                      ? 'bg-white text-[#F26B1D] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  KOT Ticket
                </button>
                <button
                  type="button"
                  onClick={() => setModalTemplateType(TEMPLATE_TYPES.BILL)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    modalTemplateType === TEMPLATE_TYPES.BILL
                      ? 'bg-white text-[#F26B1D] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Customer Bill
                </button>
                <button
                  type="button"
                  onClick={() => setModalTemplateType(TEMPLATE_TYPES.DELIVERY)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    modalTemplateType === TEMPLATE_TYPES.DELIVERY
                      ? 'bg-white text-[#F26B1D] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Delivery Slip
                </button>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {['58mm', '80mm', 'a4'].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setModalPaperSize(size)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer ${
                      modalPaperSize === size
                        ? 'bg-white text-[#2B2118] shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Render Preview */}
            <div
              id="kot-thermal-receipt"
              className="p-4 overflow-y-auto max-h-[62vh] bg-slate-100 flex justify-center print:max-h-none print:overflow-visible print:bg-white print:p-0"
            >
              <PrintTemplateRenderer
                templateType={modalTemplateType}
                paperSize={modalPaperSize}
                order={printingOrder}
                restaurant={restaurant}
                settings={printerService.getTemplateSettings()}
                isLivePrint={false}
              />
            </div>

            {/* Actions (Hidden on Print) */}
            <div className="no-print p-4 sm:p-5 border-t border-[#F0E4D7] bg-[#FFF9F2] space-y-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isModalPrinting}
                  onClick={handleModalPrint}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-orange-500/20 disabled:opacity-50"
                >
                  {isModalPrinting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                  <span>{isModalPrinting ? 'Printing Ticket...' : 'Print Ticket'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintingOrder(null)}
                  className="py-3 px-4 rounded-xl bg-white border border-[#F0E4D7] text-[#7A6A5C] font-bold text-xs hover:bg-[#FFF1E6] transition cursor-pointer"
                >
                  Close
                </button>
              </div>

              {/* Connected Printer Routing Footer */}
              <div className="flex items-center justify-between text-[11px] text-[#7A6A5C] px-1">
                <span>
                  Printer: <strong className="text-[#2B2118]">{printerConfig.driver === 'browser' ? 'Browser Print' : printerConfig.driver.toUpperCase()}</strong> ({printerConfig.paperSize})
                </span>
                {onOpenPrinterSettings && (
                  <button
                    type="button"
                    onClick={() => {
                      setPrintingOrder(null);
                      onOpenPrinterSettings();
                    }}
                    className="text-[#F26B1D] hover:underline font-bold cursor-pointer"
                  >
                    Change Printer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
