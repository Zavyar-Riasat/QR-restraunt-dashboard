/**
 * Production Full-Stack Node.js Server for Coolify Deployment
 * Serves:
 * - /api/auth/*, /api/admin/*, /api/staff/* (Encrypted Auth & Role Management)
 * - /api/db/* (Coolify PostgreSQL Database Engine & Health Check)
 * - /api/nearby/dishes (Geo-filtered Marketplace Dishes API)
 * - /api/geocode (OpenStreetMap Nominatim Geocoding Proxy)
 * - Static SPA Frontend from dist/ with HTTP Security Headers
 */

import http from 'node:http';
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleAuthApi } from './authHandler.js';
import { handleDbApi } from './dbHandler.js';
import { handleNearbyDishesApi } from './nearbyDishesHandler.js';
import { ensurePostgresSchema, isPostgresUrlConfigured } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '..', 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function applySecurityHeaders(res) {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader(
    'Permissions-Policy',
    'camera=(self), microphone=(), geolocation=(self), payment=()'
  );
}

async function handleGeocodeProxy(req, res) {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:3000');
    const type = url.searchParams.get('type');
    let targetUrl = '';
    if (type === 'reverse') {
      const lat = url.searchParams.get('lat');
      const lon = url.searchParams.get('lon');
      targetUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    } else if (type === 'search') {
      const q = url.searchParams.get('q') || '';
      const countrycodes = url.searchParams.get('countrycodes') || 'pk';
      targetUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=${countrycodes}&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`;
    } else {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Invalid geocode type' }));
      return;
    }

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Dineflow-Restaurant-Platform/1.0 (contact@dineflow.pk)',
        'Accept-Language': 'en,ur;q=0.9',
      },
    });
    const data = await response.text();
    res.statusCode = response.status;
    res.setHeader('Content-Type', 'application/json');
    res.end(data);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message }));
  }
}

export async function routeRequest(req, res) {
  applySecurityHeaders(res);

  const reqUrl = req.url || '/';

  if (
    reqUrl.startsWith('/api/auth') ||
    reqUrl.startsWith('/api/admin') ||
    reqUrl.startsWith('/api/staff')
  ) {
    return handleAuthApi(req, res);
  }

  if (reqUrl.startsWith('/api/db')) {
    return handleDbApi(req, res);
  }

  if (reqUrl.startsWith('/api/nearby/dishes')) {
    return handleNearbyDishesApi(req, res);
  }

  if (reqUrl.startsWith('/api/geocode')) {
    return handleGeocodeProxy(req, res);
  }

  // Serve static files from dist/
  const cleanPath = decodeURIComponent(reqUrl.split('?')[0]);
  const safeRelPath = path.normalize(cleanPath).replace(/^(\.\.(\/|\\|$))+/, '');
  let filePath = path.join(DIST_DIR, safeRelPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
    if (safeRelPath.startsWith('/assets/') || safeRelPath.startsWith('\\assets\\')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (safeRelPath.endsWith('sw.js') || safeRelPath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    const acceptEncoding = String(req.headers['accept-encoding'] || '');
    const compressible = ['.html', '.js', '.mjs', '.css', '.json', '.svg'].includes(ext);
    if (compressible && acceptEncoding.includes('br')) {
      res.setHeader('Content-Encoding', 'br');
      res.setHeader('Vary', 'Accept-Encoding');
      fs.createReadStream(filePath).pipe(zlib.createBrotliCompress()).pipe(res);
      return;
    }
    if (compressible && acceptEncoding.includes('gzip')) {
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Vary', 'Accept-Encoding');
      fs.createReadStream(filePath).pipe(zlib.createGzip()).pipe(res);
      return;
    }
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // SPA fallback to dist/index.html
  const indexHtmlPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    fs.createReadStream(indexHtmlPath).pipe(res);
    return;
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Build artifacts not found. Run npm run build first.' }));
}

// Start server if invoked directly (e.g. `node server/index.js` on Coolify)
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const PORT = Number(process.env.PORT || 3000);
  if (isPostgresUrlConfigured()) {
    ensurePostgresSchema().then((ok) => {
      if (ok) console.log('✅ Coolify PostgreSQL schema verified & ready.');
    });
  } else {
    console.log('ℹ️  DATABASE_URL not set — running with local encrypted JSON storage.');
  }

  const server = http.createServer(routeRequest);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Dineflow Server listening on http://0.0.0.0:${PORT}`);
  });
}

