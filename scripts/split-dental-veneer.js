import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

async function splitImage() {
  const inputPath = join(projectRoot, 'src/assets/images/gallery/dental-veneer.jpg');
  const outputBeforePath = join(projectRoot, 'public/images/veneers/before.jpg');
  const outputAfterPath = join(projectRoot, 'public/images/veneers/after.jpg');

  try {
    const metadata = await sharp(inputPath).metadata();
    const width = metadata.width;
    const height = metadata.height;
    const halfHeight = Math.floor(height / 2);

    // Bottom half is the BEFORE (discolored teeth)
    await sharp(inputPath)
      .extract({ left: 0, top: halfHeight, width: width, height: halfHeight })
      .toFile(outputBeforePath);

    console.log('✓ Created before image:', outputBeforePath);

    // Top half is the AFTER (white veneers)
    await sharp(inputPath)
      .extract({ left: 0, top: 0, width: width, height: halfHeight })
      .toFile(outputAfterPath);

    console.log('✓ Created after image:', outputAfterPath);
    console.log('✓ Successfully split veneer image!');
  } catch (error) {
    console.error('Error splitting image:', error);
  }
}

splitImage();
