

class Unit {
    constructor() {
        this.dsize = [0, 0, 0];
        this.palette = [];
        this.models = [];
        this.bones = [];
        this.object = null;
    }
}

class Model {
    constructor() {
        this.name = "";
        this.buffer = null;
    }
}

class Bone {
    constructor(parent, name, refs, vec0, vec1, iks) {
        this.name = name;
        this.parent = parent;
        this.refs = refs;
        this.vec0 = vec0;
        this.vec1 = vec1;
        this.iks = iks;
    }
}
class Line {
    constructor(vec0, vec1) {
        this.vec0 = vec0;
        this.vec1 = vec1;
    }
    distance (vec) {
        let distance = 0;
        const linevec = [this.vec1[0] - this.vec0[0], this.vec1[1] - this.vec0[1], this.vec1[2] - this.vec0[2]];
        const linelen = Math.sqrt(linevec[0] * linevec[0] + linevec[1] * linevec[1] + linevec[2] * linevec[2]);

        if (linelen < 0.1) {
            const d = [
                vec[0] - (this.vec0[0] + this.vec1[0]) * 0.5,
                vec[1] - (this.vec0[1] + this.vec1[1]) * 0.5,
                vec[2] - (this.vec0[2] + this.vec1[2]) * 0.5,
            ];
            distance = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
        }
        else {
            const a = [vec[0] - this.vec0[0], vec[1] - this.vec0[1], vec[2] - this.vec0[2]];
            const b = [vec[0] - this.vec1[0], vec[1] - this.vec1[1], vec[2] - this.vec1[2]];
            
            const s = (linevec[0] * a[0] + linevec[1] * a[1] + linevec[2] * a[2]) / linelen;
            if (s < 0.0) {
                distance = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
            }
            else if (s > linelen) {
                distance = Math.sqrt(b[0] * b[0] + b[1] * b[1] + b[2] * b[2]);
            }
            else {
                const c = [
                    vec[0] - (this.vec0[0] + linevec[0] * s / linelen),
                    vec[1] - (this.vec0[1] + linevec[1] * s / linelen),
                    vec[2] - (this.vec0[2] + linevec[2] * s / linelen),
                ];
                distance = Math.sqrt(c[0] * c[0] + c[1] * c[1] + c[2] * c[2]);
            }
        }
        return distance;
    }
}
const usize = 1024;

function get_height(csize) {
    const h = ((2 * csize + usize - 1) / usize) >> 0;
    const p = Math.floor(Math.pow(2, Math.ceil(Math.log2(2 * h))));
    return p;
}
function getBit(data, i) {
    return (data & (0x01 << i)) ? 1 : 0;
}
function getArrayBit(array, i) {
    const q = i / 8 >> 0;
    const r = i % 8;
    return (array[q] & (0x01 << r)) ? 1 : 0;
}
function base64ToUint8Array(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
export class MOG3D {
    static load (path) {
        return fetch(path).then(response => response.json()).then((json) => {
            const unit = new Unit();
            unit.dsize[0] = json['size'][0];
            unit.dsize[1] = json['size'][1];
            unit.dsize[2] = json['size'][2];

            const dsize = unit.dsize;
            const s = [1, dsize[0], dsize[0] * dsize[1]];

            const dsize0 = dsize[0];
            const dsize1 = dsize[1];
            const dsize2 = dsize[2];
            const s0 = s[0];
            const s1 = s[1];
            const s2 = s[2];
            
            const pallet = base64ToUint8Array(json['palette']);
            unit.palette = new Array(pallet.length / 4);
            for (let c = 0; c < unit.palette.length; c++) {
                unit.palette[c] = [pallet[c * 4 + 0], pallet[c * 4 + 1], pallet[c * 4 + 2], pallet[c * 4 + 3]];
            }

            for (let m = 0; m < json['models'].length; m++) {
                const jsonModel = json['models'][m];
                const model = new Model();
                unit.models.push(model);

                const vmap = new Uint8Array(dsize0 * dsize1 * dsize2);
                const cmap = new Uint8Array(dsize0 * dsize1 * dsize2);
                vmap.fill(0);
                cmap.fill(0);

                const bin0 = base64ToUint8Array(jsonModel['vmap']);
                const bin1 = base64ToUint8Array(jsonModel['cmap']);

                let memA = new Uint8Array(0);
                let memB = new Uint8Array(0);
                let memC = new Uint8Array(0);

                function loadseg(bin, p){
                    const view = new DataView(bin.buffer);

                    let base = 0;
                    for (let i = 0; i < p; i++) {
                        const bits = view.getInt32(base, true);
                        base += ((bits + 7) >> 3) + 4;
                    }
                    const bits = view.getInt32(base, true);
                    const size = (bits + 7) >> 3;
                    const offset = size * 8 - bits;
                    const seg = { size, offset, data: null };
                    if (seg.size > 0) {
                        seg.data = bin.slice(base + 4, base + 4 + seg.size);
                    }
                    return seg
                }

                if (bin0.length > 0) { 
                    {
                        const seg = loadseg(bin0, 0);
                        memA = seg.data;
                    }
                    {
                        const seg = loadseg(bin0, 1);
                        if (seg.size > 0) {
                            memB = Code.decode(Code.table256(), Code.get1BitArray(seg.data, seg.size * 8 - seg.offset), 256, 8, 8);
                        }
                    }
           
                    const PALETTE_CODE = 256;
                    let tableC = null;

                    {
                        const seg = loadseg(bin1, 0);
                        const dv = new DataView(seg.data.buffer);
                    
                        const lngs = new Array(PALETTE_CODE + 1);
                        lngs.fill(0);
                        for (let c = 0; c < seg.size - 1; c += 2) {
                            const s = dv.getUint8(c + 0);
                            const b = dv.getUint8(c + 1);
                            lngs[s] = b;
                        }
                        lngs[PALETTE_CODE] = dv.getUint8(seg.size - 1);
                        tableC = Code.hmMakeTableFromLngs(lngs);
                       
                    }
                    {
                        const seg = loadseg(bin1, 1);

                        if (seg.size > 0) {
                            memC = Code.decode(tableC, Code.get1BitArray(seg.data, seg.size * 8 - seg.offset), PALETTE_CODE, 8, 8);
                        }
                    }
                }

                {
                    const step = 8;
                    const msize0 = ((dsize[0] + 7) / step) >> 0;
                    const msize1 = ((dsize[1] + 7) / step) >> 0;
                    const msize2 = ((dsize[2] + 7) / step) >> 0;

                    let a = 0;
                    let b = 0;
                    let c = 0;
                    
                    for (let z = 0; z < msize2; z++) {
                        for (let y = 0; y < msize1; y++) {
                            for (let x = 0; x < msize0; x++) {

                                const a0 = (a / step) >> 0;
                                const a1 = (a % step);
                                a++;
                                if ((memA[a0] & (0x01 << a1)) === 0) continue;

                                const nsize0 = Math.min(step, dsize0 - step * x);
                                const nsize1 = Math.min(step, dsize1 - step * y);
                                const nsize2 = Math.min(step, dsize2 - step * z);
                                const offset = z * step * s2 + y * step * s1 + x * step * s0;

                                for (let iz = 0; iz < nsize2; iz++) {
                                    for (let iy = 0; iy < nsize1; iy++) {
                                        let mb = memB[b++];
                                        let p = iz * s2 + iy * s1 + 0 * s0 + offset;
                                        for (let ix = 0; ix < nsize0; ix++) {
                                            if (mb & 0x01) {
                                                if (m == 0 || vmap[p] === 0) {
                                                    vmap[p] = 0x80;
                                                    cmap[p] = memC[Math.min(memC.length - 1, c)];
                                                }
                                                c++;
                                            }
                                            mb >>= 1;
                                            p++;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                MOG3D.convert(dsize, unit.palette, model, vmap, cmap);
            }

            for (let b = 0; b < json['bones'].length; b++) {
                const jsonBone = json['bones'][b];
                unit.bones.push(new Bone(
                    jsonBone['parent'],
                    jsonBone['name'],
                    jsonBone['refs'],
                    jsonBone['vec0'],
                    jsonBone['vec1'],
                    jsonBone['iks'],
                ));
            }
            MOG3D.convertVRM(unit, 0.1);
            return unit;
        });
    };

    static convert (dsize, palette, model, vmap, cmap) {
        const nrms = [];
        nrms.push(new Int8Array([-127, 0, 0, -127, 0, 0, -127, 0, 0, -127, 0, 0, -127, 0, 0, -127, 0, 0,]));
        nrms.push(new Int8Array([+127, 0, 0, +127, 0, 0, +127, 0, 0, +127, 0, 0, +127, 0, 0, +127, 0, 0,]));
        nrms.push(new Int8Array([0, -127, 0, 0, -127, 0, 0, -127, 0, 0, -127, 0, 0, -127, 0, 0, -127, 0,]));
        nrms.push(new Int8Array([0, +127, 0, 0, +127, 0, 0, +127, 0, 0, +127, 0, 0, +127, 0, 0, +127, 0,]));
        nrms.push(new Int8Array([0, 0, -127, 0, 0, -127, 0, 0, -127, 0, 0, -127, 0, 0, -127, 0, 0, -127,]));
        nrms.push(new Int8Array([0, 0, +127, 0, 0, +127, 0, 0, +127, 0, 0, +127, 0, 0, +127, 0, 0, +127,]));

        const s = [1, dsize[0], dsize[0] * dsize[1]];

        const dsize0 = dsize[0];
        const dsize1 = dsize[1];
        const dsize2 = dsize[2];
        const s0 = s[0];
        const s1 = s[1];
        const s2 = s[2];

        const bits = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, ];

        const sq = Math.sqrt(2 * (dsize0 * dsize1 + dsize1 * dsize2 + dsize2 * dsize0));
        const sz = Math.pow(2, Math.ceil(Math.log2(sq)));

        const texs = [];

        const tsize = [sz, 0];

        {
            for (let z = 0; z < dsize2; z++) {
                for (let y = 0; y < dsize1; y++) {
                    for (let x = 0; x < dsize0; x++) {
                        const p = z * s2 + y * s1 + x * s0;
                        if ((vmap[p] & 0x80) === 0) continue;

                        let bit = 0;
                        if (x === 0 || (vmap[p - s0] & 0x80) === 0) bit |= 0x01;
                        if (x === dsize0 - 1 || (vmap[p + s0] & 0x80) === 0) bit |= 0x02;
                        if (y === 0 || (vmap[p - s1] & 0x80) === 0) bit |= 0x04;
                        if (y === dsize1 - 1 || (vmap[p + s1] & 0x80) === 0) bit |= 0x08;
                        if (z === 0 || (vmap[p - s2] & 0x80) === 0) bit |= 0x10;
                        if (z === dsize2 - 1 || (vmap[p + s2] & 0x80) === 0) bit |= 0x20;
                        vmap[p] = vmap[p] | bit;
                    }
                }
            }

            let tx = 0;
            let ty = 0;
            for (let z = 0; z < dsize2; z++) {
                for (let y = 0; y < dsize1; y++) {
                    for (let x = 0; x < dsize0; x++) {
                        const p = z * s2 + y * s1 + x * s0;
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
            
            model.buffer = {};
            model.buffer.vtxs = new Uint16Array(texs.length * 18);
            model.buffer.nrms = new Int8Array(texs.length * 18);
            model.buffer.cols = new Int8Array(texs.length * 18);
            model.buffer.uvs = new Uint16Array(texs.length * 12);
            model.buffer.dtex = { data: new Uint8Array(tsize[0] * tsize[1] * 4), dsize: tsize };
        }
        {
            let cnt = 0;
            for (let z = 0; z < dsize2; z++) {
                for (let y = 0; y < dsize1; y++) {
                    for (let x = 0; x < dsize0; x++) {
                        const p = z * s2 + y * s1 + x * s0;
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

                            let tx0, tx1, ty0, ty1;
                            const c = cmap[p];
                            model.buffer.dtex.data.set(palette[c], (tex.ty * tsize[0] + tex.tx) * 4);

                            tx0 = Math.round((tex.tx + 0 + 0.5) / tsize[0] * 65535);
                            tx1 = Math.round((tex.tx + 1 - 0.5) / tsize[0] * 65535);
                            ty0 = Math.round((tex.ty + 0.5) / tsize[1] * 65535);
                            ty1 = Math.round((tex.ty + 0.5) / tsize[1] * 65535);

                            let uv;
                            if ((d[(((i / 2) >> 0) - (i % 2) + 2) % 3]) > 0) {
                                uv = [tx0, ty0, tx1, ty0, tx0, ty1, tx1, ty1, tx0, ty1, tx1, ty0,];
                            } else {
                                uv = [tx0, ty0, tx0, ty1, tx1, ty0, tx1, ty1, tx1, ty0, tx0, ty1,];
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
                            let col = [];
                            for (let k = 0; k < 6; k++) {
                                col.push(palette[c][0]);
                                col.push(palette[c][1]);
                                col.push(palette[c][2]);
                            }

                            model.buffer.vtxs.set(vtx, cnt * 18);
                            model.buffer.nrms.set(nrms[i], cnt * 18);
                            model.buffer.cols.set(col, cnt * 18);
                            model.buffer.uvs.set(uv, cnt * 12);
                            cnt++;
                        }
                    }
                }
            }
        }
    };
   
    static convertVRM(unit, scale) {
        const indices = []; // int
        const vertexs = []; // Vec3
        const normals = []; // Vec3
        const texcoords = []; // Vec2
        const joints = []; // unsigned short
        const weights = []; // float
        const inverseBindMatrices = []; // Mat4
        const img_data = []; // Uint8Array

        const cols = []; // Col3
        const bones = unit.bones;

        const mcenter = unit.dsize[1] / 2;

        const vidxs = []; // int

        const lines = [];
        for (let i = 0; i < bones.length; i++) {
            const bone = bones[i];

            let pos = [0.0, 0.0, 0.0];
            let temp = bone;
            while (temp.parent >= 0) {
                let parent = bones[temp.parent];
                pos[0] += (parent.vec0[0] + parent.vec1[0]);
                pos[1] += (parent.vec0[1] + parent.vec1[2]);
                pos[2] += (parent.vec0[2] + parent.vec1[2]);
                temp = parent;
            }
            const v0 = [pos[0] + bone.vec0[0], pos[1] + bone.vec0[1], pos[2] + bone.vec0[2]];
            const v1 = [v0[0] + bone.vec1[0], v0[1] + bone.vec1[1], v0[2] + bone.vec1[2]];
            lines.push(new Line(
                [v0[0] * scale, v0[1] * scale, v0[2] * scale],
                [v1[0] * scale, v1[1] * scale, v1[2] * scale],
            ));
        }

        for (let i = 0; i < unit.models.length; i++) {
            const model = unit.models[i];

            const vtxs = model.buffer.vtxs;
            const nrms = model.buffer.nrms;
            const uvs = model.buffer.uvs;

            const temps = [] // Vec3
            const offset = indices.length;

            for (let j = 0; j < vtxs.length / 9; j++) {
                vertexs.push([vtxs[j * 9 + 0] * scale, (vtxs[j * 9 + 1]) * scale, vtxs[j * 9 + 2] * scale]);
                vertexs.push([vtxs[j * 9 + 3] * scale, (vtxs[j * 9 + 4]) * scale, vtxs[j * 9 + 5] * scale]);
                vertexs.push([vtxs[j * 9 + 6] * scale, (vtxs[j * 9 + 7]) * scale, vtxs[j * 9 + 8] * scale]);

                temps.push([vtxs[j * 9 + 0] * scale, (vtxs[j * 9 + 1]) * scale, vtxs[j * 9 + 2] * scale]);
                temps.push([vtxs[j * 9 + 3] * scale, (vtxs[j * 9 + 4]) * scale, vtxs[j * 9 + 5] * scale]);
                temps.push([vtxs[j * 9 + 6] * scale, (vtxs[j * 9 + 7]) * scale, vtxs[j * 9 + 8] * scale]);

                normals.push([nrms[j * 9 + 0] / 127.0, nrms[j * 9 + 1] / 127.0, nrms[j * 9 + 2] / 127.0]);
                normals.push([nrms[j * 9 + 3] / 127.0, nrms[j * 9 + 4] / 127.0, nrms[j * 9 + 5] / 127.0]);
                normals.push([nrms[j * 9 + 6] / 127.0, nrms[j * 9 + 7] / 127.0, nrms[j * 9 + 8] / 127.0]);

                indices.push(offset + j * 3 + 0);
                indices.push(offset + j * 3 + 1);
                indices.push(offset + j * 3 + 2);
            }

            for (let j = 0; j < model.buffer.cols.length / 3; j++) {
                cols.push([model.buffer.cols[j * 3 + 0], model.buffer.cols[j * 3 + 1], model.buffer.cols[j * 3 + 2]]);
            }
            const mask = [];
            for (let j = 0; j < bones.length; j++) {
                mask.push(0);
            }
            if (bones.length > 1) {
                for (let j = 0; j < bones.length; j++) {
                    if (bones[j].refs.length == 0) {
                        mask[j] = 1;
                    }
                    else {
                        for (let k = 0; k < bones[j].refs.length; k++) {
                            if (bones[j].refs[k] === i) {
                                mask[j] = 1;
                            }
                        }
                    }
                }
                for (let j = 0; j < temps.length; j++) {
                    let nid0 = -1;

                    let min0 = 1000;
                    {
                        for (let k = 1; k < bones.length; k++) {
                            if (mask[k]) {
                                const l = lines[k].distance(temps[j]);
                                if (l < min0) {
                                    min0 = l;
                                    nid0 = k;
                                }
                            }
                        }
                    }
                    let wei = 1.0;
                    let nid1 = -1;
                    let min1 = 1000;
                    if (nid0 >= 0) {
                        min1 = min0 * 2.0;
                        for (let k = 1; k < bones.length; k++) {
                            if (k == nid0) continue;
                            {
                                const n0 = bones[nid0].name;
                                const s0 = n0.length;

                                const n1 = bones[k].name;
                                const s1 = n1.length;
                                if (s0 >= 2 && s1 >= 2) {
                                    if (n0[s0 - 2] == 'L' && n1[s1 - 2] == 'R') {
                                        continue;
                                    }
                                    if (n0[s0 - 2] == 'R' && n1[s1 - 2] == 'L') {
                                        continue;
                                    }
                                }
                            }
                            if (mask[k]) {
                                const l = lines[k].distance(temps[j]);
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

        for (let i = 0; i < bones.length; i++) {
            const bone = bones[i];

            let pos = [0.0, 0.0, 0.0];
            let temp = bone;
            while (temp.parent >= 0) {
                let parent = bones[temp.parent];
                pos[0] += (parent.vec0[0] + parent.vec1[0]);
                pos[1] += (parent.vec0[1] + parent.vec1[2]);
                pos[2] += (parent.vec0[2] + parent.vec1[2]);
                temp = parent;
            }
            const v0 = [pos[0] + bone.vec0[0], pos[1] + bone.vec0[1], pos[2] + bone.vec0[2]];
            const mat = [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                -v0[0] * scale, -v0[1] * scale, -v0[2] * scale, 1,
            ];
            inverseBindMatrices.push(mat);
        }
        let promise;
        {
            const w = usize;
            const h = get_height(cols.length);

            const imgdata = new Uint8Array(w * h * 4);
            for (let i = 0; i < imgdata.length; i++) {
                imgdata[i] = 255;
            }
            //for (int i = 0; i < cols.size(); i++) {
            //    img[i] = cast<Col4>(cols[i]);
            //    float u = (i % w + 0.5) / w;
            //    float v = (i / w + 0.5) / h;
            //    texcoords.push_back(Vec2(u, v));
            //    texcoords.push_back(Vec2(u, v));
            //    texcoords.push_back(Vec2(u, v));
            //}
            for (let i = 0; i < cols.length; i++) {
                const x = (i * 2) % w;
                const y = Math.floor((i * 2) / w) * 2;

                imgdata[(y + 0) * w * 4 + (x + 0) * 4 + 0] = cols[i][0];
                imgdata[(y + 0) * w * 4 + (x + 0) * 4 + 1] = cols[i][1];
                imgdata[(y + 0) * w * 4 + (x + 0) * 4 + 2] = cols[i][2];
                
                imgdata[(y + 0) * w * 4 + (x + 1) * 4 + 0] = cols[i][0];
                imgdata[(y + 0) * w * 4 + (x + 1) * 4 + 1] = cols[i][1];
                imgdata[(y + 0) * w * 4 + (x + 1) * 4 + 2] = cols[i][2];

                imgdata[(y + 1) * w * 4 + (x + 0) * 4 + 0] = cols[i][0];
                imgdata[(y + 1) * w * 4 + (x + 0) * 4 + 1] = cols[i][1];
                imgdata[(y + 1) * w * 4 + (x + 0) * 4 + 2] = cols[i][2];
                
                imgdata[(y + 1) * w * 4 + (x + 1) * 4 + 0] = cols[i][0];
                imgdata[(y + 1) * w * 4 + (x + 1) * 4 + 1] = cols[i][1];
                imgdata[(y + 1) * w * 4 + (x + 1) * 4 + 2] = cols[i][2];

                const u = Math.floor((x + 0.5) / w);
                const v = Math.floor((y + 0.5) / h);
                texcoords.push([u, v]);
                texcoords.push([u, v]);
                texcoords.push([u, v]);
            }
            promise = uint8ArrayToPng(imgdata, w, h)
        }

        promise.then((pngdata) => {
            let binlength = 0;
            {
                binlength += (indices.length * 4) * 2;
                binlength += (vertexs.length * 4) * 3;
                binlength += (normals.length * 4) * 3;
                binlength += (texcoords.length * 4) * 2;
                binlength += (joints.length * 2);
                binlength += (weights.length * 4);
                binlength += (inverseBindMatrices.length * 4) * 16;

                binlength += pngdata.length;
            }

            const binaryBuffer = new Uint8Array(binlength);
            {
  
            }

        });
        return promise;
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
    return new Promise(resolve => {
        canvas.toBlob(blob => {
            blob.arrayBuffer().then(buffer => {
                resolve(new Uint8Array(buffer));
            });
        }, 'image/png');
    });
}
class hmNode {
    constructor() {
        this.val = -1;
        this.child = [-1, -1];
    }
};
class Code {
    static get1BitArray (src, bits) {
        const dst = new Uint8Array(bits);
        for (let i = 0; i < dst.length; i++) {
            dst[i] = getArrayBit(src, i);
        }
        return dst;
    }

    static hmMakeNode(table) {
        var nodes = new Array(1);

        nodes[0] = new hmNode();

        for (let i = 0; i < table.length; i++) {
            const bits = table[i];
            if (bits.length == 0) continue;

            let node = nodes[0];
            for (let j = 0; j < bits.length; j++) {
                const bit = bits[j];
                if (node.child[bit] == -1) {
                    node.child[bit] = nodes.length;

                    node = new hmNode();
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
                if (getBit(i, j) != getBit(i, j + 1)) sum++;
            }
            cnts[i] = Math.pow(2, 7 - sum);
        }
        cnts[256] = Math.pow(2, 7 - 0);
        return Code.hmMakeTableFromCnts(cnts);
    }
}
