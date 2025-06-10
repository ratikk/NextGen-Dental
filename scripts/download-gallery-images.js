import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const GALLERY_IMAGES = {
  'whitening-case1-before.jpg': 'https://your-real-whitening-before.jpg',
  'whitening-case1-after.jpg': 'https://your-real-whitening-after.jpg',
  'veneers-case1-before.jpg': 'https://your-real-veneers-before.jpg',
  'veneers-case1-after.jpg': 'https://your-real-veneers-after.jpg',
  'implant-case1-before.jpg': 'https://your-real-implant-before.jpg',
  'implant-case1-after.jpg': 'https://your-real-implant-after.jpg'
};

const targetDir = path.join(process.cwd(), 'src/assets/images/gallery');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

Object.entries(GALLERY_IMAGES).forEach(([filename, url]) => {
  const filepath = path.join(targetDir, filename);
  
  if (fs.existsSync(filepath)) {
    console.log(`Skipping ${filename} - file already exists`);
    return;
  }
  
  https.get(url, (response) => {
    if (response.statusCode !== 200) {
      console.error(`Failed to download ${filename}: Status code ${response.statusCode}`);
      return;
    }
    
    const fileStream = fs.createWriteStream(filepath);
    response.pipe(fileStream);
    
    fileStream.on('finish', () => {
      fileStream.close();
      console.log(`Downloaded: ${filename}`);
    });
  }).on('error', (err) => {
    console.error(`Error downloading ${filename}:`, err.message);
  });
});