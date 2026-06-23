// Generates PWA icons from SVG using sharp (pure JS, no native deps beyond npm)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Brand colors - 云栖浅食 (yunqi light food) - sage green + cream
const BRAND = {
  primary: '#10B981',    // emerald-500
  primaryDark: '#059669', // emerald-600
  accent: '#FCD34D',     // amber-300
  cream: '#FFFBEB',       // cream-50
  dark: '#1F2937',        // gray-800
};

function createIconSVG(size, variant = 'client') {
  const isClient = variant === 'client';
  const title = isClient ? '云' : '管';
  const subtitle = isClient ? '云栖浅食' : '商家后台';
  const bgColor = isClient ? BRAND.primary : BRAND.primaryDark;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${bgColor}"/>
      <stop offset="100%" style="stop-color:${BRAND.primaryDark}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="35%" r="50%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.3)"/>
      <stop offset="100%" style="stop-color:rgba(255,255,255,0)"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.floor(size * 0.22)}" ry="${Math.floor(size * 0.22)}" fill="url(#bg)"/>
  <rect width="${size}" height="${size}" rx="${Math.floor(size * 0.22)}" ry="${Math.floor(size * 0.22)}" fill="url(#glow)"/>
  <!-- Leaf/steam icon -->
  <circle cx="${size * 0.5}" cy="${size * 0.42}" r="${size * 0.18}" fill="rgba(255,255,255,0.2)"/>
  <text x="${size * 0.5}" y="${size * 0.5}" text-anchor="middle" dominant-baseline="middle" fill="${BRAND.cream}" font-family="Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="${Math.floor(size * 0.28)}" font-weight="bold">${title}</text>
  <text x="${size * 0.5}" y="${size * 0.8}" text-anchor="middle" dominant-baseline="middle" fill="${BRAND.cream}" font-family="Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="${Math.floor(size * 0.09)}" opacity="0.85">${subtitle}</text>
</svg>`;
}

// Simple PNG generator - writes BMP-like uncompressed data using sharp fallback
// Since sharp requires native binaries, let's use a pure JS approach: write actual PNG using pngjs
// OR simpler: write SVG and let the browser handle it - but iOS requires PNG for apple-touch-icon

// Let's write SVG files as fallback AND generate PNG via a simple canvas-less approach
// Actually, we'll write SVGs and use them. For PNG, we can use node-canvas or sharp.
// Simplest: just use a postbuild script and rely on SVG in manifest where possible
// BUT iOS requires PNG for apple-touch-icon, so we need PNGs.

// Solution: Use sharp via npm install - we'll make this a build step
export function generateSVGIcons() {
  const sizes = [192, 512];
  const variants = [
    { name: 'client', dir: path.join(ROOT, 'client', 'public', 'icons') },
    { name: 'admin', dir: path.join(ROOT, 'admin', 'public', 'icons') },
  ];

  for (const variant of variants) {
    if (!fs.existsSync(variant.dir)) {
      fs.mkdirSync(variant.dir, { recursive: true });
    }
    for (const size of sizes) {
      const svg = createIconSVG(size, variant.name);
      fs.writeFileSync(path.join(variant.dir, `icon-${size}.svg`), svg);
    }
    console.log(`Generated ${variant.name} SVG icons in ${variant.dir}`);
  }
}

// Also generate favicon
export function generateFavicons() {
  const faviconClient = createIconSVG(64, 'client');
  const faviconAdmin = createIconSVG(64, 'admin');

  fs.writeFileSync(path.join(ROOT, 'client', 'public', 'icons', 'favicon.svg'), faviconClient);
  fs.writeFileSync(path.join(ROOT, 'admin', 'public', 'icons', 'favicon.svg'), faviconAdmin);

  // 32x32 favicon for browsers
  const favicon32Client = createIconSVG(32, 'client');
  const favicon32Admin = createIconSVG(32, 'admin');
  fs.writeFileSync(path.join(ROOT, 'client', 'public', 'icons', 'favicon-32.svg'), favicon32Client);
  fs.writeFileSync(path.join(ROOT, 'admin', 'public', 'icons', 'favicon-32.svg'), favicon32Admin);

  console.log('Generated favicons');
}

generateSVGIcons();
generateFavicons();
console.log('All SVG icons generated successfully!');
console.log('Note: Run `npm run generate:png-icons` to create PNG versions from SVGs.');
