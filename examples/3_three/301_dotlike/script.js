import xnew from '@mulsense/xnew';
import xthree from '@mulsense/xnew/addons/xthree';
import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

xnew(document.querySelector('#main'), Main);

function Main(unit) {
  const [width, height] = [800, 600];
  xnew.extend(xnew.basics.Screen, { aspect: width / height, fit: 'contain' });

  const aspect = width / height;
  const canvas = xnew(`<canvas width="${width}" height="${height}" class="size-full align-bottom">`);
  
  // three setup
  const camera = new THREE.OrthographicCamera( - aspect, aspect, 1, - 1, 0.1, 10 );
  xthree.initialize({ canvas: canvas.element, camera });
  xthree.camera.position.set(0, 2 * Math.tan( Math.PI / 6 ), +2);
  xthree.scene.background = new THREE.Color( 0x151729 );
  xthree.renderer.shadowMap.enabled = true;
  xthree.renderer.shadowMap.type = THREE.PCFShadowMap;

  const composer = new EffectComposer(xthree.renderer);
  const renderPixelatedPass = new RenderPixelatedPass( 6, xthree.scene, xthree.camera );
  composer.addPass(renderPixelatedPass);
  composer.addPass(new OutputPass());
  
  unit.on('render', () => {
    pixelAlignFrustum(renderPixelatedPass.pixelSize);
    composer.render();
  });

  xnew(Contents);
  xnew(document.body, GUIPanel, { renderPixelatedPass });
}

function Contents(unit) {
  xnew(Controller);

  xnew(AmbientLight);
  xnew(SpotLight, { position: { x: 2, y: 2, z: 0 } });

  xnew(DirectionaLight, { position: { x: 100, y: 100, z: 100 } });

  xnew(Box, { size: 0.4, position: { x: 0, y:  0.2 + 0.0001, z: 0 }, rotation: { x: 0, y: Math.PI / 4, z: 0 } });
  xnew(Box, { size: 0.5, position: { x: -0.5, y: 0.25 + 0.0001, z: -0.5 }, rotation: { x: 0, y: Math.PI / 4, z: 0 } });

  xnew(Plane, { size: 2, position: { x: 0, y: -0.0001, z: 0 }, rotation: { x: -Math.PI / 2, y: 0, z: 0 } });

  xnew(Crystal);
}

function GUIPanel(unit, { renderPixelatedPass }) {
  const params = { pixelSize: 6, normalEdgeStrength: .3, depthEdgeStrength: .4, };
  xnew.nest('<div class="absolute right-2 top-2 w-64 p-1 border rounded-lg shadow-lg bg-white">');
  xnew.extend(xnew.basics.GUIPanel, { name: 'GUI', open: true, params });

  unit.number('pixelSize', { min: 1, max: 16, step: 1 }).on('input', ({ value }) => {
    renderPixelatedPass.setPixelSize(value);
  });

  unit.number('normalEdgeStrength', { min: 0, max: 2, step: 0.05 }).on('input', ({ value }) => {
    renderPixelatedPass.normalEdgeStrength = value;
  });
  unit.number('depthEdgeStrength', { min: 0, max: 1, step: 0.05 }).on('input', ({ value }) => {
    renderPixelatedPass.depthEdgeStrength = value;
  });
}

function AmbientLight(unit) {
  const object = xthree.nest(new THREE.AmbientLight(0x757f8e, 3));
}

function DirectionaLight(unit, { position }) {
  const object = xthree.nest(new THREE.DirectionalLight(0xfffecd, 1.5));
  object.position.set(position.x, position.y, position.z);
  object.castShadow = true;

  object.shadow.mapSize.set( 2048, 2048 );
}

function SpotLight(unit, { position }) {
  const spotLight = xthree.nest(new THREE.SpotLight( 0xffc100, 10, 10, Math.PI / 16, .02, 2 ));
  spotLight.position.set(position.x, position.y, position.z );
  spotLight.target.position.set( 0, 0, 0 );
  spotLight.castShadow = true;
}

function Box(unit, { size, position, rotation }) {
  const texture = create();
  texture.repeat.set(1.5, 1.5);

  const material = new THREE.MeshPhongMaterial( { map: texture } );

  const mesh = xthree.nest(new THREE.Mesh( new THREE.BoxGeometry(size, size, size), material ));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.rotation.set(rotation.x, rotation.y, rotation.z);
  mesh.position.set(position.x, position.y, position.z);
}

function Plane(unit, { size, position, rotation }) {
  const texture = create();
  texture.repeat.set(3, 3);

  const material = new THREE.MeshPhongMaterial( { map: texture } );
  const mesh = xthree.nest(new THREE.Mesh( new THREE.PlaneGeometry(size, size), material ));

  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.rotation.set(rotation.x, rotation.y, rotation.z);
  mesh.position.set(position.x, position.y, position.z);
}

function Crystal(unit) {
  
  const radius = .2;
  const geometry = new THREE.IcosahedronGeometry( radius );
  const mesh = xthree.nest(new THREE.Mesh(
    geometry,
    new THREE.MeshPhongMaterial( {
      color: 0x68b7e9,
      emissive: 0x4f7e8b,
      shininess: 10,
      specular: 0xffffff
    } )
  ));
  mesh.receiveShadow = true;
  mesh.castShadow = true;

  
  const clock = new THREE.Clock();

  unit.on('render', () => {
    const t = clock.getElapsedTime();

    mesh.material.emissiveIntensity = Math.sin( t * 3 ) * .5 + .5;
    mesh.position.y = .7 + Math.sin( t * 2 ) * .05;
    mesh.rotation.y = stopGoEased( t, 2, 4 ) * 2 * Math.PI;
  });
}
function Controller(unit) {
  const controls = new OrbitControls(xthree.camera, xthree.canvas);
  controls.maxZoom = 2;
}

function easeInOutCubic( x ) {
  return x ** 2 * 3 - x ** 3 * 2;
}

function linearStep( x, edge0, edge1 ) {

  const w = edge1 - edge0;
  const m = 1 / w;
  const y0 = - m * edge0;
  return THREE.MathUtils.clamp( y0 + m * x, 0, 1 );

}

function stopGoEased( x, downtime, period ) {
  const cycle = ( x / period ) | 0;
  const tween = x - cycle * period;
  const linStep = easeInOutCubic( linearStep( tween, downtime, period ) );
  return cycle + linStep;
}

function pixelAlignFrustum(pixelSize) {
  const aspect = xthree.canvas.width / xthree.canvas.height;
  const pixelsPerScreenWidth = Math.floor( xthree.canvas.width / pixelSize );
  const pixelsPerScreenHeight = Math.floor( xthree.canvas.height / pixelSize );

  // 0. Get Pixel Grid Units
  const worldScreenWidth = ( ( xthree.camera.right - xthree.camera.left ) / xthree.camera.zoom );
  const worldScreenHeight = ( ( xthree.camera.top - xthree.camera.bottom ) / xthree.camera.zoom );
  const pixelWidth = worldScreenWidth / pixelsPerScreenWidth;
  const pixelHeight = worldScreenHeight / pixelsPerScreenHeight;

  // 1. Project the current camera position along its local rotation bases
  const camPos = new THREE.Vector3(); xthree.camera.getWorldPosition( camPos );
  const camRot = new THREE.Quaternion(); xthree.camera.getWorldQuaternion( camRot );
  const camRight = new THREE.Vector3( 1.0, 0.0, 0.0 ).applyQuaternion( camRot );
  const camUp = new THREE.Vector3( 0.0, 1.0, 0.0 ).applyQuaternion( camRot );
  const camPosRight = camPos.dot( camRight );
  const camPosUp = camPos.dot( camUp );

  // 2. Find how far along its position is along these bases in pixel units
  const camPosRightPx = camPosRight / pixelWidth;
  const camPosUpPx = camPosUp / pixelHeight;

  // 3. Find the fractional pixel units and convert to world units
  const fractX = camPosRightPx - Math.round( camPosRightPx );
  const fractY = camPosUpPx - Math.round( camPosUpPx );

  // 4. Add fractional world units to the left/right top/bottom to align with the pixel grid
  xthree.camera.left = - aspect - ( fractX * pixelWidth );
  xthree.camera.right = aspect - ( fractX * pixelWidth );
  xthree.camera.top = 1.0 - ( fractY * pixelHeight );
  xthree.camera.bottom = - 1.0 - ( fractY * pixelHeight );
  xthree.camera.updateProjectionMatrix();
}


function create() {
  const s = 2;
  const data = new Uint8Array(s * s * 4);

  data[(0 * s + 0) * 4 + 0] = 128;
  data[(0 * s + 0) * 4 + 1] = 128;
  data[(0 * s + 0) * 4 + 2] = 128;
  data[(0 * s + 0) * 4 + 3] = 255;

  data[(0 * s + 1) * 4 + 0] = 192;
  data[(0 * s + 1) * 4 + 1] = 192;
  data[(0 * s + 1) * 4 + 2] = 192;
  data[(0 * s + 1) * 4 + 3] = 255;

  data[(1 * s + 0) * 4 + 0] = 192;
  data[(1 * s + 0) * 4 + 1] = 192;
  data[(1 * s + 0) * 4 + 2] = 192;
  data[(1 * s + 0) * 4 + 3] = 255;

  data[(1 * s + 1) * 4 + 0] = 128;
  data[(1 * s + 1) * 4 + 1] = 128;
  data[(1 * s + 1) * 4 + 2] = 128;
  data[(1 * s + 1) * 4 + 3] = 255;

  const tex = new THREE.DataTexture(data, s, s, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.needsUpdate = true;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;

  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;

  return tex;
}