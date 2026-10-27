-- ==============================================================================
-- Migration: Nearby Dishes & Search Performance Optimization
-- Adds database indexes on dish name, category, and composite indexes for fast
-- spatial and category searches. Defines RPC function for nearby dishes discovery.
-- ==============================================================================

-- 1. Index on menu item title for rapid substring / trigram matching
CREATE INDEX IF NOT EXISTS idx_menu_items_title ON menu_items(title);

-- 2. Index on menu item category_id
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);

-- 3. Composite Index on menu item title and category_id
CREATE INDEX IF NOT EXISTS idx_menu_items_category_title ON menu_items(category_id, title);

-- 4. Composite Index on menu item restaurant_id and category_id
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_cat ON menu_items(restaurant_id, category_id);

-- 5. Index on categories name
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- 6. RPC Function: get_nearby_dishes
-- Joins menu_items with categories and approved restaurants, calculates distance,
-- filters by search query and category, sorts, and paginates 24 at a time.
CREATE OR REPLACE FUNCTION get_nearby_dishes(
    user_lat NUMERIC DEFAULT NULL,
    user_lng NUMERIC DEFAULT NULL,
    search_query TEXT DEFAULT NULL,
    category_filter TEXT DEFAULT NULL,
    sort_by TEXT DEFAULT 'nearest',
    p_cursor INT DEFAULT 0,
    p_limit INT DEFAULT 24
)
RETURNS TABLE (
    item_id UUID,
    item_title VARCHAR,
    item_price NUMERIC,
    item_description TEXT,
    item_variants JSONB,
    category_id UUID,
    category_name VARCHAR,
    restaurant_id UUID,
    restaurant_name VARCHAR,
    restaurant_slug VARCHAR,
    restaurant_logo TEXT,
    restaurant_cover TEXT,
    restaurant_rating NUMERIC,
    restaurant_is_open BOOLEAN,
    distance_km NUMERIC,
    delivers_to_user BOOLEAN,
    delivery_fee NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id AS item_id,
        m.title AS item_title,
        m.price AS item_price,
        (m.variants->>'description')::TEXT AS item_description,
        m.variants AS item_variants,
        c.id AS category_id,
        c.name AS category_name,
        r.id AS restaurant_id,
        r.name AS restaurant_name,
        r.slug AS restaurant_slug,
        r.logo AS restaurant_logo,
        r.cover_image AS restaurant_cover,
        r.rating AS restaurant_rating,
        is_restaurant_open_now(r.opening_hours) AS restaurant_is_open,
        calculate_distance_km(user_lat, user_lng, r.latitude, r.longitude) AS distance_km,
        -- Check delivery coverage: distance within any delivery radius
        (
            user_lat IS NULL OR user_lng IS NULL OR
            EXISTS (
                SELECT 1 FROM delivery_areas da
                WHERE da.restaurant_id = r.id
                  AND da.type = 'radius'
                  AND calculate_distance_km(user_lat, user_lng, r.latitude, r.longitude) <= da.radius_km
            )
        ) AS delivers_to_user,
        r.delivery_fee AS delivery_fee
    FROM menu_items m
    INNER JOIN categories c ON c.id = m.category_id
    INNER JOIN restaurants r ON r.id = m.restaurant_id
    WHERE r.listing_status = 'approved'
      AND r.listed_publicly = true
      AND (
          search_query IS NULL 
          OR search_query = '' 
          OR m.title ILIKE '%' || search_query || '%'
          OR c.name ILIKE '%' || search_query || '%'
          OR r.name ILIKE '%' || search_query || '%'
      )
      AND (
          category_filter IS NULL 
          OR category_filter = 'ALL' 
          OR c.name ILIKE '%' || category_filter || '%'
      )
    ORDER BY
        -- Closed restaurants sink to bottom
        (CASE WHEN is_restaurant_open_now(r.opening_hours) THEN 0 ELSE 1 END) ASC,
        -- Sort logic
        CASE WHEN sort_by = 'price_asc' THEN m.price END ASC,
        CASE WHEN sort_by = 'price_desc' THEN m.price END DESC,
        CASE WHEN sort_by = 'nearest' THEN calculate_distance_km(user_lat, user_lng, r.latitude, r.longitude) END ASC NULLS LAST,
        m.created_at DESC
    OFFSET p_cursor
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
