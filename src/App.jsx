import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import OwnerDashboardPage from './pages/OwnerDashboardPage';
import CustomerMenuPage from './pages/CustomerMenuPage';
import LoginPage from './pages/LoginPage';
import AdminPanelPage from './pages/AdminPanelPage';
import RiderDeliveryPage from './pages/RiderDeliveryPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Customer Authentication Page */}
          <Route path="/login" element={<LoginPage />} />

          {/* Public No-Login Delivery Rider Page */}
          <Route path="/rider/:token" element={<RiderDeliveryPage />} />

          {/* Master Admin Portal (Restricted to Administrators via Middleware) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminPanelPage />
              </ProtectedRoute>
            }
          />

          {/* Restaurant Owner SaaS Dashboard (Restricted to Authenticated Managers via Middleware) */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <OwnerDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <OwnerDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Customer-Facing Mobile Web Menus (Open to Public Diners) */}
          <Route path="/menu/:slug" element={<CustomerMenuPage />} />
          <Route path="/:slug" element={<CustomerMenuPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
