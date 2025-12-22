import * as THREE from 'three';
import xnew from '@mulsense/xnew';
import xthree from '@mulsense/xnew/addons/xthree';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

xnew('#main', Main);

function Main(main) {
  xnew.extend(xnew.basics.Screen, { width: 1200, height: 600 });

  // three setup
  xthree.initialize({ canvas: main.canvas });
  xthree.scene.background = new THREE.Color(0xa0a0a0);
  xthree.scene.fog = new THREE.Fog(0xa0a0a0, 10, 50);
  xthree.renderer.shadowMap.enabled = true;
  xthree.camera.position.set(- 1, 2, 3);

  const controls = new OrbitControls(xthree.camera, xthree.canvas);
  controls.target.set(0, 1, 0);
  controls.update();

  xnew(HemisphereLight, { x: 0, y: 20, z: 0 });
  xnew(DirectionalLight, { x: 3, y: 10, z: 10 });
  xnew(Ground);

  xnew.promise(new Promise((resolve) => {
    new GLTFLoader().load('./Xbot.glb', (gltf) => resolve(gltf));
  })).then((gltf) => {
    xnew(Model, { gltf });
    xnew('<div class="absolute w-48 top-2 right-2">', Panel);
  });
}

function HemisphereLight(unit, { x, y, z }) {
  const object = xthree.nest(new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 3));
  object.position.set(x, y, z);
}

function DirectionalLight(unit, { x, y, z }) {
  const object = xthree.nest(new THREE.DirectionalLight(0xffffff, 3));
  object.position.set(x, y, z);
  object.castShadow = true;
}

function Ground(unit) {
  const geometry = new THREE.PlaneGeometry(100, 100);
  const material = new THREE.MeshPhongMaterial({ color: 0xcbcbcb, depthWrite: false });
  const object = xthree.nest(new THREE.Mesh(geometry, material));
  object.rotation.x = - Math.PI / 2;
  object.receiveShadow = true;
}

const baseActions = { idle: { weight: 1 }, walk: { weight: 0 }, run: { weight: 0 } };
const additiveActions = { sneak_pose: { weight: 0 }, sad_pose: { weight: 0 }, agree: { weight: 0 }, headShake: { weight: 0 } };

function Model(unit, { gltf }) {
  const object = xthree.nest(new THREE.Object3D());
  const model = gltf.scene;
  const animations = gltf.animations;
  const mixer = new THREE.AnimationMixer(model);
  const skeleton = new THREE.SkeletonHelper(model);
 
  object.add(model);
  object.add(skeleton);

  model.traverse((object) => {
    if (object.isMesh) object.castShadow = true;
  });

  for (const animation of animations) {
    let settings = null;
    if (baseActions[animation.name]) {
      settings = baseActions[animation.name];
      settings.action = mixer.clipAction(animation);
    } else if (additiveActions[animation.name]) {
      settings = additiveActions[animation.name];
      // Make the clip additive and remove the reference frame
      THREE.AnimationUtils.makeClipAdditive(animation);
      if (animation.name.endsWith('_pose')) {
        settings.action = mixer.clipAction(THREE.AnimationUtils.subclip(animation, animation.name, 2, 3, 30));
      } else {
        settings.action = mixer.clipAction(animation);
      }
    }
    if (settings) {
      setWeight(settings.action, settings.weight);
      settings.action.play();
    }
  }

  unit.on('+synccrossfade', (currentAction, nextAction, duration) => {
    mixer.addEventListener('loop', onLoopFinished);

    function onLoopFinished(event) {
      if (event.action === currentAction) {
        mixer.removeEventListener('loop', onLoopFinished);
        xnew.emit('+crossfade', currentAction, nextAction, duration);
      }
    }
  });
  unit.on('+crossfade', (currentAction, nextAction, duration) => {
    if (nextAction) {
      setWeight(nextAction, 1);
      nextAction.time = 0;
      if (currentAction) {
        currentAction.crossFadeTo(nextAction, duration, true);
      } else {
        nextAction.fadeIn(duration);
      }
    } else {
      currentAction.fadeOut(duration);
    }
  });
  unit.on('+speed', (speed) => mixer.timeScale = speed);

  unit.on('+setWeight', setWeight);

  function setWeight(action, weight) {
    action.enabled = true;
    action.setEffectiveTimeScale(1);
    action.setEffectiveWeight(weight);
  }

  const clock = new THREE.Clock();
  unit.on('update', () => {
    mixer.update(clock.getDelta());
  });
}

function Panel(frame) {
  xnew.nest('<div class="p-1 bg-white border border-gray-300 rounded shadow-lg">');
  xnew('<div>', 'Panel');

  let select = 'idle';
  xnew((group) => {
    xnew.extend(PanelGroup, { name: 'actions', open: true });

    for (const name of ['none', ...Object.keys(baseActions)]) {
      const button = xnew('<button class="m-0.5 border rounded-lg hover:bg-gray-100 cursor-pointer">', name);
      button.on('click', () => {
        const currentAction = baseActions[select] ? baseActions[select].action : null;
        const nextAction = baseActions[name] ? baseActions[name].action : null;

        if (currentAction !== nextAction) {
          if (select === 'idle' || !currentAction || !nextAction) {
            xnew.emit('+crossfade', currentAction, nextAction, 0.35);
          } else {
            xnew.emit('+synccrossfade', currentAction, nextAction, 0.35);
          }
          select = nextAction ? nextAction.getClip().name : 'none';
        }
      });
    }
  });
  
  xnew((group) => {
    xnew.extend(PanelGroup, { name: 'action weights', open: true });

    for (const name of Object.keys(additiveActions)) {
      xnew((frame) => {
        let status;
        xnew('<div class="text-sm flex justify-between">', (unit) => {
            xnew('<div class="flex-auto">', name);
            status = xnew('<div class="flex-none">', '0');
        });
        
        const settings = additiveActions[name];
        const input = xnew(`<input type="range" name="${name}" min="0.00" max="1.00" value="${settings.weight}" step="0.01" class="w-full">`);
        input.on('input', (event) => {
          status.element.textContent = event.target.value;
          settings.weight = parseFloat(event.target.value);
          xnew.emit('+setWeight', settings.action, settings.weight);
        });
      });
    }

  });

  xnew((group) => {
    xnew.extend(PanelGroup, { name: 'options', open: true });
    xnew((unit) => {
      let status;
      xnew('<div class="text-sm flex justify-between">', (unit) => {
        xnew('<div class="flex-auto">', 'speed');
        status = xnew('<div class="flex-none">', '1.0');
      });

      const input = xnew('<input type="range" name="speed" min="0.01" max="2.00" value="1.00" step="0.01" class="w-full">');
      input.on('input', (event) => {
        status.element.textContent = event.target.value;
        xnew.emit('+speed', parseFloat(event.target.value));
      });
    });
  });
}
function PanelGroup(group, { name, open = false }) {
  xnew.extend(xnew.basics.AccordionFrame, { open });
  xnew((header) => {
      xnew.nest('<div style="margin: 0.2em 0;">');
      xnew.extend(xnew.basics.AccordionHeader);
      xnew(xnew.basics.AccordionBullet);
      xnew('<div>', name);
  });
  xnew.extend(xnew.basics.AccordionContent);
}