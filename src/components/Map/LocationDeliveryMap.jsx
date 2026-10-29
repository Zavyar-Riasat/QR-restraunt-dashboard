import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from '../../lib/leafletGeoman.js';
import {
  MapPin,
  Search,
  Navigation,
  RotateCcw,
  Undo2,
  
  PenTool,
  
  AlertCircle,
  Compass,
  
} from 'lucide-react';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import {
  
  calculatePolygonAreaKm2,
  generatePresetPolygon,
} from '../../utils/geoValidation';
import {
  GOOGLE_MAPS_TILE_URL,
  GOOGLE_MAPS_SUBDOMAINS,
  GOOGLE_MAPS_ATTRIBUTION,
} from '../../config/mapConfig';

// Default coordinates for Islamabad, Pakistan
const DEFAULT_CENTER = { lat: 33.72148, lng: 73.05232 };

const defaultPinIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [28, 44],
  iconAnchor: [14, 44],
  popupAnchor: [1, -38],
  shadowSize: [41, 41],
});

// Vertex icon for draggable polygon corner handles
const createVertexIcon = (index) => {
  return L.divIcon({
    className: 'custom-polygon-vertex',
    html: `
      <div style="
        width: 18px;
        height: 18px;
        background: #F26B1D;
        border: 2.5px solid #FFFFFF;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        cursor: move;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 9px;
        font-weight: 800;
        color: #FFFFFF;
        font-family: monospace;
      ">
        ${index + 1}
      </div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
};

export default function LocationDeliveryMap({
  restaurantLocation = DEFAULT_CENTER,
  onLocationChange,
  deliveryMode = 'radius', // 'radius' | 'polygon'
  radiusKm = 5,
  polygonCoords = [],
  onPolygonChange,
  onAddressSelect,
  className = '',
  height = '420px',
  interactive = true,
  isDrawingActiveProp = false,
  onDrawingActiveChange,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  // Polygon layers & drawing refs
  const polygonLayerRef = useRef(null);
  const vertexMarkersRef = useRef([]);
  const activeDrawLineRef = useRef(null);
  const tempMarkersRef = useRef([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState('');

  // Interactive drawing states
  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const [tempPoints, setTempPoints] = useState([]);
  const [polygonHistory, setPolygonHistory] = useState([]);

  const activeLat = Number(restaurantLocation?.lat ?? DEFAULT_CENTER.lat);
  const activeLng = Number(restaurantLocation?.lng ?? DEFAULT_CENTER.lng);

  // Notify parent of drawing active state changes
  const updateDrawingState = useCallback(
    (active) => {
      setIsDrawingActive(active);
      if (onDrawingActiveChange) onDrawingActiveChange(active);
    },
    [onDrawingActiveChange]
  );

  // Drawing Controls Handlers (declared before effects that invoke them)
  const startInteractiveDrawing = useCallback(() => {
    updateDrawingState(true);
    setTempPoints([]);

    // Also trigger Geoman draw if available as a companion
    if (mapRef.current?.pm) {
      try {
        mapRef.current.pm.enableDraw('Polygon');
      } catch {}
    }
  }, [updateDrawingState]);

  const finishInteractiveDrawing = useCallback(
    (pointsToCommit = tempPoints) => {
      if (pointsToCommit.length < 3) {
        setGeoError('Please click at least 3 points on the map to form a boundary.');
        return;
      }

      if (mapRef.current?.pm) {
        try {
          mapRef.current.pm.disableDraw();
        } catch {}
      }

      setPolygonHistory((prev) => [...prev, pointsToCommit]);
      if (onPolygonChange) onPolygonChange(pointsToCommit);
      setTempPoints([]);
      updateDrawingState(false);
      setGeoError('');
    },
    [tempPoints, onPolygonChange, updateDrawingState]
  );

  const cancelInteractiveDrawing = useCallback(() => {
    if (mapRef.current?.pm) {
      try {
        mapRef.current.pm.disableDraw();
      } catch {}
    }
    setTempPoints([]);
    updateDrawingState(false);
    setGeoError('');
  }, [updateDrawingState]);

  // Sync prop changes for drawing mode if controlled from outside
  useEffect(() => {
    if (typeof isDrawingActiveProp === 'boolean' && isDrawingActiveProp !== isDrawingActive) {
      if (isDrawingActiveProp) {
        startInteractiveDrawing();
      } else {
        cancelInteractiveDrawing();
      }
    }
  }, [isDrawingActiveProp, isDrawingActive, startInteractiveDrawing, cancelInteractiveDrawing]);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [activeLat, activeLng],
      zoom: 13,
      scrollWheelZoom: interactive ? 'center' : false,
      zoomControl: interactive,
      attributionControl: true,
    });

    // Google Maps Tile Layer
    L.tileLayer(GOOGLE_MAPS_TILE_URL, {
      maxZoom: 20,
      subdomains: GOOGLE_MAPS_SUBDOMAINS,
      attribution: GOOGLE_MAPS_ATTRIBUTION,
    }).addTo(map);

    // Draggable Restaurant Pin
    const marker = L.marker([activeLat, activeLng], {
      icon: defaultPinIcon,
      draggable: interactive,
      title: 'Restaurant Location (Drag to reposition)',
      zIndexOffset: 1000,
    }).addTo(map);

    marker.bindPopup('<b>Store Location</b><br/>Drag pin to adjust precise restaurant location.');

    marker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      const updated = { lat: Number(pos.lat.toFixed(6)), lng: Number(pos.lng.toFixed(6)) };
      if (onLocationChange) onLocationChange(updated);
    });

    // Configure Geoman if attached
    if (map.pm) {
      try {
        map.pm.setLang('en');
        map.pm.setGlobalOptions({
          snappable: true,
          snapDistance: 18,
          allowSelfIntersection: false,
          pathOptions: {
            color: '#F26B1D',
            fillColor: '#F26B1D',
            fillOpacity: 0.22,
            weight: 2.5,
          },
        });

        // Geoman event when user finishes drawing a polygon
        map.on('pm:create', (e) => {
          if (e.shape === 'Polygon' || e.layer instanceof L.Polygon) {
            const rawLatLngs = e.layer.getLatLngs();
            const rings = Array.isArray(rawLatLngs[0]) ? rawLatLngs[0] : rawLatLngs;
            const coords = rings.map((pt) => ({
              lat: Number(pt.lat.toFixed(6)),
              lng: Number(pt.lng.toFixed(6)),
            }));

            // Remove temporary Geoman layer; our component renders it with unified handles
            map.removeLayer(e.layer);

            setPolygonHistory((prev) => [...prev, coords]);
            if (onPolygonChange) onPolygonChange(coords);
            updateDrawingState(false);
          }
        });
      } catch (err) {
        console.warn('Geoman toolbar init warning:', err);
      }
    }

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
  }, []);

  // 2. Update marker position when restaurantLocation changes
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    const currentPos = markerRef.current.getLatLng();
    if (
      Math.abs(currentPos.lat - activeLat) > 1e-6 ||
      Math.abs(currentPos.lng - activeLng) > 1e-6
    ) {
      markerRef.current.setLatLng([activeLat, activeLng]);
      mapRef.current.panTo([activeLat, activeLng]);
    }
  }, [activeLat, activeLng]);

  // 3. Update Circular Radius in Radius Mode
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (deliveryMode === 'radius') {
      const radiusMeters = Number(radiusKm || 5) * 1000;

      if (!circleRef.current) {
        circleRef.current = L.circle([activeLat, activeLng], {
          radius: radiusMeters,
          color: '#F26B1D',
          weight: 2.5,
          fillColor: '#F26B1D',
          fillOpacity: 0.15,
          dashArray: '5, 5',
        }).addTo(map);
      } else {
        circleRef.current.setLatLng([activeLat, activeLng]);
        circleRef.current.setRadius(radiusMeters);
      }
    } else {
      if (circleRef.current) {
        map.removeLayer(circleRef.current);
        circleRef.current = null;
      }
    }
  }, [deliveryMode, radiusKm, activeLat, activeLng]);

  // 4. Render Completed Polygon & Draggable Vertex Corner Handles
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Clear previous polygon and vertex markers
    if (polygonLayerRef.current) {
      map.removeLayer(polygonLayerRef.current);
      polygonLayerRef.current = null;
    }
    vertexMarkersRef.current.forEach((vm) => map.removeLayer(vm));
    vertexMarkersRef.current = [];

    // If not in polygon mode or actively drawing, do not render static polygon
    if (deliveryMode !== 'polygon' || isDrawingActive) {
      return;
    }

    if (Array.isArray(polygonCoords) && polygonCoords.length >= 3) {
      const latlngs = polygonCoords.map((pt) => [pt.lat, pt.lng]);

      // Main shaded polygon
      const poly = L.polygon(latlngs, {
        color: '#F26B1D',
        fillColor: '#F26B1D',
        fillOpacity: 0.22,
        weight: 2.5,
      }).addTo(map);
      polygonLayerRef.current = poly;

      // Draggable vertex handles for each point
      polygonCoords.forEach((pt, index) => {
        const vMarker = L.marker([pt.lat, pt.lng], {
          icon: createVertexIcon(index),
          draggable: true,
          zIndexOffset: 500,
        }).addTo(map);

        vMarker.bindTooltip(`Point #${index + 1}: Drag to adjust boundary corner`, {
          direction: 'top',
          offset: [0, -8],
        });

        // Real-time polygon redraw while dragging vertex
        vMarker.on('drag', (e) => {
          const newPos = e.target.getLatLng();
          const currentLatLngs = poly.getLatLngs();
          const rings = Array.isArray(currentLatLngs[0]) ? currentLatLngs[0] : currentLatLngs;
          rings[index] = newPos;
          poly.setLatLngs(rings);
        });

        // Commit coordinates when dragging ends
        vMarker.on('dragend', (e) => {
          const newPos = e.target.getLatLng();
          const updatedCoords = [...polygonCoords];
          updatedCoords[index] = {
            lat: Number(newPos.lat.toFixed(6)),
            lng: Number(newPos.lng.toFixed(6)),
          };
          setPolygonHistory((prev) => [...prev, updatedCoords]);
          if (onPolygonChange) onPolygonChange(updatedCoords);
        });

        vertexMarkersRef.current.push(vMarker);
      });
    }
  }, [deliveryMode, polygonCoords, isDrawingActive, onPolygonChange]);

  // 5. Interactive Click-to-Draw Polygon Mechanism
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (!isDrawingActive) {
      map.getContainer().style.cursor = '';
      return;
    }

    map.getContainer().style.cursor = 'crosshair';

    const handleMapClick = (e) => {
      const newPt = {
        lat: Number(e.latlng.lat.toFixed(6)),
        lng: Number(e.latlng.lng.toFixed(6)),
      };

      setTempPoints((prev) => {
        // If clicking near first point and we already have at least 3 points, complete polygon!
        if (prev.length >= 3) {
          const first = prev[0];
          const distMeters = map.distance([newPt.lat, newPt.lng], [first.lat, first.lng]);
          if (distMeters < 80) {
            // Finish drawing
            setTimeout(() => {
              finishInteractiveDrawing(prev);
            }, 50);
            return prev;
          }
        }
        return [...prev, newPt];
      });
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [isDrawingActive]);

  // 6. Render Temporary Points and Connecting Line During Drawing
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Clear previous temporary drawing layers
    if (activeDrawLineRef.current) {
      map.removeLayer(activeDrawLineRef.current);
      activeDrawLineRef.current = null;
    }
    tempMarkersRef.current.forEach((m) => map.removeLayer(m));
    tempMarkersRef.current = [];

    if (!isDrawingActive || tempPoints.length === 0) return;

    // Render numbered markers for each placed point
    tempPoints.forEach((pt, idx) => {
      const isFirst = idx === 0;
      const marker = L.marker([pt.lat, pt.lng], {
        icon: L.divIcon({
          className: 'temp-draw-vertex',
          html: `
            <div style="
              width: ${isFirst && tempPoints.length >= 3 ? '24px' : '20px'};
              height: ${isFirst && tempPoints.length >= 3 ? '24px' : '20px'};
              background: ${isFirst && tempPoints.length >= 3 ? '#10B981' : '#F26B1D'};
              border: 2.5px solid #FFFFFF;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.45);
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              font-weight: 900;
              color: #FFFFFF;
              animation: ${isFirst && tempPoints.length >= 3 ? 'pulse 1.5s infinite' : 'none'};
            ">
              ${isFirst && tempPoints.length >= 3 ? '✓' : idx + 1}
            </div>
          `,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        }),
        zIndexOffset: 1200,
      }).addTo(map);

      if (isFirst && tempPoints.length >= 3) {
        marker.bindTooltip('Click here to close & complete polygon!', {
          permanent: true,
          direction: 'top',
          offset: [0, -10],
        });
        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          finishInteractiveDrawing(tempPoints);
        });
      }

      tempMarkersRef.current.push(marker);
    });

    // Draw connecting lines
    const latlngs = tempPoints.map((p) => [p.lat, p.lng]);
    if (tempPoints.length >= 3) {
      // Show closed polygon preview
      activeDrawLineRef.current = L.polygon(latlngs, {
        color: '#F26B1D',
        fillColor: '#F26B1D',
        fillOpacity: 0.25,
        weight: 2.5,
        dashArray: '6, 6',
      }).addTo(map);
    } else {
      // Show polyline
      activeDrawLineRef.current = L.polyline(latlngs, {
        color: '#F26B1D',
        weight: 3,
        dashArray: '6, 6',
      }).addTo(map);
    }
  }, [isDrawingActive, tempPoints, finishInteractiveDrawing]);

  const undoLastDrawingPoint = () => {
    setTempPoints((prev) => prev.slice(0, -1));
  };

  const handleGeneratePresetBoundary = (presetKm = 5) => {
    const preset = generatePresetPolygon(activeLat, activeLng, presetKm, 6);
    setPolygonHistory((prev) => [...prev, preset]);
    if (onPolygonChange) onPolygonChange(preset);
    updateDrawingState(false);
    setTempPoints([]);
    setGeoError('');

    // Fit map bounds to show generated area
    if (mapRef.current && preset.length > 0) {
      const bounds = L.latLngBounds(preset.map((p) => [p.lat, p.lng]));
      mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  };

  const handleResetPolygon = () => {
    cancelInteractiveDrawing();
    setPolygonHistory([]);
    if (onPolygonChange) onPolygonChange([]);
  };

  const handleUndoPolygon = () => {
    if (isDrawingActive) {
      undoLastDrawingPoint();
      return;
    }
    if (polygonHistory.length > 1) {
      const nextHistory = [...polygonHistory];
      nextHistory.pop();
      const prevCoords = nextHistory[nextHistory.length - 1];
      setPolygonHistory(nextHistory);
      if (onPolygonChange) onPolygonChange(prevCoords);
    } else {
      handleResetPolygon();
    }
  };

  // Address Search via Nominatim
  const handleAddressSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      setSearchError('');
      setSearchResults([]);

      const encodedQuery = encodeURIComponent(searchQuery.trim());
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&countrycodes=pk&addressdetails=1&limit=5`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'DineHQ-Marketplace-Admin/1.0',
          },
        }
      );

      if (!response.ok) throw new Error('Search service temporarily unavailable.');

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        setSearchError('No matching locations found in Pakistan. Try adding city name (e.g. "F-7 Islamabad").');
      } else {
        setSearchResults(data);
      }
    } catch (err) {
      setSearchError(err.message || 'Failed to search address.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result) => {
    const newLat = parseFloat(result.lat);
    const newLng = parseFloat(result.lon);

    if (mapRef.current && markerRef.current) {
      markerRef.current.setLatLng([newLat, newLng]);
      mapRef.current.setView([newLat, newLng], 15);
    }

    if (onLocationChange) {
      onLocationChange({ lat: Number(newLat.toFixed(6)), lng: Number(newLng.toFixed(6)) });
    }

    if (onAddressSelect) {
      const addrObj = result.address || {};
      const area =
        addrObj.suburb ||
        addrObj.neighbourhood ||
        addrObj.residential ||
        addrObj.quarter ||
        addrObj.commercial ||
        '';
      const city = addrObj.city || addrObj.town || addrObj.state_district || addrObj.state || 'Islamabad';

      onAddressSelect({
        address: result.display_name,
        area: area || searchQuery,
        city,
        latitude: newLat,
        longitude: newLng,
      });
    }

    setSearchResults([]);
    setSearchQuery(result.display_name.split(',')[0]);
  };

  // GPS Device Detection
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setGeoError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));

        if (mapRef.current && markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
          mapRef.current.setView([lat, lng], 15);
        }

        if (onLocationChange) {
          onLocationChange({ lat, lng });
        }
        setIsLocating(false);
      },
      (_err) => {
        setIsLocating(false);
        setGeoError('Unable to detect location. Please allow GPS permission in your browser.');
      },
      { timeout: 9000, enableHighAccuracy: true }
    );
  };

  const polygonArea =
    deliveryMode === 'polygon' && Array.isArray(polygonCoords) && polygonCoords.length >= 3
      ? calculatePolygonAreaKm2(polygonCoords)
      : null;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Top Controls: Nominatim Search & GPS Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <form onSubmit={handleAddressSearch} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#7A6A5C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search address / sector in Pakistan (e.g. F-7 Markaz, Blue Area)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#F0E4D7] text-xs font-medium text-[#2B2118] placeholder-[#9E8E81] focus:outline-none focus:ring-2 focus:ring-[#F26B1D] shadow-2xs"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="px-3.5 py-2 rounded-xl bg-[#2B2118] hover:bg-[#F26B1D] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 shadow-2xs"
          >
            {isSearching ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            <span>Search</span>
          </button>
        </form>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          className="px-3.5 py-2 rounded-xl bg-[#FFF1E6] hover:bg-[#FFE6D4] text-[#F26B1D] border border-[#FCD8BF] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-2xs disabled:opacity-50"
          title="Detect GPS location of current device"
        >
          {isLocating ? (
            <span className="w-3.5 h-3.5 border-2 border-[#F26B1D] border-t-transparent rounded-full animate-spin" />
          ) : (
            <Navigation className="w-3.5 h-3.5" />
          )}
          <span>Use My GPS</span>
        </button>
      </div>

      {/* Nominatim Search Results Dropdown */}
      {searchResults.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#F0E4D7] shadow-lg p-2 space-y-1 animate-fadeIn max-h-52 overflow-y-auto">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#7A6A5C]">
            Select Location in Pakistan:
          </div>
          {searchResults.map((res, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectSearchResult(res)}
              className="w-full text-left p-2 rounded-xl hover:bg-[#FFF1E6] transition flex items-start gap-2 text-xs text-[#2B2118] cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-[#F26B1D] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-bold truncate">{res.display_name.split(',')[0]}</p>
                <p className="text-[11px] text-[#7A6A5C] truncate">{res.display_name}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Feedback Messages */}
      {searchError && (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{searchError}</span>
        </div>
      )}

      {geoError && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{geoError}</span>
        </div>
      )}

      {/* Polygon Drawing Toolbar (Visible when in polygon mode) */}
      {deliveryMode === 'polygon' && (
        <div className="p-3 rounded-2xl bg-[#FFF9F2] border border-[#FCD8BF] shadow-xs flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={isDrawingActive ? () => finishInteractiveDrawing() : startInteractiveDrawing}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                isDrawingActive
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-[#F26B1D] text-white hover:bg-[#D95A12]'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>
                {isDrawingActive
                  ? tempPoints.length >= 3
                    ? `Finish Drawing (${tempPoints.length} points)`
                    : 'Click Map to Add Points...'
                  : polygonCoords.length >= 3
                  ? 'Redraw Boundary'
                  : 'Draw Boundary Polygon'}
              </span>
            </button>

            {/* 1-Click Preset Area Generator */}
            <button
              type="button"
              onClick={() => handleGeneratePresetBoundary(5)}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FFF1E6] text-[#2B2118] border border-[#F0E4D7] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs hover:border-[#F26B1D]"
              title="Instantly generate a 5 km hexagon area around restaurant"
            >
              <span>Generate 5 km Area</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {(polygonCoords.length > 0 || tempPoints.length > 0) && (
              <button
                type="button"
                onClick={handleUndoPolygon}
                className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#FFF1E6] text-[#7A6A5C] hover:text-[#2B2118] border border-[#F0E4D7] text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                title="Undo last point"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Undo</span>
              </button>
            )}

            {(polygonCoords.length > 0 || tempPoints.length > 0) && (
              <button
                type="button"
                onClick={handleResetPolygon}
                className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                title="Clear boundary"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Map Container */}
      <div
        id="location-map-container"
        className={`relative rounded-3xl overflow-hidden border-2 transition-all shadow-sm ${
          isDrawingActive
            ? 'border-[#F26B1D] ring-4 ring-[#F26B1D]/20'
            : 'border-[#F0E4D7]'
        }`}
      >
        <div
          ref={mapContainerRef}
          style={{ height }}
          className="w-full z-0 font-sans"
        />

        {/* Floating Top Banner when Drawing is Active */}
        {isDrawingActive && (
          <div className="absolute top-3 left-3 right-3 sm:left-auto sm:right-auto sm:left-1/2 sm:-translate-x-1/2 z-30 bg-[#2B2118]/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center justify-between sm:justify-start gap-3 border border-[#F26B1D] animate-in fade-in">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F26B1D] animate-ping shrink-0" />
              <div>
                <span className="font-extrabold text-[#F26B1D]">Click map to plot: </span>
                <span className="text-slate-200">
                  {tempPoints.length === 0
                    ? 'Click anywhere to place Corner #1'
                    : tempPoints.length < 3
                    ? `${tempPoints.length} corners placed. Add ${3 - tempPoints.length} more.`
                    : `${tempPoints.length} corners. Click Point #1 or Finish.`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {tempPoints.length >= 3 && (
                <button
                  type="button"
                  onClick={() => finishInteractiveDrawing()}
                  className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition shadow-xs"
                >
                  ✓ Finish
                </button>
              )}
              {tempPoints.length > 0 && (
                <button
                  type="button"
                  onClick={undoLastDrawingPoint}
                  className="px-2 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-medium cursor-pointer transition"
                >
                  Undo
                </button>
              )}
              <button
                type="button"
                onClick={cancelInteractiveDrawing}
                className="px-2 py-1 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-medium cursor-pointer transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Floating Coverage Summary Badge */}
        <div className="absolute bottom-3 left-3 z-20 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-[#F0E4D7] shadow-md flex items-center gap-2 text-xs font-bold text-[#2B2118]">
            <Compass className="w-4 h-4 text-[#F26B1D]" />
            {deliveryMode === 'radius' ? (
              <span>Delivers within {radiusKm || 5} km circular radius</span>
            ) : isDrawingActive ? (
              <span className="text-[#F26B1D]">
                Plotting boundary... ({tempPoints.length} points)
              </span>
            ) : polygonArea ? (
              <span className="text-emerald-800">
                Custom Polygon Active: {polygonCoords.length} corners (~{polygonArea} km² covered)
              </span>
            ) : (
              <span className="text-amber-800">
                No boundary drawn yet. Click "Draw Boundary" or "Generate 5 km Area"
              </span>
            )}
          </div>
        </div>

        {/* Pin Repositioning Hint */}
        <div className="absolute top-3 right-3 z-20 pointer-events-none hidden sm:block">
          <div className="bg-[#2B2118]/80 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-xs flex items-center gap-1">
            <MapPin className="w-3 h-3 text-[#F26B1D]" />
            <span>Store Pin is Draggable</span>
          </div>
        </div>

        {/* Google Maps Quick Link */}
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${activeLat},${activeLng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2.5 right-2.5 z-20 px-2.5 py-1 rounded-md bg-white/95 hover:bg-white text-[11px] font-bold text-[#1A73E8] border border-slate-200 shadow-xs flex items-center gap-1.5 transition select-none"
          title="Open in Google Maps"
        >
          <img
            src="https://maps.gstatic.com/mapfiles/api-3/images/google_gray.svg"
            alt="Google"
            className="h-3.5"
          />
          <span>Google Maps</span>
        </a>
      </div>
    </div>
  );
}
