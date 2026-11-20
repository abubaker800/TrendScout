// Third-party data proxies. Keys come from .env (or the optional X-Provider-Key header the user set in the extension).
// Only official / licensed APIs are used. Sources without a public API answer 501 and the extension falls back to deep links.
import { Router } from 'express';
import { config } from '../config.js';
import { ApiError } from '../lib/errors.js';

const router = Router();
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const cc = (v) => (/^[A-Za-z]{2}$/.test(String(v)) ? String(v).toUpperCase() : 'US');
const EU = new Set('AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE GB'.split(' '));

async function getJson(url, label) {
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  const j = await r.json().catch(() => ({}));
  if (r.status === 429) throw new ApiError(429, `${label} rate limit reached`);
  if (!r.ok) throw new ApiError(502, `${label} error ${r.status}`);
  return j;
}
const keyFor = (req, own) => req.get('X-Provider-Key') || own;
const unavailable = (name) => (req, res) => res.status(501).json({ error: `${name} has no public API wired in. Use the deep links ("Check manually"), or implement an approved partner integration here.` });

// ---- Google Trends via SerpApi ----
router.get('/googleTrends/trending', async (req, res, next) => {
  try {
    const key = keyFor(req, config.keys.serpapi); if (!key) throw new ApiError(501, 'SERPAPI_KEY not configured');
    const geo = cc(req.query.country);
    const j = await getJson(`https://serpapi.com/search.json?engine=google_trends_trending_now&geo=${geo}&api_key=${encodeURIComponent(key)}`, 'SerpApi');
    const items = (j.trending_searches || []).slice(0, 50).map((t) => ({
      title: t.query, category: t.categories?.[0]?.name || 'All',
      trendScore: clamp(Math.round(35 + Math.log10(Math.max(10, Number(t.search_volume) || 10)) * 12), 5, 99),
      firstSeen: t.start_timestamp ? new Date(t.start_timestamp * 1000).toISOString() : null,
      link: `https://trends.google.com/trends/explore?q=${encodeURIComponent(t.query)}&geo=${geo}`,
    }));
    res.json({ items });
  } catch (e) { next(e); }
});
router.get('/googleTrends/interest', async (req, res, next) => {
  try {
    const key = keyFor(req, config.keys.serpapi); if (!key) throw new ApiError(501, 'SERPAPI_KEY not configured');
    const q = String(req.query.q || '').slice(0, 100); if (!q) throw new ApiError(400, 'q required');
    const j = await getJson(`https://serpapi.com/search.json?engine=google_trends&q=${encodeURIComponent(q)}&geo=${cc(req.query.country)}&data_type=TIMESERIES&date=${encodeURIComponent('today 5-y')}&api_key=${encodeURIComponent(key)}`, 'SerpApi');
    const buckets = new Map();
    for (const p of j.interest_over_time?.timeline_data || []) {
      const d = new Date(Number(p.timestamp) * 1000); const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      const v = Number(p.values?.[0]?.extracted_value); if (!Number.isFinite(v)) continue;
      const b = buckets.get(k) || []; b.push(v); buckets.set(k, b);
    }
    const series = [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => Math.round(v.reduce((s, x) => s + x, 0) / v.length)).slice(-60);
    res.json({ series });
  } catch (e) { next(e); }
});

// ---- Amazon Best Sellers via Rainforest API ----
const AMZ_DOMAIN = { US: 'amazon.com', GB: 'amazon.co.uk', DE: 'amazon.de', CA: 'amazon.ca', IN: 'amazon.in', AU: 'amazon.com.au', FR: 'amazon.fr', IT: 'amazon.it', ES: 'amazon.es', JP: 'amazon.co.jp' };
const AMZ_SLUG = { Electronics: 'electronics', Fashion: 'fashion', 'Home & Garden': 'home-garden', Beauty: 'beauty', Health: 'hpc', Toys: 'toys-and-games', Pets: 'pet-supplies', Sports: 'sporting-goods', Automotive: 'automotive', Baby: 'baby-products', Kitchen: 'kitchen', Gadgets: 'electronics', Office: 'office-products', Outdoors: 'sporting-goods', Jewelry: 'jewelry' };
router.get('/amazon/bestsellers', async (req, res, next) => {
  try {
    const key = keyFor(req, config.keys.rainforest); if (!key) throw new ApiError(501, 'RAINFOREST_KEY not configured');
    const domain = AMZ_DOMAIN[cc(req.query.country)]; if (!domain) throw new ApiError(400, 'Amazon is not supported for this country');
    const slug = AMZ_SLUG[String(req.query.category)] || 'electronics';
    const url = `https://api.rainforestapi.com/request?api_key=${encodeURIComponent(key)}&type=bestsellers&amazon_domain=${domain}&url=${encodeURIComponent(`https://www.${domain}/Best-Sellers/zgbs/${slug}`)}`;
    const j = await getJson(url, 'Rainforest');
    const items = (j.bestsellers || []).slice(0, 50).map((b) => ({
      title: b.title, link: b.link, image: b.image, price: b.price?.value, currency: b.price?.currency, category: req.query.category,
      reviewsTotal: b.ratings_total, trendScore: clamp(100 - (Number(b.rank) || 50), 5, 99),
    }));
    res.json({ items });
  } catch (e) { next(e); }
});

// ---- Meta Ad Library (commercial ads are only exposed for EU/UK) ----
router.get('/meta/ads', async (req, res, next) => {
  try {
    const key = keyFor(req, config.keys.meta); if (!key) throw new ApiError(501, 'META_ACCESS_TOKEN not configured');
    const country = cc(req.query.country);
    const q = String(req.query.q || '').slice(0, 100); if (!q) throw new ApiError(400, 'q required');
    if (!EU.has(country)) return res.json({ status: 'manual', note: 'Meta’s API only returns commercial ads for EU/UK — check the public library.' });
    const url = `https://graph.facebook.com/v21.0/ads_archive?search_terms=${encodeURIComponent(q)}&ad_reached_countries=${encodeURIComponent(JSON.stringify([country]))}&ad_active_status=ACTIVE&fields=id,ad_delivery_start_time&limit=50&access_token=${encodeURIComponent(key)}`;
    const j = await getJson(url, 'Meta');
    const data = j.data || [];
    const first = data.map((a) => a.ad_delivery_start_time).filter(Boolean).sort()[0] || null;
    res.json({ status: data.length ? 'active' : 'not_found', count: data.length, firstSeen: first, note: data.length >= 50 ? '50+ ads (capped)' : '' });
  } catch (e) { next(e); }
});

// ---- no public API ----
for (const [id, name, actions] of [['aliexpress', 'AliExpress', ['hot-products']], ['tiktok', 'TikTok Creative Center', ['trending', 'ads']], ['pinterest', 'Pinterest Trends', ['trending', 'ads']]]) {
  for (const a of actions) router.get(`/${id}/${a}`, unavailable(name));
}
export default router;
