import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  UtensilsCrossed,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Store,
} from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, changePassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Mandatory password change modal state
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [mustChangePasswordUser, setMustChangePasswordUser] = useState(null);
  const [tempPassword, setTempPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeModalLoading, setChangeModalLoading] = useState(false);
  const [changeModalError, setChangeModalError] = useState('');

  // Destination after login
  const from = location.state?.from?.pathname || '';

  const getDestination = (loggedInUser) => {
    if (from && from !== '/' && from !== '/dashboard' && from !== '/admin') {
      return from;
    }
    if (loggedInUser?.role === 'admin') {
      return '/superadmin';
    }
    const slug = loggedInUser?.restaurant_slug || 'burgersmoke';
    return `/${slug}/admin`;
  };

  // If already logged in, redirect immediately (unless password change is required)
  React.useEffect(() => {
    if (user && !showChangeModal && !user.must_change_password) {
      navigate(getDestination(user), { replace: true });
    }
  }, [user, from, navigate, showChangeModal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      const loggedInUser = await login(email, password);
      if (loggedInUser?.must_change_password) {
        setMustChangePasswordUser(loggedInUser);
        setTempPassword(password);
        setShowChangeModal(true);
        return;
      }
      navigate(getDestination(loggedInUser), { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Failed to sign in. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.endsWith('.localhost') ||
      window.location.hostname === '::1');

  const handleQuickLogin = async (quickEmail, quickPassword) => {
    setEmail(quickEmail);
    setPassword(quickPassword);
    setErrorMessage('');
    try {
      setLoading(true);
      const loggedInUser = await login(quickEmail, quickPassword);
      if (loggedInUser?.must_change_password) {
        setMustChangePasswordUser(loggedInUser);
        setTempPassword(quickPassword);
        setShowChangeModal(true);
        return;
      }
      navigate(getDestination(loggedInUser), { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Failed to sign in. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillCredentials = (quickEmail, quickPassword) => {
    setEmail(quickEmail);
    setPassword(quickPassword);
    setErrorMessage('');
  };

  const handleMandatoryPasswordChange = async (e) => {
    e.preventDefault();
    setChangeModalError('');
    if (!newPassword || newPassword.length < 6) {
      setChangeModalError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangeModalError('New password and confirmation do not match.');
      return;
    }

    try {
      setChangeModalLoading(true);
      await changePassword(tempPassword, newPassword);
      setShowChangeModal(false);
      navigate(getDestination(mustChangePasswordUser), { replace: true });
    } catch (err) {
      setChangeModalError(err.message || 'Failed to update password.');
    } finally {
      setChangeModalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9F2] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-[#F26B1D] selection:text-white">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#F26B1D] to-[#F5A623] shadow-lg shadow-[#F26B1D]/25 mb-4 text-white">
          <UtensilsCrossed className="w-7 h-7" />
        </div>
        <div className="flex items-center justify-center mb-1">
          <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-[#2B2118] tracking-tight">
            Dineflow
          </h2>
        </div>
        <p className="text-xs text-[#7A6A5C]">
          Restaurant Management & Super Admin Portal
        </p>
      </div>

      {/* Main Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-[#F0E4D7] shadow-xl shadow-[#2B2118]/5">

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-[#FDECEC] border border-[#E5484D]/30 flex items-start gap-2.5 text-[#D92D20] text-xs font-medium animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-[#D92D20] shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#7A6A5C] uppercase tracking-wider mb-1.5">
                Work Email Address
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9E8E81]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@restaurant.com"
                  className="block w-full pl-10 pr-3 py-2.5 bg-[#FFF9F2] border border-[#F0E4D7] rounded-xl text-sm text-[#2B2118] placeholder-[#9E8E81] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F26B1D] focus:border-[#F26B1D] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#7A6A5C] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9E8E81]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 bg-[#FFF9F2] border border-[#F0E4D7] rounded-xl text-sm text-[#2B2118] placeholder-[#9E8E81] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F26B1D] focus:border-[#F26B1D] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#9E8E81] hover:text-[#7A6A5C] transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#F26B1D] hover:bg-[#D95A12] active:scale-[0.99] transition shadow-md shadow-[#F26B1D]/20 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Login</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Dev Test Credentials (Localhost Only) */}
          {isLocalhost && (
            <div className="mt-6 pt-5 border-t border-dashed border-[#F0E4D7]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-extrabold tracking-wider uppercase text-[#7A6A5C]">
                    Localhost Test Credentials
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF1E6] text-[#F26B1D] border border-[#FCD8BF]">
                  Dev Sandbox
                </span>
              </div>

              <div className="space-y-2.5">
                {/* 1. Restaurant Manager */}
                <div className="p-3 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] hover:border-[#F26B1D]/40 transition group">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-white text-[#F26B1D] flex items-center justify-center border border-[#F0E4D7] shrink-0 shadow-2xs">
                        <Store className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#2B2118] truncate">
                          Restaurant Manager
                        </div>
                        <div className="text-[10px] text-[#7A6A5C] truncate">
                          Burger & Smoke Dashboard
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleQuickLogin('owner@burgersmoke.com', 'OwnerPass123!')}
                      className="px-2.5 py-1.5 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-[11px] font-bold transition flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs hover:scale-[1.02] disabled:opacity-50"
                      title="1-Click Login to Restaurant Dashboard"
                    >
                      <span>1-Click Login</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[#F0E4D7]/70 text-[11px] font-mono text-[#7A6A5C]">
                    <div className="truncate">
                      <span className="text-[#9E8E81]">Email:</span>{' '}
                      <span className="text-[#2B2118] font-bold">owner@burgersmoke.com</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFillCredentials('owner@burgersmoke.com', 'OwnerPass123!')}
                      className="text-[10px] font-sans font-bold text-[#F26B1D] hover:underline shrink-0 cursor-pointer"
                    >
                      Fill Form
                    </button>
                  </div>
                  <div className="text-[11px] font-mono text-[#7A6A5C]">
                    <span className="text-[#9E8E81]">Pass:</span>{' '}
                    <span className="text-[#2B2118] font-bold">OwnerPass123!</span>
                  </div>
                </div>

                {/* 2. Platform Super Admin */}
                <div className="p-3 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] hover:border-purple-300 transition group">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-white text-purple-600 flex items-center justify-center border border-[#F0E4D7] shrink-0 shadow-2xs">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#2B2118] truncate">
                          Platform Super Admin
                        </div>
                        <div className="text-[10px] text-[#7A6A5C] truncate">
                          Master Control Panel
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleQuickLogin('admin@dineflow.pk', 'AdminPass123!')}
                      className="px-2.5 py-1.5 rounded-xl bg-[#2B2118] hover:bg-black text-white text-[11px] font-bold transition flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs hover:scale-[1.02] disabled:opacity-50"
                      title="1-Click Login to Super Admin Panel"
                    >
                      <span>1-Click Login</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[#F0E4D7]/70 text-[11px] font-mono text-[#7A6A5C]">
                    <div className="truncate">
                      <span className="text-[#9E8E81]">Email:</span>{' '}
                      <span className="text-[#2B2118] font-bold">admin@dineflow.pk</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFillCredentials('admin@dineflow.pk', 'AdminPass123!')}
                      className="text-[10px] font-sans font-bold text-[#F26B1D] hover:underline shrink-0 cursor-pointer"
                    >
                      Fill Form
                    </button>
                  </div>
                  <div className="text-[11px] font-mono text-[#7A6A5C]">
                    <span className="text-[#9E8E81]">Pass:</span>{' '}
                    <span className="text-[#2B2118] font-bold">AdminPass123!</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mandatory Password Change Modal */}
        {showChangeModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-[#F0E4D7] shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 pb-4 border-b border-[#F0E4D7]">
                <div className="w-10 h-10 rounded-2xl bg-[#FFF1E6] text-[#F26B1D] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-[#2B2118] text-base">
                    Change Password Required
                  </h3>
                  <p className="text-xs text-[#7A6A5C]">
                    Your administrator has reset your password. Please choose a new permanent password.
                  </p>
                </div>
              </div>

              {changeModalError && (
                <div className="mt-4 p-3 rounded-xl bg-[#FDECEC] border border-[#E5484D]/30 flex items-start gap-2.5 text-[#D92D20] text-xs font-medium">
                  <AlertCircle className="w-4 h-4 text-[#D92D20] shrink-0 mt-0.5" />
                  <span>{changeModalError}</span>
                </div>
              )}

              <form onSubmit={handleMandatoryPasswordChange} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#7A6A5C] uppercase tracking-wider mb-1.5">
                    New Permanent Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-3.5 py-2.5 bg-[#FFF9F2] border border-[#F0E4D7] rounded-xl text-sm font-mono text-[#2B2118] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F26B1D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#7A6A5C] uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full px-3.5 py-2.5 bg-[#FFF9F2] border border-[#F0E4D7] rounded-xl text-sm font-mono text-[#2B2118] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F26B1D]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={changeModalLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#F26B1D] hover:bg-[#D95A12] transition shadow-md shadow-[#F26B1D]/20 cursor-pointer disabled:opacity-60"
                  >
                    {changeModalLoading ? (
                      <span>Updating password...</span>
                    ) : (
                      <>
                        <span>Save Password & Continue</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Customer Menu Navigation Link */}
        <div className="mt-6 text-center">
          <p className="text-xs text-[#7A6A5C] flex items-center justify-center gap-1.5">
            <span>Are you a customer wanting food?</span>
            <Link
              to="/burgersmoke"
              className="text-[#F26B1D] hover:text-[#D95A12] font-bold inline-flex items-center gap-1 transition"
            >
              <span>View Customer Menu</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
