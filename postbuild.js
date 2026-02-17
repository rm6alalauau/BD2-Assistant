
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetPath = path.join(__dirname, 'dist', '.vite');

if (fs.existsSync(targetPath)) {
    console.log(`Checking for .vite folder at: ${targetPath}`);
    console.log('Found dist/.vite folder. Removing it for store compatibility...');
    try {
        fs.rmSync(targetPath, { recursive: true, force: true });
        console.log('Successfully removed dist/.vite');
    } catch (err) {
        console.error('Error removing dist/.vite:', err);
    }
} else {
    console.log(`dist/.vite not found at: ${targetPath}. Skipping.`);
}
