/**
 * Sales volume estimator.
 *  1) Review velocity:  units = reviews gained per month ÷ review rate        (1–3 % of buyers review)
 *  2) Store traffic:    units = monthly visits × conversion rate              (1–3 %)
 *  The two are blended (default 60 % reviews / 40 % traffic). Fewer buyers reviewing => MORE units,
 *  so the review "max" rate gives the LOW case and the "min" rate gives the HIGH case.
 */
export const DEFAULT_ASSUMPTIONS = {
  reviewRate: { min: 0.01, mid: 0.02, max: 0.03 },
  conversion: { min: 0.01, mid: 0.02, max: 0.03 },
  reviewWeight: 0.6,
  listingAgeMonths: 18, // used only when we know total reviews but not review velocity
};

const pos = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 && v !== null ? Number(v) : null);

export function mergeAssumptions(a = {}) {
  return {
    ...DEFAULT_ASSUMPTIONS, ...a,
    reviewRate: { ...DEFAULT_ASSUMPTIONS.reviewRate, ...a.reviewRate },
    conversion: { ...DEFAULT_ASSUMPTIONS.conversion, ...a.conversion },
  };
}

export function estimateSales({ reviewsPerMonth, reviewsTotal, monthlyVisits } = {}, assumptions) {
  const A = mergeAssumptions(assumptions);
  let rpm = pos(reviewsPerMonth);
  let derived = false;
  if (rpm == null && pos(reviewsTotal) != null) { rpm = pos(reviewsTotal) / Math.max(1, A.listingAgeMonths); derived = true; }
  const visits = pos(monthlyVisits);

  const byReviews = rpm != null ? { low: rpm / A.reviewRate.max, mid: rpm / A.reviewRate.mid, high: rpm / A.reviewRate.min } : null;
  const byTraffic = visits != null ? { low: visits * A.conversion.min, mid: visits * A.conversion.mid, high: visits * A.conversion.max } : null;

  const basis = [byReviews && 'reviews', byTraffic && 'traffic'].filter(Boolean);
  if (!basis.length) return { available: false, low: 0, expected: 0, high: 0, confidence: 'Low', basis, derived };

  let r = byReviews || byTraffic;
  let confidence = 'Low';
  if (byReviews && byTraffic) {
    const w = Math.min(1, Math.max(0, A.reviewWeight));
    r = {};
    for (const k of ['low', 'mid', 'high']) r[k] = w * byReviews[k] + (1 - w) * byTraffic[k];
    const agree = Math.min(byReviews.mid, byTraffic.mid) / Math.max(byReviews.mid, byTraffic.mid);
    confidence = agree >= 0.6 && rpm >= 10 && !derived ? 'High' : agree >= 0.3 ? 'Medium' : 'Low';
  } else if (byReviews) {
    confidence = rpm >= 30 && !derived ? 'Medium' : 'Low';
  }
  return { available: true, low: Math.round(r.low), expected: Math.round(r.mid), high: Math.round(r.high), confidence, basis, derived };
}

export function salesFormulaText(assumptions) {
  const A = mergeAssumptions(assumptions);
  const p = (x) => `${(x * 100).toFixed(1).replace(/\.0$/, '')}%`;
  return `Units ≈ w × (reviews/month ÷ review rate) + (1 − w) × (visits × conversion). ` +
    `w = ${A.reviewWeight}. Review rate ${p(A.reviewRate.max)}–${p(A.reviewRate.min)} (expected ${p(A.reviewRate.mid)}); ` +
    `conversion ${p(A.conversion.min)}–${p(A.conversion.max)} (expected ${p(A.conversion.mid)}). ` +
    `If only total reviews are known, velocity = total ÷ ${A.listingAgeMonths} months. Approximation, not a guarantee.`;
}
