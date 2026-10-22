import React, { useState } from 'react';
import {
  Printer,
  Usb,
  Bluetooth,
  Wifi,
  Smartphone,
  HardDrive,
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { printerService } from '../../services/printer/printerService';
import {
  DRIVER_IDS,
  PAPER_SIZES,
  PRINT_TARGETS,
  PRINTER_TYPE_OPTIONS,
  createDefaultPrinter,
} from '../../services/printer/printerTypes';
import {
  isWebUSBSupported,
  isWebBluetoothSupported,
  isWebSerialSupported,
  isPrinterTypeSupported,
  isIOS,
} from '../../services/printer/capabilities';

const NAME_SUGGESTIONS = ['Kitchen', 'Counter', 'Bar', 'Cashier', 'Grill', 'Takeaway'];

export default function PrinterSetupWizard({ isOpen, onClose, categories = [], onPrinterAdded }) {
  const [step, setStep] = useState(1);

  // Form State
  const [printerType, setPrinterType] = useState(DRIVER_IDS.BROWSER);
  const [paperSize, setPaperSize] = useState(PAPER_SIZES.SIZE_80MM);
  const [name, setName] = useState('Kitchen');
  const [connectionInfo, setConnectionInfo] = useState({
    deviceName: '',
    vendorId: null,
    productId: null,
    deviceId: null,
    stationLabel: '',
    serialNumber: '',
    ip: '192.168.1.100',
    port: 9100,
  });

  // Pairing state
  const [isPairing, setIsPairing] = useState(false);
  const [pairingError, setPairingError] = useState('');
  const [pairingSuccess, setPairingSuccess] = useState(false);
  const [systemPrinters, setSystemPrinters] = useState([]);

  // Fetch installed Windows printers if running under Electron
  React.useEffect(() => {
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

  // Step 4 Test State
  const [isTesting, setIsTesting] = useState(false);
  const [testDispatched, setTestDispatched] = useState(false);
  const [didPrintAnswer, setDidPrintAnswer] = useState(null); // 'yes' | 'no' | null
  const [testError, setTestError] = useState('');

  // Step 5 / Per-printer settings
  const [printTarget, setPrintTarget] = useState(PRINT_TARGETS.KOT);
  const [selectedCategories, setSelectedCategories] = useState(['all']);
  const [copies, setCopies] = useState(1);
  const [autoPrint, setAutoPrint] = useState(true);
  const [openCashDrawer, setOpenCashDrawer] = useState(false);
  const [isDefault, setIsDefault] = useState(false);

  if (!isOpen) return null;

  const currentTypeOption =
    PRINTER_TYPE_OPTIONS.find((t) => t.id === printerType) || PRINTER_TYPE_OPTIONS[0];

  // Helper to handle USB device selection
  const handleScanUSB = async () => {
    try {
      setIsPairing(true);
      setPairingError('');
      if (!isWebUSBSupported() && !isWebSerialSupported()) {
        throw new Error(
          'WebUSB / WebSerial is not supported in this browser. Please use Google Chrome or Microsoft Edge.'
        );
      }
      const usbDriver = printerService.getDriver(DRIVER_IDS.USB);
      const info = await usbDriver.connect();
      setConnectionInfo((prev) => ({
        ...prev,
        deviceName: info.name || 'USB Thermal POS Printer',
        vendorId: info.vendorId,
        productId: info.productId,
        serialNumber: info.serialNumber || '',
      }));
      setPairingSuccess(true);
      if (!name || name === 'Kitchen') {
        setName('Counter (USB)');
      }
    } catch (err) {
      if (err.name !== 'NotFoundError') {
        setPairingError(err.message || 'Failed to connect USB printer.');
      }
    } finally {
      setIsPairing(false);
    }
  };

  // Helper to auto-detect USB printers by class 0x07 or ESC/POS vendor IDs
  const handleAutoDetectUSB = async () => {
    try {
      setIsPairing(true);
      setPairingError('');
      const detected = await printerService.autoDetectPrinter();
      if (!detected) {
        throw new Error(
          'No compatible USB thermal printer (class 0x07 or known ESC/POS vendor) was detected. Please plug in your printer and try "Scan & Select USB Printer".'
        );
      }
      setConnectionInfo((prev) => ({
        ...prev,
        deviceName: detected.productName || detected.name || 'USB Thermal POS Printer',
        vendorId: detected.vendorId,
        productId: detected.productId,
        serialNumber: detected.serialNumber || '',
      }));
      setPairingSuccess(true);
      if (!name || name === 'Kitchen') {
        setName('Counter (USB)');
      }
    } catch (err) {
      setPairingError(err.message || 'Auto-detection failed.');
    } finally {
      setIsPairing(false);
    }
  };

  // Helper to handle Bluetooth pairing
  const handleScanBluetooth = async () => {
    try {
      setIsPairing(true);
      setPairingError('');
      if (!isWebBluetoothSupported()) {
        throw new Error(
          'Web Bluetooth is not supported in this browser. Please use Google Chrome or Edge on desktop or Android.'
        );
      }
      const btDriver = printerService.getDriver(DRIVER_IDS.BLUETOOTH);
      const info = await btDriver.connect();
      setConnectionInfo((prev) => ({
        ...prev,
        deviceName: info.name || 'Bluetooth Receipt Printer',
        deviceId: info.id,
      }));
      setPairingSuccess(true);
      if (!name || name === 'Kitchen') {
        setName('Mobile (Bluetooth)');
      }
    } catch (err) {
      if (err.name !== 'NotFoundError') {
        setPairingError(err.message || 'Bluetooth pairing failed.');
      }
    } finally {
      setIsPairing(false);
    }
  };

  // Helper for test print in Step 4
  const handlePrintTestPage = async () => {
    try {
      setIsTesting(true);
      setTestError('');
      setDidPrintAnswer(null);

      const tempPrinter = {
        name: name || 'Test Printer',
        type: printerType,
        typeName: currentTypeOption.name,
        paperSize,
        openCashDrawer,
        connection: connectionInfo,
      };

      await printerService.printTestPageForPrinter(tempPrinter);
      setTestDispatched(true);
    } catch (err) {
      setTestError(err.message || 'Failed to dispatch test print.');
      setTestDispatched(true);
    } finally {
      setIsTesting(false);
    }
  };

  const handleAnswerYes = () => {
    setDidPrintAnswer('yes');
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {
      // Ignore confetti errors if not supported
    }
  };

  const handleAnswerNo = () => {
    setDidPrintAnswer('no');
  };

  // Toggle category
  const toggleCategory = (catId) => {
    if (catId === 'all') {
      setSelectedCategories(['all']);
      return;
    }

    let next = selectedCategories.filter((c) => c !== 'all');
    if (next.includes(catId)) {
      next = next.filter((c) => c !== catId);
      if (next.length === 0) next = ['all'];
    } else {
      next.push(catId);
    }
    setSelectedCategories(next);
  };

  // Finalize and save printer
  const handleSavePrinter = () => {
    const newPrinter = createDefaultPrinter({
      name: name.trim() || 'Kitchen',
      type: printerType,
      typeName: currentTypeOption.name,
      paperSize,
      status: didPrintAnswer === 'no' ? 'disconnected' : 'connected',
      printTarget,
      categories: selectedCategories,
      copies: Math.max(1, parseInt(copies, 10) || 1),
      autoPrint,
      openCashDrawer,
      isDefault,
      connection: connectionInfo,
    });

    const saved = printerService.savePrinter(newPrinter);
    if (onPrinterAdded) {
      onPrinterAdded(saved);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#F0E4D7] overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Top Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#FFF9F2] via-white to-[#FFF9F2] border-b border-[#F0E4D7] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF1E6] text-[#F26B1D] flex items-center justify-center font-bold shadow-2xs border border-[#FCD8BF]">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-heading font-extrabold text-[#2B2118] tracking-tight">
                Add Printer Setup Wizard
              </h2>
              <p className="text-xs text-[#7A6A5C]">
                Step {step} of 5: {step === 1 && 'Printer Type'}
                {step === 2 && 'Paper Size'}
                {step === 3 && 'Connect & Name'}
                {step === 4 && 'Print Test Page'}
                {step === 5 && 'Routing & Settings'}
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

        {/* Step Progress Tracker */}
        <div className="bg-[#FFF9F2]/70 px-6 py-2.5 border-b border-[#F0E4D7] flex items-center justify-between gap-1 text-[11px] font-bold text-[#7A6A5C] shrink-0 overflow-x-auto">
          {[
            { num: 1, label: 'Type' },
            { num: 2, label: 'Paper' },
            { num: 3, label: 'Connect' },
            { num: 4, label: 'Test Page' },
            { num: 5, label: 'Settings' },
          ].map((s) => (
            <div
              key={s.num}
              className={`flex items-center gap-1.5 whitespace-nowrap ${
                step === s.num
                  ? 'text-[#F26B1D]'
                  : step > s.num
                  ? 'text-emerald-700'
                  : 'text-[#9E8E81]'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === s.num
                    ? 'bg-[#F26B1D] text-white'
                    : step > s.num
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {step > s.num ? <Check className="w-3 h-3 stroke-[3]" /> : s.num}
              </span>
              <span>{s.label}</span>
              {s.num < 5 && <span className="text-slate-300 mx-1">›</span>}
            </div>
          ))}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: What kind of printer do you have? */}
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-base sm:text-lg font-heading font-extrabold text-[#2B2118]">
                  What kind of printer do you have?
                </h3>
                <p className="text-xs text-[#7A6A5C] mt-0.5">
                  Select your receipt or ticket printer hardware connection method.
                </p>
                {isIOS() && (
                  <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold flex items-center gap-2">
                    <span className="text-xs">📱</span>
                    <span>Apple iOS Safari detected: Showing AirPrint, standard browser, and network printers (USB/Bluetooth direct hardware bridges are reserved for Chrome/Android).</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {PRINTER_TYPE_OPTIONS.filter((opt) => isPrinterTypeSupported(opt.id)).map((opt) => {
                  const isSelected = printerType === opt.id;
                  const renderIcon = () => {
                    switch (opt.icon) {
                      case 'Usb':
                        return <Usb className="w-6 h-6" />;
                      case 'HardDrive':
                        return <HardDrive className="w-6 h-6" />;
                      case 'Bluetooth':
                        return <Bluetooth className="w-6 h-6" />;
                      case 'Wifi':
                        return <Wifi className="w-6 h-6" />;
                      case 'Smartphone':
                        return <Smartphone className="w-6 h-6" />;
                      case 'Printer':
                      default:
                        return <Printer className="w-6 h-6" />;
                    }
                  };

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPrinterType(opt.id)}
                      className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer relative group ${
                        isSelected
                          ? 'border-[#F26B1D] bg-[#FFF1E6]/40 shadow-sm ring-2 ring-[#F26B1D]'
                          : 'border-[#F0E4D7] bg-white hover:border-[#FCD8BF] hover:bg-[#FFF9F2]/30'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${
                            isSelected
                              ? 'bg-[#F26B1D] text-white shadow-md shadow-orange-500/20'
                              : 'bg-[#FFF1E6] text-[#F26B1D] group-hover:bg-[#F26B1D] group-hover:text-white'
                          }`}
                        >
                          {renderIcon()}
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isSelected
                              ? 'bg-[#F26B1D] text-white'
                              : 'bg-slate-100 text-[#7A6A5C]'
                          }`}
                        >
                          {opt.tag}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#2B2118] group-hover:text-[#F26B1D] transition">
                          {opt.name}
                        </h4>
                        <p className="text-[11px] text-[#7A6A5C] leading-relaxed mt-1">
                          {opt.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Paper size with visuals of each */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-base sm:text-lg font-heading font-extrabold text-[#2B2118]">
                  Select Paper Size
                </h3>
                <p className="text-xs text-[#7A6A5C] mt-0.5">
                  Choose the roll or sheet width used by this printer. Layouts format automatically.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {/* 58mm Card */}
                <button
                  type="button"
                  onClick={() => setPaperSize(PAPER_SIZES.SIZE_58MM)}
                  className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-between transition cursor-pointer ${
                    paperSize === PAPER_SIZES.SIZE_58MM
                      ? 'border-[#F26B1D] bg-[#FFF1E6]/40 shadow-sm ring-2 ring-[#F26B1D]'
                      : 'border-[#F0E4D7] bg-white hover:border-[#FCD8BF]'
                  }`}
                >
                  <span className="text-xs font-bold text-[#2B2118]">58mm (2-Inch)</span>
                  <span className="text-[10px] text-[#7A6A5C] mb-3">Pocket / Mobile Thermal</span>

                  {/* 58mm Slender Receipt Visual */}
                  <div className="w-16 h-28 bg-white border border-slate-300 rounded-t-sm shadow-inner p-1.5 flex flex-col justify-between relative overflow-hidden">
                    <div className="space-y-1">
                      <div className="w-6 h-1 bg-[#F26B1D] mx-auto rounded-full" />
                      <div className="w-10 h-0.5 bg-slate-300 mx-auto" />
                      <div className="w-8 h-0.5 bg-slate-200 mx-auto" />
                      <div className="pt-1 space-y-0.5">
                        <div className="w-full h-0.5 bg-slate-200" />
                        <div className="w-11 h-0.5 bg-slate-200" />
                        <div className="w-10 h-0.5 bg-slate-200" />
                      </div>
                    </div>
                    <div className="space-y-0.5 pt-1 border-t border-dashed border-slate-300">
                      <div className="w-8 h-0.5 bg-slate-400 ml-auto" />
                    </div>
                    {/* Zigzag bottom cut */}
                    <div className="absolute -bottom-1 left-0 right-0 h-2 bg-radial from-transparent to-slate-200 border-t border-dotted border-slate-400" />
                  </div>

                  <span className="mt-3 text-[11px] font-semibold text-[#7A6A5C]">
                    Narrow slip roll
                  </span>
                </button>

                {/* 80mm Card (Standard) */}
                <button
                  type="button"
                  onClick={() => setPaperSize(PAPER_SIZES.SIZE_80MM)}
                  className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-between transition cursor-pointer relative ${
                    paperSize === PAPER_SIZES.SIZE_80MM
                      ? 'border-[#F26B1D] bg-[#FFF1E6]/40 shadow-sm ring-2 ring-[#F26B1D]'
                      : 'border-[#F0E4D7] bg-white hover:border-[#FCD8BF]'
                  }`}
                >
                  <span className="absolute -top-2.5 right-3 bg-[#F26B1D] text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-2xs">
                    Standard POS
                  </span>
                  <span className="text-xs font-bold text-[#2B2118]">80mm (3-Inch)</span>
                  <span className="text-[10px] text-[#7A6A5C] mb-3">Counter Receipt Roll</span>

                  {/* 80mm Standard Width Receipt Visual */}
                  <div className="w-24 h-28 bg-white border border-slate-300 rounded-t-sm shadow-inner p-2 flex flex-col justify-between relative overflow-hidden">
                    <div className="space-y-1">
                      <div className="w-10 h-1.5 bg-[#F26B1D] mx-auto rounded-full" />
                      <div className="w-16 h-0.5 bg-slate-300 mx-auto" />
                      <div className="pt-1.5 space-y-1">
                        <div className="flex justify-between">
                          <div className="w-10 h-0.5 bg-slate-300" />
                          <div className="w-4 h-0.5 bg-slate-400" />
                        </div>
                        <div className="flex justify-between">
                          <div className="w-12 h-0.5 bg-slate-300" />
                          <div className="w-4 h-0.5 bg-slate-400" />
                        </div>
                      </div>
                    </div>
                    <div className="pt-1 border-t border-dashed border-slate-300 flex justify-between items-center">
                      <span className="text-[7px] font-bold text-slate-500">TOTAL</span>
                      <div className="w-6 h-1 bg-slate-700 rounded-xs" />
                    </div>
                    {/* Bottom tear border */}
                    <div className="absolute -bottom-1 left-0 right-0 h-1.5 border-t border-dotted border-slate-400" />
                  </div>

                  <span className="mt-3 text-[11px] font-bold text-[#F26B1D]">
                    Most Popular & Recommended
                  </span>
                </button>

                {/* A4 Card */}
                <button
                  type="button"
                  onClick={() => setPaperSize(PAPER_SIZES.SIZE_A4)}
                  className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-between transition cursor-pointer ${
                    paperSize === PAPER_SIZES.SIZE_A4
                      ? 'border-[#F26B1D] bg-[#FFF1E6]/40 shadow-sm ring-2 ring-[#F26B1D]'
                      : 'border-[#F0E4D7] bg-white hover:border-[#FCD8BF]'
                  }`}
                >
                  <span className="text-xs font-bold text-[#2B2118]">A4 Full Page</span>
                  <span className="text-[10px] text-[#7A6A5C] mb-3">Desktop / Office Sheet</span>

                  {/* A4 Sheet Visual */}
                  <div className="w-20 h-28 bg-white border border-slate-300 rounded-sm shadow-sm p-2 flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                        <div className="w-5 h-1 bg-[#F26B1D]" />
                        <div className="w-6 h-0.5 bg-slate-300" />
                      </div>
                      <div className="space-y-0.5 pt-1">
                        <div className="w-full h-0.5 bg-slate-200" />
                        <div className="w-full h-0.5 bg-slate-200" />
                        <div className="w-12 h-0.5 bg-slate-200" />
                      </div>
                    </div>
                    <div className="space-y-1 pt-1 border-t border-slate-200">
                      <div className="w-8 h-0.5 bg-slate-300 ml-auto" />
                      <div className="w-10 h-0.5 bg-slate-400 ml-auto" />
                    </div>
                  </div>

                  <span className="mt-3 text-[11px] font-semibold text-[#7A6A5C]">
                    Standard 210 × 297 mm
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Connect & Name Printer */}
          {step === 3 && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <h3 className="text-base sm:text-lg font-heading font-extrabold text-[#2B2118]">
                  Connect & Name Your Printer
                </h3>
                <p className="text-xs text-[#7A6A5C] mt-0.5">
                  Link your {currentTypeOption.name} and give it a recognizable station name.
                </p>
              </div>

              {/* Station Name Input & Suggestions */}
              <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-2.5">
                <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider">
                  Printer Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kitchen, Counter, Bar"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#F0E4D7] text-[#2B2118] text-sm font-semibold focus:outline-none focus:border-[#F26B1D] shadow-2xs"
                />
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-[#7A6A5C]">Quick names:</span>
                  {NAME_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setName(suggestion)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                        name === suggestion
                          ? 'bg-[#F26B1D] text-white border-[#F26B1D]'
                          : 'bg-white text-[#7A6A5C] border-[#F0E4D7] hover:border-[#F26B1D]'
                      }`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {/* Connection Interface according to printer type */}
              <div className="p-5 rounded-2xl bg-white border border-[#F0E4D7] space-y-4 shadow-2xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#7A6A5C] flex items-center gap-2">
                  <span>Hardware Connection</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#FFF1E6] text-[#F26B1D] font-mono text-[10px]">
                    {currentTypeOption.name}
                  </span>
                </h4>

                {/* Windows Installed Printer (Port-Independent Silent Spooler) */}
                {printerType === DRIVER_IDS.WINDOWS && (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
                      <HardDrive className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Port-Independent Windows Spooler</p>
                        <p className="text-[11px] text-blue-800/90 mt-0.5 leading-relaxed">
                          Windows Installed Printer prints through your Windows driver and spooler. It is <strong>100% immune to USB port changes</strong> because Windows manages the USB port binding automatically, even if the cable is plugged into a different slot.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#2B2118] uppercase tracking-wider block">
                        Windows Printer Name
                      </label>
                      <p className="text-[11px] text-[#7A6A5C]">
                        Enter the exact printer name as shown in Windows Settings &gt; Printers & Scanners.
                      </p>

                      {systemPrinters.length > 0 ? (
                        <select
                          value={connectionInfo.deviceName}
                          onChange={(e) =>
                            setConnectionInfo((prev) => ({ ...prev, deviceName: e.target.value }))
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#F0E4D7] text-[#2B2118] text-xs font-bold focus:outline-none focus:border-[#F26B1D] shadow-2xs"
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
                          value={connectionInfo.deviceName}
                          onChange={(e) =>
                            setConnectionInfo((prev) => ({ ...prev, deviceName: e.target.value }))
                          }
                          placeholder="e.g. POS-80, EPSON TM-T20III, Xprinter XP-N160I"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#F0E4D7] text-[#2B2118] text-xs font-bold focus:outline-none focus:border-[#F26B1D] shadow-2xs"
                        />
                      )}

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] text-[#7A6A5C]">Common models:</span>
                        {['POS-80', 'EPSON TM-T20III', 'Xprinter XP-N160I', 'POS-58', 'Microsoft Print to PDF'].map((commonName) => (
                          <button
                            key={commonName}
                            type="button"
                            onClick={() => {
                              setConnectionInfo((prev) => ({ ...prev, deviceName: commonName }));
                              if (!name || name === 'Kitchen') setName(`Counter (${commonName})`);
                            }}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition cursor-pointer ${
                              connectionInfo.deviceName === commonName
                                ? 'bg-[#F26B1D] text-white border-[#F26B1D]'
                                : 'bg-white text-[#7A6A5C] border-[#F0E4D7] hover:border-[#F26B1D]'
                            }`}
                          >
                            {commonName}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* USB Connection */}
                {printerType === DRIVER_IDS.USB && (
                  <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Port-Independent USB Identification</p>
                        <p className="text-[11px] text-emerald-700 leading-relaxed">
                          This printer is tracked by its unique USB Vendor ID and Product ID, <strong>never by COM port or bus slot</strong>. If you plug it into another USB port, DineHQ automatically reconnects in the background.
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-[#7A6A5C]">
                      Make sure your USB thermal printer is plugged in and turned on, then select or auto-detect it.
                    </p>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleScanUSB}
                        disabled={isPairing}
                        className="px-4 py-2.5 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md shadow-orange-500/20 disabled:opacity-50"
                      >
                        {isPairing ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Usb className="w-4 h-4" />
                        )}
                        <span>{isPairing ? 'Scanning for USB...' : 'Scan & Select USB Printer'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleAutoDetectUSB}
                        disabled={isPairing}
                        className="px-4 py-2.5 rounded-xl bg-white border border-[#F26B1D] text-[#F26B1D] hover:bg-[#FFF1E6] text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-2xs disabled:opacity-50"
                      >
                        <Zap className="w-4 h-4 text-[#F26B1D]" />
                        <span>Auto-Detect Printer</span>
                      </button>

                      {connectionInfo.deviceName && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#E7F6EC] border border-[#C0E9CE] text-[#1F9D55] text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Connected: {connectionInfo.deviceName}</span>
                        </div>
                      )}
                    </div>

                    {connectionInfo.vendorId && (
                      <div className="p-3 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-2 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[#7A6A5C] font-medium">Hardware Signature:</span>
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-white border border-[#F0E4D7] text-[#2B2118]">
                            VID: 0x{connectionInfo.vendorId.toString(16).padStart(4, '0')} | PID: 0x{(connectionInfo.productId || 0).toString(16).padStart(4, '0')}
                            {connectionInfo.serialNumber ? ` | S/N: ${connectionInfo.serialNumber}` : ''}
                          </span>
                        </div>

                        {/* Station Label Disambiguation */}
                        <div className="pt-2 border-t border-[#F0E4D7]/70 space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-[#7A6A5C]">
                              Station Label (for identical printers)
                            </label>
                            <span className="text-[10px] text-[#9E8E81]">
                              Disambiguates duplicate models
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={connectionInfo.stationLabel || ''}
                              onChange={(e) =>
                                setConnectionInfo((prev) => ({ ...prev, stationLabel: e.target.value }))
                              }
                              placeholder="e.g. Kitchen Station 1, Counter 2"
                              className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-[#F0E4D7] text-xs font-semibold text-[#2B2118] focus:outline-none focus:border-[#F26B1D]"
                            />
                            {['Kitchen', 'Counter', 'Bar'].map((lbl) => (
                              <button
                                key={lbl}
                                type="button"
                                onClick={() =>
                                  setConnectionInfo((prev) => ({ ...prev, stationLabel: lbl }))
                                }
                                className="px-2 py-1 rounded bg-white border border-[#F0E4D7] text-[10px] font-bold text-[#7A6A5C] hover:border-[#F26B1D]"
                              >
                                {lbl}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {pairingError && (
                      <div className="p-3 rounded-xl bg-[#FDECEC] border border-[#F9C3C5] text-[#D92D20] text-xs font-medium flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{pairingError}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Bluetooth Connection */}
                {printerType === DRIVER_IDS.BLUETOOTH && (
                  <div className="space-y-3">
                    <p className="text-xs text-[#7A6A5C]">
                      Turn on your Bluetooth receipt printer and make sure Bluetooth is active on this device.
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleScanBluetooth}
                        disabled={isPairing}
                        className="px-4 py-2.5 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md shadow-orange-500/20 disabled:opacity-50"
                      >
                        {isPairing ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Bluetooth className="w-4 h-4" />
                        )}
                        <span>{isPairing ? 'Searching Bluetooth...' : 'Pair Bluetooth Printer'}</span>
                      </button>

                      {connectionInfo.deviceName && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#E7F6EC] border border-[#C0E9CE] text-[#1F9D55] text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Paired: {connectionInfo.deviceName}</span>
                        </div>
                      )}
                    </div>

                    {pairingError && (
                      <div className="p-3 rounded-xl bg-[#FDECEC] border border-[#F9C3C5] text-[#D92D20] text-xs font-medium flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{pairingError}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* WiFi / Network Printer */}
                {printerType === DRIVER_IDS.NETWORK && (
                  <div className="space-y-3">
                    <p className="text-xs text-[#7A6A5C]">
                      Enter your kitchen/counter printer’s local static IP address on your WiFi network.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[11px] font-bold text-[#7A6A5C]">IP Address</label>
                        <input
                          type="text"
                          value={connectionInfo.ip}
                          onChange={(e) =>
                            setConnectionInfo((prev) => ({ ...prev, ip: e.target.value }))
                          }
                          placeholder="192.168.1.100"
                          className="w-full px-3.5 py-2 rounded-xl border border-[#F0E4D7] text-xs font-mono font-bold focus:outline-none focus:border-[#F26B1D]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-[#7A6A5C]">Port</label>
                        <input
                          type="number"
                          value={connectionInfo.port}
                          onChange={(e) =>
                            setConnectionInfo((prev) => ({
                              ...prev,
                              port: parseInt(e.target.value, 10) || 9100,
                            }))
                          }
                          placeholder="9100"
                          className="w-full px-3.5 py-2 rounded-xl border border-[#F0E4D7] text-xs font-mono font-bold focus:outline-none focus:border-[#F26B1D]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Normal Printer (A4 / Browser) */}
                {printerType === DRIVER_IDS.BROWSER && (
                  <div className="p-4 rounded-xl bg-[#E7F6EC]/60 border border-[#C0E9CE] text-[#1F9D55] text-xs space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Ready via System Print Dialog
                    </p>
                    <p className="text-[11px] text-[#7A6A5C]">
                      No special drivers required. Prints to any desktop, laser, or office printer configured in your operating system.
                    </p>
                  </div>
                )}

                {/* Android RawBT */}
                {printerType === DRIVER_IDS.RAWBT && (
                  <div className="p-4 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-xs space-y-2">
                    <p className="font-bold text-[#2B2118] flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-[#F26B1D]" />
                      Android RawBT Driver Protocol
                    </p>
                    <p className="text-[11px] text-[#7A6A5C]">
                      Dispatches direct ESC/POS receipts to the RawBT Android app installed on your device.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Print Test Page & Did it print? Yes/No */}
          {step === 4 && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <h3 className="text-base sm:text-lg font-heading font-extrabold text-[#2B2118]">
                  Verify Connection: Print Test Page
                </h3>
                <p className="text-xs text-[#7A6A5C] mt-0.5">
                  Let’s send a test ticket to <span className="font-bold text-[#2B2118]">"{name}"</span> ({paperSize}) to verify it works.
                </p>
              </div>

              {/* Big Print Test Page Button */}
              <div className="p-6 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] text-center space-y-3">
                <button
                  type="button"
                  onClick={handlePrintTestPage}
                  disabled={isTesting}
                  className="px-6 py-3.5 rounded-2xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-sm font-extrabold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-500/25 mx-auto disabled:opacity-50"
                >
                  {isTesting ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Printer className="w-5 h-5" />
                  )}
                  <span>{isTesting ? 'Sending to Printer...' : 'Print Test Page'}</span>
                </button>

                <p className="text-[11px] text-[#7A6A5C]">
                  Sends sample ticket with kitchen items, Urdu font test, and QR code.
                </p>

                {testError && (
                  <div className="p-3 rounded-xl bg-[#FDECEC] border border-[#F9C3C5] text-[#D92D20] text-xs font-semibold">
                    {testError}
                  </div>
                )}
              </div>

              {/* "Did it print? Yes / No" Prompt */}
              {testDispatched && (
                <div className="p-5 rounded-2xl bg-white border border-[#F0E4D7] space-y-4 shadow-sm animate-fadeIn">
                  <div className="text-center space-y-1">
                    <p className="text-sm font-bold text-[#2B2118]">Did the test page print?</p>
                    <p className="text-xs text-[#7A6A5C]">
                      Check your printer tray or output slot.
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleAnswerYes}
                      className={`px-6 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                        didPrintAnswer === 'yes'
                          ? 'bg-[#1F9D55] text-white shadow-md shadow-green-500/20 ring-2 ring-emerald-500'
                          : 'bg-[#E7F6EC] hover:bg-[#1F9D55] text-[#1F9D55] hover:text-white border border-[#C0E9CE]'
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Yes, It Printed!</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAnswerNo}
                      className={`px-6 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                        didPrintAnswer === 'no'
                          ? 'bg-[#D92D20] text-white shadow-md shadow-red-500/20 ring-2 ring-red-500'
                          : 'bg-[#FDECEC] hover:bg-[#D92D20] text-[#D92D20] hover:text-white border border-[#F9C3C5]'
                      }`}
                    >
                      <X className="w-4 h-4 stroke-[3]" />
                      <span>No, Nothing Came Out</span>
                    </button>
                  </div>

                  {/* YES Celebration */}
                  {didPrintAnswer === 'yes' && (
                    <div className="p-4 rounded-xl bg-[#E7F6EC] border border-[#C0E9CE] text-[#1F9D55] text-xs font-bold flex items-center gap-2.5 animate-fadeIn">
                      <Sparkles className="w-5 h-5 shrink-0" />
                      <span>
                        Awesome! Printer "{name}" is verified and ready. Click Next to set up order routing.
                      </span>
                    </div>
                  )}

                  {/* NO Troubleshooting Checklist */}
                  {didPrintAnswer === 'no' && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-[#FEF3D9] border border-[#FCE1A8] text-[#2B2118] space-y-3 animate-fadeIn">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-[#F5A623] shrink-0" />
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#2B2118]">
                          Quick Troubleshooting Checklist
                        </h4>
                      </div>

                      <div className="space-y-2 text-xs text-[#2B2118]">
                        <div className="flex items-start gap-2 bg-white/70 p-2 rounded-xl">
                          <span className="font-bold text-[#F26B1D]">1. Power:</span>
                          <span>Make sure the printer is plugged in and turned ON with the power LED glowing.</span>
                        </div>
                        <div className="flex items-start gap-2 bg-white/70 p-2 rounded-xl">
                          <span className="font-bold text-[#F26B1D]">2. Paper:</span>
                          <span>Check if paper roll is inserted correctly. Thermal paper only prints on one side; try flipping the roll if it feeds blank.</span>
                        </div>
                        <div className="flex items-start gap-2 bg-white/70 p-2 rounded-xl">
                          <span className="font-bold text-[#F26B1D]">3. Cable:</span>
                          <span>Ensure USB or Ethernet cable is securely connected at both ends.</span>
                        </div>
                        <div className="flex items-start gap-2 bg-white/70 p-2 rounded-xl">
                          <span className="font-bold text-[#F26B1D]">4. Bluetooth Pairing:</span>
                          <span>If using Bluetooth, verify the device is paired in your operating system Bluetooth settings and within 5 meters.</span>
                        </div>
                        <div className="flex items-start gap-2 bg-white/70 p-2 rounded-xl">
                          <span className="font-bold text-[#F26B1D]">5. Same WiFi:</span>
                          <span>For network printers, confirm this computer and printer are connected to the exact same WiFi network.</span>
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={handlePrintTestPage}
                          disabled={isTesting}
                          className="px-4 py-2 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Retry Test Print</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Per-printer settings (Routing & Options) */}
          {step === 5 && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <h3 className="text-base sm:text-lg font-heading font-extrabold text-[#2B2118]">
                  Per-Printer Settings & Routing
                </h3>
                <p className="text-xs text-[#7A6A5C] mt-0.5">
                  Configure what orders and categories "{name}" will print.
                </p>
              </div>

              {/* 1. What to print: KOT, Bill, Both */}
              <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-2.5">
                <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider">
                  What to print?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: PRINT_TARGETS.KOT, label: 'Kitchen Ticket (KOT)', sub: 'Dishes for chef' },
                    { id: PRINT_TARGETS.BILL, label: 'Customer Bill', sub: 'Invoice for guest' },
                    { id: PRINT_TARGETS.BOTH, label: 'Both (KOT & Bill)', sub: 'All order receipts' },
                  ].map((target) => (
                    <button
                      key={target.id}
                      type="button"
                      onClick={() => setPrintTarget(target.id)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        printTarget === target.id
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

              {/* 2. Which categories this printer handles */}
              <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider">
                    Categories Handled
                  </label>
                  <span className="text-[11px] text-[#7A6A5C]">
                    e.g. Kitchen = Burgers & BBQ, Bar = Drinks
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => toggleCategory('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      selectedCategories.includes('all')
                        ? 'bg-[#F26B1D] text-white border-[#F26B1D] shadow-xs'
                        : 'bg-white text-[#7A6A5C] border-[#F0E4D7] hover:border-[#F26B1D]'
                    }`}
                  >
                    ⭐ All Categories (Everything)
                  </button>

                  {categories.map((cat) => {
                    const isChecked =
                      selectedCategories.includes(cat.id) || selectedCategories.includes(cat.name);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                          isChecked && !selectedCategories.includes('all')
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

              {/* 3. Copies & Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Number of copies */}
                <div className="p-4 rounded-2xl bg-white border border-[#F0E4D7] flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-[#2B2118]">Number of Copies</label>
                    <p className="text-[10px] text-[#7A6A5C]">Number of tickets printed per order</p>
                  </div>
                  <div className="flex items-center gap-2 bg-[#FFF9F2] p-1 rounded-xl border border-[#F0E4D7]">
                    <button
                      type="button"
                      onClick={() => setCopies((c) => Math.max(1, c - 1))}
                      className="w-7 h-7 rounded-lg bg-white border border-[#F0E4D7] text-[#2B2118] font-bold text-xs hover:bg-[#FFF1E6] transition cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-xs font-extrabold text-[#2B2118]">
                      {copies}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCopies((c) => Math.min(5, c + 1))}
                      className="w-7 h-7 rounded-lg bg-white border border-[#F0E4D7] text-[#2B2118] font-bold text-xs hover:bg-[#FFF1E6] transition cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Set as Default Printer */}
                <div className="p-4 rounded-2xl bg-white border border-[#F0E4D7] flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-[#2B2118]">Set as Default</label>
                    <p className="text-[10px] text-[#7A6A5C]">Primary printer for 1-click prints</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="w-4 h-4 accent-[#F26B1D] cursor-pointer"
                  />
                </div>

                {/* Auto-print new orders */}
                <div className="p-4 rounded-2xl bg-white border border-[#F0E4D7] flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-[#2B2118]">Auto-print New Orders</label>
                    <p className="text-[10px] text-[#7A6A5C]">Print immediately when order arrives</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoPrint}
                    onChange={(e) => setAutoPrint(e.target.checked)}
                    className="w-4 h-4 accent-[#F26B1D] cursor-pointer"
                  />
                </div>

                {/* Open cash drawer */}
                <div className="p-4 rounded-2xl bg-white border border-[#F0E4D7] flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-[#2B2118]">Open Cash Drawer</label>
                    <p className="text-[10px] text-[#7A6A5C]">Sends pulse after bill print</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={openCashDrawer}
                    onChange={(e) => setOpenCashDrawer(e.target.checked)}
                    className="w-4 h-4 accent-[#F26B1D] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer Navigation */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#FFF9F2] via-white to-[#FFF9F2] border-t border-[#F0E4D7] flex items-center justify-between shrink-0">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="px-4 py-2 rounded-xl bg-white border border-[#F0E4D7] hover:bg-slate-50 text-[#7A6A5C] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white border border-[#F0E4D7] hover:bg-slate-50 text-[#7A6A5C] text-xs font-bold transition cursor-pointer shadow-2xs"
            >
              Cancel
            </button>
          )}

          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="px-5 py-2.5 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-orange-500/20"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSavePrinter}
              className="px-6 py-2.5 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs font-extrabold transition flex items-center gap-2 cursor-pointer shadow-md shadow-orange-500/20"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Save & Complete Setup</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
