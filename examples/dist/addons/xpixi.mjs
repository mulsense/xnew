import xnew from 'xnew';
import * as PIXI from 'pixi.js';

var xpixi = {
    initialize({ renderer = null } = {}) {
        xnew.extend(Root, { renderer });
    },
    nest(object) {
        xnew.extend(Connect, object);
        return object;
    },
    canvas(canvas) {
        const texture = PIXI.Texture.from(canvas);
        const object = new PIXI.Sprite(texture);
        xnew.extend(Connect, object);
        xnew(PreUpdate, () => {
            object.texture.source.update();
        });
    },
    get renderer() {
        var _a;
        return (_a = xnew.context('xpixi.root')) === null || _a === void 0 ? void 0 : _a.renderer;
    },
    get scene() {
        var _a;
        return (_a = xnew.context('xpixi.root')) === null || _a === void 0 ? void 0 : _a.scene;
    },
};
function Root(self, { renderer = null }) {
    const root = {};
    xnew.context('xpixi.root', root);
    let data;
    if (renderer !== null) {
        data = renderer;
    }
    else {
        const screens = xnew.find(xnew.Screen);
        if (screens.length > 0) {
            const screen = screens.slice(-1)[0]; // last screen
            data = PIXI.autoDetectRenderer({
                width: screen.canvas.width, height: screen.canvas.height, view: screen.canvas,
                antialias: true, backgroundAlpha: 0,
            });
        }
        else {
            data = PIXI.autoDetectRenderer({});
        }
    }
    root.renderer = null;
    if (data instanceof Promise) {
        xnew.promise(data).then((renderer) => root.renderer = renderer);
    }
    else if ((PIXI.WebGPURenderer && data instanceof PIXI.WebGPURenderer) ||
        (PIXI.WebGLRenderer && data instanceof PIXI.WebGLRenderer)) {
        root.renderer = data;
    }
    root.updates = [];
    root.scene = new PIXI.Container();
    xnew.extend(Connect, root.scene);
    return {
        update() {
            root.updates.forEach((update) => {
                update();
            });
            if (root.renderer && root.scene) {
                root.renderer.render(root.scene);
            }
        },
    };
}
function Connect(self, object) {
    const parent = xnew.context('xpixi.object');
    xnew.context('xpixi.object', object);
    if (parent) {
        parent.addChild(object);
        return {
            finalize() {
                parent.removeChild(object);
            },
        };
    }
}
function PreUpdate(self, callback) {
    const root = xnew.context('xpixi.root');
    root.updates.push(callback);
    return {
        finalize() {
            root.updates = root.updates.filter((update) => update !== callback);
        },
    };
}

export { xpixi as default };
