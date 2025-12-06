import xnew from '@mulsense/xnew';
import xthree from '@mulsense/xnew/addons/xthree';
import * as THREE from 'three';
import { MOG3D } from './mog3d.js';


export function Stage(self, { path }) {
  const object = xthree.nest(new THREE.Object3D());
  MOG3D.load(path).then(xnew.scope((unit) => {
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

    object.add(vox);
    unit.models.forEach(model => { model.buffer = null; });

    object.rotation.x = 90 / 180 * Math.PI
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }));
}

