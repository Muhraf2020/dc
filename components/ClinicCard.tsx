'use client';

import { Clinic } from '@/lib/dataTypes';
import { getPhotoUrl } from '@/lib/googlePlaces';
import Link from 'next/link';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';

interface ClinicCardProps {
  clinic: Clinic & { distance?: number };
  onClick?: () => void;
}

// Stable hash for picking a local fallback image (1..10)
function hashCode(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // keep 32-bit
  }
  return hash;
}
function localFallback(placeId?: string) {
  // Single stable Unsplash image for all fallbacks
  return 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=300&fit=crop&q=80';
}

export default function ClinicCard({ clinic, onClick }: ClinicCardProps) {
  // Prefer remote photo if available; otherwise deterministic local fallback
  const initialPhoto = clinic.photos?.[0]?.name
    ? getPhotoUrl(clinic.photos[0].name, 400, 300)
    : localFallback(clinic.place_id);

  // Sticky img src: if remote fails once, switch to local and stay there
  const [imgSrc, setImgSrc] = useState(initialPhoto);

  useEffect(() => {
    const next = clinic.photos?.[0]?.name
      ? getPhotoUrl(clinic.photos[0].name, 400, 300)
      : localFallback(clinic.place_id);
    setImgSrc(next);
  }, [clinic]);

  const getStatusBadge = () => {
    if (clinic.business_status === 'CLOSED_PERMANENTLY') {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded">
          Closed Permanently
        </span>
      );
    }
    if (clinic.business_status === 'CLOSED_TEMPORARILY') {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded">
          Temporarily Closed
        </span>
      );
    }
    if (clinic.current_open_now) {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded">
          Open Now
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded">
        Closed
      </span>
    );
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer overflow-hidden group"
    >
      <div className="relative h-48 overflow-hidden bg-gray-200">
        <Image
          src={imgSrc}
          alt={typeof clinic.display_name === 'string' ? clinic.display_name : 'Dermatology Clinic'}
          fill
          sizes="(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw"
          className="object-cover transform-gpu group-hover:scale-105 transition-transform duration-300"
          onError={() => setImgSrc(localFallback(clinic.place_id))}
          loading="lazy"
          fetchPriority="low"
          draggable={false}
        />
        <div className="absolute top-3 right-3">{getStatusBadge()}</div>
      </div>

      <div className="p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
          {clinic.display_name}
        </h3>

        {typeof clinic.rating === 'number' && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center">
              <span className="text-yellow-400 text-lg">★</span>
              <span className="ml-1 font-semibold text-gray-900">
                {clinic.rating.toFixed(1)}
              </span>
            </div>
            {typeof clinic.user_rating_count === 'number' && (
              <span className="text-sm text-gray-500">({clinic.user_rating_count} reviews)</span>
            )}
          </div>
        )}

        <div className="flex items-start gap-2 mb-3">
          <svg
            className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <p className="text-sm text-gray-600 line-clamp-2">{clinic.formatted_address}</p>
        </div>
{clinic.distance !== undefined && (
  <div className="text-sm text-green-600 font-medium mb-2">
    📍 {clinic.distance.toFixed(1)} miles away
  </div>
)}

        <div className="flex flex-wrap gap-2 mb-4">
          {clinic.accessibility_options?.wheelchair_accessible_entrance && (
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded">
              ♿ Accessible
            </span>
          )}
          {clinic.parking_options?.free_parking_lot && (
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded">
              🅿️ Free Parking
            </span>
          )}
          {clinic.website && (
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded">
              🌐 Website
            </span>
          )}
        </div>

        <div className="flex gap-2 pt-3 border-t border-gray-100">
          {clinic.phone && (
            <a
              href={`tel:${clinic.phone}`}
              className="flex-1 text-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
              onClick={(e) => e.stopPropagation()}
              aria-label="Call clinic"
            >
              📞 Call
            </a>
          )}

          <a
            href={clinic.google_maps_uri}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center px-3 py-2 text-sm font-medium text-green-600 bg-green-50 rounded hover:bg-green-100 transition-colors"
            onClick={(e) => e.stopPropagation()}
            aria-label="Get directions"
          >
            📍 Directions
          </a>

          {clinic.website && (
            <a
              href={clinic.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center px-3 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded hover:bg-purple-100 transition-colors"
              onClick={(e) => e.stopPropagation()}
              aria-label="Open website"
            >
              🌐 Website
            </a>
          )}
        </div>

        <Link
          href={`/clinics/${clinic.place_id}`}
          className="block mt-3 text-center text-sm font-medium text-blue-600 hover:text-blue-700"
          onClick={(e) => e.stopPropagation()}
        >
          View Full Details →
        </Link>
      </div>
    </div>
  );
}
