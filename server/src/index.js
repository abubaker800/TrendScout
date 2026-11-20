import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config, isAllowedOrigin } from './config.js';
import authRoutes from './routes/auth.js';
import storeRoutes from './routes/stores.js';
import providerRoutes from './routes/providers.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || isAllowedOrigin(origin)),
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-Session', 'X-Provider-Key'],
}));
app.use(express.json({ limit: '100kb' }));
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));

app.get('/health', (req, res) => res.json({ ok: true, name: 'trendscout-server', time: new Date().toISOString() }));
app.use('/auth', authRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/providers', providerRoutes);

// Never log tokens/keys: only the message is logged.
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (!err.status) console.error('Unhandled:', err.message);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' });
});

if (config.prod && !config.extensionIds.length) { console.error('ALLOWED_EXTENSION_IDS is required in production.'); process.exit(1); }
app.listen(config.port, () => console.log(`TrendScout server listening on ${config.publicUrl} (port ${config.port})`));
