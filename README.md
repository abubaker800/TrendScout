# TrendScout – Product Research & Store Lister

Manifest V3 Chrome extension (React 18 + Vite + Tailwind + Zustand + Chart.js) with an optional Express proxy server.
Find trending products by country/category, estimate sales, ad activity, margins and seasonality, and list products to **your own** store only after an explicit confirmation.

```
/extension   src/{popup,dashboard,sidepanel,background,content,services/{providers,estimators},store,components,hooks,utils}
/server      Express proxy: OAuth (Shopify, WooCommerce), encrypted token store, provider proxies
/docs        Permissions justification, store listing text, test checklist
/scripts     build-zip.js, gen-icons.js, clean.js, selftest.js
```

## 1. Install & build
Requires Node 18+.
```bash
npm install
npm run build          # → dist/   (icons are generated automatically)
npm run zip            # → trendscout-extension.zip (upload to Chrome Web Store) + trendscout-source.zip
npm test               # unit checks for estimators / sanitizers / mock provider
npm run dev            # watch mode (reload the extension in chrome://extensions after changes)
```

## 2. Load unpacked
`chrome://extensions` → enable **Developer mode** → **Load unpacked** → select the **`dist`** folder.
The dashboard opens on first install; accept the onboarding screen. The extension works immediately with **demo data** and needs no keys.

## 3. Add API keys / switch to live data
Dashboard → **Settings → Data source** → choose **Live data**, set the server URL, enable providers.
Preferred: put keys in `server/.env` (they never enter the extension). Optionally paste a key per provider in Settings; it is sent only to your own server in an `X-Provider-Key` header.

| Provider | Status |
|---|---|
| Google Trends | via SerpApi (`SERPAPI_KEY`) – trending searches + 5-year interest |
| Amazon Best Sellers | via Rainforest API (`RAINFOREST_KEY`), US/GB/DE/CA/IN/AU/FR/IT/ES/JP |
| Meta Ad Library | `META_ACCESS_TOKEN`; the API returns commercial ads only for EU/UK, elsewhere the UI shows **Check manually** |
| AliExpress, TikTok Creative Center, Pinterest | no open public API: server answers 501 → UI falls back to deep links ("Check manually"). Wire in an approved partner API in `server/src/routes/providers.js` |

## 4. Run the server
```bash
cd server && npm install && cp .env.example .env
# fill .env: TOKEN_ENC_KEY (64 hex), ALLOWED_EXTENSION_IDS (ID from chrome://extensions), Shopify keys, provider keys
npm start               # http://localhost:3001
```
Settings → **Test connection** should show ✓. For a non-localhost server use HTTPS; the extension asks for host permission when you save the URL.

## 5. Shopify app + OAuth redirect
1. Shopify Partner dashboard → **Apps → Create app** (custom/public).
2. **App URL**: `PUBLIC_URL` of your server. **Allowed redirection URL**: `PUBLIC_URL/auth/shopify/callback`.
3. Scopes: `read_products, write_products` only. Copy Client ID/secret into `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET`.
4. Extension → Stores & Permissions → Shopify → `your-store.myshopify.com` → Connect. The extension uses `chrome.identity.launchWebAuthFlow`; its return URL is `https://<extension-id>.chromiumapp.org/oauth` (the server only redirects to IDs in `ALLOWED_EXTENSION_IDS`).
5. Tokens are AES-256-GCM encrypted in `server/data/sessions.json`; the extension holds only an opaque session id.

**WooCommerce**: Connect with `https://your-store.com`. WooCommerce's `wc-auth` flow requires HTTPS for the server callback — use a tunnel (e.g. ngrok) with `PUBLIC_URL` set to it during development.
**Demo store**: connect it to test the full permission flow with no external account.

## 6. Publish to the Chrome Web Store
1. `npm run zip`, then upload **trendscout-extension.zip** at <https://chrome.google.com/webstore/devconsole> (one-time $5 developer fee).
2. Fill the listing from `docs/STORE_LISTING.md`; add 1280×800 screenshots (checklist there) and the 128px icon.
3. Privacy tab: paste/host `PRIVACY_POLICY.md`, declare data use per `docs/PERMISSIONS_JUSTIFICATION.md` (limited-use, no remote code, single purpose).
4. Host the server over HTTPS, set `ALLOWED_EXTENSION_IDS` to the published ID, and update the extension's default server URL if you ship a hosted one.
5. Submit for review; content-script host permissions (Amazon/AliExpress/Shopify) may trigger an in-depth review — the justification doc covers them.

## Safety model
- Onboarding consent gate before anything works.
- Every listing: confirmation modal (store, editable fields, Draft/Active) → one-time 5-minute confirmation token consumed by the service worker → audit log entry. Bulk = one confirmation showing the entire list. Listing calls are never retried (no duplicates).
- Draft by default. Minimum scopes. No tokens in the extension, none logged.
- One-click **Revoke access & delete data**.
- All remote/scraped data is sanitized; strict extension CSP; no remote code; no CDNs.
- Estimates are approximations, not guarantees. Prefer official APIs; respect each platform's ToS and robots.txt.
