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
  Sparkles,
} from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Destination after login (default to '/' or where user was heading)
  const from = location.state?.from?.pathname || '/';

  // If already logged in, redirect immediately
  React.useEffect(() => {
    if (user) {
      if (user.role === 'admin' && from === '/') {
        navigate('/admin', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    }
  }, [user, from, navigate]);

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

      // If logging in as admin and had no specific destination, go to /admin
      if (loggedInUser.role === 'admin' && from === '/') {
        navigate('/admin', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to sign in. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrorMessage('');
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
            DineHQ
          </h2>
        </div>
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

          {/* Quick Demo Credentials Assistant (Dev Only) */}
          {import.meta.env.DEV && (
            <div className="mt-8 pt-6 border-t border-[#F0E4D7]">
              <div className="flex items-center gap-1.5 mb-3 text-xs font-bold text-[#7A6A5C] uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-[#F5A623]" />
                <span>Instant Test Credentials</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin@dinehq.pk', 'AdminPass123!')}
                  className="p-2.5 text-left rounded-xl border border-[#F0E4D7] bg-[#FFF9F2] hover:bg-[#FFF1E6] hover:border-[#F26B1D]/40 transition group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-[#2B2118] group-hover:text-[#F26B1D]">
                      🛡️ Master Admin
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#FEF3D9] text-[#F5A623] font-bold">
                      Admin
                    </span>
                  </div>
                  <div className="text-[10px] text-[#7A6A5C] font-mono truncate">admin@dinehq.pk</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('owner@burgersmoke.com', 'OwnerPass123!')}
                  className="p-2.5 text-left rounded-xl border border-[#F0E4D7] bg-[#FFF9F2] hover:bg-[#FFF1E6] hover:border-[#F26B1D]/40 transition group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-[#2B2118] group-hover:text-[#F26B1D]">
                      🍔 Store Manager
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#E7F6EC] text-[#1F9D55] font-bold">
                      Owner
                    </span>
                  </div>
                  <div className="text-[10px] text-[#7A6A5C] font-mono truncate">owner@burgersmoke.com</div>
                </button>
              </div>
            </div>
          )}
        </div>

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
