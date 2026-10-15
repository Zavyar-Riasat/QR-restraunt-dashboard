import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  X,
  Search,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  AlertCircle,
  Utensils,
  Package,
  Flame,
  Tag,
  RotateCcw,
} from 'lucide-react';
import { formatPKR, formatAmount } from '../utils/currencyUtils';
import { compressImageFile } from '../utils/imageUtils';
import { parseDealItems, getItemImage } from '../utils/dealUtils';

const DRAFT_KEY = 'dinehq_deal_draft_v1';

const PROMO_TAG_OPTIONS = [
  'Hot Deal',
  'Bestseller',
  'Family Deal',
  'Weekend Special',
  'Duo Special',
  'Limited Time',
];

export default function DealFlowModal({
  isOpen,
  onClose,
  categories = [],
  menuItems = [],
  dealCategory,
  itemToEdit = null,
  onSaveDeal,
}) {
  const [step, setStep] = useState(1); // 1: Name & Price, 2: Pick Items, 3: Done & Preview
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  // Map of dishId -> quantity
  const [selectedItemQuantities, setSelectedItemQuantities] = useState({});
  const [dealBadge, setDealBadge] = useState('Hot Deal');
  const [optionsGroups, setOptionsGroups] = useState([]);
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);

  // Filter & search in Step 2
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('ALL');

  // Status & validation
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [compressingImage, setCompressingImage] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [hasDraftNotice, setHasDraftNotice] = useState(false);

  const fileInputRef = useRef(null);
  const titleInputRef = useRef(null);
  const searchInputRef = useRef(null);

  const resetForm = useCallback(() => {
    setStep(1);
    setTitle('');
    setPrice('');
    setImageUrl('');
    setSelectedItemQuantities({});
    setDealBadge('Hot Deal');
    setOptionsGroups([]);
    setMoreOptionsOpen(false);
    setSearchQuery('');
    setSelectedCategoryTab('ALL');
    setValidationError('');
    setHasDraftNotice(false);
  }, []);

  // Available dishes to pick in Step 2 (exclude deals themselves and the deal being edited)
  const availableDishes = useMemo(() => {
    return menuItems.filter((item) => {
      if (itemToEdit && item.id === itemToEdit.id) return false;
      const isItemDeal =
        item.is_deal ||
        (item.variants && !Array.isArray(item.variants) && item.variants.is_deal) ||
        (Array.isArray(item.variants) && item.variants.some((v) => v?.type === '_deal_meta' || v?.is_deal));
      return !isItemDeal;
    });
  }, [menuItems, itemToEdit]);

  // Non-deal categories for the Step 2 category chips
  const nonDealCategories = useMemo(() => {
    return categories.filter((c) => {
      const name = c.name.toLowerCase();
      return !name.includes('deal') && !name.includes('combo');
    });
  }, [categories]);

  // Filtered dishes for Step 2
  const filteredDishes = useMemo(() => {
    return availableDishes.filter((dish) => {
      const matchesCategory =
        selectedCategoryTab === 'ALL' || dish.category_id === selectedCategoryTab;
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        dish.title.toLowerCase().includes(query) ||
        (dish.description && dish.description.toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
  }, [availableDishes, selectedCategoryTab, searchQuery]);

  // Initialize or restore state when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (itemToEdit) {
      // Editing mode
      setStep(1);
      setTitle(itemToEdit.title || '');
      setPrice(itemToEdit.price ? String(itemToEdit.price) : '');
      const img = getItemImage(itemToEdit) || '';
      setImageUrl(img);

      const variants = itemToEdit.variants || {};
      const dealMeta = Array.isArray(variants)
        ? variants.find((v) => v?.is_deal) || {}
        : variants;

      setDealBadge(dealMeta.badge || itemToEdit.badge || 'Hot Deal');
      setOptionsGroups(
        Array.isArray(variants)
          ? variants.filter((v) => v && v.type !== '_deal_meta' && !v.is_deal)
          : variants.options || []
      );

      // Parse deal_items into selectedItemQuantities
      const dealItemsText = dealMeta.deal_items || itemToEdit.deal_items || '';
      const parsed = parseDealItems(dealItemsText);
      const newQuantities = {};
      parsed.forEach(({ qty, title: parsedTitle }) => {
        const matched = availableDishes.find(
          (d) => d.title.toLowerCase() === parsedTitle.toLowerCase()
        );
        if (matched) {
          newQuantities[matched.id] = (newQuantities[matched.id] || 0) + qty;
        }
      });
      setSelectedItemQuantities(newQuantities);
      setHasDraftNotice(false);
      setValidationError('');
    } else {
      // Create mode - check for saved draft
      const savedDraftJson = localStorage.getItem(DRAFT_KEY);
      if (savedDraftJson) {
        try {
          const draft = JSON.parse(savedDraftJson);
          if (draft && (draft.title || draft.price || Object.keys(draft.selectedItemQuantities || {}).length > 0)) {
            setTitle(draft.title || '');
            setPrice(draft.price || '');
            setImageUrl(draft.imageUrl || '');
            setSelectedItemQuantities(draft.selectedItemQuantities || {});
            setDealBadge(draft.dealBadge || 'Hot Deal');
            setOptionsGroups(draft.optionsGroups || []);
            setHasDraftNotice(true);
            setStep(draft.step || 1);
            setValidationError('');
            return;
          }
        } catch {
          // Ignore invalid draft
        }
      }

      // Fresh default state
      resetForm();
    }
  }, [isOpen, itemToEdit, availableDishes, resetForm]);

  // Auto-focus active input on step change
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      if (step === 1) {
        titleInputRef.current?.focus();
      } else if (step === 2) {
        searchInputRef.current?.focus();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [step, isOpen]);

  // Auto-save draft when state changes in create mode
  useEffect(() => {
    if (!isOpen || itemToEdit) return;
    const hasData = title || price || imageUrl || Object.keys(selectedItemQuantities).length > 0;
    if (hasData) {
      const draft = {
        step,
        title,
        price,
        imageUrl,
        selectedItemQuantities,
        dealBadge,
        optionsGroups,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }
  }, [isOpen, itemToEdit, step, title, price, imageUrl, selectedItemQuantities, dealBadge, optionsGroups]);


  const handleDiscardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    resetForm();
  };

  // Image upload handler
  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setCompressingImage(true);
      const dataUrl = await compressImageFile(file);
      if (dataUrl) {
        setImageUrl(dataUrl);
      }
    } catch {
      setValidationError('Could not process photo. Please choose another image.');
    } finally {
      setCompressingImage(false);
    }
  };

  // Stepper handlers for Step 2
  const handleAddItem = (dishId) => {
    setSelectedItemQuantities((prev) => ({
      ...prev,
      [dishId]: (prev[dishId] || 0) + 1,
    }));
    setValidationError('');
  };

  const handleDecrementItem = (dishId) => {
    setSelectedItemQuantities((prev) => {
      const current = prev[dishId] || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[dishId];
        return next;
      }
      return {
        ...prev,
        [dishId]: current - 1,
      };
    });
  };

  // Calculate items summary & original price
  const { totalItemsCount, originalPrice, selectedItemsList, autoGeneratedDescription } = useMemo(() => {
    let count = 0;
    let sum = 0;
    const list = [];

    Object.entries(selectedItemQuantities).forEach(([dishId, qty]) => {
      if (qty > 0) {
        const dish = availableDishes.find((d) => d.id === dishId);
        if (dish) {
          count += qty;
          sum += (Number(dish.price) || 0) * qty;
          list.push({ ...dish, qty });
        }
      }
    });

    const description = list.map((item) => `${item.qty}x ${item.title}`).join(', ');

    return {
      totalItemsCount: count,
      originalPrice: sum,
      selectedItemsList: list,
      autoGeneratedDescription: description,
    };
  }, [selectedItemQuantities, availableDishes]);

  const parsedPrice = parseFloat(price) || 0;
  const savings = originalPrice > parsedPrice ? originalPrice - parsedPrice : 0;
  const savingsPercent =
    originalPrice > 0 && savings > 0 ? Math.round((savings / originalPrice) * 100) : 0;

  // Step 1 -> Step 2 validation
  const handleProceedToStep2 = (e) => {
    e?.preventDefault();
    if (!title.trim()) {
      setValidationError('Please enter a deal name (e.g. Family Deal).');
      titleInputRef.current?.focus();
      return;
    }
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      setValidationError('Please enter a valid deal price in Rs.');
      return;
    }
    setValidationError('');
    setStep(2);
  };

  // Step 2 -> Step 3 validation
  const handleProceedToStep3 = () => {
    if (totalItemsCount === 0) {
      setValidationError('Please select at least 1 dish to include in this deal.');
      return;
    }
    setValidationError('');
    setStep(3);
  };

  // Option builder helpers for Step 3 "Customer Choices"
  const addOptionGroup = (type = 'single') => {
    setOptionsGroups((prev) => [
      ...prev,
      {
        id: `opt-grp-${Date.now()}`,
        name: type === 'single' ? 'Size / Portion' : 'Extras & Add-ons',
        type: type,
        options: [
          { id: `opt-${Date.now()}-1`, name: type === 'single' ? 'Regular' : 'Extra Cheese', price_delta: 0 },
          { id: `opt-${Date.now()}-2`, name: type === 'single' ? 'Large' : 'Special Sauce', price_delta: 100 },
        ],
      },
    ]);
  };

  const removeGroup = (index) => {
    setOptionsGroups((prev) => prev.filter((_, i) => i !== index));
  };

  const updateGroupName = (index, value) => {
    setOptionsGroups((prev) => {
      const updated = [...prev];
      updated[index].name = value;
      return updated;
    });
  };

  const updateGroupType = (index, type) => {
    setOptionsGroups((prev) => {
      const updated = [...prev];
      updated[index].type = type;
      return updated;
    });
  };

  const addChoiceToGroup = (groupIndex) => {
    setOptionsGroups((prev) => {
      const updated = [...prev];
      updated[groupIndex].options.push({
        id: `opt-${Date.now()}-${updated[groupIndex].options.length + 1}`,
        name: '',
        price_delta: 0,
      });
      return updated;
    });
  };

  const updateChoice = (groupIndex, choiceIndex, field, value) => {
    setOptionsGroups((prev) => {
      const updated = [...prev];
      updated[groupIndex].options[choiceIndex][field] =
        field === 'price_delta' ? parseFloat(value) || 0 : value;
      return updated;
    });
  };

  const removeChoice = (groupIndex, choiceIndex) => {
    setOptionsGroups((prev) => {
      const updated = [...prev];
      updated[groupIndex].options = updated[groupIndex].options.filter((_, i) => i !== choiceIndex);
      return updated;
    });
  };

  // Final Submit Handler
  const handleSaveDeal = async () => {
    if (!title.trim()) {
      setStep(1);
      setValidationError('Please enter a deal name.');
      return;
    }
    if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      setStep(1);
      setValidationError('Please enter a valid deal price.');
      return;
    }
    if (totalItemsCount === 0) {
      setStep(2);
      setValidationError('Please select at least 1 dish for this deal.');
      return;
    }

    const finalCategoryId = dealCategory?.id || categories[0]?.id;

    // Filter valid custom choices
    const cleanedVariants = optionsGroups
      .filter((grp) => grp.name.trim() !== '')
      .map((grp) => ({
        ...grp,
        options: grp.options.filter((opt) => opt.name.trim() !== ''),
      }));

    const variantsPayload = {
      is_deal: true,
      is_available: itemToEdit?.variants?.is_available ?? true,
      image_url: imageUrl.trim(),
      description: autoGeneratedDescription,
      original_price: originalPrice,
      deal_items: autoGeneratedDescription,
      badge: dealBadge.trim() || 'Hot Deal',
      options: cleanedVariants,
    };

    try {
      setIsSubmitting(true);
      setValidationError('');

      await onSaveDeal({
        itemId: itemToEdit?.id,
        category_id: finalCategoryId,
        title: title.trim(),
        price: parseFloat(price),
        variants: variantsPayload,
      });

      // Clear draft on successful save
      localStorage.removeItem(DRAFT_KEY);
      onClose();
    } catch (err) {
      setValidationError(err.message || 'Failed to save deal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#2B2118]/50 backdrop-blur-xs flex flex-col justify-end sm:justify-center sm:items-center sm:p-4 animate-in fade-in duration-150">
      {/* Container: Fullscreen on mobile, modal on desktop */}
      <div className="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Progress Bar (at very top) */}
        <div className="w-full bg-[#FFF1E6] h-1.5 shrink-0">
          <div
            className="bg-[#F26B1D] h-full transition-all duration-300 ease-out"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#F0E4D7] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setValidationError('');
                  setStep((s) => s - 1);
                }}
                className="w-10 h-10 rounded-xl bg-[#FFF9F2] hover:bg-[#FFF1E6] text-[#2B2118] border border-[#F0E4D7] flex items-center justify-center transition cursor-pointer shrink-0"
                aria-label="Go back"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : null}

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#D95A12] bg-[#FFF1E6] px-2.5 py-0.5 rounded-full border border-[#FCD8BF]">
                  Step {step} of 3
                </span>
                <span className="text-xs text-[#7A6A5C] font-medium">
                  {step === 1
                    ? 'Deal Name & Price'
                    : step === 2
                    ? 'Pick Items'
                    : 'Done & Preview'}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-heading font-extrabold text-slate-900 mt-0.5 leading-snug">
                {step === 1 && (
                  <span>
                    Deal Name & Price <span className="text-sm font-normal text-slate-400">| ڈیل کا نام اور قیمت</span>
                  </span>
                )}
                {step === 2 && (
                  <span>
                    Pick Items in this Deal <span className="text-sm font-normal text-slate-400">| آئٹمز منتخب کریں</span>
                  </span>
                )}
                {step === 3 && (
                  <span>
                    Review & Save Deal <span className="text-sm font-normal text-slate-400">| جائزہ اور محفوظ کریں</span>
                  </span>
                )}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition cursor-pointer shrink-0"
            aria-label="Close form"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Draft Notice Banner */}
        {hasDraftNotice && !itemToEdit && (
          <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-200/70 flex items-center justify-between gap-2 text-xs text-amber-900 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>We restored your unsaved deal draft.</span>
            </div>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="text-xs font-bold text-amber-900 hover:text-rose-700 underline flex items-center gap-1 cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Discard Draft</span>
            </button>
          </div>
        )}

        {/* Friendly Validation Error Banner */}
        {validationError && (
          <div className="mx-5 mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200/90 text-rose-900 text-sm font-medium flex items-center gap-2.5 animate-in fade-in shrink-0">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* ========================================================
            STEP 1: Deal Name, Price, and Photo
           ======================================================== */}
        {step === 1 && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* Deal Name */}
            <div>
              <label
                htmlFor="deal-name-input"
                className="block text-base font-bold text-slate-800 mb-1.5"
              >
                Deal Name
                <span className="text-xs font-normal text-slate-500 ml-2">
                  ڈیل کا نام
                </span>
                <span className="text-rose-500 ml-1">*</span>
              </label>
              <input
                id="deal-name-input"
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setValidationError('');
                }}
                placeholder="Family Deal"
                className="w-full h-13 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-base font-medium placeholder:text-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white transition"
              />
              <p className="text-xs text-slate-400 mt-1 pl-1">
                Examples: Family Deal, Duo Feast, Jumbo Karahi Platter
              </p>
            </div>

            {/* Deal Price */}
            <div>
              <label
                htmlFor="deal-price-input"
                className="block text-base font-bold text-slate-800 mb-1.5"
              >
                Deal Price
                <span className="text-xs font-normal text-slate-500 ml-2">
                  ڈیل کی قیمت (روپے)
                </span>
                <span className="text-rose-500 ml-1">*</span>
              </label>

              <div className="relative flex items-center">
                <div className="absolute left-3.5 px-3 py-1 rounded-xl bg-slate-200/80 text-slate-800 font-bold text-sm select-none">
                  Rs.
                </div>
                <input
                  id="deal-price-input"
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  step="1"
                  min="0"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    setValidationError('');
                  }}
                  placeholder="2400"
                  className="w-full h-15 pl-18 pr-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-2xl sm:text-3xl font-extrabold font-mono placeholder:text-slate-300 focus:outline-none focus:border-slate-800 focus:bg-white transition"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1 pl-1">
                Enter the final discounted price customers will pay.
              </p>
            </div>

            {/* Photo Upload Box */}
            <div>
              <label className="block text-base font-bold text-slate-800 mb-1.5">
                Deal Photo (Optional)
                <span className="text-xs font-normal text-slate-500 ml-2">
                  تصویر شامل کریں
                </span>
              </label>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />

              {imageUrl ? (
                <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                    <img
                      src={imageUrl}
                      alt="Deal Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-slate-800 block truncate">
                      Photo Added
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Auto-compressed for fast loading
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer block mt-1"
                    >
                      Change Photo
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition cursor-pointer flex items-center justify-center shrink-0"
                    title="Remove photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={compressingImage}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full min-h-[120px] flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-600 bg-slate-50 hover:bg-emerald-50/20 text-slate-700 transition cursor-pointer p-4 group"
                >
                  {compressingImage ? (
                    <>
                      <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm font-medium text-slate-600">
                        Optimizing photo...
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 group-hover:border-emerald-300 flex items-center justify-center text-slate-600 group-hover:text-emerald-600 shadow-2xs transition">
                        <Camera className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <span className="text-base font-bold text-slate-800 block">
                          Add Photo (Optional)
                        </span>
                        <span className="text-xs text-slate-400 block mt-0.5">
                          Tap to take a photo or pick from gallery
                        </span>
                      </div>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 2: Pick Items in this Deal
           ======================================================== */}
        {step === 2 && (
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
            {/* Search Box & Category Chips */}
            <div className="p-4 sm:p-5 pb-2 bg-white border-b border-slate-100 shrink-0 space-y-3">
              {/* Search Box */}
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search dishes (e.g. Karahi, Burger, Fries)..."
                  className="w-full h-12 pl-11 pr-10 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-base placeholder:text-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryTab('ALL')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer min-h-[38px] ${
                    selectedCategoryTab === 'ALL'
                      ? 'bg-[#F26B1D] text-white shadow-xs'
                      : 'bg-[#FFF9F2] text-[#7A6A5C] hover:bg-[#FFF1E6] hover:text-[#2B2118] border border-[#F0E4D7]'
                  }`}
                >
                  All Dishes ({availableDishes.length})
                </button>
                {nonDealCategories.map((cat) => {
                  const count = availableDishes.filter((d) => d.category_id === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryTab(cat.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer min-h-[38px] ${
                        selectedCategoryTab === cat.id
                          ? 'bg-[#F26B1D] text-white shadow-xs'
                          : 'bg-[#FFF9F2] text-[#7A6A5C] hover:bg-[#FFF1E6] hover:text-[#2B2118] border border-[#F0E4D7]'
                      }`}
                    >
                      {cat.name} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Menu Items Grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {filteredDishes.length === 0 ? (
                <div className="text-center py-12 px-4 bg-white rounded-2xl border border-dashed border-[#F0E4D7]">
                  <Utensils className="w-8 h-8 text-[#9E8E81] mx-auto mb-2" />
                  <p className="text-sm font-bold text-[#2B2118]">No dishes found</p>
                  <p className="text-xs text-[#7A6A5C] mt-1">
                    Try searching for something else or pick another category.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredDishes.map((dish) => {
                    const qty = selectedItemQuantities[dish.id] || 0;
                    const isSelected = qty > 0;
                    const dishImage = getItemImage(dish);

                    return (
                      <div
                        key={dish.id}
                        className={`p-3 rounded-2xl border transition flex flex-col justify-between select-none ${
                          isSelected
                            ? 'bg-[#FFF1E6] border-2 border-[#F26B1D] shadow-sm'
                            : 'bg-white border-[#F0E4D7] hover:border-[#FCD8BF] hover:shadow-2xs'
                        }`}
                      >
                        <div
                          onClick={() => {
                            if (!isSelected) handleAddItem(dish.id);
                          }}
                          className={`flex items-start gap-3 cursor-pointer ${
                            !isSelected ? 'active:opacity-80' : ''
                          }`}
                        >
                          {dishImage ? (
                            <img
                              src={dishImage}
                              alt={dish.title}
                              className="w-14 h-14 rounded-xl object-cover border border-[#F0E4D7] shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] flex items-center justify-center text-[#9E8E81] shrink-0">
                              <Utensils className="w-6 h-6" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <h4 className="font-heading font-extrabold text-[#2B2118] text-sm leading-snug line-clamp-2">
                                {dish.title}
                              </h4>
                              {isSelected && (
                                <span className="w-5 h-5 rounded-full bg-[#F26B1D] text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-bold text-[#F26B1D] font-mono mt-0.5 block">
                              {formatPKR(dish.price)}
                            </span>
                          </div>
                        </div>

                        {/* Card Bottom / Stepper */}
                        <div className="pt-2.5 mt-2 border-t border-[#F0E4D7] flex items-center justify-between">
                          {isSelected ? (
                            <div className="w-full flex items-center justify-between">
                              <span className="text-xs font-bold text-[#D95A12]">
                                {qty} in deal
                              </span>
                              <div className="flex items-center gap-1 bg-white rounded-xl border border-[#FCD8BF] p-0.5 shadow-2xs">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDecrementItem(dish.id);
                                  }}
                                  className="w-9 h-9 rounded-lg bg-[#FFF9F2] hover:bg-[#FFF1E6] text-[#2B2118] font-bold flex items-center justify-center transition cursor-pointer text-base active:scale-95"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="w-8 text-center text-sm font-extrabold text-[#2B2118] font-mono">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddItem(dish.id);
                                  }}
                                  className="w-9 h-9 rounded-lg bg-[#F26B1D] hover:bg-[#D95A12] text-white font-bold flex items-center justify-center transition cursor-pointer text-base active:scale-95"
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddItem(dish.id)}
                              className="w-full h-9 rounded-xl bg-[#FFF9F2] hover:bg-[#FFF1E6] text-[#F26B1D] text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border border-[#FCD8BF]/80"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add to Deal</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sticky Summary Bar: "3 items - Total value Rs. 2,400 - You save Rs. 550" */}
            <div className="p-3.5 sm:p-4 bg-white border-t border-[#F0E4D7] shadow-sm shrink-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap text-sm">
                  <span className="font-extrabold text-[#2B2118]">
                    {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}
                  </span>
                  <span className="text-[#F0E4D7]">•</span>
                  <span className="text-[#7A6A5C]">
                    Total value <strong className="font-mono text-[#2B2118]">Rs. {formatAmount(originalPrice)}</strong>
                  </span>

                  {savings > 0 && (
                    <>
                      <span className="text-[#F0E4D7]">•</span>
                      <span className="text-[#1F9D55] font-bold bg-[#E7F6EC] px-2.5 py-0.5 rounded-lg border border-[#C0E9CE]">
                        You save Rs. {formatAmount(savings)} ({savingsPercent}% off)
                      </span>
                    </>
                  )}
                </div>

                {totalItemsCount === 0 && (
                  <span className="text-xs text-[#F26B1D] font-bold">
                    Tap dishes above to add them
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 3: Preview & Done
           ======================================================== */}
        {step === 3 && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Customer View Preview • گاہک کا منظر
              </span>

              {/* Realistic Customer Deal Card Preview */}
              <div className="bg-white rounded-3xl border-2 border-[#F0E4D7] shadow-sm overflow-hidden">
                {/* Photo & Badges */}
                <div className="relative h-44 sm:h-52 bg-[#2B2118] overflow-hidden flex items-center justify-center">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-[#2B2118] via-[#4A392A] to-[#D95A12] flex flex-col items-center justify-center text-white p-4">
                      <Package className="w-12 h-12 text-[#F5A623] mb-2 opacity-95" />
                      <span className="text-sm font-bold text-[#FEF3D9]">
                        Combo Deal Special
                      </span>
                    </div>
                  )}

                  {/* Promo Badge Tag */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#F5A623] text-[#2B2118] font-extrabold text-xs shadow-md uppercase tracking-wider">
                    <Flame className="w-3.5 h-3.5 fill-[#2B2118]" />
                    <span>{dealBadge}</span>
                  </div>

                  {/* Savings pill on photo */}
                  {savings > 0 && (
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-[#1F9D55] text-white font-extrabold text-xs shadow-md">
                      SAVE RS. {formatAmount(savings)}
                    </div>
                  )}
                </div>

                {/* Deal Content */}
                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-heading font-extrabold text-[#2B2118] leading-tight">
                      {title}
                    </h3>
                    <p className="text-xs text-[#7A6A5C] mt-0.5">
                      Specially curated combo bundle
                    </p>
                  </div>

                  {/* Included Items Pills */}
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#7A6A5C] block mb-2">
                      📦 Items Included ({totalItemsCount}):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selectedItemsList.map((item) => (
                        <div
                          key={item.id}
                          className="px-3 py-1.5 rounded-xl bg-[#FFF1E6] border border-[#FCD8BF] text-[#D95A12] text-xs font-bold flex items-center gap-1.5"
                        >
                          <span className="w-4 h-4 rounded-full bg-[#F26B1D] text-white text-[10px] flex items-center justify-center font-bold">
                            ✓
                          </span>
                          <span>
                            {item.qty}x {item.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pricing Box */}
                  <div className="pt-3 border-t border-[#F0E4D7] flex items-center justify-between">
                    <div>
                      {originalPrice > parsedPrice && (
                        <span className="text-xs text-[#9E8E81] line-through font-mono font-medium block">
                          Rs. {formatAmount(originalPrice)}
                        </span>
                      )}
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-extrabold text-[#F26B1D] font-mono">
                          {formatPKR(price)}
                        </span>
                        {savingsPercent > 0 && (
                          <span className="text-xs font-bold text-[#1F9D55] bg-[#E7F6EC] px-2.5 py-0.5 rounded-md border border-[#C0E9CE]">
                            {savingsPercent}% OFF
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="px-4 py-2 rounded-xl bg-[#F26B1D] text-white text-xs font-bold flex items-center gap-1.5 select-none shadow-sm shadow-orange-500/20">
                      <span>Add to Cart</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Collapsed "More options" Section */}
            <div className="border border-[#F0E4D7] rounded-2xl bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setMoreOptionsOpen(!moreOptionsOpen)}
                className="w-full px-5 py-3.5 flex items-center justify-between text-left font-bold text-[#2B2118] hover:bg-[#FFF9F2] transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#F26B1D]" />
                  <span className="text-base font-bold">More options</span>
                  <span className="text-xs text-[#7A6A5C] font-normal">
                    | مزید اختیارات (پروموشنل ٹیگ اور کسٹمر کے اختیارات)
                  </span>
                </div>
                {moreOptionsOpen ? (
                  <ChevronUp className="w-5 h-5 text-[#7A6A5C]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#7A6A5C]" />
                )}
              </button>

              {moreOptionsOpen && (
                <div className="p-5 pt-2 border-t border-[#F0E4D7] space-y-5 bg-[#FFF9F2]/50">
                  {/* Promotional Tag Selector */}
                  <div>
                    <label className="block text-sm font-bold text-[#2B2118] mb-2">
                      Promotional Tag
                      <span className="text-xs text-[#7A6A5C] font-normal ml-2">
                        پروموشنل ٹیگ
                      </span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PROMO_TAG_OPTIONS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setDealBadge(tag)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[38px] ${
                            dealBadge === tag
                              ? 'bg-[#F26B1D] text-white shadow-xs'
                              : 'bg-white text-[#7A6A5C] border border-[#F0E4D7] hover:bg-[#FFF1E6]'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Customer Choices (optional) */}
                  <div className="space-y-3 pt-3 border-t border-[#F0E4D7]">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <span className="text-sm font-bold text-[#2B2118] block">
                          Customer Choices (optional)
                        </span>
                        <span className="text-xs text-[#7A6A5C]">
                          Add drink choices, flavors, or add-ons if customer picks them
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => addOptionGroup('single')}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FFF1E6] border border-[#FCD8BF] text-[#F26B1D] text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Single Choice</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => addOptionGroup('multi')}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FFF1E6] border border-[#FCD8BF] text-[#F26B1D] text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Multiple Choice</span>
                        </button>
                      </div>
                    </div>

                    {optionsGroups.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-3 text-center bg-white rounded-xl border border-dashed border-slate-200">
                        No customer choices added. Customers will receive all included items directly.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {optionsGroups.map((grp, gIdx) => (
                          <div
                            key={grp.id || gIdx}
                            className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-2.5 shadow-2xs"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={grp.name}
                                onChange={(e) => updateGroupName(gIdx, e.target.value)}
                                placeholder="Group Name (e.g. Drink Choice, Size)"
                                className="flex-1 h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-slate-800"
                              />
                              <select
                                value={grp.type}
                                onChange={(e) => updateGroupType(gIdx, e.target.value)}
                                className="h-10 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                              >
                                <option value="single">Single (Customer picks 1)</option>
                                <option value="multi">Multiple (Add-ons)</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => removeGroup(gIdx)}
                                className="w-10 h-10 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer shrink-0"
                                title="Remove group"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Choices */}
                            <div className="space-y-2 pl-2">
                              {grp.options.map((opt, oIdx) => (
                                <div key={opt.id || oIdx} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={opt.name}
                                    onChange={(e) => updateChoice(gIdx, oIdx, 'name', e.target.value)}
                                    placeholder="Option name (e.g. Mint Margarita)"
                                    className="flex-1 h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-800"
                                  />
                                  <div className="flex items-center gap-1 w-28">
                                    <span className="text-xs text-slate-400 font-bold">+Rs.</span>
                                    <input
                                      type="number"
                                      step="1"
                                      value={opt.price_delta}
                                      onChange={(e) => updateChoice(gIdx, oIdx, 'price_delta', e.target.value)}
                                      placeholder="0"
                                      className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-slate-800"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeChoice(gIdx, oIdx)}
                                    className="w-9 h-9 text-slate-300 hover:text-rose-500 flex items-center justify-center cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}

                              <button
                                type="button"
                                onClick={() => addChoiceToGroup(gIdx)}
                                className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 pt-1 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Choice</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Footer: Sticky Bottom Bar with One Big Primary Button */}
        <div className="p-4 sm:p-5 border-t border-[#F0E4D7] bg-white shrink-0">
          {step === 1 && (
            <button
              type="button"
              onClick={handleProceedToStep2}
              className="w-full h-13 sm:h-14 py-3.5 px-6 rounded-2xl bg-[#F26B1D] hover:bg-[#D95A12] text-white font-bold text-base shadow-md shadow-orange-500/20 transition cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <span>Next: Pick Items</span>
              <span className="text-lg">→</span>
            </button>
          )}

          {step === 2 && (
            <button
              type="button"
              onClick={handleProceedToStep3}
              className="w-full h-13 sm:h-14 py-3.5 px-6 rounded-2xl bg-[#F26B1D] hover:bg-[#D95A12] text-white font-bold text-base shadow-md shadow-orange-500/20 transition cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <span>Next: Preview Deal ({totalItemsCount} items selected)</span>
              <span className="text-lg">→</span>
            </button>
          )}

          {step === 3 && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSaveDeal}
              className="w-full h-13 sm:h-14 py-3.5 px-6 rounded-2xl bg-[#F26B1D] hover:bg-[#D95A12] text-white font-bold text-base shadow-md shadow-orange-500/20 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
              <span>
                {isSubmitting
                  ? 'Saving Deal...'
                  : itemToEdit
                  ? 'Update Deal • ڈیل محفوظ کریں'
                  : 'Save Deal • ڈیل محفوظ کریں'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
