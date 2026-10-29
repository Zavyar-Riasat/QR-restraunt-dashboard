/**
 * Dineflow PWA Service
 * Handles Service Worker registration, install prompts, offline detection,
 * Web Push / Background notifications, and Screen Wake Lock API.
 */

import { playKitchenChime } from './orderService.js';
import { formatPKR } from '../utils/currencyUtils.js';

class PWAService {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.wakeLockSentinel = null;
    this.isWakeLockActive = false;
    this.swRegistration = null;
    this.notificationPermission =
      typeof window !== 'undefined' && 'Notification' in window
        ? Notification.permission
        : 'default';

    this.installPromptListeners = new Set();
    this.networkListeners = new Set();
    this.wakeLockListeners = new Set();

    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  init() {
    // 1. Detect if running standalone (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');

    this.isInstalled = isStandalone;

    // 2. Listen to beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent browser default mini-infobar on mobile
      e.preventDefault();
      this.deferredPrompt = e;
      this.isInstalled = false;
      this.notifyInstallListeners();
    });

    // 3. Listen to appinstalled event
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.isInstalled = true;
      this.notifyInstallListeners();
      console.info('[Dineflow PWA] Dineflow was installed successfully.');
    });

    // 4. Online / Offline listeners
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyNetworkListeners(true);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyNetworkListeners(false);
    });

    // 5. Visibility change for Wake Lock re-acquisition
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.isWakeLockActive) {
        this.acquireWakeLock();
      }
    });

    // 6. Register Service Worker in production / local dev
    this.registerServiceWorker();
  }

  /**
   * Register Service Worker (Production only — never cache Vite dev modules on localhost)
   */
  async registerServiceWorker() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }

    const isLocalhost =
      Boolean(import.meta?.env?.DEV) ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.endsWith('.local');

    if (isLocalhost) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister()));
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map((name) => caches.delete(name)));
        }
      } catch  {}
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });
      this.swRegistration = registration;
      registration.update().catch(() => {});
      console.info('[Dineflow PWA] Service Worker registered with scope:', registration.scope);
      return registration;
    } catch (err) {
      console.warn('[Dineflow PWA] Service Worker registration failed:', err);
      return null;
    }
  }

  // -------------------------------------------------------------
  // INSTALL APP & PROMPT
  // -------------------------------------------------------------
  getCanInstall() {
    return Boolean(this.deferredPrompt) && !this.isInstalled;
  }

  getIsInstalled() {
    return this.isInstalled;
  }

  subscribeInstallPrompt(callback) {
    this.installPromptListeners.add(callback);
    callback({
      canInstall: this.getCanInstall(),
      isInstalled: this.isInstalled,
    });
    return () => this.installPromptListeners.delete(callback);
  }

  notifyInstallListeners() {
    const payload = {
      canInstall: this.getCanInstall(),
      isInstalled: this.isInstalled,
    };
    for (const listener of this.installPromptListeners) {
      try {
        listener(payload);
      } catch (err) {
        console.warn('Install listener error:', err);
      }
    }
  }

  /**
   * Prompt user to install Dineflow PWA
   */
  async promptInstall() {
    if (!this.deferredPrompt) {
      return { outcome: 'unavailable' };
    }

    try {
      this.deferredPrompt.prompt();
      const choiceResult = await this.deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        this.isInstalled = true;
      }
      this.deferredPrompt = null;
      this.notifyInstallListeners();
      return choiceResult;
    } catch (err) {
      console.warn('Install prompt error:', err);
      return { outcome: 'dismissed' };
    }
  }

  // -------------------------------------------------------------
  // ONLINE / OFFLINE DETECTION & BANNER
  // -------------------------------------------------------------
  subscribeNetworkStatus(callback) {
    this.networkListeners.add(callback);
    callback(this.isOnline);
    return () => this.networkListeners.delete(callback);
  }

  notifyNetworkListeners(status) {
    for (const listener of this.networkListeners) {
      try {
        listener(status);
      } catch (err) {
        console.warn('Network listener error:', err);
      }
    }
  }

  // -------------------------------------------------------------
  // SCREEN WAKE LOCK API (Keep POS Orders screen awake)
  // -------------------------------------------------------------
  isWakeLockSupported() {
    return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  }

  async acquireWakeLock() {
    if (!this.isWakeLockSupported()) {
      return false;
    }

    try {
      if (this.wakeLockSentinel && !this.wakeLockSentinel.released) {
        return true;
      }

      this.wakeLockSentinel = await navigator.wakeLock.request('screen');
      this.isWakeLockActive = true;

      this.wakeLockSentinel.addEventListener('release', () => {
        // If release was unexpected and still active, mark false
        if (this.wakeLockSentinel?.released) {
          this.wakeLockSentinel = null;
        }
        this.notifyWakeLockListeners(false);
      });

      this.notifyWakeLockListeners(true);
      return true;
    } catch (err) {
      // AbortError or NotAllowedError (e.g. low battery)
      console.info('[Dineflow PWA] Screen Wake Lock not available:', err.message);
      this.isWakeLockActive = false;
      this.notifyWakeLockListeners(false);
      return false;
    }
  }

  async releaseWakeLock() {
    this.isWakeLockActive = false;
    if (this.wakeLockSentinel && !this.wakeLockSentinel.released) {
      try {
        await this.wakeLockSentinel.release();
      } catch {
        // Ignore errors during release
      }
      this.wakeLockSentinel = null;
    }
    this.notifyWakeLockListeners(false);
  }

  subscribeWakeLock(callback) {
    this.wakeLockListeners.add(callback);
    callback(Boolean(this.wakeLockSentinel && !this.wakeLockSentinel.released));
    return () => this.wakeLockListeners.delete(callback);
  }

  notifyWakeLockListeners(isActive) {
    for (const listener of this.wakeLockListeners) {
      try {
        listener(isActive);
      } catch (err) {
        console.warn('Wake lock listener error:', err);
      }
    }
  }

  // -------------------------------------------------------------
  // WEB NOTIFICATIONS & BACKGROUND SOUND ALERTS
  // -------------------------------------------------------------
  isNotificationSupported() {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  getNotificationPermission() {
    if (!this.isNotificationSupported()) return 'unsupported';
    return Notification.permission;
  }

  async requestNotificationPermission() {
    if (!this.isNotificationSupported()) return 'unsupported';
    try {
      const permission = await Notification.requestPermission();
      this.notificationPermission = permission;
      return permission;
    } catch (err) {
      console.warn('Failed to request notification permission:', err);
      return 'denied';
    }
  }

  /**
   * Dispatch system notification and audible chime when a new order arrives
   */
  notifyNewOrder(order) {
    if (!order) return;

    // 1. Play kitchen sound alert
    try {
      playKitchenChime();
    } catch {
      // Audio context might be restricted
    }

    // 2. Dispatch system notification if permitted
    if (this.isNotificationSupported() && Notification.permission === 'granted') {
      const isDelivery = order.order_type === 'delivery';
      const isDineIn = order.order_type === 'dine_in';
      const typeLabel = isDelivery
        ? '🛵 Delivery'
        : isDineIn
        ? `🍽️ Table #${order.table_number || 'Walk-in'}`
        : '🥡 Takeaway';

      const title = `New ${typeLabel} Order #${order.id}`;
      const amountStr = formatPKR(order.total_payable || 0);
      const itemsCount = (order.items && order.items.length) || 1;
      const body = `${order.customer_name || 'Customer'} • ${itemsCount} item(s) • Total: ${amountStr}`;

      try {
        if (this.swRegistration && 'showNotification' in this.swRegistration) {
          this.swRegistration.showNotification(title, {
            body,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            tag: `dineflow-order-${order.id}`,
            renotify: true,
            data: { url: '/dashboard' },
            silent: false,
          });
        } else {
          new Notification(title, {
            body,
            icon: '/icons/icon-192.png',
            tag: `dineflow-order-${order.id}`,
          });
        }
      } catch (err) {
        console.info('Notification dispatch error:', err);
      }
    }
  }
}

export const pwaService = new PWAService();
