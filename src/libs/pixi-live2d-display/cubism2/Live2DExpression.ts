/// <reference path="../../core/live2d.d.ts" />
import { config } from "@/config";
import type { Cubism2Spec } from "../types/Cubism2Spec";

export class Live2DExpression {
    readonly params: NonNullable<Cubism2Spec.ExpressionJSON["params"]> = [];
    
    private fadeInTime = 0;
    private fadeOutTime = 0;

    constructor(json: Cubism2Spec.ExpressionJSON) {

        this.fadeInTime = json.fade_in! > 0 ? json.fade_in! : config.expressionFadingDuration;
        this.fadeOutTime = json.fade_out! > 0 ? json.fade_out! : config.expressionFadingDuration;

        if (Array.isArray(json.params)) {
            json.params.forEach((param) => {
                const calc = param.calc || "add";

                if (calc === "add") {
                    const defaultValue = param.def || 0;
                    param.val -= defaultValue;
                } else if (calc === "mult") {
                    const defaultValue = param.def || 1;
                    param.val /= defaultValue;
                }

                this.params.push({
                    calc,
                    val: param.val,
                    id: param.id,
                });
            });
        }
    }

    setFadeIn(time: number): void {
        this.fadeInTime = time;
    }

    setFadeOut(time: number): void {
        this.fadeOutTime = time;
    }

    updateParam(model: Live2DModelWebGL, entry: unknown): void {
        this.updateParamExe(model, 0, 1, entry);
    }

    /** @override */
    updateParamExe(model: Live2DModelWebGL, time: number, weight: number, motionQueueEnt: unknown) {
        this.params.forEach((param) => {
            // this algorithm seems to be broken for newer Neptunia series models, have no idea
            //
            // switch (param.type) {
            //     case ParamCalcType.Set:
            //         model.setParamFloat(param.id, param.value, weight);
            //         break;
            //     case ParamCalcType.Add:
            //         model.addToParamFloat(param.id, param.value * weight);
            //         break;
            //     case ParamCalcType.Mult:
            //         model.multParamFloat(param.id, param.value, weight);
            //         break;
            // }

            // this works fine for any model
            model.setParamFloat(param.id, param.val * weight);
        });
    }
}
