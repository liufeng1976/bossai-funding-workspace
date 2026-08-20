import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { deflateSync } from "node:zlib";

const root = process.cwd();
const outputDir = resolve(root, "out", "desktop-assets");
const icoPath = resolve(outputDir, "bossai-funding.ico");
const previewPath = resolve(outputDir, "bossai-funding-512.png");
const sizes = [16, 24, 32, 48, 64, 128, 256];

const COLORS = {
  transparent: [0, 0, 0, 0],
  panel: [247, 247, 245, 255],
  ink: [31, 36, 45, 255],
  accent: [53, 88, 200, 255],
  accentSoft: [222, 228, 248, 255],
};

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function roundedRectContains(x, y, left, top, right, bottom, radius) {
  if (x < left || x >= right || y < top || y >= bottom) return false;
  const innerLeft = left + radius;
  const innerRight = right - radius;
  const innerTop = top + radius;
  const innerBottom = bottom - radius;
  if ((x >= innerLeft && x < innerRight) || (y >= innerTop && y < innerBottom)) return true;
  const cx = x < innerLeft ? innerLeft : innerRight - 1;
  const cy = y < innerTop ? innerTop : innerBottom - 1;
  const dx = x - cx;
  const dy = y - cy;
  return (dx * dx) + (dy * dy) <= radius * radius;
}

function setPixel(pixels, size, x, y, color) {
  if (x < 0 || x >= size || y < 0 || y >= size) return;
  const offset = (y * size + x) * 4;
  pixels[offset] = color[0];
  pixels[offset + 1] = color[1];
  pixels[offset + 2] = color[2];
  pixels[offset + 3] = color[3];
}

function fillRoundedRect(pixels, size, left, top, right, bottom, radius, color) {
  for (let y = Math.max(0, top); y < Math.min(size, bottom); y += 1) {
    for (let x = Math.max(0, left); x < Math.min(size, right); x += 1) {
      if (roundedRectContains(x, y, left, top, right, bottom, radius)) setPixel(pixels, size, x, y, color);
    }
  }
}

function drawIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const scale = size / 256;
  const s = (value) => Math.max(1, Math.round(value * scale));

  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = COLORS.transparent[0];
    pixels[i + 1] = COLORS.transparent[1];
    pixels[i + 2] = COLORS.transparent[2];
    pixels[i + 3] = COLORS.transparent[3];
  }

  fillRoundedRect(pixels, size, s(18), s(18), s(238), s(238), s(42), COLORS.ink);
  fillRoundedRect(pixels, size, s(24), s(24), s(232), s(232), s(36), COLORS.panel);

  fillRoundedRect(pixels, size, s(52), s(155), s(84), s(202), s(8), COLORS.accentSoft);
  fillRoundedRect(pixels, size, s(96), s(127), s(128), s(202), s(8), COLORS.accent);
  fillRoundedRect(pixels, size, s(140), s(91), s(172), s(202), s(8), COLORS.accent);

  const lineThickness = s(10);
  fillRoundedRect(pixels, size, s(48), s(196), s(184), s(196) + lineThickness, s(5), COLORS.ink);

  const arrowThickness = s(9);
  for (let t = -Math.floor(arrowThickness / 2); t <= Math.floor(arrowThickness / 2); t += 1) {
    for (let x = s(126); x <= s(196); x += 1) {
      const ratio = (x - s(126)) / Math.max(1, s(196) - s(126));
      const y = Math.round(s(106) - ratio * s(50)) + t;
      setPixel(pixels, size, x, y, COLORS.ink);
    }
  }
  fillRoundedRect(pixels, size, s(183), s(48), s(204), s(69), s(4), COLORS.ink);
  for (let y = s(52); y < s(86); y += 1) {
    const width = Math.max(1, Math.round((y - s(52)) * 0.72));
    for (let x = s(199) - width; x <= s(199); x += 1) setPixel(pixels, size, x, y, COLORS.ink);
  }

  return pixels;
}

function encodePng(size) {
  const pixels = drawIcon(size);
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function encodeIco() {
  const pngs = sizes.map((size) => ({ size, png: encodePng(size) }));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);

  let offset = 6 + (16 * pngs.length);
  const entries = pngs.map(({ size, png }) => {
    const entry = Buffer.alloc(16);
    entry[0] = size === 256 ? 0 : size;
    entry[1] = size === 256 ? 0 : size;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...pngs.map(({ png }) => png)]);
}

mkdirSync(outputDir, { recursive: true });
const ico = encodeIco();
const preview = encodePng(512);
writeFileSync(icoPath, ico);
writeFileSync(previewPath, preview);

console.log("BOSSAI_FUNDING_DESKTOP_ASSETS", JSON.stringify({
  icon: icoPath,
  iconBytes: ico.length,
  iconSha256: createHash("sha256").update(ico).digest("hex"),
  preview: previewPath,
  previewBytes: preview.length,
  previewSha256: createHash("sha256").update(preview).digest("hex"),
  sizes,
}));
