(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('xnew'), require('three')) :
    typeof define === 'function' && define.amd ? define(['exports', 'xnew', 'three'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.xthree = global.xthree || {}, global.xnew, global.THREE));
})(this, (function (exports, xnew, THREE) { 'use strict';

    function _interopNamespaceDefault(e) {
        var n = Object.create(null);
        if (e) {
            Object.keys(e).forEach(function (k) {
                if (k !== 'default') {
                    var d = Object.getOwnPropertyDescriptor(e, k);
                    Object.defineProperty(n, k, d.get ? d : {
                        enumerable: true,
                        get: function () { return e[k]; }
                    });
                }
            });
        }
        n.default = e;
        return n;
    }

    var THREE__namespace = /*#__PURE__*/_interopNamespaceDefault(THREE);

    function setup({ renderer = null, camera = null })
    {
        const three = {};
        xnew.extend((self) => {
            three.renderer = renderer ?? new THREE__namespace.WebGLRenderer({});
            three.camera = camera ?? new THREE__namespace.PerspectiveCamera(45, three.renderer.domElement.width / three.renderer.domElement.height);
            three.scene = new THREE__namespace.Scene();
            xnew.extend(Connect, three.scene);

            return {
                update() {
                    three.renderer.render(three.scene, three.camera);
                },
            }
        });
        return three;
    }

    function nest(object)
    {
        xnew.extend(Connect, object);
        return object;
    }

    function Connect(self, object)
    {
        const parent = xnew.context('xthree.Connect');
        xnew.context('xthree.Connect', object);

        if (parent) {
            parent?.add(object);
            return {
                finalize() {
                    parent?.remove(object);
                },
            }
        }
    }

    exports.Connect = Connect;
    exports.nest = nest;
    exports.setup = setup;

}));
