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

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.addressComponents',
  'places.location',
  'places.primaryType',
  'places.types',
  'places.rating',
  'places.userRatingCount',
  'places.currentOpeningHours.openNow',
  'places.regularOpeningHours.weekdayDescriptions',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.googleMapsUri',
  'places.businessStatus',
  'places.accessibilityOptions',
  'places.parkingOptions',
  'places.priceLevel',
  'places.paymentOptions',
  'places.photos.name',
  'places.photos.widthPx',
  'places.photos.heightPx',
  'nextPageToken'
].join(',');

const STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA',
  'ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK',
  'OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'
];

// ---- Throttling & safety (env-driven) ----
const QPS = Number(process.env.PLACES_QPS || 3);
const NEXT_PAGE_DELAY_MS = Number(process.env.PLACES_NEXT_PAGE_DELAY_MS || 1200);
const SLEEP = (ms: number) => new Promise(r => setTimeout(r, ms));

let REQUESTS = 0;
const MAX_REQUESTS = Number(process.env.PLACES_MAX_REQUESTS || 800);

const MAX_CLINICS_PER_STATE = Number(process.env.PLACES_MAX_CLINICS_PER_STATE || 0);
const MAX_CLINICS_GLOBAL = Number(process.env.PLACES_MAX_CLINICS_GLOBAL || 0);
let GLOBAL_CLINICS = 0;

async function gate() {
  REQUESTS++;
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


// ---- Enhanced dermatology filtering ----
function acceptByDermHeuristics(p: any): boolean {
  const name = (p.displayName?.text || '').toLowerCase();
  const website = (p.websiteUri || '').toLowerCase();
  const types = (p.types || []).join(' ').toLowerCase();
  const searchText = `${name} ${website} ${types}`;

  
  // RULE 1: Exclude obvious non-derm places first
  const excludeTerms = [
    'dental', 'dentist', 'orthodont', 'oral surgery',
    'veterinary', 'animal clinic', 'pet clinic',
    'massage', 'spa resort', 'day spa', 'nail salon'
  ];
  
  for (const term of excludeTerms) {
    if (searchText.includes(term)) {
      return false;
    }
  }
  
  // RULE 2: Accept if Place Type is skin_care_clinic
  if (types.includes('skin_care_clinic')) {
    return true;
  }
  
  // RULE 3: High confidence - core dermatology terms
  const coreTerms = [
    'dermatology', 'dermatologist', 'dermatologic'
  ];
  
  for (const term of coreTerms) {
    if (searchText.includes(term)) {
      return true;
    }
  }
  
  // RULE 4: Medium confidence - related terms in name or website
  const relatedTerms = [
    'skin clinic', 'skin center', 'skin care clinic',
    'skin doctor', 'skin specialist', 'skin health',
    'medical dermatology', 'cosmetic dermatology',
    'laser dermatology', 'aesthetic dermatology',
    'mohs surgery', 'skin cancer'
  ];
  
  for (const term of relatedTerms) {
    if (name.includes(term) || website.includes(term)) {
      return true;
    }
  }
  
  // RULE 5: Partial matches - need strong context
  const hasDerm = searchText.includes('derm');
  const hasSkin = name.includes('skin') || website.includes('skin');
  const medicalContext = 
    types.includes('doctor') || 
    types.includes('health') ||
    searchText.includes('medical') ||
    searchText.includes('clinic') ||
    searchText.includes('center');
  
  if ((hasDerm || hasSkin) && medicalContext) {
    // Extra validation: exclude skin care product stores
    const isStore = 
      types.includes('store') ||
      types.includes('beauty_supply_store') ||
      searchText.includes('beauty supply') ||
      searchText.includes('cosmetics store');
    
    return !isStore;
  }
  
  // RULE 6: Reject everything else
  return false;
}

async function searchTextOnce(query: string, pageToken?: string) {
  await gate();

  const body: any = { 
    textQuery: query, 
    pageSize: 20, 
    languageCode: 'en', 
    regionCode: 'US' 
  };
  
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
    current_open_now: p.currentOpeningHours?.openNow ?? null,
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
    accessibility_options: p.accessibilityOptions ?? null,
    parking_options: p.parkingOptions ?? null,
    payment_options: p.paymentOptions ?? null,
    price_level: p.priceLevel ?? null,
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
    let pagesForQuery = 0;
    
    do {
      const data = await searchTextOnce(q, pageToken);
      const places = data.places ?? [];
      pagesForQuery++;

      for (const p of places) {
        if (!acceptByDermHeuristics(p)) continue;
        const id = p.id;
        if (id && !seen.has(id)) {
          seen.add(id);
          clinics.push(toClinic(p));
          GLOBAL_CLINICS++;

          // Per-state cap
          if (MAX_CLINICS_PER_STATE && clinics.length >= MAX_CLINICS_PER_STATE) {
            pageToken = undefined;
            break;
          }

          // Global cap
          if (MAX_CLINICS_GLOBAL && GLOBAL_CLINICS >= MAX_CLINICS_GLOBAL) {
            throw new Error('Global clinic cap hit');
          }
        }
      }

      pageToken = data.nextPageToken || undefined;

      // Extra delay between page fetches
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
  await fs.mkdir(OUT_DIR, { recursive: true });
  const arg = process.argv.find(a => a.startsWith('--states='));
  const states = arg ? arg.split('=')[1].split(',').map(s => s.trim().toUpperCase()) : STATES;

  console.log(`\n▶ Collecting dermatology clinics for ${states.length} state(s) (Text Search, paginated)`);
  console.log(`   Rate: ~${QPS} QPS  |  nextPageDelay=${NEXT_PAGE_DELAY_MS}ms  |  max requests: ${MAX_REQUESTS}`);
  if (MAX_CLINICS_PER_STATE) console.log(`   Cap per state: ${MAX_CLINICS_PER_STATE} clinics`);
  if (MAX_CLINICS_GLOBAL)     console.log(`   Global cap:    ${MAX_CLINICS_GLOBAL} clinics`);
  console.log('');

  for (const st of states) {
    process.stdout.write(`→ ${st}\n`);
    try {
      await collectState(st);
      
      // Show progress every 50 requests
      if (REQUESTS % 50 === 0) {
        const cost = (REQUESTS * 0.032).toFixed(2);
        console.log(`  💰 Progress: ${REQUESTS} requests | ~$${cost}`);
      }
    } catch (e: any) {
      const msg = e?.message || String(e);
      console.error(`  ❌ ${st}: ${msg}`);
      if (msg.includes('Global clinic cap hit') || msg.includes('Daily request cap hit')) {
        console.log('\n⛔ Limit reached. Stopping collection.\n');
        break;
      }
    }
  }

  const totalCost = (REQUESTS * 0.032).toFixed(2);
  console.log(`\n✨ Done. Total API calls: ${REQUESTS}  |  Total clinics: ${GLOBAL_CLINICS}  |  Cost: ~$${totalCost}\n`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
