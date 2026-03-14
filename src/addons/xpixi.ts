import xnew from '@mulsense/xnew';
import * as PIXI from 'pixi.js'

export default {
    initialize(
        { canvas = null }:
        { canvas?: HTMLCanvasElement | null } = {}
    ) {
        xnew.promise(xnew(Root, { canvas }));
    },
    nest(object: any) {
        xnew(Nest, { object });
        xnew.extend(() => {
            return {
                get pixiObject() { return object; }
            }
        });
        return object;
    },
    get renderer() {
        return xnew.context(Root)?.renderer;
    },
    get scene(): PIXI.Container {
        return xnew.context(Root)?.scene;
    },
    get canvas(): HTMLCanvasElement {
        return xnew.context(Root)?.canvas;
    },
};

function Root(unit: xnew.Unit, { canvas }: { canvas: HTMLCanvasElement }) {
    let renderer: PIXI.Renderer | null = null;
    xnew.promise(PIXI.autoDetectRenderer({
        width: canvas.width, height: canvas.height, view: canvas,
        antialias: true, backgroundAlpha: 0,
    })).then((value: any) => {
        renderer = value;
    });

    const scene = new PIXI.Container();

    return {
        get renderer() { return renderer; },
        get scene() { return scene; },
        get canvas() { return canvas; },
    }
}

function Nest(unit: xnew.Unit, { object }: { object: any }) {
    const root = xnew.context(Root);
    const parent = xnew.context(Nest)?.pixiObject ?? root.scene;

    parent.addChild(object);
    unit.on('finalize', () => {
        parent.removeChild(object);
    });

    return {
        get pixiObject() { return object; },
    }
}