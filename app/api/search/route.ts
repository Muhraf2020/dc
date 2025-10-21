export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { searchDermClinics, geocodeAddress } from '@/lib/googlePlaces';
import { Clinic } from '@/lib/dataTypes';

/**
 * GET /api/search
 * Search for dermatology clinics using Google Places API
 */
export async function GET(request: Request) {
  // ⛔ 1) Block paid search in dev/preview when READ_ONLY_MODE is enabled
  if (process.env.READ_ONLY_MODE === 'true') {
    return NextResponse.json(
      { error: 'Search disabled in read-only mode' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const location = searchParams.get('location');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = parseInt(searchParams.get('radius') || '50000'); // 50km default

    let searchLocation: { lat: number; lng: number } | null = null;

    // Determine search location
    if (lat && lng) {
      // Use provided coordinates
      searchLocation = { lat: parseFloat(lat), lng: parseFloat(lng) };
    } else if (location) {
      // Geocode the location string
      searchLocation = await geocodeAddress(location);
      
      if (!searchLocation) {
        return NextResponse.json(
          { error: 'Could not find location. Please try a different search.' },
          { status: 400 }
        );
      }
    } else {
      // Default to USA center
      searchLocation = { lat: 39.8283, lng: -98.5795 };
    }

    // Search for clinics
    const clinics = await searchDermClinics(searchLocation, radius);

    // Filter by query if provided
    let filteredClinics = clinics;
    if (query) {
      const lowerQuery = query.toLowerCase();
      filteredClinics = clinics.filter(clinic => {
        const searchableText = `
          ${clinic.display_name} 
          ${clinic.formatted_address} 
          ${clinic.types.join(' ')}
        `.toLowerCase();
        
        return searchableText.includes(lowerQuery);
      });
    }

    return NextResponse.json({
      clinics: filteredClinics,
      total: filteredClinics.length,
      search_location: searchLocation,
      query: query || null,
    });
  } catch (error) {
    console.error('Error in search API:', error);
    return NextResponse.json(
      { error: 'Failed to search clinics. Please try again.' },
      { status: 500 }
    );
  }
}
