'use client';

import { FilterOptions } from '@/lib/dataTypes';
import { useState } from 'react';

interface FilterPanelProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export default function FilterPanel({ filters, onFilterChange }: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState({
    rating: true,
    features: true,
    states: false,
    sort: true,
  });

  const updateFilter = (key: keyof FilterOptions, value: any) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const toggleState = (state: string) => {
    const currentStates = filters.states || [];
    const newStates = currentStates.includes(state)
      ? currentStates.filter(s => s !== state)
      : [...currentStates, state];
    updateFilter('states', newStates.length > 0 ? newStates : undefined);
  };

  const clearFilters = () => {
    onFilterChange({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-5 sticky top-24">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Rating Filter */}
      <div className="mb-6">
        <button
          onClick={() => setIsExpanded(prev => ({ ...prev, rating: !prev.rating }))}
          className="flex items-center justify-between w-full mb-3"
        >
          <span className="font-medium text-gray-900">Minimum Rating</span>
          <svg
            className={`w-5 h-5 transition-transform ${isExpanded.rating ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isExpanded.rating && (
          <div className="space-y-2">
            {[4.5, 4.0, 3.5, 3.0].map(rating => (
              <label key={rating} className="flex items-center cursor-pointer group">
                <input
                  type="radio"
                  name="rating"
                  checked={filters.rating_min === rating}
                  onChange={() => updateFilter('rating_min', rating)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 group-hover:text-gray-900">
                  <span className="text-yellow-400">★</span> {rating}+ stars
                </span>
              </label>
            ))}
            <label className="flex items-center cursor-pointer group">
              <input
                type="radio"
                name="rating"
                checked={!filters.rating_min}
                onChange={() => updateFilter('rating_min', undefined)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 group-hover:text-gray-900">
                All ratings
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Features Filter */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <button
          onClick={() => setIsExpanded(prev => ({ ...prev, features: !prev.features }))}
          className="flex items-center justify-between w-full mb-3"
        >
          <span className="font-medium text-gray-900">Features</span>
          <svg
            className={`w-5 h-5 transition-transform ${isExpanded.features ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isExpanded.features && (
          <div className="space-y-2">
            <label className="flex items-center cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.open_now || false}
                onChange={(e) => updateFilter('open_now', e.target.checked || undefined)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 group-hover:text-gray-900">
                Open now
              </span>
            </label>
            
            <label className="flex items-center cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.wheelchair_accessible || false}
                onChange={(e) => updateFilter('wheelchair_accessible', e.target.checked || undefined)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 group-hover:text-gray-900">
                Wheelchair accessible
              </span>
            </label>
            
            <label className="flex items-center cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.free_parking || false}
                onChange={(e) => updateFilter('free_parking', e.target.checked || undefined)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 group-hover:text-gray-900">
                Free parking
              </span>
            </label>
            
            <label className="flex items-center cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.has_website || false}
                onChange={(e) => updateFilter('has_website', e.target.checked || undefined)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 group-hover:text-gray-900">
                Has website
              </span>
            </label>
            
            <label className="flex items-center cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.has_phone || false}
                onChange={(e) => updateFilter('has_phone', e.target.checked || undefined)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 group-hover:text-gray-900">
                Has phone number
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Sort By */}
      <div className="mb-6">
        <button
          onClick={() => setIsExpanded(prev => ({ ...prev, sort: !prev.sort }))}
          className="flex items-center justify-between w-full mb-3"
        >
          <span className="font-medium text-gray-900">Sort By</span>
          <svg
            className={`w-5 h-5 transition-transform ${isExpanded.sort ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isExpanded.sort && (
          <div className="space-y-2">
            <select
              value={filters.sort_by || ''}
              onChange={(e) => updateFilter('sort_by', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Default</option>
              <option value="rating">Rating</option>
              <option value="reviews">Number of Reviews</option>
              <option value="name">Name</option>
            </select>
            
            {filters.sort_by && (
              <select
                value={filters.sort_order || 'desc'}
                onChange={(e) => updateFilter('sort_order', e.target.value as 'asc' | 'desc')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="desc">Highest first</option>
                <option value="asc">Lowest first</option>
              </select>
            )}
          </div>
        )}
      </div>

      {/* States Filter */}
      <div className="mb-6">
        <button
          onClick={() => setIsExpanded(prev => ({ ...prev, states: !prev.states }))}
          className="flex items-center justify-between w-full mb-3"
        >
          <span className="font-medium text-gray-900">States</span>
          <svg
            className={`w-5 h-5 transition-transform ${isExpanded.states ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isExpanded.states && (
          <div className="max-h-60 overflow-y-auto space-y-1">
            {US_STATES.map(state => (
              <label key={state} className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  checked={(filters.states || []).includes(state)}
                  onChange={() => toggleState(state)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 group-hover:text-gray-900">
                  {state}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
