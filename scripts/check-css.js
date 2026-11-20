// Fails the build if Tailwind did not generate real CSS (the symptom: an unstyled page).
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const file = resolve(root, 'dist/app.css');
if (!existsSync(file) || statSync(file).size < 8000 || !readFileSync(file, 'utf8').includes('.btn')) {
  console.error('✗ dist/app.css is missing or empty. Run "npm run css" and read its error message.');
  process.exit(1);
}
const html = readFileSync(resolve(root, 'dist/dashboard.html'), 'utf8');
if (!html.includes('app.css')) { console.error('✗ dist/dashboard.html does not link app.css'); process.exit(1); }
console.log(`✓ Tailwind CSS generated (${(statSync(file).size / 1024).toFixed(0)} KB) and linked`);
