// components/FreeMapView.tsx
'use client';

import { useEffect, useRef } from 'react';
import { Clinic } from '@/lib/dataTypes';

interface FreeMapViewProps {
  clinics: Clinic[];
  selectedClinic: Clinic | null;
  onClinicSelect: (clinic: Clinic) => void;
}

declare global {
  interface Window {
    L: any;
  }
}

export default function FreeMapView({ clinics, selectedClinic, onClinicSelect }: FreeMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const markerLayerRef = useRef<any>(null);

  useEffect(() => {
    // Load Leaflet CSS and JS
    if (typeof window !== 'undefined' && !window.L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = '';
      script.onload = () => initializeMap();
      document.head.appendChild(script);
    } else if (window.L && !mapInstanceRef.current) {
      initializeMap();
    }

    return () => {
      // Cleanup map instance on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current) {
      updateMarkers();
    }
  }, [clinics]);

  useEffect(() => {
    if (selectedClinic && mapInstanceRef.current) {
      mapInstanceRef.current.setView(
        [selectedClinic.location.lat, selectedClinic.location.lng],
        14,
        { animate: true }
      );

      // Find and open popup for selected marker
      const marker = markersRef.current.find(
        (m) => m.clinicId === selectedClinic.place_id
      );
      if (marker) {
        marker.leafletMarker.openPopup();
      }
    }
  }, [selectedClinic]);

  const initializeMap = () => {
    if (!mapRef.current || !window.L || mapInstanceRef.current) return;

    // Default center (USA)
    const defaultCenter: [number, number] = [39.8283, -98.5795];
    const center: [number, number] =
      clinics.length > 0
        ? [clinics[0].location.lat, clinics[0].location.lng]
        : defaultCenter;

    // Initialize map
    mapInstanceRef.current = window.L.map(mapRef.current, {
      center,
      zoom: clinics.length > 0 ? 12 : 4,
      scrollWheelZoom: true,
    });

    // Add OpenStreetMap tile layer (free, no API key needed!)
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(mapInstanceRef.current);

    // Create marker layer group
    markerLayerRef.current = window.L.layerGroup().addTo(mapInstanceRef.current);

    updateMarkers();
  };

  const updateMarkers = () => {
    if (!mapInstanceRef.current || !window.L || !markerLayerRef.current) return;

    // Clear existing markers
    markerLayerRef.current.clearLayers();
    markersRef.current = [];

    if (clinics.length === 0) return;

    const bounds = window.L.latLngBounds([]);

    clinics.forEach((clinic) => {
      const position: [number, number] = [clinic.location.lat, clinic.location.lng];

      // Create custom icon
      const icon = window.L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            background: #2563eb;
            color: white;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            border: 3px solid white;
            cursor: pointer;
          ">
            🏥
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      });

      // Create marker
      const marker = window.L.marker(position, { icon }).addTo(markerLayerRef.current);

      // Create popup content
      const popupContent = `
        <div style="min-width: 200px; font-family: sans-serif;">
          <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: #1e40af;">
            ${clinic.display_name}
          </div>
          
          ${clinic.rating ? `
            <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 8px;">
              <span style="color: #fbbf24; font-size: 18px;">★</span>
              <span style="font-weight: 600;">${clinic.rating.toFixed(1)}</span>
              ${clinic.user_rating_count ? `<span style="color: #6b7280;">(${clinic.user_rating_count})</span>` : ''}
            </div>
          ` : ''}

          <div style="color: #4b5563; font-size: 14px; margin-bottom: 8px;">
            📍 ${clinic.formatted_address}
          </div>

          ${clinic.phone ? `
            <div style="margin-bottom: 8px;">
              <a href="tel:${clinic.phone}" style="color: #2563eb; text-decoration: none; font-size: 14px;">
                📞 ${clinic.phone}
              </a>
            </div>
          ` : ''}

          ${clinic.current_open_now !== undefined ? `
            <div style="
              display: inline-block;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 600;
              margin-bottom: 12px;
              ${clinic.current_open_now 
                ? 'background: #dcfce7; color: #166534;' 
                : 'background: #fee2e2; color: #991b1b;'}
            ">
              ${clinic.current_open_now ? '● Open Now' : '● Closed'}
            </div>
          ` : ''}

          <div style="display: flex; gap: 8px; margin-top: 12px;">
            <a 
              href="/clinics/${clinic.place_id}" 
              style="
                flex: 1;
                text-align: center;
                padding: 8px;
                background: #dbeafe;
                color: #1e40af;
                border-radius: 6px;
                text-decoration: none;
                font-size: 13px;
                font-weight: 600;
              "
            >
              View Details
            </a>
            ${clinic.website ? `
              <a 
                href="${clinic.website}" 
                target="_blank" 
                rel="noopener noreferrer"
                style="
                  flex: 1;
                  text-align: center;
                  padding: 8px;
                  background: #e9d5ff;
                  color: #6b21a8;
                  border-radius: 6px;
                  text-decoration: none;
                  font-size: 13px;
                  font-weight: 600;
                "
              >
                🌐 Website
              </a>
            ` : ''}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'custom-popup',
      });

      // Handle click
      marker.on('click', () => {
        onClinicSelect(clinic);
      });

      // Store reference
      markersRef.current.push({
        clinicId: clinic.place_id,
        leafletMarker: marker,
      });

      bounds.extend(position);
    });

    // Fit map to show all markers
    if (clinics.length > 1) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    } else if (clinics.length === 1) {
      mapInstanceRef.current.setView(
        [clinics[0].location.lat, clinics[0].location.lng],
        12
      );
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      {clinics.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 pointer-events-none">
          <div className="text-center">
            <p className="text-gray-600 text-lg">No clinics to display on map</p>
            <p className="text-gray-500 text-sm mt-2">Try adjusting your search or filters</p>
          </div>
        </div>
      )}

      {/* Map attribution */}
      <style jsx>{`
        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .custom-popup .leaflet-popup-content {
          margin: 16px;
        }
      `}</style>
    </div>
  );
}