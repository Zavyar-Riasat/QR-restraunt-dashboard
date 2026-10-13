import { supabase } from '../lib/supabaseClient.js';

const ORDERS_STORAGE_PREFIX = 'dinehq_orders_';

// Web Audio API pure synthesized kitchen bell chime (no external audio assets required)
export const playKitchenChime = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Tone 1: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.3, now);
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
    gain2.gain.setValueAtTime(0.35, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.8);
  } catch (err) {
    console.info('Kitchen chime notice:', err);
  }
};

const isSupabaseConfigured = () => {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
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
   * Save a newly placed order (called during WhatsApp checkout)
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
    const restId = restaurant?.id || 'rest-101';
    const cleanId = orderId || `DB-${Math.floor(1000 + Math.random() * 9000)}`;

    const formattedItems = cart.map((cartItem) => {
      const deal = cartItem.item?.variants?.is_deal ? cartItem.item.variants : null;
      return {
        title: cartItem.item.title,
        quantity: cartItem.quantity,
        unitPrice: cartItem.unitPrice,
        dealBadge: deal?.badge || null,
        dealItems: deal?.deal_items || null,
        choices: cartItem.choiceDetails || [],
      };
    });

    const newOrder = {
      id: cleanId,
      restaurant_id: restId,
      customer_name: customerDetails.name?.trim() || 'Direct Guest',
      customer_phone: customerDetails.phone?.trim() || '',
      customer_address: customerDetails.address?.trim() || 'Pick-up / Direct Counter',
      customer_notes: customerDetails.notes?.trim() || '',
      subtotal: Number(subtotal) || 0,
      delivery_fee: Number(deliveryFee) || 0,
      total_payable: Number(finalTotal) || ((Number(subtotal) || 0) + (Number(deliveryFee) || 0)),
      status: 'new', // new, preparing, out_for_delivery, completed, cancelled
      items: formattedItems,
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
            customer_address: newOrder.customer_address,
            customer_notes: newOrder.customer_notes,
            subtotal: newOrder.subtotal,
            delivery_fee: newOrder.delivery_fee,
            total_payable: newOrder.total_payable,
            status: newOrder.status,
            items: newOrder.items,
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
   * Update the status of an order
   */
  updateOrderStatus(restaurantId, orderId, newStatus) {
    const storageKey = `${ORDERS_STORAGE_PREFIX}${restaurantId}`;
    const orders = this.getOrders(restaurantId);
    const updated = orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o));
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('dinehq_order_status_updated', {
            detail: { restaurantId, orderId, status: newStatus },
          })
        );
      }
    } catch (e) {
      console.warn('Failed to update order status:', e);
    }

    if (isSupabaseConfigured()) {
      supabase.from('orders').update({ status: newStatus }).eq('id', orderId).then().catch(() => {});
    }

    return updated;
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
