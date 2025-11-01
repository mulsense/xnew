import * as THREE from 'three';
import xnew from 'xnew';
import xthree from 'xnew/addons/xthree';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

xnew('#main', Main);

function Main(unit) {
  const width = 1200, height = 600;
  const screen = xnew(xnew.basics.Screen, { width, height });
  xthree.initialize({ canvas: screen.element });
  xthree.scene.background = new THREE.Color(0xa0a0a0);
  xthree.scene.fog = new THREE.Fog(0xa0a0a0, 10, 50);
  xthree.renderer.shadowMap.enabled = true;
  xthree.camera.position.set(- 1, 2, 3);

  const controls = new OrbitControls(xthree.camera, xthree.renderer.domElement);
  controls.target.set(0, 1, 0);
  controls.update();

  xnew(HemisphereLight);
  xnew(DirectionalLight);
  xnew(Ground);

  xnew.promise(new Promise((resolve) => {
    new GLTFLoader().load('./Xbot.glb', (gltf) => resolve(gltf));
  })).then((gltf) => {
    xnew(Model, { gltf });
    xnew(Panel);
  });
}

function HemisphereLight(unit) {
  const object = xthree.nest(new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 3));
  object.position.set(0, 20, 0);
}

function DirectionalLight(unit) {
  const object = xthree.nest(new THREE.DirectionalLight(0xffffff, 3));
  object.position.set(3, 10, 10);
  object.castShadow = true;
  object.shadow.camera.top = 2;
  object.shadow.camera.bottom = - 2;
  object.shadow.camera.left = - 2;
  object.shadow.camera.right = 2;
  object.shadow.camera.near = 0.1;
  object.shadow.camera.far = 40;
}

function Ground(unit) {
  const geometry = new THREE.PlaneGeometry(100, 100);
  const material = new THREE.MeshPhongMaterial({ color: 0xcbcbcb, depthWrite: false });
  const object = xthree.nest(new THREE.Mesh(geometry, material));
  object.rotation.x = - Math.PI / 2;
  object.receiveShadow = true;
}

let select = 'idle';
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

  unit.on('+synchronizeCrossFade', (currentAction, nextAction, duration) => {
    mixer.addEventListener('loop', onLoopFinished);

    function onLoopFinished(event) {
      if (event.action === currentAction) {
        mixer.removeEventListener('loop', onLoopFinished);
        unit.emit('+executeCrossFade', currentAction, nextAction, duration);
      }
    }
  });
  unit.on('+executeCrossFade', (currentAction, nextAction, duration) => {
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

function Panel(unit) {
  xnew('<div style="position: absolute; top: 8px; right: 8px; width: 200px;">', (frame) => {
    xnew.extend(xnew.basics.PanelFrame);
    xnew.nest('<div style="padding: 6px; font-size: 0.8em; background: #FFF; border: solid 1px #AAA; border-radius: 6px;">')

    xnew('<div style="margin: 2px;">', 'Panel');

    xnew((unit) => {
      xnew.extend(xnew.basics.PanelGroup, { name: 'actions', open: true });

      for (const name of ['none', ...Object.keys(baseActions)]) {
        const button = xnew(`<button style="width: 100%;">`, name);
        button.on('click', () => {
          const currentAction = baseActions[select] ? baseActions[select].action : null;
          const nextAction = baseActions[name] ? baseActions[name].action : null;

          if (currentAction !== nextAction) {
            if (select === 'idle' || !currentAction || !nextAction) {
              unit.emit('+executeCrossFade', currentAction, nextAction, 0.35);
            } else {
              unit.emit('+synchronizeCrossFade', currentAction, nextAction, 0.35);
            }
            select = nextAction ? nextAction.getClip().name : 'none';
          }
        });
      }
    });
    
    xnew((unit) => {
      xnew.extend(xnew.basics.PanelGroup, { name: 'action weights', open: true });

      for (const name of Object.keys(additiveActions)) {
        xnew((frame) => {
          xnew.extend(xnew.basics.InputFrame);
          xnew('<div style="font-size: 0.9em; display: flex; justify-content: space-between;">', (unit) => {
              xnew('<div style="flex: auto">', name);
              const status = xnew('<div style="flex: none">', '0');
              frame.on('-input', ({ event }) => {
                status.element.textContent = event.target.value;
              })
          });
          
          const settings = additiveActions[name];
          xnew(`<input type="range" name="${name}" min="0.00" max="1.00" value="${settings.weight}" step="0.01" style="margin: 0; width: 100%">`);
       
          frame.on('-input', ({ event }) => {
            settings.weight = parseFloat(event.target.value);
            unit.emit('+setWeight', settings.action, settings.weight);
          });
        });
      }

    });
    xnew((unit) => {
      xnew.extend(xnew.basics.PanelGroup, { name: 'options', open: true });
      xnew((frame) => {
        xnew.extend(xnew.basics.InputFrame);
        xnew('<div style="font-size: 0.9em; display: flex; justify-content: space-between;">', (unit) => {
          xnew('<div style="flex: auto">', 'speed');
          const status = xnew('<div style="flex: none">', '1.0');
          frame.on('-input', ({ event }) => {
            status.element.textContent = event.target.value;
          })
        });

        xnew('<input type="range" name="speed" min="0.01" max="2.00" value="1.00" step="0.01" style="margin: 0; width: 100%">');
        frame.on('-input', ({ event }) => {
          unit.emit('+speed', parseFloat(event.target.value));
        });
      });
    });
  });
}
