import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Banknote,
  DollarSign,
  AlertTriangle,
  Clock,
  User,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
} from 'lucide-react';
import {
  formatPKR,
  toPaisa,
  toRupees,
  formatPaisa,
  computeOrderPaymentState,
  formatPhone,
} from '../../utils/currencyUtils';
import { customerKhataService } from '../../services/customerKhataService';

export default function RecordPaymentModal({
  order,
  isOpen,
  onClose,
  restaurant,
  currentUser,
  onPaymentRecorded,
}) {
  const paymentState = computeOrderPaymentState(order || {});
  const remainingRupees = paymentState.remainingBalance;

  // New Payment Form State
  const [amount, setAmount] = useState(remainingRupees > 0 ? String(remainingRupees) : '');
  const [method, setMethod] = useState('cash'); // 'cash' | 'jazzcash' | 'easypaisa' | 'bank' | 'card'
  const [dateTime, setDateTime] = useState(() => {
    const now = new Date();
    // Format YYYY-MM-DDTHH:mm for datetime-local
    const offset = now.getTimezoneOffset() * 60000;
    const local = new Date(now.getTime() - offset);
    return local.toISOString().slice(0, 16);
  });
  const [note, setNote] = useState('');
  const [confirmAdvanceCredit, setConfirmAdvanceCredit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Edit / Void Sub-Modals
  const [editingPayment, setEditingPayment] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editReason, setEditReason] = useState('');

  const [voidingPayment, setVoidingPayment] = useState(null);
  const [voidReason, setVoidReason] = useState('');

  React.useEffect(() => {
    if (isOpen && order) {
      const state = computeOrderPaymentState(order);
      setAmount(state.remainingBalance > 0 ? String(state.remainingBalance) : '');
      setNote('');
      setConfirmAdvanceCredit(false);
      setErrorMsg(null);
      setEditingPayment(null);
      setVoidingPayment(null);
    }
  }, [order, isOpen]);

  // Check if current amount input exceeds remaining balance
  const enteredPaisa = toPaisa(amount);
  const isOverpayment = enteredPaisa > paymentState.remainingBalancePaisa;
  const excessRupees = isOverpayment
    ? toRupees(enteredPaisa - paymentState.remainingBalancePaisa)
    : 0;

  const handleAddPayment = (e) => {
    e.preventDefault();
    setErrorMsg(null);

    const valPaisa = toPaisa(amount);
    if (valPaisa <= 0) {
      setErrorMsg('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (isOverpayment && !confirmAdvanceCredit) {
      setErrorMsg(
        `Amount exceeds remaining balance by Rs. ${excessRupees.toLocaleString()}. Please check the confirmation box to record this as customer advance / credit.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const restId = restaurant?.id || order.restaurant_id || 'rest-101';
      const recordedBy = currentUser?.name || currentUser?.email || 'Manager';

      const res = customerKhataService.addOrderPayment(restId, order.id, {
        amount_paisa: valPaisa,
        method,
        date: new Date(dateTime).toISOString(),
        note,
        recorded_by: recordedBy,
        advance_credit_accepted: confirmAdvanceCredit,
      });

      if (!res.success && res.requiresConfirmation) {
        setErrorMsg(res.message);
        setSubmitting(false);
        return;
      }

      if (onPaymentRecorded) {
        onPaymentRecorded(res.order);
      }

      // Reset form
      setAmount('');
      setNote('');
      setConfirmAdvanceCredit(false);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEditPayment = () => {
    if (!editingPayment) return;
    if (!editReason.trim()) {
      alert('Please provide a reason for modifying this payment.');
      return;
    }
    const newAmtPaisa = toPaisa(editAmount);
    if (newAmtPaisa <= 0) {
      alert('Payment amount must be greater than zero.');
      return;
    }

    try {
      const restId = restaurant?.id || order.restaurant_id || 'rest-101';
      const editedBy = currentUser?.name || currentUser?.email || 'Manager';

      const res = customerKhataService.editOrderPayment(
        restId,
        order.id,
        editingPayment.id,
        newAmtPaisa,
        editReason,
        editedBy
      );

      if (onPaymentRecorded) {
        onPaymentRecorded(res.order);
      }
      setEditingPayment(null);
      setEditAmount('');
      setEditReason('');
    } catch (err) {
      alert(`Error editing payment: ${err.message}`);
    }
  };

  const handleConfirmVoidPayment = () => {
    if (!voidingPayment) return;
    if (!voidReason.trim()) {
      alert('Please provide a mandatory reason for voiding this payment.');
      return;
    }

    try {
      const restId = restaurant?.id || order.restaurant_id || 'rest-101';
      const voidedBy = currentUser?.name || currentUser?.email || 'Manager';

      const res = customerKhataService.voidOrderPayment(
        restId,
        order.id,
        voidingPayment.id,
        voidReason,
        voidedBy
      );

      if (onPaymentRecorded) {
        onPaymentRecorded(res.order);
      }
      setVoidingPayment(null);
      setVoidReason('');
    } catch (err) {
      alert(`Error voiding payment: ${err.message}`);
    }
  };

  if (!isOpen || !order) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#F0E4D7] bg-[#FFF9F2] flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-extrabold text-[#2B2118] text-base sm:text-lg">
                Payment • Order #{order.id}
              </span>
              {/* Payment status badge */}
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                  paymentState.paymentStatus === 'paid'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : paymentState.paymentStatus === 'partial'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-red-100 text-red-800 border border-red-300'
                }`}
              >
                {paymentState.paymentStatus === 'paid' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Paid</span>
                  </>
                ) : paymentState.paymentStatus === 'partial' ? (
                  <>
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Partial</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                    <span>Unpaid</span>
                  </>
                )}
              </span>
            </div>

            <p className="text-xs text-[#7A6A5C] flex items-center gap-1.5 mt-1">
              <User className="w-3.5 h-3.5 text-[#9E8E81]" />
              <span className="font-semibold text-[#2B2118]">{order.customer_name || 'Customer'}</span>
              {order.customer_phone && (
                <span className="font-mono text-[#7A6A5C]">({formatPhone(order.customer_phone)})</span>
              )}
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

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Financial Breakdown Cards */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Order Total
              </span>
              <span className="text-sm sm:text-base font-black text-slate-900 font-mono mt-0.5 block">
                {formatPKR(paymentState.totalPayable)}
              </span>
            </div>

            <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200">
              <span className="text-[10px] sm:text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                Amount Paid
              </span>
              <span className="text-sm sm:text-base font-black text-emerald-800 font-mono mt-0.5 block">
                {formatPKR(paymentState.amountPaid)}
              </span>
            </div>

            <div
              className={`p-3 sm:p-3.5 rounded-2xl border ${
                paymentState.remainingBalancePaisa > 0
                  ? 'bg-red-50/80 border-red-200 text-red-900'
                  : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
              }`}
            >
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider block opacity-80">
                Remaining
              </span>
              <span className="text-sm sm:text-base font-black font-mono mt-0.5 block">
                {formatPKR(paymentState.remainingBalance)}
              </span>
            </div>
          </div>

          {/* Add Payment Form */}
          <form onSubmit={handleAddPayment} className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#2B2118] uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-[#F26B1D]" />
                <span>Add Payment</span>
              </h4>
              {paymentState.remainingBalancePaisa > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(paymentState.remainingBalance))}
                  className="text-[11px] font-bold text-[#F26B1D] hover:underline cursor-pointer"
                >
                  Pay Remaining (Rs. {paymentState.remainingBalance.toLocaleString()})
                </button>
              )}
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Amount */}
              <div>
                <label className="text-[11px] font-bold text-[#7A6A5C] mb-1 block">
                  Amount (Rs.) <span className="text-red-500">*</span>
                </label>
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
                    placeholder="e.g. 1500"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#F0E4D7] bg-white text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#F26B1D]"
                    required
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-[11px] font-bold text-[#7A6A5C] mb-1 block">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#F0E4D7] bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#F26B1D]"
                >
                  <option value="cash">💵 Cash</option>
                  <option value="jazzcash">📱 JazzCash</option>
                  <option value="easypaisa">🟢 Easypaisa</option>
                  <option value="bank">🏦 Bank Transfer</option>
                  <option value="card">💳 Card (POS Terminal)</option>
                </select>
              </div>

              {/* Date & Time */}
              <div>
                <label className="text-[11px] font-bold text-[#7A6A5C] mb-1 block">
                  Date and Time
                </label>
                <input
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#F0E4D7] bg-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#F26B1D]"
                />
              </div>

              {/* Note */}
              <div>
                <label className="text-[11px] font-bold text-[#7A6A5C] mb-1 block">
                  Optional Note / Reference
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Cashier deposit, TRX# 123"
                  className="w-full px-3 py-2 rounded-xl border border-[#F0E4D7] bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#F26B1D]"
                />
              </div>
            </div>

            {/* Overpayment Confirmation Warning */}
            {isOverpayment && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Overpayment detected: </span>
                    <span>
                      Entered Rs. {toRupees(enteredPaisa).toLocaleString()} exceeds the remaining balance (Rs.{' '}
                      {paymentState.remainingBalance.toLocaleString()}) by{' '}
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
                  <span>Confirm and credit excess Rs. {excessRupees.toLocaleString()} as customer advance</span>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || (isOverpayment && !confirmAdvanceCredit)}
              className="w-full py-2.5 px-4 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] active:scale-[0.99] disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-orange-500/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'Recording...' : 'Record Payment'}</span>
            </button>
          </form>

          {/* Payment History & Audit Trail */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-[#7A6A5C] uppercase tracking-wider flex items-center justify-between">
              <span>Payment History & Audit Trail</span>
              <span className="text-[11px] font-normal font-mono">
                {order.payments?.length || (paymentState.amountPaidPaisa > 0 ? 1 : 0)} transaction(s)
              </span>
            </h4>

            {(!order.payments || order.payments.length === 0) && paymentState.amountPaidPaisa === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                No payments have been recorded for this order yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-2xs">
                {(order.payments || []).map((pay) => (
                  <div
                    key={pay.id}
                    className={`p-3.5 space-y-1.5 ${
                      pay.is_void ? 'bg-red-50/50 opacity-70' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {formatPaisa(pay.amount_paisa || toPaisa(pay.amount))}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold uppercase font-mono">
                          {pay.method}
                        </span>
                        {pay.is_void && (
                          <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-800 text-[10px] font-bold uppercase border border-red-200">
                            Voided
                          </span>
                        )}
                      </div>

                      {/* Edit / Void Buttons */}
                      {!pay.is_void && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPayment(pay);
                              setEditAmount(String(toRupees(pay.amount_paisa || toPaisa(pay.amount))));
                              setEditReason('');
                            }}
                            className="p-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Edit this payment"
                          >
                            <Edit2 className="w-3 h-3 text-slate-500" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setVoidingPayment(pay);
                              setVoidReason('');
                            }}
                            className="p-1 px-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer border border-red-200"
                            title="Void this payment"
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                            <span>Void</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span>{new Date(pay.date || pay.created_at).toLocaleString('en-PK')}</span>
                        {pay.recorded_by && (
                          <span>• By {pay.recorded_by}</span>
                        )}
                      </div>
                      {pay.note && (
                        <span className="italic text-slate-600">Note: {pay.note}</span>
                      )}
                    </div>

                    {/* Void Reason Audit */}
                    {pay.is_void && pay.void_reason && (
                      <div className="p-2 rounded-lg bg-red-100/70 text-red-900 text-[11px]">
                        <strong>Voided: </strong>
                        <span>{pay.void_reason} (by {pay.voided_by || 'Staff'} at {new Date(pay.voided_at).toLocaleTimeString()})</span>
                      </div>
                    )}

                    {/* Edit History Audit */}
                    {pay.edit_history && pay.edit_history.length > 0 && (
                      <div className="p-2 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 text-[10px] space-y-0.5">
                        <span className="font-bold block">Audit Trail:</span>
                        {pay.edit_history.map((hist, hIdx) => (
                          <div key={hIdx}>
                            • Changed from Rs. {hist.previous_amount} to Rs. {hist.new_amount} by {hist.edited_by}: &quot;{hist.reason}&quot; ({new Date(hist.edited_at).toLocaleTimeString()})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#F0E4D7] bg-[#FFF9F2] flex items-center justify-between">
          <div className="text-xs text-[#7A6A5C]">
            Khata & Balance tracked automatically in integer paisa
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      {/* Edit Payment Sub-Modal */}
      {editingPayment && (
        <div
          className="fixed inset-0 z-60 bg-slate-950/70 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setEditingPayment(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Edit2 className="w-4 h-4 text-[#F26B1D]" />
                <span>Edit Payment Amount</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingPayment(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  New Amount (Rs.)
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Reason for Modification <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="e.g. Corrected cash typing error"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs resize-none"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingPayment(null)}
                className="px-3 py-1.5 rounded-xl border text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditPayment}
                className="px-4 py-1.5 rounded-xl bg-[#F26B1D] text-white text-xs font-bold hover:bg-[#D95A12]"
              >
                Save Modification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Payment Sub-Modal */}
      {voidingPayment && (
        <div
          className="fixed inset-0 z-60 bg-slate-950/70 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setVoidingPayment(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-red-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-red-700 flex items-center gap-1.5">
                <Trash2 className="w-4 h-4 text-red-600" />
                <span>Void Payment</span>
              </h3>
              <button
                type="button"
                onClick={() => setVoidingPayment(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to void this payment of{' '}
              <strong className="font-mono text-slate-900">
                {formatPaisa(voidingPayment.amount_paisa || toPaisa(voidingPayment.amount))}
              </strong>
              ? This action will adjust the customer balance and be recorded in the audit trail.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Reason for Voiding <span className="text-red-500">*</span>
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g. Accidental duplicate entry, customer cancelled payment"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs resize-none"
                rows={2}
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setVoidingPayment(null)}
                className="px-3 py-1.5 rounded-xl border text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmVoidPayment}
                className="px-4 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700"
              >
                Confirm Void
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
