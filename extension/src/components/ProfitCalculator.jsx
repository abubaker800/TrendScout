import { useState } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { computeProfit, defaultProfitInputs } from '../services/estimators/profit.js';
import { fmtMoney } from '../utils/format.js';
import { Field } from './ui.jsx';

const TIER = {
  red: 'border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200',
  yellow: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
  green: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
};
const NUM_FIELDS = [
  ['sellingPrice', 'Selling price'], ['sourcingCost', 'Sourcing cost'], ['shippingCost', 'Shipping cost'],
  ['paymentPct', 'Payment fee %'], ['paymentFixed', 'Payment fixed fee'], ['platformPct', 'Platform fee %'],
  ['adCostPerSale', 'Ad cost per sale'], ['returnRate', 'Return / refund %'],
];

export default function ProfitCalculator({ product, est }) {
  const saved = useAppStore((s) => s.marginInputs[product.id]);
  const setMargin = useAppStore((s) => s.setMargin);
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState(() => saved || defaultProfitInputs(product.price ?? 0, product.currency));
  const change = (k, v) => { const next = { ...vals, [k]: v }; setVals(next); setMargin(product.id, next); };
  const reset = () => { const d = defaultProfitInputs(product.price ?? 0, product.currency); setVals(d); setMargin(product.id, d); };
  const cur = /^[A-Z]{3}$/.test(vals.currency) ? vals.currency : 'USD';
  const r = computeProfit(vals, est?.expected || 0);
  const m = (n) => fmtMoney(n, cur);

  return (
    <section aria-label="Profit margin calculator" className="rounded-lg border border-slate-200 dark:border-slate-700">
      <button className="flex w-full items-center justify-between px-3 py-2 text-left font-semibold" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>Profit margin calculator</span>
        <span className="flex items-center gap-2">
          <span className={`badge border ${TIER[r.tier]}`}>{r.margin.toFixed(1)}% · {{ red: 'Low', yellow: 'OK', green: 'Great' }[r.tier]}</span><span aria-hidden>{open ? '▴' : '▾'}</span>
        </span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-slate-200 p-3 dark:border-slate-700">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            {NUM_FIELDS.map(([k, label]) => (
              <Field key={k} label={label}><input className="input" type="number" step="0.01" min="0" value={vals[k]} onChange={(e) => change(k, e.target.value)} /></Field>
            ))}
            <Field label="Currency"><input className="input uppercase" maxLength={3} value={vals.currency} onChange={(e) => change('currency', e.target.value.toUpperCase())} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            <Metric label="Profit / unit" value={m(r.profit)} tier={r.tier} />
            <Metric label="Net margin" value={`${r.margin.toFixed(1)}%`} tier={r.tier} />
            <Metric label="ROI" value={`${r.roi.toFixed(0)}%`} />
            <Metric label="Break-even ROAS" value={r.breakEvenRoas == null ? 'n/a (no margin)' : r.breakEvenRoas.toFixed(2)} />
            <Metric label={`Est. monthly profit${est?.available ? '' : ' (no sales est.)'}`} value={m(r.monthlyProfit)} />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Margin colour: red &lt; 15% · yellow 15–30% · green &gt; 30%. Inputs are saved per product.</span>
            <button className="btn btn-ghost py-1 text-xs" onClick={reset}>Reset</button>
          </div>
        </div>
      )}
    </section>
  );
}
const Metric = ({ label, value, tier }) => (
  <div className={`rounded-lg border p-2 ${tier ? TIER[tier] : 'border-slate-200 dark:border-slate-700'}`}>
    <div className="text-[11px] uppercase tracking-wide opacity-70">{label}</div><div className="font-semibold tabular-nums">{value}</div>
  </div>
);
