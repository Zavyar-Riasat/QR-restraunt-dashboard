import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  UtensilsCrossed,
  UserPlus,
  Users,
  Store,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  Search,
  Eye,
  EyeOff,
  RefreshCw,
  LogOut,
  ArrowRight,
  Phone,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Pencil,
  X,
  Key,
} from 'lucide-react';

export default function AdminPanelPage() {
  const navigate = useNavigate();
  const { user, logout, registerUser, getRegisteredUsers, deleteUser, updateUserCredentials } = useAuth();

  // Directory state
  const [usersList, setUsersList] = useState(() => getRegisteredUsers());
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [revealedPasswords, setRevealedPasswords] = useState({});

  // Editing credentials modal state
  const [editingAccount, setEditingAccount] = useState(null);
  const [editForm, setEditForm] = useState({
    email: '',
    password: '',
    restaurant_name: '',
    slug: '',
    whatsapp_number: '',
    role: 'owner',
  });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState('');
  const [editErrorMsg, setEditErrorMsg] = useState('');

  // Form registration state
  const [form, setForm] = useState({
    restaurant_name: '',
    slug: '',
    email: '',
    password: '',
    whatsapp_number: '92300',
    role: 'owner',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Success modal / card state
  const [lastCreated, setLastCreated] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  const toggleRevealPassword = (id) => {
    setRevealedPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartEdit = (account) => {
    setEditingAccount(account);
    setEditForm({
      email: account.email || '',
      password: account.password || '',
      restaurant_name: account.restaurant_name || '',
      slug: account.restaurant_slug || '',
      whatsapp_number: account.whatsapp_number || '',
      role: account.role || 'owner',
    });
    setShowEditPassword(false);
    setEditSuccessMsg('');
    setEditErrorMsg('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingAccount) return;
    setEditErrorMsg('');
    setEditSuccessMsg('');

    try {
      setEditSubmitting(true);
      await updateUserCredentials(editingAccount.id, {
        currentEmail: editingAccount.email,
        email: editForm.email,
        password: editForm.password,
        restaurant_name: editForm.restaurant_name,
        restaurant_slug: editForm.slug,
        whatsapp_number: editForm.whatsapp_number,
        role: editForm.role,
        name: `${editForm.restaurant_name} Manager`,
      });

      const refreshed = getRegisteredUsers();
      setUsersList(refreshed);
      setEditSuccessMsg('Credentials and store details updated successfully!');
      setTimeout(() => {
        setEditingAccount(null);
      }, 1200);
    } catch (err) {
      setEditErrorMsg(err.message || 'Failed to update credentials.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Auto-generate slug from restaurant name
  const handleNameChange = (e) => {
    const name = e.target.value;
    const generatedSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    setForm((prev) => ({
      ...prev,
      restaurant_name: name,
      // only auto-update slug if user hasn't manually diverged it
      slug: prev.slug === '' || prev.slug === prev.restaurant_name.toLowerCase().replace(/[^a-z0-9]+/g, '-') ? generatedSlug : prev.slug,
    }));
  };

  // Generate strong random password
  const handleGeneratePassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm((prev) => ({ ...prev, password: pwd }));
    setShowPassword(true);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.restaurant_name || !form.slug || !form.email || !form.password || !form.whatsapp_number) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    try {
      setSubmitting(true);
      const result = await registerUser(form);

      // Refresh list
      const updated = getRegisteredUsers();
      setUsersList(updated);

      // Show success modal
      setLastCreated({
        email: form.email,
        password: form.password,
        restaurant_name: form.restaurant_name,
        slug: form.slug,
        whatsapp_number: form.whatsapp_number,
        role: form.role,
        menuUrl: `${window.location.origin}/${form.slug}`,
        loginUrl: `${window.location.origin}/login`,
      });

      // Reset form
      setForm({
        restaurant_name: '',
        slug: '',
        email: '',
        password: '',
        whatsapp_number: '92300',
        role: 'owner',
      });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to register new user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = (userId, email) => {
    if (window.confirm(`Are you sure you want to remove user "${email}"?`)) {
      const updated = deleteUser(userId);
      setUsersList(updated);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  // Filtered users
  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.restaurant_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.restaurant_slug || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' ? true : u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      {/* Top Admin Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200/90 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-600/20 text-white font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-extrabold text-slate-900 text-lg tracking-tight">
                  DineHQ Admin
                </span>
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Master Console
                </span>
              </div>
              <p className="text-xs text-slate-500">
                User Provisioning & Tenant Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{user?.email}</span>
            </div>

            <Link
              to="/"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Kitchen Dashboard</span>
            </Link>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Metric Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Registered Tenants</p>
              <h3 className="text-2xl font-heading font-extrabold text-slate-900 mt-0.5">
                {usersList.length}
              </h3>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Managers</p>
              <h3 className="text-2xl font-heading font-extrabold text-slate-900 mt-0.5">
                {usersList.filter((u) => u.role === 'owner').length}
              </h3>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Platform Commission</p>
              <h3 className="text-2xl font-heading font-extrabold text-slate-900 mt-0.5">0.0%</h3>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Security Guard</p>
              <h3 className="text-sm font-bold text-emerald-700 mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Active Middleware</span>
              </h3>
            </div>
          </div>
        </section>

        {/* Section: Register New User & Restaurant Form */}
        <section className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h2 className="text-lg sm:text-xl font-heading font-extrabold text-slate-900">
                  Provision New Restaurant & Manager Credentials
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Register a new owner with their credentials, direct WhatsApp number, and custom menu slug.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full self-start sm:self-auto">
              Ready for Instant Provisioning
            </span>
          </div>

          {errorMsg && (
            <div className="mt-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-800 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleRegisterSubmit} className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Restaurant Business Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Restaurant Business Name *
              </label>
              <input
                type="text"
                required
                value={form.restaurant_name}
                onChange={handleNameChange}
                placeholder="e.g. Fire Crust Artisan Pizza"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              />
            </div>

            {/* Custom URL Slug */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Customer Menu URL Slug *
              </label>
              <div className="flex rounded-xl shadow-xs">
                <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-200 bg-slate-100 text-slate-500 text-xs font-mono">
                  /
                </span>
                <input
                  type="text"
                  required
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-') })}
                  placeholder="firecrust"
                  className="flex-1 px-3 py-2.5 rounded-r-xl border border-slate-200 bg-slate-50/70 text-sm font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Public storefront link: <span className="font-mono text-emerald-700">{window.location.origin}/{form.slug || 'slug'}</span>
              </p>
            </div>

            {/* Manager Login Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Manager Work Email *
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="owner@firecrust.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              />
            </div>

            {/* Manager Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Manager Password *
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>Generate Strong</span>
                </button>
              </div>
              <div className="relative rounded-xl shadow-xs">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Set or generate password"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* WhatsApp Order Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                WhatsApp Orders Phone Number *
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={form.whatsapp_number}
                  onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
                  placeholder="923001234567"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Country code + number (e.g. 923001234567)</p>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Access Role
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition cursor-pointer"
              >
                <option value="owner">Restaurant Owner (Dashboard & Kitchen Orders)</option>
                <option value="admin">Platform Admin (Full Platform Access)</option>
              </select>
            </div>

            {/* Submit Action */}
            <div className="md:col-span-2 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold shadow-md shadow-slate-900/10 transition cursor-pointer disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Provisioning Tenant & Credentials...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Register User & Create Restaurant</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Modal / Card for Newly Provisioned Credentials */}
        {lastCreated && (
          <section className="bg-emerald-50/70 border-2 border-emerald-300 rounded-3xl p-6 sm:p-8 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-heading font-extrabold text-emerald-950">
                    🎉 New Restaurant & Credentials Successfully Provisioned!
                  </h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Share these credentials with the restaurant owner. They can immediately log into the manager dashboard.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLastCreated(null)}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-bold self-end sm:self-auto cursor-pointer"
              >
                Dismiss
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-emerald-200">
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Login Email</p>
                <p className="text-xs font-mono font-bold text-slate-800 mt-1 truncate">{lastCreated.email}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Password</p>
                <p className="text-xs font-mono font-bold text-slate-800 mt-1 truncate">{lastCreated.password}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Storefront Slug</p>
                <p className="text-xs font-mono font-bold text-emerald-700 mt-1 truncate">/{lastCreated.slug}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">WhatsApp Orders</p>
                <p className="text-xs font-mono font-bold text-slate-800 mt-1 truncate">+{lastCreated.whatsapp_number}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={() =>
                  copyToClipboard(
                    `DineHQ Restaurant Portal Credentials\nRestaurant: ${lastCreated.restaurant_name}\nEmail: ${lastCreated.email}\nPassword: ${lastCreated.password}\nLogin Portal: ${lastCreated.loginUrl}\nCustomer Menu: ${lastCreated.menuUrl}`,
                    'creds'
                  )
                }
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                {copiedKey === 'creds' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey === 'creds' ? 'Credentials Copied!' : 'Copy Full Credentials Package'}</span>
              </button>

              <a
                href={`/${lastCreated.slug}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 transition"
              >
                <span>Preview Storefront</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
            </div>
          </section>
        )}

        {/* Section: Directory Table */}
        <section className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-heading font-extrabold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>Registered Users & Tenants Directory</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                All provisioned restaurant owners and administrative accounts.
              </p>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search user, store, or slug..."
                  className="pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50/70 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="owner">Owners</option>
                <option value="admin">Admins</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200/80">
                <tr>
                  <th className="px-6 py-3.5">Restaurant / Tenant</th>
                  <th className="px-6 py-3.5">Manager Credentials</th>
                  <th className="px-6 py-3.5">WhatsApp Orders</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                      No accounts found matching your query.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((account) => {
                    const slug = account.restaurant_slug || 'burgersmoke';
                    const menuLink = `${window.location.origin}/${slug}`;
                    const isProtectedMaster = account.email === 'admin@dinehq.pk';
                    const isPasswordRevealed = Boolean(revealedPasswords[account.id]);

                    return (
                      <tr key={account.id} className="hover:bg-slate-50/60 transition">
                        {/* Restaurant Name & Slug */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0">
                              <Store className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-xs sm:text-sm">
                                {account.restaurant_name || 'Partner Restaurant'}
                              </p>
                              <a
                                href={`/${slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] font-mono text-emerald-700 hover:text-emerald-800 flex items-center gap-1 mt-0.5"
                              >
                                <span>/{slug}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          </div>
                        </td>

                        {/* Manager Email & Password */}
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-bold text-slate-800">{account.email}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] font-mono text-slate-600 font-semibold">
                                PWD:{' '}
                                {account.password
                                  ? isPasswordRevealed
                                    ? account.password
                                    : '••••••••••••'
                                  : 'OAuth / Cloud'}
                              </span>
                              {account.password && (
                                <button
                                  type="button"
                                  onClick={() => toggleRevealPassword(account.id)}
                                  className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                                  title={isPasswordRevealed ? 'Hide password' : 'Show password'}
                                >
                                  {isPasswordRevealed ? (
                                    <EyeOff className="w-3.5 h-3.5 text-indigo-600" />
                                  ) : (
                                    <Eye className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* WhatsApp Number */}
                        <td className="px-6 py-4 font-mono text-slate-700">
                          +{account.whatsapp_number || '923001234567'}
                        </td>

                        {/* Role */}
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              account.role === 'admin'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {account.role}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>Active</span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Edit Credentials & Details */}
                            <button
                              onClick={() => handleStartEdit(account)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                              title="Edit Manager Credentials & Details"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => copyToClipboard(menuLink, `copy-${account.id}`)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                              title="Copy Customer Menu Link"
                            >
                              {copiedKey === `copy-${account.id}` ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>

                            <a
                              href={`/${slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                              title="Open Customer Menu"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>

                            {!isProtectedMaster && (
                              <button
                                onClick={() => handleDeleteUser(account.id, account.email)}
                                className="p-1.5 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                                title="Delete User Account"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Modal: Edit Credentials & Store Details */}
        {editingAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                    <Pencil className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-heading font-extrabold text-slate-900 text-base">
                      Edit Credentials & Store Details
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Update login credentials, password, and restaurant settings
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingAccount(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {editErrorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{editErrorMsg}</span>
                </div>
              )}

              {editSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{editSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Store / Restaurant Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.restaurant_name}
                    onChange={(e) => setEditForm({ ...editForm, restaurant_name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Storefront Slug
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.slug}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      WhatsApp Phone
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.whatsapp_number}
                      onChange={(e) =>
                        setEditForm({ ...editForm, whatsapp_number: e.target.value.replace(/\D/g, '') })
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Manager Login Email
                  </label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Manager Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {showEditPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showEditPassword ? 'Hide' : 'Show Password'}</span>
                    </button>
                  </div>
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    required
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Access Role
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="owner">Restaurant Owner</option>
                    <option value="admin">Platform Admin</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingAccount(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {editSubmitting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>{editSubmitting ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
