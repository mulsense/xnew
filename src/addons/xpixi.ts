import xnew from '@mulsense/xnew';
import * as PIXI from 'pixi.js'
import { createCanvasElement } from 'three';

export default {
    initialize(
        { renderer = null, canvas = null }:
        { renderer?: any, canvas?: HTMLCanvasElement | null } = {}
    ) {
        xnew.extend(Root, { renderer, canvas });
    },
    nest(object: any) {
        xnew.extend(Nest, { object });
        return object;
    },
    get renderer() {
        return xnew.context('xpixi.root')?.renderer;
    },
    get scene(): PIXI.Container {
        return xnew.context('xpixi.root')?.scene;
    },
    get canvas(): HTMLCanvasElement {
        return xnew.context('xpixi.root')?.canvas;
    },
};

function Root(unit: xnew.Unit, { canvas }: any) {
    const root: { [key: string]: any } = {};
    xnew.context('xpixi.root', root);
    root.canvas = canvas;
    
    root.renderer = null;
    xnew.promise(PIXI.autoDetectRenderer({
        width: canvas.width, height: canvas.height, view: canvas,
        antialias: true, backgroundAlpha: 0,
    })).then((renderer: any) => root.renderer = renderer);

    root.scene = new PIXI.Container();
    xnew.context('xpixi.object', root.scene);
}

function Nest(unit: xnew.Unit, { object }: { object: any }) {
    const parent = xnew.context('xpixi.object');
    xnew.context('xpixi.object', object);

    parent.addChild(object);
    unit.on('finalize', () => {
        parent.removeChild(object);
    });
    return {
        get pixiObject() { return object; },
    }
}