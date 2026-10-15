/**
 * Multi-Printer Status Badge for Orders Screen Header
 * Displays each printer's connection status as a small colored dot (green/red)
 * and shows the plain message "Printer not connected" when any printer is offline.
 */

import React, { useState, useEffect } from 'react';
import { Printer, Settings2 } from 'lucide-react';
import { printerService } from '../../services/printer/printerService';

export default function PrinterStatusBadge({ onOpenSettings }) {
  const [printers, setPrinters] = useState(() => printerService.getPrinters());

  useEffect(() => {
    return printerService.subscribe((data) => {
      if (data && data.printers) {
        setPrinters(data.printers);
      } else {
        setPrinters(printerService.getPrinters());
      }
    });
  }, []);

  const hasPrinters = printers.length > 0;
  const anyDisconnected = !hasPrinters || printers.some((p) => p.status !== 'connected');

  return (
    <button
      type="button"
      onClick={onOpenSettings}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border transition cursor-pointer group shadow-2xs ${
        anyDisconnected
          ? 'bg-[#FDECEC]/80 border-[#F9C3C5] hover:bg-[#FDECEC] hover:border-[#F26B1D]/40 text-[#D92D20]'
          : 'bg-white border-[#F0E4D7] hover:border-[#F26B1D]/40 hover:bg-[#FFF1E6]/40 text-[#2B2118]'
      }`}
      title="Receipt and kitchen printers status. Click to open Printers settings."
    >
      <span
        className={`p-1 rounded-lg transition ${
          anyDisconnected
            ? 'bg-[#FDECEC] text-[#D92D20] group-hover:bg-[#D92D20] group-hover:text-white'
            : 'bg-[#FFF1E6] text-[#F26B1D] group-hover:bg-[#F26B1D] group-hover:text-white'
        }`}
      >
        <Printer className="w-3.5 h-3.5" />
      </span>

      {/* Per-Printer Colored Dots & Names */}
      {hasPrinters ? (
        <div className="flex items-center gap-2">
          {printers.map((printer) => {
            const isConnected = printer.status === 'connected';
            return (
              <div
                key={printer.id}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#2B2118]"
                title={`${printer.name}: ${isConnected ? 'Connected' : 'Not connected'}`}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isConnected
                      ? 'bg-[#1F9D55] shadow-xs shadow-green-500/50'
                      : 'bg-[#D92D20] animate-pulse'
                  }`}
                />
                <span className="truncate max-w-[85px] sm:max-w-[120px] text-[11px] font-bold">
                  {printer.name}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#D92D20] animate-pulse" />
          <span className="text-xs font-bold text-[#D92D20]">No Printers</span>
        </div>
      )}

      {/* Plain message "Printer not connected" when needed */}
      {anyDisconnected && (
        <span className="px-2 py-0.5 rounded-md bg-[#FDECEC] text-[#D92D20] text-[11px] font-bold border border-[#F9C3C5] whitespace-nowrap animate-fadeIn">
          Printer not connected
        </span>
      )}

      <Settings2 className="w-3 h-3 text-[#9E8E81] group-hover:text-[#F26B1D] transition shrink-0 ml-0.5" />
    </button>
  );
}
