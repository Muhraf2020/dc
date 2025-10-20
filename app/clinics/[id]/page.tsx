'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Clinic } from '@/lib/dataTypes';
import { getPhotoUrl } from '@/lib/googlePlaces';
import Link from 'next/link';

export default function ClinicDetailPage() {
  const params = useParams();
  const clinicId = params.id as string;
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClinicDetails();
  }, [clinicId]);

  const loadClinicDetails = async () => {
    try {
      setLoading(true);
      // In a real app, you'd fetch from your API or Google Places API
      const response = await fetch(`/api/clinics`);
      const data = await response.json();
      const foundClinic = data.clinics?.find((c: Clinic) => c.place_id === clinicId);
      setClinic(foundClinic || null);
    } catch (error) {
      console.error('Error loading clinic details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading clinic details...</p>
        </div>
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Clinic Not Found</h2>
          <p className="text-gray-600 mb-6">The clinic you're looking for doesn't exist.</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Directory
          </Link>
        </div>
      </div>
    );
  }

  const photos = clinic.photos?.slice(0, 4) || [];
  const hasPhotos = photos.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Directory
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Photos Grid */}
        {hasPhotos && (
          <div className="grid grid-cols-2 gap-4 mb-8 rounded-lg overflow-hidden">
            {photos.map((photo, index) => (
              <img
                key={index}
                src={getPhotoUrl(photo.name, 600, 400)}
                alt={`${clinic.display_name} photo ${index + 1}`}
                className={`w-full object-cover ${
                  index === 0 ? 'col-span-2 h-96' : 'h-64'
                }`}
                onError={(e) => {
                  e.currentTarget.src = '/placeholder-clinic.jpg';
                }}
              />
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title and Status */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {clinic.display_name}
                  </h1>
                  <p className="text-gray-600">{clinic.primary_type.replace(/_/g, ' ')}</p>
                </div>

                {clinic.current_open_now !== undefined && (
                  <span
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      clinic.current_open_now
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {clinic.current_open_now ? '● Open Now' : '● Closed'}
                  </span>
                )}
              </div>

              {/* Rating */}
              {clinic.rating && (
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl text-yellow-400">★</span>
                    <span className="text-2xl font-bold text-gray-900">
                      {clinic.rating.toFixed(1)}
                    </span>
                  </div>
                  {clinic.user_rating_count && (
                    <span className="text-gray-600">
                      Based on {clinic.user_rating_count} reviews
                    </span>
                  )}
                </div>
              )}

              {/* Business Status */}
              {clinic.business_status !== 'OPERATIONAL' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-yellow-800 font-medium">
                    {clinic.business_status === 'CLOSED_TEMPORARILY'
                      ? '⚠️ This clinic is temporarily closed'
                      : '❌ This clinic is permanently closed'}
                  </p>
                </div>
              )}
            </div>

            {/* Opening Hours */}
            {clinic.opening_hours?.weekday_text && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Opening Hours</h2>
                <div className="space-y-2">
                  {clinic.opening_hours.weekday_text.map((text, index) => (
                    <p key={index} className="text-gray-700">
                      {text}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Features */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Features & Amenities</h2>
              <div className="grid grid-cols-2 gap-4">
                {clinic.accessibility_options?.wheelchair_accessible_entrance && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">♿</span>
                    <span className="text-gray-700">Wheelchair Accessible Entrance</span>
                  </div>
                )}
                {clinic.parking_options?.free_parking_lot && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🅿️</span>
                    <span className="text-gray-700">Free Parking</span>
                  </div>
                )}
                {clinic.parking_options?.paid_parking_lot && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🅿️</span>
                    <span className="text-gray-700">Paid Parking</span>
                  </div>
                )}
                {clinic.payment_options?.accepts_credit_cards && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">💳</span>
                    <span className="text-gray-700">Accepts Credit Cards</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h2>

              {/* Address */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Address</h3>
                <p className="text-gray-900">{clinic.formatted_address}</p>
              </div>

              {/* Phone */}
              {clinic.phone && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Phone</h3>
                  <a
                    href={`tel:${clinic.phone}`}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {clinic.phone}
                  </a>
                </div>
              )}

              {/* Website */}
              {clinic.website && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Website</h3>
                  <a
                    href={clinic.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 font-medium break-all"
                  >
                    Visit Website →
                  </a>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                {clinic.phone && (
                  <a
                    href={`tel:${clinic.phone}`}
                    className="block w-full text-center px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    📞 Call Now
                  </a>
                )}

                <a
                  href={clinic.google_maps_uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  📍 Get Directions
                </a>

                {clinic.website && (
                  <a
                    href={clinic.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center px-4 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    🌐 Visit Website
                  </a>
                )}
              </div>
            </div>

            {/* Map Preview */}
            {process.env.NEXT_PUBLIC_ENABLE_MAP === 'true' ? (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Location</h2>
                <div className="aspect-square rounded-lg overflow-hidden">
                  <iframe
                    title="Clinic location"
                    src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=place_id:${clinic.place_id}`}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
              </div>
            ) : (
              // Free fallback when maps are disabled
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Location</h2>
                <p className="text-gray-600 mb-3">Map disabled in this environment.</p>
                {clinic.google_maps_uri && (
                  <a
                    href={clinic.google_maps_uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100"
                  >
                    Open in Google Maps ↗
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
