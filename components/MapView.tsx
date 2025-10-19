'use client';

import { useEffect, useRef, useState } from 'react';
import { Clinic } from '@/lib/dataTypes';

interface MapViewProps {
  clinics: Clinic[];
  selectedClinic: Clinic | null;
  onClinicSelect: (clinic: Clinic) => void;
}

export default function MapView({ clinics, selectedClinic, onClinicSelect }: MapViewProps) {
  // 🔒 Guard: do not render or load Google Maps unless explicitly enabled
  if (process.env.NEXT_PUBLIC_ENABLE_MAP !== 'true') {
    return (
      <div className="h-64 flex items-center justify-center border rounded">
        Map disabled in dev
      </div>
    );
  }

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load Google Maps script
    if (typeof window !== 'undefined' && !window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.onload = () => {
        setIsLoading(false);
        initializeMap();
      };
      document.head.appendChild(script);
    } else if (window.google) {
      setIsLoading(false);
      initializeMap();
    }
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current && !isLoading) {
      updateMarkers();
    }
  }, [clinics, isLoading]);

  useEffect(() => {
    if (selectedClinic && mapInstanceRef.current) {
      // Center map on selected clinic
      mapInstanceRef.current.panTo({
        lat: selectedClinic.location.lat,
        lng: selectedClinic.location.lng,
      });
      mapInstanceRef.current.setZoom(15);

      // Find and show info window for selected clinic
      const marker = markersRef.current.find(
        (m) => (m as any).clinicId === selectedClinic.place_id
      );
      if (marker) {
        showInfoWindow(marker, selectedClinic);
      }
    }
  }, [selectedClinic]);

  const initializeMap = () => {
    if (!mapRef.current || !window.google) return;

    // Default center (USA)
    const defaultCenter = { lat: 39.8283, lng: -98.5795 };
    const center =
      clinics.length > 0
        ? { lat: clinics[0].location.lat, lng: clinics[0].location.lng }
        : defaultCenter;

    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center,
      zoom: clinics.length > 0 ? 12 : 4,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }],
        },
      ],
    });

    infoWindowRef.current = new google.maps.InfoWindow();
    updateMarkers();
  };

  const updateMarkers = () => {
    if (!mapInstanceRef.current || !window.google) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    if (clinics.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    // Create markers for each clinic
    clinics.forEach((clinic) => {
      const marker = new google.maps.Marker({
        position: { lat: clinic.location.lat, lng: clinic.location.lng },
        map: mapInstanceRef.current,
        title: clinic.display_name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: clinic.current_open_now ? '#10b981' : '#6b7280',
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      (marker as any).clinicId = clinic.place_id;

      marker.addListener('click', () => {
        onClinicSelect(clinic);
        showInfoWindow(marker, clinic);
      });

      markersRef.current.push(marker);
      bounds.extend(marker.getPosition()!);
    });

    // Fit map to show all markers
    if (clinics.length > 1) {
      mapInstanceRef.current.fitBounds(bounds);
    }
  };

  const showInfoWindow = (marker: google.maps.Marker, clinic: Clinic) => {
    if (!infoWindowRef.current) return;

    const content = `
      <div style="padding: 12px; max-width: 300px;">
        <h3 style="font-weight: 600; font-size: 16px; margin-bottom: 8px; color: #1f2937;">
          ${clinic.display_name}
        </h3>

        ${
          clinic.rating
            ? `
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="color: #fbbf24; font-size: 14px;">★</span>
            <span style="font-weight: 600; color: #1f2937;">${clinic.rating.toFixed(1)}</span>
            ${
              clinic.user_rating_count
                ? `
              <span style="color: #6b7280; font-size: 13px;">(${clinic.user_rating_count} reviews)</span>
            `
                : ''
            }
          </div>
        `
            : ''
        }

        <p style="color: #4b5563; font-size: 13px; margin-bottom: 8px; line-height: 1.4;">
          ${clinic.formatted_address}
        </p>

        ${
          clinic.current_open_now !== undefined
            ? `
          <div style="margin-bottom: 12px;">
            <span style="display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; ${
              clinic.current_open_now
                ? 'background-color: #d1fae5; color: #065f46;'
                : 'background-color: #fee2e2; color: #991b1b;'
            }">
              ${clinic.current_open_now ? '● Open Now' : '● Closed'}
            </span>
          </div>
        `
            : ''
        }

        <div style="display: flex; gap: 8px; margin-top: 12px;">
          ${
            clinic.phone
              ? `
            <a href="tel:${clinic.phone}" style="flex: 1; text-align: center; padding: 8px; background-color: #dbeafe; color: #1e40af; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 500;">
              📞 Call
            </a>
          `
              : ''
          }

          <a href="${clinic.google_maps_uri}" target="_blank" rel="noopener noreferrer" style="flex: 1; text-align: center; padding: 8px; background-color: #d1fae5; color: #065f46; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 500;">
            📍 Directions
          </a>

          ${
            clinic.website
              ? `
            <a href="${clinic.website}" target="_blank" rel="noopener noreferrer" style="flex: 1; text-align: center; padding: 8px; background-color: #e9d5ff; color: #6b21a8; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 500;">
              🌐 Website
            </a>
          `
              : ''
          }
        </div>
      </div>
    `;

    infoWindowRef.current.setContent(content);
    infoWindowRef.current.open(mapInstanceRef.current, marker);
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      {clinics.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90">
          <div className="text-center">
            <p className="text-gray-600 text-lg">No clinics to display on map</p>
            <p className="text-gray-500 text-sm mt-2">Try adjusting your search or filters</p>
          </div>
        </div>
      )}
    </div>
  );
}
