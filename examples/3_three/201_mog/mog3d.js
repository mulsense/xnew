
export const mog3d = {
    load(path) {
        return fetch(path).then(response => response.json()).then(async (json) => {
            return new MOGData(json);
        });
    }
}
const usize = 1024;

class MOGData {
    constructor(json) {
        this.dsize = json['dsize'];
            
        const palette = Code.base64ToUint8Array(json['palette']);
        this.palette = new Array(palette.length / 4);
        for (let c = 0; c < this.palette.length; c++) {
            this.palette[c] = [palette[c * 4 + 0], palette[c * 4 + 1], palette[c * 4 + 2], palette[c * 4 + 3]];
        }
        this.models = [];
        for (let m = 0; m < json['models'].length; m++) {
            const jsonmodel = json['models'][m];
            const [vmap, cmap] = decodeMap(this.dsize, jsonmodel['vmap'], jsonmodel['cmap'])
            this.models.push(new Model(jsonmodel['name'], this.dsize, this.palette, vmap, cmap));
        }

        this.bones = [];
        for (let b = 0; b < json['bones'].length; b++) {
            const jsonbone = json['bones'][b];
            const parentid = jsonbone['parent'];
            this.bones.push(new Bone(
                parentid >= 0 ? this.bones[parentid] : null,
                jsonbone['name'],
                jsonbone['refs'],
                jsonbone['vec0'],
                jsonbone['vec1'],
                jsonbone['iks'],
            ));
        }
    }

    convertVRM() {
        const indices = []; // int
        const vertexs = []; // Vec3
        const normals = []; // Vec3
        const colors = [];  // Col3
        const coords = [];  // Vec2
        const joints = [];  // unsigned short
        const weights = []; // float
        const inverseBindMatrices = []; // Mat4

        const dsize = this.dsize;

        for (let i = 0; i < this.models.length; i++) {
            const model = this.models[i];
            const offset = indices.length;
            for (let j = 0; j < model.vertexs.length / 3; j++) {
                indices.push(offset + j);
                vertexs.push([model.vertexs[j * 3 + 0] - (dsize[0] - 1) / 2, model.vertexs[j * 3 + 1], model.vertexs[j * 3 + 2] - (dsize[2] - 1) / 2]);
                normals.push([model.normals[j * 3 + 0], model.normals[j * 3 + 1], model.normals[j * 3 + 2]]);
                colors.push([model.colors[j * 3 + 0], model.colors[j * 3 + 1], model.colors[j * 3 + 2]]);
            }

            const mask = Array(this.bones.length);
            mask.fill(0);
            if (this.bones.length > 1) {
                for (let j = 0; j < this.bones.length; j++) {
                    if (this.bones[j].refs.length == 0) {
                        mask[j] = 1;
                    }
                    else {
                        for (let k = 0; k < this.bones[j].refs.length; k++) {
                            if (this.bones[j].refs[k] === i) {
                                mask[j] = 1;
                            }
                        }
                    }
                }
                for (let j = offset; j < vertexs.length; j++) {
                    let [nid0, nid1] = [-1, -1];
                    let [min0, min1] = [1000, 1000];
                    let wei = 1.0;
                    {
                        for (let k = 1; k < this.bones.length; k++) {
                            if (mask[k]) {
                                const l = this.bones[k].distance(vertexs[j]);
                                if (l < min0) {
                                    min0 = l;
                                    nid0 = k;
                                }
                            }
                        }
                    }
                    if (nid0 >= 0) {
                        min1 = min0 * 2.0;
                        for (let k = 1; k < this.bones.length; k++) {
                            if (k !== nid0 && mask[k]) {
                                const n0 = this.bones[nid0].name;
                                const s0 = n0.length;

                                const n1 = this.bones[k].name;
                                const s1 = n1.length;
                                if (s0 >= 2 && s1 >= 2) {
                                    if (n0[s0 - 2] == 'L' && n1[s1 - 2] == 'R') {
                                        continue;
                                    }
                                    if (n0[s0 - 2] == 'R' && n1[s1 - 2] == 'L') {
                                        continue;
                                    }
                                }
                         
                                const l = this.bones[k].distance(vertexs[j]);
                                if (l < min1) {
                                    min1 = l;
                                    nid1 = k;
                                    wei = (2 * min0 - min1) / (2 * min0 + 0.001);
                                    wei = Math.sqrt(1.0 - wei);
                                }
                            }
                        }
                    }
                    joints.push(nid0 >= 0 ? nid0 : 0);
                    joints.push(nid1 >= 0 ? nid1 : 0);
                    joints.push(0);
                    joints.push(0);

                    weights.push(wei);
                    weights.push(1.0 - wei);
                    weights.push(0);
                    weights.push(0);
                }
            }
        }

        for (let i = 0; i < this.bones.length; i++) {
            const bone = this.bones[i];
            const position = bone.basePosition();
            const vec0 = [position[0] + bone.vec0[0], position[1] + bone.vec0[1], position[2] + bone.vec0[2]];
            const mat = [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                -vec0[0], -vec0[1], -vec0[2], 1,
            ];
            inverseBindMatrices.push(mat);
        }
        let promise;
        {
            const w = usize;
            const h = Math.pow(2, Math.ceil(Math.log2(2 * (2 * colors.length + usize - 1) / usize))) >> 0;
            const imgdata = new Uint8Array(w * h * 4);
            imgdata.fill(255);
           
            for (let i = 0; i < colors.length; i++) {
                const s = w - 4;
                const x = (i * 2) % s;
                const y = Math.floor((i * 2) / s) * 2;

                imgdata[(y + 0) * w * 4 + (x + 0) * 4 + 0] = colors[i][0];
                imgdata[(y + 0) * w * 4 + (x + 0) * 4 + 1] = colors[i][1];
                imgdata[(y + 0) * w * 4 + (x + 0) * 4 + 2] = colors[i][2];

                imgdata[(y + 0) * w * 4 + (x + 1) * 4 + 0] = colors[i][0];
                imgdata[(y + 0) * w * 4 + (x + 1) * 4 + 1] = colors[i][1];
                imgdata[(y + 0) * w * 4 + (x + 1) * 4 + 2] = colors[i][2];

                imgdata[(y + 1) * w * 4 + (x + 0) * 4 + 0] = colors[i][0];
                imgdata[(y + 1) * w * 4 + (x + 0) * 4 + 1] = colors[i][1];
                imgdata[(y + 1) * w * 4 + (x + 0) * 4 + 2] = colors[i][2];

                imgdata[(y + 1) * w * 4 + (x + 1) * 4 + 0] = colors[i][0];
                imgdata[(y + 1) * w * 4 + (x + 1) * 4 + 1] = colors[i][1];
                imgdata[(y + 1) * w * 4 + (x + 1) * 4 + 2] = colors[i][2];

                // 画像座標をテクスチャ座標に変換（2x2ピクセルブロックの中心）
                const u = (x + 1) / w;
                const v = (y + 1) / h;
                coords.push([u, v]);
            }
            promise = uint8ArrayToPng(imgdata, w, h)
        }

        promise = promise.then((pngdata) => {
            let binlength = 0;
            binlength += indices.length * 4;
            binlength += vertexs.length * 4 * 3;
            binlength += normals.length * 4 * 3;
            binlength += coords.length * 4 * 2;
            binlength += joints.length * 2;
            binlength += weights.length * 4;
            binlength += inverseBindMatrices.length * 4 * 16;
            binlength += pngdata.length;

            const binary = new Uint8Array(binlength);
            const view = new DataView(binary.buffer);
            let offset = 0;

            // indices (int32)
            for (let i = 0; i < indices.length; i++) {
                view.setInt32(offset, indices[i], true);
                offset += 4;
            }

            // vertexs (float32 x 3)
            for (let i = 0; i < vertexs.length; i++) {
                view.setFloat32(offset, vertexs[i][0], true);
                offset += 4;
                view.setFloat32(offset, vertexs[i][1], true);
                offset += 4;
                view.setFloat32(offset, vertexs[i][2], true);
                offset += 4;
            }

            // normals (float32 x 3)
            for (let i = 0; i < normals.length; i++) {
                view.setFloat32(offset, normals[i][0], true);
                offset += 4;
                view.setFloat32(offset, normals[i][1], true);
                offset += 4;
                view.setFloat32(offset, normals[i][2], true);
                offset += 4;
            }

            // coords (float32 x 2)
            for (let i = 0; i < coords.length; i++) {
                view.setFloat32(offset, coords[i][0], true);
                offset += 4;
                view.setFloat32(offset, coords[i][1], true);
                offset += 4;
            }

            // joints (uint16)
            for (let i = 0; i < joints.length; i++) {
                view.setUint16(offset, joints[i], true);
                offset += 2;
            }

            // weights (float32)
            for (let i = 0; i < weights.length; i++) {
                view.setFloat32(offset, weights[i], true);
                offset += 4;
            }

            // inverseBindMatrices (float32 x 16)
            for (let i = 0; i < inverseBindMatrices.length; i++) {
                const mat = inverseBindMatrices[i];
                for (let j = 0; j < 16; j++) {
                    view.setFloat32(offset, mat[j], true);
                    offset += 4;
                }
            }

            // pngdata (uint8)
            binary.set(pngdata, offset);

            // VRM1.0 JSON生成
            const vrmBoneMap = {
                "center": "hips",
                "Spine1": "spine",
                "Spine2": "chest",
                "Neck": "neck",
                "Head": "head",
                "Shoulder_L": "leftShoulder",
                "UpperArm_L": "leftUpperArm",
                "LowerArm_L": "leftLowerArm",
                "Hand_L": "leftHand",
                "Shoulder_R": "rightShoulder",
                "UpperArm_R": "rightUpperArm",
                "LowerArm_R": "rightLowerArm",
                "Hand_R": "rightHand",
                "UpperLeg_L": "leftUpperLeg",
                "LowerLeg_L": "leftLowerLeg",
                "Foot_L": "leftFoot",
                "UpperLeg_R": "rightUpperLeg",
                "LowerLeg_R": "rightLowerLeg",
                "Foot_R": "rightFoot",
            };

            // bufferViews
            let bufferViewOffset = 0;
            const bufferViews = [
                { buffer: 0, byteOffset: bufferViewOffset, byteLength: indices.length * 4, target: 34963 },
            ];
            bufferViewOffset += indices.length * 4;
            bufferViews.push({ buffer: 0, byteOffset: bufferViewOffset, byteLength: vertexs.length * 4 * 3, target: 34962 });
            bufferViewOffset += vertexs.length * 4 * 3;
            bufferViews.push({ buffer: 0, byteOffset: bufferViewOffset, byteLength: normals.length * 4 * 3, target: 34962 });
            bufferViewOffset += normals.length * 4 * 3;
            bufferViews.push({ buffer: 0, byteOffset: bufferViewOffset, byteLength: coords.length * 4 * 2, target: 34962 });
            bufferViewOffset += coords.length * 4 * 2;
            bufferViews.push({ buffer: 0, byteOffset: bufferViewOffset, byteLength: joints.length * 2, target: 34962 });
            bufferViewOffset += joints.length * 2;
            bufferViews.push({ buffer: 0, byteOffset: bufferViewOffset, byteLength: weights.length * 4, target: 34962 });
            bufferViewOffset += weights.length * 4;
            bufferViews.push({ buffer: 0, byteOffset: bufferViewOffset, byteLength: inverseBindMatrices.length * 4 * 16 });
            bufferViewOffset += inverseBindMatrices.length * 4 * 16;
            bufferViews.push({ buffer: 0, byteOffset: bufferViewOffset, byteLength: pngdata.length });

            // 頂点の最小・最大値を計算
            let minv = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
            let maxv = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
            for (let i = 0; i < vertexs.length; i++) {
                minv[0] = Math.min(minv[0], vertexs[i][0]);
                minv[1] = Math.min(minv[1], vertexs[i][1]);
                minv[2] = Math.min(minv[2], vertexs[i][2]);
                maxv[0] = Math.max(maxv[0], vertexs[i][0]);
                maxv[1] = Math.max(maxv[1], vertexs[i][1]);
                maxv[2] = Math.max(maxv[2], vertexs[i][2]);
            }

            const accessors = [
                // indices
                {
                    bufferView: 0,
                    byteOffset: 0,
                    componentType: 5125,
                    count: indices.length,
                    type: "SCALAR",
                    normalized: false,
                },
                // vertexs
                {
                    bufferView: 1,
                    byteOffset: 0,
                    componentType: 5126,
                    count: vertexs.length,
                    type: "VEC3",
                    normalized: false,
                    max: maxv,
                    min: minv,
                },
                // normals
                {
                    bufferView: 2,
                    byteOffset: 0,
                    componentType: 5126,
                    count: normals.length,
                    type: "VEC3",
                    normalized: false,
                },
                // coords
                {
                    bufferView: 3,
                    byteOffset: 0,
                    componentType: 5126,
                    count: coords.length,
                    type: "VEC2",
                    normalized: false,
                },
                // joints
                {
                    bufferView: 4,
                    byteOffset: 0,
                    componentType: 5123,
                    count: Math.floor(joints.length / 4),
                    type: "VEC4",
                    normalized: false,
                },
                // weights
                {
                    bufferView: 5,
                    byteOffset: 0,
                    componentType: 5126,
                    count: Math.floor(weights.length / 4),
                    type: "VEC4",
                    normalized: false,
                },
                // inverseBindMatrices
                {
                    bufferView: 6,
                    byteOffset: 0,
                    componentType: 5126,
                    count: inverseBindMatrices.length,
                    type: "MAT4",
                    normalized: false,
                },
            ];

            // ノードの生成
            const nodes = [];
            for (let i = 0; i < this.bones.length; i++) {
                const bone = this.bones[i];

                // 親ボーンの基準位置を取得
                let position = [0.0, 0.0, 0.0];
                if (bone.parent) {
                    position[0] += bone.parent.vec1[0];
                    position[1] += bone.parent.vec1[1];
                    position[2] += bone.parent.vec1[2];
                }
                
                const node = {
                    name: bone.name,
                    translation: [position[0] + bone.vec0[0], position[1] + bone.vec0[1], position[2] + bone.vec0[2]],
                };

                // 子を探す
                const children = [];
                for (let j = 0; j < this.bones.length; j++) {
                    if (this.bones[j].parent === this.bones[i]) {
                        children.push(j);
                    }
                }
                if (children.length > 0) {
                    node.children = children;
                }
                nodes.push(node);
            }
            // モデルノード
            nodes.push({
                mesh: 0,
                name: "model",
                skin: 0,
            });

            // glTF JSON
            const gltf = {
                asset: {
                    version: "2.0",
                    generator: "MOG3D VRM Exporter",
                },
                buffers: [
                    {
                        byteLength: binlength,
                    },
                ],
                bufferViews: bufferViews,
                accessors: accessors,
                nodes: nodes,
                skins: [
                    {
                        inverseBindMatrices: 6,
                        joints: Array.from({ length: this.bones.length }, (_, i) => i),
                    },
                ],
                materials: [
                    {
                        alphaMode: "OPAQUE",
                        name: "Material",
                        pbrMetallicRoughness: {
                            baseColorFactor: [1.0, 1.0, 1.0, 1.0],
                            metallicFactor: 0.0,
                            roughnessFactor: 1.0,
                            baseColorTexture: {
                                extensions: {
                                    KHR_texture_transform: {
                                        offset: [0, 0],
                                        scale: [1, 1],
                                    },
                                },
                                index: 0,
                                texCoord: 0,
                            },
                        },
                        doubleSided: false,
                    },
                ],
                meshes: [
                    {
                        name: "model",
                        primitives: [
                            {
                                attributes: {
                                    POSITION: 1,
                                    NORMAL: 2,
                                    TEXCOORD_0: 3,
                                    JOINTS_0: 4,
                                    WEIGHTS_0: 5,
                                },
                                indices: 0,
                                material: 0,
                                mode: 4,
                            },
                        ],
                    },
                ],
                scenes: [
                    {
                        nodes: [0, this.bones.length],
                    },
                ],
                scene: 0,
                textures: [
                    {
                        sampler: 0,
                        source: 0,
                    },
                ],
                samplers: [
                    {
                        magFilter: 9729,
                        minFilter: 9985,
                        wrapS: 10497,
                        wrapT: 10497,
                    },
                ],
                images: [
                    {
                        bufferView: 7,
                        name: "model_texture",
                        mimeType: "image/png",
                    },
                ],
                extensions: {
                    VRMC_vrm: {
                        specVersion: "1.0",
                        meta: {
                            name: "model",
                            version: "1.0",
                            authors: ["Author"],
                            allowAntisocialOrHateUsage: false,
                            allowExcessivelySexualUsage: false,
                            allowExcessivelyViolentUsage: false,
                            allowPoliticalOrReligiousUsage: false,
                            avatarPermission: "onlyAuthor",
                            commercialUsage: "personalNonProfit",
                            creditNotation: "required",
                            modification: "prohibited",
                            licenseUrl: "https://vrm.dev/licenses/1.0/",
                        },
                        humanoid: {
                            humanBones: {},
                        },
                    },
                },
                extensionsUsed: ["VRMC_vrm", "KHR_texture_transform"],
            };

            // humanBonesの生成
            for (let i = 0; i < this.bones.length; i++) {
                const boneName = this.bones[i].name;
                const vrmName = vrmBoneMap[boneName] || boneName;
                gltf.extensions.VRMC_vrm.humanoid.humanBones[vrmName] = {
                    node: i,
                };
            }

            const gltfString = JSON.stringify(gltf);
            const jsonBuffer = new TextEncoder().encode(gltfString);
            const jsonSize = Math.ceil(jsonBuffer.length / 4) * 4;

            // VRM(glTF)ファイルの生成
            const fileSize = 12 + 8 + jsonSize + 8 + binlength;
            const vrmBuffer = new Uint8Array(fileSize);
            const vrmView = new DataView(vrmBuffer.buffer);
            let vrmOffset = 0;

            // glTFヘッダ
            vrmBuffer.set([0x67, 0x6C, 0x54, 0x46], vrmOffset); // "glTF"
            vrmOffset += 4;
            vrmView.setUint32(vrmOffset, 2, true); // version
            vrmOffset += 4;
            vrmView.setUint32(vrmOffset, fileSize, true); // length
            vrmOffset += 4;

            // JSONチャンク
            vrmView.setUint32(vrmOffset, jsonSize, true);
            vrmOffset += 4;
            vrmBuffer.set([0x4A, 0x53, 0x4F, 0x4E], vrmOffset); // "JSON"
            vrmOffset += 4;
            vrmBuffer.set(jsonBuffer, vrmOffset);
            // JSONの末尾をスペースで埋める（4バイト境界）
            for (let i = jsonBuffer.length; i < jsonSize; i++) {
                vrmBuffer[vrmOffset + i] = 0x20; // space
            }
            vrmOffset += jsonSize;

            // BINチャンク
            vrmView.setUint32(vrmOffset, binlength, true);
            vrmOffset += 4;
            vrmBuffer.set([0x42, 0x49, 0x4E, 0x00], vrmOffset); // "BIN\0"
            vrmOffset += 4;
            vrmBuffer.set(binary, vrmOffset);

            // VRMファイルの生成
            const blob = new Blob([vrmBuffer], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            console.log('VRM URL created:', url);
            return url;

        });
        return promise;
    }
}
function decodeMap(dsize, codevmap, codecmap) {
    const s = [1, dsize[0], dsize[0] * dsize[1]];
    const vmap = new Uint8Array(dsize[0] * dsize[1] * dsize[2]);
    const cmap = new Uint8Array(dsize[0] * dsize[1] * dsize[2]);
    vmap.fill(0);
    cmap.fill(0);

    const bin0 = Code.base64ToUint8Array(codevmap);
    const bin1 = Code.base64ToUint8Array(codecmap);
    if (bin0.length == 0) {
        return [vmap, cmap];
    }

    const memA = Code.segment(bin0, 0, true);
    const memB = Code.decode(Code.table256(), Code.segment(bin0, 1, true), 256, 8, 8);

    const PALETTE_CODE = 256;
    const data = Code.segment(bin1, 0);
    const dv = new DataView(data.buffer);
    const lngs = new Array(PALETTE_CODE + 1);
    lngs.fill(0);
    for (let c = 0; c < data.length - 1; c += 2) {
        const [s, b] = [dv.getUint8(c + 0), dv.getUint8(c + 1)];
        lngs[s] = b;
    }
    lngs[PALETTE_CODE] = dv.getUint8(data.length - 1);
    const tableC = Code.hmMakeTableFromLngs(lngs);

    const memC = Code.decode(tableC, Code.segment(bin1, 1, true), PALETTE_CODE, 8, 8);

    let [a, b, c] = [0, 0, 0];
    for (let z = 0; z < ((dsize[2] + 7) / 8) >> 0; z++) {
        for (let y = 0; y < ((dsize[1] + 7) / 8) >> 0; y++) {
            for (let x = 0; x < ((dsize[0] + 7) / 8) >> 0; x++) {
                if (memA[a++] === 0) continue;
                for (let iz = 0; iz < Math.min(8, dsize[2] - 8 * z); iz++) {
                    for (let iy = 0; iy < Math.min(8, dsize[1] - 8 * y); iy++) {
                        const mb = memB[b++];
                        for (let ix = 0; ix < Math.min(8, dsize[0] - 8 * x); ix++) {
                            if ((mb >> ix) & 0x01) {
                                const p = (z * 8 + iz) * s[2] + (y * 8 + iy) * s[1] + (x * 8 + ix) * s[0];
                                vmap[p] = 0x80;
                                cmap[p] = memC[c++];
                            }
                        }
                    }
                }
            }
        }
    }
    return [vmap, cmap];
}

class Model {
    constructor(name, dsize, palette, vmap, cmap) {
        this.name = name;
        const s = [1, dsize[0], dsize[0] * dsize[1]];
        const bits = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20];

        const sq = Math.sqrt(2 * (dsize[0] * dsize[1] + dsize[1] * dsize[2] + dsize[2] * dsize[0])) >> 0;
        const sz = Math.pow(2, Math.ceil(Math.log2(sq))) >> 0;

        const texs = [];

        const tsize = [sz, 0];

        for (let z = 0; z < dsize[2]; z++) {
            for (let y = 0; y < dsize[1]; y++) {
                for (let x = 0; x < dsize[0]; x++) {
                    const p = z * s[2] + y * s[1] + x * s[0];
                    if ((vmap[p] & 0x80) === 0) continue;

                    let bit = 0;
                    if (x === 0 || (vmap[p - s[0]] & 0x80) === 0) bit |= 0x01;
                    if (x === dsize[0] - 1 || (vmap[p + s[0]] & 0x80) === 0) bit |= 0x02;
                    if (y === 0 || (vmap[p - s[1]] & 0x80) === 0) bit |= 0x04;
                    if (y === dsize[1] - 1 || (vmap[p + s[1]] & 0x80) === 0) bit |= 0x08;
                    if (z === 0 || (vmap[p - s[2]] & 0x80) === 0) bit |= 0x10;
                    if (z === dsize[2] - 1 || (vmap[p + s[2]] & 0x80) === 0) bit |= 0x20;
                    vmap[p] = vmap[p] | bit;
                }
            }
        }

        let tx = 0;
        let ty = 0;
        for (let z = 0; z < dsize[2]; z++) {
            for (let y = 0; y < dsize[1]; y++) {
                for (let x = 0; x < dsize[0]; x++) {
                    const p = z * s[2] + y * s[1] + x * s[0];
                    if ((vmap[p] & 0x3F) === 0) continue;

                    for (let i = 0; i < 6; i++){
                        const bit = bits[i];
                        if ((vmap[p] & bit) === 0) continue;

                        const tex = { tx: 0, ty: 0 };

                        if (tx + 1 >= tsize[0]) {
                            tx = 0;
                            ty++;
                        }
                        tex.tx = tx;
                        tex.ty = ty;
                        tx += 1;
                        
                        texs.push(tex);
                    }
                }
            }
        }
        tsize[1] = Math.max(16, ty + 1);
        
        this.vertexs = new Uint16Array(texs.length * 18);
        this.normals = new Int8Array(texs.length * 18);
        this.colors = new Int8Array(texs.length * 18);
        this.coords = new Uint16Array(texs.length * 12);
        this.dtex = { data: new Uint8Array(tsize[0] * tsize[1] * 4), dsize: tsize };

        let cnt = 0;
        for (let z = 0; z < dsize[2]; z++) {
            for (let y = 0; y < dsize[1]; y++) {
                for (let x = 0; x < dsize[0]; x++) {
                    const p = z * s[2] + y * s[1] + x * s[0];
                    if ((vmap[p] & 0x3F) === 0) continue;

                    const x0 = x;
                    const x1 = x + 1;
                    const y0 = y;
                    const y1 = y + 1;
                    const z0 = z;
                    const z1 = z + 1;

                    for (let i = 0; i < 6; i++){
                        if ((vmap[p] & bits[i]) === 0) continue;

                        const tex = texs[cnt];
                        const d = [0, 0, 0];

                        const c = cmap[p];
                        this.dtex.data.set(palette[c], (tex.ty * tsize[0] + tex.tx) * 4);

                        const tx0 = Math.round((tex.tx + 0 + 0.5) / tsize[0] * 65535);
                        const tx1 = Math.round((tex.tx + 1 - 0.5) / tsize[0] * 65535);
                        const ty0 = Math.round((tex.ty + 0.5) / tsize[1] * 65535);
                        const ty1 = Math.round((tex.ty + 0.5) / tsize[1] * 65535);

                        let coord;
                        if ((d[(((i / 2) >> 0) - (i % 2) + 2) % 3]) > 0) {
                            coord = [tx0, ty0, tx1, ty0, tx0, ty1, tx1, ty1, tx0, ty1, tx1, ty0,];
                        } else {
                            coord = [tx0, ty0, tx0, ty1, tx1, ty0, tx1, ty1, tx1, ty0, tx0, ty1,];
                        }

                        let vtx;
                        switch(i){
                            case 0: vtx = [x0, y0, z0, x0, y0, z1 + d[2], x0, y1 + d[1], z0, x0, y1 + d[1], z1 + d[2], x0, y1 + d[1], z0, x0, y0, z1 + d[2], ]; break;
                            case 1: vtx = [x1, y0, z0, x1, y1 + d[1], z0, x1, y0, z1 + d[2], x1, y1 + d[1], z1 + d[2], x1, y0, z1 + d[2], x1, y1 + d[1], z0, ]; break;
                            case 2: vtx = [x0, y0, z0, x1 + d[0], y0, z0, x0, y0, z1 + d[2], x1 + d[0], y0, z1 + d[2], x0, y0, z1 + d[2], x1 + d[0], y0, z0, ]; break;
                            case 3: vtx = [x0, y1, z0, x0, y1, z1 + d[2], x1 + d[0], y1, z0, x1 + d[0], y1, z1 + d[2], x1 + d[0], y1, z0, x0, y1, z1 + d[2], ]; break;
                            case 4: vtx = [x0, y0, z0, x0, y1 + d[1], z0, x1 + d[0], y0, z0, x1 + d[0], y1 + d[1], z0, x1 + d[0], y0, z0, x0, y1 + d[1], z0, ]; break;
                            case 5: vtx = [x0, y0, z1, x1 + d[0], y0, z1, x0, y1 + d[1], z1, x1 + d[0], y1 + d[1], z1, x0, y1 + d[1], z1, x1 + d[0], y0, z1, ]; break;
                        }

                        let nrm;
                        switch(i) {
                            case 0: nrm = [-1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,]; break;
                            case 1: nrm = [+1, 0, 0, +1, 0, 0, +1, 0, 0, +1, 0, 0, +1, 0, 0, +1, 0, 0,]; break;
                            case 2: nrm = [0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,]; break;
                            case 3: nrm = [0, +1, 0, 0, +1, 0, 0, +1, 0, 0, +1, 0, 0, +1, 0, 0, +1, 0,]; break;
                            case 4: nrm = [0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,]; break;
                            case 5: nrm = [0, 0, +1, 0, 0, +1, 0, 0, +1, 0, 0, +1, 0, 0, +1, 0, 0, +1,]; break;
                        }

                        let col = [];
                        for (let k = 0; k < 6; k++) {
                            col.push(palette[c][0]);
                            col.push(palette[c][1]);
                            col.push(palette[c][2]);
                        }

                        this.vertexs.set(vtx, cnt * 18);
                        this.normals.set(nrm, cnt * 18);
                        this.colors.set(col, cnt * 18);
                        this.coords.set(coord, cnt * 12);
                        cnt++;
                    }
                }
            }
        }
    }
}

class Bone {
    constructor(parent, name, refs, vec0, vec1, iks) {
        this.parent = parent;
        this.name = name;
        this.refs = refs;
        this.vec0 = vec0;
        this.vec1 = vec1;
        this.iks = iks;
    }

    basePosition() {
        let position = [0.0, 0.0, 0.0];
        let bone = this;
        while (bone.parent) {
            position[0] += (bone.parent.vec0[0] + bone.parent.vec1[0]);
            position[1] += (bone.parent.vec0[1] + bone.parent.vec1[1]);
            position[2] += (bone.parent.vec0[2] + bone.parent.vec1[2]);
            bone = bone.parent;
        }
        return position;
    }

    distance (vec) {
        let distance = 0;
        const position = this.basePosition();
        const vec0 = [position[0] + this.vec0[0], position[1] + this.vec0[1], position[2] + this.vec0[2]];
        const vec1 = [vec0[0] + this.vec1[0], vec0[1] + this.vec1[1], vec0[2] + this.vec1[2]];

        const linevec = [vec1[0] - vec0[0], vec1[1] - vec0[1], vec1[2] - vec0[2]];
        const linelen = Math.sqrt(linevec[0] * linevec[0] + linevec[1] * linevec[1] + linevec[2] * linevec[2]);

        if (linelen < 0.1) {
            const d = [vec[0] - (vec0[0] + vec1[0]) * 0.5, vec[1] - (vec0[1] + vec1[1]) * 0.5, vec[2] - (vec0[2] + vec1[2]) * 0.5];
            distance = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
        }
        else {
            const a = [vec[0] - vec0[0], vec[1] - vec0[1], vec[2] - vec0[2]];
            const b = [vec[0] - vec1[0], vec[1] - vec1[1], vec[2] - vec1[2]];
            
            const s = (linevec[0] * a[0] + linevec[1] * a[1] + linevec[2] * a[2]) / linelen;
            if (s < 0.0) {
                distance = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
            }
            else if (s > linelen) {
                distance = Math.sqrt(b[0] * b[0] + b[1] * b[1] + b[2] * b[2]);
            }
            else {
                const c = [vec[0] - (vec0[0] + linevec[0] * s / linelen), vec[1] - (vec0[1] + linevec[1] * s / linelen), vec[2] - (vec0[2] + linevec[2] * s / linelen)];
                distance = Math.sqrt(c[0] * c[0] + c[1] * c[1] + c[2] * c[2]);
            }
        }
        return distance;
    }
}

function uint8ArrayToPng(data, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // ImageDataを作成（dataはRGBA形式のUint8Arrayを想定）
    const imageData = new ImageData(new Uint8ClampedArray(data), width, height);
    ctx.putImageData(imageData, 0, 0);

    // PNGのBlobを取得
    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            blob.arrayBuffer().then(buffer => { resolve(new Uint8Array(buffer)); });
        }, 'image/png');
    });
}

class Code {
    static segment(bin, p, bitarray = false) {
        const view = new DataView(bin.buffer);

        let base = 0;
        for (let i = 0; i < p; i++) {
            const bits = view.getInt32(base, true);
            base += ((bits + 7) >> 3) + 4;
        }
        const bits = view.getInt32(base, true);
        const size = (bits + 7) >> 3;
        const offset = size * 8 - bits;

        const slice = bin.slice(base + 4, base + 4 + size);
        if (bitarray === false) {
            return slice;
        } else {
            const data = new Uint8Array(size * 8 - offset);
            for (let i = 0; i < size * 8 - offset; i++) {
                const q = i / 8 >> 0;
                const r = i % 8;
                data[i] = (slice[q] & (0x01 << r)) ? 1 : 0;
            }
            return data;
        }
    }

    static base64ToUint8Array(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    static hmMakeNode(table) {
        var nodes = new Array(1);

        nodes[0] = { val: -1, child: [-1, -1] };

        for (let i = 0; i < table.length; i++) {
            const bits = table[i];
            if (bits.length == 0) continue;

            let node = nodes[0];
            for (let j = 0; j < bits.length; j++) {
                const bit = bits[j];
                if (node.child[bit] === -1) {
                    node.child[bit] = nodes.length;

                    node = { val: -1, child: [-1, -1] };
                    nodes.push(node);
                }
                else {
                    node = nodes[node.child[bit]];
                }
            }
            node.val = i;
        }
        return nodes;
    }

    static hmMakeTableFromLngs(lngs) {
        const table = new Array(lngs.length);
        table.fill([]);

        var maxv = 0;
        var minv = 255;
        for (let i = 0; i < lngs.length; i++) {
            const n = lngs[i];
            if (n == 0) continue;
            maxv = Math.max(n, maxv);
            minv = Math.min(n, minv);
        }
        if (maxv == 0) {
            return table;
        }

        const bits = [];
        for (var j = 0; j < minv; j++) {
            bits.push(0);
        }

        let prev = 0;
        for (let s = minv; s <= maxv; s++) {
            for (let i = 0; i < lngs.length; i++) {
                if (lngs[i] != s) continue;

                if (prev > 0) {
                    for (let j = bits.length - 1; j >= 0; j--) {
                        if (bits[j] == 0) {
                            bits[j] = 1;
                            break;
                        }
                        else {
                            bits[j] = 0;
                        }
                    }
                    for (let j = 0; j < s - prev; j++) {
                        bits.push(0);
                    }
                }

                prev = s;
                table[i] = Array.from(bits);
            }
        }
        return table;
    }

    static hmMakeTableFromCnts(cnts) {
        const table = new Array(cnts.length);
        table.map(function () { return new Array() });

        {
            let n = 0;
            let id = -1;
            for (let i = 0; i < cnts.length; i++) {
                if (cnts[i] > 0) {
                    n++;
                    id = i;
                }
            }
            if (n == 0) {
                return table;
            }
            if (n == 1) {
                table[id].push(0);
                return table;
            }
        }

        const Node = function () {
            this.cnt = 0;
            this.parent = null;
        };

        const nodes = [];
        for (let i = 0; i < cnts.length; i++) {
            const node = new Node();
            node.cnt = cnts[i];
            node.parent = null;
            nodes.push(node);
        }

        const heads = [];
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].cnt > 0) {
                heads.push(nodes[i]);
            }
        }

        while (heads.length >= 2) {
            let node = new Node();

            for (let j = 0; j < 2; j++) {
                var id = 0;
                var minv = Number.MAX_SAFE_INTEGER;
                for (let k = 0; k < heads.length; k++) {
                    if (heads[k].cnt < minv) {
                        minv = heads[k].cnt;
                        id = k;
                    }
                }
                node.cnt += heads[id].cnt;
                heads[id].parent = node;

                heads.splice(id, 1);
            }

            heads.push(node);
        }

        const lngs = new Array(cnts.length);
        for (let i = 0; i < lngs.length; i++) {
            lngs[i] = 0;

            let node = nodes[i];
            while (node.parent != null) {
                lngs[i]++;
                node = node.parent;
            }
        }
        return Code.hmMakeTableFromLngs(lngs);
    }

    static decode(table, src, code, v0, v1) {
        let dst = [];

        const nodes = Code.hmMakeNode(table);
        let node = nodes[0];
        for (let i = 0; i < src.length; i++) {
            const bit = src[i];
            node = nodes[node.child[bit]];
            const val = node.val;

            if (val >= 0) {
                dst.push(val);
                node = nodes[0];
            }
            if (val == code) {
                {
                    let v = 0;
                    for (var j = 0; j < v0; j++, i++) {
                        v = v + (src[i + 1] << j);
                    }
                    dst.push(v);
                }
                {
                    let v = 0;
                    for (var j = 0; j < v1; j++, i++) {
                        v = v + (src[i + 1] << j);
                    }
                    dst.push(v);
                }
            }
        }

        const tmp = dst;
        dst = [];
        if (tmp.length == 0) return dst;

        for (let i = 0; i < tmp.length; i++) {
            if (tmp[i] != code) {
                dst.push(tmp[i]);
            }
            else {
                const search = tmp[i + 1];
                const length = tmp[i + 2];
                const base = dst.length;
                for (let j = 0; j < length; j++) {
                    const v = dst[base - search + j];
                    dst.push(v);
                }
                i += 2;
            }
        }

        return dst;
    }

    static table256() {
        const cnts = new Uint8Array(256 + 1);

        for (let i = 0; i < 256; i++) {
            let sum = 0;
            for (let j = 0; j < 7; j++) {
                const a = (i & (0x01 << (j + 0))) ? 1 : 0;
                const b = (i & (0x01 << (j + 1))) ? 1 : 0;
                if (a != b) sum++;
            }
            cnts[i] = Math.pow(2, 7 - sum);
        }
        cnts[256] = Math.pow(2, 7 - 0);
        return Code.hmMakeTableFromCnts(cnts);
    }
}
