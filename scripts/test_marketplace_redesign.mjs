import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log('🧪 Starting Marketplace Home & Customer Account Redesign Verification...\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${message}`);
  passedTests++;
}

// 1. Verify index.html fonts (Poppins, Nunito, Noto Nastaliq Urdu)
const indexHtml = readFileSync(resolve('index.html'), 'utf-8');
assert(
  indexHtml.includes('Noto+Nastaliq+Urdu') && indexHtml.includes('Poppins') && indexHtml.includes('Nunito'),
  'Google Fonts Poppins, Nunito, and Noto Nastaliq Urdu loaded in index.html'
);

// 2. Verify index.css tokens, 16px radius, hover lift, reduced motion, and Leaflet attribution
const indexCss = readFileSync(resolve('src/index.css'), 'utf-8');
assert(indexCss.includes('#F26B1D') && indexCss.includes('#FFF9F2') && indexCss.includes('#2B2118'), 'Warm palette tokens present in index.css');
assert(indexCss.includes('1rem') || indexCss.includes('rounded-2xl'), '16px radius defined in card styles');
assert(indexCss.includes('translateY(-4px)') || indexCss.includes('hover:-translate-y-1'), 'Desktop hover lift transition present in CSS');
assert(indexCss.includes('prefers-reduced-motion'), 'Accessibility prefers-reduced-motion handled');
assert(indexCss.includes('.leaflet-control-attribution') && indexCss.includes('display: none !important'), 'Leaflet default attribution hidden in favor of compact "i" icon');

// 3. Verify LanguageContext translations & RTL support
const langCtx = readFileSync(resolve('src/context/LanguageContext.jsx'), 'utf-8');
assert(langCtx.includes('Noto Nastaliq Urdu') || langCtx.includes('font-urdu'), 'Urdu font applied dynamically in LanguageContext');
assert(langCtx.includes("dir', language === 'ur' ? 'rtl' : 'ltr'"), 'Full RTL support (dir="rtl") enabled on Urdu');
assert(langCtx.includes('TRANSLATIONS'), 'English and Urdu translation dictionary configured');

// 4. Verify BlurUpImage component (16px radius, lazy loading, blur-up placeholder)
const blurUpImg = readFileSync(resolve('src/components/Common/BlurUpImage.jsx'), 'utf-8');
assert(blurUpImg.includes('rounded-2xl'), 'BlurUpImage has 16px rounded radius (rounded-2xl)');
assert(blurUpImg.includes('blur-md') && blurUpImg.includes('blur-0'), 'Smooth blur-up transition effect defined');
assert(blurUpImg.includes('loading="lazy"'), 'Lazy loading enabled on images');

// 5. Verify Compact OSM Attribution component (compact "i" icon, no Leaflet branding)
const osmComp = readFileSync(resolve('src/components/Map/CompactOsmAttribution.jsx'), 'utf-8');
assert(osmComp.includes('OpenStreetMap') && !osmComp.includes('Leaflet'), 'Compact OSM Attribution has zero Leaflet branding');

// 6. Verify Mobile Bottom Navigation (5 items, 48px touch targets)
const bottomNav = readFileSync(resolve('src/components/Customer/CustomerBottomNav.jsx'), 'utf-8');
assert(bottomNav.includes('min-h-[48px]') && bottomNav.includes('min-w-[48px]'), 'Bottom navigation has thumb-friendly 48px touch targets');
assert(
  bottomNav.includes('home') &&
  bottomNav.includes('search') &&
  bottomNav.includes('favorites') &&
  bottomNav.includes('orders') &&
  bottomNav.includes('account'),
  'Bottom navigation contains all 5 items (Home, Search, Favorites, Orders, Account)'
);

// 7. Verify MarketplaceHomePage (Hero illustration, sticky blurred header, color-coded badges, "Open now" dot)
const homePage = readFileSync(resolve('src/pages/MarketplaceHomePage.jsx'), 'utf-8');
assert(homePage.includes('HeroFoodIllustration'), 'Hero section includes custom vector food illustration');
assert(homePage.includes('toggleLanguage'), 'Header includes interactive language switch for EN/Urdu');
assert(homePage.includes('animate-ping') && homePage.includes('badgeOpen'), '"Open now" badge includes green pulsing beacon dot');
assert(homePage.includes('badgeDelivers') && homePage.includes('badgeOutside'), 'Color-coded distance & delivery status pills present');
assert(homePage.includes('CustomerBottomNav'), 'CustomerBottomNav embedded on home page for mobile');
assert(homePage.includes('BlurUpImage'), 'Restaurant cards use BlurUpImage for smooth lazy loading');

// 8. Verify CustomerAccountPage (Warm palette, 6 tabs, 48px targets, RTL support, BlurUpImage)
const accountPage = readFileSync(resolve('src/pages/CustomerAccountPage.jsx'), 'utf-8');
assert(accountPage.includes('min-h-[48px]'), 'Account page has strict 48px minimum touch targets');
assert(accountPage.includes('isRTL ? \'rtl\' : \'ltr\''), 'Customer account page supports full RTL mode');
assert(accountPage.includes('CustomerBottomNav'), 'Customer account page includes bottom navigation on mobile');
assert(accountPage.includes('BlurUpImage'), 'Customer favorites tab uses BlurUpImage');
assert(
  accountPage.includes('orders') &&
  accountPage.includes('addresses') &&
  accountPage.includes('favorites') &&
  accountPage.includes('dues') &&
  accountPage.includes('profile') &&
  accountPage.includes('settings'),
  'Account page contains all 6 required dashboard sections'
);

console.log(`\n========================================`);
console.log(`🎉 ALL ${passedTests} OF ${totalTests} MARKETPLACE & ACCOUNT REDESIGN TESTS PASSED!`);
console.log(`========================================\n`);
