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

// Fill a rounded rectangle (all coords are fractions of the canvas).
function roundedRect(px, size, x0, y0, x1, y1, r, color) {
  const ax = x0 * size,
    ay = y0 * size,
    bx = x1 * size,
    by = y1 * size,
    R = r * size;
  for (let y = Math.floor(ay); y < Math.ceil(by); y++) {
    for (let x = Math.floor(ax); x < Math.ceil(bx); x++) {
      // distance to the nearest point of the inner (corner-clamped) rectangle
      const cx = Math.min(Math.max(x, ax + R), bx - R);
      const cy = Math.min(Math.max(y, ay + R), by - R);
      const dx = x - cx,
        dy = y - cy;
      if (dx * dx + dy * dy <= R * R) setPx(px, size, x, y, color);
    }
  }
}

// Fill an ellipse. half: 0 = full, -1 = top half only, 1 = bottom half only.
function ellipse(px, size, cx, cy, rx, ry, color, half = 0) {
  const a = cx * size,
    b = cy * size,
    RX = rx * size,
    RY = ry * size;
  for (let y = Math.floor(b - RY); y <= Math.ceil(b + RY); y++) {
    if (half === -1 && y > b) continue;
    if (half === 1 && y < b) continue;
    for (let x = Math.floor(a - RX); x <= Math.ceil(a + RX); x++) {
      const dx = (x - a) / RX,
        dy = (y - b) / RY;
      if (dx * dx + dy * dy <= 1) setPx(px, size, x, y, color);
    }
  }
}

// Simple monochrome logo: a barbell sandwiched between a top and bottom bun.
function drawIcon(size) {
  const px = new Uint8Array(size * size * 4);
  rect(px, size, 0, 0, 1, 1, TEAL); // teal background

  // Everything is a rounded rectangle.

  // buns — top and bottom rounded bars
  roundedRect(px, size, 0.2, 0.15, 0.8, 0.3, 0.075, INK); // top bun
  roundedRect(px, size, 0.2, 0.7, 0.8, 0.85, 0.075, INK); // bottom bun

  // bar — long thin rounded bar through the middle
  roundedRect(px, size, 0.1, 0.475, 0.9, 0.525, 0.025, INK);

  // tiered plates — tall inner block + shorter outer block on each side.
  // [x-half-width, y-half-height] per tier, measured from the bar centre.
  const tiers = [
    [0.355, 0.045, 0.115], // inner (tall)
    [0.255, 0.038, 0.075], // outer (short)
  ];
  for (const [cx, hw, hh] of tiers) {
    roundedRect(px, size, cx - hw, 0.5 - hh, cx + hw, 0.5 + hh, 0.025, INK); // left
    roundedRect(px, size, 1 - cx - hw, 0.5 - hh, 1 - cx + hw, 0.5 + hh, 0.025, INK); // right
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
