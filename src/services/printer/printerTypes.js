/**
 * DineHQ Printer System Types & Defaults
 */

export const DRIVER_IDS = {
  BROWSER: 'browser',
  USB: 'usb',
  WINDOWS: 'windows',
  BLUETOOTH: 'bluetooth',
  RAWBT: 'rawbt',
  NETWORK: 'network',
  CLOUD: 'cloud',
};

export const PAPER_SIZES = {
  SIZE_58MM: '58mm',
  SIZE_80MM: '80mm',
  SIZE_A4: 'a4',
  SIZE_A5: 'a5',
};

export const PAPER_SIZE_SPECS = {
  [PAPER_SIZES.SIZE_58MM]: {
    id: PAPER_SIZES.SIZE_58MM,
    label: '58mm (2-Inch Pocket Thermal)',
    shortLabel: '58mm',
    widthDots: 384,
    charWidth: 32,
    cssWidth: '58mm',
  },
  [PAPER_SIZES.SIZE_80MM]: {
    id: PAPER_SIZES.SIZE_80MM,
    label: '80mm (3-Inch Standard Counter Thermal)',
    shortLabel: '80mm',
    widthDots: 576,
    charWidth: 48,
    cssWidth: '80mm',
  },
  [PAPER_SIZES.SIZE_A5]: {
    id: PAPER_SIZES.SIZE_A5,
    label: 'A5 (Half Page Invoice)',
    shortLabel: 'A5',
    widthDots: 1000,
    charWidth: 64,
    cssWidth: '148mm',
  },
  [PAPER_SIZES.SIZE_A4]: {
    id: PAPER_SIZES.SIZE_A4,
    label: 'A4 (Full Page Invoice)',
    shortLabel: 'A4',
    widthDots: 1400,
    charWidth: 80,
    cssWidth: '210mm',
  },
};

export const DEFAULT_PRINTER_CONFIG = {
  driver: DRIVER_IDS.BROWSER,
  paperSize: PAPER_SIZES.SIZE_80MM,
  kickCashDrawer: false,
  cutPaper: true,
  autoPrintNewOrders: false,
  usbDeviceName: null,
  usbVendorId: null,
  usbProductId: null,
  bluetoothDeviceName: null,
  bluetoothDeviceId: null,
  network: {
    ip: '',
    port: 9100,
  },
  cloud: {
    enabled: false,
    apiKey: '',
    printerId: '',
  },
};

export const PRINT_TARGETS = {
  KOT: 'kot',
  BILL: 'bill',
  BOTH: 'both',
};

export const PRINT_TARGET_LABELS = {
  [PRINT_TARGETS.KOT]: 'Kitchen Order Ticket (KOT)',
  [PRINT_TARGETS.BILL]: 'Customer Bill',
  [PRINT_TARGETS.BOTH]: 'Both (KOT & Bill)',
};

export const PRINTER_TYPE_OPTIONS = [
  {
    id: DRIVER_IDS.USB,
    name: 'USB Printer',
    subtitle: 'POS Receipt Printer',
    description: 'Plugged directly into this computer or POS terminal via USB cable.',
    icon: 'Usb',
    tag: 'Direct USB',
  },
  {
    id: DRIVER_IDS.WINDOWS,
    name: 'Windows Installed Printer',
    subtitle: 'Silent Spooler / Driver',
    description: 'Prints through the Windows printer driver (e.g. POS-80, Xprinter, Epson). 100% immune to USB port changes!',
    icon: 'HardDrive',
    tag: 'Port-Independent',
  },
  {
    id: DRIVER_IDS.BLUETOOTH,
    name: 'Bluetooth Printer',
    subtitle: 'Wireless Mobile / Counter',
    description: 'Wireless thermal receipt printer paired via Bluetooth.',
    icon: 'Bluetooth',
    tag: 'Wireless',
  },
  {
    id: DRIVER_IDS.NETWORK,
    name: 'WiFi / Network Printer',
    subtitle: 'Kitchen / Bar LAN Printer',
    description: 'Connected to your local router with an Ethernet cable or WiFi IP address.',
    icon: 'Wifi',
    tag: 'LAN / IP',
  },
  {
    id: DRIVER_IDS.BROWSER,
    name: 'Normal Printer (A4)',
    subtitle: 'Laser / Inkjet / PDF',
    description: 'Standard desktop or office printer using the browser print system.',
    icon: 'Printer',
    tag: 'Universal',
  },
  {
    id: DRIVER_IDS.RAWBT,
    name: 'Android RawBT',
    subtitle: 'Android Tablet / Phone',
    description: 'Dispatches ESC/POS tickets directly to the RawBT Android driver app.',
    icon: 'Smartphone',
    tag: 'Android',
  },
];

export const createDefaultPrinter = (overrides = {}) => ({
  id: `printer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  name: 'Counter',
  type: DRIVER_IDS.BROWSER,
  typeName: 'Normal Printer (A4)',
  paperSize: PAPER_SIZES.SIZE_80MM,
  status: 'disconnected', // 'connected' | 'reconnecting' | 'disconnected' / 'not_found'
  verifiedConnected: false,
  printTarget: PRINT_TARGETS.BOTH, // 'kot' | 'bill' | 'both'
  categories: ['all'], // ['all'] or array of category IDs
  copies: 1,
  autoPrint: false,
  openCashDrawer: true,
  isDefault: true,
  connection: {
    deviceName: null,
    vendorId: null,
    productId: null,
    deviceId: null,
    ip: '',
    port: 9100,
  },
  createdAt: new Date().toISOString(),
  ...overrides,
});

export const TEMPLATE_TYPES = {
  KOT: 'kot',
  BILL: 'bill',
  DELIVERY: 'delivery',
  SALES_SUMMARY: 'sales_summary',
};

export const TEMPLATE_TYPE_LABELS = {
  [TEMPLATE_TYPES.KOT]: 'Kitchen Order Ticket (KOT)',
  [TEMPLATE_TYPES.BILL]: 'Customer Bill',
  [TEMPLATE_TYPES.DELIVERY]: 'Delivery Slip',
  [TEMPLATE_TYPES.SALES_SUMMARY]: "Today's Sales Summary (80mm)",
};

export const STORAGE_PRINTED_ORDERS_KEY = 'dinehq_printed_orders';
export const STORAGE_RETRY_QUEUE_KEY = 'dinehq_print_retry_queue';

export const DEFAULT_TEMPLATE_SETTINGS = {
  showLogo: true,
  footerMessage: 'Thank you for ordering with us! Visit again soon.',
  showPhone: true,
  language: 'both', // 'en' | 'ur' | 'both'
  fontSize: 'normal', // 'normal' | 'large'
};

export const SAMPLE_PREVIEW_ORDER = {
  id: 'DB-8421',
  table: 'Table 4',
  order_type: 'delivery',
  customer_name: 'Ahmed Khan',
  customer_phone: '923019876543',
  customer_address: 'House #42, Street 8, Sector F-7/2, Islamabad',
  customer_notes: 'Extra spicy, please include extra garlic mayo dip and napkins.',
  rider_notes: 'Call before knocking, gate code is #4920.',
  payment_method: 'Cash on Delivery',
  created_at: new Date().toISOString(),
  subtotal: 2180,
  delivery_fee: 150,
  discount: 100,
  total_payable: 2230,
  items: [
    {
      title: 'Truffle Double Smash Gourmet Burger with Melted Aged Cheddar',
      quantity: 2,
      unitPrice: 950,
      choices: ['Size: Double Patty', 'Extra Cheddar Melt', 'Sauce: Truffle Aioli'],
    },
    {
      title: 'چکن تِکّہ کڑاہی (Special Desi Tikka)',
      quantity: 1,
      unitPrice: 1200,
      choices: ['Medium Spicy', '2x Roghani Naan'],
    },
    {
      title: 'Fresh Mint Lemonade',
      quantity: 2,
      unitPrice: 180,
      choices: ['Less Ice'],
    },
  ],
};

