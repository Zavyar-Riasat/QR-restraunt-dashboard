const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const iconsDir = path.resolve('public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1. Standard 512x512 SVG with rounded squircle
const svg512 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F26B1D"/>
      <stop offset="100%" stop-color="#F5A623"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="125%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.25"/>
    </filter>
  </defs>

  <!-- Squircle Base -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>

  <!-- Subtle Inner Glow Border -->
  <rect width="504" height="504" x="4" y="4" rx="108" fill="none" stroke="#FFFFFF" stroke-opacity="0.2" stroke-width="8"/>

  <!-- Utensils Cross Emblem -->
  <g filter="url(#shadow)" transform="translate(106, 106) scale(12.5)" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <!-- Knife & Fork Crossed -->
    <path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/>
    <path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"/>
    <path d="m2.1 21.8 6.4-6.3"/>
    <path d="m19 5-7 7"/>
  </g>
</svg>`;

// 2. Standard 192x192 SVG
const svg192 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="192" height="192">
  <defs>
    <linearGradient id="bgGrad192" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F26B1D"/>
      <stop offset="100%" stop-color="#F5A623"/>
    </linearGradient>
    <filter id="shadow192" x="-10%" y="-10%" width="120%" height="125%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#000000" flood-opacity="0.22"/>
    </filter>
  </defs>

  <!-- Squircle Base -->
  <rect width="192" height="192" rx="42" fill="url(#bgGrad192)"/>

  <!-- Inner border -->
  <rect width="188" height="188" x="2" y="2" rx="40" fill="none" stroke="#FFFFFF" stroke-opacity="0.25" stroke-width="4"/>

  <!-- Utensils Cross Emblem -->
  <g filter="url(#shadow192)" transform="translate(40, 40) scale(4.666)" stroke="#FFFFFF" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/>
    <path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"/>
    <path d="m2.1 21.8 6.4-6.3"/>
    <path d="m19 5-7 7"/>
  </g>
</svg>`;

// 3. Maskable 512x512 SVG (Full-bleed rectangle with symbol in safe zone)
const svgMaskable512 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGradMask" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F26B1D"/>
      <stop offset="100%" stop-color="#F5A623"/>
    </linearGradient>
    <filter id="shadowMask" x="-10%" y="-10%" width="120%" height="125%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000000" flood-opacity="0.25"/>
    </filter>
  </defs>

  <!-- Full Bleed Background (covers 100% of maskable area) -->
  <rect width="512" height="512" fill="url(#bgGradMask)"/>

  <!-- Utensils Cross Emblem in 80% Safe Zone (centered within 410x410 inner circle) -->
  <g filter="url(#shadowMask)" transform="translate(136, 136) scale(10)" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/>
    <path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"/>
    <path d="m2.1 21.8 6.4-6.3"/>
    <path d="m19 5-7 7"/>
  </g>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'icon-512.svg'), svg512, 'utf8');
fs.writeFileSync(path.join(iconsDir, 'icon-192.svg'), svg192, 'utf8');
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512.svg'), svgMaskable512, 'utf8');
fs.writeFileSync(path.resolve('public/favicon.svg'), svg192, 'utf8');

console.log('✅ SVGs generated in public/icons/');

// Rasterize to PNG using Headless Chrome or Edge
const browserPath = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

console.log('Using browser for rasterization:', browserPath);

const tempHtml = path.resolve('public/icons/_render_icon.html');

function renderPng(svgContent, size, outputPath) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: ${size}px; height: ${size}px; overflow: hidden; background: transparent; }
    svg { width: ${size}px; height: ${size}px; display: block; }
  </style>
</head>
<body>
  ${svgContent}
</body>
</html>`;
  fs.writeFileSync(tempHtml, html, 'utf8');

  const cmd = `"${browserPath}" --headless --disable-gpu --hide-scrollbars --window-size=${size},${size} --screenshot="${outputPath}" "file://${tempHtml.replace(/\\/g, '/')}"`;
  execSync(cmd, { stdio: 'ignore' });
  console.log(`Rendered ${size}x${size} -> ${path.basename(outputPath)}`);
}

try {
  renderPng(svg192, 192, path.join(iconsDir, 'icon-192.png'));
  renderPng(svg512, 512, path.join(iconsDir, 'icon-512.png'));
  renderPng(svgMaskable512, 512, path.join(iconsDir, 'icon-maskable-512.png'));
  renderPng(svg192, 180, path.resolve('public/apple-touch-icon.png'));
  renderPng(svg192, 192, path.resolve('public/icon-192.png'));
  renderPng(svg512, 512, path.resolve('public/icon-512.png'));
} finally {
  if (fs.existsSync(tempHtml)) {
    fs.unlinkSync(tempHtml);
  }
}

console.log('🎉 All PWA icons generated successfully!');
