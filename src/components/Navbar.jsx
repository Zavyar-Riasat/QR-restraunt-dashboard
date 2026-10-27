import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAppBaseUrl } from '../config/appConfig.js';
import {
  UtensilsCrossed,
  ExternalLink,
  ShieldCheck,
  Database,
  Copy,
  Check,
  Shield,
  LogOut,
  User,
  ChevronDown,
  Store,
  Plus,
  Printer,
  FileText,
} from 'lucide-react';
import PrinterStatusBadge from './Printer/PrinterStatusBadge';
import InstallAppButton from './PWA/InstallAppButton';

export default function Navbar({
  restaurant,
  allRestaurants = [],
  onSelectRestaurant,
  isLive,
  kitchenOpen = true,
  onToggleKitchenOpen,
  onOpenQR,
  onOpenPreview,
  onOpenPrinterSettings,
  onOpenNewOrder,
  onPrintSalesSummary,
  isPrintingSummary = false,
}) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [copied, setCopied] = useState(false);

  const origin = getAppBaseUrl();
  const menuUrl = `${origin}/${restaurant?.slug || 'burgersmoke'}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(menuUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-[#F0E4D7] shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand & Store Name / Switcher */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-[#F26B1D] to-[#F5A623] flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
            <UtensilsCrossed className="w-4 h-4 sm:w-5 sm:h-5 text-white font-black" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-extrabold text-[#2B2118] text-base sm:text-lg tracking-tight leading-tight">Dineflow</span>
            </div>

            <div className="flex items-center gap-1 mt-0.5 min-w-0">
              {/* Restaurant Switcher selector */}
              {allRestaurants.length > 1 ? (
                <div className="relative inline-flex items-center max-w-[110px] xs:max-w-[140px] sm:max-w-[220px]">
                  <select
                    value={restaurant?.id || ''}
                    onChange={(e) => onSelectRestaurant && onSelectRestaurant(e.target.value)}
                    className="text-[11px] sm:text-xs font-bold text-[#2B2118] bg-[#FFF9F2] hover:bg-[#FFF1E6] pl-2 pr-5 py-0.5 rounded-lg border border-[#F0E4D7] focus:outline-none focus:ring-1 focus:ring-[#F26B1D] cursor-pointer appearance-none truncate w-full"
                    title="Switch active restaurant"
                  >
                    {allRestaurants.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-[#7A6A5C] absolute right-1 pointer-events-none" />
                </div>
              ) : (
                <span className="text-[11px] sm:text-xs font-bold text-[#7A6A5C] leading-tight truncate max-w-[110px] xs:max-w-[150px] sm:max-w-[220px] block">
                  {restaurant?.name || 'My Restaurant'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Admin Panel Shortcut (if user is admin) */}
          {user?.role === 'admin' && (
            <Link
              to="/superadmin"
              className="h-8 sm:h-9 inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 rounded-xl bg-[#EAF1FF] hover:bg-[#D8E6FF] text-[#2F6FED] text-xs font-bold border border-[#BCD4FD] transition whitespace-nowrap shrink-0 shadow-2xs"
              title="Open Admin User Provisioning Panel"
            >
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">SuperAdmin</span>
            </Link>
          )}

          {/* Receipt Printer Status & Setup Shortcut */}
          {onOpenPrinterSettings && (
            <div className="hidden md:inline-flex items-center shrink-0">
              <PrinterStatusBadge onOpenSettings={onOpenPrinterSettings} />
            </div>
          )}

          {/* Quick Copy Menu Link (on wide screens) */}
          <button
            onClick={handleCopyLink}
            className="hidden xl:inline-flex items-center gap-1.5 h-9 px-2.5 rounded-xl bg-white hover:bg-[#FFF1E6] text-[#2B2118] text-xs font-bold border border-[#F0E4D7] transition cursor-pointer whitespace-nowrap shrink-0 shadow-2xs"
            title="Copy customer menu URL to share with customers"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#1F9D55] shrink-0" /> : <Copy className="w-3.5 h-3.5 text-[#7A6A5C] shrink-0" />}
            <span>{copied ? 'Copied!' : 'Copy Menu URL'}</span>
          </button>

          {/* PWA Install Button (hidden once installed) */}
          <InstallAppButton />

          {/* Primary "Reports & History" (Executive PDF Report) Button */}
          {onPrintSalesSummary && (
            <button
              id="print-today-summary-navbar-btn"
              type="button"
              disabled={isPrintingSummary}
              onClick={onPrintSalesSummary}
              className="h-8 sm:h-9 inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold border border-slate-800 transition cursor-pointer shadow-2xs whitespace-nowrap shrink-0 disabled:opacity-50"
              title="View Sales Reports & Order History"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">
                {isPrintingSummary ? 'Loading...' : 'Reports'}
              </span>
            </button>
          )}

          {/* Big "+ New Order" Button */}
          {onOpenNewOrder && (
            <button
              id="new-order-navbar-btn"
              type="button"
              onClick={onOpenNewOrder}
              className="h-8 sm:h-9 inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 rounded-xl bg-gradient-to-r from-[#F26B1D] to-[#F5A623] hover:from-[#E05A0C] hover:to-[#E59512] active:scale-95 text-white text-xs sm:text-sm font-black shadow-md shadow-orange-500/25 transition cursor-pointer border border-amber-300/30 whitespace-nowrap shrink-0"
              title="Open In-Store POS to place a new Dine-in, Takeaway, or Delivery order"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3] shrink-0" />
              <span className="hidden sm:inline">New Order</span>
              <span className="sm:hidden">Order</span>
            </button>
          )}

          {/* Live Customer Menu Button */}
          <button
            onClick={onOpenPreview}
            className="hidden lg:inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white hover:bg-[#FFF1E6] text-[#2B2118] text-xs font-bold border border-[#F0E4D7] shadow-2xs transition cursor-pointer whitespace-nowrap shrink-0"
            title="Preview Customer Menu"
          >
            <span>View Menu</span>
            <ExternalLink className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
          </button>

          {/* User Profile & Sign Out - Always kept compact so Logout never overflows */}
          <div className="flex items-center pl-1 sm:pl-2 border-l border-[#F0E4D7] gap-1 shrink-0">
            <div
              className="hidden xl:inline-flex items-center gap-1.5 h-9 px-2.5 rounded-xl bg-[#FFF9F2] text-[#7A6A5C] text-xs font-medium border border-[#F0E4D7] whitespace-nowrap shrink-0"
              title={user?.email}
            >
              <User className="w-3 h-3 text-[#9E8E81] shrink-0" />
              <span className="max-w-[90px] truncate">{user?.email?.split('@')[0] || 'Manager'}</span>
            </div>

            <button
              onClick={handleSignOut}
              className="h-8 sm:h-9 inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 rounded-xl bg-white hover:bg-[#FEE4E2] text-[#7A6A5C] hover:text-[#D92D20] text-xs font-bold transition cursor-pointer border border-[#F0E4D7] hover:border-[#FECDCA] whitespace-nowrap shrink-0 shadow-2xs"
              title="Sign out of Dineflow"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
