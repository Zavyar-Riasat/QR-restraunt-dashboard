import React, { useState, useEffect } from 'react';
import { BellRing } from 'lucide-react';
import { pwaService } from '../../services/pwaService';

export default function NotificationPromptBanner() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !pwaService.isNotificationSupported()) {
      return;
    }

    const dismissedUntil = localStorage.getItem('dinehq_notif_prompt_dismissed');
    const isDismissed = dismissedUntil && Date.now() < parseInt(dismissedUntil, 10);

    if (Notification.permission === 'default' && !isDismissed) {
      // Delay slightly so the user sees their dashboard first
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!showPrompt) return null;

  const handleEnable = async () => {
    setIsEnabling(true);
    try {
      const perm = await pwaService.requestNotificationPermission();
      if (perm === 'granted') {
        setShowPrompt(false);
      } else {
        setShowPrompt(false);
      }
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Snooze for 7 days
    localStorage.setItem(
      'dinehq_notif_prompt_dismissed',
      String(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );
  };

  return (
    <div className="bg-gradient-to-r from-[#FFF9F2] via-white to-[#FFF9F2] border-b border-[#F0E4D7] px-4 py-3 text-xs shadow-xs animate-fadeIn shrink-0">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-[#FFF1E6] text-[#F26B1D] flex items-center justify-center shrink-0 shadow-2xs border border-[#FCD8BF]">
            <BellRing className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <p className="font-extrabold text-sm text-[#2B2118] tracking-tight">
              Enable Background Order Alerts & Sound Chimes
            </p>
            <p className="text-[#7A6A5C] text-[11px]">
              Never miss a new order even when working in other tabs, spreadsheets, or apps.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="px-3 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
          >
            Maybe Later
          </button>
          <button
            type="button"
            id="pwa-enable-notifs-btn"
            onClick={handleEnable}
            disabled={isEnabling}
            className="px-4 py-1.5 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-orange-500/20 disabled:opacity-50"
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>{isEnabling ? 'Enabling...' : 'Enable Notifications'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
