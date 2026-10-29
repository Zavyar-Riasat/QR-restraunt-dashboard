import React, { useState } from 'react';
import { X, User, Phone, MapPin, AlertCircle } from 'lucide-react';
import { toPaisa, toRupees } from '../../utils/currencyUtils';

export default function CustomerFormModal({
  isOpen,
  onClose,
  customer = null,
  onSave,
}) {
  const [name, setName] = useState(customer?.name || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [address, setAddress] = useState(customer?.address || '');
  const [notes, setNotes] = useState(customer?.notes || '');
  const [creditLimit, setCreditLimit] = useState(
    customer?.credit_limit_paisa ? String(toRupees(customer.credit_limit_paisa)) : (customer?.credit_limit ? String(customer.credit_limit) : '')
  );
  const [dueDate, setDueDate] = useState(() => {
    if (customer?.due_date) {
      return customer.due_date.slice(0, 10);
    }
    return '';
  });
  const [errorMsg, setErrorMsg] = useState(null);

  React.useEffect(() => {
    if (isOpen) {
      setName(customer?.name || '');
      setPhone(customer?.phone || '');
      setAddress(customer?.address || '');
      setNotes(customer?.notes || '');
      setCreditLimit(
        customer?.credit_limit_paisa ? String(toRupees(customer.credit_limit_paisa)) : (customer?.credit_limit ? String(customer.credit_limit) : '')
      );
      setDueDate(customer?.due_date ? customer.due_date.slice(0, 10) : '');
      setErrorMsg(null);
    }
  }, [customer, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Customer name is required.');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      setErrorMsg('Please enter a valid customer phone number.');
      return;
    }

    setErrorMsg(null);
    onSave({
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      notes: notes.trim(),
      credit_limit_paisa: creditLimit ? toPaisa(creditLimit) : 0,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-[#F0E4D7] bg-[#FFF9F2] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-[#F26B1D]" />
            <h3 className="font-extrabold text-base text-[#2B2118]">
              {customer ? 'Edit Customer Profile' : 'Add New Customer'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-[#7A6A5C] block mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tariq Mehmood"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#F26B1D] focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#7A6A5C] block mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 03001234567"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-[#F26B1D] focus:outline-none"
                required
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Used to automatically link orders and merge duplicate customer profiles.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-[#7A6A5C] block mb-1">
              Delivery / Billing Address
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. House #14, Street 5, Sector G-11/3, Islamabad"
                rows={2}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs resize-none focus:ring-2 focus:ring-[#F26B1D] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[#7A6A5C] block mb-1">
                Credit Limit (Rs.)
              </label>
              <div className="relative">
                <span className="text-xs font-bold text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
                  Rs.
                </span>
                <input
                  type="number"
                  min="0"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder="Optional limit"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-[#F26B1D] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#7A6A5C] block mb-1">
                Payment Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-[#F26B1D] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#7A6A5C] block mb-1">
              Notes / Khata Terms
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Clears balance at month end"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#F26B1D] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs font-bold transition cursor-pointer shadow-xs"
            >
              {customer ? 'Save Changes' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
