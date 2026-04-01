import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

async function splitInvisalignImage() {
  const inputPath = join(projectRoot, 'src/assets/images/gallery/Invisalign_Ex.jpg');
  const outputDir = join(projectRoot, 'public/images/invisalign');

  try {
    mkdirSync(outputDir, { recursive: true });

    const metadata = await sharp(inputPath).metadata();
    console.log('Image dimensions:', metadata.width, 'x', metadata.height);

    const halfHeight = Math.floor(metadata.height / 2);

    await sharp(inputPath)
      .extract({ left: 0, top: 0, width: metadata.width, height: halfHeight })
      .toFile(join(outputDir, 'before.jpg'));
    console.log('✓ Created Invisalign before image');

    await sharp(inputPath)
      .extract({ left: 0, top: halfHeight, width: metadata.width, height: metadata.height - halfHeight })
      .toFile(join(outputDir, 'after.jpg'));
    console.log('✓ Created Invisalign after image');

    console.log('✓ Successfully split Invisalign image!');
  } catch (error) {
    console.error('Error splitting image:', error);
  }
}

splitInvisalignImage();
