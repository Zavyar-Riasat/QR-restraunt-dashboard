import React, { useState, useMemo } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  AlertTriangle,
  Search,
  Filter,
} from 'lucide-react';
import {
  formatPKR,
  formatPaisa,
  formatPhone,
  toRupees,
} from '../../utils/currencyUtils';
import { customerKhataService } from '../../services/customerKhataService';

export default function PendingPaymentsReportModal({
  isOpen,
  onClose,
  restaurant,
  onSelectCustomer,
}) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [preset, setPreset] = useState('all'); // 'all' | 'today' | 'week' | 'month'

  const restId = restaurant?.id || 'rest-101';
  const restName = restaurant?.name || 'DineHQ Restaurant';

  const handleApplyPreset = (p) => {
    setPreset(p);
    const now = new Date();
    if (p === 'all') {
      setFromDate('');
      setToDate('');
    } else if (p === 'today') {
      const todayStr = now.toISOString().slice(0, 10);
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (p === 'week') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setFromDate(past.toISOString().slice(0, 10));
      setToDate(now.toISOString().slice(0, 10));
    } else if (p === 'month') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setFromDate(past.toISOString().slice(0, 10));
      setToDate(now.toISOString().slice(0, 10));
    }
  };

  const reportData = useMemo(() => {
    if (!isOpen) return { rows: [], summary: { totalReceivablePaisa: 0, customersWithBalanceCount: 0 } };
    return customerKhataService.getPendingPaymentsReport(restId, fromDate || null, toDate || null);
  }, [isOpen, restId, fromDate, toDate]);

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return reportData.rows;
    return reportData.rows.filter(
      (r) =>
        (r.name || '').toLowerCase().includes(q) ||
        (r.phone || '').includes(q) ||
        (r.address || '').toLowerCase().includes(q)
    );
  }, [reportData.rows, search]);

  const totalFilteredReceivablePaisa = filteredRows.reduce((sum, r) => sum + r.totalBalanceDuePaisa, 0);

  const handleDownloadCSV = () => {
    const lines = [];
    lines.push(`"PENDING PAYMENTS REPORT (UDHAAR / KHATA)"`);
    lines.push(`"Restaurant:","${restName}"`);
    lines.push(`"Generated On:","${new Date().toLocaleString('en-PK')}"`);
    lines.push(`"Date Filter:","${fromDate || 'Earliest'} to ${toDate || 'Latest'}"`);
    lines.push(`"Total Pending Receivable:","Rs. ${toRupees(totalFilteredReceivablePaisa).toLocaleString()}"`);
    lines.push(``);
    lines.push(`"Customer Name","Phone","Address","Total Orders","Total Spent (Rs.)","Total Paid (Rs.)","Balance Due (Rs.)","Due Date","Overdue"`);

    filteredRows.forEach((r) => {
      lines.push(
        `"${r.name}","${formatPhone(r.phone)}","${(r.address || '').replace(/"/g, '""')}","${r.totalOrders}","${toRupees(r.totalSpentPaisa)}","${toRupees(r.totalPaidPaisa)}","${toRupees(r.totalBalanceDuePaisa)}","${r.due_date ? new Date(r.due_date).toLocaleDateString('en-PK') : '-'}","${r.is_overdue ? 'YES' : 'NO'}"`
      );
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Pending_Payments_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto print:static print:bg-transparent print:p-0"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 my-auto print:border-none print:shadow-none print:max-w-none print:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="no-print p-5 border-b border-[#F0E4D7] bg-[#FFF9F2] flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#F26B1D]" />
            <div>
              <h3 className="font-extrabold text-base text-[#2B2118]">
                Pending Payments Report (Udhaar)
              </h3>
              <p className="text-xs text-[#7A6A5C]">
                Track all accounts with outstanding balances and pending collections
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadCSV}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#F0E4D7] text-[#2B2118] text-xs font-bold hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-[#F26B1D] text-white text-xs font-bold hover:bg-[#D95A12] transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="no-print p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Quick Presets */}
          <div className="flex rounded-xl bg-white p-1 border border-slate-200 font-bold">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'Last 7 Days' },
              { id: 'month', label: 'Last 30 Days' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplyPreset(p.id)}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  preset === p.id ? 'bg-[#F26B1D] text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date range picker */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-500 font-medium">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPreset('custom');
                }}
                className="px-2 py-1 rounded-lg border border-slate-200 bg-white font-mono text-xs"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-500 font-medium">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPreset('custom');
                }}
                className="px-2 py-1 rounded-lg border border-slate-200 bg-white font-mono text-xs"
              />
            </div>
          </div>

          {/* Search box */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer, phone..."
              className="w-full pl-8 pr-3 py-1 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#F26B1D]"
            />
          </div>
        </div>

        {/* Summary Stat Cards */}
        <div className="p-4 grid grid-cols-3 gap-3 bg-white border-b border-slate-100">
          <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-900">
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
              Total Receivable (Udhaar)
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono mt-0.5 block">
              {formatPaisa(totalFilteredReceivablePaisa)}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Customers with Balance
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-0.5 block">
              {filteredRows.length}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
              Overdue Accounts
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono mt-0.5 block">
              {filteredRows.filter((r) => r.is_overdue).length}
            </span>
          </div>
        </div>

        {/* Report Table */}
        <div className="p-4 overflow-y-auto flex-1">
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3 text-center">Orders</th>
                  <th className="py-2.5 px-3 text-right">Total Spent</th>
                  <th className="py-2.5 px-3 text-right">Total Paid</th>
                  <th className="py-2.5 px-3 text-right">Balance Due</th>
                  <th className="py-2.5 px-3 text-center">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                      No pending balances found for this filter.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr
                      key={row.phone}
                      onClick={() => {
                        if (onSelectCustomer) {
                          onSelectCustomer(row);
                          onClose();
                        }
                      }}
                      className="hover:bg-slate-50/80 cursor-pointer transition"
                    >
                      <td className="py-2.5 px-3 font-sans font-bold text-slate-900">
                        {row.name}
                        {row.is_overdue && (
                          <span className="ml-2 px-1.5 py-0.2 rounded bg-red-100 text-red-800 text-[9px] font-black uppercase">
                            Overdue
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{formatPhone(row.phone)}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">{row.totalOrders}</td>
                      <td className="py-2.5 px-3 text-right text-slate-800">{formatPaisa(row.totalSpentPaisa)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-700">{formatPaisa(row.totalPaidPaisa)}</td>
                      <td className="py-2.5 px-3 text-right font-black text-red-600 text-sm">
                        {formatPaisa(row.totalBalanceDuePaisa)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans text-[11px] text-slate-500">
                        {row.due_date ? new Date(row.due_date).toLocaleDateString('en-PK') : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="no-print p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Click any customer to open their ledger and receive payment</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
