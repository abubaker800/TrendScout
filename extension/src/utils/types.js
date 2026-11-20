/**
 * Shared JSDoc typedefs (the project uses JS + JSDoc so it builds without a TypeScript toolchain).
 *
 * @typedef {Object} Product
 * @property {string} id                 stable slug
 * @property {string} title
 * @property {number|null} price         in `currency`
 * @property {string} currency           ISO-4217
 * @property {string} category
 * @property {string} image              https: URL or data:image/svg+xml
 * @property {number} trendScore         0-100
 * @property {number|null} reviewsPerMonth
 * @property {number|null} reviewsTotal
 * @property {number|null} monthlyVisits
 * @property {string} source             marketplace / provider label
 * @property {string} link
 * @property {string|null} firstSeen     YYYY-MM-DD
 * @property {number[]|null} series      60 monthly interest points (0-100), oldest first
 * @property {string|null} country       ISO-3166 alpha-2
 *
 * @typedef {'active'|'not_found'|'unknown'|'manual'} AdStatus
 * @typedef {{status: AdStatus, count: number|null, firstSeen: string|null, link: string, note?: string}} AdInfo
 * @typedef {{facebook: AdInfo, tiktok: AdInfo, pinterest: AdInfo}} AdMap
 *
 * @typedef {Object} StoreRecord         (no secrets — tokens live server-side)
 * @property {string} id
 * @property {'shopify'|'woocommerce'|'demo'} platform
 * @property {string} label
 * @property {string|null} sid           opaque server session id
 * @property {string[]} scopes
 * @property {string} connectedAt
 */
export {};
