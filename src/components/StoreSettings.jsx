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
  Upload,
  Image as ImageIcon,
  X,
  Lock,
  Palette,
  Printer,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { printerService } from '../services/printer/printerService';
import { DRIVER_IDS, PAPER_SIZE_SPECS } from '../services/printer/printerTypes';
import PrintersSection from './Printer/PrintersSection';
import PrintTemplatesSection from './Printer/PrintTemplatesSection';

const BRAND_PRESET_COLORS = [
  { name: 'Warm Orange (Default)', value: '#F26B1D' },
  { name: 'Chili Crimson', value: '#E53935' },
  { name: 'Golden Amber', value: '#F5A623' },
  { name: 'Fresh Herb Green', value: '#1F9D55' },
  { name: 'Royal Plum', value: '#7C3AED' },
  { name: 'Espresso Brown', value: '#8B4513' },
];

export default function StoreSettings({ restaurant, onUpdate, onOpenPrinterSettings, categories = [] }) {
  const { user, getRegisteredUsers, updateUserCredentials } = useAuth();
  const [printerConfig, setPrinterConfig] = useState(() => printerService.getConfig());
  const [isTestingPrint, setIsTestingPrint] = useState(false);
  const [printTestStatus, setPrintTestStatus] = useState(null);

  useEffect(() => {
    return printerService.subscribe((cfg) => setPrinterConfig(cfg));
  }, []);

  const handleTestPrint = async () => {
    try {
      setIsTestingPrint(true);
      setPrintTestStatus(null);
      const res = await printerService.printTestPage();
      if (res.usedFallback) {
        setPrintTestStatus({
          type: 'warning',
          text: `Test ticket opened via Browser Print (${res.message}).`,
        });
      } else {
        setPrintTestStatus({
          type: 'success',
          text: 'Test ticket printed successfully!',
        });
      }
      setTimeout(() => setPrintTestStatus(null), 5000);
    } catch (err) {
      setPrintTestStatus({
        type: 'error',
        text: `Print test failed: ${err.message}`,
      });
      setTimeout(() => setPrintTestStatus(null), 6000);
    } finally {
      setIsTestingPrint(false);
    }
  };

  const getPrinterDriverLabel = () => {
    switch (printerConfig.driver) {
      case DRIVER_IDS.USB:
        return printerConfig.usbDeviceName ? `USB (${printerConfig.usbDeviceName})` : 'USB Thermal Printer';
      case DRIVER_IDS.BLUETOOTH:
        return printerConfig.bluetoothDeviceName ? `Bluetooth (${printerConfig.bluetoothDeviceName})` : 'Bluetooth Thermal';
      case DRIVER_IDS.RAWBT:
        return 'Android RawBT App';
      case DRIVER_IDS.NETWORK:
        return printerConfig.network?.ip ? `Network Printer (${printerConfig.network.ip})` : 'WiFi / Network Printer';
      case DRIVER_IDS.CLOUD:
        return 'Cloud Print (PrintNode)';
      case DRIVER_IDS.BROWSER:
      default:
        return 'Standard Printer (Browser Print)';
    }
  };

  // Store & Delivery settings state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    whatsapp_number: '',
    logo_url: '',
    primary_color: '#F26B1D',
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

  // Manager Credentials & Password state
  const [managerAccount, setManagerAccount] = useState(null);
  const [managerEmail, setManagerEmail] = useState('');
  const [managerName, setManagerName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [credSaved, setCredSaved] = useState(false);
  const [credError, setCredError] = useState('');
  const [credSubmitting, setCredSubmitting] = useState(false);
  const [pwdSaved, setPwdSaved] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSubmitting, setPwdSubmitting] = useState(false);

  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name || '',
        slug: restaurant.slug || '',
        whatsapp_number: restaurant.whatsapp_number || '',
        logo_url: restaurant.logo_url || '',
        primary_color: restaurant.primary_color || '#F26B1D',
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

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo image file must be smaller than 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, logo_url: reader.result }));
    };
    reader.readAsDataURL(file);
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
        logo_url: formData.logo_url?.trim() || null,
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

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setCredError('');
    setCredSaved(false);

    if (!managerEmail.trim()) {
      setCredError('Email cannot be empty.');
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
        name: managerName.trim() || `${formData.name} Manager`,
        restaurant_name: formData.name,
        restaurant_slug: formData.slug,
        whatsapp_number: formData.whatsapp_number,
      });

      setCredSaved(true);
      setTimeout(() => setCredSaved(false), 3500);
    } catch (err) {
      setCredError(err.message || 'Failed to update manager profile.');
    } finally {
      setCredSubmitting(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSaved(false);

    if (!currentPassword) {
      setPwdError('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setPwdError('New password must be at least 4 characters long.');
      return;
    }

    if (managerAccount?.password && currentPassword !== managerAccount.password) {
      setPwdError('The current password you entered is incorrect.');
      return;
    }

    try {
      setPwdSubmitting(true);
      const targetUserId = managerAccount?.id || user?.id;
      if (!targetUserId) {
        throw new Error('Unable to resolve active user account ID.');
      }

      await updateUserCredentials(targetUserId, {
        currentEmail: managerAccount?.email || user?.email,
        password: newPassword.trim(),
      });

      setManagerAccount((prev) => (prev ? { ...prev, password: newPassword.trim() } : null));
      setCurrentPassword('');
      setNewPassword('');
      setPwdSaved(true);
      setTimeout(() => setPwdSaved(false), 3500);
    } catch (err) {
      setPwdError(err.message || 'Failed to change password.');
    } finally {
      setPwdSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Quick Section Anchor Pills */}
      <div className="flex flex-wrap items-center gap-2 p-2 bg-white border border-[#F0E4D7] rounded-2xl shadow-2xs">
        <a
          href="#store-profile"
          className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#7A6A5C] hover:text-[#2B2118] hover:bg-[#FFF1E6]/60 transition"
        >
          Store Identity
        </a>
        <a
          href="#printers-section"
          className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#7A6A5C] hover:text-[#2B2118] hover:bg-[#FFF1E6]/60 transition"
        >
          Printers & Hardware
        </a>
        <a
          href="#templates-section"
          className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#F26B1D] bg-[#FFF1E6] transition"
        >
          Print Templates & Live Preview
        </a>
        <a
          href="#manager-profile"
          className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#7A6A5C] hover:text-[#2B2118] hover:bg-[#FFF1E6]/60 transition"
        >
          Manager Password
        </a>
      </div>

      {/* 1. Store Identity & Delivery Options */}
      <div id="store-profile" className="bg-white border border-[#F0E4D7] rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#F0E4D7]">
          <div>
            <h2 className="text-xl font-heading font-extrabold text-[#2B2118] tracking-tight flex items-center gap-2">
              <Store className="w-5 h-5 text-[#F26B1D]" />
              Kitchen & Delivery Settings
            </h2>
            <p className="text-xs sm:text-sm text-[#7A6A5C] mt-0.5">
              Configure store identity, delivery fee options, minimum order, and prep time display.
            </p>
          </div>

          {saved && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E7F6EC] text-[#1F9D55] border border-[#C0E9CE] text-xs font-bold animate-fadeIn">
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
            <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-2">
              <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider">
                Store Display Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Burger & Smoke Co."
                required
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#F0E4D7] text-[#2B2118] text-sm focus:outline-none focus:border-[#F26B1D] transition shadow-2xs"
              />
              <p className="text-[11px] text-[#7A6A5C]">Displayed at the top of your web menu and receipts.</p>
            </div>

            {/* Kitchen Status Toggle */}
            <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-2">
              <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider flex items-center gap-1.5">
                <Power className="w-3.5 h-3.5 text-[#F26B1D]" />
                Kitchen Operational Status
              </label>
              <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#F0E4D7]">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      formData.is_open ? 'bg-[#1F9D55] animate-pulse' : 'bg-[#D92D20]'
                    }`}
                  ></span>
                  <span className="text-xs font-bold text-[#2B2118]">
                    {formData.is_open ? 'Kitchen is Open (Accepting Orders)' : 'Kitchen is Paused (Orders Blocked)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, is_open: !prev.is_open }))}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    formData.is_open
                      ? 'bg-[#FDECEC] text-[#D92D20] border border-[#F9C3C5] hover:bg-[#F9C3C5]'
                      : 'bg-[#E7F6EC] text-[#1F9D55] border border-[#C0E9CE] hover:bg-[#C0E9CE]'
                  }`}
                >
                  {formData.is_open ? 'Pause Kitchen' : 'Open Kitchen'}
                </button>
              </div>
              <p className="text-[11px] text-[#7A6A5C]">
                When paused, customers browsing your menu are informed that ordering is temporarily paused.
              </p>
            </div>

            {/* Restaurant Brand Logo */}
            <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-3 md:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#F26B1D]" />
                  Store Brand Logo & Receipt Header
                </label>
                <span className="text-[11px] text-[#7A6A5C]">
                  Displayed on your customer web menu, storefront banner, and printed on order receipts.
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3.5 rounded-xl border border-[#F0E4D7]">
                {/* Logo Preview */}
                <div className="w-20 h-20 rounded-xl bg-[#FFF9F2] border-2 border-dashed border-[#F0E4D7] flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                  {formData.logo_url ? (
                    <img
                      src={formData.logo_url}
                      alt="Store Logo Preview"
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <div className="text-center p-1">
                      <Store className="w-6 h-6 text-[#9E8E81] mx-auto" />
                      <span className="text-[9px] text-[#9E8E81] font-bold block mt-0.5">No Logo</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2.5 w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="px-3.5 py-1.5 rounded-xl bg-[#FFF1E6] hover:bg-[#FCD8BF] text-[#F26B1D] text-xs font-bold border border-[#FCD8BF] cursor-pointer transition flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Logo File</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>

                    {formData.logo_url && (
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, logo_url: '' }))}
                        className="px-3 py-1.5 rounded-xl bg-[#FDECEC] hover:bg-[#F9C3C5] text-[#D92D20] text-xs font-bold border border-[#F9C3C5] transition cursor-pointer flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Remove Logo</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-[#7A6A5C]">
                      Or Paste Image URL:
                    </label>
                    <input
                      type="url"
                      name="logo_url"
                      value={formData.logo_url}
                      onChange={handleChange}
                      placeholder="https://example.com/logo.png"
                      className="w-full px-3 py-1.5 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-[#2B2118] text-xs focus:outline-none focus:border-[#F26B1D] transition"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Store Brand Primary Color (Web Menu Theme) */}
            <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-3 md:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-[#F26B1D]" />
                  Brand Primary Color (Customer Menu Theme)
                </label>
                <span className="text-[11px] text-[#7A6A5C]">
                  Choose your brand's primary color for buttons, badges, and active tabs on the public menu.
                </span>
              </div>

              {/* Color Swatches Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {BRAND_PRESET_COLORS.map((preset) => {
                  const isSelected = (formData.primary_color || '#F26B1D').toLowerCase() === preset.value.toLowerCase();
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, primary_color: preset.value }))}
                      className={`p-2.5 rounded-xl border flex flex-col items-center text-center gap-1.5 transition cursor-pointer ${
                        isSelected
                          ? 'border-[#F26B1D] bg-[#FFF1E6] ring-2 ring-[#F26B1D]'
                          : 'border-[#F0E4D7] bg-white hover:border-[#FCD8BF]'
                      }`}
                    >
                      <span
                        className="w-6 h-6 rounded-full shadow-2xs flex items-center justify-center text-white"
                        style={{ backgroundColor: preset.value }}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </span>
                      <span className="text-[10px] font-bold text-[#2B2118] leading-tight">
                        {preset.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Hex Color Picker & Live Button Preview */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-[#F0E4D7]">
                <div className="flex items-center gap-2.5">
                  <label className="text-xs font-bold text-[#7A6A5C]">Custom Color:</label>
                  <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-[#F0E4D7]">
                    <input
                      type="color"
                      name="primary_color"
                      value={formData.primary_color || '#F26B1D'}
                      onChange={handleChange}
                      className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                      title="Choose custom color"
                    />
                    <input
                      type="text"
                      name="primary_color"
                      value={formData.primary_color || '#F26B1D'}
                      onChange={handleChange}
                      placeholder="#F26B1D"
                      maxLength={7}
                      className="w-20 font-mono text-xs font-bold text-[#2B2118] focus:outline-none uppercase"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-[#7A6A5C]">Menu Button Preview:</span>
                  <div
                    className="px-3.5 py-1.5 rounded-xl text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                    style={{ backgroundColor: formData.primary_color || '#F26B1D' }}
                  >
                    <span>+ Add to Order</span>
                  </div>
                </div>
              </div>
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
                      ? 'bg-[#FFF1E6] border-[#F26B1D] shadow-xs ring-1 ring-[#F26B1D]'
                      : 'bg-white border-[#F0E4D7] hover:border-[#FCD8BF]'
                  }`}
                >
                  <p className="text-xs font-bold text-[#2B2118] flex items-center justify-between">
                    <span>Flat Delivery Fee</span>
                    <span className="text-[#F26B1D] font-mono font-bold">Rs. {formData.delivery_fee}</span>
                  </p>
                  <p className="text-[11px] text-[#7A6A5C] mt-1">
                    Adds fixed delivery fee to order total and displays on header pill.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, delivery_mode: 'free' }))}
                  className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                    formData.delivery_mode === 'free'
                      ? 'bg-[#FFF1E6] border-[#F26B1D] shadow-xs ring-1 ring-[#F26B1D]'
                      : 'bg-white border-[#F0E4D7] hover:border-[#FCD8BF]'
                  }`}
                >
                  <p className="text-xs font-bold text-[#2B2118] flex items-center justify-between">
                    <span>Free Delivery</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#E7F6EC] text-[#1F9D55] text-[10px] font-bold">
                      FREE
                    </span>
                  </p>
                  <p className="text-[11px] text-[#7A6A5C] mt-1">
                    Shows "Delivery: Free" on menu header; customers are charged Rs. 0.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, delivery_mode: 'none' }))}
                  className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                    formData.delivery_mode === 'none'
                      ? 'bg-[#FFF1E6] border-[#F26B1D] shadow-xs ring-1 ring-[#F26B1D]'
                      : 'bg-white border-[#F0E4D7] hover:border-[#FCD8BF]'
                  }`}
                >
                  <p className="text-xs font-bold text-[#2B2118] flex items-center justify-between">
                    <span>Don't Mention Delivery</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#FFF9F2] text-[#7A6A5C] text-[10px] font-bold border border-[#F0E4D7]">
                      HIDDEN
                    </span>
                  </p>
                  <p className="text-[11px] text-[#7A6A5C] mt-1">
                    Removes delivery mention completely from the storefront header.
                  </p>
                </button>
              </div>

              {formData.delivery_mode === 'paid' && (
                <div className="pt-2 max-w-xs">
                  <label className="block text-[11px] font-bold text-[#7A6A5C] mb-1">
                    Flat Delivery Fee Amount (PKR)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#9E8E81] text-xs font-mono font-bold">
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
                      className="w-full pl-12 pr-4 py-2 rounded-xl bg-white border border-[#F0E4D7] text-[#2B2118] text-sm font-mono focus:outline-none focus:border-[#F26B1D] transition"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Minimum Order Amount Setting */}
            <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-[#F26B1D]" />
                  Minimum Order Requirement
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.show_min_order}
                    onChange={(e) => setFormData((prev) => ({ ...prev, show_min_order: e.target.checked }))}
                    className="w-4 h-4 rounded text-[#F26B1D] focus:ring-[#F26B1D] cursor-pointer"
                  />
                  <span className="text-xs font-bold text-[#2B2118]">
                    {formData.show_min_order ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>

              {formData.show_min_order ? (
                <div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#9E8E81] text-xs font-mono font-bold">
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
                      className="w-full pl-12 pr-4 py-2 rounded-xl bg-white border border-[#F0E4D7] text-[#2B2118] text-sm font-mono focus:outline-none focus:border-[#F26B1D] transition shadow-2xs"
                    />
                  </div>
                  <p className="text-[11px] text-[#7A6A5C] mt-1.5">
                    Orders below this subtotal will prompt customers to add more items.
                  </p>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-[#FFF1E6] text-[#7A6A5C] text-[11px] border border-[#F0E4D7]">
                  ✓ Minimum order is disabled. It won't be mentioned on your menu, and customers can order any amount.
                </div>
              )}
            </div>

            {/* Estimated Prep Time Setting */}
            <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#F26B1D]" />
                  Estimated Prep Time Display
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.show_prep_time}
                    onChange={(e) => setFormData((prev) => ({ ...prev, show_prep_time: e.target.checked }))}
                    className="w-4 h-4 rounded text-[#F26B1D] focus:ring-[#F26B1D] cursor-pointer"
                  />
                  <span className="text-xs font-bold text-[#2B2118]">
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
                    className="w-full px-4 py-2 rounded-xl bg-white border border-[#F0E4D7] text-[#2B2118] text-sm focus:outline-none focus:border-[#F26B1D] transition shadow-2xs"
                  />
                  <p className="text-[11px] text-[#7A6A5C] mt-1.5">
                    Displayed with a clock icon on the storefront banner to set diner expectations.
                  </p>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-[#FFF1E6] text-[#7A6A5C] text-[11px] border border-[#F0E4D7]">
                  ✓ Prep time is hidden. It will not be shown on your customer menu banner.
                </div>
              )}
            </div>

            {/* WhatsApp Routing */}
            <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#F26B1D]" />
                  WhatsApp Kitchen Phone
                </label>
                <button
                  type="button"
                  onClick={handleTestWhatsApp}
                  className="text-[11px] font-bold text-[#F26B1D] hover:text-[#D95A12] flex items-center gap-1 transition cursor-pointer"
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
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#F0E4D7] text-[#2B2118] text-sm font-mono focus:outline-none focus:border-[#F26B1D] transition shadow-2xs"
              />
              <p className="text-[11px] text-[#7A6A5C]">
                Include country code. Customer orders arrive directly here in formatted WhatsApp text.
              </p>
            </div>

            {/* Custom Slug with Copy & Preview */}
            <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-[#F26B1D]" />
                  Custom Menu URL Slug
                </label>
                <button
                  type="button"
                  onClick={handleCopyMenuLink}
                  className="text-[11px] font-bold text-[#7A6A5C] hover:text-[#2B2118] flex items-center gap-1 transition cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-[#1F9D55]" /> : <Copy className="w-3 h-3" />}
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
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#F0E4D7] text-[#2B2118] text-sm font-mono focus:outline-none focus:border-[#F26B1D] transition shadow-2xs"
              />
              <p className="text-[11px] text-[#7A6A5C] truncate">
                Public link: <span className="text-[#F26B1D] font-mono font-bold">{previewMenuUrl}</span>
              </p>
            </div>
          </div>

          {/* Submit Store Changes */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-500/20 transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isSubmitting ? 'Saving Kitchen Settings...' : 'Save Kitchen Settings'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Printers Management Section */}
      <PrintersSection categories={categories} />

      {/* 3. Print Templates & Live Preview Customization */}
      <div id="templates-section">
        <PrintTemplatesSection restaurant={restaurant} />
      </div>

      {/* 4. Manager Login Profile & Change Password */}
      <div id="manager-profile" className="bg-white border border-[#F0E4D7] rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
        <div className="pb-5 border-b border-[#F0E4D7]">
          <h2 className="text-xl font-heading font-extrabold text-[#2B2118] tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#F26B1D]" />
            Manager Profile & Password
          </h2>
          <p className="text-xs sm:text-sm text-[#7A6A5C] mt-0.5">
            Update your manager account profile or securely change your manager login password.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Form: Profile Details */}
          <form onSubmit={handleSaveProfile} className="p-5 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#F0E4D7]">
                <h3 className="text-sm font-bold text-[#2B2118] flex items-center gap-2">
                  <User className="w-4 h-4 text-[#F26B1D]" />
                  Manager Profile
                </h3>
                {credSaved && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1F9D55] bg-[#E7F6EC] px-2 py-0.5 rounded-full border border-[#C0E9CE]">
                    <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                    Profile Updated
                  </span>
                )}
              </div>

              {credError && (
                <div className="p-3 rounded-xl bg-[#FDECEC] border border-[#F9C3C5] text-[#D92D20] text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-[#D92D20] shrink-0" />
                  <span>{credError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider">
                  Manager Full Name
                </label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="e.g. Burger & Smoke Manager"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#F0E4D7] text-[#2B2118] text-sm focus:outline-none focus:border-[#F26B1D] transition shadow-2xs"
                />
                <p className="text-[11px] text-[#7A6A5C]">Your profile display name in the dashboard.</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider">
                  Manager Login Email
                </label>
                <input
                  type="email"
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  placeholder="manager@yourstore.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#F0E4D7] text-[#2B2118] text-sm font-mono focus:outline-none focus:border-[#F26B1D] transition shadow-2xs"
                />
                <p className="text-[11px] text-[#7A6A5C]">Used to sign in to your restaurant management portal.</p>
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                disabled={credSubmitting}
                className="px-5 py-2.5 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white font-bold text-xs shadow-md shadow-orange-500/20 transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{credSubmitting ? 'Saving Profile...' : 'Save Profile'}</span>
              </button>
            </div>
          </form>

          {/* Right Form: Change Password */}
          <form onSubmit={handleChangePassword} className="p-5 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#F0E4D7]">
                <h3 className="text-sm font-bold text-[#2B2118] flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#F26B1D]" />
                  Change Password
                </h3>
                {pwdSaved && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1F9D55] bg-[#E7F6EC] px-2 py-0.5 rounded-full border border-[#C0E9CE]">
                    <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                    Password Changed!
                  </span>
                )}
              </div>

              {pwdError && (
                <div className="p-3 rounded-xl bg-[#FDECEC] border border-[#F9C3C5] text-[#D92D20] text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-[#D92D20] shrink-0" />
                  <span>{pwdError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#F0E4D7] text-[#2B2118] text-sm font-mono focus:outline-none focus:border-[#F26B1D] transition shadow-2xs"
                />
                <p className="text-[11px] text-[#7A6A5C]">Provide your existing manager login password.</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 4 characters)"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#F0E4D7] text-[#2B2118] text-sm font-mono focus:outline-none focus:border-[#F26B1D] transition shadow-2xs"
                />
                <p className="text-[11px] text-[#7A6A5C]">Set a secure new password for your account.</p>
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                disabled={pwdSubmitting}
                className="px-5 py-2.5 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white font-bold text-xs shadow-md shadow-orange-500/20 transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{pwdSubmitting ? 'Updating...' : 'Change Password'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
