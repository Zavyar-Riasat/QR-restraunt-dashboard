import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { calculatePolygonAreaKm2 } from '../../utils/geoValidation';
import {
  GOOGLE_MAPS_TILE_URL,
  GOOGLE_MAPS_SUBDOMAINS,
  GOOGLE_MAPS_ATTRIBUTION,
} from '../../config/mapConfig';

const previewPinIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [22, 36],
  iconAnchor: [11, 36],
  popupAnchor: [1, -30],
  shadowSize: [36, 36],
});

export default function ListingMapPreview({
  latitude,
  longitude,
  deliveryAreas = [],
  deliveryMode = 'radius',
  radiusKm = 5,
  polygonCoords = [],
  height = '180px',
  className = '',
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  const lat = Number(latitude) || 33.72148;
  const lng = Number(longitude) || 73.05232;

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 12,
      scrollWheelZoom: false,
      dragging: true,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer(GOOGLE_MAPS_TILE_URL, {
      maxZoom: 20,
      subdomains: GOOGLE_MAPS_SUBDOMAINS,
      attribution: GOOGLE_MAPS_ATTRIBUTION,
    }).addTo(map);

    // Marker
    L.marker([lat, lng], { icon: previewPinIcon }).addTo(map);

    // Delivery Area Layer
    const area = deliveryAreas?.[0];
    const isPoly = area?.type === 'polygon' || deliveryMode === 'polygon';
    const polyPoints = area?.polygon || polygonCoords;

    if (isPoly && Array.isArray(polyPoints) && polyPoints.length >= 3) {
      const latlngs = polyPoints.map((p) => [p.lat, p.lng]);
      const poly = L.polygon(latlngs, {
        color: '#F26B1D',
        fillColor: '#F26B1D',
        fillOpacity: 0.2,
        weight: 2,
      }).addTo(map);

      try {
        map.fitBounds(poly.getBounds(), { padding: [20, 20] });
      } catch {
        map.setView([lat, lng], 12);
      }
    } else {
      const radiusMeters = (area?.radius_km || radiusKm || 5) * 1000;
      const circle = L.circle([lat, lng], {
        radius: radiusMeters,
        color: '#F26B1D',
        fillColor: '#F26B1D',
        fillOpacity: 0.15,
        weight: 2,
        dashArray: '4, 4',
      }).addTo(map);

      try {
        map.fitBounds(circle.getBounds(), { padding: [15, 15] });
      } catch {
        map.setView([lat, lng], 12);
      }
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, deliveryAreas, deliveryMode, radiusKm, polygonCoords]);

  // Determine coverage summary text
  const area = deliveryAreas?.[0];
  const isPoly = area?.type === 'polygon' || deliveryMode === 'polygon';
  const polyPoints = area?.polygon || polygonCoords;

  let summaryText = `Delivers within ${area?.radius_km || radiusKm || 5} km`;
  if (isPoly && Array.isArray(polyPoints) && polyPoints.length >= 3) {
    const km2 = calculatePolygonAreaKm2(polyPoints);
    summaryText = `Polygon Zone (~${km2} km²)`;
  }

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-[#F0E4D7] ${className}`}>
      <div ref={containerRef} style={{ height }} className="w-full z-0 font-sans" />
      <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
        <span className="px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-xs border border-[#F0E4D7] shadow-xs text-[11px] font-bold text-[#2B2118]">
          📍 {summaryText}
        </span>
      </div>
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 right-2 z-10 px-2 py-0.5 rounded-md bg-white/95 hover:bg-white text-[10px] font-bold text-[#1A73E8] border border-slate-200 shadow-xs flex items-center gap-1 transition select-none"
        title="View in Google Maps"
      >
        <img
          src="https://maps.gstatic.com/mapfiles/api-3/images/google_gray.svg"
          alt="Google"
          className="h-3"
        />
        <span>Google Maps</span>
      </a>
    </div>
  );
}
