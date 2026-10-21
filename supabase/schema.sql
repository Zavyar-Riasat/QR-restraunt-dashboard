-- ==============================================================================
-- Multi-Tenant Zero-Commission Restaurant Platform Schema & RLS Setup
-- ==============================================================================

-- 1. Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Restaurants (Tenants Table)
CREATE TABLE IF NOT EXISTS restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20) DEFAULT '923001234567',
    whatsapp_number VARCHAR(20),
    discount_percentage INT DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE restaurants ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
UPDATE restaurants SET phone = whatsapp_number WHERE phone IS NULL AND whatsapp_number IS NOT NULL;
ALTER TABLE restaurants ALTER COLUMN whatsapp_number DROP NOT NULL;

-- 3. Menu Categories
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Menu Items with JSONB Variants
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    variants JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_restaurants_owner_id ON restaurants(owner_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_categories_restaurant_id ON categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);

-- ==============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Clean up any existing policies
DROP POLICY IF EXISTS "Public can view restaurant details by slug" ON restaurants;
DROP POLICY IF EXISTS "Owners can view their own restaurant" ON restaurants;
DROP POLICY IF EXISTS "Owners can insert their own restaurant" ON restaurants;
DROP POLICY IF EXISTS "Owners can update their own restaurant" ON restaurants;
DROP POLICY IF EXISTS "Owners can delete their own restaurant" ON restaurants;
DROP POLICY IF EXISTS "Enable all access for restaurants" ON restaurants;

CREATE POLICY "Enable all access for restaurants" ON restaurants FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view categories" ON categories;
DROP POLICY IF EXISTS "Owners can view their own categories" ON categories;
DROP POLICY IF EXISTS "Owners can insert categories for their restaurant" ON categories;
DROP POLICY IF EXISTS "Owners can update categories of their restaurant" ON categories;
DROP POLICY IF EXISTS "Owners can delete categories of their restaurant" ON categories;
DROP POLICY IF EXISTS "Enable all access for categories" ON categories;

CREATE POLICY "Enable all access for categories" ON categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view menu items" ON menu_items;
DROP POLICY IF EXISTS "Owners can view their own menu items" ON menu_items;
DROP POLICY IF EXISTS "Owners can insert menu items for their restaurant" ON menu_items;
DROP POLICY IF EXISTS "Owners can update menu items of their restaurant" ON menu_items;
DROP POLICY IF EXISTS "Owners can delete menu items of their restaurant" ON menu_items;
DROP POLICY IF EXISTS "Enable all access for menu items" ON menu_items;

CREATE POLICY "Enable all access for menu items" ON menu_items FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 6. INITIAL SEED DATA
-- ==============================================================================
DO $$
DECLARE
    rest_id UUID;
    cat_burgers UUID;
    cat_sides UUID;
    cat_shakes UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM restaurants WHERE slug = 'burgersmoke') THEN
        INSERT INTO restaurants (name, slug, phone, whatsapp_number, discount_percentage)
        VALUES ('Burger & Smoke Co.', 'burgersmoke', '923001234567', '923001234567', 15)
        RETURNING id INTO rest_id;

        INSERT INTO categories (restaurant_id, name) VALUES (rest_id, 'Smash Burgers') RETURNING id INTO cat_burgers;
        INSERT INTO categories (restaurant_id, name) VALUES (rest_id, 'Sides & Fries') RETURNING id INTO cat_sides;
        INSERT INTO categories (restaurant_id, name) VALUES (rest_id, 'Artisan Shakes') RETURNING id INTO cat_shakes;

        INSERT INTO menu_items (restaurant_id, category_id, title, price, variants)
        VALUES (
            rest_id, 
            cat_burgers, 
            'Truffle Double Smash', 
            12.99, 
            '[
                {"id": "v-size", "name": "Size Option", "type": "single", "required": true, "options": [{"id": "o-reg", "name": "Double Patty (Regular)", "price_delta": 0}, {"id": "o-triple", "name": "Triple Patty (Mega)", "price_delta": 3.5}]},
                {"id": "v-addons", "name": "Premium Add-ons", "type": "multi", "required": false, "options": [{"id": "o-bacon", "name": "Smoked Beef Bacon", "price_delta": 1.75}, {"id": "o-cheese", "name": "Extra Cheddar Melt", "price_delta": 1.0}]}
            ]'::jsonb
        );

        INSERT INTO menu_items (restaurant_id, category_id, title, price, variants)
        VALUES (
            rest_id, 
            cat_burgers, 
            'Crispy Nashville Hot Chicken', 
            10.50, 
            '[{"id": "v-heat", "name": "Heat Level", "type": "single", "required": true, "options": [{"id": "o-mild", "name": "Mild Heat", "price_delta": 0}, {"id": "o-medium", "name": "Signature Spicy", "price_delta": 0}, {"id": "o-reaper", "name": "Carolina Reaper Extreme", "price_delta": 0.75}]}]'::jsonb
        );

        INSERT INTO menu_items (restaurant_id, category_id, title, price, variants)
        VALUES (
            rest_id, 
            cat_sides, 
            'Cajun Loaded Fries', 
            5.99, 
            '[{"id": "v-sauce", "name": "Dipping Sauce", "type": "single", "required": true, "options": [{"id": "o-garlic", "name": "Garlic Aioli", "price_delta": 0}, {"id": "o-smokey", "name": "Smoked Chipotle BBQ", "price_delta": 0}]}]'::jsonb
        );
    END IF;
END $$;
