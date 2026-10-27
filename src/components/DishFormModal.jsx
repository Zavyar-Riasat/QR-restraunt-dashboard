import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Trash2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { compressImageFile } from '../utils/imageUtils';
import { getItemImage, getItemVariants } from '../utils/dealUtils';

const DRAFT_KEY = 'dinehq_dish_draft_v1';

// Category mismatch check helper
function checkCategoryMismatch(itemTitle, selectedCatId, categories) {
  if (!itemTitle || !selectedCatId) return null;
  const cat = categories.find((c) => c.id === selectedCatId);
  if (!cat) return null;
  const catName = cat.name.toLowerCase();
  const titleLower = itemTitle.toLowerCase();

  const rules = [
    {
      keywords: ['kabab', 'kebab', 'tikka', 'boti', 'bbq', 'bihari', 'behari', 'seekh'],
      categoryLabel: 'BBQ / Kebabs',
      mismatchedWith: ['pizza', 'burger', 'shake', 'dessert', 'beverage', 'drink'],
    },
    {
      keywords: ['karahi', 'handi', 'salan', 'qorma', 'korma', 'daal'],
      categoryLabel: 'Main Course / Desi',
      mismatchedWith: ['pizza', 'burger', 'shake', 'beverage', 'fries', 'sides'],
    },
    {
      keywords: ['pizza', 'slice', 'crust', 'calzone'],
      categoryLabel: 'Pizzas',
      mismatchedWith: ['burger', 'shake', 'beverage', 'bbq', 'kebab', 'kabab', 'karahi'],
    },
    {
      keywords: ['burger', 'smash', 'patty', 'zinger'],
      categoryLabel: 'Burgers',
      mismatchedWith: ['pizza', 'shake', 'beverage', 'bbq', 'kebab', 'karahi', 'handi'],
    },
    {
      keywords: ['shake', 'smoothie', 'mojito', 'soda', 'coke', 'drink', 'chai', 'tea', 'lassi'],
      categoryLabel: 'Beverages / Drinks',
      mismatchedWith: ['pizza', 'burger', 'bbq', 'kebab', 'karahi', 'handi'],
    },
  ];

  for (const rule of rules) {
    const matched = rule.keywords.find((k) => titleLower.includes(k));
    if (matched) {
      const isMismatch = rule.mismatchedWith.some((m) => catName.includes(m));
      if (isMismatch) {
        return {
          keyword: matched,
          currentCategory: cat.name,
          suggestedCategory: rule.categoryLabel,
        };
      }
    }
  }
  return null;
}

export default function DishFormModal({
  isOpen,
  onClose,
  categories = [],
  itemToEdit = null,
  onSaveDish,
}) {
  // Only non-deal categories for single dishes
  const dishCategories = useMemo(() => {
    return categories.filter((c) => {
      const name = c.name.toLowerCase();
      return !name.includes('deal') && !name.includes('combo');
    });
  }, [categories]);

  // Main fields
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Under "More options"
  const [description, setDescription] = useState('');
  const [optionsGroups, setOptionsGroups] = useState([]);
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);

  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [compressingImage, setCompressingImage] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [hasDraftNotice, setHasDraftNotice] = useState(false);

  const fileInputRef = useRef(null);
  const titleInputRef = useRef(null);

  const categoryMismatch = checkCategoryMismatch(title, categoryId, categories);

  const resetForm = useCallback(() => {
    setCategoryId(dishCategories[0]?.id || categories[0]?.id || '');
    setTitle('');
    setPrice('');
    setOriginalPrice('');
    setImageUrl('');
    setDescription('');
    setOptionsGroups([]);
    setMoreOptionsOpen(false);
    setValidationError('');
    setHasDraftNotice(false);
  }, [dishCategories, categories]);

  // Initialize or restore state when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (itemToEdit) {
      // Editing dish
      setCategoryId(itemToEdit.category_id || dishCategories[0]?.id || categories[0]?.id || '');
      setTitle(itemToEdit.title || '');
      setPrice(itemToEdit.price ? String(itemToEdit.price) : '');
      const existingOrigPrice = itemToEdit.original_price ?? itemToEdit.variants?.original_price;
      setOriginalPrice(existingOrigPrice ? String(existingOrigPrice) : '');
      setImageUrl(getItemImage(itemToEdit) || '');
      setDescription(itemToEdit.description || itemToEdit.variants?.description || '');
      setOptionsGroups(getItemVariants(itemToEdit));
      setMoreOptionsOpen(Boolean(itemToEdit.description || (getItemVariants(itemToEdit)?.length > 0)));
      setValidationError('');
      setHasDraftNotice(false);
    } else {
      // Create mode - check draft
      const savedDraftJson = localStorage.getItem(DRAFT_KEY);
      if (savedDraftJson) {
        try {
          const draft = JSON.parse(savedDraftJson);
          if (draft && (draft.title || draft.price || draft.description)) {
            setCategoryId(draft.categoryId || dishCategories[0]?.id || categories[0]?.id || '');
            setTitle(draft.title || '');
            setPrice(draft.price || '');
            setOriginalPrice(draft.originalPrice || '');
            setImageUrl(draft.imageUrl || '');
            setDescription(draft.description || '');
            setOptionsGroups(draft.optionsGroups || []);
            setMoreOptionsOpen(Boolean(draft.description || (draft.optionsGroups?.length > 0)));
            setHasDraftNotice(true);
            setValidationError('');
            return;
          }
        } catch {
          // Ignore parse errors
        }
      }

      // Fresh default state
      resetForm();
    }
  }, [isOpen, itemToEdit, dishCategories, categories, resetForm]);

  // Auto-focus title input on open
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      titleInputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Auto-save draft when fields change in create mode
  useEffect(() => {
    if (!isOpen || itemToEdit) return;
    const hasData = title || price || originalPrice || imageUrl || description || optionsGroups.length > 0;
    if (hasData) {
      const draft = {
        categoryId,
        title,
        price,
        originalPrice,
        imageUrl,
        description,
        optionsGroups,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }
  }, [isOpen, itemToEdit, categoryId, title, price, originalPrice, imageUrl, description, optionsGroups]);

  const handleDiscardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    resetForm();
  };

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

  // Custom Choices Builders & Quick Templates
  const handleAddSizeGroup = () => {
    setOptionsGroups((prev) => [
      ...prev,
      {
        id: `opt-grp-${Date.now()}`,
        name: 'Size',
        type: 'single',
        options: [
          { id: `opt-${Date.now()}-1`, name: 'Regular', price_delta: 0 },
          { id: `opt-${Date.now()}-2`, name: 'Large', price_delta: 150 },
        ],
      },
    ]);
    setMoreOptionsOpen(true);
  };

  const handleAddExtrasGroup = () => {
    setOptionsGroups((prev) => [
      ...prev,
      {
        id: `opt-grp-${Date.now()}`,
        name: 'Extras & Add-ons',
        type: 'multi',
        options: [
          { id: `opt-${Date.now()}-1`, name: 'Extra Cheese', price_delta: 100 },
          { id: `opt-${Date.now()}-2`, name: 'Special Sauce', price_delta: 50 },
        ],
      },
    ]);
    setMoreOptionsOpen(true);
  };

  // Quick 1-Click Templates
  const applyTemplate = (templateType) => {
    setMoreOptionsOpen(true);
    if (templateType === 'size') {
      setOptionsGroups((prev) => [
        ...prev,
        {
          id: `opt-grp-${Date.now()}`,
          name: 'Size',
          type: 'single',
          options: [
            { id: `opt-${Date.now()}-1`, name: 'Small', price_delta: 0 },
            { id: `opt-${Date.now()}-2`, name: 'Medium', price_delta: 150 },
            { id: `opt-${Date.now()}-3`, name: 'Large', price_delta: 300 },
          ],
        },
      ]);
    } else if (templateType === 'spice') {
      setOptionsGroups((prev) => [
        ...prev,
        {
          id: `opt-grp-${Date.now()}`,
          name: 'Spice Level',
          type: 'single',
          options: [
            { id: `opt-${Date.now()}-1`, name: 'Mild', price_delta: 0 },
            { id: `opt-${Date.now()}-2`, name: 'Medium', price_delta: 0 },
            { id: `opt-${Date.now()}-3`, name: 'Hot', price_delta: 0 },
          ],
        },
      ]);
    } else if (templateType === 'extras') {
      setOptionsGroups((prev) => [
        ...prev,
        {
          id: `opt-grp-${Date.now()}`,
          name: 'Extras',
          type: 'multi',
          options: [
            { id: `opt-${Date.now()}-1`, name: 'Extra Cheese', price_delta: 100 },
            { id: `opt-${Date.now()}-2`, name: 'Dip Sauce', price_delta: 50 },
          ],
        },
      ]);
    }
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

  // Save handler
  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (!categoryId) {
      setValidationError('Please select a category.');
      return;
    }
    if (!title.trim()) {
      setValidationError('Please enter a dish name (e.g. Chicken Karahi).');
      titleInputRef.current?.focus();
      return;
    }
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      setValidationError('Please enter a valid price in Rs.');
      return;
    }

    const cleanedVariants = optionsGroups
      .filter((grp) => grp.name.trim() !== '')
      .map((grp) => ({
        ...grp,
        options: grp.options.filter((opt) => opt.name.trim() !== ''),
      }));

    const parsedOriginalPrice = originalPrice && parseFloat(originalPrice) > 0 ? parseFloat(originalPrice) : null;

    const variantsPayload = {
      is_available: itemToEdit?.variants?.is_available ?? true,
      image_url: imageUrl.trim(),
      description: description.trim(),
      options: cleanedVariants,
      original_price: parsedOriginalPrice,
    };

    try {
      setIsSubmitting(true);
      setValidationError('');

      await onSaveDish({
        itemId: itemToEdit?.id,
        category_id: categoryId,
        title: title.trim(),
        price: parseFloat(price),
        original_price: parsedOriginalPrice,
        variants: variantsPayload,
      });

      // Clear draft on successful save
      localStorage.removeItem(DRAFT_KEY);
      onClose();
    } catch (err) {
      setValidationError(err.message || 'Failed to save dish. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#2B2118]/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center sm:items-center sm:p-4 animate-in fade-in duration-150">
      {/* Container: Fullscreen on mobile, modal on desktop */}
      <div className="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[#F0E4D7]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#F0E4D7] flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-heading font-extrabold text-[#2B2118] leading-snug">
              {itemToEdit ? 'Edit Dish' : 'Add Dish'}
            </h2>
            <p className="text-xs text-[#7A6A5C] mt-0.5">
              Quick & simple • Ready in under 30 seconds
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-[#FFF9F2] hover:bg-[#FFF1E6] text-[#7A6A5C] hover:text-[#2B2118] border border-[#F0E4D7] flex items-center justify-center transition cursor-pointer shrink-0"
            aria-label="Close form"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Draft Notice Banner */}
        {hasDraftNotice && !itemToEdit && (
          <div className="px-5 py-2.5 bg-[#FEF3D9] border-b border-[#FCE1A8] flex items-center justify-between gap-2 text-xs text-[#B87000] shrink-0">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-[#F5A623] shrink-0" />
              <span>We restored your unsaved dish draft.</span>
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

        {/* Form Body - Clean and Fast */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* 1. Category */}
          <div>
            <label
              htmlFor="dish-category-select"
              className="block text-base font-bold text-slate-800 mb-1.5"
            >
              Category
              <span className="text-rose-500 ml-1">*</span>
            </label>
            <select
              id="dish-category-select"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setValidationError('');
              }}
              required
              className="w-full h-13 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-base font-medium focus:outline-none focus:border-slate-800 focus:bg-white cursor-pointer transition"
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
          </div>

          {/* 2. Dish Name */}
          <div>
            <label
              htmlFor="dish-name-input"
              className="block text-base font-bold text-slate-800 mb-1.5"
            >
              Dish Name
              <span className="text-rose-500 ml-1">*</span>
            </label>
            <input
              id="dish-name-input"
              ref={titleInputRef}
              type="text"
              required
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setValidationError('');
              }}
              placeholder="e.g. Chicken Karahi"
              className="w-full h-13 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-base font-medium placeholder:text-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white transition"
            />
            <p className="text-xs text-slate-400 mt-1 pl-1">
              Examples: Chicken Karahi, Zinger Burger, Seekh Kabab Roll, Special Biryani
            </p>

            {/* Category Mismatch Warning */}
            {categoryMismatch && (
              <div className="mt-2.5 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold">Helpful Tip: </span>
                  <span>
                    "{title}" is usually placed under <strong>{categoryMismatch.suggestedCategory}</strong> instead of <strong>"{categoryMismatch.currentCategory}"</strong>.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 3. Pricing Section (Selling Price + Optional Before-Discount Original Price) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="dish-price-input"
                className="block text-sm font-bold text-slate-800 mb-1.5"
              >
                Selling / Discounted Price
                <span className="text-rose-500 ml-1">*</span>
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 px-2.5 py-1 rounded-xl bg-slate-200/80 text-slate-800 font-bold text-xs select-none">
                  Rs.
                </div>
                <input
                  id="dish-price-input"
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  step="1"
                  min="0"
                  required
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    setValidationError('');
                  }}
                  placeholder="850"
                  className="w-full h-13 pl-16 pr-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xl font-extrabold font-mono placeholder:text-slate-300 focus:outline-none focus:border-slate-800 focus:bg-white transition"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Amount the customer pays. Shown first in menu.
              </p>
            </div>

            <div>
              <label
                htmlFor="dish-original-price-input"
                className="block text-sm font-bold text-slate-800 mb-1.5"
              >
                Original Price (Optional)
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 px-2.5 py-1 rounded-xl bg-slate-200/80 text-slate-800 font-bold text-xs select-none">
                  Rs.
                </div>
                <input
                  id="dish-original-price-input"
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  step="1"
                  min="0"
                  value={originalPrice}
                  onChange={(e) => {
                    setOriginalPrice(e.target.value);
                  }}
                  placeholder="1000"
                  className="w-full h-13 pl-16 pr-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xl font-extrabold font-mono placeholder:text-slate-300 focus:outline-none focus:border-slate-800 focus:bg-white transition"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Shown crossed out second in menu.
              </p>
            </div>
          </div>

          {/* Discount Active Preview Banner */}
          {parseFloat(price) > 0 && parseFloat(originalPrice) > parseFloat(price) && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="text-base select-none">🎉</span>
                <div>
                  <span className="font-extrabold text-emerald-800">
                    Discount Active ({Math.round(((parseFloat(originalPrice) - parseFloat(price)) / parseFloat(originalPrice)) * 100)}% OFF):
                  </span>{' '}
                  <span>
                    In menu, customers see <strong>Rs. {parseFloat(price).toLocaleString()}</strong> first, then <del className="text-slate-500 font-mono">Rs. {parseFloat(originalPrice).toLocaleString()}</del> second (Save Rs. {(parseFloat(originalPrice) - parseFloat(price)).toLocaleString()}).
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 4. Dish Photo */}
          <div>
            <label className="block text-base font-bold text-slate-800 mb-1.5">
              Dish Photo (Optional)
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
                <div className="w-18 h-18 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                  <img
                    src={imageUrl}
                    alt="Dish Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold text-slate-800 block truncate">
                    Photo Added
                  </span>
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
                className="w-full min-h-[105px] flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-600 bg-slate-50 hover:bg-emerald-50/20 text-slate-700 transition cursor-pointer p-4 group"
              >
                {compressingImage ? (
                  <>
                    <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-medium text-slate-600">
                      Optimizing photo...
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 group-hover:border-emerald-300 flex items-center justify-center text-slate-600 group-hover:text-emerald-600 shadow-2xs transition">
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-bold text-slate-800 block">
                      Add Photo (Optional)
                    </span>
                    <span className="text-xs text-slate-400 block">
                      Tap to take a photo or pick from gallery
                    </span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* ========================================================
              Collapsed "More options" Section
             ======================================================== */}
          <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden pt-1">
            <button
              type="button"
              onClick={() => setMoreOptionsOpen(!moreOptionsOpen)}
              className="w-full px-5 py-3.5 flex items-center justify-between text-left font-bold text-slate-800 hover:bg-slate-50 transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="text-base font-bold">More options</span>
              </div>
              {moreOptionsOpen ? (
                <ChevronUp className="w-5 h-5 text-slate-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-500" />
              )}
            </button>

            {moreOptionsOpen && (
              <div className="p-5 pt-3 border-t border-slate-100 space-y-5 bg-slate-50/40">
                {/* Dish Description */}
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1.5">
                    Dish Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Fresh chicken slow-cooked with fresh tomatoes, green chilies, ginger, and aromatic desi spices."
                    className="w-full p-3.5 rounded-2xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-slate-800 transition resize-none"
                  />
                </div>

                {/* Customer Choices (optional) */}
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-sm font-bold text-slate-800">
                      Customer Choices (optional)
                    </label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Let customers choose sizes, spice levels, or extra toppings
                    </p>
                  </div>

                  {/* Quick 1-Click Templates */}
                  <div className="p-3 bg-[#FFF9F2] rounded-2xl border border-[#F0E4D7] space-y-2">
                    <span className="text-[11px] font-bold text-[#7A6A5C] uppercase tracking-wider flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-[#F5A623] fill-[#F5A623]" />
                      <span>Quick Templates (1-click to add):</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => applyTemplate('size')}
                        className="px-3 py-1.5 rounded-xl bg-[#FFF1E6] hover:bg-[#FCD8BF] text-[#D95A12] text-xs font-bold border border-[#FCD8BF]/80 transition cursor-pointer flex items-center gap-1"
                      >
                        <span>+ Size (Small, Medium, Large)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTemplate('spice')}
                        className="px-3 py-1.5 rounded-xl bg-[#FFF1E6] hover:bg-[#FCD8BF] text-[#D95A12] text-xs font-bold border border-[#FCD8BF]/80 transition cursor-pointer flex items-center gap-1"
                      >
                        <span>+ Spice Level (Mild, Medium, Hot)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTemplate('extras')}
                        className="px-3 py-1.5 rounded-xl bg-[#FFF1E6] hover:bg-[#FCD8BF] text-[#D95A12] text-xs font-bold border border-[#FCD8BF]/80 transition cursor-pointer flex items-center gap-1"
                      >
                        <span>+ Extras (Cheese, Sauce)</span>
                      </button>
                    </div>
                  </div>

                  {/* Two Action Buttons: White with Orange Outline (Secondary) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleAddSizeGroup}
                      className="h-11 px-4 rounded-xl bg-white hover:bg-[#FFF1E6] border-2 border-[#F26B1D]/40 hover:border-[#F26B1D] text-[#D95A12] text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <Plus className="w-4 h-4 text-[#F26B1D]" />
                      <span>Add Size (customer picks one)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddExtrasGroup}
                      className="h-11 px-4 rounded-xl bg-white hover:bg-[#FFF1E6] border-2 border-[#F26B1D]/40 hover:border-[#F26B1D] text-[#D95A12] text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <Plus className="w-4 h-4 text-[#F26B1D]" />
                      <span>Add Extras (customer picks many)</span>
                    </button>
                  </div>

                  {/* Options List */}
                  {optionsGroups.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-3 text-center bg-white rounded-xl border border-dashed border-slate-200">
                      No choices added yet. Use the buttons above if customers need to select size or add-ons.
                    </p>
                  ) : (
                    <div className="space-y-3 pt-2">
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
                              placeholder="Choice Name (e.g. Size, Spice Level)"
                              className="flex-1 h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-slate-800"
                            />
                            <select
                              value={grp.type}
                              onChange={(e) => updateGroupType(gIdx, e.target.value)}
                              className="h-10 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                            >
                              <option value="single">Single (Customer picks 1)</option>
                              <option value="multi">Multiple (Checkboxes)</option>
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

                          {/* Choices Options */}
                          <div className="space-y-2 pl-2">
                            {grp.options.map((opt, oIdx) => (
                              <div key={opt.id || oIdx} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={opt.name}
                                  onChange={(e) => updateChoice(gIdx, oIdx, 'name', e.target.value)}
                                  placeholder="Option name (e.g. Medium, Extra Cheese)"
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
        </form>

        {/* Modal Footer: Sticky Bottom Bar with One Big Primary Button (Orange, never black) */}
        <div className="p-4 sm:p-5 border-t border-[#F0E4D7] bg-white shrink-0">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="w-full h-13 sm:h-14 py-3.5 px-6 rounded-2xl bg-[#F26B1D] hover:bg-[#D95A12] text-white font-bold text-base shadow-md shadow-orange-500/25 hover:shadow-lg transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <Check className="w-5 h-5 stroke-[2.5]" />
            <span>
              {isSubmitting
                ? 'Saving Dish...'
                : itemToEdit
                ? 'Update Dish'
                : 'Save Dish'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
