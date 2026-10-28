/**
 * Customer Service
 * Handles customer authentication for diners, delivery addresses (Home/Work/Other),
 * restaurant favorites, preferred language, and account data deletion.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';
import { orderService } from './orderService.js';

const CUSTOMER_SESSION_KEY = 'dineflow_customer_session';
const CUSTOMER_REGISTRY_KEY = 'dinehq_customer_registry';
const CUSTOMER_ADDRESSES_KEY = 'dineflow_customer_addresses_';
const CUSTOMER_FAVORITES_KEY = 'dineflow_customer_favorites_';

export const customerService = {
  /**
   * Get active logged-in customer from local session
   */
  getCurrentCustomer() {
    try {
      const data = localStorage.getItem(CUSTOMER_SESSION_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Error reading customer session:', e);
    }
    return null;
  },

  /**
   * Find registered customer by phone number
   */
  findCustomerByPhone(phoneInput) {
    if (!phoneInput) return null;
    const cleanPhone = String(phoneInput).replace(/\D/g, '');
    if (!cleanPhone) return null;

    try {
      // 1. Check active session
      const current = this.getCurrentCustomer();
      if (current && current.phone && (current.phone === cleanPhone || current.phone.endsWith(cleanPhone) || cleanPhone.endsWith(current.phone))) {
        return current;
      }

      // 2. Check local registry
      const raw = localStorage.getItem(CUSTOMER_REGISTRY_KEY);
      if (raw) {
        const registry = JSON.parse(raw);
        if (registry[cleanPhone]) {
          return registry[cleanPhone];
        }
        // Match fuzzy (without leading 0 or with 92)
        const matchKey = Object.keys(registry).find(
          (k) => k === cleanPhone || k.endsWith(cleanPhone) || cleanPhone.endsWith(k)
        );
        if (matchKey) return registry[matchKey];
      }
    } catch (e) {
      console.warn('Error finding customer by phone:', e);
    }

    return null;
  },

  /**
   * Customer Login / Register using phone or email
   */
  async loginOrRegister({ name, phone, email, avatar = null, preferred_language = 'en' }) {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || 'Guest Diner').trim();

    // Check existing registry entry to preserve profile details
    const existing = this.findCustomerByPhone(cleanPhone);

    const customerObj = {
      id: existing?.id || `cust_${cleanPhone || Date.now().toString(36)}`,
      name: existing?.name || cleanName || 'Guest Diner',
      phone: cleanPhone,
      email: existing?.email || cleanEmail || `${cleanPhone || 'guest'}@customer.dinehq.pk`,
      avatar: existing?.avatar || avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`,
      preferred_language: existing?.preferred_language || preferred_language || 'en',
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // If Supabase is configured, upsert into customers table
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('customers')
          .upsert(
            {
              name: customerObj.name,
              phone: customerObj.phone,
              email: customerObj.email,
              avatar: customerObj.avatar,
              preferred_language: customerObj.preferred_language,
            },
            { onConflict: 'phone' }
          )
          .select()
          .maybeSingle();

        if (!error && data) {
          customerObj.id = data.id;
        }
      } catch (err) {
        console.warn('Supabase customer upsert notice:', err.message);
      }
    }

    // Save session locally
    try {
      localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(customerObj));

      // Update registry
      const rawReg = localStorage.getItem(CUSTOMER_REGISTRY_KEY);
      const registry = rawReg ? JSON.parse(rawReg) : {};
      registry[cleanPhone] = customerObj;
      localStorage.setItem(CUSTOMER_REGISTRY_KEY, JSON.stringify(registry));
    } catch (e) {
      console.warn('Failed to save customer session:', e);
    }

    return customerObj;
  },

  /**
   * Update Customer Profile (name, email, avatar, preferred_language)
   */
  async updateProfile(customerId, updates = {}) {
    const current = this.getCurrentCustomer();
    if (!current || current.id !== customerId) {
      throw new Error('Customer session not found.');
    }

    const updated = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Update Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('customers')
          .update({
            name: updated.name,
            email: updated.email,
            avatar: updated.avatar,
            preferred_language: updated.preferred_language,
          })
          .eq('id', customerId);
      } catch (err) {
        console.warn('Supabase profile update notice:', err.message);
      }
    }

    // Save session & registry
    try {
      localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(updated));
      if (updated.phone) {
        const rawReg = localStorage.getItem(CUSTOMER_REGISTRY_KEY);
        const registry = rawReg ? JSON.parse(rawReg) : {};
        registry[updated.phone] = updated;
        localStorage.setItem(CUSTOMER_REGISTRY_KEY, JSON.stringify(registry));
      }
    } catch (e) {
      console.warn('Failed to save updated profile:', e);
    }

    return updated;
  },

  /**
   * Logout Customer
   */
  logout() {
    try {
      localStorage.removeItem(CUSTOMER_SESSION_KEY);
    } catch (e) {
      console.warn('Error logging out customer:', e);
    }
  },

  /**
   * Delete Customer Account (with complete data removal)
   */
  async deleteAccount(customerId) {
    if (!customerId) return;
    const current = this.getCurrentCustomer();

    // 1. Delete from Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('customer_addresses').delete().eq('customer_id', customerId);
        await supabase.from('favorites').delete().eq('customer_id', customerId);
        await supabase.from('customers').delete().eq('id', customerId);
      } catch (err) {
        console.warn('Supabase delete account notice:', err.message);
      }
    }

    // 2. Clear local storage records
    try {
      localStorage.removeItem(CUSTOMER_SESSION_KEY);
      localStorage.removeItem(`${CUSTOMER_ADDRESSES_KEY}${customerId}`);
      localStorage.removeItem(`${CUSTOMER_FAVORITES_KEY}${customerId}`);

      if (current?.phone) {
        const rawReg = localStorage.getItem(CUSTOMER_REGISTRY_KEY);
        if (rawReg) {
          const registry = JSON.parse(rawReg);
          delete registry[current.phone];
          localStorage.setItem(CUSTOMER_REGISTRY_KEY, JSON.stringify(registry));
        }
      }
    } catch (e) {
      console.warn('Failed to clear local customer account data:', e);
    }

    return true;
  },

  /**
   * Get Customer Saved Addresses
   */
  async getAddresses(customerId) {
    if (!customerId) return [];

    // 1. Try Supabase
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('customer_addresses')
          .select('*')
          .eq('customer_id', customerId)
          .order('is_default', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          return data;
        }
      } catch (e) {
        console.warn('Error loading customer addresses from Supabase:', e.message);
      }
    }

    // 2. Fallback to LocalStorage
    try {
      const stored = localStorage.getItem(`${CUSTOMER_ADDRESSES_KEY}${customerId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Error loading local customer addresses:', e);
    }

    // Seed a sensible default address for instant great UX
    const defaultAddresses = [
      {
        id: `addr-1`,
        customer_id: customerId,
        label: 'Home',
        address: 'House #42, Street 8, Sector F-7/2, Islamabad',
        latitude: 33.721,
        longitude: 73.052,
        landmark: 'Near Safa Gold Mall',
        delivery_note: 'Ring bell twice, leave with guard at gate',
        is_default: true,
        created_at: new Date().toISOString(),
      },
    ];
    this.saveAddressesLocally(customerId, defaultAddresses);
    return defaultAddresses;
  },

  /**
   * Save or Add New Address
   * Features: Home/Work/Other, map pin, landmark, delivery note, set default.
   * Crucial rule: Use default address for nearby results and checkout autofill.
   */
  async saveAddress(customerId, addressData) {
    const current = await this.getAddresses(customerId);
    const isFirst = current.length === 0;

    const newAddr = {
      id: addressData.id || `addr_${Date.now()}`,
      customer_id: customerId,
      label: addressData.label || 'Home',
      address: addressData.address || '',
      latitude: addressData.latitude ? Number(Number(addressData.latitude).toFixed(4)) : null,
      longitude: addressData.longitude ? Number(Number(addressData.longitude).toFixed(4)) : null,
      landmark: addressData.landmark || '',
      delivery_note: addressData.delivery_note || addressData.deliveryNotes || '',
      is_default: addressData.is_default || isFirst,
      created_at: addressData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let updatedList;
    if (newAddr.is_default) {
      // Unset previous default
      updatedList = current.map((a) => ({ ...a, is_default: false }));
    } else {
      updatedList = [...current];
    }

    const existingIdx = updatedList.findIndex((a) => a.id === newAddr.id);
    if (existingIdx >= 0) {
      updatedList[existingIdx] = newAddr;
    } else {
      updatedList.unshift(newAddr);
    }

    // Try Supabase insert/update
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('customer_addresses').upsert({
          id: newAddr.id.startsWith('addr_') ? undefined : newAddr.id,
          customer_id: customerId,
          label: newAddr.label,
          address: newAddr.address,
          latitude: newAddr.latitude,
          longitude: newAddr.longitude,
          landmark: newAddr.landmark,
          delivery_note: newAddr.delivery_note,
          is_default: newAddr.is_default,
        });
      } catch (err) {
        console.warn('Supabase address save notice:', err.message);
      }
    }

    this.saveAddressesLocally(customerId, updatedList);

    // If marked default, sync to dinehq_customer_location for nearby search results & checkout prefill
    if (newAddr.is_default && newAddr.latitude && newAddr.longitude) {
      try {
        const locObj = {
          name: newAddr.landmark ? `${newAddr.landmark}, ${newAddr.label}` : (newAddr.address ? newAddr.address.slice(0, 32) : newAddr.label),
          lat: Number(Number(newAddr.latitude).toFixed(3)),
          lng: Number(Number(newAddr.longitude).toFixed(3)),
          address: newAddr.address,
          landmark: newAddr.landmark,
          delivery_note: newAddr.delivery_note,
          isDefaultAddress: true,
        };
        localStorage.setItem('dinehq_customer_location', JSON.stringify(locObj));
        // Remove skip flag if present
        localStorage.removeItem('dinehq_location_skipped');
      } catch (_) {}
    }

    return updatedList;
  },

  /**
   * Delete Address
   */
  async deleteAddress(customerId, addressId) {
    const current = await this.getAddresses(customerId);
    const updated = current.filter((a) => a.id !== addressId);

    // If deleted address was default and others remain, make first one default
    if (updated.length > 0 && !updated.some((a) => a.is_default)) {
      updated[0].is_default = true;
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('customer_addresses')
          .delete()
          .eq('id', addressId)
          .eq('customer_id', customerId);
      } catch (err) {
        console.warn('Supabase delete address notice:', err.message);
      }
    }

    this.saveAddressesLocally(customerId, updated);
    return updated;
  },

  saveAddressesLocally(customerId, addresses) {
    try {
      localStorage.setItem(`${CUSTOMER_ADDRESSES_KEY}${customerId}`, JSON.stringify(addresses));
    } catch (e) {
      console.warn('Failed to persist customer addresses locally:', e);
    }
  },

  /**
   * Get Customer Favorite Restaurant IDs
   */
  async getFavorites(customerId) {
    if (!customerId) return [];

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('favorites')
          .select('restaurant_id')
          .eq('customer_id', customerId);

        if (!error && Array.isArray(data)) {
          return data.map((f) => f.restaurant_id);
        }
      } catch (e) {
        console.warn('Supabase favorites load notice:', e.message);
      }
    }

    try {
      const stored = localStorage.getItem(`${CUSTOMER_FAVORITES_KEY}${customerId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Error reading local favorites:', e);
    }

    return ['rest-101']; // Default favorite
  },

  /**
   * Toggle Restaurant Favorite
   */
  async toggleFavorite(customerId, restaurantId) {
    const current = await this.getFavorites(customerId);
    const exists = current.includes(restaurantId);
    const updated = exists
      ? current.filter((id) => id !== restaurantId)
      : [...current, restaurantId];

    if (isSupabaseConfigured()) {
      try {
        if (exists) {
          await supabase
            .from('favorites')
            .delete()
            .eq('customer_id', customerId)
            .eq('restaurant_id', restaurantId);
        } else {
          await supabase.from('favorites').insert({
            customer_id: customerId,
            restaurant_id: restaurantId,
          });
        }
      } catch (err) {
        console.warn('Supabase toggle favorite notice:', err.message);
      }
    }

    try {
      localStorage.setItem(`${CUSTOMER_FAVORITES_KEY}${customerId}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Error saving local favorites:', e);
    }

    return updated;
  },

  /**
   * Fetch Orders placed by this customer across ANY restaurant in the marketplace
   */
  getCustomerOrders(customerPhone, customerId = null) {
    const cleanPhone = customerPhone ? customerPhone.replace(/\D/g, '') : '';
    const allStoredOrders = orderService.getAllOrdersAcrossRestaurants();

    return allStoredOrders.filter((o) => {
      // 1. Match by customer_id
      if (customerId && o.customer_id === customerId) return true;

      // 2. Match by customer_phone
      if (cleanPhone) {
        const orderPhone = (o.customer_phone || '').replace(/\D/g, '');
        return orderPhone && (orderPhone === cleanPhone || orderPhone.endsWith(cleanPhone) || cleanPhone.endsWith(orderPhone));
      }

      return false;
    });
  },
};
