(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.voxelkit = factory());
})(this, (function () { 'use strict';

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise, SuppressedError, Symbol, Iterator */


    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
        var e = new Error(message);
        return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
    };

    function segment(bin, p, bitarray = false) {
        const view = new DataView(bin.buffer);
        let offset = 0;
        for (let i = 0; i < p; i++) {
            offset += ((view.getInt32(offset, true) + 7) >> 3) + 4;
        }
        const length = view.getInt32(offset, true);
        const slice = bin.slice(offset + 4, offset + 4 + ((length + 7) >> 3));
        return bitarray ? Uint8Array.from({ length }, (_, i) => (slice[i >> 3] >> (i % 8)) & 1) : slice;
    }
    function hmMakeNode(table) {
        const nodes = [{ val: -1, child: [-1, -1] }];
        for (let i = 0; i < table.length; i++) {
            if (table[i].length === 0)
                continue;
            let node = nodes[0];
            for (const bit of table[i]) {
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
    function hmMakeTableFromLngs(lngs) {
        const table = Array.from({ length: lngs.length }, () => []);
        const nonZero = lngs.filter(n => n > 0);
        if (nonZero.length === 0)
            return table;
        const [maxv, minv] = [Math.max(...nonZero), Math.min(...nonZero)];
        const bits = new Array(minv).fill(0);
        let prev = 0;
        for (let s = minv; s <= maxv; s++) {
            for (let i = 0; i < lngs.length; i++) {
                if (lngs[i] !== s)
                    continue;
                if (prev > 0) {
                    for (let j = bits.length - 1; j >= 0; j--) {
                        if (bits[j] === 0) {
                            bits[j] = 1;
                            break;
                        }
                        bits[j] = 0;
                    }
                    bits.push(...new Array(s - prev).fill(0));
                }
                prev = s;
                table[i] = [...bits];
            }
        }
        return table;
    }
    function zlDecode(table, src, code, v0, v1) {
        const result = [];
        const nodes = hmMakeNode(table);
        let node = nodes[0];
        for (let i = 0; i < src.length; i++) {
            if ((node = nodes[node.child[src[i]]]).val < 0)
                continue;
            if (node.val < code) {
                result.push(node.val);
            }
            else if (node.val === code) {
                const search = src.slice(i + 1, i + 1 + v0).map((v, s) => v << s).reduce((a, b) => a + b);
                i += v0;
                const length = src.slice(i + 1, i + 1 + v1).map((v, s) => v << s).reduce((a, b) => a + b);
                i += v1;
                for (let j = 0; j < length; j++) {
                    result.push(result[result.length - search]);
                }
            }
            node = nodes[0];
        }
        return result;
    }
    function table256() {
        const nodes = [];
        for (let i = 0; i < 256; i++) {
            const sum = [...new Array(7).keys()].map(s => ((i >> s) ^ (i >> (s + 1))) & 1).reduce((a, b) => a + b);
            nodes.push({ cnt: Math.pow(2, (7 - sum)), parent: null });
        }
        nodes.push({ cnt: Math.pow(2, 8), parent: null });
        for (let i = 0; i < 256 + 1 - 1; i++) {
            const node = { cnt: 0, parent: null };
            for (let j = 0; j < 2; j++) {
                const select = nodes.reduce((a, b) => (a.parent !== null || (b.parent === null && b.cnt < a.cnt)) ? b : a);
                node.cnt += select.cnt;
                select.parent = node;
            }
            nodes.push(node);
        }
        const lngs = new Array(256 + 1).fill(0);
        for (let i = 0; i < 256 + 1; i++) {
            let node = nodes[i];
            while (node = node.parent) {
                lngs[i]++;
            }
        }
        return hmMakeTableFromLngs(lngs);
    }

    class Vec3 {
        constructor(x, y, z) {
            this.x = x;
            this.y = y;
            this.z = z;
        }
        length() {
            return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
        }
        array() {
            return [this.x, this.y, this.z];
        }
        static add(vec0, vec1) {
            return new Vec3(vec0.x + vec1.x, vec0.y + vec1.y, vec0.z + vec1.z);
        }
        static sub(vec0, vec1) {
            return new Vec3(vec0.x - vec1.x, vec0.y - vec1.y, vec0.z - vec1.z);
        }
        static mul(vec0, scale) {
            return new Vec3(vec0.x * scale, vec0.y * scale, vec0.z * scale);
        }
        static dot(vec0, vec1) {
            return vec0.x * vec1.x + vec0.y * vec1.y + vec0.z * vec1.z;
        }
    }

    class Model {
        constructor(name, size) {
            this.name = name;
            this.indices = new Int32Array(size);
            this.vertexs = new Float32Array(size * 3);
            this.normals = new Float32Array(size * 3);
            this.coords = new Float32Array(size * 2);
            this.colors = new Int8Array(size * 3);
        }
    }
    class Bone {
        constructor(parent, name, vec0, vec1, refs) {
            this.parent = parent;
            this.name = name;
            this.refs = refs;
            this.vec0 = vec0;
            this.vec1 = vec1;
        }
        offset() {
            let position = new Vec3(0.0, 0.0, 0.0);
            let bone = this;
            while (bone.parent) {
                position = Vec3.add(position, bone.parent.vec0);
                position = Vec3.add(position, bone.parent.vec1);
                bone = bone.parent;
            }
            return position;
        }
        distance(vec) {
            const vec0 = Vec3.add(this.offset(), this.vec0);
            const vec1 = Vec3.add(vec0, this.vec1);
            const line = Vec3.sub(vec1, vec0);
            const a = Vec3.sub(vec, vec0);
            const b = Vec3.sub(vec, vec1);
            const s = Vec3.dot(line, a) / (line.length() * line.length());
            let result;
            if (s < 0.0 || s > 1.0) {
                result = s < 0.0 ? a : b;
            }
            else {
                result = Vec3.sub(vec, Vec3.add(vec0, Vec3.mul(line, s)));
            }
            return result.length();
        }
    }

    function parseMOG(blob, scale) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const text = yield blob.text();
            const json = JSON.parse(text);
            const composits = [];
            const dsize = json.dsize;
            const s = (scale !== null ? scale : (dsize[1] / 32 * 20)) * 0.001;
            const palette = Uint8Array.from(atob(json.palette), c => c.charCodeAt(0));
            const models = json.layers.map((jsonlayer) => {
                return decode(dsize, palette, jsonlayer.name, jsonlayer.data, s);
            });
            const bones = [];
            for (const jsonbone of ((_a = json.bones) !== null && _a !== void 0 ? _a : [])) {
                const parent = jsonbone.parent >= 0 ? bones[jsonbone.parent] : null;
                const vec0 = Vec3.mul(new Vec3(jsonbone.vector[0], jsonbone.vector[1], jsonbone.vector[2]), s);
                const vec1 = Vec3.mul(new Vec3(jsonbone.vector[3], jsonbone.vector[4], jsonbone.vector[5]), s);
                bones.push(new Bone(parent, jsonbone.name, vec0, vec1, jsonbone.layers));
            }
            composits.push({ models, bones, dsize });
            return composits;
        });
    }
    function decode(dsize, palette, name, data, scale) {
        const gmap = new Uint8Array(dsize[0] * dsize[1] * dsize[2]).fill(0);
        const cmap = new Uint8Array(dsize[0] * dsize[1] * dsize[2]).fill(0);
        const mapbin = Uint8Array.from(atob(data), c => c.charCodeAt(0));
        if (mapbin.length == 0)
            return new Model(name, 0);
        const memA = segment(mapbin, 0, true);
        const memB = zlDecode(table256(), segment(mapbin, 1, true), 256, 8, 8);
        const PALETTE_CODE = 256;
        const sag = segment(mapbin, 2);
        const lngs = new Array(PALETTE_CODE + 1).fill(0);
        for (let c = 0; c < sag.length - 1; c += 2) {
            lngs[sag[c + 0]] = sag[c + 1];
        }
        lngs[PALETTE_CODE] = sag[sag.length - 1];
        const memC = zlDecode(hmMakeTableFromLngs(lngs), segment(mapbin, 3, true), PALETTE_CODE, 8, 8);
        let [a, b, c] = [0, 0, 0];
        for (let z = 0; z < Math.ceil(dsize[2] / 8); z++) {
            for (let y = 0; y < Math.ceil(dsize[1] / 8); y++) {
                for (let x = 0; x < Math.ceil(dsize[0] / 8); x++) {
                    if (memA[a++] === 0)
                        continue;
                    for (let iz = 0; iz < Math.min(8, dsize[2] - 8 * z); iz++) {
                        for (let iy = 0; iy < Math.min(8, dsize[1] - 8 * y); iy++) {
                            for (let ix = 0; ix < Math.min(8, dsize[0] - 8 * x); ix++) {
                                if ((memB[b + iz * 8 + iy] >> ix & 1) === 0)
                                    continue;
                                const p = (z * 8 + iz) * dsize[0] * dsize[1] + (y * 8 + iy) * dsize[0] + (x * 8 + ix);
                                gmap[p] = 0x40;
                                cmap[p] = memC[c++];
                            }
                        }
                    }
                    b += 8 * 8;
                }
            }
        }
        const bits = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20];
        let cnt = 0;
        for (let z = 0; z < dsize[2]; z++) {
            for (let y = 0; y < dsize[1]; y++) {
                for (let x = 0; x < dsize[0]; x++) {
                    const p = z * dsize[0] * dsize[1] + y * dsize[0] + x;
                    if ((gmap[p] & 0x40) === 0)
                        continue;
                    let bit = 0;
                    const s = [1, dsize[0], dsize[0] * dsize[1]];
                    if (x === 0 || (gmap[p - s[0]] & 0x40) === 0)
                        bit |= bits[0];
                    if (y === 0 || (gmap[p - s[1]] & 0x40) === 0)
                        bit |= bits[2];
                    if (z === 0 || (gmap[p - s[2]] & 0x40) === 0)
                        bit |= bits[4];
                    if (x === dsize[0] - 1 || (gmap[p + s[0]] & 0x40) === 0)
                        bit |= bits[1];
                    if (y === dsize[1] - 1 || (gmap[p + s[1]] & 0x40) === 0)
                        bit |= bits[3];
                    if (z === dsize[2] - 1 || (gmap[p + s[2]] & 0x40) === 0)
                        bit |= bits[5];
                    gmap[p] |= bit;
                    cnt += (bit >> 0 & 1) + (bit >> 1 & 1) + (bit >> 2 & 1) + (bit >> 3 & 1) + (bit >> 4 & 1) + (bit >> 5 & 1);
                }
            }
        }
        const model = new Model(name, cnt * 6);
        cnt = 0;
        for (let z = 0; z < dsize[2]; z++) {
            for (let y = 0; y < dsize[1]; y++) {
                for (let x = 0; x < dsize[0]; x++) {
                    const p = z * dsize[0] * dsize[1] + y * dsize[0] + x;
                    if ((gmap[p] & 0x3F) === 0)
                        continue;
                    const [x0, x1] = [(x + 0 - dsize[0] / 2) * scale, (x + 1 - dsize[0] / 2) * scale];
                    const [y0, y1] = [(y + 0) * scale, (y + 1) * scale];
                    const [z0, z1] = [(z + 0 - dsize[2] / 2) * scale, (z + 1 - dsize[2] / 2) * scale];
                    for (let i = 0; i < 6; i++) {
                        if ((gmap[p] & bits[i]) === 0)
                            continue;
                        let vtx;
                        switch (i) {
                            case 0:
                                vtx = [x0, y0, z0, x0, y0, z1, x0, y1, z0, x0, y1, z1, x0, y1, z0, x0, y0, z1];
                                break;
                            case 1:
                                vtx = [x1, y0, z0, x1, y1, z0, x1, y0, z1, x1, y1, z1, x1, y0, z1, x1, y1, z0];
                                break;
                            case 2:
                                vtx = [x0, y0, z0, x1, y0, z0, x0, y0, z1, x1, y0, z1, x0, y0, z1, x1, y0, z0];
                                break;
                            case 3:
                                vtx = [x0, y1, z0, x0, y1, z1, x1, y1, z0, x1, y1, z1, x1, y1, z0, x0, y1, z1];
                                break;
                            case 4:
                                vtx = [x0, y0, z0, x0, y1, z0, x1, y0, z0, x1, y1, z0, x1, y0, z0, x0, y1, z0];
                                break;
                            case 5:
                                vtx = [x0, y0, z1, x1, y0, z1, x0, y1, z1, x1, y1, z1, x0, y1, z1, x1, y0, z1];
                                break;
                            default:
                                vtx = [];
                                break;
                        }
                        let nrm;
                        switch (i) {
                            case 0:
                                nrm = [-1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0];
                                break;
                            case 1:
                                nrm = [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0];
                                break;
                            case 2:
                                nrm = [0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0];
                                break;
                            case 3:
                                nrm = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];
                                break;
                            case 4:
                                nrm = [0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1];
                                break;
                            case 5:
                                nrm = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1];
                                break;
                            default:
                                nrm = [];
                                break;
                        }
                        let col = [];
                        const c = cmap[p];
                        for (let k = 0; k < 6; k++) {
                            col.push(palette[c * 4 + 0], palette[c * 4 + 1], palette[c * 4 + 2]);
                        }
                        model.indices.set([cnt * 6 + 0, cnt * 6 + 1, cnt * 6 + 2, cnt * 6 + 3, cnt * 6 + 4, cnt * 6 + 5], cnt * 6);
                        model.vertexs.set(vtx, cnt * 18);
                        model.normals.set(nrm, cnt * 18);
                        model.colors.set(col, cnt * 18);
                        cnt++;
                    }
                }
            }
        }
        return model;
    }

    function convertVRM(models, bones) {
        return __awaiter(this, void 0, void 0, function* () {
            const size = models.reduce((a, b) => a + b.indices.length, 0);
            const model = new Model('composit', size);
            const joints = []; // unsigned short x4
            const weights = []; // float x4
            const invmats = []; // float x16
            for (let i = 0; i < models.length; i++) {
                const layer = models[i];
                const offset = models.slice(0, i).reduce((a, b) => a + b.indices.length, 0);
                model.indices.set(layer.indices.map(v => v + offset), offset);
                model.vertexs.set(layer.vertexs, offset * 3);
                model.normals.set(layer.normals, offset * 3);
                model.colors.set(layer.colors, offset * 3);
                if (bones.length === 0)
                    continue;
                const mask = [...new Array(bones.length).keys()]
                    .map(j => bones[j].refs.length == 0 || bones[j].refs.some(ref => ref === i));
                for (let j = 0; j < layer.indices.length; j++) {
                    let [nid0, nid1] = [-1, -1];
                    let [min0, min1] = [1000, 1000];
                    let wei = 1.0;
                    {
                        for (let k = 1; k < bones.length; k++) {
                            if (mask[k]) {
                                const vec = new Vec3(layer.vertexs[j * 3 + 0], layer.vertexs[j * 3 + 1], layer.vertexs[j * 3 + 2]);
                                const l = bones[k].distance(vec);
                                if (l < min0) {
                                    min0 = l;
                                    nid0 = k;
                                }
                            }
                        }
                    }
                    if (nid0 >= 0) {
                        min1 = min0 * 2.0;
                        for (let k = 1; k < bones.length; k++) {
                            if (k !== nid0 && mask[k]) {
                                if (bones[nid0].name.indexOf('left') === 0 && bones[k].name.indexOf('right') === 0)
                                    continue;
                                if (bones[nid0].name.indexOf('right') === 0 && bones[k].name.indexOf('left') === 0)
                                    continue;
                                const vec = new Vec3(layer.vertexs[j * 3 + 0], layer.vertexs[j * 3 + 1], layer.vertexs[j * 3 + 2]);
                                const l = bones[k].distance(vec);
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
            for (let i = 0; i < bones.length; i++) {
                const bone = bones[i];
                const t = Vec3.add(bone.offset(), bone.vec0);
                invmats.push(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -t.x, -t.y, -t.z, 1);
            }
            const width = 1024;
            const height = Math.pow(2, Math.ceil(Math.log2((model.colors.length / 3 + width - 1) / width))) >> 0;
            const imgdata = new Uint8Array(width * height * 4);
            for (let i = 0; i < model.colors.length / 3; i++) {
                const s = ((width / 6) >> 0) * 6; // align 6 (2 triangles)
                const [x, y] = [i % s, (i / s) >> 0];
                imgdata[(y * width + (x + 0)) * 4 + 0] = model.colors[i * 3 + 0];
                imgdata[(y * width + (x + 0)) * 4 + 1] = model.colors[i * 3 + 1];
                imgdata[(y * width + (x + 0)) * 4 + 2] = model.colors[i * 3 + 2];
                imgdata[(y * width + (x + 0)) * 4 + 3] = 255;
                model.coords.set([(x + 0.5) / width, (y + 0.5) / height], i * 2);
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx)
                throw new Error('Could not get 2d context');
            ctx.putImageData(new ImageData(new Uint8ClampedArray(imgdata), width, height), 0, 0);
            const pngdata = yield new Promise((resolve) => {
                canvas.toBlob((blob) => {
                    if (!blob)
                        throw new Error('Could not create blob');
                    blob.arrayBuffer().then(buffer => { resolve(new Uint8Array(buffer)); });
                }, 'image/png');
            });
            let binSize = 0;
            binSize += model.indices.length * 4;
            binSize += model.vertexs.length * 4;
            binSize += model.normals.length * 4;
            binSize += model.coords.length * 4;
            binSize += joints.length * 2;
            binSize += weights.length * 4;
            binSize += invmats.length * 4;
            binSize += pngdata.length;
            binSize = Math.ceil(binSize / 4) * 4;
            const binBuffer = new Uint8Array(binSize);
            {
                const view = new DataView(binBuffer.buffer);
                let offset = 0;
                model.indices.forEach(v => { view.setInt32(offset, v, true); offset += 4; });
                model.vertexs.forEach(v => { view.setFloat32(offset, v, true); offset += 4; });
                model.normals.forEach(v => { view.setFloat32(offset, v, true); offset += 4; });
                model.coords.forEach(v => { view.setFloat32(offset, v, true); offset += 4; });
                joints.forEach(v => { view.setUint16(offset, v, true); offset += 2; });
                weights.forEach(v => { view.setFloat32(offset, v, true); offset += 4; });
                invmats.forEach(v => { view.setFloat32(offset, v, true); offset += 4; });
                binBuffer.set(pngdata, offset);
            }
            const bufferViews = [];
            {
                let offset = 0;
                bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: model.indices.length * 4, target: 34963 });
                offset += model.indices.length * 4;
                bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: model.vertexs.length * 4, target: 34962 });
                offset += model.vertexs.length * 4;
                bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: model.normals.length * 4, target: 34962 });
                offset += model.normals.length * 4;
                bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: model.coords.length * 4, target: 34962 });
                offset += model.coords.length * 4;
                bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: joints.length * 2, target: 34962 });
                offset += joints.length * 2;
                bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: weights.length * 4, target: 34962 });
                offset += weights.length * 4;
                bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: invmats.length * 4 });
                offset += invmats.length * 4;
                bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: pngdata.length });
                offset += pngdata.length;
            }
            let [max, min] = [[-1e3, -1e3, -1e3], [1e3, 1e3, 1e3]];
            for (let i = 0; i < model.vertexs.length / 3; i++) {
                min[0] = Math.min(min[0], model.vertexs[i * 3 + 0]);
                min[1] = Math.min(min[1], model.vertexs[i * 3 + 1]);
                min[2] = Math.min(min[2], model.vertexs[i * 3 + 2]);
                max[0] = Math.max(max[0], model.vertexs[i * 3 + 0]);
                max[1] = Math.max(max[1], model.vertexs[i * 3 + 1]);
                max[2] = Math.max(max[2], model.vertexs[i * 3 + 2]);
            }
            const accessors = [
                { bufferView: 0, byteOffset: 0, componentType: 5125, count: model.indices.length, type: "SCALAR", normalized: false },
                { bufferView: 1, byteOffset: 0, componentType: 5126, count: model.vertexs.length / 3, type: "VEC3", normalized: false, max, min },
                { bufferView: 2, byteOffset: 0, componentType: 5126, count: model.normals.length / 3, type: "VEC3", normalized: false },
                { bufferView: 3, byteOffset: 0, componentType: 5126, count: model.coords.length / 2, type: "VEC2", normalized: false },
                { bufferView: 4, byteOffset: 0, componentType: 5123, count: joints.length / 4, type: "VEC4", normalized: false },
                { bufferView: 5, byteOffset: 0, componentType: 5126, count: weights.length / 4, type: "VEC4", normalized: false },
                { bufferView: 6, byteOffset: 0, componentType: 5126, count: invmats.length / 16, type: "MAT4", normalized: false },
            ];
            const nodes = bones.map(bone => {
                const translation = bone.parent ? Vec3.add(bone.vec0, bone.parent.vec1).array() : bone.vec0.array();
                const children = [...bones.keys()].filter(j => bones[j].parent === bone);
                return { name: bone.name, translation, children: children.length > 0 ? children : undefined };
            });
            // model node
            nodes.push({ mesh: 0, name: "model", skin: 0 });
            const gltf = {
                asset: { version: "2.0", generator: "mog3d.js vrm converter", },
                buffers: [{ byteLength: binSize, },],
                bufferViews, accessors, nodes,
                skins: [{ inverseBindMatrices: 6, joints: [...new Array(bones.length).keys()] }],
                materials: [
                    {
                        alphaMode: "OPAQUE",
                        name: "Material",
                        pbrMetallicRoughness: {
                            baseColorFactor: [1.0, 1.0, 1.0, 1.0],
                            metallicFactor: 0.0,
                            roughnessFactor: 1.0,
                            baseColorTexture: {
                                extensions: { KHR_texture_transform: { offset: [0, 0], scale: [1, 1] } },
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
                scenes: [{ nodes: [0, bones.length] }],
                scene: 0,
                textures: [{ sampler: 0, source: 0 }],
                samplers: [{ magFilter: 9728, minFilter: 9728, wrapS: 10497, wrapT: 10497 }],
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
            // humanBones
            for (let i = 0; i < bones.length; i++) {
                gltf.extensions.VRMC_vrm.humanoid.humanBones[bones[i].name] = { node: i };
            }
            const gltfString = JSON.stringify(gltf);
            const jsonBuffer = new TextEncoder().encode(gltfString);
            const jsonSize = Math.ceil(jsonBuffer.length / 4) * 4;
            const jsonPadding = new Uint8Array(jsonSize - jsonBuffer.length);
            jsonPadding.fill(0x20); // space
            // VRM(glTF)
            const vrmBuffer = new Uint8Array(12 + 8 + jsonSize + 8 + binSize);
            const vrmView = new DataView(vrmBuffer.buffer);
            let vrmOffset = 0;
            // header
            vrmBuffer.set([0x67, 0x6C, 0x54, 0x46], vrmOffset);
            vrmOffset += 4; // "glTF"
            vrmView.setUint32(vrmOffset, 2, true);
            vrmOffset += 4; // version
            vrmView.setUint32(vrmOffset, vrmBuffer.length, true);
            vrmOffset += 4; // length
            // json
            vrmView.setUint32(vrmOffset, jsonSize, true);
            vrmOffset += 4;
            vrmBuffer.set([0x4A, 0x53, 0x4F, 0x4E], vrmOffset);
            vrmOffset += 4; // "JSON"
            vrmBuffer.set(jsonBuffer, vrmOffset);
            vrmOffset += jsonBuffer.length; // jsonBuffer
            vrmBuffer.set(jsonPadding, vrmOffset);
            vrmOffset += jsonPadding.length; // jsonPadding
            // binary
            vrmView.setUint32(vrmOffset, binSize, true);
            vrmOffset += 4;
            vrmBuffer.set([0x42, 0x49, 0x4E, 0x00], vrmOffset);
            vrmOffset += 4; // "BIN\0"
            vrmBuffer.set(binBuffer, vrmOffset);
            vrmOffset += binBuffer.length;
            return vrmBuffer;
        });
    }

    const voxelkit = {
        load(path, { scale = null } = {}) {
            var _a;
            const extension = (_a = path.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
            return fetch(path).then((response) => response.blob())
                .then((blob) => {
                return voxelkit.parse(blob, { scale, extension });
            });
        },
        parse(blob, { scale = null, extension = 'mog' } = {}) {
            switch (extension) {
                case 'mog': {
                    return parseMOG(blob, scale);
                }
                // case 'vox':
                //     return loadVoxFormat(path);
                // case 'qb':
                //     return loadQubicleFormat(path);
                default:
                    return Promise.reject(new Error(`Unsupported file format: ${extension}`));
            }
        },
        convertVRM(composit) {
            return convertVRM(composit.models, composit.bones);
        }
    };

    return voxelkit;

}));
