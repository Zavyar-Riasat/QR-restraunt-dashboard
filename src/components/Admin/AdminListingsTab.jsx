import React, { useState, useEffect } from 'react';
import ListingMapPreview from '../Map/ListingMapPreview';
import { marketplaceService } from '../../services/marketplaceService';
import { formatPKR } from '../../utils/currencyUtils';
import {
  Store,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Eye,
  EyeOff,
  Search,
  ExternalLink,
  Phone,
  Truck,
  ShoppingBag,
  Check,
  X,
  MessageSquare,
  Trash2,
} from 'lucide-react';

const COMMON_REJECTION_REASONS = [
  'Incomplete street address or landmark missing.',
  'Delivery radius/polygon exceeds maximum allowable operational capacity (25 km).',
  'Cover photo is low resolution or contains promotional watermarks.',
  'Missing valid phone number or WhatsApp business contact.',
  'Duplicate restaurant listing already exists.',
];

export default function AdminListingsTab() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected' | 'hidden'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 12;

  // Remove Modal State
  const [deletingRestaurant, setDeletingRestaurant] = useState(null);

  // Reject Modal State
  const [rejectingRestaurant, setRejectingRestaurant] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Load all restaurants
  const loadData = async () => {
    try {
      setLoading(true);
      const list = await marketplaceService.getAllRestaurantsForAdmin();
      setRestaurants(list);
    } catch (err) {
      console.warn('Error loading admin restaurants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // Approve action
  const handleApprove = async (restId) => {
    try {
      setActionLoading(true);
      await marketplaceService.updateListingStatus(restId, {
        status: 'approved',
        listedPublicly: true,
        reason: '',
      });
      showToast('Restaurant listing approved! It is now live on the marketplace home page.');
      await loadData();
    } catch (err) {
      alert('Failed to approve listing: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Reject action
  const handleOpenRejectModal = (restaurant) => {
    setRejectingRestaurant(restaurant);
    setRejectionReason(COMMON_REJECTION_REASONS[0]);
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectingRestaurant || !rejectionReason.trim()) return;

    try {
      setActionLoading(true);
      await marketplaceService.updateListingStatus(rejectingRestaurant.id, {
        status: 'rejected',
        reason: rejectionReason.trim(),
        listedPublicly: false,
      });
      showToast(`Listing for "${rejectingRestaurant.name}" was rejected with feedback.`);
      setRejectingRestaurant(null);
      setRejectionReason('');
      await loadData();
    } catch (err) {
      alert('Failed to reject listing: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Remove / Delete action
  const handleOpenDeleteModal = (restaurant) => {
    setDeletingRestaurant(restaurant);
  };

  const handleConfirmDelete = async () => {
    if (!deletingRestaurant) return;
    try {
      setActionLoading(true);
      await marketplaceService.deleteRestaurantListing(deletingRestaurant.id);
      showToast(`Restaurant "${deletingRestaurant.name}" was permanently removed.`);
      setDeletingRestaurant(null);
      await loadData();
    } catch (err) {
      alert('Failed to remove restaurant: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Hide action
  const handleHide = async (restId) => {
    try {
      setActionLoading(true);
      await marketplaceService.updateListingStatus(restId, {
        status: 'hidden',
        listedPublicly: false,
      });
      showToast('Restaurant listing hidden from public marketplace.');
      await loadData();
    } catch (err) {
      alert('Failed to hide listing: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter & Search logic
  const filtered = restaurants.filter((r) => {
    const status = r.listing_status || (r.listed_publicly ? 'approved' : 'hidden');

    if (activeFilter === 'pending' && status !== 'pending') return false;
    if (activeFilter === 'approved' && status !== 'approved') return false;
    if (activeFilter === 'rejected' && status !== 'rejected') return false;
    if (activeFilter === 'hidden' && status !== 'hidden') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (r.name || '').toLowerCase().includes(q);
      const matchCity = (r.city || '').toLowerCase().includes(q);
      const matchArea = (r.area || '').toLowerCase().includes(q);
      const matchSlug = (r.slug || '').toLowerCase().includes(q);
      return matchName || matchCity || matchArea || matchSlug;
    }

    return true;
  });

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedListings = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const pendingCount = restaurants.filter((r) => r.listing_status === 'pending').length;
  const approvedCount = restaurants.filter((r) => r.listing_status === 'approved').length;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg('')} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-[#F0E4D7] shadow-2xs">
        {/* Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-[#2B2118] text-white shadow-xs'
                : 'bg-[#FFF9F2] text-[#7A6A5C] hover:text-[#2B2118] border border-[#F0E4D7]'
            }`}
          >
            All Listings ({restaurants.length})
          </button>

          <button
            onClick={() => setActiveFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'pending'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <span>Waiting for Approval</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white text-amber-800 text-[10px] font-mono font-black">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveFilter('approved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeFilter === 'approved'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            Approved ({approvedCount})
          </button>

          <button
            onClick={() => setActiveFilter('rejected')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeFilter === 'rejected'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            Rejected
          </button>

          <button
            onClick={() => setActiveFilter('hidden')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeFilter === 'hidden'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
            }`}
          >
            Hidden
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-[#7A6A5C] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter by name, area, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2]/50 text-xs font-medium text-[#2B2118] placeholder-[#9E8E81] focus:outline-none focus:ring-1 focus:ring-[#F26B1D]"
          />
        </div>
      </div>

      {/* Listings Grid */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-[#F0E4D7] p-12 text-center">
          <div className="w-8 h-8 border-3 border-[#F26B1D] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs font-bold text-[#7A6A5C]">Loading restaurant listings...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-[#F0E4D7] p-12 text-center">
          <Store className="w-10 h-10 text-[#9E8E81] mx-auto mb-2 opacity-60" />
          <h3 className="font-bold text-sm text-[#2B2118]">No restaurants found</h3>
          <p className="text-xs text-[#7A6A5C] mt-1">
            Try switching filter tabs or changing your search keywords.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {paginatedListings.map((store) => {
              const status = store.listing_status || (store.listed_publicly ? 'approved' : 'hidden');

            return (
              <div
                key={store.id}
                className="bg-white rounded-3xl border border-[#F0E4D7] shadow-xs hover:shadow-md transition p-5 flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Top Store Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={store.logo_url || store.logo}
                        alt={store.name}
                        className="w-12 h-12 rounded-2xl border border-[#F0E4D7] object-cover shrink-0 bg-[#FFF9F2]"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading font-extrabold text-base text-[#2B2118] truncate">
                            {store.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#7A6A5C] mt-0.5">
                          <span className="font-mono text-[#F26B1D] font-bold">/{store.slug}</span>
                          <span>•</span>
                          <span className="truncate">{store.area || store.city}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {status === 'approved' && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Approved & Live</span>
                        </span>
                      )}
                      {status === 'pending' && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200 flex items-center gap-1 animate-pulse">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Pending Review</span>
                        </span>
                      )}
                      {status === 'rejected' && (
                        <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Rejected</span>
                        </span>
                      )}
                      {status === 'hidden' && (
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 flex items-center gap-1">
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Hidden</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Street Address & Phone */}
                  <div className="p-2.5 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] text-xs text-[#2B2118] space-y-1 mb-3">
                    <p className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#F26B1D] shrink-0 mt-0.5" />
                      <span>{store.address || 'Address not specified'}, {store.city}</span>
                    </p>
                    {store.landmark && (
                      <p className="text-[11px] text-[#7A6A5C] pl-5">
                        <span className="font-bold text-[#F26B1D]">Landmark:</span> {store.landmark}
                      </p>
                    )}
                    <p className="flex items-center gap-1.5 text-[11px] text-[#7A6A5C] pl-5">
                      <Phone className="w-3 h-3 text-[#F26B1D]" />
                      <span>+{store.phone || store.whatsapp_number}</span>
                    </p>
                  </div>

                  {/* Leaflet Map Preview with Pin & Delivery Radius/Polygon */}
                  <div className="mb-3">
                    <ListingMapPreview
                      latitude={store.latitude}
                      longitude={store.longitude}
                      deliveryAreas={store.delivery_areas}
                      height="190px"
                    />
                  </div>

                  {/* Cuisines & Operational Details */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    {Array.isArray(store.cuisines) &&
                      store.cuisines.slice(0, 4).map((c, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-lg bg-white border border-[#F0E4D7] text-[10px] font-bold text-[#7A6A5C]"
                        >
                          {c}
                        </span>
                      ))}
                    {Array.isArray(store.cuisines) && store.cuisines.length > 4 && (
                      <span className="text-[10px] font-bold text-[#9E8E81]">
                        +{store.cuisines.length - 4} more
                      </span>
                    )}
                  </div>

                  {/* Rejection reason notice (if rejected) */}
                  {status === 'rejected' && store.rejection_reason && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs mt-2">
                      <span className="font-bold">Rejection Reason:</span> {store.rejection_reason}
                    </div>
                  )}
                </div>

                {/* Action Buttons: Approve / Reject / Hide / View */}
                <div className="pt-3 border-t border-[#F0E4D7] flex flex-wrap items-center justify-between gap-2">
                  <a
                    href={`/${store.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#7A6A5C] hover:text-[#F26B1D] transition"
                  >
                    <span>View Customer Menu</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <div className="flex items-center gap-2">
                    {status !== 'approved' && (
                      <button
                        type="button"
                        onClick={() => handleApprove(store.id)}
                        disabled={actionLoading}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Approve Listing</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenDeleteModal(store)}
                      disabled={actionLoading}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
                      title={`Permanently remove ${store.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Remove</span>
                    </button>

                    {status === 'approved' && (
                      <button
                        type="button"
                        onClick={() => handleHide(store.id)}
                        disabled={actionLoading}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hide</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3.5 rounded-2xl border border-[#F0E4D7] text-xs">
              <span className="text-[#7A6A5C] font-semibold">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of{' '}
                <strong className="text-[#2B2118]">{filtered.length}</strong> listings
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2] hover:bg-[#FFF1E6] font-bold text-[#2B2118] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="font-mono font-bold text-[#2B2118] px-2">
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2] hover:bg-[#FFF1E6] font-bold text-[#2B2118] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reject Modal with Reason Input */}
      {rejectingRestaurant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#F0E4D7] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0E4D7]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-base text-[#2B2118]">
                    Reject Listing Submission
                  </h3>
                  <p className="text-[11px] text-[#7A6A5C]">
                    Provide feedback so the restaurant owner can adjust their listing
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRejectingRestaurant(null)}
                className="p-1.5 rounded-lg text-[#9E8E81] hover:text-[#2B2118] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <p className="text-xs font-bold text-[#2B2118] mb-1">
                  Restaurant: <span className="text-[#F26B1D]">{rejectingRestaurant.name}</span>
                </p>
                <label className="block text-xs font-bold text-[#7A6A5C] uppercase tracking-wider mb-1.5 mt-3">
                  Select Quick Reason:
                </label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2] text-xs font-medium text-[#2B2118] focus:outline-none focus:ring-2 focus:ring-rose-500 mb-2 cursor-pointer"
                >
                  {COMMON_REJECTION_REASONS.map((r, i) => (
                    <option key={i} value={r}>
                      {r}
                    </option>
                  ))}
                  <option value="">-- Type custom feedback below --</option>
                </select>

                <label className="block text-xs font-bold text-[#7A6A5C] uppercase tracking-wider mb-1">
                  Feedback Note for Store Owner:
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why this listing was not approved..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2]/50 text-xs font-medium text-[#2B2118] placeholder-[#9E8E81] focus:outline-none focus:ring-2 focus:ring-rose-500 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F0E4D7]">
                <button
                  type="button"
                  onClick={() => setRejectingRestaurant(null)}
                  className="px-4 py-2 rounded-xl border border-[#F0E4D7] text-xs font-bold text-[#7A6A5C] hover:bg-[#FFF9F2] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete / Remove Modal */}
      {deletingRestaurant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#F0E4D7] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0E4D7]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-base text-[#2B2118]">
                    Remove Restaurant Listing
                  </h3>
                  <p className="text-[11px] text-[#7A6A5C]">
                    Permanently delete this restaurant from the platform
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeletingRestaurant(null)}
                className="p-1.5 rounded-lg text-[#9E8E81] hover:text-[#2B2118] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-100 space-y-1.5">
              <p className="text-xs font-bold text-rose-900">
                Are you sure you want to remove <span className="font-black underline">{deletingRestaurant.name}</span>?
              </p>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                This will unpublish the listing and remove it from the marketplace directory. Customers won't be able to discover this restaurant.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRestaurant(null)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl border border-[#F0E4D7] text-xs font-bold text-[#7A6A5C] hover:bg-[#FFF9F2] transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{actionLoading ? 'Removing...' : 'Confirm Remove'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
