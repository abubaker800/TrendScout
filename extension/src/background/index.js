// MV3 service worker: message router, caching, alarms/notifications, store connect + listing + audit.
// Holds NO secrets: store tokens live on the proxy server; the extension only keeps an opaque session id.
import { MSG, registerHandlers } from '../utils/messaging.js';
import { cacheGet, cachePurge, cacheSet } from '../utils/cache.js';
import { fetchJson } from '../utils/http.js';
import { cleanText, num, sanitizeListing, sanitizeProduct } from '../utils/sanitize.js';
import { CATEGORIES, DEFAULT_SETTINGS } from '../utils/constants.js';
import { isHot } from '../utils/format.js';
import { estimateSales, mergeAssumptions } from '../services/estimators/sales.js';
import { classifySeasonality } from '../services/estimators/seasonality.js';
import { fetchAds, fetchInterest, fetchTrending } from '../services/providers/index.js';
import { seriesForTitle } from '../services/providers/mock.js';
import { createRemoteProduct, normalizeStoreAddress, oauthStartUrl, parseOAuthResult, revokeRemote } from '../services/listing.js';

const HOUR = 3600e3;

// ---------- state helpers ----------
async function getApp() {
  const o = await chrome.storage.local.get('ts-app');
  try { return JSON.parse(o['ts-app'] || '{}').state || {}; } catch { return {}; }
}
async function getSettings() {
  const s = (await getApp()).settings || {};
  return { ...DEFAULT_SETTINGS, ...s, assumptions: mergeAssumptions(s.assumptions), apiKeys: { ...DEFAULT_SETTINGS.apiKeys, ...s.apiKeys }, enabledProviders: { ...DEFAULT_SETTINGS.enabledProviders, ...s.enabledProviders } };
}
async function requireConsent() {
  if (!(await getApp()).consent?.accepted) throw new Error('Please accept the onboarding terms first.');
}
const getStores = async () => (await chrome.storage.local.get('stores')).stores || [];
const setStores = (stores) => chrome.storage.local.set({ stores });
async function audit(entry) {
  const { audit: cur = [] } = await chrome.storage.local.get('audit');
  cur.unshift({ id: crypto.randomUUID(), ts: new Date().toISOString(), actor: 'Store owner (confirmed in TrendScout)', ...entry });
  await chrome.storage.local.set({ audit: cur.slice(0, 1000) });
}
const cleanCountry = (c) => (/^[A-Z]{2}$/.test(c) ? c : 'US');

// ---------- one-time confirmation tokens (fresh confirmation for every listing action) ----------
async function issueNonce(count) {
  const nonce = crypto.randomUUID();
  const { nonces = {} } = await chrome.storage.session.get('nonces');
  for (const k of Object.keys(nonces)) if (nonces[k].exp < Date.now()) delete nonces[k];
  nonces[nonce] = { exp: Date.now() + 5 * 60e3, count };
  await chrome.storage.session.set({ nonces });
  return nonce;
}
async function consumeNonce(nonce, count) {
  const { nonces = {} } = await chrome.storage.session.get('nonces');
  const e = nonces[nonce];
  if (!e || e.exp < Date.now() || e.count !== count) throw new Error('Confirmation expired or invalid. Please confirm again.');
  delete nonces[nonce];
  await chrome.storage.session.set({ nonces });
}

// ---------- handlers ----------
const handlers = {
  async [MSG.GET_TRENDING]({ country, category, force } = {}) {
    await requireConsent();
    country = cleanCountry(country);
    category = CATEGORIES.includes(category) ? category : 'All';
    const settings = await getSettings();
    const key = `trending:${settings.dataMode}:${country}:${category}`;
    if (!force) { const hit = await cacheGet(key); if (hit) return hit; }
    const out = { ...(await fetchTrending({ country, category }, settings)), fetchedAt: Date.now() };
    await cacheSet(key, out, (settings.dataMode === 'live' ? Math.max(1, settings.refreshHours) : 1) * HOUR);
    return out;
  },

  async [MSG.GET_ADS_BATCH]({ products, country } = {}) {
    await requireConsent();
    if (!Array.isArray(products) || products.length > 60) throw new Error('Invalid request.');
    country = cleanCountry(country);
    const settings = await getSettings();
    const out = {}, missing = [];
    for (const raw of products) {
      const p = sanitizeProduct(raw);
      if (!p.id || !p.title) continue;
      const hit = await cacheGet(`ads:${settings.dataMode}:${country}:${p.id}`);
      if (hit) out[p.id] = hit; else missing.push(p);
    }
    const fresh = await fetchAds(missing, country, settings);
    for (const [id, ads] of Object.entries(fresh)) { out[id] = ads; await cacheSet(`ads:${settings.dataMode}:${country}:${id}`, ads, 6 * HOUR); }
    return out;
  },

  async [MSG.GET_INTEREST]({ product, country } = {}) {
    await requireConsent();
    const p = sanitizeProduct(product || {});
    if (!p.title) throw new Error('Invalid product.');
    country = cleanCountry(country);
    const settings = await getSettings();
    const key = `interest:${settings.dataMode}:${country}:${p.id}`;
    const hit = await cacheGet(key);
    if (hit) return hit;
    const r = await fetchInterest(p, country, settings);
    await cacheSet(key, r, 24 * HOUR);
    return r;
  },

  async [MSG.REQUEST_CONFIRMATION]({ count } = {}) {
    await requireConsent();
    const n = Math.round(num(count, 1, 50, 0));
    if (!n) throw new Error('Nothing to confirm.');
    return issueNonce(n);
  },

  /** The ONLY code path that creates products in a store. Requires a fresh, single-use confirmation token. */
  async [MSG.LIST_PRODUCTS]({ storeId, items, nonce, status } = {}) {
    await requireConsent();
    if (!Array.isArray(items) || !items.length || items.length > 50) throw new Error('Between 1 and 50 products can be listed per confirmation.');
    const listingStatus = status === 'active' ? 'active' : 'draft';
    const clean = items.map(sanitizeListing); // validates everything before consuming the token
    await consumeNonce(nonce, clean.length);
    const store = (await getStores()).find((s) => s.id === storeId);
    if (!store) throw new Error('That store is no longer connected.');
    const settings = await getSettings();
    const results = [];
    for (const item of clean) {
      const base = { action: 'LIST_PRODUCT', storeId: store.id, storeLabel: store.label, platform: store.platform, title: item.title, price: item.price, status: listingStatus };
      try {
        const r = await createRemoteProduct(store, item, listingStatus, settings);
        await audit({ ...base, result: 'success', remoteId: r.remoteId });
        results.push({ ok: true, title: item.title, remoteId: r.remoteId, url: r.url });
      } catch (e) {
        const error = String(e?.message || e).slice(0, 200);
        await audit({ ...base, result: 'failed', error });
        results.push({ ok: false, title: item.title, error });
      }
    }
    return results;
  },

  async [MSG.CONNECT_STORE]({ platform, domain } = {}) {
    await requireConsent();
    const stores = await getStores();
    let store;
    if (platform === 'demo') {
      if (stores.some((s) => s.platform === 'demo')) throw new Error('The demo store is already connected.');
      store = { id: `demo-${crypto.randomUUID()}`, platform, label: 'Demo Store (local only)', sid: null, scopes: ['demo:write_products'], connectedAt: new Date().toISOString() };
    } else if (platform === 'shopify' || platform === 'woocommerce') {
      const settings = await getSettings();
      const target = normalizeStoreAddress(platform, domain);
      const url = oauthStartUrl(platform, target, settings, chrome.identity.getRedirectURL('oauth'));
      let finalUrl;
      try { finalUrl = await chrome.identity.launchWebAuthFlow({ url, interactive: true }); }
      catch (e) { throw new Error(`Authorization was cancelled or failed: ${e?.message || e}`); }
      const r = parseOAuthResult(finalUrl);
      store = { id: `${platform}-${r.sid.slice(0, 8)}`, platform, label: r.shop || target, sid: r.sid, scopes: r.scopes, connectedAt: new Date().toISOString() };
    } else throw new Error('Unsupported platform.');
    await setStores([...stores.filter((s) => !(s.platform === store.platform && s.label === store.label)), store]);
    await audit({ action: 'CONNECT_STORE', storeId: store.id, storeLabel: store.label, platform: store.platform, result: 'success' });
    return store;
  },

  async [MSG.DISCONNECT_STORE]({ storeId } = {}) {
    const stores = await getStores();
    const store = stores.find((s) => s.id === storeId);
    if (!store) return true;
    try { await revokeRemote(store, await getSettings()); }
    catch (e) { throw new Error(`Could not reach the server to revoke the token (${e.message}). The store was NOT disconnected — try again, or remove the app in your store admin.`); }
    await setStores(stores.filter((s) => s.id !== storeId));
    await audit({ action: 'DISCONNECT_STORE', storeId: store.id, storeLabel: store.label, platform: store.platform, result: 'success' });
    return true;
  },

  /** "Revoke access & delete data": revoke every store server-side, then wipe all local data. */
  async [MSG.REVOKE_ALL]() {
    const settings = await getSettings();
    const failed = [];
    const stores = await getStores();
    for (const s of stores) { try { await revokeRemote(s, settings); } catch { failed.push(s.label); } }
    await chrome.storage.local.clear();
    await chrome.storage.session.clear();
    return { revoked: stores.length - failed.length, failed };
  },

  /** Page-scanner overlay data (called from the content script; never touches store functions). */
  async [MSG.ANALYZE_PAGE_PRODUCT](page = {}) {
    const app = await getApp();
    if (!app.consent?.accepted || app.settings?.pageScanner === false) throw new Error('Page scanner is disabled.');
    const settings = await getSettings();
    const country = cleanCountry(app.filters?.country);
    const title = cleanText(page.title, 200);
    if (!title) throw new Error('No product title found.');
    const base = sanitizeProduct({ title, price: page.price, currency: page.currency, reviewsTotal: page.reviewsTotal, source: 'Page', country });
    let series, estimated = false;
    try { series = (await fetchInterest(base, country, settings)).series; } catch { series = seriesForTitle(title, country); estimated = true; }
    const trendScore = Math.round(Math.min(99, Math.max(5, (series.slice(-3).reduce((a, b) => a + b, 0) / 3) * 0.85)));
    const ads = (await fetchAds([{ ...base, trendScore }], country, settings))[base.id];
    return {
      title, price: base.price, currency: base.currency, trendScore, ads, hot: isHot(ads),
      est: estimateSales({ reviewsTotal: base.reviewsTotal }, settings.assumptions), season: classifySeasonality(series),
      demo: settings.dataMode !== 'live' || estimated,
    };
  },

  async [MSG.OPEN_DASHBOARD]() { await chrome.runtime.openOptionsPage(); return true; },

  async [MSG.TEST_SERVER]({ url } = {}) {
    if (!/^https?:\/\//.test(String(url || ''))) throw new Error('Enter a valid server URL.');
    const j = await fetchJson(`${String(url).replace(/\/+$/, '')}/health`, { retries: 0, timeoutMs: 6000 });
    return { name: cleanText(j.name || 'server', 60) };
  },

  async [MSG.PURGE_CACHE]() { return cachePurge(true); },
};
registerHandlers(handlers);

// ---------- background refresh of the watchlist + notifications ----------
async function refreshWatchlist() {
  const app = await getApp();
  if (!app.consent?.accepted) return;
  const items = Object.values(app.watchlist || {});
  if (!items.length) return;
  const settings = await getSettings();
  const { 'watch-snap': snap = {} } = await chrome.storage.local.get('watch-snap');
  const byCountry = {};
  for (const p of items) (byCountry[cleanCountry(p.country || app.filters?.country)] ||= []).push(p);
  const alerts = [];
  for (const [country, list] of Object.entries(byCountry)) {
    try {
      const { products } = await fetchTrending({ country, category: 'All' }, settings);
      const byId = new Map(products.map((p) => [p.id, p]));
      for (const w of list) {
        const fresh = byId.get(w.id);
        if (!fresh) continue;
        const prev = snap[w.id] ?? w.trendScore;
        if (fresh.trendScore - prev >= 10) alerts.push({ title: w.title, from: prev, to: fresh.trendScore });
        snap[w.id] = fresh.trendScore;
      }
    } catch { /* provider down — try again next cycle */ }
  }
  await chrome.storage.local.set({ 'watch-snap': snap });
  if (settings.notifications) {
    for (const a of alerts.slice(0, 3)) chrome.notifications.create(`ts-${Date.now()}-${Math.round(Math.random() * 1e6)}`, { type: 'basic', iconUrl: 'icons/icon128.png', title: `Trend rising: ${a.title}`.slice(0, 80), message: `Trend score ${a.from} → ${a.to}` });
  }
}

async function ensureAlarms() {
  const settings = await getSettings();
  const period = Math.max(1, settings.refreshHours) * 60;
  const cur = await chrome.alarms.get('watchlist-refresh');
  if (!cur || Math.abs((cur.periodInMinutes || 0) - period) > 1) chrome.alarms.create('watchlist-refresh', { delayInMinutes: 10, periodInMinutes: period });
  if (!(await chrome.alarms.get('cache-purge'))) chrome.alarms.create('cache-purge', { delayInMinutes: 30, periodInMinutes: 12 * 60 });
}
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === 'watchlist-refresh') refreshWatchlist();
  if (a.name === 'cache-purge') cachePurge();
});
chrome.runtime.onInstalled.addListener((d) => {
  ensureAlarms();
  if (d.reason === 'install') chrome.runtime.openOptionsPage(); // first run → onboarding screen
});
chrome.runtime.onStartup.addListener(ensureAlarms);
ensureAlarms();
