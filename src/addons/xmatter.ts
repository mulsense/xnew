import xnew from '@mulsense/xnew';
import Matter from 'matter-js';

export default {
    initialize ({}: any = {}) {
       xnew.promise(xnew(Root, {}));
    },
    get engine() {
        return xnew.context(Root)?.engine;
    },
    get world() {
        return xnew.context(Root)?.engine.world;
    },
};

function Root(unit: xnew.Unit, {}: any) {
    const engine = Matter.Engine.create();

    return {
        get engine() { return engine; },
    }
}
