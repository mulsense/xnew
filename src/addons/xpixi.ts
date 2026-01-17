import xnew from '@mulsense/xnew';
import * as PIXI from 'pixi.js'
import { createCanvasElement } from 'three';

export default {
    initialize(
        { renderer = null, canvas = null, update = true }:
        { renderer?: any, canvas?: HTMLCanvasElement | null, update?: boolean } = {}
    ) {
        xnew.extend(Root, { renderer, canvas, update });
    },
    nest(object: any) {
        xnew.extend(Nest, { object });
        return object;
    },
    sync(canvas: any) {
        const texture = PIXI.Texture.from(canvas);
        xnew(PreUpdate, () => {
            texture.source.update();
        });
        return texture;
    },
    get renderer() {
        return xnew.context('xpixi.root')?.renderer;
    },
    get scene() {
        return xnew.context('xpixi.root')?.scene;
    },
    get canvas() {
        return xnew.context('xpixi.root')?.canvas;
    },
};

function Root(unit: xnew.Unit, { canvas, update }: any) {
    const root: { [key: string]: any } = {};
    xnew.context('xpixi.root', root);
    root.canvas = canvas;
    
    root.renderer = null;
    xnew.promise(PIXI.autoDetectRenderer({
        width: canvas.width, height: canvas.height, view: canvas,
        antialias: true, backgroundAlpha: 0,
    })).then((renderer: any) => root.renderer = renderer);

    root.updates = [];
    root.scene = new PIXI.Container();
    xnew.context('xpixi.object', root.scene);

    if (update === true) {
        unit.on('update', () => {
            root.updates.forEach((update: any) => {
                update();
            });
            root.renderer.render(root.scene);
        });
    }
}

function Nest(unit: xnew.Unit, { object }: { object: any }) {
    const parent = xnew.context('xpixi.object');
    xnew.context('xpixi.object', object);

    parent.addChild(object);
    unit.on('finalize', () => {
        parent.removeChild(object);
    });
}

function PreUpdate(unit: xnew.Unit, callback: any) {
    const root = xnew.context('xpixi.root');

    root.updates.push(callback);
    unit.on('finalize', () => {
        root.updates = root.updates.filter((update: any) => update !== callback);
    });
}