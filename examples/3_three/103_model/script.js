import * as THREE from 'three';
import xnew from '@mulsense/xnew';
import xthree from '@mulsense/xnew/addons/xthree';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

xnew(document.querySelector('#main'), Main);

function Main(unit) {
  const [width, height] = [1600, 1200];
  xnew.extend(xnew.basics.Screen, { aspect: width / height, fit: 'contain' });

  const canvas = xnew(`<canvas width="${width}" height="${height}" class="size-full align-bottom">`);

  // three setup
  xthree.initialize({ canvas: canvas.element });
  xthree.renderer.shadowMap.enabled = true;
  xthree.camera.position.set(- 1, 2, 3);
  unit.on('render', () => {
    xthree.renderer.render(xthree.scene, xthree.camera);
  });

  xnew(Contents);
}

function Contents(unit) {
  // gui
  xnew(Controller);

  // lights
  xnew(DirectionalLight, { position: { x: 3, y: 10, z: 10 } });

  // objects
  xnew(Ground);
 
  xnew.promise(new Promise((resolve) => {
    new GLTFLoader().load('./Xbot.glb', (gltf) => resolve(gltf));
  })).then((gltf) => {
    xnew(Model, { gltf });
    xnew(document.body, GUIPanel);
  });
}

function DirectionalLight(unit, { color = 0xffffff, intensity = 3, position }) {
  const object = xthree.nest(new THREE.DirectionalLight(color, intensity));
  object.position.set(position.x, position.y, position.z);
  object.castShadow = true;
}

function Ground(unit) {
  const geometry = new THREE.PlaneGeometry(100, 100);
  const material = new THREE.ShadowMaterial({ opacity: 0.20 });
  const object = xthree.nest(new THREE.Mesh(geometry, material));
  object.rotation.x = - Math.PI / 2;
  object.receiveShadow = true;
}

function Controller(unit) {
  const controls = new OrbitControls(xthree.camera, xthree.canvas);
  controls.target.set(0, 1, 0);
  controls.update();
}

function Model(unit, { gltf }) {
  const object = xthree.nest(new THREE.Object3D());
  const model = gltf.scene;
  const skeleton = new THREE.SkeletonHelper(model);
 
  object.add(model);
  object.add(skeleton);

  model.traverse((object) => {
    if (object.isMesh) object.castShadow = true;
  });

  let select = 'idle';
  const baseActions = ['idle', 'walk', 'run'];
  const settings = { none: { type: 'base', action: null, weight: 0 } };

  const mixer = new THREE.AnimationMixer(gltf.scene);
  for (const animation of gltf.animations) {
    let setting = null;
    if (baseActions.includes(animation.name)) {
      setting = { type: 'base', action: mixer.clipAction(animation), weight: animation.name === 'idle' ? 1 : 0 };
    } else {
      setting = { type: 'additive', action: null, weight: 0 };

      // Make the clip additive and remove the reference frame
      THREE.AnimationUtils.makeClipAdditive(animation);
      if (animation.name.endsWith('_pose')) {
        setting.action = mixer.clipAction(THREE.AnimationUtils.subclip(animation, animation.name, 2, 3, 30));
      } else {
        setting.action = mixer.clipAction(animation);
      }
    }
    
    setting.action.enabled = true;
    setting.action.setEffectiveTimeScale(1);
    setting.action.setEffectiveWeight(setting.weight);
    setting.action.play();
    settings[animation.name] = setting;
  }

  const clock = new THREE.Clock();
  unit.on('update', () => {
    mixer.update(clock.getDelta());
  });

  return {
    get settings() { return settings; },
    set speed(value) { mixer.timeScale = value; },

    activate(action, weight) {
      action.enabled = true;
      action.setEffectiveTimeScale(1);
      action.setEffectiveWeight(weight);
    },

    crossfade(name) {
      if (name === select) return;
      const [current, next] = [settings[select].action, settings[name].action];

      const duration = 0.35;
      if (next === null) {
        current.fadeOut(duration);
      } else if (current === null) {
        unit.activate(next, 1);
        next.time = 0;
        next.fadeIn(duration);
      } else if (select === 'idle' || name === 'idle') {
        unit.activate(next, 1);
        next.time = 0;
        current.crossFadeTo(next, duration, true);
      } else {
        mixer.addEventListener('loop', finalize);
        function finalize(event) {
          if (event.action === current) {
            mixer.removeEventListener('loop', finalize);
            unit.activate(next, 1);
            next.time = 0;
            current.crossFadeTo(next, duration, true);
          }
        }
      }
      select = name;
    },
  }
}

function GUIPanel(panel) {
  const state = xnew.context(Model);
  const params = { action: 'idle', speed: 1.0, };
  
  xnew.nest('<div class="absolute text-sm w-48 top-2 right-2 p-1 bg-white border rounded shadow-lg">');
  xnew.extend(xnew.basics.GUIPanel, { name: 'GUI', open: true, params });

  const baseActions = Object.keys(state.settings).filter(key => state.settings[key].type === 'base');
  panel.select('action', { options: baseActions }).on('input', ({ value }) => {
    state.crossfade(value);
  });

  xnew('<p>', 'weights');
  const additiveActions = Object.keys(state.settings).filter(key => state.settings[key].type === 'additive');
  for (const name of additiveActions) {
    params[name] = state.settings[name].weight;
    panel.range(name, { min: 0, max: 1, step: 0.01 }).on('input', ({ event }) => {
      state.settings[name].weight = parseFloat(event.target.value);
      state.activate(state.settings[name].action, parseFloat(event.target.value));
    });
  }
  panel.range('speed', { min: 0.01, max: 2.00, step: 0.01 }).on('input', ({ event, value }) => {
    state.speed = value;
  });
}