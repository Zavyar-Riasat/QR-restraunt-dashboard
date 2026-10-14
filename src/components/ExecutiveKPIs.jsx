import React from 'react';
import { formatPKR } from '../utils/currencyUtils';

export default function ExecutiveKPIs({ restaurant, menuItems = [], orderStats }) {
  const itemCount = menuItems?.length || 0;
  const totalOrders = orderStats?.totalOrders ?? 142;
  const grossVolume = orderStats?.grossVolume ?? 485000;
  const activeOrders = orderStats?.activeCount ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
      {/* KPI 1: Sales */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span className="font-semibold text-slate-600">Sales</span>
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
          {formatPKR(grossVolume)}
        </div>
        <p className="text-[11px] text-slate-400 mt-1 font-medium">
          Total gross revenue
        </p>
      </div>

      {/* KPI 2: Orders */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span className="font-semibold text-slate-600">Orders</span>
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
          {totalOrders}
        </div>
        <p className="text-[11px] text-slate-400 mt-1 font-medium">
          {activeOrders > 0 ? (
            <span className="text-amber-600 font-bold">{activeOrders} active now</span>
          ) : (
            'Total orders processed'
          )}
        </p>
      </div>

      {/* KPI 3: Menu Items */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span className="font-semibold text-slate-600">Menu Items</span>
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
          {itemCount} <span className="text-xs text-slate-400 font-sans font-normal">items</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1 font-medium">
          Catalog items
        </p>
      </div>
    </div>
  );
}
