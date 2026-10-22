import React from 'react';
import { formatPKR, formatPaisa, formatPhone, toRupees } from '../utils/currencyUtils';
import { TrendingDown, Users, AlertTriangle, ArrowRight, DollarSign, Phone } from 'lucide-react';

export default function ExecutiveKPIs({
  restaurant,
  menuItems = [],
  orderStats,
  totalReceivablePaisa = 0,
  customersWithBalanceCount = 0,
  topOverdueCustomers = [],
  onNavigateToKhata,
  onReceivePayment,
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

        {/* KPI 4: Total Receivable (Udhaar / Khata) */}
        <div
          onClick={() => onNavigateToKhata && onNavigateToKhata('has_balance')}
          className="p-4 sm:p-5 rounded-2xl bg-white border border-red-200/90 shadow-2xs hover:shadow-xs hover:border-red-400 transition cursor-pointer group"
          title="Click to view all customers with balance due"
        >
          <div className="flex items-center justify-between text-xs text-red-600 mb-1.5 font-bold">
            <span className="flex items-center gap-1">
              <span>Total Receivable (Rs.)</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition text-red-500" />
            </span>
            <TrendingDown className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-red-600 font-mono tracking-tight">
            {formatPaisa(totalReceivablePaisa)}
          </div>
          <p className="text-[11px] text-red-700/80 mt-1 font-semibold flex items-center justify-between">
            <span>{customersWithBalanceCount} account(s) pending</span>
            <span className="underline group-hover:text-red-900 text-[10px]">View Khata →</span>
          </p>
        </div>
      </div>

      {/* Top 5 Overdue Customers Widget (If any exist) */}
      {topOverdueCustomers && topOverdueCustomers.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-amber-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="font-extrabold text-xs sm:text-sm text-[#2B2118] uppercase tracking-wider">
                Top Overdue Customers ({topOverdueCustomers.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToKhata && onNavigateToKhata('overdue')}
              className="text-xs font-bold text-[#F26B1D] hover:underline cursor-pointer"
            >
              View All Overdue →
            </button>
          </div>

          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden bg-white text-xs">
            {topOverdueCustomers.slice(0, 5).map((cust) => (
              <div
                key={cust.phone}
                className="p-2.5 sm:p-3 flex items-center justify-between gap-3 hover:bg-amber-50/40 transition flex-wrap"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{cust.name}</span>
                    <span className="font-mono text-slate-500 text-[11px]">
                      {formatPhone(cust.phone)}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-red-100 text-red-800 text-[9px] font-black uppercase tracking-wider">
                      Overdue
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {cust.due_date ? `Due Date: ${new Date(cust.due_date).toLocaleDateString('en-PK')}` : 'Immediate payment requested'}
                    {cust.total_orders_count > 0 && ` • ${cust.total_orders_count} past orders`}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Balance</span>
                    <span className="font-mono font-black text-sm text-red-600">
                      {formatPKR(cust.balance_due)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {cust.phone && (
                      <a
                        href={`tel:+${cust.phone}`}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                        title="Call customer"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => onReceivePayment && onReceivePayment(cust)}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Receive</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
