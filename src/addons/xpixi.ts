import xnew from '@mulsense/xnew';
import * as PIXI from 'pixi.js'

export default {
    initialize({ renderer = null, canvas = null }: any = {}) {
        xnew.extend(Root, { renderer, canvas });
    },
    nest(object: any) {
        xnew.extend(Nest, { object });
        return object;
    },
    sync(canvas: any) {
        const texture = PIXI.Texture.from(canvas);
        xnew(PreUpdate, () => {
            texture.source.update();
        });
        return texture;
    },
    get renderer() {
        return xnew.context('xpixi.root')?.renderer;
    },
    get scene() {
        return xnew.context('xpixi.root')?.scene;
    },
    get canvas() {
        return xnew.context('xpixi.root')?.canvas;
    },
};

function Root(self: xnew.Unit, { canvas }: any) {
    const root: { [key: string]: any } = {};
    xnew.context('xpixi.root', root);
    root.canvas = canvas;
    
    const renderer = PIXI.autoDetectRenderer({
        width: canvas.width, height: canvas.height, view: canvas,
        antialias: true, backgroundAlpha: 0,
    });
    root.renderer = null;

    if (renderer instanceof Promise) {
        xnew.promise(renderer).then((renderer: any) => root.renderer = renderer);
    } else {
        root.renderer = renderer;
    }

    root.updates = [];
    root.scene = new PIXI.Container();
    xnew.context('xpixi.object', root.scene);

    self.on('-update', () => {
        root.updates.forEach((update: any) => {
            update();
        });
        if (root.renderer && root.scene) {
            root.renderer.render(root.scene);
        }
    });
}

function Nest(self: xnew.Unit, { object }: { object: any }) {
    const parent = xnew.context('xpixi.object');
    xnew.context('xpixi.object', object);

    parent.addChild(object);
    self.on('-finalize', () => {
        parent.removeChild(object);
    });
}

function PreUpdate(self: xnew.Unit, callback: any) {
    const root = xnew.context('xpixi.root');

    root.updates.push(callback);
    self.on('-finalize', () => {
        root.updates = root.updates.filter((update: any) => update !== callback);
    });
}