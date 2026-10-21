import { supabase } from '../lib/supabaseClient.js';

const ORDERS_STORAGE_PREFIX = 'dinehq_orders_';

// Web Audio API synthesized kitchen bell chime and audio manager
let sharedAudioCtx = null;

export const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
  }
  return sharedAudioCtx;
};

export const unlockAudioContext = async () => {
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume();
    }
    return ctx?.state === 'running';
  } catch (err) {
    console.info('Audio unlock notice:', err);
    return false;
  }
};

export const playKitchenChime = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    // Tone 1: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.45);

    // Tone 2: A5 (880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.15);
    gain2.gain.setValueAtTime(0.45, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.85);
  } catch (err) {
    console.info('Kitchen chime notice:', err);
  }
};

// Loud dual-pulse alert chime designed to cut through busy kitchen noise
export const playLoudKitchenAlarm = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    // Pulse 1: 784Hz (G5) -> 1046Hz (C6)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(784, now);
    gain1.gain.setValueAtTime(0.5, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1046, now + 0.15);
    gain2.gain.setValueAtTime(0.55, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.6);

    // Pulse 2: Repeated alert burst
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(1318.5, now + 0.35); // E6
    gain3.gain.setValueAtTime(0.6, now + 0.35);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.35);
    osc3.stop(now + 0.95);
  } catch (err) {
    console.info('Kitchen alarm notice:', err);
  }
};

const isSupabaseConfigured = () => {
  return Boolean(
    typeof import.meta !== 'undefined' &&
    import.meta.env?.VITE_SUPABASE_URL &&
    import.meta.env?.VITE_SUPABASE_ANON_KEY &&
    !import.meta.env.VITE_SUPABASE_URL.includes('your-project-ref')
  );
};

// Starter initial orders for new or demo restaurants so the orders board is immediately functional
const getStarterOrders = (restaurantId, restaurantName) => [
  {
    id: 'DB-8421',
    restaurant_id: restaurantId,
    customer_name: 'Ahmed Khan',
    customer_phone: '923019876543',
    customer_address: 'House #42, Street 8, Sector F-7/2, Islamabad',
    customer_notes: 'Please add extra chili garlic dip and napkins.',
    subtotal: 2180,
    delivery_fee: 150,
    total_payable: 2330,
    status: 'preparing', // new, preparing, out_for_delivery, completed, cancelled
    items: [
      {
        title: 'Truffle Double Smash',
        quantity: 2,
        unitPrice: 1090,
        dealBadge: null,
        choices: ['Size: Double Patty', 'Add-on: Extra Cheddar Melt'],
      },
    ],
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    id: 'DB-7319',
    restaurant_id: restaurantId,
    customer_name: 'Sara Malik',
    customer_phone: '923214567890',
    customer_address: 'Apartment 4B, Silver Heights, Phase 5 DHA',
    customer_notes: 'Call before knocking, baby is asleep.',
    subtotal: 1580,
    delivery_fee: 150,
    total_payable: 1730,
    status: 'new',
    items: [
      {
        title: 'Crispy Nashville Hot Chicken',
        quantity: 1,
        unitPrice: 990,
        dealBadge: null,
        choices: ['Heat Level: Carolina Reaper Extreme'],
      },
      {
        title: 'Cajun Loaded Fries',
        quantity: 1,
        unitPrice: 590,
        dealBadge: null,
        choices: ['Dipping Sauce: Garlic Aioli'],
      },
    ],
    created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
  {
    id: 'DB-6102',
    restaurant_id: restaurantId,
    customer_name: 'Usman Tariq',
    customer_phone: '923335558899',
    customer_address: 'Office #302, Evacuee Trust Complex, Blue Area',
    customer_notes: 'Urgent lunch delivery please.',
    subtotal: 3450,
    delivery_fee: 0,
    total_payable: 3450,
    status: 'completed',
    items: [
      {
        title: 'Super Smash Duo Combo',
        quantity: 1,
        unitPrice: 2450,
        dealBadge: '🔥 SPECIAL DEAL',
        dealItems: '2x Truffle Smash + 1x Cajun Fries + 2x Drinks',
        choices: [],
      },
      {
        title: 'Artisan Vanilla Bean Shake',
        quantity: 2,
        unitPrice: 500,
        dealBadge: null,
        choices: [],
      },
    ],
    created_at: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
  },
];

export const orderService = {
  /**
   * Check client-side rate limit (max 5 orders per 10 minutes)
   */
  checkRateLimit() {
    if (typeof window === 'undefined') return { allowed: true };
    try {
      const KEY = 'dinehq_order_rate_limit';
      const now = Date.now();
      const tenMinutes = 10 * 60 * 1000;
      const history = JSON.parse(localStorage.getItem(KEY) || '[]');
      const recent = history.filter((t) => now - t < tenMinutes);

      if (recent.length >= 5) {
        const oldest = Math.min(...recent);
        const waitSec = Math.ceil((tenMinutes - (now - oldest)) / 1000);
        return {
          allowed: false,
          remainingSeconds: waitSec,
          message: `Too many orders placed from this device. Please wait ${waitSec}s before submitting again.`,
        };
      }
      return { allowed: true };
    } catch (e) {
      return { allowed: true };
    }
  },

  recordRateLimitHit() {
    if (typeof window === 'undefined') return;
    try {
      const KEY = 'dinehq_order_rate_limit';
      const now = Date.now();
      const tenMinutes = 10 * 60 * 1000;
      const history = JSON.parse(localStorage.getItem(KEY) || '[]');
      const recent = history.filter((t) => now - t < tenMinutes);
      recent.push(now);
      localStorage.setItem(KEY, JSON.stringify(recent));
    } catch (e) {}
  },

  /**
   * Save a newly placed order directly inside the app (In-App Direct Kitchen Order)
   */
  async createOrder({
    restaurant,
    customerDetails,
    cart,
    subtotal,
    deliveryFee = 0,
    finalTotal,
    orderId,
  }) {
    // 1. Bot Honeypot Protection
    if (customerDetails?.honeypot && customerDetails.honeypot.trim() !== '') {
      console.warn('Bot detected via honeypot trap.');
      throw new Error('Automated request blocked.');
    }

    // 2. Client-side Rate Limit check (skipped for manager / POS orders)
    if (!customerDetails?.isManagerOrder && customerDetails?.order_source !== 'manager') {
      const rateCheck = this.checkRateLimit();
      if (!rateCheck.allowed) {
        throw new Error(rateCheck.message);
      }
    }

    const restId = restaurant?.id || 'rest-101';
    const cleanId = orderId || `DB-${Math.floor(1000 + Math.random() * 9000)}`;

    // 3. Idempotency Check (prevent duplicate clicks)
    const idempotencyKey = customerDetails?.idempotencyKey;
    if (idempotencyKey) {
      const existingOrders = this.getOrders(restId);
      const duplicate = existingOrders.find(
        (o) => o.idempotency_key === idempotencyKey
      );
      if (duplicate) {
        console.warn('Duplicate order submission blocked via idempotency key:', idempotencyKey);
        return duplicate;
      }
    }

    const formattedItems = cart.map((cartItem) => {
      const deal = cartItem.item?.variants?.is_deal ? cartItem.item.variants : null;
      return {
        title: cartItem.item?.title || cartItem.title,
        quantity: cartItem.quantity,
        unitPrice: cartItem.unitPrice,
        dealBadge: deal?.badge || null,
        dealItems: deal?.deal_items || null,
        choices: cartItem.choiceDetails || [],
        notes: cartItem.notes || null,
      };
    });

    const orderType = customerDetails?.orderType || 'delivery';
    const tableNumber = customerDetails?.tableNumber ? String(customerDetails.tableNumber).trim() : null;

    const lat = customerDetails?.latitude ?? (customerDetails?.locationCoords?.lat || null);
    const lng = customerDetails?.longitude ?? (customerDetails?.locationCoords?.lng || null);
    const accuracy = customerDetails?.accuracy ?? null;
    const houseFlat = customerDetails?.houseFlat?.trim() || null;
    const areaLandmark = customerDetails?.areaLandmark?.trim() || null;
    const deliveryNotes = customerDetails?.deliveryNotes?.trim() || customerDetails?.notes?.trim() || '';

    let resolvedAddress = customerDetails?.address?.trim() || '';
    if (orderType === 'dine_in') {
      resolvedAddress = tableNumber ? `Dine-in (Table ${tableNumber})` : 'Dine-in';
    } else if (orderType === 'pickup') {
      resolvedAddress = 'Self Pick-up at Restaurant Counter';
    } else if (orderType === 'phone') {
      resolvedAddress = customerDetails?.address?.trim() ? `Phone Order - ${customerDetails.address.trim()}` : 'Phone Order (Pickup / Counter)';
    } else if (orderType === 'delivery') {
      const parts = [];
      if (houseFlat) parts.push(houseFlat);
      if (resolvedAddress && !resolvedAddress.toLowerCase().includes(houseFlat?.toLowerCase() || '---')) {
        parts.push(resolvedAddress);
      }
      if (areaLandmark && !resolvedAddress.toLowerCase().includes(areaLandmark.toLowerCase())) {
        parts.push(`(Near: ${areaLandmark})`);
      }
      if (parts.length > 0) {
        resolvedAddress = parts.join(', ');
      }
    }

    const newOrder = {
      id: cleanId,
      restaurant_id: restId,
      order_source: customerDetails?.order_source || (customerDetails?.isManagerOrder ? 'manager' : 'customer'),
      staff_name: customerDetails?.staff_name || null,
      customer_name: customerDetails?.name?.trim() || (orderType === 'dine_in' ? `Table ${tableNumber || 'Guest'}` : 'Direct Guest'),
      customer_phone: customerDetails?.phone?.trim() || '',
      order_type: orderType, // 'delivery' | 'pickup' | 'dine_in' | 'phone'
      table_number: tableNumber,
      customer_address: resolvedAddress,
      latitude: lat ? Number(lat) : null,
      longitude: lng ? Number(lng) : null,
      accuracy: accuracy ? Number(accuracy) : null,
      house_flat: houseFlat,
      area_landmark: areaLandmark,
      delivery_notes: deliveryNotes,
      location_coords: (lat && lng) ? { lat: Number(lat), lng: Number(lng) } : null,
      customer_notes: deliveryNotes || customerDetails?.notes?.trim() || '',
      payment_method: customerDetails?.paymentMethod || (orderType === 'delivery' ? 'Cash on Delivery' : 'Pay at Counter'),
      payment_status: customerDetails?.payment_status || 'unpaid',
      discount: Number(customerDetails?.discount) || 0,
      discount_type: customerDetails?.discount_type || 'fixed',
      amount_received: customerDetails?.amount_received != null ? Number(customerDetails.amount_received) : null,
      change_due: customerDetails?.change_due != null ? Number(customerDetails.change_due) : null,
      subtotal: Number(subtotal) || 0,
      delivery_fee: Number(deliveryFee) || 0,
      total_payable: Number(finalTotal) || ((Number(subtotal) || 0) + (Number(deliveryFee) || 0)),
      estimated_prep_time: restaurant?.prep_time || '20–30 mins',
      status: customerDetails?.status || 'new', // new, preparing, out_for_delivery, completed, cancelled, held
      items: formattedItems,
      idempotency_key: idempotencyKey || null,
      created_at: new Date().toISOString(),
    };

    // 1. Try persisting to Supabase if an orders table exists
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('orders').insert([
          {
            id: newOrder.id,
            restaurant_id: restId,
            customer_name: newOrder.customer_name,
            customer_phone: newOrder.customer_phone,
            order_type: newOrder.order_type,
            table_number: newOrder.table_number,
            customer_address: newOrder.customer_address,
            customer_notes: newOrder.customer_notes,
            payment_method: newOrder.payment_method,
            subtotal: newOrder.subtotal,
            delivery_fee: newOrder.delivery_fee,
            total_payable: newOrder.total_payable,
            status: newOrder.status,
            items: newOrder.items,
            latitude: newOrder.latitude,
            longitude: newOrder.longitude,
            accuracy: newOrder.accuracy,
            house_flat: newOrder.house_flat,
            area_landmark: newOrder.area_landmark,
          },
        ]);
      } catch (e) {
        // Table might not exist yet, fallback to localStorage
      }
    }

    // 2. Persist in local storage for instant dashboard updates
    try {
      const storageKey = `${ORDERS_STORAGE_PREFIX}${restId}`;
      const existing = this.getOrders(restId);
      const updated = [newOrder, ...existing.filter((o) => o.id !== newOrder.id)];
      localStorage.setItem(storageKey, JSON.stringify(updated));

      // Record rate limit timestamp
      this.recordRateLimitHit();

      // Save as customer's active order in localStorage for tracking
      localStorage.setItem('dinehq_active_order', JSON.stringify({ id: newOrder.id, restaurantId: restId }));

      // Broadcast order placed event for live kitchen feed and audio chime
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('dinehq_order_placed', {
            detail: { restaurantId: restId, order: newOrder },
          })
        );
      }
    } catch (e) {
      console.warn('Failed to save order to localStorage:', e);
    }

    return newOrder;
  },

  /**
   * Get all orders for a restaurant
   */
  getOrders(restaurantId) {
    if (!restaurantId) return [];
    const storageKey = `${ORDERS_STORAGE_PREFIX}${restaurantId}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Sanitize any existing orders by removing residual discounts and recalculating total
          const cleaned = parsed.map((order) => {
            const copy = { ...order };
            delete copy.discount_percentage;
            delete copy.discount_amount;
            if (copy.subtotal != null) {
              copy.total_payable = (Number(copy.subtotal) || 0) + (Number(copy.delivery_fee) || 0);
            }
            return copy;
          });
          return cleaned;
        }
      }
    } catch (e) {
      console.warn('Failed to parse orders:', e);
    }

    // Seed default starter orders for demonstration
    const starter = getStarterOrders(restaurantId);
    try {
      localStorage.setItem(storageKey, JSON.stringify(starter));
    } catch (e) {}
    return starter;
  },

  /**
   * Get a specific order by ID (with real-time updates for customer tracking)
   */
  async getOrderById(orderId, restaurantId = null) {
    if (!orderId) return null;

    // 1. Try local storage first
    if (restaurantId) {
      const orders = this.getOrders(restaurantId);
      const found = orders.find((o) => o.id === orderId);
      if (found) return found;
    }

    // Search across all restaurant storage keys in localStorage
    if (typeof window !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(ORDERS_STORAGE_PREFIX)) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const list = JSON.parse(raw);
              if (Array.isArray(list)) {
                const found = list.find((o) => o.id === orderId);
                if (found) return found;
              }
            }
          }
        }
      } catch (e) {
        console.warn('Error reading orders from localStorage:', e);
      }
    }

    // 2. Query Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .maybeSingle();

        if (data && !error) return data;
      } catch (e) {
        console.warn('Supabase getOrderById error:', e);
      }
    }

    return null;
  },

  /**
   * Update the status and optional fields of an order
   */
  updateOrderStatus(restaurantId, orderId, newStatus, additionalUpdates = {}) {
    const storageKey = `${ORDERS_STORAGE_PREFIX}${restaurantId}`;
    const orders = this.getOrders(restaurantId);
    let updatedOrder = null;
    const updated = orders.map((o) => {
      if (o.id === orderId) {
        updatedOrder = { ...o, status: newStatus, ...additionalUpdates };
        return updatedOrder;
      }
      return o;
    });

    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('dinehq_order_status_updated', {
            detail: { restaurantId, orderId, status: newStatus, order: updatedOrder },
          })
        );
      }
    } catch (e) {
      console.warn('Failed to update order status:', e);
    }

    if (isSupabaseConfigured()) {
      supabase.from('orders').update({ status: newStatus, ...additionalUpdates }).eq('id', orderId).then().catch(() => {});
    }

    return updated;
  },

  /**
   * Append newly added items to an existing running table order
   */
  appendItemsToOrder(restaurantId, orderId, newCartItems = []) {
    const storageKey = `${ORDERS_STORAGE_PREFIX}${restaurantId}`;
    const orders = this.getOrders(restaurantId);
    const existing = orders.find((o) => o.id === orderId);
    if (!existing) throw new Error('Existing order not found');

    const formattedNewItems = newCartItems.map((cartItem) => {
      const deal = cartItem.item?.variants?.is_deal ? cartItem.item.variants : null;
      return {
        title: cartItem.item?.title || cartItem.title,
        quantity: cartItem.quantity,
        unitPrice: cartItem.unitPrice,
        dealBadge: deal?.badge || null,
        dealItems: deal?.deal_items || null,
        choices: cartItem.choiceDetails || [],
        notes: cartItem.notes || null,
        is_added_round: true, // marks items added in a later round/tab
      };
    });

    const combinedItems = [...(existing.items || []), ...formattedNewItems];
    const addedSubtotal = formattedNewItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const newSubtotal = (Number(existing.subtotal) || 0) + addedSubtotal;
    const discountAmount = existing.discount_type === 'percent'
      ? (newSubtotal * (Number(existing.discount) || 0)) / 100
      : (Number(existing.discount) || 0);
    const newTotal = Math.max(0, newSubtotal - discountAmount + (Number(existing.delivery_fee) || 0));

    const updatedOrder = {
      ...existing,
      items: combinedItems,
      subtotal: newSubtotal,
      total_payable: newTotal,
      updated_at: new Date().toISOString(),
    };

    const updatedList = orders.map((o) => (o.id === orderId ? updatedOrder : o));
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedList));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('dinehq_order_status_updated', {
            detail: { restaurantId, orderId, order: updatedOrder },
          })
        );
      }
    } catch (e) {
      console.warn('Failed to append items to order:', e);
    }

    if (isSupabaseConfigured()) {
      supabase.from('orders').update({
        items: combinedItems,
        subtotal: newSubtotal,
        total_payable: newTotal,
      }).eq('id', orderId).then().catch(() => {});
    }

    return { updatedOrder, newlyAddedItems: formattedNewItems };
  },

  /**
   * Update the items of an order (remove accidental items, adjust quantities, add items)
   * and automatically recalculate subtotal, discounts, and total_payable.
   */
  updateOrderItems(restaurantId, orderId, updatedItems = [], additionalOverrides = {}) {
    const storageKey = `${ORDERS_STORAGE_PREFIX}${restaurantId}`;
    const orders = this.getOrders(restaurantId);
    const existing = orders.find((o) => o.id === orderId);
    if (!existing) throw new Error('Order not found');

    const newSubtotal = updatedItems.reduce(
      (sum, item) => sum + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 1),
      0
    );

    const discountVal = additionalOverrides.discount !== undefined
      ? Number(additionalOverrides.discount)
      : (Number(existing.discount) || 0);
    const discountType = additionalOverrides.discount_type || existing.discount_type || 'fixed';

    const discountAmount = discountType === 'percent'
      ? (newSubtotal * discountVal) / 100
      : Math.min(newSubtotal, discountVal);

    const deliveryFee = additionalOverrides.delivery_fee !== undefined
      ? Number(additionalOverrides.delivery_fee)
      : (Number(existing.delivery_fee) || 0);

    const newTotal = Math.max(0, newSubtotal - discountAmount + deliveryFee);

    const updatedOrder = {
      ...existing,
      ...additionalOverrides,
      items: updatedItems,
      subtotal: newSubtotal,
      discount: discountVal,
      discount_type: discountType,
      delivery_fee: deliveryFee,
      total_payable: newTotal,
      updated_at: new Date().toISOString(),
    };

    const updatedList = orders.map((o) => (o.id === orderId ? updatedOrder : o));
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedList));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('dinehq_order_status_updated', {
            detail: { restaurantId, orderId, order: updatedOrder },
          })
        );
      }
    } catch (e) {
      console.warn('Failed to update order items:', e);
    }

    if (isSupabaseConfigured()) {
      supabase.from('orders').update({
        items: updatedItems,
        subtotal: newSubtotal,
        total_payable: newTotal,
      }).eq('id', orderId).then().catch(() => {});
    }

    return updatedOrder;
  },

  /**
   * Calculate real dynamic KPIs for a restaurant based on actual orders
   */
  getOrderStats(restaurantId) {
    const orders = this.getOrders(restaurantId);
    const validOrders = orders.filter((o) => o.status !== 'cancelled');
    const totalOrders = validOrders.length;
    const grossVolume = validOrders.reduce((sum, o) => sum + (Number(o.total_payable) || 0), 0);
    // 30% saved from standard food aggregators
    const savedCommission = grossVolume * 0.30;
    const activeCount = orders.filter((o) => o.status === 'new' || o.status === 'preparing').length;

    return {
      totalOrders,
      grossVolume,
      savedCommission,
      activeCount,
    };
  },
};
