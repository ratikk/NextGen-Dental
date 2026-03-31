import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

async function splitVeneerImage() {
  const inputPath = join(projectRoot, 'src/assets/images/gallery/Dental_Veneer_Ex.png');
  const outputDir = join(projectRoot, 'public/images/veneers');

  try {
    mkdirSync(outputDir, { recursive: true });

    const metadata = await sharp(inputPath).metadata();
    console.log('Image dimensions:', metadata.width, 'x', metadata.height);

    const halfWidth = Math.floor(metadata.width / 2);

    await sharp(inputPath)
      .extract({ left: 0, top: 0, width: halfWidth, height: metadata.height })
      .toFile(join(outputDir, 'before.jpg'));
    console.log('✓ Created veneer before image');

    await sharp(inputPath)
      .extract({ left: halfWidth, top: 0, width: metadata.width - halfWidth, height: metadata.height })
      .toFile(join(outputDir, 'after.jpg'));
    console.log('✓ Created veneer after image');

    console.log('✓ Successfully split veneer image!');
  } catch (error) {
    console.error('Error splitting image:', error);
  }
}

splitVeneerImage();
