import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import {
  TILE_URL,
  ATTRIBUTION,
  GOOGLE_MAPS_TILE_URL,
  GOOGLE_MAPS_SUBDOMAINS,
  GOOGLE_MAPS_ATTRIBUTION,
  DEFAULT_MAP_ZOOM,
  DEFAULT_FALLBACK_COORDS,
} from '../../config/mapConfig';

// Robust icon URL resolver for Next.js ({ src: '...' }), Vite (string), and Webpack
const getAssetUrl = (asset, fallbackCdnUrl) => {
  if (typeof asset === 'string') return asset;
  if (asset && typeof asset === 'object' && asset.src) return asset.src;
  if (asset && typeof asset === 'object' && asset.default) {
    return typeof asset.default === 'string' ? asset.default : asset.default.src || fallbackCdnUrl;
  }
  return fallbackCdnUrl;
};

const icon2xUrl = getAssetUrl(
  markerIcon2x,
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png'
);
const iconUrl = getAssetUrl(
  markerIcon,
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png'
);
const shadowUrl = getAssetUrl(
  markerShadow,
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
);

// Global fallback for Leaflet default icon prototype
if (typeof window !== 'undefined' && L && L.Icon && L.Icon.Default) {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: icon2xUrl,
    iconUrl: iconUrl,
    shadowUrl: shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}

// Explicit icon instance to guarantee Next.js / bundler rendering
const createMapPinIcon = () =>
  L.icon({
    iconRetinaUrl: icon2xUrl,
    iconUrl: iconUrl,
    shadowUrl: shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

export default function LeafletMap({
  center,
  zoom = DEFAULT_MAP_ZOOM,
  draggable = false,
  onLocationChange,
  className = '',
  height = '240px',
  interactive = true,
  popupText = null,
  tileProvider = 'google',
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const [isAttributionOpen, setIsAttributionOpen] = useState(false);
  const [shouldInitMap, setShouldInitMap] = useState(() => Boolean(interactive));

  const activeLat = Number(center?.lat ?? DEFAULT_FALLBACK_COORDS.lat);
  const activeLng = Number(center?.lng ?? DEFAULT_FALLBACK_COORDS.lng);

  // Defer static map thumbnail initialization until visible in viewport and browser is idle
  useEffect(() => {
    if (shouldInitMap) return;
    const el = mapContainerRef.current;
    if (!el) return;

    let idleId = null;
    let timeoutId = null;

    const triggerIdleInit = () => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(() => setShouldInitMap(true), { timeout: 600 });
      } else {
        timeoutId = setTimeout(() => setShouldInitMap(true), 180);
      }
    };

    if (typeof IntersectionObserver === 'undefined') {
      triggerIdleInit();
      return () => {
        if (idleId && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId);
        if (timeoutId) clearTimeout(timeoutId);
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          triggerIdleInit();
        }
      },
      { rootMargin: '120px' }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (idleId && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [shouldInitMap]);

  // Initialize Map
  useEffect(() => {
    if (!shouldInitMap) return;
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    const map = L.map(mapContainerRef.current, {
      center: [activeLat, activeLng],
      zoom,
      scrollWheelZoom: interactive ? 'center' : false,
      dragging: interactive,
      touchZoom: interactive,
      doubleClickZoom: interactive,
      boxZoom: interactive,
      zoomControl: interactive,
      attributionControl: true,
    });

    // Remove the "Leaflet" prefix as strictly required
    if (map.attributionControl) {
      map.attributionControl.setPrefix(false);
    }

    // Standard Google Maps tiles with subdomains (fallback to OSM if tileProvider is 'osm')
    if (tileProvider === 'osm') {
      L.tileLayer(TILE_URL, {
        attribution: ATTRIBUTION,
        maxZoom: 19,
      }).addTo(map);
    } else {
      L.tileLayer(GOOGLE_MAPS_TILE_URL, {
        subdomains: GOOGLE_MAPS_SUBDOMAINS,
        attribution: GOOGLE_MAPS_ATTRIBUTION,
        maxZoom: 20,
      }).addTo(map);
    }

    // Marker with explicit icon
    const marker = L.marker([activeLat, activeLng], {
      icon: createMapPinIcon(),
      draggable,
      autoPan: true,
    }).addTo(map);

    if (popupText) {
      marker.bindPopup(popupText);
    }

    if (draggable && onLocationChange) {
      marker.on('dragstart', () => {
        isDraggingRef.current = true;
      });

      marker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        const fixedLat = Number(Number(pos.lat).toFixed(6));
        const fixedLng = Number(Number(pos.lng).toFixed(6));
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 150);
        onLocationChange({ lat: fixedLat, lng: fixedLng });
      });

      // Also allow clicking anywhere on map to reposition marker
      map.on('click', (e) => {
        const fixedLat = Number(Number(e.latlng.lat).toFixed(6));
        const fixedLng = Number(Number(e.latlng.lng).toFixed(6));
        marker.setLatLng([fixedLat, fixedLng]);
        onLocationChange({ lat: fixedLat, lng: fixedLng });
      });
    }

    mapInstanceRef.current = map;
    markerRef.current = marker;

    // Fix map not rendering inside modals/tabs:
    // 1. Observe container resize (handles modal opening, tab switching, layout shifts)
    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.invalidateSize({ pan: false });
            }
          }
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    // 2. Single fallback timer for modal transition completion (avoids repeated forced reflows)
    const timerId = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize({ pan: false });
      }
    }, 200);

    // 3. Listen to window resize and visibilitychange
    const handleWindowChange = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize({ pan: false });
      }
    };
    window.addEventListener('resize', handleWindowChange);
    document.addEventListener('visibilitychange', handleWindowChange);

    return () => {
      clearTimeout(timerId);
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowChange);
      document.removeEventListener('visibilitychange', handleWindowChange);
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [shouldInitMap]);

  // Update map view & marker when center coordinates change externally (without jumping)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    // Ignore while user is actively dragging the marker
    if (isDraggingRef.current) return;

    const currentLatLng = marker.getLatLng();
    const dist = Math.hypot(currentLatLng.lat - activeLat, currentLatLng.lng - activeLng);

    // Only update if position changed significantly (> 0.0001 deg ~ 11m)
    // This stops small precision rounding jumps from causing infinite flyTo loops
    if (dist > 0.0001) {
      marker.setLatLng([activeLat, activeLng]);
      map.flyTo([activeLat, activeLng], zoom, { duration: 0.6 });
    }
  }, [activeLat, activeLng, zoom]);

  // Update draggable option dynamically
  useEffect(() => {
    if (markerRef.current) {
      if (draggable) {
        markerRef.current.dragging?.enable();
      } else {
        markerRef.current.dragging?.disable();
      }
    }
  }, [draggable]);

  // Invalidate size whenever height or className changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize({ pan: false });
    }
  }, [height, className]);

  return (
    <div className={`relative overflow-hidden rounded-xl shadow-inner compact-osm-map ${className}`}>
      <style>{`
        .compact-osm-map .leaflet-control-attribution {
          display: none !important;
        }
      `}</style>
      <div
        ref={mapContainerRef}
        style={{ height, width: '100%' }}
        className="w-full h-full z-0"
      />

      {/* Google Maps External Quick Link */}
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${activeLat},${activeLng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-1.5 left-1.5 z-[500] px-2 py-0.5 rounded-md bg-white/95 hover:bg-white text-[10px] font-bold text-[#1A73E8] border border-slate-200 shadow-xs flex items-center gap-1 transition select-none pointer-events-auto"
        title="View in Google Maps"
      >
        <img
          src="https://maps.gstatic.com/mapfiles/api-3/images/google_gray.svg"
          alt="Google"
          className="h-3"
        />
        <span>Google Maps</span>
      </a>

      {/* Compact OpenStreetMap Attribution Icon ("i" that expands on tap/click) */}
      <div className="absolute bottom-1.5 right-1.5 z-[500] pointer-events-auto select-none">
        {isAttributionOpen ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/95 backdrop-blur-xs text-[10px] font-medium text-slate-700 shadow-md border border-slate-200 animate-fadeIn">
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-800 hover:text-[#F26B1D] font-bold underline transition"
            >
              © OpenStreetMap
            </a>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAttributionOpen(false);
              }}
              className="text-slate-400 hover:text-slate-600 ml-0.5 p-0.5 cursor-pointer leading-none"
              title="Close attribution"
              aria-label="Close attribution"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsAttributionOpen(true);
            }}
            className="w-5 h-5 rounded-full bg-white/90 hover:bg-white text-slate-700 hover:text-slate-950 border border-slate-300 shadow-sm flex items-center justify-center text-[11px] font-serif font-black transition cursor-pointer"
            title="Map attribution: © OpenStreetMap"
            aria-label="Show map attribution"
          >
            i
          </button>
        )}
      </div>
    </div>
  );
}

