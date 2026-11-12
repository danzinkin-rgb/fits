/* Copies the game's web files from the repo root into app/www, which is what the Android and iPhone apps ship.
   The service worker is left out: the app's files are already on the device. Usage: node build-www.js */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(__dirname, 'www');
const FILES = ['index.html', 'style.css', 'app.js', 'rules.js', 'config.js', 'words.txt', 'privacy.html', 'manifest.webmanifest', 'icon.svg'];
const ICONS = ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'favicon-32.png'];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'icons'), { recursive: true });
for (const f of FILES) fs.copyFileSync(path.join(root, f), path.join(out, f));
for (const f of ICONS) fs.copyFileSync(path.join(root, 'icons', f), path.join(out, 'icons', f));

/* AdSense is not allowed inside apps: take the website's ad tag out of the app's copy of the page */
const page = path.join(out, 'index.html');
fs.writeFileSync(page, fs.readFileSync(page, 'utf8').replace(/<script[^>]*adsbygoogle\.js[^>]*><\/script>\s*/g, ''));

/* every file the page links to must have been copied */
const html = fs.readFileSync(page, 'utf8');
if (html.includes('adsbygoogle.js')) { console.error('ad tag still in the app page'); process.exit(1); }
const missing = [...html.matchAll(/(?:src|href)="([^"#:]+?)(?:\?[^"]*)?"/g)].map(m => m[1]).filter(f => !fs.existsSync(path.join(out, f)));
if (missing.length) { console.error('missing from www: ' + missing.join(', ')); process.exit(1); }
console.log('www ready: ' + (FILES.length + ICONS.length) + ' files');
