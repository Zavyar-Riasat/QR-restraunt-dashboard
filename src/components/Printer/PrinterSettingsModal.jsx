import React, { useState, useEffect } from 'react';
import {
  Printer,
  X,
  Check,
  AlertCircle,
  Usb,
  Bluetooth,
  Smartphone,
  Wifi,
  Cloud,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  HelpCircle,
  Scissors,
  DollarSign,
  Zap,
} from 'lucide-react';
import { printerService } from '../../services/printer/printerService';
import { DRIVER_IDS, PAPER_SIZES, PAPER_SIZE_SPECS } from '../../services/printer/printerTypes';
import { getAvailableDrivers } from '../../services/printer/capabilities';

export default function PrinterSettingsModal({ isOpen, onClose }) {
  const [config, setConfig] = useState(() => printerService.getConfig());
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectMessage, setConnectMessage] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Cloud Print state
  const [cloudPrinters, setCloudPrinters] = useState([]);
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(printerService.getConfig());
      setAvailableDrivers(getAvailableDrivers());
      setConnectMessage(null);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDriverChange = (driverId) => {
    const updated = printerService.saveConfig({ driver: driverId });
    setConfig(updated);
    setConnectMessage(null);
    setTestResult(null);
  };

  const handlePaperSizeChange = (size) => {
    const updated = printerService.saveConfig({ paperSize: size });
    setConfig(updated);
  };

  const handleToggle = (key) => {
    const updated = printerService.saveConfig({ [key]: !config[key] });
    setConfig(updated);
  };

  // USB Connect action
  const handleConnectUSB = async () => {
    try {
      setIsConnecting(true);
      setConnectMessage(null);
      const usbDriver = printerService.getDriver(DRIVER_IDS.USB);
      const info = await usbDriver.connect();

      const updated = printerService.saveConfig({
        driver: DRIVER_IDS.USB,
        usbDeviceName: info.name,
        usbVendorId: info.vendorId,
        usbProductId: info.productId,
      });
      setConfig(updated);
      setConnectMessage({ type: 'success', text: `Connected to ${info.name}` });
    } catch (err) {
      setConnectMessage({ type: 'error', text: err.message || 'Failed to connect to USB printer.' });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleForgetUSB = () => {
    printerService.saveConfig({
      usbDeviceName: null,
      usbVendorId: null,
      usbProductId: null,
      driver: DRIVER_IDS.BROWSER,
    });
    setConfig(printerService.getConfig());
    setConnectMessage(null);
  };

  // Bluetooth Connect action
  const handleConnectBluetooth = async () => {
    try {
      setIsConnecting(true);
      setConnectMessage(null);
      const btDriver = printerService.getDriver(DRIVER_IDS.BLUETOOTH);
      const info = await btDriver.connect();

      const updated = printerService.saveConfig({
        driver: DRIVER_IDS.BLUETOOTH,
        bluetoothDeviceName: info.name,
        bluetoothDeviceId: info.id,
      });
      setConfig(updated);
      setConnectMessage({ type: 'success', text: `Connected to ${info.name}` });
    } catch (err) {
      setConnectMessage({ type: 'error', text: err.message || 'Bluetooth connection failed.' });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectBluetooth = () => {
    const btDriver = printerService.getDriver(DRIVER_IDS.BLUETOOTH);
    btDriver.disconnect();
    printerService.saveConfig({
      bluetoothDeviceName: null,
      bluetoothDeviceId: null,
      driver: DRIVER_IDS.BROWSER,
    });
    setConfig(printerService.getConfig());
    setConnectMessage(null);
  };

  // Network printer config change
  const handleNetworkChange = (field, value) => {
    const network = { ...config.network, [field]: value };
    const updated = printerService.saveConfig({ network });
    setConfig(updated);
  };

  // Cloud Print (PrintNode)
  const handleCloudChange = (field, value) => {
    const cloud = { ...config.cloud, [field]: value };
    const updated = printerService.saveConfig({ cloud });
    setConfig(updated);
  };

  const handleFetchCloudPrinters = async () => {
    if (!config.cloud?.apiKey) {
      setConnectMessage({ type: 'error', text: 'Please enter your PrintNode API Key first.' });
      return;
    }
    try {
      setIsLoadingPrinters(true);
      const cloudDriver = printerService.getDriver(DRIVER_IDS.CLOUD);
      const list = await cloudDriver.getPrinters(config.cloud.apiKey);
      setCloudPrinters(list);
      if (list.length > 0 && !config.cloud.printerId) {
        handleCloudChange('printerId', String(list[0].id));
      }
      setConnectMessage({ type: 'success', text: `Found ${list.length} cloud printers.` });
    } catch (err) {
      setConnectMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoadingPrinters(false);
    }
  };

  // Test Print
  const handleTestPrint = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      const res = await printerService.printTestPage();
      if (res.usedFallback) {
        setTestResult({
          type: 'warning',
          text: `Test ticket opened via Browser Print (${res.message}).`,
        });
      } else {
        setTestResult({
          type: 'success',
          text: 'Test print sent successfully!',
        });
      }
    } catch (err) {
      setTestResult({
        type: 'error',
        text: `Print test failed: ${err.message}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const getDriverIcon = (id) => {
    switch (id) {
      case DRIVER_IDS.USB:
        return <Usb className="w-5 h-5" />;
      case DRIVER_IDS.BLUETOOTH:
        return <Bluetooth className="w-5 h-5" />;
      case DRIVER_IDS.RAWBT:
        return <Smartphone className="w-5 h-5" />;
      case DRIVER_IDS.NETWORK:
        return <Wifi className="w-5 h-5" />;
      case DRIVER_IDS.CLOUD:
        return <Cloud className="w-5 h-5" />;
      case DRIVER_IDS.BROWSER:
      default:
        return <Printer className="w-5 h-5" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#2B2118]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-[#F0E4D7] shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#F0E4D7] flex items-center justify-between bg-[#FFF9F2]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF1E6] border border-[#FCD8BF] flex items-center justify-center text-[#F26B1D] shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-extrabold text-[#2B2118] text-base sm:text-lg">
                Receipt & Kitchen Printer Setup
              </h2>
              <p className="text-xs text-[#7A6A5C] mt-0.5">
                Connect once to get automatic printouts for your kitchen and counter.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-[#9E8E81] hover:text-[#2B2118] hover:bg-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Notifications */}
          {connectMessage && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 ${
                connectMessage.type === 'success'
                  ? 'bg-[#E7F6EC] border border-[#C0E9CE] text-[#1F9D55]'
                  : 'bg-[#FDECEC] border border-[#F9C3C5] text-[#D92D20]'
              }`}
            >
              {connectMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#1F9D55]" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-[#D92D20]" />
              )}
              <span>{connectMessage.text}</span>
            </div>
          )}

          {testResult && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 ${
                testResult.type === 'success'
                  ? 'bg-[#E7F6EC] border border-[#C0E9CE] text-[#1F9D55]'
                  : testResult.type === 'warning'
                  ? 'bg-[#FEF3D9] border border-[#FCE1A8] text-[#F5A623]'
                  : 'bg-[#FDECEC] border border-[#F9C3C5] text-[#D92D20]'
              }`}
            >
              {testResult.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#1F9D55]" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{testResult.text}</span>
            </div>
          )}

          {/* 1. Paper Size Selection */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-[#7A6A5C] uppercase tracking-wider">
              1. Paper Size
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {Object.values(PAPER_SIZE_SPECS).map((spec) => {
                const isSelected = config.paperSize === spec.id;
                return (
                  <button
                    key={spec.id}
                    type="button"
                    onClick={() => handlePaperSizeChange(spec.id)}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#FFF1E6] border-[#F26B1D] ring-2 ring-[#F26B1D]/20 shadow-xs'
                        : 'bg-white border-[#F0E4D7] hover:border-[#F26B1D]/40 hover:bg-[#FFF9F2]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-extrabold text-xs text-[#2B2118]">
                          {spec.shortLabel}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#F26B1D] stroke-[3]" />}
                      </div>
                      <p className="text-[10px] text-[#7A6A5C] mt-1 leading-tight">
                        {spec.id === PAPER_SIZES.SIZE_80MM
                          ? 'Counter Thermal (Standard)'
                          : spec.id === PAPER_SIZES.SIZE_58MM
                          ? 'Pocket Thermal'
                          : spec.id === PAPER_SIZES.SIZE_A5
                          ? 'Half Page'
                          : 'Full Page'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Connection Method Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[#7A6A5C] uppercase tracking-wider">
                2. How Is Your Printer Connected?
              </label>
              <span className="text-[11px] text-[#9E8E81] flex items-center gap-1">
                <HelpCircle className="w-3 h-3" />
                Automatic fallback enabled
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {availableDrivers.map((driver) => {
                const isSelected = config.driver === driver.id;

                return (
                  <div
                    key={driver.id}
                    className={`rounded-2xl border p-4 transition ${
                      isSelected
                        ? 'bg-[#FFF9F2] border-[#F26B1D] ring-2 ring-[#F26B1D]/15'
                        : 'bg-white border-[#F0E4D7] hover:border-[#F26B1D]/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-[#F26B1D] text-white shadow-xs'
                              : 'bg-[#FFF1E6] text-[#F26B1D]'
                          }`}
                        >
                          {getDriverIcon(driver.id)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-heading font-extrabold text-sm text-[#2B2118]">
                              {driver.name}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF1E6] text-[#F26B1D] border border-[#FCD8BF]">
                              {driver.badge}
                            </span>
                          </div>
                          <p className="text-xs text-[#7A6A5C] mt-1 leading-relaxed">
                            {driver.description}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDriverChange(driver.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                          isSelected
                            ? 'bg-[#F26B1D] text-white shadow-xs'
                            : 'bg-white border border-[#F26B1D] text-[#F26B1D] hover:bg-[#FFF1E6]'
                        }`}
                      >
                        {isSelected ? 'Active' : 'Select'}
                      </button>
                    </div>

                    {/* Specific Driver Options / Hardware Connect Actions */}
                    {isSelected && (
                      <div className="mt-4 pt-3.5 border-t border-[#F0E4D7] space-y-3">
                        {/* USB Actions */}
                        {driver.id === DRIVER_IDS.USB && (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div>
                              {config.usbDeviceName ? (
                                <div className="flex items-center gap-2 text-xs font-semibold text-[#1F9D55]">
                                  <span className="w-2 h-2 rounded-full bg-[#1F9D55] animate-pulse"></span>
                                  <span>Paired: {config.usbDeviceName}</span>
                                </div>
                              ) : (
                                <p className="text-xs text-[#7A6A5C]">
                                  Printer not paired yet. Click below to select your plugged-in USB printer.
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={isConnecting}
                                onClick={handleConnectUSB}
                                className="px-3.5 py-1.5 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                              >
                                {isConnecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Usb className="w-3.5 h-3.5" />}
                                <span>{config.usbDeviceName ? 'Re-pair Printer' : 'Connect USB Printer'}</span>
                              </button>
                              {config.usbDeviceName && (
                                <button
                                  type="button"
                                  onClick={handleForgetUSB}
                                  className="px-2.5 py-1.5 rounded-xl text-[#D92D20] hover:bg-[#FEE4E2] text-xs font-semibold transition cursor-pointer"
                                >
                                  Forget
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Bluetooth Actions */}
                        {driver.id === DRIVER_IDS.BLUETOOTH && (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div>
                              {config.bluetoothDeviceName ? (
                                <div className="flex items-center gap-2 text-xs font-semibold text-[#1F9D55]">
                                  <span className="w-2 h-2 rounded-full bg-[#1F9D55] animate-pulse"></span>
                                  <span>Paired: {config.bluetoothDeviceName}</span>
                                </div>
                              ) : (
                                <p className="text-xs text-[#7A6A5C]">
                                  Turn on your Bluetooth thermal printer and click below to pair.
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={isConnecting}
                                onClick={handleConnectBluetooth}
                                className="px-3.5 py-1.5 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                              >
                                {isConnecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Bluetooth className="w-3.5 h-3.5" />}
                                <span>{config.bluetoothDeviceName ? 'Re-pair Bluetooth' : 'Connect Bluetooth Printer'}</span>
                              </button>
                              {config.bluetoothDeviceName && (
                                <button
                                  type="button"
                                  onClick={handleDisconnectBluetooth}
                                  className="px-2.5 py-1.5 rounded-xl text-[#D92D20] hover:bg-[#FEE4E2] text-xs font-semibold transition cursor-pointer"
                                >
                                  Disconnect
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* RawBT Actions */}
                        {driver.id === DRIVER_IDS.RAWBT && (
                          <div className="space-y-2">
                            <p className="text-xs text-[#7A6A5C]">
                              RawBT is an Android service that connects to Bluetooth, USB, or Network receipt printers.
                            </p>
                            <a
                              href="https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F26B1D] hover:underline"
                            >
                              <span>Download & Install RawBT from Google Play Store</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}

                        {/* Network / LAN Actions */}
                        {driver.id === DRIVER_IDS.NETWORK && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-[#7A6A5C] mb-1">
                                Printer IP Address
                              </label>
                              <input
                                type="text"
                                placeholder="192.168.1.100"
                                value={config.network?.ip || ''}
                                onChange={(e) => handleNetworkChange('ip', e.target.value)}
                                className="w-full px-3 py-1.5 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2] text-xs font-mono text-[#2B2118] focus:bg-white focus:outline-none focus:border-[#F26B1D]"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-[#7A6A5C] mb-1">
                                Port (Default 9100)
                              </label>
                              <input
                                type="number"
                                placeholder="9100"
                                value={config.network?.port || 9100}
                                onChange={(e) => handleNetworkChange('port', parseInt(e.target.value, 10))}
                                className="w-full px-3 py-1.5 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2] text-xs font-mono text-[#2B2118] focus:bg-white focus:outline-none focus:border-[#F26B1D]"
                              />
                            </div>
                          </div>
                        )}

                        {/* Cloud Print (PrintNode) Actions */}
                        {driver.id === DRIVER_IDS.CLOUD && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="cloud-enabled"
                                checked={config.cloud?.enabled || false}
                                onChange={(e) => handleCloudChange('enabled', e.target.checked)}
                                className="rounded text-[#F26B1D] focus:ring-[#F26B1D]"
                              />
                              <label htmlFor="cloud-enabled" className="text-xs font-bold text-[#2B2118] cursor-pointer">
                                Enable Remote Cloud Printing (PrintNode API)
                              </label>
                            </div>

                            {config.cloud?.enabled && (
                              <div className="space-y-2.5 pt-2">
                                <div>
                                  <label className="block text-[11px] font-bold text-[#7A6A5C] mb-1">
                                    PrintNode API Key
                                  </label>
                                  <div className="flex gap-2">
                                    <input
                                      type="password"
                                      placeholder="Paste your PrintNode API Key..."
                                      value={config.cloud?.apiKey || ''}
                                      onChange={(e) => handleCloudChange('apiKey', e.target.value)}
                                      className="flex-1 px-3 py-1.5 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2] text-xs font-mono text-[#2B2118] focus:bg-white focus:outline-none focus:border-[#F26B1D]"
                                    />
                                    <button
                                      type="button"
                                      disabled={isLoadingPrinters}
                                      onClick={handleFetchCloudPrinters}
                                      className="px-3 py-1.5 rounded-xl bg-[#FFF1E6] hover:bg-[#FCD8BF] text-[#F26B1D] text-xs font-bold transition cursor-pointer"
                                    >
                                      {isLoadingPrinters ? 'Connecting...' : 'Fetch Printers'}
                                    </button>
                                  </div>
                                </div>

                                {cloudPrinters.length > 0 && (
                                  <div>
                                    <label className="block text-[11px] font-bold text-[#7A6A5C] mb-1">
                                      Select Cloud Printer
                                    </label>
                                    <select
                                      value={config.cloud?.printerId || ''}
                                      onChange={(e) => handleCloudChange('printerId', e.target.value)}
                                      className="w-full px-3 py-1.5 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2] text-xs text-[#2B2118] focus:bg-white focus:outline-none focus:border-[#F26B1D] cursor-pointer"
                                    >
                                      {cloudPrinters.map((p) => (
                                        <option key={p.id} value={p.id}>
                                          {p.name} ({p.computer}) - {p.state}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Automation & Hardware Options */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-[#7A6A5C] uppercase tracking-wider">
              3. Ticket Options
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Cash Drawer Kick */}
              <div
                onClick={() => handleToggle('kickCashDrawer')}
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                  config.kickCashDrawer
                    ? 'bg-[#FFF1E6] border-[#F26B1D]'
                    : 'bg-white border-[#F0E4D7] hover:border-[#F26B1D]/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <DollarSign className="w-4 h-4 text-[#F26B1D]" />
                  <div>
                    <div className="text-xs font-bold text-[#2B2118]">Cash Drawer</div>
                    <div className="text-[10px] text-[#7A6A5C]">Kick drawer open</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.kickCashDrawer || false}
                  onChange={() => {}}
                  className="rounded text-[#F26B1D] focus:ring-[#F26B1D]"
                />
              </div>

              {/* Auto Paper Cut */}
              <div
                onClick={() => handleToggle('cutPaper')}
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                  config.cutPaper !== false
                    ? 'bg-[#FFF1E6] border-[#F26B1D]'
                    : 'bg-white border-[#F0E4D7] hover:border-[#F26B1D]/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Scissors className="w-4 h-4 text-[#F26B1D]" />
                  <div>
                    <div className="text-xs font-bold text-[#2B2118]">Auto Cut</div>
                    <div className="text-[10px] text-[#7A6A5C]">Cut after ticket</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.cutPaper !== false}
                  onChange={() => {}}
                  className="rounded text-[#F26B1D] focus:ring-[#F26B1D]"
                />
              </div>

              {/* Auto-print incoming orders */}
              <div
                onClick={() => handleToggle('autoPrintNewOrders')}
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                  config.autoPrintNewOrders
                    ? 'bg-[#FFF1E6] border-[#F26B1D]'
                    : 'bg-white border-[#F0E4D7] hover:border-[#F26B1D]/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Zap className="w-4 h-4 text-[#F26B1D]" />
                  <div>
                    <div className="text-xs font-bold text-[#2B2118]">Auto-Print</div>
                    <div className="text-[10px] text-[#7A6A5C]">On incoming order</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.autoPrintNewOrders || false}
                  onChange={() => {}}
                  className="rounded text-[#F26B1D] focus:ring-[#F26B1D]"
                />
              </div>
            </div>
          </div>

          {/* Fallback Guarantee Banner */}
          <div className="p-3.5 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] text-[#7A6A5C] text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#1F9D55] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#2B2118]">Zero-Worry Fallback: </span>
              <span>
                If your USB, Bluetooth, or Network printer ever gets disconnected or runs out of paper, DineHQ automatically opens your standard browser print dialog so you never miss an order ticket.
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#F0E4D7] bg-[#FFF9F2] flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            disabled={isTesting}
            onClick={handleTestPrint}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white border border-[#F26B1D] text-[#F26B1D] hover:bg-[#FFF1E6] text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            <span>Print Test Ticket</span>
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs font-bold shadow-md shadow-[#F26B1D]/20 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Save & Close</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
