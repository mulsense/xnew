import xnew from 'xnew';
import { Engine, Render, Composite, MouseConstraint } from 'matter-js';

export function BaseSystem(self, { engine = null, render = null }) {
    engine = engine ?? render?.engine ?? Engine.create();

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
            if (render !== null) {
                Render.world(render);
            }
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
