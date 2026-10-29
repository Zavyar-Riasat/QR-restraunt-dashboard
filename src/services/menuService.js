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
          .maybeSingle();

        if (!restError && restaurantData) {
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

          if (!categoriesRes.error && !itemsRes.error) {
            let resolvedCategories = categoriesRes.data || [];
            let resolvedMenuItems = itemsRes.data || [];

            // Merge locally saved categories/items if any were saved locally in Owner Dashboard
            try {
              const savedRaw =
                localStorage.getItem(`${STORAGE_KEY}_${slug}`) ||
                localStorage.getItem(`${STORAGE_KEY}_${restaurant.id}`);
              if (savedRaw) {
                const savedParsed = JSON.parse(savedRaw);
                if (Array.isArray(savedParsed?.categories) && savedParsed.categories.length > 0) {
                  const existingNames = new Set(
                    resolvedCategories.map((c) => String(c.name || '').trim().toLowerCase())
                  );
                  const extras = savedParsed.categories.filter(
                    (c) => c?.name && !existingNames.has(String(c.name).trim().toLowerCase())
                  );
                  if (extras.length > 0) {
                    resolvedCategories = [...resolvedCategories, ...extras];
                  }
                }
                if (Array.isArray(savedParsed?.menuItems) && savedParsed.menuItems.length > 0) {
                  const existingIds = new Set(resolvedMenuItems.map((i) => i.id));
                  const itemExtras = savedParsed.menuItems.filter(
                    (i) => i?.id && !existingIds.has(i.id)
                  );
                  if (itemExtras.length > 0) {
                    resolvedMenuItems = [...resolvedMenuItems, ...itemExtras];
                  }
                }
              }
            } catch {}

            return {
              restaurant,
              categories: resolvedCategories,
              menuItems: resolvedMenuItems,
              isLive: true,
            };
          }
        }
      } catch (err) {
        console.warn('Supabase fetch by slug failed, checking local state:', err.message);
      }
    }

    // Fallback to local sandbox data (from localStorage or seed)
    const specificKey = `${STORAGE_KEY}_${slug}`;
    const saved = localStorage.getItem(specificKey);
    if (saved) {
      try {
        const localData = JSON.parse(saved);
        if (localData.restaurant && (!slug || localData.restaurant.slug === slug)) {
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

    // Check if custom restaurant was created locally via store settings or marketplace overrides
    try {
      const customOverride = localStorage.getItem(`dinehq_restaurant_overrides_${slug}`);
      if (customOverride) {
        const parsed = JSON.parse(customOverride);
        if (parsed) {
          return {
            restaurant: restaurantService.mergeExtendedSettings(parsed),
            categories: [
              { id: 'cat-1', name: 'Chef Specials' },
              { id: 'cat-2', name: 'Beverages & Sides' },
            ],
            menuItems: [
              {
                id: 'item-1',
                category_id: 'cat-1',
                title: `${parsed.name || 'House'} Special`,
                price: 850,
                description: 'Freshly prepared signature specialty.',
                variants: { is_available: true },
              },
            ],
            isLive: false,
          };
        }
      }
    } catch {}

    // Fallback to restaurantService getInitialState to load distinct restaurant profile & 5+ dishes
    const state = await restaurantService.getInitialState({ slug });
    return {
      restaurant: state.restaurant,
      categories: state.categories || [],
      menuItems: state.menuItems || [],
      isLive: false,
    };
  },
};
