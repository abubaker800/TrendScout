import { ProxyProvider } from './proxy.js';
import { sanitizeProduct } from '../../utils/sanitize.js';

// AliExpress has no open public API; the server answers 501 until you wire in an approved affiliate/partner API.
export class AliExpressProvider extends ProxyProvider {
  constructor() { super('aliexpress', 'AliExpress', { trending: true }); }
  async getTrending({ country, category }, ctx) {
    const j = await this.call('hot-products', ctx, { country, category });
    return (j.items || []).map((i) => sanitizeProduct({ ...i, source: 'AliExpress', country, category: i.category || category }));
  }
}
