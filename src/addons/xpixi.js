import xnew from 'xnew';
import * as PIXI from 'pixi.js'

export function setup({ renderer = null, camera = null })
{
    const pixi = {};
    xnew.extend((self) => {
        pixi.renderer = renderer ?? PIXI.autoDetectRenderer({});
        pixi.scene = new PIXI.Container();
        xnew.extend(Connect, pixi.scene);
        return {
            update() {
                pixi.renderer.render(pixi.scene);
            },
        }
    })
    return pixi;
}

export function nest(object)
{
    xnew.extend(Connect, object);
    return object;
}

export function Connect(self, object)
{
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
