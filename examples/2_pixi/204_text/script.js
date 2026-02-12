import xnew from '@mulsense/xnew';
import xpixi from '@mulsense/xnew/addons/xpixi';
import xthree from '@mulsense/xnew/addons/xthree';
import * as PIXI from 'pixi.js';
import * as THREE from 'three';
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";

xnew(document.querySelector('#main'), Main);

function Main(unit) {
  xnew.extend(xnew.basics.Screen, { width: 800, height: 400 });
 
  // three setup
  const camera = new THREE.OrthographicCamera(-10, +10, +10, -10, 0, 100);
  xthree.initialize({ camera, canvas: new OffscreenCanvas(unit.canvas.width, unit.canvas.height) });
  xthree.camera.position.set(0, 0, +100);
  unit.on('render', () => {
    xthree.renderer.render(xthree.scene, xthree.camera);
  });

  // convert canvas to pixi texture, and continuous update
  const texture = PIXI.Texture.from(xthree.canvas);
  xnew.context('three.texture', texture);

  // pixi setup
  xpixi.initialize({ canvas: unit.canvas });
  unit.on('render', () => {
    texture.source.update();
    xpixi.renderer.render(xpixi.scene);
  });

  xnew(Contents);
}

function Contents(unit) {
  xnew(HtmlText);

  xnew(ThreeText);

  xnew(Texture, { texture: xnew.context('three.texture') });
  xnew(PixiText);
}

function Texture(unit, { texture } = {}) {
  const object = xpixi.nest(new PIXI.Sprite(texture));
}

function HtmlText(unit) {
  xnew.nest('<div class="absolute left-0 top-0 text-[4cqw] text-red-400 font-bold">');
  unit.element.textContent = 'This text is rendered by HTML/CSS';
}

function PixiText(unit) {
  const object = xpixi.nest(new PIXI.Text('This text is rendered by PixiJS', { fontFamily: 'Arial', fontSize: 32, }));
  object.anchor.set(0.0, 0.5);
  object.position.set(0.0, xpixi.canvas.height * 2 / 10);
}

function ThreeText(unit) {
  const object = xthree.nest(new THREE.Object3D());

  const loader = new FontLoader();
  xnew.promise(new Promise((resolve) => {
    loader.load('https://cdn.jsdelivr.net/npm/three@0.176.0/examples/fonts/helvetiker_regular.typeface.json',
      (font) => resolve(font));
  })).then((font) => {

    const geometry = new TextGeometry('This text is rendered by Three.js', {
      font,
      size: 1,
      depth: 0.5,
    });
    const material = new THREE.MeshNormalMaterial();
    const text = new THREE.Mesh(geometry, material);
    text.position.set(-17, 3, 0);
    object.add(text);
    object.rotation.set(0.2, 0.2, 0);
    object.scale.set(0.6, 1, 1);
  });
}

