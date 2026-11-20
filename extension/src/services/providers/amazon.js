import { ProxyProvider } from './proxy.js';
import { sanitizeProduct } from '../../utils/sanitize.js';

export class AmazonProvider extends ProxyProvider {
  constructor() { super('amazon', 'Amazon Best Sellers', { trending: true }); }
  async getTrending({ country, category }, ctx) {
    const j = await this.call('bestsellers', ctx, { country, category });
    return (j.items || []).map((i) => sanitizeProduct({ ...i, source: 'Amazon', country, category: i.category || category }));
  }
}
