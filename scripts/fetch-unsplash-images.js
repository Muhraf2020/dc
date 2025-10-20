/* scripts/fetch-unsplash-images.js
 * Downloads N Unsplash photos into public/clinic-images as clinic-1.jpg … clinic-N.jpg
 * - Registers downloads via links.download_location (API compliance)
 * - Retries flaky requests
 * - Skips existing files
 * - Supports multiple search queries with de-duplication
 */
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

// If using Node < 18, uncomment the next line and `npm i node-fetch@3`
// global.fetch = global.fetch || (await import('node-fetch')).default;

const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
if (!ACCESS_KEY) {
  console.error('❌ UNSPLASH_ACCESS_KEY missing in .env.local');
  process.exit(1);
}

// ---- Config ----
const OUT_DIR = path.join(process.cwd(), 'public', 'clinic-images');
const TOTAL = Number(process.env.UNSPLASH_TOTAL || 50);
const PER_PAGE = 30; // max 30 per Unsplash API
const QUERIES = [
  'dermatology',
  'dermatologist clinic',
  'skin care clinic',
  'medical skin',
  'healthcare clinic',
  'aesthetic dermatology',
];
const CONCURRENCY = 5;        // parallel downloads
const ORDER_BY = 'relevant';   // or 'latest'
const APP_UTM = 'dermaclinicsnearme'; // used for attribution links

// ---- Helpers ----
async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

async function exists(p) {
  try { await fsp.access(p); return true; } catch { return false; }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function withRetry(fn, { tries = 3, baseDelay = 400 } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) {
      lastErr = e;
      if (i < tries - 1) await sleep(baseDelay * Math.pow(2, i));
    }
  }
  throw lastErr;
}

async function searchUnsplash(query, page) {
  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', String(PER_PAGE));
  url.searchParams.set('page', String(page));
  url.searchParams.set('orientation', 'landscape');
  url.searchParams.set('content_filter', 'high');
  url.searchParams.set('order_by', ORDER_BY);

  const res = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${ACCESS_KEY}`,
      'Accept-Version': 'v1',
    },
  });
  if (!res.ok) throw new Error(`Unsplash search failed: ${res.status} ${res.statusText}`);
  return res.json();
}

// Per Unsplash API: call download_location to register the download
async function registerDownload(downloadLocation) {
  const res = await fetch(downloadLocation, {
    headers: {
      Authorization: `Client-ID ${ACCESS_KEY}`,
      'Accept-Version': 'v1',
    },
  });
  if (!res.ok) throw new Error(`download_location failed: ${res.status} ${res.statusText}`);
  return res.json(); // { url: "..." }
}

async function downloadToFile(url, filePath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fsp.writeFile(filePath, buf);
}

async function collectPhotos() {
  const seen = new Map(); // id -> photo
  for (const q of QUERIES) {
    // estimate pages needed per query
    const needed = Math.max(1, Math.ceil((TOTAL - seen.size) / PER_PAGE));
    for (let p = 1; p <= needed; p++) {
      const data = await withRetry(() => searchUnsplash(q, p));
      for (const r of (data.results || [])) {
        if (!seen.has(r.id)) seen.set(r.id, r);
        if (seen.size >= TOTAL) break;
      }
      if (seen.size >= TOTAL) break;
    }
    if (seen.size >= TOTAL) break;
  }
  return Array.from(seen.values()).slice(0, TOTAL);
}

async function main() {
  console.log('🔎 Searching Unsplash…');
  await ensureDir(OUT_DIR);

  const list = await collectPhotos();
  if (list.length === 0) {
    console.error('No results returned from Unsplash.');
    process.exit(1);
  }
  console.log(`✅ Selected ${list.length} photos. Downloading files…`);

  const manifest = [];
  // Build download tasks
  const tasks = list.map((photo, i) => async () => {
    const idx = i + 1;
    const file = path.join(OUT_DIR, `clinic-${idx}.jpg`);
    if (await exists(file)) {
      manifest.push({
        filename: `clinic-${idx}.jpg`,
        unsplash_id: photo.id,
        photographer: photo.user?.name,
        profile: addUtm(photo.user?.links?.html),
        source: addUtm(photo.links?.html),
      });
      console.log(`  ↪︎ skipped clinic-${idx}.jpg (exists)`);
      return;
    }

    // 1) Register download
    const dlLoc = photo.links?.download_location;
    if (!dlLoc) {
      console.warn(`No download_location for ${photo.id}, skipping.`);
      return;
    }
    const reg = await withRetry(() => registerDownload(dlLoc));

    // 2) Choose a reasonable sized URL
    const src =
      (photo.urls && (photo.urls.regular || photo.urls.full || photo.urls.small)) ||
      reg?.url ||
      null;
    if (!src) {
      console.warn(`No usable URL for ${photo.id}, skipping.`);
      return;
    }

    // 3) Keep size reasonable
    const url = new URL(src);
    url.searchParams.set('w', '1600');
    url.searchParams.set('dpr', '1');
    url.searchParams.set('auto', 'format');

    // 4) Download with retry
    await withRetry(() => downloadToFile(url.toString(), file), { tries: 3, baseDelay: 500 });

    manifest.push({
      filename: `clinic-${idx}.jpg`,
      unsplash_id: photo.id,
      alt_description: photo.alt_description || '',
      photographer: photo.user?.name,
      profile: addUtm(photo.user?.links?.html),
      source: addUtm(photo.links?.html),
    });

    console.log(`  📸 saved clinic-${idx}.jpg`);
  });

  // Concurrency runner
  let active = 0, next = 0;
  await new Promise((resolve) => {
    const runNext = () => {
      if (next >= tasks.length && active === 0) return resolve();
      while (active < CONCURRENCY && next < tasks.length) {
        const t = tasks[next++];
        active++;
        t().catch(err => {
          console.error('Download error:', err.message);
        }).finally(() => {
          active--;
          runNext();
        });
      }
    };
    runNext();
  });

  // Write manifest for credit
  await fsp.writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\n✨ Done. Files in: ${OUT_DIR}`);
  console.log('ℹ️  Credits in manifest.json (display attribution in your UI).');
}

function addUtm(link) {
  if (!link) return link;
  try {
    const u = new URL(link);
    u.searchParams.set('utm_source', APP_UTM);
    u.searchParams.set('utm_medium', 'referral');
    return u.toString();
  } catch {
    return link;
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
