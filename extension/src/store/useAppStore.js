// Central state (Zustand) persisted to chrome.storage.local under "ts-app".
// The service worker reads the same key (consent + settings), and every extension page keeps in sync via onChanged.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { chromeStorage } from '../utils/chromeStorage.js';
import { CONSENT_VERSION, DEFAULT_SETTINGS, detectCountry } from '../utils/constants.js';

export const DEFAULT_FILTERS = { country: detectCountry(), category: 'All', search: '', priceMin: '', priceMax: '', minScore: 0, ad: 'any', seasonality: 'any', sort: 'hottest' };

export const useAppStore = create(
  persist(
    (set) => ({
      consent: { accepted: false, at: null, version: CONSENT_VERSION },
      settings: DEFAULT_SETTINGS,
      filters: DEFAULT_FILTERS,
      watchlist: {},     // id -> product snapshot
      marginInputs: {},  // id -> profit calculator inputs

      acceptConsent: () => set({ consent: { accepted: true, at: new Date().toISOString(), version: CONSENT_VERSION } }),
      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
      resetFilters: () => set((s) => ({ filters: { ...DEFAULT_FILTERS, country: s.filters.country, category: s.filters.category } })),
      toggleWatch: (p) => set((s) => {
        const w = { ...s.watchlist };
        if (w[p.id]) delete w[p.id];
        else {
          // keep a light snapshot only (no derived objects / big series)
          const { id, title, price, currency, category, image, trendScore, reviewsPerMonth, reviewsTotal, monthlyVisits, source, link, firstSeen, country } = p;
          w[p.id] = { id, title, price, currency, category, image, trendScore, reviewsPerMonth, reviewsTotal, monthlyVisits, source, link, firstSeen, country, series: null, watchedAt: new Date().toISOString() };
        }
        return { watchlist: w };
      }),
      setMargin: (id, inputs) => set((s) => ({ marginInputs: { ...s.marginInputs, [id]: inputs } })),
    }),
    {
      name: 'ts-app',
      version: 1,
      storage: createJSONStorage(() => chromeStorage),
      partialize: (s) => ({ consent: s.consent, settings: s.settings, filters: s.filters, watchlist: s.watchlist, marginInputs: s.marginInputs }),
      // deep-merge so settings added in later versions get defaults
      merge: (persisted, current) => {
        const p = persisted || {};
        return {
          ...current, ...p,
          settings: {
            ...current.settings, ...p.settings,
            assumptions: {
              ...current.settings.assumptions, ...p.settings?.assumptions,
              reviewRate: { ...current.settings.assumptions.reviewRate, ...p.settings?.assumptions?.reviewRate },
              conversion: { ...current.settings.assumptions.conversion, ...p.settings?.assumptions?.conversion },
            },
            apiKeys: { ...current.settings.apiKeys, ...p.settings?.apiKeys },
            enabledProviders: { ...current.settings.enabledProviders, ...p.settings?.enabledProviders },
          },
          filters: { ...current.filters, ...p.filters },
        };
      },
    }
  )
);

// Keep popup / dashboard / side panel in sync when another context writes.
if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes['ts-app']) useAppStore.persist.rehydrate();
  });
}
