import React, { useState, useMemo } from 'react';
import {
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  } from 'lucide-react';
import {
  formatPKR,
  toPaisa,
  toRupees,
  formatPaisa,
  formatPhone,
} from '../../utils/currencyUtils';
import { customerKhataService } from '../../services/customerKhataService';

export default function ReceiveCustomerPaymentModal({
  customer,
  isOpen,
  onClose,
  restaurant,
  currentUser,
  onPaymentCompleted,
}) {
  const totalBalanceRupees = customer?.balance_due || toRupees(customer?.balance_due_paisa || 0);

  // Form State
  const [amount, setAmount] = useState(totalBalanceRupees > 0 ? String(totalBalanceRupees) : '');
  const [method, setMethod] = useState('cash'); // 'cash' | 'jazzcash' | 'easypaisa' | 'bank' | 'card'
  const [dateTime, setDateTime] = useState(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const local = new Date(now.getTime() - offset);
    return local.toISOString().slice(0, 16);
  });
  const [note, setNote] = useState('');
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [manualAllocations, setManualAllocations] = useState({});
  const [confirmAdvanceCredit, setConfirmAdvanceCredit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  React.useEffect(() => {
    if (isOpen && customer) {
      const bal = customer.balance_due || toRupees(customer.balance_due_paisa);
      setAmount(bal > 0 ? String(bal) : '');
      setNote('');
      setIsManualOverride(false);
      setManualAllocations({});
      setConfirmAdvanceCredit(false);
      setErrorMsg(null);
    }
  }, [customer, isOpen]);

  const enteredPaisa = toPaisa(amount);
  const isOverpayment = enteredPaisa > (customer?.balance_due_paisa || 0);
  const excessRupees = isOverpayment
    ? toRupees(enteredPaisa - (customer?.balance_due_paisa || 0))
    : 0;

  // Auto-calculated FIFO allocation preview
  const autoPreview = useMemo(() => {
    if (!isOpen || !customer) return { allocations: [], totalAllocatedPaisa: 0, unallocatedPaisa: 0, totalOrdersCount: 0 };
    return customerKhataService.previewPaymentAllocation(customer.orders || [], enteredPaisa);
  }, [isOpen, customer, enteredPaisa]);

  // Handle manual allocation amount changes
  const handleManualAllocChange = (orderId, newAllocRupees) => {
    setManualAllocations((prev) => ({
      ...prev,
      [orderId]: newAllocRupees,
    }));
  };

  // Compile final allocations to apply
  const finalAllocationsList = useMemo(() => {
    if (!isManualOverride) {
      return autoPreview.allocations;
    }
    return autoPreview.allocations.map((a) => {
      const customVal = manualAllocations[a.orderId];
      const allocPaisa = customVal !== undefined ? toPaisa(customVal) : a.allocatedPaisa;
      return {
        ...a,
        allocatedPaisa: allocPaisa,
        remainingAfterPaisa: Math.max(0, a.remainingBeforePaisa - allocPaisa),
      };
    });
  }, [isManualOverride, autoPreview.allocations, manualAllocations]);

  const totalAllocatedPaisa = finalAllocationsList.reduce((sum, a) => sum + (a.allocatedPaisa || 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (enteredPaisa <= 0) {
      setErrorMsg('Payment amount must be greater than zero.');
      return;
    }

    if (isOverpayment && !confirmAdvanceCredit) {
      setErrorMsg(
        `Entered payment (Rs. ${toRupees(enteredPaisa).toLocaleString()}) exceeds the total balance due (Rs. ${totalBalanceRupees.toLocaleString()}). Check the confirmation box to proceed.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const restId = restaurant?.id || 'rest-101';
      const recordedBy = currentUser?.name || currentUser?.email || 'Manager';

      const res = customerKhataService.applyCustomerPayment(
        restId,
        customer.phone,
        enteredPaisa,
        {
          method,
          date: new Date(dateTime).toISOString(),
          note: note.trim() || 'Customer Khata settlement payment',
          recorded_by: recordedBy,
        },
        isManualOverride ? finalAllocationsList : null
      );

      if (onPaymentCompleted) {
        onPaymentCompleted(res);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to apply customer payment');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !customer) return null;

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
        <div className="p-5 border-b border-[#F0E4D7] bg-[#FFF9F2] flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-extrabold text-[#2B2118] text-base sm:text-lg">
                Receive Payment • {customer.name}
              </span>
            </div>
            <p className="text-xs text-[#7A6A5C] flex items-center gap-1.5 mt-1 font-mono">
              <span>{formatPhone(customer.phone)}</span>
              <span>•</span>
              <span className="text-red-700 font-bold">
                Total Balance Due: {formatPKR(totalBalanceRupees)}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Amount & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-[#7A6A5C]">
                  Amount to Receive (Rs.) <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setAmount(String(totalBalanceRupees))}
                  className="text-[10px] font-bold text-[#F26B1D] hover:underline"
                >
                  Full Due
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  Rs.
                </span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#F0E4D7] bg-white text-xs font-mono font-bold focus:ring-2 focus:ring-[#F26B1D] focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#7A6A5C] mb-1 block">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#F0E4D7] bg-white text-xs font-semibold focus:ring-2 focus:ring-[#F26B1D] focus:outline-none"
              >
                <option value="cash">💵 Cash</option>
                <option value="jazzcash">📱 JazzCash</option>
                <option value="easypaisa">🟢 Easypaisa</option>
                <option value="bank">🏦 Bank Transfer</option>
                <option value="card">💳 Card (POS Terminal)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#7A6A5C] mb-1 block">
                Date & Time
              </label>
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#F0E4D7] bg-white text-xs font-mono focus:ring-2 focus:ring-[#F26B1D] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#7A6A5C] mb-1 block">
                Note / Payment Reference
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Cleared monthly tab"
                className="w-full px-3 py-2 rounded-xl border border-[#F0E4D7] bg-white text-xs focus:ring-2 focus:ring-[#F26B1D] focus:outline-none"
              />
            </div>
          </div>

          {/* Overpayment Warning */}
          {isOverpayment && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Overpayment: </span>
                  <span>
                    Rs. {toRupees(enteredPaisa).toLocaleString()} exceeds total balance due (Rs.{' '}
                    {totalBalanceRupees.toLocaleString()}) by{' '}
                    <strong>Rs. {excessRupees.toLocaleString()}</strong>.
                  </span>
                </div>
              </div>
              <label className="flex items-center gap-2 font-bold text-amber-950 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={confirmAdvanceCredit}
                  onChange={(e) => setConfirmAdvanceCredit(e.target.checked)}
                  className="w-4 h-4 text-[#F26B1D] rounded border-amber-400 focus:ring-[#F26B1D]"
                />
                <span>Confirm excess Rs. {excessRupees.toLocaleString()} as customer advance / credit</span>
              </label>
            </div>
          )}

          {/* FIFO Allocation Preview & Manual Override Header */}
          <div className="space-y-2 pt-2 border-t border-[#F0E4D7]">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[#2B2118] uppercase tracking-wider flex items-center gap-1.5">
                  <span>FIFO Order Allocation Preview</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 lowercase font-normal">
                    oldest orders first
                  </span>
                </h4>
                <p className="text-[11px] text-[#7A6A5C] mt-0.5">
                  Applies payment sequentially to oldest unpaid bills first.
                </p>
              </div>

              {/* Manual Override Toggle */}
              <button
                type="button"
                onClick={() => setIsManualOverride((prev) => !prev)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer border ${
                  isManualOverride
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                <Sliders className="w-3 h-3" />
                <span>{isManualOverride ? 'Manual Override ON' : 'Customize Allocation'}</span>
              </button>
            </div>

            {/* Allocation Table */}
            {finalAllocationsList.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                This customer has no unpaid orders currently pending.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-xl bg-white border border-slate-200 overflow-hidden text-xs">
                <div className="grid grid-cols-12 bg-slate-50 p-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <div className="col-span-3">Order / Date</div>
                  <div className="col-span-3 text-right">Remaining</div>
                  <div className="col-span-3 text-right">Allocated</div>
                  <div className="col-span-3 text-right">New Balance</div>
                </div>

                {finalAllocationsList.map((row) => (
                  <div key={row.orderId} className="grid grid-cols-12 p-2 items-center">
                    <div className="col-span-3">
                      <span className="font-mono font-bold text-[#2B2118]">#{row.orderNumber}</span>
                      <span className="block text-[10px] text-slate-400">
                        {new Date(row.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <div className="col-span-3 text-right font-mono text-slate-600">
                      {formatPaisa(row.remainingBeforePaisa)}
                    </div>

                    <div className="col-span-3 text-right font-mono">
                      {isManualOverride ? (
                        <input
                          type="number"
                          min="0"
                          max={toRupees(row.remainingBeforePaisa)}
                          value={
                            manualAllocations[row.orderId] !== undefined
                              ? manualAllocations[row.orderId]
                              : toRupees(row.allocatedPaisa)
                          }
                          onChange={(e) => handleManualAllocChange(row.orderId, e.target.value)}
                          className="w-20 px-1 py-0.5 rounded border border-slate-300 text-right font-bold text-xs"
                        />
                      ) : (
                        <span className="font-bold text-emerald-700">
                          {formatPaisa(row.allocatedPaisa)}
                        </span>
                      )}
                    </div>

                    <div className="col-span-3 text-right font-mono font-bold text-slate-800">
                      {formatPaisa(row.remainingAfterPaisa)}
                    </div>
                  </div>
                ))}

                <div className="grid grid-cols-12 p-2.5 bg-[#FFF9F2] font-bold text-xs border-t border-[#F0E4D7]">
                  <div className="col-span-6">Total Allocated to Orders:</div>
                  <div className="col-span-6 text-right font-mono text-[#F26B1D]">
                    {formatPaisa(totalAllocatedPaisa)}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || (isOverpayment && !confirmAdvanceCredit)}
              className="w-full py-3 px-4 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] active:scale-[0.99] disabled:opacity-50 text-white text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-orange-500/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'Applying...' : `Confirm & Apply Rs. ${toRupees(enteredPaisa).toLocaleString()}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
