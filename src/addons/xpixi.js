import xnew from 'xnew';
import * as PIXI from 'pixi.js'

export default function xpixi() {
}

Object.defineProperty(xpixi, 'setup', { enumerable: true, value: setup });
Object.defineProperty(xpixi, 'initialize', { enumerable: true, value: initialize });
Object.defineProperty(xpixi, 'renderer', { enumerable: true, get: renderer });
Object.defineProperty(xpixi, 'scene', { enumerable: true, get: scene });
Object.defineProperty(xpixi, 'nest', { enumerable: true, value: nest });

function setup({ renderer = null } = {}) {
    xnew.extend(Root, { renderer });
}

function initialize({ renderer = null } = {}) {
    xnew.extend(Root, { renderer });
}

function renderer() {
    return xnew.context('xpixi.root')?.renderer;
}

function scene() {
    return xnew.context('xpixi.root')?.scene;
}

function nest(object) {
    xnew.extend(Connect, object);
    return object;
}

function Root(self, { renderer }) {
    const root = {};
    xnew.context('xpixi.root', root);
    
    if (renderer === null) {
        const screens = xnew.find(xnew.Screen);
        if (screens.length > 0) {
            const screen = screens.slice(-1)[0]; // last screen
            renderer = PIXI.autoDetectRenderer({
                width: screen.canvas.width, height: screen.canvas.height, view: screen.canvas,
                backgroundAlpha: 0.0, antialias: true,
            });
        } else {
            renderer = PIXI.autoDetectRenderer({});
        }
    }
    root.renderer = null;

    if (renderer instanceof Promise) {
        xnew.promise(renderer).then((renderer) => root.renderer = renderer);
    }

    root.scene = new PIXI.Container();
    xnew.extend(Connect, root.scene);
    return {
        update() {
            if (root.renderer && root.scene) {
                root.renderer.render(root.scene);
            }
        },
    }
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
        }
    }
}
