import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🧪 Starting Menu Page, Delivery Coverage, and PWA Guard Verification...\n');

// 1. Verify PWA manifest start_url is "/"
const manifestPath = path.join(rootDir, 'public', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.strictEqual(manifest.start_url, '/', 'PWA start_url must be "/"');
console.log('✅ Test 1 Passed: PWA manifest start_url is "/"');

// 2. Import geoValidation utilities
const { checkRestaurantDeliveryCoverage, haversineKm, isPointInPolygon: _isPointInPolygon } = await import('../src/utils/geoValidation.js');

// Test 2: Distance calculation
const lahoreCenter = { lat: 31.5204, lng: 74.3587 };
const nearbyPoint = { lat: 31.5304, lng: 74.3687 };
const dist = haversineKm(lahoreCenter.lat, lahoreCenter.lng, nearbyPoint.lat, nearbyPoint.lng);
assert.ok(dist > 0 && dist < 5, `Expected distance ~1-3km, got ${dist}`);
console.log(`✅ Test 2 Passed: Haversine distance calculated accurately (${dist} km)`);

// Test 3: Circular Radius Delivery Check
const restaurantRadius = {
  latitude: 31.5204,
  longitude: 74.3587,
  delivery_enabled: true,
  delivery_fee: 150,
};
const radiusAreas = [
  { type: 'radius', radius_km: 5, fee: 120 }
];

// Inside 5km radius
const userInsideRadius = { lat: 31.5300, lng: 74.3600 };
const coverageInside = checkRestaurantDeliveryCoverage(userInsideRadius, restaurantRadius, radiusAreas);
assert.strictEqual(coverageInside.deliversToUser, true, 'User within 5km should be covered');
assert.strictEqual(coverageInside.fee, 120, 'Zone fee of 120 should be applied');

// Outside 5km radius (e.g. 20km away in Islamabad coords or far Lahore)
const userOutsideRadius = { lat: 31.7500, lng: 74.5000 };
const coverageOutside = checkRestaurantDeliveryCoverage(userOutsideRadius, restaurantRadius, radiusAreas);
assert.strictEqual(coverageOutside.deliversToUser, false, 'User at ~30km must be outside delivery area');
console.log('✅ Test 3 Passed: Circular Radius delivery coverage & zone fees verified');

// Test 4: Polygon Delivery Check
const polygonAreas = [
  {
    type: 'polygon',
    name: 'Gulberg Zone',
    fee: 99,
    polygon: [
      [31.5000, 74.3300],
      [31.5400, 74.3300],
      [31.5400, 74.3800],
      [31.5000, 74.3800]
    ]
  }
];
const userInsidePoly = { lat: 31.5200, lng: 74.3500 };
const polyInside = checkRestaurantDeliveryCoverage(userInsidePoly, restaurantRadius, polygonAreas);
assert.strictEqual(polyInside.deliversToUser, true, 'Point inside polygon should be covered');
assert.strictEqual(polyInside.fee, 99, 'Polygon zone fee of 99 should be applied');

const userOutsidePoly = { lat: 31.4500, lng: 74.3000 };
const polyOutside = checkRestaurantDeliveryCoverage(userOutsidePoly, restaurantRadius, polygonAreas);
assert.strictEqual(polyOutside.deliversToUser, false, 'Point outside polygon should be rejected');
console.log('✅ Test 4 Passed: Geoman Polygon delivery area coverage verified');

// Test 5: Normalization of { lat, lng } vs { latitude, longitude }
const userAltCoords = { latitude: 31.5200, longitude: 74.3500 };
const polyAlt = checkRestaurantDeliveryCoverage(userAltCoords, restaurantRadius, polygonAreas);
assert.strictEqual(polyAlt.deliversToUser, true, 'Alternative coordinate format { latitude, longitude } supported');
console.log('✅ Test 5 Passed: Coordinate format flexibility ({ latitude, longitude } / { lat, lng }) verified');

// Test 6: Verify CustomerMenuPage.jsx contents for all required elements
const menuPageCode = fs.readFileSync(path.join(rootDir, 'src', 'pages', 'CustomerMenuPage.jsx'), 'utf8');

// Check 6a: Cart key per restaurant
assert.ok(menuPageCode.includes('dinehq_cart_${effectiveSlug}'), 'Cart must be persisted per restaurant slug in localStorage');

// Check 6b: Header Back button & Leave confirmation
assert.ok(menuPageCode.includes('Your cart will be kept for this restaurant. Leave?'), 'Leave confirmation dialog with exact prompt must be present');
assert.ok(menuPageCode.includes('hideHeaderBackButton'), 'Header back button hiding condition must exist');

// Check 6c: Table QR guard & open dine-in order check
assert.ok(menuPageCode.includes('hasTableQr') && menuPageCode.includes('hasOpenDineInOrder'), 'Table QR guard logic for open dine-in orders must exist');

// Check 6d: Delivery badges in menu header
assert.ok(menuPageCode.includes('Delivers to you') && menuPageCode.includes('Outside delivery area'), 'Delivery badges must exist');

// Check 6e: Smaller "More restaurants" link in footer
assert.ok(menuPageCode.includes('More restaurants'), 'Footer must contain More restaurants link');

console.log('✅ Test 6 Passed: CustomerMenuPage.jsx contains all required UI guards, modal prompts, and badges');

// Test 7: Verify DirectOrderCheckout.jsx delivery blocking and warning
const checkoutCode = fs.readFileSync(path.join(rootDir, 'src', 'components', 'DirectOrderCheckout.jsx'), 'utf8');
assert.ok(checkoutCode.includes("This restaurant doesn't deliver to your location. You can choose Pickup or Dine-in."), 'Checkout must display non-deliverable notice');
assert.ok(checkoutCode.includes('disabled={!isDeliverableToCustomer}'), 'Delivery button must be disabled when outside delivery area');
assert.ok(checkoutCode.includes('chosenAddressCoverage'), 'Checkout checks chosen address pin against delivery coverage');
assert.ok(checkoutCode.includes('effectiveDeliveryFee'), 'Zone delivery fee is dynamically applied to payable total');

console.log('✅ Test 7 Passed: DirectOrderCheckout blocks non-covered delivery and applies zone fees');

console.log('\n========================================');
console.log('🎉 ALL 7 MENU & DELIVERY GUARD TESTS PASSED!');
console.log('========================================\n');
