import { config } from 'dotenv';
import path from 'path';
import { promises as fs } from 'fs';

config({ path: path.resolve(process.cwd(), '.env.local') });

const API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';
if (!API_KEY) {
  console.error('❌ GOOGLE_PLACES_API_KEY is missing in .env.local');
  process.exit(1);
}

const OUT_DIR = path.resolve(process.cwd(), 'data/clinics');
await fs.mkdir(OUT_DIR, { recursive: true });

const FIELD_MASK = [
  'places.id','places.displayName','places.formattedAddress','places.addressComponents',
  'places.location','places.primaryType','places.types','places.rating','places.userRatingCount',
  'places.currentOpeningHours.openNow','places.regularOpeningHours.weekdayDescriptions',
  'places.nationalPhoneNumber','places.internationalPhoneNumber',
  'places.websiteUri','places.googleMapsUri','places.businessStatus',
  'places.photos.name','places.photos.widthPx','places.photos.heightPx',
  'nextPageToken'
].join(',');

const STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA',
  'ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK',
  'OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'
];

// ---- Throttling & safety ----
const QPS = 3; // gentle global pace
const NEXT_PAGE_DELAY_MS = 1200; // extra delay to let nextPageToken become valid
const SLEEP = (ms: number) => new Promise(r => setTimeout(r, ms));

let REQUESTS = 0;
const MAX_REQUESTS = Number(process.env.PLACES_MAX_REQUESTS || 800);
async function gate() {
  REQUESTS++;
  if (REQUESTS > MAX_REQUESTS) {
    throw new Error('Daily request cap hit');
  }
  // QPS pacing
  await SLEEP(Math.ceil(1000 / QPS));
}

// ---- Small utils ----
function pick(obj: any, keys: string[]) {
  const o: any = {};
  for (const k of keys) o[k] = obj?.[k] ?? null;
  return o;
}

function fromAddressComponents(components: any[]) {
  const get = (t: string) => components?.find((c: any) => c.types?.includes(t));
  return {
    state_code: get('administrative_area_level_1')?.shortText ?? null,
    city: get('locality')?.longText ?? get('postal_town')?.longText ?? null,
    postal_code: get('postal_code')?.longText ?? null,
  };
}

function acceptByDermHeuristics(p: any) {
  const name = (p.displayName?.text || '').toLowerCase();
  const website = (p.websiteUri || '').toLowerCase();
  const hay = `${name} ${website}`;
  return /dermatolog|skin clinic|skin center|derma\b/.test(hay);
}

async function searchTextOnce(query: string, pageToken?: string) {
  await gate(); // count + pace every API call

  const body: any = { textQuery: query, pageSize: 20, languageCode: 'en', regionCode: 'US' };
  if (pageToken) body.pageToken = pageToken;

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': FIELD_MASK
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`searchText failed: ${res.status}`);
  return res.json();
}

// ---- Output shape (UI-friendly) ----
function toClinic(p: any) {
  const ac = fromAddressComponents(p.addressComponents ?? []);
  return {
    place_id: p.id ?? null,
    display_name: p.displayName?.text ?? null,
    formatted_address: p.formattedAddress ?? null,
    location: p.location ? { lat: p.location.latitude, lng: p.location.longitude } : null,
    primary_type: p.primaryType ?? null,
    types: p.types ?? [],
    rating: p.rating ?? null,
    user_rating_count: p.userRatingCount ?? null,

    // 👇 Keep MapView happy:
    phone: p.nationalPhoneNumber ?? null,
    international_phone_number: p.internationalPhoneNumber ?? null,
    opening_hours: p.regularOpeningHours
      ? {
          open_now: p.currentOpeningHours?.openNow ?? null,
          weekday_text: p.regularOpeningHours.weekdayDescriptions ?? [],
        }
      : null,

    website: p.websiteUri ?? null,
    google_maps_uri: p.googleMapsUri ?? null,
    business_status: p.businessStatus ?? null,

    city: ac.city,
    state_code: ac.state_code,
    postal_code: ac.postal_code,

    photos: (p.photos ?? []).map((ph: any) => ({
      name: ph.name,
      widthPx: ph.widthPx,
      heightPx: ph.heightPx,
    })),

    last_fetched_at: new Date().toISOString().slice(0, 10),
  };
}

// ---- State collection ----
async function collectState(stateCode: string) {
  const seen = new Set<string>();
  const clinics: any[] = [];
  const queries = [
    `dermatology clinic in ${stateCode}`,
    `dermatologist in ${stateCode}`,
    `skin clinic in ${stateCode}`
  ];

  for (const q of queries) {
    let pageToken: string | undefined = undefined;
    do {
      const data = await searchTextOnce(q, pageToken);
      const places = data.places ?? [];

      for (const p of places) {
        if (!acceptByDermHeuristics(p)) continue;
        const id = p.id;
        if (id && !seen.has(id)) {
          seen.add(id);
          clinics.push(toClinic(p));
        }
      }

      pageToken = data.nextPageToken || undefined;

      // Extra delay specifically between page fetches to avoid "token not ready" flakiness
      if (pageToken) {
        await SLEEP(NEXT_PAGE_DELAY_MS);
      }
    } while (pageToken);
  }

  const outPath = path.join(OUT_DIR, `${stateCode.toLowerCase()}.json`);
  const payload = {
    state: stateCode,
    state_code: stateCode,
    total: clinics.length,
    last_updated: new Date().toISOString(),
    clinics
  };
  await fs.writeFile(outPath, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`  ✅ ${stateCode}: ${clinics.length} clinics → ${path.relative(process.cwd(), outPath)}`);
}

// ---- Main ----
async function main() {
  const arg = process.argv.find(a => a.startsWith('--states='));
  const states = arg ? arg.split('=')[1].split(',').map(s => s.trim().toUpperCase()) : STATES;

  console.log(`\n▶ Collecting dermatology clinics for ${states.length} state(s) (Text Search, paginated)`);
  console.log(`   Rate: ~${QPS} QPS  |  language=en  region=US  |  max requests: ${MAX_REQUESTS}\n`);

  for (const st of states) {
    process.stdout.write(`→ ${st}\n`);
    try {
      await collectState(st);
    } catch (e: any) {
      console.error(`  ❌ ${st}: ${e.message || e}`);
    }
  }

  console.log('\n✨ Done.\n');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
