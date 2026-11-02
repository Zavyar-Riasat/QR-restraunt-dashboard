/**
 * Coolify PostgreSQL HTTP API Handler (/api/db/*)
 * Exposes:
 * - GET  /api/db/health -> Connection & schema readiness status
 * - POST /api/db/query  -> Parameterized table operations for restaurants, menus, orders, and customers
 */

import {
  executeTableOperation,
  isPostgresUrlConfigured,
  ensurePostgresSchema,
  queryPostgres,
} from './db.js';

// Client-accessible tables via /api/db/query (users and security_audit_logs are restricted to server/authHandler.js)
const CLIENT_ALLOWED_TABLES = new Set([
  'restaurants',
  'categories',
  'menu_items',
  'delivery_areas',
  'orders',
  'customers',
  'customer_addresses',
  'favorites',
]);

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') {
      return resolve(req.body);
    }
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 2e6) {
        req.destroy();
        reject(new Error('Payload too large.'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON payload.'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.statusCode = statusCode;
  res.end(JSON.stringify(data));
}

export async function handleDbApi(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url, 'http://127.0.0.1:5173');
  const pathname = url.pathname.replace(/\/+$/, '');

  try {
    // 1. GET /api/db/health
    if (pathname === '/api/db/health' && req.method === 'GET') {
      const configured = isPostgresUrlConfigured();
      if (!configured) {
        return sendJson(res, 200, {
          ok: true,
          provider: 'coolify-postgres',
          configured: false,
          connected: false,
          mode: 'local-cache-fallback',
          message: 'Set DATABASE_URL in .env or Coolify Environment Variables to connect live PostgreSQL.',
        });
      }

      try {
        await ensurePostgresSchema();
        const ping = await queryPostgres('SELECT NOW() AS server_time');
        return sendJson(res, 200, {
          ok: true,
          provider: 'coolify-postgres',
          configured: true,
          connected: true,
          mode: 'postgres-live',
          serverTime: ping.rows?.[0]?.server_time || new Date().toISOString(),
        });
      } catch (err) {
        return sendJson(res, 200, {
          ok: false,
          provider: 'coolify-postgres',
          configured: true,
          connected: false,
          mode: 'local-cache-fallback',
          error: err.message,
        });
      }
    }

    // 2. POST /api/db/query
    if (pathname === '/api/db/query' && req.method === 'POST') {
      const querySpec = await parseJsonBody(req);
      const { table } = querySpec || {};

      if (!table || !CLIENT_ALLOWED_TABLES.has(table)) {
        return sendJson(res, 403, {
          data: null,
          error: { message: `Access to table "${table || 'unknown'}" is restricted.` },
        });
      }

      const result = await executeTableOperation(querySpec);
      return sendJson(res, 200, result);
    }

    return sendJson(res, 404, { error: `Unknown DB endpoint: ${req.method} ${pathname}` });
  } catch (err) {
    return sendJson(res, 500, {
      data: null,
      error: { message: err.message || 'Database handler error' },
    });
  }
}

