import xnew from 'xnew';
import * as PIXI from 'pixi.js';

function Root(self, { renderer = null }) {
    const pixi = {};

    pixi.renderer = renderer ?? PIXI.autoDetectRenderer({});
    pixi.scene = new PIXI.Container();

    xnew.extend(Connect, pixi.scene);

    return {
        get pixi() {
            return pixi;
        },
        update() {
            pixi.renderer.render(pixi.scene);
        },
    }
}

function nest(object) {
    xnew.extend(Connect, object);
    return object;
}

function Connect(self, object) {
    const parent = xnew.context('xpixi.Connect');
    xnew.context('xpixi.Connect', object);

    if (parent) {
        parent.addChild(object);
        return {
            finalize() {
                parent.removeChild(object);
            },
        }
    }
}

export { Connect, Root, nest };
