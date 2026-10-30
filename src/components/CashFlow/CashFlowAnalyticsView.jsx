import React, { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ShoppingBag,
  ArrowDownLeft,
  ArrowUpRight,
  Utensils,
  Truck,
  Store,
  Receipt,
  Award,
  Download,
  BarChart3,
  PieChart,
  Calendar,
} from 'lucide-react';
import { formatPKR } from '../../utils/currencyUtils';

function isOrderPaidHelper(order) {
  return Boolean(
    order &&
      order.payment_status === 'paid' &&
      (order.explicit_paid || order.status === 'completed' || order.status === 'delivered')
  );
}

export default function CashFlowAnalyticsView({
  orders = [],
  entries = [],
  restName = 'Restaurant',
  dateFilter = 'all',
  setDateFilter,
  specificDate = '',
  setSpecificDate,
  customStartDate = '',
  setCustomStartDate,
  customEndDate = '',
  setCustomEndDate,
}) {
  // Helper to check if a timestamp falls within the active date filter
  const matchesDateFilter = useMemo(() => {
    if (dateFilter === 'all') return () => true;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
    const yesterdayStart = todayStart - 24 * 3600 * 1000;
    const weekStart = todayStart - 7 * 24 * 3600 * 1000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let specificStart = 0;
    let specificEnd = Infinity;
    if (dateFilter === 'specific_date' && specificDate) {
      const [y, m, d] = specificDate.split('-').map(Number);
      if (y && m && d) {
        specificStart = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
        specificEnd = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
      }
    } else if (dateFilter === 'custom_range') {
      if (customStartDate) {
        const [sy, sm, sd] = customStartDate.split('-').map(Number);
        if (sy && sm && sd) {
          specificStart = new Date(sy, sm - 1, sd, 0, 0, 0, 0).getTime();
        }
      }
      if (customEndDate) {
        const [ey, em, ed] = customEndDate.split('-').map(Number);
        if (ey && em && ed) {
          specificEnd = new Date(ey, em - 1, ed, 23, 59, 59, 999).getTime();
        }
      }
    }

    return (rawDate) => {
      if (!rawDate) return true;
      const t = new Date(rawDate).getTime();
      if (Number.isNaN(t)) return true;
      if (dateFilter === 'today') return t >= todayStart && t <= todayEnd;
      if (dateFilter === 'yesterday') return t >= yesterdayStart && t < todayStart;
      if (dateFilter === 'week') return t >= weekStart;
      if (dateFilter === 'month') return t >= monthStart;
      if (dateFilter === 'specific_date' || dateFilter === 'custom_range') {
        return t >= specificStart && t <= specificEnd;
      }
      return true;
    };
  }, [dateFilter, specificDate, customStartDate, customEndDate]);

  // Calculate all automatic earnings, expenses, channels, dishes, and daily breakdown
  const analytics = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

    // Filter non-cancelled orders in selected period
    const validOrders = orders.filter(
      (o) =>
        o &&
        o.status !== 'cancelled' &&
        o.status !== 'new' &&
        matchesDateFilter(o.created_at)
    );

    const periodEntries = entries.filter((e) => matchesDateFilter(e.date || e.created_at));

    // Today's specific metrics (always calculated for Today card)
    const todayOrders = orders.filter((o) => {
      if (!o || o.status === 'cancelled' || o.status === 'new') return false;
      const t = new Date(o.created_at).getTime();
      return t >= todayStart && t <= todayEnd;
    });
    const todayEntries = entries.filter((e) => {
      const t = new Date(e.date || e.created_at).getTime();
      return t >= todayStart && t <= todayEnd;
    });

    let todayOrderSales = 0;
    let todayPaidSales = 0;
    for (const o of todayOrders) {
      const amt = Number(o.total_payable) || 0;
      todayOrderSales += amt;
      if (isOrderPaidHelper(o)) todayPaidSales += amt;
    }
    let todayExpenses = 0;
    for (const e of todayEntries) {
      if (e.type === 'out' && e.category !== 'drawings') {
        todayExpenses += Number(e.amount) || 0;
      }
    }
    const todayNetEarning = todayOrderSales - todayExpenses;

    // Period Order Metrics
    let grossOrderSales = 0;
    let paidOrderSales = 0;
    let unpaidOrderSales = 0;
    let subtotalSum = 0;
    let deliveryFeeSum = 0;
    let discountSum = 0;
    let completedOrdersCount = 0;
    let paidOrdersCount = 0;
    let unpaidOrdersCount = 0;
    let totalItemsSold = 0;

    const byChannel = {
      dine_in: { label: 'Dine-In', count: 0, revenue: 0, paidRevenue: 0 },
      delivery: { label: 'Delivery', count: 0, revenue: 0, paidRevenue: 0 },
      takeaway: { label: 'Takeaway / Pickup', count: 0, revenue: 0, paidRevenue: 0 },
    };

    const byPaymentMethod = {
      cash: { label: 'Cash / COD', count: 0, amount: 0 },
      jazzcash: { label: 'JazzCash', count: 0, amount: 0 },
      easypaisa: { label: 'Easypaisa', count: 0, amount: 0 },
      bank: { label: 'Bank / Card', count: 0, amount: 0 },
    };

    const dishMap = new Map();
    const dailyMap = new Map();

    const ensureDay = (dateKey, displayDate) => {
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          dateKey,
          displayDate,
          ordersCount: 0,
          completedCount: 0,
          grossSales: 0,
          paidSales: 0,
          otherCashIn: 0,
          capitalIn: 0,
          expensesOut: 0,
          drawingsOut: 0,
        });
      }
      return dailyMap.get(dateKey);
    };

    for (const order of validOrders) {
      const total = Number(order.total_payable) || 0;
      const sub = Number(order.subtotal) || total;
      const delFee = Number(order.delivery_fee) || 0;
      const discVal = Number(order.discount) || 0;
      const discAmt =
        order.discount_type === 'percent' ? (sub * discVal) / 100 : Math.min(sub, discVal);

      const paid = isOrderPaidHelper(order);
      const isCompleted = order.status === 'completed' || order.status === 'delivered';

      grossOrderSales += total;
      subtotalSum += sub;
      deliveryFeeSum += delFee;
      discountSum += discAmt;

      if (isCompleted) completedOrdersCount += 1;
      if (paid) {
        paidOrderSales += total;
        paidOrdersCount += 1;
      } else {
        unpaidOrderSales += total;
        unpaidOrdersCount += 1;
      }

      // Channel breakdown
      const channelKey =
        order.order_type === 'dine_in'
          ? 'dine_in'
          : order.order_type === 'delivery'
          ? 'delivery'
          : 'takeaway';
      byChannel[channelKey].count += 1;
      byChannel[channelKey].revenue += total;
      if (paid) byChannel[channelKey].paidRevenue += total;

      // Payment method breakdown
      const rawMethod = (order.payment_method || 'cash').toLowerCase();
      const methodKey = rawMethod.includes('jazz')
        ? 'jazzcash'
        : rawMethod.includes('easy')
        ? 'easypaisa'
        : rawMethod.includes('bank') || rawMethod.includes('card')
        ? 'bank'
        : 'cash';
      byPaymentMethod[methodKey].count += 1;
      byPaymentMethod[methodKey].amount += total;

      // Dish breakdown
      if (Array.isArray(order.items)) {
        for (const item of order.items) {
          const title = item.title || item.item?.title || 'Menu Item';
          const qty = Number(item.quantity) || 1;
          const price = Number(item.unitPrice) || 0;
          const lineTotal = qty * price;
          totalItemsSold += qty;

          const existingDish = dishMap.get(title) || {
            title,
            quantity: 0,
            revenue: 0,
            ordersCount: 0,
          };
          existingDish.quantity += qty;
          existingDish.revenue += lineTotal;
          existingDish.ordersCount += 1;
          dishMap.set(title, existingDish);
        }
      }

      // Daily aggregation
      const dObj = order.created_at ? new Date(order.created_at) : new Date();
      const dateKey = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(
        dObj.getDate()
      ).padStart(2, '0')}`;
      const displayDate = dObj.toLocaleDateString('en-PK', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const dayEntry = ensureDay(dateKey, displayDate);
      dayEntry.ordersCount += 1;
      if (isCompleted) dayEntry.completedCount += 1;
      dayEntry.grossSales += total;
      if (paid) dayEntry.paidSales += total;
    }

    // Period Cash In / Out Entries
    let ownerCapitalIn = 0;
    let operatingCashIn = 0;
    let totalCashIn = 0;
    let operatingExpensesOut = 0;
    let ownerDrawingsOut = 0;
    let totalCashOut = 0;

    const expenseCategoryMap = new Map();

    for (const entry of periodEntries) {
      const amt = Number(entry.amount) || 0;
      const dObj = entry.date || entry.created_at ? new Date(entry.date || entry.created_at) : new Date();
      const dateKey = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(
        dObj.getDate()
      ).padStart(2, '0')}`;
      const displayDate = dObj.toLocaleDateString('en-PK', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const dayEntry = ensureDay(dateKey, displayDate);

      if (entry.type === 'in') {
        totalCashIn += amt;
        if (entry.category === 'capital') {
          ownerCapitalIn += amt;
          dayEntry.capitalIn += amt;
        } else {
          operatingCashIn += amt;
          dayEntry.otherCashIn += amt;
        }
      } else {
        totalCashOut += amt;
        if (entry.category === 'drawings') {
          ownerDrawingsOut += amt;
          dayEntry.drawingsOut += amt;
        } else {
          operatingExpensesOut += amt;
          dayEntry.expensesOut += amt;

          const catLabel = entry.category_label || entry.category || 'Other Expense';
          const existingCat = expenseCategoryMap.get(catLabel) || {
            label: catLabel,
            amount: 0,
            count: 0,
          };
          existingCat.amount += amt;
          existingCat.count += 1;
          expenseCategoryMap.set(catLabel, existingCat);
        }
      }
    }

    // Total Earned Operating Revenue = Gross Order Sales + Operating Cash In (counter/refunds)
    const totalOperatingRevenue = grossOrderSales + operatingCashIn;
    const realizedOperatingRevenue = paidOrderSales + operatingCashIn;

    // Net Owner Profit (from all valid orders + operating inflows minus operating expenses)
    const netOwnerProfit = totalOperatingRevenue - operatingExpensesOut;
    const realizedOwnerProfit = realizedOperatingRevenue - operatingExpensesOut;

    // Profit Margin %
    const profitMarginPercent =
      totalOperatingRevenue > 0
        ? Math.round((netOwnerProfit / totalOperatingRevenue) * 1000) / 10
        : 0;

    // Total Cash in Business Register (Paid Order Sales + All Cash In - All Cash Out)
    const totalCashInHandWithSales = paidOrderSales + totalCashIn - totalCashOut;
    const registerOnlyBalance = totalCashIn - totalCashOut;

    // Average Order Value
    const avgOrderValue =
      validOrders.length > 0 ? Math.round(grossOrderSales / validOrders.length) : 0;

    // 30% Aggregator Commission Saved
    const commissionSaved = Math.round(grossOrderSales * 0.3);

    // Top Dishes sorted by revenue
    const topDishes = Array.from(dishMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
    const totalDishRevenue = Array.from(dishMap.values()).reduce((s, d) => s + d.revenue, 0);

    // Expense categories sorted by amount
    const expenseCategories = Array.from(expenseCategoryMap.values()).sort(
      (a, b) => b.amount - a.amount
    );

    // Daily rows sorted newest first
    const dailyRows = Array.from(dailyMap.values()).sort((a, b) =>
      b.dateKey.localeCompare(a.dateKey)
    );

    return {
      validOrdersCount: validOrders.length,
      completedOrdersCount,
      paidOrdersCount,
      unpaidOrdersCount,
      totalItemsSold,
      grossOrderSales,
      paidOrderSales,
      unpaidOrderSales,
      subtotalSum,
      deliveryFeeSum,
      discountSum,
      ownerCapitalIn,
      operatingCashIn,
      totalCashIn,
      operatingExpensesOut,
      ownerDrawingsOut,
      totalCashOut,
      totalOperatingRevenue,
      realizedOperatingRevenue,
      netOwnerProfit,
      realizedOwnerProfit,
      profitMarginPercent,
      totalCashInHandWithSales,
      registerOnlyBalance,
      avgOrderValue,
      commissionSaved,
      todayOrderSales,
      todayPaidSales,
      todayExpenses,
      todayNetEarning,
      todayOrdersCount: todayOrders.length,
      byChannel: Object.values(byChannel),
      byPaymentMethod: Object.values(byPaymentMethod),
      topDishes,
      totalDishRevenue,
      expenseCategories,
      dailyRows,
    };
  }, [orders, entries, matchesDateFilter]);

  const handleExportAnalyticsCSV = () => {
    const headers = [
      'Date',
      'Orders Count',
      'Completed Orders',
      'Gross Order Sales (PKR)',
      'Paid Order Sales (PKR)',
      'Other Cash In (PKR)',
      'Owner Capital In (PKR)',
      'Operating Expenses Out (PKR)',
      'Owner Drawings Out (PKR)',
      'Net Daily Owner Profit (PKR)',
    ];

    const rows = analytics.dailyRows.map((d) => {
      const netProfit = d.grossSales + d.otherCashIn - d.expensesOut;
      return [
        d.dateKey,
        d.ordersCount,
        d.completedCount,
        d.grossSales,
        d.paidSales,
        d.otherCashIn,
        d.capitalIn,
        d.expensesOut,
        d.drawingsOut,
        netProfit,
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Owner_Earnings_Analytics_${restName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Analytics Header & Date Period Bar */}
      <div className="bg-gradient-to-r from-[#2B2118] via-[#3A2D21] to-[#2B2118] text-white rounded-3xl p-5 sm:p-6 shadow-md border border-[#F0E4D7]/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F26B1D]/20 border border-[#F26B1D]/40 text-[#FF9F5A] text-[11px] font-extrabold uppercase tracking-wider">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Automatic Restaurant Earnings & Profit Analytics</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight">
              {restName} — Owner Earnings Overview
            </h2>
            <p className="text-xs text-amber-100/80 max-w-2xl">
              Automatically calculated in real time from all kitchen orders, paid bills, delivery fees, discounts, and cash register expenses.
            </p>
          </div>

          {/* Period Filter Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 px-3 py-2 rounded-xl border border-white/15 text-xs">
              <Calendar className="w-3.5 h-3.5 text-[#F5A623]" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-transparent font-bold text-white text-xs focus:outline-none cursor-pointer"
              >
                <option value="all" className="text-slate-900">Period: All Time</option>
                <option value="today" className="text-slate-900">Period: Today</option>
                <option value="yesterday" className="text-slate-900">Period: Yesterday</option>
                <option value="week" className="text-slate-900">Period: Last 7 Days</option>
                <option value="month" className="text-slate-900">Period: This Month</option>
                <option value="specific_date" className="text-slate-900">Period: Specific Date</option>
                <option value="custom_range" className="text-slate-900">Period: Custom Range</option>
              </select>
            </div>

            {dateFilter === 'specific_date' && (
              <input
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-white text-slate-900 text-xs font-bold cursor-pointer"
              />
            )}

            {dateFilter === 'custom_range' && (
              <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-xl border border-white/15 text-xs">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-white text-slate-900 px-2 py-0.5 rounded-lg font-bold text-xs"
                />
                <span>to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-white text-slate-900 px-2 py-0.5 rounded-lg font-bold text-xs"
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleExportAnalyticsCSV}
              className="px-3.5 py-2 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Download Owner Earnings & Daily P&L CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Earnings CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6 Automatic Owner Earnings KPI Cards (3 per row) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* KPI 1: Net Owner Profit (Actual Restaurant Earnings) */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 border-2 border-emerald-300 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-800 mb-1">
            <span className="font-extrabold uppercase tracking-wider">Net Owner Earnings (Profit)</span>
            {analytics.netOwnerProfit >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-600" />
            )}
          </div>
          <div
            className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
              analytics.netOwnerProfit >= 0 ? 'text-emerald-800' : 'text-rose-700'
            }`}
          >
            {analytics.netOwnerProfit >= 0
              ? `+${formatPKR(analytics.netOwnerProfit)}`
              : formatPKR(analytics.netOwnerProfit)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-emerald-200/70 text-[11px]">
            <span className="text-slate-600 font-medium">
              Realized (Paid): <strong className="text-emerald-800 font-mono">{formatPKR(analytics.realizedOwnerProfit)}</strong>
            </span>
            <span
              className={`px-2 py-0.5 rounded-full font-mono font-bold text-[10px] ${
                analytics.profitMarginPercent >= 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {analytics.profitMarginPercent}% Margin
            </span>
          </div>
        </div>

        {/* KPI 2: Gross Restaurant Sales Revenue (From Orders) */}
        <div className="p-5 rounded-2xl bg-white border border-[#F0E4D7] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#7A6A5C] mb-1">
            <span className="font-extrabold uppercase tracking-wider">Order Sales Revenue</span>
            <ShoppingBag className="w-4 h-4 text-[#F26B1D]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#2B2118] font-mono tracking-tight">
            {formatPKR(analytics.grossOrderSales)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-emerald-700 font-bold font-mono">
              ✓ Paid: {formatPKR(analytics.paidOrderSales)}
            </span>
            {analytics.unpaidOrderSales > 0 ? (
              <span className="text-amber-700 font-bold font-mono">
                Pending: {formatPKR(analytics.unpaidOrderSales)}
              </span>
            ) : (
              <span className="text-slate-500">{analytics.validOrdersCount} Orders</span>
            )}
          </div>
        </div>

        {/* KPI 3: Total Operating Expenses */}
        <div className="p-5 rounded-2xl bg-white border border-rose-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-rose-700 mb-1">
            <span className="font-extrabold uppercase tracking-wider">Operating Expenses</span>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-800 font-mono tracking-tight">
            -{formatPKR(analytics.operatingExpensesOut)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span>Purchases, utilities & wages</span>
            {analytics.ownerDrawingsOut > 0 && (
              <span className="font-mono text-slate-600">
                Drawings: {formatPKR(analytics.ownerDrawingsOut)}
              </span>
            )}
          </div>
        </div>

        {/* KPI 4: Total Cash in Hand (Paid Sales + Cash In - Cash Out) */}
        <div className="p-5 rounded-2xl bg-white border border-blue-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-blue-800 mb-1">
            <span className="font-extrabold uppercase tracking-wider">Total Cash in Business</span>
            <Wallet className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-900 font-mono tracking-tight">
            {formatPKR(analytics.totalCashInHandWithSales)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span>Paid Sales + Register Balance</span>
            <span className="font-mono font-bold text-slate-700">
              Reg: {formatPKR(analytics.registerOnlyBalance)}
            </span>
          </div>
        </div>

        {/* KPI 5: Today's Live Earnings */}
        <div className="p-5 rounded-2xl bg-white border border-[#F0E4D7] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#7A6A5C] mb-1">
            <span className="font-extrabold uppercase tracking-wider">Today&apos;s Net Earning</span>
            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-mono font-bold text-[10px]">
              {analytics.todayOrdersCount} orders today
            </span>
          </div>
          <div
            className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
              analytics.todayNetEarning >= 0 ? 'text-emerald-800' : 'text-rose-700'
            }`}
          >
            {analytics.todayNetEarning >= 0
              ? `+${formatPKR(analytics.todayNetEarning)}`
              : formatPKR(analytics.todayNetEarning)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-[#7A6A5C] font-mono">
            <span>Sales: {formatPKR(analytics.todayOrderSales)}</span>
            <span>Exp: -{formatPKR(analytics.todayExpenses)}</span>
          </div>
        </div>

        {/* KPI 6: Owner Capital vs Withdrawals */}
        <div className="p-5 rounded-2xl bg-white border border-[#F0E4D7] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#7A6A5C] mb-1">
            <span className="font-extrabold uppercase tracking-wider">Owner Capital Injected</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-[#2B2118] tracking-tight">
            {formatPKR(analytics.ownerCapitalIn)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-[#7A6A5C] font-mono">
            <span>Other In: +{formatPKR(analytics.operatingCashIn)}</span>
            <span>Drawn: -{formatPKR(analytics.ownerDrawingsOut)}</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Financial Breakdown: P&L Statement + Order Channel & Payment Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (7 cols): Automatic Profit & Loss (P&L) Statement */}
        <div className="lg:col-span-7 bg-white border border-[#F0E4D7] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#F0E4D7] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#FFF1E6] text-[#F26B1D] flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-base text-[#2B2118]">
                  Automatic Profit &amp; Loss (P&amp;L) Statement
                </h3>
                <p className="text-[11px] text-[#7A6A5C]">
                  Complete calculation of how much the restaurant owner earned
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-extrabold uppercase">
              Auto-Calculated
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* Revenue Section */}
            <div className="p-3.5 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-2">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#7A6A5C]">
                1. Restaurant Sales &amp; Revenue Inflows
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span>Food &amp; Beverage Items Subtotal ({analytics.validOrdersCount} orders)</span>
                <span className="font-mono font-bold">{formatPKR(analytics.subtotalSum)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span>+ Delivery Charges Collected</span>
                <span className="font-mono font-bold text-emerald-700">
                  +{formatPKR(analytics.deliveryFeeSum)}
                </span>
              </div>
              {analytics.discountSum > 0 && (
                <div className="flex items-center justify-between text-rose-700">
                  <span>- Customer Discounts Applied</span>
                  <span className="font-mono font-bold">-{formatPKR(analytics.discountSum)}</span>
                </div>
              )}

              {analytics.operatingCashIn > 0 && (
                <div className="flex items-center justify-between text-emerald-800 pt-1">
                  <span>+ Other Operating Cash Inflows (Counter / Refunds)</span>
                  <span className="font-mono font-bold">+{formatPKR(analytics.operatingCashIn)}</span>
                </div>
              )}
            </div>

            {/* Expenses Section */}
            <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-800">
                  2. Operating Expenses (Cash Out)
                </span>
                <span className="font-mono font-black text-rose-800 text-sm">
                  -{formatPKR(analytics.operatingExpensesOut)}
                </span>
              </div>
              {analytics.expenseCategories.length === 0 ? (
                <p className="text-[11px] text-slate-500">No operating expenses recorded in this period.</p>
              ) : (
                <div className="space-y-1.5 pt-1">
                  {analytics.expenseCategories.map((cat) => {
                    const pct =
                      analytics.operatingExpensesOut > 0
                        ? Math.round((cat.amount / analytics.operatingExpensesOut) * 100)
                        : 0;
                    return (
                      <div key={cat.label} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-700 font-medium">
                            {cat.label} <span className="text-slate-400">({cat.count})</span>
                          </span>
                          <span className="font-mono font-bold text-rose-700">
                            -{formatPKR(cat.amount)} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-rose-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-rose-500"
                            style={{ width: `${Math.max(4, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Right Column (5 cols): Channel Breakdown & Payment Modes */}
        <div className="lg:col-span-5 space-y-5">
          {/* Revenue by Order Type */}
          <div className="bg-white border border-[#F0E4D7] rounded-3xl p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#F0E4D7] pb-2.5">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[#F26B1D]" />
                <h3 className="font-heading font-extrabold text-sm text-[#2B2118]">
                  Earnings by Order Type
                </h3>
              </div>
              <span className="text-[11px] font-mono font-bold text-[#7A6A5C]">
                {analytics.validOrdersCount} Total Orders
              </span>
            </div>

            <div className="space-y-3">
              {analytics.byChannel.map((ch) => {
                const sharePct =
                  analytics.grossOrderSales > 0
                    ? Math.round((ch.revenue / analytics.grossOrderSales) * 100)
                    : 0;
                const Icon =
                  ch.label === 'Dine-In'
                    ? Utensils
                    : ch.label === 'Delivery'
                    ? Truck
                    : Store;
                return (
                  <div
                    key={ch.label}
                    className="p-3 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-bold text-[#2B2118]">
                        <Icon className="w-3.5 h-3.5 text-[#F26B1D]" />
                        <span>{ch.label}</span>
                        <span className="px-2 py-0.2 rounded-full bg-white border border-[#F0E4D7] text-[10px] font-mono text-[#7A6A5C]">
                          {ch.count} orders
                        </span>
                      </div>
                      <span className="font-mono font-black text-[#2B2118]">
                        {formatPKR(ch.revenue)} ({sharePct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#F0E4D7] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#F26B1D]"
                        style={{ width: `${Math.max(ch.count > 0 ? 5 : 0, sharePct)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#7A6A5C] font-mono">
                      <span>Paid: {formatPKR(ch.paidRevenue)}</span>
                      <span>
                        Avg: {formatPKR(ch.count > 0 ? Math.round(ch.revenue / ch.count) : 0)} / order
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Top Selling & Earning Dishes Table */}
      <div className="bg-white border border-[#F0E4D7] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-base text-[#2B2118]">
                Top Earning Menu Items (Auto-Calculated from Orders)
              </h3>
              <p className="text-[11px] text-[#7A6A5C]">
                Dishes generating the highest revenue for {restName}
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-[#2B2118] bg-[#FFF9F2] px-3 py-1.5 rounded-xl border border-[#F0E4D7]">
            Total Items Sold: {analytics.totalItemsSold}
          </span>
        </div>

        {analytics.topDishes.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#7A6A5C]">
            No dish sales recorded for the selected period yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {analytics.topDishes.map((dish, idx) => {
              const share =
                analytics.totalDishRevenue > 0
                  ? Math.round((dish.revenue / analytics.totalDishRevenue) * 100)
                  : 0;
              return (
                <div
                  key={dish.title}
                  className="p-3.5 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-xl bg-[#F26B1D] text-white font-mono font-black text-xs flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-[#2B2118] truncate">{dish.title}</div>
                      <div className="text-[11px] text-[#7A6A5C] font-mono">
                        {dish.quantity} sold • {dish.ordersCount}{' '}
                        {dish.ordersCount === 1 ? 'order' : 'orders'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-black text-sm text-emerald-800">
                      {formatPKR(dish.revenue)}
                    </div>
                    <div className="text-[10px] font-mono text-[#7A6A5C]">{share}% of dish sales</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Day-by-Day Automatic Owner Earnings & Cash Flow Ledger */}
      <div className="bg-white border border-[#F0E4D7] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-heading font-extrabold text-base text-[#2B2118]">
              Daily Owner Earnings &amp; Cash Flow Statement
            </h3>
            <p className="text-[11px] text-[#7A6A5C]">
              Day-by-day automatic breakdown of order revenue, register inflows, expenses, and net profit
            </p>
          </div>
        </div>

        {analytics.dailyRows.length === 0 ? (
          <div className="text-center py-10 text-xs text-[#7A6A5C]">
            No daily records found for the selected period.
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 overflow-x-auto bg-white">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-3 text-center">Orders</th>
                  <th className="py-3 px-3 text-right">Order Sales (Gross)</th>
                  <th className="py-3 px-3 text-right">Paid Sales</th>
                  <th className="py-3 px-3 text-right">Other Cash In</th>
                  <th className="py-3 px-3 text-right">Expenses Out</th>
                  <th className="py-3 px-4 text-right">Net Owner Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analytics.dailyRows.map((day) => {
                  const dayProfit = day.grossSales + day.otherCashIn - day.expensesOut;
                  return (
                    <tr key={day.dateKey} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-bold text-[#2B2118] whitespace-nowrap">
                        <div>{day.displayDate}</div>
                        <div className="text-[10px] font-mono text-slate-400">{day.dateKey}</div>
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 font-bold text-slate-800">
                          {day.ordersCount}
                        </span>
                        <span className="block text-[10px] text-emerald-700 mt-0.5">
                          {day.completedCount} completed
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-[#2B2118] whitespace-nowrap">
                        {formatPKR(day.grossSales)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                        {formatPKR(day.paidSales)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                        {day.otherCashIn + day.capitalIn > 0
                          ? `+${formatPKR(day.otherCashIn + day.capitalIn)}`
                          : '—'}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                        {day.expensesOut > 0 ? `-${formatPKR(day.expensesOut)}` : 'Rs. 0'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-sm whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-xl ${
                            dayProfit >= 0
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {dayProfit >= 0 ? `+${formatPKR(dayProfit)}` : formatPKR(dayProfit)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

