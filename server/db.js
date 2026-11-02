/**
 * Coolify PostgreSQL Database Engine & Query Executor
 * Connects to Coolify PostgreSQL via DATABASE_URL (with SSL support),
 * auto-migrates server/schema.sql on startup, and provides a parameterized
 * SQL execution layer + local JSON fallback when running offline.
 */

import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import tls from 'node:tls';
import crypto from 'node:crypto';
import { serverStorage } from './storage.js';

const ROOT_DIR = process.cwd();
const SCHEMA_FILE = path.join(ROOT_DIR, 'server', 'schema.sql');
const LOCAL_DB_FILE = path.join(ROOT_DIR, 'data', 'postgres_local_cache.json');

// Strict whitelist of allowed table names to prevent SQL identifier injection
const ALLOWED_TABLES = new Set([
  'users',
  'security_audit_logs',
  'restaurants',
  'categories',
  'menu_items',
  'delivery_areas',
  'orders',
  'customers',
  'customer_addresses',
  'favorites',
]);

// JSONB columns per table so objects/arrays are serialized properly for PostgreSQL
const JSONB_COLUMNS = new Set([
  'password_encrypted',
  'details',
  'cuisines',
  'opening_hours',
  'settings',
  'polygon',
  'payments',
  'items',
  'assigned_rider',
  'waiter_details',
  'customer_rating',
  'variants',
]);

function loadEnvFromFile() {
  try {
    const envPath = path.join(ROOT_DIR, '.env');
    if (!fs.existsSync(envPath)) return {};
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    const map = {};
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      map[key] = val;
    }
    return map;
  } catch {
    return {};
  }
}

export function getDatabaseUrl() {
  const fileEnv = loadEnvFromFile();
  const url =
    process.env.DATABASE_URL ||
    process.env.COOLIFY_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    fileEnv.DATABASE_URL ||
    fileEnv.COOLIFY_DATABASE_URL ||
    fileEnv.POSTGRES_URL ||
    '';
  if (
    !url ||
    url.includes('your-coolify-postgres-host') ||
    url.includes('your_password@')
  ) {
    return '';
  }
  return url.trim();
}

export function isPostgresUrlConfigured() {
  return Boolean(getDatabaseUrl());
}

function sanitizeIdentifier(ident) {
  const clean = String(ident || '').trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(clean)) {
    throw new Error(`Invalid SQL identifier: ${clean}`);
  }
  return `"${clean}"`;
}

function formatSqlLiteral(val, colName = '') {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') {
    return Number.isFinite(val) ? String(val) : 'NULL';
  }
  if (typeof val === 'object' || JSONB_COLUMNS.has(colName)) {
    const jsonStr = typeof val === 'string' ? val : JSON.stringify(val);
    return `'${jsonStr.replace(/'/g, "''")}'::jsonb`;
  }
  const str = String(val);
  return `'${str.replace(/'/g, "''")}'`;
}

function interpolateParameterizedSql(sql, params = []) {
  if (!params || params.length === 0) return sql;
  return sql.replace(/\$(\d+)/g, (_, idxStr) => {
    const idx = parseInt(idxStr, 10) - 1;
    return formatSqlLiteral(params[idx]);
  });
}

/**
 * Built-in Node.js PostgreSQL v3 Wire Protocol Client
 * Used automatically if the 'pg' npm package is not yet installed locally.
 */
async function executeWireQuery(connectionString, sql, params = []) {
  const parsed = new URL(connectionString);
  const host = parsed.hostname || '127.0.0.1';
  const port = Number(parsed.port || 5432);
  const user = decodeURIComponent(parsed.username || 'postgres');
  const password = decodeURIComponent(parsed.password || '');
  const database = decodeURIComponent((parsed.pathname || '/postgres').slice(1) || 'postgres');
  const sslMode = parsed.searchParams.get('sslmode') || process.env.DATABASE_SSL || '';
  const useTls = sslMode === 'require' || sslMode === 'verify-full' || sslMode === 'true';

  const finalSql = interpolateParameterizedSql(sql, params);

  return new Promise((resolve, reject) => {
    let socket = net.connect({ host, port });
    let buffer = Buffer.alloc(0);
    let columns = [];
    const rows = [];
    let settled = false;

    const finish = (err, res) => {
      if (settled) return;
      settled = true;
      try { socket.end(); } catch {}
      if (err) reject(err);
      else resolve(res);
    };

    const sendStartup = (sock) => {
      const parts = [
        Buffer.from('user\0'),
        Buffer.from(user + '\0'),
        Buffer.from('database\0'),
        Buffer.from(database + '\0'),
        Buffer.from('client_encoding\0UTF8\0\0'),
      ];
      const payload = Buffer.concat(parts);
      const header = Buffer.alloc(8);
      header.writeInt32BE(payload.length + 8, 0);
      header.writeInt32BE(196608, 4); // Protocol v3.0
      sock.write(Buffer.concat([header, payload]));
    };

    const sendQuery = (sock, queryText) => {
      const qBuf = Buffer.from(queryText + '\0', 'utf8');
      const hdr = Buffer.alloc(5);
      hdr[0] = 0x51; // 'Q'
      hdr.writeInt32BE(qBuf.length + 4, 1);
      sock.write(Buffer.concat([hdr, qBuf]));
    };

    const attachHandlers = (sock) => {
      sock.on('error', (err) => finish(err));
      sock.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);
        while (buffer.length >= 5) {
          const msgType = String.fromCharCode(buffer[0]);
          const msgLen = buffer.readInt32BE(1);
          if (buffer.length < 1 + msgLen) break;
          const body = buffer.subarray(5, 1 + msgLen);
          buffer = buffer.subarray(1 + msgLen);

          if (msgType === 'R') {
            const authType = body.readInt32BE(0);
            if (authType === 0) {
              // Auth OK
            } else if (authType === 3) {
              // Cleartext password
              const pBuf = Buffer.from(password + '\0', 'utf8');
              const hdr = Buffer.alloc(5);
              hdr[0] = 0x70; // 'p'
              hdr.writeInt32BE(pBuf.length + 4, 1);
              sock.write(Buffer.concat([hdr, pBuf]));
            } else if (authType === 5) {
              // MD5 password
              const salt = body.subarray(4, 8);
              const inner = crypto.createHash('md5').update(password + user).digest('hex');
              const outer = crypto
                .createHash('md5')
                .update(Buffer.concat([Buffer.from(inner), salt]))
                .digest('hex');
              const md5Pass = 'md5' + outer + '\0';
              const pBuf = Buffer.from(md5Pass, 'utf8');
              const hdr = Buffer.alloc(5);
              hdr[0] = 0x70;
              hdr.writeInt32BE(pBuf.length + 4, 1);
              sock.write(Buffer.concat([hdr, pBuf]));
            }
          } else if (msgType === 'Z') {
            // ReadyForQuery
            if (!sock._querySent) {
              sock._querySent = true;
              sendQuery(sock, finalSql);
            } else {
              finish(null, { rows, rowCount: rows.length });
            }
          } else if (msgType === 'T') {
            // RowDescription
            const fieldCount = body.readInt16BE(0);
            let offset = 2;
            columns = [];
            for (let i = 0; i < fieldCount; i++) {
              const zeroIdx = body.indexOf(0, offset);
              const colName = body.subarray(offset, zeroIdx).toString('utf8');
              const typeOid = body.readInt32BE(zeroIdx + 7);
              columns.push({ name: colName, typeOid });
              offset = zeroIdx + 19;
            }
          } else if (msgType === 'D') {
            // DataRow
            const colCount = body.readInt16BE(0);
            let offset = 2;
            const rowObj = {};
            for (let i = 0; i < colCount; i++) {
              const valLen = body.readInt32BE(offset);
              offset += 4;
              const colMeta = columns[i] || { name: `col_${i}`, typeOid: 25 };
              if (valLen === -1) {
                rowObj[colMeta.name] = null;
              } else {
                const rawStr = body.subarray(offset, offset + valLen).toString('utf8');
                offset += valLen;
                if (colMeta.typeOid === 16) {
                  rowObj[colMeta.name] = rawStr === 't' || rawStr === 'true';
                } else if ([20, 21, 23, 700, 701, 1700].includes(colMeta.typeOid)) {
                  const num = Number(rawStr);
                  rowObj[colMeta.name] = Number.isNaN(num) ? rawStr : num;
                } else if (colMeta.typeOid === 114 || colMeta.typeOid === 3802 || JSONB_COLUMNS.has(colMeta.name)) {
                  try {
                    rowObj[colMeta.name] = JSON.parse(rawStr);
                  } catch {
                    rowObj[colMeta.name] = rawStr;
                  }
                } else {
                  rowObj[colMeta.name] = rawStr;
                }
              }
            }
            rows.push(rowObj);
          } else if (msgType === 'E') {
            // ErrorResponse
            let errMsg = 'PostgreSQL error';
            let offset = 0;
            while (offset < body.length && body[offset] !== 0) {
              const fieldType = String.fromCharCode(body[offset]);
              offset += 1;
              const zeroIdx = body.indexOf(0, offset);
              const val = body.subarray(offset, zeroIdx).toString('utf8');
              if (fieldType === 'M') errMsg = val;
              offset = zeroIdx + 1;
            }
            finish(new Error(errMsg));
          }
        }
      });
    };

    socket.on('connect', () => {
      if (useTls) {
        const sslReq = Buffer.alloc(8);
        sslReq.writeInt32BE(8, 0);
        sslReq.writeInt32BE(80877103, 4); // SSLRequest code
        socket.write(sslReq);
        socket.once('data', (resp) => {
          if (resp[0] === 0x53) {
            // 'S' -> Upgrade to TLS
            socket = tls.connect({ socket, servername: host, rejectUnauthorized: false }, () => {
              attachHandlers(socket);
              sendStartup(socket);
            });
          } else {
            attachHandlers(socket);
            sendStartup(socket);
          }
        });
      } else {
        attachHandlers(socket);
        sendStartup(socket);
      }
    });
  });
}

let _pgPool = null;
let _schemaInitialized = false;

async function getPgPoolOrRunner() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) return null;

  if (_pgPool) return _pgPool;

  try {
    const pgModule = await import('pg');
    const PoolClass = pgModule.Pool || pgModule.default?.Pool;
    if (PoolClass) {
      const useSsl =
        connectionString.includes('sslmode=require') ||
        process.env.DATABASE_SSL === 'true';
      _pgPool = new PoolClass({
        connectionString,
        ssl: useSsl ? { rejectUnauthorized: false } : false,
        max: 15,
        idleTimeoutMillis: 30000,
      });
      return _pgPool;
    }
  } catch {
    // 'pg' npm package not installed locally; use built-in wire protocol runner
  }

  _pgPool = {
    query: (sql, params) => executeWireQuery(connectionString, sql, params),
  };
  return _pgPool;
}

/**
 * Execute raw parameterized SQL against Coolify PostgreSQL
 */
export async function queryPostgres(sql, params = []) {
  const pool = await getPgPoolOrRunner();
  if (!pool) {
    throw new Error('DATABASE_URL is not configured.');
  }
  return pool.query(sql, params);
}

/**
 * Automatically initialize Coolify PostgreSQL tables & seed default encrypted accounts
 */
export async function ensurePostgresSchema() {
  if (_schemaInitialized || !isPostgresUrlConfigured()) return false;
  try {
    if (fs.existsSync(SCHEMA_FILE)) {
      const schemaSql = fs.readFileSync(SCHEMA_FILE, 'utf8');
      await queryPostgres(schemaSql);
    }

    // Seed initial encrypted users into PostgreSQL if users table is empty
    const existingUsers = await queryPostgres('SELECT COUNT(*)::int AS cnt FROM "users"');
    const count = existingUsers.rows?.[0]?.cnt || 0;
    if (count === 0) {
      const initialUsers = serverStorage.getUsers();
      for (const u of initialUsers) {
        await queryPostgres(
          `INSERT INTO "users" ("id", "email", "name", "role", "restaurant_id", "restaurant_name", "restaurant_slug", "phone", "password_encrypted", "must_change_password", "session_version", "created_at")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT ("email") DO NOTHING`,
          [
            u.id,
            u.email.toLowerCase(),
            u.name,
            u.role,
            u.restaurant_id || null,
            u.restaurant_name || null,
            u.restaurant_slug || null,
            u.phone || null,
            JSON.stringify(u.password_encrypted),
            Boolean(u.must_change_password),
            u.session_version || 1,
            u.created_at || new Date().toISOString(),
          ]
        );
      }
    }

    _schemaInitialized = true;
    return true;
  } catch (err) {
    console.warn('Coolify PostgreSQL schema auto-init notice:', err.message);
    return false;
  }
}

// ============================================================================
// Local JSON Mirror Store (Fallback when DATABASE_URL is not yet set)
// ============================================================================
function readLocalStore() {
  try {
    const dir = path.dirname(LOCAL_DB_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(LOCAL_DB_FILE)) {
      return {};
    }
    return JSON.parse(fs.readFileSync(LOCAL_DB_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeLocalStore(store) {
  try {
    const dir = path.dirname(LOCAL_DB_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch {}
}

function matchesFilters(row, filters = []) {
  for (const f of filters) {
    const val = row[f.column];
    if (f.op === 'eq' && String(val ?? '') !== String(f.value ?? '')) return false;
    if (f.op === 'neq' && String(val ?? '') === String(f.value ?? '')) return false;
    if (f.op === 'in' && Array.isArray(f.value) && !f.value.map(String).includes(String(val))) return false;
    if (f.op === 'ilike') {
      const pattern = String(f.value || '').toLowerCase().replace(/%/g, '');
      if (!String(val || '').toLowerCase().includes(pattern)) return false;
    }
  }
  return true;
}

function executeLocalFallbackOperation(querySpec) {
  const {
    table,
    operation = 'select',
    select = '*',
    filters = [],
    order = [],
    limit = null,
    single = false,
    maybeSingle = false,
    payload = null,
    onConflict = 'id',
  } = querySpec;

  const store = readLocalStore();
  if (!Array.isArray(store[table])) {
    store[table] = [];
  }
  let rows = store[table];

  if (operation === 'insert') {
    const items = Array.isArray(payload) ? payload : [payload];
    const inserted = items.map((item) => ({
      id: item.id || `${table}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ...item,
      created_at: item.created_at || new Date().toISOString(),
    }));
    store[table].push(...inserted);
    writeLocalStore(store);
    const out = single || maybeSingle ? inserted[0] || null : inserted;
    return { data: out, error: null };
  }

  if (operation === 'upsert') {
    const items = Array.isArray(payload) ? payload : [payload];
    const conflictCols = String(onConflict || 'id').split(',').map((c) => c.trim());
    const upserted = [];
    for (const item of items) {
      const idx = store[table].findIndex((r) =>
        conflictCols.every((c) => item[c] !== undefined && String(r[c]) === String(item[c]))
      );
      if (idx >= 0) {
        store[table][idx] = { ...store[table][idx], ...item, updated_at: new Date().toISOString() };
        upserted.push(store[table][idx]);
      } else {
        const created = {
          id: item.id || `${table}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ...item,
          created_at: item.created_at || new Date().toISOString(),
        };
        store[table].push(created);
        upserted.push(created);
      }
    }
    writeLocalStore(store);
    const out = single || maybeSingle ? upserted[0] || null : upserted;
    return { data: out, error: null };
  }

  if (operation === 'update') {
    const updated = [];
    store[table] = rows.map((r) => {
      if (matchesFilters(r, filters)) {
        const next = { ...r, ...(payload || {}), updated_at: new Date().toISOString() };
        updated.push(next);
        return next;
      }
      return r;
    });
    writeLocalStore(store);
    const out = single || maybeSingle ? updated[0] || null : updated;
    return { data: out, error: null };
  }

  if (operation === 'delete') {
    const deleted = rows.filter((r) => matchesFilters(r, filters));
    store[table] = rows.filter((r) => !matchesFilters(r, filters));
    writeLocalStore(store);
    return { data: deleted, error: null };
  }

  // SELECT
  let result = rows.filter((r) => matchesFilters(r, filters));

  if (typeof select === 'string' && select.includes('delivery_areas') && table === 'restaurants') {
    const allAreas = Array.isArray(store.delivery_areas) ? store.delivery_areas : [];
    result = result.map((r) => ({
      ...r,
      delivery_areas: allAreas.filter((a) => a.restaurant_id === r.id),
    }));
  }

  if (Array.isArray(order) && order.length > 0) {
    result.sort((a, b) => {
      for (const o of order) {
        const va = a[o.column];
        const vb = b[o.column];
        if (va === vb) continue;
        const cmp = va > vb ? 1 : -1;
        return o.ascending === false ? -cmp : cmp;
      }
      return 0;
    });
  }

  if (limit != null && Number(limit) > 0) {
    result = result.slice(0, Number(limit));
  }

  if (single || maybeSingle) {
    return { data: result[0] || null, error: null };
  }
  return { data: result, error: null };
}

/**
 * Execute a structured table operation against Coolify PostgreSQL
 * (with automatic schema initialization and parameterized SQL generation)
 */
export async function executeTableOperation(querySpec = {}) {
  const {
    table,
    operation = 'select',
    select = '*',
    filters = [],
    order = [],
    limit = null,
    single = false,
    maybeSingle = false,
    payload = null,
    onConflict = 'id',
  } = querySpec;

  if (!ALLOWED_TABLES.has(table)) {
    return { data: null, error: { message: `Table "${table}" is not in allowed schema.` } };
  }

  // Use local JSON fallback if DATABASE_URL is not configured yet
  if (!isPostgresUrlConfigured()) {
    return executeLocalFallbackOperation(querySpec);
  }

  await ensurePostgresSchema();

  const tableIdent = sanitizeIdentifier(table);
  const params = [];

  const buildWhereClause = () => {
    if (!Array.isArray(filters) || filters.length === 0) return '';
    const clauses = [];
    for (const f of filters) {
      const colIdent = sanitizeIdentifier(f.column);
      if (f.op === 'eq') {
        params.push(f.value);
        clauses.push(`${colIdent} = $${params.length}`);
      } else if (f.op === 'neq') {
        params.push(f.value);
        clauses.push(`${colIdent} != $${params.length}`);
      } else if (f.op === 'ilike') {
        params.push(f.value);
        clauses.push(`${colIdent} ILIKE $${params.length}`);
      } else if (f.op === 'in' && Array.isArray(f.value) && f.value.length > 0) {
        const placeholders = f.value.map((v) => {
          params.push(v);
          return `$${params.length}`;
        });
        clauses.push(`${colIdent} IN (${placeholders.join(', ')})`);
      }
    }
    return clauses.length > 0 ? ` WHERE ${clauses.join(' AND ')}` : '';
  };

  try {
    if (operation === 'select') {
      const whereSql = buildWhereClause();
      let orderSql = '';
      if (Array.isArray(order) && order.length > 0) {
        const orderParts = order.map(
          (o) => `${sanitizeIdentifier(o.column)} ${o.ascending === false ? 'DESC' : 'ASC'}`
        );
        orderSql = ` ORDER BY ${orderParts.join(', ')}`;
      }
      const limitSql =
        single || maybeSingle
          ? ' LIMIT 1'
          : limit != null && Number(limit) > 0
          ? ` LIMIT ${Math.floor(Number(limit))}`
          : '';

      const sql = `SELECT * FROM ${tableIdent}${whereSql}${orderSql}${limitSql}`;
      const res = await queryPostgres(sql, params);
      let rows = res.rows || [];

      // Support joined delivery_areas(*) on restaurants query
      if (
        table === 'restaurants' &&
        typeof select === 'string' &&
        select.includes('delivery_areas') &&
        rows.length > 0
      ) {
        const areasRes = await queryPostgres('SELECT * FROM "delivery_areas"');
        const allAreas = areasRes.rows || [];
        rows = rows.map((r) => ({
          ...r,
          delivery_areas: allAreas.filter((a) => a.restaurant_id === r.id),
        }));
      }

      if (single || maybeSingle) {
        return { data: rows[0] || null, error: null };
      }
      return { data: rows, error: null };
    }

    if (operation === 'insert' || operation === 'upsert') {
      const items = (Array.isArray(payload) ? payload : [payload]).filter(Boolean);
      if (items.length === 0) return { data: [], error: null };

      const returnedRows = [];
      for (const item of items) {
        const rowData = { ...item };
        if (!rowData.id && table !== 'delivery_areas' && table !== 'favorites') {
          rowData.id = `${table}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        }
        const cols = Object.keys(rowData).filter((k) => rowData[k] !== undefined);
        const colIdents = cols.map(sanitizeIdentifier);
        const rowParams = [];
        const valPlaceholders = cols.map((k) => {
          const v = rowData[k];
          rowParams.push(JSONB_COLUMNS.has(k) && typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
          return `$${rowParams.length}`;
        });

        let conflictSql = '';
        if (operation === 'upsert') {
          const conflictCols = String(onConflict || 'id')
            .split(',')
            .map((c) => sanitizeIdentifier(c.trim()))
            .join(', ');
          const updateAssignments = cols
            .map((c) => `${sanitizeIdentifier(c)} = EXCLUDED.${sanitizeIdentifier(c)}`)
            .join(', ');
          conflictSql = ` ON CONFLICT (${conflictCols}) DO UPDATE SET ${updateAssignments}`;
        } else if (rowData.id) {
          conflictSql = ' ON CONFLICT DO NOTHING';
        }

        const sql = `INSERT INTO ${tableIdent} (${colIdents.join(', ')}) VALUES (${valPlaceholders.join(', ')})${conflictSql} RETURNING *`;
        const res = await queryPostgres(sql, rowParams);
        if (res.rows?.[0]) returnedRows.push(res.rows[0]);
      }

      const out = single || maybeSingle ? returnedRows[0] || null : returnedRows;
      return { data: out, error: null };
    }

    if (operation === 'update') {
      const updates = payload || {};
      const cols = Object.keys(updates).filter((k) => updates[k] !== undefined);
      if (cols.length === 0) return { data: [], error: null };

      const setParts = cols.map((k) => {
        const v = updates[k];
        params.push(JSONB_COLUMNS.has(k) && typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
        return `${sanitizeIdentifier(k)} = $${params.length}`;
      });

      const whereSql = buildWhereClause();
      const sql = `UPDATE ${tableIdent} SET ${setParts.join(', ')}${whereSql} RETURNING *`;
      const res = await queryPostgres(sql, params);
      const rows = res.rows || [];
      const out = single || maybeSingle ? rows[0] || null : rows;
      return { data: out, error: null };
    }

    if (operation === 'delete') {
      const whereSql = buildWhereClause();
      if (!whereSql) {
        return { data: null, error: { message: 'DELETE requires at least one filter.' } };
      }
      const sql = `DELETE FROM ${tableIdent}${whereSql} RETURNING *`;
      const res = await queryPostgres(sql, params);
      return { data: res.rows || [], error: null };
    }

    return { data: null, error: { message: `Unsupported operation: ${operation}` } };
  } catch (err) {
    return { data: null, error: { message: err.message || 'PostgreSQL query error' } };
  }
}

