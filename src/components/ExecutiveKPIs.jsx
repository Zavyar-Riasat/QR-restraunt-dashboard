import React from 'react';
import { formatPKR } from '../utils/currencyUtils';
import { Users, ArrowRight } from 'lucide-react';

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
    <div className="space-y-4">
      {/* 4 KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Sales */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="font-semibold text-slate-600">Sales</span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
            {formatPKR(grossVolume)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            Total gross revenue
          </p>
        </div>

        {/* KPI 2: Orders */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="font-semibold text-slate-600">Orders</span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
            {totalOrders}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            {activeOrders > 0 ? (
              <span className="text-amber-600 font-bold">{activeOrders} active now</span>
            ) : (
              'Total processed'
            )}
          </p>
        </div>

        {/* KPI 3: Menu Items */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="font-semibold text-slate-600">Menu Items</span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
            {itemCount} <span className="text-xs text-slate-400 font-sans font-normal">items</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            Catalog dishes
          </p>
        </div>

        {/* KPI 4: Customers Directory */}
        <div
          onClick={() => onNavigateToKhata && onNavigateToKhata('all')}
          className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-[#F26B1D]/40 transition cursor-pointer group"
          title="Click to view all registered customers"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 font-bold">
            <span className="flex items-center gap-1 text-[#2B2118] group-hover:text-[#F26B1D] transition">
              <span>Customers</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition text-[#F26B1D]" />
            </span>
            <Users className="w-4 h-4 text-[#F26B1D]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
            {totalCustomers}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium flex items-center justify-between">
            <span>Customer directory</span>
            <span className="underline group-hover:text-[#F26B1D] text-[10px]">View Details →</span>
          </p>
        </div>
      </div>
    </div>
  );
}
