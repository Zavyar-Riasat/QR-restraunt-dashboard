import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, Smartphone, X, Share2, PlusSquare, MoreVertical } from 'lucide-react';
import { pwaService } from '../../services/pwaService';

export default function InstallAppButton({ appName = 'Dineflow' }) {
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
      // Browser does not support beforeinstallprompt or hasn't fired it yet (e.g. iOS Safari, in-app browsers)
      setShowManualModal(true);
    }
  };

  const isIOS =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  const isAndroid =
    typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

  const isMac =
    typeof navigator !== 'undefined' && !isIOS && /Mac/.test(navigator.platform);

  return (
    <>
      <div className="relative inline-flex items-center shrink-0">
        <button
          type="button"
          id="pwa-install-app-btn"
          onClick={handleInstallClick}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="h-9 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-[#FFF1E6] to-[#FFE8D6] hover:from-[#F26B1D] hover:to-[#E55B0D] text-[#D95A12] hover:text-white border border-[#FCD8BF] hover:border-[#F26B1D] text-xs font-extrabold transition-all duration-200 inline-flex items-center gap-1.5 cursor-pointer shadow-2xs group whitespace-nowrap shrink-0"
          title={`Install ${appName} on your mobile or device for quick ordering`}
        >
          <Download className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
          <span className="hidden sm:inline">Install App</span>
          <span className="sm:hidden">Install</span>
        </button>

        {/* One-line Help Tooltip (Desktop Hover) */}
        {showTooltip && (
          <div className="hidden sm:block absolute top-full mt-2 right-0 z-50 whitespace-nowrap bg-[#2B2118] text-white text-[11px] font-semibold px-3 py-1.5 rounded-xl shadow-xl border border-white/10 pointer-events-none animate-fadeIn">
            Install {appName} on your mobile or device for quick access
          </div>
        )}
      </div>

      {/* Manual Instructions Modal Rendered in Portal so Sticky Header Blur Never Clips It */}
      {showManualModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
            onClick={() => setShowManualModal(false)}
          >
            <div
              className="bg-white rounded-3xl border border-[#F0E4D7] shadow-2xl max-w-md w-full p-6 space-y-5 animate-scaleUp my-auto text-[#2B2118]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#FFF1E6] border border-[#FCD8BF] text-[#F26B1D] flex items-center justify-center font-bold shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-extrabold text-lg text-[#2B2118]">
                      Install {appName}
                    </h3>
                    <p className="text-xs text-[#7A6A5C]">
                      Add to your mobile home screen for 1-tap menu & ordering access.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="w-8 h-8 rounded-full bg-[#FFF9F2] hover:bg-[#FFF1E6] border border-[#F0E4D7] text-[#7A6A5C] hover:text-[#2B2118] flex items-center justify-center transition cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Instruction Steps Based on Device / Browser */}
              <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-3 text-xs">
                {isIOS ? (
                  <>
                    <p className="font-extrabold text-[#F26B1D] uppercase tracking-wider text-[11px]">
                      iPhone / iPad (Safari):
                    </p>
                    <ol className="space-y-2.5 text-[#2B2118] list-decimal list-inside">
                      <li className="leading-relaxed">
                        Tap the{' '}
                        <strong className="inline-flex items-center gap-1 font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                          <Share2 className="w-3 h-3" /> Share
                        </strong>{' '}
                        button in Safari&apos;s bottom bar.
                      </li>
                      <li className="leading-relaxed">
                        Scroll down and tap{' '}
                        <strong className="inline-flex items-center gap-1 font-bold text-[#D95A12] bg-[#FFF1E6] px-1.5 py-0.5 rounded border border-[#FCD8BF]">
                          <PlusSquare className="w-3 h-3" /> Add to Home Screen
                        </strong>
                        .
                      </li>
                      <li className="leading-relaxed">
                        Tap <strong>Add</strong> in the top right corner to install the app icon on your phone.
                      </li>
                    </ol>
                  </>
                ) : isAndroid ? (
                  <>
                    <p className="font-extrabold text-[#F26B1D] uppercase tracking-wider text-[11px]">
                      Android Mobile (Chrome / Browser):
                    </p>
                    <ol className="space-y-2.5 text-[#2B2118] list-decimal list-inside">
                      <li className="leading-relaxed">
                        Tap the browser menu{' '}
                        <strong className="inline-flex items-center gap-0.5 font-bold text-[#D95A12] bg-[#FFF1E6] px-1.5 py-0.5 rounded border border-[#FCD8BF]">
                          <MoreVertical className="w-3 h-3" /> (⋮)
                        </strong>{' '}
                        in the top-right corner.
                      </li>
                      <li className="leading-relaxed">
                        Tap{' '}
                        <strong className="font-bold text-[#F26B1D]">
                          &quot;Install app&quot;
                        </strong>{' '}
                        or{' '}
                        <strong className="font-bold text-[#F26B1D]">
                          &quot;Add to Home screen&quot;
                        </strong>
                        .
                      </li>
                      <li className="leading-relaxed">
                        Confirm by tapping <strong>Install</strong> to place the app on your mobile home screen.
                      </li>
                    </ol>
                  </>
                ) : isMac ? (
                  <>
                    <p className="font-extrabold text-[#F26B1D] uppercase tracking-wider text-[11px]">
                      Mac Safari / Chrome:
                    </p>
                    <ol className="space-y-2.5 text-[#2B2118] list-decimal list-inside">
                      <li className="leading-relaxed">
                        Click the <strong>Install</strong> icon in your browser&apos;s address bar (on the right edge).
                      </li>
                      <li className="leading-relaxed">
                        In Safari: Click <strong>File &gt; Add to Dock...</strong> from the top menu bar.
                      </li>
                      <li className="leading-relaxed">
                        Click <strong>Install</strong> to launch the app directly from your Dock or mobile device.
                      </li>
                    </ol>
                  </>
                ) : (
                  <>
                    <p className="font-extrabold text-[#F26B1D] uppercase tracking-wider text-[11px]">
                      Mobile or Desktop Browser:
                    </p>
                    <ol className="space-y-2.5 text-[#2B2118] list-decimal list-inside">
                      <li className="leading-relaxed">
                        On Mobile: Tap your browser menu (<strong>⋮</strong> or <strong>Share</strong>) and select{' '}
                        <strong className="text-[#F26B1D]">&quot;Install app&quot;</strong> or{' '}
                        <strong className="text-[#F26B1D]">&quot;Add to Home Screen&quot;</strong>.
                      </li>
                      <li className="leading-relaxed">
                        On Desktop: Click the <strong className="text-[#F26B1D]">Install App icon (⊕)</strong> on the right side of the address bar.
                      </li>
                      <li className="leading-relaxed">
                        Tap <strong>Install</strong> to save the menu app directly to your home screen.
                      </li>
                    </ol>
                  </>
                )}
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs font-extrabold transition cursor-pointer shadow-md shadow-orange-500/20"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
