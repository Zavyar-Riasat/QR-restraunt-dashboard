import React from 'react';

/**
 * Modern, warm SVG illustrations consistent with DineHQ brand palette:
 * Orange #F26B1D, Amber #F5A623, Cream #FFF9F2, Brown #2B2118, Green #1F9D55
 */

export function HeroFoodIllustration({ className = 'w-full h-auto max-w-[280px] sm:max-w-[340px]' }) {
  return (
    <svg
      viewBox="0 0 360 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="heroGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F26B1D" stopOpacity="0.25" />
          <stop offset="60%" stopColor="#F5A623" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#FFF9F2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="burgerBun" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F5A623" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="patty" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5C3D2E" />
          <stop offset="100%" stopColor="#2B2118" />
        </linearGradient>
        <linearGradient id="sauceGlow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F26B1D" />
          <stop offset="100%" stopColor="#E5484D" />
        </linearGradient>
      </defs>

      {/* Warm Ambient Glow Behind Plate (Pulsing Glow) */}
      <circle cx="180" cy="145" r="115" fill="url(#heroGlow)" className="animate-glow-pulse" />

      {/* Serving Plate & Ground Shadow (Breathing with Float, centered at cx=180) */}
      <ellipse cx="180" cy="204" rx="130" ry="24" fill="#E8D8C8" className="animate-hero-shadow" />
      <ellipse cx="180" cy="198" rx="124" ry="22" fill="#FFFFFF" stroke="#F0E4D7" strokeWidth="3" />
      <ellipse cx="180" cy="196" rx="98" ry="16" fill="#FFF9F2" />

      {/* Fresh Food Elements - Gourmet Smash Burger (Centered at cx=180, sits directly on plate) */}
      <g className="animate-hero-float">
        {/* Bottom Bun */}
        <rect x="135" y="168" width="90" height="20" rx="10" fill="url(#burgerBun)" />

        {/* Crisp Lettuce Ripple */}
        <path
          d="M128 167 Q145 159 162 167 Q180 159 198 167 Q215 159 232 167 C235 170 232 175 228 175 L132 175 C128 175 125 170 128 167 Z"
          fill="#1F9D55"
        />

        {/* Sizzling Patty */}
        <rect x="130" y="153" width="100" height="16" rx="8" fill="url(#patty)" />

        {/* Melted Cheddar Drip */}
        <path
          d="M134 151 L226 151 L222 158 L205 158 L200 165 L192 158 L165 158 L160 166 L152 158 L138 158 Z"
          fill="#F5A623"
        />

        {/* Ripe Tomato Slice */}
        <rect x="136" y="141" width="88" height="12" rx="6" fill="#E5484D" />

        {/* Top Sesame Bun */}
        <path
          d="M132 138 C132 98, 228 98, 228 138 Z"
          fill="url(#burgerBun)"
        />

        {/* Sesame Seeds (Symmetrically placed around cx=180) */}
        <circle cx="160" cy="118" r="2" fill="#FFF9F2" />
        <circle cx="180" cy="110" r="2.2" fill="#FFF9F2" />
        <circle cx="200" cy="118" r="2" fill="#FFF9F2" />
        <circle cx="170" cy="126" r="1.8" fill="#FFF9F2" />
        <circle cx="190" cy="125" r="1.8" fill="#FFF9F2" />
      </g>

      {/* Floating Hot Steam Curves (Centered directly above burger top bun) */}
      <path
        d="M168 94 Q163 78 171 66 T168 50"
        stroke="#F26B1D"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        className="animate-steam-1"
      />
      <path
        d="M180 88 Q188 72 180 58 T185 42"
        stroke="#F5A623"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        className="animate-steam-2"
      />
      <path
        d="M192 94 Q197 78 189 66 T195 52"
        stroke="#F26B1D"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        className="animate-steam-3"
      />

      {/* Appetizing Sparkle Flashes */}
      <g className="animate-float-slow opacity-80" transform="translate(100, 140)">
        <path d="M0 6 L2 2 L6 0 L2 -2 L0 -6 L-2 -2 L-6 0 L-2 2 Z" fill="#F5A623" />
      </g>
      <g className="animate-float-reverse opacity-75" transform="translate(260, 140)">
        <path d="M0 7 L2.5 2.5 L7 0 L2.5 -2.5 L0 -7 L-2.5 -2.5 L-7 0 L-2.5 2.5 Z" fill="#F26B1D" />
      </g>
      <g className="animate-float-slow opacity-70" transform="translate(245, 95)">
        <circle cx="0" cy="0" r="3" fill="#F5A623" />
      </g>

    </svg>
  );
}

export function EmptyStateIllustration({ className = 'w-32 h-32 mx-auto' }) {
  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="80" cy="80" r="70" fill="#FFF1E6" />
      <circle cx="80" cy="80" r="50" fill="#FFFFFF" stroke="#FCD8BF" strokeWidth="2" />
      {/* Map Locator Pin */}
      <path
        d="M80 44 C70 44, 62 52, 62 62 C62 76, 80 94, 80 94 C80 94, 98 76, 98 62 C98 52, 90 44, 80 44 Z"
        fill="#F26B1D"
      />
      <circle cx="80" cy="62" r="6" fill="#FFFFFF" />
      {/* Utensil cutlery icon */}
      <circle cx="112" cy="106" r="16" fill="#F5A623" />
      <path d="M108 100 V112 M112 100 V112 M116 100 V112" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ErrorStateIllustration({ className = 'w-28 h-28 mx-auto' }) {
  return (
    <svg
      viewBox="0 0 140 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="70" cy="70" r="60" fill="#FDECEC" />
      <circle cx="70" cy="70" r="42" fill="#FFFFFF" stroke="#F9C3C5" strokeWidth="2" />
      <path
        d="M70 46 V76 M70 88 V90"
        stroke="#E5484D"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
