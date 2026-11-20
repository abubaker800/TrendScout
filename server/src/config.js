const ids = (process.env.ALLOWED_EXTENSION_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
export const config = {
  port: Number(process.env.PORT) || 3001,
  publicUrl: (process.env.PUBLIC_URL || 'http://localhost:3001').replace(/\/+$/, ''),
  prod: process.env.NODE_ENV === 'production',
  extensionIds: ids,
  shopify: { key: process.env.SHOPIFY_API_KEY, secret: process.env.SHOPIFY_API_SECRET, scopes: process.env.SHOPIFY_SCOPES || 'read_products,write_products' },
  keys: { serpapi: process.env.SERPAPI_KEY, rainforest: process.env.RAINFOREST_KEY, meta: process.env.META_ACCESS_TOKEN },
};
/** In development with no IDs configured any extension ID is accepted; in production an allow-list is mandatory. */
export const isAllowedExtensionId = (id) => (ids.length ? ids.includes(id) : !config.prod && /^[a-p]{32}$/.test(id));
export function isAllowedOrigin(origin) {
  const m = /^chrome-extension:\/\/([a-p]{32})$/.exec(origin || '');
  return !!m && isAllowedExtensionId(m[1]);
}
/** Only https://<allowed-id>.chromiumapp.org/... is an acceptable OAuth return target (prevents open redirects). */
export function validRedirect(u) {
  try {
    const x = new URL(u);
    return x.protocol === 'https:' && x.hostname.endsWith('.chromiumapp.org') && isAllowedExtensionId(x.hostname.split('.')[0]);
  } catch { return false; }
}
