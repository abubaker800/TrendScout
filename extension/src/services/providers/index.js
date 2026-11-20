// Provider registry + aggregation. Mock mode never touches the network.
import { MockProvider } from './mock.js';
import { GoogleTrendsProvider } from './googleTrends.js';
import { AmazonProvider } from './amazon.js';
import { AliExpressProvider } from './aliexpress.js';
import { TikTokProvider } from './tiktok.js';
import { MetaAdLibraryProvider } from './meta.js';
import { PinterestProvider } from './pinterest.js';
import { manualAds } from './base.js';
import { sanitizeProduct } from '../../utils/sanitize.js';

export const mock = new MockProvider();
export const LIVE = [new GoogleTrendsProvider(), new AmazonProvider(), new AliExpressProvider(), new TikTokProvider(), new MetaAdLibraryProvider(), new PinterestProvider()];
const enabled = (settings, p) => settings.enabledProviders?.[p.id] !== false;

export async function fetchTrending({ country, category }, settings) {
  if (settings.dataMode !== 'live') return { products: await mock.getTrending({ country, category, photos: settings.demoImages !== false }), warnings: [], mode: 'mock' };
  const active = LIVE.filter((p) => p.caps.trending && enabled(settings, p));
  if (!active.length) throw new Error('Live mode is on but no trending providers are enabled. Enable one in Settings.');
  const ctx = { country, settings };
  const results = await Promise.allSettled(active.map((p) => p.getTrending({ country, category }, ctx)));
  const warnings = [], seen = new Map();
  results.forEach((r, i) => {
    if (r.status === 'rejected') { warnings.push(`${active[i].name}: ${r.reason?.message || 'failed'}`); return; }
    for (const raw of r.value) {
      const p = sanitizeProduct(raw);
      if (p.title && !seen.has(p.id)) seen.set(p.id, p);
    }
  });
  if (!seen.size && warnings.length === active.length) throw new Error(warnings[0]);
  return { products: [...seen.values()].sort((a, b) => b.trendScore - a.trendScore), warnings, mode: 'live' };
}

async function adsFor(product, country, settings) {
  const base = manualAds(product, country);
  if (settings.dataMode !== 'live') return { ...base, ...(await mock.getAdStatus(product, { country })) };
  const ctx = { country, settings };
  const providers = LIVE.filter((p) => p.caps.ads.length && enabled(settings, p));
  const parts = await Promise.allSettled(providers.map((p) => p.getAdStatus(product, ctx)));
  const merged = { ...base };
  for (const r of parts) {
    if (r.status !== 'fulfilled') continue; // API unavailable => keep the "Check manually" deep link
    for (const [k, v] of Object.entries(r.value || {})) if (v && v.status !== 'manual') merged[k] = { ...merged[k], ...v };
  }
  return merged;
}

/** Ad status for many products with limited concurrency (rate-limit friendly). */
export async function fetchAds(products, country, settings, concurrency = 4) {
  const out = {}, queue = [...products];
  const worker = async () => { while (queue.length) { const p = queue.shift(); out[p.id] = await adsFor(p, country, settings).catch(() => manualAds(p, country)); } };
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
  return out;
}

export async function fetchInterest(product, country, settings) {
  if (settings.dataMode !== 'live') return mock.getInterest(product, { country });
  const gt = LIVE.find((p) => p.id === 'googleTrends');
  if (!gt || !enabled(settings, gt)) throw new Error('Enable Google Trends in Settings to load interest history.');
  const r = await gt.getInterest(product, { country, settings });
  if (!r.series || r.series.length < 12) throw new Error('No interest history returned for this product.');
  return r;
}
