/**
 * Coolify PostgreSQL Database Initializer & Seed Script
 * Run with: npm run db:init
 * Creates all tables in Coolify PostgreSQL (from server/schema.sql) and seeds
 * initial encrypted users and marketplace restaurants if not already present.
 */

import {
  isPostgresUrlConfigured,
  ensurePostgresSchema,
  executeTableOperation,
} from '../server/db.js';
import { SEED_MARKETPLACE_RESTAURANTS } from '../src/services/marketplaceService.js';
import { ALL_SEED_RESTAURANTS } from '../src/services/restaurantService.js';

async function initPostgres() {
  console.log('\n🗄️  Initializing Coolify PostgreSQL Database...');

  const configured = isPostgresUrlConfigured();
  if (configured) {
    const schemaOk = await ensurePostgresSchema();
    console.log(
      schemaOk
        ? '✅ PostgreSQL schema & encrypted users initialized.'
        : '⚠️ Could not reach remote PostgreSQL; seeding local fallback cache.'
    );
  } else {
    console.log('ℹ️  DATABASE_URL not set in .env — seeding local PostgreSQL cache store.');
  }

  // Seed default restaurants, categories, and menu items
  for (const rest of SEED_MARKETPLACE_RESTAURANTS) {
    await executeTableOperation({
      table: 'restaurants',
      operation: 'upsert',
      onConflict: 'id',
      payload: {
        id: rest.id,
        name: rest.name,
        slug: rest.slug,
        phone: rest.phone,
        whatsapp_number: rest.whatsapp_number,
        address: rest.address,
        city: rest.city,
        area: rest.area,
        latitude: rest.latitude,
        longitude: rest.longitude,
        logo: rest.logo,
        logo_url: rest.logo_url,
        cover_image: rest.cover_image,
        cuisines: rest.cuisines,
        opening_hours: rest.opening_hours,
        delivery_enabled: rest.delivery_enabled,
        pickup_enabled: rest.pickup_enabled,
        dinein_enabled: rest.dinein_enabled,
        delivery_fee: rest.delivery_fee,
        min_order: rest.min_order,
        prep_time: rest.prep_time,
        rating: rest.rating,
        reviews_count: rest.reviews_count,
        listing_status: rest.listing_status,
        listed_publicly: rest.listed_publicly,
        discount_percentage: rest.discount_percentage,
      },
    });

    const seedMenu = ALL_SEED_RESTAURANTS[rest.slug];
    if (seedMenu) {
      if (Array.isArray(seedMenu.categories)) {
        for (const cat of seedMenu.categories) {
          await executeTableOperation({
            table: 'categories',
            operation: 'upsert',
            onConflict: 'id',
            payload: {
              id: cat.id,
              restaurant_id: rest.id,
              name: cat.name,
              sort_order: cat.sort_order || 0,
            },
          });
        }
      }
      if (Array.isArray(seedMenu.menuItems)) {
        for (const item of seedMenu.menuItems) {
          await executeTableOperation({
            table: 'menu_items',
            operation: 'upsert',
            onConflict: 'id',
            payload: {
              id: item.id,
              restaurant_id: rest.id,
              category_id: item.category_id,
              title: item.title,
              description: item.description || '',
              price: Number(item.price) || 0,
              image_url: item.image_url || item.variants?.image_url || null,
              is_available: item.is_available !== false,
              variants: item.variants || {},
            },
          });
        }
      }
    }
  }

  console.log('✅ Coolify PostgreSQL seed data synchronized successfully!\n');
}

initPostgres().catch((err) => {
  console.error('❌ Database initialization failed:', err);
  process.exit(1);
});

