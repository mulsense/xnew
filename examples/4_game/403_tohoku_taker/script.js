import * as PIXI from 'pixi.js';
import xnew from 'xnew';
import xpixi from 'xnew/addons/xpixi';

xnew('#main', Main);

function Main(unit) {
  const width = 800, height = 600;
  // three 
  xthree.initialize({ canvas: new OffscreenCanvas(width, height) });
  xthree.renderer.shadowMap.enabled = true;
  xthree.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  xthree.camera.position.set(0, 0, +10);

  // pixi
  const screen = xnew(xnew.basics.Screen, { width, height });
  xpixi.initialize({ canvas: screen.element });

  xnew(GameScene);
}

function GameScene(scene) {

}
