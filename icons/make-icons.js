// Regenerates PNG icons from the design in icon.svg. Usage: node make-icons.js
const zlib = require('zlib'), fs = require('fs'), path = require('path');
const SS = 6; // 6x6 supersampling
const BG = [0x5b, 0x3d, 0xf5];
const hex = h => [h >> 16 & 255, h >> 8 & 255, h & 255];
const circles = [
  { cx: 186, cy: 256, r: 92, c: hex(0xdff3e9) },
  { cx: 346, cy: 256, r: 72, c: hex(0xfbe3dc) },
];
const strokes = [
  { hw: 13, c: hex(0x17936a), segs: [[142, 258, 174, 290], [174, 290, 232, 224]] },
  { hw: 12, c: hex(0xd9482f), segs: [[320, 230, 372, 282], [372, 230, 320, 282]] },
];
function distSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  let t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
function colourAt(x, y) { // design coordinates
  let col = BG;
  for (const k of circles) if (Math.hypot(x - k.cx, y - k.cy) <= k.r) col = k.c; // circles
  return col;
}
function sample(x, y) {
  let col = colourAt(x, y);
  for (const s of strokes)
    for (const g of s.segs)
      if (distSeg(x, y, g[0], g[1], g[2], g[3]) <= s.hw) { col = s.c; break; }
  return col;
}
// scale: output pixels per design unit; contentHeightPx overrides if given
function render(W, H, scale) {
  const raw = Buffer.alloc(H * (W * 4 + 1));
  let o = 0;
  const cx = W / 2, cy = H / 2;
  for (let py = 0; py < H; py++) {
    raw[o++] = 0;
    for (let px = 0; px < W; px++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const ox = px + (sx + 0.5) / SS, oy = py + (sy + 0.5) / SS;
        const c = sample((ox - cx) / scale + 256, (oy - cy) / scale + 256);
        r += c[0]; g += c[1]; b += c[2];
      }
      const n = SS * SS;
      raw[o++] = Math.round(r / n); raw[o++] = Math.round(g / n); raw[o++] = Math.round(b / n); raw[o++] = 255;
    }
  }
  return raw;
}
const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
function crc32(buf) { let c = -1; for (const b of buf) c = crcT[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data) {
  const t = Buffer.from(type), len = Buffer.alloc(4), crc = Buffer.alloc(4);
  len.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function png(W, H, raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
// Content (circles) spans 184 design units vertically (256 +/- 92).
const jobs = [
  ['icon-192.png', 192, 192, 192 / 512],
  ['icon-512.png', 512, 512, 1],
  ['icon-maskable-512.png', 512, 512, 0.7],
  ['apple-touch-icon.png', 180, 180, 180 / 512],
  ['favicon-32.png', 32, 32, 32 / 512],
  ['og-image.png', 1200, 630, 380 / 184],
];
if (require.main === module) for (const [name, W, H, s] of jobs) {
  fs.writeFileSync(path.join(__dirname, name), png(W, H, render(W, H, s)));
  console.log('wrote', name);
}

module.exports = { render, png };
