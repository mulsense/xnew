import xnew from 'xnew';
import * as PIXI from 'pixi.js';

var xpixi = {
    initialize({ renderer = null, canvas = null } = {}) {
        xnew.extend(Root, { renderer, canvas });
    },
    nest(object) {
        xnew.extend(Nest, object);
        return object;
    },
    connect(canvas) {
        const texture = PIXI.Texture.from(canvas);
        const object = new PIXI.Sprite(texture);
        xnew(Nest, object);
        xnew(PreUpdate, () => {
            object.texture.source.update();
        });
        return object;
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
function Root(self, { renderer, canvas }) {
    const root = {};
    xnew.context('xpixi.root', root);
    let data;
    if (renderer !== null) {
        data = renderer;
    }
    else if (canvas !== null) {
        data = PIXI.autoDetectRenderer({
            width: canvas.width, height: canvas.height, view: canvas,
            antialias: true, backgroundAlpha: 0,
        });
    }
    else {
        const screens = xnew.find(null, xnew.Screen);
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
    xnew.extend(Nest, root.scene);
    self.on('update', () => {
        root.updates.forEach((update) => {
            update();
        });
        if (root.renderer && root.scene) {
            root.renderer.render(root.scene);
        }
    });
}
function Nest(self, object) {
    const parent = xnew.context('xpixi.object');
    xnew.context('xpixi.object', object);
    if (parent) {
        parent.addChild(object);
        self.on('finalize', () => {
            parent.removeChild(object);
        });
    }
}
function PreUpdate(self, callback) {
    const root = xnew.context('xpixi.root');
    root.updates.push(callback);
    self.on('finalize', () => {
        root.updates = root.updates.filter((update) => update !== callback);
    });
}

export { xpixi as default };
