//----------------------------------------------------------------------------------------------------
// image — Canvas wrapper for crop and download
//
// Lightweight wrapper around HTMLCanvasElement that adds the two operations the rest of the
// package needs: pulling a rectangular sub-canvas (crop) and triggering a browser download as PNG.
//
// - ImageData / ImageDataArgs : wraps an existing canvas, or creates a new one at width × height
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

    public download(filename: string) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }
}