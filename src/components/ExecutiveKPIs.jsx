import React from 'react';
import { formatPKR } from '../utils/currencyUtils';
import { Users, ArrowRight, Banknote, ShoppingBag, Utensils } from 'lucide-react';

export default function ExecutiveKPIs({
  restaurant: _restaurant,
  menuItems = [],
  orderStats,
  totalCustomers = 0,
  onNavigateToKhata,
}) {
  const itemCount = menuItems?.length || 0;
  const totalOrders = orderStats?.totalOrders ?? 142;
  const grossVolume = orderStats?.grossVolume ?? 485000;
  const activeOrders = orderStats?.activeCount ?? 0;

  return (
    <div>
      {/* 4 KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* KPI 1: Sales */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white border border-[#F0E4D7] shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#7A6A5C] mb-1">
            <span className="font-bold text-[#5C4D42]">Sales</span>
            <span className="w-6 h-6 rounded-lg bg-[#FFF1E6] text-[#F26B1D] flex items-center justify-center shrink-0">
              <Banknote className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg sm:text-2xl font-extrabold text-[#2B2118] font-mono tracking-tight truncate">
            {formatPKR(grossVolume)}
          </div>
          <p className="text-[11px] text-[#9E8E81] mt-1 font-medium truncate">
            Total gross revenue
          </p>
        </div>

        {/* KPI 2: Orders */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white border border-[#F0E4D7] shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#7A6A5C] mb-1">
            <span className="font-bold text-[#5C4D42]">Orders</span>
            <span className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg sm:text-2xl font-extrabold text-[#2B2118] font-mono tracking-tight">
            {totalOrders}
          </div>
          <p className="text-[11px] text-[#9E8E81] mt-1 font-medium truncate">
            {activeOrders > 0 ? (
              <span className="text-[#F26B1D] font-bold">{activeOrders} active now</span>
            ) : (
              'Total processed'
            )}
          </p>
        </div>

        {/* KPI 3: Menu Items */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white border border-[#F0E4D7] shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#7A6A5C] mb-1">
            <span className="font-bold text-[#5C4D42]">Menu Items</span>
            <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Utensils className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg sm:text-2xl font-extrabold text-[#2B2118] font-mono tracking-tight">
            {itemCount} <span className="text-xs text-[#9E8E81] font-sans font-normal">items</span>
          </div>
          <p className="text-[11px] text-[#9E8E81] mt-1 font-medium truncate">
            Catalog dishes
          </p>
        </div>

        {/* KPI 4: Customers Directory */}
        <div
          onClick={() => onNavigateToKhata && onNavigateToKhata('all')}
          className="p-3.5 sm:p-5 rounded-2xl bg-white border border-[#F0E4D7] shadow-2xs hover:shadow-xs hover:border-[#F26B1D]/40 transition cursor-pointer group flex flex-col justify-between"
          title="Click to view all registered customers"
        >
          <div className="flex items-center justify-between text-xs mb-1 font-bold">
            <span className="flex items-center gap-1 text-[#2B2118] group-hover:text-[#F26B1D] transition">
              <span>Customers</span>
            </span>
            <span className="w-6 h-6 rounded-lg bg-[#FFF1E6] text-[#F26B1D] flex items-center justify-center shrink-0">
              <Users className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg sm:text-2xl font-extrabold text-[#2B2118] font-mono tracking-tight">
            {totalCustomers}
          </div>
          <p className="text-[11px] text-[#F26B1D] mt-1 font-bold flex items-center gap-1 truncate">
            <span className="truncate">View Directory</span>
            <ArrowRight className="w-3 h-3 shrink-0 group-hover:translate-x-0.5 transition" />
          </p>
        </div>
      </div>
    </div>
  );
}
