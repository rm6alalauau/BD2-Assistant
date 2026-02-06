// sync_handler.ts
// Handles data synchronization between The BD2 Pulse website and the extension

console.log('[Pet Sync] Sync Handler Loaded');

// Listen for sync request from Extension Popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PET_REQUEST_SYNC') {
        console.log('[Pet Sync] Sync Requested');

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
                        console.warn(`[Pet Sync] Failed to parse ${key}`, e);
                    }
                }
            }
            if (Object.keys(claimedHistory).length > 0) {
                data.claimedHistory = claimedHistory;
            }

            console.log('[Pet Sync] Data collected:', data);

            // Send to Runtime (Background or Popup)
            chrome.runtime.sendMessage({ type: 'PET_SYNC_DATA', data: data }, (response) => {
                console.log('[Pet Sync] Data Sent. Response:', response);
                if (chrome.runtime.lastError) {
                    console.warn('[Pet Sync] Runtime error:', chrome.runtime.lastError);
                }
            });

            if (sendResponse) sendResponse({ success: true, data: data });
            showSyncNotification(true);

        } catch (e) {
            console.error('[Pet Sync] Error collecting data', e);
            if (sendResponse) sendResponse({ success: false, error: (e as Error).message });
            showSyncNotification(false);
        }
        return true; // Async response
    }
});

// Auto-Sync Trigger via URL
if (window.location.search.includes('pet_sync=true')) {
    console.log('[Pet Sync] URL Trigger Detected. Syncing...');
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
                console.warn('[Pet Sync] Failed to parse savedNicknames');
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

        console.log('[Pet Sync] Auto-Sync Data:', data);

        chrome.runtime.sendMessage({ type: 'PET_SYNC_DATA', data: data });
        showSyncNotification(true);

        // Clean URL
        const url = new URL(window.location.href);
        url.searchParams.delete('pet_sync');
        window.history.replaceState({}, '', url);

    } catch (e) {
        console.error('[Pet Sync] Auto-Sync Failed', e);
        showSyncNotification(false);
    }
}

function showSyncNotification(success: boolean) {
    const div = document.createElement('div');
    Object.assign(div.style, {
        position: 'fixed',
        top: '20px', left: '50%', transform: 'translateX(-50%)',
        padding: '12px 24px',
        background: success ? '#4CAF50' : '#F44336',
        color: 'white',
        borderRadius: '30px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        zIndex: '9999999',
        fontWeight: 'bold',
        fontSize: '16px',
        transition: 'opacity 0.5s ease',
        opacity: '0'
    });
    div.textContent = success ? 'Extention Synced Successfully! ✅' : 'Sync Failed ❌';
    document.body.appendChild(div);

    // Animate
    requestAnimationFrame(() => div.style.opacity = '1');
    setTimeout(() => {
        div.style.opacity = '0';
        setTimeout(() => div.remove(), 500);
    }, 2500);
}
