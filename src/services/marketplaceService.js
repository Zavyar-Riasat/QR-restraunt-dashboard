/**
 * Marketplace Service
 * Handles discovery of nearby restaurants, spatial distance calculations,
 * overnight opening hours verification, delivery areas, and public listing filters.
 * STRICT RULE: Only restaurants with listing_status = 'approved' AND listed_publicly = true appear on the Marketplace.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';
import { checkRestaurantDeliveryCoverage } from '../utils/geoValidation.js';

// Default opening hours template with overnight shifts (e.g. 11:00 AM to 02:00 AM / 03:00 AM)
export const DEFAULT_OPENING_HOURS = {
  monday: { open: '11:00', close: '02:00', is_closed: false },
  tuesday: { open: '11:00', close: '02:00', is_closed: false },
  wednesday: { open: '11:00', close: '02:00', is_closed: false },
  thursday: { open: '11:00', close: '02:00', is_closed: false },
  friday: { open: '11:00', close: '03:00', is_closed: false },
  saturday: { open: '11:00', close: '03:00', is_closed: false },
  sunday: { open: '11:00', close: '02:00', is_closed: false },
};

// Seeded verified restaurants for instant marketplace discovery
export const SEED_MARKETPLACE_RESTAURANTS = [
  {
    id: 'rest-101',
    name: 'Burger & Smoke Co.',
    slug: 'burgersmoke',
    phone: '923001234567',
    whatsapp_number: '923001234567',
    latitude: 33.72148,
    longitude: 73.05232,
    address: 'Shop 4, Block B, Beverly Centre, Blue Area',
    city: 'Islamabad',
    area: 'Blue Area',
    cover_image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=200&h=200&q=80',
    logo_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=200&h=200&q=80',
    cuisines: ['Smash Burgers', 'American Fast Food', 'Loaded Fries', 'Artisan Shakes'],
    opening_hours: {
      monday: { open: '11:00', close: '02:00', is_closed: false },
      tuesday: { open: '11:00', close: '02:00', is_closed: false },
      wednesday: { open: '11:00', close: '02:00', is_closed: false },
      thursday: { open: '11:00', close: '02:00', is_closed: false },
      friday: { open: '11:00', close: '03:00', is_closed: false },
      saturday: { open: '11:00', close: '03:00', is_closed: false },
      sunday: { open: '11:00', close: '02:00', is_closed: false },
    },
    delivery_enabled: true,
    pickup_enabled: true,
    dinein_enabled: true,
    delivery_fee: 150,
    min_order: 500,
    prep_time: '20–30 mins',
    rating: 4.9,
    reviews_count: 342,
    listing_status: 'approved',
    listed_publicly: true,
    discount_percentage: 15,
  },
  {
    id: 'rest-102',
    name: 'Crust & Crave Pizzeria',
    slug: 'crust',
    phone: '923005551234',
    whatsapp_number: '923005551234',
    latitude: 33.71821,
    longitude: 73.05642,
    address: 'Plot 18, F-7 Markaz (Jinnah Super)',
    city: 'Islamabad',
    area: 'F-7 Markaz',
    cover_image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=200&h=200&q=80',
    logo_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=200&h=200&q=80',
    cuisines: ['Wood-Fired Pizza', 'Italian', 'Pasta', 'Calzones'],
    opening_hours: {
      monday: { open: '12:00', close: '01:00', is_closed: false },
      tuesday: { open: '12:00', close: '01:00', is_closed: false },
      wednesday: { open: '12:00', close: '01:00', is_closed: false },
      thursday: { open: '12:00', close: '01:00', is_closed: false },
      friday: { open: '12:00', close: '02:00', is_closed: false },
      saturday: { open: '12:00', close: '02:00', is_closed: false },
      sunday: { open: '12:00', close: '01:00', is_closed: false },
    },
    delivery_enabled: true,
    pickup_enabled: true,
    dinein_enabled: true,
    delivery_fee: 120,
    min_order: 600,
    prep_time: '25–35 mins',
    rating: 4.8,
    reviews_count: 218,
    listing_status: 'approved',
    listed_publicly: true,
    discount_percentage: 10,
  },
  {
    id: 'rest-103',
    name: 'Khyber Shinwari & Karahi Dera',
    slug: 'shinwari',
    phone: '923019887766',
    whatsapp_number: '923019887766',
    latitude: 33.69915,
    longitude: 73.01891,
    address: 'Roundabout F-10 Markaz, Main Boulevard',
    city: 'Islamabad',
    area: 'F-10 Markaz',
    cover_image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=200&h=200&q=80',
    logo_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=200&h=200&q=80',
    cuisines: ['Desi Karahi', 'Mutton Shinwari', 'BBQ & Kebabs', 'Roghani Naan'],
    opening_hours: {
      monday: { open: '13:00', close: '02:30', is_closed: false },
      tuesday: { open: '13:00', close: '02:30', is_closed: false },
      wednesday: { open: '13:00', close: '02:30', is_closed: false },
      thursday: { open: '13:00', close: '02:30', is_closed: false },
      friday: { open: '13:00', close: '03:00', is_closed: false },
      saturday: { open: '13:00', close: '03:00', is_closed: false },
      sunday: { open: '13:00', close: '02:30', is_closed: false },
    },
    delivery_enabled: true,
    pickup_enabled: true,
    dinein_enabled: true,
    delivery_fee: 180,
    min_order: 1000,
    prep_time: '35–45 mins',
    rating: 4.7,
    reviews_count: 512,
    listing_status: 'approved',
    listed_publicly: true,
    discount_percentage: 12,
  },
  {
    id: 'rest-104',
    name: 'Green Oasis Cafe & Bowls',
    slug: 'greenoasis',
    phone: '923331112233',
    whatsapp_number: '923331112233',
    latitude: 33.72985,
    longitude: 73.06121,
    address: 'Kohsar Market, Sector F-6/3',
    city: 'Islamabad',
    area: 'F-6 Kohsar',
    cover_image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=200&h=200&q=80',
    logo_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=200&h=200&q=80',
    cuisines: ['Salads & Healthy', 'Acai Bowls', 'Specialty Coffee', 'Sandwiches'],
    opening_hours: {
      monday: { open: '08:00', close: '23:00', is_closed: false },
      tuesday: { open: '08:00', close: '23:00', is_closed: false },
      wednesday: { open: '08:00', close: '23:00', is_closed: false },
      thursday: { open: '08:00', close: '23:00', is_closed: false },
      friday: { open: '08:00', close: '00:00', is_closed: false },
      saturday: { open: '08:00', close: '00:00', is_closed: false },
      sunday: { open: '09:00', close: '23:00', is_closed: false },
    },
    delivery_enabled: true,
    pickup_enabled: true,
    dinein_enabled: true,
    delivery_fee: 100,
    min_order: 400,
    prep_time: '15–25 mins',
    rating: 4.85,
    reviews_count: 140,
    listing_status: 'approved',
    listed_publicly: true,
    discount_percentage: 10,
  },
  // PENDING RESTAURANT (for testing super admin listings approval flow)
  {
    id: 'rest-105',
    name: 'Saffron Dera & Charcoal BBQ',
    slug: 'saffrondera',
    phone: '923008889911',
    whatsapp_number: '923008889911',
    latitude: 33.70512,
    longitude: 73.04523,
    address: 'Shop 12, Civic Centre, Sector F-11 Markaz',
    city: 'Islamabad',
    area: 'F-11 Markaz',
    landmark: 'Opposite Shell Fuel Station',
    cover_image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=200&h=200&q=80',
    logo_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=200&h=200&q=80',
    cuisines: ['BBQ', 'Desi', 'Biryani', 'Karahi'],
    opening_hours: DEFAULT_OPENING_HOURS,
    delivery_enabled: true,
    pickup_enabled: true,
    dinein_enabled: true,
    delivery_fee: 140,
    min_order: 800,
    prep_time: '30–40 mins',
    rating: 4.65,
    reviews_count: 89,
    listing_status: 'approved',
    listed_publicly: true,
  },
  {
    id: 'rest-106',
    name: 'Tokyo Sushi & Asian Bar',
    slug: 'tokyosushi',
    phone: '923004445566',
    whatsapp_number: '923004445566',
    latitude: 33.72412,
    longitude: 73.05831,
    address: 'Block C, F-7 Markaz',
    city: 'Islamabad',
    area: 'F-7 Markaz',
    cover_image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=200&h=200&q=80',
    logo_url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=200&h=200&q=80',
    cuisines: ['Japanese', 'Sushi', 'Ramen'],
    opening_hours: DEFAULT_OPENING_HOURS,
    delivery_enabled: true,
    pickup_enabled: true,
    dinein_enabled: true,
    delivery_fee: 140,
    min_order: 800,
    prep_time: '25–35 mins',
    rating: 4.8,
    reviews_count: 175,
    listing_status: 'approved',
    listed_publicly: true,
  },
  {
    id: 'rest-107',
    name: 'Royal Taj Desi Continental',
    slug: 'royaltaj',
    phone: '923007778899',
    whatsapp_number: '923007778899',
    latitude: 33.71534,
    longitude: 73.04812,
    address: 'Main Blue Area, Sector G-7',
    city: 'Islamabad',
    area: 'Blue Area',
    cover_image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=200&h=200&q=80',
    logo_url: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=200&h=200&q=80',
    cuisines: ['Desi', 'Biryani', 'Karahi', 'Tandoor'],
    opening_hours: DEFAULT_OPENING_HOURS,
    delivery_enabled: true,
    pickup_enabled: true,
    dinein_enabled: true,
    delivery_fee: 160,
    min_order: 700,
    prep_time: '30–40 mins',
    rating: 4.75,
    reviews_count: 312,
    listing_status: 'approved',
    listed_publicly: true,
  },
  // UNAPPROVED RESTAURANT (for testing: MUST NEVER APPEAR ON HOME PAGE)
  {
    id: 'rest-hidden-01',
    name: 'Draft Hidden Kitchen',
    slug: 'draftkitchen',
    latitude: 33.72,
    longitude: 73.05,
    city: 'Islamabad',
    area: 'F-7',
    cuisines: ['Ghost Kitchen'],
    listing_status: 'pending', // Pending approval!
    listed_publicly: false,
  },
];

// Seeded Delivery Areas per restaurant
export const SEED_DELIVERY_AREAS = [
  {
    id: 'area-101-1',
    restaurant_id: 'rest-101',
    type: 'radius',
    radius_km: 7.5,
    fee: 150,
  },
  {
    id: 'area-102-1',
    restaurant_id: 'rest-102',
    type: 'radius',
    radius_km: 6.0,
    fee: 120,
  },
  {
    id: 'area-103-1',
    restaurant_id: 'rest-103',
    type: 'radius',
    radius_km: 8.5,
    fee: 180,
  },
  {
    id: 'area-104-1',
    restaurant_id: 'rest-104',
    type: 'radius',
    radius_km: 5.0,
    fee: 100,
  },
  {
    id: 'area-105-1',
    restaurant_id: 'rest-105',
    type: 'radius',
    radius_km: 7.0,
    fee: 140,
  },
  {
    id: 'area-106-1',
    restaurant_id: 'rest-106',
    type: 'radius',
    radius_km: 6.5,
    fee: 140,
  },
  {
    id: 'area-107-1',
    restaurant_id: 'rest-107',
    type: 'radius',
    radius_km: 8.0,
    fee: 160,
  },
];

export const marketplaceService = {
  /**
   * High-Precision Haversine Formula (Kilometers)
   */
  haversineDistanceKm(lat1, lon1, lat2, lon2) {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
      return null;
    }
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 6371; // Earth radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(1));
  },

  /**
   * Overnight-aware opening hours calculation
   * Supports day and overnight opening hours (e.g. 11:00 AM to 03:00 AM across midnight)
   */
  computeIsOpenNow(openingHours, checkDate = new Date()) {
    if (!openingHours || typeof openingHours !== 'object') {
      return true; // Default open if no schedule specified
    }

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDayIdx = checkDate.getDay();
    const todayName = days[currentDayIdx];
    const prevDayIdx = (currentDayIdx + 6) % 7;
    const yesterdayName = days[prevDayIdx];

    const currentHours = checkDate.getHours();
    const currentMinutes = checkDate.getMinutes();
    const currentTimeStr = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;

    // 1. Check if yesterday had an overnight shift that is still active past midnight
    const prevSchedule = openingHours[yesterdayName];
    if (prevSchedule && !prevSchedule.is_closed && prevSchedule.open && prevSchedule.close) {
      const { open, close } = prevSchedule;
      // If close < open (overnight), and currentTime < close, it's still open from yesterday
      if (close < open && currentTimeStr < close) {
        return true;
      }
    }

    // 2. Check today's schedule
    const todaySchedule = openingHours[todayName];
    if (!todaySchedule) return true;
    if (todaySchedule.is_closed) return false;

    const { open, close } = todaySchedule;
    if (!open || !close) return true;

    // Normal daytime shift (e.g. 09:00 to 22:00)
    if (open <= close) {
      return currentTimeStr >= open && currentTimeStr < close;
    }

    // Overnight shift (e.g. 11:00 to 02:00)
    return currentTimeStr >= open || currentTimeStr < close;
  },

  /**
   * Get public restaurants for the marketplace home page.
   * STRICT FILTER: Only restaurants with listing_status = 'approved' AND listed_publicly = true
   */
  /**
   * 60-Second Cache Store for Public Restaurants
   */
  _publicRestaurantsCache: {
    data: null,
    timestamp: 0,
  },

  /**
   * Invalidate public restaurants cache so updates/approvals reflect immediately
   */
  invalidateCache() {
    this._publicRestaurantsCache = {
      data: null,
      timestamp: 0,
    };
  },

  /**
   * Helper to retrieve dynamically registered and overridden restaurants from localStorage
   */
  _getCustomStoredRestaurants() {
    const list = [];
    try {
      if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') return list;

      // 1. Registered owners from authService
      const storedUsers = localStorage.getItem('dinehq_registered_users');
      if (storedUsers) {
        const users = JSON.parse(storedUsers);
        if (Array.isArray(users)) {
          for (const u of users) {
            if (u.restaurant_name && u.restaurant_slug) {
              const restId = u.restaurant_id || `rest-${u.restaurant_slug}`;
              list.push({
                id: restId,
                name: u.restaurant_name,
                slug: u.restaurant_slug,
                phone: u.phone || u.whatsapp_number || '923001234567',
                whatsapp_number: u.phone || u.whatsapp_number || '923001234567',
                listing_status: 'pending',
                listed_publicly: true,
              });
            }
          }
        }
      }

      // 2. Local restaurant overrides from Store Settings / LocationDeliverySection
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('dinehq_restaurant_overrides_')) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed && (parsed.id || parsed.slug)) {
                const existingIdx = list.findIndex(
                  (r) => (parsed.id && r.id === parsed.id) || (parsed.slug && r.slug === parsed.slug)
                );
                if (existingIdx >= 0) {
                  list[existingIdx] = { ...list[existingIdx], ...parsed };
                } else {
                  list.push(parsed);
                }
              }
            }
          } catch (_) {}
        }
      }
    } catch (e) {
      console.warn('Error reading custom stored restaurants:', e);
    }
    return list;
  },

  /**
   * Get public restaurants for the marketplace home page.
   * STRICT FILTER: Only restaurants with listing_status = 'approved' AND listed_publicly = true
   */
  async getPublicRestaurants(params = {}) {
    const {
      userLat = null,
      userLng = null,
      cuisine = 'ALL',
      search = '',
      sort = 'nearest', // 'nearest' | 'open_now' | 'fee' | 'rating'
      deliversToMe = false,
      openNow = false,
      pickup = false,
      dinein = false,
      freeDelivery = false,
      page = 1,
      pageSize = 20,
    } = params;

    const nowTime = Date.now();
    let rawRestaurants = [];

    // Check 60-second cache
    if (
      this._publicRestaurantsCache.data &&
      nowTime - this._publicRestaurantsCache.timestamp < 60000
    ) {
      rawRestaurants = this._publicRestaurantsCache.data;
    } else {
      // 1. Query Supabase if configured
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('restaurants')
            .select('*')
            .eq('listing_status', 'approved')
            .eq('listed_publicly', true);

          if (!error && Array.isArray(data) && data.length > 0) {
            rawRestaurants = data.map((r) => this._normalizeRestaurant(r));
          }
        } catch (err) {
          console.warn('Supabase marketplace fetch notice:', err.message);
        }
      }

      // 2. Fallback / Merge with Seeded Verified Restaurants
      if (rawRestaurants.length === 0) {
        rawRestaurants = SEED_MARKETPLACE_RESTAURANTS.map((r) => this._normalizeRestaurant(r));
      } else {
        const existingSlugs = new Set(rawRestaurants.map((r) => r.slug));
        SEED_MARKETPLACE_RESTAURANTS.forEach((sr) => {
          if (!existingSlugs.has(sr.slug)) {
            rawRestaurants.push(this._normalizeRestaurant(sr));
          }
        });
      }

      // 3. Merge custom stored restaurants from registered owners
      const customList = this._getCustomStoredRestaurants();
      customList.forEach((cr) => {
        const idx = rawRestaurants.findIndex((r) => r.id === cr.id || (cr.slug && r.slug === cr.slug));
        if (idx >= 0) {
          rawRestaurants[idx] = this._normalizeRestaurant({ ...rawRestaurants[idx], ...cr });
        } else {
          rawRestaurants.push(this._normalizeRestaurant(cr));
        }
      });

      // Cache raw list for 60 seconds
      this._publicRestaurantsCache = {
        data: rawRestaurants,
        timestamp: nowTime,
      };
    }

    // 3. STRICT MARKETPLACE CONSTRAINT: Only approved, publicly listed, and not deleted
    let restaurants = rawRestaurants.filter(
      (r) => !r.deleted && r.listing_status === 'approved' && r.listed_publicly === true
    );

    // 4. Attach dynamically computed is_open_now, distance_km, and delivers_to_user
    const now = new Date();
    const customerLocation =
      userLat != null && userLng != null ? { lat: Number(userLat), lng: Number(userLng) } : null;

    restaurants = await Promise.all(
      restaurants.map(async (r) => {
        const isOpen = this.computeIsOpenNow(r.opening_hours, now);
        let distanceKm = null;
        if (customerLocation && r.latitude != null && r.longitude != null) {
          distanceKm = this.haversineDistanceKm(
            customerLocation.lat,
            customerLocation.lng,
            r.latitude,
            r.longitude
          );
        }

        const areas = r.delivery_areas || (await this.getDeliveryAreas(r.id));
        const coverage = checkRestaurantDeliveryCoverage(customerLocation, r, areas);

        return {
          ...r,
          is_open_now: isOpen,
          distance_km: distanceKm,
          delivers_to_user: coverage.deliversToUser,
          delivery_fee_effective: coverage.fee ?? r.delivery_fee,
        };
      })
    );

    // 5. Filter by Cuisine Tag
    if (cuisine && cuisine !== 'ALL') {
      const searchCuisine = cuisine.toLowerCase();
      restaurants = restaurants.filter((r) => {
        const cuisinesList = Array.isArray(r.cuisines)
          ? r.cuisines
          : typeof r.cuisines === 'string'
          ? [r.cuisines]
          : [];
        return cuisinesList.some((c) => c.toLowerCase().includes(searchCuisine));
      });
    }

    // 6. Filter by Search Query (name, city, area, cuisines, dishes)
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      restaurants = restaurants.filter((r) => {
        const inName = (r.name || '').toLowerCase().includes(q);
        const inArea = (r.area || '').toLowerCase().includes(q);
        const inCity = (r.city || '').toLowerCase().includes(q);
        const inCuisines = Array.isArray(r.cuisines) && r.cuisines.some((c) => c.toLowerCase().includes(q));
        return inName || inArea || inCity || inCuisines;
      });
    }

    // 7. Quick Filter Toggles
    if (deliversToMe && customerLocation) {
      restaurants = restaurants.filter((r) => r.delivers_to_user === true);
    }
    if (openNow) {
      restaurants = restaurants.filter((r) => r.is_open_now === true);
    }
    if (pickup) {
      restaurants = restaurants.filter((r) => r.pickup_enabled === true);
    }
    if (dinein) {
      restaurants = restaurants.filter((r) => r.dinein_enabled === true);
    }
    if (freeDelivery) {
      restaurants = restaurants.filter((r) => (r.delivery_fee_effective || 0) === 0);
    }

    // 8. Sorting: Nearest (default), Open now first, Delivery fee, Rating
    // Constraint: Nearest restaurants appear at top; closed ones sink within the same distance band
    if (sort === 'rating') {
      restaurants.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'fee') {
      restaurants.sort((a, b) => (a.delivery_fee_effective || 0) - (b.delivery_fee_effective || 0));
    } else if (sort === 'open_now') {
      restaurants.sort((a, b) => {
        if (a.is_open_now !== b.is_open_now) {
          return a.is_open_now ? -1 : 1;
        }
        return (a.distance_km || 999) - (b.distance_km || 999);
      });
    } else {
      // Default: Nearest
      restaurants.sort((a, b) => {
        if (a.distance_km != null && b.distance_km != null) {
          const distDiff = a.distance_km - b.distance_km;
          // Closed ones sink within the same distance band (within 1.5 km of each other)
          if (Math.abs(distDiff) < 1.5 && a.is_open_now !== b.is_open_now) {
            return a.is_open_now ? -1 : 1;
          }
          return distDiff;
        }
        if (a.distance_km != null) return -1;
        if (b.distance_km != null) return 1;

        // If location is unknown: sort by city, then open now
        if (a.city !== b.city) return (a.city || '').localeCompare(b.city || '');
        return (b.is_open_now ? 1 : 0) - (a.is_open_now ? 1 : 0);
      });
    }

    // 9. Pagination (20 per page)
    const totalCount = restaurants.length;
    const paginated = restaurants.slice(0, page * pageSize);
    const hasMore = paginated.length < totalCount;

    return {
      restaurants: paginated,
      totalCount,
      hasMore,
    };
  },

  /**
   * Get public food items / dishes across all approved marketplace restaurants.
   * Enables customers to search and browse directly by food/dish or restaurant.
   */
  async getPublicFoodItems(params = {}) {
    const {
      userLat = null,
      userLng = null,
      cuisine = 'ALL',
      search = '',
      sort = 'popular', // 'popular' | 'price_asc' | 'price_desc' | 'rating' | 'nearest'
      deliversToMe = false,
      openNow = false,
      freeDelivery = false,
      page = 1,
      pageSize = 24,
    } = params;

    // 1. Get all approved public restaurants with spatial & delivery coverage calculated
    const restResult = await this.getPublicRestaurants({
      userLat,
      userLng,
      cuisine: 'ALL',
      search: '',
      deliversToMe,
      openNow,
      freeDelivery,
      page: 1,
      pageSize: 100,
    });

    const activeRestaurants = restResult.restaurants || [];
    let allFoodItems = [];

    // Dynamically import ALL_SEED_RESTAURANTS from restaurantService
    const { ALL_SEED_RESTAURANTS } = await import('./restaurantService.js');

    for (const rest of activeRestaurants) {
      let items = [];
      let categories = [];

      // Check if custom menu stored in localStorage for this tenant
      try {
        const localKey = `foodbypass_demo_data_${rest.slug}`;
        const saved = (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') ? localStorage.getItem(localKey) : null;
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed.menuItems) && parsed.menuItems.length > 0) {
            items = parsed.menuItems;
            categories = parsed.categories || [];
          }
        }
      } catch (_) {}

      // Fallback to seed menu items
      if (items.length === 0 && ALL_SEED_RESTAURANTS[rest.slug]) {
        items = ALL_SEED_RESTAURANTS[rest.slug].menuItems || [];
        categories = ALL_SEED_RESTAURANTS[rest.slug].categories || [];
      }

      const catMap = new Map(categories.map((c) => [c.id, c.name]));

      for (const item of items) {
        const catName = catMap.get(item.category_id) || 'Chef Specialties';
        const imgUrl =
          item.variants?.image_url ||
          item.image_url ||
          rest.cover_image ||
          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';

        allFoodItems.push({
          id: `${rest.slug}-${item.id}`,
          raw_item_id: item.id,
          title: item.title,
          price: Number(item.price) || 0,
          description: item.description || '',
          image: imgUrl,
          image_url: imgUrl,
          category_id: item.category_id,
          category: catName,
          category_name: catName,
          is_popular: Boolean(item.isPopular || item.is_popular || item.dealBadge || item.variants?.deal_badge),
          deal_badge: item.dealBadge || (item.variants?.deal_badge ? item.variants.deal_badge : null),
          // Restaurant details
          restaurant_id: rest.id,
          restaurant_name: rest.name,
          restaurant_slug: rest.slug,
          restaurant_logo: rest.logo_url || rest.logo,
          restaurant_cover: rest.cover_image,
          restaurant_rating: rest.rating || 4.8,
          restaurant_area: rest.area || rest.city,
          distance_km: rest.distance_km,
          restaurant_distance_km: rest.distance_km,
          prep_time: rest.prep_time || '20–30m',
          restaurant_prep_time: rest.prep_time || '20–30m',
          restaurant_delivery_fee: rest.delivery_fee_effective ?? rest.delivery_fee,
          restaurant_is_open: rest.is_open_now,
          restaurant_delivers_to_user: rest.delivers_to_user,
          cuisines: rest.cuisines || [],
        });
      }
    }

    // 2. Filter by Cuisine Tag
    if (cuisine && cuisine !== 'ALL') {
      const cLower = cuisine.toLowerCase();
      allFoodItems = allFoodItems.filter((f) => {
        const inCat = (f.category_name || '').toLowerCase().includes(cLower);
        const inTitle = (f.title || '').toLowerCase().includes(cLower);
        const inRestCuisines = Array.isArray(f.cuisines) && f.cuisines.some((c) => c.toLowerCase().includes(cLower));
        return inCat || inTitle || inRestCuisines;
      });
    }

    // 3. Filter by Search Query (dish title, description, category, or restaurant name)
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      allFoodItems = allFoodItems.filter((f) => {
        const inTitle = (f.title || '').toLowerCase().includes(q);
        const inDesc = (f.description || '').toLowerCase().includes(q);
        const inCat = (f.category_name || '').toLowerCase().includes(q);
        const inRest = (f.restaurant_name || '').toLowerCase().includes(q);
        return inTitle || inDesc || inCat || inRest;
      });
    }

    // 4. Sorting
    if (sort === 'price_asc') {
      allFoodItems.sort((a, b) => a.price - b.price);
    } else if (sort === 'price_desc') {
      allFoodItems.sort((a, b) => b.price - a.price);
    } else if (sort === 'rating') {
      allFoodItems.sort((a, b) => (b.restaurant_rating || 0) - (a.restaurant_rating || 0));
    } else if (sort === 'nearest') {
      allFoodItems.sort((a, b) => (a.restaurant_distance_km || 999) - (b.restaurant_distance_km || 999));
    } else {
      // Default: Popular (open restaurants first, high rating)
      allFoodItems.sort((a, b) => {
        if (a.restaurant_is_open !== b.restaurant_is_open) {
          return a.restaurant_is_open ? -1 : 1;
        }
        return (b.restaurant_rating || 0) - (a.restaurant_rating || 0);
      });
    }

    // 5. Pagination
    const totalCount = allFoodItems.length;
    const paginated = allFoodItems.slice(0, page * pageSize);
    const hasMore = paginated.length < totalCount;

    return {
      foodItems: paginated,
      totalCount,
      hasMore,
    };
  },

  /**
   * Server-Side Nearby Dishes Endpoint Caller
   * Calls GET /api/nearby/dishes with cursor pagination (24 at a time)
   */
  async getNearbyDishes(params = {}) {
    const {
      userLat = null,
      userLng = null,
      query = '',
      category = 'ALL',
      sort = 'nearest',
      cursor = 0,
      limit = 24,
      openNow = false,
      vegOnly = false,
      minPrice = null,
      maxPrice = null,
    } = params;

    try {
      const searchParams = new URLSearchParams();
      if (userLat != null) searchParams.set('lat', String(userLat));
      if (userLng != null) searchParams.set('lng', String(userLng));
      if (query && query.trim()) searchParams.set('query', query.trim());
      if (category && category !== 'ALL') searchParams.set('category', category);
      if (sort) searchParams.set('sort', sort);
      if (cursor != null) searchParams.set('cursor', String(cursor));
      if (limit) searchParams.set('limit', String(limit));
      if (openNow) searchParams.set('open_now', 'true');
      if (vegOnly) searchParams.set('veg_only', 'true');
      if (minPrice != null) searchParams.set('min_price', String(minPrice));
      if (maxPrice != null) searchParams.set('max_price', String(maxPrice));

      const response = await fetch(`/api/nearby/dishes?${searchParams.toString()}`);
      if (response.ok) {
        const data = await response.json();
        return {
          items: data.items || [],
          totalCount: data.total_count || 0,
          nextCursor: data.next_cursor,
          hasMore: Boolean(data.has_more),
        };
      }
    } catch (e) {
      console.warn('GET /api/nearby/dishes fetch warning, falling back to local dataset:', e);
    }

    // Graceful fallback
    const fallback = await this.getPublicFoodItems({
      userLat,
      userLng,
      cuisine: category,
      search: query,
      sort,
      openNow,
      page: Math.floor(cursor / limit) + 1,
      pageSize: limit,
    });

    return {
      items: fallback.foodItems || [],
      totalCount: fallback.totalCount || 0,
      nextCursor: fallback.hasMore ? cursor + limit : null,
      hasMore: Boolean(fallback.hasMore),
    };
  },

  /**
   * Get single restaurant by slug with full marketplace metadata
   */
  async getRestaurantBySlug(slug) {
    if (!slug) return null;
    const cleanSlug = slug.toLowerCase().trim();

    // 1. Try Supabase
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select('*')
          .eq('slug', cleanSlug)
          .maybeSingle();

        if (!error && data) {
          return this._normalizeRestaurant(data);
        }
      } catch (e) {
        console.warn('Error fetching restaurant by slug from Supabase:', e.message);
      }
    }

    // 2. Check local custom restaurants / overrides
    const customList = this._getCustomStoredRestaurants();
    const customMatch = customList.find((r) => (r.slug || '').toLowerCase() === cleanSlug);
    if (customMatch) {
      return this._normalizeRestaurant(customMatch);
    }

    // 3. Fallback to seeded restaurants
    const found = SEED_MARKETPLACE_RESTAURANTS.find((r) => r.slug === cleanSlug);
    if (found) {
      return this._normalizeRestaurant(found);
    }

    return null;
  },

  /**
   * Get delivery areas for a restaurant
   */
  async getDeliveryAreas(restaurantId) {
    if (!restaurantId) return [];

    // Check local storage overrides first
    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
        const stored = localStorage.getItem(`dinehq_delivery_areas_${restaurantId}`);
        if (stored) {
          return JSON.parse(stored);
        }
      }
    } catch (e) {
      console.warn('Error reading local delivery areas:', e);
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('delivery_areas')
          .select('*')
          .eq('restaurant_id', restaurantId);

        if (!error && Array.isArray(data) && data.length > 0) {
          return data;
        }
      } catch (e) {
        console.warn('Error loading delivery areas from Supabase:', e.message);
      }
    }

    // Fallback to seeded delivery areas
    return SEED_DELIVERY_AREAS.filter((a) => a.restaurant_id === restaurantId);
  },

  /**
   * Save or update delivery areas for a restaurant
   */
  async saveDeliveryAreas(restaurantId, areas) {
    if (!restaurantId || !Array.isArray(areas)) return [];

    try {
      localStorage.setItem(`dinehq_delivery_areas_${restaurantId}`, JSON.stringify(areas));
    } catch (e) {
      console.warn('Failed to save delivery areas locally:', e);
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('delivery_areas').delete().eq('restaurant_id', restaurantId);
        if (areas.length > 0) {
          await supabase.from('delivery_areas').insert(
            areas.map((a) => ({
              restaurant_id: restaurantId,
              type: a.type || 'radius',
              radius_km: a.radius_km || null,
              polygon: a.polygon || null,
              fee: a.fee != null ? a.fee : 0,
            }))
          );
        }
      } catch (err) {
        console.warn('Supabase delivery areas save notice:', err.message);
      }
    }

    return areas;
  },

  /**
   * Fetch all restaurants for Super Admin console (including pending, approved, rejected, hidden)
   */
  async getAllRestaurantsForAdmin() {
    let all = [];

    // 1. Try Supabase
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('restaurants').select('*');
        if (!error && Array.isArray(data) && data.length > 0) {
          all = data.map((r) => this._normalizeRestaurant(r));
        }
      } catch (e) {
        console.warn('Error fetching admin restaurants from Supabase:', e.message);
      }
    }

    // 2. Fallback / Merge with Seeded list
    const existingIds = new Set(all.map((r) => r.id));
    if (all.length === 0) {
      all = SEED_MARKETPLACE_RESTAURANTS.map((r) => this._normalizeRestaurant(r));
      all.forEach((r) => existingIds.add(r.id));
    } else {
      SEED_MARKETPLACE_RESTAURANTS.forEach((sr) => {
        if (!existingIds.has(sr.id)) {
          all.push(this._normalizeRestaurant(sr));
          existingIds.add(sr.id);
        }
      });
    }

    // 3. Merge custom stored restaurants from registered owners
    const customList = this._getCustomStoredRestaurants();
    customList.forEach((cr) => {
      const idx = all.findIndex((r) => r.id === cr.id || (cr.slug && r.slug === cr.slug));
      if (idx >= 0) {
        all[idx] = this._normalizeRestaurant({ ...all[idx], ...cr });
      } else {
        all.push(this._normalizeRestaurant(cr));
        existingIds.add(cr.id);
      }
    });

    // 4. Attach delivery areas for each restaurant
    for (const r of all) {
      r.delivery_areas = await this.getDeliveryAreas(r.id);
    }

    return all.filter((r) => !r.deleted);
  },

  /**
   * Permanently remove a restaurant listing by Super Admin
   */
  async deleteRestaurantListing(restaurantId) {
    if (!restaurantId) return false;

    // Save in local overrides
    try {
      const raw = localStorage.getItem('dinehq_listing_overrides') || '{}';
      const overrides = JSON.parse(raw);
      overrides[restaurantId] = {
        deleted: true,
        listing_status: 'deleted',
        listed_publicly: false,
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem('dinehq_listing_overrides', JSON.stringify(overrides));
    } catch (e) {
      console.warn('Failed to save delete listing override:', e);
    }

    // Also remove from custom stored restaurants if applicable
    try {
      const rawCustom = localStorage.getItem('dinehq_custom_restaurants') || '[]';
      const custom = JSON.parse(rawCustom);
      const filtered = custom.filter((r) => r.id !== restaurantId);
      localStorage.setItem('dinehq_custom_restaurants', JSON.stringify(filtered));
    } catch (e) {}

    // Invalidate public restaurants cache
    this.invalidateCache();

    // Also update Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('restaurants').delete().eq('id', restaurantId);
      } catch (e) {}
    }

    return true;
  },

  /**
   * Update listing status by Super Admin (Approve / Reject / Hide)
   */
  async updateListingStatus(restaurantId, { status, reason = '', listedPublicly = null }) {
    if (!restaurantId) return null;

    const isPublic = listedPublicly != null ? listedPublicly : status === 'approved';

    // Save in local overrides
    try {
      const raw = localStorage.getItem('dinehq_listing_overrides') || '{}';
      const overrides = JSON.parse(raw);
      overrides[restaurantId] = {
        listing_status: status,
        rejection_reason: reason || '',
        listed_publicly: isPublic,
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem('dinehq_listing_overrides', JSON.stringify(overrides));
    } catch (e) {
      console.warn('Failed to save listing overrides:', e);
    }

    // Also update Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('restaurants')
          .update({
            listing_status: status,
            listed_publicly: isPublic,
            rejection_reason: reason || null,
          })
          .eq('id', restaurantId);
      } catch (e) {
        console.warn('Supabase update listing status notice:', e.message);
      }
    }

    // Invalidate public restaurants cache so approved restaurants show immediately
    this.invalidateCache();

    return { id: restaurantId, listing_status: status, listed_publicly: isPublic, rejection_reason: reason };
  },

  /**
   * Check if customer coordinates are within restaurant delivery radius/zone
   */
  isLocationDeliverable(userCoords, restaurant, deliveryAreas = []) {
    if (!userCoords || !restaurant) return { deliverable: true, fee: restaurant?.delivery_fee || 150 };
    const { latitude: uLat, longitude: uLng } = userCoords;

    if (!uLat || !uLng || !restaurant.latitude || !restaurant.longitude) {
      return { deliverable: true, fee: restaurant.delivery_fee || 150 };
    }

    const dist = this.haversineDistanceKm(uLat, uLng, restaurant.latitude, restaurant.longitude);

    if (deliveryAreas.length > 0) {
      // Find matching area
      const matched = deliveryAreas.find((a) => {
        if (a.type === 'radius' && a.radius_km) {
          return dist <= a.radius_km;
        }
        return true;
      });

      if (matched) {
        return {
          deliverable: true,
          distance_km: dist,
          fee: matched.fee != null ? matched.fee : restaurant.delivery_fee,
        };
      }
      return { deliverable: false, distance_km: dist, fee: null };
    }

    // Default 10km radius if no custom zones configured
    const isWithin = dist <= 10.0;
    return {
      deliverable: isWithin,
      distance_km: dist,
      fee: restaurant.delivery_fee || 150,
    };
  },

  /**
   * Normalizer to ensure consistent field names across Supabase & local seed
   */
  _normalizeRestaurant(r) {
    const openingHours = r.opening_hours && typeof r.opening_hours === 'object'
      ? r.opening_hours
      : DEFAULT_OPENING_HOURS;

    let cuisines = [];
    if (Array.isArray(r.cuisines)) {
      cuisines = r.cuisines;
    } else if (typeof r.cuisines === 'string') {
      try {
        cuisines = JSON.parse(r.cuisines);
      } catch {
        cuisines = [r.cuisines];
      }
    } else {
      cuisines = ['Fast Food'];
    }

    // Check if there are local overrides for this restaurant
    let overrideStatus = r.listing_status;
    let overridePublic = r.listed_publicly;
    let overrideReason = r.rejection_reason || '';
    let isDeleted = Boolean(r.deleted);
    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
        const raw = localStorage.getItem('dinehq_listing_overrides');
        if (raw) {
          const overrides = JSON.parse(raw);
          if (overrides[r.id]) {
            if (overrides[r.id].deleted !== undefined) isDeleted = Boolean(overrides[r.id].deleted);
            if (overrides[r.id].listing_status !== undefined) overrideStatus = overrides[r.id].listing_status;
            if (overrides[r.id].listed_publicly !== undefined) overridePublic = overrides[r.id].listed_publicly;
            if (overrides[r.id].rejection_reason !== undefined) overrideReason = overrides[r.id].rejection_reason;
          }
        }
      }
    } catch (e) {
      console.warn('Error reading listing overrides in normalizer:', e);
    }

    let deliveryAreas = r.delivery_areas;
    if (!deliveryAreas && r.id) {
      try {
        const stored = localStorage.getItem(`dinehq_delivery_areas_${r.id}`);
        if (stored) {
          deliveryAreas = JSON.parse(stored);
        }
      } catch (_) {}
    }

    return {
      id: r.id,
      name: r.name || 'Restaurant',
      slug: r.slug,
      deleted: isDeleted,
      phone: r.phone || r.whatsapp_number || '923001234567',
      whatsapp_number: r.whatsapp_number || r.phone || '923001234567',
      latitude: r.latitude ? Number(r.latitude) : 33.72148,
      longitude: r.longitude ? Number(r.longitude) : 73.05232,
      address: r.address || 'Islamabad, Pakistan',
      city: r.city || 'Islamabad',
      area: r.area || 'F-7',
      landmark: r.landmark || '',
      cover_image: r.cover_image || 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80',
      logo: r.logo || r.logo_url || 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=200&h=200&q=80',
      logo_url: r.logo_url || r.logo || 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=200&h=200&q=80',
      cuisines,
      opening_hours: openingHours,
      delivery_enabled: r.delivery_enabled !== false,
      pickup_enabled: r.pickup_enabled !== false,
      dinein_enabled: r.dinein_enabled !== false,
      delivery_fee: r.delivery_fee != null ? Number(r.delivery_fee) : 150,
      min_order: r.min_order != null ? Number(r.min_order) : 500,
      prep_time: r.prep_time || '20–30 mins',
      rating: r.rating != null ? Number(r.rating) : 4.8,
      reviews_count: r.reviews_count || 120,
      listing_status: overrideStatus || 'approved',
      listed_publicly: overridePublic !== false,
      rejection_reason: overrideReason,
      discount_percentage: r.discount_percentage != null ? Number(r.discount_percentage) : 10,
      delivery_areas: deliveryAreas || null,
    };
  },
};
