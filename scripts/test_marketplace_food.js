import { marketplaceService } from '../src/services/marketplaceService.js';

async function runTests() {
  console.log('🍔 Testing Marketplace Food Search & Discovery...');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Get all public food items
  const allFood = await marketplaceService.getPublicFoodItems({});
  assert(allFood.foodItems.length > 0, `Returns list of food items (got ${allFood.foodItems.length} items)`);
  assert(allFood.totalCount >= allFood.foodItems.length, `totalCount is accurate (${allFood.totalCount})`);

  // 2. Validate food item schema
  const first = allFood.foodItems[0];
  assert(Boolean(first.id), 'Food item has id');
  assert(Boolean(first.title), `Food item has title ("${first.title}")`);
  assert(typeof first.price === 'number' && first.price > 0, `Food item has price (${first.price})`);
  assert(Boolean(first.restaurant_name), `Food item has restaurant_name ("${first.restaurant_name}")`);
  assert(Boolean(first.restaurant_slug), `Food item has restaurant_slug ("${first.restaurant_slug}")`);
  assert(Boolean(first.image), 'Food item has image URL');

  // 3. Search by food keyword
  const burgerSearch = await marketplaceService.getPublicFoodItems({ search: 'burger' });
  assert(
    burgerSearch.foodItems.length > 0 &&
      burgerSearch.foodItems.every(
        (f) =>
          f.title.toLowerCase().includes('burger') ||
          f.description.toLowerCase().includes('burger') ||
          f.category.toLowerCase().includes('burger') ||
          f.restaurant_name.toLowerCase().includes('burger')
      ),
    `Search by food keyword "burger" returns relevant results (${burgerSearch.foodItems.length} found)`
  );

  // 4. Search by restaurant name while in food mode
  const crustSearch = await marketplaceService.getPublicFoodItems({ search: 'Crust' });
  assert(
    crustSearch.foodItems.length > 0 &&
      crustSearch.foodItems.every((f) => f.restaurant_name.includes('Crust')),
    `Search by restaurant "Crust" returns dishes from that restaurant (${crustSearch.foodItems.length} found)`
  );

  // 5. Filter by cuisine
  const pizzaCuisine = await marketplaceService.getPublicFoodItems({ cuisine: 'Pizza' });
  assert(
    pizzaCuisine.foodItems.length > 0,
    `Filter by cuisine "Pizza" returns pizza/pasta dishes (${pizzaCuisine.foodItems.length} found)`
  );

  // 6. Sort by price asc
  const priceAsc = await marketplaceService.getPublicFoodItems({ sort: 'price_asc' });
  let isSortedAsc = true;
  for (let i = 0; i < priceAsc.foodItems.length - 1; i++) {
    if (priceAsc.foodItems[i].price > priceAsc.foodItems[i + 1].price) {
      isSortedAsc = false;
      break;
    }
  }
  assert(isSortedAsc, `Sort by price_asc is properly sorted ascending`);

  // 7. Sort by price desc
  const priceDesc = await marketplaceService.getPublicFoodItems({ sort: 'price_desc' });
  let isSortedDesc = true;
  for (let i = 0; i < priceDesc.foodItems.length - 1; i++) {
    if (priceDesc.foodItems[i].price < priceDesc.foodItems[i + 1].price) {
      isSortedDesc = false;
      break;
    }
  }
  assert(isSortedDesc, `Sort by price_desc is properly sorted descending`);

  console.log(`\n========================================`);
  console.log(`Marketplace Food Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================`);

  if (failed > 0) process.exit(1);
}

runTests();
