import xnew from 'xnew';
import * as PIXI from 'pixi.js'

export default {
    initialize({ renderer = null }: any = {}) {
        xnew.extend(Root, { renderer });
    },
    nest(object: any) {
        xnew.extend(Connect, object);
        return object;
    },
    insert(canvas: any) {
        const texture = PIXI.Texture.from(canvas);
        const object = new PIXI.Sprite(texture);
        xnew.extend(Connect, object);
        xnew(PreUpdate, () => {
            object.texture.source.update();
        });
    },
    get renderer() {
        return xnew.context('xpixi.root')?.renderer;
    },
    get scene() {
        return xnew.context('xpixi.root')?.scene;
    },
};

function Root(self: xnew.Unit, { renderer = null }: any) {
    const root: { [key: string]: any } = {};
    xnew.context('xpixi.root', root);
    
    let data: any;
    if (renderer !== null) {
        data = renderer;
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
    xnew.extend(Connect, root.scene);
    return {
        update() {
            root.updates.forEach((update: any) => {
                update();
            });
            if (root.renderer && root.scene) {
                root.renderer.render(root.scene);
            }
        },
    }
}

function Connect(self: xnew.Unit, object: any) {
    const parent = xnew.context('xpixi.object');
    xnew.context('xpixi.object', object);

    if (parent) {
        parent.addChild(object);
        return {
            finalize() {
                parent.removeChild(object);
            },
        }
    }
}

function PreUpdate(self: xnew.Unit, callback: any) {
    const root = xnew.context('xpixi.root');

    root.updates.push(callback);
    return {
        finalize() {
            root.updates = root.updates.filter((update: any) => update !== callback);
        },
    }
}