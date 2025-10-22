'use client';

import { useState, useEffect } from 'react';
import SearchBar from '@/components/SearchBar';
import ClinicCard from '@/components/ClinicCard';
// ✅ CHANGE 1: Replace MapView with FreeMapView
import FreeMapView from '@/components/FreeMapView';  // ← Changed from MapView
import FilterPanel from '@/components/FilterPanel';
import MobileFilterButton from '@/components/MobileFilterButton';
import { Clinic, FilterOptions } from '@/lib/dataTypes';
import { calculateDistance } from '@/lib/utils';

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
      setFilteredClinics(loadedClinics);
    } catch (error) {
      console.error('Error loading clinics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    if (!query || query.trim() === '') {
      setFilteredClinics(clinics);
      return;
    }

    const trimmedQuery = query.trim();
    const lowerQuery = trimmedQuery.toLowerCase();
    const isZipCode = /^\d{5}$/.test(trimmedQuery);
    
    const filtered = clinics.filter(clinic => {
      if (isZipCode) {
        return clinic.postal_code === trimmedQuery;
      }
      
      const searchableText = `
        ${clinic.display_name || ''} 
        ${clinic.formatted_address || ''} 
        ${clinic.city || ''}
        ${clinic.state_code || ''}
        ${clinic.types?.join(' ') || ''}
        ${clinic.primary_type || ''}
      `.toLowerCase();
      
      return searchableText.includes(lowerQuery);
    });

    setFilteredClinics(filtered);
  };

  const handleLocationSearch = (lat: number, lng: number) => {
    const clinicsWithDistance = clinics.map(clinic => ({
      ...clinic,
      distance: calculateDistance(
        { lat, lng },
        { lat: clinic.location.lat, lng: clinic.location.lng }
      )
    }));

    const sorted = clinicsWithDistance.sort((a, b) => a.distance - b.distance);
    setFilteredClinics(sorted);
    console.log(`Found ${sorted.length} clinics sorted by distance from your location`);
  };

  const applyFilters = () => {
    let filtered = [...clinics];

    if (filters.rating_min) {
      filtered = filtered.filter(c => {
        const rating = c.rating || 0;
        return rating >= filters.rating_min!;
      });
    }

    if (filters.has_website) {
      filtered = filtered.filter(c => c.website && c.website.trim() !== '');
    }

    if (filters.has_phone) {
      filtered = filtered.filter(c => c.phone && c.phone.trim() !== '');
    }

    if (filters.wheelchair_accessible) {
      filtered = filtered.filter(c => 
        c.accessibility_options?.wheelchair_accessible_entrance === true
      );
    }

    if (filters.free_parking) {
      filtered = filtered.filter(c => 
        c.parking_options?.free_parking_lot === true
      );
    }

    if (filters.open_now) {
      filtered = filtered.filter(c => {
        return c.current_open_now === true || 
               c.opening_hours?.open_now === true;
      });
    }

    if (filters.states && filters.states.length > 0) {
      filtered = filtered.filter(c => {
        return c.state_code && filters.states?.includes(c.state_code);
      });
    }

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
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Derm Clinics Near Me
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Find dermatology clinics across the USA
            </p>
          </div>
    
          {/* View Toggle */}
          <div className="flex gap-2 w-full sm:w-auto">
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
        <div className="mt-4 w-full">
          <SearchBar
            onSearch={handleSearch}
            onLocationSearch={handleLocationSearch}
          />
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
          {/* Mobile Filter Button */}
          <MobileFilterButton
            filters={filters}
            onFilterChange={setFilters}
            resultCount={filteredClinics.length}
          />

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
              <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-4 sm:gap-6">
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
              // ✅ CHANGE 2: Replace MapView with FreeMapView here
              <div className="h-[500px] sm:h-[600px] lg:h-[calc(100vh-300px)] rounded-lg overflow-hidden shadow-lg">
                <FreeMapView
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
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Connect</h3>
              <p className="text-gray-400 text-sm">
                © 2025 Derm Clinics Near Me. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
