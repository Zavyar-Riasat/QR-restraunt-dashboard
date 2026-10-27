import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

const LanguageContext = createContext(null);

export const TRANSLATIONS = {
  en: {
    // Navigation & Common
    appName: 'Dineflow',
    marketplace: 'Marketplace',
    home: 'Home',
    search: 'Search',
    favorites: 'Favorites',
    orders: 'Orders',
    account: 'Account',
    signIn: 'Sign in',
    signOut: 'Sign out',
    switchLanguage: 'Language',
    setLocation: 'Set Location',
    storeAdmin: 'Store Admin',
    loading: 'Loading...',

    // Hero Section
    heroBadge: 'Neighborhood Kitchens',
    heroTitlePrefix: 'Restaurants delivering to',
    heroTitleDefault: 'Explore Popular Restaurants',
    heroSubtitle: 'Fresh food ordered directly from kitchen menus with live rider tracking.',
    setMyLocationBtn: 'Set My Location',
    changeLocation: 'Change Location',
    locationNoticeTitle: 'Set your location to see the nearest restaurants',
    locationNoticeSubtitle: 'Showing restaurants sorted by city. Pin your area to unlock exact distance and delivery times.',

    // Search & Filters
    searchPlaceholder: 'Search restaurant, cuisine, or dish...',
    searchRestaurantsPlaceholder: 'Search restaurants, cuisines, or areas...',
    searchFoodPlaceholder: 'Search dishes, meals, snacks (e.g. Burger, Pizza, Karahi, Chai)...',
    searchBothPlaceholder: 'Search restaurants or dishes...',
    nearestToYou: 'Nearest to you',
    filters: 'Filters',
    moreCuisines: 'More',
    applyFilters: 'Apply Filters',
    orderType: 'Order Type',
    restaurantsTab: 'Restaurants',
    foodsTab: 'Food',
    food: 'Food',
    restaurantsNearYou: 'Restaurants near you',
    popularFoodNearYou: 'Popular food near you',
    orderDish: 'Order Dish',
    viewDish: 'View Dish',
    fromRestaurant: 'From',
    loadMoreFood: 'Load More Dishes',
    noFoodFoundTitle: 'No dishes found matching your search',
    noFoodFoundSubtitle: 'Try adjusting your search query, selecting another cuisine, or exploring all restaurants.',
    sortBy: 'Sort by:',
    sortPopular: 'Popular Dishes',
    sortNearest: 'Nearest First',
    sortOpenNow: 'Open Now First',
    sortFee: 'Lowest Delivery Fee',
    sortRating: 'Highest Rated',
    sortPriceAsc: 'Price: Low to High',
    sortPriceDesc: 'Price: High to Low',
    deliversToMe: 'Delivers to me',
    openNow: 'Open now',
    freeDelivery: 'Free delivery',
    pickup: 'Pickup',
    dineIn: 'Dine-in',
    allCuisines: 'All Cuisines',
    clearFilters: 'Clear All Filters',

    // Restaurant Card Badges
    badgeOpen: 'Open Now',
    badgeClosed: 'Closed',
    badgeDelivers: 'Delivers to you',
    badgeOutside: 'Outside delivery area',
    deliveryFee: 'Delivery',
    free: 'Free',
    minOrder: 'Min Order',
    km: 'km',
    prepTime: '20–30m',
    loadMore: 'Load More Restaurants',

    // Empty & Error States
    emptyNearbyTitle: 'No restaurants found nearby yet',
    emptyNearbySubtitle: 'We are expanding to this neighborhood rapidly! Try selecting another area or clearing filters.',
    searchAnotherArea: 'Search Another Area',
    saveFavoritesPromptTitle: 'Save Your Favorite Restaurants',
    saveFavoritesPromptSubtitle: 'Sign in to your customer account to bookmark your favorite spots and reorder in 1 tap.',
    signInToAccount: 'Sign In to Account',
    maybeLater: 'Maybe Later',

    // Customer Account
    myAccount: 'My Account',
    exploreRestaurants: 'Explore Restaurants',
    verifiedAccount: 'Verified Account',
    addNewAddress: 'Add New Address',

    // Account Tabs
    tabOrders: 'My Orders',
    tabAddresses: 'Saved Addresses',
    tabFavorites: 'Favorites',
    tabDues: 'Payments / Dues',
    tabProfile: 'Profile',
    tabSettings: 'Settings',

    // Profile Tab
    profileTitle: 'Customer Profile',
    profileSubtitle: 'Manage your name, contact email, avatar, and preferred language',
    fullName: 'Full Name',
    phoneNumber: 'Phone Number (Verified)',
    emailAddress: 'Email Address',
    avatarUrl: 'Avatar Photo URL',
    generateRandom: 'Generate Random',
    preferredLang: 'Preferred Language (ترجیحی زبان)',
    englishLang: 'English (US/UK)',
    urduLang: 'اردو (Urdu)',
    saveChanges: 'Save Profile Changes',
    saving: 'Saving...',
    profileUpdated: 'Profile updated successfully!',

    // Addresses Tab
    addressesTitle: 'Saved Delivery Addresses',
    addressesSubtitle: 'Your default address autofills checkout and calculates accurate delivery distance.',
    noAddressesTitle: 'No addresses saved yet',
    noAddressesSubtitle: 'Save your Home, Work, or Friends address to receive direct door delivery in minutes.',
    addFirstAddress: 'Add First Address',
    defaultAddress: 'Default Address',
    setAsDefault: 'Set as default',
    edit: 'Edit',
    delete: 'Delete',
    landmark: 'Landmark',
    note: 'Note',

    // Orders Tab
    ordersTitle: 'Order History & Live Status',
    ordersSubtitle: 'Live tracking tickets and past kitchen receipts across DineHQ',
    filterToday: 'Today',
    filterYesterday: 'Yesterday',
    filterMonth: 'This Month',
    filterCustom: 'Custom',
    from: 'From:',
    to: 'To:',
    noOrdersTitle: 'No orders found for this timeframe',
    noOrdersSubtitle: 'Whenever you order from any DineHQ restaurant, live tickets and past receipts will appear here.',
    startOrdering: 'Start Ordering',
    liveOrderTracking: 'Live Order Tracking',
    stepPlaced: 'Placed',
    stepCooking: 'Cooking',
    stepOnWay: 'On Way',
    stepDelivered: 'Delivered',
    totalBill: 'Total Bill',
    details: 'Details',
    reorder: 'Reorder',
    orderDetails: 'Order Details',
    itemsOrdered: 'Items Ordered:',
    subtotal: 'Subtotal',
    close: 'Close',

    // Favorites Tab
    favoritesTitle: 'Saved Favorite Restaurants',
    exploreMore: 'Explore more restaurants →',
    noFavoritesTitle: 'No favorite spots saved yet',
    noFavoritesSubtitle: 'Tap the heart icon on any restaurant in the marketplace to bookmark it here for quick reordering.',
    orderMenu: 'Order Menu',

    // Dues Tab
    duesTitle: 'Restaurant Payments & Customer Dues',
    duesSubtitle: 'Read-only khata statement maintained directly by restaurant billing desks.',
    totalOutstanding: 'Total Outstanding Balance',
    settlePrompt: 'Please settle pending amounts directly with the restaurant billing counter or during your next door delivery.',
    allClear: 'All clear! You have no outstanding balance due with any restaurant on the DineHQ network.',
    noDues: 'No recorded restaurant khata or pending balances found for your phone number.',
    totalOrdersCount: 'Total Orders',
    currentDue: 'Current Due',
    ledgerHistory: 'Ledger History (Debits & Payments):',

    // Settings Tab
    settingsTitle: 'Account Settings',
    settingsSubtitle: 'Manage session credentials and personal data removal',
    signOutDevice: 'Sign Out from This Device',
    signOutDeviceSubtitle: 'You can sign right back in anytime using your phone OTP.',
    dangerZone: 'Danger Zone: Delete Account',
    dangerZoneSubtitle: 'Permanently deletes your saved addresses, favorite spots, and profile records from DineHQ.',
    deleteAccountBtn: 'Delete My Account',
    deleteConfirmTitle: 'Delete Customer Account?',
    deleteConfirmSubtitle: 'This will permanently delete your account, saved delivery addresses, and favorite spots. This action cannot be undone.',
    yesDeleteAccount: 'Yes, Delete My Account',
    cancel: 'Cancel',

    // Map & Attribution
    mapAttribution: '© OpenStreetMap contributors',
    osmAttributionTooltip: 'Map attribution: © OpenStreetMap',
  },

  ur: {
    // Navigation & Common
    appName: 'ڈائن فلو',
    marketplace: 'مارکیٹ پلیس',
    home: 'ہوم',
    search: 'تلاش',
    favorites: 'پسندیدہ',
    orders: 'آرڈرز',
    account: 'اکاؤنٹ',
    signIn: 'سائن ان',
    signOut: 'لاگ آؤٹ',
    switchLanguage: 'زبان',
    setLocation: 'مقام سیٹ کریں',
    storeAdmin: 'اسٹور ایڈمن',
    loading: 'لوڈ ہو رہا ہے...',

    // Hero Section
    heroBadge: 'قریبی کچنز اور ریسٹورنٹس',
    heroTitlePrefix: 'ڈلیور کرنے والے ریسٹورنٹس برائے',
    heroTitleDefault: 'مشہور ریسٹورنٹس دریافت کریں',
    heroSubtitle: 'باورچی خانے سے سیدھا تازہ کھانا اور رائیڈر کی لائیو ٹریکنگ۔',
    setMyLocationBtn: 'میرا مقام منتخب کریں',
    changeLocation: 'مقام تبدیل کریں',
    locationNoticeTitle: 'سب سے قریبی ریسٹورنٹ دیکھنے کے لیے اپنا مقام منتخب کریں',
    locationNoticeSubtitle: 'شہر کے لحاظ سے ریسٹورنٹس دکھائے جا رہے ہیں۔ درست فاصلے اور وقت کے لیے اپنا علاقہ پن کریں۔',

    // Search & Filters
    searchPlaceholder: 'ریسٹورنٹ، ڈش یا کھانا تلاش کریں...',
    searchRestaurantsPlaceholder: 'ریسٹورنٹ، کھانے کی قسم یا علاقہ تلاش کریں...',
    searchFoodPlaceholder: 'پکوان تلاش کریں (مثال: برگر، پیزا، کڑاہی، چائے)...',
    searchBothPlaceholder: 'ریسٹورینٹس یا کھانے تلاش کریں...',
    nearestToYou: 'آپ کے قریب ترین',
    filters: 'فلٹرز',
    moreCuisines: 'مزید',
    applyFilters: 'فلٹرز لگائیں',
    orderType: 'آرڈر کی قسم',
    restaurantsTab: 'ریسٹورنٹس',
    foodsTab: 'کھانا',
    food: 'کھانا',
    restaurantsNearYou: 'آپ کے قریب ریسٹورنٹس',
    popularFoodNearYou: 'آپ کے قریب مقبول کھانا',
    orderDish: 'آرڈر کریں',
    viewDish: 'دیکھیں',
    fromRestaurant: 'از',
    loadMoreFood: 'مزید کھانے دیکھیں',
    noFoodFoundTitle: 'تلاش کے مطابق کوئی ڈش نہیں ملی',
    noFoodFoundSubtitle: 'تلاش میں تبدیلی کریں، کوئی اور قسم منتخب کریں یا تمام ریسٹورینٹس دیکھیں۔',
    sortBy: 'ترتیب دیں:',
    sortPopular: 'مقبول ترین کھانے',
    sortNearest: 'سب سے قریب',
    sortOpenNow: 'کھلا ہوا پہلے',
    sortFee: 'کم ترین ڈلیوری فیس',
    sortRating: 'بہترین ریٹنگ',
    sortPriceAsc: 'قیمت: کم سے زیادہ',
    sortPriceDesc: 'قیمت: زیادہ سے کم',
    deliversToMe: 'مجھے ڈلیور کرتا ہے',
    openNow: 'ابھی کھلا ہے',
    freeDelivery: 'مفت ڈلیوری',
    pickup: 'پک اپ',
    dineIn: 'ڈائن ان',
    allCuisines: 'تمام کھانے',
    clearFilters: 'تمام فلٹرز ختم کریں',

    // Restaurant Card Badges
    badgeOpen: 'کھلا ہے',
    badgeClosed: 'بند ہے',
    badgeDelivers: 'آپ کو ڈلیور کرتا ہے',
    badgeOutside: 'ڈلیوری کی حد سے باہر',
    deliveryFee: 'ڈلیوری',
    free: 'مفت',
    minOrder: 'کم از کم آرڈر',
    km: 'کلومیٹر',
    prepTime: '20–30 منٹ',
    loadMore: 'مزید ریسٹورنٹس دیکھیں',

    // Empty & Error States
    emptyNearbyTitle: 'اس وقت قریبی علاقے میں کوئی ریسٹورنٹ دستیاب نہیں',
    emptyNearbySubtitle: 'ہم تیزی سے اس علاقے میں سروس بڑھا رہے ہیں! کوئی دوسرا علاقہ منتخب کریں یا فلٹر تبدیل کریں۔',
    searchAnotherArea: 'دوسرا علاقہ تلاش کریں',
    saveFavoritesPromptTitle: 'اپنے پسندیدہ ریسٹورنٹس محفوظ کریں',
    saveFavoritesPromptSubtitle: 'اپنے پسندیدہ مقامات کو بک مارک کرنے اور ایک کلک میں دوبارہ آرڈر کرنے کے لیے سائن ان کریں۔',
    signInToAccount: 'اکاؤنٹ میں سائن ان کریں',
    maybeLater: 'بعد میں',

    // Customer Account
    myAccount: 'میرا اکاؤنٹ',
    exploreRestaurants: 'ریسٹورنٹس دیکھیں',
    verifiedAccount: 'تصدیق شدہ اکاؤنٹ',
    addNewAddress: 'نیا پتہ شامل کریں',

    // Account Tabs
    tabOrders: 'میرے آرڈرز',
    tabAddresses: 'محفوظ شدہ پتے',
    tabFavorites: 'پسندیدہ',
    tabDues: 'ادائیگیاں / کھاتہ',
    tabProfile: 'پروفائل',
    tabSettings: 'سیٹنگز',

    // Profile Tab
    profileTitle: 'کسٹمر پروفائل',
    profileSubtitle: 'اپنا نام، ای میل، تصویر اور ترجیحی زبان کا انتظام کریں',
    fullName: 'پورا نام',
    phoneNumber: 'فون نمبر (تصدیق شدہ)',
    emailAddress: 'ای میل ایڈریس',
    avatarUrl: 'تصویر کا لنک',
    generateRandom: 'بے ترتیب بنائیں',
    preferredLang: 'ترجیحی زبان',
    englishLang: 'English (انگریزی)',
    urduLang: 'اردو (Urdu)',
    saveChanges: 'تبدیلیاں محفوظ کریں',
    saving: 'محفوظ ہو رہا ہے...',
    profileUpdated: 'پروفائل کامیابی سے تبدیل ہو گیا!',

    // Addresses Tab
    addressesTitle: 'محفوظ شدہ ڈلیوری پتے',
    addressesSubtitle: 'آپ کا بنیادی پتہ خودکار طور پر چیک آؤٹ میں درج ہو جاتا ہے اور درست ڈلیوری فاصلہ ناپتا ہے۔',
    noAddressesTitle: 'ابھی تک کوئی پتہ محفوظ نہیں ہوا',
    noAddressesSubtitle: 'اپنے گھر، دفتر یا دوستوں کا پتہ محفوظ کریں تاکہ آرڈر براہ راست آپ کے دروازے پر پہنچ سکے۔',
    addFirstAddress: 'پہلا پتہ شامل کریں',
    defaultAddress: 'بنیادی پتہ',
    setAsDefault: 'بنیادی پتہ بنائیں',
    edit: 'تبدیل کریں',
    delete: 'حذف کریں',
    landmark: 'نشان دہی',
    note: 'ہدایت',

    // Orders Tab
    ordersTitle: 'آرڈرز کی تاریخ اور لائیو صورتحال',
    ordersSubtitle: 'ڈائن ایچ کیو کے لائیو آرڈر ٹریکنگ ٹکٹس اور پرانی رسیدیں',
    filterToday: 'آج',
    filterYesterday: 'کل',
    filterMonth: 'اس ماہ',
    filterCustom: 'اپنی مرضی',
    from: 'شروع:',
    to: 'اختتام:',
    noOrdersTitle: 'اس مدت کے دوران کوئی آرڈر نہیں ملا',
    noOrdersSubtitle: 'جب بھی آپ ڈائن ایچ کیو کے کسی ریسٹورنٹ سے آرڈر کریں گے تو لائیو ٹکٹ اور رسید یہاں نظر آئے گی۔',
    startOrdering: 'آرڈر شروع کریں',
    liveOrderTracking: 'لائیو آرڈر ٹریکنگ',
    stepPlaced: 'موصول',
    stepCooking: 'تیار ہو رہا ہے',
    stepOnWay: 'راستے میں',
    stepDelivered: 'پہنچ گیا',
    totalBill: 'کل رقم',
    details: 'تفصیلات',
    reorder: 'دوبارہ آرڈر',
    orderDetails: 'آرڈر کی تفصیلات',
    itemsOrdered: 'آرڈر کیے گئے آئٹمز:',
    subtotal: 'ذیلی کل',
    close: 'بند کریں',

    // Favorites Tab
    favoritesTitle: 'محفوظ شدہ پسندیدہ ریسٹورنٹس',
    exploreMore: 'مزید ریسٹورنٹس دریافت کریں ←',
    noFavoritesTitle: 'کوئی پسندیدہ مقام محفوظ نہیں',
    noFavoritesSubtitle: 'کسی بھی ریسٹورنٹ کے دل کے آئیکن پر کلک کر کے اسے فوری آرڈر کے لیے یہاں محفوظ کریں۔',
    orderMenu: 'مینو سے آرڈر کریں',

    // Dues Tab
    duesTitle: 'ریسٹورنٹ ادائیگیاں اور کھاتہ',
    duesSubtitle: 'صرف پڑھنے کے لیے کھاتہ اسٹیٹمنٹ جو ریسٹورنٹ کاؤنٹر سے براہ راست اپ ڈیٹ ہوتا ہے۔',
    totalOutstanding: 'کل واجب الادا رقم',
    settlePrompt: 'براہ کرم واجب الادا رقم براہ راست ریسٹورنٹ کاؤنٹر پر یا اگلی ڈلیوری پر ادا کریں۔',
    allClear: 'کوئی بقایا نہیں! ڈائن ایچ کیو نیٹ ورک کے کسی ریسٹورنٹ پر آپ کا کوئی واجب الادا بل نہیں ہے۔',
    noDues: 'آپ کے فون نمبر کے لیے کوئی بقایا کھاتہ ریکارڈ نہیں پایا گیا۔',
    totalOrdersCount: 'کل آرڈرز',
    currentDue: 'موجودہ بقایا',
    ledgerHistory: 'کھاتہ کی تاریخ (ڈیبٹ اور ادائیگیاں):',

    // Settings Tab
    settingsTitle: 'اکاؤنٹ سیٹنگز',
    settingsSubtitle: 'سیشن کی معلومات اور ذاتی ڈیٹا کا خاتمہ',
    signOutDevice: 'اس ڈیوائس سے لاگ آؤٹ کریں',
    signOutDeviceSubtitle: 'آپ کسی بھی وقت اپنے فون کے او ٹی پی کے ذریعے دوبارہ سائن ان کر سکتے ہیں۔',
    dangerZone: 'خطرہ: اکاؤنٹ ختم کریں',
    dangerZoneSubtitle: 'ڈائن ایچ کیو سے آپ کے محفوظ پتے، پسندیدہ مقامات اور ریکارڈز ہمیشہ کے لیے ختم ہو جائیں گے۔',
    deleteAccountBtn: 'میرا اکاؤنٹ ختم کریں',
    deleteConfirmTitle: 'کسٹمر اکاؤنٹ ختم کریں؟',
    deleteConfirmSubtitle: 'اس سے آپ کا اکاؤنٹ، محفوظ پتے اور پسندیدہ مقامات مستقل طور پر ختم ہو جائیں گے۔ یہ عمل واپس نہیں ہو سکتا۔',
    yesDeleteAccount: 'ہاں، میرا اکاؤنٹ ختم کریں',
    cancel: 'منسوخ کریں',

    // Map & Attribution
    mapAttribution: '© اوپن اسٹریٹ میپ تعاون کنندگان',
    osmAttributionTooltip: 'نقشہ کریڈٹ: اوپن اسٹریٹ میپ',
  },
};

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem('dinehq_lang');
      if (saved === 'ur' || saved === 'en') return saved;
    } catch {
      // ignore
    }
    return 'en';
  });

  // Apply lang and dir attributes to root document
  useEffect(() => {
    try {
      document.documentElement.setAttribute('lang', language);
      document.documentElement.setAttribute('dir', language === 'ur' ? 'rtl' : 'ltr');
      if (language === 'ur') {
        document.documentElement.classList.add('font-urdu');
      } else {
        document.documentElement.classList.remove('font-urdu');
      }
      localStorage.setItem('dinehq_lang', language);
    } catch {
      // ignore
    }
  }, [language]);

  const setLanguage = useCallback((lang) => {
    if (lang === 'ur' || lang === 'en') {
      setLanguageState(lang);
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => (prev === 'ur' ? 'en' : 'ur'));
  }, []);

  const t = useCallback(
    (key) => {
      const dict = TRANSLATIONS[language] || TRANSLATIONS.en;
      return dict[key] || TRANSLATIONS.en[key] || key;
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      isUrdu: language === 'ur',
      isRTL: language === 'ur',
      setLanguage,
      toggleLanguage,
      t,
    }),
    [language, setLanguage, toggleLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Safe fallback if used outside LanguageProvider
    return {
      language: 'en',
      isUrdu: false,
      isRTL: false,
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: (k) => TRANSLATIONS.en[k] || k,
    };
  }
  return context;
}
