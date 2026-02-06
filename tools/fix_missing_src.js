import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modelsPath = path.join(__dirname, '../public/models.json');
const DEFAULT_SRC = "https://raw.githubusercontent.com/Jelosus2/BD2-L2D-Viewer/main/src/assets/spines/";

// Read models.json
const modelsData = JSON.parse(fs.readFileSync(modelsPath, 'utf8'));

let updatedCount = 0;

if (modelsData.characters) {
    for (const char of modelsData.characters) {
        if (char.costumes) {
            for (const costume of char.costumes) {
                // If src is missing, add it
                if (!costume.src) {
                    costume.src = DEFAULT_SRC;
                    updatedCount++;
                }
            }
        }
    }
}

// Save
fs.writeFileSync(modelsPath, JSON.stringify(modelsData, null, 4), 'utf8');
console.log(`Added missing 'src' to ${updatedCount} costumes.`);
