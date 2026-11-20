# Permissions justification (manifest.json has no comments, so it lives here)

| Permission | Why it is needed | Used by |
|---|---|---|
| `storage` | Settings, watchlist, calculator inputs, cache, connected-store metadata, audit log | all contexts |
| `identity` | `chrome.identity.launchWebAuthFlow` for Shopify/WooCommerce OAuth (and `getRedirectURL`) | service worker |
| `alarms` | Periodic watchlist refresh and cache purge (no persistent background page in MV3) | service worker |
| `notifications` | Tell the user when a watched product's trend score jumps (can be turned off) | service worker |
| `sidePanel` | Optional side-panel UI | popup / side panel |
| `host_permissions: http://localhost:3001/*` | Talk to the user's local dev proxy server | service worker |
| `optional_host_permissions: https://*/*` | Requested at runtime **only** for the single server origin the user types in Settings | settings page |
| `content_scripts` matches (Amazon product pages `/dp/`, AliExpress `/item/`, `*.myshopify.com/products/`) | Optional page-scanner overlay. Reads only title, price, review count. Can be disabled in Settings | content script |

Deliberately **not** requested: `tabs`, `history`, `cookies`, `webRequest`, `<all_urls>`, `activeTab`, `scripting`, `declarativeNetRequest`.

**Single purpose:** product research and owner-approved store listing.
**Remote code:** none. All JS is bundled; Chart.js is bundled locally; no CDN, no eval. CSP: `script-src 'self'; object-src 'self'`.
**Data-use disclosures to tick in the dashboard:** website content (product page title/price/reviews), user activity? **No**. Certify: not sold, not used for unrelated purposes, not used for creditworthiness.
