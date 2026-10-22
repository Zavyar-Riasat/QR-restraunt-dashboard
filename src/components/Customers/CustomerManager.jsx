import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  DollarSign,
  Printer,
  FileSpreadsheet,
  AlertTriangle,
  ArrowUpDown,
  Phone,
  Calendar,
  ExternalLink,
  ChevronRight,
  TrendingDown,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  formatPKR,
  formatPaisa,
  formatPhone,
  toRupees,
} from '../../utils/currencyUtils';
import { customerKhataService } from '../../services/customerKhataService';
import CustomerDetailModal from './CustomerDetailModal';
import ReceiveCustomerPaymentModal from './ReceiveCustomerPaymentModal';
import CustomerStatementPrintModal from './CustomerStatementPrintModal';
import CustomerFormModal from './CustomerFormModal';
import PendingPaymentsReportModal from './PendingPaymentsReportModal';

export default function CustomerManager({
  restaurant,
  currentUser,
  orders = [],
  initialFilter = 'all', // 'all' | 'has_balance' | 'overdue'
  onViewOrder,
}) {
  const restId = restaurant?.id || 'rest-101';

  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [balanceFilter, setBalanceFilter] = useState(initialFilter || 'all');
  const [sortBy, setSortBy] = useState('highest_balance'); // 'highest_balance' | 'name' | 'most_orders' | 'recent'

  // Modals state
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentCustomer, setPaymentCustomer] = useState(null);
  const [statementCustomer, setStatementCustomer] = useState(null);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isPendingReportOpen, setIsPendingReportOpen] = useState(false);

  // Sync if initialFilter prop changes
  useEffect(() => {
    if (initialFilter) {
      setBalanceFilter(initialFilter);
    }
  }, [initialFilter]);

  // Load and refresh customers
  const loadCustomers = useCallback(() => {
    const list = customerKhataService.getAllCustomers(restId);
    setCustomers(list);
  }, [restId]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers, orders]);

  // Listen to customer update events
  useEffect(() => {
    const handleCustomerEvent = () => {
      loadCustomers();
    };
    window.addEventListener('dinehq_customer_updated', handleCustomerEvent);
    window.addEventListener('dinehq_order_status_updated', handleCustomerEvent);
    window.addEventListener('dinehq_order_placed', handleCustomerEvent);
    return () => {
      window.removeEventListener('dinehq_customer_updated', handleCustomerEvent);
      window.removeEventListener('dinehq_order_status_updated', handleCustomerEvent);
      window.removeEventListener('dinehq_order_placed', handleCustomerEvent);
    };
  }, [loadCustomers]);

  // Filter & Sort customers
  const filteredCustomers = useMemo(() => {
    let result = [...customers];

    // Filter by Balance / Overdue
    if (balanceFilter === 'has_balance') {
      result = result.filter((c) => c.balance_due_paisa > 0);
    } else if (balanceFilter === 'overdue') {
      result = result.filter((c) => c.is_overdue);
    }

    // Filter by Search text (name, phone, address)
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.phone || '').includes(q) ||
          (c.address || '').toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'highest_balance') {
        return b.balance_due_paisa - a.balance_due_paisa;
      }
      if (sortBy === 'most_orders') {
        return b.total_orders_count - a.total_orders_count;
      }
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'recent') {
        const timeA = new Date(a.last_order_at || a.created_at || 0).getTime();
        const timeB = new Date(b.last_order_at || b.created_at || 0).getTime();
        return timeB - timeA;
      }
      return 0;
    });

    return result;
  }, [customers, balanceFilter, search, sortBy]);

  // Overall Statistics
  const totalReceivablePaisa = useMemo(() => {
    return customers.reduce((sum, c) => sum + c.balance_due_paisa, 0);
  }, [customers]);

  const totalOverdueCount = useMemo(() => {
    return customers.filter((c) => c.is_overdue).length;
  }, [customers]);

  const totalCustomersWithBalance = useMemo(() => {
    return customers.filter((c) => c.balance_due_paisa > 0).length;
  }, [customers]);

  const totalCollectedPaisa = useMemo(() => {
    return customers.reduce((sum, c) => sum + c.total_paid_paisa, 0);
  }, [customers]);

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Stat 1: Total Receivable (Udhaar) */}
        <div
          onClick={() => setBalanceFilter('has_balance')}
          className="p-5 rounded-2xl bg-white border border-red-200/80 shadow-2xs hover:shadow-xs transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-red-600 mb-1">
            <span className="font-bold uppercase tracking-wider">Total Receivable (Udhaar)</span>
            <TrendingDown className="w-4 h-4 text-red-500 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-red-600 font-mono tracking-tight">
            {formatPaisa(totalReceivablePaisa)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Across {totalCustomersWithBalance} customer account(s)
          </p>
        </div>

        {/* Stat 2: Overdue Accounts */}
        <div
          onClick={() => setBalanceFilter('overdue')}
          className="p-5 rounded-2xl bg-white border border-amber-200/80 shadow-2xs hover:shadow-xs transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-amber-700 mb-1">
            <span className="font-bold uppercase tracking-wider">Overdue Accounts</span>
            <AlertTriangle className="w-4 h-4 text-amber-500 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-700 font-mono tracking-tight">
            {totalOverdueCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Past due settlement date
          </p>
        </div>

        {/* Stat 3: Total Customers */}
        <div
          onClick={() => setBalanceFilter('all')}
          className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider">Total Customers</span>
            <Users className="w-4 h-4 text-slate-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
            {customers.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Merged automatically by phone
          </p>
        </div>

        {/* Stat 4: Total Paid / Collected */}
        <div className="p-5 rounded-2xl bg-white border border-emerald-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-emerald-700 mb-1">
            <span className="font-bold uppercase tracking-wider">Total Collected</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-800 font-mono tracking-tight">
            {formatPaisa(totalCollectedPaisa)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            All-time settlements recorded
          </p>
        </div>
      </div>

      {/* Main Customers Management Board */}
      <div className="bg-white border border-[#F0E4D7] rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
        {/* Controls Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
          {/* Filter Pills */}
          <div className="flex rounded-xl bg-[#FFF9F2] p-1 border border-[#F0E4D7] text-xs font-bold overflow-x-auto">
            <button
              type="button"
              onClick={() => setBalanceFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                balanceFilter === 'all'
                  ? 'bg-[#F26B1D] text-white shadow-xs'
                  : 'text-[#7A6A5C] hover:text-[#2B2118]'
              }`}
            >
              All Customers ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => setBalanceFilter('has_balance')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                balanceFilter === 'has_balance'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-red-700 hover:text-red-900'
              }`}
            >
              <span>Has Balance Due</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                {totalCustomersWithBalance}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setBalanceFilter('overdue')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                balanceFilter === 'overdue'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-700 hover:text-amber-900'
              }`}
            >
              <span>Overdue</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                {totalOverdueCount}
              </span>
            </button>
          </div>

          {/* Search, Sort, Report & Add Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone..."
                className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F26B1D]"
              />
            </div>

            {/* Sort Select */}
            <div className="flex items-center gap-1 bg-[#FFF9F2] px-2 py-1.5 rounded-xl border border-[#F0E4D7] text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#7A6A5C]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent font-bold text-[#2B2118] text-xs focus:outline-none cursor-pointer"
              >
                <option value="highest_balance">Sort: Highest Balance</option>
                <option value="name">Sort: Name (A-Z)</option>
                <option value="most_orders">Sort: Most Orders</option>
                <option value="recent">Sort: Recent Orders</option>
              </select>
            </div>

            {/* Pending Payments Report Button */}
            <button
              type="button"
              onClick={() => setIsPendingReportOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Open date-filtered pending payments report"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
              <span>Pending Payments Report</span>
            </button>

            {/* Add Customer Button */}
            <button
              type="button"
              onClick={() => setIsAddCustomerOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#F26B1D] to-[#F5A623] hover:from-[#E05A0C] hover:to-[#E59512] active:scale-95 text-white text-xs font-black shadow-xs transition cursor-pointer flex items-center gap-1.5 border border-amber-300/30"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Add Customer</span>
            </button>
          </div>
        </div>

        {/* Customer Table / List */}
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-[#F0E4D7] rounded-3xl bg-[#FFF9F2]/50">
            <Users className="w-12 h-12 text-[#9E8E81] mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#2B2118]">No customers match your criteria</h3>
            <p className="text-xs text-[#7A6A5C] mt-1 max-w-sm mx-auto">
              Customers are created automatically when orders are placed, or can be added manually with the &quot;Add Customer&quot; button above.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Customer Name & Phone</th>
                  <th className="py-3 px-3 text-center">Orders</th>
                  <th className="py-3 px-3 text-right">Total Spent</th>
                  <th className="py-3 px-3 text-right">Balance Due</th>
                  <th className="py-3 px-3 text-center">Credit & Due Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((cust) => {
                  const hasBalance = cust.balance_due_paisa > 0;
                  return (
                    <tr
                      key={cust.phone}
                      className="hover:bg-slate-50/80 transition group"
                    >
                      {/* Name & Phone */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedCustomer(cust)}
                            className="font-bold text-sm text-[#2B2118] hover:text-[#F26B1D] text-left cursor-pointer flex items-center gap-1.5"
                          >
                            <span>{cust.name}</span>
                          </button>

                          {cust.is_overdue && (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-black uppercase tracking-wider border border-red-200 animate-pulse">
                              Overdue
                            </span>
                          )}

                          {cust.is_credit_limit_exceeded && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-200">
                              Limit Exceeded
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 font-mono">
                          <a
                            href={`tel:+${cust.phone}`}
                            className="hover:text-emerald-700 hover:underline flex items-center gap-1 text-emerald-800 font-semibold"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{formatPhone(cust.phone)}</span>
                          </a>
                          {cust.address && (
                            <span className="truncate max-w-[220px] text-slate-500 font-sans">
                              • {cust.address}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Orders Count */}
                      <td className="py-3.5 px-3 text-center font-bold text-slate-700 font-mono text-sm">
                        {cust.total_orders_count}
                      </td>

                      {/* Total Spent */}
                      <td className="py-3.5 px-3 text-right font-mono font-medium text-slate-800">
                        {formatPKR(cust.total_spent)}
                      </td>

                      {/* Balance Due (Red if owed) */}
                      <td className="py-3.5 px-3 text-right">
                        <span
                          className={`font-mono font-black text-sm sm:text-base ${
                            hasBalance ? 'text-red-600 font-bold' : 'text-emerald-700'
                          }`}
                        >
                          {formatPKR(cust.balance_due)}
                        </span>
                        {hasBalance && (
                          <span className="block text-[10px] text-red-500 font-semibold font-sans">
                            Pending Payment
                          </span>
                        )}
                      </td>

                      {/* Credit Limit & Due Date */}
                      <td className="py-3.5 px-3 text-center text-[11px]">
                        {cust.due_date ? (
                          <div className={`font-mono ${cust.is_overdue ? 'text-red-600 font-bold' : 'text-slate-600'}`}>
                            Due: {new Date(cust.due_date).toLocaleDateString('en-PK')}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono">-</span>
                        )}
                        {cust.credit_limit_paisa > 0 && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Limit: {formatPaisa(cust.credit_limit_paisa)}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Receive Payment Button */}
                          <button
                            type="button"
                            onClick={() => setPaymentCustomer(cust)}
                            className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="Receive and allocate customer payment"
                          >
                            <DollarSign className="w-3 h-3" />
                            <span>Receive</span>
                          </button>

                          {/* Print Statement */}
                          <button
                            type="button"
                            onClick={() => setStatementCustomer(cust)}
                            className="p-1 px-2 rounded-xl bg-white border border-[#F0E4D7] text-[#2B2118] hover:bg-slate-50 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Print Statement (80mm / A4)"
                          >
                            <Printer className="w-3 h-3 text-[#F26B1D]" />
                            <span className="hidden sm:inline">Statement</span>
                          </button>

                          {/* View Ledger */}
                          <button
                            type="button"
                            onClick={() => setSelectedCustomer(cust)}
                            className="p-1 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Open full ledger and past orders"
                          >
                            <span>Ledger</span>
                            <ChevronRight className="w-3 h-3 text-slate-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          isOpen={Boolean(selectedCustomer)}
          onClose={() => setSelectedCustomer(null)}
          restaurant={restaurant}
          currentUser={currentUser}
          onCustomerUpdated={() => {
            loadCustomers();
            const refreshed = customerKhataService.getCustomerByPhone(restId, selectedCustomer.phone);
            setSelectedCustomer(refreshed);
          }}
          onViewOrder={(order) => {
            if (onViewOrder) {
              setSelectedCustomer(null);
              onViewOrder(order);
            }
          }}
        />
      )}

      {/* Receive Customer Payment Modal */}
      {paymentCustomer && (
        <ReceiveCustomerPaymentModal
          customer={paymentCustomer}
          isOpen={Boolean(paymentCustomer)}
          onClose={() => setPaymentCustomer(null)}
          restaurant={restaurant}
          currentUser={currentUser}
          onPaymentCompleted={() => {
            loadCustomers();
            setPaymentCustomer(null);
          }}
        />
      )}

      {/* Print Statement Modal */}
      {statementCustomer && (
        <CustomerStatementPrintModal
          customer={statementCustomer}
          isOpen={Boolean(statementCustomer)}
          onClose={() => setStatementCustomer(null)}
          restaurant={restaurant}
        />
      )}

      {/* Add New Customer Modal */}
      {isAddCustomerOpen && (
        <CustomerFormModal
          isOpen={isAddCustomerOpen}
          onClose={() => setIsAddCustomerOpen(false)}
          onSave={(profileData) => {
            customerKhataService.saveCustomerProfile(restId, profileData);
            loadCustomers();
          }}
        />
      )}

      {/* Pending Payments Report Modal */}
      {isPendingReportOpen && (
        <PendingPaymentsReportModal
          isOpen={isPendingReportOpen}
          onClose={() => setIsPendingReportOpen(false)}
          restaurant={restaurant}
          onSelectCustomer={(row) => {
            const found = customerKhataService.getCustomerByPhone(restId, row.phone);
            if (found) {
              setSelectedCustomer(found);
            }
          }}
        />
      )}
    </div>
  );
}
