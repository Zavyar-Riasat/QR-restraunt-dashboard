/**
 * Application Configuration & Reserved Slugs
 * All base URLs are derived from environment variables or relative window origin (no hardcoded localhost).
 */

export const RESERVED_SLUGS = [
  'admin',
  'account',
  'superadmin',
  'login',
  'api',
  'explore',
  'rider',
  'menu',
  'dashboard',
  'settings',
  'checkout',
  'cart',
  'orders',
  'help',
  'terms',
  'privacy',
];

/**
 * Checks if a given slug is reserved by the platform
 * @param {string} slug 
 * @returns {boolean}
 */
export function isReservedSlug(slug) {
  if (!slug) return false;
  const normalized = String(slug).trim().toLowerCase();
  return RESERVED_SLUGS.includes(normalized);
}

/**
 * Get the application's base URL dynamically from environment variable or window location.
 * Eliminates all hardcoded localhost references.
 * @returns {string}
 */
export function getAppBaseUrl() {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_URL) {
    return import.meta.env.VITE_APP_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}

/**
 * Format a relative path into a full absolute URL if needed (e.g. for QR codes)
 * @param {string} relativePath 
 * @returns {string}
 */
export function buildAppUrl(relativePath = '') {
  const base = getAppBaseUrl();
  const cleanPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${base}${cleanPath}`;
}
