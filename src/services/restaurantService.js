import { supabase } from '../lib/supabaseClient.js';

const STORAGE_KEY = 'foodbypass_demo_data';
const SETTINGS_PREFIX = 'dinehq_rest_settings_';

export function sanitizeMenuData({ categories = [], menuItems = [] }) {
  const capitalize = (str) =>
    str ? str.trim().split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : '';

  const seenNames = new Map();
  const dedupedCategories = [];
  const idRemap = {};

  for (const cat of categories) {
    const formattedName = capitalize(cat.name);
    const key = formattedName.toLowerCase();
    if (!seenNames.has(key)) {
      const canonical = { ...cat, name: formattedName };
      seenNames.set(key, canonical);
      dedupedCategories.push(canonical);
    } else {
      const existing = seenNames.get(key);
      idRemap[cat.id] = existing.id;
    }
  }

  // Find pizza and bbq categories
  const pizzaCat = dedupedCategories.find((c) => c.name.toLowerCase().includes('pizza'));
  let bbqCat = dedupedCategories.find(
    (c) => c.name.toLowerCase().includes('bbq') || c.name.toLowerCase().includes('kebab') || c.name.toLowerCase().includes('kabab')
  );

  const sanitizedItems = menuItems.map((item) => {
    let catId = idRemap[item.category_id] || item.category_id;
    const titleLower = item.title.toLowerCase();

    // Fix behari kabab sitting under pizzas
    if ((titleLower.includes('behari') || titleLower.includes('bihari') || titleLower.includes('kabab')) && pizzaCat && catId === pizzaCat.id) {
      if (!bbqCat) {
        bbqCat = { id: 'cat-bbq-kebabs', name: 'BBQ & Kebabs' };
        dedupedCategories.push(bbqCat);
      }
      catId = bbqCat.id;
    }

    return {
      ...item,
      category_id: catId,
    };
  });

  return { categories: dedupedCategories, menuItems: sanitizedItems };
}

// Initial seeded data for immediate out-of-the-box multi-tenant functionality
export const ALL_SEED_RESTAURANTS = {
  burgersmoke: {
    restaurant: {
      id: 'rest-101',
      name: 'Burger & Smoke Co.',
      slug: 'burgersmoke',
      phone: '923001234567',
      whatsapp_number: '923001234567',
      logo_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=200&h=200&q=80',
      is_open: true,
      delivery_mode: 'paid',
      delivery_fee: 150,
      show_min_order: true,
      min_order_amount: 500,
      show_prep_time: true,
      prep_time: '20–30 mins',
    },
    categories: [
      { id: 'cat-1', name: 'Smash Burgers' },
      { id: 'cat-2', name: 'Sides & Fries' },
      { id: 'cat-3', name: 'Artisan Shakes' },
      { id: 'cat-deals', name: 'Deals & Combos' },
    ],
    menuItems: [
      {
        id: 'item-1',
        category_id: 'cat-1',
        title: 'Truffle Double Smash',
        price: 1190,
        description: 'Double Angus beef patties, Swiss truffle cheese, caramelized onions, garlic truffle aioli on a toasted brioche bun.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
          options: [
            {
              id: 'v-size',
              name: 'Size Option',
              type: 'single',
              required: true,
              options: [
                { id: 'o-reg', name: 'Double Patty (Regular)', price_delta: 0 },
                { id: 'o-triple', name: 'Triple Patty (Mega)', price_delta: 350 },
              ],
            },
            {
              id: 'v-addons',
              name: 'Premium Add-ons',
              type: 'multi',
              required: false,
              options: [
                { id: 'o-bacon', name: 'Smoked Beef Bacon', price_delta: 180 },
                { id: 'o-cheese', name: 'Extra Cheddar Melt', price_delta: 120 },
                { id: 'o-jalapeno', name: 'Pickled Jalapeños', price_delta: 80 },
              ],
            },
          ],
        },
      },
      {
        id: 'item-2',
        category_id: 'cat-1',
        title: 'Crispy Nashville Hot Chicken',
        price: 990,
        description: 'Buttermilk fried chicken breast drenched in Nashville spice oil, comeback slaw, dill pickles on brioche.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=600&q=80',
          options: [
            {
              id: 'v-heat',
              name: 'Heat Level',
              type: 'single',
              required: true,
              options: [
                { id: 'o-mild', name: 'Mild Heat', price_delta: 0 },
                { id: 'o-medium', name: 'Signature Spicy', price_delta: 0 },
                { id: 'o-reaper', name: 'Carolina Reaper Extreme', price_delta: 90 },
              ],
            },
          ],
        },
      },
      {
        id: 'item-3',
        category_id: 'cat-2',
        title: 'Cajun Loaded Fries',
        price: 590,
        description: 'Crisp skin-on rustic fries dusted in Louisiana Cajun seasoning, melted cheddar cheese, and smoky dip.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=600&q=80',
          options: [
            {
              id: 'v-sauce',
              name: 'Dipping Sauce',
              type: 'single',
              required: true,
              options: [
                { id: 'o-garlic', name: 'Garlic Aioli', price_delta: 0 },
                { id: 'o-smokey', name: 'Smoked Chipotle BBQ', price_delta: 0 },
              ],
            },
          ],
        },
      },
      {
        id: 'item-4',
        category_id: 'cat-3',
        title: 'Artisan Vanilla Bean Shake',
        price: 500,
        description: 'Hand-spun Madagascan vanilla bean ice cream with whole milk and whipped cream.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
      {
        id: 'item-5',
        category_id: 'cat-deals',
        title: 'Super Smash Duo Combo',
        price: 2450,
        description: '2x Truffle Double Smash Burgers, 1x Cajun Loaded Fries, and 2x Soft Drinks.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
    ],
  },

  // 1. CRUST & CRAVE PIZZERIA (Artisanal Wood-Fired Pizzas & Italian)
  crust: {
    restaurant: {
      id: 'rest-102',
      name: 'Crust & Crave Pizzeria',
      slug: 'crust',
      phone: '923005551234',
      whatsapp_number: '923005551234',
      logo_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=200&h=200&q=80',
      is_open: true,
      delivery_mode: 'paid',
      delivery_fee: 120,
      show_min_order: true,
      min_order_amount: 600,
      show_prep_time: true,
      prep_time: '25–35 mins',
    },
    categories: [
      { id: 'cat-crust-pizza', name: 'Wood-Fired Pizzas' },
      { id: 'cat-crust-pasta', name: 'Handmade Pastas' },
      { id: 'cat-crust-starters', name: 'Starters & Sides' },
      { id: 'cat-crust-desserts', name: 'Italian Desserts' },
    ],
    menuItems: [
      {
        id: 'crust-item-1',
        category_id: 'cat-crust-pizza',
        title: 'Wood-Fired Truffle Funghi Pizza',
        price: 1650,
        description: 'Wild forest portobello mushrooms, fresh Fior di Latte mozzarella, white truffle oil, and roasted garlic over 48h cold-fermented sourdough crust.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
          options: [
            {
              id: 'v-crust-size',
              name: 'Pizza Size',
              type: 'single',
              required: true,
              options: [
                { id: 'o-med', name: '10 Inch Medium', price_delta: 0 },
                { id: 'o-lrg', name: '14 Inch Large', price_delta: 550 },
              ],
            },
            {
              id: 'v-crust-addons',
              name: 'Add Extras',
              type: 'multi',
              required: false,
              options: [
                { id: 'o-cheese', name: 'Extra Buffalo Mozzarella', price_delta: 150 },
                { id: 'o-olives', name: 'Kalamata Olives', price_delta: 90 },
              ],
            },
          ],
        },
      },
      {
        id: 'crust-item-2',
        category_id: 'cat-crust-pizza',
        title: 'Smoked Pepperoni & Hot Honey Pizza',
        price: 1790,
        description: 'Crispy beef pepperoni cups, San Marzano tomato pomodoro, torn basil, finished with a generous drizzle of house spicy red chili hot honey.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=600&q=80',
          options: [
            {
              id: 'v-pep-size',
              name: 'Pizza Size',
              type: 'single',
              required: true,
              options: [
                { id: 'o-med', name: '10 Inch Medium', price_delta: 0 },
                { id: 'o-lrg', name: '14 Inch Large', price_delta: 590 },
              ],
            },
            {
              id: 'v-pep-crust',
              name: 'Crust Style',
              type: 'single',
              required: false,
              options: [
                { id: 'o-classic', name: 'Classic Neapolitan', price_delta: 0 },
                { id: 'o-stuffed', name: 'Cheese-Stuffed Crust', price_delta: 250 },
              ],
            },
          ],
        },
      },
      {
        id: 'crust-item-3',
        category_id: 'cat-crust-pasta',
        title: 'Creamy Fettuccine Alfredo with Charred Chicken',
        price: 1350,
        description: 'Fresh egg fettuccine ribbons tossed in 24-month aged Reggiano parmesan cream reduction, topped with rosemary grilled chicken breast.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=600&q=80',
          options: [
            {
              id: 'v-pasta-extra',
              name: 'Extras',
              type: 'multi',
              required: false,
              options: [
                { id: 'o-parm', name: 'Extra Shaved Parmesan', price_delta: 120 },
                { id: 'o-mush', name: 'Sautéed Garlic Mushrooms', price_delta: 140 },
              ],
            },
          ],
        },
      },
      {
        id: 'crust-item-4',
        category_id: 'cat-crust-starters',
        title: 'Stuffed Cheesy Garlic Dough Knots',
        price: 690,
        description: 'Six hand-tied sourdough knots smothered in garlic butter, fresh parsley, stuffed with melted mozzarella, served with warm San Marzano marinara dip.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
      {
        id: 'crust-item-5',
        category_id: 'cat-crust-desserts',
        title: 'Traditional Classic Tiramisu Della Nonna',
        price: 750,
        description: 'Authentic Savoiardi ladyfingers steeped in rich dark espresso, layered with airy mascarpone zabaglione and dusted with Valrhona cocoa.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
    ],
  },

  // 2. KHYBER SHINWARI & KARAHI DERA (Traditional Desi Shinwari & Charcoal BBQ)
  shinwari: {
    restaurant: {
      id: 'rest-103',
      name: 'Khyber Shinwari & Karahi Dera',
      slug: 'shinwari',
      phone: '923019887766',
      whatsapp_number: '923019887766',
      logo_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=200&h=200&q=80',
      is_open: true,
      delivery_mode: 'paid',
      delivery_fee: 180,
      show_min_order: true,
      min_order_amount: 1000,
      show_prep_time: true,
      prep_time: '35–45 mins',
    },
    categories: [
      { id: 'cat-shinwari-karahi', name: 'Shinwari Karahi' },
      { id: 'cat-shinwari-bbq', name: 'Charcoal Sigri BBQ' },
      { id: 'cat-shinwari-breads', name: 'Tandoori Breads' },
    ],
    menuItems: [
      {
        id: 'shinwari-item-1',
        category_id: 'cat-shinwari-karahi',
        title: 'Desi Mutton Shinwari Karahi',
        price: 2450,
        description: 'Tender mountain mutton cooked in natural lamb fat with only vine-ripened tomatoes, salt, green chilies, and ginger slivers. Authentic tribal recipe.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
          options: [
            {
              id: 'v-mutton-weight',
              name: 'Portion Size',
              type: 'single',
              required: true,
              options: [
                { id: 'o-half', name: 'Half KG (Serves 2)', price_delta: 0 },
                { id: 'o-full', name: 'Full 1 KG (Serves 4)', price_delta: 2200 },
              ],
            },
          ],
        },
      },
      {
        id: 'shinwari-item-2',
        category_id: 'cat-shinwari-karahi',
        title: 'Chicken White Makhni Handi',
        price: 1590,
        description: 'Boneless tender chicken cubes braised in thick clotted dairy cream, butter, black pepper, and ground cashews in a clay handi.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=600&q=80',
          options: [
            {
              id: 'v-spice',
              name: 'Spice Level',
              type: 'single',
              required: true,
              options: [
                { id: 'o-mild', name: 'Mild & Creamy', price_delta: 0 },
                { id: 'o-med', name: 'Medium Desi Heat', price_delta: 0 },
              ],
            },
          ],
        },
      },
      {
        id: 'shinwari-item-3',
        category_id: 'cat-shinwari-bbq',
        title: 'Peshawari Chapli Kebab Platter (2 Pcs)',
        price: 1150,
        description: 'Authentic handmade beef chapli kebabs spiced with anardana, coriander seeds, crushed red pepper, and fried tomato slices.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80',
          options: [
            {
              id: 'v-egg',
              name: 'Add-on',
              type: 'single',
              required: false,
              options: [
                { id: 'o-none', name: 'Standard Style', price_delta: 0 },
                { id: 'o-fried-egg', name: 'Topped with Fried Egg', price_delta: 90 },
              ],
            },
          ],
        },
      },
      {
        id: 'shinwari-item-4',
        category_id: 'cat-shinwari-bbq',
        title: 'Charcoal Malai Boti Skewers (8 Pcs)',
        price: 1090,
        description: 'Boneless chicken cubes soaked in fresh malai, green chilies, and white pepper, char-grilled over glowing coals until juicy and smoky.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
      {
        id: 'shinwari-item-5',
        category_id: 'cat-shinwari-breads',
        title: 'Sesame Roghani Naan Basket (3 Pcs)',
        price: 360,
        description: 'Three warm tandoor-fired soft roghani naans brushed generously with pure desi ghee and toasted white sesame seeds.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
    ],
  },

  // 3. GREEN OASIS CAFE & BOWLS (Healthy Salad Bowls, Acai & Specialty Brews)
  greenoasis: {
    restaurant: {
      id: 'rest-104',
      name: 'Green Oasis Cafe & Bowls',
      slug: 'greenoasis',
      phone: '923331112233',
      whatsapp_number: '923331112233',
      logo_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=200&h=200&q=80',
      is_open: true,
      delivery_mode: 'paid',
      delivery_fee: 100,
      show_min_order: true,
      min_order_amount: 400,
      show_prep_time: true,
      prep_time: '15–25 mins',
    },
    categories: [
      { id: 'cat-oasis-bowls', name: 'Nourish Bowls' },
      { id: 'cat-oasis-acai', name: 'Acai & Smoothies' },
      { id: 'cat-oasis-sandwiches', name: 'Artisan Sandwiches' },
      { id: 'cat-oasis-coffee', name: 'Specialty Coffee' },
    ],
    menuItems: [
      {
        id: 'oasis-item-1',
        category_id: 'cat-oasis-bowls',
        title: 'Citrus Quinoa & Grilled Salmon Bowl',
        price: 1690,
        description: 'Pan-seared Atlantic salmon fillet over organic tri-color quinoa, Hass avocado, edamame beans, and roasted sesame-ginger vinaigrette.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
          options: [
            {
              id: 'v-avocado',
              name: 'Extra Protein / Toppings',
              type: 'multi',
              required: false,
              options: [
                { id: 'o-avo', name: 'Extra Sliced Avocado', price_delta: 200 },
                { id: 'o-egg', name: 'Soft Boiled Organic Egg', price_delta: 80 },
              ],
            },
          ],
        },
      },
      {
        id: 'oasis-item-2',
        category_id: 'cat-oasis-acai',
        title: 'Amazonian Wild Acai Energy Bowl',
        price: 1150,
        description: 'Pure organic Brazilian acai purée blended with frozen wild berries and banana, topped with almond butter drizzle, chia seeds, and artisan granola.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80',
          options: [
            {
              id: 'v-protein',
              name: 'Protein Boost',
              type: 'single',
              required: false,
              options: [
                { id: 'o-none', name: 'Standard Bowl', price_delta: 0 },
                { id: 'o-whey', name: 'Vanilla Whey Protein Scoop', price_delta: 250 },
              ],
            },
          ],
        },
      },
      {
        id: 'oasis-item-3',
        category_id: 'cat-oasis-sandwiches',
        title: 'Smoked Turkey Breast & Brie Panini',
        price: 1290,
        description: 'Shaved hickory-smoked turkey breast, melted double-cream French brie, sweet fig jam, and wild baby arugula pressed crispy in rustic sourdough.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
      {
        id: 'oasis-item-4',
        category_id: 'cat-oasis-bowls',
        title: 'Mediterranean Herb Falafel & Beet Hummus Bowl',
        price: 990,
        description: 'Crispy herb chickpea falafels over vibrant roasted beetroot hummus, pickled red onions, Kalamata olives, cherry tomatoes, with warm zaatar pita.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
      {
        id: 'oasis-item-5',
        category_id: 'cat-oasis-coffee',
        title: 'Vanilla Iced Spanish Latte (Double Shot)',
        price: 620,
        description: 'Double shot of 100% Arabica single-origin espresso poured over condensed sweet milk, fresh whole milk, and crushed crystal ice.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80',
          options: [
            {
              id: 'v-milk',
              name: 'Milk Choice',
              type: 'single',
              required: true,
              options: [
                { id: 'o-dairy', name: 'Dairy Whole Milk', price_delta: 0 },
                { id: 'o-oat', name: 'Barista Oat Milk', price_delta: 140 },
                { id: 'o-almond', name: 'Almond Milk', price_delta: 140 },
              ],
            },
          ],
        },
      },
    ],
  },

  // 5. TOKYO SUSHI & RAMEN BAR
  tokyosushi: {
    restaurant: {
      id: 'rest-105',
      name: 'Tokyo Sushi & Ramen Bar',
      slug: 'tokyosushi',
      phone: '923004445566',
      whatsapp_number: '923004445566',
      logo_url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=200&h=200&q=80',
      is_open: true,
      delivery_mode: 'paid',
      delivery_fee: 140,
      show_min_order: true,
      min_order_amount: 800,
      show_prep_time: true,
      prep_time: '25–35 mins',
    },
    categories: [
      { id: 'cat-sushi-rolls', name: 'Sushi Rolls & Sashimi' },
      { id: 'cat-sushi-ramen', name: 'Artisan Ramen' },
      { id: 'cat-sushi-appetizers', name: 'Japanese Appetizers' },
    ],
    menuItems: [
      {
        id: 'tokyo-item-1',
        category_id: 'cat-sushi-rolls',
        title: 'Spicy Salmon Crunch Roll (8 Pcs)',
        price: 1550,
        description: 'Fresh Norwegian salmon, cucumber, sriracha aioli, rolled in toasted nori, topped with tempura flakes and unagi glaze.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
      {
        id: 'tokyo-item-2',
        category_id: 'cat-sushi-ramen',
        title: 'Rich Tonkotsu Chashu Ramen',
        price: 1490,
        description: '16-hour slow-simmered rich savory broth, hand-pulled ramen noodles, tender torched chashu, ajitsuke tamago egg, and nori.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
      {
        id: 'tokyo-item-3',
        category_id: 'cat-sushi-appetizers',
        title: 'Golden Crispy Prawn Tempura (5 Pcs)',
        price: 990,
        description: 'Jumbo tiger prawns coated in airy Japanese panko batter, fried golden, served with house tentsuyu dipping broth.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
      {
        id: 'tokyo-item-4',
        category_id: 'cat-sushi-appetizers',
        title: 'Pan-Seared Chicken Gyoza Dumplings (6 Pcs)',
        price: 680,
        description: 'Crispy-bottom steamed dumplings filled with seasoned minced chicken, scallions, ginger, and sesame ponzu glaze.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
      {
        id: 'tokyo-item-5',
        category_id: 'cat-sushi-rolls',
        title: 'California Deluxe King Crab Roll',
        price: 1390,
        description: 'King crab blend, Hass avocado, Japanese mayo, and crisp cucumber coated with bright orange tobiko caviar.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
    ],
  },

  // 6. ROYAL TAJ DESI CONTINENTAL
  royaltaj: {
    restaurant: {
      id: 'rest-106',
      name: 'Royal Taj Desi Continental',
      slug: 'royaltaj',
      phone: '923007778899',
      whatsapp_number: '923007778899',
      logo_url: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=200&h=200&q=80',
      is_open: true,
      delivery_mode: 'paid',
      delivery_fee: 160,
      show_min_order: true,
      min_order_amount: 800,
      show_prep_time: true,
      prep_time: '30–40 mins',
    },
    categories: [
      { id: 'cat-taj-handi', name: 'Royal Handi & Curries' },
      { id: 'cat-taj-rice', name: 'Biryani & Rice' },
      { id: 'cat-taj-tandoor', name: 'Fresh Tandoori Breads' },
    ],
    menuItems: [
      {
        id: 'taj-item-1',
        category_id: 'cat-taj-handi',
        title: 'Shahi Chicken Makhni Handi',
        price: 1390,
        description: 'Boneless tender chicken simmered in clay handi with rich cashew nut gravy, fresh cream, butter, and fenugreek leaves.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
      {
        id: 'taj-item-2',
        category_id: 'cat-taj-rice',
        title: 'Dum Pukht Chicken Biryani (Special)',
        price: 850,
        description: 'Aromatic long-grain basmati rice layered with saffron chicken pieces, golden fried onions, prunes, and mint leaves.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
      {
        id: 'taj-item-3',
        category_id: 'cat-taj-handi',
        title: 'Dal Makhni Shahi Slow-Cooked',
        price: 690,
        description: 'Black lentils slow cooked overnight on charcoal with butter, cream, and fragrant Kashmiri spices.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
      {
        id: 'taj-item-4',
        category_id: 'cat-taj-tandoor',
        title: 'Garlic Butter Roghani Naan',
        price: 180,
        description: 'Fluffy clay oven baked naan brushed with melted country butter, minced roasted garlic, and toasted sesame seeds.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
      {
        id: 'taj-item-5',
        category_id: 'cat-taj-handi',
        title: 'Shahi Zafrani Kheer Matka',
        price: 380,
        description: 'Traditional slow-reduced milk rice pudding scented with saffron, cardamom, crushed pistachios, and almonds.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
    ],
  },

  // 7. FIESTA MEXICANA GRILL & TACOS
  fiestamex: {
    restaurant: {
      id: 'rest-107',
      name: 'Fiesta Mexicana Grill & Tacos',
      slug: 'fiestamex',
      phone: '923008889900',
      whatsapp_number: '923008889900',
      logo_url: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=200&h=200&q=80',
      is_open: true,
      delivery_mode: 'paid',
      delivery_fee: 130,
      show_min_order: true,
      min_order_amount: 600,
      show_prep_time: true,
      prep_time: '20–30 mins',
    },
    categories: [
      { id: 'cat-mex-tacos', name: 'Street Tacos & Birria' },
      { id: 'cat-mex-quesadillas', name: 'Quesadillas & Burritos' },
      { id: 'cat-mex-sides', name: 'Nachos & Sides' },
    ],
    menuItems: [
      {
        id: 'mex-item-1',
        category_id: 'cat-mex-tacos',
        title: 'Slow-Cooked Birria Beef Tacos (3 Pcs)',
        price: 1250,
        description: 'Tender shredded spiced beef in crispy griddled corn tortillas with melted Oaxaca cheese, cilantro, and rich savory dipping consommé.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
      {
        id: 'mex-item-2',
        category_id: 'cat-mex-quesadillas',
        title: 'Chipotle Chicken Fajita Quesadilla',
        price: 990,
        description: 'Large toasted flour tortilla packed with grilled chipotle chicken, sautéed peppers, caramelized onions, and Monterey Jack cheese.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1618040996337-56904b7850b9?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
      {
        id: 'mex-item-3',
        category_id: 'cat-mex-sides',
        title: 'Loaded Fiesta Nachos Supreme',
        price: 850,
        description: 'Crisp hand-cut tortilla chips piled high with warm queso, black beans, pico de gallo, pickled jalapeños, and sour cream.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
      {
        id: 'mex-item-4',
        category_id: 'cat-mex-quesadillas',
        title: 'Cali Carne Asada Burrito Grande',
        price: 1190,
        description: 'Grilled flank steak, seasoned rustic fries, house guacamole, cheddar cheese, and salsa verde wrapped in a warm 12-inch tortilla.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
      {
        id: 'mex-item-5',
        category_id: 'cat-mex-sides',
        title: 'Cinnamon Sugar Churros with Chocolate Dip',
        price: 590,
        description: 'Four crispy Spanish churros rolled in Saigon cinnamon sugar, served with warm Belgian dark chocolate dipping sauce.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1624300629298-e9de39c13be5?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
    ],
  },

  // 8. SWEET RETREAT DESSERTS & GELATO
  sweetretreat: {
    restaurant: {
      id: 'rest-108',
      name: 'Sweet Retreat Desserts & Gelato',
      slug: 'sweetretreat',
      phone: '923001119988',
      whatsapp_number: '923001119988',
      logo_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=200&h=200&q=80',
      is_open: true,
      delivery_mode: 'paid',
      delivery_fee: 110,
      show_min_order: true,
      min_order_amount: 450,
      show_prep_time: true,
      prep_time: '15–25 mins',
    },
    categories: [
      { id: 'cat-sweet-waffles', name: 'Waffles & Crepes' },
      { id: 'cat-sweet-cakes', name: 'Cakes & Cheesecakes' },
      { id: 'cat-sweet-gelato', name: 'Artisanal Gelato' },
    ],
    menuItems: [
      {
        id: 'sweet-item-1',
        category_id: 'cat-sweet-waffles',
        title: 'Belgian Dark Chocolate & Strawberry Waffle',
        price: 890,
        description: 'Golden Belgian waffle smothered in melted Belgian milk and dark chocolate, fresh seasonal strawberries, and vanilla gelato scoop.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
      {
        id: 'sweet-item-2',
        category_id: 'cat-sweet-cakes',
        title: 'San Sebastian Burnt Basque Cheesecake',
        price: 790,
        description: 'Velvety caramelized Basque cheesecake with a gooey creamy center, paired with warm poured Belgian milk chocolate.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
      {
        id: 'sweet-item-3',
        category_id: 'cat-sweet-gelato',
        title: 'Sicilian Pistachio Artisanal Gelato (Double Scoop)',
        price: 580,
        description: 'Authentic slow-churned Italian gelato crafted with 100% roasted Sicilian Bronte pistachios and whole dairy cream.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
      {
        id: 'sweet-item-4',
        category_id: 'cat-sweet-waffles',
        title: 'Lotus Biscoff Crumble French Crepe',
        price: 820,
        description: 'Warm delicate crepe filled and topped with warm Lotus Biscoff spread, crushed spiced caramelized biscuits, and cream.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
      {
        id: 'sweet-item-5',
        category_id: 'cat-sweet-cakes',
        title: 'Molten Belgian Fudge Lava Cake',
        price: 720,
        description: 'Decadent warm chocolate cake with a molten flowing dark fudge core, dusted with powdered sugar.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
    ],
  },

  // 9. CHAI JUNCTION & TRADITIONAL DHABA
  chaijunction: {
    restaurant: {
      id: 'rest-109',
      name: 'Chai Junction & Traditional Dhaba',
      slug: 'chaijunction',
      phone: '923002223344',
      whatsapp_number: '923002223344',
      logo_url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=200&h=200&q=80',
      is_open: true,
      delivery_mode: 'paid',
      delivery_fee: 90,
      show_min_order: true,
      min_order_amount: 300,
      show_prep_time: true,
      prep_time: '15–20 mins',
    },
    categories: [
      { id: 'cat-chai-specials', name: 'Specialty Teas & Chai' },
      { id: 'cat-chai-parathas', name: 'Crispy Stuffed Parathas' },
      { id: 'cat-chai-snacks', name: 'Evening Dhaba Snacks' },
    ],
    menuItems: [
      {
        id: 'chai-item-1',
        category_id: 'cat-chai-specials',
        title: 'Signature Karak Matka Chai',
        price: 220,
        description: 'Brewed strong in clay pot over coal, boiled with whole buffalo milk, green cardamom, and caramelized unrefined jaggery.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
      {
        id: 'chai-item-2',
        category_id: 'cat-chai-parathas',
        title: 'Chicken Malai Boti Cheese Paratha',
        price: 590,
        description: 'Crisp flaky multi-layered paratha stuffed with tender charred chicken malai boti chunks and melted stretchy mozzarella cheese.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
      {
        id: 'chai-item-3',
        category_id: 'cat-chai-snacks',
        title: 'Classic Karachi Daal Anda Bun Kabab',
        price: 290,
        description: 'Toasted soft bun with spiced lentil patty dipped in whipped egg foam, spicy green chutney, onions, and sweet tamarind dip.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
      {
        id: 'chai-item-4',
        category_id: 'cat-chai-parathas',
        title: 'Nutella Stuffed Sweet Crispy Paratha',
        price: 490,
        description: 'Golden crispy flaky paratha oozing with warm melted Nutella hazelnut chocolate inside and powdered sugar dusting.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
      {
        id: 'chai-item-5',
        category_id: 'cat-chai-specials',
        title: 'Elaichi Doodh Patti Chai (Thermos Serve)',
        price: 180,
        description: 'Aromatic tea leaves slow-cooked strictly in pure whole milk with crushed green cardamom pods.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
    ],
  },

  // 10. STONEOVE
  stoneove: {
    restaurant: {
      id: 'rest-110',
      name: 'stoneove',
      slug: 'stoneove',
      phone: '923001111111',
      whatsapp_number: '923001111111',
      logo_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=200&h=200&q=80',
      is_open: true,
      delivery_mode: 'paid',
      delivery_fee: 120,
      show_min_order: true,
      min_order_amount: 600,
      show_prep_time: true,
      prep_time: '25–35 mins',
    },
    categories: [
      { id: 'cat-stone-pizza', name: 'Stone-Oven Pizzas' },
      { id: 'cat-stone-appetizers', name: 'Appetizers & Wings' },
      { id: 'cat-stone-dessert', name: 'Sweets & Bakes' },
    ],
    menuItems: [
      {
        id: 'stone-item-1',
        category_id: 'cat-stone-pizza',
        title: 'Smokehouse BBQ Chicken Pizza',
        price: 1390,
        description: 'Stone-baked thin crust, smoked chicken chunks, sweet hickory BBQ swirl, red onions, and melted fresh mozzarella.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
      {
        id: 'stone-item-2',
        category_id: 'cat-stone-pizza',
        title: 'Four Cheese Truffle White Pizza',
        price: 1550,
        description: 'White garlic cream base, fresh mozzarella, gorgonzola, aged parmesan, ricotta dollops, and Italian white truffle oil.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
      {
        id: 'stone-item-3',
        category_id: 'cat-stone-appetizers',
        title: 'Crispy Buffalo Wings with Blue Cheese',
        price: 790,
        description: 'Eight jumbo crispy fried wings tossed in tangy cayenne pepper buffalo sauce, served with celery and creamy blue cheese dip.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
      {
        id: 'stone-item-4',
        category_id: 'cat-stone-pizza',
        title: 'Stuffed Pepperoni Calzone Supreme',
        price: 980,
        description: 'Folded pizza pocket stuffed with Italian pepperoni, ricotta, mozzarella, and herbs, baked in brick oven.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
      {
        id: 'stone-item-5',
        category_id: 'cat-stone-dessert',
        title: 'Warm Skillet Chocolate Cookie Pie',
        price: 650,
        description: 'Freshly baked warm chocolate chip cookie served in a cast-iron skillet, topped with cold Madagascar vanilla ice cream.',
        variants: {
          is_available: true,
          image_url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=600&q=80',
          options: [],
        },
      },
    ],
  },
};

const initialSeedData = ALL_SEED_RESTAURANTS.burgersmoke;

const isSupabaseConfigured = () => {
  return Boolean(
    typeof import.meta !== 'undefined' &&
    import.meta.env?.VITE_SUPABASE_URL && 
    import.meta.env?.VITE_SUPABASE_ANON_KEY &&
    !import.meta.env.VITE_SUPABASE_URL.includes('your-project-ref')
  );
};

export const restaurantService = {
  isConfigured: isSupabaseConfigured,

  /**
   * Fetch all restaurants (for master admin and restaurant switcher)
   */
  async getAllRestaurants() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select('id, name, slug, whatsapp_number, owner_id')
          .order('name');
        if (!error && data && data.length > 0) {
          return data.map((r) => this.mergeExtendedSettings(r));
        }
      } catch (e) {
        console.warn('Error fetching all restaurants from Supabase:', e);
      }
    }

    // Default multi-tenant restaurants
    const baseList = Object.values(ALL_SEED_RESTAURANTS).map((r) => this.mergeExtendedSettings(r.restaurant));

    // Fallback: check localStorage registered users list
    try {
      const storedUsers = localStorage.getItem('dinehq_registered_users');
      if (storedUsers) {
        const parsed = JSON.parse(storedUsers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const list = parsed.map((u) => ({
            id: u.restaurant_id || `rest-${u.restaurant_slug}`,
            name: u.restaurant_name,
            slug: u.restaurant_slug,
            phone: u.phone || u.whatsapp_number || '923001234567',
            whatsapp_number: u.phone || u.whatsapp_number || '923001234567',
            owner_id: u.id,
          }));
          const existingSlugs = new Set(baseList.map((r) => r.slug));
          return [...baseList, ...list.filter((r) => !existingSlugs.has(r.slug))];
        }
      }
    } catch (e) {}

    return baseList;
  },

  /**
   * Helper to merge extended settings (is_open, delivery_mode, delivery_fee, show_min_order, min_order_amount, show_prep_time, prep_time)
   */
  mergeExtendedSettings(restaurant) {
    if (!restaurant) return restaurant;
    const phone = restaurant.phone || restaurant.whatsapp_number || '923001234567';
    const key = `${SETTINGS_PREFIX}${restaurant.id}`;
    let extended = {
      is_open: true,
      delivery_mode: 'paid', // 'paid' | 'free' | 'none'
      delivery_fee: 150,
      show_min_order: true,
      min_order_amount: 500,
      show_prep_time: true,
      prep_time: '20–30 mins',
      logo_url: restaurant.logo_url || null,
    };
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        extended = { ...extended, ...JSON.parse(saved) };
      }
    } catch (e) {}
    return {
      ...extended,
      ...restaurant,
      phone,
      whatsapp_number: phone,
    };
  },

  /**
   * Load state for a specific restaurant by restaurantId, slug, or ownerId
   */
  async getInitialState(filter = {}) {
    const { restaurantId, slug, ownerId } = filter;

    if (isSupabaseConfigured()) {
      try {
        let restaurantQuery = supabase.from('restaurants').select('*');

        if (restaurantId) {
          restaurantQuery = restaurantQuery.eq('id', restaurantId);
        } else if (slug) {
          restaurantQuery = restaurantQuery.eq('slug', slug);
        } else if (ownerId) {
          restaurantQuery = restaurantQuery.eq('owner_id', ownerId);
        }

        const { data: restaurants, error: restError } = await restaurantQuery.limit(1);

        if (restError) throw restError;

        if (restaurants && restaurants.length > 0) {
          const restaurant = this.mergeExtendedSettings(restaurants[0]);
          const [catRes, itemRes] = await Promise.all([
            supabase.from('categories').select('*').eq('restaurant_id', restaurant.id).order('created_at'),
            supabase.from('menu_items').select('*').eq('restaurant_id', restaurant.id).order('created_at'),
          ]);

          return {
            restaurant,
            categories: catRes.data || [],
            menuItems: itemRes.data || [],
            isLive: true,
          };
        }
      } catch (err) {
        console.warn('Supabase fetch failed, falling back to local sandbox:', err.message);
      }
    }

    // Determine target seed data from ALL_SEED_RESTAURANTS
    let targetSeed = ALL_SEED_RESTAURANTS.burgersmoke;
    if (slug && ALL_SEED_RESTAURANTS[slug]) {
      targetSeed = ALL_SEED_RESTAURANTS[slug];
    } else if (restaurantId) {
      const found = Object.values(ALL_SEED_RESTAURANTS).find((r) => r.restaurant.id === restaurantId);
      if (found) targetSeed = found;
    }

    // Local Sandbox persistence (keyed by restaurantId or slug if provided)
    const specificKey = slug ? `${STORAGE_KEY}_${slug}` : (restaurantId ? `${STORAGE_KEY}_${restaurantId}` : STORAGE_KEY);
    const saved = localStorage.getItem(specificKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const sanitized = sanitizeMenuData({
          categories: parsed.categories || [],
          menuItems: parsed.menuItems || [],
        });
        return {
          ...parsed,
          categories: sanitized.categories,
          menuItems: sanitized.menuItems,
          restaurant: this.mergeExtendedSettings(parsed.restaurant),
          isLive: false,
        };
      } catch (e) {}
    }

    const sanitizedSeed = sanitizeMenuData({
      categories: targetSeed.categories,
      menuItems: targetSeed.menuItems,
    });
    return {
      ...targetSeed,
      categories: sanitizedSeed.categories,
      menuItems: sanitizedSeed.menuItems,
      restaurant: this.mergeExtendedSettings(targetSeed.restaurant),
      isLive: false,
    };
  },

  async saveLocalState(state) {
    const slug = state?.restaurant?.slug;
    if (slug) {
      localStorage.setItem(`${STORAGE_KEY}_${slug}`, JSON.stringify(state));
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },

  /**
   * 1. Update Restaurant Settings (Phone number, slug, name, is_open, delivery_mode, delivery_fee, min_order_amount, prep_time)
   */
  async updateRestaurant(restaurantId, updates) {
    // 1. Separate base columns for Supabase
    const baseColumns = {};
    if (updates.name !== undefined) baseColumns.name = updates.name;
    if (updates.slug !== undefined) baseColumns.slug = updates.slug;
    const phoneVal = updates.phone !== undefined ? updates.phone : updates.whatsapp_number;
    if (phoneVal !== undefined) {
      baseColumns.phone = phoneVal;
      baseColumns.whatsapp_number = phoneVal; // backward compatibility write
    }
    if (updates.logo_url !== undefined) baseColumns.logo_url = updates.logo_url;

    // 2. Persist extended settings to localStorage
    const extendedKey = `${SETTINGS_PREFIX}${restaurantId}`;
    try {
      const existingSettings = JSON.parse(localStorage.getItem(extendedKey) || '{}');
      const updatedSettings = {
        ...existingSettings,
        ...(updates.logo_url !== undefined ? { logo_url: updates.logo_url } : {}),
        ...(updates.is_open !== undefined ? { is_open: updates.is_open } : {}),
        ...(updates.delivery_mode !== undefined ? { delivery_mode: updates.delivery_mode } : {}),
        ...(updates.delivery_fee !== undefined ? { delivery_fee: Number(updates.delivery_fee) } : {}),
        ...(updates.show_min_order !== undefined ? { show_min_order: Boolean(updates.show_min_order) } : {}),
        ...(updates.min_order_amount !== undefined ? { min_order_amount: Number(updates.min_order_amount) } : {}),
        ...(updates.show_prep_time !== undefined ? { show_prep_time: Boolean(updates.show_prep_time) } : {}),
        ...(updates.prep_time !== undefined ? { prep_time: updates.prep_time } : {}),
      };
      localStorage.setItem(extendedKey, JSON.stringify(updatedSettings));
    } catch (e) {
      console.warn('Failed to save extended restaurant settings:', e);
    }

    if (isSupabaseConfigured() && Object.keys(baseColumns).length > 0) {
      const { data, error } = await supabase
        .from('restaurants')
        .update(baseColumns)
        .eq('id', restaurantId)
        .select()
        .single();

      if (!error && data) {
        return this.mergeExtendedSettings(data);
      }
    }

    return this.mergeExtendedSettings({ id: restaurantId, ...updates });
  },

  /**
   * 2. Categories
   */
  async createCategory(restaurantId, name) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ restaurant_id: restaurantId, name }])
        .select()
        .single();

      if (error) throw error;
      return data;
    }
    return { id: `cat-${Date.now()}`, restaurant_id: restaurantId, name };
  },

  async updateCategory(categoryId, name) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('categories')
        .update({ name })
        .eq('id', categoryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
    return { id: categoryId, name };
  },

  async deleteCategory(categoryId) {
    if (isSupabaseConfigured()) {
      try {
        // Cascade delete items in this category first to avoid foreign key violations
        await supabase.from('menu_items').delete().eq('category_id', categoryId);
      } catch (e) {
        console.warn('Notice on cascade delete menu items:', e);
      }
      const { error } = await supabase.from('categories').delete().eq('id', categoryId);
      if (error) throw error;
      return true;
    }
    return true;
  },

  /**
   * 3. Menu Items
   */
  async createMenuItem(itemData) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('menu_items')
        .insert([
          {
            restaurant_id: itemData.restaurant_id,
            category_id: itemData.category_id,
            title: itemData.title,
            price: parseFloat(itemData.price),
            variants: itemData.variants || {},
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    }
    return {
      id: `item-${Date.now()}`,
      ...itemData,
      price: parseFloat(itemData.price),
    };
  },

  async updateMenuItem(itemId, updates) {
    if (isSupabaseConfigured()) {
      const payload = {};
      if (updates.category_id) payload.category_id = updates.category_id;
      if (updates.title) payload.title = updates.title;
      if (updates.price !== undefined) payload.price = parseFloat(updates.price);
      if (updates.variants !== undefined) payload.variants = updates.variants;

      const { data, error } = await supabase
        .from('menu_items')
        .update(payload)
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
    return { id: itemId, ...updates, price: parseFloat(updates.price) };
  },

  async deleteMenuItem(itemId) {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('menu_items').delete().eq('id', itemId);
      if (error) throw error;
      return true;
    }
    return true;
  },
};
