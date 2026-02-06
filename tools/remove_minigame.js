
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modelsPath = path.join(__dirname, '../public/models.json');
const modelsData = JSON.parse(fs.readFileSync(modelsPath, 'utf-8'));

const initialCount = modelsData.characters.length;
modelsData.characters = modelsData.characters.filter(char => char.name !== 'Minigame');
const newCount = modelsData.characters.length;

if (initialCount > newCount) {
    fs.writeFileSync(modelsPath, JSON.stringify(modelsData, null, 4), 'utf-8');
    console.log(`Successfully removed Minigame. Count: ${initialCount} -> ${newCount}`);
} else {
    console.log('Minigame not found.');
}
