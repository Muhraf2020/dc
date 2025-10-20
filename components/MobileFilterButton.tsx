// components/MobileFilterButton.tsx
'use client';

import { useState } from 'react';
import FilterPanel from './FilterPanel';
import { FilterOptions } from '@/lib/dataTypes';

interface MobileFilterButtonProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  resultCount: number;
}

export default function MobileFilterButton({ 
  filters, 
  onFilterChange, 
  resultCount 
}: MobileFilterButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeFilterCount = Object.keys(filters).filter(key => {
    const value = filters[key as keyof FilterOptions];
    return value !== undefined && value !== null && 
           (Array.isArray(value) ? value.length > 0 : true);
  }).length;

  return (
    <>
      {/* Mobile Filter Button - Only visible on small screens */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-40 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
      >
        <svg 
          className="w-5 h-5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" 
          />
        </svg>
        <span className="font-medium">Filters</span>
        {activeFilterCount > 0 && (
          <span className="bg-white text-blue-600 text-xs font-bold px-2 py-0.5 rounded-full">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Mobile Filter Modal */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Slide-in Panel */}
          <div className="absolute inset-y-0 right-0 max-w-full flex">
            <div className="w-screen max-w-md">
              <div className="h-full flex flex-col bg-white shadow-xl">
                {/* Header */}
                <div className="px-6 py-4 bg-blue-600 text-white">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Filters</h2>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-2 hover:bg-blue-700 rounded-full transition"
                    >
                      <svg 
                        className="w-6 h-6" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M6 18L18 6M6 6l12 12" 
                        />
                      </svg>
                    </button>
                  </div>
                  <p className="text-blue-100 text-sm mt-1">
                    {resultCount} clinics found
                  </p>
                </div>

                {/* Filter Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <FilterPanel 
                    filters={filters} 
                    onFilterChange={onFilterChange} 
                  />
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
                  >
                    Show {resultCount} Results
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}