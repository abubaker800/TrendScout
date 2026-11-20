// Talks to the proxy server for store operations. No credentials ever pass through here —
// only an opaque session id (sid); the Shopify/Woo token lives encrypted on the server.
import { fetchJson } from '../utils/http.js';
import { cleanText } from '../utils/sanitize.js';

const baseUrl = (settings) => {
  const b = String(settings.serverUrl || '').replace(/\/+$/, '');
  if (!/^https?:\/\//.test(b)) throw new Error('Set a valid server URL in Settings first.');
  return b;
};

export function normalizeStoreAddress(platform, input) {
  const raw = String(input || '').trim();
  if (platform === 'shopify') {
    const host = raw.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(host)) throw new Error('Enter your store’s .myshopify.com address, e.g. my-store.myshopify.com');
    return host;
  }
  let u;
  try { u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); } catch { throw new Error('Enter a valid store URL.'); }
  if (u.protocol !== 'https:') throw new Error('WooCommerce stores must use HTTPS.');
  return u.origin;
}

export function oauthStartUrl(platform, target, settings, redirect) {
  const param = platform === 'shopify' ? 'shop' : 'site';
  return `${baseUrl(settings)}/auth/${platform}/start?${param}=${encodeURIComponent(target)}&redirect=${encodeURIComponent(redirect)}`;
}

export function parseOAuthResult(finalUrl) {
  const q = new URL(finalUrl).searchParams;
  if (q.get('error')) throw new Error(`Store authorization failed: ${cleanText(q.get('error'), 120)}`);
  const sid = q.get('sid') || '';
  if (!/^[a-f0-9]{32,64}$/.test(sid)) throw new Error('Invalid authorization response from the server.');
  return { sid, shop: cleanText(q.get('shop'), 160), scopes: (q.get('scope') || '').split(',').map((s) => cleanText(s, 40)).filter(Boolean) };
}

/** Creates ONE product. retries:0 on purpose — a retried POST could create duplicates. */
export async function createRemoteProduct(store, item, status, settings) {
  if (store.platform === 'demo') return { remoteId: `demo-${crypto.randomUUID().slice(0, 8)}`, url: null };
  const r = await fetchJson(`${baseUrl(settings)}/api/stores/products`, { method: 'POST', headers: { 'X-Session': store.sid }, body: { item, status }, retries: 0, timeoutMs: 25000 });
  return { remoteId: String(r.id || ''), url: r.url || null };
}

export async function revokeRemote(store, settings) {
  if (store.platform === 'demo' || !store.sid) return;
  await fetchJson(`${baseUrl(settings)}/api/stores/session`, { method: 'DELETE', headers: { 'X-Session': store.sid }, retries: 1 });
}
