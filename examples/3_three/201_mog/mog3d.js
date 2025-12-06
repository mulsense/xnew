

class Unit {
    constructor() {
        this.name = "";
        this.dsize = [0, 0, 0];
        this.palette = [];
        this.models = [];
        this.object = null;
    }
}

class Model {
    constructor() {
        this.name = "";
        this.buffer = null;
    }
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

            unit.palette = new Array(json['palette'].length);
            for (let c = 0; c < unit.palette.length; c++) {
                unit.palette[c] = [json['palette'][c][0], json['palette'][c][1], json['palette'][c][2], 255];
            }

            for (let m = 0; m < json['models'].length; m++) {
                const jsonModel = json['models'][m];
                const model = new Model();
                unit.models.push(model);

                const vmap = new Uint8Array(dsize0 * dsize1 * dsize2);
                const cmap = new Uint8Array(dsize0 * dsize1 * dsize2);
                vmap.fill(0);
                cmap.fill(0);

                const rect = { 
                    dbase: [jsonModel['rect'][0], jsonModel['rect'][1], jsonModel['rect'][2]],
                    dsize: [jsonModel['rect'][3], jsonModel['rect'][4], jsonModel['rect'][5]]
                };
                model.rect = rect;
                const bin0 = base64ToUint8Array(jsonModel['vmap']);
                const bin1 = base64ToUint8Array(jsonModel['cmap']);


                let memA = null;
                let memB = null;
                let memC = null;

                function loadseg(bin, p){
                    const view = new DataView(bin.buffer);

                    let base = 0;
                    for (let i = 0; i < p; i++) {
                        base += view.getInt32(base, true) + 5;
                    }
                    const seg = { size: view.getInt32(base, true), offset: view.getUint8(base + 4, true), data: null };
                    if (seg.size > 0) {
                        seg.data = bin.slice(base + 5, base + 5 + seg.size);
                    }
                    return seg
                }
                {
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
                }


                {
                    const PALETTE_CODE = 256;
                    let tableC = null;

                    {
                        const seg = loadseg(bin1, 0);
                        const dv = new DataView(seg.data.buffer);
                        if (seg.size > 1) {
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
                        else{
                            const s = dv.getUint8(0);
                            memC = [s];
                        }
                    }
                    if (tableC) {
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
                                {
                                    let and = { dbase: [0, 0, 0], dsize: [0, 0, 0] };
                                    const sub = { dbase: [x * 8, y * 8, z * 8], dsize: [8, 8, 8] };
                                    for (let i = 0; i < 3; i++) {
                                        and.dbase[i] = Math.max(rect.dbase[i], sub.dbase[i]);
                                        and.dsize[i] = Math.max(0, Math.min(rect.dbase[i] + rect.dsize[i], sub.dbase[i] + sub.dsize[i]) - and.dbase[i]);
                                    }
                                    if (and.dsize[0] === 0 || and.dsize[1] === 0 || and.dsize[2] === 0) continue;
                                }

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
                return unit;
            }
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

        const sarr = [];

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
                        const a = [x, y, z];

                        for (let i = 0; i < 6; i++){
                            const bit = bits[i];
                            if ((vmap[p] & bit) === 0) continue;

                            const seq = { v: 0, l: 0, tx: 0, ty: 0 };

                            if (tx + (seq.l + 1) >= tsize[0]) {
                                tx = 0;
                                ty++;
                            }
                            seq.tx = tx;
                            seq.ty = ty;
                            tx += (seq.l + 1);
                         
                            sarr.push(seq);
                        }
                    }
                }
            }
            tsize[1] = Math.max(16, ty + 1);
            
            model.buffer = {};
            model.buffer.vtxs = new Uint16Array(sarr.length * 18);
            model.buffer.nrms = new Int8Array(sarr.length * 18);
            model.buffer.uvs = new Uint16Array(sarr.length * 12);
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

                            const seq = sarr[cnt];
                            const d = [0, 0, 0];

                            let tx0, tx1, ty0, ty1;
                            const c = cmap[p];
                            model.buffer.dtex.data.set(palette[c], (seq.ty * tsize[0] + seq.tx) * 4);

                            tx0 = Math.round((seq.tx + 0 + 0.5) / tsize[0] * 65535);
                            tx1 = Math.round((seq.tx + 1 - 0.5) / tsize[0] * 65535);
                            ty0 = Math.round((seq.ty + 0.5) / tsize[1] * 65535);
                            ty1 = Math.round((seq.ty + 0.5) / tsize[1] * 65535);

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

                            model.buffer.vtxs.set(vtx, cnt * 18);
                            model.buffer.nrms.set(nrms[i], cnt * 18);
                            model.buffer.uvs.set(uv, cnt * 12);
                            cnt++;
                        }
                    }
                }
            }
        }
    };
   
    
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