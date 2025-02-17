import xnew from 'xnew';
import { Engine, Render, Composite, MouseConstraint } from 'matter-js';

export function BaseSystem(self, { canvas, ...options }) {
    const engine = Engine.create();
    const render = Render.create({
        canvas,
        engine,
        options: Object.assign({
            width: canvas.width,
            height: canvas.height,
            background: 'rgb(255,255,255)'
        }, options)
    });
    
    xnew.extend(Connect, engine.world);

    return {
        get engine() {
            return engine;
        },
        get render() {
            return render;
        },
        update() {
            Engine.update(engine);
            Render.world(render);
        },
    }
}

export function Connect(self, object) {
    const parent = xnew.context('xmatter.Connect');
    xnew.context('xmatter.Connect', object);

    if (parent) {
        Composite.add(parent, object);
        return {
            finalize() {
                Composite.remove(parent, object);
            },
        }
    }
}
