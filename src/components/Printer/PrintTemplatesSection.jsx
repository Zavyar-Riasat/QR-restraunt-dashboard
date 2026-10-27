import React, { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  Receipt,
  ChefHat,
  Truck,
  Check,
  CheckCircle2,
  RefreshCw,
  Save,
  Type,
  Phone,
  Image as ImageIcon,
  RotateCcw,
} from 'lucide-react';
import { printerService } from '../../services/printer/printerService';
import {
  PAPER_SIZES,
  TEMPLATE_TYPES,
  TEMPLATE_TYPE_LABELS,
  DEFAULT_TEMPLATE_SETTINGS,
  SAMPLE_PREVIEW_ORDER,
} from '../../services/printer/printerTypes';
import PrintTemplateRenderer from './PrintTemplateRenderer';

const FOOTER_PRESETS = [
  'Thank you for ordering with us! Visit again soon.',
  'Freshly prepared with love. Rate us on Google!',
  'We appreciate your business! Please visit us again.',
  'For party orders & catering, call our restaurant phone.',
];

export default function PrintTemplatesSection({ restaurant }) {
  const [templateType, setTemplateType] = useState(TEMPLATE_TYPES.KOT);
  const [paperSize, setPaperSize] = useState(PAPER_SIZES.SIZE_80MM);
  const [settings, setSettings] = useState(() => printerService.getTemplateSettings());
  const [isSaved, setIsSaved] = useState(false);
  const [isPrintingSample, setIsPrintingSample] = useState(false);
  const [printFeedback, setPrintFeedback] = useState(null);

  useEffect(() => {
    return printerService.subscribe((data) => {
      if (data?.templateSettings) {
        setSettings(data.templateSettings);
      }
    });
  }, []);

  const handleToggle = (key) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      printerService.saveTemplateSettings(next);
      triggerSavedToast();
      return next;
    });
  };

  const handleChangeSetting = (key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      printerService.saveTemplateSettings(next);
      triggerSavedToast();
      return next;
    });
  };

  const triggerSavedToast = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handlePrintSample = async () => {
    try {
      setIsPrintingSample(true);
      setPrintFeedback(null);

      // Dispatch test print with current template configuration
      const sampleJob = {
        order: SAMPLE_PREVIEW_ORDER,
        restaurant: restaurant || {
          name: 'Dineflow Kitchen & Grill',
          slug: 'burgersmoke',
          phone: '923001234567',
          whatsapp_number: '923001234567',
        },
        paperSize,
        templateType,
        templateSettings: settings,
      };

      const res = await printerService.print(sampleJob);
      setPrintFeedback({
        type: 'success',
        text: `Sample ${TEMPLATE_TYPE_LABELS[templateType]} sent to printer!`,
      });
      setTimeout(() => setPrintFeedback(null), 4000);
    } catch (err) {
      setPrintFeedback({
        type: 'error',
        text: `Print error: ${err.message}`,
      });
      setTimeout(() => setPrintFeedback(null), 5000);
    } finally {
      setIsPrintingSample(false);
    }
  };

  const handleResetDefaults = () => {
    setSettings(DEFAULT_TEMPLATE_SETTINGS);
    printerService.saveTemplateSettings(DEFAULT_TEMPLATE_SETTINGS);
    triggerSavedToast();
  };

  return (
    <div className="bg-white border border-[#F0E4D7] rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
      {/* Header */}
      <div className="pb-5 border-b border-[#F0E4D7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-heading font-extrabold text-[#2B2118] tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#FFF1E6] text-[#F26B1D]">
              <FileText className="w-5 h-5" />
            </span>
            <span>Print Templates & Customization</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#7A6A5C] mt-1">
            Customize Kitchen Tickets, Customer Bills, and Delivery Slips with real-time 58mm, 80mm & A4 preview.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSaved && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E7F6EC] border border-[#C0E9CE] text-[#1F9D55] text-xs font-bold animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>Settings Saved</span>
            </span>
          )}

          <button
            type="button"
            disabled={isPrintingSample}
            onClick={handlePrintSample}
            className="px-4 py-2.5 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-orange-500/20 disabled:opacity-50"
          >
            {isPrintingSample ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Printer className="w-3.5 h-3.5" />
            )}
            <span>Print Sample</span>
          </button>
        </div>
      </div>

      {/* Print Feedback Notification */}
      {printFeedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 animate-fadeIn ${
            printFeedback.type === 'success'
              ? 'bg-[#E7F6EC] border border-[#C0E9CE] text-[#1F9D55]'
              : 'bg-[#FDECEC] border border-[#F9C3C5] text-[#D92D20]'
          }`}
        >
          {printFeedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#1F9D55]" />
          ) : (
            <RefreshCw className="w-4 h-4 shrink-0 text-[#D92D20]" />
          )}
          <span>{printFeedback.text}</span>
        </div>
      )}

      {/* Main 2-Column Split: Controls on Left, Live Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================
            LEFT COLUMN: Customization Controls (5 cols)
            ======================================================== */}
        <div className="lg:col-span-5 space-y-5">
          {/* 1. Template Selector Tabs */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#2B2118]">
              Select Template
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTemplateType(TEMPLATE_TYPES.KOT)}
                className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                  templateType === TEMPLATE_TYPES.KOT
                    ? 'border-[#F26B1D] bg-[#FFF1E6] text-[#F26B1D] font-bold shadow-2xs ring-1 ring-[#F26B1D]'
                    : 'border-[#F0E4D7] bg-white text-[#7A6A5C] hover:border-[#FCD8BF]'
                }`}
              >
                <ChefHat className="w-4 h-4" />
                <span className="text-[11px] leading-tight">Kitchen (KOT)</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplateType(TEMPLATE_TYPES.BILL)}
                className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                  templateType === TEMPLATE_TYPES.BILL
                    ? 'border-[#F26B1D] bg-[#FFF1E6] text-[#F26B1D] font-bold shadow-2xs ring-1 ring-[#F26B1D]'
                    : 'border-[#F0E4D7] bg-white text-[#7A6A5C] hover:border-[#FCD8BF]'
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span className="text-[11px] leading-tight">Customer Bill</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplateType(TEMPLATE_TYPES.DELIVERY)}
                className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                  templateType === TEMPLATE_TYPES.DELIVERY
                    ? 'border-[#F26B1D] bg-[#FFF1E6] text-[#F26B1D] font-bold shadow-2xs ring-1 ring-[#F26B1D]'
                    : 'border-[#F0E4D7] bg-white text-[#7A6A5C] hover:border-[#FCD8BF]'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span className="text-[11px] leading-tight">Delivery Slip</span>
              </button>
            </div>
          </div>

          {/* 2. Paper Size Selector Tabs */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#2B2118]">
              Paper Width Preview
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: PAPER_SIZES.SIZE_58MM, label: '58mm', sub: '2-Inch Pocket' },
                { id: PAPER_SIZES.SIZE_80MM, label: '80mm', sub: 'Standard POS' },
                { id: PAPER_SIZES.SIZE_A4, label: 'A4', sub: 'Full Sheet' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPaperSize(p.id)}
                  className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                    paperSize === p.id
                      ? 'border-[#F26B1D] bg-[#FFF1E6] text-[#F26B1D] font-bold shadow-2xs ring-1 ring-[#F26B1D]'
                      : 'border-[#F0E4D7] bg-white text-[#7A6A5C] hover:border-[#FCD8BF]'
                  }`}
                >
                  <p className="text-xs font-mono font-extrabold">{p.label}</p>
                  <p className="text-[10px] text-[#7A6A5C]">{p.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Owner Customization Options Card */}
          <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-4 shadow-2xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#2B2118] flex items-center justify-between">
              <span>Template Customization</span>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="text-[11px] font-semibold text-[#7A6A5C] hover:text-[#F26B1D] flex items-center gap-1 transition cursor-pointer"
                title="Restore default template settings"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </h4>

            {/* Toggle: Show Logo */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-[#F0E4D7] shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FFF1E6] text-[#F26B1D] flex items-center justify-center shrink-0">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-[#2B2118] block">Print Restaurant Logo</label>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600">
                      Default: No
                    </span>
                  </div>
                  <p className="text-[10px] text-[#7A6A5C]">Prints header brand logo on bill and customer receipts</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold ${settings.showLogo ? 'text-[#F26B1D]' : 'text-slate-400'}`}>
                  {settings.showLogo ? 'Logo ON' : 'Logo OFF'}
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(settings.showLogo)}
                  onChange={() => handleToggle('showLogo')}
                  className="w-4 h-4 accent-[#F26B1D] cursor-pointer"
                />
              </div>
            </div>

            {/* Toggle: Show Phone Number */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#F0E4D7]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#FFF1E6] text-[#F26B1D] flex items-center justify-center">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#2B2118] block">
                    Show Phone Number
                  </label>
                  <p className="text-[10px] text-[#7A6A5C]">Displays contact number on receipt</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.showPhone}
                onChange={() => handleToggle('showPhone')}
                className="w-4 h-4 accent-[#F26B1D] cursor-pointer"
              />
            </div>


            {/* Font Size: Normal / Large */}
            <div className="space-y-1.5 p-3 rounded-xl bg-white border border-[#F0E4D7]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#2B2118] flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-[#F26B1D]" />
                  <span>Font Size</span>
                </label>
                <span className="text-[10px] font-bold text-[#F26B1D] uppercase">
                  {settings.fontSize}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {[
                  { id: 'normal', label: 'Standard Normal' },
                  { id: 'large', label: 'Large (High Visibility)' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleChangeSetting('fontSize', f.id)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer border ${
                      settings.fontSize === f.id
                        ? 'bg-[#F26B1D] text-white border-[#F26B1D] shadow-2xs'
                        : 'bg-slate-50 text-[#7A6A5C] border-slate-200 hover:border-[#F26B1D]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer Message Input */}
            <div className="space-y-1.5 p-3 rounded-xl bg-white border border-[#F0E4D7]">
              <label className="text-xs font-bold text-[#2B2118] block">Footer Message</label>
              <textarea
                rows={2}
                value={settings.footerMessage || ''}
                onChange={(e) => handleChangeSetting('footerMessage', e.target.value)}
                placeholder="e.g. Thank you for dining with us! Visit again."
                className="w-full px-3 py-2 rounded-xl border border-[#F0E4D7] text-xs font-semibold focus:outline-none focus:border-[#F26B1D] resize-none"
              />
              <div className="space-y-1 pt-1">
                <span className="text-[10px] text-[#7A6A5C] font-bold block">Quick presets:</span>
                <div className="flex flex-wrap gap-1">
                  {FOOTER_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleChangeSetting('footerMessage', preset)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-[#FFF9F2] hover:bg-[#FFF1E6] text-[#7A6A5C] hover:text-[#F26B1D] border border-[#F0E4D7] transition cursor-pointer truncate max-w-full text-left"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            RIGHT COLUMN: Realistic Interactive Live Preview (7 cols)
            ======================================================== */}
        <div className="lg:col-span-7 bg-[#F8F5F2] rounded-3xl border border-[#F0E4D7] p-4 sm:p-6 space-y-4">
          {/* Preview Canvas Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#EADACD]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs shadow-green-500/50" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#2B2118]">
                Live Receipt Preview
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white border border-[#EADACD] text-[10px] font-mono font-bold text-[#7A6A5C]">
                {paperSize.toUpperCase()}
              </span>
            </div>

            <div className="text-[11px] text-[#7A6A5C]">
              Updates in real-time as you adjust settings
            </div>
          </div>

          {/* Thermal Paper Slip Frame */}
          <div className="flex justify-center items-center py-2 overflow-x-auto min-h-[520px]">
            <div className="relative transition-all duration-200">
              {/* Top tear guideline */}
              <div className="h-2 bg-slate-300 w-full rounded-t-sm border-b border-dashed border-slate-400 opacity-60" />

              {/* Rendered Live Template */}
              <PrintTemplateRenderer
                templateType={templateType}
                paperSize={paperSize}
                order={SAMPLE_PREVIEW_ORDER}
                restaurant={
                  restaurant || {
                    name: 'Dineflow Kitchen & Grill',
                    slug: 'burgersmoke',
                    phone: '923001234567',
                    whatsapp_number: '923001234567',
                    logo_url: restaurant?.logo_url || null,
                  }
                }
                settings={settings}
                isLivePrint={false}
              />

              {/* Bottom Serrated Cut Effect */}
              <div className="h-3 w-full bg-radial from-transparent to-slate-200 border-t-2 border-dotted border-slate-400 rounded-b-sm" />
            </div>
          </div>

          {/* Helpful Tip Footer */}
          <div className="text-center pt-2 text-[11px] text-[#7A6A5C]">
            💡 <span className="font-bold">Tip:</span> Long Pakistani dish names wrap automatically
            on narrow 58mm paper without truncating or overflowing.
          </div>
        </div>
      </div>
    </div>
  );
}
