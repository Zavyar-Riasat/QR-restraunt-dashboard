/**
 * Utility functions for Order Date/Time Filtering & Comprehensive Sales Report Generation
 * Supports Day, Month, Year, and Custom Date/Time ranges with complete analytics
 */

import { formatPKR } from './currencyUtils.js';

export const DATE_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last_7_days', label: 'Last 7 Days' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'this_year', label: 'This Year' },
  { id: 'specific_date', label: 'Specific Day' },
  { id: 'specific_month', label: 'Specific Month' },
  { id: 'specific_year', label: 'Specific Year' },
  { id: 'custom', label: 'Custom Date & Time' },
  { id: 'all', label: 'All Orders' },
];

/**
 * Filter orders by date, month, year, or custom date-time window
 */
export function filterOrdersByDate(orders = [], options = {}) {
  const {
    mode = 'today',
    specificDate = '', // 'YYYY-MM-DD'
    specificMonth = '', // 'YYYY-MM'
    specificYear = '', // '2026'
    startDate = '', // 'YYYY-MM-DD'
    startTime = '00:00', // 'HH:mm'
    endDate = '', // 'YYYY-MM-DD'
    endTime = '23:59', // 'HH:mm'
    includeCancelled = false,
  } = options;

  const now = new Date();

  let startTimestamp = null;
  let endTimestamp = null;
  let label = 'Today';

  if (mode === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    startTimestamp = start.getTime();
    endTimestamp = end.getTime();
    label = `Today (${start.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })})`;
  } else if (mode === 'yesterday') {
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const start = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 0, 0, 0, 0);
    const end = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 23, 59, 59, 999);
    startTimestamp = start.getTime();
    endTimestamp = end.getTime();
    label = `Yesterday (${start.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })})`;
  } else if (mode === 'last_7_days') {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);
    startTimestamp = start.getTime();
    endTimestamp = now.getTime();
    label = 'Last 7 Days';
  } else if (mode === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    startTimestamp = start.getTime();
    endTimestamp = end.getTime();
    label = `${start.toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })}`;
  } else if (mode === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    startTimestamp = start.getTime();
    endTimestamp = end.getTime();
    label = `${start.toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })}`;
  } else if (mode === 'this_year') {
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    startTimestamp = start.getTime();
    endTimestamp = end.getTime();
    label = `Year ${now.getFullYear()}`;
  } else if (mode === 'specific_date' && specificDate) {
    const [y, m, d] = specificDate.split('-').map(Number);
    const [sH, sM] = (startTime || '00:00').split(':').map(Number);
    const [eH, eM] = (endTime || '23:59').split(':').map(Number);

    const start = new Date(y, m - 1, d, sH, sM, 0, 0);
    const end = new Date(y, m - 1, d, eH, eM, 59, 999);
    startTimestamp = start.getTime();
    endTimestamp = end.getTime();
    const dateFormatted = start.toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
    label = (startTime !== '00:00' || endTime !== '23:59')
      ? `${dateFormatted} (${startTime} - ${endTime})`
      : dateFormatted;
  } else if (mode === 'specific_month' && specificMonth) {
    const [y, m] = specificMonth.split('-').map(Number);
    const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
    const end = new Date(y, m, 0, 23, 59, 59, 999);
    startTimestamp = start.getTime();
    endTimestamp = end.getTime();
    label = `${start.toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })}`;
  } else if (mode === 'specific_year' && specificYear) {
    const yr = Number(specificYear);
    const start = new Date(yr, 0, 1, 0, 0, 0, 0);
    const end = new Date(yr, 11, 31, 23, 59, 59, 999);
    startTimestamp = start.getTime();
    endTimestamp = end.getTime();
    label = `Year ${yr}`;
  } else if (mode === 'custom' && startDate && endDate) {
    const [sY, sM, sD] = startDate.split('-').map(Number);
    const [eY, eM, eD] = endDate.split('-').map(Number);
    const [sH, sMin] = (startTime || '00:00').split(':').map(Number);
    const [eH, eMin] = (endTime || '23:59').split(':').map(Number);

    const start = new Date(sY, sM - 1, sD, sH, sMin, 0, 0);
    const end = new Date(eY, eM - 1, eD, eH, eMin, 59, 999);
    startTimestamp = start.getTime();
    endTimestamp = end.getTime();

    const startStr = start.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
    const endStr = end.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
    label = `${startStr} ${startTime} - ${endStr} ${endTime}`;
  } else if (mode === 'all') {
    startTimestamp = 0;
    endTimestamp = Infinity;
    label = 'All Time History';
  } else {
    // Default fallback to all orders
    startTimestamp = 0;
    endTimestamp = Infinity;
    label = 'All Orders';
  }

  const filtered = orders.filter((order) => {
    if (!includeCancelled && order.status === 'cancelled') return false;
    if (!order.created_at) return true;
    const orderTime = new Date(order.created_at).getTime();
    if (isNaN(orderTime)) return true;
    return orderTime >= startTimestamp && orderTime <= endTimestamp;
  });

  return {
    filteredOrders: filtered,
    label,
    rangeLabel: label,
    startTimestamp,
    endTimestamp,
  };
}

/**
 * Generate full analytics & reporting metrics from a set of orders
 */
export function generateFullReport(orders = [], rangeLabel = '', filterMeta = {}) {
  const totalOrders = orders.length;
  const nonCancelledOrders = orders.filter((o) => o.status !== 'cancelled');

  const grossSales = nonCancelledOrders.reduce(
    (sum, o) => sum + (Number(o.total_payable) || 0),
    0
  );

  const averageOrderValue =
    nonCancelledOrders.length > 0 ? Math.round(grossSales / nonCancelledOrders.length) : 0;

  // Payment Breakdown
  let cashTotal = 0;
  let cashCount = 0;
  let onlineTotal = 0;
  let onlineCount = 0;
  let unpaidTotal = 0;
  let unpaidCount = 0;

  for (const order of nonCancelledOrders) {
    const method = (order.payment_method || '').toLowerCase();
    const payable = Number(order.total_payable) || 0;
    const isOnline =
      method.includes('online') ||
      method.includes('jazzcash') ||
      method.includes('easypaisa') ||
      method.includes('card') ||
      method.includes('bank') ||
      method.includes('stripe');

    if (isOnline) {
      onlineTotal += payable;
      onlineCount += 1;
    } else {
      cashTotal += payable;
      cashCount += 1;
    }

    if (order.payment_status === 'unpaid' || order.payment_status === 'partial') {
      const remaining = payable - (Number(order.amount_received) || 0);
      unpaidTotal += Math.max(0, remaining);
      unpaidCount += 1;
    }
  }

  // Order Type Breakdown (Dine-In, Delivery, Takeaway)
  const orderTypeBreakdown = {
    dineIn: { count: 0, total: 0 },
    delivery: { count: 0, total: 0 },
    takeaway: { count: 0, total: 0 },
  };

  for (const order of nonCancelledOrders) {
    const payable = Number(order.total_payable) || 0;
    const type = (order.order_type || 'dine_in').toLowerCase();
    if (type.includes('dine') || order.table_number) {
      orderTypeBreakdown.dineIn.count += 1;
      orderTypeBreakdown.dineIn.total += payable;
    } else if (type.includes('takeaway') || type.includes('pickup')) {
      orderTypeBreakdown.takeaway.count += 1;
      orderTypeBreakdown.takeaway.total += payable;
    } else {
      orderTypeBreakdown.delivery.count += 1;
      orderTypeBreakdown.delivery.total += payable;
    }
  }

  // Status Breakdown
  const statusBreakdown = {
    completed: orders.filter((o) => o.status === 'completed').length,
    active: orders.filter((o) => o.status === 'new' || o.status === 'preparing' || o.status === 'ready' || o.status === 'out_for_delivery').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  };

  // Top Selling Items in this date range
  const itemMap = {};
  let totalItemsSold = 0;
  for (const order of nonCancelledOrders) {
    if (Array.isArray(order.items)) {
      for (const item of order.items) {
        const key = item.title || 'Special Item';
        const qty = Number(item.quantity) || 1;
        const unit = Number(item.unitPrice) || 0;
        totalItemsSold += qty;
        if (!itemMap[key]) {
          itemMap[key] = { title: key, quantity: 0, revenue: 0 };
        }
        itemMap[key].quantity += qty;
        itemMap[key].revenue += qty * unit;
      }
    }
  }

  const allItemsRanked = Object.values(itemMap).sort(
    (a, b) => b.quantity - a.quantity || b.revenue - a.revenue
  );
  const topItems = allItemsRanked.slice(0, 8);
  const uniqueDishesCount = allItemsRanked.length;

  const now = new Date();

  return {
    totalOrders,
    grossSales,
    totalSales: grossSales,
    averageOrderValue,
    totalItemsSold,
    uniqueDishesCount,
    cashSales: {
      count: cashCount,
      total: cashTotal,
      percentage: grossSales > 0 ? Math.round((cashTotal / grossSales) * 100) : 0,
    },
    onlineSales: {
      count: onlineCount,
      total: onlineTotal,
      percentage: grossSales > 0 ? Math.round((onlineTotal / grossSales) * 100) : 0,
    },
    unpaidSummary: {
      count: unpaidCount,
      total: unpaidTotal,
    },
    orderTypeBreakdown,
    statusBreakdown,
    topItems,
    orders: [...orders].sort((a, b) => {
      const tA = new Date(a.created_at || 0).getTime();
      const tB = new Date(b.created_at || 0).getTime();
      return tB - tA; // newest first
    }),
    rangeLabel,
    filterMeta,
    generatedAtDate: now.toLocaleDateString('en-PK', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    generatedAtTime: now.toLocaleTimeString('en-PK', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
  };
}
