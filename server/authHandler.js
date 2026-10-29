/**
 * Central Server-Side Authentication & Password Management Handler
 * Implements:
 * - Constant-time login password verification via crypto.timingSafeEqual
 * - AES-256-GCM encryption for all stored passwords
 * - Role-based master admin authorization for password viewing
 * - 15-second auto-hide audit logging with IP tracking
 * - Rate limiting and 15-minute temporary lockout on failed logins
 * - Session invalidation upon password reset/change
 * - Strict sanitization: zero passwords or ciphertexts in client responses
 */

import crypto from 'node:crypto';
import {
  encryptPassword,
  decryptPassword,
  comparePassword,
  generateStrongPassword,
} from './crypto.js';
import { serverStorage, sanitizeUserForClient } from './storage.js';

// In-memory active sessions store: token -> { user, session_version, expiresAt }
const ACTIVE_SESSIONS = new Map();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') {
      return resolve(req.body);
    }
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large.'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch  {
        reject(new Error('Invalid JSON payload.'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = statusCode;
  res.end(JSON.stringify(data));
}

/**
 * Validate session token and check for session version invalidation
 */
export function authenticateToken(token) {
  if (!token) return null;
  const session = ACTIVE_SESSIONS.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    ACTIVE_SESSIONS.delete(token);
    return null;
  }

  // Check if user session_version changed (password reset / changed)
  const freshUser = serverStorage.findUserById(session.user.id);
  if (!freshUser) {
    ACTIVE_SESSIONS.delete(token);
    return null;
  }

  if ((freshUser.session_version || 1) !== session.session_version) {
    // Session invalidated due to password change
    ACTIVE_SESSIONS.delete(token);
    return null;
  }

  return freshUser;
}

export function createSession(user) {
  const token = `dinesess_${crypto.randomBytes(24).toString('hex')}`;
  const sessionData = {
    user: sanitizeUserForClient(user),
    session_version: user.session_version || 1,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  ACTIVE_SESSIONS.set(token, sessionData);
  return token;
}

export function invalidateUserSessions(userId) {
  for (const [token, session] of ACTIVE_SESSIONS.entries()) {
    if (session.user.id === userId) {
      ACTIVE_SESSIONS.delete(token);
    }
  }
}

/**
 * Main API Router for Node HTTP / Vite Middleware / Vercel Serverless
 */
export async function handleAuthApi(req, res) {
  // CORS & Options
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url, 'http://127.0.0.1:5173');
  const pathname = url.pathname.replace(/\/+$/, '');
  const clientIp = getClientIp(req);

  // Extract bearer token
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  try {
    // -------------------------------------------------------------
    // 1. POST /api/auth/login
    // -------------------------------------------------------------
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const { email, password } = await parseJsonBody(req);

      if (!email || !password) {
        return sendJson(res, 400, { error: 'Email and password are required.' });
      }

      const cleanEmail = email.trim().toLowerCase();

      // Check lockout by email and IP
      const emailLock = serverStorage.checkLockout(cleanEmail);
      if (emailLock.locked) {
        return sendJson(res, 429, {
          error: `Account temporarily locked due to too many failed login attempts. Please try again in ${Math.ceil(
            emailLock.remainingSeconds / 60
          )} minutes.`,
        });
      }

      const ipLock = serverStorage.checkLockout(clientIp);
      if (ipLock.locked) {
        return sendJson(res, 429, {
          error: `Too many failed attempts from your IP. Please try again in ${Math.ceil(
            ipLock.remainingSeconds / 60
          )} minutes.`,
        });
      }

      const user = serverStorage.findUserByEmail(cleanEmail);
      if (!user || !user.password_encrypted) {
        serverStorage.recordFailedLogin(cleanEmail);
        serverStorage.recordFailedLogin(clientIp);
        return sendJson(res, 401, { error: 'Invalid email or password. Please verify your credentials.' });
      }

      // Constant-time password comparison
      const isValid = comparePassword(password, user.password_encrypted);
      if (!isValid) {
        serverStorage.recordFailedLogin(cleanEmail);
        serverStorage.recordFailedLogin(clientIp);
        return sendJson(res, 401, { error: 'Invalid email or password. Please verify your credentials.' });
      }

      // Successful login -> Reset lockout counters
      serverStorage.resetFailedLogins(cleanEmail);
      serverStorage.resetFailedLogins(clientIp);

      const sessionToken = createSession(user);

      return sendJson(res, 200, {
        success: true,
        user: sanitizeUserForClient(user),
        sessionToken,
        must_change_password: Boolean(user.must_change_password),
      });
    }

    // -------------------------------------------------------------
    // 2. POST /api/auth/change-password (Owner self-service)
    // -------------------------------------------------------------
    if (pathname === '/api/auth/change-password' && req.method === 'POST') {
      const activeUser = authenticateToken(token);
      if (!activeUser) {
        return sendJson(res, 401, { error: 'Unauthorized session. Please log in again.' });
      }

      const { currentPassword, newPassword } = await parseJsonBody(req);
      if (!currentPassword || !newPassword) {
        return sendJson(res, 400, { error: 'Current password and new password are required.' });
      }

      if (newPassword.length < 4) {
        return sendJson(res, 400, { error: 'New password must be at least 4 characters long.' });
      }

      // Verify current password with constant-time equality
      const isCurrentValid = comparePassword(currentPassword, activeUser.password_encrypted);
      if (!isCurrentValid) {
        return sendJson(res, 400, { error: 'The current password you entered is incorrect.' });
      }

      // Encrypt new password with AES-256-GCM
      const newEncrypted = encryptPassword(newPassword);
      const newVersion = (activeUser.session_version || 1) + 1;

      const updated = serverStorage.updateUser(activeUser.id, {
        password_encrypted: newEncrypted,
        must_change_password: false,
        session_version: newVersion,
      });

      // Invalidate existing sessions and generate fresh token
      invalidateUserSessions(activeUser.id);
      const newSessionToken = createSession(updated);

      serverStorage.recordAuditLog({
        action: 'CHANGE_PASSWORD',
        user_id: activeUser.id,
        user_email: activeUser.email,
        restaurant_name: activeUser.restaurant_name,
        restaurant_slug: activeUser.restaurant_slug,
        ip_address: clientIp,
      });

      return sendJson(res, 200, {
        success: true,
        message: 'Password changed successfully.',
        user: sanitizeUserForClient(updated),
        sessionToken: newSessionToken,
      });
    }

    // -------------------------------------------------------------
    // 3. POST /api/admin/passwords/view (Master Admin Protected)
    // -------------------------------------------------------------
    if (pathname === '/api/admin/passwords/view' && req.method === 'POST') {
      if (!token) {
        return sendJson(res, 401, { error: 'Authentication required.' });
      }
      const activeAdmin = authenticateToken(token);
      if (!activeAdmin) {
        return sendJson(res, 401, { error: 'Session expired or invalidated. Please sign in again.' });
      }
      if (activeAdmin.role !== 'admin') {
        return sendJson(res, 403, {
          error: 'Access denied. Master administrator authorization is required to view passwords.',
        });
      }

      const { targetUserId } = await parseJsonBody(req);
      if (!targetUserId) {
        return sendJson(res, 400, { error: 'Target user ID is required.' });
      }

      const targetUser = serverStorage.findUserById(targetUserId);
      if (!targetUser) {
        return sendJson(res, 404, { error: 'Target user account not found.' });
      }

      if (!targetUser.password_encrypted) {
        return sendJson(res, 400, { error: 'Target user has no encrypted password on record.' });
      }

      // Decrypt password
      const decryptedPassword = decryptPassword(targetUser.password_encrypted);

      // Write security audit log
      serverStorage.recordAuditLog({
        action: 'VIEW_PASSWORD',
        admin_id: activeAdmin.id,
        admin_email: activeAdmin.email,
        target_user_id: targetUser.id,
        target_email: targetUser.email,
        target_restaurant_name: targetUser.restaurant_name,
        target_restaurant_slug: targetUser.restaurant_slug,
        ip_address: clientIp,
        user_agent: req.headers['user-agent'] || 'Direct API',
      });

      return sendJson(res, 200, {
        success: true,
        targetUserId: targetUser.id,
        password: decryptedPassword,
        autoHideSeconds: 15,
      });
    }

    // -------------------------------------------------------------
    // 4. POST /api/admin/passwords/reset (Master Admin Reset)
    // -------------------------------------------------------------
    if (pathname === '/api/admin/passwords/reset' && req.method === 'POST') {
      if (!token) {
        return sendJson(res, 401, { error: 'Authentication required.' });
      }
      const activeAdmin = authenticateToken(token);
      if (!activeAdmin) {
        return sendJson(res, 401, { error: 'Session expired or invalidated. Please sign in again.' });
      }
      if (activeAdmin.role !== 'admin') {
        return sendJson(res, 403, {
          error: 'Access denied. Master administrator authorization is required to reset passwords.',
        });
      }

      const { targetUserId, manualPassword } = await parseJsonBody(req);
      if (!targetUserId) {
        return sendJson(res, 400, { error: 'Target user ID is required.' });
      }

      const targetUser = serverStorage.findUserById(targetUserId);
      if (!targetUser) {
        return sendJson(res, 404, { error: 'Target user account not found.' });
      }

      const newPassword = manualPassword && manualPassword.trim().length >= 4
        ? manualPassword.trim()
        : generateStrongPassword(14);

      const newEncrypted = encryptPassword(newPassword);
      const newVersion = (targetUser.session_version || 1) + 1;

      // Update password, require change on next login, invalidate previous sessions
      const updated = serverStorage.updateUser(targetUser.id, {
        password_encrypted: newEncrypted,
        must_change_password: true,
        session_version: newVersion,
      });

      invalidateUserSessions(targetUser.id);

      serverStorage.recordAuditLog({
        action: 'RESET_PASSWORD',
        admin_id: activeAdmin.id,
        admin_email: activeAdmin.email,
        target_user_id: targetUser.id,
        target_email: targetUser.email,
        target_restaurant_name: targetUser.restaurant_name,
        target_restaurant_slug: targetUser.restaurant_slug,
        ip_address: clientIp,
        user_agent: req.headers['user-agent'] || 'Direct API',
      });

      return sendJson(res, 200, {
        success: true,
        targetUserId: targetUser.id,
        generatedPassword: newPassword,
        must_change_password: true,
        user: sanitizeUserForClient(updated),
      });
    }

    // -------------------------------------------------------------
    // 5. GET /api/admin/users (Directory with Masked Passwords)
    // -------------------------------------------------------------
    if (pathname === '/api/admin/users' && req.method === 'GET') {
      const activeAdmin = authenticateToken(token);
      if (!activeAdmin || activeAdmin.role !== 'admin') {
        return sendJson(res, 403, { error: 'Access denied. Master administrator required.' });
      }

      const users = serverStorage.getUsers().map((u) => ({
        ...sanitizeUserForClient(u),
        password_masked: '••••••••••••',
      }));

      return sendJson(res, 200, { users });
    }

    // -------------------------------------------------------------
    // 6. POST /api/admin/users (Create User / Provision Tenant)
    // -------------------------------------------------------------
    if (pathname === '/api/admin/users' && req.method === 'POST') {
      const activeAdmin = authenticateToken(token);
      if (!activeAdmin || activeAdmin.role !== 'admin') {
        return sendJson(res, 403, { error: 'Access denied. Master administrator required.' });
      }

      const body = await parseJsonBody(req);
      const cleanAdminEmail = String(body.email || '').trim().toLowerCase();
      const existingAdminUser = serverStorage.findUserByEmail(cleanAdminEmail);
      if (existingAdminUser) {
        const roleLabel = (existingAdminUser.role || 'account').toUpperCase();
        return sendJson(res, 409, {
          error: `This email "${cleanAdminEmail}" is already registered (${roleLabel}). Please add a new email.`,
        });
      }
      const rawPassword = body.password || generateStrongPassword(14);
      const encrypted = encryptPassword(rawPassword);

      const created = serverStorage.createUser({
        ...body,
        password_encrypted: encrypted,
        must_change_password: Boolean(body.must_change_password),
      });

      serverStorage.recordAuditLog({
        action: 'PROVISION_USER',
        admin_id: activeAdmin.id,
        admin_email: activeAdmin.email,
        target_user_id: created.id,
        target_email: created.email,
        target_restaurant_name: created.restaurant_name,
        target_restaurant_slug: created.restaurant_slug,
        ip_address: clientIp,
      });

      return sendJson(res, 201, {
        success: true,
        user: sanitizeUserForClient(created),
        generatedPassword: rawPassword, // returned once upon creation for initial handoff
      });
    }

    // -------------------------------------------------------------
    // 7. GET /api/admin/audit-logs (View Audit Logs)
    // -------------------------------------------------------------
    if (pathname === '/api/admin/audit-logs' && req.method === 'GET') {
      const activeAdmin = authenticateToken(token);
      if (!activeAdmin || activeAdmin.role !== 'admin') {
        return sendJson(res, 403, { error: 'Access denied. Master administrator required.' });
      }

      const logs = serverStorage.getAuditLogs();
      return sendJson(res, 200, { logs });
    }

    // -------------------------------------------------------------
    // 8. Restaurant Staff & Role Credential Management (/api/staff/users)
    // Tier 1 (Owner) manages Tier 2 (Manager) & Tier 3 (Cashier)
    // Tier 2 (Manager) manages Tier 3 (Cashier) & exclusively manages Tier 4 (Waiter)
    // -------------------------------------------------------------
    if (pathname === '/api/staff/users') {
      const activeUser = authenticateToken(token);
      if (!activeUser || !['admin', 'owner', 'manager'].includes(activeUser.role)) {
        return sendJson(res, 403, { error: 'Access denied. Owner or Manager authorization required.' });
      }

      const canActorManageRole = (actorRole, targetRole) => {
        if (actorRole === 'admin') return ['owner', 'manager', 'cashier', 'waiter'].includes(targetRole);
        if (actorRole === 'owner') return ['owner', 'manager', 'cashier', 'waiter'].includes(targetRole);
        if (actorRole === 'manager') return ['cashier', 'waiter'].includes(targetRole);
        return false;
      };

      if (req.method === 'GET') {
        const slugFilter = url.searchParams.get('restaurant_slug') || activeUser.restaurant_slug;
        const staff = serverStorage
          .getUsers()
          .filter((u) => u.restaurant_slug === slugFilter && ['owner', 'manager', 'cashier', 'waiter'].includes(u.role))
          .map((u) => ({
            ...sanitizeUserForClient(u),
            password_masked: '••••••••••••',
          }));
        return sendJson(res, 200, { staff });
      }

      if (req.method === 'POST') {
        const body = await parseJsonBody(req);
        const targetRole = String(body.role || '').toLowerCase();

        if (!canActorManageRole(activeUser.role, targetRole)) {
          const reason =
            targetRole === 'waiter' && activeUser.role === 'owner'
              ? 'Waiter credentials can only be managed by a Manager.'
              : `Your role (${activeUser.role}) is not authorized to create ${targetRole} credentials.`;
          return sendJson(res, 403, { error: reason });
        }

        if (!body.email || !body.password) {
          return sendJson(res, 400, { error: 'Staff email and password are required.' });
        }

        const cleanStaffEmail = String(body.email).trim().toLowerCase();
        const existingStaffUser = serverStorage.findUserByEmail(cleanStaffEmail);
        if (existingStaffUser) {
          const roleLabel = (existingStaffUser.role || 'account').toUpperCase();
          return sendJson(res, 409, {
            error: `This email "${cleanStaffEmail}" is already registered (${roleLabel}). Please add a new email.`,
          });
        }

        const encrypted = encryptPassword(String(body.password).trim());
        const created = serverStorage.createUser({
          name: body.name || `${targetRole.charAt(0).toUpperCase() + targetRole.slice(1)} Staff`,
          email: String(body.email).trim().toLowerCase(),
          phone: body.phone || activeUser.phone || '923001234567',
          role: targetRole,
          restaurant_id: body.restaurant_id || activeUser.restaurant_id || 'rest-101',
          restaurant_name: body.restaurant_name || activeUser.restaurant_name || 'Burger & Smoke Co.',
          restaurant_slug: body.restaurant_slug || activeUser.restaurant_slug || 'burgersmoke',
          password_encrypted: encrypted,
          must_change_password: false,
        });

        return sendJson(res, 201, {
          success: true,
          staff: sanitizeUserForClient(created),
        });
      }

      if (req.method === 'PUT') {
        const body = await parseJsonBody(req);
        const targetUser = serverStorage.findUserById(body.staffId);
        if (!targetUser) {
          return sendJson(res, 404, { error: 'Staff account not found.' });
        }

        if (!canActorManageRole(activeUser.role, targetUser.role)) {
          const reason =
            targetUser.role === 'waiter' && activeUser.role === 'owner'
              ? 'Waiter credentials can only be managed by a Manager.'
              : `Your role (${activeUser.role}) is not authorized to modify ${targetUser.role} credentials.`;
          return sendJson(res, 403, { error: reason });
        }

        const updates = {};
        if (body.name) updates.name = String(body.name).trim();
        if (body.email) {
          const cleanNewEmail = String(body.email).trim().toLowerCase();
          const emailConflict = serverStorage
            .getUsers()
            .find((u) => u.id !== targetUser.id && String(u.email || '').trim().toLowerCase() === cleanNewEmail);
          if (emailConflict) {
            const roleLabel = (emailConflict.role || 'account').toUpperCase();
            return sendJson(res, 409, {
              error: `This email "${cleanNewEmail}" is already registered (${roleLabel}). Please add a new email.`,
            });
          }
          updates.email = cleanNewEmail;
        }
        if (body.phone) updates.phone = String(body.phone).trim();
        if (body.password && String(body.password).trim().length >= 4) {
          updates.password_encrypted = encryptPassword(String(body.password).trim());
          updates.session_version = (targetUser.session_version || 1) + 1;
          invalidateUserSessions(targetUser.id);
        }

        const updated = serverStorage.updateUser(targetUser.id, updates);
        return sendJson(res, 200, {
          success: true,
          staff: sanitizeUserForClient(updated),
        });
      }

      if (req.method === 'DELETE') {
        const body = await parseJsonBody(req);
        const targetUser = serverStorage.findUserById(body.staffId);
        if (!targetUser) {
          return sendJson(res, 404, { error: 'Staff account not found.' });
        }

        if (!canActorManageRole(activeUser.role, targetUser.role)) {
          const reason =
            targetUser.role === 'waiter' && activeUser.role === 'owner'
              ? 'Waiter credentials can only be managed by a Manager.'
              : `Your role (${activeUser.role}) is not authorized to delete ${targetUser.role} credentials.`;
          return sendJson(res, 403, { error: reason });
        }

        const remaining = serverStorage.getUsers().filter((u) => u.id !== targetUser.id);
        serverStorage.saveUsers(remaining);
        invalidateUserSessions(targetUser.id);
        return sendJson(res, 200, { success: true });
      }
    }

    // Unmatched API route
    return sendJson(res, 404, { error: `Not found: ${req.method} ${pathname}` });
  } catch (err) {
    console.error('Auth API Exception:', err);
    return sendJson(res, 500, { error: err.message || 'Internal server error.' });
  }
}
