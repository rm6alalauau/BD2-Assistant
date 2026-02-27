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
let currentScale = 1.0;

// --- Behavior Logic ---
function initBehaviors(container: HTMLElement) {
    ((..._a: any[]) => { })('[Spine Behavior] Initializing... V18.14 (Physical Resize + Pulse)');

    // Base dimensions (initially 300px, but we read from live)


    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;

    // We treat scale as a multiplier of the INITIAL Layout (300px)
    // But practically we just manipulate width/height directly now.
    // Let's keep `currentScale` for saving/compatibility.
    // Moved currentScale to global state

    // V18.25: Removed shadowed variables. 
    // They are now global (moved to bottom/top of file) so listeners share state.

    // Helper to get current pixel size


    const saveLayout = () => {
        const layout = {
            left: container.style.left,
            top: container.style.top,
            scale: currentScale
        };
        ((..._a: any[]) => { })('[Spine Behavior] Saving layout:', layout);
        window.postMessage({ type: 'PET_LAYOUT_UPDATE', layout: layout }, '*');
    };

    // Load & Validate
    if (container.dataset.layout) {
        try {
            ((..._a: any[]) => { })('[Spine Behavior] Found dataset.layout:', container.dataset.layout);
            const saved = JSON.parse(container.dataset.layout);

            // Restore Scale (via Width/Height)
            if (saved.scale) {
                const isLocalModel = container.dataset.currentModel?.startsWith('local_');
                const minScale = isLocalModel ? 0.05 : MIN_SCALE;
                const maxScale = isLocalModel ? 10.0 : MAX_SCALE;
                currentScale = Math.max(minScale, Math.min(saved.scale, maxScale));

                // V18.14: Apply Physical Size
                const newSize = 300 * currentScale;
                container.style.width = `${newSize}px`;
                container.style.height = `${newSize}px`;
            }
            if (saved.left) container.style.left = saved.left;
            if (saved.top) container.style.top = saved.top;
        } catch (e) { console.error('Layout parse error', e); }
    } else {
        // ((..._a:any[])=>{})('[Spine Behavior] No dataset.layout found.');
    }

    // V18.23: Global Wheel Listener for Zoom
    // Solves the "Locked Move = No Zoom" paradox.
    // Even if pointer-events: none (Locked), we can catch wheel events globally 
    // and check if they happened over our area.
    
    // Prevent stacking listeners
    // @ts-ignore
    if (window.currentSpineWheelHandler) {
        // @ts-ignore
        window.removeEventListener('wheel', window.currentSpineWheelHandler);
    }

    const wheelHandler = (e: WheelEvent) => {
        if (lockZoom) return;

        // V19.3: Skip if container is hidden (showPet = false or not loaded yet)
        const containerStyle = window.getComputedStyle(container);
        if (containerStyle.display === 'none' || containerStyle.opacity === '0' || containerStyle.pointerEvents === 'none') {
            return; // Don't block page scroll when pet is hidden
        }

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
        
        const isLocalModel = container.dataset.currentModel?.startsWith('local_');
        const minScale = isLocalModel ? 0.05 : MIN_SCALE;
        const maxScale = isLocalModel ? 10.0 : MAX_SCALE;
        const newScale = Math.max(minScale, Math.min(potentialScale, maxScale));

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
    };
    window.addEventListener('wheel', wheelHandler, { passive: false });
    // @ts-ignore
    window.currentSpineWheelHandler = wheelHandler;

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

            void 0; // Phantom hover detected

            // Trigger Animation
            // @ts-ignore
            if (window.spinePlayer && window.spinePlayer.animationState) {
                isPhantomPlaying = true;

                try {
                    // @ts-ignore
                    const player = window.spinePlayer;
                    const anims = player.animationState.data.skeletonData.animations;

                    // V18.52: Filter out partial animations (face, mouth, etc) — same as playAnimation
                    let validAnims = anims.filter((a: any) => {
                        const n = a.name.toLowerCase();
                        return n !== 'idle' &&
                            !n.includes('talk') &&
                            !n.includes('_face') &&
                            !n.includes('_mouth') &&
                            !n.includes('_eye') &&
                            !n.includes('default') &&
                            !n.includes('feeling');
                    });

                    // Fallback: if no motion anims, use any animation
                    if (validAnims.length === 0) validAnims = anims;

                    if (validAnims.length > 0) {
                        const randomAnim = validAnims[Math.floor(Math.random() * validAnims.length)];
                        const entry = player.animationState.setAnimation(0, randomAnim.name, false);

                        // Smart base animation detection (don't hardcode 'idle')
                        let baseAnim = player.config?.animation;
                        if (!baseAnim) {
                            const idleAnim = anims.find((a: any) => a.name.toLowerCase() === 'idle' || a.name.toLowerCase() === 'animation');
                            baseAnim = idleAnim ? idleAnim.name : anims[0]?.name;
                        }
                        if (baseAnim) {
                            player.animationState.addAnimation(0, baseAnim, true, 0);
                        }

                        // Listen for completion to unlock
                        entry.listener = {
                            complete: () => {
                                isPhantomPlaying = true;
                                setTimeout(() => isPhantomPlaying = false, 3000); // Simple cooldown
                            }
                        };
                    } else {
                        isPhantomPlaying = false;
                    }
                } catch (e) {
                    console.warn('[Spine Phantom] Animation error, resetting state', e);
                    isPhantomPlaying = false;
                }
            }
        }
    });
}



// --- Loading Logic ---

// V18.42: Added rawDataURIs parameter for cloud assets
async function loadSpine(
    skel: string, 
    atlas: string, 
    animation: string = 'idle', 
    rawDataURIs: Record<string, string> | null = null, 
    isJsonSkel: boolean = false, 
    atlasText: string | null = null, 
    isLocal: boolean = false,
    skin: string | null = null
) {
    const root = document.getElementById('pet-root');
    const container = document.getElementById('spine-widget');

    if (!root || !container) {
        console.error('[Spine Loader] Root or Widget not found');
        return;
    }

    console.log('[DEBUG] loadSpine called:', { skel, atlas, animation, isJsonSkel, atlasText: atlasText ? 'present' : 'null', rawDataURIs: rawDataURIs ? Object.keys(rawDataURIs) : 'null' });

    // Dispose previous
    if (currentPlayer) {
        ((..._a: any[]) => { })('[Spine Loader] Disposing previous player...');
        try {
            currentPlayer.dispose();
        } catch (e) {
            ((..._a: any[]) => { })('[Spine Loader] Dispose error', e);
        }
        currentPlayer = null;
        // @ts-ignore
        window.spinePlayer = null;
    }

    // V20.13: Prevent WebGL Context Leak on Constructor Crash
    // If a previous model crashed midway, currentPlayer is null, but canvas/WebGL context might exist
    const canvases = container.getElementsByTagName('canvas');
    for (let i = 0; i < canvases.length; i++) {
        const gl = canvases[i].getContext('webgl') || canvases[i].getContext('webgl2');
        if (gl) {
            const ext = gl.getExtension('WEBGL_lose_context');
            if (ext) ext.loseContext();
        }
    }

    // Clear container content (canvas)
    while (container.firstChild) container.removeChild(container.firstChild);

    // V20.13: Hide the container initially for local models to prevent T-pose flash during load
    if (isLocal) {
        container.style.transition = 'opacity 0.15s ease-in-out';
        container.style.opacity = '0';
    } else {
        container.style.transition = 'none';
        container.style.opacity = '1';
    }

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
        const initAnim = animation;

        // V18.42: Build config with optional rawDataURIs
        // When atlasText is provided, use Blob URL for atlas to bypass atob() UTF-8 corruption
        let finalAtlasUrl = atlas;
        let finalSkelUrl = skel;
        let finalRawDataURIs = rawDataURIs;

        if (atlasText && rawDataURIs) {
            // CSP-safe approach: Use data URIs for everything (no blob: URLs needed)
            finalAtlasUrl = 'model.atlas';
            finalSkelUrl = isJsonSkel ? 'model.json' : 'model.skel';

            // Remap rawDataURIs: strip MIME types so there are NO dots (.) in the data URI prefix.
            // SpinePlayer's loadTexture checks rawDataUris and sets image.src directly.
            // Stripping MIME (e.g. "data:image/png;base64,..." → "data:;base64,...") removes dots
            // so the browser can still decode the image correctly.
            // For binary data (skel), atob() returns raw bytes which is correct.
            const remapped: Record<string, string> = {};
            for (const [key, value] of Object.entries(rawDataURIs)) {
                remapped[key] = value.replace(/^data:.*?base64,/, 'data:;base64,');
            }

            // Atlas text: use NON-base64 data URI to preserve UTF-8 (Korean 레이어 etc.)
            // SpinePlayer's dataUriToString for non-base64: returns dataUri.substr(dataUri.indexOf(",") + 1)
            // This returns the raw text as-is — no atob() corruption of multi-byte chars.
            // downloadText() checks rawDataUris[url] inline, NO XHR, NO CSP issue.
            remapped[finalAtlasUrl] = `data:,${atlasText}`;

            finalRawDataURIs = remapped;
            console.log('[DEBUG] R2 remapping applied. Keys:', Object.keys(remapped));
        }

        const config: any = {
            atlasUrl: finalAtlasUrl,
            showControls: false,
            showLoading: false,
            alpha: true,
            backgroundColor: '#00000000',
            preserveDrawingBuffer: true,
            premultipliedAlpha: false,
        };

        // V20.10: For models without animation config (or dynamically requested via localAnimation)
        // If initAnim is provided, use it to ensure the SpinePlayer initializes correctly.
        // HOWEVER, for local models, an invalid config.animation will completely halt the 
        // SpinePlayer and never fire the success callback. Thus, we MUST leave it blank 
        // for local models and handle the initial animation ENTIRELY in the success callback.
        if (initAnim && !isLocal) {
            config.animation = initAnim;
        }

        if (isJsonSkel) {
            config.jsonUrl = finalSkelUrl;
        } else {
            config.binaryUrl = finalSkelUrl;
        }

        config.success = (player: any) => {
            console.log('[DEBUG] SpinePlayer SUCCESS callback fired!');
            currentPlayer = player;

            let animNames: string[] = [];
            let skinNames: string[] = [];

            // Extract Skins
            if (player.skeleton?.data?.skins) {
                skinNames = player.skeleton.data.skins.map((s: any) => s.name);
            }

            // Extract Animations
            if (player.animationState?.data?.skeletonData?.animations) {
                animNames = player.animationState.data.skeletonData.animations.map((a: any) => a.name);
            }

            // Broadcast available animations and skins to bridge -> popup
            window.parent.postMessage({ type: 'PET_ANIMATIONS_LIST', animations: animNames, skins: skinNames }, '*');

            // Apply Skin
            if (skinNames.length > 0) {
                const targetSkin = (skin && skinNames.includes(skin)) ? skin : (skinNames.includes('default') ? 'default' : skinNames[0]);
                try {
                    player.skeleton.setSkinByName(targetSkin);
                    player.skeleton.setToSetupPose();
                } catch (e) {
                    console.warn('[Spine Loader] Failed to set initial skin:', e);
                }
            }

            // Apply Animation
            if (animNames.length > 0) {
                // V20.10: For models without animation config (or dynamically requested via localAnimation)
                // If initAnim is provided (e.g., localAnimation restores a saved state), use it.
                // Otherwise, automatically fallback to idle or first available.
                const targetAnim = (initAnim && animNames.includes(initAnim)) 
                    ? initAnim 
                    : (animNames.includes('idle') ? 'idle' : animNames[0]);

                // Clear any error flag that would block drawFrame rendering
                // @ts-ignore
                player.error = null;
                
                // V20.10: For local models, use animationState.setAnimation directly without recalculating viewport
                // This prevents custom models with huge transparent bounds from scaling wildly on animation change.
                if (isLocal) {
                    player.animationState.setAnimation(0, targetAnim, true);
                    // Force a single viewport calculation on the default setup pose to get a stable bounds
                    // V20.14: Use 'setup' (or the first consistent anim) so that resizing across tabs is mathematically identical 
                    // regardless of what targetAnim is currently playing on page reload.
                    try {
                        player.setViewport('setup');
                    } catch (e) {
                        player.setViewport(animNames.includes('idle') ? 'idle' : animNames[0]);
                    }
                } else {
                    player.setAnimation(targetAnim, true);
                }
                player.play();
            }

            // V20.13: Restore visibility for local models after initial animation is set
            if (isLocal && container) {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        container.style.opacity = '1';
                    });
                });
            }

            // V18.57: Allow bridge to find this element for visibility toggling
            if (player.canvas) player.canvas.id = 'spine-widget';
            manualSpinner?.remove();

            // DEBUG: Check player state after success
            setTimeout(() => {
                console.log('[DEBUG] Post-success player state:', {
                    error: player.error,
                    paused: player.paused,
                    hasCurrentViewport: !!player.currentViewport,
                    currentViewport: player.currentViewport,
                    canvasWidth: player.canvas?.width,
                    canvasHeight: player.canvas?.height,
                    canvasDisplay: player.canvas?.style?.display,
                    canvasParent: player.canvas?.parentElement?.id,
                    canvasParentDisplay: player.canvas?.parentElement?.style?.display,
                    rootDisplay: document.getElementById('pet-root')?.style?.display,
                    rootVisibility: document.getElementById('pet-root')?.style?.visibility,
                    rootOpacity: document.getElementById('pet-root')?.style?.opacity,
                    currentTrack: player.animationState?.getCurrent(0)?.animation?.name
                });
            }, 500);

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
        };

        config.error = (_p: any, msg: any) => {
            if (container) container.style.opacity = '1'; // Restore opacity on error
            // Suppress expected errors on blocked sites
            if (typeof msg === 'string' && (msg.includes('TrustedHTML') || msg.includes('Security Policy'))) {
                // Silent fail
            } else if (typeof msg === 'string' && msg.includes('Animation does not exist')) {
                // V20.7: Don't remove container for missing animation errors (local models may not have 'idle')
                console.warn('[Spine Loader] Animation not found, will use fallback in success callback');
                manualSpinner?.remove();
            } else {
                console.error('[Spine Error]', msg);
                manualSpinner?.remove();
                if (container && !container.hasChildNodes()) {
                    container.remove();
                }
            }
        };

        // Failsafe: Remove spinner if it takes too long (e.g. CSP block)
        setTimeout(() => {
            if (container) container.style.opacity = '1';
            if (manualSpinner && manualSpinner.isConnected) {
                // ((..._a:any[])=>{})('[Spine Loader] Loading timeout/blocked - removing spinner');
                manualSpinner.remove();
                if (container && container.innerHTML.trim() === '') {
                    container.remove();
                }
            }
        }, 3000);

        // V18.42: Add rawDataURIs if provided (for cloud assets)
        if (finalRawDataURIs && Object.keys(finalRawDataURIs).length > 0) {
            config.rawDataURIs = finalRawDataURIs;
            console.log('[DEBUG] rawDataURIs added to config. Keys:', Object.keys(finalRawDataURIs));
        } else {
            console.log('[DEBUG] No rawDataURIs for config');
        }

        console.log('[DEBUG] Final SpinePlayer config:', { atlasUrl: config.atlasUrl, binaryUrl: config.binaryUrl, jsonUrl: config.jsonUrl, animation: config.animation, hasRawDataURIs: !!config.rawDataURIs });

        try {
            new SpinePlayer(container, config);
        } catch (e: any) {
            if (container) container.style.opacity = '1'; // Restore opacity on constructor crash
            manualSpinner?.remove();
            // Suppress TrustedHTML/CSP errors
            if (e.message && (e.message.includes('TrustedHTML') || e.message.includes('Security Policy'))) {
                return;
            }
            ((..._a: any[]) => { })('[Spine Loader] Init Warning');
        }
    } catch (e) {
        if (container) container.style.opacity = '1'; // Restore opacity
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

    // V20.10: For local models, clicking just restarts the currently selected animation instead of picking a random "motion".
    // This prevents the issue where local models with different visual states (skins mapped to animations) cycle incorrectly.
    const isLocalModel = document.getElementById('pet-root')?.dataset.currentModel?.startsWith('local_');
    if (isLocalModel) {
        const currentAnim = player.animationState?.getCurrent(0)?.animation?.name;
        if (currentAnim) {
            player.animationState.setAnimation(0, currentAnim, false);
            player.animationState.addAnimation(0, currentAnim, true, 0);
        }
        return;
    }

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
        ((..._a: any[]) => { })(`[Spine Anim]Strategy: ${strategy}, Playing: ${randomAnim.name} `);

        // Use track 0 for everything to ensure clean transitions (replace current)
        // For 'talk', we might ideally layer, but since some 'motion' anims are complex, 
        // simpler is better: Cut whatever is playing and play the new one.

        // However, for 'talk_notify' (often face only), if we play on Track 0, the body might freeze if the anim is face-only?
        // Spine usually defaults non-keyed bones to setup pose or previous?
        // Let's use Track 1 (Overlay) for talk_notify just in case it's a partial anim.

        const trackIndex = strategy === 'talk_notify' ? 1 : 0;

        player.animationState.setAnimation(trackIndex, randomAnim.name, false);

        if (trackIndex === 0) {
            // Then add base anim so they don't freeze after motion is done.
            // Get the initial animation for fallback. Local models might have `player.config.animation` undefined.
            let baseAnim = player.config?.animation;
            if (!baseAnim) {
                const allAnims = player.animationState.data.skeletonData.animations;
                if (allAnims && allAnims.length > 0) {
                    const idleAnim = allAnims.find((a: any) => a.name.toLowerCase() === 'idle' || a.name.toLowerCase() === 'animation');
                    baseAnim = idleAnim ? idleAnim.name : allAnims[0].name;
                }
            }
            // V20.10: If the randomly chosen animation IS the base animation (e.g. skin cycling),
            // don't queue the base animation again, just let it loop or stay.
            if (baseAnim && baseAnim !== randomAnim.name) {
                player.animationState.addAnimation(trackIndex, baseAnim, true, 0);
            } else if (baseAnim === randomAnim.name) {
                // Keep it looping if it's the base
                player.animationState.setAnimation(trackIndex, randomAnim.name, true);
            }
        } else {
            // If overlay track, just let it finish (empty)
            player.animationState.addEmptyAnimation(1, 0.5, 0);
        }
    }
}

// --- Message Listener for Model Switch ---
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'PET_MODEL_UPDATE') {
        const { skelUrl, atlasUrl, rawDataURIs, isJsonSkel, atlasText, isLocal, localAnimation, localSkin } = event.data.urls;
        console.log('[DEBUG] PET_MODEL_UPDATE received:', { skelUrl, atlasUrl, isJsonSkel, isLocal, localAnimation, localSkin, atlasText: atlasText ? 'present' : 'null', rawDataURIs: rawDataURIs ? Object.keys(rawDataURIs) : 'null' });
        
        // V20.12: Clamp scale when switching from a custom local model back to an official model
        if (!isLocal) {
            let clamped = false;
            if (currentScale > MAX_SCALE) {
                currentScale = MAX_SCALE;
                clamped = true;
            } else if (currentScale < MIN_SCALE) {
                currentScale = MIN_SCALE;
                clamped = true;
            }
            if (clamped) {
                const container = document.getElementById('pet-root');
                if (container) {
                    const newSize = 300 * currentScale;
                    container.style.width = `${newSize}px`;
                    container.style.height = `${newSize}px`;
                    // Trigger resize logic
                    // @ts-ignore
                    if (window.adjustSpineResolution) window.adjustSpineResolution();
                }
            }
        }

        // V20.10: For local models, pass localAnimation as initAnim, fallback to empty
        const anim = isLocal ? (localAnimation || '') : 'idle';
        loadSpine(skelUrl, atlasUrl, anim, rawDataURIs || null, isJsonSkel || false, atlasText || null, isLocal || false, isLocal ? (localSkin || null) : null);
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

    if (event.data && event.data.type === 'PET_SET_ANIMATION' && currentPlayer && currentPlayer.animationState) {
        try {
            const animName = event.data.animation;
            const anims = currentPlayer.animationState.data.skeletonData.animations;
            const match = anims.find((a: any) => a.name === animName);
            if (match) {
                // Clear any error flag
                // @ts-ignore
                if (currentPlayer.error) currentPlayer.error = null;

                const isLocalModel = document.getElementById('pet-root')?.dataset.currentModel?.startsWith('local_');

                if (isLocalModel) {
                    // For local custom models, avoid recalculating the viewport on every animation switch
                    // because custom boundings might differ wildly and cause the model to jump or shrink.
                    currentPlayer.animationState.setAnimation(0, animName, true);
                } else {
                    // MUST use currentPlayer.setAnimation, NOT animationState.setAnimation
                    // because setAnimation recalculates the viewport. Otherwise, changing from
                    // idle to another animation might break the bounds and disappear.
                    currentPlayer.setAnimation(animName, true);
                }
                
                currentPlayer.play();
            } else {
                 console.warn(`[Spine Loader] Animation ${animName} not found in skeleton`);
            }
        } catch (e) {
            console.warn('[Spine Loader] Failed to manually set animation:', e);
        }
    }

    if (event.data && event.data.type === 'PET_RESET_LAYOUT') {
        const container = document.getElementById('pet-root');
        if (container) {
            // Reset state
            currentScale = 1.0;
            container.style.width = '300px';
            container.style.height = '300px';
            container.style.left = '';
            container.style.top = '';
            container.style.right = '20px';
            container.style.bottom = '20px';
            container.style.transform = 'none';
            // @ts-ignore
            if (window.adjustSpineResolution) window.adjustSpineResolution();
        }
    }
});

// --- Main Execution ---
(async () => {
    ((..._a: any[]) => { })('[Spine Loader] Initializing Official Spine Player (4.1)...');

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
        } catch (e) {
            ((..._a: any[]) => { })('[Spine Loader] Failed to parse rawDataURIs', e);
        }
    }
    const atlasText = root.dataset.atlasText || null;

    if (!skelUrl || !atlasUrl) {
        console.error('[Spine Loader] Missing URLs');
        return;
    }

    // --- Behaviors ---
    initBehaviors(root);

    // --- Initial Load ---
    const isJsonSkel = root.dataset.isJsonSkel === 'true';
    const isLocal = root.dataset.currentModel?.startsWith('local_') || false;
    const localAnimation = root.dataset.localAnimation || '';
    const anim = isLocal ? localAnimation : 'idle';
    
    loadSpine(skelUrl, atlasUrl, anim, rawDataURIs, isJsonSkel, atlasText, isLocal);

})();
