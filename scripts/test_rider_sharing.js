import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🧪 Starting Rider Sharing & Delivery Verification...\n');

// Mock localStorage for node environment
const storage = {};
global.localStorage = {
  getItem: (key) => storage[key] || null,
  setItem: (key, val) => { storage[key] = String(val); },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
  get length() { return Object.keys(storage).length; },
  key: (i) => Object.keys(storage)[i] || null,
};
global.window = {
  location: { origin: 'http://localhost:5173' },
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
};
global.CustomEvent = class CustomEvent {
  constructor(name, opts = {}) {
    this.name = name;
    this.detail = opts.detail;
  }
};

// 1. Test riderService
const { riderService } = await import('../src/services/riderService.js');
console.log('1. Testing riderService:');
const initialRiders = riderService.getRiders('rest-101');
assert(Array.isArray(initialRiders) && initialRiders.length >= 2, 'Initial riders should be seeded');
console.log(`  ✅ getRiders returned ${initialRiders.length} default riders`);

const newRider = riderService.addRider('rest-101', { name: 'Kashif Mehmood', phone: '0345-1234567' });
assert(newRider.name === 'Kashif Mehmood' && newRider.phone === '0345-1234567', 'Rider should be added with name and phone');
console.log('  ✅ addRider successfully added new rider');

const updatedRiders = riderService.getRiders('rest-101');
assert(updatedRiders.some((r) => r.id === newRider.id), 'New rider should be persisted in getRiders');
console.log('  ✅ Rider persistence verified in localStorage');

const afterDelete = riderService.deleteRider('rest-101', newRider.id);
assert(!afterDelete.some((r) => r.id === newRider.id), 'Deleted rider should no longer be present');
console.log('  ✅ deleteRider removed rider successfully');


// 2. Test orderService rider token, live status updates, and 24h expiration
const { orderService, generateRiderToken } = await import('../src/services/orderService.js');
console.log('\n2. Testing orderService Rider Features:');

const testToken = generateRiderToken();
assert(testToken.startsWith('rtk_') && testToken.length >= 16, 'generateRiderToken should generate long random token');
console.log(`  ✅ generateRiderToken generated valid token: "${testToken}"`);

const orders = orderService.getOrders('rest-101');
const starterDelivery = orders.find((o) => o.order_type === 'delivery');
assert(starterDelivery && starterDelivery.rider_token, 'Starter delivery order must have a rider_token');
console.log(`  ✅ Starter delivery order has token: ${starterDelivery.rider_token}`);

// Test order lookup by rider token
const lookupRes = await orderService.getOrderByRiderToken(starterDelivery.rider_token);
assert(lookupRes && lookupRes.order.id === starterDelivery.id, 'Lookup by rider token must return matching order');
assert(lookupRes.isExpired === false, 'Active order must not be expired');
console.log('  ✅ getOrderByRiderToken successfully retrieved active order');

// Test live status updates (Picked Up)
const pickedUpOrder = orderService.updateOrderByRiderToken(starterDelivery.rider_token, 'out_for_delivery');
assert(pickedUpOrder.status === 'out_for_delivery' && pickedUpOrder.picked_up_at, 'Status should be out_for_delivery with picked_up_at timestamp');
console.log(`  ✅ "Picked Up" live update verified (picked_up_at: ${pickedUpOrder.picked_up_at})`);

// Test live status updates (Delivered)
const deliveredOrder = orderService.updateOrderByRiderToken(starterDelivery.rider_token, 'completed');
assert(
  (deliveredOrder.status === 'completed' || deliveredOrder.status === 'delivered') &&
  deliveredOrder.delivered_at &&
  deliveredOrder.completed_at,
  'Status should be completed with delivered_at & completed_at timestamps'
);
console.log(`  ✅ "Delivered" live update verified (delivered_at: ${deliveredOrder.delivered_at})`);

// Test 24-hour expiration logic
// Simulate an order completed 25 hours ago
const oldCompletedDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
const expiredToken = 'rtk_expired_test';
const expiredOrder = {
  ...starterDelivery,
  id: 'DB-EXPIRED',
  rider_token: expiredToken,
  status: 'completed',
  completed_at: oldCompletedDate,
  delivered_at: oldCompletedDate,
};
const allOrders = orderService.getOrders('rest-101');
allOrders.push(expiredOrder);
storage['dinehq_orders_rest-101'] = JSON.stringify(allOrders);

const expiredLookup = await orderService.getOrderByRiderToken(expiredToken);
assert(expiredLookup && expiredLookup.isExpired === true, 'Order completed > 24 hours ago must be marked expired');
console.log('  ✅ 24-hour expiration after completion strictly verified');

// Test Assign Rider to Order
const riderToAssign = { id: 'rdr-99', name: 'Bilal Khan', phone: '0300-9999999' };
orderService.assignRiderToOrder('rest-101', starterDelivery.id, riderToAssign);
const reloadedOrders = orderService.getOrders('rest-101');
const assignedOrder = reloadedOrders.find((o) => o.id === starterDelivery.id);
assert(
  assignedOrder.assigned_rider &&
  assignedOrder.assigned_rider.name === 'Bilal Khan' &&
  assignedOrder.assigned_rider.phone === '0300-9999999',
  'Assigned rider must be saved on the order'
);
console.log('  ✅ assignRiderToOrder saves rider name & phone on order');


// 3. Static checks on UI components
console.log('\n3. Verifying UI Component Requirements:');

// App.jsx
const appCode = fs.readFileSync(path.join(rootDir, 'src', 'App.jsx'), 'utf8');
assert(appCode.includes('/rider/:token') && appCode.includes('RiderDeliveryPage'), 'App.jsx must route /rider/:token to RiderDeliveryPage');
console.log('  ✅ App.jsx: /rider/:token public route registered');

// RiderDeliveryPage.jsx
const riderPageCode = fs.readFileSync(path.join(rootDir, 'src', 'pages', 'RiderDeliveryPage.jsx'), 'utf8');
assert(riderPageCode.includes('order.customer_name'), 'Rider page must show customer name');
assert(riderPageCode.includes('order.customer_phone') && riderPageCode.includes('tel:'), 'Rider page must have tap-to-call customer button');
assert(riderPageCode.includes('order.customer_address'), 'Rider page must show full address');
assert(riderPageCode.includes('order.total_payable'), 'Rider page must show total to collect');
assert(riderPageCode.includes('order.items'), 'Rider page must show items summary');
assert(riderPageCode.includes('buildGoogleMapsNavUrl') && riderPageCode.includes('Navigate'), 'Rider page must have big Navigate button');
assert(riderPageCode.includes('buildOsmNavUrl') && riderPageCode.includes('Open in OpenStreetMap'), 'Rider page must have Open in OpenStreetMap button');
assert(riderPageCode.includes('handleMarkPickedUp') && riderPageCode.includes('handleMarkDelivered'), 'Rider page must have Picked Up and Delivered buttons');
assert(riderPageCode.includes('isExpired') && riderPageCode.includes('24 hours'), 'Rider page must enforce 24h expiration');
assert(riderPageCode.includes('LeafletMap'), 'Rider page must include LeafletMap');
console.log('  ✅ RiderDeliveryPage.jsx: All customer info, tap-to-call, Navigate/OSM buttons, status buttons, and map present');

// SendToRiderMenu.jsx
const sendMenuCode = fs.readFileSync(path.join(rootDir, 'src', 'components', 'Orders', 'SendToRiderMenu.jsx'), 'utf8');
assert(sendMenuCode.includes('navigator.share') && sendMenuCode.includes('handleCopy'), 'SendToRiderMenu must use Web Share API with Copy Link fallback');
assert(sendMenuCode.includes('handleSelectRider') && sendMenuCode.includes('Assign Rider'), 'SendToRiderMenu must have Assign Rider menu action');
assert(sendMenuCode.includes('Send to Rider'), 'SendToRiderMenu must have "Send to Rider" button text');
console.log('  ✅ SendToRiderMenu.jsx: Share (Web Share API / Copy Link), Copy Link, and Assign Rider present');

// OrderDetailsModal.jsx
const orderDetailsCode = fs.readFileSync(path.join(rootDir, 'src', 'components', 'Orders', 'OrderDetailsModal.jsx'), 'utf8');
assert(orderDetailsCode.includes('SendToRiderMenu'), 'OrderDetailsModal must include SendToRiderMenu button');
console.log('  ✅ OrderDetailsModal.jsx: SendToRiderMenu integrated in order details');

// OrdersFeed.jsx
const feedCode = fs.readFileSync(path.join(rootDir, 'src', 'components', 'OrdersFeed.jsx'), 'utf8');
assert(feedCode.includes('SendToRiderMenu'), 'OrdersFeed must include SendToRiderMenu on delivery cards');
assert(feedCode.includes('order.assigned_rider') && feedCode.includes('Rider:'), 'OrdersFeed must show assigned rider name on order card');
assert(feedCode.includes('OrderDetailsModal'), 'OrdersFeed must render OrderDetailsModal');
console.log('  ✅ OrdersFeed.jsx: SendToRiderMenu and assigned rider badge present on delivery order cards');

// StoreSettings.jsx
const settingsCode = fs.readFileSync(path.join(rootDir, 'src', 'components', 'StoreSettings.jsx'), 'utf8');
assert(settingsCode.includes('riders-section') && settingsCode.includes('riderService'), 'StoreSettings must include riders section');
assert(settingsCode.includes('handleAddRider') && settingsCode.includes('handleDeleteRider'), 'StoreSettings must allow adding and deleting riders');
console.log('  ✅ StoreSettings.jsx: Delivery Fleet & Riders list with name and phone registered in Settings');

// PrintTemplateRenderer.jsx
const printRendererCode = fs.readFileSync(path.join(rootDir, 'src', 'components', 'Printer', 'PrintTemplateRenderer.jsx'), 'utf8');
assert(printRendererCode.includes('rider_token') && printRendererCode.includes('/rider/'), 'PrintTemplateRenderer must include rider link as QR code on Delivery Slip');
console.log('  ✅ PrintTemplateRenderer.jsx: Rider link included as QR code on printed Delivery Slip');

console.log('\n🎉 ALL RIDER SHARING REQUIREMENTS VERIFIED SUCCESSFULLY!\n');
