/* Draws the iPhone app icon (1024x1024, opaque, no rounded corners: iOS adds them) and the launch image
   from the same design as the web and Android icons. Usage: node make-ios-icons.js */
const fs = require('fs'), path = require('path');
const { render, png } = require('./icons/make-icons.js');
const sharp = require('sharp'); /* strips the alpha channel: App Store Connect rejects icons that have one */
const assets = path.join(__dirname, 'ios', 'App', 'App', 'Assets.xcassets');
const put = async (file, W, H, scale) => {
  fs.writeFileSync(file, await sharp(png(W, H, render(W, H, scale))).removeAlpha().png().toBuffer());
  console.log('wrote', path.relative(assets, file), W + 'x' + H);
};

(async () => {
await put(path.join(assets, 'AppIcon.appiconset', 'AppIcon-512@2x.png'), 1024, 1024, 2);

/* launch image: the three files the template ships share one design, redrawn at their size */
const dir = path.join(assets, 'Splash.imageset');
for (const f of fs.readdirSync(dir)) if (f.endsWith('.png')) await put(path.join(dir, f), 2732, 2732, 2732 * 0.42 / 512);
})();
