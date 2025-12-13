
export const mog3d = {
    load(path) {
        return fetch(path).then(response => response.json()).then(json => new Model(json));
    }
}

class Model {
    constructor(json) {
        this.dsize = json.dsize;
        this.palette = Uint8Array.from(atob(json.palette), c => c.charCodeAt(0));

        this.layers = json.layers.map((jlayer) => {
            const [gmap, cmap] = decode(this.dsize, jlayer.gmap, jlayer.cmap);
            return new Layer(jlayer.name, this.dsize, this.palette, gmap, cmap);
        });

        this.bones = json.bones.reduce((bones, jbone) => {
            bones.push(new Bone(jbone, bones));
            return bones;
        }, []);

        function decode(dsize, codevmap, codecmap) {
            const gmap = new Uint8Array(dsize[0] * dsize[1] * dsize[2]).fill(0);
            const cmap = new Uint8Array(dsize[0] * dsize[1] * dsize[2]).fill(0);

            const bin0 = Uint8Array.from(atob(codevmap), c => c.charCodeAt(0));
            const bin1 = Uint8Array.from(atob(codecmap), c => c.charCodeAt(0));
            if (bin0.length == 0) return [gmap, cmap];

            const memA = Code.segment(bin0, 0, true);
            const memB = Code.decode(Code.table256(), Code.segment(bin0, 1, true), 256, 8, 8);

            const PALETTE_CODE = 256;
            const data = Code.segment(bin1, 0);
            const lngs = Array(PALETTE_CODE + 1).fill(0);
            for (let c = 0; c < data.length - 1; c += 2) {
                lngs[data[c + 0]] = data[c + 1];
            }
            lngs[PALETTE_CODE] = data[data.length - 1];

            const memC = Code.decode(Code.hmMakeTableFromLngs(lngs), Code.segment(bin1, 1, true), PALETTE_CODE, 8, 8);

            let [b, c] = [0, 0];
            for (let a = 0; a < memA.length; a++) {
                if (memA[a] === 0) continue;
                const dsize8 = [Math.ceil(dsize[0] / 8), Math.ceil(dsize[1] / 8), Math.ceil(dsize[2] / 8)];
                const x = a % dsize8[0];
                const y = ((a / dsize8[0]) >> 0) % dsize8[1];
                const z = (a / (dsize8[0] * dsize8[1])) >> 0;

                for (let iz = 0; iz < Math.min(8, dsize[2] - 8 * z); iz++) {
                    for (let iy = 0; iy < Math.min(8, dsize[1] - 8 * y); iy++) {
                        const mb = memB[b + iz * 8 + iy];
                        if (mb === 0) continue;
                        for (let ix = 0; ix < Math.min(8, dsize[0] - 8 * x); ix++) {
                            if ((mb >> ix) & 0x01) {
                                const p = (z * 8 + iz) * dsize[0] * dsize[1] + (y * 8 + iy) * dsize[0] + (x * 8 + ix);
                                gmap[p] = 0x40;
                                cmap[p] = memC[c++];
                            }
                        }
                    }
                }
                b += 8 * 8;
            }
            return [gmap, cmap];
        }
    }

    convertVRM() {
        const indices = []; // int
        const vertexs = []; // float x3
        const normals = []; // float x3
        const colors = [];  // float x3
        const coords = [];  // float x2
        const joints = [];  // unsigned short x4
        const weights = []; // float x4
        const invmats = []; // float x16

        const dsize = this.dsize;

        for (let i = 0; i < this.layers.length; i++) {
            const layer = this.layers[i];
            const offset = indices.length;
            for (let j = 0; j < layer.vertexs.length / 3; j++) {
                indices.push(offset + j);
                vertexs.push(layer.vertexs[j * 3 + 0] - (dsize[0] - 1) / 2, layer.vertexs[j * 3 + 1], layer.vertexs[j * 3 + 2] - (dsize[2] - 1) / 2);
                normals.push(layer.normals[j * 3 + 0], layer.normals[j * 3 + 1], layer.normals[j * 3 + 2]);
                colors.push(layer.colors[j * 3 + 0], layer.colors[j * 3 + 1], layer.colors[j * 3 + 2]);
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
                for (let j = offset; j < vertexs.length / 3; j++) {
                    let [nid0, nid1] = [-1, -1];
                    let [min0, min1] = [1000, 1000];
                    let wei = 1.0;
                    {
                        for (let k = 1; k < this.bones.length; k++) {
                            if (mask[k]) {
                                const l = this.bones[k].distance([vertexs[j * 3 + 0], vertexs[j * 3 + 1], vertexs[j * 3 + 2]]);
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
                                if (n0[s0 - 1] == 'L' && n1[s1 - 1] == 'R') continue;
                                if (n0[s0 - 1] == 'R' && n1[s1 - 1] == 'L') continue;
                         
                                const l = this.bones[k].distance([vertexs[j * 3 + 0], vertexs[j * 3 + 1], vertexs[j * 3 + 2]]);
                                if (l < min1) {
                                    min1 = l;
                                    nid1 = k;
                                    wei = (2 * min0 - min1) / (2 * min0 + 0.001);
                                    wei = Math.sqrt(1.0 - wei);
                                }
                            }
                        }
                    }
                    joints.push(nid0 >= 0 ? nid0 : 0, nid1 >= 0 ? nid1 : 0, 0, 0);
                    weights.push(wei, 1.0 - wei, 0, 0);
                }
            }
        }

        for (let i = 0; i < this.bones.length; i++) {
            const bone = this.bones[i];
            const position = bone.basePosition();
            const vec0 = [position[0] + bone.vec0[0], position[1] + bone.vec0[1], position[2] + bone.vec0[2]];

            invmats.push(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -vec0[0], -vec0[1], -vec0[2], 1);
        }
        let promise;
        {
            const w = 1024;
            const h = Math.pow(2, Math.ceil(Math.log2((4 * colors.length / 3 + w - 1) / w))) >> 0;
            const imgdata = new Uint8Array(w * h * 4);
            imgdata.fill(255);
           
            for (let i = 0; i < colors.length / 3; i++) {
                const s = ((w / 6) >> 0) * 6;
                const x = (i * 2) % s;
                const y = (((i * 2) / s) >> 0) * 2;

                imgdata[((y + 0) * w + (x + 0)) * 4 + 0] = colors[i * 3 + 0];
                imgdata[((y + 0) * w + (x + 0)) * 4 + 1] = colors[i * 3 + 1];
                imgdata[((y + 0) * w + (x + 0)) * 4 + 2] = colors[i * 3 + 2];
                imgdata[((y + 0) * w + (x + 0)) * 4 + 3] = 255;

                imgdata[((y + 0) * w + (x + 1)) * 4 + 0] = colors[i * 3 + 0];
                imgdata[((y + 0) * w + (x + 1)) * 4 + 1] = colors[i * 3 + 1];
                imgdata[((y + 0) * w + (x + 1)) * 4 + 2] = colors[i * 3 + 2];
                imgdata[((y + 0) * w + (x + 1)) * 4 + 3] = 255;

                imgdata[((y + 1) * w + (x + 0)) * 4 + 0] = colors[i * 3 + 0];
                imgdata[((y + 1) * w + (x + 0)) * 4 + 1] = colors[i * 3 + 1];
                imgdata[((y + 1) * w + (x + 0)) * 4 + 2] = colors[i * 3 + 2];
                imgdata[((y + 1) * w + (x + 0)) * 4 + 3] = 255;

                imgdata[((y + 1) * w + (x + 1)) * 4 + 0] = colors[i * 3 + 0];
                imgdata[((y + 1) * w + (x + 1)) * 4 + 1] = colors[i * 3 + 1];
                imgdata[((y + 1) * w + (x + 1)) * 4 + 2] = colors[i * 3 + 2];
                imgdata[((y + 1) * w + (x + 1)) * 4 + 3] = 255;

                // 画像座標をテクスチャ座標に変換（2x2ピクセルブロックの中心）
                const u = (x + 1) / w;
                const v = (y + 1) / h;
                coords.push(u, v);
            }

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');

            ctx.putImageData(new ImageData(new Uint8ClampedArray(imgdata), w, h), 0, 0);

            promise = new Promise((resolve) => {
                canvas.toBlob((blob) => blob.arrayBuffer().then(buffer => { resolve(new Uint8Array(buffer)); }), 'image/png');
            });
        }

        promise = promise.then((pngdata) => {
            let binlength = 0;
            binlength += indices.length * 4;
            binlength += vertexs.length * 4;
            binlength += normals.length * 4;
            binlength += coords.length * 4;
            binlength += joints.length * 2;
            binlength += weights.length * 4;
            binlength += invmats.length * 4;
            binlength += pngdata.length;

            const binary = new Uint8Array(binlength);
            const view = new DataView(binary.buffer);
            let offset = 0;
            indices.forEach(v => { view.setInt32(offset, v, true); offset += 4; });
            vertexs.forEach(v => { view.setFloat32(offset, v, true); offset += 4; });
            normals.forEach(v => { view.setFloat32(offset, v, true); offset += 4; });
            coords.forEach(v => { view.setFloat32(offset, v, true); offset += 4; });
            joints.forEach(v => { view.setUint16(offset, v, true); offset += 2; });
            weights.forEach(v => { view.setFloat32(offset, v, true); offset += 4; });
            invmats.forEach(v => { view.setFloat32(offset, v, true); offset += 4; });
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
            let byteOffset = 0;
            const bufferViews = [];
            bufferViews.push({ buffer: 0, byteOffset, byteLength: indices.length * 4, target: 34963 }); byteOffset += indices.length * 4;
            bufferViews.push({ buffer: 0, byteOffset, byteLength: vertexs.length * 4, target: 34962 }); byteOffset += vertexs.length * 4;
            bufferViews.push({ buffer: 0, byteOffset, byteLength: normals.length * 4, target: 34962 }); byteOffset += normals.length * 4;
            bufferViews.push({ buffer: 0, byteOffset, byteLength: coords.length * 4, target: 34962 }); byteOffset += coords.length * 4;
            bufferViews.push({ buffer: 0, byteOffset, byteLength: joints.length * 2, target: 34962 }); byteOffset += joints.length * 2;
            bufferViews.push({ buffer: 0, byteOffset, byteLength: weights.length * 4, target: 34962 }); byteOffset += weights.length * 4;
            bufferViews.push({ buffer: 0, byteOffset, byteLength: invmats.length * 4 }); byteOffset += invmats.length * 4;
            bufferViews.push({ buffer: 0, byteOffset, byteLength: pngdata.length }); byteOffset += pngdata.length;
            
            // min & max 
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
                { bufferView: 0, byteOffset: 0, componentType: 5125, count: indices.length, type: "SCALAR", normalized: false },
                { bufferView: 1, byteOffset: 0, componentType: 5126, count: vertexs.length / 3, type: "VEC3", normalized: false, max: maxv, min: minv },
                { bufferView: 2, byteOffset: 0, componentType: 5126, count: normals.length / 3, type: "VEC3", normalized: false },
                { bufferView: 3, byteOffset: 0, componentType: 5126, count: coords.length / 2, type: "VEC2", normalized: false },
                { bufferView: 4, byteOffset: 0, componentType: 5123, count: joints.length / 4, type: "VEC4", normalized: false },
                { bufferView: 5, byteOffset: 0, componentType: 5126, count: weights.length / 4, type: "VEC4", normalized: false },
                { bufferView: 6, byteOffset: 0, componentType: 5126, count: invmats.length / 16, type: "MAT4", normalized: false },
            ];

            // build nodes
            const nodes = [];
            for (let i = 0; i < this.bones.length; i++) {
                const bone = this.bones[i];
                const position = bone.parent ? bone.parent.vec1 : [0.0, 0.0, 0.0];
                
                const vrmName = vrmBoneMap[bone.name] || bone.name;
                const node = {
                    name: vrmName,
                    translation: [position[0] + bone.vec0[0], position[1] + bone.vec0[1], position[2] + bone.vec0[2]],
                };

                // set children
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
            // model node
            nodes.push({ mesh: 0, name: "model", skin: 0 });

            // glTF JSON
            const gltf = {
                asset: { version: "2.0", generator: "mog3d.js vrm converter", },
                buffers: [ { byteLength: binlength, }, ],
                bufferViews,
                accessors,
                nodes,
                skins: [{ inverseBindMatrices: 6, joints: Array.from({ length: this.bones.length }, (_, i) => i) }],
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
                                    KHR_texture_transform: { offset: [0, 0], scale: [1, 1] },
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
                                attributes: { POSITION: 1, NORMAL: 2, TEXCOORD_0: 3, JOINTS_0: 4, WEIGHTS_0: 5 },
                                indices: 0,
                                material: 0,
                                mode: 4,
                            },
                        ],
                    },
                ],
                scenes: [{ nodes: [0, this.bones.length] }],
                scene: 0,
                textures: [{ sampler: 0, source: 0 }],
                samplers: [{ magFilter: 9729, minFilter: 9985, wrapS: 10497, wrapT: 10497 }],
                images: [{ bufferView: 7, name: "model_texture", mimeType: "image/png" }],
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
                gltf.extensions.VRMC_vrm.humanoid.humanBones[vrmName] = { node: i };
            }

            const gltfString = JSON.stringify(gltf);
            const jsonBuffer = new TextEncoder().encode(gltfString);
            const jsonSize = Math.ceil(jsonBuffer.length / 4) * 4;
            const jsonPadding = new Uint8Array(jsonSize - jsonBuffer.length);
            jsonPadding.fill(0x20); // space

            // VRM(glTF)ファイルの生成
            const fileSize = 12 + 8 + jsonSize + 8 + binlength;
            const vrmBuffer = new Uint8Array(fileSize);
            const vrmView = new DataView(vrmBuffer.buffer);
            let vrmOffset = 0;

            // glTFヘッダ
            vrmBuffer.set([0x67, 0x6C, 0x54, 0x46], vrmOffset); vrmOffset += 4; // "glTF"
            vrmView.setUint32(vrmOffset, 2, true); vrmOffset += 4; // version
            vrmView.setUint32(vrmOffset, fileSize, true); vrmOffset += 4; // length

            // JSONチャンク
            vrmView.setUint32(vrmOffset, jsonSize, true); vrmOffset += 4;
            vrmBuffer.set([0x4A, 0x53, 0x4F, 0x4E], vrmOffset); vrmOffset += 4; // "JSON"
            vrmBuffer.set(jsonBuffer, vrmOffset);  vrmOffset += jsonBuffer.length; // jsonBuffer
            vrmBuffer.set(jsonPadding, vrmOffset);  vrmOffset += jsonPadding.length; // jsonPadding

            // BINチャンク
            vrmView.setUint32(vrmOffset, binlength, true); vrmOffset += 4;
            vrmBuffer.set([0x42, 0x49, 0x4E, 0x00], vrmOffset); vrmOffset += 4; // "BIN\0"
            vrmBuffer.set(binary, vrmOffset); vrmOffset += binary.length;

            // VRMファイルの生成
            const blob = new Blob([vrmBuffer], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            console.log('VRM URL created:', url);
            return url;

        });
        return promise;
    }
}


class Layer {
    constructor(name, dsize, palette, gmap, cmap) {
        this.name = name;
        const s = [1, dsize[0], dsize[0] * dsize[1]];
        const bits = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20];

        const sq = Math.sqrt(2 * (dsize[0] * dsize[1] + dsize[1] * dsize[2] + dsize[2] * dsize[0])) >> 0;
        const sz = Math.pow(2, Math.ceil(Math.log2(sq))) >> 0;

        const tsize = [sz, 0];
        let cnt = 0;
        for (let z = 0; z < dsize[2]; z++) {
            for (let y = 0; y < dsize[1]; y++) {
                for (let x = 0; x < dsize[0]; x++) {
                    const p = z * s[2] + y * s[1] + x * s[0];
                    if ((gmap[p] & 0x40) === 0) continue;

                    let bit = 0;
                    if (x === 0 || (gmap[p - s[0]] & 0x40) === 0) { bit |= 0x01; cnt++; }
                    if (x === dsize[0] - 1 || (gmap[p + s[0]] & 0x40) === 0) { bit |= 0x02; cnt++; }
                    if (y === 0 || (gmap[p - s[1]] & 0x40) === 0) { bit |= 0x04; cnt++; }
                    if (y === dsize[1] - 1 || (gmap[p + s[1]] & 0x40) === 0) { bit |= 0x08; cnt++; }
                    if (z === 0 || (gmap[p - s[2]] & 0x40) === 0) { bit |= 0x10; cnt++; }
                    if (z === dsize[2] - 1 || (gmap[p + s[2]] & 0x40) === 0) { bit |= 0x20; cnt++; }
                    gmap[p] = gmap[p] | bit;
                }
            }
        }

        tsize[1] = Math.max(16, (cnt / tsize[0]) >> 0 + 1);
        
        this.vertexs = new Uint16Array(cnt * 18);
        this.normals = new Int8Array(cnt * 18);
        this.colors = new Int8Array(cnt * 18);

        cnt = 0;
        for (let z = 0; z < dsize[2]; z++) {
            for (let y = 0; y < dsize[1]; y++) {
                for (let x = 0; x < dsize[0]; x++) {
                    const p = z * s[2] + y * s[1] + x * s[0];
                    if ((gmap[p] & 0x3F) === 0) continue;

                    const x0 = x;
                    const x1 = x + 1;
                    const y0 = y;
                    const y1 = y + 1;
                    const z0 = z;
                    const z1 = z + 1;

                    for (let i = 0; i < 6; i++){
                        if ((gmap[p] & bits[i]) === 0) continue;

                        let vtx;
                        switch(i){
                            case 0: vtx = [x0, y0, z0, x0, y0, z1, x0, y1, z0, x0, y1, z1, x0, y1, z0, x0, y0, z1]; break;
                            case 1: vtx = [x1, y0, z0, x1, y1, z0, x1, y0, z1, x1, y1, z1, x1, y0, z1, x1, y1, z0]; break;
                            case 2: vtx = [x0, y0, z0, x1, y0, z0, x0, y0, z1, x1, y0, z1, x0, y0, z1, x1, y0, z0]; break;
                            case 3: vtx = [x0, y1, z0, x0, y1, z1, x1, y1, z0, x1, y1, z1, x1, y1, z0, x0, y1, z1]; break;
                            case 4: vtx = [x0, y0, z0, x0, y1, z0, x1, y0, z0, x1, y1, z0, x1, y0, z0, x0, y1, z0]; break;
                            case 5: vtx = [x0, y0, z1, x1, y0, z1, x0, y1, z1, x1, y1, z1, x0, y1, z1, x1, y0, z1]; break;
                        }

                        let nrm;
                        switch(i) {
                            case 0: nrm = [-1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0]; break;
                            case 1: nrm = [+1, 0, 0, +1, 0, 0, +1, 0, 0, +1, 0, 0, +1, 0, 0, +1, 0, 0]; break;
                            case 2: nrm = [0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0]; break;
                            case 3: nrm = [0, +1, 0, 0, +1, 0, 0, +1, 0, 0, +1, 0, 0, +1, 0, 0, +1, 0]; break;
                            case 4: nrm = [0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]; break;
                            case 5: nrm = [0, 0, +1, 0, 0, +1, 0, 0, +1, 0, 0, +1, 0, 0, +1, 0, 0, +1]; break;
                        }

                        let col = [];
                        const c = cmap[p];
                        for (let k = 0; k < 6; k++) {
                            col.push(palette[c * 4 + 0], palette[c * 4 + 1], palette[c * 4 + 2]);
                        }

                        this.vertexs.set(vtx, cnt * 18);
                        this.normals.set(nrm, cnt * 18);
                        this.colors.set(col, cnt * 18);
                        cnt++;
                    }
                }
            }
        }
    }
}

class Bone {
    constructor(json, bones) {
        this.parent = json.parent >= 0 ? bones[json.parent] : null;
        this.name = json.name;
        this.refs = json.refs;
        this.vec0 = json.vec0;
        this.vec1 = json.vec1;
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
        const position = this.basePosition();
        const vec0 = [position[0] + this.vec0[0], position[1] + this.vec0[1], position[2] + this.vec0[2]];
        const vec1 = [vec0[0] + this.vec1[0], vec0[1] + this.vec1[1], vec0[2] + this.vec1[2]];

        const linevec = [vec1[0] - vec0[0], vec1[1] - vec0[1], vec1[2] - vec0[2]];
        const linelen = Math.sqrt(linevec[0] * linevec[0] + linevec[1] * linevec[1] + linevec[2] * linevec[2]);
     
        const a = [vec[0] - vec0[0], vec[1] - vec0[1], vec[2] - vec0[2]];
        const b = [vec[0] - vec1[0], vec[1] - vec1[1], vec[2] - vec1[2]];
        
        const s = (linevec[0] * a[0] + linevec[1] * a[1] + linevec[2] * a[2]) / linelen;
        if (s < 0.0) {
            return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
        }
        else if (s > linelen) {
            return Math.sqrt(b[0] * b[0] + b[1] * b[1] + b[2] * b[2]);
        }
        else {
            const c = [vec[0] - (vec0[0] + linevec[0] * s / linelen), vec[1] - (vec0[1] + linevec[1] * s / linelen), vec[2] - (vec0[2] + linevec[2] * s / linelen)];
            return Math.sqrt(c[0] * c[0] + c[1] * c[1] + c[2] * c[2]);
        }
    }
}

class Code {
    static segment(bin, p, bitarray = false) {
        const view = new DataView(bin.buffer);
        let offset = 0;
        for (let i = 0; i < p; i++) {
            offset += ((view.getInt32(offset, true) + 7) >> 3) + 4;
        }
        const length = view.getInt32(offset, true);
        const slice = bin.slice(offset + 4, offset + 4 + ((length + 7) >> 3));
        return bitarray ? Uint8Array.from({ length }, (_, i) => (slice[i >> 3] & (0x01 << (i % 8))) ? 1 : 0) : slice;
    }

    static hmMakeNode(table) {
        const nodes = [{ val: -1, child: [-1, -1] }];
        for (let i = 0; i < table.length; i++) {
            if (table[i].length === 0) continue;
            let node = nodes[0];
            for (const bit of table[i]) {
                if (node.child[bit] === -1) {
                    node.child[bit] = nodes.length;
                    node = { val: -1, child: [-1, -1] };
                    nodes.push(node);
                } else {
                    node = nodes[node.child[bit]];
                }
            }
            node.val = i;
        }
        return nodes;
    }

    static hmMakeTableFromLngs(lngs) {
        const table = Array.from({ length: lngs.length }, () => []);
        const nonZero = lngs.filter(n => n > 0);
        if (nonZero.length === 0) return table;

        const minv = Math.min(...nonZero);
        const maxv = Math.max(...nonZero);
        const bits = Array(minv).fill(0);
        let prev = 0;

        for (let s = minv; s <= maxv; s++) {
            for (let i = 0; i < lngs.length; i++) {
                if (lngs[i] !== s) continue;
                if (prev > 0) {
                    for (let j = bits.length - 1; j >= 0; j--) {
                        if (bits[j] === 0) {
                            bits[j] = 1;
                            break;
                        }
                        bits[j] = 0;
                    }
                    bits.push(...Array(s - prev).fill(0));
                }
                prev = s;
                table[i] = [...bits];
            }
        }
        return table;
    }

    static decode(table, src, code, v0, v1) {
        const nodes = Code.hmMakeNode(table);
        let dst = [];
        let node = nodes[0];

        for (let i = 0; i < src.length; i++) {
            node = nodes[node.child[src[i]]];
            const val = node.val;

            if (val >= 0) {
                dst.push(val);
                node = nodes[0];
            }
            if (val === code) {
                let v = 0;
                for (let j = 0; j < v0; j++, i++) {
                    v += src[i + 1] << j;
                }
                dst.push(v);
                v = 0;
                for (let j = 0; j < v1; j++, i++) {
                    v += src[i + 1] << j;
                }
                dst.push(v);
            }
        }

        const result = [];
        for (let i = 0; i < dst.length; i++) {
            if (dst[i] !== code) {
                result.push(dst[i]);
            } else {
                const [search, length] = dst.slice(i + 1, i + 3);
                const base = result.length;
                for (let j = 0; j < length; j++) {
                    result.push(result[base - search + j]);
                }
                i += 2;
            }
        }
        return result;
    }

    static table256() {
        const cnts = new Uint8Array(256 + 1);
        for (let i = 0; i < 256; i++) {
            const sum = Array.from({ length: 7 }, (_, j) => ((i >> j) & 1) !== ((i >> (j + 1)) & 1) ? 1 : 0)
                .reduce((a, b) => a + b, 0);
            cnts[i] = 2 ** (7 - sum);
        }
        cnts[256] = 2 ** 7;

        const nodes = [];
        const heads = [];
        for (let i = 0; i < cnts.length; i++) {
            nodes.push({ cnt: cnts[i], parent: null });
            if (cnts[i] > 0) {
                heads.push(nodes[i]);
            }
        }

        while (heads.length >= 2) {
            const node = { cnt: 0, parent: null };

            for (let j = 0; j < 2; j++) {
                let id = 0;
                let minv = Number.MAX_SAFE_INTEGER;
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

        const lngs = [];
        for (let i = 0; i < cnts.length; i++) {
            let len = 0;
            let node = nodes[i];
            while (node.parent) {
                len++;
                node = node.parent;
            }
            lngs.push(len);
        }
        return Code.hmMakeTableFromLngs(lngs);
    }
}
