// Popup Logic
console.log('Popup script loaded');

const showPet = document.getElementById('showPet') as HTMLInputElement;
const lockMove = document.getElementById('lockMove') as HTMLInputElement;
const lockZoom = document.getElementById('lockZoom') as HTMLInputElement;
const opacity = document.getElementById('opacity') as HTMLInputElement;
const opacityValue = document.getElementById('opacityValue') as HTMLElement;
const language = document.getElementById('language') as HTMLSelectElement;

// Dual Selects
const characterSelect = document.getElementById('characterSelect') as HTMLSelectElement;
const modelSelect = document.getElementById('modelSelect') as HTMLSelectElement; // Costume Select
const characterSearch = document.getElementById('characterSearch') as HTMLInputElement;

// Labels
const autoRedeem = document.getElementById('autoRedeem') as HTMLInputElement;

// Labels
const lblShow = document.getElementById('lbl-show');
const lblLockMove = document.getElementById('lbl-lockMove');
const lblLockZoom = document.getElementById('lbl-lockZoom');
const lblLang = document.getElementById('lbl-language');
const lblOpacity = document.getElementById('lbl-opacity');
const lblCharacter = document.getElementById('lbl-character');
const lblCostume = document.getElementById('lbl-costume');
const lblAutoRedeem = document.getElementById('lbl-autoRedeem');


const DEFAULT_SETTINGS = {
    show: true,
    lockMove: false,
    lockZoom: false,
    opacity: 1,
    language: 'zh-TW',
    characterId: '003801',
    model: '003892', // Default Costume
    autoRedeem: false
};

const UI_STRINGS: Record<string, any> = {
    'zh-TW': {
        show: '顯示 BD2 Assistant',
        lockMove: '鎖定位置',
        lockZoom: '鎖定大小',
        language: '語言',
        opacity: '不透明度',
        character: '選擇角色',
        costume: '選擇服裝',
        search: '搜尋角色...',
        clearCache: '清除已下載模型 🗑️',
        syncSection: '同步 The BD2 Pulse',
        syncBtn: '從網站同步 🔄',
        checkCodes: '查看兌換碼 🎁',
        synced: '已同步: ',
        syncedAccounts: '已同步 {n} 個帳號',
        noSync: '尚未同步',
        syncing: '同步中...',
        openWeb: '正在開啟網站...',
        syncSuccess: '同步成功! ✅',
        syncFail: '同步失敗 ❌',
        autoRedeem: '自動兌換',
        loadLocal: '載入本地模型 📁',
        localName: '請輸入模型名稱：',
        localMissingSkel: '❌ 缺少 .skel 檔案（骨架資料）',
        localMissingAtlas: '❌ 缺少 .atlas 檔案（圖集描述）',
        localMissingPng: '❌ 缺少 .png 檔案（紋理圖片）',
        localMultipleSkel: '❌ 資料夾內有多個 .skel 檔，請只保留一個',
        localMultipleAtlas: '❌ 資料夾內有多個 .atlas 檔，請只保留一個',
        localSaved: '模型已儲存 ✅',
        localExists: '此名稱已存在，請使用其他名稱',
        localDelete: '刪除'
    },
    'zh-CN': {
        show: '显示 BD2 Assistant',
        lockMove: '锁定位置',
        lockZoom: '锁定大小',
        language: '语言',
        opacity: '不透明度',
        character: '选择角色',
        costume: '选择服装',
        search: '搜索角色...',
        clearCache: '清除已下载模型 🗑️',
        syncSection: '同步 The BD2 Pulse',
        syncBtn: '从网站同步 🔄',
        checkCodes: '查看兑换码 🎁',
        synced: '已同步: ',
        syncedAccounts: '已同步 {n} 个账号',
        noSync: '尚未同步',
        syncing: '同步中...',
        openWeb: '正在打开网站...',
        syncSuccess: '同步成功! ✅',
        syncFail: '同步失败 ❌',
        autoRedeem: '自动兑换',
        loadLocal: '载入本地模型 📁',
        localName: '请输入模型名称：',
        localMissingSkel: '❌ 缺少 .skel 文件（骨架数据）',
        localMissingAtlas: '❌ 缺少 .atlas 文件（图集描述）',
        localMissingPng: '❌ 缺少 .png 文件（纹理图片）',
        localMultipleSkel: '❌ 文件夹内有多个 .skel 文件，请只保留一个',
        localMultipleAtlas: '❌ 文件夹内有多个 .atlas 文件，请只保留一个',
        localSaved: '模型已保存 ✅',
        localExists: '此名称已存在，请使用其他名称',
        localDelete: '删除'
    },
    'en': {
        show: 'Show BD2 Assistant',
        lockMove: 'Lock Move',
        lockZoom: 'Lock Zoom',
        language: 'Language',
        opacity: 'Opacity',
        character: 'Character',
        costume: 'Costume',
        search: 'Search Character...',
        clearCache: 'Clear Downloaded Models 🗑️',
        syncSection: 'Sync The BD2 Pulse',
        syncBtn: 'Sync from Website 🔄',
        checkCodes: 'Check for Codes 🎁',
        synced: 'Synced: ',
        syncedAccounts: 'Synced {n} Accounts',
        noSync: 'Not Synced',
        syncing: 'Syncing...',
        openWeb: 'Opening Website...',
        syncSuccess: 'Sync Success! ✅',
        syncFail: 'Sync Failed ❌',
        autoRedeem: 'Auto Redeem',
        loadLocal: 'Load Local Model 📁',
        localName: 'Enter a name for this model:',
        localMissingSkel: '❌ Missing .skel file (skeleton data)',
        localMissingAtlas: '❌ Missing .atlas file (texture atlas)',
        localMissingPng: '❌ Missing .png file (texture image)',
        localMultipleSkel: '❌ Multiple .skel files found — keep only one',
        localMultipleAtlas: '❌ Multiple .atlas files found — keep only one',
        localSaved: 'Model Saved ✅',
        localExists: 'This name already exists, please use a different name',
        localDelete: 'Delete'
    },
    'ja-JP': {
        show: 'BD2 Assistant を表示',
        lockMove: '位置をロック',
        lockZoom: 'サイズをロック',
        language: '言語',
        opacity: '不透明度',
        character: 'キャラクター',
        costume: 'コスチューム',
        search: '検索...',
        clearCache: 'ダウンロード済みモデルを削除 🗑️',
        syncSection: 'The BD2 Pulse と同期',
        syncBtn: 'Webサイトから同期 🔄',
        checkCodes: 'コードを確認 🎁',
        synced: '同期済み: ',
        syncedAccounts: '{n} アカウント同期済み',
        noSync: '未同期',
        syncing: '同期中...',
        openWeb: 'サイトを開いています...',
        syncSuccess: '同期成功! ✅',
        syncFail: '同期失敗 ❌',
        autoRedeem: '自動交換',
        loadLocal: 'ローカルモデルを読み込む 📁',
        localName: 'モデル名を入力してください：',
        localMissingSkel: '❌ .skel ファイルがありません（スケルトンデータ）',
        localMissingAtlas: '❌ .atlas ファイルがありません（テクスチャアトラス）',
        localMissingPng: '❌ .png ファイルがありません（テクスチャ画像）',
        localMultipleSkel: '❌ 複数の .skel ファイルが見つかりました',
        localMultipleAtlas: '❌ 複数の .atlas ファイルが見つかりました',
        localSaved: 'モデルを保存しました ✅',
        localExists: 'この名前は既に使用されています',
        localDelete: '削除'
    },
    'ko-KR': {
        show: 'BD2 Assistant 표시',
        lockMove: '이동 잠금',
        lockZoom: '크기 잠금',
        language: '언어',
        opacity: '투명도',
        character: '캐릭터',
        costume: '코스튬',
        search: '검색...',
        clearCache: '다운로드된 모델 삭제 🗑️',
        syncSection: 'The BD2 Pulse 동기화',
        syncBtn: '웹사이트에서 동기화 🔄',
        checkCodes: '코드 확인 🎁',
        synced: '동기화됨: ',
        syncedAccounts: '{n} 계정 동기화됨',
        noSync: '미동기',
        syncing: '동기화 중...',
        openWeb: '웹사이트 여는 중...',
        syncSuccess: '동기화 성공! ✅',
        syncFail: '동기화 실패 ❌',
        autoRedeem: '자동 교환',
        loadLocal: '로컬 모델 불러오기 📁',
        localName: '모델 이름을 입력하세요:',
        localMissingSkel: '❌ .skel 파일 누락 (스켈레톤 데이터)',
        localMissingAtlas: '❌ .atlas 파일 누락 (텍스처 아틀라스)',
        localMissingPng: '❌ .png 파일 누락 (텍스처 이미지)',
        localMultipleSkel: '❌ .skel 파일이 여러 개입니다 — 하나만 남겨주세요',
        localMultipleAtlas: '❌ .atlas 파일이 여러 개입니다 — 하나만 남겨주세요',
        localSaved: '모델 저장됨 ✅',
        localExists: '이미 사용 중인 이름입니다',
        localDelete: '삭제'
    }
};

interface PetSettings {
    show: boolean;
    lockMove: boolean;
    lockZoom: boolean;
    opacity: number;
    language: string;
    characterId: string;
    model: string; // Costume ID
    nickname?: string;
    nicknames?: string[]; // Multi-account support
    autoRedeem?: boolean;
}

// Global Cache for Settings not in Form
let cachedNicknames: string[] = [];
let cachedNickname: string | undefined;

// Global Data
let modelsData: any = null;
let characterNames: Record<string, Record<string, string>> = {};
let costumeNames: Record<string, Record<string, Record<string, string>>> = {};
let cachedCostumes: Set<string> = new Set();

function updateUILanguage(lang: string) {
    const strings = UI_STRINGS[lang] || UI_STRINGS['en'];
    if (lblShow) lblShow.textContent = strings.show;
    if (lblLockMove) lblLockMove.textContent = strings.lockMove;
    if (lblLockZoom) lblLockZoom.textContent = strings.lockZoom;
    if (lblLang) lblLang.textContent = strings.language;
    if (lblOpacity) lblOpacity.textContent = strings.opacity;
    if (lblCharacter) lblCharacter.textContent = strings.character;
    if (lblCostume) lblCostume.textContent = strings.costume;
    if (lblAutoRedeem) lblAutoRedeem.textContent = strings.autoRedeem;
    if (characterSearch) characterSearch.placeholder = strings.search;

    // New Element Bindings (using span IDs for text)
    const lblSyncSection = document.getElementById('lbl-syncSection');
    if (lblSyncSection) lblSyncSection.textContent = strings.syncSection;

    const btnSyncText = document.getElementById('syncData-text');
    if (btnSyncText) {
        btnSyncText.textContent = strings.syncBtn;
    }

    const btnCheckCodesText = document.getElementById('checkCodes-text');
    if (btnCheckCodesText) {
        btnCheckCodesText.textContent = strings.checkCodes;
    }

    const btnClearText = document.getElementById('clearCache-text');
    if (btnClearText) btnClearText.textContent = strings.clearCache;

    const btnLoadLocalText = document.getElementById('loadLocalModel-text');
    if (btnLoadLocalText) btnLoadLocalText.textContent = strings.loadLocal;

    // Update Synced Status Text
    const elNickname = document.getElementById('currentNickname');
    if (elNickname && elNickname.textContent) {
        // Check if account count indicator exists
        if (elNickname.dataset.accountCount) {
            const count = parseInt(elNickname.dataset.accountCount, 10);
            if (count > 1) {
                elNickname.textContent = strings.syncedAccounts.replace('{n}', String(count));
            } else if (elNickname.dataset.nickname) {
                elNickname.textContent = `${strings.synced}${elNickname.dataset.nickname}`;
            }
        } else if (!elNickname.dataset.synced) {
            // Not synced yet
            elNickname.textContent = strings.noSync;
        }
    }
}
// ... Initialization ...

// ... Initialization ...

async function init() {
    // 1. Load Settings
    chrome.storage.sync.get(['petSettings'], async (result: { petSettings?: any }) => {
        const saved = result.petSettings || {};
        const settings: PetSettings = { ...DEFAULT_SETTINGS, ...saved };

        // UI Bindings
        if (showPet) showPet.checked = settings.show;
        if (lockMove) lockMove.checked = settings.lockMove;
        if (lockZoom) lockZoom.checked = settings.lockZoom;
        if (autoRedeem) autoRedeem.checked = !!settings.autoRedeem;

        if (opacity) {
            opacity.value = String(settings.opacity * 100);
            if (opacityValue) opacityValue.textContent = opacity.value + '%';
        }

        // Cache Nicknames
        cachedNicknames = settings.nicknames || [];
        cachedNickname = settings.nickname;

        // Sync UI Status
        updateSyncStatus(settings);

        // Language
        const currentLang = settings.language || 'zh-TW';
        if (language) language.value = currentLang;
        updateUILanguage(currentLang);

        // 2. Load Models
        await Promise.all([loadModelsData(), loadCharacterNames(), loadCostumeNames()]);

        // 3. Load Cache Status
        loadCacheStatus();

        if (modelsData) {
            // Initial Population logic handled by initializeDropdowns
            initializeDropdowns(settings);
        }
    });
}


function updateSyncStatus(settings: PetSettings) {
    const elNickname = document.getElementById('currentNickname') as HTMLElement | null;
    const strings = UI_STRINGS[settings.language || 'zh-TW'] || UI_STRINGS['en'];
    const nicknames = settings.nicknames;
    const nickname = settings.nickname;

    if (elNickname) {
        if (nicknames && nicknames.length > 0) {
            elNickname.dataset.synced = 'true';
            elNickname.dataset.accountCount = String(nicknames.length);
            elNickname.dataset.nickname = nicknames[0];
            if (nicknames.length > 1) {
                elNickname.textContent = strings.syncedAccounts.replace('{n}', String(nicknames.length));
                elNickname.style.color = '#e72857';
            } else {
                elNickname.textContent = `${strings.synced}${nicknames[0]}`;
                elNickname.style.color = '#4CAF50';
            }
        } else if (nickname) {
            elNickname.dataset.synced = 'true';
            elNickname.dataset.accountCount = '1';
            elNickname.dataset.nickname = nickname;
            elNickname.textContent = `${strings.synced}${nickname}`;
            elNickname.style.color = '#4CAF50';
        } else {
            elNickname.textContent = strings.noSync;
            elNickname.style.color = '#888';
        }
    }
}


function initializeDropdowns(settings: PetSettings) {
    let startCharId = settings.characterId;

    // Local models don't exist in modelsData — skip fallback
    if (!startCharId.startsWith('local_')) {
        // Fallback logic for built-in models
        const charExists = modelsData.characters.find((c: any) => c.id === startCharId);
        if (!charExists) {
            for (const char of modelsData.characters) {
                if (char.costumes.find((c: any) => c.id === settings.model)) {
                    startCharId = char.id;
                    break;
                }
            }
        }
        if (!modelsData.characters.find((c: any) => c.id === startCharId)) {
            startCharId = modelsData.characters[0].id;
        }
    }

    populateCharacters(startCharId, settings.language || 'zh-TW');
    // For local models, populateCharacters already sets up the costume dropdown
    if (!startCharId.startsWith('local_')) {
        populateCostumes(characterSelect.value, settings.model, settings.language || 'zh-TW');
    }
}

// Start Init
init();


// --- Functions ---

async function loadModelsData() {

    try {
        const res = await fetch(chrome.runtime.getURL('models.json'));
        modelsData = await res.json();
    } catch (e) {
        console.error('Failed to load models.json', e);
    }
}

async function loadCharacterNames() {
    try {
        const res = await fetch(chrome.runtime.getURL('character_names.json'));
        characterNames = await res.json();
    } catch (e) {
        console.error('Failed to load character_names.json', e);
    }
}

async function loadCostumeNames() {
    try {
        const res = await fetch(chrome.runtime.getURL('costume_names.json'));
        costumeNames = await res.json();
    } catch (e) {
        console.error('Failed to load costume_names.json', e);
    }
}

async function loadCacheStatus() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) return;

        chrome.tabs.sendMessage(tab.id, { type: 'PET_GET_DLC_STATUS' }, (response) => {
            if (chrome.runtime.lastError) {
                // Content script might not be ready or page doesn't support it
                console.log('[Popup] Could not query cache status', chrome.runtime.lastError);
                return;
            }
            if (response && response.cachedIds) {
                cachedCostumes = new Set(response.cachedIds);
                console.log('[Popup] Cached Costumes:', cachedCostumes);
                // Refresh current list to remove clouds
                if (characterSelect.value) {
                    populateCostumes(characterSelect.value, modelSelect.value, language.value);
                }
            }
        });
    } catch (e) {
        console.error('Failed to load cache status', e);
    }
}

// Get localized character name
function getLocalizedName(englishName: string, lang: string): string {
    // Map popup language codes to character_names.json keys
    const langMap: Record<string, string> = {
        'zh-TW': 'zh-TW',
        'zh-CN': 'zh-CN',
        'ja-JP': 'ja',
        'ko-KR': 'ko',
        'en': 'en'
    };
    const mappedLang = langMap[lang] || 'en';

    if (mappedLang === 'en') return englishName;

    const translations = characterNames[englishName];
    if (translations && translations[mappedLang]) {
        return translations[mappedLang];
    }
    return englishName; // Fallback to English
}

// Get localized costume name
function getLocalizedCostumeName(charName: string, costumeName: string, lang: string): string {
    // Map popup language codes to costume_names.json keys
    const langMap: Record<string, string> = {
        'zh-TW': 'zh-TW',
        'zh-CN': 'zh-CN',
        'ja-JP': 'ja',
        'ko-KR': 'ko',
        'en': 'en'
    };
    const mappedLang = langMap[lang] || 'en';

    if (mappedLang === 'en') return costumeName;

    const charCostumes = costumeNames[charName];
    if (charCostumes && charCostumes[costumeName] && charCostumes[costumeName][mappedLang]) {
        return charCostumes[costumeName][mappedLang];
    }
    return costumeName; // Fallback to English
}

// Populate Character Dropdown
function populateCharacters(selectedId: string, lang: string = 'en', preserveCostumeId: string | null = null, filter: string = ''): boolean {
    if (!characterSelect || !modelsData) return false;
    const startValue = characterSelect.value;
    characterSelect.innerHTML = '';

    let firstVisibleId: string | null = null;
    let isSelectedVisible = false;

    // --- Local Models (at the top) ---
    const localModels = getLocalModelsList();
    if (localModels.length > 0 && !filter) {
        localModels.forEach((lm: { id: string, name: string }) => {
            const opt = document.createElement('option');
            opt.value = lm.id;
            opt.textContent = `📁 ${lm.name}`;
            characterSelect.appendChild(opt);
            if (!firstVisibleId) firstVisibleId = lm.id;
            if (lm.id === selectedId) isSelectedVisible = true;
        });
        // Separator
        const sep = document.createElement('option');
        sep.disabled = true;
        sep.textContent = '────────────';
        characterSelect.appendChild(sep);
    } else if (localModels.length > 0 && filter) {
        // Include local models in search too
        const f = filter.toLowerCase();
        localModels.forEach((lm: { id: string, name: string }) => {
            if (lm.name.toLowerCase().includes(f)) {
                const opt = document.createElement('option');
                opt.value = lm.id;
                opt.textContent = `📁 ${lm.name}`;
                characterSelect.appendChild(opt);
                if (!firstVisibleId) firstVisibleId = lm.id;
                if (lm.id === selectedId) isSelectedVisible = true;
            }
        });
    }

    // --- Built-in Characters ---

    modelsData.characters.forEach((char: any) => {
        const name = getLocalizedName(char.name, lang);

        // Filter Logic
        if (filter) {
            const f = filter.toLowerCase();
            if (!name.toLowerCase().includes(f) && !char.id.includes(f)) {
                return;
            }
        }

        const opt = document.createElement('option');
        opt.value = char.id;
        opt.textContent = name;
        characterSelect.appendChild(opt);

        if (!firstVisibleId) firstVisibleId = char.id;
        if (char.id === selectedId) isSelectedVisible = true;
    });

    // Handle Selection State
    if (isSelectedVisible) {
        characterSelect.value = selectedId;
    } else if (firstVisibleId) {
        characterSelect.value = firstVisibleId;
    }

    // Trigger Costume Update (Only if we have a valid selection)
    if (characterSelect.value) {
        // For local models, create a single costume entry
        if (characterSelect.value.startsWith('local_')) {
            modelSelect.innerHTML = '';
            const localModels = getLocalModelsList();
            const lm = localModels.find((m: { id: string }) => m.id === characterSelect.value);
            if (lm) {
                const opt = document.createElement('option');
                opt.value = lm.id;
                opt.textContent = lm.name;
                modelSelect.appendChild(opt);
            }
        } else {
            populateCostumes(characterSelect.value, preserveCostumeId, lang);
        }
    }

    return characterSelect.value !== startValue;
}

// Populate Costume Dropdown
function populateCostumes(charId: string, selectedCostumeId: string | null, lang: string = 'en') {
    if (!modelSelect || !modelsData) return;
    modelSelect.innerHTML = '';

    const charData = modelsData.characters.find((c: any) => c.id === charId);
    if (!charData) return;

    charData.costumes.forEach((costume: any) => {
        const opt = document.createElement('option');
        opt.value = costume.id;
        const localizedName = getLocalizedCostumeName(charData.name, costume.name, lang);
        // Show cloud if NOT built-in AND NOT cached
        const isCached = costume.isBuiltIn || cachedCostumes.has(costume.id);
        opt.textContent = localizedName + (isCached ? '' : ' ☁');
        modelSelect.appendChild(opt);
    });

    // Set Selection
    // If explicit selection provided, try valid.
    // Else use default.
    const targetId = selectedCostumeId || charData.defaultCostumeId;
    // Verify it exists in this list (sanity check)
    const exists = charData.costumes.find((c: any) => c.id === targetId);

    modelSelect.value = exists ? targetId : charData.costumes[0].id;
}


// --- Initialization ---

chrome.storage.sync.get(['petSettings'], async (result: { petSettings?: any }) => {
    const saved = result.petSettings || {};
    const settings: PetSettings = { ...DEFAULT_SETTINGS, ...saved };

    // 1. UI Bindings
    if (showPet) showPet.checked = settings.show;
    if (lockMove) lockMove.checked = settings.lockMove;
    if (lockZoom) lockZoom.checked = settings.lockZoom;

    if (lockZoom) lockZoom.checked = settings.lockZoom;

    // Nickname UI - Support for multi-account
    const elNickname = document.getElementById('currentNickname') as HTMLElement | null;
    const strings = UI_STRINGS[settings.language || 'zh-TW'] || UI_STRINGS['en'];

    if (elNickname) {
        // Check for nicknames array first (multi-account), then fallback to single nickname
        const nicknames = (saved as any).nicknames as string[] | undefined;
        const nickname = settings.nickname;

        // Cache for saving
        cachedNicknames = nicknames || [];
        cachedNickname = nickname;

        if (nicknames && nicknames.length > 0) {
            elNickname.dataset.synced = 'true';
            elNickname.dataset.accountCount = String(nicknames.length);
            elNickname.dataset.nickname = nicknames[0];

            if (nicknames.length > 1) {
                elNickname.textContent = strings.syncedAccounts.replace('{n}', String(nicknames.length));
                elNickname.style.color = '#e72857';
            } else {
                elNickname.textContent = `${strings.synced}${nicknames[0]}`;
                elNickname.style.color = '#4CAF50';
            }
        } else if (nickname) {
            elNickname.dataset.synced = 'true';
            elNickname.dataset.accountCount = '1';
            elNickname.dataset.nickname = nickname;
            elNickname.textContent = `${strings.synced}${nickname}`;
            elNickname.style.color = '#4CAF50';
        } else {
            elNickname.textContent = strings.noSync;
            elNickname.style.color = '#888';
        }
    }

    const currentLang = settings.language || 'zh-TW';
    if (language) language.value = currentLang;
    updateUILanguage(currentLang);

    if (opacity) {
        opacity.value = String(settings.opacity * 100);
        if (opacityValue) opacityValue.textContent = opacity.value + '%';
    }

    // 2. Load Models and Character Names
    await Promise.all([loadModelsData(), loadCharacterNames(), loadCostumeNames()]);

    // 3. Load Cache Status
    loadCacheStatus();

    if (modelsData) {
        console.log('[Popup] Loaded Settings:', settings);
        let startCharId = settings.characterId;

        // Local models don't exist in modelsData — skip fallback
        if (!startCharId.startsWith('local_')) {
            const charExists = modelsData.characters.find((c: any) => c.id === startCharId);

            if (!charExists) {
                console.log(`[Popup] Character ID '${startCharId}' not found. Attempting recovery via Costume ID: ${settings.model}`);
                for (const char of modelsData.characters) {
                    if (char.costumes.find((c: any) => c.id === settings.model)) {
                        startCharId = char.id;
                        break;
                    }
                }
            }

            // Final Fallback: If still invalid, default to first in list
            if (!modelsData.characters.find((c: any) => c.id === startCharId)) {
                startCharId = modelsData.characters[0].id;
            }
        }

        populateCharacters(startCharId, currentLang);
        // For local models, populateCharacters already sets up the costume dropdown
        if (!startCharId.startsWith('local_')) {
            populateCostumes(characterSelect.value, settings.model, currentLang);
        }
    }
});

// --- Events ---

const saveSettings = () => {
    const settings: PetSettings = {
        show: showPet.checked,
        lockMove: lockMove.checked,
        lockZoom: lockZoom.checked,
        opacity: Number(opacity.value) / 100,
        language: language.value,
        characterId: characterSelect.value,
        model: modelSelect.value, // Costume ID
        nickname: cachedNickname,
        nicknames: cachedNicknames,
        autoRedeem: autoRedeem ? autoRedeem.checked : false
    };

    updateUILanguage(language.value);

    chrome.storage.sync.set({ petSettings: settings }, () => {
        console.log('Settings saved:', settings);
    });
};

if (characterSelect) {
    characterSelect.addEventListener('change', () => {
        if (characterSelect.value.startsWith('local_')) {
            // Local model: single costume entry
            modelSelect.innerHTML = '';
            const localModels = getLocalModelsList();
            const lm = localModels.find(m => m.id === characterSelect.value);
            if (lm) {
                const opt = document.createElement('option');
                opt.value = lm.id;
                opt.textContent = lm.name;
                modelSelect.appendChild(opt);
            }
        } else {
            // When character changes, update costumes using Default for that char
            populateCostumes(characterSelect.value, null, language.value);
        }
        saveSettings();
    });
}

if (language) {
    language.addEventListener('change', () => {
        // Re-populate characters with new language
        if (modelsData) {
            const currentCharId = characterSelect.value;
            const currentCostumeId = modelSelect.value;
            populateCharacters(currentCharId, language.value, currentCostumeId);
        }
        saveSettings();
    });
}

if (modelSelect) modelSelect.addEventListener('change', saveSettings);
if (showPet) showPet.addEventListener('change', saveSettings);
if (lockMove) lockMove.addEventListener('change', saveSettings);
if (lockZoom) lockZoom.addEventListener('change', saveSettings);
// language listener already added above with localization logic
if (opacity) {
    opacity.addEventListener('input', () => {
        if (opacityValue) opacityValue.textContent = opacity.value + '%';
        saveSettings();
    });
}
if (autoRedeem) autoRedeem.addEventListener('change', saveSettings);


if (characterSearch) {
    characterSearch.addEventListener('input', (e) => {
        const val = (e.target as HTMLInputElement).value;
        const currentCharId = characterSelect.value;
        const currentCostumeId = modelSelect.value;
        const changed = populateCharacters(currentCharId, language.value, currentCostumeId, val);
        if (changed) {
            saveSettings();
        }
    });
}

const clearCacheBtn = document.getElementById('clearCache');
if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', async () => {
        const confirmClear = confirm('Are you sure you want to clear all downloaded characters?');
        if (!confirmClear) return;

        clearCacheBtn.textContent = 'Clearing...';

        // Send to Active Tab (Bridge)
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'PET_CLEAR_CACHE' }, (_response) => {
                if (chrome.runtime.lastError) {
                    console.warn('Could not send clear cache message', chrome.runtime.lastError);
                    alert('Could not connect to the page. Please refresh the web page and try again.');
                    clearCacheBtn.textContent = 'Clear DLC Cache 🗑️';
                } else {
                    setTimeout(() => {
                        alert('Cache cleared! Page will now reload.');
                        chrome.tabs.reload(tab.id!);
                        window.close(); // Close popup
                    }, 500);
                }
            });
        }
    });
}

// Sync Logic
const btnSync = document.getElementById('syncData');
const btnSyncText = document.getElementById('syncData-text');
if (btnSync && btnSyncText) {
    btnSync.addEventListener('click', () => {
        const currentLang = (document.getElementById('language') as HTMLSelectElement).value || 'en';
        const strings = UI_STRINGS[currentLang] || UI_STRINGS['en'];

        btnSyncText.textContent = strings.openWeb;

        // Open URL with Sync Signal
        chrome.tabs.create({ url: 'https://thebd2pulse.com/?pet_sync=true', active: true });

        // Popup will likely close here, but if not:
        setTimeout(() => {
            btnSyncText.textContent = strings.syncing;
        }, 1000);
    });
}

// Check Codes Logic
const btnCheckCodes = document.getElementById('checkCodes');
const btnCheckCodesText = document.getElementById('checkCodes-text');

if (btnCheckCodes) {
    btnCheckCodes.addEventListener('click', () => {
        const originalText = btnCheckCodesText?.textContent;
        if (btnCheckCodesText) btnCheckCodesText.textContent = 'Checking...';

        // Use Official API via Background Script
        chrome.runtime.sendMessage({ type: 'TEST_NOTIFICATION' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Check Codes Error:', chrome.runtime.lastError);
                if (btnCheckCodesText) btnCheckCodesText.textContent = 'Error ❌';
            } else if (response && !response.success) {
                console.warn('Check Codes Failed:', response.error);
                if (btnCheckCodesText) btnCheckCodesText.textContent = 'No Codes ❌';
            } else {
                if (btnCheckCodesText) btnCheckCodesText.textContent = 'Done! ✅';
            }

            setTimeout(() => {
                if (btnCheckCodesText && originalText) btnCheckCodesText.textContent = originalText;
            }, 2000);
        });
    });
}

// Global Message Listener for Sync Updates
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'PET_SYNC_DATA') {
        const { nickname, nicknames } = message.data;
        const elNickname = document.getElementById('currentNickname') as HTMLElement | null;

        const currentLang = (document.getElementById('language') as HTMLSelectElement).value || 'en';
        const strings = UI_STRINGS[currentLang] || UI_STRINGS['en'];

        if (elNickname) {
            // Store data in dataset for language switching
            elNickname.dataset.synced = 'true';

            if (nicknames && nicknames.length > 0) {
                elNickname.dataset.accountCount = String(nicknames.length);
                elNickname.dataset.nickname = nicknames[0]; // Primary nickname

                if (nicknames.length > 1) {
                    // Multi-account display
                    elNickname.textContent = strings.syncedAccounts.replace('{n}', String(nicknames.length));
                    elNickname.style.color = '#e72857'; // Website accent color
                } else {
                    elNickname.textContent = `${strings.synced}${nicknames[0]}`;
                    elNickname.style.color = '#4CAF50';
                }
            } else if (nickname) {
                elNickname.dataset.accountCount = '1';
                elNickname.dataset.nickname = nickname;
                elNickname.textContent = `${strings.synced}${nickname}`;
                elNickname.style.color = '#4CAF50';
            }

            // Reset Sync button
            if (btnSyncText) btnSyncText.textContent = strings.syncBtn;
        }
    }
});

// ====================================================================
// LOCAL MODEL MANAGEMENT
// ====================================================================

interface LocalModelEntry {
    id: string;    // 'local_{sanitizedName}'
    name: string;  // User-given display name
}

function getLocalModelsList(): LocalModelEntry[] {
    try {
        const raw = localStorage.getItem('bd2_local_models');
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function saveLocalModelsList(list: LocalModelEntry[]) {
    localStorage.setItem('bd2_local_models', JSON.stringify(list));
}

function sanitizeModelName(name: string): string {
    return name.replace(/[^a-zA-Z0-9\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af_-]/g, '_').substring(0, 50);
}

async function handleLocalFolderSelect(files: FileList) {
    const currentLang = language?.value || 'zh-TW';
    const strings = UI_STRINGS[currentLang] || UI_STRINGS['en'];
    const allFiles = Array.from(files);

    // Filter to ONLY root-level files (ignore subfolders)
    // webkitRelativePath format: "folderName/file.ext" for root, "folderName/sub/file.ext" for nested
    const fileArray = allFiles.filter(f => {
        const parts = (f.webkitRelativePath || f.name).split('/');
        return parts.length <= 2; // "folder/file" = 2 parts = root level
    });

    // 1. Validate
    const skelFiles = fileArray.filter(f => f.name.endsWith('.skel'));
    const atlasFiles = fileArray.filter(f => f.name.endsWith('.atlas'));
    const pngFiles = fileArray.filter(f => f.name.endsWith('.png'));

    const errors: string[] = [];
    if (skelFiles.length === 0) errors.push(strings.localMissingSkel);
    if (skelFiles.length > 1) errors.push(strings.localMultipleSkel);
    if (atlasFiles.length === 0) errors.push(strings.localMissingAtlas);
    if (atlasFiles.length > 1) errors.push(strings.localMultipleAtlas);
    if (pngFiles.length === 0) errors.push(strings.localMissingPng);

    if (errors.length > 0) {
        alert(errors.join('\n'));
        return;
    }

    // 2. Ask for name
    const displayName = prompt(strings.localName);
    if (!displayName || displayName.trim() === '') return;

    const sanitized = sanitizeModelName(displayName.trim());
    const modelId = `local_${sanitized}`;

    // 3. Check for duplicates
    const existing = getLocalModelsList();
    if (existing.find(m => m.id === modelId)) {
        alert(strings.localExists);
        return;
    }

    // 4. Read files and send to content script (bridge) for IndexedDB storage
    const skelFile = skelFiles[0];
    const atlasFile = atlasFiles[0];

    try {
        // Read all files as ArrayBuffers
        const skelBuffer = await skelFile.arrayBuffer();
        const atlasBuffer = await atlasFile.arrayBuffer();
        const pngBuffers: { name: string, data: ArrayBuffer }[] = [];
        for (const png of pngFiles) {
            pngBuffers.push({ name: png.name, data: await png.arrayBuffer() });
        }

        // Send to active tab's content script for IndexedDB storage
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) {
            alert('No active tab found. Please open a webpage and try again.');
            return;
        }

        // Convert to base64 for messaging (chrome.tabs.sendMessage can't send ArrayBuffers)
        const toBase64 = (buf: ArrayBuffer): string => {
            const bytes = new Uint8Array(buf);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary);
        };

        const payload = {
            type: 'PET_SAVE_LOCAL_MODEL',
            modelId: modelId,
            skelData: toBase64(skelBuffer),
            skelName: skelFile.name,
            atlasData: toBase64(atlasBuffer),
            atlasName: atlasFile.name,
            pngFiles: pngBuffers.map(p => ({
                name: p.name,
                data: toBase64(p.data)
            }))
        };

        chrome.tabs.sendMessage(tab.id, payload, (response) => {
            if (chrome.runtime.lastError) {
                console.error('[Popup] Save local model error:', chrome.runtime.lastError);
                alert('Could not save model. Please refresh the webpage and try again.');
                return;
            }

            if (response && response.success) {
                // Save to local list
                const list = getLocalModelsList();
                list.push({ id: modelId, name: displayName.trim() });
                saveLocalModelsList(list);

                // Also save to chrome.storage.sync for cross-device
                chrome.storage.sync.set({ localModels: list });

                // Refresh UI first so dropdown is populated
                populateCharacters(modelId, language.value);

                // Ensure correct values after populate
                characterSelect.value = modelId;
                modelSelect.innerHTML = '';
                const opt = document.createElement('option');
                opt.value = modelId;
                opt.textContent = displayName.trim();
                modelSelect.appendChild(opt);

                // Save settings AFTER dropdown is properly set
                saveSettings();
                refreshLocalModelsUI();

                const btnText = document.getElementById('loadLocalModel-text');
                if (btnText) {
                    btnText.textContent = strings.localSaved;
                    setTimeout(() => { btnText.textContent = strings.loadLocal; }, 2000);
                }
            } else {
                alert('Failed to save model files.');
            }
        });
    } catch (e) {
        console.error('[Popup] Local model load error:', e);
        alert('Error reading files.');
    }
}

function refreshLocalModelsUI() {
    const container = document.getElementById('localModelsList');
    if (!container) return;
    const currentLang = language?.value || 'zh-TW';
    const strings = UI_STRINGS[currentLang] || UI_STRINGS['en'];
    const models = getLocalModelsList();

    container.innerHTML = '';
    if (models.length === 0) return;

    models.forEach(m => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:11px;border-bottom:1px solid rgba(255,255,255,0.05);';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = `📁 ${m.name}`;
        nameSpan.style.color = '#aaa';

        const delBtn = document.createElement('button');
        delBtn.textContent = strings.localDelete;
        delBtn.style.cssText = 'background:none;border:1px solid rgba(255,80,80,0.3);color:#ff5050;padding:2px 8px;border-radius:4px;cursor:pointer;font-size:10px;';
        delBtn.addEventListener('click', async () => {
            if (!confirm(`Delete "${m.name}"?`)) return;

            // Remove from list
            const list = getLocalModelsList().filter(x => x.id !== m.id);
            saveLocalModelsList(list);
            chrome.storage.sync.set({ localModels: list });

            // Tell bridge to remove from IndexedDB
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.id) {
                chrome.tabs.sendMessage(tab.id, { type: 'PET_DELETE_LOCAL_MODEL', modelId: m.id });
            }

            // If currently selected, switch to default
            if (characterSelect.value === m.id || modelSelect.value === m.id) {
                characterSelect.value = modelsData?.characters?.[0]?.id || '003801';
                populateCostumes(characterSelect.value, null, language.value);
                saveSettings();
            }

            refreshLocalModelsUI();
            populateCharacters(characterSelect.value, language.value);
        });

        row.appendChild(nameSpan);
        row.appendChild(delBtn);
        container.appendChild(row);
    });
}

// --- Local Model Event Listeners ---
const loadLocalBtn = document.getElementById('loadLocalModel');
const folderPicker = document.getElementById('folderPicker') as HTMLInputElement;

if (loadLocalBtn && folderPicker) {
    loadLocalBtn.addEventListener('click', () => {
        folderPicker.value = ''; // Reset
        folderPicker.click();
    });

    folderPicker.addEventListener('change', () => {
        if (folderPicker.files && folderPicker.files.length > 0) {
            handleLocalFolderSelect(folderPicker.files);
        }
    });
}

// Sync local models from chrome.storage on load
chrome.storage.sync.get(['localModels'], (result) => {
    if (result.localModels && Array.isArray(result.localModels)) {
        const synced = result.localModels as LocalModelEntry[];
        const local = getLocalModelsList();
        // Merge: keep union of both
        const merged = [...local];
        for (const s of synced) {
            if (!merged.find(m => m.id === s.id)) merged.push(s);
        }
        saveLocalModelsList(merged);
    }
    refreshLocalModelsUI();
});

// Initialize Popup
document.addEventListener('DOMContentLoaded', init);
