
export type XImageArgs = [canvas: HTMLCanvasElement] | [width: number, height: number];

export class XImage {
    public canvas: HTMLCanvasElement;

    constructor(canvas: HTMLCanvasElement);
    constructor(width: number, height: number);
    constructor(...args: XImageArgs) {
        if (args[0] instanceof HTMLCanvasElement) {
            this.canvas = args[0];
        } else {
            const canvas = document.createElement('canvas') as HTMLCanvasElement;
            canvas.width = args[0];
            canvas.height = args[1]!;
            this.canvas = canvas;
        }
    }

    public clip(x: number, y: number, width: number, height: number) {
        const canvas = document.createElement('canvas') as HTMLCanvasElement;
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')?.drawImage(this.canvas, x, y, width, height, 0, 0, width, height);
        return new XImage(canvas);
    }

    public download(filename: string) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }
}