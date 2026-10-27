/**
 * Geo Validation & Polygon Utilities
 * Provides robust geometric validation for delivery polygons,
 * including self-intersection checks, minimum vertices validation,
 * and approximate area calculation.
 */

/**
 * Check if orientation of ordered triplet (p, q, r)
 * 0 -> p, q and r are collinear
 * 1 -> Clockwise
 * 2 -> Counterclockwise
 */
function orientation(p, q, r) {
  const val = (q.lat - p.lat) * (r.lng - q.lng) - (q.lng - p.lng) * (r.lat - q.lat);
  if (Math.abs(val) < 1e-10) return 0;
  return val > 0 ? 1 : 2;
}

/**
 * Check if point q lies on line segment 'pr'
 */
function onSegment(p, q, r) {
  return (
    q.lat <= Math.max(p.lat, r.lat) &&
    q.lat >= Math.min(p.lat, r.lat) &&
    q.lng <= Math.max(p.lng, r.lng) &&
    q.lng >= Math.min(p.lng, r.lng)
  );
}

/**
 * Check if line segment 'p1q1' and 'p2q2' intersect
 */
export function doSegmentsIntersect(p1, q1, p2, q2) {
  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);

  // General case: segments cross each other
  if (o1 !== o2 && o3 !== o4) {
    return true;
  }

  // Special cases for collinear points
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;

  return false;
}

/**
 * Validates a polygon coordinate array.
 * Each point can be [lat, lng] or { lat, lng }.
 * Returns { valid: boolean, error?: string }
 */
export function validatePolygonCoordinates(rawCoords) {
  if (!Array.isArray(rawCoords) || rawCoords.length < 3) {
    return {
      valid: false,
      error: 'A delivery polygon must have at least 3 distinct points.',
    };
  }

  // Normalize points to { lat, lng }
  const points = rawCoords.map((pt) => {
    if (Array.isArray(pt)) {
      return { lat: Number(pt[0]), lng: Number(pt[1]) };
    }
    return { lat: Number(pt.lat), lng: Number(pt.lng) };
  });

  // Verify coordinates are numeric and valid
  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    if (isNaN(pt.lat) || isNaN(pt.lng) || Math.abs(pt.lat) > 90 || Math.abs(pt.lng) > 180) {
      return {
        valid: false,
        error: `Point #${i + 1} has invalid latitude or longitude.`,
      };
    }
  }

  // Check for duplicate consecutive points or if closed ring has identical start/end
  const cleaned = [];
  for (let i = 0; i < points.length; i++) {
    const curr = points[i];
    const prev = cleaned[cleaned.length - 1];
    if (!prev || Math.abs(prev.lat - curr.lat) > 1e-7 || Math.abs(prev.lng - curr.lng) > 1e-7) {
      cleaned.push(curr);
    }
  }

  // If last point equals first point (closed GeoJSON ring), pop last point for vertex check
  if (
    cleaned.length > 3 &&
    Math.abs(cleaned[0].lat - cleaned[cleaned.length - 1].lat) < 1e-7 &&
    Math.abs(cleaned[0].lng - cleaned[cleaned.length - 1].lng) < 1e-7
  ) {
    cleaned.pop();
  }

  if (cleaned.length < 3) {
    return {
      valid: false,
      error: 'Polygon must have at least 3 non-duplicate vertices.',
    };
  }

  // Check for self-intersections between non-adjacent edges
  const n = cleaned.length;
  for (let i = 0; i < n; i++) {
    const p1 = cleaned[i];
    const q1 = cleaned[(i + 1) % n];

    for (let j = i + 1; j < n; j++) {
      // Skip adjacent edges and same edge
      if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) {
        continue;
      }

      const p2 = cleaned[j];
      const q2 = cleaned[(j + 1) % n];

      if (doSegmentsIntersect(p1, q1, p2, q2)) {
        return {
          valid: false,
          error: 'The delivery area polygon self-intersects. Please draw a simple non-overlapping boundary.',
        };
      }
    }
  }

  return { valid: true, points: cleaned };
}

/**
 * Calculates approximate area of a polygon on earth in square kilometers (km²)
 * using spherical excess formula / planar approximation for local zones.
 */
export function calculatePolygonAreaKm2(rawCoords) {
  const validation = validatePolygonCoordinates(rawCoords);
  if (!validation.valid || !validation.points) return 0;

  const pts = validation.points;
  if (pts.length < 3) return 0;

  // Convert lat/lng to meters around mean latitude
  const meanLat = pts.reduce((sum, p) => sum + p.lat, 0) / pts.length;
  const latFactor = 111320; // meters per degree latitude
  const lngFactor = 111320 * Math.cos((meanLat * Math.PI) / 180); // meters per degree longitude

  let areaM2 = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    const xi = pts[i].lng * lngFactor;
    const yi = pts[i].lat * latFactor;
    const xj = pts[j].lng * lngFactor;
    const yj = pts[j].lat * latFactor;
    areaM2 += xi * yj - xj * yi;
  }

  const areaKm2 = Math.abs(areaM2) / 2 / 1000000;
  return Number(areaKm2.toFixed(1));
}

/**
 * Standard Ray-Casting Algorithm to test if a coordinate { lat, lng }
 * is strictly inside a polygon ring of coordinates.
 */
export function isPointInPolygon(point, rawCoords) {
  if (!point) return false;
  const pLat = point.lat ?? point.latitude;
  const pLng = point.lng ?? point.longitude;
  if (pLat == null || pLng == null) return false;
  if (!Array.isArray(rawCoords) || rawCoords.length < 3) return false;

  const pts = rawCoords.map((pt) => {
    if (Array.isArray(pt)) return { lat: Number(pt[0]), lng: Number(pt[1]) };
    return { lat: Number(pt.lat ?? pt.latitude), lng: Number(pt.lng ?? pt.longitude) };
  });

  const x = Number(pLng);
  const y = Number(pLat);

  // 1. Check if point lies directly on boundary edge or vertex
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const p1 = pts[i];
    const p2 = pts[j];
    const minLat = Math.min(p1.lat, p2.lat) - 1e-6;
    const maxLat = Math.max(p1.lat, p2.lat) + 1e-6;
    const minLng = Math.min(p1.lng, p2.lng) - 1e-6;
    const maxLng = Math.max(p1.lng, p2.lng) + 1e-6;

    if (y >= minLat && y <= maxLat && x >= minLng && x <= maxLng) {
      const cross = Math.abs((p2.lat - p1.lat) * (x - p1.lng) - (p2.lng - p1.lng) * (y - p1.lat));
      const segLength = Math.hypot(p2.lat - p1.lat, p2.lng - p1.lng);
      if (segLength > 0 && cross / segLength < 1e-5) {
        return true;
      }
    }
  }

  // 2. Standard Ray-Casting Algorithm
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].lng;
    const yi = pts[i].lat;
    const xj = pts[j].lng;
    const yj = pts[j].lat;

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * High-precision Haversine Distance (km)
 */
export function haversineKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // Earth radius in km

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Evaluates whether a customer's location is within a restaurant's delivery coverage.
 * Checks both circular radius and Geoman polygon boundaries.
 */
export function checkRestaurantDeliveryCoverage(customerLocation, restaurant, deliveryAreas = []) {
  if (!restaurant) return { deliversToUser: false, distanceKm: null };
  if (!customerLocation) {
    return { deliversToUser: true, distanceKm: null };
  }
  const custLat = customerLocation.lat ?? customerLocation.latitude;
  const custLng = customerLocation.lng ?? customerLocation.longitude;
  if (custLat == null || custLng == null) {
    return { deliversToUser: true, distanceKm: null };
  }

  const distanceKm = haversineKm(
    custLat,
    custLng,
    restaurant.latitude,
    restaurant.longitude
  );

  // If delivery is disabled altogether
  if (restaurant.delivery_enabled === false) {
    return { deliversToUser: false, distanceKm, reason: 'Delivery disabled' };
  }

  const areas = Array.isArray(deliveryAreas) && deliveryAreas.length > 0
    ? deliveryAreas
    : restaurant.delivery_areas || [];

  if (areas.length > 0) {
    for (const area of areas) {
      if (area.type === 'polygon' && Array.isArray(area.polygon) && area.polygon.length >= 3) {
        if (isPointInPolygon(customerLocation, area.polygon)) {
          return { deliversToUser: true, distanceKm, fee: area.fee ?? restaurant.delivery_fee };
        }
      } else if (area.type === 'radius' || area.radius_km) {
        const radius = Number(area.radius_km || 5);
        if (distanceKm != null && distanceKm <= radius) {
          return { deliversToUser: true, distanceKm, fee: area.fee ?? restaurant.delivery_fee };
        }
      }
    }
    // Had custom areas but user wasn't inside any
    return { deliversToUser: false, distanceKm };
  }

  // Fallback: Default 8km radius if no specific zones defined
  const delivers = distanceKm != null && distanceKm <= 8.0;
  return { deliversToUser: delivers, distanceKm, fee: restaurant.delivery_fee };
}

/**
 * Generates an initial preset regular polygon (e.g. 6-sided hexagon) around a center coordinate.
 * Useful for 1-click initial delivery boundary creation.
 */
export function generatePresetPolygon(centerLat, centerLng, radiusKm = 5, sides = 6) {
  const points = [];
  const R = 6371; // Earth radius in km
  const cLat = Number(centerLat) || 33.72148;
  const cLng = Number(centerLng) || 73.05232;
  const rKm = Math.max(1, Math.min(25, Number(radiusKm) || 5));

  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
    const dLat = (rKm / R) * (180 / Math.PI) * Math.cos(angle);
    const dLng =
      ((rKm / R) * (180 / Math.PI) * Math.sin(angle)) /
      Math.cos((cLat * Math.PI) / 180);
    points.push({
      lat: Number((cLat + dLat).toFixed(6)),
      lng: Number((cLng + dLng).toFixed(6)),
    });
  }
  return points;
}


