import React, { useState, useEffect } from 'react';
import { Download, Monitor, X, Share2, PlusSquare } from 'lucide-react';
import { pwaService } from '../../services/pwaService';

export default function InstallAppButton() {
  const [installState, setInstallState] = useState({
    canInstall: pwaService.getCanInstall(),
    isInstalled: pwaService.getIsInstalled(),
  });
  const [showManualModal, setShowManualModal] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    return pwaService.subscribeInstallPrompt((state) => {
      setInstallState(state);
    });
  }, []);

  // Hide completely once already installed as a standalone PWA
  if (installState.isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (installState.canInstall) {
      const res = await pwaService.promptInstall();
      if (res?.outcome === 'accepted') {
        setShowManualModal(false);
      }
    } else {
      // Browser does not support beforeinstallprompt (e.g. Safari, iOS, Firefox)
      setShowManualModal(true);
    }
  };

  const isIOS =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);

  return (
    <>
      <div className="relative inline-flex items-center shrink-0">
        <button
          type="button"
          id="pwa-install-app-btn"
          onClick={handleInstallClick}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="h-9 px-3 rounded-xl bg-gradient-to-r from-[#FFF1E6] to-[#FFE8D6] hover:from-[#F26B1D] hover:to-[#E55B0D] text-[#D95A12] hover:text-white border border-[#FCD8BF] hover:border-[#F26B1D] text-xs font-bold transition-all duration-200 inline-flex items-center gap-1.5 cursor-pointer shadow-2xs group whitespace-nowrap shrink-0"
          title="Install Dineflow on this computer for quick access."
        >
          <Download className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
          <span className="hidden sm:inline">Install App</span>
          <span className="sm:hidden">Install</span>
        </button>

        {/* One-line Help Tooltip */}
        {showTooltip && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap bg-[#2B2118] text-white text-[11px] font-semibold px-3 py-1.5 rounded-xl shadow-xl border border-white/10 pointer-events-none animate-fadeIn">
            Install Dineflow on this computer for quick access.
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#2B2118] rotate-45 border-l border-t border-white/10" />
          </div>
        )}
      </div>

      {/* Manual Instructions Modal for Browsers Without Native Prompt */}
      {showManualModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setShowManualModal(false)}
        >
          <div
            className="bg-white rounded-3xl border border-[#F0E4D7] shadow-2xl max-w-md w-full p-6 space-y-5 animate-scaleUp my-auto text-[#2B2118]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FFF1E6] text-[#F26B1D] flex items-center justify-center font-bold">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-lg text-[#2B2118]">
                    Install Dineflow
                  </h3>
                  <p className="text-xs text-[#7A6A5C]">
                    Install Dineflow on this computer for quick access.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Instruction Steps Based on Device / Browser */}
            <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-3 text-xs">
              {isIOS ? (
                <>
                  <p className="font-bold text-[#F26B1D] uppercase tracking-wider text-[11px]">
                    Apple Safari on iPhone / iPad:
                  </p>
                  <ol className="space-y-2 text-[#2B2118] list-decimal list-inside">
                    <li className="leading-relaxed">
                      Tap the <strong className="inline-flex items-center gap-1 font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200"><Share2 className="w-3 h-3" /> Share</strong> button in Safari's bottom toolbar.
                    </li>
                    <li className="leading-relaxed">
                      Scroll down and tap <strong className="inline-flex items-center gap-1 font-bold text-[#F26B1D] bg-[#FFF1E6] px-1.5 py-0.5 rounded border border-[#FCD8BF]"><PlusSquare className="w-3 h-3" /> Add to Home Screen</strong>.
                    </li>
                    <li className="leading-relaxed">
                      Tap <strong>Add</strong> in the top right. Dineflow will appear on your home screen.
                    </li>
                  </ol>
                </>
              ) : isMac ? (
                <>
                  <p className="font-bold text-[#F26B1D] uppercase tracking-wider text-[11px]">
                    Mac Safari / Chrome:
                  </p>
                  <ol className="space-y-2 text-[#2B2118] list-decimal list-inside">
                    <li className="leading-relaxed">
                      Click the <strong>Install Dineflow</strong> icon in your browser’s URL address bar (at the right edge).
                    </li>
                    <li className="leading-relaxed">
                      In Safari: Click <strong>File &gt; Add to Dock...</strong> from the top menu bar.
                    </li>
                    <li className="leading-relaxed">
                      Click <strong>Install</strong> to open Dineflow in its own high-performance window.
                    </li>
                  </ol>
                </>
              ) : (
                <>
                  <p className="font-bold text-[#F26B1D] uppercase tracking-wider text-[11px]">
                    Desktop Browser:
                  </p>
                  <ol className="space-y-2 text-[#2B2118] list-decimal list-inside">
                    <li className="leading-relaxed">
                      Look for the <strong className="text-[#F26B1D]">Install App icon (⊕ or 💻)</strong> on the right side of your browser address bar.
                    </li>
                    <li className="leading-relaxed">
                      Or click the browser menu (<strong>⋮</strong> or <strong>⋯</strong>) and select <strong>"Install Dineflow..."</strong>.
                    </li>
                    <li className="leading-relaxed">
                      Click <strong>Install</strong> to add Dineflow directly to your desktop and taskbar.
                    </li>
                  </ol>
                </>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="px-5 py-2.5 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs font-bold transition cursor-pointer shadow-md shadow-orange-500/20"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
