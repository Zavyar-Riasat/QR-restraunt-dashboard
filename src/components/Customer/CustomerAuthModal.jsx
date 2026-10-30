import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  AlertCircle,
  X,
  UtensilsCrossed,
} from 'lucide-react';
import { customerAuthService } from '../../services/customerAuthService.js';
import { useCustomerAuth } from '../../context/CustomerAuthContext.jsx';

export default function CustomerAuthModal({
  isOpen,
  onClose,
  onSuccess,
  title = 'Sign In to Account',
  subtitle = 'Sign in with your Google account to bookmark favorite restaurants, save delivery addresses, and track your orders.',
}) {
  const navigate = useNavigate();
  const { loginCustomer } = useCustomerAuth();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
    }
  }, [isOpen]);

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await customerAuthService.loginWithGoogle();
      if (res.redirecting) return;
      if (res.success && res.customer) {
        await loginCustomer(res.customer);
        if (onSuccess) {
          onSuccess(res.customer);
        } else if (onClose) {
          onClose();
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Google sign in failed.');
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
        await loginCustomer(res.customer);
        if (onSuccess) {
          onSuccess(res.customer);
        } else if (onClose) {
          onClose();
        }
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

        {/* Modal Body: Google Sign-In Only */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-[#FFF9F2] text-[#2B2118] border-2 border-[#F0E4D7] hover:border-[#F26B1D] text-sm font-bold transition flex items-center justify-center gap-3 cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-[#F26B1D] border-t-transparent rounded-full animate-spin" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
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
                <span>Continue with Google</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#7A6A5C] pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Fast, free &amp; secure 1-tap Google authentication</span>
          </div>

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
            🔒 Secured with Google OAuth 2.0. Your data is private and encrypted.
          </p>
        </div>
      </div>
    </div>
  );
}
