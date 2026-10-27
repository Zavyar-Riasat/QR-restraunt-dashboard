import { toRupees, toPaisa, formatPKR } from '../utils/currencyUtils';

const STORAGE_PREFIX = 'dinehq_cashflow_';

export const CASH_IN_CATEGORIES = [
  { id: 'capital', label: 'Owner Capital / Investment', description: 'Funds injected by the owner into the business' },
  { id: 'sales_cash', label: 'Counter Cash / Direct Sales', description: 'Offline register cash addition' },
  { id: 'refund', label: 'Supplier / Vendor Refund', description: 'Returned money from vendor or utility' },
  { id: 'other_in', label: 'Other Cash Inflow', description: 'Miscellaneous income or receipts' },
];

export const CASH_OUT_CATEGORIES = [
  { id: 'inventory', label: 'Raw Materials & Meat / Grocery', description: 'Chicken, meat, vegetables, sauces, dairy' },
  { id: 'utilities', label: 'Utilities (Electricity, Gas, Water)', description: 'WAPDA, SNGPL gas cylinders, internet' },
  { id: 'staff', label: 'Staff Wages / Salary Advance', description: 'Kitchen staff wages, driver pay, daily tips' },
  { id: 'rent', label: 'Property / Shop Rent', description: 'Monthly store or kitchen lease' },
  { id: 'supplies', label: 'Packaging & Disposables', description: 'Burger boxes, kraft bags, napkins, cups' },
  { id: 'maintenance', label: 'Equipment Repairs & Maintenance', description: 'Deep fryer repair, AC servicing, plumbing' },
  { id: 'refreshment', label: 'Staff Tea & Food / Refreshments', description: 'Daily tea, biscuits, staff lunch' },
  { id: 'drawings', label: 'Owner Withdrawal / Personal', description: 'Cash taken out by owner for personal use' },
  { id: 'other_out', label: 'Other Expense / Miscellaneous', description: 'Police/cleaning fee, garbage, misc' },
];

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash in Hand' },
  { id: 'bank_transfer', label: 'Bank Transfer' },
  { id: 'jazzcash', label: 'JazzCash' },
  { id: 'easypaisa', label: 'Easypaisa' },
];

const DEFAULT_STARTER_ENTRIES = [
  {
    id: 'cf-start-1',
    type: 'in',
    amount: 50000,
    amount_paisa: 5000000,
    category: 'capital',
    category_label: 'Owner Capital / Investment',
    source_recipient: 'Owner (Capital)',
    description: 'Initial cash injection to start shift & monthly operational runway',
    payment_method: 'cash',
    reference_no: 'CAP-001',
    recorded_by: 'Owner',
    date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'cf-start-2',
    type: 'in',
    amount: 10000,
    amount_paisa: 1000000,
    category: 'capital',
    category_label: 'Owner Capital / Investment',
    source_recipient: 'Owner (Capital)',
    description: 'Working capital addition for operational expenses',
    payment_method: 'cash',
    reference_no: 'CAP-002',
    recorded_by: 'Owner',
    date: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'cf-start-3',
    type: 'out',
    amount: 14500,
    amount_paisa: 1450000,
    category: 'inventory',
    category_label: 'Raw Materials & Meat / Grocery',
    source_recipient: 'Al-Rehman Chicken Supplier',
    description: 'Purchased 40kg fresh boneless fillets and wings for burger patties',
    payment_method: 'cash',
    reference_no: 'INV-4821',
    recorded_by: 'Manager',
    date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'cf-start-4',
    type: 'out',
    amount: 4800,
    amount_paisa: 480000,
    category: 'supplies',
    category_label: 'Packaging & Disposables',
    source_recipient: 'Master Packaging Rawalpindi',
    description: 'Brown kraft delivery bags, sauce cups, and foil burger wraps',
    payment_method: 'cash',
    reference_no: 'PKG-901',
    recorded_by: 'Manager',
    date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'cf-start-5',
    type: 'out',
    amount: 8200,
    amount_paisa: 820000,
    category: 'utilities',
    category_label: 'Utilities (Electricity, Gas, Water)',
    source_recipient: 'PSO Commercial Gas Agency',
    description: 'Replaced 45kg commercial LPG cylinder for heavy burner stove',
    payment_method: 'cash',
    reference_no: 'GAS-339',
    recorded_by: 'Store Manager',
    date: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'cf-start-6',
    type: 'out',
    amount: 950,
    amount_paisa: 95000,
    category: 'refreshment',
    category_label: 'Staff Tea & Food / Refreshments',
    source_recipient: 'Corner Bakery & Cafe',
    description: 'Daily staff tea, parathas, and evening snacks',
    payment_method: 'cash',
    reference_no: '',
    recorded_by: 'Manager',
    date: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
];

export const cashFlowService = {
  /**
   * Get all cash flow entries for a restaurant
   */
  getEntries(restaurantId = 'rest-101') {
    const key = `${STORAGE_PREFIX}${restaurantId}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        let parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          let migrated = false;
          parsed = parsed.map((e) => {
            if (e.category === 'float') {
              migrated = true;
              return { ...e, category: 'capital', category_label: 'Owner Capital / Investment' };
            }
            if (e.category === 'deposit') {
              migrated = true;
              return { ...e, category: 'sales_cash', category_label: 'Counter Cash / Direct Sales' };
            }
            return e;
          });
          if (migrated) {
            try {
              localStorage.setItem(key, JSON.stringify(parsed));
            } catch (err) {}
          }
          return parsed.sort((a, b) => new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime());
        }
      }
    } catch (e) {
      console.warn('Failed to parse cash flow entries from localStorage:', e);
    }

    // Seed default starter entries
    try {
      localStorage.setItem(key, JSON.stringify(DEFAULT_STARTER_ENTRIES));
    } catch (e) {}
    return [...DEFAULT_STARTER_ENTRIES].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  /**
   * Add a new Cash In or Cash Out entry
   */
  addEntry(restaurantId = 'rest-101', entry) {
    const entries = this.getEntries(restaurantId);
    const amountRupees = Math.max(0, Number(entry.amount) || 0);
    const amountPaisa = toPaisa(amountRupees);

    let categoryLabel = entry.category_label;
    if (!categoryLabel) {
      const allCats = entry.type === 'in' ? CASH_IN_CATEGORIES : CASH_OUT_CATEGORIES;
      const found = allCats.find((c) => c.id === entry.category);
      categoryLabel = found ? found.label : (entry.category || 'General');
    }

    const newRecord = {
      id: `cf-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: entry.type === 'in' ? 'in' : 'out', // 'in' | 'out'
      amount: amountRupees,
      amount_paisa: amountPaisa,
      category: entry.category || (entry.type === 'in' ? 'other_in' : 'other_out'),
      category_label: categoryLabel,
      source_recipient: (entry.source_recipient || '').trim(),
      description: (entry.description || '').trim(),
      payment_method: entry.payment_method || 'cash',
      reference_no: (entry.reference_no || '').trim(),
      recorded_by: entry.recorded_by || 'Manager',
      date: entry.date ? new Date(entry.date).toISOString() : new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const updated = [newRecord, ...entries];
    this._saveEntries(restaurantId, updated);
    return newRecord;
  },

  /**
   * Update an existing entry
   */
  updateEntry(restaurantId = 'rest-101', entryId, updatedFields) {
    const entries = this.getEntries(restaurantId);
    const idx = entries.findIndex((e) => e.id === entryId);
    if (idx === -1) throw new Error(`Cash flow entry ${entryId} not found`);

    const existing = entries[idx];
    const amountRupees = updatedFields.amount != null ? Math.max(0, Number(updatedFields.amount)) : existing.amount;
    const amountPaisa = toPaisa(amountRupees);

    let categoryLabel = updatedFields.category_label || existing.category_label;
    if (updatedFields.category && !updatedFields.category_label) {
      const allCats = (updatedFields.type || existing.type) === 'in' ? CASH_IN_CATEGORIES : CASH_OUT_CATEGORIES;
      const found = allCats.find((c) => c.id === updatedFields.category);
      if (found) categoryLabel = found.label;
    }

    const merged = {
      ...existing,
      ...updatedFields,
      amount: amountRupees,
      amount_paisa: amountPaisa,
      category_label: categoryLabel,
      updated_at: new Date().toISOString(),
    };

    entries[idx] = merged;
    this._saveEntries(restaurantId, entries);
    return merged;
  },

  /**
   * Delete an entry
   */
  deleteEntry(restaurantId = 'rest-101', entryId) {
    const entries = this.getEntries(restaurantId);
    const filtered = entries.filter((e) => e.id !== entryId);
    this._saveEntries(restaurantId, filtered);
    return true;
  },

  /**
   * Get overall and shift summary of cash flow
   */
  getSummary(restaurantId = 'rest-101') {
    const entries = this.getEntries(restaurantId);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    let totalIn = 0;
    let totalOut = 0;
    let todayIn = 0;
    let todayOut = 0;

    const categoryBreakdown = {};

    entries.forEach((entry) => {
      const amt = Number(entry.amount) || 0;
      const entryTime = new Date(entry.date || entry.created_at).getTime();
      const isToday = entryTime >= todayStart;

      if (entry.type === 'in') {
        totalIn += amt;
        if (isToday) todayIn += amt;
      } else {
        totalOut += amt;
        if (isToday) todayOut += amt;
      }

      const catKey = entry.category_label || entry.category || 'General';
      if (!categoryBreakdown[catKey]) {
        categoryBreakdown[catKey] = {
          label: catKey,
          type: entry.type,
          total: 0,
          count: 0,
        };
      }
      categoryBreakdown[catKey].total += amt;
      categoryBreakdown[catKey].count += 1;
    });

    const netBalance = totalIn - totalOut;
    const todayNet = todayIn - todayOut;

    return {
      totalCashIn: totalIn,
      totalCashOut: totalOut,
      netBalance,
      todayCashIn: todayIn,
      todayCashOut: todayOut,
      todayNet,
      totalTransactions: entries.length,
      categoryBreakdown: Object.values(categoryBreakdown),
    };
  },

  /**
   * Export entries to CSV
   */
  exportCSV(restaurantId = 'rest-101', restaurantName = 'Restaurant') {
    const entries = this.getEntries(restaurantId);
    const headers = [
      'Transaction ID',
      'Type',
      'Date & Time',
      'Category',
      'Recipient / Source',
      'Description / Note',
      'Payment Method',
      'Reference #',
      'Recorded By',
      'Amount (PKR)',
    ];

    const rows = entries.map((e) => [
      e.id,
      e.type === 'in' ? 'CASH IN' : 'CASH OUT',
      new Date(e.date || e.created_at).toLocaleString('en-PK'),
      `"${(e.category_label || e.category || '').replace(/"/g, '""')}"`,
      `"${(e.source_recipient || '').replace(/"/g, '""')}"`,
      `"${(e.description || '').replace(/"/g, '""')}"`,
      e.payment_method?.toUpperCase() || 'CASH',
      `"${(e.reference_no || '').replace(/"/g, '""')}"`,
      `"${(e.recorded_by || '').replace(/"/g, '""')}"`,
      e.type === 'in' ? e.amount : -e.amount,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    return csvContent;
  },

  _saveEntries(restaurantId, entries) {
    const key = `${STORAGE_PREFIX}${restaurantId}`;
    try {
      localStorage.setItem(key, JSON.stringify(entries));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('dinehq_cashflow_updated', {
            detail: { restaurantId },
          })
        );
      }
    } catch (e) {
      console.warn('Failed to save cashflow to localStorage:', e);
    }
  },
};
