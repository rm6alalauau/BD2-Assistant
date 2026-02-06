
const fs = require('fs');
const path = require('path');

const modelsPath = path.join(__dirname, '../public/models.json');
const namesPath = path.join(__dirname, '../public/costume_names.json');

const models = JSON.parse(fs.readFileSync(modelsPath, 'utf8'));
const names = JSON.parse(fs.readFileSync(namesPath, 'utf8'));

const entriesToAdd = [
    {
        prefix: '0002',
        costume: {
            "id": "000296",
            "name": "Hot Summer Dream",
            "isBuiltIn": false,
            "src": "https://raw.githubusercontent.com/Jelosus2/BD2-L2D-Viewer/main/src/assets/spines/"
        },
        trans: { "zh-TW": "仲夏之夢", "zh-CN": "仲夏之梦", "ja": "真夏の夢", "ko": "한여름의 꿈", "en": "Hot Summer Dream" }
    },
    {
        prefix: '0011',
        costume: {
            "id": "001197",
            "name": "Milky Bikini",
            "isBuiltIn": false,
            "src": "https://raw.githubusercontent.com/Jelosus2/BD2-L2D-Viewer/main/src/assets/spines/"
        },
        trans: { "zh-TW": "奶牛比基尼", "zh-CN": "奶牛比基尼", "ja": "ミルキービキニ", "ko": "밀키 비키니", "en": "Milky Bikini" }
    },
    {
        prefix: '0614',
        costume: {
            "id": "061492",
            "name": "Stranger Bunny",
            "isBuiltIn": false,
            "src": "https://raw.githubusercontent.com/Jelosus2/BD2-L2D-Viewer/main/src/assets/spines/"
        },
        trans: { "zh-TW": "神秘兔女郎", "zh-CN": "神秘兔女郎", "ja": "ストレンジャー・バニー", "ko": "스트레인저 바니", "en": "Stranger Bunny" }
    },
    {
        prefix: '0038',
        costume: {
            "id": "003892",
            "name": "Hedonist",
            "isBuiltIn": false,
            "src": "https://raw.githubusercontent.com/Jelosus2/BD2-L2D-Viewer/main/src/assets/spines/"
        },
        trans: { "zh-TW": "享樂主義者", "zh-CN": "享乐主义者", "ja": "享楽探究者", "ko": "쾌락 추구자", "en": "Hedonist" }
    },
    {
        prefix: '0677',
        costume: {
            "id": "067702",
            "name": "Granadair: Queen of Gluttis",
            "isBuiltIn": false,
            "src": "https://raw.githubusercontent.com/Jelosus2/BD2-L2D-Viewer/main/src/assets/spines/"
        },
        trans: {
            "zh-TW": "暴食女王",
            "zh-CN": "暴食女王",
            "ja": "暴食の女王",
            "ko": "포식의 여왕",
            "en": "Queen of Gluttis"
        }
    }
];

entriesToAdd.forEach(item => {
    // 1. Add to Models
    const char = models.characters.find(c => c.id.startsWith(item.prefix));
    if (char) {
        const exists = char.costumes.find(c => c.id === item.costume.id);
        if (!exists) {
            char.costumes.push(item.costume);
            console.log(`[Models] Added ${item.costume.name} to ${char.name}`);
        } else {
            console.log(`[Models] ${item.costume.name} already exists for ${char.name}`);
        }

        // 2. Add to Names
        // Key in names JSON is the Character Name
        if (!names[char.name]) names[char.name] = {};

        // Add translation
        // Key is the COSTUME NAME (English)
        names[char.name][item.costume.name] = item.trans;
        console.log(`[Names] Added translation for ${char.name} - ${item.costume.name}`);

    } else {
        console.error(`[Error] Character with prefix ${item.prefix} not found!`);
    }
});

fs.writeFileSync(modelsPath, JSON.stringify(models, null, 4));
fs.writeFileSync(namesPath, JSON.stringify(names, null, 4));
console.log('Done.');
