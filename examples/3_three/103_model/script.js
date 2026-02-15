import * as THREE from 'three';
import xnew from '@mulsense/xnew';
import xthree from '@mulsense/xnew/addons/xthree';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

xnew(document.querySelector('#main'), Main);

function Main(unit) {
  xnew.extend(xnew.basics.Screen, { width: 1200, height: 600 });

  // three setup
  xthree.initialize({ canvas: unit.canvas });
  xthree.renderer.shadowMap.enabled = true;
  xthree.camera.position.set(- 1, 2, 3);
  unit.on('render', () => {
    xthree.renderer.render(xthree.scene, xthree.camera);
  });

  xnew(Contents);
}

function Contents(unit) {
  xnew(ModelState);
  xnew(Panel);

  xnew(DirectionalLight, { x: 3, y: 10, z: 10 });
  xnew(Ground);
  xnew(Controller);

  xnew.promise(new Promise((resolve) => {
    new GLTFLoader().load('./Xbot.glb', (gltf) => resolve(gltf));
  })).then((gltf) => {
    xnew(Model, { gltf });
  });
}

function ModelState(unit) {
  let select = 'idle';
  let mixer = null;

  const settings = {
    idle: { type: 'base', action: null, weight: 1 },
    walk: { type: 'base', action: null, weight: 0 },
    run: { type: 'base', action: null, weight: 0 },

    sneak_pose: { type: 'additive', action: null, weight: 0 },
    sad_pose: { type: 'additive', action: null, weight: 0 },
    agree: { type: 'additive', action: null, weight: 0 },
    headShake: { type: 'additive', action: null, weight: 0 }
  };

  return {
    build(gltf) {
      mixer = new THREE.AnimationMixer(gltf.scene);
      for (const animation of gltf.animations) {
        const setting = settings[animation.name];

        switch(setting?.type) {
          case 'base': {
            setting.action = mixer.clipAction(animation);
            break;
          }
          case 'additive': {
            // Make the clip additive and remove the reference frame
            THREE.AnimationUtils.makeClipAdditive(animation);
            if (animation.name.endsWith('_pose')) {
              setting.action = mixer.clipAction(THREE.AnimationUtils.subclip(animation, animation.name, 2, 3, 30));
            } else {
              setting.action = mixer.clipAction(animation);
            }
            break;
          }
        }
        if (setting) {
          unit.activate(setting.action, setting.weight);
          setting.action.play();
        }
      }
    },
    get select() { return select; },
    set select(value) { select = value; },

    get settings() { return settings; },

    get mixer() { return mixer; },

    activate(action, weight) {
      action.enabled = true;
      action.setEffectiveTimeScale(1);
      action.setEffectiveWeight(weight);
    },

    crossfade(name) {
      if (name === select) return;
      const current = settings[select] ? settings[select].action : null;
      const next = settings[name] ? settings[name].action : null;

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

function DirectionalLight(unit, { x, y, z }) {
  const object = xthree.nest(new THREE.DirectionalLight(0xffffff, 3));
  object.position.set(x, y, z);
  object.castShadow = true;
}

function Ground(unit) {
  const geometry = new THREE.PlaneGeometry(100, 100);
  const material = new THREE.ShadowMaterial({ opacity: 0.20 });
  const plane = xthree.nest(new THREE.Mesh(geometry, material));
  plane.rotation.x = - Math.PI / 2;
  plane.receiveShadow = true;
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

  const state = xnew.context(ModelState);
  state.build(gltf);

  const clock = new THREE.Clock();
  unit.on('update', () => {
    state.mixer.update(clock.getDelta());
  });
}

function Panel(unit) {
  xnew.nest('<div class="absolute w-48 top-2 right-2 p-1 bg-white border border-gray-300 rounded shadow-lg">');
  xnew('<div>', 'Panel');

  const state = xnew.context(ModelState);

  xnew((unit) => {
    xnew.extend(PanelGroup, { name: 'actions', open: true });

    const keys = Object.keys(state.settings).filter(key => state.settings[key].type === 'base');
    for (const name of ['none', ...keys]) {
      const button = xnew('<button class="m-0.5 border rounded-lg hover:bg-gray-100 cursor-pointer">', name);
      button.on('click', () => state.crossfade(name));
    }
  });

  xnew((unit) => {
    xnew.extend(PanelGroup, { name: 'action weights', open: true });
    const keys = Object.keys(state.settings).filter(key => state.settings[key].type === 'additive');
    for (const name of keys) {
      xnew('<div class="text-sm flex justify-between">', (unit) => {
        xnew('<div class="flex-auto">', name);
        xnew(`<div key="${name}" class="flex-none">`, '0');
      });
      
      const setting = state.settings[name];
      const input = xnew(`<input type="range" name="${name}" min="0.00" max="1.00" value="${setting.weight}" step="0.01" class="w-full">`);
      input.on('input', ({ event }) => {
        unit.element.querySelector(`div[key="${name}"]`).textContent = event.target.value;
        setting.weight = parseFloat(event.target.value);
        state.activate(setting.action, setting.weight);
      });
    }
  });

  xnew((unit) => {
    xnew.extend(PanelGroup, { name: 'options', open: true });
    xnew((unit) => {
      xnew('<div class="text-sm flex justify-between">', (unit) => {
        xnew('<div class="flex-auto">', 'speed');
        xnew('<div key="status" class="flex-none">', '1.0');
      });

      const input = xnew('<input type="range" name="speed" min="0.01" max="2.00" value="1.00" step="0.01" class="w-full">');
      input.on('input', ({ event }) => {
        unit.element.querySelector('div[key="status"]').textContent = event.target.value;
        state.mixer.timeScale = parseFloat(event.target.value);
      });
    });
  });
}

function PanelGroup(accordion, { name, open = false }) {
  const system = xnew(xnew.basics.OpenAndClose, { state: open ? 1.0 : 0.0 });
  
  xnew('<div class="flex items-center cursor-pointer">', (unit) => {
    unit.on('click', () => system.toggle());
    xnew((unit) => {
      xnew.nest('<svg viewBox="0 0 12 12" class="mr-1 size-4" fill="none" stroke="currentColor">');
      xnew('<path d="M6 2 10 6 6 10" />');
      system.on('-transition', ({ state }) => unit.element.style.transform = `rotate(${state * 90}deg)`);  
    });
    xnew('<div>', name);
  });

  const outer = xnew.nest('<div class="overflow-hidden">');
  const inner = xnew.nest('<div class="p-1 flex flex-col box-border">');
  system.on('-transition', ({ state }) => {
    outer.style.height = state < 1.0 ? inner.offsetHeight * state + 'px' : 'auto';
    outer.style.opacity = state;
  });
}