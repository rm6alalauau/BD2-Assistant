
const fs = require('fs');

const tsPath = 'c:/Users/E01-2019-018A-01/Desktop/pet/BD2-L2D-Viewer-main/src/utils/character_list.ts';

if (!fs.existsSync(tsPath)) {
    console.error(`File not found: ${tsPath}`);
    process.exit(1);
}

const content = fs.readFileSync(tsPath, 'utf8');
const lines = content.split('\n');

const rawObj = {};
let currentID = null;

for (let line of lines) {
    line = line.trim();

    // Match ID start: "100101": {
    const idMatch = line.match(/^"(\d+)":\s*\{/);
    if (idMatch) {
        currentID = idMatch[1];
        rawObj[currentID] = {};
        continue;
    }

    if (currentID) {
        // Match properties
        const charNameMatch = line.match(/"charName":\s*"(.*?)",/);
        if (charNameMatch) rawObj[currentID].charName = charNameMatch[1];

        const costumeNameMatch = line.match(/"costumeName":\s*"(.*?)",/);
        if (costumeNameMatch) rawObj[currentID].costumeName = costumeNameMatch[1];

        const spineMatch = line.match(/"spine":\s*"(.*?)",/);
        if (spineMatch) rawObj[currentID].spine = spineMatch[1];

        // End of object check (rough)
        if (line.startsWith('},')) {
            // currentID = null; // Don't reset immediately, just let next ID overwrite
        }
    }
}

// Transform
const charactersMap = new Map();

for (const [id, data] of Object.entries(rawObj)) {
    if (!data.charName || !data.costumeName) continue;

    const charName = data.charName;
    const costumeId = id;
    const costumeName = data.costumeName;
    const spineFile = data.spine;

    // Known Built-ins
    // 000101 Lathel
    // 000204 Justia (Kendo) ? Wait, in my extension currently it's just '000204'
    // 000701 Eclipse (Dimension Witch)
    // 000406 Gray (Pool Party) ?
    // 000801 Rou (Red Hood) ?

    let isBuiltIn = false;
    if (['000101', '000204', '000601', '000801', '000701'].includes(costumeId)) {
        isBuiltIn = true;
    }

    if (!charactersMap.has(charName)) {
        charactersMap.set(charName, {
            id: costumeId,
            name: charName,
            defaultCostumeId: costumeId,
            costumes: []
        });
    }

    const char = charactersMap.get(charName);

    const costume = {
        id: costumeId,
        name: costumeName,
        isBuiltIn: isBuiltIn
    };

    if (!isBuiltIn) {
        costume.src = "https://raw.githubusercontent.com/Jelosus2/BD2-L2D-Viewer/main/src/assets/spines/";
    }

    if (spineFile && spineFile !== `char${costumeId}`) {
        costume.spineAlias = spineFile;
    }

    char.costumes.push(costume);
}

const output = {
    characters: Array.from(charactersMap.values())
};

const outPath = 'c:/Users/E01-2019-018A-01/Desktop/pet/my-pet-extension/public/models.json';
fs.writeFileSync(outPath, JSON.stringify(output, null, 4));
console.log(`Generated models.json with ${output.characters.length} characters.`);
