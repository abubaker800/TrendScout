import { useState } from 'react';
import { useAppStore } from '../store/useAppStore.js';

export default function Onboarding() {
  const accept = useAppStore((s) => s.acceptConsent);
  const [ok, setOk] = useState(false);
  return (
    <main className="mx-auto max-w-xl p-5">
      <div className="mb-4 flex items-center gap-3">
        <img src="icons/icon48.png" alt="" className="h-10 w-10" />
        <div><h1 className="text-lg font-bold">Welcome to TrendScout</h1><p className="text-slate-500 dark:text-slate-400">Product research &amp; owner-approved store listing</p></div>
      </div>
      <div className="card space-y-3">
        <section>
          <h2 className="font-semibold">What it does</h2>
          <p>Shows trending products by country and category with estimated sales, ad activity, profit margin and seasonality. You can list products to <b>your own</b> store — but only after you explicitly confirm each action.</p>
        </section>
        <section>
          <h2 className="font-semibold">What data it accesses</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li><b>Stored in this browser:</b> your settings, watchlist, calculator inputs and a local audit log.</li>
            <li><b>Demo mode (default):</b> all data is sample data. Only the product photos are loaded from loremflickr.com (can be turned off in Settings).</li>
            <li><b>Live mode:</b> product titles and your country are sent to <i>your own</i> proxy server, which calls the data providers.</li>
            <li><b>Page scanner (optional):</b> on Amazon / AliExpress / Shopify product pages it reads the product title, price and review count to show metrics. Nothing else is read.</li>
            <li><b>Store access:</b> only the minimum scopes (read/write products). Access tokens are kept on your server, never in the extension. You can revoke access and delete all data at any time.</li>
          </ul>
        </section>
        <section>
          <h2 className="font-semibold">Good to know</h2>
          <p>Sales, profit and trend figures are <b>approximations, not guarantees</b>. Nothing is ever listed silently or in bulk without a fresh confirmation showing exactly what will be created.</p>
        </section>
        <label className="flex items-start gap-2">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-indigo-600" checked={ok} onChange={(e) => setOk(e.target.checked)} />
          <span>I understand what TrendScout accesses and agree to the Terms and Privacy Policy included with this extension.</span>
        </label>
        <button className="btn btn-primary w-full" disabled={!ok} onClick={accept}>Accept &amp; continue</button>
      </div>
    </main>
  );
}
