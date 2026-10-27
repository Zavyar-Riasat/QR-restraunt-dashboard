import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  Printer,
  Check,
  AlertCircle,
  Receipt,
  UtensilsCrossed,
  Search,
} from 'lucide-react';
import { formatPKR } from '../../utils/currencyUtils';
import { orderService } from '../../services/orderService';
import { TEMPLATE_TYPES } from '../../services/printer/printerTypes';

export default function EditOrderItemsModal({
  isOpen,
  onClose,
  order,
  restaurant,
  menuItems = [],
  onOrderUpdated,
  onPrintBill,
  onOpenPosForOrder,
}) {
  const [items, setItems] = useState([]);
  const [discountValue, setDiscountValue] = useState('');
  const [discountType, setDiscountType] = useState('fixed');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fallback to demo data if menuItems prop is empty
  const effectiveMenuItems = useMemo(() => {
    if (Array.isArray(menuItems) && menuItems.length > 0) return menuItems;
    try {
      const stored = localStorage.getItem('foodbypass_demo_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.menuItems) && parsed.menuItems.length > 0) {
          return parsed.menuItems;
        }
      }
    } catch (e) {
      // ignore
    }
    return [];
  }, [menuItems]);

  // Sync state whenever modal opens or order changes
  useEffect(() => {
    if (order) {
      setItems((order.items || []).map((item, idx) => ({
        ...item,
        _clientKey: `${item.title}-${idx}-${Date.now()}`,
      })));
      setDiscountValue(order.discount ? String(order.discount) : '');
      setDiscountType(order.discount_type || 'fixed');
      setErrorMsg(null);
      setIsAddingItem(false);
      setMenuSearch('');
    }
  }, [order, isOpen]);

  // Live Calculations
  const liveSubtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 1), 0);
  }, [items]);

  const liveDiscountAmount = useMemo(() => {
    const val = Number(discountValue) || 0;
    if (val <= 0) return 0;
    if (discountType === 'percent') {
      return Math.round((liveSubtotal * Math.min(val, 100)) / 100);
    }
    return Math.min(val, liveSubtotal);
  }, [liveSubtotal, discountValue, discountType]);

  const deliveryFee = Number(order?.delivery_fee) || 0;
  const liveTotalPayable = Math.max(0, liveSubtotal - liveDiscountAmount + deliveryFee);
  const originalTotal = Number(order?.total_payable) || 0;
  const totalDifference = liveTotalPayable - originalTotal;

  // Filtered menu items for the "+ Add Item" picker
  const filteredCatalog = useMemo(() => {
    if (!menuSearch.trim()) return effectiveMenuItems.slice(0, 10);
    const q = menuSearch.toLowerCase().trim();
    return effectiveMenuItems.filter(
      (m) => m.title?.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q)
    );
  }, [effectiveMenuItems, menuSearch]);

  if (!isOpen || !order) return null;

  // Change quantity
  const handleUpdateQuantity = (clientKey, delta) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item._clientKey === clientKey) {
            const newQty = (Number(item.quantity) || 1) + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  // Remove an item entirely (e.g. water bottle not consumed)
  const handleRemoveItem = (clientKey) => {
    setItems((prev) => prev.filter((item) => item._clientKey !== clientKey));
  };

  // Add an item from the menu catalog
  const handleAddCatalogItem = (menuItem) => {
    const unitPrice = Number(menuItem.price) || 0;
    setItems((prev) => [
      ...prev,
      {
        title: menuItem.title,
        quantity: 1,
        unitPrice,
        choices: [],
        dealBadge: menuItem.variants?.is_deal ? menuItem.variants?.badge : null,
        dealItems: menuItem.variants?.deal_items || null,
        _clientKey: `${menuItem.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      },
    ]);
    setIsAddingItem(false);
    setMenuSearch('');
  };

  // Save the updated items and recalculate bill
  const handleSave = async (andPrint = false) => {
    if (items.length === 0) {
      setErrorMsg('An order must have at least one item. If the customer cancelled everything, cancel the order instead.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);
      const restId = restaurant?.id || 'rest-101';

      // Strip temporary client keys before saving
      const cleanedItems = items.map(({ _clientKey, ...rest }) => rest);

      const updated = orderService.updateOrderItems(restId, order.id, cleanedItems, {
        discount: Number(discountValue) || 0,
        discount_type: discountType,
      });

      if (onOrderUpdated) {
        onOrderUpdated(updated);
      }

      if (andPrint && onPrintBill) {
        try {
          await onPrintBill(updated, TEMPLATE_TYPES.BILL);
        } catch (pErr) {
          console.warn('Bill print error:', pErr);
        }
      }

      onClose();
    } catch (err) {
      console.error('Error saving edited order items:', err);
      setErrorMsg(err.message || 'Failed to save updated items.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-[#F0E4D7] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-[#FFF9F2] border-b border-[#F0E4D7] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF1E6] text-[#F26B1D] flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-black text-base sm:text-lg text-[#2B2118]">
                  Edit Bill Items & Recalculate
                </h3>
                <span className="font-mono text-xs font-black bg-[#2B2118] text-white px-2 py-0.5 rounded-md">
                  #{order.id}
                </span>
                {order.table && (
                  <span className="text-[11px] font-bold bg-[#F26B1D] text-white px-2 py-0.5 rounded-full">
                    Table {order.table}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#7A6A5C] mt-0.5">
                Remove dishes not consumed, adjust quantities, or add new items. The bill updates instantly.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 mx-4 mt-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Items List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-[#7A6A5C] pb-1 border-b border-[#F0E4D7]">
            <span>Ordered Items ({items.length})</span>
            <span>Quantity & Price</span>
          </div>

          <div className="space-y-2">
            {items.map((item) => {
              const lineTotal = (Number(item.unitPrice) || 0) * (Number(item.quantity) || 1);

              return (
                <div
                  key={item._clientKey}
                  className="p-3 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] flex items-center justify-between gap-3 transition hover:border-[#F26B1D]/40"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm text-[#2B2118] truncate">
                      {item.title}
                    </div>
                    {item.dealItems && (
                      <div className="text-[11px] text-[#D95A12] font-semibold">
                        Bundle: {item.dealItems}
                      </div>
                    )}
                    {Array.isArray(item.choices) && item.choices.length > 0 && (
                      <div className="text-[10px] text-[#7A6A5C] space-y-0.5 mt-0.5">
                        {item.choices.map((c, i) => (
                          <div key={i} className="truncate">• {c}</div>
                        ))}
                      </div>
                    )}
                    <div className="text-xs font-mono font-bold text-[#9E8E81] mt-0.5">
                      {formatPKR(item.unitPrice)} each
                    </div>
                  </div>

                  {/* Quantity Stepper & Remove Trash Button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center bg-white border border-[#F0E4D7] rounded-xl overflow-hidden shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item._clientKey, -1)}
                        className="w-7 h-7 flex items-center justify-center text-slate-700 hover:bg-[#FFF1E6] hover:text-[#F26B1D] transition cursor-pointer"
                        title="Reduce quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <span className="w-8 text-center font-mono font-black text-xs text-[#2B2118]">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item._clientKey, 1)}
                        className="w-7 h-7 flex items-center justify-center text-slate-700 hover:bg-[#FFF1E6] hover:text-[#F26B1D] transition cursor-pointer"
                        title="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="w-20 text-right font-mono font-black text-sm text-[#2B2118]">
                      {formatPKR(lineTotal)}
                    </div>

                    {/* Delete / Void item button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item._clientKey)}
                      className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition flex items-center justify-center cursor-pointer border border-rose-200"
                      title="Remove this item completely from bill (e.g. water not consumed)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Another Dish Actions */}
          <div className="pt-2 space-y-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onOpenPosForOrder) {
                    onClose();
                    onOpenPosForOrder(order);
                  } else {
                    setIsAddingItem(true);
                  }
                }}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-[#F26B1D] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white font-extrabold text-sm shadow-md shadow-orange-500/25 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer border border-amber-300/30"
                title="Open full POS with categories, dish images, and addon customization"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
                <span>+ Add Another Dish in POS (Full Menu)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddingItem((prev) => !prev)}
                className="py-3 px-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                title="Quick search dish by name right here"
              >
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span>{isAddingItem ? 'Hide Quick Search' : 'Quick Search'}</span>
              </button>
            </div>

            {isAddingItem && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <UtensilsCrossed className="w-4 h-4 text-[#F26B1D]" />
                    <span>Quick search dish to add to this order:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingItem(false)}
                    className="text-xs text-slate-500 hover:text-slate-700 font-bold cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    placeholder="Search dish by name..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:border-[#F26B1D]"
                    autoFocus
                  />
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                  {filteredCatalog.map((dish) => (
                    <div
                      key={dish.id}
                      onClick={() => handleAddCatalogItem(dish)}
                      className="p-2 rounded-xl bg-white border border-slate-200 hover:border-[#F26B1D] hover:bg-[#FFF9F2] transition cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div className="font-bold text-slate-900 truncate pr-2">
                        {dish.title}
                      </div>
                      <div className="font-mono font-bold text-[#F26B1D] shrink-0">
                        + {formatPKR(dish.price)}
                      </div>
                    </div>
                  ))}
                  {filteredCatalog.length === 0 && (
                    <div className="text-center py-3 text-xs text-slate-400">
                      No matching menu dishes found.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Bill Recalculation Footer */}
        <div className="p-4 sm:p-5 bg-white border-t border-[#F0E4D7] space-y-3 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7]">
              <span className="text-[10px] text-[#7A6A5C] uppercase font-bold block">New Subtotal</span>
              <span className="font-mono font-bold text-[#2B2118] text-sm">{formatPKR(liveSubtotal)}</span>
            </div>

            {deliveryFee > 0 && (
              <div className="p-2.5 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7]">
                <span className="text-[10px] text-[#7A6A5C] uppercase font-bold block">Delivery Fee</span>
                <span className="font-mono font-bold text-[#2B2118] text-sm">{formatPKR(deliveryFee)}</span>
              </div>
            )}

            {liveDiscountAmount > 0 && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] text-emerald-700 uppercase font-bold block">Discount</span>
                <span className="font-mono font-bold text-emerald-800 text-sm">-{formatPKR(liveDiscountAmount)}</span>
              </div>
            )}

            <div className="p-2.5 rounded-xl bg-[#2B2118] text-white">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-300 uppercase font-bold block">Recalculated Bill</span>
                {totalDifference !== 0 && (
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                      totalDifference < 0 ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-slate-900'
                    }`}
                  >
                    {totalDifference < 0 ? `${formatPKR(totalDifference)}` : `+${formatPKR(totalDifference)}`}
                  </span>
                )}
              </div>
              <span className="font-mono font-black text-base sm:text-lg text-white">
                {formatPKR(liveTotalPayable)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSave(false)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black active:scale-98 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{isSaving ? 'Updating...' : 'Save & Recalculate Bill'}</span>
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSave(true)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] active:scale-98 text-white font-extrabold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 disabled:opacity-50"
              title="Save updated items and immediately print corrected customer receipt with QR"
            >
              <Printer className="w-4 h-4" />
              <span>Save & Print Updated Bill</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
