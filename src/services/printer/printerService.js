import {
  DRIVER_IDS,
  PAPER_SIZES,
  DEFAULT_PRINTER_CONFIG,
  PRINT_TARGETS,
  TEMPLATE_TYPES,
  DEFAULT_TEMPLATE_SETTINGS,
  createDefaultPrinter,
} from './printerTypes';
import { BrowserPrintDriver } from './drivers/BrowserPrintDriver';
import { UsbThermalDriver } from './drivers/UsbThermalDriver';
import { BluetoothDriver } from './drivers/BluetoothDriver';
import { RawBtDriver } from './drivers/RawBtDriver';
import { NetworkDriver } from './drivers/NetworkDriver';
import { CloudPrintDriver } from './drivers/CloudPrintDriver';

const STORAGE_KEY = 'dinehq_printer_config';
const PRINTERS_LIST_KEY = 'dinehq_printers_list';
const STORAGE_TEMPLATE_KEY = 'dinehq_template_settings';

class PrinterService {
  constructor() {
    this.drivers = {
      [DRIVER_IDS.BROWSER]: new BrowserPrintDriver(),
      [DRIVER_IDS.USB]: new UsbThermalDriver(),
      [DRIVER_IDS.BLUETOOTH]: new BluetoothDriver(),
      [DRIVER_IDS.RAWBT]: new RawBtDriver(),
      [DRIVER_IDS.NETWORK]: new NetworkDriver(),
      [DRIVER_IDS.CLOUD]: new CloudPrintDriver(),
    };

    this.listeners = new Set();
  }

  /**
   * Get template customization settings (logo, footer, language, font size, phone)
   */
  getTemplateSettings() {
    try {
      const stored = localStorage.getItem(STORAGE_TEMPLATE_KEY);
      if (stored) {
        return { ...DEFAULT_TEMPLATE_SETTINGS, ...JSON.parse(stored) };
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
    const updated = { ...current, ...partialSettings };
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
          return parsed;
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
          status: 'connected',
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
      status: 'connected',
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
  async printTestPageForPrinter(printer) {
    if (!printer) {
      printer = this.getDefaultPrinter() || createDefaultPrinter();
    }

    const driverConfig = {
      driver: printer.type || DRIVER_IDS.BROWSER,
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

    const sampleJob = {
      order: {
        id: `TEST-${Math.floor(100 + Math.random() * 900)}`,
        customer_name: `Test Ticket - ${printer.name || 'Printer'}`,
        customer_phone: '923001234567',
        customer_address: `Hardware: ${printer.typeName || printer.type} (${printer.paperSize})`,
        customer_notes: 'خوش آمدید - ٹیسٹ پرنٹ کامیاب (Urdu Test OK)',
        created_at: new Date().toISOString(),
        items: [
          {
            title: 'Chicken Tikka Melt',
            quantity: 1,
            unitPrice: 850,
          },
          {
            title: 'چکن کڑاہی (Urdu Test Dish)',
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
        name: 'DineHQ Kitchen',
        slug: 'burgersmoke',
      },
      paperSize: printer.paperSize || PAPER_SIZES.SIZE_80MM,
      kickCashDrawer: printer.openCashDrawer,
      cutPaper: true,
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

    if (driverId === DRIVER_IDS.BROWSER) {
      try {
        const result = await driver.print(job, driverConfig);
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

    try {
      const result = await driver.print(job, driverConfig);
      this.setPrinterStatus(printer.id, 'connected');
      return {
        success: true,
        usedFallback: false,
        driver: driverId,
        details: result,
      };
    } catch (primaryErr) {
      console.warn(
        `Printer ${printer.name} (${driver.name}) failed:`,
        primaryErr.message || primaryErr,
        '. Falling back to Browser Print.'
      );
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
   * Legacy test page method
   */
  async printTestPage(overrideConfig = null) {
    const defaultPrinter = this.getDefaultPrinter();
    return this.printTestPageForPrinter(defaultPrinter);
  }
}

export const printerService = new PrinterService();

