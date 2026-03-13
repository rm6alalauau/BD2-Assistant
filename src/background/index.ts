// Interfaces
interface PetSettings {
    show?: boolean;
    lockMove?: boolean;
    lockZoom?: boolean;
    flipX?: boolean;
    opacity?: number;
    language?: string;
    characterId?: string;
    model?: string;
    nickname?: string;
    nicknames?: string[]; // Multiple accounts support
    autoRedeem?: boolean;
    [key: string]: any;
}

// Configuration
const API_URL = 'https://api.thebd2pulse.com/redeem';
const REDEEM_API_URL = 'https://loj2urwaua.execute-api.ap-northeast-1.amazonaws.com/prod/coupon'; // Direct AWS API - extensions have no CORS restrictions
const API_KEY = 'pulse-key-abc123-xyz789-very-secret';
const ALARM_NAME = 'checkUpdate';
const POLL_INTERVAL_MINUTES = 60; // Standard check interval

// WebShop Check-in Configuration
const WEBSHOP_API_BASE = 'https://bd2-webshop-api.bd2.pmang.cloud';
const WEBSHOP_CHECKIN_ALARM = 'webshopCheckin';
const WEBSHOP_CHECKIN_INTERVAL = 60; // Check every 60 minutes
const WEBSHOP_DAILY_RESET_HOUR = 8; // 8:00 AM local time

// === DeclarativeNetRequest: Spoof Origin/Referer for AWS API ===
const HEADER_RULE_ID = 1;

chrome.runtime.onInstalled.addListener(() => {
    console.log('[Background] Setting up declarativeNetRequest rules for AWS API header spoofing');

    chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [HEADER_RULE_ID],
        addRules: [{
            id: HEADER_RULE_ID,
            priority: 1,
            action: {
                type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
                requestHeaders: [
                    {
                        header: 'Origin',
                        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                        value: 'https://redeem.bd2.pmang.cloud'
                    },
                    {
                        header: 'Referer',
                        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                        value: 'https://redeem.bd2.pmang.cloud/'
                    }
                ]
            },
            condition: {
                urlFilter: 'https://loj2urwaua.execute-api.ap-northeast-1.amazonaws.com/*',
                resourceTypes: [chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST]
            }
        }]
    }).then(() => {
        // console.log('[Background] Header spoofing rules applied successfully');
    }).catch((err) => {
        console.error('[Background] Failed to apply header spoofing rules:', err);
    });
});

// Initialize Alarm
chrome.alarms.create(ALARM_NAME, { periodInMinutes: POLL_INTERVAL_MINUTES });
chrome.alarms.create(WEBSHOP_CHECKIN_ALARM, { periodInMinutes: WEBSHOP_CHECKIN_INTERVAL });
chrome.runtime.onStartup.addListener(() => {
    checkForUpdates();
    initWebshopAutoCheckin();
});

// Listen for Alarms
chrome.alarms.onAlarm.addListener(async (alarm: chrome.alarms.Alarm) => {
    if (alarm.name === ALARM_NAME) {
        console.log(`[Background] Alarm triggered: ${ALARM_NAME}`);
        await checkForUpdates();
    } else if (alarm.name === WEBSHOP_CHECKIN_ALARM) {
        console.log(`[Background] Alarm triggered: ${WEBSHOP_CHECKIN_ALARM}`);
        await checkAndPerformWebshopCheckin();
    }
});

// Check for updates function
// Check for updates function
async function checkForUpdates() {
    try {
        console.log('[Background] Fetching coupons from', API_URL);
        const response = await fetch(API_URL, {
            headers: { 'X-API-Key': API_KEY }
        });

        if (!response.ok) {
            console.warn(`[Background] API check failed: ${response.status} ${response.statusText}`);
            return;
        }

        const codesData: CodeInfo[] = await response.json();

        if (!codesData || codesData.length === 0) {
            console.log('[Background] No codes returned from API.');
            return;
        }

        // Helper: check if date string matches YYYY/MM/DD format
        const isDateFormat = (str: string) => /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(str);

        // Filter out expired codes (expired more than 1 day ago)
        const now = new Date();
        const currentDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const validCodes = codesData.filter(c => {
            if (!c.expiry_date || !isDateFormat(c.expiry_date)) {
                return true; // No expiry or invalid format, keep it
            }
            const [year, month, day] = c.expiry_date.split('/').map(Number);
            const expiryDateOnly = new Date(year, month - 1, day);
            const diffDays = (currentDateOnly.getTime() - expiryDateOnly.getTime()) / (1000 * 3600 * 24);
            return diffDays <= 1; // Keep if expired less than 1 day
        });

        console.log(`[Background] ${codesData.length} valid (non-expired) codes from API`);

        // Get Settings and Claimed History
        const settingsResult = await chrome.storage.sync.get('petSettings');
        const settings = (settingsResult.petSettings || {}) as PetSettings;
        const nicknames = (settings.nicknames && settings.nicknames.length > 0)
            ? settings.nicknames
            : (settings.nickname ? [settings.nickname] : []);

        // If no nicknames, we can't really smart-filter, so we default to showing all valid codes 
        // OR we just use local 'seenCodes' as fallback? 
        // User requested: "checking synced nickname usage". If no nickname, maybe standard behavior?
        // Let's assume most users have synced. If not, we fall back to "seenCodes" to avoid spam.

        let usersUnclaimedCodes: CodeInfo[] = [];

        if (nicknames.length > 0) {
            // Get claimed history from local storage
            // keys: claimedCodes_Nickname
            const keys = nicknames.map(n => `claimedCodes_${n}`);
            const storage = await chrome.storage.local.get(keys);

            // Find codes that are NOT in claimed history for ALL accounts
            // (If at least one account hasn't claimed it, it's "unclaimed" for the user context)
            // Wait, actually, if *any* account needs it, we should notify.

            usersUnclaimedCodes = validCodes.filter(c => {
                // Return true if ANY nickname is missing this code
                const needsRedeem = nicknames.some(nick => {
                    const claimed = (storage[`claimedCodes_${nick}`] as string[]) || [];
                    return !claimed.includes(c.code);
                });
                return needsRedeem;
            });
            console.log(`[Background] Found ${usersUnclaimedCodes.length} codes not fully redeemed by current users.`);
        } else {
            // Fallback: Use seenCodes if no user is logged in
            const storage = await chrome.storage.local.get('seenCodes');
            const seenCodes = (storage.seenCodes || []) as string[];
            usersUnclaimedCodes = validCodes.filter(c => !seenCodes.includes(c.code));
        }

        if (usersUnclaimedCodes.length > 0) {
            console.log('[Background] Unclaimed/New codes found:', usersUnclaimedCodes);

            const lang = settings.language || 'zh-TW';
            const autoRedeem = !!settings.autoRedeem;

            // Notify active tabs with full code info IMMEDIATELY
            // User said: "auto redeem equals pop up bubble PLUS auto execute".
            notifyActiveTabs(usersUnclaimedCodes, lang);

            // AUTO REDEEM LOGIC
            // Now runs AFTER notification loop
            if (autoRedeem && nicknames.length > 0) {
                console.log('[Background] Auto-Redeeming new codes...');
                broadcastAutoRedeemStatus('START', {});

                let redeemCount = 0;

                for (const codeObj of usersUnclaimedCodes) {
                    const code = codeObj.code;
                    for (const nickname of nicknames) {
                        // Check if this specific nickname needs it
                        const key = `claimedCodes_${nickname}`;
                        const s = await chrome.storage.local.get(key);
                        const currentHistory = (s[key] as string[]) || [];

                        if (!currentHistory.includes(code)) {
                            const result = await redeemCode(nickname, code);

                            // Broadcast Progress
                            broadcastAutoRedeemStatus('PROGRESS', {
                                nickname, code, success: result.success, alreadyClaimed: result.alreadyClaimed
                            });

                            if (result.success || result.alreadyClaimed) {
                                redeemCount++;
                                // Update claimedCodes in local storage
                                const updated = [...currentHistory, code];
                                await chrome.storage.local.set({ [key]: updated });
                            }
                        }
                    }
                }

                broadcastAutoRedeemStatus('COMPLETE', { count: redeemCount });
            }

            // Update seenCodes for fallback mechanism
            const storage = await chrome.storage.local.get('seenCodes');
            const seenCodes = (storage.seenCodes || []) as string[];
            const allCodes = [...seenCodes, ...usersUnclaimedCodes.map(c => c.code)];
            // Deduplicate
            const uniqueSeen = Array.from(new Set(allCodes));
            await chrome.storage.local.set({ seenCodes: uniqueSeen });

        } else {
            console.log('[Background] All valid codes have been claimed or seen.');
        }

    } catch (error) {
        console.error('[Background] Failed to check for updates (Network Error):', error);
    }
}

// Helper: Redeem a single code
async function redeemCode(nickname: string, code: string): Promise<{ success: boolean; alreadyClaimed: boolean }> {
    try {
        const response = await fetch(REDEEM_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                appId: 'bd2-live',
                userId: nickname,
                code: code,
            }),
        });

        const text = await response.text();
        const textLower = text.toLowerCase();

        const hasError = textLower.includes('error') || textLower.includes('fail') || textLower.includes('invalid') || textLower.includes('not found') || textLower.includes('expired');
        const alreadyClaimed = textLower.includes('already') || textLower.includes('used') || textLower.includes('redeemed');
        const isSuccess = response.ok && !hasError;

        return { success: isSuccess, alreadyClaimed };
    } catch (e) {
        console.error(`[Background] Redeem Error ${nickname} ${code}`, e);
        return { success: false, alreadyClaimed: false };
    }
}

interface CodeInfo {
    code: string;
    reward?: string | Record<string, string>;
    expiry_date?: string; // Format: YYYY/MM/DD
}

async function notifyActiveTabs(codes: CodeInfo[], lang: string, isManualCheck: boolean = false) {
    const tabs = await chrome.tabs.query({ active: true });
    for (const tab of tabs) {
        if (tab.id) {
            const message = {
                type: 'NEW_GIFT',
                data: {
                    codes: codes,
                    lang: lang,
                    isManualCheck: isManualCheck
                }
            };
            chrome.tabs.sendMessage(tab.id, message).catch((err) => {
                console.debug(`[Background] Could not send message to tab ${tab.id}:`, err);
            });
        }
    }
}

async function broadcastAutoRedeemStatus(type: 'START' | 'PROGRESS' | 'COMPLETE', data: any) {
    const tabs = await chrome.tabs.query({ active: true });
    for (const tab of tabs) {
        if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
                type: 'PET_AUTO_REDEEM_STATUS',
                statusType: type,
                data: data
            }).catch(() => { });
        }
    }
}

// Handler for Messages (Redeem & Sync)
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

    // --- TEST NOTIFICATION (Use Real API Data) ---
    if (message.type === 'TEST_NOTIFICATION') {
        // Fetch real codes from API (same logic as checkForUpdates but force notify)
        (async () => {
            try {
                const response = await fetch(API_URL, {
                    headers: { 'x-api-key': API_KEY }
                });
                if (!response.ok) {
                    sendResponse({ success: false, error: 'API Error' });
                    return;
                }
                const codesData: CodeInfo[] = await response.json();

                if (codesData && codesData.length > 0) {
                    // Filter expired codes (same logic as checkForUpdates)
                    const isDateFormat = (str: string) => /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(str);
                    const now = new Date();
                    const currentDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

                    const validCodes = codesData.filter(c => {
                        if (!c.expiry_date || !isDateFormat(c.expiry_date)) {
                            return true; // No expiry or invalid format, keep it
                        }
                        const [year, month, day] = c.expiry_date.split('/').map(Number);
                        const expiryDateOnly = new Date(year, month - 1, day);
                        const diffDays = (currentDateOnly.getTime() - expiryDateOnly.getTime()) / (1000 * 3600 * 24);
                        return diffDays <= 1; // Keep if expired less than 1 day
                    });

                    console.log(`[Background] TEST_NOTIFICATION: ${codesData.length} total, ${validCodes.length} valid (non-expired)`);

                    // User requested Manual Check to show ALL valid codes, ignoring claimed status
                    if (validCodes.length > 0) {
                        const settingsResult = await chrome.storage.sync.get('petSettings');
                        const settings = (settingsResult.petSettings || {}) as PetSettings;
                        const lang = settings.language || 'zh-TW';

                        notifyActiveTabs(validCodes, lang, true); // isManualCheck = true
                        sendResponse({ success: true, count: validCodes.length });
                    } else {
                        sendResponse({ success: false, error: 'No valid codes' });
                    }
                } else {
                    sendResponse({ success: false, error: 'No codes' });
                }
            } catch (e) {
                console.error('[Background] TEST_NOTIFICATION error:', e);
                sendResponse({ success: false, error: 'Network Error' });
            }
        })();
        return true; // Async
    }

    // --- REDEEM ALL CODES (MULTI-CODE, MULTI-ACCOUNT) ---
    if (message.type === 'REDEEM_ALL_CODES') {
        const { codes } = message as { codes: string[] };

        chrome.storage.sync.get('petSettings', async (result) => {
            const settings = (result.petSettings || {}) as PetSettings;
            const nicknames = (settings.nicknames && settings.nicknames.length > 0)
                ? settings.nicknames
                : (settings.nickname ? [settings.nickname] : []);

            if (nicknames.length === 0) {
                sendResponse({ success: false, error: 'No Nicknames' });
                return;
            }

            console.log(`[Background] REDEEM_ALL: ${codes.length} codes for ${nicknames.length} accounts`);

            interface RedeemResult {
                nickname: string;
                code: string;
                success: boolean;
                alreadyClaimed: boolean;
            }

            const results: RedeemResult[] = [];

            // For each nickname, try each code
            for (const nickname of nicknames) {
                for (const code of codes) {
                    const result = await redeemCode(nickname, code);

                    results.push({
                        nickname,
                        code,
                        success: result.success,
                        alreadyClaimed: result.alreadyClaimed
                    });

                    // Update claimedCodes on success/alreadyClaimed
                    if (result.success || result.alreadyClaimed) {
                        const key = `claimedCodes_${nickname}`;
                        const s = await chrome.storage.local.get(key);
                        const current = (s[key] as string[]) || [];
                        if (!current.includes(code)) {
                            await chrome.storage.local.set({ [key]: [...current, code] });
                        }
                    }

                    // Log for debugging
                    console.log(`[Background] ${nickname} × ${code}: success=${result.success}, claimed=${result.alreadyClaimed}`);
                }
            }

            sendResponse({ success: true, results });
        });

        return true; // Async
    }

    // --- REDEEM SINGLE CODE FOR SPECIFIC NICKNAME ---
    if (message.type === 'REDEEM_SINGLE') {
        const { code, nickname } = message as { code: string; nickname: string };

        if (!nickname || !code) {
            sendResponse({ success: false, message: 'Missing nickname or code' });
            return true;
        }

        console.log(`[Background] REDEEM_SINGLE: ${code} for ${nickname}`);

        (async () => {
            try {
                // Direct AWS API - declarativeNetRequest rules will spoof Origin/Referer
                const response = await fetch(REDEEM_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        appId: 'bd2-live',
                        userId: nickname,
                        code: code,
                    }),
                });

                const text = await response.text();
                console.log(`[Background] ${nickname} × ${code}: ${response.status} - ${text}`);

                // Parse response as JSON to properly detect success
                let isSuccess = false;
                let alreadyClaimed = false;

                try {
                    const json = JSON.parse(text);
                    // API returns { success: true/false, error: "..." }
                    isSuccess = json.success === true && (!json.error || json.error === '');

                    // Check for already claimed patterns
                    const errorLower = (json.error || '').toLowerCase();
                    alreadyClaimed = errorLower.includes('already') ||
                        errorLower.includes('used') ||
                        errorLower.includes('redeemed') ||
                        errorLower.includes('claimed');
                } catch {
                    // Fallback to string matching if not valid JSON
                    const textLower = text.toLowerCase();
                    // Check if it looks like an error (contains error message, not just "error":"")
                    const hasRealError = textLower.includes('middy') ||
                        textLower.includes('fail') ||
                        textLower.includes('invalid') ||
                        textLower.includes('not found') ||
                        textLower.includes('expired');
                    alreadyClaimed = textLower.includes('already') ||
                        textLower.includes('used') ||
                        textLower.includes('redeemed');
                    isSuccess = response.ok && !hasRealError;
                }

                // Sync claimed code to storage after successful redemption
                if (isSuccess || alreadyClaimed) {
                    chrome.storage.local.get('claimedCodes', (result) => {
                        const claimed = (result.claimedCodes || {}) as Record<string, string[]>;
                        const key = `claimedCodes_${nickname}`;
                        const list = claimed[key] || [];
                        if (!list.includes(code)) {
                            list.push(code);
                            claimed[key] = list;
                            chrome.storage.local.set({ claimedCodes: claimed });
                            console.log(`[Background] Synced claimed code ${code} for ${nickname}`);
                        }
                    });

                    // Update Pending Sync for Website (Auto-Sync on Load)
                    const pendingItem = { nickname, code, timestamp: Date.now() };
                    chrome.storage.local.get('pendingWebSync', (res) => {
                        const current = (res.pendingWebSync as any[]) || [];
                        // Avoid duplicates
                        const exists = current.find(i => i.code === code && i.nickname === nickname);
                        if (!exists) {
                            const updated = [...current, pendingItem];
                            chrome.storage.local.set({ pendingWebSync: updated });
                        }
                    });

                    // Live Update: If website is open, force sync immediately
                    forceSyncToActiveTabs(nickname, code);
                }

                sendResponse({
                    success: isSuccess,
                    alreadyClaimed: alreadyClaimed,
                    message: text,
                    nickname: nickname,
                    code: code
                });
            } catch (e) {
                console.error(`[Background] Error REDEEM_SINGLE ${code} × ${nickname}`, e);
                sendResponse({ success: false, message: 'Network Error', nickname, code });
            }
        })();

        return true; // Async
    }

    // --- CHECK PENDING SYNC (From Content Script) ---
    if (message.type === 'PET_CHECK_PENDING_SYNC') {
        chrome.storage.local.get('pendingWebSync', (res) => {
            const pending = (res.pendingWebSync as any[]) || [];
            if (pending.length > 0) {
                sendResponse({ success: true, data: pending });
                // Clear after sending
                chrome.storage.local.set({ pendingWebSync: [] });
            } else {
                sendResponse({ success: false });
            }
        });
        return true; // Async
    }

    // --- NEW: GET FULL STORAGE DATA (For Sync on Load) ---
    if (message.type === 'PET_GET_STORAGE_DATA') {
        const keys = message.keys as string[]; // e.g., ['petSettings'] or ['claimedCodes_...']
        if (!keys || keys.length === 0) {
            sendResponse({ success: false, error: 'No keys provided' });
            return true;
        }

        // We might need strict separation of sync vs local storage
        // 'petSettings' is in SYNC. 'claimedCodes_*' is in LOCAL.
        // Let's handle both.

        const promises = [];
        const resultData: any = {};

        // 1. Check Sync Storage
        promises.push(new Promise<void>((resolve) => {
            chrome.storage.sync.get(keys, (res) => {
                Object.assign(resultData, res);
                resolve();
            });
        }));

        // 2. Check Local Storage
        promises.push(new Promise<void>((resolve) => {
            chrome.storage.local.get(keys, (res) => {
                Object.assign(resultData, res);
                resolve();
            });
        }));

        Promise.all(promises).then(() => {
            sendResponse({ success: true, data: resultData });
        });

        return true; // Async
    }

    // --- REDEEM COUPON (MULTI-ACCOUNT - Legacy) ---
    if (message.type === 'REDEEM_COUPON') {
        const { code } = message;

        // Get Nicknames
        chrome.storage.sync.get('petSettings', async (result) => {
            const settings = (result.petSettings || {}) as PetSettings;
            // Use nicknames array if available, otherwise fallback to single nickname
            const targets = (settings.nicknames && settings.nicknames.length > 0)
                ? settings.nicknames
                : (settings.nickname ? [settings.nickname] : []);

            if (targets.length === 0) {
                sendResponse({ success: false, error: 'No Nicknames Set' });
                return;
            }

            console.log(`[Background] Redeeming ${code} for ${targets.length} accounts:`, targets);
            // Removed unused 'report' and 'anySuccess'
            const promises = targets.map(async (nickname) => {
                try {
                    const body = JSON.stringify({
                        appId: 'bd2-live',
                        userId: nickname,
                        code: code,
                    });

                    const response = await fetch(REDEEM_API_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Origin': 'https://redeem.bd2.pmang.cloud',
                            'Referer': 'https://redeem.bd2.pmang.cloud/'
                        },
                        body: body,
                    });

                    const text = await response.text();
                    console.log(`[Background] ${nickname}: ${response.status} - ${text}`);

                    // Simple status parsing
                    let statusMsg = response.ok ? 'Success' : 'Failed';
                    if (text.includes('already')) statusMsg = 'Used';
                    if (text.includes('not found')) statusMsg = 'Invalid User';

                    return `${nickname}: ${statusMsg}`;
                } catch (e) {
                    console.error(`[Background] Error for ${nickname}`, e);
                    return `${nickname}: Error`;
                }
            });

            const results = await Promise.all(promises);
            const summary = results.join('\n');

            sendResponse({
                success: true, // We always return true to Bridge, let it display the message text
                message: `Redeemed for ${targets.length} Accounts:\n${summary}`
            });
        });

        return true; // Async
    }

    // Helper: Force Sync to Active Tabs (The BD2 Pulse)
    async function forceSyncToActiveTabs(nickname: string, code: string) {
        const tabs = await chrome.tabs.query({ url: "*://thebd2pulse.com/*" });
        for (const tab of tabs) {
            if (tab.id) {
                console.log(`[Background] Sending PET_FORCE_SYNC_TO_WEB to tab ${tab.id}`);
                chrome.tabs.sendMessage(tab.id, {
                    type: 'PET_FORCE_SYNC_TO_WEB',
                    data: [{ nickname, code }]
                }).catch(() => { /* Ignore cleanup errors */ });
            }
        }
    }

    // --- SYNC DATA ---
    if (message.type === 'PET_SYNC_DATA') {
        const data = message.data;
        console.log('[Background] Received Sync Data:', data);

        // 1. Save Nickname(s) to Sync Settings
        if (data.nickname || data.nicknames) {
            chrome.storage.sync.get('petSettings', (result) => {
                const current = (result.petSettings || {}) as PetSettings;
                if (data.nickname) current.nickname = data.nickname;
                if (data.nicknames) current.nicknames = data.nicknames;
                chrome.storage.sync.set({ petSettings: current });
            });
        }

        // 2. Save Claimed History to Local (Flattened Keys)
        if (data.claimedHistory) {
            const newHistory = data.claimedHistory as Record<string, string[]>;
            const keys = Object.keys(newHistory);

            if (keys.length > 0) {
                chrome.storage.local.get(keys, (result) => {
                    const updates: Record<string, string[]> = {};

                    for (const key of keys) {
                        const existing = (result[key] as string[]) || [];
                        const incoming = newHistory[key] || [];
                        // Union merge
                        updates[key] = Array.from(new Set([...existing, ...incoming]));
                    }

                    chrome.storage.local.set(updates);
                    console.log('[Background] Synced History Merged & Flattened:', Object.keys(updates));
                });
            }
        }

        // Save Settings
        if (data.bd2_settings) {
            chrome.storage.local.set({ bd2_synced_settings: data.bd2_settings });
        }

        sendResponse({ success: true });
        return true;
    }

    // --- CHECK CONFIG/MODELS UPDATES ---
    if (message.type === 'PET_CHECK_MODEL_UPDATES') {
        (async () => {
            try {
                const configBaseUrl = 'https://assistant.thebd2pulse.com/config/';
                const reqHeaders = { 'X-BD2-Client': 'BD2-Assistant-Extension' };

                // 1. Fetch Remote Version
                const versionRes = await fetch(`${configBaseUrl}version.json`, { cache: 'no-store', headers: reqHeaders });
                if (!versionRes.ok) throw new Error(`HTTP ${versionRes.status}`);
                const remoteVersion = await versionRes.json();

                // 2. Compare Local Version
                const localStore = await chrome.storage.local.get(['configVersion', 'modelsData']);
                const localVersionVal = localStore.configVersion || '0.0.0';

                if (remoteVersion.version !== localVersionVal || !localStore.modelsData) {
                    console.log(`[Background] Updating config from ${localVersionVal} to ${remoteVersion.version}`);

                    // 3. Fetch New Configs
                    const [modelsRes, charNamesRes, costumeNamesRes] = await Promise.all([
                        fetch(`${configBaseUrl}models.json`, { cache: 'no-store', headers: reqHeaders }),
                        fetch(`${configBaseUrl}character_names.json`, { cache: 'no-store', headers: reqHeaders }),
                        fetch(`${configBaseUrl}costume_names.json`, { cache: 'no-store', headers: reqHeaders })
                    ]);

                    if (!modelsRes.ok || !charNamesRes.ok || !costumeNamesRes.ok) {
                        throw new Error('Failed to fetch one or more config files');
                    }

                    const modelsData = await modelsRes.json();
                    const characterNames = await charNamesRes.json();
                    const costumeNames = await costumeNamesRes.json();

                    // 4. Save to Local Storage
                    await chrome.storage.local.set({
                        configVersion: remoteVersion.version,
                        modelsData,
                        characterNames,
                        costumeNames
                    });

                    sendResponse({
                        success: true,
                        updated: true,
                        version: remoteVersion.version
                    });
                } else {
                    console.log(`[Background] Config is already up to date (${localVersionVal})`);
                    sendResponse({
                        success: true,
                        updated: false,
                        version: localVersionVal
                    });
                }
            } catch (error) {
                console.error('[Background] PET_CHECK_MODEL_UPDATES Error:', error);
                sendResponse({ success: false, error: String(error) });
            }
        })();
        return true; // Async
    }

    // --- FETCH BLOB (Bypass CSP) ---
    if (message.type === 'PET_FETCH_BLOB' && message.url) {
        (async () => {
            try {
                const res = await fetch(message.url, {
                    headers: {
                        'X-BD2-Client': 'BD2-Assistant-Extension'
                    }
                });

                if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${message.url}`);

                const buffer = await res.arrayBuffer();

                // Check if it's HTML (likely 404/Block)
                const contentType = res.headers.get('content-type') || '';
                if (contentType.includes('text/html')) {
                    const text = new TextDecoder().decode(buffer);
                    if (text.toLowerCase().includes('<html')) {
                        throw new Error('Fetched content was HTML/404 Page, not Asset');
                    }
                }

                // Convert to base64 safely
                const bytes = new Uint8Array(buffer);
                let binary = '';
                // Simple loop is safe and avoids RangeError: Maximum call stack size exceeded
                for (let i = 0; i < bytes.byteLength; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const base64 = btoa(binary);

                sendResponse({
                    success: true,
                    base64: base64,
                    contentType: contentType
                });
            } catch (error) {
                console.error('[Background] PET_FETCH_BLOB Error:', error);
                sendResponse({ success: false, error: String(error) });
            }
        })();
        return true;
    }

    // === WebShop Check-in Messages ===
    if (message.type === 'WEBSHOP_TOKEN_CAPTURED') {
        const token = message.token;
        const nicknameFromPage = message.nickname; // Optional, from content script DOM
        if (token && typeof token === 'string') {
            console.log('[Background] WebShop token captured, length:', token.length);
            (async () => {
                // Try to fetch nickname via API
                let nickname = nicknameFromPage || '';
                if (!nickname) {
                    nickname = await fetchWebshopNickname(token);
                }
                if (!nickname) {
                    // Use a timestamp-based fallback name
                    nickname = `帳號_${Date.now()}`;
                }

                // Upsert into accounts array
                const result = await chrome.storage.local.get('webshopAccounts');
                const accounts: WebshopAccount[] = (result.webshopAccounts as WebshopAccount[]) || [];
                const existingIdx = accounts.findIndex(a => a.nickname === nickname);
                if (existingIdx >= 0) {
                    // Replace token for existing account
                    accounts[existingIdx].token = token;
                    accounts[existingIdx].tokenExpired = false;
                    console.log(`[WebShop] Updated token for existing account: ${nickname}`);
                } else {
                    // Add new account
                    accounts.push({
                        nickname,
                        token,
                        lastDaily: null,
                        lastEvent: null,
                        tokenExpired: false
                    });
                    console.log(`[WebShop] Added new account: ${nickname}`);
                }
                await chrome.storage.local.set({ webshopAccounts: accounts });
                sendResponse({ success: true, nickname });
            })();
            return true; // Async
        } else {
            sendResponse({ success: false, error: 'Invalid token' });
        }
        return false;
    }

    if (message.type === 'WEBSHOP_MANUAL_CHECKIN') {
        (async () => {
            const result = await manualWebshopCheckin();
            sendResponse(result);
        })();
        return true;
    }

    if (message.type === 'WEBSHOP_SET_AUTO_CHECKIN') {
        const enabled = !!message.enabled;
        chrome.storage.local.set({ webshopAutoCheckin: enabled });
        if (enabled) {
            chrome.alarms.create(WEBSHOP_CHECKIN_ALARM, { periodInMinutes: WEBSHOP_CHECKIN_INTERVAL });
        }
        console.log('[Background] WebShop auto check-in:', enabled ? 'enabled' : 'disabled');
        sendResponse({ success: true });
        return false;
    }

    if (message.type === 'WEBSHOP_REMOVE_ACCOUNT') {
        const nickname = message.nickname;
        (async () => {
            const result = await chrome.storage.local.get('webshopAccounts');
            let accounts: WebshopAccount[] = (result.webshopAccounts as WebshopAccount[]) || [];
            accounts = accounts.filter(a => a.nickname !== nickname);
            await chrome.storage.local.set({ webshopAccounts: accounts });
            console.log(`[WebShop] Removed account: ${nickname}`);
            sendResponse({ success: true });
        })();
        return true;
    }

    if (message.type === 'WEBSHOP_GET_STATUS') {
        (async () => {
            const data = await chrome.storage.local.get(['webshopAccounts', 'webshopAutoCheckin']);
            const accounts: WebshopAccount[] = (data.webshopAccounts as WebshopAccount[]) || [];
            sendResponse({
                accounts: accounts.map(a => ({
                    nickname: a.nickname,
                    lastDaily: a.lastDaily || null,
                    lastEvent: a.lastEvent || null,
                    tokenExpired: !!a.tokenExpired
                })),
                autoCheckin: !!data.webshopAutoCheckin
            });
        })();
        return true;
    }

});

// Initial check on load (for debugging/immediate feedback)
checkForUpdates();
initWebshopAutoCheckin();

// ============================================================
// WebShop Check-in Functions (Multi-Account)
// ============================================================

interface WebshopAccount {
    nickname: string;
    token: string;
    lastDaily: string | null;
    lastEvent: string | null;
    tokenExpired: boolean;
}

/** Helper: Make an authenticated request to the WebShop API */
async function webshopApiRequest(method: string, path: string, body?: any, tokenOverride?: string): Promise<{ok: boolean, status: number, data: any}> {
    let token = tokenOverride;
    if (!token) {
        // Fallback: should not happen in multi-account flow
        const result = await chrome.storage.local.get('webshopAccounts');
        const accounts = (result.webshopAccounts as WebshopAccount[]) || [];
        token = accounts[0]?.token;
    }
    if (!token) {
        return { ok: false, status: 0, data: { error: 'No token' } };
    }

    try {
        const options: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Origin': 'https://webshop.browndust2.global',
                'Referer': 'https://webshop.browndust2.global/'
            }
        };
        if (body) {
            options.body = JSON.stringify(body);
        }

        const res = await fetch(`${WEBSHOP_API_BASE}${path}`, options);
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, status: res.status, data };
    } catch (error) {
        console.error('[WebShop] API request error:', error);
        return { ok: false, status: 0, data: { error: String(error) } };
    }
}

/** Fetch nickname from the WebShop API after token capture */
async function fetchWebshopNickname(token: string): Promise<string> {
    try {
        // Try fetching the mypage HTML to extract nickname from the rendered page
        // The WebShop API might have a user endpoint
        const res = await webshopApiRequest('POST', '/api/event/event-user-info', undefined, token);
        if (res.ok) {
            const data = res.data?.data || res.data;
            const name = data?.nickname || data?.userName || data?.name || data?.characterName;
            if (name && typeof name === 'string') {
                console.log('[WebShop] Got nickname from event-user-info:', name);
                return name;
            }
        }

        // Try the attend endpoint - response might contain user info
        const attendRes = await webshopApiRequest('POST', '/api/user/attend', { type: 0 }, token);
        if (attendRes.ok) {
            const data = attendRes.data?.data || attendRes.data;
            const name = data?.nickname || data?.userName || data?.name || data?.characterName;
            if (name && typeof name === 'string') {
                console.log('[WebShop] Got nickname from attend:', name);
                return name;
            }
        }
    } catch (e) {
        console.warn('[WebShop] Failed to fetch nickname:', e);
    }
    return '';
}

/** Check if we need to perform a daily check-in based on last check-in time */
function shouldPerformDailyCheckin(lastCheckinStr: string | null | undefined): boolean {
    if (!lastCheckinStr) return true;

    const lastCheckin = new Date(lastCheckinStr);
    const now = new Date();

    const todayReset = new Date(now.getFullYear(), now.getMonth(), now.getDate(), WEBSHOP_DAILY_RESET_HOUR, 0, 0);
    const relevantReset = now >= todayReset ? todayReset : new Date(todayReset.getTime() - 24 * 60 * 60 * 1000);

    return lastCheckin < relevantReset;
}

/** Perform daily check-in for a specific account */
async function performDailyCheckin(token: string): Promise<{success: boolean, message: string, expired?: boolean, skipped?: boolean}> {
    console.log('[WebShop] Attempting daily check-in...');

    const res = await webshopApiRequest('POST', '/api/user/attend', { type: 0 }, token);
    console.log('[WebShop] Daily check-in response:', JSON.stringify({ ok: res.ok, status: res.status, data: res.data }));

    if (res.status === 401) {
        return { success: false, message: 'Token 已過期', expired: true };
    }

    if (res.ok) {
        // Check if the API response indicates already attended today
        const data = res.data?.data || res.data;
        const alreadyAttended = data?.isAttend === true || data?.attended === true || data?.alreadyAttend === true;
        if (alreadyAttended) {
            console.log('[WebShop] Daily check-in: API says already attended today.');
            return { success: true, message: '每日簽到：今日已完成', skipped: true };
        }
        return { success: true, message: '每日簽到成功！' };
    } else {
        // Some APIs return error for "already attended" - detect common patterns
        const errData = res.data?.data || res.data;
        const errMsg = errData?.message || errData?.error || res.data?.message || '';
        if (errMsg.includes('already') || errMsg.includes('已') || res.status === 409) {
            console.log('[WebShop] Daily check-in: already done (from error response).');
            return { success: true, message: '每日簽到：今日已完成', skipped: true };
        }
        return { success: false, message: `每日簽到失敗: ${errMsg || `狀態碼: ${res.status}`}` };
    }
}

/** Perform event check-in for a specific account */
async function performEventCheckin(token: string): Promise<{success: boolean, message: string, skipped?: boolean, expired?: boolean}> {
    console.log('[WebShop] Checking event attendance...');

    const eventInfoRes = await webshopApiRequest('GET', '/api/event/event-info', undefined, token);

    if (!eventInfoRes.ok) {
        if (eventInfoRes.status === 404 || eventInfoRes.status === 400) {
            return { success: true, message: '目前沒有進行中的活動', skipped: true };
        }
        if (eventInfoRes.status === 401) {
            return { success: false, message: 'Token 已過期', expired: true };
        }
        return { success: false, message: `無法取得活動資訊: ${eventInfoRes.status}` };
    }

    const eventInfo = eventInfoRes.data?.data || eventInfoRes.data;
    const eventScheduleId = eventInfo?.scheduleInfo?.eventScheduleId || eventInfo?.eventScheduleId;

    if (!eventScheduleId) {
        return { success: true, message: '目前沒有進行中的活動', skipped: true };
    }

    const userInfoRes = await webshopApiRequest('POST', '/api/event/event-user-info', undefined, token);
    if (!userInfoRes.ok) {
        return { success: false, message: `無法取得活動用戶資訊: ${userInfoRes.status}` };
    }

    const userInfo = userInfoRes.data?.data || userInfoRes.data;
    const attendanceCount = userInfo?.attendanceCount ?? -1;
    const isLastAttendance = userInfo?.isLastAttendance ?? false;

    if (attendanceCount >= 7 || isLastAttendance) {
        return { success: true, message: `活動簽到已完成 (${attendanceCount}/7)`, skipped: true };
    }

    if (attendanceCount < 0) {
        return { success: true, message: '活動簽到狀態未知', skipped: true };
    }

    const attendRes = await webshopApiRequest('POST', '/api/event/attend-reward', { eventScheduleId }, token);

    if (attendRes.ok) {
        return { success: true, message: `活動簽到成功！(第 ${attendanceCount + 1} 天)` };
    } else {
        return { success: false, message: `活動簽到失敗: ${attendRes.status}` };
    }
}

/** Show a pet bubble notification for check-in results (broadcast to all active tabs) */
async function notifyCheckinResult(_title: string, message: string) {
    const tabs = await chrome.tabs.query({ active: true });
    for (const tab of tabs) {
        if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
                type: 'WEBSHOP_CHECKIN_RESULT',
                text: message
            }).catch(() => { });
        }
    }
}

/** Helper: get and save accounts */
async function getWebshopAccounts(): Promise<WebshopAccount[]> {
    const result = await chrome.storage.local.get('webshopAccounts');
    return (result.webshopAccounts as WebshopAccount[]) || [];
}
async function saveWebshopAccounts(accounts: WebshopAccount[]) {
    await chrome.storage.local.set({ webshopAccounts: accounts });
}

/** Main orchestrator: auto check-in all accounts */
async function checkAndPerformWebshopCheckin() {
    const settings = await chrome.storage.local.get(['webshopAutoCheckin']);
    if (!settings.webshopAutoCheckin) {
        console.log('[WebShop] Auto check-in is disabled.');
        return;
    }

    const accounts = await getWebshopAccounts();
    if (accounts.length === 0) {
        console.log('[WebShop] No WebShop accounts, skipping.');
        return;
    }

    const results: string[] = [];
    let hasError = false;
    let changed = false;

    for (const account of accounts) {
        if (account.tokenExpired) continue;

        const needsDaily = shouldPerformDailyCheckin(account.lastDaily);
        const needsEvent = shouldPerformDailyCheckin(account.lastEvent);

        if (!needsDaily && !needsEvent) {
            console.log(`[WebShop] ${account.nickname}: all done today.`);
            continue;
        }

        const acctResults: string[] = [];

        if (needsDaily) {
            const r = await performDailyCheckin(account.token);
            if (r.expired) { account.tokenExpired = true; changed = true; continue; }
            if (r.skipped) {
                // Already attended via API — save to avoid re-checking
                account.lastDaily = new Date().toISOString();
                changed = true;
            } else if (r.success) {
                acctResults.push(r.message);
                account.lastDaily = new Date().toISOString();
                changed = true;
            } else {
                acctResults.push(r.message);
                hasError = true;
            }
        }

        if (needsEvent) {
            const r = await performEventCheckin(account.token);
            if (r.expired) { account.tokenExpired = true; changed = true; continue; }
            if (!r.skipped) {
                acctResults.push(r.message);
                if (r.success) { account.lastEvent = new Date().toISOString(); changed = true; }
                else hasError = true;
            } else {
                // Save lastEvent even on skip to avoid re-checking today
                account.lastEvent = new Date().toISOString();
                changed = true;
            }
        }

        if (acctResults.length > 0) {
            results.push(`[${account.nickname}] ${acctResults.join(' | ')}`);
        }
    }

    if (changed) await saveWebshopAccounts(accounts);

    if (results.length > 0) {
        notifyCheckinResult(
            hasError ? '簽到結果' : '簽到成功',
            results.join('\n')
        );
    }

    // Notify about expired tokens
    const expired = accounts.filter(a => a.tokenExpired);
    if (expired.length > 0) {
        notifyCheckinResult('Token 已過期', expired.map(a => a.nickname).join(', ') + ' 的 Token 已過期，請重新同步');
    }
}

/** Manual check-in (triggered from popup) - all accounts */
async function manualWebshopCheckin(): Promise<{success: boolean, messages: string[]}> {
    const accounts = await getWebshopAccounts();

    if (accounts.length === 0) {
        return { success: false, messages: ['尚未同步任何 WebShop 帳號，請先點選「同步 WebShop 登入」'] };
    }

    const messages: string[] = [];
    let allSuccess = true;
    let anyAttempted = false;
    let changed = false;

    for (const account of accounts) {
        if (account.tokenExpired) {
            messages.push(`[${account.nickname}] Token 已過期，請重新同步`);
            allSuccess = false;
            continue;
        }

        const needsDaily = shouldPerformDailyCheckin(account.lastDaily);
        const needsEvent = shouldPerformDailyCheckin(account.lastEvent);

        if (!needsDaily && !needsEvent) {
            messages.push(`[${account.nickname}] 今日已簽到完成`);
            continue;
        }

        const acctMsgs: string[] = [];

        if (needsDaily) {
            const r = await performDailyCheckin(account.token);
            if (r.expired) { account.tokenExpired = true; changed = true; allSuccess = false; continue; }
            if (r.skipped) {
                // Already attended via API — save to avoid re-checking
                account.lastDaily = new Date().toISOString();
                changed = true;
            } else if (r.success) {
                anyAttempted = true;
                acctMsgs.push(r.message);
                account.lastDaily = new Date().toISOString();
                changed = true;
            } else {
                anyAttempted = true;
                acctMsgs.push(r.message);
                allSuccess = false;
            }
        }

        if (needsEvent) {
            const r = await performEventCheckin(account.token);
            if (r.expired) { account.tokenExpired = true; changed = true; allSuccess = false; continue; }
            if (r.skipped) {
                // No active event or already done — save to avoid re-checking
                account.lastEvent = new Date().toISOString();
                changed = true;
            } else if (r.success) {
                anyAttempted = true;
                acctMsgs.push(r.message);
                account.lastEvent = new Date().toISOString();
                changed = true;
            } else {
                anyAttempted = true;
                acctMsgs.push(r.message);
                allSuccess = false;
            }
        }

        if (acctMsgs.length > 0) {
            messages.push(`[${account.nickname}] ${acctMsgs.join(' | ')}`);
        }
    }

    if (changed) await saveWebshopAccounts(accounts);

    // Only send Chrome notification if something was actually attempted
    if (anyAttempted) {
        notifyCheckinResult(
            allSuccess ? '手動簽到完成' : '簽到結果',
            messages.join('\n')
        );
    }

    return { success: allSuccess, messages };
}

/** Initialize auto check-in alarm on startup */
async function initWebshopAutoCheckin() {
    const settings = await chrome.storage.local.get(['webshopAutoCheckin']);
    const accounts = await getWebshopAccounts();
    if (settings.webshopAutoCheckin && accounts.length > 0) {
        console.log('[WebShop] Auto check-in enabled, scheduling...');
        await checkAndPerformWebshopCheckin();
    }
}
