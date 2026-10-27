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
} from '../../config/mapConfig';
import {
  MapPin,
  Home,
  Briefcase,
  Search,
  Navigation,
  X,
  AlertCircle,
  Check,
  FileText,
  Building,
} from 'lucide-react';
import { PAKISTAN_MAJOR_CITIES } from './CustomerLocationModal';

const modalPinIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [26, 42],
  iconAnchor: [13, 42],
  popupAnchor: [1, -36],
  shadowSize: [38, 38],
});

export default function CustomerAddressModal({
  isOpen,
  onClose,
  onSave,
  initialData = null,
}) {
  const [form, setForm] = useState({
    id: null,
    label: 'Home',
    address: '',
    landmark: '',
    delivery_note: '',
    latitude: 33.721,
    longitude: 73.052,
    is_default: false,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // Sync initialData when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          id: initialData.id || null,
          label: initialData.label || 'Home',
          address: initialData.address || '',
          landmark: initialData.landmark || '',
          delivery_note: initialData.delivery_note || '',
          latitude: initialData.latitude ? Number(initialData.latitude) : 33.721,
          longitude: initialData.longitude ? Number(initialData.longitude) : 73.052,
          is_default: Boolean(initialData.is_default),
        });
      } else {
        setForm({
          id: null,
          label: 'Home',
          address: '',
          landmark: '',
          delivery_note: '',
          latitude: 33.721,
          longitude: 73.052,
          is_default: false,
        });
      }
      setSearchQuery('');
      setSearchResults([]);
      setErrorMsg('');
    }
  }, [isOpen, initialData]);

  // Initialize interactive Leaflet map with Draggable Pin
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;
      if (mapRef.current) {
        mapRef.current.invalidateSize();
        return;
      }

      const initialLat = form.latitude || 33.721;
      const initialLng = form.longitude || 73.052;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 14,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer(GOOGLE_MAPS_TILE_URL, {
        maxZoom: 20,
        subdomains: GOOGLE_MAPS_SUBDOMAINS,
        attribution: GOOGLE_MAPS_ATTRIBUTION,
      }).addTo(map);

      const marker = L.marker([initialLat, initialLng], {
        icon: modalPinIcon,
        draggable: true,
      }).addTo(map);

      // On pin drag end: update lat/lng and reverse geocode
      marker.on('dragend', async (e) => {
        const pos = e.target.getLatLng();
        const rLat = Number(pos.lat.toFixed(4));
        const rLng = Number(pos.lng.toFixed(4));

        setForm((prev) => ({ ...prev, latitude: rLat, longitude: rLng }));

        // Reverse lookup
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${rLat}&lon=${rLng}&zoom=16`,
            { headers: { 'User-Agent': 'DineHQ/1.0' } }
          );
          if (res.ok) {
            const data = await res.json();
            if (data.display_name && !form.address) {
              setForm((prev) => ({
                ...prev,
                address: data.display_name.split(',').slice(0, 3).join(',').trim(),
              }));
            }
          }
        } catch (_) {}
      });

      // On map click: move marker
      map.on('click', (e) => {
        const rLat = Number(e.latlng.lat.toFixed(4));
        const rLng = Number(e.latlng.lng.toFixed(4));
        marker.setLatLng([rLat, rLng]);
        setForm((prev) => ({ ...prev, latitude: rLat, longitude: rLng }));
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
  }, [isOpen]);

  // Handle Nominatim Address Search (Pakistan restricted)
  const handleSearchAddress = async (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    // 1. Instant check in local major cities dictionary
    const cleanQ = query.toLowerCase();
    const matchedCity = PAKISTAN_MAJOR_CITIES.find(
      (c) => cleanQ.includes(c.query) || c.query.includes(cleanQ)
    );
    if (matchedCity) {
      setForm((prev) => ({
        ...prev,
        latitude: matchedCity.lat,
        longitude: matchedCity.lng,
        city: matchedCity.name.split(',')[0],
      }));
      if (mapRef.current && markerRef.current) {
        markerRef.current.setLatLng([matchedCity.lat, matchedCity.lng]);
        mapRef.current.flyTo([matchedCity.lat, matchedCity.lng], 14, { duration: 0.8 });
      }
    }

    try {
      setIsSearching(true);
      setErrorMsg('');
      const q = encodeURIComponent(query);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${q}&countrycodes=pk&addressdetails=1&limit=5`,
        { headers: { 'User-Agent': 'DineHQ/1.0' } }
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data || []);
        if (data.length === 0) {
          if (!matchedCity) {
            setErrorMsg('No location matches found in Pakistan. Try sector or city name.');
          }
        } else {
          // Immediately fly map to top match
          const topMatch = data[0];
          const lat = Number(parseFloat(topMatch.lat).toFixed(4));
          const lng = Number(parseFloat(topMatch.lon).toFixed(4));
          const parts = topMatch.display_name.split(',');
          const shortAddress = parts.slice(0, 3).join(',').trim();

          setForm((prev) => ({
            ...prev,
            latitude: lat,
            longitude: lng,
            address: prev.address || shortAddress,
            landmark: prev.landmark || parts[0]?.trim() || '',
          }));

          if (mapRef.current && markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
            mapRef.current.flyTo([lat, lng], 15, { duration: 0.8 });
          }
        }
      }
    } catch (err) {
      if (!matchedCity) {
        setErrorMsg('Search failed. Please try dragging the pin directly.');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (item) => {
    const lat = Number(parseFloat(item.lat).toFixed(4));
    const lng = Number(parseFloat(item.lon).toFixed(4));
    const parts = item.display_name.split(',');
    const shortAddress = parts.slice(0, 3).join(',').trim();

    setForm((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      address: prev.address || shortAddress,
      landmark: prev.landmark || parts[0]?.trim() || '',
    }));

    if (mapRef.current && markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.flyTo([lat, lng], 15, { duration: 0.8 });
    }

    setSearchResults([]);
    setSearchQuery('');
  };

  // Browser Geolocation
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setErrorMsg('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lng = Number(pos.coords.longitude.toFixed(4));

        setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));

        if (mapRef.current && markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
          mapRef.current.setView([lat, lng], 15);
        }
      },
      (err) => {
        setIsLocating(false);
        setErrorMsg('GPS detection failed. Please search or drag the pin on map.');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Submit Handler
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.address.trim()) {
      setErrorMsg('Please enter a street, building, or house address.');
      return;
    }

    onSave({
      ...form,
      address: form.address.trim(),
      landmark: form.landmark.trim(),
      delivery_note: form.delivery_note.trim(),
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl border border-[#F0E4D7] shadow-2xl max-w-lg w-full overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#F0E4D7] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#FFF1E6] text-[#F26B1D]">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-base text-[#2B2118]">
                {form.id ? 'Edit Delivery Address' : 'Add New Delivery Address'}
              </h3>
              <p className="text-[11px] text-[#7A6A5C]">
                Pinpoint location ensures accurate distance, delivery fees, and quick rider arrival
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9E8E81] hover:text-[#2B2118] hover:bg-[#FFF9F2] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Label Selector: Home / Work / Other */}
          <div>
            <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider mb-1.5">
              Address Label
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Home', icon: Home, color: 'text-emerald-600' },
                { id: 'Work', icon: Briefcase, color: 'text-indigo-600' },
                { id: 'Other', icon: MapPin, color: 'text-[#F26B1D]' },
              ].map(({ id, icon: Icon, color }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setForm({ ...form, label: id })}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    form.label === id
                      ? 'bg-[#2B2118] text-white border-[#2B2118] shadow-xs'
                      : 'bg-[#FFF9F2] text-[#7A6A5C] border-[#F0E4D7] hover:border-[#F26B1D]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${form.label === id ? 'text-white' : color}`} />
                  <span>{id}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Map Pin with OSM + Leaflet & Address Search */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider">
                Map Pin (Drag pin to adjust)
              </label>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleDetectGPS}
                  disabled={isLocating}
                  className="text-xs font-bold text-[#F26B1D] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Detect live GPS position"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{isLocating ? 'Detecting...' : 'Where I am now'}</span>
                </button>
              </div>
            </div>

            {/* Nominatim Search Input */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[#7A6A5C] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search sector, neighborhood, or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchAddress(e)}
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2]/60 text-xs font-medium text-[#2B2118] placeholder-[#9E8E81] focus:outline-none focus:ring-1 focus:ring-[#F26B1D]"
                />
              </div>
              <button
                type="button"
                onClick={handleSearchAddress}
                disabled={isSearching || !searchQuery.trim()}
                className="px-3 py-1.5 rounded-xl bg-[#2B2118] text-white text-xs font-bold hover:bg-[#F26B1D] transition cursor-pointer disabled:opacity-40 shrink-0"
              >
                {isSearching ? '...' : 'Search'}
              </button>
            </div>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="bg-white rounded-xl border border-[#F0E4D7] shadow-lg p-1 space-y-1 max-h-32 overflow-y-auto">
                {searchResults.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSearchResult(item)}
                    className="w-full text-left p-1.5 rounded-lg hover:bg-[#FFF1E6] transition text-xs flex items-center gap-2 cursor-pointer truncate"
                  >
                    <MapPin className="w-3 h-3 text-[#F26B1D] shrink-0" />
                    <span className="truncate">{item.display_name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Interactive Leaflet Map Container */}
            <div className="relative rounded-2xl overflow-hidden border border-[#F0E4D7] shadow-2xs">
              <div ref={mapContainerRef} style={{ height: '170px' }} className="w-full z-0" />
              <div className="absolute top-2 right-2 z-10 pointer-events-none">
                <span className="px-2 py-0.5 rounded-lg bg-black/70 text-white text-[10px] font-bold">
                  Drag pin to adjust
                </span>
              </div>
              <div className="absolute bottom-2 left-2 z-10 pointer-events-none bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px] font-mono text-[#7A6A5C] border border-[#F0E4D7]">
                {form.latitude}, {form.longitude}
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${form.latitude},${form.longitude}`}
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
          </div>

          {/* 3. Street / House Address */}
          <div>
            <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider mb-1">
              Street / Building Address <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              placeholder="e.g. House #14, Street 25, Sector F-7/2, Islamabad"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2]/40 text-xs font-medium text-[#2B2118] placeholder-[#9E8E81] focus:outline-none focus:ring-2 focus:ring-[#F26B1D] focus:bg-white transition"
            />
          </div>

          {/* 4. Notable Landmark */}
          <div>
            <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider mb-1">
              Notable Landmark <span className="text-[#9E8E81] font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Opposite Safa Gold Mall or Behind Allied Bank"
              value={form.landmark}
              onChange={(e) => setForm({ ...form, landmark: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2]/40 text-xs font-medium text-[#2B2118] placeholder-[#9E8E81] focus:outline-none focus:ring-2 focus:ring-[#F26B1D] focus:bg-white transition"
            />
          </div>

          {/* 5. Delivery Note */}
          <div>
            <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider mb-1">
              Delivery Note for Rider <span className="text-[#9E8E81] font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Ring bell twice, leave with guard, call on arrival"
              value={form.delivery_note}
              onChange={(e) => setForm({ ...form, delivery_note: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2]/40 text-xs font-medium text-[#2B2118] placeholder-[#9E8E81] focus:outline-none focus:ring-2 focus:ring-[#F26B1D] focus:bg-white transition"
            />
          </div>

          {/* 6. Set Default Switch */}
          <div className="p-3 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#2B2118] block">Primary Delivery Address</span>
              <span className="text-[11px] text-[#7A6A5C] block">
                Use for nearby restaurant distances and 1-tap checkout autofill
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F26B1D]"></div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F0E4D7]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#F0E4D7] text-xs font-bold text-[#7A6A5C] hover:bg-[#FFF9F2] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs font-bold shadow-md shadow-[#F26B1D]/20 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Save Address</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
