import React, { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Phone,
  Smartphone,
  Headphones,
  MessageCircle,
  QrCode,
  CheckCircle2,
  Clock,
  Truck,
  ShieldCheck,
  Utensils,
  Store,
  ChevronRight,
  Move,
  Bold,
  Trash2,
  Edit3,
  Check,
  Copy,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import DraggableTextBox, { TextCornerHandles } from './DraggableTextBox';

/**
 * Official WhatsApp SVG Icon with high-fidelity path
 */
export function WhatsAppFilledIcon({ size = 14, color = '#25D366', className = '', style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={{ color, flexShrink: 0, ...style }}
    >
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

export const QrContext = React.createContext({});

/**
 * Computes color palette based on theme preset or custom brand color
 */
export function getThemePalette(theme = 'orange', customColor = '#ea580c') {
  if (theme === 'custom' && customColor) {
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
      <div className="absolute top-0 left-0 w-4 h-4 pointer-events-none z-30">
        <div className="absolute top-0 left-3 w-px h-3 bg-slate-900/60" />
        <div className="absolute top-3 left-0 w-3 h-px bg-slate-900/60" />
      </div>
      <div className="absolute top-0 right-0 w-4 h-4 pointer-events-none z-30">
        <div className="absolute top-0 right-3 w-px h-3 bg-slate-900/60" />
        <div className="absolute top-3 right-0 w-3 h-px bg-slate-900/60" />
      </div>
      <div className="absolute bottom-0 left-0 w-4 h-4 pointer-events-none z-30">
        <div className="absolute bottom-0 left-3 w-px h-3 bg-slate-900/60" />
        <div className="absolute bottom-3 left-0 w-3 h-px bg-slate-900/60" />
      </div>
      <div className="absolute bottom-0 right-0 w-4 h-4 pointer-events-none z-30">
        <div className="absolute bottom-0 right-3 w-px h-3 bg-slate-900/60" />
        <div className="absolute bottom-3 right-0 w-3 h-px bg-slate-900/60" />
      </div>
      <div className="absolute inset-3 border border-dashed border-slate-400/40 pointer-events-none z-20" />
    </>
  );
}

/**
 * Reusable QR Code Container with Center Logo & Watermark Text Directly Behind QR Plate
 * PLUS: 4 interactive corner resize handles and floating quick size toolbar
 */
function BrandedQRCode({
  menuUrl,
  size = 140,
  logoPlateDataUrl,
  showLogo = true,
  effectiveRatio = 0.19,
  className = '',
  logoSrc = null,
  watermarkText = '',
  watermarkOpacity = 0.2,
  watermarkColor = null,
  onStartResizeCorner = null,
  onQuickResize = null,
  isSelected = false,
  isDeletable = false,
  onDuplicate = null,
  onDelete = null,
  onResetPosition = null,
  onSelect = null,
}) {
  const effectiveLogo = (showLogo && (logoPlateDataUrl || logoSrc)) || null;
  const imageSettings =
    effectiveLogo
      ? {
          src: effectiveLogo,
          width: size * (effectiveRatio || 0.19),
          height: size * (effectiveRatio || 0.19),
          excavate: true,
        }
      : undefined;

  return (
    <div
      onClick={(e) => {
        if (onSelect) {
          e.stopPropagation();
          onSelect();
        }
      }}
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
    >
      {/* Floating Quick Resize & Action Toolbar (Visible only when QR is selected) */}
      {isSelected && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="no-print absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md text-white px-2 py-1 rounded-xl shadow-2xl flex items-center gap-1.5 z-40 border border-slate-700/80 select-none whitespace-nowrap opacity-95 hover:opacity-100 transition-opacity"
        >
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onQuickResize && onQuickResize(-15);
            }}
            className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-black text-sm flex items-center justify-center cursor-pointer transition active:scale-90"
            title="Make QR Smaller (-15px)"
          >
            -
          </button>

          <span className="text-xs font-mono font-bold text-amber-400 px-1">
            {size}px
          </span>

          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onQuickResize && onQuickResize(15);
            }}
            className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-black text-sm flex items-center justify-center cursor-pointer transition active:scale-90"
            title="Make QR Larger (+15px)"
          >
            +
          </button>

          {onDuplicate && (
            <>
              <div className="w-px h-3.5 bg-slate-700 mx-0.5" />
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate();
                }}
                className="px-2 py-0.5 rounded-lg bg-amber-500/25 hover:bg-amber-500/40 text-amber-300 font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition active:scale-90 border border-amber-500/40"
                title="Duplicate QR Code (Ctrl+C / Ctrl+V)"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
            </>
          )}

          {onResetPosition && (
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onResetPosition();
              }}
              className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition active:scale-90"
              title="Reset position to default slot"
            >
              <RotateCcw className="w-3 h-3 text-amber-400" />
              <span>Reset</span>
            </button>
          )}

          {isDeletable && onDelete && (
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="w-6 h-6 rounded-lg bg-rose-900/40 hover:bg-rose-600 text-rose-300 hover:text-white flex items-center justify-center cursor-pointer transition active:scale-90 border border-rose-500/30"
              title="Delete this duplicated QR"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}

          <span className="text-[9px] text-slate-300 font-medium pl-1 hidden sm:inline">
            Drag corners
          </span>
        </div>
      )}

      {/* Dynamic Watermark / Typography Directly Behind the QR Code */}
      {watermarkText && watermarkText.trim() && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-visible"
          style={{ opacity: watermarkOpacity }}
        >
          <span
            className="font-heading font-black tracking-widest uppercase text-center leading-none whitespace-nowrap transform -rotate-6 select-none"
            style={{
              fontSize: `${Math.max(18, Math.min(56, size * 0.27))}px`,
              color: watermarkColor || 'currentColor',
              textShadow: '0 2px 14px rgba(0,0,0,0.3)',
              maxWidth: `${size * 2.3}px`,
            }}
          >
            {watermarkText}
          </span>
        </div>
      )}

      {/* Protective High-Contrast White Plate */}
      <div
        onClick={(e) => {
          if (onSelect) {
            e.stopPropagation();
            onSelect();
          }
        }}
        className={`bg-white p-2.5 rounded-2xl border transition-all duration-150 inline-flex flex-col items-center justify-center relative z-10 ${
          isSelected
            ? 'ring-2 ring-amber-500 border-amber-400 shadow-2xl scale-[1.01]'
            : 'border-slate-200/90 hover:ring-2 hover:ring-amber-400/40'
        }`}
        style={{
          boxShadow: isSelected
            ? '0 12px 30px -4px rgba(245, 158, 11, 0.35)'
            : '0 8px 24px -4px rgba(0, 0, 0, 0.22)',
        }}
      >
        <QRCodeSVG
          value={menuUrl}
          size={size}
          level="H"
          includeMargin={true}
          imageSettings={imageSettings}
        />

        {/* 4 Interactive Corner Resize Handles (Visible only when QR is selected) */}
        {isSelected && onStartResizeCorner && (
          <>
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                onStartResizeCorner(e, 'nw');
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                onStartResizeCorner(e, 'nw');
              }}
              onClick={(e) => e.stopPropagation()}
              className="no-print absolute -top-2.5 -left-2.5 w-5 h-5 rounded-full bg-white border-2 border-amber-500 shadow-xl cursor-nwse-resize z-50 hover:scale-125 transition-transform flex items-center justify-center"
              title="Drag corner to resize QR"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 pointer-events-none" />
            </div>
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                onStartResizeCorner(e, 'ne');
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                onStartResizeCorner(e, 'ne');
              }}
              onClick={(e) => e.stopPropagation()}
              className="no-print absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-white border-2 border-amber-500 shadow-xl cursor-nesw-resize z-50 hover:scale-125 transition-transform flex items-center justify-center"
              title="Drag corner to resize QR"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 pointer-events-none" />
            </div>
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                onStartResizeCorner(e, 'sw');
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                onStartResizeCorner(e, 'sw');
              }}
              onClick={(e) => e.stopPropagation()}
              className="no-print absolute -bottom-2.5 -left-2.5 w-5 h-5 rounded-full bg-white border-2 border-amber-500 shadow-xl cursor-nesw-resize z-50 hover:scale-125 transition-transform flex items-center justify-center"
              title="Drag corner to resize QR"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 pointer-events-none" />
            </div>
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                onStartResizeCorner(e, 'se');
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                onStartResizeCorner(e, 'se');
              }}
              onClick={(e) => e.stopPropagation()}
              className="no-print absolute -bottom-2.5 -right-2.5 w-5 h-5 rounded-full bg-white border-2 border-amber-500 shadow-xl cursor-nwse-resize z-50 hover:scale-125 transition-transform flex items-center justify-center"
              title="Drag corner to resize QR"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 pointer-events-none" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Intelligent Slot for Template Flow
 */
function TemplateQrSlot({
  isCustomPositioned,
  onStartDrag,
  onStartResizeCorner,
  onQuickResize,
  menuUrl,
  size,
  logoPlateDataUrl,
  logoSrc,
  showLogo,
  effectiveRatio,
  watermarkText,
  watermarkOpacity,
  watermarkColor,
  isSelected: propIsSelected,
  onSelect: propOnSelect,
  onDuplicate: propOnDuplicate,
  className = '',
}) {
  const qrCtx = React.useContext(QrContext) || {};
  const isSelected = propIsSelected !== undefined ? propIsSelected : qrCtx.selectedElementId === 'qr';
  const onSelect = propOnSelect || qrCtx.onSelectElement;
  const onDuplicate = propOnDuplicate || (() => qrCtx.onDuplicateQr && qrCtx.onDuplicateQr('qr'));

  if (isCustomPositioned) {
    return (
      <div className="my-auto py-2 min-h-[36px] flex items-center justify-center pointer-events-none" />
    );
  }

  return (
    <div
      onMouseDown={onStartDrag}
      onTouchStart={onStartDrag}
      onClick={(e) => {
        e.stopPropagation();
        onSelect && onSelect('qr');
      }}
      className={`cursor-grab active:cursor-grabbing group select-none relative inline-flex transition-transform hover:scale-[1.02] ${className}`}
      title="Click to select & copy, drag to reposition anywhere in card"
    >
      <BrandedQRCode
        menuUrl={menuUrl}
        size={size}
        logoPlateDataUrl={logoPlateDataUrl}
        logoSrc={logoSrc}
        showLogo={showLogo}
        effectiveRatio={effectiveRatio}
        watermarkText={watermarkText}
        watermarkOpacity={watermarkOpacity}
        watermarkColor={watermarkColor}
        onStartResizeCorner={onStartResizeCorner}
        onQuickResize={onQuickResize}
        isSelected={isSelected}
        onDuplicate={onDuplicate}
        onSelect={onSelect ? () => onSelect('qr') : undefined}
      />
    </div>
  );
}

/**
 * Bilingual / Multi-language Headline & Call to Action text helper
 */
function DualLangText({
  englishText,
  enClass = '',
  className = '',
}) {
  return <span className={enClass || className}>{englishText}</span>;
}

/**
 * Fully Interactive Template Text Component with Drag, Bold, Font Scale, Colors & Copy
 * Gives all bottom elements and fold line the exact same powers as the top side!
 */
function InteractiveTemplateText({
  id,
  text,
  defaultText,
  config,
  isFreelyMoved = false,
  selectedElementId,
  defaultColor = '#0f172a',
  baseClass = '',
  tag = 'span',
  title = 'Click & drag to move • Double-click to edit text',
  onSelect,
  onStartDragText,
  onUpdateText,
  onToggleBold,
  onChangeFontSize,
  onSetFontSize = null,
  onSetDimensions = null,
  onToggleOrientation = null,
  onRotate = null,
  onChangeColor,
  onDuplicate,
  customStyle = null,
  innerStyle = null,
}) {
  if (isFreelyMoved) return null;

  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);

  const isSelected = selectedElementId === id;
  const effectiveText = text !== undefined && text !== null && text !== '' ? text : defaultText;
  const effectiveColor = config?.color && config.color !== 'auto' ? config.color : defaultColor;
  const isBold = config?.isBold ?? false;
  const fontSize = config?.fontSize || 12;
  const isVertical = config?.isVertical ?? false;
  const rotation = config?.rotation || 0;
  const width = config?.width || null;
  const height = config?.height || null;

  useEffect(() => {
    if (!isEditing && textRef.current && textRef.current.innerText !== effectiveText) {
      textRef.current.innerText = effectiveText;
    }
  }, [effectiveText, isEditing]);

  useEffect(() => {
    if (!isSelected) {
      setIsEditing(false);
    }
  }, [isSelected]);

  useEffect(() => {
    if (isEditing && textRef.current) {
      textRef.current.focus();
      try {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(textRef.current);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      } catch (err) {}
    }
  }, [isEditing]);

  const handleMouseDown = (e) => {
    if (isEditing) {
      e.stopPropagation();
      return;
    }
    onSelect && onSelect(id);
    onStartDragText && onStartDragText(e, id);
  };

  const handleTouchStart = (e) => {
    if (isEditing) return;
    onSelect && onSelect(id);
    onStartDragText && onStartDragText(e, id);
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect && onSelect(id);
    setIsEditing(true);
  };

  const handleBlur = (e) => {
    setIsEditing(false);
    onUpdateText && onUpdateText(id, e.currentTarget.innerText.trim());
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setIsEditing(false);
      textRef.current && textRef.current.blur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      textRef.current && textRef.current.blur();
    }
  };

  const Component = tag || 'span';

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onDoubleClick={handleDoubleClick}
      onClick={(e) => {
        e.stopPropagation();
        onSelect && onSelect(id);
      }}
      style={{
        width: width ? `${width}px` : undefined,
        height: height ? `${height}px` : undefined,
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        ...(customStyle || {}),
      }}
      className={`relative inline-block select-none rounded-lg p-0.5 transition-shadow ${
        isEditing
          ? 'cursor-text ring-2 ring-amber-500 bg-white/20'
          : isSelected
          ? 'ring-2 ring-amber-500 bg-black/10 cursor-grab active:cursor-grabbing'
          : 'hover:ring-1 hover:ring-amber-400/50 cursor-grab active:cursor-grabbing'
      } ${baseClass}`}
      title={isEditing ? 'Editing text (Press Enter to finish)' : title}
    >
      {isSelected && (
        <div
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="no-print absolute -top-11 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md text-white px-2 py-1 rounded-xl shadow-2xl flex items-center gap-1.5 z-50 border border-slate-700 whitespace-nowrap text-xs"
        >
          {isEditing ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(false);
                textRef.current && textRef.current.blur();
              }}
              className="px-2 py-0.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition shadow-xs"
              title="Finish editing"
            >
              <Check className="w-3 h-3" />
              <span>Done</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-slate-300 hover:text-amber-400 cursor-pointer flex items-center gap-1"
              title="Double-click text or click here to type"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="text-[9px]">Edit</span>
            </button>
          )}

          <button
            type="button"
            onMouseDown={(e) => onStartDragText && onStartDragText(e, id)}
            onTouchStart={(e) => onStartDragText && onStartDragText(e, id)}
            className="p-1 rounded hover:bg-slate-800 text-amber-400 cursor-move flex items-center gap-1"
            title="Click & drag to move text anywhere"
          >
            <Move className="w-3.5 h-3.5" />
            <span className="text-[9px] font-bold">Move</span>
          </button>

          {onDuplicate && (
            <button
              type="button"
              onClick={() => onDuplicate(id)}
              className="px-1.5 py-0.5 rounded text-xs text-slate-200 hover:text-amber-400 hover:bg-slate-800 cursor-pointer flex items-center gap-1 transition"
              title="Duplicate text (Ctrl+C / Ctrl+V)"
            >
              <Copy className="w-3 h-3 text-amber-400" />
              <span className="text-[9px] font-bold">Copy</span>
            </button>
          )}

          <div className="w-px h-3.5 bg-slate-700" />

          <button
            type="button"
            onClick={() => onToggleBold && onToggleBold(id)}
            className={`px-2 py-0.5 rounded text-xs font-black cursor-pointer ${
              isBold ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-200 hover:bg-slate-800'
            }`}
            title="Toggle Bold"
          >
            B
          </button>

          <button
            type="button"
            onClick={() => onChangeFontSize && onChangeFontSize(id, -2)}
            className="px-1.5 py-0.5 rounded text-xs font-bold text-slate-200 hover:bg-slate-800 cursor-pointer"
            title="Smaller Font Size"
          >
            A-
          </button>

          <span className="text-[10px] font-mono font-bold text-amber-400 min-w-[28px] text-center">
            {fontSize}px
          </span>

          <button
            type="button"
            onClick={() => onChangeFontSize && onChangeFontSize(id, 2)}
            className="px-1.5 py-0.5 rounded text-xs font-bold text-slate-200 hover:bg-slate-800 cursor-pointer"
            title="Larger Font Size"
          >
            A+
          </button>

          <div className="w-px h-3.5 bg-slate-700" />

          {/* Vertical Text Orientation Toggle */}
          <button
            type="button"
            onClick={() => onToggleOrientation && onToggleOrientation(id)}
            className={`px-1.5 py-0.5 rounded text-xs font-bold cursor-pointer transition flex items-center gap-1 ${
              isVertical
                ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                : 'text-slate-200 hover:bg-slate-800'
            }`}
            title={isVertical ? 'Switch to Horizontal text' : 'Make text Vertical (upright stacked)'}
          >
            <span className="text-[10px] font-mono">{isVertical ? '↕ Vert' : '↔ Horiz'}</span>
          </button>

          {/* Rotate 90° Button */}
          <button
            type="button"
            onClick={() => onRotate && onRotate(id)}
            className={`px-1.5 py-0.5 rounded text-xs font-bold cursor-pointer transition flex items-center gap-1 ${
              rotation ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-200 hover:bg-slate-800'
            }`}
            title={`Rotate text 90° (Current: ${rotation || 0}°)`}
          >
            <RotateCw className="w-3 h-3" />
            {rotation ? <span className="text-[9px] font-bold">{rotation}°</span> : null}
          </button>

          <div className="w-px h-3.5 bg-slate-700" />

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onChangeColor && onChangeColor(id, '#ffffff')}
              className="w-3.5 h-3.5 rounded-full bg-white border border-slate-400 cursor-pointer hover:scale-110"
              title="White"
            />
            <button
              type="button"
              onClick={() => onChangeColor && onChangeColor(id, '#0f172a')}
              className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-700 cursor-pointer hover:scale-110"
              title="Dark Charcoal"
            />
            <button
              type="button"
              onClick={() => onChangeColor && onChangeColor(id, '#ea580c')}
              className="w-3.5 h-3.5 rounded-full bg-orange-600 cursor-pointer hover:scale-110"
              title="Orange"
            />
            <button
              type="button"
              onClick={() => onChangeColor && onChangeColor(id, '#059669')}
              className="w-3.5 h-3.5 rounded-full bg-emerald-600 cursor-pointer hover:scale-110"
              title="Emerald"
            />
            <button
              type="button"
              onClick={() => onChangeColor && onChangeColor(id, '#f59e0b')}
              className="w-3.5 h-3.5 rounded-full bg-amber-500 cursor-pointer hover:scale-110"
              title="Amber Gold"
            />
          </div>
        </div>
      )}

      <Component
        ref={textRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onInput={(e) => onUpdateText && onUpdateText(id, e.currentTarget.innerText)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={{
          fontSize: `${fontSize}px`,
          fontWeight: isBold ? 900 : 500,
          color: effectiveColor,
          writingMode: isVertical ? 'vertical-rl' : 'horizontal-tb',
          textOrientation: isVertical ? 'upright' : 'mixed',
          letterSpacing: isVertical ? '0.12em' : 'normal',
          height: height ? '100%' : 'auto',
          width: width ? '100%' : 'auto',
          display: (width || height || isVertical) ? 'flex' : 'block',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: isEditing ? 'text' : 'none',
          ...(innerStyle || {}),
        }}
        className={`outline-none leading-tight block transition ${
          isEditing ? 'cursor-text select-text' : 'cursor-grab active:cursor-grabbing select-none'
        }`}
      >
        {effectiveText}
      </Component>

      {/* Word-style Corner & Height/Width Drag Resize Handles */}
      {isSelected && !isEditing && (
        <TextCornerHandles
          id={id}
          fontSize={fontSize}
          width={width}
          height={height}
          containerRef={containerRef}
          onSetFontSize={onSetFontSize}
          onChangeFontSize={onChangeFontSize}
          onSetDimensions={onSetDimensions}
        />
      )}
    </div>
  );
}

/**
 * Helper to render the actual phone / WhatsApp / smartphone / support / custom icon
 */
export function renderPhoneLogoIcon(config, defaultColor = '#10b981', extraClass = '') {
  const type = config?.type || 'phone';
  const size = config?.size || 13;
  const color = config?.color || defaultColor;

  if (type === 'none' || config?.visible === false) return null;

  if (type === 'custom' && config?.customIconUrl) {
    return (
      <img
        src={config.customIconUrl}
        alt="Contact Icon"
        style={{ width: `${size}px`, height: `${size}px` }}
        className={`object-contain rounded-xs ${extraClass}`}
      />
    );
  }

  if (type === 'whatsapp') {
    return <WhatsAppFilledIcon size={size} color={color} className={extraClass} />;
  }

  if (type === 'smartphone') {
    return <Smartphone style={{ width: `${size}px`, height: `${size}px`, color }} className={extraClass} />;
  }

  if (type === 'support') {
    return <Headphones style={{ width: `${size}px`, height: `${size}px`, color }} className={extraClass} />;
  }

  // Default: Phone
  return <Phone style={{ width: `${size}px`, height: `${size}px`, color }} className={extraClass} />;
}

/**
 * Interactive Phone / Contact Logo Component with Click-to-switch icon, color, size & drag-to-move
 */
export function InteractivePhoneLogo({
  config,
  selectedElementId,
  defaultColor = '#10b981',
  isFreelyMoved = false,
  extraClass = '',
  onSelect,
  onStartDrag,
  onChangeConfig,
  onResetPosition,
}) {
  if (isFreelyMoved) return null;
  if (config?.visible === false || config?.type === 'none') return null;

  const isSelected = selectedElementId === 'phoneLogo';
  const size = config?.size || 13;
  const currentType = config?.type || 'phone';

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect && onSelect('phoneLogo');
      }}
      onMouseDown={(e) => onStartDrag && onStartDrag(e, 'phoneLogo')}
      onTouchStart={(e) => onStartDrag && onStartDrag(e, 'phoneLogo')}
      className={`relative inline-flex items-center justify-center p-0.5 rounded-md transition select-none cursor-grab active:cursor-grabbing ${
        isSelected
          ? 'ring-2 ring-amber-500 bg-black/15 shadow-sm'
          : 'hover:ring-1 hover:ring-amber-400/50'
      } ${extraClass}`}
      title="Click & drag to move • Click to switch icon (Phone, WhatsApp, Mobile, Support), resize or change color"
    >
      {/* Floating Toolbar when selected */}
      {isSelected && (
        <div
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="no-print absolute -top-11 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md text-white px-2 py-1 rounded-xl shadow-2xl flex items-center gap-1.5 z-50 border border-slate-700 whitespace-nowrap text-xs"
        >
          {/* Quick Icon Type Switchers */}
          <button
            type="button"
            onClick={() => onChangeConfig && onChangeConfig({ type: 'phone', visible: true })}
            className={`p-1 rounded cursor-pointer transition ${currentType === 'phone' ? 'bg-amber-500 text-slate-950 font-bold' : 'hover:bg-slate-800 text-slate-200'}`}
            title="Call Phone (Standard)"
          >
            <Phone className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onChangeConfig && onChangeConfig({ type: 'whatsapp', color: '#25D366', visible: true })}
            className={`p-1 rounded cursor-pointer transition ${currentType === 'whatsapp' ? 'bg-emerald-500 text-slate-950 font-bold' : 'hover:bg-slate-800 text-emerald-400'}`}
            title="Official WhatsApp"
          >
            <WhatsAppFilledIcon size={14} color={currentType === 'whatsapp' ? '#0f172a' : '#25D366'} />
          </button>

          <button
            type="button"
            onClick={() => onChangeConfig && onChangeConfig({ type: 'smartphone', visible: true })}
            className={`p-1 rounded cursor-pointer transition ${currentType === 'smartphone' ? 'bg-amber-500 text-slate-950 font-bold' : 'hover:bg-slate-800 text-slate-200'}`}
            title="Mobile / Smartphone"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onChangeConfig && onChangeConfig({ type: 'support', visible: true })}
            className={`p-1 rounded cursor-pointer transition ${currentType === 'support' ? 'bg-amber-500 text-slate-950 font-bold' : 'hover:bg-slate-800 text-slate-200'}`}
            title="Customer Support Headset"
          >
            <Headphones className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-3.5 bg-slate-700" />

          {/* Size Controls */}
          <button
            type="button"
            onClick={() => onChangeConfig && onChangeConfig({ size: Math.max(8, size - 2) })}
            className="px-1.5 py-0.5 rounded text-xs font-bold text-slate-200 hover:bg-slate-800 cursor-pointer"
            title="Smaller Icon"
          >
            -
          </button>
          <span className="text-[10px] font-mono font-bold text-amber-400 min-w-[24px] text-center">
            {size}px
          </span>
          <button
            type="button"
            onClick={() => onChangeConfig && onChangeConfig({ size: Math.min(36, size + 2) })}
            className="px-1.5 py-0.5 rounded text-xs font-bold text-slate-200 hover:bg-slate-800 cursor-pointer"
            title="Larger Icon"
          >
            +
          </button>

          <div className="w-px h-3.5 bg-slate-700" />

          {/* Color Swatches */}
          <button
            type="button"
            onClick={() => onChangeConfig && onChangeConfig({ color: '#10b981' })}
            className="w-3.5 h-3.5 rounded-full bg-emerald-500 cursor-pointer hover:scale-110"
            title="Emerald Green"
          />
          <button
            type="button"
            onClick={() => onChangeConfig && onChangeConfig({ color: '#25D366' })}
            className="w-3.5 h-3.5 rounded-full bg-[#25D366] cursor-pointer hover:scale-110"
            title="WhatsApp Green"
          />
          <button
            type="button"
            onClick={() => onChangeConfig && onChangeConfig({ color: '#f59e0b' })}
            className="w-3.5 h-3.5 rounded-full bg-amber-500 cursor-pointer hover:scale-110"
            title="Amber Gold"
          />
          <button
            type="button"
            onClick={() => onChangeConfig && onChangeConfig({ color: '#0ea5e9' })}
            className="w-3.5 h-3.5 rounded-full bg-sky-500 cursor-pointer hover:scale-110"
            title="Sky Blue"
          />
          <button
            type="button"
            onClick={() => onChangeConfig && onChangeConfig({ color: '#ffffff' })}
            className="w-3.5 h-3.5 rounded-full bg-white border border-slate-400 cursor-pointer hover:scale-110"
            title="White"
          />
          <button
            type="button"
            onClick={() => onChangeConfig && onChangeConfig({ color: '#0f172a' })}
            className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-700 cursor-pointer hover:scale-110"
            title="Dark Charcoal"
          />

          <div className="w-px h-3.5 bg-slate-700" />

          {/* Move Handle */}
          <button
            type="button"
            onMouseDown={(e) => onStartDrag && onStartDrag(e, 'phoneLogo')}
            onTouchStart={(e) => onStartDrag && onStartDrag(e, 'phoneLogo')}
            className="p-1 rounded hover:bg-slate-800 text-amber-400 cursor-move flex items-center gap-1"
            title="Drag icon anywhere"
          >
            <Move className="w-3.5 h-3.5" />
            <span className="text-[9px] font-bold">Move</span>
          </button>

          {/* Reset Position (if freely moved) */}
          {onResetPosition && (
            <button
              type="button"
              onClick={() => onResetPosition('phoneLogo')}
              className="p-1 rounded text-slate-300 hover:text-amber-400 hover:bg-slate-800 cursor-pointer flex items-center gap-1"
              title="Reset icon to default position"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="text-[9px]">Reset</span>
            </button>
          )}

          {/* Hide */}
          <button
            type="button"
            onClick={() => onChangeConfig && onChangeConfig({ visible: false })}
            className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-slate-800 cursor-pointer text-[9px] font-bold"
            title="Hide phone logo"
          >
            Hide
          </button>
        </div>
      )}

      {renderPhoneLogoIcon(config, defaultColor)}
    </div>
  );
}

/**
 * Interactive Template Headline with direct click-to-edit, bold, scale, color, and drag-to-move
 * - Single click / drag: Move headline across the card
 * - Double click: Enter text editing mode directly in the headline
 */
function InteractiveTemplateHeadline({
  isFreelyMoved,
  text,
  urduText,
  language,
  config,
  selectedElementId,
  defaultColor,
  baseClass = '',
  onSelect,
  onStartDragText,
  onUpdateText,
  onToggleBold,
  onChangeFontSize,
  onSetFontSize = null,
  onSetDimensions = null,
  onToggleOrientation = null,
  onRotate = null,
  onChangeColor,
  onDuplicate,
}) {
  if (isFreelyMoved) return null;

  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);

  const isSelected = selectedElementId === 'headline';
  const effectiveColor = config?.color && config.color !== 'auto' ? config.color : defaultColor;
  const isBold = config?.isBold ?? true;
  const fontSize = config?.fontSize || 16;
  const isVertical = config?.isVertical ?? false;
  const rotation = config?.rotation || 0;
  const width = config?.width || null;
  const height = config?.height || null;

  // Sync contentEditable innerText if text changes externally and not actively editing
  useEffect(() => {
    if (!isEditing && textRef.current && textRef.current.innerText !== (text || 'Scan to Order')) {
      textRef.current.innerText = text || 'Scan to Order';
    }
  }, [text, isEditing]);

  // Reset editing mode when deselected
  useEffect(() => {
    if (!isSelected) {
      setIsEditing(false);
    }
  }, [isSelected]);

  // Auto focus when entering editing mode
  useEffect(() => {
    if (isEditing && textRef.current) {
      textRef.current.focus();
      try {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(textRef.current);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      } catch (err) {}
    }
  }, [isEditing]);

  // Single click & drag to move
  const handleMouseDown = (e) => {
    if (isEditing) {
      e.stopPropagation();
      return;
    }
    onSelect && onSelect('headline');
    onStartDragText && onStartDragText(e, 'headline');
  };

  const handleTouchStart = (e) => {
    if (isEditing) return;
    onSelect && onSelect('headline');
    onStartDragText && onStartDragText(e, 'headline');
  };

  // Double click to enter text box
  const handleDoubleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect && onSelect('headline');
    setIsEditing(true);
  };

  // Blur finishes editing
  const handleBlur = (e) => {
    setIsEditing(false);
    onUpdateText && onUpdateText('headline', e.currentTarget.innerText);
  };

  // Escape exits editing
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
      textRef.current && textRef.current.blur();
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onDoubleClick={handleDoubleClick}
      onClick={(e) => {
        e.stopPropagation();
        onSelect && onSelect('headline');
      }}
      style={{
        width: width ? `${width}px` : undefined,
        height: height ? `${height}px` : undefined,
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
      }}
      className={`relative inline-block select-none rounded-lg p-1 transition-shadow ${
        isEditing
          ? 'cursor-text ring-2 ring-amber-500 bg-white/20'
          : isSelected
          ? 'ring-2 ring-amber-500 bg-black/10 cursor-grab active:cursor-grabbing'
          : 'hover:ring-1 hover:ring-amber-400/50 cursor-grab active:cursor-grabbing'
      } ${baseClass}`}
      title={
        isEditing
          ? 'Typing... Press Escape or click outside to finish'
          : 'Click & drag to move • Double-click to edit headline'
      }
    >
      {/* Floating Formatting Toolbar (Visible when selected) */}
      {isSelected && (
        <div
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="no-print absolute -top-11 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md text-white px-2 py-1 rounded-xl shadow-2xl flex items-center gap-1.5 z-50 border border-slate-700 whitespace-nowrap text-xs"
        >
          {/* Edit / Done Mode Toggle */}
          {isEditing ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(false);
                textRef.current && textRef.current.blur();
              }}
              className="px-2 py-0.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition shadow-xs"
              title="Finish editing"
            >
              <Check className="w-3 h-3" />
              <span>Done</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-slate-300 hover:text-amber-400 cursor-pointer flex items-center gap-1"
              title="Double-click text or click here to type"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="text-[9px]">Edit</span>
            </button>
          )}

          {/* Drag Handle */}
          <button
            type="button"
            onMouseDown={(e) => onStartDragText && onStartDragText(e, 'headline')}
            onTouchStart={(e) => onStartDragText && onStartDragText(e, 'headline')}
            className="p-1 rounded hover:bg-slate-800 text-amber-400 cursor-move flex items-center gap-1"
            title="Click & drag to move headline anywhere"
          >
            <Move className="w-3.5 h-3.5" />
            <span className="text-[9px] font-bold">Move</span>
          </button>

          {/* Duplicate Button (1-Click or Ctrl+C / Ctrl+V) */}
          {onDuplicate && (
            <button
              type="button"
              onClick={() => onDuplicate('headline')}
              className="px-1.5 py-0.5 rounded text-xs text-slate-200 hover:text-amber-400 hover:bg-slate-800 cursor-pointer flex items-center gap-1 transition"
              title="Duplicate headline (Ctrl+C / Ctrl+V)"
            >
              <Copy className="w-3 h-3 text-amber-400" />
              <span className="text-[9px] font-bold">Copy</span>
            </button>
          )}

          <div className="w-px h-3.5 bg-slate-700" />

          {/* Bold Toggle */}
          <button
            type="button"
            onClick={() => onToggleBold && onToggleBold('headline')}
            className={`px-2 py-0.5 rounded text-xs font-black cursor-pointer ${
              isBold ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-200 hover:bg-slate-800'
            }`}
            title="Toggle Bold"
          >
            B
          </button>

          {/* Decrease Font Size */}
          <button
            type="button"
            onClick={() => onChangeFontSize && onChangeFontSize('headline', -2)}
            className="px-1.5 py-0.5 rounded text-xs font-bold text-slate-200 hover:bg-slate-800 cursor-pointer"
            title="Smaller Font Size"
          >
            A-
          </button>

          <span className="text-[10px] font-mono font-bold text-amber-400 min-w-[28px] text-center">
            {fontSize}px
          </span>

          {/* Increase Font Size */}
          <button
            type="button"
            onClick={() => onChangeFontSize && onChangeFontSize('headline', 2)}
            className="px-1.5 py-0.5 rounded text-xs font-bold text-slate-200 hover:bg-slate-800 cursor-pointer"
            title="Larger Font Size"
          >
            A+
          </button>

          <div className="w-px h-3.5 bg-slate-700" />

          {/* Vertical Text Orientation Toggle */}
          <button
            type="button"
            onClick={() => onToggleOrientation && onToggleOrientation('headline')}
            className={`px-1.5 py-0.5 rounded text-xs font-bold cursor-pointer transition flex items-center gap-1 ${
              isVertical
                ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                : 'text-slate-200 hover:bg-slate-800'
            }`}
            title={isVertical ? 'Switch to Horizontal text' : 'Make text Vertical (upright stacked)'}
          >
            <span className="text-[10px] font-mono">{isVertical ? '↕ Vert' : '↔ Horiz'}</span>
          </button>

          {/* Rotate 90° Button */}
          <button
            type="button"
            onClick={() => onRotate && onRotate('headline')}
            className={`px-1.5 py-0.5 rounded text-xs font-bold cursor-pointer transition flex items-center gap-1 ${
              rotation ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-200 hover:bg-slate-800'
            }`}
            title={`Rotate text 90° (Current: ${rotation || 0}°)`}
          >
            <RotateCw className="w-3 h-3" />
            {rotation ? <span className="text-[9px] font-bold">{rotation}°</span> : null}
          </button>

          <div className="w-px h-3.5 bg-slate-700" />

          {/* Color Presets */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onChangeColor && onChangeColor('headline', '#ffffff')}
              className="w-3.5 h-3.5 rounded-full bg-white border border-slate-400 cursor-pointer hover:scale-110"
              title="White"
            />
            <button
              type="button"
              onClick={() => onChangeColor && onChangeColor('headline', '#0f172a')}
              className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-700 cursor-pointer hover:scale-110"
              title="Dark Charcoal"
            />
            <button
              type="button"
              onClick={() => onChangeColor && onChangeColor('headline', '#ea580c')}
              className="w-3.5 h-3.5 rounded-full bg-orange-600 cursor-pointer hover:scale-110"
              title="Orange"
            />
            <button
              type="button"
              onClick={() => onChangeColor && onChangeColor('headline', '#059669')}
              className="w-3.5 h-3.5 rounded-full bg-emerald-600 cursor-pointer hover:scale-110"
              title="Emerald"
            />
            <button
              type="button"
              onClick={() => onChangeColor && onChangeColor('headline', '#f59e0b')}
              className="w-3.5 h-3.5 rounded-full bg-amber-500 cursor-pointer hover:scale-110"
              title="Amber Gold"
            />
          </div>
        </div>
      )}

      {/* Editable Content */}
      <span
        ref={textRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onInput={(e) => onUpdateText && onUpdateText('headline', e.currentTarget.innerText)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={{
          fontSize: `${fontSize}px`,
          fontWeight: isBold ? 900 : 600,
          color: effectiveColor,
          writingMode: isVertical ? 'vertical-rl' : 'horizontal-tb',
          textOrientation: isVertical ? 'upright' : 'mixed',
          letterSpacing: isVertical ? '0.12em' : 'normal',
          height: height ? '100%' : 'auto',
          width: width ? '100%' : 'auto',
          display: (width || height || isVertical) ? 'flex' : 'block',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: isEditing ? 'text' : 'none',
        }}
        className={`font-heading outline-none leading-tight block text-center transition ${
          isEditing ? 'cursor-text select-text' : 'cursor-grab active:cursor-grabbing select-none'
        }`}
      >
        {text || 'Scan to Order'}
      </span>

      {/* Word-style Corner & Height/Width Drag Resize Handles */}
      {isSelected && !isEditing && (
        <TextCornerHandles
          id="headline"
          fontSize={fontSize}
          width={width}
          height={height}
          containerRef={containerRef}
          onSetFontSize={onSetFontSize}
          onChangeFontSize={onChangeFontSize}
          onSetDimensions={onSetDimensions}
        />
      )}
    </div>
  );
}

/**
 * Interactive Template Subtitle with direct click-to-edit, bold, scale, color, and drag-to-move
 * - Single click / drag: Move subtitle across the card
 * - Double click: Enter text editing mode directly in the subtitle
 */
function InteractiveTemplateSubtitle({
  isFreelyMoved,
  text,
  config,
  selectedElementId,
  defaultColor,
  baseClass = '',
  onSelect,
  onStartDragText,
  onUpdateText,
  onToggleBold,
  onChangeFontSize,
  onSetFontSize = null,
  onSetDimensions = null,
  onToggleOrientation = null,
  onRotate = null,
  onChangeColor,
  onDuplicate,
}) {
  if (isFreelyMoved || !text) return null;

  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);

  const isSelected = selectedElementId === 'subtitle';
  const effectiveColor = config?.color && config.color !== 'auto' ? config.color : defaultColor;
  const isBold = config?.isBold ?? false;
  const fontSize = config?.fontSize || 12;
  const isVertical = config?.isVertical ?? false;
  const rotation = config?.rotation || 0;
  const width = config?.width || null;
  const height = config?.height || null;

  // Sync contentEditable innerText if text changes externally and not actively editing
  useEffect(() => {
    if (!isEditing && textRef.current && textRef.current.innerText !== text) {
      textRef.current.innerText = text;
    }
  }, [text, isEditing]);

  // Reset editing mode when deselected
  useEffect(() => {
    if (!isSelected) {
      setIsEditing(false);
    }
  }, [isSelected]);

  // Auto focus when entering editing mode
  useEffect(() => {
    if (isEditing && textRef.current) {
      textRef.current.focus();
      try {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(textRef.current);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      } catch (err) {}
    }
  }, [isEditing]);

  // Single click & drag to move
  const handleMouseDown = (e) => {
    if (isEditing) {
      e.stopPropagation();
      return;
    }
    onSelect && onSelect('subtitle');
    onStartDragText && onStartDragText(e, 'subtitle');
  };

  const handleTouchStart = (e) => {
    if (isEditing) return;
    onSelect && onSelect('subtitle');
    onStartDragText && onStartDragText(e, 'subtitle');
  };

  // Double click to enter text box
  const handleDoubleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect && onSelect('subtitle');
    setIsEditing(true);
  };

  // Blur finishes editing
  const handleBlur = (e) => {
    setIsEditing(false);
    onUpdateText && onUpdateText('subtitle', e.currentTarget.innerText);
  };

  // Escape exits editing
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
      textRef.current && textRef.current.blur();
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onDoubleClick={handleDoubleClick}
      onClick={(e) => {
        e.stopPropagation();
        onSelect && onSelect('subtitle');
      }}
      style={{
        width: width ? `${width}px` : undefined,
        height: height ? `${height}px` : undefined,
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
      }}
      className={`relative inline-block select-none rounded-lg p-0.5 transition-shadow ${
        isEditing
          ? 'cursor-text ring-2 ring-amber-500 bg-white/20'
          : isSelected
          ? 'ring-2 ring-amber-500 bg-black/10 cursor-grab active:cursor-grabbing'
          : 'hover:ring-1 hover:ring-amber-400/50 cursor-grab active:cursor-grabbing'
      } ${baseClass}`}
      title={
        isEditing
          ? 'Typing... Press Escape or click outside to finish'
          : 'Click & drag to move • Double-click to edit subtitle'
      }
    >
      {/* Floating Formatting Toolbar (Visible when selected) */}
      {isSelected && (
        <div
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="no-print absolute -top-11 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md text-white px-2 py-1 rounded-xl shadow-2xl flex items-center gap-1.5 z-50 border border-slate-700 whitespace-nowrap text-xs"
        >
          {/* Edit / Done Mode Toggle */}
          {isEditing ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(false);
                textRef.current && textRef.current.blur();
              }}
              className="px-2 py-0.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition shadow-xs"
              title="Finish editing"
            >
              <Check className="w-3 h-3" />
              <span>Done</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-slate-300 hover:text-amber-400 cursor-pointer flex items-center gap-1"
              title="Double-click text or click here to type"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="text-[9px]">Edit</span>
            </button>
          )}

          {/* Drag Handle */}
          <button
            type="button"
            onMouseDown={(e) => onStartDragText && onStartDragText(e, 'subtitle')}
            onTouchStart={(e) => onStartDragText && onStartDragText(e, 'subtitle')}
            className="p-1 rounded hover:bg-slate-800 text-amber-400 cursor-move flex items-center gap-1"
            title="Click & drag to move subtitle anywhere"
          >
            <Move className="w-3.5 h-3.5" />
            <span className="text-[9px] font-bold">Move</span>
          </button>

          {/* Duplicate Button (1-Click or Ctrl+C / Ctrl+V) */}
          {onDuplicate && (
            <button
              type="button"
              onClick={() => onDuplicate('subtitle')}
              className="px-1.5 py-0.5 rounded text-xs text-slate-200 hover:text-amber-400 hover:bg-slate-800 cursor-pointer flex items-center gap-1 transition"
              title="Duplicate subtitle (Ctrl+C / Ctrl+V)"
            >
              <Copy className="w-3 h-3 text-amber-400" />
              <span className="text-[9px] font-bold">Copy</span>
            </button>
          )}

          <div className="w-px h-3.5 bg-slate-700" />

          <button
            type="button"
            onClick={() => onToggleBold && onToggleBold('subtitle')}
            className={`px-2 py-0.5 rounded text-xs font-black cursor-pointer ${
              isBold ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-200 hover:bg-slate-800'
            }`}
            title="Toggle Bold"
          >
            B
          </button>

          <button
            type="button"
            onClick={() => onChangeFontSize && onChangeFontSize('subtitle', -2)}
            className="px-1.5 py-0.5 rounded text-xs font-bold text-slate-200 hover:bg-slate-800 cursor-pointer"
            title="Smaller Font Size"
          >
            A-
          </button>

          <span className="text-[10px] font-mono font-bold text-amber-400 min-w-[28px] text-center">
            {fontSize}px
          </span>

          <button
            type="button"
            onClick={() => onChangeFontSize && onChangeFontSize('subtitle', 2)}
            className="px-1.5 py-0.5 rounded text-xs font-bold text-slate-200 hover:bg-slate-800 cursor-pointer"
            title="Larger Font Size"
          >
            A+
          </button>

          <div className="w-px h-3.5 bg-slate-700" />

          {/* Vertical Text Orientation Toggle */}
          <button
            type="button"
            onClick={() => onToggleOrientation && onToggleOrientation('subtitle')}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition flex items-center gap-1 ${
              isVertical ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-200 hover:bg-slate-800'
            }`}
            title="Toggle Vertical (Top-to-Bottom) / Horizontal Text"
          >
            <span>{isVertical ? '↕ Vert' : '↔ Horiz'}</span>
          </button>

          {/* Rotate 90° Button */}
          <button
            type="button"
            onClick={() => onRotate && onRotate('subtitle')}
            className="p-1 rounded text-slate-200 hover:text-amber-400 hover:bg-slate-800 cursor-pointer flex items-center gap-0.5"
            title="Rotate 90°"
          >
            <RotateCw className="w-3 h-3" />
            <span className="text-[9px] font-mono">{rotation || 0}°</span>
          </button>

          <div className="w-px h-3.5 bg-slate-700" />

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onChangeColor && onChangeColor('subtitle', '#ffffff')}
              className="w-3.5 h-3.5 rounded-full bg-white border border-slate-400 cursor-pointer hover:scale-110"
              title="White"
            />
            <button
              type="button"
              onClick={() => onChangeColor && onChangeColor('subtitle', '#0f172a')}
              className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-700 cursor-pointer hover:scale-110"
              title="Dark Charcoal"
            />
            <button
              type="button"
              onClick={() => onChangeColor && onChangeColor('subtitle', '#ea580c')}
              className="w-3.5 h-3.5 rounded-full bg-orange-600 cursor-pointer hover:scale-110"
              title="Orange"
            />
            <button
              type="button"
              onClick={() => onChangeColor && onChangeColor('subtitle', '#059669')}
              className="w-3.5 h-3.5 rounded-full bg-emerald-600 cursor-pointer hover:scale-110"
              title="Emerald"
            />
            <button
              type="button"
              onClick={() => onChangeColor && onChangeColor('subtitle', '#f59e0b')}
              className="w-3.5 h-3.5 rounded-full bg-amber-500 cursor-pointer hover:scale-110"
              title="Amber Gold"
            />
          </div>
        </div>
      )}

      <span
        ref={textRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onInput={(e) => onUpdateText && onUpdateText('subtitle', e.currentTarget.innerText)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={{
          fontSize: `${fontSize}px`,
          fontWeight: isBold ? 900 : 500,
          color: effectiveColor,
          writingMode: isVertical ? 'vertical-rl' : 'horizontal-tb',
          textOrientation: isVertical ? 'upright' : 'mixed',
          letterSpacing: isVertical ? '0.12em' : 'normal',
          height: height ? '100%' : 'auto',
          width: width ? '100%' : 'auto',
          display: (width || height || isVertical) ? 'flex' : 'block',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: isEditing ? 'text' : 'none',
        }}
        className={`outline-none leading-tight block text-center transition ${
          isEditing ? 'cursor-text select-text' : 'cursor-grab active:cursor-grabbing select-none'
        }`}
      >
        {text}
      </span>

      {/* Word-style Corner & Height/Width Drag Resize Handles */}
      {isSelected && !isEditing && (
        <TextCornerHandles
          id="subtitle"
          fontSize={fontSize}
          width={width}
          height={height}
          containerRef={containerRef}
          onSetFontSize={onSetFontSize}
          onChangeFontSize={onChangeFontSize}
          onSetDimensions={onSetDimensions}
        />
      )}
    </div>
  );
}

/**
 * Master Reusable Print Material Template Component
 * Features:
 * - Corner-drag and quick [-] / [+] QR Code resizing
 * - Free drag-and-drop QR placement in any corner or position
 * - Free movable and editable text boxes (+ Add Text)
 * - Click directly on any text to bold, scale font size, change color, or edit text
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
  // Owner Total Control Props:
  bgImage = null,
  bgOverlayOpacity = 0.45,
  textColorMode = 'auto',
  qrSize = 140,
  watermarkText = '',
  watermarkOpacity = 0.2,
  customSubtitle = '',
  customFooter = '',
  // Inner Folded Card Panels (Replaces Black Boxes):
  frontPanelImage = null,
  backPanelImage = null,
  panelOverlayOpacity = 0.35,
  // Fold Line & Bottom Panel (Side 2) Customizable Texts:
  foldText = 'FOLD HERE',
  showFoldLine = true,
  side2Header = 'Quick Re-Order & Assistance',
  side2Headline = 'Need Extra Drinks or Dessert?',
  side2Subtitle = 'Scan again to add any dish straight to your table bill.',
  side2Footer = '',
  // Free Position & Corner Drag Props:
  qrPositionMode = 'auto',
  qrPosX = 50,
  qrPosY = 50,
  onStartDrag = null,
  onStartResizeCorner = null,
  onQuickResize = null,
  isDraggingQr = false,
  // Duplicated Additional QR codes (Copy & Paste):
  additionalQrs = [],
  onDuplicateQr = null,
  onDeleteAdditionalQr = null,
  onStartDragAdditionalQr = null,
  onStartResizeAdditionalCorner = null,
  onQuickResizeAdditional = null,
  draggingQrId = null,
  // Editable and Movable Texts:
  customTextBoxes = [],
  selectedElementId = null,
  headlineConfig = null,
  subtitleConfig = null,
  customRestaurantName = '',
  restaurantNameConfig = null,
  phoneConfig = null,
  customBadgeText = '',
  badgeConfig = null,
  phoneLogoConfig = null,
  onChangePhoneLogoConfig = null,
  side2HeaderConfig = null,
  side2HeadlineConfig = null,
  side2SubtitleConfig = null,
  side2FooterConfig = null,
  foldTextConfig = null,
  side2QrConfig = null,
  isDraggingSide2Qr = false,
  onStartDragSide2Qr = null,
  onStartResizeSide2Corner = null,
  onQuickResizeSide2 = null,
  onSelectElement = null,
  onStartDragText = null,
  onUpdateText = null,
  onToggleBold = null,
  onChangeFontSize = null,
  onSetFontSize = null,
  onSetDimensions = null,
  onToggleOrientation = null,
  onRotate = null,
  onChangeColor = null,
  onDuplicate = null,
  onDeleteCustomText = null,
  onResetPosition = null,
}) {
  const palette = getThemePalette(theme, customColor);
  const storeName = customRestaurantName || restaurant?.name || 'Burger & Smoke Co.';
  const defaultPhone = restaurant?.phone || restaurant?.whatsapp_number || '923001234567';
  const effectiveFooter = customFooter ? customFooter : `+${defaultPhone}`;
  const logoUrl = restaurant?.logo_url;
  const isDarkTheme = palette.isDark;
  const hasBg = Boolean(bgImage);

  // Check if owner placed QR at custom position or in a corner
  const isCustomPositioned = qrPositionMode === 'custom' && qrPosX !== null && qrPosY !== null;

  // Determine text contrast mode
  const isLightText =
    textColorMode === 'light' ||
    (textColorMode === 'auto' &&
      (isDarkTheme ||
        (hasBg && bgOverlayOpacity >= 0.25) ||
        Boolean(frontPanelImage) ||
        Boolean(backPanelImage)));

  const textColor = isLightText ? '#ffffff' : '#0f172a';
  const subtextColor = isLightText ? 'rgba(255, 255, 255, 0.85)' : '#475569';
  const panelBg = isLightText
    ? 'bg-slate-950/70 backdrop-blur-md border border-white/15'
    : 'bg-white/85 backdrop-blur-md border border-slate-200/80';
  const panelText = isLightText ? 'text-white' : 'text-slate-900';
  const watermarkColor = isLightText ? '#ffffff' : (palette.primary || '#000000');

  // Dynamic QR scaling proportional to user's selected qrSize (base = 140px)
  const qrScale = (qrSize || 140) / 140;
  const getEffectiveQrSize = (defaultSize) => {
    return Math.round(Math.max(65, Math.min(320, defaultSize * qrScale)));
  };

  const urduHeadline = '';
  const urduCta = '';
  const englishCta = format.ctaText?.en || 'Scan to Order';

  const previewType = format.previewType || 'poster';

  // Check if headline, subtitle, restaurantName, phone, or Side 2 elements are freely positioned
  const isHeadlineFreelyMoved = headlineConfig && headlineConfig.posX !== null && headlineConfig.isCustomPosition;
  const isSubtitleFreelyMoved = subtitleConfig && subtitleConfig.posX !== null && subtitleConfig.isCustomPosition;
  const isRestaurantNameFreelyMoved = restaurantNameConfig && restaurantNameConfig.posX !== null && restaurantNameConfig.isCustomPosition;
  const isPhoneFreelyMoved = phoneConfig && phoneConfig.posX !== null && phoneConfig.isCustomPosition;
  const isSide2HeaderFreelyMoved = side2HeaderConfig && side2HeaderConfig.posX !== null && side2HeaderConfig.isCustomPosition;
  const isSide2HeadlineFreelyMoved = side2HeadlineConfig && side2HeadlineConfig.posX !== null && side2HeadlineConfig.isCustomPosition;
  const isSide2SubtitleFreelyMoved = side2SubtitleConfig && side2SubtitleConfig.posX !== null && side2SubtitleConfig.isCustomPosition;
  const isSide2FooterFreelyMoved = side2FooterConfig && side2FooterConfig.posX !== null && side2FooterConfig.isCustomPosition;
  const isFoldTextFreelyMoved = foldTextConfig && foldTextConfig.posX !== null && foldTextConfig.isCustomPosition;
  const isSide2QrFreelyMoved = side2QrConfig && side2QrConfig.posX !== null && side2QrConfig.isCustomPosition;
  const isBadgeFreelyMoved = badgeConfig && badgeConfig.posX !== null && badgeConfig.isCustomPosition;
  const isPhoneLogoFreelyMoved = phoneLogoConfig && phoneLogoConfig.posX !== null && phoneLogoConfig.isCustomPosition;

  // Reusable render helper for Table Menu / Header Badge Pill (click-to-edit, drag, bold, resize, rotate)
  const renderBadge = (defaultText = 'Table Menu', defaultBg = palette.primary, defaultTextCol = '#ffffff', extraClass = '') => {
    if (badgeConfig && badgeConfig.visible === false) return null;
    const effectiveBg = badgeConfig?.bgColor && badgeConfig.bgColor !== 'auto' ? badgeConfig.bgColor : defaultBg;
    const effectiveCol = badgeConfig?.color || defaultTextCol;
    return (
      <InteractiveTemplateText
        id="tableMenuBadge"
        text={customBadgeText}
        defaultText={defaultText}
        config={badgeConfig}
        isFreelyMoved={isBadgeFreelyMoved}
        selectedElementId={selectedElementId}
        defaultColor={effectiveCol}
        baseClass={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${extraClass}`}
        customStyle={{
          backgroundColor: effectiveBg,
        }}
        title="Click & drag to move • Double-click to edit badge text"
        onSelect={onSelectElement}
        onStartDragText={onStartDragText}
        onUpdateText={onUpdateText}
        onToggleBold={onToggleBold}
        onChangeFontSize={onChangeFontSize}
        onSetFontSize={onSetFontSize}
        onSetDimensions={onSetDimensions}
        onToggleOrientation={onToggleOrientation}
        onRotate={onRotate}
        onChangeColor={onChangeColor}
        onDuplicate={onDuplicate}
      />
    );
  };

  // Reusable render helper for Phone / Contact Logo (click-to-switch icon, resize, color, drag)
  const renderPhoneLogo = (defaultColor = '#10b981', extraClass = '') => {
    return (
      <InteractivePhoneLogo
        config={phoneLogoConfig}
        selectedElementId={selectedElementId}
        defaultColor={defaultColor}
        isFreelyMoved={isPhoneLogoFreelyMoved}
        extraClass={extraClass}
        onSelect={onSelectElement}
        onStartDrag={onStartDragText}
        onChangeConfig={onChangePhoneLogoConfig}
        onResetPosition={onResetPosition}
      />
    );
  };

  // Reusable render helper for Restaurant Name (click-to-edit, drag, bold, resize, rotate)
  const renderRestaurantName = (defaultCol = textColor, extraClass = '', tag = 'span') => {
    return (
      <InteractiveTemplateText
        id="restaurantName"
        text={customRestaurantName}
        defaultText={restaurant?.name || 'Burger & Smoke Co.'}
        config={restaurantNameConfig}
        isFreelyMoved={isRestaurantNameFreelyMoved}
        selectedElementId={selectedElementId}
        defaultColor={defaultCol}
        baseClass={extraClass}
        tag={tag}
        title="Click & drag to move • Double-click to edit restaurant name"
        onSelect={onSelectElement}
        onStartDragText={onStartDragText}
        onUpdateText={onUpdateText}
        onToggleBold={onToggleBold}
        onChangeFontSize={onChangeFontSize}
        onSetFontSize={onSetFontSize}
        onSetDimensions={onSetDimensions}
        onToggleOrientation={onToggleOrientation}
        onRotate={onRotate}
        onChangeColor={onChangeColor}
        onDuplicate={onDuplicate}
      />
    );
  };

  // Reusable render helper for Phone Number / Footer (click-to-edit, drag, bold, resize, rotate)
  const renderPhoneNumber = (defaultCol = subtextColor, extraClass = '', tag = 'span') => {
    return (
      <InteractiveTemplateText
        id="phone"
        text={customFooter}
        defaultText={`+${defaultPhone}`}
        config={phoneConfig}
        isFreelyMoved={isPhoneFreelyMoved}
        selectedElementId={selectedElementId}
        defaultColor={defaultCol}
        baseClass={extraClass}
        tag={tag}
        title="Click & drag to move • Double-click to edit phone number"
        onSelect={onSelectElement}
        onStartDragText={onStartDragText}
        onUpdateText={onUpdateText}
        onToggleBold={onToggleBold}
        onChangeFontSize={onChangeFontSize}
        onSetFontSize={onSetFontSize}
        onSetDimensions={onSetDimensions}
        onToggleOrientation={onToggleOrientation}
        onRotate={onRotate}
        onChangeColor={onChangeColor}
        onDuplicate={onDuplicate}
      />
    );
  };

  return (
    <QrContext.Provider value={{ selectedElementId, onSelectElement, onDuplicateQr }}>
      <div
        id="print-material-export-surface"
        onClick={() => onSelectElement && onSelectElement(null)}
        className={`relative w-full h-full flex flex-col justify-between overflow-hidden transition-all duration-200 select-none ${
          showBleed ? 'p-3' : 'p-0'
        }`}
        style={{
          background: bgImage
            ? `linear-gradient(rgba(0,0,0,${bgOverlayOpacity}), rgba(0,0,0,${bgOverlayOpacity})), url("${bgImage}") center/cover no-repeat`
            : palette.cardBg,
          color: textColor,
          textShadow: isLightText && hasBg ? '0 1px 3px rgba(0,0,0,0.6)' : 'none',
        }}
      >
        {/* 3mm Bleed and Crop Marks */}
        {showBleed && <CropMarks />}

        {/* Free Drag & Drop / Custom Corner Placed QR Code */}
        {isCustomPositioned && (
          <div
            style={{
              position: 'absolute',
              left: `${qrPosX}%`,
              top: `${qrPosY}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 35,
            }}
            onMouseDown={onStartDrag}
            onTouchStart={onStartDrag}
            onClick={(e) => {
              e.stopPropagation();
              onSelectElement && onSelectElement('qr');
            }}
            className="cursor-grab active:cursor-grabbing group select-none transition-all duration-75"
          >
            {isDraggingQr && (
              <div className="no-print absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 -left-[500px] -right-[500px] h-px border-t border-dashed border-amber-400/80" />
                <div className="absolute left-1/2 -top-[500px] -bottom-[500px] w-px border-l border-dashed border-amber-400/80" />
              </div>
            )}

            <BrandedQRCode
              menuUrl={menuUrl}
              size={getEffectiveQrSize(140)}
              logoPlateDataUrl={logoPlateDataUrl}
              logoSrc={logoUrl}
              showLogo={showLogo}
              effectiveRatio={effectiveRatio}
              watermarkText={watermarkText}
              watermarkOpacity={watermarkOpacity}
              watermarkColor={watermarkColor}
              onStartResizeCorner={onStartResizeCorner}
              onQuickResize={onQuickResize}
              isSelected={selectedElementId === 'qr'}
              onDuplicate={() => onDuplicateQr && onDuplicateQr('qr')}
              onSelect={() => onSelectElement && onSelectElement('qr')}
              className={isDraggingQr ? 'ring-4 ring-amber-400/60 shadow-2xl scale-105' : (selectedElementId === 'qr' ? 'ring-2 ring-amber-500 shadow-xl' : 'hover:ring-2 hover:ring-amber-400/40')}
            />
          </div>
        )}

        {/* Additional Duplicated QR Codes (Copy/Pasted instances) */}
        {additionalQrs && additionalQrs.map((extraQr) => {
          const isDraggingThis = draggingQrId === extraQr.id;
          const isSelectedThis = selectedElementId === extraQr.id;
          return (
            <div
              key={extraQr.id}
              id={extraQr.id}
              style={{
                position: 'absolute',
                left: `${extraQr.posX}%`,
                top: `${extraQr.posY}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 36,
              }}
              onMouseDown={(e) => onStartDragAdditionalQr && onStartDragAdditionalQr(e, extraQr.id)}
              onTouchStart={(e) => onStartDragAdditionalQr && onStartDragAdditionalQr(e, extraQr.id)}
              onClick={(e) => {
                e.stopPropagation();
                onSelectElement && onSelectElement(extraQr.id);
              }}
              className="cursor-grab active:cursor-grabbing group select-none transition-all duration-75"
            >
              {isDraggingThis && (
                <div className="no-print absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/2 -left-[500px] -right-[500px] h-px border-t border-dashed border-amber-400/80" />
                  <div className="absolute left-1/2 -top-[500px] -bottom-[500px] w-px border-l border-dashed border-amber-400/80" />
                </div>
              )}

              <BrandedQRCode
                menuUrl={menuUrl}
                size={extraQr.size || 140}
                logoPlateDataUrl={logoPlateDataUrl}
                logoSrc={logoUrl}
                showLogo={showLogo}
                effectiveRatio={effectiveRatio}
                watermarkText={watermarkText}
                watermarkOpacity={watermarkOpacity}
                watermarkColor={watermarkColor}
                onStartResizeCorner={(e, corner) => onStartResizeAdditionalCorner && onStartResizeAdditionalCorner(e, extraQr.id, corner)}
                onQuickResize={(delta) => onQuickResizeAdditional && onQuickResizeAdditional(extraQr.id, delta)}
                isSelected={isSelectedThis}
                isDeletable={true}
                onDuplicate={() => onDuplicateQr && onDuplicateQr(extraQr.id)}
                onDelete={() => onDeleteAdditionalQr && onDeleteAdditionalQr(extraQr.id)}
                onSelect={() => onSelectElement && onSelectElement(extraQr.id)}
                className={isDraggingThis ? 'ring-4 ring-amber-400/60 shadow-2xl scale-105' : (isSelectedThis ? 'ring-2 ring-amber-500 shadow-xl' : 'hover:ring-2 hover:ring-amber-400/40')}
              />
            </div>
          );
        })}

      {/* Custom Movable & Editable Text Boxes */}
      {customTextBoxes && customTextBoxes.map((box) => (
        <DraggableTextBox
          key={box.id}
          id={`custom-${box.id}`}
          text={box.text}
          fontSize={box.fontSize || 14}
          isBold={box.isBold}
          color={box.color}
          posX={box.posX}
          posY={box.posY}
          width={box.width || null}
          height={box.height || null}
          isVertical={box.isVertical ?? false}
          rotation={box.rotation || 0}
          isSelected={selectedElementId === `custom-${box.id}`}
          isDeletable={true}
          defaultColor={textColor}
          onSelect={onSelectElement}
          onStartDrag={onStartDragText}
          onUpdateText={(id, newText) => onUpdateText && onUpdateText(box.id, newText)}
          onToggleBold={onToggleBold}
          onChangeFontSize={onChangeFontSize}
          onSetFontSize={onSetFontSize}
          onSetDimensions={onSetDimensions}
          onToggleOrientation={onToggleOrientation}
          onRotate={onRotate}
          onChangeColor={onChangeColor}
          onDuplicate={onDuplicate}
          onDelete={() => onDeleteCustomText && onDeleteCustomText(box.id)}
        />
      ))}

      {/* Freely Moved Headline (if dragged out of standard position) */}
      {isHeadlineFreelyMoved && (
        <DraggableTextBox
          id="headline"
          text={headline || 'Scan to Order'}
          fontSize={headlineConfig?.fontSize || 20}
          isBold={headlineConfig?.isBold ?? true}
          color={headlineConfig?.color || 'auto'}
          posX={headlineConfig.posX}
          posY={headlineConfig.posY}
          width={headlineConfig?.width || null}
          height={headlineConfig?.height || null}
          isVertical={headlineConfig?.isVertical ?? false}
          rotation={headlineConfig?.rotation || 0}
          isSelected={selectedElementId === 'headline'}
          isDeletable={false}
          defaultColor={textColor}
          onSelect={onSelectElement}
          onStartDrag={onStartDragText}
          onUpdateText={(id, newText) => onUpdateText && onUpdateText('headline', newText)}
          onToggleBold={onToggleBold}
          onChangeFontSize={onChangeFontSize}
          onSetFontSize={onSetFontSize}
          onSetDimensions={onSetDimensions}
          onToggleOrientation={onToggleOrientation}
          onRotate={onRotate}
          onChangeColor={onChangeColor}
          onDuplicate={onDuplicate}
          onResetPosition={onResetPosition}
        />
      )}

      {/* Freely Moved Subtitle (if dragged out of standard position) */}
      {isSubtitleFreelyMoved && (
        <DraggableTextBox
          id="subtitle"
          text={customSubtitle || 'Order direct and save!'}
          fontSize={subtitleConfig?.fontSize || 13}
          isBold={subtitleConfig?.isBold ?? false}
          color={subtitleConfig?.color || 'auto'}
          posX={subtitleConfig.posX}
          posY={subtitleConfig.posY}
          width={subtitleConfig?.width || null}
          height={subtitleConfig?.height || null}
          isVertical={subtitleConfig?.isVertical ?? false}
          rotation={subtitleConfig?.rotation || 0}
          isSelected={selectedElementId === 'subtitle'}
          isDeletable={false}
          defaultColor={subtextColor}
          onSelect={onSelectElement}
          onStartDrag={onStartDragText}
          onUpdateText={(id, newText) => onUpdateText && onUpdateText('subtitle', newText)}
          onToggleBold={onToggleBold}
          onChangeFontSize={onChangeFontSize}
          onSetFontSize={onSetFontSize}
          onSetDimensions={onSetDimensions}
          onToggleOrientation={onToggleOrientation}
          onRotate={onRotate}
          onChangeColor={onChangeColor}
          onDuplicate={onDuplicate}
          onResetPosition={onResetPosition}
        />
      )}

      {/* Freely Moved Restaurant Name (if dragged out of standard position) */}
      {isRestaurantNameFreelyMoved && (
        <DraggableTextBox
          id="restaurantName"
          text={customRestaurantName || restaurant?.name || 'Burger & Smoke Co.'}
          fontSize={restaurantNameConfig?.fontSize || 14}
          isBold={restaurantNameConfig?.isBold ?? true}
          color={restaurantNameConfig?.color || 'auto'}
          posX={restaurantNameConfig.posX}
          posY={restaurantNameConfig.posY}
          width={restaurantNameConfig?.width || null}
          height={restaurantNameConfig?.height || null}
          isVertical={restaurantNameConfig?.isVertical ?? false}
          rotation={restaurantNameConfig?.rotation || 0}
          isSelected={selectedElementId === 'restaurantName'}
          isDeletable={false}
          defaultColor={textColor}
          onSelect={onSelectElement}
          onStartDrag={onStartDragText}
          onUpdateText={(id, newText) => onUpdateText && onUpdateText('restaurantName', newText)}
          onToggleBold={onToggleBold}
          onChangeFontSize={onChangeFontSize}
          onSetFontSize={onSetFontSize}
          onSetDimensions={onSetDimensions}
          onToggleOrientation={onToggleOrientation}
          onRotate={onRotate}
          onChangeColor={onChangeColor}
          onDuplicate={onDuplicate}
          onResetPosition={onResetPosition}
        />
      )}

      {/* Freely Moved Phone Number / Footer (if dragged out of standard position) */}
      {isPhoneFreelyMoved && (
        <DraggableTextBox
          id="phone"
          text={customFooter || `+${defaultPhone}`}
          fontSize={phoneConfig?.fontSize || 11}
          isBold={phoneConfig?.isBold ?? true}
          color={phoneConfig?.color || 'auto'}
          posX={phoneConfig.posX}
          posY={phoneConfig.posY}
          width={phoneConfig?.width || null}
          height={phoneConfig?.height || null}
          isVertical={phoneConfig?.isVertical ?? false}
          rotation={phoneConfig?.rotation || 0}
          isSelected={selectedElementId === 'phone'}
          isDeletable={false}
          defaultColor={subtextColor}
          onSelect={onSelectElement}
          onStartDrag={onStartDragText}
          onUpdateText={(id, newText) => onUpdateText && onUpdateText('phone', newText)}
          onToggleBold={onToggleBold}
          onChangeFontSize={onChangeFontSize}
          onSetFontSize={onSetFontSize}
          onSetDimensions={onSetDimensions}
          onToggleOrientation={onToggleOrientation}
          onRotate={onRotate}
          onChangeColor={onChangeColor}
          onDuplicate={onDuplicate}
          onResetPosition={onResetPosition}
        />
      )}

      {/* Freely Moved Table Menu Badge Pill */}
      {isBadgeFreelyMoved && badgeConfig?.visible !== false && (
        <DraggableTextBox
          id="tableMenuBadge"
          text={customBadgeText || 'Table Menu'}
          fontSize={badgeConfig?.fontSize || 9}
          isBold={badgeConfig?.isBold ?? true}
          color={badgeConfig?.color || '#ffffff'}
          posX={badgeConfig.posX}
          posY={badgeConfig.posY}
          width={badgeConfig?.width || null}
          height={badgeConfig?.height || null}
          isVertical={badgeConfig?.isVertical ?? false}
          rotation={badgeConfig?.rotation || 0}
          isSelected={selectedElementId === 'tableMenuBadge' || selectedElementId === 'badge'}
          isDeletable={false}
          defaultColor="#ffffff"
          customStyle={{
            backgroundColor: badgeConfig?.bgColor && badgeConfig.bgColor !== 'auto' ? badgeConfig.bgColor : palette.primary,
            borderRadius: '9999px',
            padding: '2px 8px',
            textTransform: 'uppercase',
            fontWeight: 900,
            letterSpacing: '0.05em',
          }}
          onSelect={onSelectElement}
          onStartDrag={onStartDragText}
          onUpdateText={(id, newText) => onUpdateText && onUpdateText('tableMenuBadge', newText)}
          onToggleBold={onToggleBold}
          onChangeFontSize={onChangeFontSize}
          onSetFontSize={onSetFontSize}
          onSetDimensions={onSetDimensions}
          onToggleOrientation={onToggleOrientation}
          onRotate={onRotate}
          onChangeColor={onChangeColor}
          onDuplicate={onDuplicate}
          onResetPosition={onResetPosition}
        />
      )}

      {/* Freely Moved Phone / Contact Logo */}
      {isPhoneLogoFreelyMoved && phoneLogoConfig?.visible !== false && phoneLogoConfig?.type !== 'none' && (
        <div
          style={{
            position: 'absolute',
            left: `${phoneLogoConfig.posX}%`,
            top: `${phoneLogoConfig.posY}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 42,
          }}
          onMouseDown={(e) => onStartDragText && onStartDragText(e, 'phoneLogo')}
          onTouchStart={(e) => onStartDragText && onStartDragText(e, 'phoneLogo')}
          onClick={(e) => {
            e.stopPropagation();
            onSelectElement && onSelectElement('phoneLogo');
          }}
          className={`cursor-grab active:cursor-grabbing select-none p-1 rounded-lg transition ${
            selectedElementId === 'phoneLogo'
              ? 'ring-2 ring-amber-500 bg-black/20 shadow-md'
              : 'hover:ring-1 hover:ring-amber-400/60'
          }`}
          title="Click & drag to move • Click to customize icon, color or size"
        >
          {selectedElementId === 'phoneLogo' && (
            <div
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="no-print absolute -top-11 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md text-white px-2 py-1 rounded-xl shadow-2xl flex items-center gap-1.5 z-50 border border-slate-700 whitespace-nowrap text-xs"
            >
              <button
                type="button"
                onClick={() => onChangePhoneLogoConfig && onChangePhoneLogoConfig({ type: 'phone', visible: true })}
                className={`p-1 rounded cursor-pointer ${phoneLogoConfig?.type === 'phone' ? 'bg-amber-500 text-slate-950 font-bold' : 'hover:bg-slate-800 text-slate-200'}`}
                title="Phone"
              >
                <Phone className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onChangePhoneLogoConfig && onChangePhoneLogoConfig({ type: 'whatsapp', color: '#25D366', visible: true })}
                className={`p-1 rounded cursor-pointer ${phoneLogoConfig?.type === 'whatsapp' ? 'bg-emerald-500 text-slate-950 font-bold' : 'hover:bg-slate-800 text-emerald-400'}`}
                title="WhatsApp"
              >
                <WhatsAppFilledIcon size={14} color={phoneLogoConfig?.type === 'whatsapp' ? '#0f172a' : '#25D366'} />
              </button>
              <button
                type="button"
                onClick={() => onChangePhoneLogoConfig && onChangePhoneLogoConfig({ type: 'smartphone', visible: true })}
                className={`p-1 rounded cursor-pointer ${phoneLogoConfig?.type === 'smartphone' ? 'bg-amber-500 text-slate-950 font-bold' : 'hover:bg-slate-800 text-slate-200'}`}
                title="Mobile"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onChangePhoneLogoConfig && onChangePhoneLogoConfig({ type: 'support', visible: true })}
                className={`p-1 rounded cursor-pointer ${phoneLogoConfig?.type === 'support' ? 'bg-amber-500 text-slate-950 font-bold' : 'hover:bg-slate-800 text-slate-200'}`}
                title="Support"
              >
                <Headphones className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-3.5 bg-slate-700" />
              <button
                type="button"
                onClick={() => onChangePhoneLogoConfig && onChangePhoneLogoConfig({ size: Math.max(8, (phoneLogoConfig?.size || 13) - 2) })}
                className="px-1.5 py-0.5 rounded text-xs font-bold text-slate-200 hover:bg-slate-800 cursor-pointer"
              >
                -
              </button>
              <span className="text-[10px] font-mono font-bold text-amber-400 min-w-[24px] text-center">
                {phoneLogoConfig?.size || 13}px
              </span>
              <button
                type="button"
                onClick={() => onChangePhoneLogoConfig && onChangePhoneLogoConfig({ size: Math.min(36, (phoneLogoConfig?.size || 13) + 2) })}
                className="px-1.5 py-0.5 rounded text-xs font-bold text-slate-200 hover:bg-slate-800 cursor-pointer"
              >
                +
              </button>
              <div className="w-px h-3.5 bg-slate-700" />
              <button
                type="button"
                onClick={() => onResetPosition && onResetPosition('phoneLogo')}
                className="p-1 rounded text-slate-300 hover:text-amber-400 hover:bg-slate-800 cursor-pointer flex items-center gap-1"
                title="Reset to default card layout"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="text-[9px]">Reset Pos</span>
              </button>
            </div>
          )}
          {renderPhoneLogoIcon(phoneLogoConfig, '#10b981')}
        </div>
      )}

      {/* Freely Moved Side 2 Header */}
      {isSide2HeaderFreelyMoved && (
        <DraggableTextBox
          id="side2Header"
          text={side2Header || 'Quick Re-Order & Assistance'}
          fontSize={side2HeaderConfig?.fontSize || 11}
          isBold={side2HeaderConfig?.isBold ?? true}
          color={side2HeaderConfig?.color || 'auto'}
          posX={side2HeaderConfig.posX}
          posY={side2HeaderConfig.posY}
          width={side2HeaderConfig?.width || null}
          height={side2HeaderConfig?.height || null}
          isVertical={side2HeaderConfig?.isVertical ?? false}
          rotation={side2HeaderConfig?.rotation || 0}
          isSelected={selectedElementId === 'side2Header'}
          isDeletable={false}
          defaultColor={textColor}
          onSelect={onSelectElement}
          onStartDrag={onStartDragText}
          onUpdateText={(id, newText) => onUpdateText && onUpdateText('side2Header', newText)}
          onToggleBold={onToggleBold}
          onChangeFontSize={onChangeFontSize}
          onSetFontSize={onSetFontSize}
          onSetDimensions={onSetDimensions}
          onToggleOrientation={onToggleOrientation}
          onRotate={onRotate}
          onChangeColor={onChangeColor}
          onDuplicate={onDuplicate}
          onResetPosition={onResetPosition}
        />
      )}

      {/* Freely Moved Side 2 Headline */}
      {isSide2HeadlineFreelyMoved && (
        <DraggableTextBox
          id="side2Headline"
          text={side2Headline || 'Need Extra Drinks or Dessert?'}
          fontSize={side2HeadlineConfig?.fontSize || 12}
          isBold={side2HeadlineConfig?.isBold ?? true}
          color={side2HeadlineConfig?.color || 'auto'}
          posX={side2HeadlineConfig.posX}
          posY={side2HeadlineConfig.posY}
          width={side2HeadlineConfig?.width || null}
          height={side2HeadlineConfig?.height || null}
          isVertical={side2HeadlineConfig?.isVertical ?? false}
          rotation={side2HeadlineConfig?.rotation || 0}
          isSelected={selectedElementId === 'side2Headline'}
          isDeletable={false}
          defaultColor={textColor}
          textAlign="right"
          customStyle={{
            maxWidth: '150px',
            textAlign: 'right',
          }}
          onSelect={onSelectElement}
          onStartDrag={onStartDragText}
          onUpdateText={(id, newText) => onUpdateText && onUpdateText('side2Headline', newText)}
          onToggleBold={onToggleBold}
          onChangeFontSize={onChangeFontSize}
          onSetFontSize={onSetFontSize}
          onSetDimensions={onSetDimensions}
          onToggleOrientation={onToggleOrientation}
          onRotate={onRotate}
          onChangeColor={onChangeColor}
          onDuplicate={onDuplicate}
          onResetPosition={onResetPosition}
        />
      )}

      {/* Freely Moved Side 2 Subtitle */}
      {isSide2SubtitleFreelyMoved && (
        <DraggableTextBox
          id="side2Subtitle"
          text={side2Subtitle || 'Scan again to add any dish straight to your table bill.'}
          fontSize={side2SubtitleConfig?.fontSize || 10}
          isBold={side2SubtitleConfig?.isBold ?? false}
          color={side2SubtitleConfig?.color || 'auto'}
          posX={side2SubtitleConfig.posX}
          posY={side2SubtitleConfig.posY}
          width={side2SubtitleConfig?.width || null}
          height={side2SubtitleConfig?.height || null}
          isVertical={side2SubtitleConfig?.isVertical ?? false}
          rotation={side2SubtitleConfig?.rotation || 0}
          isSelected={selectedElementId === 'side2Subtitle'}
          isDeletable={false}
          defaultColor={subtextColor}
          textAlign="right"
          customStyle={{
            maxWidth: '150px',
            textAlign: 'right',
          }}
          onSelect={onSelectElement}
          onStartDrag={onStartDragText}
          onUpdateText={(id, newText) => onUpdateText && onUpdateText('side2Subtitle', newText)}
          onToggleBold={onToggleBold}
          onChangeFontSize={onChangeFontSize}
          onSetFontSize={onSetFontSize}
          onSetDimensions={onSetDimensions}
          onToggleOrientation={onToggleOrientation}
          onRotate={onRotate}
          onChangeColor={onChangeColor}
          onDuplicate={onDuplicate}
          onResetPosition={onResetPosition}
        />
      )}

      {/* Freely Moved Side 2 Footer Link */}
      {isSide2FooterFreelyMoved && (
        <DraggableTextBox
          id="side2Footer"
          text={side2Footer || menuUrl}
          fontSize={side2FooterConfig?.fontSize || 10}
          isBold={side2FooterConfig?.isBold ?? false}
          color={side2FooterConfig?.color || 'auto'}
          posX={side2FooterConfig.posX}
          posY={side2FooterConfig.posY}
          width={side2FooterConfig?.width || null}
          height={side2FooterConfig?.height || null}
          isVertical={side2FooterConfig?.isVertical ?? false}
          rotation={side2FooterConfig?.rotation || 0}
          isSelected={selectedElementId === 'side2Footer'}
          isDeletable={false}
          defaultColor={subtextColor}
          onSelect={onSelectElement}
          onStartDrag={onStartDragText}
          onUpdateText={(id, newText) => onUpdateText && onUpdateText('side2Footer', newText)}
          onToggleBold={onToggleBold}
          onChangeFontSize={onChangeFontSize}
          onSetFontSize={onSetFontSize}
          onSetDimensions={onSetDimensions}
          onToggleOrientation={onToggleOrientation}
          onRotate={onRotate}
          onChangeColor={onChangeColor}
          onDuplicate={onDuplicate}
          onResetPosition={onResetPosition}
        />
      )}

      {/* Freely Moved Fold Indicator Pill */}
      {isFoldTextFreelyMoved && (
        <DraggableTextBox
          id="foldText"
          text={foldText || 'FOLD HERE'}
          fontSize={foldTextConfig?.fontSize || 9}
          isBold={foldTextConfig?.isBold ?? true}
          color={foldTextConfig?.color || '#ffffff'}
          posX={foldTextConfig.posX}
          posY={foldTextConfig.posY}
          width={foldTextConfig?.width || null}
          height={foldTextConfig?.height || null}
          isVertical={foldTextConfig?.isVertical ?? false}
          rotation={foldTextConfig?.rotation || 0}
          isSelected={selectedElementId === 'foldText'}
          isDeletable={false}
          defaultColor="#ffffff"
          onSelect={onSelectElement}
          onStartDrag={onStartDragText}
          onUpdateText={(id, newText) => onUpdateText && onUpdateText('foldText', newText)}
          onToggleBold={onToggleBold}
          onChangeFontSize={onChangeFontSize}
          onSetFontSize={onSetFontSize}
          onSetDimensions={onSetDimensions}
          onToggleOrientation={onToggleOrientation}
          onRotate={onRotate}
          onChangeColor={onChangeColor}
          onDuplicate={onDuplicate}
          onResetPosition={onResetPosition}
        />
      )}

      {/* Freely Moved Side 2 QR Code */}
      {isSide2QrFreelyMoved && (
        <div
          style={{
            position: 'absolute',
            left: `${side2QrConfig.posX}%`,
            top: `${side2QrConfig.posY}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 37,
          }}
          onMouseDown={onStartDragSide2Qr}
          onTouchStart={onStartDragSide2Qr}
          onClick={(e) => {
            e.stopPropagation();
            onSelectElement && onSelectElement('side2-qr');
          }}
          className="cursor-grab active:cursor-grabbing group select-none transition-all duration-75"
        >
          {isDraggingSide2Qr && (
            <div className="no-print absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 -left-[500px] -right-[500px] h-px border-t border-dashed border-amber-400/80" />
              <div className="absolute left-1/2 -top-[500px] -bottom-[500px] w-px border-l border-dashed border-amber-400/80" />
            </div>
          )}

          <BrandedQRCode
            menuUrl={menuUrl}
            size={side2QrConfig.size || 110}
            logoPlateDataUrl={logoPlateDataUrl}
            logoSrc={logoUrl}
            showLogo={showLogo}
            effectiveRatio={effectiveRatio}
            watermarkText={watermarkText}
            watermarkOpacity={watermarkOpacity}
            watermarkColor={watermarkColor}
            onStartResizeCorner={onStartResizeSide2Corner}
            onQuickResize={onQuickResizeSide2}
            isSelected={selectedElementId === 'side2-qr'}
            onDuplicate={() => onDuplicateQr && onDuplicateQr('side2-qr')}
            onResetPosition={() => onResetPosition && onResetPosition('side2-qr')}
            onSelect={() => onSelectElement && onSelectElement('side2-qr')}
            className={isDraggingSide2Qr ? 'ring-4 ring-amber-400/60 shadow-2xl scale-105' : (selectedElementId === 'side2-qr' ? 'ring-2 ring-amber-500 shadow-xl' : 'hover:ring-2 hover:ring-amber-400/40')}
          />
        </div>
      )}

      {/* INNER TEMPLATE CANVAS */}
      <div className="relative w-full h-full flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
        {/* ========================================================================= */}
        {/* 1. TABLE TENT CARD (A5 Folded, 2 Sides) */}
        {/* ========================================================================= */}
        {previewType === 'tent' && (
          <div className="h-full flex flex-col justify-between gap-3 text-center">
            {/* Side 1 (Front Panel with QR) */}
            <div
              className={`flex-1 p-3.5 rounded-2xl shadow-2xs flex flex-col justify-between items-center relative overflow-hidden transition-all ${
                frontPanelImage ? 'border border-white/20' : panelBg
              }`}
              style={
                frontPanelImage
                  ? {
                      background: `linear-gradient(rgba(0,0,0,${panelOverlayOpacity}), rgba(0,0,0,${panelOverlayOpacity})), url("${frontPanelImage}") center/cover no-repeat`,
                    }
                  : undefined
              }
            >
              <div className="flex items-center gap-2 relative z-10">
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt={storeName}
                    className="w-6 h-6 rounded-lg object-contain border border-slate-200 bg-white"
                  />
                )}
                {renderRestaurantName(panelText, 'font-heading font-extrabold text-sm tracking-tight')}
                {renderBadge('Table Menu', palette.primary)}
              </div>

              <div className="my-1.5 flex items-center justify-center gap-4 relative z-10">
                <TemplateQrSlot
                  isCustomPositioned={isCustomPositioned}
                  onStartDrag={onStartDrag}
                  onStartResizeCorner={onStartResizeCorner}
                  onQuickResize={onQuickResize}
                  menuUrl={menuUrl}
                  size={getEffectiveQrSize(110)}
                  logoPlateDataUrl={logoPlateDataUrl}
                  logoSrc={logoUrl}
                  showLogo={showLogo}
                  effectiveRatio={effectiveRatio}
                  watermarkText={watermarkText}
                  watermarkOpacity={watermarkOpacity}
                  watermarkColor={watermarkColor}
                />
                <div className="text-left max-w-[160px] space-y-1">
                  <InteractiveTemplateHeadline
                    isFreelyMoved={isHeadlineFreelyMoved}
                    text={headline || 'Scan to Order'}
                    urduText={urduHeadline}
                    language={language}
                    config={headlineConfig}
                    selectedElementId={selectedElementId}
                    defaultColor={panelText}
                    onSelect={onSelectElement}
                    onStartDragText={onStartDragText}
                    onUpdateText={onUpdateText}
                    onToggleBold={onToggleBold}
                    onChangeFontSize={onChangeFontSize}
                    onSetFontSize={onSetFontSize}
                    onSetDimensions={onSetDimensions}
                    onToggleOrientation={onToggleOrientation}
                    onRotate={onRotate}
                    onChangeColor={onChangeColor}
                    onDuplicate={onDuplicate}
                  />
                  <InteractiveTemplateSubtitle
                    isFreelyMoved={isSubtitleFreelyMoved}
                    text={customSubtitle || 'Direct kitchen online ordering with instant confirmation.'}
                    config={subtitleConfig}
                    selectedElementId={selectedElementId}
                    defaultColor={customSubtitle ? '#f59e0b' : subtextColor}
                    onSelect={onSelectElement}
                    onStartDragText={onStartDragText}
                    onUpdateText={onUpdateText}
                    onToggleBold={onToggleBold}
                    onChangeFontSize={onChangeFontSize}
                    onSetFontSize={onSetFontSize}
                    onSetDimensions={onSetDimensions}
                    onToggleOrientation={onToggleOrientation}
                    onRotate={onRotate}
                    onChangeColor={onChangeColor}
                    onDuplicate={onDuplicate}
                  />
                </div>
              </div>

              <div className={`text-[10px] font-bold ${panelText} flex items-center gap-1.5 relative z-10`}>
                {renderPhoneLogo('#10b981')}
                {renderPhoneNumber(panelText, 'text-[10px] font-bold')}
              </div>
            </div>

            {/* Fold Indicator */}
            {showFoldLine && (
              <div className="relative py-1 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-dashed border-slate-400/50" />
                </div>
                {!isFoldTextFreelyMoved && (
                  <InteractiveTemplateText
                    id="foldText"
                    text={foldText}
                    defaultText="FOLD HERE"
                    config={foldTextConfig}
                    isFreelyMoved={isFoldTextFreelyMoved}
                    selectedElementId={selectedElementId}
                    defaultColor="#ffffff"
                    baseClass="relative px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-800 text-white shadow-xs block"
                    onSelect={onSelectElement}
                    onStartDragText={onStartDragText}
                    onUpdateText={onUpdateText}
                    onToggleBold={onToggleBold}
                    onChangeFontSize={onChangeFontSize}
                    onSetFontSize={onSetFontSize}
                    onSetDimensions={onSetDimensions}
                    onToggleOrientation={onToggleOrientation}
                    onRotate={onRotate}
                    onChangeColor={onChangeColor}
                    onDuplicate={onDuplicate}
                    title="Click & drag to move • Double-click to edit fold line text"
                  />
                )}
              </div>
            )}

            {/* Side 2 (Back Panel with Quick Re-order) */}
            <div
              className={`flex-1 p-3.5 rounded-2xl shadow-2xs flex flex-col justify-between items-center relative overflow-hidden transition-all ${
                backPanelImage ? 'border border-white/20' : panelBg
              }`}
              style={
                backPanelImage
                  ? {
                      background: `linear-gradient(rgba(0,0,0,${panelOverlayOpacity}), rgba(0,0,0,${panelOverlayOpacity})), url("${backPanelImage}") center/cover no-repeat`,
                    }
                  : undefined
              }
            >
              <InteractiveTemplateText
                id="side2Header"
                text={side2Header}
                defaultText="Quick Re-Order & Assistance"
                config={side2HeaderConfig}
                isFreelyMoved={isSide2HeaderFreelyMoved}
                selectedElementId={selectedElementId}
                defaultColor={panelText}
                baseClass="text-center relative z-10 px-1 font-black uppercase tracking-wider"
                onSelect={onSelectElement}
                onStartDragText={onStartDragText}
                onUpdateText={onUpdateText}
                onToggleBold={onToggleBold}
                onChangeFontSize={onChangeFontSize}
                onSetFontSize={onSetFontSize}
                onSetDimensions={onSetDimensions}
                onToggleOrientation={onToggleOrientation}
                onRotate={onRotate}
                onChangeColor={onChangeColor}
                onDuplicate={onDuplicate}
                title="Click & drag to move • Double-click to edit header"
              />

              <div className="my-1.5 flex items-center justify-center gap-4 relative z-10">
                <div className="text-right max-w-[150px] space-y-1">
                  <InteractiveTemplateText
                    id="side2Headline"
                    text={side2Headline}
                    defaultText="Need Extra Drinks or Dessert?"
                    config={side2HeadlineConfig}
                    isFreelyMoved={isSide2HeadlineFreelyMoved}
                    selectedElementId={selectedElementId}
                    defaultColor={panelText}
                    baseClass="text-right font-black leading-tight block px-1"
                    onSelect={onSelectElement}
                    onStartDragText={onStartDragText}
                    onUpdateText={onUpdateText}
                    onToggleBold={onToggleBold}
                    onChangeFontSize={onChangeFontSize}
                    onSetFontSize={onSetFontSize}
                    onSetDimensions={onSetDimensions}
                    onToggleOrientation={onToggleOrientation}
                    onRotate={onRotate}
                    onChangeColor={onChangeColor}
                    onDuplicate={onDuplicate}
                    title="Click & drag to move • Double-click to edit headline"
                  />
                  <InteractiveTemplateText
                    id="side2Subtitle"
                    text={side2Subtitle}
                    defaultText="Scan again to add any dish straight to your table bill."
                    config={side2SubtitleConfig}
                    isFreelyMoved={isSide2SubtitleFreelyMoved}
                    selectedElementId={selectedElementId}
                    defaultColor={subtextColor}
                    tag="p"
                    baseClass="text-right leading-tight block px-1"
                    onSelect={onSelectElement}
                    onStartDragText={onStartDragText}
                    onUpdateText={onUpdateText}
                    onToggleBold={onToggleBold}
                    onChangeFontSize={onChangeFontSize}
                    onSetFontSize={onSetFontSize}
                    onSetDimensions={onSetDimensions}
                    onToggleOrientation={onToggleOrientation}
                    onRotate={onRotate}
                    onChangeColor={onChangeColor}
                    onDuplicate={onDuplicate}
                    title="Click & drag to move • Double-click to edit description"
                  />
                </div>

                {/* Side 2 QR Code in default slot */}
                {!isSide2QrFreelyMoved && (
                  <div
                    onMouseDown={onStartDragSide2Qr}
                    onTouchStart={onStartDragSide2Qr}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectElement && onSelectElement('side2-qr');
                    }}
                    className="cursor-grab active:cursor-grabbing group select-none relative inline-flex transition-transform hover:scale-[1.02]"
                    title="Click to select & copy, drag to reposition anywhere in card"
                  >
                    <BrandedQRCode
                      menuUrl={menuUrl}
                      size={side2QrConfig?.size || 110}
                      logoPlateDataUrl={logoPlateDataUrl}
                      logoSrc={logoUrl}
                      showLogo={showLogo}
                      effectiveRatio={effectiveRatio}
                      watermarkText={watermarkText}
                      watermarkOpacity={watermarkOpacity}
                      watermarkColor={watermarkColor}
                      onStartResizeCorner={onStartResizeSide2Corner}
                      onQuickResize={onQuickResizeSide2}
                      isSelected={selectedElementId === 'side2-qr'}
                      onDuplicate={() => onDuplicateQr && onDuplicateQr('side2-qr')}
                      onSelect={() => onSelectElement && onSelectElement('side2-qr')}
                    />
                  </div>
                )}
                {isSide2QrFreelyMoved && (
                  <div className="my-auto py-2 min-h-[36px] flex items-center justify-center pointer-events-none" />
                )}
              </div>

              <InteractiveTemplateText
                id="side2Footer"
                text={side2Footer}
                defaultText={menuUrl}
                config={side2FooterConfig}
                isFreelyMoved={isSide2FooterFreelyMoved}
                selectedElementId={selectedElementId}
                defaultColor={subtextColor}
                baseClass="text-center font-mono truncate max-w-full relative z-10 px-1"
                onSelect={onSelectElement}
                onStartDragText={onStartDragText}
                onUpdateText={onUpdateText}
                onToggleBold={onToggleBold}
                onChangeFontSize={onChangeFontSize}
                onSetFontSize={onSetFontSize}
                onSetDimensions={onSetDimensions}
                onToggleOrientation={onToggleOrientation}
                onRotate={onRotate}
                onChangeColor={onChangeColor}
                onDuplicate={onDuplicate}
                title="Click & drag to move • Double-click to edit footer or link"
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. TABLE STICKER (3x3 / 4x4) */}
        {/* ========================================================================= */}
        {previewType === 'table-sticker' && (
          <div
            className={`h-full flex flex-col justify-between items-center text-center p-2 rounded-2xl shadow-sm relative overflow-hidden transition-all ${
              frontPanelImage ? 'border border-white/20' : panelBg
            }`}
            style={
              frontPanelImage
                ? {
                    background: `linear-gradient(rgba(0,0,0,${panelOverlayOpacity}), rgba(0,0,0,${panelOverlayOpacity})), url("${frontPanelImage}") center/cover no-repeat`,
                  }
                : undefined
            }
          >
            <div
              className="w-full py-1 px-2 rounded-xl text-white font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 relative z-10"
              style={{ background: palette.primary }}
            >
              <QrCode className="w-3.5 h-3.5" />
              {renderRestaurantName('#ffffff', 'font-heading font-black text-xs uppercase tracking-wider')}
            </div>

            <div className="my-auto py-2 relative z-10">
              <TemplateQrSlot
                isCustomPositioned={isCustomPositioned}
                onStartDrag={onStartDrag}
                onStartResizeCorner={onStartResizeCorner}
                onQuickResize={onQuickResize}
                menuUrl={menuUrl}
                size={getEffectiveQrSize(160)}
                logoPlateDataUrl={logoPlateDataUrl}
                logoSrc={logoUrl}
                showLogo={showLogo}
                effectiveRatio={effectiveRatio}
                watermarkText={watermarkText}
                watermarkOpacity={watermarkOpacity}
                watermarkColor={watermarkColor}
                className="p-1 border-none shadow-none"
              />
            </div>

            <div className="w-full space-y-1 relative z-10">
              <InteractiveTemplateHeadline
                isFreelyMoved={isHeadlineFreelyMoved}
                text={headline || 'SCAN TO ORDER'}
                urduText={urduHeadline}
                language={language}
                config={headlineConfig}
                selectedElementId={selectedElementId}
                defaultColor={panelText}
                onSelect={onSelectElement}
                onStartDragText={onStartDragText}
                onUpdateText={onUpdateText}
                onToggleBold={onToggleBold}
                onChangeFontSize={onChangeFontSize}
                onSetFontSize={onSetFontSize}
                onSetDimensions={onSetDimensions}
                onToggleOrientation={onToggleOrientation}
                onRotate={onRotate}
                onChangeColor={onChangeColor}
                onDuplicate={onDuplicate}
              />
              <InteractiveTemplateSubtitle
                isFreelyMoved={isSubtitleFreelyMoved}
                text={customSubtitle}
                config={subtitleConfig}
                selectedElementId={selectedElementId}
                defaultColor="#f59e0b"
                onSelect={onSelectElement}
                onStartDragText={onStartDragText}
                onUpdateText={onUpdateText}
                onToggleBold={onToggleBold}
                onChangeFontSize={onChangeFontSize}
                onSetFontSize={onSetFontSize}
                onSetDimensions={onSetDimensions}
                onToggleOrientation={onToggleOrientation}
                onRotate={onRotate}
                onChangeColor={onChangeColor}
                onDuplicate={onDuplicate}
              />
              <div className={`flex items-center justify-between text-[10px] font-bold ${isLightText ? 'text-slate-300 border-white/10' : 'text-slate-500 border-slate-100'} border-t pt-1`}>
                <span>Table # ______</span>
                {renderPhoneNumber(isLightText ? '#cbd5e1' : '#64748b', 'text-[10px] font-bold')}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. POSTER (A4, A3, A2) */}
        {/* ========================================================================= */}
        {previewType === 'poster' && (
          <div className="h-full flex flex-col justify-between items-center text-center space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2.5">
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt={storeName}
                    className="w-9 h-9 rounded-xl object-contain border border-slate-200 bg-white p-0.5"
                  />
                )}
                {renderRestaurantName(isLightText ? '#ffffff' : palette.primary, 'font-heading font-black text-xl sm:text-2xl tracking-tight', 'h1')}
              </div>

              <div className="max-w-md mx-auto space-y-1">
                <InteractiveTemplateHeadline
                  isFreelyMoved={isHeadlineFreelyMoved}
                  text={
                    headline ||
                    'FRESH FROM OUR KITCHEN — ORDER DIRECT & SAVE'
                  }
                  urduText={urduHeadline}
                  language={language}
                  config={headlineConfig}
                  selectedElementId={selectedElementId}
                  defaultColor={isLightText ? '#ffffff' : palette.primary}
                  onSelect={onSelectElement}
                  onStartDragText={onStartDragText}
                  onUpdateText={onUpdateText}
                  onToggleBold={onToggleBold}
                  onChangeFontSize={onChangeFontSize}
                  onSetFontSize={onSetFontSize}
                  onSetDimensions={onSetDimensions}
                  onToggleOrientation={onToggleOrientation}
                  onRotate={onRotate}
                  onChangeColor={onChangeColor}
                  onDuplicate={onDuplicate}
                />
                <InteractiveTemplateSubtitle
                  isFreelyMoved={isSubtitleFreelyMoved}
                  text={customSubtitle}
                  config={subtitleConfig}
                  selectedElementId={selectedElementId}
                  defaultColor="#f59e0b"
                  onSelect={onSelectElement}
                  onStartDragText={onStartDragText}
                  onUpdateText={onUpdateText}
                  onToggleBold={onToggleBold}
                  onChangeFontSize={onChangeFontSize}
                  onSetFontSize={onSetFontSize}
                  onSetDimensions={onSetDimensions}
                  onToggleOrientation={onToggleOrientation}
                  onRotate={onRotate}
                  onChangeColor={onChangeColor}
                  onDuplicate={onDuplicate}
                />
              </div>
            </div>

            <div className="my-auto flex flex-col items-center">
              <div className="p-3 bg-white/10 backdrop-blur-xs rounded-3xl">
                <TemplateQrSlot
                  isCustomPositioned={isCustomPositioned}
                  onStartDrag={onStartDrag}
                  onStartResizeCorner={onStartResizeCorner}
                  onQuickResize={onQuickResize}
                  menuUrl={menuUrl}
                  size={getEffectiveQrSize(190)}
                  logoPlateDataUrl={logoPlateDataUrl}
                  logoSrc={logoUrl}
                  showLogo={showLogo}
                  effectiveRatio={effectiveRatio}
                  watermarkText={watermarkText}
                  watermarkOpacity={watermarkOpacity}
                  watermarkColor={watermarkColor}
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

            <div className="w-full grid grid-cols-3 gap-2 text-center">
              <div className={`p-2 rounded-xl ${panelBg} shadow-2xs`}>
                <span className="block text-[9px] font-black uppercase text-amber-500">
                  Step 1
                </span>
                <span className={`text-[11px] font-bold ${panelText}`}>
                  Scan QR
                </span>
              </div>
              <div className={`p-2 rounded-xl ${panelBg} shadow-2xs`}>
                <span className="block text-[9px] font-black uppercase text-amber-500">
                  Step 2
                </span>
                <span className={`text-[11px] font-bold ${panelText}`}>
                  Choose Food
                </span>
              </div>
              <div className={`p-2 rounded-xl ${panelBg} shadow-2xs`}>
                <span className="block text-[9px] font-black uppercase text-amber-500">
                  Step 3
                </span>
                <span className={`text-[11px] font-bold ${panelText}`}>
                  Place Order
                </span>
              </div>
            </div>

            <div className={`w-full pt-2 border-t ${isLightText ? 'border-white/20' : 'border-slate-200/70'} flex items-center justify-between text-xs font-semibold`}>
              <span className="flex items-center gap-1.5 font-bold">
                {renderPhoneLogo('#10b981')}
                {renderPhoneNumber(textColor, 'text-xs font-bold')}
              </span>
              <span className={`font-mono text-[11px] ${subtextColor}`}>
                {menuUrl}
              </span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. STANDEE (2x5 ft) */}
        {/* ========================================================================= */}
        {previewType === 'standee' && (
          <div className="h-full flex flex-col justify-between items-center text-center py-4 px-2 space-y-4">
            <div className="space-y-1">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt={storeName}
                  className="w-12 h-12 mx-auto rounded-2xl object-contain border-2 border-white shadow-md bg-white p-1"
                />
              )}
              {renderRestaurantName(palette.primary, 'font-heading font-black text-xl tracking-tight mt-1', 'h2')}
              <span
                className="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full text-white"
                style={{ background: palette.primary }}
              >
                Direct Kitchen Hotline
              </span>
            </div>

            <div className="max-w-[240px] space-y-1">
              <InteractiveTemplateHeadline
                isFreelyMoved={isHeadlineFreelyMoved}
                text={headline || 'WELCOME! SCAN TO ORDER ONLINE'}
                urduText={urduHeadline}
                language={language}
                config={headlineConfig}
                selectedElementId={selectedElementId}
                defaultColor={panelText}
                onSelect={onSelectElement}
                onStartDragText={onStartDragText}
                onUpdateText={onUpdateText}
                onToggleBold={onToggleBold}
                onChangeFontSize={onChangeFontSize}
                onSetFontSize={onSetFontSize}
                onSetDimensions={onSetDimensions}
                onToggleOrientation={onToggleOrientation}
                onRotate={onRotate}
                onChangeColor={onChangeColor}
              />
              <InteractiveTemplateSubtitle
                isFreelyMoved={isSubtitleFreelyMoved}
                text={customSubtitle}
                config={subtitleConfig}
                selectedElementId={selectedElementId}
                defaultColor="#f59e0b"
                onSelect={onSelectElement}
                onStartDragText={onStartDragText}
                onUpdateText={onUpdateText}
                onToggleBold={onToggleBold}
                onChangeFontSize={onChangeFontSize}
                onSetFontSize={onSetFontSize}
                onSetDimensions={onSetDimensions}
                onToggleOrientation={onToggleOrientation}
                onRotate={onRotate}
                onChangeColor={onChangeColor}
              />
            </div>

            <div className="my-auto flex flex-col items-center">
              <div className="p-3 bg-white/10 rounded-3xl">
                <TemplateQrSlot
                  isCustomPositioned={isCustomPositioned}
                  onStartDrag={onStartDrag}
                  onStartResizeCorner={onStartResizeCorner}
                  onQuickResize={onQuickResize}
                  menuUrl={menuUrl}
                  size={getEffectiveQrSize(175)}
                  logoPlateDataUrl={logoPlateDataUrl}
                  logoSrc={logoUrl}
                  showLogo={showLogo}
                  effectiveRatio={effectiveRatio}
                  watermarkText={watermarkText}
                  watermarkOpacity={watermarkOpacity}
                  watermarkColor={watermarkColor}
                  className="p-0 border-none shadow-none"
                />
              </div>
              <div className="mt-2 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 opacity-80">
                <ChevronRight className="w-3 h-3 text-emerald-500 animate-pulse" />
                <span>Aim Camera & Tap Link</span>
              </div>
            </div>

            <div className={`w-full space-y-1.5 text-left text-xs font-semibold ${panelBg} p-3 rounded-2xl`}>
              <div className={`flex items-center gap-2 ${panelText}`}>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Fresh Preparation • Best Prices</span>
              </div>
              <div className={`flex items-center gap-2 ${panelText}`}>
                <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Instant Kitchen Confirmation</span>
              </div>
              <div className={`flex items-center gap-2 ${panelText}`}>
                <Truck className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                <span>Hot & Fresh Doorstep Delivery</span>
              </div>
            </div>

            <div
              className="w-full py-2 px-3 rounded-xl text-white font-mono font-bold text-xs flex items-center justify-between"
              style={{ background: palette.darkBg }}
            >
              <span className="flex items-center gap-1.5">
                {renderPhoneLogo('#f59e0b')}
                <span>Call / Order:</span>
              </span>
              {renderPhoneNumber('#f59e0b', 'text-amber-400 font-extrabold font-mono')}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. FLYER / PAMPHLET (A5 and A6) */}
        {/* ========================================================================= */}
        {previewType === 'flyer' && (
          <div className="h-full flex flex-col justify-between items-center text-center space-y-3">
            <div className={`flex items-center justify-between w-full pb-2 border-b ${isLightText ? 'border-white/15' : 'border-slate-200/80'}`}>
              <div className="flex items-center gap-2">
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt={storeName}
                    className="w-7 h-7 rounded-lg object-contain bg-white border border-slate-200"
                  />
                )}
                {renderRestaurantName(textColor, 'font-heading font-black text-sm tracking-tight')}
              </div>
              <span
                className="text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full text-white"
                style={{ background: palette.primary }}
              >
                Special Offer
              </span>
            </div>

            <div className="max-w-xs space-y-1">
              <InteractiveTemplateHeadline
                isFreelyMoved={isHeadlineFreelyMoved}
                text={headline || 'Order Direct & Enjoy Kitchen Delivery'}
                urduText={urduHeadline}
                language={language}
                config={headlineConfig}
                selectedElementId={selectedElementId}
                defaultColor={textColor}
                onSelect={onSelectElement}
                onStartDragText={onStartDragText}
                onUpdateText={onUpdateText}
                onToggleBold={onToggleBold}
                onChangeFontSize={onChangeFontSize}
                onSetFontSize={onSetFontSize}
                onSetDimensions={onSetDimensions}
                onToggleOrientation={onToggleOrientation}
                onRotate={onRotate}
                onChangeColor={onChangeColor}
              />
              <InteractiveTemplateSubtitle
                isFreelyMoved={isSubtitleFreelyMoved}
                text={customSubtitle}
                config={subtitleConfig}
                selectedElementId={selectedElementId}
                defaultColor="#f59e0b"
                onSelect={onSelectElement}
                onStartDragText={onStartDragText}
                onUpdateText={onUpdateText}
                onToggleBold={onToggleBold}
                onChangeFontSize={onChangeFontSize}
                onSetFontSize={onSetFontSize}
                onSetDimensions={onSetDimensions}
                onToggleOrientation={onToggleOrientation}
                onRotate={onRotate}
                onChangeColor={onChangeColor}
              />
            </div>

            <div className="my-auto flex items-center justify-center gap-4">
              <TemplateQrSlot
                isCustomPositioned={isCustomPositioned}
                onStartDrag={onStartDrag}
                onStartResizeCorner={onStartResizeCorner}
                onQuickResize={onQuickResize}
                menuUrl={menuUrl}
                size={getEffectiveQrSize(135)}
                logoPlateDataUrl={logoPlateDataUrl}
                showLogo={showLogo}
                effectiveRatio={effectiveRatio}
                watermarkText={watermarkText}
                watermarkOpacity={watermarkOpacity}
                watermarkColor={watermarkColor}
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
                <p className={`text-[10px] ${subtextColor} leading-tight`}>
                  Full photo menu, live modifiers, and direct dispatch to your door.
                </p>
                <div className="flex items-center">
                  {renderPhoneNumber(textColor, 'text-[10px] font-mono font-bold')}
                </div>
              </div>
            </div>

            <div className={`w-full p-2.5 rounded-xl ${panelBg} text-[10px] flex items-center justify-between`}>
              <span className={panelText}>🚀 Direct Kitchen Delivery</span>
              <span className="font-mono text-emerald-500 font-bold truncate max-w-[150px]">
                {menuUrl}
              </span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. TRI-FOLD BROCHURE */}
        {/* ========================================================================= */}
        {previewType === 'trifold' && (
          <div className="h-full grid grid-cols-3 gap-3 text-left">
            <div className={`p-3 rounded-2xl ${panelBg} flex flex-col justify-between`}>
              <div>
                <span
                  className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded text-white"
                  style={{ background: palette.primary }}
                >
                  Kitchen Highlights
                </span>
                <h4 className={`font-heading font-black text-xs ${panelText} mt-2`}>
                  Popular Categories
                </h4>
                <div className="mt-2 space-y-1.5 text-[10px]">
                  <div className={`flex items-center gap-1.5 font-bold ${panelText}`}>
                    <Utensils className="w-3 h-3 text-emerald-500" />
                    <span>Signature Specials</span>
                  </div>
                  <div className={`flex items-center gap-1.5 font-bold ${panelText}`}>
                    <Utensils className="w-3 h-3 text-amber-500" />
                    <span>Sides, Fries & Add-ons</span>
                  </div>
                  <div className={`flex items-center gap-1.5 font-bold ${panelText}`}>
                    <Truck className="w-3 h-3 text-sky-500" />
                    <span>Family Combos & Shakes</span>
                  </div>
                </div>
              </div>
              <div className="text-[9px] text-slate-400 font-mono">
                Panel 1 • Inside Left
              </div>
            </div>

            <div className={`p-3 rounded-2xl ${panelBg} flex flex-col justify-between`}>
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-amber-500">
                  Why Order Direct?
                </span>
                <h4 className={`font-heading font-black text-xs ${panelText} mt-1`}>
                  Direct Kitchen Promise
                </h4>
                <ul className={`mt-2 space-y-1 text-[10px] ${isLightText ? 'text-slate-200' : 'text-slate-600'}`}>
                  <li>• Authentic recipes & ingredients</li>
                  <li>• Fresh, priority cooking</li>
                  <li>• Dedicated customer service</li>
                </ul>
                {customSubtitle && (
                  <p className="mt-2 text-[10px] font-bold text-amber-400">
                    {customSubtitle}
                  </p>
                )}
              </div>
              <div className="text-[9px] text-slate-400 font-mono">
                Panel 2 • Inside Center
              </div>
            </div>

            <div className={`p-3 rounded-2xl ${panelBg} flex flex-col justify-between items-center text-center`}>
              <div>
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt={storeName}
                    className="w-8 h-8 mx-auto rounded-lg object-contain bg-white border border-slate-200 p-0.5"
                  />
                )}
                {renderRestaurantName(panelText, 'font-heading font-black text-xs mt-1', 'h3')}
              </div>

              <div className="my-1">
                <TemplateQrSlot
                  isCustomPositioned={isCustomPositioned}
                  onStartDrag={onStartDrag}
                  onStartResizeCorner={onStartResizeCorner}
                  onQuickResize={onQuickResize}
                  menuUrl={menuUrl}
                  size={getEffectiveQrSize(95)}
                  logoPlateDataUrl={logoPlateDataUrl}
                  logoSrc={logoUrl}
                  showLogo={showLogo}
                  effectiveRatio={effectiveRatio}
                  watermarkText={watermarkText}
                  watermarkOpacity={watermarkOpacity}
                  watermarkColor={watermarkColor}
                  className="p-1 border-none shadow-none"
                />
                <span className={`block text-[9px] font-black ${panelText} mt-1`}>
                  {englishCta}
                </span>
              </div>

              <div className="flex items-center justify-center">
                {renderPhoneNumber(panelText, 'text-[9px] font-mono font-bold')}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 7. DELIVERY BAG FLYER (A6) & BAG STICKER */}
        {/* ========================================================================= */}
        {previewType === 'bag-flyer' && (
          <>
            {selectedSize?.id === '2x2-round' ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-3">
                <div className="w-56 h-56 rounded-full bg-white border-4 border-dashed border-emerald-600 shadow-lg flex flex-col items-center justify-between p-4 relative">
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                    ★ Freshly Sealed ★
                  </div>
                  <TemplateQrSlot
                    isCustomPositioned={isCustomPositioned}
                    onStartDrag={onStartDrag}
                    onStartResizeCorner={onStartResizeCorner}
                    onQuickResize={onQuickResize}
                    menuUrl={menuUrl}
                    size={getEffectiveQrSize(110)}
                    logoPlateDataUrl={logoPlateDataUrl}
                    showLogo={showLogo}
                    effectiveRatio={effectiveRatio}
                    watermarkText={watermarkText}
                    watermarkOpacity={watermarkOpacity}
                    watermarkColor={palette.primary}
                    className="p-1 border-none shadow-none"
                  />
                  <div className="text-[9px] font-black text-slate-700">
                    Scan for Next Order
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col justify-between items-center text-center space-y-3">
                <div className="flex items-center gap-2">
                  {logoUrl && (
                    <img
                      src={logoUrl}
                      alt={storeName}
                      className="w-6 h-6 rounded-md object-contain bg-white border border-slate-200"
                    />
                  )}
                  {renderRestaurantName(textColor, 'font-heading font-black text-sm')}
                </div>

                <div className="max-w-xs space-y-1">
                  <InteractiveTemplateHeadline
                    isFreelyMoved={isHeadlineFreelyMoved}
                    text={
                      headline ||
                      'Loved Your Meal? Next Time Order Direct & Save!'
                    }
                    urduText={urduHeadline}
                    language={language}
                    config={headlineConfig}
                    selectedElementId={selectedElementId}
                    defaultColor={textColor}
                    onSelect={onSelectElement}
                    onStartDragText={onStartDragText}
                    onUpdateText={onUpdateText}
                    onToggleBold={onToggleBold}
                    onChangeFontSize={onChangeFontSize}
                    onSetFontSize={onSetFontSize}
                    onSetDimensions={onSetDimensions}
                    onToggleOrientation={onToggleOrientation}
                    onRotate={onRotate}
                    onChangeColor={onChangeColor}
                  />
                  <InteractiveTemplateSubtitle
                    isFreelyMoved={isSubtitleFreelyMoved}
                    text={customSubtitle}
                    config={subtitleConfig}
                    selectedElementId={selectedElementId}
                    defaultColor="#f59e0b"
                    onSelect={onSelectElement}
                    onStartDragText={onStartDragText}
                    onUpdateText={onUpdateText}
                    onToggleBold={onToggleBold}
                    onChangeFontSize={onChangeFontSize}
                    onSetFontSize={onSetFontSize}
                    onSetDimensions={onSetDimensions}
                    onToggleOrientation={onToggleOrientation}
                    onRotate={onRotate}
                    onChangeColor={onChangeColor}
                  />
                </div>

                <TemplateQrSlot
                  isCustomPositioned={isCustomPositioned}
                  onStartDrag={onStartDrag}
                  onStartResizeCorner={onStartResizeCorner}
                  onQuickResize={onQuickResize}
                  menuUrl={menuUrl}
                  size={getEffectiveQrSize(135)}
                  logoPlateDataUrl={logoPlateDataUrl}
                  showLogo={showLogo}
                  effectiveRatio={effectiveRatio}
                  watermarkText={watermarkText}
                  watermarkOpacity={watermarkOpacity}
                  watermarkColor={watermarkColor}
                />

                <div className="w-full text-center space-y-1">
                  <div
                    className="text-xs font-black uppercase tracking-wider"
                    style={{ color: palette.primary }}
                  >
                    Direct Kitchen Ordering
                  </div>
                  <div className="flex items-center justify-center">
                    {renderPhoneNumber(textColor, 'text-xs font-mono font-bold')}
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
            <div className={`h-full p-4 rounded-xl ${panelBg} shadow-sm flex flex-col justify-between`}>
              <div>
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt={storeName}
                    className="w-8 h-8 rounded-lg object-contain bg-white border border-slate-200 p-0.5"
                  />
                )}
                {renderRestaurantName(panelText, 'font-heading font-black text-sm mt-2', 'h3')}
                <p className={`text-[10px] ${subtextColor} font-medium`}>
                  {customSubtitle || 'Direct Kitchen Ordering'}
                </p>
              </div>

              <div className={`space-y-1 text-[10px] ${panelText}`}>
                <div className="flex items-center gap-1 font-mono font-bold">
                  {renderPhoneLogo('#10b981')}
                  {renderPhoneNumber(panelText, 'font-mono font-bold')}
                </div>
                <div className="font-mono text-[9px] opacity-75 truncate">
                  {menuUrl}
                </div>
              </div>
            </div>

            <div
              className="h-full p-4 rounded-xl shadow-sm flex flex-col items-center justify-between text-center"
              style={{ background: palette.darkBg, color: '#ffffff' }}
            >
              <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">
                VIP Digital Menu
              </span>
              <TemplateQrSlot
                isCustomPositioned={isCustomPositioned}
                onStartDrag={onStartDrag}
                onStartResizeCorner={onStartResizeCorner}
                onQuickResize={onQuickResize}
                menuUrl={menuUrl}
                size={getEffectiveQrSize(90)}
                logoPlateDataUrl={logoPlateDataUrl}
                showLogo={showLogo}
                effectiveRatio={effectiveRatio}
                watermarkText={watermarkText}
                watermarkOpacity={watermarkOpacity}
                watermarkColor="#ffffff"
                className="p-1 border-none shadow-none"
              />
              <span className="text-[9px] font-bold text-slate-200">
                {englishCta}
              </span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 9. RECEIPT / BILL FOOTER QR */}
        {/* ========================================================================= */}
        {previewType === 'receipt-footer' && (
          <div className="h-full flex flex-col justify-between items-center text-center font-mono text-slate-900 p-2 bg-amber-50/40">
            <div className="w-full text-center space-y-1">
              <div className="text-[10px] text-slate-400">
                =================================
              </div>
              <div className="font-black text-xs uppercase tracking-wider flex items-center justify-center">
                {renderRestaurantName('#0f172a', 'font-black text-xs uppercase tracking-wider')}
              </div>
              <div className="text-[10px] font-bold text-slate-700">
                {headline || 'THANK YOU FOR DINING WITH US!'}
              </div>
              {customSubtitle && (
                <div className="text-[10px] text-emerald-700 font-bold">
                  {customSubtitle}
                </div>
              )}
              <div className="text-[10px] text-slate-400">
                ---------------------------------
              </div>
            </div>

            <div className="my-auto py-2">
              <TemplateQrSlot
                isCustomPositioned={isCustomPositioned}
                onStartDrag={onStartDrag}
                onStartResizeCorner={onStartResizeCorner}
                onQuickResize={onQuickResize}
                menuUrl={menuUrl}
                size={getEffectiveQrSize(130)}
                logoPlateDataUrl={logoPlateDataUrl}
                showLogo={showLogo}
                effectiveRatio={effectiveRatio}
                watermarkText={watermarkText}
                watermarkOpacity={watermarkOpacity}
                watermarkColor="#000000"
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
              <div className="text-[9px] text-slate-600 flex items-center justify-center">
                {renderPhoneNumber('#475569', 'text-[9px] font-mono')}
              </div>
              <div className="text-[10px] text-slate-400">
                =================================
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 10. WINDOW / DOOR STICKER */}
        {/* ========================================================================= */}
        {previewType === 'window-sticker' && (
          <div className={`h-full flex flex-col justify-between items-center text-center space-y-3 p-4 rounded-3xl ${panelBg} border-4 border-slate-900 shadow-md`}>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-600 text-white">
                Open Daily
              </span>
              {renderRestaurantName(panelText, 'font-heading font-black text-xl mt-2', 'h2')}
              <DualLangText
                englishText={
                  headline || 'SCAN TO VIEW OUR FULL MENU FROM OUTSIDE'
                }
                urduText={urduHeadline}
                language={language}
                enClass={`text-xs font-black ${panelText} block mt-1`}
                urClass={`text-xs font-bold ${panelText} block mt-1`}
              />
              {customSubtitle && (
                <p className="text-xs font-bold text-amber-500 mt-1">
                  {customSubtitle}
                </p>
              )}
            </div>

            <TemplateQrSlot
              isCustomPositioned={isCustomPositioned}
              onStartDrag={onStartDrag}
              onStartResizeCorner={onStartResizeCorner}
              onQuickResize={onQuickResize}
              menuUrl={menuUrl}
              size={getEffectiveQrSize(170)}
              logoPlateDataUrl={logoPlateDataUrl}
              showLogo={showLogo}
              effectiveRatio={effectiveRatio}
              watermarkText={watermarkText}
              watermarkOpacity={watermarkOpacity}
              watermarkColor={watermarkColor}
            />

            <div className={`w-full pt-2 border-t-2 ${isLightText ? 'border-white/20' : 'border-slate-100'} flex items-center justify-between text-xs font-bold ${panelText}`}>
              <span>Dine-In • Takeaway • Delivery</span>
              {renderPhoneNumber(panelText, 'text-xs font-bold')}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 11. MENU CARD INSERT */}
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
              {renderRestaurantName(textColor, 'font-heading font-black text-xl tracking-tight mt-1', 'h2')}
              <DualLangText
                englishText={
                  headline || 'Want to See Photos & Custom Add-ons For Every Dish?'
                }
                urduText={urduHeadline}
                language={language}
                enClass={`text-xs font-bold ${subtextColor} block`}
                urClass={`text-xs font-bold ${subtextColor} block`}
              />
              {customSubtitle && (
                <p className="text-xs font-bold text-amber-400 mt-1">
                  {customSubtitle}
                </p>
              )}
            </div>

            <div className="my-auto">
              <TemplateQrSlot
                isCustomPositioned={isCustomPositioned}
                onStartDrag={onStartDrag}
                onStartResizeCorner={onStartResizeCorner}
                onQuickResize={onQuickResize}
                menuUrl={menuUrl}
                size={getEffectiveQrSize(160)}
                logoPlateDataUrl={logoPlateDataUrl}
                showLogo={showLogo}
                effectiveRatio={effectiveRatio}
                watermarkText={watermarkText}
                watermarkOpacity={watermarkOpacity}
                watermarkColor={watermarkColor}
              />
            </div>

            <div className="w-full space-y-2">
              <div className={`grid grid-cols-3 gap-2 text-[10px] font-bold`}>
                <div className={`p-2 rounded-xl ${panelBg} ${panelText}`}>
                  📸 Live Dish Photos
                </div>
                <div className={`p-2 rounded-xl ${panelBg} ${panelText}`}>
                  🧀 Custom Cheeses & Dips
                </div>
                <div className={`p-2 rounded-xl ${panelBg} ${panelText}`}>
                  ⚡ Fast Kitchen Ping
                </div>
              </div>
              <div className={`text-[10px] font-mono ${subtextColor} flex items-center justify-center gap-1.5`}>
                {renderPhoneNumber(subtextColor, 'text-[10px] font-mono')}
                <span>•</span>
                <span>{menuUrl}</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 12. COUNTER / CASHIER STAND CARD */}
        {/* ========================================================================= */}
        {previewType === 'counter-stand' && (
          <div className="h-full flex flex-col justify-between items-center text-center space-y-3 p-3">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-slate-900 text-amber-400">
                Express Register
              </span>
              {renderRestaurantName(textColor, 'font-heading font-black text-lg mt-1', 'h2')}
              <DualLangText
                englishText={headline || 'SKIP THE LINE • ORDER FROM PHONE'}
                urduText={urduHeadline}
                language={language}
                enClass={`text-xs font-black ${textColor} block`}
                urClass={`text-xs font-bold ${textColor} block`}
              />
              {customSubtitle && (
                <p className="text-xs font-bold text-amber-400 mt-1">
                  {customSubtitle}
                </p>
              )}
            </div>

            <TemplateQrSlot
              isCustomPositioned={isCustomPositioned}
              onStartDrag={onStartDrag}
              onStartResizeCorner={onStartResizeCorner}
              onQuickResize={onQuickResize}
              menuUrl={menuUrl}
              size={getEffectiveQrSize(155)}
              logoPlateDataUrl={logoPlateDataUrl}
              showLogo={showLogo}
              effectiveRatio={effectiveRatio}
              watermarkText={watermarkText}
              watermarkOpacity={watermarkOpacity}
              watermarkColor={watermarkColor}
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
              <div className={`text-[10px] ${subtextColor} flex items-center justify-center gap-1`}>
                <span>Take a seat anywhere.</span>
                {renderPhoneNumber(subtextColor, 'text-[10px]')}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 13. FOOD BOX / PACKAGING STICKER */}
        {/* ========================================================================= */}
        {previewType === 'box-sticker' && (
          <div className={`h-full flex flex-col justify-between items-center text-center p-3 rounded-2xl ${panelBg} shadow-sm`}>
            <div className={`flex items-center gap-1.5 text-xs font-black uppercase ${panelText}`}>
              <Utensils className="w-3.5 h-3.5 text-amber-500" />
              {renderRestaurantName(panelText, 'font-black uppercase text-xs')}
            </div>

            <TemplateQrSlot
              isCustomPositioned={isCustomPositioned}
              onStartDrag={onStartDrag}
              onStartResizeCorner={onStartResizeCorner}
              onQuickResize={onQuickResize}
              menuUrl={menuUrl}
              size={getEffectiveQrSize(140)}
              logoPlateDataUrl={logoPlateDataUrl}
              showLogo={showLogo}
              effectiveRatio={effectiveRatio}
              watermarkText={watermarkText}
              watermarkOpacity={watermarkOpacity}
              watermarkColor={watermarkColor}
              className="p-1 border-none shadow-none"
            />

            <div className="w-full space-y-0.5">
              <DualLangText
                englishText={headline || 'SEALED FRESH • SCAN TO RE-ORDER'}
                urduText={urduHeadline}
                language={language}
                enClass={`text-[11px] font-black ${panelText} block`}
                urClass={`text-[11px] font-bold ${panelText} block`}
              />
              <div className={`text-[9px] font-mono ${subtextColor} flex items-center justify-center`}>
                {renderPhoneNumber(subtextColor, 'text-[9px] font-mono')}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 14. SOCIAL MEDIA POST & STORY */}
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
                {renderRestaurantName(textColor, 'font-heading font-black text-lg')}
              </div>
              <DualLangText
                englishText={
                  headline || 'Order Direct Online & Save Big on Every Meal!'
                }
                urduText={urduHeadline}
                language={language}
                enClass={`text-sm sm:text-base font-heading font-black ${textColor} leading-snug block`}
                urClass={`text-sm sm:text-base font-bold ${textColor} leading-snug block`}
              />
              {customSubtitle && (
                <p className="text-xs font-bold text-amber-400 mt-1">
                  {customSubtitle}
                </p>
              )}
            </div>

            <div className="my-auto">
              <div className="p-3 bg-white/10 rounded-3xl">
                <TemplateQrSlot
                  isCustomPositioned={isCustomPositioned}
                  onStartDrag={onStartDrag}
                  onStartResizeCorner={onStartResizeCorner}
                  onQuickResize={onQuickResize}
                  menuUrl={menuUrl}
                  size={getEffectiveQrSize(165)}
                  logoPlateDataUrl={logoPlateDataUrl}
                  showLogo={showLogo}
                  effectiveRatio={effectiveRatio}
                  watermarkText={watermarkText}
                  watermarkOpacity={watermarkOpacity}
                  watermarkColor={watermarkColor}
                  className="p-0 border-none shadow-none"
                />
              </div>
              <p className={`text-[10px] font-bold ${subtextColor} mt-2`}>
                📸 Screenshot & Scan with Phone Camera
              </p>
            </div>

            <div
              className="w-full py-2.5 px-4 rounded-2xl text-white font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md"
              style={{ background: palette.primary }}
            >
              {renderPhoneLogo('#ffffff')}
              <span>Call / Order:</span>
              {renderPhoneNumber('#ffffff', 'font-heading font-black text-xs uppercase')}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 15. WALL FRAME POSTER */}
        {/* ========================================================================= */}
        {previewType === 'wall-frame' && (
          <div className={`h-full flex flex-col justify-between items-center text-center space-y-4 p-6 border-8 border-slate-900 ${hasBg ? '' : 'bg-white'}`}>
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                Heritage Kitchen
              </span>
              {renderRestaurantName(textColor, 'font-heading font-black text-2xl tracking-tight', 'h2')}
              <div className="w-12 h-0.5 bg-current mx-auto opacity-50" />
              <DualLangText
                englishText={
                  headline || 'CRAFTED WITH PASSION • ORDERED WITH EASE'
                }
                urduText={urduHeadline}
                language={language}
                enClass="text-xs font-serif italic block"
                urClass="text-xs font-bold block"
              />
              {customSubtitle && (
                <p className="text-xs font-serif italic text-amber-400">
                  {customSubtitle}
                </p>
              )}
            </div>

            <div className="my-auto">
              <TemplateQrSlot
                isCustomPositioned={isCustomPositioned}
                onStartDrag={onStartDrag}
                onStartResizeCorner={onStartResizeCorner}
                onQuickResize={onQuickResize}
                menuUrl={menuUrl}
                size={getEffectiveQrSize(160)}
                logoPlateDataUrl={logoPlateDataUrl}
                showLogo={showLogo}
                effectiveRatio={effectiveRatio}
                watermarkText={watermarkText}
                watermarkOpacity={watermarkOpacity}
                watermarkColor={watermarkColor}
              />
            </div>

            <div className="space-y-1">
              <span className={`text-[10px] font-mono uppercase tracking-widest ${subtextColor}`}>
                Scan To Experience Our Kitchen
              </span>
              <div className="flex items-center justify-center">
                {renderPhoneNumber(textColor, 'text-xs font-mono font-bold')}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </QrContext.Provider>
);
}
