import xnew from '@mulsense/xnew';
import Matter from 'matter-js';

//----------------------------------------------------------------------------------------------------
// xmatter — matter-js (2D physics) integration
//
// `initialize()` mounts a Root Unit that creates a Matter.Engine; child Units retrieve the engine
// and its world through xnew.context(Root). Lifetime is tied to the Root Unit — engine is GC'd
// when that Unit finalizes.
//
// - default : { initialize, engine, world }
//----------------------------------------------------------------------------------------------------
var xmatter = {
    initialize({} = {}) {
        xnew.promise(xnew(Root, {}));
    },
    get engine() {
        var _a;
        return (_a = xnew.context(Root)) === null || _a === void 0 ? void 0 : _a.engine;
    },
    get world() {
        var _a;
        return (_a = xnew.context(Root)) === null || _a === void 0 ? void 0 : _a.engine.world;
    },
};
function Root(unit, {}) {
    const engine = Matter.Engine.create();
    return {
        get engine() { return engine; },
    };
}

export { xmatter as default };
