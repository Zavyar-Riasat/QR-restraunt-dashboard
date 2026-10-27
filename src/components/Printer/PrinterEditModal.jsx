import React, { useState, useEffect } from 'react';
import {
  Printer,
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  HardDrive,
  Usb,
  Zap,
  Image as ImageIcon,
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
  const [systemPrinters, setSystemPrinters] = useState([]);
  const [isPairing, setIsPairing] = useState(false);
  const [pairingError, setPairingError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI?.getSystemPrinters) {
      window.electronAPI
        .getSystemPrinters()
        .then((printers) => {
          if (Array.isArray(printers)) {
            setSystemPrinters(printers);
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleAutoDetectUSB = async () => {
    try {
      setIsPairing(true);
      setPairingError('');
      const detected = await printerService.autoDetectPrinter();
      if (!detected) {
        throw new Error('No compatible USB thermal printer detected.');
      }
      setFormData((prev) => ({
        ...prev,
        connection: {
          ...prev.connection,
          deviceName: detected.productName || detected.name || prev.connection?.deviceName,
          vendorId: detected.vendorId,
          productId: detected.productId,
          serialNumber: detected.serialNumber || prev.connection?.serialNumber || '',
        },
      }));
      setTestStatus({
        type: 'success',
        text: `Detected USB Printer: ${detected.productName || 'Thermal POS'} (VID: 0x${detected.vendorId.toString(16)})`,
      });
    } catch (err) {
      setPairingError(err.message || 'Auto-detection failed.');
    } finally {
      setIsPairing(false);
    }
  };

  useEffect(() => {
    if (printer) {
      setFormData({
        ...printer,
        categories: printer.categories || ['all'],
        copies: printer.copies || 1,
        autoPrint: Boolean(printer.autoPrint),
        openCashDrawer: Boolean(printer.openCashDrawer),
        showLogo: printer.showLogo !== undefined ? Boolean(printer.showLogo) : false,
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
        type: 'confirm',
        text: `Test ticket dispatched to "${formData.name}". Did it print?`,
      });
    } catch (err) {
      setTestStatus({
        type: 'error',
        text: `Print error: ${err.message}`,
      });
      setTimeout(() => setTestStatus(null), 5000);
    } finally {
      setIsTesting(false);
    }
  };

  const handleConfirmModalTestPrint = (didPrint) => {
    setFormData((prev) => ({
      ...prev,
      status: didPrint ? 'connected' : 'disconnected',
      verifiedConnected: Boolean(didPrint),
    }));
    if (didPrint) {
      setTestStatus({
        type: 'success',
        text: `"${formData.name}" confirmed connected!`,
      });
    } else {
      setTestStatus({
        type: 'error',
        text: `"${formData.name}" set to not connected.`,
      });
    }
    setTimeout(() => setTestStatus(null), 4000);
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
              className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2.5 ${
                testStatus.type === 'success'
                  ? 'bg-[#E7F6EC] border border-[#C0E9CE] text-[#1F9D55]'
                  : testStatus.type === 'confirm'
                  ? 'bg-[#FFF9F2] border border-[#FCD8BF] text-[#2B2118]'
                  : 'bg-[#FDECEC] border border-[#F9C3C5] text-[#D92D20]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {testStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#1F9D55]" />
                ) : testStatus.type === 'confirm' ? (
                  <Printer className="w-4 h-4 shrink-0 text-[#F26B1D]" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#D92D20]" />
                )}
                <span>{testStatus.text}</span>
              </div>
              {testStatus.type === 'confirm' && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleConfirmModalTestPrint(true)}
                    className="px-2.5 py-1 rounded-lg bg-[#1F9D55] text-white text-[11px] font-bold hover:bg-[#188044] transition cursor-pointer"
                  >
                    Yes, printed!
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmModalTestPrint(false)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold hover:bg-slate-200 transition cursor-pointer"
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Connection Status Row */}
          <div className="p-3.5 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] flex items-center justify-between gap-3">
            <div>
              <label className="text-xs font-bold text-[#2B2118] block">Connection Status</label>
              <p className="text-[10px] text-[#7A6A5C]">Hardware status on this computer</p>
            </div>
            <div className="flex items-center gap-2">
              {formData.status === 'connected' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E7F6EC] border border-[#C0E9CE] text-[#1F9D55] text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-[#1F9D55]" />
                  <span>Connected</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDECEC] border border-[#F9C3C5] text-[#D92D20] text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-[#D92D20] animate-pulse" />
                  <span>Not connected</span>
                </span>
              )}
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    status: prev.status === 'connected' ? 'disconnected' : 'connected',
                    verifiedConnected: prev.status !== 'connected',
                  }))
                }
                className="px-2.5 py-1 rounded-lg bg-white border border-[#F0E4D7] hover:bg-slate-50 text-[11px] font-bold text-[#7A6A5C] transition cursor-pointer shadow-2xs"
              >
                {formData.status === 'connected' ? 'Mark Disconnected' : 'Mark Connected'}
              </button>
            </div>
          </div>

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

            {/* Print Logo on Bill / Receipt */}
            <div className="p-4 rounded-2xl bg-[#FFF9F2]/60 border border-[#F0E4D7] flex items-center justify-between sm:col-span-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FFF1E6] text-[#F26B1D] flex items-center justify-center shrink-0">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#2B2118] block">Print Logo on Bill / Receipt</label>
                  <p className="text-[10px] text-[#7A6A5C]">Include restaurant brand logo at the top of receipts (Default: No)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold ${formData.showLogo ? 'text-[#F26B1D]' : 'text-slate-400'}`}>
                  {formData.showLogo ? 'Yes (ON)' : 'No (OFF)'}
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(formData.showLogo)}
                  onChange={(e) => setFormData({ ...formData, showLogo: e.target.checked })}
                  className="w-4 h-4 accent-[#F26B1D] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Windows Installed Printer Configuration */}
          {formData.type === DRIVER_IDS.WINDOWS && (
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-3">
              <div className="flex items-start gap-2.5">
                <HardDrive className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                    Windows Installed Printer (Port-Independent)
                  </h4>
                  <p className="text-[11px] text-blue-800/90 mt-0.5 leading-relaxed">
                    Prints through your Windows driver and background spooler. <strong>100% immune to USB port changes</strong> because Windows transparently manages device binding.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Windows Printer Name
                </label>
                {systemPrinters.length > 0 ? (
                  <select
                    value={formData.connection?.deviceName || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        connection: { ...formData.connection, deviceName: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                  >
                    <option value="">-- Select installed Windows printer --</option>
                    {systemPrinters.map((p) => (
                      <option key={p.name || p} value={p.name || p}>
                        {p.displayName || p.name || p} {p.isDefault ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.connection?.deviceName || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        connection: { ...formData.connection, deviceName: e.target.value },
                      })
                    }
                    placeholder="e.g. POS-80, EPSON TM-T20III, Xprinter XP-N160I"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                  />
                )}

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500">Presets:</span>
                  {['POS-80', 'EPSON TM-T20III', 'Xprinter XP-N160I', 'POS-58', 'Microsoft Print to PDF'].map((commonName) => (
                    <button
                      key={commonName}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          connection: { ...formData.connection, deviceName: commonName },
                        })
                      }
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition cursor-pointer ${
                        formData.connection?.deviceName === commonName
                          ? 'bg-[#F26B1D] text-white border-[#F26B1D]'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-[#F26B1D]'
                      }`}
                    >
                      {commonName}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* USB Direct Thermal Configuration */}
          {formData.type === DRIVER_IDS.USB && (
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                    USB Identification: Vendor ID & Product ID
                  </h4>
                  <p className="text-[11px] text-emerald-800/90 mt-0.5 leading-relaxed">
                    Identified by USB hardware VID & PID, <strong>never by COM port or bus path</strong>. Automatically reconnects even if moved to another USB port.
                  </p>
                </div>
              </div>

              {formData.connection?.vendorId && (
                <div className="p-2.5 rounded-xl bg-white border border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-600 font-medium">Hardware Profile:</span>
                  <span className="font-mono text-[11px] font-bold text-slate-800">
                    VID: 0x{formData.connection.vendorId.toString(16).padStart(4, '0')} | PID: 0x{(formData.connection.productId || 0).toString(16).padStart(4, '0')}
                    {formData.connection?.serialNumber ? ` | S/N: ${formData.connection.serialNumber}` : ''}
                  </span>
                </div>
              )}

              {/* Station Label Disambiguation */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700">
                    Station Label (for identical models)
                  </label>
                  <span className="text-[10px] text-slate-500">
                    Disambiguates duplicate printers
                  </span>
                </div>
                <input
                  type="text"
                  value={formData.connection?.stationLabel || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      connection: { ...formData.connection, stationLabel: e.target.value },
                    })
                  }
                  placeholder="e.g. Kitchen Station, Front Counter"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                />
              </div>

              <div className="pt-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleAutoDetectUSB}
                  disabled={isPairing}
                  className="px-3 py-1.5 rounded-xl bg-white border border-emerald-500 text-emerald-700 hover:bg-emerald-50 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isPairing ? 'Detecting...' : 'Auto-Detect Printer on USB'}</span>
                </button>
              </div>

              {pairingError && (
                <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                  {pairingError}
                </div>
              )}
            </div>
          )}

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
