import { cleanText, num, safeUrl } from '../../utils/sanitize.js';

/** Deep links to the public ad libraries — the fallback when no API is available. */
export function adLinks(title, country = 'US') {
  const q = encodeURIComponent(title);
  return {
    facebook: `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${encodeURIComponent(country)}&q=${q}&search_type=keyword_unordered&media_type=all`,
    tiktok: `https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en?keyword=${q}`,
    pinterest: `https://www.pinterest.com/search/pins/?q=${q}%20sponsored`,
  };
}

/** Status for every platform = "Check manually" with a deep link. */
export function manualAds(product, country) {
  const links = adLinks(product.title, country);
  return Object.fromEntries(Object.keys(links).map((k) => [k, { status: 'manual', count: null, firstSeen: null, link: links[k], note: 'Check manually' }]));
}

const STATUSES = new Set(['active', 'not_found', 'unknown', 'manual']);
export function cleanAd(raw = {}, fallbackLink = '') {
  return {
    status: STATUSES.has(raw.status) ? raw.status : 'unknown',
    count: raw.count == null ? null : Math.round(num(raw.count, 0, 1e7, 0)),
    firstSeen: raw.firstSeen && !Number.isNaN(Date.parse(raw.firstSeen)) ? new Date(raw.firstSeen).toISOString().slice(0, 10) : null,
    link: safeUrl(raw.link) || fallbackLink,
    note: cleanText(raw.note, 160),
  };
}

/**
 * Provider (adapter) interface. Every data source implements the same three methods:
 *   getTrending({country, category}, ctx)  -> Product[]
 *   getAdStatus(product, ctx)              -> Partial<AdMap>   (only the platforms it knows about)
 *   getInterest(product, ctx)              -> { series: number[] }   (60 monthly points)
 * ctx = { country, settings }
 */
export class BaseProvider {
  constructor(id, name, caps = {}) {
    this.id = id;
    this.name = name;
    this.caps = { trending: false, ads: [], interest: false, ...caps };
  }
  async getTrending() { throw new Error(`${this.name} does not provide trending products.`); }
  async getAdStatus() { return {}; }
  async getInterest() { throw new Error(`${this.name} does not provide interest history.`); }
}
