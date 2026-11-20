# Test checklist
Run `npm run build`, load `dist/` unpacked, open the service-worker console and each page's console: expect **no errors**.

**Onboarding / permission flow**
- [ ] Fresh install opens dashboard with onboarding; nothing else works until the box is ticked and Accept is pressed
- [ ] Popup/side panel show onboarding too when not accepted
- [ ] Stores → Connect **Demo store** → appears with scope `demo:write_products` and an audit entry
- [ ] Click **List…** on a product: modal shows product, store, editable title/description/price/tags, Draft/Active; **Allow & List** is disabled until the ownership checkbox is ticked
- [ ] Cancel / ✕ / Esc → nothing created, no audit entry
- [ ] Allow & List → success row; audit log has LIST_PRODUCT (draft); repeating requires a new confirmation
- [ ] Select 3 rows → “List 3 selected…” → ONE modal listing all 3 → single confirm → 3 audit entries
- [ ] Failure path: stop the server with a Shopify store connected → error shown per item, audit result = failed
- [ ] Disconnect store → removed + audit entry; **Revoke access & delete data** (type DELETE) → onboarding returns, storage empty
- [ ] Shopify: OAuth consent shows only read/write products; product arrives as Draft; token not visible in extension storage (`chrome.storage.local` has only `sid`)

**Trending finder** — country auto-detected; change country/category reloads; search, price range, min score, ad filter, seasonality filter, 6 sort options, pagination, loading / empty / error states (stop server in Live mode), CSV opens in Excel with no formula injection (`=` prefixed cells start with `'`).
**Sales estimator** — low ≤ expected ≤ high; tooltip shows formula; changing assumptions in Settings changes numbers; confidence label present.
**Ad spy** — FB/TikTok/Pinterest badges, counts, first-seen, library links open; Live mode without keys shows “Check manually”; 2+ active → 🔥 Hot.
**Profit calculator** — default 2.9% + $0.30; margin red <15 / yellow 15–30 / green >30; ROI, break-even ROAS, monthly profit; values persist after reload; Reset works.
**Seasonality** — 12-month/5-year toggle; classification matches the curve (e.g. Heated/Holiday items = Seasonal with Dec peak; Crochet Bucket Hat = Fad); launch advice present.
**Extras** — watchlist add/remove + CSV; dark/light/system; side panel opens from popup; page scanner overlay on an Amazon `/dp/` page, AliExpress `/item/` page and a Shopify `/products/` page, disabled when toggled off in Settings.
**Server** — `/health` OK from Settings; request from a non-allow-listed extension ID is blocked by CORS; `npm test` passes.
