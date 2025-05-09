import * as THREE from 'three';
import xnew from 'xnew';
import xthree from 'xnew/addons/xthree';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const width = 1200, height = 600;

let currentBaseAction = 'idle';
const baseActions = { idle: { weight: 1 }, walk: { weight: 0 }, run: { weight: 0 } };
const additiveActions = { sneak_pose: { weight: 0 }, sad_pose: { weight: 0 }, agree: { weight: 0 }, headShake: { weight: 0 } };

xnew('#main', Main);

function Main(self) {
  xnew(xnew.Screen, { width, height });
  xthree.initialize();
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

  xnew((self) => {
    xnew.promise((resolve) => new GLTFLoader().load('./Xbot.glb', (gltf) => resolve(gltf))).then((gltf) => {
      xnew(Model, gltf);
      xnew(Panel);
    });
  });
}

function HemisphereLight(self) {
  const object = xthree.nest(new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 3));
  object.position.set(0, 20, 0);
}

function DirectionalLight(self) {
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

function Ground(self) {
  const geometry = new THREE.PlaneGeometry(100, 100);
  const material = new THREE.MeshPhongMaterial({ color: 0xcbcbcb, depthWrite: false });
  const object = xthree.nest(new THREE.Mesh(geometry, material));
  object.rotation.x = - Math.PI / 2;
  object.receiveShadow = true;
}

function Model(self, gltf) {
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

  const actions = [];
  animations.forEach((animation) => {
    let action = null;
    if (baseActions[animation.name]) {
      action = mixer.clipAction(animation);
      baseActions[animation.name].action = action;
    } else if (additiveActions[animation.name]) {
      // Make the clip additive and remove the reference frame
      THREE.AnimationUtils.makeClipAdditive(animation);
      if (animation.name.endsWith('_pose')) {
        action = mixer.clipAction(THREE.AnimationUtils.subclip(animation, animation.name, 2, 3, 30));
      } else {
        action = mixer.clipAction(animation);
      }
      additiveActions[animation.name].action = action;
    }
    if (action) {
      const settings = baseActions[animation.name] || additiveActions[animation.name];
      setWeight(action, settings.weight);
      action.play();
      actions.push(action);
    }
  });

  self.on('+synchronizeCrossFade', (startAction, endAction, duration) => {
    mixer.addEventListener('loop', onLoopFinished);

    function onLoopFinished(event) {
      if (event.action === startAction) {
        mixer.removeEventListener('loop', onLoopFinished);
        xnew.emit('+executeCrossFade', startAction, endAction, duration);
      }
    }
  });
  self.on('+executeCrossFade', (startAction, endAction, duration) => {
    // Not only the start action, but also the end action must get a weight of 1 before fading
    // (concerning the start action this is already guaranteed in this place)
    if (endAction) {
      setWeight(endAction, 1);
      endAction.time = 0;
      if (startAction) {
        // Crossfade with warping
        startAction.crossFadeTo(endAction, duration, true);
      } else {
        endAction.fadeIn(duration);
      }
    } else {
      startAction.fadeOut(duration);
    }
  });
  self.on('+modifyTimeScale', (speed) => mixer.timeScale = speed);

  self.on('+setWeight', setWeight);
  // This function is needed, since animationAction.crossFadeTo() disables its start action and sets
  // the start action's timeScale to ((start animation's duration) / (end animation's duration))

  function setWeight(action, weight) {
    action.enabled = true;
    action.setEffectiveTimeScale(1);
    action.setEffectiveWeight(weight);
  }

  const clock = new THREE.Clock();

  return {
    update() {
      // for (let i = 0; i < animations.length; i++) {
      //   const action = actions[i];
      //   const clip = action.getClip();
      //   const settings = baseActions[clip.name] || additiveActions[clip.name];
      //   settings.weight = action.getEffectiveWeight();
      // }

      mixer.update(clock.getDelta());
    }
  }
}

function Panel(self) {
  const panel = new GUI({ width: 310 });
  const folder1 = panel.addFolder('Base Actions');
  const folder2 = panel.addFolder('Additive Action Weights');
  const folder3 = panel.addFolder('General Speed');
  folder1.open();
  folder2.open();
  folder3.open();

  const panelSettings = { 'modify time scale': 1.0 };
  const crossFadeControls = [];

  const baseNames = ['None', ...Object.keys(baseActions)];

  for (let i = 0; i < baseNames.length; i++) {
    const name = baseNames[i];
    const settings = baseActions[name];
    panelSettings[name] = function () {

      const currentSettings = baseActions[currentBaseAction];
      const currentAction = currentSettings ? currentSettings.action : null;
      const action = settings ? settings.action : null;

      if (currentAction !== action) {
        prepareCrossFade(currentAction, action, 0.35);
      }
    };

    const control = folder1.add(panelSettings, name);
    control.setInactive = function () {
      control.domElement.classList.add('control-inactive');
    };
    control.setActive = function () {
      control.domElement.classList.remove('control-inactive');
    };

    if (!settings || !settings.weight) {
      control.setInactive();
    }
    crossFadeControls.push(control);
  }
  
  function prepareCrossFade(startAction, endAction, duration) {
    // If the current action is 'idle', execute the crossfade immediately;
    // else wait until the current action has finished its current loop
    if (currentBaseAction === 'idle' || !startAction || !endAction) {
      xnew.emit('+executeCrossFade', startAction, endAction, duration);
    } else {
      xnew.emit('+synchronizeCrossFade', startAction, endAction, duration);
    }

    if (endAction) {
      const clip = endAction.getClip();
      currentBaseAction = clip.name;
    } else {
      currentBaseAction = 'None';
    }

    crossFadeControls.forEach(function (control) {
      const name = control.property;
      if (name === currentBaseAction) {
        control.setActive();
      } else {
        control.setInactive();
      }
    });
  }
  
  for (const name of Object.keys(additiveActions)) {
    const settings = additiveActions[name];
    panelSettings[name] = settings.weight;
    folder2.add(panelSettings, name, 0.0, 1.0, 0.01).listen().onChange((weight) => {
      xnew.emit('+setWeight', settings.action, weight);
      settings.weight = weight;
    });
  }

  folder3.add(panelSettings, 'modify time scale', 0.0, 1.5, 0.01).onChange((...args) => xnew.emit('+modifyTimeScale', ...args)).listen();
}
