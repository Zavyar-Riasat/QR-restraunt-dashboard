/**
 * Rider Management Service for DineHQ
 * Manages restaurant delivery riders, fleet list, and order assignment.
 */

const RIDERS_STORAGE_PREFIX = 'dinehq_riders_';

const DEFAULT_STARTER_RIDERS = [
  {
    id: 'rdr-1',
    name: 'Muhammad Ali',
    phone: '0301-2345678',
    status: 'active',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'rdr-2',
    name: 'Zubair Ahmed',
    phone: '0321-9876543',
    status: 'active',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const riderService = {
  /**
   * Get all registered riders for a restaurant
   */
  getRiders(restaurantId = 'rest-101') {
    if (typeof window === 'undefined') return DEFAULT_STARTER_RIDERS;
    const storageKey = `${RIDERS_STORAGE_PREFIX}${restaurantId}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      // Seed default starter riders
      localStorage.setItem(storageKey, JSON.stringify(DEFAULT_STARTER_RIDERS));
      return DEFAULT_STARTER_RIDERS;
    } catch (e) {
      console.warn('Failed to load riders from localStorage:', e);
      return DEFAULT_STARTER_RIDERS;
    }
  },

  /**
   * Add a new delivery rider
   */
  addRider(restaurantId = 'rest-101', { name, phone }) {
    const cleanName = (name || '').trim();
    const cleanPhone = (phone || '').trim();

    if (!cleanName) throw new Error('Rider name is required.');
    if (!cleanPhone) throw new Error('Rider phone number is required.');

    const newRider = {
      id: `rdr-${Date.now()}`,
      name: cleanName,
      phone: cleanPhone,
      status: 'active',
      created_at: new Date().toISOString(),
    };

    const currentRiders = this.getRiders(restaurantId);
    const updated = [newRider, ...currentRiders];

    try {
      const storageKey = `${RIDERS_STORAGE_PREFIX}${restaurantId}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('dinehq_riders_updated', {
            detail: { restaurantId, riders: updated },
          })
        );
      }
    } catch (e) {
      console.warn('Failed to save rider to localStorage:', e);
    }

    return newRider;
  },

  /**
   * Delete a rider
   */
  deleteRider(restaurantId = 'rest-101', riderId) {
    const currentRiders = this.getRiders(restaurantId);
    const updated = currentRiders.filter((r) => r.id !== riderId);

    try {
      const storageKey = `${RIDERS_STORAGE_PREFIX}${restaurantId}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('dinehq_riders_updated', {
            detail: { restaurantId, riders: updated },
          })
        );
      }
    } catch (e) {
      console.warn('Failed to delete rider from localStorage:', e);
    }

    return updated;
  },
};
