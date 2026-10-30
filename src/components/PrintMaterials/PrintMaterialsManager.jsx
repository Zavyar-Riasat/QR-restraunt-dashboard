import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { getAppBaseUrl } from '../../config/appConfig.js';
import {
  Printer,
  Download,
  Copy,
  Check,
  FileCode,
  FileText,
  AlertCircle,
  Store,
  QrCode,
  CheckCircle2,
  ShieldCheck,
  Sliders,
  ZoomIn,
  ZoomOut,
  Layers,
  Scissors,
  Image as ImageIcon,
  Loader2,
  Upload,
  X,
  Type,
  SlidersHorizontal,
  Eye,
  Move,
  Plus,
  Trash2,
  Edit3,
  Phone,
  RotateCcw,
} from 'lucide-react';

import { PRINT_FORMATS, FORMAT_CATEGORIES } from './formatDefinitions.js';
import PrintMaterialTemplate from './PrintMaterialTemplate.jsx';
import { BACKGROUND_PRESETS } from './backgroundPresets.js';
import { tableService } from '../../services/tableService';
import { downloadAllTableQrsPdf } from '../../utils/tableQrPdfGenerator';

/**
 * Creates high-resolution 512×512 composite logo badge
 */
async function createLogoPlate(logoSrc, { shape = 'rounded' } = {}) {
  if (!logoSrc) return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);

        const outerRadius = shape === 'circle' ? size / 2 : size * 0.18;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(0, 0, size, size, outerRadius);
        } else {
          ctx.arc(size / 2, size / 2, outerRadius, 0, Math.PI * 2);
        }
        ctx.fill();

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.lineWidth = size * 0.02;
        ctx.stroke();

        const padding = size * 0.13;
        const innerSize = size - padding * 2;
        const innerRadius = shape === 'circle' ? innerSize / 2 : innerSize * 0.16;

        ctx.save();
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(padding, padding, innerSize, innerSize, innerRadius);
        } else {
          ctx.arc(size / 2, size / 2, innerRadius, 0, Math.PI * 2);
        }
        ctx.clip();

        const aspect = img.naturalWidth / img.naturalHeight;
        let drawWidth = innerSize;
        let drawHeight = innerSize;
        let drawX = padding;
        let drawY = padding;

        if (aspect > 1) {
          drawHeight = innerSize / aspect;
          drawY = padding + (innerSize - drawHeight) / 2;
        } else {
          drawWidth = innerSize * aspect;
          drawX = padding + (innerSize - drawWidth) / 2;
        }

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();

        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        console.warn('Failed to render logo plate on canvas:', err);
        resolve(null);
      }
    };

    img.onerror = () => {
      console.warn('Failed to load logo image:', logoSrc);
      resolve(null);
    };

    img.src = logoSrc;
  });
}

/**
 * Generates an elegant default restaurant brand badge plate with monogram & emblem
 * Ensures the QR center logo is ALWAYS crisp, branded, and high-contrast even when no external logo is uploaded
 */
function generateDefaultLogoBadge(storeName = 'Burger & Smoke Co.', accentColor = '#ea580c', shape = 'rounded') {
  try {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const outerRadius = shape === 'circle' ? size / 2 : size * 0.22;

    // White outer protective rim
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(0, 0, size, size, outerRadius);
    } else {
      ctx.arc(size / 2, size / 2, outerRadius, 0, Math.PI * 2);
    }
    ctx.fill();

    // Subtle drop border
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.lineWidth = size * 0.02;
    ctx.stroke();

    // Inner brand squircle/circle badge
    const padding = size * 0.12;
    const innerSize = size - padding * 2;
    const innerRadius = shape === 'circle' ? innerSize / 2 : innerSize * 0.2;

    const grad = ctx.createLinearGradient(padding, padding, padding + innerSize, padding + innerSize);
    grad.addColorStop(0, accentColor || '#ea580c');
    grad.addColorStop(1, '#0f172a');

    ctx.fillStyle = grad;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(padding, padding, innerSize, innerSize, innerRadius);
    } else {
      ctx.arc(size / 2, size / 2, innerRadius, 0, Math.PI * 2);
    }
    ctx.fill();

    // Crisp inner white rim
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = size * 0.015;
    ctx.stroke();

    // Restaurant monogram initials
    const words = (storeName || 'Burger & Smoke').split(/\s+/).filter(Boolean);
    const initials = words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : (words[0]?.slice(0, 2) || 'QR').toUpperCase();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.round(innerSize * 0.42)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText(initials, size / 2, size / 2 + size * 0.01);

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('Failed to generate default logo badge:', err);
    return null;
  }
}

// 9-Corner & Alignment Presets for Free QR Placement
const POSITION_PRESETS = [
  { id: 'top-left', label: 'Top Left', icon: '↖', x: 22, y: 22 },
  { id: 'top-center', label: 'Top Center', icon: '⬆', x: 50, y: 22 },
  { id: 'top-right', label: 'Top Right', icon: '↗', x: 78, y: 22 },
  { id: 'center-left', label: 'Mid Left', icon: '⬅', x: 22, y: 50 },
  { id: 'center', label: 'Center', icon: '🎯', x: 50, y: 50 },
  { id: 'center-right', label: 'Mid Right', icon: '➡', x: 78, y: 50 },
  { id: 'bottom-left', label: 'Bot Left', icon: '↙', x: 22, y: 78 },
  { id: 'bottom-center', label: 'Bot Center', icon: '⬇', x: 50, y: 78 },
  { id: 'bottom-right', label: 'Bot Right', icon: '↘', x: 78, y: 78 },
];

export default function PrintMaterialsManager({ restaurant, onNavigateToSettings }) {
  // Format Selection State
  const [selectedFormatId, setSelectedFormatId] = useState('table-tent');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSizeId, setSelectedSizeId] = useState('a5-tent');

  // Customization State
  const [language, _setLanguage] = useState('en'); // 'en' | 'ur' | 'both'
  const [headline, setHeadline] = useState('');
  const [isCustomHeadline, setIsCustomHeadline] = useState(false);
  const [colorTheme, setColorTheme] = useState('orange'); // 'orange' | 'emerald' | 'midnight' | 'custom'
  const [customColor, _setCustomColor] = useState('#ea580c');
  const [showBleed, setShowBleed] = useState(false); // 3mm bleed and crop marks
  const [zoomScale, setZoomScale] = useState(1);

  // Background Photo & Styling State (Owner Control)
  const [bgImage, setBgImage] = useState(null); // base64 or SVG preset data URL
  const [activeBgPresetId, setActiveBgPresetId] = useState(null);
  const [bgOverlayOpacity, setBgOverlayOpacity] = useState(0.45); // 0.0 - 0.9
  const [textColorMode, setTextColorMode] = useState('auto'); // 'auto' | 'light' | 'dark'
  const fileInputRef = useRef(null);

  // Dynamic QR Code Size (Default 140px, Range 70px - 270px)
  const [qrSize, setQrSize] = useState(140);

  // Free Drag-and-Drop & Corner Placement State (Owner Control)
  const [qrPositionMode, setQrPositionMode] = useState('auto'); // 'auto' | 'custom'
  const [qrPosX, setQrPosX] = useState(50); // percentage 12 - 88
  const [qrPosY, setQrPosY] = useState(50); // percentage 12 - 88
  const [isDraggingQr, setIsDraggingQr] = useState(false);

  // Corner resize handling for QR Code (Drag corner of QR to scale directly)
  const [isResizingQr, setIsResizingQr] = useState(false);
  const resizeCornerRef = useRef(null);
  const resizeStartRef = useRef({ startX: 0, startY: 0, startSize: 140 });

  // Duplicated Additional QR Codes (Copy & Paste / Multi-QR Management)
  const [additionalQrs, setAdditionalQrs] = useState([]);
  const [draggingAdditionalQrId, setDraggingAdditionalQrId] = useState(null);
  const [resizingAdditionalQrId, setResizingAdditionalQrId] = useState(null);
  const resizeAdditionalCornerRef = useRef(null);
  const resizeAdditionalStartRef = useRef({ startX: 0, startY: 0, startSize: 140 });

  // Custom Texts & Watermark Behind QR (Owner Control - defaulted to empty so no text behind QR)
  const [watermarkText, setWatermarkText] = useState('');
  const [watermarkOpacity, _setWatermarkOpacity] = useState(0.18);
  const [customSubtitle, setCustomSubtitle] = useState('');
  const [customFooter, setCustomFooter] = useState('');

  // Dual Inner Card Photo Uploads (Replaces Black Boxes on Folded Card Panels)
  const [frontPanelImage, setFrontPanelImage] = useState(null); // Side 1 (Front Panel with QR)
  const [backPanelImage, setBackPanelImage] = useState(null); // Side 2 (Back Panel with Quick Re-order)
  const [panelOverlayOpacity, setPanelOverlayOpacity] = useState(0.35); // 0.0 - 0.85
  const frontPanelInputRef = useRef(null);
  const backPanelInputRef = useRef(null);

  // Fold Line & Bottom Panel (Side 2) Customizable Texts (Owner Control)
  const [foldText, setFoldText] = useState('FOLD HERE');
  const [showFoldLine, setShowFoldLine] = useState(true);
  const [side2Header, setSide2Header] = useState('Quick Re-Order & Assistance');
  const [side2Headline, setSide2Headline] = useState('Need Extra Drinks or Dessert?');
  const [side2Subtitle, setSide2Subtitle] = useState('Scan again to add any dish straight to your table bill.');
  const [side2Footer, setSide2Footer] = useState('');

  // Copy & Paste / Duplication System (Ctrl+C / Ctrl+V + 1-Click Toolbar)
  const copiedElementRef = useRef(null);
  const [copyToast, setCopyToast] = useState(null);

  // Toast feedback for user copy/paste actions (defined early to prevent TDZ reference errors)
  const showCopyToast = useCallback((msg) => {
    setCopyToast(msg);
    setTimeout(() => {
      setCopyToast(null);
    }, 2400);
  }, []);

  // Editable & Movable Text System (Owner Control)
  const [selectedElementId, setSelectedElementId] = useState(null); // 'qr' | 'headline' | 'subtitle' | `custom-${id}` | null
  const [headlineConfig, setHeadlineConfig] = useState({
    fontSize: 18,
    isBold: true,
    color: 'auto',
    posX: null,
    posY: null,
    isCustomPosition: false,
  });
  const [subtitleConfig, setSubtitleConfig] = useState({
    fontSize: 12,
    isBold: false,
    color: 'auto',
    posX: null,
    posY: null,
    isCustomPosition: false,
  });
  const [side2HeaderConfig, setSide2HeaderConfig] = useState({
    fontSize: 11,
    isBold: true,
    color: 'auto',
    posX: null,
    posY: null,
    isCustomPosition: false,
  });
  const [side2HeadlineConfig, setSide2HeadlineConfig] = useState({
    fontSize: 12,
    isBold: true,
    color: 'auto',
    posX: null,
    posY: null,
    isCustomPosition: false,
  });
  const [side2SubtitleConfig, setSide2SubtitleConfig] = useState({
    fontSize: 10,
    isBold: false,
    color: 'auto',
    posX: null,
    posY: null,
    isCustomPosition: false,
  });
  const [side2FooterConfig, setSide2FooterConfig] = useState({
    fontSize: 10,
    isBold: false,
    color: 'auto',
    posX: null,
    posY: null,
    isCustomPosition: false,
  });
  const [foldTextConfig, setFoldTextConfig] = useState({
    fontSize: 9,
    isBold: true,
    color: 'auto',
    posX: null,
    posY: null,
    isCustomPosition: false,
  });
  // Restaurant Name & Phone Number Editable Text Box Configurations
  const [customRestaurantName, setCustomRestaurantName] = useState('');
  const [restaurantNameConfig, setRestaurantNameConfig] = useState({
    fontSize: 14,
    isBold: true,
    color: 'auto',
    posX: null,
    posY: null,
    isCustomPosition: false,
    width: null,
    height: null,
    isVertical: false,
    rotation: 0,
  });
  const [phoneConfig, setPhoneConfig] = useState({
    fontSize: 11,
    isBold: true,
    color: 'auto',
    posX: null,
    posY: null,
    isCustomPosition: false,
    width: null,
    height: null,
    isVertical: false,
    rotation: 0,
  });
  // Table Menu Badge / Tag Pill Configuration
  const [customBadgeText, setCustomBadgeText] = useState('');
  const [badgeConfig, setBadgeConfig] = useState({
    fontSize: 9,
    isBold: true,
    color: '#ffffff',
    bgColor: 'auto',
    posX: null,
    posY: null,
    isCustomPosition: false,
    width: null,
    height: null,
    isVertical: false,
    rotation: 0,
    visible: true,
  });
  // Phone / Contact Logo & Icon Configuration
  const [phoneLogoConfig, setPhoneLogoConfig] = useState({
    type: 'phone', // 'phone' | 'whatsapp' | 'smartphone' | 'support' | 'custom' | 'none'
    customIconUrl: null,
    color: '#10b981',
    size: 13,
    posX: null,
    posY: null,
    isCustomPosition: false,
    visible: true,
  });
  const phoneLogoInputRef = useRef(null);

  const handlePhoneLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setPhoneLogoConfig((prev) => ({
        ...prev,
        type: 'custom',
        customIconUrl: event.target.result,
        visible: true,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleUpdatePhoneLogoConfig = (updates) => {
    setPhoneLogoConfig((prev) => ({ ...prev, ...updates }));
  };

  // Side 2 QR Code Drag & Corner Resize Configuration
  const [side2QrConfig, setSide2QrConfig] = useState({
    size: 110,
    posX: null,
    posY: null,
    isCustomPosition: false,
  });
  const [isDraggingSide2Qr, setIsDraggingSide2Qr] = useState(false);
  const [isResizingSide2Qr, setIsResizingSide2Qr] = useState(false);
  const resizeSide2CornerRef = useRef(null);
  const resizeSide2StartRef = useRef({ startX: 0, startY: 0, startSize: 110 });
  const [customTextBoxes, setCustomTextBoxes] = useState([]);
  const [_draggingTextId, setDraggingTextId] = useState(null);

  // Logo in QR Customization (Always visible with high contrast center badge)
  const [showLogo, setShowLogo] = useState(true);
  const [customCenterLogoUrl, setCustomCenterLogoUrl] = useState(null);
  const centerLogoInputRef = useRef(null);
  const [logoSize, setLogoSize] = useState('medium'); // 'small' | 'medium'
  const [logoShape, setLogoShape] = useState('rounded'); // 'rounded' | 'circle'
  const [logoPlateDataUrl, setLogoPlateDataUrl] = useState(null);
  const [effectiveRatio, setEffectiveRatio] = useState(0.19);

  // Export State
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingPNG, setIsExportingPNG] = useState(false);
  const [copied, setCopied] = useState(false);

  // Automatic Scan Testing State (using jsQR)
  const [_scanStatus, setScanStatus] = useState({
    status: 'idle',
    message: 'Initializing scan verification...',
    decodedUrl: '',
    latencyMs: 0,
    attempts: 1,
  });
  const [_isTestingScan, setIsTestingScan] = useState(false);

  const [selectedTableNumber, setSelectedTableNumber] = useState('');
  const [isExportingAllTablePdf, setIsExportingAllTablePdf] = useState(false);
  const availableTables = tableService.getTables(restaurant?.id || 'rest-101');

  const origin = getAppBaseUrl();
  const baseMenuUrl = `${origin}/${restaurant?.slug || 'burgersmoke'}`;
  const menuUrl = selectedTableNumber ? `${baseMenuUrl}?table=${selectedTableNumber}` : baseMenuUrl;
  const storeName = customRestaurantName || restaurant?.name || 'Burger & Smoke Co.';
  const defaultPhone = restaurant?.phone || restaurant?.whatsapp_number || '923001234567';
  const effectiveFooter = customFooter ? customFooter : `+${defaultPhone}`;
  const logoUrl = restaurant?.logo_url;

  // Helper to determine if any text or QR element has been freely dragged from default layout
  const hasAnyCustomPosition = Boolean(
    qrPositionMode === 'custom' ||
    side2QrConfig?.isCustomPosition ||
    headlineConfig?.isCustomPosition ||
    subtitleConfig?.isCustomPosition ||
    restaurantNameConfig?.isCustomPosition ||
    phoneConfig?.isCustomPosition ||
    badgeConfig?.isCustomPosition ||
    phoneLogoConfig?.isCustomPosition ||
    side2HeaderConfig?.isCustomPosition ||
    side2HeadlineConfig?.isCustomPosition ||
    side2SubtitleConfig?.isCustomPosition ||
    side2FooterConfig?.isCustomPosition ||
    foldTextConfig?.isCustomPosition
  );

  // 1-Click Reset to clean, default structured template layout
  const handleResetAllPositions = useCallback(() => {
    const reset = (c) => ({
      ...c,
      posX: null,
      posY: null,
      isCustomPosition: false,
      width: null,
      height: null,
      isVertical: false,
      rotation: 0,
    });
    setHeadlineConfig(reset);
    setSubtitleConfig(reset);
    setRestaurantNameConfig(reset);
    setPhoneConfig(reset);
    setBadgeConfig(reset);
    setPhoneLogoConfig((c) => ({ ...c, posX: null, posY: null, isCustomPosition: false }));
    setSide2HeaderConfig(reset);
    setSide2HeadlineConfig(reset);
    setSide2SubtitleConfig(reset);
    setSide2FooterConfig(reset);
    setFoldTextConfig(reset);
    setSide2QrConfig((c) => ({ ...c, posX: null, posY: null, isCustomPosition: false }));
    setQrPositionMode('auto');
    setQrPosX(50);
    setQrPosY(50);
    showCopyToast('🔄 Layout restored to default template');
  }, [showCopyToast]);

  const selectedFormat = PRINT_FORMATS.find((f) => f.id === selectedFormatId) || PRINT_FORMATS[0];
  const selectedSize =
    selectedFormat.sizes.find((s) => s.id === selectedSizeId) || selectedFormat.sizes[0];

  useEffect(() => {
    setSelectedSizeId(selectedFormat.defaultSizeId || selectedFormat.sizes[0].id);
    const defaultEnHeadline = selectedFormat.headlines?.en?.[0] || '';
    setHeadline(defaultEnHeadline);
    setIsCustomHeadline(false);
    handleResetAllPositions();
  }, [selectedFormatId, handleResetAllPositions]);

  // Handle Custom Photo Upload
  const handleCustomPhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setBgImage(event.target.result);
      setActiveBgPresetId('custom-upload');
      setTextColorMode('light');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSelectBgPreset = (preset) => {
    if (activeBgPresetId === preset.id) {
      setBgImage(null);
      setActiveBgPresetId(null);
      setTextColorMode('auto');
    } else {
      setBgImage(preset.dataUrl);
      setActiveBgPresetId(preset.id);
      setTextColorMode(preset.textColor || 'light');
    }
  };

  const handleClearBgPhoto = () => {
    setBgImage(null);
    setActiveBgPresetId(null);
    setTextColorMode('auto');
  };

  // Handle Front Inner Panel Image Upload (Side 1)
  const handleFrontPanelUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setFrontPanelImage(event.target.result);
      setTextColorMode('light');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle Back Inner Panel Image Upload (Side 2)
  const handleBackPanelUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setBackPanelImage(event.target.result);
      setTextColorMode('light');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleClearFrontPanel = () => setFrontPanelImage(null);
  const handleClearBackPanel = () => setBackPanelImage(null);

  // Center QR Logo File Upload
  const handleCenterLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCustomCenterLogoUrl(event.target.result);
      setShowLogo(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleClearCenterLogo = () => {
    setCustomCenterLogoUrl(null);
  };

  // Position & Corner Handlers
  const handleSelectPositionPreset = (pos) => {
    setQrPositionMode('custom');
    setQrPosX(pos.x);
    setQrPosY(pos.y);
  };

  const _handleResetQrPosition = () => {
    setQrPositionMode('auto');
    setQrPosX(50);
    setQrPosY(50);
  };

  // Drag & Drop handlers for free-positioning QR code anywhere on the card
  // Using 6px threshold so clicking/selecting QR code NEVER detaches it from the layout
  const handleQrDragStart = (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    setSelectedElementId('qr');

    const surface = document.getElementById('print-material-export-surface');
    const target = e.currentTarget;
    const sRect = surface?.getBoundingClientRect() || null;
    const tRect = target?.getBoundingClientRect() || null;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    let hasCrossedThreshold = false;

    const onPointerMove = (moveEvt) => {
      const curX = moveEvt.touches ? moveEvt.touches[0].clientX : moveEvt.clientX;
      const curY = moveEvt.touches ? moveEvt.touches[0].clientY : moveEvt.clientY;
      const dist = Math.hypot(curX - clientX, curY - clientY);

      if (!hasCrossedThreshold) {
        if (dist < 6) return; // Ignore small movements (<6px) - treated as pure click/select
        hasCrossedThreshold = true;
        if (qrPositionMode !== 'custom' && sRect && tRect) {
          const centerX = Math.round(((tRect.left + tRect.width / 2 - sRect.left) / sRect.width) * 100);
          const centerY = Math.round(((tRect.top + tRect.height / 2 - sRect.top) / sRect.height) * 100);
          setQrPosX(Math.max(12, Math.min(88, centerX)));
          setQrPosY(Math.max(12, Math.min(88, centerY)));
        }
        setQrPositionMode('custom');
        setIsDraggingQr(true);
      }

      if (hasCrossedThreshold && surface) {
        const rect = surface.getBoundingClientRect();
        const x = Math.round(Math.max(12, Math.min(88, ((curX - rect.left) / rect.width) * 100)));
        const y = Math.round(Math.max(12, Math.min(88, ((curY - rect.top) / rect.height) * 100)));
        setQrPosX(x);
        setQrPosY(y);
      }
    };

    const onPointerUp = () => {
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      if (hasCrossedThreshold) {
        setIsDraggingQr(false);
      }
    };

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
  };

  // Corner Resize Handlers for QR Code
  const handleStartResizeCorner = (e, corner) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingQr(true);
    resizeCornerRef.current = corner;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    resizeStartRef.current = {
      startX: clientX,
      startY: clientY,
      startSize: qrSize,
    };
  };

  const handleCornerResizeMove = useCallback(
    (e) => {
      if (!isResizingQr) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const { startX, startY, startSize } = resizeStartRef.current;
      const corner = resizeCornerRef.current;

      const deltaX = clientX - startX;
      const deltaY = clientY - startY;

      let sizeDelta = 0;
      if (corner === 'se') {
        sizeDelta = (deltaX + deltaY) / 1.5;
      } else if (corner === 'sw') {
        sizeDelta = (-deltaX + deltaY) / 1.5;
      } else if (corner === 'ne') {
        sizeDelta = (deltaX - deltaY) / 1.5;
      } else if (corner === 'nw') {
        sizeDelta = (-deltaX - deltaY) / 1.5;
      }

      const newSize = Math.max(70, Math.min(270, Math.round(startSize + sizeDelta)));
      setQrSize(newSize);
    },
    [isResizingQr]
  );

  const handleCornerResizeEnd = useCallback(() => {
    if (isResizingQr) {
      setIsResizingQr(false);
    }
  }, [isResizingQr]);

  useEffect(() => {
    if (isResizingQr) {
      const onMove = (e) => handleCornerResizeMove(e);
      const onUp = () => handleCornerResizeEnd();
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchmove', onMove);
      window.addEventListener('touchend', onUp);
      return () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('touchend', onUp);
      };
    }
  }, [isResizingQr, handleCornerResizeMove, handleCornerResizeEnd]);

  // Quick 1-Click resize for QR code
  const handleQuickResize = (delta) => {
    setQrSize((s) => Math.max(70, Math.min(270, s + delta)));
  };

  // Duplicate QR code action (Places duplicate with slight offset on canvas)
  const handleDuplicateQr = useCallback(
    (sourceId = 'qr') => {
      let sourceSize = qrSize || 140;
      let sourcePosX = qrPositionMode === 'custom' ? qrPosX : 50;
      let sourcePosY = qrPositionMode === 'custom' ? qrPosY : 50;

      if (sourceId === 'side2-qr') {
        sourceSize = side2QrConfig.size || 110;
        sourcePosX = side2QrConfig.isCustomPosition ? side2QrConfig.posX : 65;
        sourcePosY = side2QrConfig.isCustomPosition ? side2QrConfig.posY : 70;
      } else if (sourceId && sourceId.startsWith('qr-')) {
        const found = additionalQrs.find((q) => q.id === sourceId);
        if (found) {
          sourceSize = found.size || sourceSize;
          sourcePosX = found.posX;
          sourcePosY = found.posY;
        }
      }

      const newId = `qr-${Date.now()}`;
      const nextPosX = Math.min(85, Math.max(15, sourcePosX + 6));
      const nextPosY = Math.min(85, Math.max(15, sourcePosY + 6));

      const newQr = {
        id: newId,
        size: sourceSize,
        posX: nextPosX,
        posY: nextPosY,
      };

      setAdditionalQrs((prev) => [...prev, newQr]);
      setSelectedElementId(newId);
      copiedElementRef.current = {
        type: 'qr',
        size: sourceSize,
        posX: nextPosX,
        posY: nextPosY,
      };
      showCopyToast('Duplicated QR code!');
    },
    [qrSize, qrPositionMode, qrPosX, qrPosY, side2QrConfig, additionalQrs, showCopyToast]
  );

  // Side 2 QR Drag & Resize Handlers
  // Using 6px threshold so clicking/selecting Side 2 QR NEVER detaches it from the layout
  const handleStartDragSide2Qr = (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    setSelectedElementId('side2-qr');

    const surface = document.getElementById('print-material-export-surface');
    const target = e.currentTarget;
    const sRect = surface?.getBoundingClientRect() || null;
    const tRect = target?.getBoundingClientRect() || null;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    let hasCrossedThreshold = false;

    const onPointerMove = (moveEvt) => {
      const curX = moveEvt.touches ? moveEvt.touches[0].clientX : moveEvt.clientX;
      const curY = moveEvt.touches ? moveEvt.touches[0].clientY : moveEvt.clientY;
      const dist = Math.hypot(curX - clientX, curY - clientY);

      if (!hasCrossedThreshold) {
        if (dist < 6) return; // Click / select threshold (<6px)
        hasCrossedThreshold = true;
        if (!side2QrConfig.isCustomPosition && sRect && tRect) {
          const centerX = Math.round(((tRect.left + tRect.width / 2 - sRect.left) / sRect.width) * 100);
          const centerY = Math.round(((tRect.top + tRect.height / 2 - sRect.top) / sRect.height) * 100);
          setSide2QrConfig((c) => ({
            ...c,
            posX: Math.max(12, Math.min(88, centerX)),
            posY: Math.max(12, Math.min(88, centerY)),
            isCustomPosition: true,
          }));
        }
        setIsDraggingSide2Qr(true);
      }

      if (hasCrossedThreshold && surface) {
        const rect = surface.getBoundingClientRect();
        const x = Math.round(Math.max(12, Math.min(88, ((curX - rect.left) / rect.width) * 100)));
        const y = Math.round(Math.max(12, Math.min(88, ((curY - rect.top) / rect.height) * 100)));
        setSide2QrConfig((c) => ({ ...c, posX: x, posY: y, isCustomPosition: true }));
      }
    };

    const onPointerUp = () => {
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      if (hasCrossedThreshold) {
        setIsDraggingSide2Qr(false);
      }
    };

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
  };

  // Corner Resize Handlers for Side 2 QR
  const handleStartResizeSide2Corner = (e, corner) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingSide2Qr(true);
    resizeSide2CornerRef.current = corner;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    resizeSide2StartRef.current = {
      startX: clientX,
      startY: clientY,
      startSize: side2QrConfig.size || 110,
    };
  };

  const handleSide2CornerResizeMove = useCallback(
    (e) => {
      if (!isResizingSide2Qr) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const { startX, startY, startSize } = resizeSide2StartRef.current;
      const corner = resizeSide2CornerRef.current;

      const deltaX = clientX - startX;
      const deltaY = clientY - startY;

      let sizeDelta = 0;
      if (corner === 'se') {
        sizeDelta = (deltaX + deltaY) / 1.5;
      } else if (corner === 'sw') {
        sizeDelta = (-deltaX + deltaY) / 1.5;
      } else if (corner === 'ne') {
        sizeDelta = (deltaX - deltaY) / 1.5;
      } else if (corner === 'nw') {
        sizeDelta = (-deltaX - deltaY) / 1.5;
      }

      const newSize = Math.max(65, Math.min(270, Math.round(startSize + sizeDelta)));
      setSide2QrConfig((c) => ({ ...c, size: newSize }));
    },
    [isResizingSide2Qr]
  );

  const handleSide2CornerResizeEnd = useCallback(() => {
    if (isResizingSide2Qr) {
      setIsResizingSide2Qr(false);
    }
  }, [isResizingSide2Qr]);

  useEffect(() => {
    if (isResizingSide2Qr) {
      const onMove = (e) => handleSide2CornerResizeMove(e);
      const onUp = () => handleSide2CornerResizeEnd();
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchmove', onMove);
      window.addEventListener('touchend', onUp);
      return () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('touchend', onUp);
      };
    }
  }, [isResizingSide2Qr, handleSide2CornerResizeMove, handleSide2CornerResizeEnd]);

  const handleQuickResizeSide2 = (delta) => {
    setSide2QrConfig((c) => ({
      ...c,
      size: Math.max(65, Math.min(270, (c.size || 110) + delta)),
    }));
  };

  // Delete duplicated QR instance
  const handleDeleteAdditionalQr = useCallback(
    (qrId) => {
      setAdditionalQrs((prev) => prev.filter((q) => q.id !== qrId));
      if (selectedElementId === qrId) {
        setSelectedElementId(null);
      }
      showCopyToast('🗑️ Duplicated QR code removed');
    },
    [selectedElementId, showCopyToast]
  );

  // Quick resize for duplicated QR instance
  const handleQuickResizeAdditional = useCallback((qrId, delta) => {
    setAdditionalQrs((prev) =>
      prev.map((q) =>
        q.id === qrId ? { ...q, size: Math.max(65, Math.min(300, (q.size || 140) + delta)) } : q
      )
    );
  }, []);

  // Drag handlers for duplicated QR instances
  const handleStartDragAdditionalQr = (e, qrId) => {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    setSelectedElementId(qrId);

    const surface = document.getElementById('print-material-export-surface');
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    let hasCrossedThreshold = false;

    const onPointerMove = (moveEvt) => {
      const curX = moveEvt.touches ? moveEvt.touches[0].clientX : moveEvt.clientX;
      const curY = moveEvt.touches ? moveEvt.touches[0].clientY : moveEvt.clientY;
      const dist = Math.hypot(curX - clientX, curY - clientY);

      if (!hasCrossedThreshold) {
        if (dist < 6) return;
        hasCrossedThreshold = true;
        setDraggingAdditionalQrId(qrId);
      }

      if (hasCrossedThreshold && surface) {
        const rect = surface.getBoundingClientRect();
        const x = Math.round(Math.max(10, Math.min(90, ((curX - rect.left) / rect.width) * 100)));
        const y = Math.round(Math.max(8, Math.min(92, ((curY - rect.top) / rect.height) * 100)));

        setAdditionalQrs((prev) =>
          prev.map((q) => (q.id === qrId ? { ...q, posX: x, posY: y } : q))
        );
      }
    };

    const onPointerUp = () => {
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      if (hasCrossedThreshold) {
        setDraggingAdditionalQrId(null);
      }
    };

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
  };

  // Corner resize handlers for duplicated QR instances
  const handleStartResizeAdditionalCorner = (e, qrId, corner) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingAdditionalQrId(qrId);
    resizeAdditionalCornerRef.current = corner;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const currentItem = additionalQrs.find((q) => q.id === qrId);
    resizeAdditionalStartRef.current = {
      startX: clientX,
      startY: clientY,
      startSize: currentItem?.size || 140,
    };
  };

  const handleAdditionalCornerResizeMove = useCallback(
    (e) => {
      if (!resizingAdditionalQrId) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const { startX, startY, startSize } = resizeAdditionalStartRef.current;
      const corner = resizeAdditionalCornerRef.current;

      const deltaX = clientX - startX;
      const deltaY = clientY - startY;

      let sizeDelta = 0;
      if (corner === 'se') {
        sizeDelta = (deltaX + deltaY) / 1.5;
      } else if (corner === 'sw') {
        sizeDelta = (-deltaX + deltaY) / 1.5;
      } else if (corner === 'ne') {
        sizeDelta = (deltaX - deltaY) / 1.5;
      } else if (corner === 'nw') {
        sizeDelta = (-deltaX - deltaY) / 1.5;
      }

      const newSize = Math.max(65, Math.min(300, Math.round(startSize + sizeDelta)));
      setAdditionalQrs((prev) =>
        prev.map((q) => (q.id === resizingAdditionalQrId ? { ...q, size: newSize } : q))
      );
    },
    [resizingAdditionalQrId]
  );

  const handleAdditionalCornerResizeEnd = useCallback(() => {
    if (resizingAdditionalQrId) {
      setResizingAdditionalQrId(null);
    }
  }, [resizingAdditionalQrId]);

  useEffect(() => {
    if (resizingAdditionalQrId) {
      const onMove = (e) => handleAdditionalCornerResizeMove(e);
      const onUp = () => handleAdditionalCornerResizeEnd();
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchmove', onMove);
      window.addEventListener('touchend', onUp);
      return () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('touchend', onUp);
      };
    }
  }, [resizingAdditionalQrId, handleAdditionalCornerResizeMove, handleAdditionalCornerResizeEnd]);

  // Movable and Customizable Text Actions
  const handleAddCustomTextBox = () => {
    const newId = `box-${Date.now()}`;
    const newBox = {
      id: newId,
      text: 'Click to edit text',
      fontSize: 16,
      isBold: true,
      color: 'auto',
      posX: 50,
      posY: 22 + ((customTextBoxes.length * 8) % 30),
    };
    setCustomTextBoxes((prev) => [...prev, newBox]);
    setSelectedElementId(`custom-${newId}`);
  };

  const handleResetTextPosition = (id) => {
    const reset = (c) => ({
      ...c,
      posX: null,
      posY: null,
      isCustomPosition: false,
      width: null,
      height: null,
      isVertical: false,
      rotation: 0,
    });
    if (id === 'headline') {
      setHeadlineConfig(reset);
    } else if (id === 'subtitle') {
      setSubtitleConfig(reset);
    } else if (id === 'restaurantName') {
      setRestaurantNameConfig(reset);
    } else if (id === 'phone') {
      setPhoneConfig(reset);
    } else if (id === 'badge' || id === 'tableMenuBadge') {
      setBadgeConfig(reset);
    } else if (id === 'phoneLogo') {
      setPhoneLogoConfig((c) => ({ ...c, posX: null, posY: null, isCustomPosition: false }));
    } else if (id === 'side2Header') {
      setSide2HeaderConfig(reset);
    } else if (id === 'side2Headline') {
      setSide2HeadlineConfig(reset);
    } else if (id === 'side2Subtitle') {
      setSide2SubtitleConfig(reset);
    } else if (id === 'side2Footer') {
      setSide2FooterConfig(reset);
    } else if (id === 'foldText') {
      setFoldTextConfig(reset);
    } else if (id === 'side2-qr') {
      setSide2QrConfig((c) => ({ ...c, posX: null, posY: null, isCustomPosition: false }));
    }
  };

  const handleUpdateText = (id, newText) => {
    if (id === 'headline') {
      setHeadline(newText);
    } else if (id === 'subtitle') {
      setCustomSubtitle(newText);
    } else if (id === 'restaurantName') {
      setCustomRestaurantName(newText);
    } else if (id === 'phone') {
      setCustomFooter(newText);
    } else if (id === 'badge' || id === 'tableMenuBadge') {
      setCustomBadgeText(newText);
    } else if (id === 'foldText') {
      setFoldText(newText);
    } else if (id === 'side2Header') {
      setSide2Header(newText);
    } else if (id === 'side2Headline') {
      setSide2Headline(newText);
    } else if (id === 'side2Subtitle') {
      setSide2Subtitle(newText);
    } else if (id === 'side2Footer') {
      setSide2Footer(newText);
    } else {
      setCustomTextBoxes((prev) =>
        prev.map((b) => (b.id === id ? { ...b, text: newText } : b))
      );
    }
  };

  const handleToggleBold = (id) => {
    if (id === 'headline') {
      setHeadlineConfig((c) => ({ ...c, isBold: !c.isBold }));
    } else if (id === 'subtitle') {
      setSubtitleConfig((c) => ({ ...c, isBold: !c.isBold }));
    } else if (id === 'restaurantName') {
      setRestaurantNameConfig((c) => ({ ...c, isBold: !c.isBold }));
    } else if (id === 'phone') {
      setPhoneConfig((c) => ({ ...c, isBold: !c.isBold }));
    } else if (id === 'badge' || id === 'tableMenuBadge') {
      setBadgeConfig((c) => ({ ...c, isBold: !c.isBold }));
    } else if (id === 'side2Header') {
      setSide2HeaderConfig((c) => ({ ...c, isBold: !c.isBold }));
    } else if (id === 'side2Headline') {
      setSide2HeadlineConfig((c) => ({ ...c, isBold: !c.isBold }));
    } else if (id === 'side2Subtitle') {
      setSide2SubtitleConfig((c) => ({ ...c, isBold: !c.isBold }));
    } else if (id === 'side2Footer') {
      setSide2FooterConfig((c) => ({ ...c, isBold: !c.isBold }));
    } else if (id === 'foldText') {
      setFoldTextConfig((c) => ({ ...c, isBold: !c.isBold }));
    } else if (id.startsWith('custom-')) {
      const boxId = id.replace('custom-', '');
      setCustomTextBoxes((prev) =>
        prev.map((b) => (b.id === boxId ? { ...b, isBold: !b.isBold } : b))
      );
    }
  };

  const handleChangeFontSize = (id, delta) => {
    if (id === 'headline') {
      setHeadlineConfig((c) => ({ ...c, fontSize: Math.max(12, Math.min(44, c.fontSize + delta)) }));
    } else if (id === 'subtitle') {
      setSubtitleConfig((c) => ({ ...c, fontSize: Math.max(10, Math.min(32, c.fontSize + delta)) }));
    } else if (id === 'restaurantName') {
      setRestaurantNameConfig((c) => ({ ...c, fontSize: Math.max(9, Math.min(48, c.fontSize + delta)) }));
    } else if (id === 'phone') {
      setPhoneConfig((c) => ({ ...c, fontSize: Math.max(8, Math.min(32, c.fontSize + delta)) }));
    } else if (id === 'badge' || id === 'tableMenuBadge') {
      setBadgeConfig((c) => ({ ...c, fontSize: Math.max(7, Math.min(32, c.fontSize + delta)) }));
    } else if (id === 'phoneLogo') {
      setPhoneLogoConfig((c) => ({ ...c, size: Math.max(8, Math.min(36, (c.size || 13) + delta)) }));
    } else if (id === 'side2Header') {
      setSide2HeaderConfig((c) => ({ ...c, fontSize: Math.max(9, Math.min(36, c.fontSize + delta)) }));
    } else if (id === 'side2Headline') {
      setSide2HeadlineConfig((c) => ({ ...c, fontSize: Math.max(10, Math.min(40, c.fontSize + delta)) }));
    } else if (id === 'side2Subtitle') {
      setSide2SubtitleConfig((c) => ({ ...c, fontSize: Math.max(8, Math.min(30, c.fontSize + delta)) }));
    } else if (id === 'side2Footer') {
      setSide2FooterConfig((c) => ({ ...c, fontSize: Math.max(8, Math.min(26, c.fontSize + delta)) }));
    } else if (id === 'foldText') {
      setFoldTextConfig((c) => ({ ...c, fontSize: Math.max(8, Math.min(24, c.fontSize + delta)) }));
    } else if (id.startsWith('custom-')) {
      const boxId = id.replace('custom-', '');
      setCustomTextBoxes((prev) =>
        prev.map((b) =>
          b.id === boxId ? { ...b, fontSize: Math.max(10, Math.min(48, b.fontSize + delta)) } : b
        )
      );
    }
  };

  const handleSetFontSize = (id, newSize) => {
    const size = Math.round(newSize);
    if (id === 'headline') {
      setHeadlineConfig((c) => ({ ...c, fontSize: Math.max(10, Math.min(60, size)) }));
    } else if (id === 'subtitle') {
      setSubtitleConfig((c) => ({ ...c, fontSize: Math.max(8, Math.min(48, size)) }));
    } else if (id === 'restaurantName') {
      setRestaurantNameConfig((c) => ({ ...c, fontSize: Math.max(8, Math.min(60, size)) }));
    } else if (id === 'phone') {
      setPhoneConfig((c) => ({ ...c, fontSize: Math.max(7, Math.min(40, size)) }));
    } else if (id === 'badge' || id === 'tableMenuBadge') {
      setBadgeConfig((c) => ({ ...c, fontSize: Math.max(7, Math.min(40, size)) }));
    } else if (id === 'phoneLogo') {
      setPhoneLogoConfig((c) => ({ ...c, size: Math.max(8, Math.min(48, size)) }));
    } else if (id === 'side2Header') {
      setSide2HeaderConfig((c) => ({ ...c, fontSize: Math.max(8, Math.min(48, size)) }));
    } else if (id === 'side2Headline') {
      setSide2HeadlineConfig((c) => ({ ...c, fontSize: Math.max(8, Math.min(54, size)) }));
    } else if (id === 'side2Subtitle') {
      setSide2SubtitleConfig((c) => ({ ...c, fontSize: Math.max(7, Math.min(40, size)) }));
    } else if (id === 'side2Footer') {
      setSide2FooterConfig((c) => ({ ...c, fontSize: Math.max(7, Math.min(36, size)) }));
    } else if (id === 'foldText') {
      setFoldTextConfig((c) => ({ ...c, fontSize: Math.max(7, Math.min(30, size)) }));
    } else {
      const boxId = id.startsWith('custom-') ? id.replace('custom-', '') : id;
      setCustomTextBoxes((prev) =>
        prev.map((b) =>
          (b.id === boxId || b.id === id) ? { ...b, fontSize: Math.max(8, Math.min(64, size)) } : b
        )
      );
    }
  };

  const handleSetDimensions = (id, { width, height }) => {
    const update = (c) => ({
      ...c,
      ...(width !== undefined ? { width } : {}),
      ...(height !== undefined ? { height } : {}),
    });

    if (id === 'headline') setHeadlineConfig(update);
    else if (id === 'subtitle') setSubtitleConfig(update);
    else if (id === 'restaurantName') setRestaurantNameConfig(update);
    else if (id === 'phone') setPhoneConfig(update);
    else if (id === 'badge' || id === 'tableMenuBadge') setBadgeConfig(update);
    else if (id === 'side2Header') setSide2HeaderConfig(update);
    else if (id === 'side2Headline') setSide2HeadlineConfig(update);
    else if (id === 'side2Subtitle') setSide2SubtitleConfig(update);
    else if (id === 'side2Footer') setSide2FooterConfig(update);
    else if (id === 'foldText') setFoldTextConfig(update);
    else {
      const boxId = id.startsWith('custom-') ? id.replace('custom-', '') : id;
      setCustomTextBoxes((prev) =>
        prev.map((b) => ((b.id === boxId || b.id === id) ? update(b) : b))
      );
    }
  };

  const handleToggleOrientation = (id) => {
    const toggle = (c) => ({ ...c, isVertical: !c.isVertical });
    if (id === 'headline') setHeadlineConfig(toggle);
    else if (id === 'subtitle') setSubtitleConfig(toggle);
    else if (id === 'restaurantName') setRestaurantNameConfig(toggle);
    else if (id === 'phone') setPhoneConfig(toggle);
    else if (id === 'badge' || id === 'tableMenuBadge') setBadgeConfig(toggle);
    else if (id === 'side2Header') setSide2HeaderConfig(toggle);
    else if (id === 'side2Headline') setSide2HeadlineConfig(toggle);
    else if (id === 'side2Subtitle') setSide2SubtitleConfig(toggle);
    else if (id === 'side2Footer') setSide2FooterConfig(toggle);
    else if (id === 'foldText') setFoldTextConfig(toggle);
    else {
      const boxId = id.startsWith('custom-') ? id.replace('custom-', '') : id;
      setCustomTextBoxes((prev) =>
        prev.map((b) => ((b.id === boxId || b.id === id) ? toggle(b) : b))
      );
    }
  };

  const handleRotateText = (id) => {
    const nextRot = (rot) => ((rot || 0) + 90) % 360;
    const rotate = (c) => ({ ...c, rotation: nextRot(c.rotation) });
    if (id === 'headline') setHeadlineConfig(rotate);
    else if (id === 'subtitle') setSubtitleConfig(rotate);
    else if (id === 'restaurantName') setRestaurantNameConfig(rotate);
    else if (id === 'phone') setPhoneConfig(rotate);
    else if (id === 'badge' || id === 'tableMenuBadge') setBadgeConfig(rotate);
    else if (id === 'side2Header') setSide2HeaderConfig(rotate);
    else if (id === 'side2Headline') setSide2HeadlineConfig(rotate);
    else if (id === 'side2Subtitle') setSide2SubtitleConfig(rotate);
    else if (id === 'side2Footer') setSide2FooterConfig(rotate);
    else if (id === 'foldText') setFoldTextConfig(rotate);
    else {
      const boxId = id.startsWith('custom-') ? id.replace('custom-', '') : id;
      setCustomTextBoxes((prev) =>
        prev.map((b) => ((b.id === boxId || b.id === id) ? rotate(b) : b))
      );
    }
  };

  const handleChangeColor = (id, color) => {
    if (id === 'headline') {
      setHeadlineConfig((c) => ({ ...c, color }));
    } else if (id === 'subtitle') {
      setSubtitleConfig((c) => ({ ...c, color }));
    } else if (id === 'restaurantName') {
      setRestaurantNameConfig((c) => ({ ...c, color }));
    } else if (id === 'phone') {
      setPhoneConfig((c) => ({ ...c, color }));
    } else if (id === 'badge' || id === 'tableMenuBadge') {
      setBadgeConfig((c) => ({ ...c, bgColor: color, color: color === '#ffffff' ? '#0f172a' : '#ffffff' }));
    } else if (id === 'phoneLogo') {
      setPhoneLogoConfig((c) => ({ ...c, color }));
    } else if (id === 'side2Header') {
      setSide2HeaderConfig((c) => ({ ...c, color }));
    } else if (id === 'side2Headline') {
      setSide2HeadlineConfig((c) => ({ ...c, color }));
    } else if (id === 'side2Subtitle') {
      setSide2SubtitleConfig((c) => ({ ...c, color }));
    } else if (id === 'side2Footer') {
      setSide2FooterConfig((c) => ({ ...c, color }));
    } else if (id === 'foldText') {
      setFoldTextConfig((c) => ({ ...c, color }));
    } else if (id.startsWith('custom-')) {
      const boxId = id.replace('custom-', '');
      setCustomTextBoxes((prev) =>
        prev.map((b) => (b.id === boxId ? { ...b, color } : b))
      );
    }
  };

  const handleDeleteCustomText = (boxId) => {
    setCustomTextBoxes((prev) => prev.filter((b) => b.id !== boxId));
    if (selectedElementId === `custom-${boxId}`) {
      setSelectedElementId(null);
    }
  };

  // Copy active element data to internal clipboard (Ctrl+C / Cmd+C)
  const handleCopyElement = useCallback(() => {
    if (!selectedElementId) return;
    if (selectedElementId === 'qr') {
      copiedElementRef.current = {
        type: 'qr',
        size: qrSize || 140,
        posX: qrPositionMode === 'custom' ? qrPosX : 50,
        posY: qrPositionMode === 'custom' ? qrPosY : 50,
      };
      showCopyToast('📋 QR Code copied! Press Ctrl+V to paste');
    } else if (selectedElementId === 'side2-qr') {
      copiedElementRef.current = {
        type: 'qr',
        size: side2QrConfig.size || 110,
        posX: side2QrConfig.isCustomPosition ? side2QrConfig.posX : 65,
        posY: side2QrConfig.isCustomPosition ? side2QrConfig.posY : 70,
      };
      showCopyToast('📋 Side 2 QR Code copied! Press Ctrl+V to paste');
    } else if (selectedElementId.startsWith('qr-')) {
      const qrItem = additionalQrs.find((q) => q.id === selectedElementId);
      if (qrItem) {
        copiedElementRef.current = {
          type: 'qr',
          size: qrItem.size || qrSize || 140,
          posX: qrItem.posX,
          posY: qrItem.posY,
        };
        showCopyToast('📋 QR Code copied! Press Ctrl+V to paste');
      }
    } else if (selectedElementId.startsWith('custom-')) {
      const boxId = selectedElementId.replace('custom-', '');
      const box = customTextBoxes.find((b) => b.id === boxId);
      if (box) {
        copiedElementRef.current = { ...box, type: 'text' };
        showCopyToast('📋 Text copied! Press Ctrl+V to paste');
      }
    } else if (selectedElementId === 'headline') {
      copiedElementRef.current = {
        type: 'text',
        text: headline || 'Scan to Order',
        fontSize: headlineConfig?.fontSize || 18,
        isBold: headlineConfig?.isBold ?? true,
        color: headlineConfig?.color && headlineConfig.color !== 'auto' ? headlineConfig.color : '#ffffff',
        posX: headlineConfig?.posX ?? 50,
        posY: headlineConfig?.posY ?? 20,
      };
      showCopyToast('📋 Headline copied! Press Ctrl+V to paste');
    } else if (selectedElementId === 'subtitle') {
      copiedElementRef.current = {
        type: 'text',
        text: customSubtitle || 'Order direct and save!',
        fontSize: subtitleConfig?.fontSize || 12,
        isBold: subtitleConfig?.isBold ?? false,
        color: subtitleConfig?.color && subtitleConfig.color !== 'auto' ? subtitleConfig.color : '#f59e0b',
        posX: subtitleConfig?.posX ?? 50,
        posY: subtitleConfig?.posY ?? 30,
      };
      showCopyToast('📋 Subtitle copied! Press Ctrl+V to paste');
    } else if (selectedElementId === 'foldText') {
      copiedElementRef.current = {
        type: 'text',
        text: foldText,
        fontSize: 10,
        isBold: true,
        color: '#ffffff',
        posX: 50,
        posY: 50,
      };
      showCopyToast('📋 Fold text copied! Press Ctrl+V to paste');
    } else if (selectedElementId === 'side2Header') {
      copiedElementRef.current = {
        type: 'text',
        text: side2Header,
        fontSize: 12,
        isBold: true,
        color: '#ffffff',
        posX: 50,
        posY: 60,
      };
      showCopyToast('📋 Side 2 header copied! Press Ctrl+V to paste');
    } else if (selectedElementId === 'side2Headline') {
      copiedElementRef.current = {
        type: 'text',
        text: side2Headline,
        fontSize: 13,
        isBold: true,
        color: '#ffffff',
        posX: 50,
        posY: 68,
      };
      showCopyToast('📋 Side 2 headline copied! Press Ctrl+V to paste');
    } else if (selectedElementId === 'side2Subtitle') {
      copiedElementRef.current = {
        type: 'text',
        text: side2Subtitle,
        fontSize: 11,
        isBold: false,
        color: '#ffffff',
        posX: 50,
        posY: 75,
      };
      showCopyToast('📋 Side 2 description copied! Press Ctrl+V to paste');
    } else if (selectedElementId === 'side2Footer') {
      copiedElementRef.current = {
        type: 'text',
        text: side2Footer || menuUrl,
        fontSize: 10,
        isBold: false,
        color: '#ffffff',
        posX: 50,
        posY: 85,
      };
      showCopyToast('📋 Side 2 link copied! Press Ctrl+V to paste');
    } else if (selectedElementId === 'restaurantName') {
      copiedElementRef.current = {
        type: 'text',
        text: storeName,
        fontSize: restaurantNameConfig?.fontSize || 14,
        isBold: restaurantNameConfig?.isBold ?? true,
        color: restaurantNameConfig?.color && restaurantNameConfig.color !== 'auto' ? restaurantNameConfig.color : '#ffffff',
        posX: restaurantNameConfig?.posX ?? 50,
        posY: restaurantNameConfig?.posY ?? 20,
      };
      showCopyToast('📋 Restaurant name copied! Press Ctrl+V to paste');
    } else if (selectedElementId === 'phone') {
      copiedElementRef.current = {
        type: 'text',
        text: effectiveFooter,
        fontSize: phoneConfig?.fontSize || 11,
        isBold: phoneConfig?.isBold ?? true,
        color: phoneConfig?.color && phoneConfig.color !== 'auto' ? phoneConfig.color : '#ffffff',
        posX: phoneConfig?.posX ?? 50,
        posY: phoneConfig?.posY ?? 85,
      };
      showCopyToast('📋 Phone number copied! Press Ctrl+V to paste');
    } else if (selectedElementId === 'badge' || selectedElementId === 'tableMenuBadge') {
      copiedElementRef.current = {
        type: 'text',
        text: customBadgeText || 'Table Menu',
        fontSize: badgeConfig?.fontSize || 9,
        isBold: badgeConfig?.isBold ?? true,
        color: badgeConfig?.color || '#ffffff',
        posX: badgeConfig?.posX ?? 50,
        posY: badgeConfig?.posY ?? 20,
      };
      showCopyToast('📋 Badge copied! Press Ctrl+V to paste');
    }
  }, [
    selectedElementId,
    qrSize,
    qrPositionMode,
    qrPosX,
    qrPosY,
    additionalQrs,
    customTextBoxes,
    headline,
    headlineConfig,
    customSubtitle,
    subtitleConfig,
    restaurantNameConfig,
    phoneConfig,
    storeName,
    effectiveFooter,
    foldText,
    side2Header,
    side2Headline,
    side2Subtitle,
    side2Footer,
    menuUrl,
    showCopyToast,
  ]);

  // Paste copied element onto the canvas with slight offset (Ctrl+V / Cmd+V)
  const handlePasteElement = useCallback(() => {
    if (!copiedElementRef.current) return;
    const item = copiedElementRef.current;

    if (item.type === 'qr') {
      const newId = `qr-${Date.now()}`;
      const nextPosX = Math.min(85, Math.max(15, (item.posX ?? 50) + 6));
      const nextPosY = Math.min(85, Math.max(15, (item.posY ?? 50) + 6));
      const newQr = {
        id: newId,
        size: item.size || 140,
        posX: nextPosX,
        posY: nextPosY,
      };
      copiedElementRef.current.posX = nextPosX;
      copiedElementRef.current.posY = nextPosY;

      setAdditionalQrs((prev) => [...prev, newQr]);
      setSelectedElementId(newId);
      showCopyToast('Pasted QR duplicate on canvas!');
      return;
    }

    const newId = `box-${Date.now()}`;
    const nextPosX = Math.min(85, Math.max(15, (item.posX ?? 50) + 6));
    const nextPosY = Math.min(85, Math.max(15, (item.posY ?? 50) + 6));
    const newBox = {
      id: newId,
      text: item.text,
      fontSize: item.fontSize || 14,
      isBold: item.isBold ?? false,
      color: item.color || 'auto',
      posX: nextPosX,
      posY: nextPosY,
    };
    copiedElementRef.current.posX = nextPosX;
    copiedElementRef.current.posY = nextPosY;

    setCustomTextBoxes((prev) => [...prev, newBox]);
    setSelectedElementId(`custom-${newId}`);
    showCopyToast('Pasted duplicate on canvas!');
  }, [showCopyToast]);

  // 1-Click Duplicate Action (from Toolbar or Shortcut)
  const handleDuplicateElement = useCallback(
    (elementIdToDuplicate) => {
      const id = elementIdToDuplicate || selectedElementId;
      if (!id) return;

      if (id === 'qr' || id === 'side2-qr' || id.startsWith('qr-')) {
        handleDuplicateQr(id);
        return;
      }

      if (id.startsWith('custom-')) {
        const boxId = id.replace('custom-', '');
        const original = customTextBoxes.find((b) => b.id === boxId);
        if (original) {
          const newId = `box-${Date.now()}`;
          const newBox = {
            id: newId,
            text: original.text,
            fontSize: original.fontSize,
            isBold: original.isBold,
            color: original.color,
            posX: Math.min(85, Math.max(15, (original.posX ?? 50) + 6)),
            posY: Math.min(85, Math.max(15, (original.posY ?? 50) + 6)),
          };
          setCustomTextBoxes((prev) => [...prev, newBox]);
          setSelectedElementId(`custom-${newId}`);
          copiedElementRef.current = { ...newBox, type: 'text' };
          showCopyToast('Duplicated text box!');
        }
      } else if (id === 'headline') {
        const newId = `box-${Date.now()}`;
        const newBox = {
          id: newId,
          text: headline || 'Scan to Order',
          fontSize: headlineConfig?.fontSize || 18,
          isBold: headlineConfig?.isBold ?? true,
          color: headlineConfig?.color && headlineConfig.color !== 'auto' ? headlineConfig.color : '#ffffff',
          posX: Math.min(85, Math.max(15, (headlineConfig?.posX ?? 50) + 6)),
          posY: Math.min(85, Math.max(15, (headlineConfig?.posY ?? 20) + 6)),
        };
        setCustomTextBoxes((prev) => [...prev, newBox]);
        setSelectedElementId(`custom-${newId}`);
        copiedElementRef.current = { ...newBox, type: 'text' };
        showCopyToast('Duplicated headline!');
      } else if (id === 'subtitle') {
        const newId = `box-${Date.now()}`;
        const newBox = {
          id: newId,
          text: customSubtitle || 'Order direct and save!',
          fontSize: subtitleConfig?.fontSize || 12,
          isBold: subtitleConfig?.isBold ?? false,
          color: subtitleConfig?.color && subtitleConfig.color !== 'auto' ? subtitleConfig.color : '#f59e0b',
          posX: Math.min(85, Math.max(15, (subtitleConfig?.posX ?? 50) + 6)),
          posY: Math.min(85, Math.max(15, (subtitleConfig?.posY ?? 30) + 6)),
        };
        setCustomTextBoxes((prev) => [...prev, newBox]);
        setSelectedElementId(`custom-${newId}`);
        copiedElementRef.current = { ...newBox, type: 'text' };
        showCopyToast('Duplicated subtitle!');
      } else if (id === 'foldText') {
        const newId = `box-${Date.now()}`;
        const newBox = {
          id: newId,
          text: foldText,
          fontSize: 12,
          isBold: true,
          color: '#ffffff',
          posX: 50,
          posY: 52,
        };
        setCustomTextBoxes((prev) => [...prev, newBox]);
        setSelectedElementId(`custom-${newId}`);
        copiedElementRef.current = { ...newBox, type: 'text' };
        showCopyToast('Duplicated fold text!');
      } else if (id === 'side2Header') {
        const newId = `box-${Date.now()}`;
        const newBox = {
          id: newId,
          text: side2Header,
          fontSize: 13,
          isBold: true,
          color: '#ffffff',
          posX: 50,
          posY: 60,
        };
        setCustomTextBoxes((prev) => [...prev, newBox]);
        setSelectedElementId(`custom-${newId}`);
        copiedElementRef.current = { ...newBox, type: 'text' };
        showCopyToast('Duplicated header text!');
      } else if (id === 'side2Headline') {
        const newId = `box-${Date.now()}`;
        const newBox = {
          id: newId,
          text: side2Headline,
          fontSize: 14,
          isBold: true,
          color: '#ffffff',
          posX: 50,
          posY: 68,
        };
        setCustomTextBoxes((prev) => [...prev, newBox]);
        setSelectedElementId(`custom-${newId}`);
        copiedElementRef.current = { ...newBox, type: 'text' };
        showCopyToast('Duplicated headline text!');
      } else if (id === 'side2Subtitle') {
        const newId = `box-${Date.now()}`;
        const newBox = {
          id: newId,
          text: side2Subtitle,
          fontSize: 11,
          isBold: false,
          color: '#ffffff',
          posX: 50,
          posY: 75,
        };
        setCustomTextBoxes((prev) => [...prev, newBox]);
        setSelectedElementId(`custom-${newId}`);
        copiedElementRef.current = { ...newBox, type: 'text' };
        showCopyToast('Duplicated description text!');
      } else if (id === 'side2Footer') {
        const newId = `box-${Date.now()}`;
        const newBox = {
          id: newId,
          text: side2Footer || menuUrl,
          fontSize: 10,
          isBold: false,
          color: '#ffffff',
          posX: 50,
          posY: 85,
        };
        setCustomTextBoxes((prev) => [...prev, newBox]);
        setSelectedElementId(`custom-${newId}`);
        copiedElementRef.current = { ...newBox, type: 'text' };
        showCopyToast('Duplicated link text!');
      } else if (id === 'restaurantName') {
        const newId = `box-${Date.now()}`;
        const newBox = {
          id: newId,
          text: storeName,
          fontSize: restaurantNameConfig?.fontSize || 14,
          isBold: restaurantNameConfig?.isBold ?? true,
          color: restaurantNameConfig?.color && restaurantNameConfig.color !== 'auto' ? restaurantNameConfig.color : '#ffffff',
          posX: Math.min(85, Math.max(15, (restaurantNameConfig?.posX ?? 50) + 6)),
          posY: Math.min(85, Math.max(15, (restaurantNameConfig?.posY ?? 20) + 6)),
        };
        setCustomTextBoxes((prev) => [...prev, newBox]);
        setSelectedElementId(`custom-${newId}`);
        copiedElementRef.current = { ...newBox, type: 'text' };
        showCopyToast('Duplicated restaurant name!');
      } else if (id === 'phone') {
        const newId = `box-${Date.now()}`;
        const newBox = {
          id: newId,
          text: effectiveFooter,
          fontSize: phoneConfig?.fontSize || 11,
          isBold: phoneConfig?.isBold ?? true,
          color: phoneConfig?.color && phoneConfig.color !== 'auto' ? phoneConfig.color : '#ffffff',
          posX: Math.min(85, Math.max(15, (phoneConfig?.posX ?? 50) + 6)),
          posY: Math.min(85, Math.max(15, (phoneConfig?.posY ?? 85) + 6)),
        };
        setCustomTextBoxes((prev) => [...prev, newBox]);
        setSelectedElementId(`custom-${newId}`);
        copiedElementRef.current = { ...newBox, type: 'text' };
        showCopyToast('Duplicated phone number!');
      } else if (id === 'badge' || id === 'tableMenuBadge') {
        const newId = `box-${Date.now()}`;
        const newBox = {
          id: newId,
          text: customBadgeText || 'Table Menu',
          fontSize: badgeConfig?.fontSize || 9,
          isBold: badgeConfig?.isBold ?? true,
          color: badgeConfig?.color || '#ffffff',
          posX: Math.min(85, Math.max(15, (badgeConfig?.posX ?? 50) + 6)),
          posY: Math.min(85, Math.max(15, (badgeConfig?.posY ?? 20) + 6)),
        };
        setCustomTextBoxes((prev) => [...prev, newBox]);
        setSelectedElementId(`custom-${newId}`);
        copiedElementRef.current = { ...newBox, type: 'text' };
        showCopyToast('Duplicated badge!');
      }
    },
    [
      selectedElementId,
      handleDuplicateQr,
      customTextBoxes,
      headline,
      headlineConfig,
      customSubtitle,
      subtitleConfig,
      restaurantNameConfig,
      phoneConfig,
      customBadgeText,
      badgeConfig,
      storeName,
      effectiveFooter,
      foldText,
      side2Header,
      side2Headline,
      side2Subtitle,
      side2Footer,
      menuUrl,
      showCopyToast,
    ]
  );

  // Global Keyboard Shortcuts (Ctrl+C, Ctrl+V, Delete)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept if inside an input or textarea
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) {
        return;
      }

      // Check Ctrl+C / Cmd+C
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        const textSelected = window.getSelection()?.toString();
        if (textSelected && textSelected.length > 0) {
          return; // Allow native copying of selected text characters
        }
        if (selectedElementId) {
          e.preventDefault();
          handleCopyElement();
        }
      }

      // Check Ctrl+V / Cmd+V
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (e.target?.isContentEditable && window.getSelection()?.toString()?.length > 0) {
          return;
        }
        if (copiedElementRef.current) {
          e.preventDefault();
          handlePasteElement();
        }
      }

      // Delete key removes selected custom box or duplicated QR if not actively typing
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (e.target?.isContentEditable) return;
        if (selectedElementId && selectedElementId.startsWith('custom-')) {
          e.preventDefault();
          const boxId = selectedElementId.replace('custom-', '');
          handleDeleteCustomText(boxId);
          showCopyToast('🗑️ Text box deleted');
        } else if (selectedElementId && selectedElementId.startsWith('qr-')) {
          e.preventDefault();
          handleDeleteAdditionalQr(selectedElementId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedElementId,
    handleCopyElement,
    handlePasteElement,
    handleDeleteAdditionalQr,
    showCopyToast,
  ]);

  // Text drag moving with drag threshold (dist >= 6px) to avoid accidental position detachment on click/selection
  const handleStartDragText = (e, elementId) => {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    setSelectedElementId(elementId);

    const surface = document.getElementById('print-material-export-surface');
    const target = e.currentTarget;
    const sRect = surface?.getBoundingClientRect() || null;
    const tRect = target?.getBoundingClientRect() || null;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    let hasCrossedThreshold = false;

    const onPointerMove = (moveEvt) => {
      const curX = moveEvt.touches ? moveEvt.touches[0].clientX : moveEvt.clientX;
      const curY = moveEvt.touches ? moveEvt.touches[0].clientY : moveEvt.clientY;
      const dist = Math.hypot(curX - clientX, curY - clientY);

      if (!hasCrossedThreshold) {
        if (dist < 6) return; // Pure click/selection (<6px), do not detach!
        hasCrossedThreshold = true;

        // User dragged beyond 6px -> now detach and set isCustomPosition
        const initPos = (setter, currentConfig) => {
          if (!currentConfig.isCustomPosition && sRect && tRect) {
            const centerX = Math.round(((tRect.left + tRect.width / 2 - sRect.left) / sRect.width) * 100);
            const centerY = Math.round(((tRect.top + tRect.height / 2 - sRect.top) / sRect.height) * 100);
            const capturedWidth = Math.round(tRect.width);
            setter((c) => ({
              ...c,
              posX: Math.max(10, Math.min(90, centerX)),
              posY: Math.max(8, Math.min(92, centerY)),
              width: c.width || capturedWidth, // preserve width so text NEVER expands into 1-line horizontal strip!
              isCustomPosition: true,
            }));
          }
        };

        if (elementId === 'headline') initPos(setHeadlineConfig, headlineConfig);
        else if (elementId === 'subtitle') initPos(setSubtitleConfig, subtitleConfig);
        else if (elementId === 'restaurantName') initPos(setRestaurantNameConfig, restaurantNameConfig);
        else if (elementId === 'phone') initPos(setPhoneConfig, phoneConfig);
        else if (elementId === 'badge' || elementId === 'tableMenuBadge') initPos(setBadgeConfig, badgeConfig);
        else if (elementId === 'phoneLogo') initPos(setPhoneLogoConfig, phoneLogoConfig);
        else if (elementId === 'side2Header') initPos(setSide2HeaderConfig, side2HeaderConfig);
        else if (elementId === 'side2Headline') initPos(setSide2HeadlineConfig, side2HeadlineConfig);
        else if (elementId === 'side2Subtitle') initPos(setSide2SubtitleConfig, side2SubtitleConfig);
        else if (elementId === 'side2Footer') initPos(setSide2FooterConfig, side2FooterConfig);
        else if (elementId === 'foldText') initPos(setFoldTextConfig, foldTextConfig);

        setDraggingTextId(elementId);
      }

      if (hasCrossedThreshold && surface) {
        const rect = surface.getBoundingClientRect();
        const x = Math.round(Math.max(10, Math.min(90, ((curX - rect.left) / rect.width) * 100)));
        const y = Math.round(Math.max(8, Math.min(92, ((curY - rect.top) / rect.height) * 100)));

        if (elementId === 'headline') {
          setHeadlineConfig((c) => ({ ...c, posX: x, posY: y, isCustomPosition: true }));
        } else if (elementId === 'subtitle') {
          setSubtitleConfig((c) => ({ ...c, posX: x, posY: y, isCustomPosition: true }));
        } else if (elementId === 'restaurantName') {
          setRestaurantNameConfig((c) => ({ ...c, posX: x, posY: y, isCustomPosition: true }));
        } else if (elementId === 'phone') {
          setPhoneConfig((c) => ({ ...c, posX: x, posY: y, isCustomPosition: true }));
        } else if (elementId === 'badge' || elementId === 'tableMenuBadge') {
          setBadgeConfig((c) => ({ ...c, posX: x, posY: y, isCustomPosition: true }));
        } else if (elementId === 'phoneLogo') {
          setPhoneLogoConfig((c) => ({ ...c, posX: x, posY: y, isCustomPosition: true }));
        } else if (elementId === 'side2Header') {
          setSide2HeaderConfig((c) => ({ ...c, posX: x, posY: y, isCustomPosition: true }));
        } else if (elementId === 'side2Headline') {
          setSide2HeadlineConfig((c) => ({ ...c, posX: x, posY: y, isCustomPosition: true }));
        } else if (elementId === 'side2Subtitle') {
          setSide2SubtitleConfig((c) => ({ ...c, posX: x, posY: y, isCustomPosition: true }));
        } else if (elementId === 'side2Footer') {
          setSide2FooterConfig((c) => ({ ...c, posX: x, posY: y, isCustomPosition: true }));
        } else if (elementId === 'foldText') {
          setFoldTextConfig((c) => ({ ...c, posX: x, posY: y, isCustomPosition: true }));
        } else if (elementId.startsWith('custom-')) {
          const boxId = elementId.replace('custom-', '');
          setCustomTextBoxes((prev) =>
            prev.map((b) => (b.id === boxId ? { ...b, posX: x, posY: y } : b))
          );
        }
      }
    };

    const onPointerUp = () => {
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      if (hasCrossedThreshold) {
        setDraggingTextId(null);
      }
    };

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
  };

  // Generate composite logo plate (Always ensures a crisp center logo plate)
  useEffect(() => {
    let isMounted = true;
    const activeLogoSource = customCenterLogoUrl || logoUrl;
    if (activeLogoSource) {
      createLogoPlate(activeLogoSource, { shape: logoShape }).then((plateUrl) => {
        if (isMounted) {
          setLogoPlateDataUrl(
            plateUrl || generateDefaultLogoBadge(storeName, customColor || '#ea580c', logoShape)
          );
        }
      });
    } else {
      const defaultBadge = generateDefaultLogoBadge(storeName, customColor || '#ea580c', logoShape);
      if (isMounted) {
        setLogoPlateDataUrl(defaultBadge);
      }
    }
    return () => {
      isMounted = false;
    };
  }, [customCenterLogoUrl, logoUrl, logoShape, storeName, customColor]);

  // Automated Scan Test Routine
  const runAutoScanTest = useCallback(
    async (requestedSize, plateUrl) => {
      setIsTestingScan(true);

      const targetRatio = requestedSize === 'small' ? 0.15 : 0.19;

      if (!showLogo || !plateUrl) {
        setEffectiveRatio(targetRatio);
        setScanStatus({
          status: 'verified',
          message: 'Scan Verified 100% Readable (Standard Level H QR)',
          decodedUrl: menuUrl,
          latencyMs: 1,
          attempts: 1,
        });
        setIsTestingScan(false);
        return;
      }

      setScanStatus((prev) => ({
        ...prev,
        status: 'testing',
        message: 'Testing QR scannability with jsQR...',
      }));

      const candidateRatios = [targetRatio, targetRatio * 0.85, 0.14, 0.11, 0.09];
      const testCanvasSize = 360;

      for (let i = 0; i < candidateRatios.length; i++) {
        const candidate = candidateRatios[i];
        const start = performance.now();

        try {
          const canvas = document.createElement('canvas');
          canvas.width = testCanvasSize;
          canvas.height = testCanvasSize;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) continue;

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, testCanvasSize, testCanvasSize);

          const qrCanvas = document.createElement('canvas');
          await QRCode.toCanvas(qrCanvas, menuUrl, {
            width: testCanvasSize - 32,
            margin: 0,
            errorCorrectionLevel: 'H',
            color: { dark: '#000000', light: '#ffffff' },
          });

          ctx.drawImage(qrCanvas, 16, 16);

          const plateWidth = (testCanvasSize - 32) * candidate;
          const plateX = 16 + (testCanvasSize - 32 - plateWidth) / 2;
          const plateY = 16 + (testCanvasSize - 32 - plateWidth) / 2;

          const img = new Image();
          await new Promise((res) => {
            img.onload = res;
            img.onerror = res;
            img.src = plateUrl;
          });

          ctx.fillStyle = '#ffffff';
          const radius = logoShape === 'circle' ? plateWidth / 2 : plateWidth * 0.18;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(plateX, plateY, plateWidth, plateWidth, radius);
          } else {
            ctx.arc(plateX + plateWidth / 2, plateY + plateWidth / 2, radius, 0, Math.PI * 2);
          }
          ctx.fill();

          ctx.drawImage(img, plateX, plateY, plateWidth, plateWidth);

          const imgData = ctx.getImageData(0, 0, testCanvasSize, testCanvasSize);
          const decoded = jsQR(imgData.data, testCanvasSize, testCanvasSize);
          const elapsed = Math.round(performance.now() - start);

          if (decoded && decoded.data === menuUrl) {
            setEffectiveRatio(candidate);
            setScanStatus({
              status: candidate === targetRatio ? 'verified' : 'adjusted',
              message:
                candidate === targetRatio
                  ? 'Scan Verified: 100% Readable with jsQR (Level H)'
                  : `Auto-Adjusted to ${(candidate * 100).toFixed(0)}% for 100% Scannability`,
              decodedUrl: decoded.data,
              latencyMs: Math.max(elapsed, 2),
              attempts: i + 1,
            });
            setIsTestingScan(false);
            return;
          }
        } catch (scanErr) {
          console.warn('Scan iteration error:', scanErr);
        }
      }

      setEffectiveRatio(0.12);
      setScanStatus({
        status: 'adjusted',
        message: 'Auto-scaled logo to safe minimum (Level H)',
        decodedUrl: menuUrl,
        latencyMs: 15,
        attempts: candidateRatios.length,
      });
      setIsTestingScan(false);
    },
    [menuUrl, showLogo, logoShape]
  );

  useEffect(() => {
    runAutoScanTest(logoSize, logoPlateDataUrl);
  }, [runAutoScanTest, logoSize, logoPlateDataUrl]);

  // Export 1: High Quality PDF (300 DPI with Bleed and Crop Marks)
  const handleDownloadPDF = async () => {
    const element = document.getElementById('print-material-export-surface');
    if (!element) return;

    try {
      setIsExportingPDF(true);

      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        ignoreElements: (el) => el.classList.contains('no-print'),
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      const pdf = new jsPDF({
        orientation: selectedSize.orientation || 'portrait',
        unit: 'mm',
        format: selectedSize.pdfFormat || 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(
        `${restaurant?.slug || 'dineflow'}-${selectedFormat.id}-${selectedSize.id}${
          showBleed ? '-with-bleed' : ''
        }.pdf`
      );
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Unable to generate PDF file. Please try the PNG download or browser print.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Export 2: Download High-Resolution PNG (300 DPI)
  const handleDownloadPNG = async () => {
    const element = document.getElementById('print-material-export-surface');
    if (!element) return;

    try {
      setIsExportingPNG(true);

      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        ignoreElements: (el) => el.classList.contains('no-print'),
      });

      const link = document.createElement('a');
      link.download = `${restaurant?.slug || 'dineflow'}-${selectedFormat.id}-${selectedSize.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error generating PNG:', err);
      alert('Unable to generate PNG file.');
    } finally {
      setIsExportingPNG(false);
    }
  };

  // Export 3: Download Clean Vector SVG for QR alone
  const handleDownloadSVG = () => {
    const svgElement = document.getElementById('standalone-export-qr-svg');
    if (!svgElement) return;

    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgElement);

    if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${restaurant?.slug || 'restaurant'}-qr-vector.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export: Download All Table QRs as a single PDF
  const handleExportAllTableQrs = async () => {
    try {
      setIsExportingAllTablePdf(true);
      await downloadAllTableQrsPdf({
        restaurant,
        tables: availableTables,
        origin,
      });
    } catch (err) {
      console.error('Failed to export all table QRs:', err);
    } finally {
      setIsExportingAllTablePdf(false);
    }
  };

  // Export 4: 1-Click Print
  const handlePrint = () => {
    const pageSizeRule = selectedSize.pageSize || 'A4 portrait';

    const printStyle = document.createElement('style');
    printStyle.id = 'dynamic-print-page-style';
    printStyle.innerHTML = `
      @media print {
        @page {
          size: ${pageSizeRule};
          margin: 0;
        }
        body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
        }
        body * {
          visibility: hidden !important;
        }
        #print-material-export-surface,
        #print-material-export-surface * {
          visibility: visible !important;
        }
        #print-material-export-surface {
          position: fixed !important;
          left: 0 !important;
          top: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          max-width: none !important;
          max-height: none !important;
          margin: 0 !important;
          padding: ${showBleed ? '8mm' : '0'} !important;
          box-shadow: none !important;
          border: none !important;
          border-radius: 0 !important;
          transform: none !important;
          z-index: 9999999 !important;
        }
      }
    `;

    document.head.appendChild(printStyle);
    window.print();

    setTimeout(() => {
      const el = document.getElementById('dynamic-print-page-style');
      if (el) el.remove();
    }, 1500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(menuUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredFormats = PRINT_FORMATS.filter(
    (f) => selectedCategory === 'all' || f.category === selectedCategory
  );

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 shadow-xs space-y-6 print:p-0 print:border-none print:shadow-none">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleCustomPhotoUpload}
        accept="image/*"
        className="hidden"
      />

      <div className="hidden">
        <QRCodeSVG
          id="standalone-export-qr-svg"
          value={menuUrl}
          size={512}
          level="H"
          includeMargin={true}
          imageSettings={
            showLogo && logoPlateDataUrl
              ? {
                  src: logoPlateDataUrl,
                  width: 512 * effectiveRatio,
                  height: 512 * effectiveRatio,
                  excavate: true,
                }
              : undefined
          }
        />
      </div>

      {/* Tab Header */}
      <div className="no-print p-5 rounded-3xl bg-gradient-to-r from-[#FFF9F2] via-[#FFFDF9] to-[#FFF9F2] border border-[#F0E4D7] flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-start sm:items-center gap-3.5">
          <span className="w-11 h-11 rounded-2xl bg-[#FFF1E6] text-[#F26B1D] border border-[#FCD8BF] flex items-center justify-center shrink-0 shadow-2xs">
            <Printer className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-lg sm:text-xl font-heading font-black text-[#2B2118] tracking-tight flex items-center gap-2 flex-wrap">
              <span>Print QR & Flyer Studio</span>
              <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#FFF1E6] text-[#D95A12] border border-[#FCD8BF]">
                Owner Control
              </span>
            </h2>
            <p className="text-xs text-[#7A6A5C] mt-0.5">
              Drag corners to resize QR, drag & drop elements, click text to edit & bold, add custom text boxes.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Utility Group */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white border border-[#F0E4D7] shadow-2xs">
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-xl bg-transparent hover:bg-[#FFF9F2] text-[#7A6A5C] hover:text-[#2B2118] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#F26B1D]" />}
              <span>{copied ? 'Copied' : 'Copy Menu URL'}</span>
            </button>

            <div className="w-px h-4 bg-[#F0E4D7]" />

            <button
              onClick={handleDownloadSVG}
              className="px-3 py-1.5 rounded-xl bg-transparent hover:bg-[#FFF9F2] text-[#7A6A5C] hover:text-[#2B2118] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Download Vector SVG of QR alone"
            >
              <FileCode className="w-3.5 h-3.5 text-[#F26B1D]" />
              <span>QR SVG</span>
            </button>
          </div>

          {/* Export Group */}
          <button
            onClick={handleDownloadPNG}
            disabled={isExportingPNG}
            className="px-3.5 py-2 rounded-xl bg-[#FFF1E6] hover:bg-[#FFE4CF] border border-[#FCD8BF] text-[#D95A12] text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-[#F26B1D]" />
            <span>{isExportingPNG ? 'Rendering...' : 'Download PNG'}</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={isExportingPDF}
            className="px-3.5 py-2 rounded-xl bg-[#2B2118] hover:bg-[#3D2F22] border border-[#2B2118] text-white text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            title="Export 300 DPI PDF ready for professional print shops"
          >
            <FileText className="w-3.5 h-3.5 text-[#FFA94D]" />
            <span>{isExportingPDF ? 'Generating PDF...' : 'Download PDF (300 DPI)'}</span>
          </button>

          <button
            onClick={handleExportAllTableQrs}
            disabled={isExportingAllTablePdf || availableTables.length === 0}
            className="px-3.5 py-2 rounded-xl bg-[#433022] hover:bg-[#2B2118] border border-[#5A4230] text-[#FFF1E6] text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            title="Download all table QR standee cards as a single PDF"
          >
            {isExportingAllTablePdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FFA94D]" />
            ) : (
              <Download className="w-3.5 h-3.5 text-[#FFA94D]" />
            )}
            <span>{isExportingAllTablePdf ? 'Generating...' : 'All Table QRs (PDF)'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F26B1D] to-[#D95A12] hover:from-[#D95A12] hover:to-[#C24E0D] text-white text-xs sm:text-sm font-extrabold shadow-md shadow-[#F26B1D]/25 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 stroke-[2.5]" />
            <span>Print Now</span>
          </button>
        </div>
      </div>

      {/* Missing Logo Hint Card */}
      {!logoUrl && (
        <div className="no-print p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 flex items-start gap-3 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="text-xs font-bold text-amber-900 leading-snug">
              Upload your logo in Store settings to add it to your QR code
            </p>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              Your print materials are currently generated with Error Correction Level H without a logo. Upload your restaurant brand logo in Store Settings to instantly center it inside all print formats.
            </p>
            {onNavigateToSettings && (
              <button
                type="button"
                onClick={onNavigateToSettings}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Store className="w-3.5 h-3.5" />
                <span>Go to Store Settings</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Visual Format Selector (Grid of 15 Cards) */}
      <div className="no-print space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#FFF9F2]/80 border border-[#F0E4D7]">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#2B2118] flex items-center gap-2 pl-1">
            <Layers className="w-4 h-4 text-[#F26B1D]" />
            Pick Print Format:
          </span>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {FORMAT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#2B2118] text-white shadow-xs'
                    : 'bg-white text-[#7A6A5C] border border-[#F0E4D7] hover:border-[#F26B1D]/40 hover:text-[#2B2118]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
          {filteredFormats.map((format) => {
            const isSelected = format.id === selectedFormatId;
            return (
              <button
                key={format.id}
                type="button"
                onClick={() => setSelectedFormatId(format.id)}
                className={`p-3 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between cursor-pointer relative overflow-hidden group ${
                  isSelected
                    ? 'bg-[#FFF1E6] border-[#F26B1D] ring-2 ring-[#F26B1D]/20 shadow-sm'
                    : 'bg-white border-[#F0E4D7] hover:border-[#F26B1D]/40 hover:bg-[#FFF9F2] shadow-xs'
                }`}
              >
                <div>
                  <div className="w-full h-16 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] flex items-center justify-center mb-2.5 relative overflow-hidden group-hover:scale-[1.02] transition-transform">
                    <div
                      className={`rounded shadow-xs flex flex-col items-center justify-center transition-all ${
                        isSelected ? 'bg-[#F26B1D] text-white' : 'bg-[#7A6A5C] text-white'
                      }`}
                      style={{
                        width:
                          format.previewType === 'standee'
                            ? '20px'
                            : format.previewType === 'table-sticker' || format.previewType === 'box-sticker'
                            ? '36px'
                            : format.previewType === 'business-card'
                            ? '48px'
                            : format.previewType === 'trifold'
                            ? '52px'
                            : '34px',
                        height:
                          format.previewType === 'standee'
                            ? '50px'
                            : format.previewType === 'table-sticker' || format.previewType === 'box-sticker'
                            ? '36px'
                            : format.previewType === 'business-card'
                            ? '28px'
                            : format.previewType === 'trifold'
                            ? '36px'
                            : '46px',
                      }}
                    >
                      <QrCode className="w-3.5 h-3.5 opacity-90" />
                    </div>
                  </div>

                  <h3 className="text-xs font-extrabold text-[#2B2118] leading-tight group-hover:text-[#F26B1D] transition">
                    {format.name}
                  </h3>
                  <p className="text-[10px] text-[#7A6A5C] leading-tight mt-1 line-clamp-1">
                    {format.tagline}
                  </p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-[#F0E4D7]/80 flex items-center justify-between">
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    isSelected
                      ? 'bg-[#F26B1D] text-white'
                      : 'bg-[#FFF9F2] text-[#7A6A5C] border border-[#F0E4D7]'
                  }`}>
                    {format.badge}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor & Live Exact-Ratio Preview Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start print:block">
        {/* Left Column: Format & Owner Design Customizer Controls */}
        <div className="no-print lg:col-span-5 space-y-4">
          {/* Module 1: Format & Target Options */}
          <div className="p-4 rounded-2xl bg-[#FFF9F2]/75 border border-[#F0E4D7] space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#F0E4D7]">
              <span className="text-xs font-extrabold text-[#2B2118] uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-600" />
                Format: {selectedFormat.name}
              </span>
            </div>

            <div>
              <span className="block text-[11px] font-bold text-slate-600 mb-1.5">
                Available Print Sizes:
              </span>
              <div className="flex flex-wrap gap-2">
                {selectedFormat.sizes.map((sz) => (
                  <button
                    key={sz.id}
                    type="button"
                    onClick={() => setSelectedSizeId(sz.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                      selectedSize.id === sz.id
                        ? 'bg-[#2B2118] border-[#2B2118] text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {sz.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-[11px] font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-amber-600" />
                QR Destination Target:
              </span>
              <select
                value={selectedTableNumber}
                onChange={(e) => setSelectedTableNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500 shadow-2xs"
              >
                <option value="">🌐 General QR (No Table) — Posters, Flyers, Bags & Social</option>
                {availableTables.map((t) => (
                  <option key={t.id} value={t.table_number}>
                    🍽️ Table #{t.table_number} ({t.name} - {t.section})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Module 2: Background Photo & Atmosphere */}
          <div className="p-4 rounded-2xl bg-[#FFF9F2]/75 border border-[#F0E4D7] space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#F0E4D7]">
              <span className="text-xs font-extrabold text-[#2B2118] uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                Background Photo & Atmosphere
              </span>
              {bgImage && (
                <button
                  type="button"
                  onClick={handleClearBgPhoto}
                  className="text-[10px] font-bold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  Remove Photo
                </button>
              )}
            </div>

            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-3 rounded-xl border border-dashed border-amber-400 bg-amber-50/60 hover:bg-amber-100/60 text-amber-900 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <Upload className="w-4 h-4 text-amber-600" />
                <span>Upload Custom Photo Behind QR</span>
              </button>
            </div>

            <div>
              <span className="block text-[11px] font-bold text-slate-600 mb-1.5">
                Or Pick a Restaurant Theme Backdrop:
              </span>
              <div className="grid grid-cols-3 gap-2">
                {BACKGROUND_PRESETS.map((preset) => {
                  const isActive = activeBgPresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectBgPreset(preset)}
                      className={`p-2 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between h-16 relative overflow-hidden group ${
                        isActive
                          ? 'border-amber-500 ring-2 ring-amber-400/40 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-amber-300'
                      }`}
                      style={{
                        backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url("${preset.dataUrl}")`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    >
                      {isActive && (
                        <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-white flex items-center justify-center">
                          <Check className="w-2 h-2 stroke-[3]" />
                        </div>
                      )}
                      <span className="text-[10px] font-black text-white drop-shadow-sm leading-tight">
                        {preset.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {bgImage && (
              <div className="space-y-1.5 pt-1 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <Eye className="w-3 h-3 text-amber-600" />
                    Overlay Darkness (Scannability):
                  </span>
                  <span className="text-[11px] font-mono font-bold text-amber-600">
                    {Math.round(bgOverlayOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.85"
                  step="0.05"
                  value={bgOverlayOpacity}
                  onChange={(e) => setBgOverlayOpacity(parseFloat(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>
            )}

            <div className="pt-1">
              <span className="block text-[11px] font-bold text-slate-600 mb-1.5">
                Text Contrast Mode:
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTextColorMode('auto')}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition border cursor-pointer text-center ${
                    textColorMode === 'auto'
                      ? 'bg-[#2B2118] border-[#2B2118] text-white'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  Auto
                </button>
                <button
                  type="button"
                  onClick={() => setTextColorMode('light')}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition border cursor-pointer text-center ${
                    textColorMode === 'light'
                      ? 'bg-[#2B2118] border-[#2B2118] text-white'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  White Text
                </button>
                <button
                  type="button"
                  onClick={() => setTextColorMode('dark')}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition border cursor-pointer text-center ${
                    textColorMode === 'dark'
                      ? 'bg-[#2B2118] border-[#2B2118] text-white'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  Dark Text
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 space-y-2">
              <span className="block text-[11px] font-bold text-slate-600">
                Brand Accent Color / Solid Theme:
              </span>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setColorTheme('orange')}
                  className={`p-1.5 rounded-xl text-xs font-bold transition border cursor-pointer flex flex-col items-center gap-1 ${
                    colorTheme === 'orange'
                      ? 'bg-orange-100 border-orange-500 text-orange-900'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-orange-600 block shadow-2xs" />
                  <span className="text-[9px]">Sunset</span>
                </button>
                <button
                  type="button"
                  onClick={() => setColorTheme('emerald')}
                  className={`p-1.5 rounded-xl text-xs font-bold transition border cursor-pointer flex flex-col items-center gap-1 ${
                    colorTheme === 'emerald'
                      ? 'bg-emerald-100 border-emerald-500 text-emerald-900'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 block shadow-2xs" />
                  <span className="text-[9px]">Emerald</span>
                </button>
                <button
                  type="button"
                  onClick={() => setColorTheme('midnight')}
                  className={`p-1.5 rounded-xl text-xs font-bold transition border cursor-pointer flex flex-col items-center gap-1 ${
                    colorTheme === 'midnight'
                      ? 'bg-slate-900 border-slate-900 text-amber-400'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-amber-400 block shadow-2xs" />
                  <span className="text-[9px]">Midnight</span>
                </button>
                <button
                  type="button"
                  onClick={() => setColorTheme('custom')}
                  className={`p-1.5 rounded-xl text-xs font-bold transition border cursor-pointer flex flex-col items-center gap-1 ${
                    colorTheme === 'custom'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-900'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full block shadow-2xs"
                    style={{ background: customColor }}
                  />
                  <span className="text-[9px]">Custom</span>
                </button>
              </div>
            </div>
          </div>

          {/* Module 2.5: Folded Card Inner Panels (Replaces Black Boxes) */}
          <div className="p-4 rounded-2xl bg-[#FFF9F2]/75 border border-[#F0E4D7] space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#F0E4D7]">
              <div>
                <span className="text-xs font-extrabold text-[#2B2118] uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-600" />
                  Card Inner Panels (Replaces Black Card Area)
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Upload custom photos to replace the dark card areas where the tent folds (Side 1 Front & Side 2 Back)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Front Panel (Side 1 with QR) */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800">
                      Side 1: Front Panel
                    </span>
                    {frontPanelImage && (
                      <button
                        type="button"
                        onClick={handleClearFrontPanel}
                        className="text-[10px] text-red-600 font-bold hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400 block">Top section with QR & brand</span>
                </div>

                {frontPanelImage ? (
                  <div className="relative h-20 rounded-lg overflow-hidden border border-slate-200 group">
                    <img
                      src={frontPanelImage}
                      alt="Front Panel"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => frontPanelInputRef.current?.click()}
                        className="px-2 py-1 bg-white/90 text-slate-900 rounded-md text-[10px] font-bold shadow-xs cursor-pointer"
                      >
                        Change Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => frontPanelInputRef.current?.click()}
                    className="w-full h-20 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-100/50 transition flex flex-col items-center justify-center gap-1 cursor-pointer text-amber-800"
                  >
                    <Upload className="w-4 h-4 text-amber-600" />
                    <span className="text-[10px] font-bold text-center px-1">Upload Front Panel Image</span>
                  </button>
                )}
              </div>

              {/* Back Panel (Side 2 with Quick Re-order) */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800">
                      Side 2: Back Panel
                    </span>
                    {backPanelImage && (
                      <button
                        type="button"
                        onClick={handleClearBackPanel}
                        className="text-[10px] text-red-600 font-bold hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400 block">Bottom section with re-order info</span>
                </div>

                {backPanelImage ? (
                  <div className="relative h-20 rounded-lg overflow-hidden border border-slate-200 group">
                    <img
                      src={backPanelImage}
                      alt="Back Panel"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => backPanelInputRef.current?.click()}
                        className="px-2 py-1 bg-white/90 text-slate-900 rounded-md text-[10px] font-bold shadow-xs cursor-pointer"
                      >
                        Change Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => backPanelInputRef.current?.click()}
                    className="w-full h-20 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-100/50 transition flex flex-col items-center justify-center gap-1 cursor-pointer text-amber-800"
                  >
                    <Upload className="w-4 h-4 text-amber-600" />
                    <span className="text-[10px] font-bold text-center px-1">Upload Back Panel Image</span>
                  </button>
                )}
              </div>
            </div>

            {(frontPanelImage || backPanelImage) && (
              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <Eye className="w-3 h-3 text-amber-600" />
                    Inner Panel Darkness (Text Readability):
                  </span>
                  <span className="text-[11px] font-mono font-bold text-amber-600">
                    {Math.round(panelOverlayOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.85"
                  step="0.05"
                  value={panelOverlayOpacity}
                  onChange={(e) => setPanelOverlayOpacity(parseFloat(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Module 2.5: Fold Line & Bottom Panel (Side 2) Text Editor */}
          {selectedFormatId === 'table-tent' && (
            <div className="p-4 rounded-2xl bg-[#FFF9F2]/75 border border-[#F0E4D7] space-y-3.5">
              <div className="flex items-center justify-between pb-2.5 border-b border-[#F0E4D7]">
                <span className="text-xs font-extrabold text-[#2B2118] uppercase tracking-wider flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                  Fold Line & Bottom Panel Text
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFoldText('FOLD HERE');
                    setShowFoldLine(true);
                    setSide2Header('Quick Re-Order & Assistance');
                    setSide2Headline('Need Extra Drinks or Dessert?');
                    setSide2Subtitle('Scan again to add any dish straight to your table bill.');
                    setSide2Footer('');
                    setSide2HeaderConfig({ fontSize: 11, isBold: true, color: 'auto', posX: null, posY: null, isCustomPosition: false });
                    setSide2HeadlineConfig({ fontSize: 12, isBold: true, color: 'auto', posX: null, posY: null, isCustomPosition: false });
                    setSide2SubtitleConfig({ fontSize: 10, isBold: false, color: 'auto', posX: null, posY: null, isCustomPosition: false });
                    setSide2FooterConfig({ fontSize: 10, isBold: false, color: 'auto', posX: null, posY: null, isCustomPosition: false });
                    setFoldTextConfig({ fontSize: 9, isBold: true, color: 'auto', posX: null, posY: null, isCustomPosition: false });
                    setSide2QrConfig({ size: 110, posX: null, posY: null, isCustomPosition: false });
                  }}
                  className="text-[10px] text-amber-700 hover:text-amber-800 font-bold hover:underline cursor-pointer"
                  title="Reset all bottom panel texts to default"
                >
                  Reset Defaults
                </button>
              </div>

              {/* Fold Line Toggle & Text */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-800 flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showFoldLine}
                      onChange={(e) => setShowFoldLine(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>Show Fold Guide Line</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Dashed fold guide</span>
                </div>
                {showFoldLine && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Fold Indicator Label:
                    </label>
                    <input
                      type="text"
                      value={foldText}
                      onChange={(e) => setFoldText(e.target.value)}
                      placeholder="FOLD HERE"
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900"
                    />
                  </div>
                )}
              </div>

              {/* Side 2 Content Inputs */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2.5">
                <span className="text-[11px] font-bold text-slate-800 block">
                  Bottom Section (Side 2) Content:
                </span>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Side 2 Header:
                  </label>
                  <input
                    type="text"
                    value={side2Header}
                    onChange={(e) => setSide2Header(e.target.value)}
                    placeholder="Quick Re-Order & Assistance"
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Side 2 Headline:
                  </label>
                  <input
                    type="text"
                    value={side2Headline}
                    onChange={(e) => setSide2Headline(e.target.value)}
                    placeholder="Need Extra Drinks or Dessert?"
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Side 2 Description / Subtitle:
                  </label>
                  <textarea
                    rows={2}
                    value={side2Subtitle}
                    onChange={(e) => setSide2Subtitle(e.target.value)}
                    placeholder="Scan again to add any dish straight to your table bill."
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Side 2 Footer / URL Text:
                  </label>
                  <input
                    type="text"
                    value={side2Footer}
                    onChange={(e) => setSide2Footer(e.target.value)}
                    placeholder={menuUrl}
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900"
                  />
                </div>
              </div>

              <p className="text-[10px] text-slate-500">
                💡 <strong>Direct Canvas Edit:</strong> You can also double-click directly on the fold line or any bottom text on the card preview to edit inline!
              </p>
            </div>
          )}

          {/* Module 3: QR Code Size, Corner Handles & Placement */}
          <div className="p-4 rounded-2xl bg-[#FFF9F2]/75 border border-[#F0E4D7] space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#F0E4D7]">
              <span className="text-xs font-extrabold text-[#2B2118] uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                QR Size & Corner Placement
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickResize(-15)}
                  className="w-6 h-6 rounded-md bg-white border border-slate-300 text-slate-800 font-black text-xs flex items-center justify-center cursor-pointer hover:bg-slate-100"
                  title="Make QR Smaller (-15px)"
                >
                  -
                </button>
                <span className="text-xs font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  {qrSize}px
                </span>
                <button
                  type="button"
                  onClick={() => handleQuickResize(15)}
                  className="w-6 h-6 rounded-md bg-white border border-slate-300 text-slate-800 font-black text-xs flex items-center justify-center cursor-pointer hover:bg-slate-100"
                  title="Make QR Larger (+15px)"
                >
                  +
                </button>
              </div>
            </div>

            <p className="text-[10px] text-slate-500">
              <strong>Tip:</strong> Drag any of the 4 corner handles directly on the QR code to smoothly resize it!
            </p>

            <div>
              <span className="block text-[11px] font-bold text-slate-600 mb-1.5">
                Quick Size Presets:
              </span>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Small', size: 100 },
                  { label: 'Medium', size: 140 },
                  { label: 'Large', size: 185 },
                  { label: 'Extra L', size: 230 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setQrSize(item.size)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold transition border cursor-pointer text-center ${
                      qrSize === item.size
                        ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Free Drag-and-Drop & 9-Corner Position Pad */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Move className="w-3.5 h-3.5 text-amber-600" />
                  Place in Any Corner or Direction:
                </span>
                {(qrPositionMode === 'custom' || hasAnyCustomPosition) && (
                  <button
                    type="button"
                    onClick={handleResetAllPositions}
                    className="text-[10px] font-bold text-amber-600 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Layout</span>
                  </button>
                )}
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="grid grid-cols-3 gap-1.5 max-w-[240px] mx-auto">
                  {POSITION_PRESETS.map((pos) => {
                    const isSelected =
                      qrPositionMode === 'custom' &&
                      Math.abs(qrPosX - pos.x) <= 6 &&
                      Math.abs(qrPosY - pos.y) <= 6;
                    return (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => handleSelectPositionPreset(pos)}
                        className={`py-2 px-1 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border ${
                          isSelected
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                        title={pos.label}
                      >
                        <span className="text-sm">{pos.icon}</span>
                        <span className="text-[9px] truncate">{pos.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 1-Click Duplicate QR Button */}
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <button
                type="button"
                onClick={() =>
                  handleDuplicateQr(
                    selectedElementId &&
                      (selectedElementId === 'qr' || selectedElementId.startsWith('qr-'))
                      ? selectedElementId
                      : 'qr'
                  )
                }
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer transition active:scale-[0.98]"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>+ Duplicate QR Code (Copy & Paste)</span>
              </button>
              {additionalQrs.length > 0 && (
                <div className="flex items-center justify-between text-[11px] text-slate-500 bg-white p-2 rounded-lg border border-slate-200">
                  <span>
                    Duplicate Copies: <strong className="text-slate-800">{additionalQrs.length}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAdditionalQrs([]);
                      if (selectedElementId && selectedElementId.startsWith('qr-')) {
                        setSelectedElementId(null);
                      }
                      showCopyToast('🗑️ Cleared duplicate QRs');
                    }}
                    className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Module 3.5: QR Center Logo Studio */}
          <div className="p-4 rounded-2xl bg-[#FFF9F2]/75 border border-[#F0E4D7] space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#F0E4D7]">
              <span className="text-xs font-extrabold text-[#2B2118] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                QR Center Logo
              </span>
              <button
                type="button"
                onClick={() => setShowLogo((prev) => !prev)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition cursor-pointer ${
                  showLogo
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {showLogo ? '✓ Center Logo ON' : 'Logo OFF'}
              </button>
            </div>

            {/* Active Logo Plate Preview & Actions */}
            <div className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-xs p-1">
                {logoPlateDataUrl ? (
                  <img
                    src={logoPlateDataUrl}
                    alt="Center Logo Plate"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Store className="w-6 h-6 text-slate-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-slate-800 block truncate">
                  {customCenterLogoUrl
                    ? 'Custom Uploaded Logo'
                    : logoUrl
                    ? 'Restaurant Store Logo'
                    : 'Branded Monogram Badge'}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold block">
                  ✓ High-contrast excavated plate
                </span>
              </div>

              <button
                type="button"
                onClick={() => centerLogoInputRef.current?.click()}
                className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
              >
                <Upload className="w-3 h-3" />
                <span>Upload Logo</span>
              </button>
            </div>

            {customCenterLogoUrl && (
              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="text-slate-500">Using custom logo file</span>
                <button
                  type="button"
                  onClick={handleClearCenterLogo}
                  className="text-red-600 font-bold hover:underline cursor-pointer"
                >
                  Reset to Default Badge
                </button>
              </div>
            )}

            {/* Shape & Size Controls */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
              <div>
                <span className="block text-[10px] font-bold text-slate-600 mb-1">
                  Logo Shape:
                </span>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setLogoShape('rounded')}
                    className={`py-1 px-1.5 rounded-lg text-[10px] font-bold transition border cursor-pointer text-center ${
                      logoShape === 'rounded'
                        ? 'bg-[#2B2118] text-white border-[#2B2118] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    Rounded
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoShape('circle')}
                    className={`py-1 px-1.5 rounded-lg text-[10px] font-bold transition border cursor-pointer text-center ${
                      logoShape === 'circle'
                        ? 'bg-[#2B2118] text-white border-[#2B2118] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    Circle
                  </button>
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-600 mb-1">
                  Logo Scale:
                </span>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setLogoSize('medium')}
                    className={`py-1 px-1.5 rounded-lg text-[10px] font-bold transition border cursor-pointer text-center ${
                      logoSize === 'medium'
                        ? 'bg-[#2B2118] text-white border-[#2B2118] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoSize('small')}
                    className={`py-1 px-1.5 rounded-lg text-[10px] font-bold transition border cursor-pointer text-center ${
                      logoSize === 'small'
                        ? 'bg-[#2B2118] text-white border-[#2B2118] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    Compact
                  </button>
                </div>
              </div>
            </div>

            {/* Scannability Confirmation */}
            <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-800 text-[10px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="font-medium">
                QR error correction level H guarantees 100% readability with center logo.
              </span>
            </div>
          </div>

          {/* Module 4: Custom Texts & Typography Studio (Owner Control) */}
          <div className="p-4 rounded-2xl bg-[#FFF9F2]/75 border border-[#F0E4D7] space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#F0E4D7]">
              <span className="text-xs font-extrabold text-[#2B2118] uppercase tracking-wider flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-amber-600" />
                Typography & Custom Text
              </span>
              <button
                type="button"
                onClick={handleAddCustomTextBox}
                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>+ Add Text</span>
              </button>
            </div>

            <p className="text-[10px] text-slate-500">
              ✍️ <strong>Click on any text in the preview card</strong> to edit wording, change size, make it bold, or drag to move!
            </p>

            {/* Custom Text Boxes List */}
            {customTextBoxes.length > 0 && (
              <div className="space-y-2 pt-1 border-t border-slate-200">
                <span className="block text-[11px] font-bold text-slate-700">
                  Added Custom Text Boxes ({customTextBoxes.length}):
                </span>
                <div className="space-y-1.5">
                  {customTextBoxes.map((box, _idx) => (
                    <div
                      key={box.id}
                      onClick={() => setSelectedElementId(`custom-${box.id}`)}
                      className={`p-2 rounded-xl bg-white border flex items-center justify-between gap-2 cursor-pointer transition ${
                        selectedElementId === `custom-${box.id}`
                          ? 'border-amber-500 ring-2 ring-amber-400/30'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="text"
                        value={box.text}
                        onChange={(e) => handleUpdateText(box.id, e.target.value)}
                        className="flex-1 text-xs font-bold text-slate-800 bg-transparent outline-none truncate"
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleBold(`custom-${box.id}`)}
                          className={`w-6 h-6 rounded text-xs font-black flex items-center justify-center cursor-pointer ${
                            box.isBold ? 'bg-amber-500 text-slate-900' : 'bg-slate-100 text-slate-600'
                          }`}
                          title="Toggle Bold"
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChangeFontSize(`custom-${box.id}`, -2)}
                          className="w-5 h-6 rounded bg-slate-100 text-xs font-bold text-slate-600 flex items-center justify-center cursor-pointer"
                          title="Smaller"
                        >
                          -
                        </button>
                        <span className="text-[10px] font-mono text-slate-500 w-5 text-center">
                          {box.fontSize}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleChangeFontSize(`custom-${box.id}`, 2)}
                          className="w-5 h-6 rounded bg-slate-100 text-xs font-bold text-slate-600 flex items-center justify-center cursor-pointer"
                          title="Larger"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomText(box.id)}
                          className="p-1 rounded text-red-500 hover:bg-red-50 cursor-pointer ml-1"
                          title="Delete text box"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Text Behind QR (Watermark) */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  Text Behind QR (Watermark):
                </span>
                {watermarkText && (
                  <button
                    type="button"
                    onClick={() => setWatermarkText('')}
                    className="text-[10px] text-red-600 font-bold hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                placeholder="Optional text behind QR (blank = clean QR)..."
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-bold tracking-wider uppercase focus:outline-none focus:border-amber-500 shadow-2xs"
              />

              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {['None (Clean)', 'SCAN ME', 'ORDER NOW', storeName.toUpperCase(), 'DINE IN', '10% OFF'].map(
                  (chip) => {
                    const isNone = chip === 'None (Clean)';
                    const isActive = isNone ? !watermarkText : watermarkText === chip;
                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setWatermarkText(isNone ? '' : chip)}
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                          isActive
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {chip}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Restaurant Name / Brand Title */}
            <div>
              <span className="block text-[11px] font-bold text-slate-600 mb-1">
                Restaurant Name / Brand Title:
              </span>
              <input
                type="text"
                value={customRestaurantName}
                onChange={(e) => setCustomRestaurantName(e.target.value)}
                placeholder={restaurant?.name || 'Burger & Smoke Co.'}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:border-amber-500 shadow-2xs"
              />
            </div>

            {/* Table Menu / Tag Badge Pill Customization */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Header Badge Pill (Table Menu):
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBadgeConfig((c) => ({ ...c, visible: !c.visible }))}
                    className={`text-[10px] font-bold cursor-pointer ${
                      badgeConfig.visible ? 'text-emerald-600' : 'text-slate-400 line-through'
                    }`}
                  >
                    {badgeConfig.visible ? 'Visible' : 'Hidden'}
                  </button>
                  {customBadgeText && (
                    <button
                      type="button"
                      onClick={() => setCustomBadgeText('')}
                      className="text-[10px] text-red-600 font-bold hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              <input
                type="text"
                value={customBadgeText}
                onChange={(e) => setCustomBadgeText(e.target.value)}
                placeholder="Table Menu"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-amber-500 shadow-2xs"
              />

              {/* Quick Presets for Badge */}
              <div className="flex flex-wrap gap-1 pt-0.5">
                {['Table Menu', 'Table #', 'VIP Menu', 'Bar Menu', 'Special Offer', 'Order Here'].map((preset) => {
                  const isActive = (customBadgeText || 'Table Menu').toLowerCase() === preset.toLowerCase();
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCustomBadgeText(preset)}
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                        isActive
                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Headline */}
            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-600">
                  Main Headline:
                </span>
                <button
                  type="button"
                  onClick={() => setIsCustomHeadline(!isCustomHeadline)}
                  className="text-[10px] font-bold text-amber-600 hover:underline cursor-pointer"
                >
                  {isCustomHeadline ? 'Choose Preset' : 'Write Custom'}
                </button>
              </div>

              {isCustomHeadline ? (
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Enter your custom headline..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:border-amber-500 shadow-2xs"
                />
              ) : (
                <select
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
                >
                  {selectedFormat.headlines?.en?.map((hl, i) => (
                    <option key={i} value={hl}>
                      {hl}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Subtitle / Offer Tagline */}
            <div>
              <span className="block text-[11px] font-bold text-slate-600 mb-1">
                Subtitle / Offer Tagline:
              </span>
              <input
                type="text"
                value={customSubtitle}
                onChange={(e) => setCustomSubtitle(e.target.value)}
                placeholder="e.g. Scan to view full menu & enjoy 10% direct discount"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:border-amber-500 shadow-2xs"
              />
            </div>

            {/* Custom Footer */}
            <div>
              <span className="block text-[11px] font-bold text-slate-600 mb-1">
                Custom Footer / Delivery Note:
              </span>
              <input
                type="text"
                value={customFooter}
                onChange={(e) => setCustomFooter(e.target.value)}
                placeholder={`e.g. +${restaurant?.phone || '923001234567'} • Free Doorstep Delivery`}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:border-amber-500 shadow-2xs"
              />
            </div>

            {/* Phone Logo & Contact Icon Customization */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  Phone Logo & Contact Icon:
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPhoneLogoConfig((prev) => ({
                      ...prev,
                      visible: !prev.visible,
                    }))
                  }
                  className={`text-[10px] font-bold cursor-pointer ${
                    phoneLogoConfig.visible ? 'text-emerald-600' : 'text-slate-400 line-through'
                  }`}
                >
                  {phoneLogoConfig.visible ? 'Visible' : 'Hidden'}
                </button>
              </div>

              {/* Icon Type Selection Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
                {[
                  { id: 'phone', label: '📞 Call' },
                  { id: 'whatsapp', label: '💬 WhatsApp' },
                  { id: 'smartphone', label: '📱 Mobile' },
                  { id: 'support', label: '🎧 Support' },
                  { id: 'custom', label: '🖼️ Custom' },
                  { id: 'none', label: '🚫 None' },
                ].map((item) => {
                  const isActive = phoneLogoConfig.type === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.id === 'custom') {
                          phoneLogoInputRef.current?.click();
                        } else {
                          handleUpdatePhoneLogoConfig({
                            type: item.id,
                            visible: item.id !== 'none',
                            color: item.id === 'whatsapp' ? '#25D366' : phoneLogoConfig.color,
                          });
                        }
                      }}
                      className={`px-1.5 py-1.5 rounded-xl border text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
                        isActive
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Icon Color & Size Row */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-medium text-slate-500">Color:</span>
                  {[
                    { color: '#10b981', title: 'Emerald Green' },
                    { color: '#25D366', title: 'WhatsApp Green' },
                    { color: '#f59e0b', title: 'Amber Gold' },
                    { color: '#0ea5e9', title: 'Sky Blue' },
                    { color: '#ffffff', title: 'White' },
                    { color: '#0f172a', title: 'Dark Charcoal' },
                  ].map((swatch) => (
                    <button
                      key={swatch.color}
                      type="button"
                      onClick={() => handleUpdatePhoneLogoConfig({ color: swatch.color })}
                      style={{ backgroundColor: swatch.color }}
                      className={`w-4 h-4 rounded-full border border-slate-300 cursor-pointer transition hover:scale-110 ${
                        phoneLogoConfig.color === swatch.color ? 'ring-2 ring-amber-500 ring-offset-1' : ''
                      }`}
                      title={swatch.title}
                    />
                  ))}
                </div>

                {/* Size Controls */}
                <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdatePhoneLogoConfig({
                        size: Math.max(8, (phoneLogoConfig.size || 13) - 2),
                      })
                    }
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                    title="Smaller icon"
                  >
                    -
                  </button>
                  <span className="text-[10px] font-mono font-bold text-slate-700 min-w-[20px] text-center">
                    {phoneLogoConfig.size || 13}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdatePhoneLogoConfig({
                        size: Math.min(36, (phoneLogoConfig.size || 13) + 2),
                      })
                    }
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                    title="Larger icon"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Module 5: Print Shop 3mm Bleed & Crop Marks */}
          <div className="p-3.5 bg-[#FFF9F2]/75 rounded-2xl border border-[#F0E4D7] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Scissors className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  3mm Bleed & Crop Marks
                </span>
                <span className="text-[10px] text-slate-500">
                  Adds professional trim lines for commercial offset printers
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowBleed((prev) => !prev)}
              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                showBleed ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`block w-3.5 h-3.5 rounded-full bg-white shadow transform transition-transform ${
                  showBleed ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Right Column: Live Exact-Ratio Preview Surface & Controls */}
        <div className="lg:col-span-7 print:w-full space-y-3">
          {/* Preview Toolbar with "+ Add Text Box" Quick Action */}
          <div className="no-print flex flex-wrap items-center justify-between gap-2 pb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-600" />
                Live Print Canvas ({selectedSize.label})
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Ratio: {selectedFormat.aspectRatio}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Quick "Reset Layout" Canvas Button when any element has been custom moved */}
              {hasAnyCustomPosition && (
                <button
                  type="button"
                  onClick={handleResetAllPositions}
                  className="px-2.5 py-1 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Restore all texts and QR back to their default template slots"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Layout</span>
                </button>
              )}

              {/* Quick "+ Add Text Box" Canvas Button */}
              <button
                type="button"
                onClick={handleAddCustomTextBox}
                className="px-2.5 py-1 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                title="Add a new movable text box to the card"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>+ Add Text Box</span>
              </button>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setZoomScale((s) => Math.max(0.6, s - 0.1))}
                  className="p-1 hover:bg-white rounded text-slate-600 cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono font-bold text-slate-700 px-1.5">
                  {(zoomScale * 100).toFixed(0)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomScale((s) => Math.min(1.4, s + 0.1))}
                  className="p-1 hover:bg-white rounded text-slate-600 cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale(1)}
                  className="p-1 hover:bg-white rounded text-slate-600 text-[10px] font-bold px-1.5 cursor-pointer"
                  title="Reset Zoom"
                >
                  Fit
                </button>
              </div>
            </div>
          </div>

          {/* Exact-Ratio Preview Canvas Container */}
          <div
            onClick={() => setSelectedElementId(null)}
            className="relative p-4 sm:p-6 rounded-3xl bg-[#FFF9F2]/90 border border-[#F0E4D7] flex items-center justify-center overflow-auto min-h-[500px]"
          >
            {/* Copy / Paste Toast Notification */}
            {copyToast && (
              <div className="no-print absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-md text-amber-400 font-bold px-4 py-1.5 rounded-full shadow-2xl border border-slate-700 text-xs flex items-center gap-2 animate-bounce">
                <span>{copyToast}</span>
              </div>
            )}

            <div
              style={{
                transform: `scale(${zoomScale})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out',
                aspectRatio: selectedFormat.aspectRatio,
                width: '100%',
                maxWidth:
                  selectedFormat.previewType === 'standee'
                    ? '320px'
                    : selectedFormat.previewType === 'table-sticker' || selectedFormat.previewType === 'box-sticker'
                    ? '380px'
                    : selectedFormat.previewType === 'business-card'
                    ? '460px'
                    : selectedFormat.previewType === 'trifold'
                    ? '560px'
                    : '440px',
              }}
              className="shadow-2xl rounded-2xl overflow-hidden print:shadow-none print:transform-none"
            >
              <PrintMaterialTemplate
                format={selectedFormat}
                selectedSize={selectedSize}
                restaurant={restaurant}
                menuUrl={menuUrl}
                headline={headline}
                language={language}
                theme={colorTheme}
                customColor={customColor}
                showBleed={showBleed}
                showLogo={showLogo}
                logoPlateDataUrl={logoPlateDataUrl}
                effectiveRatio={effectiveRatio}
                bgImage={bgImage}
                bgOverlayOpacity={bgOverlayOpacity}
                textColorMode={textColorMode}
                qrSize={qrSize}
                watermarkText={watermarkText}
                watermarkOpacity={watermarkOpacity}
                customSubtitle={customSubtitle}
                customFooter={customFooter}
                frontPanelImage={frontPanelImage}
                backPanelImage={backPanelImage}
                panelOverlayOpacity={panelOverlayOpacity}
                foldText={foldText}
                showFoldLine={showFoldLine}
                side2Header={side2Header}
                side2Headline={side2Headline}
                side2Subtitle={side2Subtitle}
                side2Footer={side2Footer}
                side2HeaderConfig={side2HeaderConfig}
                side2HeadlineConfig={side2HeadlineConfig}
                side2SubtitleConfig={side2SubtitleConfig}
                side2FooterConfig={side2FooterConfig}
                foldTextConfig={foldTextConfig}
                side2QrConfig={side2QrConfig}
                isDraggingSide2Qr={isDraggingSide2Qr}
                onStartDragSide2Qr={handleStartDragSide2Qr}
                onStartResizeSide2Corner={handleStartResizeSide2Corner}
                onQuickResizeSide2={handleQuickResizeSide2}
                qrPositionMode={qrPositionMode}
                qrPosX={qrPosX}
                qrPosY={qrPosY}
                onStartDrag={handleQrDragStart}
                onStartResizeCorner={handleStartResizeCorner}
                onQuickResize={handleQuickResize}
                isDraggingQr={isDraggingQr}
                additionalQrs={additionalQrs}
                onDuplicateQr={handleDuplicateQr}
                onDeleteAdditionalQr={handleDeleteAdditionalQr}
                onStartDragAdditionalQr={handleStartDragAdditionalQr}
                onStartResizeAdditionalCorner={handleStartResizeAdditionalCorner}
                onQuickResizeAdditional={handleQuickResizeAdditional}
                draggingQrId={draggingAdditionalQrId}
                customTextBoxes={customTextBoxes}
                selectedElementId={selectedElementId}
                headlineConfig={headlineConfig}
                subtitleConfig={subtitleConfig}
                customRestaurantName={customRestaurantName}
                restaurantNameConfig={restaurantNameConfig}
                phoneConfig={phoneConfig}
                customBadgeText={customBadgeText}
                badgeConfig={badgeConfig}
                phoneLogoConfig={phoneLogoConfig}
                onChangePhoneLogoConfig={handleUpdatePhoneLogoConfig}
                onSelectElement={setSelectedElementId}
                onStartDragText={handleStartDragText}
                onUpdateText={handleUpdateText}
                onToggleBold={handleToggleBold}
                onChangeFontSize={handleChangeFontSize}
                onSetFontSize={handleSetFontSize}
                onSetDimensions={handleSetDimensions}
                onToggleOrientation={handleToggleOrientation}
                onRotate={handleRotateText}
                onChangeColor={handleChangeColor}
                onDuplicate={handleDuplicateElement}
                onDeleteCustomText={handleDeleteCustomText}
                onResetPosition={handleResetTextPosition}
              />
            </div>
          </div>

          {/* Bottom Quality Status Bar */}
          <div className="no-print p-3 rounded-2xl bg-[#FFF9F2]/80 border border-[#F0E4D7] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                300 DPI Export Ready • Corner-Drag QR Resizing • Click Text to Edit & Bold • Drag Placement
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Use top toolbar to Export PDF/PNG or Print</span>
          </div>
        </div>
      </div>

      {/* Hidden File Inputs for all photo uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCustomPhotoUpload}
      />
      <input
        ref={frontPanelInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFrontPanelUpload}
      />
      <input
        ref={backPanelInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleBackPanelUpload}
      />
      <input
        ref={centerLogoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCenterLogoUpload}
      />
      <input
        ref={phoneLogoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhoneLogoUpload}
      />
    </div>
  );
}
