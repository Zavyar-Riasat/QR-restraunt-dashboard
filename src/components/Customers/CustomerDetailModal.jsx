import React, { useState } from 'react';
import {
  X,
  Phone,
  MapPin,
  Clock,
  User,
  CreditCard,
  AlertTriangle,
  Calendar,
  Printer,
  Download,
  Share2,
  FileText,
  DollarSign,
  Edit2,
  Package,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';
import {
  formatPKR,
  formatPaisa,
  formatPhone,
  toRupees,
} from '../../utils/currencyUtils';
import { customerKhataService } from '../../services/customerKhataService';
import ReceiveCustomerPaymentModal from './ReceiveCustomerPaymentModal';
import CustomerStatementPrintModal from './CustomerStatementPrintModal';
import CustomerFormModal from './CustomerFormModal';

export default function CustomerDetailModal({
  customer,
  isOpen,
  onClose,
  restaurant,
  currentUser,
  onCustomerUpdated,
  onViewOrder,
}) {
  const [activeSubTab, setActiveSubTab] = useState('ledger'); // 'ledger' | 'orders'
  const [isReceivePaymentOpen, setIsReceivePaymentOpen] = useState(false);
  const [isStatementPrintOpen, setIsStatementPrintOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  if (!isOpen || !customer) return null;

  const restId = restaurant?.id || 'rest-101';
  const ledgerData = customerKhataService.getCustomerLedger(restId, customer.phone);
  const { lineItems, summary } = ledgerData;

  const isCreditExceeded = customer.credit_limit_paisa > 0 && customer.balance_due_paisa > customer.credit_limit_paisa;
  const isOverdue = customer.is_overdue;

  const handleShare = async () => {
    const text = customerKhataService.generateShareStatementText(
      restId,
      customer.phone,
      restaurant?.name || 'Restaurant'
    );
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Khata Statement - ${customer.name}`,
          text,
        });
        return;
      } catch (e) {}
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      alert('Statement copied to clipboard!');
    }
  };

  const handleDownloadCSV = () => {
    const csvContent = customerKhataService.exportCustomerLedgerCSV(
      restId,
      customer.phone,
      restaurant?.name || 'Restaurant'
    );
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Khata_Statement_${customer.name.replace(/\s+/g, '_')}_${customer.phone}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#F0E4D7] bg-[#FFF9F2] flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-[#2B2118]">
                {customer.name}
              </h2>
              {isOverdue && (
                <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 text-xs font-black uppercase tracking-wider animate-pulse">
                  ⚠️ Overdue Balance
                </span>
              )}
              {isCreditExceeded && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black uppercase tracking-wider">
                  Credit Limit Exceeded
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-[#7A6A5C] flex-wrap">
              {customer.phone && (
                <a
                  href={`tel:+${customer.phone.replace(/\D/g, '')}`}
                  className="font-mono font-bold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{formatPhone(customer.phone)}</span>
                </a>
              )}
              {customer.address && (
                <span className="flex items-center gap-1 truncate max-w-xs">
                  <MapPin className="w-3.5 h-3.5 text-[#F26B1D] shrink-0" />
                  <span>{customer.address}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsEditProfileOpen(true)}
              className="p-2 rounded-xl bg-white border border-[#F0E4D7] text-[#7A6A5C] hover:text-[#2B2118] hover:bg-slate-50 transition cursor-pointer"
              title="Edit Profile"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Balance & Action Buttons Bar */}
        <div className="p-4 sm:p-5 bg-white border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="p-3 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] min-w-[150px]">
              <span className="text-[10px] font-bold text-[#7A6A5C] uppercase tracking-wider block">
                Total Balance Due
              </span>
              <span className={`text-xl sm:text-2xl font-black font-mono block mt-0.5 ${
                customer.balance_due_paisa > 0 ? 'text-red-600' : 'text-emerald-700'
              }`}>
                {formatPKR(summary.currentBalance || customer.balance_due)}
              </span>
            </div>

            <div className="space-y-1 text-xs text-[#7A6A5C]">
              <div>
                Credit Limit:{' '}
                <strong className="text-[#2B2118] font-mono">
                  {customer.credit_limit_paisa > 0 ? formatPaisa(customer.credit_limit_paisa) : 'No Limit'}
                </strong>
              </div>
              {customer.due_date && (
                <div>
                  Due Date:{' '}
                  <strong className={`font-mono ${isOverdue ? 'text-red-600 font-bold' : 'text-[#2B2118]'}`}>
                    {new Date(customer.due_date).toLocaleDateString('en-PK')}
                  </strong>
                </div>
              )}
              {customer.notes && (
                <div className="italic text-slate-500">
                  Note: {customer.notes}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsReceivePaymentOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#1F9D55] hover:bg-[#188044] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-green-600/20"
            >
              <DollarSign className="w-4 h-4" />
              <span>Receive Payment</span>
            </button>

            <button
              type="button"
              onClick={() => setIsStatementPrintOpen(true)}
              className="px-3 py-2.5 rounded-xl bg-white border border-[#F0E4D7] text-[#2B2118] hover:bg-slate-50 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Printer className="w-4 h-4 text-[#F26B1D]" />
              <span>Print Statement</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadCSV}
              className="p-2.5 rounded-xl bg-white border border-[#F0E4D7] text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
              title="Download Statement in Excel / CSV"
            >
              <Download className="w-4 h-4 text-emerald-600" />
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="p-2.5 rounded-xl bg-white border border-[#F0E4D7] text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
              title="Share Statement text"
            >
              <Share2 className="w-4 h-4 text-blue-600" />
            </button>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="px-5 pt-3 border-b border-slate-200 bg-slate-50/50 flex items-center gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveSubTab('ledger')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer ${
              activeSubTab === 'ledger'
                ? 'border-[#F26B1D] text-[#F26B1D]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Ledger & Account Transactions ({lineItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('orders')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer ${
              activeSubTab === 'orders'
                ? 'border-[#F26B1D] text-[#F26B1D]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Past Orders ({customer.orders?.length || 0})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeSubTab === 'ledger' ? (
            /* Khata Ledger Table */
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Reference / Description</th>
                      <th className="py-2.5 px-3 text-right">Debit (Owed)</th>
                      <th className="py-2.5 px-3 text-right">Credit (Paid)</th>
                      <th className="py-2.5 px-3 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lineItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No ledger transactions found for this customer.
                        </td>
                      </tr>
                    ) : (
                      lineItems.map((item) => (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50/60 ${item.is_void ? 'opacity-50 line-through bg-red-50/20' : ''}`}
                        >
                          <td className="py-3 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                            {new Date(item.date).toLocaleDateString('en-PK', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                            <span className="block text-[10px] text-slate-400">
                              {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              {item.type === 'DEBIT' ? (
                                <ArrowUpRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              ) : (
                                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              )}
                              <span>{item.ref}</span>
                              <span className="text-[10px] font-normal text-slate-500">
                                ({item.typeLabel})
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {item.description}
                            </div>
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                            {item.debit > 0 ? formatPKR(item.debit) : '-'}
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                            {item.credit > 0 ? formatPKR(item.credit) : '-'}
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                            {formatPKR(item.runningBalance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold text-xs">
                      <td colSpan={2} className="py-3 px-3 text-slate-700 uppercase">
                        Ledger Totals
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-900">
                        {formatPKR(summary.totalDebits)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-700">
                        {formatPKR(summary.totalCredits)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-red-600 font-black">
                        {formatPKR(summary.currentBalance)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            /* Past Orders List */
            <div className="space-y-2.5">
              {(customer.orders || []).length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  No orders on record.
                </div>
              ) : (
                (customer.orders || []).map((ord) => (
                  <div
                    key={ord.id}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-[#F26B1D]/40 transition shadow-2xs flex items-center justify-between gap-3 flex-wrap"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs text-[#2B2118]">
                          Order #{ord.id}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                          {ord.order_type}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            ord.paymentState?.paymentStatus === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ord.paymentState?.paymentStatus === 'partial'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {ord.paymentState?.paymentStatus}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {new Date(ord.created_at).toLocaleString('en-PK')} • {ord.items?.length || 0} items
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Total</span>
                        <span className="font-mono font-black text-sm text-[#2B2118]">
                          {formatPKR(ord.total_payable)}
                        </span>
                      </div>
                      {onViewOrder && (
                        <button
                          type="button"
                          onClick={() => onViewOrder(ord)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
                        >
                          View Order
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#F0E4D7] bg-[#FFF9F2] flex items-center justify-between">
          <div className="text-xs text-[#7A6A5C]">
            Customer Khata ledger generated automatically from orders & payments
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Receive Payment Modal */}
      {isReceivePaymentOpen && (
        <ReceiveCustomerPaymentModal
          customer={customer}
          isOpen={isReceivePaymentOpen}
          onClose={() => setIsReceivePaymentOpen(false)}
          restaurant={restaurant}
          currentUser={currentUser}
          onPaymentCompleted={() => {
            if (onCustomerUpdated) onCustomerUpdated();
          }}
        />
      )}

      {/* Print Statement Modal */}
      {isStatementPrintOpen && (
        <CustomerStatementPrintModal
          customer={customer}
          isOpen={isStatementPrintOpen}
          onClose={() => setIsStatementPrintOpen(false)}
          restaurant={restaurant}
        />
      )}

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <CustomerFormModal
          isOpen={isEditProfileOpen}
          onClose={() => setIsEditProfileOpen(false)}
          customer={customer}
          onSave={(profileData) => {
            customerKhataService.saveCustomerProfile(restId, profileData);
            if (onCustomerUpdated) onCustomerUpdated();
          }}
        />
      )}
    </div>
  );
}
