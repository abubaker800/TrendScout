import { AD_PLATFORMS, AD_STATUS_LABEL } from '../utils/constants.js';
import { fmtDate, isHot } from '../utils/format.js';
import { safeUrl } from '../utils/sanitize.js';

const STYLE = {
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  not_found: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  unknown: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  manual: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
};
export const HotBadge = () => <span className="badge bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" title="Active ads on 2+ platforms">🔥 Hot</span>;

/** Compact per-platform badges for table rows / cards. */
export function AdBadges({ ads }) {
  if (!ads) return <span className="text-xs text-slate-400">loading ads…</span>;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {AD_PLATFORMS.map((pl) => {
        const a = ads[pl.id] || { status: 'unknown' };
        const detail = a.status === 'active' ? (a.count ?? '✓') : a.status === 'manual' ? 'manual' : a.status === 'not_found' ? 'none' : '?';
        return <span key={pl.id} className={`badge ${STYLE[a.status] || STYLE.unknown}`} title={`${pl.label}: ${AD_STATUS_LABEL[a.status] || 'Unknown'}`}>{pl.short} · {detail}</span>;
      })}
      {isHot(ads) && <HotBadge />}
    </div>
  );
}

/** Detailed ad table: status, ad count, first seen, link to the ad library. */
export function AdPanel({ ads }) {
  return (
    <section aria-label="Ad activity">
      <h3 className="mb-2 flex items-center gap-2 font-semibold">Ad activity {isHot(ads) && <HotBadge />}</h3>
      {!ads ? <div className="text-slate-500">Loading…</div> : (
        <table className="w-full text-left text-xs">
          <thead><tr className="text-slate-500"><th className="py-1 pr-2 font-medium">Platform</th><th className="pr-2 font-medium">Status</th><th className="pr-2 font-medium">Ads</th><th className="pr-2 font-medium">First seen</th><th className="font-medium">Library</th></tr></thead>
          <tbody>
            {AD_PLATFORMS.map((pl) => {
              const a = ads[pl.id] || { status: 'unknown' };
              const href = safeUrl(a.link);
              return (
                <tr key={pl.id} className="border-t border-slate-200 dark:border-slate-700">
                  <td className="py-1.5 pr-2">{pl.label}</td>
                  <td className="pr-2"><span className={`badge ${STYLE[a.status] || STYLE.unknown}`}>{AD_STATUS_LABEL[a.status] || 'Unknown'}</span></td>
                  <td className="pr-2 tabular-nums">{a.count ?? '—'}</td>
                  <td className="pr-2">{fmtDate(a.firstSeen)}</td>
                  <td>{href ? <a className="text-indigo-600 hover:underline dark:text-indigo-400" href={href} target="_blank" rel="noopener noreferrer">Open ↗</a> : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <p className="mt-2 text-xs text-slate-500">“Check manually” means no official API was available — use the link to search the public ad library yourself.</p>
    </section>
  );
}
