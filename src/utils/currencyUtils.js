/**
 * Centralized PKR currency & financial integrity utilities for Dineflow
 * Stores money as integer paisa (1 PKR = 100 paisa) to avoid IEEE 754 float rounding issues.
 */

export const CURRENCY_SYMBOL = 'Rs.';
export const CURRENCY_CODE = 'PKR';

/**
 * Converts a Rupees value (number or string) into integer paisa
 * e.g. 1250 -> 125000, 850.50 -> 85050
 */
export function toPaisa(rupees) {
  if (rupees === null || rupees === undefined) return 0;
  const cleaned = typeof rupees === 'string' ? rupees.replace(/,/g, '').trim() : rupees;
  const num = Number(cleaned);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Converts integer paisa into Rupees
 * e.g. 125000 -> 1250, 85050 -> 850.5
 */
export function toRupees(paisa) {
  if (paisa === null || paisa === undefined || isNaN(paisa)) return 0;
  return Number((Math.round(paisa) / 100).toFixed(2));
}

/**
 * Formats a numeric value in Rupees into clean PKR currency format:
 * e.g. 1250 -> "Rs. 1,250"
 * e.g. 850.5 -> "Rs. 850.50"
 */
export function formatPKR(amount) {
  const num = Number(amount) || 0;
  const hasDecimals = num % 1 !== 0;
  const formatted = num.toLocaleString('en-PK', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `Rs. ${formatted}`;
}

/**
 * Formats integer paisa into clean PKR string
 * e.g. 125000 paisa -> "Rs. 1,250"
 */
export function formatPaisa(paisa) {
  return formatPKR(toRupees(paisa));
}

/**
 * Formats with full PKR code:
 * e.g. 1250 -> "PKR 1,250"
 */
export function formatPKRCode(amount) {
  const num = Number(amount) || 0;
  const hasDecimals = num % 1 !== 0;
  const formatted = num.toLocaleString('en-PK', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `PKR ${formatted}`;
}

/**
 * Formats raw number with commas:
 * e.g. 1250 -> "1,250"
 */
export function formatAmount(amount) {
  const num = Number(amount) || 0;
  const hasDecimals = num % 1 !== 0;
  return num.toLocaleString('en-PK', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Normalize phone numbers to merge duplicates reliably:
 * e.g. "+92 300 1234567", "00923001234567", "923001234567", "0300-1234567"
 * all normalize to "03001234567".
 */
export function normalizePhone(rawPhone) {
  if (!rawPhone) return '';
  const digits = String(rawPhone).replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('92') && digits.length >= 12) {
    return '0' + digits.slice(2);
  }
  if (digits.startsWith('0092') && digits.length >= 14) {
    return '0' + digits.slice(4);
  }
  if (!digits.startsWith('0') && digits.length === 10) {
    return '0' + digits;
  }
  return digits;
}

/**
 * Formats a phone number for display:
 * e.g. "03001234567" -> "0300-1234567"
 */
export function formatPhone(phone) {
  const norm = normalizePhone(phone);
  if (norm.length === 11 && norm.startsWith('03')) {
    return `${norm.slice(0, 4)}-${norm.slice(4)}`;
  }
  return phone || '';
}

/**
 * Computes exact payment state for an order using integer paisa precision
 * Handles legacy orders that don't yet have a `payments` array
 */
export function computeOrderPaymentState(order) {
  if (!order) {
    return {
      totalPayablePaisa: 0,
      amountPaidPaisa: 0,
      remainingBalancePaisa: 0,
      advanceCreditPaisa: 0,
      paymentStatus: 'unpaid',
      totalPayable: 0,
      amountPaid: 0,
      remainingBalance: 0,
      paymentsCount: 0,
      activePayments: [],
      voidedPayments: [],
    };
  }

  // 1. Total payable in paisa
  const totalPayablePaisa = order.total_payable_paisa != null
    ? Math.round(Number(order.total_payable_paisa))
    : toPaisa(order.total_payable ?? 0);

  // 2. Separate active vs voided payments
  const allPayments = Array.isArray(order.payments) ? order.payments : [];
  const activePayments = allPayments.filter((p) => !p.is_void);
  const voidedPayments = allPayments.filter((p) => p.is_void);

  let amountPaidPaisa = 0;

  if (allPayments.length > 0) {
    // Sum of active payments
    amountPaidPaisa = activePayments.reduce((sum, p) => {
      const pPaisa = p.amount_paisa != null ? Math.round(Number(p.amount_paisa)) : toPaisa(p.amount);
      return sum + pPaisa;
    }, 0);
  } else {
    // Fallback for legacy orders: check payment_status or amount_received
    const isPaidStatus = order.payment_status === 'paid';
    if (isPaidStatus) {
      amountPaidPaisa = totalPayablePaisa;
    } else if (order.amount_received != null && Number(order.amount_received) > 0) {
      amountPaidPaisa = Math.min(totalPayablePaisa, toPaisa(order.amount_received));
    } else {
      amountPaidPaisa = 0;
    }
  }

  const remainingBalancePaisa = Math.max(0, totalPayablePaisa - amountPaidPaisa);
  const advanceCreditPaisa = Math.max(0, amountPaidPaisa - totalPayablePaisa);

  let paymentStatus = 'unpaid';
  if (remainingBalancePaisa === 0 && totalPayablePaisa > 0) {
    paymentStatus = 'paid';
  } else if (amountPaidPaisa > 0) {
    paymentStatus = 'partial';
  } else {
    paymentStatus = 'unpaid';
  }

  // If order was explicitly marked completed and has no explicit payments,
  // we check if it was marked paid
  if (order.payment_status === 'paid' && allPayments.length === 0) {
    paymentStatus = 'paid';
  }

  return {
    totalPayablePaisa,
    amountPaidPaisa,
    remainingBalancePaisa,
    advanceCreditPaisa,
    paymentStatus, // 'paid' | 'partial' | 'unpaid'
    totalPayable: toRupees(totalPayablePaisa),
    amountPaid: toRupees(amountPaidPaisa),
    remainingBalance: toRupees(remainingBalancePaisa),
    advanceCredit: toRupees(advanceCreditPaisa),
    paymentsCount: activePayments.length,
    activePayments,
    voidedPayments,
  };
}
