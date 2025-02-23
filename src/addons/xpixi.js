import xnew from 'xnew';

export function BaseSystem(self, { renderer = null }) {
    renderer = renderer ?? PIXI.autoDetectRenderer({});

    const scene = new PIXI.Container();

    xnew.extend(Connect, scene);

    return {
        get renderer() {
            return renderer;
        },
        get scene() {
            return scene;
        },
        update() {
            renderer.render(scene);
        },
    }
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
