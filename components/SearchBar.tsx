'use client';

import { useState } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleQuickFilter = (filterQuery: string) => {
    setQuery(filterQuery);
    onSearch(filterQuery);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col sm:flex-row gap-3">
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
            placeholder="Search clinics, treatments, doctors..."
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
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
