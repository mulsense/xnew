import xnew from 'xnew';

export function Main(self, { canvas }) {
    const renderer = PIXI.autoDetectRenderer({ width: canvas.width, height: canvas.height, view: canvas, backgroundColor: '#FFF' });

    const scene = new PIXI.Container();

    xnew.extend(Connect, scene);

    return {
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
