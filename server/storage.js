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

// Initial provisioned accounts, pre-encrypted with AES-256-GCM (zero plain-text passwords in source)
function getInitialProvisionedUsers() {
  return [
    {
        "id": "user-admin-01",
        "email": "admin@dineflow.pk",
        "name": "Platform Super Admin",
        "role": "admin",
        "restaurant_name": "Burger & Smoke Co.",
        "restaurant_slug": "burgersmoke",
        "phone": "923001234567",
        "password_encrypted": {
            "algorithm": "aes-256-gcm",
            "ciphertext": "a44461aa17d38f03bb93aa5415",
            "iv": "e547e689d10b59681754f21e",
            "authTag": "aefa97291702bd21a4b538745b880409"
        },
        "must_change_password": false,
        "session_version": 1,
        "created_at": "2026-10-01T10:00:00.000Z"
    },
    {
        "id": "user-owner-01",
        "email": "owner@burgersmoke.com",
        "name": "Burger & Smoke Manager",
        "role": "owner",
        "restaurant_id": "rest-101",
        "restaurant_name": "Burger & Smoke Co.",
        "restaurant_slug": "burgersmoke",
        "phone": "923001234567",
        "password_encrypted": {
            "algorithm": "aes-256-gcm",
            "ciphertext": "a9cea29eb187fc0e86e204e269",
            "iv": "c27ea02fc7d012cd027dc82a",
            "authTag": "c8f0a377ca69d91147670638c5bc3aad"
        },
        "must_change_password": false,
        "session_version": 4,
        "created_at": "2026-10-05T12:00:00.000Z",
        "updated_at": "2026-11-02T06:07:23.404Z"
    },
    {
        "id": "user-owner-02",
        "email": "manager@crust.com",
        "name": "Crust & Crave Manager",
        "role": "owner",
        "restaurant_id": "rest-102",
        "restaurant_name": "Crust & Crave Pizzeria",
        "restaurant_slug": "crust",
        "phone": "923005551234",
        "password_encrypted": {
            "algorithm": "aes-256-gcm",
            "ciphertext": "d0e452c552cdd2f7346c1470b9",
            "iv": "f543dbb781f009f582008889",
            "authTag": "dbf7a57ec768173da1f521970aecc451"
        },
        "must_change_password": false,
        "session_version": 1,
        "created_at": "2026-10-06T12:00:00.000Z"
    },
    {
        "id": "user-owner-03",
        "email": "manager@shinwari.com",
        "name": "Khyber Shinwari Manager",
        "role": "owner",
        "restaurant_id": "rest-103",
        "restaurant_name": "Khyber Shinwari & Karahi Dera",
        "restaurant_slug": "shinwari",
        "phone": "923019887766",
        "password_encrypted": {
            "algorithm": "aes-256-gcm",
            "ciphertext": "6ee554ba2b5a22ee88c76f9fda283ef1",
            "iv": "58748f75ec8de01bdf33bd05",
            "authTag": "0e9017adb151e1e9a618751a475a6117"
        },
        "must_change_password": false,
        "session_version": 1,
        "created_at": "2026-10-07T12:00:00.000Z"
    },
    {
        "id": "user-owner-04",
        "email": "manager@greenoasis.com",
        "name": "Green Oasis Manager",
        "role": "owner",
        "restaurant_id": "rest-104",
        "restaurant_name": "Green Oasis Cafe & Bakery",
        "restaurant_slug": "greenoasis",
        "phone": "923023344556",
        "password_encrypted": {
            "algorithm": "aes-256-gcm",
            "ciphertext": "11b8f746104e82bc02b76cc17c",
            "iv": "130cd04669ca324f81d7ba92",
            "authTag": "b5b54d12660b2d68545fed360b7bade6"
        },
        "must_change_password": false,
        "session_version": 1,
        "created_at": "2026-10-08T12:00:00.000Z"
    },
    {
        "id": "user-owner-05",
        "email": "manager@tokyosushi.com",
        "name": "Tokyo Sushi Manager",
        "role": "owner",
        "restaurant_id": "rest-105",
        "restaurant_name": "Tokyo Sushi & Ramen Bar",
        "restaurant_slug": "tokyosushi",
        "phone": "923035566778",
        "password_encrypted": {
            "algorithm": "aes-256-gcm",
            "ciphertext": "602c503ee0236845731fd412c3",
            "iv": "f84e01c26106a447fa79cadf",
            "authTag": "71ee6d5f4cd7ac58fe1ec6659292f34f"
        },
        "must_change_password": false,
        "session_version": 1,
        "created_at": "2026-10-09T12:00:00.000Z"
    },
    {
        "id": "user-owner-06",
        "email": "manager@royaltaj.com",
        "name": "Royal Taj Manager",
        "role": "owner",
        "restaurant_id": "rest-106",
        "restaurant_name": "Royal Taj Desi Continental",
        "restaurant_slug": "royaltaj",
        "phone": "923046677889",
        "password_encrypted": {
            "algorithm": "aes-256-gcm",
            "ciphertext": "d834059bbbbe10dd037de4",
            "iv": "d6655208f8dba18886aa3f1f",
            "authTag": "35c5d40e69061cab676dd07414874a1d"
        },
        "must_change_password": false,
        "session_version": 1,
        "created_at": "2026-10-10T12:00:00.000Z"
    },
    {
        "id": "user-owner-07",
        "email": "manager@fiestamex.com",
        "name": "Fiesta Mexicana Manager",
        "role": "owner",
        "restaurant_id": "rest-107",
        "restaurant_name": "Fiesta Mexicana Grill & Tacos",
        "restaurant_slug": "fiestamex",
        "phone": "923057788990",
        "password_encrypted": {
            "algorithm": "aes-256-gcm",
            "ciphertext": "5998a4e2e4c4af7c7d88f19beb62",
            "iv": "d3b17c5f73c9031bc12587ec",
            "authTag": "fb44182d5d1bb37d0f08306c0edee9a3"
        },
        "must_change_password": false,
        "session_version": 1,
        "created_at": "2026-10-11T12:00:00.000Z"
    },
    {
        "id": "user-owner-08",
        "email": "manager@sweetretreat.com",
        "name": "Sweet Retreat Manager",
        "role": "owner",
        "restaurant_id": "rest-108",
        "restaurant_name": "Sweet Retreat Desserts & Gelato",
        "restaurant_slug": "sweetretreat",
        "phone": "923068899001",
        "password_encrypted": {
            "algorithm": "aes-256-gcm",
            "ciphertext": "115591869ea42d66619f89e35b2463",
            "iv": "6773c46a479449eb15560f6b",
            "authTag": "19de7a579681ba98b6930e101fd13d35"
        },
        "must_change_password": false,
        "session_version": 1,
        "created_at": "2026-10-12T12:00:00.000Z"
    },
    {
        "id": "user-owner-09",
        "email": "manager@chaijunction.com",
        "name": "Chai Junction Manager",
        "role": "owner",
        "restaurant_id": "rest-109",
        "restaurant_name": "Chai Junction & Traditional Dhaba",
        "restaurant_slug": "chaijunction",
        "phone": "923079900112",
        "password_encrypted": {
            "algorithm": "aes-256-gcm",
            "ciphertext": "88a11e955df33575bcd9a9a5",
            "iv": "83b51d3b5f6bfa4d54262be0",
            "authTag": "38ec74ff6f5d66fffc6ee2edd7bfa31e"
        },
        "must_change_password": false,
        "session_version": 1,
        "created_at": "2026-10-13T12:00:00.000Z"
    },
    {
        "id": "user-owner-10",
        "email": "manager@stoneove.com",
        "name": "Stone Oven Manager",
        "role": "owner",
        "restaurant_id": "rest-110",
        "restaurant_name": "Stone Oven Pizzeria",
        "restaurant_slug": "stoneove",
        "phone": "923001111111",
        "password_encrypted": {
            "algorithm": "aes-256-gcm",
            "ciphertext": "dd2ff84279721cdacd8f24653c",
            "iv": "ffad02d9ac298b4498a6f001",
            "authTag": "9b7f7691e866faf6994dcfa3d82f4dc8"
        },
        "must_change_password": false,
        "session_version": 1,
        "created_at": "2026-10-14T12:00:00.000Z"
    },
    {
        "id": "user-manager-01",
        "email": "manager@burgersmoke.com",
        "name": "Burger & Smoke Manager",
        "role": "manager",
        "restaurant_id": "rest-101",
        "restaurant_name": "Burger & Smoke Co.",
        "restaurant_slug": "burgersmoke",
        "phone": "923002223344",
        "password_encrypted": {
            "algorithm": "aes-256-gcm",
            "ciphertext": "0537d1b516dbc07cee7a7846b9b8f0",
            "iv": "9b12de07f3af4f2e260600b8",
            "authTag": "239cdef86becfed4b16f6034856c5579"
        },
        "must_change_password": false,
        "session_version": 1,
        "created_by_role": "owner",
        "created_at": "2026-10-05T12:15:00.000Z"
    },
    {
        "id": "user-cashier-01",
        "email": "cashier@burgersmoke.com",
        "name": "Counter Cashier",
        "role": "cashier",
        "restaurant_id": "rest-101",
        "restaurant_name": "Burger & Smoke Co.",
        "restaurant_slug": "burgersmoke",
        "phone": "923003334455",
        "password_encrypted": {
            "algorithm": "aes-256-gcm",
            "ciphertext": "39fc2aac0465fc0498ccc5173fda44",
            "iv": "381cfcac758e12d24b015aea",
            "authTag": "ce13e8390a1284938f3dde3b9eb59d64"
        },
        "must_change_password": false,
        "session_version": 2,
        "created_by_role": "manager",
        "created_at": "2026-10-05T12:30:00.000Z",
        "updated_at": "2026-10-29T10:47:24.591Z"
    },
    {
        "id": "user-waiter-01",
        "email": "waiter@burgersmoke.com",
        "name": "Hamza Ali",
        "role": "waiter",
        "restaurant_id": "rest-101",
        "restaurant_name": "Burger & Smoke Co.",
        "restaurant_slug": "burgersmoke",
        "phone": "0300-9876541",
        "password_encrypted": {
            "algorithm": "aes-256-gcm",
            "ciphertext": "b0cd77c6e9a10a1fbdc9281efc13",
            "iv": "7fb32fb6b9bb43c44e613984",
            "authTag": "8a1b81c7b9b89df0122fad953c6b1188"
        },
        "must_change_password": false,
        "session_version": 1,
        "created_by_role": "manager",
        "created_at": "2026-10-05T12:45:00.000Z"
    },
    {
        "id": "user-owner-12",
        "email": "manager@lyallpurgrill.com",
        "name": "Lyallpur Grill Owner",
        "role": "owner",
        "restaurant_id": "rest-112",
        "restaurant_name": "Lyallpur Grill & BBQ House",
        "restaurant_slug": "lyallpurgrill",
        "phone": "923004112233",
        "password_encrypted": {
            "algorithm": "aes-256-gcm",
            "ciphertext": "c0bcefcfda0ec3b4d07749617e",
            "iv": "a7f882b8559354642b337a3e",
            "authTag": "ae42f96ef1e60e0460f4a1393afb073e"
        },
        "must_change_password": false,
        "session_version": 1,
        "created_at": "2026-10-15T12:00:00.000Z"
    },
    {
        "id": "user-owner-13",
        "email": "manager@chenabsmash.com",
        "name": "Chenab Smash Owner",
        "role": "owner",
        "restaurant_id": "rest-113",
        "restaurant_name": "Chenab Smash & Pizza Lounge",
        "restaurant_slug": "chenabsmash",
        "phone": "923004114455",
        "password_encrypted": {
            "algorithm": "aes-256-gcm",
            "ciphertext": "7ba81b34bea6427839cf9538b1",
            "iv": "1862852587b77527964ef330",
            "authTag": "6044d503553207f4d86c2d4c5631f59b"
        },
        "must_change_password": false,
        "session_version": 1,
        "created_at": "2026-10-16T12:00:00.000Z"
    },
    {
        "id": "waiter-burgersmoke-1",
        "staff_code": "WTR-101",
        "email": "hamza.waiter@burgersmoke.com",
        "name": "Hamza Ali",
        "role": "waiter",
        "restaurant_id": "rest-101",
        "restaurant_name": "Burger & Smoke Co.",
        "restaurant_slug": "burgersmoke",
        "phone": "0300-9876541",
        "password_encrypted": {
            "algorithm": "aes-256-gcm",
            "ciphertext": "4ab0ba44e9311cc688f90700f8d3",
            "iv": "6cdbd0a89c049055b9c7efbe",
            "authTag": "a04d1f4b85188afbb862b1e2c405471f"
        },
        "must_change_password": false,
        "session_version": 1,
        "created_by_role": "manager",
        "created_at": "2026-10-05T12:45:00.000Z"
    },
    {
        "id": "waiter-burgersmoke-2",
        "staff_code": "WTR-102",
        "email": "usman.waiter@burgersmoke.com",
        "name": "Usman Raza",
        "role": "waiter",
        "restaurant_id": "rest-101",
        "restaurant_name": "Burger & Smoke Co.",
        "restaurant_slug": "burgersmoke",
        "phone": "0321-4567892",
        "password_encrypted": {
            "algorithm": "aes-256-gcm",
            "ciphertext": "5af37fae12150c6f882ac1d47507",
            "iv": "6f70d1e4f970099001257003",
            "authTag": "0e9fd83d283bc4928fc120fccfb89874"
        },
        "must_change_password": false,
        "session_version": 1,
        "created_by_role": "manager",
        "created_at": "2026-10-05T12:46:00.000Z"
    },
    {
        "id": "waiter-burgersmoke-3",
        "staff_code": "WTR-103",
        "email": "bilal.waiter@burgersmoke.com",
        "name": "Bilal Tariq",
        "role": "waiter",
        "restaurant_id": "rest-101",
        "restaurant_name": "Burger & Smoke Co.",
        "restaurant_slug": "burgersmoke",
        "phone": "0333-1122334",
        "password_encrypted": {
            "algorithm": "aes-256-gcm",
            "ciphertext": "e6088c5bf66e80b3761e422d0d78",
            "iv": "a08897b9dd21b3d0da3fc663",
            "authTag": "49a9d93c5cccab479e7a6a4d7835872f"
        },
        "must_change_password": false,
        "session_version": 1,
        "created_by_role": "manager",
        "created_at": "2026-10-05T12:47:00.000Z"
    }
];
}

let _usersCache = null;
let _usersByEmail = new Map();
let _usersById = new Map();
let _usersMtimeMs = 0;
let _usersLastStatCheckMs = 0;

function rebuildUserMaps(users) {
  _usersCache = users;
  _usersByEmail = new Map();
  _usersById = new Map();
  for (const u of users) {
    if (u.email) _usersByEmail.set(String(u.email).trim().toLowerCase(), u);
    if (u.id) _usersById.set(u.id, u);
  }
  _usersLastStatCheckMs = Date.now();
}

export const serverStorage = {
  /**
   * Load all users with encrypted passwords
   */
  getUsers() {
    const now = Date.now();
    if (_usersCache && now - _usersLastStatCheckMs < 2000) {
      return _usersCache;
    }
    ensureDataDir();
    if (!fs.existsSync(USERS_FILE)) {
      const initial = getInitialProvisionedUsers();
      fs.writeFileSync(USERS_FILE, JSON.stringify(initial, null, 2), 'utf8');
      rebuildUserMaps(initial);
      try { _usersMtimeMs = fs.statSync(USERS_FILE).mtimeMs; } catch {}
      return initial;
    }
    try {
      const stat = fs.statSync(USERS_FILE);
      _usersLastStatCheckMs = now;
      if (_usersCache && stat.mtimeMs === _usersMtimeMs) {
        return _usersCache;
      }
      _usersMtimeMs = stat.mtimeMs;
    } catch {}

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
        rebuildUserMaps(users);
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
    rebuildUserMaps(users);
    try { _usersMtimeMs = fs.statSync(USERS_FILE).mtimeMs; } catch {}
  },

  /**
   * Find user by email
   */
  findUserByEmail(email) {
    if (!email) return null;
    const clean = String(email).trim().toLowerCase();
    this.getUsers();
    return _usersByEmail.get(clean) || null;
  },

  /**
   * Find user by ID
   */
  findUserById(userId) {
    if (!userId) return null;
    this.getUsers();
    return _usersById.get(userId) || null;
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

    const existing = users.find((u) => String(u.email || '').trim().toLowerCase() === cleanEmail);
    if (existing) {
      const roleLabel = (existing.role || 'account').toUpperCase();
      throw new Error(`This email "${cleanEmail}" is already registered (${roleLabel}). Please add a new email.`);
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
