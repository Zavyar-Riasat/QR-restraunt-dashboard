/**
 * DineHQ Map & Tile Configuration
 * Centralized OpenStreetMap & Nominatim settings.
 * Single source of truth for tile URLs and attributions across the platform.
 */

// OpenStreetMap standard tile server configuration
export const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

// Required OpenStreetMap copyright attribution
export const ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>';

// Subdomains for load balancing
export const TILE_SUBDOMAINS = ['a', 'b', 'c'];

// Maximum tile zoom supported by OSM standard tiles
export const MAX_ZOOM = 19;

// Default city center fallback (Faisalabad / Lahore, Pakistan)
export const DEFAULT_FALLBACK_COORDS = {
  lat: 31.4187,
  lng: 73.0791,
};

// Default checkout & preview map zoom level
export const DEFAULT_MAP_ZOOM = 16;

/**
 * Generate free navigation link (no API key required)
 * Opens user's native phone navigation app / browser
 */
export const buildGoogleMapsNavUrl = (orderOrCoords) => {
  if (!orderOrCoords) return 'https://www.google.com/maps';

  const lat = orderOrCoords.latitude ?? (orderOrCoords.locationCoords?.lat ?? orderOrCoords.lat);
  const lng = orderOrCoords.longitude ?? (orderOrCoords.locationCoords?.lng ?? orderOrCoords.lng);

  if (lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
    return `https://www.google.com/maps/dir/?api=1&destination=${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}`;
  }

  const addr = orderOrCoords.customer_address || orderOrCoords.address || '';
  if (addr) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
  }

  return 'https://www.google.com/maps';
};

/**
 * Generate OpenStreetMap web view URL
 */
export const buildOsmNavUrl = (lat, lng, zoom = 18) => {
  if (lat == null || lng == null || isNaN(Number(lat)) || isNaN(Number(lng))) {
    return 'https://www.openstreetmap.org';
  }
  const cleanLat = Number(lat).toFixed(6);
  const cleanLng = Number(lng).toFixed(6);
  return `https://www.openstreetmap.org/?mlat=${cleanLat}&mlon=${cleanLng}#map=${zoom}/${cleanLat}/${cleanLng}`;
};

/**
 * Generate shareable location copy link
 */
export const buildShareableLocationLink = (lat, lng) => {
  if (lat == null || lng == null) return '';
  return `https://maps.google.com/?q=${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}`;
};
