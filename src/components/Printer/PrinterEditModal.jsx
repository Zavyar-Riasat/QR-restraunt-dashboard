import React, { useState, useEffect } from 'react';
import {
  Printer,
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { printerService } from '../../services/printer/printerService';
import {
  DRIVER_IDS,
  PAPER_SIZES,
  PRINT_TARGETS,
  PRINTER_TYPE_OPTIONS,
} from '../../services/printer/printerTypes';

export default function PrinterEditModal({ isOpen, onClose, printer, categories = [], onPrinterUpdated }) {
  const [formData, setFormData] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState(null);

  useEffect(() => {
    if (printer) {
      setFormData({
        ...printer,
        categories: printer.categories || ['all'],
        copies: printer.copies || 1,
        autoPrint: Boolean(printer.autoPrint),
        openCashDrawer: Boolean(printer.openCashDrawer),
        isDefault: Boolean(printer.isDefault),
        connection: { ...printer.connection },
      });
      setTestStatus(null);
    }
  }, [printer, isOpen]);

  if (!isOpen || !formData) return null;

  const currentTypeOption =
    PRINTER_TYPE_OPTIONS.find((t) => t.id === formData.type) || PRINTER_TYPE_OPTIONS[0];

  const handleToggleCategory = (catId) => {
    if (catId === 'all') {
      setFormData((prev) => ({ ...prev, categories: ['all'] }));
      return;
    }

    let next = (formData.categories || []).filter((c) => c !== 'all');
    if (next.includes(catId)) {
      next = next.filter((c) => c !== catId);
      if (next.length === 0) next = ['all'];
    } else {
      next.push(catId);
    }
    setFormData((prev) => ({ ...prev, categories: next }));
  };

  const handleTestPrint = async () => {
    try {
      setIsTesting(true);
      setTestStatus(null);
      await printerService.printTestPageForPrinter(formData);
      setTestStatus({
        type: 'success',
        text: `Test page printed on "${formData.name}" successfully!`,
      });
      setTimeout(() => setTestStatus(null), 4000);
    } catch (err) {
      setTestStatus({
        type: 'error',
        text: `Print error: ${err.message}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    const updated = printerService.savePrinter({
      ...formData,
      copies: Math.max(1, parseInt(formData.copies, 10) || 1),
    });
    if (onPrinterUpdated) {
      onPrinterUpdated(updated);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-[#F0E4D7] overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#FFF9F2] via-white to-[#FFF9F2] border-b border-[#F0E4D7] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF1E6] text-[#F26B1D] flex items-center justify-center font-bold border border-[#FCD8BF]">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-extrabold text-[#2B2118]">
                Edit Printer Settings
              </h2>
              <p className="text-xs text-[#7A6A5C]">
                Configure "{formData.name}" ({currentTypeOption.name})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Test Status Banner */}
          {testStatus && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 ${
                testStatus.type === 'success'
                  ? 'bg-[#E7F6EC] border border-[#C0E9CE] text-[#1F9D55]'
                  : 'bg-[#FDECEC] border border-[#F9C3C5] text-[#D92D20]'
              }`}
            >
              {testStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#1F9D55]" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-[#D92D20]" />
              )}
              <span>{testStatus.text}</span>
            </div>
          )}

          {/* Name & Paper Size */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider">
                Printer Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Kitchen, Bar, Counter"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#F0E4D7] text-[#2B2118] text-sm font-semibold focus:outline-none focus:border-[#F26B1D] shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider">
                Paper Size
              </label>
              <select
                value={formData.paperSize}
                onChange={(e) => setFormData({ ...formData, paperSize: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#F0E4D7] text-[#2B2118] text-sm font-semibold focus:outline-none focus:border-[#F26B1D] shadow-2xs bg-white"
              >
                <option value={PAPER_SIZES.SIZE_58MM}>58mm (2-inch pocket thermal)</option>
                <option value={PAPER_SIZES.SIZE_80MM}>80mm (3-inch counter roll)</option>
                <option value={PAPER_SIZES.SIZE_A4}>A4 (Full page regular)</option>
              </select>
            </div>
          </div>

          {/* What to print: KOT, Bill, Both */}
          <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-2.5">
            <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider">
              What to print?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { id: PRINT_TARGETS.KOT, label: 'Kitchen (KOT)', sub: 'Dishes for chef' },
                { id: PRINT_TARGETS.BILL, label: 'Customer Bill', sub: 'Guest invoice' },
                { id: PRINT_TARGETS.BOTH, label: 'Both (KOT & Bill)', sub: 'All tickets' },
              ].map((target) => (
                <button
                  key={target.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, printTarget: target.id })}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    formData.printTarget === target.id
                      ? 'border-[#F26B1D] bg-white ring-2 ring-[#F26B1D] shadow-xs'
                      : 'border-[#F0E4D7] bg-white/60 hover:bg-white'
                  }`}
                >
                  <p className="text-xs font-bold text-[#2B2118]">{target.label}</p>
                  <p className="text-[10px] text-[#7A6A5C]">{target.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Which categories this printer handles */}
          <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider">
                Categories Handled
              </label>
              <span className="text-[11px] text-[#7A6A5C]">Filters items for this printer</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleToggleCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  formData.categories?.includes('all')
                    ? 'bg-[#F26B1D] text-white border-[#F26B1D] shadow-xs'
                    : 'bg-white text-[#7A6A5C] border-[#F0E4D7] hover:border-[#F26B1D]'
                }`}
              >
                ⭐ All Categories
              </button>

              {categories.map((cat) => {
                const isChecked =
                  formData.categories?.includes(cat.id) || formData.categories?.includes(cat.name);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleToggleCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      isChecked && !formData.categories?.includes('all')
                        ? 'bg-[#F26B1D] text-white border-[#F26B1D] shadow-xs'
                        : 'bg-white text-[#7A6A5C] border-[#F0E4D7] hover:border-[#F26B1D]'
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Copies & Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Number of copies */}
            <div className="p-4 rounded-2xl bg-[#FFF9F2]/60 border border-[#F0E4D7] flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-[#2B2118]">Number of Copies</label>
                <p className="text-[10px] text-[#7A6A5C]">Print count per order</p>
              </div>
              <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-[#F0E4D7]">
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, copies: Math.max(1, (prev.copies || 1) - 1) }))
                  }
                  className="w-7 h-7 rounded-lg bg-slate-50 border border-[#F0E4D7] text-[#2B2118] font-bold text-xs hover:bg-[#FFF1E6] transition cursor-pointer"
                >
                  -
                </button>
                <span className="w-6 text-center text-xs font-extrabold text-[#2B2118]">
                  {formData.copies || 1}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, copies: Math.min(5, (prev.copies || 1) + 1) }))
                  }
                  className="w-7 h-7 rounded-lg bg-slate-50 border border-[#F0E4D7] text-[#2B2118] font-bold text-xs hover:bg-[#FFF1E6] transition cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Set as Default Printer */}
            <div className="p-4 rounded-2xl bg-[#FFF9F2]/60 border border-[#F0E4D7] flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-[#2B2118]">Set as Default</label>
                <p className="text-[10px] text-[#7A6A5C]">Primary printer for quick actions</p>
              </div>
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="w-4 h-4 accent-[#F26B1D] cursor-pointer"
              />
            </div>

            {/* Auto-print new orders */}
            <div className="p-4 rounded-2xl bg-[#FFF9F2]/60 border border-[#F0E4D7] flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-[#2B2118]">Auto-print New Orders</label>
                <p className="text-[10px] text-[#7A6A5C]">Print automatically on live order</p>
              </div>
              <input
                type="checkbox"
                checked={formData.autoPrint}
                onChange={(e) => setFormData({ ...formData, autoPrint: e.target.checked })}
                className="w-4 h-4 accent-[#F26B1D] cursor-pointer"
              />
            </div>

            {/* Open cash drawer */}
            <div className="p-4 rounded-2xl bg-[#FFF9F2]/60 border border-[#F0E4D7] flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-[#2B2118]">Open Cash Drawer</label>
                <p className="text-[10px] text-[#7A6A5C]">Sends pulse after bill</p>
              </div>
              <input
                type="checkbox"
                checked={formData.openCashDrawer}
                onChange={(e) => setFormData({ ...formData, openCashDrawer: e.target.checked })}
                className="w-4 h-4 accent-[#F26B1D] cursor-pointer"
              />
            </div>
          </div>

          {/* Network IP/Port if Network type */}
          {formData.type === DRIVER_IDS.NETWORK && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Network Printer IP Configuration
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">IP Address</label>
                  <input
                    type="text"
                    value={formData.connection?.ip || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        connection: { ...formData.connection, ip: e.target.value },
                      })
                    }
                    placeholder="192.168.1.100"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-mono font-bold bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Port</label>
                  <input
                    type="number"
                    value={formData.connection?.port || 9100}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        connection: {
                          ...formData.connection,
                          port: parseInt(e.target.value, 10) || 9100,
                        },
                      })
                    }
                    placeholder="9100"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-mono font-bold bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Bottom Actions inside form */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#F0E4D7]">
            <button
              type="button"
              disabled={isTesting}
              onClick={handleTestPrint}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white border border-[#F26B1D] text-[#F26B1D] hover:bg-[#FFF1E6] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {isTesting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Printer className="w-3.5 h-3.5" />
              )}
              <span>Print Test Page</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white border border-[#F0E4D7] hover:bg-slate-50 text-[#7A6A5C] text-xs font-bold transition cursor-pointer shadow-2xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-orange-500/20"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
