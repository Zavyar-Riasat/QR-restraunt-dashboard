import React, { createContext, useContext, useState, useEffect } from 'react';
import { customerService } from '../services/customerService.js';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';

const CustomerAuthContext = createContext(null);

export function CustomerAuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initialize customer session on mount
  useEffect(() => {
    async function initCustomer() {
      try {
        let current = customerService.getCurrentCustomer();

        // If not in localStorage, check if Supabase has an active OAuth session (e.g. from Google redirect)
        if (!current && isSupabaseConfigured()) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              const meta = session.user.user_metadata || {};
              current = await customerService.loginOrRegister({
                name: meta.full_name || meta.name || session.user.email?.split('@')[0] || 'Customer',
                email: session.user.email,
                phone: session.user.phone || meta.phone || '',
                avatar: meta.avatar_url || meta.picture || null,
              });
            }
          } catch (sessionErr) {
            console.warn('Error reading Supabase session for customer:', sessionErr);
          }
        }

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

  const logoutCustomer = () => {
    customerService.logout();
    setCustomer(null);
    setAddresses([]);
    setFavorites([]);
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
