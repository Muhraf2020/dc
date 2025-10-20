'use client';

import { useState, useRef } from 'react';

interface SearchBarProps {
  onSearch: (query: string, location?: string) => void;
}

// Optional UI toggle; button still costs nothing even if enabled.
const GEOCODING_ENABLED = process.env.NEXT_PUBLIC_ENABLE_GEOCODING === 'true';

// Helper: wrap coords into a string your parent can parse without changing props.
const encodeCoords = (lat: number, lng: number) => `@coords:${lat.toFixed(6)},${lng.toFixed(6)}`;

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [isUsingLocation, setIsUsingLocation] = useState(false);

  // Remember the last coords so subsequent “Search” clicks can still include them.
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  const withCoordsIfNearMe = (loc: string) => {
    if (
      lastCoordsRef.current &&
      loc.trim().toLowerCase() === 'near me'
    ) {
      const { lat, lng } = lastCoordsRef.current;
      return encodeCoords(lat, lng);
    }
    return loc;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query, withCoordsIfNearMe(location));
  };

  // FREE “Use my location”: browser geolocation only. No fetches. No Google APIs.
  const getUserLocation = async () => {
    if (!GEOCODING_ENABLED) {
      alert('Location services are currently disabled.');
      return;
    }
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsUsingLocation(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        }),
      );
      const { latitude: lat, longitude: lng } = pos.coords;

      // Store coords, show a friendly label, and pass coords (encoded) to parent.
      lastCoordsRef.current = { lat, lng };
      setLocation('Near me');
      onSearch(query, encodeCoords(lat, lng));
    } catch (err) {
      console.error('Geolocation error:', err);
      alert('Could not get your location. Please enter it manually.');
    } finally {
      setIsUsingLocation(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clinics, treatments, doctors..."
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Location Input + Near Me */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, State or ZIP"
            className="block w-full pl-10 pr-24 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={getUserLocation}
            disabled={!GEOCODING_ENABLED || isUsingLocation}
            aria-disabled={!GEOCODING_ENABLED || isUsingLocation}
            className={`absolute inset-y-0 right-0 px-3 flex items-center text-sm font-medium transition
              ${GEOCODING_ENABLED ? 'text-blue-600 hover:text-blue-700' : 'text-gray-400 cursor-not-allowed'}
            `}
            title={GEOCODING_ENABLED ? 'Uses your browser only — no paid APIs' : 'Location services are disabled'}
          >
            {isUsingLocation ? (
              <span className="flex items-center gap-1">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </span>
            ) : (
              '📍 Use my location'
            )}
          </button>
        </div>

        {/* Search Button */}
        <button
          type="submit"
          className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-colors"
        >
          Search
        </button>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2 mt-3">
        <button
          type="button"
          onClick={() => onSearch('', withCoordsIfNearMe(location))}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
        >
          All Clinics
        </button>
        <button
          type="button"
          onClick={() => { setQuery('acne treatment'); onSearch('acne treatment', withCoordsIfNearMe(location)); }}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
        >
          Acne Treatment
        </button>
        <button
          type="button"
          onClick={() => { setQuery('cosmetic dermatology'); onSearch('cosmetic dermatology', withCoordsIfNearMe(location)); }}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
        >
          Cosmetic
        </button>
        <button
          type="button"
          onClick={() => { setQuery('pediatric dermatology'); onSearch('pediatric dermatology', withCoordsIfNearMe(location)); }}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
        >
          Pediatric
        </button>
        <button
          type="button"
          onClick={() => { setQuery('skin cancer screening'); onSearch('skin cancer screening', withCoordsIfNearMe(location)); }}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
        >
          Skin Cancer
        </button>
      </div>
    </form>
  );
}
