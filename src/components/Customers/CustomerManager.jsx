import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  Search,
  Plus,
  ArrowUpDown,
  Phone,
  ChevronRight,
  TrendingUp,
  ShoppingBag,
  CreditCard,
  MapPin,
  } from 'lucide-react';
import {
  formatPKR,
  formatPhone,
  toRupees,
} from '../../utils/currencyUtils';
import { customerKhataService } from '../../services/customerKhataService';
import CustomerDetailModal from './CustomerDetailModal';
import CustomerFormModal from './CustomerFormModal';

export default function CustomerManager({
  restaurant,
  currentUser,
  orders = [],
  onViewOrder,
}) {
  const restId = restaurant?.id || 'rest-101';

  const [customers, setCustomers] = useState(() => customerKhataService.getAllCustomers(restId));
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('most_spent'); // 'most_spent' | 'most_orders' | 'name' | 'recent'

  // Modals state
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);

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

    // Filter by Search text (name, phone, address, notes)
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.phone || '').includes(q) ||
          (c.address || '').toLowerCase().includes(q) ||
          (c.notes || '').toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'most_spent') {
        return (b.total_spent_paisa || 0) - (a.total_spent_paisa || 0);
      }
      if (sortBy === 'most_orders') {
        return (b.total_orders_count || 0) - (a.total_orders_count || 0);
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
  }, [customers, search, sortBy]);

  // Overall Statistics
  const totalSpentPaisa = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.total_spent_paisa || 0), 0);
  }, [customers]);

  const totalOrdersCount = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.total_orders_count || 0), 0);
  }, [customers]);

  const avgSpentRupees = useMemo(() => {
    if (!customers.length) return 0;
    return Math.round(toRupees(totalSpentPaisa) / customers.length);
  }, [customers, totalSpentPaisa]);

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Stat 1: Total Customers */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider">Total Customers</span>
            <Users className="w-4 h-4 text-[#F26B1D]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
            {customers.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Customer directory profiles
          </p>
        </div>

        {/* Stat 2: Total Spent */}
        <div className="p-5 rounded-2xl bg-white border border-emerald-200/80 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between text-xs text-emerald-700 mb-1">
            <span className="font-bold uppercase tracking-wider">Total Spent</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-800 font-mono tracking-tight">
            {formatPKR(toRupees(totalSpentPaisa))}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            All-time customer sales
          </p>
        </div>

        {/* Stat 3: Total Orders */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider">Total Orders</span>
            <ShoppingBag className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
            {totalOrdersCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Total completed customer orders
          </p>
        </div>

        {/* Stat 4: Avg Customer Spend */}
        <div className="p-5 rounded-2xl bg-white border border-amber-200/80 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between text-xs text-amber-700 mb-1">
            <span className="font-bold uppercase tracking-wider">Avg Spend / Customer</span>
            <CreditCard className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-800 font-mono tracking-tight">
            {formatPKR(avgSpentRupees)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Average customer lifetime value
          </p>
        </div>
      </div>

      {/* Main Customers Management Board */}
      <div className="bg-white border border-[#F0E4D7] rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
        {/* Controls Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
          {/* Active Title Badge */}
          <div className="flex items-center gap-2">
            <div className="px-3.5 py-1.5 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-xs font-black text-[#2B2118] flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-[#F26B1D]" />
              <span>All Customers ({customers.length})</span>
            </div>
            {search.trim() && (
              <span className="text-xs text-slate-500">
                Found {filteredCustomers.length} matching
              </span>
            )}
          </div>

          {/* Search, Sort & Add Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, address..."
                className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F26B1D]"
              />
            </div>

            {/* Sort Select */}
            <div className="flex items-center gap-1 bg-[#FFF9F2] px-2.5 py-1.5 rounded-xl border border-[#F0E4D7] text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#7A6A5C]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent font-bold text-[#2B2118] text-xs focus:outline-none cursor-pointer"
              >
                <option value="most_spent">Sort: Most Spent</option>
                <option value="most_orders">Sort: Most Orders</option>
                <option value="name">Sort: Name (A-Z)</option>
                <option value="recent">Sort: Recent Orders</option>
              </select>
            </div>

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
            <h3 className="text-base font-bold text-[#2B2118]">No customers match your search</h3>
            <p className="text-xs text-[#7A6A5C] mt-1 max-w-sm mx-auto">
              Customers are created automatically when orders are placed, or can be added manually with the &quot;Add Customer&quot; button above.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Customer Details & Contact</th>
                  <th className="py-3 px-3 text-center">Orders</th>
                  <th className="py-3 px-4 text-right">Total Spent</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((cust) => {
                  return (
                    <tr
                      key={cust.phone}
                      className="hover:bg-slate-50/80 transition group"
                    >
                      {/* Name & Phone & Full Details */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedCustomer(cust)}
                            className="font-bold text-sm text-[#2B2118] hover:text-[#F26B1D] text-left cursor-pointer flex items-center gap-1.5"
                          >
                            <span>{cust.name}</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
                          <a
                            href={`tel:+${cust.phone}`}
                            className="hover:text-emerald-700 hover:underline flex items-center gap-1 text-emerald-800 font-semibold font-mono"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{formatPhone(cust.phone)}</span>
                          </a>

                          {cust.address && (
                            <span className="flex items-center gap-1 text-slate-600 font-sans">
                              <MapPin className="w-3 h-3 text-[#F26B1D] shrink-0" />
                              <span className="truncate max-w-[280px]">{cust.address}</span>
                            </span>
                          )}

                          {cust.notes && (
                            <span className="text-[10px] text-slate-400 italic">
                              • &quot;{cust.notes}&quot;
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Orders Count */}
                      <td className="py-3.5 px-3 text-center font-bold text-slate-800 font-mono text-sm">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100">
                          {cust.total_orders_count}
                        </span>
                      </td>

                      {/* Total Spent */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-base text-slate-900">
                        {formatPKR(cust.total_spent)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Details Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedCustomer(cust)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#2B2118] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs hover:text-[#F26B1D]"
                            title="View customer profile and order history"
                          >
                            <span>View Details</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
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
    </div>
  );
}
