/**
 * Self-contained, robust ESC/POS binary command encoder.
 * Supports typography formatting, alignment, tables, QR codes,
 * cash drawer kick, paper cut, and monochrome raster bitmap graphics.
 */

export class EscposEncoder {
  constructor() {
    this.buffer = [];
  }

  // Raw byte addition
  raw(bytes) {
    if (bytes instanceof Uint8Array || Array.isArray(bytes)) {
      for (let i = 0; i < bytes.length; i++) {
        this.buffer.push(bytes[i]);
      }
    } else if (typeof bytes === 'number') {
      this.buffer.push(bytes);
    }
    return this;
  }

  // Initialize printer
  init() {
    return this.raw([0x1b, 0x40]);
  }

  // Alignment: 'left' | 'center' | 'right'
  align(alignment = 'left') {
    let mode = 0x00;
    if (alignment === 'center') mode = 0x01;
    if (alignment === 'right') mode = 0x02;
    return this.raw([0x1b, 0x61, mode]);
  }

  // Bold
  bold(enable = true) {
    return this.raw([0x1b, 0x45, enable ? 0x01 : 0x00]);
  }

  // Underline
  underline(enable = true) {
    return this.raw([0x1b, 0x2d, enable ? 0x01 : 0x00]);
  }

  // Size modes: 'normal', 'double-height', 'double-width', 'double'
  size(mode = 'normal') {
    let byte = 0x00;
    if (mode === 'double') byte = 0x11;
    else if (mode === 'double-width') byte = 0x10;
    else if (mode === 'double-height') byte = 0x01;
    return this.raw([0x1d, 0x21, byte]);
  }

  // Line feed
  feed(lines = 1) {
    for (let i = 0; i < lines; i++) {
      this.buffer.push(0x0a);
    }
    return this;
  }

  // Text encoder (handles standard ASCII / Latin-1)
  text(str) {
    if (!str) return this;
    const cleanStr = String(str);
    for (let i = 0; i < cleanStr.length; i++) {
      const code = cleanStr.charCodeAt(i);
      if (code < 128) {
        this.buffer.push(code);
      } else {
        // Fallback for non-ASCII text within native ESC/POS
        this.buffer.push(0x3f); // '?'
      }
    }
    return this;
  }

  // Line of text + line feed
  line(str = '') {
    this.text(str);
    return this.feed(1);
  }

  // Horizontal separator line
  rule(charCount = 32, char = '-') {
    return this.line(char.repeat(charCount));
  }

  // Clean 2-column layout (e.g. "1x Burger        Rs. 1,200")
  twoColumns(leftStr, rightStr, width = 32) {
    const left = String(leftStr || '');
    const right = String(rightStr || '');
    const spacesNeeded = Math.max(1, width - left.length - right.length);
    return this.line(left + ' '.repeat(spacesNeeded) + right);
  }

  // Cut Paper
  cut(partial = true) {
    // Feed 3 lines first so the cut does not clip the bottom text
    this.feed(3);
    if (partial) {
      return this.raw([0x1d, 0x56, 0x41, 0x03]);
    }
    return this.raw([0x1d, 0x56, 0x00]);
  }

  // Kick Cash Drawer (Standard Pin 2: 25ms on, 250ms off)
  kickDrawer() {
    return this.raw([0x1b, 0x70, 0x00, 0x19, 0xfa]);
  }

  // Native ESC/POS QR Code command (Model 2)
  qrCode(data, moduleSize = 4) {
    if (!data) return this;
    const textBytes = new TextEncoder().encode(String(data));
    const length = textBytes.length + 3;
    const pL = length % 256;
    const pH = Math.floor(length / 256);

    // Select QR model (Model 2)
    this.raw([0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]);
    // Set module size (1-16)
    const validSize = Math.max(1, Math.min(16, moduleSize));
    this.raw([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, validSize]);
    // Set error correction (Level M = 0x31)
    this.raw([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31]);
    // Store data in symbol storage
    this.raw([0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30]);
    this.raw(textBytes);
    // Print symbol
    this.raw([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]);
    return this;
  }

  /**
   * Convert an HTML5 Canvas into a 1-bit monochrome ESC/POS raster image.
   * Command: GS v 0 (standard raster bit image)
   */
  rasterImage(canvas) {
    if (!canvas) return this;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const widthBytes = Math.ceil(width / 8);
    const xL = widthBytes % 256;
    const xH = Math.floor(widthBytes / 256);
    const yL = height % 256;
    const yH = Math.floor(height / 256);

    // GS v 0 m xL xH yL yH
    this.raw([0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH]);

    for (let y = 0; y < height; y++) {
      for (let xByte = 0; xByte < widthBytes; xByte++) {
        let byteVal = 0;
        for (let bit = 0; bit < 8; bit++) {
          const x = xByte * 8 + bit;
          if (x < width) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const alpha = data[idx + 3];

            // Consider white if transparent or bright
            const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
            const isBlack = alpha > 128 && brightness < 150;

            if (isBlack) {
              byteVal |= 0x80 >> bit;
            }
          }
        }
        this.buffer.push(byteVal);
      }
    }

    return this;
  }

  // Get Uint8Array
  encode() {
    return new Uint8Array(this.buffer);
  }
}
