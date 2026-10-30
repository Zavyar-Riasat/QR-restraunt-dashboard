import React, { useState, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Plus,
  QrCode,
  Users,
  Edit2,
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
} from 'lucide-react';
import { tableService, TABLE_STATUS } from '../../services/tableService';
import { orderService } from '../../services/orderService';
import { formatPKR } from '../../utils/currencyUtils';
import { downloadAllTableQrsPdf } from '../../utils/tableQrPdfGenerator';
import { printerService } from '../../services/printer/printerService';
import { TEMPLATE_TYPES } from '../../services/printer/printerTypes';
import EditOrderItemsModal from '../Orders/EditOrderItemsModal';

export default function TableManager({
  restaurant,
  orders = [],
  onOpenPosForTable,
  currentUser,
  menuItems = [],
}) {
  const userRole = currentUser?.role || 'owner';
  const canManageLayout = userRole === 'owner' || userRole === 'manager' || userRole === 'admin';
  const isWaiter = userRole === 'waiter';

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
  const [editingOrderItems, setEditingOrderItems] = useState(null);
  const [movingTable, setMovingTable] = useState(null); // source table being moved
  const [qrModalTable, setQrModalTable] = useState(null);
  const [copiedTableId, setCopiedTableId] = useState(null);
  const [isExportingAllPdf, setIsExportingAllPdf] = useState(false);

  // Occupy Table Modal State (Waiter / Floor Staff)
  const [occupyingTable, setOccupyingTable] = useState(null);
  const [occupyGuestCount, setOccupyGuestCount] = useState(2);
  const [occupyGuestName, setOccupyGuestName] = useState('');
  const [occupyNote, setOccupyNote] = useState('');

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

  const handleOpenEditModal = (tbl) => {
    setEditingTable(tbl);
    setFormNumber(tbl.table_number);
    setFormName(tbl.name);
    setFormCapacity(String(tbl.capacity || 4));
    setFormSection(tbl.section || 'Main Hall');
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

  const handleMarkTableOrderPaid = (orderId) => {
    const restId = restaurant?.id || 'rest-101';
    orderService.updatePaymentStatus(orderId, 'paid', restId);
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

  const handleOpenOccupyModal = (tbl) => {
    setOccupyingTable(tbl);
    setOccupyGuestCount(tbl.capacity || 2);
    setOccupyGuestName('');
    setOccupyNote('');
  };

  const handleConfirmOccupyTable = (e) => {
    e.preventDefault();
    if (!occupyingTable) return;
    const restId = restaurant?.id || 'rest-101';
    tableService.occupyTable(restId, occupyingTable.id, {
      guestCount: occupyGuestCount,
      guestName: occupyGuestName,
      note: occupyNote,
      occupiedBy: currentUser?.name || (isWaiter ? 'Waiter' : 'Staff'),
    });
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTables.map((tbl) => {
          const isOccupied = tbl.status === TABLE_STATUS.OCCUPIED;
          const isPending = tbl.status === TABLE_STATUS.BILL_PENDING;
          const activeOrder = tbl.activeOrder;

          return (
            <div
              key={tbl.id}
              className={`p-4 rounded-3xl border transition flex flex-col justify-between shadow-xs ${
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
                      {!isWaiter && (
                        <span className="text-[#F26B1D] text-sm">
                          {formatPKR(activeOrder.total_payable)}
                        </span>
                      )}
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
                    <div className="text-[10px] text-[#9E8E81] flex items-center justify-between pt-1 border-t border-slate-100">
                      <span>By {tbl.occupied_by || 'Waiter'}</span>
                      <span>
                        {tbl.occupied_at
                          ? new Date(tbl.occupied_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'Just now'}
                      </span>
                    </div>
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
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenPosForTable && onOpenPosForTable(tbl)}
                        className="py-2 px-2.5 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                        title="Add items to this open running tab"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>{activeOrder ? '+ Add Items' : 'Take Order'}</span>
                      </button>

                      {activeOrder && !isWaiter ? (
                        <button
                          type="button"
                          onClick={() => setEditingOrderItems(activeOrder)}
                          className="py-2 px-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                          title="Edit items, remove accidental items (like water), or recalculate bill"
                        >
                          <Receipt className="w-3.5 h-3.5 text-purple-600" />
                          <span>Edit Bill</span>
                        </button>
                      ) : (
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

                    {activeOrder && !isWaiter && (() => {
                      const isOrderPaid = Boolean(
                        activeOrder.payment_status === 'paid' &&
                          (activeOrder.explicit_paid || activeOrder.status === 'completed')
                      );
                      return (
                        <div className="space-y-1.5">
                          {!isOrderPaid && (
                            <button
                              type="button"
                              onClick={() => handleMarkTableOrderPaid(activeOrder.id)}
                              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                              title="Mark order bill as paid first"
                            >
                              <CheckCircle className="w-3.5 h-3.5 text-white" />
                              <span>Mark Bill Paid ({formatPKR(activeOrder.total_payable)})</span>
                            </button>
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
                                : 'Mark the bill as Paid before completing order & closing table'
                            }
                          >
                            <CheckCircle className={`w-3.5 h-3.5 ${isOrderPaid ? 'text-emerald-400' : 'text-slate-400'}`} />
                            <span>{isOrderPaid ? 'Close Table & Complete Order' : '🔒 Pay Bill First to Close Table'}</span>
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
                            onClick={() => handleOpenEditModal(tbl)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                            title="Edit table"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
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

      {/* Edit Order Items & Recalculate Bill Modal */}
      {editingOrderItems && (
        <EditOrderItemsModal
          isOpen={Boolean(editingOrderItems)}
          onClose={() => setEditingOrderItems(null)}
          order={editingOrderItems}
          restaurant={restaurant}
          menuItems={menuItems}
          onOrderUpdated={(_updated) => {
            setEditingOrderItems(null);
          }}
          onPrintBill={async (updatedOrder, templateType) => {
            const table = updatedOrder?.table_number || updatedOrder?.table;
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            const params = new URLSearchParams();
            if (table) params.set('table', table);
            if (updatedOrder?.id) params.set('order', updatedOrder.id);
            const qs = params.toString();
            const billQrUrl = `${origin}/${restaurant?.slug || 'burgersmoke'}${qs ? `?${qs}` : ''}`;

            await printerService.print(
              {
                order: updatedOrder,
                restaurant,
                reorderUrl: billQrUrl,
                reorderQrUrl: billQrUrl,
                templateType: templateType || TEMPLATE_TYPES.BILL,
              },
              { printType: templateType || TEMPLATE_TYPES.BILL }
            );
          }}
          onOpenPosForOrder={(ord) => {
            setEditingOrderItems(null);
            if (onOpenPosForTable) {
              const tblNum = ord.table_number || ord.table;
              const tableObj = tblNum ? { table_number: tblNum } : null;
              onOpenPosForTable(tableObj, ord.id);
            }
          }}
        />
      )}

    </div>
  );
}
