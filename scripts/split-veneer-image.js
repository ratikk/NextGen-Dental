import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const inputPath = join(projectRoot, 'src/assets/images/gallery/istockphoto-1316985053-1024x1024.jpg');
const outputDir = join(projectRoot, 'public/images/veneers');

mkdirSync(outputDir, { recursive: true });

const metadata = await sharp(inputPath).metadata();
console.log('Image dimensions:', metadata.width, 'x', metadata.height);

const halfHeight = Math.floor(metadata.height / 2);

await sharp(inputPath)
  .extract({ left: 0, top: 0, width: metadata.width, height: halfHeight })
  .toFile(join(outputDir, 'after.jpg'));

await sharp(inputPath)
  .extract({ left: 0, top: halfHeight, width: metadata.width, height: metadata.height - halfHeight })
  .toFile(join(outputDir, 'before.jpg'));

console.log('Images split successfully!');
console.log('- Before:', join(outputDir, 'before.jpg'));
console.log('- After:', join(outputDir, 'after.jpg'));
