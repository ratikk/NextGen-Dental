import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';
import { writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

async function splitCosmeticImage() {
  const inputPath = join(projectRoot, 'Cosmetic_Ex.jpg');
  const outputDir = join(projectRoot, 'public/images/cosmetic');

  try {
    mkdirSync(outputDir, { recursive: true });

    const metadata = await sharp(inputPath).metadata();
    console.log('Image dimensions:', metadata.width, 'x', metadata.height);

    const halfWidth = Math.floor(metadata.width / 2);

    await sharp(inputPath)
      .extract({ left: 0, top: 0, width: halfWidth, height: metadata.height })
      .toFile(join(outputDir, 'before.jpg'));
    console.log('✓ Created cosmetic before image');

    await sharp(inputPath)
      .extract({ left: halfWidth, top: 0, width: metadata.width - halfWidth, height: metadata.height })
      .toFile(join(outputDir, 'after.jpg'));
    console.log('✓ Created cosmetic after image');

    console.log('✓ Successfully split cosmetic image!');
  } catch (error) {
    console.error('Error splitting image:', error);
  }
}

splitCosmeticImage();
