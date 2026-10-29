import { supabase } from '../lib/supabaseClient.js';
import { toPaisa, toRupees, computeOrderPaymentState } from '../utils/currencyUtils.js';

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

const isUuid = (val) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val || ''));

let _ordersTableAvailable = true;
const isOrdersTableMissingError = (err) => {
  if (!err) return false;
  const code = String(err.code || '');
  const msg = String(err.message || '');
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('Could not find the table') ||
    msg.includes('relation "public.orders" does not exist')
  );
};

export const generateRiderToken = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let token = 'rtk_';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < 16; i++) {
      token += chars[bytes[i] % chars.length];
    }
  } else {
    for (let i = 0; i < 16; i++) {
      token += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return token;
};

// Starter initial orders for new or demo restaurants so the orders board is immediately functional
const getStarterOrders = (restaurantId, _restaurantName) => [
  {
    id: 'DB-8421',
    restaurant_id: restaurantId,
    customer_name: 'Ahmed Khan',
    customer_phone: '03019876543',
    customer_address: 'House #42, Street 8, Sector F-7/2, Islamabad',
    customer_notes: 'Please add extra chili garlic dip and napkins.',
    subtotal: 2180,
    delivery_fee: 150,
    total_payable: 2330,
    total_payable_paisa: 233000,
    order_type: 'delivery',
    status: 'preparing', // new, preparing, out_for_delivery, completed, cancelled
    payment_status: 'unpaid',
    explicit_paid: false,
    payments: [],
    rider_token: 'rtk_demo_8421',
    assigned_rider: { id: 'rdr-1', name: 'Muhammad Ali', phone: '0301-2345678' },
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
    customer_phone: '03214567890',
    customer_address: 'Apartment 4B, Silver Heights, Phase 5 DHA',
    customer_notes: 'Call before knocking, baby is asleep.',
    subtotal: 1580,
    delivery_fee: 150,
    total_payable: 1730,
    total_payable_paisa: 173000,
    order_type: 'delivery',
    status: 'preparing',
    payment_status: 'unpaid',
    explicit_paid: false,
    payments: [],
    rider_token: 'rtk_demo_7319',
    assigned_rider: null,
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
    customer_phone: '03335558899',
    customer_address: 'Office #302, Evacuee Trust Complex, Blue Area',
    customer_notes: 'Urgent lunch delivery please.',
    subtotal: 3450,
    delivery_fee: 0,
    total_payable: 3450,
    total_payable_paisa: 345000,
    order_type: 'delivery',
    status: 'completed',
    payment_status: 'paid', // Paid in full
    payments: [
      {
        id: 'PAY-6102-1',
        order_id: 'DB-6102',
        amount_paisa: 345000,
        amount: 3450,
        method: 'jazzcash',
        date: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
        note: 'Full settlement via JazzCash',
        recorded_by: 'Store Manager',
        is_void: false,
        created_at: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
        edit_history: [],
      },
    ],
    rider_token: 'rtk_demo_6102',
    assigned_rider: { id: 'rdr-2', name: 'Zubair Ahmed', phone: '0321-9876543' },
    completed_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    delivered_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
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
  // --- YESTERDAY'S ORDERS (Previous Day) ---
  {
    id: 'DB-5501',
    restaurant_id: restaurantId,
    customer_name: 'Tariq Mehmood',
    customer_phone: '03001234567',
    customer_address: 'In-Store Table 3',
    table_number: '3',
    order_type: 'dine_in',
    status: 'completed',
    payment_status: 'paid',
    subtotal: 2650,
    delivery_fee: 0,
    total_payable: 2650,
    total_payable_paisa: 265000,
    payment_method: 'Cash at Counter',
    amount_received: 2650,
    payments: [
      {
        id: 'PAY-5501-1',
        order_id: 'DB-5501',
        amount_paisa: 265000,
        amount: 2650,
        method: 'cash',
        date: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
        note: 'Cash received at counter',
        recorded_by: 'Cashier Ali',
        is_void: false,
        created_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
        edit_history: [],
      },
    ],
    items: [
      {
        title: 'Truffle Double Smash',
        quantity: 2,
        unitPrice: 1090,
        choices: ['Patty: Double', 'Sauce: Truffle Aioli'],
      },
      {
        title: 'Cajun Loaded Fries',
        quantity: 1,
        unitPrice: 470,
        choices: [],
      },
    ],
    created_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'DB-5502',
    restaurant_id: restaurantId,
    customer_name: 'Ayesha Noor',
    customer_phone: '03125556677',
    customer_address: 'House #14, Street 12, Sector F-10/2, Islamabad',
    order_type: 'delivery',
    status: 'completed',
    payment_status: 'paid',
    subtotal: 3950,
    delivery_fee: 150,
    total_payable: 4100,
    total_payable_paisa: 410000,
    payment_method: 'Online (JazzCash)',
    amount_received: 4100,
    payments: [
      {
        id: 'PAY-5502-1',
        order_id: 'DB-5502',
        amount_paisa: 410000,
        amount: 4100,
        method: 'jazzcash',
        date: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
        note: 'JazzCash payment confirmed',
        recorded_by: 'POS Manager',
        is_void: false,
        created_at: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
        edit_history: [],
      },
    ],
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
        quantity: 3,
        unitPrice: 500,
        choices: [],
      },
    ],
    created_at: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'DB-5503',
    restaurant_id: restaurantId,
    customer_name: 'Bilal Siddiqui',
    customer_phone: '03314449988',
    customer_address: 'Takeaway Counter',
    order_type: 'takeaway',
    status: 'completed',
    payment_status: 'paid',
    subtotal: 1580,
    delivery_fee: 0,
    total_payable: 1580,
    total_payable_paisa: 158000,
    payment_method: 'Cash',
    amount_received: 1580,
    payments: [
      {
        id: 'PAY-5503-1',
        order_id: 'DB-5503',
        amount_paisa: 158000,
        amount: 1580,
        method: 'cash',
        date: new Date(Date.now() - 19 * 60 * 60 * 1000).toISOString(),
        note: 'Cash settled at pickup',
        recorded_by: 'Cashier Ali',
        is_void: false,
        created_at: new Date(Date.now() - 19 * 60 * 60 * 1000).toISOString(),
        edit_history: [],
      },
    ],
    items: [
      {
        title: 'Crispy Nashville Hot Chicken',
        quantity: 1,
        unitPrice: 990,
        choices: ['Spice: Medium'],
      },
      {
        title: 'Cajun Loaded Fries',
        quantity: 1,
        unitPrice: 590,
        choices: [],
      },
    ],
    created_at: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 19 * 60 * 60 * 1000).toISOString(),
  },
  // --- PREVIOUS DAYS THIS WEEK (Last 7 Days) ---
  {
    id: 'DB-4810',
    restaurant_id: restaurantId,
    customer_name: 'Hamza Ali',
    customer_phone: '03456789012',
    customer_address: 'Table 1',
    table_number: '1',
    order_type: 'dine_in',
    status: 'completed',
    payment_status: 'paid',
    subtotal: 4200,
    delivery_fee: 0,
    total_payable: 4200,
    total_payable_paisa: 420000,
    payment_method: 'Online (Credit Card)',
    amount_received: 4200,
    items: [
      {
        title: 'Truffle Double Smash',
        quantity: 3,
        unitPrice: 1090,
        choices: [],
      },
      {
        title: 'Cajun Loaded Fries',
        quantity: 1,
        unitPrice: 590,
        choices: [],
      },
      {
        title: 'Artisan Vanilla Bean Shake',
        quantity: 1,
        unitPrice: 340,
        choices: [],
      },
    ],
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'DB-4815',
    restaurant_id: restaurantId,
    customer_name: 'Zainab Rehman',
    customer_phone: '03348881122',
    customer_address: 'House #55, MPCHS, E-11/3, Islamabad',
    order_type: 'delivery',
    status: 'completed',
    payment_status: 'paid',
    subtotal: 2100,
    delivery_fee: 150,
    total_payable: 2250,
    total_payable_paisa: 225000,
    payment_method: 'Cash on Delivery',
    amount_received: 2250,
    items: [
      {
        title: 'Crispy Nashville Hot Chicken',
        quantity: 2,
        unitPrice: 990,
        choices: [],
      },
      {
        title: 'Soft Drinks Can',
        quantity: 1,
        unitPrice: 120,
        choices: [],
      },
    ],
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 35 * 60 * 1000).toISOString(),
  },
  // --- PREVIOUS MONTH (September 2026) ---
  {
    id: 'DB-3920',
    restaurant_id: restaurantId,
    customer_name: 'Farhan Akhtar',
    customer_phone: '03027778899',
    customer_address: 'Table 6 (Family Hall)',
    table_number: '6',
    order_type: 'dine_in',
    status: 'completed',
    payment_status: 'paid',
    subtotal: 5400,
    delivery_fee: 0,
    total_payable: 5400,
    total_payable_paisa: 540000,
    payment_method: 'Online (Bank Transfer)',
    amount_received: 5400,
    items: [
      {
        title: 'Super Smash Duo Combo',
        quantity: 2,
        unitPrice: 2450,
        dealBadge: '🔥 SPECIAL DEAL',
        dealItems: '2x Truffle Smash + 1x Cajun Fries + 2x Drinks',
        choices: [],
      },
      {
        title: 'Artisan Vanilla Bean Shake',
        quantity: 1,
        unitPrice: 500,
        choices: [],
      },
    ],
    created_at: '2026-09-18T19:30:00.000Z',
    completed_at: '2026-09-18T20:25:00.000Z',
  },
  {
    id: 'DB-3925',
    restaurant_id: restaurantId,
    customer_name: 'Dr. M. Khalid',
    customer_phone: '03134445566',
    customer_address: 'Kulsum Plaza, Jinnah Avenue, Blue Area, Islamabad',
    order_type: 'delivery',
    status: 'completed',
    payment_status: 'paid',
    subtotal: 3250,
    delivery_fee: 150,
    total_payable: 3400,
    total_payable_paisa: 340000,
    payment_method: 'Cash on Delivery',
    amount_received: 3400,
    items: [
      {
        title: 'Truffle Double Smash',
        quantity: 2,
        unitPrice: 1090,
        choices: [],
      },
      {
        title: 'Cajun Loaded Fries',
        quantity: 1,
        unitPrice: 590,
        choices: [],
      },
      {
        title: 'Artisan Vanilla Bean Shake',
        quantity: 1,
        unitPrice: 480,
        choices: [],
      },
    ],
    created_at: '2026-09-24T18:15:00.000Z',
    completed_at: '2026-09-24T19:00:00.000Z',
  },
  // --- EARLIER MONTH (August 2026) ---
  {
    id: 'DB-2715',
    restaurant_id: restaurantId,
    customer_name: 'Salman Sheikh',
    customer_phone: '03229990011',
    customer_address: 'Table 2',
    table_number: '2',
    order_type: 'dine_in',
    status: 'completed',
    payment_status: 'paid',
    subtotal: 6800,
    delivery_fee: 0,
    total_payable: 6800,
    total_payable_paisa: 680000,
    payment_method: 'Online (Card)',
    amount_received: 6800,
    items: [
      {
        title: 'Super Smash Duo Combo',
        quantity: 2,
        unitPrice: 2450,
        dealBadge: '🔥 SPECIAL DEAL',
        dealItems: '2x Truffle Smash + 1x Cajun Fries + 2x Drinks',
        choices: [],
      },
      {
        title: 'Artisan Vanilla Bean Shake',
        quantity: 3,
        unitPrice: 500,
        choices: [],
      },
      {
        title: 'Cajun Loaded Fries',
        quantity: 1,
        unitPrice: 400,
        choices: [],
      },
    ],
    created_at: '2026-08-14T20:00:00.000Z',
    completed_at: '2026-08-14T21:10:00.000Z',
  },
  // --- PREVIOUS YEAR (2025) ---
  {
    id: 'DB-1105',
    restaurant_id: restaurantId,
    customer_name: 'Omar Qureshi',
    customer_phone: '03008882233',
    customer_address: 'House 88, Street 4, G-9/1, Islamabad',
    order_type: 'delivery',
    status: 'completed',
    payment_status: 'paid',
    subtotal: 2800,
    delivery_fee: 150,
    total_payable: 2950,
    total_payable_paisa: 295000,
    payment_method: 'Cash on Delivery',
    amount_received: 2950,
    items: [
      {
        title: 'Truffle Double Smash',
        quantity: 2,
        unitPrice: 1090,
        choices: [],
      },
      {
        title: 'Soft Drinks Can',
        quantity: 2,
        unitPrice: 310,
        choices: [],
      },
    ],
    created_at: '2025-11-20T19:00:00.000Z',
    completed_at: '2025-11-20T19:40:00.000Z',
  },
  {
    id: 'DB-1210',
    restaurant_id: restaurantId,
    customer_name: 'Mian Rizwan',
    customer_phone: '03217774433',
    customer_address: 'Table 4',
    table_number: '4',
    order_type: 'dine_in',
    status: 'completed',
    payment_status: 'paid',
    subtotal: 4650,
    delivery_fee: 0,
    total_payable: 4650,
    total_payable_paisa: 465000,
    payment_method: 'Online (Easypaisa)',
    amount_received: 4650,
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
        title: 'Crispy Nashville Hot Chicken',
        quantity: 2,
        unitPrice: 990,
        choices: [],
      },
      {
        title: 'Mineral Water Large',
        quantity: 2,
        unitPrice: 110,
        choices: [],
      },
    ],
    created_at: '2025-12-15T21:30:00.000Z',
    completed_at: '2025-12-15T22:20:00.000Z',
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
    } catch {
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
    } catch {}
  },

  /**
   * Save a newly placed order directly inside the app (In-App Direct Kitchen Order)
   */
  async createOrder(paramsOrRestId, maybePayload) {
    let restaurant, customerDetails, cart, subtotal, deliveryFee = 0, finalTotal, orderId;
    if (typeof paramsOrRestId === 'string') {
      restaurant = { id: paramsOrRestId };
      const p = maybePayload || {};
      customerDetails = {
        name: p.customer_name,
        phone: p.customer_phone,
        address: p.customer_address,
        orderType: p.order_type || 'delivery',
        paymentMethod: p.payment_method || 'cash',
        payment_status: p.payment_status,
        amount_received: p.amount_received ?? p.initial_payment_amount,
        ...p,
      };
      cart = (p.items || []).map((it) => ({
        item: { title: it.title },
        title: it.title,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
      }));
      subtotal = p.subtotal || p.total_payable || 0;
      deliveryFee = p.delivery_fee || 0;
      finalTotal = p.total_payable || (subtotal + deliveryFee);
      orderId = p.id;
    } else {
      ({
        restaurant,
        customerDetails,
        cart = [],
        subtotal = 0,
        deliveryFee = 0,
        finalTotal,
        orderId,
      } = paramsOrRestId || {});
    }

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
      customer_id: customerDetails?.customer_id || null,
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
      total_payable:
        finalTotal != null && !Number.isNaN(Number(finalTotal))
          ? Math.max(0, Number(finalTotal))
          : Math.max(
              0,
              (Number(subtotal) || 0) -
                (customerDetails?.discount_type === 'percent'
                  ? ((Number(subtotal) || 0) * (Number(customerDetails?.discount) || 0)) / 100
                  : Number(customerDetails?.discount) || 0) +
                (Number(deliveryFee) || 0)
            ),
      total_payable_paisa: toPaisa(
        finalTotal != null && !Number.isNaN(Number(finalTotal))
          ? Math.max(0, Number(finalTotal))
          : Math.max(
              0,
              (Number(subtotal) || 0) -
                (customerDetails?.discount_type === 'percent'
                  ? ((Number(subtotal) || 0) * (Number(customerDetails?.discount) || 0)) / 100
                  : Number(customerDetails?.discount) || 0) +
                (Number(deliveryFee) || 0)
            )
      ),
      estimated_prep_time: restaurant?.prep_time || '20–30 mins',
      status: customerDetails?.status || 'new', // new, preparing, out_for_delivery, completed, cancelled, held
      items: formattedItems,
      idempotency_key: idempotencyKey || null,
      created_at: new Date().toISOString(),
      rider_token: customerDetails?.rider_token || generateRiderToken(),
      assigned_rider: customerDetails?.assigned_rider || null,
    };

    // Calculate initial payments & payment status
    const calculatedPayablePaisa = newOrder.total_payable_paisa;
    let initialPayments = Array.isArray(customerDetails?.payments) ? [...customerDetails.payments] : [];

    const amtReceived = customerDetails?.amount_received != null && Number(customerDetails.amount_received) > 0
      ? Number(customerDetails.amount_received)
      : null;

    if (initialPayments.length === 0) {
      if (amtReceived && amtReceived > 0) {
        const receivedPaisa = toPaisa(amtReceived);
        initialPayments.push({
          id: `PAY-${cleanId}-1`,
          order_id: cleanId,
          amount_paisa: receivedPaisa,
          amount: toRupees(receivedPaisa),
          method: customerDetails?.paymentMethod || 'cash',
          date: new Date().toISOString(),
          note: customerDetails?.payment_note || 'Amount received at order creation',
          recorded_by: customerDetails?.staff_name || 'POS Staff',
          is_void: false,
          created_at: new Date().toISOString(),
          edit_history: [],
        });
      } else if (customerDetails?.payment_status === 'paid') {
        initialPayments.push({
          id: `PAY-${cleanId}-1`,
          order_id: cleanId,
          amount_paisa: calculatedPayablePaisa,
          amount: toRupees(calculatedPayablePaisa),
          method: customerDetails?.paymentMethod || 'cash',
          date: new Date().toISOString(),
          note: 'Full settlement at order creation',
          recorded_by: customerDetails?.staff_name || 'Staff',
          is_void: false,
          created_at: new Date().toISOString(),
          edit_history: [],
        });
      }
    }

    const initialPaymentState = computeOrderPaymentState({
      total_payable_paisa: calculatedPayablePaisa,
      payments: initialPayments,
      payment_status: customerDetails?.payment_status,
      amount_received: amtReceived,
    });

    newOrder.payments = initialPayments;
    newOrder.payment_status = initialPaymentState.paymentStatus;
    newOrder.amount_received = initialPaymentState.amountPaid;

    // 1. Try persisting to Supabase if an orders table exists and restId is a valid UUID
    if (isSupabaseConfigured() && _ordersTableAvailable && isUuid(restId)) {
      try {
        const { error } = await supabase.from('orders').insert([
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
        if (error && isOrdersTableMissingError(error)) {
          _ordersTableAvailable = false;
        }
      } catch {
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
   * Get all orders for a restaurant (with in-memory reference-stable cache keyed by raw storage string)
   */
  _ordersCache: new Map(),

  getOrders(restaurantId) {
    if (!restaurantId) return [];
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return getStarterOrders(restaurantId);
    }
    const storageKey = `${ORDERS_STORAGE_PREFIX}${restaurantId}`;
    const nowStr = new Date().toDateString();
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const cached = this._ordersCache.get(restaurantId);
        if (cached && cached.raw === saved && cached.dayStr === nowStr) {
          return cached.orders;
        }

        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Sanitize any existing orders by removing residual discounts and recalculating total
          let hasMissingTokens = false;
          let cleaned = parsed.map((order) => {
            const copy = { ...order };
            delete copy.discount_percentage;
            delete copy.discount_amount;
            if (copy.subtotal != null) {
              const sub = Number(copy.subtotal) || 0;
              const delFee = Number(copy.delivery_fee) || 0;
              const discVal = Number(copy.discount) || 0;
              const discAmt =
                copy.discount_type === 'percent'
                  ? (sub * discVal) / 100
                  : Math.min(sub, discVal);
              copy.total_payable = Math.max(0, sub - discAmt + delFee);
              copy.total_payable_paisa = toPaisa(copy.total_payable);
            }
            if (!copy.rider_token) {
              copy.rider_token = generateRiderToken();
              hasMissingTokens = true;
            }
            if (copy.total_payable_paisa == null && copy.total_payable != null) {
              copy.total_payable_paisa = toPaisa(copy.total_payable);
            }
            const isOrderCompleted = copy.status === 'completed' || copy.status === 'delivered';
            const isExplicitlyPaid = Boolean(copy.explicit_paid) || isOrderCompleted;
            if (isExplicitlyPaid) {
              if (copy.payment_status !== 'paid' || !copy.explicit_paid) {
                hasMissingTokens = true;
              }
              copy.payment_status = 'paid';
              copy.explicit_paid = true;
              copy.amount_received = copy.total_payable;
              if (!Array.isArray(copy.payments) || copy.payments.length === 0) {
                copy.payments = [{
                  id: `PAY-${copy.id || 'auto'}`,
                  order_id: copy.id,
                  amount_paisa: copy.total_payable_paisa || toPaisa(copy.total_payable),
                  amount: copy.total_payable,
                  method: copy.payment_method || 'cash',
                  date: copy.created_at || new Date().toISOString(),
                  is_void: false,
                }];
              }
            } else {
              if (copy.payment_status === 'paid' || (Array.isArray(copy.payments) && copy.payments.length > 0)) {
                hasMissingTokens = true;
              }
              copy.payment_status = 'unpaid';
              copy.explicit_paid = false;
              copy.amount_received = 0;
              copy.payments = [];
            }
            return copy;
          });

          // Check if dataset has any historical orders (older than today)
          const hasHistorical = cleaned.some((o) => {
            if (!o.created_at) return false;
            return new Date(o.created_at).toDateString() !== nowStr;
          });

          if (!hasHistorical) {
            const starters = getStarterOrders(restaurantId);
            const historicalStarters = starters.filter((s) => {
              if (!s.created_at) return false;
              return new Date(s.created_at).toDateString() !== nowStr;
            });
            cleaned = [...cleaned, ...historicalStarters];
            hasMissingTokens = true;
          }

          let finalRaw = saved;
          if (hasMissingTokens && typeof window !== 'undefined') {
            try {
              finalRaw = JSON.stringify(cleaned);
              localStorage.setItem(storageKey, finalRaw);
            } catch {}
          }
          this._ordersCache.set(restaurantId, {
            raw: finalRaw,
            dayStr: nowStr,
            orders: cleaned,
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
      const starterRaw = JSON.stringify(starter);
      localStorage.setItem(storageKey, starterRaw);
      this._ordersCache.set(restaurantId, {
        raw: starterRaw,
        dayStr: nowStr,
        orders: starter,
      });
    } catch {}
    return starter;
  },

  /**
   * Get all orders across all restaurants (for customer accounts and global order histories)
   */
  getAllOrdersAcrossRestaurants() {
    if (typeof window === 'undefined') return [];
    const all = [];
    const seenIds = new Set();

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(ORDERS_STORAGE_PREFIX)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              list.forEach((ord) => {
                if (ord && ord.id && !seenIds.has(ord.id)) {
                  seenIds.add(ord.id);
                  all.push(ord);
                }
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('Error reading all orders across restaurants:', e);
    }

    // Sort newest first
    all.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return all;
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

    // 2. Query Supabase if configured and orders table is available
    if (isSupabaseConfigured() && _ordersTableAvailable && isUuid(orderId)) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .maybeSingle();

        if (error && isOrdersTableMissingError(error)) {
          _ordersTableAvailable = false;
        }
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
    const updated =
      newStatus === 'cancelled'
        ? orders.filter((o) => o.id !== orderId && o.status !== 'cancelled')
        : orders.map((o) => {
            if (o.id === orderId) {
              const autoSettle = newStatus === 'completed' || newStatus === 'delivered';
              updatedOrder = {
                ...o,
                status: newStatus,
                ...(autoSettle
                  ? {
                      payment_status: 'paid',
                      explicit_paid: true,
                      amount_received: o.total_payable,
                      completed_at: additionalUpdates.completed_at || o.completed_at || new Date().toISOString(),
                    }
                  : {}),
                ...additionalUpdates,
              };
              return updatedOrder;
            }
            return o;
          });

    this._ordersCache.delete(restaurantId);

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

    if (isSupabaseConfigured() && _ordersTableAvailable && isUuid(orderId)) {
      supabase
        .from('orders')
        .update({ status: newStatus, ...additionalUpdates })
        .eq('id', orderId)
        .then(({ error }) => {
          if (error && isOrdersTableMissingError(error)) _ordersTableAvailable = false;
        })
        .catch(() => {});
    }

    return updated;
  },

  /**
   * Explicitly mark an order as paid or unpaid
   */
  updateOrderPaymentStatus(restaurantId, orderId, isPaid = true) {
    const storageKey = `${ORDERS_STORAGE_PREFIX}${restaurantId}`;
    const orders = this.getOrders(restaurantId);
    let updatedOrder = null;
    const updated = orders.map((o) => {
      if (o.id === orderId) {
        const payable = Number(o.total_payable) || 0;
        const payablePaisa = o.total_payable_paisa || toPaisa(payable);
        updatedOrder = {
          ...o,
          payment_status: isPaid ? 'paid' : 'unpaid',
          explicit_paid: Boolean(isPaid),
          amount_received: isPaid ? payable : 0,
          payments: isPaid
            ? [
                {
                  id: `PAY-${o.id}-${Date.now()}`,
                  order_id: o.id,
                  amount_paisa: payablePaisa,
                  amount: payable,
                  method: o.payment_method || 'cash',
                  date: new Date().toISOString(),
                  is_void: false,
                },
              ]
            : [],
        };
        return updatedOrder;
      }
      return o;
    });

    this._ordersCache.delete(restaurantId);

    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('dinehq_order_status_updated', {
            detail: { restaurantId, orderId, status: updatedOrder?.status, order: updatedOrder },
          })
        );
      }
    } catch (e) {
      console.warn('Failed to update order payment status:', e);
    }

    return updated;
  },

  /**
   * Submit or update a customer rating and review for an order
   * @param {string} orderId
   * @param {Object} ratingData - { rating: number (1-5), comment?: string, tags?: string[] }
   * @param {string} [restaurantId]
   */
  async submitOrderRating(orderId, ratingData = { rating: 5, comment: '', tags: [] }, restaurantId = null) {
    if (!orderId) return null;
    const cleanRating = {
      order_id: orderId,
      restaurant_id: restaurantId || null,
      rating: Math.max(1, Math.min(5, Number(ratingData?.rating) || 5)),
      comment: (ratingData?.comment || '').trim(),
      tags: Array.isArray(ratingData?.tags) ? ratingData.tags : [],
      rated_at: new Date().toISOString(),
    };

    // 1. Update in localStorage across all restaurant order lists and dedicated rating key
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(ORDERS_STORAGE_PREFIX)) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const list = JSON.parse(raw);
              if (Array.isArray(list)) {
                const idx = list.findIndex((o) => o.id === orderId);
                if (idx !== -1) {
                  if (!cleanRating.restaurant_id) {
                    cleanRating.restaurant_id = list[idx].restaurant_id || key.replace(ORDERS_STORAGE_PREFIX, '');
                  }
                  list[idx] = {
                    ...list[idx],
                    customer_rating: cleanRating,
                    rating: cleanRating.rating,
                    review: cleanRating.comment,
                  };
                  localStorage.setItem(key, JSON.stringify(list));
                }
              }
            }
          }
        }
        localStorage.setItem(`dinehq_rating_${orderId}`, JSON.stringify(cleanRating));
        window.dispatchEvent(
          new CustomEvent('dinehq_order_rated', {
            detail: {
              orderId,
              restaurantId: cleanRating.restaurant_id,
              rating: cleanRating,
              ratingData: cleanRating,
            },
          })
        );
      } catch (e) {
        console.warn('Error saving rating to localStorage:', e);
      }
    }

    // 2. Persist to Supabase if configured
    if (isSupabaseConfigured() && _ordersTableAvailable && isUuid(orderId)) {
      try {
        const { error } = await supabase
          .from('orders')
          .update({ customer_rating: cleanRating })
          .eq('id', orderId);
        if (error && isOrdersTableMissingError(error)) {
          _ordersTableAvailable = false;
        }
      } catch (e) {
        console.warn('Supabase rating update error:', e);
      }
    }

    return cleanRating;
  },

  /**
   * Get rating for a specific order
   */
  getOrderRating(orderId) {
    if (!orderId || typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(`dinehq_rating_${orderId}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  },

  /**
   * Look up order by secret rider token across all stores
   * Handles 24h expiration calculation after completion
   */
  async getOrderByRiderToken(token) {
    if (!token) return null;

    let targetOrder = null;
    let targetRestId = null;

    // 1. Search localStorage
    if (typeof window !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(ORDERS_STORAGE_PREFIX)) {
            const restId = key.replace(ORDERS_STORAGE_PREFIX, '');
            const raw = localStorage.getItem(key);
            if (raw) {
              const list = JSON.parse(raw);
              if (Array.isArray(list)) {
                const found = list.find((o) => o.rider_token === token || o.id === token);
                if (found) {
                  targetOrder = found;
                  targetRestId = restId;
                  break;
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn('Error finding order by rider token:', e);
      }
    }

    // 2. If not found in localStorage, check starter orders for demo fallbacks
    if (!targetOrder) {
      const demoList = getStarterOrders('rest-101');
      const foundDemo = demoList.find((o) => o.rider_token === token || o.id === token);
      if (foundDemo) {
        targetOrder = foundDemo;
        targetRestId = 'rest-101';
      }
    }

    if (!targetOrder) return null;

    // Check if token has expired: 24 hours after order completion/delivery
    const completedTimestamp = targetOrder.completed_at || targetOrder.delivered_at;
    const isCompleted = targetOrder.status === 'completed' || targetOrder.status === 'delivered';
    const isExpired = Boolean(
      isCompleted &&
      completedTimestamp &&
      (Date.now() - new Date(completedTimestamp).getTime() > 24 * 60 * 60 * 1000)
    );

    return {
      order: targetOrder,
      restaurantId: targetRestId,
      isExpired,
      completedTime: completedTimestamp,
    };
  },

  /**
   * Rider Page live status update (Picked Up, Delivered)
   */
  updateOrderByRiderToken(token, newStatus, additionalUpdates = {}) {
    if (!token) return null;

    if (typeof window !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(ORDERS_STORAGE_PREFIX)) {
            const restId = key.replace(ORDERS_STORAGE_PREFIX, '');
            const raw = localStorage.getItem(key);
            if (raw) {
              const list = JSON.parse(raw);
              if (Array.isArray(list)) {
                const found = list.find((o) => o.rider_token === token || o.id === token);
                if (found) {
                  const updates = { ...additionalUpdates };
                  const nowIso = new Date().toISOString();
                  if (newStatus === 'out_for_delivery' && !updates.picked_up_at) {
                    updates.picked_up_at = nowIso;
                  }
                  if (newStatus === 'completed' || newStatus === 'delivered') {
                    if (!updates.delivered_at) updates.delivered_at = nowIso;
                    if (!updates.completed_at) updates.completed_at = nowIso;
                  }

                  this.updateOrderStatus(restId, found.id, newStatus, updates);
                  return { ...found, status: newStatus, ...updates };
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn('Error updating order by rider token:', e);
      }
    }
    return null;
  },

  /**
   * Assign a rider to an order
   */
  assignRiderToOrder(restaurantId, orderId, rider) {
    const assignedPayload = rider
      ? {
          id: rider.id,
          name: rider.name,
          phone: rider.phone,
          assigned_at: new Date().toISOString(),
        }
      : null;

    const orders = this.getOrders(restaurantId);
    const existing = orders.find((o) => o.id === orderId);
    const currentStatus = existing?.status || 'new';

    return this.updateOrderStatus(restaurantId, orderId, currentStatus, {
      assigned_rider: assignedPayload,
    });
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
    const baseUpdatedOrder = {
      ...existing,
      items: combinedItems,
      subtotal: newSubtotal,
      total_payable: newTotal,
      updated_at: new Date().toISOString(),
    };
    const appendPaymentState = computeOrderPaymentState(baseUpdatedOrder);
    const updatedOrder = {
      ...baseUpdatedOrder,
      total_payable_paisa: appendPaymentState.totalPayablePaisa,
      payment_status: appendPaymentState.paymentStatus,
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

    if (isSupabaseConfigured() && _ordersTableAvailable && isUuid(orderId)) {
      supabase.from('orders').update({
        items: combinedItems,
        subtotal: newSubtotal,
        total_payable: newTotal,
        payment_status: appendPaymentState.paymentStatus,
      }).eq('id', orderId).then(({ error }) => {
        if (error && isOrdersTableMissingError(error)) _ordersTableAvailable = false;
      }).catch(() => {});
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

    const baseUpdatedOrder = {
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
    const updatePaymentState = computeOrderPaymentState(baseUpdatedOrder);
    const updatedOrder = {
      ...baseUpdatedOrder,
      total_payable_paisa: updatePaymentState.totalPayablePaisa,
      payment_status: updatePaymentState.paymentStatus,
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

    if (isSupabaseConfigured() && _ordersTableAvailable && isUuid(orderId)) {
      supabase.from('orders').update({
        items: updatedItems,
        subtotal: newSubtotal,
        total_payable: newTotal,
        payment_status: updatePaymentState.paymentStatus,
      }).eq('id', orderId).then(({ error }) => {
        if (error && isOrdersTableMissingError(error)) _ordersTableAvailable = false;
      }).catch(() => {});
    }

    return updatedOrder;
  },

  /**
   * Calculate real dynamic KPIs for a restaurant based on actual orders
   */
  getOrderStats(restaurantId) {
    const orders = this.getOrders(restaurantId);
    const validOrders = orders.filter((o) => o.status !== 'cancelled' && o.status !== 'new');
    const totalOrders = validOrders.length;
    const grossVolume = validOrders.reduce((sum, o) => sum + (Number(o.total_payable) || 0), 0);
    // 30% saved from standard food aggregators
    const savedCommission = grossVolume * 0.30;
    const activeCount = orders.filter(
      (o) =>
        o.status === 'preparing' ||
        o.status === 'out_for_delivery' ||
        o.status === 'ready' ||
        o.status === 'held'
    ).length;

    return {
      totalOrders,
      grossVolume,
      savedCommission,
      activeCount,
    };
  },
};
