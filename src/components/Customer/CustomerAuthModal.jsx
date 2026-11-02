import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  AlertCircle,
  X,
  UtensilsCrossed,
  Mail,
  User,
  Phone,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { customerAuthService } from '../../services/customerAuthService.js';
import { useCustomerAuth } from '../../context/CustomerAuthContext.jsx';

const GoogleLogo = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export default function CustomerAuthModal({
  isOpen,
  onClose,
  onSuccess,
  title = 'Sign In to Account',
  subtitle = 'Sign in to your customer account to bookmark your favorite spots and reorder in 1 tap.',
}) {
  const navigate = useNavigate();
  const { loginCustomer } = useCustomerAuth();

  // Steps: 'home' | 'google_chooser' | 'email_form' | 'verify_otp'
  const [step, setStep] = useState('home');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [savedGoogleAccounts, setSavedGoogleAccounts] = useState([]);

  // Google account input (when adding a Google account inside Google Chooser)
  const [googleInputEmail, setGoogleInputEmail] = useState('');
  const [showAddGoogleInput, setShowAddGoogleInput] = useState(false);

  // Email Sign-In Form fields (only opened when user clicks "Sign in with Email")
  const [emailName, setEmailName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [emailPhone, setEmailPhone] = useState('');

  // OTP Verification state
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingName, setPendingName] = useState('');
  const [pendingPhone, setPendingPhone] = useState('');
  const [isGoogleOtpFlow, setIsGoogleOtpFlow] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/');
    }
  };

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Reset states on open
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setStep('home');
      setShowAddGoogleInput(false);
      setGoogleInputEmail('');
      setOtpInput('');
      setSavedGoogleAccounts(customerAuthService.getSavedGoogleAccounts());
    }
  }, [isOpen]);

  // Cooldown timer for Resend OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const completeSignIn = async (customer) => {
    await loginCustomer(customer);
    if (onSuccess) {
      onSuccess(customer);
    } else if (onClose) {
      onClose();
    }
  };

  // 1. Handle "Continue with Google" button click
  const handleContinueWithGoogle = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      // Try real Google Identity Services OAuth2 popup if VITE_GOOGLE_CLIENT_ID is configured
      const oauthRes = await customerAuthService.authenticateWithGoogleOAuthPopup();
      if (oauthRes?.available && oauthRes?.success && oauthRes?.customer) {
        await completeSignIn(oauthRes.customer);
        return;
      }

      // Open Google Account Chooser
      const accounts = customerAuthService.getSavedGoogleAccounts();
      setSavedGoogleAccounts(accounts);
      setShowAddGoogleInput(accounts.length === 0);
      setStep('google_chooser');
    } catch (err) {
      setErrorMsg(err.message || 'Google sign-in was interrupted.');
    } finally {
      setLoading(false);
    }
  };

  // Select a previously verified Google account on this device
  const handleSelectSavedGoogleAccount = async (acc) => {
    try {
      setLoading(true);
      setErrorMsg('');
      // Send OTP to Gmail to verify Google account ownership
      const res = await customerAuthService.requestEmailOtp({
        email: acc.email,
        name: acc.name,
        phone: acc.phone || '',
        requireGoogle: false,
      });
      setPendingEmail(res.email);
      setPendingName(res.name);
      setPendingPhone(acc.phone || '');
      setIsGoogleOtpFlow(true);
      setOtpInput('');
      setResendCooldown(res.cooldownSeconds || 60);
      setStep('verify_otp');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send verification OTP to Gmail.');
    } finally {
      setLoading(false);
    }
  };

  // Validate a new Google email and send 6-digit OTP to Gmail
  const handleGoogleEmailSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await customerAuthService.requestEmailOtp({
        email: googleInputEmail,
        name: '',
        phone: '',
        requireGoogle: true,
      });
      setPendingEmail(res.email);
      setPendingName(res.name);
      setPendingPhone('');
      setIsGoogleOtpFlow(true);
      setOtpInput('');
      setResendCooldown(res.cooldownSeconds || 60);
      setStep('verify_otp');
    } catch (err) {
      setErrorMsg(err.message || 'Please enter a valid Google account.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit Email Login Form (Validates email & sends 6-digit OTP to Gmail)
  const handleEmailFormSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await customerAuthService.requestEmailOtp({
        email: emailAddress,
        name: emailName,
        phone: emailPhone,
        requireGoogle: false,
      });
      setPendingEmail(res.email);
      setPendingName(res.name);
      setPendingPhone(emailPhone.trim());
      setIsGoogleOtpFlow(false);
      setOtpInput('');
      setResendCooldown(res.cooldownSeconds || 60);
      setStep('verify_otp');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send verification code to your email.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Verify 6-digit OTP Code
  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await customerAuthService.verifyEmailOtp(pendingEmail, otpInput);
      if (res.success && res.customer) {
        await completeSignIn(res.customer);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await customerAuthService.requestEmailOtp({
        email: pendingEmail,
        name: pendingName,
        phone: pendingPhone,
        requireGoogle: isGoogleOtpFlow,
      });
      setResendCooldown(res.cooldownSeconds || 60);
    } catch (err) {
      setErrorMsg(err.message || 'Could not resend verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Quick Demo Sign-In
  const handleQuickDemoSignIn = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await customerAuthService.loginWithQuickDemo();
      if (res.success && res.customer) {
        await completeSignIn(res.customer);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Quick demo sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-white rounded-3xl border border-[#F0E4D7] shadow-2xl max-w-md w-full overflow-hidden transition-all relative">
        {/* Modal Header */}
        <div className="p-6 text-center border-b border-[#F0E4D7] relative bg-gradient-to-b from-[#FFF9F2] to-white">
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-[#9E8E81] hover:text-[#2B2118] hover:bg-black/5 active:scale-95 transition-all cursor-pointer z-20"
            aria-label="Close"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F26B1D] to-[#F5A623] flex items-center justify-center text-white shadow-md shadow-[#F26B1D]/25 mx-auto mb-3">
            <UtensilsCrossed className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-heading font-extrabold text-[#2B2118] tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-[#7A6A5C] max-w-xs mx-auto mt-1 leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: Main Choice Screen (Continue with Google OR Sign in with Email) */}
          {step === 'home' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleContinueWithGoogle}
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-[#FFF9F2] text-[#2B2118] border-2 border-[#F0E4D7] hover:border-[#F26B1D] text-sm font-bold transition flex items-center justify-center gap-3 cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-60"
              >
                <GoogleLogo />
                <span>{loading ? 'Connecting to Google...' : 'Continue with Google'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setStep('email_form');
                }}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-[#FFF9F2] hover:bg-[#FFF1E6] text-[#2B2118] border border-[#F0E4D7] hover:border-[#F26B1D]/50 text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99] disabled:opacity-60"
              >
                <Mail className="w-4 h-4 text-[#F26B1D]" />
                <span>Sign In with Email (OTP)</span>
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#7A6A5C] pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Verified Google &amp; Email OTP authentication</span>
              </div>
            </div>
          )}

          {/* STEP 2A: Google Account Chooser & Verification */}
          {step === 'google_chooser' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setStep('home');
                    setErrorMsg('');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#7A6A5C] hover:text-[#2B2118] cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2B2118]">
                  <GoogleLogo />
                  <span>Choose a Google Account</span>
                </div>
              </div>

              {savedGoogleAccounts.length > 0 && !showAddGoogleInput && (
                <div className="space-y-2">
                  {savedGoogleAccounts.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      disabled={loading}
                      onClick={() => handleSelectSavedGoogleAccount(acc)}
                      className="w-full p-3 rounded-xl border border-[#F0E4D7] hover:border-[#F26B1D] bg-[#FFF9F2]/60 hover:bg-[#FFF1E6]/60 flex items-center justify-between gap-3 text-left transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={acc.avatar}
                          alt={acc.name}
                          className="w-9 h-9 rounded-full object-cover border border-[#F0E4D7] shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold text-[#2B2118] truncate">
                            {acc.name}
                          </div>
                          <div className="text-[11px] text-[#7A6A5C] truncate">{acc.email}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-[#F26B1D] shrink-0">
                        Send OTP →
                      </span>
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setShowAddGoogleInput(true);
                      setErrorMsg('');
                    }}
                    className="w-full py-2.5 px-3 rounded-xl border border-dashed border-[#F0E4D7] hover:border-[#F26B1D] text-xs font-bold text-[#2B2118] hover:text-[#F26B1D] transition cursor-pointer"
                  >
                    + Use another Google account
                  </button>
                </div>
              )}

              {showAddGoogleInput && (
                <form onSubmit={handleGoogleEmailSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#2B2118] mb-1">
                      Enter your Google / Gmail address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#9E8E81] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        autoFocus
                        value={googleInputEmail}
                        onChange={(e) => setGoogleInputEmail(e.target.value)}
                        placeholder="yourname@gmail.com"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2] text-xs font-medium text-[#2B2118] focus:outline-none focus:ring-2 focus:ring-[#F26B1D]"
                      />
                    </div>
                    <p className="text-[10px] text-[#7A6A5C] mt-1">
                      We will verify that this Google account is valid and send a 6-digit OTP code to your Gmail inbox.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-[#F26B1D] hover:bg-[#D95B12] text-white text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-60"
                  >
                    {loading ? 'Sending OTP to Gmail...' : 'Verify Google Account (Send OTP)'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* STEP 2B: Email Sign-In Form (Only opened when user clicks "Sign In with Email") */}
          {step === 'email_form' && (
            <form onSubmit={handleEmailFormSubmit} className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setStep('home');
                    setErrorMsg('');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#7A6A5C] hover:text-[#2B2118] cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <span className="text-[11px] font-bold text-[#7A6A5C]">Email OTP Sign-In</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B2118] mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#9E8E81] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={emailName}
                    onChange={(e) => setEmailName(e.target.value)}
                    placeholder="e.g. Ahmed Khan"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2] text-xs font-medium text-[#2B2118] focus:outline-none focus:ring-2 focus:ring-[#F26B1D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B2118] mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#9E8E81] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="yourname@gmail.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2] text-xs font-medium text-[#2B2118] focus:outline-none focus:ring-2 focus:ring-[#F26B1D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B2118] mb-1">
                  Mobile Number <span className="text-[#9E8E81] font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#9E8E81] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={emailPhone}
                    onChange={(e) => setEmailPhone(e.target.value)}
                    placeholder="0300 1234567"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2] text-xs font-medium text-[#2B2118] focus:outline-none focus:ring-2 focus:ring-[#F26B1D]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-[#F26B1D] hover:bg-[#D95B12] text-white text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-60"
              >
                {loading ? 'Sending 6-Digit OTP to Gmail...' : 'Send 6-Digit OTP to Email'}
              </button>
            </form>
          )}

          {/* STEP 3: 6-Digit OTP Verification Screen */}
          {step === 'verify_otp' && (
            <form onSubmit={handleVerifyOtpSubmit} className="space-y-3.5">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setStep(isGoogleOtpFlow ? 'google_chooser' : 'email_form');
                    setErrorMsg('');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#7A6A5C] hover:text-[#2B2118] cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change Email</span>
                </button>
                <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Email Dispatched</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#FFF9F2] border border-[#F0E4D7] text-xs space-y-1">
                <div className="font-bold text-[#2B2118]">
                  Enter the 6-digit OTP sent to your Gmail:
                </div>
                <div className="font-mono font-bold text-[#F26B1D] break-all">
                  {pendingEmail}
                </div>
                <div className="text-[11px] text-[#7A6A5C] pt-0.5">
                  Please check your Gmail Inbox (and Spam / Promotions tab) for the verification email.
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B2118] mb-1">
                  6-Digit Verification Code (OTP)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#9E8E81] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    autoFocus
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    className="w-full pl-9 pr-3 py-3 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2] text-base font-mono font-black tracking-[0.3em] text-center text-[#2B2118] focus:outline-none focus:ring-2 focus:ring-[#F26B1D]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otpInput.length !== 6}
                className="w-full py-3 px-4 rounded-xl bg-[#F26B1D] hover:bg-[#D95B12] text-white text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-60"
              >
                {loading ? 'Verifying OTP...' : 'Verify OTP & Sign In'}
              </button>

              <div className="flex items-center justify-between text-[11px] text-[#7A6A5C] pt-1">
                <span>Didn&apos;t receive the email?</span>
                <button
                  type="button"
                  disabled={resendCooldown > 0 || loading}
                  onClick={handleResendOtp}
                  className="font-bold text-[#F26B1D] hover:underline disabled:text-[#9E8E81] disabled:no-underline inline-flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP to Gmail'}
                  </span>
                </button>
              </div>
            </form>
          )}

          <div className="pt-2 border-t border-dashed border-[#F0E4D7] text-center">
            <button
              type="button"
              onClick={handleQuickDemoSignIn}
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#FFF1E6] hover:bg-[#FDE4CE] text-[#F26B1D] border border-[#FCD8BF] text-xs font-extrabold transition cursor-pointer active:scale-[0.99] disabled:opacity-60"
            >
              <span>⚡ Quick Demo Sign-In →</span>
            </button>
          </div>
        </div>

        {/* Security & Owner Login Footer */}
        <div className="p-3 bg-[#FFF9F2] border-t border-[#F0E4D7] text-center space-y-1">
          <p className="text-[11px] text-[#7A6A5C]">
            Restaurant owner or manager?{' '}
            <Link
              to="/login"
              state={{ from: '/dashboard' }}
              onClick={handleClose}
              className="text-[#F26B1D] hover:underline font-bold"
            >
              Sign In to Dashboard →
            </Link>
          </p>
          <p className="text-[10px] text-[#9E8E81]">
            🔒 Your account data is private and encrypted.
          </p>
        </div>
      </div>
    </div>
  );
}
