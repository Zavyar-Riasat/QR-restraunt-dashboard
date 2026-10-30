import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ExecutiveKPIs from '../components/ExecutiveKPIs';
import OrdersFeed from '../components/OrdersFeed';
import { restaurantService } from '../services/restaurantService';
import { orderService, playKitchenChime, playLoudKitchenAlarm, unlockAudioContext } from '../services/orderService';
import { useAuth } from '../context/AuthContext';
import { getRoleTierConfig } from '../services/authService';
import { Store, Layers, Utensils, Bell, Printer, LayoutGrid, Plus, Users, CheckCircle2, Wallet, UtensilsCrossed, Copy, Check, FileText, ShieldCheck } from 'lucide-react';
import { printerService } from '../services/printer/printerService';
import { customerKhataService } from '../services/customerKhataService';
import PrinterReconnectBanner from '../components/Printer/PrinterReconnectBanner';
import PrinterStatusBadge from '../components/Printer/PrinterStatusBadge';
import InstallAppButton from '../components/PWA/InstallAppButton';
import OfflineBanner from '../components/PWA/OfflineBanner';
import NotificationPromptBanner from '../components/PWA/NotificationPromptBanner';
import { pwaService } from '../services/pwaService';
import { getAppBaseUrl } from '../config/appConfig.js';

// Direct imports for Dashboard Tabs so shifting tabs never flashes a skeleton or reloads layout structure
import StoreSettings from '../components/StoreSettings';
import CategoryManager from '../components/CategoryManager';
import MenuItemManager from '../components/MenuItemManager';
import QRCodeManager from '../components/QRCodeManager';
import TableManager from '../components/TableManagement/TableManager';
import CustomerManager from '../components/Customers/CustomerManager';
import CashFlowManager from '../components/CashFlow/CashFlowManager';
import StaffRoleManager from '../components/Staff/StaffRoleManager';
const NewOrderModal = lazy(() => import('../components/POS/NewOrderModal'));
const PrinterSetupWizard = lazy(() => import('../components/Printer/PrinterSetupWizard'));
const TodaySalesSummaryModal = lazy(() => import('../components/Reports/TodaySalesSummaryModal'));

export default function OwnerDashboardPage() {
  const navigate = useNavigate();
  const { restaurantSlug } = useParams();
  const { user } = useAuth();
  const tierConfig = useMemo(() => getRoleTierConfig(user?.role), [user?.role]);

  const [activeTab, setActiveTabState] = useState(() => {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const requested = params?.get('tab');
    const cfg = getRoleTierConfig(user?.role);
    if (requested && cfg.allowedTabs.includes(requested)) {
      return requested;
    }
    return cfg.defaultTab || 'orders';
  });

  const setActiveTab = useCallback((tab) => {
    if (!tierConfig.allowedTabs.includes(tab)) {
      return;
    }
    setActiveTabState(tab);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState(null, '', url.pathname + url.search);
    } catch {
      // ignore URL replace errors
    }
  }, [tierConfig.allowedTabs]);

  useEffect(() => {
    if (!tierConfig.allowedTabs.includes(activeTab)) {
      setActiveTabState(tierConfig.defaultTab);
    }
  }, [activeTab, tierConfig]);

  // Synchronously hydrate initial state on first render for instant FCP & LCP (zero loading spinner shift)
  const initialSyncData = useMemo(() => {
    const filter = {};
    if (restaurantSlug) {
      filter.slug = restaurantSlug;
    } else if (user?.restaurant_id) {
      filter.restaurantId = user.restaurant_id;
    } else if (user?.restaurant_slug) {
      filter.slug = user.restaurant_slug;
    }
    const syncState = restaurantService.getInitialStateSync(filter);
    const restId = syncState.restaurant?.id || 'rest-101';
    const initialOrders = orderService.getOrders(restId);
    const initialStats = orderService.getOrderStats(restId);
    return {
      ...syncState,
      orders: initialOrders,
      orderStats: initialStats,
    };
  }, []);

  const [restaurant, setRestaurant] = useState(() => initialSyncData.restaurant);
  const [allRestaurants, setAllRestaurants] = useState([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(null);
  const [categories, setCategories] = useState(() => initialSyncData.categories || []);
  const [menuItems, setMenuItems] = useState(() => initialSyncData.menuItems || []);
  const [orders, setOrders] = useState(() => initialSyncData.orders || []);
  const [orderStats, setOrderStats] = useState(() => initialSyncData.orderStats || null);
  const [isLive, setIsLive] = useState(() => Boolean(initialSyncData.isLive));
  const [loading, setLoading] = useState(false);
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('dinehq_sound_enabled') !== 'false';
  });
  const [mutedOrderIds, setMutedOrderIds] = useState([]);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [newOrderAlert, setNewOrderAlert] = useState(null);
  const [isPrintingSummary, setIsPrintingSummary] = useState(false);
  const [summaryToast, setSummaryToast] = useState(null);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [posInitialTable, setPosInitialTable] = useState(null);
  const [posInitialOrderType, setPosInitialOrderType] = useState('dine_in');
  const [posInitialAppendOrderId, setPosInitialAppendOrderId] = useState(null);
  const [isSalesSummaryModalOpen, setIsSalesSummaryModalOpen] = useState(false);
  const [currentSummaryData, setCurrentSummaryData] = useState(null);

  // Khata & Customers state
  const [khataFilter, setKhataFilter] = useState('all');

  const [khataSummary, setKhataSummary] = useState({
    totalCustomers: 0,
    customersWithBalanceCount: 0,
    totalReceivablePaisa: 0,
    topOverdueCustomers: [],
  });

  // Refresh Khata & customer balance summary
  const refreshKhataSummary = useCallback(() => {
    if (!restaurant?.id) return;
    try {
      const summary = customerKhataService.getKhataSummary(restaurant.id);
      setKhataSummary(summary);
    } catch (e) {
      console.warn('Error refreshing khata summary:', e);
    }
  }, [restaurant?.id]);

  useEffect(() => {
    refreshKhataSummary();
  }, [refreshKhataSummary, orders]);

  useEffect(() => {
    const handleCustomerUpdated = () => {
      refreshKhataSummary();
    };
    window.addEventListener('dinehq_customer_updated', handleCustomerUpdated);
    return () => {
      window.removeEventListener('dinehq_customer_updated', handleCustomerUpdated);
    };
  }, [restaurant?.id]);

  const handleNavigateToKhata = (filter = 'has_balance') => {
    setKhataFilter(filter);
    setActiveTab('customers');
  };

  const handleOpenNewOrder = (table = null, orderType = 'dine_in', appendOrderId = null) => {
    setPosInitialTable(table);
    setPosInitialOrderType(orderType);
    setPosInitialAppendOrderId(appendOrderId);
    setIsNewOrderModalOpen(true);
  };

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('dinehq_sound_enabled', String(next));
      if (next) {
        unlockAudioContext();
        playKitchenChime();
      }
      return next;
    });
  };

  const handleMuteOrderAlert = (orderId) => {
    if (!orderId) return;
    setMutedOrderIds((prev) => (prev.includes(orderId) ? prev : [...prev, orderId]));
  };

  const handleUnlockAudio = async () => {
    const ok = await unlockAudioContext();
    if (ok) {
      setIsAudioUnlocked(true);
      playKitchenChime();
    }
  };

  // Listen for user click/tap anywhere on the dashboard to unlock Web Audio API automatically
  useEffect(() => {
    const handleGesture = async () => {
      const ok = await unlockAudioContext();
      if (ok) {
        setIsAudioUnlocked(true);
      }
    };
    window.addEventListener('click', handleGesture, { once: true });
    window.addEventListener('keydown', handleGesture, { once: true });

    // Request desktop browser notifications permission if supported
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => { });
    }

    return () => {
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('keydown', handleGesture);
    };
  }, []);

  // Keep screen awake while the Orders screen is open (Screen Wake Lock API)
  useEffect(() => {
    const handleWakeLock = async () => {
      if (activeTab === 'orders' && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        await pwaService.acquireWakeLock();
      } else if (activeTab !== 'orders') {
        await pwaService.releaseWakeLock();
      }
    };

    handleWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && activeTab === 'orders') {
        pwaService.acquireWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      pwaService.releaseWakeLock();
    };
  }, [activeTab]);

  // Repeating loud alarm sound loop for pending new orders (repeats every 4.5s until accepted or muted)
  useEffect(() => {
    if (!soundEnabled) return;

    const unmutedNewOrders = orders.filter(
      (o) => o.status === 'new' && !mutedOrderIds.includes(o.id)
    );

    if (unmutedNewOrders.length === 0) return;

    // Trigger immediately
    playLoudKitchenAlarm();

    const timer = setInterval(() => {
      playLoudKitchenAlarm();
    }, 4500);

    return () => clearInterval(timer);
  }, [orders, soundEnabled, mutedOrderIds]);

  // Background polling fallback (every 8 seconds) so incoming orders update reliably across multiple devices
  // Reference check avoids re-rendering when localStorage has not changed
  useEffect(() => {
    if (!restaurant?.id) return;
    const interval = setInterval(() => {
      const refreshed = orderService.getOrders(restaurant.id);
      setOrders((prev) => {
        if (prev === refreshed) return prev;
        setOrderStats(orderService.getOrderStats(restaurant.id));
        return refreshed;
      });
    }, 8000);
    return () => clearInterval(interval);
  }, [restaurant?.id]);

  // Load all restaurants for admin switcher (only needed for superadmin role)
  useEffect(() => {
    if (user?.role !== 'admin') return;
    async function loadRestaurantsList() {
      try {
        const list = await restaurantService.getAllRestaurants();
        setAllRestaurants(list);
      } catch (e) {
        console.warn('Error loading restaurants list:', e);
      }
    }
    loadRestaurantsList();
  }, [user?.role]);

  // Load data for the active restaurant tenant (hydrates live Supabase data if configured)
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const filter = {};
        if (restaurantSlug) {
          filter.slug = restaurantSlug;
        } else if (selectedRestaurantId) {
          filter.restaurantId = selectedRestaurantId;
        } else if (user?.restaurant_id) {
          filter.restaurantId = user.restaurant_id;
        } else if (user?.restaurant_slug) {
          filter.slug = user.restaurant_slug;
        }

        const data = await restaurantService.getInitialState(filter);
        if (!isMounted) return;
        setRestaurant(data.restaurant);
        setCategories(data.categories || []);
        setMenuItems(data.menuItems || []);
        setIsLive(data.isLive);

        // Load real orders & stats for this restaurant
        if (data.restaurant?.id) {
          const loadedOrders = orderService.getOrders(data.restaurant.id);
          const stats = orderService.getOrderStats(data.restaurant.id);
          setOrders((prev) => (prev === loadedOrders ? prev : loadedOrders));
          setOrderStats(stats);
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [user, selectedRestaurantId, restaurantSlug]);

  // Real-time synchronization of incoming orders and audio notifications
  useEffect(() => {
    if (!restaurant?.id) return;

    const handleNewOrder = (event) => {
      const { restaurantId, order } = event.detail || {};
      if (!restaurantId || restaurantId === restaurant.id) {
        const loadedOrders = orderService.getOrders(restaurant.id);
        const stats = orderService.getOrderStats(restaurant.id);
        setOrders(loadedOrders);
        setOrderStats(stats);

        // Play loud kitchen alarm
        if (soundEnabled) {
          try {
            playLoudKitchenAlarm();
          } catch (e) {
            console.warn('Audio alarm notice:', e);
          }
        }

        if (order) {
          setNewOrderAlert(`🔔 NEW ORDER #${order.id} from ${order.customer_name}! Waiting for kitchen acceptance.`);

          // Auto-clear alert toast after 10 seconds
          setTimeout(() => {
            setNewOrderAlert((prev) => (prev && prev.includes(`#${order.id}`) ? null : prev));
          }, 10000);

          // Dispatch PWA Web Push notification and background audio alert
          pwaService.notifyNewOrder(order);

          // Trigger Desktop Notification if tab is in the background (direct fallback)
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && document.hidden) {
            try {
              const notif = new Notification(`🚨 New Order #${order.id} (Rs. ${order.total_payable?.toLocaleString()})`, {
                body: `${order.customer_name} placed an order (${order.order_type || 'direct'}). Tap to view & prepare.`,
                icon: restaurant?.logo_url || '/favicon.ico',
              });
              notif.onclick = () => {
                window.focus();
                notif.close();
              };
            } catch (nErr) {
              console.warn('Desktop notification notice:', nErr);
            }
          }


        }
      }
    };

    const handleOrderStatusUpdated = (event) => {
      const { restaurantId } = event.detail || {};
      if (!restaurantId || restaurantId === restaurant.id) {
        const loadedOrders = orderService.getOrders(restaurant.id);
        const stats = orderService.getOrderStats(restaurant.id);
        setOrders(loadedOrders);
        setOrderStats(stats);
        setNewOrderAlert(null);
      }
    };

    const handleStorage = (e) => {
      if (e.key && e.key.includes('dinehq_orders')) {
        const loadedOrders = orderService.getOrders(restaurant.id);
        const stats = orderService.getOrderStats(restaurant.id);
        setOrders(loadedOrders);
        setOrderStats(stats);
      }
    };

    window.addEventListener('dinehq_order_placed', handleNewOrder);
    window.addEventListener('dinehq_order_status_updated', handleOrderStatusUpdated);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('dinehq_order_placed', handleNewOrder);
      window.removeEventListener('dinehq_order_status_updated', handleOrderStatusUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, [restaurant?.id, soundEnabled]);

  const persistChanges = (newRest, newCats, newItems) => {
    restaurantService.saveLocalState({
      restaurant: newRest || restaurant,
      categories: newCats || categories,
      menuItems: newItems || menuItems,
    });
  };

  const handleSelectRestaurant = (restId) => {
    setSelectedRestaurantId(restId);
    const target = allRestaurants.find((r) => r.id === restId);
    if (target) {
      const syncState = restaurantService.getInitialStateSync({ restaurantId: restId, slug: target.slug });
      if (syncState?.restaurant) {
        setRestaurant(syncState.restaurant);
        setCategories(syncState.categories || []);
        setMenuItems(syncState.menuItems || []);
        setOrders(orderService.getOrders(syncState.restaurant.id));
        setOrderStats(orderService.getOrderStats(syncState.restaurant.id));
      }
      if (target.slug) {
        navigate(`/${target.slug}/admin?tab=${activeTab}`, { replace: true });
      }
    }
  };

  const handleUpdateRestaurant = async (updates) => {
    if (!restaurant) return;
    const updated = await restaurantService.updateRestaurant(restaurant.id, updates);
    const merged = { ...restaurant, ...updated };
    setRestaurant(merged);
    persistChanges(merged, categories, menuItems);
  };

  const handleToggleKitchenOpen = async () => {
    if (!restaurant) return;
    const newIsOpen = restaurant.is_open === false ? true : false;
    await handleUpdateRestaurant({ is_open: newIsOpen });
  };

  const handleCreateCategory = async (name) => {
    if (!restaurant) return null;
    const newCat = await restaurantService.createCategory(restaurant.id, name);
    const updatedCats = [...categories, newCat];
    setCategories(updatedCats);
    persistChanges(restaurant, updatedCats, menuItems);
    return newCat;
  };

  const handleUpdateCategory = async (categoryId, name) => {
    await restaurantService.updateCategory(categoryId, name);
    const updatedCats = categories.map((c) => (c.id === categoryId ? { ...c, name } : c));
    setCategories(updatedCats);
    persistChanges(restaurant, updatedCats, menuItems);
  };

  const handleDeleteCategory = async (categoryId) => {
    await restaurantService.deleteCategory(categoryId);
    const updatedCats = categories.filter((c) => c.id !== categoryId);
    const updatedItems = menuItems.filter((i) => i.category_id !== categoryId);
    setCategories(updatedCats);
    setMenuItems(updatedItems);
    persistChanges(restaurant, updatedCats, updatedItems);
  };

  const handleCreateMenuItem = async (itemData) => {
    if (!restaurant) return;
    const newItem = await restaurantService.createMenuItem({
      ...itemData,
      restaurant_id: restaurant.id,
    });
    const updatedItems = [...menuItems, newItem];
    setMenuItems(updatedItems);
    persistChanges(restaurant, categories, updatedItems);
  };

  const handleUpdateMenuItem = async (itemId, itemData) => {
    const updated = await restaurantService.updateMenuItem(itemId, itemData);
    const updatedItems = menuItems.map((i) => (i.id === itemId ? { ...i, ...updated } : i));
    setMenuItems(updatedItems);
    persistChanges(restaurant, categories, updatedItems);
  };

  const handleDeleteMenuItem = async (itemId) => {
    await restaurantService.deleteMenuItem(itemId);
    const updatedItems = menuItems.filter((i) => i.id !== itemId);
    setMenuItems(updatedItems);
    persistChanges(restaurant, categories, updatedItems);
  };

  const handleUpdateOrderStatus = (orderId, newStatus) => {
    if (!restaurant?.id) return;
    const existingOrder = orders.find((o) => o.id === orderId);
    const updated = orderService.updateOrderStatus(restaurant.id, orderId, newStatus);
    setOrders(updated);
    setOrderStats(orderService.getOrderStats(restaurant.id));

    if (existingOrder?.status === 'new' && newStatus === 'preparing') {
      const acceptedOrder = updated.find((o) => o.id === orderId) || { ...existingOrder, status: 'preparing' };
      printerService.autoPrintNewOrder(acceptedOrder, restaurant).catch((pErr) => {
        console.warn('Auto-print dispatch notice:', pErr);
      });
    }
  };

  const handleOpenLiveCustomerMenu = () => {
    if (restaurant?.slug) {
      window.open(`/${restaurant.slug}`, '_blank');
    }
  };

  const [menuUrlCopied, setMenuUrlCopied] = useState(false);
  const handleCopyMenuUrl = () => {
    const origin = getAppBaseUrl();
    const menuUrl = `${origin}/${restaurant?.slug || 'burgersmoke'}`;
    navigator.clipboard.writeText(menuUrl);
    setMenuUrlCopied(true);
    setTimeout(() => setMenuUrlCopied(false), 2000);
  };

  const handlePrintTodaySalesSummary = async () => {
    try {
      setIsPrintingSummary(true);
      const currentOrders = restaurant?.id ? orderService.getOrders(restaurant.id) : orders;

      const now = new Date();
      const todayStr = now.toDateString();
      const nonCancelledOrders = currentOrders.filter((o) => o.status !== 'cancelled');

      // Filter for orders from today
      const todayOrders = nonCancelledOrders.filter((o) => {
        if (!o.created_at) return true;
        const d = new Date(o.created_at);
        return d.toDateString() === todayStr;
      });

      // Target today's orders if any exist; otherwise fallback to recent non-cancelled orders for display
      const targetOrders = todayOrders.length > 0 ? todayOrders : nonCancelledOrders;

      const totalOrders = targetOrders.length;
      const totalSales = targetOrders.reduce((sum, o) => sum + (Number(o.total_payable) || 0), 0);
      const averageOrderValue = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;

      // Cash vs Online Breakdown
      let cashTotal = 0;
      let cashCount = 0;
      let onlineTotal = 0;
      let onlineCount = 0;

      for (const order of targetOrders) {
        const method = (order.payment_method || '').toLowerCase();
        const payable = Number(order.total_payable) || 0;
        const isOnline =
          method.includes('online') ||
          method.includes('jazzcash') ||
          method.includes('easypaisa') ||
          method.includes('card') ||
          method.includes('bank') ||
          method.includes('stripe');

        if (isOnline) {
          onlineTotal += payable;
          onlineCount += 1;
        } else {
          cashTotal += payable;
          cashCount += 1;
        }
      }

      // Top 5 Best-Selling Items
      const itemMap = {};
      for (const order of targetOrders) {
        if (Array.isArray(order.items)) {
          for (const item of order.items) {
            const key = item.title || 'Special Item';
            const qty = Number(item.quantity) || 1;
            const unit = Number(item.unitPrice) || 0;
            if (!itemMap[key]) {
              itemMap[key] = { title: key, quantity: 0, revenue: 0 };
            }
            itemMap[key].quantity += qty;
            itemMap[key].revenue += qty * unit;
          }
        }
      }

      const topItems = Object.values(itemMap)
        .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
        .slice(0, 5);

      const summaryData = {
        totalOrders,
        totalSales,
        averageOrderValue,
        cashSales: {
          count: cashCount,
          total: cashTotal,
        },
        onlineSales: {
          count: onlineCount,
          total: onlineTotal,
        },
        topItems,
        date: now.toLocaleDateString('en-PK', {
          weekday: 'long',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
        time: now.toLocaleTimeString('en-PK', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
      };

      setCurrentSummaryData(summaryData);
      setIsSalesSummaryModalOpen(true);
    } catch (err) {
      console.error('Failed to prepare sales summary report:', err);
      alert(`Could not open sales summary: ${err.message}`);
    } finally {
      setIsPrintingSummary(false);
    }
  };

  const handlePrintThermalSummary = async (customSummaryData) => {
    const dataToPrint = customSummaryData || currentSummaryData;
    if (!dataToPrint) return;
    try {
      await printerService.printSalesSummary(dataToPrint, {
        restaurant: restaurant || { name: 'Dineflow Kitchen', slug: 'burgersmoke' },
      });
      setSummaryToast(`${dataToPrint.rangeLabel || "Sales"} Summary (80mm) dispatched successfully!`);
      setTimeout(() => setSummaryToast(null), 4000);
    } catch (err) {
      console.error('Failed to print thermal sales summary:', err);
      alert(`Could not print thermal sales summary: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-600">
        <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-900 font-heading font-bold text-base">Opening Kitchen Command Center...</p>
        <p className="text-xs text-slate-500 mt-1">Connecting to your store database</p>
      </div>
    );
  }

  const activeOrdersCount = orders.filter((o) => o.status === 'new' || o.status === 'preparing' || o.status === 'out_for_delivery' || o.status === 'ready' || o.status === 'held').length;
  const completedOrdersCount = orders.filter((o) => o.status === 'completed').length;

  return (
    <div className="min-h-screen bg-[#FFF9F2] text-[#2B2118] flex flex-col font-sans overflow-x-hidden max-w-[100vw] selection:bg-[#F26B1D] selection:text-white">
      {/* Offline Alert & Push Notification Permission Banners */}
      <div className="no-print">
        <OfflineBanner />
        <NotificationPromptBanner />
      </div>

      {/* Top Navbar */}
      <div className="no-print">
        <Navbar
          restaurant={restaurant}
          allRestaurants={allRestaurants}
          onSelectRestaurant={handleSelectRestaurant}
          isLive={isLive}
          kitchenOpen={restaurant?.is_open !== false}
          onToggleKitchenOpen={handleToggleKitchenOpen}
          onOpenQR={() => setActiveTab('qr')}
          onOpenPreview={handleOpenLiveCustomerMenu}
          onOpenPrinterSettings={() => setIsPrinterModalOpen(true)}
          onOpenNewOrder={() => handleOpenNewOrder(null, 'dine_in')}
          onPrintSalesSummary={handlePrintTodaySalesSummary}
          isPrintingSummary={isPrintingSummary}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Friendly Printer Reconnect / Auto-Detect Banner */}
        <PrinterReconnectBanner onOpenSettings={() => setIsPrinterModalOpen(true)} />

        {/* Top Executive ROI KPI Cards & Role-Aware Shift Overview */}
        <section className="no-print space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white/70 backdrop-blur-xs p-3.5 sm:p-4 rounded-2xl border border-[#F0E4D7]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm sm:text-base md:text-lg font-black text-slate-900 tracking-tight">
                  {user?.role === 'waiter'
                    ? 'Floor & Table Service Station'
                    : user?.role === 'cashier'
                    ? 'Counter POS & Order Billing Station'
                    : 'Business Performance & Shift Overview'}
                </h2>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                {user?.role === 'waiter'
                  ? 'Occupy tables according to customer need, punch dine-in orders, and manage floor seating'
                  : user?.role === 'cashier'
                  ? 'Manage active kitchen orders, counter takeaway/dine-in POS, and customer bill checkout'
                  : 'Real-time gross revenue, order volume, and daily register metrics'}
              </p>
            </div>

            {/* Quick Shift & Store Action Controls */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
              {user?.role !== 'waiter' && (
                <PrinterStatusBadge onOpenSettings={() => setIsPrinterModalOpen(true)} />
              )}

              {tierConfig.canViewRevenue && (
                <button
                  type="button"
                  onClick={handleCopyMenuUrl}
                  className="inline-flex items-center gap-1.5 h-8 sm:h-9 px-2.5 rounded-xl bg-white hover:bg-[#FFF1E6] text-[#2B2118] text-xs font-bold border border-[#F0E4D7] transition cursor-pointer whitespace-nowrap shrink-0 shadow-2xs"
                  title="Copy customer menu URL to share with customers"
                >
                  {menuUrlCopied ? (
                    <Check className="w-3.5 h-3.5 text-[#1F9D55] shrink-0" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#7A6A5C] shrink-0" />
                  )}
                  <span>{menuUrlCopied ? 'Copied!' : 'Copy Menu URL'}</span>
                </button>
              )}

              <InstallAppButton />

              {tierConfig.canViewReports && (
                <button
                  id="print-today-summary-navbar-btn"
                  type="button"
                  disabled={isPrintingSummary}
                  onClick={handlePrintTodaySalesSummary}
                  className="h-8 sm:h-9 inline-flex items-center gap-1.5 px-2.5 sm:px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold border border-slate-800 transition cursor-pointer shadow-2xs whitespace-nowrap shrink-0 disabled:opacity-50"
                  title="View Sales Reports & Order History"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{isPrintingSummary ? 'Loading...' : 'Reports'}</span>
                </button>
              )}

              <button
                id="new-order-navbar-btn"
                type="button"
                onClick={() => handleOpenNewOrder(null, 'dine_in')}
                className="h-8 sm:h-9 inline-flex items-center gap-1 sm:gap-1.5 px-3 sm:px-3.5 rounded-xl bg-gradient-to-r from-[#F26B1D] to-[#F5A623] hover:from-[#E05A0C] hover:to-[#E59512] active:scale-95 text-white text-xs sm:text-sm font-black shadow-md shadow-orange-500/25 transition cursor-pointer border border-amber-300/30 whitespace-nowrap shrink-0"
                title="Open In-Store POS to place a new Dine-in, Takeaway, or Delivery order"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3] shrink-0" />
                <span>New Order</span>
              </button>
            </div>
          </div>

          {summaryToast && (
            <div className="p-3 rounded-2xl bg-[#E7F6EC] border border-[#C0E9CE] text-[#1F9D55] text-xs font-bold flex items-center justify-between gap-2 shadow-xs animate-fadeIn">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-600" />
                <span>{summaryToast}</span>
              </div>
              <span className="text-[10px] text-emerald-700 font-mono">80mm Paper</span>
            </div>
          )}

          {tierConfig.canViewRevenue && (
            <ExecutiveKPIs
              restaurant={restaurant}
              menuItems={menuItems}
              orderStats={orderStats}
              totalCustomers={khataSummary.totalCustomers}
              onNavigateToKhata={handleNavigateToKhata}
            />
          )}
        </section>

        {/* Tab Navigation */}
        <div className="no-print flex items-center gap-1 sm:gap-1.5 border-b border-[#F0E4D7] pb-2 sm:pb-2.5 overflow-x-auto no-scrollbar scrollbar-none -mx-3 px-3 sm:-mx-0 sm:px-0">
          {tierConfig.allowedTabs.includes('orders') && (
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${activeTab === 'orders'
                  ? 'bg-[#F26B1D] text-white shadow-sm shadow-orange-500/20'
                  : 'bg-white text-[#7A6A5C] hover:text-[#2B2118] border border-[#F0E4D7] hover:bg-[#FFF1E6]/50'
                }`}
            >
              <Bell className="w-3.5 h-3.5 text-amber-300" />
              <span>Orders</span>
              {activeOrdersCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#E5484D] text-white text-[10px] font-bold font-mono animate-pulse">
                  {activeOrdersCount}
                </span>
              )}
            </button>
          )}

          {tierConfig.allowedTabs.includes('completed') && (
            <button
              onClick={() => setActiveTab('completed')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${activeTab === 'completed'
                  ? 'bg-[#F26B1D] text-white shadow-sm shadow-orange-500/20'
                  : 'bg-white text-[#7A6A5C] hover:text-[#2B2118] border border-[#F0E4D7] hover:bg-[#FFF1E6]/50'
                }`}
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${activeTab === 'completed' ? 'text-white' : 'text-emerald-500'}`} />
              <span className="inline xl:hidden">Completed</span>
              <span className="hidden xl:inline">Completed Orders</span>
              {completedOrdersCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono ${
                  activeTab === 'completed' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {completedOrdersCount}
                </span>
              )}
            </button>
          )}

          {tierConfig.allowedTabs.includes('customers') && (
            <button
              onClick={() => {
                setActiveTab('customers');
                setKhataFilter('all');
              }}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${activeTab === 'customers'
                  ? 'bg-[#F26B1D] text-white shadow-sm shadow-orange-500/20'
                  : 'bg-white text-[#7A6A5C] hover:text-[#2B2118] border border-[#F0E4D7] hover:bg-[#FFF1E6]/50'
                }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Customers</span>
            </button>
          )}

          {tierConfig.allowedTabs.includes('cashflow') && (
            <button
              onClick={() => setActiveTab('cashflow')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${activeTab === 'cashflow'
                  ? 'bg-[#F26B1D] text-white shadow-sm shadow-orange-500/20'
                  : 'bg-white text-[#7A6A5C] hover:text-[#2B2118] border border-[#F0E4D7] hover:bg-[#FFF1E6]/50'
                }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Cash In / Out</span>
            </button>
          )}

          {tierConfig.allowedTabs.includes('items') && (
            <button
              onClick={() => setActiveTab('items')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${activeTab === 'items'
                  ? 'bg-[#F26B1D] text-white shadow-sm shadow-orange-500/20'
                  : 'bg-white text-[#7A6A5C] hover:text-[#2B2118] border border-[#F0E4D7] hover:bg-[#FFF1E6]/50'
                }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span className="inline xl:hidden">Menu ({menuItems.length})</span>
              <span className="hidden xl:inline">Menu Items ({menuItems.length})</span>
            </button>
          )}

          {tierConfig.allowedTabs.includes('categories') && (
            <button
              onClick={() => setActiveTab('categories')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${activeTab === 'categories'
                  ? 'bg-[#F26B1D] text-white shadow-sm shadow-orange-500/20'
                  : 'bg-white text-[#7A6A5C] hover:text-[#2B2118] border border-[#F0E4D7] hover:bg-[#FFF1E6]/50'
                }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Categories ({categories.length})</span>
            </button>
          )}

          {tierConfig.allowedTabs.includes('tables') && (
            <button
              onClick={() => setActiveTab('tables')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${activeTab === 'tables'
                  ? 'bg-[#F26B1D] text-white shadow-sm shadow-orange-500/20'
                  : 'bg-white text-[#7A6A5C] hover:text-[#2B2118] border border-[#F0E4D7] hover:bg-[#FFF1E6]/50'
                }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Tables</span>
            </button>
          )}

          {tierConfig.allowedTabs.includes('qr') && (
            <button
              onClick={() => setActiveTab('qr')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${activeTab === 'qr'
                  ? 'bg-[#F26B1D] text-white shadow-sm shadow-orange-500/20'
                  : 'bg-white text-[#7A6A5C] hover:text-[#2B2118] border border-[#F0E4D7] hover:bg-[#FFF1E6]/50'
                }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print QR</span>
            </button>
          )}

          {tierConfig.allowedTabs.includes('staff') && (
            <button
              onClick={() => setActiveTab('staff')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${activeTab === 'staff'
                  ? 'bg-[#F26B1D] text-white shadow-sm shadow-orange-500/20'
                  : 'bg-white text-[#7A6A5C] hover:text-[#2B2118] border border-[#F0E4D7] hover:bg-[#FFF1E6]/50'
                }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Staff & Roles</span>
            </button>
          )}

          {tierConfig.canAccessSettings && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${activeTab === 'settings'
                  ? 'bg-[#F26B1D] text-white shadow-sm shadow-orange-500/20'
                  : 'bg-white text-[#7A6A5C] hover:text-[#2B2118] border border-[#F0E4D7] hover:bg-[#FFF1E6]/50'
                }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
          )}
        </div>

        {/* Tab View Panels */}
        <div>
          {(activeTab === 'orders' || activeTab === 'completed') &&
            tierConfig.allowedTabs.includes(activeTab) && (
              <OrdersFeed
                orders={orders}
                feedMode={activeTab === 'completed' ? 'completed' : 'active'}
                onNavigateToCompleted={() => setActiveTab('completed')}
                onUpdateStatus={handleUpdateOrderStatus}
                restaurant={restaurant}
                soundEnabled={soundEnabled}
                onToggleSound={toggleSound}
                newOrderAlert={newOrderAlert}
                mutedOrderIds={mutedOrderIds}
                onMuteOrderAlert={handleMuteOrderAlert}
                isAudioUnlocked={isAudioUnlocked}
                onUnlockAudio={handleUnlockAudio}
                onOpenPrinterSettings={() => setIsPrinterModalOpen(true)}
                onOpenNewOrder={(table, orderType, appendOrderId) =>
                  handleOpenNewOrder(table, orderType || 'dine_in', appendOrderId)
                }
                onDismissOrderAlert={() => setNewOrderAlert(null)}
                menuItems={menuItems}
              />
            )}

          {activeTab === 'tables' && tierConfig.allowedTabs.includes('tables') && (
            <TableManager
              restaurant={restaurant}
              orders={orders}
              currentUser={user}
              onOpenPosForTable={(table, appendOrderId) => handleOpenNewOrder(table, 'dine_in', appendOrderId)}
              menuItems={menuItems}
            />
          )}

          {activeTab === 'items' && tierConfig.allowedTabs.includes('items') && (
            <MenuItemManager
              categories={categories}
              menuItems={menuItems}
              onCreateMenuItem={handleCreateMenuItem}
              onUpdateMenuItem={handleUpdateMenuItem}
              onDeleteMenuItem={handleDeleteMenuItem}
            />
          )}

          {activeTab === 'qr' && tierConfig.allowedTabs.includes('qr') && (
            <QRCodeManager
              restaurant={restaurant}
              onNavigateToSettings={() => tierConfig.canAccessSettings && setActiveTab('settings')}
            />
          )}

          {activeTab === 'categories' && tierConfig.allowedTabs.includes('categories') && (
            <CategoryManager
              categories={categories}
              menuItems={menuItems}
              onCreateCategory={handleCreateCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
            />
          )}

          {activeTab === 'customers' && tierConfig.allowedTabs.includes('customers') && (
            <CustomerManager
              restaurant={restaurant}
              currentUser={user}
              orders={orders}
              initialFilter={khataFilter}
              onViewOrder={(orderOrId) => {
                const targetOrder =
                  typeof orderOrId === 'object' && orderOrId !== null
                    ? orderOrId
                    : orders.find((o) => o.id === orderOrId);
                if (targetOrder?.status === 'completed') {
                  setActiveTab('completed');
                } else {
                  setActiveTab('orders');
                }
              }}
            />
          )}

          {activeTab === 'cashflow' && tierConfig.allowedTabs.includes('cashflow') && (
            <CashFlowManager
              restaurant={restaurant}
              currentUser={user}
              orders={orders}
            />
          )}

          {activeTab === 'staff' && tierConfig.allowedTabs.includes('staff') && (
            <StaffRoleManager
              restaurant={restaurant}
              currentUser={user}
            />
          )}

          {activeTab === 'settings' && tierConfig.canAccessSettings && (
            <StoreSettings
              restaurant={restaurant}
              categories={categories}
              orders={orders}
              onUpdate={handleUpdateRestaurant}
              onOpenPrinterSettings={() => setIsPrinterModalOpen(true)}
              onOpenPosForTable={(table, appendOrderId) => handleOpenNewOrder(table, 'dine_in', appendOrderId)}
            />
          )}
        </div>
      </main>

      {/* Mobile Floating Action Button: "+ New Order" */}
      <button
        id="fab-new-order-mobile-btn"
        type="button"
        onClick={() => handleOpenNewOrder(null, 'dine_in')}
        className="lg:hidden fixed bottom-5 right-4 z-40 flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-[#F26B1D] to-[#F5A623] text-white shadow-xl shadow-orange-500/35 hover:scale-105 active:scale-95 transition cursor-pointer border border-amber-300/40"
        title="Create New Order (POS)"
      >
        <Plus className="w-6 h-6 stroke-[3]" />
      </button>

      {/* POS In-Store New Order Modal (Lazy-mounted only when open) */}
      {isNewOrderModalOpen && (
        <Suspense fallback={null}>
          <NewOrderModal
            isOpen={isNewOrderModalOpen}
            onClose={() => {
              setIsNewOrderModalOpen(false);
              setPosInitialAppendOrderId(null);
            }}
            restaurant={restaurant}
            categories={categories}
            menuItems={menuItems}
            orders={orders}
            currentUser={user}
            initialTable={posInitialTable}
            initialOrderType={posInitialOrderType}
            initialAppendOrderId={posInitialAppendOrderId}
            onOrderCreated={() => {
              if (restaurant?.id) {
                const refreshed = orderService.getOrders(restaurant.id);
                setOrders(refreshed);
                setOrderStats(orderService.getOrderStats(restaurant.id));
              }
              refreshKhataSummary();
            }}
          />
        </Suspense>
      )}

      {/* Printer Setup Wizard Modal (Lazy-mounted only when open) */}
      {isPrinterModalOpen && (
        <Suspense fallback={null}>
          <PrinterSetupWizard
            isOpen={isPrinterModalOpen}
            onClose={() => setIsPrinterModalOpen(false)}
            categories={categories}
          />
        </Suspense>
      )}

      {/* Executive PDF-style Daily & Period Sales Summary Report Modal (Lazy-mounted only when open) */}
      {isSalesSummaryModalOpen && (
        <Suspense fallback={null}>
          <TodaySalesSummaryModal
            isOpen={isSalesSummaryModalOpen}
            onClose={() => setIsSalesSummaryModalOpen(false)}
            restaurant={restaurant}
            summaryData={currentSummaryData}
            onPrintThermal={handlePrintThermalSummary}
            orders={orders}
            menuItems={menuItems}
          />
        </Suspense>
      )}

      {/* Footer */}
      <footer className="no-print mt-auto py-3.5 border-t border-slate-200 text-center text-xs text-slate-500 bg-white space-y-1">
        <div className="flex items-center justify-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#F26B1D] to-[#F5A623] flex items-center justify-center text-white shadow-2xs">
            <UtensilsCrossed className="w-3.5 h-3.5" />
          </div>
          <span className="font-heading font-extrabold text-[#2B2118] text-sm tracking-tight">Dineflow</span>
        </div>
        <p className="text-[11px] text-slate-400">Dineflow &copy; 2026. All rights reserved.</p>
      </footer>
    </div>
  );
}
