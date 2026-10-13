import { supabase } from '../lib/supabaseClient.js';

const STORAGE_KEY = 'foodbypass_demo_data';
const SETTINGS_PREFIX = 'dinehq_rest_settings_';

// Initial seeded data for immediate out-of-the-box functionality
const initialSeedData = {
  restaurant: {
    id: 'rest-101',
    name: 'Burger & Smoke Co.',
    slug: 'burgersmoke',
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
  ],
};

const isSupabaseConfigured = () => {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL && 
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
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
            whatsapp_number: u.whatsapp_number,
            owner_id: u.id,
          }));
          return [initialSeedData.restaurant, ...list.filter((r) => r.slug !== 'burgersmoke')];
        }
      }
    } catch (e) {}

    return [initialSeedData.restaurant];
  },

  /**
   * Helper to merge extended settings (is_open, delivery_mode, delivery_fee, show_min_order, min_order_amount, show_prep_time, prep_time)
   */
  mergeExtendedSettings(restaurant) {
    if (!restaurant) return restaurant;
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
    return { ...extended, ...restaurant };
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

    // Local Sandbox persistence (keyed by restaurantId or slug if provided)
    const specificKey = slug ? `${STORAGE_KEY}_${slug}` : STORAGE_KEY;
    const saved = localStorage.getItem(specificKey) || localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          restaurant: this.mergeExtendedSettings(parsed.restaurant),
          isLive: false,
        };
      } catch (e) {}
    }
    return {
      ...initialSeedData,
      restaurant: this.mergeExtendedSettings(initialSeedData.restaurant),
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
   * 1. Update Restaurant Settings (WhatsApp number, slug, name, is_open, delivery_mode, delivery_fee, min_order_amount, prep_time)
   */
  async updateRestaurant(restaurantId, updates) {
    // 1. Separate base columns for Supabase
    const baseColumns = {};
    if (updates.name !== undefined) baseColumns.name = updates.name;
    if (updates.slug !== undefined) baseColumns.slug = updates.slug;
    if (updates.whatsapp_number !== undefined) baseColumns.whatsapp_number = updates.whatsapp_number;
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
