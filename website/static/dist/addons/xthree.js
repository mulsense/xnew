(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('xnew')) :
  typeof define === 'function' && define.amd ? define(['exports', 'xnew'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.xthree = global.xthree || {}, global.xnew));
})(this, (function (exports, xnew) { 'use strict';

  function Main(self, { canvas = null, camera }) {
    const renderer = new THREE.WebGLRenderer({ canvas });

    const scene = new THREE.Scene();

    xnew.extend(Connect, scene);

    return {
      get scene() {
        return scene;
      },
      update() {
        renderer.render(scene, camera);
      },
    }
  }
  function Connect(self, object) {
      const parent = xnew.context('xthree.Connect');
      xnew.context('xthree.Connect', object);

      parent?.add(object);
      return {
        finalize() {
          parent?.remove(object);
        },
      }
  }

  exports.Connect = Connect;
  exports.Main = Main;

}));
