import xnew from 'xnew';
import { Engine, Render, Composite } from 'matter-js';

function Root(self, { engine = null, render = null }) {
    const matter = {};

    matter.engine = engine ?? render?.engine ?? Engine.create();
    matter.render = render;

    xnew.extend(Connect, matter.engine.world);

    return {
        get matter() {
            return matter;
        },
        update() {
            Engine.update(matter.engine);
            if (matter.render !== null) {
                Render.world(matter.render);
            }
        },
    }
}

function nest(object) {
    xnew.extend(Connect, object);
    return object;
}

function Connect(self, object) {
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

export { Connect, Root, nest };
