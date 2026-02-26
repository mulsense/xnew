import xnew from '@mulsense/xnew';
import * as PIXI from 'pixi.js';

var xpixi = {
    initialize({ canvas = null } = {}) {
        xnew(Root, { canvas });
    },
    nest(object) {
        xnew(Nest, { object });
        return object;
    },
    get renderer() {
        var _a;
        return (_a = xnew.context(Root)) === null || _a === void 0 ? void 0 : _a.renderer;
    },
    get scene() {
        var _a;
        return (_a = xnew.context(Root)) === null || _a === void 0 ? void 0 : _a.scene;
    },
    get canvas() {
        var _a;
        return (_a = xnew.context(Root)) === null || _a === void 0 ? void 0 : _a.canvas;
    },
};
function Root(unit, { canvas }) {
    let renderer = null;
    xnew.promise(PIXI.autoDetectRenderer({
        width: canvas.width, height: canvas.height, view: canvas,
        antialias: true, backgroundAlpha: 0,
    })).then((value) => {
        renderer = value;
        xnew.resolve();
    });
    let scene = new PIXI.Container();
    return {
        get renderer() { return renderer; },
        get scene() { return scene; },
        get canvas() { return canvas; },
    };
}
function Nest(unit, { object }) {
    var _a, _b;
    const root = xnew.context(Root);
    const parent = (_b = (_a = xnew.context(Nest)) === null || _a === void 0 ? void 0 : _a.pixiObject) !== null && _b !== void 0 ? _b : root.scene;
    parent.addChild(object);
    unit.on('finalize', () => {
        parent.removeChild(object);
    });
    return {
        get pixiObject() { return object; },
    };
}

export { xpixi as default };
