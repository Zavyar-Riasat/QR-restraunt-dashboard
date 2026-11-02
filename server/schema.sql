-- ============================================================================
-- Dineflow Multi-Restaurant POS & Direct Ordering Platform
-- Coolify PostgreSQL Database Schema (Auto-Executed on Startup)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner',
  restaurant_id TEXT,
  restaurant_name TEXT,
  restaurant_slug TEXT,
  phone TEXT,
  password_encrypted JSONB NOT NULL,
  must_change_password BOOLEAN DEFAULT FALSE,
  session_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_restaurant_slug ON users (LOWER(restaurant_slug));

CREATE TABLE IF NOT EXISTS security_audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  admin_id TEXT,
  admin_email TEXT,
  user_id TEXT,
  user_email TEXT,
  target_user_id TEXT,
  target_email TEXT,
  restaurant_name TEXT,
  restaurant_slug TEXT,
  ip_address TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS restaurants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  tagline TEXT DEFAULT '',
  phone TEXT DEFAULT '923001234567',
  whatsapp_number TEXT DEFAULT '923001234567',
  address TEXT DEFAULT 'Islamabad, Pakistan',
  city TEXT DEFAULT 'Islamabad',
  area TEXT DEFAULT 'F-7',
  landmark TEXT DEFAULT '',
  latitude DOUBLE PRECISION DEFAULT 33.72148,
  longitude DOUBLE PRECISION DEFAULT 73.05232,
  logo TEXT,
  logo_url TEXT,
  cover_image TEXT,
  primary_color TEXT DEFAULT '#F26B1D',
  cuisines JSONB DEFAULT '["Fast Food"]'::jsonb,
  opening_hours JSONB DEFAULT '{}'::jsonb,
  delivery_enabled BOOLEAN DEFAULT TRUE,
  pickup_enabled BOOLEAN DEFAULT TRUE,
  dinein_enabled BOOLEAN DEFAULT TRUE,
  delivery_mode TEXT DEFAULT 'paid',
  delivery_fee NUMERIC DEFAULT 150,
  min_order NUMERIC DEFAULT 500,
  min_order_amount NUMERIC DEFAULT 500,
  show_min_order BOOLEAN DEFAULT TRUE,
  show_prep_time BOOLEAN DEFAULT TRUE,
  prep_time TEXT DEFAULT '20–30 mins',
  is_open BOOLEAN DEFAULT TRUE,
  rating NUMERIC DEFAULT 4.8,
  reviews_count INTEGER DEFAULT 120,
  discount_percentage NUMERIC DEFAULT 0,
  listing_status TEXT DEFAULT 'approved',
  listed_publicly BOOLEAN DEFAULT TRUE,
  rejection_reason TEXT DEFAULT '',
  deleted BOOLEAN DEFAULT FALSE,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants (LOWER(slug));
CREATE INDEX IF NOT EXISTS idx_restaurants_listing ON restaurants (listing_status, listed_publicly);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_restaurant_id ON categories (restaurant_id);

CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  category_id TEXT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  is_popular BOOLEAN DEFAULT FALSE,
  variants JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON menu_items (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items (category_id);

CREATE TABLE IF NOT EXISTS delivery_areas (
  id SERIAL PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  type TEXT DEFAULT 'radius',
  name TEXT DEFAULT 'Delivery Zone',
  radius_km DOUBLE PRECISION,
  polygon JSONB,
  fee NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_areas_restaurant_id ON delivery_areas (restaurant_id);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  restaurant_name TEXT,
  restaurant_slug TEXT,
  order_source TEXT DEFAULT 'customer',
  customer_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  customer_notes TEXT,
  order_type TEXT DEFAULT 'delivery',
  table_number TEXT,
  subtotal NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  discount_type TEXT DEFAULT 'fixed',
  delivery_fee NUMERIC DEFAULT 0,
  total_payable NUMERIC DEFAULT 0,
  total_payable_paisa BIGINT DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  payment_status TEXT DEFAULT 'unpaid',
  explicit_paid BOOLEAN DEFAULT FALSE,
  has_khata_tracking BOOLEAN DEFAULT FALSE,
  amount_received NUMERIC DEFAULT 0,
  payments JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'new',
  items JSONB DEFAULT '[]'::jsonb,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  accuracy DOUBLE PRECISION,
  house_flat TEXT,
  area_landmark TEXT,
  delivery_notes TEXT,
  rider_token TEXT,
  assigned_rider JSONB,
  waiter_name TEXT,
  waiter_details JSONB,
  customer_rating JSONB,
  idempotency_key TEXT,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders (restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders (customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_rider_token ON orders (rider_token);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT,
  phone TEXT,
  email TEXT,
  avatar TEXT,
  provider TEXT DEFAULT 'phone',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers (phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers (LOWER(email));

CREATE TABLE IF NOT EXISTS customer_addresses (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  label TEXT DEFAULT 'Home',
  address TEXT NOT NULL,
  landmark TEXT,
  delivery_note TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON customer_addresses (customer_id);

CREATE TABLE IF NOT EXISTS favorites (
  id SERIAL PRIMARY KEY,
  customer_id TEXT NOT NULL,
  restaurant_id TEXT NOT NULL,
  restaurant_slug TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_favorites_customer_id ON favorites (customer_id);

