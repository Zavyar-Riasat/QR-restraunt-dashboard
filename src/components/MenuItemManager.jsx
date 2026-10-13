import React, { useState } from 'react';
import {
  Utensils,
  Plus,
  Trash2,
  SlidersHorizontal,
  Search,
  Check,
  AlertCircle,
  X,
  Edit2,
  Package,
  Flame,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import { formatPKR } from '../utils/currencyUtils';
import {
  isDeal,
  getItemDealInfo,
  getItemVariants,
  incrementDealItem,
  decrementDealItem,
  getDealItemQuantity,
  getItemAvailability,
  getItemImage,
  getItemDescription,
} from '../utils/dealUtils';

const SAMPLE_IMAGES = [
  { label: '🍔 Burger', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80' },
  { label: '🍗 Chicken', url: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=600&q=80' },
  { label: '🍟 Fries', url: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=600&q=80' },
  { label: '🥤 Shake', url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80' },
  { label: '🍕 Pizza', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80' },
];

export default function MenuItemManager({
  categories = [],
  menuItems = [],
  onCreateMenuItem,
  onUpdateMenuItem,
  onDeleteMenuItem,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('ALL');

  // Categories partition
  const dealCategory = categories.find(
    (c) => c.name.toLowerCase().includes('deal') || c.name.toLowerCase().includes('combo')
  );
  const dishCategories = categories.filter(
    (c) => !(c.name.toLowerCase().includes('deal') || c.name.toLowerCase().includes('combo'))
  );

  // Form State
  const [editingItemId, setEditingItemId] = useState(null);
  const [isDealMode, setIsDealMode] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [dealItems, setDealItems] = useState('');
  const [dealBadge, setDealBadge] = useState('Hot Deal');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [optionsGroups, setOptionsGroups] = useState([]);
  const [bundleCategoryFilter, setBundleCategoryFilter] = useState('ALL');
  const [bundleSearchQuery, setBundleSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Persistent in-stock toggle
  const toggleStock = async (item) => {
    const currentAvailable = getItemAvailability(item);
    const newAvailable = !currentAvailable;

    const currentVariants = item.variants || {};
    let updatedVariants;
    if (Array.isArray(currentVariants)) {
      updatedVariants = {
        is_available: newAvailable,
        options: currentVariants,
      };
    } else {
      updatedVariants = {
        ...currentVariants,
        is_available: newAvailable,
      };
    }

    await onUpdateMenuItem(item.id, { variants: updatedVariants });
  };

  const handleOpenAddModal = () => {
    setEditingItemId(null);
    setIsDealMode(false);
    setCategoryId(dishCategories[0]?.id || categories[0]?.id || '');
    setTitle('');
    setPrice('');
    setOriginalPrice('');
    setDealItems('');
    setDealBadge('Hot Deal');
    setImageUrl('');
    setDescription('');
    setOptionsGroups([]);
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenCreateDealModal = () => {
    setEditingItemId(null);
    setIsDealMode(true);
    setCategoryId(dealCategory?.id || categories[0]?.id || '');
    setTitle('');
    setPrice('');
    setOriginalPrice('');
    setDealItems('');
    setDealBadge('Hot Deal');
    setImageUrl('');
    setDescription('');
    setOptionsGroups([]);
    setBundleCategoryFilter('ALL');
    setBundleSearchQuery('');
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    const deal = getItemDealInfo(item);
    setEditingItemId(item.id);
    const itemIsDeal = Boolean(deal);
    setIsDealMode(itemIsDeal);
    setCategoryId(
      itemIsDeal
        ? dealCategory?.id || item.category_id || categories[0]?.id || ''
        : item.category_id || dishCategories[0]?.id || categories[0]?.id || ''
    );
    setTitle(item.title || '');
    setPrice(item.price ? String(item.price) : '');
    setOriginalPrice(deal?.original_price ? String(deal.original_price) : '');
    setDealItems(deal?.deal_items || '');
    setDealBadge(deal?.badge || 'Hot Deal');
    setImageUrl(getItemImage(item) || '');
    setDescription(getItemDescription(item) || '');
    setOptionsGroups(getItemVariants(item));
    setBundleCategoryFilter('ALL');
    setBundleSearchQuery('');
    setError('');
    setIsModalOpen(true);
  };

  // Option Builders
  const addOptionGroup = (type = 'single') => {
    setOptionsGroups([
      ...optionsGroups,
      {
        id: `opt-grp-${Date.now()}`,
        name: type === 'single' ? 'Size / Portion' : 'Add-on Options',
        type: type,
        options: [
          { id: `opt-${Date.now()}-1`, name: 'Regular', price_delta: 0 },
          { id: `opt-${Date.now()}-2`, name: 'Large', price_delta: 150 },
        ],
      },
    ]);
  };

  const removeGroup = (index) => {
    setOptionsGroups(optionsGroups.filter((_, i) => i !== index));
  };

  const updateGroupName = (index, value) => {
    const updated = [...optionsGroups];
    updated[index].name = value;
    setOptionsGroups(updated);
  };

  const updateGroupType = (index, type) => {
    const updated = [...optionsGroups];
    updated[index].type = type;
    setOptionsGroups(updated);
  };

  const addChoiceToGroup = (groupIndex) => {
    const updated = [...optionsGroups];
    updated[groupIndex].options.push({
      id: `opt-${Date.now()}-${updated[groupIndex].options.length + 1}`,
      name: '',
      price_delta: 0,
    });
    setOptionsGroups(updated);
  };

  const updateChoice = (groupIndex, choiceIndex, field, value) => {
    const updated = [...optionsGroups];
    updated[groupIndex].options[choiceIndex][field] =
      field === 'price_delta' ? parseFloat(value) || 0 : value;
    setOptionsGroups(updated);
  };

  const removeChoice = (groupIndex, choiceIndex) => {
    const updated = [...optionsGroups];
    updated[groupIndex].options = updated[groupIndex].options.filter((_, i) => i !== choiceIndex);
    setOptionsGroups(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalCategoryId = isDealMode ? (dealCategory?.id || categoryId) : categoryId;
    if (!finalCategoryId) {
      setError('Please select a category.');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a name.');
      return;
    }
    if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      setError('Please enter a valid price.');
      return;
    }

    const cleanedVariants = optionsGroups
      .filter((grp) => grp.name.trim() !== '')
      .map((grp) => ({
        ...grp,
        options: grp.options.filter((opt) => opt.name.trim() !== ''),
      }));

    // Preserve stock availability status if editing an existing dish
    const existingItem = editingItemId ? menuItems.find((i) => i.id === editingItemId) : null;
    const currentAvailability = existingItem ? getItemAvailability(existingItem) : true;

    let variantsPayload;
    if (isDealMode) {
      variantsPayload = {
        is_deal: true,
        is_available: currentAvailability,
        image_url: imageUrl.trim(),
        description: description.trim(),
        original_price: parseFloat(originalPrice) || 0,
        deal_items: dealItems.trim(),
        badge: dealBadge.trim() || 'Hot Deal',
        options: cleanedVariants,
      };
    } else {
      variantsPayload = {
        is_available: currentAvailability,
        image_url: imageUrl.trim(),
        description: description.trim(),
        options: cleanedVariants,
      };
    }

    try {
      setIsSubmitting(true);
      setError('');

      if (editingItemId) {
        await onUpdateMenuItem(editingItemId, {
          category_id: finalCategoryId,
          title: title.trim(),
          price: parseFloat(price),
          variants: variantsPayload,
        });
      } else {
        await onCreateMenuItem({
          category_id: finalCategoryId,
          title: title.trim(),
          price: parseFloat(price),
          variants: variantsPayload,
        });
      }

      setIsModalOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to save item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const dealItemsList = menuItems.filter(isDeal);

  const filteredItems = menuItems.filter((item) => {
    let matchesCategory = false;
    if (selectedCategoryTab === 'ALL') {
      matchesCategory = true;
    } else if (selectedCategoryTab === 'DEALS') {
      matchesCategory = isDeal(item);
    } else {
      matchesCategory = item.category_id === selectedCategoryTab;
    }

    const dealInfo = getItemDealInfo(item);
    const itemDescription = getItemDescription(item);
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      itemDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dealInfo && dealInfo.deal_items && dealInfo.deal_items.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const getCategoryName = (catId) => {
    const cat = categories.find((c) => c.id === catId);
    return cat ? cat.name : 'General';
  };

  const parsedPrice = parseFloat(price) || 0;
  const parsedOriginal = parseFloat(originalPrice) || 0;
  const modalSavings = parsedOriginal > parsedPrice ? parsedOriginal - parsedPrice : 0;
  const modalSavingsPercent =
    parsedOriginal > 0 && modalSavings > 0
      ? Math.round((modalSavings / parsedOriginal) * 100)
      : 0;

  const availableBundleDishes = menuItems
    .filter((m) => !isDeal(m))
    .filter((m) => {
      const matchesCategory =
        bundleCategoryFilter === 'ALL' || m.category_id === bundleCategoryFilter;
      const matchesSearch =
        !bundleSearchQuery ||
        m.title.toLowerCase().includes(bundleSearchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-heading font-bold text-slate-900 tracking-tight">
            Menu Items & Deals
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your dishes, combo bundles, and live kitchen inventory.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCreateDealModal}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200/80 transition cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-slate-600" />
            <span>Create Deal</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Dish</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search items, ingredients, bundles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8.5 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategoryTab('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              selectedCategoryTab === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            All Items ({menuItems.length})
          </button>

          {dealItemsList.length > 0 && (
            <button
              onClick={() => setSelectedCategoryTab('DEALS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                selectedCategoryTab === 'DEALS'
                  ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                  : 'bg-amber-50/70 text-amber-900 hover:bg-amber-100/70 border border-amber-200/70'
              }`}
            >
              <span>Deals & Combos ({dealItemsList.length})</span>
            </button>
          )}

          {dishCategories.map((cat) => {
            const count = menuItems.filter((i) => i.category_id === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryTab(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  selectedCategoryTab === cat.id
                    ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                    : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Dishes Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50/40">
          <Utensils className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-700">No items found</p>
          <p className="text-xs text-slate-400 mt-0.5 max-w-xs mx-auto">
            {menuItems.length === 0
              ? 'Add single dishes or combos to build your live menu.'
              : 'Try searching for another dish or clear filters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredItems.map((item) => {
            const isAvailable = getItemAvailability(item);
            const isSoldOut = !isAvailable;
            const dealInfo = getItemDealInfo(item);
            const itemIsDeal = Boolean(dealInfo);
            const variantsList = getItemVariants(item);
            const hasVariants = variantsList && variantsList.length > 0;
            const itemImage = getItemImage(item);
            const itemDesc = getItemDescription(item);

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition flex flex-col justify-between shadow-2xs ${
                  isSoldOut
                    ? 'bg-slate-100/70 border-slate-300 opacity-65'
                    : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div>
                  {/* Top Badges and In-Stock toggle */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {getCategoryName(item.category_id)}
                      </span>

                      {itemIsDeal && (
                        <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/70">
                          {dealInfo.badge || 'Deal'}
                        </span>
                      )}
                    </div>

                    {/* Stock switch (Persistent) */}
                    <button
                      type="button"
                      onClick={() => toggleStock(item)}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border transition cursor-pointer shrink-0 ${
                        isSoldOut
                          ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                      title={isSoldOut ? 'Mark back In Stock' : 'Mark as Sold Out'}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isSoldOut ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                      <span>{isSoldOut ? 'Sold Out' : 'In Stock'}</span>
                    </button>
                  </div>

                  {/* Image & Title & Price Display */}
                  <div className="flex gap-3 mb-2">
                    {itemImage ? (
                      <img
                        src={itemImage}
                        alt={item.title}
                        className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                        <Utensils className="w-6 h-6" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h3 className="font-heading font-bold text-slate-900 text-sm leading-snug truncate">
                          {item.title}
                        </h3>
                        <span className="text-sm font-bold text-slate-900 font-mono shrink-0">
                          {formatPKR(item.price)}
                        </span>
                      </div>

                      {itemDesc ? (
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                          {itemDesc}
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic mt-0.5">No description</p>
                      )}
                    </div>
                  </div>

                  {/* Deal Bundle Summary */}
                  {itemIsDeal && dealInfo.deal_items && (
                    <div className="mb-2 p-2 rounded-xl bg-amber-50/70 border border-amber-200/60 text-xs">
                      <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-0.5">
                        📦 Included in Deal:
                      </p>
                      <p className="text-slate-700 font-medium text-[11px] leading-relaxed">
                        {dealInfo.deal_items}
                      </p>
                    </div>
                  )}

                  {/* Options Summary */}
                  {hasVariants && (
                    <div className="mb-2 space-y-1">
                      {variantsList.map((vg) => (
                        <div key={vg.id} className="text-[11px] text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 flex items-center justify-between">
                          <span className="font-medium text-slate-700">{vg.name}</span>
                          <span className="text-[10px] text-slate-400">
                            {vg.options?.length || 0} choices
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs mt-1">
                  <span className="text-[10px] text-slate-400">
                    ID: #{item.id.slice(-5)}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                      title="Edit dish"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Delete "${item.title}" from menu?`)) {
                          onDeleteMenuItem(item.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Delete dish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Dish Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 rounded-t-3xl">
              <div>
                <h3 className="font-heading font-extrabold text-slate-900 text-base">
                  {editingItemId ? 'Edit Menu Item' : isDealMode ? 'Create New Deal / Bundle' : 'Add New Dish'}
                </h3>
                <p className="text-xs text-slate-500">
                  Fill in dish details, photo, and customization add-ons.
                </p>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Mode Switcher: Single Item vs Deal */}
              <div className="bg-slate-100 p-0.5 rounded-xl flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsDealMode(false);
                    if (dealCategory && categoryId === dealCategory.id) {
                      setCategoryId(dishCategories[0]?.id || categories[0]?.id || '');
                    }
                  }}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition cursor-pointer ${
                    !isDealMode
                      ? 'bg-white text-slate-900 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Single Dish
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDealMode(true);
                    if (!dealBadge) setDealBadge('Hot Deal');
                    if (dealCategory) setCategoryId(dealCategory.id);
                  }}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition cursor-pointer ${
                    isDealMode
                      ? 'bg-white text-slate-900 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Deal / Combo Bundle
                </button>
              </div>

              {/* Category & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category {isDealMode ? '' : <span className="text-rose-500">*</span>}
                  </label>
                  {isDealMode ? (
                    <div className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-medium flex items-center justify-between">
                      <span className="font-semibold text-slate-800 truncate">
                        {dealCategory?.name || 'Deals & Combos'}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/80 px-1.5 py-0.5 rounded">
                        Default
                      </span>
                    </div>
                  ) : (
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-slate-400 focus:bg-white"
                    >
                      {dishCategories.length === 0 ? (
                        <option value="" disabled>
                          No categories found
                        </option>
                      ) : (
                        dishCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))
                      )}
                    </select>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isDealMode ? 'Deal Name' : 'Dish Name'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      isDealMode
                        ? 'e.g. Duo Feast (2 Burgers + Fries + 2 Drinks)'
                        : 'e.g. Truffle Double Smash'
                    }
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-slate-400 focus:bg-white"
                  />
                </div>
              </div>

              {/* Description & Food Photo URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dish Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Double Angus beef patties, Swiss truffle cheese, garlic aioli..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-slate-400 focus:bg-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>Photo URL</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Quick presets:</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1.5">
                    {imageUrl ? (
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100 flex items-center justify-center">
                        <img
                          src={imageUrl}
                          alt="Dish Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl border border-dashed border-slate-300 shrink-0 bg-slate-50 flex items-center justify-center text-slate-400">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                    )}
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono focus:outline-none focus:border-slate-400 focus:bg-white"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {SAMPLE_IMAGES.map((sample, sIdx) => (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => setImageUrl(sample.url)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                      >
                        {sample.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pricing Section */}
              {isDealMode ? (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          Deal Price (Rs.) <span className="text-rose-500">*</span>
                        </label>
                        {modalSavings > 0 && (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                            Save Rs. {modalSavings} ({modalSavingsPercent}% off)
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        required
                        placeholder="e.g. 1850"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-slate-400 focus:bg-white font-mono font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Original Value (Rs.)
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        placeholder="e.g. 2400 (for strikethrough)"
                        value={originalPrice}
                        onChange={(e) => setOriginalPrice(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-slate-400 focus:bg-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Promotional Badge */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Promotional Tag
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {['Hot Deal', 'Bestseller', 'Family Combo', 'Limited Time', 'Duo Special'].map(
                        (badge) => (
                          <button
                            key={badge}
                            type="button"
                            onClick={() => setDealBadge(badge)}
                            className={`text-xs px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                              dealBadge === badge
                                ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {badge}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Included Items */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Items Included in Bundle
                      </label>
                      {dealItems && (
                        <button
                          type="button"
                          onClick={() => setDealItems('')}
                          className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <textarea
                      rows="2"
                      value={dealItems}
                      onChange={(e) => setDealItems(e.target.value)}
                      placeholder="e.g. 2x Truffle Double Smash, 1x Cajun Loaded Fries"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-slate-400 focus:bg-white resize-y"
                    />

                    {/* Category Filter & Search Bar for picking bundle dishes */}
                    <div className="mt-2.5 space-y-2 p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
                      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                        <div className="sm:w-44 shrink-0">
                          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                            Category
                          </label>
                          <select
                            value={bundleCategoryFilter}
                            onChange={(e) => setBundleCategoryFilter(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:border-slate-400 cursor-pointer"
                          >
                            <option value="ALL">All Categories</option>
                            {dishCategories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex-1">
                          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                            Search Items
                          </label>
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              value={bundleSearchQuery}
                              onChange={(e) => setBundleSearchQuery(e.target.value)}
                              placeholder="Search..."
                              className="w-full pl-7 pr-6 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-slate-400"
                            />
                            {bundleSearchQuery && (
                              <button
                                type="button"
                                onClick={() => setBundleSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-1">
                        {availableBundleDishes.length === 0 ? (
                          <p className="text-xs text-slate-400 py-3 text-center bg-white rounded-lg border border-dashed border-slate-200">
                            No dishes found.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                            {availableBundleDishes.map((m) => {
                              const qty = getDealItemQuantity(dealItems, m.title);
                              if (qty === 0) {
                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => setDealItems((prev) => incrementDealItem(prev, m.title))}
                                    className="text-xs px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-medium border border-slate-200 hover:border-slate-300 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                                  >
                                    <Plus className="w-3 h-3 text-slate-400" />
                                    <span>{m.title}</span>
                                  </button>
                                );
                              }

                              return (
                                <div
                                  key={m.id}
                                  className="text-xs inline-flex items-center rounded-lg bg-slate-900 text-white font-medium border border-slate-900 shadow-2xs overflow-hidden"
                                >
                                  <button
                                    type="button"
                                    onClick={() => setDealItems((prev) => decrementDealItem(prev, m.title))}
                                    className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer font-bold"
                                    title="Decrease count"
                                  >
                                    −
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDealItems((prev) => incrementDealItem(prev, m.title))}
                                    className="px-1.5 py-1 text-white hover:bg-slate-800 transition cursor-pointer flex items-center gap-1 font-semibold"
                                    title="Click to add another (+1)"
                                  >
                                    <span>{qty}x</span>
                                    <span>{m.title}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDealItems((prev) => incrementDealItem(prev, m.title))}
                                    className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer font-bold"
                                    title="Increase count"
                                  >
                                    +
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Price (Rs.) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    placeholder="850"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-slate-400 focus:bg-white font-mono font-semibold"
                  />
                </div>
              )}

              {/* Customer Options / Customizations */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    Custom Options (Sizes, Add-ons)
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => addOptionGroup('single')}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Single Choice (Size)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => addOptionGroup('multi')}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Multiple Choice (Add-on)</span>
                    </button>
                  </div>
                </div>

                {optionsGroups.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2 text-center bg-slate-50 rounded-xl">
                    No custom choices added. Click buttons above to add Size options or Add-ons.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {optionsGroups.map((grp, gIdx) => (
                      <div
                        key={grp.id || gIdx}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={grp.name}
                            onChange={(e) => updateGroupName(gIdx, e.target.value)}
                            placeholder="Option Group Name (e.g. Size)"
                            className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-slate-400"
                          />
                          <select
                            value={grp.type}
                            onChange={(e) => updateGroupType(gIdx, e.target.value)}
                            className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium cursor-pointer"
                          >
                            <option value="single">Single (Radio)</option>
                            <option value="multi">Multiple (Checkbox)</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => removeGroup(gIdx)}
                            className="p-1 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                            title="Remove group"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Options Choices list */}
                        <div className="space-y-1.5 pl-2">
                          {grp.options.map((opt, oIdx) => (
                            <div key={opt.id || oIdx} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={opt.name}
                                onChange={(e) => updateChoice(gIdx, oIdx, 'name', e.target.value)}
                                placeholder="Choice name (e.g. Extra Cheese)"
                                className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-400"
                              />
                              <div className="flex items-center gap-1 w-28">
                                <span className="text-[10px] text-slate-400">+Rs.</span>
                                <input
                                  type="number"
                                  step="1"
                                  value={opt.price_delta}
                                  onChange={(e) => updateChoice(gIdx, oIdx, 'price_delta', e.target.value)}
                                  placeholder="0"
                                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-slate-400"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeChoice(gIdx, oIdx)}
                                className="p-1 text-slate-300 hover:text-rose-500 transition cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addChoiceToGroup(gIdx)}
                            className="text-[11px] font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 pt-0.5 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add choice</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Saving...' : editingItemId ? 'Update Dish' : 'Save Dish'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
