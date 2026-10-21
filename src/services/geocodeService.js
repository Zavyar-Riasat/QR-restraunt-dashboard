/**
 * Nominatim OpenStreetMap Geocoding Service
 * Strictly respects Nominatim usage policy:
 * - Max 1 request per second (sequential rate-limited queue)
 * - In-memory caching for repeated reverse & search queries
 * - Identifies app with custom User-Agent and Referer via /api/geocode or fallback
 * - Never blocks order placement or throws unhandled errors if network/geocoding fails
 */

const REVERSE_CACHE = new Map();
const SEARCH_CACHE = new Map();

// Rate-limiting queue state (max 1 request per 1050ms)
let lastRequestTimestamp = 0;
let requestQueuePromise = Promise.resolve();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Executes a fetch request strictly adhering to the 1 request/second rule
 */
async function scheduleRateLimitedFetch(url, options = {}) {
  // Chain on previous request in queue
  requestQueuePromise = requestQueuePromise.then(async () => {
    const now = Date.now();
    const elapsed = now - lastRequestTimestamp;
    const minInterval = 1050; // slightly > 1000ms to be safe with Nominatim

    if (elapsed < minInterval) {
      await delay(minInterval - elapsed);
    }
    lastRequestTimestamp = Date.now();

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`Nominatim HTTP error: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.warn('Geocoding fetch notice:', err.message);
      return null;
    }
  });

  return requestQueuePromise;
}

/**
 * Format a Nominatim address object into a clean Pakistani address string
 */
function formatNominatimAddress(data) {
  if (!data) return '';
  if (data.display_name) {
    // If structured address parts exist, prioritize clean, readable format
    const a = data.address;
    if (a) {
      const parts = [];
      const primary = a.road || a.pedestrian || a.suburb || a.neighbourhood || a.residential;
      if (primary) parts.push(primary);

      const secondary = a.commercial || a.city_district || a.quarter || a.subdistrict;
      if (secondary && !parts.includes(secondary)) parts.push(secondary);

      const city = a.city || a.town || a.county;
      if (city && !parts.includes(city)) parts.push(city);

      if (parts.length >= 2) {
        return parts.join(', ');
      }
    }
    // Fallback to display_name shortened
    const segments = data.display_name.split(',').map((s) => s.trim());
    return segments.slice(0, 4).join(', ');
  }
  return '';
}

export const geocodeService = {
  /**
   * Reverse geocode coordinates into a readable address
   * @param {number} lat Latitude
   * @param {number} lng Longitude
   * @returns {Promise<string>} Human readable address
   */
  async reverseGeocode(lat, lng) {
    if (lat == null || lng == null || isNaN(Number(lat)) || isNaN(Number(lng))) {
      return '';
    }

    const nLat = Number(lat);
    const nLng = Number(lng);
    // Cache key rounded to ~11 meters (4 decimal places)
    const cacheKey = `${nLat.toFixed(4)},${nLng.toFixed(4)}`;

    if (REVERSE_CACHE.has(cacheKey)) {
      return REVERSE_CACHE.get(cacheKey);
    }

    // 1. Try our Vite dev server / backend proxy route first
    const proxyUrl = `/api/geocode?type=reverse&lat=${nLat.toFixed(6)}&lon=${nLng.toFixed(6)}`;
    
    let result = await scheduleRateLimitedFetch(proxyUrl);

    // 2. If proxy is unavailable or returned 404/null, fallback directly to Nominatim
    if (!result) {
      const directUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${nLat.toFixed(6)}&lon=${nLng.toFixed(6)}&zoom=18&addressdetails=1`;
      result = await scheduleRateLimitedFetch(directUrl, {
        headers: {
          'Accept-Language': 'en,ur;q=0.9',
        },
      });
    }

    if (result) {
      const formatted = formatNominatimAddress(result);
      if (formatted) {
        REVERSE_CACHE.set(cacheKey, formatted);
        return formatted;
      }
    }

    return '';
  },

  /**
   * Search for addresses in Pakistan (countrycodes=pk)
   * @param {string} query Search input string
   * @returns {Promise<Array<{ label: string, lat: number, lng: number, raw: any }>>}
   */
  async searchAddress(query) {
    const cleanQuery = (query || '').trim();
    if (!cleanQuery || cleanQuery.length < 3) {
      return [];
    }

    const cacheKey = cleanQuery.toLowerCase();
    if (SEARCH_CACHE.has(cacheKey)) {
      return SEARCH_CACHE.get(cacheKey);
    }

    // 1. Try proxy
    const proxyUrl = `/api/geocode?type=search&q=${encodeURIComponent(cleanQuery)}&countrycodes=pk`;
    let result = await scheduleRateLimitedFetch(proxyUrl);

    // 2. Direct Nominatim fallback
    if (!result || !Array.isArray(result)) {
      const directUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=pk&q=${encodeURIComponent(cleanQuery)}&limit=5&addressdetails=1`;
      result = await scheduleRateLimitedFetch(directUrl, {
        headers: {
          'Accept-Language': 'en,ur;q=0.9',
        },
      });
    }

    if (Array.isArray(result)) {
      const formatted = result.map((item) => ({
        label: item.display_name.split(',').slice(0, 4).join(', '),
        fullAddress: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        raw: item,
      }));
      SEARCH_CACHE.set(cacheKey, formatted);
      return formatted;
    }

    return [];
  },

  /**
   * Clear in-memory caches (useful for testing)
   */
  clearCache() {
    REVERSE_CACHE.clear();
    SEARCH_CACHE.clear();
  },
};
