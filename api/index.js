/**
 * Unified Serverless API Entrypoint for Vercel + Coolify PostgreSQL
 * Routes /api/auth/*, /api/admin/*, /api/staff/*, /api/db/*, /api/nearby/dishes, /api/geocode
 */

import { routeRequest } from '../server/index.js';

export default async function handler(req, res) {
  return routeRequest(req, res);
}

