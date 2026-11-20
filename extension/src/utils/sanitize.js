// Every piece of remote/scraped data goes through here before it is stored or rendered.
// React escapes text on render; this adds type-checking, length limits and URL allow-listing.

export function cleanText(v, max = 300) {
  if (v == null) return '';
  return String(v).replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
export function cleanMultiline(v, max = 5000) {
  if (v == null) return '';
  return String(v).replace(/<[^>]*>/g, '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/\r\n/g, '\n').trim().slice(0, max);
}
export function safeUrl(u) {
  try { const x = new URL(String(u)); return x.protocol === 'https:' || x.protocol === 'http:' ? x.toString() : ''; } catch { return ''; }
}
export function safeImage(u) {
  if (typeof u === 'string' && u.startsWith('data:image/svg+xml')) return u.length < 4000 ? u : '';
  return safeUrl(u).startsWith('https:') ? String(u) : '';
}
export function num(v, min = -Infinity, max = Infinity, fallback = 0) {
  const n = Number(v);
  if (v === null || v === '' || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
export const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
export const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const validDate = (d) => (d && !Number.isNaN(Date.parse(d)) ? new Date(d).toISOString().slice(0, 10) : null);

/** @returns {import('./types.js').Product} */
export function sanitizeProduct(raw = {}) {
  const title = cleanText(raw.title, 160);
  const series = Array.isArray(raw.series) ? raw.series.slice(-60).map((v) => num(v, 0, 100, 0)) : null;
  return {
    id: cleanText(raw.id, 120) || slugify(title),
    title,
    price: num(raw.price, 0, 1e7, null),
    currency: /^[A-Z]{3}$/.test(raw.currency) ? raw.currency : 'USD',
    category: cleanText(raw.category, 40) || 'Other',
    image: safeImage(raw.image),
    trendScore: Math.round(num(raw.trendScore, 0, 100, 0)),
    reviewsPerMonth: num(raw.reviewsPerMonth, 0, 1e7, null),
    reviewsTotal: num(raw.reviewsTotal, 0, 1e9, null),
    monthlyVisits: num(raw.monthlyVisits, 0, 1e10, null),
    source: cleanText(raw.source, 40) || 'Unknown',
    link: safeUrl(raw.link),
    firstSeen: validDate(raw.firstSeen),
    series: series && series.length >= 12 ? series : null,
    country: /^[A-Z]{2}$/.test(raw.country) ? raw.country : null,
  };
}

/** Listing payload sent to a store — strict validation (also re-validated on the server). */
export function sanitizeListing(raw = {}) {
  const title = cleanText(raw.title, 255);
  if (!title) throw new Error('Product title is required.');
  const price = num(raw.price, 0, 1e6, NaN);
  if (!Number.isFinite(price)) throw new Error(`Invalid price for "${title}".`);
  const tags = (Array.isArray(raw.tags) ? raw.tags : String(raw.tags || '').split(',')).map((t) => cleanText(t, 40)).filter(Boolean).slice(0, 20);
  return { title, description: cleanMultiline(raw.description, 5000), price: Math.round(price * 100) / 100, tags, category: cleanText(raw.category, 60), sourceUrl: safeUrl(raw.sourceUrl) };
}
