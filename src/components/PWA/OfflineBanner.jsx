import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { pwaService } from '../../services/pwaService';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showRestoredToast, setShowRestoredToast] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    return pwaService.subscribeNetworkStatus((online) => {
      setIsOnline(online);
      if (online) {
        setShowRestoredToast(true);
        const timer = setTimeout(() => {
          setShowRestoredToast(false);
        }, 4000);
        return () => clearTimeout(timer);
      } else {
        setShowRestoredToast(false);
      }
    });
  }, []);

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      const res = await fetch('/favicon.svg?t=' + Date.now(), { method: 'HEAD', cache: 'no-store' });
      if (res.ok) {
        setIsOnline(true);
        setShowRestoredToast(true);
      }
    } catch {
      setIsOnline(false);
    } finally {
      setIsChecking(false);
    }
  };

  // When connection was restored recently
  if (showRestoredToast && isOnline) {
    return (
      <div className="bg-emerald-600 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between shadow-md transition-all duration-300 animate-fadeIn shrink-0">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>Internet connection restored! DineHQ is now receiving live online orders.</span>
          </div>
          <button
            type="button"
            onClick={() => setShowRestoredToast(false)}
            className="text-white/80 hover:text-white text-xs underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  // When offline: Persistent high-contrast alert
  if (!isOnline) {
    return (
      <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white px-4 py-3 text-xs shadow-lg transition-all duration-300 animate-fadeIn shrink-0 border-b border-red-700">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <WifiOff className="w-4 h-4 text-white animate-pulse" />
            </div>
            <div>
              <p className="font-extrabold text-sm tracking-tight">
                No internet - new orders won't arrive
              </p>
              <p className="text-[11px] text-white/90">
                You are currently offline. Check your WiFi router or Ethernet connection. DineHQ will reconnect automatically.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualCheck}
              disabled={isChecking}
              className="px-3.5 py-1.5 rounded-xl bg-white text-red-700 hover:bg-red-50 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Checking...' : 'Check Connection'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
