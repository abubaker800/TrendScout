import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import Onboarding from './Onboarding.jsx';
import { Loading } from './ui.jsx';

export function useHydrated() {
  const [h, setH] = useState(useAppStore.persist.hasHydrated());
  useEffect(() => {
    const off = useAppStore.persist.onFinishHydration(() => setH(true));
    setH(useAppStore.persist.hasHydrated());
    return off;
  }, []);
  return h;
}
export function useTheme() {
  const theme = useAppStore((s) => s.settings.theme);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && mq.matches));
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}
export function ThemeToggle() {
  const theme = useAppStore((s) => s.settings.theme);
  const setSettings = useAppStore((s) => s.setSettings);
  const next = { system: 'light', light: 'dark', dark: 'system' }[theme];
  const icon = { system: '🖥️', light: '☀️', dark: '🌙' }[theme];
  return <button className="btn btn-ghost px-2" onClick={() => setSettings({ theme: next })} title={`Theme: ${theme} (click for ${next})`} aria-label={`Theme: ${theme}`}>{icon}</button>;
}

/** Blocks the whole UI until the user has accepted the onboarding / permission screen. */
export default function Gate({ children }) {
  useTheme();
  const hydrated = useHydrated();
  const accepted = useAppStore((s) => s.consent.accepted);
  if (!hydrated) return <Loading />;
  return accepted ? children : <Onboarding />;
}
