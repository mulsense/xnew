//----------------------------------------------------------------------------------------------------
// image — Canvas wrapper for crop / paste / download
//
// Lightweight wrapper around HTMLCanvasElement that adds the operations the rest of the package
// needs: pulling a rectangular sub-canvas (crop), stamping another canvas onto this one as a patch
// (paste — the inverse of crop), and triggering a browser download as PNG. Together crop/paste let
// callers assemble or disassemble atlas-style canvases without a dedicated sprite-sheet type.
//
// - ImageData / ImageDataArgs : wraps an existing canvas, or creates a new one at width × height
// - image                     : public facade (xnew.image) — `from(canvas)` builds an ImageData
//----------------------------------------------------------------------------------------------------

export type ImageDataArgs = [canvas: HTMLCanvasElement] | [width: number, height: number];

export class ImageData {
    public canvas: HTMLCanvasElement;

    constructor(canvas: HTMLCanvasElement);
    constructor(width: number, height: number);
    constructor(...args: ImageDataArgs) {
        if (args[0] instanceof HTMLCanvasElement) {
            this.canvas = args[0];
        } else {
            const canvas = document.createElement('canvas') as HTMLCanvasElement;
            canvas.width = args[0];
            canvas.height = args[1]!;
            this.canvas = canvas;
        }
    }

    public crop(x: number, y: number, width: number, height: number) {
        const canvas = document.createElement('canvas') as HTMLCanvasElement;
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')?.drawImage(this.canvas, x, y, width, height, 0, 0, width, height);
        return new ImageData(canvas);
    }

    // Inverse of crop: stamp `source` onto this canvas at (x, y). The patch keeps its native size
    // unless `width`/`height` are given, in which case it is scaled to fit. Returns this for chaining.
    public paste(source: ImageData | CanvasImageSource, x: number, y: number, width?: number, height?: number) {
        const patch = source instanceof ImageData ? source.canvas : source;
        const context = this.canvas.getContext('2d');
        if (width !== undefined && height !== undefined) {
            context?.drawImage(patch, x, y, width, height);
        } else {
            context?.drawImage(patch, x, y);
        }
        return this;
    }

    public download(filename: string) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }
}

//----------------------------------------------------------------------------------------------------
// image — public facade exposed as xnew.image
//----------------------------------------------------------------------------------------------------

export const image = {
    from(canvas: HTMLCanvasElement): ImageData {
        return new ImageData(canvas);
    },
};
