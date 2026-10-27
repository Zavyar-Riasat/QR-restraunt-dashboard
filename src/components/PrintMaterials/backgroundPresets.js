/**
 * Curated restaurant background presets for print materials & flyers.
 * Built as self-contained high-res SVG data URLs and CSS gradient patterns
 * to ensure 100% offline compatibility and zero CORS issues when exporting to PDF or PNG.
 */

// 1. Warm Grill & Burger (Dark Charcoal with glowing amber embers & subtle grill lines)
const grillSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200">
  <defs>
    <radialGradient id="emberGlow" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#f97316" stop-opacity="0.35"/>
      <stop offset="45%" stop-color="#ea580c" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#0b0f19" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bgBase" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#181310"/>
      <stop offset="50%" stop-color="#0f0c0a"/>
      <stop offset="100%" stop-color="#050403"/>
    </linearGradient>
    <pattern id="grillLines" width="40" height="40" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="40" stroke="#f97316" stroke-width="1" stroke-opacity="0.07" />
    </pattern>
  </defs>
  <rect width="800" height="1200" fill="url(#bgBase)"/>
  <rect width="800" height="1200" fill="url(#grillLines)"/>
  <rect width="800" height="1200" fill="url(#emberGlow)"/>
  <circle cx="400" cy="580" r="280" fill="#ea580c" opacity="0.12" filter="blur(60px)"/>
</svg>
`.trim();

// 2. Dark Rustic Wood (Deep walnut tabletop with wood grain texture)
const woodSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200">
  <defs>
    <linearGradient id="woodGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1f1610"/>
      <stop offset="35%" stop-color="#2a1d15"/>
      <stop offset="70%" stop-color="#18110b"/>
      <stop offset="100%" stop-color="#120c08"/>
    </linearGradient>
    <pattern id="planks" width="800" height="120" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="800" y2="0" stroke="#0a0604" stroke-width="3" stroke-opacity="0.6"/>
      <line x1="0" y1="119" x2="800" y2="119" stroke="#3d2a1e" stroke-width="1" stroke-opacity="0.4"/>
    </pattern>
    <radialGradient id="spotlight" cx="50%" cy="45%" r="55%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.5"/>
    </radialGradient>
  </defs>
  <rect width="800" height="1200" fill="url(#woodGrad)"/>
  <rect width="800" height="1200" fill="url(#planks)"/>
  <rect width="800" height="1200" fill="url(#spotlight)"/>
</svg>
`.trim();

// 3. Neapolitan Pizza & Bistro (Deep warm terracotta & olive accents)
const pizzaSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200">
  <defs>
    <radialGradient id="ovenGlow" cx="50%" cy="35%" r="60%">
      <stop offset="0%" stop-color="#ef4444" stop-opacity="0.3"/>
      <stop offset="50%" stop-color="#b91c1c" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#1a0c0a" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="terracottaBase" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#24120e"/>
      <stop offset="50%" stop-color="#170c09"/>
      <stop offset="100%" stop-color="#0a0504"/>
    </linearGradient>
  </defs>
  <rect width="800" height="1200" fill="url(#terracottaBase)"/>
  <rect width="800" height="1200" fill="url(#ovenGlow)"/>
  <circle cx="400" cy="520" r="220" fill="#f97316" opacity="0.1" />
</svg>
`.trim();

// 4. Midnight Luxury Slate & Gold (Sophisticated dark obsidian marble with gold accents)
const luxurySvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200">
  <defs>
    <linearGradient id="luxuryBase" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#090d16"/>
      <stop offset="40%" stop-color="#0f172a"/>
      <stop offset="80%" stop-color="#0b1120"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <radialGradient id="goldHighlight" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.22"/>
      <stop offset="70%" stop-color="#d97706" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#020617" stop-opacity="0"/>
    </radialGradient>
    <pattern id="fineGrid" width="60" height="60" patternUnits="userSpaceOnUse">
      <circle cx="30" cy="30" r="1" fill="#f59e0b" fill-opacity="0.15"/>
    </pattern>
  </defs>
  <rect width="800" height="1200" fill="url(#luxuryBase)"/>
  <rect width="800" height="1200" fill="url(#fineGrid)"/>
  <rect width="800" height="1200" fill="url(#goldHighlight)"/>
</svg>
`.trim();

// 5. Fresh Green Botanical / Garden Kitchen (Organic farm-to-table emerald mood)
const gardenSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200">
  <defs>
    <linearGradient id="gardenBase" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#062e24"/>
      <stop offset="45%" stop-color="#042019"/>
      <stop offset="100%" stop-color="#02110c"/>
    </linearGradient>
    <radialGradient id="emeraldSpot" cx="50%" cy="38%" r="55%">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0.25"/>
      <stop offset="60%" stop-color="#059669" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#02110c" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="800" height="1200" fill="url(#gardenBase)"/>
  <rect width="800" height="1200" fill="url(#emeraldSpot)"/>
</svg>
`.trim();

// 6. Clean Minimalist Warm Cream (Soft daylight cafe atmosphere)
const creamSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200">
  <defs>
    <linearGradient id="creamBase" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fdfbf7"/>
      <stop offset="50%" stop-color="#f7f1e6"/>
      <stop offset="100%" stop-color="#ede3d1"/>
    </linearGradient>
    <radialGradient id="warmCenter" cx="50%" cy="35%" r="60%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#ede3d1" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="800" height="1200" fill="url(#creamBase)"/>
  <rect width="800" height="1200" fill="url(#warmCenter)"/>
</svg>
`.trim();

export const BACKGROUND_PRESETS = [
  {
    id: 'preset-grill',
    label: 'Grill & Smoke',
    description: 'Dark charcoal & glowing amber embers',
    textColor: 'light',
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(grillSvg)}`,
    thumbnailColor: '#ea580c',
  },
  {
    id: 'preset-wood',
    label: 'Rustic Wood',
    description: 'Rich dark walnut bistro tabletop',
    textColor: 'light',
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(woodSvg)}`,
    thumbnailColor: '#78350f',
  },
  {
    id: 'preset-pizza',
    label: 'Pizza & Bistro',
    description: 'Warm terracotta & rustic oven glow',
    textColor: 'light',
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(pizzaSvg)}`,
    thumbnailColor: '#b91c1c',
  },
  {
    id: 'preset-luxury',
    label: 'Midnight Luxury',
    description: 'Deep obsidian slate with gold aura',
    textColor: 'light',
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(luxurySvg)}`,
    thumbnailColor: '#f59e0b',
  },
  {
    id: 'preset-garden',
    label: 'Organic Emerald',
    description: 'Farm-fresh botanical deep green',
    textColor: 'light',
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(gardenSvg)}`,
    thumbnailColor: '#059669',
  },
  {
    id: 'preset-cream',
    label: 'Minimalist Cream',
    description: 'Soft daylight clean modern cafe',
    textColor: 'dark',
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(creamSvg)}`,
    thumbnailColor: '#fef3c7',
  },
];
