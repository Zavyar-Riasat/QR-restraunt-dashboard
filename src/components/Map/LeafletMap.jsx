import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import {
  TILE_URL,
  ATTRIBUTION,
  DEFAULT_MAP_ZOOM,
  DEFAULT_FALLBACK_COORDS,
} from '../../config/mapConfig';

// Fix Leaflet's default icon path issues in bundlers / React / Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
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
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const activeLat = center?.lat ?? DEFAULT_FALLBACK_COORDS.lat;
  const activeLng = center?.lng ?? DEFAULT_FALLBACK_COORDS.lng;

  // Initialize Map
  useEffect(() => {
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

    // Standard OpenStreetMap tiles with required attribution
    L.tileLayer(TILE_URL, {
      attribution: ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    // Marker
    const marker = L.marker([activeLat, activeLng], {
      draggable,
      autoPan: true,
    }).addTo(map);

    if (popupText) {
      marker.bindPopup(popupText);
    }

    if (draggable && onLocationChange) {
      marker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        onLocationChange({ lat: pos.lat, lng: pos.lng });
      });

      // Also allow clicking anywhere on map to reposition marker
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        onLocationChange({ lat, lng });
      });
    }

    mapInstanceRef.current = map;
    markerRef.current = marker;

    // Invalidate size to ensure tiles render immediately in dynamic or modal containers
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Update map view & marker when center coordinates change externally
  useEffect(() => {
    const map = mapInstanceRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    const currentLatLng = marker.getLatLng();
    const dist = Math.hypot(currentLatLng.lat - activeLat, currentLatLng.lng - activeLng);

    // Only update if position changed significantly (> 0.00005 deg ~ 5m)
    if (dist > 0.00005) {
      marker.setLatLng([activeLat, activeLng]);
      map.flyTo([activeLat, activeLng], zoom, { duration: 0.8 });
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

  return (
    <div
      ref={mapContainerRef}
      style={{ height, width: '100%' }}
      className={`rounded-xl overflow-hidden relative shadow-inner z-0 ${className}`}
    />
  );
}
