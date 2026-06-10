(function () {
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
})();
