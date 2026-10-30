import React, { createContext, useContext, useEffect, useMemo, useCallback } from 'react';

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
    profileSubtitle: 'Manage your name, contact email, and avatar',
    fullName: 'Full Name',
    phoneNumber: 'Phone Number',
    emailAddress: 'Email Address',
    avatarUrl: 'Avatar Photo URL',
    generateRandom: 'Generate Random',
    preferredLang: 'Language',
    englishLang: 'English',
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
};

export function LanguageProvider({ children }) {
  const _language = 'en';

  // Apply lang and dir attributes to root document
  useEffect(() => {
    try {
      document.documentElement.setAttribute('lang', 'en');
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.classList.remove('font-urdu');
      localStorage.setItem('dinehq_lang', 'en');
    } catch {
      // ignore
    }
  }, []);

  const setLanguage = useCallback(() => {}, []);
  const toggleLanguage = useCallback(() => {}, []);

  const t = useCallback((key) => {
    return TRANSLATIONS.en[key] || key;
  }, []);

  const value = useMemo(
    () => ({
      language: 'en',
      isUrdu: false,
      isRTL: false,
      setLanguage,
      toggleLanguage,
      t,
    }),
    [setLanguage, toggleLanguage, t]
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
