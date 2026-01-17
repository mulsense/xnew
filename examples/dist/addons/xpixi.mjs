import xnew from '@mulsense/xnew';
import * as PIXI from 'pixi.js';

var xpixi = {
    initialize({ renderer = null, canvas = null, update = true } = {}) {
        xnew.extend(Root, { renderer, canvas, update });
    },
    nest(object) {
        xnew.extend(Nest, { object });
        return object;
    },
    sync(canvas) {
        const texture = PIXI.Texture.from(canvas);
        xnew(PreUpdate, () => {
            texture.source.update();
        });
        return texture;
    },
    get renderer() {
        var _a;
        return (_a = xnew.context('xpixi.root')) === null || _a === void 0 ? void 0 : _a.renderer;
    },
    get scene() {
        var _a;
        return (_a = xnew.context('xpixi.root')) === null || _a === void 0 ? void 0 : _a.scene;
    },
    get canvas() {
        var _a;
        return (_a = xnew.context('xpixi.root')) === null || _a === void 0 ? void 0 : _a.canvas;
    },
};
function Root(unit, { canvas, update }) {
    const root = {};
    xnew.context('xpixi.root', root);
    root.canvas = canvas;
    root.renderer = null;
    xnew.promise(PIXI.autoDetectRenderer({
        width: canvas.width, height: canvas.height, view: canvas,
        antialias: true, backgroundAlpha: 0,
    })).then((renderer) => root.renderer = renderer);
    root.updates = [];
    root.scene = new PIXI.Container();
    xnew.context('xpixi.object', root.scene);
    if (update === true) {
        unit.on('update', () => {
            root.updates.forEach((update) => {
                update();
            });
            root.renderer.render(root.scene);
        });
    }
}
function Nest(unit, { object }) {
    const parent = xnew.context('xpixi.object');
    xnew.context('xpixi.object', object);
    parent.addChild(object);
    unit.on('finalize', () => {
        parent.removeChild(object);
    });
}
function PreUpdate(unit, callback) {
    const root = xnew.context('xpixi.root');
    root.updates.push(callback);
    unit.on('finalize', () => {
        root.updates = root.updates.filter((update) => update !== callback);
    });
}

export { xpixi as default };
