import xnew from '@mulsense/xnew';
import xthree from '@mulsense/xnew/addons/xthree';
import * as THREE from 'three';
import { Stage } from 'model';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { MOG3D } from './mog3d.js';

xnew('#main', Main);

function Main(main) {
  xnew.extend(xnew.basics.Screen, { width: 800, height: 400 });

  // three setup
  xthree.initialize({ canvas: main.canvas });
  xthree.renderer.shadowMap.enabled = true;
  xthree.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  xthree.camera.position.set(0, 0, +20);
  xthree.scene.rotation.x = -60 / 180 * Math.PI

  xnew(ThreeMain);
  xnew(Controller);
}

function ThreeMain(unit) {
  xnew(DirectionaLight, { x: 20, y: -50, z: 100 });
  xnew(AmbientLight);
  xnew(Ground, { size: 100, color: 0xF8F8FF });
  xnew(Dorm, { size: 50 });
  // xnew(Cube, { x: 0, y: 0, z: 2, size: 4, color: 0xAAAAFF });
  xnew(Test);

  // xnew(Stage, { path: 'model.mog' });

  unit.on('+scale', ({ scale }) => {
    xthree.camera.position.z /= scale;
  });
  unit.on('+translate', ({ move }) => {
    xthree.camera.position.x += move.x * xthree.camera.position.z * 0.001;
    xthree.camera.position.y += move.y * xthree.camera.position.z * 0.001;
  });
  unit.on('+rotate', ({ move }) => {
    xthree.scene.rotation.x += move.y * 0.01;
    xthree.scene.rotation.z += move.x * 0.01;
  });
}

function DirectionaLight(unit, { x, y, z }) {
  const object = xthree.nest(new THREE.DirectionalLight(0xFFFFFF, 1));
  object.position.set(x, y, z);
  object.castShadow = true;
}

function AmbientLight(unit) {
  const object = xthree.nest(new THREE.AmbientLight(0xFFFFFF, 1));
}

function Dorm(unit, { size }) {
  const geometry = new THREE.SphereGeometry(size, 25, 25);
  const material = new THREE.MeshBasicMaterial({ color: 0xEEEEFF, side: THREE.BackSide });
  const object = xthree.nest(new THREE.Mesh(geometry, material));
}

function Ground(unit, { size, color }) {
  const geometry = new THREE.PlaneGeometry(size, size, 1, 1);
  const material = new THREE.MeshStandardMaterial({ color, transparent: true, });
  const object = xthree.nest(new THREE.Mesh(geometry, material));
  object.receiveShadow = true;
}

function Cube(unit, { x, y, z, size, color }) {
  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = new THREE.MeshLambertMaterial({ color, });
  const object = xthree.nest(new THREE.Mesh(geometry, material));
  object.position.set(x, y, z);
  object.castShadow = true;
}

function Controller(unit) {
  unit.on('touchstart contextmenu wheel', (event) => event.preventDefault());

  const pointer = xnew(xnew.basics.PointerEvent);
  let isActive = false;
  pointer.on('-gesturestart', () => isActive = true);
  pointer.on('-gestureend', () => isActive = false);
  pointer.on('-gesturemove', ({ scale }) => {
    unit.emit('+scale', { scale })
  });

  pointer.on('-dragmove', ({ event, delta }) => {
    console.log(event);
    if (isActive === true) return;
    if (event.buttons & 1 || !event.buttons) {
      unit.emit('+rotate', { move: { x: +delta.x, y: +delta.y } });
    }
    if (event.buttons & 2) {
      unit.emit('+translate', { move: { x: -delta.x, y: +delta.y } });
    }
  });
  pointer.on('-wheel', ({ delta }) => unit.emit('+scale', { scale: 1 + 0.001 * delta.y }));
}


function Test(unit) {
  const object = xthree.nest(new THREE.Object3D());
  MOG3D.load('./model.mog').then(xnew.scope((vrmUrl) => {
    xnew.promise(new Promise((resolve) => {
      console.log(vrmUrl);
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));
      loader.load(vrmUrl, (gltf) => {
        resolve(gltf);
      }, undefined, (error) => {
        console.error('Failed to load VRM:', error);
      });
    })).then((gltf) => {
      console.log('VRM loaded:', gltf);
      const vrm = gltf.userData.vrm;
      vrm.scene.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });
      object.add(vrm.scene);
    });
  }));

}

function createCubeMesh(size = 1) {
  const s = size / 2;

  // 頂点位置（各面に独立した4頂点 = 24頂点）
  const positions = new Float32Array([
    // 前面 (Z+)
    -s, -s, s, s, -s, s, s, s, s, -s, s, s,
    // 背面 (Z-)
    s, -s, -s, -s, -s, -s, -s, s, -s, s, s, -s,
    // 上面 (Y+)
    -s, s, s, s, s, s, s, s, -s, -s, s, -s,
    // 下面 (Y-)
    -s, -s, -s, s, -s, -s, s, -s, s, -s, -s, s,
    // 右面 (X+)
    s, -s, s, s, -s, -s, s, s, -s, s, s, s,
    // 左面 (X-)
    -s, -s, -s, -s, -s, s, -s, s, s, -s, s, -s,
  ]);

  // 法線
  const normals = new Float32Array([
    // 前面
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
    // 背面
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
    // 上面
    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
    // 下面
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
    // 右面
    1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
    // 左面
    -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
  ]);

  // UV座標
  const uvs = new Float32Array([
    // 各面同じUV
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
  ]);

  // インデックス（各面2三角形）
  const indices = new Uint16Array([
    0, 1, 2, 0, 2, 3,   // 前
    4, 5, 6, 4, 6, 7,   // 背
    8, 9, 10, 8, 10, 11,  // 上
    12, 13, 14, 12, 14, 15,  // 下
    16, 17, 18, 16, 18, 19,  // 右
    20, 21, 22, 20, 22, 23,  // 左
  ]);

  return { positions, normals, uvs, indices };
}

// ============================================
// glTF/GLB生成
// ============================================

function createGLTF(mesh, isVRM = false) {
  const { positions, normals, uvs, indices } = mesh;

  // バイナリバッファの構築
  const buffers = [];
  let byteOffset = 0;

  // インデックスバッファ
  const indicesBuffer = indices.buffer.slice(indices.byteOffset, indices.byteOffset + indices.byteLength);
  const indicesByteLength = indicesBuffer.byteLength;
  const indicesOffset = byteOffset;
  buffers.push(new Uint8Array(indicesBuffer));
  byteOffset += indicesByteLength;
  // 4バイトアライメント
  const indicesPadding = (4 - (byteOffset % 4)) % 4;
  if (indicesPadding > 0) {
    buffers.push(new Uint8Array(indicesPadding));
    byteOffset += indicesPadding;
  }

  // 位置バッファ
  const positionsBuffer = positions.buffer.slice(positions.byteOffset, positions.byteOffset + positions.byteLength);
  const positionsOffset = byteOffset;
  buffers.push(new Uint8Array(positionsBuffer));
  byteOffset += positionsBuffer.byteLength;

  // 法線バッファ
  const normalsBuffer = normals.buffer.slice(normals.byteOffset, normals.byteOffset + normals.byteLength);
  const normalsOffset = byteOffset;
  buffers.push(new Uint8Array(normalsBuffer));
  byteOffset += normalsBuffer.byteLength;

  // UVバッファ
  const uvsBuffer = uvs.buffer.slice(uvs.byteOffset, uvs.byteOffset + uvs.byteLength);
  const uvsOffset = byteOffset;
  buffers.push(new Uint8Array(uvsBuffer));
  byteOffset += uvsBuffer.byteLength;

  const totalByteLength = byteOffset;

  // バウンディングボックス計算
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    minX = Math.min(minX, positions[i]);
    minY = Math.min(minY, positions[i + 1]);
    minZ = Math.min(minZ, positions[i + 2]);
    maxX = Math.max(maxX, positions[i]);
    maxY = Math.max(maxY, positions[i + 1]);
    maxZ = Math.max(maxZ, positions[i + 2]);
  }

  // glTF JSON構造
  const gltf = {
    asset: {
      version: "2.0",
      generator: "VRM Generator Sample"
    },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [
      {
        name: "CubeMesh",
        mesh: 0
      }
    ],
    meshes: [
      {
        name: "Cube",
        primitives: [
          {
            attributes: {
              POSITION: 1,
              NORMAL: 2,
              TEXCOORD_0: 3
            },
            indices: 0,
            material: 0
          }
        ]
      }
    ],
    materials: [
      {
        name: "DefaultMaterial",
        pbrMetallicRoughness: {
          baseColorFactor: [0.8, 0.2, 0.2, 1.0],
          metallicFactor: 0.0,
          roughnessFactor: 0.5
        }
      }
    ],
    accessors: [
      // インデックス
      {
        bufferView: 0,
        componentType: 5123, // UNSIGNED_SHORT
        count: indices.length,
        type: "SCALAR"
      },
      // 位置
      {
        bufferView: 1,
        componentType: 5126, // FLOAT
        count: positions.length / 3,
        type: "VEC3",
        min: [minX, minY, minZ],
        max: [maxX, maxY, maxZ]
      },
      // 法線
      {
        bufferView: 2,
        componentType: 5126,
        count: normals.length / 3,
        type: "VEC3"
      },
      // UV
      {
        bufferView: 3,
        componentType: 5126,
        count: uvs.length / 2,
        type: "VEC2"
      }
    ],
    bufferViews: [
      // インデックス
      {
        buffer: 0,
        byteOffset: indicesOffset,
        byteLength: indicesByteLength,
        target: 34963 // ELEMENT_ARRAY_BUFFER
      },
      // 位置
      {
        buffer: 0,
        byteOffset: positionsOffset,
        byteLength: positionsBuffer.byteLength,
        byteStride: 12,
        target: 34962 // ARRAY_BUFFER
      },
      // 法線
      {
        buffer: 0,
        byteOffset: normalsOffset,
        byteLength: normalsBuffer.byteLength,
        byteStride: 12,
        target: 34962
      },
      // UV
      {
        buffer: 0,
        byteOffset: uvsOffset,
        byteLength: uvsBuffer.byteLength,
        byteStride: 8,
        target: 34962
      }
    ],
    buffers: [
      {
        byteLength: totalByteLength
      }
    ]
  };

  // VRM拡張を追加
  if (isVRM) {
    gltf.extensionsUsed = ["VRM"];
    gltf.extensions = {
      VRM: {
        exporterVersion: "VRM-Generator-Sample-1.0",
        specVersion: "0.0",
        meta: {
          title: "Sample VRM Model",
          version: "1.0",
          author: "VRM Generator",
          contactInformation: "",
          reference: "",
          texture: -1,
          allowedUserName: "Everyone",
          violentUssageName: "Disallow",
          sexualUssageName: "Disallow",
          commercialUssageName: "Allow",
          otherPermissionUrl: "",
          licenseName: "CC0",
          otherLicenseUrl: ""
        },
        humanoid: {
          humanBones: [],
          armStretch: 0.05,
          legStretch: 0.05,
          upperArmTwist: 0.5,
          lowerArmTwist: 0.5,
          upperLegTwist: 0.5,
          lowerLegTwist: 0.5,
          feetSpacing: 0,
          hasTranslationDoF: false
        },
        materialProperties: [
          {
            name: "DefaultMaterial",
            shader: "VRM/MToon",
            renderQueue: 2000,
            floatProperties: {},
            vectorProperties: {
              _Color: [0.8, 0.2, 0.2, 1.0]
            },
            textureProperties: {},
            keywordMap: {},
            tagMap: {}
          }
        ]
      }
    };
  }

  return { gltf, buffers, totalByteLength };
}

function createGLB(gltfData) {
  const { gltf, buffers, totalByteLength } = gltfData;

  // JSON文字列化
  const jsonString = JSON.stringify(gltf);
  const jsonBuffer = new TextEncoder().encode(jsonString);

  // JSONチャンクのパディング（4バイトアライメント）
  const jsonPadding = (4 - (jsonBuffer.length % 4)) % 4;
  const jsonChunkLength = jsonBuffer.length + jsonPadding;

  // バイナリチャンクの結合
  const binaryBuffer = new Uint8Array(totalByteLength);
  let offset = 0;
  for (const buf of buffers) {
    binaryBuffer.set(buf, offset);
    offset += buf.length;
  }

  // バイナリチャンクのパディング
  const binPadding = (4 - (totalByteLength % 4)) % 4;
  const binChunkLength = totalByteLength + binPadding;

  // GLBヘッダー + チャンク
  const glbLength = 12 + 8 + jsonChunkLength + 8 + binChunkLength;
  const glb = new ArrayBuffer(glbLength);
  const view = new DataView(glb);
  const uint8 = new Uint8Array(glb);

  // GLBヘッダー
  view.setUint32(0, 0x46546C67, true);  // magic: "glTF"
  view.setUint32(4, 2, true);            // version: 2
  view.setUint32(8, glbLength, true);    // total length

  // JSONチャンク
  view.setUint32(12, jsonChunkLength, true);     // chunk length
  view.setUint32(16, 0x4E4F534A, true);          // chunk type: "JSON"
  uint8.set(jsonBuffer, 20);
  // パディング（スペースで埋める）
  for (let i = 0; i < jsonPadding; i++) {
    uint8[20 + jsonBuffer.length + i] = 0x20;
  }

  // バイナリチャンク
  const binChunkStart = 20 + jsonChunkLength;
  view.setUint32(binChunkStart, binChunkLength, true);      // chunk length
  view.setUint32(binChunkStart + 4, 0x004E4942, true);      // chunk type: "BIN\0"
  uint8.set(binaryBuffer, binChunkStart + 8);
  // パディング（0で埋める）
  for (let i = 0; i < binPadding; i++) {
    uint8[binChunkStart + 8 + totalByteLength + i] = 0x00;
  }

  return new Uint8Array(glb);
}

// ============================================
// ダウンロード機能
// ============================================

function downloadFile(data, filename, mimeType) {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateVRM() {
  const mesh = createCubeMesh(1.0);
  const gltfData = createGLTF(mesh, false);  // VRM拡張あり
  const glbData = createGLB(gltfData);
  const blob = new Blob([glbData], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  return url;
  downloadFile(glbData, 'sample.vrm', 'application/octet-stream');
  console.log('VRMファイルを生成しました:', glbData.length, 'bytes');
}
