import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

async function splitImplantGrid() {
  const inputPath = join(projectRoot, 'src/assets/images/gallery/Implant_Ex.jpg');
  const outputDir = join(projectRoot, 'public/images/implants');

  try {
    const metadata = await sharp(inputPath).metadata();
    const width = metadata.width;
    const height = metadata.height;

    const halfWidth = Math.floor(width / 2);
    const halfHeight = Math.floor(height / 2);

    // Top-left: Before (missing teeth with dark posts)
    await sharp(inputPath)
      .extract({ left: 0, top: 0, width: halfWidth, height: halfHeight })
      .toFile(join(outputDir, 'case1-before.jpg'));
    console.log('✓ Created implant case 1 before image');

    // Top-right: Before (another angle with posts)
    await sharp(inputPath)
      .extract({ left: halfWidth, top: 0, width: halfWidth, height: halfHeight })
      .toFile(join(outputDir, 'case2-before.jpg'));
    console.log('✓ Created implant case 2 before image');

    // Bottom-left: After (completed natural-looking implants)
    await sharp(inputPath)
      .extract({ left: 0, top: halfHeight, width: halfWidth, height: halfHeight })
      .toFile(join(outputDir, 'case1-after.jpg'));
    console.log('✓ Created implant case 1 after image');

    // Bottom-right: After (full smile with completed implants)
    await sharp(inputPath)
      .extract({ left: halfWidth, top: halfHeight, width: halfWidth, height: halfHeight })
      .toFile(join(outputDir, 'case2-after.jpg'));
    console.log('✓ Created implant case 2 after image');

    console.log('✓ Successfully split implant grid image!');
  } catch (error) {
    console.error('Error splitting image:', error);
  }
}

splitImplantGrid();
