import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import {
  Navigation,
  MapPin,
  Search,
  ExternalLink,
  Check,
  AlertCircle,
  X,
  Compass,
  Home,
  Building,
  FileText,
  Copy,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { geocodeService } from '../services/geocodeService.js';
import {
  buildGoogleMapsNavUrl,
  buildOsmNavUrl,
  buildShareableLocationLink,
  DEFAULT_FALLBACK_COORDS,
  DEFAULT_MAP_ZOOM,
} from '../config/mapConfig.js';

import LeafletMap from './Map/LeafletMap.jsx';

export default function DeliveryLocationPicker({
  locationData = {
    latitude: null,
    longitude: null,
    accuracy: null,
    formattedAddress: '',
    houseFlat: '',
    areaLandmark: '',
    deliveryNote: '',
  },
  onChange,
  primaryColor = '#F26B1D',
  restaurant = null,
}) {
  const [isLocating, setIsLocating] = useState(false);
  const [geoNotice, setGeoNotice] = useState(null); // { type: 'info'|'warning'|'success', message: '' }
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapZoom, setMapZoom] = useState(DEFAULT_MAP_ZOOM);

  const searchContainerRef = useRef(null);
  const requestSeqRef = useRef(0);
  const hasUserManuallyEditedAddressRef = useRef(Boolean(locationData.formattedAddress));

  const hasCoordinates = Boolean(
    locationData.latitude != null &&
    locationData.longitude != null &&
    !isNaN(Number(locationData.latitude)) &&
    !isNaN(Number(locationData.longitude))
  );

  // Helper: check if browser is in a secure HTTPS or localhost context
  const checkIsSecureContext = () => {
    if (typeof window === 'undefined') return true;
    if (window.isSecureContext) return true;
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  };

  // Auto-enable map loading once coordinates are present
  useEffect(() => {
    if (hasCoordinates) {
      setMapLoaded(true);
    }
  }, [hasCoordinates]);

  // Close search results dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Debounced Nominatim Address Search (1-second debounce, never fire on every keystroke)
  useEffect(() => {
    const clean = searchQuery.trim();
    if (clean.length < 3) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await geocodeService.searchAddress(clean);
        setSearchResults(results || []);
        setShowSearchResults(true);
      } catch (err) {
        console.warn('Address search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleManualSearch = async (e) => {
    if (e) e.preventDefault();
    const clean = searchQuery.trim();
    if (!clean) return;

    setIsSearching(true);
    try {
      const results = await geocodeService.searchAddress(clean);
      setSearchResults(results || []);
      setShowSearchResults(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (item) => {
    setMapLoaded(true);
    setShowSearchResults(false);
    setSearchQuery(item.label);
    const fixedLat = Number(Number(item.lat).toFixed(6));
    const fixedLng = Number(Number(item.lng).toFixed(6));
    requestSeqRef.current++;
    hasUserManuallyEditedAddressRef.current = false;

    handleLocationUpdate({
      latitude: fixedLat,
      longitude: fixedLng,
      accuracy: 30,
      formattedAddress: item.fullAddress || item.label,
    });
    setMapZoom(17);
  };

  // Browser Geolocation API ("Share My Location")
  const handleShareLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setMapLoaded(true);
      setGeoNotice({
        type: 'warning',
        message: 'Location is not supported by your browser. Move the pin to your exact location.',
      });
      return;
    }

    if (!checkIsSecureContext()) {
      setMapLoaded(true);
      setGeoNotice({
        type: 'warning',
        message: 'Geolocation requires HTTPS. Move the pin to your exact location.',
      });
      return;
    }

    setIsLocating(true);
    setGeoNotice({
      type: 'info',
      message: 'Locating... Tap "Allow" when prompted so our rider can navigate straight to your doorstep.',
    });

    const currentSeq = ++requestSeqRef.current;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        setMapLoaded(true);
        const { latitude, longitude, accuracy } = pos.coords;
        const fixedLat = Number(Number(latitude).toFixed(6));
        const fixedLng = Number(Number(longitude).toFixed(6));
        const roundedAccuracy = Math.round(accuracy);

        if (accuracy > 100) {
          // Low accuracy: auto-zoom the map and prompt customer to drag pin
          setMapZoom(18);
          setGeoNotice({
            type: 'warning',
            message: `Low accuracy (±${roundedAccuracy}m). Move the pin to your exact location.`,
          });
        } else {
          setMapZoom(17);
          setGeoNotice({
            type: 'success',
            message: `Location captured (±${roundedAccuracy}m). You can adjust the pin or edit your address.`,
          });
          setTimeout(() => setGeoNotice(null), 5000);
        }

        // Save lat/lng strictly with 6 decimal places immediately
        handleLocationUpdate({
          latitude: fixedLat,
          longitude: fixedLng,
          accuracy: roundedAccuracy,
        });

        // Reverse geocode via Nominatim to prefill the address if customer hasn't typed yet
        try {
          const revAddress = await geocodeService.reverseGeocode(fixedLat, fixedLng);
          // Prevent race condition: do not overwrite if customer took a subsequent action
          if (currentSeq !== requestSeqRef.current) return;
          // Never overwrite customer's manually edited address text
          if (!hasUserManuallyEditedAddressRef.current && revAddress) {
            handleLocationUpdate({
              formattedAddress: revAddress,
            });
          }
        } catch (_) {}
      },
      (err) => {
        setIsLocating(false);
        setMapLoaded(true);
        let errorMsg = 'Could not detect location. Move the pin to your exact location.';
        if (err.code === 1) { // PERMISSION_DENIED
          errorMsg = 'Location permission denied. Move the pin to your exact location.';
        } else if (err.code === 2) { // POSITION_UNAVAILABLE
          errorMsg = 'Location unavailable. Move the pin to your exact location.';
        } else if (err.code === 3) { // TIMEOUT (10s)
          errorMsg = 'Location request timed out. Move the pin to your exact location.';
        }

        setGeoNotice({
          type: 'warning',
          message: errorMsg,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000, // 10s strictly required
        maximumAge: 0,
      }
    );
  };

  // Callback when customer drags the pin on the OpenStreetMap Leaflet map
  const handlePinDragged = async ({ lat, lng }) => {
    const fixedLat = Number(Number(lat).toFixed(6));
    const fixedLng = Number(Number(lng).toFixed(6));
    const currentSeq = ++requestSeqRef.current;

    // Immediately update coordinates with fixed 6 decimals without waiting for reverse-geocoding
    handleLocationUpdate({
      latitude: fixedLat,
      longitude: fixedLng,
      accuracy: 10,
    });

    // Reverse geocode new position to update address field if not manually typed
    try {
      const revAddress = await geocodeService.reverseGeocode(fixedLat, fixedLng);
      // Discard if user dragged again while geocode was in-flight
      if (currentSeq !== requestSeqRef.current) return;

      if (!hasUserManuallyEditedAddressRef.current && revAddress) {
        handleLocationUpdate({
          formattedAddress: revAddress,
        });
      }
    } catch (_) {}
  };

  const handleLocationUpdate = (updates) => {
    if (onChange) {
      onChange({
        ...locationData,
        ...updates,
      });
    }
  };

  const handleClearPin = () => {
    requestSeqRef.current++;
    handleLocationUpdate({
      latitude: null,
      longitude: null,
      accuracy: null,
    });
    setSearchQuery('');
    setGeoNotice(null);
  };

  const handleCopyLink = () => {
    if (!hasCoordinates) return;
    const link = buildShareableLocationLink(locationData.latitude, locationData.longitude);
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Resolve map center (customer's pinned coordinates, or restaurant coords, or Faisalabad/Lahore fallback)
  const mapCenter = hasCoordinates
    ? { lat: Number(locationData.latitude), lng: Number(locationData.longitude) }
    : restaurant?.latitude && restaurant?.longitude
    ? { lat: Number(restaurant.latitude), lng: Number(restaurant.longitude) }
    : DEFAULT_FALLBACK_COORDS;

  const directGoogleNavUrl = hasCoordinates
    ? buildGoogleMapsNavUrl(locationData)
    : locationData.formattedAddress
    ? buildGoogleMapsNavUrl({ customer_address: locationData.formattedAddress })
    : null;

  const osmWebUrl = hasCoordinates
    ? buildOsmNavUrl(locationData.latitude, locationData.longitude, 18)
    : null;

  return (
    <div className="space-y-3.5">
      {/* Location Sharing Header & Trigger */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#FFF9F2] to-[#FFF1E6] border border-[#F0E4D7] space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#2B2118]">
              <Compass className="w-4 h-4 text-[#F26B1D]" />
              <span>Exact Delivery Pin (Optional)</span>
            </div>
            <p className="text-[11px] text-[#7A6A5C]">
              Share your location so our delivery rider finds your doorstep without calling for directions.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasCoordinates ? (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E7F6EC] border border-[#C0E9CE] text-[#1F9D55] text-[11px] font-bold">
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>Pinned {locationData.accuracy ? `(±${locationData.accuracy}m)` : ''}</span>
                </span>
                <button
                  type="button"
                  onClick={handleClearPin}
                  className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  title="Remove GPS Pin"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                id="share-location-btn"
                onClick={handleShareLocation}
                disabled={isLocating}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#FFF1E6] text-[#F26B1D] border border-[#FCD8BF] text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Locating...' : 'Use Current Location'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Location Notice / Feedback Bar */}
        {geoNotice && (
          <div
            className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 animate-fadeIn ${
              geoNotice.type === 'success'
                ? 'bg-[#E7F6EC] text-[#1F9D55] border border-[#C0E9CE]'
                : geoNotice.type === 'warning'
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}
          >
            {geoNotice.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : geoNotice.type === 'warning' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <Compass className="w-4 h-4 shrink-0 animate-spin" />
            )}
            <span className="text-[11px]">{geoNotice.message}</span>
          </div>
        )}

        {/* Optional Nominatim Address Search Box (Restricted to Pakistan) */}
        <div ref={searchContainerRef} className="relative pt-1">
          <form onSubmit={handleManualSearch} className="relative">
            <Search className="w-3.5 h-3.5 text-[#9E8E81] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setShowSearchResults(true);
              }}
              placeholder="Search area, landmark or street in Pakistan..."
              className="w-full pl-9 pr-16 py-1.5 rounded-xl bg-white border border-[#F0E4D7] text-[#2B2118] text-xs focus:outline-none focus:border-[#F26B1D] shadow-2xs"
            />
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-0.5 rounded-lg bg-[#F26B1D] text-white text-[10px] font-bold hover:bg-[#D95A12] transition disabled:opacity-40 cursor-pointer"
            >
              {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Search'}
            </button>
          </form>

          {/* Autocomplete Suggestions Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSearchResult(item)}
                  className="w-full px-3 py-2 text-left hover:bg-[#FFF9F2] transition flex items-start gap-2 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#F26B1D] shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-[#2B2118]">{item.label}</p>
                    <p className="text-[10px] text-[#7A6A5C] truncate max-w-sm">{item.fullAddress}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Embedded Leaflet OpenStreetMap with Draggable Pin (Rendered when pinned or manually expanded) */}
      {(hasCoordinates || mapLoaded) && (
        <div className="rounded-2xl border border-[#F0E4D7] overflow-hidden bg-white shadow-2xs animate-fadeIn space-y-0">
          {/* Map Header */}
          <div className="px-3.5 py-2 bg-[#FFF9F2] border-b border-[#F0E4D7] flex items-center justify-between text-[11px] flex-wrap gap-2">
            <div className="flex items-center gap-1.5 font-bold text-[#2B2118]">
              <MapPin className="w-3.5 h-3.5 text-[#F26B1D]" />
              <span>Drag the pin to fine-tune your gate</span>
            </div>

            <div className="flex items-center gap-2">
              {hasCoordinates && (
                <>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="text-[#7A6A5C] hover:text-[#2B2118] font-bold flex items-center gap-1 text-[10px] cursor-pointer"
                    title="Copy Location Coordinates Link"
                  >
                    <Copy className="w-2.5 h-2.5" />
                    <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>

                  {directGoogleNavUrl && (
                    <a
                      href={directGoogleNavUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#F26B1D] hover:underline font-bold flex items-center gap-1 text-[10px]"
                      title="Open Google Maps direction (Free)"
                    >
                      <span>Navigate</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}

                  {osmWebUrl && (
                    <a
                      href={osmWebUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#7A6A5C] hover:text-[#2B2118] font-bold flex items-center gap-1 text-[10px]"
                      title="Open in OpenStreetMap.org"
                    >
                      <span>OSM</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Interactive Leaflet Map with standard OSM tiles */}
          <div className="relative w-full h-48 bg-slate-100">
            <Suspense
              fallback={
                <div className="w-full h-full flex items-center justify-center bg-slate-100 text-xs text-slate-500 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#F26B1D]" />
                  <span>Loading OpenStreetMap...</span>
                </div>
              }
            >
              <LeafletMap
                center={mapCenter}
                zoom={mapZoom}
                draggable={true}
                onLocationChange={handlePinDragged}
                height="192px"
                interactive={true}
                popupText={locationData.formattedAddress || 'Your Delivery Location'}
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* Address Form Fields */}
      <div className="space-y-2.5">
        {/* Full Delivery Address (Required) */}
        <div>
          <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider mb-1">
            Full Delivery Address *
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-[#9E8E81] absolute left-3.5 top-3 pointer-events-none" />
            <textarea
              rows="2"
              required
              id="full-delivery-address-input"
              placeholder="Street name, Sector / Block, Town / City..."
              value={locationData.formattedAddress || ''}
              onChange={(e) => {
                hasUserManuallyEditedAddressRef.current = Boolean(e.target.value.trim());
                handleLocationUpdate({
                  formattedAddress: e.target.value,
                });
              }}
              className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-[#2B2118] text-xs focus:outline-none focus:border-[#F26B1D] focus:bg-white resize-none transition shadow-2xs leading-relaxed"
            />
          </div>
        </div>

        {/* Subfields Grid: House/Flat and Area/Landmark */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* House / Flat / Floor */}
          <div>
            <label className="block text-[11px] font-bold text-[#7A6A5C] uppercase tracking-wider mb-1 flex items-center gap-1">
              <Home className="w-3 h-3 text-[#9E8E81]" />
              <span>House / Flat / Floor #</span>
            </label>
            <input
              type="text"
              placeholder="e.g. House 14-B, 2nd Floor"
              value={locationData.houseFlat || ''}
              onChange={(e) =>
                handleLocationUpdate({
                  houseFlat: e.target.value,
                })
              }
              className="w-full px-3 py-2 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-[#2B2118] text-xs focus:outline-none focus:border-[#F26B1D] focus:bg-white transition"
            />
          </div>

          {/* Area / Nearest Landmark */}
          <div>
            <label className="block text-[11px] font-bold text-[#7A6A5C] uppercase tracking-wider mb-1 flex items-center gap-1">
              <Building className="w-3 h-3 text-[#9E8E81]" />
              <span>Nearest Landmark</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Near Madina Masjid, Sector G-9"
              value={locationData.areaLandmark || ''}
              onChange={(e) =>
                handleLocationUpdate({
                  areaLandmark: e.target.value,
                })
              }
              className="w-full px-3 py-2 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-[#2B2118] text-xs focus:outline-none focus:border-[#F26B1D] focus:bg-white transition"
            />
          </div>
        </div>

        {/* Rider Note / Gate Instructions */}
        <div>
          <label className="block text-[11px] font-bold text-[#7A6A5C] uppercase tracking-wider mb-1 flex items-center gap-1">
            <FileText className="w-3 h-3 text-[#9E8E81]" />
            <span>Delivery Note</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Blue gate, ring bell twice, call on arrival"
            value={locationData.deliveryNote || ''}
            onChange={(e) =>
              handleLocationUpdate({
                deliveryNote: e.target.value,
              })
            }
            className="w-full px-3 py-2 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-[#2B2118] text-xs focus:outline-none focus:border-[#F26B1D] focus:bg-white transition"
          />
        </div>
      </div>
    </div>
  );
}
