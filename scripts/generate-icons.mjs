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
const INK = [7, 28, 25]; // single dark mark color (monochrome)

function setPx(px, size, x, y, color) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (y * size + x) * 4;
  px[i] = color[0];
  px[i + 1] = color[1];
  px[i + 2] = color[2];
  px[i + 3] = 255;
}

function rect(px, size, x0, y0, x1, y1, color) {
  const a = Math.round(x0 * size),
    b = Math.round(y0 * size),
    c = Math.round(x1 * size),
    d = Math.round(y1 * size);
  for (let y = b; y < d; y++) for (let x = a; x < c; x++) setPx(px, size, x, y, color);
}

// The original (full-resolution) dumbbell with a 2-step bun above and below.
// Bun step 1 = plate width (0.2–0.8), step 2 = bar width (0.3–0.7). Monochrome.
function drawIcon(size) {
  const px = new Uint8Array(size * size * 4);
  rect(px, size, 0, 0, 1, 1, TEAL); // background

  // Bun built from square blocks (1 unit = 0.05 wide AND tall). Base step is
  // height 2, narrow top step is height 1, inset by 1 unit per side. The gap to
  // the dumbbell (top plate at 0.36) is exactly 1 unit (0.05).
  // top bun
  rect(px, size, 0.2, 0.21, 0.8, 0.31, INK); // base (height 2)
  rect(px, size, 0.25, 0.16, 0.75, 0.21, INK); // top (height 1)
  // bottom bun — mirror (bottom plate at 0.64, gap 0.05)
  rect(px, size, 0.2, 0.69, 0.8, 0.79, INK); // base (height 2)
  rect(px, size, 0.25, 0.79, 0.75, 0.84, INK); // top (height 1)

  // the dumbbell — tall outer plates stepping down to a thin bar
  rect(px, size, 0.3, 0.46, 0.7, 0.54, INK); // bar
  rect(px, size, 0.2, 0.36, 0.28, 0.64, INK); // left outer plate
  rect(px, size, 0.28, 0.41, 0.33, 0.59, INK); // left inner plate
  rect(px, size, 0.72, 0.36, 0.8, 0.64, INK); // right outer plate
  rect(px, size, 0.67, 0.41, 0.72, 0.59, INK); // right inner plate

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
