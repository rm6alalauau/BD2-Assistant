
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modelsPath = path.join(__dirname, '../public/models.json');
const costumeNamesPath = path.join(__dirname, '../public/costume_names.json');

const modelsData = JSON.parse(fs.readFileSync(modelsPath, 'utf-8'));
const currentCostumes = JSON.parse(fs.readFileSync(costumeNamesPath, 'utf-8'));

const newCostumes = {};

const normalize = (str) => str.toLowerCase().replace(/^(the\s+)/, '').replace(/\s+/g, ' ').trim();

// Manual overrides for tricky cases
const manualMappings = {
    'Herb Tracker': 'Medicinal Herb Tracker',
    'Promise of Vengance': 'Promise of Vengeance', // models.json typo
    'Red Hat': 'Red Riding Hood',
    'Track and Field Team': 'Track and Field Team Member', // Loen
    'Track and Field Captain': 'Track and Field Team Captain', // Levia
    'Summer Vacation': 'Summer Vacation Dalvi',
    'New Hire': 'New Employee', // Nebris
    'Apostle (Kelian)': 'Apostle' // Olivier
};

console.log('Starting Key Fix...');

modelsData.characters.forEach(char => {
    let charKey = char.name;
    let costumeEntry = currentCostumes[charKey];

    if (!costumeEntry) {
        // Try searching case-insensitive
        const key = Object.keys(currentCostumes).find(k => k.toLowerCase() === charKey.toLowerCase());
        if (key) costumeEntry = currentCostumes[key];
    }

    if (!costumeEntry) {
        console.warn(`Character not found in translations: ${charKey}`);
        return;
    }

    newCostumes[charKey] = {};

    char.costumes.forEach(costume => {
        const modelCostumeName = costume.name; // This is the TARGET KEY

        // Find matching translation
        // 1. Manual Mapping (Highest priority)
        let mappedName = manualMappings[modelCostumeName];
        let trans = mappedName ? costumeEntry[mappedName] : null;

        // 2. Exact match
        if (!trans) {
            trans = costumeEntry[modelCostumeName];
        }

        // 3. Normalized match (ignore "The", case)
        if (!trans) {
            const normModel = normalize(modelCostumeName);
            const foundKey = Object.keys(costumeEntry).find(k => normalize(k) === normModel);
            if (foundKey) {
                trans = costumeEntry[foundKey];
                console.log(`Matched (Norm): "${modelCostumeName}" -> "${foundKey}"`);
            }
        }

        if (trans) {
            newCostumes[charKey][modelCostumeName] = trans;
        } else {
            console.warn(`  Missing translation for: [${charKey}] ${modelCostumeName}`);
        }
    });
});

// Write fixed file
fs.writeFileSync(costumeNamesPath, JSON.stringify(newCostumes, null, 2), 'utf-8');
console.log('Fixed costume_names.json written.');
