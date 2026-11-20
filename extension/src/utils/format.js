export function fmtMoney(n, cur = 'USD') {
  if (n == null || !Number.isFinite(n)) return '—';
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(n); }
  catch { return `${n.toFixed(2)} ${cur}`; }
}
export const fmtInt = (n) => (n == null || !Number.isFinite(n) ? '—' : new Intl.NumberFormat().format(Math.round(n)));
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString() : '—');
export const PLATFORM_IDS = ['facebook', 'tiktok', 'pinterest'];
export const activePlatforms = (ads) => PLATFORM_IDS.filter((k) => ads?.[k]?.status === 'active');
/** "Hot" = active ads on 2 or more platforms. */
export const isHot = (ads) => activePlatforms(ads).length >= 2;
