import React, { useState, useEffect } from 'react';
import {
  Printer,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Star,
  Usb,
  Bluetooth,
  Wifi,
  Smartphone,
} from 'lucide-react';
import { printerService } from '../../services/printer/printerService';
import {
  DRIVER_IDS,
  PRINT_TARGETS,
} from '../../services/printer/printerTypes';
import PrinterSetupWizard from './PrinterSetupWizard';
import PrinterEditModal from './PrinterEditModal';

export default function PrintersSection({ categories = [] }) {
  const [printers, setPrinters] = useState(() => printerService.getPrinters());
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState(null);
  const [testingId, setTestingId] = useState(null);
  const [testNotification, setTestNotification] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    return printerService.subscribe((data) => {
      if (data && data.printers) {
        setPrinters(data.printers);
      } else {
        setPrinters(printerService.getPrinters());
      }
    });
  }, []);

  const handleTestPrint = async (printer) => {
    try {
      setTestingId(printer.id);
      setTestNotification(null);
      const res = await printerService.printTestPageForPrinter(printer);
      if (res.usedFallback) {
        setTestNotification({
          type: 'warning',
          printerId: printer.id,
          text: `Opened via Browser Print fallback (${res.message || 'Thermal driver unavailable'})`,
        });
      } else {
        setTestNotification({
          type: 'success',
          printerId: printer.id,
          text: `Test page sent to "${printer.name}" successfully!`,
        });
      }
      setTimeout(() => setTestNotification(null), 5000);
    } catch (err) {
      setTestNotification({
        type: 'error',
        printerId: printer.id,
        text: `Print test failed: ${err.message}`,
      });
      setTimeout(() => setTestNotification(null), 6000);
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = (printerId) => {
    printerService.deletePrinter(printerId);
    setDeletingId(null);
  };

  const handleSetDefault = (printerId) => {
    printerService.setDefaultPrinter(printerId);
  };

  const getCategoryNames = (catIds = []) => {
    if (!catIds || catIds.includes('all') || catIds.length === 0) {
      return 'All Categories';
    }
    return catIds
      .map((id) => {
        const found = categories.find((c) => c.id === id);
        return found ? found.name : id;
      })
      .join(', ');
  };

  const getTargetBadge = (target) => {
    switch (target) {
      case PRINT_TARGETS.KOT:
        return { label: 'KOT Only', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case PRINT_TARGETS.BILL:
        return { label: 'Customer Bill Only', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case PRINT_TARGETS.BOTH:
      default:
        return { label: 'Both (KOT & Bill)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
  };

  const renderTypeIcon = (type) => {
    switch (type) {
      case DRIVER_IDS.USB:
        return <Usb className="w-4 h-4 text-sky-600" />;
      case DRIVER_IDS.BLUETOOTH:
        return <Bluetooth className="w-4 h-4 text-indigo-600" />;
      case DRIVER_IDS.NETWORK:
        return <Wifi className="w-4 h-4 text-emerald-600" />;
      case DRIVER_IDS.RAWBT:
        return <Smartphone className="w-4 h-4 text-purple-600" />;
      case DRIVER_IDS.BROWSER:
      default:
        return <Printer className="w-4 h-4 text-[#F26B1D]" />;
    }
  };

  return (
    <div id="printers-section" className="bg-white border border-[#F0E4D7] rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
      {/* Title & Big "+ Add Printer" Button */}
      <div className="pb-5 border-b border-[#F0E4D7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-heading font-extrabold text-[#2B2118] tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#FFF1E6] text-[#F26B1D]">
              <Printer className="w-5 h-5" />
            </span>
            <span>Printers</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#7A6A5C] mt-1">
            Configure kitchen and receipt printers, paper sizes, and category routing rules.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsWizardOpen(true)}
          className="px-5 py-3 rounded-2xl bg-[#F26B1D] hover:bg-[#D95A12] active:scale-[0.98] text-white text-xs sm:text-sm font-extrabold shadow-md shadow-orange-500/20 transition flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Add Printer</span>
        </button>
      </div>

      {/* Global Notification Banner */}
      {testNotification && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 animate-fadeIn ${
            testNotification.type === 'success'
              ? 'bg-[#E7F6EC] border border-[#C0E9CE] text-[#1F9D55]'
              : testNotification.type === 'warning'
              ? 'bg-[#FEF3D9] border border-[#FCE1A8] text-[#F5A623]'
              : 'bg-[#FDECEC] border border-[#F9C3C5] text-[#D92D20]'
          }`}
        >
          {testNotification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#1F9D55]" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{testNotification.text}</span>
        </div>
      )}

      {/* Printer List */}
      {printers.length === 0 ? (
        <div className="p-8 text-center bg-[#FFF9F2] rounded-3xl border border-dashed border-[#FCD8BF] space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF1E6] text-[#F26B1D] flex items-center justify-center mx-auto">
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#2B2118]">No Printers Configured Yet</h3>
            <p className="text-xs text-[#7A6A5C] max-w-sm mx-auto mt-1">
              Add your kitchen or counter printer with our simple 4-step setup wizard to start auto-printing orders.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsWizardOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs font-extrabold transition shadow-md shadow-orange-500/20 inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add First Printer</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {printers.map((printer) => {
            const isConnected = printer.status === 'connected';
            const targetBadge = getTargetBadge(printer.printTarget);
            const isDefaultPrinter = Boolean(printer.isDefault);

            return (
              <div
                key={printer.id}
                className={`p-5 rounded-2xl border transition relative flex flex-col justify-between space-y-4 ${
                  isDefaultPrinter
                    ? 'border-[#F26B1D]/40 bg-gradient-to-b from-[#FFF9F2]/70 to-white shadow-xs'
                    : 'border-[#F0E4D7] bg-white hover:border-[#FCD8BF]'
                }`}
              >
                {/* Card Header: Name + Default Star + Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-heading font-extrabold text-[#2B2118]">
                        {printer.name}
                      </h3>
                      {isDefaultPrinter && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                          <span>Default</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#7A6A5C]">
                      {renderTypeIcon(printer.type)}
                      <span className="font-semibold">{printer.typeName || printer.type}</span>
                    </div>
                  </div>

                  {/* Status Indicator (Green or Red) */}
                  <div>
                    {isConnected ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E7F6EC] border border-[#C0E9CE] text-[#1F9D55] text-xs font-bold">
                        <span className="w-2 h-2 rounded-full bg-[#1F9D55] shadow-xs shadow-green-500/50" />
                        <span>Connected</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDECEC] border border-[#F9C3C5] text-[#D92D20] text-xs font-bold">
                        <span className="w-2 h-2 rounded-full bg-[#D92D20] animate-pulse" />
                        <span>Not connected</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Per-Printer Details & Settings Chips */}
                <div className="space-y-2 pt-1 border-t border-[#F0E4D7]/70">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    {/* Paper Size */}
                    <span className="px-2 py-0.5 rounded-md bg-[#FFF9F2] text-[#7A6A5C] font-mono font-bold border border-[#F0E4D7]">
                      {printer.paperSize || '80mm'}
                    </span>

                    {/* What to print */}
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold border ${targetBadge.color}`}
                    >
                      {targetBadge.label}
                    </span>

                    {/* Number of Copies */}
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200">
                      {printer.copies || 1} {(printer.copies || 1) === 1 ? 'copy' : 'copies'}
                    </span>

                    {/* Auto-print status */}
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold border ${
                        printer.autoPrint
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      Auto-Print: {printer.autoPrint ? 'ON' : 'OFF'}
                    </span>

                    {/* Cash drawer */}
                    {printer.openCashDrawer && (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                        Cash Drawer: ON
                      </span>
                    )}
                  </div>

                  {/* Categories handled */}
                  <div className="text-[11px] text-[#7A6A5C] flex items-center gap-1.5 pt-0.5">
                    <span className="font-bold text-[#2B2118]">Categories:</span>
                    <span className="truncate max-w-[260px] font-medium">
                      {getCategoryNames(printer.categories)}
                    </span>
                  </div>

                  {/* Connection Details Subtext (if IP or device) */}
                  {printer.connection?.ip && (
                    <div className="text-[11px] text-[#7A6A5C] font-mono">
                      IP: {printer.connection.ip}:{printer.connection.port || 9100}
                    </div>
                  )}
                  {printer.connection?.deviceName && (
                    <div className="text-[11px] text-[#7A6A5C] truncate">
                      Device: {printer.connection.deviceName}
                    </div>
                  )}
                </div>

                {/* Card Action Buttons: Test Print, Edit, Delete */}
                <div className="pt-3 border-t border-[#F0E4D7] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={testingId === printer.id}
                      onClick={() => handleTestPrint(printer)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-[#F26B1D] text-[#F26B1D] hover:bg-[#FFF1E6] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                      title="Send sample test ticket to this printer"
                    >
                      {testingId === printer.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Printer className="w-3.5 h-3.5" />
                      )}
                      <span>Test Print</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingPrinter(printer)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-200"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!isDefaultPrinter && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(printer.id)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#7A6A5C] hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                        title="Set as default printer"
                      >
                        Make Default
                      </button>
                    )}

                    {deletingId === printer.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDelete(printer.id)}
                          className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold cursor-pointer hover:bg-rose-700"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(null)}
                          className="px-2 py-1 rounded-lg bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer hover:bg-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeletingId(printer.id)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Delete printer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Setup Wizard Modal */}
      <PrinterSetupWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        categories={categories}
        onPrinterAdded={() => {
          setPrinters(printerService.getPrinters());
        }}
      />

      {/* Edit Modal */}
      <PrinterEditModal
        isOpen={Boolean(editingPrinter)}
        printer={editingPrinter}
        categories={categories}
        onClose={() => setEditingPrinter(null)}
        onPrinterUpdated={() => {
          setPrinters(printerService.getPrinters());
        }}
      />
    </div>
  );
}
