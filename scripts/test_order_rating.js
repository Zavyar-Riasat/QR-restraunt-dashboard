// Test suite for Order Rating flow
import assert from 'node:assert/strict';

// Mock browser localStorage for Node.js environment
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
}

globalThis.localStorage = new MockStorage();
globalThis.window = {
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
};
globalThis.CustomEvent = class {
  constructor(type, eventInitDict = {}) {
    this.type = type;
    this.detail = eventInitDict.detail || null;
  }
};

const { orderService } = await import('../src/services/orderService.js');

async function run() {
  console.log('⭐ Testing Order Rating System...');

  // 1. Test getOrderRating when not yet rated
  const testOrderId = 'TEST-ORD-999';
  const testRestaurantId = 'rest-demo-1';

  const initialRating = orderService.getOrderRating(testOrderId);
  assert.strictEqual(initialRating, null, 'Unrated order should return null rating');
  console.log('  ✅ [PASS] 1. Unrated order returns null');

  // 2. Submit rating
  const sampleRating = {
    rating: 5,
    comment: 'Super fast delivery and delicious burgers!',
    tags: ['🔥 Piping Hot', '⚡ Fast Delivery', '😋 Delicious Food'],
  };

  const result = await orderService.submitOrderRating(testOrderId, sampleRating, testRestaurantId);
  assert.strictEqual(result.rating, 5, 'Rating value matches');
  assert.strictEqual(result.comment, sampleRating.comment, 'Comment matches');
  assert.deepStrictEqual(result.tags, sampleRating.tags, 'Tags match');
  assert.ok(result.rated_at, 'Timestamp rated_at exists');
  console.log('  ✅ [PASS] 2. submitOrderRating stores and returns rating correctly');

  // 3. Retrieve rating after submission
  const fetched = orderService.getOrderRating(testOrderId);
  assert.ok(fetched, 'Should retrieve stored rating');
  assert.strictEqual(fetched.rating, 5, 'Stored rating is 5');
  assert.strictEqual(fetched.comment, sampleRating.comment, 'Stored comment matches');
  console.log('  ✅ [PASS] 3. getOrderRating retrieves previously submitted rating');

  // 4. Update/edit rating
  const updatedRating = await orderService.submitOrderRating(
    testOrderId,
    {
      rating: 4,
      comment: 'Updated review - still very good!',
      tags: ['😋 Delicious Food'],
    },
    testRestaurantId
  );
  assert.strictEqual(updatedRating.rating, 4, 'Updated rating value is 4');
  assert.strictEqual(updatedRating.comment, 'Updated review - still very good!');
  console.log('  ✅ [PASS] 4. Updating rating persists new values correctly');

  console.log('\n========================================');
  console.log('🎉 All Order Rating Tests Passed!');
  console.log('========================================\n');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
