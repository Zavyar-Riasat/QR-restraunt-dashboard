import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import {
  Bell,
  Clock,
  MapPin,
  Phone,
  User,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Truck,
  ChefHat,
  MessageCircle,
  Package,
  Search,
  Volume2,
  VolumeX,
  Printer,
  ExternalLink,
  X,
  XCircle,
  MoreVertical,
  RefreshCw,
  FileText,
  Check,
  ChevronDown,
  RotateCcw,
  Navigation,
  Copy,
  Plus,
  Send,
  Pause,
  Receipt,
  Bike,
  LayoutGrid,
  List,
  Calendar,
  Eye,
  Edit2,
} from 'lucide-react';
import { formatPKR, computeOrderPaymentState } from '../utils/currencyUtils';
import { filterOrdersByDate } from '../utils/orderReportUtils';
import { playKitchenChime } from '../services/orderService';
import {
  buildGoogleMapsNavUrl,
  buildOsmNavUrl,
} from '../config/mapConfig.js';
import { printerService } from '../services/printer/printerService';
import { TEMPLATE_TYPES } from '../services/printer/printerTypes';
import PrinterStatusBadge from './Printer/PrinterStatusBadge';
import SendToRiderMenu from './Orders/SendToRiderMenu';
import ErrorBoundary from './ErrorBoundary';

const LeafletMap = lazy(() => import('./Map/LeafletMap.jsx'));
const PrintTemplateRenderer = lazy(() => import('./Printer/PrintTemplateRenderer'));
const EditOrderItemsModal = lazy(() => import('./Orders/EditOrderItemsModal'));
const OrderDetailsModal = lazy(() => import('./Orders/OrderDetailsModal'));

export default function OrdersFeed({
  orders = [],
  feedMode = 'active', // 'active' (orders page) | 'completed' (completed orders tab)
  onNavigateToCompleted,
  onUpdateStatus,
  restaurant,
  soundEnabled = true,
  onToggleSound,
  newOrderAlert,
  mutedOrderIds = [],
  onMuteOrderAlert,
  isAudioUnlocked = true,
  onUnlockAudio,
  onOpenPrinterSettings,
  onPrintSalesSummary,
  onOpenNewOrder,
  onDismissOrderAlert,
  menuItems = [],
}) {
  const [filter, setFilter] = useState('all'); // all, active, new, preparing, out_for_delivery / dine_in, delivery, pickup
  const [search, setSearch] = useState('');
  const [orderStatusToast, setOrderStatusToast] = useState(null);
  const [printingOrder, setPrintingOrder] = useState(null);
  const [editingOrderItems, setEditingOrderItems] = useState(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [openMenuOrderId, setOpenMenuOrderId] = useState(null);
  const [activePrintMenuOrderId, setActivePrintMenuOrderId] = useState(null);
  const [copiedLocationId, setCopiedLocationId] = useState(null);
  const [printerConfig, setPrinterConfig] = useState(() => printerService.getConfig());
  const [directPrintingId, setDirectPrintingId] = useState(null);
  const [printSuccessToast, setPrintSuccessToast] = useState(null);
  const [fallbackAlert, setFallbackAlert] = useState(null);
  const [isModalPrinting, setIsModalPrinting] = useState(false);
  const [modalTemplateType, setModalTemplateType] = useState(TEMPLATE_TYPES.KOT);
  const [modalPaperSize, setModalPaperSize] = useState(() => printerService.getConfig().paperSize || '80mm');
  const [retryQueue, setRetryQueue] = useState(() => printerService.getRetryQueue());
  const [printedOrdersMap, setPrintedOrdersMap] = useState(() => printerService.getPrintedOrdersMap());
  const [isRetryingQueue, setIsRetryingQueue] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dinehq_orders_view_mode') || 'cards';
    }
    return 'cards';
  });
  const [dateFilter, setDateFilter] = useState('all');
  const [customFilterDate, setCustomFilterDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [mapsHydrated, setMapsHydrated] = useState(false);

  // Defer downloading and mounting heavy map chunks until after initial FCP/LCP paint
  useEffect(() => {
    let idleId = null;
    let timerId = null;
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(() => setMapsHydrated(true), { timeout: 800 });
    } else {
      timerId = setTimeout(() => setMapsHydrated(true), 350);
    }
    return () => {
      if (idleId && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId);
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  const handleToggleViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('dinehq_orders_view_mode', mode);
    } catch (_) {}
  };

  const handleCopyLocation = (order) => {
    const url = buildGoogleMapsNavUrl(order);
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(url).catch(() => {});
      }
    } catch (_) {}
    setCopiedLocationId(order.id);
    setTimeout(() => setCopiedLocationId(null), 2500);
  };

  const handleOrderStatusChange = (orderId, newStatus) => {
    onUpdateStatus(orderId, newStatus);
    if (newStatus === 'completed') {
      setOrderStatusToast({
        message: `Order #${orderId} marked completed & moved to Completed Orders tab`,
        orderId,
      });
      setTimeout(() => setOrderStatusToast(null), 5000);
    } else if (newStatus === 'preparing' && feedMode === 'completed') {
      setOrderStatusToast({
        message: `Order #${orderId} re-opened & sent back to Live Kitchen Orders!`,
        orderId,
      });
      setTimeout(() => setOrderStatusToast(null), 5000);
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const reorderUrl = `${origin}/${restaurant?.slug || 'burgersmoke'}`;

  useEffect(() => {
    const unsubscribe = printerService.subscribe((data) => {
      if (data?.printers || data?.driver) {
        setPrinterConfig(printerService.getConfig());
      }
      if (data?.retryQueue) {
        setRetryQueue(data.retryQueue);
      }
      if (data?.printedOrders) {
        setPrintedOrdersMap(data.printedOrders);
      }
    });

    const handleRetryQueueUpdated = (e) => {
      if (e.detail?.queue) {
        setRetryQueue(e.detail.queue);
      }
    };

    const handleOrderPrintedEvent = () => {
      setPrintedOrdersMap(printerService.getPrintedOrdersMap());
    };

    window.addEventListener('dinehq_print_retry_queue_updated', handleRetryQueueUpdated);
    window.addEventListener('dinehq_order_printed', handleOrderPrintedEvent);

    return () => {
      unsubscribe();
      window.removeEventListener('dinehq_print_retry_queue_updated', handleRetryQueueUpdated);
      window.removeEventListener('dinehq_order_printed', handleOrderPrintedEvent);
    };
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

  const isOrderPrinted = (orderId) => {
    const orderPrints = printedOrdersMap[orderId];
    return Boolean(orderPrints && Object.keys(orderPrints).length > 0);
  };

  const isOrderPrintedOnType = (orderId, templateType) => {
    const orderPrints = printedOrdersMap[orderId];
    if (!orderPrints) return false;
    return Object.values(orderPrints).some((p) => Boolean(p && p[templateType]));
  };

  const handleRetryNow = async () => {
    try {
      setIsRetryingQueue(true);
      const res = await printerService.processRetryQueue();
      if (res.printedCount > 0) {
        setPrintSuccessToast(`Printed ${res.printedCount} queued ${res.printedCount === 1 ? 'order' : 'orders'}!`);
        setTimeout(() => setPrintSuccessToast(null), 3500);
      } else if (res.remainingCount > 0) {
        setFallbackAlert({
          message: `Printers are still offline. ${res.remainingCount} ${res.remainingCount === 1 ? 'job' : 'jobs'} remaining in queue.`,
        });
        setTimeout(() => setFallbackAlert(null), 6000);
      }
    } catch (err) {
      setFallbackAlert({ message: `Retry failed: ${err.message}` });
    } finally {
      setIsRetryingQueue(false);
      setRetryQueue(printerService.getRetryQueue());
      setPrintedOrdersMap(printerService.getPrintedOrdersMap());
    }
  };

  const handlePrintTicket = async (order, templateType) => {
    try {
      setDirectPrintingId(order.id);
      const table = order?.table_number || order?.table;
      const params = new URLSearchParams();
      if (table) params.set('table', table);
      if (order?.id) params.set('order', order.id);
      const qs = params.toString();
      const ticketQrUrl = `${reorderUrl}${qs ? `?${qs}` : ''}`;

      const res = await printerService.print(
        {
          order,
          restaurant,
          reorderUrl: ticketQrUrl,
          reorderQrUrl: ticketQrUrl,
          templateType,
        },
        { printType: templateType }
      );

      // Record printed flag
      printerService.markOrderPrinted(order.id, res.printerId || 'default', templateType);
      setPrintedOrdersMap(printerService.getPrintedOrdersMap());

      const typeLabel =
        templateType === TEMPLATE_TYPES.KOT
          ? 'KOT'
          : templateType === TEMPLATE_TYPES.BILL
            ? 'Customer Bill'
            : 'Delivery Slip';

      if (res.usedFallback) {
        setFallbackAlert({
          message: `${res.printerName || res.originalDriver || 'Thermal printer'} was unavailable. Switched to standard browser print.`,
        });
      } else {
        setPrintSuccessToast(`Order #${order.id} ${typeLabel} printed successfully!`);
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

  // When in 'completed' feedMode, only show completed orders.
  // When in 'active' feedMode, completed orders must NEVER be visible on the orders page!
  const baseOrders = useMemo(() => {
    if (feedMode === 'completed') {
      return orders.filter((o) => o.status === 'completed');
    }
    return orders.filter((o) => o.status !== 'completed');
  }, [orders, feedMode]);

  const dateFilteredOrders = useMemo(() => {
    if (dateFilter === 'all') return baseOrders;
    return filterOrdersByDate(baseOrders, {
      mode: dateFilter === 'custom' ? 'specific_date' : dateFilter,
      specificDate: customFilterDate,
      includeCancelled: true,
    }).filteredOrders;
  }, [baseOrders, dateFilter, customFilterDate]);

  const completedOrdersCount = useMemo(() => {
    return orders.filter((o) => o.status === 'completed').length;
  }, [orders]);

  const completedRevenue = useMemo(() => {
    return dateFilteredOrders.reduce((sum, o) => sum + (Number(o.total_payable) || 0), 0);
  }, [dateFilteredOrders]);

  const filteredOrders = useMemo(() => {
    return dateFilteredOrders.filter((order) => {
      let matchesFilter = true;
      if (feedMode === 'completed') {
        if (filter === 'dine_in') matchesFilter = order.order_type === 'dine_in';
        else if (filter === 'delivery') matchesFilter = order.order_type === 'delivery';
        else if (filter === 'pickup') matchesFilter = order.order_type === 'pickup' || order.order_source === 'phone_pickup';
        else matchesFilter = true;
      } else {
        if (filter === 'all' || filter === 'active') {
          matchesFilter = true;
        } else if (filter === 'out_for_delivery') {
          matchesFilter = order.status === 'out_for_delivery' || order.status === 'ready';
        } else {
          matchesFilter = order.status === filter;
        }
      }

      const query = search.toLowerCase().trim();
      if (!query) return matchesFilter;

      const matchesSearch =
        (order.id || '').toLowerCase().includes(query) ||
        (order.customer_name || '').toLowerCase().includes(query) ||
        (order.customer_phone || '').toLowerCase().includes(query) ||
        (order.customer_address || '').toLowerCase().includes(query) ||
        (order.table_number || '').toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [dateFilteredOrders, filter, search, feedMode]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDECEC] border border-[#F9C3C5] text-[#E5484D] text-xs font-bold animate-pulse">
            <Bell className="w-3.5 h-3.5 text-[#E5484D]" />
            <span>New Order</span>
          </span>
        );
      case 'held':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold">
            <Pause className="w-3.5 h-3.5 text-amber-700" />
            <span>Held / Draft</span>
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
      case 'ready':
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

  const handleSmsCustomer = (order) => {
    const cleanPhone = (order.customer_phone || '').replace(/\D/g, '');
    if (!cleanPhone) {
      alert('No customer phone number available.');
      return;
    }
    const storeName = restaurant?.name || 'Kitchen';
    const text = encodeURIComponent(
      `Hello ${order.customer_name}! This is ${storeName} regarding your order #${order.id}. Your order is currently ${order.status.replace(/_/g, ' ')}.`
    );
    window.open(`sms:+${cleanPhone}?body=${text}`, '_blank');
  };

  const pendingNewOrders = useMemo(
    () => (feedMode === 'completed' ? [] : orders.filter((o) => o.status === 'new')),
    [orders, feedMode]
  );
  const latestNewOrder = pendingNewOrders[0];
  const unmutedPendingCount = useMemo(
    () => pendingNewOrders.filter((o) => !mutedOrderIds.includes(o.id)).length,
    [pendingNewOrders, mutedOrderIds]
  );

  return (
    <div className={`bg-white border border-[#F0E4D7] rounded-3xl p-6 sm:p-7 shadow-xs space-y-6 ${printingOrder ? 'print:p-0 print:border-none print:shadow-none print:bg-transparent print:space-y-0' : ''}`}>
      {/* Background Feed Content (Hidden when printing KOT modal) */}
      <div className={`space-y-6 ${printingOrder ? 'no-print' : ''}`}>

        {/* Audio Context Unlock Banner (Browser Autoplay Policy) */}
        {!isAudioUnlocked && soundEnabled && feedMode !== 'completed' && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500 text-slate-950 font-bold text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-amber-500/25 animate-fadeIn border-2 border-amber-600">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-950/15 flex items-center justify-center shrink-0">
                <Volume2 className="w-5 h-5 text-slate-950 animate-pulse" />
              </div>
              <div>
                <div className="font-black tracking-tight">Kitchen Audio Alerts Require Click Permission</div>
                <div className="text-[11px] text-slate-900/80 font-normal">
                  Browser policy requires one click to permit continuous loud alarms for new kitchen orders.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onUnlockAudio}
              className="px-4 py-2 rounded-xl bg-slate-950 text-white hover:bg-slate-900 active:scale-95 text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 shrink-0 shadow-md"
            >
              <Volume2 className="w-4 h-4 text-amber-400" />
              <span>Enable Kitchen Alarm</span>
            </button>
          </div>
        )}

        {/* Prominent Red Glowing "New Order" Banner */}
        {pendingNewOrders.length > 0 && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white font-bold text-xs sm:text-sm flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl shadow-red-600/30 border-2 border-red-400 animate-pulse">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 ring-4 ring-white/10">
                <Bell className="w-6 h-6 text-amber-300 animate-bounce" />
              </div>
              <div>
                <div className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2.5 flex-wrap">
                  <span>🚨 NEW ORDER RECEIVED!</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white text-red-700 text-xs font-black">
                    {pendingNewOrders.length} {pendingNewOrders.length === 1 ? 'Pending Action' : 'Orders Pending'}
                  </span>
                  {unmutedPendingCount > 0 && soundEnabled && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider animate-bounce">
                      🔊 Alarm Active
                    </span>
                  )}
                </div>
                <div className="text-xs text-rose-100 font-medium mt-1">
                  {latestNewOrder && (
                    <span>
                      Order #{latestNewOrder.id} • {latestNewOrder.customer_name || 'Customer'} • {formatPKR(latestNewOrder.total_payable)} (
                      {latestNewOrder.order_type === 'dine_in'
                        ? `Table ${latestNewOrder.table_number || 'Dine-in'}`
                        : latestNewOrder.order_type === 'pickup'
                          ? 'Pickup / Takeaway'
                          : 'Delivery'}
                      )
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              {latestNewOrder && (
                <button
                  type="button"
                  onClick={() => onUpdateStatus(latestNewOrder.id, 'preparing')}
                  className="px-4 py-2.5 rounded-xl bg-white text-red-700 hover:bg-rose-50 active:scale-95 text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <ChefHat className="w-4 h-4 text-red-600" />
                  <span>Accept & Prepare (#{latestNewOrder.id})</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (onMuteOrderAlert) {
                    pendingNewOrders.forEach((o) => onMuteOrderAlert(o.id));
                  }
                }}
                className="px-3.5 py-2.5 rounded-xl bg-red-950/60 hover:bg-red-950 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border border-red-500/50"
                title="Mute repeating alarm sound for pending orders"
              >
                <VolumeX className="w-4 h-4 text-rose-200" />
                <span>Mute Alarm</span>
              </button>
            </div>
          </div>
        )}

        {/* Live Order Incoming Alert Notification Toast (if no pending list banner or for latest toast) */}
        {newOrderAlert && pendingNewOrders.length === 0 && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white font-bold text-xs flex items-center justify-between shadow-lg shadow-emerald-600/20">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>{newOrderAlert}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md font-mono">Just Now</span>
              {onDismissOrderAlert && (
                <button
                  type="button"
                  onClick={onDismissOrderAlert}
                  className="p-1 hover:bg-white/20 rounded-lg transition text-white cursor-pointer"
                  title="Dismiss notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Printer Offline Retry Queue Alert Banner (Red Banner) */}
        {retryQueue.length > 0 && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-bold text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-rose-600/25 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <div className="text-sm font-extrabold tracking-tight">
                  Printer offline - {new Set(retryQueue.map((q) => q.orderId)).size}{' '}
                  {new Set(retryQueue.map((q) => q.orderId)).size === 1 ? 'order' : 'orders'} waiting to print
                </div>
                <div className="text-[11px] text-rose-100 font-normal mt-0.5">
                  Jobs held for {Array.from(new Set(retryQueue.map((q) => q.printerName || 'Printer'))).join(', ')}. Will auto-print once reconnected.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={isRetryingQueue}
                onClick={handleRetryNow}
                className="px-3.5 py-2 rounded-xl bg-white text-rose-700 hover:bg-rose-50 active:scale-95 text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetryingQueue ? 'animate-spin' : ''}`} />
                <span>Retry Now</span>
              </button>
              {onOpenPrinterSettings && (
                <button
                  type="button"
                  onClick={onOpenPrinterSettings}
                  className="px-3 py-2 rounded-xl bg-rose-800/80 hover:bg-rose-800 text-white text-xs font-semibold transition cursor-pointer"
                >
                  Printer Settings
                </button>
              )}
            </div>
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

        {/* Orders Header Section */}
        <div className="space-y-3 pb-5 border-b border-[#F0E4D7]">
          {/* Top Row: Brand Header & Search/Filters */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md shrink-0 ${
                feedMode === 'completed'
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-500/20'
                  : 'bg-gradient-to-tr from-[#F26B1D] to-[#F5A623] text-white shadow-orange-500/20'
              }`}>
                {feedMode === 'completed' ? (
                  <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                ) : (
                  <Bell className="w-6 h-6 stroke-[2.5]" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-2xl font-heading font-extrabold text-[#2B2118] tracking-tight leading-tight">
                    {feedMode === 'completed' ? 'Completed Orders' : 'Live Kitchen Orders'}
                  </h2>
                  {feedMode === 'completed' ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold font-mono">
                      {dateFilteredOrders.length} Fulfilled
                    </span>
                  ) : (
                    dateFilteredOrders.length > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold font-mono">
                        {dateFilteredOrders.length} Active
                      </span>
                    )
                  )}
                </div>
                <p className="text-xs text-[#7A6A5C] mt-0.5">
                  {feedMode === 'completed'
                    ? 'Archived history of fulfilled dine-in, takeaway, and delivery orders.'
                    : 'Real-time incoming orders, tickets, and active kitchen operations.'}
                </p>
              </div>
            </div>

            {/* If in completed mode, show total revenue pill */}
            {feedMode === 'completed' && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-1.5 shadow-2xs">
                  <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Settled: {formatPKR(completedRevenue)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search order ID, name, phone..."
                  className="w-full sm:w-48 md:w-56 pl-9 pr-3.5 py-2 rounded-xl border border-[#F0E4D7] text-xs bg-[#FFF9F2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F26B1D]/20 focus:border-[#F26B1D] transition"
                />
              </div>

              {/* Date Filter Dropdown */}
              <div className="relative flex items-center gap-1.5">
                <div className="relative">
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="text-xs font-bold text-[#2B2118] bg-[#FFF9F2] hover:bg-[#FFF1E6] pl-7 pr-6 py-2 rounded-xl border border-[#F0E4D7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F26B1D]/20 cursor-pointer appearance-none shadow-2xs"
                    title="Filter orders by date/time period"
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="last_7_days">Last 7 Days</option>
                    <option value="this_month">This Month</option>
                    <option value="custom">Pick Day...</option>
                  </select>
                  <Calendar className="w-3.5 h-3.5 text-[#F26B1D] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <ChevronDown className="w-3 h-3 text-[#7A6A5C] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {dateFilter === 'custom' && (
                  <input
                    type="date"
                    value={customFilterDate}
                    onChange={(e) => setCustomFilterDate(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl border border-[#F0E4D7] bg-white text-xs font-bold text-[#2B2118] cursor-pointer"
                  />
                )}
              </div>

              {/* Category / Status Tabs */}
              {feedMode === 'completed' ? (
                <div className="flex rounded-xl bg-[#FFF9F2] p-1 border border-[#F0E4D7] text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      filter === 'all' ? 'bg-[#F26B1D] text-white shadow-xs' : 'text-[#7A6A5C] hover:text-[#2B2118]'
                    }`}
                  >
                    All Completed ({dateFilteredOrders.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter('dine_in')}
                    className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                      filter === 'dine_in' ? 'bg-[#F26B1D] text-white shadow-xs' : 'text-[#7A6A5C] hover:text-[#2B2118]'
                    }`}
                  >
                    Dine-In ({dateFilteredOrders.filter((o) => o.order_type === 'dine_in').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter('delivery')}
                    className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                      filter === 'delivery' ? 'bg-[#F26B1D] text-white shadow-xs' : 'text-[#7A6A5C] hover:text-[#2B2118]'
                    }`}
                  >
                    Delivery ({dateFilteredOrders.filter((o) => o.order_type === 'delivery').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter('pickup')}
                    className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                      filter === 'pickup' ? 'bg-[#F26B1D] text-white shadow-xs' : 'text-[#7A6A5C] hover:text-[#2B2118]'
                    }`}
                  >
                    Takeaway ({dateFilteredOrders.filter((o) => o.order_type === 'pickup' || o.order_source === 'phone_pickup').length})
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex rounded-xl bg-[#FFF9F2] p-1 border border-[#F0E4D7] text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setFilter('all')}
                      className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                        filter === 'all' || filter === 'active' ? 'bg-[#F26B1D] text-white shadow-xs' : 'text-[#7A6A5C] hover:text-[#2B2118]'
                      }`}
                    >
                      All Active ({dateFilteredOrders.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilter('new')}
                      className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                        filter === 'new' ? 'bg-[#F26B1D] text-white shadow-xs' : 'text-[#7A6A5C] hover:text-[#2B2118]'
                      }`}
                    >
                      New ({dateFilteredOrders.filter((o) => o.status === 'new').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilter('preparing')}
                      className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                        filter === 'preparing' ? 'bg-[#F26B1D] text-white shadow-xs' : 'text-[#7A6A5C] hover:text-[#2B2118]'
                      }`}
                    >
                      Preparing ({dateFilteredOrders.filter((o) => o.status === 'preparing').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilter('out_for_delivery')}
                      className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                        filter === 'out_for_delivery' ? 'bg-[#F26B1D] text-white shadow-xs' : 'text-[#7A6A5C] hover:text-[#2B2118]'
                      }`}
                    >
                      Ready/Out ({dateFilteredOrders.filter((o) => o.status === 'out_for_delivery' || o.status === 'ready').length})
                    </button>
                  </div>

                  {onNavigateToCompleted && (
                    <button
                      type="button"
                      onClick={onNavigateToCompleted}
                      className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
                      title="View all completed orders in the Completed tab"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Completed ({completedOrdersCount}) →</span>
                    </button>
                  )}
                </div>
              )}

              {/* View Mode Toggle (Cards vs List) */}
              <div className="flex items-center rounded-xl bg-[#FFF9F2] p-1 border border-[#F0E4D7] text-xs font-bold">
                <button
                  type="button"
                  onClick={() => handleToggleViewMode('cards')}
                  className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${viewMode === 'cards'
                      ? 'bg-[#F26B1D] text-white shadow-xs'
                      : 'text-[#7A6A5C] hover:text-[#2B2118]'
                    }`}
                  title="Card Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleViewMode('list')}
                  className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${viewMode === 'list'
                      ? 'bg-[#F26B1D] text-white shadow-xs'
                      : 'text-[#7A6A5C] hover:text-[#2B2118]'
                    }`}
                  title="List Table View (All order details in tabular list)"
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">List</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sub-toolbar Below: Counter Printer, Bell ON / Muted, and Test Bell */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F0E4D7]/60">
            <div className="flex items-center gap-2">
              {/* Printer Status Badge (Counter) */}
              {onOpenPrinterSettings && (
                <PrinterStatusBadge onOpenSettings={onOpenPrinterSettings} />
              )}

              {/* Audio Alert Bell Toggle */}
              <button
                type="button"
                onClick={onToggleSound}
                className={`p-1.5 px-3 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${soundEnabled
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 shadow-2xs'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                title={soundEnabled ? 'Kitchen audio alert is ON (Click to mute)' : 'Kitchen audio alert is MUTED (Click to unmute)'}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-600" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
                <span>{soundEnabled ? 'Bell ON' : 'Bell Muted'}</span>
              </button>

              {/* Test Bell Chime Button */}
              <button
                type="button"
                onClick={playKitchenChime}
                className="p-1.5 px-3 rounded-xl bg-white hover:bg-[#FFF1E6] text-[#7A6A5C] hover:text-[#2B2118] text-xs font-bold border border-[#F0E4D7] transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="Test kitchen order chime audio"
              >
                <Bell className="w-3.5 h-3.5 text-amber-500" />
                <span>Test Bell</span>
              </button>
            </div>

            <div className="text-[11px] text-[#9E8E81] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Sync Active</span>
            </div>
          </div>
        </div>

        {/* Orders Feed Body: List View vs Cards Grid View */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-[#F0E4D7] rounded-3xl bg-[#FFF9F2]/50">
            <Package className="w-12 h-12 text-[#9E8E81] mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#2B2118]">
              {feedMode === 'completed'
                ? 'No completed orders match this filter'
                : 'No active orders in kitchen right now'}
            </h3>
            <p className="text-xs text-[#7A6A5C] mt-1 max-w-sm mx-auto">
              {feedMode === 'completed'
                ? 'Fulfilled customer and dine-in orders will be automatically archived here.'
                : 'When customers place direct orders from your menu, they will appear here in real time.'}
            </p>
            {feedMode !== 'completed' && completedOrdersCount > 0 && onNavigateToCompleted && (
              <button
                type="button"
                onClick={onNavigateToCompleted}
                className="mt-4 px-4 py-2 rounded-xl bg-white border border-[#F0E4D7] hover:border-emerald-400 text-xs font-bold text-emerald-800 hover:bg-emerald-50 transition shadow-xs inline-flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>View {completedOrdersCount} Completed Orders in History →</span>
              </button>
            )}
          </div>
        ) : viewMode === 'list' ? (
          <div className="bg-white rounded-2xl border border-[#F0E4D7] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[850px]">
                <thead className="bg-[#FFF9F2] text-[#7A6A5C] uppercase font-bold text-[10px] tracking-wider border-b border-[#F0E4D7]">
                  <tr>
                    <th className="py-3 px-3.5">Order ID</th>
                    <th className="py-3 px-3">Date & Time</th>
                    <th className="py-3 px-3.5">Customer & Details</th>
                    <th className="py-3 px-2 text-center">Type</th>
                    <th className="py-3 px-3">Items Summary</th>
                    <th className="py-3 px-3 text-right">Payable</th>
                    <th className="py-3 px-2 text-center">Payment</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0E4D7]/70 font-medium">
                  {filteredOrders.map((order) => {
                    const paymentState = computeOrderPaymentState(order);
                    const itemsSummary = Array.isArray(order.items)
                      ? order.items.map((it) => `${it.quantity || 1}× ${it.title}`).join(', ')
                      : '—';
                    const isPaid = paymentState.paymentStatus === 'paid';
                    const isPartial = paymentState.paymentStatus === 'partial';

                    return (
                      <tr
                        key={order.id}
                        className={`transition hover:bg-[#FFF9F2]/70 ${
                          order.status === 'new'
                            ? 'bg-red-50/30'
                            : order.status === 'preparing'
                            ? 'bg-amber-50/20'
                            : order.status === 'completed'
                            ? 'bg-slate-50/20'
                            : 'bg-white'
                        }`}
                      >
                        {/* Order ID */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedOrderDetails(order)}
                              className="font-mono font-extrabold text-[#2B2118] hover:text-[#F26B1D] hover:underline cursor-pointer"
                              title="Click to view full order details"
                            >
                              #{order.id}
                            </button>
                            {isOrderPrinted(order.id) && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                                <Check className="w-2.5 h-2.5" />
                                <span>Printed</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Date & Time */}
                        <td className="py-3 px-3 whitespace-nowrap text-[#7A6A5C] font-mono text-[11px]">
                          {order.created_at ? (
                            <div>
                              <div className="font-bold text-[#2B2118]">
                                {new Date(order.created_at).toLocaleDateString('en-PK', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {new Date(order.created_at).toLocaleTimeString('en-PK', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true,
                                })}
                              </div>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>

                        {/* Customer & Location */}
                        <td className="py-3 px-3.5 max-w-[180px]">
                          <div className="font-bold text-[#2B2118] truncate flex items-center gap-1">
                            <span>{order.customer_name || 'Walk-in Customer'}</span>
                          </div>
                          <div className="text-[11px] text-[#7A6A5C] truncate flex items-center gap-1 mt-0.5">
                            {order.order_type === 'dine_in' ? (
                              <span className="text-purple-700 font-bold">Table {order.table_number || 'Dine-In'}</span>
                            ) : order.customer_address ? (
                              <span title={order.customer_address}>{order.customer_address}</span>
                            ) : order.customer_phone ? (
                              <span>{order.customer_phone}</span>
                            ) : (
                              <span>Direct POS</span>
                            )}
                          </div>
                        </td>

                        {/* Type */}
                        <td className="py-3 px-2 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              order.order_type === 'dine_in'
                                ? 'bg-purple-100 text-purple-800'
                                : order.order_type === 'delivery'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {order.order_type === 'dine_in'
                              ? 'Dine-In'
                              : order.order_type === 'delivery'
                              ? 'Delivery'
                              : 'Takeaway'}
                          </span>
                        </td>

                        {/* Items Summary */}
                        <td className="py-3 px-3 max-w-[220px]">
                          <span className="line-clamp-2 text-[#2B2118] text-[11px]" title={itemsSummary}>
                            {itemsSummary}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-3 text-right font-mono font-black text-[#2B2118] whitespace-nowrap">
                          {formatPKR(order.total_payable || 0)}
                        </td>

                        {/* Payment */}
                        <td className="py-3 px-2 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                            PAID
                          </span>
                        </td>

                        {/* Status (with inline status change dropdown) */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <select
                            value={order.status || 'new'}
                            onChange={(e) => handleOrderStatusChange(order.id, e.target.value)}
                            className={`text-[11px] font-bold px-2 py-1 rounded-lg border cursor-pointer focus:outline-none focus:ring-1 transition ${
                              order.status === 'new'
                                ? 'bg-red-100 text-red-800 border-red-300'
                                : order.status === 'preparing'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : order.status === 'out_for_delivery' || order.status === 'ready'
                                ? 'bg-blue-100 text-blue-900 border-blue-300'
                                : order.status === 'completed'
                                ? 'bg-slate-100 text-slate-700 border-slate-300'
                                : 'bg-rose-100 text-rose-800 border-rose-300'
                            }`}
                          >
                            <option value="new">New Order</option>
                            <option value="preparing">Preparing</option>
                            <option value="out_for_delivery">Out / Ready</option>
                            <option value="completed">Completed</option>
                            <option value="held">Held / Draft</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>

                        {/* Quick Actions */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* View Details */}
                            <button
                              type="button"
                              onClick={() => setSelectedOrderDetails(order)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                              title="View full order details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Print Bill */}
                            <button
                              type="button"
                              onClick={() => handlePrintTicket(order, TEMPLATE_TYPES.BILL)}
                              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition cursor-pointer"
                              title="Print Bill Receipt"
                            >
                              <Printer className="w-3.5 h-3.5 text-[#F26B1D]" />
                            </button>

                            {/* Edit Items (if not completed/cancelled) */}
                            {order.status !== 'completed' && order.status !== 'cancelled' && (
                              <button
                                type="button"
                                onClick={() => setEditingOrderItems(order)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                                title="Edit order items"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredOrders.map((order, cardIdx) => {
              const paymentState = computeOrderPaymentState(order);
              return (
                <div
                  key={order.id}
                  style={
                    cardIdx >= 4
                      ? { contentVisibility: 'auto', containIntrinsicSize: '0 420px' }
                      : undefined
                  }
                  className={`p-5 rounded-2xl border transition shadow-xs flex flex-col justify-between ${order.status === 'new'
                      ? `bg-[#FDECEC]/30 border-[#F9C3C5] ${!mutedOrderIds.includes(order.id) ? 'ring-2 ring-red-400 shadow-md shadow-red-500/10' : ''}`
                      : order.status === 'preparing'
                        ? 'bg-[#FEF3D9]/30 border-[#FCE1A8]'
                        : order.status === 'out_for_delivery' || order.status === 'ready'
                          ? 'bg-[#E7F6EC]/30 border-[#C0E9CE]'
                          : 'bg-white border-[#F0E4D7]'
                    }`}
                >
                  {/* Order Header */}
                  <div>
                    <div className="flex items-start justify-between pb-3 border-b border-[#F0E4D7] gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setSelectedOrderDetails(order)}
                            className="font-mono font-extrabold text-[#2B2118] text-sm hover:text-[#F26B1D] hover:underline cursor-pointer"
                            title="Click to view full order details"
                          >
                            #{order.id}
                          </button>
                          {isOrderPrinted(order.id) && (
                            <span
                              id={`printed-badge-${order.id}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E7F6EC] border border-[#C0E9CE] text-[#1F9D55] text-[10px] font-bold shadow-2xs"
                              title="Order ticket has been printed"
                            >
                              <Check className="w-3 h-3 stroke-[2.5]" />
                              <span>Printed</span>
                            </span>
                          )}
                          <span className="text-[11px] text-[#7A6A5C] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#9E8E81]" />
                            <span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap mt-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedOrderDetails(order)}
                            className="text-base sm:text-lg font-black text-[#2B2118] hover:text-[#F26B1D] flex items-center gap-1.5 cursor-pointer text-left"
                            title="Click to view full order details"
                          >
                            <User className="w-4 h-4 text-[#F26B1D] shrink-0" />
                            <span>{order.customer_name || 'Walk-in / Direct Customer'}</span>
                          </button>

                          {/* Order Source Label (Manager / POS only) */}
                          {(order.order_source === 'manager' || order.source === 'manager') && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                              🏪 Manager POS {order.staff_name ? `• ${order.staff_name}` : ''}
                            </span>
                          )}

                          {/* Order Type Badge */}
                          {order.order_type === 'dine_in' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 text-[11px] font-extrabold">
                              🍽️ Dine-In {order.table_number ? `• Table ${order.table_number}` : ''}
                            </span>
                          ) : order.order_type === 'pickup' || order.order_source === 'phone_pickup' || order.phone_order_mode === 'pickup' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 text-[11px] font-extrabold">
                              {order.order_source === 'phone_pickup' || order.phone_order_mode === 'pickup' ? '📞🛍️ Phone Pickup' : '🛍️ Takeaway / Pickup'}
                            </span>
                          ) : order.order_source === 'phone_delivery' || (order.order_type === 'phone' && order.phone_order_mode === 'delivery') ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200 text-[11px] font-extrabold">
                              📞🛵 Phone Delivery
                            </span>
                          ) : order.order_type === 'phone' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200 text-[11px] font-extrabold">
                              📞 Phone Call
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-extrabold">
                              🛵 Delivery
                            </span>
                          )}

                          {/* Assigned Delivery Rider Badge */}
                          {order.assigned_rider && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                              <Bike className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Rider: {order.assigned_rider.name}</span>
                            </span>
                          )}

                          {/* Payment Method Badge */}
                          {order.payment_method && (
                            <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-mono uppercase">
                              {order.payment_method === 'jazzcash'
                                ? 'JazzCash'
                                : order.payment_method === 'easypaisa'
                                  ? 'Easypaisa'
                                  : order.payment_method === 'cash_counter'
                                    ? 'Pay at Counter'
                                    : 'Cash on Delivery'}
                            </span>
                          )}

                          {/* Payment Status Badge: Paid in Full */}
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Paid</span>
                          </span>
                        </div>
                      </div>

                      <div>{getStatusBadge(order.status)}</div>
                    </div>

                    {/* Delivery / Dining Location Info */}
                    <div className="py-2.5 space-y-2 text-xs text-[#7A6A5C] border-b border-[#F0E4D7]/70">
                      {order.order_type === 'dine_in' ? (
                        <div>
                          {order.customer_phone && (
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Phone className="w-3.5 h-3.5 text-[#9E8E81]" />
                              <span className="font-mono">+{order.customer_phone}</span>
                            </div>
                          )}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-1.5 flex-1 font-semibold text-purple-900">
                              <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                              <span>Table #{order.table_number || 'Dine-In Area'} (Restaurant Dine-in Guest)</span>
                            </div>
                          </div>
                        </div>
                      ) : order.order_type === 'pickup' ? (
                        <div>
                          {order.customer_phone && (
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Phone className="w-3.5 h-3.5 text-[#9E8E81]" />
                              <span className="font-mono">+{order.customer_phone}</span>
                            </div>
                          )}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-1.5 flex-1 font-semibold text-blue-900">
                              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                              <span>Self-Pickup / Takeaway by customer at counter</span>
                            </div>
                          </div>
                        </div>
                      ) : (order.order_type === 'phone' || order.order_type === 'phone_pickup' || order.order_source === 'phone_pickup' || order.phone_order_mode === 'pickup') && !order.customer_address && !order.phone_delivery && order.phone_order_mode !== 'delivery' ? (
                        /* Phone Pickup Order (No delivery rider needed) */
                        <div>
                          <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                            {order.customer_phone ? (
                              <a
                                href={`tel:+${order.customer_phone.replace(/\D/g, '')}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 transition font-bold font-mono text-xs cursor-pointer shadow-2xs"
                                title="Call Customer"
                              >
                                <Phone className="w-3.5 h-3.5 text-teal-600" />
                                <span>+{order.customer_phone}</span>
                                <span className="text-[10px] text-teal-600 font-sans font-semibold ml-0.5">• Call Customer</span>
                              </a>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">No phone</span>
                            )}
                            <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-lg">
                              🛍️ Self-Pickup Call
                            </span>
                          </div>
                          <div className="flex items-start gap-1.5 text-teal-950 font-semibold text-xs">
                            <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                            <span>Phone Order — Customer will pick up at counter (No delivery rider required)</span>
                          </div>
                        </div>
                      ) : (
                        /* Delivery Order with Phone, Navigation, and Map Preview */
                        <div className="space-y-2.5">
                          {/* Customer Contact & Navigation Buttons */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            {order.customer_phone ? (
                              <a
                                href={`tel:+${order.customer_phone.replace(/\D/g, '')}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition font-bold font-mono text-xs cursor-pointer shadow-2xs"
                                title="Call Customer"
                              >
                                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                <span>+{order.customer_phone}</span>
                                <span className="text-[10px] text-emerald-600 font-sans font-semibold ml-0.5">• Call Customer</span>
                              </a>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">No phone</span>
                            )}

                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Send to Rider Menu Button */}
                              <SendToRiderMenu
                                order={order}
                                restaurant={restaurant}
                                buttonSize="sm"
                              />

                              {/* 1. Navigate Button (Google Maps navigation or address search) */}
                              <a
                                href={buildGoogleMapsNavUrl(order)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white border border-[#F26B1D] text-[#F26B1D] hover:bg-[#FFF1E6] transition text-[11px] font-bold shadow-2xs cursor-pointer"
                                title="Navigate directly with GPS coordinates or address"
                              >
                                <Navigation className="w-3 h-3 text-[#F26B1D]" />
                                <span>Navigate</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                              </a>
                            </div>
                          </div>

                          {/* Structured Delivery Address */}
                          <div className="flex items-start gap-1.5 text-slate-800">
                            <MapPin className="w-3.5 h-3.5 text-[#F26B1D] shrink-0 mt-0.5" />
                            <div className="space-y-0.5 flex-1 min-w-0">
                              <p className="leading-snug font-semibold text-xs text-[#2B2118] break-words">
                                {order.customer_address || 'Delivery Address'}
                              </p>

                              {(order.house_flat || order.area_landmark) && (
                                <div className="flex items-center gap-2 flex-wrap text-[11px] text-[#7A6A5C] pt-0.5">
                                  {order.house_flat && (
                                    <span className="bg-[#FFF9F2] px-1.5 py-0.5 rounded border border-[#F0E4D7] font-medium">
                                      House/Flat: {order.house_flat}
                                    </span>
                                  )}
                                  {order.area_landmark && (
                                    <span className="bg-[#FFF9F2] px-1.5 py-0.5 rounded border border-[#F0E4D7] font-medium">
                                      Landmark: {order.area_landmark}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Small Leaflet OpenStreetMap Preview with Pin */}
                          {(order.latitude || order.location_coords?.lat) && (
                            <div className="rounded-xl border border-[#F0E4D7] overflow-hidden bg-slate-50 mt-1 shadow-2xs">
                              <div className="px-2.5 py-1 flex items-center justify-between text-[10px] bg-[#FFF9F2] border-b border-[#F0E4D7] font-mono">
                                <span className="font-bold text-[#2B2118] flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                                  Pin: {Number(order.latitude || order.location_coords.lat).toFixed(4)},{' '}
                                  {Number(order.longitude || order.location_coords.lng).toFixed(4)}
                                </span>
                                {order.accuracy && (
                                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 font-bold">
                                    ±{Math.round(order.accuracy)}m
                                  </span>
                                )}
                              </div>
                              <div className="relative w-full h-32 bg-slate-100">
                                {mapsHydrated ? (
                                  <ErrorBoundary
                                    fallback={
                                      <div className="w-full h-full flex items-center justify-center bg-slate-100 text-[10px] text-slate-500">
                                        Map preview unavailable
                                      </div>
                                    }
                                  >
                                    <Suspense
                                      fallback={
                                        <div className="w-full h-full flex items-center justify-center bg-slate-100 text-[10px] text-slate-400">
                                          Loading Map...
                                        </div>
                                      }
                                    >
                                      <LeafletMap
                                        center={{
                                          lat: Number(order.latitude || order.location_coords.lat),
                                          lng: Number(order.longitude || order.location_coords.lng),
                                        }}
                                        zoom={16}
                                        draggable={false}
                                        interactive={false}
                                        height="128px"
                                        popupText={order.customer_address}
                                      />
                                    </Suspense>
                                  </ErrorBoundary>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-slate-100 text-[10px] text-slate-400">
                                    Loading Map...
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Rider Note / Special Instructions */}
                      {(order.delivery_notes || order.customer_notes) && (
                        <div className="p-2 rounded-lg bg-[#FEF3D9] border border-[#FCE1A8] text-[#2B2118] text-[11px] font-medium mt-1">
                          <span className="font-bold text-[#F5A623]">Rider Note: </span>
                          <span>{order.delivery_notes || order.customer_notes}</span>
                        </div>
                      )}
                    </div>

                    {/* Ordered Items */}
                    <div className="py-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold text-[#7A6A5C] uppercase tracking-wider">
                          Ordered Dishes ({order.items?.length || 0})
                        </p>
                        {order.status !== 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => setEditingOrderItems(order)}
                            className="text-[11px] font-bold text-[#F26B1D] hover:text-[#D95A12] bg-[#FFF1E6] hover:bg-[#FFE3D0] px-2.5 py-1 rounded-lg border border-[#F26B1D]/30 transition flex items-center gap-1 cursor-pointer"
                            title="Edit items, remove accidental items (e.g. water), or recalculate bill"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Edit Bill / Items</span>
                          </button>
                        )}
                      </div>
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

                    {/* Payment Status: Paid in Full */}
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-xs">
                      <div className="flex items-center gap-1.5 text-[#7A6A5C]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-bold text-[#2B2118]">Paid in Full</span>
                        {order.payment_method && (
                          <span className="text-[10px] uppercase font-mono text-slate-500">
                            • {order.payment_method === 'jazzcash'
                              ? 'JazzCash'
                              : order.payment_method === 'easypaisa'
                                ? 'Easypaisa'
                                : order.payment_method === 'cash_counter'
                                  ? 'Cash'
                                  : 'COD'}
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-black text-sm text-[#2B2118]">
                        {formatPKR(order.total_payable || 0)}
                      </span>
                    </div>

                    {/* Workflow Dominant Button + "..." Secondary Actions Menu */}
                    <div className="flex items-center gap-2 pt-1 relative">
                      {order.status === 'held' && (
                        <button
                          onClick={() => onUpdateStatus(order.id, 'new')}
                          className="flex-1 py-3 px-4 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] active:scale-[0.99] text-white text-sm font-extrabold transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-orange-500/20"
                        >
                          <Send className="w-4 h-4 text-white" />
                          <span>Resume & Send to Kitchen</span>
                        </button>
                      )}

                      {order.status === 'new' && (
                        <div className="flex items-center gap-2 flex-1">
                          <button
                            onClick={() => onUpdateStatus(order.id, 'preparing')}
                            className="flex-1 py-3 px-4 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] active:scale-[0.99] text-white text-sm font-extrabold transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-orange-500/20"
                          >
                            <ChefHat className="w-4 h-4 text-white" />
                            <span>Accept & Prepare</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onMuteOrderAlert && onMuteOrderAlert(order.id)}
                            className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center cursor-pointer shrink-0 ${mutedOrderIds.includes(order.id)
                                ? 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                                : 'bg-rose-50 text-rose-600 border-rose-300 hover:bg-rose-100 animate-pulse'
                              }`}
                            title={mutedOrderIds.includes(order.id) ? 'Alarm muted for this order (Click to unmute)' : 'Mute repeating alarm for this order'}
                          >
                            {mutedOrderIds.includes(order.id) ? (
                              <VolumeX className="w-4 h-4 text-slate-400" />
                            ) : (
                              <Volume2 className="w-4 h-4 text-rose-600" />
                            )}
                          </button>
                        </div>
                      )}

                      {order.status === 'preparing' && (
                        <button
                          onClick={() => onUpdateStatus(order.id, order.order_type === 'delivery' ? 'out_for_delivery' : 'ready')}
                          className="flex-1 py-3 px-4 rounded-xl bg-[#F5A623] hover:bg-[#D98E16] active:scale-[0.99] text-white text-sm font-extrabold transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-500/20"
                        >
                          {order.order_type === 'delivery' ? (
                            <>
                              <Truck className="w-4 h-4 text-white" />
                              <span>Dispatch for Delivery</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-white" />
                              <span>Mark Ready / Served</span>
                            </>
                          )}
                        </button>
                      )}

                      {(order.status === 'out_for_delivery' || order.status === 'ready') && (
                        <button
                          onClick={() => handleOrderStatusChange(order.id, 'completed')}
                          className="flex-1 py-3 px-4 rounded-xl bg-[#1F9D55] hover:bg-[#188044] active:scale-[0.99] text-white text-sm font-extrabold transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-green-500/20"
                        >
                          <CheckCircle2 className="w-4 h-4 text-white" />
                          <span>{order.order_type === 'delivery' ? 'Mark Delivered' : 'Complete Order'}</span>
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

                      {/* One Clear "Print" / "Reprint" Button with Dropdown Menu */}
                      <div className="relative">
                        <button
                          type="button"
                          id={`order-print-btn-${order.id}`}
                          disabled={directPrintingId === order.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePrintMenuOrderId(activePrintMenuOrderId === order.id ? null : order.id);
                          }}
                          className={`py-3 px-3.5 rounded-xl border text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0 ${isOrderPrinted(order.id)
                              ? 'bg-[#E7F6EC] border-[#A8E2BC] text-[#167840] hover:bg-[#D5F2DF]'
                              : 'bg-white border-[#F26B1D] text-[#F26B1D] hover:bg-[#FFF1E6]'
                            }`}
                          title={isOrderPrinted(order.id) ? 'Ticket already printed - Click to reprint' : 'Print ticket for this order'}
                        >
                          {directPrintingId === order.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : isOrderPrinted(order.id) ? (
                            <RotateCcw className="w-3.5 h-3.5" />
                          ) : (
                            <Printer className="w-3.5 h-3.5" />
                          )}
                          <span>{isOrderPrinted(order.id) ? 'Reprint' : 'Print'}</span>
                          <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                        </button>

                        {activePrintMenuOrderId === order.id && (
                          <>
                            <div
                              className="fixed inset-0 z-30"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivePrintMenuOrderId(null);
                              }}
                            />
                            <div className="absolute right-0 bottom-full mb-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                              <div className="px-3.5 py-1.5 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                <span>{isOrderPrinted(order.id) ? 'Reprint Tickets' : 'Print Ticket'}</span>
                                {isOrderPrinted(order.id) && (
                                  <span className="text-[#1F9D55] font-extrabold">✓ Printed</span>
                                )}
                              </div>

                              <button
                                type="button"
                                id={`print-kot-btn-${order.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrintTicket(order, TEMPLATE_TYPES.KOT);
                                  setActivePrintMenuOrderId(null);
                                }}
                                className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-[#FFF1E6] hover:text-[#F26B1D] flex items-center justify-between transition cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <ChefHat className="w-4 h-4 text-amber-500" />
                                  <span>{isOrderPrintedOnType(order.id, TEMPLATE_TYPES.KOT) ? 'Reprint KOT' : 'Print KOT'}</span>
                                </div>
                                {isOrderPrintedOnType(order.id, TEMPLATE_TYPES.KOT) && (
                                  <span className="text-[10px] text-emerald-600 font-semibold">✓</span>
                                )}
                              </button>

                              <button
                                type="button"
                                id={`print-bill-btn-${order.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrintTicket(order, TEMPLATE_TYPES.BILL);
                                  setActivePrintMenuOrderId(null);
                                }}
                                className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-[#FFF1E6] hover:text-[#F26B1D] flex items-center justify-between transition cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-blue-500" />
                                  <span>{isOrderPrintedOnType(order.id, TEMPLATE_TYPES.BILL) ? 'Reprint Bill' : 'Print Bill'}</span>
                                </div>
                                {isOrderPrintedOnType(order.id, TEMPLATE_TYPES.BILL) && (
                                  <span className="text-[10px] text-emerald-600 font-semibold">✓</span>
                                )}
                              </button>

                              <button
                                type="button"
                                id={`print-delivery-btn-${order.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrintTicket(order, TEMPLATE_TYPES.DELIVERY);
                                  setActivePrintMenuOrderId(null);
                                }}
                                className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-[#FFF1E6] hover:text-[#F26B1D] flex items-center justify-between transition cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <Truck className="w-4 h-4 text-emerald-600" />
                                  <span>{isOrderPrintedOnType(order.id, TEMPLATE_TYPES.DELIVERY) ? 'Reprint Delivery Slip' : 'Print Delivery Slip'}</span>
                                </div>
                                {isOrderPrintedOnType(order.id, TEMPLATE_TYPES.DELIVERY) && (
                                  <span className="text-[10px] text-emerald-600 font-semibold">✓</span>
                                )}
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      {/* "..." Dropdown Menu for secondary customer & status actions */}
                      <div className="relative">
                        <button
                          type="button"
                          id={`order-actions-btn-${order.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuOrderId((prev) => (prev === order.id ? null : order.id));
                          }}
                          className={`p-3 rounded-xl border text-slate-700 transition cursor-pointer flex items-center justify-center shrink-0 active:scale-95 ${
                            openMenuOrderId === order.id
                              ? 'bg-slate-200 border-slate-300'
                              : 'bg-slate-100 hover:bg-slate-200 border-slate-200 hover:border-slate-300'
                          }`}
                          title="More actions"
                          aria-label="More actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openMenuOrderId === order.id && (
                          <>
                            <div
                              className="fixed inset-0 z-30"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuOrderId(null);
                              }}
                            />
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 bottom-full mb-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100"
                            >
                              <div className="px-3.5 py-1.5 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Order #{order.id} Actions
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOrderDetails(order);
                                  setOpenMenuOrderId(null);
                                }}
                                className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-[#FFF1E6] hover:text-[#F26B1D] flex items-center gap-2.5 transition cursor-pointer"
                              >
                                <Eye className="w-4 h-4 text-[#F26B1D]" />
                                <span>View Full Details</span>
                              </button>

                              {/* Google Maps link */}
                              {(order.latitude || order.location_coords?.lat || order.customer_address) && (
                                <a
                                  href={buildGoogleMapsNavUrl(order)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => setOpenMenuOrderId(null)}
                                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 transition"
                                >
                                  <MapPin className="w-4 h-4 text-emerald-600" />
                                  <span>Open Google Maps</span>
                                </a>
                              )}

                              {/* Secondary Maps link: Open in OpenStreetMap */}
                              {(order.latitude || order.location_coords?.lat) && (
                                <a
                                  href={buildOsmNavUrl(
                                    order.latitude || order.location_coords?.lat,
                                    order.longitude || order.location_coords?.lng,
                                    18
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => setOpenMenuOrderId(null)}
                                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 transition"
                                >
                                  <ExternalLink className="w-4 h-4 text-slate-500" />
                                  <span>Open OpenStreetMap</span>
                                </a>
                              )}

                              {order.customer_address && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleCopyLocation(order);
                                    setOpenMenuOrderId(null);
                                  }}
                                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 transition cursor-pointer"
                                >
                                  {copiedLocationId === order.id ? (
                                    <Check className="w-4 h-4 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-4 h-4 text-slate-500" />
                                  )}
                                  <span className={copiedLocationId === order.id ? 'text-emerald-700 font-bold' : ''}>
                                    {copiedLocationId === order.id ? 'Copied Location!' : 'Copy Location Link'}
                                  </span>
                                </button>
                              )}

                              {order.customer_phone && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleSmsCustomer(order);
                                    setOpenMenuOrderId(null);
                                  }}
                                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition cursor-pointer"
                                >
                                  <MessageCircle className="w-4 h-4 text-slate-500" />
                                  <span>SMS / Message Customer</span>
                                </button>
                              )}

                              {order.status === 'completed' && (
                                <div className="pt-1 mt-1 border-t border-slate-100">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuOrderId(null);
                                      if (confirm(`Re-open order #${order.id} and send back to active kitchen?`)) {
                                        onUpdateStatus(order.id, 'preparing');
                                        setOrderStatusToast({
                                          message: `Order #${order.id} re-opened and sent back to Live Kitchen Orders!`,
                                          orderId: order.id,
                                        });
                                        setTimeout(() => setOrderStatusToast(null), 5000);
                                      }
                                    }}
                                    className="w-full px-3.5 py-2 text-left text-xs font-bold text-amber-700 hover:bg-amber-50 flex items-center gap-2.5 transition cursor-pointer"
                                  >
                                    <RotateCcw className="w-4 h-4 text-amber-600" />
                                    <span>Re-open to Kitchen</span>
                                  </button>
                                </div>
                              )}

                              {(order.status === 'new' || order.status === 'preparing') && (
                                <div className="pt-1 mt-1 border-t border-slate-100">
                                  <button
                                    type="button"
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
              );
            })}
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${modalTemplateType === TEMPLATE_TYPES.KOT
                      ? 'bg-white text-[#F26B1D] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  KOT Ticket
                </button>
                <button
                  type="button"
                  onClick={() => setModalTemplateType(TEMPLATE_TYPES.BILL)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${modalTemplateType === TEMPLATE_TYPES.BILL
                      ? 'bg-white text-[#F26B1D] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Customer Bill
                </button>
                <button
                  type="button"
                  onClick={() => setModalTemplateType(TEMPLATE_TYPES.DELIVERY)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${modalTemplateType === TEMPLATE_TYPES.DELIVERY
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
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer ${modalPaperSize === size
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
              <Suspense fallback={<div className="p-8 text-xs text-slate-500">Loading receipt preview...</div>}>
                <PrintTemplateRenderer
                  templateType={modalTemplateType}
                  paperSize={modalPaperSize}
                  order={printingOrder}
                  restaurant={restaurant}
                  settings={printerService.getTemplateSettings()}
                  isLivePrint={false}
                />
              </Suspense>
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

      {/* Edit Order Items & Recalculate Bill Modal */}
      {editingOrderItems && (
        <Suspense fallback={null}>
          <EditOrderItemsModal
            isOpen={Boolean(editingOrderItems)}
            onClose={() => setEditingOrderItems(null)}
            order={editingOrderItems}
            restaurant={restaurant}
            menuItems={menuItems}
            onOrderUpdated={() => {
              setEditingOrderItems(null);
            }}
            onPrintBill={(updatedOrder, templateType) => {
              handlePrintTicket(updatedOrder, templateType);
            }}
            onOpenPosForOrder={(ord) => {
              setEditingOrderItems(null);
              if (onOpenNewOrder) {
                const tblNum = ord.table_number || ord.table;
                const tableObj = tblNum ? { table_number: tblNum } : null;
                onOpenNewOrder(tableObj, ord.order_type || 'dine_in', ord.id);
              }
            }}
          />
        </Suspense>
      )}

      {/* Order Details Modal with Send to Rider Menu */}
      {selectedOrderDetails && (
        <Suspense fallback={null}>
          <OrderDetailsModal
            isOpen={Boolean(selectedOrderDetails)}
            onClose={() => setSelectedOrderDetails(null)}
            order={selectedOrderDetails}
            restaurant={restaurant}
            onUpdateStatus={onUpdateStatus}
            onPrintTicket={handlePrintTicket}
            onOrderUpdated={(updated) => {
              setSelectedOrderDetails(updated);
            }}
          />
        </Suspense>
      )}



      {/* Floating Status / Completion Toast */}
      {orderStatusToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-slate-900 text-white shadow-2xl flex items-center gap-3 border border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs font-bold">
            {orderStatusToast.message}
          </div>
          {onNavigateToCompleted && (
            <button
              type="button"
              onClick={() => {
                onNavigateToCompleted();
                setOrderStatusToast(null);
              }}
              className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition cursor-pointer"
            >
              View in Completed Tab →
            </button>
          )}
          <button
            type="button"
            onClick={() => setOrderStatusToast(null)}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
