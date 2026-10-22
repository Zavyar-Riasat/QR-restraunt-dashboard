import React, { useState, useEffect } from 'react';
import {
  Bike,
  Share2,
  Copy,
  UserCheck,
  Check,
  ChevronDown,
  X,
  Phone,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { riderService } from '../../services/riderService';
import { orderService } from '../../services/orderService';

export default function SendToRiderMenu({
  order,
  restaurant,
  onRiderAssigned,
  className = '',
  buttonSize = 'default', // 'default' | 'sm'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [riders, setRiders] = useState(() =>
    riderService.getRiders(restaurant?.id || 'rest-101')
  );
  const [newRiderName, setNewRiderName] = useState('');
  const [newRiderPhone, setNewRiderPhone] = useState('');
  const [isAddingRider, setIsAddingRider] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const restId = restaurant?.id || 'rest-101';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const riderToken = order?.rider_token || order?.id;
  const riderUrl = `${origin}/rider/${riderToken}`;

  // Keep riders updated if new riders are added in Settings
  useEffect(() => {
    const handleRidersChanged = (e) => {
      if (e.detail?.riders) {
        setRiders(e.detail.riders);
      }
    };
    window.addEventListener('dinehq_riders_updated', handleRidersChanged);
    return () => window.removeEventListener('dinehq_riders_updated', handleRidersChanged);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Share via Web Share API with Copy Link fallback
  const handleShare = async () => {
    setIsOpen(false);
    const shareData = {
      title: `Delivery #${order.id} • ${restaurant?.name || 'DineHQ'}`,
      text: `Deliver to ${order.customer_name || 'Customer'}: ${order.customer_address || ''}. Total: Rs. ${order.total_payable}`,
      url: riderUrl,
    };

    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        showToast('Shared successfully!');
      } catch (err) {
        if (err.name !== 'AbortError') {
          // Fallback to clipboard copy
          handleCopy();
        }
      }
    } else {
      // Fallback to clipboard copy
      handleCopy();
    }
  };

  // 2. Copy Link
  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(riderUrl);
      setIsCopied(true);
      showToast('Rider link copied to clipboard!');
      setTimeout(() => setIsCopied(false), 2500);
    }
    setIsOpen(false);
  };

  // 3. Assign Rider
  const handleSelectRider = (rider) => {
    orderService.assignRiderToOrder(restId, order.id, rider);
    if (onRiderAssigned) {
      onRiderAssigned(order.id, rider);
    }
    setIsAssignModalOpen(false);
    setIsOpen(false);
    showToast(rider ? `Assigned to ${rider.name}` : 'Rider unassigned');
  };

  const handleAddNewRider = (e) => {
    e.preventDefault();
    if (!newRiderName.trim() || !newRiderPhone.trim()) return;
    try {
      const added = riderService.addRider(restId, {
        name: newRiderName.trim(),
        phone: newRiderPhone.trim(),
      });
      setRiders((prev) => [added, ...prev]);
      setNewRiderName('');
      setNewRiderPhone('');
      setIsAddingRider(false);
      handleSelectRider(added);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className={`relative inline-block text-left ${className}`}>
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-[999] bg-[#2B2118] text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-[#1F9D55]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main "Send to Rider" Button */}
      <button
        type="button"
        id={`send-to-rider-btn-${order.id}`}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`inline-flex items-center gap-1.5 rounded-xl font-bold transition cursor-pointer shadow-2xs ${
          buttonSize === 'sm'
            ? 'px-2.5 py-1 text-[11px] bg-[#FFF1E6] text-[#F26B1D] border border-[#FCD8BF] hover:bg-[#FDE2CF]'
            : 'px-3 py-1.5 text-xs bg-[#FFF1E6] text-[#F26B1D] border border-[#FCD8BF] hover:bg-[#FDE2CF]'
        }`}
        title="Send delivery order link to rider"
      >
        <Bike className="w-3.5 h-3.5 stroke-[2.5]" />
        <span>Send to Rider</span>
        <ChevronDown className="w-3 h-3 opacity-70" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          />
          <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3.5 py-1.5 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>Rider Dispatch</span>
              {order.assigned_rider && (
                <span className="text-[#1F9D55] font-bold">
                  ✓ {order.assigned_rider.name.split(' ')[0]}
                </span>
              )}
            </div>

            {/* 1. Share (Native Phone Sheet / Web Share) */}
            <button
              type="button"
              id={`rider-share-btn-${order.id}`}
              onClick={(e) => {
                e.stopPropagation();
                handleShare();
              }}
              className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-[#FFF1E6] hover:text-[#F26B1D] flex items-center gap-2.5 transition cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-[#F26B1D]" />
              <span>Share Delivery Link</span>
            </button>

            {/* 2. Copy Link */}
            <button
              type="button"
              id={`rider-copy-btn-${order.id}`}
              onClick={(e) => {
                e.stopPropagation();
                handleCopy();
              }}
              className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-[#FFF1E6] hover:text-[#F26B1D] flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                {isCopied ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-500" />
                )}
                <span>{isCopied ? 'Link Copied!' : 'Copy Link'}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono font-normal">URL</span>
            </button>

            {/* 3. Assign Rider */}
            <button
              type="button"
              id={`rider-assign-btn-${order.id}`}
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                setIsAssignModalOpen(true);
              }}
              className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-[#FFF1E6] hover:text-[#F26B1D] flex items-center justify-between transition cursor-pointer border-t border-slate-100"
            >
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                <span>Assign Rider</span>
              </div>
              {order.assigned_rider && (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                  Assigned
                </span>
              )}
            </button>

            {/* Direct Open Link preview */}
            <div className="pt-1 mt-1 border-t border-slate-100">
              <a
                href={riderUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="w-full px-3.5 py-1.5 text-left text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-between"
              >
                <span>Preview Rider Page</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </>
      )}

      {/* Assign Rider Modal */}
      {isAssignModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => {
            e.stopPropagation();
            setIsAssignModalOpen(false);
          }}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Bike className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-[#2B2118] text-sm">
                    Assign Delivery Rider
                  </h3>
                  <p className="text-[10px] text-[#7A6A5C]">
                    Order #{order.id} • {order.customer_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Currently Assigned Rider Indicator */}
            {order.assigned_rider && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    Currently Assigned
                  </p>
                  <p className="text-xs font-bold text-emerald-950">
                    {order.assigned_rider.name} • {order.assigned_rider.phone}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectRider(null)}
                  className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  Unassign
                </button>
              </div>
            )}

            {/* Riders List */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 divide-y divide-slate-100">
              {riders.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No riders found. Add your first rider below.
                </div>
              ) : (
                riders.map((r) => {
                  const isAssigned = order.assigned_rider?.id === r.id;
                  return (
                    <div
                      key={r.id}
                      className="pt-1.5 first:pt-0 flex items-center justify-between hover:bg-slate-50 p-2 rounded-xl transition"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#FFF1E6] text-[#F26B1D] font-bold text-xs flex items-center justify-center">
                          {r.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#2B2118]">{r.name}</p>
                          <a
                            href={`tel:${r.phone}`}
                            className="text-[10px] font-mono text-[#7A6A5C] hover:text-[#2B2118] flex items-center gap-1"
                          >
                            <Phone className="w-2.5 h-2.5" />
                            <span>{r.phone}</span>
                          </a>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectRider(r)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                          isAssigned
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 hover:bg-[#F26B1D] text-slate-700 hover:text-white'
                        }`}
                      >
                        {isAssigned ? 'Assigned' : 'Assign'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Add Rider Form */}
            {isAddingRider ? (
              <form
                onSubmit={handleAddNewRider}
                className="p-3 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-2 text-xs"
              >
                <div className="font-bold text-[#2B2118] text-[11px] uppercase tracking-wider">
                  New Rider Details
                </div>
                <input
                  type="text"
                  placeholder="Rider Full Name"
                  required
                  value={newRiderName}
                  onChange={(e) => setNewRiderName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#F0E4D7] text-xs focus:outline-none focus:border-[#F26B1D]"
                />
                <input
                  type="tel"
                  placeholder="Phone Number (e.g. 0300 1234567)"
                  required
                  value={newRiderPhone}
                  onChange={(e) => setNewRiderPhone(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#F0E4D7] text-xs font-mono focus:outline-none focus:border-[#F26B1D]"
                />
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-1.5 rounded-xl bg-[#F26B1D] text-white font-bold hover:bg-[#D95A12] transition cursor-pointer"
                  >
                    Save & Assign
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingRider(false)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-[#F0E4D7] text-[#7A6A5C] font-bold hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingRider(true)}
                className="w-full py-2 rounded-xl border border-dashed border-[#F0E4D7] hover:border-[#F26B1D] text-[#F26B1D] font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-[#FFF9F2] transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Rider to Fleet</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
