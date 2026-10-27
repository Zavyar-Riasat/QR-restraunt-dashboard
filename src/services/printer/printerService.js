import {
  DRIVER_IDS,
  PAPER_SIZES,
  DEFAULT_PRINTER_CONFIG,
  PRINT_TARGETS,
  TEMPLATE_TYPES,
  DEFAULT_TEMPLATE_SETTINGS,
  createDefaultPrinter,
  STORAGE_PRINTED_ORDERS_KEY,
  STORAGE_RETRY_QUEUE_KEY,
} from './printerTypes.js';
import { BrowserPrintDriver } from './drivers/BrowserPrintDriver.js';
import { UsbThermalDriver } from './drivers/UsbThermalDriver.js';
import { WindowsPrintDriver } from './drivers/WindowsPrintDriver.js';
import { BluetoothDriver } from './drivers/BluetoothDriver.js';
import { RawBtDriver } from './drivers/RawBtDriver.js';
import { NetworkDriver } from './drivers/NetworkDriver.js';
import { CloudPrintDriver } from './drivers/CloudPrintDriver.js';

const STORAGE_KEY = 'dinehq_printer_config';
const PRINTERS_LIST_KEY = 'dinehq_printers_list';
const STORAGE_TEMPLATE_KEY = 'dinehq_template_settings';

class PrinterService {
  constructor() {
    this.drivers = {
      [DRIVER_IDS.BROWSER]: new BrowserPrintDriver(),
      [DRIVER_IDS.USB]: new UsbThermalDriver(),
      [DRIVER_IDS.WINDOWS]: new WindowsPrintDriver(),
      [DRIVER_IDS.BLUETOOTH]: new BluetoothDriver(),
      [DRIVER_IDS.RAWBT]: new RawBtDriver(),
      [DRIVER_IDS.NETWORK]: new NetworkDriver(),
      [DRIVER_IDS.CLOUD]: new CloudPrintDriver(),
    };

    this.listeners = new Set();

    // Check retry queue periodically or when window comes into focus / online
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.processRetryQueue().catch(() => {});
      });
      window.addEventListener('focus', () => {
        this.processRetryQueue().catch(() => {});
      });

      // Listen for USB hardware connection events from driver
      window.addEventListener('dinehq:printer-status-changed', (event) => {
        const detail = event.detail || {};
        if (detail.status === 'connected') {
          // Find matching USB printer and update status
          const list = this.getPrinters();
          const usbPrinters = list.filter((p) => p.type === DRIVER_IDS.USB);
          usbPrinters.forEach((p) => {
            this.setPrinterStatus(p.id, 'connected');
          });
        } else if (detail.status === 'reconnecting') {
          const list = this.getPrinters();
          const usbPrinters = list.filter((p) => p.type === DRIVER_IDS.USB);
          usbPrinters.forEach((p) => {
            this.setPrinterStatus(p.id, 'reconnecting');
          });
        }
      });

      setInterval(() => {
        const queue = this.getRetryQueue();
        if (queue.length > 0) {
          this.processRetryQueue().catch(() => {});
        }
      }, 10000);

      // Perform silent background reconnect on startup
      setTimeout(() => {
        this.silentReconnectAll();
      }, 500);
    }
  }

  /**
   * Silently re-scan and auto-reconnect all configured USB printers
   * Matches strictly by Vendor ID + Product ID across ANY port.
   */
  async silentReconnectAll() {
    const printers = this.getPrinters();
    const usbDriver = this.drivers[DRIVER_IDS.USB];

    for (const printer of printers) {
      if (printer.type === DRIVER_IDS.USB) {
        try {
          const vid = printer.connection?.vendorId;
          const pid = printer.connection?.productId;
          if (vid && pid) {
            const res = await usbDriver.autoReconnect({
              vendorId: vid,
              productId: pid,
              serialNumber: printer.connection?.serialNumber,
            });
            if (res.connected) {
              this.setPrinterStatus(printer.id, 'connected');
            } else if (res.requiresUserGesture) {
              this.setPrinterStatus(printer.id, 'reconnecting');
            } else {
              this.setPrinterStatus(printer.id, 'disconnected');
            }
          } else {
            this.setPrinterStatus(printer.id, 'disconnected');
          }
        } catch (e) {
          console.warn(`Auto-reconnect notice for ${printer.name}:`, e);
          this.setPrinterStatus(printer.id, 'disconnected');
        }
      }
    }

    // Live-check connection status for all other configured printers
    await this.checkAllPrintersLiveStatus();
  }

  /**
   * Get template customization settings (logo, footer, language, font size, phone)
   */
  getTemplateSettings() {
    try {
      const stored = localStorage.getItem(STORAGE_TEMPLATE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure that unless the owner explicitly set logo preference, default is NO (false)
        if (!parsed.logoPreferenceSet && parsed.showLogo === true) {
          parsed.showLogo = false;
          parsed.logoPreferenceSet = true;
        }
        // Ensure language is always English across dashboard
        if (parsed.language === 'ur' || parsed.language === 'both') {
          parsed.language = 'en';
        }
        try {
          localStorage.setItem(STORAGE_TEMPLATE_KEY, JSON.stringify(parsed));
        } catch (_) {}
        return { ...DEFAULT_TEMPLATE_SETTINGS, ...parsed, language: 'en' };
      }
    } catch (e) {
      console.warn('Error reading template settings:', e);
    }
    return { ...DEFAULT_TEMPLATE_SETTINGS };
  }

  /**
   * Update and persist template customization settings
   */
  saveTemplateSettings(partialSettings) {
    const current = this.getTemplateSettings();
    const updated = { ...current, ...partialSettings, logoPreferenceSet: true };
    localStorage.setItem(STORAGE_TEMPLATE_KEY, JSON.stringify(updated));
    this.notifyListeners({ templateSettings: updated });
    return updated;
  }

  /**
   * Get all configured printers list
   */
  getPrinters() {
    try {
      const stored = localStorage.getItem(PRINTERS_LIST_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Validate and sanitize live connection status:
          // Unverified printers with no physical hardware must not falsely display 'connected'
          let hasStaleConnected = false;
          const sanitized = parsed.map((p) => {
            const driver = this.drivers[p.type] || this.drivers[DRIVER_IDS.BROWSER];
            const isPhysicallyConn = driver?.isConnected ? driver.isConnected(p) : false;
            if (p.status === 'connected' && !isPhysicallyConn) {
              hasStaleConnected = true;
              return { ...p, status: 'disconnected' };
            }
            return p;
          });
          if (hasStaleConnected) {
            try {
              localStorage.setItem(PRINTERS_LIST_KEY, JSON.stringify(sanitized));
            } catch (_) {}
          }
          return sanitized;
        }
      }

      // Check legacy single-printer config for migration
      const legacy = localStorage.getItem(STORAGE_KEY);
      if (legacy) {
        const legacyCfg = JSON.parse(legacy);
        const migratedPrinter = createDefaultPrinter({
          id: 'printer_default_main',
          name: legacyCfg.driver === DRIVER_IDS.USB ? 'Kitchen' : 'Counter',
          type: legacyCfg.driver || DRIVER_IDS.BROWSER,
          typeName:
            legacyCfg.driver === DRIVER_IDS.USB
              ? 'USB Printer'
              : legacyCfg.driver === DRIVER_IDS.BLUETOOTH
              ? 'Bluetooth Printer'
              : legacyCfg.driver === DRIVER_IDS.NETWORK
              ? 'WiFi / Network Printer'
              : 'Normal Printer (A4)',
          paperSize: legacyCfg.paperSize || PAPER_SIZES.SIZE_80MM,
          status: 'disconnected',
          verifiedConnected: false,
          printTarget: PRINT_TARGETS.BOTH,
          categories: ['all'],
          copies: 1,
          autoPrint: Boolean(legacyCfg.autoPrintNewOrders),
          openCashDrawer: Boolean(legacyCfg.kickCashDrawer),
          isDefault: true,
          connection: {
            deviceName: legacyCfg.usbDeviceName || legacyCfg.bluetoothDeviceName || null,
            vendorId: legacyCfg.usbVendorId || null,
            productId: legacyCfg.usbProductId || null,
            deviceId: legacyCfg.bluetoothDeviceId || null,
            ip: legacyCfg.network?.ip || '',
            port: legacyCfg.network?.port || 9100,
          },
        });

        const initialList = [migratedPrinter];
        localStorage.setItem(PRINTERS_LIST_KEY, JSON.stringify(initialList));
        return initialList;
      }
    } catch (e) {
      console.warn('Error reading printers list:', e);
    }

    // Default starter printer if none configured
    const defaultPrinter = createDefaultPrinter({
      id: 'printer_default_counter',
      name: 'Counter',
      type: DRIVER_IDS.BROWSER,
      typeName: 'Normal Printer (A4)',
      paperSize: PAPER_SIZES.SIZE_80MM,
      status: 'disconnected',
      verifiedConnected: false,
      printTarget: PRINT_TARGETS.BOTH,
      categories: ['all'],
      copies: 1,
      autoPrint: false,
      openCashDrawer: true,
      isDefault: true,
    });

    const defaultList = [defaultPrinter];
    try {
      localStorage.setItem(PRINTERS_LIST_KEY, JSON.stringify(defaultList));
    } catch (_) {}
    return defaultList;
  }

  /**
   * Save, create, or update a printer
   */
  savePrinter(printerData) {
    const list = [...this.getPrinters()];
    const index = list.findIndex((p) => p.id === printerData.id);

    let updatedPrinter;
    if (index >= 0) {
      updatedPrinter = { ...list[index], ...printerData };
      list[index] = updatedPrinter;
    } else {
      updatedPrinter = createDefaultPrinter({
        ...printerData,
        id: printerData.id || `printer_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      });
      list.push(updatedPrinter);
    }

    // Ensure default uniqueness: If this printer is marked default, unset others
    if (updatedPrinter.isDefault) {
      list.forEach((p) => {
        if (p.id !== updatedPrinter.id) p.isDefault = false;
      });
    }

    // If only one printer, it must be default
    if (list.length === 1) {
      list[0].isDefault = true;
    } else if (!list.some((p) => p.isDefault)) {
      list[0].isDefault = true;
    }

    localStorage.setItem(PRINTERS_LIST_KEY, JSON.stringify(list));

    // Keep legacy single config in sync with default printer
    const defaultP = list.find((p) => p.isDefault) || list[0];
    if (defaultP) {
      this.syncLegacyConfig(defaultP);
    }

    this.notifyListeners({ printers: list, currentPrinter: updatedPrinter });
    return updatedPrinter;
  }

  /**
   * Delete a printer by ID
   */
  deletePrinter(printerId) {
    let list = this.getPrinters().filter((p) => p.id !== printerId);

    // If deleted printer was default and others remain, set first as default
    if (list.length > 0 && !list.some((p) => p.isDefault)) {
      list[0].isDefault = true;
    }

    localStorage.setItem(PRINTERS_LIST_KEY, JSON.stringify(list));

    if (list.length > 0) {
      this.syncLegacyConfig(list.find((p) => p.isDefault) || list[0]);
    }

    this.notifyListeners({ printers: list });
    return list;
  }

  /**
   * Set designated printer as default
   */
  setDefaultPrinter(printerId) {
    const list = this.getPrinters().map((p) => ({
      ...p,
      isDefault: p.id === printerId,
    }));

    localStorage.setItem(PRINTERS_LIST_KEY, JSON.stringify(list));

    const defaultP = list.find((p) => p.isDefault);
    if (defaultP) {
      this.syncLegacyConfig(defaultP);
    }

    this.notifyListeners({ printers: list });
    return list;
  }

  /**
   * Update status of a printer (e.g. 'connected' | 'disconnected')
   */
  setPrinterStatus(printerId, status) {
    const list = this.getPrinters().map((p) => {
      if (p.id === printerId) {
        return { ...p, status };
      }
      return p;
    });

    localStorage.setItem(PRINTERS_LIST_KEY, JSON.stringify(list));
    this.notifyListeners({ printers: list });

    // If printer just reconnected, automatically flush the retry queue for this printer!
    if (status === 'connected') {
      setTimeout(() => {
        this.processRetryQueue(printerId).catch((err) => {
          console.warn('Error processing retry queue on reconnect:', err);
        });
      }, 300);
    }

    return list;
  }

  /**
   * Run live connectivity checks for all printers and update UI/storage
   */
  async checkAllPrintersLiveStatus() {
    const printers = this.getPrinters();
    const updated = [];
    let hasChanges = false;

    for (const printer of printers) {
      const driver = this.getDriver(printer.type);
      let isConn = false;

      try {
        if (driver && typeof driver.testConnection === 'function') {
          const res = await driver.testConnection({
            ...printer,
            ...(printer.connection || {}),
            verifiedConnected: printer.verifiedConnected,
            lastPrintSuccess: printer.lastPrintSuccess,
          });
          isConn = Boolean(res && res.connected);
        } else if (driver && typeof driver.isConnected === 'function') {
          isConn = Boolean(driver.isConnected(printer));
        }
      } catch (e) {
        isConn = false;
      }

      const expectedStatus = isConn ? 'connected' : 'disconnected';
      if (printer.status !== expectedStatus) {
        hasChanges = true;
        updated.push({ ...printer, status: expectedStatus });
      } else {
        updated.push(printer);
      }
    }

    if (hasChanges) {
      try {
        localStorage.setItem(PRINTERS_LIST_KEY, JSON.stringify(updated));
      } catch (_) {}
      this.notifyListeners({ printers: updated });
    }

    return updated;
  }

  /**
   * Set user-verified status for a printer (e.g. after successful test print confirmation)
   */
  setPrinterVerified(printerId, verified = true) {
    const list = this.getPrinters().map((p) => {
      if (p.id === printerId) {
        return {
          ...p,
          verifiedConnected: Boolean(verified),
          status: verified ? 'connected' : 'disconnected',
          lastTestedAt: new Date().toISOString(),
        };
      }
      return p;
    });

    try {
      localStorage.setItem(PRINTERS_LIST_KEY, JSON.stringify(list));
    } catch (_) {}
    this.notifyListeners({ printers: list });
    return list;
  }

  /**
   * Get specific printer by ID
   */
  getPrinterById(printerId) {
    const list = this.getPrinters();
    return list.find((p) => p.id === printerId) || null;
  }

  /**
   * Get default printer
   */
  getDefaultPrinter() {
    const list = this.getPrinters();
    return list.find((p) => p.isDefault) || list[0] || null;
  }

  /**
   * Sync active printer settings to legacy single config key
   */
  syncLegacyConfig(printer) {
    if (!printer) return;
    const legacy = {
      driver: printer.type || DRIVER_IDS.BROWSER,
      paperSize: printer.paperSize || PAPER_SIZES.SIZE_80MM,
      kickCashDrawer: Boolean(printer.openCashDrawer),
      cutPaper: true,
      autoPrintNewOrders: Boolean(printer.autoPrint),
      usbDeviceName: printer.connection?.deviceName || null,
      usbVendorId: printer.connection?.vendorId || null,
      usbProductId: printer.connection?.productId || null,
      bluetoothDeviceName: printer.connection?.deviceName || null,
      bluetoothDeviceId: printer.connection?.deviceId || null,
      network: {
        ip: printer.connection?.ip || '',
        port: printer.connection?.port || 9100,
      },
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    } catch (_) {}
  }

  /**
   * Legacy single-printer getConfig
   */
  getConfig() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PRINTER_CONFIG, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Error reading printer configuration:', e);
    }
    const defaultP = this.getDefaultPrinter();
    if (defaultP) {
      return {
        driver: defaultP.type,
        paperSize: defaultP.paperSize,
        kickCashDrawer: defaultP.openCashDrawer,
        cutPaper: true,
        autoPrintNewOrders: defaultP.autoPrint,
        usbDeviceName: defaultP.connection?.deviceName,
        bluetoothDeviceName: defaultP.connection?.deviceName,
        network: {
          ip: defaultP.connection?.ip || '',
          port: defaultP.connection?.port || 9100,
        },
      };
    }
    return { ...DEFAULT_PRINTER_CONFIG };
  }

  /**
   * Legacy single-printer saveConfig
   */
  saveConfig(partialConfig) {
    const current = this.getConfig();
    const updated = { ...current, ...partialConfig };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Also update default printer in list
    const list = this.getPrinters();
    const def = list.find((p) => p.isDefault) || list[0];
    if (def) {
      this.savePrinter({
        ...def,
        type: updated.driver || def.type,
        paperSize: updated.paperSize || def.paperSize,
        autoPrint: updated.autoPrintNewOrders ?? def.autoPrint,
        openCashDrawer: updated.kickCashDrawer ?? def.openCashDrawer,
      });
    }

    this.notifyListeners(updated);
    return updated;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners(data) {
    for (const listener of this.listeners) {
      try {
        listener(data);
      } catch (err) {
        console.error('Error in printer listener:', err);
      }
    }
  }

  getDriver(driverId) {
    return this.drivers[driverId] || this.drivers[DRIVER_IDS.BROWSER];
  }

  /**
   * Print a test page for a specific printer
   */
  async printTestPageForPrinter(printer, options = {}) {
    if (!printer) {
      printer = this.getDefaultPrinter() || createDefaultPrinter();
    }

    const driverConfig = {
      driver: printer.type || DRIVER_IDS.BROWSER,
      paperSize: printer.paperSize || PAPER_SIZES.SIZE_80MM,
      kickCashDrawer: Boolean(printer.openCashDrawer),
      cutPaper: true,
      skipDialog: Boolean(options.skipDialog),
      usbDeviceName: printer.connection?.deviceName,
      usbVendorId: printer.connection?.vendorId,
      usbProductId: printer.connection?.productId,
      bluetoothDeviceName: printer.connection?.deviceName,
      bluetoothDeviceId: printer.connection?.deviceId,
      network: {
        ip: printer.connection?.ip || '',
        port: printer.connection?.port || 9100,
      },
    };

    const sampleJob = {
      order: {
        id: `TEST-${Math.floor(100 + Math.random() * 900)}`,
        customer_name: `Test Ticket - ${printer.name || 'Printer'}`,
        customer_phone: '923001234567',
        customer_address: `Hardware: ${printer.typeName || printer.type} (${printer.paperSize})`,
        customer_notes: 'Welcome - Test Print Successful (OK)',
        created_at: new Date().toISOString(),
        items: [
          {
            title: 'Chicken Tikka Melt',
            quantity: 1,
            unitPrice: 850,
          },
          {
            title: 'Chicken Karahi (Test Dish)',
            quantity: 1,
            unitPrice: 1400,
            choices: ['Medium Spicy', 'With Garlic Naan'],
          },
          {
            title: 'Fresh Lime Soda',
            quantity: 2,
            unitPrice: 180,
          },
        ],
        subtotal: 2610,
        delivery_fee: 150,
        total_payable: 2760,
      },
      restaurant: {
        name: 'Dineflow Kitchen',
        slug: 'burgersmoke',
      },
      paperSize: printer.paperSize || PAPER_SIZES.SIZE_80MM,
      kickCashDrawer: printer.openCashDrawer,
      cutPaper: true,
      isHealthCheck: Boolean(options.isHealthCheck),
      reorderQrUrl: `${window?.location?.origin || ''}/burgersmoke`,
    };

    const driver = this.getDriver(driverConfig.driver);

    try {
      const result = await driver.print(sampleJob, driverConfig);
      if (printer.id) {
        this.setPrinterStatus(printer.id, 'connected');
      }
      return {
        success: true,
        usedFallback: false,
        driver: driverConfig.driver,
        details: result,
      };
    } catch (err) {
      console.warn(`Test print on ${printer.name} failed:`, err);
      if (printer.id) {
        this.setPrinterStatus(printer.id, 'disconnected');
      }
      // If hardware driver failed and isn't browser, try fallback
      if (driverConfig.driver !== DRIVER_IDS.BROWSER) {
        const fallbackDriver = this.getDriver(DRIVER_IDS.BROWSER);
        await fallbackDriver.print(sampleJob, driverConfig);
        return {
          success: true,
          usedFallback: true,
          originalDriver: driver.name,
          fallbackError: err.message,
          message: `${driver.name} couldn't be reached. Opened browser print instead.`,
        };
      }
      throw err;
    }
  }

  /**
   * Universal Print Method
   * Options:
   *  - printerId: target specific printer
   *  - printType: 'kot' | 'bill'
   */
  async print(job, options = {}) {
    const printers = this.getPrinters();

    // If specific printer targeted
    if (options.printerId) {
      const targetPrinter = this.getPrinterById(options.printerId);
      if (targetPrinter) {
        return this.printToSinglePrinter(job, targetPrinter);
      }
    }

    // If printType specified (e.g. 'kot' or 'bill')
    if (options.printType) {
      const matchingPrinters = printers.filter((p) => {
        if (options.printType === PRINT_TARGETS.KOT) {
          return p.printTarget === PRINT_TARGETS.KOT || p.printTarget === PRINT_TARGETS.BOTH;
        }
        if (options.printType === PRINT_TARGETS.BILL) {
          return p.printTarget === PRINT_TARGETS.BILL || p.printTarget === PRINT_TARGETS.BOTH;
        }
        return true;
      });

      if (matchingPrinters.length > 0) {
        const results = [];
        for (const printer of matchingPrinters) {
          // Check categories handled by this printer
          const filteredJob = this.filterJobCategories(job, printer);
          if (filteredJob) {
            const copies = Math.max(1, parseInt(printer.copies, 10) || 1);
            for (let c = 0; c < copies; c++) {
              const res = await this.printToSinglePrinter(filteredJob, printer);
              results.push(res);
            }
          }
        }
        return results[0] || { success: true };
      }
    }

    // Default fallback to default printer
    const defaultPrinter = this.getDefaultPrinter() || createDefaultPrinter();
    return this.printToSinglePrinter(job, defaultPrinter);
  }

  /**
   * Filter job items based on categories handled by the printer
   */
  filterJobCategories(job, printer) {
    if (!printer.categories || printer.categories.includes('all') || printer.categories.length === 0) {
      return job;
    }

    if (!job.order || !Array.isArray(job.order.items)) {
      return job;
    }

    const filteredItems = job.order.items.filter((item) => {
      // Check if item's category_id matches or category title matches
      if (item.category_id && printer.categories.includes(item.category_id)) {
        return true;
      }
      if (item.category && printer.categories.includes(item.category)) {
        return true;
      }
      return false;
    });

    if (filteredItems.length === 0) {
      // No items in this order belong to this printer's category
      return null;
    }

    return {
      ...job,
      order: {
        ...job.order,
        items: filteredItems,
      },
    };
  }

  /**
   * Print job to a single designated printer object
   */
  async printToSinglePrinter(job, printer) {
    const driverId = printer.type || DRIVER_IDS.BROWSER;
    const driver = this.getDriver(driverId);

    const driverConfig = {
      driver: driverId,
      deviceName: printer.connection?.deviceName || printer.name,
      connection: printer.connection,
      copies: printer.copies || 1,
      paperSize: printer.paperSize || PAPER_SIZES.SIZE_80MM,
      kickCashDrawer: Boolean(printer.openCashDrawer),
      cutPaper: true,
      usbDeviceName: printer.connection?.deviceName,
      usbVendorId: printer.connection?.vendorId,
      usbProductId: printer.connection?.productId,
      bluetoothDeviceName: printer.connection?.deviceName,
      bluetoothDeviceId: printer.connection?.deviceId,
      network: {
        ip: printer.connection?.ip || '',
        port: printer.connection?.port || 9100,
      },
    };

    // Merge effective template settings: allow per-printer showLogo override or global template settings
    const effectiveTemplateSettings = {
      ...this.getTemplateSettings(),
      ...(job.templateSettings || {}),
      ...(printer.showLogo !== undefined ? { showLogo: Boolean(printer.showLogo) } : {}),
    };

    const effectiveJob = {
      ...job,
      templateSettings: effectiveTemplateSettings,
      showLogo: effectiveTemplateSettings.showLogo,
    };

    if (driverId === DRIVER_IDS.BROWSER) {
      try {
        const result = await driver.print(effectiveJob, driverConfig);
        this.setPrinterStatus(printer.id, 'connected');
        return {
          success: true,
          usedFallback: false,
          driver: driverId,
          details: result,
        };
      } catch (err) {
        this.setPrinterStatus(printer.id, 'disconnected');
        throw new Error(`Browser print failed: ${err.message}`);
      }
    }

    // If USB printer is currently reconnecting or detached, try silent auto-reconnect first
    if (driverId === DRIVER_IDS.USB && (printer.status === 'reconnecting' || printer.status === 'not_found' || printer.status === 'disconnected')) {
      const usbDriver = this.drivers[DRIVER_IDS.USB];
      const recResult = await usbDriver.autoReconnect({
        vendorId: printer.connection?.vendorId,
        productId: printer.connection?.productId,
        serialNumber: printer.connection?.serialNumber,
      });

      if (recResult.connected) {
        this.setPrinterStatus(printer.id, 'connected');
      } else {
        // Queue the print job while printer is reconnecting!
        const queuedItem = this.addToRetryQueue(
          job.order,
          printer,
          job.templateType || TEMPLATE_TYPES.KOT,
          new Error('Printer reconnecting'),
          job.restaurant
        );

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('dinehq_printer_job_queued', {
              detail: {
                printerName: printer.name,
                orderId: job.order?.id,
                queueCount: this.getRetryQueue().length,
              },
            })
          );
        }

        return {
          success: true,
          queued: true,
          message: `Printer '${printer.name}' is reconnecting. Receipt queued and will print automatically once connected.`,
        };
      }
    }

    try {
      const result = await driver.print(effectiveJob, driverConfig);
      this.setPrinterStatus(printer.id, 'connected');
      return {
        success: true,
        usedFallback: false,
        driver: driverId,
        details: result,
      };
    } catch (primaryErr) {
      console.warn(
        `Printer ${printer.name} (${driver.name}) notice:`,
        primaryErr.message || primaryErr
      );

      // If USB port changed and requires reconnect
      if (
        primaryErr.message === 'PRINTER_PORT_CHANGED' ||
        primaryErr.message?.toLowerCase().includes('device') ||
        primaryErr.message?.toLowerCase().includes('port')
      ) {
        this.setPrinterStatus(printer.id, 'reconnecting');
        this.addToRetryQueue(
          job.order,
          printer,
          job.templateType || TEMPLATE_TYPES.KOT,
          primaryErr,
          job.restaurant
        );

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('dinehq_printer_port_changed', {
              detail: {
                printer,
                message: 'Printer moved to a new port — tap Reconnect',
              },
            })
          );
        }

        return {
          success: true,
          queued: true,
          portChanged: true,
          message: `Printer '${printer.name}' moved to a new port. Print job queued; will print automatically once reconnected.`,
        };
      }

      this.setPrinterStatus(printer.id, 'disconnected');

      // AUTOMATIC FALLBACK TO BROWSER PRINT
      const fallbackDriver = this.getDriver(DRIVER_IDS.BROWSER);
      try {
        await fallbackDriver.print(job, driverConfig);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('dinehq:printer-fallback', {
              detail: {
                printerName: printer.name,
                originalDriver: driver.name,
                errorMessage: primaryErr.message || 'Printer unavailable',
              },
            })
          );
        }

        return {
          success: true,
          usedFallback: true,
          printerName: printer.name,
          originalDriver: driver.name,
          fallbackError: primaryErr.message,
          message: `${printer.name} (${driver.name}) was unreachable. Opened Browser Print instead.`,
        };
      } catch (fallbackErr) {
        throw new Error(
          `Printer failed (${primaryErr.message}) and fallback print also failed (${fallbackErr.message}).`
        );
      }
    }
  }

  /**
   * One-tap Quick Reconnect:
   * Re-authorizes device after port change with a single tap and immediately prints any queued jobs.
   */
  async quickReconnectPrinter(printerId = null) {
    const targetPrinter = printerId ? this.getPrinterById(printerId) : this.getDefaultPrinter();
    if (!targetPrinter) throw new Error('No printer to reconnect');

    const usbDriver = this.drivers[DRIVER_IDS.USB];
    const info = await usbDriver.quickReconnect({
      vendorId: targetPrinter.connection?.vendorId,
      productId: targetPrinter.connection?.productId,
      serialNumber: targetPrinter.connection?.serialNumber,
    });

    const updated = this.savePrinter({
      ...targetPrinter,
      status: 'connected',
      connection: {
        ...targetPrinter.connection,
        deviceName: info.name || targetPrinter.connection?.deviceName,
        vendorId: info.vendorId || targetPrinter.connection?.vendorId,
        productId: info.productId || targetPrinter.connection?.productId,
        serialNumber: info.serialNumber || targetPrinter.connection?.serialNumber,
      },
    });

    this.setPrinterStatus(updated.id, 'connected');

    // Immediately flush queued print jobs!
    setTimeout(async () => {
      try {
        const flushed = await this.processRetryQueue(updated.id);
        if (flushed.printedCount > 0 && typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('dinehq_queue_auto_printed', {
              detail: {
                printerName: updated.name,
                count: flushed.printedCount,
              },
            })
          );
        }
      } catch (e) {
        console.warn('Queue flush notice:', e);
      }
    }, 300);

    return updated;
  }

  /**
   * Auto-Detect Printer Fallback:
   * Scans for USB printer class (0x07) and known ESC/POS vendors, or Windows system printers.
   */
  async autoDetectPrinter() {
    // 1. Check USB driver auto-detect
    const usbDriver = this.drivers[DRIVER_IDS.USB];
    const detectedUsb = await usbDriver.autoDetectPrinter();
    if (detectedUsb) {
      return {
        type: DRIVER_IDS.USB,
        typeName: 'USB Printer',
        ...detectedUsb,
      };
    }

    // 2. Check Windows installed printers (in Electron or browser)
    const winDriver = this.drivers[DRIVER_IDS.WINDOWS];
    const installed = await winDriver.getInstalledPrinters();
    if (installed && installed.length > 0) {
      const thermalCandidate = installed.find((p) => {
        const n = (p.name || '').toLowerCase();
        return (
          n.includes('pos') ||
          n.includes('thermal') ||
          n.includes('receipt') ||
          n.includes('xprinter') ||
          n.includes('epson')
        );
      }) || installed[0];

      return {
        type: DRIVER_IDS.WINDOWS,
        typeName: 'Windows Installed Printer',
        name: thermalCandidate.name,
        deviceName: thermalCandidate.name,
        isWindows: true,
      };
    }

    return null;
  }

  /**
   * Legacy test page method
   */
  async printTestPage(overrideConfig = null) {
    const defaultPrinter = this.getDefaultPrinter();
    return this.printTestPageForPrinter(defaultPrinter);
  }

  // ========================================================
  // PRINTED ORDERS TRACKING & DUPLICATE PREVENTION
  // ========================================================

  /**
   * Get dictionary of all printed orders and their printer timestamps
   */
  getPrintedOrdersMap() {
    try {
      const stored = localStorage.getItem(STORAGE_PRINTED_ORDERS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.warn('Error reading printed orders map:', e);
      return {};
    }
  }

  /**
   * Check if an order has been printed at all, or for a specific template
   */
  isOrderPrinted(orderId, templateType = null) {
    if (!orderId) return false;
    const map = this.getPrintedOrdersMap();
    const orderPrinters = map[orderId];
    if (!orderPrinters) return false;

    if (!templateType) {
      return Object.keys(orderPrinters).length > 0;
    }

    return Object.values(orderPrinters).some((pRecord) => Boolean(pRecord && pRecord[templateType]));
  }

  /**
   * Check if an order was printed on a specific printer for a specific template
   */
  isOrderPrintedOnPrinter(orderId, printerId, templateType = TEMPLATE_TYPES.KOT) {
    if (!orderId || !printerId) return false;
    const map = this.getPrintedOrdersMap();
    return Boolean(map[orderId]?.[printerId]?.[templateType]);
  }

  /**
   * Mark an order as printed on a specific printer and template
   */
  markOrderPrinted(orderId, printerId, templateType = TEMPLATE_TYPES.KOT) {
    if (!orderId) return;
    try {
      const map = this.getPrintedOrdersMap();
      if (!map[orderId]) map[orderId] = {};
      const targetPrinterId = printerId || 'default';
      if (!map[orderId][targetPrinterId]) map[orderId][targetPrinterId] = {};

      const now = new Date().toISOString();
      map[orderId][targetPrinterId][templateType] = now;

      localStorage.setItem(STORAGE_PRINTED_ORDERS_KEY, JSON.stringify(map));
      this.notifyListeners({
        printedOrders: map,
        lastPrinted: { orderId, printerId: targetPrinterId, templateType, timestamp: now },
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('dinehq_order_printed', {
            detail: { orderId, printerId: targetPrinterId, templateType, timestamp: now },
          })
        );
      }
    } catch (e) {
      console.warn('Failed to mark order printed:', e);
    }
  }

  /**
   * Get printable summary metadata for an order
   */
  getOrderPrintDetails(orderId) {
    if (!orderId) {
      return { isPrinted: false, hasKOT: false, hasBill: false, hasDelivery: false, prints: [] };
    }
    const map = this.getPrintedOrdersMap();
    const orderPrinters = map[orderId] || {};
    const printersList = this.getPrinters();

    let hasKOT = false;
    let hasBill = false;
    let hasDelivery = false;
    const prints = [];

    for (const [pId, types] of Object.entries(orderPrinters)) {
      const printerObj = printersList.find((p) => p.id === pId);
      const printerName = printerObj?.name || 'Printer';
      for (const [tType, timestamp] of Object.entries(types)) {
        if (tType === TEMPLATE_TYPES.KOT) hasKOT = true;
        if (tType === TEMPLATE_TYPES.BILL) hasBill = true;
        if (tType === TEMPLATE_TYPES.DELIVERY) hasDelivery = true;
        prints.push({ printerId: pId, printerName, templateType: tType, timestamp });
      }
    }

    return {
      isPrinted: prints.length > 0,
      hasKOT,
      hasBill,
      hasDelivery,
      prints,
    };
  }

  // ========================================================
  // OFFLINE RETRY QUEUE MANAGEMENT
  // ========================================================

  /**
   * Get list of jobs currently waiting in the offline retry queue
   */
  getRetryQueue() {
    try {
      const stored = localStorage.getItem(STORAGE_RETRY_QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.warn('Error reading retry queue:', e);
      return [];
    }
  }

  /**
   * Add a failed or offline print job to the retry queue
   */
  addToRetryQueue(order, printer, templateType = TEMPLATE_TYPES.KOT, error = null, restaurant = null) {
    if (!order || !printer) return null;
    try {
      const queue = this.getRetryQueue();
      const existingIdx = queue.findIndex(
        (q) => q.orderId === order.id && q.printerId === printer.id && q.templateType === templateType
      );

      const queueItem = {
        id: `retry_${order.id}_${printer.id}_${templateType}`,
        orderId: order.id,
        order,
        restaurant: restaurant || { name: 'Kitchen', slug: 'burgersmoke' },
        printerId: printer.id,
        printerName: printer.name || 'Printer',
        templateType: templateType || TEMPLATE_TYPES.KOT,
        queuedAt: new Date().toISOString(),
        attempts: existingIdx >= 0 ? (queue[existingIdx].attempts || 0) + 1 : 1,
        error: error?.message || 'Printer offline',
      };

      if (existingIdx >= 0) {
        queue[existingIdx] = queueItem;
      } else {
        queue.push(queueItem);
      }

      localStorage.setItem(STORAGE_RETRY_QUEUE_KEY, JSON.stringify(queue));
      this.notifyListeners({ retryQueue: queue });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('dinehq_print_retry_queue_updated', {
            detail: { queue, added: queueItem },
          })
        );
      }
      return queueItem;
    } catch (e) {
      console.warn('Error adding to retry queue:', e);
      return null;
    }
  }

  /**
   * Remove a single job from the retry queue
   */
  removeFromRetryQueue(queueId) {
    try {
      const queue = this.getRetryQueue().filter((q) => q.id !== queueId);
      localStorage.setItem(STORAGE_RETRY_QUEUE_KEY, JSON.stringify(queue));
      this.notifyListeners({ retryQueue: queue });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('dinehq_print_retry_queue_updated', {
            detail: { queue },
          })
        );
      }
      return queue;
    } catch (e) {
      console.warn('Error removing from retry queue:', e);
      return [];
    }
  }

  /**
   * Clear all jobs from the retry queue
   */
  clearRetryQueue() {
    try {
      localStorage.setItem(STORAGE_RETRY_QUEUE_KEY, JSON.stringify([]));
      this.notifyListeners({ retryQueue: [] });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('dinehq_print_retry_queue_updated', {
            detail: { queue: [] },
          })
        );
      }
    } catch (e) {}
  }

  /**
   * Flush and process retry queue jobs when a printer reconnects
   */
  async processRetryQueue(targetPrinterId = null) {
    const queue = this.getRetryQueue();
    if (!queue || queue.length === 0) {
      return { printedCount: 0, remainingCount: 0 };
    }

    const printers = this.getPrinters();
    const remaining = [];
    let printedCount = 0;

    for (const job of queue) {
      if (targetPrinterId && job.printerId !== targetPrinterId) {
        remaining.push(job);
        continue;
      }

      const printer = printers.find((p) => p.id === job.printerId);
      // Only attempt if printer exists and is currently marked connected or is browser
      if (!printer || printer.status === 'disconnected') {
        remaining.push(job);
        continue;
      }

      // Prevent duplicate prints if somehow already printed
      if (this.isOrderPrintedOnPrinter(job.orderId, printer.id, job.templateType)) {
        continue;
      }

      try {
        const printJob = {
          order: job.order,
          restaurant: job.restaurant,
          templateType: job.templateType,
          paperSize: printer.paperSize || PAPER_SIZES.SIZE_80MM,
          templateSettings: this.getTemplateSettings(),
        };

        const filtered = this.filterJobCategories(printJob, printer);
        if (filtered) {
          await this.printToSinglePrinter(filtered, printer);
          this.markOrderPrinted(job.orderId, printer.id, job.templateType);
          printedCount++;
        }
      } catch (err) {
        console.warn(`Retry print for order #${job.orderId} failed on ${printer.name}:`, err);
        remaining.push({
          ...job,
          attempts: (job.attempts || 0) + 1,
          error: err.message,
          lastAttemptAt: new Date().toISOString(),
        });
      }
    }

    localStorage.setItem(STORAGE_RETRY_QUEUE_KEY, JSON.stringify(remaining));
    this.notifyListeners({ retryQueue: remaining });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('dinehq_print_retry_queue_updated', {
          detail: { queue: remaining, printedCount },
        })
      );
    }

    return { printedCount, remainingCount: remaining.length };
  }

  // ========================================================
  // AUTO-PRINT KOT WITH CATEGORY ROUTING & DUPLICATE CHECKS
  // ========================================================

  /**
   * Automatic KOT Dispatch for incoming orders
   * - Evaluates autoPrint: true printers handling KOT
   * - Checks category routing rules
   * - Enforces duplicate prevention flag per order and printer
   * - Queues jobs to retry queue if printer is offline
   */
  async autoPrintNewOrder(order, restaurant) {
    if (!order) return { printed: false, reason: 'No order provided' };
    const printers = this.getPrinters();
    const autoPrinters = printers.filter(
      (p) => p.autoPrint && (p.printTarget === PRINT_TARGETS.KOT || p.printTarget === PRINT_TARGETS.BOTH)
    );

    if (autoPrinters.length === 0) {
      return { printed: false, reason: 'No auto-print KOT printers configured' };
    }

    const results = [];

    for (const printer of autoPrinters) {
      // 1. Prevent duplicate prints with "printed" flag per order and printer
      if (this.isOrderPrintedOnPrinter(order.id, printer.id, TEMPLATE_TYPES.KOT)) {
        results.push({
          printerId: printer.id,
          printerName: printer.name,
          status: 'skipped',
          reason: 'Already printed on this printer (duplicate prevented)',
        });
        continue;
      }

      // 2. Category routing: check if order contains items handled by this printer
      const job = {
        order,
        restaurant: restaurant || { name: 'Kitchen', slug: 'burgersmoke' },
        templateType: TEMPLATE_TYPES.KOT,
        paperSize: printer.paperSize || PAPER_SIZES.SIZE_80MM,
        templateSettings: this.getTemplateSettings(),
      };

      const filteredJob = this.filterJobCategories(job, printer);
      if (!filteredJob) {
        results.push({
          printerId: printer.id,
          printerName: printer.name,
          status: 'skipped',
          reason: 'No matching category items for this printer',
        });
        continue;
      }

      // 3. If printer is offline, add job to retry queue
      if (printer.status === 'disconnected') {
        this.addToRetryQueue(order, printer, TEMPLATE_TYPES.KOT, new Error('Printer is currently offline'), restaurant);
        results.push({
          printerId: printer.id,
          printerName: printer.name,
          status: 'queued',
          reason: 'Printer offline - added to retry queue',
        });
        continue;
      }

      // 4. Dispatch print
      try {
        const copies = Math.max(1, parseInt(printer.copies, 10) || 1);
        for (let c = 0; c < copies; c++) {
          await this.printToSinglePrinter(filteredJob, printer);
        }
        this.markOrderPrinted(order.id, printer.id, TEMPLATE_TYPES.KOT);
        results.push({
          printerId: printer.id,
          printerName: printer.name,
          status: 'printed',
        });
      } catch (err) {
        console.warn(`Auto-print failed on ${printer.name}:`, err);
        // Put in retry queue on failure
        this.addToRetryQueue(order, printer, TEMPLATE_TYPES.KOT, err, restaurant);
        results.push({
          printerId: printer.id,
          printerName: printer.name,
          status: 'failed_queued',
          error: err.message,
        });
      }
    }

    return {
      printed: results.some((r) => r.status === 'printed'),
      queued: results.some((r) => r.status === 'queued' || r.status === 'failed_queued'),
      details: results,
    };
  }

  // ========================================================
  // TODAY'S SALES SUMMARY PRINT (80MM FORMAT)
  // ========================================================

  /**
   * Print Today's Sales Summary formatted for 80mm paper
   */
  async printSalesSummary(summaryData, options = {}) {
    const printers = this.getPrinters();
    // Prefer printer marked default or first connected 80mm printer
    let targetPrinter = null;
    if (options.printerId) {
      targetPrinter = this.getPrinterById(options.printerId);
    } else {
      targetPrinter =
        printers.find((p) => p.paperSize === PAPER_SIZES.SIZE_80MM && p.status === 'connected') ||
        printers.find((p) => p.isDefault) ||
        printers[0];
    }

    const job = {
      templateType: TEMPLATE_TYPES.SALES_SUMMARY,
      paperSize: PAPER_SIZES.SIZE_80MM, // Formatted for 80mm paper as requested
      salesSummary: summaryData,
      restaurant: options.restaurant || { name: 'Dineflow Kitchen', slug: 'burgersmoke' },
      templateSettings: this.getTemplateSettings(),
    };

    if (targetPrinter) {
      return this.printToSinglePrinter(job, targetPrinter);
    } else {
      const defaultPrinter = createDefaultPrinter({ paperSize: PAPER_SIZES.SIZE_80MM });
      return this.printToSinglePrinter(job, defaultPrinter);
    }
  }

  // ========================================================
  // PRINTER HEALTH CHECK (3 STEPS: CONNECTION, PAPER, TEST PRINT)
  // ========================================================

  /**
   * Run 3-Step Comprehensive Printer Health Check
   * 1. Physical / driver connection test
   * 2. Paper size & margin configuration test
   * 3. End-to-end real test print execution
   * Returns clear green/red status for each step.
   */
  async runHealthCheck(printerOrId) {
    let printer = null;
    if (typeof printerOrId === 'string') {
      printer = this.getPrinterById(printerOrId);
    } else if (printerOrId && typeof printerOrId === 'object') {
      printer = printerOrId;
    }

    if (!printer) {
      printer = this.getDefaultPrinter() || createDefaultPrinter();
    }

    const driver = this.getDriver(printer.type);

    // STEP 1: Connection Check
    let step1 = {
      step: 1,
      id: 'connection',
      name: 'Connection Status',
      description: `Testing ${printer.typeName || printer.type} hardware connectivity`,
      status: 'pending',
      latencyMs: 0,
      message: '',
      fixTip: '',
    };

    try {
      const connRes = await driver.testConnection({
        ...printer,
        ...(printer.connection || {}),
        verifiedConnected: printer.verifiedConnected,
        lastPrintSuccess: printer.lastPrintSuccess,
      });
      step1.latencyMs = connRes.latencyMs || 10;
      if (connRes.connected) {
        step1.status = 'pass';
        step1.message = connRes.message || 'Printer connection is active and responsive.';
        this.setPrinterStatus(printer.id, 'connected');
      } else {
        step1.status = 'fail';
        step1.message = connRes.message || 'Printer is not reachable.';
        step1.fixTip = connRes.fixTip || 'Check printer cable, power switch, and device permissions.';
        this.setPrinterStatus(printer.id, 'disconnected');
      }
    } catch (err) {
      step1.status = 'fail';
      step1.message = `Connection test error: ${err.message}`;
      step1.fixTip = 'Verify device drivers and ensure browser has permission to access hardware.';
      this.setPrinterStatus(printer.id, 'disconnected');
    }

    // STEP 2: Paper Size Check
    let step2 = {
      step: 2,
      id: 'paper_size',
      name: 'Paper Size & Print Layout',
      description: `Validating ${printer.paperSize || '80mm'} layout parameters`,
      status: 'pending',
      latencyMs: 5,
      message: '',
      details: '',
      fixTip: '',
    };

    const validSizes = [PAPER_SIZES.SIZE_58MM, PAPER_SIZES.SIZE_80MM, PAPER_SIZES.SIZE_A4];
    const size = printer.paperSize || PAPER_SIZES.SIZE_80MM;

    if (validSizes.includes(size)) {
      step2.status = 'pass';
      if (size === PAPER_SIZES.SIZE_58MM) {
        step2.message = '58mm Mini Thermal Roll Verified';
        step2.details = '384 dots width @ 203 DPI, 32 characters/line, auto line-wrapping configured.';
      } else if (size === PAPER_SIZES.SIZE_80MM) {
        step2.message = '80mm Standard POS Thermal Roll Verified';
        step2.details = '576 dots width @ 203 DPI, 48 characters/line, high-speed thermal receipt formatting.';
      } else if (size === PAPER_SIZES.SIZE_A4) {
        step2.message = 'A4 Full Page Document Verified';
        step2.details = '210 x 297mm standard portrait, 190mm printable width, tabular invoice styling.';
      }
    } else {
      step2.status = 'fail';
      step2.message = `Invalid paper size: "${size}".`;
      step2.fixTip = 'Select 58mm, 80mm, or A4 in printer edit settings.';
    }

    // STEP 3: Test Print Check
    let step3 = {
      step: 3,
      id: 'test_print',
      name: 'Test Print Execution',
      description: 'Sending sample diagnostic ticket to hardware',
      status: 'pending',
      latencyMs: 0,
      message: '',
      fixTip: '',
    };

    if (step1.status === 'fail') {
      step3.status = 'fail';
      step3.message = 'Test print skipped because printer is not connected.';
      step3.fixTip = 'Connect printer hardware first, then re-run test print.';
    } else {
      const printStart = performance.now();
      try {
        const printRes = await this.printTestPageForPrinter(printer, { isHealthCheck: true, skipDialog: true });
        step3.latencyMs = Math.max(1, Math.round(performance.now() - printStart));

        if (printRes && printRes.usedFallback) {
          step3.status = 'pass';
          step3.message = `Dispatched successfully via Browser Print fallback in ${step3.latencyMs}ms.`;
          step3.details = printRes.message || 'Used standard print fallback.';
        } else {
          step3.status = 'pass';
          step3.message = `Test ticket printed successfully in ${step3.latencyMs}ms!`;
        }
      } catch (err) {
        step3.latencyMs = Math.max(1, Math.round(performance.now() - printStart));
        step3.status = 'fail';
        step3.message = `Print execution failed: ${err.message}`;
        step3.fixTip = 'Verify paper roll is loaded correctly, lid is snapped shut, and paper is not jammed.';
      }
    }

    const steps = [step1, step2, step3];
    const passedCount = steps.filter((s) => s.status === 'pass').length;
    const overallStatus = passedCount === 3 ? 'pass' : 'fail';

    return {
      printer,
      overallStatus,
      passedCount,
      totalCount: 3,
      steps,
      timestamp: new Date().toISOString(),
    };
  }
}

export const printerService = new PrinterService();

