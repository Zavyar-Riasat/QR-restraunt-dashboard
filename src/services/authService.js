import { supabase } from '../lib/supabaseClient.js';
import { isReservedSlug } from '../config/appConfig.js';

const USERS_STORAGE_KEY = 'dinehq_registered_users';
const CURRENT_SESSION_KEY = 'dinehq_current_session';

// Pre-seeded verified accounts for instant access (NO plain-text passwords stored)
const DEFAULT_ACCOUNTS = [
  {
    id: 'user-admin-01',
    email: 'admin@dineflow.pk',
    name: 'Platform Super Admin',
    role: 'admin',
    restaurant_name: 'Burger & Smoke Co.',
    restaurant_slug: 'burgersmoke',
    phone: '923001234567',
    whatsapp_number: '923001234567',
    password_masked: '••••••••••••',
    must_change_password: false,
    created_at: new Date('2026-10-01T10:00:00Z').toISOString(),
  },
  {
    id: 'user-owner-01',
    email: 'owner@burgersmoke.com',
    name: 'Burger & Smoke Manager',
    role: 'owner',
    restaurant_id: 'rest-101',
    restaurant_name: 'Burger & Smoke Co.',
    restaurant_slug: 'burgersmoke',
    phone: '923001234567',
    whatsapp_number: '923001234567',
    password_masked: '••••••••••••',
    must_change_password: false,
    created_at: new Date('2026-10-05T12:00:00Z').toISOString(),
  },
  {
    id: 'user-owner-02',
    email: 'manager@crust.com',
    name: 'Crust & Crave Manager',
    role: 'owner',
    restaurant_id: 'rest-102',
    restaurant_name: 'Crust & Crave Pizzeria',
    restaurant_slug: 'crust',
    phone: '923005551234',
    whatsapp_number: '923005551234',
    password_masked: '••••••••••••',
    must_change_password: false,
    created_at: new Date('2026-10-06T12:00:00Z').toISOString(),
  },
  {
    id: 'user-owner-03',
    email: 'manager@shinwari.com',
    name: 'Khyber Shinwari Manager',
    role: 'owner',
    restaurant_id: 'rest-103',
    restaurant_name: 'Khyber Shinwari & Karahi Dera',
    restaurant_slug: 'shinwari',
    phone: '923019887766',
    whatsapp_number: '923019887766',
    password_masked: '••••••••••••',
    must_change_password: false,
    created_at: new Date('2026-10-07T12:00:00Z').toISOString(),
  },
  {
    id: 'user-owner-04',
    email: 'manager@greenoasis.com',
    name: 'Green Oasis Manager',
    role: 'owner',
    restaurant_id: 'rest-104',
    restaurant_name: 'Green Oasis Cafe & Bakery',
    restaurant_slug: 'greenoasis',
    phone: '923023344556',
    whatsapp_number: '923023344556',
    password_masked: '••••••••••••',
    must_change_password: false,
    created_at: new Date('2026-10-08T12:00:00Z').toISOString(),
  },
  {
    id: 'user-owner-05',
    email: 'manager@tokyosushi.com',
    name: 'Tokyo Sushi Manager',
    role: 'owner',
    restaurant_id: 'rest-105',
    restaurant_name: 'Tokyo Sushi & Ramen Bar',
    restaurant_slug: 'tokyosushi',
    phone: '923035566778',
    whatsapp_number: '923035566778',
    password_masked: '••••••••••••',
    must_change_password: false,
    created_at: new Date('2026-10-09T12:00:00Z').toISOString(),
  },
  {
    id: 'user-owner-06',
    email: 'manager@royaltaj.com',
    name: 'Royal Taj Manager',
    role: 'owner',
    restaurant_id: 'rest-106',
    restaurant_name: 'Royal Taj Desi Continental',
    restaurant_slug: 'royaltaj',
    phone: '923046677889',
    whatsapp_number: '923046677889',
    password_masked: '••••••••••••',
    must_change_password: false,
    created_at: new Date('2026-10-10T12:00:00Z').toISOString(),
  },
  {
    id: 'user-owner-07',
    email: 'manager@fiestamex.com',
    name: 'Fiesta Mexicana Manager',
    role: 'owner',
    restaurant_id: 'rest-107',
    restaurant_name: 'Fiesta Mexicana Grill & Tacos',
    restaurant_slug: 'fiestamex',
    phone: '923057788990',
    whatsapp_number: '923057788990',
    password_masked: '••••••••••••',
    must_change_password: false,
    created_at: new Date('2026-10-11T12:00:00Z').toISOString(),
  },
  {
    id: 'user-owner-08',
    email: 'manager@sweetretreat.com',
    name: 'Sweet Retreat Manager',
    role: 'owner',
    restaurant_id: 'rest-108',
    restaurant_name: 'Sweet Retreat Desserts & Gelato',
    restaurant_slug: 'sweetretreat',
    phone: '923068899001',
    whatsapp_number: '923068899001',
    password_masked: '••••••••••••',
    must_change_password: false,
    created_at: new Date('2026-10-12T12:00:00Z').toISOString(),
  },
  {
    id: 'user-owner-09',
    email: 'manager@chaijunction.com',
    name: 'Chai Junction Manager',
    role: 'owner',
    restaurant_id: 'rest-109',
    restaurant_name: 'Chai Junction & Traditional Dhaba',
    restaurant_slug: 'chaijunction',
    phone: '923079900112',
    whatsapp_number: '923079900112',
    password_masked: '••••••••••••',
    must_change_password: false,
    created_at: new Date('2026-10-13T12:00:00Z').toISOString(),
  },
  {
    id: 'user-owner-10',
    email: 'manager@stoneove.com',
    name: 'Stone Oven Manager',
    role: 'owner',
    restaurant_id: 'rest-110',
    restaurant_name: 'stoneove',
    restaurant_slug: 'stoneove',
    phone: '923001111111',
    whatsapp_number: '923001111111',
    password_masked: '••••••••••••',
    must_change_password: false,
    created_at: new Date('2026-10-14T12:00:00Z').toISOString(),
  },
];

export const authService = {
  /**
   * Get all registered users for administration (passwords are strictly masked)
   */
  async fetchRegisteredUsers() {
    const session = this.getCurrentSession();
    if (session?.token) {
      try {
        const res = await fetch('/api/admin/users', {
          headers: { Authorization: `Bearer ${session.token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.users)) {
            return data.users;
          }
        }
      } catch (_) {}
    }
    return this.getRegisteredUsers();
  },

  /**
   * Get registered users from local cache (passwords masked)
   */
  getRegisteredUsers() {
    try {
      const stored = localStorage.getItem(USERS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const emailMap = new Map();
          [...DEFAULT_ACCOUNTS, ...parsed].forEach((u) => {
            const userObj = { ...u, password_masked: '••••••••••••' };
            delete userObj.password;
            delete userObj.password_encrypted;
            if (userObj.email && userObj.email.toLowerCase() === 'admin@dinehq.pk') {
              userObj.email = 'admin@dineflow.pk';
            }
            emailMap.set(userObj.email.toLowerCase(), userObj);
          });
          return Array.from(emailMap.values());
        }
      }
    } catch (e) {
      console.warn('Error reading registered users:', e);
    }
    return [...DEFAULT_ACCOUNTS];
  },

  /**
   * Save a newly registered user locally (sanitized)
   */
  saveRegisteredUser(userData) {
    const currentUsers = this.getRegisteredUsers();
    const existingIndex = currentUsers.findIndex(
      (u) => u.email.toLowerCase() === userData.email.toLowerCase()
    );

    const safeUser = {
      id: userData.id || `user-${Date.now()}`,
      email: userData.email.trim().toLowerCase(),
      name: userData.name || userData.restaurant_name || 'Restaurant Owner',
      role: userData.role || 'owner',
      restaurant_id: userData.restaurant_id || null,
      restaurant_name: userData.restaurant_name,
      restaurant_slug: userData.restaurant_slug,
      phone: userData.phone || userData.whatsapp_number || '923001234567',
      whatsapp_number: userData.phone || userData.whatsapp_number || '923001234567',
      password_masked: '••••••••••••',
      must_change_password: Boolean(userData.must_change_password),
      created_at: new Date().toISOString(),
    };

    let updatedUsers;
    if (existingIndex >= 0) {
      updatedUsers = [...currentUsers];
      updatedUsers[existingIndex] = { ...updatedUsers[existingIndex], ...safeUser };
    } else {
      updatedUsers = [safeUser, ...currentUsers];
    }

    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
    } catch (e) {
      console.warn('Failed to persist users to localStorage:', e);
    }

    return safeUser;
  },

  /**
   * Update an existing user's credentials (email, name, role)
   */
  async updateUserCredentials(userId, updates) {
    const currentUsers = this.getRegisteredUsers();
    const userIndex = currentUsers.findIndex(
      (u) => u.id === userId || (u.email && updates.currentEmail && u.email.toLowerCase() === updates.currentEmail.toLowerCase())
    );

    if (userIndex === -1) {
      throw new Error('User account not found.');
    }

    const existingUser = currentUsers[userIndex];
    const newEmail = updates.email ? updates.email.trim().toLowerCase() : existingUser.email;
    const newName = updates.name !== undefined ? updates.name.trim() : existingUser.name;
    const newRestaurantName = updates.restaurant_name !== undefined ? updates.restaurant_name : existingUser.restaurant_name;
    const newRestaurantSlug = updates.restaurant_slug !== undefined ? updates.restaurant_slug : existingUser.restaurant_slug;
    const newPhone = updates.phone !== undefined ? updates.phone : (existingUser.phone || existingUser.whatsapp_number);
    const newRole = updates.role !== undefined ? updates.role : existingUser.role;

    if (updates.restaurant_slug && isReservedSlug(newRestaurantSlug)) {
      throw new Error(`The slug "${newRestaurantSlug}" is reserved by the platform. Please choose a different restaurant slug.`);
    }

    // Check email conflict
    if (newEmail !== existingUser.email) {
      const emailConflict = currentUsers.find(
        (u) => u.id !== existingUser.id && u.email.toLowerCase() === newEmail
      );
      if (emailConflict) {
        throw new Error(`The email "${newEmail}" is already used by another account.`);
      }
    }

    // If a password change was included in update, call server change-password / reset
    if (updates.password) {
      await this.resetPassword(userId, updates.password);
    }

    const updatedUser = {
      ...existingUser,
      email: newEmail,
      name: newName,
      restaurant_name: newRestaurantName,
      restaurant_slug: newRestaurantSlug,
      phone: newPhone,
      whatsapp_number: newPhone,
      role: newRole,
      password_masked: '••••••••••••',
      updated_at: new Date().toISOString(),
    };

    currentUsers[userIndex] = updatedUser;

    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(currentUsers));
    } catch (e) {
      console.warn('Failed to persist updated user:', e);
    }

    // Update active session if matched
    const currentSession = this.getCurrentSession();
    if (currentSession?.user && (currentSession.user.id === existingUser.id || currentSession.user.email === existingUser.email)) {
      currentSession.user = {
        ...currentSession.user,
        email: newEmail,
        name: newName,
        role: newRole,
        restaurant_name: newRestaurantName,
        restaurant_slug: newRestaurantSlug,
      };
      this.saveSession(currentSession);
    }

    return updatedUser;
  },

  /**
   * Delete a registered user
   */
  deleteRegisteredUser(userId) {
    const currentUsers = this.getRegisteredUsers();
    const filtered = currentUsers.filter((u) => u.id !== userId);
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.warn('Failed to delete user:', e);
    }
    return filtered;
  },

  /**
   * Attempt sign in with password via server-side AES-256-GCM verification
   * Compares password in constant time on the server.
   */
  async login(email, password) {
    const cleanEmail = String(email || '').trim().toLowerCase();

    // 1. Primary: Authenticate via server API (decrypts AES-256-GCM and verifies timingSafeEqual)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sign in. Please verify your credentials.');
      }

      const sessionData = {
        user: data.user,
        token: data.sessionToken,
        must_change_password: Boolean(data.must_change_password),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      };

      this.saveSession(sessionData);
      return sessionData;
    } catch (apiErr) {
      throw new Error(apiErr.message || 'Invalid email or password. Please verify your credentials.');
    }
  },

  /**
   * Owner Self-Service Change Password
   */
  async changePassword(currentPassword, newPassword) {
    const session = this.getCurrentSession();
    if (!session?.token) {
      throw new Error('You must be signed in to change your password.');
    }

    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to change password.');
    }

    if (data.sessionToken) {
      this.saveSession({
        ...session,
        token: data.sessionToken,
        must_change_password: false,
      });
    }

    return data;
  },

  /**
   * Master Admin: Decrypt and View a Restaurant Manager's Password
   * Automatically audited and auto-hides after 15 seconds
   */
  async viewPassword(targetUserId) {
    const session = this.getCurrentSession();
    if (!session?.token) {
      throw new Error('Master administrator authentication required.');
    }

    const res = await fetch('/api/admin/passwords/view', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({ targetUserId }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to decrypt password.');
    }

    return data;
  },

  /**
   * Master Admin: Reset Password & Require Change on Next Login
   */
  async resetPassword(targetUserId, manualPassword = null) {
    const session = this.getCurrentSession();
    if (!session?.token) {
      throw new Error('Master administrator authentication required.');
    }

    const res = await fetch('/api/admin/passwords/reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({ targetUserId, manualPassword }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to reset password.');
    }

    return data;
  },

  /**
   * Master Admin: Fetch Security Audit Logs
   */
  async getAuditLogs() {
    const session = this.getCurrentSession();
    if (!session?.token) return [];

    const res = await fetch('/api/admin/audit-logs', {
      headers: { Authorization: `Bearer ${session.token}` },
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.logs || [];
  },

  /**
   * Register a new user and provision restaurant
   */
  async registerUserWithRestaurant({
    email,
    password,
    restaurant_name,
    slug,
    phone,
    whatsapp_number,
    role = 'owner',
  }) {
    const session = this.getCurrentSession();
    const cleanEmail = email.trim().toLowerCase();
    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const rawPhone = phone || whatsapp_number || '923001234567';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');

    if (isReservedSlug(cleanSlug)) {
      throw new Error(`The slug "${cleanSlug}" is reserved by the platform. Please choose a different restaurant slug.`);
    }

    // Try server endpoint if admin session available
    if (session?.token) {
      try {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify({
            email: cleanEmail,
            password,
            restaurant_name,
            restaurant_slug: cleanSlug,
            phone: cleanPhone,
            role,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          this.saveRegisteredUser(data.user);
          return {
            user: data.user,
            generatedPassword: data.generatedPassword,
            restaurant: {
              id: data.user.restaurant_id,
              name: restaurant_name,
              slug: cleanSlug,
              phone: cleanPhone,
            },
          };
        }
      } catch (_) {}
    }

    // Fallback registration
    const savedUser = this.saveRegisteredUser({
      email: cleanEmail,
      name: `${restaurant_name} Manager`,
      role,
      restaurant_name,
      restaurant_slug: cleanSlug,
      phone: cleanPhone,
    });

    return {
      user: savedUser,
      restaurant: {
        id: savedUser.restaurant_id || `rest-${cleanSlug}`,
        name: restaurant_name,
        slug: cleanSlug,
        phone: cleanPhone,
      },
    };
  },

  /**
   * Session Management
   */
  saveSession(sessionData) {
    try {
      localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(sessionData));
    } catch (e) {
      console.warn('Failed to save session:', e);
    }
  },

  getCurrentSession() {
    try {
      const stored = localStorage.getItem(CURRENT_SESSION_KEY);
      if (stored) {
        const session = JSON.parse(stored);
        if (session && session.expiresAt && session.expiresAt > Date.now()) {
          return session;
        }
      }
    } catch (e) {
      console.warn('Invalid session found in storage:', e);
    }
    return null;
  },

  async logout() {
    try {
      await supabase.auth.signOut();
    } catch (_) {}
    localStorage.removeItem(CURRENT_SESSION_KEY);
  },
};
