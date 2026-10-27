import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Phone,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  X,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  Clock,
  UtensilsCrossed,
} from 'lucide-react';
import { customerAuthService } from '../../services/customerAuthService.js';
import { useCustomerAuth } from '../../context/CustomerAuthContext.jsx';

export default function CustomerAuthModal({
  isOpen,
  onClose,
  onSuccess,
  initialPhone = '',
  title = 'Sign In to DineHQ',
  subtitle = 'Track live orders, manage saved addresses, and view restaurant khata ledgers.',
}) {
  const navigate = useNavigate();
  const { loginCustomer } = useCustomerAuth();

  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState(initialPhone || '');
  const [otpCode, setOtpCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [testCodeHint, setTestCodeHint] = useState('');

  const isLocalhost = customerAuthService.isLocalhost();
  const isTestMode = customerAuthService.isTestMode();
  const testOtp = customerAuthService.getTestOtpCode();

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
      setStep('phone');
      setPhone(initialPhone || '');
      setOtpCode('');
      setErrorMsg('');
      setTestCodeHint(isTestMode ? testOtp : '');
    }
  }, [isOpen, initialPhone, isTestMode, testOtp]);

  // Countdown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Handle Send OTP
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const val = customerAuthService.validatePhone(phone);
    if (!val.isValid) {
      setErrorMsg(val.error || 'Please enter a valid Pakistani phone number (e.g. 0300 1234567).');
      return;
    }

    try {
      setLoading(true);
      const res = await customerAuthService.requestOtp(val.normalized);
      setCooldown(res.cooldownSeconds || 60);
      setTestCodeHint(res.testCode || (isTestMode ? testOtp : ''));
      setStep('otp');
    } catch (err) {
      setErrorMsg(err.message || 'Unable to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Verify OTP
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (!otpCode || otpCode.trim().length < 4) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      const res = await customerAuthService.verifyOtp(phone, otpCode.trim());
      if (res.success && res.customer) {
        await loginCustomer(res.customer);
        if (onSuccess) onSuccess(res.customer);
        if (onClose) onClose();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await customerAuthService.loginWithGoogle();
      if (res.redirecting) return;
      if (res.success && res.customer) {
        await loginCustomer(res.customer);
        if (onSuccess) onSuccess(res.customer);
        if (onClose) onClose();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Google sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  // Demo 1-Click Login
  const handleDemoLogin = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const logged = await loginCustomer({
        name: 'Ahmed Khan',
        phone: '03001234567',
        email: 'ahmed.khan@example.com',
      });
      if (onSuccess) onSuccess(logged);
      if (onClose) onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Demo sign in failed.');
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
          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Test Mode Notification Banner (Localhost Only) */}
          {isLocalhost && isTestMode && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-[11px] font-medium">
                  Test SMS Mode Active (Use code <strong className="font-mono text-amber-800">{testOtp}</strong>)
                </span>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 1: Phone Number Input
              ======================================================== */}
          {step === 'phone' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider mb-1.5">
                  Mobile / WhatsApp Number
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 border-r border-[#F0E4D7] pr-2.5">
                    <span className="text-sm">🇵🇰</span>
                    <span className="text-xs font-bold text-[#7A6A5C]">+92</span>
                  </div>
                  <input
                    type="tel"
                    autoFocus
                    placeholder="0300 1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-22 pr-4 py-2.5 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2]/50 text-sm font-bold text-[#2B2118] placeholder-[#9E8E81] focus:outline-none focus:ring-2 focus:ring-[#F26B1D] focus:bg-white transition"
                  />
                </div>
                <span className="text-[10px] text-[#9E8E81] mt-1 block">
                  Supports Pakistani format: 03XX-XXXXXXX or 03001234567
                </span>
              </div>

              <button
                type="submit"
                disabled={loading || !phone.trim()}
                className="w-full py-3 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#F26B1D]/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending Code...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* OR Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#F0E4D7]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-[#9E8E81] font-bold text-[10px] uppercase">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-[#FFF9F2] text-[#2B2118] border border-[#F0E4D7] text-xs font-bold transition flex items-center justify-center gap-2.5 cursor-pointer shadow-2xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                <span>Continue with Google</span>
              </button>

              {/* 1-Click Demo Shortcut (Localhost Only) */}
              {isLocalhost && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={handleDemoLogin}
                    className="text-[11px] font-bold text-[#F26B1D] hover:underline cursor-pointer inline-flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Quick Demo: 1-Click Sign In as Ahmed Khan</span>
                  </button>
                </div>
              )}
            </form>
          )}

          {/* ========================================================
              STEP 2: Enter 6-digit OTP Code
              ======================================================== */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex items-center justify-between text-xs pb-1">
                <span className="text-[#7A6A5C]">
                  Code sent to <strong className="text-[#2B2118] font-mono">{phone}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="font-bold text-[#F26B1D] hover:underline cursor-pointer"
                >
                  Edit Number
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B2118] uppercase tracking-wider mb-1.5">
                  6-Digit Verification Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#7A6A5C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#F0E4D7] bg-[#FFF9F2]/50 text-lg font-mono font-bold tracking-widest text-[#2B2118] placeholder-[#9E8E81] text-center focus:outline-none focus:ring-2 focus:ring-[#F26B1D] focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Test Code Paste Shortcut (Localhost Only) */}
              {isLocalhost && isTestMode && testCodeHint && (
                <div className="flex items-center justify-between bg-amber-50 p-2 rounded-xl text-xs">
                  <span className="text-amber-900 font-medium">
                    Test Code: <strong>{testCodeHint}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setOtpCode(testCodeHint)}
                    className="px-2 py-0.5 rounded-lg bg-amber-200/80 hover:bg-amber-300 font-bold text-amber-900 transition cursor-pointer text-[10px]"
                  >
                    Paste Code
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otpCode.length < 4}
                className="w-full py-3 rounded-xl bg-[#F26B1D] hover:bg-[#D95A12] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#F26B1D]/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify & Continue</span>
                  </>
                )}
              </button>

              {/* Resend Cooldown */}
              <div className="text-center pt-2">
                {cooldown > 0 ? (
                  <span className="text-xs text-[#7A6A5C] flex items-center justify-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#9E8E81]" />
                    <span>Resend code in {cooldown}s</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="text-xs font-bold text-[#F26B1D] hover:underline cursor-pointer"
                  >
                    Didn't receive code? Resend SMS
                  </button>
                )}
              </div>
            </form>
          )}
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
            🔒 Bank-grade OTP authentication. Your data is private and encrypted.
          </p>
        </div>
      </div>
    </div>
  );
}
