// WebShop Token Capture Content Script
// Runs on webshop.browndust2.global pages (ISOLATED world)
// Only captures token + nickname when user is confirmed logged in.

(function () {
    console.log('[WebShop Token] Content script loaded on', window.location.href);

    /** Try to extract session data from localStorage (Zustand persist) */
    function tryGetSessionFromStorage(): { token: string, nickname: string } | null {
        try {
            // Try common Zustand persist key names
            const possibleKeys = ['session-storage', 'session-store', 'sessionStore', 'session'];
            for (const key of possibleKeys) {
                const stored = localStorage.getItem(key);
                if (stored) {
                    const result = extractFromStored(stored);
                    if (result) return result;
                }
            }

            // Scan all localStorage keys
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key) continue;
                const val = localStorage.getItem(key);
                if (val && val.includes('accessToken')) {
                    const result = extractFromStored(val);
                    if (result) {
                        console.log('[WebShop Token] Found session via scan, key:', key);
                        return result;
                    }
                }
            }
        } catch (e) {
            console.error('[WebShop Token] Error reading localStorage:', e);
        }
        return null;
    }

    /** Parse a stored JSON value and extract token + nickname */
    function extractFromStored(stored: string): { token: string, nickname: string } | null {
        try {
            const parsed = JSON.parse(stored);
            // Zustand persist wraps state in { state: {...}, version: N }
            const state = parsed.state || parsed;
            const sess = state.session || state;

            const token = sess.accessToken;
            // Try multiple possible nickname field names
            const nickname = sess.nickname || sess.userName || sess.characterName
                || sess.name || sess.userNickname || sess.gameName
                || state.nickname || state.userName;

            if (token && typeof token === 'string' && token.length > 20) {
                if (nickname && typeof nickname === 'string' && nickname.length > 0) {
                    return { token, nickname };
                }
            }

            // Token exists without nickname in store - try to find nickname elsewhere
            if (token && typeof token === 'string' && token.length > 20) {
                // Log what fields exist so we can figure out the right field name
                console.log('[WebShop Token] Found token but no nickname. Session fields:', Object.keys(sess));
                if (state !== sess) {
                    console.log('[WebShop Token] State fields:', Object.keys(state));
                }
            }
        } catch (e) { /* skip */ }
        return null;
    }

    /** Try to find the nickname from the visible mypage DOM */
    function tryGetNicknameFromDOM(): string | null {
        // The mypage shows a profile card with rows like:
        //   角色暱稱    Guest_11681241
        //   UID          11681241
        // Strategy: find any element containing the label text, then get the value from sibling

        // Labels in different languages
        const nicknameLabels = ['角色暱稱', '角色昵称', 'キャラクターニックネーム', '캐릭터 닉네임', 'Character Nickname', 'Nickname'];

        // Scan all text nodes for the label
        const allElements = document.querySelectorAll('div, span, p, td, th, dt, dd, li, label');
        for (const el of allElements) {
            const text = el.textContent?.trim() || '';
            // Check if this element exactly contains a nickname label
            const isLabel = nicknameLabels.some(label => text === label);
            if (!isLabel) continue;

            console.log('[WebShop Token] Found nickname label element:', text);

            // Look for the value in the parent's other children
            const parent = el.parentElement;
            if (!parent) continue;

            for (const child of parent.children) {
                if (child === el) continue;
                const childText = child.textContent?.trim();
                if (childText && childText.length > 0 && childText.length < 100) {
                    // This should be the nickname value
                    console.log('[WebShop Token] Found nickname value:', childText);
                    return childText;
                }
            }

            // Also check next sibling
            const next = el.nextElementSibling;
            if (next) {
                const nextText = next.textContent?.trim();
                if (nextText && nextText.length > 0 && nextText.length < 100) {
                    console.log('[WebShop Token] Found nickname from next sibling:', nextText);
                    return nextText;
                }
            }

            // Check parent's parent (row-based layout)
            const grandParent = parent.parentElement;
            if (grandParent) {
                for (const child of grandParent.children) {
                    if (child === parent) continue;
                    const childText = child.textContent?.trim();
                    if (childText && childText.length > 0 && childText.length < 100 && !nicknameLabels.includes(childText)) {
                        console.log('[WebShop Token] Found nickname from grandparent row:', childText);
                        return childText;
                    }
                }
            }
        }

        // Fallback: check the header nav area (nickname is also displayed there)
        // The header typically has the nickname in a nav > ul > li area
        const headerElements = document.querySelectorAll('header p, header span, nav p, nav span');
        for (const el of headerElements) {
            const text = el.textContent?.trim();
            if (text && text.length > 1 && text.length < 50
                && !text.includes('EVENT') && !text.includes('WEB')
                && !text.includes('商店') && !text.includes('登入') && !text.includes('Login')
                && text !== 'EVENTS') {
                // This could be the nickname in the header
                // Check if it looks like a player name (not a nav item)
                const parentText = el.parentElement?.textContent?.trim();
                if (parentText === text) { // Leaf element with just the name
                    console.log('[WebShop Token] Found nickname from header:', text);
                    return text;
                }
            }
        }

        return null;
    }

    /** Send the token and nickname to the background script */
    function sendToBackground(token: string, nickname: string) {
        console.log('[WebShop Token] Sending to background - nickname:', nickname, ', token length:', token.length);
        chrome.runtime.sendMessage({
            type: 'WEBSHOP_TOKEN_CAPTURED',
            token: token,
            nickname: nickname
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.warn('[WebShop Token] Failed to send:', chrome.runtime.lastError.message);
            } else {
                console.log('[WebShop Token] Sent successfully:', response);
            }
        });
    }

    /** Main capture logic with polling - waits for both token AND nickname */
    let captured = false;

    function attemptCapture(): boolean {
        if (captured) return true;

        // First try: token + nickname both from localStorage (Zustand store may have user info)
        const session = tryGetSessionFromStorage();
        if (session) {
            captured = true;
            sendToBackground(session.token, session.nickname);
            return true;
        }

        // Second try: token from localStorage + nickname from DOM (for mypage)
        if (window.location.pathname.includes('mypage')) {
            // Get token without nickname requirement
            let token: string | null = null;
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (!key) continue;
                    const val = localStorage.getItem(key);
                    if (val && val.includes('accessToken')) {
                        try {
                            const parsed = JSON.parse(val);
                            const state = parsed.state || parsed;
                            const sess = state.session || state;
                            if (sess.accessToken && typeof sess.accessToken === 'string' && sess.accessToken.length > 20) {
                                token = sess.accessToken;
                                break;
                            }
                        } catch (e) { /* skip */ }
                    }
                }
            } catch (e) { /* skip */ }

            if (token) {
                const domNickname = tryGetNicknameFromDOM();
                if (domNickname) {
                    captured = true;
                    sendToBackground(token, domNickname);
                    return true;
                }
            }
        }

        return false;
    }

    function startPolling() {
        if (attemptCapture()) return;

        console.log('[WebShop Token] Waiting for login (session + nickname)...');
        let attempts = 0;
        const maxAttempts = 120; // 4 minutes (user needs time to log in)
        const interval = setInterval(() => {
            attempts++;
            if (attemptCapture() || attempts >= maxAttempts) {
                clearInterval(interval);
                if (attempts >= maxAttempts) {
                    console.log('[WebShop Token] Timed out waiting for login.');
                }
            }
        }, 2000);

        // Also watch for localStorage changes
        window.addEventListener('storage', () => {
            attemptCapture();
        });

        // Watch for DOM changes (for mypage nickname detection)
        if (window.location.pathname.includes('mypage')) {
            const observer = new MutationObserver(() => {
                if (attemptCapture()) {
                    observer.disconnect();
                    clearInterval(interval);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        }
    }

    // Listen for explicit request from popup/background
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message.type === 'WEBSHOP_REQUEST_TOKEN') {
            if (attemptCapture()) {
                sendResponse({ status: 'found' });
            } else {
                startPolling();
                sendResponse({ status: 'polling' });
            }
        }
        return true;
    });

    // Auto-start polling when page loads (only on mypage or after login-related navigation)
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        startPolling();
    } else {
        document.addEventListener('DOMContentLoaded', startPolling);
    }
})();
