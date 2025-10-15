import xnew from 'xnew';
import * as PIXI from 'pixi.js'

export default {
    initialize({ renderer = null, canvas = null }: any = {}) {
        xnew.extend(Root, { renderer, canvas });
    },
    nest(object: any) {
        xnew.extend(Nest, object);
        return object;
    },
    connect(canvas: any) {
        const texture = PIXI.Texture.from(canvas);
        const object = new PIXI.Sprite(texture);
        xnew(Nest, object);
        xnew(PreUpdate, () => {
            object.texture.source.update();
        });
        return object;
    },
    get renderer() {
        return xnew.context('xpixi.root')?.renderer;
    },
    get scene() {
        return xnew.context('xpixi.root')?.scene;
    },
};

function Root(self: xnew.Unit, { renderer, canvas }: any) {
    const root: { [key: string]: any } = {};
    xnew.context('xpixi.root', root);
    
    let data: any;
    if (renderer !== null) {
        data = renderer;
    } else if (canvas !== null) {
        data = PIXI.autoDetectRenderer({
            width: canvas.width, height: canvas.height, view: canvas,
            antialias: true, backgroundAlpha: 0,
        });
        
    } else {
        const screens = xnew.find(xnew.Screen);
        if (screens.length > 0) {
            const screen = screens.slice(-1)[0]; // last screen
            data = PIXI.autoDetectRenderer({
                width: screen.canvas.width, height: screen.canvas.height, view: screen.canvas,
                antialias: true, backgroundAlpha: 0,
            });
        } else {
            data = PIXI.autoDetectRenderer({});
        }
    }
    root.renderer = null;

    if (data instanceof Promise) {
        xnew.promise(data).then((renderer: any) => root.renderer = renderer);
    } else if (
        (PIXI.WebGPURenderer && data instanceof PIXI.WebGPURenderer) ||
        (PIXI.WebGLRenderer && data instanceof PIXI.WebGLRenderer)
    ) {
        root.renderer = data;
    }

    root.updates = [];

    root.scene = new PIXI.Container();
    xnew.extend(Nest, root.scene);
    self.on('update', () => {
        root.updates.forEach((update: any) => {
            update();
        });
        if (root.renderer && root.scene) {
            root.renderer.render(root.scene);
        }
    });
}

function Nest(self: xnew.Unit, object: any) {
    const parent = xnew.context('xpixi.object');
    xnew.context('xpixi.object', object);

    if (parent) {
        parent.addChild(object);
        self.on('finalize', () => {
            parent.removeChild(object);
        });
    }
}

function PreUpdate(self: xnew.Unit, callback: any) {
    const root = xnew.context('xpixi.root');

    root.updates.push(callback);
    self.on('finalize', () => {
        root.updates = root.updates.filter((update: any) => update !== callback);
    });
}