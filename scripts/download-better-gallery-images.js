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
    url: 'https://images.pexels.com/photos/3845653/pexels-photo-3845653.jpeg?auto=compress&cs=tinysrgb&w=800',
    path: 'src/assets/images/gallery/veneers-case2-before.jpg'
  },
  {
    url: 'https://images.pexels.com/photos/5699456/pexels-photo-5699456.jpeg?auto=compress&cs=tinysrgb&w=800',
    path: 'src/assets/images/gallery/veneers-case2-after.jpg'
  },
  // Orthodontics Case
  {
    url: 'https://images.pexels.com/photos/3845630/pexels-photo-3845630.jpeg?auto=compress&cs=tinysrgb&w=800',
    path: 'src/assets/images/gallery/orthodontics-case1-before.jpg'
  },
  {
    url: 'https://images.pexels.com/photos/5699478/pexels-photo-5699478.jpeg?auto=compress&cs=tinysrgb&w=800',
    path: 'src/assets/images/gallery/orthodontics-case1-after.jpg'
  },
  // Whitening Case 2
  {
    url: 'https://images.pexels.com/photos/3845630/pexels-photo-3845630.jpeg?auto=compress&cs=tinysrgb&w=800',
    path: 'src/assets/images/gallery/whitening-case2-before.jpg'
  },
  {
    url: 'https://images.pexels.com/photos/3762881/pexels-photo-3762881.jpeg?auto=compress&cs=tinysrgb&w=800',
    path: 'src/assets/images/gallery/whitening-case2-after.jpg'
  },
  // Implant Case 2
  {
    url: 'https://images.pexels.com/photos/3845638/pexels-photo-3845638.jpeg?auto=compress&cs=tinysrgb&w=800',
    path: 'src/assets/images/gallery/implant-case2-before.jpg'
  },
  {
    url: 'https://images.pexels.com/photos/3845653/pexels-photo-3845653.jpeg?auto=compress&cs=tinysrgb&w=800',
    path: 'src/assets/images/gallery/implant-case2-after.jpg'
  },
  // Crowns Case
  {
    url: 'https://images.pexels.com/photos/3845651/pexels-photo-3845651.jpeg?auto=compress&cs=tinysrgb&w=800',
    path: 'src/assets/images/gallery/crowns-case1-before.jpg'
  },
  {
    url: 'https://images.pexels.com/photos/5699456/pexels-photo-5699456.jpeg?auto=compress&cs=tinysrgb&w=800',
    path: 'src/assets/images/gallery/crowns-case1-after.jpg'
  },
  // Cosmetic Case
  {
    url: 'https://images.pexels.com/photos/3845638/pexels-photo-3845638.jpeg?auto=compress&cs=tinysrgb&w=800',
    path: 'src/assets/images/gallery/cosmetic-case1-before.jpg'
  },
  {
    url: 'https://images.pexels.com/photos/3762879/pexels-photo-3762879.jpeg?auto=compress&cs=tinysrgb&w=800',
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
