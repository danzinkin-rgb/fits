/* Draws the Android launcher icons and splash screens from the same design as the web icons.
   Usage: node make-app-icons.js   (after `npx cap add android`) */
const fs = require('fs'), path = require('path');
const { render, png } = require('./icons/make-icons.js');
const res = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');
const put = (file, W, H, scale) => { fs.writeFileSync(file, png(W, H, render(W, H, scale))); console.log('wrote', path.relative(res, file), W + 'x' + H); };

/* launcher icons: legacy square and round at 48dp, adaptive foreground at 108dp with the design inside the 66dp safe zone */
const DENSITY = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [name, k] of Object.entries(DENSITY)) {
  const dir = path.join(res, 'mipmap-' + name), s = 48 * k, f = 108 * k;
  put(path.join(dir, 'ic_launcher.png'), s, s, s / 512);
  put(path.join(dir, 'ic_launcher_round.png'), s, s, s * 0.8 / 512);
  put(path.join(dir, 'ic_launcher_foreground.png'), f, f, 0.58 * f / 360);
}
fs.writeFileSync(path.join(res, 'values', 'ic_launcher_background.xml'),
  '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#5B3DF5</color>\n</resources>\n');

/* splash screens: every splash.png the template ships, redrawn at its own size */
for (const d of fs.readdirSync(res)) {
  const file = path.join(res, d, 'splash.png');
  if (!fs.existsSync(file)) continue;
  const head = fs.readFileSync(file).subarray(16, 24), W = head.readUInt32BE(0), H = head.readUInt32BE(4);
  put(file, W, H, Math.min(W, H) * 0.42 / 512);
}
