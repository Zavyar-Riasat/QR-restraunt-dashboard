import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ExecutiveKPIs from '../components/ExecutiveKPIs';
import StoreSettings from '../components/StoreSettings';
import CategoryManager from '../components/CategoryManager';
import MenuItemManager from '../components/MenuItemManager';
import QRCodeManager from '../components/QRCodeManager';
import OrdersFeed from '../components/OrdersFeed';
import { restaurantService } from '../services/restaurantService';
import { orderService, playKitchenChime, playLoudKitchenAlarm, unlockAudioContext } from '../services/orderService';
import { useAuth } from '../context/AuthContext';
import { Store, Layers, Utensils, Bell, Printer, LayoutGrid, Plus } from 'lucide-react';
import PrinterSetupWizard from '../components/Printer/PrinterSetupWizard';
import { printerService } from '../services/printer/printerService';
import NewOrderModal from '../components/POS/NewOrderModal';
import TableManager from '../components/TableManagement/TableManager';

export default function OwnerDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('orders'); // default to live kitchen orders
  const [restaurant, setRestaurant] = useState(null);
  const [allRestaurants, setAllRestaurants] = useState([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderStats, setOrderStats] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
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

  const handleOpenNewOrder = (table = null, orderType = 'dine_in') => {
    setPosInitialTable(table);
    setPosInitialOrderType(orderType);
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
      Notification.requestPermission().catch(() => {});
    }

    return () => {
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('keydown', handleGesture);
    };
  }, []);

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
  useEffect(() => {
    if (!restaurant?.id) return;
    const interval = setInterval(() => {
      const refreshed = orderService.getOrders(restaurant.id);
      setOrders(refreshed);
      setOrderStats(orderService.getOrderStats(restaurant.id));
    }, 8000);
    return () => clearInterval(interval);
  }, [restaurant?.id]);

  // Load all restaurants for admin switcher
  useEffect(() => {
    async function loadRestaurantsList() {
      try {
        const list = await restaurantService.getAllRestaurants();
        setAllRestaurants(list);
      } catch (e) {
        console.warn('Error loading restaurants list:', e);
      }
    }
    loadRestaurantsList();
  }, []);

  // Load data for the active restaurant tenant
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const filter = {};
        if (selectedRestaurantId) {
          filter.restaurantId = selectedRestaurantId;
        } else if (user?.restaurant_id) {
          filter.restaurantId = user.restaurant_id;
        } else if (user?.restaurant_slug) {
          filter.slug = user.restaurant_slug;
        }

        const data = await restaurantService.getInitialState(filter);
        setRestaurant(data.restaurant);
        setCategories(data.categories || []);
        setMenuItems(data.menuItems || []);
        setIsLive(data.isLive);

        // Load real orders & stats for this restaurant
        if (data.restaurant?.id) {
          const loadedOrders = orderService.getOrders(data.restaurant.id);
          const stats = orderService.getOrderStats(data.restaurant.id);
          setOrders(loadedOrders);
          setOrderStats(stats);
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user, selectedRestaurantId]);

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

          // Trigger Desktop Notification if tab is in the background
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

          // Automatically print KOT if Auto-print is enabled
          printerService.autoPrintNewOrder(order, restaurant).catch((pErr) => {
            console.warn('Auto-print dispatch notice:', pErr);
          });
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
    if (!isLive) {
      restaurantService.saveLocalState({
        restaurant: newRest || restaurant,
        categories: newCats || categories,
        menuItems: newItems || menuItems,
      });
    }
  };

  const handleSelectRestaurant = (restId) => {
    setSelectedRestaurantId(restId);
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
    const updated = orderService.updateOrderStatus(restaurant.id, orderId, newStatus);
    setOrders(updated);
    setOrderStats(orderService.getOrderStats(restaurant.id));
  };

  const handleOpenLiveCustomerMenu = () => {
    if (restaurant?.slug) {
      window.open(`/${restaurant.slug}`, '_blank');
    }
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

      await printerService.printSalesSummary(summaryData, {
        restaurant: restaurant || { name: 'DineHQ Kitchen', slug: 'burgersmoke' },
      });

      setSummaryToast("Today's Sales Summary (80mm) dispatched successfully!");
      setTimeout(() => setSummaryToast(null), 4000);
    } catch (err) {
      console.error('Failed to print sales summary:', err);
      alert(`Could not print sales summary: ${err.message}`);
    } finally {
      setIsPrintingSummary(false);
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

  const activeOrdersCount = orders.filter((o) => o.status === 'new' || o.status === 'preparing' || o.status === 'out_for_delivery').length;

  return (
    <div className="min-h-screen bg-[#FFF9F2] text-[#2B2118] flex flex-col font-sans selection:bg-[#F26B1D] selection:text-white">
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
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Top Executive ROI KPI Cards & Sales Summary Action */}
        <section className="no-print space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/70 backdrop-blur-xs p-4 rounded-2xl border border-[#F0E4D7]">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Business Performance & Shift Overview
                </h2>
                <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                  Live Shift
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time gross revenue, order volume, and daily register metrics
              </p>
            </div>

            <button
              id="print-today-sales-summary-btn"
              type="button"
              disabled={isPrintingSummary}
              onClick={handlePrintTodaySalesSummary}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-98 text-white text-xs sm:text-sm font-bold shadow-sm shadow-slate-900/10 transition cursor-pointer border border-slate-800 shrink-0"
              title="Print Today's Sales Summary (80mm thermal receipt)"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>{isPrintingSummary ? 'Printing Summary...' : "Print Today's Sales Summary"}</span>
              <span className="text-[10px] bg-slate-800 text-amber-300 font-mono px-1.5 py-0.5 rounded border border-slate-700">
                80mm
              </span>
            </button>
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

          <ExecutiveKPIs restaurant={restaurant} menuItems={menuItems} orderStats={orderStats} />
        </section>

        {/* Tab Navigation */}
        <div className="no-print flex items-center gap-1.5 border-b border-[#F0E4D7] pb-3 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'orders'
                ? 'bg-[#F26B1D] text-white shadow-sm shadow-orange-500/20'
                : 'bg-white text-[#7A6A5C] hover:text-[#2B2118] border border-[#F0E4D7] hover:bg-[#FFF1E6]/50'
            }`}
          >
            <Bell className="w-4 h-4 text-amber-300" />
            <span>Orders</span>
            {activeOrdersCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#E5484D] text-white text-[10px] font-bold font-mono animate-pulse">
                {activeOrdersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('items')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'items'
                ? 'bg-[#F26B1D] text-white shadow-sm shadow-orange-500/20'
                : 'bg-white text-[#7A6A5C] hover:text-[#2B2118] border border-[#F0E4D7] hover:bg-[#FFF1E6]/50'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>Menu Items ({menuItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'categories'
                ? 'bg-[#F26B1D] text-white shadow-sm shadow-orange-500/20'
                : 'bg-white text-[#7A6A5C] hover:text-[#2B2118] border border-[#F0E4D7] hover:bg-[#FFF1E6]/50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Categories ({categories.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tables')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'tables'
                ? 'bg-[#F26B1D] text-white shadow-sm shadow-orange-500/20'
                : 'bg-white text-[#7A6A5C] hover:text-[#2B2118] border border-[#F0E4D7] hover:bg-[#FFF1E6]/50'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Tables</span>
          </button>

          <button
            onClick={() => setActiveTab('qr')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'qr'
                ? 'bg-[#F26B1D] text-white shadow-sm shadow-orange-500/20'
                : 'bg-white text-[#7A6A5C] hover:text-[#2B2118] border border-[#F0E4D7] hover:bg-[#FFF1E6]/50'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Print QR</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-[#F26B1D] text-white shadow-sm shadow-orange-500/20'
                : 'bg-white text-[#7A6A5C] hover:text-[#2B2118] border border-[#F0E4D7] hover:bg-[#FFF1E6]/50'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>

        {/* Tab View Panels */}
        <div>
          {activeTab === 'orders' && (
            <OrdersFeed
              orders={orders}
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
              onPrintSalesSummary={handlePrintTodaySalesSummary}
              onOpenNewOrder={() => handleOpenNewOrder(null, 'dine_in')}
              onDismissOrderAlert={() => setNewOrderAlert(null)}
              menuItems={menuItems}
            />
          )}

          {activeTab === 'tables' && (
            <TableManager
              restaurant={restaurant}
              orders={orders}
              currentUser={user}
              onOpenPosForTable={(table) => handleOpenNewOrder(table, 'dine_in')}
              menuItems={menuItems}
            />
          )}

          {activeTab === 'items' && (
            <MenuItemManager
              categories={categories}
              menuItems={menuItems}
              onCreateMenuItem={handleCreateMenuItem}
              onUpdateMenuItem={handleUpdateMenuItem}
              onDeleteMenuItem={handleDeleteMenuItem}
            />
          )}

          {activeTab === 'qr' && (
            <QRCodeManager
              restaurant={restaurant}
              onNavigateToSettings={() => setActiveTab('settings')}
            />
          )}

          {activeTab === 'categories' && (
            <CategoryManager
              categories={categories}
              menuItems={menuItems}
              onCreateCategory={handleCreateCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
            />
          )}

          {activeTab === 'settings' && (
            <StoreSettings
              restaurant={restaurant}
              categories={categories}
              orders={orders}
              onUpdate={handleUpdateRestaurant}
              onOpenPrinterSettings={() => setIsPrinterModalOpen(true)}
              onOpenPosForTable={(table) => handleOpenNewOrder(table, 'dine_in')}
            />
          )}
        </div>
      </main>

      {/* Mobile Floating Action Button: "+ New Order" */}
      <button
        id="fab-new-order-mobile-btn"
        type="button"
        onClick={() => handleOpenNewOrder(null, 'dine_in')}
        className="lg:hidden fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-[#F26B1D] to-[#F5A623] text-white font-black text-sm shadow-xl shadow-orange-500/35 hover:scale-105 active:scale-95 transition cursor-pointer border border-amber-300/40 animate-pulse hover:animate-none"
        title="Create New Order (POS)"
      >
        <Plus className="w-5 h-5 stroke-[3]" />
        <span>New Order</span>
      </button>

      {/* POS In-Store New Order Modal */}
      <NewOrderModal
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        restaurant={restaurant}
        categories={categories}
        menuItems={menuItems}
        orders={orders}
        currentUser={user}
        initialTable={posInitialTable}
        initialOrderType={posInitialOrderType}
        onOrderCreated={() => {
          if (restaurant?.id) {
            const refreshed = orderService.getOrders(restaurant.id);
            setOrders(refreshed);
            setOrderStats(orderService.getOrderStats(restaurant.id));
          }
        }}
      />

      {/* Printer Setup Wizard Modal */}
      <PrinterSetupWizard
        isOpen={isPrinterModalOpen}
        onClose={() => setIsPrinterModalOpen(false)}
        categories={categories}
      />

      {/* Footer */}
      <footer className="no-print mt-auto py-6 border-t border-slate-200 text-center text-xs text-slate-400 bg-white">
        <p>DineHQ &copy; 2026</p>
      </footer>
    </div>
  );
}
