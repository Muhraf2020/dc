// lib/googlePlaces.ts
// Google Places API utilities for fetching dermatology clinic data

import { Clinic, Location } from './dataTypes';

const PLACES_API_URL = 'https://places.googleapis.com/v1/places';

// Locale bias for results (minimal & safe)
const commonBody = {
  languageCode: 'en',
  regionCode: 'US',
};

// ---- Throttle & Backoff (protect quotas/reliability) ----
const QPS_TARGET = 3; // keep between 2–5 QPS
const MIN_INTERVAL_MS = Math.ceil(1000 / QPS_TARGET);
let lastCallAt = 0;

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function fetchWithBackoff(
  url: string,
  init: RequestInit,
  { maxRetries = 5 }: { maxRetries?: number } = {}
): Promise<Response> {
  // simple client-side rate limiting
  const now = Date.now();
  const elapsed = now - lastCallAt;
  if (elapsed < MIN_INTERVAL_MS) {
    await sleep(MIN_INTERVAL_MS - elapsed);
  }

  let attempt = 0;
  while (true) {
    const res = await fetch(url, init);
    lastCallAt = Date.now();

    if (res.ok) return res;

    // retry on rate limit or transient server errors
    if ((res.status === 429 || (res.status >= 500 && res.status < 600)) && attempt < maxRetries) {
      const base = 500; // ms
      const backoff = base * Math.pow(2, attempt); // 0.5s,1s,2s,4s,8s...
      const jitter = Math.floor(Math.random() * 250);
      await sleep(backoff + jitter);
      attempt += 1;
      continue;
    }

    // give up
    return res;
  }
}

// ---- Simple bounds type for grid search (use per-state bounding boxes) ----
export type Bounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

// ---- Heuristic terms for dermatology filtering (name/website) ----
const DERM_TERMS = [
  'dermatology',
  'dermatologist',
  'derma',
  'skin clinic',
  'skin center',
  'medical dermatology',
  'cosmetic dermatology',
  'laser dermatology',
  'skin care',
];

// ---- Address components helper (city/state/postal) ----
function fromAddressComponents(components: any[]) {
  const get = (type: string) => components?.find((c: any) => c.types?.includes(type));
  return {
    state_code: get('administrative_area_level_1')?.shortText ?? null,
    city: get('locality')?.longText ?? get('postal_town')?.longText ?? null,
    postal_code: get('postal_code')?.longText ?? null,
  };
}

/**
 * Search for dermatology clinics near a location (server-side only)
 * Uses Places "Nearby Search" (New).
 *
 * @param location center point
 * @param radius   meters
 * @param rank     'POPULARITY' (default) or 'DISTANCE'
 */
export async function searchDermClinics(
  location: Location,
  radius: number = 50_000, // 50km default
  rank: 'POPULARITY' | 'DISTANCE' = 'POPULARITY'
): Promise<Clinic[]> {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY || '';
    if (!apiKey) throw new Error('Missing GOOGLE_PLACES_API_KEY');

    const response = await fetchWithBackoff(`${PLACES_API_URL}:searchNearby`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.addressComponents',
          'places.location',
          'places.primaryType',
          'places.types',
          'places.rating',
          'places.userRatingCount',
          'places.currentOpeningHours.openNow',
          'places.regularOpeningHours.weekdayDescriptions',
          'places.nationalPhoneNumber',
          'places.internationalPhoneNumber',
          'places.websiteUri',
          'places.googleMapsUri',
          'places.businessStatus',
          'places.accessibilityOptions',
          'places.parkingOptions',
          'places.priceLevel',
          'places.paymentOptions',
          'places.photos.name',
          'places.photos.widthPx',
          'places.photos.heightPx',
        ].join(','),
      },
      body: JSON.stringify({
        ...commonBody,
        // Broad recall; we’ll filter to derm in code.
        includedPrimaryTypes: ['doctor'],
        rankPreference: rank,            // POPULARITY for city recall; DISTANCE for grid
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: { latitude: location.lat, longitude: location.lng },
            radius,
          },
        },
        strictTypeFiltering: false,      // keep recall broad
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Places API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return transformPlacesResponse(data.places || []);
  } catch (error) {
    console.error('Error fetching clinics:', error);
    return [];
  }
}

/**
 * Page-level Text Search helper (returns places + nextPageToken).
 * Use this to paginate reliably.
 */
export async function searchDermClinicsTextPage(
  query: string,
  pageToken?: string
): Promise<{ places: any[]; nextPageToken: string | null }> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || '';
  if (!apiKey) throw new Error('Missing GOOGLE_PLACES_API_KEY');

  const fieldMask = [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.addressComponents',
    'places.location',
    'places.primaryType',
    'places.types',
    'places.rating',
    'places.userRatingCount',
    'places.currentOpeningHours.openNow',
    'places.regularOpeningHours.weekdayDescriptions',
    'places.nationalPhoneNumber',
    'places.internationalPhoneNumber',
    'places.websiteUri',
    'places.googleMapsUri',
    'places.businessStatus',
    'places.accessibilityOptions',
    'places.parkingOptions',
    'places.priceLevel',
    'places.paymentOptions',
    'places.photos.name',
    'places.photos.widthPx',
    'places.photos.heightPx',
    'nextPageToken', // include top-level token in field mask
  ].join(',');

  const body: any = {
    ...commonBody,
    textQuery: query,
    pageSize: 20,
  };
  if (pageToken) body.pageToken = pageToken;

  const resp = await fetchWithBackoff(`${PLACES_API_URL}:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!resp.ok) {
    throw new Error(`Text Search error: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json();
  return { places: data.places ?? [], nextPageToken: data.nextPageToken ?? null };
}

/**
 * Multi-query Text Search with automatic pagination.
 * Provide queries like: "dermatology clinic in Dallas TX", "dermatologist in Ohio".
 */
export async function searchDermClinicsText(
  queries: string[],
  pageLimitPerQuery: number = 10 // defensive cap to avoid runaway pagination
): Promise<Clinic[]> {
  const all: Clinic[] = [];
  const seen = new Set<string>();

  for (const q of queries) {
    let pageToken: string | null = null;
    let pagesFetched = 0;

    do {
      const { places, nextPageToken } = await searchDermClinicsTextPage(q, pageToken || undefined);
      const batch = transformPlacesResponse(places || []);
      for (const c of batch) {
        if (!seen.has(c.place_id)) {
          seen.add(c.place_id);
          all.push(c);
        }
      }
      pageToken = nextPageToken;
      pagesFetched += 1;
    } while (pageToken && pagesFetched < pageLimitPerQuery);
  }

  return all;
}

/**
 * Grid-based Nearby Search for spatial coverage.
 * Sweep a bounding box with a coarse grid; query each point with a radius.
 */
export async function searchDermClinicsGrid(
  bounds: Bounds,
  radiusMeters: number = 25_000, // 25 km
  stepDeg: number = 0.3 // ~33 km latitude steps; longitude spacing varies with latitude
): Promise<Clinic[]> {
  const points = generateGridPoints(bounds, stepDeg);
  const all: Clinic[] = [];
  const seen = new Set<string>();

  for (const p of points) {
    // Prefer DISTANCE for uniform coverage across the grid
    const batch = await searchDermClinics(p, radiusMeters, 'DISTANCE');
    for (const c of batch) {
      if (!seen.has(c.place_id)) {
        seen.add(c.place_id);
        all.push(c);
      }
    }
  }
  return all;
}

/**
 * Get detailed information about a specific clinic (server-side only)
 */
export async function getClinicDetails(placeId: string): Promise<Clinic | null> {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY || '';
    if (!apiKey) throw new Error('Missing GOOGLE_PLACES_API_KEY');

    const response = await fetchWithBackoff(`${PLACES_API_URL}/${placeId}`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': [
          'id',
          'displayName',
          'formattedAddress',
          'addressComponents',
          'location',
          'primaryType',
          'types',
          'rating',
          'userRatingCount',
          'currentOpeningHours.openNow',
          'regularOpeningHours.weekdayDescriptions',
          'nationalPhoneNumber',
          'internationalPhoneNumber',
          'websiteUri',
          'googleMapsUri',
          'businessStatus',
          'accessibilityOptions',
          'parkingOptions',
          'priceLevel',
          'paymentOptions',
          'photos.name',
          'photos.widthPx',
          'photos.heightPx',
        ].join(','),
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Place details error: ${response.status} ${response.statusText}`);
    }

    const place = await response.json();
    return transformSinglePlace(place);
  } catch (error) {
    console.error('Error fetching clinic details:', error);
    return null;
  }
}

/**
 * Build a photo URL without exposing your API key to the client.
 * - If `photoName` is already a full URL (e.g., Unsplash), just return it.
 * - Otherwise, hit our proxy at /api/photo (see app/api/photo/route.ts).
 */
/**
 * Build a photo URL in a client-safe way.
 * - If NEXT_PUBLIC_USE_PLACES_PHOTOS !== 'true', we DO NOT hit Google at all.
 * - If photoName is already a full URL (e.g., Unsplash), always return it as-is.
 * - Otherwise (and only when enabled), proxy via /api/photo to keep the server key hidden.
 */
export function getPhotoUrl(photoName: string, maxWidth = 400, maxHeight = 300): string {
  const usePlacesPhotos = process.env.NEXT_PUBLIC_USE_PLACES_PHOTOS === 'true';

  // If disabled or already a full URL (Unsplash/local CDN), don't proxy via Places.
  if (!usePlacesPhotos) {
    if (/^https?:\/\//i.test(photoName)) return photoName;
    // Fallback to a local stock image so nothing hits Google.
    return '/clinic-images/fallback.jpg';
  }

  // Places-Photo path (only when explicitly enabled)
  if (/^https?:\/\//i.test(photoName)) return photoName;
  const qs = new URLSearchParams({ name: photoName, w: String(maxWidth), h: String(maxHeight) });
  return `/api/photo?${qs.toString()}`;
}


/**
 * Transform Google Places API response array -> Clinic[]
 */
function transformPlacesResponse(places: any[]): Clinic[] {
  return places.map(transformSinglePlace).filter((clinic): clinic is Clinic => clinic !== null);
}

/**
 * Transform a single place object -> Clinic | null
 * (Use heuristics so we don't rely solely on Google types.)
 */
function transformSinglePlace(place: any): Clinic | null {
  if (!place || !place.id) return null;

  const types: string[] = place.types || [];
  const displayName: string = place.displayName?.text || '';
  const lowerName = displayName.toLowerCase();
  const lowerSite = (place.websiteUri || '').toLowerCase();

  const hasDermTerm =
    DERM_TERMS.some((t) => lowerName.includes(t)) ||
    lowerName.includes('derm') ||
    lowerName.includes('skin') ||
    lowerSite.includes('derm') ||
    lowerSite.includes('skin');

  const isDermatology = types.includes('skin_care_clinic') || hasDermTerm;
  if (!isDermatology) return null;

  // city/state/postal from addressComponents
  const ac = fromAddressComponents(place.addressComponents ?? []);

  // Build base object and add extra fields (keeps this file drop-in safe even if Clinic type
  // hasn't been updated yet; you can later add these to your Clinic interface).
  const base: any = {
    place_id: place.id,
    display_name: displayName,
    formatted_address: place.formattedAddress || '',
    location: {
      lat: place.location?.latitude || 0,
      lng: place.location?.longitude || 0,
    },
    primary_type: place.primaryType || 'doctor',
    types,
    rating: place.rating,
    user_rating_count: place.userRatingCount,
    current_open_now: place.currentOpeningHours?.openNow,
    phone: place.nationalPhoneNumber,
    international_phone_number: place.internationalPhoneNumber,
    website: place.websiteUri,
    google_maps_uri: place.googleMapsUri || '',
    business_status: place.businessStatus || 'OPERATIONAL',
    accessibility_options: place.accessibilityOptions,
    parking_options: place.parkingOptions,
    photos: place.photos?.map((photo: any) => ({
      name: photo.name,
      width_px: photo.widthPx,
      height_px: photo.heightPx,
      author_attributions: photo.authorAttributions, // may be undefined (not requested in FieldMask)
    })),
    // Masks include openNow + weekdayDescriptions (not full "periods")
    opening_hours:
      place.currentOpeningHours?.openNow !== undefined ||
      (place.regularOpeningHours && place.regularOpeningHours.weekdayDescriptions)
        ? {
            open_now: place.currentOpeningHours?.openNow,
            weekday_text: place.regularOpeningHours?.weekdayDescriptions,
          }
        : undefined,
    price_level: place.priceLevel,
    payment_options: place.paymentOptions,
    last_fetched_at: new Date().toISOString().split('T')[0],
  };

  // Append parsed address fields (non-breaking)
  base.state_code = ac.state_code;
  base.city = ac.city;
  base.postal_code = ac.postal_code;

  return base as Clinic;
}

/**
 * Generate grid points over a bounding box.
 * stepDeg ~0.3 gives ~33km lat spacing; longitude spacing varies with latitude.
 */
function generateGridPoints(bounds: Bounds, stepDeg: number): Location[] {
  const points: Location[] = [];
  for (let lat = bounds.minLat; lat <= bounds.maxLat + 1e-9; lat += stepDeg) {
    for (let lng = bounds.minLng; lng <= bounds.maxLng + 1e-9; lng += stepDeg) {
      points.push({ lat: round6(lat), lng: round6(lng) });
    }
  }
  return points;
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/**
 * Check if clinic data needs refresh (older than 30 days)
 */
export function needsRefresh(lastFetchedAt: string): boolean {
  const lastFetched = new Date(lastFetchedAt);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return lastFetched < thirtyDaysAgo;
}

/**
 * Geocode an address to get coordinates (client-safe; uses public key)
 */
export async function geocodeAddress(address: string): Promise<Location | null> {
  try {
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=` +
      (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '');
    const response = await fetch(url);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const loc = data.results[0].geometry.location;
      return { lat: loc.lat, lng: loc.lng };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}
