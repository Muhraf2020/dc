// lib/googlePlaces.ts
// Google Places API utilities for fetching dermatology clinic data

import { Clinic, Location } from './dataTypes';

const PLACES_API_URL = 'https://places.googleapis.com/v1/places';

/**
 * Search for dermatology clinics near a location (server-side only)
 */
export async function searchDermClinics(
  location: Location,
  radius: number = 50_000 // 50km default
): Promise<Clinic[]> {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY || '';
    if (!apiKey) throw new Error('Missing GOOGLE_PLACES_API_KEY');

    const response = await fetch(`${PLACES_API_URL}:searchNearby`, {
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
          'places.photos.heightPx'
        ].join(','),
      },
      body: JSON.stringify({
        includedTypes: ['skin_care_clinic', 'doctor'],
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: { latitude: location.lat, longitude: location.lng },
            radius,
          },
        },
      }),
      // Avoid server-side caching jitter while developing; adjust if you want ISR
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
 * Get detailed information about a specific clinic (server-side only)
 */
export async function getClinicDetails(placeId: string): Promise<Clinic | null> {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY || '';
    if (!apiKey) throw new Error('Missing GOOGLE_PLACES_API_KEY');

    const response = await fetch(`${PLACES_API_URL}/${placeId}`, {
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
          'photos.heightPx'
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
export function getPhotoUrl(photoName: string, maxWidth = 400, maxHeight = 400): string {
  // If this is already a full URL (e.g., Unsplash), just return it.
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
 */
function transformSinglePlace(place: any): Clinic | null {
  if (!place || !place.id) return null;

  const types: string[] = place.types || [];
  const displayName: string = place.displayName?.text || '';

  // Filter for dermatology-related clinics
  const lower = displayName.toLowerCase();
  const isDermatology =
    types.includes('skin_care_clinic') ||
    lower.includes('derm') ||
    lower.includes('skin') ||
    lower.includes('dermatology');

  if (!isDermatology && place.primaryType !== 'skin_care_clinic') {
    return null;
  }

  return {
    place_id: place.id,
    display_name: displayName,
    formatted_address: place.formattedAddress || '',
    location: {
      lat: place.location?.latitude || 0,
      lng: place.location?.longitude || 0,
    },
    primary_type: place.primaryType || 'skin_care_clinic',
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
    // Slimmer hours object: masks only include openNow + weekdayDescriptions
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
