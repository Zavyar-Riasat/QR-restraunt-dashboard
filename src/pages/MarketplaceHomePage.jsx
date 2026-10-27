import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { marketplaceService } from '../services/marketplaceService.js';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import CustomerLocationModal from '../components/Customer/CustomerLocationModal.jsx';
import CustomerCartDrawer from '../components/CustomerCartDrawer.jsx';
import CustomerBottomNav from '../components/Customer/CustomerBottomNav.jsx';
import BlurUpImage from '../components/Common/BlurUpImage.jsx';
import { HeroFoodIllustration, EmptyStateIllustration } from '../components/Common/Illustrations.jsx';
import { formatPKR } from '../utils/currencyUtils.js';
import {
  Search,
  MapPin,
  Clock,
  Star,
  Heart,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  LogIn,
  Globe,
  SlidersHorizontal,
  Truck,
  ShoppingBag,
  Store,
  UtensilsCrossed,
  Sun,
  Moon,
  Plus,
  Eye,
  CheckCircle2,
} from 'lucide-react';

// Cuisine categories for Restaurants mode
const RESTAURANT_CUISINES = [
  { id: 'ALL', labelEn: 'All Cuisines', labelUr: 'تمام کھانے', icon: '🍽️' },
  { id: 'Burgers', labelEn: 'Burgers', labelUr: 'برگرز', icon: '🍔' },
  { id: 'Pizza', labelEn: 'Pizza', labelUr: 'پیزا', icon: '🍕' },
  { id: 'Desi', labelEn: 'Desi', labelUr: 'دیسی', icon: '🥘' },
  { id: 'BBQ', labelEn: 'BBQ', labelUr: 'باربی کیو', icon: '🍢' },
  { id: 'Chinese', labelEn: 'Chinese', labelUr: 'چائنیز', icon: '🥡' },
  { id: 'Desserts', labelEn: 'Desserts', labelUr: 'میٹھے', icon: '🍦' },
];

const MORE_RESTAURANT_CUISINES = [
  { id: 'Fast Food', labelEn: 'Fast Food', labelUr: 'فاسٹ فوڈ', icon: '🍟' },
  { id: 'Cafe', labelEn: 'Cafe & Bakery', labelUr: 'کیفے و بیکری', icon: '☕' },
  { id: 'Salads', labelEn: 'Healthy & Bowls', labelUr: 'سلاد و باؤلز', icon: '🥗' },
];

// Food categories for Food mode:
// Burgers, Pizza, Biryani, Karahi, BBQ, Shakes, Desserts, Drinks, Sides, Deals
const FOOD_CATEGORIES = [
  { id: 'ALL', labelEn: 'All Food', labelUr: 'تمام کھانا', icon: '🍽️' },
  { id: 'Burgers', labelEn: 'Burgers', labelUr: 'برگرز', icon: '🍔' },
  { id: 'Pizza', labelEn: 'Pizza', labelUr: 'پیزا', icon: '🍕' },
  { id: 'Biryani', labelEn: 'Biryani', labelUr: 'بریانی', icon: '🍚' },
  { id: 'Karahi', labelEn: 'Karahi', labelUr: 'کڑاہی', icon: '🥘' },
  { id: 'BBQ', labelEn: 'BBQ', labelUr: 'باربی کیو', icon: '🍢' },
  { id: 'Shakes', labelEn: 'Shakes', labelUr: 'شیکس', icon: '🥤' },
  { id: 'Desserts', labelEn: 'Desserts', labelUr: 'میٹھے', icon: '🍨' },
  { id: 'Drinks', labelEn: 'Drinks', labelUr: 'مشروبات', icon: '🧃' },
  { id: 'Sides', labelEn: 'Sides', labelUr: 'سائیڈز', icon: '🍟' },
  { id: 'Deals', labelEn: 'Deals', labelUr: 'ڈیلز', icon: '🏷️' },
];

const MORE_FOOD_CATEGORIES = [
  { id: 'Sides', labelEn: 'Sides & Fries', labelUr: 'سائیڈز', icon: '🍟' },
  { id: 'Deals', labelEn: 'Deals & Combos', labelUr: 'ڈیلز', icon: '🏷️' },
  { id: 'Shakes', labelEn: 'Shakes & Chillers', labelUr: 'شیکس', icon: '🥤' },
  { id: 'Fast Food', labelEn: 'Fast Food', labelUr: 'فاسٹ فوڈ', icon: '🍗' },
  { id: 'Pasta', labelEn: 'Pastas & Italian', labelUr: 'پاستا', icon: '🍝' },
  { id: 'Salads', labelEn: 'Healthy Bowls', labelUr: 'سلاد', icon: '🥗' },
];

const formatCuisineWords = (store) => {
  if (Array.isArray(store.cuisine_types) && store.cuisine_types.length > 0) {
    return store.cuisine_types.slice(0, 2).join(' • ');
  }
  if (Array.isArray(store.cuisines) && store.cuisines.length > 0) {
    return store.cuisines.slice(0, 2).join(' • ');
  }
  return store.cuisine || 'Multi-Cuisine';
};

export default function MarketplaceHomePage() {
  const navigate = useNavigate();
  const { customer, favorites, toggleFavorite, addresses, isCustomerAuthenticated, saveAddress } = useCustomerAuth();
  const { user } = useAuth();
  const { t, language, isUrdu, isRTL, toggleLanguage } = useLanguage();
  const searchInputRef = useRef(null);
  const morePopoverRef = useRef(null);
  const moreButtonRef = useRef(null);
  const categoryRowRef = useRef(null);

  // -------------------------------------------------------------
  // 1. Home Mode State: "restaurants" or "food"
  // Default is 'restaurants'; persisted in localStorage
  // -------------------------------------------------------------
  const [homeMode, setHomeMode] = useState(() => {
    try {
      const saved = localStorage.getItem('dinehq_home_mode');
      return saved === 'food' || saved === 'restaurants' ? saved : 'restaurants';
    } catch {
      return 'restaurants';
    }
  });

  const handleModeChange = (mode) => {
    setHomeMode(mode);
    try {
      localStorage.setItem('dinehq_home_mode', mode);
    } catch (_) {}
    setSelectedCategory('ALL');
    setIsMoreCategoryOpen(false);
  };

  // Category Row Horizontal Scroll Navigation State
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [popoverPlacement, setPopoverPlacement] = useState('top'); // 'top' or 'bottom'

  const updateScrollButtons = useCallback(() => {
    if (!categoryRowRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = categoryRowRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  }, []);

  const scrollCategoryRow = (delta) => {
    if (!categoryRowRef.current) return;
    categoryRowRef.current.scrollBy({ left: delta, behavior: 'smooth' });
    setTimeout(updateScrollButtons, 350);
  };

  // Auto-detect category row overflow immediately on mount, mode change, and window resize
  useEffect(() => {
    const el = categoryRowRef.current;
    if (!el) return;

    updateScrollButtons();
    const t1 = setTimeout(updateScrollButtons, 60);
    const t2 = setTimeout(updateScrollButtons, 250);

    const handleResize = () => updateScrollButtons();
    window.addEventListener('resize', handleResize);

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateScrollButtons();
      });
      resizeObserver.observe(el);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [homeMode, updateScrollButtons]);

  // Smooth horizontal scroll via mouse wheel over chips row
  useEffect(() => {
    const el = categoryRowRef.current;
    if (!el) return;

    const onWheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        if (
          (e.deltaY > 0 && el.scrollLeft + el.clientWidth < el.scrollWidth - 2) ||
          (e.deltaY < 0 && el.scrollLeft > 2)
        ) {
          e.preventDefault();
          el.scrollBy({ left: e.deltaY, behavior: 'auto' });
          updateScrollButtons();
        }
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [updateScrollButtons]);

  // -------------------------------------------------------------
  // Theme State: Default warm light theme (#FFF9F2), dark only when toggled
  // -------------------------------------------------------------
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('dinehq_theme') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      localStorage.setItem('dinehq_theme', nextTheme);
    } catch (_) {}
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // -------------------------------------------------------------
  // Location State & First-visit Modal
  // Default demo location: Near Safa Gold Mall, Islamabad (lat: 33.721, lng: 73.052)
  // -------------------------------------------------------------
  const [customerLocation, setCustomerLocation] = useState(() => {
    try {
      const saved = localStorage.getItem('dinehq_customer_location');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.name) {
          return {
            name: parsed.name,
            lat: parsed.lat != null ? parsed.lat : 33.721,
            lng: parsed.lng != null ? parsed.lng : 73.052,
            isGps: Boolean(parsed.isGps),
          };
        }
      }
    } catch {
      // ignore
    }
    return {
      name: 'Near Safa Gold Mall, Islamabad',
      lat: 33.721,
      lng: 73.052,
    };
  });

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [modalInitialView, setModalInitialView] = useState('prompt');
  const [showSignInFavModal, setShowSignInFavModal] = useState(false);

  // Cart conflict modal & Toast feedback states
  const [cartConflictItem, setCartConflictItem] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Active Cart State (Drawer, Items, and Badge count)
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [activeCartItems, setActiveCartItems] = useState([]);
  const [activeCartSlug, setActiveCartSlug] = useState(null);
  const [activeCartName, setActiveCartName] = useState(null);

  const refreshActiveCart = useCallback(() => {
    try {
      const slug = localStorage.getItem('dinehq_active_cart_slug');
      const name = localStorage.getItem('dinehq_active_cart_name');
      if (slug) {
        const raw = localStorage.getItem(`dinehq_cart_${slug}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setActiveCartItems(parsed);
            setActiveCartSlug(slug);
            setActiveCartName(name || 'Restaurant');
            return;
          }
        }
      }
      setActiveCartItems([]);
      setActiveCartSlug(null);
      setActiveCartName(null);
    } catch {
      setActiveCartItems([]);
    }
  }, []);

  useEffect(() => {
    refreshActiveCart();
    const handleCartSync = () => refreshActiveCart();
    window.addEventListener('storage', handleCartSync);
    window.addEventListener('dinehq_cart_updated', handleCartSync);
    return () => {
      window.removeEventListener('storage', handleCartSync);
      window.removeEventListener('dinehq_cart_updated', handleCartSync);
    };
  }, [refreshActiveCart]);

  const totalCartCount = activeCartItems.reduce((acc, it) => acc + (it.quantity || 1), 0);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filter Drawer & More Categories state
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isMoreCategoryOpen, setIsMoreCategoryOpen] = useState(false);

  // Toggle "More" popover with smart placement detection (opens UP if near bottom fold)
  const handleToggleMorePopover = () => {
    if (!isMoreCategoryOpen && moreButtonRef.current) {
      const rect = moreButtonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // If space below is less than 320px and space above is greater than 200px, open upwards!
      if (spaceBelow < 320 && rect.top > 200) {
        setPopoverPlacement('top');
      } else {
        setPopoverPlacement('bottom');
      }
    }
    setIsMoreCategoryOpen((prev) => !prev);
  };

  // Close "More" popover on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        morePopoverRef.current &&
        !morePopoverRef.current.contains(event.target) &&
        !moreButtonRef.current?.contains(event.target)
      ) {
        setIsMoreCategoryOpen(false);
      }
    }
    if (isMoreCategoryOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMoreCategoryOpen]);

  // First visit location prompt if not set
  useEffect(() => {
    const hasSavedLocation = localStorage.getItem('dinehq_customer_location');
    const hasSkipped = localStorage.getItem('dinehq_location_skipped');

    if (!hasSavedLocation && !hasSkipped) {
      const timer = setTimeout(() => {
        setModalInitialView('prompt');
        setIsLocationModalOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleLocationSelect = (loc) => {
    const roundedLoc = {
      name: loc.name || 'Selected Location',
      lat: loc.lat != null ? Number(Number(loc.lat).toFixed(3)) : null,
      lng: loc.lng != null ? Number(Number(loc.lng).toFixed(3)) : null,
      isGps: Boolean(loc.isGps),
    };

    setCustomerLocation(roundedLoc);
    try {
      localStorage.setItem('dinehq_customer_location', JSON.stringify(roundedLoc));
      localStorage.removeItem('dinehq_location_skipped');
    } catch {
      // ignore
    }

    if (customer?.id && roundedLoc.lat != null && roundedLoc.lng != null && typeof saveAddress === 'function') {
      saveAddress({
        label: roundedLoc.name.split(',')[0]?.trim() || 'Selected Location',
        address: roundedLoc.name,
        landmark: roundedLoc.name,
        latitude: roundedLoc.lat,
        longitude: roundedLoc.lng,
        is_default: true,
      }).catch((e) => console.warn('Could not save location to customer profile:', e));
    }

    setIsLocationModalOpen(false);
  };

  const handleSkipLocation = () => {
    try {
      localStorage.setItem('dinehq_location_skipped', 'true');
    } catch {
      // ignore
    }
    setIsLocationModalOpen(false);
  };

  const handleOpenManualLocationPicker = () => {
    setModalInitialView('manual');
    setIsLocationModalOpen(true);
  };

  // -------------------------------------------------------------
  // Search State with 300ms Debounce
  // Typing responds instantly in UI; fetch waits 300ms
  // -------------------------------------------------------------
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleSearchChange = (val) => {
    setSearchInput(val);
    setRestaurantPage(1);
    setFoodCursor(0);
  };

  // Active Category across modes (ALL or specific category)
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const activeCategoryList = homeMode === 'food' ? FOOD_CATEGORIES : RESTAURANT_CUISINES;
  const activeMoreCategoryList = homeMode === 'food' ? MORE_FOOD_CATEGORIES : MORE_RESTAURANT_CUISINES;

  const handleCategorySelect = (cId) => {
    setSelectedCategory(cId);
    setRestaurantPage(1);
    setFoodCursor(0);
  };

  // -------------------------------------------------------------
  // RESTAURANTS MODE STATES & FETCHING
  // -------------------------------------------------------------
  const [restaurantSort, setRestaurantSort] = useState('nearest'); // 'nearest' | 'rating' | 'fee'
  const [orderType, setOrderType] = useState('delivery'); // 'delivery' | 'pickup' | 'dinein'
  const [filterOpenNow, setFilterOpenNow] = useState(false);
  const [filterFreeDelivery, setFilterFreeDelivery] = useState(false);

  const [restaurantPage, setRestaurantPage] = useState(1);
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantTotalCount, setRestaurantTotalCount] = useState(0);
  const [restaurantHasMore, setRestaurantHasMore] = useState(false);
  const [restaurantsLoading, setRestaurantsLoading] = useState(true);

  const fetchRestaurants = useCallback(async () => {
    try {
      setRestaurantsLoading(true);
      const queryLat = customerLocation?.lat ? Number(customerLocation.lat.toFixed(3)) : null;
      const queryLng = customerLocation?.lng ? Number(customerLocation.lng.toFixed(3)) : null;

      const result = await marketplaceService.getPublicRestaurants({
        userLat: queryLat,
        userLng: queryLng,
        cuisine: selectedCategory,
        search: debouncedSearch,
        sort: restaurantSort,
        deliversToMe: Boolean(customerLocation),
        openNow: filterOpenNow,
        pickup: orderType === 'pickup',
        dinein: orderType === 'dinein',
        freeDelivery: filterFreeDelivery,
        page: restaurantPage,
        pageSize: 20,
      });

      setRestaurants((prev) =>
        restaurantPage === 1 ? result.restaurants || [] : [...prev, ...(result.restaurants || [])]
      );
      setRestaurantTotalCount(result.totalCount || 0);
      setRestaurantHasMore(Boolean(result.hasMore));
    } catch (err) {
      console.warn('Error fetching marketplace restaurants:', err);
    } finally {
      setRestaurantsLoading(false);
    }
  }, [
    customerLocation?.lat,
    customerLocation?.lng,
    selectedCategory,
    debouncedSearch,
    restaurantSort,
    filterOpenNow,
    orderType,
    filterFreeDelivery,
    restaurantPage,
  ]);

  useEffect(() => {
    if (homeMode === 'restaurants') {
      fetchRestaurants();
    }
  }, [homeMode, fetchRestaurants]);

  // -------------------------------------------------------------
  // FOOD MODE STATES & FETCHING
  // Server-side GET /api/nearby/dishes (paginated 24 at a time)
  // -------------------------------------------------------------
  const [foodSort, setFoodSort] = useState('nearest'); // 'nearest' | 'price_asc' | 'price_desc'
  const [foodVegOnly, setFoodVegOnly] = useState(false);
  const [foodPriceRange, setFoodPriceRange] = useState('all'); // 'all' | 'under500' | '500to1200' | '1200plus'

  const [foodCursor, setFoodCursor] = useState(0);
  const [foodDishes, setFoodDishes] = useState([]);
  const [foodTotalCount, setFoodTotalCount] = useState(0);
  const [foodHasMore, setFoodHasMore] = useState(false);
  const [foodLoading, setFoodLoading] = useState(true);

  const fetchFoodDishes = useCallback(
    async (cursorToFetch = 0, isInitial = false) => {
      try {
        setFoodLoading(true);
        const queryLat = customerLocation?.lat ? Number(customerLocation.lat.toFixed(3)) : null;
        const queryLng = customerLocation?.lng ? Number(customerLocation.lng.toFixed(3)) : null;

        let minPrice = null;
        let maxPrice = null;
        if (foodPriceRange === 'under500') {
          maxPrice = 500;
        } else if (foodPriceRange === '500to1200') {
          minPrice = 500;
          maxPrice = 1200;
        } else if (foodPriceRange === '1200plus') {
          minPrice = 1200;
        }

        const result = await marketplaceService.getNearbyDishes({
          userLat: queryLat,
          userLng: queryLng,
          query: debouncedSearch,
          category: selectedCategory,
          sort: foodSort,
          cursor: cursorToFetch,
          limit: 24,
          openNow: filterOpenNow,
          vegOnly: foodVegOnly,
          minPrice,
          maxPrice,
        });

        if (cursorToFetch === 0 || isInitial) {
          setFoodDishes(result.items || []);
        } else {
          setFoodDishes((prev) => [...prev, ...(result.items || [])]);
        }
        setFoodTotalCount(result.totalCount || 0);
        setFoodHasMore(Boolean(result.hasMore));
      } catch (err) {
        console.warn('Error fetching nearby dishes in Food mode:', err);
      } finally {
        setFoodLoading(false);
      }
    },
    [
      customerLocation?.lat,
      customerLocation?.lng,
      debouncedSearch,
      selectedCategory,
      foodSort,
      filterOpenNow,
      foodVegOnly,
      foodPriceRange,
    ]
  );

  useEffect(() => {
    if (homeMode === 'food') {
      fetchFoodDishes(0, true);
    }
  }, [homeMode, fetchFoodDishes]);

  const handleLoadMoreFood = () => {
    const nextCursor = foodDishes.length;
    setFoodCursor(nextCursor);
    fetchFoodDishes(nextCursor, false);
  };

  // -------------------------------------------------------------
  // Cart Actions & Restaurant Conflict Prompting
  // Adding a dish from a different restaurant prompts:
  // "Start a new cart from this restaurant?"
  // -------------------------------------------------------------
  const handleAddDish = (dish) => {
    if (!dish) return;

    // Check if dish has options/variants
    if (dish.has_options) {
      navigate(`/${dish.restaurant_slug}?highlight=${dish.raw_item_id || dish.id}`);
      return;
    }

    // Inspect active cart in localStorage
    const activeCartSlug = localStorage.getItem('dinehq_active_cart_slug');
    const activeCartRestaurantName = localStorage.getItem('dinehq_active_cart_name') || 'another restaurant';

    let existingCartHasItems = false;
    if (activeCartSlug && activeCartSlug !== dish.restaurant_slug) {
      try {
        const raw = localStorage.getItem(`dinehq_cart_${activeCartSlug}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            existingCartHasItems = true;
          }
        }
      } catch (_) {}
    }

    if (existingCartHasItems) {
      // Prompt customer with Cart Conflict Modal
      setCartConflictItem({
        ...dish,
        previousRestaurantName: activeCartRestaurantName,
        previousRestaurantSlug: activeCartSlug,
      });
      return;
    }

    // Add item directly to restaurant's cart
    executeAddToCart(dish);
  };

  const executeAddToCart = (dish) => {
    try {
      const cartKey = `dinehq_cart_${dish.restaurant_slug}`;
      const saved = localStorage.getItem(cartKey);
      let cart = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(cart)) cart = [];

      const dishRawId = dish.raw_item_id || dish.id;
      const existingIdx = cart.findIndex((c) => c.item?.id === dishRawId);

      if (existingIdx >= 0) {
        cart[existingIdx].quantity = (cart[existingIdx].quantity || 1) + 1;
      } else {
        cart.push({
          item: {
            id: dishRawId,
            title: dish.title,
            price: dish.price,
            image_url: dish.image,
            description: dish.description,
          },
          unitPrice: dish.price,
          quantity: 1,
          choiceDetails: [],
          selectedOptions: {},
          specialInstructions: '',
          finalItemPrice: dish.price,
        });
      }

      localStorage.setItem(cartKey, JSON.stringify(cart));
      localStorage.setItem('dinehq_active_cart_slug', dish.restaurant_slug);
      localStorage.setItem('dinehq_active_cart_name', dish.restaurant_name);

      refreshActiveCart();
      window.dispatchEvent(new Event('dinehq_cart_updated'));

      showToast(`Added ${dish.title} to cart`);
    } catch (e) {
      console.warn('Error adding item to cart:', e);
    }
  };

  const handleConfirmNewCart = () => {
    if (!cartConflictItem) return;

    try {
      // Clear previous restaurant's cart
      if (cartConflictItem.previousRestaurantSlug) {
        localStorage.removeItem(`dinehq_cart_${cartConflictItem.previousRestaurantSlug}`);
      }

      // Add item to new cart
      executeAddToCart(cartConflictItem);
      showToast(`Started new cart with ${cartConflictItem.title}!`);
    } finally {
      setCartConflictItem(null);
    }
  };

  // Cart Drawer handlers
  const handleUpdateCartQty = (idx, delta) => {
    if (!activeCartSlug) return;
    const cartKey = `dinehq_cart_${activeCartSlug}`;
    const nextCart = [...activeCartItems];
    const newQty = (nextCart[idx]?.quantity || 1) + delta;

    if (newQty <= 0) {
      nextCart.splice(idx, 1);
    } else {
      nextCart[idx] = { ...nextCart[idx], quantity: newQty };
    }

    if (nextCart.length === 0) {
      localStorage.removeItem(cartKey);
      localStorage.removeItem('dinehq_active_cart_slug');
      localStorage.removeItem('dinehq_active_cart_name');
    } else {
      localStorage.setItem(cartKey, JSON.stringify(nextCart));
    }
    refreshActiveCart();
    window.dispatchEvent(new Event('dinehq_cart_updated'));
  };

  const handleClearCart = () => {
    if (activeCartSlug) {
      localStorage.removeItem(`dinehq_cart_${activeCartSlug}`);
      localStorage.removeItem('dinehq_active_cart_slug');
      localStorage.removeItem('dinehq_active_cart_name');
    }
    refreshActiveCart();
    window.dispatchEvent(new Event('dinehq_cart_updated'));
  };

  const activeCartRestaurant =
    restaurants.find((r) => r.slug === activeCartSlug) || {
      id: activeCartSlug,
      name: activeCartName || 'Restaurant',
      slug: activeCartSlug,
      primary_color: '#F26B1D',
      delivery_mode: 'standard',
      delivery_fee: 150,
    };

  // Clear filters
  const handleClearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setSelectedCategory('ALL');
    setFilterOpenNow(false);
    setFilterFreeDelivery(false);
    setOrderType('delivery');
    setFoodVegOnly(false);
    setFoodPriceRange('all');
    setRestaurantPage(1);
    setFoodCursor(0);
  };

  // Favorite toggle with auth prompt modal
  const handleToggleFav = (e, restaurantId) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isCustomerAuthenticated) {
      setShowSignInFavModal(true);
      return;
    }

    toggleFavorite(restaurantId);
  };

  const isMoreCategoryActive = activeMoreCategoryList.some((mc) => mc.id === selectedCategory);
  const activeMoreCategory = activeMoreCategoryList.find((mc) => mc.id === selectedCategory);

  // Active filter count for badge
  const activeFilterCount =
    homeMode === 'food'
      ? (filterOpenNow ? 1 : 0) + (foodVegOnly ? 1 : 0) + (foodPriceRange !== 'all' ? 1 : 0)
      : (filterOpenNow ? 1 : 0) + (filterFreeDelivery ? 1 : 0) + (orderType !== 'delivery' ? 1 : 0);

  // Dynamic search placeholder reacting directly to mode
  const currentSearchPlaceholder =
    homeMode === 'food'
      ? isUrdu
        ? 'کھانے تلاش کریں، جیسے بریانی، زنگر...'
        : 'Search food, e.g. biryani, zinger...'
      : isUrdu
      ? 'ریسٹورنٹس تلاش کریں...'
      : 'Search restaurants...';

  return (
    <div
      className={`min-h-screen bg-[#FFF9F2] dark:bg-[#1A120B] text-[#2B2118] dark:text-[#FFF9F2] font-sans antialiased pb-20 md:pb-12 ${
        isRTL ? 'rtl' : 'ltr'
      }`}
    >
      {/* ========================================================
          1. CLEAN STICKY HEADER (One row, sticky, not clipped)
          Search box placeholder changes with active mode
          ======================================================== */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#1D150F]/95 backdrop-blur-md border-b border-[#F0E4D7] dark:border-[#382B20] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 sm:gap-6 h-16">
            {/* Left: Brand Logo & Name */}
            <Link to="/" className="flex items-center gap-2.5 shrink-0 select-none group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F26B1D] to-[#E05307] text-white flex items-center justify-center shadow-xs">
                <UtensilsCrossed className="w-4 h-4" />
              </div>
              <span className="font-heading font-extrabold text-lg sm:text-xl tracking-tight text-[#2B2118] dark:text-[#FFF9F2] leading-none">
                Dineflow
              </span>
            </Link>

            {/* Center: Search Box (Desktop) - Placeholder changes with mode */}
            <div className="flex-1 max-w-lg hidden md:block">
              <div className="relative">
                <Search
                  className={`w-4 h-4 text-[#7A6A5C] absolute top-1/2 -translate-y-1/2 pointer-events-none ${
                    isRTL ? 'right-3' : 'left-3'
                  }`}
                />
                <input
                  id="marketplace-search-input"
                  ref={searchInputRef}
                  type="text"
                  placeholder={currentSearchPlaceholder}
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className={`w-full py-2 min-h-[42px] rounded-xl bg-[#FFF9F2] dark:bg-[#281D16] border border-[#F0E4D7] dark:border-[#382B20] text-xs font-medium text-[#2B2118] dark:text-[#FFF9F2] placeholder-[#9E8E81] focus:outline-none focus:ring-2 focus:ring-[#F26B1D] transition ${
                    isRTL ? 'pr-9 pl-8' : 'pl-9 pr-8'
                  }`}
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => handleSearchChange('')}
                    className={`absolute top-1/2 -translate-y-1/2 text-[#9E8E81] hover:text-[#2B2118] dark:hover:text-white p-1 cursor-pointer ${
                      isRTL ? 'left-2' : 'right-2'
                    }`}
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Right: Location Chip, Cart Button, Theme Toggle, Language Switch, Account */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Location Chip */}
              <button
                type="button"
                onClick={handleOpenManualLocationPicker}
                className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-[#FFF1E6] hover:bg-[#FFE6D4] dark:bg-[#382417] dark:hover:bg-[#482E1E] text-[#2B2118] dark:text-[#FFF9F2] text-xs font-bold border border-[#FCD8BF] dark:border-[#523522] transition cursor-pointer truncate max-w-[130px] sm:max-w-[200px]"
                title="Change delivery location"
              >
                <MapPin className="w-3.5 h-3.5 text-[#F26B1D] shrink-0" />
                <span className="truncate">{customerLocation?.name || 'Set Location'}</span>
                <ChevronDown className="w-3 h-3 text-[#7A6A5C] dark:text-[#A8988B] shrink-0" />
              </button>

              {/* Cart Button */}
              <button
                id="navbar-cart-button"
                type="button"
                onClick={() => setIsCartDrawerOpen(true)}
                className="relative flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 min-h-[40px] rounded-xl bg-white dark:bg-[#241C16] border border-[#F0E4D7] dark:border-[#382B20] hover:border-[#F26B1D] dark:hover:border-[#F26B1D] text-[#2B2118] dark:text-[#FFF9F2] text-xs font-bold transition cursor-pointer shadow-2xs group"
                title={totalCartCount > 0 ? `Cart (${totalCartCount} item${totalCartCount > 1 ? 's' : ''})` : 'Shopping Cart'}
                aria-label="Shopping Cart"
              >
                <div className="relative flex items-center">
                  <ShoppingBag className="w-4 h-4 text-[#F26B1D] group-hover:scale-110 transition-transform" />
                  {totalCartCount > 0 && (
                    <span className="sm:hidden absolute -top-1.5 -right-2 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[#F26B1D] text-white text-[9px] font-mono font-black shadow-xs">
                      {totalCartCount > 9 ? '9+' : totalCartCount}
                    </span>
                  )}
                </div>
                <span className="hidden sm:inline font-bold">Cart</span>
                {totalCartCount > 0 && (
                  <span className="hidden sm:flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#F26B1D] text-white text-[10px] font-mono font-black shadow-xs">
                    {totalCartCount}
                  </span>
                )}
              </button>

              {/* Theme Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-[#241C16] border border-[#F0E4D7] dark:border-[#382B20] text-[#7A6A5C] dark:text-[#CBB8A8] hover:text-[#F26B1D] dark:hover:text-[#F26B1D] transition cursor-pointer shadow-2xs"
                title={theme === 'dark' ? 'Switch to warm light theme' : 'Switch to dark theme'}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-[#7A6A5C]" />
                )}
              </button>

              {/* Language Switcher */}
              <button
                type="button"
                onClick={toggleLanguage}
                className="flex items-center gap-1 px-2.5 py-2 min-h-[40px] rounded-xl bg-white dark:bg-[#241C16] border border-[#F0E4D7] dark:border-[#382B20] text-xs font-bold text-[#2B2118] dark:text-[#FFF9F2] hover:border-[#F26B1D] transition cursor-pointer shadow-2xs"
                title="Toggle language"
              >
                <Globe className="w-3.5 h-3.5 text-[#F26B1D]" />
                <span>{language === 'en' ? 'اردو' : 'EN'}</span>
              </button>

              {/* Account / Sign In */}
              {isCustomerAuthenticated ? (
                <Link
                  to="/account"
                  className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1.5 min-h-[40px] rounded-xl bg-white dark:bg-[#241C16] border border-[#F0E4D7] dark:border-[#382B20] hover:border-[#F26B1D] text-xs font-bold text-[#2B2118] dark:text-[#FFF9F2] transition shadow-2xs"
                >
                  <img
                    src={
                      customer?.avatar ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${customer?.name || 'Guest'}`
                    }
                    alt={customer?.name || 'Customer'}
                    className="w-7 h-7 rounded-lg object-cover border border-[#FCD8BF]"
                  />
                  <span className="hidden sm:inline">
                    {customer?.name ? customer.name.split(' ')[0] : 'Account'}
                  </span>
                </Link>
              ) : (
                <Link
                  to="/account"
                  className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-white dark:bg-[#241C16] border border-[#F0E4D7] dark:border-[#382B20] hover:border-[#F26B1D] text-xs font-bold text-[#2B2118] dark:text-[#FFF9F2] hover:text-[#F26B1D] transition shadow-2xs"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#F26B1D]" />
                  <span>{t('signIn') || 'Sign in'}</span>
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Search Row */}
          <div className="pb-3 md:hidden">
            <div className="relative">
              <Search
                className={`w-4 h-4 text-[#7A6A5C] absolute top-1/2 -translate-y-1/2 pointer-events-none ${
                  isRTL ? 'right-3' : 'left-3'
                }`}
              />
              <input
                type="text"
                placeholder={currentSearchPlaceholder}
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                className={`w-full py-2 min-h-[42px] rounded-xl bg-[#FFF9F2] dark:bg-[#281D16] border border-[#F0E4D7] dark:border-[#382B20] text-xs font-medium text-[#2B2118] dark:text-[#FFF9F2] placeholder-[#9E8E81] focus:outline-none focus:ring-2 focus:ring-[#F26B1D] ${
                  isRTL ? 'pr-9 pl-8' : 'pl-9 pr-8'
                }`}
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className={`absolute top-1/2 -translate-y-1/2 text-[#9E8E81] p-1 ${
                    isRTL ? 'left-2' : 'right-2'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================
          MAIN CONTENT AREA
          ======================================================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6 sm:space-y-8 scroll-mt-20">
        {/* ========================================================
            2. RESTORED FULL-SIZE HERO BANNER
            ======================================================== */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FFF1E6] via-[#FFF9F2] to-[#FFE6D4] dark:from-[#251A13] dark:via-[#1D150F] dark:to-[#2B1E16] border border-[#FCD8BF] dark:border-[#3E2C20] p-6 sm:p-8 lg:p-10 shadow-[0_4px_24px_rgba(43,33,24,0.06)] transition-all">
          {/* Ambient Animated Warm Aura Orbs */}
          <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-gradient-to-br from-[#F26B1D]/20 via-[#F5A623]/25 to-transparent blur-3xl pointer-events-none animate-aurora" />
          <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-gradient-to-tr from-[#F5A623]/15 via-[#FFF1E6]/30 to-transparent blur-2xl pointer-events-none animate-float-reverse" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Headline, Subtitle & Action */}
            <div className="lg:col-span-7 space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 dark:bg-[#2A1E17] text-[#F26B1D] text-[11px] font-extrabold uppercase tracking-wider border border-[#FCD8BF] dark:border-[#523522] shadow-2xs hover:scale-105 transition-transform duration-200">
                <UtensilsCrossed className="w-3 h-3" />
                <span>{t('heroBadge') || 'Neighborhood Kitchens'}</span>
              </span>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-extrabold text-[#2B2118] dark:text-[#FFF9F2] tracking-tight leading-tight">
                {customerLocation ? (
                  <>
                    <span>{t('heroTitlePrefix') || 'Restaurants delivering to'} </span>
                    <span className="text-[#F26B1D] underline decoration-[#FCD8BF] decoration-wavy underline-offset-4 animate-wavy-shimmer inline-block">
                      {customerLocation.name}
                    </span>
                  </>
                ) : (
                  t('heroTitleDefault') || 'Explore Popular Food & Restaurants'
                )}
              </h1>

              <p className="text-xs sm:text-sm text-[#7A6A5C] dark:text-[#CBB8A8] max-w-xl leading-relaxed">
                {t('heroSubtitle') ||
                  'Fresh food ordered directly from kitchen menus with live rider tracking.'}
              </p>

              {/* Change Location Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleOpenManualLocationPicker}
                  className="btn-primary min-h-[48px] px-6 py-3 text-xs sm:text-sm font-bold shadow-md shadow-[#F26B1D]/25 cursor-pointer hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 group"
                >
                  <MapPin className="w-4 h-4 group-hover:animate-bounce transition-transform" />
                  <span>{customerLocation ? t('changeLocation') || 'Change Location' : t('setMyLocationBtn') || 'Set Location'}</span>
                </button>
              </div>
            </div>

            {/* Custom Burger Illustration with Floating Animated Badges */}
            <div className="lg:col-span-5 relative flex justify-center items-center py-2">
              {/* Radial glow aura directly behind plate */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#F26B1D]/15 via-[#F5A623]/20 to-transparent blur-2xl rounded-full scale-75 animate-glow-pulse pointer-events-none" />

              {/* Floating Animated Pill 1: Top-Left */}
              <div className="absolute top-2 left-2 sm:left-6 z-20 animate-float-slow hidden xs:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/95 dark:bg-[#241C16]/95 backdrop-blur-md border border-[#FCD8BF] dark:border-[#523522] shadow-lg text-[#2B2118] dark:text-[#FFF9F2] text-xs font-bold hover:scale-105 transition-transform select-none">
                <span className="text-sm">🔥</span>
                <span className="font-heading font-extrabold text-[11px] sm:text-xs">Fresh & Hot</span>
              </div>

              {/* Floating Animated Pill 2: Bottom-Right */}
              <div className="absolute bottom-2 right-2 sm:right-6 z-20 animate-float-reverse hidden xs:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/95 dark:bg-[#241C16]/95 backdrop-blur-md border border-[#C0E9CE] dark:border-emerald-900 shadow-lg text-emerald-800 dark:text-emerald-300 text-xs font-bold hover:scale-105 transition-transform select-none">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="font-heading font-extrabold text-[11px] sm:text-xs">⚡ Live GPS Tracking</span>
              </div>

              <HeroFoodIllustration className="w-full max-w-[280px] sm:max-w-[340px] drop-shadow-md relative z-10 transition-transform duration-300 hover:scale-105 cursor-pointer mx-auto" />
            </div>
          </div>
        </section>

        {/* ========================================================
            3. PILL TOGGLE DIRECTLY UNDER HERO: "Restaurants" and "Food"
            SHOWN EXACTLY ONCE HERE AND NOWHERE ELSE!
            ======================================================== */}
        <section className="flex justify-center items-center py-1">
          <div
            id="home-mode-toggle-group"
            className="inline-flex p-1.5 rounded-full bg-white dark:bg-[#241C16] border border-[#F0E4D7] dark:border-[#382B20] shadow-sm gap-1"
          >
            <button
              id="mode-pill-restaurants"
              type="button"
              onClick={() => handleModeChange('restaurants')}
              className={`flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-extrabold transition-all duration-200 cursor-pointer select-none ${
                homeMode === 'restaurants'
                  ? 'bg-[#F26B1D] text-white shadow-md shadow-[#F26B1D]/25'
                  : 'text-[#7A6A5C] dark:text-[#CBB8A8] hover:text-[#2B2118] dark:hover:text-[#FFF9F2]'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>{isUrdu ? 'ریسٹورنٹس' : 'Restaurants'}</span>
            </button>
            <button
              id="mode-pill-food"
              type="button"
              onClick={() => handleModeChange('food')}
              className={`flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-extrabold transition-all duration-200 cursor-pointer select-none ${
                homeMode === 'food'
                  ? 'bg-[#F26B1D] text-white shadow-md shadow-[#F26B1D]/25'
                  : 'text-[#7A6A5C] dark:text-[#CBB8A8] hover:text-[#2B2118] dark:hover:text-[#FFF9F2]'
              }`}
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>{isUrdu ? 'کھانا' : 'Food'}</span>
            </button>
          </div>
        </section>



        {/* ========================================================
            5. CONTROLS BAR: Section Title, Quick Toggles, Filters & Sort
            ======================================================== */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            {/* Section Title */}
            <div>
              <h2 className="text-lg sm:text-xl font-heading font-extrabold text-[#2B2118] dark:text-[#FFF9F2]">
                {debouncedSearch
                  ? `Results for "${debouncedSearch}"`
                  : homeMode === 'food'
                  ? isUrdu
                    ? 'آپ کے قریب مقبول کھانا'
                    : 'Popular food near you'
                  : isUrdu
                  ? 'آپ کے قریب ریسٹورنٹس'
                  : 'Restaurants near you'}
              </h2>
            </div>

            {/* Quick Controls Cluster */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Quick Toggle: Open now */}
              <button
                type="button"
                onClick={() => setFilterOpenNow(!filterOpenNow)}
                className={`px-3 py-2 min-h-[40px] rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer select-none ${
                  filterOpenNow
                    ? 'bg-[#FFF1E6] dark:bg-[#382619] border-[#F26B1D] text-[#F26B1D]'
                    : 'bg-white dark:bg-[#241C16] text-[#7A6A5C] dark:text-[#CBB8A8] border-[#F0E4D7] dark:border-[#382B20] hover:border-[#F26B1D]/60'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{t('openNow') || 'Open now'}</span>
              </button>

              {/* Filters Button with Active Count Badge */}
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(true)}
                className={`px-3 py-2 min-h-[40px] rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer select-none ${
                  activeFilterCount > 0
                    ? 'bg-[#FFF1E6] dark:bg-[#382619] border-[#F26B1D] text-[#F26B1D]'
                    : 'bg-white dark:bg-[#241C16] text-[#7A6A5C] dark:text-[#CBB8A8] border-[#F0E4D7] dark:border-[#382B20] hover:border-[#F26B1D]/60'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{t('filters') || 'Filters'}</span>
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#F26B1D] text-white text-[10px] font-extrabold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Sort Dropdown: Mode-specific options */}
              {homeMode === 'food' ? (
                <select
                  value={foodSort}
                  onChange={(e) => setFoodSort(e.target.value)}
                  className="px-3 py-2 min-h-[40px] rounded-xl bg-white dark:bg-[#241C16] border border-[#F0E4D7] dark:border-[#382B20] text-xs font-bold text-[#2B2118] dark:text-[#FFF9F2] focus:outline-none focus:ring-1 focus:ring-[#F26B1D] cursor-pointer shadow-2xs"
                >
                  <option value="nearest">{t('sortNearest') || 'Nearest restaurant'}</option>
                  <option value="price_asc">{t('sortPriceAsc') || 'Price low to high'}</option>
                  <option value="price_desc">{t('sortPriceDesc') || 'Price high to low'}</option>
                </select>
              ) : (
                <select
                  value={restaurantSort}
                  onChange={(e) => setRestaurantSort(e.target.value)}
                  className="px-3 py-2 min-h-[40px] rounded-xl bg-white dark:bg-[#241C16] border border-[#F0E4D7] dark:border-[#382B20] text-xs font-bold text-[#2B2118] dark:text-[#FFF9F2] focus:outline-none focus:ring-1 focus:ring-[#F26B1D] cursor-pointer shadow-2xs"
                >
                  <option value="nearest">{t('sortNearest') || 'Nearest restaurant'}</option>
                  <option value="rating">{t('sortRating') || 'Highest Rated'}</option>
                  <option value="fee">{t('sortFee') || 'Lowest Delivery Fee'}</option>
                </select>
              )}
            </div>
          </div>
        </section>

        {/* ========================================================
            6. RESTAURANTS MODE LIST
            ======================================================== */}
        {homeMode === 'restaurants' && (
          <section className="space-y-6">
            {/* Loading Skeleton */}
            {restaurantsLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-[#221A14] rounded-2xl border border-[#F0E4D7] dark:border-[#382B20] overflow-hidden shadow-2xs animate-pulse"
                  >
                    <div className="h-44 bg-slate-200 dark:bg-[#2F241C]" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-slate-200 dark:bg-[#2F241C] rounded-lg w-3/4" />
                      <div className="h-3 bg-slate-100 dark:bg-[#382A21] rounded-lg w-1/2" />
                      <div className="pt-2 flex justify-between">
                        <div className="h-3 bg-slate-100 dark:bg-[#382A21] rounded-md w-1/4" />
                        <div className="h-3 bg-slate-100 dark:bg-[#382A21] rounded-md w-1/4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State: Never show 0 counts */}
            {!restaurantsLoading && restaurants.length === 0 && (
              <div className="bg-white dark:bg-[#221A14] rounded-2xl border border-dashed border-[#F0E4D7] dark:border-[#382B20] p-8 text-center max-w-md mx-auto space-y-4 my-6">
                <EmptyStateIllustration className="w-24 h-24 mx-auto" />
                <div className="space-y-1">
                  <h3 className="font-heading font-extrabold text-base text-[#2B2118] dark:text-[#FFF9F2]">
                    {debouncedSearch
                      ? `No restaurants found for "${debouncedSearch}"`
                      : 'No restaurants found nearby yet'}
                  </h3>
                  <p className="text-xs text-[#7A6A5C] dark:text-[#CBB8A8]">
                    {debouncedSearch
                      ? 'Try clearing your search or updating your delivery location.'
                      : 'Try expanding your filters or choosing another location.'}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 pt-2">
                  {debouncedSearch || filterOpenNow || filterFreeDelivery || orderType !== 'delivery' ? (
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="btn-primary min-h-[44px] px-5 py-2 text-xs font-bold"
                    >
                      Clear search
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleOpenManualLocationPicker}
                    className="px-5 py-2.5 min-h-[44px] rounded-xl bg-white dark:bg-[#281D16] border border-[#F0E4D7] dark:border-[#382B20] text-xs font-bold text-[#2B2118] dark:text-[#FFF9F2] hover:border-[#F26B1D] transition"
                  >
                    <MapPin className="w-4 h-4 mr-1.5 inline text-[#F26B1D]" />
                    Change location
                  </button>
                </div>
              </div>
            )}

            {/* Restaurant Cards Grid (image, name, cuisines, distance, delivery fee, minimum order, Open/Closed, "Delivers to you" badge) */}
            {!restaurantsLoading && restaurants.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {restaurants.map((store) => {
                  const isFav = favorites.includes(store.id);

                  return (
                    <Link
                      key={store.id}
                      to={`/${store.slug}`}
                      className="card-warm group flex flex-col justify-between overflow-hidden rounded-2xl bg-white dark:bg-[#221A14] border border-[#F0E4D7] dark:border-[#382B20] shadow-2xs hover:shadow-md transition-all duration-200"
                    >
                      <div>
                        {/* Cover Photo */}
                        <div className="relative h-44 overflow-hidden rounded-t-2xl">
                          <BlurUpImage
                            src={store.cover_image}
                            alt={store.name}
                            aspectRatio="aspect-auto"
                            containerClassName="w-full h-full !rounded-none"
                            className="group-hover:scale-105 transition-transform duration-300"
                          />

                          {/* Top Badges: Open/Closed & Heart */}
                          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-xs flex items-center gap-1.5 ${
                                store.is_open_now
                                  ? 'bg-emerald-600/95 text-white'
                                  : 'bg-slate-900/85 text-slate-200'
                              }`}
                            >
                              {store.is_open_now && (
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                                </span>
                              )}
                              <span>{store.is_open_now ? t('badgeOpen') || 'Open' : t('badgeClosed') || 'Closed'}</span>
                            </span>

                            <button
                              type="button"
                              onClick={(e) => handleToggleFav(e, store.id)}
                              className="min-h-[40px] min-w-[40px] flex items-center justify-center p-2 rounded-full bg-white/90 dark:bg-[#221A14]/90 backdrop-blur-md text-rose-500 shadow-sm hover:scale-110 active:scale-95 transition-transform duration-200 pointer-events-auto cursor-pointer"
                              title={isFav ? 'Remove from favorites' : 'Save to favorites'}
                              aria-label={isFav ? 'Remove from favorites' : 'Save to favorites'}
                            >
                              <Heart
                                className={`w-4 h-4 transition ${
                                  isFav ? 'fill-rose-500 text-rose-500' : 'text-slate-400 dark:text-slate-300'
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        {/* Content Block */}
                        <div className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-heading font-extrabold text-base text-[#2B2118] dark:text-[#FFF9F2] group-hover:text-[#F26B1D] transition-colors line-clamp-1">
                              {store.name}
                            </h3>
                            <div className="flex items-center gap-1 shrink-0 text-[#F26B1D] font-bold text-xs">
                              <Star className="w-3.5 h-3.5 fill-[#F26B1D]" />
                              <span>{store.rating || '4.8'}</span>
                            </div>
                          </div>

                          {/* Cuisines */}
                          <p className="text-xs text-[#7A6A5C] dark:text-[#CBB8A8] line-clamp-1 font-medium">
                            {formatCuisineWords(store)}
                          </p>

                          {/* Details Row: Distance, Delivery Fee, Minimum Order */}
                          <div className="flex items-center justify-between text-xs text-[#7A6A5C] dark:text-[#CBB8A8] pt-1">
                            <span className="flex items-center gap-1 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-[#9E8E81]" />
                              <span>
                                {store.distance_km != null ? `${store.distance_km} km` : 'Near you'}
                              </span>
                            </span>

                            <span className="text-[11px] font-medium text-[#9E8E81]">
                              Min. {formatPKR(store.min_order || 500)}
                            </span>

                            <span className="font-bold text-[#2B2118] dark:text-[#FFF9F2]">
                              {(store.delivery_fee_effective || store.delivery_fee || 0) === 0 ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                                  {t('freeDelivery') || 'Free delivery'}
                                </span>
                              ) : (
                                `${formatPKR(store.delivery_fee_effective || store.delivery_fee)} delivery`
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Load More Button for Restaurants */}
            {!restaurantsLoading && restaurantHasMore && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setRestaurantPage((prev) => prev + 1)}
                  className="min-h-[44px] px-6 py-2.5 rounded-xl bg-white dark:bg-[#241C16] hover:bg-[#FFF1E6] dark:hover:bg-[#30231B] text-[#2B2118] dark:text-[#FFF9F2] hover:text-[#F26B1D] border border-[#F0E4D7] dark:border-[#382B20] text-xs font-bold shadow-2xs transition cursor-pointer"
                >
                  {t('loadMore') || 'Load more restaurants'}
                </button>
              </div>
            )}
          </section>
        )}

        {/* ========================================================
            7. FOOD MODE LIST (New Separate Dishes List)
            Section title: "Popular food near you"
            3 columns desktop, 2 tablet, 1-2 mobile
            Cards: dish photo, dish name, price in Rs., restaurant name & distance,
            "Delivers to you" badge, "+ Add" (or "View" if customizable options)
            ======================================================== */}
        {homeMode === 'food' && (
          <section className="space-y-6">
            {/* Loading Skeleton for Dishes */}
            {foodLoading && foodDishes.length === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-[#221A14] rounded-2xl border border-[#F0E4D7] dark:border-[#382B20] overflow-hidden shadow-2xs animate-pulse"
                  >
                    <div className="h-44 bg-slate-200 dark:bg-[#2F241C]" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-slate-200 dark:bg-[#2F241C] rounded-lg w-3/4" />
                      <div className="h-3 bg-slate-100 dark:bg-[#382A21] rounded-lg w-1/2" />
                      <div className="pt-2 flex justify-between">
                        <div className="h-4 bg-slate-200 dark:bg-[#2F241C] rounded-md w-1/3" />
                        <div className="h-8 bg-slate-200 dark:bg-[#2F241C] rounded-lg w-20" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State for Food: Never show 0 counts */}
            {!foodLoading && foodDishes.length === 0 && (
              <div className="bg-white dark:bg-[#221A14] rounded-2xl border border-dashed border-[#F0E4D7] dark:border-[#382B20] p-8 text-center max-w-md mx-auto space-y-4 my-6">
                <EmptyStateIllustration className="w-24 h-24 mx-auto" />
                <div className="space-y-1">
                  <h3 className="font-heading font-extrabold text-base text-[#2B2118] dark:text-[#FFF9F2]">
                    {debouncedSearch
                      ? `No food found for "${debouncedSearch}"`
                      : 'No food found nearby yet'}
                  </h3>
                  <p className="text-xs text-[#7A6A5C] dark:text-[#CBB8A8]">
                    {debouncedSearch
                      ? 'Try searching for something else like biryani, burger, or pizza.'
                      : 'Try adjusting your filters or checking other categories.'}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 pt-2">
                  {debouncedSearch || filterOpenNow || foodVegOnly || foodPriceRange !== 'all' ? (
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="btn-primary min-h-[44px] px-5 py-2 text-xs font-bold"
                    >
                      Clear search
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleOpenManualLocationPicker}
                    className="px-5 py-2.5 min-h-[44px] rounded-xl bg-white dark:bg-[#281D16] border border-[#F0E4D7] dark:border-[#382B20] text-xs font-bold text-[#2B2118] dark:text-[#FFF9F2] hover:border-[#F26B1D] transition"
                  >
                    <MapPin className="w-4 h-4 mr-1.5 inline text-[#F26B1D]" />
                    Change location
                  </button>
                </div>
              </div>
            )}

            {/* Dish Cards Grid */}
            {foodDishes.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {foodDishes.map((dish) => (
                  <div
                    key={dish.id}
                    className="card-warm group flex flex-col justify-between overflow-hidden rounded-2xl bg-white dark:bg-[#221A14] border border-[#F0E4D7] dark:border-[#382B20] shadow-2xs hover:shadow-md transition-all duration-200"
                  >
                    <div>
                      {/* Dish Photo */}
                      <div className="relative h-44 overflow-hidden rounded-t-2xl bg-[#FFF1E6]/40 dark:bg-[#2A1E17]">
                        <BlurUpImage
                          src={dish.image}
                          alt={dish.title}
                          aspectRatio="aspect-auto"
                          containerClassName="w-full h-full !rounded-none"
                          className="group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Top Badges: Category & Open/Closed Status */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-white/90 dark:bg-[#1D150F]/90 backdrop-blur-md text-[#2B2118] dark:text-[#FFF9F2] shadow-xs">
                            {dish.category}
                          </span>

                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-xs ${
                              dish.restaurant_is_open
                                ? 'bg-emerald-600/95 text-white'
                                : 'bg-slate-900/85 text-slate-200'
                            }`}
                          >
                            {dish.restaurant_is_open ? 'Open' : 'Closed'}
                          </span>
                        </div>
                      </div>

                      {/* Content Block */}
                      <div className="p-4 space-y-2.5">
                        <div className="space-y-1">
                          <h3 className="font-heading font-extrabold text-base text-[#2B2118] dark:text-[#FFF9F2] group-hover:text-[#F26B1D] transition-colors line-clamp-1">
                            {dish.title}
                          </h3>

                          {/* Restaurant Name and Distance line */}
                          <div className="flex items-center gap-1.5 text-xs text-[#7A6A5C] dark:text-[#CBB8A8] font-medium truncate">
                            <Store className="w-3.5 h-3.5 text-[#F26B1D] shrink-0" />
                            <Link
                              to={`/${dish.restaurant_slug}`}
                              className="hover:text-[#F26B1D] hover:underline transition truncate"
                            >
                              {dish.restaurant_name}
                            </Link>
                            <span>•</span>
                            <span className="shrink-0">
                              {dish.distance_km != null ? `${dish.distance_km} km` : 'Near you'}
                            </span>
                          </div>
                        </div>

                        {dish.description && (
                          <p className="text-xs text-[#7A6A5C] dark:text-[#CBB8A8] line-clamp-2 leading-relaxed">
                            {dish.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Row: Price & + Add / View Button */}
                    <div className="px-4 pb-4 pt-1 flex items-center justify-between border-t border-[#F0E4D7]/70 dark:border-[#382B20]/70 mt-2">
                      <div className="space-y-0.5">
                        <span className="text-sm sm:text-base font-heading font-extrabold text-[#F26B1D]">
                          {formatPKR(dish.price)}
                        </span>
                      </div>

                      {dish.has_options ? (
                        <Link
                          to={`/${dish.restaurant_slug}?highlight=${dish.raw_item_id || dish.id}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[38px] rounded-xl bg-white dark:bg-[#281D16] hover:bg-[#FFF1E6] dark:hover:bg-[#34241B] text-[#F26B1D] border border-[#FCD8BF] dark:border-[#4A3222] text-xs font-bold transition shadow-2xs cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddDish(dish)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[38px] rounded-xl bg-[#F26B1D] hover:bg-[#E05307] text-white text-xs font-bold transition shadow-sm shadow-[#F26B1D]/25 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>+ Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Load More Button for Food */}
            {!foodLoading && foodHasMore && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleLoadMoreFood}
                  className="min-h-[44px] px-6 py-2.5 rounded-xl bg-white dark:bg-[#241C16] hover:bg-[#FFF1E6] dark:hover:bg-[#30231B] text-[#2B2118] dark:text-[#FFF9F2] hover:text-[#F26B1D] border border-[#F0E4D7] dark:border-[#382B20] text-xs font-bold shadow-2xs transition cursor-pointer"
                >
                  {t('loadMoreFood') || 'Load more food'}
                </button>
              </div>
            )}
          </section>
        )}

        {/* ========================================================
            8. MINIMAL CLEAN FOOTER
            ======================================================== */}
        <footer className="mt-12 sm:mt-16 border-t border-[#F0E4D7] dark:border-[#382B20] py-8 sm:py-10 text-center text-xs text-[#7A6A5C] dark:text-[#A8988B] space-y-3">
          <div className="flex items-center justify-center">
            <Link to="/" className="inline-flex items-center justify-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F26B1D] to-[#E05307] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <UtensilsCrossed className="w-4 h-4" />
              </div>
              <span className="font-heading font-extrabold text-base sm:text-lg tracking-tight text-[#2B2118] dark:text-[#FFF9F2] group-hover:text-[#F26B1D] transition-colors">
                Dineflow
              </span>
            </Link>
          </div>
          <p>© {new Date().getFullYear()} Dineflow. Fresh food delivered directly from kitchen menus.</p>
        </footer>
      </main>

      {/* ========================================================
          9. FILTERS DRAWER / BOTTOM SHEET
          Tailored for both Restaurants and Food modes
          ======================================================== */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          {/* Backdrop click to close */}
          <div className="absolute inset-0" onClick={() => setIsFilterDrawerOpen(false)} />

          {/* Drawer Container */}
          <div className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#221A14] border border-[#F0E4D7] dark:border-[#382B20] p-5 sm:p-6 space-y-5 shadow-2xl z-10 max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#F0E4D7] dark:border-[#382B20]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#F26B1D]" />
                <h3 className="font-heading font-extrabold text-base text-[#2B2118] dark:text-[#FFF9F2]">
                  {t('filters') || 'Filters'} ({homeMode === 'food' ? 'Food' : 'Restaurants'})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(false)}
                className="p-1.5 rounded-full text-[#7A6A5C] hover:bg-slate-100 dark:hover:bg-[#2F241C] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Food Mode Filters */}
            {homeMode === 'food' ? (
              <div className="space-y-4">
                {/* Preference Toggles: Open now & Veg only */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#7A6A5C] dark:text-[#A8988B] uppercase tracking-wider block">
                    Preferences
                  </label>

                  {/* Open now switch */}
                  <label className="flex items-center justify-between p-3 rounded-xl border border-[#F0E4D7] dark:border-[#382B20] cursor-pointer hover:bg-slate-50/50 dark:hover:bg-[#281D16]/50 transition">
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-[#F26B1D]" />
                      <span className="text-xs font-bold text-[#2B2118] dark:text-[#FFF9F2]">
                        {t('openNow') || 'Open now'}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={filterOpenNow}
                      onChange={(e) => setFilterOpenNow(e.target.checked)}
                      className="w-4 h-4 text-[#F26B1D] accent-[#F26B1D] rounded cursor-pointer"
                    />
                  </label>

                  {/* Veg only switch */}
                  <label className="flex items-center justify-between p-3 rounded-xl border border-[#F0E4D7] dark:border-[#382B20] cursor-pointer hover:bg-slate-50/50 dark:hover:bg-[#281D16]/50 transition">
                    <div className="flex items-center gap-2.5">
                      <span className="w-4 h-4 flex items-center justify-center text-sm">🥗</span>
                      <span className="text-xs font-bold text-[#2B2118] dark:text-[#FFF9F2]">
                        Veg only
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={foodVegOnly}
                      onChange={(e) => setFoodVegOnly(e.target.checked)}
                      className="w-4 h-4 text-[#F26B1D] accent-[#F26B1D] rounded cursor-pointer"
                    />
                  </label>
                </div>

                {/* Price Range Filter */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#7A6A5C] dark:text-[#A8988B] uppercase tracking-wider block">
                    Price Range
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'all', label: 'Any Price' },
                      { id: 'under500', label: 'Under Rs. 500' },
                      { id: '500to1200', label: 'Rs. 500 – 1,200' },
                      { id: '1200plus', label: 'Rs. 1,200+' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setFoodPriceRange(p.id)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer text-center ${
                          foodPriceRange === p.id
                            ? 'bg-[#FFF1E6] dark:bg-[#382619] border-[#F26B1D] text-[#F26B1D]'
                            : 'bg-white dark:bg-[#281D16] border-[#F0E4D7] dark:border-[#382B20] text-[#7A6A5C] dark:text-[#CBB8A8]'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Restaurants Mode Filters */
              <div className="space-y-4">
                {/* Order Type */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#7A6A5C] dark:text-[#A8988B] uppercase tracking-wider block">
                    {t('orderType') || 'Order Type'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setOrderType('delivery')}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                        orderType === 'delivery'
                          ? 'bg-[#FFF1E6] dark:bg-[#382619] border-[#F26B1D] text-[#F26B1D]'
                          : 'bg-white dark:bg-[#281D16] border-[#F0E4D7] dark:border-[#382B20] text-[#7A6A5C] dark:text-[#CBB8A8]'
                      }`}
                    >
                      <Truck className="w-4 h-4" />
                      <span>{t('delivery') || 'Delivery'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrderType('pickup')}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                        orderType === 'pickup'
                          ? 'bg-[#FFF1E6] dark:bg-[#382619] border-[#F26B1D] text-[#F26B1D]'
                          : 'bg-white dark:bg-[#281D16] border-[#F0E4D7] dark:border-[#382B20] text-[#7A6A5C] dark:text-[#CBB8A8]'
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>{t('pickup') || 'Pickup'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrderType('dinein')}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                        orderType === 'dinein'
                          ? 'bg-[#FFF1E6] dark:bg-[#382619] border-[#F26B1D] text-[#F26B1D]'
                          : 'bg-white dark:bg-[#281D16] border-[#F0E4D7] dark:border-[#382B20] text-[#7A6A5C] dark:text-[#CBB8A8]'
                      }`}
                    >
                      <Store className="w-4 h-4" />
                      <span>{t('dineIn') || 'Dine-in'}</span>
                    </button>
                  </div>
                </div>

                {/* Preferences */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#7A6A5C] dark:text-[#A8988B] uppercase tracking-wider block">
                    Preferences
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-[#F0E4D7] dark:border-[#382B20] cursor-pointer hover:bg-slate-50/50 dark:hover:bg-[#281D16]/50 transition">
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-[#F26B1D]" />
                      <span className="text-xs font-bold text-[#2B2118] dark:text-[#FFF9F2]">
                        {t('openNow') || 'Open now'}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={filterOpenNow}
                      onChange={(e) => setFilterOpenNow(e.target.checked)}
                      className="w-4 h-4 text-[#F26B1D] accent-[#F26B1D] rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-[#F0E4D7] dark:border-[#382B20] cursor-pointer hover:bg-slate-50/50 dark:hover:bg-[#281D16]/50 transition">
                    <div className="flex items-center gap-2.5">
                      <Truck className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-[#2B2118] dark:text-[#FFF9F2]">
                        {t('freeDelivery') || 'Free delivery'}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={filterFreeDelivery}
                      onChange={(e) => setFilterFreeDelivery(e.target.checked)}
                      className="w-4 h-4 text-[#F26B1D] accent-[#F26B1D] rounded cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center gap-3 pt-3 border-t border-[#F0E4D7] dark:border-[#382B20]">
              <button
                type="button"
                onClick={handleClearFilters}
                className="flex-1 py-2.5 rounded-xl border border-[#F0E4D7] dark:border-[#382B20] text-xs font-bold text-[#7A6A5C] dark:text-[#CBB8A8] hover:bg-slate-50 dark:hover:bg-[#281D16] transition cursor-pointer"
              >
                {t('clearAll') || 'Clear all'}
              </button>

              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(false)}
                className="flex-1 btn-primary py-2.5 rounded-xl text-xs font-bold cursor-pointer"
              >
                {t('applyFilters') || 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          10. CART CONFLICT MODAL
          "Start a new cart from this restaurant?"
          ======================================================== */}
      {cartConflictItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#221A14] rounded-2xl border border-[#F0E4D7] dark:border-[#382B20] shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#FFF1E6] dark:bg-[#382417] text-[#F26B1D] flex items-center justify-center mx-auto shadow-xs">
              <ShoppingBag className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-heading font-extrabold text-base text-[#2B2118] dark:text-[#FFF9F2]">
                Start a new cart from this restaurant?
              </h3>
              <p className="text-xs text-[#7A6A5C] dark:text-[#CBB8A8] leading-relaxed">
                Your cart already contains items from{' '}
                <span className="font-bold text-[#2B2118] dark:text-[#FFF9F2]">
                  {cartConflictItem.previousRestaurantName || 'another restaurant'}
                </span>
                . Adding this item from{' '}
                <span className="font-bold text-[#F26B1D]">{cartConflictItem.restaurant_name}</span> will
                clear your previous selection.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmNewCart}
                className="w-full btn-primary min-h-[44px] text-xs font-bold"
              >
                Start New Cart
              </button>
              <button
                type="button"
                onClick={() => setCartConflictItem(null)}
                className="w-full py-2 text-xs font-bold text-[#7A6A5C] dark:text-[#CBB8A8] hover:text-[#2B2118] dark:hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          11. TOAST NOTIFICATION
          ======================================================== */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#2B2118] text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-bold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================
          12. Mobile Bottom Navigation
          ======================================================== */}
      <CustomerBottomNav
        onSearchClick={() => {
          const input = document.getElementById('marketplace-search-input');
          if (input) {
            input.focus();
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }}
      />

      {/* Customer Cart Drawer */}
      <CustomerCartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
        cart={activeCartItems}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={(idx) => handleUpdateCartQty(idx, -999)}
        restaurant={activeCartRestaurant}
        onCartClear={handleClearCart}
      />

      {/* Location Modal */}
      <CustomerLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onLocationSelect={handleLocationSelect}
        onSkip={handleSkipLocation}
        initialView={modalInitialView}
        currentLocation={customerLocation}
      />

      {/* Sign In Required Modal */}
      {showSignInFavModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#221A14] rounded-2xl border border-[#F0E4D7] dark:border-[#382B20] shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mx-auto shadow-sm">
              <Heart className="w-6 h-6 fill-rose-500" />
            </div>
            <div className="space-y-1">
              <h3 className="font-heading font-extrabold text-base text-[#2B2118] dark:text-[#FFF9F2]">
                {t('saveFavoritesPromptTitle') || 'Save Your Favorite Restaurants'}
              </h3>
              <p className="text-xs text-[#7A6A5C] dark:text-[#CBB8A8]">
                {t('saveFavoritesPromptSubtitle') ||
                  'Sign in to your customer account to bookmark your favorite spots.'}
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => navigate('/account')}
                className="w-full btn-primary min-h-[44px] text-xs font-bold"
              >
                {t('signInToAccount') || 'Sign in'}
              </button>
              <button
                type="button"
                onClick={() => setShowSignInFavModal(false)}
                className="w-full py-2 text-xs font-bold text-[#7A6A5C] dark:text-[#CBB8A8] hover:text-[#2B2118] transition cursor-pointer"
              >
                {t('maybeLater') || 'Maybe later'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
