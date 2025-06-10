import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEAM_PHOTOS = {
  'dr-suman.jpg': 'https://your-real-dr-suman-photo.jpg',
  'dr-kiranmayee.jpg': 'https://your-real-dr-kiranmayee-photo.jpg'
};

const targetDir = path.join(process.cwd(), 'src/assets/images/about');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

Object.entries(TEAM_PHOTOS).forEach(([filename, url]) => {
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