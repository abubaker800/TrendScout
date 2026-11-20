import { fmtInt, fmtMoney } from '../utils/format.js';
import { safeUrl } from '../utils/sanitize.js';
import { useAppStore } from '../store/useAppStore.js';
import { AdBadges, AdPanel } from './Ads.jsx';
import SalesEstimate, { ConfidenceBadge } from './SalesEstimate.jsx';
import ProfitCalculator from './ProfitCalculator.jsx';
import SeasonalityPanel from './SeasonalityPanel.jsx';
import { ScoreBar, Thumb } from './ui.jsx';

export function ProductDetails({ p, ads, compact = false }) {
  const assumptions = useAppStore((s) => s.settings.assumptions);
  return (
    <div className={`grid gap-4 ${compact ? '' : 'lg:grid-cols-2'}`}>
      <SalesEstimate est={p.est} assumptions={assumptions} />
      <AdPanel ads={ads} />
      <div className={compact ? '' : 'lg:col-span-2'}><ProfitCalculator product={p} est={p.est} /></div>
      <div className={compact ? '' : 'lg:col-span-2'}><SeasonalityPanel product={p} /></div>
    </div>
  );
}

const Title = ({ p }) => {
  const href = safeUrl(p.link);
  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer" className="line-clamp-2 font-medium hover:text-indigo-600 hover:underline dark:hover:text-indigo-400" title={p.title}>{p.title}</a>
    : <span className="line-clamp-2 font-medium" title={p.title}>{p.title}</span>;
};
const WatchBtn = ({ watched, onWatch, title }) => (
  <button className="btn btn-ghost px-2" onClick={onWatch} aria-pressed={watched} aria-label={`${watched ? 'Remove from' : 'Add to'} watchlist: ${title}`} title={watched ? 'Remove from watchlist' : 'Add to watchlist'}>{watched ? '★' : '☆'}</button>
);

/** Full-width table row (+ expandable details row). */
export function ProductRow({ p, ads, watched, onWatch, onList, selected, onSelect, expanded, onToggle, colSpan = 10 }) {
  return (
    <>
      <tr className="border-t border-slate-200 align-middle hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60">
        <td className="px-3 py-2"><input type="checkbox" className="h-4 w-4 accent-indigo-600" aria-label={`Select ${p.title}`} checked={selected} onChange={onSelect} /></td>
        <td className="max-w-xs px-3 py-2"><div className="flex items-center gap-3"><Thumb src={p.image} title={p.title} /><Title p={p} /></div></td>
        <td className="whitespace-nowrap px-3 py-2 tabular-nums">{fmtMoney(p.price, p.currency)}</td>
        <td className="px-3 py-2">{p.category}</td>
        <td className="px-3 py-2"><ScoreBar value={p.trendScore} /></td>
        <td className="px-3 py-2">
          {p.est?.available ? <div title={`Range ${fmtInt(p.est.low)} – ${fmtInt(p.est.high)}`}><span className="font-medium tabular-nums">{fmtInt(p.est.expected)}</span><div><ConfidenceBadge level={p.est.confidence} /></div></div> : <span className="text-slate-400">—</span>}
        </td>
        <td className="px-3 py-2"><AdBadges ads={ads} /></td>
        <td className="px-3 py-2">{p.source}</td>
        <td className="whitespace-nowrap px-3 py-2">
          <div className="flex items-center gap-1">
            <WatchBtn watched={watched} onWatch={onWatch} title={p.title} />
            <button className="btn btn-ghost" aria-expanded={expanded} onClick={onToggle}>{expanded ? 'Hide' : 'Analyze'}</button>
            <button className="btn btn-primary" onClick={onList}>List…</button>
          </div>
        </td>
      </tr>
      {expanded && <tr><td colSpan={colSpan} className="bg-slate-50 px-4 py-4 dark:bg-slate-900/40"><ProductDetails p={p} ads={ads} /></td></tr>}
    </>
  );
}

/** Compact card for the popup / side panel. */
export function ProductCard({ p, ads, watched, onWatch, onList, expanded, onToggle }) {
  return (
    <article className="card p-3">
      <div className="flex gap-3">
        <Thumb src={p.image} title={p.title} size="h-12 w-12" />
        <div className="min-w-0 flex-1">
          <Title p={p} />
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span>{fmtMoney(p.price, p.currency)}</span><span>{p.category}</span><span>{p.source}</span>
            {p.est?.available && <span>~{fmtInt(p.est.expected)} sales/mo</span>}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2"><ScoreBar value={p.trendScore} /><AdBadges ads={ads} /></div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1">
        <WatchBtn watched={watched} onWatch={onWatch} title={p.title} />
        <button className="btn btn-ghost" aria-expanded={expanded} onClick={onToggle}>{expanded ? 'Hide' : 'Analyze'}</button>
        <button className="btn btn-primary" onClick={onList}>List…</button>
      </div>
      {expanded && <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700"><ProductDetails p={p} ads={ads} compact /></div>}
    </article>
  );
}
