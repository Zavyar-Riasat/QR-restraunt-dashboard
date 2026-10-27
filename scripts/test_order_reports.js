import assert from 'node:assert';
import {
  DATE_PRESETS,
  filterOrdersByDate,
  generateFullReport,
} from '../src/utils/orderReportUtils.js';
import { orderService } from '../src/services/orderService.js';

console.log('🧪 Starting Date/Time Filter & Sales Report System Tests...\n');

// 1. Verify Date Presets
assert(Array.isArray(DATE_PRESETS) && DATE_PRESETS.length >= 10, 'DATE_PRESETS must have all key options');
const presetIds = DATE_PRESETS.map((p) => p.id);
assert(presetIds.includes('today'), 'Must have today');
assert(presetIds.includes('yesterday'), 'Must have yesterday');
assert(presetIds.includes('last_7_days'), 'Must have last_7_days');
assert(presetIds.includes('this_month'), 'Must have this_month');
assert(presetIds.includes('last_month'), 'Must have last_month');
assert(presetIds.includes('this_year'), 'Must have this_year');
assert(presetIds.includes('specific_date'), 'Must have specific_date');
assert(presetIds.includes('specific_month'), 'Must have specific_month');
assert(presetIds.includes('specific_year'), 'Must have specific_year');
assert(presetIds.includes('custom'), 'Must have custom');
console.log('  ✅ [PASS] 1. Date presets definitions verified');

// 2. Sample Orders across multiple dates & times
const now = new Date();
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15, 12, 0, 0);
const lastYear = new Date(2025, 10, 20, 18, 0, 0);

const testOrders = [
  {
    id: 'T-TODAY-1',
    customer_name: 'Today Customer',
    total_payable: 1500,
    payment_method: 'Cash',
    payment_status: 'paid',
    order_type: 'dine_in',
    status: 'completed',
    created_at: now.toISOString(),
    items: [{ title: 'Smash Burger', quantity: 2, unitPrice: 750 }],
  },
  {
    id: 'T-YEST-1',
    customer_name: 'Yesterday Customer',
    total_payable: 2400,
    payment_method: 'JazzCash Online',
    payment_status: 'paid',
    order_type: 'delivery',
    status: 'completed',
    created_at: yesterday.toISOString(),
    items: [{ title: 'Hot Chicken', quantity: 2, unitPrice: 1200 }],
  },
  {
    id: 'T-LASTMO-1',
    customer_name: 'Last Month Customer',
    total_payable: 3200,
    payment_method: 'Card Online',
    payment_status: 'paid',
    order_type: 'takeaway',
    status: 'completed',
    created_at: lastMonth.toISOString(),
    items: [{ title: 'Duo Combo', quantity: 1, unitPrice: 3200 }],
  },
  {
    id: 'T-2025-1',
    customer_name: '2025 Customer',
    total_payable: 5000,
    payment_method: 'Cash',
    payment_status: 'unpaid',
    order_type: 'dine_in',
    status: 'completed',
    created_at: lastYear.toISOString(),
    items: [{ title: 'Mega Platter', quantity: 2, unitPrice: 2500 }],
  },
];

// 3. Test filtering by Today
const todayResult = filterOrdersByDate(testOrders, { mode: 'today' });
assert.strictEqual(todayResult.filteredOrders.length, 1);
assert.strictEqual(todayResult.filteredOrders[0].id, 'T-TODAY-1');
console.log('  ✅ [PASS] 2. Today order filter verified');

// 4. Test filtering by Yesterday
const yestResult = filterOrdersByDate(testOrders, { mode: 'yesterday' });
assert.strictEqual(yestResult.filteredOrders.length, 1);
assert.strictEqual(yestResult.filteredOrders[0].id, 'T-YEST-1');
console.log('  ✅ [PASS] 3. Yesterday order filter verified');

// 5. Test filtering by Specific Year (2025)
const year2025Result = filterOrdersByDate(testOrders, { mode: 'specific_year', specificYear: '2025' });
assert.strictEqual(year2025Result.filteredOrders.length, 1);
assert.strictEqual(year2025Result.filteredOrders[0].id, 'T-2025-1');
console.log('  ✅ [PASS] 4. Specific Year (2025) filter verified');

// 6. Test filtering with Specific Date and Time range
const yestDateStr = yesterday.toISOString().split('T')[0];
const specificDayResult = filterOrdersByDate(testOrders, {
  mode: 'specific_date',
  specificDate: yestDateStr,
  startTime: '00:00',
  endTime: '23:59',
});
assert.strictEqual(specificDayResult.filteredOrders.length, 1);
assert.strictEqual(specificDayResult.filteredOrders[0].id, 'T-YEST-1');
console.log('  ✅ [PASS] 5. Specific Day with Time Range filter verified');

// 7. Test Comprehensive Report Generation
const allResult = filterOrdersByDate(testOrders, { mode: 'all' });
const report = generateFullReport(allResult.filteredOrders, allResult.label);

assert.strictEqual(report.totalOrders, 4);
assert.strictEqual(report.grossSales, 1500 + 2400 + 3200 + 5000);
assert.strictEqual(report.cashSales.count, 2);
assert.strictEqual(report.onlineSales.count, 2);
assert.strictEqual(report.unpaidSummary.total, 5000);
assert.strictEqual(report.orderTypeBreakdown.dineIn.count, 2);
assert.strictEqual(report.orderTypeBreakdown.delivery.count, 1);
assert.strictEqual(report.orderTypeBreakdown.takeaway.count, 1);
assert(Array.isArray(report.topItems) && report.topItems.length > 0, 'Top items must be computed');
console.log('  ✅ [PASS] 6. Comprehensive Sales Report metrics calculations verified');

// 8. Test orderService starter history
const starterOrders = orderService.getOrders('test_rest');
assert(starterOrders.length >= 10, 'Starter orders must have rich multi-date history');
const hasYesterdayStarter = starterOrders.some((o) => o.id === 'DB-5501');
const has2025Starter = starterOrders.some((o) => o.id === 'DB-1105' || o.id === 'DB-1210');
assert(hasYesterdayStarter, 'Must have yesterday starter orders');
assert(has2025Starter, 'Must have 2025 starter orders');
console.log('  ✅ [PASS] 7. Historical starter orders (Yesterday, Months, 2025) verified in orderService');

console.log('\n========================================');
console.log('🎉 All 7 Order History & Report Tests Passed!');
console.log('========================================\n');
