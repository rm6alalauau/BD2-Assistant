
const fs = require('fs');
const path = require('path');

const modelsPath = path.join(__dirname, '../public/models.json');
const models = JSON.parse(fs.readFileSync(modelsPath, 'utf8'));

const targetPrefixes = ['0002', '0011', '0614', '0038'];

targetPrefixes.forEach(prefix => {
    const char = models.characters.find(c => c.id.startsWith(prefix));
    if (char) {
        console.log(`Prefix ${prefix} -> ID: ${char.id}, Name: ${char.name}`);
    } else {
        console.log(`Prefix ${prefix} -> NOT FOUND`);
    }
});
