const { app, BrowserWindow, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// Disable hardware acceleration for reliable headless capture
app.disableHardwareAcceleration();

// Prevent Electron from auto-quitting when a window is closed between captures
app.on('window-all-closed', (e) => {
  // Do not quit automatically; we explicitly call app.quit() at the end
});

const ROOT = path.resolve(__dirname, '../..');
const TEMPLATES_DIR = path.join(ROOT, 'docs/portals/assets/templates');
const ASSETS_DIR = path.join(ROOT, 'docs/portals/assets');

const DIRS = [
  path.join(ASSETS_DIR, 'source'),
  path.join(ASSETS_DIR, 'crazygames'),
  path.join(ASSETS_DIR, 'gamedistribution'),
];

DIRS.forEach((d) => {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
});

async function captureWindow(filePath, width, height, transparent = false) {
  const win = new BrowserWindow({
    width,
    height,
    show: false,
    frame: false,
    transparent,
    backgroundColor: transparent ? '#00000000' : '#030712',
    webPreferences: {
      offscreen: true,
      webSecurity: false,
      images: true,
    },
  });

  win.setContentSize(width, height);
  const fileUrl = pathToFileURL(filePath).href;
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
    console.log('⚡ Generating Syncron portal visual assets via Electron/Chromium...');

    const iconHtmlPath = path.join(TEMPLATES_DIR, 'icon-template.html');
    const iconTransHtmlPath = path.join(TEMPLATES_DIR, 'icon-transparent-template.html');
    const coverHtmlPath = path.join(TEMPLATES_DIR, 'cover-template.html');

    // 1. Master Icon (With Theme Background, 1024x1024)
    console.log('1/6 Rendering Master Icon (1024x1024)...');
    const masterIcon = await captureWindow(iconHtmlPath, 1024, 1024, false);
    const masterIconBuffer = masterIcon.toPNG();
    const masterIconPath = path.join(ASSETS_DIR, 'source/master-icon-1024x1024.png');
    fs.writeFileSync(masterIconPath, masterIconBuffer);
    console.log('  ✓ Saved:', masterIconPath);

    // 2. Icon 512x512 for CrazyGames & GameDistribution
    console.log('2/6 Generating 512x512 portal icons...');
    const icon512 = masterIcon.resize({ width: 512, height: 512, quality: 'best' });
    const icon512Buffer = icon512.toPNG();

    const cgIconPath = path.join(ASSETS_DIR, 'crazygames/icon-512x512.png');
    fs.writeFileSync(cgIconPath, icon512Buffer);
    console.log('  ✓ Saved:', cgIconPath);

    const gdIconPath = path.join(ASSETS_DIR, 'gamedistribution/icon-512x512.png');
    fs.writeFileSync(gdIconPath, icon512Buffer);
    console.log('  ✓ Saved:', gdIconPath);

    // 3. Master Icon Transparent (1024x1024)
    console.log('3/6 Rendering Master Icon Transparent (1024x1024)...');
    const transIcon = await captureWindow(iconTransHtmlPath, 1024, 1024, true);
    const transIconPath = path.join(ASSETS_DIR, 'source/master-icon-transparent-1024x1024.png');
    fs.writeFileSync(transIconPath, transIcon.toPNG());
    console.log('  ✓ Saved:', transIconPath);

    // 4. Master Cover (1920x1080)
    console.log('4/6 Rendering Master Cover (1920x1080)...');
    const masterCover = await captureWindow(coverHtmlPath, 1920, 1080, false);
    const masterCoverPath = path.join(ASSETS_DIR, 'source/master-cover-1920x1080.png');
    fs.writeFileSync(masterCoverPath, masterCover.toPNG());
    console.log('  ✓ Saved:', masterCoverPath);

    // 5. CrazyGames Cover (1200x675, 16:9) & GameDistribution Wide Cover (1280x720, 16:9)
    console.log('5/6 Generating 16:9 Cover Variants...');
    const cgCover = masterCover.resize({ width: 1200, height: 675, quality: 'best' });
    const cgCoverPath = path.join(ASSETS_DIR, 'crazygames/cover-1200x675.png');
    fs.writeFileSync(cgCoverPath, cgCover.toPNG());
    console.log('  ✓ Saved:', cgCoverPath);

    const gdCoverWide = masterCover.resize({ width: 1280, height: 720, quality: 'best' });
    const gdCoverWidePath = path.join(ASSETS_DIR, 'gamedistribution/cover-1280x720.png');
    fs.writeFileSync(gdCoverWidePath, gdCoverWide.toPNG());
    console.log('  ✓ Saved:', gdCoverWidePath);

    // 6. GameDistribution Cover Standard (720x480, 3:2)
    // 3:2 aspect ratio: in 1920x1080, width is 1080 * 1.5 = 1620.
    // Crop horizontally centered: x = (1920 - 1620) / 2 = 150.
    console.log('6/6 Generating GameDistribution Standard 3:2 Cover (720x480)...');
    const cropped32 = masterCover.crop({ x: 150, y: 0, width: 1620, height: 1080 });
    const gdCoverStd = cropped32.resize({ width: 720, height: 480, quality: 'best' });
    const gdCoverStdPath = path.join(ASSETS_DIR, 'gamedistribution/cover-720x480.png');
    fs.writeFileSync(gdCoverStdPath, gdCoverStd.toPNG());
    console.log('  ✓ Saved:', gdCoverStdPath);

    console.log('🎉 All portal assets successfully generated!');
    app.quit();
  } catch (err) {
    console.error('Error generating assets:', err);
    app.exit(1);
  }
});
