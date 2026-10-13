import React, { useState, useEffect } from 'react';
import {
  Phone,
  Link2,
  Store,
  Check,
  AlertCircle,
  Send,
  Copy,
  Truck,
  ShoppingBag,
  Power,
  Clock,
  Shield,
  Eye,
  EyeOff,
  Key,
  User,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function StoreSettings({ restaurant, onUpdate }) {
  const { user, getRegisteredUsers, updateUserCredentials } = useAuth();

  // Store & Delivery settings state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    whatsapp_number: '',
    is_open: true,
    delivery_mode: 'paid', // 'paid' | 'free' | 'none'
    delivery_fee: 150,
    show_min_order: true,
    min_order_amount: 500,
    show_prep_time: true,
    prep_time: '20–30 mins',
  });

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Manager Credentials state
  const [managerAccount, setManagerAccount] = useState(null);
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [managerName, setManagerName] = useState('');
  const [showManagerPassword, setShowManagerPassword] = useState(false);
  const [credSaved, setCredSaved] = useState(false);
  const [credError, setCredError] = useState('');
  const [credSubmitting, setCredSubmitting] = useState(false);

  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name || '',
        slug: restaurant.slug || '',
        whatsapp_number: restaurant.whatsapp_number || '',
        is_open: restaurant.is_open !== false,
        delivery_mode: restaurant.delivery_mode || (restaurant.delivery_fee === 0 ? 'free' : 'paid'),
        delivery_fee: restaurant.delivery_fee ?? 150,
        show_min_order: restaurant.show_min_order !== false,
        min_order_amount: restaurant.min_order_amount ?? 500,
        show_prep_time: restaurant.show_prep_time !== false,
        prep_time: restaurant.prep_time || '20–30 mins',
      });
    }

    // Load active manager account credentials
    try {
      const allUsers = getRegisteredUsers();
      const current = allUsers.find(
        (u) =>
          (user?.id && u.id === user.id) ||
          (user?.email && u.email.toLowerCase() === user.email.toLowerCase()) ||
          (restaurant?.slug && u.restaurant_slug === restaurant.slug)
      );

      if (current) {
        setManagerAccount(current);
        setManagerEmail(current.email || user?.email || '');
        setManagerPassword(current.password || '');
        setManagerName(current.name || user?.name || 'Restaurant Manager');
      } else if (user) {
        setManagerEmail(user.email || '');
        setManagerName(user.name || 'Restaurant Manager');
      }
    } catch (e) {
      console.warn('Error loading manager credentials:', e);
    }
  }, [restaurant, user, getRegisteredUsers]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (name === 'slug') {
      const cleanSlug = value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
      setFormData((prev) => ({ ...prev, [name]: cleanSlug }));
    } else if (name === 'whatsapp_number') {
      const cleanNumber = value.replace(/\D/g, '');
      setFormData((prev) => ({ ...prev, [name]: cleanNumber }));
    } else if (name === 'delivery_fee' || name === 'min_order_amount') {
      setFormData((prev) => ({ ...prev, [name]: Number(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    setSaved(false);
    setError('');
  };

  const handleTestWhatsApp = () => {
    const cleanNumber = formData.whatsapp_number.replace(/\D/g, '');
    if (!cleanNumber || cleanNumber.length < 8) {
      alert('Please enter a valid WhatsApp phone number with country code first.');
      return;
    }
    const testMsg = encodeURIComponent(
      `👋 *Hello from DineHQ!*\nThis is a test message to confirm your kitchen's WhatsApp order routing is working 100%!`
    );
    window.open(`https://wa.me/${cleanNumber}?text=${testMsg}`, '_blank');
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  const previewMenuUrl = `${origin}/${formData.slug || 'your-slug'}`;

  const handleCopyMenuLink = () => {
    navigator.clipboard.writeText(previewMenuUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStoreSubmit = async (e) => {
    e.preventDefault();
    if (!formData.slug.trim()) {
      setError('Please provide a menu URL slug.');
      return;
    }
    if (!formData.whatsapp_number || formData.whatsapp_number.length < 8) {
      setError('Please enter a valid WhatsApp number with country code (e.g. 923001234567).');
      return;
    }

    try {
      setIsSubmitting(true);
      await onUpdate({
        ...formData,
        delivery_mode: formData.delivery_mode,
        delivery_fee: formData.delivery_mode === 'paid' ? Number(formData.delivery_fee) || 0 : 0,
        show_min_order: Boolean(formData.show_min_order),
        min_order_amount: formData.show_min_order ? Number(formData.min_order_amount) || 0 : 0,
        show_prep_time: Boolean(formData.show_prep_time),
        prep_time: formData.show_prep_time ? formData.prep_time : '',
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update settings.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCredentials = async (e) => {
    e.preventDefault();
    setCredError('');
    setCredSaved(false);

    if (!managerEmail.trim()) {
      setCredError('Email cannot be empty.');
      return;
    }
    if (!managerPassword.trim()) {
      setCredError('Password cannot be empty.');
      return;
    }

    try {
      setCredSubmitting(true);
      const targetUserId = managerAccount?.id || user?.id;
      if (!targetUserId) {
        throw new Error('Unable to resolve active user account ID.');
      }

      await updateUserCredentials(targetUserId, {
        currentEmail: managerAccount?.email || user?.email,
        email: managerEmail.trim(),
        password: managerPassword.trim(),
        name: managerName.trim() || `${formData.name} Manager`,
        restaurant_name: formData.name,
        restaurant_slug: formData.slug,
        whatsapp_number: formData.whatsapp_number,
      });

      setCredSaved(true);
      setTimeout(() => setCredSaved(false), 3500);
    } catch (err) {
      setCredError(err.message || 'Failed to update manager credentials.');
    } finally {
      setCredSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Store Identity & Delivery Options */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-600" />
              Kitchen & Delivery Settings
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Configure store identity, delivery fee options, minimum order, and prep time display.
            </p>
          </div>

          {saved && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold animate-fadeIn">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Settings Saved!</span>
            </span>
          )}
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleStoreSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Restaurant Display Name */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Store Display Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Burger & Smoke Co."
                required
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-emerald-500 transition shadow-2xs"
              />
              <p className="text-[11px] text-slate-500">Displayed at the top of your web menu and flyers.</p>
            </div>

            {/* Kitchen Status Toggle */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Power className="w-3.5 h-3.5 text-emerald-600" />
                Kitchen Operational Status
              </label>
              <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      formData.is_open ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                    }`}
                  ></span>
                  <span className="text-xs font-bold text-slate-800">
                    {formData.is_open ? 'Kitchen is Open (Accepting Orders)' : 'Kitchen is Paused (Orders Blocked)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, is_open: !prev.is_open }))}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    formData.is_open
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  {formData.is_open ? 'Pause Kitchen' : 'Open Kitchen'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                When paused, customers browsing your menu are informed that ordering is temporarily paused.
              </p>
            </div>

            {/* Delivery Fee Setting (Paid / Free / None) */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3 md:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-emerald-600" />
                  Delivery Fee Setting
                </label>
                <span className="text-[11px] text-slate-500">
                  Manager can charge flat delivery, offer free delivery, or hide delivery info entirely.
                </span>
              </div>

              {/* 3 Mode Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, delivery_mode: 'paid' }))}
                  className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                    formData.delivery_mode === 'paid'
                      ? 'bg-emerald-50 border-emerald-500 shadow-xs ring-1 ring-emerald-500'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900 flex items-center justify-between">
                    <span>Flat Delivery Fee</span>
                    <span className="text-emerald-700 font-mono font-bold">Rs. {formData.delivery_fee}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Adds fixed delivery fee to order total and displays on header pill.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, delivery_mode: 'free' }))}
                  className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                    formData.delivery_mode === 'free'
                      ? 'bg-emerald-50 border-emerald-500 shadow-xs ring-1 ring-emerald-500'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900 flex items-center justify-between">
                    <span>Free Delivery</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      FREE
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Shows "Delivery: Free" on menu header; customers are charged Rs. 0.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, delivery_mode: 'none' }))}
                  className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                    formData.delivery_mode === 'none'
                      ? 'bg-emerald-50 border-emerald-500 shadow-xs ring-1 ring-emerald-500'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900 flex items-center justify-between">
                    <span>Don't Mention Delivery</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                      HIDDEN
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Removes delivery mention completely from the storefront header.
                  </p>
                </button>
              </div>

              {formData.delivery_mode === 'paid' && (
                <div className="pt-2 max-w-xs">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Flat Delivery Fee Amount (PKR)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 text-xs font-mono font-bold">
                      Rs.
                    </span>
                    <input
                      type="number"
                      name="delivery_fee"
                      min="0"
                      step="10"
                      value={formData.delivery_fee}
                      onChange={handleChange}
                      placeholder="150"
                      className="w-full pl-12 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm font-mono focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Minimum Order Amount Setting */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                  Minimum Order Requirement
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.show_min_order}
                    onChange={(e) => setFormData((prev) => ({ ...prev, show_min_order: e.target.checked }))}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    {formData.show_min_order ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>

              {formData.show_min_order ? (
                <div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 text-xs font-mono font-bold">
                      Rs.
                    </span>
                    <input
                      type="number"
                      name="min_order_amount"
                      min="0"
                      step="50"
                      value={formData.min_order_amount}
                      onChange={handleChange}
                      placeholder="500"
                      className="w-full pl-12 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm font-mono focus:outline-none focus:border-emerald-500 transition shadow-2xs"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Orders below this subtotal will prompt customers to add more items.
                  </p>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-100/70 text-slate-600 text-[11px]">
                  ✓ Minimum order is disabled. It won't be mentioned on your menu, and customers can order any amount.
                </div>
              )}
            </div>

            {/* Estimated Prep Time Setting */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  Estimated Prep Time Display
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.show_prep_time}
                    onChange={(e) => setFormData((prev) => ({ ...prev, show_prep_time: e.target.checked }))}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    {formData.show_prep_time ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>

              {formData.show_prep_time ? (
                <div>
                  <input
                    type="text"
                    name="prep_time"
                    value={formData.prep_time}
                    onChange={handleChange}
                    placeholder="e.g. 20–30 mins"
                    className="w-full px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-emerald-500 transition shadow-2xs"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Displayed with a clock icon on the storefront banner to set diner expectations.
                  </p>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-100/70 text-slate-600 text-[11px]">
                  ✓ Prep time is hidden. It will not be shown on your customer menu banner.
                </div>
              )}
            </div>

            {/* WhatsApp Routing */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  WhatsApp Kitchen Phone
                </label>
                <button
                  type="button"
                  onClick={handleTestWhatsApp}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition cursor-pointer"
                  title="Send a sample WhatsApp message to verify this number"
                >
                  <Send className="w-3 h-3" />
                  <span>Test Number</span>
                </button>
              </div>
              <input
                type="text"
                name="whatsapp_number"
                value={formData.whatsapp_number}
                onChange={handleChange}
                placeholder="e.g. 923001234567"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm font-mono focus:outline-none focus:border-emerald-500 transition shadow-2xs"
              />
              <p className="text-[11px] text-slate-500">
                Include country code. Customer orders arrive directly here in formatted WhatsApp text.
              </p>
            </div>

            {/* Custom Slug with Copy & Preview */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-emerald-600" />
                  Custom Menu URL Slug
                </label>
                <button
                  type="button"
                  onClick={handleCopyMenuLink}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                placeholder="e.g. burgersmoke"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm font-mono focus:outline-none focus:border-emerald-500 transition shadow-2xs"
              />
              <p className="text-[11px] text-slate-500 truncate">
                Public link: <span className="text-emerald-700 font-mono font-bold">{previewMenuUrl}</span>
              </p>
            </div>
          </div>

          {/* Submit Store Changes */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isSubmitting ? 'Saving Kitchen Settings...' : 'Save Kitchen Settings'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Manager Login Credentials & Profile Management */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              Manager Login Credentials & Profile
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              View your active login credentials, reveal your password, and update your manager email or password.
            </p>
          </div>

          {credSaved && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold animate-fadeIn">
              <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Credentials Updated!</span>
            </span>
          )}
        </div>

        {credError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{credError}</span>
          </div>
        )}

        <form onSubmit={handleSaveCredentials} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Manager Name */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                Manager Full Name
              </label>
              <input
                type="text"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                placeholder="e.g. Burger & Smoke Manager"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-indigo-500 transition shadow-2xs"
              />
              <p className="text-[11px] text-slate-500">Your profile display name in the dashboard.</p>
            </div>

            {/* Login Email */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-600" />
                Manager Login Email
              </label>
              <input
                type="email"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
                placeholder="manager@yourstore.com"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm font-mono focus:outline-none focus:border-indigo-500 transition shadow-2xs"
              />
              <p className="text-[11px] text-slate-500">Used to sign into your restaurant management portal.</p>
            </div>

            {/* Manager Password with View Toggle */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  Manager Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowManagerPassword(!showManagerPassword)}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition"
                >
                  {showManagerPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showManagerPassword ? 'Hide Password' : 'View Password'}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showManagerPassword ? 'text' : 'password'}
                  value={managerPassword}
                  onChange={(e) => setManagerPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-sm font-mono focus:outline-none focus:border-indigo-500 transition shadow-2xs"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Click "View Password" above to inspect your password in plain text.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={credSubmitting}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{credSubmitting ? 'Updating Credentials...' : 'Update Login Credentials'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
