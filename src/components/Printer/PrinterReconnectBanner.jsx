/**
 * Printer Reconnect & Auto-Detect Banner
 * Shown at the top of the screen when a printer was moved to a new USB port,
 * is reconnecting, has queued print jobs, or when a thermal printer is auto-detected.
 * Reconnects in a single tap without requiring the full setup wizard.
 */

import React, { useState, useEffect } from 'react';
import {
  Printer,
  Usb,
  RefreshCw,
  Zap,
  CheckCircle2,
  X,
  AlertTriangle,
  HardDrive,
  Clock,
} from 'lucide-react';
import { printerService } from '../../services/printer/printerService';
import { DRIVER_IDS } from '../../services/printer/printerTypes';
import { formatVidPid } from '../../services/printer/usbRegistry';

export default function PrinterReconnectBanner({ onOpenSettings }) {
  const [printers, setPrinters] = useState(() => printerService.getPrinters());
  const [queueCount, setQueueCount] = useState(() => printerService.getRetryQueue().length);
  const [portChangedDetail, setPortChangedDetail] = useState(null);
  const [autoDetectedCandidate, setAutoDetectedCandidate] = useState(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [successToast, setSuccessToast] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);

  // Subscribe to printer updates
  useEffect(() => {
    return printerService.subscribe((data) => {
      if (data?.printers) {
        setPrinters(data.printers);
      } else {
        setPrinters(printerService.getPrinters());
      }
      if (data?.retryQueue) {
        setQueueCount(data.retryQueue.length);
      }
    });
  }, []);

  // Listen for custom events
  useEffect(() => {
    const handlePortChanged = (e) => {
      setPortChangedDetail(e.detail || {});
      setIsDismissed(false);
    };

    const handleDismiss = () => {
      setPortChangedDetail(null);
      setIsDismissed(true);
    };

    const handleQueueUpdated = (e) => {
      setQueueCount(e.detail?.queue?.length || 0);
    };

    const handleJobQueued = (e) => {
      setQueueCount(e.detail?.queueCount || 1);
    };

    const handleQueuePrinted = (e) => {
      const count = e.detail?.count || 1;
      const name = e.detail?.printerName || 'Printer';
      setSuccessToast(`${name} reconnected — printed ${count} queued receipt(s) automatically!`);
      setTimeout(() => setSuccessToast(null), 5000);
      setPortChangedDetail(null);
    };

    window.addEventListener('dinehq_printer_port_changed', handlePortChanged);
    window.addEventListener('dinehq_printer_reconnected_dismiss_banner', handleDismiss);
    window.addEventListener('dinehq_print_retry_queue_updated', handleQueueUpdated);
    window.addEventListener('dinehq_printer_job_queued', handleJobQueued);
    window.addEventListener('dinehq_queue_auto_printed', handleQueuePrinted);

    return () => {
      window.removeEventListener('dinehq_printer_port_changed', handlePortChanged);
      window.removeEventListener('dinehq_printer_reconnected_dismiss_banner', handleDismiss);
      window.removeEventListener('dinehq_print_retry_queue_updated', handleQueueUpdated);
      window.removeEventListener('dinehq_printer_job_queued', handleJobQueued);
      window.removeEventListener('dinehq_queue_auto_printed', handleQueuePrinted);
    };
  }, []);

  // Check if any printer is reconnecting or has port issue
  const reconnectingPrinter = printers.find(
    (p) => p.type === DRIVER_IDS.USB && p.status === 'reconnecting'
  );

  const hasPortIssue = Boolean(portChangedDetail || reconnectingPrinter);

  // One-tap quick reconnect
  const handleQuickReconnect = async () => {
    try {
      setIsReconnecting(true);
      const targetId = portChangedDetail?.printer?.id || reconnectingPrinter?.id;
      const updated = await printerService.quickReconnectPrinter(targetId);
      setSuccessToast(`Reconnected to ${updated.name || 'Printer'}! Saved for all USB ports.`);
      setPortChangedDetail(null);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      if (err.name !== 'NotFoundError') {
        alert(`Could not reconnect: ${err.message}`);
      }
    } finally {
      setIsReconnecting(false);
    }
  };

  // One-tap auto-detect
  const handleAutoDetect = async () => {
    try {
      setIsReconnecting(true);
      const detected = await printerService.autoDetectPrinter();
      if (detected) {
        setAutoDetectedCandidate(detected);
      } else {
        alert('No USB thermal printers found. Make sure your printer is turned ON and plugged in.');
      }
    } catch (err) {
      if (err.name !== 'NotFoundError') {
        alert(`Auto-detect notice: ${err.message}`);
      }
    } finally {
      setIsReconnecting(false);
    }
  };

  // Apply auto-detected candidate
  const handleApplyCandidate = () => {
    if (!autoDetectedCandidate) return;
    const targetPrinter = reconnectingPrinter || printerService.getDefaultPrinter();
    printerService.savePrinter({
      ...targetPrinter,
      status: 'connected',
      type: autoDetectedCandidate.type || DRIVER_IDS.USB,
      connection: {
        ...targetPrinter?.connection,
        deviceName: autoDetectedCandidate.name,
        vendorId: autoDetectedCandidate.vendorId,
        productId: autoDetectedCandidate.productId,
        serialNumber: autoDetectedCandidate.serialNumber || '',
      },
    });
    setSuccessToast(`Connected to ${autoDetectedCandidate.name}! Ready to print.`);
    setAutoDetectedCandidate(null);
    setPortChangedDetail(null);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  if (successToast) {
    return (
      <div className="no-print bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-md flex items-center justify-between gap-3 text-xs sm:text-sm font-bold animate-fadeIn">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{successToast}</span>
        </div>
        <button
          type="button"
          onClick={() => setSuccessToast(null)}
          className="text-emerald-200 hover:text-white p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (isDismissed || (!hasPortIssue && !autoDetectedCandidate && queueCount === 0)) {
    return null;
  }

  return (
    <div className="no-print space-y-2">
      {/* 1. Friendly Port Changed / Reconnect Banner */}
      {hasPortIssue && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-3 sm:p-3.5 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Usb className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 font-black text-xs sm:text-sm tracking-tight">
                <span>Printer moved to a new port — tap Reconnect</span>
                <span className="px-2 py-0.2 rounded-full bg-white/20 text-white text-[10px] font-mono">
                  1-Tap
                </span>
              </div>
              <p className="text-[11px] text-amber-100 mt-0.5">
                Thermal printer detected on another USB port. Tap below to re-authorize; will be remembered afterwards.
                {queueCount > 0 && ` (${queueCount} receipt(s) waiting in queue)`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleAutoDetect}
              className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition cursor-pointer"
              title="Scan all USB printer-class devices"
            >
              Auto-Detect
            </button>

            <button
              type="button"
              disabled={isReconnecting}
              onClick={handleQuickReconnect}
              className="px-4 py-2 rounded-xl bg-white text-orange-600 hover:bg-orange-50 active:scale-95 text-xs font-black shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isReconnecting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5 fill-current" />
              )}
              <span>{isReconnecting ? 'Connecting...' : 'Tap Reconnect'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
              title="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Candidate Printer Prompt (One-tap Use This Printer) */}
      {autoDetectedCandidate && (
        <div className="bg-slate-900 text-white p-3 sm:p-3.5 rounded-2xl shadow-lg border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs sm:text-sm font-black">
                <span>Detected Thermal Printer:</span>
                <span className="text-amber-300 font-mono">
                  {autoDetectedCandidate.name}
                </span>
                {autoDetectedCandidate.vendorId && (
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                    {formatVidPid(autoDetectedCandidate.vendorId, autoDetectedCandidate.productId)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Port-independent USB printer found. Click 'Use this printer' to link instantly.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleApplyCandidate}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black transition cursor-pointer shadow-xs"
            >
              Use This Printer
            </button>
            <button
              type="button"
              onClick={() => setAutoDetectedCandidate(null)}
              className="p-1.5 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Reconnecting with Waiting Queue Notice */}
      {!hasPortIssue && queueCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-2.5 rounded-2xl flex items-center justify-between gap-2 text-xs font-bold">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
            <span>
              {queueCount} print job(s) waiting in queue. Will print automatically once printer is reconnected.
            </span>
          </div>
          <button
            type="button"
            onClick={handleQuickReconnect}
            className="text-amber-800 underline hover:text-amber-950 font-bold"
          >
            Reconnect Now →
          </button>
        </div>
      )}
    </div>
  );
}
