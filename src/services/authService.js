import { supabase } from '../lib/supabaseClient';

const USERS_STORAGE_KEY = 'dinehq_registered_users';
const CURRENT_SESSION_KEY = 'dinehq_current_session';

// Pre-seeded verified accounts for instant access
const DEFAULT_ACCOUNTS = [
  {
    id: 'user-admin-01',
    email: 'admin@dinehq.pk',
    password: 'AdminPass123!',
    name: 'Platform Super Admin',
    role: 'admin',
    restaurant_name: 'Burger & Smoke Co.',
    restaurant_slug: 'burgersmoke',
    whatsapp_number: '923001234567',
    created_at: new Date('2026-10-01T10:00:00Z').toISOString(),
  },
  {
    id: 'user-owner-01',
    email: 'owner@burgersmoke.com',
    password: 'OwnerPass123!',
    name: 'Burger & Smoke Manager',
    role: 'owner',
    restaurant_name: 'Burger & Smoke Co.',
    restaurant_slug: 'burgersmoke',
    whatsapp_number: '923001234567',
    created_at: new Date('2026-10-05T12:00:00Z').toISOString(),
  },
];

export const authService = {
  /**
   * Get all registered users (combining default and locally stored users)
   */
  getRegisteredUsers() {
    try {
      const stored = localStorage.getItem(USERS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge with default accounts, avoiding duplicate emails
          const emailMap = new Map();
          [...DEFAULT_ACCOUNTS, ...parsed].forEach((u) => {
            emailMap.set(u.email.toLowerCase(), u);
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
   * Save a newly registered user and persist
   */
  saveRegisteredUser(userData) {
    const currentUsers = this.getRegisteredUsers();
    // Check if email already exists
    const existingIndex = currentUsers.findIndex(
      (u) => u.email.toLowerCase() === userData.email.toLowerCase()
    );

    const newUser = {
      id: userData.id || `user-${Date.now()}`,
      email: userData.email.trim().toLowerCase(),
      password: userData.password,
      name: userData.name || userData.restaurant_name || 'Restaurant Owner',
      role: userData.role || 'owner',
      restaurant_id: userData.restaurant_id || null,
      restaurant_name: userData.restaurant_name,
      restaurant_slug: userData.restaurant_slug,
      whatsapp_number: userData.whatsapp_number,
      created_at: new Date().toISOString(),
    };

    let updatedUsers;
    if (existingIndex >= 0) {
      updatedUsers = [...currentUsers];
      updatedUsers[existingIndex] = { ...updatedUsers[existingIndex], ...newUser };
    } else {
      updatedUsers = [newUser, ...currentUsers];
    }

    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
    } catch (e) {
      console.warn('Failed to persist users to localStorage:', e);
    }

    return newUser;
  },

  /**
   * Update an existing user's credentials (email, password, name, details)
   */
  async updateUserCredentials(userId, updates) {
    const currentUsers = this.getRegisteredUsers();
    const userIndex = currentUsers.findIndex(
      (u) => u.id === userId || (u.email && updates.currentEmail && u.email.toLowerCase() === updates.currentEmail.toLowerCase())
    );

    if (userIndex === -1) {
      throw new Error(`User account not found.`);
    }

    const existingUser = currentUsers[userIndex];
    const newEmail = updates.email ? updates.email.trim().toLowerCase() : existingUser.email;
    const newPassword = updates.password ? updates.password.trim() : existingUser.password;
    const newName = updates.name !== undefined ? updates.name.trim() : existingUser.name;
    const newRestaurantName = updates.restaurant_name !== undefined ? updates.restaurant_name : existingUser.restaurant_name;
    const newRestaurantSlug = updates.restaurant_slug !== undefined ? updates.restaurant_slug : existingUser.restaurant_slug;
    const newWhatsapp = updates.whatsapp_number !== undefined ? updates.whatsapp_number : existingUser.whatsapp_number;
    const newRole = updates.role !== undefined ? updates.role : existingUser.role;

    // Check if new email conflicts with another user
    if (newEmail !== existingUser.email) {
      const emailConflict = currentUsers.find(
        (u) => u.id !== existingUser.id && u.email.toLowerCase() === newEmail
      );
      if (emailConflict) {
        throw new Error(`The email "${newEmail}" is already used by another account.`);
      }
    }

    const updatedUser = {
      ...existingUser,
      email: newEmail,
      password: newPassword,
      name: newName,
      restaurant_name: newRestaurantName,
      restaurant_slug: newRestaurantSlug,
      whatsapp_number: newWhatsapp,
      role: newRole,
      updated_at: new Date().toISOString(),
    };

    currentUsers[userIndex] = updatedUser;

    // Update in-memory default accounts if matched
    const defaultAcc = DEFAULT_ACCOUNTS.find((d) => d.id === existingUser.id || d.email === existingUser.email);
    if (defaultAcc) {
      defaultAcc.email = newEmail;
      defaultAcc.password = newPassword;
      defaultAcc.name = newName;
      defaultAcc.restaurant_name = newRestaurantName;
      defaultAcc.restaurant_slug = newRestaurantSlug;
      defaultAcc.whatsapp_number = newWhatsapp;
      defaultAcc.role = newRole;
    }

    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(currentUsers));
    } catch (e) {
      console.warn('Failed to persist updated user:', e);
    }

    // If this is the currently logged in user session, update active session
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

    // Try Supabase auth sync if available
    try {
      if (updates.email || updates.password) {
        await supabase.auth.updateUser({
          email: newEmail,
          password: newPassword,
          data: { name: newName, role: newRole, restaurant_name: newRestaurantName, restaurant_slug: newRestaurantSlug },
        });
      }
    } catch (sbErr) {
      // In sandbox/local mode Supabase might not have this session, safe to ignore
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
   * Attempt sign in with password
   */
  async login(email, password) {
    const cleanEmail = email.trim().toLowerCase();

    // 1. First check our local/provisioned user registry
    const registeredUsers = this.getRegisteredUsers();
    const localMatch = registeredUsers.find(
      (u) => u.email.toLowerCase() === cleanEmail && u.password === password
    );

    // 2. Also try Supabase Auth if online
    let supabaseUser = null;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (!error && data?.user) {
        supabaseUser = data.user;
      }
    } catch (sbErr) {
      // Supabase might fail or give "Email not confirmed", which is expected for unconfirmed test accounts
      console.info('Supabase auth attempt notice:', sbErr.message);
    }

    if (localMatch) {
      const sessionData = {
        user: {
          id: supabaseUser?.id || localMatch.id,
          email: localMatch.email,
          name: localMatch.name,
          role: localMatch.role,
          restaurant_id: localMatch.restaurant_id,
          restaurant_name: localMatch.restaurant_name,
          restaurant_slug: localMatch.restaurant_slug,
        },
        token: `session-${Date.now()}`,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      };
      this.saveSession(sessionData);
      return sessionData;
    }

    if (supabaseUser) {
      const sessionData = {
        user: {
          id: supabaseUser.id,
          email: supabaseUser.email,
          name: supabaseUser.user_metadata?.name || 'Restaurant Owner',
          role: supabaseUser.user_metadata?.role || 'owner',
          restaurant_name: supabaseUser.user_metadata?.restaurant_name || 'Restaurant',
          restaurant_slug: supabaseUser.user_metadata?.restaurant_slug || 'burgersmoke',
        },
        token: `session-${Date.now()}`,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      };
      this.saveSession(sessionData);
      return sessionData;
    }

    throw new Error('Invalid email or password. Please verify your credentials.');
  },

  /**
   * Register a new user and provision restaurant
   */
  async registerUserWithRestaurant({
    email,
    password,
    restaurant_name,
    slug,
    whatsapp_number,
    role = 'owner',
  }) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const cleanPhone = whatsapp_number.replace(/[^0-9]/g, '');

    // 1. Check if email already registered in our registry
    const existing = this.getRegisteredUsers().find(
      (u) => u.email.toLowerCase() === cleanEmail
    );
    if (existing) {
      throw new Error(`A user with email "${cleanEmail}" is already registered.`);
    }

    // 2. Try Supabase Auth Sign Up
    let supabaseUserId = null;
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            name: restaurant_name,
            role,
            restaurant_name,
            restaurant_slug: cleanSlug,
          },
        },
      });

      if (!signUpError && signUpData?.user) {
        supabaseUserId = signUpData.user.id;
      }
    } catch (e) {
      console.warn('Supabase auth sign up notice:', e.message);
    }

    // 3. Provision Restaurant in Supabase table
    let provisionedRestId = null;
    try {
      // Check if slug exists in Supabase
      const { data: existingRest } = await supabase
        .from('restaurants')
        .select('id')
        .eq('slug', cleanSlug)
        .maybeSingle();

      if (existingRest) {
        provisionedRestId = existingRest.id;
      } else {
        const { data: newRest, error: restInsertError } = await supabase
          .from('restaurants')
          .insert([
            {
              owner_id: supabaseUserId || null,
              name: restaurant_name,
              slug: cleanSlug,
              whatsapp_number: cleanPhone,
            },
          ])
          .select()
          .single();

        if (!restInsertError && newRest) {
          provisionedRestId = newRest.id;

          // Seed default starter categories for this restaurant
          const { data: catData } = await supabase
            .from('categories')
            .insert([
              { restaurant_id: newRest.id, name: 'Chef Specials' },
              { restaurant_id: newRest.id, name: 'Main Course' },
              { restaurant_id: newRest.id, name: 'Beverages & Desserts' },
            ])
            .select();

          // Seed a starter item so menu is not completely empty
          if (catData && catData.length > 0) {
            await supabase.from('menu_items').insert([
              {
                restaurant_id: newRest.id,
                category_id: catData[0].id,
                title: `${restaurant_name} Signature Platter`,
                price: 1250,
                variants: [
                  {
                    id: 'v-1',
                    name: 'Portion Size',
                    type: 'single',
                    required: true,
                    options: [
                      { id: 'o-1', name: 'Regular Serving', price_delta: 0 },
                      { id: 'o-2', name: 'Jumbo Feast (Serves 2-3)', price_delta: 450 },
                    ],
                  },
                ],
              },
            ]);
          }
        }
      }
    } catch (tableErr) {
      console.warn('Error inserting restaurant into Supabase:', tableErr.message);
    }

    // 4. Save to our registered users database
    const savedUser = this.saveRegisteredUser({
      id: supabaseUserId || `user-${Date.now()}`,
      email: cleanEmail,
      password,
      name: `${restaurant_name} Manager`,
      role,
      restaurant_id: provisionedRestId,
      restaurant_name,
      restaurant_slug: cleanSlug,
      whatsapp_number: cleanPhone,
    });

    return {
      user: savedUser,
      restaurant: {
        id: provisionedRestId,
        name: restaurant_name,
        slug: cleanSlug,
        whatsapp_number: cleanPhone,
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
    } catch (e) {
      // Ignore signout error
    }
    localStorage.removeItem(CURRENT_SESSION_KEY);
  },
};
