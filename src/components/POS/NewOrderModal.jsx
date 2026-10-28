import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Search,
  Plus,
  Minus,
  Trash2,
  UtensilsCrossed,
  ShoppingBag,
  Truck,
  PhoneCall,
  Printer,
  Send,
  Pause,
  Percent,
  Coins,
  Check,
  CheckCircle2,
  CreditCard,
  Banknote,
  Smartphone,
  AlertCircle,
  Clock,
  Layers,
  FileText,
  User,
  Phone,
  MapPin,
  ChevronRight,
  ChevronDown,
  Maximize2,
  RotateCcw,
} from 'lucide-react';
import { formatPKR } from '../../utils/currencyUtils';
import { orderService } from '../../services/orderService';
import { tableService, TABLE_STATUS } from '../../services/tableService';
import { printerService } from '../../services/printer/printerService';
import { TEMPLATE_TYPES, PRINT_TARGETS } from '../../services/printer/printerTypes';
import { validatePakistaniPhone } from '../../utils/checkoutUtils';
import DeliveryLocationPicker from '../DeliveryLocationPicker';

export default function NewOrderModal({
  isOpen,
  onClose,
  restaurant,
  categories = [],
  menuItems = [],
  orders = [],
  currentUser,
  onOrderCreated,
  initialTable = null,
  initialOrderType = 'dine_in',
  initialAppendOrderId = null,
}) {
  const [orderType, setOrderType] = useState(initialOrderType); // 'dine_in' | 'takeaway' | 'delivery' | 'phone'
  const [phoneOrderMode, setPhoneOrderMode] = useState('pickup'); // 'pickup' | 'delivery'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Cart state: [{ id, item, quantity, unitPrice, choiceDetails, notes }]
  const [cart, setCart] = useState([]);
  
  // Table selection for Dine-in
  const [selectedTable, setSelectedTable] = useState(initialTable || null);
  const [showTablePicker, setShowTablePicker] = useState(!initialTable);
  const [appendToExistingOrderId, setAppendToExistingOrderId] = useState(null);

  // Customer / Delivery info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [houseFlat, setHouseFlat] = useState('');
  const [areaLandmark, setAreaLandmark] = useState('');
  const [locationCoords, setLocationCoords] = useState(null);
  const [deliveryLocation, setDeliveryLocation] = useState({
    latitude: null,
    longitude: null,
    accuracy: null,
    formattedAddress: '',
    houseFlat: '',
    areaLandmark: '',
    deliveryNote: '',
  });
  const [orderNotes, setOrderNotes] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(
    restaurant?.delivery_mode === 'free' ? 0 : Number(restaurant?.delivery_fee ?? 150)
  );

  // Sync default deliveryFee when restaurant changes
  useEffect(() => {
    setDeliveryFee(
      restaurant?.delivery_mode === 'free' ? 0 : Number(restaurant?.delivery_fee ?? 150)
    );
  }, [restaurant?.id, restaurant?.delivery_mode, restaurant?.delivery_fee]);

  const handleDeliveryLocationChange = (newLoc) => {
    setDeliveryLocation(newLoc);
    if (newLoc.formattedAddress != null) {
      setCustomerAddress(newLoc.formattedAddress);
    }
    if (newLoc.houseFlat != null) {
      setHouseFlat(newLoc.houseFlat);
    }
    if (newLoc.areaLandmark != null) {
      setAreaLandmark(newLoc.areaLandmark);
    }
    if (newLoc.latitude != null && newLoc.longitude != null) {
      setLocationCoords({
        lat: Number(newLoc.latitude),
        lng: Number(newLoc.longitude),
      });
    } else {
      setLocationCoords(null);
    }
  };

  // Discounts
  const [discountType, setDiscountType] = useState('fixed'); // 'fixed' | 'percent'
  const [discountValue, setDiscountValue] = useState('');

  // Payment Method
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'card' | 'jazzcash' | 'easypaisa'

  // Item customization modal
  const [customizingItem, setCustomizingItem] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [itemNote, setItemNote] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const searchInputRef = useRef(null);

  // Real-time table states
  const tables = useMemo(() => {
    return tableService.getTablesWithLiveStatus(restaurant?.id || 'rest-101', orders);
  }, [restaurant?.id, orders]);

  // Sync initial table / append order if passed and auto-detect open tab
  useEffect(() => {
    if (!isOpen) return;

    if (initialAppendOrderId) {
      setAppendToExistingOrderId(initialAppendOrderId);
      const existing = orders.find((o) => o.id === initialAppendOrderId);
      if (existing) {
        if (existing.order_type) setOrderType(existing.order_type);
        const existingTblNum = existing.table_number || existing.table;
        if (existingTblNum) {
          const matchingTable = tables.find(
            (t) => String(t.table_number) === String(existingTblNum)
          );
          setSelectedTable(matchingTable || { table_number: existingTblNum });
          setShowTablePicker(false);
        } else {
          setSelectedTable(null);
          setShowTablePicker(false);
        }
        if (existing.customer_name) setCustomerName(existing.customer_name);
        if (existing.customer_phone) setCustomerPhone(existing.customer_phone);
        if (existing.customer_address) setCustomerAddress(existing.customer_address);
      }
    } else if (initialTable) {
      setSelectedTable(initialTable);
      setShowTablePicker(false);
      setOrderType('dine_in');

      const matchingTable = tables.find(
        (t) => String(t.table_number) === String(initialTable.table_number)
      );
      const active =
        matchingTable?.activeOrder ||
        initialTable.activeOrder ||
        orders.find(
          (o) =>
            String(o.table_number || o.table || '').replace(/^Table\s*/i, '').trim() ===
              String(initialTable.table_number).trim() &&
            !['completed', 'cancelled', 'rejected'].includes(o.status)
        );

      if (active) {
        setAppendToExistingOrderId(active.id);
      } else {
        setAppendToExistingOrderId(null);
      }
    } else {
      setSelectedTable(null);
      setShowTablePicker(initialOrderType === 'dine_in');
      setOrderType(initialOrderType || 'dine_in');
      setAppendToExistingOrderId(null);
    }
  }, [isOpen, initialAppendOrderId, initialTable, initialOrderType, tables, orders]);

  // Lookup existing active order for running tab details
  const activeExistingOrder = useMemo(() => {
    if (!appendToExistingOrderId) return null;
    return orders.find((o) => o.id === appendToExistingOrderId) || null;
  }, [appendToExistingOrderId, orders]);

  // Keyboard shortcut: "/" to focus search, "Escape" to exit
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        if (customizingItem) {
          setCustomizingItem(null);
        } else if (mobileCartOpen) {
          setMobileCartOpen(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, customizingItem, mobileCartOpen, onClose]);

  // Filtered menu items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchCat =
        selectedCategory === 'all' || item.category_id === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query));
      return matchCat && matchSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // Handle clicking an item from the menu catalog
  const handleItemClick = (item) => {
    const hasOptions = Array.isArray(item.variants?.options) && item.variants.options.length > 0;
    if (hasOptions) {
      // Open customization sheet
      setCustomizingItem(item);
      const defaults = {};
      item.variants.options.forEach((group) => {
        if (group.type === 'single' && group.options?.[0]) {
          defaults[group.id] = group.options[0].id;
        } else {
          defaults[group.id] = [];
        }
      });
      setSelectedOptions(defaults);
      setItemNote('');
    } else {
      // Add directly to cart
      addItemToCart(item, 1, [], item.price, '');
    }
  };

  // Add item to cart state
  const addItemToCart = (item, quantity, choiceDetails, finalUnitPrice, notes = '') => {
    const cartItemId = `${item.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setCart((prev) => [
      ...prev,
      {
        id: cartItemId,
        item,
        title: item.title,
        quantity,
        unitPrice: finalUnitPrice,
        choiceDetails,
        notes: notes.trim(),
      },
    ]);
  };

  // Confirm custom item choices
  const handleConfirmCustomItem = () => {
    if (!customizingItem) return;

    let delta = 0;
    const choiceDetails = [];

    customizingItem.variants?.options?.forEach((group) => {
      const selected = selectedOptions[group.id];
      if (group.type === 'single') {
        const opt = group.options?.find((o) => o.id === selected);
        if (opt) {
          delta += Number(opt.price_delta) || 0;
          choiceDetails.push(`${group.name}: ${opt.name}`);
        }
      } else if (Array.isArray(selected)) {
        selected.forEach((optId) => {
          const opt = group.options?.find((o) => o.id === optId);
          if (opt) {
            delta += Number(opt.price_delta) || 0;
            choiceDetails.push(`${opt.name} (+${formatPKR(opt.price_delta)})`);
          }
        });
      }
    });

    const finalUnitPrice = (Number(customizingItem.price) || 0) + delta;
    addItemToCart(customizingItem, 1, choiceDetails, finalUnitPrice, itemNote);
    setCustomizingItem(null);
  };

  // Cart operations
  const updateQuantity = (cartItemId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCart((prev) =>
      prev.map((c) => (c.id === cartItemId ? { ...c, quantity: newQty } : c))
    );
  };

  const removeFromCart = (cartItemId) => {
    setCart((prev) => prev.filter((c) => c.id !== cartItemId));
  };

  const updateItemNote = (cartItemId, note) => {
    setCart((prev) =>
      prev.map((c) => (c.id === cartItemId ? { ...c, notes: note } : c))
    );
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    const val = Number(discountValue) || 0;
    if (val <= 0) return 0;
    if (discountType === 'percent') {
      return Math.round((subtotal * Math.min(val, 100)) / 100);
    }
    return Math.min(val, subtotal);
  }, [subtotal, discountValue, discountType]);

  const isDeliveryActive = orderType === 'delivery' || (orderType === 'phone' && phoneOrderMode === 'delivery');
  const activeDeliveryFee = isDeliveryActive ? Number(deliveryFee) || 0 : 0;
  const newItemsGrandTotal = Math.max(0, subtotal - discountAmount + activeDeliveryFee);

  const existingTabTotal = useMemo(() => {
    if (!appendToExistingOrderId || !activeExistingOrder) return 0;
    return Number(activeExistingOrder.total_payable || activeExistingOrder.subtotal || 0);
  }, [appendToExistingOrderId, activeExistingOrder]);

  const grandTotal = newItemsGrandTotal + existingTabTotal;

  const changeDue = 0;

  // Handle table selection click
  const handleSelectTable = (tbl) => {
    setSelectedTable(tbl);
    setShowTablePicker(false);

    // If table has an active order, automatically append items to it
    const active =
      tbl.activeOrder ||
      orders.find(
        (o) =>
          String(o.table_number || o.table || '').replace(/^Table\s*/i, '').trim() ===
            String(tbl.table_number).trim() &&
          !['completed', 'cancelled', 'rejected'].includes(o.status)
      );

    if (active) {
      setAppendToExistingOrderId(active.id);
      if (active.customer_name && !customerName) setCustomerName(active.customer_name);
      if (active.customer_phone && !customerPhone) setCustomerPhone(active.customer_phone);
    } else {
      setAppendToExistingOrderId(null);
    }
  };

  // Reset order form
  const handleResetForm = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setHouseFlat('');
    setAreaLandmark('');
    setLocationCoords(null);
    setDeliveryLocation({
      latitude: null,
      longitude: null,
      accuracy: null,
      formattedAddress: '',
      houseFlat: '',
      areaLandmark: '',
      deliveryNote: '',
    });
    setOrderNotes('');
    setDiscountValue('');
    setAppendToExistingOrderId(null);
    setSelectedTable(null);
    setShowTablePicker(true);
    setErrorMsg(null);
  };

  // Save and dispatch order
  const handleProcessOrder = async (actionType = 'kitchen') => {
    // actionType: 'kitchen' | 'kitchen_bill' | 'hold'
    if (cart.length === 0) {
      setErrorMsg('Please add at least one item to the order.');
      return;
    }

    if (orderType === 'dine_in' && !selectedTable) {
      setErrorMsg('Please select a table for Dine-in.');
      return;
    }

    if (orderType === 'delivery') {
      if (!customerName.trim()) {
        setErrorMsg('Customer name is required for delivery.');
        return;
      }
      if (!customerPhone.trim()) {
        setErrorMsg('Customer phone is required for delivery.');
        return;
      }
      const finalAddress = (
        deliveryLocation.formattedAddress ||
        [deliveryLocation.houseFlat, deliveryLocation.areaLandmark].filter(Boolean).join(', ') ||
        customerAddress
      ).trim();
      if (!finalAddress) {
        setErrorMsg('Delivery address is required. Please type your address or nearest landmark.');
        return;
      }
    }

    if (orderType === 'phone') {
      if (!customerPhone.trim()) {
        setErrorMsg('Customer phone number is required for phone orders.');
        return;
      }
      if (phoneOrderMode === 'delivery') {
        if (!customerName.trim()) {
          setErrorMsg('Customer name is required for phone delivery.');
          return;
        }
        const finalAddress = (
          deliveryLocation.formattedAddress ||
          [deliveryLocation.houseFlat, deliveryLocation.areaLandmark].filter(Boolean).join(', ') ||
          customerAddress
        ).trim();
        if (!finalAddress) {
          setErrorMsg('Delivery address is required for phone delivery.');
          return;
        }
      }
    }



    setErrorMsg(null);
    setSubmitting(true);

    try {
      const restId = restaurant?.id || 'rest-101';
      const staffName = currentUser?.name || currentUser?.email || 'Store Manager';

      // 1. If appending to an existing order tab
      if (appendToExistingOrderId) {
        const appendRes = orderService.appendItemsToOrder(
          restId,
          appendToExistingOrderId,
          cart
        );

        // Auto print KOT for the new round of items
        if (actionType !== 'hold') {
          try {
            await printerService.print(
              {
                order: {
                  ...appendRes.updatedOrder,
                  items: appendRes.newlyAddedItems, // Only send new items to kitchen
                  customer_notes: `[ROUND 2 TAB ADDITION] ${appendRes.updatedOrder.customer_notes || ''}`.trim(),
                },
                restaurant,
                templateType: TEMPLATE_TYPES.KOT,
              },
              { printType: PRINT_TARGETS.KOT }
            );

            // Single consolidated bill of the entire table order
            if (actionType === 'kitchen_bill') {
              await printerService.print(
                {
                  order: appendRes.updatedOrder,
                  restaurant,
                  templateType: TEMPLATE_TYPES.BILL,
                },
                { printType: PRINT_TARGETS.BILL }
              );
            }
          } catch (pErr) {
            console.warn('Printer dispatch notice:', pErr);
          }
        }

        if (onOrderCreated) onOrderCreated(appendRes.updatedOrder);
        handleResetForm();
        onClose();
        return;
      }

      // 2. Creating a brand new in-store order
      const initialStatus = actionType === 'hold' ? 'held' : 'new';
      const effectiveAmountReceived = grandTotal;
      const calculatedPaymentStatus = 'paid';

      const isDeliveryOrder = orderType === 'delivery' || (orderType === 'phone' && phoneOrderMode === 'delivery');
      const resolvedOrderType = orderType === 'phone'
        ? (phoneOrderMode === 'delivery' ? 'delivery' : 'takeaway')
        : orderType;
      const orderSourceName = orderType === 'phone'
        ? (phoneOrderMode === 'delivery' ? 'phone_delivery' : 'phone_pickup')
        : 'manager';

      const finalDeliveryAddress = (
        deliveryLocation.formattedAddress ||
        [deliveryLocation.houseFlat, deliveryLocation.areaLandmark].filter(Boolean).join(', ') ||
        customerAddress
      ).trim();
      const finalLat = deliveryLocation.latitude != null ? Number(deliveryLocation.latitude) : (locationCoords?.lat || null);
      const finalLng = deliveryLocation.longitude != null ? Number(deliveryLocation.longitude) : (locationCoords?.lng || null);

      const newOrder = await orderService.createOrder({
        restaurant,
        customerDetails: {
          isManagerOrder: true,
          order_source: orderSourceName,
          phone_order_mode: orderType === 'phone' ? phoneOrderMode : null,
          staff_name: staffName,
          orderType: resolvedOrderType,
          tableNumber: selectedTable?.table_number || null,
          name: customerName || (selectedTable ? `Table ${selectedTable.table_number}` : (orderType === 'phone' ? (phoneOrderMode === 'delivery' ? 'Phone Delivery' : 'Phone Pickup') : 'Walk-in Customer')),
          phone: customerPhone,
          address: isDeliveryOrder ? finalDeliveryAddress : '',
          houseFlat: isDeliveryOrder ? (deliveryLocation.houseFlat || houseFlat) : '',
          areaLandmark: isDeliveryOrder ? (deliveryLocation.areaLandmark || areaLandmark) : '',
          latitude: isDeliveryOrder ? finalLat : null,
          longitude: isDeliveryOrder ? finalLng : null,
          accuracy: isDeliveryOrder ? deliveryLocation.accuracy : null,
          locationCoords: isDeliveryOrder && finalLat != null && finalLng != null ? { lat: finalLat, lng: finalLng } : null,
          deliveryNotes: isDeliveryOrder ? (deliveryLocation.deliveryNote || orderNotes) : orderNotes,
          notes: deliveryLocation.deliveryNote ? `${orderNotes ? orderNotes + ' • ' : ''}${deliveryLocation.deliveryNote}` : orderNotes,
          paymentMethod: paymentMethod === 'cash' ? 'Cash at Counter' : paymentMethod,
          payment_status: calculatedPaymentStatus,
          discount: discountAmount,
          discount_type: discountType,
          amount_received: effectiveAmountReceived,
          add_remaining_to_khata: false,
          change_due: changeDue,
          status: initialStatus,
        },
        cart,
        subtotal,
        deliveryFee: activeDeliveryFee,
        finalTotal: grandTotal,
      });

      // 3. Print Kitchen Order Ticket (KOT)
      if (actionType === 'kitchen' || actionType === 'kitchen_bill') {
        try {
          await printerService.print(
            {
              order: newOrder,
              restaurant,
              templateType: TEMPLATE_TYPES.KOT,
            },
            { printType: PRINT_TARGETS.KOT }
          );
        } catch (pErr) {
          console.warn('KOT Print notice:', pErr);
        }
      }

      // 4. Print Customer Bill if requested
      if (actionType === 'kitchen_bill') {
        try {
          await printerService.print(
            {
              order: newOrder,
              restaurant,
              templateType: TEMPLATE_TYPES.BILL,
            },
            { printType: PRINT_TARGETS.BILL }
          );
        } catch (bErr) {
          console.warn('Bill Print notice:', bErr);
        }
      }

      if (onOrderCreated) onOrderCreated(newOrder);
      handleResetForm();
      onClose();
    } catch (err) {
      console.error('Order creation error:', err);
      setErrorMsg(err.message || 'Failed to submit order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-3 md:p-4 overflow-hidden animate-fadeIn">
      {/* POS Modal Container */}
      <div className="w-full h-full sm:h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-2rem)] sm:max-w-7xl bg-[#FFF9F2] sm:rounded-3xl border border-[#F0E4D7] shadow-2xl flex flex-col min-h-0 overflow-hidden">
        
        {/* ========================================================
            TOP BAR: Brand, Staff Attribution, Order Types, Close
            ======================================================== */}
        <header className="bg-white px-4 sm:px-6 py-3 border-b border-[#F0E4D7] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#F26B1D] to-[#F5A623] flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <UtensilsCrossed className="w-5 h-5 font-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading font-black text-base sm:text-lg text-[#2B2118]">
                  + New Order (POS)
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-orange-100 text-[#F26B1D] text-[10px] font-bold">
                  In-Store Register
                </span>
              </div>
              <div className="text-[11px] text-[#7A6A5C] flex items-center gap-2">
                <span>Staff: <strong className="text-[#2B2118]">{currentUser?.name || currentUser?.email || 'Manager'}</strong></span>
                <span className="hidden md:inline text-slate-300">•</span>
                <span className="hidden md:inline font-mono text-[10px] text-slate-400">
                  Shortcuts: <kbd className="bg-slate-100 px-1 py-0.5 rounded border border-slate-200">/</kbd> search • <kbd className="bg-slate-100 px-1 py-0.5 rounded border border-slate-200">Esc</kbd> exit
                </span>
              </div>
            </div>
          </div>

          {/* Order Type Switcher Tabs */}
          <div className="hidden lg:flex items-center bg-[#FFF9F2] p-1 rounded-2xl border border-[#F0E4D7] gap-1">
            <button
              type="button"
              onClick={() => { setOrderType('dine_in'); setShowTablePicker(true); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                orderType === 'dine_in'
                  ? 'bg-[#F26B1D] text-white shadow-xs'
                  : 'text-[#7A6A5C] hover:text-[#2B2118]'
              }`}
            >
              <span>🍽️</span>
              <span>Dine-In</span>
              {selectedTable && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                  T{selectedTable.table_number}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setOrderType('takeaway')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                orderType === 'takeaway'
                  ? 'bg-[#F26B1D] text-white shadow-xs'
                  : 'text-[#7A6A5C] hover:text-[#2B2118]'
              }`}
            >
              <span>🛍️</span>
              <span>Takeaway</span>
            </button>

            <button
              type="button"
              onClick={() => setOrderType('delivery')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                orderType === 'delivery'
                  ? 'bg-[#F26B1D] text-white shadow-xs'
                  : 'text-[#7A6A5C] hover:text-[#2B2118]'
              }`}
            >
              <span>🛵</span>
              <span>Delivery</span>
            </button>

            <button
              type="button"
              onClick={() => setOrderType('phone')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                orderType === 'phone'
                  ? 'bg-[#F26B1D] text-white shadow-xs'
                  : 'text-[#7A6A5C] hover:text-[#2B2118]'
              }`}
            >
              <span>📞</span>
              <span>Phone Order</span>
            </button>
          </div>

          {/* Close Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer"
              title="Close POS (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Mobile Order Type Bar */}
        <div className="lg:hidden bg-white px-3 py-2 border-b border-[#F0E4D7] flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {[
            { id: 'dine_in', label: 'Dine-In', icon: '🍽️' },
            { id: 'takeaway', label: 'Takeaway', icon: '🛍️' },
            { id: 'delivery', label: 'Delivery', icon: '🛵' },
            { id: 'phone', label: 'Phone', icon: '📞' },
          ].map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => {
                setOrderType(type.id);
                if (type.id === 'dine_in') setShowTablePicker(true);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition cursor-pointer ${
                orderType === type.id
                  ? 'bg-[#F26B1D] text-white shadow-xs'
                  : 'bg-[#FFF9F2] text-[#7A6A5C] border border-[#F0E4D7]'
              }`}
            >
              <span>{type.icon}</span>
              <span>{type.label}</span>
              {type.id === 'dine_in' && selectedTable && (
                <span className="ml-0.5 px-1 rounded-full bg-white/20 text-[10px]">
                  T{selectedTable.table_number}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ========================================================
            MAIN BODY: Left Menu Catalog + Right Order Cart Panel
            ======================================================== */}
        <div className="flex-1 flex min-h-0 overflow-hidden relative">

          {/* LEFT COLUMN: Search, Categories, Menu Items Grid */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#FFF9F2]">
            
            {/* Search & Category Filter Header */}
            <div className="p-3 sm:p-4 bg-white border-b border-[#F0E4D7] shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#9E8E81] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search menu dishes (Press '/' to focus)..."
                    className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-xs sm:text-sm text-[#2B2118] placeholder-[#9E8E81] focus:outline-none focus:ring-2 focus:ring-[#F26B1D]/20 focus:border-[#F26B1D]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Dropdown (Replacing horizontal subcategories chips) */}
                <div className="relative shrink-0">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 pr-8 rounded-xl bg-[#FFF9F2] hover:bg-[#FFF1E6] border border-[#F0E4D7] text-xs font-bold text-[#2B2118] focus:outline-none focus:border-[#F26B1D] cursor-pointer appearance-none shadow-2xs transition"
                    title="Select dish category"
                  >
                    <option value="all">All Dishes ({menuItems.length})</option>
                    {categories.map((cat) => {
                      const count = menuItems.filter((i) => i.category_id === cat.id).length;
                      return (
                        <option key={cat.id} value={cat.id}>
                          {cat.name} ({count})
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[#7A6A5C] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {orderType === 'dine_in' && (
                  <button
                    type="button"
                    onClick={() => setShowTablePicker((prev) => !prev)}
                    className="px-3 py-2 rounded-xl bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-2xs"
                  >
                    <span>🍽️</span>
                    <span>{selectedTable ? `Table ${selectedTable.table_number}` : 'Select Table'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* DINE-IN TABLE SELECTION BANNER / OVERLAY (When showTablePicker is true) */}
            {orderType === 'dine_in' && showTablePicker && (
              <div className="p-4 bg-purple-50/90 border-b border-purple-200 backdrop-blur-xs animate-fadeIn shrink-0">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-black text-xs sm:text-sm text-purple-950 uppercase tracking-tight">
                      Select Table for Dining
                    </span>
                    <span className="text-[10px] text-purple-700">
                      (🟢 Free • 🔴 Occupied • 🟡 Bill Pending)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTablePicker(false)}
                    className="text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-100 hover:bg-purple-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer"
                  >
                    <span>{selectedTable ? 'Done' : 'Close'}</span>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-36 overflow-y-auto pr-1">
                  {tables.map((tbl) => {
                    const isSelected = selectedTable?.table_number === tbl.table_number;
                    const isOccupied = tbl.status === TABLE_STATUS.OCCUPIED;
                    const isPending = tbl.status === TABLE_STATUS.BILL_PENDING;

                    return (
                      <button
                        key={tbl.id}
                        type="button"
                        onClick={() => handleSelectTable(tbl)}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer relative ${
                          isSelected
                            ? 'bg-purple-900 text-white border-purple-900 shadow-md ring-2 ring-purple-400'
                            : isOccupied
                            ? 'bg-red-50 text-red-950 border-red-200 hover:bg-red-100'
                            : isPending
                            ? 'bg-amber-50 text-amber-950 border-amber-200 hover:bg-amber-100'
                            : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-black text-xs">T{tbl.table_number}</span>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isOccupied
                                ? 'bg-red-500 animate-pulse'
                                : isPending
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                        </div>
                        <div className="text-[10px] font-medium opacity-80 mt-1 truncate">
                          {tbl.name}
                        </div>
                        <div className="text-[9px] opacity-70 font-mono mt-0.5">
                          {tbl.capacity} seats
                        </div>
                        {isOccupied && (
                          <span className="text-[8px] font-bold text-red-600 bg-red-100 px-1 rounded mt-1 text-center">
                            Open Tab
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Menu Items Grid */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
              {filteredMenuItems.length === 0 ? (
                <div className="text-center py-16 text-[#9E8E81]">
                  <UtensilsCrossed className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p className="font-bold text-sm text-[#2B2118]">No dishes found</p>
                  <p className="text-xs text-[#7A6A5C] mt-0.5">Try searching for something else or pick another category.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredMenuItems.map((item) => {
                    const hasChoices = Array.isArray(item.variants?.options) && item.variants.options.length > 0;
                    const imageUrl = item.variants?.image_url;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleItemClick(item)}
                        className="p-3 rounded-2xl bg-white border border-[#F0E4D7] hover:border-[#F26B1D] hover:shadow-md transition text-left flex flex-col justify-between group cursor-pointer active:scale-98"
                      >
                        {/* Item Image / Fallback Thumbnail */}
                        <div className="relative w-full h-24 sm:h-28 rounded-xl overflow-hidden bg-slate-100 mb-2.5">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <UtensilsCrossed className="w-8 h-8" />
                            </div>
                          )}

                          {hasChoices && (
                            <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-white text-[9px] font-bold">
                              Options
                            </span>
                          )}

                          {item.variants?.is_deal && (
                            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-[#E5484D] text-white text-[9px] font-black uppercase tracking-wider">
                              Deal
                            </span>
                          )}
                        </div>

                        <div>
                          <h3 className="font-heading font-black text-xs sm:text-sm text-[#2B2118] line-clamp-1 group-hover:text-[#F26B1D] transition">
                            {item.title}
                          </h3>
                          {item.description && (
                            <p className="text-[11px] text-[#7A6A5C] line-clamp-1 mt-0.5">
                              {item.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#F0E4D7]/70">
                          <span className="font-mono font-black text-xs sm:text-sm text-[#2B2118]">
                            {formatPKR(item.price)}
                          </span>
                          <span className="w-6 h-6 rounded-lg bg-[#FFF9F2] group-hover:bg-[#F26B1D] group-hover:text-white text-[#F26B1D] flex items-center justify-center transition shadow-2xs">
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ========================================================
              RIGHT COLUMN: Order Cart & Checkout Panel (Desktop)
              ======================================================== */}
          <div
            className={`w-full lg:w-[410px] xl:w-[440px] bg-white border-l border-[#F0E4D7] flex flex-col min-h-0 shrink-0 transition-transform lg:translate-x-0 ${
              mobileCartOpen
                ? 'fixed inset-0 z-50 translate-x-0'
                : 'hidden lg:flex'
            }`}
          >
            {/* Cart Panel Header */}
            <div className="p-3.5 bg-white border-b border-[#F0E4D7] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#F26B1D]" />
                <h2 className="font-heading font-black text-sm text-[#2B2118]">
                  Current Order
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#FFF9F2] text-[#F26B1D] border border-[#F0E4D7] text-xs font-mono font-bold">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)} items
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="text-[11px] font-bold text-slate-400 hover:text-red-600 transition px-2 py-1 rounded cursor-pointer"
                    title="Clear current order"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMobileCartOpen(false)}
                  className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Existing Tab Append Notice Banner */}
            {appendToExistingOrderId && (
              <div className="p-2.5 bg-purple-50 text-purple-900 border-b border-purple-200 text-xs flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse shrink-0" />
                  <div>
                    <div className="font-extrabold flex items-center gap-1.5">
                      <span>{activeExistingOrder?.table ? `Merging with Table ${activeExistingOrder.table} Running Tab` : `Adding Dishes to Order #${appendToExistingOrderId}`}</span>
                      <span className="font-mono bg-purple-200 text-purple-900 px-1.5 py-0.2 rounded text-[10px] font-bold">
                        #{appendToExistingOrderId}
                      </span>
                    </div>
                    {activeExistingOrder && (
                      <div className="text-[11px] text-purple-700">
                        Current Bill: <span className="font-mono font-bold">{formatPKR(activeExistingOrder.total_payable || activeExistingOrder.subtotal)}</span> • {activeExistingOrder.items?.length || 0} items already on bill
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAppendToExistingOrderId(null)}
                  className="px-2 py-1 rounded bg-white text-purple-800 hover:bg-purple-100 border border-purple-200 text-[10px] font-bold cursor-pointer shrink-0"
                >
                  New tab instead
                </button>
              </div>
            )}

            {/* Error Message Alert */}
            {errorMsg && (
              <div className="p-2.5 bg-red-50 border-b border-red-200 text-red-700 text-xs font-bold flex items-center gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span className="flex-1">{errorMsg}</span>
                <button type="button" onClick={() => setErrorMsg(null)}>
                  <X className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            )}

            {/* Middle Scrollable Body: Table/Customer, Cart Items, Notes, Discount, Payment Details */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">

              {/* Order Type Specific Fields (Customer, Phone, Table, Address) */}
              <div className="p-2.5 bg-[#FFF9F2]/70 rounded-2xl border border-[#F0E4D7] space-y-2 text-xs">
                {orderType === 'dine_in' ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-[#F0E4D7]">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🍽️</span>
                        <div>
                          <div className="font-bold text-[#2B2118]">
                            {selectedTable ? `Table #${selectedTable.table_number} (${selectedTable.name})` : 'No table selected'}
                          </div>
                          <div className="text-[10px] text-[#7A6A5C]">
                            {selectedTable ? `${selectedTable.section} • Capacity ${selectedTable.capacity}` : 'Tap to assign a dining table'}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowTablePicker(true)}
                        className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold hover:bg-purple-100 transition cursor-pointer"
                      >
                        {selectedTable ? 'Change' : 'Pick Table'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Customer Name (optional)"
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-[#F0E4D7] text-xs text-[#2B2118] placeholder-[#9E8E81] focus:outline-none focus:border-[#F26B1D]"
                      />
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Phone (optional)"
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-[#F0E4D7] text-xs text-[#2B2118] placeholder-[#9E8E81] focus:outline-none focus:border-[#F26B1D] font-mono"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Phone Order Mode Selector (Pickup vs Delivery) */}
                    {orderType === 'phone' && (
                      <div className="p-1 rounded-xl bg-white border border-[#F0E4D7] flex items-center gap-1 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setPhoneOrderMode('pickup')}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            phoneOrderMode === 'pickup'
                              ? 'bg-[#2B2118] text-white shadow-2xs'
                              : 'text-[#7A6A5C] hover:bg-[#FFF9F2]'
                          }`}
                        >
                          <span>🛍️</span>
                          <span>Phone Pickup (Counter)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPhoneOrderMode('delivery')}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            phoneOrderMode === 'delivery'
                              ? 'bg-[#F26B1D] text-white shadow-2xs'
                              : 'text-[#7A6A5C] hover:bg-[#FFF9F2]'
                          }`}
                        >
                          <span>🛵</span>
                          <span>Phone Delivery (Rider)</span>
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder={
                          orderType === 'delivery' || (orderType === 'phone' && phoneOrderMode === 'delivery')
                            ? 'Customer Name *'
                            : 'Customer Name (optional)'
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-[#F0E4D7] text-xs text-[#2B2118] placeholder-[#9E8E81] focus:outline-none focus:border-[#F26B1D]"
                      />
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder={
                          orderType === 'delivery' || orderType === 'phone'
                            ? 'Phone (03xx-xxxxxxx) *'
                            : 'Phone (optional)'
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-[#F0E4D7] text-xs text-[#2B2118] placeholder-[#9E8E81] focus:outline-none focus:border-[#F26B1D] font-mono"
                      />
                    </div>

                    {/* Delivery Address & Map Picker */}
                    {isDeliveryActive && (
                      <div className="pt-2 border-t border-[#F0E4D7]">
                        <DeliveryLocationPicker
                          locationData={deliveryLocation}
                          onChange={handleDeliveryLocationChange}
                          primaryColor="#F26B1D"
                          restaurant={restaurant}
                        />
                      </div>
                    )}

                    {orderType === 'phone' && phoneOrderMode === 'pickup' && (
                      <div className="p-2 rounded-xl bg-teal-50 border border-teal-200 text-[11px] text-teal-900 flex items-center gap-1.5 font-medium">
                        <span>🛍️</span>
                        <span>Customer will collect order at counter. No delivery fee or rider needed.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Cart Items List */}
              <div className="space-y-2">
                {/* Running Bill / Tab Section */}
                {appendToExistingOrderId && activeExistingOrder && (
                  <div className="rounded-2xl border-2 border-purple-200 bg-purple-50/70 p-3 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-purple-200/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse shrink-0" />
                        <div>
                          <div className="font-heading font-black text-xs text-purple-950 flex items-center gap-1.5">
                            <span>{activeExistingOrder.table ? `Table #${activeExistingOrder.table} Running Bill (Active)` : `Order #${activeExistingOrder.id} Running Bill`}</span>
                            <span className="font-mono text-[10px] font-bold bg-purple-200 text-purple-900 px-1.5 py-0.5 rounded">
                              Current Tab
                            </span>
                          </div>
                          <div className="text-[10px] text-purple-700">
                            Already ordered & in kitchen / served
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-black text-xs text-purple-950">
                          {formatPKR(existingTabTotal)}
                        </div>
                        <div className="text-[9px] text-purple-600 font-bold">
                          {activeExistingOrder.items?.length || 0} items on bill
                        </div>
                      </div>
                    </div>

                    {/* Running Tab Items List */}
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {activeExistingOrder.items?.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-start justify-between gap-2 p-1.5 rounded-lg bg-white/80 border border-purple-100 text-xs"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-[#2B2118] truncate flex items-center gap-1.5">
                              <span className="font-mono text-[11px] font-black text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded">
                                {item.quantity}×
                              </span>
                              <span className="truncate">{item.title}</span>
                            </div>
                            {item.choices?.length > 0 && (
                              <div className="text-[10px] text-[#7A6A5C] truncate pl-6">
                                {Array.isArray(item.choices) ? item.choices.join(', ') : item.choices}
                              </div>
                            )}
                            {item.notes && (
                              <div className="text-[10px] text-amber-700 italic truncate pl-6">
                                Note: {item.notes}
                              </div>
                            )}
                          </div>
                          <span className="font-mono font-bold text-xs text-[#2B2118] shrink-0">
                            {formatPKR((Number(item.unitPrice) || 0) * (Number(item.quantity) || 1))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section Header for New Items */}
                <div className="flex items-center justify-between text-xs font-bold text-[#2B2118] pt-1">
                  <span>
                    {appendToExistingOrderId ? '➕ New Dishes to Add to Tab:' : 'Order Items:'}
                  </span>
                  <span className="font-mono text-[11px] text-[#7A6A5C]">
                    {cart.reduce((sum, i) => sum + i.quantity, 0)} new {cart.reduce((sum, i) => sum + i.quantity, 0) === 1 ? 'dish' : 'dishes'}
                  </span>
                </div>

                {cart.length === 0 ? (
                  <div className="text-center py-6 text-[#9E8E81] bg-[#FFF9F2] rounded-xl border border-dashed border-[#F0E4D7]">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-1.5 opacity-30 text-[#F26B1D]" />
                    <p className="font-bold text-xs text-[#2B2118]">
                      {appendToExistingOrderId ? 'No new dishes selected' : 'Order is empty'}
                    </p>
                    <p className="text-[11px] text-[#7A6A5C] mt-0.5">
                      {appendToExistingOrderId
                        ? 'Tap dishes on the left to add them to this table\'s bill.'
                        : 'Tap dishes on the menu to add them here.'}
                    </p>
                  </div>
                ) : (
                  cart.map((cartItem) => (
                    <div
                      key={cartItem.id}
                      className="p-2.5 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-1.5 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-xs text-[#2B2118] truncate">
                            {cartItem.title}
                          </div>
                          {cartItem.choiceDetails?.length > 0 && (
                            <div className="text-[10px] text-[#7A6A5C] space-y-0.5 mt-0.5">
                              {cartItem.choiceDetails.map((choice, i) => (
                                <div key={i} className="truncate">↳ {choice}</div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-xs text-[#2B2118]">
                            {formatPKR(cartItem.unitPrice * cartItem.quantity)}
                          </span>
                          <div className="text-[10px] text-[#9E8E81] font-mono">
                            {cartItem.quantity} × {formatPKR(cartItem.unitPrice)}
                          </div>
                        </div>
                      </div>

                      {/* Stepper + Item Note + Remove */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#F0E4D7]/70">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={cartItem.notes || ''}
                            onChange={(e) => updateItemNote(cartItem.id, e.target.value)}
                            placeholder="Item note (e.g. no onions)..."
                            className="px-2 py-0.5 rounded bg-white border border-[#F0E4D7] text-[10px] text-[#2B2118] placeholder-[#9E8E81] w-32 sm:w-40 focus:outline-none focus:border-[#F26B1D]"
                          />
                        </div>

                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center border border-[#F0E4D7] rounded-lg bg-white overflow-hidden shadow-2xs">
                            <button
                              type="button"
                              onClick={() => updateQuantity(cartItem.id, cartItem.quantity - 1)}
                              className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-7 text-center font-mono font-bold text-xs text-[#2B2118]">
                              {cartItem.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(cartItem.id, cartItem.quantity + 1)}
                              className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFromCart(cartItem.id)}
                            className="w-6 h-6 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Order Notes / Kitchen Instructions */}
              <div>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Order special note / kitchen instructions..."
                  className="w-full px-2.5 py-1.5 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-xs text-[#2B2118] placeholder-[#9E8E81] focus:outline-none focus:border-[#F26B1D]"
                />
              </div>

              {/* Discount & Delivery Fee Row */}
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  {/* Discount */}
                  <div className="flex items-center gap-1 bg-[#FFF9F2] p-1.5 rounded-xl border border-[#F0E4D7]">
                    <span className="text-[11px] font-bold text-[#7A6A5C] shrink-0">Discount:</span>
                    <input
                      type="number"
                      min="0"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder="0"
                      className="w-14 px-1.5 py-0.5 rounded bg-white border border-[#F0E4D7] text-xs text-center font-mono focus:outline-none"
                    />
                    <div className="flex rounded border border-[#F0E4D7] overflow-hidden shrink-0">
                      <button
                        type="button"
                        onClick={() => setDiscountType('fixed')}
                        className={`px-1.5 py-0.5 text-[10px] font-bold ${
                          discountType === 'fixed' ? 'bg-[#F26B1D] text-white' : 'bg-white text-slate-600'
                        }`}
                      >
                        Rs.
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType('percent')}
                        className={`px-1.5 py-0.5 text-[10px] font-bold ${
                          discountType === 'percent' ? 'bg-[#F26B1D] text-white' : 'bg-white text-slate-600'
                        }`}
                      >
                        %
                      </button>
                    </div>
                  </div>

                  {/* Delivery Fee Input */}
                  {isDeliveryActive ? (
                    <div className="flex items-center gap-1 bg-[#FFF9F2] p-1.5 rounded-xl border border-[#F0E4D7]">
                      <span className="text-[11px] font-bold text-[#7A6A5C] shrink-0">Delivery:</span>
                      <input
                        type="number"
                        min="0"
                        value={deliveryFee}
                        onChange={(e) => setDeliveryFee(e.target.value)}
                        className="w-full px-1.5 py-0.5 rounded bg-white border border-[#F0E4D7] text-xs font-mono text-center focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-2 text-[11px] text-[#7A6A5C]">
                      <span>Order Type:</span>
                      <span className="font-bold text-[#2B2118] uppercase">
                        {orderType === 'phone' ? (phoneOrderMode === 'pickup' ? 'Phone Pickup' : 'Phone Delivery') : orderType}
                      </span>
                    </div>
                  )}
                </div>

                {/* Delivery Quick Adjust Presets */}
                {isDeliveryActive && (
                  <div className="flex items-center gap-1.5 bg-[#FFF9F2] p-1.5 rounded-xl border border-[#F0E4D7]">
                    <span className="text-[10px] font-bold text-[#7A6A5C] shrink-0">Adjust Fee:</span>
                    <div className="flex items-center gap-1 flex-1 overflow-x-auto">
                      {[
                        { label: 'Free', val: 0 },
                        { label: 'Rs. 100', val: 100 },
                        { label: 'Rs. 150', val: 150 },
                        { label: 'Rs. 200', val: 200 },
                        { label: 'Rs. 250', val: 250 },
                      ].map((preset) => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => setDeliveryFee(preset.val)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition shrink-0 cursor-pointer ${
                            Number(deliveryFee) === preset.val
                              ? 'bg-[#F26B1D] text-white shadow-2xs'
                              : 'bg-white text-[#7A6A5C] border border-[#F0E4D7] hover:bg-[#FFF1E6]'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Methods Chips */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#7A6A5C]">
                  <span>Payment Method:</span>
                  <span className="uppercase text-[#2B2118] font-mono">{paymentMethod}</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { id: 'cash', label: 'Cash', icon: Banknote },
                    { id: 'card', label: 'Card', icon: CreditCard },
                    { id: 'jazzcash', label: 'JazzCash', icon: Smartphone },
                    { id: 'easypaisa', label: 'Easypaisa', icon: Smartphone },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id)}
                        className={`p-1.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                          paymentMethod === m.id
                            ? 'bg-[#2B2118] text-white border-[#2B2118] shadow-xs'
                            : 'bg-[#FFF9F2] text-[#7A6A5C] border-[#F0E4D7] hover:bg-[#FFF1E6]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-bold truncate w-full">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>



            </div>

            {/* ========================================================
                PINNED BOTTOM ACTION FOOTER: Totals Summary & Order Actions
                ======================================================== */}
            <div className="p-3 bg-white border-t border-[#F0E4D7] shadow-lg shrink-0 space-y-2">
              {/* Totals Breakdown */}
              <div className="space-y-1">
                {/* When order tab is active, show the previous tab total */}
                {appendToExistingOrderId && activeExistingOrder && (
                  <div className="flex items-center justify-between text-[11px] text-purple-950 bg-purple-50 px-2 py-1 rounded-lg border border-purple-200">
                    <span className="font-bold">{activeExistingOrder.table ? `Table #${activeExistingOrder.table} Previous Bill:` : `Order #${activeExistingOrder.id} Previous Bill:`}</span>
                    <span className="font-mono font-black">{formatPKR(existingTabTotal)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-[#7A6A5C]">
                  <span>{appendToExistingOrderId ? 'New Dishes Subtotal:' : 'Subtotal:'}</span>
                  <span className="font-mono font-bold text-[#2B2118]">{formatPKR(subtotal)}</span>
                </div>

                {(discountAmount > 0 || activeDeliveryFee > 0) && (
                  <div className="flex items-center justify-between text-[11px] text-[#7A6A5C] pb-0.5">
                    <span>Adjustments:</span>
                    <div className="flex items-center gap-2">
                      {discountAmount > 0 && (
                        <span className="text-emerald-700 font-bold">
                          Discount: -{formatPKR(discountAmount)}
                        </span>
                      )}
                      {activeDeliveryFee > 0 && (
                        <span className="font-semibold text-blue-700">
                          Delivery: +{formatPKR(activeDeliveryFee)}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-[#F0E4D7]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-heading font-black text-xs sm:text-sm text-[#2B2118] uppercase tracking-tight">
                      {appendToExistingOrderId ? 'CONSOLIDATED TOTAL:' : 'TOTAL PAYABLE:'}
                    </span>
                  </div>
                  <span className="font-mono font-black text-base sm:text-lg text-[#F26B1D] shrink-0">
                    {formatPKR(grandTotal)}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Send to Kitchen, Send & Print Bill, Hold */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={submitting || cart.length === 0}
                  onClick={() => handleProcessOrder('kitchen')}
                  className="px-2 py-2.5 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-orange-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Save order and send KOT ticket to kitchen printer"
                >
                  <Send className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{appendToExistingOrderId ? 'Add & Send' : 'Send Kitchen'}</span>
                </button>

                <button
                  type="button"
                  disabled={submitting || cart.length === 0}
                  onClick={() => handleProcessOrder('kitchen_bill')}
                  className="px-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Send to Kitchen and print single consolidated receipt bill"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{appendToExistingOrderId ? 'Add & Single Bill' : 'Send & Bill'}</span>
                </button>

                <button
                  type="button"
                  disabled={submitting || cart.length === 0}
                  onClick={() => handleProcessOrder('hold')}
                  className="px-2 py-2.5 rounded-xl bg-[#FFF9F2] hover:bg-[#FFF1E6] active:scale-98 text-[#7A6A5C] hover:text-[#2B2118] font-bold text-xs border border-[#F0E4D7] flex items-center justify-center gap-1 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Hold order as draft to resume later"
                >
                  <Pause className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Hold</span>
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* ========================================================
            MOBILE BOTTOM FLOATING ORDER BAR
            ======================================================== */}
        <div className="lg:hidden p-3 bg-white border-t border-[#F0E4D7] flex items-center justify-between gap-3 shrink-0">
          <div>
            <div className="text-[10px] text-[#7A6A5C] uppercase font-bold">Total Payable</div>
            <div className="font-mono font-black text-base text-[#F26B1D]">
              {formatPKR(grandTotal)}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileCartOpen(true)}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#F26B1D] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 active:scale-98 transition cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>View Order ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* ========================================================
          ITEM CUSTOMIZATION MODAL (When tapping dish with choices)
          ======================================================== */}
      {customizingItem && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#F0E4D7] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-[#F0E4D7] flex items-center justify-between">
              <div>
                <h3 className="font-heading font-black text-sm sm:text-base text-[#2B2118]">
                  {customizingItem.title}
                </h3>
                <div className="text-xs font-mono font-bold text-[#F26B1D]">
                  Base: {formatPKR(customizingItem.price)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCustomizingItem(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
              {customizingItem.variants?.options?.map((group) => (
                <div key={group.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#2B2118] text-xs uppercase tracking-wider">
                      {group.name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {group.type === 'single' ? 'Pick 1' : 'Optional extras'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {group.options?.map((opt) => {
                      const isSelected =
                        group.type === 'single'
                          ? selectedOptions[group.id] === opt.id
                          : Array.isArray(selectedOptions[group.id]) &&
                            selectedOptions[group.id].includes(opt.id);

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            if (group.type === 'single') {
                              setSelectedOptions((prev) => ({
                                ...prev,
                                [group.id]: opt.id,
                              }));
                            } else {
                              setSelectedOptions((prev) => {
                                const curr = prev[group.id] || [];
                                const next = curr.includes(opt.id)
                                  ? curr.filter((id) => id !== opt.id)
                                  : [...curr, opt.id];
                                return { ...prev, [group.id]: next };
                              });
                            }
                          }}
                          className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                            isSelected
                              ? 'bg-orange-50 text-orange-950 border-[#F26B1D] font-bold shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                                isSelected
                                  ? 'bg-[#F26B1D] text-white border-[#F26B1D]'
                                  : 'border-slate-300'
                              }`}
                            >
                              {isSelected && '✓'}
                            </span>
                            <span>{opt.name}</span>
                          </div>
                          {Number(opt.price_delta) > 0 && (
                            <span className="font-mono text-xs font-semibold text-[#F26B1D]">
                              +{formatPKR(opt.price_delta)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Special Note Input */}
              <div className="pt-2 border-t border-[#F0E4D7]">
                <label className="block text-[11px] font-bold text-[#7A6A5C] mb-1">
                  Item Cooking / Custom Note:
                </label>
                <input
                  type="text"
                  value={itemNote}
                  onChange={(e) => setItemNote(e.target.value)}
                  placeholder="e.g. No pickles, well done, extra sauce"
                  className="w-full px-3 py-2 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-xs focus:outline-none focus:border-[#F26B1D]"
                />
              </div>
            </div>

            <div className="p-3 border-t border-[#F0E4D7] bg-white">
              <button
                type="button"
                onClick={handleConfirmCustomItem}
                className="w-full py-2.5 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-orange-500/20 active:scale-98"
              >
                <span>Add to Order</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
