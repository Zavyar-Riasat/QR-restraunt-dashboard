import React, { createContext, useContext, useState, useEffect } from 'react';
import { customerService } from '../services/customerService.js';

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

  const clearCustomerCartStorage = () => {
    if (typeof window === 'undefined') return;
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (
          k &&
          (k.startsWith('dinehq_cart_') ||
            k === 'dinehq_active_cart_slug' ||
            k === 'dinehq_active_cart_name' ||
            k === 'dinehq_active_order')
        ) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      window.dispatchEvent(new Event('dinehq_cart_updated'));
    } catch {}
  };

  const logoutCustomer = async () => {
    customerService.logout();
    clearCustomerCartStorage();
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
    clearCustomerCartStorage();
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
