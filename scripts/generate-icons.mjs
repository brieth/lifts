// Dependency-free PNG icon generator: draws a simple dumbbell mark.
// Produces icon-192.png, icon-512.png, apple-touch-icon.png in /public.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public');
mkdirSync(outDir, { recursive: true });

const TEAL = [20, 184, 166]; // #14b8a6 background
const BAR = [6, 43, 39]; // dark teal dumbbell handle
const BUN = [242, 212, 160]; // cream bread
const TOMATO = [217, 105, 74]; // tomato layer
const MEAT = [156, 90, 44]; // filling layer

function rect(px, size, x0, y0, x1, y1, color) {
  const a = Math.round(x0 * size),
    b = Math.round(y0 * size),
    c = Math.round(x1 * size),
    d = Math.round(y1 * size);
  for (let y = b; y < d; y++) {
    for (let x = a; x < c; x++) {
      const i = (y * size + x) * 4;
      px[i] = color[0];
      px[i + 1] = color[1];
      px[i + 2] = color[2];
      px[i + 3] = 255;
    }
  }
}

// A dumbbell whose two weight plates are little stacked sandwiches.
function drawIcon(size) {
  const px = new Uint8Array(size * size * 4);
  rect(px, size, 0, 0, 1, 1, TEAL); // full-bleed teal background
  // handle bar connecting the two sandwiches
  rect(px, size, 0.31, 0.455, 0.69, 0.545, BAR);
  // the two sandwich "plates"
  for (const [x0, x1] of [
    [0.12, 0.31],
    [0.69, 0.88],
  ]) {
    rect(px, size, x0, 0.3, x1, 0.42, BUN); // top bun
    rect(px, size, x0, 0.42, x1, 0.46, TOMATO); // tomato
    rect(px, size, x0, 0.46, x1, 0.56, MEAT); // filling
    rect(px, size, x0, 0.56, x1, 0.7, BUN); // bottom bun
  }
  return px;
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(size, px) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // rows with filter byte 0
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(px.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
  ['favicon.png', 64],
]) {
  writeFileSync(join(outDir, name), encodePng(size, drawIcon(size)));
  console.log('wrote', name);
}
