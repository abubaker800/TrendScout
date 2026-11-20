/**
 * Seasonality classifier — uses coefficient of variation (CV), peak-to-average ratio and
 * year-over-year correlation of the monthly interest curve.
 *   Year-round : CV < 0.22
 *   Seasonal   : curve repeats each year (corr ≥ 0.5) and strongest month ≥ 1.3× average
 *   Fad/Spike  : volatile but NOT repeating, or a single spike ≥ 2.2× average
 */
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const std = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
function pearson(a, b) {
  const ma = mean(a), mb = mean(b);
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return da && db ? num / Math.sqrt(da * db) : 0;
}
export const SEASON_LABEL = { 'year-round': 'Year-round', seasonal: 'Seasonal', fad: 'Spiking / Fad', unknown: 'Unknown' };

/** @param {number[]} series monthly interest, oldest first, last point = current month */
export function classifySeasonality(series, now = new Date()) {
  const s = (series || []).map(Number).filter(Number.isFinite);
  if (s.length < 12) return { type: 'unknown', label: SEASON_LABEL.unknown, peakMonths: [], launch: 'Not enough history to classify.', cv: 0, peakRatio: 0, corr: null, monthAvg: [] };

  const m = mean(s) || 1e-9;
  const cv = std(s) / m;
  const peakRatio = Math.max(...s) / m;
  const n = s.length;
  const monthOf = (i) => (((now.getMonth() - (n - 1 - i)) % 12) + 12) % 12;
  const sums = Array(12).fill(0), cnt = Array(12).fill(0);
  s.forEach((v, i) => { sums[monthOf(i)] += v; cnt[monthOf(i)]++; });
  const monthAvg = sums.map((v, i) => (cnt[i] ? v / cnt[i] : m));
  const seasonalRatio = Math.max(...monthAvg) / m;

  const years = [];
  for (let end = n; end - 12 >= 0; end -= 12) years.unshift(s.slice(end - 12, end));
  let corr = null;
  if (years.length >= 2) { const cs = []; for (let i = 1; i < years.length; i++) cs.push(pearson(years[i - 1], years[i])); corr = mean(cs); }

  let type;
  if (cv < 0.22) type = 'year-round';
  else if (corr != null ? corr >= 0.5 && seasonalRatio >= 1.3 : seasonalRatio >= 1.5 && peakRatio < 2.2) type = 'seasonal';
  else if (peakRatio >= 2.2 || cv >= 0.45) type = 'fad';
  else type = seasonalRatio >= 1.3 ? 'seasonal' : 'year-round';

  const nowM = now.getMonth();
  let peakIdx = [];
  let launch;
  if (type === 'seasonal') {
    peakIdx = monthAvg.map((v, i) => [v, i]).filter(([v]) => v >= 1.2 * m).sort((a, b) => b[0] - a[0]).slice(0, 3).map(([, i]) => i);
    if (!peakIdx.length) peakIdx = [monthAvg.indexOf(Math.max(...monthAvg))];
    const first = [...peakIdx].sort((a, b) => ((a - nowM + 12) % 12) - ((b - nowM + 12) % 12))[0];
    const d = (first - nowM + 12) % 12;
    const lm = (first - 2 + 12) % 12;
    if (d <= 1) launch = `The ${MONTHS[first]} peak is here or imminent. Launch now only if you can ship fast; otherwise prepare for ${MONTHS[lm]} next season.`;
    else if (d === 2) launch = `Best time is now: launching ~8 weeks before the ${MONTHS[first]} peak.`;
    else launch = `Start sourcing and publish around ${MONTHS[lm]} (~8 weeks before the ${MONTHS[first]} peak).`;
    peakIdx.sort((a, b) => a - b);
  } else if (type === 'fad') {
    const last3 = mean(s.slice(-3)), peak = Math.max(...s);
    launch = last3 < 0.5 * peak
      ? 'Interest is already fading — avoid holding inventory.'
      : 'Momentum is high: test quickly with a small budget; fads can fade within weeks.';
  } else {
    launch = `Evergreen demand: launch any time. Expect the softest demand around ${MONTHS[monthAvg.indexOf(Math.min(...monthAvg))]}.`;
  }
  return { type, label: SEASON_LABEL[type], cv, peakRatio, seasonalRatio, corr, peakMonths: peakIdx.map((i) => MONTHS[i]), launch, monthAvg };
}

/** Labels like "Mar 25" for the last n months. */
export function monthLabels(n, now = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
  });
}
