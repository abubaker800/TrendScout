/**
 * Per-unit profit model.
 *   kept revenue   = price × (1 − return rate)           (refunded orders bring in nothing)
 *   payment fee    = price × payment % + fixed fee        (non-refundable)
 *   platform fee   = price × platform %
 *   profit / unit  = kept revenue − sourcing − shipping − payment fee − platform fee − ad cost per sale
 *   net margin %   = profit ÷ price
 *   ROI %          = profit ÷ (sourcing + shipping + ad cost)
 *   break-even ROAS= price ÷ (kept revenue − all costs except ads)
 */
export const marginTier = (m) => (m < 15 ? 'red' : m <= 30 ? 'yellow' : 'green');

export function defaultProfitInputs(price = 0, currency = 'USD') {
  const p = Number(price) || 0;
  const r2 = (x) => Math.round(x * 100) / 100;
  return {
    sellingPrice: r2(p), sourcingCost: r2(p * 0.3), shippingCost: 3, paymentPct: 2.9, paymentFixed: 0.3,
    platformPct: 0, adCostPerSale: r2(p * 0.2), returnRate: 5, currency,
  };
}

export function computeProfit(inputs, monthlyUnits = 0) {
  const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const price = Math.max(0, n(inputs.sellingPrice));
  const ret = Math.min(1, Math.max(0, n(inputs.returnRate) / 100));
  const paymentFee = price * (n(inputs.paymentPct) / 100) + n(inputs.paymentFixed);
  const platformFee = price * (n(inputs.platformPct) / 100);
  const keptRevenue = price * (1 - ret);
  const contribution = keptRevenue - n(inputs.sourcingCost) - n(inputs.shippingCost) - paymentFee - platformFee;
  const profit = contribution - n(inputs.adCostPerSale);
  const margin = price > 0 ? (profit / price) * 100 : 0;
  const invested = n(inputs.sourcingCost) + n(inputs.shippingCost) + n(inputs.adCostPerSale);
  const roi = invested > 0 ? (profit / invested) * 100 : 0;
  const breakEvenRoas = contribution > 0 && price > 0 ? price / contribution : null;
  return { profit, margin, roi, breakEvenRoas, paymentFee, platformFee, contribution, monthlyProfit: profit * monthlyUnits, tier: marginTier(margin) };
}
