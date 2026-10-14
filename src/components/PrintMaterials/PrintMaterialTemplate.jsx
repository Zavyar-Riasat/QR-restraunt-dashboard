import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Sparkles,
  Phone,
  QrCode,
  CheckCircle2,
  Clock,
  Truck,
  ShieldCheck,
  Utensils,
  Store,
  ChevronRight,
} from 'lucide-react';

/**
 * Computes color palette based on theme preset or custom brand color
 */
export function getThemePalette(theme = 'orange', customColor = '#ea580c') {
  if (theme === 'custom' && customColor) {
    // Basic hex to rgb conversion
    const hex = customColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2) || '0', 16);
    const g = parseInt(hex.substring(2, 4) || '0', 16);
    const b = parseInt(hex.substring(4, 6) || '0', 16);

    return {
      name: 'Custom',
      primary: customColor,
      primaryRgb: `${r}, ${g}, ${b}`,
      primaryLight: `rgba(${r}, ${g}, ${b}, 0.08)`,
      primaryBorder: `rgba(${r}, ${g}, ${b}, 0.25)`,
      primaryText: customColor,
      cardBg: '#ffffff',
      darkBg: '#0f172a',
      badgeBg: customColor,
      badgeText: '#ffffff',
      accent: customColor,
      isDark: false,
    };
  }

  if (theme === 'emerald') {
    return {
      name: 'Fresh Emerald',
      primary: '#059669',
      primaryRgb: '5, 150, 105',
      primaryLight: '#ecfdf5',
      primaryBorder: '#a7f3d0',
      primaryText: '#047857',
      cardBg: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #e6fcf5 100%)',
      darkBg: '#064e3b',
      badgeBg: '#059669',
      badgeText: '#ffffff',
      accent: '#10b981',
      isDark: false,
    };
  }

  if (theme === 'midnight') {
    return {
      name: 'Midnight Gold',
      primary: '#f59e0b',
      primaryRgb: '245, 158, 11',
      primaryLight: '#1e293b',
      primaryBorder: 'rgba(245, 158, 11, 0.35)',
      primaryText: '#fbbf24',
      cardBg: 'linear-gradient(135deg, #090d16 0%, #0f172a 50%, #090d16 100%)',
      darkBg: '#090d16',
      badgeBg: '#f59e0b',
      badgeText: '#0f172a',
      accent: '#fbbf24',
      isDark: true,
    };
  }

  // Default: Sunset Orange
  return {
    name: 'Sunset Orange',
    primary: '#ea580c',
    primaryRgb: '234, 88, 12',
    primaryLight: '#fff7ed',
    primaryBorder: '#fed7aa',
    primaryText: '#c2410c',
    cardBg: 'linear-gradient(135deg, #fffbf5 0%, #fff7ed 50%, #ffedd5 100%)',
    darkBg: '#431407',
    badgeBg: '#ea580c',
    badgeText: '#ffffff',
    accent: '#f97316',
    isDark: false,
  };
}

/**
 * Crop marks component (3mm bleed + corner crosshairs)
 */
function CropMarks() {
  return (
    <>
      {/* Top-Left Crop Mark */}
      <div className="absolute top-0 left-0 w-4 h-4 pointer-events-none z-30">
        <div className="absolute top-0 left-3 w-px h-3 bg-slate-900/60" />
        <div className="absolute top-3 left-0 w-3 h-px bg-slate-900/60" />
      </div>
      {/* Top-Right Crop Mark */}
      <div className="absolute top-0 right-0 w-4 h-4 pointer-events-none z-30">
        <div className="absolute top-0 right-3 w-px h-3 bg-slate-900/60" />
        <div className="absolute top-3 right-0 w-3 h-px bg-slate-900/60" />
      </div>
      {/* Bottom-Left Crop Mark */}
      <div className="absolute bottom-0 left-0 w-4 h-4 pointer-events-none z-30">
        <div className="absolute bottom-0 left-3 w-px h-3 bg-slate-900/60" />
        <div className="absolute bottom-3 left-0 w-3 h-px bg-slate-900/60" />
      </div>
      {/* Bottom-Right Crop Mark */}
      <div className="absolute bottom-0 right-0 w-4 h-4 pointer-events-none z-30">
        <div className="absolute bottom-0 right-3 w-px h-3 bg-slate-900/60" />
        <div className="absolute bottom-3 right-0 w-3 h-px bg-slate-900/60" />
      </div>
      {/* Trim outline indication */}
      <div className="absolute inset-3 border border-dashed border-slate-400/40 pointer-events-none z-20" />
    </>
  );
}

/**
 * Reusable QR Code Container with Center Logo
 */
function BrandedQRCode({
  menuUrl,
  size = 140,
  logoPlateDataUrl,
  showLogo = true,
  effectiveRatio = 0.19,
  className = '',
}) {
  const imageSettings =
    showLogo && logoPlateDataUrl
      ? {
          src: logoPlateDataUrl,
          width: size * effectiveRatio,
          height: size * effectiveRatio,
          excavate: true,
        }
      : undefined;

  return (
    <div
      className={`bg-white p-2.5 rounded-2xl shadow-sm border border-slate-200/90 inline-flex flex-col items-center justify-center shrink-0 ${className}`}
    >
      <QRCodeSVG
        value={menuUrl}
        size={size}
        level="H"
        includeMargin={true}
        imageSettings={imageSettings}
      />
    </div>
  );
}

/**
 * Bilingual / Multi-language Headline & Call to Action text helper
 */
function DualLangText({
  englishText,
  urduText,
  language = 'en',
  enClass = '',
  urClass = '',
  className = '',
}) {
  if (language === 'en') {
    return <span className={enClass || className}>{englishText}</span>;
  }
  if (language === 'ur') {
    return (
      <span
        dir="rtl"
        style={{ fontFamily: 'system-ui, "Noto Nastaliq Urdu", "Urdu Typesetting", sans-serif' }}
        className={urClass || className}
      >
        {urduText}
      </span>
    );
  }
  // Both: Bilingual
  return (
    <div className={`space-y-1 ${className}`}>
      <div className={enClass}>{englishText}</div>
      <div
        dir="rtl"
        style={{ fontFamily: 'system-ui, "Noto Nastaliq Urdu", "Urdu Typesetting", sans-serif' }}
        className={`opacity-90 ${urClass || enClass}`}
      >
        {urduText}
      </div>
    </div>
  );
}

/**
 * Master Reusable Print Material Template Component
 */
export default function PrintMaterialTemplate({
  format,
  selectedSize,
  restaurant,
  menuUrl,
  headline,
  language = 'en',
  theme = 'orange',
  customColor = '#ea580c',
  showBleed = false,
  showLogo = true,
  logoPlateDataUrl = null,
  effectiveRatio = 0.19,
}) {
  const palette = getThemePalette(theme, customColor);
  const storeName = restaurant?.name || 'Burger & Smoke Co.';
  const phone = restaurant?.whatsapp_number || '923001234567';
  const logoUrl = restaurant?.logo_url;
  const isDark = palette.isDark;

  const urduHeadline =
    format.headlines?.ur?.[0] || 'مینو دیکھنے اور آرڈر کے لیے اسکین کریں';
  const urduCta = format.ctaText?.ur || 'آرڈر کے لیے اسکین کریں';
  const englishCta = format.ctaText?.en || 'Scan to Order';

  const previewType = format.previewType || 'poster';

  return (
    <div
      id="print-material-export-surface"
      className={`relative w-full h-full flex flex-col justify-between overflow-hidden transition-all duration-200 select-none ${
        showBleed ? 'p-3' : 'p-0'
      }`}
      style={{
        background: palette.cardBg,
        color: isDark ? '#f8fafc' : '#0f172a',
      }}
    >
      {/* 3mm Bleed and Crop Marks */}
      {showBleed && <CropMarks />}

      {/* INNER TEMPLATE CANVAS */}
      <div className="relative w-full h-full flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
        {/* ========================================================================= */}
        {/* 1. TABLE TENT CARD (A5 Folded, 2 Sides) */}
        {/* ========================================================================= */}
        {previewType === 'tent' && (
          <div className="h-full flex flex-col justify-between gap-3 text-center">
            {/* Side 1 (Top Side) */}
            <div className="flex-1 p-3.5 rounded-2xl bg-white/70 border border-slate-200/80 shadow-2xs flex flex-col justify-between items-center">
              <div className="flex items-center gap-2">
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt={storeName}
                    className="w-6 h-6 rounded-lg object-contain border border-slate-200 bg-white"
                  />
                )}
                <span className="font-heading font-extrabold text-sm tracking-tight text-slate-900">
                  {storeName}
                </span>
                <span
                  className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full text-white"
                  style={{ background: palette.primary }}
                >
                  Table Menu
                </span>
              </div>

              <div className="my-1.5 flex items-center justify-center gap-4">
                <BrandedQRCode
                  menuUrl={menuUrl}
                  size={110}
                  logoPlateDataUrl={logoPlateDataUrl}
                  showLogo={showLogo}
                  effectiveRatio={effectiveRatio}
                />
                <div className="text-left max-w-[150px] space-y-1">
                  <DualLangText
                    englishText={headline || 'Scan To Order From Table'}
                    urduText={urduHeadline}
                    language={language}
                    enClass="text-xs font-black text-slate-900 leading-tight block"
                    urClass="text-xs font-bold text-slate-800 leading-tight block"
                  />
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Direct kitchen WhatsApp ordering with instant receipt.
                  </p>
                </div>
              </div>

              <div className="text-[10px] font-bold text-slate-600 flex items-center gap-1.5">
                <Phone className="w-3 h-3 text-emerald-600" />
                <span>WhatsApp: +{phone}</span>
              </div>
            </div>

            {/* Central Fold Indicator */}
            <div className="relative py-1 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-dashed border-slate-400/50" />
              </div>
              <span className="relative px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-800 text-white shadow-xs">
                {language === 'ur'
                  ? 'یہاں سے موڑیں • FOLD HERE'
                  : 'FOLD HERE • یہاں سے موڑیں'}
              </span>
            </div>

            {/* Side 2 (Bottom Side) */}
            <div className="flex-1 p-3.5 rounded-2xl bg-white/70 border border-slate-200/80 shadow-2xs flex flex-col justify-between items-center">
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                {language === 'ur'
                  ? 'فوری آرڈر اور دوبارہ طلب'
                  : 'Quick Re-Order & Assistance'}
              </div>

              <div className="my-1.5 flex items-center justify-center gap-4">
                <div className="text-right max-w-[150px] space-y-1">
                  <span className="text-xs font-black text-slate-900 leading-tight block">
                    {language === 'ur'
                      ? 'کھانا ختم ہو گیا؟ اور منگوائیں!'
                      : 'Need Extra Drinks or Dessert?'}
                  </span>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Scan again to add any dish straight to your table bill.
                  </p>
                </div>
                <BrandedQRCode
                  menuUrl={menuUrl}
                  size={110}
                  logoPlateDataUrl={logoPlateDataUrl}
                  showLogo={showLogo}
                  effectiveRatio={effectiveRatio}
                />
              </div>

              <div className="text-[10px] font-mono text-slate-500 truncate max-w-full">
                {menuUrl}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. TABLE STICKER (3x3 inch / 4x4 inch) */}
        {/* ========================================================================= */}
        {previewType === 'table-sticker' && (
          <div className="h-full flex flex-col justify-between items-center text-center p-2 rounded-2xl bg-white border-2 border-slate-200 shadow-sm">
            {/* Header Tag */}
            <div
              className="w-full py-1 px-2 rounded-xl text-white font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
              style={{ background: palette.primary }}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{storeName}</span>
            </div>

            {/* Huge QR Code */}
            <div className="my-auto py-2">
              <BrandedQRCode
                menuUrl={menuUrl}
                size={160}
                logoPlateDataUrl={logoPlateDataUrl}
                showLogo={showLogo}
                effectiveRatio={effectiveRatio}
                className="p-1 border-none shadow-none"
              />
            </div>

            {/* Footer Prompt */}
            <div className="w-full space-y-1">
              <DualLangText
                englishText={headline || 'SCAN TO ORDER'}
                urduText={urduHeadline}
                language={language}
                enClass="text-xs sm:text-sm font-heading font-black tracking-tight text-slate-900 block"
                urClass="text-xs sm:text-sm font-bold text-slate-900 block"
              />
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 border-t border-slate-100 pt-1">
                <span>Table # ______</span>
                <span>+{phone}</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. POSTER (A4, A3, A2) */}
        {/* ========================================================================= */}
        {previewType === 'poster' && (
          <div className="h-full flex flex-col justify-between items-center text-center space-y-4">
            {/* Top Brand Header */}
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2.5">
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt={storeName}
                    className="w-9 h-9 rounded-xl object-contain border border-slate-200 bg-white p-0.5"
                  />
                )}
                <h1
                  className="font-heading font-black text-xl sm:text-2xl tracking-tight"
                  style={{ color: isDark ? '#ffffff' : palette.primary }}
                >
                  {storeName}
                </h1>
              </div>

              <div className="max-w-md mx-auto">
                <DualLangText
                  englishText={
                    headline ||
                    'FRESH FROM OUR KITCHEN — ORDER DIRECT ON WHATSAPP'
                  }
                  urduText={urduHeadline}
                  language={language}
                  enClass="text-base sm:text-lg font-heading font-black leading-tight tracking-tight block"
                  urClass="text-base sm:text-lg font-bold leading-tight block"
                />
              </div>
            </div>

            {/* Central High-Impact QR */}
            <div className="my-auto flex flex-col items-center">
              <div
                className="p-4 bg-white rounded-3xl shadow-xl border-4"
                style={{ borderColor: palette.primary }}
              >
                <BrandedQRCode
                  menuUrl={menuUrl}
                  size={190}
                  logoPlateDataUrl={logoPlateDataUrl}
                  showLogo={showLogo}
                  effectiveRatio={effectiveRatio}
                  className="p-0 border-none shadow-none"
                />
              </div>

              <div
                className="mt-3 px-4 py-1.5 rounded-full font-heading font-black text-xs uppercase tracking-wider text-white shadow-md"
                style={{ background: palette.primary }}
              >
                <DualLangText
                  englishText={englishCta}
                  urduText={urduCta}
                  language={language}
                />
              </div>
            </div>

            {/* 3 Step Guide */}
            <div className="w-full grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-white/70 border border-slate-200/80 shadow-2xs">
                <span className="block text-[9px] font-black uppercase text-slate-400">
                  Step 1
                </span>
                <span className="text-[11px] font-bold text-slate-800">
                  Scan QR
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white/70 border border-slate-200/80 shadow-2xs">
                <span className="block text-[9px] font-black uppercase text-slate-400">
                  Step 2
                </span>
                <span className="text-[11px] font-bold text-slate-800">
                  Choose Food
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white/70 border border-slate-200/80 shadow-2xs">
                <span className="block text-[9px] font-black uppercase text-slate-400">
                  Step 3
                </span>
                <span className="text-[11px] font-bold text-slate-800">
                  Send WhatsApp
                </span>
              </div>
            </div>

            {/* Footer Hotline */}
            <div className="w-full pt-2 border-t border-slate-200/70 flex items-center justify-between text-xs font-semibold opacity-90">
              <span className="flex items-center gap-1.5 font-bold">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>+{phone}</span>
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                {menuUrl}
              </span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. STANDEE / ROLL-UP BANNER (2x5 ft Layout, 1:2.5 Ratio) */}
        {/* ========================================================================= */}
        {previewType === 'standee' && (
          <div className="h-full flex flex-col justify-between items-center text-center py-4 px-2 space-y-4">
            {/* Top Store Branding */}
            <div className="space-y-1">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt={storeName}
                  className="w-12 h-12 mx-auto rounded-2xl object-contain border-2 border-white shadow-md bg-white p-1"
                />
              )}
              <h2 className="font-heading font-black text-xl tracking-tight mt-1">
                {storeName}
              </h2>
              <span
                className="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full text-white"
                style={{ background: palette.primary }}
              >
                Direct Kitchen Hotline
              </span>
            </div>

            {/* Catchy Headline */}
            <div className="max-w-[240px]">
              <DualLangText
                englishText={headline || 'WELCOME! SCAN TO ORDER ON WHATSAPP'}
                urduText={urduHeadline}
                language={language}
                enClass="text-sm font-heading font-black leading-snug tracking-tight block"
                urClass="text-sm font-bold leading-snug block"
              />
            </div>

            {/* Eye-Level Central QR Code */}
            <div className="my-auto flex flex-col items-center">
              <div
                className="p-4 bg-white rounded-3xl shadow-2xl border-4"
                style={{ borderColor: palette.primary }}
              >
                <BrandedQRCode
                  menuUrl={menuUrl}
                  size={175}
                  logoPlateDataUrl={logoPlateDataUrl}
                  showLogo={showLogo}
                  effectiveRatio={effectiveRatio}
                  className="p-0 border-none shadow-none"
                />
              </div>
              <div className="mt-2 text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <ChevronRight className="w-3 h-3 text-emerald-600 animate-pulse" />
                <span>Aim Camera & Tap Link</span>
              </div>
            </div>

            {/* Value Pillars */}
            <div className="w-full space-y-1.5 text-left text-xs font-semibold bg-white/70 p-3 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2 text-slate-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>0% Commission • Best Prices</span>
              </div>
              <div className="flex items-center gap-2 text-slate-800">
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Instant Kitchen Confirmation</span>
              </div>
              <div className="flex items-center gap-2 text-slate-800">
                <Truck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span>Hot & Fresh Doorstep Delivery</span>
              </div>
            </div>

            {/* Bottom Contact */}
            <div
              className="w-full py-2 px-3 rounded-xl text-white font-mono font-bold text-xs flex items-center justify-between"
              style={{ background: palette.darkBg }}
            >
              <span>WhatsApp:</span>
              <span className="text-amber-400 font-extrabold">+{phone}</span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. FLYER / PAMPHLET (A5 and A6) */}
        {/* ========================================================================= */}
        {previewType === 'flyer' && (
          <div className="h-full flex flex-col justify-between items-center text-center space-y-3">
            <div className="flex items-center justify-between w-full pb-2 border-b border-slate-200/80">
              <div className="flex items-center gap-2">
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt={storeName}
                    className="w-7 h-7 rounded-lg object-contain bg-white border border-slate-200"
                  />
                )}
                <span className="font-heading font-black text-sm text-slate-900 tracking-tight">
                  {storeName}
                </span>
              </div>
              <span
                className="text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full text-white"
                style={{ background: palette.primary }}
              >
                Special Offer
              </span>
            </div>

            <div className="max-w-xs">
              <DualLangText
                englishText={headline || 'Order Direct & Enjoy Kitchen Delivery'}
                urduText={urduHeadline}
                language={language}
                enClass="text-sm sm:text-base font-heading font-black leading-snug tracking-tight text-slate-900 block"
                urClass="text-sm sm:text-base font-bold leading-snug text-slate-900 block"
              />
            </div>

            <div className="my-auto flex items-center justify-center gap-4">
              <BrandedQRCode
                menuUrl={menuUrl}
                size={135}
                logoPlateDataUrl={logoPlateDataUrl}
                showLogo={showLogo}
                effectiveRatio={effectiveRatio}
              />
              <div className="text-left space-y-1.5 max-w-[140px]">
                <div
                  className="text-xs font-black leading-tight"
                  style={{ color: palette.primary }}
                >
                  <DualLangText
                    englishText={englishCta}
                    urduText={urduCta}
                    language={language}
                  />
                </div>
                <p className="text-[10px] text-slate-600 leading-tight">
                  Full photo menu, live modifiers, and direct dispatch to your
                  door.
                </p>
                <div className="text-[10px] font-mono font-bold text-slate-800">
                  +{phone}
                </div>
              </div>
            </div>

            <div className="w-full p-2.5 rounded-xl bg-white/80 border border-slate-200/80 text-[10px] text-slate-600 flex items-center justify-between">
              <span>🚀 0% 3rd-party markup</span>
              <span className="font-mono text-emerald-700 font-bold">
                {menuUrl}
              </span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. TRI-FOLD BROCHURE (A4 3-Panel) */}
        {/* ========================================================================= */}
        {previewType === 'trifold' && (
          <div className="h-full grid grid-cols-3 gap-3 text-left">
            {/* Panel 1: Menu Highlights */}
            <div className="p-3 rounded-2xl bg-white/80 border border-slate-200/80 flex flex-col justify-between">
              <div>
                <span
                  className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded text-white"
                  style={{ background: palette.primary }}
                >
                  Kitchen Highlights
                </span>
                <h4 className="font-heading font-black text-xs text-slate-900 mt-2">
                  Popular Categories
                </h4>
                <div className="mt-2 space-y-1.5 text-[10px] text-slate-600">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Utensils className="w-3 h-3 text-emerald-600" />
                    <span>Signature Specials</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>Sides, Fries & Add-ons</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Truck className="w-3 h-3 text-sky-600" />
                    <span>Family Combos & Shakes</span>
                  </div>
                </div>
              </div>
              <div className="text-[9px] text-slate-400 font-mono">
                Panel 1 • Inside Left
              </div>
            </div>

            {/* Panel 2: Direct Ordering Advantages */}
            <div className="p-3 rounded-2xl bg-white/80 border border-slate-200/80 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                  Why Order Direct?
                </span>
                <h4 className="font-heading font-black text-xs text-slate-900 mt-1">
                  Direct Kitchen Promise
                </h4>
                <ul className="mt-2 space-y-1 text-[10px] text-slate-600">
                  <li>• Zero platform markup fees</li>
                  <li>• Fresh, priority cooking</li>
                  <li>• Direct WhatsApp chat support</li>
                </ul>
              </div>
              <div className="text-[9px] text-slate-400 font-mono">
                Panel 2 • Inside Center
              </div>
            </div>

            {/* Panel 3: Cover / QR Call to Action */}
            <div className="p-3 rounded-2xl bg-white/90 border border-slate-200/80 flex flex-col justify-between items-center text-center">
              <div>
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt={storeName}
                    className="w-8 h-8 mx-auto rounded-lg object-contain bg-white border border-slate-200 p-0.5"
                  />
                )}
                <h3 className="font-heading font-black text-xs text-slate-900 mt-1">
                  {storeName}
                </h3>
              </div>

              <div className="my-1">
                <BrandedQRCode
                  menuUrl={menuUrl}
                  size={95}
                  logoPlateDataUrl={logoPlateDataUrl}
                  showLogo={showLogo}
                  effectiveRatio={effectiveRatio}
                  className="p-1 border-none shadow-none"
                />
                <span className="block text-[9px] font-black text-slate-700 mt-1">
                  {englishCta}
                </span>
              </div>

              <div className="text-[9px] font-mono font-bold text-slate-600">
                +{phone}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 7. DELIVERY BAG FLYER (A6) & BAG STICKER (2x2 inch round) */}
        {/* ========================================================================= */}
        {previewType === 'bag-flyer' && (
          <>
            {selectedSize?.id === '2x2-round' ? (
              // Round Sticker Seal Variant
              <div className="h-full flex flex-col items-center justify-center text-center p-3">
                <div className="w-56 h-56 rounded-full bg-white border-4 border-dashed border-emerald-600 shadow-lg flex flex-col items-center justify-between p-4 relative">
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                    ★ Freshly Sealed ★
                  </div>
                  <BrandedQRCode
                    menuUrl={menuUrl}
                    size={110}
                    logoPlateDataUrl={logoPlateDataUrl}
                    showLogo={showLogo}
                    effectiveRatio={effectiveRatio}
                    className="p-1 border-none shadow-none"
                  />
                  <div className="text-[9px] font-black text-slate-700">
                    Scan for Next Order
                  </div>
                </div>
              </div>
            ) : (
              // Standard A6 Delivery Bag Flyer
              <div className="h-full flex flex-col justify-between items-center text-center space-y-3">
                <div className="flex items-center gap-2">
                  {logoUrl && (
                    <img
                      src={logoUrl}
                      alt={storeName}
                      className="w-6 h-6 rounded-md object-contain bg-white border border-slate-200"
                    />
                  )}
                  <span className="font-heading font-black text-sm text-slate-900">
                    {storeName}
                  </span>
                </div>

                <div className="max-w-xs">
                  <DualLangText
                    englishText={
                      headline ||
                      'Loved Your Meal? Next Time Order Direct & Save!'
                    }
                    urduText={urduHeadline}
                    language={language}
                    enClass="text-sm font-heading font-black leading-snug tracking-tight text-slate-900 block"
                    urClass="text-sm font-bold leading-snug text-slate-900 block"
                  />
                </div>

                <BrandedQRCode
                  menuUrl={menuUrl}
                  size={135}
                  logoPlateDataUrl={logoPlateDataUrl}
                  showLogo={showLogo}
                  effectiveRatio={effectiveRatio}
                />

                <div className="w-full text-center space-y-1">
                  <div
                    className="text-xs font-black uppercase tracking-wider"
                    style={{ color: palette.primary }}
                  >
                    <DualLangText
                      englishText="Direct WhatsApp Kitchen"
                      urduText="براہ راست واٹس ایپ کچن"
                      language={language}
                    />
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-800">
                    +{phone}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* 8. BUSINESS CARD (3.5x2 inch Front & Back) */}
        {/* ========================================================================= */}
        {previewType === 'business-card' && (
          <div className="h-full grid grid-cols-2 gap-3 items-center">
            {/* Front Side */}
            <div className="h-full p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt={storeName}
                    className="w-8 h-8 rounded-lg object-contain bg-white border border-slate-200 p-0.5"
                  />
                )}
                <h3 className="font-heading font-black text-sm text-slate-900 mt-2">
                  {storeName}
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">
                  Direct Kitchen Ordering
                </p>
              </div>

              <div className="space-y-1 text-[10px] text-slate-700">
                <div className="flex items-center gap-1 font-mono font-bold">
                  <Phone className="w-3 h-3 text-emerald-600" />
                  <span>+{phone}</span>
                </div>
                <div className="font-mono text-[9px] text-slate-400 truncate">
                  {menuUrl}
                </div>
              </div>
            </div>

            {/* Back Side (QR Code Focus) */}
            <div
              className="h-full p-4 rounded-xl shadow-sm flex flex-col items-center justify-between text-center"
              style={{ background: palette.darkBg, color: '#ffffff' }}
            >
              <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">
                VIP Digital Menu
              </span>
              <BrandedQRCode
                menuUrl={menuUrl}
                size={90}
                logoPlateDataUrl={logoPlateDataUrl}
                showLogo={showLogo}
                effectiveRatio={effectiveRatio}
                className="p-1 border-none shadow-none"
              />
              <span className="text-[9px] font-bold text-slate-200">
                {englishCta}
              </span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 9. RECEIPT / BILL FOOTER QR (80mm Thermal Printer Width) */}
        {/* ========================================================================= */}
        {previewType === 'receipt-footer' && (
          <div className="h-full flex flex-col justify-between items-center text-center font-mono text-slate-900 p-2 bg-amber-50/20">
            <div className="w-full text-center space-y-1">
              <div className="text-[10px] text-slate-400">
                =================================
              </div>
              <div className="font-black text-xs uppercase tracking-wider">
                {storeName}
              </div>
              <div className="text-[10px] font-bold text-slate-700">
                {headline || 'THANK YOU FOR DINING WITH US!'}
              </div>
              <div className="text-[10px] text-slate-400">
                ---------------------------------
              </div>
            </div>

            <div className="my-auto py-2">
              <BrandedQRCode
                menuUrl={menuUrl}
                size={130}
                logoPlateDataUrl={logoPlateDataUrl}
                showLogo={showLogo}
                effectiveRatio={effectiveRatio}
                className="border-2 border-slate-900 p-1"
              />
            </div>

            <div className="w-full space-y-1 text-[10px]">
              <DualLangText
                englishText={englishCta}
                urduText={urduCta}
                language={language}
                enClass="font-bold block"
                urClass="font-bold block"
              />
              <div className="text-[9px] text-slate-600">
                WhatsApp: +{phone}
              </div>
              <div className="text-[10px] text-slate-400">
                =================================
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 10. WINDOW / DOOR STICKER (A4 and Round 8 inch) */}
        {/* ========================================================================= */}
        {previewType === 'window-sticker' && (
          <div className="h-full flex flex-col justify-between items-center text-center space-y-3 p-4 rounded-3xl bg-white border-4 border-slate-900 shadow-md">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-600 text-white">
                Open Daily
              </span>
              <h2 className="font-heading font-black text-xl text-slate-900 mt-2">
                {storeName}
              </h2>
              <DualLangText
                englishText={
                  headline || 'SCAN TO VIEW OUR FULL MENU FROM OUTSIDE'
                }
                urduText={urduHeadline}
                language={language}
                enClass="text-xs font-black text-slate-700 block mt-1"
                urClass="text-xs font-bold text-slate-700 block mt-1"
              />
            </div>

            <BrandedQRCode
              menuUrl={menuUrl}
              size={170}
              logoPlateDataUrl={logoPlateDataUrl}
              showLogo={showLogo}
              effectiveRatio={effectiveRatio}
            />

            <div className="w-full pt-2 border-t-2 border-slate-100 flex items-center justify-between text-xs font-bold text-slate-800">
              <span>Dine-In • Takeaway • Delivery</span>
              <span>+{phone}</span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 11. MENU CARD INSERT (A4 and A5) */}
        {/* ========================================================================= */}
        {previewType === 'menu-insert' && (
          <div className="h-full flex flex-col justify-between items-center text-center space-y-3">
            <div className="space-y-1">
              <span
                className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full text-white"
                style={{ background: palette.primary }}
              >
                Interactive Digital Menu
              </span>
              <h2 className="font-heading font-black text-xl text-slate-900 tracking-tight mt-1">
                {storeName}
              </h2>
              <DualLangText
                englishText={
                  headline || 'Want to See Photos & Custom Add-ons For Every Dish?'
                }
                urduText={urduHeadline}
                language={language}
                enClass="text-xs font-bold text-slate-600 block"
                urClass="text-xs font-bold text-slate-600 block"
              />
            </div>

            <div className="my-auto">
              <BrandedQRCode
                menuUrl={menuUrl}
                size={160}
                logoPlateDataUrl={logoPlateDataUrl}
                showLogo={showLogo}
                effectiveRatio={effectiveRatio}
              />
            </div>

            <div className="w-full space-y-2">
              <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-slate-700">
                <div className="p-2 rounded-xl bg-white/80 border border-slate-200">
                  📸 Live Dish Photos
                </div>
                <div className="p-2 rounded-xl bg-white/80 border border-slate-200">
                  🧀 Custom Cheeses & Dips
                </div>
                <div className="p-2 rounded-xl bg-white/80 border border-slate-200">
                  ⚡ Fast Kitchen Ping
                </div>
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                +{phone} • {menuUrl}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 12. COUNTER / CASHIER STAND CARD (4x6 inch) */}
        {/* ========================================================================= */}
        {previewType === 'counter-stand' && (
          <div className="h-full flex flex-col justify-between items-center text-center space-y-3 p-3">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-slate-900 text-amber-400">
                Express Register
              </span>
              <h2 className="font-heading font-black text-lg text-slate-900 mt-1">
                {storeName}
              </h2>
              <DualLangText
                englishText={headline || 'SKIP THE LINE • ORDER FROM PHONE'}
                urduText={urduHeadline}
                language={language}
                enClass="text-xs font-black text-slate-800 block"
                urClass="text-xs font-bold text-slate-800 block"
              />
            </div>

            <BrandedQRCode
              menuUrl={menuUrl}
              size={155}
              logoPlateDataUrl={logoPlateDataUrl}
              showLogo={showLogo}
              effectiveRatio={effectiveRatio}
            />

            <div className="w-full space-y-1">
              <div
                className="text-xs font-black"
                style={{ color: palette.primary }}
              >
                <DualLangText
                  englishText={englishCta}
                  urduText={urduCta}
                  language={language}
                />
              </div>
              <p className="text-[10px] text-slate-500">
                Take a seat anywhere. Send order to WhatsApp with your table
                number.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 13. FOOD BOX / PACKAGING STICKER (2x2 inch and 3x3 inch) */}
        {/* ========================================================================= */}
        {previewType === 'box-sticker' && (
          <div className="h-full flex flex-col justify-between items-center text-center p-3 rounded-2xl bg-white border-2 border-slate-200 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-900">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{storeName}</span>
            </div>

            <BrandedQRCode
              menuUrl={menuUrl}
              size={140}
              logoPlateDataUrl={logoPlateDataUrl}
              showLogo={showLogo}
              effectiveRatio={effectiveRatio}
              className="p-1 border-none shadow-none"
            />

            <div className="w-full space-y-0.5">
              <DualLangText
                englishText={headline || 'SEALED FRESH • SCAN TO RE-ORDER'}
                urduText={urduHeadline}
                language={language}
                enClass="text-[11px] font-black text-slate-900 block"
                urClass="text-[11px] font-bold text-slate-900 block"
              />
              <div className="text-[9px] font-mono text-slate-500">
                +{phone}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 14. SOCIAL MEDIA POST & STORY (1080x1080 and 1080x1920) */}
        {/* ========================================================================= */}
        {previewType === 'social-media' && (
          <div className="h-full flex flex-col justify-between items-center text-center space-y-4 p-4">
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt={storeName}
                    className="w-8 h-8 rounded-xl object-contain bg-white border border-slate-200 p-0.5"
                  />
                )}
                <span className="font-heading font-black text-lg text-slate-900">
                  {storeName}
                </span>
              </div>
              <DualLangText
                englishText={
                  headline || 'Order Direct on WhatsApp & Save Big on Every Meal!'
                }
                urduText={urduHeadline}
                language={language}
                enClass="text-sm sm:text-base font-heading font-black text-slate-800 leading-snug block"
                urClass="text-sm sm:text-base font-bold text-slate-800 leading-snug block"
              />
            </div>

            <div className="my-auto">
              <div
                className="p-4 bg-white rounded-3xl shadow-xl border-4"
                style={{ borderColor: palette.primary }}
              >
                <BrandedQRCode
                  menuUrl={menuUrl}
                  size={165}
                  logoPlateDataUrl={logoPlateDataUrl}
                  showLogo={showLogo}
                  effectiveRatio={effectiveRatio}
                  className="p-0 border-none shadow-none"
                />
              </div>
              <p className="text-[10px] font-bold text-slate-500 mt-2">
                📸 Screenshot & Scan in WhatsApp
              </p>
            </div>

            <div
              className="w-full py-2.5 px-4 rounded-2xl text-white font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md"
              style={{ background: palette.primary }}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Direct WhatsApp: +{phone}</span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 15. WALL FRAME POSTER (12x18 inch) */}
        {/* ========================================================================= */}
        {previewType === 'wall-frame' && (
          <div className="h-full flex flex-col justify-between items-center text-center space-y-4 p-6 border-8 border-slate-900 bg-white">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Heritage Kitchen
              </span>
              <h2 className="font-heading font-black text-2xl text-slate-900 tracking-tight">
                {storeName}
              </h2>
              <div className="w-12 h-0.5 bg-slate-900 mx-auto" />
              <DualLangText
                englishText={
                  headline || 'CRAFTED WITH PASSION • ORDERED WITH EASE'
                }
                urduText={urduHeadline}
                language={language}
                enClass="text-xs font-serif italic text-slate-700 block"
                urClass="text-xs font-bold text-slate-700 block"
              />
            </div>

            <div className="my-auto">
              <BrandedQRCode
                menuUrl={menuUrl}
                size={160}
                logoPlateDataUrl={logoPlateDataUrl}
                showLogo={showLogo}
                effectiveRatio={effectiveRatio}
              />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                Scan To Experience Our Kitchen
              </span>
              <div className="text-xs font-mono font-bold text-slate-900">
                +{phone}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
