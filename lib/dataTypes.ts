// Type definitions for Dermatology Clinic Directory

export interface Location {
  lat: number;
  lng: number;
}

export interface AccessibilityOptions {
  wheelchair_accessible_entrance?: boolean;
  wheelchair_accessible_parking?: boolean;
  wheelchair_accessible_restroom?: boolean;
  wheelchair_accessible_seating?: boolean;
}

export interface ParkingOptions {
  free_parking_lot?: boolean;
  paid_parking_lot?: boolean;
  free_street_parking?: boolean;
  paid_street_parking?: boolean;
  valet_parking?: boolean;
  free_garage_parking?: boolean;
  paid_garage_parking?: boolean;
}

export interface Photo {
  name: string;
  width_px?: number;
  height_px?: number;
  author_attributions?: Array<{
    display_name: string;
    uri: string;
    photo_uri: string;
  }>;
}

export interface OpeningHours {
  open_now?: boolean;
  periods?: Array<{
    open: { day: number; hour: number; minute: number };
    close?: { day: number; hour: number; minute: number };
  }>;
  weekday_text?: string[];
}

export interface Clinic {
  place_id: string;
  display_name: string;
  formatted_address: string;
  location: Location;
  primary_type: string;
  types: string[];
  rating?: number;
  user_rating_count?: number;
  current_open_now?: boolean;
  phone?: string;
  international_phone_number?: string;
  website?: string;
  google_maps_uri: string;
  business_status: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';
  accessibility_options?: AccessibilityOptions;
  parking_options?: ParkingOptions;
  photos?: Photo[];
  opening_hours?: OpeningHours;
  price_level?: number;
  services?: string[];
  payment_options?: {
    accepts_credit_cards?: boolean;
    accepts_debit_cards?: boolean;
    accepts_cash_only?: boolean;
    accepts_nfc?: boolean;
  };
  last_fetched_at: string;
  
  // Added from Supabase migration
  state_code?: string;
  city?: string;
  postal_code?: string;
  created_at?: string;
  updated_at?: string;
}
  
export interface SearchParams {
  location?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  rating_min?: number;
  open_now?: boolean;
  wheelchair_accessible?: boolean;
  free_parking?: boolean;
}

export interface SearchResult {
  clinics: Clinic[];
  total: number;
  page: number;
  per_page: number;
}

export interface StateData {
  state_code: string;
  state_name: string;
  clinic_count: number;
  cities: string[];
}

export interface CityData {
  city_name: string;
  state_code: string;
  clinic_count: number;
  center_location: Location;
}

// Utility type for partial clinic updates
export type ClinicUpdate = Partial<Clinic> & { place_id: string };

// Filter options for the directory
export interface FilterOptions {
  states?: string[];
  cities?: string[];
  rating_min?: number;
  has_website?: boolean;
  has_phone?: boolean;
  wheelchair_accessible?: boolean;
  free_parking?: boolean;
  open_now?: boolean;
  sort_by?: 'rating' | 'reviews' | 'name' | 'distance';
  sort_order?: 'asc' | 'desc';
}
