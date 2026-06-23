// Pure JavaScript PNG icon generator - no external dependencies
// Generates PWA icons (192x192, 512x512, apple-touch-180) for client and admin
// Usage: node scripts/generate-png-icons.mjs
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// --- Minimal PNG Writer ---
function crc32(data) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeData = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const combined = Buffer.concat([typeData, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(combined));
  return Buffer.concat([length, combined, crc]);
}

function writePNG(width, height, pixelData, outputPath) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);      // bit depth
  ihdr.writeUInt8(2, 9);      // color type = RGB
  ihdr.writeUInt8(0, 10);     // compression
  ihdr.writeUInt8(0, 11);     // filter
  ihdr.writeUInt8(0, 12);     // interlace

  // IDAT - add filter byte (0) before each row
  const rawData = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    rawData[y * (width * 3 + 1)] = 0; // filter type 0 = None
    pixelData.copy(rawData, y * (width * 3 + 1) + 1, y * width * 3, y * width * 3 + width * 3);
  }
  const compressed = zlib.deflateSync(rawData, { level: 9 });

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  fs.writeFileSync(outputPath, Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]));
}

// --- Drawing primitives ---
function createPixelBuffer(width, height) {
  return Buffer.alloc(width * height * 3);
}

function setPixel(buf, width, x, y, r, g, b) {
  const idx = (y * width + x) * 3;
  buf[idx] = r;
  buf[idx + 1] = g;
  buf[idx + 2] = b;
}

function fillRect(buf, width, height, x, y, w, h, r, g, b) {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      if (px >= 0 && px < width && py >= 0 && py < height) {
        setPixel(buf, width, px, py, r, g, b);
      }
    }
  }
}

// Draw a rounded rectangle by masking corners with background
function drawRoundedRect(buf, width, height, x, y, w, h, radius, r, g, b, bgR, bgG, bgB) {
  // First fill full rect
  fillRect(buf, width, height, x, y, w, h, r, g, b);

  // Mask corners - draw background circles at corners
  // Actually simpler: for each corner, mask pixels outside the circle
  const corners = [
    { cx: x + radius, cy: y + radius },          // top-left
    { cx: x + w - radius - 1, cy: y + radius },  // top-right
    { cx: x + radius, cy: y + h - radius - 1 },  // bottom-left
    { cx: x + w - radius - 1, cy: y + h - radius - 1 }, // bottom-right
  ];

  const r2 = radius * radius;
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      if (px >= 0 && px < width && py >= 0 && py < height) {
        let inCorner = false;
        for (const c of corners) {
          const dx = px - c.cx;
          const dy = py - c.cy;
          // If in corner region AND outside the circle, mask it
          const inCornerRegion =
            (px < x + radius || px > x + w - radius - 1) &&
            (py < y + radius || py > y + h - radius - 1);
          if (inCornerRegion && dx * dx + dy * dy > r2) {
            inCorner = true;
            break;
          }
        }
        if (inCorner) {
          setPixel(buf, width, px, py, bgR, bgG, bgB);
        }
      }
    }
  }
}

// Draw a vertical gradient (from top color to bottom color)
function drawVerticalGradient(buf, width, height, x, y, w, h, c1, c2) {
  for (let py = y; py < y + h; py++) {
    const t = (py - y) / h;
    const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
    const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
    const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
    for (let px = x; px < x + w; px++) {
      if (px >= 0 && px < width && py >= 0 && py < height) {
        setPixel(buf, width, px, py, r, g, b);
      }
    }
  }
}

// Draw a rounded rectangle with vertical gradient
function drawRoundedGradient(buf, width, height, x, y, w, h, radius, c1, c2, bgR, bgG, bgB) {
  // Draw gradient first
  drawVerticalGradient(buf, width, height, x, y, w, h, c1, c2);
  // Mask corners
  const corners = [
    { cx: x + radius, cy: y + radius },
    { cx: x + w - radius - 1, cy: y + radius },
    { cx: x + radius, cy: y + h - radius - 1 },
    { cx: x + w - radius - 1, cy: y + h - radius - 1 },
  ];
  const r2 = radius * radius;
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      if (px >= 0 && px < width && py >= 0 && py < height) {
        let inCorner = false;
        for (const c of corners) {
          const dx = px - c.cx;
          const dy = py - c.cy;
          const inCornerRegion =
            (px < x + radius || px > x + w - radius - 1) &&
            (py < y + radius || py > y + h - radius - 1);
          if (inCornerRegion && dx * dx + dy * dy > r2) {
            inCorner = true;
            break;
          }
        }
        if (inCorner) {
          setPixel(buf, width, px, py, bgR, bgG, bgB);
        }
      }
    }
  }
}

// --- Character drawing using simple 5x7 pixel font ---
// We'll draw the text using a very large, simple approach: render as colored rectangle
// and overlay some simple patterns. Since PNG doesn't support text natively,
// we use a pattern-based approach.

// Draw a circle
function drawCircle(buf, width, height, cx, cy, radius, r, g, b) {
  const r2 = radius * radius;
  for (let py = cy - radius; py < cy + radius; py++) {
    for (let px = cx - radius; px < cx + radius; px++) {
      if (px >= 0 && px < width && py >= 0 && py < height) {
        const dx = px - cx;
        const dy = py - cy;
        if (dx * dx + dy * dy <= r2) {
          setPixel(buf, width, px, py, r, g, b);
        }
      }
    }
  }
}

// Draw a filled circle with gradient
function drawGradientCircle(buf, width, height, cx, cy, radius, c1, c2) {
  const r2 = radius * radius;
  for (let py = cy - radius; py < cy + radius; py++) {
    for (let px = cx - radius; px < cx + radius; px++) {
      if (px >= 0 && px < width && py >= 0 && py < height) {
        const dx = px - cx;
        const dy = py - cy;
        if (dx * dx + dy * dy <= r2) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          const t = dist / radius;
          const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
          const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
          const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
          setPixel(buf, width, px, py, r, g, b);
        }
      }
    }
  }
}

// Draw simple Chinese character approximation - "云" - 3 horizontal strokes
function drawSimpleText(buf, width, height, cx, cy, size, r, g, b) {
  // Draw three horizontal bars for "云"
  const barThickness = Math.max(2, Math.floor(size / 6));
  const barWidth = Math.floor(size * 1.2);
  const gap = Math.floor(size / 4);

  // Top bar
  fillRect(buf, width, height, cx - Math.floor(barWidth / 2), cy - gap - barThickness, barWidth, barThickness, r, g, b);
  // Middle bar (shorter)
  fillRect(buf, width, height, cx - Math.floor(barWidth / 3), cy - Math.floor(barThickness / 2), Math.floor(barWidth * 0.66), barThickness, r, g, b);
  // Bottom connecting shape - diamond/triangle pattern
  const bottomY = cy + gap;
  const bottomWidth = Math.floor(size * 1.4);
  for (let i = 0; i < gap; i++) {
    const lineWidth = Math.floor(bottomWidth * (i / gap));
    fillRect(buf, width, height, cx - Math.floor(lineWidth / 2), bottomY + i, lineWidth, barThickness, r, g, b);
  }
  // Final bottom bar
  fillRect(buf, width, height, cx - Math.floor(bottomWidth / 2), bottomY + gap, bottomWidth, barThickness, r, g, b);
}

// Draw "管" character approximation - more complex
function drawAdminText(buf, width, height, cx, cy, size, r, g, b) {
  const barThickness = Math.max(2, Math.floor(size / 8));
  const barWidth = Math.floor(size * 1.2);

  // Top part - 3 horizontal bars of decreasing size
  fillRect(buf, width, height, cx - Math.floor(barWidth / 2), cy - size, barWidth, barThickness, r, g, b);
  fillRect(buf, width, height, cx - Math.floor(barWidth / 3), cy - size + Math.floor(size / 3), Math.floor(barWidth * 0.66), barThickness, r, g, b);

  // Vertical center line
  fillRect(buf, width, height, cx - Math.floor(barThickness / 2), cy - size, barThickness, size, r, g, b);

  // Bottom shape - two vertical columns with connector
  const colWidth = Math.floor(size / 4);
  const bottomStart = cy;
  // Left column
  fillRect(buf, width, height, cx - Math.floor(size / 2) - colWidth, bottomStart, colWidth, size, r, g, b);
  // Right column
  fillRect(buf, width, height, cx + Math.floor(size / 2), bottomStart, colWidth, size, r, g, b);
  // Top connector
  fillRect(buf, width, height, cx - Math.floor(size / 2) - colWidth, bottomStart, size + colWidth * 2, barThickness, r, g, b);
  // Bottom connector
  fillRect(buf, width, height, cx - Math.floor(size / 2) - colWidth, bottomStart + size - barThickness, size + colWidth * 2, barThickness, r, g, b);
  // Middle connector
  fillRect(buf, width, height, cx - Math.floor(size / 2) - colWidth, cy + Math.floor(size / 2), size + colWidth * 2, barThickness, r, g, b);
}

// --- Generate icon ---
function generateIcon(size, variant, outputPath) {
  const buf = createPixelBuffer(size, size);

  // White background
  fillRect(buf, size, size, 0, 0, size, size, 255, 255, 255);

  // Define colors
  const emerald1 = [16, 185, 129]; // emerald-500
  const emerald2 = [5, 150, 105];  // emerald-600
  const cream = [255, 251, 235];    // amber-50

  // Draw gradient rounded rectangle (the app icon background)
  const padding = Math.floor(size * 0.08);
  const radius = Math.floor(size * 0.22);
  drawRoundedGradient(buf, size, size, padding, padding, size - padding * 2, size - padding * 2, radius, emerald1, emerald2, 255, 255, 255);

  // Draw the character/text in center
  const textSize = Math.floor(size * 0.3);
  const textColor = cream;

  if (variant === 'client') {
    drawSimpleText(buf, size, size, Math.floor(size / 2), Math.floor(size / 2), textSize, textColor[0], textColor[1], textColor[2]);
  } else {
    drawAdminText(buf, size, size, Math.floor(size / 2), Math.floor(size / 2), textSize, textColor[0], textColor[1], textColor[2]);
  }

  // Subtle inner highlight
  const highlightRadius = Math.floor(size * 0.35);
  for (let py = Math.floor(size * 0.15); py < Math.floor(size * 0.5); py++) {
    for (let px = Math.floor(size * 0.25); px < Math.floor(size * 0.75); px++) {
      if (py < padding + radius) {
        const dx = px - Math.floor(size / 2);
        const dy = py - Math.floor(size / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > highlightRadius) {
          // slightly lighten
          const idx = (py * size + px) * 3;
          buf[idx] = Math.min(255, buf[idx] + 15);
          buf[idx + 1] = Math.min(255, buf[idx + 1] + 15);
          buf[idx + 2] = Math.min(255, buf[idx + 2] + 15);
        }
      }
    }
  }

  writePNG(size, size, buf, outputPath);
  console.log(`  ✓ Generated ${path.basename(outputPath)} (${size}x${size})`);
}

// --- Main ---
function main() {
  console.log('\n=== 云栖浅食 - PWA图标生成 ===\n');

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
  ];

  for (const variant of variants) {
    console.log(`\n生成 ${variant.name} 图标:`);
    if (!fs.existsSync(variant.dir)) {
      fs.mkdirSync(variant.dir, { recursive: true });
    }
    for (const { name, size } of sizes) {
      const outPath = path.join(variant.dir, `${name}.png`);
      generateIcon(size, variant.name, outPath);
    }
    // Also generate favicon (16x16 and 32x32)
    generateIcon(32, variant.name, path.join(variant.dir, 'favicon-32.png'));
    generateIcon(16, variant.name, path.join(variant.dir, 'favicon-16.png'));
  }

  console.log('\n✅ 所有图标生成完成!');
  console.log(`位置:`);
  console.log(`  - client/public/icons/`);
  console.log(`  - admin/public/icons/`);
}

main();
