import assert from 'node:assert';
import { getItemPricing } from '../src/utils/dealUtils.js';

console.log('🏷️ Testing Discount Pricing & Menu Display Logic...');

// Test 1: Item with explicit original_price (Selling Price = 850, Original Price = 1000)
{
  const item = {
    id: 'item-1',
    title: 'Smash Burger Double',
    price: 850,
    original_price: 1000,
  };
  const pricing = getItemPricing(item);
  assert.strictEqual(pricing.finalPrice, 850, 'Final selling price should be 850');
  assert.strictEqual(pricing.originalPrice, 1000, 'Original crossed-out price should be 1000');
  assert.strictEqual(pricing.hasDiscount, true, 'hasDiscount should be true');
  assert.strictEqual(pricing.savings, 150, 'Savings should be 150');
  assert.strictEqual(pricing.discountPercent, 15, 'Discount percent should be 15%');
  console.log('  ✅ [PASS] 1. Explicit item.original_price verified: Rs. 850 first, Rs. 1000 second (15% off)');
}

// Test 2: Item with original_price inside variants JSON
{
  const item = {
    id: 'item-2',
    title: 'Chicken Karahi Special',
    price: 960,
    variants: {
      original_price: 1200,
      description: 'Half Karahi',
    },
  };
  const pricing = getItemPricing(item);
  assert.strictEqual(pricing.finalPrice, 960, 'Final price should be 960');
  assert.strictEqual(pricing.originalPrice, 1200, 'Original price should be 1200');
  assert.strictEqual(pricing.hasDiscount, true);
  assert.strictEqual(pricing.savings, 240);
  assert.strictEqual(pricing.discountPercent, 20);
  console.log('  ✅ [PASS] 2. Item with variants.original_price verified: Rs. 960 first, Rs. 1200 second (20% off)');
}

// Test 3: Item with percentage discount
{
  const item = {
    id: 'item-3',
    title: 'Pepperoni Large Feast',
    price: 1200,
    discount_percent: 25,
  };
  const pricing = getItemPricing(item);
  assert.strictEqual(pricing.finalPrice, 900, 'Final price should be 900 after 25% discount');
  assert.strictEqual(pricing.originalPrice, 1200, 'Original price should be 1200');
  assert.strictEqual(pricing.hasDiscount, true);
  assert.strictEqual(pricing.savings, 300);
  assert.strictEqual(pricing.discountPercent, 25);
  console.log('  ✅ [PASS] 3. Item with discount_percent verified: Rs. 900 first, Rs. 1200 second (25% off)');
}

// Test 4: Restaurant store-wide active discount applied on regular dish
{
  const item = {
    id: 'item-4',
    title: 'Mint Margarita',
    price: 400,
  };
  const restaurant = {
    id: 'rest-1',
    discount_percentage: 15,
  };
  const pricing = getItemPricing(item, restaurant);
  assert.strictEqual(pricing.finalPrice, 340, 'Final price should be 340 after 15% store discount');
  assert.strictEqual(pricing.originalPrice, 400, 'Original price should be 400');
  assert.strictEqual(pricing.hasDiscount, true);
  assert.strictEqual(pricing.savings, 60);
  assert.strictEqual(pricing.discountPercent, 15);
  console.log('  ✅ [PASS] 4. Store-wide restaurant discount: Rs. 340 first, Rs. 400 second (15% off)');
}

// Test 5: Deal item with package bundle calculation
{
  const dealItem = {
    id: 'deal-1',
    title: 'Midnight Duo Deal',
    price: 1250,
    variants: {
      is_deal: true,
      original_price: 1600,
      badge: 'Super Saver',
      deal_items: '2x Smash Burgers, 1x Large Fries, 2x Drinks',
    },
  };
  const pricing = getItemPricing(dealItem);
  assert.strictEqual(pricing.finalPrice, 1250, 'Final deal price should be 1250');
  assert.strictEqual(pricing.originalPrice, 1600, 'Original bundle price should be 1600');
  assert.strictEqual(pricing.hasDiscount, true);
  assert.strictEqual(pricing.savings, 350);
  assert.strictEqual(pricing.discountPercent, 22);
  console.log('  ✅ [PASS] 5. Deal bundle original_price: Rs. 1250 first, Rs. 1600 second (22% off)');
}

// Test 6: Normal item without discount
{
  const normalItem = {
    id: 'item-6',
    title: 'Mineral Water Large',
    price: 120,
  };
  const pricing = getItemPricing(normalItem);
  assert.strictEqual(pricing.finalPrice, 120);
  assert.strictEqual(pricing.originalPrice, 0);
  assert.strictEqual(pricing.hasDiscount, false);
  console.log('  ✅ [PASS] 6. Regular item without discount: Rs. 120 (no strikethrough)');
}

console.log('\n========================================');
console.log('🎉 All 6 Discount Pricing Tests Passed!');
console.log('========================================\n');
