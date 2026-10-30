import React, { useState, useRef } from 'react';
import {
  Utensils,
  Plus,
  Trash2,
  Search,
  Edit2,
  Package,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { formatPKR } from '../utils/currencyUtils';
import {
  isDeal,
  getItemDealInfo,
  getItemVariants,
  getItemAvailability,
  getItemImage,
  getItemDescription,
  getItemPricing,
} from '../utils/dealUtils';
import DealFlowModal from './DealFlowModal';
import DishFormModal from './DishFormModal';

function capitalizeWord(str) {
  if (!str) return '';
  return str
    .trim()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function getFoodEmoji(title = '', category = '') {
  const t = `${title} ${category}`.toLowerCase();
  if (t.includes('burger') || t.includes('smash') || t.includes('zinger')) return '🍔';
  if (t.includes('pizza')) return '🍕';
  if (t.includes('fries') || t.includes('cajun') || t.includes('onion') || t.includes('side')) return '🍟';
  if (t.includes('shake') || t.includes('smoothie') || t.includes('drink') || t.includes('beverage') || t.includes('cola') || t.includes('vanilla') || t.includes('chocolate')) return '🥤';
  if (t.includes('chicken') || t.includes('wing') || t.includes('nugget') || t.includes('broast') || t.includes('nashville')) return '🍗';
  if (t.includes('kabab') || t.includes('behari') || t.includes('tikka') || t.includes('bbq') || t.includes('meat') || t.includes('steak')) return '🍢';
  if (t.includes('sandwich') || t.includes('wrap') || t.includes('roll')) return '🌯';
  if (t.includes('cake') || t.includes('sweet') || t.includes('dessert') || t.includes('ice cream') || t.includes('lotus')) return '🍰';
  if (t.includes('deal') || t.includes('combo') || t.includes('feast') || t.includes('bundle')) return '🔥';
  return '🍽️';
}

export default function MenuItemManager({
  categories = [],
  menuItems = [],
  onCreateCategory,
  onCreateMenuItem,
  onUpdateMenuItem,
  onDeleteMenuItem,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('ALL');
  const categoryScrollRef = useRef(null);

  const handleScrollCategories = (direction) => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({ left: direction * 240, behavior: 'smooth' });
    }
  };

  // Modals state
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [isDishModalOpen, setIsDishModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);

  // Categories partition
  const dealCategory = categories.find(
    (c) => c.name.toLowerCase().includes('deal') || c.name.toLowerCase().includes('combo')
  );
  const dishCategories = categories.filter(
    (c) => !(c.name.toLowerCase().includes('deal') || c.name.toLowerCase().includes('combo'))
  );

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

  const handleOpenCreateDeal = () => {
    setItemToEdit(null);
    setIsDealModalOpen(true);
  };

  const handleOpenAddDish = () => {
    setItemToEdit(null);
    setIsDishModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setItemToEdit(item);
    if (isDeal(item)) {
      setIsDealModalOpen(true);
    } else {
      setIsDishModalOpen(true);
    }
  };

  const handleSaveDeal = async ({ itemId, category_id, title, price, original_price, variants }) => {
    if (itemId) {
      await onUpdateMenuItem(itemId, {
        category_id,
        title,
        price,
        original_price,
        variants,
      });
    } else {
      await onCreateMenuItem({
        category_id,
        title,
        price,
        original_price,
        variants,
      });
    }
  };

  const handleSaveDish = async ({ itemId, category_id, title, price, original_price, variants }) => {
    if (itemId) {
      await onUpdateMenuItem(itemId, {
        category_id,
        title,
        price,
        original_price,
        variants,
      });
    } else {
      await onCreateMenuItem({
        category_id,
        title,
        price,
        original_price,
        variants,
      });
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

  return (
    <div className="bg-white border border-[#F0E4D7] rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0E4D7]">
        <div>
          <h2 className="text-xl font-heading font-extrabold text-[#2B2118] tracking-tight">
            Menu Items & Deals
          </h2>
          <p className="text-xs text-[#7A6A5C] mt-0.5">
            Manage your dishes, combo bundles, and live kitchen inventory.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Create Deal Button - Secondary button: white with orange outline */}
          <button
            onClick={handleOpenCreateDeal}
            className="px-4 py-2.5 rounded-2xl bg-white hover:bg-[#FFF1E6] text-[#F26B1D] text-xs sm:text-sm font-bold border-2 border-[#F26B1D] transition cursor-pointer flex items-center gap-2 shadow-2xs"
          >
            <Package className="w-4 h-4 text-[#F26B1D]" />
            <span>Create Deal</span>
          </button>

          {/* Add Dish Button - Primary button: warm orange */}
          <button
            onClick={handleOpenAddDish}
            className="px-5 py-2.5 rounded-2xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs sm:text-sm font-bold shadow-md shadow-orange-500/20 transition cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Dish</span>
          </button>
        </div>
      </div>

      {/* Filter, Category Dropdown & Scrollable Pills Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9E8E81]" />
            <input
              type="text"
              placeholder="Search dishes, ingredients, deals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-[#2B2118] text-xs sm:text-sm placeholder:text-[#9E8E81] focus:outline-none focus:border-[#F26B1D] focus:bg-white transition"
            />
          </div>

          {/* Category Dropdown Selector */}
          <div className="relative shrink-0 sm:w-56">
            <select
              value={selectedCategoryTab}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'ALL' || val === 'DEALS') {
                  setSelectedCategoryTab(val);
                } else {
                  const matchedCat = dishCategories.find((c) => String(c.id) === val);
                  setSelectedCategoryTab(matchedCat ? matchedCat.id : val);
                }
              }}
              className="w-full appearance-none pl-3.5 pr-9 py-2.5 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] hover:border-[#F26B1D] text-[#2B2118] text-xs sm:text-sm font-bold focus:outline-none focus:border-[#F26B1D] transition cursor-pointer"
            >
              <option value="ALL">All Items ({menuItems.length})</option>
              {dealItemsList.length > 0 && (
                <option value="DEALS">🔥 Deals ({dealItemsList.length})</option>
              )}
              {dishCategories.map((cat) => {
                const count = menuItems.filter((i) => i.category_id === cat.id).length;
                return (
                  <option key={cat.id} value={cat.id}>
                    {capitalizeWord(cat.name)} ({count})
                  </option>
                );
              })}
            </select>
            <ChevronDown className="w-4 h-4 text-[#7A6A5C] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Scrollable Category Pills (Soft colored chips) */}
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={() => handleScrollCategories(-1)}
            className="hidden sm:flex items-center justify-center w-8 h-8 rounded-xl bg-[#FFF9F2] hover:bg-[#FFF1E6] text-[#7A6A5C] hover:text-[#F26B1D] border border-[#F0E4D7] transition cursor-pointer shrink-0"
            title="Scroll categories left"
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
            className="flex items-center gap-1.5 overflow-x-auto scroll-smooth pb-1 flex-1 min-w-0"
          >
            <button
              type="button"
              onClick={() => setSelectedCategoryTab('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                selectedCategoryTab === 'ALL'
                  ? 'bg-[#F26B1D] text-white shadow-xs'
                  : 'bg-[#FFF9F2] text-[#7A6A5C] hover:text-[#2B2118] hover:bg-[#FFF1E6] border border-[#F0E4D7]'
              }`}
            >
              All Items ({menuItems.length})
            </button>

            {dealItemsList.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedCategoryTab('DEALS')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  selectedCategoryTab === 'DEALS'
                    ? 'bg-[#F26B1D] text-white shadow-xs'
                    : 'bg-[#FEF3D9] text-[#B87000] hover:bg-[#FDE7B6] border border-[#FCE1A8]'
                }`}
              >
                <span>🔥 Deals ({dealItemsList.length})</span>
              </button>
            )}

            {dishCategories.map((cat) => {
              const count = menuItems.filter((i) => i.category_id === cat.id).length;
              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setSelectedCategoryTab(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                    selectedCategoryTab === cat.id
                      ? 'bg-[#F26B1D] text-white shadow-xs'
                      : 'bg-[#FFF9F2] text-[#7A6A5C] hover:text-[#2B2118] hover:bg-[#FFF1E6] border border-[#F0E4D7]'
                  }`}
                >
                  {capitalizeWord(cat.name)} ({count})
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => handleScrollCategories(1)}
            className="hidden sm:flex items-center justify-center w-8 h-8 rounded-xl bg-[#FFF9F2] hover:bg-[#FFF1E6] text-[#7A6A5C] hover:text-[#F26B1D] border border-[#F0E4D7] transition cursor-pointer shrink-0"
            title="Scroll categories right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dishes & Deals Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-[#F0E4D7] rounded-3xl p-6 bg-[#FFF9F2]/50">
          <Utensils className="w-10 h-10 text-[#9E8E81] mx-auto mb-2" />
          <p className="text-base font-bold text-[#2B2118]">No items found</p>
          <p className="text-xs text-[#7A6A5C] mt-1 max-w-xs mx-auto">
            {menuItems.length === 0
              ? 'Add single dishes or deals to build your live menu.'
              : 'Try searching for another dish or clear filters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const isAvailable = getItemAvailability(item);
            const isSoldOut = !isAvailable;
            const dealInfo = getItemDealInfo(item);
            const itemIsDeal = Boolean(dealInfo);
            const variantsList = getItemVariants(item);
            const hasVariants = variantsList && variantsList.length > 0;
            const itemImage = getItemImage(item);
            const itemDesc = getItemDescription(item);
            const pricing = getItemPricing(item);

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border transition flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md group ${
                  isSoldOut
                    ? 'opacity-65 border-slate-200 bg-slate-50/50'
                    : itemIsDeal
                    ? 'border-amber-200 hover:border-amber-400'
                    : 'border-[#F0E4D7] hover:border-[#F26B1D]/40'
                }`}
              >
                <div>
                  {/* DIV 1: Card Header (Category Tag, Deal Badge, Stock Toggle) */}
                  <div className="p-3 bg-[#FFF9F2]/80 border-b border-[#F0E4D7]/70 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#D95A12] bg-[#FFF1E6] px-2 py-0.5 rounded-md border border-[#FCD8BF]">
                        {getCategoryName(item.category_id)}
                      </span>

                      {itemIsDeal && (
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#B87000] bg-[#FEF3D9] px-2 py-0.5 rounded-md border border-[#FCE1A8] flex items-center gap-1 shadow-2xs">
                          <span>🔥</span>
                          <span>{dealInfo.badge || 'DEAL'}</span>
                        </span>
                      )}
                    </div>

                    {/* Stock Switch */}
                    <button
                      type="button"
                      onClick={() => toggleStock(item)}
                      className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer shrink-0 ${
                        isSoldOut
                          ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                      title={isSoldOut ? 'Click to mark In Stock' : 'Click to mark Sold Out'}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isSoldOut ? 'bg-red-500' : 'bg-emerald-500'}`} />
                      <span>{isSoldOut ? 'Sold Out' : 'In Stock'}</span>
                    </button>
                  </div>

                  {/* DIV 2: Product Showcase (Appetizing Food Icon/Photo, Title, Price, Description) */}
                  <div className="p-3.5 flex gap-3 items-start">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-50 to-orange-100/80 border border-orange-200/60 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs group-hover:scale-105 transition">
                      {itemImage ? (
                        <img src={itemImage} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl select-none" role="img" aria-label="dish">
                          {getFoodEmoji(item.title, getCategoryName(item.category_id))}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-black text-sm text-[#2B2118] leading-tight line-clamp-1 group-hover:text-[#F26B1D] transition">
                        {item.title}
                      </h3>

                      <div className="flex items-baseline gap-2 mt-1">
                        {/* 1. DISCOUNTED / SELLING PRICE FIRST */}
                        <span className="text-sm sm:text-base font-extrabold text-[#F26B1D] font-mono">
                          {formatPKR(pricing.finalPrice)}
                        </span>
                        {/* 2. ORIGINAL PRICE SECOND WITH STRIKETHROUGH */}
                        {pricing.hasDiscount && (
                          <span className="text-xs text-[#9E8E81] line-through font-mono">
                            {formatPKR(pricing.originalPrice)}
                          </span>
                        )}
                        {pricing.hasDiscount && (
                          <span className="text-[10px] font-bold text-[#1F9D55] bg-[#E7F6EC] border border-[#C0E9CE] px-1.5 py-0.5 rounded">
                            {pricing.discountPercent}% off
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-[#7A6A5C] line-clamp-1 mt-0.5">
                        {itemDesc || (itemIsDeal ? dealInfo.deal_items : 'Freshly prepared')}
                      </p>
                    </div>
                  </div>

                  {/* DIV 3: Structured Inclusions / Options Box (Uniform layout across dishes & deals) */}
                  <div className="px-3.5 pb-3 flex-1 flex flex-col justify-start">
                    <div className="bg-[#FFF9F2] rounded-xl p-2.5 border border-[#F0E4D7] min-h-[56px] flex flex-col justify-center">
                      {itemIsDeal && dealInfo.deal_items ? (
                        <div>
                          <span className="text-[9px] font-black uppercase text-[#B87000] tracking-wider block mb-0.5">
                            📦 Included In Deal:
                          </span>
                          <p className="text-[11px] text-[#2B2118] font-semibold line-clamp-2 leading-snug">
                            {dealInfo.deal_items}
                          </p>
                        </div>
                      ) : hasVariants ? (
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                            Customization Options:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {variantsList.map((vg) => (
                              <span key={vg.id} className="text-[10px] bg-white text-[#7A6A5C] px-2 py-0.5 rounded-md border border-[#F0E4D7] font-bold">
                                {vg.name}: <strong className="text-[#2B2118] font-mono">{vg.options?.length || 0} choices</strong>
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[11px] text-[#9E8E81]">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          <span>Standard Recipe • Single Size</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* DIV 4: Card Action Footer */}
                <div className="px-3.5 py-2.5 bg-[#FFF9F2]/40 border-t border-[#F0E4D7] flex items-center justify-between text-xs">
                  <span className="text-[10px] text-[#9E8E81] font-mono font-medium">
                    {itemIsDeal ? 'Combo Package' : `${variantsList?.length || 0} variant groups`}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="px-2.5 py-1 rounded-lg text-[#F26B1D] hover:bg-[#FFF1E6] transition cursor-pointer flex items-center gap-1 font-bold text-xs"
                      title="Edit dish"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Delete "${item.title}" from menu?`)) {
                          onDeleteMenuItem(item.id);
                        }
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
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

      {/* 3-Step Deal Flow Modal */}
      <DealFlowModal
        isOpen={isDealModalOpen}
        onClose={() => setIsDealModalOpen(false)}
        categories={categories}
        menuItems={menuItems}
        dealCategory={dealCategory}
        itemToEdit={itemToEdit}
        onCreateCategory={onCreateCategory}
        onCreateMenuItem={onCreateMenuItem}
        onSaveDeal={handleSaveDeal}
      />

      {/* Streamlined Single Dish Modal */}
      <DishFormModal
        isOpen={isDishModalOpen}
        onClose={() => setIsDishModalOpen(false)}
        categories={categories}
        itemToEdit={itemToEdit}
        onCreateCategory={onCreateCategory}
        onSaveDish={handleSaveDish}
      />
    </div>
  );
}
