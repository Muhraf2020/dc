// app/api/clinics/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Clinic } from '@/lib/dataTypes';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// US State to Timezone mapping
const STATE_TIMEZONES: Record<string, string> = {
  'AL': 'America/Chicago', 'AK': 'America/Anchorage', 'AZ': 'America/Phoenix',
  'AR': 'America/Chicago', 'CA': 'America/Los_Angeles', 'CO': 'America/Denver',
  'CT': 'America/New_York', 'DE': 'America/New_York', 'FL': 'America/New_York',
  'GA': 'America/New_York', 'HI': 'Pacific/Honolulu', 'ID': 'America/Denver',
  'IL': 'America/Chicago', 'IN': 'America/Indiana/Indianapolis', 'IA': 'America/Chicago',
  'KS': 'America/Chicago', 'KY': 'America/New_York', 'LA': 'America/Chicago',
  'ME': 'America/New_York', 'MD': 'America/New_York', 'MA': 'America/New_York',
  'MI': 'America/Detroit', 'MN': 'America/Chicago', 'MS': 'America/Chicago',
  'MO': 'America/Chicago', 'MT': 'America/Denver', 'NE': 'America/Chicago',
  'NV': 'America/Los_Angeles', 'NH': 'America/New_York', 'NJ': 'America/New_York',
  'NM': 'America/Denver', 'NY': 'America/New_York', 'NC': 'America/New_York',
  'ND': 'America/Chicago', 'OH': 'America/New_York', 'OK': 'America/Chicago',
  'OR': 'America/Los_Angeles', 'PA': 'America/New_York', 'RI': 'America/New_York',
  'SC': 'America/New_York', 'SD': 'America/Chicago', 'TN': 'America/Chicago',
  'TX': 'America/Chicago', 'UT': 'America/Denver', 'VT': 'America/New_York',
  'VA': 'America/New_York', 'WA': 'America/Los_Angeles', 'WV': 'America/New_York',
  'WI': 'America/Chicago', 'WY': 'America/Denver', 'DC': 'America/New_York'
};

/**
 * Transform Supabase data (camelCase) to frontend format (snake_case)
 * and calculate real-time open_now status
 */
function transformClinicData(rawClinic: any): Clinic {
  // Transform accessibility_options from camelCase to snake_case
  const accessibility_options = rawClinic.accessibility_options ? {
    wheelchair_accessible_entrance: rawClinic.accessibility_options.wheelchairAccessibleEntrance,
    wheelchair_accessible_parking: rawClinic.accessibility_options.wheelchairAccessibleParking,
    wheelchair_accessible_restroom: rawClinic.accessibility_options.wheelchairAccessibleRestroom,
    wheelchair_accessible_seating: rawClinic.accessibility_options.wheelchairAccessibleSeating,
  } : undefined;

  // Transform payment_options from camelCase to snake_case
  const payment_options = rawClinic.payment_options ? {
    accepts_credit_cards: rawClinic.payment_options.acceptsCreditCards,
    accepts_debit_cards: rawClinic.payment_options.acceptsDebitCards,
    accepts_cash_only: rawClinic.payment_options.acceptsCashOnly,
    accepts_nfc: rawClinic.payment_options.acceptsNfc,
  } : undefined;

  // Transform parking_options from camelCase to snake_case
  const parking_options = rawClinic.parking_options ? {
    free_parking_lot: rawClinic.parking_options.freeParkingLot,
    paid_parking_lot: rawClinic.parking_options.paidParkingLot,
    free_street_parking: rawClinic.parking_options.freeStreetParking,
    paid_street_parking: rawClinic.parking_options.paidStreetParking,
    valet_parking: rawClinic.parking_options.valetParking,
    free_garage_parking: rawClinic.parking_options.freeGarageParking,
    paid_garage_parking: rawClinic.parking_options.paidGarageParking,
  } : undefined;

  // Calculate real-time open_now status from weekday_text
  let current_open_now = false;
  if (rawClinic.opening_hours?.weekday_text) {
    const timezone = STATE_TIMEZONES[rawClinic.state_code] || 'America/New_York';
    current_open_now = calculateOpenNowFromWeekdayText(
      rawClinic.opening_hours.weekday_text,
      timezone
    );
  }

  return {
    ...rawClinic,
    accessibility_options,
    payment_options,
    parking_options,
    current_open_now,
    opening_hours: rawClinic.opening_hours ? {
      ...rawClinic.opening_hours,
      open_now: current_open_now, // Update this dynamically
    } : undefined,
  };
}

/**
 * Calculate if a clinic is open now based on weekday_text array
 * with proper timezone handling
 * 
 * Example: ["Monday: 8:00 AM – 5:00 PM", "Tuesday: 9:00 AM – 5:00 PM", ...]
 */
function calculateOpenNowFromWeekdayText(
  weekdayText: string[],
  timezone: string
): boolean {
  if (!weekdayText || weekdayText.length === 0) return false;

  try {
    // Get current time in the clinic's timezone
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const weekday = parts.find(p => p.type === 'weekday')?.value || '';
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const currentTime = hour * 60 + minute; // Minutes since midnight

    // Find today's hours
    const todayHours = weekdayText.find(text => text.startsWith(weekday));
    if (!todayHours) return false;

    // Check if closed
    if (todayHours.toLowerCase().includes('closed')) return false;

    // Parse hours - handle multiple dash types (-, –, —)
    const timeMatch = todayHours.match(
      /(\d{1,2}):(\d{2})\s*(AM|PM)\s*[-–—]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i
    );
    
    if (!timeMatch) {
      console.warn(`Could not parse hours: ${todayHours}`);
      return false;
    }

    const [, openHour, openMin, openPeriod, closeHour, closeMin, closePeriod] = timeMatch;

    // Convert to 24-hour format
    let openTime = parseInt(openHour) * 60 + parseInt(openMin);
    let closeTime = parseInt(closeHour) * 60 + parseInt(closeMin);

    // Handle AM/PM conversion
    if (openPeriod.toUpperCase() === 'PM' && parseInt(openHour) !== 12) {
      openTime += 12 * 60;
    }
    if (openPeriod.toUpperCase() === 'AM' && parseInt(openHour) === 12) {
      openTime = parseInt(openMin); // 12 AM is 00:00
    }
    if (closePeriod.toUpperCase() === 'PM' && parseInt(closeHour) !== 12) {
      closeTime += 12 * 60;
    }
    if (closePeriod.toUpperCase() === 'AM' && parseInt(closeHour) === 12) {
      closeTime = parseInt(closeMin); // 12 AM is 00:00
    }

    // Check if current time is within operating hours
    return currentTime >= openTime && currentTime < closeTime;
  } catch (error) {
    console.error('Error calculating open_now:', error);
    return false;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');
    const city = searchParams.get('city');
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '500');

    let query = supabase
      .from('clinics')
      .select('*', { count: 'exact' });

    // Filter by state
    if (state) {
      query = query.eq('state_code', state);
    }

    // Filter by city
    if (city) {
      query = query.ilike('city', `%${city}%`);
    }

    // Pagination
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // Transform all clinics to match frontend expectations
    const transformedClinics = (data || []).map(transformClinicData);

    return NextResponse.json({
      clinics: transformedClinics,
      total: count || 0,
      page,
      per_page: perPage,
    });
  } catch (error) {
    console.error('Error in clinics API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clinics' },
      { status: 500 }
    );
  }
}