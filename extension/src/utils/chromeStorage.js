// zustand "storage" adapter backed by chrome.storage.local (shared by popup, dashboard, side panel, background).
export const chromeStorage = {
  getItem: async (name) => { const o = await chrome.storage.local.get(name); return o[name] ?? null; },
  setItem: async (name, value) => { await chrome.storage.local.set({ [name]: value }); },
  removeItem: async (name) => { await chrome.storage.local.remove(name); },
};
