import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Printer,
  Download,
  FileText,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Banknote,
  Smartphone,
  Calendar,
  Clock,
  Building2,
  CheckCircle,
  Search,
  Filter,
  ChevronDown,
  ArrowRight,
  Receipt,
  Utensils,
  Truck,
  Package,
  Layers,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { formatPKR } from '../../utils/currencyUtils';
import {
  DATE_PRESETS,
  filterOrdersByDate,
  generateFullReport,
} from '../../utils/orderReportUtils';
import OrderDetailsModal from '../Orders/OrderDetailsModal';

export default function TodaySalesSummaryModal({
  isOpen,
  onClose,
  restaurant,
  summaryData,
  onPrintThermal,
  orders = [],
  menuItems = [],
}) {
  const printRef = useRef(null);

  // Date & Time Filter State
  const [mode, setMode] = useState('today');
  const now = new Date();
  const todayIso = now.toISOString().split('T')[0];
  const currentMonthIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentYear = String(now.getFullYear());

  const [specificDate, setSpecificDate] = useState(todayIso);
  const [startTime, setStartTime] = useState('00:00');
  const [endTime, setEndTime] = useState('23:59');
  const [specificMonth, setSpecificMonth] = useState(currentMonthIso);
  const [specificYear, setSpecificYear] = useState(currentYear);
  const [startDate, setStartDate] = useState(todayIso);
  const [endDate, setEndDate] = useState(todayIso);
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [selectedDetailOrder, setSelectedDetailOrder] = useState(null);

  // Combine orders source: use passed orders, or fallback to summaryData?.orders
  const ordersPool = useMemo(() => {
    if (Array.isArray(orders) && orders.length > 0) return orders;
    if (summaryData?.orders && Array.isArray(summaryData.orders)) return summaryData.orders;
    return [];
  }, [orders, summaryData]);

  // Compute filtered orders and report metrics reactively
  const { filteredOrders, rangeLabel } = useMemo(() => {
    return filterOrdersByDate(ordersPool, {
      mode,
      specificDate,
      specificMonth,
      specificYear,
      startDate,
      startTime,
      endDate,
      endTime,
      includeCancelled,
    });
  }, [
    ordersPool,
    mode,
    specificDate,
    specificMonth,
    specificYear,
    startDate,
    startTime,
    endDate,
    endTime,
    includeCancelled,
  ]);

  const report = useMemo(() => {
    return generateFullReport(filteredOrders, rangeLabel);
  }, [filteredOrders, rangeLabel]);

  // Further filter orders table by search query
  const displayedOrders = useMemo(() => {
    if (!orderSearchQuery.trim()) return filteredOrders;
    const q = orderSearchQuery.toLowerCase().trim();
    return filteredOrders.filter((o) => {
      const matchId = (o.id || '').toLowerCase().includes(q);
      const matchName = (o.customer_name || '').toLowerCase().includes(q);
      const matchPhone = (o.customer_phone || '').toLowerCase().includes(q);
      const matchAddress = (o.customer_address || '').toLowerCase().includes(q);
      const matchTable = (o.table_number || '').toLowerCase().includes(q);
      const matchItem = Array.isArray(o.items) && o.items.some((it) => (it.title || '').toLowerCase().includes(q));
      return matchId || matchName || matchPhone || matchAddress || matchTable || matchItem;
    });
  }, [filteredOrders, orderSearchQuery]);

  if (!isOpen) return null;

  const handlePrintPdf = () => {
    window.print();
  };

  const handlePrintThermalClick = () => {
    if (onPrintThermal) {
      onPrintThermal({
        ...report,
        date: rangeLabel,
        time: report.generatedAtTime,
      });
    }
  };

  const restaurantName = restaurant?.name || 'Burger & Smoke Co.';
  const restaurantPhone = restaurant?.phone || restaurant?.whatsapp_number || '+92 300 1234567';
  const restaurantAddress = restaurant?.address || 'Islamabad, Pakistan';

  const formatOrderTimestamp = (isoString) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleString('en-PK', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (_) {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      {/* Modal Dialog Container */}
      <div className="bg-white w-full max-w-5xl rounded-3xl border border-[#F0E4D7] shadow-2xl flex flex-col max-h-[94vh] overflow-hidden my-auto">
        {/* Top Control Bar (Screen Only) */}
        <div className="p-4 sm:px-6 bg-white border-b border-[#F0E4D7] flex items-center justify-between gap-3 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold shadow-sm shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-black text-base sm:text-lg text-[#2B2118]">
                  Sales & Orders Report
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-orange-100 text-[#F26B1D] text-[10px] font-extrabold border border-orange-200">
                  Full Period Analytics
                </span>
              </div>
              <p className="text-xs text-[#7A6A5C]">
                Detailed sales statement, shift analytics & order list for selected date/time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onPrintThermal && (
              <button
                type="button"
                onClick={handlePrintThermalClick}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 transition cursor-pointer shadow-2xs"
                title="Print 80mm thermal slip copy for cash register"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>80mm Slip</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrintPdf}
              className="px-4 py-2 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] active:scale-98 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-orange-500/25 cursor-pointer"
              title="Print or Save complete report as PDF"
            >
              <Download className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer"
              title="Close report"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Date & Time Range Selector Filter Bar (Screen Only) */}
        <div className="p-4 sm:px-6 bg-[#FFF9F2] border-b border-[#F0E4D7] space-y-3 shrink-0 no-print">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
            <span className="text-xs text-[#7A6A5C] flex items-center gap-1 mr-1 shrink-0 font-medium">
              <Calendar className="w-3.5 h-3.5 text-[#F26B1D]" />
              <span>Period:</span>
            </span>
            {DATE_PRESETS.map((p) => {
              const isActive = mode === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setMode(p.id)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer text-xs ${
                    isActive
                      ? 'bg-[#F26B1D] text-white shadow-xs font-black'
                      : 'bg-white hover:bg-[#FFF1E6] text-[#7A6A5C] hover:text-[#2B2118] border border-[#F0E4D7]'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Granular Date & Time Controls based on Active Preset */}
          {(mode === 'specific_date' || mode === 'custom' || mode === 'specific_month' || mode === 'specific_year') && (
            <div className="p-3 bg-white rounded-2xl border border-[#F0E4D7] flex flex-wrap items-center gap-3 text-xs animate-fadeIn">
              {mode === 'specific_date' && (
                <>
                  <div className="flex items-center gap-1.5">
                    <label className="font-bold text-[#7A6A5C]">Select Day:</label>
                    <input
                      type="date"
                      value={specificDate}
                      onChange={(e) => setSpecificDate(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2] text-xs font-bold text-[#2B2118] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F26B1D]/20 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="font-bold text-[#7A6A5C]">From Time:</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2] text-xs font-bold text-[#2B2118] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F26B1D]/20 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="font-bold text-[#7A6A5C]">To Time:</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2] text-xs font-bold text-[#2B2118] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F26B1D]/20 cursor-pointer"
                    />
                  </div>
                </>
              )}

              {mode === 'specific_month' && (
                <div className="flex items-center gap-2">
                  <label className="font-bold text-[#7A6A5C]">Select Month & Year:</label>
                  <input
                    type="month"
                    value={specificMonth}
                    onChange={(e) => setSpecificMonth(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2] text-xs font-bold text-[#2B2118] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F26B1D]/20 cursor-pointer"
                  />
                </div>
              )}

              {mode === 'specific_year' && (
                <div className="flex items-center gap-2">
                  <label className="font-bold text-[#7A6A5C]">Select Year:</label>
                  <select
                    value={specificYear}
                    onChange={(e) => setSpecificYear(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2] text-xs font-bold text-[#2B2118] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F26B1D]/20 cursor-pointer"
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                  </select>
                </div>
              )}

              {mode === 'custom' && (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <label className="font-bold text-[#7A6A5C]">Start:</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2] text-xs font-bold text-[#2B2118] cursor-pointer"
                    />
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="px-2 py-1.5 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2] text-xs font-bold text-[#2B2118] cursor-pointer"
                    />
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <div className="flex items-center gap-1.5">
                    <label className="font-bold text-[#7A6A5C]">End:</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2] text-xs font-bold text-[#2B2118] cursor-pointer"
                    />
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="px-2 py-1.5 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2] text-xs font-bold text-[#2B2118] cursor-pointer"
                    />
                  </div>
                </div>
              )}

              <label className="flex items-center gap-1.5 ml-auto text-[#7A6A5C] cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCancelled}
                  onChange={(e) => setIncludeCancelled(e.target.checked)}
                  className="rounded text-[#F26B1D] focus:ring-[#F26B1D]"
                />
                <span>Include cancelled tickets</span>
              </label>
            </div>
          )}

          {/* Current Active Filter Badge */}
          <div className="flex items-center justify-between text-xs text-[#7A6A5C]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#2B2118]">Report Window:</span>
              <span className="px-2.5 py-0.5 rounded-lg bg-orange-100/80 text-orange-950 font-bold border border-orange-200">
                {rangeLabel}
              </span>
            </div>
            <div className="text-[11px] font-medium text-slate-500">
              Matching Records: <strong className="text-slate-900">{filteredOrders.length} orders</strong>
            </div>
          </div>
        </div>

        {/* Scrollable Printable Document Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50/50">
          {/* Printable A4 Paper Layout */}
          <div
            ref={printRef}
            id="executive-sales-report-document"
            className="bg-white max-w-4xl mx-auto p-6 sm:p-10 rounded-2xl border border-[#F0E4D7] shadow-sm space-y-7 text-[#2B2118] print:border-none print:shadow-none print:p-0 print:m-0"
          >
            {/* 1. Executive Document Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b-2 border-slate-900">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#F26B1D]" />
                  <span className="font-heading font-black text-xl sm:text-2xl text-[#2B2118] tracking-tight uppercase">
                    {restaurantName}
                  </span>
                </div>
                <div className="text-xs text-[#7A6A5C] mt-1 space-y-0.5">
                  <p>{restaurantAddress}</p>
                  <p>
                    Ph: <strong className="text-[#2B2118]">{restaurantPhone}</strong>
                  </p>
                </div>
              </div>

              <div className="sm:text-right">
                <span className="inline-block px-3 py-1 rounded-lg bg-slate-900 text-white font-mono font-bold text-xs uppercase tracking-wider">
                  SALES & ORDERS STATEMENT
                </span>
                <div className="text-xs text-[#7A6A5C] mt-2 space-y-0.5 font-mono">
                  <p>
                    <span className="text-slate-400">Period:</span> <strong className="text-slate-900">{rangeLabel}</strong>
                  </p>
                  <p>
                    <span className="text-slate-400">Generated:</span> <strong>{report.generatedAtDate} at {report.generatedAtTime}</strong>
                  </p>
                  <p>
                    <span className="text-slate-400">Register:</span> All In-Store & Online Channels
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Key Metrics Highlight Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-orange-50/70 border border-orange-200/80">
                <div className="flex items-center justify-between text-xs text-orange-950 font-bold mb-1">
                  <span>Gross Sales</span>
                  <DollarSign className="w-4 h-4 text-[#F26B1D]" />
                </div>
                <div className="text-xl sm:text-2xl font-mono font-black text-[#F26B1D]">
                  {formatPKR(report.grossSales)}
                </div>
                <div className="text-[11px] text-orange-800 mt-1">
                  Net total volume
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-xs text-slate-700 font-bold mb-1">
                  <span>Total Orders</span>
                  <ShoppingBag className="w-4 h-4 text-slate-600" />
                </div>
                <div className="text-xl sm:text-2xl font-mono font-black text-slate-900">
                  {report.totalOrders}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {report.statusBreakdown.completed} completed
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                <div className="flex items-center justify-between text-xs text-emerald-950 font-bold mb-1">
                  <span>Average Ticket (AOV)</span>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xl sm:text-2xl font-mono font-black text-emerald-700">
                  {formatPKR(report.averageOrderValue)}
                </div>
                <div className="text-[11px] text-emerald-800 mt-1">
                  Per customer average
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80">
                <div className="flex items-center justify-between text-xs text-amber-950 font-bold mb-1">
                  <span>Unpaid / Khata</span>
                  <Receipt className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-xl sm:text-2xl font-mono font-black text-amber-700">
                  {formatPKR(report.unpaidSummary.total)}
                </div>
                <div className="text-[11px] text-amber-800 mt-1">
                  {report.unpaidSummary.count} ticket(s) pending
                </div>
              </div>
            </div>

            {/* 3. Breakdown Grids: Payment Channels & Order Types */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Payment Channel Breakdown */}
              <div className="space-y-2">
                <h3 className="font-heading font-black text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5 text-slate-400" />
                  <span>Payment Channels</span>
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Channel</th>
                        <th className="py-2 px-2 text-center">Orders</th>
                        <th className="py-2 px-3 text-right">Volume</th>
                        <th className="py-2 px-2 text-right">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      <tr>
                        <td className="py-2 px-3 flex items-center gap-1.5">
                          <Banknote className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Cash (Counter / COD)</span>
                        </td>
                        <td className="py-2 px-2 text-center font-mono">{report.cashSales.count}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {formatPKR(report.cashSales.total)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-slate-500">
                          {report.cashSales.percentage}%
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span>Digital (JazzCash/Card)</span>
                        </td>
                        <td className="py-2 px-2 text-center font-mono">{report.onlineSales.count}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {formatPKR(report.onlineSales.total)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-slate-500">
                          {report.onlineSales.percentage}%
                        </td>
                      </tr>
                      <tr className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                        <td className="py-2 px-3">TOTAL RECONCILED</td>
                        <td className="py-2 px-2 text-center font-mono">{report.totalOrders}</td>
                        <td className="py-2 px-3 text-right font-mono text-[#F26B1D]">
                          {formatPKR(report.grossSales)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono">100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Order Types Breakdown (Dine-in / Delivery / Takeaway) */}
              <div className="space-y-2">
                <h3 className="font-heading font-black text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-slate-400" />
                  <span>Order Type Distribution</span>
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Service Type</th>
                        <th className="py-2 px-2 text-center">Orders</th>
                        <th className="py-2 px-3 text-right">Revenue</th>
                        <th className="py-2 px-2 text-right">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      <tr>
                        <td className="py-2 px-3 flex items-center gap-1.5">
                          <Utensils className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Dine-In Tables</span>
                        </td>
                        <td className="py-2 px-2 text-center font-mono">{report.orderTypeBreakdown.dineIn.count}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {formatPKR(report.orderTypeBreakdown.dineIn.total)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-slate-500">
                          {report.grossSales > 0 ? `${Math.round((report.orderTypeBreakdown.dineIn.total / report.grossSales) * 100)}%` : '0%'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>Home Delivery</span>
                        </td>
                        <td className="py-2 px-2 text-center font-mono">{report.orderTypeBreakdown.delivery.count}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {formatPKR(report.orderTypeBreakdown.delivery.total)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-slate-500">
                          {report.grossSales > 0 ? `${Math.round((report.orderTypeBreakdown.delivery.total / report.grossSales) * 100)}%` : '0%'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Takeaway / Pickup</span>
                        </td>
                        <td className="py-2 px-2 text-center font-mono">{report.orderTypeBreakdown.takeaway.count}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {formatPKR(report.orderTypeBreakdown.takeaway.total)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-slate-500">
                          {report.grossSales > 0 ? `${Math.round((report.orderTypeBreakdown.takeaway.total / report.grossSales) * 100)}%` : '0%'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 4. Top Best-Selling Menu Items */}
            {report.topItems && report.topItems.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-heading font-black text-xs uppercase tracking-wider text-slate-500">
                  Top Best-Selling Menu Items in this Period
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-8">#</th>
                        <th className="py-2.5 px-3">Dish / Item Name</th>
                        <th className="py-2.5 px-3 text-center">Quantity Sold</th>
                        <th className="py-2.5 px-3 text-right">Gross Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {report.topItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-mono font-bold text-slate-400">#{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-slate-800">{item.title}</td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-700">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                              {item.quantity}×
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-[#2B2118]">
                            {formatPKR(item.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. THE ORDERS IN THE FORM OF A LIST (User Requirement) */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-heading font-black text-sm uppercase tracking-wider text-[#2B2118] flex items-center gap-2">
                    <span>Orders List for this Period</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-mono font-bold">
                      {displayedOrders.length} {displayedOrders.length === 1 ? 'order' : 'orders'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Comprehensive ledger of individual tickets, customer information, ordered items and statuses
                  </p>
                </div>

                {/* Search input (Screen Only) */}
                <div className="relative no-print">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    placeholder="Search order ID, name, items..."
                    className="w-full sm:w-60 pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F26B1D]/20 focus:border-[#F26B1D] transition"
                  />
                </div>
              </div>

              {displayedOrders.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                  <Package className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No orders found matching this period / filter</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Try selecting a different date, month, or preset above.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                  <table className="w-full text-xs text-left min-w-[700px]">
                    <thead className="bg-slate-900 text-white uppercase font-bold text-[10px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Order ID</th>
                        <th className="py-2.5 px-3">Date & Time</th>
                        <th className="py-2.5 px-3">Customer / Table</th>
                        <th className="py-2.5 px-2 text-center">Type</th>
                        <th className="py-2.5 px-3">Items Summary</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                        <th className="py-2.5 px-2 text-center">Payment</th>
                        <th className="py-2.5 px-2 text-center">Status</th>
                        <th className="py-2.5 px-2 text-center no-print">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {displayedOrders.map((order) => {
                        const itemsSummary = Array.isArray(order.items)
                          ? order.items.map((it) => `${it.quantity || 1}× ${it.title}`).join(', ')
                          : '—';

                        const isPaid = order.payment_status === 'paid';
                        const isPartial = order.payment_status === 'partial';

                        return (
                          <tr key={order.id} className="hover:bg-slate-50/70 transition">
                            {/* Order ID */}
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                              #{order.id}
                            </td>

                            {/* Date & Time */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                              {formatOrderTimestamp(order.created_at)}
                            </td>

                            {/* Customer / Table */}
                            <td className="py-2.5 px-3 max-w-[170px]">
                              <div className="font-bold text-slate-900 truncate">
                                {order.customer_name || 'Walk-in Customer'}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">
                                {order.table_number
                                  ? `Table ${order.table_number}`
                                  : order.customer_address
                                  ? order.customer_address
                                  : order.customer_phone || 'In-Store'}
                              </div>
                            </td>

                            {/* Type */}
                            <td className="py-2.5 px-2 text-center whitespace-nowrap">
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
                            <td className="py-2.5 px-3 max-w-[200px]">
                              <span className="line-clamp-2 text-slate-700 text-[11px]" title={itemsSummary}>
                                {itemsSummary}
                              </span>
                            </td>

                            {/* Amount */}
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                              {formatPKR(order.total_payable || 0)}
                            </td>

                            {/* Payment */}
                            <td className="py-2.5 px-2 text-center whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isPaid
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : isPartial
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}
                              >
                                {isPaid ? 'PAID' : isPartial ? 'PARTIAL' : 'UNPAID'}
                              </span>
                            </td>

                            {/* Status */}
                            <td className="py-2.5 px-2 text-center whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold capitalize ${
                                  order.status === 'completed'
                                    ? 'bg-slate-100 text-slate-700'
                                    : order.status === 'cancelled'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-orange-100 text-orange-800 font-extrabold'
                                }`}
                              >
                                {order.status ? order.status.replace(/_/g, ' ') : 'new'}
                              </span>
                            </td>

                            {/* Action (Screen Only) */}
                            <td className="py-2.5 px-2 text-center whitespace-nowrap no-print">
                              <button
                                type="button"
                                onClick={() => setSelectedDetailOrder(order)}
                                className="p-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition cursor-pointer inline-flex items-center gap-1"
                                title="View complete order receipt details"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 6. Document Footer & Certification */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>Verified System Ledger • Dineflow Restaurant Platform</span>
              </div>
              <div className="font-mono text-[10px]">
                Report Ref: DINE-{Date.now().toString(36).toUpperCase()} • {rangeLabel}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Order Details Modal if user clicks 'View' on any order */}
      {selectedDetailOrder && (
        <OrderDetailsModal
          order={selectedDetailOrder}
          onClose={() => setSelectedDetailOrder(null)}
          restaurant={restaurant}
          onUpdateStatus={() => {}}
        />
      )}
    </div>
  );
}
