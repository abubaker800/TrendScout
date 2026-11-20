import { BaseProvider, adLinks } from './base.js';
import { sanitizeProduct, slugify } from '../../utils/sanitize.js';

// [category, title, base price USD, pattern, marketplace]
// pattern: 'Y' = year-round · 'S<m>' = seasonal, peak month m (0 = Jan) · 'F' = fad / spike
const CATALOG = [
  ['Electronics', 'Noise-Cancelling Wireless Earbuds', 29, 'Y', 'Amazon'], ['Electronics', 'Portable Mini Projector', 79, 'S11', 'AliExpress'],
  ['Electronics', 'Smart LED Strip Lights', 18, 'Y', 'TikTok Shop'], ['Electronics', 'Magnetic Wireless Power Bank', 35, 'F', 'TikTok Shop'],
  ['Fashion', 'Oversized Cozy Hoodie', 32, 'S10', 'Amazon'], ['Fashion', 'Polarized Sport Sunglasses', 22, 'S5', 'AliExpress'],
  ['Fashion', 'Seamless Shaping Leggings', 27, 'Y', 'TikTok Shop'], ['Fashion', 'Crochet Bucket Hat', 14, 'F', 'Pinterest'],
  ['Home & Garden', 'Solar Garden Lights', 26, 'S5', 'Amazon'], ['Home & Garden', 'Sunrise Alarm Clock', 39, 'S9', 'Amazon'],
  ['Home & Garden', 'Aroma Diffuser with Humidifier', 24, 'S0', 'AliExpress'], ['Home & Garden', 'Self-Watering Plant Pots', 19, 'S3', 'Pinterest'],
  ['Beauty', 'LED Face Mask Therapy', 59, 'Y', 'TikTok Shop'], ['Beauty', 'Heatless Curl Ribbon Set', 12, 'F', 'TikTok Shop'],
  ['Beauty', 'Vitamin C Serum', 21, 'Y', 'Amazon'], ['Beauty', 'SPF 50 Mineral Sunscreen', 17, 'S5', 'Amazon'],
  ['Health', 'Posture Corrector Brace', 20, 'Y', 'Amazon'], ['Health', 'Electric Neck Massager', 34, 'S11', 'AliExpress'],
  ['Health', 'Smart Water Bottle Reminder', 25, 'S6', 'Google Trends'], ['Health', 'Red Light Therapy Wand', 45, 'F', 'TikTok Shop'],
  ['Toys', 'Magnetic Building Tiles', 31, 'S11', 'Amazon'], ['Toys', 'Sensory Fidget Pop Board', 9, 'F', 'TikTok Shop'],
  ['Toys', 'Kids STEM Robot Kit', 37, 'S11', 'Amazon'], ['Toys', 'Water Blaster Pool Toy', 15, 'S6', 'AliExpress'],
  ['Pets', 'Interactive Dog Puzzle Feeder', 16, 'Y', 'Amazon'], ['Pets', 'Self-Cleaning Slicker Brush', 13, 'Y', 'Amazon'],
  ['Pets', 'Cooling Pet Mat', 23, 'S6', 'AliExpress'], ['Pets', 'Automatic Cat Laser Toy', 19, 'F', 'TikTok Shop'],
  ['Sports', 'Adjustable Resistance Bands', 15, 'S0', 'Amazon'], ['Sports', 'Foldable Yoga Mat', 28, 'S0', 'Pinterest'],
  ['Sports', 'Pickleball Paddle Set', 49, 'S5', 'Amazon'], ['Sports', 'Massage Gun Mini', 42, 'Y', 'TikTok Shop'],
  ['Automotive', 'Magnetic Car Phone Mount', 14, 'Y', 'Amazon'], ['Automotive', 'Portable Tire Inflator', 36, 'S10', 'Amazon'],
  ['Automotive', 'Windshield Snow Cover', 18, 'S11', 'AliExpress'], ['Automotive', 'Car Seat Gap Organizer', 12, 'Y', 'AliExpress'],
  ['Baby', 'Silicone Baby Feeding Set', 18, 'Y', 'Amazon'], ['Baby', 'Portable White Noise Machine', 29, 'Y', 'Amazon'],
  ['Baby', 'Foldable Baby Bath Tub', 33, 'S5', 'AliExpress'], ['Baby', 'Clip-On Stroller Fan', 11, 'S6', 'TikTok Shop'],
  ['Kitchen', 'Air Fryer Silicone Liners', 10, 'Y', 'Amazon'], ['Kitchen', 'Electric Milk Frother', 17, 'S11', 'Amazon'],
  ['Kitchen', 'Vegetable Chopper Pro', 22, 'Y', 'TikTok Shop'], ['Kitchen', 'Cold Brew Coffee Maker', 27, 'S6', 'Amazon'],
  ['Gadgets', 'Mini Thermal Label Printer', 32, 'Y', 'AliExpress'], ['Gadgets', 'Smart Tracker Tag 4-Pack', 45, 'S11', 'Amazon'],
  ['Gadgets', 'Pocket Photo Printer', 54, 'F', 'TikTok Shop'], ['Gadgets', 'Cordless Desk Vacuum', 16, 'Y', 'AliExpress'],
  ['Office', 'Ergonomic Laptop Stand', 25, 'S8', 'Amazon'], ['Office', 'Desk Cable Organizer Kit', 13, 'Y', 'AliExpress'],
  ['Office', 'Weekly Planner Notebook', 15, 'S11', 'Pinterest'], ['Office', 'Under-Desk Footrest', 28, 'Y', 'Amazon'],
  ['Outdoors', 'Collapsible Camping Lantern', 19, 'S6', 'Amazon'], ['Outdoors', 'Hammock with Tree Straps', 30, 'S5', 'Amazon'],
  ['Outdoors', 'Insulated Tumbler 40oz', 24, 'F', 'TikTok Shop'], ['Outdoors', 'Portable Camping Shower', 21, 'S6', 'AliExpress'],
  ['Jewelry', 'Dainty Layered Necklace Set', 16, 'S1', 'Pinterest'], ['Jewelry', 'Personalized Birthstone Ring', 24, 'S4', 'Amazon'],
  ['Jewelry', 'Magnetic Charm Bracelet', 12, 'F', 'TikTok Shop'], ['Jewelry', 'Minimalist Stud Earring Pack', 14, 'Y', 'Amazon'],
];
export const MOCK_PATTERNS = ['Y', 'S11', 'S5', 'F'];
const SOUTH = new Set(['AU', 'NZ', 'ZA', 'AR', 'BR', 'CL', 'UY', 'PY', 'BO', 'PE', 'ZW', 'ZM', 'MZ', 'NA', 'BW']);

export function hash(str) { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const isoDaysAgo = (d) => new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);

/** 60 monthly interest points (oldest first) for a pattern. Deterministic per seed. */
export function makeSeries(pattern, seed, country = 'US', now = new Date()) {
  const r = rng(seed), out = [], m0 = now.getMonth();
  const south = SOUTH.has(country);
  const fadCenter = 59 - (4 + Math.floor(r() * 8));
  for (let i = 0; i < 60; i++) {
    const mi = (((m0 - (59 - i)) % 12) + 12) % 12;
    let v;
    if (pattern === 'Y') v = 55 + 6 * Math.sin(i / 9) + (r() - 0.5) * 12 + i * 0.08;
    else if (pattern === 'F') v = 8 + 90 * Math.exp(-((i - fadCenter) ** 2) / (2 * 2.2 ** 2)) + (r() - 0.5) * 6;
    else {
      const peak = (Number(pattern.slice(1)) + (south ? 6 : 0)) % 12;
      const d = Math.min(Math.abs(mi - peak), 12 - Math.abs(mi - peak));
      v = 18 + 80 * Math.exp(-(d * d) / (2 * 1.4 ** 2)) + (r() - 0.5) * 8;
    }
    out.push(Math.round(clamp(v, 0, 100)));
  }
  return out;
}
export function seriesForTitle(title, country = 'US') {
  const row = CATALOG.find((c) => c[1] === title);
  const pattern = row ? row[3] : MOCK_PATTERNS[hash(title) % MOCK_PATTERNS.length];
  return makeSeries(pattern, hash(title + country), country);
}

const PALETTE = [['#D4AF37', '#0B0B0C'], ['#B3141C', '#FFFFFF'], ['#2A2A2E', '#D4AF37'], ['#6B6B72', '#FFFFFF']];
function thumb(title, seed) {
  const initials = title.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  const [bg, fg] = PALETTE[seed % PALETTE.length];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='96' height='96' rx='14' fill='${bg}'/><text x='48' y='60' font-size='34' font-family='Arial' font-weight='700' fill='${fg}' text-anchor='middle'>${initials}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
// Photo keyword per product (default = last word of the title). Free keyword-based photo service, no API key.
const KW = {
  'Magnetic Wireless Power Bank': 'powerbank', 'Heatless Curl Ribbon Set': 'curlers', 'Smart Water Bottle Reminder': 'waterbottle',
  'Kids STEM Robot Kit': 'robot', 'Water Blaster Pool Toy': 'watergun', 'Automatic Cat Laser Toy': 'cat', 'Pickleball Paddle Set': 'pickleball',
  'Massage Gun Mini': 'massagegun', 'Windshield Snow Cover': 'windshield', 'Silicone Baby Feeding Set': 'baby', 'Portable White Noise Machine': 'speaker',
  'Vegetable Chopper Pro': 'vegetables', 'Smart Tracker Tag 4-Pack': 'keys', 'Desk Cable Organizer Kit': 'cables', 'Dainty Layered Necklace Set': 'necklace',
  'Minimalist Stud Earring Pack': 'earrings', 'Foldable Yoga Mat': 'yoga', 'Cooling Pet Mat': 'dog', 'Sensory Fidget Pop Board': 'fidget',
  'Air Fryer Silicone Liners': 'airfryer', 'Red Light Therapy Wand': 'skincare', 'Oversized Cozy Hoodie': 'hoodie', 'Self-Watering Plant Pots': 'plant',
  'Ergonomic Laptop Stand': 'laptop', 'Under-Desk Footrest': 'office', 'Insulated Tumbler 40oz': 'tumbler', 'LED Face Mask Therapy': 'skincare',
  'Solar Garden Lights': 'garden', 'Smart LED Strip Lights': 'led', 'Adjustable Resistance Bands': 'fitness', 'Foldable Baby Bath Tub': 'baby',
  'Portable Camping Shower': 'camping', 'Portable Tire Inflator': 'tire', 'Magnetic Car Phone Mount': 'phone', 'Mini Thermal Label Printer': 'printer',
  'Pocket Photo Printer': 'printer', 'Cold Brew Coffee Maker': 'coffee', 'Electric Milk Frother': 'coffee', 'Magnetic Building Tiles': 'toys',
  'Self-Cleaning Slicker Brush': 'dog', 'Interactive Dog Puzzle Feeder': 'dog', 'Collapsible Camping Lantern': 'lantern',
  'Car Seat Gap Organizer': 'car', 'Clip-On Stroller Fan': 'stroller', 'Electric Neck Massager': 'massage', 'Aroma Diffuser with Humidifier': 'diffuser',
};
const photoKeyword = (title) => KW[title] || title.split(/\s+/).pop().toLowerCase().replace(/[^a-z]/g, '') || 'product';
const photo = (title) => `https://loremflickr.com/160/160/${encodeURIComponent(photoKeyword(title))}?lock=${hash(title) % 1000}`;

function marketLink(market, title) {
  const q = encodeURIComponent(title);
  if (market === 'Amazon') return `https://www.amazon.com/s?k=${q}`;
  if (market === 'AliExpress') return `https://www.aliexpress.com/wholesale?SearchText=${q}`;
  if (market === 'TikTok Shop') return `https://www.tiktok.com/search?q=${q}`;
  if (market === 'Pinterest') return `https://www.pinterest.com/search/pins/?q=${q}`;
  return `https://trends.google.com/trends/explore?q=${q}`;
}

function build([category, title, price, pattern, market], country, photos) {
  const r = rng(hash(country + title));
  const series = makeSeries(pattern, hash(title + country), country);
  const trendScore = clamp(Math.round(avg(series.slice(-3)) * 0.75 + r() * 25), 5, 99);
  const reviewsPerMonth = Math.max(3, Math.round((5 + r() * 120) * (trendScore / 60)));
  return sanitizeProduct({
    id: slugify(title), title, category, price: Math.round(price * (0.9 + r() * 0.3) * 100) / 100, currency: 'USD',
    image: photos ? photo(title) : thumb(title, hash(title)), trendScore, reviewsPerMonth,
    monthlyVisits: Math.round((reviewsPerMonth / 0.0004) * (0.6 + r() * 0.8)),
    source: market, link: marketLink(market, title), firstSeen: isoDaysAgo(Math.floor(r() * 90)), series, country,
  });
}

/** MOCK provider: realistic deterministic sample data, zero API keys, works offline. */
export class MockProvider extends BaseProvider {
  constructor() { super('mock', 'Demo data', { trending: true, ads: ['facebook', 'tiktok', 'pinterest'], interest: true }); }
  async getTrending({ country = 'US', category = 'All', photos = true } = {}) {
    await new Promise((r) => setTimeout(r, 250));
    return CATALOG.filter((row) => category === 'All' || row[0] === category).map((row) => build(row, country, photos)).sort((a, b) => b.trendScore - a.trendScore);
  }
  async getAdStatus(product, { country = 'US' } = {}) {
    const links = adLinks(product.title, country);
    const out = {};
    for (const k of ['facebook', 'tiktok', 'pinterest']) {
      const r = rng(hash(product.id + k + country));
      const p = (product.trendScore || 40) / 100;
      const roll = r();
      if (roll < p * (k === 'pinterest' ? 0.55 : 0.85)) out[k] = { status: 'active', count: 1 + Math.floor(r() * (product.trendScore || 40) * 0.9), firstSeen: isoDaysAgo(5 + Math.floor(r() * 180)), link: links[k], note: 'Demo data' };
      else if (roll < 0.9) out[k] = { status: 'not_found', count: 0, firstSeen: null, link: links[k], note: 'Demo data' };
      else out[k] = { status: 'unknown', count: null, firstSeen: null, link: links[k], note: 'Demo data' };
    }
    return out;
  }
  async getInterest(product, { country = 'US' } = {}) {
    return { series: product.series || seriesForTitle(product.title, country) };
  }
}
