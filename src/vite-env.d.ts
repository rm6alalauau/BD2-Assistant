/// <reference types="vite/client" />

declare module '*?script' {
    const content: string;
    export default content;
}

declare module '@jannchie/pixi-live2d-display/src/index.ts';
