import * as PIXI from 'pixi.js';
import Matter from 'matter-js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import xnew from 'xnew';
import xpixi from 'xnew/addons/xpixi';
import xthree from 'xnew/addons/xthree';
import xmatter from 'xnew/addons/xmatter';

const width = 800, height = 600;
xnew('#main', (self) => {
  // three 
  const oscanvas = new OffscreenCanvas(width, height);
  xthree.initialize({ canvas: oscanvas });
  xthree.renderer.shadowMap.enabled = true;
  xthree.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  xthree.camera.position.set(0, 0, +10);
  xthree.scene.rotation.x = -0 / 180 * Math.PI

  // pixi
  xnew(xnew.Screen, { width, height });
  xpixi.initialize();

  xnew(Background);
  xnew(TitleScene);
  self.on('+nextscene', xnew);
});

function Background(self) {
  xnew((self) => {
    const object = xpixi.nest(new PIXI.Container());
    xnew.promise(PIXI.Assets.load('./background.jpg')).then((texture) => {
      const sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0);
      sprite.scale.set(1 / 1.4);
      object.addChild(sprite);
    });
  });
  xnew((self) => {
    const object = xthree.nest(new THREE.Object3D());
    const geometry = new THREE.PlaneGeometry(16, 14);
    const material = new THREE.ShadowMaterial({ opacity: 0.25 });
    const plane = xthree.nest(new THREE.Mesh(geometry, material));
    plane.receiveShadow = true;
    plane.rotation.x = -1 * Math.PI / 2;
    plane.position.set(0.0, -2.9, -2.0);
    object.add(plane);
  });
}

function TitleScene(self) {
  xnew((self) => {
    const object = xpixi.nest(new PIXI.Text('とーほくドロップ', { fontSize: 42, fill: 0x000000 }));
    object.position.set(width / 2, height / 2 - 150);
    object.anchor.set(0.5);
  });
  xnew((self) => {
    const object = xpixi.nest(new PIXI.Text('touch start', { fontSize: 26, fill: 0x000000 }));
    object.position.set(width / 2, height / 2 - 50);
    object.anchor.set(0.5);
    return {
      update(count) {
        object.alpha = 0.6 + Math.sin(count * 0.08) * 0.4;
      }
    }
  });

  xnew(DirectionaLight, { x: 2, y: 12, z: 20 });
  xnew(AmbientLight);

  for (let i = 0; i < 7; i++) {
    const model = xnew(Model, { size: i + 1, scale: 1.4 });
    model.setPosition(140 + i * 90, 450, 0);
    model.object.rotation.y = (-10 - 3 * i) / 180 * Math.PI;
    model.object.rotation.x = 10 / 180 * Math.PI;
  }
  xpixi.connect(xthree.renderer.domElement);

  xnew(window).on('keydown pointerdown', () => {
    xnew.emit('+nextscene', GameScene);
    self.finalize();
  });
}

function GameScene(scene) {
  xmatter.initialize();

  xnew(DirectionaLight, { x: 2, y: 5, z: 10 });
  xnew(AmbientLight);

  const controller = xnew(Controller);
  xnew(ScoreText);
  xnew(Bowl);
  xnew(Cursor);
  xnew(Queue);
  xpixi.connect(xthree.renderer.domElement);
  scene.on('+addobject', xnew);

  scene.on('+gameover', () => {
    xnew(GameOverText);
    controller.finalize();

    xnew.timeout(() => {
      xnew(window).on('keydown pointerdown', () => {
        xnew.emit('+nextscene', TitleScene);
        scene.finalize();
      });
    }, 1000);
  });
}

function DirectionaLight(self, { x, y, z }) {
  const object = xthree.nest(new THREE.DirectionalLight(0xFFFFFF, 1.7));
  object.position.set(x, y, z);
  object.castShadow = true;
  object.shadow.camera.near = 0.1;
  object.shadow.camera.far = 100.0;
  object.shadow.camera.updateProjectionMatrix();
}

function AmbientLight(self) {
  const object = xthree.nest(new THREE.AmbientLight(0xFFFFFF, 1.2));
}

function Controller(self) {
  const screen = xnew.find(xnew.Screen)[0];
  const user = xnew(screen.canvas, xnew.UserEvent);
  user.on('-pointermove -pointerdown', ({ position }) => {
    xnew.emit('+move', { x: position.x * screen.scale.x });
  });
  user.on('-pointerdown', () => xnew.emit('+action'));
}

function ScoreText(self) {
  const object = xpixi.nest(new PIXI.Text('score 0', { fontSize: 32, fill: 0x000000 }));
  object.position.set(width - 10, 10);
  object.anchor.set(1, 0);

  let sum = 0;
  self.on('+scoreup', (score) => object.text = `score ${sum += score}`);
}

function Bowl(self) {
  for (let angle = 10; angle <= 170; angle++) {
    const x = 400 + Math.cos(angle * Math.PI / 180) * 240;
    const y = 360 + Math.sin(angle * Math.PI / 180) * 200;
    xnew(Circle, { x, y, r: 12, color: 0x00AAAA }, { isStatic: true });
  }
}

function Queue(self) {
  const balls = [...Array(4)].map(() => Math.floor(1 + Math.random() * 3));
  xnew.emit('+reloadcomplete', 1);

  let model = xnew(Model, { size: balls[0], scale: 1 });
  model.setPosition(70, 60, 0);
  model.object.rotation.y = 60 / 180 * Math.PI;
  model.object.rotation.x = 30 / 180 * Math.PI;

  self.on('+reload', () => {
    const next = balls.shift();
    model.finalize();
    model = xnew(Model, { size: balls[0], scale: 1 });
    model.setPosition(0, 60, 0);
    model.object.rotation.y = 60 / 180 * Math.PI;
    model.object.rotation.x = 30 / 180 * Math.PI;

    balls.push(Math.floor(1 + Math.random() * 3));
    xnew.transition((progress) => {
      model.setPosition(0 + progress * 70, 60, 0);
      if (progress === 1.0) {
        xnew.emit('+reloadcomplete', next);
      }
    }, 500);
  });
}

function Model(self, { x, y, r = 0.0, size = 1, scale = 1.0 }) {
  const object = xthree.nest(new THREE.Object3D());
  object.rotation.z = -r;

  const list = ['./zundamon.vrm', './usagi.vrm', './kiritan.vrm', './metan.vrm', './sora.vrm', './zunko.vrm', './itako.vrm'];
  const path = size < 8 ? list[size - 1] : list[0];

  let vrm = null;
  xnew.promise((resolve) => {
    const loader = new GLTFLoader();
    loader.register((parser) => {
      return new VRMLoaderPlugin(parser);
    });
    loader.load(path, (gltf) => resolve(gltf));
  }).then((gltf) => {
    vrm = gltf.userData.vrm;
    vrm.scene.traverse((object) => {
      if (object.isMesh) object.castShadow = true;
      if (object.isMesh) object.receiveShadow = true;
    });
    vrm.scene.position.y = -scale * 0.5;
    vrm.scene.scale.set(scale * 0.5, scale * 0.5, scale * 0.5);
    object.add(vrm.scene);
  });

  const offset = Math.random() * 10;

  self.on('update', (count) => {
    const neck = vrm.humanoid.getNormalizedBoneNode('neck');
    const chest = vrm.humanoid.getNormalizedBoneNode('chest');
    const hips = vrm.humanoid.getNormalizedBoneNode('hips');
    const leftUpperArm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
    const rightUpperArm = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
    const leftUpperLeg = vrm.humanoid.getNormalizedBoneNode('leftUpperLeg');
    const rightUpperLeg = vrm.humanoid.getNormalizedBoneNode('rightUpperLeg');
    const t = (count + offset) * 0.03;
    neck.rotation.x = Math.sin(t * 6) * +0.1;
    chest.rotation.x = Math.sin(t * 12) * +0.1;
    hips.position.z = Math.sin(t * 12) * 0.1;
    leftUpperArm.rotation.z = Math.sin(t * 12 + offset) * +0.7;
    leftUpperArm.rotation.x = Math.sin(t * 6 + offset) * +0.8;
    rightUpperArm.rotation.z = Math.sin(t * 12) * -0.7;
    rightUpperArm.rotation.x = Math.sin(t * 6) * +0.8;
    leftUpperLeg.rotation.z = Math.sin(t * 8) * +0.2;
    leftUpperLeg.rotation.x = Math.sin(t * 12) * +0.7;
    rightUpperLeg.rotation.z = Math.sin(t * 8) * -0.2;
    rightUpperLeg.rotation.x = Math.sin(t * 12) * -0.7;
    vrm.update(t);
  });

  return {
    object,
    setPosition(x, y, r) {
      const cx = width / 2;
      const cy = height / 2;
      const X = (x - cx) / 70;
      const Y = - (y - cy) / 70;
      object.position.set(X, Y, 0);
      object.rotation.z = -r;
    },
  }
}

function Cursor(self) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(400, 40);

  const circle = new PIXI.Graphics();
  object.addChild(circle);
  object.addChild(new PIXI.Graphics().moveTo(-12, 0).lineTo(12, 0).stroke({ color: 0xFFFFFF, width: 4 }));
  object.addChild(new PIXI.Graphics().moveTo(0, -12).lineTo(0, 12).stroke({ color: 0xFFFFFF, width: 4 }));

  self.on('+move', ({ x }) => object.x = Math.max(Math.min(x, width / 2 + 190), width / 2 - 190));

  let next = null;
  let model = null
  let offset = 50;
  self.on('+reloadcomplete', (level) => {
    next = level;
    circle.circle(0, 0, 32).fill(0xAACCAA);
    model = xnew(Model, { size: next, scale: 1 });
    model.setPosition(object.x, object.y + offset, 0);
  });
  self.on('+action', () => {
    if (next !== null) {
      circle.clear();
      xnew.emit('+addobject', ModelBall, { x: object.x, y: object.y + offset, size: next, score: Math.pow(2, next - 1)});
      if (model) {
        model.finalize();
        model = null;
      }
      xnew.emit('+reload');
      next = null;
    } 
  });

  self.on('update', () => {
    object.rotation += 0.02;
    if (model) {
      model.setPosition(object.x, object.y + offset, 0);
    }
  });
}

function ModelBall(self, { x, y, a = 0, size = 1, score = 1 }) {
  const scale = [1.0, 1.5, 2.0, 2.5, 2.9, 3.3, 3.6, 3.8, 3.8, 3.8][size];
  const r = 35 + Math.pow(3.0, scale);
  xnew.extend(Circle, { x, y, r, color: 0, alpha: 0.0 });
  
  const model = xnew(Model, { r, size, scale });
  xnew.emit('+scoreup', score);
  
  self.on('update', () => {
    model.setPosition(self.object.x, self.object.y, self.object.rotation);
    if (self.object.y > height - 10) {
      xnew.emit('+gameover');
      self.finalize();
      return;
    }
    for (const target of xnew.find(ModelBall)) {
      if (self.mergeCheck(target)) {
        const score = self.score + target.score;
        const size = self.size + 1;
        const x = (self.object.x + target.object.x) / 2;
        const y = (self.object.y + target.object.y) / 2;
        const a = (self.object.rotation + target.object.rotation) / 2;
        xnew.emit('+addobject', ModelBall, { x, y, a, size, score });
        self.finalize();
        target.finalize();
        break;
      }
    }
  });
  return {
    r, score, size, isMearged: false,
    mergeCheck(target) {
      if (self === target || self.score !== target.score) return false;
      if (self.isMearged === true || target.isMearged === true) return false;
      const dx = target.object.x - self.object.x;
      const dy = target.object.y - self.object.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > self.r + target.r + 0.01) return false;
      return true;
    }
  }
}

function GameOverText(self) {
  const object = xpixi.nest(new PIXI.Text('game over', { fontSize: 32, fill: 0x000000 }));
  object.position.set(width / 2, height / 2);
  object.anchor.set(0.5);
}

function Circle(self, { x, y, r, color = 0xFFFFFF, alpha = 1.0 }, options = {}) {
  const object = xpixi.nest(new PIXI.Container());
  const pyshics = xmatter.nest(Matter.Bodies.circle(x, y, r, options));
  const graphics = new PIXI.Graphics().circle(0, 0, r).fill(color);
  object.position.set(x, y);
  object.addChild(graphics);
  object.alpha = alpha;

  self.on('update', () => {
    object.rotation = pyshics.angle;
    object.position.set(pyshics.position.x, pyshics.position.y);
  });
  return {
    object,
    set color(color) {
      graphics.clear().circle(0, 0, r).fill(color);
    },
  };
}
