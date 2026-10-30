import React, { useState, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Plus,
  QrCode,
  Users,
  Trash2,
  Move,
  CheckCircle,
  Copy,
  Check,
  X,
  Printer,
  ShoppingBag,
  Download,
  Loader2,
  Receipt,
  Phone,
  Mail,
  Clock,
  ChevronRight,
  Utensils,
} from 'lucide-react';
import { tableService, TABLE_STATUS } from '../../services/tableService';
import { orderService } from '../../services/orderService';
import { authService } from '../../services/authService';
import { formatPKR } from '../../utils/currencyUtils';
import { downloadAllTableQrsPdf } from '../../utils/tableQrPdfGenerator';

export default function TableManager({
  restaurant,
  orders = [],
  onOpenPosForTable,
  currentUser,
}) {
  const userRole = String(currentUser?.role || 'owner').toLowerCase();
  const canManageLayout = userRole === 'owner' || userRole === 'manager' || userRole === 'admin';
  const isWaiter = userRole === 'waiter';
  const canViewWaiterRecords =
    !isWaiter && (userRole === 'owner' || userRole === 'manager' || userRole === 'cashier' || userRole === 'admin');

  const [tables, setTables] = useState(() => {
    return tableService.getTables(restaurant?.id || 'rest-101');
  });

  useEffect(() => {
    const restId = restaurant?.id || 'rest-101';
    setTables(tableService.getTables(restId));

    const handleTablesUpdated = (e) => {
      if (!e.detail?.restaurantId || e.detail.restaurantId === restId) {
        setTables(tableService.getTables(restId));
      }
    };
    window.addEventListener('dinehq_tables_updated', handleTablesUpdated);
    return () => window.removeEventListener('dinehq_tables_updated', handleTablesUpdated);
  }, [restaurant?.id]);

  const [activeSectionFilter, setActiveSectionFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [movingTable, setMovingTable] = useState(null); // source table being moved
  const [qrModalTable, setQrModalTable] = useState(null);
  const [copiedTableId, setCopiedTableId] = useState(null);
  const [isExportingAllPdf, setIsExportingAllPdf] = useState(false);

  // Waiter Roster & Full Waiter Details Modal State
  const restaurantWaiters = useMemo(
    () => authService.getRestaurantWaiters(restaurant?.slug, restaurant?.id, restaurant?.name),
    [restaurant?.slug, restaurant?.id, restaurant?.name]
  );
  const [selectedWaiterModal, setSelectedWaiterModal] = useState(null);
  const [selectedWaiterFilter, setSelectedWaiterFilter] = useState('all');

  // Occupy Table Modal State (Waiter / Floor Staff)
  const [occupyingTable, setOccupyingTable] = useState(null);
  const [occupyGuestCount, setOccupyGuestCount] = useState(2);
  const [occupyGuestName, setOccupyGuestName] = useState('');
  const [occupyNote, setOccupyNote] = useState('');
  const [occupyWaiterId, setOccupyWaiterId] = useState('');

  // Form states
  const [formNumber, setFormNumber] = useState('');
  const [formName, setFormName] = useState('');
  const [formCapacity, setFormCapacity] = useState('4');
  const [formSection, setFormSection] = useState('Main Hall');
  const [targetMoveTableNum, setTargetMoveTableNum] = useState('');

  // Live status tables
  const liveTables = useMemo(() => {
    return tableService.getTablesWithLiveStatus(restaurant?.id || 'rest-101', orders);
  }, [restaurant?.id, orders, tables]);

  // Unique sections
  const sections = useMemo(() => {
    const set = new Set();
    liveTables.forEach((t) => {
      if (t.section) set.add(t.section);
    });
    return Array.from(set);
  }, [liveTables]);

  const filteredTables = useMemo(() => {
    if (activeSectionFilter === 'all') return liveTables;
    return liveTables.filter((t) => t.section === activeSectionFilter);
  }, [liveTables, activeSectionFilter]);

  // Statistics
  const freeCount = liveTables.filter((t) => t.status === TABLE_STATUS.FREE).length;
  const occupiedCount = liveTables.filter((t) => t.status === TABLE_STATUS.OCCUPIED).length;
  const pendingCount = liveTables.filter((t) => t.status === TABLE_STATUS.BILL_PENDING).length;

  const handleOpenAddModal = () => {
    setEditingTable(null);
    setFormNumber(String(tables.length + 1));
    setFormName(`Table ${tables.length + 1}`);
    setFormCapacity('4');
    setFormSection(sections[0] || 'Main Hall');
    setIsAddModalOpen(true);
  };



  const handleSaveTable = (e) => {
    e.preventDefault();
    const restId = restaurant?.id || 'rest-101';

    if (editingTable) {
      tableService.updateTable(restId, editingTable.id, {
        table_number: formNumber.trim(),
        name: formName.trim(),
        capacity: parseInt(formCapacity, 10) || 4,
        section: formSection.trim(),
      });
    } else {
      tableService.addTable(restId, {
        table_number: formNumber.trim(),
        name: formName.trim(),
        capacity: parseInt(formCapacity, 10) || 4,
        section: formSection.trim(),
      });
    }

    setTables(tableService.getTables(restId));
    setIsAddModalOpen(false);
  };

  const handleDeleteTable = (tableId) => {
    if (window.confirm('Are you sure you want to remove this table?')) {
      const restId = restaurant?.id || 'rest-101';
      const updated = tableService.deleteTable(restId, tableId);
      setTables(updated);
    }
  };

  const handleCopyQrLink = (tbl) => {
    const url = tableService.getTableQrUrl(restaurant, tbl.table_number);
    navigator.clipboard.writeText(url);
    setCopiedTableId(tbl.id);
    setTimeout(() => setCopiedTableId(null), 2000);
  };

  const handleMarkTableOrderPaidByWaiter = (tbl, activeOrder) => {
    if (!activeOrder?.id) return;
    const restId = restaurant?.id || 'rest-101';
    const waiterDetails =
      currentUser?.role === 'waiter'
        ? authService.resolveWaiterDetails(currentUser.name, restaurant?.slug, restId)
        : tbl?.waiter_details ||
          authService.resolveWaiterDetails(activeOrder, restaurant?.slug, restId);
    orderService.markOrderPaidByWaiter(restId, activeOrder.id, waiterDetails, tbl?.table_number);
    setTables(tableService.getTables(restId));
  };

  const handleCloseTable = (tbl) => {
    if (tbl.activeOrder) {
      const isPaid = Boolean(
        tbl.activeOrder.payment_status === 'paid' &&
          (tbl.activeOrder.explicit_paid || tbl.activeOrder.status === 'completed')
      );
      if (!isPaid) {
        window.alert(
          `Order #${tbl.activeOrder.id} cannot be completed until it is marked as PAID! Please mark the bill as Paid first.`
        );
        return;
      }
    }
    const confirmMsg = tbl.activeOrder
      ? `Close Table ${tbl.table_number} and mark order completed?`
      : `Mark Table ${tbl.table_number} as Free and ready for the next guests?`;
    if (window.confirm(confirmMsg)) {
      const restId = restaurant?.id || 'rest-101';
      tableService.closeTable(restId, tbl.table_number, orderService);
      setTables(tableService.getTables(restId));
    }
  };

  const getTableAssignedWaiter = (tbl) => {
    if (!tbl || tbl.status === TABLE_STATUS.FREE) return null;
    if (tbl.waiter_details && tbl.waiter_details.name) {
      return authService.resolveWaiterDetails(tbl.waiter_details.name, restaurant?.slug, restaurant?.id);
    }
    if (tbl.activeOrder) {
      return authService.resolveWaiterDetails(tbl.activeOrder, restaurant?.slug, restaurant?.id);
    }
    if (tbl.occupied_by) {
      return authService.resolveWaiterDetails(tbl.occupied_by, restaurant?.slug, restaurant?.id);
    }
    return null;
  };

  const isTableLockedForCurrentUser = (tbl) => {
    if (!isWaiter || !tbl || tbl.status === TABLE_STATUS.FREE) return false;
    const assignedW = getTableAssignedWaiter(tbl);
    if (!assignedW) return false;
    const myWaiter = authService.resolveWaiterDetails(
      currentUser?.name || currentUser?.email || '',
      restaurant?.slug,
      restaurant?.id
    );
    return (
      assignedW.staff_code !== myWaiter.staff_code &&
      assignedW.name.toLowerCase() !== myWaiter.name.toLowerCase()
    );
  };

  const handleOpenOccupyModal = (tbl) => {
    if (tbl.status !== TABLE_STATUS.FREE) {
      const assignedW = getTableAssignedWaiter(tbl);
      window.alert(
        `Table ${tbl.table_number} is already occupied by ${assignedW?.name || tbl.occupied_by || 'a waiter'} (${assignedW?.staff_code || 'WTR'}). Another waiter cannot occupy this table until it is freed.`
      );
      return;
    }
    setOccupyingTable(tbl);
    setOccupyGuestCount(tbl.capacity || 2);
    setOccupyGuestName('');
    setOccupyNote('');
    if (isWaiter) {
      const myWaiter = authService.resolveWaiterDetails(
        currentUser?.name || currentUser?.email || '',
        restaurant?.slug,
        restaurant?.id
      );
      setOccupyWaiterId(myWaiter?.id || restaurantWaiters[0]?.id || '');
    } else {
      const tblNum = parseInt(String(tbl?.table_number || '1').replace(/\D/g, ''), 10) || 1;
      const defaultW = restaurantWaiters[(tblNum - 1) % restaurantWaiters.length] || restaurantWaiters[0];
      setOccupyWaiterId(defaultW?.id || '');
    }
  };

  const handleConfirmOccupyTable = (e) => {
    e.preventDefault();
    if (!occupyingTable) return;
    const restId = restaurant?.id || 'rest-101';
    const liveMatch = liveTables.find((t) => t.id === occupyingTable.id);
    if (liveMatch && liveMatch.status !== TABLE_STATUS.FREE) {
      const assignedW = getTableAssignedWaiter(liveMatch);
      window.alert(
        `Table ${occupyingTable.table_number} is already occupied by ${assignedW?.name || liveMatch.occupied_by || 'another waiter'}. Another waiter cannot occupy this table!`
      );
      setOccupyingTable(null);
      return;
    }
    const assignedWaiter =
      restaurantWaiters.find((w) => w.id === occupyWaiterId) ||
      restaurantWaiters[0];
    const res = tableService.occupyTable(restId, occupyingTable.id, {
      guestCount: occupyGuestCount,
      guestName: occupyGuestName,
      note: occupyNote,
      occupiedBy: assignedWaiter?.name || currentUser?.name || (isWaiter ? 'Hamza Ali' : 'Staff'),
      waiterDetails: assignedWaiter,
    });
    if (res?.error) {
      window.alert(res.message);
      return;
    }
    setTables(tableService.getTables(restId));
    setOccupyingTable(null);
  };

  const handleExecuteMoveTable = () => {
    if (!movingTable || !targetMoveTableNum) return;
    const restId = restaurant?.id || 'rest-101';
    tableService.moveTable(
      restId,
      movingTable.table_number,
      targetMoveTableNum,
      orderService
    );
    setMovingTable(null);
    setTargetMoveTableNum('');
    setTables(tableService.getTables(restId));
  };

  const handleDownloadAllTableQrs = async () => {
    try {
      setIsExportingAllPdf(true);
      await downloadAllTableQrsPdf({
        restaurant,
        tables: liveTables,
        origin: typeof window !== 'undefined' ? window.location.origin : undefined,
      });
    } catch (err) {
      console.error('Failed to export all table QRs PDF:', err);
    } finally {
      setIsExportingAllPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Metrics Bar */}
      <div className="bg-white p-5 rounded-3xl border border-[#F0E4D7] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading font-black text-lg sm:text-xl text-[#2B2118]">
              Dining Tables & Floor Management
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold border border-purple-200">
              {liveTables.length} Tables
            </span>
          </div>
          <p className="text-xs text-[#7A6A5C] mt-1">
            Organize seating, track live occupied tables, generate table QR codes, and take in-store orders.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Metrics */}
          <div className="flex items-center gap-2 bg-[#FFF9F2] px-3 py-1.5 rounded-2xl border border-[#F0E4D7] text-xs font-bold">
            <span className="flex items-center gap-1 text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {freeCount} Free
            </span>
            <span className="text-[#F0E4D7]">•</span>
            <span className="flex items-center gap-1 text-red-700">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {occupiedCount} Occupied
            </span>
            {pendingCount > 0 && (
              <>
                <span className="text-[#F0E4D7]">•</span>
                <span className="flex items-center gap-1 text-amber-700">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  {pendingCount} Bill Pending
                </span>
              </>
            )}
          </div>

          {canManageLayout && (
            <>
              <button
                type="button"
                disabled={isExportingAllPdf || liveTables.length === 0}
                onClick={handleDownloadAllTableQrs}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-98 text-white text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                title="Download all table QR standee cards as a single PDF"
              >
                {isExportingAllPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                ) : (
                  <Download className="w-4 h-4 text-amber-400" />
                )}
                <span>{isExportingAllPdf ? 'Generating PDF...' : 'Download All Table QRs (PDF)'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAddModal}
                className="px-4 py-2 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] active:scale-98 text-white text-xs sm:text-sm font-bold shadow-sm shadow-orange-500/20 transition cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Add Table</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sections Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveSectionFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
            activeSectionFilter === 'all'
              ? 'bg-[#2B2118] text-white shadow-xs'
              : 'bg-white text-[#7A6A5C] hover:text-[#2B2118] border border-[#F0E4D7]'
          }`}
        >
          All Sections ({liveTables.length})
        </button>
        {sections.map((sec) => {
          const count = liveTables.filter((t) => t.section === sec).length;
          return (
            <button
              key={sec}
              type="button"
              onClick={() => setActiveSectionFilter(sec)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                activeSectionFilter === sec
                  ? 'bg-[#F26B1D] text-white shadow-xs'
                  : 'bg-white text-[#7A6A5C] hover:text-[#2B2118] border border-[#F0E4D7]'
              }`}
            >
              {sec} ({count})
            </button>
          );
        })}
      </div>

      {/* Table Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
        {filteredTables.map((tbl) => {
          const isOccupied = tbl.status === TABLE_STATUS.OCCUPIED;
          const isPending = tbl.status === TABLE_STATUS.BILL_PENDING;
          const activeOrder = tbl.activeOrder;

          return (
            <div
              key={tbl.id}
              className={`p-4 rounded-3xl border transition flex flex-col justify-between self-start shadow-xs ${
                isOccupied
                  ? 'bg-red-50/60 border-red-200 ring-1 ring-red-300'
                  : isPending
                  ? 'bg-amber-50/60 border-amber-200 ring-1 ring-amber-300'
                  : 'bg-white border-[#F0E4D7] hover:border-[#F26B1D]'
              }`}
            >
              {/* Card Header: Table # and Live Status */}
              <div>
                <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#F0E4D7]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-black text-base sm:text-lg text-[#2B2118]">
                        Table {tbl.table_number}
                      </span>
                      <span className="text-[10px] text-[#7A6A5C] bg-[#FFF9F2] px-2 py-0.5 rounded-full border border-[#F0E4D7] font-semibold">
                        {tbl.section}
                      </span>
                    </div>
                    <div className="text-xs text-[#7A6A5C] flex items-center gap-1.5 mt-0.5">
                      <Users className="w-3.5 h-3.5 text-[#9E8E81]" />
                      <span>{tbl.capacity} Seats</span>
                    </div>
                  </div>

                  {/* Status Indicator Badge */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      isOccupied
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : isPending
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isOccupied ? 'bg-red-600 animate-pulse' : isPending ? 'bg-amber-600' : 'bg-emerald-600'
                      }`}
                    />
                    <span>{isOccupied ? 'Occupied' : isPending ? 'Bill Pending' : 'Free'}</span>
                  </span>
                </div>

                {/* Active Order or Manual Occupancy Details (if Occupied or Bill Pending) */}
                {activeOrder ? (
                  <div className="my-3 p-3 rounded-2xl bg-white border border-[#F0E4D7] space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-mono font-bold text-[#2B2118]">
                      <span>Order #{activeOrder.id}</span>
                      <span className="text-[#F26B1D] text-sm">
                        {formatPKR(activeOrder.total_payable)}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#7A6A5C] truncate">
                      👤 {activeOrder.customer_name || tbl.guest_name || 'Dine-in Guest'}
                      {tbl.guest_count ? ` • 👥 ${tbl.guest_count} Guests` : ''}
                    </div>
                    {tbl.occupancy_note && (
                      <div className="text-[11px] text-amber-800 bg-amber-50/80 px-2 py-1 rounded-lg border border-amber-200/70 truncate">
                        📝 {tbl.occupancy_note}
                      </div>
                    )}
                    {/* Waiter Order & Cash Collection Full Details Record */}
                    {(() => {
                      const wDetails =
                        tbl.waiter_details ||
                        authService.resolveWaiterDetails(activeOrder, restaurant?.slug, restaurant?.id);
                      const collectedDetails = activeOrder.waiter_collected_details || wDetails;
                      return (
                        <div className="p-2.5 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-1.5 text-[10px]">
                          <div className="flex items-center justify-between gap-1 pb-1 border-b border-[#F0E4D7]/80">
                            <div className="font-extrabold text-[#2B2118] flex items-center gap-1 truncate">
                              <span>👨‍🍳 {wDetails.name}</span>
                              <span className="px-1.5 py-0.2 rounded bg-orange-100 text-[#D95A12] font-mono text-[9px]">
                                {wDetails.staff_code}
                              </span>
                            </div>
                            {canViewWaiterRecords && (
                              <button
                                type="button"
                                onClick={() => setSelectedWaiterModal(wDetails)}
                                className="text-[9px] font-extrabold text-[#F26B1D] hover:underline shrink-0 cursor-pointer"
                              >
                                Full Details →
                              </button>
                            )}
                          </div>
                          <div className="text-[#7A6A5C] flex items-center justify-between gap-1">
                            <span>📞 {wDetails.phone}</span>
                            <span className="truncate">{wDetails.role_label || 'Floor Waiter'}</span>
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[#7A6A5C] font-semibold">Money Taken By:</span>
                            {activeOrder.waiter_marked_paid ? (
                              <span className="font-bold text-emerald-700 truncate">
                                ✓ {collectedDetails.name} ({collectedDetails.staff_code})
                                {activeOrder.waiter_paid_at
                                  ? ` • ${new Date(activeOrder.waiter_paid_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                  : ''}
                              </span>
                            ) : (
                              <span className="font-semibold text-amber-700">Pending Waiter</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[#7A6A5C] font-semibold">Cashier Status:</span>
                            {activeOrder.payment_status === 'paid' && (activeOrder.explicit_paid || activeOrder.status === 'completed') ? (
                              <span className="font-bold text-emerald-700 truncate">
                                ✓ Verified ({activeOrder.cashier_verified_by || 'Cashier'})
                              </span>
                            ) : activeOrder.waiter_marked_paid ? (
                              <span className="font-bold text-blue-700">Awaiting Cashier</span>
                            ) : (
                              <span className="font-semibold text-slate-500">Unpaid</span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                    <div className="text-[10px] text-[#9E8E81] flex items-center justify-between pt-1 border-t border-slate-100">
                      <span>{activeOrder.items?.length || 0} items ordered</span>
                      <span>{new Date(activeOrder.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ) : isOccupied ? (
                  <div className="my-3 p-3 rounded-2xl bg-white border border-red-200 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-bold text-[#2B2118]">
                      <span>👤 {tbl.guest_name || 'Walk-in Guests'}</span>
                      <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-extrabold">
                        👥 {tbl.guest_count || tbl.capacity} Guests
                      </span>
                    </div>
                    {tbl.occupancy_note ? (
                      <div className="text-[11px] text-amber-800 bg-amber-50/80 px-2 py-1 rounded-lg border border-amber-200/70">
                        📝 {tbl.occupancy_note}
                      </div>
                    ) : (
                      <div className="text-[11px] text-[#7A6A5C]">
                        Seated — browsing menu / awaiting order
                      </div>
                    )}
                    {(() => {
                      const wDetails =
                        getTableAssignedWaiter(tbl) ||
                        authService.resolveWaiterDetails(tbl.occupied_by || 'Waiter', restaurant?.slug, restaurant?.id);
                      return (
                        <div className="p-2.5 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-1 text-[10px]">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-extrabold text-[#2B2118] truncate">
                              👨‍🍳 {wDetails.name} ({wDetails.staff_code})
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[9px] shrink-0">
                              🔒 Waiter Locked
                            </span>
                          </div>
                          <div className="text-[#7A6A5C] flex items-center justify-between gap-1">
                            <span>📞 {wDetails.phone}</span>
                            <span>
                              {tbl.occupied_at
                                ? new Date(tbl.occupied_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : 'Just now'}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="my-3 p-3 rounded-2xl bg-[#FFF9F2]/50 border border-dashed border-[#F0E4D7] text-center text-xs text-[#9E8E81]">
                    <span>Table is currently empty and sanitized</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-[#F0E4D7]/70">
                {isOccupied || isPending ? (
                  <div className="space-y-1.5">
                    {(() => {
                      const assignedW = getTableAssignedWaiter(tbl);
                      return (
                        <div className="px-2.5 py-1.5 rounded-xl bg-amber-50/90 border border-amber-200/80 text-[10px] font-bold text-amber-900 flex items-center justify-between gap-1">
                          <span className="truncate">
                            🔒 Occupied by {assignedW?.name || tbl.occupied_by || 'Waiter'} ({assignedW?.staff_code || 'WTR'})
                          </span>
                          <span className="text-[9px] uppercase tracking-wider text-amber-700 shrink-0">
                            Locked
                          </span>
                        </div>
                      );
                    })()}
                    <div className={activeOrder ? 'grid grid-cols-1' : 'grid grid-cols-2 gap-1.5'}>
                      <button
                        type="button"
                        onClick={() => {
                          if (isTableLockedForCurrentUser(tbl)) {
                            const assignedW = getTableAssignedWaiter(tbl);
                            window.alert(
                              `Table ${tbl.table_number} is occupied by ${assignedW?.name || 'another waiter'} (${assignedW?.staff_code || ''}). Another waiter cannot occupy or take orders on this table.`
                            );
                            return;
                          }
                          if (onOpenPosForTable) onOpenPosForTable(tbl);
                        }}
                        className="w-full py-2 px-2.5 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                        title="Add items to this open running tab"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>{activeOrder ? '+ Add Items' : 'Take Order'}</span>
                      </button>

                      {!activeOrder && (
                        <button
                          type="button"
                          onClick={() => handleCloseTable(tbl)}
                          className="py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                          title="Free table"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Free Table</span>
                        </button>
                      )}
                    </div>

                    {activeOrder && (() => {
                      const isOrderPaid = Boolean(
                        activeOrder.payment_status === 'paid' &&
                          (activeOrder.explicit_paid || activeOrder.status === 'completed')
                      );
                      const isWaiterPaid = Boolean(activeOrder.waiter_marked_paid) || isOrderPaid;
                      return (
                        <div className="space-y-1.5">
                          {!isWaiterPaid ? (
                            <button
                              type="button"
                              onClick={() => handleMarkTableOrderPaidByWaiter(tbl, activeOrder)}
                              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                              title="Step 1: Waiter marks bill as paid after collecting money from table"
                            >
                              <CheckCircle className="w-3.5 h-3.5 text-white" />
                              <span>Waiter: Mark Paid ({formatPKR(activeOrder.total_payable)})</span>
                            </button>
                          ) : !isOrderPaid ? (
                            <div className="w-full py-2 px-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold text-center">
                              ✓ Waiter Collected ({activeOrder.waiter_collected_by || activeOrder.waiter_name || 'Waiter'}) • Cashier Marks Paid in Orders
                            </div>
                          ) : (
                            <div className="w-full py-1.5 px-2.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-[11px] font-bold text-center">
                              ✓ Paid & Confirmed by Cashier ({activeOrder.cashier_verified_by || 'Cashier'})
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleCloseTable(tbl)}
                            className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs ${
                              isOrderPaid
                                ? 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
                                : 'bg-slate-100 text-slate-400 border border-dashed border-slate-300 cursor-not-allowed'
                            }`}
                            title={
                              isOrderPaid
                                ? 'Close table and mark order completed'
                                : 'Waiter must mark paid and Cashier must confirm paid on Orders page before closing table'
                            }
                          >
                            <CheckCircle className={`w-3.5 h-3.5 ${isOrderPaid ? 'text-emerald-400' : 'text-slate-400'}`} />
                            <span>
                              {isOrderPaid
                                ? 'Close Table & Complete Order'
                                : isWaiterPaid
                                ? '🔒 Cashier Must Mark Paid on Orders Page'
                                : '🔒 Waiter Must Mark Paid First'}
                            </span>
                          </button>
                        </div>
                      );
                    })()}

                    <div className="flex items-center justify-between text-[11px] text-[#7A6A5C] pt-1">
                      <button
                        type="button"
                        onClick={() => setMovingTable(tbl)}
                        className="hover:text-[#F26B1D] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Move className="w-3 h-3" />
                        <span>Move Table</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setQrModalTable(tbl)}
                        className="hover:text-[#F26B1D] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <QrCode className="w-3 h-3" />
                        <span>Table QR</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenOccupyModal(tbl)}
                        className="py-2 px-2.5 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] active:scale-98 text-white text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                        title="Seat guests and mark table as Occupied according to customer need"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Occupy Table</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenPosForTable && onOpenPosForTable(tbl)}
                        className="py-2 px-2.5 rounded-xl bg-[#2B2118] hover:bg-black active:scale-98 text-white text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                        title="Open POS and start a dine-in order for this table"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Start Order</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#7A6A5C] pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQrModalTable(tbl)}
                          className="hover:text-[#F26B1D] font-bold flex items-center gap-1 cursor-pointer"
                          title="Generate Table QR"
                        >
                          <QrCode className="w-3 h-3" />
                          <span>QR</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyQrLink(tbl)}
                          className="hover:text-[#F26B1D] flex items-center gap-1 cursor-pointer"
                          title="Copy direct table order link"
                        >
                          {copiedTableId === tbl.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedTableId === tbl.id ? 'Copied' : 'Link'}</span>
                        </button>
                      </div>

                      {canManageLayout && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDeleteTable(tbl.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                            title="Delete table"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================
          OCCUPY TABLE MODAL (Customer Seating & Needs)
          ======================================================== */}
      {occupyingTable && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#F0E4D7] shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[#F0E4D7] flex items-center justify-between bg-[#FFF9F2]">
              <div>
                <h3 className="font-heading font-black text-base text-[#2B2118]">
                  Occupy Table #{occupyingTable.table_number}
                </h3>
                <p className="text-[11px] text-[#7A6A5C]">
                  {occupyingTable.section} • Capacity: {occupyingTable.capacity} Seats
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOccupyingTable(null)}
                className="w-8 h-8 rounded-full bg-white border border-[#F0E4D7] flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmOccupyTable} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#7A6A5C] uppercase tracking-wider mb-1.5">
                  Number of Guests
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 6, 8].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setOccupyGuestCount(num)}
                      className={`flex-1 py-2 rounded-xl font-bold text-xs border transition cursor-pointer ${
                        Number(occupyGuestCount) === num
                          ? 'bg-[#F26B1D] text-white border-[#F26B1D] shadow-xs'
                          : 'bg-[#FFF9F2] text-[#2B2118] border-[#F0E4D7] hover:border-[#F26B1D]'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={occupyGuestCount}
                    onChange={(e) => setOccupyGuestCount(Number(e.target.value) || 1)}
                    className="w-16 px-2.5 py-2 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] font-mono font-bold text-center text-xs text-[#2B2118]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#7A6A5C] uppercase tracking-wider mb-1">
                  Guest / Family Name (Optional)
                </label>
                <input
                  type="text"
                  value={occupyGuestName}
                  onChange={(e) => setOccupyGuestName(e.target.value)}
                  placeholder="e.g. Mr. Khan / Family of 4"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-xs text-[#2B2118] focus:outline-none focus:border-[#F26B1D]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#7A6A5C] uppercase tracking-wider mb-1">
                  Assigned Waiter for Table #{occupyingTable.table_number}
                </label>
                <select
                  value={occupyWaiterId}
                  onChange={(e) => setOccupyWaiterId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-xs font-bold text-[#2B2118] focus:outline-none focus:border-[#F26B1D]"
                >
                  {restaurantWaiters.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} — ID: {w.staff_code} • Ph: {w.phone}
                    </option>
                  ))}
                </select>
                {(() => {
                  const selW = restaurantWaiters.find((w) => w.id === occupyWaiterId) || restaurantWaiters[0];
                  if (!selW) return null;
                  return (
                    <div className="mt-1.5 p-2.5 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-[11px] text-[#7A6A5C] flex items-center justify-between flex-wrap gap-2">
                      <span><strong>Role:</strong> {selW.role_label || 'Floor Waiter'} ({selW.shift})</span>
                      <span className="font-mono text-[#2B2118]">📞 {selW.phone} • ✉️ {selW.email}</span>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#7A6A5C] uppercase tracking-wider mb-1">
                  Customer Need / Special Seating Note (Optional)
                </label>
                <input
                  type="text"
                  value={occupyNote}
                  onChange={(e) => setOccupyNote(e.target.value)}
                  placeholder="e.g. Baby high-chair needed, warm water first, VIP guest..."
                  className="w-full px-3 py-2.5 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-xs text-[#2B2118] focus:outline-none focus:border-[#F26B1D]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOccupyingTable(null)}
                  className="flex-1 py-2.5 rounded-xl border border-[#F0E4D7] text-[#7A6A5C] font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white font-bold shadow-md shadow-orange-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Occupy Table #{occupyingTable.table_number}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          ADD / EDIT TABLE MODAL
          ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#F0E4D7] shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[#F0E4D7] flex items-center justify-between">
              <h3 className="font-heading font-black text-base text-[#2B2118]">
                {editingTable ? `Edit Table #${editingTable.table_number}` : 'Add New Dining Table'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTable} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#7A6A5C] mb-1">
                    Table Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    placeholder="e.g. 1, 2, 12, P1"
                    className="w-full px-3 py-2 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] font-mono font-bold text-sm text-[#2B2118] focus:outline-none focus:border-[#F26B1D]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#7A6A5C] mb-1">
                    Seating Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] font-mono text-sm text-[#2B2118] focus:outline-none focus:border-[#F26B1D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#7A6A5C] mb-1">
                  Table Label / Display Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Window Booth, Patio Corner, VIP 1"
                  className="w-full px-3 py-2 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-xs text-[#2B2118] focus:outline-none focus:border-[#F26B1D]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#7A6A5C] mb-1">
                  Floor / Dining Section
                </label>
                <input
                  type="text"
                  value={formSection}
                  onChange={(e) => setFormSection(e.target.value)}
                  placeholder="e.g. Main Hall, Family Section, Rooftop, VIP"
                  className="w-full px-3 py-2 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-xs text-[#2B2118] focus:outline-none focus:border-[#F26B1D]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#F0E4D7]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#F26B1D] text-white font-bold hover:bg-[#D95A12] transition shadow-xs cursor-pointer"
                >
                  {editingTable ? 'Save Changes' : 'Create Table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MOVE / MERGE TABLE MODAL
          ======================================================== */}
      {movingTable && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-[#F0E4D7] shadow-2xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-black text-base text-[#2B2118]">
                Move Table #{movingTable.table_number}
              </h3>
              <button
                type="button"
                onClick={() => setMovingTable(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#7A6A5C]">
              Transfer the active tab for Order #{movingTable.activeOrder?.id} to a new table.
            </p>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-[#7A6A5C]">
                Select Destination Table:
              </label>
              <select
                value={targetMoveTableNum}
                onChange={(e) => setTargetMoveTableNum(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-xs font-bold text-[#2B2118] focus:outline-none focus:border-[#F26B1D]"
              >
                <option value="">-- Choose Target Table --</option>
                {liveTables
                  .filter((t) => t.table_number !== movingTable.table_number)
                  .map((t) => (
                    <option key={t.id} value={t.table_number}>
                      Table {t.table_number} ({t.name} - {t.status === TABLE_STATUS.FREE ? '🟢 Free' : '🔴 Occupied'})
                    </option>
                  ))}
              </select>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setMovingTable(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!targetMoveTableNum}
                onClick={handleExecuteMoveTable}
                className="px-4 py-2 rounded-xl bg-[#F26B1D] text-white font-bold text-xs hover:bg-[#D95A12] transition disabled:opacity-50"
              >
                Confirm Move
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TABLE QR CODE DISPLAY MODAL
          ======================================================== */}
      {qrModalTable && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-[#F0E4D7] shadow-2xl overflow-hidden p-6 text-center space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <h3 className="font-heading font-black text-base text-[#2B2118]">
                  Table #{qrModalTable.table_number} QR Code
                </h3>
                <p className="text-[11px] text-[#7A6A5C]">{qrModalTable.name} • {qrModalTable.section}</p>
              </div>
              <button
                type="button"
                onClick={() => setQrModalTable(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* QR Card Preview */}
            <div className="p-5 bg-white border-2 border-slate-900 rounded-3xl space-y-3 shadow-md max-w-xs mx-auto text-center">
              <div className="text-xs font-black uppercase tracking-wider text-slate-900">
                {restaurant?.name || 'Restaurant'}
              </div>
              
              <div className="bg-white p-2.5 rounded-2xl inline-block border border-slate-200 shadow-xs">
                <QRCodeSVG
                  value={tableService.getTableQrUrl(restaurant, qrModalTable.table_number)}
                  size={165}
                  level="H"
                  includeMargin={true}
                  imageSettings={
                    restaurant?.logo_url
                      ? {
                          src: restaurant.logo_url,
                          width: 36,
                          height: 36,
                          excavate: true,
                        }
                      : undefined
                  }
                />
              </div>

              <div className="space-y-1">
                <div className="text-3xl font-black font-heading text-[#2B2118] tracking-tight uppercase">
                  TABLE #{qrModalTable.table_number}
                </div>
                <div className="text-xs font-black text-[#F26B1D] uppercase tracking-wider">
                  Scan to Order
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {qrModalTable.name} • {qrModalTable.section} • Seats {qrModalTable.capacity || 4}
                </div>
                <div className="text-[11px] font-mono font-bold text-slate-700 pt-1.5 border-t border-slate-100 flex items-center justify-center gap-1">
                  <span>Ph: +{restaurant?.phone || restaurant?.whatsapp_number || '923001234567'}</span>
                </div>
              </div>
            </div>

            {/* Link Text */}
            <div className="text-[10px] font-mono text-slate-500 bg-slate-100 p-2 rounded-xl break-all">
              {tableService.getTableQrUrl(restaurant, qrModalTable.table_number)}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleCopyQrLink(qrModalTable)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedTableId === qrModalTable.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedTableId === qrModalTable.id ? 'Copied' : 'Copy URL'}</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Stand QR</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          WAITER TABLE ORDERS & CASH COLLECTION RECORD (WITH FULL WAITER DETAILS)
          Restricted to Owner, Manager, and Cashier only (Hidden for Waiters)
          ======================================================== */}
      {canViewWaiterRecords && (() => {
        const allTableOrders = orders.filter(
          (o) => (o.order_type === 'dine_in' || o.table_number || o.table) && o.status !== 'cancelled'
        );
        const totalTableRevenue = allTableOrders
          .filter((o) => o.waiter_marked_paid || o.payment_status === 'paid')
          .reduce((sum, o) => sum + (Number(o.total_payable) || 0), 0);

        const filteredTableOrders =
          selectedWaiterFilter === 'all'
            ? allTableOrders
            : allTableOrders.filter((ord) => {
                const wDetails = authService.resolveWaiterDetails(ord, restaurant?.slug, restaurant?.id);
                return wDetails.staff_code === selectedWaiterFilter;
              });

        const getInitials = (fullName = '') =>
          String(fullName)
            .replace(/\s*\(.*?\)\s*/g, '')
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((p) => p[0] || '')
            .join('')
            .toUpperCase() || 'WT';

        return (
          <div className="bg-white rounded-3xl border border-[#F0E4D7] shadow-xs overflow-hidden">
            {/* Top Header Bar */}
            <div className="p-5 sm:p-6 border-b border-[#F0E4D7] bg-gradient-to-r from-[#FFF9F2] via-[#FFFDF9] to-[#FFF9F2] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#FFF1E6] border border-[#FCD8BF] flex items-center justify-center text-[#F26B1D] shrink-0 shadow-2xs">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-heading font-black text-base sm:text-lg text-[#2B2118]">
                      Waiter Table Orders & Cash Collection Record
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-orange-100/80 text-[#D95A12] border border-orange-200 font-extrabold text-[11px]">
                      {allTableOrders.length} Table Orders
                    </span>
                  </div>
                  <p className="text-xs text-[#7A6A5C] mt-0.5">
                    Complete floor staff directory, table order attribution, contact details, and cashier verification status.
                  </p>
                </div>
              </div>

              {/* Waiter Dropdown & Summary Metric */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="px-3.5 py-2 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-bold text-emerald-900">Total Collected:</span>
                  <span className="font-mono font-black text-xs text-emerald-700">
                    {formatPKR(totalTableRevenue)}
                  </span>
                </div>

                <div className="relative flex items-center">
                  <select
                    value={selectedWaiterFilter}
                    onChange={(e) => setSelectedWaiterFilter(e.target.value)}
                    className="px-3.5 py-2 rounded-2xl bg-[#FFF9F2] hover:bg-[#FFF1E6] border border-[#FCD8BF] text-xs font-extrabold text-[#2B2118] focus:outline-none focus:border-[#F26B1D] cursor-pointer shadow-2xs transition-colors"
                  >
                    <option value="all">All Waiters ({restaurantWaiters.length})</option>
                    {restaurantWaiters.map((w) => {
                      const cleanWName = String(w.name).replace(/\s*\(.*?\)\s*/g, '').trim();
                      return (
                        <option key={w.id} value={w.staff_code}>
                          {cleanWName} ({w.staff_code})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>

            {/* Table Orders Record */}
            {filteredTableOrders.length === 0 ? (
              <div className="p-10 text-center text-xs text-[#9E8E81]">
                No table orders recorded yet. When a waiter takes an order or collects payment from a table, the full record appears here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FFF9F2]/90 border-b border-[#F0E4D7] text-[10px] font-extrabold uppercase tracking-wider text-[#7A6A5C]">
                      <th className="py-3.5 px-5">Table #</th>
                      <th className="py-3.5 px-5">Order ID & Time</th>
                      <th className="py-3.5 px-5">Order Taken By (Waiter Full Details)</th>
                      <th className="py-3.5 px-5">Cashier Final Status</th>
                      <th className="py-3.5 px-5 text-right">Bill Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0E4D7]/70">
                    {filteredTableOrders.map((ord) => {
                      const tblNum = ord.table_number || ord.table || 'Dine-In';
                      const matchingTbl = liveTables.find(
                        (t) => String(t.table_number) === String(tblNum)
                      );
                      const rawWaiterDetails =
                        matchingTbl?.waiter_details ||
                        authService.resolveWaiterDetails(ord, restaurant?.slug, restaurant?.id);
                      const cleanWName = String(rawWaiterDetails?.name || 'Waiter')
                        .replace(/\s*\(.*?\)\s*/g, '')
                        .trim();
                      const waiterDetails = {
                        ...rawWaiterDetails,
                        name: cleanWName,
                      };
                      const isCashierPaid = Boolean(
                        ord.payment_status === 'paid' &&
                          (ord.explicit_paid || ord.status === 'completed' || ord.status === 'delivered')
                      );
                      const isWaiterPaid = Boolean(ord.waiter_marked_paid) || isCashierPaid;

                      return (
                        <tr
                          key={ord.id}
                          className="hover:bg-[#FFF9F2]/60 transition-colors align-middle"
                        >
                          {/* 1. Table # */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-[#FFF1E6] border border-[#FCD8BF] flex items-center justify-center text-[#F26B1D] shrink-0 shadow-2xs">
                                <Utensils className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-heading font-black text-xs text-[#2B2118]">
                                  Table {tblNum}
                                </div>
                                <div className="text-[11px] text-[#7A6A5C] font-medium">
                                  {matchingTbl?.section || 'Main Hall'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. Order ID & Time */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-xs text-[#2B2118] bg-[#FFF9F2] px-2 py-0.5 rounded-md border border-[#F0E4D7]">
                                #{ord.id}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-[#FFF1E6] text-[#D95A12] font-bold text-[10px]">
                                {ord.items?.length || 0} {ord.items?.length === 1 ? 'dish' : 'dishes'}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#7A6A5C] mt-1 font-medium">
                              {ord.created_at
                                ? new Date(ord.created_at).toLocaleString('en-PK', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '—'}
                            </div>
                          </td>

                          {/* 3. Order Taken By (Waiter Full Details) */}
                          <td className="py-3.5 px-5">
                            <div
                              onClick={() => setSelectedWaiterModal(waiterDetails)}
                              className="group/wcard p-3 rounded-2xl bg-[#FFF9F2]/85 hover:bg-[#FFF9F2] border border-[#F0E4D7] hover:border-[#F26B1D]/60 transition-all cursor-pointer flex items-center justify-between gap-3 max-w-md shadow-2xs"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-[#2B2118] text-white font-heading font-black text-xs flex items-center justify-center shrink-0">
                                  {getInitials(waiterDetails.name)}
                                </div>
                                <div className="min-w-0 space-y-0.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-heading font-black text-xs text-[#2B2118] group-hover/wcard:text-[#F26B1D] transition-colors">
                                      {waiterDetails.name}
                                    </span>
                                    <span className="px-1.5 py-0.2 rounded-md bg-orange-100 text-[#D95A12] border border-orange-200/70 font-mono font-black text-[10px]">
                                      {waiterDetails.staff_code}
                                    </span>
                                    <span className="text-[10px] text-[#7A6A5C] font-semibold hidden sm:inline">
                                      • {waiterDetails.role_label || 'Floor Waiter'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 flex-wrap text-[11px] text-[#7A6A5C]">
                                    <span className="inline-flex items-center gap-1 font-mono font-semibold text-[#2B2118]">
                                      <Phone className="w-3 h-3 text-[#F26B1D]" />
                                      {waiterDetails.phone}
                                    </span>
                                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#7A6A5C] truncate max-w-[180px]">
                                      <Mail className="w-3 h-3 text-[#9E8E81]" />
                                      {waiterDetails.email}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedWaiterModal(waiterDetails);
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-white group-hover/wcard:bg-[#F26B1D] text-[#F26B1D] group-hover/wcard:text-white border border-[#F0E4D7] group-hover/wcard:border-[#F26B1D] font-extrabold text-[10px] transition-colors shrink-0 flex items-center gap-1 cursor-pointer shadow-2xs"
                              >
                                <span>Details</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          {/* 4. Cashier Final Status */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            {isCashierPaid ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wider shadow-2xs">
                                  <CheckCircle className="w-3 h-3" />
                                  <span>Paid • {ord.cashier_verified_by || 'Cashier'}</span>
                                </span>
                                {ord.waiter_paid_at && (
                                  <div className="text-[10px] text-[#7A6A5C] font-medium pl-1">
                                    Waiter collected at{' '}
                                    {new Date(ord.waiter_paid_at).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </div>
                                )}
                              </div>
                            ) : isWaiterPaid ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-bold text-[10px]">
                                  <Clock className="w-3 h-3" />
                                  <span>Ready for Cashier Verification</span>
                                </span>
                                <div className="text-[10px] text-emerald-700 font-semibold pl-1">
                                  ✓ Cash collected by {waiterDetails.name}
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px]">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Waiter Collection Pending</span>
                              </span>
                            )}
                          </td>

                          {/* 5. Bill Amount */}
                          <td className="py-4 px-5 text-right whitespace-nowrap">
                            <div className="font-mono font-black text-sm sm:text-base text-[#2B2118]">
                              {formatPKR(ord.total_payable || 0)}
                            </div>
                            <span className="inline-block mt-0.5 px-2 py-0.2 rounded bg-slate-100 text-[#7A6A5C] font-mono font-bold text-[9px] uppercase">
                              {ord.payment_method || 'CASH'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {/* ========================================================
          WAITER FULL PROFILE & TABLE ORDER HISTORY MODAL
          ======================================================== */}
      {canViewWaiterRecords && selectedWaiterModal && (
        <div
          className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn"
          onClick={() => setSelectedWaiterModal(null)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-3xl border border-[#F0E4D7] shadow-2xl overflow-hidden max-h-[88vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 sm:p-6 border-b border-[#F0E4D7] bg-[#FFF9F2] flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#F26B1D] text-white font-heading font-black text-base flex items-center justify-center shadow-xs shrink-0">
                  {String(selectedWaiterModal.name || 'W')
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((p) => p[0] || '')
                    .join('')
                    .toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-heading font-black text-lg text-[#2B2118]">
                      {selectedWaiterModal.name}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#FFF1E6] text-[#D95A12] border border-[#FCD8BF] font-mono font-black text-xs">
                      ID: {selectedWaiterModal.staff_code}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs">
                      {selectedWaiterModal.role_label || 'Floor Waiter'}
                    </span>
                  </div>
                  <p className="text-xs text-[#7A6A5C] mt-1">
                    {restaurant?.name || 'Restaurant'} • {selectedWaiterModal.shift || 'Main Floor Shift'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWaiterModal(null)}
                className="w-8 h-8 rounded-full bg-white border border-[#F0E4D7] flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Waiter Full Contact & Identity Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7]">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[#7A6A5C] flex items-center gap-1">
                    <Phone className="w-3 h-3 text-[#F26B1D]" />
                    <span>Phone / WhatsApp</span>
                  </span>
                  <a
                    href={`tel:${selectedWaiterModal.phone}`}
                    className="font-mono font-black text-sm text-emerald-700 hover:underline block"
                  >
                    {selectedWaiterModal.phone}
                  </a>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[#7A6A5C] flex items-center gap-1">
                    <Mail className="w-3 h-3 text-[#7A6A5C]" />
                    <span>Staff Email</span>
                  </span>
                  <span className="font-mono font-bold text-[#2B2118] break-all block">
                    {selectedWaiterModal.email}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[#7A6A5C] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#7A6A5C]" />
                    <span>Assigned Shift</span>
                  </span>
                  <span className="font-bold text-[#2B2118] block">
                    {selectedWaiterModal.shift || 'Full-Time Floor Staff'}
                  </span>
                </div>
              </div>

              {/* Waiter's Table Orders & Cash Collection History */}
              {(() => {
                const waiterOrders = orders.filter((o) => {
                  if (o.status === 'cancelled') return false;
                  if (o.order_type !== 'dine_in' && !o.table_number && !o.table) return false;
                  const resolved = authService.resolveWaiterDetails(o, restaurant?.slug, restaurant?.id);
                  return (
                    resolved.staff_code === selectedWaiterModal.staff_code ||
                    resolved.name === selectedWaiterModal.name
                  );
                });
                const totalCash = waiterOrders
                  .filter((o) => o.waiter_marked_paid || o.payment_status === 'paid')
                  .reduce((sum, o) => sum + (Number(o.total_payable) || 0), 0);

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="font-heading font-black text-sm text-[#2B2118]">
                        Orders & Money Taken by {selectedWaiterModal.name} ({waiterOrders.length})
                      </h4>
                      <span className="font-mono font-black text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                        Total Cash Collected: {formatPKR(totalCash)}
                      </span>
                    </div>

                    {waiterOrders.length === 0 ? (
                      <div className="p-6 text-center rounded-2xl bg-slate-50 border border-slate-200 text-[#7A6A5C]">
                        No table orders recorded for this waiter yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {waiterOrders.map((ord) => (
                          <div
                            key={ord.id}
                            className="p-3.5 rounded-2xl bg-white border border-[#F0E4D7] flex items-center justify-between gap-3 flex-wrap hover:border-[#F26B1D]/40 transition"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2.5 py-0.5 rounded-lg bg-purple-100 text-purple-900 font-black text-xs">
                                  Table {ord.table_number || ord.table || 'Dine-In'}
                                </span>
                                <span className="font-mono font-bold text-[#2B2118]">Order #{ord.id}</span>
                                <span className="text-[11px] text-[#7A6A5C]">
                                  • {ord.items?.length || 0} dishes ({ord.items?.map((i) => `${i.quantity}x ${i.title}`).join(', ')})
                                </span>
                              </div>
                              <div className="text-[11px] text-[#7A6A5C]">
                                Ordered at:{' '}
                                {ord.created_at ? new Date(ord.created_at).toLocaleString('en-PK') : '—'}
                                {ord.waiter_paid_at
                                  ? ` • Cash Collected at ${new Date(ord.waiter_paid_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                  : ''}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-black text-sm text-[#2B2118]">
                                {formatPKR(ord.total_payable || 0)}
                              </div>
                              <div className="text-[10px] font-bold text-emerald-700 mt-0.5">
                                {ord.payment_status === 'paid'
                                  ? `✓ Cashier Verified (${ord.cashier_verified_by || 'Cashier'})`
                                  : ord.waiter_marked_paid
                                  ? '✓ Collected by Waiter • Pending Cashier'
                                  : 'Pending Collection'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
