import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { customerService } from '../services/customerService.js';
import { marketplaceService } from '../services/marketplaceService.js';
import { customerKhataService } from '../services/customerKhataService.js';
import { formatPKR } from '../utils/currencyUtils.js';
import { compressImageFile } from '../utils/imageUtils.js';
import CustomerAddressModal from '../components/Customer/CustomerAddressModal.jsx';
import CustomerAuthModal from '../components/Customer/CustomerAuthModal.jsx';
import CustomerBottomNav from '../components/Customer/CustomerBottomNav.jsx';
import OrderRatingModal from '../components/Customer/OrderRatingModal.jsx';
import { orderService } from '../services/orderService.js';
import BlurUpImage from '../components/Common/BlurUpImage.jsx';
import { EmptyStateIllustration } from '../components/Common/Illustrations.jsx';
import {
  User,
  MapPin,
  Heart,
  Clock,
  ShoppingBag,
  LogOut,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  ChevronRight,
  Home,
  Briefcase,
  UtensilsCrossed,
  Phone,
  Mail,
  ShieldCheck,
  Star,
  X,
  Settings,
  Check,
  Receipt,
  Truck,
  RotateCcw,
  Eye,
  Info,
  Camera,
  Upload,
  Sparkles,
  ZoomIn,
} from 'lucide-react';

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=ffdfbf',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Zayan&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Ayesha&backgroundColor=d1d4f9',
  'https://api.dicebear.com/7.x/lorelei/svg?seed=Hamza&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Foodie&backgroundColor=f5a623',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=240&h=240&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&h=240&q=80',
];

export default function CustomerAccountPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    customer,
    addresses,
    favorites,
    isCustomerAuthenticated,
    logoutCustomer,
    updateProfile,
    deleteAccount,
    saveAddress,
    deleteAddress,
    toggleFavorite,
  } = useCustomerAuth();

  const { t } = useLanguage();

  // Query Param Tab Support (e.g. /account?tab=favorites)
  const searchParams = new URLSearchParams(location.search);
  const queryTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(queryTab || 'orders');

  useEffect(() => {
    if (queryTab && ['orders', 'addresses', 'favorites', 'dues', 'profile', 'settings'].includes(queryTab)) {
      setActiveTab(queryTab);
    }
  }, [queryTab]);

  // Extras state
  const [favoriteRestaurants, setFavoriteRestaurants] = useState([]);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [customerDues, setCustomerDues] = useState({ totalBalanceDueRupees: 0, duesByRestaurant: [] });
  const [loadingExtras, setLoadingExtras] = useState(false);

  // Profile Form state
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    avatar: '',
    preferred_language: 'en',
  });
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isAvatarPreviewOpen, setIsAvatarPreviewOpen] = useState(false);
  const avatarInputRef = useRef(null);

  // Address Modal state
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  // Order Details Modal state
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);

  // Rating Modal state for completed orders
  const [ratingModalOrder, setRatingModalOrder] = useState(null);

  // Orders Date Filter State: 'today' | 'yesterday' | 'month' | 'custom'
  const [orderDateFilter, setOrderDateFilter] = useState('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Delete Account Confirmation Modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync profile form when customer changes
  useEffect(() => {
    if (customer) {
      setProfileForm({
        name: customer.name || '',
        email: customer.email || '',
        avatar: customer.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(customer.name || 'Guest')}`,
        preferred_language: 'en',
      });
    }
  }, [customer]);

  // Load favorites, orders, and dues
  const loadAccountData = async () => {
    if (!customer?.id && !customer?.phone && !customer?.email) return;
    try {
      setLoadingExtras(true);
      // 1. Favorite restaurants
      const res = await marketplaceService.getPublicRestaurants();
      const storeList = Array.isArray(res) ? res : (res?.restaurants || []);
      const matched = storeList.filter((s) => favorites.includes(s.id));
      setFavoriteRestaurants(matched);

      // 2. Orders across all restaurants
      const orders = customerService.getCustomerOrders(customer.phone, customer.id);
      setCustomerOrders(orders);

      // 3. Customer Dues / Ledgers across all restaurants
      const dues = customer.phone
        ? customerKhataService.getCustomerDuesAcrossRestaurants(customer.phone)
        : { totalBalanceDueRupees: 0, duesByRestaurant: [] };
      setCustomerDues(dues);
    } catch (err) {
      console.warn('Error loading customer account extras:', err);
    } finally {
      setLoadingExtras(false);
    }
  };

  useEffect(() => {
    if (isCustomerAuthenticated) {
      loadAccountData();
    }
  }, [customer, favorites, isCustomerAuthenticated]);

  // Filter Orders by Date
  const filteredOrders = useMemo(() => {
    if (!customerOrders || customerOrders.length === 0) return [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return customerOrders.filter((ord) => {
      const ordTime = new Date(ord.created_at || 0).getTime();

      if (orderDateFilter === 'today') {
        return ordTime >= todayStart;
      }
      if (orderDateFilter === 'yesterday') {
        return ordTime >= yesterdayStart && ordTime < todayStart;
      }
      if (orderDateFilter === 'month') {
        return ordTime >= thisMonthStart;
      }
      if (orderDateFilter === 'custom') {
        if (!customStartDate && !customEndDate) return true;
        const start = customStartDate ? new Date(customStartDate).getTime() : 0;
        const end = customEndDate ? new Date(customEndDate).getTime() + 24 * 60 * 60 * 1000 : Infinity;
        return ordTime >= start && ordTime <= end;
      }

      return true;
    });
  }, [customerOrders, orderDateFilter, customStartDate, customEndDate]);

  // Save Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!customer?.id) return;

    try {
      setIsSavingProfile(true);
      await updateProfile(profileForm);
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 3000);
    } catch (err) {
      alert(err.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle instant avatar selection / randomize & save
  const handleSelectAvatar = async (newAvatarUrl) => {
    if (!newAvatarUrl) return;
    setProfileForm((prev) => ({ ...prev, avatar: newAvatarUrl }));
    if (customer?.id) {
      try {
        await updateProfile({ avatar: newAvatarUrl });
        setProfileSaveSuccess(true);
        setTimeout(() => setProfileSaveSuccess(false), 3000);
      } catch (err) {
        console.warn('Error auto-saving avatar:', err);
      }
    }
  };

  const handleRandomizeAvatar = () => {
    const styles = ['adventurer', 'avataaars', 'lorelei', 'fun-emoji', 'bottts', ' initials'];
    const style = styles[Math.floor(Math.random() * styles.length)].trim();
    const seed = Math.random().toString(36).slice(2, 9);
    const randomUrl = `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=ffdfbf,ffd5dc,c0aede,d1d4f9,b6e3f4`;
    handleSelectAvatar(randomUrl);
  };

  // Handle photo upload from device gallery or camera
  const handleAvatarFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      const compressedDataUrl = await compressImageFile(file);
      if (compressedDataUrl) {
        await handleSelectAvatar(compressedDataUrl);
      } else {
        alert('Could not process the selected image. Please try another photo.');
      }
    } catch (err) {
      console.warn('Avatar upload error:', err);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setIsUploadingAvatar(false);
      if (e.target) e.target.value = '';
    }
  };

  const fallbackAvatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    profileForm.name || customer?.name || 'Guest'
  )}`;
  const activeAvatarSrc = profileForm.avatar || customer?.avatar || fallbackAvatarUrl;

  // Address Handlers
  const handleSaveAddress = async (addrData) => {
    await saveAddress(addrData);
  };

  const handleSetDefaultAddress = async (addr) => {
    await saveAddress({ ...addr, is_default: true });
  };

  const handleDeleteAddress = async (addressId) => {
    if (window.confirm('Delete this delivery address?')) {
      await deleteAddress(addressId);
    }
  };

  // Delete Account
  const handleConfirmDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      await deleteAccount();
      navigate('/');
    } catch (err) {
      alert(err.message || 'Failed to delete account.');
      setIsDeleting(false);
    }
  };

  const renderLabelIcon = (label) => {
    switch ((label || '').toLowerCase()) {
      case 'home':
        return <Home className="w-4 h-4 text-emerald-600" />;
      case 'work':
      case 'office':
        return <Briefcase className="w-4 h-4 text-indigo-600" />;
      default:
        return <MapPin className="w-4 h-4 text-[#F26B1D]" />;
    }
  };

  const renderOrderStatusBadge = (status) => {
    switch (status) {
      case 'completed':
      case 'delivered':
        return (
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{t('stepDelivered')}</span>
          </span>
        );
      case 'out_for_delivery':
        return (
          <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 animate-pulse">
            <Truck className="w-3.5 h-3.5" />
            <span>{t('stepOnWay')}</span>
          </span>
        );
      case 'preparing':
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-800 flex items-center gap-1 animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            <span>{t('stepCooking')}</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 text-[10px] font-bold border border-rose-200 dark:border-rose-800">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-[#FFF1E6] dark:bg-[#382417] text-[#F26B1D] dark:text-[#F5A623] text-[10px] font-bold border border-[#FCD8BF] dark:border-[#523522] flex items-center gap-1">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{t('stepPlaced')}</span>
          </span>
        );
    }
  };

  // -------------------------------------------------------------
  // If Unauthenticated: Render Clean Sign-In Screen
  // -------------------------------------------------------------
  if (!isCustomerAuthenticated) {
    return (
      <div
        className="min-h-screen bg-[#FFF9F2] dark:bg-[#17110C] text-[#2B2118] dark:text-[#FFF9F2] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans"
      >
        <CustomerAuthModal
          isOpen={true}
          onClose={() => navigate('/')}
          onSuccess={() => {}}
          title={t('signInToAccount')}
          subtitle={t('saveFavoritesPromptSubtitle')}
        />
        <div className="text-center mt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 min-h-[48px] text-xs font-bold text-[#7A6A5C] dark:text-[#CBB8A8] hover:text-[#F26B1D] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('exploreRestaurants')}</span>
          </Link>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Authenticated Customer Dashboard
  // -------------------------------------------------------------
  return (
    <div
      className="min-h-screen bg-[#FFF9F2] dark:bg-[#17110C] text-[#2B2118] dark:text-[#FFF9F2] pb-24 md:pb-16 transition-colors duration-200 font-sans"
    >
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#1E1611]/95 backdrop-blur-md border-b border-[#F0E4D7] dark:border-[#382B20] shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 group min-h-[48px] min-w-[48px] justify-center">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#F26B1D] to-[#F5A623] flex items-center justify-center text-white shadow-md shadow-[#F26B1D]/20 group-hover:scale-105 transition-transform duration-200">
              <UtensilsCrossed className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="font-heading font-extrabold text-[#2B2118] dark:text-[#FFF9F2] text-base leading-none block">
                {t('appName')}
              </span>
              <span className="text-[10px] font-bold text-[#F26B1D] uppercase tracking-wider">
                {t('myAccount')}
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 min-h-[48px] text-xs font-bold text-[#7A6A5C] dark:text-[#CBB8A8] hover:text-[#F26B1D] transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t('exploreRestaurants')}</span>
            </Link>

            <button
              type="button"
              onClick={logoutCustomer}
              className="px-3.5 py-2 min-h-[48px] rounded-2xl bg-white dark:bg-[#241C16] border border-[#F0E4D7] dark:border-[#382B20] hover:border-rose-300 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t('signOut')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hidden File Input for Avatar Upload */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarFileUpload}
      />

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7 space-y-6">
        {/* Profile Card Header Banner (16px Radius) */}
        <section className="bg-white dark:bg-[#221A14] rounded-2xl border border-[#F0E4D7] dark:border-[#382B20] p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative group shrink-0">
              <button
                type="button"
                onClick={() => setIsAvatarPreviewOpen(true)}
                className="relative block w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-[#FCD8BF] dark:border-[#523522] shadow-md bg-[#FFF1E6] dark:bg-[#2C2018] overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#F26B1D]"
                title="Click to preview avatar"
              >
                <img
                  src={activeAvatarSrc}
                  alt={customer.name}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = fallbackAvatarUrl;
                  }}
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
                <span className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <ZoomIn className="w-5 h-5 drop-shadow" />
                </span>
              </button>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white shadow-md flex items-center justify-center border-2 border-white dark:border-[#221A14] transition-transform hover:scale-105 cursor-pointer"
                title="Upload or change avatar photo"
                aria-label="Change avatar"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-[#2B2118] dark:text-[#FFF9F2]">
                  {customer.name}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                  {t('verifiedAccount')}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-1.5 text-xs text-[#7A6A5C] dark:text-[#CBB8A8]">
                <span className="flex items-center gap-1 font-mono font-medium">
                  <Phone className="w-3.5 h-3.5 text-[#F26B1D]" />
                  <span dir="ltr">+{customer.phone}</span>
                </span>
                {customer.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-[#F26B1D]" />
                    <span>{customer.email}</span>
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="text-[11px] font-bold text-[#F26B1D] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="w-3 h-3" />
                  <span>{isUploadingAvatar ? 'Uploading...' : 'Change Photo'}</span>
                </button>
                <span className="text-[#F0E4D7] dark:text-[#382B20]">•</span>
                <button
                  type="button"
                  onClick={() => setIsAvatarPreviewOpen(true)}
                  className="text-[11px] font-bold text-[#7A6A5C] dark:text-[#CBB8A8] hover:text-[#F26B1D] flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3 h-3" />
                  <span>Preview Avatar</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingAddress(null);
                setIsAddressModalOpen(true);
              }}
              className="btn-primary min-h-[48px] px-4 py-2.5 text-xs font-bold"
            >
              <Plus className="w-4 h-4" />
              <span>{t('addNewAddress')}</span>
            </button>
          </div>
        </section>

        {/* ========================================================
            Dashboard Navigation Tabs (Strict 48px Touch Targets)
            1. My Orders
            2. Saved Addresses
            3. Favorites
            4. Payments / Dues
            5. Profile
            6. Settings
            ======================================================== */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-[#F0E4D7] dark:border-[#382B20]">
          {/* Orders */}
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`min-h-[48px] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer select-none ${
              activeTab === 'orders'
                ? 'bg-[#2B2118] dark:bg-[#F26B1D] text-white shadow-xs'
                : 'bg-white dark:bg-[#221A14] text-[#7A6A5C] dark:text-[#CBB8A8] hover:bg-[#FFF1E6] dark:hover:bg-[#30231B] hover:text-[#2B2118] border border-[#F0E4D7] dark:border-[#382B20]'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{t('tabOrders')}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'orders' ? 'bg-white/20 text-white' : 'bg-[#FFF1E6] dark:bg-[#382417] text-[#F26B1D]'
              }`}
            >
              {customerOrders.length}
            </span>
          </button>

          {/* Addresses */}
          <button
            type="button"
            onClick={() => setActiveTab('addresses')}
            className={`min-h-[48px] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer select-none ${
              activeTab === 'addresses'
                ? 'bg-[#2B2118] dark:bg-[#F26B1D] text-white shadow-xs'
                : 'bg-white dark:bg-[#221A14] text-[#7A6A5C] dark:text-[#CBB8A8] hover:bg-[#FFF1E6] dark:hover:bg-[#30231B] hover:text-[#2B2118] border border-[#F0E4D7] dark:border-[#382B20]'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>{t('tabAddresses')}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'addresses' ? 'bg-white/20 text-white' : 'bg-[#FFF1E6] dark:bg-[#382417] text-[#F26B1D]'
              }`}
            >
              {addresses.length}
            </span>
          </button>

          {/* Favorites */}
          <button
            type="button"
            onClick={() => setActiveTab('favorites')}
            className={`min-h-[48px] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer select-none ${
              activeTab === 'favorites'
                ? 'bg-[#2B2118] dark:bg-[#F26B1D] text-white shadow-xs'
                : 'bg-white dark:bg-[#221A14] text-[#7A6A5C] dark:text-[#CBB8A8] hover:bg-[#FFF1E6] dark:hover:bg-[#30231B] hover:text-[#2B2118] border border-[#F0E4D7] dark:border-[#382B20]'
            }`}
          >
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
            <span>{t('tabFavorites')}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'favorites' ? 'bg-white/20 text-white' : 'bg-[#FFF1E6] dark:bg-[#382417] text-[#F26B1D]'
              }`}
            >
              {favorites.length}
            </span>
          </button>

          {/* Payments / Dues */}
          <button
            type="button"
            onClick={() => setActiveTab('dues')}
            className={`min-h-[48px] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer select-none ${
              activeTab === 'dues'
                ? 'bg-[#2B2118] dark:bg-[#F26B1D] text-white shadow-xs'
                : 'bg-white dark:bg-[#221A14] text-[#7A6A5C] dark:text-[#CBB8A8] hover:bg-[#FFF1E6] dark:hover:bg-[#30231B] hover:text-[#2B2118] border border-[#F0E4D7] dark:border-[#382B20]'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>{t('tabDues')}</span>
            {customerDues.totalBalanceDueRupees > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-extrabold">
                Rs. {customerDues.totalBalanceDueRupees}
              </span>
            )}
          </button>

          {/* Profile */}
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`min-h-[48px] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer select-none ${
              activeTab === 'profile'
                ? 'bg-[#2B2118] dark:bg-[#F26B1D] text-white shadow-xs'
                : 'bg-white dark:bg-[#221A14] text-[#7A6A5C] dark:text-[#CBB8A8] hover:bg-[#FFF1E6] dark:hover:bg-[#30231B] hover:text-[#2B2118] border border-[#F0E4D7] dark:border-[#382B20]'
            }`}
          >
            <User className="w-4 h-4" />
            <span>{t('tabProfile')}</span>
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`min-h-[48px] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer select-none ${
              activeTab === 'settings'
                ? 'bg-[#2B2118] dark:bg-[#F26B1D] text-white shadow-xs'
                : 'bg-white dark:bg-[#221A14] text-[#7A6A5C] dark:text-[#CBB8A8] hover:bg-[#FFF1E6] dark:hover:bg-[#30231B] hover:text-[#2B2118] border border-[#F0E4D7] dark:border-[#382B20]'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>{t('tabSettings')}</span>
          </button>
        </div>

        {/* ========================================================
            TAB 1: Profile (Name, Phone, Email, Avatar, Preferred Language)
            ======================================================== */}
        {activeTab === 'profile' && (
          <div className="bg-white dark:bg-[#221A14] rounded-2xl border border-[#F0E4D7] dark:border-[#382B20] p-6 sm:p-8 space-y-6 max-w-2xl shadow-xs">
            <div className="border-b border-[#F0E4D7] dark:border-[#382B20] pb-4">
              <h2 className="text-lg font-heading font-extrabold text-[#2B2118] dark:text-[#FFF9F2]">
                {t('profileTitle')}
              </h2>
              <p className="text-xs text-[#7A6A5C] dark:text-[#CBB8A8]">
                {t('profileSubtitle')}
              </p>
            </div>

            {profileSaveSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{t('profileUpdated')}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-5">
              {/* Live Avatar Preview & Picker Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#FFF9F2] dark:bg-[#281D16] border border-[#F0E4D7] dark:border-[#382B20] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="relative group shrink-0 self-start">
                    <button
                      type="button"
                      onClick={() => setIsAvatarPreviewOpen(true)}
                      className="relative block w-20 h-20 rounded-2xl border-2 border-[#F26B1D] shadow-md bg-white dark:bg-[#1E1712] overflow-hidden cursor-pointer"
                      title="Click to preview full-size avatar"
                    >
                      <img
                        src={activeAvatarSrc}
                        alt={profileForm.name || customer.name}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = fallbackAvatarUrl;
                        }}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                      <span className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <ZoomIn className="w-5 h-5" />
                      </span>
                    </button>
                    <span className="mt-1 block text-center text-[10px] font-bold text-[#F26B1D]">
                      Live Preview
                    </span>
                  </div>

                  <div className="flex-1 space-y-2.5">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-[#2B2118] dark:text-[#FFF9F2]">
                        Profile Photo & Avatar
                      </h3>
                      <p className="text-[11px] text-[#7A6A5C] dark:text-[#CBB8A8]">
                        Upload a photo from your device, choose a preset avatar below, or generate a random style. Changes preview immediately in the front.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                        className="px-3.5 py-2 min-h-[40px] rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isUploadingAvatar ? 'Uploading...' : 'Upload Photo'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRandomizeAvatar}
                        className="px-3.5 py-2 min-h-[40px] rounded-xl bg-white dark:bg-[#221A14] hover:bg-[#FFF1E6] dark:hover:bg-[#35251C] text-xs font-bold text-[#F26B1D] border border-[#F0E4D7] dark:border-[#382B20] transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{t('generateRandom')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsAvatarPreviewOpen(true)}
                        className="px-3.5 py-2 min-h-[40px] rounded-xl bg-white dark:bg-[#221A14] hover:bg-[#FFF1E6] dark:hover:bg-[#35251C] text-xs font-bold text-[#2B2118] dark:text-[#FFF9F2] border border-[#F0E4D7] dark:border-[#382B20] transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#F26B1D]" />
                        <span>Preview Full Size</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Preset Avatars Row */}
                <div className="pt-2 border-t border-[#F0E4D7] dark:border-[#382B20]">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[#7A6A5C] dark:text-[#CBB8A8] mb-2">
                    Quick-Select Preset Avatars
                  </span>
                  <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                    {PRESET_AVATARS.map((presetUrl, idx) => {
                      const isSelected = activeAvatarSrc === presetUrl;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectAvatar(presetUrl)}
                          className={`relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#F26B1D] ring-2 ring-[#F26B1D]/30 scale-105'
                              : 'border-[#F0E4D7] dark:border-[#382B20] hover:border-[#F26B1D]/60 opacity-85 hover:opacity-100'
                          }`}
                          title={`Select preset avatar #${idx + 1}`}
                        >
                          <img
                            src={presetUrl}
                            alt={`Preset ${idx + 1}`}
                            className="w-full h-full object-cover bg-white dark:bg-[#1E1712]"
                          />
                          {isSelected && (
                            <span className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-[#F26B1D] text-white flex items-center justify-center shadow">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Image URL Input */}
                <div className="pt-1">
                  <label className="block text-[10px] font-bold text-[#7A6A5C] dark:text-[#CBB8A8] uppercase tracking-wider mb-1">
                    {t('avatarUrl')} (Optional)
                  </label>
                  <input
                    type="text"
                    value={profileForm.avatar}
                    onChange={(e) => setProfileForm({ ...profileForm, avatar: e.target.value })}
                    placeholder="https://... or upload a photo above"
                    className="w-full px-3.5 py-2.5 min-h-[42px] rounded-xl border border-[#F0E4D7] dark:border-[#382B20] bg-white dark:bg-[#221A14] text-xs text-[#2B2118] dark:text-[#FFF9F2] focus:outline-none focus:ring-2 focus:ring-[#F26B1D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B2118] dark:text-[#FFF9F2] uppercase tracking-wider mb-1.5">
                  {t('fullName')}
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full px-4 py-3 min-h-[48px] rounded-2xl border border-[#F0E4D7] dark:border-[#382B20] bg-[#FFF9F2]/50 dark:bg-[#281D16] text-xs sm:text-sm font-bold text-[#2B2118] dark:text-[#FFF9F2] focus:outline-none focus:ring-2 focus:ring-[#F26B1D] focus:bg-white dark:focus:bg-[#201712]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B2118] dark:text-[#FFF9F2] uppercase tracking-wider mb-1.5">
                  {t('phoneNumber')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled
                    value={`+${customer.phone}`}
                    dir="ltr"
                    className="w-full px-4 py-3 min-h-[48px] rounded-2xl border border-[#F0E4D7] dark:border-[#382B20] bg-slate-100 dark:bg-[#1E1712] text-xs sm:text-sm font-mono font-bold text-[#7A6A5C] dark:text-[#8E7A6B] cursor-not-allowed"
                  />
                  <span className="absolute top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-600 flex items-center gap-1 right-3">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verified</span>
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B2118] dark:text-[#FFF9F2] uppercase tracking-wider mb-1.5">
                  {t('emailAddress')}
                </label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  placeholder="e.g. yourname@example.com"
                  className="w-full px-4 py-3 min-h-[48px] rounded-2xl border border-[#F0E4D7] dark:border-[#382B20] bg-[#FFF9F2]/50 dark:bg-[#281D16] text-xs sm:text-sm font-medium text-[#2B2118] dark:text-[#FFF9F2] focus:outline-none focus:ring-2 focus:ring-[#F26B1D] focus:bg-white dark:focus:bg-[#201712]"
                />
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="btn-primary min-h-[48px] px-6 py-3 text-xs sm:text-sm font-bold shadow-md shadow-[#F26B1D]/20 cursor-pointer disabled:opacity-50"
                >
                  {isSavingProfile ? t('saving') : t('saveChanges')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================
            TAB 2: Saved Addresses
            ======================================================== */}
        {activeTab === 'addresses' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-heading font-extrabold text-[#2B2118] dark:text-[#FFF9F2]">
                  {t('addressesTitle')}
                </h2>
                <span className="text-xs text-[#7A6A5C] dark:text-[#CBB8A8]">
                  {t('addressesSubtitle')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingAddress(null);
                  setIsAddressModalOpen(true);
                }}
                className="btn-primary min-h-[48px] px-4 py-2.5 text-xs font-bold"
              >
                <Plus className="w-4 h-4" />
                <span>{t('addNewAddress')}</span>
              </button>
            </div>

            {addresses.length === 0 ? (
              <div className="bg-white dark:bg-[#221A14] rounded-3xl border border-dashed border-[#F0E4D7] dark:border-[#382B20] p-10 text-center max-w-lg mx-auto space-y-3">
                <EmptyStateIllustration className="w-24 h-24 mx-auto" />
                <h3 className="font-bold text-sm text-[#2B2118] dark:text-[#FFF9F2]">{t('noAddressesTitle')}</h3>
                <p className="text-xs text-[#7A6A5C] dark:text-[#CBB8A8] max-w-sm mx-auto">
                  {t('noAddressesSubtitle')}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingAddress(null);
                    setIsAddressModalOpen(true);
                  }}
                  className="btn-primary min-h-[48px] px-5 py-2.5 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('addFirstAddress')}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`card-warm p-5 transition flex flex-col justify-between ${
                      addr.is_default
                        ? 'border-[#F26B1D] ring-2 ring-[#F26B1D]/15'
                        : 'border-[#F0E4D7] dark:border-[#382B20]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-[#FFF9F2] dark:bg-[#2E2018] border border-[#F0E4D7] dark:border-[#382B20]">
                            {renderLabelIcon(addr.label)}
                          </div>
                          <span className="font-bold text-sm text-[#2B2118] dark:text-[#FFF9F2]">{addr.label}</span>
                        </div>
                        {addr.is_default && (
                          <span className="px-2.5 py-1 rounded-full bg-[#FFF1E6] dark:bg-[#382417] text-[#F26B1D] text-[10px] font-bold border border-[#FCD8BF] dark:border-[#523522] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{t('defaultAddress')}</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm text-[#2B2118] dark:text-[#FFF9F2] font-medium leading-relaxed">
                        {addr.address}
                      </p>

                      {addr.landmark && (
                        <p className="text-xs text-[#7A6A5C] dark:text-[#CBB8A8] mt-1.5 flex items-center gap-1">
                          <span className="font-bold text-[#F26B1D]">{t('landmark')}:</span>
                          <span>{addr.landmark}</span>
                        </p>
                      )}

                      {addr.delivery_note && (
                        <p className="text-xs text-[#7A6A5C] dark:text-[#CBB8A8] mt-1 flex items-center gap-1.5 bg-[#FFF9F2] dark:bg-[#281D16] p-2.5 rounded-xl border border-[#F0E4D7] dark:border-[#382B20]">
                          <Info className="w-4 h-4 text-[#F26B1D] shrink-0" />
                          <span>
                            <strong>{t('note')}:</strong> {addr.delivery_note}
                          </span>
                        </p>
                      )}

                      {addr.latitude && addr.longitude && (
                        <p className="text-[11px] font-mono text-[#9E8E81] mt-1.5" dir="ltr">
                          GPS: {Number(addr.latitude).toFixed(4)}, {Number(addr.longitude).toFixed(4)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#F0E4D7]/70 dark:border-[#382B20]">
                      <div>
                        {!addr.is_default && (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultAddress(addr)}
                            className="min-h-[44px] text-xs font-bold text-[#7A6A5C] dark:text-[#CBB8A8] hover:text-[#F26B1D] transition cursor-pointer flex items-center"
                          >
                            {t('setAsDefault')}
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAddress(addr);
                            setIsAddressModalOpen(true);
                          }}
                          className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-[#FFF9F2] dark:bg-[#281D16] hover:bg-[#FFF1E6] dark:hover:bg-[#35251C] text-[#2B2118] dark:text-[#FFF9F2] border border-[#F0E4D7] dark:border-[#382B20] text-xs font-bold transition cursor-pointer flex items-center"
                        >
                          {t('edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[#9E8E81] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer flex items-center justify-center"
                          title="Delete address"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 3: My Orders (History, Date Filter, Status Tracker, Reorder)
            ======================================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-heading font-extrabold text-[#2B2118] dark:text-[#FFF9F2]">
                  {t('ordersTitle')}
                </h2>
                <span className="text-xs text-[#7A6A5C] dark:text-[#CBB8A8]">
                  {t('ordersSubtitle')}
                </span>
              </div>

              {/* Date Filters: Today, Yesterday, This Month, Custom (48px Touch Targets) */}
              <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-[#221A14] p-1.5 rounded-2xl border border-[#F0E4D7] dark:border-[#382B20] shadow-2xs">
                {[
                  { id: 'today', label: t('filterToday') },
                  { id: 'yesterday', label: t('filterYesterday') },
                  { id: 'month', label: t('filterMonth') },
                  { id: 'custom', label: t('filterCustom') },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setOrderDateFilter(id)}
                    className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      orderDateFilter === id
                        ? 'bg-[#2B2118] dark:bg-[#F26B1D] text-white shadow-2xs'
                        : 'text-[#7A6A5C] dark:text-[#CBB8A8] hover:text-[#2B2118] dark:hover:text-[#FFF9F2]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Range Picker */}
            {orderDateFilter === 'custom' && (
              <div className="bg-white dark:bg-[#221A14] p-3 rounded-2xl border border-[#F0E4D7] dark:border-[#382B20] flex flex-wrap items-center gap-3 text-xs">
                <span className="font-bold text-[#7A6A5C] dark:text-[#CBB8A8]">{t('from')}</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-2 min-h-[44px] rounded-xl border border-[#F0E4D7] dark:border-[#382B20] bg-[#FFF9F2] dark:bg-[#281D16] text-xs font-medium text-[#2B2118] dark:text-[#FFF9F2]"
                />
                <span className="font-bold text-[#7A6A5C] dark:text-[#CBB8A8]">{t('to')}</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-2 min-h-[44px] rounded-xl border border-[#F0E4D7] dark:border-[#382B20] bg-[#FFF9F2] dark:bg-[#281D16] text-xs font-medium text-[#2B2118] dark:text-[#FFF9F2]"
                />
              </div>
            )}

            {loadingExtras ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="card-warm p-5 space-y-4 animate-pulse">
                    <div className="flex justify-between border-b border-[#F0E4D7] dark:border-[#382B20] pb-3">
                      <div className="h-4 bg-slate-200 dark:bg-[#35271E] rounded-md w-1/3" />
                      <div className="h-4 bg-slate-100 dark:bg-[#2C1F17] rounded-md w-1/4" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-slate-100 dark:bg-[#2C1F17] rounded-md w-3/4" />
                      <div className="h-3 bg-slate-100 dark:bg-[#2C1F17] rounded-md w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white dark:bg-[#221A14] rounded-3xl border border-dashed border-[#F0E4D7] dark:border-[#382B20] p-10 text-center max-w-lg mx-auto space-y-3">
                <EmptyStateIllustration className="w-24 h-24 mx-auto" />
                <h3 className="font-bold text-sm text-[#2B2118] dark:text-[#FFF9F2]">{t('noOrdersTitle')}</h3>
                <p className="text-xs text-[#7A6A5C] dark:text-[#CBB8A8] max-w-sm mx-auto">
                  {t('noOrdersSubtitle')}
                </p>
                <Link
                  to="/"
                  className="btn-primary min-h-[48px] px-5 py-2.5 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <UtensilsCrossed className="w-4 h-4" />
                  <span>{t('startOrdering')}</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((ord) => {
                  const isLive = ['new', 'confirmed', 'preparing', 'out_for_delivery'].includes(ord.status);

                  return (
                    <div
                      key={ord.id}
                      className={`card-warm p-5 space-y-4 ${
                        isLive ? 'border-[#F26B1D]/50 ring-2 ring-[#F26B1D]/15' : 'border-[#F0E4D7] dark:border-[#382B20]'
                      }`}
                    >
                      {/* Top Row: Order ID, Date, Status */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0E4D7]/70 dark:border-[#382B20] pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#F26B1D] bg-[#FFF1E6] dark:bg-[#382417] px-2.5 py-1 rounded-lg border border-[#FCD8BF] dark:border-[#523522]">
                            #{ord.id}
                          </span>
                          <span className="font-heading font-extrabold text-sm text-[#2B2118] dark:text-[#FFF9F2]">
                            {ord.restaurant_name || ord.restaurant?.name || 'Restaurant Order'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#7A6A5C] dark:text-[#CBB8A8]">
                            {new Date(ord.created_at || Date.now()).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {renderOrderStatusBadge(ord.status)}
                        </div>
                      </div>

                      {/* Live Status Tracker for Active Orders */}
                      {isLive && (
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#FFF1E6] to-[#FFE6D4] dark:from-[#2B1F17] dark:to-[#38281E] border border-[#FCD8BF] dark:border-[#523522] space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-[#2B2118] dark:text-[#FFF9F2] flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                              <span>{t('liveOrderTracking')}</span>
                            </span>
                            <span className="text-[11px] font-bold text-[#F26B1D]">
                              {ord.estimated_prep_time || '20–30 mins'}
                            </span>
                          </div>

                          {/* Progress Steps: Placed -> Cooking -> Out for Delivery -> Delivered */}
                          <div className="grid grid-cols-4 gap-1.5 pt-1 text-center">
                            {[
                              { label: t('stepPlaced'), active: true },
                              { label: t('stepCooking'), active: ['confirmed', 'preparing', 'out_for_delivery'].includes(ord.status) },
                              { label: t('stepOnWay'), active: ord.status === 'out_for_delivery' },
                              { label: t('stepDelivered'), active: ord.status === 'completed' },
                            ].map((step, idx) => (
                              <div key={idx} className="space-y-1">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    step.active ? 'bg-[#F26B1D]' : 'bg-[#F0E4D7] dark:bg-[#382B20]'
                                  }`}
                                />
                                <span
                                  className={`text-[10px] font-bold block ${
                                    step.active ? 'text-[#2B2118] dark:text-[#FFF9F2]' : 'text-[#9E8E81]'
                                  }`}
                                >
                                  {step.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Order Items Preview */}
                      <div className="text-xs text-[#7A6A5C] dark:text-[#CBB8A8] space-y-1">
                        <p className="line-clamp-2">
                          {Array.isArray(ord.items)
                            ? ord.items.map((i) => `${i.quantity}x ${i.name || i.item_name}`).join(', ')
                            : 'Menu items'}
                        </p>
                        {ord.customer_address && (
                          <p className="text-[11px] text-[#9E8E81] flex items-center gap-1 pt-1">
                            <MapPin className="w-3.5 h-3.5 text-[#F26B1D]" />
                            <span className="truncate">{ord.customer_address}</span>
                          </p>
                        )}
                      </div>

                      {/* Bottom Footer: Total, Details, Reorder (48px Touch Targets) */}
                      <div className="flex items-center justify-between pt-3 border-t border-[#F0E4D7]/70 dark:border-[#382B20]">
                        <div>
                          <span className="text-[10px] text-[#9E8E81] uppercase font-bold block">
                            {t('totalBill')}
                          </span>
                          <span className="font-heading font-black text-sm text-[#2B2118] dark:text-[#FFF9F2]">
                            {formatPKR(ord.total_payable || (ord.total_payable_paisa ? ord.total_payable_paisa / 100 : ord.total || 0))}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* If order is completed/delivered, let customer rate the food */}
                          {(ord.status === 'completed' || ord.status === 'delivered') && (() => {
                            const existingRating = ord.customer_rating || orderService.getOrderRating(ord.id);
                            return (
                              <button
                                type="button"
                                onClick={() => setRatingModalOrder(ord)}
                                className="min-h-[48px] px-3.5 py-2 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                title={existingRating ? `Rated ${existingRating.rating}/5 stars. Click to edit.` : 'Rate your food and experience'}
                              >
                                <Star className={`w-4 h-4 ${existingRating ? 'fill-amber-500 text-amber-500' : 'text-amber-600'}`} />
                                <span>{existingRating ? `${existingRating.rating}★ Rated` : 'Rate Food'}</span>
                              </button>
                            );
                          })()}

                          <button
                            type="button"
                            onClick={() => setSelectedOrderDetails(ord)}
                            className="min-h-[48px] px-4 py-2 rounded-2xl bg-white dark:bg-[#281D16] hover:bg-[#FFF9F2] text-[#2B2118] dark:text-[#FFF9F2] border border-[#F0E4D7] dark:border-[#382B20] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="w-4 h-4 text-[#7A6A5C]" />
                            <span>{t('details')}</span>
                          </button>

                          <Link
                            to={`/${ord.restaurant_slug || 'burgersmoke'}`}
                            className="min-h-[48px] px-4 py-2 rounded-2xl bg-[#FFF1E6] hover:bg-[#FFE6D4] dark:bg-[#382417] dark:hover:bg-[#482E1E] text-[#F26B1D] border border-[#FCD8BF] dark:border-[#523522] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span>{t('reorder')}</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 4: Favorites (16px Radius Cards & BlurUpImage)
            ======================================================== */}
        {activeTab === 'favorites' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-heading font-extrabold text-[#2B2118] dark:text-[#FFF9F2]">
                {t('favoritesTitle')}
              </h2>
              <Link to="/" className="text-xs font-bold text-[#F26B1D] hover:underline">
                {t('exploreMore')}
              </Link>
            </div>

            {loadingExtras ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="card-warm overflow-hidden animate-pulse">
                    <div className="h-40 bg-slate-200 dark:bg-[#35271E]" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-slate-200 dark:bg-[#35271E] rounded-md w-3/4" />
                      <div className="h-3 bg-slate-100 dark:bg-[#2C1F17] rounded-md w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : favoriteRestaurants.length === 0 ? (
              <div className="bg-white dark:bg-[#221A14] rounded-3xl border border-dashed border-[#F0E4D7] dark:border-[#382B20] p-10 text-center max-w-lg mx-auto space-y-3">
                <Heart className="w-12 h-12 text-rose-400 mx-auto opacity-60" />
                <h3 className="font-bold text-sm text-[#2B2118] dark:text-[#FFF9F2]">{t('noFavoritesTitle')}</h3>
                <p className="text-xs text-[#7A6A5C] dark:text-[#CBB8A8] max-w-sm mx-auto">
                  {t('noFavoritesSubtitle')}
                </p>
                <Link
                  to="/"
                  className="btn-primary min-h-[48px] px-5 py-2.5 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <UtensilsCrossed className="w-4 h-4" />
                  <span>{t('exploreRestaurants')}</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {favoriteRestaurants.map((store) => (
                  <div
                    key={store.id}
                    className="card-warm group flex flex-col justify-between overflow-hidden"
                  >
                    <div>
                      {/* Image with 16px radius and BlurUp */}
                      <div className="relative h-40 overflow-hidden rounded-t-2xl">
                        <BlurUpImage
                          src={store.cover_image}
                          alt={store.name}
                          aspectRatio="aspect-auto"
                          containerClassName="w-full h-full !rounded-none"
                          className="group-hover:scale-105 transition-transform duration-300"
                        />
                        <button
                          type="button"
                          onClick={() => toggleFavorite(store.id)}
                          className="min-h-[48px] min-w-[48px] flex items-center justify-center absolute top-2 right-2 p-2 rounded-full bg-white/90 dark:bg-[#221A14]/90 backdrop-blur-xs text-rose-500 shadow-md hover:scale-110 transition cursor-pointer"
                          title="Remove from favorites"
                        >
                          <Heart className="w-4 h-4 fill-rose-500" />
                        </button>
                      </div>

                      <div className="p-4 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-heading font-extrabold text-base text-[#2B2118] dark:text-[#FFF9F2] truncate">
                            {store.name}
                          </h3>
                          <span className="flex items-center gap-1 text-xs font-bold text-[#2B2118] dark:text-[#FFF9F2] shrink-0 bg-[#FFF9F2] dark:bg-[#2D2018] px-2 py-0.5 rounded-lg border border-[#F0E4D7] dark:border-[#382B20]">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <span>{store.rating || '4.8'}</span>
                          </span>
                        </div>

                        <p className="text-xs text-[#7A6A5C] dark:text-[#CBB8A8] truncate">
                          {Array.isArray(store.cuisines) ? store.cuisines.join(' • ') : store.cuisines}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 pt-0">
                      <div className="pt-3 border-t border-[#F0E4D7] dark:border-[#382B20] flex items-center justify-between">
                        <span className="text-xs font-bold text-[#F26B1D]">
                          {t('minOrder')}: {formatPKR(store.min_order || 500)}
                        </span>
                        <Link
                          to={`/${store.slug}`}
                          className="min-h-[48px] px-4 py-2 rounded-2xl bg-[#2B2118] dark:bg-[#F26B1D] hover:bg-[#F26B1D] text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <span>{t('orderMenu')}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 5: Payments / Dues (Customer Khata Ledger)
            ======================================================== */}
        {activeTab === 'dues' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base sm:text-lg font-heading font-extrabold text-[#2B2118] dark:text-[#FFF9F2]">
                {t('duesTitle')}
              </h2>
              <span className="text-xs text-[#7A6A5C] dark:text-[#CBB8A8]">
                {t('duesSubtitle')}
              </span>
            </div>

            {/* Total Balance Due Overview Card */}
            <div
              className={`p-6 rounded-2xl border transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                customerDues.totalBalanceDueRupees > 0
                  ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-950 dark:text-rose-200'
                  : 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-950 dark:text-emerald-200'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    customerDues.totalBalanceDueRupees > 0
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                      : 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                  }`}
                >
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider block opacity-80">
                    {t('totalOutstanding')}
                  </span>
                  <span className="text-2xl sm:text-3xl font-heading font-black">
                    {formatPKR(customerDues.totalBalanceDueRupees)}
                  </span>
                </div>
              </div>

              <div className="text-xs opacity-90 max-w-sm">
                {customerDues.totalBalanceDueRupees > 0 ? (
                  <p>{t('settlePrompt')}</p>
                ) : (
                  <p className="text-emerald-800 dark:text-emerald-300 font-medium">
                    {t('allClear')}
                  </p>
                )}
              </div>
            </div>

            {/* Breakdown by Restaurant */}
            {customerDues.duesByRestaurant.length === 0 ? (
              <div className="bg-white dark:bg-[#221A14] rounded-2xl border border-dashed border-[#F0E4D7] dark:border-[#382B20] p-8 text-center text-xs text-[#7A6A5C] dark:text-[#CBB8A8]">
                {t('noDues')}
              </div>
            ) : (
              <div className="space-y-4">
                {customerDues.duesByRestaurant.map((item, idx) => (
                  <div
                    key={idx}
                    className="card-warm p-5 space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0E4D7] dark:border-[#382B20] pb-3">
                      <div>
                        <h3 className="font-heading font-extrabold text-base text-[#2B2118] dark:text-[#FFF9F2]">
                          {item.restaurantName}
                        </h3>
                        <span className="text-xs text-[#7A6A5C] dark:text-[#CBB8A8]">
                          {t('totalOrdersCount')}: {item.totalOrdersCount}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-[#9E8E81] block">
                          {t('currentDue')}
                        </span>
                        <span
                          className={`font-heading font-black text-base ${
                            item.balanceDueRupees > 0 ? 'text-rose-600' : 'text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {formatPKR(item.balanceDueRupees)}
                        </span>
                      </div>
                    </div>

                    {item.lineItems && item.lineItems.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-[#7A6A5C] dark:text-[#CBB8A8] uppercase tracking-wider block">
                          {t('ledgerHistory')}
                        </span>
                        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                          {item.lineItems.map((li, lIdx) => (
                            <div
                              key={lIdx}
                              className="p-2.5 rounded-xl bg-[#FFF9F2] dark:bg-[#281D16] border border-[#F0E4D7] dark:border-[#382B20] flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-[#2B2118] dark:text-[#FFF9F2] block">{li.description}</span>
                                <span className="text-[10px] text-[#9E8E81]">
                                  {new Date(li.date).toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                              </div>
                              <span
                                className={`font-mono font-bold ${
                                  li.type === 'DEBIT' ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                {li.type === 'DEBIT' ? `+${formatPKR(li.debitPaisa / 100)}` : `-${formatPKR(li.creditPaisa / 100)}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 6: Settings (Sign Out & Delete Account)
            ======================================================== */}
        {activeTab === 'settings' && (
          <div className="bg-white dark:bg-[#221A14] rounded-2xl border border-[#F0E4D7] dark:border-[#382B20] p-6 sm:p-8 space-y-6 max-w-2xl shadow-xs">
            <div className="border-b border-[#F0E4D7] dark:border-[#382B20] pb-4">
              <h2 className="text-lg font-heading font-extrabold text-[#2B2118] dark:text-[#FFF9F2]">
                {t('settingsTitle')}
              </h2>
              <p className="text-xs text-[#7A6A5C] dark:text-[#CBB8A8]">
                {t('settingsSubtitle')}
              </p>
            </div>

            {/* Sign Out Card */}
            <div className="p-4 rounded-2xl bg-[#FFF9F2] dark:bg-[#281D16] border border-[#F0E4D7] dark:border-[#382B20] flex items-center justify-between gap-4">
              <div>
                <span className="font-bold text-xs sm:text-sm text-[#2B2118] dark:text-[#FFF9F2] block">
                  {t('signOutDevice')}
                </span>
                <span className="text-xs text-[#7A6A5C] dark:text-[#CBB8A8] block">
                  {t('signOutDeviceSubtitle')}
                </span>
              </div>
              <button
                type="button"
                onClick={logoutCustomer}
                className="min-h-[48px] px-5 py-2.5 rounded-2xl bg-white dark:bg-[#1E1712] hover:bg-rose-50 text-rose-600 border border-[#F0E4D7] dark:border-[#382B20] hover:border-rose-300 text-xs font-bold transition cursor-pointer shadow-2xs shrink-0"
              >
                {t('signOut')}
              </button>
            </div>

            {/* Danger Zone: Delete Account */}
            <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 space-y-3">
              <div>
                <span className="font-bold text-xs sm:text-sm text-rose-900 dark:text-rose-200 block">
                  {t('dangerZone')}
                </span>
                <span className="text-xs text-rose-700 dark:text-rose-300 block">
                  {t('dangerZoneSubtitle')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="min-h-[48px] px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer shadow-sm"
              >
                {t('deleteAccountBtn')}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================
          Mobile Bottom Navigation (Home, Search, Favorites, Orders, Account)
          ======================================================== */}
      <CustomerBottomNav />

      {/* ========================================================
          Address Modal (Add or Edit)
          ======================================================== */}
      <CustomerAddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSave={handleSaveAddress}
        initialData={editingAddress}
      />

      {/* ========================================================
          Order Details Modal
          ======================================================== */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#221A14] rounded-3xl border border-[#F0E4D7] dark:border-[#382B20] shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-[#F0E4D7] dark:border-[#382B20] flex items-center justify-between bg-[#FFF9F2] dark:bg-[#281D16]">
              <div>
                <h3 className="font-heading font-extrabold text-base text-[#2B2118] dark:text-[#FFF9F2]">
                  {t('orderDetails')} #{selectedOrderDetails.id}
                </h3>
                <span className="text-xs text-[#7A6A5C] dark:text-[#CBB8A8]">
                  {selectedOrderDetails.restaurant_name || 'Restaurant Order'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                className="min-h-[48px] min-w-[48px] p-2 rounded-xl text-[#9E8E81] hover:text-[#2B2118] dark:hover:text-white transition cursor-pointer flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#7A6A5C] dark:text-[#CBB8A8]">Status:</span>
                {renderOrderStatusBadge(selectedOrderDetails.status)}
              </div>

              {/* Items Table */}
              <div className="space-y-2 border-t border-[#F0E4D7] dark:border-[#382B20] pt-3">
                <span className="text-[11px] uppercase font-bold text-[#7A6A5C] dark:text-[#CBB8A8] block">
                  {t('itemsOrdered')}
                </span>
                {Array.isArray(selectedOrderDetails.items) &&
                  selectedOrderDetails.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-xs py-1">
                      <span>
                        {it.quantity}x {it.name || it.item_name}
                      </span>
                      <span className="font-bold">
                        {formatPKR((it.unitPrice || it.price || 0) * (it.quantity || 1))}
                      </span>
                    </div>
                  ))}
              </div>

              {/* Bill Breakdown */}
              <div className="space-y-1.5 border-t border-[#F0E4D7] dark:border-[#382B20] pt-3 text-xs">
                <div className="flex justify-between text-[#7A6A5C] dark:text-[#CBB8A8]">
                  <span>{t('subtotal')}</span>
                  <span>{formatPKR(selectedOrderDetails.subtotal || 0)}</span>
                </div>
                <div className="flex justify-between text-[#7A6A5C] dark:text-[#CBB8A8]">
                  <span>{t('deliveryFee')}</span>
                  <span>{formatPKR(selectedOrderDetails.delivery_fee || 0)}</span>
                </div>
                <div className="flex justify-between font-heading font-extrabold text-sm text-[#2B2118] dark:text-[#FFF9F2] pt-1 border-t border-[#F0E4D7] dark:border-[#382B20]">
                  <span>{t('totalBill')}</span>
                  <span>
                    {formatPKR(
                      selectedOrderDetails.total_payable ||
                        (selectedOrderDetails.total_payable_paisa
                          ? selectedOrderDetails.total_payable_paisa / 100
                          : 0)
                    )}
                  </span>
                </div>
              </div>

              {/* Delivery info */}
              {selectedOrderDetails.customer_address && (
                <div className="p-3 rounded-2xl bg-[#FFF9F2] dark:bg-[#281D16] border border-[#F0E4D7] dark:border-[#382B20] text-xs space-y-1">
                  <span className="font-bold text-[#2B2118] dark:text-[#FFF9F2] block">{t('addressesTitle')}</span>
                  <p className="text-[#7A6A5C] dark:text-[#CBB8A8]">{selectedOrderDetails.customer_address}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#F0E4D7] dark:border-[#382B20] bg-white dark:bg-[#221A14] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                className="btn-primary min-h-[48px] px-6 py-2 text-xs font-bold"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          Delete Account Confirmation Modal
          ======================================================== */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#221A14] rounded-3xl border border-rose-200 dark:border-rose-900 shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-base text-[#2B2118] dark:text-[#FFF9F2]">
                {t('deleteConfirmTitle')}
              </h3>
              <p className="text-xs text-[#7A6A5C] dark:text-[#CBB8A8] mt-1">
                {t('deleteConfirmSubtitle')}
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteAccount}
                className="w-full min-h-[48px] py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting Account...' : t('yesDeleteAccount')}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full min-h-[48px] py-2 rounded-2xl border border-[#F0E4D7] dark:border-[#382B20] text-xs font-bold text-[#7A6A5C] dark:text-[#CBB8A8] hover:bg-[#FFF9F2] transition cursor-pointer"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          Full-Size Avatar Preview & Quick Change Modal
          ======================================================== */}
      {isAvatarPreviewOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAvatarPreviewOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn"
        >
          <div className="bg-white dark:bg-[#221A14] rounded-3xl border border-[#F0E4D7] dark:border-[#382B20] shadow-2xl max-w-sm w-full p-6 text-center space-y-5 relative">
            <button
              type="button"
              onClick={() => setIsAvatarPreviewOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-[#9E8E81] hover:text-[#2B2118] dark:hover:text-white hover:bg-black/5 transition cursor-pointer"
              aria-label="Close preview"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="font-heading font-extrabold text-base text-[#2B2118] dark:text-[#FFF9F2]">
                Avatar Preview
              </h3>
              <p className="text-xs text-[#7A6A5C] dark:text-[#CBB8A8]">
                {profileForm.name || customer.name}
              </p>
            </div>

            <div className="w-48 h-48 mx-auto rounded-3xl border-4 border-[#FCD8BF] dark:border-[#523522] shadow-xl bg-[#FFF1E6] dark:bg-[#2C2018] overflow-hidden">
              <img
                src={activeAvatarSrc}
                alt={customer.name}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = fallbackAvatarUrl;
                }}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Quick Preset Selector inside Preview Modal */}
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#7A6A5C] dark:text-[#CBB8A8] mb-2">
                Try Another Avatar
              </span>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {PRESET_AVATARS.slice(0, 6).map((presetUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectAvatar(presetUrl)}
                    className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                      activeAvatarSrc === presetUrl
                        ? 'border-[#F26B1D] ring-2 ring-[#F26B1D]/30 scale-105'
                        : 'border-[#F0E4D7] dark:border-[#382B20] hover:border-[#F26B1D]/60'
                    }`}
                  >
                    <img src={presetUrl} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="flex-1 min-h-[44px] py-2.5 px-3 rounded-2xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploadingAvatar ? 'Uploading...' : 'Upload Photo'}</span>
              </button>
              <button
                type="button"
                onClick={handleRandomizeAvatar}
                className="min-h-[44px] py-2.5 px-3.5 rounded-2xl bg-[#FFF9F2] dark:bg-[#281D16] hover:bg-[#FFF1E6] text-[#F26B1D] border border-[#F0E4D7] dark:border-[#382B20] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Random</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Rating Modal */}
      <OrderRatingModal
        isOpen={!!ratingModalOrder}
        onClose={() => setRatingModalOrder(null)}
        order={ratingModalOrder}
        onRatingSubmitted={(rated) => {
          setCustomerOrders((prev) =>
            prev.map((o) => (o.id === rated.order_id ? { ...o, customer_rating: rated } : o))
          );
        }}
      />
    </div>
  );
}
