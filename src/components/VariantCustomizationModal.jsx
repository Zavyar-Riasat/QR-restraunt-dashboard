import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Check, Package } from 'lucide-react';
import { formatPKR } from '../utils/currencyUtils';
import { getItemDealInfo, getItemVariants } from '../utils/dealUtils';

export default function VariantCustomizationModal({ item, isOpen, onClose, onAddToCart }) {
  if (!isOpen || !item) return null;

  const [quantity, setQuantity] = useState(1);
  const [choices, setChoices] = useState({});

  const dealInfo = getItemDealInfo(item);
  const itemIsDeal = Boolean(dealInfo);
  const variantsList = getItemVariants(item);

  useEffect(() => {
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

  const calculateUnitPrice = () => {
    let unit = Number(item.price);
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
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between sticky top-0 bg-white z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {itemIsDeal && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200/80">
                  {dealInfo.badge || 'Deal'}
                </span>
              )}
              <h3 className="text-base font-heading font-bold text-slate-900 tracking-tight leading-snug">
                {item.title}
              </h3>
            </div>
            <div className="flex items-baseline gap-2">
              {itemIsDeal && dealInfo.original_price > item.price && (
                <span className="text-xs text-slate-400 line-through font-mono">
                  {formatPKR(dealInfo.original_price)}
                </span>
              )}
              <p className="text-sm text-slate-900 font-mono font-bold">
                {formatPKR(item.price)}
              </p>
              {itemIsDeal && dealInfo.original_price > item.price && (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                  Save {formatPKR(dealInfo.original_price - item.price)}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Customizations */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Deal Bundle Contents Callout */}
          {itemIsDeal && dealInfo.deal_items && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-150 text-xs text-slate-700 flex items-start gap-2">
              <Package className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-[11px] font-medium text-slate-900 mb-0.5">
                  Package Includes:
                </strong>
                <span className="text-slate-600 text-xs leading-relaxed">
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
                    <span className="text-xs font-semibold text-slate-700">
                      {vg.name}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">
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
                              ? 'bg-slate-50 border-slate-900 text-slate-900'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-3.5 h-3.5 ${isSingle ? 'rounded-full' : 'rounded-md'} border flex items-center justify-center ${
                                isSelected
                                  ? 'border-slate-900 bg-slate-900 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                            <span className="text-xs font-medium">{opt.name}</span>
                          </div>

                          <span className="text-xs font-mono font-medium text-slate-600">
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
            <p className="text-xs text-slate-400 text-center py-2">
              Ready to add to your order.
            </p>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Quantity</span>
            <div className="flex items-center gap-2.5 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-2xs">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="text-slate-400 hover:text-slate-800 transition cursor-pointer p-0.5"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-bold text-slate-900 font-mono text-xs w-4 text-center">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="text-slate-400 hover:text-slate-800 transition cursor-pointer p-0.5"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            className="w-full py-2.5 px-4 rounded-xl text-white font-semibold text-xs shadow-xs flex items-center justify-between transition cursor-pointer bg-slate-900 hover:bg-slate-800"
          >
            <span>
              {itemIsDeal ? 'Choose Deal' : 'Add to Order'} ({quantity})
            </span>
            <span className="font-mono font-bold">{formatPKR(totalPrice)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
