import xnew from 'xnew';
import xthree from 'xnew/addons/xthree';
import * as THREE from 'three';
import { Water } from 'Water.js';
import { Sky } from 'Sky.js';
import { mog } from './mog3d.js';

xnew('#main', Main);

function Main(self) {
  xnew(xnew.Screen, { width: 800, height: 400 });
  xthree.initialize();
  xthree.renderer.shadowMap.enabled = true;
  xthree.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  xthree.camera.position.set(0, 0, +200);

  xnew(Controller);
  xnew(ThreeMain);
}

function Controller(self) {
  self.on('touchstart contextmenu wheel', (event) => event.preventDefault());

  const pivot1 = xthree.nest(new THREE.Object3D());
  const pivot2 = xthree.nest(new THREE.Object3D());
  pivot2.add(xthree.camera);
  self.on('+scale', (scale) => {
    xthree.camera.position.z /= scale;
  });
  self.on('+translate', (move) => {
    xthree.camera.position.x += move.x * xthree.camera.position.z * 0.001;
    xthree.camera.position.y += move.y * xthree.camera.position.z * 0.001;
  });
  self.on('+rotate', (move) => {
    pivot2.rotation.x -= move.y * 0.01;
    pivot1.rotation.y -= move.x * 0.01;
    // pivot.rotation.y -= move.x * 0.01;
  });

  const user = xnew(xnew.UserEvent);
  let isActive = false;
  user.on('-gesturestart', () => isActive = true);
  user.on('-gestureend', () => isActive = false);
  user.on('-gesturemove', ({ scale }) => xnew.emit('+scale', scale));
  
  user.on('-dragmove', ({ event, delta }) => {
    if (isActive === true) return;
    if (event.buttons & 1 || !event.buttons) {
      xnew.emit('+rotate', { x: +delta.x, y: +delta.y });
    }
    if (event.buttons & 2) {
      xnew.emit('+translate', { x: -delta.x, y: +delta.y });
    }
  });

  user.on('-wheel', ({ delta }) => xnew.emit('+scale', 1 + 0.001 * delta.y));
}

function ThreeMain(self) {
  const object = xthree.nest(new THREE.Object3D()); 
  xnew(DirectionaLight, { x: 200, y: -500, z: 1000 });
  xnew(AmbientLight);
  object.rotation.x = -90 / 180 * Math.PI

  mog._load('./demo.mog', xnew.scope((union) => {
    build(union);
    union.object.position.z = -4.5;
    union.object.rotation.x = 90 / 180 * Math.PI
    object.add(union.object); 
    union.object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }));
  
  xnew(WaterPlane);
  const sky = xnew(SkyDorm);
  xnew(Sun, sky.object);
  //xnew(Ground, { size: 1000, color: 0xF8F8FF });
  // xnew(Dorm, { size: 500 });
  // xnew(Cube, { x: 0, y: 0, z: 20, size: 40, color: 0xAAAAFF });
  xnew((self) => {
    const geometry = new THREE.PlaneGeometry(800,780);
    const material = new THREE.ShadowMaterial({ opacity: 0.15 });
    const plane = xthree.nest(new THREE.Mesh(geometry, material));
    plane.receiveShadow = true;
  });
}

function WaterPlane(self) {
  const object = xthree.nest(new Water(
    new THREE.PlaneGeometry(800,780),
    {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: new THREE.TextureLoader().load( './Water_1_M_Normal.jpg', function(texture){
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        } ),
        alpha: 1,
        waterColor: 0x1e293e,
        fog:xthree.scene.fog !== undefined
    }
  ));
 
  self.on('update', () => {
    object.material.uniforms['time'].value += 1.0 / 60.0;
  })
}
function SkyDorm(self) {
  const sky = xthree.nest(new Sky());
  sky.scale.setScalar(450000);
  
  //Skyの設定
  const sky_uniforms = sky.material.uniforms;
  sky_uniforms['turbidity'].value = 10;
  sky_uniforms['rayleigh'].value = 2;
  sky_uniforms['mieCoefficient'].value = 0.005;
  sky_uniforms['mieDirectionalG'].value = 0.8;
  return {
    object: sky
  };
}

function Sun(self, sky) {
  const sunSphere = xthree.nest(new THREE.Mesh(
    new THREE.SphereGeometry(200,16,8),
    new THREE.MeshBasicMaterial({color:0xFFFFFF})
  ));
  const sun_uniforms = sky.material.uniforms;
  sun_uniforms['turbidity'].value = 10;
  sun_uniforms['rayleigh'].value = 2;
  sun_uniforms['mieCoefficient'].value = 0.005;
  sun_uniforms['mieDirectionalG'].value = 0.8;
  // sun_uniforms['luminance'].value = 1;
  
  const theta = Math.PI * -170 / 180;
  const phi = 2 * Math.PI * ( -0.25 );
  const distance = 400000;
  sunSphere.position.x = distance * Math.cos(phi);
  sunSphere.position.y = distance * Math.sin(phi) * Math.sin(theta);
  sunSphere.position.z = distance * Math.sin(phi) * Math.cos(theta);
  sunSphere.visible = true;
  sun_uniforms['sunPosition'].value.copy(sunSphere.position);
}
function DirectionaLight(self, { x, y, z }) {
  const object = xthree.nest(new THREE.DirectionalLight(0xFFFFFF, 2.5));
  object.position.set(x, y, z);
  object.shadow.bias = -0.0001;
  object.shadow.normalBias = 0.02;
  xthree.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const s = object.position.length();
  object.castShadow = true;
  object.shadow.mapSize.width = 4096;
  object.shadow.mapSize.height = 4096;
  object.shadow.camera.left = -s * 0.6;
  object.shadow.camera.right = +s * 0.6;
  object.shadow.camera.top = -s * 0.6;
  object.shadow.camera.bottom = +s * 0.6;
  object.shadow.camera.near = +s * 0.6;
  object.shadow.camera.far = +s * 5.0;
  object.shadow.camera.updateProjectionMatrix();
}

function AmbientLight(self) {
  const object = xthree.nest(new THREE.AmbientLight(0xFFFFFF, 0.5));
}

function Dorm(self, { size }) {
  const geometry = new THREE.SphereGeometry(size * 3, 25, 25);
  const material = new THREE.MeshBasicMaterial({ color: 0xEEEEFF, side: THREE.BackSide });
  const object = xthree.nest(new THREE.Mesh(geometry, material));
}

function Ground(self, { size, color }) {
  const geometry = new THREE.PlaneGeometry(size, size, 1, 1);
  const material = new THREE.MeshStandardMaterial({ color, transparent: true, });
  const object = xthree.nest(new THREE.Mesh(geometry, material));
  object.receiveShadow = true;
  object.material.opacity = 0.7;
}

function Cube(self, { x, y, z, size, color }) {
  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = new THREE.MeshLambertMaterial({ color, });
  const object = xthree.nest(new THREE.Mesh(geometry, material));
  object.position.set(x, y, z);
  object.castShadow = true;
}

function build(union) {
  union.object = new THREE.Object3D();

  union.layouts.forEach(layout => {
    const unit = layout.unit;

    const vox = new THREE.Object3D();
    unit.models.forEach(model => {
      const buffer = model.buffer;

      const bgeom = new THREE.BufferGeometry();
      bgeom.setAttribute('position', new THREE.BufferAttribute(buffer.vtxs, 3));
      bgeom.setAttribute('normal', new THREE.BufferAttribute(buffer.nrms, 3, true));
      bgeom.setAttribute('uv', new THREE.BufferAttribute(buffer.uvs, 2, true));

      const texture = new THREE.DataTexture(buffer.dtex.data, buffer.dtex.dsize[0], buffer.dtex.dsize[1], THREE.RGBAFormat, THREE.UnsignedByteType);
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;
      texture.needsUpdate = true;

      const mesh = new THREE.Mesh(bgeom, new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide, roughness: 1.0}));
      mesh.texture = texture;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      mesh.position.set(-unit.dsize[0] / 2.0, 0.0, -unit.dsize[2] / 2.0);

      const wrap = new THREE.Object3D();
      wrap.add(mesh);

      vox.add(wrap);
    });

    vox.position.set(layout.pos[0], layout.pos[1], layout.pos[2]);
    vox.rotation.set(layout.ang[0] * Math.PI / 180, layout.ang[1] * Math.PI / 180, layout.ang[2] * Math.PI / 180);
    vox.scale.set(layout.scl[0], layout.scl[1], layout.scl[2]);

    union.object.add(vox);
  });

  union.units.forEach(unit => {
      unit.models.forEach(model => { model.buffer = null; });
  });
}