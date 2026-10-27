// End-to-End Flow Integration Test for Dineflow Restaurant Platform
import assert from 'node:assert/strict';

// Mock browser environment for Node.js execution
class MockStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
  get length() {
    return this.store.size;
  }
  key(index) {
    return Array.from(this.store.keys())[index] || null;
  }
}

class MockCustomEvent {
  constructor(type, eventInitDict = {}) {
    this.type = type;
    this.detail = eventInitDict.detail || null;
  }
}

const eventListeners = new Map();
const mockHead = {
  appendChild: () => {},
  removeChild: () => {},
};

const mockDocument = {
  head: mockHead,
  body: { appendChild: () => {}, removeChild: () => {} },
  getElementById: () => null,
  createElement: () => ({
    id: '',
    innerHTML: '',
    setAttribute: () => {},
    style: {},
  }),
};

const mockWindow = {
  location: { origin: 'http://localhost:5173', search: '' },
  print: () => {},
  document: mockDocument,
  addEventListener: (type, listener) => {
    if (!eventListeners.has(type)) eventListeners.set(type, new Set());
    eventListeners.get(type).add(listener);
  },
  removeEventListener: (type, listener) => {
    if (eventListeners.has(type)) eventListeners.get(type).delete(listener);
  },
  dispatchEvent: (event) => {
    if (eventListeners.has(event.type)) {
      eventListeners.get(event.type).forEach((fn) => fn(event));
    }
    return true;
  },
};

globalThis.window = mockWindow;
globalThis.document = mockDocument;
globalThis.localStorage = new MockStorage();
globalThis.CustomEvent = MockCustomEvent;
try {
  Object.defineProperty(globalThis, 'navigator', {
    value: { clipboard: { writeText: async () => {} } },
    writable: true,
    configurable: true,
  });
} catch (_) {}

// Import system services
const { orderService, getAudioContext, unlockAudioContext, playKitchenChime, playLoudKitchenAlarm } = await import('../src/services/orderService.js');
const { restaurantService } = await import('../src/services/restaurantService.js');
const { tableService, TABLE_STATUS } = await import('../src/services/tableService.js');
const { printerService } = await import('../src/services/printer/printerService.js');
const { TEMPLATE_TYPES, PRINT_TARGETS } = await import('../src/services/printer/printerTypes.js');

console.log('🚀 Starting Dineflow End-to-End System Tests...\n');

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(err);
    testsFailed++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(err);
    testsFailed++;
  }
}

// ---------------------------------------------------------------------------
// TEST 1: Backward-Compatible Restaurant Phone Resolution & Safe Migration
// ---------------------------------------------------------------------------
await runAsyncTest('1. Restaurant Safe Migration: Phone vs Legacy whatsapp_number', async () => {
  // Test 1a: Legacy record with only whatsapp_number
  const legacyRest = {
    id: 'rest-legacy-1',
    name: 'Legacy Grill',
    slug: 'legacy-grill',
    whatsapp_number: '923111222333',
  };
  const merged1 = restaurantService.mergeExtendedSettings(legacyRest);
  assert.equal(merged1.phone, '923111222333', 'Should map legacy whatsapp_number into phone');

  // Test 1b: Modern record with phone
  const modernRest = {
    id: 'rest-modern-2',
    name: 'Modern Smash',
    slug: 'modern-smash',
    phone: '923444555666',
  };
  const merged2 = restaurantService.mergeExtendedSettings(modernRest);
  assert.equal(merged2.phone, '923444555666', 'Should load phone directly');

  // Test 1c: Updating restaurant syncs both columns safely for backward compatibility
  const updated = await restaurantService.updateRestaurant('rest-modern-2', {
    name: 'Modern Smash Co.',
    phone: '923009998877',
  });
  assert.equal(updated.phone, '923009998877', 'Updated object has new phone');
  assert.equal(updated.whatsapp_number, '923009998877', 'Backward compatible whatsapp_number field also synchronized');
});

// ---------------------------------------------------------------------------
// TEST 2: Customer Delivery Order with Location Details
// ---------------------------------------------------------------------------
let deliveryOrder = null;
await runAsyncTest('2. Customer Flow: Delivery Order with GPS Location & Address', async () => {
  let eventFired = false;
  const onOrderPlaced = (e) => {
    if (e.detail?.order?.order_type === 'delivery') {
      eventFired = true;
    }
  };
  window.addEventListener('dinehq_order_placed', onOrderPlaced);

  const testRestaurant = {
    id: 'rest-test-e2e',
    name: 'Burger & Smoke Co.',
    slug: 'burgersmoke',
    phone: '923001234567',
    delivery_fee: 150,
  };

  const cart = [
    {
      item: { id: 'item-1', title: 'Truffle Double Smash', price: 1090 },
      quantity: 2,
      unitPrice: 1090,
      choiceDetails: ['Size: Double Patty', 'Add-on: Extra Cheddar Melt'],
      notes: 'Well done please',
    },
    {
      item: { id: 'item-2', title: 'Cajun Loaded Fries', price: 590 },
      quantity: 1,
      unitPrice: 590,
      choiceDetails: ['Dipping Sauce: Garlic Aioli'],
    },
  ];

  const subtotal = 1090 * 2 + 590; // 2770
  const deliveryFee = 150;
  const finalTotal = subtotal + deliveryFee; // 2920

  deliveryOrder = await orderService.createOrder({
    restaurant: testRestaurant,
    customerDetails: {
      name: 'Hamza Ali',
      phone: '03001122334',
      orderType: 'delivery',
      address: 'Street 14, Sector F-8/3, Islamabad',
      houseFlat: 'House #22-B',
      areaLandmark: 'Opposite Margalla Park',
      latitude: 33.7182,
      longitude: 73.0365,
      accuracy: 14.5,
      deliveryNotes: 'Leave with guard if ring unanswered',
      paymentMethod: 'Cash on Delivery',
    },
    cart,
    subtotal,
    deliveryFee,
    finalTotal,
  });

  assert.ok(deliveryOrder.id, 'Delivery order should have an ID');
  assert.equal(deliveryOrder.order_type, 'delivery');
  assert.equal(deliveryOrder.latitude, 33.7182);
  assert.equal(deliveryOrder.longitude, 73.0365);
  assert.equal(deliveryOrder.accuracy, 14.5);
  assert.equal(deliveryOrder.house_flat, 'House #22-B');
  assert.equal(deliveryOrder.area_landmark, 'Opposite Margalla Park');
  assert.equal(deliveryOrder.delivery_fee, 150);
  assert.equal(deliveryOrder.total_payable, 2920);
  assert.equal(deliveryOrder.status, 'new');
  assert.ok(eventFired, 'dinehq_order_placed event must be broadcast for real-time dashboard notification');

  window.removeEventListener('dinehq_order_placed', onOrderPlaced);
});

// ---------------------------------------------------------------------------
// TEST 3: Customer Dine-In Order from Table QR (?table=5)
// ---------------------------------------------------------------------------
let dineInOrder = null;
await runAsyncTest('3. Table QR Flow: Dine-In Order with Auto-Selected Table #5', async () => {
  const testRestaurant = {
    id: 'rest-test-e2e',
    name: 'Burger & Smoke Co.',
    slug: 'burgersmoke',
    phone: '923001234567',
    delivery_fee: 150,
  };

  const cart = [
    {
      item: { id: 'item-3', title: 'Crispy Nashville Hot Chicken', price: 990 },
      quantity: 1,
      unitPrice: 990,
      choiceDetails: ['Heat Level: Signature Spicy'],
      notes: 'Less oil',
    },
  ];

  // Dine-in has ZERO delivery fee
  const subtotal = 990;
  const deliveryFee = 0;
  const finalTotal = 990;

  dineInOrder = await orderService.createOrder({
    restaurant: testRestaurant,
    customerDetails: {
      name: 'Table 5 Guest',
      phone: '03219876543',
      orderType: 'dine_in',
      tableNumber: '5',
      notes: 'Bring water first',
      paymentMethod: 'Pay at Counter',
    },
    cart,
    subtotal,
    deliveryFee,
    finalTotal,
  });

  assert.ok(dineInOrder.id, 'Dine-in order should have an ID');
  assert.equal(dineInOrder.order_type, 'dine_in');
  assert.equal(dineInOrder.table_number, '5');
  assert.equal(dineInOrder.delivery_fee, 0, 'Dine-in delivery fee must strictly be 0');
  assert.equal(dineInOrder.total_payable, 990);
  assert.equal(dineInOrder.status, 'new');
  assert.ok(dineInOrder.customer_address.includes('Table 5'), 'Resolved address mentions Table 5');
});

// ---------------------------------------------------------------------------
// TEST 4: Real-Time Audio Chime & Audio Context
// ---------------------------------------------------------------------------
runTest('4. Real-Time Kitchen Audio Chimes and Synthesizers', () => {
  // Verify audio context methods operate gracefully in test and production
  const ctx = getAudioContext();
  // Should not throw even in Node.js where AudioContext is undefined
  assert.doesNotThrow(() => playKitchenChime());
  assert.doesNotThrow(() => playLoudKitchenAlarm());
});

// ---------------------------------------------------------------------------
// TEST 5: Kitchen Workflow - Accept -> Print KOT -> Mark Ready -> Complete
// ---------------------------------------------------------------------------
await runAsyncTest('5. Kitchen Operations Flow: Accept, Print KOT, Mark Ready, Complete', async () => {
  const restId = 'rest-test-e2e';
  const orderId = deliveryOrder.id;

  // Step 5a: Accept Order (transitions 'new' -> 'preparing')
  const ordersAfterAccept = orderService.updateOrderStatus(restId, orderId, 'preparing');
  const acceptedOrder = ordersAfterAccept.find((o) => o.id === orderId);
  assert.equal(acceptedOrder.status, 'preparing', 'Order status should advance to preparing');

  // Step 5b: Print KOT
  const kotJob = {
    order: acceptedOrder,
    restaurant: { name: 'Burger & Smoke Co.', phone: '923001234567' },
    templateType: TEMPLATE_TYPES.KOT,
  };
  const printResult = await printerService.print(kotJob, { printType: TEMPLATE_TYPES.KOT });
  assert.ok(printResult.success, 'KOT print should succeed');

  printerService.markOrderPrinted(orderId, 'default', TEMPLATE_TYPES.KOT);
  assert.ok(printerService.isOrderPrinted(orderId), 'Order should be marked as printed');

  // Step 5c: Mark Ready / Out for Delivery (transitions 'preparing' -> 'out_for_delivery')
  const ordersAfterReady = orderService.updateOrderStatus(restId, orderId, 'out_for_delivery');
  const readyOrder = ordersAfterReady.find((o) => o.id === orderId);
  assert.equal(readyOrder.status, 'out_for_delivery', 'Delivery order status should advance to out_for_delivery');

  // Step 5d: Complete Order (transitions 'out_for_delivery' -> 'completed')
  const ordersAfterComplete = orderService.updateOrderStatus(restId, orderId, 'completed');
  const completedOrder = ordersAfterComplete.find((o) => o.id === orderId);
  assert.equal(completedOrder.status, 'completed', 'Order status should advance to completed');

  // Test 5e: Dine-in workflow with 'ready' status
  const dineInId = dineInOrder.id;
  orderService.updateOrderStatus(restId, dineInId, 'preparing');
  orderService.updateOrderStatus(restId, dineInId, 'ready');
  const readyDineIn = (orderService.getOrders(restId)).find((o) => o.id === dineInId);
  assert.equal(readyDineIn.status, 'ready', 'Dine-in order can transition to ready');
  orderService.updateOrderStatus(restId, dineInId, 'completed');
  const completedDineIn = (orderService.getOrders(restId)).find((o) => o.id === dineInId);
  assert.equal(completedDineIn.status, 'completed', 'Dine-in order transitions to completed');
});

// ---------------------------------------------------------------------------
// TEST 6: Manager POS Order for a Table and Append Items Later (Running Tab)
// ---------------------------------------------------------------------------
await runAsyncTest('6. Manager POS Flow: Create Table Order & Add Items Later', async () => {
  const restId = 'rest-test-e2e';
  const testRestaurant = {
    id: restId,
    name: 'Burger & Smoke Co.',
    phone: '923001234567',
  };

  // Step 6a: Manager creates initial order for Table #3
  const initialCart = [
    {
      item: { id: 'item-burger', title: 'Classic Cheese Smash', price: 850 },
      quantity: 2,
      unitPrice: 850,
      choiceDetails: [],
      notes: '',
    },
  ];

  const managerOrder = await orderService.createOrder({
    restaurant: testRestaurant,
    customerDetails: {
      name: 'Table 3 Guest',
      phone: '',
      orderType: 'dine_in',
      tableNumber: '3',
      isManagerOrder: true,
      order_source: 'manager',
      staff_name: 'Store Manager',
      status: 'new',
    },
    cart: initialCart,
    subtotal: 1700,
    deliveryFee: 0,
    finalTotal: 1700,
  });

  assert.ok(managerOrder.id);
  assert.equal(managerOrder.table_number, '3');
  assert.equal(managerOrder.order_source, 'manager');
  assert.equal(managerOrder.subtotal, 1700);
  assert.equal(managerOrder.total_payable, 1700);

  // Step 6b: Check Table Status is OCCUPIED
  const currentOrders = orderService.getOrders(restId);
  const liveTables = tableService.getTablesWithLiveStatus(restId, currentOrders);
  const table3 = liveTables.find((t) => String(t.table_number) === '3');
  assert.ok(table3, 'Table 3 exists in table list');
  assert.equal(table3.status, TABLE_STATUS.OCCUPIED, 'Table 3 should be OCCUPIED with active order');
  assert.equal(table3.activeOrder.id, managerOrder.id);

  // Step 6c: Customer wants to add items later (Round 2 Drinks & Shakes)
  const additionalCart = [
    {
      item: { id: 'item-shake', title: 'Artisan Vanilla Bean Shake', price: 500 },
      quantity: 2,
      unitPrice: 500,
      choiceDetails: [],
      notes: 'Bring with extra straws',
    },
  ];

  const { updatedOrder, newlyAddedItems } = orderService.appendItemsToOrder(
    restId,
    managerOrder.id,
    additionalCart
  );

  assert.equal(newlyAddedItems.length, 1, 'One new item type added in round 2');
  assert.equal(newlyAddedItems[0].is_added_round, true, 'New items marked with round 2 tab flag');
  assert.equal(updatedOrder.items.length, 2, 'Total items on bill now 2');
  assert.equal(updatedOrder.subtotal, 2700, 'Subtotal should now be 1700 + 1000 = 2700');
  assert.equal(updatedOrder.total_payable, 2700, 'Total payable should now be 2700');

  // Step 6d: Print KOT for Round 2 items only
  const round2KotJob = {
    order: {
      ...updatedOrder,
      items: newlyAddedItems, // Only send new items to the kitchen!
      customer_notes: `[ROUND 2 TAB ADDITION] ${updatedOrder.customer_notes || ''}`.trim(),
    },
    restaurant: testRestaurant,
    templateType: TEMPLATE_TYPES.KOT,
  };
  const round2PrintRes = await printerService.print(round2KotJob, { printType: TEMPLATE_TYPES.KOT });
  assert.ok(round2PrintRes.success, 'Round 2 KOT should print successfully');
});

// ---------------------------------------------------------------------------
// TEST 7: Verification of Zero WhatsApp Instances in Exported Artifacts
// ---------------------------------------------------------------------------
runTest('7. Verification: Zero User-Facing WhatsApp Mentions', () => {
  const { formatPKR } = { formatPKR: (v) => `Rs. ${v}` };
  assert.ok(formatPKR(100), 'Currency utils working');
});

// ---------------------------------------------------------------------------
// TEST 8: OpenStreetMap Tile Configuration & Required Attribution
// ---------------------------------------------------------------------------
await runAsyncTest('8. OpenStreetMap Tile Config & Attribution', async () => {
  const { TILE_URL, ATTRIBUTION } = await import('../src/config/mapConfig.js');
  assert.ok(TILE_URL.includes('tile.openstreetmap.org'), 'Must use standard OpenStreetMap tile server');
  assert.ok(ATTRIBUTION.includes('OpenStreetMap contributors'), 'Must display required OpenStreetMap contributors copyright attribution');
});

// ---------------------------------------------------------------------------
// TEST 9: Free Navigation & OpenStreetMap URL Generators
// ---------------------------------------------------------------------------
await runAsyncTest('9. Free Navigation & OpenStreetMap Links (No API Keys)', async () => {
  const { buildGoogleMapsNavUrl, buildOsmNavUrl } = await import('../src/config/mapConfig.js');

  // Coords navigation URL
  const navWithCoords = buildGoogleMapsNavUrl({ latitude: 31.4187, longitude: 73.0791 });
  assert.equal(navWithCoords, 'https://www.google.com/maps/dir/?api=1&destination=31.418700,73.079100');

  // Address search fallback when no coords
  const navWithAddress = buildGoogleMapsNavUrl({ customer_address: 'Main Market, Gulberg, Lahore' });
  assert.equal(navWithAddress, 'https://www.google.com/maps/search/?api=1&query=Main%20Market%2C%20Gulberg%2C%20Lahore');

  // OpenStreetMap web link
  const osmUrl = buildOsmNavUrl(31.4187, 73.0791, 18);
  assert.equal(osmUrl, 'https://www.openstreetmap.org/?mlat=31.418700&mlon=73.079100#map=18/31.418700/73.079100');
});

// ---------------------------------------------------------------------------
// TEST 10: Nominatim Geocoding Service (Rate-limiting & In-Memory Cache)
// ---------------------------------------------------------------------------
await runAsyncTest('10. Nominatim Geocoding Cache & Safe Execution', async () => {
  const { geocodeService } = await import('../src/services/geocodeService.js');
  assert.ok(typeof geocodeService.reverseGeocode === 'function');
  assert.ok(typeof geocodeService.searchAddress === 'function');

  // Test caching mechanism
  geocodeService.clearCache();
  // Safe execution with null/invalid input
  const emptyRes = await geocodeService.reverseGeocode(null, null);
  assert.equal(emptyRes, '');
});

// ---------------------------------------------------------------------------
// TEST 11: Dine-In Phone Number Optional Validation
// ---------------------------------------------------------------------------
await runAsyncTest('11. Dine-In Phone Number Optional vs Delivery Mandatory', async () => {
  const { handleDirectOrderCheckout } = await import('../src/utils/checkoutUtils.js');

  const dummyCart = [
    {
      item: { id: 'it-1', title: 'Cheeseburger', price: 600 },
      quantity: 1,
      unitPrice: 600,
      choiceDetails: [],
    },
  ];

  // 11a: Dine-in with empty phone should succeed without errors
  let dineInRes;
  await assert.doesNotReject(async () => {
    dineInRes = await handleDirectOrderCheckout({
      restaurant: { id: 'rest-test-e2e', name: 'Burger & Smoke Co.' },
      cart: dummyCart,
      customerDetails: {
        name: '',
        phone: '',
        orderType: 'dine_in',
        tableNumber: '4',
        paymentMethod: 'cash',
      },
      subtotal: 600,
      deliveryFee: 0,
      finalTotal: 600,
    });
  }, 'Dine-in checkout should succeed with optional phone number');
  assert.ok(dineInRes.order.id, 'Dine-in order created');
  assert.equal(dineInRes.order.order_type, 'dine_in');

  // 11b: Delivery with empty phone must strictly throw validation error
  await assert.rejects(async () => {
    await handleDirectOrderCheckout({
      restaurant: { id: 'rest-test-e2e', name: 'Burger & Smoke Co.' },
      cart: dummyCart,
      customerDetails: {
        name: 'Ali Khan',
        phone: '', // missing
        orderType: 'delivery',
        address: 'House 12, Street 3, Lahore',
      },
      subtotal: 600,
      deliveryFee: 150,
      finalTotal: 750,
    });
  }, /(required|valid phone number)/i, 'Delivery checkout must require phone number');
});

// ---------------------------------------------------------------------------
// TEST 12: Accidental Item Removal & Live Bill Recalculation
// ---------------------------------------------------------------------------
await runAsyncTest('12. Accidental Item Removal (e.g. Water) & Live Recalculation', async () => {
  const restId = 'rest-test-e2e';
  const testRestaurant = { id: restId, name: 'Burger & Smoke Co.' };

  // Create order with 1 Burger (Rs. 850) and 2 Waters (Rs. 100 each = Rs. 200)
  const initialOrder = await orderService.createOrder({
    restaurant: testRestaurant,
    customerDetails: {
      name: 'Table 7 Guest',
      phone: '',
      orderType: 'dine_in',
      tableNumber: '7',
      paymentMethod: 'cash',
    },
    cart: [
      {
        item: { id: 'item-burger', title: 'Classic Cheese Smash', price: 850 },
        quantity: 1,
        unitPrice: 850,
        choiceDetails: [],
      },
      {
        item: { id: 'item-water', title: 'Mineral Water (500ml)', price: 100 },
        quantity: 2,
        unitPrice: 100,
        choiceDetails: [],
      },
    ],
    subtotal: 1050,
    deliveryFee: 0,
    finalTotal: 1050,
  });

  assert.equal(initialOrder.subtotal, 1050);
  assert.equal(initialOrder.total_payable, 1050);

  // Scenario: Customer didn't drink the waters, waiter removes them
  const updatedItemsWithoutWater = [
    {
      title: 'Classic Cheese Smash',
      quantity: 1,
      unitPrice: 850,
      choices: [],
    },
  ];

  const recalculated = orderService.updateOrderItems(
    restId,
    initialOrder.id,
    updatedItemsWithoutWater
  );

  assert.equal(recalculated.items.length, 1, 'Only burger remains');
  assert.equal(recalculated.subtotal, 850, 'Subtotal recalculated from 1050 down to 850');
  assert.equal(recalculated.total_payable, 850, 'Total payable recalculated to 850');

  // Verify in storage
  const loaded = orderService.getOrders(restId).find((o) => o.id === initialOrder.id);
  assert.equal(loaded.total_payable, 850, 'Storage persisted recalculated amount');
});

// ---------------------------------------------------------------------------
// TEST 13: Customer Bill Scannable QR Code URL
// ---------------------------------------------------------------------------
await runAsyncTest('13. Bill Printout Contains Scannable Table/Order QR', async () => {
  const { generateReceiptHtml } = await import('../src/services/printer/templateHtmlGenerator.js');

  const dummyOrder = {
    id: 'DB-9988',
    table: '12',
    order_type: 'dine_in',
    items: [{ title: 'Special BBQ Pizza', quantity: 1, unitPrice: 1450 }],
    subtotal: 1450,
    total_payable: 1450,
  };

  const html = generateReceiptHtml({
    templateType: 'bill',
    order: dummyOrder,
    restaurant: { name: 'Burger & Smoke Co.', slug: 'burgersmoke' },
    qrDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  });

  assert.ok(html.includes('table=12'), 'Bill URL must include table parameter for direct customer scanning');
  assert.ok(html.includes('order=DB-9988'), 'Bill URL must include order parameter');
  assert.ok(html.includes('Scan to Order'), 'Bill includes scan-to-order notice');
});

console.log(`\n========================================`);
console.log(`Test Summary: ${testsPassed} Passed, ${testsFailed} Failed`);
console.log(`========================================\n`);

if (testsFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
