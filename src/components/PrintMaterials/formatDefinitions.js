/**
 * Format Definitions for the 15 Print Material Templates
 * Each format includes print dimensions, aspect ratio, supported sizes,
 * page size rules for @page CSS, category, and multi-language headline options.
 */

export const FORMAT_CATEGORIES = [
  { id: 'all', label: 'All Formats', count: 15 },
  { id: 'dine_in', label: 'Dine-In & Tables' },
  { id: 'packaging', label: 'Takeaway & Packaging' },
  { id: 'signage', label: 'Posters & Signage' },
  { id: 'marketing', label: 'Flyers & Marketing' },
  { id: 'digital', label: 'Social & Digital' },
];

export const PRINT_FORMATS = [
  // 1. Table Tent Card (A5 folded, 2 sides)
  {
    id: 'table-tent',
    name: 'Table Tent Card',
    category: 'dine_in',
    tagline: 'Dual-sided self-standing tabletop card with fold guide',
    sizes: [
      { id: 'a5-tent', label: 'A5 Folded (2 Sides)', widthMm: 148, heightMm: 210, pdfFormat: 'a4', orientation: 'landscape', pageSize: 'A4 landscape' },
    ],
    defaultSizeId: 'a5-tent',
    aspectRatio: '148 / 210',
    aspectClass: 'aspect-[148/210]',
    previewType: 'tent',
    badge: 'Dual-Sided A5',
    headlines: {
      en: [
        'Scan To View Menu & Order From Your Table',
        'Hungry? Order Direct On WhatsApp In 3 Steps',
        'Craving Something Special? Browse Our Fresh Menu',
      ],
      ur: [
        'اپنی میز سے مینو دیکھنے اور آرڈر کے لیے اسکین کریں',
        'بھوک لگی ہے؟ واٹس ایپ پر 3 آسان مراحل میں آرڈر کریں',
        'ہمارا لائیو مینو دیکھیں اور تازہ کھانا منگوائیں',
      ],
    },
    ctaText: {
      en: 'Scan to Order from Table',
      ur: 'میز سے آرڈر کے لیے اسکین کریں',
    },
  },

  // 2. Table Sticker (3x3 inch and 4x4 inch, QR only plus "Scan to Order")
  {
    id: 'table-sticker',
    name: 'Table Sticker',
    category: 'dine_in',
    tagline: 'Minimalist high-contrast tabletop QR vinyl decal',
    sizes: [
      { id: '3x3', label: '3×3 inch (75×75 mm)', widthMm: 76, heightMm: 76, pdfFormat: [76, 76], orientation: 'portrait', pageSize: '76mm 76mm' },
      { id: '4x4', label: '4×4 inch (100×100 mm)', widthMm: 102, heightMm: 102, pdfFormat: [102, 102], orientation: 'portrait', pageSize: '102mm 102mm' },
    ],
    defaultSizeId: '3x3',
    aspectRatio: '1 / 1',
    aspectClass: 'aspect-square',
    previewType: 'table-sticker',
    badge: '3" & 4" Vinyl',
    headlines: {
      en: [
        'SCAN TO ORDER',
        'VIEW FULL DIGITAL MENU',
        'ORDER DIRECT VIA WHATSAPP',
      ],
      ur: [
        'آرڈر کے لیے اسکین کریں',
        'مکمل ڈیجیٹل مینو دیکھیں',
        'براہ راست واٹس ایپ پر آرڈر کریں',
      ],
    },
    ctaText: {
      en: 'Scan to Order',
      ur: 'آرڈر کے لیے اسکین کریں',
    },
  },

  // 3. Poster (A4, A3 and A2)
  {
    id: 'poster',
    name: 'Promotional Poster',
    category: 'signage',
    tagline: 'High-impact indoor & outdoor promotional wall poster',
    sizes: [
      { id: 'a4', label: 'A4 (210×297 mm)', widthMm: 210, heightMm: 297, pdfFormat: 'a4', orientation: 'portrait', pageSize: 'A4 portrait' },
      { id: 'a3', label: 'A3 (297×420 mm)', widthMm: 297, heightMm: 420, pdfFormat: 'a3', orientation: 'portrait', pageSize: 'A3 portrait' },
      { id: 'a2', label: 'A2 (420×594 mm)', widthMm: 420, heightMm: 594, pdfFormat: 'a2', orientation: 'portrait', pageSize: 'A2 portrait' },
    ],
    defaultSizeId: 'a4',
    aspectRatio: '210 / 297',
    aspectClass: 'aspect-[210/297]',
    previewType: 'poster',
    badge: 'A4 • A3 • A2',
    headlines: {
      en: [
        'FRESH FROM OUR KITCHEN — ORDER DIRECT & SAVE',
        'SKIP THIRD-PARTY FEES • ORDER ON WHATSAPP',
        'TASTE THE DIFFERENCE — VIEW FULL LIVE MENU',
      ],
      ur: [
        'ہمارے کچن سے تازہ کھانا — براہ راست آرڈر کریں اور بچت پائیں',
        'اضافی فیس سے بچیں • واٹس ایپ پر آرڈر کریں',
        'ہمارا لائیو مینو دیکھیں اور تازہ ترین ڈیلز سے لطف اندوز ہوں',
      ],
    },
    ctaText: {
      en: 'Scan QR with Phone Camera',
      ur: 'فون کیمرے سے کیو آر اسکین کریں',
    },
  },

  // 4. Standee / Roll-up banner (2x5 ft layout)
  {
    id: 'standee',
    name: 'Standee / Roll-Up Banner',
    category: 'signage',
    tagline: 'Floor-standing 2×5 ft roll-up banner with eye-level QR',
    sizes: [
      { id: '2x5ft', label: '2×5 ft (60×150 cm)', widthMm: 609, heightMm: 1524, pdfFormat: [609, 1524], orientation: 'portrait', pageSize: '609mm 1524mm' },
    ],
    defaultSizeId: '2x5ft',
    aspectRatio: '2 / 5',
    aspectClass: 'aspect-[2/5]',
    previewType: 'standee',
    badge: '2×5 Feet',
    headlines: {
      en: [
        'WELCOME! ORDER DIRECT FROM OUR WHATSAPP KITCHEN',
        'FAST DELIVERY • FRESH KITCHEN PREPARATION',
        'SCAN HERE FOR LIVE MENU & INSTANT WHATSAPP ORDER',
      ],
      ur: [
        'خوش آمدید! ہمارے کچن سے براہ راست واٹس ایپ پر آرڈر کریں',
        'تیز ترین ترسیل • تازہ کچن کھانا',
        'لائیو مینو اور فوری آرڈر کے لیے یہاں اسکین کریں',
      ],
    },
    ctaText: {
      en: 'Scan to View Full Live Menu',
      ur: 'مکمل لائیو مینو کے لیے اسکین کریں',
    },
  },

  // 5. Flyer / Pamphlet (A5 and A6)
  {
    id: 'flyer',
    name: 'Flyer / Pamphlet',
    category: 'marketing',
    tagline: 'Handout leaflet & neighborhood letterbox promotional flyer',
    sizes: [
      { id: 'a5', label: 'A5 (148×210 mm)', widthMm: 148, heightMm: 210, pdfFormat: 'a5', orientation: 'portrait', pageSize: 'A5 portrait' },
      { id: 'a6', label: 'A6 (105×148 mm)', widthMm: 105, heightMm: 148, pdfFormat: 'a6', orientation: 'portrait', pageSize: 'A6 portrait' },
    ],
    defaultSizeId: 'a5',
    aspectRatio: '148 / 210',
    aspectClass: 'aspect-[148/210]',
    previewType: 'flyer',
    badge: 'A5 & A6',
    headlines: {
      en: [
        'Direct Kitchen Ordering Now Available on WhatsApp!',
        'Craving Delicious Food? Order Direct in 30 Seconds',
        'Special Direct Ordering Perks & Fresh Kitchen Dispatch',
      ],
      ur: [
        'اب واٹس ایپ پر کچن سے براہ راست آرڈر کی سہولت دستیاب ہے!',
        'لذیذ کھانے کی طلب ہے؟ صرف 30 سیکنڈ میں آرڈر کریں',
        'براہ راست آرڈر کریں اور خصوصی ڈیلز حاصل کریں',
      ],
    },
    ctaText: {
      en: 'Scan to Order on WhatsApp',
      ur: 'واٹس ایپ پر آرڈر کے لیے اسکین کریں',
    },
  },

  // 6. Tri-fold Brochure (A4, with menu highlights and QR)
  {
    id: 'trifold',
    name: 'Tri-Fold Brochure',
    category: 'marketing',
    tagline: 'Standard 3-panel landscape A4 folded restaurant brochure',
    sizes: [
      { id: 'a4-trifold', label: 'A4 Tri-Fold (297×210 mm)', widthMm: 297, heightMm: 210, pdfFormat: 'a4', orientation: 'landscape', pageSize: 'A4 landscape' },
    ],
    defaultSizeId: 'a4-trifold',
    aspectRatio: '297 / 210',
    aspectClass: 'aspect-[297/210]',
    previewType: 'trifold',
    badge: '3-Panel A4',
    headlines: {
      en: [
        'OUR FULL MENU & DIRECT KITCHEN ORDERING GUIDE',
        'ARTISAN FLAVORS • FRESH PREPARATION • FAST DELIVERY',
        'EXPERIENCE OUR COMPLETE DIGITAL MENU ON WHATSAPP',
      ],
      ur: [
        'ہمارا مکمل مینو اور براہ راست کچن آرڈر گائیڈ',
        'اعلیٰ ذائقہ • تازہ تیاری • تیز ترین ڈیلیوری',
        'واٹس ایپ پر ہمارا مکمل ڈیجیٹل مینو دریافت کریں',
      ],
    },
    ctaText: {
      en: 'Scan for Digital Menu & Pricing',
      ur: 'ڈیجیٹل مینو اور قیمتوں کے لیے اسکین کریں',
    },
  },

  // 7. Delivery Bag Flyer (A6) and Bag Sticker (2x2 inch round)
  {
    id: 'bag-flyer',
    name: 'Delivery Bag Flyer & Sticker',
    category: 'packaging',
    tagline: 'Customer bag drop-in card & circular tamper-evident seal',
    sizes: [
      { id: 'a6-bag', label: 'A6 Bag Flyer (105×148 mm)', widthMm: 105, heightMm: 148, pdfFormat: 'a6', orientation: 'portrait', pageSize: 'A6 portrait' },
      { id: '2x2-round', label: '2×2 inch Round Sticker (50 mm)', widthMm: 51, heightMm: 51, pdfFormat: [51, 51], orientation: 'portrait', pageSize: '51mm 51mm' },
    ],
    defaultSizeId: 'a6-bag',
    aspectRatio: '105 / 148',
    aspectClass: 'aspect-[105/148]',
    previewType: 'bag-flyer',
    badge: 'A6 & 2" Round',
    headlines: {
      en: [
        'Loved Your Meal? Order Direct On WhatsApp Next Time!',
        'Thank You For Ordering! Enjoy Direct Kitchen Perks Next Time',
        'Freshly Sealed & Delivered! Keep This For Your Next Order',
      ],
      ur: [
        'کھانا پسند آیا؟ اگلی بار براہ راست واٹس ایپ پر آرڈر کریں!',
        'آرڈر کرنے کا شکریہ! اگلی بار کچن سے براہ راست آرڈر کریں',
        'تازہ پیک اور ڈیلیور شدہ! اگلے آرڈر کے لیے یہ پاس رکھیں',
      ],
    },
    ctaText: {
      en: 'Scan to Re-Order in Seconds',
      ur: 'چند سیکنڈ میں دوبارہ آرڈر کے لیے اسکین کریں',
    },
  },

  // 8. Business Card (3.5x2 inch) with QR on the back
  {
    id: 'business-card',
    name: 'Business Card (Dual-Sided)',
    category: 'marketing',
    tagline: 'Pocket 3.5×2 inch card: Front info & Back full-bleed QR',
    sizes: [
      { id: 'standard-bc', label: '3.5×2 inch (89×51 mm)', widthMm: 89, heightMm: 51, pdfFormat: [89, 51], orientation: 'landscape', pageSize: '89mm 51mm' },
    ],
    defaultSizeId: 'standard-bc',
    aspectRatio: '89 / 51',
    aspectClass: 'aspect-[89/51]',
    previewType: 'business-card',
    badge: '3.5×2" Front & Back',
    headlines: {
      en: [
        'DIRECT KITCHEN HOTLINE & DIGITAL MENU',
        'VIP DIRECT ORDERING CARD',
        'SCAN REVERSE TO VIEW MENU & ORDER',
      ],
      ur: [
        'کچن ہاٹ لائن اور ڈیجیٹل مینو',
        'وی آئی پی براہ راست آرڈر کارڈ',
        'مینو دیکھنے کے لیے پچھلا حصہ اسکین کریں',
      ],
    },
    ctaText: {
      en: 'Scan Back for Digital Menu',
      ur: 'ڈیجیٹل مینو کے لیے اسکین کریں',
    },
  },

  // 9. Receipt / Bill Footer QR (80mm thermal printer width)
  {
    id: 'receipt-footer',
    name: 'Receipt / Bill Footer QR',
    category: 'packaging',
    tagline: '80mm POS thermal roll continuous footer slip with QR',
    sizes: [
      { id: '80mm', label: '80mm Thermal Slip (80×140 mm)', widthMm: 80, heightMm: 140, pdfFormat: [80, 140], orientation: 'portrait', pageSize: '80mm 140mm' },
    ],
    defaultSizeId: '80mm',
    aspectRatio: '80 / 140',
    aspectClass: 'aspect-[80/140]',
    previewType: 'receipt-footer',
    badge: '80mm POS Thermal',
    headlines: {
      en: [
        'THANK YOU FOR DINING WITH US!',
        'LOVED YOUR ORDER? RE-ORDER VIA WHATSAPP',
        'KEEP THIS RECEIPT • SCAN TO RE-ORDER',
      ],
      ur: [
        'ہمارے ساتھ کھانے کا بہت شکریہ!',
        'کھانا پسند آیا؟ واٹس ایپ پر دوبارہ آرڈر کریں',
        'یہ رسید محفوظ رکھیں • دوبارہ آرڈر کے لیے اسکین کریں',
      ],
    },
    ctaText: {
      en: 'Scan Receipt to Re-Order Anytime',
      ur: 'کسی بھی وقت دوبارہ آرڈر کے لیے اسکین کریں',
    },
  },

  // 10. Window / Door Sticker (A4 and round 8 inch)
  {
    id: 'window-sticker',
    name: 'Window & Door Decal',
    category: 'signage',
    tagline: 'Storefront glass entrance vinyl sticker (A4 & 8" circle)',
    sizes: [
      { id: 'a4-decal', label: 'A4 Entrance Decal (210×297 mm)', widthMm: 210, heightMm: 297, pdfFormat: 'a4', orientation: 'portrait', pageSize: 'A4 portrait' },
      { id: '8in-round', label: '8 inch Round Decal (203 mm)', widthMm: 203, heightMm: 203, pdfFormat: [203, 203], orientation: 'portrait', pageSize: '203mm 203mm' },
    ],
    defaultSizeId: 'a4-decal',
    aspectRatio: '210 / 297',
    aspectClass: 'aspect-[210/297]',
    previewType: 'window-sticker',
    badge: 'A4 & 8" Round',
    headlines: {
      en: [
        'WE ARE OPEN! SCAN TO VIEW FULL MENU OUTSIDE',
        'BROWSE OUR MENU BEFORE YOU ENTER',
        'TAKEAWAY & DELIVERY • SCAN TO ORDER DIRECT',
      ],
      ur: [
        'ہم کھلے ہیں! باہر سے مکمل مینو دیکھنے کے لیے اسکین کریں',
        'اندر آنے سے پہلے ہمارا تازہ مینو چیک کریں',
        'ٹیک اوے اور ڈیلیوری • براہ راست آرڈر کے لیے اسکین کریں',
      ],
    },
    ctaText: {
      en: 'Scan for Contactless Menu',
      ur: 'کانٹیکٹ لیس مینو کے لیے اسکین کریں',
    },
  },

  // 11. Menu Card insert (A4 and A5)
  {
    id: 'menu-insert',
    name: 'Menu Card Insert',
    category: 'dine_in',
    tagline: 'Physical menu insert with live photos & add-ons prompt',
    sizes: [
      { id: 'a4-insert', label: 'A4 Menu Insert (210×297 mm)', widthMm: 210, heightMm: 297, pdfFormat: 'a4', orientation: 'portrait', pageSize: 'A4 portrait' },
      { id: 'a5-insert', label: 'A5 Menu Insert (148×210 mm)', widthMm: 148, heightMm: 210, pdfFormat: 'a5', orientation: 'portrait', pageSize: 'A5 portrait' },
    ],
    defaultSizeId: 'a4-insert',
    aspectRatio: '210 / 297',
    aspectClass: 'aspect-[210/297]',
    previewType: 'menu-insert',
    badge: 'A4 & A5 Insert',
    headlines: {
      en: [
        'View Live Dish Photos, Customize Add-ons & Order from Table',
        'Want to See Photos of Every Dish? Scan Our Digital Menu',
        'Explore Today’s Kitchen Specials & Order Directly on WhatsApp',
      ],
      ur: [
        'کھانوں کی تصاویر دیکھیں، اپنی مرضی کے لوازمات منتخب کریں اور آرڈر کریں',
        'ہر کھانے کی تصویر دیکھنا چاہتے ہیں؟ ڈیجیٹل مینو اسکین کریں',
        'آج کی خصوصی ڈشز دیکھیں اور واٹس ایپ پر فوری آرڈر کریں',
      ],
    },
    ctaText: {
      en: 'Scan for Live Photo Menu',
      ur: 'تصاویر والے مینو کے لیے اسکین کریں',
    },
  },

  // 12. Counter / Cashier Stand Card (4x6 inch)
  {
    id: 'counter-stand',
    name: 'Counter & Cashier Stand',
    category: 'dine_in',
    tagline: '4×6 inch acrylic desk display to skip ordering queues',
    sizes: [
      { id: '4x6', label: '4×6 inch (102×152 mm)', widthMm: 102, heightMm: 152, pdfFormat: [102, 152], orientation: 'portrait', pageSize: '102mm 152mm' },
    ],
    defaultSizeId: '4x6',
    aspectRatio: '102 / 152',
    aspectClass: 'aspect-[102/152]',
    previewType: 'counter-stand',
    badge: '4×6" Acrylic Stand',
    headlines: {
      en: [
        'SKIP THE QUEUE! ORDER & PAY DIRECT ON WHATSAPP',
        'TAKE A SEAT — SCAN HERE TO ORDER FROM YOUR PHONE',
        'FAST EXPRESS PICKUP • SCAN TO BROWSE & ORDER',
      ],
      ur: [
        'لائن سے بچیں! واٹس ایپ پر فوری آرڈر کریں',
        'آرام سے بیٹھیں — اپنے فون سے آرڈر کے لیے اسکین کریں',
        'فوری ایکسپریس پک اپ • مینو دیکھنے کے لیے اسکین کریں',
      ],
    },
    ctaText: {
      en: 'Scan to Order from Phone',
      ur: 'فون سے آرڈر کے لیے اسکین کریں',
    },
  },

  // 13. Food Box / Packaging Sticker (2x2 inch and 3x3 inch)
  {
    id: 'box-sticker',
    name: 'Food Box & Packaging Sticker',
    category: 'packaging',
    tagline: 'Self-adhesive box seal for burger boxes, pizza cartons & bowls',
    sizes: [
      { id: '2x2', label: '2×2 inch (51×51 mm)', widthMm: 51, heightMm: 51, pdfFormat: [51, 51], orientation: 'portrait', pageSize: '51mm 51mm' },
      { id: '3x3-box', label: '3×3 inch (76×76 mm)', widthMm: 76, heightMm: 76, pdfFormat: [76, 76], orientation: 'portrait', pageSize: '76mm 76mm' },
    ],
    defaultSizeId: '2x2',
    aspectRatio: '1 / 1',
    aspectClass: 'aspect-square',
    previewType: 'box-sticker',
    badge: '2" & 3" Box Seal',
    headlines: {
      en: [
        'FRESH & HOT FROM OUR KITCHEN',
        'SEALED WITH CARE • SCAN TO RE-ORDER',
        'DIRECT KITCHEN QUALITY GUARANTEED',
      ],
      ur: [
        'ہمارے کچن سے تازہ اور گرم کھانا',
        'محفوظ پیکنگ • دوبارہ آرڈر کے لیے اسکین کریں',
        'اعلیٰ معیار کی ضمانت',
      ],
    },
    ctaText: {
      en: 'Scan for Secret Deals',
      ur: 'خصوصی ڈیلز کے لیے اسکین کریں',
    },
  },

  // 14. Social Media Post and Story (1080x1080 and 1080x1920)
  {
    id: 'social-media',
    name: 'Social Media Post & Story',
    category: 'digital',
    tagline: 'HD graphics for Instagram, Facebook & WhatsApp Status',
    sizes: [
      { id: 'square-post', label: '1080×1080 Square Post (1:1)', widthMm: 1080, heightMm: 1080, isPixels: true, pdfFormat: [200, 200], orientation: 'portrait', pageSize: '200mm 200mm' },
      { id: 'story-9-16', label: '1080×1920 Story / Status (9:16)', widthMm: 1080, heightMm: 1920, isPixels: true, pdfFormat: [200, 355], orientation: 'portrait', pageSize: '200mm 355mm' },
    ],
    defaultSizeId: 'square-post',
    aspectRatio: '1 / 1',
    aspectClass: 'aspect-square',
    previewType: 'social-media',
    badge: '1080p Post & Story',
    headlines: {
      en: [
        'Order Direct on WhatsApp & Save Big on Every Meal!',
        'Scan Our QR Code or Take a Screenshot to Order Direct',
        'Fresh Deliveries Straight From Kitchen to Your Doorstep',
      ],
      ur: [
        'واٹس ایپ پر براہ راست آرڈر کریں اور ہر کھانے پر بچت کریں!',
        'ہمارا کیو آر اسکین کریں یا اسکرین شاٹ لے کر محفوظ کریں',
        'تازہ ترین پکوان براہ راست آپ کی دہلیز تک',
      ],
    },
    ctaText: {
      en: 'Screenshot or Scan with WhatsApp',
      ur: 'اسکرین شاٹ لیں یا واٹس ایپ سے اسکین کریں',
    },
  },

  // 15. Wall Frame Poster (12x18 inch)
  {
    id: 'wall-frame',
    name: 'Wall Frame Poster',
    category: 'signage',
    tagline: 'Sophisticated 12×18 inch interior wall art decor with QR',
    sizes: [
      { id: '12x18', label: '12×18 inch (305×457 mm)', widthMm: 305, heightMm: 457, pdfFormat: [305, 457], orientation: 'portrait', pageSize: '305mm 457mm' },
    ],
    defaultSizeId: '12x18',
    aspectRatio: '12 / 18',
    aspectClass: 'aspect-[12/18]',
    previewType: 'wall-frame',
    badge: '12×18" Framed',
    headlines: {
      en: [
        'CRAFTED WITH PASSION • ORDERED WITH EASE',
        'AUTHENTIC TASTE • SCAN TO EXPLORE OUR KITCHEN',
        'FROM OUR KITCHEN TO YOUR TABLE • ORDER DIRECT',
      ],
      ur: [
        'محبت سے تیار شدہ • آسانی کے ساتھ آرڈر کریں',
        'خالص ذائقہ • ہمارا کچن دریافت کرنے کے لیے اسکین کریں',
        'کچن سے براہ راست آپ کی میز تک',
      ],
    },
    ctaText: {
      en: 'Scan to View Our Heritage Menu',
      ur: 'ہمارا خصوصی مینو دیکھنے کے لیے اسکین کریں',
    },
  },
];
