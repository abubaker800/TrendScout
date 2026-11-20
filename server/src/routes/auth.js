import crypto from 'node:crypto';
import { Router } from 'express';
import { config, validRedirect } from '../config.js';
import { pendingAuth, sessions } from '../lib/tokenStore.js';

const router = Router();
const back = (redirect, params) => `${redirect}${redirect.includes('?') ? '&' : '?'}${new URLSearchParams(params)}`;
const fail = (res, redirect, error) => (validRedirect(redirect) ? res.redirect(back(redirect, { error })) : res.status(400).send(error));

function verifyShopifyHmac(query) {
  const { hmac, ...rest } = query;
  if (typeof hmac !== 'string') return false;
  const msg = Object.keys(rest).sort().map((k) => `${k}=${Array.isArray(rest[k]) ? rest[k].join(',') : rest[k]}`).join('&');
  const digest = crypto.createHmac('sha256', config.shopify.secret).update(msg).digest('hex');
  return digest.length === hmac.length && crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
}

// ---------- Shopify ----------
router.get('/shopify/start', (req, res) => {
  const { shop, redirect } = req.query;
  if (!validRedirect(redirect)) return res.status(400).send('Invalid redirect');
  if (!config.shopify.key || !config.shopify.secret) return fail(res, redirect, 'Server is missing SHOPIFY_API_KEY / SHOPIFY_API_SECRET');
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(String(shop))) return fail(res, redirect, 'Invalid shop domain');
  const state = crypto.randomBytes(16).toString('hex');
  pendingAuth.set(state, { shop: String(shop).toLowerCase(), redirect });
  const url = new URL(`https://${String(shop).toLowerCase()}/admin/oauth/authorize`);
  url.search = new URLSearchParams({ client_id: config.shopify.key, scope: config.shopify.scopes, redirect_uri: `${config.publicUrl}/auth/shopify/callback`, state }).toString();
  res.redirect(url.toString());
});

router.get('/shopify/callback', async (req, res, next) => {
  try {
    const { shop, code, state } = req.query;
    const p = pendingAuth.take(String(state));
    if (!p) return res.status(400).send('Authorization expired. Please try again from the extension.');
    if (req.query.error) return fail(res, p.redirect, String(req.query.error_description || req.query.error).slice(0, 120));
    if (!verifyShopifyHmac(req.query) || String(shop).toLowerCase() !== p.shop) return fail(res, p.redirect, 'Invalid signature');
    const r = await fetch(`https://${p.shop}/admin/oauth/access_token`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: config.shopify.key, client_secret: config.shopify.secret, code }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.access_token) return fail(res, p.redirect, 'Token exchange failed');
    const sid = sessions.set(sessions.newId(), { platform: 'shopify', shop: p.shop, token: j.access_token, scopes: String(j.scope || '') });
    res.redirect(back(p.redirect, { sid, shop: p.shop, scope: String(j.scope || '') }));
  } catch (e) { next(e); }
});

// ---------- WooCommerce (wc-auth) ----------
router.get('/woocommerce/start', (req, res) => {
  const { site, redirect } = req.query;
  if (!validRedirect(redirect)) return res.status(400).send('Invalid redirect');
  let origin;
  try { const u = new URL(String(site)); if (u.protocol !== 'https:') throw new Error(); origin = u.origin; } catch { return fail(res, redirect, 'Store must be a valid HTTPS URL'); }
  const sid = sessions.newId();
  pendingAuth.set(sid, { site: origin, redirect });
  const url = new URL(`${origin}/wc-auth/v1/authorize`);
  url.search = new URLSearchParams({
    app_name: 'TrendScout', scope: 'write', user_id: sid,
    return_url: `${config.publicUrl}/auth/woocommerce/return?sid=${sid}`, callback_url: `${config.publicUrl}/auth/woocommerce/callback`,
  }).toString();
  res.redirect(url.toString());
});

// WooCommerce POSTs the generated keys here (server-to-server)
router.post('/woocommerce/callback', (req, res) => {
  const { user_id: sid, consumer_key: ck, consumer_secret: cs, key_permissions: perm } = req.body || {};
  const p = pendingAuth.peek(String(sid));
  if (!p || !ck || !cs) return res.status(400).json({ error: 'Unknown authorization' });
  sessions.set(String(sid), { platform: 'woocommerce', site: p.site, key: String(ck), secret: String(cs), scopes: String(perm || 'write') });
  res.json({ ok: true });
});
router.get('/woocommerce/return', (req, res) => {
  const sid = String(req.query.sid || '');
  const p = pendingAuth.take(sid);
  if (!p) return res.status(400).send('Authorization expired. Please try again from the extension.');
  const s = sessions.get(sid);
  if (!s) return fail(res, p.redirect, 'Access was not granted');
  res.redirect(back(p.redirect, { sid, shop: p.site, scope: s.scopes }));
});

export default router;
