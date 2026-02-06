import { Texture, Assets } from "pixi.js";

export async function createTexture(
    url: string,
    options: { crossOrigin?: string } = {},
): Promise<Texture> {
    try {
        // In Pixi.js v8, use Assets.load to load the texture from URL first
        const texture = await Assets.load(url);
        return texture;
    } catch (e) {
        if (e instanceof Error) {
            throw e;
        }

        // assume e is an ErrorEvent, let's convert it to an Error
        const err = new Error("Texture loading error");
        (err as any).event = e;

        throw err;
    }
}
