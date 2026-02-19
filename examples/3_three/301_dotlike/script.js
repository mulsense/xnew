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

  unit.slider('pixelSize', { min: 1, max: 16, step: 1 }).on('input', ({ value }) => {
    renderPixelatedPass.setPixelSize(value);
  });

  unit.slider('normalEdgeStrength', { min: 0, max: 2, step: 0.05 }).on('input', ({ value }) => {
    renderPixelatedPass.normalEdgeStrength = value;
  });
  unit.slider('depthEdgeStrength', { min: 0, max: 1, step: 0.05 }).on('input', ({ value }) => {
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
  const material = new THREE.MeshPhongMaterial( { map: chessboard(3, 3) } );

  const mesh = xthree.nest(new THREE.Mesh( new THREE.BoxGeometry(size, size, size), material ));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.rotation.set(rotation.x, rotation.y, rotation.z);
  mesh.position.set(position.x, position.y, position.z);
}

function Plane(unit, { size, position, rotation }) {
  const material = new THREE.MeshPhongMaterial( { map: chessboard(6, 6) } );
  const mesh = xthree.nest(new THREE.Mesh( new THREE.PlaneGeometry(size, size), material ));

  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.rotation.set(rotation.x, rotation.y, rotation.z);
  mesh.position.set(position.x, position.y, position.z);
}

function Crystal(unit, { radius = 0.2 } = {}) {
  const geometry = new THREE.IcosahedronGeometry( radius );
  const material = new THREE.MeshPhongMaterial( {
      color: 0x68b7e9,
      emissive: 0x4f7e8b,
      shininess: 10,
      specular: 0xffffff
    } )
  const mesh = xthree.nest(new THREE.Mesh(geometry, material));
  mesh.receiveShadow = true;
  mesh.castShadow = true;

  const clock = new THREE.Clock();

  unit.on('render', () => {
    const t = clock.getElapsedTime();

    mesh.material.emissiveIntensity = Math.sin( t * 3 ) * .5 + .5;
    mesh.position.y = 0.7 + Math.sin( t * 2 ) * 0.05;

    const speed = (Math.sin(t * 2) + 1.0) * 0.05;
    mesh.rotation.y += speed;
  });
}
function Controller(unit) {
  const controls = new OrbitControls(xthree.camera, xthree.canvas);
  controls.maxZoom = 2;
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


function chessboard(gridX, gridY) {
  const s = 2;
  const data = new Uint8Array(s * s * 4);

  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < 2; x++) {
      data[(y * s + x) * 4 + 0] = ((x + y) % 2 === 0) ? 128 : 192;
      data[(y * s + x) * 4 + 1] = ((x + y) % 2 === 0) ? 128 : 192;
      data[(y * s + x) * 4 + 2] = ((x + y) % 2 === 0) ? 128 : 192;
      data[(y * s + x) * 4 + 3] = ((x + y) % 2 === 0) ? 128 : 192;
    }
  }

  const texture = new THREE.DataTexture(data, s, s, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.repeat.set(gridX / 2, gridY / 2);

  return texture;
}