// Google Places API utilities for fetching dermatology clinic data

import { Clinic, Location } from './dataTypes';

const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';
const PLACES_API_URL = 'https://places.googleapis.com/v1/places';

/**
 * Search for dermatology clinics near a location
 */
export async function searchDermClinics(
  location: Location,
  radius: number = 50000 // 50km default
): Promise<Clinic[]> {
  try {
    const response = await fetch(`${PLACES_API_URL}:searchNearby`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': PLACES_API_KEY,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.location',
          'places.types',
          'places.primaryType',
          'places.rating',
          'places.userRatingCount',
          'places.currentOpeningHours',
          'places.nationalPhoneNumber',
          'places.internationalPhoneNumber',
          'places.websiteUri',
          'places.googleMapsUri',
          'places.businessStatus',
          'places.accessibilityOptions',
          'places.parkingOptions',
          'places.photos',
          'places.priceLevel',
          'places.paymentOptions'
        ].join(','),
      },
      body: JSON.stringify({
        includedTypes: ['skin_care_clinic', 'doctor'],
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: {
              latitude: location.lat,
              longitude: location.lng,
            },
            radius: radius,
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Places API error: ${response.statusText}`);
    }

    const data = await response.json();
    return transformPlacesResponse(data.places || []);
  } catch (error) {
    console.error('Error fetching clinics:', error);
    return [];
  }
}

/**
 * Get detailed information about a specific clinic
 */
export async function getClinicDetails(placeId: string): Promise<Clinic | null> {
  try {
    const response = await fetch(`${PLACES_API_URL}/${placeId}`, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': PLACES_API_KEY,
        'X-Goog-FieldMask': [
          'id',
          'displayName',
          'formattedAddress',
          'location',
          'types',
          'primaryType',
          'rating',
          'userRatingCount',
          'currentOpeningHours',
          'nationalPhoneNumber',
          'internationalPhoneNumber',
          'websiteUri',
          'googleMapsUri',
          'businessStatus',
          'accessibilityOptions',
          'parkingOptions',
          'photos',
          'regularOpeningHours',
          'priceLevel',
          'paymentOptions',
          'reviews'
        ].join(','),
      },
    });

    if (!response.ok) {
      throw new Error(`Place details error: ${response.statusText}`);
    }

    const place = await response.json();
    return transformSinglePlace(place);
  } catch (error) {
    console.error('Error fetching clinic details:', error);
    return null;
  }
}

/**
 * Get photo URL for a place photo
 */
export function getPhotoUrl(
  photoName: string,
  maxWidth: number = 400,
  maxHeight: number = 400
): string {
  return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=${maxHeight}&maxWidthPx=${maxWidth}&key=${PLACES_API_KEY}`;
}

/**
 * Transform Google Places API response to our Clinic type
 */
function transformPlacesResponse(places: any[]): Clinic[] {
  return places
    .map(transformSinglePlace)
    .filter((clinic): clinic is Clinic => clinic !== null);
}

/**
 * Transform a single place from API response to Clinic type
 */
function transformSinglePlace(place: any): Clinic | null {
  if (!place || !place.id) return null;

  // Filter for dermatology-related clinics
  const types = place.types || [];
  const displayName = place.displayName?.text || '';
  
  const isDermatology = 
    types.includes('skin_care_clinic') ||
    displayName.toLowerCase().includes('derm') ||
    displayName.toLowerCase().includes('skin') ||
    displayName.toLowerCase().includes('dermatology');

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
    types: types,
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
      author_attributions: photo.authorAttributions,
    })),
    opening_hours: place.regularOpeningHours ? {
      open_now: place.currentOpeningHours?.openNow,
      periods: place.regularOpeningHours.periods,
      weekday_text: place.regularOpeningHours.weekdayDescriptions,
    } : undefined,
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
 * Geocode an address to get coordinates
 */
export async function geocodeAddress(address: string): Promise<Location | null> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
    );
    
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}
