import assert from 'node:assert/strict';
import { handleNearbyDishesApi } from '../server/nearbyDishesHandler.js';

console.log('🧪 Testing Modes, Nearby Dishes Server API & Cart Conflict Logic...\n');

// Mock request / response helper
function mockApiCall(url) {
  return new Promise((resolve, reject) => {
    const req = {
      method: 'GET',
      url,
      headers: { host: '127.0.0.1:5173' },
    };

    let body = '';
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(name, val) {
        this.headers[name] = val;
      },
      end(chunk) {
        if (chunk) body += chunk;
        try {
          resolve({
            statusCode: this.statusCode,
            headers: this.headers,
            data: JSON.parse(body),
          });
        } catch  {
          resolve({
            statusCode: this.statusCode,
            headers: this.headers,
            data: body,
          });
        }
      },
    };

    handleNearbyDishesApi(req, res).catch(reject);
  });
}

async function runTests() {
  // Test 1: GET /api/nearby/dishes at Safa Gold Mall coordinates
  console.log('1. Testing GET /api/nearby/dishes at Safa Gold Mall coordinates (33.721, 73.052)...');
  const res1 = await mockApiCall('/api/nearby/dishes?lat=33.721&lng=73.052&limit=24');
  assert.equal(res1.statusCode, 200, 'Endpoint should return HTTP 200');
  assert(Array.isArray(res1.data.items), 'Response should contain items array');
  assert.equal(res1.data.items.length, 24, 'First page should have exactly 24 items');
  assert(res1.data.total_count >= 30, `Total dishes should be at least 30, got ${res1.data.total_count}`);
  assert.equal(res1.data.next_cursor, 24, 'Next cursor should be 24');
  assert.equal(res1.data.has_more, true, 'has_more should be true');

  // Verify demo restaurant is present and close
  const demoItem = res1.data.items.find((item) => item.restaurant_slug === 'burgersmoke');
  assert(demoItem, 'Burger & Smoke Co. dishes should be returned');
  assert(demoItem.distance_km <= 0.2, `Burger & Smoke Co. distance should be near 0.1km, got ${demoItem.distance_km}`);
  assert.equal(demoItem.delivers_to_user, true, 'Burger & Smoke Co. should deliver to Safa Gold Mall');
  console.log(`  ✅ [PASS] 24 dishes returned on page 1 (Total: ${res1.data.total_count}), demo restaurant Burger & Smoke Co. distance: ${demoItem.distance_km} km`);

  // Test 2: Cursor pagination (page 2)
  console.log('2. Testing cursor pagination for remaining dishes...');
  const res2 = await mockApiCall(`/api/nearby/dishes?lat=33.721&lng=73.052&cursor=${res1.data.next_cursor}&limit=24`);
  assert.equal(res2.statusCode, 200, 'Page 2 should return HTTP 200');
  assert(res2.data.items.length > 0, 'Page 2 should have remaining items');
  assert.equal(res1.data.items.length + res2.data.items.length, res1.data.total_count, 'Combined items should equal total_count');
  console.log(`  ✅ [PASS] Page 2 returned ${res2.data.items.length} remaining items, has_more=${res2.data.has_more}`);

  // Test 3: Search by food keyword
  console.log('3. Testing food keyword search ("biryani")...');
  const res3 = await mockApiCall('/api/nearby/dishes?lat=33.721&lng=73.052&query=biryani');
  assert.equal(res3.statusCode, 200);
  assert(res3.data.items.length > 0, 'Should find biryani dishes');
  const allBiryani = res3.data.items.every(
    (item) =>
      item.title.toLowerCase().includes('biryani') ||
      item.category.toLowerCase().includes('biryani') ||
      item.description.toLowerCase().includes('biryani')
  );
  assert(allBiryani, 'All returned items must match biryani keyword or category or description');
  console.log(`  ✅ [PASS] Found ${res3.data.items.length} biryani dishes across multiple restaurants`);

  // Test 4: Category filter
  console.log('4. Testing category filter ("Pizza")...');
  const res4 = await mockApiCall('/api/nearby/dishes?lat=33.721&lng=73.052&category=Pizza');
  assert.equal(res4.statusCode, 200);
  assert(res4.data.items.length >= 2, 'Should find Pizza items');
  const allPizza = res4.data.items.every((item) => item.category === 'Pizza');
  assert(allPizza, 'All returned items must belong to Pizza category');
  console.log(`  ✅ [PASS] Filtered ${res4.data.items.length} Pizza dishes`);

  // Test 5: Price Sort
  console.log('5. Testing price sort (price_asc and price_desc)...');
  const resAsc = await mockApiCall('/api/nearby/dishes?lat=33.721&lng=73.052&sort=price_asc&limit=10');
  const pricesAsc = resAsc.data.items.map((i) => i.price);
  for (let i = 1; i < pricesAsc.length; i++) {
    assert(pricesAsc[i] >= pricesAsc[i - 1], `Ascending sort failed at index ${i}: ${pricesAsc[i]} < ${pricesAsc[i - 1]}`);
  }

  const resDesc = await mockApiCall('/api/nearby/dishes?lat=33.721&lng=73.052&sort=price_desc&limit=10');
  const pricesDesc = resDesc.data.items.map((i) => i.price);
  for (let i = 1; i < pricesDesc.length; i++) {
    assert(pricesDesc[i] <= pricesDesc[i - 1], `Descending sort failed at index ${i}: ${pricesDesc[i]} > ${pricesDesc[i - 1]}`);
  }
  console.log('  ✅ [PASS] Price sorting (price_asc, price_desc) verified');

  // Test 6: Distance comparison of separate cards for the same dish
  console.log('6. Verifying separate cards with different prices & distances for comparison...');
  const resBiryanis = await mockApiCall('/api/nearby/dishes?lat=33.721&lng=73.052&query=biryani');
  const restNames = new Set(resBiryanis.data.items.map((i) => i.restaurant_name));
  assert(restNames.size >= 2, 'Biryani should be available from at least 2 different restaurants for customer comparison');
  console.log(`  ✅ [PASS] Biryani available from ${restNames.size} different restaurants: ${Array.from(restNames).join(', ')}`);

  console.log('\n========================================');
  console.log('🎉 All Modes & Nearby Dishes Server API Tests Passed!');
  console.log('========================================\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
