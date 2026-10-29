import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import {
  GOOGLE_MAPS_TILE_URL,
  GOOGLE_MAPS_SUBDOMAINS,
  GOOGLE_MAPS_ATTRIBUTION,
} from '../../config/mapConfig.js';
import {
  MapPin,
  Navigation,
  Search,
  X,
  ArrowLeft,
  Check,
  AlertCircle,
  } from 'lucide-react';

const modalPinIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [26, 42],
  iconAnchor: [13, 42],
  popupAnchor: [1, -36],
  shadowSize: [38, 38],
});

export const POPULAR_PAKISTAN_AREAS = [
  { name: 'Near Safa Gold Mall, Islamabad', city: 'Islamabad', lat: 33.721, lng: 73.052 },
  { name: 'F-7 Markaz, Islamabad', city: 'Islamabad', lat: 33.7215, lng: 73.0523 },
  { name: 'Blue Area, Islamabad', city: 'Islamabad', lat: 33.7182, lng: 73.0564 },
  { name: 'F-10 Markaz, Islamabad', city: 'Islamabad', lat: 33.6992, lng: 73.0189 },
  { name: 'Johar Town, Lahore', city: 'Lahore', lat: 31.4697, lng: 74.2728 },
  { name: 'Gulberg III, Lahore', city: 'Lahore', lat: 31.5126, lng: 74.3436 },
  { name: 'DHA Phase 5, Karachi', city: 'Karachi', lat: 24.8138, lng: 67.0673 },
  { name: 'Clifton Block 4, Karachi', city: 'Karachi', lat: 24.8211, lng: 67.0298 },
  { name: 'Saddar, Rawalpindi', city: 'Rawalpindi', lat: 33.5973, lng: 73.0544 },
];

export const PAKISTAN_MAJOR_CITIES = [
  { name: 'Faisalabad, Punjab', query: 'faisalabad', lat: 31.4187, lng: 73.0791 },
  { name: 'Lahore, Punjab', query: 'lahore', lat: 31.5204, lng: 74.3587 },
  { name: 'Karachi, Sindh', query: 'karachi', lat: 24.8607, lng: 67.0011 },
  { name: 'Islamabad, ICT', query: 'islamabad', lat: 33.6844, lng: 73.0479 },
  { name: 'Rawalpindi, Punjab', query: 'rawalpindi', lat: 33.5973, lng: 73.0544 },
  { name: 'Multan, Punjab', query: 'multan', lat: 30.1575, lng: 71.5249 },
  { name: 'Peshawar, KPK', query: 'peshawar', lat: 34.0151, lng: 71.5249 },
  { name: 'Quetta, Balochistan', query: 'quetta', lat: 30.1798, lng: 66.9750 },
  { name: 'Sialkot, Punjab', query: 'sialkot', lat: 32.4945, lng: 74.5229 },
  { name: 'Gujranwala, Punjab', query: 'gujranwala', lat: 32.1877, lng: 74.1945 },
  { name: 'Hyderabad, Sindh', query: 'hyderabad', lat: 25.3960, lng: 68.3578 },
  { name: 'Sargodha, Punjab', query: 'sargodha', lat: 32.0836, lng: 72.6711 },
  { name: 'Bahawalpur, Punjab', query: 'bahawalpur', lat: 29.3544, lng: 71.6911 },
  { name: 'Abbottabad, KPK', query: 'abbottabad', lat: 34.1688, lng: 73.2215 },
  { name: 'Gujrat, Punjab', query: 'gujrat', lat: 32.5744, lng: 74.0754 },
  { name: 'Mardan, KPK', query: 'mardan', lat: 34.1989, lng: 72.0404 },
  { name: 'Sukkur, Sindh', query: 'sukkur', lat: 27.7052, lng: 68.8574 },
  { name: 'Chakwal, Punjab', query: 'chakwal', lat: 32.9328, lng: 72.8630 },
  { name: 'Jhelum, Punjab', query: 'jhelum', lat: 32.9425, lng: 73.7257 },
  { name: 'Sahiwal, Punjab', query: 'sahiwal', lat: 30.6682, lng: 73.1114 },
  { name: 'Kasur, Punjab', query: 'kasur', lat: 31.1179, lng: 74.4408 },
  { name: 'Rahim Yar Khan, Punjab', query: 'rahim yar khan', lat: 28.4212, lng: 70.2989 },
  { name: 'Dera Ghazi Khan, Punjab', query: 'dera ghazi khan', lat: 30.0561, lng: 70.6348 },
  { name: 'Muzaffarabad, AJK', query: 'muzaffarabad', lat: 34.3597, lng: 73.4714 },
  { name: 'Mirpur, AJK', query: 'mirpur', lat: 33.1484, lng: 73.7519 },
  { name: 'Swat, KPK', query: 'swat', lat: 35.2227, lng: 72.4258 },
];

export default function CustomerLocationModal({
  isOpen,
  onClose,
  onLocationSelect,
  onSkip,
  initialView = 'prompt', // 'prompt' | 'manual'
  currentLocation = null,
}) {
  const [view, setView] = useState(initialView);
  const [isLocating, setIsLocating] = useState(false);
  const [permissionNote, setPermissionNote] = useState('');
  const [shareToast, setShareToast] = useState('');

  // Manual Map & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPin, setSelectedPin] = useState(() => ({
    lat: currentLocation?.lat ? Number(Number(currentLocation.lat).toFixed(3)) : 33.721,
    lng: currentLocation?.lng ? Number(Number(currentLocation.lng).toFixed(3)) : 73.052,
    name: currentLocation?.name || 'Near Safa Gold Mall, Islamabad',
  }));

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // Helper to smoothly fly map and reposition marker
  const applyLocationToMap = (lat, lng, name, zoom = 14) => {
    const rLat = Number(Number(lat).toFixed(3));
    const rLng = Number(Number(lng).toFixed(3));
    setSelectedPin({ lat: rLat, lng: rLng, name });

    if (mapRef.current) {
      mapRef.current.invalidateSize();
      if (markerRef.current) {
        markerRef.current.setLatLng([rLat, rLng]);
      } else {
        markerRef.current = L.marker([rLat, rLng], {
          icon: modalPinIcon,
          draggable: true,
        }).addTo(mapRef.current);
      }
      mapRef.current.flyTo([rLat, rLng], zoom, { duration: 0.8 });
    }
  };

  // Sync selectedPin with incoming currentLocation whenever modal opens or location changes
  useEffect(() => {
    if (isOpen && currentLocation?.lat && currentLocation?.lng) {
      setSelectedPin({
        lat: Number(Number(currentLocation.lat).toFixed(3)),
        lng: Number(Number(currentLocation.lng).toFixed(3)),
        name: currentLocation.name || 'Near Safa Gold Mall, Islamabad',
      });
    }
  }, [isOpen, currentLocation]);

  // Sync initial view
  useEffect(() => {
    if (isOpen) {
      setView(initialView);
      setPermissionNote('');
      setSearchResults([]);
    }
  }, [isOpen, initialView]);

  // Initialize interactive Leaflet map when switching to manual view
  useEffect(() => {
    if (!isOpen || view !== 'manual') return;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;
      if (mapRef.current) {
        mapRef.current.invalidateSize();
        return;
      }

      const map = L.map(mapContainerRef.current, {
        center: [selectedPin.lat, selectedPin.lng],
        zoom: 14,
        zoomControl: true,
        attributionControl: false,
      });

      // Google Maps standard roadmap tiles
      L.tileLayer(GOOGLE_MAPS_TILE_URL, {
        maxZoom: 20,
        subdomains: GOOGLE_MAPS_SUBDOMAINS,
        attribution: GOOGLE_MAPS_ATTRIBUTION,
      }).addTo(map);

      const marker = L.marker([selectedPin.lat, selectedPin.lng], {
        icon: modalPinIcon,
        draggable: true,
      }).addTo(map);

      marker.on('dragend', async (e) => {
        const pos = e.target.getLatLng();
        const rLat = Number(pos.lat.toFixed(3));
        const rLng = Number(pos.lng.toFixed(3));

        // Quick reverse lookup or placeholder
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${rLat}&lon=${rLng}&zoom=14`,
            { headers: { 'User-Agent': 'DineHQ/1.0' } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const suburb = addr.suburb || addr.neighbourhood || addr.city_district || addr.city || 'Nearby Area';
            setSelectedPin({ lat: rLat, lng: rLng, name: `${suburb}` });
            return;
          }
        } catch {
          // fallback
        }
        setSelectedPin((prev) => ({ ...prev, lat: rLat, lng: rLng }));
      });

      mapRef.current = map;
      markerRef.current = marker;
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isOpen, view]);

  // Handle "Allow Location" (Browser Geolocation API)
  const handleAllowLocation = () => {
    if (!navigator.geolocation) {
      setPermissionNote('Browser does not support geolocation. Please choose your area manually.');
      setView('manual');
      return;
    }

    setIsLocating(true);
    setPermissionNote('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        // Round to strictly 3 decimal places for privacy & query performance
        const roundedLat = Number(pos.coords.latitude.toFixed(3));
        const roundedLng = Number(pos.coords.longitude.toFixed(3));

        let detectedName = 'My Location';
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${roundedLat}&lon=${roundedLng}&zoom=14`,
            { headers: { 'User-Agent': 'DineHQ/1.0' } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const neighborhood =
              addr.suburb || addr.neighbourhood || addr.residential || addr.city_district;
            const city = addr.city || addr.town || addr.state || 'Pakistan';
            detectedName = neighborhood ? `${neighborhood}, ${city}` : city;
          }
        } catch (e) {
          console.warn('Reverse geocode note:', e);
        }

        onLocationSelect({
          name: detectedName,
          lat: roundedLat,
          lng: roundedLng,
          isGps: true,
        });
        onClose();
      },
      (err) => {
        setIsLocating(false);
        // If denied, timeout, or unavailable: smoothly show manual option instead of an error
        setPermissionNote(
          err.code === 1
            ? 'Location permission was denied. Select your neighborhood below to find nearby restaurants:'
            : 'Unable to detect GPS position. Please select or search your area below:'
        );
        setView('manual');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Handle Nominatim Manual Search with Instant Match & Auto Map Navigation
  const handleSearchAddress = async (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    // 1. Instant check in local Pakistani cities dictionary
    const cleanQ = query.toLowerCase();
    const matchedCity = PAKISTAN_MAJOR_CITIES.find(
      (c) => cleanQ.includes(c.query) || c.query.includes(cleanQ)
    );
    if (matchedCity) {
      applyLocationToMap(matchedCity.lat, matchedCity.lng, matchedCity.name, 13);
    }

    // 2. Query Nominatim for finer street / sector details
    try {
      setIsSearching(true);
      const q = encodeURIComponent(query);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${q}&countrycodes=pk&addressdetails=1&limit=5`,
        { headers: { 'User-Agent': 'DineHQ/1.0' } }
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data || []);
        if (data && data.length > 0) {
          // Automatically navigate map to the top match!
          const topMatch = data[0];
          const lat = Number(parseFloat(topMatch.lat).toFixed(3));
          const lng = Number(parseFloat(topMatch.lon).toFixed(3));
          const parts = topMatch.display_name.split(',');
          const shortName = parts.slice(0, 3).join(',').trim();
          applyLocationToMap(lat, lng, shortName, 14);
        }
      }
    } catch (e) {
      console.warn('Search error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  // Select Search Match
  const handleSelectMatch = (match) => {
    const lat = Number(parseFloat(match.lat).toFixed(3));
    const lng = Number(parseFloat(match.lon).toFixed(3));
    const parts = match.display_name.split(',');
    const shortName = parts.slice(0, 3).join(',').trim();

    applyLocationToMap(lat, lng, shortName, 14);
    setSearchQuery(shortName);
  };

  // Select Preset Popular Area
  const _handleSelectPreset = (area) => {
    applyLocationToMap(area.lat, area.lng, area.name, 14);
  };

  // Handle "Where I am now" detection using Geolocation API
  const handleDetectWhereIAmNow = () => {
    if (!navigator.geolocation) {
      setPermissionNote('Browser does not support geolocation. Please choose or drag the pin on map.');
      return;
    }

    setIsLocating(true);
    setPermissionNote('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        const rLat = Number(pos.coords.latitude.toFixed(3));
        const rLng = Number(pos.coords.longitude.toFixed(3));

        let detectedName = 'Where I Am Now';
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${rLat}&lon=${rLng}&zoom=14`,
            { headers: { 'User-Agent': 'DineHQ/1.0' } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const neighborhood =
              addr.suburb || addr.neighbourhood || addr.residential || addr.city_district;
            const city = addr.city || addr.town || addr.state || 'Pakistan';
            detectedName = neighborhood ? `${neighborhood}, ${city}` : city;
          }
        } catch (e) {
          console.warn('Reverse geocode note:', e);
        }

        applyLocationToMap(rLat, rLng, detectedName, 15);
        setShareToast('Location detected successfully!');
        setTimeout(() => setShareToast(''), 3000);
      },
      (err) => {
        setIsLocating(false);
        setPermissionNote(
          err.code === 1
            ? 'Location permission was denied. Please allow location access in your browser or drag the map pin.'
            : 'Unable to detect GPS position. Please drag the pin on map or select a preset area.'
        );
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Handle Sharing current location (Where I am now)
  const _handleShareCurrentLocation = async (customCoords = null) => {
    const lat = customCoords?.lat || selectedPin.lat;
    const lng = customCoords?.lng || selectedPin.lng;
    const name = customCoords?.name || selectedPin.name || 'My Location';
    const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    const shareText = `📍 Here is where I am now: ${name}\nGoogle Maps: ${mapUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Delivery Location',
          text: `My delivery location: ${name}`,
          url: mapUrl,
        });
        setShareToast('Location shared successfully!');
        setTimeout(() => setShareToast(''), 3000);
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Web Share API error:', err);
        }
      }
    }

    // Fallback: Copy map link to clipboard
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareText);
        setShareToast('Location link copied to clipboard!');
        setTimeout(() => setShareToast(''), 3500);
        return;
      } catch (e) {
        console.warn('Clipboard write error:', e);
      }
    }

    // Secondary fallback: WhatsApp share
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  // Confirm Manual Selection
  const handleConfirmManual = () => {
    onLocationSelect({
      name: selectedPin.name,
      lat: Number(selectedPin.lat.toFixed(3)),
      lng: Number(selectedPin.lng.toFixed(3)),
      isGps: false,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl border border-[#F0E4D7] shadow-2xl max-w-lg w-full overflow-hidden transition-all">
        {/* ========================================================
            VIEW 1: Friendly Initial Prompt
            ======================================================== */}
        {view === 'prompt' && (
          <div className="p-6 sm:p-8 text-center space-y-5">
            {/* Friendly Map-Pin Illustration Icon */}
            <div className="relative w-20 h-20 mx-auto">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#F26B1D] to-[#F5A623] flex items-center justify-center text-white shadow-xl shadow-[#F26B1D]/30 transform -rotate-3 hover:rotate-0 transition">
                <MapPin className="w-10 h-10" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-white text-emerald-600 flex items-center justify-center shadow-md border border-[#F0E4D7]">
                <Navigation className="w-4 h-4 text-emerald-600" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-heading font-extrabold text-[#2B2118] tracking-tight">
                Find restaurants near you
              </h3>
              <p className="text-xs sm:text-sm text-[#7A6A5C] max-w-sm mx-auto leading-relaxed">
                Allow location so we can show the closest restaurants, accurate delivery fees, and live prep times.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              {/* Primary: Allow Location */}
              <button
                type="button"
                onClick={handleAllowLocation}
                disabled={isLocating}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-sm font-bold shadow-lg shadow-[#F26B1D]/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLocating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Detecting Your Location...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4" />
                    <span>Use Where I Am Now (Allow GPS)</span>
                  </>
                )}
              </button>

              {/* Secondary: Enter Area Manually */}
              <button
                type="button"
                onClick={() => setView('manual')}
                className="w-full py-3 px-4 rounded-2xl bg-[#FFF9F2] hover:bg-[#FFF1E6] text-[#2B2118] border border-[#F0E4D7] text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <Search className="w-4 h-4 text-[#F26B1D]" />
                <span>Enter Area Manually</span>
              </button>

              {/* Tertiary: Skip for now */}
              <button
                type="button"
                onClick={() => {
                  onSkip();
                  onClose();
                }}
                className="w-full py-2 text-xs font-bold text-[#9E8E81] hover:text-[#2B2118] transition cursor-pointer"
              >
                Skip for now
              </button>
            </div>

            <p className="text-[10px] text-[#9E8E81]">
              🔒 Coordinates are rounded to 3 decimals and never stored without your account permission.
            </p>
          </div>
        )}

        {/* ========================================================
            VIEW 2: Manual Area Search & Map Pin Selection
            ======================================================== */}
        {view === 'manual' && (
          <div className="p-5 sm:p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#F0E4D7]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setView('prompt')}
                  className="p-1.5 rounded-lg text-[#7A6A5C] hover:text-[#2B2118] hover:bg-[#FFF9F2] transition cursor-pointer"
                  title="Back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h3 className="font-heading font-extrabold text-base text-[#2B2118]">
                    Choose Delivery Location
                  </h3>
                  <p className="text-[11px] text-[#7A6A5C]">
                    Search any area in Pakistan or drag the pin on the map
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#9E8E81] hover:text-[#2B2118] hover:bg-[#FFF9F2] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Graceful Permission Note */}
            {permissionNote && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{permissionNote}</span>
              </div>
            )}

            {/* Nominatim Search Input */}
            <form onSubmit={handleSearchAddress} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#7A6A5C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search sector, neighborhood, or city (Pakistan)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FFF9F2]/50 border border-[#F0E4D7] text-xs font-medium text-[#2B2118] placeholder-[#9E8E81] focus:outline-none focus:ring-2 focus:ring-[#F26B1D] focus:bg-white transition"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="px-3.5 py-2 rounded-xl bg-[#2B2118] hover:bg-[#F26B1D] text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isSearching ? '...' : 'Search'}
              </button>
            </form>

            {/* Dedicated Separate Option: Where I Am Now & Share Location */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-[#FFF1E6] via-[#FFF9F2] to-[#FFF1E6] border border-[#FCD8BF] flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#F26B1D] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-heading font-extrabold text-[#2B2118]">
                      Where I am now
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Live GPS
                    </span>
                  </div>
                  <p className="text-[11px] text-[#7A6A5C] truncate">
                    Detect exact location & pin on map
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  id="btn-detect-where-i-am"
                  onClick={handleDetectWhereIAmNow}
                  disabled={isLocating}
                  className="px-3 py-1.5 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                  title="Detect and use where I am now"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{isLocating ? 'Locating...' : 'Use GPS'}</span>
                </button>
              </div>
            </div>

            {/* Share / Detection Toast Notification */}
            {shareToast && (
              <div className="p-2.5 rounded-xl bg-[#E7F6EC] border border-[#C0E9CE] text-[#1F9D55] text-xs font-bold flex items-center gap-2 animate-fadeIn">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>{shareToast}</span>
              </div>
            )}

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#F0E4D7] shadow-md p-1.5 space-y-1 max-h-40 overflow-y-auto animate-fadeIn">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#9E8E81] flex items-center justify-between">
                  <span>Matches in Pakistan:</span>
                  <span className="text-[#1F9D55] font-extrabold flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>Map Focused</span>
                  </span>
                </div>
                {searchResults.map((m, i) => {
                  const mLat = Number(parseFloat(m.lat).toFixed(3));
                  const mLng = Number(parseFloat(m.lon).toFixed(3));
                  const isCurrent = Math.abs(selectedPin.lat - mLat) < 0.02 && Math.abs(selectedPin.lng - mLng) < 0.02;

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectMatch(m)}
                      className={`w-full text-left p-2 rounded-xl transition text-xs flex items-center justify-between gap-2 cursor-pointer ${
                        isCurrent
                          ? 'bg-[#FFF1E6] border border-[#F26B1D] text-[#2B2118] font-bold shadow-2xs'
                          : 'hover:bg-[#FFF9F2] text-[#7A6A5C] border border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-[#F26B1D] shrink-0 mt-0.5" />
                        <span className="truncate">{m.display_name}</span>
                      </div>
                      {isCurrent && (
                        <span className="shrink-0 text-[10px] text-[#1F9D55] font-extrabold bg-[#E7F6EC] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>On Map</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Small Interactive Google Map with Draggable Pin */}
            <div className="relative rounded-2xl overflow-hidden border border-[#F0E4D7] shadow-xs">
              <div ref={mapContainerRef} style={{ height: '180px' }} className="w-full z-0" />
              <div className="absolute top-2 right-2 z-10 pointer-events-none">
                <span className="px-2 py-0.5 rounded-lg bg-black/70 text-white text-[10px] font-bold">
                  Drag pin to adjust
                </span>
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${selectedPin.lat},${selectedPin.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-2 left-2 z-10 px-2.5 py-1 rounded-md bg-white/95 hover:bg-white text-[10px] font-bold text-[#1A73E8] border border-slate-200 shadow-xs flex items-center gap-1.5 transition select-none"
                title="View in Google Maps"
              >
                <img
                  src="https://maps.gstatic.com/mapfiles/api-3/images/google_gray.svg"
                  alt="Google"
                  className="h-3.5"
                />
                <span>Google Maps</span>
              </a>
            </div>

            {/* Selected Location Display */}
            <div className="p-3 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] flex items-center justify-between text-xs">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] uppercase font-bold text-[#7A6A5C] block">
                  Delivering to:
                </span>
                <span className="font-bold text-[#2B2118] truncate block">
                  {selectedPin.name}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-[10px] text-[#9E8E81] hidden sm:inline">
                  {selectedPin.lat}, {selectedPin.lng}
                </span>
              </div>
            </div>

            {/* Confirm Button */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F0E4D7]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[#F0E4D7] text-xs font-bold text-[#7A6A5C] hover:bg-[#FFF9F2] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmManual}
                className="px-5 py-2 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs font-bold shadow-md shadow-[#F26B1D]/20 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Confirm Location</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
