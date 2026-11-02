/**
 * Coolify PostgreSQL Frontend Client
 * Direct fluent query client that communicates with our Node/PostgreSQL backend
 * (/api/db/query) backed by Coolify PostgreSQL.
 */

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};

const apiBaseUrl = (env.VITE_POSTGRES_API_URL || env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

const isConfigured = Boolean(
  env.VITE_USE_POSTGRES_API === 'true' ||
  env.VITE_DATABASE_ENABLED === 'true' ||
  (env.VITE_POSTGRES_API_URL && !env.VITE_POSTGRES_API_URL.includes('your-'))
);

class PostgresQueryBuilder {
  constructor(table) {
    this.spec = {
      table,
      operation: 'select',
      select: '*',
      filters: [],
      order: [],
      limit: null,
      single: false,
      maybeSingle: false,
      payload: null,
      onConflict: 'id',
    };
  }

  select(columns = '*') {
    this.spec.select = columns;
    return this;
  }

  insert(payload) {
    this.spec.operation = 'insert';
    this.spec.payload = payload;
    return this;
  }

  update(payload) {
    this.spec.operation = 'update';
    this.spec.payload = payload;
    return this;
  }

  upsert(payload, options = {}) {
    this.spec.operation = 'upsert';
    this.spec.payload = payload;
    if (options?.onConflict) {
      this.spec.onConflict = options.onConflict;
    }
    return this;
  }

  delete() {
    this.spec.operation = 'delete';
    return this;
  }

  eq(column, value) {
    this.spec.filters.push({ column, op: 'eq', value });
    return this;
  }

  neq(column, value) {
    this.spec.filters.push({ column, op: 'neq', value });
    return this;
  }

  in(column, values) {
    this.spec.filters.push({ column, op: 'in', value: Array.isArray(values) ? values : [values] });
    return this;
  }

  ilike(column, value) {
    this.spec.filters.push({ column, op: 'ilike', value });
    return this;
  }

  order(column, options = { ascending: true }) {
    this.spec.order.push({
      column,
      ascending: options?.ascending !== false,
    });
    return this;
  }

  limit(count) {
    this.spec.limit = count;
    return this;
  }

  single() {
    this.spec.single = true;
    return this.execute();
  }

  maybeSingle() {
    this.spec.maybeSingle = true;
    return this;
  }

  async execute() {
    try {
      const endpoint = `${apiBaseUrl}/api/db/query`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.spec),
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        return {
          data: null,
          error: errBody?.error || { message: `PostgreSQL API returned HTTP ${response.status}` },
        };
      }
      const result = await response.json();
      return {
        data: result.data ?? null,
        error: result.error ?? null,
      };
    } catch (err) {
      return {
        data: null,
        error: { message: err.message || 'Network error connecting to PostgreSQL API' },
      };
    }
  }

  then(onFulfilled, onRejected) {
    return this.execute().then(onFulfilled, onRejected);
  }

  catch(onRejected) {
    return this.execute().catch(onRejected);
  }
}

export const postgresClient = {
  from(table) {
    return new PostgresQueryBuilder(table);
  },
};

export const isPostgresConfigured = () => isConfigured;
export { isConfigured };

