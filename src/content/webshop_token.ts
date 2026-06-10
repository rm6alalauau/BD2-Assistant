// WebShop Token Capture Content Script
// Runs on webshop.browndust2.global pages (ISOLATED world)
// Captures only the WebShop session already present in this browser.

(function () {
    console.log('[WebShop Token] Content script loaded on', window.location.href);

    // Inject the hook into the page's execution environment via web_accessible_resources
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('hook.js');
    (document.head || document.documentElement).appendChild(script);

    // Listen for the intercepted token from the injected script
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'FIREBASE_AUTH_INTERCEPTED') {
            const { refreshToken, apiKey } = event.data;
            
            // Send to background script
            chrome.runtime.sendMessage({
                type: 'WEBSHOP_FIREBASE_AUTH_EXTRACTED',
                refreshToken: refreshToken,
                apiKey: apiKey
            });
        }
    });

    const SESSION_STORAGE_KEY = 'session-storage';
    const REMEMBERED_SESSION_KEY = 'webshopRememberedSession';
    const REMEMBER_DAYS = 30;

    interface CapturedWebshopSession {
        token: string;
        nickname: string;
        storageKey: string;
        sessionStorageRaw: string;
    }

    interface RememberedWebshopSession {
        storageKey?: string;
        sessionStorageRaw?: string;
        savedAt?: number;
        rememberUntil?: number;
    }

    function isValidToken(token: unknown): token is string {
        return typeof token === 'string' && token.length > 20;
    }

    function normalizeNickname(value: unknown): string {
        return typeof value === 'string' ? value.trim() : '';
    }

    function fallbackNicknameFromSession(sess: any): string {
        const userId = normalizeNickname(sess?.userId);
        if (userId) return userId;

        const userIndex = sess?.userIndex;
        if (typeof userIndex === 'number' || typeof userIndex === 'string') {
            const id = String(userIndex).trim();
            if (id) return `Guest_${id}`;
        }

        const memberId = sess?.memberId;
        if (typeof memberId === 'number' || typeof memberId === 'string') {
            const id = String(memberId).trim();
            if (id) return `Member_${id}`;
        }

        return '';
    }

    function extractFromStored(stored: string, storageKey = SESSION_STORAGE_KEY): CapturedWebshopSession | null {
        try {
            const parsed = JSON.parse(stored);
            const state = parsed.state || parsed;
            const sess = state.session || state;
            const token = sess.accessToken;

            if (!isValidToken(token)) return null;

            const explicitNickname = normalizeNickname(
                sess.nickname || sess.userName || sess.characterName || sess.name ||
                sess.userNickname || sess.gameName || state.nickname || state.userName
            );
            const nickname = explicitNickname || fallbackNicknameFromSession(sess);

            if (!nickname) return null;

            return { token, nickname, storageKey, sessionStorageRaw: stored };
        } catch (e) {
            return null;
        }
    }

    function tryGetSessionFromStorage(): CapturedWebshopSession | null {
        try {
            const possibleKeys = [SESSION_STORAGE_KEY, 'session-store', 'sessionStore', 'session'];
            for (const key of possibleKeys) {
                const stored = localStorage.getItem(key);
                if (!stored) continue;
                const result = extractFromStored(stored, key);
                if (result) return result;
            }

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key) continue;
                const val = localStorage.getItem(key);
                if (!val || !val.includes('accessToken')) continue;
                const result = extractFromStored(val, key);
                if (result) {
                    console.log('[WebShop Token] Found session via scan, key:', key);
                    return result;
                }
            }
        } catch (e) {
            console.error('[WebShop Token] Error reading localStorage:', e);
        }
        return null;
    }

    // (移除有問題的 restoreRememberedSessionIfNeeded 功能)

    function tryGetNicknameFromDOM(): string | null {
        const nicknameLabels = [
            '\u89d2\u8272\u66b1\u7a31', '\u89d2\u8272\u6635\u79f0', '\u89d2\u8272\u540d\u7a31', '\u89d2\u8272\u540d\u79f0',
            'Character Nickname', 'Nickname', '\u30ad\u30e3\u30e9\u30af\u30bf\u30fc\u540d', '\uce90\ub9ad\ud130 \ub2c9\ub124\uc784'
        ];

        const allElements = document.querySelectorAll('div, span, p, td, th, dt, dd, li, label');
        for (const el of allElements) {
            const text = el.textContent?.trim() || '';
            const isLabel = nicknameLabels.some(label => text === label || text.includes(label));
            if (!isLabel) continue;

            const parent = el.parentElement;
            if (!parent) continue;

            for (const child of parent.children) {
                if (child === el) continue;
                const childText = child.textContent?.trim();
                if (childText && childText.length > 0 && childText.length < 100) {
                    console.log('[WebShop Token] Found nickname value:', childText);
                    return childText;
                }
            }

            const next = el.nextElementSibling;
            const nextText = next?.textContent?.trim();
            if (nextText && nextText.length > 0 && nextText.length < 100) {
                console.log('[WebShop Token] Found nickname from next sibling:', nextText);
                return nextText;
            }
        }

        const headerElements = document.querySelectorAll('header p, header span, nav p, nav span');
        for (const el of headerElements) {
            const text = el.textContent?.trim();
            if (text && text.length > 1 && text.length < 50
                && !text.includes('EVENT') && !text.includes('WEB')
                && !text.includes('Login') && text !== 'EVENTS') {
                const parentText = el.parentElement?.textContent?.trim();
                if (parentText === text) {
                    console.log('[WebShop Token] Found nickname from header:', text);
                    return text;
                }
            }
        }

        return null;
    }

    function sendToBackground(session: CapturedWebshopSession) {
        const domNickname = window.location.pathname.includes('mypage') ? tryGetNicknameFromDOM() : null;
        const nickname = domNickname || session.nickname;
        const rememberUntil = Date.now() + REMEMBER_DAYS * 24 * 60 * 60 * 1000;

        console.log('[WebShop Token] Sending to background - nickname:', nickname, ', token length:', session.token.length);
        chrome.runtime.sendMessage({
            type: 'WEBSHOP_TOKEN_CAPTURED',
            token: session.token,
            nickname,
            fallbackNickname: session.nickname,
            storageKey: session.storageKey,
            sessionStorageRaw: session.sessionStorageRaw,
            rememberUntil
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.warn('[WebShop Token] Failed to send:', chrome.runtime.lastError.message);
            } else {
                console.log('[WebShop Token] Sent successfully:', response);
            }
        });
    }

    let captured = false;

    function attemptCapture(): boolean {
        if (captured) return true;

        const session = tryGetSessionFromStorage();
        if (session) {
            captured = true;
            chrome.storage.local.set({ webshop_sync_polling: false });
            sendToBackground(session);
            return true;
        }

        return false;
    }

    function startPolling() {
        if (attemptCapture()) return;

        let attempts = 0;
        const maxAttempts = 120;
        const interval = setInterval(() => {
            attempts++;
            if (attemptCapture() || attempts >= maxAttempts) {
                clearInterval(interval);
                if (attempts >= maxAttempts) {
                    console.log('[WebShop Token] Timed out waiting for login.');
                    chrome.storage.local.set({ webshop_sync_polling: false });
                }
            }
        }, 2000);

        window.addEventListener('storage', () => {
            attemptCapture();
        });

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

    function checkIntentAndStart() {
        // 放手讓官方機制處理，不再主動塞回舊 Token

        chrome.storage.local.get(['webshop_intent_sync', 'webshop_sync_polling'], (res) => {
            const intentSync = !!res.webshop_intent_sync;
            const syncPolling = !!res.webshop_sync_polling;

            if (intentSync) {
                // If the user wants to sync, we force clear the session storage
                // so the website requires them to perform a fresh login,
                // guaranteeing we intercept the Firebase Auth token for the new account.
                if (localStorage.getItem('session-storage')) {
                    localStorage.removeItem('session-storage');
                    window.location.reload();
                    return;
                }
                
                // Clear the sync intent flag but set/keep polling flag true
                chrome.storage.local.set({ 
                    webshop_intent_sync: false,
                    webshop_sync_polling: true
                }, () => {
                    startPolling();
                });
            } else if (syncPolling) {
                startPolling();
            } else {
                // Regular page load check
                attemptCapture();
            }
        });
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        checkIntentAndStart();
    } else {
        document.addEventListener('DOMContentLoaded', checkIntentAndStart);
    }
})();