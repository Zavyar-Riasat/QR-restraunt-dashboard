import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const verifyAndSyncSession = useCallback(() => {
    const verifiedSession = authService.getCurrentSession();
    if (verifiedSession && verifiedSession.user) {
      setUser(verifiedSession.user);
      setSession(verifiedSession);
      return verifiedSession;
    } else {
      setUser(null);
      setSession(null);
      return null;
    }
  }, []);

  // Initialize and continuously monitor session cryptographic integrity
  useEffect(() => {
    try {
      verifyAndSyncSession();
    } catch (err) {
      console.warn('Error during auth initialization:', err);
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }

    // Real-time anti-tamper listener: if someone edits localStorage in DevTools, immediately verify or revoke
    const handleStorageOrFocus = () => {
      verifyAndSyncSession();
    };

    window.addEventListener('storage', handleStorageOrFocus);
    window.addEventListener('focus', handleStorageOrFocus);

    const integrityTimer = setInterval(() => {
      verifyAndSyncSession();
    }, 15000);

    return () => {
      window.removeEventListener('storage', handleStorageOrFocus);
      window.removeEventListener('focus', handleStorageOrFocus);
      clearInterval(integrityTimer);
    };
  }, [verifyAndSyncSession]);

  const login = async (email, password) => {
    const sessionData = await authService.login(email, password);
    setUser(sessionData.user);
    setSession(sessionData);
    return sessionData.user;
  };

  const loginAsUser = (account) => {
    const sessionData = authService.loginAsAccount(account);
    setUser(sessionData.user);
    setSession(sessionData);
    return sessionData.user;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setSession(null);
  };

  const registerUser = async (registrationData) => {
    return await authService.registerUserWithRestaurant(registrationData);
  };

  const getRegisteredUsers = () => {
    return authService.getRegisteredUsers();
  };

  const deleteUser = (userId) => {
    return authService.deleteRegisteredUser(userId);
  };

  const updateUserCredentials = async (userId, updates) => {
    const updated = await authService.updateUserCredentials(userId, updates);
    if (user && (user.id === userId || user.email === updates.currentEmail || user.email === updated.email)) {
      const refreshed = authService.getCurrentSession();
      setUser(refreshed?.user || null);
      setSession(refreshed || null);
    }
    return updated;
  };

  const changePassword = async (currentPassword, newPassword) => {
    const res = await authService.changePassword(currentPassword, newPassword);
    verifyAndSyncSession();
    return res;
  };

  const viewPassword = async (userId) => {
    return await authService.viewPassword(userId);
  };

  const resetPassword = async (userId, manualPassword = null) => {
    return await authService.resetPassword(userId, manualPassword);
  };

  const getAuditLogs = async () => {
    return await authService.getAuditLogs();
  };

  const fetchRegisteredUsers = async () => {
    return await authService.fetchRegisteredUsers();
  };

  const value = {
    user,
    session,
    loading,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === 'admin',
    login,
    loginAsUser,
    logout,
    registerUser,
    getRegisteredUsers,
    fetchRegisteredUsers,
    deleteUser,
    updateUserCredentials,
    changePassword,
    viewPassword,
    resetPassword,
    getAuditLogs,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
