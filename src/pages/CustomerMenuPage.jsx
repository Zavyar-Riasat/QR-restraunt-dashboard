import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { isReservedSlug } from '../config/appConfig';
import { menuService } from '../services/menuService';
import { restaurantService } from '../services/restaurantService';
import { marketplaceService } from '../services/marketplaceService';
import { checkRestaurantDeliveryCoverage } from '../utils/geoValidation';
import VariantCustomizationModal from '../components/VariantCustomizationModal';
import CustomerCartDrawer from '../components/CustomerCartDrawer';
import CustomerOrderTracker from '../components/CustomerOrderTracker';
import DirectOrderCheckout from '../components/DirectOrderCheckout';
import CustomerAuthModal from '../components/Customer/CustomerAuthModal';
import ErrorBoundary from '../components/ErrorBoundary';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { formatPKR } from '../utils/currencyUtils';
import {
  UtensilsCrossed,
  Search,
  Plus,
  Minus,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  ArrowLeft,
  
  ShoppingBag,
  MapPin,
  Clock,
  Lock,
  Truck,
  ArrowRight,
  X,
  User,
} from 'lucide-react';
import {
  isDeal,
  getItemDealInfo,
  getItemVariants,
  getItemAvailability,
  getItemImage,
  getItemDescription,
  getItemPricing,
} from '../utils/dealUtils';

const UI_TRANSLATIONS = {
  en: {
    all_items: 'All Items',
    deals_combos: 'Deals & Combos',
    search_placeholder: 'Search dishes, ingredients, deals...',
    no_dishes: 'No dishes found',
    no_dishes_sub: 'Try searching for something else or pick another category.',
    prep: 'Prep',
    delivery: 'Delivery',
    free_delivery: 'Free Delivery',
    min_order: 'Min Order',
    kitchen_paused: 'Kitchen Orders Paused',
    kitchen_paused_sub: 'The kitchen is currently not taking new orders.',
    add: 'Add',
    choose_options: 'Select Options',
    save: 'Save',
    off: 'off',
    items: 'items',
    item: 'item',
    view_order: 'View Order',
    your_order: 'Your Order',
    subtotal: 'Subtotal',
    delivery_fee: 'Delivery Fee',
    total_payable: 'Total Payable',
    place_order: 'Place Order',
    customer_name: 'Your Name',
    customer_name_placeholder: 'e.g. Ali Khan',
    customer_phone: 'Phone Number',
    customer_phone_placeholder: '0300 1234567',
    customer_address: 'Delivery Address',
    customer_address_placeholder: 'House / Apt #, Street, Area, City',
    special_notes: 'Cooking / Delivery Instructions',
    special_notes_placeholder: 'e.g. Less spicy, leave at door',
    order_success: 'Order Received by Kitchen!',
    order_success_sub: 'Your order is confirmed and being freshly prepared.',
  },
};

export default function CustomerMenuPage() {
  const navigate = useNavigate();
  const { customer, isCustomerAuthenticated } = useCustomerAuth();
  const { restaurantSlug, slug } = useParams();
  const effectiveSlug = restaurantSlug || slug || 'burgersmoke';

  // Guard: If slug is a reserved route keyword, redirect to home page immediately
  useEffect(() => {
    if (isReservedSlug(effectiveSlug)) {
      navigate('/', { replace: true });
    }
  }, [effectiveSlug, navigate]);

  const initialSyncMenu = React.useMemo(() => {
    if (isReservedSlug(effectiveSlug)) return null;
    try {
      return restaurantService.getInitialStateSync({ slug: effectiveSlug });
    } catch {
      return null;
    }
  }, [effectiveSlug]);

  const [loading, setLoading] = useState(() => !initialSyncMenu?.restaurant);
  const [error, setError] = useState(null);
  const [restaurant, setRestaurant] = useState(() => initialSyncMenu?.restaurant || null);
  const [categories, setCategories] = useState(() => initialSyncMenu?.categories || []);
  const [menuItems, setMenuItems] = useState(() => initialSyncMenu?.menuItems || []);
  const t = UI_TRANSLATIONS.en;

  // Filter & Search
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const categoryScrollRef = useRef(null);

  const handleScrollCategories = (direction) => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({ left: direction * 240, behavior: 'smooth' });
    }
  };

  // Cart & Customization State (Persisted per restaurant in localStorage)
  const cartStorageKey = `dinehq_cart_${effectiveSlug}`;
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(`dinehq_cart_${effectiveSlug}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Error reading saved restaurant cart:', e);
    }
    return [];
  });

  // Sync cart to localStorage per restaurant whenever cart changes
  useEffect(() => {
    try {
      if (cart && cart.length > 0) {
        localStorage.setItem(cartStorageKey, JSON.stringify(cart));
        if (restaurant?.name) {
          localStorage.setItem(`dinehq_cart_name_${effectiveSlug}`, restaurant.name);
          localStorage.setItem('dinehq_active_cart_name', restaurant.name);
        }
        localStorage.setItem('dinehq_active_cart_slug', effectiveSlug);
      } else {
        localStorage.removeItem(cartStorageKey);
        if (localStorage.getItem('dinehq_active_cart_slug') === effectiveSlug) {
          localStorage.removeItem('dinehq_active_cart_slug');
          localStorage.removeItem('dinehq_active_cart_name');
        }
      }
      window.dispatchEvent(new Event('dinehq_cart_updated'));
    } catch (e) {
      console.warn('Error syncing restaurant cart to localStorage:', e);
    }
  }, [cart, cartStorageKey, effectiveSlug, restaurant?.name]);

  const [selectedItemForModal, setSelectedItemForModal] = useState(null);
  const [cartConflictState, setCartConflictState] = useState(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAuthAction, setPendingAuthAction] = useState(null);

  // Customer Saved Location & Delivery Areas
  const [customerLocation, _setCustomerLocation] = useState(() => {
    try {
      const saved = localStorage.getItem('dinehq_customer_location');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.lat != null && parsed.lng != null) return parsed;
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

  const [deliveryAreas, setDeliveryAreas] = useState([]);
  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false);
  const isDevMode = Boolean(
    import.meta.env?.DEV ||
      (typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  );
  const [devRangeBypass, setDevRangeBypass] = useState(false);

  // Desktop Checkout & Tracker States
  const [isDesktopCheckout, setIsDesktopCheckout] = useState(false);
  const [desktopOrder, setDesktopOrder] = useState(null);
  const [activeTrackerModalOrder, setActiveTrackerModalOrder] = useState(null);
  const [persistedActiveOrderId, setPersistedActiveOrderId] = useState(null);
  const [scannedTable, setScannedTable] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('table') || urlParams.get('t') || '';
    } catch {
      return '';
    }
  });

  // Table QR guard: Only hide back button when arrived via table QR
  const hasTableQr = Boolean(scannedTable);
  const hideHeaderBackButton = hasTableQr;
  const handledHighlightRef = useRef(null);

  const handleBackClick = () => {
    if (cart.length > 0) {
      setShowLeaveConfirmModal(true);
    } else {
      navigate('/');
    }
  };

  // Check for active order from URL query or local storage
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const queryOrderId = urlParams.get('order') || urlParams.get('orderId');

      if (queryOrderId) {
        setPersistedActiveOrderId(queryOrderId);
        setActiveTrackerModalOrder({ id: queryOrderId });
      } else {
        const raw = localStorage.getItem('dinehq_active_order');
        if (raw) {
          const parsed = JSON.parse(raw);
          const currentRestId = initialSyncMenu?.restaurant?.id;
          if (
            parsed?.id &&
            (!parsed.restaurantId || !currentRestId || parsed.restaurantId === currentRestId)
          ) {
            setPersistedActiveOrderId(parsed.id);
          }
        }
      }
    } catch (e) {
      console.warn('Error checking active order:', e);
    }
  }, []);

  // Load menu data
  useEffect(() => {
    if (isReservedSlug(effectiveSlug)) return;

    async function loadData() {
      try {
        if (!initialSyncMenu?.restaurant) {
          setLoading(true);
        } else {
          setRestaurant(initialSyncMenu.restaurant);
          setCategories(initialSyncMenu.categories || []);
          setMenuItems(initialSyncMenu.menuItems || []);
        }
        setError(null);
        const data = await menuService.getMenuBySlug(effectiveSlug);
        setRestaurant(data.restaurant);
        setCategories(data.categories || []);
        setMenuItems(data.menuItems || []);
      } catch (err) {
        console.error('Failed to load menu:', err);
        if (!initialSyncMenu?.restaurant) {
          setError('This restaurant menu could not be loaded. Please verify the URL.');
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [effectiveSlug]);

  // Load restaurant delivery areas
  useEffect(() => {
    if (!restaurant?.id && !restaurant?.slug) return;
    marketplaceService
      .getDeliveryAreas(restaurant.id, restaurant.slug)
      .then((areas) => setDeliveryAreas(areas || []))
      .catch((err) => console.warn('Error loading delivery areas:', err));
  }, [restaurant?.id, restaurant?.slug]);

  // Calculate delivery coverage & distance to customer
  const deliveryCoverage = React.useMemo(() => {
    if (!restaurant) return { deliversToUser: true, distanceKm: null };
    const coverage = checkRestaurantDeliveryCoverage(customerLocation, restaurant, deliveryAreas);
    if (isDevMode && devRangeBypass) {
      return { ...coverage, deliversToUser: true, devBypassed: true };
    }
    return coverage;
  }, [customerLocation, restaurant, deliveryAreas, isDevMode, devRangeBypass]);

  // Find if another restaurant already has items in localStorage cart
  const findOtherRestaurantCart = React.useCallback(() => {
    try {
      const activeSlug = localStorage.getItem('dinehq_active_cart_slug');
      const activeName = localStorage.getItem('dinehq_active_cart_name');

      if (activeSlug && activeSlug !== effectiveSlug) {
        const raw = localStorage.getItem(`dinehq_cart_${activeSlug}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return {
              slug: activeSlug,
              name: activeName || localStorage.getItem(`dinehq_cart_name_${activeSlug}`) || activeSlug,
            };
          }
        }
      }

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('dinehq_cart_') && !key.startsWith('dinehq_cart_name_')) {
          const otherSlug = key.replace('dinehq_cart_', '');
          if (otherSlug && otherSlug !== effectiveSlug) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const otherName =
                  localStorage.getItem(`dinehq_cart_name_${otherSlug}`) ||
                  (activeSlug === otherSlug ? activeName : null) ||
                  otherSlug;
                return { slug: otherSlug, name: otherName };
              }
            }
          }
        }
      }
    } catch {}
    return null;
  }, [effectiveSlug]);

  // Cart helper functions
  const openItemCustomizationDirectly = React.useCallback(
    (item) => {
      if (!getItemAvailability(item)) return; // blocked if sold out
      const pricing = getItemPricing(item, restaurant);
      setSelectedItemForModal({
        ...item,
        price: pricing.finalPrice,
        original_price: pricing.originalPrice,
      });
    },
    [restaurant]
  );

  const handleOpenCustomization = React.useCallback(
    (item) => {
      if (!getItemAvailability(item)) return; // blocked if sold out

      if (!isCustomerAuthenticated || !customer) {
        setPendingAuthAction({ type: 'item', item });
        setShowAuthModal(true);
        return;
      }

      const otherCart = findOtherRestaurantCart();
      if (otherCart) {
        setCartConflictState({
          pendingItem: item,
          previousRestaurantSlug: otherCart.slug,
          previousRestaurantName: otherCart.name,
        });
        return;
      }

      openItemCustomizationDirectly(item);
    },
    [isCustomerAuthenticated, customer, findOtherRestaurantCart, openItemCustomizationDirectly]
  );

  // Highlight dish and open customization modal once if arrived via Food mode 'View' link
  useEffect(() => {
    if (!menuItems || menuItems.length === 0) return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const highlightId = urlParams.get('highlight');
      if (highlightId && handledHighlightRef.current !== highlightId) {
        const found = menuItems.find(
          (m) => String(m.id) === String(highlightId) || (m.title && m.title.toLowerCase().includes(highlightId.toLowerCase()))
        );
        if (found) {
          handledHighlightRef.current = highlightId;
          setTimeout(() => {
            handleOpenCustomization(found);
            const el = document.getElementById(`item-${found.id}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 300);
        }
      }
    } catch {}
  }, [menuItems, handleOpenCustomization]);

  const handleConfirmSwitchRestaurantCart = () => {
    if (!cartConflictState) return;
    const { pendingItem, previousRestaurantSlug } = cartConflictState;
    try {
      if (previousRestaurantSlug) {
        localStorage.removeItem(`dinehq_cart_${previousRestaurantSlug}`);
      }
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          key.startsWith('dinehq_cart_') &&
          !key.startsWith('dinehq_cart_name_') &&
          key !== cartStorageKey
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      localStorage.setItem('dinehq_active_cart_slug', effectiveSlug);
      if (restaurant?.name) {
        localStorage.setItem('dinehq_active_cart_name', restaurant.name);
        localStorage.setItem(`dinehq_cart_name_${effectiveSlug}`, restaurant.name);
      }
      window.dispatchEvent(new Event('dinehq_cart_updated'));
    } catch {}

    setCartConflictState(null);
    if (pendingItem) {
      openItemCustomizationDirectly(pendingItem);
    }
  };

  const handleAddToCart = (configuredItem) => {
    if (!isCustomerAuthenticated || !customer) {
      setShowAuthModal(true);
      return;
    }
    const choiceKey = (configuredItem.choiceDetails || []).sort().join('|');
    const existingIndex = cart.findIndex(
      (c) =>
        c.item.id === configuredItem.item.id &&
        (c.choiceDetails || []).sort().join('|') === choiceKey
    );

    if (existingIndex >= 0) {
      const updated = [...cart];
      updated[existingIndex].quantity += configuredItem.quantity;
      setCart(updated);
    } else {
      setCart([...cart, configuredItem]);
    }
  };

  const handleUpdateQty = (cartIndex, delta) => {
    if (delta > 0 && (!isCustomerAuthenticated || !customer)) {
      setShowAuthModal(true);
      return;
    }
    const updated = [...cart];
    const newQty = updated[cartIndex].quantity + delta;
    if (newQty <= 0) {
      updated.splice(cartIndex, 1);
    } else {
      updated[cartIndex].quantity = newQty;
    }
    setCart(updated);
  };

  const handleRemoveItem = (cartIndex) => {
    setCart(cart.filter((_, i) => i !== cartIndex));
  };

  // Calculations
  const isFreeDelivery = restaurant?.delivery_mode === 'free';
  const isHiddenDelivery = restaurant?.delivery_mode === 'none';
  const deliveryFee = (isFreeDelivery || isHiddenDelivery || scannedTable) ? 0 : (Number(restaurant?.delivery_fee) || 0);

  const checkMinOrder = restaurant?.show_min_order !== false;
  const minOrder = checkMinOrder ? (Number(restaurant?.min_order_amount) || 0) : 0;
  const isKitchenOpen = restaurant?.is_open !== false;

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const finalTotal = subtotal + deliveryFee;
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const meetsMinOrder = !checkMinOrder || minOrder === 0 || subtotal >= minOrder;

  const formatCategoryName = (name) => {
    if (!name) return '';
    return name
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  const dealItemsList = menuItems.filter(isDeal);

  // Deduplicate categories, removing any duplicate "Deals & Combos" tab if we have dedicated Deals
  const displayCategories = categories.filter((cat) => {
    const norm = (cat.name || '').toLowerCase().trim();
    if (dealItemsList.length > 0 && (norm.includes('deal') || norm.includes('combo') || cat.id === 'cat-deals')) {
      return false;
    }
    return true;
  });

  // Filtering
  const filteredItems = menuItems.filter((item) => {
    let matchesCategory = false;
    if (activeCategory === 'ALL') {
      matchesCategory = true;
    } else if (activeCategory === 'DEALS') {
      matchesCategory = isDeal(item);
    } else {
      matchesCategory = item.category_id === activeCategory;
    }

    const dealInfo = getItemDealInfo(item);
    const itemDesc = getItemDescription(item);
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      itemDesc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dealInfo && dealInfo.deal_items && dealInfo.deal_items.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const getCategoryName = (catId) => {
    const cat = categories.find((c) => c.id === catId);
    return cat ? formatCategoryName(cat.name) : 'General';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-800 font-heading font-bold text-sm">Preparing Kitchen Menu...</p>
        <p className="text-xs text-slate-500 mt-1">Connecting to live store</p>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-md">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Store Menu Unavailable</h2>
          <p className="text-xs text-slate-500 mb-6">{error || 'Restaurant not found'}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
          >
            <span>Browse Nearby Restaurants</span>
          </Link>
        </div>
      </div>
    );
  }

  // Block restaurant visibility if customer is outside delivery range (unless scanning a Dine-In table QR)
  if (!scannedTable && deliveryCoverage && deliveryCoverage.deliversToUser === false) {
    return (
      <div className="min-h-screen bg-[#FFF9F2] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-[#F0E4D7] p-8 text-center shadow-lg space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-[#F26B1D] border border-amber-200 flex items-center justify-center mx-auto">
            <MapPin className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-heading font-extrabold text-[#2B2118]">
              Outside Delivery Range
            </h2>
            <p className="text-xs sm:text-sm text-[#7A6A5C] leading-relaxed">
              <strong>{restaurant.name}</strong> does not currently deliver to your selected location
              {customerLocation?.name ? ` (${customerLocation.name})` : ''}
              {deliveryCoverage.distanceKm != null ? ` — ${deliveryCoverage.distanceKm} km away` : ''}.
            </p>
          </div>
          <div className="pt-2 flex flex-col items-center justify-center gap-2.5">
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs sm:text-sm font-bold transition shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>View Restaurants in Your Range</span>
            </Link>

            {isDevMode && (
              <button
                type="button"
                onClick={() => setDevRangeBypass(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-[#B45309] border border-dashed border-amber-300 text-xs sm:text-sm font-extrabold transition cursor-pointer"
                title="Development Mode Only: Bypass delivery range check"
              >
                <span>⚡ Quick Enter (Dev Mode)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const primaryColor = restaurant?.primary_color || '#F26B1D';

  return (
    <div
      className="min-h-screen bg-[#FFF9F2] text-[#2B2118] flex flex-col font-sans selection:bg-[#F26B1D] selection:text-white"
      style={{ '--color-primary': primaryColor }}
    >
      {/* Top Storefront Web Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-[#F0E4D7] shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-2 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 shrink">
            {/* Back button to "/" (Nearby restaurants) - Hidden if arrived via table QR with open dine-in order */}
            {!hideHeaderBackButton && (
              <button
                type="button"
                onClick={handleBackClick}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#FFF9F2] hover:bg-[#FFF1E6] text-[#7A6A5C] hover:text-[#2B2118] border border-[#F0E4D7] text-xs font-bold transition cursor-pointer shrink-0"
                title="Back to Nearby Restaurants"
                aria-label="Back to nearby restaurants"
              >
                <ArrowLeft className="w-4 h-4 text-[#2B2118]" />
                <span className="hidden sm:inline">Back</span>
              </button>
            )}

            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {restaurant.logo_url ? (
                <img
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain bg-white border border-[#F0E4D7] shadow-2xs p-0.5 shrink-0"
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md text-white font-bold shrink-0"
                  style={{ backgroundColor: primaryColor }}
                >
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="font-heading font-extrabold text-[#2B2118] text-sm sm:text-lg tracking-tight leading-tight truncate">
                  {restaurant.name}
                </h1>
                <div className="text-[11px] text-[#7A6A5C] flex flex-wrap items-center gap-1.5 sm:gap-2">
                  {!isKitchenOpen && (
                    <span className="font-bold flex items-center gap-1 text-[#E5484D]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E5484D]"></span>
                      Kitchen Paused
                    </span>
                  )}

                  {/* Distance badge */}
                  {deliveryCoverage?.distanceKm != null && (
                    <span className="font-bold text-slate-700 flex items-center gap-0.5">
                      <MapPin className="w-3 h-3 text-[#F26B1D]" />
                      <span>{deliveryCoverage.distanceKm} km</span>
                    </span>
                  )}

                  {(restaurant?.phone || restaurant?.whatsapp_number) && (
                    <>
                      <span className="hidden md:inline">•</span>
                      <span className="hidden md:inline">Ph: +{restaurant?.phone || restaurant?.whatsapp_number}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Customer Account / Avatar Pill */}
            {isCustomerAuthenticated && customer ? (
              <Link
                to="/account?tab=profile"
                title="View & edit your profile and avatar"
                className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-white hover:bg-[#FFF1E6] border border-[#F0E4D7] hover:border-[#F26B1D] text-xs font-bold text-[#2B2118] transition shadow-2xs"
              >
                <img
                  src={
                    customer.avatar ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(customer.name || 'Guest')}`
                  }
                  alt={customer.name || 'Customer'}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                      customer.name || 'Guest'
                    )}`;
                  }}
                  className="w-6 h-6 rounded-lg object-cover border border-[#FCD8BF] bg-[#FFF1E6]"
                />
                <span className="hidden sm:inline">
                  {customer.name ? customer.name.split(' ')[0] : 'Account'}
                </span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#FFF1E6] border border-[#F0E4D7] hover:border-[#F26B1D] text-xs font-bold text-[#2B2118] transition shadow-2xs cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-[#F26B1D]" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}

            {/* Header Cart Button */}
            <button
              id="menu-navbar-cart-button"
              type="button"
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setIsMobileCartOpen(true);
                } else {
                  const cartSection = document.getElementById('desktop-cart-sidebar');
                  if (cartSection) {
                    cartSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  } else {
                    setIsMobileCartOpen(true);
                  }
                }
              }}
              className="relative px-2.5 sm:px-3 py-1.5 rounded-xl bg-white hover:bg-[#FFF1E6] text-[#2B2118] text-xs font-bold border border-[#F0E4D7] transition flex items-center gap-1.5 cursor-pointer shadow-2xs group"
              title={totalItemCount > 0 ? `Cart (${totalItemCount} items)` : 'Your Cart'}
            >
              <ShoppingBag className="w-4 h-4 text-[#F26B1D] group-hover:scale-105 transition-transform" style={{ color: primaryColor }} />
              <span className="hidden sm:inline font-bold">{t.your_order || 'Cart'}</span>
              {totalItemCount > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded-full text-white text-[10px] font-mono font-bold leading-none"
                  style={{ backgroundColor: primaryColor }}
                >
                  {totalItemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Active Order Live Tracker Notification Banner */}
        {persistedActiveOrderId && (
          <div className="bg-[#E7F6EC] border-t border-[#C0E9CE] py-2 px-3 sm:px-6">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-[#1F9D55] min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#1F9D55] animate-ping shrink-0" />
                <span className="truncate">Active Order #{persistedActiveOrderId} is being processed!</span>
              </div>
              <button
                onClick={() => setActiveTrackerModalOrder({ id: persistedActiveOrderId })}
                className="px-3 py-1.5 rounded-xl bg-[#1F9D55] text-white font-extrabold text-[11px] shadow-sm hover:brightness-95 transition cursor-pointer flex items-center gap-1.5 shrink-0 self-end sm:self-auto"
              >
                <Clock className="w-3 h-3" />
                <span>Track Live Status</span>
              </button>
            </div>
          </div>
        )}

        {/* Table Auto-Detection Banner */}
        {scannedTable && (
          <div className="bg-amber-50 border-t border-amber-200 py-2.5 px-4 sm:px-6 animate-fadeIn">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <span className="w-5 h-5 rounded-md bg-[#F26B1D] text-white flex items-center justify-center font-black text-[10px]">
                  #{scannedTable}
                </span>
                <span>Dine-In • Table #{scannedTable} auto-selected for this order!</span>
              </div>
              <button
                type="button"
                onClick={() => setScannedTable('')}
                className="text-[11px] font-bold text-[#F26B1D] hover:underline cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Responsive Storefront Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5 sm:space-y-6">
        {/* Kitchen Paused Banner if inactive */}
        {!isKitchenOpen && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm font-medium flex items-center gap-3 shadow-xs animate-fadeIn">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold text-rose-950">{t.kitchen_paused}</p>
              <p className="text-xs text-rose-800 mt-0.5">
                {t.kitchen_paused_sub}
              </p>
            </div>
          </div>
        )}

        {/* Full-Width Restaurant Showcase Banner */}
        <section className="p-5 sm:p-7 md:p-8 rounded-3xl bg-gradient-to-r from-[#2B2118] via-[#3E2D20] to-[#2B2118] text-white shadow-xl relative overflow-hidden border border-[#F0E4D7]/20 transition-all">
          {/* Ambient Animated Glow Aurora */}
          <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-gradient-to-br from-[#F26B1D]/30 via-amber-500/20 to-transparent blur-3xl pointer-events-none animate-aurora" />
          <div className="absolute -bottom-10 -left-10 w-52 h-52 rounded-full bg-gradient-to-tr from-amber-600/20 via-[#F26B1D]/15 to-transparent blur-2xl pointer-events-none animate-float-slow" />

          <div className="relative z-10 max-w-2xl space-y-3">
            {restaurant.logo_url && (
              <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-white p-1.5 shadow-xl border border-white/20 mb-1 inline-block transition-transform duration-300 hover:scale-105 hover:rotate-1">
                <img
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>
            )}
            <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-extrabold tracking-tight leading-tight">
              {restaurant.name}
            </h2>

            {/* Dynamic Manager Configured Storefront Pills */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1 text-xs font-semibold text-[#FEF3D9]">
              {deliveryCoverage?.distanceKm != null && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20 text-white font-bold hover:bg-white/15 transition-colors">
                  <MapPin className="w-3.5 h-3.5 text-[#F5A623]" />
                  <span>{deliveryCoverage.distanceKm} km away</span>
                </div>
              )}
              {restaurant?.show_prep_time !== false && (restaurant?.prep_time || '20–30 mins') && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#F5A623]" />
                  <span>{t.prep}: {restaurant?.prep_time || '20–30 mins'}</span>
                </div>
              )}
              {restaurant?.delivery_mode !== 'none' && (
                <div className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-[#F5A623]" />
                  <span>
                    {t.delivery}:{' '}
                    {restaurant?.delivery_mode === 'free'
                      ? t.free_delivery
                      : deliveryFee > 0
                      ? formatPKR(deliveryFee)
                      : t.free_delivery}
                  </span>
                </div>
              )}
              {checkMinOrder && minOrder > 0 && (
                <div className="flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-[#F5A623]" />
                  <span>{t.min_order}: {formatPKR(minOrder)}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 2-Column Responsive Layout: Left Menu / Right Web Cart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Column: Categories, Search & Dishes */}
          <div className="lg:col-span-7 xl:col-span-8 min-w-0 space-y-6">
            {/* Search, Category Dropdown & Scrollable Filter Bar */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative flex-1 min-w-0">
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#9E8E81]" />
                  <input
                    type="text"
                    placeholder={t.search_placeholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-white border border-[#F0E4D7] text-[#2B2118] text-sm placeholder:text-[#9E8E81] focus:outline-none focus:border-[#F26B1D] shadow-2xs transition"
                  />
                </div>

                {/* Category Dropdown Selector */}
                <div className="relative shrink-0 sm:w-56">
                  <select
                    value={activeCategory}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'ALL' || val === 'DEALS') {
                        setActiveCategory(val);
                      } else {
                        const matchedCat = displayCategories.find((c) => String(c.id) === val);
                        setActiveCategory(matchedCat ? matchedCat.id : val);
                      }
                    }}
                    className="w-full appearance-none pl-3.5 pr-9 py-2.5 rounded-2xl bg-white border border-[#F0E4D7] hover:border-[#F26B1D] text-[#2B2118] text-xs sm:text-sm font-bold focus:outline-none focus:border-[#F26B1D] shadow-2xs transition cursor-pointer"
                  >
                    <option value="ALL">{t.all_items} ({menuItems.length})</option>
                    {dealItemsList.length > 0 && (
                      <option value="DEALS">🔥 {t.deals_combos} ({dealItemsList.length})</option>
                    )}
                    {displayCategories.map((cat) => {
                      const count = menuItems.filter((i) => i.category_id === cat.id).length;
                      return (
                        <option key={cat.id} value={cat.id}>
                          {formatCategoryName(cat.name)} ({count})
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#7A6A5C] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Scrollable Category Pills Navigation with Left/Right Scroll Controls */}
              <div className="sticky top-20 z-30 bg-[#FFF9F2]/95 backdrop-blur-md py-2 -mx-4 px-4 sm:-mx-0 sm:px-0 flex items-center gap-1.5 border-b border-[#F0E4D7] sm:border-0 min-w-0">
                <button
                  type="button"
                  onClick={() => handleScrollCategories(-1)}
                  className="hidden sm:flex items-center justify-center w-8 h-8 rounded-xl bg-white hover:bg-[#FFF1E6] text-[#7A6A5C] hover:text-[#F26B1D] border border-[#F0E4D7] shadow-2xs transition cursor-pointer shrink-0"
                  title="Scroll categories left"
                  aria-label="Scroll categories left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div
                  ref={categoryScrollRef}
                  onWheel={(e) => {
                    if (e.deltaY !== 0 && categoryScrollRef.current) {
                      categoryScrollRef.current.scrollLeft += e.deltaY;
                    }
                  }}
                  className="flex items-center gap-1.5 overflow-x-auto scroll-smooth min-w-0 flex-1 pb-1"
                >
                  <button
                    type="button"
                    onClick={() => setActiveCategory('ALL')}
                    style={activeCategory === 'ALL' ? { backgroundColor: primaryColor } : {}}
                    className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                      activeCategory === 'ALL'
                        ? 'text-white shadow-2xs'
                        : 'bg-white text-[#7A6A5C] hover:text-[#2B2118] hover:bg-[#FFF1E6] border border-[#F0E4D7]'
                    }`}
                  >
                    {t.all_items} ({menuItems.length})
                  </button>

                  {dealItemsList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveCategory('DEALS')}
                      style={activeCategory === 'DEALS' ? { backgroundColor: primaryColor } : {}}
                      className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        activeCategory === 'DEALS'
                          ? 'text-white shadow-2xs'
                          : 'bg-[#FEF3D9] text-[#B87000] border border-[#FCE1A8] hover:bg-[#FDE7B6]'
                      }`}
                    >
                      <span>🔥 {t.deals_combos} ({dealItemsList.length})</span>
                    </button>
                  )}

                  {displayCategories.map((cat) => {
                    const count = menuItems.filter((i) => i.category_id === cat.id).length;
                    const isActive = activeCategory === cat.id;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        style={isActive ? { backgroundColor: primaryColor } : {}}
                        className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                          isActive
                            ? 'text-white shadow-md'
                            : 'bg-white text-[#7A6A5C] hover:text-[#2B2118] hover:bg-[#FFF1E6] border border-[#F0E4D7]'
                        }`}
                      >
                        {formatCategoryName(cat.name)} ({count})
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => handleScrollCategories(1)}
                  className="hidden sm:flex items-center justify-center w-8 h-8 rounded-xl bg-white hover:bg-[#FFF1E6] text-[#7A6A5C] hover:text-[#F26B1D] border border-[#F0E4D7] shadow-2xs transition cursor-pointer shrink-0"
                  title="Scroll categories right"
                  aria-label="Scroll categories right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Dishes Grid */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-[#F0E4D7] rounded-3xl p-6 bg-white">
                <UtensilsCrossed className="w-10 h-10 text-[#9E8E81] mx-auto mb-2" />
                <p className="text-sm font-bold text-[#2B2118]">{t.no_dishes}</p>
                <p className="text-xs text-[#7A6A5C] mt-1">
                  {t.no_dishes_sub}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredItems.map((item) => {
                  const isAvailable = getItemAvailability(item);
                  const isSoldOut = !isAvailable;
                  const itemIsDeal = isDeal(item);
                  const dealInfo = getItemDealInfo(item);
                  const variantsList = getItemVariants(item);
                  const hasVariants = variantsList && variantsList.length > 0;
                  const itemImage = getItemImage(item);
                  const itemDesc = getItemDescription(item);
                  const pricing = getItemPricing(item, restaurant);

                  return (
                    <div
                      key={item.id}
                      className={`group relative p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                        isSoldOut
                          ? 'bg-[#FFF9F2]/60 border-[#F0E4D7] opacity-65'
                          : 'bg-white border-[#F0E4D7] shadow-2xs hover:border-[#F26B1D]/40 hover:shadow-md'
                      }`}
                    >
                      <div className="flex flex-col flex-1">
                        {/* 1. SEPARATE HEADING SECTION DIV */}
                        <div className="dish-card-heading pb-2.5 mb-2.5 border-b border-[#F0E4D7]/70">
                          {/* Badges / Meta row */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold text-[#D95A12] bg-[#FFF1E6] px-2.5 py-0.5 rounded-lg border border-[#FCD8BF]/70 tracking-wide uppercase">
                                {getCategoryName(item.category_id)}
                              </span>

                              {itemIsDeal && (
                                <span className="text-[10px] font-extrabold text-[#B87000] bg-[#FEF3D9] px-2.5 py-0.5 rounded-lg border border-[#FCE1A8] flex items-center gap-1">
                                  <span>🔥</span>
                                  <span>{dealInfo.badge || 'Deal'}</span>
                                </span>
                              )}
                            </div>

                            {isSoldOut ? (
                              <span className="text-[10px] font-bold text-[#E5484D] bg-[#FDECEC] border border-[#F9C3C5] px-2.5 py-0.5 rounded-lg shadow-2xs">
                                Sold Out
                              </span>
                            ) : hasVariants ? (
                              <span className="text-[10px] font-semibold text-[#7A6A5C] bg-[#FFF9F2] border border-[#F0E4D7] px-2.5 py-0.5 rounded-lg flex items-center gap-1 shrink-0">
                                <SlidersHorizontal className="w-2.5 h-2.5 text-[#7A6A5C]" />
                                <span>Customizable</span>
                              </span>
                            ) : null}
                          </div>

                          {/* Dish Title */}
                          <h3 className="font-heading font-extrabold text-[#2B2118] text-base sm:text-[17px] leading-snug tracking-tight group-hover:text-[#F26B1D] transition-colors">
                            {item.title}
                          </h3>
                        </div>

                        {/* 2. SEPARATE DESCRIPTION SECTION DIV + PHOTO */}
                        <div className="flex items-start gap-3.5 mb-3 flex-1">
                          {/* Dedicated Description Section */}
                          <div className="dish-card-description flex-1 min-w-0 flex flex-col justify-start">
                            {itemDesc ? (
                              <p className="text-xs sm:text-[13px] text-[#6E5D4F] leading-relaxed line-clamp-3">
                                {itemDesc}
                              </p>
                            ) : itemIsDeal && dealInfo.deal_items ? (
                              <div className="text-xs text-[#9E6200] bg-[#FFF8E7] border border-[#FDE6BA] px-3 py-2 rounded-xl font-medium leading-relaxed">
                                <span className="font-bold">📦 Includes:</span> {dealInfo.deal_items}
                              </div>
                            ) : (
                              <p className="text-xs text-[#9E8E81] italic">
                                Prepared fresh with authentic spices and fine ingredients.
                              </p>
                            )}
                          </div>

                          {/* Food Photo Container */}
                          <div className="relative shrink-0">
                            {itemImage ? (
                              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-[#F0E4D7] bg-[#FFF9F2] shadow-2xs group-hover:shadow-xs transition">
                                <img
                                  src={itemImage}
                                  alt={item.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  loading="lazy"
                                />
                              </div>
                            ) : (
                              <div
                                className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-[#FFF1E6] border border-[#FCD8BF] flex items-center justify-center text-[#F26B1D] shadow-2xs"
                                style={{ color: primaryColor }}
                              >
                                <UtensilsCrossed className="w-7 h-7 stroke-[1.75]" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 3. SEPARATE FOOTER / PRICING & ACTION SECTION DIV */}
                      <div className="dish-card-footer flex items-center justify-between pt-3 mt-auto border-t border-[#F0E4D7]/80">
                        <div className="flex flex-col">
                          <div className="flex items-baseline gap-2">
                            {/* 1. DISCOUNTED / SELLING PRICE FIRST */}
                            <span className="text-base sm:text-lg font-extrabold text-[#2B2118] font-mono">
                              {formatPKR(pricing.finalPrice)}
                            </span>
                            {/* 2. THEN ORIGINAL PRICE STRIKETHROUGH */}
                            {pricing.hasDiscount && (
                              <span className="text-xs text-[#9E8E81] line-through font-mono">
                                {formatPKR(pricing.originalPrice)}
                              </span>
                            )}
                          </div>
                          {pricing.hasDiscount && (
                            <span className="text-[10px] font-bold text-[#1F9D55] bg-[#E7F6EC] border border-[#C0E9CE] px-2 py-0.5 rounded-md mt-0.5 w-fit">
                              {t.save || 'Save'} {formatPKR(pricing.savings)} ({pricing.discountPercent}% {t.off || 'off'})
                            </span>
                          )}
                        </div>

                        {isSoldOut ? (
                          <button
                            disabled
                            className="px-4 py-2 rounded-xl font-bold text-xs bg-[#FFF9F2] text-[#9E8E81] cursor-not-allowed border border-[#F0E4D7]"
                          >
                            Sold Out
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenCustomization(item)}
                            style={{ backgroundColor: primaryColor }}
                            className="px-4 py-2 sm:px-4.5 sm:py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer text-white shadow-xs hover:shadow-md hover:opacity-95 active:scale-[0.98]"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>{itemIsDeal ? 'Choose Deal' : hasVariants ? t.choose_options : t.add}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Web Desktop Persistent Cart & Checkout Panel */}
          <div id="desktop-cart-sidebar" className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-20 lg:top-24">
            <div className="h-[calc(100vh-6.5rem)] max-h-[820px] min-h-[480px] rounded-3xl bg-white border border-slate-200/90 shadow-sm flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-heading font-extrabold text-slate-900 text-base">Your Order</h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {totalItemCount} item{totalItemCount !== 1 ? 's' : ''} in cart
                    </p>
                  </div>
                </div>

                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-xs text-slate-400 hover:text-rose-600 transition font-medium cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Cart Items List, Direct Checkout, or Live Status Tracker */}
              {desktopOrder ? (
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-50">
                  <ErrorBoundary>
                    <CustomerOrderTracker
                      order={desktopOrder}
                      restaurant={restaurant}
                      onClose={() => {
                        setDesktopOrder(null);
                        setIsDesktopCheckout(false);
                        setCart([]);
                      }}
                      onNewOrder={() => {
                        setDesktopOrder(null);
                        setIsDesktopCheckout(false);
                        setCart([]);
                      }}
                    />
                  </ErrorBoundary>
                </div>
              ) : cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#FFF1E6] border border-[#F0E4D7] flex items-center justify-center text-[#F26B1D] mb-3">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <h4 className="font-heading font-bold text-[#2B2118] text-sm">Your cart is empty</h4>
                  <p className="text-xs text-[#7A6A5C] mt-1 max-w-[200px]">
                    Select tasty dishes from the menu to place your direct kitchen order.
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-between overflow-hidden">
                  <div className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-4">
                    {/* Item List */}
                    <div className="space-y-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A6A5C]">
                        Cart Dishes
                      </span>
                      {cart.map((cartItem, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] flex items-start justify-between gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-heading font-bold text-[#2B2118] text-xs truncate">
                              {cartItem.item.title}
                            </h4>
                            <div
                              style={{ color: primaryColor }}
                              className="text-[11px] font-mono font-bold mt-0.5"
                            >
                              {formatPKR(cartItem.unitPrice * cartItem.quantity)}
                            </div>
                            {cartItem.choiceDetails && cartItem.choiceDetails.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {cartItem.choiceDetails.map((c, cIdx) => (
                                  <div key={cIdx} className="text-[10px] text-[#7A6A5C] pl-1.5 border-l border-[#F0E4D7]">
                                    ↳ {c}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Qty controls */}
                          <div className="flex items-center gap-1.5 bg-white border border-[#F0E4D7] rounded-lg p-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(idx, -1)}
                              className="w-6 h-6 rounded flex items-center justify-center text-[#7A6A5C] hover:text-[#2B2118] hover:bg-[#FFF1E6] transition cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-mono font-bold w-5 text-center text-[#2B2118]">
                              {cartItem.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(idx, 1)}
                              className="w-6 h-6 rounded flex items-center justify-center text-[#7A6A5C] hover:text-[#2B2118] hover:bg-[#FFF1E6] transition cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pinned Bottom Action & Pricing Bar */}
                  <div className="p-4 sm:p-5 border-t border-[#F0E4D7] bg-[#FFF9F2]/95 backdrop-blur-xs shrink-0 space-y-2.5">
                    {/* Minimum Order Warning */}
                    {!meetsMinOrder && isKitchenOpen && (
                      <div className="p-2 rounded-xl bg-[#FEF3D9] border border-[#F5A623]/30 text-[#2B2118] text-[11px] font-medium flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-[#F5A623] shrink-0" />
                        <span>
                          Min order is {formatPKR(minOrder)}. Add {formatPKR(minOrder - subtotal)} more.
                        </span>
                      </div>
                    )}

                    {/* Outside Delivery Area Notice */}
                    {customerLocation && !deliveryCoverage?.deliversToUser && (
                      <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Outside delivery area. Takeaway / Pickup available.</span>
                      </div>
                    )}

                    {/* Pricing Breakdown */}
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-[#7A6A5C] font-medium">
                        <span>Subtotal</span>
                        <span className="font-mono text-[#2B2118] font-bold">{formatPKR(subtotal)}</span>
                      </div>
                      {restaurant?.delivery_mode !== 'none' && (
                        <div className="flex justify-between text-[#7A6A5C]">
                          <span className="flex items-center gap-1">
                            <Truck className="w-3.5 h-3.5 text-[#9E8E81]" />
                            <span>Delivery</span>
                          </span>
                          <span className="font-mono font-semibold">
                            {isFreeDelivery ? 'Free' : formatPKR(deliveryFee)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm sm:text-base font-bold text-[#2B2118] pt-1.5 border-t border-[#F0E4D7]">
                        <span>Total to Pay</span>
                        <span
                          style={{ color: primaryColor }}
                          className="font-mono font-bold"
                        >
                          {formatPKR(finalTotal)}
                        </span>
                      </div>
                    </div>

                    {/* Primary Colored Proceed Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!isCustomerAuthenticated || !customer) {
                          setPendingAuthAction({ type: 'checkout' });
                          setShowAuthModal(true);
                          return;
                        }
                        setIsDesktopCheckout(true);
                      }}
                      disabled={!isKitchenOpen}
                      style={{ backgroundColor: primaryColor }}
                      className="w-full py-3 sm:py-3.5 px-4 rounded-xl text-white font-extrabold text-xs sm:text-sm shadow-md hover:brightness-95 active:scale-[0.99] flex items-center justify-between transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>
                        {!isKitchenOpen ? 'Kitchen Paused' : 'Proceed to Checkout'}
                      </span>
                      <ArrowRight className="w-4 h-4 stroke-[3]" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Bottom Cart Bar on Mobile Viewports (< lg) */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#F0E4D7] shadow-xl p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="max-w-md mx-auto">
            <button
              onClick={() => setIsMobileCartOpen(true)}
              style={{ backgroundColor: primaryColor }}
              className="w-full py-3 sm:py-3.5 px-4 rounded-2xl text-white font-bold text-sm shadow-lg flex items-center justify-between transition cursor-pointer active:scale-[0.99] hover:brightness-95"
            >
              <div className="flex items-center gap-2 sm:gap-2.5 font-bold text-xs sm:text-sm">
                <span className="bg-black/20 px-2 py-0.5 rounded-lg text-white font-mono text-xs">
                  {totalItemCount} {totalItemCount === 1 ? t.item : t.items}
                </span>
                <span className="font-mono text-sm sm:text-base font-extrabold text-white">
                  {formatPKR(finalTotal)}
                </span>
              </div>

              <div className="flex items-center gap-1 font-heading font-extrabold text-xs sm:text-sm text-white">
                <span>{t.view_order}</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Variant & Addon Customization Modal */}
      <VariantCustomizationModal
        isOpen={Boolean(selectedItemForModal)}
        item={selectedItemForModal}
        onClose={() => setSelectedItemForModal(null)}
        onAddToCart={handleAddToCart}
        restaurant={restaurant}
      />

      {/* Mobile Slide-out Drawer */}
      <CustomerCartDrawer
        isOpen={isMobileCartOpen}
        onClose={() => setIsMobileCartOpen(false)}
        cart={cart}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        restaurant={restaurant}
        isDeliverableToCustomer={deliveryCoverage?.deliversToUser}
        devRangeBypass={isDevMode && devRangeBypass}
        deliveryAreas={deliveryAreas}
        onCartClear={() => {
          setCart([]);
          try {
            localStorage.removeItem(cartStorageKey);
          } catch (e) {
            console.warn(e);
          }
        }}
      />

      {/* Desktop Checkout Modal */}
      {isDesktopCheckout && (
        <div className="fixed inset-0 z-50 bg-[#2B2118]/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-[#F0E4D7] overflow-hidden p-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsDesktopCheckout(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <DirectOrderCheckout
              cart={cart}
              restaurant={restaurant}
              isDeliverableToCustomer={deliveryCoverage?.deliversToUser}
              devRangeBypass={isDevMode && devRangeBypass}
              deliveryAreas={deliveryAreas}
              onBack={() => setIsDesktopCheckout(false)}
              onOrderPlaced={(newOrder) => {
                setIsDesktopCheckout(false);
                setPersistedActiveOrderId(newOrder.id);
                setActiveTrackerModalOrder(newOrder);
                setCart([]);
                try {
                  localStorage.removeItem(cartStorageKey);
                } catch (e) {
                  console.warn(e);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Multi-Restaurant Cart Conflict Modal */}
      {cartConflictState && (
        <div className="fixed inset-0 z-50 bg-[#2B2118]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#F0E4D7] text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF1E6] text-[#F26B1D] border border-[#FCD8BF] flex items-center justify-center mx-auto shadow-2xs">
              <ShoppingBag className="w-6 h-6" style={{ color: primaryColor }} />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-heading font-extrabold text-[#2B2118] text-base">
                Can't Order from Different Restaurants at the Same Time
              </h3>
              <p className="text-xs text-[#7A6A5C] leading-relaxed">
                You already have items from{' '}
                <span className="font-bold text-[#2B2118]">
                  {cartConflictState.previousRestaurantName || 'another restaurant'}
                </span>{' '}
                in your cart. We can't order from different restaurants at the same time. Would you like to clear your current cart and order from{' '}
                <span className="font-bold" style={{ color: primaryColor }}>
                  {restaurant?.name || 'this restaurant'}
                </span>{' '}
                instead?
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmSwitchRestaurantCart}
                style={{ backgroundColor: primaryColor }}
                className="w-full py-3 px-4 rounded-xl text-white font-extrabold text-xs shadow-md hover:brightness-95 transition cursor-pointer"
              >
                Clear Cart & Switch Restaurant
              </button>
              <button
                type="button"
                onClick={() => setCartConflictState(null)}
                className="w-full py-2.5 px-3 rounded-xl border border-[#F0E4D7] bg-white text-[#7A6A5C] hover:text-[#2B2118] hover:bg-[#FFF1E6] font-bold text-xs transition cursor-pointer"
              >
                Keep Current Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Restaurant Cart Confirmation Modal */}
      {showLeaveConfirmModal && (
        <div className="fixed inset-0 z-50 bg-[#2B2118]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#F0E4D7] text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF1E6] text-[#F26B1D] border border-[#FCD8BF] flex items-center justify-center mx-auto shadow-2xs">
              <ShoppingBag className="w-6 h-6" style={{ color: primaryColor }} />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-[#2B2118] text-base">
                Leave Restaurant?
              </h3>
              <p className="text-xs text-[#7A6A5C] mt-2 leading-relaxed">
                Your cart will be kept for this restaurant. Leave?
              </p>
              <div className="mt-3 text-[11px] font-mono font-bold text-[#F26B1D] bg-[#FFF1E6] py-1 px-3 rounded-full inline-block">
                {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} saved ({formatPKR(subtotal)})
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowLeaveConfirmModal(false)}
                className="py-2.5 px-3 rounded-xl border border-[#F0E4D7] bg-white text-[#2B2118] font-bold text-xs hover:bg-[#FFF1E6] transition cursor-pointer"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLeaveConfirmModal(false);
                  navigate('/');
                }}
                style={{ backgroundColor: primaryColor }}
                className="py-2.5 px-3 rounded-xl text-white font-extrabold text-xs shadow-md hover:brightness-95 transition cursor-pointer"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Order Live Tracker Modal */}
      {activeTrackerModalOrder && (
        <div className="fixed inset-0 z-50 bg-[#2B2118]/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col my-auto">
            <ErrorBoundary>
              <CustomerOrderTracker
                order={activeTrackerModalOrder.status ? activeTrackerModalOrder : null}
                orderId={activeTrackerModalOrder.id}
                restaurant={restaurant}
                onClose={() => {
                  setActiveTrackerModalOrder(null);
                  try {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('order');
                    url.searchParams.delete('orderId');
                    window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
                  } catch (e) {
                    console.warn(e);
                  }
                }}
                onNewOrder={() => {
                  setActiveTrackerModalOrder(null);
                  setCart([]);
                  try {
                    localStorage.removeItem(cartStorageKey);
                    const url = new URL(window.location.href);
                    url.searchParams.delete('order');
                    url.searchParams.delete('orderId');
                    window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
                  } catch (e) {
                    console.warn(e);
                  }
                }}
              />
            </ErrorBoundary>
          </div>
        </div>
      )}

      {/* Customer Sign-In Required Modal */}
      <CustomerAuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setPendingAuthAction(null);
        }}
        onSuccess={() => {
          setShowAuthModal(false);
          if (pendingAuthAction?.type === 'item' && pendingAuthAction.item) {
            const itemToOpen = pendingAuthAction.item;
            setPendingAuthAction(null);
            openItemCustomizationDirectly(itemToOpen);
          } else if (pendingAuthAction?.type === 'checkout') {
            setPendingAuthAction(null);
            setIsDesktopCheckout(true);
          } else {
            setPendingAuthAction(null);
          }
        }}
        title="Sign In Required to Order"
        subtitle="Please sign in with your Google account before adding items or placing a food order."
      />

      {/* Web Footer */}
      <footer className="mt-auto py-4 border-t border-[#F0E4D7] text-center text-xs text-[#7A6A5C] bg-[#FFF9F2]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {restaurant.logo_url ? (
              <img
                src={restaurant.logo_url}
                alt={restaurant.name}
                className="w-6 h-6 rounded-lg object-contain bg-white border border-[#F0E4D7] p-0.5"
              />
            ) : (
              <div
                style={{ backgroundColor: primaryColor }}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold"
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
              </div>
            )}
            <span className="font-bold text-[#2B2118]">{restaurant.name}</span>
            <span>• Direct Ordering Storefront</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-[#7A6A5C]">
            {/* Smaller "More restaurants" link in footer */}
            <button
              type="button"
              onClick={handleBackClick}
              className="text-[#7A6A5C] hover:text-[#2B2118] font-bold transition flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0 text-xs"
              title="Explore other restaurants"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>More restaurants</span>
            </button>

            <span className="text-[#F0E4D7]">•</span>
            <p>&copy; 2026 {restaurant.name}. Direct Online Ordering.</p>
            <span className="text-[#F0E4D7]">•</span>
            <Link
              to="/login"
              state={{ from: `/${restaurant.slug}/admin` }}
              className="text-[#7A6A5C] hover:text-[#2B2118] transition flex items-center gap-1"
              title="Restaurant Staff Access"
            >
              <Lock className="w-3 h-3" />
              <span>Staff Login</span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
