import xnew from '@mulsense/xnew';
import xthree from '@mulsense/xnew/addons/xthree';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

document.body.style.backgroundColor = '#000';
xnew(document.querySelector('#main'), Main);

function Main(unit) {
  const [width, height] = [800, 600];
  xnew.extend(xnew.basics.Screen, { aspect: width / height, fit: 'contain' });

  const aspect = width / height;
  const canvas = xnew(`<canvas width="${width}" height="${height}" class="size-full align-bottom">`);
  
  // three setup
  const camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 10);
  xthree.initialize({ canvas: canvas.element, camera });
  xthree.camera.position.set(0, 2 * Math.tan(Math.PI / 6), +2);
  xthree.scene.background = new THREE.Color(0x151729);
  xthree.renderer.shadowMap.enabled = true;
  xthree.renderer.shadowMap.type = THREE.PCFShadowMap;

  const renderer = xnew(Renderer);
  unit.on('render', () => {
    renderer.render();
  });

  xnew(Contents);
}

function Contents(unit) {
  // gui
  xnew(Controller);
  xnew(document.body, GUIPanel);

  // lighting
  xnew(AmbientLight);
  xnew(SpotLight, { position: { x: 2, y: 2, z: 0 } });
  xnew(DirectionaLight, { position: { x: 100, y: 100, z: 100 } });

  // objects
  xnew(Box, { size: 0.4, position: { x: 0.0, y:  0.2, z: 0.0 }, rotation: { x: 0.0, y: Math.PI / 4, z: 0.0 } });
  xnew(Box, { size: 0.5, position: { x: -0.5, y: 0.3, z: -0.5 }, rotation: { x: 0.0, y: Math.PI / 4, z: 0.0 } });
  xnew(Plane, { size: 2, position: { x: 0.0, y: 0.0, z: 0.0 }, rotation: { x: -Math.PI / 2, y: 0.0, z: 0.0 } });
  xnew(Crystal, { radius: 0.2, position: { x: 0.0, y: 0.7, z: 0.0 }, rotation: { x: 0.0, y: 0.0, z: 0.0 } });
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
  const object = xthree.nest(new THREE.SpotLight(0xffc100, 10, 10, Math.PI / 16, 0.02, 2));
  object.target.position.set(0, 0, 0);
  object.castShadow = true;
  object.position.set(position.x, position.y, position.z );
}

function Box(unit, { size, position, rotation }) {
  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = new THREE.MeshPhongMaterial( { map: chessboard(3, 3) } );
  const object = xthree.nest(new THREE.Mesh(geometry, material));

  object.castShadow = true;
  object.receiveShadow = true;
  object.rotation.set(rotation.x, rotation.y, rotation.z);
  object.position.set(position.x, position.y, position.z);
}

function Plane(unit, { size, position, rotation }) {
  const geometry = new THREE.PlaneGeometry(size, size);
  const material = new THREE.MeshPhongMaterial( { map: chessboard(6, 6) } );
  const object = xthree.nest(new THREE.Mesh(geometry, material));

  object.castShadow = true;
  object.receiveShadow = true;
  object.rotation.set(rotation.x, rotation.y, rotation.z);
  object.position.set(position.x, position.y, position.z);
}

function Crystal(unit, { radius, position, rotation }) {
  const geometry = new THREE.IcosahedronGeometry(radius);
  const material = new THREE.MeshPhongMaterial(
    { color: 0x68b7e9, emissive: 0x4f7e8b, shininess: 10, specular: 0xffffff }
  );
  const object = xthree.nest(new THREE.Mesh(geometry, material));
  object.castShadow = true;
  object.receiveShadow = true;
  object.rotation.set(rotation.x, rotation.y, rotation.z);
  object.position.set(position.x, position.y, position.z);

  const time = new Date();
  unit.on('render', () => {
    const t = (new Date() - time) / 1000;
    
    object.material.emissiveIntensity = Math.sin(t * 2) * 0.5 + 0.5;
    object.position.y = position.y + Math.sin(t * 2) * 0.05;
    object.rotation.y += (Math.sin(t * 2) + 1.0) * 0.05;
  });
}

function Controller(unit) {
  const controls = new OrbitControls(xthree.camera, xthree.canvas);
  controls.maxZoom = 2;
}

function chessboard(gridX, gridY) {
  const s = 2;
  const data = new Uint8Array(s * s * 4);

  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < 2; x++) {
      const value = ((x + y) % 2 === 0) ? 128 : 192;
      data[(y * s + x) * 4 + 0] = value;
      data[(y * s + x) * 4 + 1] = value;
      data[(y * s + x) * 4 + 2] = value;
      data[(y * s + x) * 4 + 3] = value;
    }
  }
  const texture = new THREE.DataTexture(data, s, s, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.needsUpdate = true;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.repeat.set(gridX / 2, gridY / 2);
  return texture;
}

function Renderer(unit) {
  const composer = new EffectComposer(xthree.renderer);
  const renderPixelatedPass = new RenderPixelatedPass( 6, xthree.scene, xthree.camera );
  composer.addPass(renderPixelatedPass);
  composer.addPass(new OutputPass());

  return {
    get renderPixelatedPass() { return renderPixelatedPass; },
    render() {
      pixelAlignFrustum();
      composer.render();
    },
  }

  function pixelAlignFrustum() {
    const baseline = 1.0;
    const aspect = xthree.canvas.width / xthree.canvas.height;

    // Get Pixel Grid Units
    const pixelUnit = 2 * baseline / (xthree.camera.zoom * Math.floor(xthree.canvas.height / renderPixelatedPass.pixelSize));

    // Project the current camera position along its local rotation bases
    const [camPos, camRot] = [new THREE.Vector3(), new THREE.Quaternion()];
    xthree.camera.getWorldPosition(camPos);
    xthree.camera.getWorldQuaternion(camRot);
    const camX = camPos.dot(new THREE.Vector3(1.0, 0.0, 0.0).applyQuaternion(camRot));
    const camY = camPos.dot(new THREE.Vector3(0.0, 1.0, 0.0).applyQuaternion(camRot));

    // Find the fractional pixel units and convert to world units
    const fractX = (camX / pixelUnit) - Math.round(camX / pixelUnit);
    const fractY = (camY / pixelUnit) - Math.round(camY / pixelUnit);

    xthree.camera.left = - baseline * aspect - (fractX * pixelUnit);
    xthree.camera.right = baseline * aspect - (fractX * pixelUnit);
    xthree.camera.top = baseline - (fractY * pixelUnit);
    xthree.camera.bottom = - baseline - (fractY * pixelUnit);
    xthree.camera.updateProjectionMatrix();
  }
}

function GUIPanel(unit) {
  const renderer = xnew.context(Renderer);
  const renderPixelatedPass = renderer.renderPixelatedPass;

  const params = { pixelSize: 6, normalEdgeStrength: 0.3, depthEdgeStrength: 0.4, };

  xnew.nest('<div class="absolute text-sm right-2 top-2 w-64 p-1 border rounded-lg shadow-lg bg-white">');
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
