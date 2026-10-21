/**
 * Map Navigation Helper (Free, No API Key Required)
 * Re-exports navigation link generators from mapConfig.
 * All paid Google Maps APIs and script loaders have been removed and replaced with OpenStreetMap & Leaflet.
 */

export {
  buildGoogleMapsNavUrl,
  buildOsmNavUrl,
  buildShareableLocationLink,
  TILE_URL,
  ATTRIBUTION,
  DEFAULT_FALLBACK_COORDS,
  DEFAULT_MAP_ZOOM,
} from '../config/mapConfig.js';
