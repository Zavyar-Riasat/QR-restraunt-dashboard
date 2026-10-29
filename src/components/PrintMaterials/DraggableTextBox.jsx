import React, { useRef, useEffect, useState } from 'react';
import { Move, Trash2, RotateCcw, Edit3, Check, Copy, RotateCw } from 'lucide-react';

/**
 * Movable, editable, customizable text box component
 * - Single click / drag: Move the text anywhere across the card
 * - Double click: Enter text editing mode directly in the text box
 * - Floating toolbar: Bold toggle, font resizing, custom colors, duplicate, delete, reset position
 */
export default function DraggableTextBox({
  id,
  text,
  fontSize = 14,
  isBold = false,
  color = 'auto',
  posX = 50,
  posY = 50,
  width = null,
  height = null,
  isVertical = false,
  rotation = 0,
  isSelected = false,
  isDeletable = true,
  isInline = false,
  defaultColor = '#0f172a',
  textAlign = 'center',
  maxWidth = null,
  onSelect,
  onStartDrag,
  onUpdateText,
  onToggleBold,
  onChangeFontSize,
  onSetFontSize = null,
  onSetDimensions = null,
  onToggleOrientation = null,
  onRotate = null,
  onChangeColor,
  onDuplicate,
  onDelete,
  onResetPosition,
  customStyle = null,
}) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);

  // Sync contentEditable innerText with prop text if prop changes externally (when not actively editing)
  useEffect(() => {
    if (!isEditing && textRef.current && textRef.current.innerText !== text) {
      textRef.current.innerText = text;
    }
  }, [text, isEditing]);

  // If deselected, exit editing mode
  useEffect(() => {
    if (!isSelected) {
      setIsEditing(false);
    }
  }, [isSelected]);

  // When editing mode starts, focus the element and move caret to end
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
      } catch  {
        // Fallback focus
      }
    }
  }, [isEditing]);

  const effectiveColor = color === 'auto' ? defaultColor : color;

  // Single click & drag to move
  const handleMouseDown = (e) => {
    if (isEditing) {
      // While editing, allow normal text highlighting / caret positioning
      e.stopPropagation();
      return;
    }
    // Single click / drag moves the text
    if (onSelect) { onSelect(id);; }
    if (onStartDrag) { onStartDrag(e, id);; }
  };

  const handleTouchStart = (e) => {
    if (isEditing) return;
    if (onSelect) { onSelect(id);; }
    if (onStartDrag) { onStartDrag(e, id);; }
  };

  // Double click to enter text box
  const handleDoubleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (onSelect) { onSelect(id);; }
    setIsEditing(true);
  };

  // Blur saves and exits editing mode
  const handleBlur = (e) => {
    setIsEditing(false);
    if (onUpdateText) { onUpdateText(id, e.currentTarget.innerText);; }
  };

  // Escape exits editing mode
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
      if (textRef.current) { textRef.current.blur();; }
    }
  };

  return (
    <div
      ref={containerRef}
      style={
        isInline
          ? {
              position: 'relative',
              display: 'inline-block',
              zIndex: isSelected ? 40 : 20,
              width: width ? `${width}px` : undefined,
              height: height ? `${height}px` : undefined,
              transform: rotation ? `rotate(${rotation}deg)` : undefined,
              ...(customStyle || {}),
            }
          : {
              position: 'absolute',
              left: `${posX}%`,
              top: `${posY}%`,
              transform: rotation ? `translate(-50%, -50%) rotate(${rotation}deg)` : 'translate(-50%, -50%)',
              zIndex: isSelected ? 40 : 25,
              width: width ? `${width}px` : undefined,
              height: height ? `${height}px` : undefined,
              ...(customStyle || {}),
            }
      }
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onDoubleClick={handleDoubleClick}
      onClick={(e) => {
        e.stopPropagation();
        if (onSelect) { onSelect(id);; }
      }}
      className={`group select-none max-w-[95%] transition-shadow ${
        isEditing
          ? 'cursor-text ring-2 ring-amber-500 rounded-lg p-1 bg-white/20'
          : isSelected
          ? 'ring-2 ring-amber-500 rounded-lg p-1 bg-black/10 cursor-grab active:cursor-grabbing'
          : 'hover:ring-1 hover:ring-amber-400/60 rounded-lg p-1 cursor-grab active:cursor-grabbing'
      }`}
      title={
        isEditing
          ? 'Typing... Press Escape or click outside to finish'
          : 'Click & drag to move • Double-click to edit text'
      }
    >
      {/* Floating Formatting Toolbar (Visible when selected in preview, hidden in print/export) */}
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
                if (textRef.current) { textRef.current.blur();; }
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

          {/* Drag Handle button */}
          <button
            type="button"
            onMouseDown={(e) => onStartDrag && onStartDrag(e, id)}
            onTouchStart={(e) => onStartDrag && onStartDrag(e, id)}
            className="p-1 rounded hover:bg-slate-800 text-amber-400 cursor-move flex items-center gap-1"
            title="Click & drag to move text anywhere"
          >
            <Move className="w-3.5 h-3.5" />
            <span className="text-[9px] font-bold">Move</span>
          </button>

          <div className="w-px h-3.5 bg-slate-700" />

          {/* Bold Toggle */}
          <button
            type="button"
            onClick={() => onToggleBold && onToggleBold(id)}
            className={`px-2 py-0.5 rounded text-xs font-black cursor-pointer transition ${
              isBold
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-200 hover:bg-slate-800'
            }`}
            title="Toggle Bold"
          >
            B
          </button>

          {/* Decrease Font Size */}
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

          {/* Increase Font Size */}
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

          {/* Color Presets */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onChangeColor && onChangeColor(id, '#ffffff')}
              className="w-3.5 h-3.5 rounded-full bg-white border border-slate-400 cursor-pointer hover:scale-110 transition-transform"
              title="White"
            />
            <button
              type="button"
              onClick={() => onChangeColor && onChangeColor(id, '#0f172a')}
              className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-700 cursor-pointer hover:scale-110 transition-transform"
              title="Dark Charcoal"
            />
            <button
              type="button"
              onClick={() => onChangeColor && onChangeColor(id, '#ea580c')}
              className="w-3.5 h-3.5 rounded-full bg-orange-600 cursor-pointer hover:scale-110 transition-transform"
              title="Orange"
            />
            <button
              type="button"
              onClick={() => onChangeColor && onChangeColor(id, '#059669')}
              className="w-3.5 h-3.5 rounded-full bg-emerald-600 cursor-pointer hover:scale-110 transition-transform"
              title="Emerald"
            />
            <button
              type="button"
              onClick={() => onChangeColor && onChangeColor(id, '#f59e0b')}
              className="w-3.5 h-3.5 rounded-full bg-amber-500 cursor-pointer hover:scale-110 transition-transform"
              title="Amber Gold"
            />
          </div>

          {/* Duplicate Button (1-Click or Ctrl+C / Ctrl+V) */}
          {onDuplicate && (
            <>
              <div className="w-px h-3.5 bg-slate-700" />
              <button
                type="button"
                onClick={() => onDuplicate(id)}
                className="px-1.5 py-0.5 rounded text-xs text-slate-200 hover:text-amber-400 hover:bg-slate-800 cursor-pointer flex items-center gap-1 transition"
                title="Duplicate (Ctrl+C / Ctrl+V)"
              >
                <Copy className="w-3 h-3 text-amber-400" />
                <span className="text-[9px] font-bold">Copy</span>
              </button>
            </>
          )}

          {/* Delete Button (for custom added text boxes) */}
          {isDeletable && (
            <>
              <div className="w-px h-3.5 bg-slate-700" />
              <button
                type="button"
                onClick={() => onDelete && onDelete(id)}
                className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-slate-800 cursor-pointer"
                title="Delete text box"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {/* Reset Position (for standard headline or subtitle) */}
          {onResetPosition && (
            <>
              <div className="w-px h-3.5 bg-slate-700" />
              <button
                type="button"
                onClick={() => onResetPosition(id)}
                className="p-1 rounded text-slate-300 hover:text-amber-400 hover:bg-slate-800 cursor-pointer flex items-center gap-1"
                title="Reset to default card layout"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="text-[9px]">Reset Pos</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Editable Content */}
      <div
        ref={textRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onInput={(e) => onUpdateText && onUpdateText(id, e.currentTarget.innerText)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={{
          fontSize: `${fontSize}px`,
          fontWeight: isBold ? 900 : 600,
          color: effectiveColor,
          lineHeight: 1.25,
          textShadow: effectiveColor === '#ffffff' ? '0 1px 4px rgba(0,0,0,0.6)' : 'none',
          userSelect: isEditing ? 'text' : 'none',
          writingMode: isVertical ? 'vertical-rl' : 'horizontal-tb',
          textOrientation: isVertical ? 'upright' : 'mixed',
          letterSpacing: isVertical ? '0.12em' : 'normal',
          height: height ? '100%' : 'auto',
          width: width ? '100%' : 'auto',
          maxWidth: maxWidth || customStyle?.maxWidth || undefined,
          display: (width || height || isVertical) ? 'flex' : 'block',
          alignItems: 'center',
          justifyContent:
            (customStyle?.textAlign === 'right' || textAlign === 'right')
              ? 'flex-end'
              : (customStyle?.textAlign === 'left' || textAlign === 'left')
              ? 'flex-start'
              : 'center',
          textAlign: customStyle?.textAlign || textAlign || 'center',
        }}
        className={`font-heading outline-none ${
          (customStyle?.textAlign === 'right' || textAlign === 'right')
            ? 'text-right'
            : (customStyle?.textAlign === 'left' || textAlign === 'left')
            ? 'text-left'
            : 'text-center'
        } whitespace-pre-wrap min-w-[40px] px-1 transition ${
          isEditing ? 'cursor-text select-text' : 'cursor-grab active:cursor-grabbing select-none'
        }`}
      >
        {text}
      </div>

      {/* Word-style Corner & Height/Width Resize Handles */}
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
 * Word-style 8-point handles for interactive text box manipulation:
 * - 4 Corner handles ('nw', 'ne', 'se', 'sw'): Proportional font size scaling with live px badge
 * - Top ('n') & Bottom ('s') handles: Height resizing (e.g. to fit vertical text, stretch cards)
 * - Left ('w') & Right ('e') handles: Width resizing (e.g. narrow columns, multi-line wrap)
 */
export function TextCornerHandles({
  id,
  fontSize = 14,
  width = null,
  height = null,
  containerRef = null,
  onSetFontSize = null,
  onChangeFontSize = null,
  onSetDimensions = null,
  minSize = 8,
  maxSize = 64,
}) {
  const [activeHandle, setActiveHandle] = useState(null);
  const [_currentSize, setCurrentSize] = useState(fontSize);
  const [_currentHeight, setCurrentHeight] = useState(height);
  const [_currentWidth, setCurrentWidth] = useState(width);
  const [tooltipText, setTooltipText] = useState('');
  const resizeRef = useRef({
    startX: 0,
    startY: 0,
    startFontSize: fontSize,
    startWidth: width,
    startHeight: height,
  });

  useEffect(() => {
    if (!activeHandle) {
      setCurrentSize(fontSize);
      setCurrentHeight(height);
      setCurrentWidth(width);
    }
  }, [fontSize, height, width, activeHandle]);

  const handleStartResize = (e, handleType) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveHandle(handleType);

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const parentElem = (containerRef && containerRef.current) || e.currentTarget.parentElement;
    const rect = parentElem ? parentElem.getBoundingClientRect() : null;
    const startW = width || (rect ? Math.round(rect.width) : 100);
    const startH = height || (rect ? Math.round(rect.height) : 40);

    resizeRef.current = {
      startX: clientX,
      startY: clientY,
      startFontSize: fontSize,
      startWidth: startW,
      startHeight: startH,
    };

    if (handleType === 'n' || handleType === 's') {
      setTooltipText(`Height: ${startH}px`);
    } else if (handleType === 'w' || handleType === 'e') {
      setTooltipText(`Width: ${startW}px`);
    } else {
      setTooltipText(`${fontSize}px Font`);
    }

    const handleMove = (moveEvt) => {
      const curX = moveEvt.touches ? moveEvt.touches[0].clientX : moveEvt.clientX;
      const curY = moveEvt.touches ? moveEvt.touches[0].clientY : moveEvt.clientY;
      const { startX, startY, startFontSize, startWidth: initW, startHeight: initH } = resizeRef.current;

      const deltaX = curX - startX;
      const deltaY = curY - startY;

      if (handleType === 's') {
        const newH = Math.round(Math.max(20, Math.min(650, initH + deltaY)));
        setCurrentHeight(newH);
        setTooltipText(`Height: ${newH}px`);
        if (onSetDimensions) { onSetDimensions(id, { height: newH, width: width || initW });; }
      } else if (handleType === 'n') {
        const newH = Math.round(Math.max(20, Math.min(650, initH - deltaY)));
        setCurrentHeight(newH);
        setTooltipText(`Height: ${newH}px`);
        if (onSetDimensions) { onSetDimensions(id, { height: newH, width: width || initW });; }
      } else if (handleType === 'e') {
        const newW = Math.round(Math.max(30, Math.min(800, initW + deltaX)));
        setCurrentWidth(newW);
        setTooltipText(`Width: ${newW}px`);
        if (onSetDimensions) { onSetDimensions(id, { width: newW, height: height || initH });; }
      } else if (handleType === 'w') {
        const newW = Math.round(Math.max(30, Math.min(800, initW - deltaX)));
        setCurrentWidth(newW);
        setTooltipText(`Width: ${newW}px`);
        if (onSetDimensions) { onSetDimensions(id, { width: newW, height: height || initH });; }
      } else {
        let sizeDelta = 0;
        if (handleType === 'se') sizeDelta = (deltaX + deltaY) / 5;
        else if (handleType === 'sw') sizeDelta = (-deltaX + deltaY) / 5;
        else if (handleType === 'ne') sizeDelta = (deltaX - deltaY) / 5;
        else if (handleType === 'nw') sizeDelta = (-deltaX - deltaY) / 5;

        const calculated = Math.round(
          Math.max(minSize, Math.min(maxSize, startFontSize + sizeDelta))
        );
        setCurrentSize(calculated);
        setTooltipText(`${calculated}px Font`);

        if (onSetFontSize) {
          onSetFontSize(id, calculated);
        } else if (onChangeFontSize) {
          onChangeFontSize(id, calculated - fontSize);
        }
      }
    };

    const handleEnd = () => {
      setActiveHandle(null);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
  };

  return (
    <>
      {/* 4 Corner Resize Handles (Font Size Scaling) */}
      <div
        onMouseDown={(e) => handleStartResize(e, 'nw')}
        onTouchStart={(e) => handleStartResize(e, 'nw')}
        onClick={(e) => e.stopPropagation()}
        className={`no-print absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-amber-400 border-2 border-slate-900 rounded-full cursor-nwse-resize z-30 shadow-md transition-transform hover:scale-125 ${
          activeHandle === 'nw' ? 'scale-125 ring-2 ring-amber-300' : ''
        }`}
        title="Drag corner to scale font size like in Word"
      />
      <div
        onMouseDown={(e) => handleStartResize(e, 'ne')}
        onTouchStart={(e) => handleStartResize(e, 'ne')}
        onClick={(e) => e.stopPropagation()}
        className={`no-print absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-400 border-2 border-slate-900 rounded-full cursor-nesw-resize z-30 shadow-md transition-transform hover:scale-125 ${
          activeHandle === 'ne' ? 'scale-125 ring-2 ring-amber-300' : ''
        }`}
        title="Drag corner to scale font size like in Word"
      />
      <div
        onMouseDown={(e) => handleStartResize(e, 'sw')}
        onTouchStart={(e) => handleStartResize(e, 'sw')}
        onClick={(e) => e.stopPropagation()}
        className={`no-print absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-amber-400 border-2 border-slate-900 rounded-full cursor-nesw-resize z-30 shadow-md transition-transform hover:scale-125 ${
          activeHandle === 'sw' ? 'scale-125 ring-2 ring-amber-300' : ''
        }`}
        title="Drag corner to scale font size like in Word"
      />
      <div
        onMouseDown={(e) => handleStartResize(e, 'se')}
        onTouchStart={(e) => handleStartResize(e, 'se')}
        onClick={(e) => e.stopPropagation()}
        className={`no-print absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-400 border-2 border-slate-900 rounded-full cursor-nwse-resize z-30 shadow-md transition-transform hover:scale-125 ${
          activeHandle === 'se' ? 'scale-125 ring-2 ring-amber-300' : ''
        }`}
        title="Drag corner to scale font size like in Word"
      />

      {/* Top and Bottom Height Resize Handles (Adjust height for vertical text) */}
      <div
        onMouseDown={(e) => handleStartResize(e, 'n')}
        onTouchStart={(e) => handleStartResize(e, 'n')}
        onClick={(e) => e.stopPropagation()}
        className={`no-print absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 h-2 bg-amber-400 border border-slate-900 rounded-full cursor-ns-resize z-30 shadow-md transition-transform hover:scale-125 ${
          activeHandle === 'n' ? 'scale-125 ring-2 ring-amber-300' : ''
        }`}
        title="Drag up or down to adjust text box height"
      />
      <div
        onMouseDown={(e) => handleStartResize(e, 's')}
        onTouchStart={(e) => handleStartResize(e, 's')}
        onClick={(e) => e.stopPropagation()}
        className={`no-print absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-2 bg-amber-400 border border-slate-900 rounded-full cursor-ns-resize z-30 shadow-md transition-transform hover:scale-125 ${
          activeHandle === 's' ? 'scale-125 ring-2 ring-amber-300' : ''
        }`}
        title="Drag down or up to increase height (perfect for vertical text)"
      />

      {/* Left and Right Width Resize Handles */}
      <div
        onMouseDown={(e) => handleStartResize(e, 'w')}
        onTouchStart={(e) => handleStartResize(e, 'w')}
        onClick={(e) => e.stopPropagation()}
        className={`no-print absolute top-1/2 -left-1.5 -translate-y-1/2 w-2 h-6 bg-amber-400 border border-slate-900 rounded-full cursor-ew-resize z-30 shadow-md transition-transform hover:scale-125 ${
          activeHandle === 'w' ? 'scale-125 ring-2 ring-amber-300' : ''
        }`}
        title="Drag left or right to adjust text box width"
      />
      <div
        onMouseDown={(e) => handleStartResize(e, 'e')}
        onTouchStart={(e) => handleStartResize(e, 'e')}
        onClick={(e) => e.stopPropagation()}
        className={`no-print absolute top-1/2 -right-1.5 -translate-y-1/2 w-2 h-6 bg-amber-400 border border-slate-900 rounded-full cursor-ew-resize z-30 shadow-md transition-transform hover:scale-125 ${
          activeHandle === 'e' ? 'scale-125 ring-2 ring-amber-300' : ''
        }`}
        title="Drag right or left to adjust text box width"
      />

      {/* Floating Font Size / Height / Width Tooltip Indicator while dragging */}
      {activeHandle && (
        <div className="no-print absolute -bottom-7 left-1/2 -translate-x-1/2 bg-slate-900 text-amber-400 border border-amber-400/50 px-2 py-0.5 rounded-full font-mono font-black text-[10px] shadow-2xl pointer-events-none z-50 whitespace-nowrap flex items-center gap-1">
          <span>{tooltipText}</span>
        </div>
      )}
    </>
  );
}

export const TextBoxHandles = TextCornerHandles;
