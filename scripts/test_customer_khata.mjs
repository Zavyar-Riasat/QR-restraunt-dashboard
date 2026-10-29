// Test script for Customer Khata and Partial Payments
// Run with: node scripts/test_customer_khata.mjs

// 1. Setup mock browser environment for Node
const storage = new Map();
global.window = {
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
};
global.localStorage = {
  getItem: (k) => storage.get(k) || null,
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
};
global.CustomEvent = class CustomEvent {
  constructor(name, detail) {
    this.name = name;
    this.detail = detail;
  }
};

import {
  toPaisa,
  toRupees,
  formatPaisa,
  normalizePhone,
  formatPhone,
  computeOrderPaymentState,
} from '../src/utils/currencyUtils.js';
import { customerKhataService } from '../src/services/customerKhataService.js';
import { orderService } from '../src/services/orderService.js';

let failed = 0;
let passed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAILED: ${message}`);
    failed++;
  }
}

console.log('\n--- 1. Testing Currency & Paisa Precision Utils ---');
assert(toPaisa(100) === 10000, 'toPaisa(100) is 10000');
assert(toPaisa(1450.5) === 145050, 'toPaisa(1450.50) is 145050');
assert(toPaisa('2,500') === 250000, 'toPaisa("2,500") is 250000');
assert(toRupees(10000) === 100, 'toRupees(10000) is 100');
assert(toRupees(145050) === 1450.5, 'toRupees(145050) is 1450.5');
assert(formatPaisa(145050) === 'Rs. 1,450.50', 'formatPaisa(145050) formatted with decimals');
assert(formatPaisa(250000) === 'Rs. 2,500', 'formatPaisa(250000) integer formatted without decimals');

console.log('\n--- 2. Testing Phone Normalization (Pakistan numbers) ---');
assert(normalizePhone('03001234567') === '03001234567', '03001234567 stays unchanged');
assert(normalizePhone('+923001234567') === '03001234567', '+923001234567 normalized to 03001234567');
assert(normalizePhone('923001234567') === '03001234567', '923001234567 normalized to 03001234567');
assert(normalizePhone('0300-1234567') === '03001234567', 'Dashes removed');
assert(normalizePhone('0300 123 4567') === '03001234567', 'Spaces removed');
assert(formatPhone('03001234567') === '0300-1234567', 'Formatted display phone');

console.log('\n--- 3. Testing Order Payment State Computation ---');
const testOrder1 = {
  id: 'TEST-1',
  total_payable: 2000,
  payments: [
    { id: 'p1', amount: 500, amount_paisa: 50000, method: 'cash', is_void: false },
    { id: 'p2', amount: 500, amount_paisa: 50000, method: 'jazzcash', is_void: true }, // voided
  ],
};
const state1 = computeOrderPaymentState(testOrder1);
assert(state1.totalPayablePaisa === 200000, 'Total payable is 200,000 paisa (Rs. 2000)');
assert(state1.amountPaidPaisa === 50000, 'Paid paisa only includes non-void payments (Rs. 500)');
assert(state1.remainingBalancePaisa === 150000, 'Remaining is Rs. 1500');
assert(state1.paymentStatus === 'partial', 'Payment status is partial');

console.log('\n--- 4. Testing Order Payment Addition & Overpayment Protection ---');
const restId = 'test-rest-01';
// Seed an order
const createdOrder = await orderService.createOrder(restId, {
  customer_name: 'Ahmed Khan',
  customer_phone: '03001112233',
  customer_address: 'House 12, Street 4, F-7, Islamabad',
  order_type: 'delivery',
  items: [
    { title: 'Zinger Burger', quantity: 2, unitPrice: 650 },
  ],
  subtotal: 1300,
  delivery_fee: 100,
  total_payable: 1400,
  initial_payment_amount: 400, // Partial paid initially
  payment_method: 'cash',
  recorded_by: 'Cashier Ali',
});

assert(createdOrder.payment_status === 'partial', 'Newly created order has payment_status partial');
assert(createdOrder.payments.length === 1, 'Initial payment recorded in order.payments');
assert(createdOrder.payments[0].amount === 400, 'Initial payment amount is 400');

// Attempt overpayment of Rs. 2000 (remaining is Rs. 1000)
const overpayResult = customerKhataService.addOrderPayment(restId, createdOrder.id, {
  amount: 2000,
  method: 'cash',
  recorded_by: 'Cashier Ali',
});
assert(overpayResult.requiresConfirmation === true, 'Overpayment rejected without advance credit confirmation');
assert(overpayResult.excessPaisa === 100000, 'Excess correctly identified as 100,000 paisa (Rs. 1000)');

// Add payment with advance_credit_accepted = true
const acceptedResult = customerKhataService.addOrderPayment(restId, createdOrder.id, {
  amount: 1000,
  method: 'jazzcash',
  note: 'Cleared balance via JazzCash',
  recorded_by: 'Cashier Ali',
});
assert(acceptedResult.success === true, 'Exact remaining payment succeeds');
assert(acceptedResult.order.payment_status === 'paid', 'Order status is now paid');

console.log('\n--- 5. Testing Payment Audit Trail (Edit & Void) ---');
const paymentToEdit = acceptedResult.payment;
// Edit payment amount from 1000 to 800
const editResult = customerKhataService.editOrderPayment(restId, createdOrder.id, paymentToEdit.id, {
  amount: 800,
  method: 'jazzcash',
  note: 'Customer had 200 short change',
  reason: 'Correcting cashier typo',
  recorded_by: 'Manager',
});
assert(editResult.payment.amount === 800, 'Edited payment amount is now 800');
assert(editResult.payment.edit_history.length === 1, 'Audit history recorded');
assert(editResult.payment.edit_history[0].reason === 'Correcting cashier typo', 'Reason saved in edit audit trail');
assert(editResult.order.payment_status === 'partial', 'Order status reverted to partial (Rs. 200 remaining)');

// Void payment
const voidResult = customerKhataService.voidOrderPayment(restId, createdOrder.id, paymentToEdit.id, {
  reason: 'Transaction cancelled by customer',
  voided_by: 'Manager',
});
assert(voidResult.payment.is_void === true, 'Payment marked as void');
assert(voidResult.payment.void_reason === 'Transaction cancelled by customer', 'Void reason recorded');
assert(voidResult.order.payment_status === 'partial', 'Remaining balance updated after void');

console.log('\n--- 6. Testing Customer Aggregation & Merge by Phone ---');
// Add another order with same customer phone formatted differently
await orderService.createOrder(restId, {
  customer_name: 'Ahmed K.',
  customer_phone: '+92 300 111 2233', // Same phone!
  items: [{ title: 'Fries Large', quantity: 1, unitPrice: 300 }],
  total_payable: 300,
  initial_payment_amount: 0, // completely unpaid
  payment_method: 'cash',
});

const customers = customerKhataService.getAllCustomers(restId);
const ahmed = customers.find((c) => c.phone === '03001112233');
assert(Boolean(ahmed), 'Customer Ahmed found by normalized phone');
assert(ahmed.orders.length === 2, '2 orders merged under single customer phone');
assert(ahmed.total_orders_count === 2, 'Total orders count is 2');
assert(ahmed.balance_due_paisa > 0, 'Balance due is positive');

console.log('\n--- 7. Testing Credit Limit and Overdue Logic ---');
// Set credit limit and overdue date
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
customerKhataService.saveCustomerProfile(restId, {
  phone: '03001112233',
  name: 'Ahmed Khan',
  credit_limit: 500, // Balance is ~1300 so this will exceed
  due_date: yesterday, // Expired yesterday
});

const updatedCust = customerKhataService.getCustomerByPhone(restId, '03001112233');
assert(updatedCust.is_overdue === true, 'Customer marked overdue when past due_date with balance');
assert(updatedCust.is_credit_limit_exceeded === true, 'Customer marked credit limit exceeded');

console.log('\n--- 8. Testing FIFO Auto-Allocation Preview & Application ---');
// Customer has 2 orders. Test FIFO allocation of Rs. 1000
const fifoPreview = customerKhataService.previewPaymentAllocation(updatedCust.orders, toPaisa(1000));
assert(fifoPreview.allocations.length === 2, 'FIFO preview contains both unpaid orders');
assert(fifoPreview.allocations[0].allocatedPaisa > 0, 'First oldest order received payment allocation');
assert(fifoPreview.totalAllocatedPaisa === 100000, 'Total allocated is Rs. 1000');

// Apply customer lump-sum payment
const applyResult = customerKhataService.applyCustomerPayment(restId, '03001112233', {
  amount: 1000,
  method: 'easypaisa',
  note: 'Lump sum settlement',
  recorded_by: 'Cashier Ali',
});
assert(applyResult.success === true, 'Lump sum payment successfully applied to orders');
assert(applyResult.appliedOrders.length > 0, 'Orders updated with allocated payments');

console.log('\n--- 9. Testing Khata Summary and Reports ---');
const summary = customerKhataService.getKhataSummary(restId);
assert(summary.totalCustomers >= 1, 'Total customers counted in summary');
assert(typeof summary.totalReceivablePaisa === 'number', 'Total receivable paisa is numeric');

const report = customerKhataService.getPendingPaymentsReport(restId);
assert(Array.isArray(report.rows), 'Report returns array of rows');
assert(typeof report.totalReceivablePaisa === 'number', 'Report returns totalReceivablePaisa');

console.log(`\n========================================`);
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
