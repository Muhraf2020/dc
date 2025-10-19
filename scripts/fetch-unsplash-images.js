/* scripts/fetch-unsplash-images.js
 * Downloads N Unsplash photos into public/clinic-images as clinic-1.jpg ... clinic-N.jpg
 * Uses Search API (few requests), then downloads image files.
 */
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
if (!ACCESS_KEY) {
  console.error('❌ UNSPLASH_ACCESS_KEY missing in .env.local');
  process.exit(1);
}

const OUT_DIR = path.join(process.cwd(), 'public', 'clinic-images');
const TOTAL = 50;                // how many images to save
const PER_PAGE = 30;             // Unsplash search per_page (max 30)
const QUERY = 'dermatology,clinic,medical,skin care,healthcare';
const CONCURRENCY = 5;           // parallel downloads

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

async function searchUnsplash(page) {
  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.set('query', QUERY);
  url.searchParams.set('per_page', String(PER_PAGE));
  url.searchParams.set('page', String(page));
  url.searchParams.set('orientation', 'landscape');
  url.searchParams.set('content_filter', 'high');

  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
  });
  if (!res.ok) {
    throw new Error(`Unsplash search failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function downloadToFile(url, filePath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fsp.writeFile(filePath, buf);
}

async function main() {
  console.log('🔎 Searching Unsplash…');
  await ensureDir(OUT_DIR);

  // Pull enough results using 2 pages (<= 60 total)
  const pagesNeeded = Math.ceil(TOTAL / PER_PAGE);
  const results = [];
  for (let p = 1; p <= pagesNeeded; p++) {
    const data = await searchUnsplash(p);
    results.push(...(data.results || []));
  }

  // Dedupe by id & slice to TOTAL
  const unique = Array.from(new Map(results.map(r => [r.id, r])).values()).slice(0, TOTAL);
  if (unique.length === 0) {
    console.error('No results returned from Unsplash.');
    process.exit(1);
  }
  console.log(`✅ Got ${unique.length} search results. Downloading files…`);

  // Save a manifest with photographer credit & source for later attribution
  const manifest = [];

  // Build download tasks
  const tasks = unique.map((photo, i) => async () => {
    // Prefer "regular" (resized, reasonable weight). You can switch to "full" if you want.
    const src = (photo.urls && (photo.urls.regular || photo.urls.full || photo.urls.small));
    if (!src) return;

    // Add width param to keep size reasonable
    const url = new URL(src);
    url.searchParams.set('w', '1600');
    url.searchParams.set('dpr', '1');
    url.searchParams.set('auto', 'format');

    const idx = i + 1;
    const file = path.join(OUT_DIR, `clinic-${idx}.jpg`);
    await downloadToFile(url.toString(), file);

    manifest.push({
      filename: `clinic-${idx}.jpg`,
      unsplash_id: photo.id,
      photographer: photo.user?.name,
      profile: photo.user?.links?.html,
      source: photo.links?.html,
    });

    console.log(`  📸 saved clinic-${idx}.jpg`);
  });

  // Simple concurrency runner
  let active = 0, next = 0;
  await new Promise((resolve, reject) => {
    const runNext = () => {
      if (next >= tasks.length && active === 0) return resolve();
      while (active < CONCURRENCY && next < tasks.length) {
        const t = tasks[next++];
        active++;
        t().then(() => {
          active--;
          runNext();
        }).catch(err => {
          console.error('Download error:', err.message);
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
  console.log('ℹ️  Credits in manifest.json (consider showing attribution somewhere in your UI).');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
