import React, { useState } from 'react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { Download, Printer, Copy, Check, Sparkles, QrCode, Palette, FileText } from 'lucide-react';

export default function QRCodeManager({ restaurant }) {
  const [copied, setCopied] = useState(false);
  const [flyerTheme, setFlyerTheme] = useState('orange');

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  const menuUrl = `${origin}/${restaurant?.slug || 'burgersmoke'}`;
  const storeName = restaurant?.name || 'Burger & Smoke Co.';
  const phone = restaurant?.whatsapp_number || '923001234567';

  const PITCH_OPTIONS = [
    'Loved Your Meal? Order Direct & Enjoy Fresh Kitchen Delivery!',
    'Fresh From Our Kitchen — Order Direct On WhatsApp!',
    'Craving More? Order Direct On WhatsApp With Instant Confirmation!',
  ];
  const [headline, setHeadline] = useState(PITCH_OPTIONS[0]);

  // Download High-Resolution PNG for Print Shops
  const handleDownloadPNG = () => {
    const canvas = document.getElementById('qr-canvas-element');
    if (!canvas) return;

    const exportCanvas = document.createElement('canvas');
    const size = 1024;
    exportCanvas.width = size;
    exportCanvas.height = size;
    const ctx = exportCanvas.getContext('2d');

    // Fill clean white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Draw the QR
    ctx.drawImage(canvas, 64, 64, size - 128, size - 128);

    const link = document.createElement('a');
    link.download = `${restaurant?.slug || 'restaurant'}-flyer-qr.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(menuUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const themeStyles = {
    orange: {
      card: 'bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 text-slate-900 border-orange-300',
      badge: 'bg-orange-600 text-white',
      accent: 'text-orange-600',
      border: 'border-orange-200',
      stepBadge: 'bg-orange-100/90 text-orange-800',
    },
    emerald: {
      card: 'bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100 text-slate-900 border-emerald-300',
      badge: 'bg-emerald-600 text-white',
      accent: 'text-emerald-700',
      border: 'border-emerald-200',
      stepBadge: 'bg-emerald-100/90 text-emerald-800',
    },
    midnight: {
      card: 'bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white border-amber-500/40',
      badge: 'bg-amber-400 text-slate-950 font-black',
      accent: 'text-amber-400',
      border: 'border-slate-800',
      stepBadge: 'bg-slate-800 text-amber-400',
    },
  };

  const currentTheme = themeStyles[flyerTheme];

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6 print:p-0 print:border-none print:shadow-none">
      {/* Studio Header (Hidden on Print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-600" />
            Delivery Bag Flyer Studio
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Turn one-time delivery customers into loyal direct repeat WhatsApp buyers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copied ? 'Copied' : 'Copy Menu URL'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 stroke-[2.5]" />
            <span>Print Bag Flyers</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start print:block">
        {/* Left Column: QR Controls (Hidden on Print) */}
        <div className="no-print lg:col-span-5 space-y-5">
          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 flex flex-col items-center text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
              High-Resolution QR Code
            </span>

            <div className="p-4 bg-white rounded-2xl shadow-md border-4 border-slate-100">
              <QRCodeCanvas
                id="qr-canvas-element"
                value={menuUrl}
                size={220}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="mt-4 w-full text-left">
              <span className="text-[11px] font-bold text-slate-500">Target Web Menu URL:</span>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs font-mono text-emerald-700 font-bold truncate mt-1">
                {menuUrl}
              </div>
            </div>

            <button
              onClick={handleDownloadPNG}
              className="w-full mt-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download 1024×1024 Print PNG</span>
            </button>
          </div>

          {/* Theme Selector */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-emerald-600" />
              Choose Flyer Color Style
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFlyerTheme('orange')}
                className={`p-2.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                  flyerTheme === 'orange'
                    ? 'bg-orange-100 border-orange-400 text-orange-800'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                Sunset Orange
              </button>
              <button
                type="button"
                onClick={() => setFlyerTheme('emerald')}
                className={`p-2.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                  flyerTheme === 'emerald'
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                Fresh Emerald
              </button>
              <button
                type="button"
                onClick={() => setFlyerTheme('midnight')}
                className={`p-2.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                  flyerTheme === 'midnight'
                    ? 'bg-slate-900 border-slate-900 text-amber-300'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                Midnight Gold
              </button>
            </div>
          </div>

          {/* Headline Pitch Selector */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              Flyer Headline Pitch
            </span>
            <select
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {PITCH_OPTIONS.map((opt, i) => (
                <option key={i} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Value Prop Box */}
          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2 text-xs text-emerald-950">
            <div className="flex items-center gap-2 font-bold text-emerald-800">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>How direct ordering maximizes your profits:</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Drop this printed flyer into delivery bags. Customers order directly to your WhatsApp kitchen with zero intermediary fees and direct communication.
            </p>
          </div>
        </div>

        {/* Right Column: Bag Flyer Preview */}
        <div className="lg:col-span-7 print:w-full">
          <div className="no-print flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              Printable Bag Flyer Preview (A5 / A6)
            </span>
            <span className="text-[11px] text-slate-400">Insert into delivery bags</span>
          </div>

          {/* Flyer Card */}
          <div
            id="printable-flyer"
            className={`p-6 sm:p-8 rounded-3xl border-4 border-dashed shadow-xl relative overflow-hidden transition-all duration-300 print:shadow-none print:border-solid ${currentTheme.card}`}
          >
            <div className={`flex justify-between items-start pb-4 border-b-2 ${currentTheme.border}`}>
              <div>
                <span className={`text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full ${currentTheme.badge}`}>
                  Direct Kitchen Order
                </span>
                <h3 className="text-2xl sm:text-3xl font-heading font-black mt-2 tracking-tight">
                  {storeName}
                </h3>
              </div>
              <div className="text-right">
                <span className={`text-2xl sm:text-3xl font-heading font-black tracking-tight ${currentTheme.accent}`}>
                  DIRECT ORDER
                </span>
                <p className="text-[10px] font-extrabold uppercase tracking-wider opacity-75">
                  Fast & Fresh Delivery
                </p>
              </div>
            </div>

            <div className="py-6 flex flex-col sm:flex-row items-center gap-6">
              <div className="p-3 bg-white rounded-2xl shadow-md border-2 border-slate-200 shrink-0">
                <QRCodeSVG value={menuUrl} size={150} level="H" includeMargin={true} />
              </div>

              <div className="space-y-3 text-center sm:text-left">
                <h4 className="text-lg sm:text-xl font-heading font-black leading-tight">
                  {headline}
                </h4>
                <p className="text-xs leading-relaxed font-medium opacity-85">
                  Scan this QR code with your phone to view our full menu and send your order straight to our WhatsApp kitchen with instant confirmation.
                </p>

                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className={`p-2 rounded-xl border border-black/5 ${currentTheme.stepBadge}`}>
                    <span className="block text-[9px] font-black uppercase">Step 1</span>
                    <span className="text-[11px] font-bold">Scan QR</span>
                  </div>
                  <div className={`p-2 rounded-xl border border-black/5 ${currentTheme.stepBadge}`}>
                    <span className="block text-[9px] font-black uppercase">Step 2</span>
                    <span className="text-[11px] font-bold">Add Dishes</span>
                  </div>
                  <div className={`p-2 rounded-xl border border-black/5 ${currentTheme.stepBadge}`}>
                    <span className="block text-[9px] font-black uppercase">Step 3</span>
                    <span className="text-[11px] font-bold">WhatsApp</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={`pt-4 border-t-2 ${currentTheme.border} flex flex-col sm:flex-row items-center justify-between text-xs font-semibold gap-2 opacity-90`}>
              <div>
                <span>💬 WhatsApp Kitchen: </span>
                <span className="font-mono font-bold">+{phone}</span>
              </div>
              <div className="font-mono text-[11px] opacity-75">
                {menuUrl}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
