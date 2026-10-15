import React, { useState } from 'react';
import {
  Utensils,
  Plus,
  Trash2,
  Search,
  Edit2,
  Package,
} from 'lucide-react';
import { formatPKR } from '../utils/currencyUtils';
import {
  isDeal,
  getItemDealInfo,
  getItemVariants,
  getItemAvailability,
  getItemImage,
  getItemDescription,
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

export default function MenuItemManager({
  categories = [],
  menuItems = [],
  onCreateMenuItem,
  onUpdateMenuItem,
  onDeleteMenuItem,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('ALL');

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

  const handleSaveDeal = async ({ itemId, category_id, title, price, variants }) => {
    if (itemId) {
      await onUpdateMenuItem(itemId, {
        category_id,
        title,
        price,
        variants,
      });
    } else {
      await onCreateMenuItem({
        category_id,
        title,
        price,
        variants,
      });
    }
  };

  const handleSaveDish = async ({ itemId, category_id, title, price, variants }) => {
    if (itemId) {
      await onUpdateMenuItem(itemId, {
        category_id,
        title,
        price,
        variants,
      });
    } else {
      await onCreateMenuItem({
        category_id,
        title,
        price,
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

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9E8E81]" />
          <input
            type="text"
            placeholder="Search dishes, ingredients, deals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-[#2B2118] text-xs sm:text-sm placeholder:text-[#9E8E81] focus:outline-none focus:border-[#F26B1D] focus:bg-white transition"
          />
        </div>

        {/* Category Pills (Soft colored chips) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategoryTab('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              selectedCategoryTab === 'ALL'
                ? 'bg-[#F26B1D] text-white shadow-xs'
                : 'bg-[#FFF9F2] text-[#7A6A5C] hover:text-[#2B2118] hover:bg-[#FFF1E6] border border-[#F0E4D7]'
            }`}
          >
            All Items ({menuItems.length})
          </button>

          {dealItemsList.length > 0 && (
            <button
              onClick={() => setSelectedCategoryTab('DEALS')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
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
                key={cat.id}
                onClick={() => setSelectedCategoryTab(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
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

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition flex flex-col justify-between shadow-xs ${
                  isSoldOut
                    ? 'bg-[#FFF9F2]/50 border-[#F0E4D7] opacity-60'
                    : itemIsDeal
                    ? 'bg-gradient-to-b from-[#FEF3D9]/30 to-white border-[#FCE1A8] hover:shadow-md'
                    : 'bg-white border-[#F0E4D7] hover:border-[#FCD8BF] hover:shadow-md'
                }`}
              >
                <div>
                  {/* Top Badges and In-Stock toggle */}
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

                    {/* Stock switch (Consistent Green/Red) */}
                    <button
                      type="button"
                      onClick={() => toggleStock(item)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer shrink-0 ${
                        isSoldOut
                          ? 'bg-[#FDECEC] text-[#E5484D] border-[#F9C3C5] hover:bg-[#FCD9DA]'
                          : 'bg-[#E7F6EC] text-[#1F9D55] border-[#C0E9CE] hover:bg-[#D5EFE0]'
                      }`}
                      title={isSoldOut ? 'Mark back In Stock' : 'Mark as Sold Out'}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isSoldOut ? 'bg-[#E5484D]' : 'bg-[#1F9D55]'}`}></span>
                      <span>{isSoldOut ? 'Sold Out' : 'In Stock'}</span>
                    </button>
                  </div>

                  {/* Image & Title & Price Display */}
                  <div className="flex gap-3 mb-2.5">
                    {itemImage ? (
                      <img
                        src={itemImage}
                        alt={item.title}
                        className="w-16 h-16 rounded-xl object-cover border border-[#F0E4D7] shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] flex items-center justify-center text-[#9E8E81] shrink-0">
                        <Utensils className="w-7 h-7" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h3 className="font-heading font-extrabold text-[#2B2118] text-sm leading-snug line-clamp-2">
                          {item.title}
                        </h3>
                      </div>

                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-sm font-extrabold text-[#F26B1D] font-mono">
                          {formatPKR(item.price)}
                        </span>
                        {itemIsDeal && dealInfo.original_price > item.price && (
                          <span className="text-xs text-[#9E8E81] line-through font-mono">
                            {formatPKR(dealInfo.original_price)}
                          </span>
                        )}
                      </div>

                      {itemDesc && !itemIsDeal && (
                        <p className="text-[11px] text-[#7A6A5C] line-clamp-2 mt-1">
                          {itemDesc}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Deal Bundle Summary */}
                  {itemIsDeal && dealInfo.deal_items && (
                    <div className="mb-2 p-2.5 rounded-xl bg-[#FEF3D9] border border-[#FCE1A8] text-xs">
                      <p className="text-[10px] font-extrabold text-[#B87000] uppercase tracking-wider mb-1">
                        📦 Included in Deal:
                      </p>
                      <p className="text-[#2B2118] font-medium text-xs leading-relaxed">
                        {dealInfo.deal_items}
                      </p>
                    </div>
                  )}

                  {/* Options Summary */}
                  {hasVariants && (
                    <div className="mb-2 space-y-1">
                      {variantsList.map((vg) => (
                        <div key={vg.id} className="text-[11px] text-[#7A6A5C] bg-[#FFF9F2] px-2.5 py-1 rounded-lg border border-[#F0E4D7] flex items-center justify-between">
                          <span className="font-bold text-[#2B2118]">{vg.name}</span>
                          <span className="text-[10px] text-[#9E8E81]">
                            {vg.options?.length || 0} choices
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-end pt-2.5 border-t border-[#F0E4D7] text-xs mt-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="px-2.5 py-1.5 rounded-lg text-[#F26B1D] hover:bg-[#FFF1E6] transition cursor-pointer flex items-center gap-1 font-bold text-xs"
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
                      className="p-1.5 rounded-lg text-[#9E8E81] hover:text-[#D92D20] hover:bg-[#FEE4E2] transition cursor-pointer"
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
        onSaveDeal={handleSaveDeal}
      />

      {/* Streamlined Single Dish Modal */}
      <DishFormModal
        isOpen={isDishModalOpen}
        onClose={() => setIsDishModalOpen(false)}
        categories={categories}
        itemToEdit={itemToEdit}
        onSaveDish={handleSaveDish}
      />
    </div>
  );
}
