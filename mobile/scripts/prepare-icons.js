const path = require('path');
const Jimp = require('jimp-compact');

const assetsDir = path.join(__dirname, '..', 'assets');
const source = path.join(assetsDir, 'WhatsApp Image 2026-04-20 at 5.10.25 AM.jpeg');

(async () => {
  const img = await Jimp.read(source);

  const icon = img.clone().cover(1024, 1024);
  await icon.writeAsync(path.join(assetsDir, 'icon.png'));

  const adaptive = img.clone().cover(1024, 1024);
  await adaptive.writeAsync(path.join(assetsDir, 'adaptive-icon.png'));

  const splash = new Jimp(1242, 2436, 0x0B2545FF);
  const logo = img.clone().contain(800, 800);
  splash.composite(logo, (1242 - 800) / 2, (2436 - 800) / 2);
  await splash.writeAsync(path.join(assetsDir, 'splash.png'));

  console.log('Icons written.');
})();
