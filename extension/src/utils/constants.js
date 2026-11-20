import { DEFAULT_ASSUMPTIONS } from '../services/estimators/sales.js';

export const CONSENT_VERSION = 1;

export const CATEGORIES = ['All', 'Electronics', 'Fashion', 'Home & Garden', 'Beauty', 'Health', 'Toys', 'Pets', 'Sports', 'Automotive', 'Baby', 'Kitchen', 'Gadgets', 'Office', 'Outdoors', 'Jewelry'];

export const COUNTRY_CODES = ('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW').split(' ');

let displayNames = null;
export function countryName(code) {
  try {
    displayNames = displayNames || new Intl.DisplayNames(['en'], { type: 'region' });
    return displayNames.of(code) || code;
  } catch { return code; }
}

/** Best-effort country auto-detection from the browser locale. */
export function detectCountry() {
  const list = [...(navigator.languages || []), navigator.language, Intl.DateTimeFormat().resolvedOptions().locale];
  for (const l of list) {
    const m = /[-_]([A-Za-z]{2})$/.exec(l || '');
    if (m && COUNTRY_CODES.includes(m[1].toUpperCase())) return m[1].toUpperCase();
  }
  return 'US';
}

export const AD_PLATFORMS = [
  { id: 'facebook', label: 'Facebook / Instagram', short: 'FB/IG' },
  { id: 'tiktok', label: 'TikTok', short: 'TikTok' },
  { id: 'pinterest', label: 'Pinterest', short: 'Pinterest' },
];

export const AD_STATUS_LABEL = { active: 'Active', not_found: 'Not found', unknown: 'Unknown', manual: 'Check manually' };

export const PROVIDER_META = [
  { id: 'googleTrends', name: 'Google Trends', note: 'Needs a SerpApi key on the server (or paste yours here).' },
  { id: 'amazon', name: 'Amazon Best Sellers', note: 'Needs a Rainforest API key on the server (or paste yours here).' },
  { id: 'aliexpress', name: 'AliExpress', note: 'No public API — server returns "not available"; use the deep links.' },
  { id: 'tiktok', name: 'TikTok Creative Center', note: 'No public API — server returns "not available"; use the deep links.' },
  { id: 'meta', name: 'Meta Ad Library', note: 'Needs a Meta access token. Commercial ads are only returned for EU/UK.' },
  { id: 'pinterest', name: 'Pinterest Trends', note: 'No public API — server returns "not available"; use the deep links.' },
];

export const DEFAULT_SETTINGS = {
  theme: 'dark',                   // 'system' | 'light' | 'dark'
  dataMode: 'mock',                // 'mock' | 'live'
  serverUrl: 'http://localhost:3001',
  apiKeys: { googleTrends: '', amazon: '', aliexpress: '', tiktok: '', meta: '', pinterest: '' },
  enabledProviders: { googleTrends: true, amazon: true, aliexpress: false, tiktok: false, meta: true, pinterest: false },
  assumptions: DEFAULT_ASSUMPTIONS,
  demoImages: true,                // demo mode: load keyword photos from loremflickr.com
  pageScanner: true,
  notifications: true,
  refreshHours: 6,
  defaultListingStatus: 'draft',   // 'draft' | 'active'
};

export const SEASONALITY_OPTIONS = [
  { id: 'any', label: 'Any seasonality' },
  { id: 'year-round', label: 'Year-round' },
  { id: 'seasonal', label: 'Seasonal' },
  { id: 'fad', label: 'Spiking / Fad' },
];
