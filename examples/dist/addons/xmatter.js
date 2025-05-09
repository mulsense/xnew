(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('xnew'), require('matter-js')) :
    typeof define === 'function' && define.amd ? define(['xnew', 'matter-js'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.xmatter = factory(global.xnew, global.Matter));
})(this, (function (xnew, Matter) { 'use strict';

    function xmatter() {
    }

    Object.defineProperty(xmatter, 'setup', { enumerable: true, value: setup });
    Object.defineProperty(xmatter, 'initialize', { enumerable: true, value: initialize });

    Object.defineProperty(xmatter, 'render', { enumerable: true, get: render });
    Object.defineProperty(xmatter, 'engine', { enumerable: true, get: engine });
    Object.defineProperty(xmatter, 'nest', { enumerable: true, value: nest });
    Object.defineProperty(xmatter, 'start', { enumerable: true, value: start });
    Object.defineProperty(xmatter, 'stop', { enumerable: true, value: stop });

    function setup({ engine = null, render = null } = {}) {
        xnew.extend(Root, { engine, render });
    }

    function initialize({ engine = null, render = null } = {}) {
        xnew.extend(Root, { engine, render });
    }

    function render() {
        return xnew.context('xmatter.root')?.render;
    }

    function engine() {
        return xnew.context('xmatter.root')?.engine;
    }

    function nest(object) {
        xnew.extend(Connect, object);
        return object;
    }

    function start() {
        const root = xnew.context('xmatter.root');
        root.isActive = true;
    }

    function stop() {
        const root = xnew.context('xmatter.root');
        root.isActive = false;
    }

    function Root(self, { engine, render }) {
        const root = {};
        xnew.context('xmatter.root', root);

        root.isActive = true;
        root.engine = engine ?? render?.engine ?? Matter.Engine.create();
        root.render = render;
        xnew.extend(Connect, root.engine.world);

        return {
            update() {
                if (root.isActive) {
                    Matter.Engine.update(root.engine);
                }
                if (root.render !== null) {
                    Matter.Render.world(root.render);
                }
            },
        }
    }

    function Connect(self, object) {
        const parent = xnew.context('xmatter.object');
        xnew.context('xmatter.object', object);

        if (parent) {
            Matter.Composite.add(parent, object);
            return {
                finalize() {
                    Matter.Composite.remove(parent, object);
                },
            }
        }
    }

    return xmatter;

}));
