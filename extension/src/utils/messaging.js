// Typed message-passing layer: UI / content script  <->  service worker.
// Every message is { type, payload }; every response is { ok:true, data } | { ok:false, error }.
export const MSG = Object.freeze({
  GET_TRENDING: 'GET_TRENDING',
  GET_ADS_BATCH: 'GET_ADS_BATCH',
  GET_INTEREST: 'GET_INTEREST',
  REQUEST_CONFIRMATION: 'REQUEST_CONFIRMATION',
  LIST_PRODUCTS: 'LIST_PRODUCTS',
  CONNECT_STORE: 'CONNECT_STORE',
  DISCONNECT_STORE: 'DISCONNECT_STORE',
  REVOKE_ALL: 'REVOKE_ALL',
  ANALYZE_PAGE_PRODUCT: 'ANALYZE_PAGE_PRODUCT',
  OPEN_DASHBOARD: 'OPEN_DASHBOARD',
  TEST_SERVER: 'TEST_SERVER',
  PURGE_CACHE: 'PURGE_CACHE',
});

/** Only extension pages (popup/dashboard/side panel) may send these — never content scripts. */
export const PRIVILEGED = new Set([
  MSG.REQUEST_CONFIRMATION, MSG.LIST_PRODUCTS, MSG.CONNECT_STORE, MSG.DISCONNECT_STORE,
  MSG.REVOKE_ALL, MSG.TEST_SERVER, MSG.PURGE_CACHE, MSG.GET_TRENDING, MSG.GET_ADS_BATCH, MSG.GET_INTEREST,
]);

export function send(type, payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, payload }, (res) => {
      const err = chrome.runtime.lastError;
      if (err) return reject(new Error(err.message));
      if (!res) return reject(new Error('No response from background worker'));
      return res.ok ? resolve(res.data) : reject(new Error(res.error || 'Unknown error'));
    });
  });
}

/** Register handlers in the service worker. `handlers[type](payload, sender) -> Promise<data>` */
export function registerHandlers(handlers) {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    const handler = handlers[msg?.type];
    if (!handler || sender.id !== chrome.runtime.id) return false;
    const fromExtensionPage = typeof sender.url === 'string' && sender.url.startsWith(`chrome-extension://${chrome.runtime.id}/`);
    if (PRIVILEGED.has(msg.type) && !fromExtensionPage) {
      sendResponse({ ok: false, error: 'Not allowed from this context.' });
      return false;
    }
    Promise.resolve()
      .then(() => handler(msg.payload, sender))
      .then((data) => sendResponse({ ok: true, data }))
      .catch((e) => sendResponse({ ok: false, error: String(e?.message || e).slice(0, 300) }));
    return true; // async response
  });
}
