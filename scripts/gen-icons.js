// Generates 16/48/128 PNG icons with zero dependencies (hand-rolled PNG encoder).
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = resolve(fileURLToPath(new URL('.', import.meta.url)), '../extension/public/icons');
const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = TABLE[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePng(size, rgba) {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) { raw[y * stride] = 0; rgba.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const clamp01 = (v) => Math.max(0, Math.min(1, v));
function draw(size) {
  const px = Buffer.alloc(size * size * 4);
  const pts = [[0.18, 0.7], [0.38, 0.5], [0.54, 0.62], [0.8, 0.3]].map(([x, y]) => [x * size, y * size]);
  const th = Math.max(1.6, size * 0.085), rad = size * 0.22;
  const seg = (x, y, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = clamp01(((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy));
    return Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy));
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const cx = x + 0.5, cy = y + 0.5;
    const qx = Math.abs(cx - size / 2) - (size / 2 - rad), qy = Math.abs(cy - size / 2) - (size / 2 - rad);
    const sdf = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rad;
    const alpha = clamp01(0.5 - sdf);
    if (alpha === 0) continue;
    const g = (cx + cy) / (2 * size);
    const band = size * 0.05;
    const inner = clamp01(0.5 - (sdf + band)); // 1 inside, 0 on the gold border ring
    let r = 212 + (24 - 212) * inner, gr = 175 + (24 - 175) * inner, b = 55 + (26 - 55) * inner;
    r *= 1 - 0.0 * g;
    let d = Infinity;
    for (let i = 0; i < 3; i++) d = Math.min(d, seg(cx, cy, pts[i], pts[i + 1]));
    d = Math.min(d, Math.hypot(cx - pts[3][0], cy - pts[3][1]) - th * 0.9 + th / 2);
    const m = clamp01(0.5 - (d - th / 2));
    r += (241 - r) * m; gr += (207 - gr) * m; b += (90 - b) * m; // gold trend line
    const i = (y * size + x) * 4;
    px[i] = r; px[i + 1] = gr; px[i + 2] = b; px[i + 3] = Math.round(alpha * 255);
  }
  return px;
}
mkdirSync(out, { recursive: true });
for (const s of [16, 48, 128]) writeFileSync(resolve(out, `icon${s}.png`), encodePng(s, draw(s)));
console.log('Icons written to', out);
