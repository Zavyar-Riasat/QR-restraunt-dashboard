import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize session on mount
  useEffect(() => {
    async function initAuth() {
      try {
        // 1. Check local session storage
        const currentSession = authService.getCurrentSession();
        if (currentSession && currentSession.user) {
          setUser(currentSession.user);
          setSession(currentSession);
        } else {
          // 2. Check Supabase auth session if available
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user) {
            const sbUser = data.session.user;
            const userObj = {
              id: sbUser.id,
              email: sbUser.email,
              name: sbUser.user_metadata?.name || 'Restaurant Owner',
              role: sbUser.user_metadata?.role || 'owner',
              restaurant_name: sbUser.user_metadata?.restaurant_name || 'Burger & Smoke Co.',
              restaurant_slug: sbUser.user_metadata?.restaurant_slug || 'burgersmoke',
            };
            setUser(userObj);
            setSession({ user: userObj, token: data.session.access_token });
          }
        }
      } catch (err) {
        console.warn('Error during auth initialization:', err);
      } finally {
        setLoading(false);
      }
    }

    initAuth();

    // Listen to Supabase auth state change
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const sessionData = await authService.login(email, password);
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
    // If the active logged in user was modified, update React context state immediately
    if (user && (user.id === userId || user.email === updates.currentEmail || user.email === updated.email)) {
      setUser({
        ...user,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        restaurant_name: updated.restaurant_name,
        restaurant_slug: updated.restaurant_slug,
        phone: updated.phone || updated.whatsapp_number,
        whatsapp_number: updated.phone || updated.whatsapp_number,
      });
      setSession(authService.getCurrentSession());
    }
    return updated;
  };

  const value = {
    user,
    session,
    loading,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === 'admin',
    login,
    logout,
    registerUser,
    getRegisteredUsers,
    deleteUser,
    updateUserCredentials,
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
