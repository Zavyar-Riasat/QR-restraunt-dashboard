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
import { orderService, playKitchenChime } from '../services/orderService';
import { useAuth } from '../context/AuthContext';
import { Store, Layers, Utensils, QrCode, Bell } from 'lucide-react';

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
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('dinehq_sound_enabled') !== 'false';
  });
  const [newOrderAlert, setNewOrderAlert] = useState(null);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('dinehq_sound_enabled', String(next));
      if (next) playKitchenChime();
      return next;
    });
  };

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
        // Determine which restaurant to load
        // Priority: selectedRestaurantId (manual admin switch) -> user's assigned restaurant -> default
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
        if (soundEnabled) {
          playKitchenChime();
        }
        if (order) {
          setNewOrderAlert(`🔔 New direct order #${order.id} received from ${order.customer_name}!`);
          setTimeout(() => setNewOrderAlert(null), 6000);
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
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
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
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Top Executive ROI KPI Cards */}
        <section className="no-print">
          <ExecutiveKPIs restaurant={restaurant} menuItems={menuItems} orderStats={orderStats} />
        </section>

        {/* Tab Navigation */}
        <div className="no-print flex items-center gap-1.5 border-b border-slate-200 pb-3 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'orders'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            <span>Kitchen Orders</span>
            {activeOrdersCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold font-mono animate-pulse">
                {activeOrdersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('items')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'items'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Menu Items ({menuItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'categories'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Categories ({categories.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('qr')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'qr'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR Flyer Studio</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Store & WhatsApp</span>
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
              onUpdate={handleUpdateRestaurant}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="no-print mt-auto py-6 border-t border-slate-200 text-center text-xs text-slate-500 bg-white">
        <p>DineHQ &copy; 2026. Zero-commission direct WhatsApp ordering engine for restaurants and cloud kitchens.</p>
      </footer>
    </div>
  );
}
