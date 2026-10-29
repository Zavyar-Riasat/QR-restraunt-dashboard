import React, { useState } from 'react';
import {
  X,
  Phone,
  MapPin,
  Clock,
  ShoppingBag,
  Edit2,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import {
  formatPKR,
  formatPhone,
} from '../../utils/currencyUtils';
import { customerKhataService } from '../../services/customerKhataService';
import CustomerFormModal from './CustomerFormModal';

export default function CustomerDetailModal({
  customer,
  isOpen,
  onClose,
  restaurant,
  _currentUser,
  onCustomerUpdated,
  onViewOrder,
}) {
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  if (!isOpen || !customer) return null;

  const restId = restaurant?.id || 'rest-101';
  const pastOrders = customer.orders || [];

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
              <h2 className="text-xl sm:text-2xl font-black text-[#2B2118]">
                {customer.name}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Account in Good Standing</span>
              </span>
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
                <span className="flex items-center gap-1 truncate max-w-sm text-slate-600">
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

        {/* Customer Spent & Overview Bar */}
        <div className="p-4 sm:p-5 bg-white border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Card 1: Total Spent */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
              Total Spent
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-emerald-900 block mt-0.5">
              {formatPKR(customer.total_spent)}
            </span>
            <span className="text-[10px] text-emerald-600 font-medium">
              Lifetime purchases
            </span>
          </div>

          {/* Card 2: Total Orders */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Orders Placed
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 block mt-0.5">
              {customer.total_orders_count}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              Completed orders
            </span>
          </div>

          {/* Card 3: Member Since */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              First Order
            </span>
            <span className="text-xs font-bold text-slate-800 block mt-1">
              {customer.first_order_at
                ? new Date(customer.first_order_at).toLocaleDateString('en-PK', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'N/A'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              First visit date
            </span>
          </div>

          {/* Card 4: Last Visited */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Last Order
            </span>
            <span className="text-xs font-bold text-slate-800 block mt-1">
              {customer.last_order_at
                ? new Date(customer.last_order_at).toLocaleDateString('en-PK', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'N/A'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              Most recent visit
            </span>
          </div>
        </div>

        {/* Customer Notes banner (if present) */}
        {customer.notes && (
          <div className="px-5 py-2.5 bg-amber-50/70 border-b border-amber-200/60 text-xs text-amber-900 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>
              <strong>Customer Note:</strong> {customer.notes}
            </span>
          </div>
        )}

        {/* Order History Header */}
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="text-xs font-bold text-[#2B2118] flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[#F26B1D]" />
            <span>Order History ({pastOrders.length})</span>
          </div>
          <span className="text-[11px] text-slate-500">
            All customer purchases and receipts
          </span>
        </div>

        {/* Content Body: Order History */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {pastOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-600">No orders on record for this customer</p>
              <p className="text-xs text-slate-400 mt-0.5">Orders placed with this phone number will appear here automatically.</p>
            </div>
          ) : (
            pastOrders.map((ord) => (
              <div
                key={ord.id}
                className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-[#F26B1D]/40 transition shadow-2xs flex items-center justify-between gap-3 flex-wrap"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-sm text-[#2B2118]">
                      Order #{ord.id}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                      {ord.order_type}
                    </span>
                    {ord.payment_method && (
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                        {ord.payment_method.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>
                      {new Date(ord.created_at).toLocaleDateString('en-PK', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span>•</span>
                    <span>{ord.items?.length || 0} item(s)</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-right">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Amount Paid</span>
                    <span className="font-mono font-black text-base text-[#2B2118]">
                      {formatPKR(ord.total_payable)}
                    </span>
                  </div>
                  {onViewOrder && (
                    <button
                      type="button"
                      onClick={() => onViewOrder(ord)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
                    >
                      View Order
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#F0E4D7] bg-[#FFF9F2] flex items-center justify-between">
          <div className="text-xs text-[#7A6A5C]">
            Customer profile & order history
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
