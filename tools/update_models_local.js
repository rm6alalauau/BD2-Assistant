import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modelsPath = path.join(__dirname, '../public/models.json');
const localModelsDir = path.join(__dirname, '../public/live2d_models');

// 1. Get list of existing local folders
const items = fs.readdirSync(localModelsDir);
const localFolders = new Set(
    items.filter(f => {
        return fs.statSync(path.join(localModelsDir, f)).isDirectory();
    })
);

console.log(`Found ${localFolders.size} local model directories.`);

// 2. Read models.json
const modelsData = JSON.parse(fs.readFileSync(modelsPath, 'utf8'));

let updatedCount = 0;

// 3. Update entries
if (modelsData.characters) {
    for (const char of modelsData.characters) {
        if (char.costumes) {
            for (const costume of char.costumes) {
                // Check if folder exists for this costume ID
                if (localFolders.has(costume.id)) {
                    // Force update to true if local folder exists
                    if (costume.isBuiltIn !== true) {
                        costume.isBuiltIn = true;
                        updatedCount++;
                    }
                } else {
                    // Force update to false if local folder MISSING (User deleted it to test download)
                    if (costume.isBuiltIn === true) {
                        costume.isBuiltIn = false;
                        updatedCount++;
                    }
                }
            }
        }
    }
}

// 4. Save
fs.writeFileSync(modelsPath, JSON.stringify(modelsData, null, 4), 'utf8');
console.log(`Updated ${updatedCount} costumes to use local files.`);
