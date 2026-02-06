import type { InternalModelOptions } from "@/cubism-common";
import type { BreathParameter, CommonHitArea, CommonLayout } from "@/cubism-common/InternalModel";
import { InternalModel } from "@/cubism-common/InternalModel";
import { logger } from "../utils";
import type { Cubism2ModelSettings } from "./Cubism2ModelSettings";
import { Cubism2MotionManager } from "./Cubism2MotionManager";
import { Live2DEyeBlink } from "./Live2DEyeBlink";
import type { Live2DPhysics } from "./Live2DPhysics";
import type { Live2DPose } from "./Live2DPose";

// prettier-ignore
const tempMatrixArray = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
]);

interface BreathParameterEntry extends BreathParameter {
    parameterIndex: number;
}

export class Cubism2InternalModel extends InternalModel {
    settings: Cubism2ModelSettings;

    coreModel: Live2DModelWebGL;
    motionManager: Cubism2MotionManager;

    eyeBlink?: Live2DEyeBlink;

    declare physics?: Live2DPhysics;
    declare pose?: Live2DPose;
    private breathParameters: BreathParameter[] = [];
    private breathParameterEntries: BreathParameterEntry[] = [];
    private breathIntensity = 1;
    private breathCycleScale = 1;

    // parameter indices, cached for better performance
    eyeballXParamIndex: number;
    eyeballYParamIndex: number;
    angleXParamIndex: number;
    angleYParamIndex: number;
    angleZParamIndex: number;
    bodyAngleXParamIndex: number;
    breathParamIndex: number;
    mouthOpenYParamIndex: number;

    textureFlipY = true;

    /**
     * Number of the drawables in this model.
     */
    drawDataCount = 0;

    /**
     * If true, the face culling will always be disabled when drawing the model,
     * regardless of the model's internal flags.
     */
    disableCulling = false;

    private hasDrawn = false;

    constructor(
        coreModel: Live2DModelWebGL,
        settings: Cubism2ModelSettings,
        options?: InternalModelOptions,
    ) {
        super();

        this.coreModel = coreModel;
        this.settings = settings;
        this.motionManager = new Cubism2MotionManager(settings, options);
        this.eyeBlink = new Live2DEyeBlink(coreModel);

        this.eyeballXParamIndex = coreModel.getParamIndex("PARAM_EYE_BALL_X");
        this.eyeballYParamIndex = coreModel.getParamIndex("PARAM_EYE_BALL_Y");
        this.angleXParamIndex = coreModel.getParamIndex("PARAM_ANGLE_X");
        this.angleYParamIndex = coreModel.getParamIndex("PARAM_ANGLE_Y");
        this.angleZParamIndex = coreModel.getParamIndex("PARAM_ANGLE_Z");
        this.bodyAngleXParamIndex = coreModel.getParamIndex("PARAM_BODY_ANGLE_X");
        this.breathParamIndex = coreModel.getParamIndex("PARAM_BREATH");
        this.mouthOpenYParamIndex = coreModel.getParamIndex("PARAM_MOUTH_OPEN_Y");

        this.init();
    }

    protected init() {
        super.init();

        if (this.settings.initParams) {
            this.settings.initParams.forEach(({ id, value }) =>
                this.coreModel.setParamFloat(id, value),
            );
        }
        if (this.settings.initOpacities) {
            this.settings.initOpacities.forEach(({ id, value }) =>
                this.coreModel.setPartsOpacity(id, value),
            );
        }

        this.coreModel.saveParam();

        this.setBreathParameters([
            { parameterId: "PARAM_ANGLE_X", offset: 0, peak: 15, cycle: 6.5345, weight: 0.5 },
            { parameterId: "PARAM_ANGLE_Y", offset: 0, peak: 8, cycle: 3.5345, weight: 0.5 },
            { parameterId: "PARAM_ANGLE_Z", offset: 0, peak: 10, cycle: 5.5345, weight: 0.5 },
            { parameterId: "PARAM_BODY_ANGLE_X", offset: 0, peak: 4, cycle: 15.5345, weight: 0.5 },
            { parameterId: "PARAM_BREATH", offset: 0.5, peak: 0.5, cycle: 3.2345, weight: 1 },
        ]);

        const arr = this.coreModel.getModelContext()._$aS;

        if ((arr as unknown[])?.length) {
            this.drawDataCount = (arr as unknown[]).length;
        }

        let culling = this.coreModel.drawParamWebGL.culling;

        Object.defineProperty(this.coreModel.drawParamWebGL, "culling", {
            set: (v: boolean) => (culling = v),

            // always return false when disabled
            get: () => (this.disableCulling ? false : culling),
        });

        const clipManager = this.coreModel.getModelContext().clipManager;
        const originalSetupClip = clipManager.setupClip;

        // after setupClip(), the GL viewport will be set to [0, 0, canvas.width, canvas.height],
        // so we have to set it back
        clipManager.setupClip = (modelContext, drawParam) => {
            originalSetupClip.call(clipManager, modelContext, drawParam);

            drawParam.gl.viewport(...this.viewport);
        };
    }

    protected getSize(): [number, number] {
        return [this.coreModel.getCanvasWidth(), this.coreModel.getCanvasHeight()];
    }

    protected getLayout(): CommonLayout {
        const layout: CommonLayout = {};

        if (this.settings.layout) {
            for (const [key, value] of Object.entries(this.settings.layout)) {
                let commonKey = key;

                if (key === "center_x") {
                    commonKey = "centerX";
                } else if (key === "center_y") {
                    commonKey = "centerY";
                }

                layout[commonKey as keyof CommonLayout] = value;
            }
        }

        return layout;
    }

    updateWebGLContext(gl: WebGLRenderingContext, glContextID: number): void {
        const drawParamWebGL = this.coreModel.drawParamWebGL;

        drawParamWebGL.firstDraw = true;
        drawParamWebGL.setGL(gl);
        drawParamWebGL.glno = glContextID;

        // reset WebGL buffers
        for (const [key, value] of Object.entries(drawParamWebGL)) {
            if (value instanceof WebGLBuffer) {
                (drawParamWebGL as unknown as Record<string, WebGLBuffer | null>)[key] = null;
            }
        }

        const clipManager = this.coreModel.getModelContext().clipManager;
        clipManager.curFrameNo = glContextID;

        const framebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer;

        // force Live2D to re-create the framebuffer
        clipManager.getMaskRenderTexture();

        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    }

    bindTexture(index: number, texture: WebGLTexture): void {
        this.coreModel.setTexture(index, texture);
    }

    protected getHitAreaDefs(): CommonHitArea[] {
        return (
            this.settings.hitAreas?.map((hitArea) => ({
                id: hitArea.id,
                name: hitArea.name,
                index: this.coreModel.getDrawDataIndex(hitArea.id),
            })) || []
        );
    }

    getDrawableIDs(): string[] {
        const modelContext = this.coreModel.getModelContext();
        const ids = [];

        for (let i = 0; i < this.drawDataCount; i++) {
            const drawData = modelContext.getDrawData(i);

            if (drawData) {
                ids.push(drawData.getDrawDataID().id);
            }
        }

        return ids;
    }

    getDrawableIndex(id: string): number {
        return this.coreModel.getDrawDataIndex(id);
    }

    getDrawableVertices(drawIndex: number | string): Float32Array {
        if (typeof drawIndex === "string") {
            drawIndex = this.coreModel.getDrawDataIndex(drawIndex);

            if (drawIndex === -1) throw new TypeError("Unable to find drawable ID: " + drawIndex);
        }

        return this.coreModel.getTransformedPoints(drawIndex).slice();
    }

    override hitTest(x: number, y: number): string[] {
        if (!this.hasDrawn) {
            logger.warn(
                "Trying to hit-test a Cubism 2 model that has not been rendered yet. The result will always be empty since the draw data is not ready.",
            );
        }

        return super.hitTest(x, y);
    }

    update(dt: DOMHighResTimeStamp, now: DOMHighResTimeStamp): void {
        super.update(dt, now);

        const model = this.coreModel;

        this.emit("beforeMotionUpdate");

        const motionUpdated = this.motionManager.update(this.coreModel, now);

        this.emit("afterMotionUpdate");

        model.saveParam();

        this.motionManager.expressionManager?.update(model, now);

        if (!motionUpdated && this.eyeBlinkEnabled) {
            this.eyeBlink?.update(dt);
        }

        this.updateFocus();
        this.updateNaturalMovements(dt, now);
        this.updateLipSync();

        this.physics?.update(now);
        this.pose?.update(dt);

        this.emit("beforeModelUpdate");

        model.update();
        model.loadParam();
    }

    updateFocus() {
        // Update head angles (always, for natural head movement)
        this.coreModel.addToParamFloat(this.angleXParamIndex, this.focusController.x * 30);
        this.coreModel.addToParamFloat(this.angleYParamIndex, this.focusController.y * 30);
        this.coreModel.addToParamFloat(
            this.angleZParamIndex,
            this.focusController.x * this.focusController.y * -30,
        );
        this.coreModel.addToParamFloat(this.bodyAngleXParamIndex, this.focusController.x * 10);
        
        if (this.eyesAlwaysLookAtCamera) {
            // When eyes are locked to camera, compensate for head movement
            // Get current head angles to calculate compensation
            const currentAngleX = this.coreModel.getParamFloat(this.angleXParamIndex);
            const currentAngleY = this.coreModel.getParamFloat(this.angleYParamIndex);
            
            const eyeCompensationX = (currentAngleX / 30) * 1; // Over-compensate for stronger effect
            const eyeCompensationY = (currentAngleY / 30) * 1;
            
            // Eyes look at camera (0,0) plus compensation for head angle
            this.coreModel.setParamFloat(this.eyeballXParamIndex, -eyeCompensationX);
            this.coreModel.setParamFloat(this.eyeballYParamIndex, -eyeCompensationY);
        } else {
            // Normal eye movement following focus
            this.coreModel.addToParamFloat(this.eyeballXParamIndex, this.focusController.x);
            this.coreModel.addToParamFloat(this.eyeballYParamIndex, this.focusController.y);
        }
    }

    updateNaturalMovements(dt: DOMHighResTimeStamp, now: DOMHighResTimeStamp) {
        if (!this.breathEnabled) {
            return;
        }

        if (this.breathParameterEntries.length === 0) {
            return;
        }

        const t = (now / 1000) * 2 * Math.PI;
        const intensity = this.breathIntensity;
        const cycleScale = this.breathCycleScale;

        for (const parameter of this.breathParameterEntries) {
            const cycle = Math.max(0.001, parameter.cycle * cycleScale);
            const value = parameter.offset + parameter.peak * intensity * Math.sin(t / cycle);
            const weighted = value * (parameter.weight ?? 1);

            if (parameter.parameterIndex === this.breathParamIndex) {
                this.coreModel.setParamFloat(parameter.parameterIndex, weighted);
            } else {
                this.coreModel.addToParamFloat(parameter.parameterIndex, weighted);
            }
        }
    }

    override setBreathParameters(parameters: BreathParameter[]): void {
        this.breathParameters = parameters.map((parameter) => ({
            parameterId: parameter.parameterId,
            offset: Number.isFinite(parameter.offset) ? parameter.offset : 0,
            peak: Number.isFinite(parameter.peak) ? parameter.peak : 0,
            cycle: Number.isFinite(parameter.cycle) ? Math.max(0.001, parameter.cycle) : 0.001,
            weight: Number.isFinite(parameter.weight ?? 1) ? (parameter.weight ?? 1) : 1,
        }));

        const entries: BreathParameterEntry[] = [];

        for (const parameter of this.breathParameters) {
            const parameterIndex = this.coreModel.getParamIndex(parameter.parameterId);
            if (parameterIndex < 0) {
                continue;
            }
            entries.push({ ...parameter, parameterIndex });
        }

        this.breathParameterEntries = entries;
    }

    override setBreathIntensity(intensity: number): void {
        const nextIntensity = Number.isFinite(intensity) ? Math.max(0, intensity) : 1;
        this.breathIntensity = nextIntensity;
    }

    override setBreathCycle(cycle: number): void {
        const nextCycle = Number.isFinite(cycle) ? Math.max(0.001, cycle) : 1;
        this.breathCycleScale = nextCycle;
    }

    updateLipSync() {
        // Apply lip sync
        if (this.lipSyncEnabled && this.mouthOpenYParamIndex >= 0) {
            this.coreModel.setParamFloat(this.mouthOpenYParamIndex, this.lipSyncValue);
        }
    }

    draw(gl: WebGLRenderingContext): void {
        const disableCulling = this.disableCulling;

        // culling must be disabled to get this cubism2 model drawn properly on a framebuffer
        if (gl.getParameter(gl.FRAMEBUFFER_BINDING)) {
            this.disableCulling = true;
        }

        const matrix = this.drawingMatrix;

        // set given 3x3 matrix into a 4x4 matrix
        tempMatrixArray[0] = matrix.a;
        tempMatrixArray[1] = matrix.b;
        tempMatrixArray[4] = matrix.c;
        tempMatrixArray[5] = matrix.d;
        tempMatrixArray[12] = matrix.tx;
        tempMatrixArray[13] = matrix.ty;

        this.coreModel.setMatrix(tempMatrixArray);
        this.coreModel.draw();

        this.hasDrawn = true;
        this.disableCulling = disableCulling;
    }

    destroy() {
        super.destroy();

        // cubism2 core has a super dumb memory management so there's basically nothing much to do to release the model
        (this as Partial<this>).coreModel = undefined;
    }
}
