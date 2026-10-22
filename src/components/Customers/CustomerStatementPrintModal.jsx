import React, { useState } from 'react';
import {
  X,
  Printer,
  Download,
  Share2,
  Check,
  FileText,
  Copy,
} from 'lucide-react';
import {
  formatPKR,
  formatPaisa,
  formatPhone,
  toRupees,
} from '../../utils/currencyUtils';
import { customerKhataService } from '../../services/customerKhataService';

export default function CustomerStatementPrintModal({
  customer,
  isOpen,
  onClose,
  restaurant,
}) {
  const [paperFormat, setPaperFormat] = useState('80mm'); // '80mm' | 'a4'
  const [copiedShare, setCopiedShare] = useState(false);

  if (!isOpen || !customer) return null;

  const restId = restaurant?.id || 'rest-101';
  const restName = restaurant?.name || 'DineHQ Restaurant';

  const ledgerData = customerKhataService.getCustomerLedger(restId, customer.phone);
  const { lineItems, summary } = ledgerData;

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const text = customerKhataService.generateShareStatementText(
      restId,
      customer.phone,
      restName
    );

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Account Statement - ${customer.name}`,
          text,
        });
        return;
      } catch (e) {
        // Fallback to clipboard if share was cancelled or failed
      }
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 3000);
    }
  };

  const handleDownloadCSV = () => {
    const csvContent = customerKhataService.exportCustomerLedgerCSV(
      restId,
      customer.phone,
      restName
    );
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Statement_${customer.name.replace(/\s+/g, '_')}_${customer.phone}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto print:static print:bg-transparent print:p-0 print:m-0"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 my-auto print:border-none print:shadow-none print:max-w-none print:w-full print:rounded-none print:m-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Controls Header (Hidden on Print) */}
        <div className="no-print p-4 border-b border-[#F0E4D7] bg-[#FFF9F2] flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-[#F26B1D]" />
            <h3 className="font-extrabold text-sm sm:text-base text-[#2B2118]">
              Customer Statement • {customer.name}
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Format Toggle (80mm vs A4) */}
            <div className="flex rounded-xl bg-white p-1 border border-[#F0E4D7] text-xs font-bold">
              <button
                type="button"
                onClick={() => setPaperFormat('80mm')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  paperFormat === '80mm'
                    ? 'bg-[#F26B1D] text-white'
                    : 'text-[#7A6A5C] hover:text-[#2B2118]'
                }`}
              >
                80mm Thermal
              </button>
              <button
                type="button"
                onClick={() => setPaperFormat('a4')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  paperFormat === 'a4'
                    ? 'bg-[#F26B1D] text-white'
                    : 'text-[#7A6A5C] hover:text-[#2B2118]'
                }`}
              >
                A4 Statement
              </button>
            </div>

            {/* Share Button */}
            <button
              type="button"
              onClick={handleShare}
              className="px-2.5 py-1.5 rounded-xl bg-white border border-[#F0E4D7] text-[#2B2118] text-xs font-bold hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
              title="Share statement text via WhatsApp or share sheet"
            >
              {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-blue-600" />}
              <span>{copiedShare ? 'Copied!' : 'Share'}</span>
            </button>

            {/* Download CSV / Excel */}
            <button
              type="button"
              onClick={handleDownloadCSV}
              className="px-2.5 py-1.5 rounded-xl bg-white border border-[#F0E4D7] text-[#2B2118] text-xs font-bold hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
              title="Download Statement in Excel / CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel/CSV</span>
            </button>

            {/* Print Action */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-[#F26B1D] text-white text-xs font-bold hover:bg-[#D95A12] transition flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Statement Area */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          {paperFormat === '80mm' ? (
            /* 80mm Thermal Receipt Layout */
            <div className="w-[300px] bg-white p-4 shadow-md text-slate-900 font-mono text-[11px] leading-tight space-y-2 border border-slate-200 print:border-none print:shadow-none print:w-full print:p-0">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <h2 className="font-black text-sm uppercase tracking-wider">{restName}</h2>
                <div className="text-[10px] text-slate-500 font-sans mt-0.5">Khata Account Statement</div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {new Date().toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}
                </div>
              </div>

              <div className="py-1 border-b border-dashed border-slate-300 text-[10px] space-y-0.5">
                <div><strong>Customer:</strong> {customer.name}</div>
                <div><strong>Phone:</strong> {formatPhone(customer.phone)}</div>
                {customer.address && <div className="truncate"><strong>Address:</strong> {customer.address}</div>}
              </div>

              {/* Ledger Summary */}
              <div className="py-1 border-b border-dashed border-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span>Total Billed:</span>
                  <span className="font-bold">{formatPKR(summary.totalDebits)}</span>
                </div>
                <div className="flex justify-between text-emerald-800">
                  <span>Total Paid:</span>
                  <span className="font-bold">{formatPKR(summary.totalCredits)}</span>
                </div>
                <div className="flex justify-between text-red-700 font-black text-xs pt-1 border-t border-slate-200">
                  <span>NET BALANCE DUE:</span>
                  <span>{formatPKR(summary.currentBalance)}</span>
                </div>
              </div>

              {/* Transactions List */}
              <div className="pt-1">
                <div className="font-bold text-[10px] uppercase pb-1 border-b border-slate-300 flex justify-between">
                  <span>Date/Ref</span>
                  <span>Dr / Cr</span>
                  <span>Balance</span>
                </div>

                <div className="divide-y divide-slate-100 text-[10px] pt-1">
                  {lineItems.map((item) => (
                    <div key={item.id} className="py-1 space-y-0.5">
                      <div className="flex justify-between">
                        <span className="font-bold">{item.ref}</span>
                        <span>{new Date(item.date).toLocaleDateString('en-PK', { month: 'numeric', day: 'numeric' })}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>{item.type === 'DEBIT' ? `+${item.debit}` : `-${item.credit}`}</span>
                        <span className="font-bold text-slate-900">Rs. {item.runningBalance}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[9px] text-slate-500">
                Thank you for your business! Please settle outstanding balances promptly.
              </div>
            </div>
          ) : (
            /* A4 Full Statement Layout */
            <div className="w-full max-w-[650px] bg-white p-8 shadow-md text-slate-900 text-xs leading-normal space-y-6 border border-slate-200 rounded-2xl print:border-none print:shadow-none print:max-w-none print:w-full print:p-0">
              {/* Header */}
              <div className="flex items-start justify-between border-b pb-4 border-slate-200">
                <div>
                  <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">{restName}</h1>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Customer Ledger & Account Statement</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Generated: {new Date().toLocaleDateString('en-PK', { dateStyle: 'full' })} at {new Date().toLocaleTimeString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold font-mono">
                    Khata Statement
                  </span>
                </div>
              </div>

              {/* Customer Profile Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer Details</span>
                  <div className="font-bold text-sm text-slate-900 mt-0.5">{customer.name}</div>
                  <div className="font-mono text-slate-600 mt-0.5">{formatPhone(customer.phone)}</div>
                  {customer.address && <div className="text-slate-600 mt-1 text-[11px]">{customer.address}</div>}
                </div>
                <div className="text-right space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Account Summary</span>
                  <div className="text-xs">
                    Total Billed: <span className="font-mono font-bold">{formatPKR(summary.totalDebits)}</span>
                  </div>
                  <div className="text-xs text-emerald-700">
                    Total Paid: <span className="font-mono font-bold">{formatPKR(summary.totalCredits)}</span>
                  </div>
                  <div className="text-sm font-black text-red-600 pt-1 border-t border-slate-200">
                    Balance Due: <span className="font-mono">{formatPKR(summary.currentBalance)}</span>
                  </div>
                </div>
              </div>

              {/* Ledger Table */}
              <div>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b-2 border-slate-300 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-2">Date</th>
                      <th className="py-2">Reference</th>
                      <th className="py-2">Type</th>
                      <th className="py-2 text-right">Debit (Rs.)</th>
                      <th className="py-2 text-right">Credit (Rs.)</th>
                      <th className="py-2 text-right">Balance (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {lineItems.map((row) => (
                      <tr key={row.id} className={row.is_void ? 'opacity-50 line-through' : ''}>
                        <td className="py-2 text-slate-600">
                          {new Date(row.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="py-2 font-bold text-slate-900">{row.ref}</td>
                        <td className="py-2 font-sans text-slate-600">{row.typeLabel}</td>
                        <td className="py-2 text-right font-medium">{row.debit > 0 ? row.debit.toLocaleString() : '-'}</td>
                        <td className="py-2 text-right text-emerald-700 font-medium">{row.credit > 0 ? row.credit.toLocaleString() : '-'}</td>
                        <td className="py-2 text-right font-bold text-slate-900">{row.runningBalance.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 font-mono font-bold text-xs">
                      <td colSpan={3} className="py-2.5 font-sans font-black">TOTALS</td>
                      <td className="py-2.5 text-right">{summary.totalDebits?.toLocaleString()}</td>
                      <td className="py-2.5 text-right text-emerald-700">{summary.totalCredits?.toLocaleString()}</td>
                      <td className="py-2.5 text-right text-red-600 font-black">{summary.currentBalance?.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="pt-4 border-t border-slate-200 text-center text-slate-400 text-[10px]">
                Please contact {restName} for any payment inquiries. All amounts recorded in Pakistani Rupees (PKR).
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
