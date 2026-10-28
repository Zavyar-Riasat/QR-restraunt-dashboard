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
  CheckCircle2,
  AlertCircle,
  Pencil,
  X,
  Key,
  MapPin,
} from 'lucide-react';
import AdminListingsTab from '../components/Admin/AdminListingsTab';

export default function AdminPanelPage() {
  const navigate = useNavigate();
  const {
    user,
    logout,
    registerUser,
    getRegisteredUsers,
    fetchRegisteredUsers,
    deleteUser,
    updateUserCredentials,
    viewPassword,
    resetPassword,
    getAuditLogs,
  } = useAuth();

  // Directory state
  const [usersList, setUsersList] = useState(() => getRegisteredUsers());
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [usersPage, setUsersPage] = useState(1);
  const USERS_PER_PAGE = 25;
  const [adminSection, setAdminSection] = useState('listings'); // 'listings' | 'users' | 'audit'

  // AES-256-GCM Password Reveal & Auto-hide states
  const [revealedPasswords, setRevealedPasswords] = useState({});
  const [passwordCountdowns, setPasswordCountdowns] = useState({});
  const [passwordLoadingId, setPasswordLoadingId] = useState(null);
  const [passwordCopiedId, setPasswordCopiedId] = useState(null);
  const [passwordError, setPasswordError] = useState({});
  const timerRefs = React.useRef({});

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Reset Password modal state
  const [resetPasswordAccount, setResetPasswordAccount] = useState(null);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  const [resetErrorMsg, setResetErrorMsg] = useState('');

  // Editing credentials modal state
  const [editingAccount, setEditingAccount] = useState(null);
  const [editForm, setEditForm] = useState({
    email: '',
    password: '',
    restaurant_name: '',
    slug: '',
    phone: '',
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
    phone: '92300',
    whatsapp_number: '92300',
    role: 'owner',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Success modal / card state
  const [lastCreated, setLastCreated] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // Fetch fresh remote users and handle password auto-hide cleanup
  React.useEffect(() => {
    async function loadData() {
      try {
        const remoteUsers = await fetchRegisteredUsers();
        if (Array.isArray(remoteUsers) && remoteUsers.length > 0) {
          setUsersList(remoteUsers);
        }
      } catch (_) {}
    }
    loadData();

    return () => {
      Object.values(timerRefs.current).forEach((t) => clearInterval(t));
    };
  }, []);

  // Fetch security audit logs when audit tab selected
  const handleLoadAuditLogs = async () => {
    try {
      setAuditLoading(true);
      const logs = await getAuditLogs();
      setAuditLogs(logs);
    } catch (e) {
      console.warn('Failed to load audit logs:', e);
    } finally {
      setAuditLoading(false);
    }
  };

  React.useEffect(() => {
    if (adminSection === 'audit') {
      handleLoadAuditLogs();
    }
  }, [adminSection]);

  const handleRevealPassword = async (account) => {
    if (revealedPasswords[account.id]) {
      handleHidePassword(account.id);
      return;
    }

    try {
      setPasswordLoadingId(account.id);
      setPasswordError((prev) => ({ ...prev, [account.id]: '' }));
      const result = await viewPassword(account.id);
      const plainPassword = result.password;
      const hideSeconds = result.autoHideSeconds || 15;

      setRevealedPasswords((prev) => ({ ...prev, [account.id]: plainPassword }));
      setPasswordCountdowns((prev) => ({ ...prev, [account.id]: hideSeconds }));

      if (timerRefs.current[account.id]) {
        clearInterval(timerRefs.current[account.id]);
      }

      let remaining = hideSeconds;
      timerRefs.current[account.id] = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(timerRefs.current[account.id]);
          delete timerRefs.current[account.id];
          setRevealedPasswords((prev) => {
            const copy = { ...prev };
            delete copy[account.id];
            return copy;
          });
          setPasswordCountdowns((prev) => {
            const copy = { ...prev };
            delete copy[account.id];
            return copy;
          });
        } else {
          setPasswordCountdowns((prev) => ({ ...prev, [account.id]: remaining }));
        }
      }, 1000);
    } catch (err) {
      setPasswordError((prev) => ({
        ...prev,
        [account.id]: err.message || 'Failed to decrypt password.',
      }));
    } finally {
      setPasswordLoadingId(null);
    }
  };

  const handleHidePassword = (accountId) => {
    if (timerRefs.current[accountId]) {
      clearInterval(timerRefs.current[accountId]);
      delete timerRefs.current[accountId];
    }
    setRevealedPasswords((prev) => {
      const copy = { ...prev };
      delete copy[accountId];
      return copy;
    });
    setPasswordCountdowns((prev) => {
      const copy = { ...prev };
      delete copy[accountId];
      return copy;
    });
  };

  const handleCopyRevealedPassword = (accountId, pwd) => {
    navigator.clipboard.writeText(pwd);
    setPasswordCopiedId(accountId);
    setTimeout(() => setPasswordCopiedId(null), 2000);
  };

  const handleStartEdit = (account) => {
    setEditingAccount(account);
    setEditForm({
      email: account.email || '',
      password: account.password || '',
      restaurant_name: account.restaurant_name || '',
      slug: account.restaurant_slug || '',
      phone: account.phone || account.whatsapp_number || '',
      whatsapp_number: account.phone || account.whatsapp_number || '',
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
        phone: editForm.phone || editForm.whatsapp_number,
        whatsapp_number: editForm.phone || editForm.whatsapp_number,
        role: editForm.role,
        name: `${editForm.restaurant_name} Manager`,
      });

      const refreshed = await fetchRegisteredUsers();
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

  const handleOpenResetPassword = (account) => {
    setResetPasswordAccount(account);
    handleGenerateResetPassword();
    setResetSuccessMsg('');
    setResetErrorMsg('');
  };

  const handleGenerateResetPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';
    let pwd = '';
    for (let i = 0; i < 14; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewResetPassword(pwd);
  };

  const handleSaveResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPasswordAccount) return;

    try {
      setResetSubmitting(true);
      setResetErrorMsg('');
      const res = await resetPassword(resetPasswordAccount.id, newResetPassword.trim() || null);
      const generated = res.generatedPassword || newResetPassword.trim();
      setNewResetPassword(generated);
      setResetSuccessMsg(`Password successfully reset! Store manager must change it on their next login.`);

      const refreshed = await fetchRegisteredUsers();
      setUsersList(refreshed);
    } catch (err) {
      setResetErrorMsg(err.message || 'Failed to reset password.');
    } finally {
      setResetSubmitting(false);
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

    if (!form.restaurant_name || !form.slug || !form.email || !form.password || !(form.phone || form.whatsapp_number)) {
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
        phone: form.phone || form.whatsapp_number,
        whatsapp_number: form.phone || form.whatsapp_number,
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
        phone: '92300',
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

  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const safeUsersPage = Math.min(usersPage, totalUserPages);
  const paginatedUsers = filteredUsers.slice(
    (safeUsersPage - 1) * USERS_PER_PAGE,
    safeUsersPage * USERS_PER_PAGE
  );

  return (
    <div className="min-h-screen bg-[#FFF9F2] text-[#2B2118] flex flex-col font-sans selection:bg-[#F26B1D] selection:text-white">
      {/* Top Admin Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-[#F0E4D7] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#F26B1D] to-[#F5A623] flex items-center justify-center shadow-md shadow-[#F26B1D]/20 text-white font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-extrabold text-[#2B2118] text-lg tracking-tight">
                  Dineflow Admin
                </span>
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#FFF1E6] text-[#F26B1D] border border-[#FCD8BF]">
                  Master Console
                </span>
              </div>
              <p className="text-xs text-[#7A6A5C]">
                User Provisioning & Tenant Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFF1E6] text-[#7A6A5C] text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#1F9D55]"></span>
              <span>{user?.email}</span>
            </div>

            <Link
              to="/"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#F26B1D] text-[#F26B1D] hover:bg-[#FFF1E6] text-xs font-bold transition"
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Kitchen Dashboard</span>
            </Link>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FEE4E2] hover:bg-[#FDECEC] text-[#D92D20] text-xs font-bold border border-[#D92D20]/20 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Top Console Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#F0E4D7] pb-3">
          <button
            type="button"
            onClick={() => setAdminSection('listings')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
              adminSection === 'listings'
                ? 'bg-[#2B2118] text-white shadow-xs'
                : 'bg-white text-[#7A6A5C] hover:bg-[#FFF1E6] hover:text-[#2B2118] border border-[#F0E4D7]'
            }`}
          >
            <MapPin className="w-4 h-4 text-[#F26B1D]" />
            <span>Marketplace Listings</span>
          </button>

          <button
            type="button"
            onClick={() => setAdminSection('users')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
              adminSection === 'users'
                ? 'bg-[#2B2118] text-white shadow-xs'
                : 'bg-white text-[#7A6A5C] hover:bg-[#FFF1E6] hover:text-[#2B2118] border border-[#F0E4D7]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Accounts & Provisioning</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                adminSection === 'users' ? 'bg-white/20 text-white' : 'bg-[#FFF1E6] text-[#F26B1D]'
              }`}
            >
              {usersList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAdminSection('audit')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
              adminSection === 'audit'
                ? 'bg-[#2B2118] text-white shadow-xs'
                : 'bg-white text-[#7A6A5C] hover:bg-[#FFF1E6] hover:text-[#2B2118] border border-[#F0E4D7]'
            }`}
          >
            <Shield className="w-4 h-4 text-[#F26B1D]" />
            <span>Security Audit Trail</span>
          </button>
        </div>

        {/* SECTION 1: Marketplace Listings Tab */}
        {adminSection === 'listings' && <AdminListingsTab />}

        {/* SECTION 2: Accounts & Provisioning Tab */}
        {adminSection === 'users' && (
          <div className="space-y-8">
            {/* Metric Cards */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-[#F0E4D7] shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#FFF1E6] text-[#F26B1D] flex items-center justify-center shrink-0">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#7A6A5C] uppercase tracking-wider">Registered Restaurants</p>
              <h3 className="text-2xl font-heading font-extrabold text-[#2B2118] mt-0.5">
                {usersList.length}
              </h3>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#F0E4D7] shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#FFF1E6] text-[#F26B1D] flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#7A6A5C] uppercase tracking-wider">Active Managers</p>
              <h3 className="text-2xl font-heading font-extrabold text-[#2B2118] mt-0.5">
                {usersList.filter((u) => u.role === 'owner').length}
              </h3>
            </div>
          </div>
        </section>

        {/* Section: Register New User & Restaurant Form */}
        <section className="bg-white rounded-3xl border border-[#F0E4D7] shadow-sm p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#F0E4D7] gap-2">
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
                Register a new owner with their credentials, restaurant phone, and menu slug.
              </p>
            </div>
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
                  <Key className="w-3 h-3 text-emerald-600" />
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

            {/* Restaurant Contact Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Restaurant Contact Phone *
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={form.phone || form.whatsapp_number}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      phone: e.target.value,
                      whatsapp_number: e.target.value,
                    })
                  }
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
                <option value="owner">Restaurant Manager</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            {/* Submit Action */}
            <div className="md:col-span-2 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-sm font-bold shadow-md shadow-[#F26B1D]/20 transition cursor-pointer disabled:opacity-60"
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
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contact Phone</p>
                <p className="text-xs font-mono font-bold text-slate-800 mt-1 truncate">+{lastCreated.phone || lastCreated.whatsapp_number}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={() =>
                  copyToClipboard(
                    `Dineflow Restaurant Portal Credentials\nRestaurant: ${lastCreated.restaurant_name}\nEmail: ${lastCreated.email}\nPassword: ${lastCreated.password}\nLogin Portal: ${lastCreated.loginUrl}\nCustomer Menu: ${lastCreated.menuUrl}`,
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
        <section className="bg-white rounded-3xl border border-[#F0E4D7] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#F0E4D7] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-heading font-extrabold text-[#2B2118] flex items-center gap-2">
                <Users className="w-5 h-5 text-[#F26B1D]" />
                <span>Registered Users & Tenants Directory</span>
              </h2>
              <p className="text-xs text-[#7A6A5C] mt-0.5">
                All provisioned restaurant owners and administrative accounts.
              </p>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-[#9E8E81] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search user, store, or slug..."
                  className="pl-9 pr-3.5 py-1.5 rounded-xl border border-[#F0E4D7] text-xs bg-[#FFF9F2] text-[#2B2118] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F26B1D] focus:border-[#F26B1D]"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-[#F0E4D7] text-xs bg-[#FFF9F2] text-[#2B2118] focus:outline-none focus:ring-2 focus:ring-[#F26B1D] cursor-pointer"
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
              <thead className="bg-[#FFF9F2] text-[#7A6A5C] uppercase tracking-wider font-bold border-b border-[#F0E4D7]">
                <tr>
                  <th className="px-6 py-3.5">Restaurant / Tenant</th>
                  <th className="px-6 py-3.5">Manager Account</th>
                  <th className="px-6 py-3.5">Password</th>
                  <th className="px-6 py-3.5">Contact Phone</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E4D7] font-medium">
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                      No accounts found matching your query.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((account) => {
                    const slug = account.restaurant_slug || 'burgersmoke';
                    const menuLink = `${window.location.origin}/${slug}`;
                    const isProtectedMaster = account.email === 'admin@dineflow.pk' || account.email === 'admin@dinehq.pk';

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

                        {/* Manager Account & Email */}
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-bold text-slate-900 text-xs sm:text-sm">
                              {account.name || 'Store Manager'}
                            </p>
                            <p className="font-mono text-xs text-slate-500 mt-0.5">
                              {account.email}
                            </p>
                          </div>
                        </td>

                        {/* Reversible Encrypted Password Column (Auto-hides after 15s) */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {revealedPasswords[account.id] ? (
                              <div className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-amber-50 border border-amber-300">
                                <span className="font-mono text-xs font-extrabold text-amber-950 select-all">
                                  {revealedPasswords[account.id]}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 font-bold">
                                  {passwordCountdowns[account.id]}s
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyRevealedPassword(account.id, revealedPasswords[account.id])}
                                  className="p-1 rounded text-amber-800 hover:text-black hover:bg-amber-100 transition cursor-pointer"
                                  title="Copy Decrypted Password"
                                >
                                  {passwordCopiedId === account.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleHidePassword(account.id)}
                                  className="p-1 rounded text-amber-800 hover:text-black hover:bg-amber-100 transition cursor-pointer"
                                  title="Hide Password"
                                >
                                  <EyeOff className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-slate-400 tracking-wider">
                                  ••••••••••••
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRevealPassword(account)}
                                  disabled={passwordLoadingId === account.id}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-[#FFF1E6] hover:text-[#F26B1D] text-slate-600 text-[11px] font-bold transition border border-slate-200 cursor-pointer disabled:opacity-50"
                                  title="View password (Master Admin only - audited with IP)"
                                >
                                  {passwordLoadingId === account.id ? (
                                    <RefreshCw className="w-3 h-3 animate-spin text-[#F26B1D]" />
                                  ) : (
                                    <Eye className="w-3 h-3" />
                                  )}
                                  <span>View</span>
                                </button>
                              </div>
                            )}
                          </div>
                          {passwordError[account.id] && (
                            <p className="text-[10px] text-rose-600 mt-1 font-semibold">{passwordError[account.id]}</p>
                          )}
                        </td>

                        {/* Contact Phone */}
                        <td className="px-6 py-4 font-mono text-slate-700">
                          +{account.phone || account.whatsapp_number || '923001234567'}
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
                            {/* Reset Password Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenResetPassword(account)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FFF1E6] hover:bg-[#FCD8BF] text-[#F26B1D] text-xs font-bold transition border border-[#FCD8BF] cursor-pointer"
                              title={`Reset password for ${account.email}`}
                            >
                              <Key className="w-3 h-3" />
                              <span>Reset Password</span>
                            </button>

                            {/* Edit Store Details */}
                            <button
                              onClick={() => handleStartEdit(account)}
                              className="p-1.5 rounded-lg text-[#9E8E81] hover:text-[#F26B1D] hover:bg-[#FFF1E6] transition cursor-pointer"
                              title="Edit Store Details"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => copyToClipboard(menuLink, `copy-${account.id}`)}
                              className="p-1.5 rounded-lg text-[#9E8E81] hover:text-[#2B2118] hover:bg-[#FFF1E6] transition cursor-pointer"
                              title="Copy Customer Menu Link"
                            >
                              {copiedKey === `copy-${account.id}` ? (
                                <Check className="w-4 h-4 text-[#1F9D55]" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>

                            <a
                              href={`/${slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg text-[#9E8E81] hover:text-[#2B2118] hover:bg-[#FFF1E6] transition"
                              title="Open Customer Menu"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>

                            {!isProtectedMaster && (
                              <button
                                onClick={() => handleDeleteUser(account.id, account.email)}
                                className="p-1.5 rounded-lg text-[#D92D20] hover:text-[#D92D20] hover:bg-[#FEE4E2] transition cursor-pointer"
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

          {totalUserPages > 1 && (
            <div className="px-6 py-3.5 border-t border-[#F0E4D7] bg-[#FFF9F2]/60 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-[#7A6A5C] font-semibold">
                Showing {(safeUsersPage - 1) * USERS_PER_PAGE + 1}–{Math.min(safeUsersPage * USERS_PER_PAGE, filteredUsers.length)} of{' '}
                <strong className="text-[#2B2118]">{filteredUsers.length}</strong> accounts
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safeUsersPage <= 1}
                  onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-xl border border-[#F0E4D7] bg-white hover:bg-[#FFF1E6] font-bold text-[#2B2118] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="font-mono font-bold text-[#2B2118] px-2">
                  Page {safeUsersPage} / {totalUserPages}
                </span>
                <button
                  type="button"
                  disabled={safeUsersPage >= totalUserPages}
                  onClick={() => setUsersPage((p) => Math.min(totalUserPages, p + 1))}
                  className="px-3 py-1.5 rounded-xl border border-[#F0E4D7] bg-white hover:bg-[#FFF1E6] font-bold text-[#2B2118] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    )}

        {/* SECTION 3: Security Audit Trail */}
        {adminSection === 'audit' && (
          <section className="bg-white rounded-3xl border border-[#F0E4D7] shadow-sm overflow-hidden space-y-4 animate-fadeIn">
            <div className="p-6 border-b border-[#F0E4D7] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-heading font-extrabold text-[#2B2118] flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#F26B1D]" />
                  <span>Security Audit Trail</span>
                </h2>
                <p className="text-xs text-[#7A6A5C] mt-0.5">
                  Immutable record of password views, password resets, logins, and key events with timestamps and IP addresses.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadAuditLogs}
                  disabled={auditLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF9F2] hover:bg-[#FFF1E6] text-xs font-bold text-[#F26B1D] border border-[#F0E4D7] transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${auditLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh Logs</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFF9F2] text-[#7A6A5C] uppercase tracking-wider font-bold border-b border-[#F0E4D7]">
                  <tr>
                    <th className="px-6 py-3.5">Timestamp</th>
                    <th className="px-6 py-3.5">Action</th>
                    <th className="px-6 py-3.5">Actor (Admin / User)</th>
                    <th className="px-6 py-3.5">Target Store / User</th>
                    <th className="px-6 py-3.5">IP Address</th>
                    <th className="px-6 py-3.5">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0E4D7] font-medium">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                        {auditLoading ? 'Loading audit records...' : 'No security audit events logged yet.'}
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => {
                      const dateStr = log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Just now';
                      const actionBadge =
                        log.action === 'VIEW_PASSWORD'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : log.action === 'RESET_PASSWORD'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : log.action === 'CHANGE_PASSWORD'
                          ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200';

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/60 transition">
                          <td className="px-6 py-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                            {dateStr}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${actionBadge}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-900 font-bold">
                            {log.admin_email || log.user_email || 'System'}
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-800">{log.restaurant_name || '-'}</p>
                            <p className="text-[11px] font-mono text-slate-500">{log.target_email || ''}</p>
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-600 text-[11px]">
                            {log.ip_address || '127.0.0.1'}
                          </td>
                          <td className="px-6 py-4 text-slate-500 text-[11px]">
                            {log.notes || log.details || (log.action === 'VIEW_PASSWORD' ? 'Decrypted password viewed with 15s auto-hide' : 'Completed')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

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
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.phone || editForm.whatsapp_number}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setEditForm({ ...editForm, phone: val, whatsapp_number: val });
                      }}
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
                      New Password (Optional)
                    </label>
                  </div>
                  <input
                    type="password"
                    placeholder="Leave blank to keep existing password"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    To reset manager password directly, you can also use the "Reset Password" button in the table.
                  </p>
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
                    className="px-5 py-2 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs font-bold shadow-md shadow-[#F26B1D]/20 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
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

        {/* Dedicated Reset Password Modal */}
        {resetPasswordAccount && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-heading font-extrabold text-slate-900 text-base">
                      Reset Password
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      {resetPasswordAccount.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setResetPasswordAccount(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {resetErrorMsg && (
                <div className="p-3 my-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{resetErrorMsg}</span>
                </div>
              )}

              {resetSuccessMsg ? (
                <div className="space-y-4 pt-3">
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">{resetSuccessMsg}</p>
                      <p className="text-[11px] text-emerald-800 mt-1">
                        All previous active sessions have been invalidated. The store manager will be prompted to set their permanent password upon next login (must_change_password = true).
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Temporary Generated Password
                    </p>
                    <div className="flex items-center justify-between gap-2 mt-1.5">
                      <span className="font-mono font-bold text-base text-slate-900 select-all">
                        {newResetPassword}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(newResetPassword, 'reset-copy')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs cursor-pointer"
                      >
                        {copiedKey === 'reset-copy' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedKey === 'reset-copy' ? 'Copied!' : 'Copy Password'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setResetPasswordAccount(null)}
                      className="px-5 py-2.5 rounded-xl bg-[#2B2118] hover:bg-black text-white text-xs font-bold transition cursor-pointer"
                    >
                      Done & Close
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveResetPassword} className="space-y-4 pt-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        New Temporary Password
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateResetPassword}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Key className="w-3 h-3 text-indigo-500" />
                        <span>Generate Strong</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={newResetPassword}
                      onChange={(e) => setNewResetPassword(e.target.value)}
                      placeholder="Enter new password (min. 4 characters)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Strong password generated. Encrypted with AES-256-GCM. Stored reversible so master admin can view it.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setResetPasswordAccount(null)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={resetSubmitting}
                      className="px-5 py-2 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs font-bold shadow-md shadow-[#F26B1D]/20 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {resetSubmitting ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>{resetSubmitting ? 'Resetting...' : 'Set New Password'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
