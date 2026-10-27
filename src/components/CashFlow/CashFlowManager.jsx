import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Minus,
  Search,
  Filter,
  Download,
  Printer,
  Trash2,
  Edit2,
  Calendar,
  Layers,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building,
  User,
  Tag,
} from 'lucide-react';
import {
  cashFlowService,
  CASH_IN_CATEGORIES,
  CASH_OUT_CATEGORIES,
} from '../../services/cashFlowService';
import { formatPKR } from '../../utils/currencyUtils';
import RecordCashFlowModal from './RecordCashFlowModal';

export default function CashFlowManager({
  restaurant,
  currentUser,
}) {
  const restId = restaurant?.id || 'rest-101';
  const restName = restaurant?.name || 'Restaurant';

  const [entries, setEntries] = useState([]);
  const [activeTypeFilter, setActiveTypeFilter] = useState('all'); // 'all' | 'in' | 'out'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'week' | 'month'
  const [search, setSearch] = useState('');

  // Modals state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [recordModalType, setRecordModalType] = useState('in'); // 'in' | 'out'
  const [entryToEdit, setEntryToEdit] = useState(null);

  // Load entries
  const loadEntries = useCallback(() => {
    const list = cashFlowService.getEntries(restId);
    setEntries(list);
  }, [restId]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Listen to cashflow events
  useEffect(() => {
    const handleUpdate = () => {
      loadEntries();
    };
    window.addEventListener('dinehq_cashflow_updated', handleUpdate);
    return () => window.removeEventListener('dinehq_cashflow_updated', handleUpdate);
  }, [loadEntries]);

  // Summary calculations
  const summary = useMemo(() => {
    return cashFlowService.getSummary(restId);
  }, [entries, restId]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    let result = [...entries];

    // Filter by Type (In vs Out)
    if (activeTypeFilter === 'in') {
      result = result.filter((e) => e.type === 'in');
    } else if (activeTypeFilter === 'out') {
      result = result.filter((e) => e.type === 'out');
    }

    // Filter by Category
    if (selectedCategory !== 'all') {
      result = result.filter((e) => e.category === selectedCategory);
    }

    // Filter by Date
    if (dateFilter !== 'all') {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const weekStart = todayStart - 7 * 24 * 3600 * 1000;
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

      result = result.filter((e) => {
        const t = new Date(e.date || e.created_at).getTime();
        if (dateFilter === 'today') return t >= todayStart;
        if (dateFilter === 'week') return t >= weekStart;
        if (dateFilter === 'month') return t >= monthStart;
        return true;
      });
    }

    // Filter by Search text
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (e) =>
          (e.description || '').toLowerCase().includes(q) ||
          (e.source_recipient || '').toLowerCase().includes(q) ||
          (e.category_label || '').toLowerCase().includes(q) ||
          (e.reference_no || '').toLowerCase().includes(q) ||
          (e.payment_method || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [entries, activeTypeFilter, selectedCategory, dateFilter, search]);

  const handleOpenAdd = (type) => {
    setEntryToEdit(null);
    setRecordModalType(type);
    setIsRecordModalOpen(true);
  };

  const handleOpenEdit = (entry) => {
    setEntryToEdit(entry);
    setRecordModalType(entry.type || 'in');
    setIsRecordModalOpen(true);
  };

  const handleDelete = (entry) => {
    if (window.confirm(`Are you sure you want to delete this ${entry.type === 'in' ? 'Cash In' : 'Cash Out'} entry of ${formatPKR(entry.amount)}?`)) {
      cashFlowService.deleteEntry(restId, entry.id);
      loadEntries();
    }
  };

  const handleExportCSV = () => {
    const csvContent = cashFlowService.exportCSV(restId, restName);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Cash_Flow_Register_${restName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const inCount = useMemo(() => entries.filter((e) => e.type === 'in').length, [entries]);
  const outCount = useMemo(() => entries.filter((e) => e.type === 'out').length, [entries]);

  return (
    <div className="space-y-6">
      {/* Top Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Net Cash Balance */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider">Net Cash in Register</span>
            <Wallet className={`w-4 h-4 ${summary.netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} />
          </div>
          <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
            summary.netBalance >= 0 ? 'text-emerald-800' : 'text-rose-700'
          }`}>
            {formatPKR(summary.netBalance)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Cash In minus Cash Out
          </p>
        </div>

        {/* Card 2: Total Cash In */}
        <div
          onClick={() => setActiveTypeFilter('in')}
          className="p-5 rounded-2xl bg-white border border-emerald-200/80 shadow-2xs hover:shadow-xs transition cursor-pointer group"
          title="Filter Cash In entries"
        >
          <div className="flex items-center justify-between text-xs text-emerald-700 mb-1">
            <span className="font-bold uppercase tracking-wider">Total Cash In</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-800 font-mono tracking-tight">
            +{formatPKR(summary.totalCashIn)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Owner capital & cash receipts ({inCount})
          </p>
        </div>

        {/* Card 3: Total Cash Out */}
        <div
          onClick={() => setActiveTypeFilter('out')}
          className="p-5 rounded-2xl bg-white border border-rose-200/80 shadow-2xs hover:shadow-xs transition cursor-pointer group"
          title="Filter Cash Out entries"
        >
          <div className="flex items-center justify-between text-xs text-rose-700 mb-1">
            <span className="font-bold uppercase tracking-wider">Total Cash Out</span>
            <ArrowUpRight className="w-4 h-4 text-rose-600 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-800 font-mono tracking-tight">
            -{formatPKR(summary.totalCashOut)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Purchases, utilities, wages ({outCount})
          </p>
        </div>

        {/* Card 4: Today's Cash Movement */}
        <div className="p-5 rounded-2xl bg-white border border-amber-200/80 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between text-xs text-amber-800 mb-1">
            <span className="font-bold uppercase tracking-wider">Today&apos;s Net Flow</span>
            <Calendar className="w-4 h-4 text-amber-600" />
          </div>
          <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
            summary.todayNet >= 0 ? 'text-slate-900' : 'text-rose-700'
          }`}>
            {summary.todayNet >= 0 ? `+${formatPKR(summary.todayNet)}` : formatPKR(summary.todayNet)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            In: +{formatPKR(summary.todayCashIn)} • Out: -{formatPKR(summary.todayCashOut)}
          </p>
        </div>
      </div>

      {/* Main Register Management Card */}
      <div className="bg-white border border-[#F0E4D7] rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
        {/* Top Control Bar: Quick Add Buttons & Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
          {/* Filter Pills */}
          <div className="flex rounded-xl bg-[#FFF9F2] p-1 border border-[#F0E4D7] text-xs font-bold overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap ${
                activeTypeFilter === 'all'
                  ? 'bg-[#2B2118] text-white shadow-xs'
                  : 'text-[#7A6A5C] hover:text-[#2B2118]'
              }`}
            >
              All Entries ({entries.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTypeFilter('in')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTypeFilter === 'in'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:text-emerald-900'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Cash In ({inCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTypeFilter('out')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTypeFilter === 'out'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-700 hover:text-rose-900'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Cash Out ({outCount})</span>
            </button>
          </div>

          {/* Action Buttons: Add Cash In & Add Cash Out */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-2 rounded-xl bg-white border border-[#F0E4D7] hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Download Cash Register Ledger CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            {/* + Cash In Button */}
            <button
              type="button"
              onClick={() => handleOpenAdd('in')}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Cash In (Money In)</span>
            </button>

            {/* - Cash Out Button */}
            <button
              type="button"
              onClick={() => handleOpenAdd('out')}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-black shadow-md shadow-rose-600/20 transition cursor-pointer flex items-center gap-1.5"
            >
              <Minus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Cash Out (Expense)</span>
            </button>
          </div>
        </div>

        {/* Secondary Filter Bar: Search, Category, Date */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap pt-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description, vendor, reference..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F26B1D]"
            />
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1 bg-[#FFF9F2] px-2.5 py-1.5 rounded-xl border border-[#F0E4D7] text-xs">
            <Calendar className="w-3.5 h-3.5 text-[#7A6A5C]" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent font-bold text-[#2B2118] text-xs focus:outline-none cursor-pointer"
            >
              <option value="all">Date: All Time</option>
              <option value="today">Date: Today</option>
              <option value="week">Date: Last 7 Days</option>
              <option value="month">Date: This Month</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1 bg-[#FFF9F2] px-2.5 py-1.5 rounded-xl border border-[#F0E4D7] text-xs">
            <Tag className="w-3.5 h-3.5 text-[#7A6A5C]" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent font-bold text-[#2B2118] text-xs focus:outline-none cursor-pointer"
            >
              <option value="all">Category: All</option>
              <optgroup label="Cash In Categories">
                {CASH_IN_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Cash Out Categories">
                {CASH_OUT_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        {filteredEntries.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-[#F0E4D7] rounded-3xl bg-[#FFF9F2]/50">
            <Wallet className="w-12 h-12 text-[#9E8E81] mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#2B2118]">No cash transactions match your filter</h3>
            <p className="text-xs text-[#7A6A5C] mt-1 max-w-sm mx-auto">
              Record cash you put in your business with &quot;Cash In&quot; or log expenses with &quot;Cash Out&quot;.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => handleOpenAdd('in')}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition cursor-pointer"
              >
                + Add Cash In
              </button>
              <button
                type="button"
                onClick={() => handleOpenAdd('out')}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition cursor-pointer"
              >
                - Record Cash Out
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Category & Party</th>
                  <th className="py-3 px-3">Description / Note</th>
                  <th className="py-3 px-3 text-center">Mode</th>
                  <th className="py-3 px-4 text-right">Amount (PKR)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map((item) => {
                  const isIn = item.type === 'in';
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition group"
                    >
                      {/* Type Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            isIn
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}
                        >
                          {isIn ? (
                            <>
                              <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                              <span>Cash In</span>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="w-3 h-3 text-rose-600" />
                              <span>Cash Out</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        <div>
                          {new Date(item.date || item.created_at).toLocaleDateString('en-PK', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(item.date || item.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Category & Source / Recipient */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900 text-xs">
                          {item.category_label || item.category}
                        </div>
                        {item.source_recipient && (
                          <div className="text-[11px] text-slate-500 font-medium">
                            {isIn ? 'From: ' : 'To: '}
                            <span className="text-[#2B2118] font-semibold">{item.source_recipient}</span>
                          </div>
                        )}
                      </td>

                      {/* Description & Reference # */}
                      <td className="py-3.5 px-3 max-w-xs">
                        <div className="text-slate-700 truncate font-sans">
                          {item.description || '—'}
                        </div>
                        {item.reference_no && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-mono">
                            Ref: {item.reference_no}
                          </span>
                        )}
                      </td>

                      {/* Payment Mode */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold uppercase font-mono">
                          {item.payment_method?.replace('_', ' ') || 'CASH'}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-black text-sm whitespace-nowrap">
                        <span
                          className={
                            isIn ? 'text-emerald-700' : 'text-rose-700'
                          }
                        >
                          {isIn ? '+' : '-'}{formatPKR(item.amount)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                            title="Edit entry"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition cursor-pointer"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Record / Edit Cash Flow Modal */}
      {isRecordModalOpen && (
        <RecordCashFlowModal
          isOpen={isRecordModalOpen}
          onClose={() => setIsRecordModalOpen(false)}
          initialType={recordModalType}
          entryToEdit={entryToEdit}
          restaurant={restaurant}
          currentUser={currentUser}
          onSaved={() => {
            loadEntries();
          }}
        />
      )}
    </div>
  );
}
