import coreRaw from './live2dcubismcore.min.js?raw';

// This function guarantees that the core library is evaluated in the context
// where 'window' is accessible and 'Live2DCubismCore' becomes a property of it.
export function loadLive2DCore() {
    console.log('[Live2D Loader] Initializing Core...');

    // Check if already loaded
    if ((window as any).Live2DCubismCore) {
        console.log('[Live2D Loader] Core already present.');
        return;
    }

    try {
        // We wrap the code in a function that takes 'window' as an argument
        // and also attempts to assign to 'this' (which we bind to window).
        // The core library defines 'var Live2DCubismCore = ...'
        // We append an explicit assignment line.
        const patchedCode = coreRaw + '\n;window.Live2DCubismCore = Live2DCubismCore;';

        // Execute normally in global scope if possible, or use Function constructor
        // Manifest V3 'unsafe-eval' allows new Function()
        const setupCore = new Function(patchedCode);

        // Run it!
        setupCore.call(window);

        if ((window as any).Live2DCubismCore) {
            console.log('[Live2D Loader] SUCCESS: Live2DCubismCore attached to window.');
            console.log('[Live2D Loader] Version:', (window as any).Live2DCubismCore.Version.csmGetVersion());
        } else {
            console.error('[Live2D Loader] FAILURE: Core ran but Live2DCubismCore is missing from window.');
        }
    } catch (e) {
        console.error('[Live2D Loader] CRITICAL ERROR executing core:', e);
    }
}
