import assert from 'node:assert';
import {
  generatePresetPolygon,
  validatePolygonCoordinates,
  calculatePolygonAreaKm2,
  isPointInPolygon,
  checkRestaurantDeliveryCoverage,
} from '../src/utils/geoValidation.js';

console.log('📐 Testing Delivery Area Polygon Drawing & Coverage System...');

const restLat = 33.72148;
const restLng = 73.05232;

// Test 1: 1-Click Preset Area Generation
{
  const preset5km = generatePresetPolygon(restLat, restLng, 5, 6);
  assert.strictEqual(preset5km.length, 6, 'Should generate 6-sided hexagon polygon');
  const validation = validatePolygonCoordinates(preset5km);
  assert.strictEqual(validation.valid, true, 'Preset polygon should be valid');

  const area = calculatePolygonAreaKm2(preset5km);
  assert.ok(area > 50 && area < 80, `5km hexagon area should be approx 65 km² (got ${area})`);
  console.log(`  ✅ [PASS] 1. 1-Click 5km Polygon Generation: 6 vertices, area = ~${area} km²`);
}

// Test 2: Custom plotted polygon validation
{
  const customPolygon = [
    { lat: 33.73, lng: 73.04 },
    { lat: 33.73, lng: 73.07 },
    { lat: 33.71, lng: 73.07 },
    { lat: 33.71, lng: 73.04 },
  ];
  const validation = validatePolygonCoordinates(customPolygon);
  assert.strictEqual(validation.valid, true);
  const area = calculatePolygonAreaKm2(customPolygon);
  assert.ok(area > 0);
  console.log(`  ✅ [PASS] 2. Custom 4-corner polygon validated (~${area} km²)`);
}

// Test 3: Point-in-polygon delivery coverage
{
  const customPolygon = [
    { lat: 33.73, lng: 73.04 },
    { lat: 33.73, lng: 73.07 },
    { lat: 33.71, lng: 73.07 },
    { lat: 33.71, lng: 73.04 },
  ];
  const restaurant = {
    latitude: 33.72,
    longitude: 73.055,
    delivery_areas: [
      {
        type: 'polygon',
        polygon: customPolygon,
        fee: 150,
      },
    ],
  };

  // Inside point
  const insideLocation = { lat: 33.72, lng: 73.055 };
  const insideResult = checkRestaurantDeliveryCoverage(insideLocation, restaurant);
  assert.strictEqual(insideResult.deliversToUser, true, 'Location inside polygon should be deliverable');

  // Outside point
  const outsideLocation = { lat: 33.75, lng: 73.10 };
  const outsideResult = checkRestaurantDeliveryCoverage(outsideLocation, restaurant);
  assert.strictEqual(outsideResult.deliversToUser, false, 'Location outside polygon should NOT be deliverable');

  console.log('  ✅ [PASS] 3. Customer delivery coverage correctly checked against polygon');
}

// Test 4: Draggable vertex update simulation
{
  const coords = generatePresetPolygon(restLat, restLng, 4, 6);
  // Simulate user dragging point #0 to expand north
  const modified = [...coords];
  modified[0] = { lat: coords[0].lat + 0.02, lng: coords[0].lng };
  const val = validatePolygonCoordinates(modified);
  assert.strictEqual(val.valid, true);
  console.log('  ✅ [PASS] 4. Vertex drag adjustment simulation valid and verified');
}

console.log('\n========================================');
console.log('🎉 All Polygon Drawing & Coverage Tests Passed!');
console.log('========================================\n');
