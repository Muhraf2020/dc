'use client';

import { useState, useEffect } from 'react';
import SearchBar from '@/components/SearchBar';
import ClinicCard from '@/components/ClinicCard';
import MapView from '@/components/MapView';
import FilterPanel from '@/components/FilterPanel';
import { Clinic, FilterOptions } from '@/lib/dataTypes';

export default function Home() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [filteredClinics, setFilteredClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [filters, setFilters] = useState<FilterOptions>({});
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);

  useEffect(() => {
    loadClinics();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [clinics, filters]);

  const loadClinics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/clinics?per_page=1000');
      const data = await response.json();
      const loadedClinics = data.clinics || [];
      setClinics(loadedClinics);
      setFilteredClinics(loadedClinics); // Add this line
    } catch (error) {
      console.error('Error loading clinics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    // Client-side search through already loaded clinics
    if (!query || query.trim() === '') {
      // Show all clinics
      setFilteredClinics(clinics);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = clinics.filter(clinic => {
      const searchableText = `
        ${clinic.display_name} 
        ${clinic.formatted_address} 
        ${clinic.types?.join(' ')}
        ${clinic.primary_type}
      `.toLowerCase();
      
      return searchableText.includes(lowerQuery);
    });

    setFilteredClinics(filtered);
  };

  const applyFilters = () => {
    let filtered = [...clinics];

    // Rating filter
    if (filters.rating_min) {
      filtered = filtered.filter(c => {
        const rating = c.rating || 0;
        return rating >= filters.rating_min!;
      });
    }

    // Website filter
    if (filters.has_website) {
      filtered = filtered.filter(c => c.website && c.website.trim() !== '');
    }

    // Phone filter
    if (filters.has_phone) {
      filtered = filtered.filter(c => c.phone && c.phone.trim() !== '');
    }

    // Wheelchair accessible filter
    if (filters.wheelchair_accessible) {
      filtered = filtered.filter(c => 
        c.accessibility_options?.wheelchair_accessible_entrance === true
      );
    }

    // Free parking filter
    if (filters.free_parking) {
      filtered = filtered.filter(c => 
        c.parking_options?.free_parking_lot === true
      );
    }

    // Open now filter
    if (filters.open_now) {
      filtered = filtered.filter(c => {
        return c.current_open_now === true || 
               c.opening_hours?.open_now === true;
      });
    }

    // State filter
    if (filters.states && filters.states.length > 0) {
      filtered = filtered.filter(c => {
      return c.state_code && filters.states?.includes(c.state_code);
      });
   }
    // Sorting
    if (filters.sort_by) {
      filtered.sort((a, b) => {
        let aVal, bVal;
        
        switch (filters.sort_by) {
          case 'rating':
            aVal = a.rating || 0;
            bVal = b.rating || 0;
            break;
          case 'reviews':
            aVal = a.user_rating_count || 0;
            bVal = b.user_rating_count || 0;
            break;
          case 'name':
            aVal = (a.display_name || '').toLowerCase();
            bVal = (b.display_name || '').toLowerCase();
            break;
          default:
            return 0;
        }

        if (filters.sort_order === 'asc') {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
      });
    }

    setFilteredClinics(filtered);
  };

   

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-blue-600">
                Derm Clinics Near Me
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Find dermatology clinics across the USA
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-lg transition ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Grid View
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-4 py-2 rounded-lg transition ${
                  viewMode === 'map'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Map View
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-4">
            <SearchBar onSearch={handleSearch} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <aside className="w-64 flex-shrink-0 hidden lg:block">
            <FilterPanel filters={filters} onFilterChange={setFilters} />
          </aside>

          {/* Results */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {loading ? 'Loading...' : `${filteredClinics.length} clinics found`}
              </h2>
            </div>

            {/* Grid or Map View */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loading ? (
                  // Loading skeletons
                  Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-lg shadow-md p-6 animate-pulse"
                    >
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  ))
                ) : filteredClinics.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <p className="text-gray-500 text-lg">
                      No clinics found. Try adjusting your filters.
                    </p>
                  </div>
                ) : (
                  filteredClinics.map(clinic => (
                    <ClinicCard
                      key={clinic.place_id}
                      clinic={clinic}
                      onClick={() => setSelectedClinic(clinic)}
                    />
                  ))
                )}
              </div>
            ) : (
              <div className="h-[calc(100vh-300px)] rounded-lg overflow-hidden shadow-lg">
                <MapView
                  clinics={filteredClinics}
                  selectedClinic={selectedClinic}
                  onClinicSelect={setSelectedClinic}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">About</h3>
              <p className="text-gray-400 text-sm">
                Find the best dermatology clinics near you with verified
                information, ratings, and reviews.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">All Clinics</a></li>
                <li><a href="#" className="hover:text-white">By State</a></li>
                <li><a href="#" className="hover:text-white">Top Rated</a></li>
                <li><a href="#" className="hover:text-white">Open Now</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <p className="text-gray-400 text-sm">
                Have feedback or want to add your clinic?<br />
                <a href="mailto:contact@dermaclinicsnearme.com" className="text-blue-400 hover:text-blue-300">
                  Get in touch
                </a>
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            © {new Date().getFullYear()} Derm Clinics Near Me. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
