import { SpinePlayer } from '@esotericsoftware/spine-player';
import '@esotericsoftware/spine-player/dist/spine-player.css';

// --- Global Constants & State (Moved to Top to avoid TDZ) ---
const MIN_SCALE = 0.5; // User Refined
const MAX_SCALE = 2.0; // User Refined
let isDragging = false;

// --- Player State (Moved to Top) ---
let currentPlayer: SpinePlayer | null = null;
let manualSpinner: HTMLElement | null = null;
let lockMove = false;
let lockZoom = false;
let isPhantomPlaying = false;

// --- Behavior Logic ---
function initBehaviors(container: HTMLElement) {
    console.log('[Spine Behavior] Initializing... V18.14 (Physical Resize + Pulse)');

    // Base dimensions (initially 300px, but we read from live)


    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;

    // We treat scale as a multiplier of the INITIAL Layout (300px)
    // But practically we just manipulate width/height directly now.
    // Let's keep `currentScale` for saving/compatibility.
    let currentScale = 1.0;

    // V18.25: Removed shadowed variables. 
    // They are now global (moved to bottom/top of file) so listeners share state.

    // Helper to get current pixel size


    const saveLayout = () => {
        const layout = {
            left: container.style.left,
            top: container.style.top,
            scale: currentScale
        };
        console.log('[Spine Behavior] Saving layout:', layout);
        window.postMessage({ type: 'PET_LAYOUT_UPDATE', layout: layout }, '*');
    };

    // Load & Validate
    if (container.dataset.layout) {
        try {
            console.log('[Spine Behavior] Found dataset.layout:', container.dataset.layout);
            const saved = JSON.parse(container.dataset.layout);

            // Restore Scale (via Width/Height)
            if (saved.scale) {
                currentScale = Math.max(MIN_SCALE, Math.min(saved.scale, MAX_SCALE));

                // V18.14: Apply Physical Size
                const newSize = 300 * currentScale;
                container.style.width = `${newSize}px`;
                container.style.height = `${newSize}px`;
            }
            if (saved.left) container.style.left = saved.left;
            if (saved.top) container.style.top = saved.top;
        } catch (e) { console.error('Layout parse error', e); }
    } else {
        // console.warn('[Spine Behavior] No dataset.layout found.');
    }

    // V18.23: Global Wheel Listener for Zoom
    // Solves the "Locked Move = No Zoom" paradox.
    // Even if pointer-events: none (Locked), we can catch wheel events globally 
    // and check if they happened over our area.
    window.addEventListener('wheel', (e) => {
        if (lockZoom) return;

        // Bounding Box Check
        // We need to know if the mouse is over the container.
        // Since pointer-events might be none, e.target won't be checking us.
        // We use clientX/Y.
        const rect = container.getBoundingClientRect();
        const isInside =
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom;

        if (!isInside) return;

        // If we are here, User is scrolling OVER the pet.
        // We want to Zoom the Pet and BLOCK the page scroll.
        e.preventDefault();

        const oldScale = currentScale;
        const delta = Math.sign(e.deltaY) * -0.1;
        const potentialScale = currentScale + delta;
        const newScale = Math.max(MIN_SCALE, Math.min(potentialScale, MAX_SCALE));

        if (newScale !== oldScale) {
            currentScale = newScale;

            // V18.14: Physical Resize Logic
            // Calculate pixel difference to adjust position (Center Zoom)
            const oldSize = 300 * oldScale; // approximation of current
            const newSize = 300 * newScale;
            const diff = newSize - oldSize;

            // Get current Loop State
            let currentLeft = container.style.left ? parseFloat(container.style.left) : NaN;
            let currentTop = container.style.top ? parseFloat(container.style.top) : NaN;

            // V18.62: Fix Zoom Jump - If left/top are not set (initial bottom-right), use actual offset
            if (isNaN(currentLeft)) {
                currentLeft = container.offsetLeft;
                container.style.right = 'auto';
            }
            if (isNaN(currentTop)) {
                currentTop = container.offsetTop;
                container.style.bottom = 'auto';
            }

            // Shift Left/Top by half the difference to keep center
            container.style.left = `${currentLeft - (diff / 2)}px`;
            container.style.top = `${currentTop - (diff / 2)}px`;

            // Apply Size
            container.style.width = `${newSize}px`;
            container.style.height = `${newSize}px`;

            // IMPORTANT: Remove Transform!
            container.style.transform = 'none';

            // @ts-ignore
            clearTimeout(container.zoomTimer);
            // @ts-ignore
            container.zoomTimer = setTimeout(saveLayout, 500);

            // Trigger Resolution Update immediately
            // @ts-ignore
            if (window.adjustSpineResolution) window.adjustSpineResolution();
        }
    }, { passive: false });

    container.addEventListener('mousedown', (e) => {
        if (lockMove) return;
        if (e.button !== 0) return;

        e.preventDefault();
        isDragging = false;

        if (container.style.left === 'auto' || !container.style.left) {
            container.style.left = container.offsetLeft + 'px';
            container.style.top = container.offsetTop + 'px';
            container.style.right = 'auto';
            container.style.bottom = 'auto';
        }

        startX = e.clientX;
        startY = e.clientY;
        initialLeft = container.offsetLeft;
        initialTop = container.offsetTop;

        container.style.cursor = 'grabbing';
        container.style.transition = 'none';

        const onMove = (mv: MouseEvent) => {
            const dx = mv.clientX - startX;
            const dy = mv.clientY - startY;
            if (Math.abs(dx) > 2 || Math.abs(dy) > 2) isDragging = true;

            let newLeft = initialLeft + dx;
            let newTop = initialTop + dy;

            // --- Bounds Constraint [V18.14 Physical Size] ---
            const currentW = container.offsetWidth; // This IS the physical size now
            const currentH = container.offsetHeight;
            const screenW = window.innerWidth;
            const screenH = window.innerHeight;

            const VISIBLE_BUFFER = 100;

            newLeft = Math.max(-currentW + VISIBLE_BUFFER, Math.min(screenW - VISIBLE_BUFFER, newLeft));
            newTop = Math.max(-currentH + VISIBLE_BUFFER, Math.min(screenH - VISIBLE_BUFFER, newTop));

            container.style.left = newLeft + 'px';
            container.style.top = newTop + 'px';
        };

        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            container.style.cursor = 'grab';
            container.style.transition = 'opacity 0.3s ease';
            if (isDragging) saveLayout();
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    });

    // --- Phantom Hover Logic (V18.21) ---
    // Allows animation triggers even when pointer-events: none (Locked Mode)


    window.addEventListener('mousemove', (e) => {
        // Only care if Locked (otherwise standard mouse events handle it)
        if (!lockMove) return;

        const rect = container.getBoundingClientRect();
        const isInside =
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom;

        if (isInside) {
            // V18.29: Logic Refinement - Only trigger if not currently playing a Phantom anim
            if (isPhantomPlaying) return;

            console.log('[Spine Phantom] Hover Detected (Locked & Ready)!');

            // Trigger Animation
            // @ts-ignore
            if (window.spinePlayer && window.spinePlayer.animationState) {
                isPhantomPlaying = true;

                // @ts-ignore
                const player = window.spinePlayer;
                const anims = player.animationState.data.skeletonData.animations;

                // V18.52: Filter out partial animations (face, mouth, etc)
                const validAnims = anims.filter((a: any) => {
                    const n = a.name.toLowerCase();
                    return n !== 'idle' && !n.includes('_face') && !n.includes('_mouth') && !n.includes('_eye');
                });

                if (validAnims.length > 0) {
                    const randomAnim = validAnims[Math.floor(Math.random() * validAnims.length)];
                    console.log('[Spine Phantom] Playing:', randomAnim.name);
                    const entry = player.animationState.setAnimation(0, randomAnim.name, false);
                    player.animationState.addAnimation(0, 'idle', true, 0);

                    // Listen for completion to unlock
                    entry.listener = {
                        complete: () => {
                            console.log('[Spine Phantom] Animation Complete. Unlocking.');
                            playAnimation('motion_only');
                            isPhantomPlaying = true;
                            setTimeout(() => isPhantomPlaying = false, 3000); // Simple cooldown
                        }
                    };
                } else {
                    isPhantomPlaying = false;
                }
            }
        }
    });
}

// --- Loading Logic ---
// V18.42: Added rawDataURIs parameter for cloud assets
async function loadSpine(skel: string, atlas: string, animation: string = 'idle', rawDataURIs: Record<string, string> | null = null) {
    const root = document.getElementById('pet-root');
    const container = document.getElementById('spine-widget');

    if (!root || !container) {
        console.error('[Spine Loader] Root or Widget not found');
        return;
    }

    console.log(`[Spine Loader] Loading Model: ${skel}`);

    // Dispose previous
    if (currentPlayer) {
        console.log('[Spine Loader] Disposing previous player...');
        try {
            currentPlayer.dispose();
        } catch (e) {
            console.warn('[Spine Loader] Dispose error', e);
        }
        currentPlayer = null;
        // @ts-ignore
        window.spinePlayer = null;
    }

    // Clear container content (canvas)
    while (container.firstChild) container.removeChild(container.firstChild);

    // Add Spinner
    if (manualSpinner) manualSpinner.remove();
    manualSpinner = document.createElement('div');
    Object.assign(manualSpinner.style, {
        position: 'absolute',
        top: '50%', left: '50%',
        width: '50px', height: '50px',
        marginTop: '-25px', marginLeft: '-25px',
        border: '4px solid rgba(255, 51, 102, 0.1)',
        borderTop: '4px solid #ff3366',
        borderRadius: '50%',
        zIndex: '10000',
        pointerEvents: 'none',
        animation: 'spine-custom-spin 0.8s linear infinite'
    });
    root.appendChild(manualSpinner);

    // Initialize
    try {
        // V18.42: Build config with optional rawDataURIs
        const config: any = {
            binaryUrl: skel,
            atlasUrl: atlas,
            animation: animation,
            showControls: false,
            showLoading: false,
            alpha: true,
            backgroundColor: '#00000000',
            preserveDrawingBuffer: true,
            premultipliedAlpha: false,
            success: (player: any) => {
                console.log('[Spine Loader] Success!');
                currentPlayer = player;
                // V18.57: Allow bridge to find this element for visibility toggling
                if (player.canvas) player.canvas.id = 'spine-widget';
                manualSpinner?.remove();

                // Resolution Logic
                const adjustResolution = () => {
                    const canvas = player.canvas;
                    const gl = player.context.gl;
                    if (!canvas || !gl) return;

                    const dpr = window.devicePixelRatio || 1;
                    const SUPER_SAMPLE = 1.5;
                    const rect = canvas.getBoundingClientRect();

                    if (rect.width === 0 || rect.height === 0) return;

                    const targetWidth = Math.round(rect.width * dpr * SUPER_SAMPLE);
                    const targetHeight = Math.round(rect.height * dpr * SUPER_SAMPLE);

                    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
                        canvas.width = targetWidth;
                        canvas.height = targetHeight;
                        canvas.style.width = '100%';
                        canvas.style.height = '100%';
                        gl.viewport(0, 0, canvas.width, canvas.height);
                    }
                };

                adjustResolution();

                // V18.37 FIX: Memory Leak / Lag
                // Remove previous listener if exists. 
                // We need to store it on window or a global var.
                // @ts-ignore
                if (window.currentResizeHandler) {
                    // @ts-ignore
                    window.removeEventListener('resize', window.currentResizeHandler);
                }

                const newHandler = () => requestAnimationFrame(adjustResolution);
                window.addEventListener('resize', newHandler);

                // @ts-ignore
                window.currentResizeHandler = newHandler;

                // @ts-ignore
                window.spinePlayer = player;
                // @ts-ignore
                window.adjustSpineResolution = adjustResolution;

                // Interaction
                player.canvas.addEventListener('click', () => {
                    if (isDragging) return;

                    playAnimation('motion_only');
                });

                // V18.58: Force play initial animation to prevent T-pose/freeze
                setTimeout(() => playAnimation('motion_only'), 500);
            },
            error: (_p: any, msg: any) => {
                // Suppress expected errors on blocked sites
                if (typeof msg === 'string' && (msg.includes('TrustedHTML') || msg.includes('Security Policy'))) {
                    // Silent fail
                } else {
                    // console.error('[Spine Error]', msg); 
                }
                manualSpinner?.remove();
                if (container && !container.hasChildNodes()) {
                    container.remove();
                }
            }
        };

        // Failsafe: Remove spinner if it takes too long (e.g. CSP block)
        setTimeout(() => {
            if (manualSpinner && manualSpinner.isConnected) {
                // console.warn('[Spine Loader] Loading timeout/blocked - removing spinner');
                manualSpinner.remove();
                if (container && container.innerHTML.trim() === '') {
                    container.remove();
                }
            }
        }, 3000);

        // V18.42: Add rawDataURIs if provided (for cloud assets)
        if (rawDataURIs && Object.keys(rawDataURIs).length > 0) {
            config.rawDataURIs = rawDataURIs;
            // console.log('[Spine Loader] Using rawDataURIs for textures:', Object.keys(rawDataURIs));
        }

        try {
            new SpinePlayer(container, config);
        } catch (e: any) {
            manualSpinner?.remove();
            // Suppress TrustedHTML/CSP errors
            if (e.message && (e.message.includes('TrustedHTML') || e.message.includes('Security Policy'))) {
                return;
            }
            console.warn('[Spine Loader] Init Warning');
        }
    } catch (e) {
        console.error('[Spine Loader] Init Exception', e);
        manualSpinner?.remove();
    }
}

// --- Animation Logic ---
function playAnimation(strategy: 'motion_only' | 'talk_notify' = 'motion_only') {
    // @ts-ignore
    const player = window.spinePlayer;
    if (!player || !player.animationState) return;

    // @ts-ignore
    const anims = player.animationState.data.skeletonData.animations;

    let validAnims: any[] = [];

    if (strategy === 'talk_notify') {
        // Notification Strategy: Play "Talk", "Face", "Idle_Talk" animations
        validAnims = anims.filter((a: any) => {
            const n = a.name.toLowerCase();
            return n.includes('talk') || n.includes('_face') || n.includes('_mouth') || n.includes('interaction');
        });

        // If no talk animations found, maybe try 'idle' variants that aren't the main 'idle'?. 
        // Or just fallback to any animation to ensure user sees SOMETHING.
        if (validAnims.length === 0) validAnims = anims;
    } else {
        // Motion Strategy (Click/Hover): Full Body Actions Only
        // Strict exclusion of talk, face, mouth, eye, and standard idle
        validAnims = anims.filter((a: any) => {
            const n = a.name.toLowerCase();
            return n !== 'idle' &&
                !n.includes('talk') &&
                !n.includes('_face') &&
                !n.includes('_mouth') &&
                !n.includes('_eye') &&
                !n.includes('default') &&
                !n.includes('feeling');
        });

        // V18.59: Fallback - If no specific motion animations, allow anything (like 'idle')
        // This ensures local models with only 'idle' or 'animation' don't freeze.
        if (validAnims.length === 0) validAnims = anims;
    }

    if (validAnims.length > 0) {
        const randomAnim = validAnims[Math.floor(Math.random() * validAnims.length)];
        console.log(`[Spine Anim] Strategy: ${strategy}, Playing: ${randomAnim.name}`);

        // Use track 0 for everything to ensure clean transitions (replace current)
        // For 'talk', we might ideally layer, but since some 'motion' anims are complex, 
        // simpler is better: Cut whatever is playing and play the new one.

        // However, for 'talk_notify' (often face only), if we play on Track 0, the body might freeze if the anim is face-only?
        // Spine usually defaults non-keyed bones to setup pose or previous?
        // Let's use Track 1 (Overlay) for talk_notify just in case it's a partial anim.

        const trackIndex = strategy === 'talk_notify' ? 1 : 0;

        player.animationState.setAnimation(trackIndex, randomAnim.name, false);

        if (trackIndex === 0) {
            // If main track, queue idle back
            player.animationState.addAnimation(0, 'idle', true, 0);
        } else {
            // If overlay track, just let it finish (empty)
            player.animationState.addEmptyAnimation(1, 0.5, 0);
        }
    }
}

// --- Message Listener for Model Switch ---
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'PET_MODEL_UPDATE') {
        const { skelUrl, atlasUrl, rawDataURIs } = event.data.urls;
        // V18.42: Pass rawDataURIs to loadSpine
        loadSpine(skelUrl, atlasUrl, 'idle', rawDataURIs || null);
    }

    if (event.data && event.data.type === 'PET_SETTINGS_UPDATE') {
        const settings = event.data.settings;
        const container = document.getElementById('pet-root');
        if (container) {
            // V18.55: Removed display/opacity setting here. 
            // Visibility is now fully managed by bridge.ts to allow decoupled bubble visibility.

            lockMove = settings.lockMove;
            lockZoom = settings.lockZoom;
            if (lockMove) container.classList.add('locked-move');
            else container.classList.remove('locked-move');

            // Toggle Play/Pause
            if (currentPlayer) {
                // @ts-ignore
                if (settings.show !== false) currentPlayer.play();
                // @ts-ignore
                else currentPlayer.pause();
            }
        }
    }

    // V18.53: Animation Trigger
    if (event.data && event.data.type === 'PET_PLAY_ANIMATION') {
        const strategy = event.data.strategy || 'motion_only';
        playAnimation(strategy);
    }
});

// --- Main Execution ---
(async () => {
    console.log('[Spine Loader] Initializing Official Spine Player (4.1)...');

    // 1. Setup Container
    const root = document.getElementById('pet-root');
    if (!root) return;

    // V18.61: Reuse existing container from Bridge instead of wiping
    let playerContainer = document.getElementById('spine-widget');
    if (!playerContainer) {
        playerContainer = document.createElement('div');
        playerContainer.id = 'spine-widget';
        playerContainer.style.width = '100%';
        playerContainer.style.height = '100%';
        playerContainer.style.overflow = 'hidden';
        root.appendChild(playerContainer);
    }

    // 2. Load Assets info
    const skelUrl = root.dataset.skelUrl;
    const atlasUrl = root.dataset.atlasUrl;

    // V18.42: Parse rawDataURIs from dataset if available
    let rawDataURIs: Record<string, string> | null = null;
    if (root.dataset.rawDataURIs) {
        try {
            rawDataURIs = JSON.parse(root.dataset.rawDataURIs);
            // console.log('[Spine Loader] Found rawDataURIs');
        } catch (e) {
            console.warn('[Spine Loader] Failed to parse rawDataURIs', e);
        }
    }

    if (!skelUrl || !atlasUrl) {
        console.error('[Spine Loader] Missing URLs');
        return;
    }

    // --- Behaviors ---
    initBehaviors(root);

    // --- Initial Load ---
    loadSpine(skelUrl, atlasUrl, 'idle', rawDataURIs);

})();
