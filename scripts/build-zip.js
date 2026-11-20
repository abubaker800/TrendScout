// Runs the production build, validates dist/manifest.json references, then creates
//   trendscout-extension.zip  (built extension, upload to Chrome Web Store)
//   trendscout-source.zip     (full source, no node_modules / dist / secrets)
import { spawnSync } from 'node:child_process';
import { createWriteStream, existsSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const dist = resolve(root, 'dist');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

console.log('› Building…');
const build = spawnSync(npm, ['run', 'build'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
if (build.status !== 0) { console.error('Build failed'); process.exit(1); }

// ---- validate every file the manifest points to exists
const manifest = JSON.parse(readFileSync(resolve(dist, 'manifest.json'), 'utf8'));
const refs = [
  manifest.background?.service_worker, manifest.action?.default_popup, manifest.options_ui?.page,
  manifest.side_panel?.default_path, ...Object.values(manifest.icons || {}),
  ...(manifest.content_scripts || []).flatMap((c) => [...(c.js || []), ...(c.css || [])]),
].filter(Boolean);
const missing = refs.filter((f) => !existsSync(resolve(dist, f)));
if (missing.length) { console.error('Manifest references missing files:', missing); process.exit(1); }
console.log(`✓ manifest OK (${refs.length} referenced files present)`);

const zip = (out, add) => new Promise((ok, fail) => {
  rmSync(out, { force: true });
  const stream = createWriteStream(out);
  const a = archiver('zip', { zlib: { level: 9 } });
  stream.on('close', () => { console.log(`✓ ${out} (${(a.pointer() / 1024).toFixed(0)} KB)`); ok(); });
  a.on('error', fail);
  a.pipe(stream);
  add(a);
  a.finalize();
});

await zip(resolve(root, 'trendscout-extension.zip'), (a) => a.directory(dist, false));
await zip(resolve(root, 'trendscout-source.zip'), (a) =>
  a.glob('**/*', { cwd: root, dot: true, ignore: ['node_modules/**', '**/node_modules/**', 'dist/**', '*.zip', '.git/**', 'server/data/**', '**/.env'] }));
