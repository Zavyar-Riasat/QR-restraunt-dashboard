import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
} from 'lucide-react';
import PrinterStatusBadge from './Printer/PrinterStatusBadge';

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
}) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand & Store Name / Switcher */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#F26B1D] to-[#F5A623] flex items-center justify-center shadow-md shadow-orange-500/20">
            <UtensilsCrossed className="w-5 h-5 text-white font-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-extrabold text-[#2B2118] text-lg tracking-tight">DineHQ</span>
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              {/* If user is Admin, show Restaurant Switcher selector */}
              {user?.role === 'admin' && allRestaurants.length > 1 ? (
                <div className="relative inline-flex items-center">
                  <select
                    value={restaurant?.id || ''}
                    onChange={(e) => onSelectRestaurant && onSelectRestaurant(e.target.value)}
                    className="text-xs font-bold text-[#2B2118] bg-[#FFF9F2] hover:bg-[#FFF1E6] px-2.5 py-0.5 rounded-lg border border-[#F0E4D7] focus:outline-none focus:ring-1 focus:ring-[#F26B1D] cursor-pointer pr-6 appearance-none"
                    title="Switch active restaurant"
                  >
                    {allRestaurants.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-[#7A6A5C] absolute right-1.5 pointer-events-none" />
                </div>
              ) : (
                <span className="text-xs font-bold text-[#7A6A5C]">
                  {restaurant?.name || 'My Restaurant'}
                </span>
              )}

              <span className="text-[#F0E4D7] hidden sm:inline">•</span>

              {/* Persistent Kitchen Status Switch */}
              <button
                type="button"
                onClick={onToggleKitchenOpen}
                className={`hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border transition cursor-pointer ${
                  kitchenOpen
                    ? 'bg-[#E7F6EC] text-[#1F9D55] border-[#C0E9CE] hover:bg-[#D5EFE0]'
                    : 'bg-[#FDECEC] text-[#E5484D] border-[#F9C3C5] hover:bg-[#FCD9DA]'
                }`}
                title={kitchenOpen ? 'Click to Pause Kitchen Orders' : 'Click to Reopen Kitchen'}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${kitchenOpen ? 'bg-[#1F9D55] animate-pulse' : 'bg-[#E5484D]'}`}></span>
                <span>{kitchenOpen ? 'Kitchen Open' : 'Kitchen Paused'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Admin Panel Shortcut (if user is admin) */}
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EAF1FF] hover:bg-[#D8E6FF] text-[#2F6FED] text-xs font-bold border border-[#BCD4FD] transition"
              title="Open Admin User Provisioning Panel"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Admin Panel</span>
            </Link>
          )}

          {/* Receipt Printer Status & Setup Shortcut */}
          {onOpenPrinterSettings && (
            <div className="hidden sm:block">
              <PrinterStatusBadge onOpenSettings={onOpenPrinterSettings} />
            </div>
          )}

          {/* Quick Copy Menu Link */}
          <button
            onClick={handleCopyLink}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#FFF1E6] text-[#2B2118] text-xs font-bold border border-[#F0E4D7] transition cursor-pointer"
            title="Copy customer menu URL to share with customers"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#1F9D55]" /> : <Copy className="w-3.5 h-3.5 text-[#7A6A5C]" />}
            <span>{copied ? 'Copied!' : 'Copy Menu URL'}</span>
          </button>

          {/* Big "+ New Order" Button */}
          {onOpenNewOrder && (
            <button
              id="new-order-navbar-btn"
              type="button"
              onClick={onOpenNewOrder}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#F26B1D] to-[#F5A623] hover:from-[#E05A0C] hover:to-[#E59512] active:scale-95 text-white text-xs sm:text-sm font-black shadow-md shadow-orange-500/25 transition cursor-pointer border border-amber-300/30 shrink-0"
              title="Open In-Store POS to place a new Dine-in, Takeaway, or Delivery order"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>New Order</span>
            </button>
          )}

          {/* Live Customer Menu Button */}
          <button
            onClick={onOpenPreview}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#FFF1E6] text-[#2B2118] text-xs font-bold border border-[#F0E4D7] shadow-2xs transition cursor-pointer shrink-0"
            title="Preview Customer Menu"
          >
            <span>View Menu</span>
            <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>

          {/* User Profile & Sign Out */}
          <div className="flex items-center pl-1 sm:pl-2 border-l border-[#F0E4D7] gap-1.5">
            <div
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#FFF9F2] text-[#7A6A5C] text-xs font-medium border border-[#F0E4D7]"
              title={user?.email}
            >
              <User className="w-3 h-3 text-[#9E8E81]" />
              <span className="max-w-[120px] truncate">{user?.email || 'Manager'}</span>
            </div>

            <button
              onClick={handleSignOut}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white hover:bg-[#FEE4E2] text-[#7A6A5C] hover:text-[#D92D20] text-xs font-bold transition cursor-pointer border border-[#F0E4D7] hover:border-[#FECDCA] flex items-center gap-1"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
