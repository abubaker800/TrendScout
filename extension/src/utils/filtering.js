import { estimateSales } from '../services/estimators/sales.js';
import { classifySeasonality } from '../services/estimators/seasonality.js';
import { activePlatforms, isHot, PLATFORM_IDS } from './format.js';

export const SORT_OPTIONS = [
  { id: 'hottest', label: 'Hottest (trend score)' },
  { id: 'newest', label: 'Newest' },
  { id: 'sales', label: 'Est. monthly sales' },
  { id: 'price_asc', label: 'Price: low → high' },
  { id: 'price_desc', label: 'Price: high → low' },
  { id: 'title', label: 'Title A–Z' },
];
export const AD_FILTERS = [
  { id: 'any', label: 'Any ad status' },
  { id: 'hot', label: 'Hot (2+ platforms)' },
  { id: 'active', label: 'Active on any platform' },
  { id: 'none', label: 'No ads found' },
];

/** Adds derived metrics (sales estimate + seasonality) to a product. */
export const enrichProduct = (p, assumptions) => ({ ...p, est: estimateSales(p, assumptions), season: p.series ? classifySeasonality(p.series) : null });

const CMP = {
  hottest: (a, b) => b.trendScore - a.trendScore,
  newest: (a, b) => (b.firstSeen || '').localeCompare(a.firstSeen || '') || b.trendScore - a.trendScore,
  sales: (a, b) => (b.est?.expected || 0) - (a.est?.expected || 0),
  price_asc: (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity),
  price_desc: (a, b) => (b.price ?? -1) - (a.price ?? -1),
  title: (a, b) => a.title.localeCompare(b.title),
};

export function filterAndSort(list, f) {
  const q = (f.search || '').trim().toLowerCase();
  const min = f.priceMin === '' || f.priceMin == null ? null : Number(f.priceMin);
  const max = f.priceMax === '' || f.priceMax == null ? null : Number(f.priceMax);
  return list
    .filter((p) =>
      (!q || p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.source.toLowerCase().includes(q)) &&
      (min == null || (p.price != null && p.price >= min)) &&
      (max == null || (p.price != null && p.price <= max)) &&
      p.trendScore >= (Number(f.minScore) || 0) &&
      (f.seasonality === 'any' || p.season?.type === f.seasonality))
    .sort(CMP[f.sort] || CMP.hottest);
}

export function adPass(ads, mode) {
  if (mode === 'any') return true;
  if (!ads) return false;
  if (mode === 'hot') return isHot(ads);
  if (mode === 'active') return activePlatforms(ads).length > 0;
  if (mode === 'none') return PLATFORM_IDS.every((k) => ads[k]?.status === 'not_found');
  return true;
}
