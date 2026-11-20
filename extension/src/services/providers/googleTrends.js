import { ProxyProvider } from './proxy.js';
import { sanitizeProduct } from '../../utils/sanitize.js';

export class GoogleTrendsProvider extends ProxyProvider {
  constructor() { super('googleTrends', 'Google Trends', { trending: true, interest: true }); }
  async getTrending({ country, category }, ctx) {
    const j = await this.call('trending', ctx, { country, category });
    return (j.items || []).map((i) => sanitizeProduct({ ...i, source: 'Google Trends', country, category: i.category || category }));
  }
  async getInterest(product, ctx) {
    const j = await this.call('interest', ctx, { q: product.title, country: ctx.country });
    return { series: Array.isArray(j.series) ? j.series : [] };
  }
}
