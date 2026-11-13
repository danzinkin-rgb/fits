/* Store screenshots. Play: node store/shots.js   iPhone 6.3-inch (1206x2622): IOS=1 node store/shots.js
   Needs Playwright (borrowed from ../CityRunner2/node_modules, read only). Output: store/out/ (git-ignored). */
const path = require('path'), fs = require('fs'), http = require('http');
const { chromium } = require(path.join(__dirname, '..', '..', 'CityRunner2', 'node_modules', 'playwright'));
const IOS = !!process.env.IOS, IPAD = !!process.env.IPAD; /* IPAD=1: 13-inch iPad (2064x2752) */
const root = path.join(__dirname, '..'), out = path.join(__dirname, 'out');
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.webmanifest': 'application/json' };
const server = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); r.end(fs.readFileSync(f));
});
(async () => {
  await new Promise(ok => server.listen(8123, ok));
  const b = await chromium.launch({ executablePath: process.env.CHROME || 'C:\\Users\\dzink\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe' });
  const ctx = await b.newContext({ viewport: IPAD ? { width: 1032, height: 1376 } : IOS ? { width: 402, height: 874 } : { width: 360, height: 640 }, deviceScaleFactor: IPAD ? 2 : 3, isMobile: true, hasTouch: true });
  await ctx.clock.setFixedTime(new Date('2026-11-12T12:00:00')); /* the daily puzzle changes every day: keep to No. 12 (numbers) */
  const p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.setItem('fits_seen_help', '1'); } catch (e) {} });
  await p.goto('http://localhost:8123/');
  await p.waitForTimeout(1500);
  const shot = n => p.screenshot({ path: path.join(out, (IPAD ? 'ipad-' : IOS ? 'ios-' : '') + n + '.png') });
  const probe = async v => { for (const d of v) await p.locator('#keypad button', { hasText: new RegExp('^' + d + '$') }).first().click(); await p.click('#probe-form button[type=submit]'); await p.waitForTimeout(500); };
  await shot('phone-1-how-to-play');
  await p.click('#dlg-help [data-close]'); await p.waitForTimeout(500);
  await shot('phone-2-start');
  for (const v of ['6', '15', '88']) await probe(v);
  await shot('phone-3-testing');
  for (const v of ['100', '33']) await probe(v);
  await p.click('#cards .card, #chips-yes .chip, .rule').catch(() => {});
  await shot('phone-4-more-tests');
  await p.click('#btn-prove'); await p.waitForTimeout(500);
  await shot('phone-5-prove-it');
  await p.getByText('Multiples of 11', { exact: true }).click(); await p.waitForTimeout(400);
  await shot('phone-6-prove-pick');
  await p.click('#btn-submit').catch(() => {}); await p.waitForTimeout(1200);
  await p.getByText('Not now', { exact: true }).click().catch(() => {}); await p.waitForTimeout(600);
  await shot('phone-7-result');
  if (IOS || IPAD) { await b.close(); server.close(); return; }
  /* feature graphic 1024x500 */
  const fp = await (await b.newContext({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 })).newPage();
  const img = f => 'data:image/png;base64,' + fs.readFileSync(path.join(out, f)).toString('base64');
  const icon = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'icons', 'icon-512.png')).toString('base64');
  await fp.setContent(`<style>*{margin:0;box-sizing:border-box}body{width:1024px;height:500px;background:linear-gradient(135deg,#5b3df5,#3a22b8);font-family:system-ui,Segoe UI,sans-serif;color:#fff;position:relative;overflow:hidden}
  .t{position:absolute;left:64px;top:96px;width:520px}.ic{width:96px;height:96px;border-radius:22px;display:block;margin-bottom:22px}
  h1{font-size:92px;line-height:1;font-weight:900}h1 i{color:#c9bcff;font-style:normal}p{font-size:34px;line-height:1.25;margin-top:20px;font-weight:600}
  .ph{position:absolute;width:250px;height:445px;border-radius:26px;border:6px solid #1a1040;overflow:hidden;background:#f6f1e7;box-shadow:0 14px 40px #0006}
  .ph img{width:100%;display:block}.a{left:640px;top:70px;transform:rotate(6deg)}.b{left:820px;top:-6px;transform:rotate(-5deg)}</style>
  <div class=t><img class=ic src="${icon}"><h1>Fits<i>.</i></h1><p>One secret rule a day.<br>Six moves to find it.</p></div>
  <div class="ph a"><img src="${img('phone-3-testing.png')}"></div><div class="ph b"><img src="${img('phone-7-result.png')}"></div>`);
  await fp.screenshot({ path: path.join(out, 'feature-graphic-1024x500.png') });
  await b.close(); server.close();
})();
