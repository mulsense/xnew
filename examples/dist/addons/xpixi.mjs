import xnew from '@mulsense/xnew';
import * as PIXI from 'pixi.js';

var xpixi = {
    initialize({ renderer = null, canvas = null } = {}) {
        xnew.extend(Root, { renderer, canvas });
    },
    nest(object) {
        xnew.extend(Nest, { object });
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
    get canvas() {
        var _a;
        return (_a = xnew.context('xpixi.root')) === null || _a === void 0 ? void 0 : _a.canvas;
    },
};
function Root(unit, { canvas }) {
    const root = {};
    xnew.context('xpixi.root', root);
    root.canvas = canvas;
    root.renderer = null;
    xnew.promise(PIXI.autoDetectRenderer({
        width: canvas.width, height: canvas.height, view: canvas,
        antialias: true, backgroundAlpha: 0,
    })).then((renderer) => root.renderer = renderer);
    root.scene = new PIXI.Container();
    xnew.context('xpixi.object', root.scene);
}
function Nest(unit, { object }) {
    const parent = xnew.context('xpixi.object');
    xnew.context('xpixi.object', object);
    parent.addChild(object);
    unit.on('finalize', () => {
        parent.removeChild(object);
    });
}

export { xpixi as default };
