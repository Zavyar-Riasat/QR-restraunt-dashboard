import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { menuService } from '../services/menuService';
import VariantCustomizationModal from '../components/VariantCustomizationModal';
import CustomerCartDrawer from '../components/CustomerCartDrawer';
import { handleWhatsAppCheckout } from '../utils/checkoutUtils';
import { formatPKR } from '../utils/currencyUtils';
import {
  UtensilsCrossed,
  Search,
  Sparkles,
  Phone,
  Plus,
  Minus,
  SlidersHorizontal,
  ChevronRight,
  AlertCircle,
  ArrowLeft,
  Share2,
  Check,
  ShoppingBag,
  Send,
  MapPin,
  User,
  FileText,
  ShieldCheck,
  Clock,
  Percent,
  Flame,
  Package,
  Gift,
  Lock,
  Truck,
  Power,
  Globe,
  ArrowRight,
} from 'lucide-react';
import {
  isDeal,
  getItemDealInfo,
  getItemVariants,
  getItemAvailability,
  getItemImage,
  getItemDescription,
} from '../utils/dealUtils';
import { useAuth } from '../context/AuthContext';

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
    send_whatsapp: 'Send WhatsApp Order',
    customer_name: 'Your Name',
    customer_name_placeholder: 'e.g. Ali Khan',
    customer_phone: 'WhatsApp Phone Number',
    customer_phone_placeholder: '03001234567',
    customer_address: 'Delivery Address',
    customer_address_placeholder: 'House / Apt #, Street, Area, City',
    special_notes: 'Cooking / Delivery Instructions',
    special_notes_placeholder: 'e.g. Less spicy, leave at door',
    order_success: 'Order Submitted to Kitchen!',
    order_success_sub: 'Your WhatsApp conversation has opened. Press Send in WhatsApp to confirm your order.',
  },
  ur: {
    all_items: 'تمام ڈشز',
    deals_combos: 'ڈیلز اور کمبوز',
    search_placeholder: 'ڈشز، اجزاء یا ڈیلز تلاش کریں...',
    no_dishes: 'کوئی ڈش نہیں ملی',
    no_dishes_sub: 'کچھ اور تلاش کریں یا کوئی دوسرا زمرہ منتخب کریں۔',
    prep: 'تیاری',
    delivery: 'ڈیلیوری',
    free_delivery: 'مفت ڈیلیوری',
    min_order: 'کم از کم آرڈر',
    kitchen_paused: 'کچن آرڈرز بند ہیں',
    kitchen_paused_sub: 'کچن اس وقت نئے آرڈرز وصول نہیں کر رہا۔',
    add: 'شامل کریں',
    choose_options: 'اختیارات منتخب کریں',
    save: 'بچت',
    off: 'رعایت',
    items: 'اشیاء',
    item: 'آئٹم',
    view_order: 'آرڈر دیکھیں',
    your_order: 'آپ کا آرڈر',
    subtotal: 'سب ٹوٹل',
    delivery_fee: 'ڈیلیوری فیس',
    total_payable: 'کل قابل ادائیگی رقم',
    send_whatsapp: 'واٹس ایپ پر آرڈر بھیجیں',
    customer_name: 'آپ کا نام',
    customer_name_placeholder: 'مثال: علی خان',
    customer_phone: 'واٹس ایپ موبائل نمبر',
    customer_phone_placeholder: '03001234567',
    customer_address: 'ڈیلیوری کا پتہ',
    customer_address_placeholder: 'مکان نمبر، گلی، علاقہ، شہر',
    special_notes: 'خصوصی ہدایات',
    special_notes_placeholder: 'مثال: کم مرچ، دروازے پر دستک دیں',
    order_success: 'آرڈر کچن کو روانہ کر دیا گیا!',
    order_success_sub: 'آپ کی واٹس ایپ چیٹ کھل چکی ہے۔ واٹس ایپ میں سینڈ کا بٹن دبائیں۔',
  },
};

export default function CustomerMenuPage() {
  const { user } = useAuth();
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [lang, setLang] = useState('en'); // 'en' or 'ur'

  const t = UI_TRANSLATIONS[lang] || UI_TRANSLATIONS.en;

  // Filter & Search
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart & Customization State
  const [cart, setCart] = useState([]);
  const [selectedItemForModal, setSelectedItemForModal] = useState(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Desktop Checkout Form Details
  const [desktopCustomer, setDesktopCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [desktopOrderPlaced, setDesktopOrderPlaced] = useState(false);

  // Load menu data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const data = await menuService.getMenuBySlug(slug || 'burgersmoke');
        setRestaurant(data.restaurant);
        setCategories(data.categories || []);
        setMenuItems(data.menuItems || []);
      } catch (err) {
        console.error('Failed to load menu:', err);
        setError('This restaurant menu could not be loaded. Please verify the URL.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [slug]);

  // Cart helper functions
  const handleOpenCustomization = (item) => {
    if (!getItemAvailability(item)) return; // blocked if sold out
    setSelectedItemForModal(item);
  };

  const handleAddToCart = (configuredItem) => {
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
  const deliveryFee = (isFreeDelivery || isHiddenDelivery) ? 0 : (Number(restaurant?.delivery_fee) || 0);

  const checkMinOrder = restaurant?.show_min_order !== false;
  const minOrder = checkMinOrder ? (Number(restaurant?.min_order_amount) || 0) : 0;
  const isKitchenOpen = restaurant?.is_open !== false;

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const finalTotal = subtotal + deliveryFee;
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const meetsMinOrder = !checkMinOrder || minOrder === 0 || subtotal >= minOrder;

  // Desktop Checkout Submission
  const handleDesktopCheckout = (e) => {
    e.preventDefault();
    if (!desktopCustomer.name.trim() || !desktopCustomer.address.trim()) {
      alert('Please enter your name and full delivery address.');
      return;
    }
    if (!isKitchenOpen) {
      alert('Kitchen is currently paused for direct orders.');
      return;
    }
    if (!meetsMinOrder) {
      alert(`Minimum order amount is Rs. ${minOrder}. Please add Rs. ${minOrder - subtotal} more.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const success = handleWhatsAppCheckout({
        cart,
        restaurant,
        customerDetails: desktopCustomer,
      });
      if (success) {
        setDesktopOrderPlaced(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
            to="/burgersmoke"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
          >
            <span>View Demo Storefront</span>
          </Link>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Show Manager Dashboard button only if authenticated manager/owner */}
            {user && (
              <Link
                to="/"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF9F2] hover:bg-[#FFF1E6] text-[#7A6A5C] hover:text-[#2B2118] border border-[#F0E4D7] text-xs font-bold transition"
                title="Return to Manager Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Manager Dashboard</span>
              </Link>
            )}

            <div className="flex items-center gap-3">
              {restaurant.logo_url ? (
                <img
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  className="w-10 h-10 rounded-xl object-contain bg-white border border-[#F0E4D7] shadow-2xs p-0.5 shrink-0"
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md text-white font-bold shrink-0"
                  style={{ backgroundColor: primaryColor }}
                >
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
              )}
              <div>
                <h1 className="font-heading font-extrabold text-[#2B2118] text-base sm:text-lg tracking-tight leading-tight">
                  {restaurant.name}
                </h1>
                <p className="text-[11px] text-[#7A6A5C] flex items-center gap-2">
                  <span className={`font-bold flex items-center gap-1 ${isKitchenOpen ? 'text-[#1F9D55]' : 'text-[#E5484D]'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isKitchenOpen ? 'bg-[#1F9D55]' : 'bg-[#E5484D]'}`}></span>
                    {isKitchenOpen ? 'Direct Web Order' : 'Kitchen Paused'}
                  </span>
                  <span>•</span>
                  <span>WhatsApp: +{restaurant.whatsapp_number}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Urdu / English Language Switcher */}
            <button
              type="button"
              onClick={() => setLang((l) => (l === 'en' ? 'ur' : 'en'))}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white hover:bg-[#FFF1E6] text-[#2B2118] text-xs font-bold border border-[#F0E4D7] transition cursor-pointer"
              title={lang === 'en' ? 'اردو میں تبدیل کریں' : 'Switch to English'}
            >
              <Globe className="w-3.5 h-3.5 text-[#F26B1D]" style={{ color: primaryColor }} />
              <span>{lang === 'en' ? 'اردو' : 'English'}</span>
            </button>

            {/* Mobile/Tablet Header Cart Trigger (< lg) */}
            <button
              type="button"
              onClick={() => setIsMobileCartOpen(true)}
              className="lg:hidden relative px-3 py-1.5 rounded-xl bg-white hover:bg-[#FFF1E6] text-[#2B2118] text-xs font-bold border border-[#F0E4D7] transition flex items-center gap-1.5 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" style={{ color: primaryColor }} />
              <span className="hidden sm:inline">{t.your_order}</span>
              {totalItemCount > 0 && (
                <span
                  className="px-1.5 py-0.2 rounded-full text-white text-[10px] font-mono font-bold"
                  style={{ backgroundColor: primaryColor }}
                >
                  {totalItemCount}
                </span>
              )}
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-white hover:bg-[#FFF1E6] text-[#2B2118] text-xs font-bold border border-[#F0E4D7] transition cursor-pointer"
              title="Share menu link"
            >
              {copied ? <Check className="w-3.5 h-3.5" style={{ color: primaryColor }} /> : <Share2 className="w-3.5 h-3.5 text-[#7A6A5C]" />}
              <span className="hidden sm:inline">{copied ? 'Link Copied' : 'Share'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Responsive Storefront Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
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
        <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#2B2118] via-[#3E2D20] to-[#2B2118] text-white shadow-xl relative overflow-hidden border border-[#F0E4D7]/20">
          <div className="relative z-10 max-w-2xl space-y-3">
            {restaurant.logo_url && (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-1.5 shadow-xl border border-white/20 mb-1 inline-block">
                <img
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>
            )}
            <h2 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight leading-tight">
              {restaurant.name}
            </h2>

            {/* Dynamic Manager Configured Storefront Pills */}
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs font-semibold text-[#FEF3D9]">
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
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            {/* Search & Sticky Filter Bar */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#9E8E81]" />
                <input
                  type="text"
                  placeholder={t.search_placeholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-white border border-[#F0E4D7] text-[#2B2118] text-sm placeholder:text-[#9E8E81] focus:outline-none focus:border-[#F26B1D] shadow-2xs transition"
                />
              </div>

              {/* Category Pills Navigation */}
              <div className="sticky top-20 z-30 bg-[#FFF9F2]/95 backdrop-blur-md py-2 -mx-4 px-4 sm:-mx-0 sm:px-0 flex items-center gap-1.5 overflow-x-auto scrollbar-none border-b border-[#F0E4D7] sm:border-0">
                <button
                  onClick={() => setActiveCategory('ALL')}
                  style={activeCategory === 'ALL' ? { backgroundColor: primaryColor } : {}}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer ${
                    activeCategory === 'ALL'
                      ? 'text-white shadow-2xs'
                      : 'bg-white text-[#7A6A5C] hover:text-[#2B2118] hover:bg-[#FFF1E6] border border-[#F0E4D7]'
                  }`}
                >
                  {t.all_items} ({menuItems.length})
                </button>

                {dealItemsList.length > 0 && (
                  <button
                    onClick={() => setActiveCategory('DEALS')}
                    style={activeCategory === 'DEALS' ? { backgroundColor: primaryColor } : {}}
                    className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
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
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      style={isActive ? { backgroundColor: primaryColor } : {}}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer ${
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
                  const originalPrice = dealInfo?.original_price || 0;
                  const savings = originalPrice > item.price ? originalPrice - item.price : 0;
                  const savingsPercent =
                    originalPrice > 0 && savings > 0
                      ? Math.round((savings / originalPrice) * 100)
                      : 0;

                  return (
                    <div
                      key={item.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition flex flex-col justify-between ${
                        isSoldOut
                          ? 'bg-[#FFF9F2]/60 border-[#F0E4D7] opacity-60'
                          : 'bg-white border-[#F0E4D7] hover:border-[#FCD8BF] hover:shadow-xs'
                      }`}
                    >
                      <div>
                        {/* Top Badges */}
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-[#D95A12] bg-[#FFF1E6] px-2 py-0.5 rounded-lg border border-[#FCD8BF]/60">
                              {getCategoryName(item.category_id)}
                            </span>

                            {itemIsDeal && (
                              <span className="text-[10px] font-extrabold text-[#B87000] bg-[#FEF3D9] px-2.5 py-0.5 rounded-lg border border-[#FCE1A8]">
                                🔥 {dealInfo.badge || 'Deal'}
                              </span>
                            )}
                          </div>

                          {isSoldOut ? (
                            <span className="text-[10px] font-bold text-[#E5484D] bg-[#FDECEC] border border-[#F9C3C5] px-2 py-0.5 rounded-md">
                              {lang === 'ur' ? 'ختم ہو چکا' : 'Sold Out'}
                            </span>
                          ) : hasVariants ? (
                            <span className="text-[10px] font-medium text-[#7A6A5C] bg-[#FFF9F2] border border-[#F0E4D7] px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                              <SlidersHorizontal className="w-2.5 h-2.5 text-[#7A6A5C]" />
                              <span>Customizable</span>
                            </span>
                          ) : null}
                        </div>

                        {/* Image + Title + Description */}
                        <div className="flex gap-3.5 mb-2">
                          {itemImage ? (
                            <img
                              src={itemImage}
                              alt={item.title}
                              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-[#F0E4D7] shrink-0 shadow-2xs"
                            />
                          ) : (
                            <div
                              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#FFF1E6] border border-[#FCD8BF] flex items-center justify-center text-[#F26B1D] shrink-0 shadow-2xs"
                              style={{ color: primaryColor }}
                            >
                              <UtensilsCrossed className="w-6 h-6 stroke-[1.75]" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <h3 className="font-heading font-extrabold text-[#2B2118] text-sm sm:text-base leading-snug">
                              {item.title}
                            </h3>

                            {itemDesc ? (
                              <p className="text-xs text-[#7A6A5C] line-clamp-2 mt-1">
                                {itemDesc}
                              </p>
                            ) : itemIsDeal && dealInfo.deal_items ? (
                              <p className="text-xs text-[#B87000] line-clamp-2 mt-1 font-medium">
                                📦 {dealInfo.deal_items}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Card Pricing & Button */}
                      <div className="flex items-center justify-between pt-3 mt-2 border-t border-[#F0E4D7]">
                        <div className="flex flex-col">
                          <div className="flex items-baseline gap-1.5">
                            {itemIsDeal && originalPrice > item.price && (
                              <span className="text-xs text-[#9E8E81] line-through font-mono">
                                {formatPKR(originalPrice)}
                              </span>
                            )}
                            <span className="text-base font-extrabold text-[#2B2118] font-mono">
                              {formatPKR(item.price)}
                            </span>
                          </div>
                          {savings > 0 && (
                            <span className="text-[10px] font-bold text-[#1F9D55] bg-[#E7F6EC] border border-[#C0E9CE] px-2 py-0.5 rounded mt-0.5 w-fit">
                              {t.save} {formatPKR(savings)} ({savingsPercent}% {t.off})
                            </span>
                          )}
                        </div>

                        {isSoldOut ? (
                          <button
                            disabled
                            className="px-3.5 py-2 rounded-xl font-bold text-xs bg-[#FFF9F2] text-[#9E8E81] cursor-not-allowed border border-[#F0E4D7]"
                          >
                            {lang === 'ur' ? 'ختم ہو چکا' : 'Sold Out'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenCustomization(item)}
                            style={{ backgroundColor: primaryColor }}
                            className="px-3.5 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer text-white shadow-xs hover:opacity-95 active:scale-[0.98]"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{itemIsDeal ? (lang === 'ur' ? 'ڈیل منتخب کریں' : 'Choose Deal') : hasVariants ? t.choose_options : t.add}</span>
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
          <div className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-20 lg:top-24">
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

              {/* Cart Items List & Customer Form */}
              {desktopOrderPlaced ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-2 animate-bounce">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="font-heading font-extrabold text-slate-900 text-lg">Order Sent to WhatsApp!</h4>
                  <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                    Your formatted order was forwarded directly to <strong>{restaurant?.name}</strong>. Please check your WhatsApp window to finalize delivery details with the kitchen!
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setDesktopOrderPlaced(false);
                      setCart([]);
                      setDesktopCustomer({ name: '', phone: '', address: '', notes: '' });
                    }}
                    className="mt-4 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer shadow-md shadow-emerald-600/20"
                  >
                    Place Another Order
                  </button>
                </div>
              ) : cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#FFF1E6] border border-[#F0E4D7] flex items-center justify-center text-[#F26B1D] mb-3">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <h4 className="font-heading font-bold text-[#2B2118] text-sm">Your cart is empty</h4>
                  <p className="text-xs text-[#7A6A5C] mt-1 max-w-[200px]">
                    Select tasty dishes from the menu to place your direct WhatsApp order.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleDesktopCheckout} className="flex-1 flex flex-col justify-between overflow-hidden">
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

                    {/* Customer Details Form */}
                    <div className="pt-2 border-t border-[#F0E4D7] space-y-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A6A5C]">
                        Delivery Destination
                      </span>

                      <div>
                        <input
                          type="text"
                          required
                          placeholder="Your Full Name *"
                          value={desktopCustomer.name}
                          onChange={(e) => setDesktopCustomer({ ...desktopCustomer, name: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-[#2B2118] text-xs focus:outline-none focus:border-[#F26B1D] focus:bg-white transition"
                        />
                      </div>

                      <div>
                        <input
                          type="tel"
                          placeholder="Phone Number (e.g. 03001234567)"
                          value={desktopCustomer.phone}
                          onChange={(e) => setDesktopCustomer({ ...desktopCustomer, phone: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-[#2B2118] text-xs font-mono focus:outline-none focus:border-[#F26B1D] focus:bg-white transition"
                        />
                      </div>

                      <div>
                        <textarea
                          rows="2"
                          required
                          placeholder="Full Delivery Address (Street, House/Apt #) *"
                          value={desktopCustomer.address}
                          onChange={(e) => setDesktopCustomer({ ...desktopCustomer, address: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-[#2B2118] text-xs focus:outline-none focus:border-[#F26B1D] focus:bg-white resize-none transition"
                        />
                      </div>

                      <div>
                        <input
                          type="text"
                          placeholder="Special Instructions (e.g. extra spicy, call on arrival)"
                          value={desktopCustomer.notes}
                          onChange={(e) => setDesktopCustomer({ ...desktopCustomer, notes: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-[#2B2118] text-xs focus:outline-none focus:border-[#F26B1D] focus:bg-white transition"
                        />
                      </div>
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

                    {/* Primary Colored Checkout Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting || !isKitchenOpen || !meetsMinOrder}
                      style={{ backgroundColor: primaryColor }}
                      className="w-full py-3 sm:py-3.5 px-4 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md hover:brightness-95 active:scale-[0.99] flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                      <span>
                        {!isKitchenOpen
                          ? 'Kitchen Paused'
                          : !meetsMinOrder
                          ? `Min Order: ${formatPKR(minOrder)}`
                          : `Send Order via WhatsApp (${formatPKR(finalTotal)})`}
                      </span>
                    </button>

                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Bottom Cart Bar on Mobile Viewports (< lg) */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#F0E4D7] shadow-xl p-3 safe-area-inset-bottom">
          <div className="max-w-md mx-auto">
            <button
              onClick={() => setIsMobileCartOpen(true)}
              style={{ backgroundColor: primaryColor }}
              className="w-full py-3.5 px-4 rounded-2xl text-white font-bold text-sm shadow-lg flex items-center justify-between transition cursor-pointer active:scale-[0.99] hover:brightness-95"
            >
              <div className="flex items-center gap-2 font-mono font-bold tracking-tight text-white text-xs sm:text-sm">
                <span>
                  {totalItemCount} {totalItemCount === 1 ? t.item : t.items}
                </span>
                <span className="opacity-70">•</span>
                <span>{formatPKR(finalTotal)}</span>
                <span className="opacity-70">•</span>
                <span className="font-heading font-bold">{t.view_order}</span>
              </div>

              <div className="flex items-center gap-1">
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
      />

      {/* Web Footer */}
      <footer className="mt-auto py-8 border-t border-[#F0E4D7] text-center text-xs text-[#7A6A5C] bg-[#FFF9F2]">
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

          <div className="flex items-center gap-3 text-[#7A6A5C]">
            <p>&copy; 2026 {restaurant.name}. Direct WhatsApp Ordering.</p>
            <span className="text-[#F0E4D7]">•</span>
            <Link
              to="/login"
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
