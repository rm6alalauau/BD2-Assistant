import type { BreathParameter, InternalModel, ModelSettings, MotionPriority } from "@/cubism-common";
import type { MotionManagerOptions } from "@/cubism-common/MotionManager";
import type { Live2DFactoryOptions } from "@/factory/Live2DFactory";
import { Live2DFactory } from "@/factory/Live2DFactory";
import type { Renderer, Texture, Ticker, WebGLRenderer } from "pixi.js";
import { Assets, Matrix, ObservablePoint, Point, Container, Rectangle } from "pixi.js";
import { Automator, type AutomatorOptions } from "./Automator";
import { Live2DTransform } from "./Live2DTransform";
import type { JSONObject } from "./types/helpers";
import { logger, AudioAnalyzer } from "./utils";

export type Live2DModelTransitionEasingName =
    | "linear"
    | "easeInQuad"
    | "easeOutQuad"
    | "easeInOutQuad"
    | "easeInCubic"
    | "easeOutCubic";

export type Live2DModelTransitionEasing =
    | Live2DModelTransitionEasingName
    | ((progress: number) => number);

export interface Live2DModelTransitionScale {
    x?: number;
    y?: number;
}

/**
 * Visual properties supported by transitions.
 */
export interface Live2DModelTransitionState {
    alpha?: number;
    x?: number;
    y?: number;
    rotation?: number;
    scale?: number | Live2DModelTransitionScale;
}

export interface Live2DModelTransitionOptions {
    /**
     * Transition duration in milliseconds.
     * @default 500
     */
    duration?: number;

    /**
     * Delay before the transition starts in milliseconds.
     * @default 0
     */
    delay?: number;

    /**
     * Easing function or preset name.
     * @default "linear"
     */
    easing?: Live2DModelTransitionEasing;
}

export interface Live2DModelTransitionDefinition extends Live2DModelTransitionOptions {
    /**
     * Properties to apply at the beginning of the transition.
     */
    from?: Live2DModelTransitionState;

    /**
     * Properties to apply at the end of the transition.
     */
    to?: Live2DModelTransitionState;
}

export type Live2DModelTransitionToOptions = Omit<Live2DModelTransitionDefinition, "to">;

export type Live2DModelParameterValues = Record<string, number>;

export interface Live2DModelParameterTransitionOptions extends Live2DModelTransitionOptions {}

export interface Live2DModelParameterTransitionDefinition extends Live2DModelParameterTransitionOptions {
    /**
     * Parameter values to apply at the beginning of the transition.
     */
    from?: Live2DModelParameterValues;

    /**
     * Parameter values to apply at the end of the transition.
     */
    to?: Live2DModelParameterValues;
}

export type Live2DModelBreathParameter = BreathParameter;

export interface Live2DModelWind {
    x: number;
    y: number;
}

export interface Live2DModelWindTransitionOptions extends Live2DModelTransitionOptions {}

export interface Live2DModelWindTransitionDefinition extends Live2DModelWindTransitionOptions {
    /**
     * Wind values to apply at the beginning of the transition.
     */
    from?: Live2DModelWind;

    /**
     * Wind values to apply at the end of the transition.
     */
    to?: Live2DModelWind;
}

export interface Live2DModelFocusTransitionOptions extends Live2DModelTransitionOptions {
    /**
     * Apply the target instantly when no transition options are provided.
     * @default false
     */
    instant?: boolean;
}

export interface Live2DModelTransitionPresets {
    /**
     * Preset used by {@link Live2DModel.appear}.
     */
    appear?: Live2DModelTransitionDefinition;

    /**
     * Preset used by {@link Live2DModel.disappear}.
     */
    disappear?: Live2DModelTransitionDefinition;
}

export type Live2DModelAutoTransitionTrigger = "ready" | "load" | "added";

export interface Live2DModelOptions extends MotionManagerOptions, AutomatorOptions {
    /**
     * Transition presets for built-in appearance helpers.
     */
    transitions?: Live2DModelTransitionPresets;

    /**
     * Automatically play the appear transition on a lifecycle trigger.
     * @default false
     */
    autoTransition?: Live2DModelAutoTransitionTrigger | boolean;
}

/**
 * Interface for WebGL context with PixiJS UID extension
 */
interface WebGLContextWithUID extends WebGL2RenderingContext {
    _pixiContextUID?: number;
}

interface Live2DCoreModelAccessors {
    getParameterValueById?: (parameterId: string) => number;
    setParameterValueById?: (parameterId: string, value: number) => void;
    getParamFloat?: (parameterId: string) => number;
    setParamFloat?: (parameterId: string, value: number) => void;
}

interface Live2DModelWindOptions {
    wind: Live2DModelWind;
}

interface Live2DModelWindPhysics {
    getOption?: () => Live2DModelWindOptions;
    setOptions?: (options: Live2DModelWindOptions) => void;
}

const tempPoint = new Point();
const tempMatrix = new Matrix();

type Live2DModelTransitionEasingFunction = (progress: number) => number;

interface Live2DModelTransitionStateValues {
    alpha?: number;
    x?: number;
    y?: number;
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
}

interface Live2DModelTransitionSnapshot {
    alpha: number;
    x: number;
    y: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
}

interface Live2DModelTransitionValue {
    from: number;
    to: number;
}

interface Live2DModelTransitionValues {
    alpha?: Live2DModelTransitionValue;
    x?: Live2DModelTransitionValue;
    y?: Live2DModelTransitionValue;
    rotation?: Live2DModelTransitionValue;
    scaleX?: Live2DModelTransitionValue;
    scaleY?: Live2DModelTransitionValue;
}

interface Live2DModelActiveTransition {
    elapsed: number;
    delay: number;
    duration: number;
    easing: Live2DModelTransitionEasingFunction;
    values: Live2DModelTransitionValues;
    resolve: () => void;
}

type Live2DModelParameterTransitionValues = Record<string, Live2DModelTransitionValue>;

interface Live2DModelActiveParameterTransition {
    elapsed: number;
    delay: number;
    duration: number;
    easing: Live2DModelTransitionEasingFunction;
    values: Live2DModelParameterTransitionValues;
    resolve: () => void;
}

interface Live2DModelActiveFocusTransition {
    elapsed: number;
    delay: number;
    duration: number;
    easing: Live2DModelTransitionEasingFunction;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    resolve: () => void;
}

interface Live2DModelActiveWindTransition {
    elapsed: number;
    delay: number;
    duration: number;
    easing: Live2DModelTransitionEasingFunction;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    resolve: () => void;
}

const DEFAULT_TRANSITION_DURATION = 500;
const DEFAULT_TRANSITION_DELAY = 0;
const DEFAULT_APPEAR_TRANSITION: Live2DModelTransitionDefinition = {
    duration: 500,
    easing: "easeOutQuad",
    from: { alpha: 0 },
};
const DEFAULT_DISAPPEAR_TRANSITION: Live2DModelTransitionDefinition = {
    duration: 300,
    easing: "easeInQuad",
    to: { alpha: 0 },
};
const CUBISM4_EYE_PARAM_IDS = {
    leftOpen: "ParamEyeLOpen",
    rightOpen: "ParamEyeROpen",
    ballX: "ParamEyeBallX",
    ballY: "ParamEyeBallY",
};
const CUBISM2_EYE_PARAM_IDS = {
    leftOpen: "PARAM_EYE_L_OPEN",
    rightOpen: "PARAM_EYE_R_OPEN",
    ballX: "PARAM_EYE_BALL_X",
    ballY: "PARAM_EYE_BALL_Y",
};

const easingPresets: Record<Live2DModelTransitionEasingName, Live2DModelTransitionEasingFunction> =
    {
        linear: (progress) => progress,
        easeInQuad: (progress) => progress * progress,
        easeOutQuad: (progress) => progress * (2 - progress),
        easeInOutQuad: (progress) =>
            progress < 0.5
                ? 2 * progress * progress
                : -1 + (4 - 2 * progress) * progress,
        easeInCubic: (progress) => progress * progress * progress,
        easeOutCubic: (progress) => 1 - (1 - progress) ** 3,
    };

function resolveEasing(
    easing: Live2DModelTransitionEasing | undefined,
): Live2DModelTransitionEasingFunction {
    if (!easing) {
        return easingPresets.linear;
    }

    if (typeof easing === "function") {
        return easing;
    }

    return easingPresets[easing] ?? easingPresets.linear;
}

function mergeTransitionDefinition(
    base: Live2DModelTransitionDefinition | undefined,
    override: Live2DModelTransitionDefinition | undefined,
): Live2DModelTransitionDefinition {
    const merged: Live2DModelTransitionDefinition = { ...base, ...override };

    if (base?.from || override?.from) {
        merged.from = { ...base?.from, ...override?.from };
    }

    if (base?.to || override?.to) {
        merged.to = { ...base?.to, ...override?.to };
    }

    return merged;
}

function normalizeTransitionState(
    state: Live2DModelTransitionState | undefined,
): Live2DModelTransitionStateValues {
    if (!state) {
        return {};
    }

    const normalized: Live2DModelTransitionStateValues = {
        alpha: state.alpha,
        x: state.x,
        y: state.y,
        rotation: state.rotation,
    };

    if (state.scale !== undefined) {
        if (typeof state.scale === "number") {
            normalized.scaleX = state.scale;
            normalized.scaleY = state.scale;
        } else {
            if (state.scale.x !== undefined) {
                normalized.scaleX = state.scale.x;
            }
            if (state.scale.y !== undefined) {
                normalized.scaleY = state.scale.y;
            }
        }
    }

    return normalized;
}

function buildTransitionValues(
    current: Live2DModelTransitionSnapshot,
    from: Live2DModelTransitionStateValues,
    to: Live2DModelTransitionStateValues,
): Live2DModelTransitionValues {
    const values: Live2DModelTransitionValues = {};

    if (from.alpha !== undefined || to.alpha !== undefined) {
        values.alpha = {
            from: from.alpha ?? current.alpha,
            to: to.alpha ?? current.alpha,
        };
    }
    if (from.x !== undefined || to.x !== undefined) {
        values.x = {
            from: from.x ?? current.x,
            to: to.x ?? current.x,
        };
    }
    if (from.y !== undefined || to.y !== undefined) {
        values.y = {
            from: from.y ?? current.y,
            to: to.y ?? current.y,
        };
    }
    if (from.rotation !== undefined || to.rotation !== undefined) {
        values.rotation = {
            from: from.rotation ?? current.rotation,
            to: to.rotation ?? current.rotation,
        };
    }
    if (from.scaleX !== undefined || to.scaleX !== undefined) {
        values.scaleX = {
            from: from.scaleX ?? current.scaleX,
            to: to.scaleX ?? current.scaleX,
        };
    }
    if (from.scaleY !== undefined || to.scaleY !== undefined) {
        values.scaleY = {
            from: from.scaleY ?? current.scaleY,
            to: to.scaleY ?? current.scaleY,
        };
    }

    return values;
}

function buildParameterTransitionValues(
    current: Record<string, number | undefined>,
    from: Live2DModelParameterValues | undefined,
    to: Live2DModelParameterValues | undefined,
): Live2DModelParameterTransitionValues {
    const values: Live2DModelParameterTransitionValues = {};
    const keys = new Set<string>();

    for (const key of Object.keys(from ?? {})) {
        keys.add(key);
    }
    for (const key of Object.keys(to ?? {})) {
        keys.add(key);
    }

    for (const key of keys) {
        const currentValue = current[key];
        const fromValue = from?.[key] ?? currentValue;
        const toValue = to?.[key] ?? currentValue;

        if (fromValue === undefined || toValue === undefined) {
            continue;
        }

        values[key] = { from: fromValue, to: toValue };
    }

    return values;
}

function lerp(from: number, to: number, progress: number): number {
    return from + (to - from) * progress;
}

export type Live2DConstructor = { new (options?: Live2DModelOptions): Live2DModel };

/**
 * A wrapper that allows the Live2D model to be used as a DisplayObject in PixiJS.
 *
 * ```js
 * const model = await Live2DModel.from('shizuku.model.json');
 * container.add(model);
 * ```
 * @emits {@link Live2DModelEvents}
 */
export class Live2DModel<IM extends InternalModel = InternalModel> extends Container {
    /**
     * Creates a Live2DModel from given source.
     * @param source - Can be one of: settings file URL, settings JSON object, ModelSettings instance.
     * @param options - Options for the creation.
     * @return Promise that resolves with the Live2DModel.
     */
    static from<M extends Live2DConstructor = typeof Live2DModel>(
        this: M,
        source: string | JSONObject | ModelSettings,
        options?: Live2DFactoryOptions,
    ): Promise<InstanceType<M>> {
        const model = new this(options) as InstanceType<M>;

        return Live2DFactory.setupLive2DModel(model, source, options).then(() => model);
    }

    /**
     * Synchronous version of `Live2DModel.from()`. This method immediately returns a Live2DModel instance,
     * whose resources have not been loaded. Therefore this model can't be manipulated or rendered
     * until the "load" event has been emitted.
     *
     * ```js
     * // no `await` here as it's not a Promise
     * const model = Live2DModel.fromSync('shizuku.model.json');
     *
     * // these will cause errors!
     * // app.stage.addChild(model);
     * // model.motion('tap_body');
     *
     * model.once('load', () => {
     *     // now it's safe
     *     app.stage.addChild(model);
     *     model.motion('tap_body');
     * });
     * ```
     */
    static fromSync<M extends Live2DConstructor = typeof Live2DModel>(
        this: M,
        source: string | JSONObject | ModelSettings,
        options?: Live2DFactoryOptions,
    ): InstanceType<M> {
        const model = new this(options) as InstanceType<M>;

        Live2DFactory.setupLive2DModel(model, source, options)
            .then(options?.onLoad)
            .catch(options?.onError);

        return model;
    }

    /**
     * Registers the class of `PIXI.Ticker` for auto updating.
     * @deprecated Use {@link Live2DModelOptions.ticker} instead.
     */
    static registerTicker(tickerClass: typeof Ticker): void {
        Automator["defaultTicker"] = tickerClass.shared;
    }

    /**
     * Tag for logging.
     */
    tag = "Live2DModel(uninitialized)";

    /**
     * The internal model. Will be undefined until the "ready" event is emitted.
     */
    internalModel?: IM;

    /**
     * Pixi textures.
     */
    textures: Texture[] = [];

    /**
     * Texture asset URLs used with Pixi Assets.
     */
    textureUrls: string[] = [];

    /** @override */
    transform = new Live2DTransform();

    /**
     * The anchor behaves like the one in `PIXI.Sprite`, where `(0, 0)` means the top left
     * and `(1, 1)` means the bottom right.
     */
    anchor = new ObservablePoint({ _onUpdate: this.onAnchorChange.bind(this) }, 0, 0); // cast the type because it breaks the casting of Live2DModel

    /**
     * An ID of Gl context that syncs with `renderer.CONTEXT_UID`. Used to check if the GL context has changed.
     */
    protected glContextID = -1;

    /**
     * Cached renderer reference for type safety
     */
    protected renderer?: WebGLRenderer;

    /**
     * Elapsed time in milliseconds since created.
     */
    elapsedTime: DOMHighResTimeStamp = 0;

    /**
     * Elapsed time in milliseconds from last frame to this frame.
     */
    deltaTime: DOMHighResTimeStamp = 0;

    automator: Automator;

    private transitionPresets: Live2DModelTransitionPresets;
    private activeTransition: Live2DModelActiveTransition | null = null;
    private activeParameterTransition: Live2DModelActiveParameterTransition | null = null;
    private parameterTransitionValues: Live2DModelParameterValues | null = null;
    private parameterTransitionHandler: (() => void) | null = null;
    private parameterTransitionAttached = false;
    private activeFocusTransition: Live2DModelActiveFocusTransition | null = null;
    private activeWindTransition: Live2DModelActiveWindTransition | null = null;

    /**
     * Audio analyzer for speech recognition and lip sync.
     */
    private audioAnalyzer: AudioAnalyzer | null = null;

    /**
     * Current speaking state.
     */
    private isSpeaking = false;

    constructor(options?: Live2DModelOptions) {
        super();

        this.automator = new Automator(this, options);
        this.transitionPresets = options?.transitions ?? {};

        // In Pixi.js v8, use onRender callback instead of _render override
        this.onRender = this._onRenderCallback.bind(this);

        this.once("modelLoaded", () => this.init(options));
        this.setupAutoTransition(options);
    }

    /**
     * Sets the renderer reference for type safety
     */
    setRenderer(renderer: Renderer): void {
        if (this.isWebGLRenderer(renderer)) {
            this.renderer = renderer;
        }
    }

    /**
     * Type guard to check if renderer is WebGLRenderer
     */
    private isWebGLRenderer(renderer: Renderer): renderer is WebGLRenderer {
        return 'gl' in renderer && renderer.gl instanceof WebGL2RenderingContext;
    }

    // TODO: rename
    /**
     * A handler of the "modelLoaded" event, invoked when the internal model has been loaded.
     */
    protected init(_options?: Live2DModelOptions) {
        if (!this.isReady()) {
            return;
        }
        
        this.tag = `Live2DModel(${this.internalModel.settings.name})`;
        
        // Update bounds area now that the internal model is loaded
        this.updateBoundsArea();
        this.attachParameterTransitionHandler();
    }

    private setupAutoTransition(options?: Live2DModelOptions): void {
        const trigger = options?.autoTransition;
        if (!trigger) {
            return;
        }

        const normalizedTrigger: Live2DModelAutoTransitionTrigger =
            trigger === true ? "load" : trigger;
        const startTransition = () => {
            void this.appear();
        };

        switch (normalizedTrigger) {
            case "ready":
                this.once("ready", startTransition);
                break;
            case "load":
                this.once("load", startTransition);
                break;
            case "added":
                this.once("added", startTransition);
                break;
        }
    }

    private attachParameterTransitionHandler(): void {
        if (!this.internalModel) {
            return;
        }

        if (!this.parameterTransitionHandler) {
            this.parameterTransitionHandler = () => {
                this.applyParameterTransitionValues();
            };
        }

        if (!this.parameterTransitionAttached) {
            this.internalModel.on("beforeModelUpdate", this.parameterTransitionHandler);
            this.parameterTransitionAttached = true;
        }
    }

    private detachParameterTransitionHandler(): void {
        if (!this.internalModel || !this.parameterTransitionHandler || !this.parameterTransitionAttached) {
            return;
        }

        this.internalModel.off("beforeModelUpdate", this.parameterTransitionHandler);
        this.parameterTransitionAttached = false;
    }

    /**
     * Checks if the model is ready (internal model is loaded).
     */
    isReady(): this is Live2DModel<IM> & { internalModel: IM } {
        return this.internalModel !== undefined;
    }

    /**
     * Checks if the model can render (ready and has textures).
     */
    canRender(): boolean {
        return this.isReady() && this.textures.length > 0;
    }

    /**
     * Checks if the renderer is available and valid.
     */
    hasValidRenderer(): boolean {
        return this.renderer !== undefined && this.renderer.gl instanceof WebGL2RenderingContext;
    }

    private getCoreModel(): Live2DCoreModelAccessors | null {
        if (!this.isReady()) {
            return null;
        }

        return this.internalModel.coreModel as Live2DCoreModelAccessors;
    }

    private getWindPhysics(): Live2DModelWindPhysics | null {
        if (!this.isReady()) {
            return null;
        }

        const physics = this.internalModel.physics as Live2DModelWindPhysics | undefined;
        if (!physics || typeof physics.getOption !== "function" || typeof physics.setOptions !== "function") {
            return null;
        }

        const options = physics.getOption();
        if (!options || typeof options.wind?.x !== "number" || typeof options.wind?.y !== "number") {
            return null;
        }

        return physics;
    }

    private getDefaultEyeParamIds(): typeof CUBISM4_EYE_PARAM_IDS | typeof CUBISM2_EYE_PARAM_IDS | null {
        const coreModel = this.getCoreModel();
        if (!coreModel) {
            return null;
        }

        if (typeof coreModel.setParameterValueById === "function") {
            return CUBISM4_EYE_PARAM_IDS;
        }

        if (typeof coreModel.setParamFloat === "function") {
            return CUBISM2_EYE_PARAM_IDS;
        }

        return null;
    }

    /**
     * Type guard for WebGLTexture
     */
    private isWebGLTexture(texture: unknown): texture is WebGLTexture {
        return texture instanceof WebGLTexture;
    }

    /**
     * Extracts WebGLTexture from PixiJS texture with proper type safety
     */
    private extractWebGLTexture(renderer: WebGLRenderer, texture: Texture): WebGLTexture | null {
        if (!renderer.texture || !texture.source) {
            return null;
        }

        try {
            // Get the WebGL source wrapper first
            const glSource = renderer.texture.getGlSource(texture.source);
            
            if (glSource && (glSource as any).texture) {
                // Extract the actual WebGL texture from the wrapper
                return (glSource as any).texture;
            }
            
            // Fallback: try the internal _glTextures approach
            const textureSourceWithGL = texture.source as any;
            if (textureSourceWithGL?._glTextures) {
                const contextTextures = textureSourceWithGL._glTextures[this.glContextID];
                return contextTextures?.texture || contextTextures;
            }
        } catch (error) {
            console.warn('Failed to extract WebGL texture:', error);
        }

        return null;
    }

    /**
     * A callback that observes {@link anchor}, invoked when the anchor's values have been changed.
     */
    protected onAnchorChange(): void {
        if (this.isReady()) {
            this.pivot.set(
                this.anchor.x * this.internalModel.width,
                this.anchor.y * this.internalModel.height,
            );
        }
    }

    /**
     * Shorthand to start a motion.
     * @param group - The motion group.
     * @param index - The index in this group. If not presented, a random motion will be started.
     * @param priority - The motion priority. Defaults to `MotionPriority.NORMAL`.
     * @return Promise that resolves with true if the motion is successfully started, with false otherwise.
     */
    motion(group: string, index?: number, priority?: MotionPriority): Promise<boolean> {
        if (!this.isReady()) {
            return Promise.resolve(false);
        }
        return index === undefined
            ? this.internalModel.motionManager.startRandomMotion(group, priority)
            : this.internalModel.motionManager.startMotion(group, index, priority);
    }

    /**
     * Shorthand to set an expression.
     * @param id - Either the index, or the name of the expression. If not presented, a random expression will be set.
     * @return Promise that resolves with true if succeeded, with false otherwise.
     */
    expression(id?: number | string): Promise<boolean> {
        if (!this.isReady() || !this.internalModel.motionManager.expressionManager) {
            return Promise.resolve(false);
        }
        return id === undefined
            ? this.internalModel.motionManager.expressionManager.setRandomExpression()
            : this.internalModel.motionManager.expressionManager.setExpression(id);
    }

    private resolveFocusTargetFromWorld(x: number, y: number): { x: number; y: number } | null {
        if (!this.isReady()) {
            return null;
        }

        tempPoint.x = x;
        tempPoint.y = y;

        // we can pass `true` as the third argument to skip the update transform
        // because focus won't take effect until the model is rendered,
        // and a model being rendered will always get transform updated
        this.toModelPosition(tempPoint, tempPoint, true);

        const tx = (tempPoint.x / this.internalModel.originalWidth) * 2 - 1;
        const ty = (tempPoint.y / this.internalModel.originalHeight) * 2 - 1;
        const radian = Math.atan2(ty, tx);

        return { x: Math.cos(radian), y: -Math.sin(radian) };
    }

    /**
     * Smoothly moves the focus target in normalized space.
     * @param x - Focus X in range `[-1, 1]`.
     * @param y - Focus Y in range `[-1, 1]`.
     * @param options - Transition options.
     */
    lookTo(x: number, y: number, options: Live2DModelFocusTransitionOptions = {}): Promise<void> {
        if (!this.isReady()) {
            return Promise.resolve();
        }

        this.stopFocusTransition();

        const hasTransition =
            options.duration !== undefined ||
            options.delay !== undefined ||
            options.easing !== undefined;

        if (!hasTransition) {
            this.internalModel.focusController.focus(x, y, options.instant ?? false);
            return Promise.resolve();
        }

        const duration = Math.max(0, options.duration ?? DEFAULT_TRANSITION_DURATION);
        const delay = Math.max(0, options.delay ?? DEFAULT_TRANSITION_DELAY);
        const easing = resolveEasing(options.easing);
        const fromX = this.internalModel.focusController.x;
        const fromY = this.internalModel.focusController.y;
        const toX = x;
        const toY = y;

        if (duration === 0 && delay === 0) {
            this.internalModel.focusController.focus(toX, toY, true);
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const transition: Live2DModelActiveFocusTransition = {
                elapsed: 0,
                delay,
                duration,
                easing,
                fromX,
                fromY,
                toX,
                toY,
                resolve,
            };

            this.activeFocusTransition = transition;
            this.applyFocusTransitionProgress(transition, 0);
        });
    }

    /**
     * Smoothly moves the focus target using a world position.
     * @param x - Position in world space.
     * @param y - Position in world space.
     * @param options - Transition options.
     */
    lookAt(
        x: number,
        y: number,
        options: Live2DModelFocusTransitionOptions = {},
    ): Promise<void> {
        const target = this.resolveFocusTargetFromWorld(x, y);
        if (!target) {
            return Promise.resolve();
        }

        return this.lookTo(target.x, target.y, options);
    }

    /**
     * Stops the active focus transition without altering current values.
     */
    stopFocusTransition(): void {
        if (!this.activeFocusTransition) {
            return;
        }

        const activeTransition = this.activeFocusTransition;
        this.activeFocusTransition = null;
        activeTransition.resolve();
    }

    /**
     * Returns whether a focus transition is currently running.
     */
    isFocusTransitioning(): boolean {
        return this.activeFocusTransition !== null;
    }

    /**
     * Updates the focus position. This will not cause the model to immediately look at the position,
     * instead the movement will be interpolated.
     * @param x - Position in world space.
     * @param y - Position in world space.
     * @param instant - Should the focus position be instantly applied.
     */
    focus(x: number, y: number, instant: boolean = false): void {
        const target = this.resolveFocusTargetFromWorld(x, y);
        if (!target) {
            return;
        }

        this.stopFocusTransition();
        this.internalModel.focusController.focus(target.x, target.y, instant);
    }

    /**
     * Tap on the model. This will perform a hit-testing, and emit a "hit" event
     * if at least one of the hit areas is hit.
     * @param x - Position in world space.
     * @param y - Position in world space.
     * @emits {@link Live2DModelEvents.hit}
     */
    tap(x: number, y: number): void {
        const hitAreaNames = this.hitTest(x, y);

        if (hitAreaNames.length) {
            logger.log(this.tag, `Hit`, hitAreaNames);

            this.emit("hit", hitAreaNames);
        }
    }

    /**
     * Hit-test on the model.
     * @param x - Position in world space.
     * @param y - Position in world space.
     * @return The names of the *hit* hit areas. Can be empty if none is hit.
     */
    hitTest(x: number, y: number): string[] {
        if (!this.isReady()) {
            return [];
        }
        
        tempPoint.x = x;
        tempPoint.y = y;
        this.toModelPosition(tempPoint, tempPoint);

        return this.internalModel.hitTest(tempPoint.x, tempPoint.y);
    }

    /**
     * Calculates the position in the canvas of original, unscaled Live2D model.
     * @param position - A Point in world space.
     * @param result - A Point to store the new value. Defaults to a new Point.
     * @param skipUpdate - True to skip the update transform.
     * @return The Point in model canvas space.
     */
    toModelPosition(
        position: Point,
        result: Point = position.clone(),
        _skipUpdate?: boolean,
    ): Point {
        // In Pixi.js v8, use toLocal method instead of manual worldTransform.applyInverse
        // First convert to local coordinates of this Live2DModel
        const localPosition = this.toLocal(position, undefined, result);
        
        // Then apply the internal model's local transform if model is ready
        if (this.isReady()) {
            this.internalModel.localTransform.applyInverse(localPosition, localPosition);
        }

        return localPosition;
    }

    /**
     * A method required by `PIXI.InteractionManager` to perform hit-testing.
     * @param point - A Point in world space.
     * @return True if the point is inside this model.
     */
    containsPoint(point: Point): boolean {
        // In Pixi.js v8, getBounds() returns a Bounds object, access Rectangle via .rectangle
        return this.getBounds(true).rectangle.contains(point.x, point.y);
    }

    /**
     * Updates the boundsArea based on the internal model dimensions
     */
    private updateBoundsArea(): void {
        if (this.isReady() && this.internalModel.width && this.internalModel.height) {
            // Set boundsArea with actual model dimensions
            this.boundsArea = new Rectangle(0, 0, this.internalModel.width, this.internalModel.height);
        } else if (!this.boundsArea) {
            // Fallback to default size if internal model isn't ready and no boundsArea is set
            this.boundsArea = new Rectangle(0, 0, 512, 512);
        }
    }


    /**
     * Gets a unique ID for the WebGL context
     */
    private _getContextUID(gl: WebGL2RenderingContext): number {
        const contextWithUID = gl as WebGLContextWithUID;
        
        // Create a simple UID for the context if it doesn't have one
        if (!contextWithUID._pixiContextUID) {
            contextWithUID._pixiContextUID = Date.now() + Math.random();
        }
        return contextWithUID._pixiContextUID;
    }

    /**
     * Updates the model. Note this method just updates the timer,
     * and the actual update will be done right before rendering the model.
     * @param dt - The elapsed time in milliseconds since last frame.
     */
    update(dt: DOMHighResTimeStamp): void {
        this.updateTransition(dt);
        this.updateFocusTransition(dt);
        this.updateWindTransition(dt);
        this.updateParameterTransition(dt);
        this.deltaTime += dt;
        this.elapsedTime += dt;

        // don't call `this.internalModel.update()` here, because it requires WebGL context
    }

    /**
     * Starts a transition. Transitions are updated by {@link Live2DModel.update}.
     */
    transition(definition: Live2DModelTransitionDefinition): Promise<void> {
        const current = this.captureTransitionSnapshot();
        const from = normalizeTransitionState(definition.from);
        const to = normalizeTransitionState(definition.to);
        const values = buildTransitionValues(current, from, to);
        const hasValues =
            values.alpha !== undefined ||
            values.x !== undefined ||
            values.y !== undefined ||
            values.rotation !== undefined ||
            values.scaleX !== undefined ||
            values.scaleY !== undefined;

        if (!hasValues) {
            return Promise.resolve();
        }

        const duration = Math.max(
            0,
            definition.duration ?? DEFAULT_TRANSITION_DURATION,
        );
        const delay = Math.max(0, definition.delay ?? DEFAULT_TRANSITION_DELAY);
        const easing = resolveEasing(definition.easing);

        this.stopTransition();

        if (duration === 0 && delay === 0) {
            this.applyTransitionProgress(values, 1);
            return Promise.resolve();
        }

        this.applyTransitionProgress(values, 0);

        return new Promise((resolve) => {
            this.activeTransition = {
                elapsed: 0,
                delay,
                duration,
                easing,
                values,
                resolve,
            };
        });
    }

    /**
     * Convenience helper to transition to target properties.
     */
    transitionTo(
        to: Live2DModelTransitionState,
        options: Live2DModelTransitionToOptions = {},
    ): Promise<void> {
        return this.transition({ ...options, to });
    }

    /**
     * Plays the appear transition preset.
     */
    appear(options?: Live2DModelTransitionDefinition): Promise<void> {
        const merged = mergeTransitionDefinition(
            DEFAULT_APPEAR_TRANSITION,
            mergeTransitionDefinition(this.transitionPresets.appear, options),
        );
        return this.transition(merged);
    }

    /**
     * Plays the disappear transition preset.
     */
    disappear(options?: Live2DModelTransitionDefinition): Promise<void> {
        const merged = mergeTransitionDefinition(
            DEFAULT_DISAPPEAR_TRANSITION,
            mergeTransitionDefinition(this.transitionPresets.disappear, options),
        );
        return this.transition(merged);
    }

    /**
     * Stops the active transition without altering current values.
     */
    stopTransition(): void {
        if (!this.activeTransition) {
            return;
        }

        const activeTransition = this.activeTransition;
        this.activeTransition = null;
        activeTransition.resolve();
    }

    /**
     * Returns whether a transition is currently running.
     */
    isTransitioning(): boolean {
        return this.activeTransition !== null;
    }

    private updateTransition(dt: DOMHighResTimeStamp): void {
        const activeTransition = this.activeTransition;
        if (!activeTransition) {
            return;
        }

        activeTransition.elapsed += dt;
        if (activeTransition.elapsed < activeTransition.delay) {
            return;
        }

        const elapsed = activeTransition.elapsed - activeTransition.delay;
        const progress =
            activeTransition.duration === 0
                ? 1
                : Math.min(1, elapsed / activeTransition.duration);
        const eased = activeTransition.easing(progress);

        this.applyTransitionProgress(activeTransition.values, eased);

        if (progress >= 1) {
            this.activeTransition = null;
            activeTransition.resolve();
        }
    }

    private captureTransitionSnapshot(): Live2DModelTransitionSnapshot {
        return {
            alpha: this.alpha,
            x: this.x,
            y: this.y,
            rotation: this.rotation,
            scaleX: this.scale.x,
            scaleY: this.scale.y,
        };
    }

    private applyTransitionProgress(
        values: Live2DModelTransitionValues,
        progress: number,
    ): void {
        if (values.alpha) {
            this.alpha = lerp(values.alpha.from, values.alpha.to, progress);
        }
        if (values.x) {
            this.x = lerp(values.x.from, values.x.to, progress);
        }
        if (values.y) {
            this.y = lerp(values.y.from, values.y.to, progress);
        }
        if (values.rotation) {
            this.rotation = lerp(values.rotation.from, values.rotation.to, progress);
        }
        if (values.scaleX) {
            this.scale.x = lerp(values.scaleX.from, values.scaleX.to, progress);
        }
        if (values.scaleY) {
            this.scale.y = lerp(values.scaleY.from, values.scaleY.to, progress);
        }
    }

    /**
     * Gets a parameter value by ID.
     */
    getParameterValue(parameterId: string): number | undefined {
        const coreModel = this.getCoreModel();
        if (!coreModel) {
            return;
        }

        if (typeof coreModel.getParameterValueById === "function") {
            return coreModel.getParameterValueById(parameterId);
        }

        if (typeof coreModel.getParamFloat === "function") {
            return coreModel.getParamFloat(parameterId);
        }
    }

    /**
     * Sets a parameter value by ID.
     */
    setParameterValue(parameterId: string, value: number): void {
        const coreModel = this.getCoreModel();
        if (!coreModel) {
            return;
        }

        if (typeof coreModel.setParameterValueById === "function") {
            coreModel.setParameterValueById(parameterId, value);
            return;
        }

        if (typeof coreModel.setParamFloat === "function") {
            coreModel.setParamFloat(parameterId, value);
        }
    }

    /**
     * Sets multiple parameter values by ID.
     */
    setParameterValues(values: Live2DModelParameterValues): void {
        for (const [parameterId, value] of Object.entries(values)) {
            this.setParameterValue(parameterId, value);
        }
    }

    /**
     * Starts a parameter transition.
     */
    transitionParameters(
        definition: Live2DModelParameterTransitionDefinition,
    ): Promise<void> {
        if (!this.isReady()) {
            return Promise.resolve();
        }

        const from = definition.from;
        const to = definition.to;
        const current: Record<string, number | undefined> = {};

        for (const parameterId of new Set([
            ...Object.keys(from ?? {}),
            ...Object.keys(to ?? {}),
        ])) {
            current[parameterId] = this.getParameterValue(parameterId);
        }

        const values = buildParameterTransitionValues(current, from, to);
        const entries = Object.entries(values);

        if (entries.length === 0) {
            return Promise.resolve();
        }

        const duration = Math.max(
            0,
            definition.duration ?? DEFAULT_TRANSITION_DURATION,
        );
        const delay = Math.max(0, definition.delay ?? DEFAULT_TRANSITION_DELAY);
        const easing = resolveEasing(definition.easing);

        this.stopParameterTransition();

        if (duration === 0 && delay === 0) {
            this.parameterTransitionValues = this.computeParameterTransitionValues(values, 1);
            this.setParameterValues(this.parameterTransitionValues);
            return Promise.resolve();
        }

        this.parameterTransitionValues = this.computeParameterTransitionValues(values, 0);
        this.setParameterValues(this.parameterTransitionValues);

        return new Promise((resolve) => {
            this.activeParameterTransition = {
                elapsed: 0,
                delay,
                duration,
                easing,
                values,
                resolve,
            };
        });
    }

    /**
     * Convenience helper to transition parameters to target values.
     */
    transitionParametersTo(
        values: Live2DModelParameterValues,
        options: Live2DModelParameterTransitionOptions = {},
    ): Promise<void> {
        return this.transitionParameters({ ...options, to: values });
    }

    /**
     * Stops the active parameter transition without altering current values.
     */
    stopParameterTransition(): void {
        if (!this.activeParameterTransition) {
            return;
        }

        const activeTransition = this.activeParameterTransition;
        this.activeParameterTransition = null;
        this.parameterTransitionValues = null;
        activeTransition.resolve();
    }

    /**
     * Returns whether a parameter transition is currently running.
     */
    isParameterTransitioning(): boolean {
        return this.activeParameterTransition !== null;
    }

    private updateParameterTransition(dt: DOMHighResTimeStamp): void {
        const activeTransition = this.activeParameterTransition;
        if (!activeTransition) {
            return;
        }

        activeTransition.elapsed += dt;
        if (activeTransition.elapsed < activeTransition.delay) {
            this.parameterTransitionValues = this.computeParameterTransitionValues(
                activeTransition.values,
                0,
            );
            return;
        }

        const elapsed = activeTransition.elapsed - activeTransition.delay;
        const progress =
            activeTransition.duration === 0
                ? 1
                : Math.min(1, elapsed / activeTransition.duration);
        const eased = activeTransition.easing(progress);

        this.parameterTransitionValues = this.computeParameterTransitionValues(
            activeTransition.values,
            eased,
        );

        if (progress >= 1) {
            this.activeParameterTransition = null;
            activeTransition.resolve();
        }
    }

    private computeParameterTransitionValues(
        values: Live2DModelParameterTransitionValues,
        progress: number,
    ): Live2DModelParameterValues {
        const result: Live2DModelParameterValues = {};

        for (const [parameterId, value] of Object.entries(values)) {
            result[parameterId] = lerp(value.from, value.to, progress);
        }

        return result;
    }

    private applyParameterTransitionValues(): void {
        if (!this.parameterTransitionValues) {
            return;
        }

        this.setParameterValues(this.parameterTransitionValues);

        if (!this.activeParameterTransition) {
            this.parameterTransitionValues = null;
        }
    }

    private updateFocusTransition(dt: DOMHighResTimeStamp): void {
        const activeTransition = this.activeFocusTransition;
        if (!activeTransition || !this.isReady()) {
            return;
        }

        activeTransition.elapsed += dt;
        if (activeTransition.elapsed < activeTransition.delay) {
            this.applyFocusTransitionProgress(activeTransition, 0);
            return;
        }

        const elapsed = activeTransition.elapsed - activeTransition.delay;
        const progress =
            activeTransition.duration === 0
                ? 1
                : Math.min(1, elapsed / activeTransition.duration);
        const eased = activeTransition.easing(progress);

        this.applyFocusTransitionProgress(activeTransition, eased);

        if (progress >= 1) {
            this.activeFocusTransition = null;
            activeTransition.resolve();
        }
    }

    private applyFocusTransitionProgress(
        transition: Live2DModelActiveFocusTransition,
        progress: number,
    ): void {
        if (!this.isReady()) {
            return;
        }

        const x = lerp(transition.fromX, transition.toX, progress);
        const y = lerp(transition.fromY, transition.toY, progress);

        this.internalModel.focusController.focus(x, y, true);
    }

    private updateWindTransition(dt: DOMHighResTimeStamp): void {
        const activeTransition = this.activeWindTransition;
        if (!activeTransition || !this.isReady()) {
            return;
        }

        const physics = this.getWindPhysics();
        if (!physics) {
            return;
        }

        activeTransition.elapsed += dt;
        if (activeTransition.elapsed < activeTransition.delay) {
            this.applyWindTransitionProgress(activeTransition, 0, physics);
            return;
        }

        const elapsed = activeTransition.elapsed - activeTransition.delay;
        const progress =
            activeTransition.duration === 0
                ? 1
                : Math.min(1, elapsed / activeTransition.duration);
        const eased = activeTransition.easing(progress);

        this.applyWindTransitionProgress(activeTransition, eased, physics);

        if (progress >= 1) {
            this.activeWindTransition = null;
            activeTransition.resolve();
        }
    }

    private applyWindTransitionProgress(
        transition: Live2DModelActiveWindTransition,
        progress: number,
        physics: Live2DModelWindPhysics,
    ): void {
        const options = physics.getOption();
        options.wind.x = lerp(transition.fromX, transition.toX, progress);
        options.wind.y = lerp(transition.fromY, transition.toY, progress);
        physics.setOptions(options);
    }

    // In Pixi.js v8, onRender callback doesn't receive renderer parameter
    // We need to access the renderer differently
    private _onRenderCallback(): void {
        // Try to use cached renderer first, otherwise fall back to global access
        let webglRenderer = this.renderer;
        
        if (!webglRenderer) {
            // Fallback to global application access
            const app = (globalThis as any).app || (window as any).app;
            if (!app?.renderer) {
                return;
            }
            
            const renderer = app.renderer as Renderer;
            if (!this.isWebGLRenderer(renderer)) {
                return;
            }
            
            webglRenderer = renderer;
            this.renderer = webglRenderer; // Cache for next time
        }
        
        // Early exit if model cannot render
        if (!this.canRender()) {
            return;
        }
        
        try {
            // In PixiJS v8, the batch/geometry/shader/state reset methods have been removed
            // These were used to reset renderer state, but v8's architecture no longer needs this

            let shouldUpdateTexture = false;

            // when the WebGL context has changed
            // In PixiJS v8, use a simple hash of the GL context as UID
            const contextUID = this._getContextUID(webglRenderer.gl);
            if (this.glContextID !== contextUID) {
                this.glContextID = contextUID;
                
                if (this.isReady()){
                    this.internalModel.updateWebGLContext(webglRenderer.gl, this.glContextID);
                }

                shouldUpdateTexture = true;
            }

            for (let i = 0; i < this.textures.length; i++) {
                const texture = this.textures[i]!;

                // In v8, texture.valid doesn't exist, check if texture has a valid source
                if (!texture.source) {
                    continue;
                }

                // In v8, texture handling is different - no more baseTexture
                const textureSourceWithGL = texture.source as any;
                const shouldUpdate = shouldUpdateTexture || 
                    !textureSourceWithGL?._glTextures?.[this.glContextID];

                // bind the WebGLTexture into Live2D core.
                // In v8, get the actual WebGL texture object
                const glTexture = this.extractWebGLTexture(webglRenderer, texture);
                
                if (this.isWebGLTexture(glTexture) && this.internalModel) {
                    // Set texture flip state right before binding each texture
                    if (shouldUpdate) {
                        webglRenderer.gl.pixelStorei(
                            WebGLRenderingContext.UNPACK_FLIP_Y_WEBGL,
                            this.internalModel.textureFlipY,
                        );
                    }
                    
                    this.internalModel.bindTexture(i, glTexture);
                }

                // manually update the GC counter in v8
                if (webglRenderer.textureGC?.count && texture.source) {
                    (texture.source as any).touched = webglRenderer.textureGC.count;
                }
            }

            // Reset GL state after texture binding to avoid affecting other textures
            if (shouldUpdateTexture && this.internalModel) {
                webglRenderer.gl.pixelStorei(
                    WebGLRenderingContext.UNPACK_FLIP_Y_WEBGL,
                    false,
                );
            }

            // In Pixi.js v8, framebuffer structure has changed
            // Use renderer dimensions directly
            const viewport = {
                x: 0,
                y: 0,
                width: webglRenderer.width || webglRenderer.screen?.width || 800,
                height: webglRenderer.height || webglRenderer.screen?.height || 600
            };
            
            if (this.internalModel) {
                this.internalModel.viewport = [viewport.x, viewport.y, viewport.width, viewport.height];

                // update only if the time has changed, as the model will possibly be updated once but rendered multiple times
                if (this.deltaTime) {
                    this.internalModel.update(this.deltaTime, this.elapsedTime);
                    this.deltaTime = 0;
                }
            }

            // In v8, ensure worldTransform is properly calculated
            const worldTransform = this.worldTransform || this.groupTransform || this.localTransform;
            
            // In PixiJS v8, we need to use the renderer's globalUniforms
            let projectionMatrix;
            if (webglRenderer.globalUniforms && 'projectionMatrix' in webglRenderer.globalUniforms) {
                projectionMatrix = (webglRenderer.globalUniforms as any).projectionMatrix;
            } else {
                // Fallback: create a basic projection matrix using renderer screen dimensions
                projectionMatrix = new Matrix();
                const { width, height } = webglRenderer.screen;
                projectionMatrix.set(2 / width, 0, 0, -2 / height, -1, 1);
            }
            
            const internalTransform = tempMatrix
                .copyFrom(projectionMatrix)
                .append(worldTransform);
            
            if (this.internalModel) {
                this.internalModel.updateTransform(internalTransform);
                this.internalModel.draw(webglRenderer.gl);
            }
            
        } catch (error) {
            console.error("Error in Live2D render callback:", error);
        }
    }

    /**
     * Starts lip sync animation.
     */
    startLipSync(): void {
        if (this.isReady()) {
            this.internalModel.setLipSyncEnabled(true);
        }
    }

    /**
     * Stops lip sync animation.
     */
    stopLipSync(): void {
        if (this.isReady()) {
            this.internalModel.setLipSyncEnabled(false);
            this.internalModel.setLipSyncValue(0);
        }
    }

    /**
     * Sets the lip sync value manually.
     * @param value - Lip sync value (0-1), where 0 is closed mouth and 1 is fully open.
     */
    setLipSyncValue(value: number): void {
        if (this.isReady()) {
            this.internalModel.setLipSyncValue(value);
        }
    }

    /**
     * Gets current lip sync enabled state.
     * @return Whether lip sync is enabled.
     */
    isLipSyncEnabled(): boolean {
        return this.isReady() ? this.internalModel.lipSyncEnabled : false;
    }

    /**
     * Gets current lip sync value.
     * @return Current lip sync value (0-1).
     */
    getLipSyncValue(): number {
        return this.isReady() ? this.internalModel.lipSyncValue : 0;
    }

    /**
     * Sets whether eyes should always look at camera regardless of head movement.
     * @param enabled - Whether to lock eyes to camera.
     */
    setEyesAlwaysLookAtCamera(enabled: boolean): void {
        if (this.isReady()) {
            this.internalModel.eyesAlwaysLookAtCamera = enabled;
        }
    }

    /**
     * Gets whether eyes are locked to camera.
     * @return Whether eyes are locked to camera.
     */
    isEyesAlwaysLookAtCamera(): boolean {
        return this.isReady() ? this.internalModel.eyesAlwaysLookAtCamera : false;
    }

    /**
     * Sets whether auto eye blinking is enabled.
     * @param enabled - Whether to enable auto eye blinking.
     */
    setEyeBlinkEnabled(enabled: boolean): void {
        if (this.isReady()) {
            this.internalModel.setEyeBlinkEnabled(enabled);
        }
    }

    /**
     * Gets whether auto eye blinking is enabled.
     * @return Whether auto eye blinking is enabled.
     */
    isEyeBlinkEnabled(): boolean {
        return this.isReady() ? this.internalModel.isEyeBlinkEnabled() : true;
    }

    /**
     * Sets whether breathing effects are enabled.
     * @param enabled - Whether to enable breathing effects.
     */
    setBreathEnabled(enabled: boolean): void {
        if (this.isReady()) {
            this.internalModel.setBreathEnabled(enabled);
        }
    }

    /**
     * Gets whether breathing effects are enabled.
     * @return Whether breathing effects are enabled.
     */
    isBreathEnabled(): boolean {
        return this.isReady() ? this.internalModel.isBreathEnabled() : true;
    }

    /**
     * Sets base breathing parameters used by natural movements.
     * @param parameters - Parameters describing the breathing curve.
     */
    setBreathParameters(parameters: Live2DModelBreathParameter[]): void {
        if (this.isReady()) {
            this.internalModel.setBreathParameters(parameters);
        }
    }

    /**
     * Sets breathing intensity multiplier.
     * @param intensity - Intensity multiplier.
     */
    setBreathIntensity(intensity: number): void {
        if (this.isReady()) {
            this.internalModel.setBreathIntensity(intensity);
        }
    }

    /**
     * Sets breathing cycle multiplier.
     * @param cycle - Cycle multiplier applied to base parameters.
     */
    setBreathCycle(cycle: number): void {
        if (this.isReady()) {
            this.internalModel.setBreathCycle(cycle);
        }
    }

    /**
     * Checks whether wind control is supported.
     */
    isWindSupported(): boolean {
        return this.getWindPhysics() !== null;
    }

    /**
     * Sets the wind vector for physics.
     * @param x - Wind X.
     * @param y - Wind Y.
     */
    setWind(x: number, y: number): void {
        const physics = this.getWindPhysics();
        if (!physics) {
            return;
        }

        const options = physics.getOption();
        options.wind.x = x;
        options.wind.y = y;
        physics.setOptions(options);
    }

    /**
     * Gets the current wind vector.
     * @return Wind vector or null when unsupported.
     */
    getWind(): Live2DModelWind | null {
        const physics = this.getWindPhysics();
        if (!physics) {
            return null;
        }

        const options = physics.getOption();
        return { x: options.wind.x, y: options.wind.y };
    }

    /**
     * Smoothly transitions the wind vector.
     */
    transitionWind(definition: Live2DModelWindTransitionDefinition): Promise<void> {
        if (!this.getWindPhysics()) {
            return Promise.resolve();
        }

        const current = this.getWind() ?? { x: 0, y: 0 };
        const from = definition.from ?? current;
        const to = definition.to ?? current;

        const duration = Math.max(
            0,
            definition.duration ?? DEFAULT_TRANSITION_DURATION,
        );
        const delay = Math.max(0, definition.delay ?? DEFAULT_TRANSITION_DELAY);
        const easing = resolveEasing(definition.easing);

        this.stopWindTransition();

        if (duration === 0 && delay === 0) {
            this.setWind(to.x, to.y);
            return Promise.resolve();
        }

        this.setWind(from.x, from.y);

        return new Promise((resolve) => {
            this.activeWindTransition = {
                elapsed: 0,
                delay,
                duration,
                easing,
                fromX: from.x,
                fromY: from.y,
                toX: to.x,
                toY: to.y,
                resolve,
            };
        });
    }

    /**
     * Convenience helper to transition wind to target values.
     */
    windTo(
        x: number,
        y: number,
        options: Live2DModelWindTransitionOptions = {},
    ): Promise<void> {
        return this.transitionWind({ ...options, to: { x, y } });
    }

    /**
     * Stops the active wind transition without altering current values.
     */
    stopWindTransition(): void {
        if (!this.activeWindTransition) {
            return;
        }

        const activeTransition = this.activeWindTransition;
        this.activeWindTransition = null;
        activeTransition.resolve();
    }

    /**
     * Returns whether a wind transition is currently running.
     */
    isWindTransitioning(): boolean {
        return this.activeWindTransition !== null;
    }

    /**
     * Smoothly sets the eye open value (both eyes).
     * @param value - Eye open value, usually in range `[0, 1]`.
     * @param options - Transition options.
     */
    eyeOpen(value: number, options: Live2DModelParameterTransitionOptions = {}): Promise<void> {
        const paramIds = this.getDefaultEyeParamIds();
        if (!paramIds) {
            return Promise.resolve();
        }

        return this.transitionParametersTo(
            {
                [paramIds.leftOpen]: value,
                [paramIds.rightOpen]: value,
            },
            options,
        );
    }

    /**
     * Smoothly closes both eyes.
     * @param options - Transition options.
     */
    eyeClose(options: Live2DModelParameterTransitionOptions = {}): Promise<void> {
        return this.eyeOpen(0, options);
    }

    /**
     * Start speaking with base64 audio data or audio URL.
     * @param audioData - Base64 audio data or audio URL
     * @param options - Speaking options
     */
    async speak(
        audioData: string,
        options: {
            volume?: number;
            expression?: string;
            resetExpression?: boolean;
            onFinish?: () => void;
            onError?: (error: Error) => void;
        } = {}
    ): Promise<void> {
        if (!this.isReady()) {
            throw new Error('Model is not ready');
        }

        if (this.isSpeaking) {
            this.stopSpeaking();
        }

        try {
            this.isSpeaking = true;
            
            // Initialize audio analyzer if needed
            if (!this.audioAnalyzer) {
                this.audioAnalyzer = new AudioAnalyzer();
            }

            // Start lip sync
            this.startLipSync();

            // Play and analyze audio
            await this.audioAnalyzer.playAndAnalyze(audioData, (volume) => {
                // Apply volume-based lip sync
                const lipSyncValue = Math.min(1, volume * (options.volume || 1));
                this.setLipSyncValue(lipSyncValue);
            });

            // Speaking finished
            this.isSpeaking = false;
            this.setLipSyncValue(0);
            
            if (options.onFinish) {
                options.onFinish();
            }
        } catch (error) {
            this.isSpeaking = false;
            this.setLipSyncValue(0);
            
            const errorObj = error instanceof Error ? error : new Error(String(error));
            if (options.onError) {
                options.onError(errorObj);
            } else {
                console.error('Speaking error:', errorObj);
            }
        }
    }

    /**
     * Stop current speaking.
     */
    stopSpeaking(): void {
        if (this.audioAnalyzer) {
            this.audioAnalyzer.destroy();
            this.audioAnalyzer = null;
        }
        
        this.isSpeaking = false;
        this.setLipSyncValue(0);
    }

    /**
     * Check if currently speaking.
     * @return Whether the model is currently speaking.
     */
    isSpeakingNow(): boolean {
        return this.isSpeaking;
    }

    /**
     * Start microphone input for real-time lip sync.
     * @param onError - Error callback
     */
    async startMicrophoneLipSync(onError?: (error: Error) => void): Promise<void> {
        if (!this.isReady()) {
            throw new Error('Model is not ready');
        }

        try {
            // Initialize audio analyzer if needed
            if (!this.audioAnalyzer) {
                this.audioAnalyzer = new AudioAnalyzer();
            }

            // Start lip sync
            this.startLipSync();

            // Start microphone capture
            await this.audioAnalyzer.startMicrophone((volume) => {
                // Apply volume-based lip sync
                this.setLipSyncValue(volume);
            });
        } catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error));
            if (onError) {
                onError(errorObj);
            } else {
                console.error('Microphone error:', errorObj);
            }
        }
    }

    /**
     * Stop microphone input.
     */
    stopMicrophoneLipSync(): void {
        if (this.audioAnalyzer) {
            this.audioAnalyzer.stopMicrophone();
        }
        this.setLipSyncValue(0);
    }

    /**
     * Destroys the model and all related resources. This takes the same options and also
     * behaves the same as `PIXI.Container#destroy`.
     * @param options - Options parameter. A boolean will act as if all options
     *  have been set to that value
     * @param [options.children=false] - if set to true, all the children will have their destroy
     *  method called as well. 'options' will be passed on to those calls.
     * @param [options.texture=false] - Only used for child Sprites if options.children is set to true
     *  Should it destroy the texture of the child sprite
     * @param [options.baseTexture=false] - Only used for child Sprites if options.children is set to true
     *  Should it destroy the base texture of the child sprite
     * @param [options.textureSource=false] - PixiJS v8 alias for baseTexture, destroys the texture source
     */
    destroy(
        options?: {
            children?: boolean;
            texture?: boolean;
            baseTexture?: boolean;
            textureSource?: boolean;
        } | boolean,
    ): void {
        this.stopTransition();
        this.stopParameterTransition();
        this.stopFocusTransition();
        this.stopWindTransition();
        this.detachParameterTransitionHandler();
        this.emit("destroy");

        const destroyTextures =
            typeof options === "boolean"
                ? options
                : Boolean(options?.texture || options?.baseTexture || options?.textureSource);
        const destroyTextureSource =
            typeof options === "boolean"
                ? options
                : Boolean(options?.baseTexture ?? options?.textureSource);

        if (destroyTextures) {
            if (destroyTextureSource && this.textureUrls.length > 0) {
                const unloadUrls: string[] = [];

                for (let i = 0; i < this.textures.length; i++) {
                    const texture = this.textures[i];
                    const url = this.textureUrls[i];

                    if (url && Assets.cache.has(url)) {
                        unloadUrls.push(url);
                    } else if (texture) {
                        texture.destroy(destroyTextureSource);
                    }
                }

                if (unloadUrls.length > 0) {
                    void Assets.unload(unloadUrls).catch((error) => {
                        logger.warn(this.tag, "Failed to unload textures.", error);
                    });
                }
            } else {
                this.textures.forEach((texture) => texture.destroy(destroyTextureSource));
            }
        }

        this.automator.destroy();

        // Clean up audio resources
        if (this.audioAnalyzer) {
            this.audioAnalyzer.destroy();
            this.audioAnalyzer = null;
        }

        if (this.isReady()) {
            this.internalModel.destroy();
        }

        super.destroy(options);
    }
}
