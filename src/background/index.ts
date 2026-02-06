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
const POLL_INTERVAL_MINUTES = 60; // User requested 60 mins

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

        console.log(`[Background] ${codesData.length} codes from API, ${validCodes.length} valid (non-expired)`);

        // Get processed codes from storage
        const storage = await chrome.storage.local.get('seenCodes');
        const seenCodes = (storage.seenCodes || []) as string[];

        // Find new codes
        const newCodes = validCodes.filter(c => !seenCodes.includes(c.code));

        if (newCodes.length > 0) {
            console.log('[Background] New codes found:', newCodes);

            // Get Settings
            const settingsResult = await chrome.storage.sync.get('petSettings');
            const settings = (settingsResult.petSettings || {}) as PetSettings;
            const lang = settings.language || 'zh-TW';
            const autoRedeem = !!settings.autoRedeem;
            const nicknames = settings.nicknames || (settings.nickname ? [settings.nickname] : []);

            // AUTO REDEEM LOGIC
            if (autoRedeem && nicknames.length > 0) {
                console.log('[Background] Auto-Redeeming new codes...');

                let redeemCount = 0;

                for (const codeObj of newCodes) {
                    const code = codeObj.code;
                    for (const nickname of nicknames) {
                        const result = await redeemCode(nickname, code);
                        if (result.success || result.alreadyClaimed) {
                            redeemCount++;
                            // Update claimedCodes in local storage
                            const key = `claimedCodes_${nickname}`;
                            const s = await chrome.storage.local.get(key);
                            const current = (s[key] as string[]) || [];
                            if (!current.includes(code)) {
                                await chrome.storage.local.set({ [key]: [...current, code] });
                            }
                        }
                    }
                }

                // System Notification
                if (redeemCount > 0) {
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'icons/icon128.png',
                        title: 'BD2 Auto-Redeem',
                        message: `Auto-redeemed ${newCodes.length} codes for ${nicknames.length} accounts!`,
                        priority: 2
                    });
                }
            }

            // Notify active tabs with full code info
            notifyActiveTabs(newCodes, lang);

            // Mark as seen
            await chrome.storage.local.set({ seenCodes: [...seenCodes, ...newCodes.map(c => c.code)] });
        } else {
            console.log('[Background] All codes already seen.');
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

async function notifyActiveTabs(codes: CodeInfo[], lang: string) {
    const tabs = await chrome.tabs.query({ active: true });
    for (const tab of tabs) {
        if (tab.id) {
            const message = {
                type: 'NEW_GIFT',
                data: {
                    codes: codes,
                    lang: lang
                }
            };
            chrome.tabs.sendMessage(tab.id, message).catch((err) => {
                console.debug(`[Background] Could not send message to tab ${tab.id}:`, err);
            });
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

                    const settingsResult = await chrome.storage.sync.get('petSettings');
                    const lang = (settingsResult.petSettings as PetSettings)?.language || 'zh-TW';
                    notifyActiveTabs(validCodes, lang);
                    sendResponse({ success: true });
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
            const report: string[] = [];
            let anySuccess = false;

            // Execute parallel requests
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
                    if (response.ok) anySuccess = true;

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

        // 2. Save Full History/Settings to Local
        chrome.storage.local.set({
            bd2_synced_settings: data.bd2_settings || {},
            bd2_claimed_history: data.claimedHistory || {}
        });

        sendResponse({ success: true });
        return true;
    }
});

// Initial check on load (for debugging/immediate feedback)
checkForUpdates();
