// bridge.ts
// Injects the Spine loader and styles into the main world
// V18.43: Fix rawDataURIs key format - must include atlas base URL

// console.log('[Pet Bridge] Bridge script loaded.');

// --- Top Level Helpers ---

const injectCSS = (filePath: string) => {
    // console.log(`[Pet Bridge] Injecting CSS: ${filePath}`);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL(filePath);
    (document.head || document.documentElement).appendChild(link);
};

const injectScript = (filePath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        // console.log(`[Pet Bridge] Injecting Script: ${filePath}...`);
        const s = document.createElement('script');
        s.src = chrome.runtime.getURL(filePath);
        s.type = 'module';
        s.onload = () => {
            // console.log(`[Pet Bridge] Successfully loaded ${filePath}`);
            resolve();
        };
        s.onerror = (e) => {
            console.error(`[Pet Bridge] Failed to load ${filePath}`, e);
            reject(e);
        };
        (document.head || document.documentElement).appendChild(s);
    });
};

// --- IndexedDB Helpers (Global) ---
const DB_NAME = 'PetDLC';
const STORE_NAME = 'assets';

const openDB = () => new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
});

const getAsset = async (key: string): Promise<Blob | null> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
    });
};

const saveAsset = async (key: string, blob: Blob) => {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const req = tx.objectStore(STORE_NAME).put(blob, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
};

const getAllKeys = async (): Promise<string[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).getAllKeys();
        req.onsuccess = () => resolve((req.result as string[]) || []);
        req.onerror = () => reject(req.error);
    });
};

// --- Models Data Helper ---
let modelsData: any = null;
const loadModelsData = async () => {
    if (modelsData) return;
    try {
        const res = await fetch(chrome.runtime.getURL('models.json'));
        modelsData = await res.json();
    } catch (e) {
        console.error('[Pet Bridge] Failed to load models.json', e);
    }
};

// --- Notification Bubble ---
// Multi-language strings for bubble
const BUBBLE_STRINGS: Record<string, Record<string, string>> = {
    'zh-TW': {
        newCodes: '發現新兌換碼！',
        redeemAll: '一鍵兌換',
        redeeming: '兌換中...',
        success: '成功',
        alreadyClaimed: '已兌換',
        failed: '失敗',
        noNickname: '請先同步帳號',
        moreItems: '還有 {n} 個...',
        redeem: '兌換',
        batchRedeem: '一鍵兌換',
        nickname: '暱稱'
    },
    'zh-CN': {
        newCodes: '发现新兑换码！',
        redeemAll: '一键兑换',
        redeeming: '兑换中...',
        success: '成功',
        alreadyClaimed: '已兑换',
        failed: '失败',
        noNickname: '请先同步账号',
        moreItems: '还有 {n} 个...',
        redeem: '兑换',
        batchRedeem: '一键兑换',
        nickname: '昵称'
    },
    'en': {
        newCodes: 'New Codes Found!',
        redeemAll: 'Redeem All',
        redeeming: 'Redeeming...',
        success: 'Success',
        alreadyClaimed: 'Already Claimed',
        failed: 'Failed',
        noNickname: 'Please sync first',
        moreItems: '+{n} more...',
        redeem: 'Redeem',
        batchRedeem: 'Redeem All',
        nickname: 'Nickname'
    },
    'ja-JP': {
        newCodes: '新しいコード発見！',
        redeemAll: '一括交換',
        redeeming: '交換中...',
        success: '成功',
        alreadyClaimed: '交換済み',
        failed: '失敗',
        noNickname: '先に同期してください',
        moreItems: '他 {n} 件...',
        redeem: '交換',
        batchRedeem: '一括交換',
        nickname: 'ニックネーム'
    },
    'ko-KR': {
        newCodes: '새 코드 발견!',
        redeemAll: '모두 교환',
        redeeming: '교환 중...',
        success: '성공',
        alreadyClaimed: '이미 교환됨',
        failed: '실패',
        noNickname: '먼저 동기화하세요',
        moreItems: '+{n} 더...',
        redeem: '교환',
        batchRedeem: '모두 교환',
        nickname: '닉네임'
    }
};

interface CodeInfo {
    code: string;
    reward?: string | Record<string, string>;
}

interface BubbleData {
    codes?: CodeInfo[];
    lang?: string;
    text?: string; // Simple status text (for download progress, etc.)
}

// Helper: Bidirectional Sync (Extensions Storage <-> Website LocalStorage)
// Returns the merged list of claimed codes for use in UI
const syncAndGetClaimedCodes = async (nickname: string): Promise<string[]> => {
    const key = `claimedCodes_${nickname}`;
    let localClaimed: string[] = [];
    let extClaimed: string[] = [];
    const isOfficialSite = window.location.hostname.includes('thebd2pulse.com');

    // 1. Read from Website LocalStorage (Only if on official site)
    if (isOfficialSite) {
        try {
            const localStr = localStorage.getItem(key);
            localClaimed = localStr ? JSON.parse(localStr) : [];
        } catch { /* ignore */ }
    }

    // 2. Read from Extension Storage
    try {
        const result = await chrome.storage.local.get(key);
        extClaimed = (result[key] as string[]) || [];
    } catch { /* ignore */ }

    // 3. Merge (Union)
    const merged = Array.from(new Set([...localClaimed, ...extClaimed]));
    const hasNewForLocal = merged.length > localClaimed.length;
    const hasNewForExt = merged.length > extClaimed.length;

    // 4. Write back if needed
    if (isOfficialSite && hasNewForLocal) {
        try {
            localStorage.setItem(key, JSON.stringify(merged));
            console.log(`[Pet Bridge] Updated LocalStorage for ${nickname}`);
        } catch { /* ignore */ }
    }

    if (hasNewForExt) {
        try {
            await chrome.storage.local.set({ [key]: merged });
            // console.log(`[Pet Bridge] Updated Extension Storage for ${nickname}`);
        } catch { /* ignore */ }
    }

    return merged;
};



const showSpeechBubble = (data: BubbleData) => {
    console.log('[Pet Bridge] Showing Bubble:', data);
    const root = document.getElementById('pet-root');
    if (!root) return;

    const oldBubble = document.getElementById('pet-bubble');
    if (oldBubble) oldBubble.remove();

    const lang = data.lang || 'zh-TW';
    const strings = BUBBLE_STRINGS[lang] || BUBBLE_STRINGS['en'];

    const bubble = document.createElement('div');
    bubble.id = 'pet-bubble';
    bubble.className = 'pet-speech-bubble';

    // Apply Styles immediately (Safe)
    Object.assign(bubble.style, {
        position: 'absolute', bottom: '100%', left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(20, 20, 20, 0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '12px', color: '#e7e7e7', padding: '14px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        width: '240px', pointerEvents: 'auto', zIndex: '2147483647',
        fontFamily: '"Roboto", "Noto Sans TC", sans-serif', marginBottom: '12px', fontSize: '13px'
    });

    // Simple text mode
    if (data.text && !data.codes) {
        Object.assign(bubble.style, {
            background: 'rgba(20, 20, 20, 0.9)',
            backdropFilter: 'blur(8px)',
            maxWidth: '180px', width: 'auto', padding: '8px 12px', marginBottom: '8px', fontSize: '12px'
        });
        const msg = document.createElement('div');
        msg.style.textAlign = 'center';
        msg.style.color = '#e7e7e7';
        msg.textContent = data.text;
        bubble.appendChild(msg);
        root.appendChild(bubble);
        return;
    }

    // Codes mode
    const codes = data.codes || [];
    if (codes.length === 0) return;

    // Helper: Localized Reward
    const langMap: Record<string, string> = {
        'zh-TW': 'zh-Hant-TW', 'zh-CN': 'zh-Hans-CN',
        'en': 'en', 'ja-JP': 'ja-JP', 'ko-KR': 'ko-KR'
    };
    const apiLang = langMap[lang] || 'zh-Hant-TW';
    const getReward = (reward: any): string => {
        if (!reward) return '';
        if (typeof reward === 'string') return reward;
        return reward[apiLang] || reward['zh-Hant-TW'] || reward['en'] || Object.values(reward)[0] || '';
    };

    // 1. Close Button
    const closeBtn = document.createElement('div');
    closeBtn.className = 'bubble-close';
    closeBtn.id = 'bubble-close'; // For event listener
    closeBtn.textContent = '✕';
    bubble.appendChild(closeBtn);

    // 2. Header
    const header = document.createElement('div');
    header.className = 'bubble-header';
    header.textContent = strings.newCodes;
    bubble.appendChild(header);

    // 3. Nickname Row
    const nicknameRow = document.createElement('div');
    nicknameRow.className = 'bubble-nickname-row';

    const nickLabel = document.createElement('label');
    nickLabel.className = 'bubble-label';
    nickLabel.textContent = (strings.nickname || '暱稱') + ':';
    nicknameRow.appendChild(nickLabel);

    const nickSelect = document.createElement('select');
    nickSelect.id = 'bubble-nickname-select';
    nickSelect.className = 'bubble-select';
    const loadingOpt = document.createElement('option');
    loadingOpt.textContent = 'Loading...';
    nickSelect.appendChild(loadingOpt);
    nicknameRow.appendChild(nickSelect);

    bubble.appendChild(nicknameRow);

    // 4. Codes Container
    const codesContainer = document.createElement('div');
    codesContainer.className = 'bubble-codes';

    codes.forEach((c, idx) => {
        const item = document.createElement('div');
        item.className = 'bubble-code-item';
        item.setAttribute('data-code', c.code);
        item.setAttribute('data-index', String(idx));

        const info = document.createElement('div');
        info.className = 'bubble-code-info';

        const codeSpan = document.createElement('span');
        codeSpan.className = 'bubble-code';
        codeSpan.textContent = c.code;
        info.appendChild(codeSpan);

        const rewardText = getReward(c.reward);
        if (rewardText) {
            const rewardSpan = document.createElement('span');
            rewardSpan.className = 'bubble-reward';
            rewardSpan.textContent = rewardText;
            info.appendChild(rewardSpan);
        }
        item.appendChild(info);

        const btn = document.createElement('button');
        btn.className = 'bubble-redeem-single';
        btn.setAttribute('data-code', c.code);
        btn.textContent = strings.redeem || '兌換';
        item.appendChild(btn);

        codesContainer.appendChild(item);
    });
    bubble.appendChild(codesContainer);

    // 5. Redeem All Button
    const redeemAllBtn = document.createElement('button');
    redeemAllBtn.className = 'bubble-redeem-all';
    redeemAllBtn.id = 'bubble-redeem-all';
    Object.assign(redeemAllBtn.style, {
        width: '100%', padding: '10px', marginTop: '10px',
        background: 'linear-gradient(135deg, #e72857, #d41e4a)',
        border: 'none', borderRadius: '6px', color: 'white',
        fontWeight: '700', fontSize: '13px', cursor: 'pointer',
        transition: 'all 0.2s'
    });
    redeemAllBtn.textContent = strings.batchRedeem || '一鍵兌換';
    bubble.appendChild(redeemAllBtn);

    // Inject Styles (Safety Check)
    const styleId = 'pet-bubble-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        // TextOnly styles are safe, CSS string is not executable
        style.textContent = `
            .bubble-close { position: absolute; top: 8px; right: 10px; color: rgba(255,255,255,0.5); cursor: pointer; font-size: 14px; transition: color 0.2s; }
            .bubble-close:hover { color: #e72857; }
            .bubble-header { font-weight: 600; font-size: 14px; color: #e72857; margin-bottom: 10px; padding-right: 20px; }
            .bubble-codes { margin-bottom: 8px; max-height: 250px; overflow-y: auto; }
            .bubble-code-item { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px 10px; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
            .bubble-code-info { flex: 1; min-width: 0; }
            .bubble-code { font-weight: 600; color: #e72857; font-family: monospace; font-size: 12px; display: block; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .bubble-reward { font-size: 10px; color: rgba(255,255,255,0.6); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .bubble-redeem-single { flex-shrink: 0; padding: 6px 12px; background: linear-gradient(135deg, #e72857 0%, #c41e4a 100%); border: none; border-radius: 6px; color: white; font-weight: 600; font-size: 11px; cursor: pointer; transition: all 0.2s; }
            .bubble-redeem-single:hover { transform: scale(1.02); box-shadow: 0 2px 8px rgba(231,40,87,0.4); }
            .bubble-redeem-single:active { transform: scale(0.98); }
            .bubble-redeem-single:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
            .bubble-redeem-single.success { background: #4CAF50; }
            .bubble-redeem-single.warning { background: #FF9800; }
            .bubble-redeem-single.error { background: #F44336; }
            .bubble-code-item.claimed { opacity: 0.7; }
            .bubble-code-item.claimed .bubble-code { text-decoration: line-through; color: rgba(255,255,255,0.5); }
            .bubble-claimed-mark { font-size: 14px; flex-shrink: 0; }
            .bubble-nickname-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; padding: 6px 8px; background: rgba(255,255,255,0.03); border-radius: 6px; position: relative; z-index: 100; }
            .bubble-label { font-size: 11px; color: rgba(255,255,255,0.7); white-space: nowrap; }
            .bubble-select { flex: 1; padding: 6px 8px; font-size: 12px; background: #1a1a1a; color: #e7e7e7; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; cursor: pointer; min-width: 100px; max-width: 150px; }
            .bubble-select option { background: #1a1a1a; color: #e7e7e7; }
            .bubble-select:focus { outline: none; border-color: #e72857; }
        `;
        document.head.appendChild(style);
    }

    root.appendChild(bubble);

    // Update UI Helper (Same as before)
    const updateUIForNickname = async (nickname: string) => {
        if (!nickname) return;
        const claimedCodes = await syncAndGetClaimedCodes(nickname);
        const items = bubble.querySelectorAll('.bubble-code-item');
        items.forEach(item => {
            const code = item.getAttribute('data-code');
            if (!code) return;
            const btn = item.querySelector('.bubble-redeem-single');
            const mark = item.querySelector('.bubble-claimed-mark');
            if (claimedCodes.includes(code)) {
                item.classList.add('claimed');
                if (btn) btn.remove();
                if (!mark) {
                    const newMark = document.createElement('span');
                    newMark.className = 'bubble-claimed-mark';
                    newMark.title = strings.alreadyClaimed || '已兌換';
                    newMark.textContent = '✅';
                    item.appendChild(newMark);
                }
            } else {
                item.classList.remove('claimed');
                if (mark) mark.remove();
                if (!btn) {
                    const newBtn = document.createElement('button');
                    newBtn.className = 'bubble-redeem-single';
                    newBtn.setAttribute('data-code', code);
                    newBtn.textContent = strings.redeem || '兌換';
                    attachRedeemListener(newBtn);
                    item.appendChild(newBtn);
                }
            }
        });
    };

    // Load nicknames into dropdown
    const nicknameSelect = document.getElementById('bubble-nickname-select') as HTMLSelectElement;
    if (nicknameSelect) {
        chrome.storage.sync.get('petSettings', async (result) => {
            const settings = result.petSettings as { nicknames?: string[]; nickname?: string } || {};
            const nicknames: string[] = settings.nicknames || (settings.nickname ? [settings.nickname] : []);

            nicknameSelect.innerHTML = '';
            if (nicknames.length === 0) {
                const opt = document.createElement('option');
                opt.value = "";
                opt.textContent = "No accounts synced";
                nicknameSelect.appendChild(opt);
            } else {
                // Persistence: Check Last Selected Nickname
                const lastResult = await chrome.storage.local.get(['petLastNickname']);
                const lastNickname = lastResult.petLastNickname;

                let selectedNickname = nicknames[0]; // Default to first

                nicknames.forEach((nn, _idx) => {
                    const opt = document.createElement('option');
                    opt.value = nn;
                    opt.textContent = nn;
                    if (nn === lastNickname) selectedNickname = nn;
                    nicknameSelect.appendChild(opt);
                });

                // Set selection
                nicknameSelect.value = selectedNickname;

                // Initial update
                updateUIForNickname(selectedNickname);
            }
        });
    }

    // Event: Close
    document.getElementById('bubble-close')?.addEventListener('click', () => bubble.remove());

    // Event: Nickname Change
    nicknameSelect?.addEventListener('change', () => {
        const val = nicknameSelect?.value;
        updateUIForNickname(val);
        // Persistence: Save selection
        if (val) chrome.storage.local.set({ petLastNickname: val });
    });

    // V18.57: Prevent drag logic from stealing focus/clicks on the dropdown
    nicknameSelect?.addEventListener('mousedown', (e) => e.stopPropagation());
    nicknameSelect?.addEventListener('click', (e) => e.stopPropagation());

    // Helper to attach redeem listener to a button
    const attachRedeemListener = (btn: Element) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const button = btn as HTMLButtonElement;
            const code = button.getAttribute('data-code');
            const nickname = nicknameSelect?.value;

            if (!code) return;
            if (!nickname) {
                const originalText = button.textContent;
                button.textContent = strings.noNickname || '請選帳號';
                button.classList.add('error');
                setTimeout(() => {
                    button.textContent = originalText;
                    button.classList.remove('error');
                }, 2000);
                return;
            }

            button.textContent = '...';
            button.disabled = true;

            chrome.runtime.sendMessage({
                type: 'REDEEM_SINGLE',
                code: code,
                nickname: nickname
            }, async (response) => {
                const currentClaimed = await syncAndGetClaimedCodes(nickname);

                if (response?.success) {
                    button.textContent = '✅';
                    button.classList.add('success');

                    // Manually add to storage first to ensure immediate sync
                    const newClaimed = [...currentClaimed, code];
                    const key = `claimedCodes_${nickname}`;
                    await chrome.storage.local.set({ [key]: newClaimed });
                    // Only write localStorage if official domain (handled inside syncAndGetClaimedCodes check, but here we do manual opt)
                    if (window.location.hostname.includes('thebd2pulse.com')) {
                        try { localStorage.setItem(key, JSON.stringify(newClaimed)); } catch { }
                    }

                    // Update UI to claimed state after delay
                    setTimeout(() => {
                        updateUIForNickname(nickname);
                    }, 1000);
                } else if (response?.alreadyClaimed) {
                    button.textContent = '⚠️';
                    button.classList.add('warning');

                    // Manually add
                    const newClaimed = [...currentClaimed, code];
                    const key = `claimedCodes_${nickname}`;
                    await chrome.storage.local.set({ [key]: newClaimed });
                    if (window.location.hostname.includes('thebd2pulse.com')) {
                        try { localStorage.setItem(key, JSON.stringify(newClaimed)); } catch { }
                    }

                    setTimeout(() => {
                        updateUIForNickname(nickname);
                    }, 1000);
                } else {
                    button.textContent = '❌';
                    button.classList.add('error');
                    button.title = response?.message || 'Failed';
                    setTimeout(() => button.textContent = strings.redeem || '兌換', 2000);
                    button.disabled = false;
                }
            });
        });
    };

    // Attach listener to initial buttons
    const redeemButtons = bubble.querySelectorAll('.bubble-redeem-single');
    redeemButtons.forEach(btn => attachRedeemListener(btn));

    // Event: Global Batch Redeem
    // reuse existing redeemAllBtn variable from creation
    redeemAllBtn.addEventListener('click', () => {
        // Need to fetch ALL nicknames again to be safe
        chrome.storage.sync.get('petSettings', async (result) => {
            const settings = result.petSettings as { nicknames?: string[]; nickname?: string } || {};
            const nicknames: string[] = settings.nicknames || (settings.nickname ? [settings.nickname] : []);

            if (nicknames.length === 0) {
                redeemAllBtn.textContent = 'No synced accounts';
                return;
            }

            const items = Array.from(bubble.querySelectorAll('.bubble-code-item'));
            const codesToRedeem = items.map(item => item.getAttribute('data-code')).filter(c => c) as string[];

            if (codesToRedeem.length === 0) {
                redeemAllBtn.textContent = 'No codes';
                return;
            }

            redeemAllBtn.disabled = true;
            redeemAllBtn.textContent = strings.redeeming || '兌換中...';

            let totalSuccess = 0;
            let totalFail = 0;

            // Iterate All Nicknames
            for (const nn of nicknames) {
                // Update UI text to show progress
                redeemAllBtn.textContent = `Redeeming for ${nn}...`;

                // Get claimed codes for this nickname first
                const alreadyClaimed = await syncAndGetClaimedCodes(nn);

                // Iterate Codes
                for (const code of codesToRedeem) {
                    // Skip if already claimed
                    if (alreadyClaimed.includes(code)) continue;

                    await new Promise<void>(resolve => {
                        chrome.runtime.sendMessage({
                            type: 'REDEEM_SINGLE',
                            code: code,
                            nickname: nn
                        }, async (response) => {
                            if (response?.success) {
                                totalSuccess++;
                                // Update Storage
                                const current = await syncAndGetClaimedCodes(nn); // Fetch fresh
                                const newClaimed = [...current, code];
                                const key = `claimedCodes_${nn}`;
                                await chrome.storage.local.set({ [key]: newClaimed });
                                if (window.location.hostname.includes('thebd2pulse.com')) {
                                    try { localStorage.setItem(key, JSON.stringify(newClaimed)); } catch { }
                                }
                            } else if (response?.alreadyClaimed) {
                                // Mark as claimed anyway
                                const current = await syncAndGetClaimedCodes(nn);
                                const newClaimed = [...current, code];
                                const key = `claimedCodes_${nn}`;
                                await chrome.storage.local.set({ [key]: newClaimed });
                            } else {
                                totalFail++;
                            }
                            // Small delay to prevent rate limit spam
                            setTimeout(resolve, 500);
                        });
                    });
                }
            }

            // Restore UI (refresh current nickname view)
            const currentSelected = nicknameSelect?.value;
            if (currentSelected) updateUIForNickname(currentSelected);

            redeemAllBtn.textContent = `${strings.success} (${totalSuccess})`;
            setTimeout(() => {
                redeemAllBtn.disabled = false;
                redeemAllBtn.textContent = strings.batchRedeem || '一鍵兌換';

                // Reload page if on official site and successful redemptions occurred
                if (totalSuccess > 0 && window.location.hostname.includes('thebd2pulse.com')) {
                    window.location.reload();
                }
            }, 3000);
        });
    });
};


// --- Asset Resolution Logic (The Core) ---
const fetchBlob = async (url: string, isImage: boolean = false): Promise<Blob> => {
    console.log(`[Pet DLC] Fetching: ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${url}`);
    const blob = await res.blob();

    if (blob.type.includes('text/html')) {
        console.error(`[Pet DLC] CRITICAL: Retrieved HTML (likely 404 page) instead of binary! URL: ${url}`);
        const text = await blob.text();
        console.error(`[Pet DLC] Content Preview: ${text.substring(0, 100)}`);
        throw new Error('Fetched content was HTML/404 Page, not Asset');
    }

    if (isImage) {
        return new Blob([blob], { type: 'image/png' });
    }
    return blob;
};

const resolveModelAssets = async (costumeId: string) => {
    await loadModelsData();

    let costume: any = null;
    if (modelsData && modelsData.characters) {
        for (const char of modelsData.characters) {
            const found = char.costumes.find((c: any) => c.id === costumeId);
            if (found) {
                costume = found;
                break;
            }
        }
    }

    if (!costume) {
        console.warn(`[Pet Bridge] Costume ${costumeId} not found. Assuming Built-in.`);
        costume = { id: costumeId, isBuiltIn: true };
    }

    if (costume.isBuiltIn) {
        const dir = `live2d_models/${costume.id}/`;
        return {
            skel: chrome.runtime.getURL(`${dir}char${costume.id}.skel`),
            atlas: chrome.runtime.getURL(`${dir}char${costume.id}.atlas`),
            png: chrome.runtime.getURL(`${dir}char${costume.id}.png`),
            rawDataURIs: null // No need for built-in
        };
    } else {
        console.log(`[Pet DLC] Resolving Cloud Asset: ${costume.id}`);
        try {
            const baseUrl = costume.src;
            const fileBase = costume.spineAlias ? costume.spineAlias : `char${costume.id}`;
            const folder = costume.id;
            const baseRemoteUrl = `${baseUrl}${folder}/`;

            // A. Atlas - Keep RAW, no rewriting
            const atlasName = `${fileBase}.atlas`;
            const atlasKey = `${costume.id}_atlas_raw`;

            let atlasBlob = await getAsset(atlasKey);
            if (!atlasBlob) {
                showSpeechBubble({ text: `Downloading ${atlasName}...` });
                atlasBlob = await fetchBlob(`${baseRemoteUrl}${atlasName}`, false);
                await saveAsset(atlasKey, atlasBlob);
            }

            const atlasText = await atlasBlob.text();
            console.log(`[Pet DLC] Atlas Loaded (RAW). Header: ${atlasText.substring(0, 50)}...`);

            // B. Parse Atlas - Find Texture Page Names (using regex like reference project)
            const regex = /([^\s]+\.png)/g;
            const matches = Array.from(atlasText.matchAll(regex));
            const textureNames = [...new Set(matches.map(m => m[1]))]; // Unique names

            console.log(`[Pet DLC] Found ${textureNames.length} texture(s) in atlas:`, textureNames);

            if (textureNames.length === 0) {
                textureNames.push(`${fileBase}.png`);
            }

            // C. Create Atlas Blob URL FIRST - we need the base for rawDataURIs keys
            const atlasUrl = URL.createObjectURL(atlasBlob);

            // V18.43: Get base path from atlas URL (like reference project)
            const atlasBase = atlasUrl.slice(0, atlasUrl.lastIndexOf('/') + 1);
            console.log(`[Pet DLC] Atlas URL: ${atlasUrl}`);
            console.log(`[Pet DLC] Atlas Base: ${atlasBase}`);

            // D. Download Images & Build rawDataURIs map with FULL paths
            const rawDataURIs: Record<string, string> = {};

            for (const textureName of textureNames) {
                const pngKey = `${costume.id}_${textureName}`;
                let pngBlob = await getAsset(pngKey);
                if (!pngBlob) {
                    showSpeechBubble({ text: `Downloading ${textureName}...` });
                    try {
                        pngBlob = await fetchBlob(`${baseRemoteUrl}${textureName}`, true);
                    } catch (e) {
                        console.warn('[Pet DLC] Download failed:', e);
                        throw e;
                    }
                    await saveAsset(pngKey, pngBlob);
                }

                // V18.43: Key must be FULL path (atlasBase + textureName)
                // Value can be Blob URL (simpler than Data URI)
                const pngBlobUrl = URL.createObjectURL(pngBlob);
                const fullKey = atlasBase + textureName;
                rawDataURIs[fullKey] = pngBlobUrl;
                console.log(`[Pet DLC] Texture mapped: "${fullKey}" -> "${pngBlobUrl.substring(0, 50)}..."`);
            }

            // E. Skel
            const skelName = `${fileBase}.skel`;
            const skelKey = `${costume.id}_skel`;
            let skelBlob = await getAsset(skelKey);
            if (!skelBlob) {
                showSpeechBubble({ text: `Downloading ${skelName}...` });
                skelBlob = await fetchBlob(`${baseRemoteUrl}${skelName}`, false);
                await saveAsset(skelKey, skelBlob);
            }
            const skelUrl = URL.createObjectURL(skelBlob);

            showSpeechBubble({ text: 'Download Complete!' });
            setTimeout(() => document.getElementById('pet-bubble')?.remove(), 2000);

            console.log('[Pet DLC] Final rawDataURIs keys:', Object.keys(rawDataURIs));

            return {
                skel: skelUrl,
                atlas: atlasUrl,
                png: '',
                rawDataURIs: rawDataURIs
            };

        } catch (e) {
            console.error('[Pet DLC] Failed to load DLC', e);
            showSpeechBubble({ text: 'Download Failed (See Console)' });
            const dir = `live2d_models/000701/`;
            return {
                skel: chrome.runtime.getURL(`${dir}char000701.skel`),
                atlas: chrome.runtime.getURL(`${dir}char000701.atlas`),
                png: chrome.runtime.getURL(`${dir}char000701.png`),
                rawDataURIs: null
            };
        }
    }
};

// --- Settings Sync ---
const applySettings = async (settings: any) => {
    const root = document.getElementById('pet-root');
    if (!root || !settings) return;

    // V18.55: Decouple visibility so bubble stays visible even if character is hidden
    const widget = document.getElementById('spine-widget');

    // Always keep root visual (for bubble)
    root.style.display = 'block';

    // Default to SHOW if undefined (initial state)
    if (settings.show !== false) {
        // Show Mode: Apply user opacity setting
        root.style.opacity = String(settings.opacity);
        if (widget) widget.style.display = 'block';
        // Normal behavior: Root blocks clicks if not locked, passes if locked
        root.style.pointerEvents = settings.lockMove ? 'none' : 'auto';
    } else {
        // Hide Mode: Root must be FULLY visible (opacity 1) for bubble to be seen clearly
        root.style.opacity = '1';
        // Hide only the character widget
        if (widget) widget.style.display = 'none';
        // Root passes clicks (invisible box), but bubbles (children) have pointer-events: auto
        root.style.pointerEvents = 'none';
    }

    if (settings.model && settings.model !== root.dataset.currentModel) {
        // console.log(`[Pet Bridge] Model Change Detected: ${root.dataset.currentModel} -> ${settings.model}`);

        resolveModelAssets(settings.model).then(newUrls => {
            if (!newUrls) return;
            root.dataset.skelUrl = newUrls.skel;
            root.dataset.atlasUrl = newUrls.atlas;
            root.dataset.currentModel = settings.model;

            // V18.42: Pass rawDataURIs to spine-loader via postMessage
            if (newUrls.rawDataURIs) {
                root.dataset.rawDataURIs = JSON.stringify(newUrls.rawDataURIs);
            } else {
                delete root.dataset.rawDataURIs;
            }

            window.postMessage({
                type: 'PET_MODEL_UPDATE',
                urls: {
                    skelUrl: newUrls.skel,
                    atlasUrl: newUrls.atlas,
                    rawDataURIs: newUrls.rawDataURIs
                }
            }, '*');
        });
    }

    window.postMessage({ type: 'PET_SETTINGS_UPDATE', settings: settings }, '*');
};


// --- Initialization ---

const init = async () => {
    try {
        console.log('[Pet Bridge] Starting injection sequence [V18.43 Fix rawDataURIs keys]...');

        let root = document.getElementById('pet-root');
        if (!root) {
            root = document.createElement('div');
            root.id = 'pet-root';
            root.style.opacity = '1';
            root.style.position = 'fixed';
            root.style.right = '20px';
            root.style.bottom = '20px';
            root.style.zIndex = '999999';
            root.style.width = '300px';
            root.style.height = '300px';
            root.style.height = '300px';
            document.body.appendChild(root);
        }

        // V18.60: Explicitly create the spine-widget container for the player
        let widget = document.getElementById('spine-widget');
        if (!widget) {
            widget = document.createElement('div');
            widget.id = 'spine-widget';
            widget.style.width = '100%';
            widget.style.height = '100%';
            // Ensure it starts visible
            widget.style.display = 'block';
            root.appendChild(widget);
        }

        const layoutResult = await chrome.storage.local.get(['petLayout']);
        const layout = layoutResult.petLayout as any || {};
        if (layoutResult.petLayout) {
            root.dataset.layout = JSON.stringify(layout);
            if (layout.left) {
                root.style.right = 'auto';
                root.style.bottom = 'auto';
                root.style.left = layout.left;
                root.style.top = layout.top;
            }
        }

        const settingsResult = await chrome.storage.sync.get(['petSettings']);
        const savedSettings: any = settingsResult.petSettings || {};
        const currentModelId = savedSettings.model || '003892';

        const initialAssets = await resolveModelAssets(currentModelId);
        if (initialAssets) {
            root.dataset.skelUrl = initialAssets.skel;
            root.dataset.atlasUrl = initialAssets.atlas;
            root.dataset.currentModel = currentModelId;
            if (initialAssets.rawDataURIs) {
                root.dataset.rawDataURIs = JSON.stringify(initialAssets.rawDataURIs);
            }
        }

        // V18.61: Kickstart Sequence
        setTimeout(() => {
            applySettings(savedSettings);
            window.postMessage({ type: 'PET_PLAY_ANIMATION', strategy: 'motion_only' }, '*');
        }, 1500);

        injectCSS('assets/spine-loader.css');

        const customStyle = document.createElement('style');
        customStyle.textContent = `
            .spine-player-loading::after {
                content: '';
                position: absolute;
                top: 50%; left: 50%;
                width: 50px; 
                height: 50px;
                margin: -25px 0 0 -25px;
                border: 4px solid rgba(255, 51, 102, 0.1); 
                border-top: 4px solid #ff3366; 
                border-radius: 50%;
                z-index: 9999;
                pointer-events: none;
                animation: spine-custom-spin 0.8s linear infinite;
                box-shadow: 0 0 15px rgba(255, 51, 102, 0.4);
            }
            @keyframes spine-custom-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(customStyle);

        await injectScript(`assets/spine-loader.js?t=${Date.now()}`);

        chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
            if (message.type === 'NEW_GIFT' && message.data) {
                // New format: data contains { codes: [...], lang: 'xx' }
                showSpeechBubble({
                    codes: message.data.codes || [{ code: message.data.code || message.data.id }],
                    lang: message.data.lang || 'zh-TW'
                });

                // V18.53: Trigger Talk Animation
                window.postMessage({ type: 'PET_PLAY_ANIMATION', strategy: 'talk' }, '*');
            }

            if (message.type === 'PET_CLEAR_CACHE') {
                console.log('[Pet Bridge] Clearing Cache Request Received');
                const req = indexedDB.deleteDatabase(DB_NAME);
                req.onsuccess = () => {
                    console.log('[Pet Bridge] Database deleted successfully');
                    sendResponse({ success: true });
                    location.reload();
                };
                req.onerror = () => {
                    console.error('[Pet Bridge] Failed to delete database');
                    sendResponse({ success: false });
                };
                return true;
            }

            if (message.type === 'PET_GET_DLC_STATUS') {
                getAllKeys().then(keys => {
                    // Filter keys to find unique IDs (look for _skel)
                    const costumeIds = keys
                        .filter(k => k.endsWith('_skel'))
                        .map(k => k.replace('_skel', ''));
                    sendResponse({ cachedIds: costumeIds });
                }).catch(e => {
                    console.error('[Pet Bridge] Failed to get DLC status', e);
                    sendResponse({ cachedIds: [] });
                });
                return true; // Async response
            }
        });

        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'sync' && changes.petSettings) {
                applySettings(changes.petSettings.newValue);
            }
        });

        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'PET_LAYOUT_UPDATE') {
                chrome.storage.local.set({ petLayout: event.data.layout });
            }
        });

        setTimeout(() => applySettings(savedSettings), 500);

    } catch (error) {
        console.error('[Pet Bridge] Injection failed:', error);
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
