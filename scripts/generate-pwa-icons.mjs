/**
 * Generates PNG PWA icons from public/icons/*.svg
 * Run: npm run icons:generate
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public/icons');

async function fromSvg(filename, size, outName) {
  const svg = readFileSync(join(outDir, filename));
  await sharp(svg).resize(size, size).png().toFile(join(outDir, outName));
  console.log(`Wrote ${outName}`);
}

await fromSvg('icon.svg', 192, 'icon-192.png');
await fromSvg('icon.svg', 512, 'icon-512.png');
await fromSvg('icon-maskable.svg', 512, 'icon-512-maskable.png');
// Multi-size favicons in public/
const favicon16 = await sharp(readFileSync(join(outDir, 'icon.svg'))).resize(16, 16).png().toBuffer();
const favicon32 = await sharp(readFileSync(join(outDir, 'icon.svg'))).resize(32, 32).png().toBuffer();
await sharp(favicon16).toFile(join(root, 'public/favicon-16.png'));
await sharp(favicon32).toFile(join(root, 'public/favicon-32.png'));
console.log('Wrote favicon-16.png, favicon-32.png');
