// Popup Logic
console.log('Popup script loaded');

const showPet = document.getElementById('showPet') as HTMLInputElement;
const lockMove = document.getElementById('lockMove') as HTMLInputElement;
const lockZoom = document.getElementById('lockZoom') as HTMLInputElement;
const flipX = document.getElementById('flipX') as HTMLInputElement;
const opacity = document.getElementById('opacity') as HTMLInputElement;
const opacityValue = document.getElementById('opacityValue') as HTMLElement;
const language = document.getElementById('language') as HTMLSelectElement;

// Dual Selects
const characterSelect = document.getElementById('characterSelect') as HTMLSelectElement;
const modelSelect = document.getElementById('modelSelect') as HTMLSelectElement; // Costume Select
const characterSearch = document.getElementById('characterSearch') as HTMLInputElement;
const renameLocalModelBtn = document.getElementById('renameLocalModelBtn') as HTMLButtonElement | null;
const deleteLocalModelBtn = document.getElementById('deleteLocalModelBtn') as HTMLButtonElement | null;

// WebShop elements
const autoRedeem = document.getElementById('autoRedeem') as HTMLInputElement;
const autoCheckin = document.getElementById('autoCheckin') as HTMLInputElement;
const syncWebshopTokenBtn = document.getElementById('syncWebshopToken') as HTMLButtonElement;
const manualCheckinBtn = document.getElementById('manualCheckin') as HTMLButtonElement;
const checkinStatus = document.getElementById('checkinStatus');

// Labels
const lblShow = document.getElementById('lbl-show');
const lblLockMove = document.getElementById('lbl-lockMove');
const lblLockZoom = document.getElementById('lbl-lockZoom');
const lblFlipX = document.getElementById('lbl-flipX');
const lblLang = document.getElementById('lbl-language');
const lblOpacity = document.getElementById('lbl-opacity');
const lblCharacter = document.getElementById('lbl-character');
const lblCostume = document.getElementById('lbl-costume');
const lblAutoRedeem = document.getElementById('lbl-autoRedeem');
const resetLayoutBtn = document.getElementById('resetLayoutBtn');


function getDefaultLanguage() {
    try {
        const uiLang = chrome.i18n.getUILanguage() || '';
        if (uiLang.startsWith('zh')) {
            if (uiLang.toLowerCase().includes('cn') || uiLang.toLowerCase().includes('hans')) return 'zh-CN';
            return 'zh-TW';
        }
        if (uiLang.startsWith('ja')) return 'ja-JP';
        if (uiLang.startsWith('ko')) return 'ko-KR';
    } catch (e) {
        // Fallback if i18n is unavailable
    }
    return 'zh-TW'; // Default fallback
}

const DEFAULT_SETTINGS = {
    show: true,
    lockMove: false,
    lockZoom: false,
    opacity: 1,
    language: getDefaultLanguage(),
    characterId: '003892',
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
        loadLocalSpine: '載入本地模型 📁',
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
        toggleBlacklistBlock: '🚫 在此網站隱藏',
        toggleBlacklistAllow: '✔️ 在此網站顯示',
        advancedBlacklist: '進階設定：管理黑名單',
        saveBlacklist: '儲存名單',
        blacklistSaved: '黑名單已儲存！',
        blacklistHint: '請輸入要隱藏的網域，每行一個（例如: forum.gamer.com.tw）',
        flipX: '左右反轉',
        animation: '選擇動作',
        checkModelUpdates: '檢查更新 🔄',
        version: '版本: ',
        checking: '檢查中...',
        updated: '更新成功！即將重整',
        upToDate: '已是最新版本',
        updateFailed: '檢查失敗',
        resetLayout: '重置位置與大小',
        webshopSection: 'WebShop 簽到',
        syncWebshopToken: '同步 WebShop 登入 🔑',
        manualCheckin: '立即簽到 ✅',
        autoCheckin: '自動簽到',
        checkinNotSetup: '尚未設定',
        checkinConnected: '已連結',
        checkinDisconnected: '尚未連結',
        checkinLastDaily: '上次每日簽到: ',
        checkinChecking: '簽到中...',
        checkinDone: '簽到完成！',
        checkinFailed: '簽到失敗',
        tokenSyncing: '正在同步...',
        tokenSynced: 'Token 已儲存！✅',
        tokenFailed: '未偵測到 Token ❌'
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
        loadLocalSpine: '载入本地模型 📁',
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
        toggleBlacklistBlock: '🚫 在此网站隐藏',
        toggleBlacklistAllow: '✔️ 在此网站显示',
        advancedBlacklist: '进阶设定：管理黑名单',
        saveBlacklist: '保存名单',
        blacklistSaved: '黑名单已保存！',
        blacklistHint: '请输入要隐藏的网域，每行一个（例如: forum.gamer.com.tw）',
        flipX: '左右翻转',
        animation: '选择动作',
        checkModelUpdates: '检查更新 🔄',
        version: '版本: ',
        checking: '检查中...',
        updated: '更新成功！即将刷新',
        upToDate: '已是最新版本',
        updateFailed: '检查失败',
        resetLayout: '重置位置与大小',
        webshopSection: 'WebShop 签到',
        syncWebshopToken: '同步 WebShop 登入 🔑',
        manualCheckin: '立即签到 ✅',
        autoCheckin: '自动签到',
        checkinNotSetup: '尚未设定',
        checkinConnected: '已连接',
        checkinDisconnected: '尚未连接',
        checkinLastDaily: '上次每日签到: ',
        checkinChecking: '签到中...',
        checkinDone: '签到完成！',
        checkinFailed: '签到失败',
        tokenSyncing: '正在同步...',
        tokenSynced: 'Token 已储存！✅',
        tokenFailed: '未侦测到 Token ❌'
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
        loadLocalSpine: 'Load Local Model 📁',
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
        toggleBlacklistBlock: '🚫 Hide on this site',
        toggleBlacklistAllow: '✔️ Show on this site',
        advancedBlacklist: 'Advanced: Manage Blacklist',
        saveBlacklist: 'Save List',
        blacklistSaved: 'List Saved!',
        blacklistHint: 'Enter domains to hide, one per line (e.g., google.com)',
        flipX: 'Flip Horizontal',
        animation: 'Animation',
        checkModelUpdates: 'Check Updates 🔄',
        version: 'Version: ',
        checking: 'Checking...',
        updated: 'Updated! Reloading...',
        upToDate: 'Up to date',
        updateFailed: 'Failed',
        resetLayout: 'Reset Size & Position',
        webshopSection: 'WebShop Check-in',
        syncWebshopToken: 'Sync WebShop Login 🔑',
        manualCheckin: 'Check-in Now ✅',
        autoCheckin: 'Auto Check-in',
        checkinNotSetup: 'Not configured',
        checkinConnected: 'Connected',
        checkinDisconnected: 'Not connected',
        checkinLastDaily: 'Last daily: ',
        checkinChecking: 'Checking in...',
        checkinDone: 'Check-in done!',
        checkinFailed: 'Check-in failed',
        tokenSyncing: 'Syncing...',
        tokenSynced: 'Token saved! ✅',
        tokenFailed: 'Token not found ❌'
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
        loadLocalSpine: 'ローカルモデルを読み込む 📁',
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
        toggleBlacklistBlock: '🚫 このサイトで非表示',
        toggleBlacklistAllow: '✔️ このサイトで表示',
        advancedBlacklist: '詳細設定：ブラックリスト管理',
        saveBlacklist: 'リストを保存',
        blacklistSaved: 'リストを保存しました！',
        blacklistHint: '非表示にするドメインを1行に1つ入力（例: google.com）',
        flipX: '左右反転',
        animation: 'アニメーション',
        checkModelUpdates: '更新チェック 🔄',
        version: 'バージョン: ',
        checking: 'チェック中...',
        updated: '更新成功！再読み込みします',
        upToDate: '最新です',
        updateFailed: '失敗しました',
        resetLayout: 'サイズと位置をリセット',
        webshopSection: 'WebShop チェックイン',
        syncWebshopToken: 'WebShop ログイン同期 🔑',
        manualCheckin: '今すぐチェックイン ✅',
        autoCheckin: '自動チェックイン',
        checkinNotSetup: '未設定',
        checkinConnected: '接続済み',
        checkinDisconnected: '未接続',
        checkinLastDaily: '前回: ',
        checkinChecking: 'チェックイン中...',
        checkinDone: 'チェックイン完了！',
        checkinFailed: 'チェックイン失敗',
        tokenSyncing: '同期中...',
        tokenSynced: 'Token保存済み！✅',
        tokenFailed: 'Token未検出 ❌'
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
        loadLocalSpine: '로컬 모델 불러오기 📁',
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
        toggleBlacklistBlock: '🚫 이 사이트에서 숨기기',
        toggleBlacklistAllow: '✔️ 이 사이트에서 표시',
        advancedBlacklist: '고급 설정: 블랙리스트 관리',
        saveBlacklist: '목록 저장',
        blacklistSaved: '목록 저장됨!',
        blacklistHint: '숨길 도메인을 한 줄에 하나씩 입력하세요 (예: google.com)',
        flipX: '좌우 반전',
        animation: '애니메이션',
        checkModelUpdates: '업데이트 확인 🔄',
        version: '버전: ',
        checking: '확인 중...',
        updated: '업데이트 성공! 새로고침 중...',
        upToDate: '최신 버전입니다',
        updateFailed: '확인 실패',
        resetLayout: '크기 및 위치 초기화',
        webshopSection: 'WebShop 출석 체크',
        syncWebshopToken: 'WebShop 로그인 동기화 🔑',
        manualCheckin: '지금 체크인 ✅',
        autoCheckin: '자동 체크인',
        checkinNotSetup: '미설정',
        checkinConnected: '연결됨',
        checkinDisconnected: '미연결',
        checkinLastDaily: '마지막 출석: ',
        checkinChecking: '체크인 중...',
        checkinDone: '체크인 완료!',
        checkinFailed: '체크인 실패',
        tokenSyncing: '동기화 중...',
        tokenSynced: 'Token 저장됨! ✅',
        tokenFailed: 'Token 미발견 ❌'
    }
};

interface PetSettings {
    show: boolean;
    lockMove: boolean;
    lockZoom: boolean;
    flipX: boolean;
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

interface LocalModelInfo {
    id: string;
    name: string;
    animations?: string[];  // V20.15: Cached animation names from first load
    skins?: string[];       // V20.15: Cached skin names from first load
    modelData: {
        atlasText: string;
        rawDataURIs: Record<string, string>;
        isJsonSkel: boolean;
    };
}
let customSpineModels: LocalModelInfo[] = [];

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
    if (lblFlipX) lblFlipX.textContent = strings.flipX;
    if (lblLang) lblLang.textContent = strings.language;
    if (lblOpacity) lblOpacity.textContent = strings.opacity;
    if (lblCharacter) lblCharacter.textContent = strings.character;
    if (lblCostume) {
        if (characterSelect && characterSelect.value.startsWith('local_')) {
            lblCostume.textContent = strings.animation || 'Animation';
        } else {
            lblCostume.textContent = strings.costume || 'Costume';
        }
    }
    if (lblAutoRedeem) lblAutoRedeem.textContent = strings.autoRedeem;
    if (characterSearch) characterSearch.placeholder = strings.search;

    // New Element Bindings (using span IDs for text)
    const lblSyncSection = document.getElementById('lbl-syncSection');
    if (lblSyncSection) lblSyncSection.textContent = strings.syncSection;

    const btnSyncText = document.getElementById('syncData-text');
    if (btnSyncText) {
        btnSyncText.textContent = strings.syncBtn;
    }

    const resetLayoutText = document.getElementById('resetLayout-text');
    if (resetLayoutText && strings.resetLayout) {
        resetLayoutText.textContent = strings.resetLayout;
    }

    const btnCheckCodesText = document.getElementById('checkCodes-text');
    if (btnCheckCodesText) {
        btnCheckCodesText.textContent = strings.checkCodes;
    }

    const checkUpdatesText = document.getElementById('checkUpdates-text');
    if (checkUpdatesText) {
        checkUpdatesText.textContent = strings.checkModelUpdates || 'Check Updates 🔄';
    }

    // versionDisplay is now handled by renderVersionDisplay

    const btnClearText = document.getElementById('clearCache-text');
    if (btnClearText) btnClearText.textContent = strings.clearCache;

    const btnLoadLocalText = document.getElementById('loadLocalSpine-text');
    if (btnLoadLocalText) btnLoadLocalText.textContent = strings.loadLocalSpine;

    const summaryAdvancedBlacklist = document.getElementById('advancedBlacklist-summary');
    if (summaryAdvancedBlacklist) summaryAdvancedBlacklist.textContent = strings.advancedBlacklist;

    const textSaveBlacklist = document.getElementById('saveBlacklist-text');
    if (textSaveBlacklist) textSaveBlacklist.textContent = strings.saveBlacklist;

    const textBlacklistHint = document.getElementById('blacklistHint');
    if (textBlacklistHint) textBlacklistHint.textContent = strings.blacklistHint;

    // WebShop Check-in section
    const lblWebshopSection = document.getElementById('lbl-webshopSection');
    if (lblWebshopSection) lblWebshopSection.textContent = strings.webshopSection || 'WebShop 簽到';

    const syncWebshopTokenText = document.getElementById('syncWebshopToken-text');
    if (syncWebshopTokenText) syncWebshopTokenText.textContent = strings.syncWebshopToken || '同步 WebShop 登入 🔑';

    const manualCheckinText = document.getElementById('manualCheckin-text');
    if (manualCheckinText) manualCheckinText.textContent = strings.manualCheckin || '立即簽到 ✅';

    const lblAutoCheckin = document.getElementById('lbl-autoCheckin');
    if (lblAutoCheckin) lblAutoCheckin.textContent = strings.autoCheckin || 'Auto Check-in';

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


async function init() {
    // 0. Load Local Models
    const localRes = await chrome.storage.local.get(['localModels']);
    if (localRes.localModels) {
        customSpineModels = localRes.localModels as LocalModelInfo[];
    }

    // 1. Load Settings
    chrome.storage.sync.get(['petSettings'], async (result: { petSettings?: any }) => {
        const saved = result.petSettings || {};

        // V20.9: Check for locally persisted model ID if sync model is empty
        if (!saved.model && !saved.characterId) { // If no model or characterId is synced
            const localModelIdRes = await chrome.storage.local.get(['localModelId']);
            if (localModelIdRes.localModelId) {
                saved.characterId = localModelIdRes.localModelId;
            }
        }

        const settings: PetSettings = { ...DEFAULT_SETTINGS, ...saved };

        // UI Bindings
        if (showPet) showPet.checked = settings.show;
        if (lockMove) lockMove.checked = settings.lockMove;
        if (lockZoom) lockZoom.checked = settings.lockZoom;
        if (flipX) flipX.checked = !!settings.flipX;
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

    // Local models: verify the model still exists in storage, otherwise fall back
    if (startCharId.startsWith('local_')) {
        const localModel = customSpineModels.find(m => m.id === startCharId);
        if (!localModel) {
            // Model was deleted from storage, fall back to first built-in
            startCharId = modelsData.characters[0].id;
        }
    }

    // Built-in models: validate
    if (!startCharId.startsWith('local_')) {
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

    if (!startCharId.startsWith('local_')) {
        populateCostumes(characterSelect.value, settings.model, settings.language || 'zh-TW');
    } else {
        console.log(`[DEBUG_POPUP] initializeDropdowns starts for local model: ${startCharId}`);
        // V20.15: Use cached animations if available for instant dropdown population
        const localModel = customSpineModels.find(m => m.id === startCharId);
        if (localModel?.animations && localModel.animations.length > 0) {
            console.log(`[DEBUG_POPUP] Found cache for ${startCharId}. Animations:`, localModel.animations);
            modelSelect.innerHTML = '';
            localModel.animations.forEach(animName => {
                const opt = document.createElement('option');
                opt.value = animName;
                opt.textContent = animName;
                modelSelect.appendChild(opt);
            });
            modelSelect.disabled = false;

            // Restore saved selection
            chrome.storage.local.get(['localAnimation'], (res) => {
                if (res.localAnimation && localModel.animations!.includes(res.localAnimation)) {
                    modelSelect.value = res.localAnimation;
                } else {
                    modelSelect.value = localModel.animations!.includes('idle') ? 'idle' : localModel.animations![0];
                }

                // V20.15: Do NOT send PET_LOAD_LOCAL_MODEL here — bridge.ts already loaded
                // the model on page init. Sending it again causes a double-load crash.
                // Just show the rename/delete buttons and save settings.
                const renameBtn = document.getElementById('renameLocalModel');
                const deleteBtn = document.getElementById('deleteLocalModel');
                if (renameBtn) renameBtn.style.display = 'block';
                if (deleteBtn) deleteBtn.style.display = 'block';

                // IMPORTANT: Call saveSettings AFTER modelSelect is fully populated and value is restored
                console.log(`[DEBUG_POPUP] Cache flow complete. Saving settings. Final value: ${modelSelect.value}`);
                saveSettings();
            });
        } else {
            console.log(`[DEBUG_POPUP] No cache found for ${startCharId}. Requesting animations from active tab.`);
            // No cache: show loading state
            modelSelect.innerHTML = '<option disabled selected>Loading animations...</option>';
            modelSelect.disabled = true;

            // V20.15: Request the current animations without triggering a model reload!
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0] && tabs[0].id) {
                    console.log(`[DEBUG_POPUP] Sending PET_REQUEST_ANIMATIONS to tab ${tabs[0].id}`);
                    chrome.tabs.sendMessage(tabs[0].id, { type: 'PET_REQUEST_ANIMATIONS' }, (response) => {
                        console.log(`[DEBUG_POPUP] Received response from active tab:`, response);
                        if (response && response.type === 'PET_ANIMATIONS_LIST') {
                            handleAnimationsListResponse(response.animations || [], response.skins || [], startCharId);
                        } else if (chrome.runtime.lastError) {
                            console.error(`[DEBUG_POPUP] Runtime error sending PET_REQUEST_ANIMATIONS:`, chrome.runtime.lastError.message);
                        }
                    });
                } else {
                    console.warn(`[DEBUG_POPUP] No active tab to send PET_REQUEST_ANIMATIONS to.`);
                }
            });
        }
        updateUILanguage(settings.language || 'zh-TW');
    }
}

// V20.15: Helper to process animations list and populate UI dryly
function handleAnimationsListResponse(anims: string[], skins: string[], characterId: string) {
    if (!characterSelect || characterSelect.value !== characterId) return;

    const localModel = customSpineModels.find(m => m.id === characterId);

    // V20.16: Defensive check to completely reject empty arrays if we already have cached animations.
    // This prevents a delayed failure from wiping out a perfectly good cache and breaking the UI.
    if (anims.length === 0 && localModel?.animations && localModel.animations.length > 0) {
        console.warn(`[DEBUG_POPUP] Dropping incoming empty animation list to preserve valid cache.`);
        return;
    }

    if (localModel) {
        const animsChanged = JSON.stringify(localModel.animations) !== JSON.stringify(anims);
        localModel.animations = anims;
        localModel.skins = skins;
        chrome.storage.local.set({ localModels: customSpineModels });

        if (!animsChanged && modelSelect && !modelSelect.disabled) {
            return;
        }
    }

    if (modelSelect) {
        modelSelect.innerHTML = '';
        if (anims.length === 0) {
            console.log(`[DEBUG_POPUP] handleAnimationsListResponse received empty array.`);
            const opt = document.createElement('option');
            opt.disabled = true;
            opt.textContent = 'No animations found';
            modelSelect.appendChild(opt);
            modelSelect.disabled = true; // explicitly disable
        } else {
            console.log(`[DEBUG_POPUP] Populating dropdown with ${anims.length} animations.`);
            anims.forEach((animName: string) => {
                const opt = document.createElement('option');
                opt.value = animName;
                opt.textContent = animName;
                modelSelect.appendChild(opt);
            });
            modelSelect.disabled = false;

            chrome.storage.local.get(['localAnimation'], (res) => {
                console.log(`[DEBUG_POPUP] Restoring localAnimation from storage: ${res.localAnimation}`);
                if (res.localAnimation && anims.includes(res.localAnimation)) {
                    modelSelect.value = res.localAnimation;
                } else if (anims.length > 0) {
                    modelSelect.value = anims.includes('idle') ? 'idle' : anims[0];
                }

                // Show buttons and save settings once UI is fully ready
                const renameBtn = document.getElementById('renameLocalModel');
                const deleteBtn = document.getElementById('deleteLocalModel');
                if (renameBtn) renameBtn.style.display = 'block';
                if (deleteBtn) deleteBtn.style.display = 'block';
                console.log(`[DEBUG_POPUP] handleAnimationsListResponse flow complete. Saving settings. Final value: ${modelSelect.value}`);
                saveSettings();
            });
        }
    }
}

// Start Init
init();


// --- Functions ---

async function loadModelsData() {
    let success = false;
    try {
        const local = await chrome.storage.local.get('modelsData');
        if (local.modelsData && Object.keys(local.modelsData).length > 0) {
            modelsData = local.modelsData;
            success = true;
        }
    } catch (e) {
        console.warn('Failed to load models.json from local storage, falling back...', e);
    }

    if (!success) {
        try {
            const res = await fetch(chrome.runtime.getURL('models.json'));
            modelsData = await res.json();
            await chrome.storage.local.set({ modelsData });
        } catch (e) {
            console.error('Failed to load bundled models.json', e);
        }
    }
}

async function loadCharacterNames() {
    let success = false;
    try {
        const local = await chrome.storage.local.get('characterNames');
        if (local.characterNames && Object.keys(local.characterNames).length > 0) {
            characterNames = local.characterNames as any;
            success = true;
        }
    } catch (e) {
        console.warn('Failed to load character_names.json from local storage, falling back...', e);
    }

    if (!success) {
        try {
            const res = await fetch(chrome.runtime.getURL('character_names.json'));
            characterNames = await res.json();
            await chrome.storage.local.set({ characterNames });
        } catch (e) {
            console.error('Failed to load bundled character_names.json', e);
        }
    }
}

async function loadCostumeNames() {
    let success = false;
    try {
        const local = await chrome.storage.local.get('costumeNames');
        if (local.costumeNames && Object.keys(local.costumeNames).length > 0) {
            costumeNames = local.costumeNames as any;
            success = true;
        }
    } catch (e) {
        console.warn('Failed to load costume_names.json from local storage, falling back...', e);
    }

    if (!success) {
        try {
            const res = await fetch(chrome.runtime.getURL('costume_names.json'));
            costumeNames = await res.json();
            await chrome.storage.local.set({ costumeNames });
        } catch (e) {
            console.error('Failed to load bundled costume_names.json', e);
        }
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

    // --- Local Characters ---
    if (customSpineModels.length > 0) {
        customSpineModels.forEach((model) => {
            if (filter) {
                const f = filter.toLowerCase();
                if (!model.name.toLowerCase().includes(f) && !model.id.toLowerCase().includes(f)) {
                    return;
                }
            }

            const opt = document.createElement('option');
            opt.value = model.id;
            opt.textContent = model.name;
            characterSelect.appendChild(opt);

            if (!firstVisibleId) firstVisibleId = model.id;
            if (model.id === selectedId) isSelectedVisible = true;
        });

        // Separator
        const sep = document.createElement('option');
        sep.disabled = true;
        sep.textContent = '──────────────';
        characterSelect.appendChild(sep);
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
        populateCostumes(characterSelect.value, preserveCostumeId, lang);
    }

    return characterSelect.value !== startValue;
}

// Populate Costume Dropdown
function populateCostumes(charId: string, selectedCostumeId: string | null, lang: string = 'en') {
    if (!modelSelect || !modelsData) return;

    // V20.17: Prevent async callbacks (like DLC cache checking) from wiping Local Model animation dropdowns!
    if (charId.startsWith('local_')) return;

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

// --- Events ---

const saveSettings = () => {
    const isLocal = characterSelect.value.startsWith('local_');

    const settings: PetSettings = {
        show: showPet?.checked ?? true,
        lockMove: lockMove?.checked ?? false,
        lockZoom: lockZoom?.checked ?? false,
        flipX: flipX ? flipX.checked : false,
        opacity: Number(opacity.value) / 100,
        language: language.value,
        characterId: characterSelect.value,
        model: isLocal ? '' : modelSelect.value, // Costume ID — irrelevant for local
        nickname: cachedNickname,
        nicknames: cachedNicknames,
        autoRedeem: autoRedeem ? autoRedeem.checked : false
    };

    updateUILanguage(language.value);

    chrome.storage.sync.set({ petSettings: settings }, () => {
        if (chrome.runtime.lastError) {
            console.error('[Pet Popup] Error saving settings:', chrome.runtime.lastError);
        }
    });

    // V20.9: Persist local model selection to local storage (device specific)
    if (isLocal) {
        chrome.storage.local.set({ localModelId: characterSelect.value });
        // Don't overwrite localAnimation if just showing, unless we want to reset it
    } else {
        chrome.storage.local.remove('localModelId');
        chrome.storage.local.remove('localAnimation');
    }
};

if (characterSelect) {
    characterSelect.addEventListener('change', () => {
        console.log(`[DEBUG_POPUP] characterSelect CHANGED to: ${characterSelect.value}`);
        const lang = language.value || 'zh-TW';
        if (characterSelect.value.startsWith('local_')) {
            // Local model selected from dropdown
            const localModel = customSpineModels.find(m => m.id === characterSelect.value);
            if (localModel) {
                console.log(`[DEBUG_POPUP] user manually selected local model. Sending PET_LOAD_LOCAL_MODEL.`);
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0] && tabs[0].id) {
                        chrome.tabs.sendMessage(tabs[0].id, {
                            type: 'PET_LOAD_LOCAL_MODEL',
                            modelData: localModel.modelData
                        });
                    }
                });
            }

            // V20.15: Use cached animations if available for instant dropdown
            const cachedAnims = localModel?.animations;
            if (cachedAnims && cachedAnims.length > 0) {
                console.log(`[DEBUG_POPUP] characterSelect change found cache. Anim length: ${cachedAnims.length}`);
                modelSelect.innerHTML = '';
                cachedAnims.forEach(animName => {
                    const opt = document.createElement('option');
                    opt.value = animName;
                    opt.textContent = animName;
                    modelSelect.appendChild(opt);
                });
                modelSelect.disabled = false;

                // Restore saved selection
                chrome.storage.local.get(['localAnimation'], (res) => {
                    if (res.localAnimation && cachedAnims.includes(res.localAnimation)) {
                        modelSelect.value = res.localAnimation;
                    } else {
                        modelSelect.value = cachedAnims.includes('idle') ? 'idle' : cachedAnims[0];
                    }
                });
            } else {
                // No cache yet: show loading state until PET_ANIMATIONS_LIST arrives
                modelSelect.innerHTML = '<option disabled selected>Loading animations...</option>';
                modelSelect.disabled = true;
            }
            updateUILanguage(lang);
            // Don't modify `model` in settings for local since it triggers model reload
            // We just send the layout settings if needed, but avoid reloading model

            if (renameLocalModelBtn) renameLocalModelBtn.style.display = 'block';
            if (deleteLocalModelBtn) deleteLocalModelBtn.style.display = 'block';
        } else {
            // When character changes, update costumes using Default for that char
            populateCostumes(characterSelect.value, null, language.value);
            updateUILanguage(language.value); // Reset label to Costume

            if (renameLocalModelBtn) renameLocalModelBtn.style.display = 'none';
            if (deleteLocalModelBtn) deleteLocalModelBtn.style.display = 'none';
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

        // Update the toggle button text immediately
        if (currentDomain) {
            chrome.storage.sync.get(['blacklistedDomains'], (result: any) => {
                const list: string[] = result.blacklistedDomains || [];
                updateToggleButtonState(list.includes(currentDomain));
            });
        }

        saveSettings();
    });
}

if (modelSelect) {
    modelSelect.addEventListener('change', () => {
        if (characterSelect.value.startsWith('local_')) {
            // V20.10: Save selected animation for local models
            chrome.storage.local.set({ localAnimation: modelSelect.value });

            // Send PET_CHANGE_ANIMATION directly to avoid full model reload
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0] && tabs[0].id) {
                    chrome.tabs.sendMessage(tabs[0].id, { type: 'PET_CHANGE_ANIMATION', animation: modelSelect.value });
                }
            });
        } else {
            saveSettings();
        }
    });
}
if (showPet) showPet.addEventListener('change', saveSettings);
if (lockMove) lockMove.addEventListener('change', saveSettings);
if (lockZoom) lockZoom.addEventListener('change', saveSettings);
if (flipX) flipX.addEventListener('change', saveSettings);
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

        // Clear local models
        chrome.storage.local.remove(['localModels'], () => {
            customSpineModels = [];
        });

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

const loadLocalSpineBtn = document.getElementById('loadLocalSpineBtn');
const localSpineInput = document.getElementById('localSpineInput') as HTMLInputElement;

if (loadLocalSpineBtn && localSpineInput) {
    loadLocalSpineBtn.addEventListener('click', () => {
        localSpineInput.click();
    });

    localSpineInput.addEventListener('change', async (e) => {
        const files = Array.from((e.target as HTMLInputElement).files || []);
        if (files.length === 0) return;

        const atlas = files.find(f => f.name.toLowerCase().endsWith('.atlas'));
        const json = files.find(f => f.name.toLowerCase().endsWith('.json'));
        const skel = files.find(f => f.name.toLowerCase().endsWith('.skel'));
        const textures = files.filter(f => f.name.toLowerCase().endsWith('.png'));

        if (!atlas || (!skel && !json)) {
            alert('Atlas and/or skeleton files are missing.');
            return;
        }

        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const atlasText = String(reader.result);
                const regex = /([^\s]+\.png)/g;
                const referenced = Array.from(atlasText.matchAll(regex)).map(m => m[1]);
                const missing = referenced.filter(n => !textures.some(t => t.name === n));
                if (missing.length > 0) {
                    alert(`Missing images: ${missing.join(', ')}`);
                    return;
                }

                const readAsDataURL = (file: File): Promise<string> => {
                    return new Promise((resolve, reject) => {
                        const r = new FileReader();
                        r.onload = () => resolve(String(r.result));
                        r.onerror = reject;
                        r.readAsDataURL(file);
                    });
                };

                const rawDataURIs: Record<string, string> = {};
                for (const t of textures) {
                    rawDataURIs[t.name] = await readAsDataURL(t);
                }

                let isJsonSkel = false;
                if (skel) {
                    rawDataURIs['model.skel'] = await readAsDataURL(skel);
                } else if (json) {
                    rawDataURIs['model.json'] = await readAsDataURL(json);
                    isJsonSkel = true;
                }

                const localId = `local_${Date.now()}`;
                const lang = language.value || 'zh-TW';

                const mainFile = skel || json || atlas || files[0];
                const defaultName = mainFile ? mainFile.name.split('.')[0] : 'custom';
                const customName = prompt(lang.includes('zh') ? '請輸入自訂模型名稱 (Enter a name for this model):' : 'Enter a name for this model:', defaultName);
                if (!customName) return; // cancelled

                // V20.8: Include atlas IN rawDataURIs as a data URI (bypasses R2 remapping in spine-loader)
                // This matches how the reference project handles local models
                rawDataURIs['model.atlas'] = `data:,${atlasText}`;

                const newLocalModel: LocalModelInfo = {
                    id: localId,
                    name: customName,
                    modelData: {
                        atlasText: null, // Not separate — atlas is in rawDataURIs
                        rawDataURIs,
                        isJsonSkel
                    }
                };

                customSpineModels.unshift(newLocalModel);
                chrome.storage.local.set({ localModels: customSpineModels });

                // Refresh dropdown so the new model appears at the top
                populateCharacters(localId, lang);

                characterSelect.dispatchEvent(new Event('change'));

            } catch (err) {
                alert(`Unexpected error: ${(err as Error).message}`);
            }
        };
        reader.readAsText(atlas);
    });
}

if (renameLocalModelBtn) {
    renameLocalModelBtn.addEventListener('click', () => {
        const localId = characterSelect.value;
        const localModel = customSpineModels.find(m => m.id === localId);
        if (!localModel) return;
        const lang = language.value || 'zh-TW';
        const newName = prompt(lang.includes('zh') ? '請輸入新名稱 (Enter new name):' : 'Enter new name:', localModel.name);
        if (newName && newName.trim() !== '') {
            localModel.name = newName.trim();
            chrome.storage.local.set({ localModels: customSpineModels }, () => {
                populateCharacters(localId, lang, modelSelect.value);
            });
        }
    });
}

if (deleteLocalModelBtn) {
    deleteLocalModelBtn.addEventListener('click', () => {
        const localId = characterSelect.value;
        const localModelIndex = customSpineModels.findIndex(m => m.id === localId);
        if (localModelIndex === -1) return;
        const lang = language.value || 'zh-TW';
        const confirmMsg = lang.includes('zh') ? `確定要刪除 ${customSpineModels[localModelIndex].name} 嗎？` : `Are you sure you want to delete ${customSpineModels[localModelIndex].name}?`;
        if (confirm(confirmMsg)) {
            customSpineModels.splice(localModelIndex, 1);
            chrome.storage.local.set({ localModels: customSpineModels }, () => {
                chrome.storage.local.remove(['localModelId', 'localAnimation']);
                // Select default character
                const firstBuiltIn = modelsData ? Object.keys(modelsData)[0] : '003892';
                populateCharacters(firstBuiltIn, lang);
                characterSelect.dispatchEvent(new Event('change'));
            });
        }
    });
}

if (resetLayoutBtn) {
    resetLayoutBtn.addEventListener('click', () => {
        chrome.storage.local.remove('petLayout', () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0] && tabs[0].id) {
                    chrome.tabs.sendMessage(tabs[0].id, { type: 'PET_RESET_LAYOUT' });
                }
            });
            window.close(); // Close popup after resetting to let user see it
        });
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

// Check Updates Logic
// --- Setup Model Updates ---
const checkUpdatesBtn = document.getElementById('checkUpdatesBtn');
const versionDisplay = document.getElementById('versionDisplay');

// Global state for update status
let updateState = 'idle'; // idle, checking, updated, uptodate, failed
let updateVersion = '0.0.0';
let updateError = '';

function renderVersionDisplay() {
    if (!versionDisplay) return;
    const lang = language.value || 'zh-TW';
    const strings = UI_STRINGS[lang] || UI_STRINGS['en'];

    const baseText = `${strings.version || 'Version: '} ${updateVersion} `;

    if (updateState === 'idle') {
        versionDisplay.textContent = baseText;
        versionDisplay.style.color = '#888';
    } else if (updateState === 'checking') {
        versionDisplay.textContent = `${strings.version || 'Version: '} ${strings.checking || 'Checking...'} `;
        versionDisplay.style.color = '#888';
    } else if (updateState === 'updated') {
        versionDisplay.textContent = `${baseText} ✨ (${strings.updated || 'Updated!'})`;
        versionDisplay.style.color = '#4CAF50';
    } else if (updateState === 'uptodate') {
        versionDisplay.textContent = `${baseText} (${strings.upToDate || 'Up to date'})`;
        versionDisplay.style.color = '#888';
    } else if (updateState === 'failed') {
        versionDisplay.textContent = `${strings.version || 'Version: '} ${strings.updateFailed || 'Failed'} (${updateError})`;
        versionDisplay.style.color = '#e72857';
    }
}

if (checkUpdatesBtn && versionDisplay) {
    // 1. Initial Load: Read and display local version
    chrome.storage.local.get('configVersion', (data) => {
        updateVersion = String(data.configVersion || '0.0.0');
        renderVersionDisplay();
    });

    // Handle Language change dynamically for versionDisplay
    language.addEventListener('change', () => {
        renderVersionDisplay();
    });

    // 2. Click Handler
    checkUpdatesBtn.addEventListener('click', () => {
        checkUpdatesBtn.setAttribute('disabled', 'true');
        updateState = 'checking';
        renderVersionDisplay();

        chrome.runtime.sendMessage({ type: 'PET_CHECK_MODEL_UPDATES' }, (response) => {
            if (chrome.runtime.lastError || !response) {
                updateState = 'failed';
                updateError = chrome.runtime.lastError?.message || 'Unknown';
                renderVersionDisplay();
                checkUpdatesBtn.removeAttribute('disabled');
                return;
            }

            if (response.success) {
                updateVersion = response.version;
                if (response.updated) {
                    updateState = 'updated';
                    renderVersionDisplay();
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    updateState = 'uptodate';
                    renderVersionDisplay();
                    checkUpdatesBtn.removeAttribute('disabled');
                }
            } else {
                updateState = 'failed';
                updateError = String(response.error || 'Unknown Error');
                renderVersionDisplay();
                checkUpdatesBtn.removeAttribute('disabled');
            }
        });
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

// Global Message Listener for Sync Updates and Animations
chrome.runtime.onMessage.addListener((message) => {
    // V20.6: Receive Animations list for local model
    if (message.type === 'PET_ANIMATIONS_LIST') {
        if (characterSelect && characterSelect.value.startsWith('local_')) {
            handleAnimationsListResponse(message.animations || [], message.skins || [], characterSelect.value);
        }
    }

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
                    elNickname.textContent = `${strings.synced}${nicknames[0]} `;
                    elNickname.style.color = '#4CAF50';
                }
            } else if (nickname) {
                elNickname.dataset.accountCount = '1';
                elNickname.dataset.nickname = nickname;
                elNickname.textContent = `${strings.synced}${nickname} `;
                elNickname.style.color = '#4CAF50';
            }

            // Reset Sync button
            if (btnSyncText) btnSyncText.textContent = strings.syncBtn;
        }
    }
});



// Initialize Popup
document.addEventListener('DOMContentLoaded', init);

// --- Blacklist Event Listeners & Logic ---
const toggleBlacklistBtn = document.getElementById('toggleBlacklist');
const toggleBlacklistText = document.getElementById('toggleBlacklist-text');
const blacklistTextarea = document.getElementById('blacklistTextarea') as HTMLTextAreaElement;
const saveBlacklistBtn = document.getElementById('saveBlacklist');
const saveBlacklistText = document.getElementById('saveBlacklist-text');

let currentDomain = '';

chrome.storage.sync.get(['blacklistedDomains'], async (result: any) => {
    const list: string[] = result.blacklistedDomains || [];
    if (blacklistTextarea) {
        blacklistTextarea.value = list.join('\n');
    }

    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length > 0 && tabs[0].url) {
            const url = new URL(tabs[0].url);
            currentDomain = url.hostname;

            if (url.protocol.startsWith('chrome') || url.protocol === 'about:' || url.protocol.startsWith('file')) {
                if (toggleBlacklistBtn) (toggleBlacklistBtn as HTMLButtonElement).disabled = true;
            } else {
                updateToggleButtonState(list.includes(currentDomain));
            }
        }
    } catch (e) {
        console.warn('[Popup] Could not get active tab URL for blacklist toggle.', e);
    }
});

function updateToggleButtonState(isBlacklisted: boolean) {
    if (!toggleBlacklistBtn || !toggleBlacklistText) return;
    const currentLang = language?.value || 'zh-TW';
    const strings = UI_STRINGS[currentLang] || UI_STRINGS['en'];

    if (isBlacklisted) {
        toggleBlacklistText.textContent = strings.toggleBlacklistAllow || '✔️ 允許顯示在此網站';
        toggleBlacklistBtn.style.background = 'rgba(76, 175, 80, 0.2)'; // Green
    } else {
        toggleBlacklistText.textContent = strings.toggleBlacklistBlock || '🚫 在此網站隱藏';
        toggleBlacklistBtn.style.background = 'rgba(231, 40, 87, 0.2)'; // Red
    }
}

if (toggleBlacklistBtn) {
    toggleBlacklistBtn.addEventListener('click', () => {
        if (!currentDomain) return;
        chrome.storage.sync.get(['blacklistedDomains'], (result: any) => {
            let list: string[] = result.blacklistedDomains || [];
            if (list.includes(currentDomain)) {
                list = list.filter((d) => d !== currentDomain);
            } else {
                list.push(currentDomain);
            }
            chrome.storage.sync.set({ blacklistedDomains: list }, () => {
                updateToggleButtonState(list.includes(currentDomain));
                if (blacklistTextarea) blacklistTextarea.value = list.join('\n');

                // Let the bridge know to toggle pet display dynamically
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0] && tabs[0].id) {
                        try {
                            chrome.tabs.sendMessage(tabs[0].id, { type: 'PET_BLACKLIST_UPDATE', blacklisted: list.includes(currentDomain) });
                        } catch (e) { }
                    }
                });
            });
        });
    });
}

if (saveBlacklistBtn && blacklistTextarea) {
    saveBlacklistBtn.addEventListener('click', () => {
        const rawText = blacklistTextarea.value;
        const list = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        chrome.storage.sync.set({ blacklistedDomains: list }, () => {
            const currentLang = language?.value || 'zh-TW';
            const strings = UI_STRINGS[currentLang] || UI_STRINGS['en'];

            if (saveBlacklistText) {
                const oldText = saveBlacklistText.textContent;
                saveBlacklistText.textContent = strings.blacklistSaved || '儲存成功！';
                setTimeout(() => { if (saveBlacklistText) saveBlacklistText.textContent = oldText; }, 2000);
            }

            // Update the current domain toggle logic
            if (currentDomain) {
                updateToggleButtonState(list.includes(currentDomain));
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0] && tabs[0].id) {
                        try {
                            chrome.tabs.sendMessage(tabs[0].id, { type: 'PET_BLACKLIST_UPDATE', blacklisted: list.includes(currentDomain) });
                        } catch (e) { }
                    }
                });
            }
        });
    });
}

// ============================================================
// WebShop Check-in Popup Logic
// ============================================================

const webshopAccountList = document.getElementById('webshopAccountList');

function updateCheckinStatus() {
    chrome.runtime.sendMessage({ type: 'WEBSHOP_GET_STATUS' }, (response) => {
        if (chrome.runtime.lastError || !response) return;

        if (autoCheckin) autoCheckin.checked = !!response.autoCheckin;

        // Render account list
        if (webshopAccountList) {
            const accounts = response.accounts || [];
            if (accounts.length === 0) {
                webshopAccountList.innerHTML = '<div style="text-align:center; color:#888; padding:4px 0;">尚未同步帳號</div>';
            } else {
                webshopAccountList.innerHTML = accounts.map((a: any) => {
                    let statusText = '';
                    let statusColor = '#4caf50';
                    if (a.tokenExpired) {
                        statusText = '⚠️ Token 已過期';
                        statusColor = '#f44336';
                    } else if (a.lastDaily) {
                        const d = new Date(a.lastDaily);
                        statusText = `✅ ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                    } else {
                        statusText = '🔗 已連結';
                    }
                    return `<div style="display:flex; align-items:center; justify-content:space-between; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.1);">
                        <div style="flex:1; min-width:0;">
                            <div style="font-weight:bold; color:#e0e0e0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${a.nickname}</div>
                            <div style="color:${statusColor}; font-size:11px;">${statusText}</div>
                        </div>
                        <button class="webshop-remove-btn" data-nickname="${a.nickname}" style="background:none; border:1px solid #f44336; color:#f44336; border-radius:4px; padding:2px 6px; font-size:11px; cursor:pointer; margin-left:8px; flex-shrink:0;">✕</button>
                    </div>`;
                }).join('');

                // Attach delete handlers
                webshopAccountList.querySelectorAll('.webshop-remove-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const nickname = (e.target as HTMLElement).getAttribute('data-nickname');
                        if (nickname && confirm(`移除帳號「${nickname}」？`)) {
                            chrome.runtime.sendMessage({ type: 'WEBSHOP_REMOVE_ACCOUNT', nickname }, () => {
                                updateCheckinStatus();
                            });
                        }
                    });
                });
            }
        }
    });
}

// Sync WebShop Token button
if (syncWebshopTokenBtn) {
    syncWebshopTokenBtn.addEventListener('click', () => {
        const currentLang = language?.value || 'zh-TW';
        const strings = UI_STRINGS[currentLang] || UI_STRINGS['en'];
        const statusEl = checkinStatus;

        if (statusEl) {
            statusEl.textContent = strings.tokenSyncing || '正在同步...';
            statusEl.style.color = '#ff9800';
        }

        // Remember current account count to detect new additions
        chrome.runtime.sendMessage({ type: 'WEBSHOP_GET_STATUS' }, (currentStatus) => {
            const prevCount = currentStatus?.accounts?.length || 0;

            // Open the WebShop mypage so content script can capture token + nickname
            chrome.tabs.create({ url: 'https://webshop.browndust2.global/CT/mypage/', active: true }, () => {
                // Poll for new account in storage
                let attempts = 0;
                const maxAttempts = 60; // 60 seconds
                const pollInterval = setInterval(() => {
                    attempts++;
                    chrome.runtime.sendMessage({ type: 'WEBSHOP_GET_STATUS' }, (newStatus) => {
                        const newCount = newStatus?.accounts?.length || 0;
                        if (newCount > prevCount) {
                            // New account added
                            clearInterval(pollInterval);
                            if (statusEl) {
                                statusEl.textContent = strings.tokenSynced || 'Token 已儲存！✅';
                                statusEl.style.color = '#4caf50';
                            }
                            updateCheckinStatus();
                            setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);
                        } else if (newCount === prevCount && newCount > 0) {
                            // Might have updated existing account
                            // Check if any account has updated token (harder to detect)
                            // For now, continue polling
                        }
                        if (attempts >= maxAttempts) {
                            clearInterval(pollInterval);
                            if (statusEl) {
                                statusEl.textContent = strings.tokenFailed || '未偵測到 Token ❌';
                                statusEl.style.color = '#f44336';
                            }
                            updateCheckinStatus();
                            setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);
                        }
                    });
                }, 1000);
            });
        });
    });
}

// Manual Check-in button
if (manualCheckinBtn) {
    manualCheckinBtn.addEventListener('click', () => {
        const currentLang = language?.value || 'zh-TW';
        const strings = UI_STRINGS[currentLang] || UI_STRINGS['en'];
        const statusEl = checkinStatus;

        if (statusEl) {
            statusEl.textContent = strings.checkinChecking || '簽到中...';
            statusEl.style.color = '#ff9800';
        }

        manualCheckinBtn.disabled = true;

        chrome.runtime.sendMessage({ type: 'WEBSHOP_MANUAL_CHECKIN' }, (response) => {
            manualCheckinBtn.disabled = false;

            if (chrome.runtime.lastError || !response) {
                if (statusEl) {
                    statusEl.textContent = strings.checkinFailed || '簽到失敗';
                    statusEl.style.color = '#f44336';
                }
                return;
            }

            if (statusEl) {
                statusEl.textContent = response.messages?.join(' | ') || (response.success ? (strings.checkinDone || '簽到完成！') : (strings.checkinFailed || '簽到失敗'));
                statusEl.style.color = response.success ? '#4caf50' : '#f44336';
            }

            setTimeout(() => {
                updateCheckinStatus();
                if (statusEl) statusEl.textContent = '';
            }, 3000);
        });
    });
}

// Auto Check-in toggle
if (autoCheckin) {
    autoCheckin.addEventListener('change', () => {
        chrome.runtime.sendMessage({
            type: 'WEBSHOP_SET_AUTO_CHECKIN',
            enabled: autoCheckin.checked
        });
    });
}

// Load WebShop check-in status on popup open
updateCheckinStatus();
