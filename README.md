<div align="center">

<img src="extension/public/icons/icon128.png" alt="TrendScout logo" width="96" height="96" />

# TrendScout

### Product research & store listing, right inside Chrome

Find trending products by country and category, estimate sales, ad activity, margins and seasonality, then list to **your own** store only after an explicit confirmation.

![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)
![Node](https://img.shields.io/badge/Node-%E2%89%A518-339933?logo=nodedotjs&logoColor=white)

</div>

---

## Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Live Data & API Keys](#-live-data--api-keys)
- [Running the Server](#-running-the-server)
- [Shopify & WooCommerce Setup](#-shopify--woocommerce-setup)
- [Publishing to the Chrome Web Store](#-publishing-to-the-chrome-web-store)
- [Safety & Privacy](#-safety--privacy)
- [Documentation](#-documentation)
- [Disclaimer](#-disclaimer)

---

## ✨ Features

| | Feature | Description |
|---|---|---|
| 🔥 | **Trending Explorer** | Discover trending products filtered by country and category |
| 📈 | **Sales Estimates** | Approximate sales volume for any product |
| 📣 | **Ad Activity** | See how heavily a product is being advertised |
| 💰 | **Profit Calculator** | Estimate margins from cost, price, shipping and fees |
| 🗓️ | **Seasonality** | Spot demand patterns with 5-year interest charts |
| 👀 | **Watchlist** | Save products and track them over time |
| 🛒 | **One-click Listing** | Push products to Shopify or WooCommerce, always with confirmation |
| 🧩 | **Page Integration** | Content scripts on Amazon, AliExpress and Shopify product pages |
| 📤 | **CSV Export** | Take your research data anywhere |
| 🧪 | **Demo Mode** | Works instantly with sample data, no API keys needed |

## 🧰 Tech Stack

- **Extension:** Chrome Manifest V3, React 18, Vite, Tailwind CSS, Zustand, Chart.js
- **Server (optional):** Node.js, Express, Helmet, rate limiting
- **Security:** AES-256-GCM encrypted token storage, strict extension CSP, no remote code

## 📁 Project Structure

```
trendscout/
├── extension/          Chrome extension source
│   └── src/
│       ├── popup/ dashboard/ sidepanel/    UI surfaces
│       ├── background/ content/            Service worker & content scripts
│       ├── services/
│       │   ├── providers/                  Google Trends, Amazon, Meta, ...
│       │   └── estimators/                 Sales, profit, seasonality
│       ├── components/ hooks/ store/ utils/
├── server/             Express proxy: OAuth, encrypted tokens, provider proxies
├── docs/               Permissions justification, store listing, test checklist
└── scripts/            Build, icon generation, zip packaging, self-tests
```

## 🚀 Quick Start

**Requirements:** Node.js 18 or newer.

```bash
# 1. Install dependencies
npm install

# 2. Build the extension (output goes to dist/)
npm run build
```

**Load it in Chrome**

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked** and select the **`dist`** folder
4. The dashboard opens on first install. Accept the onboarding screen.

The extension works immediately with **demo data**. No keys required.

### Useful scripts

| Command | What it does |
|---|---|
| `npm run dev` | Watch mode. Reload the extension in `chrome://extensions` after changes |
| `npm run build` | Production build into `dist/` |
| `npm test` | Unit checks for estimators, sanitizers and the mock provider |
| `npm run zip` | Package `trendscout-extension.zip` for the Chrome Web Store |
| `npm run server` | Start the proxy server |

## 🔑 Live Data & API Keys

Go to **Dashboard → Settings → Data source**, choose **Live data**, set your server URL and enable providers.

Keys are best kept in `server/.env` so they never enter the extension.

| Provider | Status |
|---|---|
| Google Trends | Via SerpApi (`SERPAPI_KEY`): trending searches and 5-year interest |
| Amazon Best Sellers | Via Rainforest API (`RAINFOREST_KEY`): US, GB, DE, CA, IN, AU, FR, IT, ES, JP |
| Meta Ad Library | `META_ACCESS_TOKEN`. Commercial ads are returned for EU/UK only; elsewhere the UI shows **Check manually** |
| AliExpress, TikTok Creative Center, Pinterest | No open public API. The UI falls back to deep links. Wire in an approved partner API in `server/src/routes/providers.js` |

## 🖥️ Running the Server

```bash
cd server
npm install
cp .env.example .env
# Fill in .env: TOKEN_ENC_KEY, ALLOWED_EXTENSION_IDS, Shopify and provider keys
npm start          # http://localhost:3001
```

Generate an encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

In the extension, **Settings → Test connection** should show a ✓. Use HTTPS for any non-localhost server.

## 🛍️ Shopify & WooCommerce Setup

<details>
<summary><b>Shopify</b></summary>

1. In the Shopify Partner dashboard, go to **Apps → Create app**.
2. Set **App URL** to your server's `PUBLIC_URL`, and **Allowed redirection URL** to `PUBLIC_URL/auth/shopify/callback`.
3. Use scopes `read_products, write_products` only. Copy the Client ID and secret into `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET`.
4. In the extension, open **Stores & Permissions → Shopify**, enter `your-store.myshopify.com` and click **Connect**.
5. Tokens are AES-256-GCM encrypted on the server. The extension only holds an opaque session ID.

</details>

<details>
<summary><b>WooCommerce</b></summary>

Connect with `https://your-store.com`. The `wc-auth` flow needs an HTTPS callback, so use a tunnel such as ngrok during development and set `PUBLIC_URL` to it.

</details>

> 💡 Connect the built-in **Demo store** to test the full permission flow without any external account.

## 📦 Publishing to the Chrome Web Store

1. Run `npm run zip`, then upload `trendscout-extension.zip` in the [Developer Dashboard](https://chrome.google.com/webstore/devconsole) (one-time $5 fee).
2. Fill the listing from [`docs/STORE_LISTING.md`](docs/STORE_LISTING.md) and add 1280×800 screenshots.
3. Complete the privacy tab using [`PRIVACY_POLICY.md`](PRIVACY_POLICY.md) and [`docs/PERMISSIONS_JUSTIFICATION.md`](docs/PERMISSIONS_JUSTIFICATION.md).
4. Host the server over HTTPS and set `ALLOWED_EXTENSION_IDS` to the published extension ID.
5. Submit for review.

## 🛡️ Safety & Privacy

- **Consent first:** an onboarding gate must be accepted before anything works.
- **Explicit confirmation:** every listing shows a modal (store, editable fields, Draft/Active) and uses a one-time 5-minute token. Bulk listing shows the full list in one confirmation.
- **Draft by default**, minimum OAuth scopes, no tokens in the extension, none logged.
- **No duplicates:** listing calls are never retried.
- **Your data, your control:** one-click **Revoke access & delete data**.
- **Hardened:** all remote data is sanitized, strict CSP, no remote code, no CDNs.

## 📚 Documentation

- [Privacy Policy](PRIVACY_POLICY.md)
- [Terms of Service](TERMS.md)
- [Permissions Justification](docs/PERMISSIONS_JUSTIFICATION.md)
- [Store Listing](docs/STORE_LISTING.md)
- [Test Checklist](docs/TEST_CHECKLIST.md)

## ⚠️ Disclaimer

Sales, ad and margin figures are **estimates, not guarantees**. Prefer official APIs and respect each platform's Terms of Service and robots.txt.

---

<div align="center">

Built by **Muhammad Abubaker** · [GitHub](https://github.com/abubaker800)

</div>
