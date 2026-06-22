import { ImageData } from '../../src/utils/image';
import { xnew } from '../../src/index';

describe('ImageData', () => {
    it('wraps an existing canvas', () => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 48;
        const image = new ImageData(canvas);
        expect(image.canvas).toBe(canvas);
    });

    it('creates a new canvas at width × height', () => {
        const image = new ImageData(120, 90);
        expect(image.canvas.width).toBe(120);
        expect(image.canvas.height).toBe(90);
    });

    it('crop produces a new ImageData sized to the region', () => {
        const image = new ImageData(100, 100);
        const cropped = image.crop(10, 20, 30, 40);
        expect(cropped).toBeInstanceOf(ImageData);
        expect(cropped.canvas).not.toBe(image.canvas);
        expect(cropped.canvas.width).toBe(30);
        expect(cropped.canvas.height).toBe(40);
    });

    it('paste returns this for chaining and tolerates a null 2d context', () => {
        // jsdom has no canvas 2d context; paste must not throw (drawImage is guarded).
        const atlas = new ImageData(96, 96);
        const patch = new ImageData(32, 32);
        expect(atlas.paste(patch, 0, 0)).toBe(atlas);
        expect(atlas.paste(patch.canvas, 32, 0, 32, 32)).toBe(atlas); // scaled form, raw canvas source
    });

    it('is reachable through xnew.image.from', () => {
        const canvas = document.createElement('canvas');
        const image = xnew.image.from(canvas);
        expect(image).toBeInstanceOf(ImageData);
        expect(image.canvas).toBe(canvas);
    });
});
