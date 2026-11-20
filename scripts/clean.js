import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const dist = resolve(fileURLToPath(new URL('.', import.meta.url)), '../dist');
rmSync(dist, { recursive: true, force: true });
