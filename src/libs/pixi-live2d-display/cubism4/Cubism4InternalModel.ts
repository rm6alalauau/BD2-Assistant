import type { InternalModelOptions } from "@/cubism-common";
import type { BreathParameter, CommonHitArea, CommonLayout } from "@/cubism-common/InternalModel";
import { InternalModel } from "@/cubism-common/InternalModel";
import type { Cubism4ModelSettings } from "@/cubism4/Cubism4ModelSettings";
import { Cubism4MotionManager } from "@/cubism4/Cubism4MotionManager";
import {
    ParamAngleX,
    ParamAngleY,
    ParamAngleZ,
    ParamBodyAngleX,
    ParamBreath,
    ParamEyeBallX,
    ParamEyeBallY,
    ParamEyeLOpen,
    ParamEyeROpen,
} from "@cubism/cubismdefaultparameterid";
import { BreathParameterData, CubismBreath } from "@cubism/effect/cubismbreath";
import { CubismEyeBlink } from "@cubism/effect/cubismeyeblink";
import type { CubismPose } from "@cubism/effect/cubismpose";
import { CubismMatrix44 } from "@cubism/math/cubismmatrix44";
import type { CubismModel } from "@cubism/model/cubismmodel";
import type { CubismModelUserData } from "@cubism/model/cubismmodeluserdata";
import type { CubismPhysics } from "@cubism/physics/cubismphysics";
import { CubismRenderer_WebGL, CubismShader_WebGL } from "@cubism/rendering/cubismrenderer_webgl";
import { Matrix } from "pixi.js";
import type { Mutable } from "../types/helpers";

const tempMatrix = new CubismMatrix44();

export class Cubism4InternalModel extends InternalModel {
    settings: Cubism4ModelSettings;
    coreModel: CubismModel;
    motionManager: Cubism4MotionManager;

    lipSync = true;

    breath = CubismBreath.create();
    eyeBlink?: CubismEyeBlink;
    private breathBaseParameters: BreathParameter[] = [];
    private breathIntensity = 1;
    private breathCycleScale = 1;

    declare pose?: CubismPose;
    declare physics?: CubismPhysics;

    // what's this for?
    userData?: CubismModelUserData;

    renderer = new CubismRenderer_WebGL();

    idParamAngleX = ParamAngleX;
    idParamAngleY = ParamAngleY;
    idParamAngleZ = ParamAngleZ;
    idParamEyeBallX = ParamEyeBallX;
    idParamEyeBallY = ParamEyeBallY;
    idParamBodyAngleX = ParamBodyAngleX;
    idParamBreath = ParamBreath;

    /**
     * The model's internal scale, defined in the moc3 file.
     */
    readonly pixelsPerUnit: number = 1;

    /**
     * Matrix that scales by {@link pixelsPerUnit}, and moves the origin from top-left to center.
     *
     * FIXME: This shouldn't be named as "centering"...
     */
    protected centeringTransform = new Matrix();

    constructor(
        coreModel: CubismModel,
        settings: Cubism4ModelSettings,
        options?: InternalModelOptions,
    ) {
        super();

        this.coreModel = coreModel;
        this.settings = settings;
        this.motionManager = new Cubism4MotionManager(settings, options);

        this.init();
    }

    protected init() {
        super.init();

        this.eyeBlink = CubismEyeBlink.create(this.settings);
        this.eyeBlink?.setBlinkingSetting(0.1, 0.1, 0.2);
        this.eyeBlink?.setBlinkingInterval(5);
        this.eyeBlink?.setParameterIds([ParamEyeROpen, ParamEyeLOpen]);
        this.setBreathParameters([
            { parameterId: this.idParamAngleX, offset: 0, peak: 15, cycle: 6.5345, weight: 0.5 },
            { parameterId: this.idParamAngleY, offset: 0, peak: 8, cycle: 3.5345, weight: 0.5 },
            { parameterId: this.idParamAngleZ, offset: 0, peak: 10, cycle: 5.5345, weight: 0.5 },
            { parameterId: this.idParamBodyAngleX, offset: 0, peak: 4, cycle: 15.5345, weight: 0.5 },
            { parameterId: this.idParamBreath, offset: 0, peak: 0.5, cycle: 3.2345, weight: 0.5 },
        ]);

        this.renderer.initialize(this.coreModel);
        this.renderer.setIsPremultipliedAlpha(true);
    }

    protected getSize(): [number, number] {
        return [
            this.coreModel.getModel().canvasinfo.CanvasWidth,
            this.coreModel.getModel().canvasinfo.CanvasHeight,
        ];
    }

    protected getLayout(): CommonLayout {
        const layout: CommonLayout = {};

        if (this.settings.layout) {
            // un-capitalize each key to satisfy the common layout format
            // e.g. CenterX -> centerX
            for (const [key, value] of Object.entries(this.settings.layout)) {
                const commonKey = key.charAt(0).toLowerCase() + key.slice(1);

                layout[commonKey as keyof CommonLayout] = value;
            }
        }

        return layout;
    }

    override setBreathParameters(parameters: BreathParameter[]): void {
        this.breathBaseParameters = parameters.map((parameter) => ({
            parameterId: parameter.parameterId,
            offset: Number.isFinite(parameter.offset) ? parameter.offset : 0,
            peak: Number.isFinite(parameter.peak) ? parameter.peak : 0,
            cycle: Number.isFinite(parameter.cycle) ? Math.max(0.001, parameter.cycle) : 0.001,
            weight: Number.isFinite(parameter.weight ?? 1) ? (parameter.weight ?? 1) : 1,
        }));
        this.applyBreathParameters();
    }

    override setBreathIntensity(intensity: number): void {
        const nextIntensity = Number.isFinite(intensity) ? Math.max(0, intensity) : 1;
        this.breathIntensity = nextIntensity;
        this.applyBreathParameters();
    }

    override setBreathCycle(cycle: number): void {
        const nextCycle = Number.isFinite(cycle) ? Math.max(0.001, cycle) : 1;
        this.breathCycleScale = nextCycle;
        this.applyBreathParameters();
    }

    private applyBreathParameters(): void {
        if (this.breathBaseParameters.length === 0) {
            return;
        }

        const parameters = this.breathBaseParameters.map(
            (parameter) =>
                new BreathParameterData(
                    parameter.parameterId,
                    parameter.offset,
                    parameter.peak * this.breathIntensity,
                    parameter.cycle * this.breathCycleScale,
                    parameter.weight ?? 1,
                ),
        );

        this.breath.setParameters(parameters);
    }

    protected setupLayout() {
        super.setupLayout();

        (this as Mutable<this>).pixelsPerUnit = this.coreModel.getModel().canvasinfo.PixelsPerUnit;

        // move the origin from top left to center
        this.centeringTransform
            .scale(this.pixelsPerUnit, this.pixelsPerUnit)
            .translate(this.originalWidth / 2, this.originalHeight / 2);
    }

    updateWebGLContext(gl: WebGLRenderingContext, glContextID: number): void {
        // reset resources that were bound to previous WebGL context
        this.renderer.firstDraw = true;
        this.renderer._bufferData = {
            vertex: null,
            uv: null,
            index: null,
        };
        this.renderer.startUp(gl);
        if (this.renderer._clippingManager) {
            this.renderer._clippingManager._currentFrameNo = glContextID;
            this.renderer._clippingManager._maskTexture = undefined;
        }
        CubismShader_WebGL.getInstance()._shaderSets = [];
    }

    bindTexture(index: number, texture: WebGLTexture): void {
        this.renderer.bindTexture(index, texture);
    }

    protected getHitAreaDefs(): CommonHitArea[] {
        return (
            this.settings.hitAreas?.map((hitArea) => ({
                id: hitArea.Id,
                name: hitArea.Name,
                index: this.coreModel.getDrawableIndex(hitArea.Id),
            })) ?? []
        );
    }

    getDrawableIDs(): string[] {
        return this.coreModel.getDrawableIds();
    }

    getDrawableIndex(id: string): number {
        return this.coreModel.getDrawableIndex(id);
    }

    getDrawableVertices(drawIndex: number | string): Float32Array {
        if (typeof drawIndex === "string") {
            drawIndex = this.coreModel.getDrawableIndex(drawIndex);

            if (drawIndex === -1) throw new TypeError("Unable to find drawable ID: " + drawIndex);
        }

        const arr = this.coreModel.getDrawableVertices(drawIndex).slice();

        for (let i = 0; i < arr.length; i += 2) {
            arr[i] = arr[i]! * this.pixelsPerUnit + this.originalWidth / 2;
            arr[i + 1] = -arr[i + 1]! * this.pixelsPerUnit + this.originalHeight / 2;
        }

        return arr;
    }

    updateTransform(transform: Matrix) {
        this.drawingMatrix
            .copyFrom(this.centeringTransform)
            .prepend(this.localTransform)
            .prepend(transform);
    }

    public update(dt: DOMHighResTimeStamp, now: DOMHighResTimeStamp): void {
        super.update(dt, now);

        // cubism4 uses seconds
        dt /= 1000;
        now /= 1000;

        const model = this.coreModel;

        this.emit("beforeMotionUpdate");

        const motionUpdated = this.motionManager.update(this.coreModel, now);

        this.emit("afterMotionUpdate");

        model.saveParameters();

        this.motionManager.expressionManager?.update(model, now);

        if (!motionUpdated && this.eyeBlinkEnabled) {
            this.eyeBlink?.updateParameters(model, dt);
        }

        this.updateFocus();

        // revert the timestamps to be milliseconds
        this.updateNaturalMovements(dt * 1000, now * 1000);

        // Apply lip sync
        if (this.lipSyncEnabled && this.motionManager.lipSyncIds.length > 0) {
            for (let i = 0; i < this.motionManager.lipSyncIds.length; ++i) {
                model.addParameterValueById(this.motionManager.lipSyncIds[i], this.lipSyncValue, 0.8);
            }
        }

        this.physics?.evaluate(model, dt);
        this.pose?.updateParameters(model, dt);

        this.emit("beforeModelUpdate");

        model.update();
        model.loadParameters();
    }

    updateFocus() {
        // Update head angles (always, for natural head movement)
        this.coreModel.addParameterValueById(this.idParamAngleX, this.focusController.x * 30); // -30 ~ 30
        this.coreModel.addParameterValueById(this.idParamAngleY, this.focusController.y * 30);
        this.coreModel.addParameterValueById(
            this.idParamAngleZ,
            this.focusController.x * this.focusController.y * -30,
        );
        this.coreModel.addParameterValueById(this.idParamBodyAngleX, this.focusController.x * 10); // -10 ~ 10
        
        if (this.eyesAlwaysLookAtCamera) {
            // When eyes are locked to camera, compensate for head movement
            // Get current head angles to calculate compensation
            const currentAngleX = this.coreModel.getParameterValueById(this.idParamAngleX);
            const currentAngleY = this.coreModel.getParameterValueById(this.idParamAngleY);
            
            // Compensate eye position to counteract head rotation
            // Higher compensation factor for stronger "looking at user" effect
            const eyeCompensationX = (currentAngleX / 30) * 1; // Over-compensate for stronger effect
            const eyeCompensationY = (currentAngleY / 30) * 1;
            console.log(`Eye Compensation - X: ${eyeCompensationX}, Y: ${eyeCompensationY}`);
            // Eyes look at camera (0,0) plus compensation for head angle
            this.coreModel.setParameterValueById(this.idParamEyeBallX, -eyeCompensationX);
            this.coreModel.setParameterValueById(this.idParamEyeBallY, -eyeCompensationY);
        } else {
            // Normal eye movement following focus
            this.coreModel.addParameterValueById(this.idParamEyeBallX, this.focusController.x); // -1 ~ 1
            this.coreModel.addParameterValueById(this.idParamEyeBallY, this.focusController.y);
        }
    }

    updateNaturalMovements(dt: DOMHighResTimeStamp, now: DOMHighResTimeStamp) {
        if (this.breathEnabled) {
            this.breath?.updateParameters(this.coreModel, dt / 1000);
        }
        if (this.eyeBlinkEnabled) {
            this.eyeBlink?.updateParameters(this.coreModel, dt / 1000);
        }
    }

    draw(gl: WebGLRenderingContext): void {
        const matrix = this.drawingMatrix;
        const array = tempMatrix.getArray();

        // set given 3x3 matrix into a 4x4 matrix, with Y inverted
        array[0] = matrix.a;
        array[1] = matrix.b;
        array[4] = -matrix.c;
        array[5] = -matrix.d;
        array[12] = matrix.tx;
        array[13] = matrix.ty;

        this.renderer.setMvpMatrix(tempMatrix);
        this.renderer.setRenderState(gl.getParameter(gl.FRAMEBUFFER_BINDING), this.viewport);
        this.renderer.drawModel();
    }

    destroy() {
        super.destroy();

        this.renderer.release();
        this.coreModel.release();

        (this as Partial<this>).renderer = undefined;
        (this as Partial<this>).coreModel = undefined;
    }
}
