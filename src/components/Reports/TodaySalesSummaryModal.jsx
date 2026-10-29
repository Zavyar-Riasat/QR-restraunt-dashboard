import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  CheckCircle,
  Search,
  ArrowRight,
  Utensils,
  Truck,
  Package,
  Layers,
  Eye,
} from 'lucide-react';
import { formatPKR } from '../../utils/currencyUtils';
import {
  DATE_PRESETS,
  filterOrdersByDate,
  generateFullReport,
} from '../../utils/orderReportUtils';
import OrderDetailsModal from '../Orders/OrderDetailsModal';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default function TodaySalesSummaryModal({
  isOpen,
  onClose,
  restaurant,
  summaryData,
  onPrintThermal,
  orders = [],
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

  // Stable report reference code per modal session
  const reportRefCode = useMemo(() => {
    return `DINE-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  }, []);

  // Toggle body print helper class while modal is open so native Ctrl+P never repeats fixed modal across 8 pages
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;
    document.body.classList.add('sales-report-modal-open');
    return () => {
      document.body.classList.remove('sales-report-modal-open');
    };
  }, [isOpen]);

  // Combine orders source: use passed orders, or fallback to summaryData?.orders
  const ordersPool = useMemo(() => {
    if (Array.isArray(orders) && orders.length > 0) return orders;
    if (summaryData?.orders && Array.isArray(summaryData.orders)) return summaryData.orders;
    return [];
  }, [orders, summaryData]);

  // Compute filtered orders and report metrics reactively
  const { filteredOrders, label: computedLabel } = useMemo(() => {
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

  const rangeLabel = computedLabel || 'Today';

  const report = useMemo(() => {
    return generateFullReport(filteredOrders, rangeLabel);
  }, [filteredOrders, rangeLabel]);

  // Further filter orders table by search query
  const displayedOrders = useMemo(() => {
    if (!orderSearchQuery.trim()) return report.orders || filteredOrders;
    const q = orderSearchQuery.toLowerCase().trim();
    return (report.orders || filteredOrders).filter((o) => {
      const matchId = (o.id || '').toLowerCase().includes(q);
      const matchName = (o.customer_name || '').toLowerCase().includes(q);
      const matchPhone = (o.customer_phone || '').toLowerCase().includes(q);
      const matchAddress = (o.customer_address || '').toLowerCase().includes(q);
      const matchTable = (o.table_number || '').toLowerCase().includes(q);
      const matchItem =
        Array.isArray(o.items) &&
        o.items.some((it) => (it.title || '').toLowerCase().includes(q));
      return matchId || matchName || matchPhone || matchAddress || matchTable || matchItem;
    });
  }, [report.orders, filteredOrders, orderSearchQuery]);

  const displayedTotalAmount = useMemo(() => {
    return displayedOrders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (Number(o.total_payable) || 0), 0);
  }, [displayedOrders]);

  if (!isOpen) return null;

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
    } catch  {
      return isoString;
    }
  };

  const getOrderTypeLabel = (order) => {
    const type = (order.order_type || '').toLowerCase();
    if (type.includes('dine') || order.table_number) {
      return order.table_number ? `Dine-In • T${order.table_number}` : 'Dine-In';
    }
    if (type.includes('takeaway') || type.includes('pickup')) {
      return 'Takeaway';
    }
    return 'Delivery';
  };

  const getPaymentMethodLabel = (order) => {
    const method = (order.payment_method || '').toLowerCase();
    if (
      method.includes('online') ||
      method.includes('card') ||
      method.includes('jazzcash') ||
      method.includes('easypaisa') ||
      method.includes('bank')
    ) {
      return 'Online / Card';
    }
    return 'Cash';
  };

  /**
   * Dedicated Single-Document A4 Print / PDF Generator
   * Uses an isolated hidden iframe so the browser prints ONLY the clean A4 statement
   * (never repeating a position:fixed modal across 8 background dashboard pages).
   */
  const handlePrintPdf = () => {
    if (typeof document === 'undefined') return;

    const existingFrame = document.getElementById('dineflow-sales-report-print-frame');
    if (existingFrame && existingFrame.parentNode) {
      existingFrame.parentNode.removeChild(existingFrame);
    }

    const dineInShare =
      report.grossSales > 0
        ? Math.round((report.orderTypeBreakdown.dineIn.total / report.grossSales) * 100)
        : 0;
    const deliveryShare =
      report.grossSales > 0
        ? Math.round((report.orderTypeBreakdown.delivery.total / report.grossSales) * 100)
        : 0;
    const takeawayShare =
      report.grossSales > 0
        ? Math.round((report.orderTypeBreakdown.takeaway.total / report.grossSales) * 100)
        : 0;

    const topItemsRowsHtml =
      report.topItems && report.topItems.length > 0
        ? report.topItems
            .map((item, idx) => {
              const itemShare =
                report.grossSales > 0
                  ? Math.round((item.revenue / report.grossSales) * 100)
                  : 0;
              return `
                <tr>
                  <td class="mono muted">#${idx + 1}</td>
                  <td class="bold">${escapeHtml(item.title)}</td>
                  <td class="center mono bold">${item.quantity}&times;</td>
                  <td class="right mono muted">${itemShare}%</td>
                  <td class="right mono bold">${escapeHtml(formatPKR(item.revenue))}</td>
                </tr>
              `;
            })
            .join('')
        : `<tr><td colspan="5" class="center muted">No menu items recorded in this period.</td></tr>`;

    const ordersRowsHtml =
      displayedOrders.length > 0
        ? displayedOrders
            .map((order, _idx) => {
              const itemsSummary = Array.isArray(order.items)
                ? order.items
                    .map((it) => `${it.quantity || 1}x ${it.title || 'Item'}`)
                    .join(', ')
                : '—';
              const customerSubtitle = order.table_number
                ? `Table ${order.table_number}`
                : order.customer_address || order.customer_phone || 'In-Store';
              const statusLabel = (order.status || 'new').replace(/_/g, ' ').toUpperCase();

              return `
                <tr>
                  <td class="mono bold nowrap">
                    <div>#${escapeHtml(order.id)}</div>
                    <div class="subtext">${escapeHtml(formatOrderTimestamp(order.created_at))}</div>
                  </td>
                  <td>
                    <div class="bold">${escapeHtml(order.customer_name || 'Walk-in Guest')}</div>
                    <div class="subtext">${escapeHtml(customerSubtitle)}</div>
                  </td>
                  <td class="center nowrap">
                    <span class="badge">${escapeHtml(getOrderTypeLabel(order))}</span>
                  </td>
                  <td class="items-cell">${escapeHtml(itemsSummary)}</td>
                  <td class="center nowrap">
                    <div class="bold" style="color:#15803d;">PAID</div>
                    <div class="subtext">${escapeHtml(getPaymentMethodLabel(order))}</div>
                  </td>
                  <td class="center nowrap">
                    <span class="badge">${escapeHtml(statusLabel)}</span>
                  </td>
                  <td class="right mono bold nowrap">${escapeHtml(formatPKR(order.total_payable || 0))}</td>
                </tr>
              `;
            })
            .join('')
        : `<tr><td colspan="7" class="center muted">No orders recorded for this period.</td></tr>`;

    const htmlDocument = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Sales & Orders Report - ${escapeHtml(restaurantName)} (${escapeHtml(rangeLabel)})</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #1e293b;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
    }
    .report-sheet {
      width: 100%;
    }
    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 12px;
      border-bottom: 2px solid #0f172a;
      margin-bottom: 14px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.3px;
      text-transform: uppercase;
      margin: 0 0 3px 0;
    }
    .brand-meta {
      font-size: 10.5px;
      color: #475569;
      margin: 1px 0;
    }
    .doc-box {
      text-align: right;
    }
    .doc-badge {
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.8px;
      padding: 4px 10px;
      border-radius: 5px;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .doc-meta {
      font-size: 10px;
      color: #475569;
      margin: 1.5px 0;
    }
    .doc-meta strong {
      color: #0f172a;
    }

    /* KPI Strip */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }
    .kpi-card {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 9px 11px;
      background: #f8fafc;
    }
    .kpi-card.primary {
      background: #fff7ed;
      border-color: #fdba74;
    }
    .kpi-label {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #475569;
      margin-bottom: 3px;
    }
    .kpi-value {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    }
    .kpi-card.primary .kpi-value {
      color: #ea580c;
    }
    .kpi-sub {
      font-size: 9.5px;
      color: #64748b;
      margin-top: 2px;
    }

    /* Two-column tables */
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
    }
    .section-title {
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
      margin: 0 0 6px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #cbd5e1;
      font-size: 10.5px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-size: 9.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      padding: 6px 8px;
      text-align: left;
      border-bottom: 1px solid #cbd5e1;
    }
    .orders-table th {
      background: #0f172a;
      color: #ffffff;
      border-bottom: 1px solid #0f172a;
    }
    td {
      padding: 6px 8px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }
    tfoot td {
      background: #f8fafc;
      font-weight: 800;
      border-top: 1.5px solid #94a3b8;
      border-bottom: none;
    }
    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .section-block {
      margin-bottom: 14px;
    }
    .right { text-align: right; }
    .center { text-align: center; }
    .bold { font-weight: 700; color: #0f172a; }
    .muted { color: #64748b; }
    .nowrap { white-space: nowrap; }
    .mono { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
    .subtext { font-size: 9.5px; color: #64748b; margin-top: 1px; font-weight: 400; }
    .items-cell { max-width: 240px; word-break: break-word; color: #334155; }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 700;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #1e293b;
    }
    .footer {
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9.5px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="report-sheet">
    <!-- 1. Header -->
    <div class="header">
      <div>
        <h1 class="brand-title">${escapeHtml(restaurantName)}</h1>
        <p class="brand-meta">${escapeHtml(restaurantAddress)}</p>
        <p class="brand-meta">Phone: <strong>${escapeHtml(restaurantPhone)}</strong></p>
      </div>
      <div class="doc-box">
        <div class="doc-badge">Official Sales &amp; Orders Report</div>
        <p class="doc-meta">Reporting Window: <strong>${escapeHtml(rangeLabel)}</strong></p>
        <p class="doc-meta">Generated: <strong>${escapeHtml(report.generatedAtDate)} at ${escapeHtml(report.generatedAtTime)}</strong></p>
        <p class="doc-meta">Reference ID: <strong>${escapeHtml(reportRefCode)}</strong></p>
      </div>
    </div>

    <!-- 2. KPI Summary Cards -->
    <div class="kpi-grid">
      <div class="kpi-card primary">
        <div class="kpi-label">Gross Revenue</div>
        <div class="kpi-value">${escapeHtml(formatPKR(report.grossSales))}</div>
        <div class="kpi-sub">Total settled sales volume</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Orders</div>
        <div class="kpi-value">${report.totalOrders}</div>
        <div class="kpi-sub">${report.statusBreakdown.completed} completed &bull; ${report.statusBreakdown.active} active</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Average Ticket (AOV)</div>
        <div class="kpi-value">${escapeHtml(formatPKR(report.averageOrderValue))}</div>
        <div class="kpi-sub">Per order revenue average</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Items Sold</div>
        <div class="kpi-value">${report.totalItemsSold || 0}</div>
        <div class="kpi-sub">Across ${report.uniqueDishesCount || 0} menu items</div>
      </div>
    </div>

    <!-- 3. Side-by-Side Payment & Service Type Breakdowns -->
    <div class="two-col">
      <div>
        <h3 class="section-title">Payment Channel Breakdown</h3>
        <table>
          <thead>
            <tr>
              <th>Channel</th>
              <th class="center">Orders</th>
              <th class="right">Volume</th>
              <th class="right">Share</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="bold">Cash (Counter / COD)</td>
              <td class="center mono">${report.cashSales.count}</td>
              <td class="right mono bold nowrap">${escapeHtml(formatPKR(report.cashSales.total))}</td>
              <td class="right mono muted">${report.cashSales.percentage}%</td>
            </tr>
            <tr>
              <td class="bold">Digital (Online / Card)</td>
              <td class="center mono">${report.onlineSales.count}</td>
              <td class="right mono bold nowrap">${escapeHtml(formatPKR(report.onlineSales.total))}</td>
              <td class="right mono muted">${report.onlineSales.percentage}%</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td>TOTAL RECONCILED</td>
              <td class="center mono">${report.totalOrders}</td>
              <td class="right mono nowrap" style="color:#ea580c;">${escapeHtml(formatPKR(report.grossSales))}</td>
              <td class="right mono">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div>
        <h3 class="section-title">Service Type Breakdown</h3>
        <table>
          <thead>
            <tr>
              <th>Service Type</th>
              <th class="center">Orders</th>
              <th class="right">Revenue</th>
              <th class="right">Share</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="bold">Dine-In Tables</td>
              <td class="center mono">${report.orderTypeBreakdown.dineIn.count}</td>
              <td class="right mono bold nowrap">${escapeHtml(formatPKR(report.orderTypeBreakdown.dineIn.total))}</td>
              <td class="right mono muted">${dineInShare}%</td>
            </tr>
            <tr>
              <td class="bold">Home Delivery</td>
              <td class="center mono">${report.orderTypeBreakdown.delivery.count}</td>
              <td class="right mono bold nowrap">${escapeHtml(formatPKR(report.orderTypeBreakdown.delivery.total))}</td>
              <td class="right mono muted">${deliveryShare}%</td>
            </tr>
            <tr>
              <td class="bold">Takeaway / Pickup</td>
              <td class="center mono">${report.orderTypeBreakdown.takeaway.count}</td>
              <td class="right mono bold nowrap">${escapeHtml(formatPKR(report.orderTypeBreakdown.takeaway.total))}</td>
              <td class="right mono muted">${takeawayShare}%</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td>TOTAL ORDERS</td>
              <td class="center mono">${report.totalOrders}</td>
              <td class="right mono nowrap" style="color:#ea580c;">${escapeHtml(formatPKR(report.grossSales))}</td>
              <td class="right mono">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- 4. Top Selling Menu Items -->
    <div class="section-block">
      <h3 class="section-title">Top Selling Menu Items (${escapeHtml(rangeLabel)})</h3>
      <table>
        <thead>
          <tr>
            <th style="width:45px;">Rank</th>
            <th>Dish / Menu Item</th>
            <th class="center" style="width:90px;">Qty Sold</th>
            <th class="right" style="width:80px;">Rev Share</th>
            <th class="right" style="width:120px;">Gross Revenue</th>
          </tr>
        </thead>
        <tbody>
          ${topItemsRowsHtml}
        </tbody>
      </table>
    </div>

    <!-- 5. Detailed Orders Ledger -->
    <div class="section-block">
      <h3 class="section-title">Detailed Orders Ledger (${displayedOrders.length} ${displayedOrders.length === 1 ? 'Order' : 'Orders'})</h3>
      <table class="orders-table">
        <thead>
          <tr>
            <th style="width:125px;">Order # &amp; Time</th>
            <th style="width:140px;">Customer / Table</th>
            <th class="center" style="width:75px;">Type</th>
            <th>Ordered Items</th>
            <th class="center" style="width:75px;">Payment</th>
            <th class="center" style="width:75px;">Status</th>
            <th class="right" style="width:95px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${ordersRowsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="6" class="right">TOTAL SETTLED REVENUE (${displayedOrders.length} ORDERS)</td>
            <td class="right mono nowrap" style="color:#ea580c;font-size:11.5px;">${escapeHtml(formatPKR(displayedTotalAmount))}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- 6. Footer -->
    <div class="footer">
      <div>Verified System Financial Statement &bull; Dineflow Restaurant Management Platform</div>
      <div class="mono">Ref: ${escapeHtml(reportRefCode)} &bull; Window: ${escapeHtml(rangeLabel)}</div>
    </div>
  </div>
</body>
</html>`;

    const iframe = document.createElement('iframe');
    iframe.id = 'dineflow-sales-report-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const frameWindow = iframe.contentWindow;
    const frameDoc = iframe.contentDocument || frameWindow?.document;
    if (!frameDoc || !frameWindow) {
      window.print();
      return;
    }

    frameDoc.open();
    frameDoc.write(htmlDocument);
    frameDoc.close();

    let printed = false;
    const triggerPrint = () => {
      if (printed) return;
      printed = true;
      try {
        frameWindow.focus();
        frameWindow.print();
      } catch  {
        window.print();
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 2000);
      }
    };

    iframe.onload = () => setTimeout(triggerPrint, 120);
    setTimeout(triggerPrint, 350);
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

  return (
    <div
      id="sales-report-modal-root"
      className="fixed inset-0 z-60 bg-black/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn"
    >
      {/* Modal Dialog Container */}
      <div
        id="sales-report-modal-dialog"
        className="bg-white w-full max-w-5xl rounded-3xl border border-[#F0E4D7] shadow-2xl flex flex-col max-h-[94vh] overflow-hidden my-auto"
      >
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
                <span className="px-2.5 py-0.5 rounded-full bg-[#FFF1E6] text-[#F26B1D] text-[10px] font-extrabold border border-[#FCD8BF]">
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
              title="Print or Save clean single-document A4 PDF report"
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
          {(mode === 'specific_date' ||
            mode === 'custom' ||
            mode === 'specific_month' ||
            mode === 'specific_year') && (
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
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#7A6A5C]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#2B2118]">Report Window:</span>
              <span className="px-3 py-1 rounded-lg bg-[#FFF1E6] text-[#2B2118] font-bold border border-[#FCD8BF]">
                {rangeLabel}
              </span>
            </div>
            <div className="text-xs font-medium text-slate-600">
              Matching Records:{' '}
              <strong className="text-slate-900">
                {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
              </strong>
            </div>
          </div>
        </div>

        {/* Scrollable Printable Document Body */}
        <div
          id="sales-report-modal-scroll"
          className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/60"
        >
          {/* Printable A4 Paper Layout */}
          <div
            ref={printRef}
            id="executive-sales-report-document"
            className="bg-white max-w-4xl mx-auto p-5 sm:p-8 rounded-2xl border border-[#F0E4D7] shadow-sm space-y-6 text-[#2B2118]"
          >
            {/* 1. Executive Document Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b-2 border-slate-900">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#F26B1D] shrink-0" />
                  <span className="font-heading font-black text-xl sm:text-2xl text-[#2B2118] tracking-tight uppercase">
                    {restaurantName}
                  </span>
                </div>
                <div className="text-xs text-[#7A6A5C] mt-1.5 space-y-0.5">
                  <p>{restaurantAddress}</p>
                  <p>
                    Phone: <strong className="text-[#2B2118]">{restaurantPhone}</strong>
                  </p>
                </div>
              </div>

              <div className="sm:text-right">
                <span className="inline-block px-3 py-1 rounded-lg bg-slate-900 text-white font-mono font-bold text-[11px] uppercase tracking-wider">
                  OFFICIAL SALES &amp; ORDERS STATEMENT
                </span>
                <div className="text-xs text-[#7A6A5C] mt-2 space-y-0.5 font-mono">
                  <p>
                    <span className="text-slate-400">Period:</span>{' '}
                    <strong className="text-slate-900">{rangeLabel}</strong>
                  </p>
                  <p>
                    <span className="text-slate-400">Generated:</span>{' '}
                    <strong className="text-slate-800">
                      {report.generatedAtDate} at {report.generatedAtTime}
                    </strong>
                  </p>
                  <p>
                    <span className="text-slate-400">Reference:</span>{' '}
                    <strong className="text-slate-800">{reportRefCode}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Key Metrics Highlight Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-[#FFF9F2] border border-[#FCD8BF]">
                <div className="flex items-center justify-between text-xs text-[#7A6A5C] font-bold mb-1">
                  <span>Gross Revenue</span>
                  <DollarSign className="w-4 h-4 text-[#F26B1D]" />
                </div>
                <div className="text-xl sm:text-2xl font-mono font-black text-[#F26B1D] whitespace-nowrap">
                  {formatPKR(report.grossSales)}
                </div>
                <div className="text-[11px] text-[#7A6A5C] mt-1">
                  Total settled sales volume
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
                  {report.statusBreakdown.completed} completed • {report.statusBreakdown.active} active
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <div className="flex items-center justify-between text-xs text-emerald-900 font-bold mb-1">
                  <span>Average Ticket (AOV)</span>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xl sm:text-2xl font-mono font-black text-emerald-700 whitespace-nowrap">
                  {formatPKR(report.averageOrderValue)}
                </div>
                <div className="text-[11px] text-emerald-800 mt-1">
                  Per order revenue average
                </div>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200">
                <div className="flex items-center justify-between text-xs text-indigo-950 font-bold mb-1">
                  <span>Total Items Sold</span>
                  <Layers className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-xl sm:text-2xl font-mono font-black text-indigo-700">
                  {report.totalItemsSold || 0}
                </div>
                <div className="text-[11px] text-indigo-800 mt-1">
                  Across {report.uniqueDishesCount || 0} menu items
                </div>
              </div>
            </div>

            {/* 3. Breakdown Grids: Payment Channels & Order Types */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Payment Channel Breakdown */}
              <div className="space-y-2 flex flex-col">
                <h3 className="font-heading font-black text-xs uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5 text-[#F26B1D]" />
                  <span>Payment Channels</span>
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden flex-1 bg-white">
                  <table className="w-full text-xs text-left h-full">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Channel</th>
                        <th className="py-2.5 px-2 text-center">Orders</th>
                        <th className="py-2.5 px-3 text-right">Volume</th>
                        <th className="py-2.5 px-2.5 text-right">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      <tr>
                        <td className="py-2.5 px-3 flex items-center gap-1.5">
                          <Banknote className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Cash (Counter / COD)</span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono">
                          {report.cashSales.count}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatPKR(report.cashSales.total)}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono text-slate-500 whitespace-nowrap">
                          {report.cashSales.percentage}%
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span>Digital (Online / Card)</span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono">
                          {report.onlineSales.count}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatPKR(report.onlineSales.total)}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono text-slate-500 whitespace-nowrap">
                          {report.onlineSales.percentage}%
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                        <td className="py-2.5 px-3">TOTAL RECONCILED</td>
                        <td className="py-2.5 px-2 text-center font-mono">{report.totalOrders}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-[#F26B1D] whitespace-nowrap">
                          {formatPKR(report.grossSales)}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Order Types Breakdown (Dine-in / Delivery / Takeaway) */}
              <div className="space-y-2 flex flex-col">
                <h3 className="font-heading font-black text-xs uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-[#F26B1D]" />
                  <span>Order Type Distribution</span>
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden flex-1 bg-white">
                  <table className="w-full text-xs text-left h-full">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Service Type</th>
                        <th className="py-2.5 px-2 text-center">Orders</th>
                        <th className="py-2.5 px-3 text-right">Revenue</th>
                        <th className="py-2.5 px-2.5 text-right">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      <tr>
                        <td className="py-2 px-3 flex items-center gap-1.5">
                          <Utensils className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Dine-In Tables</span>
                        </td>
                        <td className="py-2 px-2 text-center font-mono">
                          {report.orderTypeBreakdown.dineIn.count}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatPKR(report.orderTypeBreakdown.dineIn.total)}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono text-slate-500 whitespace-nowrap">
                          {report.grossSales > 0
                            ? `${Math.round((report.orderTypeBreakdown.dineIn.total / report.grossSales) * 100)}%`
                            : '0%'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>Home Delivery</span>
                        </td>
                        <td className="py-2 px-2 text-center font-mono">
                          {report.orderTypeBreakdown.delivery.count}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatPKR(report.orderTypeBreakdown.delivery.total)}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono text-slate-500 whitespace-nowrap">
                          {report.grossSales > 0
                            ? `${Math.round((report.orderTypeBreakdown.delivery.total / report.grossSales) * 100)}%`
                            : '0%'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Takeaway / Pickup</span>
                        </td>
                        <td className="py-2 px-2 text-center font-mono">
                          {report.orderTypeBreakdown.takeaway.count}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatPKR(report.orderTypeBreakdown.takeaway.total)}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono text-slate-500 whitespace-nowrap">
                          {report.grossSales > 0
                            ? `${Math.round((report.orderTypeBreakdown.takeaway.total / report.grossSales) * 100)}%`
                            : '0%'}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                        <td className="py-2 px-3">TOTAL ORDERS</td>
                        <td className="py-2 px-2 text-center font-mono">{report.totalOrders}</td>
                        <td className="py-2 px-3 text-right font-mono text-[#F26B1D] whitespace-nowrap">
                          {formatPKR(report.grossSales)}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* 4. Top Best-Selling Menu Items */}
            {report.topItems && report.topItems.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-heading font-black text-xs uppercase tracking-wider text-slate-600">
                  Top Best-Selling Menu Items in this Period
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-12">Rank</th>
                        <th className="py-2.5 px-3">Dish / Item Name</th>
                        <th className="py-2.5 px-3 text-center w-28">Qty Sold</th>
                        <th className="py-2.5 px-3 text-right w-24">Share</th>
                        <th className="py-2.5 px-3 text-right w-32">Gross Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {report.topItems.map((item, idx) => {
                        const sharePct =
                          report.grossSales > 0
                            ? Math.round((item.revenue / report.grossSales) * 100)
                            : 0;
                        return (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="py-2 px-3 font-mono font-bold text-slate-400">
                              #{idx + 1}
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-800">{item.title}</td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-slate-700">
                              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                                {item.quantity}×
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-500">
                              {sharePct}%
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-[#2B2118] whitespace-nowrap">
                              {formatPKR(item.revenue)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. Detailed Orders List for this Period (Zero Horizontal Overflow) */}
            <div className="space-y-3 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-heading font-black text-sm uppercase tracking-wider text-[#2B2118] flex items-center gap-2">
                    <span>Orders List for this Period</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-mono font-bold">
                      {displayedOrders.length} {displayedOrders.length === 1 ? 'order' : 'orders'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Complete ledger of individual tickets, customer details, ordered items and settlement status
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
                    className="w-full sm:w-64 pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F26B1D]/20 focus:border-[#F26B1D] transition"
                  />
                </div>
              </div>

              {displayedOrders.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                  <Package className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">
                    No orders found matching this period / filter
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Try selecting a different date, month, or preset above.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-900 text-white uppercase font-bold text-[10px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Order &amp; Time</th>
                        <th className="py-2.5 px-3">Customer &amp; Channel</th>
                        <th className="py-2.5 px-3">Ordered Items</th>
                        <th className="py-2.5 px-2.5 text-center">Payment &amp; Status</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                        <th className="py-2.5 px-2.5 text-center no-print">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {displayedOrders.map((order) => {
                        const itemsList = Array.isArray(order.items) ? order.items : [];
                        const customerSubtitle = order.table_number
                          ? `Table ${order.table_number}`
                          : order.customer_address || order.customer_phone || 'In-Store';

                        return (
                          <tr key={order.id} className="hover:bg-slate-50/80 transition align-top">
                            {/* Order ID & Date/Time */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="font-mono font-black text-slate-900 text-xs">
                                #{order.id}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                {formatOrderTimestamp(order.created_at)}
                              </div>
                            </td>

                            {/* Customer / Address / Type Badge */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900">
                                  {order.customer_name || 'Walk-in Customer'}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    order.order_type === 'dine_in' || order.table_number
                                      ? 'bg-purple-100 text-purple-800'
                                      : order.order_type === 'delivery'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {getOrderTypeLabel(order)}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                                {customerSubtitle}
                              </div>
                            </td>

                            {/* Ordered Items (Readable multi-item breakdown) */}
                            <td className="py-3 px-3">
                              {itemsList.length > 0 ? (
                                <div className="space-y-0.5 text-[11px] text-slate-700">
                                  {itemsList.map((it, idx) => (
                                    <div key={idx} className="leading-snug">
                                      <span className="font-mono font-bold text-slate-900">
                                        {it.quantity || 1}×
                                      </span>{' '}
                                      <span>{it.title}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            {/* Payment & Order Status */}
                            <td className="py-3 px-2.5 text-center whitespace-nowrap">
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <span>PAID</span>
                                <span className="text-emerald-600">•</span>
                                <span>{getPaymentMethodLabel(order)}</span>
                              </div>
                              <div className="mt-1">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold capitalize ${
                                    order.status === 'completed'
                                      ? 'bg-slate-100 text-slate-700'
                                      : order.status === 'cancelled'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-orange-100 text-orange-800 font-extrabold'
                                  }`}
                                >
                                  {order.status ? order.status.replace(/_/g, ' ') : 'new'}
                                </span>
                              </div>
                            </td>

                            {/* Total Amount */}
                            <td className="py-3 px-3 text-right font-mono font-black text-slate-900 whitespace-nowrap text-xs">
                              {formatPKR(order.total_payable || 0)}
                            </td>

                            {/* Action (Screen Only) */}
                            <td className="py-3 px-2.5 text-center whitespace-nowrap no-print">
                              <button
                                type="button"
                                onClick={() => setSelectedDetailOrder(order)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition cursor-pointer inline-flex items-center gap-1"
                                title="View complete order receipt details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold text-slate-900">
                        <td colSpan={4} className="py-3 px-3 text-right uppercase text-[11px] tracking-wider">
                          Total Period Revenue ({displayedOrders.length}{' '}
                          {displayedOrders.length === 1 ? 'Order' : 'Orders'})
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-sm text-[#F26B1D] whitespace-nowrap">
                          {formatPKR(displayedTotalAmount)}
                        </td>
                        <td className="no-print" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* 6. Document Footer & Certification */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Verified System Ledger • Dineflow Restaurant Platform</span>
              </div>
              <div className="font-mono text-[11px] text-slate-600">
                Report Ref: <strong>{reportRefCode}</strong> • {rangeLabel}
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
