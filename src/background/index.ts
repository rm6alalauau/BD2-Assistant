// Interfaces
interface PetSettings {
    nickname?: string;
    nicknames?: string[]; // Multiple accounts support
    [key: string]: any;
}

// Configuration
const API_URL = 'https://api.thebd2pulse.com/redeem';
const REDEEM_API_URL = 'https://loj2urwaua.execute-api.ap-northeast-1.amazonaws.com/prod/coupon'; // Direct AWS API - extensions have no CORS restrictions
const API_KEY = 'pulse-key-abc123-xyz789-very-secret';
const ALARM_NAME = 'checkUpdate';
const POLL_INTERVAL_MINUTES = 60; // Standard check interval

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
chrome.runtime.onStartup.addListener(() => checkForUpdates());

// Listen for Alarms
chrome.alarms.onAlarm.addListener(async (alarm: chrome.alarms.Alarm) => {
    if (alarm.name === ALARM_NAME) {
        console.log(`[Background] Alarm triggered: ${ALARM_NAME}`);
        await checkForUpdates();
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

                // System Notification
                if (redeemCount > 0) {
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'icons/icon128.png',
                        title: 'BD2 Auto-Redeem',
                        message: `Auto-redeemed ${redeemCount} codes!`,
                        priority: 2
                    });
                }
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
});

// Initial check on load (for debugging/immediate feedback)
checkForUpdates();
