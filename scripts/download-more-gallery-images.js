import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const downloadImage = (url, filepath) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${filepath}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
};

const images = [
  // Veneers Case 2
  {
    url: 'https://images.pexels.com/photos/3779706/pexels-photo-3779706.jpeg?auto=compress&cs=tinysrgb&w=800',
    path: 'src/assets/images/gallery/veneers-case2-before.jpg'
  },
  {
    url: 'https://images.pexels.com/photos/3762879/pexels-photo-3762879.jpeg?auto=compress&cs=tinysrgb&w=800',
    path: 'src/assets/images/gallery/veneers-case2-after.jpg'
  },
  // Orthodontics Case
  {
    url: 'https://images.pexels.com/photos/6528861/pexels-photo-6528861.jpeg?auto=compress&cs=tinysrgb&w=800',
    path: 'src/assets/images/gallery/orthodontics-case1-before.jpg'
  },
  {
    url: 'https://images.pexels.com/photos/6502307/pexels-photo-6502307.jpeg?auto=compress&cs=tinysrgb&w=800',
    path: 'src/assets/images/gallery/orthodontics-case1-after.jpg'
  },
  // Whitening Case 2
  {
    url: 'https://images.pexels.com/photos/6528861/pexels-photo-6528861.jpeg?auto=compress&cs=tinysrgb&w=800',
    path: 'src/assets/images/gallery/whitening-case2-before.jpg'
  },
  {
    url: 'https://images.pexels.com/photos/6528844/pexels-photo-6528844.jpeg?auto=compress&cs=tinysrgb&w=800',
    path: 'src/assets/images/gallery/whitening-case2-after.jpg'
  },
  // Implant Case 2
  {
    url: 'https://images.pexels.com/photos/6528841/pexels-photo-6528841.jpeg?auto=compress&cs=tinysrgb&w=800',
    path: 'src/assets/images/gallery/implant-case2-before.jpg'
  },
  {
    url: 'https://images.pexels.com/photos/6502307/pexels-photo-6502307.jpeg?auto=compress&cs=tinysrgb&w=800',
    path: 'src/assets/images/gallery/implant-case2-after.jpg'
  },
  // Crowns Case
  {
    url: 'https://images.pexels.com/photos/3779705/pexels-photo-3779705.jpeg?auto=compress&cs=tinysrgb&w=800',
    path: 'src/assets/images/gallery/crowns-case1-before.jpg'
  },
  {
    url: 'https://images.pexels.com/photos/3762879/pexels-photo-3762879.jpeg?auto=compress&cs=tinysrgb&w=800',
    path: 'src/assets/images/gallery/crowns-case1-after.jpg'
  },
  // Cosmetic Case
  {
    url: 'https://images.pexels.com/photos/6231351/pexels-photo-6231351.jpeg?auto=compress&cs=tinysrgb&w=800',
    path: 'src/assets/images/gallery/cosmetic-case1-before.jpg'
  },
  {
    url: 'https://images.pexels.com/photos/6231352/pexels-photo-6231352.jpeg?auto=compress&cs=tinysrgb&w=800',
    path: 'src/assets/images/gallery/cosmetic-case1-after.jpg'
  }
];

async function downloadAll() {
  const projectRoot = path.resolve(__dirname, '..');

  for (const image of images) {
    const filepath = path.join(projectRoot, image.path);
    const dir = path.dirname(filepath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    try {
      await downloadImage(image.url, filepath);
    } catch (error) {
      console.error(`Failed to download ${image.path}:`, error.message);
    }
  }

  console.log('All images downloaded!');
}

downloadAll();
