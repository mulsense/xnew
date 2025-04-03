import xnew from 'xnew';
import * as PIXI from 'pixi.js'

export function Root(self, { renderer = null }) {
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

export function nest(object) {
    xnew.extend(Connect, object);
    return object;
}

export function Connect(self, object) {
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
