import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  UtensilsCrossed,
  ExternalLink,
  Shield,
  LogOut,
  User,
  ChevronDown,
} from 'lucide-react';

export default function Navbar({
  restaurant,
  allRestaurants = [],
  onSelectRestaurant,
  _isLive,
  _kitchenOpen = true,
  onToggleKitchenOpen: _onToggleKitchenOpen,
  onOpenQR: _onOpenQR,
  onOpenPreview,
  onOpenPrinterSettings: _onOpenPrinterSettings,
  onOpenNewOrder: _onOpenNewOrder,
  onPrintSalesSummary: _onPrintSalesSummary,
  isPrintingSummary: _isPrintingSummary = false,
}) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

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

        {/* Right Action Controls (Top Navbar Row) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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

          {/* Live Customer Menu Button */}
          <button
            onClick={onOpenPreview}
            className="inline-flex items-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl bg-white hover:bg-[#FFF1E6] text-[#2B2118] text-xs font-bold border border-[#F0E4D7] shadow-2xs transition cursor-pointer whitespace-nowrap shrink-0"
            title="Preview Customer Menu"
          >
            <span>View Menu</span>
            <ExternalLink className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
          </button>

          {/* User Profile & Sign Out - Always kept compact so Logout never overflows */}
          <div className="flex items-center pl-1 sm:pl-2 border-l border-[#F0E4D7] gap-1.5 shrink-0">
            <div
              className="hidden sm:inline-flex items-center gap-1.5 h-8 sm:h-9 px-2.5 rounded-xl bg-[#FFF9F2] text-[#7A6A5C] text-xs font-medium border border-[#F0E4D7] whitespace-nowrap shrink-0"
              title={user?.email}
            >
              <User className="w-3 h-3 text-[#9E8E81] shrink-0" />
              <span className="max-w-[110px] truncate">{user?.email?.split('@')[0] || 'Manager'}</span>
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
