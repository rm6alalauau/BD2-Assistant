// sync_handler.ts
// Handles data synchronization between The BD2 Pulse website and the extension

// console.log('[Pet Sync] Sync Handler Loaded');

// Listen for sync request from Extension Popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PET_REQUEST_SYNC') {
        // console.log('[Pet Sync] Sync Requested');

        try {
            const data: Record<string, any> = {};

            // 1. Nickname
            const nickname = localStorage.getItem('nickname');
            if (nickname) data.nickname = nickname;

            // 2. Settings
            const settings = localStorage.getItem('bd2_settings');
            if (settings) {
                try {
                    data.bd2_settings = JSON.parse(settings);
                } catch (e) {
                    console.warn('[Pet Sync] Failed to parse bd2_settings', e);
                }
            }

            // 3. Claimed Codes (History)
            // Filter all keys starting with 'claimedCodes_'
            const claimedHistory: Record<string, string[]> = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('claimedCodes_')) {
                    try {
                        const val = localStorage.getItem(key);
                        if (val) {
                            claimedHistory[key] = JSON.parse(val);
                        }
                    } catch (e) {
                        // console.warn(`[Pet Sync] Failed to parse ${key}`, e);
                    }
                }
            }
            if (Object.keys(claimedHistory).length > 0) {
                data.claimedHistory = claimedHistory;
            }

            // console.log('[Pet Sync] Data collected:', data);

            // Send to Runtime (Background or Popup)
            chrome.runtime.sendMessage({ type: 'PET_SYNC_DATA', data: data }, (response) => {
                // console.log('[Pet Sync] Data Sent. Response:', response);
                if (chrome.runtime.lastError) {
                    // console.warn('[Pet Sync] Runtime error:', chrome.runtime.lastError);
                }
            });

            if (sendResponse) sendResponse({ success: true, data: data });
            // showSyncNotification(true);

        } catch (e) {
            console.error('[Pet Sync] Error collecting data', e);
            if (sendResponse) sendResponse({ success: false, error: (e as Error).message });
            // showSyncNotification(false);
        }
        return true; // Async response
    }
});

// Auto-Sync Trigger via URL
if (window.location.search.includes('pet_sync=true')) {
    // console.log('[Pet Sync] URL Trigger Detected. Syncing...');
    setTimeout(() => {
        // Reuse the logic by simulating a message or extracting function
        // For simplicity, re-implementing core logic here or refactoring. 
        // Let's refactor slightly to be cleaner.
        performSync();
    }, 1000); // Wait for LocalStorage to be ready/loaded if needed
}

function performSync() {
    try {
        const data: Record<string, any> = {};

        // 1. Current Nickname
        const nickname = localStorage.getItem('nickname');
        if (nickname) data.nickname = nickname;

        // 2. Saved Nicknames (Multiple Accounts)
        const savedNicknamesStr = localStorage.getItem('savedNicknames');
        if (savedNicknamesStr) {
            try {
                const saved = JSON.parse(savedNicknamesStr);
                if (Array.isArray(saved)) {
                    data.nicknames = saved;
                    // Ensure current nickname is included
                    if (nickname && !data.nicknames.includes(nickname)) {
                        data.nicknames.unshift(nickname);
                    }
                }
            } catch (e) {
                // console.warn('[Pet Sync] Failed to parse savedNicknames');
            }
        }
        // Fallback: if only nickname exists, make it a list
        if (!data.nicknames && data.nickname) {
            data.nicknames = [data.nickname];
        }

        const settings = localStorage.getItem('bd2_settings');
        if (settings) {
            try { data.bd2_settings = JSON.parse(settings); } catch (e) { }
        }

        const claimedHistory: Record<string, string[]> = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('claimedCodes_')) {
                const val = localStorage.getItem(key);
                if (val) claimedHistory[key] = JSON.parse(val);
            }
        }
        if (Object.keys(claimedHistory).length > 0) data.claimedHistory = claimedHistory;

        // console.log('[Pet Sync] Auto-Sync Data:', data);

        chrome.runtime.sendMessage({ type: 'PET_SYNC_DATA', data: data });
        // showSyncNotification(true);

        // Clean URL
        const url = new URL(window.location.href);
        url.searchParams.delete('pet_sync');
        window.history.replaceState({}, '', url);

    } catch (e) {
        console.error('[Pet Sync] Auto-Sync Failed', e);
    }
}

// Notification removed by user request
// function showSyncNotification(success: boolean) { ... }
// --- Extension to Web Sync Logic ---

// 3. Full One-Time Sync on Load (To capture older history not in pending)
function performFullExtensionSync() {
    // console.log('[Pet Sync] Requesting FULL history from extension...');

    // First, get settings to know nicknames
    chrome.runtime.sendMessage({ type: 'PET_GET_STORAGE_DATA', keys: ['petSettings'] }, (response) => {
        if (response && response.success && response.data) {
            const settings = response.data.petSettings || {};
            const nicknames = settings.nicknames || (settings.nickname ? [settings.nickname] : []);

            if (nicknames.length > 0) {
                const keys = nicknames.map((n: string) => `claimedCodes_${n}`);
                chrome.runtime.sendMessage({ type: 'PET_GET_STORAGE_DATA', keys: keys }, (res2) => {
                    if (res2 && res2.success && res2.data) {
                        const history = res2.data;
                        // Convert flattened 'claimedCodes_NAME' -> item list
                        const updates: { nickname: string, code: string }[] = [];
                        for (const key in history) {
                            const codes = history[key] as string[];
                            const nickname = key.replace('claimedCodes_', '');
                            codes.forEach(c => updates.push({ nickname, code: c }));
                        }
                        if (updates.length > 0) {
                            // console.log(`[Pet Sync] Applying Full Sync (${updates.length} items)`);
                            applyExtensionSync(updates);
                        }
                    }
                });
            }
        }
    });
}
performFullExtensionSync(); // Run on load

// 1. Check for Pending Sync on Load (if extension redeemed while site was closed)
function checkPendingSync() {
    // console.log('[Pet Sync] Checking for pending extension sync...');
    chrome.runtime.sendMessage({ type: 'PET_CHECK_PENDING_SYNC' }, (response) => {
        if (response && response.success && response.data) {
            // console.log('[Pet Sync] Found pending items:', response.data);
            applyExtensionSync(response.data);
        }
    });
}
// Trigger check on load
checkPendingSync();

// 2. Listen for Live Sync (if extension redeemed while site is open)
chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
    if (message.type === 'PET_FORCE_SYNC_TO_WEB') {
        // console.log('[Pet Sync] Received live sync:', message.data);
        applyExtensionSync(message.data);
    }
});

function applyExtensionSync(items: { nickname: string, code: string }[]) {
    let updated = false;
    for (const item of items) {
        const key = `claimedCodes_${item.nickname}`;
        try {
            const currentStr = localStorage.getItem(key);
            let list: string[] = currentStr ? JSON.parse(currentStr) : [];
            if (!list.includes(item.code)) {
                list.push(item.code);
                localStorage.setItem(key, JSON.stringify(list));
                updated = true;
                // console.log(`[Pet Sync] Updated ${key} with ${item.code}`);
            }
        } catch (e) {
            // console.error(`[Pet Sync] Failed to update ${key}`, e);
        }
    }

    if (updated) {
        // Trigger Website Refresh/Update
        // console.log('[Pet Sync] Dispatching Refresh Event to Website');
        window.postMessage({ type: 'BD2_EXTENSION_REDEEM_COMPLETE' }, '*');
        // showSyncNotification(true);
    }
}
