
const fs = require('fs');
const path = require('path');

// 1. Read the TS file as text
const tsPath = 'c:/Users/E01-2019-018A-01/Desktop/pet/BD2-L2D-Viewer-main/src/utils/character_list.ts';
let content = fs.readFileSync(tsPath, 'utf8');

// 2. Extract the object (hacky regex/parsing since it's TS export)
// Remove "export default" and just parse the inner JSON-like object
// It keys by "ID": { ... }
const match = content.match(/export default\s*({[\s\S]*?})\s*$/);
if (!match) {
    console.error("Could not find object");
    process.exit(1);
}

// Relaxed JSON parser or just eval it (safe enough here context)
// Because the keys are quoted "100101", but values might have simple quotes.
let rawObj;
try {
    // We need to make it valid JS. It's already mostly valid JS object literal.
    rawObj = eval('(' + match[1] + ')');
} catch (e) {
    console.error("Eval failed", e);
    process.exit(1);
}

// 3. Transform to our Format
// Structure: { characters: [ { id, name, defaultCostumeId, costumes: [ { id, name, isBuiltIn, src? } ] } ] }

const builtInIDs = ['000403', '000701', '000406', '000101']; // Wait, I need to know EXACTLY which IDs are currently built-in in my extension.
// Checking current models.json... 
// 000101 (Lathel Herb Tracker), 000204 (Justia Kendo), 000406 (Gray Pool), 000701 (Eclipse), 000706 (Eclipse Bunny)
// Actually, let's just mark everything as DLC except the ones I KNOW are present.
const builtInCostumes = new Set([
    '000701', // Eclipse Dimension Witch
    '000706', // Eclipse Nightmare Bunny
    '000206', // Justia Pool Party
    '000101', // Lathel Herb Tracker
    // Add others present in visual check
]);

const charactersMap = new Map();

Object.entries(rawObj).forEach(([id, data]) => {
    // data: { charName, costumeName, spine, ... }
    const charName = data.charName;
    const costumeId = id;
    const costumeName = data.costumeName;
    const spineId = data.spine; // e.g. char100101 or npc...

    if (!charactersMap.has(charName)) {
        charactersMap.set(charName, {
            id: costumeId, // Use first costume ID as char ID for now? Or generated? 
            // Better: use unique ID if possible, but Name is good grouper.
            name: charName,
            defaultCostumeId: costumeId,
            costumes: []
        });
    }

    const char = charactersMap.get(charName);
    const isBuiltIn = builtInCostumes.has(costumeId);

    char.costumes.push({
        id: costumeId,
        name: costumeName,
        isBuiltIn: isBuiltIn,
        // If DLC, add source.
        // NOTE: Jelosus2 structure check: src/assets/spines/[id]/[spineId].skel ?
        // Or src/assets/spines/[id]/[id].skel? 
        // Let's assume the user was right about `src/assets/spines`.
        // We will pass the spine filename hint if needed, or just rely on standard naming.
        // Wait, bridge.ts assumes `char[ID].skel`.
        // If the 'spine' field here says 'npc300501', we need to pass that to bridge!
        spineAlias: spineId !== `char${costumeId}` ? spineId : undefined,
        // We might need to store this 'spineAlias' in models.json so bridge uses it.
        src: isBuiltIn ? undefined : "https://raw.githubusercontent.com/Jelosus2/BD2-L2D-Viewer/main/src/assets/spines/"
    });
});

const output = {
    characters: Array.from(charactersMap.values())
};

fs.writeFileSync('c:/Users/E01-2019-018A-01/Desktop/pet/my-pet-extension/public/models.json', JSON.stringify(output, null, 4));
console.log("Generated models.json with " + output.characters.length + " characters.");
