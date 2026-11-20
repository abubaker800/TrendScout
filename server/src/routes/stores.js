import { Router } from 'express';
import { sessions } from '../lib/tokenStore.js';
import { ApiError } from '../lib/errors.js';

const router = Router();
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function auth(req, res, next) {
  const sid = req.get('X-Session');
  const s = sid && sessions.get(sid);
  if (!s) return next(new ApiError(401, 'Store session not found. Reconnect the store.'));
  req.sid = sid; req.session = s; next();
}

function validate(body) {
  const it = body?.item || {};
  const title = String(it.title || '').trim().slice(0, 255);
  const price = Number(it.price);
  if (!title) throw new ApiError(400, 'Title is required');
  if (!Number.isFinite(price) || price < 0 || price > 1e6) throw new ApiError(400, 'Invalid price');
  const tags = (Array.isArray(it.tags) ? it.tags : []).map((t) => String(t).trim().slice(0, 40)).filter(Boolean).slice(0, 20);
  const description = String(it.description || '').slice(0, 5000);
  const status = body.status === 'active' ? 'active' : 'draft'; // draft unless explicitly active
  return { title, price, tags, description, status };
}

async function upstream(r, label) {
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(502, `${label} error ${r.status}: ${JSON.stringify(j.errors || j.message || j).slice(0, 200)}`);
  return j;
}

router.post('/products', auth, async (req, res, next) => {
  try {
    const v = validate(req.body);
    const s = req.session;
    if (s.platform === 'shopify') {
      const j = await upstream(await fetch(`https://${s.shop}/admin/api/2024-10/products.json`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': s.token },
        body: JSON.stringify({ product: { title: v.title, body_html: esc(v.description).replace(/\n/g, '<br>'), tags: v.tags.join(', '), status: v.status, variants: [{ price: v.price.toFixed(2) }] } }),
      }), 'Shopify');
      return res.json({ id: j.product?.id, url: `https://${s.shop}/admin/products/${j.product?.id}` });
    }
    if (s.platform === 'woocommerce') {
      const j = await upstream(await fetch(`${s.site}/wp-json/wc/v3/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`${s.key}:${s.secret}`).toString('base64')}` },
        body: JSON.stringify({ name: v.title, type: 'simple', status: v.status === 'active' ? 'publish' : 'draft', regular_price: v.price.toFixed(2), description: esc(v.description).replace(/\n/g, '<br>'), tags: v.tags.map((name) => ({ name })) }),
      }), 'WooCommerce');
      return res.json({ id: j.id, url: j.permalink });
    }
    throw new ApiError(400, 'Unsupported platform');
  } catch (e) { next(e); }
});

router.delete('/session', auth, async (req, res) => {
  const s = req.session;
  try { // best-effort upstream revocation, then always delete our copy
    if (s.platform === 'shopify') await fetch(`https://${s.shop}/admin/api_permissions/current.json`, { method: 'DELETE', headers: { 'X-Shopify-Access-Token': s.token } });
    if (s.platform === 'woocommerce') await fetch(`${s.site}/wp-json/wc/v3/system_status`, { method: 'HEAD' }).catch(() => {});
  } catch { /* ignore */ }
  sessions.delete(req.sid);
  res.json({ ok: true });
});

export default router;
