import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import { LanguageProvider } from './context/LanguageContext';
import ProtectedRoute from './components/ProtectedRoute';

import MarketplaceHomePage from './pages/MarketplaceHomePage';
import CustomerAccountPage from './pages/CustomerAccountPage';
import OwnerDashboardPage from './pages/OwnerDashboardPage';
import CustomerMenuPage from './pages/CustomerMenuPage';
import LoginPage from './pages/LoginPage';
import AdminPanelPage from './pages/AdminPanelPage';
import RiderDeliveryPage from './pages/RiderDeliveryPage';

function PageLoader() {
  return (
    <div className="min-h-screen bg-[#FFF9F2] flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-[#F26B1D] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/**
 * Legacy Dashboard Redirect Component
 * Redirects legacy /dashboard and /admin paths to the new /:restaurantSlug/admin (or /superadmin)
 */
function LegacyDashboardRedirect() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF9F2] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#F26B1D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user.role === 'admin') {
    return <Navigate to="/superadmin" replace />;
  }

  const slug = user.restaurant_slug || 'burgersmoke';
  return <Navigate to={`/${slug}/admin`} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <CustomerAuthProvider>
        <LanguageProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* 1. Public Marketplace Home Page (Nearby Approved Restaurants) */}
                <Route path="/" element={<MarketplaceHomePage />} />

                {/* 2. Customer Dashboard & Saved Addresses / Orders (Sign-in required) */}
                <Route path="/account" element={<CustomerAccountPage />} />

                {/* 3. Authentication & Sign In */}
                <Route path="/login" element={<LoginPage />} />

                {/* 4. Public No-Login Delivery Rider Page */}
                <Route path="/rider/:token" element={<RiderDeliveryPage />} />

                {/* 5. Master Console (Superadmin) */}
                <Route
                  path="/superadmin"
                  element={
                    <ProtectedRoute requireAdmin={true}>
                      <AdminPanelPage />
                    </ProtectedRoute>
                  }
                />

                {/* 6. Legacy Redirects for /dashboard and /admin */}
                <Route path="/dashboard" element={<LegacyDashboardRedirect />} />
                <Route path="/admin" element={<LegacyDashboardRedirect />} />

                {/* 7. Restaurant Owner / Manager Dashboard (Moved to /:restaurantSlug/admin) */}
                <Route
                  path="/:restaurantSlug/admin"
                  element={
                    <ProtectedRoute>
                      <OwnerDashboardPage />
                    </ProtectedRoute>
                  }
                />

                {/* 8. Backward-Compatible /menu/:slug route for existing printed collateral */}
                <Route path="/menu/:slug" element={<CustomerMenuPage />} />

                {/* 9. Customer-Facing Restaurant Menu (/:restaurantSlug) - Keeps existing QR codes working */}
                <Route path="/:restaurantSlug" element={<CustomerMenuPage />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </LanguageProvider>
      </CustomerAuthProvider>
    </AuthProvider>
  );
}
