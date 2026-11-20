// Page scanner (optional). Reads ONLY title / price / review count from the product page,
// asks the service worker for metrics, and shows a small closed-shadow-DOM overlay.
import { MSG, send } from '../utils/messaging.js';
import { cleanText, safeUrl } from '../utils/sanitize.js';
import { fmtInt, fmtMoney } from '../utils/format.js';

const HOST_ID = 'trendscout-overlay-host';
const q = (s) => document.querySelector(s);

function parseNumber(s) {
  if (s == null) return null;
  const m = /\d[\d.,\s]*/.exec(String(s));
  if (!m) return null;
  let t = m[0].replace(/\s/g, '').replace(/[.,]$/, '');
  const c = t.lastIndexOf(','), d = t.lastIndexOf('.');
  if (c > -1 && d > -1) t = c > d ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  else if (c > -1) t = /,\d{1,2}$/.test(t) ? t.replace(',', '.') : t.replace(/,/g, '');
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}
const parseCount = (s) => { const n = Number(String(s ?? '').replace(/[^\d]/g, '')); return Number.isFinite(n) && n > 0 ? n : null; };

function fromJsonLd() {
  for (const el of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(el.textContent);
      for (const n of [].concat(data, data?.['@graph'] || [])) {
        const t = n && n['@type'];
        if (t === 'Product' || (Array.isArray(t) && t.includes('Product'))) {
          const offer = [].concat(n.offers || [])[0] || {};
          return { title: n.name, price: parseNumber(offer.price ?? offer.lowPrice), currency: offer.priceCurrency, reviews: parseCount(n.aggregateRating?.reviewCount ?? n.aggregateRating?.ratingCount) };
        }
      }
    } catch { /* ignore malformed JSON-LD */ }
  }
  return {};
}

function extract() {
  const host = location.hostname, ld = fromJsonLd();
  let title, price, reviews;
  if (/amazon\./.test(host)) {
    title = q('#productTitle')?.textContent;
    price = parseNumber(q('.a-price .a-offscreen')?.textContent || q('#priceblock_ourprice')?.textContent);
    reviews = parseCount(q('#acrCustomerReviewText')?.textContent);
  } else if (/aliexpress\./.test(host)) {
    title = q('h1')?.textContent;
    price = parseNumber(q('[class*="price-default--current"], [class*="Price_Price"]')?.textContent);
    reviews = parseCount(q('[class*="reviewer--reviews"], [class*="rating--reviews"]')?.textContent);
  }
  const currency = ld.currency || q('meta[property="og:price:currency"]')?.content || null;
  return {
    title: cleanText(title || ld.title || q('meta[property="og:title"]')?.content || document.title, 200),
    price: price ?? ld.price ?? parseNumber(q('meta[property="og:price:amount"]')?.content),
    currency: /^[A-Z]{3}$/.test(currency || '') ? currency : null,
    reviewsTotal: reviews ?? ld.reviews ?? null,
  };
}

const CSS = `
:host{all:initial}
.box{position:fixed;right:16px;bottom:16px;width:310px;z-index:2147483647;font:13px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0B0B0C;color:#E8E8EA;border:1px solid #D4AF37;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.5);overflow:hidden}
.hd{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;background:linear-gradient(135deg,#F1CF5A,#B8921F);color:#0B0B0C;font-weight:800}
.hd button{all:unset;cursor:pointer;padding:2px 6px;border-radius:6px}.hd button:hover{background:rgba(0,0,0,.18)}
.bd{padding:10px;display:grid;gap:8px}.row{display:flex;justify-content:space-between;gap:8px;align-items:baseline}
.k{color:#8E8E94;font-size:11px;text-transform:uppercase;letter-spacing:.04em}.v{font-weight:700}
.b{display:inline-block;border-radius:999px;padding:1px 8px;font-size:11px;font-weight:600;margin:0 4px 4px 0;text-decoration:none}
.active{background:#4A3A0C;color:#F1CF5A}.not_found{background:#2A2A2E;color:#B9B9BE}.unknown{background:#453C2A;color:#E0D4B8}.manual{background:#2A2A2E;color:#F1CF5A;border:1px solid #6B6B72}.hot{background:#B3141C;color:#fff}
.note{color:#8E8E94;font-size:11px}.act{all:unset;cursor:pointer;background:linear-gradient(135deg,#F1CF5A,#B8921F);color:#0B0B0C;font-weight:700;text-align:center;border-radius:8px;padding:6px}
.collapsed .bd{display:none}`;

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (k === 'class') el.className = v; else if (k === 'onclick') el.addEventListener('click', v); else el.setAttribute(k, v); }
  for (const kid of kids.flat()) if (kid != null) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}
const LABEL = { active: 'Active', not_found: 'Not found', unknown: 'Unknown', manual: 'Check manually' };
const PLATFORMS = [['facebook', 'FB/IG'], ['tiktok', 'TikTok'], ['pinterest', 'Pinterest']];

function render(r) {
  const host = h('div', { id: HOST_ID });
  const root = host.attachShadow({ mode: 'closed' });
  const box = h('div', { class: 'box', role: 'complementary', 'aria-label': 'TrendScout metrics' });
  const toggle = h('button', { 'aria-label': 'Collapse', onclick: () => { box.classList.toggle('collapsed'); toggle.textContent = box.classList.contains('collapsed') ? '▴' : '▾'; } }, '▾');
  const close = h('button', { 'aria-label': 'Close', onclick: () => host.remove() }, '✕');
  const est = r.est?.available ? `${fmtInt(r.est.low)} – ${fmtInt(r.est.high)}` : 'n/a';
  const ads = PLATFORMS.map(([id, label]) => {
    const a = r.ads?.[id] || { status: 'unknown' };
    const href = safeUrl(a.link);
    const text = `${label}: ${LABEL[a.status] || 'Unknown'}${a.status === 'active' && a.count != null ? ` (${a.count})` : ''}`;
    return href ? h('a', { class: `b ${a.status}`, href, target: '_blank', rel: 'noopener noreferrer' }, text) : h('span', { class: `b ${a.status}` }, text);
  });
  box.append(
    h('div', { class: 'hd' }, h('span', {}, '📈 TrendScout', r.hot ? ' 🔥 Hot' : ''), h('span', {}, toggle, close)),
    h('div', { class: 'bd' },
      h('div', { class: 'row' }, h('span', { class: 'k' }, 'Trend score'), h('span', { class: 'v' }, `${r.trendScore}/100`)),
      h('div', { class: 'row' }, h('span', { class: 'k' }, 'Est. sales / month'), h('span', { class: 'v' }, est)),
      h('div', { class: 'row' }, h('span', { class: 'k' }, 'Confidence'), h('span', { class: 'v' }, r.est?.available ? r.est.confidence : '—')),
      h('div', { class: 'row' }, h('span', { class: 'k' }, 'Seasonality'), h('span', { class: 'v' }, r.season?.label || '—')),
      h('div', { class: 'note' }, r.season?.launch || ''),
      h('div', {}, ads),
      r.price != null ? h('div', { class: 'note' }, `Page price: ${fmtMoney(r.price, r.currency)}`) : null,
      h('button', { class: 'act', onclick: () => send(MSG.OPEN_DASHBOARD).catch(() => {}) }, 'Open TrendScout dashboard'),
      h('div', { class: 'note' }, `${r.demo ? 'Demo/estimated data. ' : ''}Estimates are approximations, not guarantees.`)),
  );
  root.append(h('style', {}, CSS), box);
  document.documentElement.append(host);
}

async function main() {
  if (document.getElementById(HOST_ID)) return;
  const data = extract();
  if (!data.title) return;
  try { render(await send(MSG.ANALYZE_PAGE_PRODUCT, data)); } catch { /* scanner disabled / no consent: stay invisible */ }
}
if (window.top === window) main();
