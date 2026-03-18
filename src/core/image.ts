
export type CraftImageArgs = [canvas: HTMLCanvasElement] | [width: number, height: number];

export class CraftImage {
    public canvas: HTMLCanvasElement;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
    }

    public static from(canvas: HTMLCanvasElement): CraftImage;
    public static from(width: number, height: number): CraftImage;

    public static from(...args: any[]): CraftImage {
        if (args[0] instanceof HTMLCanvasElement) {
            return new CraftImage(args[0]);
        } else {
            const canvas = document.createElement('canvas') as HTMLCanvasElement;
            canvas.width = args[0];
            canvas.height = args[1];
            return new CraftImage(canvas);
        }
    }

    public clip(x: number, y: number, width: number, height: number) {
        const canvas = document.createElement('canvas') as HTMLCanvasElement;
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')?.drawImage(this.canvas, x, y, width, height, 0, 0, width, height);
        return new CraftImage(canvas);
    }

    public download(filename: string) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }
}