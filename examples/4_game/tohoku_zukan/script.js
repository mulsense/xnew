import * as PIXI from 'pixi.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import xnew from '@mulsense/xnew';
import xpixi from '@mulsense/xnew/addons/xpixi';
import xthree from '@mulsense/xnew/addons/xthree';

let characterData = [];

// Load character data from JSON
fetch('./characters.json')
  .then(response => response.json())
  .then(data => {
    characterData = data;
    xnew('#main', Main);
  })
  .catch(error => {
    console.error('Failed to load character data:', error);
  });

function Main(unit) {
  // three
  xthree.initialize({ canvas: new OffscreenCanvas(800, 600) });
  xthree.renderer.shadowMap.enabled = true;
  xthree.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  xthree.camera.position.set(0, 0, 5);

  // pixi
  const screen = xnew(xnew.basics.Screen, { width: 800, height: 600 });
  xpixi.initialize({ canvas: screen.canvas });

  xnew(PokedexScene);
}

function PokedexScene(scene) {
  // Background
  const background = xpixi.nest(new PIXI.Graphics()
    .rect(0, 0, 800, 600)
    .fill(0xE8F5E9));

  // Lights
  xnew(DirectionalLight, { x: 2, y: 3, z: 5 });
  xnew(AmbientLight);

  // Shadow plane
  xnew(ShadowPlane);

  // Current character state
  let currentCharacterId = 0;

  // UI Container
  const uiContainer = xnew(UIContainer, { characterData, currentCharacterId });

  // Character model
  let currentModel = xnew(CharacterModel, { id: currentCharacterId });

  // Texture sync
  xnew(Texture, { texture: xpixi.sync(xthree.canvas) });

  // Navigation buttons
  xnew(NavigationButtons, {
    onPrev: () => {
      currentCharacterId = (currentCharacterId - 1 + characterData.length) % characterData.length;
      currentModel.finalize();
      currentModel = xnew(CharacterModel, { id: currentCharacterId });
      uiContainer.updateCharacter(currentCharacterId);
    },
    onNext: () => {
      currentCharacterId = (currentCharacterId + 1) % characterData.length;
      currentModel.finalize();
      currentModel = xnew(CharacterModel, { id: currentCharacterId });
      uiContainer.updateCharacter(currentCharacterId);
    }
  });
}

function ShadowPlane(unit) {
  const geometry = new THREE.PlaneGeometry(10, 10);
  const material = new THREE.ShadowMaterial({ opacity: 0.3 });
  const plane = xthree.nest(new THREE.Mesh(geometry, material));
  plane.receiveShadow = true;
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(0, -1.5, 0);
}

function DirectionalLight(unit, { x, y, z }) {
  const object = xthree.nest(new THREE.DirectionalLight(0xFFFFFF, 1.5));
  object.position.set(x, y, z);
  object.castShadow = true;
  object.shadow.mapSize.width = 1024;
  object.shadow.mapSize.height = 1024;
}

function AmbientLight(unit) {
  const object = xthree.nest(new THREE.AmbientLight(0xFFFFFF, 0.8));
}

function Texture(unit, { texture } = {}) {
  const object = xpixi.nest(new PIXI.Sprite(texture));
}

function CharacterModel(unit, { id }) {
  const object = xthree.nest(new THREE.Object3D());
  object.position.set(0, -1.0, 0);

  const path = '../assets/' + characterData[id].model;
  let vrm = null;
  let loaded = false;

  xnew.promise(new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load(path, (gltf) => resolve(gltf));
  })).then((gltf) => {
    vrm = gltf.userData.vrm;
    vrm.scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    object.add(vrm.scene);
    loaded = true;
  });

  let count = 0;
  unit.on('-update', () => {
    if (!loaded || !vrm) return;

    const t = count * 0.01;
    object.rotation.y = Math.sin(t * 0.5) * 0.3;

    const neck = vrm.humanoid.getNormalizedBoneNode('neck');
    const chest = vrm.humanoid.getNormalizedBoneNode('chest');
    const leftUpperArm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
    const rightUpperArm = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');

    if (neck) neck.rotation.x = Math.sin(t * 2) * 0.05;
    if (chest) chest.rotation.x = Math.sin(t * 2) * 0.03;
    if (leftUpperArm) {
      leftUpperArm.rotation.z = Math.sin(t * 3) * 0.3;
      leftUpperArm.rotation.x = Math.sin(t * 2) * 0.2;
    }
    if (rightUpperArm) {
      rightUpperArm.rotation.z = Math.sin(t * 3 + Math.PI) * -0.3;
      rightUpperArm.rotation.x = Math.sin(t * 2 + Math.PI) * 0.2;
    }

    vrm.update(t);
    count++;
  });
}

function UIContainer(unit, { characterData, currentCharacterId }) {
  const container = xpixi.nest(new PIXI.Container());

  // Title
  const title = new PIXI.Text('とーほく ずかん', {
    fontSize: 36,
    fill: 0x2E7D32,
    fontWeight: 'bold'
  });
  title.position.set(400, 30);
  title.anchor.set(0.5, 0);
  container.addChild(title);

  // Info panel background
  const panelBg = new PIXI.Graphics()
    .roundRect(50, 400, 700, 170, 15)
    .fill(0xFFFFFF)
    .stroke({ color: 0x4CAF50, width: 3 });
  container.addChild(panelBg);

  // Character info texts
  const nameText = new PIXI.Text('', { fontSize: 28, fill: 0x1B5E20, fontWeight: 'bold' });
  nameText.position.set(70, 420);
  container.addChild(nameText);

  const typeText = new PIXI.Text('', { fontSize: 20, fill: 0x388E3C });
  typeText.position.set(70, 455);
  container.addChild(typeText);

  const statsText = new PIXI.Text('', { fontSize: 18, fill: 0x424242 });
  statsText.position.set(70, 485);
  container.addChild(statsText);

  const descriptionText = new PIXI.Text('', {
    fontSize: 16,
    fill: 0x616161,
    wordWrap: true,
    wordWrapWidth: 650
  });
  descriptionText.position.set(70, 515);
  container.addChild(descriptionText);

  // Counter text
  const counterText = new PIXI.Text('', { fontSize: 20, fill: 0x1B5E20 });
  counterText.position.set(720, 425);
  counterText.anchor.set(1, 0);
  container.addChild(counterText);

  function updateInfo(id) {
    const char = characterData[id];
    nameText.text = `No.${(id + 1).toString().padStart(3, '0')} ${char.name}`;
    typeText.text = `タイプ: ${char.type}`;
    statsText.text = `たかさ: ${char.height}  おもさ: ${char.weight}`;
    descriptionText.text = char.description;
    counterText.text = `${id + 1} / ${characterData.length}`;
  }

  updateInfo(currentCharacterId);

  return {
    updateCharacter(id) {
      updateInfo(id);
    }
  };
}

function NavigationButtons(unit, { onPrev, onNext }) {
  xnew(xpixi.canvas.parentElement, () => {
    xnew.nest('<div class="absolute inset-0 w-full h-full" style="container-type: size;">');

    // Previous button
    xnew('<div class="absolute left-[2cqw] top-[50%] -translate-y-1/2">', () => { 
      const prevButton = xnew('<button class="border-[0.5cqw] border-gray-800 text-[4cqw] rounded-full w-[10cqw] h-[10cqw] bg-blue-300 hover:bg-blue-500 cursor-pointer flex items-center justify-center">', '◀');
      prevButton.on('click', onPrev);
    });

    // Next button
    xnew('<div class="absolute right-[2cqw] top-[50%] -translate-y-1/2">', () => {
      const nextButton = xnew('<button class="border-[0.5cqw] border-gray-800 text-[4cqw] rounded-full w-[10cqw] h-[10cqw] bg-blue-300 hover:bg-blue-500 cursor-pointer flex items-center justify-center">', '▶');
      nextButton.on('click', onNext);
    });
  });
}
