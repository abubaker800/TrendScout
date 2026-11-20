// Dependency-free unit checks for the pure logic (estimators, sanitizers, mock provider, providers registry).
import assert from 'node:assert/strict';
import { estimateSales } from '../extension/src/services/estimators/sales.js';
import { computeProfit, marginTier, defaultProfitInputs } from '../extension/src/services/estimators/profit.js';
import { classifySeasonality } from '../extension/src/services/estimators/seasonality.js';
import { makeSeries, MockProvider } from '../extension/src/services/providers/mock.js';
import { fetchTrending, fetchAds } from '../extension/src/services/providers/index.js';
import { sanitizeProduct, sanitizeListing, safeUrl } from '../extension/src/utils/sanitize.js';
import { isHot } from '../extension/src/utils/format.js';
import { toCsv } from '../extension/src/utils/csv.js';

let n = 0; const ok = (name, fn) => Promise.resolve(fn()).then(() => { n++; console.log('✓', name); });
const now = new Date(2026, 10, 11);

await ok('sales: review-only range ordering and values', () => {
  const e = estimateSales({ reviewsPerMonth: 60 });
  assert.equal(e.expected, 3000); assert.equal(e.low, 2000); assert.equal(e.high, 6000);
  assert.equal(e.confidence, 'Medium');
});
await ok('sales: blend + confidence', () => {
  const e = estimateSales({ reviewsPerMonth: 20, monthlyVisits: 50000 });
  assert.ok(e.low < e.expected && e.expected < e.high); assert.equal(e.confidence, 'High');
  assert.equal(estimateSales({}).available, false);
  assert.equal(estimateSales({ reviewsTotal: 360 }).expected, 1000); // 360/18=20 rpm → 1000
});
await ok('profit: margin, ROI, ROAS, tiers', () => {
  const r = computeProfit({ sellingPrice: 30, sourcingCost: 8, shippingCost: 3, paymentPct: 2.9, paymentFixed: 0.3, platformPct: 0, adCostPerSale: 6, returnRate: 0 }, 100);
  assert.ok(Math.abs(r.profit - (30 - 8 - 3 - 1.17 - 6)) < 1e-9);
  assert.equal(r.tier, 'green'); assert.ok(r.breakEvenRoas > 1); assert.ok(Math.abs(r.monthlyProfit - r.profit * 100) < 1e-9);
  assert.equal(marginTier(14.9), 'red'); assert.equal(marginTier(15), 'yellow'); assert.equal(marginTier(30), 'yellow'); assert.equal(marginTier(30.1), 'green');
  assert.equal(computeProfit(defaultProfitInputs(0)).breakEvenRoas, null);
});
await ok('seasonality: classifies year-round / seasonal / fad', () => {
  assert.equal(classifySeasonality(makeSeries('Y', 1, 'US', now), now).type, 'year-round');
  const s = classifySeasonality(makeSeries('S11', 2, 'US', now), now);
  assert.equal(s.type, 'seasonal'); assert.ok(s.peakMonths.includes('Dec')); assert.ok(s.launch.length > 10);
  assert.equal(classifySeasonality(makeSeries('F', 3, 'US', now), now).type, 'fad');
});
await ok('mock provider: 60 products, category filter, deterministic', async () => {
  const m = new MockProvider();
  const all = await m.getTrending({ country: 'US', category: 'All' });
  assert.equal(all.length, 60);
  const pets = await m.getTrending({ country: 'US', category: 'Pets' });
  assert.ok(pets.length === 4 && pets.every((p) => p.category === 'Pets'));
  const again = await m.getTrending({ country: 'US', category: 'Pets' });
  assert.deepEqual(pets.map((p) => p.trendScore), again.map((p) => p.trendScore));
  assert.ok(all.every((p) => p.series.length === 60 && p.trendScore >= 0 && p.trendScore <= 100 && p.image.startsWith('https://loremflickr.com/')));
  const plain = await m.getTrending({ country: 'US', category: 'Pets', photos: false });
  assert.ok(plain.every((p) => p.image.startsWith('data:image/svg')));
  console.log('   sample photo URLs:', all.slice(0, 3).map((p) => p.image).join(' | '));
});
await ok('registry: mock trending + ads incl. Hot flag logic', async () => {
  const settings = { dataMode: 'mock', enabledProviders: {} };
  const { products, mode } = await fetchTrending({ country: 'DE', category: 'All' }, settings);
  assert.equal(mode, 'mock');
  const ads = await fetchAds(products.slice(0, 20), 'DE', settings);
  assert.equal(Object.keys(ads).length, 20);
  assert.ok(Object.values(ads).some((a) => isHot(a)));
  assert.equal(isHot({ facebook: { status: 'active' }, tiktok: { status: 'manual' }, pinterest: { status: 'not_found' } }), false);
});
await ok('sanitize: strips HTML, rejects bad URLs, validates listing', () => {
  const p = sanitizeProduct({ title: '<img src=x onerror=alert(1)>Cool <b>Thing</b>', price: '12.5', link: 'javascript:alert(1)', image: 'http://x/y.png', trendScore: 250 });
  assert.equal(p.title, 'Cool Thing'); assert.equal(p.link, ''); assert.equal(p.image, ''); assert.equal(p.trendScore, 100); assert.equal(p.price, 12.5);
  assert.equal(safeUrl('ftp://x'), '');
  assert.throws(() => sanitizeListing({ title: '', price: 1 })); assert.throws(() => sanitizeListing({ title: 'a', price: 'abc' }));
  assert.equal(sanitizeListing({ title: 'a', price: 1.005, tags: 'x, y,,z' }).tags.length, 3);
});
await ok('csv: formula-injection guard + quoting', () => {
  const csv = toCsv([{ a: '=SUM(A1)', b: 'he said "hi", ok' }], [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }]);
  assert.ok(csv.includes("'=SUM(A1)")); assert.ok(csv.includes('"he said ""hi"", ok"'));
});
console.log(`\n${n} checks passed`);
