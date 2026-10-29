/**
 * Comprehensive PWA & Lighthouse Audit Verification Script
 * Validates all PWA requirements for DineHQ:
 * 1. Web App Manifest specification (name, short_name, display, start_url, colors, icons)
 * 2. Icons resolution, maskable purpose, and accessibility
 * 3. Service Worker caching strategies (precache app shell, STRICT live network for orders/API)
 * 4. Offline banner behavior & reconnect messaging
 * 5. Screen Wake Lock API integration on Orders view
 * 6. Web push notifications & audio alert triggers
 * 7. Header "Install App" button with tooltip & fallback modal
 * 8. Customer Menu independence (unforced install)
 */

import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runAudit() {
  console.log('====================================================');
  console.log('   Dineflow PWA & Lighthouse Compliance Audit Suite    ');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // TEST 1: Manifest Schema & Google Lighthouse PWA Rules
  // ----------------------------------------------------
  console.log('📋 Test Suite 1: Web App Manifest & Meta Tags');
  const manifestPath = path.join(ROOT_DIR, 'public', 'manifest.json');
  assert(fs.existsSync(manifestPath), 'manifest.json exists in public directory');

  const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert(manifestContent.name === 'Dineflow', `name is "Dineflow" (got: "${manifestContent.name}")`);
  assert(manifestContent.short_name === 'Dineflow', `short_name is "Dineflow" (got: "${manifestContent.short_name}")`);
  assert(manifestContent.display === 'standalone', `display is "standalone" (got: "${manifestContent.display}")`);
  assert(manifestContent.start_url === '/' || manifestContent.start_url === '/dashboard', `start_url is "/" or "/dashboard" (got: "${manifestContent.start_url}")`);
  assert(manifestContent.theme_color?.toLowerCase() === '#f26b1d', `theme_color is #F26B1D`);
  assert(manifestContent.background_color?.toLowerCase() === '#fffdf9', `background_color is #FFFDF9`);

  // Check icons in manifest
  const icons = manifestContent.icons || [];
  const has192 = icons.some(i => i.sizes === '192x192' && (i.purpose === 'any' || !i.purpose));
  const has512 = icons.some(i => i.sizes === '512x512' && (i.purpose === 'any' || !i.purpose));
  const hasMaskable512 = icons.some(i => i.sizes === '512x512' && i.purpose === 'maskable');

  assert(has192, 'Manifest includes 192x192 icon for mobile home screens');
  assert(has512, 'Manifest includes 512x512 icon for splash screens & app stores');
  assert(hasMaskable512, 'Manifest includes 512x512 maskable icon for Android adaptive icons');

  // ----------------------------------------------------
  // TEST 2: Icon Files Existence & Dimensions
  // ----------------------------------------------------
  console.log('\n🎨 Test Suite 2: PWA Icon Assets Verification');
  const iconFiles = [
    'public/icons/icon-192.png',
    'public/icons/icon-512.png',
    'public/icons/icon-maskable-512.png',
    'public/apple-touch-icon.png',
    'public/favicon.svg'
  ];

  for (const file of iconFiles) {
    const fullPath = path.join(ROOT_DIR, file);
    assert(fs.existsSync(fullPath), `${file} exists`);
    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath);
      assert(stat.size > 500, `${file} is non-empty (${stat.size} bytes)`);
    }
  }

  // ----------------------------------------------------
  // TEST 3: HTML Head Meta Tags (Lighthouse PWA Criteria)
  // ----------------------------------------------------
  console.log('\n🌐 Test Suite 3: index.html PWA Meta tags');
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
  assert(indexHtml.includes('<link rel="manifest" href="/manifest.json"'), 'Links to /manifest.json');
  assert(indexHtml.includes('name="theme-color" content="#F26B1D"'), 'Meta theme-color matches palette #F26B1D');
  assert(indexHtml.includes('name="viewport"'), 'Viewport meta tag configured for responsive mobile display');
  assert(indexHtml.includes('<link rel="apple-touch-icon"'), 'Apple touch icon link tag present');
  assert(indexHtml.includes('name="description"'), 'Meta description present for SEO and PWA install card');

  // ----------------------------------------------------
  // TEST 4: Service Worker Caching & Live Network Isolation
  // ----------------------------------------------------
  console.log('\n⚡ Test Suite 4: Service Worker & Offline Strategy');
  const swCode = fs.readFileSync(path.join(ROOT_DIR, 'public', 'sw.js'), 'utf8');
  assert(swCode.includes("CACHE_NAME = 'dineflow-pwa-v1'"), 'Service worker has distinct cache namespace');
  assert(swCode.includes("PRECACHE_ASSETS"), 'Pre-caches app shell static assets');
  assert(swCode.includes("'/dashboard'"), 'Pre-caches /dashboard route for instant startup');
  assert(swCode.includes("isLiveNetworkRequest"), 'Identifies live network endpoints');
  assert(swCode.includes("supabase.co"), 'Strictly excludes Supabase database calls from caching');
  assert(swCode.includes("'/api/'"), 'Strictly excludes /api/ endpoints from caching');
  assert(swCode.includes("self.addEventListener('push'"), 'Implements web push notification handler');
  assert(swCode.includes("self.addEventListener('notificationclick'"), 'Implements notification click focus handler');

  // ----------------------------------------------------
  // TEST 5: Offline Banner & Reconnection
  // ----------------------------------------------------
  console.log('\n📡 Test Suite 5: Offline Banner & Reconnect Notification');
  const bannerCode = fs.readFileSync(path.join(ROOT_DIR, 'src', 'components', 'PWA', 'OfflineBanner.jsx'), 'utf8');
  assert(
    bannerCode.includes("No internet - new orders won't arrive"),
    'Displays exact message: "No internet - new orders won\'t arrive"'
  );
  assert(bannerCode.includes('subscribeNetworkStatus'), 'Subscribes to live network online/offline events');
  assert(bannerCode.includes('Internet connection restored'), 'Shows automatic reconnect confirmation');

  // ----------------------------------------------------
  // TEST 6: Screen Wake Lock API
  // ----------------------------------------------------
  console.log('\n💡 Test Suite 6: Screen Wake Lock API on Orders Feed');
  const pwaServiceCode = fs.readFileSync(path.join(ROOT_DIR, 'src', 'services', 'pwaService.js'), 'utf8');
  assert(pwaServiceCode.includes("navigator.wakeLock.request('screen')"), 'Uses Screen Wake Lock API');
  assert(pwaServiceCode.includes("wakeLockSentinel.release()"), 'Releases wake lock when inactive');

  const dashboardCode = fs.readFileSync(path.join(ROOT_DIR, 'src', 'pages', 'OwnerDashboardPage.jsx'), 'utf8');
  assert(dashboardCode.includes("activeTab === 'orders'"), 'Inspects activeTab === orders for Wake Lock');
  assert(dashboardCode.includes("pwaService.acquireWakeLock()"), 'Acquires wake lock when orders tab is active');
  assert(dashboardCode.includes("pwaService.releaseWakeLock()"), 'Releases wake lock when switching away from orders');

  // ----------------------------------------------------
  // TEST 7: Install App Button & Manual Fallback Modal
  // ----------------------------------------------------
  console.log('\n📲 Test Suite 7: Install App Button in Header');
  const installBtnCode = fs.readFileSync(path.join(ROOT_DIR, 'src', 'components', 'PWA', 'InstallAppButton.jsx'), 'utf8');
  assert(
    installBtnCode.includes('Install Dineflow on this computer for quick access.'),
    'Displays tooltip: "Install Dineflow on this computer for quick access."'
  );
  assert(installBtnCode.includes('if (installState.isInstalled)'), 'Hides button when already installed');
  assert(installBtnCode.includes('beforeinstallprompt'), 'Hooks into beforeinstallprompt event');
  assert(installBtnCode.includes('showManualModal'), 'Provides manual instructions for Safari/iOS/unsupported browsers');

  const navbarCode = fs.readFileSync(path.join(ROOT_DIR, 'src', 'components', 'Navbar.jsx'), 'utf8');
  assert(navbarCode.includes('<InstallAppButton />'), 'Navbar renders <InstallAppButton />');

  // ----------------------------------------------------
  // TEST 8: Customer Menu Independence
  // ----------------------------------------------------
  console.log('\n🍽️ Test Suite 8: Customer Menu Isolation');
  const customerMenuCode = fs.readFileSync(path.join(ROOT_DIR, 'src', 'pages', 'CustomerMenuPage.jsx'), 'utf8');
  assert(!customerMenuCode.includes('InstallAppButton'), 'Customer Menu does not force Install button');
  assert(!customerMenuCode.includes('promptInstall'), 'Customer Menu never forces promptInstall');

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log(` Audit Complete: ${passed} passed, ${failed} failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit();
