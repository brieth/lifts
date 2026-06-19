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

// Everything is drawn on a single GRID x GRID grid of equal blocks, then
// nearest-neighbor upscaled, so every pixel block is exactly the same size.
const GRID = 24;

// Fill whole cells [x0,x1) x [y0,y1) on the grid.
function cell(px, x0, y0, x1, y1, color) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) setPx(px, GRID, x, y, color);
}

// A pixel-art dumbbell (wider outer plates, shorter inner plates, thin bar)
// with a 2-step bun above and below. Symmetric about col 12 and row 12.
function drawDesign() {
  const px = new Uint8Array(GRID * GRID * 4);
  cell(px, 0, 0, GRID, GRID, TEAL); // background

  // top bun: wide step (plate width) + narrow step (bar width)
  cell(px, 3, 5, 21, 7, INK);
  cell(px, 8, 3, 16, 5, INK);
  // bottom bun (mirror about row 12)
  cell(px, 3, 17, 21, 19, INK);
  cell(px, 8, 19, 16, 21, INK);

  // dumbbell
  cell(px, 8, 11, 16, 13, INK); // bar
  cell(px, 6, 9, 8, 15, INK); // left inner plate
  cell(px, 16, 9, 18, 15, INK); // right inner plate
  cell(px, 3, 8, 6, 16, INK); // left outer plate
  cell(px, 18, 8, 21, 16, INK); // right outer plate

  return px;
}

// Nearest-neighbor upscale the GRID design to a target size.
function drawIcon(size) {
  const grid = drawDesign();
  const px = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    const gy = Math.floor((y * GRID) / size);
    for (let x = 0; x < size; x++) {
      const gx = Math.floor((x * GRID) / size);
      const si = (gy * GRID + gx) * 4;
      const di = (y * size + x) * 4;
      px[di] = grid[si];
      px[di + 1] = grid[si + 1];
      px[di + 2] = grid[si + 2];
      px[di + 3] = 255;
    }
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
