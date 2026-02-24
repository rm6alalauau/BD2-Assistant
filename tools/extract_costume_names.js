// Script to extract costume names from wiki HTML
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the HTML file
const htmlContent = fs.readFileSync(path.join(__dirname, '../../all'), 'utf-8');

// Pattern: Costume name appears in desktop version (md:block) - use this instead of mobile (md:hidden)
// md:block version has proper Traditional Chinese
const costumeDesktopRegex = /<div[^>]*class="hidden px-3 py-1 text-sm rounded-full md:block bg-base-100">([^<]+)<\/div>/g;

// Pattern: Character sections
const charRegex = /<span class="text-gray-400 font-bold">([^<]+)\s*\(\s*\d+\s*\)<\/span>/g;

// Find all character names
const characters = [];
let charMatch;
while ((charMatch = charRegex.exec(htmlContent)) !== null) {
    characters.push({
        name: charMatch[1].trim(),
        position: charMatch.index
    });
}

console.log(`Found ${characters.length} characters:`);
characters.slice(0, 10).forEach(c => console.log(`  - ${c.name}`));
if (characters.length > 10) console.log(`  ... and ${characters.length - 10} more`);

// Extract costumes for each character
const result = {};

for (let i = 0; i < characters.length; i++) {
    const char = characters[i];
    const nextCharPos = i + 1 < characters.length ? characters[i + 1].position : htmlContent.length;
    const section = htmlContent.slice(char.position, nextCharPos);

    // Find all costume names in this section
    const costumes = [];
    let costumeMatch;

    // Reset regex lastIndex
    costumeDesktopRegex.lastIndex = 0;
    while ((costumeMatch = costumeDesktopRegex.exec(section)) !== null) {
        const costumeName = costumeMatch[1].trim();
        if (costumeName && !costumes.includes(costumeName)) {
            costumes.push(costumeName);
        }
    }

    if (costumes.length > 0) {
        result[char.name] = costumes;
    }
}

// Character name mapping (Chinese to English)
const charNameMap = {
    '拉德爾': 'Lathel',
    '悠絲緹亞': 'Justia',
    '莎赫拉查德': 'Scheherazade',
    '格雷': 'Gray',
    '魯': 'Rou',
    '奧爾施塔因': 'Olstein',
    '席比雅': 'Sylvia',
    '露比雅': 'Rubia',
    '伊柯利普斯': 'Eclipse',
    '泰瑞絲': 'Teresse',
    '莉亞特里斯': 'Liatris',
    '艾瑞克': 'Alec',
    '賽爾': 'Seir',
    '西利亞': 'Celia',
    '安娜塔西亞': 'Anastasia',
    '萊克莉斯': 'Lecliss',
    '拉菲娜': 'Rafina',
    '愛麗潔': 'Elise',
    '海倫娜': 'Helena',
    '艾尼爾': 'Eleaneer',
    '安潔莉卡': 'Angelica',
    '克蕾西亞': 'Glacia',
    '班塔納': 'Ventana',
    '黛安娜': 'Diana',
    '傑尼斯': 'Zenith',
    '尤里': 'Yuri',
    '達非': 'Dalvi',
    '納羅達斯': 'Nartas',
    '葛蘭西特': 'Granhildr',
    '芮彼泰雅': 'Refithea',
    '羅安': 'Loen',
    '洛琪希': 'Roxy',
    '艾莉絲': 'Eris',
    '貝那卡': 'Venaka',
    '內布利斯': 'Nebris',
    '神聖悠絲緹亞': 'Sacred Justia',
    '萊維亞': 'Levia',
    '墨菲亞': 'Morpeah',
    '米卡埃拉': 'Michaela',
    '詠': 'Yomi',
    '夜櫻': 'Yozakura',
    '日影': 'Hikage',
    '雪泉': 'Yumi',
    '盧班希亞': 'Luvencia',
    '黎維塔': 'Liberta',
    '布萊德': 'Blade',
    '威廉明娜': 'Wilhelmina',
    '哥布林殺手': 'Goblin Slayer',
    '女神官': 'Priestess',
    '妖精弓手': 'High Elf Archer',
    '劍之聖女': 'Sword Maiden',
    '奧利維爾': 'Olivier',
    '索妮亞': 'Sonya',
    '提爾': 'Tyr',
    '達麗安': 'Darian',
    '葛拉娜德': 'Granadair',
    '莉西安': 'Lisianne',
    '維爾尼': 'Bernie',
    '蕾拉': 'Layla',
    '盧克雷齊亞': 'Lucrezia',
    '莎美': 'Samay',
    '克萊': 'Kry',
    '傑登': 'Jayden',
    '安德魯': 'Andrew',
    '厄爾比斯': 'Elpis',
    '弗雷德': 'Fred',
    '君特': 'Gynt',
    '雷南特': 'Remnunt',
    '瑪麗亞': 'Maria',
    '阿里內斯': 'Arines',
    '艾瑪': 'Emma',
    '英格利得': 'Ingrid',
    '辛西亞': 'Cynthia',
    '茱莉': 'Julie',
    '卡森': 'Carlson',
    '黎迪雅': 'Lydia',
    '莉茲內': 'Rigenette',
    '比阿特麗絲': 'Beatrice',
    '威格': 'Wiggle'
};

// Create English-keyed version
const resultEn = {};
for (const [zhName, costumes] of Object.entries(result)) {
    const enName = charNameMap[zhName];
    if (enName) {
        resultEn[enName] = costumes;
    } else {
        console.log(`Warning: No English mapping for: ${zhName}`);
        resultEn[zhName] = costumes; // Keep Chinese name as fallback
    }
}

// Save results
const outputPathZh = path.join(__dirname, 'costume_names_zh.json');
fs.writeFileSync(outputPathZh, JSON.stringify(result, null, 2), 'utf-8');
console.log(`\nSaved Chinese version to: ${outputPathZh}`);

// For debugging/reference, output EN names as well
// We can use it to map any missing characters if needed
const outputPathEn = path.join(__dirname, 'costume_names_extracted.json');
fs.writeFileSync(outputPathEn, JSON.stringify(resultEn, null, 2), 'utf-8');
console.log(`Saved English-keyed version to: ${outputPathEn}`);

// Print summary
console.log('\n=== Summary ===');
let totalCostumes = 0;
for (const [name, costumes] of Object.entries(resultEn)) {
    console.log(`${name}: ${costumes.length} costumes`);
    totalCostumes += costumes.length;
}
console.log(`\nTotal: ${Object.keys(resultEn).length} characters, ${totalCostumes} costumes`);
