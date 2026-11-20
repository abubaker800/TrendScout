# TrendScout Privacy Policy
_Last updated: 2026-11-11. Replace the contact placeholder with your own before publishing._

**Summary:** TrendScout stores your data locally in your browser. It has no analytics, no ads, and does not sell or share personal data.

## Data stored in your browser (chrome.storage.local)
Settings, API keys you choose to enter, watchlist, profit-calculator inputs, cached results, a list of connected stores (label, scopes, opaque session id) and a local audit log of listing actions. You can delete everything at any time with **Revoke access & delete data**.

## Data sent off-device
- **Demo mode (default):** no personal data. If "show product photos" is on, the browser requests keyword-based sample photos from loremflickr.com (your IP address is visible to that service). Turn it off in Settings for zero requests.
- **Live mode:** product titles, your chosen country/category and (if you entered one) your API key are sent to **the server URL you configure** (your own proxy), which queries the data providers (e.g. SerpApi, Rainforest, Meta).
- **Page scanner (optional, can be disabled):** on Amazon, AliExpress and Shopify product pages the extension reads the product title, price and review count and processes them locally / via your server. No other page content, browsing history or personal data is read.
- **Store listing:** when you press "Allow & List", the product title, description, price, tags and status you confirmed are sent to your server and then to your store (Shopify/WooCommerce). Store access tokens are stored encrypted on your server and never in the extension.

## Limited Use
Data obtained through store APIs and browser permissions is used only to provide the user-facing features described above. It is not transferred for advertising, sold, or used for creditworthiness or unrelated purposes, and humans do not read it except with your consent, for security, or to comply with law.

## Retention & your rights
Local data persists until you delete it. Server-side tokens are deleted when you disconnect a store or revoke access. Contact: **[your-email@example.com]**.
