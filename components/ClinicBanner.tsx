// components/ClinicBanner.tsx
'use client';

import { useEffect, useState } from 'react';
import { generateCustomBanner, getFaviconUrl } from '@/lib/customBannerGenerator';

interface ClinicBannerProps {
  clinicName: string;
  placeId: string;
  rating?: number;
  website?: string;
  className?: string;
}

type BannerStrategy = 'custom' | 'unsplash' | 'screenshot';

export default function ClinicBanner({ 
  clinicName, 
  placeId, 
  rating, 
  website,
  className = ''
}: ClinicBannerProps) {
  const [bannerUrl, setBannerUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [strategy, setStrategy] = useState<BannerStrategy>('custom');

  useEffect(() => {
    loadBanner();
  }, [clinicName, placeId]);

  const loadBanner = async () => {
    setIsLoading(true);

    // Strategy 1: Try custom SVG banner (instant, always works)
    if (strategy === 'custom') {
      const faviconUrl = getFaviconUrl(website);
      const customBanner = generateCustomBanner(clinicName, rating, faviconUrl, placeId);
      setBannerUrl(customBanner);
      setIsLoading(false);
      return;
    }

    // Strategy 2: Try Unsplash (requires API key)
    if (strategy === 'unsplash') {
      try {
        const unsplashUrl = await getUnsplashBanner(clinicName, placeId);
        setBannerUrl(unsplashUrl);
        setIsLoading(false);
        return;
      } catch (error) {
        console.error('Unsplash failed, falling back to custom:', error);
      }
    }

    // Strategy 3: Screenshot service (paid services like ScreenshotAPI, ApiFlash)
    // Only enable if you have an API key
    if (strategy === 'screenshot' && website && process.env.NEXT_PUBLIC_SCREENSHOT_API_KEY) {
      try {
        const screenshotUrl = await getWebsiteScreenshot(website);
        setBannerUrl(screenshotUrl);
        setIsLoading(false);
        return;
      } catch (error) {
        console.error('Screenshot failed, falling back to custom:', error);
      }
    }

    // Fallback: Custom banner
    const faviconUrl = getFaviconUrl(website);
    const customBanner = generateCustomBanner(clinicName, rating, faviconUrl, placeId);
    setBannerUrl(customBanner);
    setIsLoading(false);
  };

  const handleError = () => {
    // If image fails to load, regenerate with fallback
    const faviconUrl = getFaviconUrl(website);
    const fallbackBanner = generateCustomBanner(clinicName, rating, faviconUrl, placeId);
    setBannerUrl(fallbackBanner);
  };

  if (isLoading) {
    return (
      <div className={`${className} bg-gradient-to-r from-blue-400 to-blue-600 animate-pulse`}>
        <div className="h-full flex items-center justify-center">
          <div className="text-white text-lg font-medium">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <img
      src={bannerUrl}
      alt={`${clinicName} banner`}
      className={className}
      onError={handleError}
      loading="lazy"
    />
  );
}

/**
 * Get banner from Unsplash (requires API key)
 */
async function getUnsplashBanner(clinicName: string, placeId: string): Promise<string> {
  // Simple approach: Use Unsplash Source (no API key needed)
  const queries = ['medical clinic', 'healthcare', 'doctor office', 'modern clinic'];
  const queryIndex = placeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % queries.length;
  
  return `https://source.unsplash.com/1600x400/?${encodeURIComponent(queries[queryIndex])}`;
}

/**
 * Get website screenshot (requires paid API)
 * 
 * FREE OPTIONS:
 * 1. ScreenshotAPI.net - 100 free screenshots/month
 * 2. ApiFlash - 100 free screenshots/month
 * 3. ScreenshotLayer - 100 free screenshots/month
 * 
 * Example with ScreenshotAPI:
 */
async function getWebsiteScreenshot(websiteUrl: string): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_SCREENSHOT_API_KEY;
  if (!apiKey) {
    throw new Error('Screenshot API key not configured');
  }

  // ScreenshotAPI.net example
  const params = new URLSearchParams({
    token: apiKey,
    url: websiteUrl,
    width: '1600',
    height: '400',
    output: 'image',
    file_type: 'png',
    wait_for_event: 'load',
  });

  return `https://shot.screenshotapi.net/screenshot?${params.toString()}`;
}

/**
 * Alternative: Use a local screenshot service with Puppeteer
 * This would be implemented as a Next.js API route
 * 
 * Example API route: /api/screenshot
 */
async function getLocalScreenshot(websiteUrl: string): Promise<string> {
  try {
    const response = await fetch('/api/screenshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: websiteUrl }),
    });

    if (!response.ok) {
      throw new Error('Screenshot API failed');
    }

    const { imageUrl } = await response.json();
    return imageUrl;
  } catch (error) {
    console.error('Local screenshot failed:', error);
    throw error;
  }
}