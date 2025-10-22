'use client';

import { useState } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onLocationSearch: (lat: number, lng: number) => void;
}

export default function SearchBar({ onSearch, onLocationSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isUsingLocation, setIsUsingLocation] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleQuickFilter = (filterQuery: string) => {
    setQuery(filterQuery);
    onSearch(filterQuery);
  };

  const getUserLocation = () => {
    setIsUsingLocation(true);
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          onLocationSearch(latitude, longitude);
          setIsUsingLocation(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your location. Please check your browser permissions.');
          setIsUsingLocation(false);
        }
      );
    } else {
      alert('Geolocation is not supported by your browser');
      setIsUsingLocation(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col gap-3">
        {/* Search Input */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, location, ZIP code, or treatment..."
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Location Button */}
        <button
          type="button"
          onClick={getUserLocation}
          disabled={isUsingLocation}
          className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-300 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
        >
          {isUsingLocation ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Finding...</span>
            </>
          ) : (
            <>
              <span>📍</span>
              <span>Near Me</span>
            </>
          )}
        </button>

        {/* Search Button */}
        <button
          type="submit"
          className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-colors"
        >
          Search
        </button>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2 mt-3">
        <button
          type="button"
          onClick={() => handleQuickFilter('')}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
        >
          All Clinics
        </button>
        <button
          type="button"
          onClick={() => handleQuickFilter('acne')}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
        >
          Acne Treatment
        </button>
        <button
          type="button"
          onClick={() => handleQuickFilter('cosmetic')}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
        >
          Cosmetic
        </button>
        <button
          type="button"
          onClick={() => handleQuickFilter('pediatric')}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
        >
          Pediatric
        </button>
        <button
          type="button"
          onClick={() => handleQuickFilter('skin cancer')}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
        >
          Skin Cancer
        </button>
      </div>
    </form>
  );
}
