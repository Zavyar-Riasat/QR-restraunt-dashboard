import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  } from 'lucide-react';
import {
  cashFlowService,
  CASH_IN_CATEGORIES,
  CASH_OUT_CATEGORIES,
  PAYMENT_METHODS,
} from '../../services/cashFlowService';

export default function RecordCashFlowModal({
  isOpen,
  onClose,
  initialType = 'in', // 'in' | 'out'
  entryToEdit = null,
  restaurant,
  currentUser,
  onSaved,
}) {
  const [type, setType] = useState(initialType);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [sourceRecipient, setSourceRecipient] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [entryDate, setEntryDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [errorMsg, setErrorMsg] = useState(null);

  // Sync state when editing or opening
  useEffect(() => {
    if (entryToEdit) {
      setType(entryToEdit.type || 'in');
      setAmount(String(entryToEdit.amount || ''));
      setCategory(entryToEdit.category || '');
      setSourceRecipient(entryToEdit.source_recipient || '');
      setDescription(entryToEdit.description || '');
      setPaymentMethod(entryToEdit.payment_method || 'cash');
      setReferenceNo(entryToEdit.reference_no || '');
      if (entryToEdit.date) {
        const d = new Date(entryToEdit.date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        setEntryDate(d.toISOString().slice(0, 16));
      }
    } else {
      setType(initialType || 'in');
      setAmount('');
      const defaultCat = (initialType || 'in') === 'in' ? 'capital' : 'inventory';
      setCategory(defaultCat);
      setSourceRecipient('');
      setDescription('');
      setPaymentMethod('cash');
      setReferenceNo('');
      const d = new Date();
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      setEntryDate(d.toISOString().slice(0, 16));
    }
    setErrorMsg(null);
  }, [entryToEdit, initialType, isOpen]);

  // When type changes, update default category
  const handleTypeChange = (newType) => {
    setType(newType);
    const cats = newType === 'in' ? CASH_IN_CATEGORIES : CASH_OUT_CATEGORIES;
    setCategory(cats[0].id);
  };

  const handleQuickAddAmount = (addVal) => {
    const current = Number(amount) || 0;
    setAmount(String(current + addVal));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than Rs. 0');
      return;
    }

    const restId = restaurant?.id || 'rest-101';
    const payload = {
      type,
      amount: numAmount,
      category,
      source_recipient: sourceRecipient.trim(),
      description: description.trim(),
      payment_method: paymentMethod,
      reference_no: referenceNo.trim(),
      recorded_by: currentUser?.name || currentUser?.email || 'Owner',
      date: new Date(entryDate).toISOString(),
    };

    try {
      if (entryToEdit) {
        cashFlowService.updateEntry(restId, entryToEdit.id, payload);
      } else {
        cashFlowService.addEntry(restId, payload);
      }
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save entry');
    }
  };

  if (!isOpen) return null;

  const activeCategories = type === 'in' ? CASH_IN_CATEGORIES : CASH_OUT_CATEGORIES;
  const isCashIn = type === 'in';

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-5 border-b flex items-center justify-between gap-3 ${
          isCashIn
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : 'bg-rose-50/70 border-rose-200 text-rose-950'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md ${
              isCashIn
                ? 'bg-emerald-600 shadow-emerald-600/30'
                : 'bg-rose-600 shadow-rose-600/30'
            }`}>
              {isCashIn ? (
                <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
              ) : (
                <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                {entryToEdit ? 'Edit Transaction' : isCashIn ? 'Record Cash In (Money In)' : 'Record Cash Out (Expense / Money Out)'}
              </h2>
              <p className="text-xs opacity-75 font-medium">
                {isCashIn
                  ? 'Record money put into business, capital investment, or sales revenue'
                  : 'Record payments for groceries, utilities, wages, or expenses'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-bold">
              {errorMsg}
            </div>
          )}

          {/* Type Toggle: Cash In vs Cash Out */}
          {!entryToEdit && (
            <div className="grid grid-cols-2 p-1 bg-[#FFF9F2] rounded-2xl border border-[#F0E4D7] gap-1">
              <button
                type="button"
                onClick={() => handleTypeChange('in')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  isCashIn
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-[#7A6A5C] hover:text-[#2B2118]'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>+ Cash In (Money In)</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('out')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  !isCashIn
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-[#7A6A5C] hover:text-[#2B2118]'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>- Cash Out (Money Out)</span>
              </button>
            </div>
          )}

          {/* Amount Input & Quick Shortcuts */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
              Amount (Rs.) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 font-mono">
                Rs.
              </span>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-slate-300 text-base font-bold font-mono text-[#2B2118] focus:outline-none focus:ring-2 focus:ring-[#F26B1D]"
                autoFocus
              />
            </div>

            {/* Quick Amount Add Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Quick:</span>
              {[500, 1000, 2000, 5000, 10000, 20000].map((quickVal) => (
                <button
                  key={quickVal}
                  type="button"
                  onClick={() => handleQuickAddAmount(quickVal)}
                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[10px] font-bold transition cursor-pointer"
                >
                  +{quickVal.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Category Selection */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-xs font-bold text-[#2B2118] bg-white focus:outline-none focus:ring-2 focus:ring-[#F26B1D] cursor-pointer"
            >
              {activeCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label} ({cat.description})
                </option>
              ))}
            </select>
          </div>

          {/* Source / Recipient (e.g. Supplier Name or Cash Source) */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
              {isCashIn ? 'Received From / Cash Source' : 'Paid To / Vendor / Recipient'}
            </label>
            <input
              type="text"
              value={sourceRecipient}
              onChange={(e) => setSourceRecipient(e.target.value)}
              placeholder={isCashIn ? 'e.g. Owner Capital, Cashier Register, Metro Refund' : 'e.g. Al-Rehman Chicken Supplier, WAPDA, Chef Tariq'}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-[#2B2118] focus:outline-none focus:ring-2 focus:ring-[#F26B1D]"
            />
          </div>

          {/* Note / Description */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
              Description / Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isCashIn ? 'Details of funds added...' : 'e.g. 20kg chicken fillets, 5kg oil, and fresh buns...'}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-[#2B2118] focus:outline-none focus:ring-2 focus:ring-[#F26B1D] resize-none"
            />
          </div>

          {/* 3-Column: Payment Mode, Reference #, Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Payment Mode */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                Payment Mode
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#F26B1D] cursor-pointer"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Reference / Invoice # */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                Receipt / Bill # (Optional)
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="e.g. INV-1049"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-[#2B2118] focus:outline-none focus:ring-2 focus:ring-[#F26B1D]"
              />
            </div>

            {/* Date & Time */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                Date & Time
              </label>
              <input
                type="datetime-local"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-[11px] text-[#2B2118] focus:outline-none focus:ring-2 focus:ring-[#F26B1D]"
              />
            </div>
          </div>

          {/* Bottom Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2.5 rounded-xl text-white font-black shadow-md transition cursor-pointer flex items-center gap-1.5 ${
                isCashIn
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{entryToEdit ? 'Save Changes' : isCashIn ? 'Add Cash In' : 'Record Cash Out'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
