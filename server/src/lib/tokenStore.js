// Store credentials are AES-256-GCM encrypted at rest. The extension only ever sees the opaque session id.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const FILE = path.resolve(process.cwd(), 'data', 'sessions.json');
function key() {
  const k = process.env.TOKEN_ENC_KEY || '';
  if (!/^[0-9a-fA-F]{64}$/.test(k)) throw new Error('TOKEN_ENC_KEY must be 64 hex characters (see .env.example).');
  return Buffer.from(k, 'hex');
}
const encrypt = (obj) => {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), ct].map((b) => b.toString('base64')).join('.');
};
const decrypt = (s) => {
  const [iv, tag, ct] = s.split('.').map((x) => Buffer.from(x, 'base64'));
  const d = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  d.setAuthTag(tag);
  return JSON.parse(Buffer.concat([d.update(ct), d.final()]).toString('utf8'));
};
const load = () => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; } };
const save = (db) => {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db), { mode: 0o600 });
  fs.renameSync(tmp, FILE);
};

export const sessions = {
  newId: () => crypto.randomBytes(24).toString('hex'),
  set(sid, data) { const db = load(); db[sid] = encrypt({ ...data, createdAt: Date.now() }); save(db); return sid; },
  get(sid) { if (!/^[a-f0-9]{48}$/.test(sid || '')) return null; const v = load()[sid]; if (!v) return null; try { return decrypt(v); } catch { return null; } },
  delete(sid) { const db = load(); delete db[sid]; save(db); },
};

// short-lived pending OAuth states (in memory)
const pending = new Map();
export const pendingAuth = {
  set(id, data) { pending.set(id, { ...data, exp: Date.now() + 10 * 60e3 }); },
  take(id) { const v = pending.get(id); pending.delete(id); return v && v.exp > Date.now() ? v : null; },
  peek(id) { const v = pending.get(id); return v && v.exp > Date.now() ? v : null; },
};
setInterval(() => { for (const [k, v] of pending) if (v.exp < Date.now()) pending.delete(k); }, 60e3).unref();
