import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HERO_IMAGES = {
  'dental-1.jpg': 'https://your-real-image-url-1.jpg',
  'dental-2.jpg': 'https://your-real-image-url-2.jpg',
  'dental-3.jpg': 'https://your-real-image-url-3.jpg'
};

const targetDir = path.join(process.cwd(), 'src/assets/images/hero');

// Create directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

Object.entries(HERO_IMAGES).forEach(([filename, url]) => {
  const filepath = path.join(targetDir, filename);
  
  // Skip if file already exists
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