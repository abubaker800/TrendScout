import { fmtInt } from '../utils/format.js';
import { salesFormulaText } from '../services/estimators/sales.js';
import { Tip } from './ui.jsx';

const CONF = { High: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300', Medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300', Low: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' };

export function ConfidenceBadge({ level }) { return <span className={`badge ${CONF[level] || CONF.Low}`}>{level} confidence</span>; }

export default function SalesEstimate({ est, assumptions }) {
  return (
    <section aria-label="Estimated monthly sales">
      <h3 className="mb-2 font-semibold">Estimated monthly sales<Tip text={salesFormulaText(assumptions)} /></h3>
      {!est?.available ? <p className="text-slate-500">Not enough data (no review velocity or traffic figures from this source).</p> : (
        <>
          <div className="flex items-end gap-4">
            {[['Low', est.low], ['Expected', est.expected], ['High', est.high]].map(([k, v]) => (
              <div key={k} className={k === 'Expected' ? 'text-lg font-bold' : 'text-slate-500'}>
                <div className="text-[11px] uppercase tracking-wide">{k}</div><div className="tabular-nums">{fmtInt(v)}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2"><ConfidenceBadge level={est.confidence} /><span className="text-xs text-slate-500">based on {est.basis.join(' + ')}{est.derived ? ' (velocity derived from total reviews)' : ''}</span></div>
        </>
      )}
      <p className="mt-2 text-xs text-slate-500">Approximation only — edit the assumptions in Settings.</p>
    </section>
  );
}
