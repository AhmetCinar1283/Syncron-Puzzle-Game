const { app, BrowserWindow, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// Disable hardware acceleration for reliable headless capture
app.disableHardwareAcceleration();
// Ekran ölçeği (ör. %125) çıktıyı büyütmesin: PNG boyutları şablon boyutuyla birebir olmalı.
app.commandLine.appendSwitch('force-device-scale-factor', '1');

// Prevent Electron from auto-quitting when a window is closed between captures
app.on('window-all-closed', (e) => {
  // Do not quit automatically; we explicitly call app.quit() at the end
});

const ROOT = path.resolve(__dirname, '../..');
const MASTER_ASSETS_DIR = path.resolve(ROOT, '../assets');
const TEMPLATES_DIR = path.join(ROOT, 'docs/portals/assets/templates');
const ASSETS_DIR = path.join(ROOT, 'docs/portals/assets');

const DIRS = [
  MASTER_ASSETS_DIR,
  path.join(ASSETS_DIR, 'source'),
  path.join(ASSETS_DIR, 'crazygames'),
  path.join(ASSETS_DIR, 'gamedistribution'),
];

DIRS.forEach((d) => {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
});

async function captureWindow(filePath, width, height, transparent = false, query = '') {
  const win = new BrowserWindow({
    width,
    height,
    show: false,
    frame: false,
    transparent,
    backgroundColor: transparent ? '#00000000' : '#050505',
    webPreferences: {
      offscreen: true,
      webSecurity: false,
      images: true,
    },
  });

  win.setContentSize(width, height);
  const fileUrl = pathToFileURL(filePath).href + query;
  await win.loadURL(fileUrl);

  // Wait for web fonts and SVG render stabilization
  await new Promise((r) => setTimeout(r, 1500));

  const image = await win.webContents.capturePage({
    x: 0,
    y: 0,
    width,
    height,
  });

  win.close();
  // Small tick for window cleanup
  await new Promise((r) => setTimeout(r, 300));
  return image;
}

app.whenReady().then(async () => {
  try {
    console.log('⚡ Generating Syncron visual assets via Electron/Chromium (Retro Arcade 8-Bit)...');

    const iconHtmlPath = path.join(TEMPLATES_DIR, 'icon-template.html');
        const coverHtmlPath = path.join(TEMPLATES_DIR, 'cover-template.html');
    const splashHtmlPath = path.join(TEMPLATES_DIR, 'splash-template.html');

    // 1. Master Icon (1024x1024, Zero Text, Borderless Arcade)
    console.log('1/7 Rendering Master Icon (1024x1024)...');
    const masterIcon = await captureWindow(iconHtmlPath, 1024, 1024, false);
    const masterIconBuffer = masterIcon.toPNG();
    const masterIconPath = path.join(ASSETS_DIR, 'source/master-icon-1024x1024.png');
    fs.writeFileSync(masterIconPath, masterIconBuffer);
    fs.writeFileSync(path.join(MASTER_ASSETS_DIR, 'icon.png'), masterIconBuffer);
    console.log('  ✓ Saved:', masterIconPath);
    console.log('  ✓ Synced to:', path.join(MASTER_ASSETS_DIR, 'icon.png'));

    // 2. Icon 512x512 for CrazyGames & GameDistribution
    console.log('2/7 Generating 512x512 portal icons...');
    const icon512 = masterIcon.resize({ width: 512, height: 512, quality: 'best' });
    const icon512Buffer = icon512.toPNG();

    const cgIconPath = path.join(ASSETS_DIR, 'crazygames/icon-512x512.png');
    fs.writeFileSync(cgIconPath, icon512Buffer);
    console.log('  ✓ Saved:', cgIconPath);

    const gdIconPath = path.join(ASSETS_DIR, 'gamedistribution/icon-512x512.png');
    fs.writeFileSync(gdIconPath, icon512Buffer);
    console.log('  ✓ Saved:', gdIconPath);

    // 3. Master Icon Transparent (1024x1024)
    console.log('3/7 Rendering Master Icon Transparent (1024x1024)...');
    const transIcon = await captureWindow(iconHtmlPath, 1024, 1024, true, '?transparent');
    const transIconBuffer = transIcon.toPNG();
    const transIconPath = path.join(ASSETS_DIR, 'source/master-icon-transparent-1024x1024.png');
    fs.writeFileSync(transIconPath, transIconBuffer);
    fs.writeFileSync(path.join(MASTER_ASSETS_DIR, 'icon-transparent.png'), transIconBuffer);
    console.log('  ✓ Saved:', transIconPath);
    console.log('  ✓ Synced to:', path.join(MASTER_ASSETS_DIR, 'icon-transparent.png'));

    // 4. Master Cover (1920x1080)
    console.log('4/7 Rendering Master Cover (1920x1080)...');
    const masterCover = await captureWindow(coverHtmlPath, 1920, 1080, false);
    const masterCoverBuffer = masterCover.toPNG();
    const masterCoverPath = path.join(ASSETS_DIR, 'source/master-cover-1920x1080.png');
    fs.writeFileSync(masterCoverPath, masterCoverBuffer);
    fs.writeFileSync(path.join(MASTER_ASSETS_DIR, 'cover.png'), masterCoverBuffer);
    console.log('  ✓ Saved:', masterCoverPath);
    console.log('  ✓ Synced to:', path.join(MASTER_ASSETS_DIR, 'cover.png'));

    // 5. Master Splash (1080x1920 Mobile Portrait)
    if (fs.existsSync(splashHtmlPath)) {
      console.log('5/7 Rendering Master Splash Screen (1080x1920)...');
      const masterSplash = await captureWindow(splashHtmlPath, 1080, 1920, false);
      const masterSplashBuffer = masterSplash.toPNG();
      const masterSplashPath = path.join(ASSETS_DIR, 'source/master-splash-1080x1920.png');
      fs.writeFileSync(masterSplashPath, masterSplashBuffer);
      fs.writeFileSync(path.join(MASTER_ASSETS_DIR, 'splash.png'), masterSplashBuffer);
      console.log('  ✓ Saved:', masterSplashPath);
      console.log('  ✓ Synced to:', path.join(MASTER_ASSETS_DIR, 'splash.png'));
    }

    // 6. CrazyGames Cover (1200x675, 16:9) & GameDistribution Wide Cover (1280x720, 16:9)
    console.log('6/7 Generating 16:9 Cover Variants...');
    const cgCover = masterCover.resize({ width: 1200, height: 675, quality: 'best' });
    const cgCoverPath = path.join(ASSETS_DIR, 'crazygames/cover-1200x675.png');
    fs.writeFileSync(cgCoverPath, cgCover.toPNG());
    console.log('  ✓ Saved:', cgCoverPath);

    const gdCoverWide = masterCover.resize({ width: 1280, height: 720, quality: 'best' });
    const gdCoverWidePath = path.join(ASSETS_DIR, 'gamedistribution/cover-1280x720.png');
    fs.writeFileSync(gdCoverWidePath, gdCoverWide.toPNG());
    console.log('  ✓ Saved:', gdCoverWidePath);

    // 7. GameDistribution Cover Standard (720x480, 3:2)
    console.log('7/7 Generating GameDistribution Standard 3:2 Cover (720x480)...');
    const cropped32 = masterCover.crop({ x: 150, y: 0, width: 1620, height: 1080 });
    const gdCoverStd = cropped32.resize({ width: 720, height: 480, quality: 'best' });
    const gdCoverStdPath = path.join(ASSETS_DIR, 'gamedistribution/cover-720x480.png');
    fs.writeFileSync(gdCoverStdPath, gdCoverStd.toPNG());
    console.log('  ✓ Saved:', gdCoverStdPath);

    // 8. Portal dikey (800x1200, 2:3) ve kare (800x800) kapaklar — CrazyGames
    for (const [label, tpl, w, h] of [
      ['Portrait', 'cover-portrait-template.html', 800, 1200],
      ['Square', 'cover-square-template.html', 800, 800],
    ]) {
      console.log(`8/8 Rendering ${label} Cover (${w}x${h})...`);
      const png = (await captureWindow(path.join(TEMPLATES_DIR, tpl), w, h, false)).toPNG();
      const name = `cover-${w}x${h}.png`;
      fs.writeFileSync(path.join(ASSETS_DIR, 'source', `master-${name}`), png);
      fs.writeFileSync(path.join(ASSETS_DIR, 'crazygames', name), png);
      console.log('  ✓ Saved:', path.join(ASSETS_DIR, 'crazygames', name));
    }

    console.log('🎉 All portal and master assets successfully generated!');
    app.quit();
  } catch (err) {
    console.error('Error generating assets:', err);
    app.exit(1);
  }
});
