import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Check, Package } from 'lucide-react';
import { formatPKR } from '../utils/currencyUtils';
import { getItemDealInfo, getItemVariants, getItemPricing } from '../utils/dealUtils';

export default function VariantCustomizationModal({ item, isOpen, onClose, onAddToCart, restaurant }) {
  const [quantity, setQuantity] = useState(1);
  const [choices, setChoices] = useState({});

  const primaryColor = restaurant?.primary_color || '#F26B1D';
  const dealInfo = getItemDealInfo(item);
  const itemIsDeal = Boolean(dealInfo);
  const variantsList = getItemVariants(item);
  const pricing = getItemPricing(item, restaurant);

  useEffect(() => {
    if (!item) return;
    const defaults = {};
    variantsList.forEach((vg) => {
      if (vg.type === 'single' && vg.options?.length > 0) {
        defaults[vg.id] = vg.options[0].id;
      } else if (vg.type === 'multi') {
        defaults[vg.id] = [];
      }
    });
    setChoices(defaults);
    setQuantity(1);
  }, [item]);

  if (!isOpen || !item) return null;

  const calculateUnitPrice = () => {
    let unit = Number(pricing.finalPrice || item.price);
    variantsList.forEach((vg) => {
      if (vg.type === 'single') {
        const selectedId = choices[vg.id];
        const opt = vg.options?.find((o) => o.id === selectedId);
        if (opt) unit += Number(opt.price_delta || 0);
      } else if (vg.type === 'multi') {
        const selectedIds = choices[vg.id] || [];
        selectedIds.forEach((id) => {
          const opt = vg.options?.find((o) => o.id === id);
          if (opt) unit += Number(opt.price_delta || 0);
        });
      }
    });
    return unit;
  };

  const unitPrice = calculateUnitPrice();
  const totalPrice = unitPrice * quantity;

  const handleSelectSingle = (groupId, optionId) => {
    setChoices((prev) => ({ ...prev, [groupId]: optionId }));
  };

  const handleToggleMulti = (groupId, optionId) => {
    setChoices((prev) => {
      const currentList = prev[groupId] || [];
      const updated = currentList.includes(optionId)
        ? currentList.filter((id) => id !== optionId)
        : [...currentList, optionId];
      return { ...prev, [groupId]: updated };
    });
  };

  const handleConfirm = () => {
    const choiceDetails = [];
    variantsList.forEach((vg) => {
      if (vg.type === 'single') {
        const opt = vg.options?.find((o) => o.id === choices[vg.id]);
        if (opt) choiceDetails.push(`${vg.name}: ${opt.name}`);
      } else if (vg.type === 'multi') {
        const selectedOpts = (choices[vg.id] || [])
          .map((id) => vg.options?.find((o) => o.id === id)?.name)
          .filter(Boolean);
        if (selectedOpts.length > 0) {
          choiceDetails.push(`${vg.name}: ${selectedOpts.join(', ')}`);
        }
      }
    });

    onAddToCart({
      item,
      quantity,
      unitPrice,
      choices,
      choiceDetails,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#2B2118]/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-white border border-[#F0E4D7] rounded-t-3xl sm:rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#F0E4D7] flex items-start justify-between sticky top-0 bg-white z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {itemIsDeal && (
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg bg-[#FEF3D9] text-[#B87000] border border-[#FCE1A8]">
                  🔥 {dealInfo.badge || 'Deal'}
                </span>
              )}
              <h3 className="text-base font-heading font-extrabold text-[#2B2118] tracking-tight leading-snug">
                {item.title}
              </h3>
            </div>
            <div className="flex items-baseline gap-2">
              {/* 1. DISCOUNTED / SELLING PRICE FIRST */}
              <p className="text-base text-[#2B2118] font-mono font-extrabold">
                {formatPKR(pricing.finalPrice)}
              </p>
              {/* 2. THEN ORIGINAL PRICE STRIKETHROUGH */}
              {pricing.hasDiscount && (
                <span className="text-xs text-[#9E8E81] line-through font-mono">
                  {formatPKR(pricing.originalPrice)}
                </span>
              )}
              {pricing.hasDiscount && (
                <span className="text-[10px] font-bold text-[#1F9D55] bg-[#E7F6EC] border border-[#C0E9CE] px-2 py-0.5 rounded-md">
                  Save {formatPKR(pricing.savings)} ({pricing.discountPercent}% off)
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#FFF9F2] hover:bg-[#FFF1E6] text-[#7A6A5C] hover:text-[#2B2118] border border-[#F0E4D7] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Customizations */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 bg-[#FFF9F2]/30">
          {/* Deal Bundle Contents Callout */}
          {itemIsDeal && dealInfo.deal_items && (
            <div className="p-3 rounded-2xl bg-[#FEF3D9] border border-[#FCE1A8] text-xs text-[#2B2118] flex items-start gap-2.5">
              <Package className="w-4 h-4 text-[#F5A623] shrink-0 mt-0.5" />
              <div>
                <strong className="block text-[11px] font-bold text-[#B87000] uppercase tracking-wider mb-0.5">
                  Package Includes:
                </strong>
                <span className="text-[#2B2118] text-xs leading-relaxed font-medium">
                  {dealInfo.deal_items}
                </span>
              </div>
            </div>
          )}

          {variantsList.length > 0 ? (
            variantsList.map((vg) => {
              const isSingle = vg.type === 'single';

              return (
                <div key={vg.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2B2118]">
                      {vg.name}
                    </span>
                    <span className="text-[10px] font-medium text-[#7A6A5C]">
                      {isSingle ? 'Choose 1' : 'Optional add-ons'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {vg.options?.map((opt) => {
                      const isSelected = isSingle
                        ? choices[vg.id] === opt.id
                        : (choices[vg.id] || []).includes(opt.id);

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            isSingle
                              ? handleSelectSingle(vg.id, opt.id)
                              : handleToggleMulti(vg.id, opt.id)
                          }
                          className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                            isSelected
                              ? 'bg-[#FFF1E6] border-[#F26B1D] text-[#2B2118] shadow-2xs'
                              : 'bg-white border-[#F0E4D7] text-[#7A6A5C] hover:border-[#FCD8BF]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-4 h-4 ${isSingle ? 'rounded-full' : 'rounded-md'} border flex items-center justify-center ${
                                isSelected
                                  ? 'border-[#F26B1D] bg-[#F26B1D] text-white'
                                  : 'border-[#F0E4D7] bg-white'
                              }`}
                              style={isSelected ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                            <span className="text-xs font-semibold text-[#2B2118]">{opt.name}</span>
                          </div>

                          <span className="text-xs font-mono font-bold text-[#F26B1D]" style={{ color: primaryColor }}>
                            {Number(opt.price_delta) > 0
                              ? `+${formatPKR(opt.price_delta)}`
                              : 'Included'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-[#7A6A5C] text-center py-2">
              Ready to add to your order.
            </p>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[#F0E4D7] bg-white space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7A6A5C]">Quantity</span>
            <div className="flex items-center gap-2.5 bg-[#FFF9F2] border border-[#F0E4D7] px-2.5 py-1 rounded-xl shadow-2xs">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="text-[#7A6A5C] hover:text-[#2B2118] transition cursor-pointer p-0.5"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-bold text-[#2B2118] font-mono text-xs w-4 text-center">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="text-[#7A6A5C] hover:text-[#2B2118] transition cursor-pointer p-0.5"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            style={{ backgroundColor: primaryColor }}
            className="w-full py-3 px-4 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-between transition cursor-pointer hover:brightness-95 active:scale-[0.99]"
          >
            <span>
              {itemIsDeal ? 'Choose Deal' : 'Add to Order'} ({quantity})
            </span>
            <span className="font-mono font-extrabold">{formatPKR(totalPrice)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
