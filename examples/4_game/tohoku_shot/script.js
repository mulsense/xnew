import * as PIXI from 'pixi.js';
import * as THREE from 'three';
import html2canvas from 'html2canvas-pro';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import xnew from '@mulsense/xnew';
import xpixi from '@mulsense/xnew/addons/xpixi';
import xthree from '@mulsense/xnew/addons/xthree';

xnew(document.querySelector('#main'), Main);

function Main(unit) {
  const [width, height] = [800, 600];
  xnew.extend(xnew.basics.Screen, { aspect: width / height, fit: 'contain' });

  const canvas = xnew(`<canvas width="${width}" height="${height}" class="size-full align-bottom">`);

  // pixi setup
  xpixi.initialize({ canvas: canvas.element });
  unit.on('render', () => {
    xnew.emit('+prerender');
    xpixi.renderer.render(xpixi.scene);
  });

  xnew(Contents);
}

function Contents(unit) {

  let scene = xnew(TitleScene);
  // let scene = xnew(ResultScene, { image: null });
  unit.on('+scenechange', ({ NextScene, props }) => {
    scene.finalize();
    scene = xnew(NextScene, props);
  });
}


function TitleScene(unit) {

  unit.on('pointerdown', () => xnew.emit('+scenechange', { NextScene: GameScene }));

  xnew(TitleText);
  xnew(TouchMessage);
}

function GameScene(unit) {

}

function TitleText(unit) {
  xnew.nest('<div class="absolute w-full top-[16cqw] text-[10cqw] text-center text-blue-600 font-bold">');
  xnew(StrokeText, { text: 'とーほくショット' });
}

function TouchMessage(unit) {
  xnew.nest('<div class="absolute w-full top-[30cqw] text-[6cqw] text-center text-blue-600 font-bold">');
  xnew(StrokeText, { text: 'touch start' });
  let count = 0;
  unit.on('update', () => unit.element.style.opacity = 0.6 + Math.sin(count++ * 0.08) * 0.4);
}

// helpers
function StrokeText(unit, { text }) {
  const [sw, sc] = ['0.2cqw', '#EEEEEE'];
  xnew.nest(`<div style="text-shadow: -${sw} -${sw} 1px ${sc}, ${sw} -${sw} 1px ${sc}, -${sw} ${sw} 1px ${sc}, ${sw} ${sw} 1px ${sc};">`);
  unit.element.textContent = text;
}