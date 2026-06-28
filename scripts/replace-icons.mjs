import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const sourceIcon = path.join(ROOT, 'temp', 'icon.png');

const variants = [
  { name: 'client', dir: path.join(ROOT, 'client', 'public', 'icons') },
  { name: 'admin', dir: path.join(ROOT, 'admin', 'public', 'icons') },
];

const sizes = [
  { name: 'icon-192', size: 192 },
  { name: 'icon-512', size: 512 },
  { name: 'apple-touch-icon', size: 180 },
  { name: 'apple-touch-icon-152', size: 152 },
  { name: 'apple-touch-icon-120', size: 120 },
  { name: 'maskable-512', size: 512 },
  { name: 'favicon-32', size: 32 },
  { name: 'favicon-16', size: 16 },
];

async function main() {
  console.log('\n=== 替换双端图标 ===\n');
  
  if (!fs.existsSync(sourceIcon)) {
    console.error(`❌ 源图标文件不存在: ${sourceIcon}`);
    process.exit(1);
  }
  
  for (const variant of variants) {
    console.log(`\n处理 ${variant.name} 图标:`);
    if (!fs.existsSync(variant.dir)) {
      fs.mkdirSync(variant.dir, { recursive: true });
    }
    
    for (const { name, size } of sizes) {
      const destPath = path.join(variant.dir, `${name}.png`);
      await sharp(sourceIcon)
        .resize(size, size, {
          fit: sharp.fit.cover,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(destPath);
      console.log(`  ✓ ${name}.png (${size}x${size})`);
    }
    
    const faviconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect width="32" height="32" rx="8" fill="#10B981"/>
      <text x="16" y="20" text-anchor="middle" fill="white" font-family="Arial" font-size="14" font-weight="bold">
        ${variant.name === 'client' ? '云' : '管'}
      </text>
    </svg>`;
    fs.writeFileSync(path.join(variant.dir, 'favicon.svg'), faviconSVG);
    fs.writeFileSync(path.join(variant.dir, 'favicon-32.svg'), faviconSVG);
    console.log(`  ✓ favicon.svg`);
  }
  
  console.log('\n✅ 图标替换完成!');
}

main().catch(console.error);