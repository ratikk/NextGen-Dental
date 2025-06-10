import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logoUrl = 'https://your-real-logo.png';
const targetDir = path.join(process.cwd(), 'public/images/logo');
const logoPath = path.join(targetDir, 'logo.png');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

if (fs.existsSync(logoPath)) {
  console.log('Skipping logo.png - file already exists');
  process.exit(0);
}

https.get(logoUrl, (response) => {
  if (response.statusCode !== 200) {
    console.error(`Failed to download logo: Status code ${response.statusCode}`);
    return;
  }
  
  const fileStream = fs.createWriteStream(logoPath);
  response.pipe(fileStream);
  
  fileStream.on('finish', () => {
    fileStream.close();
    console.log('Logo downloaded successfully');
  });
}).on('error', (err) => {
  console.error('Error downloading logo:', err.message);
});