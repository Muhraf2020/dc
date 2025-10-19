/**
 * Utility functions for the Derm Clinics Directory
 */

import { Clinic, Location } from './dataTypes';

/**
 * Calculate distance between two coordinates in miles
 */
export function calculateDistance(
  point1: Location,
  point2: Location
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(point2.lat - point1.lat);
  const dLon = toRadians(point2.lng - point1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) *
      Math.cos(toRadians(point2.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Format as (XXX) XXX-XXXX
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // Format with country code
  if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  return phone;
}

/**
 * Format address for display (split into lines)
 */
export function formatAddress(address: string): {
  street: string;
  cityState: string;
} {
  const parts = address.split(',').map(p => p.trim());

  if (parts.length >= 3) {
    return {
      street: parts[0],
      cityState: parts.slice(1).join(', '),
    };
  }

  return {
    street: address,
    cityState: '',
  };
}

/**
 * Get state from address
 */
export function extractState(address: string): string | null {
  const stateMatch = address.match(/\b[A-Z]{2}\b/);
  return stateMatch ? stateMatch[0] : null;
}

/**
 * Get city from address
 */
export function extractCity(address: string): string | null {
  const parts = address.split(',').map(p => p.trim());
  return parts.length >= 2 ? parts[parts.length - 2].replace(/\s+\d+.*$/, '') : null;
}

/**
 * Check if clinic is open now based on opening hours
 */
export function isOpenNow(clinic: Clinic): boolean {
  if (clinic.current_open_now !== undefined) {
    return clinic.current_open_now;
  }

  if (!clinic.opening_hours?.periods) {
    return false;
  }

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const todayPeriod = clinic.opening_hours.periods.find(
    p => p.open.day === dayOfWeek
  );

  if (!todayPeriod) {
    return false;
  }

  const openTime = todayPeriod.open.hour * 60 + todayPeriod.open.minute;
  const closeTime = todayPeriod.close
    ? todayPeriod.close.hour * 60 + todayPeriod.close.minute
    : 24 * 60;

  return currentTime >= openTime && currentTime < closeTime;
}

/**
 * Get rating color class
 */
export function getRatingColor(rating: number): string {
  if (rating >= 4.5) return 'text-green-600';
  if (rating >= 4.0) return 'text-blue-600';
  if (rating >= 3.5) return 'text-yellow-600';
  return 'text-gray-600';
}

/**
 * Get business status badge color
 */
export function getStatusColor(status: string): {
  bg: string;
  text: string;
} {
  switch (status) {
    case 'OPERATIONAL':
      return { bg: 'bg-green-100', text: 'text-green-800' };
    case 'CLOSED_TEMPORARILY':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
    case 'CLOSED_PERMANENTLY':
      return { bg: 'bg-red-100', text: 'text-red-800' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800' };
  }
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Generate SEO-friendly slug from clinic name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Sort clinics by distance from a location
 */
export function sortByDistance(
  clinics: Clinic[],
  userLocation: Location
): Clinic[] {
  return [...clinics].sort((a, b) => {
    const distA = calculateDistance(userLocation, a.location);
    const distB = calculateDistance(userLocation, b.location);
    return distA - distB;
  });
}

/**
 * Filter clinics by search query
 */
export function filterByQuery(clinics: Clinic[], query: string): Clinic[] {
  if (!query.trim()) return clinics;

  const lowerQuery = query.toLowerCase();
  
  return clinics.filter(clinic => {
    const searchText = [
      clinic.display_name,
      clinic.formatted_address,
      ...clinic.types,
    ].join(' ').toLowerCase();

    return searchText.includes(lowerQuery);
  });
}

/**
 * Group clinics by state
 */
export function groupByState(clinics: Clinic[]): Record<string, Clinic[]> {
  return clinics.reduce((acc, clinic) => {
    const state = extractState(clinic.formatted_address) || 'Unknown';
    if (!acc[state]) {
      acc[state] = [];
    }
    acc[state].push(clinic);
    return acc;
  }, {} as Record<string, Clinic[]>);
}

/**
 * Group clinics by city
 */
export function groupByCity(clinics: Clinic[]): Record<string, Clinic[]> {
  return clinics.reduce((acc, clinic) => {
    const city = extractCity(clinic.formatted_address) || 'Unknown';
    if (!acc[city]) {
      acc[city] = [];
    }
    acc[city].push(clinic);
    return acc;
  }, {} as Record<string, Clinic[]>);
}

/**
 * Get top-rated clinics
 */
export function getTopRated(clinics: Clinic[], limit: number = 10): Clinic[] {
  return [...clinics]
    .filter(c => c.rating && c.user_rating_count && c.user_rating_count >= 10)
    .sort((a, b) => {
      // Sort by rating, then by number of reviews
      if (b.rating! !== a.rating!) {
        return b.rating! - a.rating!;
      }
      return (b.user_rating_count || 0) - (a.user_rating_count || 0);
    })
    .slice(0, limit);
}

/**
 * Check if data needs refresh (older than 30 days)
 */
export function needsDataRefresh(lastFetched: string): boolean {
  const lastDate = new Date(lastFetched);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  return daysDiff >= 30;
}

/**
 * Generate Google Maps directions URL
 */
export function getDirectionsUrl(clinic: Clinic, origin?: Location): string {
  const destination = `${clinic.location.lat},${clinic.location.lng}`;
  const baseUrl = 'https://www.google.com/maps/dir/?api=1';
  
  if (origin) {
    return `${baseUrl}&origin=${origin.lat},${origin.lng}&destination=${destination}`;
  }
  
  return `${baseUrl}&destination=${destination}`;
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return past.toLocaleDateString();
}

/**
 * Validate clinic data
 */
export function validateClinic(clinic: Partial<Clinic>): boolean {
  return !!(
    clinic.place_id &&
    clinic.display_name &&
    clinic.formatted_address &&
    clinic.location &&
    typeof clinic.location.lat === 'number' &&
    typeof clinic.location.lng === 'number'
  );
}
