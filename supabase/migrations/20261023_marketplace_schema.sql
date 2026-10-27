-- ==============================================================================
-- Migration: Nearby Restaurants Marketplace Data Model
-- Adds restaurants spatial/listing columns, delivery areas, customers,
-- customer addresses, favorites, distance calculations, and overnight opening hours.
-- ==============================================================================

-- 1. Optional Spatial Extensions (PostGIS / EarthDistance)
DO $$
BEGIN
  -- Try enabling PostGIS if supported by Postgres host
  CREATE EXTENSION IF NOT EXISTS postgis;
EXCEPTION WHEN OTHERS THEN
  BEGIN
    -- Fallback to earthdistance and cube
    CREATE EXTENSION IF NOT EXISTS cube;
    CREATE EXTENSION IF NOT EXISTS earthdistance;
  EXCEPTION WHEN OTHERS THEN
    -- Neither available: standard Haversine formula is used below
    RAISE NOTICE 'PostGIS / EarthDistance extensions not available. Utilizing native Haversine formula.';
  END;
END $$;

-- 2. Update Restaurants Table with Marketplace Columns
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT 'Islamabad';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS area VARCHAR(100) DEFAULT 'F-7';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS cover_image TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS cuisines JSONB DEFAULT '["Burgers", "Fast Food"]'::jsonb;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT '{
  "monday": {"open": "11:00", "close": "02:00", "is_closed": false},
  "tuesday": {"open": "11:00", "close": "02:00", "is_closed": false},
  "wednesday": {"open": "11:00", "close": "02:00", "is_closed": false},
  "thursday": {"open": "11:00", "close": "02:00", "is_closed": false},
  "friday": {"open": "11:00", "close": "03:00", "is_closed": false},
  "saturday": {"open": "11:00", "close": "03:00", "is_closed": false},
  "sunday": {"open": "11:00", "close": "02:00", "is_closed": false}
}'::jsonb;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS delivery_enabled BOOLEAN DEFAULT true;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS pickup_enabled BOOLEAN DEFAULT true;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS dinein_enabled BOOLEAN DEFAULT true;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10, 2) DEFAULT 150.00;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS min_order NUMERIC(10, 2) DEFAULT 500.00;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS prep_time VARCHAR(50) DEFAULT '20-30 mins';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2) DEFAULT 4.8;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS listing_status VARCHAR(20) DEFAULT 'approved';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS listed_publicly BOOLEAN DEFAULT true;

-- Ensure constraint on listing_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_restaurant_listing_status'
  ) THEN
    ALTER TABLE restaurants 
      ADD CONSTRAINT chk_restaurant_listing_status 
      CHECK (listing_status IN ('pending', 'approved', 'hidden'));
  END IF;
END $$;

-- Spatial & Filter Indexes for Fast Marketplace Searches
CREATE INDEX IF NOT EXISTS idx_restaurants_marketplace_filter 
  ON restaurants(listing_status, listed_publicly) 
  WHERE listing_status = 'approved' AND listed_publicly = true;

CREATE INDEX IF NOT EXISTS idx_restaurants_coords 
  ON restaurants(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_restaurants_city_area 
  ON restaurants(city, area);

-- 3. Delivery Areas Table (Radius or Polygon Zones)
CREATE TABLE IF NOT EXISTS delivery_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL DEFAULT 'radius' CHECK (type IN ('radius', 'polygon')),
    radius_km NUMERIC(6, 2) DEFAULT 5.0,
    polygon JSONB,
    fee NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_areas_restaurant_id ON delivery_areas(restaurant_id);

-- 4. Customers Table (Public Marketplace Diners)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(25) UNIQUE,
    email VARCHAR(255) UNIQUE,
    avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- 5. Customer Addresses Table
CREATE TABLE IF NOT EXISTS customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    label VARCHAR(50) DEFAULT 'Home' CHECK (label IN ('Home', 'Work', 'Other')),
    address TEXT NOT NULL,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    landmark VARCHAR(255),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON customer_addresses(customer_id);

-- 6. Favorites Table
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_customer_restaurant_favorite UNIQUE (customer_id, restaurant_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_customer_id ON favorites(customer_id);
CREATE INDEX IF NOT EXISTS idx_favorites_restaurant_id ON favorites(restaurant_id);

-- 7. Haversine Distance Calculation Function (Kilometers)
CREATE OR REPLACE FUNCTION calculate_distance_km(
    lat1 NUMERIC, lon1 NUMERIC,
    lat2 NUMERIC, lon2 NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
    rad_lat1 NUMERIC := radians(lat1);
    rad_lat2 NUMERIC := radians(lat2);
    d_lat NUMERIC := radians(lat2 - lat1);
    d_lon NUMERIC := radians(lon2 - lon1);
    a NUMERIC;
    c NUMERIC;
BEGIN
    IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
        RETURN NULL;
    END IF;
    a := sin(d_lat / 2)^2 + cos(rad_lat1) * cos(rad_lat2) * sin(d_lon / 2)^2;
    c := 2 * atan2(sqrt(a), sqrt(1 - a));
    RETURN ROUND((6371 * c)::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 8. Overnight-Aware Is Restaurant Open Function
CREATE OR REPLACE FUNCTION is_restaurant_open_now(hours JSONB, check_time TIMESTAMPTZ DEFAULT NOW())
RETURNS BOOLEAN AS $$
DECLARE
    current_dow VARCHAR(10);
    prev_dow VARCHAR(10);
    today_schedule JSONB;
    prev_schedule JSONB;
    current_time_str VARCHAR(5);
    open_time VARCHAR(5);
    close_time VARCHAR(5);
    is_closed BOOLEAN;
BEGIN
    IF hours IS NULL THEN
        RETURN TRUE;
    END IF;

    current_dow := lower(to_char(check_time, 'FMDay'));
    prev_dow := lower(to_char(check_time - INTERVAL '1 day', 'FMDay'));
    current_time_str := to_char(check_time, 'HH24:MI');

    -- Check 1: Was yesterday open overnight past midnight?
    prev_schedule := hours -> prev_dow;
    IF prev_schedule IS NOT NULL THEN
        is_closed := COALESCE((prev_schedule ->> 'is_closed')::BOOLEAN, false);
        open_time := prev_schedule ->> 'open';
        close_time := prev_schedule ->> 'close';
        -- Overnight if close < open and we are before close time
        IF NOT is_closed AND close_time < open_time AND current_time_str < close_time THEN
            RETURN TRUE;
        END IF;
    END IF;

    -- Check 2: Today's schedule
    today_schedule := hours -> current_dow;
    IF today_schedule IS NULL THEN
        RETURN TRUE;
    END IF;

    is_closed := COALESCE((today_schedule ->> 'is_closed')::BOOLEAN, false);
    IF is_closed THEN
        RETURN FALSE;
    END IF;

    open_time := today_schedule ->> 'open';
    close_time := today_schedule ->> 'close';

    IF open_time IS NULL OR close_time IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Normal day shift: open < close
    IF open_time <= close_time THEN
        RETURN (current_time_str >= open_time AND current_time_str < close_time);
    ELSE
        -- Overnight shift: open > close (e.g. 11:00 to 02:00)
        RETURN (current_time_str >= open_time OR current_time_str < close_time);
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- 9. Row Level Security Policies
ALTER TABLE delivery_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Allow public read on delivery areas
DROP POLICY IF EXISTS "Public can view delivery areas" ON delivery_areas;
CREATE POLICY "Public can view delivery areas" ON delivery_areas FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable all access for delivery areas" ON delivery_areas;
CREATE POLICY "Enable all access for delivery areas" ON delivery_areas FOR ALL USING (true) WITH CHECK (true);

-- Customers RLS
DROP POLICY IF EXISTS "Public can create and view customers" ON customers;
CREATE POLICY "Public can create and view customers" ON customers FOR ALL USING (true) WITH CHECK (true);

-- Customer Addresses RLS
DROP POLICY IF EXISTS "Public can manage customer addresses" ON customer_addresses;
CREATE POLICY "Public can manage customer addresses" ON customer_addresses FOR ALL USING (true) WITH CHECK (true);

-- Favorites RLS
DROP POLICY IF EXISTS "Public can manage favorites" ON favorites;
CREATE POLICY "Public can manage favorites" ON favorites FOR ALL USING (true) WITH CHECK (true);

-- 10. Seed Initial Marketplace Restaurants with Real Coordinates & Data
UPDATE restaurants
SET 
  latitude = 33.72148,
  longitude = 73.05232,
  address = 'Shop 4, Block B, Beverly Centre, Blue Area',
  city = 'Islamabad',
  area = 'Blue Area',
  cover_image = 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80',
  logo = 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=200&h=200&q=80',
  cuisines = '["Smash Burgers", "American Fast Food", "Loaded Fries", "Artisan Shakes"]'::jsonb,
  delivery_enabled = true,
  pickup_enabled = true,
  dinein_enabled = true,
  delivery_fee = 150.00,
  min_order = 500.00,
  prep_time = '20-30 mins',
  rating = 4.9,
  listing_status = 'approved',
  listed_publicly = true
WHERE slug = 'burgersmoke';
