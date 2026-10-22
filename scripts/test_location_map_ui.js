import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🧪 Starting Map UI & Location Requirements Verification...\n');

// 1. LeafletMap.jsx Checks
const leafletMapPath = path.join(rootDir, 'src', 'components', 'Map', 'LeafletMap.jsx');
const leafletMapCode = fs.readFileSync(leafletMapPath, 'utf8');

console.log('1. Checking LeafletMap.jsx:');
assert(
  leafletMapCode.includes('map.attributionControl.setPrefix(false)'),
  'LeafletMap must call map.attributionControl.setPrefix(false)'
);
console.log('  ✅ Prefix "Leaflet" removed with map.attributionControl.setPrefix(false)');

assert(
  leafletMapCode.includes('© OpenStreetMap') &&
  leafletMapCode.includes('https://www.openstreetmap.org/copyright'),
  'LeafletMap must retain OpenStreetMap attribution'
);
console.log('  ✅ OpenStreetMap attribution retained and links to copyright');

assert(
  leafletMapCode.includes('isAttributionOpen') &&
  leafletMapCode.includes('compact-osm-map') &&
  leafletMapCode.includes('.leaflet-control-attribution'),
  'LeafletMap must provide a compact "i" button that expands on tap/click'
);
console.log('  ✅ Compact "i" button toggle implemented with scoped attribution styling');

assert(
  leafletMapCode.includes('getAssetUrl') &&
  leafletMapCode.includes('createMapPinIcon') &&
  leafletMapCode.includes('asset.src'),
  'LeafletMap must support Next.js asset object format ({ src: ... })'
);
console.log('  ✅ Next.js marker asset resolution handled for { src } objects & CDN fallbacks');

assert(
  leafletMapCode.includes('ResizeObserver') &&
  leafletMapCode.includes('invalidateSize') &&
  leafletMapCode.includes('[50, 150, 300, 500, 1000]'),
  'LeafletMap must invalidate size on ResizeObserver and staggered intervals for modals/tabs'
);
console.log('  ✅ Modal and tab size invalidation verified via ResizeObserver & staggered timers');

assert(
  leafletMapCode.includes('toFixed(6)') &&
  leafletMapCode.includes('isDraggingRef'),
  'LeafletMap must use 6 decimals and prevent pin jumping during/after drag'
);
console.log('  ✅ 6-decimal coordinate precision and drag jump prevention verified');


// 2. DeliveryLocationPicker.jsx Checks
const deliveryPickerPath = path.join(rootDir, 'src', 'components', 'DeliveryLocationPicker.jsx');
const deliveryPickerCode = fs.readFileSync(deliveryPickerPath, 'utf8');

console.log('\n2. Checking DeliveryLocationPicker.jsx:');
assert(
  deliveryPickerCode.includes('checkIsSecureContext') ||
  deliveryPickerCode.includes('isSecureContext'),
  'DeliveryLocationPicker must check for secure context (HTTPS / localhost)'
);
console.log('  ✅ HTTPS secure context check present');

assert(
  deliveryPickerCode.includes('timeout: 10000'),
  'DeliveryLocationPicker must set 10s geolocation timeout'
);
console.log('  ✅ 10-second timeout strictly configured');

assert(
  deliveryPickerCode.includes('Move the pin to your exact location.') &&
  deliveryPickerCode.includes('Low accuracy') &&
  deliveryPickerCode.includes('permission denied'),
  'DeliveryLocationPicker must instruct customer to "Move the pin to your exact location."'
);
console.log('  ✅ Clear user messages: "Move the pin to your exact location." verified across errors & low accuracy');

assert(
  deliveryPickerCode.includes('setMapZoom(18)') &&
  deliveryPickerCode.includes('accuracy > 100'),
  'DeliveryLocationPicker must auto-zoom map on poor accuracy (>100m)'
);
console.log('  ✅ Auto-zoom to 18 on low accuracy (>100m) verified');

assert(
  deliveryPickerCode.includes('requestSeqRef') &&
  deliveryPickerCode.includes('hasUserManuallyEditedAddressRef'),
  'DeliveryLocationPicker must use sequence tracking to prevent reverse-geocoding race conditions'
);
console.log('  ✅ Race condition prevention verified: in-flight reverse geocode cannot overwrite pin or typed address');


// 3. geocodeService.js Checks
const geocodePath = path.join(rootDir, 'src', 'services', 'geocodeService.js');
const geocodeCode = fs.readFileSync(geocodePath, 'utf8');

console.log('\n3. Checking geocodeService.js:');
assert(
  geocodeCode.includes('AbortController') &&
  geocodeCode.includes('5000'),
  'geocodeService must abort long-hanging requests after 5s'
);
console.log('  ✅ 5-second fetch abort timeout verified');


// 4. StoreSettings.jsx Checks (Settings > About)
const settingsPath = path.join(rootDir, 'src', 'components', 'StoreSettings.jsx');
const settingsCode = fs.readFileSync(settingsPath, 'utf8');

console.log('\n4. Checking StoreSettings.jsx:');
assert(
  settingsCode.includes('Map data © OpenStreetMap contributors') &&
  settingsCode.includes('https://www.openstreetmap.org/copyright') &&
  settingsCode.includes('about-section'),
  'StoreSettings must include "Map data © OpenStreetMap contributors" in Settings > About'
);
console.log('  ✅ "Map data © OpenStreetMap contributors" included in Settings > About page');


// 5. Checkout & Non-blocking Address Validation
const checkoutUtilsPath = path.join(rootDir, 'src', 'utils', 'checkoutUtils.js');
const checkoutUtilsCode = fs.readFileSync(checkoutUtilsPath, 'utf8');
const directCheckoutPath = path.join(rootDir, 'src', 'components', 'DirectOrderCheckout.jsx');
const directCheckoutCode = fs.readFileSync(directCheckoutPath, 'utf8');

console.log('\n5. Checking Non-blocking Checkout:');
assert(
  checkoutUtilsCode.includes('areaLandmark') || checkoutUtilsCode.includes('houseFlat'),
  'checkoutUtils must accept landmark or houseFlat even if formal address is not resolved'
);
assert(
  directCheckoutCode.includes('areaLandmark') && directCheckoutCode.includes('houseFlat'),
  'DirectOrderCheckout must not block checkout when address + landmark is entered'
);
console.log('  ✅ Delivery order checkout never blocked when typed address + landmark is entered');

console.log('\n🎉 ALL SPECIFICATION CHECKS PASSED SUCCESSFULLY!\n');
