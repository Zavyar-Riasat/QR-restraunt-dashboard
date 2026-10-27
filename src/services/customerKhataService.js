import { orderService } from './orderService.js';
import {
  toPaisa,
  toRupees,
  formatPKR,
  formatPaisa,
  normalizePhone,
  formatPhone,
  computeOrderPaymentState,
} from '../utils/currencyUtils.js';

const CUSTOMERS_STORAGE_PREFIX = 'dinehq_customers_';

export const customerKhataService = {
  /**
   * Get manual customer profiles stored in localStorage for a restaurant
   */
  getManualCustomerProfiles(restaurantId) {
    if (!restaurantId || typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(`${CUSTOMERS_STORAGE_PREFIX}${restaurantId}`);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn('Failed to load customers from storage:', e);
      return {};
    }
  },

  /**
   * Save or update a customer profile (name, phone, address, notes, credit_limit_paisa, due_date)
   */
  saveCustomerProfile(restaurantId, profileData) {
    if (!restaurantId || !profileData?.phone) {
      throw new Error('Customer phone number is required');
    }
    const cleanPhone = normalizePhone(profileData.phone);
    if (!cleanPhone) throw new Error('A valid phone number is required');

    const profiles = this.getManualCustomerProfiles(restaurantId);
    const existing = profiles[cleanPhone] || {};

    const updatedProfile = {
      ...existing,
      ...profileData,
      phone: cleanPhone,
      name: profileData.name?.trim() || existing.name || 'Customer',
      address: profileData.address?.trim() ?? existing.address ?? '',
      notes: profileData.notes?.trim() ?? existing.notes ?? '',
      credit_limit_paisa: profileData.credit_limit_paisa != null
        ? Math.max(0, Math.round(Number(profileData.credit_limit_paisa)))
        : (profileData.credit_limit != null ? toPaisa(profileData.credit_limit) : (existing.credit_limit_paisa ?? 0)),
      due_date: profileData.due_date !== undefined ? profileData.due_date : (existing.due_date ?? null),
      updated_at: new Date().toISOString(),
      created_at: existing.created_at || new Date().toISOString(),
    };

    profiles[cleanPhone] = updatedProfile;

    try {
      localStorage.setItem(`${CUSTOMERS_STORAGE_PREFIX}${restaurantId}`, JSON.stringify(profiles));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('dinehq_customer_updated', {
            detail: { restaurantId, phone: cleanPhone, profile: updatedProfile },
          })
        );
      }
    } catch (e) {
      console.warn('Failed to save customer profile:', e);
    }

    return updatedProfile;
  },

  /**
   * Get all aggregated customers for a restaurant:
   * Merges orders by customer phone number and combines with manual profiles.
   */
  getAllCustomers(restaurantId) {
    const orders = orderService.getOrders(restaurantId);
    const manualProfiles = this.getManualCustomerProfiles(restaurantId);

    // Map: normalizedPhone -> aggregated data
    const customerMap = new Map();

    // 1. Process manual profiles first so customers added manually without orders appear
    Object.keys(manualProfiles).forEach((phoneKey) => {
      const p = manualProfiles[phoneKey];
      customerMap.set(phoneKey, {
        phone: phoneKey,
        name: p.name || 'Customer',
        address: p.address || '',
        notes: p.notes || '',
        credit_limit_paisa: p.credit_limit_paisa || 0,
        due_date: p.due_date || null,
        total_orders_count: 0,
        total_spent_paisa: 0,
        total_paid_paisa: 0,
        balance_due_paisa: 0,
        orders: [],
        first_order_at: null,
        last_order_at: null,
      });
    });

    // 2. Iterate through all orders and aggregate by normalized customer phone
    orders.forEach((order) => {
      const normPhone = normalizePhone(order.customer_phone);
      if (!normPhone) return; // Skip phone-less anonymous counter orders without Khata

      if (!customerMap.has(normPhone)) {
        customerMap.set(normPhone, {
          phone: normPhone,
          name: order.customer_name || 'Customer',
          address: order.customer_address || '',
          notes: '',
          credit_limit_paisa: 0,
          due_date: null,
          total_orders_count: 0,
          total_spent_paisa: 0,
          total_paid_paisa: 0,
          balance_due_paisa: 0,
          orders: [],
          first_order_at: null,
          last_order_at: null,
        });
      }

      const c = customerMap.get(normPhone);

      // Prefer latest non-empty name and address
      if (order.customer_name && (!c.name || c.name === 'Customer' || c.name === 'Direct Guest')) {
        c.name = order.customer_name;
      }
      if (order.customer_address && !c.address) {
        c.address = order.customer_address;
      }

      if (order.status !== 'cancelled') {
        const paymentState = computeOrderPaymentState(order);

        c.total_orders_count += 1;
        c.total_spent_paisa += paymentState.totalPayablePaisa;
        c.total_paid_paisa += paymentState.totalPayablePaisa;
        c.balance_due_paisa = 0;

        c.orders.push({
          ...order,
          paymentState,
        });

        const orderTime = new Date(order.created_at || Date.now()).getTime();
        if (!c.first_order_at || orderTime < new Date(c.first_order_at).getTime()) {
          c.first_order_at = order.created_at;
        }
        if (!c.last_order_at || orderTime > new Date(c.last_order_at).getTime()) {
          c.last_order_at = order.created_at;
        }
      }
    });

    // 3. Compute overdue flags and credit limit alerts
    const nowMs = Date.now();
    const result = Array.from(customerMap.values()).map((c) => {
      // Sort orders descending by creation date
      c.orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const isOverdue = Boolean(
        c.due_date &&
        c.balance_due_paisa > 0 &&
        nowMs > new Date(c.due_date).getTime()
      );

      const isCreditLimitExceeded = Boolean(
        c.credit_limit_paisa > 0 &&
        c.balance_due_paisa > c.credit_limit_paisa
      );

      return {
        ...c,
        balance_due_paisa: 0,
        is_overdue: false,
        is_credit_limit_exceeded: false,
        balance_due: 0,
        total_spent: toRupees(c.total_spent_paisa),
        total_paid: toRupees(c.total_spent_paisa),
        credit_limit: 0,
      };
    });

    return result;
  },

  /**
   * Get a single customer by phone number
   */
  getCustomerByPhone(restaurantId, phone) {
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone) return null;
    const all = this.getAllCustomers(restaurantId);
    return all.find((c) => c.phone === cleanPhone) || null;
  },

  /**
   * Add a payment directly to an order
   * Validates overpayment unless advance_credit_accepted is true
   */
  addOrderPayment(restaurantId, orderId, paymentPayload) {
    const orders = orderService.getOrders(restaurantId);
    const orderIndex = orders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) throw new Error(`Order #${orderId} not found`);

    const order = orders[orderIndex];
    const currentState = computeOrderPaymentState(order);

    const amountPaisa = paymentPayload.amount_paisa != null
      ? Math.round(Number(paymentPayload.amount_paisa))
      : toPaisa(paymentPayload.amount);

    if (amountPaisa <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    // Overpayment check:
    const remainingPaisa = currentState.remainingBalancePaisa;
    if (amountPaisa > remainingPaisa && !paymentPayload.advance_credit_accepted) {
      const excessPaisa = amountPaisa - remainingPaisa;
      return {
        success: false,
        requiresConfirmation: true,
        code: 'OVERPAYMENT',
        message: `Entered amount (Rs. ${toRupees(amountPaisa)}) exceeds the remaining balance (Rs. ${toRupees(remainingPaisa)}) by Rs. ${toRupees(excessPaisa)}. Would you like to confirm this as customer advance / credit?`,
        remainingPaisa,
        excessPaisa,
      };
    }

    const newPayment = {
      id: `PAY-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      order_id: orderId,
      amount_paisa: amountPaisa,
      amount: toRupees(amountPaisa),
      method: paymentPayload.method || 'cash', // 'cash' | 'jazzcash' | 'easypaisa' | 'bank' | 'card'
      date: paymentPayload.date || new Date().toISOString(),
      note: paymentPayload.note?.trim() || '',
      recorded_by: paymentPayload.recorded_by || 'Manager',
      is_void: false,
      created_at: new Date().toISOString(),
      edit_history: [],
    };

    // If order was a legacy order without payments array, but had amount_received
    let existingPayments = Array.isArray(order.payments) ? [...order.payments] : [];
    if (existingPayments.length === 0 && currentState.amountPaidPaisa > 0) {
      existingPayments.push({
        id: `PAY-LEGACY-${order.id}`,
        order_id: orderId,
        amount_paisa: currentState.amountPaidPaisa,
        amount: toRupees(currentState.amountPaidPaisa),
        method: order.payment_method || 'cash',
        date: order.created_at || new Date().toISOString(),
        note: 'Initial payment recorded at order creation',
        recorded_by: order.staff_name || 'System',
        is_void: false,
        created_at: order.created_at || new Date().toISOString(),
        edit_history: [],
      });
    }

    const updatedPayments = [...existingPayments, newPayment];
    const dummyOrder = { ...order, payments: updatedPayments };
    const nextState = computeOrderPaymentState(dummyOrder);

    const updatedOrder = {
      ...order,
      payments: updatedPayments,
      total_payable_paisa: nextState.totalPayablePaisa,
      payment_status: nextState.paymentStatus,
      amount_received: nextState.amountPaid,
      updated_at: new Date().toISOString(),
    };

    orders[orderIndex] = updatedOrder;

    try {
      localStorage.setItem(`dinehq_orders_${restaurantId}`, JSON.stringify(orders));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('dinehq_order_status_updated', {
            detail: {
              restaurantId,
              orderId,
              order: updatedOrder,
              payment: newPayment,
            },
          })
        );
      }
    } catch (e) {
      console.warn('Failed to save order payment:', e);
    }

    return {
      success: true,
      order: updatedOrder,
      payment: newPayment,
      paymentState: nextState,
    };
  },

  /**
   * Edit an existing payment with reason and audit trail
   */
  editOrderPayment(restaurantId, orderId, paymentId, newAmountPaisaOrPayload, reasonArg, editedByArg = 'Manager') {
    let cleanAmountPaisa;
    let reason;
    let editedBy;

    if (typeof newAmountPaisaOrPayload === 'object' && newAmountPaisaOrPayload !== null) {
      const p = newAmountPaisaOrPayload;
      cleanAmountPaisa = p.amount_paisa != null ? Math.round(Number(p.amount_paisa)) : toPaisa(p.amount);
      reason = p.reason || reasonArg;
      editedBy = p.recorded_by || p.edited_by || editedByArg;
    } else {
      cleanAmountPaisa = Math.round(Number(newAmountPaisaOrPayload));
      reason = reasonArg;
      editedBy = editedByArg;
    }

    if (!reason || !reason.trim()) {
      throw new Error('A reason is required to edit a recorded payment');
    }
    if (cleanAmountPaisa <= 0) {
      throw new Error('New payment amount must be greater than zero');
    }

    const orders = orderService.getOrders(restaurantId);
    const orderIndex = orders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) throw new Error(`Order #${orderId} not found`);

    const order = orders[orderIndex];
    const payments = Array.isArray(order.payments) ? [...order.payments] : [];
    const payIndex = payments.findIndex((p) => p.id === paymentId);
    if (payIndex === -1) throw new Error(`Payment #${paymentId} not found`);

    const targetPay = payments[payIndex];
    if (targetPay.is_void) {
      throw new Error('Cannot edit a voided payment');
    }

    const editHistoryEntry = {
      edited_at: new Date().toISOString(),
      edited_by: editedBy,
      previous_amount_paisa: targetPay.amount_paisa,
      previous_amount: toRupees(targetPay.amount_paisa),
      new_amount_paisa: cleanAmountPaisa,
      new_amount: toRupees(cleanAmountPaisa),
      reason: reason.trim(),
    };

    payments[payIndex] = {
      ...targetPay,
      amount_paisa: cleanAmountPaisa,
      amount: toRupees(cleanAmountPaisa),
      updated_at: new Date().toISOString(),
      edit_history: [...(targetPay.edit_history || []), editHistoryEntry],
    };

    const dummyOrder = { ...order, payments };
    const nextState = computeOrderPaymentState(dummyOrder);

    const updatedOrder = {
      ...order,
      payments,
      payment_status: nextState.paymentStatus,
      amount_received: nextState.amountPaid,
      updated_at: new Date().toISOString(),
    };

    orders[orderIndex] = updatedOrder;

    try {
      localStorage.setItem(`dinehq_orders_${restaurantId}`, JSON.stringify(orders));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('dinehq_order_status_updated', {
            detail: { restaurantId, orderId, order: updatedOrder },
          })
        );
      }
    } catch (e) {
      console.warn('Failed to update payment:', e);
    }

    return {
      success: true,
      order: updatedOrder,
      payment: payments[payIndex],
      paymentState: nextState,
    };
  },

  /**
   * Void a payment with reason and audit trail
   */
  voidOrderPayment(restaurantId, orderId, paymentId, voidReasonOrPayload, voidedByArg = 'Manager') {
    let voidReason;
    let voidedBy;

    if (typeof voidReasonOrPayload === 'object' && voidReasonOrPayload !== null) {
      voidReason = voidReasonOrPayload.reason || voidReasonOrPayload.void_reason;
      voidedBy = voidReasonOrPayload.voided_by || voidReasonOrPayload.recorded_by || voidedByArg;
    } else {
      voidReason = voidReasonOrPayload;
      voidedBy = voidedByArg;
    }

    if (!voidReason || !voidReason.trim()) {
      throw new Error('A reason is required to void a recorded payment');
    }

    const orders = orderService.getOrders(restaurantId);
    const orderIndex = orders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) throw new Error(`Order #${orderId} not found`);

    const order = orders[orderIndex];
    const payments = Array.isArray(order.payments) ? [...order.payments] : [];
    const payIndex = payments.findIndex((p) => p.id === paymentId);
    if (payIndex === -1) throw new Error(`Payment #${paymentId} not found`);

    const targetPay = payments[payIndex];
    if (targetPay.is_void) {
      throw new Error('This payment is already voided');
    }

    payments[payIndex] = {
      ...targetPay,
      is_void: true,
      void_reason: voidReason.trim(),
      voided_at: new Date().toISOString(),
      voided_by: voidedBy,
    };

    const dummyOrder = { ...order, payments };
    const nextState = computeOrderPaymentState(dummyOrder);

    const updatedOrder = {
      ...order,
      payments,
      payment_status: nextState.paymentStatus,
      amount_received: nextState.amountPaid,
      updated_at: new Date().toISOString(),
    };

    orders[orderIndex] = updatedOrder;

    try {
      localStorage.setItem(`dinehq_orders_${restaurantId}`, JSON.stringify(orders));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('dinehq_order_status_updated', {
            detail: { restaurantId, orderId, order: updatedOrder },
          })
        );
      }
    } catch (e) {
      console.warn('Failed to void payment:', e);
    }

    return {
      success: true,
      order: updatedOrder,
      payment: payments[payIndex],
      voidedPayment: payments[payIndex],
      paymentState: nextState,
    };
  },

  /**
   * Compute FIFO Payment Allocation preview for a customer across their oldest unpaid orders
   */
  previewPaymentAllocation(customerOrders, paymentAmountPaisa) {
    const totalPaisa = Math.max(0, Math.round(Number(paymentAmountPaisa || 0)));

    // Filter unpaid or partially paid orders, sorted oldest first
    const eligibleOrders = customerOrders
      .filter((o) => o.status !== 'cancelled')
      .map((o) => ({
        order: o,
        paymentState: computeOrderPaymentState(o),
      }))
      .filter((item) => item.paymentState.remainingBalancePaisa > 0)
      .sort((a, b) => new Date(a.order.created_at).getTime() - new Date(b.order.created_at).getTime());

    let unallocatedPaisa = totalPaisa;
    const allocations = [];

    for (const item of eligibleOrders) {
      if (unallocatedPaisa <= 0) {
        allocations.push({
          orderId: item.order.id,
          orderNumber: item.order.id,
          date: item.order.created_at,
          orderTotalPaisa: item.paymentState.totalPayablePaisa,
          remainingBeforePaisa: item.paymentState.remainingBalancePaisa,
          allocatedPaisa: 0,
          remainingAfterPaisa: item.paymentState.remainingBalancePaisa,
        });
        continue;
      }

      const needed = item.paymentState.remainingBalancePaisa;
      const allocated = Math.min(unallocatedPaisa, needed);
      unallocatedPaisa -= allocated;

      allocations.push({
        orderId: item.order.id,
        orderNumber: item.order.id,
        date: item.order.created_at,
        orderTotalPaisa: item.paymentState.totalPayablePaisa,
        remainingBeforePaisa: needed,
        allocatedPaisa: allocated,
        remainingAfterPaisa: needed - allocated,
      });
    }

    const totalAllocatedPaisa = totalPaisa - unallocatedPaisa;

    return {
      allocations,
      totalAllocatedPaisa,
      unallocatedPaisa, // excess that becomes advance customer credit
      totalOrdersCount: eligibleOrders.length,
    };
  },

  /**
   * Apply customer payment to orders using auto FIFO or manual override
   */
  applyCustomerPayment(restaurantId, customerPhone, totalAmountPaisaOrPayload, paymentDetailsArg, manualAllocationsArg = null) {
    const customer = this.getCustomerByPhone(restaurantId, customerPhone);
    if (!customer) throw new Error('Customer not found');

    let totalPaisa;
    let paymentDetails;
    let manualAllocations;

    if (typeof totalAmountPaisaOrPayload === 'object' && totalAmountPaisaOrPayload !== null) {
      const p = totalAmountPaisaOrPayload;
      totalPaisa = p.amount_paisa != null ? Math.round(Number(p.amount_paisa)) : toPaisa(p.amount);
      paymentDetails = p;
      manualAllocations = p.manualAllocations || paymentDetailsArg || null;
    } else {
      totalPaisa = Math.max(0, Math.round(Number(totalAmountPaisaOrPayload)));
      paymentDetails = paymentDetailsArg || {};
      manualAllocations = manualAllocationsArg;
    }

    if (totalPaisa <= 0) throw new Error('Payment amount must be greater than zero');

    let allocationsToApply = [];

    if (manualAllocations && Array.isArray(manualAllocations) && manualAllocations.length > 0) {
      allocationsToApply = manualAllocations.map((a) => ({
        orderId: a.orderId,
        allocatedPaisa: Math.max(0, Math.round(Number(a.allocatedPaisa || 0))),
      })).filter((a) => a.allocatedPaisa > 0);
    } else {
      const preview = this.previewPaymentAllocation(customer.orders, totalPaisa);
      allocationsToApply = preview.allocations.filter((a) => a.allocatedPaisa > 0);
    }

    const recordedPayments = [];
    const updatedOrders = [];

    // Apply payments to each order
    for (const alloc of allocationsToApply) {
      const res = this.addOrderPayment(restaurantId, alloc.orderId, {
        amount_paisa: alloc.allocatedPaisa,
        method: paymentDetails.method || 'cash',
        date: paymentDetails.date || new Date().toISOString(),
        note: paymentDetails.note || `Customer lump-sum Khata payment`,
        recorded_by: paymentDetails.recorded_by || 'Manager',
        advance_credit_accepted: true,
      });

      if (res.success) {
        recordedPayments.push(res.payment);
        updatedOrders.push(res.order);
      }
    }

    return {
      success: true,
      recordedPayments,
      updatedOrders,
      appliedOrders: updatedOrders,
      totalAppliedPaisa: recordedPayments.reduce((s, p) => s + p.amount_paisa, 0),
    };
  },

  /**
   * Generate chronological customer ledger entries (Orders = Debits, Payments = Credits, Running Balance)
   */
  getCustomerLedger(restaurantId, customerPhone) {
    const customer = this.getCustomerByPhone(restaurantId, customerPhone);
    if (!customer) return { customer: null, lineItems: [], summary: {} };

    const lineItems = [];

    // 1. Collect all non-cancelled orders as Debits
    customer.orders.forEach((order) => {
      if (order.status === 'cancelled') return;

      const orderTotalPaisa = order.total_payable_paisa != null
        ? Math.round(Number(order.total_payable_paisa))
        : toPaisa(order.total_payable);

      lineItems.push({
        id: `ORDER-${order.id}`,
        timestamp: new Date(order.created_at || Date.now()).getTime(),
        date: order.created_at || new Date().toISOString(),
        type: 'DEBIT',
        typeLabel: 'Order Bill',
        ref: `#${order.id}`,
        orderId: order.id,
        description: `Order #${order.id} (${order.order_type || 'direct'}) - ${order.items?.length || 1} item(s)`,
        debitPaisa: orderTotalPaisa,
        creditPaisa: 0,
        method: order.payment_method || 'Order Bill',
        is_void: false,
      });

      // 2. Collect all payments for this order as Credits
      const orderPayments = Array.isArray(order.payments) ? order.payments : [];
      if (orderPayments.length > 0) {
        orderPayments.forEach((p) => {
          lineItems.push({
            id: p.id,
            timestamp: new Date(p.date || order.created_at).getTime(),
            date: p.date || order.created_at,
            type: 'CREDIT',
            typeLabel: p.is_void ? 'Payment (Voided)' : 'Payment Received',
            ref: p.id,
            orderId: order.id,
            description: `Payment for Order #${order.id}${p.note ? ' - ' + p.note : ''}${p.is_void ? ' [VOIDED: ' + p.void_reason + ']' : ''}`,
            debitPaisa: 0,
            creditPaisa: p.is_void ? 0 : (p.amount_paisa != null ? Math.round(Number(p.amount_paisa)) : toPaisa(p.amount)),
            method: p.method,
            is_void: p.is_void,
            void_reason: p.void_reason,
            recorded_by: p.recorded_by,
            edit_history: p.edit_history,
          });
        });
      } else {
        // Legacy order without explicit payments array
        if (order.payment_status === 'paid') {
          lineItems.push({
            id: `PAY-LEGACY-${order.id}`,
            timestamp: new Date(order.created_at).getTime() + 100, // micro offset after order
            date: order.created_at,
            type: 'CREDIT',
            typeLabel: 'Payment Received',
            ref: `PAY-${order.id}`,
            orderId: order.id,
            description: `Payment at counter/delivery for #${order.id}`,
            debitPaisa: 0,
            creditPaisa: orderTotalPaisa,
            method: order.payment_method || 'Cash',
            is_void: false,
            recorded_by: order.staff_name || 'Staff',
          });
        } else if (order.amount_received && Number(order.amount_received) > 0) {
          const paidP = toPaisa(order.amount_received);
          lineItems.push({
            id: `PAY-LEGACY-PARTIAL-${order.id}`,
            timestamp: new Date(order.created_at).getTime() + 100,
            date: order.created_at,
            type: 'CREDIT',
            typeLabel: 'Partial Payment',
            ref: `PAY-${order.id}`,
            orderId: order.id,
            description: `Initial partial payment for #${order.id}`,
            debitPaisa: 0,
            creditPaisa: paidP,
            method: order.payment_method || 'Cash',
            is_void: false,
            recorded_by: order.staff_name || 'Staff',
          });
        }
      }
    });

    // 3. Sort chronologically (oldest to newest) to calculate running balance
    lineItems.sort((a, b) => a.timestamp - b.timestamp);

    let runningBalancePaisa = 0;
    const computedItems = lineItems.map((item) => {
      if (!item.is_void) {
        runningBalancePaisa = runningBalancePaisa + item.debitPaisa - item.creditPaisa;
      }
      return {
        ...item,
        runningBalancePaisa,
        debit: toRupees(item.debitPaisa),
        credit: toRupees(item.creditPaisa),
        runningBalance: toRupees(runningBalancePaisa),
      };
    });

    const totalDebitsPaisa = computedItems.reduce((s, i) => s + (i.is_void ? 0 : i.debitPaisa), 0);
    const totalCreditsPaisa = computedItems.reduce((s, i) => s + (i.is_void ? 0 : i.creditPaisa), 0);
    const currentBalancePaisa = runningBalancePaisa;

    return {
      customer,
      lineItems: computedItems,
      summary: {
        totalDebitsPaisa,
        totalCreditsPaisa,
        currentBalancePaisa,
        totalDebits: toRupees(totalDebitsPaisa),
        totalCredits: toRupees(totalCreditsPaisa),
        currentBalance: toRupees(currentBalancePaisa),
        ordersCount: customer.total_orders_count,
      },
    };
  },

  /**
   * Export customer ledger as CSV string
   */
  exportCustomerLedgerCSV(restaurantId, customerPhone, restaurantName = 'Dineflow Restaurant') {
    const { customer, lineItems, summary } = this.getCustomerLedger(restaurantId, customerPhone);
    if (!customer) return '';

    const lines = [];
    lines.push(`"CUSTOMER ACCOUNT STATEMENT / KHATA LEDGER"`);
    lines.push(`"Restaurant:","${restaurantName}"`);
    lines.push(`"Customer Name:","${customer.name}"`);
    lines.push(`"Phone:","${formatPhone(customer.phone)}"`);
    lines.push(`"Address:","${customer.address || 'N/A'}"`);
    lines.push(`"Generated On:","${new Date().toLocaleString('en-PK')}"`);
    lines.push(`"Current Balance Due:","Rs. ${summary.currentBalance?.toLocaleString() || 0}"`);
    lines.push(``);
    lines.push(`"Date & Time","Reference","Type","Description","Payment Method","Debit (Rs.)","Credit (Rs.)","Running Balance (Rs.)"`);

    lineItems.forEach((row) => {
      const dt = new Date(row.date).toLocaleString('en-PK');
      lines.push(
        `"${dt}","${row.ref}","${row.typeLabel}","${row.description.replace(/"/g, '""')}","${row.method || '-'}","${row.debit || 0}","${row.credit || 0}","${row.runningBalance || 0}"`
      );
    });

    lines.push(``);
    lines.push(`"TOTAL DEBITS:","Rs. ${summary.totalDebits?.toLocaleString()}"`);
    lines.push(`"TOTAL CREDITS / PAYMENTS:","Rs. ${summary.totalCredits?.toLocaleString()}"`);
    lines.push(`"NET BALANCE DUE:","Rs. ${summary.currentBalance?.toLocaleString()}"`);

    return lines.join('\n');
  },

  /**
   * Plain text statement for WhatsApp or SMS share
   */
  generateShareStatementText(restaurantId, customerPhone, restaurantName = 'Our Restaurant') {
    const { customer, summary } = this.getCustomerLedger(restaurantId, customerPhone);
    if (!customer) return '';

    const dateStr = new Date().toLocaleDateString('en-PK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return [
      `🧾 *ACCOUNT STATEMENT - ${restaurantName.toUpperCase()}*`,
      `📅 Date: ${dateStr}`,
      `👤 Customer: ${customer.name}`,
      `📞 Phone: ${formatPhone(customer.phone)}`,
      `---------------------------------`,
      `📦 Total Orders: ${summary.ordersCount}`,
      `💵 Total Billed: Rs. ${summary.totalDebits?.toLocaleString()}`,
      `✅ Total Paid: Rs. ${summary.totalCredits?.toLocaleString()}`,
      `---------------------------------`,
      `🔴 *BALANCE DUE: Rs. ${summary.currentBalance?.toLocaleString()}*`,
      customer.due_date ? `⏳ Due Date: ${new Date(customer.due_date).toLocaleDateString('en-PK')}` : '',
      `---------------------------------`,
      `Thank you for your business! Please clear your pending balance at your earliest convenience.`,
    ].filter(Boolean).join('\n');
  },

  /**
   * Pending Payments Report (Udhaar) filtered by optional date range
   */
  getPendingPaymentsReport(restaurantId, fromDate = null, toDate = null) {
    const customers = this.getAllCustomers(restaurantId);
    const withBalance = customers.filter((c) => c.balance_due_paisa > 0);

    const fromMs = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : null;
    const toMs = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : null;

    const reportRows = [];

    withBalance.forEach((c) => {
      // Find orders with remaining balance within date filter
      const pendingOrders = c.orders.filter((o) => {
        if (o.paymentState.remainingBalancePaisa <= 0) return false;
        const oTime = new Date(o.created_at).getTime();
        if (fromMs && oTime < fromMs) return false;
        if (toMs && oTime > toMs) return false;
        return true;
      });

      if (pendingOrders.length > 0 || (!fromDate && !toDate)) {
        const filteredPendingPaisa = pendingOrders.reduce(
          (sum, o) => sum + o.paymentState.remainingBalancePaisa,
          0
        );

        reportRows.push({
          phone: c.phone,
          name: c.name,
          address: c.address,
          totalOrders: c.total_orders_count,
          totalSpentPaisa: c.total_spent_paisa,
          totalPaidPaisa: c.total_paid_paisa,
          totalBalanceDuePaisa: c.balance_due_paisa,
          periodPendingPaisa: pendingOrders.length > 0 ? filteredPendingPaisa : c.balance_due_paisa,
          due_date: c.due_date,
          is_overdue: c.is_overdue,
          pendingOrdersCount: pendingOrders.length,
          pendingOrders,
        });
      }
    });

    // Sort by highest balance due first
    reportRows.sort((a, b) => b.totalBalanceDuePaisa - a.totalBalanceDuePaisa);

    const totalReceivablePaisa = reportRows.reduce((sum, r) => sum + r.totalBalanceDuePaisa, 0);
    const overdueCount = reportRows.filter((r) => r.is_overdue).length;

    return {
      rows: reportRows,
      totalReceivablePaisa,
      totalReceivable: toRupees(totalReceivablePaisa),
      customerCount: reportRows.length,
      overdueCount,
    };
  },

  /**
   * Quick executive summary of Khata / Receivables
   */
  getKhataSummary(restaurantId) {
    const all = this.getAllCustomers(restaurantId);
    return {
      totalCustomers: all.length,
      customersWithBalanceCount: 0,
      totalReceivablePaisa: 0,
      topOverdueCustomers: [],
    };
  },

  /**
   * Get all recorded dues and ledger balances across all restaurants for a customer phone (read-only for customer dashboard)
   */
  getCustomerDuesAcrossRestaurants(customerPhone) {
    if (!customerPhone) return { totalBalanceDuePaisa: 0, totalBalanceDueRupees: 0, duesByRestaurant: [] };
    const cleanPhone = normalizePhone(customerPhone);
    if (!cleanPhone) return { totalBalanceDuePaisa: 0, totalBalanceDueRupees: 0, duesByRestaurant: [] };

    // Find all restaurant IDs present in localStorage (customers, orders, or defaults)
    const restaurantIds = new Set(['rest-101', 'burgersmoke', 'crust', 'shinwari', 'greenoasis']);
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CUSTOMERS_STORAGE_PREFIX)) {
          restaurantIds.add(key.replace(CUSTOMERS_STORAGE_PREFIX, ''));
        } else if (key && key.startsWith('dinehq_orders_')) {
          restaurantIds.add(key.replace('dinehq_orders_', ''));
        }
      }
    } catch (e) {
      console.warn('Error discovering restaurants for customer dues:', e);
    }

    const duesByRestaurant = [];
    let grandTotalPaisa = 0;

    restaurantIds.forEach((restId) => {
      const ledgerData = this.getCustomerLedger(restId, cleanPhone);
      if (ledgerData && ledgerData.customer) {
        const summary = ledgerData.summary || {};
        const balanceDuePaisa = summary.currentBalancePaisa != null ? summary.currentBalancePaisa : (ledgerData.customer.balance_due_paisa || 0);

        // Include if there is a recorded balance due OR if there is transaction history
        if (balanceDuePaisa > 0 || (ledgerData.lineItems && ledgerData.lineItems.length > 0)) {
          grandTotalPaisa += Math.max(0, balanceDuePaisa);

          let prettyName = 'Restaurant';
          if (restId === 'rest-101' || restId === 'burgersmoke') prettyName = 'Burger & Smoke Co.';
          else if (restId === 'crust') prettyName = 'Crust & Crave Pizzeria';
          else if (restId === 'shinwari') prettyName = 'Khyber Shinwari & Karahi Dera';
          else if (restId === 'greenoasis') prettyName = 'Green Oasis Cafe';
          else prettyName = restId.charAt(0).toUpperCase() + restId.slice(1);

          duesByRestaurant.push({
            restaurantId: restId,
            restaurantName: prettyName,
            balanceDuePaisa: Math.max(0, balanceDuePaisa),
            balanceDueRupees: toRupees(Math.max(0, balanceDuePaisa)),
            dueDate: ledgerData.customer.due_date || null,
            totalOrdersCount: ledgerData.customer.total_orders_count || 0,
            totalSpentPaisa: ledgerData.customer.total_spent_paisa || 0,
            totalPaidPaisa: ledgerData.customer.total_paid_paisa || 0,
            lineItems: ledgerData.lineItems || [],
          });
        }
      }
    });

    return {
      totalBalanceDuePaisa: grandTotalPaisa,
      totalBalanceDueRupees: toRupees(grandTotalPaisa),
      duesByRestaurant,
    };
  },
};

