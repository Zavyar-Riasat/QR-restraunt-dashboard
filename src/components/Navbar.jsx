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
} from 'lucide-react';

export default function Navbar({
  restaurant,
  allRestaurants = [],
  onSelectRestaurant,
  isLive,
  kitchenOpen = true,
  onToggleKitchenOpen,
  onOpenQR,
  onOpenPreview,
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
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/90 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand & Store Name / Switcher */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-600/20">
            <UtensilsCrossed className="w-5 h-5 text-white font-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-extrabold text-slate-900 text-lg tracking-tight">DineHQ</span>
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              {/* If user is Admin, show Restaurant Switcher selector */}
              {user?.role === 'admin' && allRestaurants.length > 1 ? (
                <div className="relative inline-flex items-center">
                  <select
                    value={restaurant?.id || ''}
                    onChange={(e) => onSelectRestaurant && onSelectRestaurant(e.target.value)}
                    className="text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-0.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer pr-6 appearance-none"
                    title="Switch active restaurant"
                  >
                    {allRestaurants.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-500 absolute right-1.5 pointer-events-none" />
                </div>
              ) : (
                <span className="text-xs font-bold text-slate-700">
                  {restaurant?.name || 'My Restaurant'}
                </span>
              )}

              <span className="text-slate-300 hidden sm:inline">•</span>

              {/* Persistent Kitchen Status Switch */}
              <button
                type="button"
                onClick={onToggleKitchenOpen}
                className={`hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border transition cursor-pointer ${
                  kitchenOpen
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                }`}
                title={kitchenOpen ? 'Click to Pause Kitchen Orders' : 'Click to Reopen Kitchen'}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${kitchenOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition"
              title="Open Admin User Provisioning Panel"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Admin Panel</span>
            </Link>
          )}

          {/* Quick Copy Menu Link */}
          <button
            onClick={handleCopyLink}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-bold border border-slate-200 transition cursor-pointer"
            title="Copy customer menu URL to share on WhatsApp"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copied ? 'Copied!' : 'Copy Menu URL'}</span>
          </button>

          {/* Live Customer Menu Button */}
          <button
            onClick={onOpenPreview}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer"
            title="Preview Customer Menu"
          >
            <span className="hidden sm:inline">View Menu</span>
            <span className="sm:hidden">Menu</span>
            <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>

          {/* User Profile & Sign Out */}
          <div className="flex items-center pl-1 sm:pl-2 border-l border-slate-200 gap-1.5">
            <div
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium"
              title={user?.email}
            >
              <User className="w-3 h-3 text-slate-400" />
              <span className="max-w-[120px] truncate">{user?.email || 'Manager'}</span>
            </div>

            <button
              onClick={handleSignOut}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-bold transition cursor-pointer border border-transparent hover:border-rose-200 flex items-center gap-1"
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
