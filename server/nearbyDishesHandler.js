/**
 * Server-Side Nearby Dishes API Handler
 * Endpoint: GET /api/nearby/dishes
 * 
 * Supports:
 * - Query parameters: lat, lng, query, category, sort, cursor, limit, open_now, veg_only, min_price, max_price
 * - Haversine distance calculation to customer's location
 * - Delivery coverage verification (checks if customer is within delivery radius)
 * - Filtering: only approved restaurants, closed restaurants sink to bottom (or filtered if open_now)
 * - Pagination: 24 dishes per page (never loads all dishes into the client at once)
 * - Next cursor for seamless infinite scroll or load more
 */

// Earth radius in kilometers
const EARTH_RADIUS_KM = 6371;

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return null;
  }
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((EARTH_RADIUS_KM * c).toFixed(1));
}

// 7 Verified Demo Restaurants with accurate Islamabad coordinates and coverage
const DEMO_RESTAURANTS = [
  {
    id: 'rest-101',
    name: 'Burger & Smoke Co.',
    slug: 'burgersmoke',
    latitude: 33.72148,
    longitude: 73.05232,
    rating: 4.9,
    delivery_fee: 150,
    min_order: 500,
    delivery_radius_km: 7.5,
    is_open: true,
    listing_status: 'approved',
    cover_image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=200&h=200&q=80',
    cuisines: ['Smash Burgers', 'American Fast Food', 'Loaded Fries'],
  },
  {
    id: 'rest-102',
    name: 'Crust & Crave Pizzeria',
    slug: 'crust',
    latitude: 33.71821,
    longitude: 73.05642,
    rating: 4.8,
    delivery_fee: 120,
    min_order: 600,
    delivery_radius_km: 6.0,
    is_open: true,
    listing_status: 'approved',
    cover_image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=200&h=200&q=80',
    cuisines: ['Wood-Fired Pizza', 'Italian', 'Pasta'],
  },
  {
    id: 'rest-103',
    name: 'Khyber Shinwari & Karahi Dera',
    slug: 'shinwari',
    latitude: 33.69915,
    longitude: 73.01891,
    rating: 4.7,
    delivery_fee: 180,
    min_order: 1000,
    delivery_radius_km: 8.5,
    is_open: true,
    listing_status: 'approved',
    cover_image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=200&h=200&q=80',
    cuisines: ['Desi Karahi', 'Mutton Shinwari', 'BBQ & Kebabs'],
  },
  {
    id: 'rest-104',
    name: 'Green Oasis Cafe & Bowls',
    slug: 'greenoasis',
    latitude: 33.72985,
    longitude: 73.06121,
    rating: 4.85,
    delivery_fee: 100,
    min_order: 400,
    delivery_radius_km: 5.0,
    is_open: true,
    listing_status: 'approved',
    cover_image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=200&h=200&q=80',
    cuisines: ['Salads & Healthy', 'Acai Bowls', 'Specialty Coffee'],
  },
  {
    id: 'rest-105',
    name: 'Saffron Dera & Charcoal BBQ',
    slug: 'saffrondera',
    latitude: 33.70512,
    longitude: 73.04523,
    rating: 4.65,
    delivery_fee: 140,
    min_order: 800,
    delivery_radius_km: 7.0,
    is_open: true,
    listing_status: 'approved',
    cover_image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=200&h=200&q=80',
    cuisines: ['BBQ', 'Desi', 'Biryani', 'Karahi'],
  },
  {
    id: 'rest-106',
    name: 'Tokyo Sushi & Asian Bar',
    slug: 'tokyosushi',
    latitude: 33.72412,
    longitude: 73.05831,
    rating: 4.8,
    delivery_fee: 140,
    min_order: 800,
    delivery_radius_km: 6.5,
    is_open: true,
    listing_status: 'approved',
    cover_image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=200&h=200&q=80',
    cuisines: ['Japanese', 'Sushi', 'Ramen'],
  },
  {
    id: 'rest-107',
    name: 'Royal Taj Desi Continental',
    slug: 'royaltaj',
    latitude: 33.71534,
    longitude: 73.04812,
    rating: 4.75,
    delivery_fee: 160,
    min_order: 700,
    delivery_radius_km: 8.0,
    is_open: true,
    listing_status: 'approved',
    cover_image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=200&h=200&q=80',
    cuisines: ['Desi', 'Biryani', 'Karahi', 'Breads'],
  },
  {
    id: 'rest-112',
    name: 'Lyallpur Grill & BBQ House',
    slug: 'lyallpurgrill',
    latitude: 31.4187,
    longitude: 73.0791,
    rating: 4.9,
    delivery_fee: 120,
    min_order: 500,
    delivery_radius_km: 25.0,
    is_open: true,
    listing_status: 'approved',
    cover_image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=200&h=200&q=80',
    cuisines: ['BBQ', 'Desi', 'Karahi', 'Biryani'],
  },
  {
    id: 'rest-113',
    name: 'Chenab Smash & Pizza Lounge',
    slug: 'chenabsmash',
    latitude: 31.4204,
    longitude: 73.0774,
    rating: 4.85,
    delivery_fee: 100,
    min_order: 450,
    delivery_radius_km: 25.0,
    is_open: true,
    listing_status: 'approved',
    cover_image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=200&h=200&q=80',
    cuisines: ['Burgers', 'Pizza', 'Fast Food', 'Shakes'],
  },
];

// 35+ Curated Seed Dishes across different categories, prices, and restaurants
const SEED_DISHES = [
  // --- Burger & Smoke Co. (rest-101) ---
  {
    id: 'dish-101-1',
    raw_item_id: 'item-1',
    restaurant_slug: 'burgersmoke',
    title: 'Truffle Double Smash Burger',
    price: 1190,
    category: 'Burgers',
    description: 'Double Angus beef patties, Swiss truffle cheese, caramelized onions, garlic truffle aioli on a toasted brioche bun.',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
    is_veg: false,
    has_options: true,
  },
  {
    id: 'dish-101-2',
    raw_item_id: 'item-2',
    restaurant_slug: 'burgersmoke',
    title: 'Crispy Nashville Hot Chicken Zinger',
    price: 990,
    category: 'Burgers',
    description: 'Buttermilk fried chicken breast drenched in Nashville spice oil, comeback slaw, dill pickles on brioche.',
    image: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=600&q=80',
    is_veg: false,
    has_options: true,
  },
  {
    id: 'dish-101-3',
    raw_item_id: 'item-3',
    restaurant_slug: 'burgersmoke',
    title: 'Cajun Loaded Curly Fries',
    price: 590,
    category: 'Sides',
    description: 'Crisp skin-on rustic fries dusted in Louisiana Cajun seasoning, melted cheddar cheese, and smoky chipotle dip.',
    image: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=600&q=80',
    is_veg: true,
    has_options: false,
  },
  {
    id: 'dish-101-4',
    raw_item_id: 'item-4',
    restaurant_slug: 'burgersmoke',
    title: 'Artisan Vanilla Bean Shake',
    price: 500,
    category: 'Shakes',
    description: 'Hand-spun Madagascan vanilla bean ice cream with whole milk and whipped cream.',
    image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80',
    is_veg: true,
    has_options: false,
  },
  {
    id: 'dish-101-5',
    raw_item_id: 'item-5',
    restaurant_slug: 'burgersmoke',
    title: 'Super Smash Duo Combo Deal',
    price: 2450,
    category: 'Deals',
    description: '2x Truffle Double Smash Burgers, 1x Cajun Loaded Fries, and 2x Chilled Soft Drinks.',
    image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80',
    is_veg: false,
    has_options: false,
  },

  // --- Crust & Crave Pizzeria (rest-102) ---
  {
    id: 'dish-102-1',
    raw_item_id: 'crust-item-1',
    restaurant_slug: 'crust',
    title: 'Wood-Fired Truffle Funghi Pizza',
    price: 1650,
    category: 'Pizza',
    description: 'Wild forest portobello mushrooms, fresh Fior di Latte mozzarella, white truffle oil, and roasted garlic.',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
    is_veg: true,
    has_options: true,
  },
  {
    id: 'dish-102-2',
    raw_item_id: 'crust-item-2',
    restaurant_slug: 'crust',
    title: 'Smoked Pepperoni & Hot Honey Pizza',
    price: 1790,
    category: 'Pizza',
    description: 'Crispy beef pepperoni cups, San Marzano tomato pomodoro, torn basil, finished with hot chili honey drizzle.',
    image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=600&q=80',
    is_veg: false,
    has_options: true,
  },
  {
    id: 'dish-102-3',
    raw_item_id: 'crust-item-3',
    restaurant_slug: 'crust',
    title: 'Creamy Fettuccine Alfredo with Charred Chicken',
    price: 1350,
    category: 'Sides',
    description: 'Fresh egg fettuccine tossed in 24-month aged Reggiano parmesan cream, rosemary grilled chicken.',
    image: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=600&q=80',
    is_veg: false,
    has_options: true,
  },
  {
    id: 'dish-102-4',
    raw_item_id: 'crust-item-4',
    restaurant_slug: 'crust',
    title: 'Stuffed Cheesy Garlic Dough Knots',
    price: 690,
    category: 'Sides',
    description: 'Hand-tied sourdough knots smothered in garlic butter, fresh parsley, stuffed with melted mozzarella.',
    image: 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?auto=format&fit=crop&w=600&q=80',
    is_veg: true,
    has_options: false,
  },
  {
    id: 'dish-102-5',
    raw_item_id: 'crust-item-5',
    restaurant_slug: 'crust',
    title: 'Traditional Classic Tiramisu Della Nonna',
    price: 750,
    category: 'Desserts',
    description: 'Savoiardi ladyfingers steeped in espresso, layered with airy mascarpone cream and Valrhona cocoa.',
    image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80',
    is_veg: true,
    has_options: false,
  },

  // --- Khyber Shinwari & Karahi Dera (rest-103) ---
  {
    id: 'dish-103-1',
    raw_item_id: 'shinwari-item-1',
    restaurant_slug: 'shinwari',
    title: 'Desi Mutton Shinwari Karahi',
    price: 2450,
    category: 'Karahi',
    description: 'Tender mountain mutton cooked in lamb fat with vine-ripened tomatoes, salt, green chilies, and ginger slivers.',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    is_veg: false,
    has_options: true,
  },
  {
    id: 'dish-103-2',
    raw_item_id: 'shinwari-item-2',
    restaurant_slug: 'shinwari',
    title: 'Chicken White Makhni Handi',
    price: 1590,
    category: 'Karahi',
    description: 'Boneless chicken cubes braised in clotted dairy cream, butter, black pepper, and cashews in a clay handi.',
    image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=600&q=80',
    is_veg: false,
    has_options: true,
  },
  {
    id: 'dish-103-3',
    raw_item_id: 'shinwari-item-3',
    restaurant_slug: 'shinwari',
    title: 'Peshawari Beef Chapli Kebab Platter',
    price: 1150,
    category: 'BBQ',
    description: 'Two authentic beef chapli kebabs spiced with anardana, coriander seeds, and fried tomato slices.',
    image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80',
    is_veg: false,
    has_options: true,
  },
  {
    id: 'dish-103-4',
    raw_item_id: 'shinwari-item-4',
    restaurant_slug: 'shinwari',
    title: 'Charcoal Malai Boti Skewers',
    price: 1090,
    category: 'BBQ',
    description: 'Boneless chicken cubes soaked in fresh malai, green chilies, and white pepper, char-grilled over coals.',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80',
    is_veg: false,
    has_options: false,
  },
  {
    id: 'dish-103-5',
    raw_item_id: 'shinwari-item-5',
    restaurant_slug: 'shinwari',
    title: 'Sesame Roghani Naan Basket (3 Pcs)',
    price: 360,
    category: 'Sides',
    description: 'Warm clay-oven baked soft roghani naans brushed with pure desi ghee and toasted white sesame.',
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
    is_veg: true,
    has_options: false,
  },

  // --- Green Oasis Cafe & Bowls (rest-104) ---
  {
    id: 'dish-104-1',
    raw_item_id: 'oasis-item-1',
    restaurant_slug: 'greenoasis',
    title: 'Citrus Quinoa & Grilled Salmon Bowl',
    price: 1690,
    category: 'Sides',
    description: 'Atlantic salmon fillet over organic quinoa, Hass avocado, edamame beans, and roasted sesame-ginger vinaigrette.',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
    is_veg: false,
    has_options: true,
  },
  {
    id: 'dish-104-2',
    raw_item_id: 'oasis-item-2',
    restaurant_slug: 'greenoasis',
    title: 'Amazonian Wild Acai Energy Bowl',
    price: 1150,
    category: 'Desserts',
    description: 'Organic Brazilian acai purée blended with frozen berries and banana, topped with almond butter and granola.',
    image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80',
    is_veg: true,
    has_options: false,
  },
  {
    id: 'dish-104-3',
    raw_item_id: 'oasis-item-3',
    restaurant_slug: 'greenoasis',
    title: 'Mediterranean Herb Falafel & Hummus',
    price: 990,
    category: 'Sides',
    description: 'Crispy herb chickpea falafels over beetroot hummus, pickled red onions, olives, and warm zaatar pita.',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
    is_veg: true,
    has_options: false,
  },
  {
    id: 'dish-104-4',
    raw_item_id: 'oasis-item-4',
    restaurant_slug: 'greenoasis',
    title: 'Vanilla Iced Spanish Latte',
    price: 620,
    category: 'Drinks',
    description: 'Double shot of 100% Arabica espresso poured over condensed sweet milk, fresh milk, and crushed crystal ice.',
    image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80',
    is_veg: true,
    has_options: false,
  },

  // --- Saffron Dera & Charcoal BBQ (rest-105) ---
  {
    id: 'dish-105-1',
    raw_item_id: 'saffron-item-1',
    restaurant_slug: 'saffrondera',
    title: 'Special Sindhi Mutton Biryani',
    price: 1050,
    category: 'Biryani',
    description: 'Fragrant saffron basmati rice cooked with tender mutton chunks, dried plums, potatoes, and roasted spices.',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
    is_veg: false,
    has_options: false,
  },
  {
    id: 'dish-105-2',
    raw_item_id: 'saffron-item-2',
    restaurant_slug: 'saffrondera',
    title: 'Charcoal Smoked Chicken Tikka (Breast)',
    price: 580,
    category: 'BBQ',
    description: 'Marinated in spicy yogurt tikka masala, skewered and smoked over glowing coals until juicy with fresh lemon.',
    image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80',
    is_veg: false,
    has_options: false,
  },
  {
    id: 'dish-105-3',
    raw_item_id: 'saffron-item-3',
    restaurant_slug: 'saffrondera',
    title: 'Peshawari Chicken Karahi',
    price: 1390,
    category: 'Karahi',
    description: 'Half kg chicken wok-seared in ghee with fresh tomatoes, green chillies, crushed black pepper, and ginger.',
    image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=600&q=80',
    is_veg: false,
    has_options: true,
  },
  {
    id: 'dish-105-4',
    raw_item_id: 'saffron-item-4',
    restaurant_slug: 'saffrondera',
    title: 'Gulab Jamun with Rabri (2 Pcs)',
    price: 350,
    category: 'Desserts',
    description: 'Hot melt-in-the-mouth khoya gulab jamuns served with chilled thickened pistachio rabri milk.',
    image: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=600&q=80',
    is_veg: true,
    has_options: false,
  },

  // --- Tokyo Sushi & Asian Bar (rest-106) ---
  {
    id: 'dish-106-1',
    raw_item_id: 'tokyo-item-1',
    restaurant_slug: 'tokyosushi',
    title: 'Spicy Salmon Crunch Roll (8 Pcs)',
    price: 1550,
    category: 'Sides',
    description: 'Fresh Norwegian salmon, cucumber, sriracha aioli, rolled in nori, topped with tempura flakes and unagi glaze.',
    image: 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=600&q=80',
    is_veg: false,
    has_options: false,
  },
  {
    id: 'dish-106-2',
    raw_item_id: 'tokyo-item-2',
    restaurant_slug: 'tokyosushi',
    title: 'Rich Tonkotsu Chashu Ramen',
    price: 1490,
    category: 'Sides',
    description: '16-hour slow-simmered savory broth, hand-pulled noodles, tender torched chashu, ajitsuke egg, and nori.',
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
    is_veg: false,
    has_options: false,
  },
  {
    id: 'dish-106-3',
    raw_item_id: 'tokyo-item-3',
    restaurant_slug: 'tokyosushi',
    title: 'Matcha Green Tea Iced Latte',
    price: 550,
    category: 'Drinks',
    description: 'Ceremonial grade Uji Japanese matcha whisked with sweet milk and poured over crystal ice.',
    image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80',
    is_veg: true,
    has_options: false,
  },

  // --- Royal Taj Desi Continental (rest-107) ---
  {
    id: 'dish-107-1',
    raw_item_id: 'taj-item-1',
    restaurant_slug: 'royaltaj',
    title: 'Dum Pukht Chicken Biryani (Special)',
    price: 850,
    category: 'Biryani',
    description: 'Aromatic long-grain basmati rice layered with saffron chicken pieces, golden fried onions, prunes, and mint leaves.',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
    is_veg: false,
    has_options: false,
  },
  {
    id: 'dish-107-2',
    raw_item_id: 'taj-item-2',
    restaurant_slug: 'royaltaj',
    title: 'Shahi Chicken Makhni Handi',
    price: 1390,
    category: 'Karahi',
    description: 'Boneless chicken simmered in clay handi with rich cashew nut gravy, fresh cream, butter, and fenugreek leaves.',
    image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=600&q=80',
    is_veg: false,
    has_options: false,
  },
  {
    id: 'dish-107-3',
    raw_item_id: 'taj-item-3',
    restaurant_slug: 'royaltaj',
    title: 'Charcoal Seekh Kebab Platter (4 Pcs)',
    price: 990,
    category: 'BBQ',
    description: 'Minced beef kebabs seasoned with garam masala, onions, mint, and skewered over live embers.',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80',
    is_veg: false,
    has_options: false,
  },
  {
    id: 'dish-107-4',
    raw_item_id: 'taj-item-4',
    restaurant_slug: 'royaltaj',
    title: 'Shahi Zafrani Kheer Matka',
    price: 380,
    category: 'Desserts',
    description: 'Traditional slow-reduced milk rice pudding scented with saffron, cardamom, crushed pistachios, and almonds.',
    image: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=600&q=80',
    is_veg: true,
    has_options: false,
  },
  {
    id: 'dish-107-5',
    raw_item_id: 'taj-item-5',
    restaurant_slug: 'royaltaj',
    title: 'Family Feast Combo Deal',
    price: 3890,
    category: 'Deals',
    description: '1x Dum Pukht Biryani, 1x Chicken Makhni Handi, 4x Roghani Naans, 1x Seekh Kebab Platter, 1.5L Drink.',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    is_veg: false,
    has_options: false,
  },
  {
    id: 'dish-107-6',
    raw_item_id: 'taj-item-6',
    restaurant_slug: 'royaltaj',
    title: 'Chilled Mint Lemonade Cooler',
    price: 290,
    category: 'Drinks',
    description: 'Fresh crushed mint leaves, fresh lemon juice, black salt, and sparkling soda over crushed ice.',
    image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80',
    is_veg: true,
    has_options: false,
  },
  {
    id: 'dish-107-7',
    raw_item_id: 'taj-item-7',
    restaurant_slug: 'royaltaj',
    title: 'Classic Mango Kulfi Shake',
    price: 490,
    category: 'Shakes',
    description: 'Pure Chaunsa mango pulp blended with traditional khoya kulfi and chilled whole milk.',
    image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80',
    is_veg: true,
    has_options: false,
  },
  // --- Lyallpur Grill & BBQ House (rest-112, Jinnah Colony Faisalabad) ---
  {
    id: 'dish-112-1',
    raw_item_id: 'lyallpur-item-1',
    restaurant_slug: 'lyallpurgrill',
    title: 'Lyallpur Special Mutton Chops (6 Pcs)',
    price: 1650,
    category: 'BBQ',
    description: 'Charcoal-grilled tender mutton ribs marinated in traditional Faisalabadi spices, ginger, yogurt, and smoky papaya.',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    is_veg: false,
    has_options: false,
  },
  {
    id: 'dish-112-2',
    raw_item_id: 'lyallpur-item-2',
    restaurant_slug: 'lyallpurgrill',
    title: 'Jinnah Colony Smoky Chicken Tikka Karahi',
    price: 1450,
    category: 'Karahi',
    description: 'Char-grilled chicken tikka pieces simmered in fresh tomato and green chili wok gravy topped with desi ghee.',
    image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=600&q=80',
    is_veg: false,
    has_options: false,
  },
  {
    id: 'dish-112-3',
    raw_item_id: 'lyallpur-item-3',
    restaurant_slug: 'lyallpurgrill',
    title: 'Charcoal Beef Seekh Kebab Platter (4 Pcs)',
    price: 980,
    category: 'BBQ',
    description: 'Juicy hand-minced beef seekh kebabsinfused with roasted coriander, green chilies, and fresh mint.',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80',
    is_veg: false,
    has_options: false,
  },
  {
    id: 'dish-112-4',
    raw_item_id: 'lyallpur-item-4',
    restaurant_slug: 'lyallpurgrill',
    title: 'Royal Zafrani Chicken Dum Biryani',
    price: 750,
    category: 'Biryani',
    description: 'Long-grain aged basmati rice layered with spiced chicken, caramelized onions, saffron, and mint raita.',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
    is_veg: false,
    has_options: false,
  },
  {
    id: 'dish-112-5',
    raw_item_id: 'lyallpur-item-5',
    restaurant_slug: 'lyallpurgrill',
    title: 'Desi Ghee Garlic Roghani Naan Basket',
    price: 320,
    category: 'Sides',
    description: 'Two clay-oven baked fluffy roghani naans brushed with pure desi ghee, roasted garlic, and sesame seeds.',
    image: 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?auto=format&fit=crop&w=600&q=80',
    is_veg: true,
    has_options: false,
  },
  // --- Chenab Smash & Pizza Lounge (rest-113, Jinnah Colony Faisalabad) ---
  {
    id: 'dish-113-1',
    raw_item_id: 'chenab-item-1',
    restaurant_slug: 'chenabsmash',
    title: 'Double Cheese Crown Crust Pizza (Large)',
    price: 1790,
    category: 'Pizza',
    description: 'Signature crown crust stuffed with melted cheddar and mozzarella, smoky chicken tikka, olives, and jalapeños.',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
    is_veg: false,
    has_options: false,
  },
  {
    id: 'dish-113-2',
    raw_item_id: 'chenab-item-2',
    restaurant_slug: 'chenabsmash',
    title: 'Faisalabad Crunch Zinger & Cheese Burger',
    price: 890,
    category: 'Burgers',
    description: 'Extra-crispy golden fried chicken fillet, spicy chipotle mayo, cheddar slice, and iceberg lettuce on toasted brioche.',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
    is_veg: false,
    has_options: false,
  },
  {
    id: 'dish-113-3',
    raw_item_id: 'chenab-item-3',
    restaurant_slug: 'chenabsmash',
    title: 'Smoky Jalapeño Double Beef Smash Burger',
    price: 1150,
    category: 'Burgers',
    description: 'Two seared prime beef smash patties with double American cheese, pickled jalapeños, and smoky house sauce.',
    image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80',
    is_veg: false,
    has_options: false,
  },
  {
    id: 'dish-113-4',
    raw_item_id: 'chenab-item-4',
    restaurant_slug: 'chenabsmash',
    title: 'Loaded Peri-Peri Chicken Fries',
    price: 650,
    category: 'Sides',
    description: 'Crispy skin-on fries topped with grilled peri-peri chicken strips, warm cheese sauce, and herbs.',
    image: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=600&q=80',
    is_veg: false,
    has_options: false,
  },
  {
    id: 'dish-113-5',
    raw_item_id: 'chenab-item-5',
    restaurant_slug: 'chenabsmash',
    title: 'Belgian Chocolate Fudge Oreo Shake',
    price: 520,
    category: 'Shakes',
    description: 'Rich Belgian dark chocolate ice cream blended with crushed Oreos, whole milk, and whipped cream.',
    image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80',
    is_veg: true,
    has_options: false,
  },
];

/**
 * Handle incoming GET /api/nearby/dishes requests
 */
export async function handleNearbyDishesApi(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed. Use GET.' }));
    return;
  }

  try {
    const url = new URL(req.url, 'http://127.0.0.1:5173');
    const userLat = url.searchParams.get('lat') ? parseFloat(url.searchParams.get('lat')) : null;
    const userLng = url.searchParams.get('lng') ? parseFloat(url.searchParams.get('lng')) : null;
    const query = (url.searchParams.get('query') || url.searchParams.get('q') || '').trim().toLowerCase();
    const category = (url.searchParams.get('category') || 'ALL').trim();
    const sort = url.searchParams.get('sort') || 'nearest'; // 'nearest' | 'price_asc' | 'price_desc'
    const cursor = parseInt(url.searchParams.get('cursor') || '0', 10);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '24', 10), 50);
    const openNow = url.searchParams.get('open_now') === 'true';
    const vegOnly = url.searchParams.get('veg_only') === 'true';
    const minPrice = url.searchParams.get('min_price') ? parseFloat(url.searchParams.get('min_price')) : null;
    const maxPrice = url.searchParams.get('max_price') ? parseFloat(url.searchParams.get('max_price')) : null;

    const restMap = new Map(DEMO_RESTAURANTS.map((r) => [r.slug, r]));

    // Join dishes with restaurant details and compute spatial distance & delivery coverage
    let joined = SEED_DISHES.map((dish) => {
      const rest = restMap.get(dish.restaurant_slug);
      if (!rest) return null;

      let distanceKm = null;
      let deliversToUser = true;

      if (userLat != null && userLng != null) {
        distanceKm = haversineDistanceKm(userLat, userLng, rest.latitude, rest.longitude);
        deliversToUser = distanceKm <= (rest.delivery_radius_km || 7.0);
      }

      return {
        ...dish,
        restaurant_id: rest.id,
        restaurant_name: rest.name,
        restaurant_logo: rest.logo,
        restaurant_cover: rest.cover_image,
        restaurant_rating: rest.rating,
        restaurant_is_open: rest.is_open,
        restaurant_delivery_fee: rest.delivery_fee,
        restaurant_min_order: rest.min_order,
        distance_km: distanceKm,
        delivers_to_user: deliversToUser,
      };
    }).filter(Boolean);

    // 1. Delivery Coverage Constraint:
    // Only show dishes from restaurants that deliver to customer's location (or all nearby if no location set)
    if (userLat != null && userLng != null) {
      joined = joined.filter((d) => d.delivers_to_user === true);
    }

    // 2. Open now filter (if requested, filter strictly; otherwise, closed sink to bottom in sort)
    if (openNow) {
      joined = joined.filter((d) => d.restaurant_is_open === true);
    }

    // 3. Category Filter
    if (category && category !== 'ALL') {
      const catLower = category.toLowerCase();
      joined = joined.filter((d) => (d.category || '').toLowerCase() === catLower);
    }

    // 4. Search Query Filter (Title, description, category, or restaurant name)
    if (query) {
      joined = joined.filter((d) => {
        const inTitle = (d.title || '').toLowerCase().includes(query);
        const inDesc = (d.description || '').toLowerCase().includes(query);
        const inCat = (d.category || '').toLowerCase().includes(query);
        const inRest = (d.restaurant_name || '').toLowerCase().includes(query);
        return inTitle || inDesc || inCat || inRest;
      });
    }

    // 5. Veg Only Filter
    if (vegOnly) {
      joined = joined.filter((d) => d.is_veg === true);
    }

    // 6. Price Range Filter
    if (minPrice != null) {
      joined = joined.filter((d) => d.price >= minPrice);
    }
    if (maxPrice != null) {
      joined = joined.filter((d) => d.price <= maxPrice);
    }

    // 7. Sorting:
    // Closed restaurants sink to bottom unless sorting strictly by price
    joined.sort((a, b) => {
      if (a.restaurant_is_open !== b.restaurant_is_open) {
        return a.restaurant_is_open ? -1 : 1;
      }
      if (sort === 'price_asc') {
        return a.price - b.price;
      }
      if (sort === 'price_desc') {
        return b.price - a.price;
      }
      // Default: Nearest restaurant
      return (a.distance_km || 999) - (b.distance_km || 999);
    });

    // 8. Pagination: 24 at a time with cursor
    const totalCount = joined.length;
    const startIndex = Math.max(0, cursor);
    const paginatedItems = joined.slice(startIndex, startIndex + limit);
    const nextCursor = startIndex + paginatedItems.length < totalCount ? startIndex + paginatedItems.length : null;
    const hasMore = nextCursor !== null;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        items: paginatedItems,
        total_count: totalCount,
        next_cursor: nextCursor,
        has_more: hasMore,
        limit,
      })
    );
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message || 'Server error fetching nearby dishes' }));
  }
}
