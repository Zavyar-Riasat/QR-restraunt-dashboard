import React, { useState } from 'react';

/**
 * Compact OpenStreetMap Attribution
 * Renders as a compact "i" icon on the map that smoothly expands on tap/click.
 * Completely free of third-party engine branding.
 */
export default function CompactOsmAttribution({ className = 'bottom-2 right-2' }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`absolute z-[400] pointer-events-auto select-none ${className}`}>
      {isOpen ? (
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/95 dark:bg-[#221A14]/95 backdrop-blur-md text-[10px] font-medium text-[#2B2118] dark:text-[#FFF9F2] shadow-md border border-[#F0E4D7] dark:border-[#382B20] animate-fadeIn">
          <span className="w-3.5 h-3.5 rounded-full bg-[#F26B1D] text-white flex items-center justify-center text-[9px] font-black shrink-0">
            i
          </span>
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#2B2118] dark:text-[#FFF9F2] hover:text-[#F26B1D] font-bold underline transition"
          >
            © OpenStreetMap contributors
          </a>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            className="text-[#9E8E81] hover:text-[#2B2118] dark:hover:text-white p-0.5 rounded-full transition cursor-pointer leading-none text-xs ml-0.5"
            title="Close attribution"
            aria-label="Close attribution"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
          className="w-6 h-6 rounded-full bg-white/90 dark:bg-[#221A14]/90 hover:bg-white dark:hover:bg-[#2A2019] text-[#7A6A5C] dark:text-[#CBB8A8] hover:text-[#F26B1D] border border-[#F0E4D7] dark:border-[#382B20] shadow-sm flex items-center justify-center text-[11px] font-serif font-bold transition hover:scale-105 active:scale-95 cursor-pointer"
          title="Map attribution: © OpenStreetMap"
          aria-label="Show OpenStreetMap attribution"
        >
          i
        </button>
      )}
    </div>
  );
}
