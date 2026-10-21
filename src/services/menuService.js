import { supabase } from '../lib/supabaseClient.js';
import { restaurantService } from './restaurantService.js';

const STORAGE_KEY = 'foodbypass_demo_data';

export const menuService = {
  /**
   * Fetch restaurant and full menu tree by tenant slug
   */
  async getMenuBySlug(slug) {
    const isConfigured = Boolean(
      typeof import.meta !== 'undefined' &&
      import.meta.env?.VITE_SUPABASE_URL &&
      import.meta.env?.VITE_SUPABASE_ANON_KEY &&
      !import.meta.env?.VITE_SUPABASE_URL.includes('your-project-ref')
    );

    if (isConfigured) {
      try {
        // 1. Fetch restaurant by slug (Public RLS SELECT policy allows this)
        const { data: restaurantData, error: restError } = await supabase
          .from('restaurants')
          .select('*')
          .eq('slug', slug)
          .single();

        if (restError) throw restError;
        if (!restaurantData) throw new Error('Restaurant not found');

        const restaurant = restaurantService.mergeExtendedSettings(restaurantData);

        // 2. Fetch categories & menu items in parallel
        const [categoriesRes, itemsRes] = await Promise.all([
          supabase
            .from('categories')
            .select('id, name')
            .eq('restaurant_id', restaurant.id)
            .order('name', { ascending: true }),
          supabase
            .from('menu_items')
            .select('id, category_id, title, price, variants')
            .eq('restaurant_id', restaurant.id)
            .order('title', { ascending: true }),
        ]);

        if (categoriesRes.error) throw categoriesRes.error;
        if (itemsRes.error) throw itemsRes.error;

        return {
          restaurant,
          categories: categoriesRes.data || [],
          menuItems: itemsRes.data || [],
          isLive: true,
        };
      } catch (err) {
        console.warn('Supabase fetch by slug failed, checking local state:', err.message);
      }
    }

    // Fallback to local sandbox data (from localStorage or seed)
    const specificKey = `${STORAGE_KEY}_${slug}`;
    const saved = localStorage.getItem(specificKey) || localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const localData = JSON.parse(saved);
        if (localData.restaurant) {
          return {
            restaurant: restaurantService.mergeExtendedSettings(localData.restaurant),
            categories: localData.categories || [],
            menuItems: localData.menuItems || [],
            isLive: false,
          };
        }
      } catch (e) {
        console.error('Failed to parse local storage data', e);
      }
    }

    // Default seeded fallback tenant
    return {
      restaurant: restaurantService.mergeExtendedSettings({
        id: 'rest-101',
        name: 'Burger & Smoke Co.',
        slug: slug || 'burgersmoke',
        phone: '923001234567',
        whatsapp_number: '923001234567',
        is_open: true,
        delivery_mode: 'paid',
        delivery_fee: 150,
        show_min_order: true,
        min_order_amount: 500,
        show_prep_time: true,
        prep_time: '20–30 mins',
      }),
      categories: [
        { id: 'cat-1', name: 'Smash Burgers' },
        { id: 'cat-2', name: 'Sides & Fries' },
        { id: 'cat-3', name: 'Artisan Shakes' },
      ],
      menuItems: [
        {
          id: 'item-1',
          category_id: 'cat-1',
          title: 'Truffle Double Smash',
          price: 1190,
          description: 'Double Angus beef patties, Swiss truffle cheese, caramelized onions, garlic truffle aioli on a brioche bun.',
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
      ],
      isLive: false,
    };
  },
};
