/**
 * Table Service
 * Handles restaurant table layout, seating capacity, real-time table status (Free, Occupied, Bill Pending),
 * QR code generation for dine-in tables, table merging/moving, and closing tables.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';
import { getAppBaseUrl } from '../config/appConfig.js';

const TABLES_STORAGE_PREFIX = 'dinehq_tables_';

export const TABLE_STATUS = {
  FREE: 'free',
  OCCUPIED: 'occupied',
  BILL_PENDING: 'bill_pending',
};

const DEFAULT_TABLES = [
  { id: 'tbl-1', table_number: '1', name: 'Table 1', capacity: 4, section: 'Main Hall', status: TABLE_STATUS.FREE },
  { id: 'tbl-2', table_number: '2', name: 'Table 2', capacity: 2, section: 'Main Hall', status: TABLE_STATUS.FREE },
  { id: 'tbl-3', table_number: '3', name: 'Table 3', capacity: 4, section: 'Main Hall', status: TABLE_STATUS.FREE },
  { id: 'tbl-4', table_number: '4', name: 'Table 4', capacity: 6, section: 'Family Section', status: TABLE_STATUS.FREE },
  { id: 'tbl-5', table_number: '5', name: 'Table 5', capacity: 4, section: 'Family Section', status: TABLE_STATUS.FREE },
  { id: 'tbl-6', table_number: '6', name: 'Table 6', capacity: 2, section: 'Window View', status: TABLE_STATUS.FREE },
  { id: 'tbl-7', table_number: '7', name: 'Table 7', capacity: 4, section: 'Outdoor Patio', status: TABLE_STATUS.FREE },
  { id: 'tbl-8', table_number: '8', name: 'Table 8', capacity: 8, section: 'VIP Lounge', status: TABLE_STATUS.FREE },
];

export const tableService = {
  /**
   * Get all tables for a given restaurant
   */
  getTables(restaurantId = 'rest-101') {
    if (typeof window === 'undefined') return DEFAULT_TABLES;
    try {
      const key = `${TABLES_STORAGE_PREFIX}${restaurantId}`;
      const cached = localStorage.getItem(key);
      if (cached) {
        return JSON.parse(cached);
      }
      // Initialize with default tables
      localStorage.setItem(key, JSON.stringify(DEFAULT_TABLES));
      return DEFAULT_TABLES;
    } catch (e) {
      console.warn('Error reading tables from storage:', e);
      return DEFAULT_TABLES;
    }
  },

  /**
   * Save table list to storage
   */
  saveTables(restaurantId, tables) {
    if (typeof window === 'undefined' || !restaurantId) return;
    try {
      const key = `${TABLES_STORAGE_PREFIX}${restaurantId}`;
      localStorage.setItem(key, JSON.stringify(tables));
      window.dispatchEvent(
        new CustomEvent('dinehq_tables_updated', {
          detail: { restaurantId, tables },
        })
      );
    } catch (e) {
      console.error('Error saving tables:', e);
    }
  },

  /**
   * Add a new table
   */
  addTable(restaurantId, tableData) {
    const tables = this.getTables(restaurantId);
    const newId = `tbl-${Date.now()}`;
    const cleanNum = String(tableData.table_number || tables.length + 1).trim();
    
    const newTable = {
      id: newId,
      table_number: cleanNum,
      name: tableData.name?.trim() || `Table ${cleanNum}`,
      capacity: parseInt(tableData.capacity, 10) || 4,
      section: tableData.section?.trim() || 'Main Hall',
      status: TABLE_STATUS.FREE,
      created_at: new Date().toISOString(),
    };

    const updated = [...tables, newTable];
    this.saveTables(restaurantId, updated);
    return newTable;
  },

  /**
   * Update an existing table
   */
  updateTable(restaurantId, tableId, updates) {
    const tables = this.getTables(restaurantId);
    const updated = tables.map((t) => (t.id === tableId ? { ...t, ...updates } : t));
    this.saveTables(restaurantId, updated);
    return updated.find((t) => t.id === tableId);
  },

  /**
   * Delete a table
   */
  deleteTable(restaurantId, tableId) {
    const tables = this.getTables(restaurantId);
    const updated = tables.filter((t) => t.id !== tableId);
    this.saveTables(restaurantId, updated);
    return updated;
  },

  /**
   * Generate Table QR URL
   */
  getTableQrUrl(restaurant, tableNumber) {
    const origin = getAppBaseUrl();
    const slug = restaurant?.slug || 'burgersmoke';
    return `${origin}/${slug}?table=${encodeURIComponent(tableNumber)}`;
  },

  /**
   * Compute real-time table statuses based on live orders
   */
  getTablesWithLiveStatus(restaurantId, activeOrders = []) {
    const tables = this.getTables(restaurantId);

    return tables.map((tbl) => {
      // Find orders currently assigned to this table
      const tableOrders = activeOrders.filter((o) => {
        if (o.order_type !== 'dine_in') return false;
        const oNum = String(o.table_number || o.table || '').replace(/^Table\s*/i, '').trim();
        const tNum = String(tbl.table_number || '').replace(/^Table\s*/i, '').trim();
        return oNum && tNum && oNum.toLowerCase() === tNum.toLowerCase();
      });

      // Filter active (non-completed, non-cancelled) orders
      const openOrders = tableOrders.filter(
        (o) => o.status !== 'completed' && o.status !== 'cancelled'
      );

      let status = TABLE_STATUS.FREE;
      let activeOrder = null;

      if (openOrders.length > 0) {
        activeOrder = openOrders[0];
        // If bill was requested or printed
        if (activeOrder.is_bill_printed || activeOrder.status === 'bill_pending') {
          status = TABLE_STATUS.BILL_PENDING;
        } else {
          status = TABLE_STATUS.OCCUPIED;
        }
      }

      return {
        ...tbl,
        status,
        activeOrders: openOrders,
        activeOrder,
        orderCount: openOrders.length,
      };
    });
  },

  /**
   * Move an active order from one table to another
   */
  moveTable(restaurantId, fromTableNumber, toTableNumber, orderService) {
    if (!orderService) return false;
    const orders = orderService.getOrders(restaurantId);
    const fromStr = String(fromTableNumber).trim();
    const toStr = String(toTableNumber).trim();

    let updatedAny = false;
    orders.forEach((o) => {
      if (
        o.order_type === 'dine_in' &&
        o.status !== 'completed' &&
        o.status !== 'cancelled' &&
        String(o.table_number || '').trim() === fromStr
      ) {
        orderService.updateOrderStatus(o.id, o.status, {
          table_number: toStr,
          customer_notes: `${o.customer_notes || ''} (Moved from Table ${fromStr} to Table ${toStr})`.trim(),
        });
        updatedAny = true;
      }
    });

    return updatedAny;
  },

  /**
   * Close a table: complete all active orders on this table and mark as free
   */
  closeTable(restaurantId, tableNumber, orderService) {
    if (!orderService) return false;
    const orders = orderService.getOrders(restaurantId);
    const tStr = String(tableNumber).trim();

    orders.forEach((o) => {
      if (
        o.order_type === 'dine_in' &&
        o.status !== 'completed' &&
        o.status !== 'cancelled' &&
        String(o.table_number || '').trim() === tStr
      ) {
        orderService.updateOrderStatus(o.id, 'completed', {
          closed_at: new Date().toISOString(),
          payment_status: 'paid',
        });
      }
    });

    // Notify listeners
    this.saveTables(restaurantId, this.getTables(restaurantId));
    return true;
  },
};
