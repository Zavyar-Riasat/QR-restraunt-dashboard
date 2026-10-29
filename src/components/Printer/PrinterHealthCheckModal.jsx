import React, { useState, useEffect } from 'react';
import {
  Printer,
  X,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Activity,
  Wifi,
  Usb,
  Bluetooth,
  Smartphone,
  AlertTriangle,
  ChevronDown,
  ShieldCheck,
  } from 'lucide-react';
import { printerService } from '../../services/printer/printerService';
import { DRIVER_IDS } from '../../services/printer/printerTypes';
import { getPlatformDiagnostics, isIOS } from '../../services/printer/capabilities';

export default function PrinterHealthCheckModal({
  isOpen,
  onClose,
  initialPrinterId = null,
}) {
  const [printers, setPrinters] = useState(() => printerService.getPrinters());
  const [selectedPrinterId, setSelectedPrinterId] = useState(
    initialPrinterId || printerService.getDefaultPrinter()?.id || printers[0]?.id
  );
  const [isRunning, setIsRunning] = useState(false);
  const [healthResult, setHealthResult] = useState(null);
  const [activeStepIndex, setActiveStepIndex] = useState(-1);

  const platform = getPlatformDiagnostics();

  const selectedPrinter = React.useMemo(() => {
    return (
      printers.find((p) => p.id === selectedPrinterId) ||
      printers[0] ||
      printerService.getDefaultPrinter()
    );
  }, [printers, selectedPrinterId]);

  const runDiagnostic = React.useCallback(async (printerIdToTest) => {
    const currentPrinters = printerService.getPrinters();
    const target =
      currentPrinters.find((p) => p.id === (printerIdToTest || selectedPrinterId)) ||
      selectedPrinter;

    if (!target) return;

    setIsRunning(true);
    setHealthResult(null);
    setActiveStepIndex(0);

    try {
      // Small visual cadence so user sees tests progressing
      await new Promise((r) => setTimeout(r, 200));
      setActiveStepIndex(1);
      await new Promise((r) => setTimeout(r, 250));
      setActiveStepIndex(2);

      const result = await printerService.runHealthCheck(target);
      setHealthResult(result);
    } catch (err) {
      setHealthResult({
        printer: target,
        overallStatus: 'fail',
        passedCount: 0,
        totalCount: 3,
        steps: [
          {
            step: 1,
            name: 'Connection Status',
            status: 'fail',
            latencyMs: 0,
            message: `Diagnostic runner error: ${err.message}`,
            fixTip: 'Restart browser or reconnect hardware.',
          },
          {
            step: 2,
            name: 'Paper Size & Print Layout',
            status: 'fail',
            message: 'Check aborted due to driver error.',
          },
          {
            step: 3,
            name: 'Test Print Execution',
            status: 'fail',
            message: 'Aborted.',
          },
        ],
      });
    } finally {
      setIsRunning(false);
      setActiveStepIndex(-1);
    }
  }, [selectedPrinterId, selectedPrinter]);

  // Keep printer list synchronized
  useEffect(() => {
    return printerService.subscribe((data) => {
      if (data?.printers) {
        setPrinters(data.printers);
      }
    });
  }, []);

  // Sync selected printer when modal opens or initialPrinterId changes
  useEffect(() => {
    if (isOpen) {
      const currentList = printerService.getPrinters();
      setPrinters(currentList);
      const targetId =
        initialPrinterId ||
        selectedPrinterId ||
        printerService.getDefaultPrinter()?.id ||
        currentList[0]?.id;
      setSelectedPrinterId(targetId);
      // Automatically run health check on modal open
      runDiagnostic(targetId);
    }
  }, [isOpen, initialPrinterId, runDiagnostic]);

  const _renderTypeIcon = (type) => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#F0E4D7] overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#FFF9F2] via-white to-[#FFF9F2] border-b border-[#F0E4D7] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-xs">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-heading font-extrabold text-[#2B2118] tracking-tight">
                  Printer Health Check
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                  Live Diagnostics
                </span>
              </div>
              <p className="text-xs text-[#7A6A5C] mt-0.5">
                Tests hardware connection, paper size configuration, and test print output.
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

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Printer Selector Bar & OS Environment Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7]">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <span className="text-xs font-bold text-[#7A6A5C] shrink-0">Testing Printer:</span>
              <div className="relative flex-1">
                <select
                  id="health-check-printer-select"
                  value={selectedPrinter?.id || ''}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setSelectedPrinterId(newId);
                    runDiagnostic(newId);
                  }}
                  disabled={isRunning}
                  className="w-full appearance-none pl-3 pr-8 py-2 rounded-xl bg-white border border-[#F0E4D7] text-xs font-bold text-[#2B2118] focus:outline-none focus:border-[#F26B1D] shadow-2xs cursor-pointer truncate"
                >
                  {printers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.typeName || p.type} • {p.paperSize}) {p.isDefault ? '★ Default' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Platform / Device Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#F0E4D7] text-[11px] font-semibold text-[#7A6A5C] shrink-0">
              <span>🖥️</span>
              <span className="truncate max-w-[200px]">{platform.osName} ({platform.browserName})</span>
            </div>
          </div>

          {/* iPhone Safari Notice if applicable */}
          {isIOS() && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2.5">
              <span className="text-sm">📱</span>
              <div>
                <span className="font-bold">Apple iOS Safari Environment:</span> WebUSB and direct Web Bluetooth are reserved for Chrome/Android. On iPhone/iPad, tickets are safely printed via standard AirPrint / Browser Print or Network Print.
              </div>
            </div>
          )}

          {/* 3 Steps Diagnostic Results (Clear Green / Red Status) */}
          <div className="space-y-3">
            {/* STEP 1: Connection Check */}
            {(() => {
              const s1 = healthResult?.steps?.[0];
              const isPass = s1?.status === 'pass';
              const isFail = s1?.status === 'fail';
              const isStepRunning = isRunning && activeStepIndex === 0;

              return (
                <div
                  id="health-step-1"
                  className={`p-4 rounded-2xl border transition-all ${
                    isPass
                      ? 'bg-emerald-50/50 border-emerald-300 shadow-2xs'
                      : isFail
                      ? 'bg-rose-50/50 border-rose-300 shadow-2xs'
                      : isStepRunning
                      ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-400'
                      : 'bg-white border-[#F0E4D7]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {isPass ? (
                          <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                            <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                          </div>
                        ) : isFail ? (
                          <div className="w-7 h-7 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
                            <XCircle className="w-5 h-5 stroke-[2.5]" />
                          </div>
                        ) : isStepRunning ? (
                          <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-xs">
                            1
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-[#2B2118]">
                            1. Hardware & Connection Status
                          </h4>
                          {isPass && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                              PASS ({s1?.latencyMs}ms)
                            </span>
                          )}
                          {isFail && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-mono font-bold">
                              FAILED
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-[#7A6A5C]">
                          {s1?.message || 'Verifying communication pipeline with printer driver...'}
                        </p>

                        {isFail && s1?.fixTip && (
                          <div className="mt-2 p-2.5 rounded-xl bg-white/80 border border-rose-200 text-[11px] text-rose-900 font-medium">
                            <span className="font-bold text-rose-700">Troubleshooting Action: </span>
                            {s1.fixTip}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isPass ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-600 shadow-xs" />
                          <span>Connected</span>
                        </span>
                      ) : isFail ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 border border-rose-300 text-rose-800 text-xs font-bold">
                          <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                          <span>Disconnected</span>
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">Waiting</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* STEP 2: Paper Size Check */}
            {(() => {
              const s2 = healthResult?.steps?.[1];
              const isPass = s2?.status === 'pass';
              const isFail = s2?.status === 'fail';
              const isStepRunning = isRunning && activeStepIndex === 1;

              return (
                <div
                  id="health-step-2"
                  className={`p-4 rounded-2xl border transition-all ${
                    isPass
                      ? 'bg-emerald-50/50 border-emerald-300 shadow-2xs'
                      : isFail
                      ? 'bg-rose-50/50 border-rose-300 shadow-2xs'
                      : isStepRunning
                      ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-400'
                      : 'bg-white border-[#F0E4D7]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {isPass ? (
                          <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                            <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                          </div>
                        ) : isFail ? (
                          <div className="w-7 h-7 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
                            <XCircle className="w-5 h-5 stroke-[2.5]" />
                          </div>
                        ) : isStepRunning ? (
                          <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-xs">
                            2
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-[#2B2118]">
                            2. Paper Size & Layout Bounds
                          </h4>
                          {isPass && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                              PASS ({selectedPrinter?.paperSize || '80mm'})
                            </span>
                          )}
                          {isFail && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-mono font-bold">
                              FAILED
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-[#7A6A5C]">
                          {s2?.message || 'Validating roll dimensions, column wrapping, and printable bounds...'}
                        </p>

                        {s2?.details && (
                          <div className="text-[11px] font-mono text-emerald-900 bg-white/70 px-2.5 py-1 rounded-lg border border-emerald-200 mt-1 inline-block">
                            📐 {s2.details}
                          </div>
                        )}

                        {isFail && s2?.fixTip && (
                          <div className="mt-2 p-2.5 rounded-xl bg-white/80 border border-rose-200 text-[11px] text-rose-900 font-medium">
                            <span className="font-bold text-rose-700">Troubleshooting Action: </span>
                            {s2.fixTip}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isPass ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-600 shadow-xs" />
                          <span>Verified</span>
                        </span>
                      ) : isFail ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 border border-rose-300 text-rose-800 text-xs font-bold">
                          <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                          <span>Invalid Size</span>
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">Waiting</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* STEP 3: Test Print Check */}
            {(() => {
              const s3 = healthResult?.steps?.[2];
              const isPass = s3?.status === 'pass';
              const isFail = s3?.status === 'fail';
              const isStepRunning = isRunning && activeStepIndex === 2;

              return (
                <div
                  id="health-step-3"
                  className={`p-4 rounded-2xl border transition-all ${
                    isPass
                      ? 'bg-emerald-50/50 border-emerald-300 shadow-2xs'
                      : isFail
                      ? 'bg-rose-50/50 border-rose-300 shadow-2xs'
                      : isStepRunning
                      ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-400'
                      : 'bg-white border-[#F0E4D7]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {isPass ? (
                          <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                            <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                          </div>
                        ) : isFail ? (
                          <div className="w-7 h-7 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
                            <XCircle className="w-5 h-5 stroke-[2.5]" />
                          </div>
                        ) : isStepRunning ? (
                          <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-xs">
                            3
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-[#2B2118]">
                            3. End-to-End Test Print Execution
                          </h4>
                          {isPass && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                              PASS ({s3?.latencyMs}ms)
                            </span>
                          )}
                          {isFail && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-mono font-bold">
                              FAILED
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-[#7A6A5C]">
                          {s3?.message || 'Dispatching diagnostic test ticket through driver pipeline...'}
                        </p>

                        {isFail && s3?.fixTip && (
                          <div className="mt-2 p-2.5 rounded-xl bg-white/80 border border-rose-200 text-[11px] text-rose-900 font-medium">
                            <span className="font-bold text-rose-700">Troubleshooting Action: </span>
                            {s3.fixTip}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isPass ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-600 shadow-xs" />
                          <span>Print OK</span>
                        </span>
                      ) : isFail ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 border border-rose-300 text-rose-800 text-xs font-bold">
                          <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                          <span>Print Failed</span>
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">Waiting</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Overall Assessment Banner */}
          {healthResult && (
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between gap-3 animate-fadeIn ${
                healthResult.overallStatus === 'pass'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-500 shadow-lg shadow-emerald-600/20'
                  : 'bg-gradient-to-r from-rose-600 to-red-700 text-white border-rose-500 shadow-lg shadow-rose-600/20'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  {healthResult.overallStatus === 'pass' ? (
                    <ShieldCheck className="w-5 h-5 text-white" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-extrabold tracking-tight">
                    {healthResult.overallStatus === 'pass'
                      ? 'Printer is 100% Healthy & Ready!'
                      : `${3 - healthResult.passedCount} of 3 Checks Failed`}
                  </h4>
                  <p className="text-xs text-white/90 font-medium mt-0.5">
                    {healthResult.overallStatus === 'pass'
                      ? `All 3 tests passed. "${selectedPrinter?.name}" is ready for live order auto-printing.`
                      : 'Please review the highlighted check(s) above to resolve connection or hardware issues.'}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="px-3 py-1 rounded-full bg-white/25 text-white text-xs font-extrabold font-mono">
                  {healthResult.passedCount} / 3 PASSED
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#FFF9F2] via-white to-[#FFF9F2] border-t border-[#F0E4D7] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#F0E4D7] bg-white text-[#7A6A5C] hover:text-[#2B2118] hover:bg-[#FFF9F2] text-xs font-bold transition cursor-pointer"
          >
            Close
          </button>

          <button
            id="re-run-health-check-btn"
            type="button"
            disabled={isRunning}
            onClick={() => runDiagnostic(selectedPrinter?.id)}
            className="px-5 py-2.5 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] active:scale-98 text-white text-xs sm:text-sm font-extrabold shadow-md shadow-orange-500/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Running Diagnostic...' : 'Run Diagnostics Again'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
