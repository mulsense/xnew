import xnew from 'xnew';
import * as PIXI from 'pixi.js';

function xpixi() {
}

Object.defineProperty(xpixi, 'setup', { enumerable: true, value: setup });
Object.defineProperty(xpixi, 'renderer', { enumerable: true, get: renderer });
Object.defineProperty(xpixi, 'scene', { enumerable: true, get: scene });
Object.defineProperty(xpixi, 'nest', { enumerable: true, value: nest });

function setup({ renderer = null, camera = null })
{
    xnew.extend(Root, { renderer, camera });
}

function renderer()
{
    return xnew.context('xpixi.root')?.renderer;
}

function scene()
{
    return xnew.context('xpixi.root')?.scene;
}

function nest(object)
{
    xnew.extend(Connect, object);
    return object;
}

function Root(self, { renderer, camera })
{
    const root = {};
    xnew.context('xpixi.root', root);
    root.renderer = renderer ?? PIXI.autoDetectRenderer({});
    root.scene = new PIXI.Container();
    xnew.extend(Connect, root.scene);
    return {
        update() {
            root.renderer.render(root.scene);
        },
    }
}

function Connect(self, object)
{
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

export { xpixi as default };
