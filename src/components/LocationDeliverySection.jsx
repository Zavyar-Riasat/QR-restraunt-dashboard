import React, { useState, useEffect } from 'react';
import LocationDeliveryMap from './Map/LocationDeliveryMap';
import { validatePolygonCoordinates, calculatePolygonAreaKm2, generatePresetPolygon } from '../utils/geoValidation';
import { restaurantService } from '../services/restaurantService';
import { marketplaceService, DEFAULT_OPENING_HOURS } from '../services/marketplaceService';
import { formatPKR } from '../utils/currencyUtils';
import {
  MapPin,
  Compass,
  PenTool,
  CheckCircle2,
  AlertCircle,
  Clock,
  Truck,
  ShoppingBag,
  Store,
  HelpCircle,
  Eye,
  EyeOff,
  Upload,
  Image as ImageIcon,
  Save,
  Check,
  Plus,
  Trash2,
  Layers,
  UtensilsCrossed,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

const CUISINE_OPTIONS = [
  'Fast Food',
  'Smash Burgers',
  'Pizza',
  'BBQ',
  'Desi',
  'Karahi',
  'Chinese',
  'Cafe',
  'Desserts',
  'Continental',
  'Seafood',
  'Healthy',
  'Shakes & Drinks',
];

const WEEKDAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export default function LocationDeliverySection({ restaurant, onUpdate }) {
  const [formData, setFormData] = useState({
    // Location
    address: restaurant?.address || '',
    area: restaurant?.area || '',
    city: restaurant?.city || 'Islamabad',
    landmark: restaurant?.landmark || '',
    latitude: restaurant?.latitude || 33.72148,
    longitude: restaurant?.longitude || 73.05232,

    // Delivery Area
    deliveryMode: restaurant?.delivery_areas?.[0]?.type === 'polygon' ? 'polygon' : 'radius',
    radiusKm: restaurant?.delivery_areas?.[0]?.radius_km || 5,
    polygonCoords: restaurant?.delivery_areas?.[0]?.polygon || [],

    // Multi-zone support (Optional)
    customZones: restaurant?.delivery_areas || [],

    // Other Listing Details
    cover_image:
      restaurant?.cover_image ||
      'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80',
    cuisines: Array.isArray(restaurant?.cuisines)
      ? restaurant.cuisines
      : ['Fast Food', 'Smash Burgers'],
    opening_hours: restaurant?.opening_hours || DEFAULT_OPENING_HOURS,

    // Fulfillment Toggles
    delivery_enabled: restaurant?.delivery_enabled !== false,
    pickup_enabled: restaurant?.pickup_enabled !== false,
    dinein_enabled: restaurant?.dinein_enabled !== false,
    delivery_fee: restaurant?.delivery_fee != null ? restaurant.delivery_fee : 150,
    min_order: restaurant?.min_order != null ? restaurant.min_order : 500,
    prep_time: restaurant?.prep_time || '20–30 mins',

    // Marketplace Listing
    listed_publicly: Boolean(restaurant?.listed_publicly),
    listing_status: restaurant?.listing_status || 'pending',
    rejection_reason: restaurant?.rejection_reason || '',
  });

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [isMapDrawingActive, setIsMapDrawingActive] = useState(false);

  // Actions for drawing from Card 2
  const handleStartDrawFromCard = () => {
    setFormData((prev) => ({ ...prev, deliveryMode: 'polygon' }));
    setIsMapDrawingActive(true);
    const mapEl = document.getElementById('location-map-container');
    if (mapEl) {
      mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleGeneratePresetFromCard = (radiusKm = 5) => {
    const preset = generatePresetPolygon(formData.latitude, formData.longitude, radiusKm, 6);
    setFormData((prev) => ({ ...prev, deliveryMode: 'polygon', polygonCoords: preset }));
    setIsMapDrawingActive(false);
    const mapEl = document.getElementById('location-map-container');
    if (mapEl) {
      mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleClearPolygon = () => {
    setFormData((prev) => ({ ...prev, polygonCoords: [] }));
    setIsMapDrawingActive(false);
  };

  // Sync state when restaurant prop updates
  useEffect(() => {
    if (!restaurant) return;
    setFormData((prev) => ({
      ...prev,
      address: restaurant.address || prev.address,
      area: restaurant.area || prev.area,
      city: restaurant.city || prev.city,
      landmark: restaurant.landmark || prev.landmark,
      latitude: restaurant.latitude || prev.latitude,
      longitude: restaurant.longitude || prev.longitude,
      cover_image: restaurant.cover_image || prev.cover_image,
      cuisines: Array.isArray(restaurant.cuisines) ? restaurant.cuisines : prev.cuisines,
      opening_hours: restaurant.opening_hours || prev.opening_hours,
      delivery_enabled: restaurant.delivery_enabled !== false,
      pickup_enabled: restaurant.pickup_enabled !== false,
      dinein_enabled: restaurant.dinein_enabled !== false,
      delivery_fee: restaurant.delivery_fee != null ? restaurant.delivery_fee : prev.delivery_fee,
      min_order: restaurant.min_order != null ? restaurant.min_order : prev.min_order,
      prep_time: restaurant.prep_time || prev.prep_time,
      listed_publicly: Boolean(restaurant.listed_publicly),
      listing_status: restaurant.listing_status || prev.listing_status,
      rejection_reason: restaurant.rejection_reason || '',
    }));
  }, [restaurant]);

  // Cuisine Chip Toggle
  const toggleCuisine = (cuisine) => {
    setFormData((prev) => {
      const exists = prev.cuisines.includes(cuisine);
      const updated = exists
        ? prev.cuisines.filter((c) => c !== cuisine)
        : [...prev.cuisines, cuisine];
      return { ...prev, cuisines: updated };
    });
  };

  // Opening Hours Change Handlers
  const handleHoursChange = (dayKey, field, value) => {
    setFormData((prev) => ({
      ...prev,
      opening_hours: {
        ...prev.opening_hours,
        [dayKey]: {
          ...(prev.opening_hours?.[dayKey] || { open: '11:00', close: '02:00', is_closed: false }),
          [field]: value,
        },
      },
    }));
  };

  // Image Upload handler for cover photo
  const handleCoverUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setErrorMsg('Cover photo image must be smaller than 4MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, cover_image: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  // Validate form fields
  const validateForm = () => {
    const errors = [];

    if (!formData.address.trim()) {
      errors.push('Restaurant street address is required.');
    }
    if (!formData.city.trim()) {
      errors.push('City is required.');
    }
    if (!formData.latitude || !formData.longitude) {
      errors.push('Pinpoint GPS coordinates on the map are required.');
    }

    if (formData.delivery_enabled) {
      if (formData.deliveryMode === 'radius') {
        if (!formData.radiusKm || formData.radiusKm < 1 || formData.radiusKm > 25) {
          errors.push('Delivery radius must be between 1 km and 25 km.');
        }
      } else if (formData.deliveryMode === 'polygon') {
        const polyValidation = validatePolygonCoordinates(formData.polygonCoords);
        if (!polyValidation.valid) {
          errors.push(polyValidation.error || 'Please draw a valid delivery area polygon on the map.');
        }
      }
    }

    return errors;
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSavedSuccess(false);

    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      setErrorMsg('Please address the requirements below before saving.');
      return;
    }
    setValidationErrors([]);

    try {
      setSaving(true);
      const restId = restaurant?.id || 'rest-101';

      // Determine listing status:
      // If owner switches "Show on DineHQ Home page" ON for the first time,
      // and it was not previously approved, set to "pending".
      let newListingStatus = formData.listing_status;
      if (formData.listed_publicly) {
        if (newListingStatus !== 'approved') {
          newListingStatus = 'pending';
        }
      } else {
        if (newListingStatus === 'approved') {
          newListingStatus = 'hidden';
        }
      }

      // Format delivery area payload
      const deliveryAreaPayload = [
        {
          restaurant_id: restId,
          type: formData.deliveryMode,
          radius_km: formData.deliveryMode === 'radius' ? Number(formData.radiusKm) : null,
          polygon: formData.deliveryMode === 'polygon' ? formData.polygonCoords : null,
          fee: Number(formData.delivery_fee) || 0,
        },
      ];

      const payload = {
        ...restaurant,
        address: formData.address.trim(),
        area: formData.area.trim(),
        city: formData.city.trim(),
        landmark: formData.landmark.trim(),
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        cover_image: formData.cover_image,
        cuisines: formData.cuisines,
        opening_hours: formData.opening_hours,
        delivery_enabled: formData.delivery_enabled,
        pickup_enabled: formData.pickup_enabled,
        dinein_enabled: formData.dinein_enabled,
        delivery_fee: Number(formData.delivery_fee) || 0,
        min_order: Number(formData.min_order) || 0,
        prep_time: formData.prep_time,
        listed_publicly: formData.listed_publicly,
        listing_status: newListingStatus,
        delivery_areas: deliveryAreaPayload,
      };

      // Save via service
      await restaurantService.updateRestaurant(restId, payload);
      await marketplaceService.saveDeliveryAreas(restId, deliveryAreaPayload);

      // Persist full restaurant payload and listing status override locally
      try {
        localStorage.setItem(`dinehq_restaurant_overrides_${restId}`, JSON.stringify(payload));
        if (restaurant?.slug) {
          localStorage.setItem(`dinehq_restaurant_overrides_${restaurant.slug}`, JSON.stringify(payload));
        }
        const raw = localStorage.getItem('dinehq_listing_overrides') || '{}';
        const overrides = JSON.parse(raw);
        overrides[restId] = {
          listing_status: newListingStatus,
          rejection_reason: '',
          listed_publicly: formData.listed_publicly,
          updated_at: new Date().toISOString(),
        };
        localStorage.setItem('dinehq_listing_overrides', JSON.stringify(overrides));
      } catch (e) {
        console.warn('Error saving local restaurant overrides:', e);
      }

      // Bust marketplace public restaurants cache
      marketplaceService.invalidateCache?.();

      if (onUpdate) {
        onUpdate(payload);
      }

      setFormData((prev) => ({
        ...prev,
        listing_status: newListingStatus,
      }));

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save location & delivery settings.');
    } finally {
      setSaving(false);
    }
  };

  // Helper for status badge
  const renderStatusBadge = () => {
    switch (formData.listing_status) {
      case 'approved':
        return (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-emerald-900">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-extrabold text-sm">Approved & Listed on Marketplace Home Page</p>
                <p className="text-xs text-emerald-700">
                  Customers in your delivery radius can discover your menu and place orders online.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold shrink-0">
              Live
            </span>
          </div>
        );

      case 'pending':
        return (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-amber-900">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="font-extrabold text-sm">Waiting for Super Admin Approval</p>
                <p className="text-xs text-amber-700">
                  Your listing submission is under review by the platform team. Your menu URL is still active.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-bold shrink-0">
              Pending Review
            </span>
          </div>
        );

      case 'rejected':
        return (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2 text-rose-900">
            <div className="flex items-center gap-2 font-extrabold text-sm text-rose-700">
              <AlertCircle className="w-5 h-5" />
              <span>Listing Not Approved (Revisions Requested)</span>
            </div>
            {formData.rejection_reason && (
              <p className="text-xs text-rose-800 bg-white/70 p-2.5 rounded-xl border border-rose-200">
                <span className="font-bold">Admin Feedback:</span> {formData.rejection_reason}
              </p>
            )}
            <p className="text-xs text-rose-700">
              Please update your location or delivery boundary according to the feedback, then save to resubmit.
            </p>
          </div>
        );

      default:
        return (
          <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] flex items-center justify-between gap-3 text-[#2B2118]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FFF1E6] flex items-center justify-center text-[#F26B1D] shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <p className="font-extrabold text-sm">Not Listed Publicly on Home Page</p>
                <p className="text-xs text-[#7A6A5C]">
                  Complete your location & delivery area below and toggle "Show on DineHQ Home page" to join the marketplace.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-700 text-xs font-bold shrink-0">
              Private
            </span>
          </div>
        );
    }
  };

  return (
    <div
      id="location-delivery-section"
      className="bg-white border border-[#F0E4D7] rounded-3xl p-6 sm:p-8 shadow-xs space-y-8 animate-fadeIn"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#F0E4D7]">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#FFF1E6] text-[#F26B1D]">
              <MapPin className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-[#2B2118] tracking-tight">
              Location & Delivery Area
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#7A6A5C] mt-1">
            Pinpoint your restaurant on the map, set your delivery boundaries, and configure your public marketplace listing.
          </p>
        </div>

        {savedSuccess && (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#E7F6EC] text-[#1F9D55] border border-[#C0E9CE] text-xs font-bold animate-fadeIn">
            <Check className="w-4 h-4" />
            <span>Settings Saved!</span>
          </span>
        )}
      </div>

      {/* Listing Status Banner */}
      {renderStatusBadge()}

      {/* Error Banners */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>{errorMsg}</p>
            {validationErrors.length > 0 && (
              <ul className="list-disc list-inside font-normal space-y-0.5 pt-1 text-rose-700">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ========================================================
            PART 1: Restaurant Location (Map & Address Fields)
            ======================================================== */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-heading font-extrabold text-[#2B2118] flex items-center gap-2">
                <span>1. Restaurant Pinpoint Location</span>
              </h3>
              <p className="text-xs text-[#7A6A5C]">
                Drag the pin on OpenStreetMap, use your device GPS, or search your Pakistan street address.
              </p>
            </div>
            <span className="text-[11px] font-mono text-[#9E8E81] hidden sm:inline">
              GPS: {Number(formData.latitude).toFixed(5)}, {Number(formData.longitude).toFixed(5)}
            </span>
          </div>

          {/* Interactive Leaflet + OpenStreetMap + Nominatim */}
          <LocationDeliveryMap
            restaurantLocation={{ lat: formData.latitude, lng: formData.longitude }}
            onLocationChange={(coords) => {
              setFormData((prev) => ({
                ...prev,
                latitude: coords.lat,
                longitude: coords.lng,
              }));
            }}
            deliveryMode={formData.deliveryMode}
            radiusKm={formData.radiusKm}
            polygonCoords={formData.polygonCoords}
            onPolygonChange={(coords) => {
              setFormData((prev) => ({ ...prev, polygonCoords: coords }));
            }}
            onAddressSelect={(geoDetails) => {
              setFormData((prev) => ({
                ...prev,
                address: geoDetails.address,
                area: geoDetails.area || prev.area,
                city: geoDetails.city || prev.city,
                latitude: geoDetails.latitude,
                longitude: geoDetails.longitude,
              }));
            }}
            isDrawingActiveProp={isMapDrawingActive}
            onDrawingActiveChange={setIsMapDrawingActive}
            height="400px"
          />

          {/* Form Fields: Address, Area, City, Landmark */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider mb-1.5">
                Street Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Shop 4, Beverly Centre, Blue Area"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2]/50 text-xs sm:text-sm font-medium text-[#2B2118] focus:outline-none focus:ring-2 focus:ring-[#F26B1D] focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider mb-1.5">
                Area / Neighborhood
              </label>
              <input
                type="text"
                placeholder="e.g. F-7 Markaz, Blue Area"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2]/50 text-xs sm:text-sm font-medium text-[#2B2118] focus:outline-none focus:ring-2 focus:ring-[#F26B1D] focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider mb-1.5">
                City <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Islamabad, Lahore"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2]/50 text-xs sm:text-sm font-medium text-[#2B2118] focus:outline-none focus:ring-2 focus:ring-[#F26B1D] focus:bg-white transition"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider mb-1.5">
                Notable Landmark <span className="text-[#9E8E81] font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Opposite Safa Gold Mall or Near Marriott Hotel"
                value={formData.landmark}
                onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2]/50 text-xs sm:text-sm font-medium text-[#2B2118] focus:outline-none focus:ring-2 focus:ring-[#F26B1D] focus:bg-white transition"
              />
            </div>
          </div>
        </section>

        {/* ========================================================
            PART 2: Delivery Area (Radius vs Draw My Area Cards)
            ======================================================== */}
        <section className="space-y-4 pt-4 border-t border-[#F0E4D7]">
          <div>
            <h3 className="text-base font-heading font-extrabold text-[#2B2118]">
              2. Delivery Coverage Area
            </h3>
            <p className="text-xs text-[#7A6A5C]">
              Choose how you define where your riders deliver. Customers outside this zone cannot order delivery.
            </p>
          </div>

          {/* Big Toggle Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card 1: Radius */}
            <div
              onClick={() => setFormData({ ...formData, deliveryMode: 'radius' })}
              className={`p-5 rounded-3xl border-2 transition cursor-pointer flex flex-col justify-between ${
                formData.deliveryMode === 'radius'
                  ? 'border-[#F26B1D] bg-[#FFF1E6]/30 shadow-md ring-2 ring-[#F26B1D]/15'
                  : 'border-[#F0E4D7] bg-white hover:border-[#F26B1D]/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-[#FFF1E6] text-[#F26B1D] flex items-center justify-center font-bold">
                    <Compass className="w-5 h-5" />
                  </div>
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      formData.deliveryMode === 'radius'
                        ? 'border-[#F26B1D] bg-[#F26B1D] text-white'
                        : 'border-[#D0C2B4]'
                    }`}
                  >
                    {formData.deliveryMode === 'radius' && <Check className="w-3 h-3 stroke-[3]" />}
                  </span>
                </div>
                <h4 className="font-heading font-extrabold text-base text-[#2B2118]">
                  Circular Radius
                </h4>
                <p className="text-xs text-[#7A6A5C] mt-1">
                  Deliver in a uniform circular distance (1 to 25 km) centered around your restaurant.
                </p>
              </div>

              {formData.deliveryMode === 'radius' && (
                <div className="mt-4 pt-4 border-t border-[#F0E4D7] space-y-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2B2118]">Delivery Radius</span>
                    <span className="font-heading font-extrabold text-[#F26B1D] text-base">
                      {formData.radiusKm} km
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="25"
                    step="0.5"
                    value={formData.radiusKm}
                    onChange={(e) => setFormData({ ...formData, radiusKm: parseFloat(e.target.value) })}
                    className="w-full accent-[#F26B1D] cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-[11px] text-[#9E8E81] font-mono">
                    <span>1 km</span>
                    <span>5 km</span>
                    <span>15 km</span>
                    <span>25 km</span>
                  </div>
                </div>
              )}
            </div>

            {/* Card 2: Draw My Area */}
            <div
              onClick={() => setFormData({ ...formData, deliveryMode: 'polygon' })}
              className={`p-5 rounded-3xl border-2 transition cursor-pointer flex flex-col justify-between ${
                formData.deliveryMode === 'polygon'
                  ? 'border-[#F26B1D] bg-[#FFF1E6]/30 shadow-md ring-2 ring-[#F26B1D]/15'
                  : 'border-[#F0E4D7] bg-white hover:border-[#F26B1D]/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-[#FFF1E6] text-[#F26B1D] flex items-center justify-center font-bold">
                    <PenTool className="w-5 h-5" />
                  </div>
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      formData.deliveryMode === 'polygon'
                        ? 'border-[#F26B1D] bg-[#F26B1D] text-white'
                        : 'border-[#D0C2B4]'
                    }`}
                  >
                    {formData.deliveryMode === 'polygon' && <Check className="w-3 h-3 stroke-[3]" />}
                  </span>
                </div>
                <h4 className="font-heading font-extrabold text-base text-[#2B2118]">
                  Draw Custom Area (Geoman)
                </h4>
                <p className="text-xs text-[#7A6A5C] mt-1">
                  Click on the map above to plot a precise boundary polygon that hugs specific sectors, highways, or rivers.
                </p>
              </div>

              {formData.deliveryMode === 'polygon' && (
                <div className="mt-4 pt-4 border-t border-[#F0E4D7] space-y-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2B2118]">Polygon Boundary</span>
                    <span className="text-xs font-bold text-[#F26B1D] font-mono">
                      {formData.polygonCoords.length} corners
                      {formData.polygonCoords.length >= 3 && ` (~${calculatePolygonAreaKm2(formData.polygonCoords)} km²)`}
                    </span>
                  </div>

                  {/* Immediate Action Buttons Inside Card */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleStartDrawFromCard}
                      className="px-3 py-2 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>{formData.polygonCoords.length >= 3 ? 'Redraw on Map' : 'Start Drawing on Map'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGeneratePresetFromCard(5)}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-[#FFF1E6] text-[#2B2118] border border-[#F0E4D7] hover:border-[#F26B1D] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <span>Generate 5 km Area</span>
                    </button>
                  </div>

                  {formData.polygonCoords.length >= 3 ? (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800">
                      <span>✓ Boundary active ({formData.polygonCoords.length} corners). Drag numbered handles on map to reshape.</span>
                      <button
                        type="button"
                        onClick={handleClearPolygon}
                        className="ml-2 text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer shrink-0"
                      >
                        Clear
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 p-2 rounded-xl leading-relaxed">
                      💡 Click <b>"Start Drawing on Map"</b> to place corners by clicking on the map, or click <b>"Generate 5 km Area"</b> to start with an instant preset!
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ========================================================
            PART 3: Other Listing Details (Cover, Cuisines, Hours)
            ======================================================== */}
        <section className="space-y-6 pt-4 border-t border-[#F0E4D7]">
          <div>
            <h3 className="text-base font-heading font-extrabold text-[#2B2118]">
              3. Marketplace Presentation & Operating Hours
            </h3>
            <p className="text-xs text-[#7A6A5C]">
              Visuals and opening hours for marketplace diners.
            </p>
          </div>

          {/* Cover Image */}
          <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-3">
            <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-[#F26B1D]" />
              Marketplace Banner / Cover Photo
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3.5 rounded-xl border border-[#F0E4D7]">
              <div className="w-32 h-20 rounded-xl overflow-hidden bg-[#FFF9F2] border border-[#F0E4D7] shrink-0">
                <img
                  src={formData.cover_image}
                  alt="Cover Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 space-y-2 w-full">
                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 rounded-xl bg-[#FFF1E6] hover:bg-[#FFE6D4] text-[#F26B1D] border border-[#FCD8BF] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Cover Image</span>
                    <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                  </label>
                </div>
                <input
                  type="url"
                  placeholder="Or paste image URL (e.g. Unsplash / CDN)"
                  value={formData.cover_image}
                  onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2]/50 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Fulfillment Toggles & Base Fees */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-bold text-[#2B2118] flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[#F26B1D]" />
                  Delivery Service
                </span>
                <input
                  type="checkbox"
                  checked={formData.delivery_enabled}
                  onChange={(e) => setFormData({ ...formData, delivery_enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-[#F26B1D] focus:ring-[#F26B1D] cursor-pointer"
                />
              </label>
              <div className="pt-2">
                <label className="block text-[11px] font-bold text-[#7A6A5C] mb-1">
                  Delivery Fee (PKR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={formData.delivery_fee}
                  onChange={(e) => setFormData({ ...formData, delivery_fee: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-[#F0E4D7] bg-white text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-bold text-[#2B2118] flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-[#F26B1D]" />
                  Takeaway / Pickup
                </span>
                <input
                  type="checkbox"
                  checked={formData.pickup_enabled}
                  onChange={(e) => setFormData({ ...formData, pickup_enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-[#F26B1D] focus:ring-[#F26B1D] cursor-pointer"
                />
              </label>
              <div className="pt-2">
                <label className="block text-[11px] font-bold text-[#7A6A5C] mb-1">
                  Min. Order (PKR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={formData.min_order}
                  onChange={(e) => setFormData({ ...formData, min_order: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-[#F0E4D7] bg-white text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-bold text-[#2B2118] flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-[#F26B1D]" />
                  Dine-In Ordering
                </span>
                <input
                  type="checkbox"
                  checked={formData.dinein_enabled}
                  onChange={(e) => setFormData({ ...formData, dinein_enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-[#F26B1D] focus:ring-[#F26B1D] cursor-pointer"
                />
              </label>
              <div className="pt-2">
                <label className="block text-[11px] font-bold text-[#7A6A5C] mb-1">
                  Prep Time Display
                </label>
                <input
                  type="text"
                  placeholder="e.g. 20–30 mins"
                  value={formData.prep_time}
                  onChange={(e) => setFormData({ ...formData, prep_time: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-[#F0E4D7] bg-white text-xs font-bold"
                />
              </div>
            </div>
          </div>

          {/* Opening Hours Schedule (Per weekday with Overnight Support) */}
          <div className="p-4 rounded-3xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#F26B1D]" />
                Operating Hours per Day (Supports Overnight Shifts)
              </label>
              <span className="text-[11px] text-[#7A6A5C]">
                Used by the marketplace algorithm to compute "Open Now"
              </span>
            </div>

            <div className="space-y-2 bg-white p-3 rounded-2xl border border-[#F0E4D7]">
              {WEEKDAYS.map(({ key, label }) => {
                const day = formData.opening_hours?.[key] || {
                  open: '11:00',
                  close: '02:00',
                  is_closed: false,
                };
                const isOvernight = !day.is_closed && day.open && day.close && day.close < day.open;

                return (
                  <div
                    key={key}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-xl hover:bg-[#FFF9F2] transition border border-transparent hover:border-[#F0E4D7]"
                  >
                    <div className="flex items-center gap-3 w-32 shrink-0">
                      <input
                        type="checkbox"
                        checked={!day.is_closed}
                        onChange={(e) => handleHoursChange(key, 'is_closed', !e.target.checked)}
                        className="rounded text-[#F26B1D] focus:ring-[#F26B1D] cursor-pointer"
                      />
                      <span className="text-xs font-bold text-[#2B2118]">{label}</span>
                    </div>

                    {!day.is_closed ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-mono">
                          <input
                            type="time"
                            value={day.open}
                            onChange={(e) => handleHoursChange(key, 'open', e.target.value)}
                            className="px-2 py-1 rounded-lg border border-[#F0E4D7] bg-[#FFF9F2] text-xs font-mono font-bold"
                          />
                          <span className="text-[#7A6A5C]">to</span>
                          <input
                            type="time"
                            value={day.close}
                            onChange={(e) => handleHoursChange(key, 'close', e.target.value)}
                            className="px-2 py-1 rounded-lg border border-[#F0E4D7] bg-[#FFF9F2] text-xs font-mono font-bold"
                          />
                        </div>

                        {isOvernight && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                            Overnight (Past Midnight)
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-rose-600 px-2 py-0.5 bg-rose-50 rounded-lg">
                        Closed
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================
            PART 4: Marketplace Listing Switch & Submission
            ======================================================== */}
        <section className="p-5 rounded-3xl bg-[#FFF1E6]/40 border-2 border-[#FCD8BF] space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-[#F26B1D]" />
                <h4 className="font-heading font-extrabold text-base text-[#2B2118]">
                  Show my restaurant on DineHQ Home page
                </h4>
              </div>
              <p className="text-xs text-[#7A6A5C] max-w-xl">
                When enabled and approved by DineHQ, your restaurant is featured on the nearby marketplace home page. Customers in your delivery radius can find you and place direct orders.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={formData.listed_publicly}
                onChange={(e) => setFormData({ ...formData, listed_publicly: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F26B1D]"></div>
            </label>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#FCD8BF]/60">
            <div className="text-xs text-[#7A6A5C]">
              {formData.listed_publicly ? (
                <span>
                  Submitting for the first time marks your listing as <b>Waiting for approval</b>.
                </span>
              ) : (
                <span>Your storefront menu URL remains active regardless of marketplace listing.</span>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-2xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs sm:text-sm font-bold shadow-lg shadow-[#F26B1D]/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Settings...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save & Update Listing</span>
                </>
              )}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}
