import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-800 font-heading font-bold text-sm">Verifying Security Credentials...</p>
        <p className="text-xs text-slate-500 mt-1">Checking manager authorization</p>
      </div>
    );
  }

  // If no authenticated user, strictly redirect to Login page
  // This prevents any customer from browsing directly into the manager/owner dashboard
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If route requires admin role and current user is not admin
  if (requireAdmin && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200/80 shadow-xl p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4 text-amber-600">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-heading font-extrabold text-slate-900 mb-2">
            Administrator Access Required
          </h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Your account (<span className="font-semibold text-slate-800">{user.email}</span>) does not have platform administrator privileges. This area is reserved for master provisioning.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Kitchen Dashboard</span>
          </a>
        </div>
      </div>
    );
  }

  return children;
}
