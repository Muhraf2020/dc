// app/api/photo/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name');
  const w = req.nextUrl.searchParams.get('w') ?? '400';
  const h = req.nextUrl.searchParams.get('h') ?? '300';

  if (!name) return new NextResponse('Missing "name"', { status: 400 });

  const upstream = `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${w}&maxHeightPx=${h}`;
  const res = await fetch(upstream, {
    headers: { 'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY ?? '' },
    // Vercel/Edge: no-cache at fetch level; we’ll cache on our response
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
