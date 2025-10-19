/**
 * Data Collection Script for Dermatology Clinics
 * 
 * This script collects dermatology clinic data from Google Places API
 * and saves it to JSON files organized by state.
 * 
 * Usage: npm run collect-data
 */

import { promises as fs } from 'fs';
import path from 'path';

// Load environment variables
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';
const PLACES_API_URL = 'https://places.googleapis.com/v1/places';

interface Location {
  lat: number;
  lng: number;
}

interface StateInfo {
  name: string;
  code: string;
  center: Location;
  major_cities: Array<{ name: string; location: Location }>;
}

// Major US states and their coordinates
const US_STATES: StateInfo[] = [
  {
    name: 'California',
    code: 'CA',
    center: { lat: 36.7783, lng: -119.4179 },
    major_cities: [
      { name: 'Los Angeles', location: { lat: 34.0522, lng: -118.2437 } },
      { name: 'San Francisco', location: { lat: 37.7749, lng: -122.4194 } },
      { name: 'San Diego', location: { lat: 32.7157, lng: -117.1611 } },
      { name: 'Sacramento', location: { lat: 38.5816, lng: -121.4944 } },
    ],
  },
  {
    name: 'New York',
    code: 'NY',
    center: { lat: 40.7128, lng: -74.0060 },
    major_cities: [
      { name: 'New York City', location: { lat: 40.7128, lng: -74.0060 } },
      { name: 'Buffalo', location: { lat: 42.8864, lng: -78.8784 } },
      { name: 'Rochester', location: { lat: 43.1566, lng: -77.6088 } },
    ],
  },
  {
    name: 'Texas',
    code: 'TX',
    center: { lat: 31.9686, lng: -99.9018 },
    major_cities: [
      { name: 'Houston', location: { lat: 29.7604, lng: -95.3698 } },
      { name: 'Dallas', location: { lat: 32.7767, lng: -96.7970 } },
      { name: 'Austin', location: { lat: 30.2672, lng: -97.7431 } },
      { name: 'San Antonio', location: { lat: 29.4241, lng: -98.4936 } },
    ],
  },
  {
    name: 'Florida',
    code: 'FL',
    center: { lat: 27.6648, lng: -81.5158 },
    major_cities: [
      { name: 'Miami', location: { lat: 25.7617, lng: -80.1918 } },
      { name: 'Orlando', location: { lat: 28.5383, lng: -81.3792 } },
      { name: 'Tampa', location: { lat: 27.9506, lng: -82.4572 } },
      { name: 'Jacksonville', location: { lat: 30.3322, lng: -81.6557 } },
    ],
  },
  {
    name: 'Illinois',
    code: 'IL',
    center: { lat: 40.6331, lng: -89.3985 },
    major_cities: [
      { name: 'Chicago', location: { lat: 41.8781, lng: -87.6298 } },
      { name: 'Springfield', location: { lat: 39.7817, lng: -89.6501 } },
    ],
  },
  // Add more states as needed
];

/**
 * Search for dermatology clinics near a location
 */
async function searchDermClinics(location: Location, radius: number = 50000) {
  const response = await fetch(`${PLACES_API_URL}:searchNearby`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
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
        'places.priceLevel',
        'places.paymentOptions',
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
}

/**
 * Transform Google Places API response
 */
function transformPlacesResponse(places: any[]) {
  return places
    .map((place) => {
      if (!place || !place.id) return null;

      const types = place.types || [];
      const displayName = place.displayName?.text || '';

      // Filter for dermatology-related clinics
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
        photos: undefined, // Skipping photos to save API costs
        opening_hours: place.regularOpeningHours
          ? {
              open_now: place.currentOpeningHours?.openNow,
              weekday_text: place.regularOpeningHours.weekdayDescriptions,
            }
          : undefined,
        price_level: place.priceLevel,
        payment_options: place.paymentOptions,
        last_fetched_at: new Date().toISOString().split('T')[0],
      };
    })
    .filter((clinic) => clinic !== null);
}

/**
 * Delay helper for rate limiting
 */
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Main data collection function
 */
async function collectData() {
  console.log('🏥 Starting dermatology clinic data collection...\n');

  if (!GOOGLE_PLACES_API_KEY) {
    console.error('❌ Error: GOOGLE_PLACES_API_KEY not found in environment variables');
    process.exit(1);
  }

  const dataDir = path.join(process.cwd(), 'data', 'clinics');

  // Ensure data directory exists
  try {
    await fs.mkdir(dataDir, { recursive: true });
    console.log('✅ Data directory created/verified\n');
  } catch (error) {
    console.error('❌ Error creating data directory:', error);
    process.exit(1);
  }

  let totalClinics = 0;

  // Collect data for each state
  for (const state of US_STATES) {
    console.log(`\n📍 Processing ${state.name} (${state.code})...`);
    const stateClinics = new Map();

    // Search in major cities
    for (const city of state.major_cities) {
      console.log(`  🔍 Searching in ${city.name}...`);

      try {
        const clinics = await searchDermClinics(city.location, 30000); // 30km radius
        console.log(`    Found ${clinics.length} clinics`);

        clinics.forEach((clinic: any) => {
          stateClinics.set(clinic.place_id, clinic);
        });

        // Rate limiting: wait 2 seconds between requests
        await delay(2000);
      } catch (error) {
        console.error(`    ❌ Error searching ${city.name}:`, error);
      }
    }

    // Save state data
    if (stateClinics.size > 0) {
      const fileName = `${state.code.toLowerCase()}.json`;
      const filePath = path.join(dataDir, fileName);

      const clinicsArray = Array.from(stateClinics.values());
      const fileData = {
        state: state.name,
        state_code: state.code,
        clinics: clinicsArray,
        total: clinicsArray.length,
        last_updated: new Date().toISOString(),
      };

      try {
        await fs.writeFile(filePath, JSON.stringify(fileData, null, 2));
        console.log(`  ✅ Saved ${clinicsArray.length} clinics to ${fileName}`);
        totalClinics += clinicsArray.length;
      } catch (error) {
        console.error(`  ❌ Error saving ${fileName}:`, error);
      }
    } else {
      console.log(`  ⚠️  No clinics found for ${state.name}`);
    }
  }

  console.log(`\n✨ Data collection complete!`);
  console.log(`📊 Total clinics collected: ${totalClinics}`);
  console.log(`📁 Data saved in: ${dataDir}\n`);
}

// Run the script
collectData().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
