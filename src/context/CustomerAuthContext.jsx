import React, { createContext, useContext, useState, useEffect } from 'react';
import { customerService } from '../services/customerService.js';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';

const CustomerAuthContext = createContext(null);

export function CustomerAuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const syncSupabaseUser = async (supaUser) => {
    if (!supaUser) return null;
    const meta = supaUser.user_metadata || {};
    const logged = await customerService.loginOrRegister({
      id: supaUser.id,
      name: meta.full_name || meta.name || supaUser.email?.split('@')[0] || 'Customer',
      email: supaUser.email || '',
      phone: supaUser.phone || meta.phone || '',
      avatar: meta.avatar_url || meta.picture || null,
    });
    setCustomer(logged);
    const [addrs, favs] = await Promise.all([
      customerService.getAddresses(logged.id),
      customerService.getFavorites(logged.id),
    ]);
    setAddresses(addrs);
    setFavorites(favs);
    return logged;
  };

  // Initialize customer session on mount & listen for Google OAuth callback events
  useEffect(() => {
    let authListener = null;

    async function initCustomer() {
      try {
        if (isSupabaseConfigured()) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              await syncSupabaseUser(session.user);
              return;
            }
          } catch (sessionErr) {
            console.warn('Error reading Supabase session for customer:', sessionErr);
          }
        }

        const current = customerService.getCurrentCustomer();
        if (current) {
          setCustomer(current);
          const [addrs, favs] = await Promise.all([
            customerService.getAddresses(current.id),
            customerService.getFavorites(current.id),
          ]);
          setAddresses(addrs);
          setFavorites(favs);
        }
      } catch (err) {
        console.warn('Error initializing customer auth context:', err);
      } finally {
        setLoading(false);
      }
    }

    initCustomer();

    if (isSupabaseConfigured()) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
          await syncSupabaseUser(session.user);
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          customerService.logout();
          setCustomer(null);
          setAddresses([]);
          setFavorites([]);
        }
      });
      authListener = data?.subscription;
    }

    return () => {
      if (authListener) {
        authListener.unsubscribe();
      }
    };
  }, []);

  const loginCustomer = async (customerData) => {
    const loggedCustomer = await customerService.loginOrRegister(customerData);
    setCustomer(loggedCustomer);
    const [addrs, favs] = await Promise.all([
      customerService.getAddresses(loggedCustomer.id),
      customerService.getFavorites(loggedCustomer.id),
    ]);
    setAddresses(addrs);
    setFavorites(favs);
    return loggedCustomer;
  };

  const logoutCustomer = async () => {
    customerService.logout();
    setCustomer(null);
    setAddresses([]);
    setFavorites([]);
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signOut warning:', err);
      }
    }
  };

  const updateProfile = async (updates) => {
    if (!customer?.id) return;
    const updated = await customerService.updateProfile(customer.id, updates);
    setCustomer(updated);
    return updated;
  };

  const deleteAccount = async () => {
    if (!customer?.id) return;
    await customerService.deleteAccount(customer.id);
    setCustomer(null);
    setAddresses([]);
    setFavorites([]);
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch  {}
    }
  };

  const saveAddress = async (addressData) => {
    if (!customer?.id) return;
    const updated = await customerService.saveAddress(customer.id, addressData);
    setAddresses(updated);
    return updated;
  };

  const deleteAddress = async (addressId) => {
    if (!customer?.id) return;
    const updated = await customerService.deleteAddress(customer.id, addressId);
    setAddresses(updated);
    return updated;
  };

  const toggleFavorite = async (restaurantId) => {
    if (!customer?.id) return;
    const updated = await customerService.toggleFavorite(customer.id, restaurantId);
    setFavorites(updated);
    return updated;
  };

  const value = {
    customer,
    addresses,
    favorites,
    loading,
    isCustomerAuthenticated: Boolean(customer),
    loginCustomer,
    logoutCustomer,
    updateProfile,
    deleteAccount,
    saveAddress,
    deleteAddress,
    toggleFavorite,
    isFavorite: (restaurantId) => favorites.includes(restaurantId),
  };

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
}
