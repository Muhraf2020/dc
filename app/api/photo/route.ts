// app/api/photo/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Belt-and-suspenders: refuse proxying unless explicitly enabled
  if (process.env.NEXT_PUBLIC_USE_PLACES_PHOTOS !== 'true') {
    return new NextResponse('Places photos disabled', { status: 403 });
  }

  const name = req.nextUrl.searchParams.get('name');
  const w = req.nextUrl.searchParams.get('w') ?? '400';
  const h = req.nextUrl.searchParams.get('h') ?? '300';

  if (!name) return new NextResponse('Missing "name"', { status: 400 });

  // Optional sanity check: only allow the expected Places photo resource path
  // Example name: "places/XYZ/photos/abc"
  if (!/^places\/.+\/photos\/.+$/i.test(name)) {
    return new NextResponse('Invalid "name" format', { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY ?? '';
  if (!apiKey) {
    return new NextResponse('Server misconfig: missing GOOGLE_PLACES_API_KEY', { status: 500 });
  }

  const upstream = `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${encodeURIComponent(
    w
  )}&maxHeightPx=${encodeURIComponent(h)}`;

  const res = await fetch(upstream, {
    headers: { 'X-Goog-Api-Key': apiKey },
    // Vercel/Edge: no-cache at fetch level; we'll cache on our response
    cache: 'no-store',
  });

  if (!res.ok || !res.body) {
    return new NextResponse('Upstream error', { status: res.status || 502 });
  }

  // Stream the image through and let browsers cache it.
  return new NextResponse(res.body, {
    headers: {
      'Content-Type': res.headers.get('Content-Type') ?? 'image/jpeg',
      // Cache for a day, allow stale while we revalidate for a week
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}