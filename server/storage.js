/**
 * Server-Side Persistent Storage for Encrypted User Accounts & Audit Logs
 * Ensures plain text passwords are never stored.
 */

import fs from 'node:fs';
import path from 'node:path';
import { encryptPassword } from './crypto.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users_encrypted.json');
const AUDIT_LOGS_FILE = path.join(DATA_DIR, 'audit_logs.json');
const LOCKOUTS_FILE = path.join(DATA_DIR, 'login_lockouts.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Initial provisioned accounts, pre-encrypted
function getInitialProvisionedUsers() {
  return [
    {
      id: 'user-admin-01',
      email: 'admin@dineflow.pk',
      name: 'Platform Super Admin',
      role: 'admin',
      restaurant_name: 'Burger & Smoke Co.',
      restaurant_slug: 'burgersmoke',
      phone: '923001234567',
      password_encrypted: encryptPassword('AdminPass123!'),
      must_change_password: false,
      session_version: 1,
      created_at: new Date('2026-10-01T10:00:00Z').toISOString(),
    },
    {
      id: 'user-owner-01',
      email: 'owner@burgersmoke.com',
      name: 'Burger & Smoke Owner',
      role: 'owner',
      restaurant_id: 'rest-101',
      restaurant_name: 'Burger & Smoke Co.',
      restaurant_slug: 'burgersmoke',
      phone: '923001234567',
      password_encrypted: encryptPassword('OwnerPass123!'),
      must_change_password: false,
      session_version: 1,
      created_at: new Date('2026-10-05T12:00:00Z').toISOString(),
    },
    {
      id: 'user-manager-01',
      email: 'manager@burgersmoke.com',
      name: 'Burger & Smoke Manager',
      role: 'manager',
      restaurant_id: 'rest-101',
      restaurant_name: 'Burger & Smoke Co.',
      restaurant_slug: 'burgersmoke',
      phone: '923002223344',
      password_encrypted: encryptPassword('ManagerPass123!'),
      must_change_password: false,
      session_version: 1,
      created_by_role: 'owner',
      created_at: new Date('2026-10-05T12:15:00Z').toISOString(),
    },
    {
      id: 'user-cashier-01',
      email: 'cashier@burgersmoke.com',
      name: 'Counter Cashier',
      role: 'cashier',
      restaurant_id: 'rest-101',
      restaurant_name: 'Burger & Smoke Co.',
      restaurant_slug: 'burgersmoke',
      phone: '923003334455',
      password_encrypted: encryptPassword('CashierPass123!'),
      must_change_password: false,
      session_version: 1,
      created_by_role: 'manager',
      created_at: new Date('2026-10-05T12:30:00Z').toISOString(),
    },
    {
      id: 'user-waiter-01',
      email: 'waiter@burgersmoke.com',
      name: 'Floor Waiter',
      role: 'waiter',
      restaurant_id: 'rest-101',
      restaurant_name: 'Burger & Smoke Co.',
      restaurant_slug: 'burgersmoke',
      phone: '923004445566',
      password_encrypted: encryptPassword('WaiterPass123!'),
      must_change_password: false,
      session_version: 1,
      created_by_role: 'manager',
      created_at: new Date('2026-10-05T12:45:00Z').toISOString(),
    },
  ];
}

export const serverStorage = {
  /**
   * Load all users with encrypted passwords
   */
  getUsers() {
    ensureDataDir();
    if (!fs.existsSync(USERS_FILE)) {
      const initial = getInitialProvisionedUsers();
      fs.writeFileSync(USERS_FILE, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }

    try {
      const content = fs.readFileSync(USERS_FILE, 'utf8');
      const users = JSON.parse(content);
      if (Array.isArray(users) && users.length > 0) {
        // Ensure default 4-tier accounts exist in store
        const initial = getInitialProvisionedUsers();
        let added = false;
        for (const seedUser of initial) {
          if (!users.some((u) => u.email.toLowerCase() === seedUser.email.toLowerCase())) {
            users.push(seedUser);
            added = true;
          }
        }
        if (added) {
          fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
        }
        return users;
      }
    } catch (e) {
      console.warn('Error reading encrypted users store:', e.message);
    }

    const fallback = getInitialProvisionedUsers();
    fs.writeFileSync(USERS_FILE, JSON.stringify(fallback, null, 2), 'utf8');
    return fallback;
  },

  /**
   * Save full list of users with encrypted passwords
   */
  saveUsers(users) {
    ensureDataDir();
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  },

  /**
   * Find user by email
   */
  findUserByEmail(email) {
    if (!email) return null;
    const clean = String(email).trim().toLowerCase();
    const users = this.getUsers();
    return users.find((u) => u.email.toLowerCase() === clean) || null;
  },

  /**
   * Find user by ID
   */
  findUserById(userId) {
    if (!userId) return null;
    const users = this.getUsers();
    return users.find((u) => u.id === userId) || null;
  },

  /**
   * Update a specific user's attributes (e.g. password_encrypted, must_change_password, session_version)
   */
  updateUser(userId, updates) {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) {
      throw new Error(`User with ID "${userId}" not found.`);
    }

    // Ensure plain text password is never stored
    const safeUpdates = { ...updates };
    delete safeUpdates.password;

    users[idx] = {
      ...users[idx],
      ...safeUpdates,
      updated_at: new Date().toISOString(),
    };

    this.saveUsers(users);
    return users[idx];
  },

  /**
   * Save or register a new user with encrypted password
   */
  createUser(userData) {
    const users = this.getUsers();
    const cleanEmail = userData.email.trim().toLowerCase();

    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      throw new Error(`A user with email "${cleanEmail}" is already registered.`);
    }

    // Encrypt password if plain text was provided
    let passwordEncrypted = userData.password_encrypted;
    if (!passwordEncrypted && userData.password) {
      passwordEncrypted = encryptPassword(userData.password);
    }

    if (!passwordEncrypted) {
      throw new Error('User must have an encrypted password.');
    }

    const newUser = {
      id: userData.id || `user-${Date.now()}`,
      email: cleanEmail,
      name: userData.name || `${userData.restaurant_name || 'Store'} Manager`,
      role: userData.role || 'owner',
      restaurant_id: userData.restaurant_id || null,
      restaurant_name: userData.restaurant_name,
      restaurant_slug: userData.restaurant_slug,
      phone: userData.phone || '923001234567',
      password_encrypted: passwordEncrypted,
      must_change_password: Boolean(userData.must_change_password),
      session_version: 1,
      created_at: new Date().toISOString(),
    };

    users.push(newUser);
    this.saveUsers(users);
    return newUser;
  },

  /**
   * Delete a user
   */
  deleteUser(userId) {
    const users = this.getUsers();
    const filtered = users.filter((u) => u.id !== userId);
    this.saveUsers(filtered);
    return filtered;
  },

  /**
   * Record Audit Log for sensitive master admin operations (e.g. view password, reset password)
   */
  recordAuditLog(entry) {
    ensureDataDir();
    let logs = [];
    if (fs.existsSync(AUDIT_LOGS_FILE)) {
      try {
        logs = JSON.parse(fs.readFileSync(AUDIT_LOGS_FILE, 'utf8'));
      } catch  {
        logs = [];
      }
    }

    const newLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };

    logs.unshift(newLog);
    // Keep last 500 audit log entries
    if (logs.length > 500) logs = logs.slice(0, 500);

    fs.writeFileSync(AUDIT_LOGS_FILE, JSON.stringify(logs, null, 2), 'utf8');
    return newLog;
  },

  /**
   * Get all Audit Logs (Master Admin only)
   */
  getAuditLogs() {
    ensureDataDir();
    if (!fs.existsSync(AUDIT_LOGS_FILE)) return [];
    try {
      return JSON.parse(fs.readFileSync(AUDIT_LOGS_FILE, 'utf8'));
    } catch  {
      return [];
    }
  },

  /**
   * Rate Limiting & Temporary Lockout Management
   */
  getLockouts() {
    ensureDataDir();
    if (!fs.existsSync(LOCKOUTS_FILE)) return {};
    try {
      return JSON.parse(fs.readFileSync(LOCKOUTS_FILE, 'utf8'));
    } catch  {
      return {};
    }
  },

  saveLockouts(lockouts) {
    ensureDataDir();
    fs.writeFileSync(LOCKOUTS_FILE, JSON.stringify(lockouts, null, 2), 'utf8');
  },

  /**
   * Check if an email/IP is locked out
   * @returns {{ locked: boolean, remainingSeconds?: number }}
   */
  checkLockout(identifier) {
    if (!identifier) return { locked: false };
    const lockouts = this.getLockouts();
    const entry = lockouts[identifier.toLowerCase()];
    if (!entry) return { locked: false };

    const now = Date.now();
    if (entry.lockedUntil && entry.lockedUntil > now) {
      const remainingSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
      return { locked: true, remainingSeconds };
    }

    return { locked: false };
  },

  /**
   * Record a failed login attempt; locks after 5 failed attempts for 15 minutes
   */
  recordFailedLogin(identifier) {
    if (!identifier) return;
    const lockouts = this.getLockouts();
    const key = identifier.toLowerCase();
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes

    const existing = lockouts[key] || { attempts: [], lockedUntil: 0 };
    const recentAttempts = (existing.attempts || []).filter((t) => now - t < windowMs);
    recentAttempts.push(now);

    let lockedUntil = existing.lockedUntil || 0;
    if (recentAttempts.length >= 5) {
      lockedUntil = now + 15 * 60 * 1000; // 15-minute lockout
    }

    lockouts[key] = {
      attempts: recentAttempts,
      lockedUntil,
      lastFailed: now,
    };

    this.saveLockouts(lockouts);
    const remainingSeconds = lockedUntil > now ? Math.ceil((lockedUntil - now) / 1000) : 0;
    return {
      attempts: recentAttempts.length,
      attemptsCount: recentAttempts.length,
      locked: lockedUntil > now,
      remainingSeconds,
    };
  },

  /**
   * Reset failed login attempts on successful login
   */
  resetFailedLogins(identifier) {
    if (!identifier) return;
    const lockouts = this.getLockouts();
    const key = identifier.toLowerCase();
    if (lockouts[key]) {
      delete lockouts[key];
      this.saveLockouts(lockouts);
    }
  },
};

/**
 * Strips password and encrypted password data from user object before sending to client
 */
export function sanitizeUserForClient(user) {
  if (!user) return null;
  const { password: _password, password_encrypted: _password_encrypted, ciphertext: _ciphertext, iv: _iv, authTag: _authTag, ...safeUser } = user;
  return {
    ...safeUser,
    password_masked: '••••••••••••',
  };
}
