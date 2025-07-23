//--------------------------------------------------------------------------------
// Copyright (c) 2019-2020, sanko-shoko. All rights reserved.
//--------------------------------------------------------------------------------

// namespace
const spio = {};

(function () {
    'use strict';

    //--------------------------------------------------------------------------------
    // node
    //--------------------------------------------------------------------------------

    spio.Node = function () {
        this.name = "";
        this.type = null;
        this.size = null;
        this.data = [];
    };

    spio.Node.prototype.getCNodes = function (name) {
        const ret = [];
        if (name != undefined && Array.isArray(this.data)) {
            for (let i = 0; i < this.data.length; i++) {
                if (this.data[i].name == name) {
                    ret.push(this.data[i]);
                }
            }
        }
        return ret;
    }

    spio.Node.prototype.getCNode = function (name, p = 0) {
        const list = this.getCNodes(name);
        return (p < list.length) ? list[p] : null;
    }


    //--------------------------------------------------------------------------------
    // element
    //--------------------------------------------------------------------------------

    spio.Node.prototype.getTxt = function (p = 0) {
        const list = (this.size > 0) ? this.data.split(",") : [];
        return (p < list.length) ? list[p] : null;
    }

    spio.Node.prototype.getBin = function (type, p = 0) {
        const dv = new DataView(this.data.buffer);
        let ret = null;
        switch (type) {
            case "Int8": ret = dv.getInt8(p); break;
            case "Int16": ret = dv.getInt16(p, true); break;
            case "Int32": ret = dv.getInt32(p, true); break;
            case "Uint8": ret = dv.getUint8(p); break;
            case "Uint16": ret = dv.getUint16(p, true); break;
            case "Uint32": ret = dv.getUint32(p, true); break;
            case "Float32": ret = dv.getFloat32(p, true); break;
            case "Float64": ret = dv.getFloat64(p, true); break;
        }
        return ret;
    }


    //--------------------------------------------------------------------------------
    // load
    //--------------------------------------------------------------------------------

    spio.load = function (target, post) {
        const promise = new Promise(function(resolve, reject) {
            if(typeof(target) == "string" || target instanceof String){
                const xhr = new XMLHttpRequest();
                xhr.open("GET", target, true);
                xhr.responseType = "arraybuffer";

                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4){
                        if ((xhr.status === 200 || xhr.status === 0) && xhr.response) {
                            const bytes = new Uint8Array(xhr.response);
                            resolve(bytes);
                        }
                        else {
                            reject(xhr.status);
                        }
                    }
                };

                xhr.send(null);
            }
            else{
                const reader = new FileReader();
                reader.onload = function() {   
                    const bytes = new Uint8Array(reader.result);
                    resolve(bytes);
                }
                reader.readAsArrayBuffer(target);
            }
        });

        const ok = function (bytes) { post(spio.parse(bytes)); };
        const ng = function (error) { console.log(error); post(null); };
        promise.then(ok).catch(ng);
    }

    spio.parse = function (bytes) {

        function _getc(pos) { return String.fromCharCode(bytes[pos]); }

        const indent = [];
        indent.push(-1);

        const nodes = [];
        nodes.push(new spio.Node());

        for (let i = 0; i < bytes.length;) {
            const node = new spio.Node();

            {
                let pos = i;
                while (1) {
                    const c = _getc(pos++);
                    if (c == '(' || c == '{' || c == '[') break;
                }
                indent.push(pos - 1 - i);

                switch (_getc(pos - 1)) {
                    case '(': node.type = 'TXT_NODE'; break;
                    case '{': node.type = 'BIN_NODE'; break;
                    case '[': node.type = 'OBJ_NODE'; break;
                    default: break;
                }

                while (1) {
                    const c = _getc(pos++);
                    if (c == ')' || c == '}' || c == ']') break;
                    node.name += c;
                }
                i += (pos - i);
            }

            {
                let pos = i;
                let text = "";
                {
                    const check = (node.type === 'BIN_NODE') ? ',' : '\n';
                    while (1) {
                        const c = _getc(pos++);
                        if (c == check) break;
                        text += c;
                    }
                }
                switch (node.type) {
                    case 'TXT_NODE':
                        node.size = (text.length > 0) ? text.split(",").length : 0;
                        node.data = text;
                        break;
                    case 'BIN_NODE':
                        node.size = Number(text);
                        node.data = bytes.slice(pos, pos + node.size);
                        pos += node.size + 1;
                        break;
                    case 'OBJ_NODE':
                        node.size = Number(text);
                        node.data = [];
                        break;
                }
                nodes.push(node);
                i += (pos - i);
            }
        }

        const ptrs = [];

        for (let i = 1; i < nodes.length; i++) {
            const node = nodes[i];

            const crnt = indent[i];
            const prev = indent[i - 1];
            if (crnt > prev) {
                {
                    ptrs.push(nodes[i - 1]);
                }
            }
            else if (crnt < prev) {
                for (let j = 0; j < prev - crnt; j++) {
                    ptrs.pop();
                }
            }
            ptrs[crnt].data.push(node);
        }
        return nodes[0];
    }
})();


// namespace
export const mog = {};

(function () {
    'use strict';

    //--------------------------------------------------------------------------------
    // type
    //--------------------------------------------------------------------------------

    mog.Union = function () {
        this.units = [];
        this.layouts = [];
        this.bbox = { pos: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }] };
        this.msize = 0;

        this.object = null;
    };
    mog.Unit = function () {
        this.name = "";
        this.dsize = [0, 0, 0];
        this.palette = [];
        this.models = [];
        this.bbox = { pos: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }] };

        this.object = null;
    };
    mog.Model = function () {
        this.name = "";
        this.note = {};
        this.buffer = null;
    };

    mog.Layout = function () {
        this.name = "";
        this.pos = [0, 0, 0];
        this.ang = [0, 0, 0];
        this.scl = [1, 1, 1];

        this.unit = null;
    };

    //--------------------------------------------------------------------------------
    // load internal
    //--------------------------------------------------------------------------------

    mog._load = function (path, onload, params = {}) {

        spio.load(path, function (root) {
            try {
                if (!root) throw 'load error';

                const n_mog = root.getCNode('.mog');
                const n_env = root.getCNode('.env');
                if (!n_mog || !n_env) throw 'format error';

                const ver = n_mog.getTxt(0);
                const env = n_env.getTxt(0).split(' ')[1].split('.');
                const ie = Number(env[0]) * 10000 + Number(env[1]) * 100 + Number(env[2]);
                if (!(ver === '1.0' && ie >= 1102)) throw 'version error';

                console.time(path + ' load_v1');
                const union = load_v1(root, params);
                if (!union) throw 'format error';
                console.timeEnd(path + ' load_v1');

                union.path = path;
                onload(union);
            }
            catch (e) {
                console.log(e);
                onload(null);
            }
        });
    };
    
    const load_v1 = function (root, params) {
        const union = new mog.Union();
        union.params = params;

        {
            const n_units = root.getCNodes("unit");

            for (let i = 0; i < n_units.length; i++) {
                const n_unit = n_units[i];
                const unit = new mog.Unit();

                const n_size = n_unit.getCNode("size");
                if (n_size) {
                    unit.dsize[0] = Number(n_size.getTxt(0));
                    unit.dsize[1] = Number(n_size.getTxt(1));
                    unit.dsize[2] = Number(n_size.getTxt(2));

                    unit.bbox.pos[0] = {x: -unit.dsize[0] / 2.0, y: 0.0, z: -unit.dsize[2] / 2.0 };
                    unit.bbox.pos[1] = {x: +unit.dsize[0] / 2.0, y: 0.0, z: +unit.dsize[2] / 2.0 };
                }

                const dsize = unit.dsize;
                const s = [1, dsize[0], dsize[0] * dsize[1]];

                const dsize0 = dsize[0];
                const dsize1 = dsize[1];
                const dsize2 = dsize[2];
                const s0 = s[0];
                const s1 = s[1];
                const s2 = s[2];

                const n_palette = n_unit.getCNode("color");
                {
                    unit.palette = new Array(n_palette.size);
                    for (let c = 0; c < unit.palette.length; c++) {
                        const r = n_palette.data[c * 4 + 0] / 255;
                        const g = n_palette.data[c * 4 + 1] / 255;
                        const b = n_palette.data[c * 4 + 2] / 255;
                        const r2 = r * r * 255;
                        const g2 = g * g * 255;
                        const b2 = b * b * 255;
                        unit.palette[c] = [r2, g2, b2, 255];
                    }
                }

                let model = null;
                const n_models = n_unit.getCNodes("model");
      
                let vmap = null;
                let cmap = null;
                for (let m = 0; m < n_models.length; m++) {
                    const n_model = n_models[m];

                    if (m == 0 || union.params.merge === false) {
                        model = new mog.Model();
                        if (!mog.vmap || !mog.cmap || dsize0 * dsize1 * dsize2 > mog.vmap.length) {
                            vmap = new Uint8Array(dsize0 * dsize1 * dsize2);
                            cmap = new Uint8Array(dsize0 * dsize1 * dsize2);
                            mog.vmap = vmap;
                            mog.cmap = cmap;
                            }
                        else{
                            vmap = mog.vmap;
                            cmap = mog.cmap;
                            vmap.fill(0);
                            cmap.fill(0);
                        }

                        unit.models.push(model);
                    }

                    const n_option = n_model.getCNode("note");

                    const option = {};
                    if (n_option) {
                        for (let p = 0; p < n_option.size; p++) {
                            let o = n_option.getTxt(p);
                            option[o] = true;
                        }
                    }
                    if (option['hidden'] || option['hide']) continue;

                    const n_rect = n_model.getCNode("rect");
                    const rect = { dbase: [0, 0, 0], dsize: [dsize0, dsize1, dsize2] };
                    if (n_rect) {
                        rect.dbase[0] = Number(n_rect.getTxt(0));
                        rect.dbase[1] = Number(n_rect.getTxt(1));
                        rect.dbase[2] = Number(n_rect.getTxt(2));
                        rect.dsize[0] = Number(n_rect.getTxt(3));
                        rect.dsize[1] = Number(n_rect.getTxt(4));
                        rect.dsize[2] = Number(n_rect.getTxt(5));
                    }
                    model.rect = rect;

                    {
                        unit.bbox.pos[1].y = Math.max(unit.bbox.pos[1].y, rect.dbase[1] + rect.dsize[1]);
                    }
                    const n_bin0 = n_model.getCNode("vmap");
                    const n_bin1 = n_model.getCNode("cmap");
                    if(!n_bin0 || !n_bin1) continue;
                    let memA = null;
                    let memB = null;
                    let memC = null;

                    const code = new Code();
                    function loadseg(node, p){
                        let base = 0;
                        for (let i = 0; i < p; i++) {
                            base += node.getBin("Int32", base) + 5;
                        }
                        const seg = { size: node.getBin("Int32", base), offset: node.getBin("Uint8", base + 4), data: null };
                        if (seg.size > 0) {
                            seg.data = node.data.slice(base + 5, base + 5 + seg.size);
                        }
                        return seg
                    }
                    {
                        {
                            const seg = loadseg(n_bin0, 0);
                            memA = seg.data;
                        }
                        {
                            const seg = loadseg(n_bin0, 1);
                            if (seg.size > 0) {
                                memB = code.decode(code.table256(), code.get1BitArray(seg.data, seg.size * 8 - seg.offset), 256, 8, 8);
                            }
                        }
                    }
                    {
                        const PALETTE_CODE = 256;
                        let tableC = null;

                        {
                            const seg = loadseg(n_bin1, 0);
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
                                tableC = code.hmMakeTableFromLngs(lngs);
                            }
                            else{
                                const s = dv.getUint8(0);
                                memC = [s];
                            }
                        }
                        if (tableC) {
                            const seg = loadseg(n_bin1, 1);

                            if (seg.size > 0) {
                                memC = code.decode(tableC, code.get1BitArray(seg.data, seg.size * 8 - seg.offset), PALETTE_CODE, 8, 8);
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

                                    unit.bbox.pos[1].y = Math.max(unit.bbox.pos[1].y, step * y);

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
                    if (union.params.merge === false) {
                        convert(dsize, unit.palette, model, vmap, cmap);
                    }
                }
                if (union.params.merge === undefined || union.params.merge === true) {
                    convert(dsize, unit.palette, model, vmap, cmap);
                }
                union.units.push(unit);
            }
        }
        {
            const n_layouts = root.getCNodes("layout");
            if(n_layouts.length > 0){
                for (var i = 0; i < n_layouts.length; i++) {
                    const layout = new mog.Layout();

                    const n_trns = n_layouts[i].getCNode("trns");
                    layout.pos = [Number(n_trns.getTxt(0)), Number(n_trns.getTxt(1)), Number(n_trns.getTxt(2))];
                    layout.ang = [Number(n_trns.getTxt(3)), Number(n_trns.getTxt(4)), Number(n_trns.getTxt(5))];
                    layout.scl = [Number(n_trns.getTxt(6)), Number(n_trns.getTxt(7)), Number(n_trns.getTxt(8))];

                    const n_unit = n_layouts[i].getCNode("unit");
                    layout.unit = union.units[Number(n_unit.getTxt())];

                    union.bbox.pos[1].x = Math.max(union.bbox.pos[1].x, layout.pos[0] + layout.scl[0] * layout.unit.bbox.pos[1].x);
                    union.bbox.pos[0].x = Math.min(union.bbox.pos[0].x, layout.pos[0] + layout.scl[0] * layout.unit.bbox.pos[0].x);
                    union.bbox.pos[1].y = Math.max(union.bbox.pos[1].y, layout.pos[1] + layout.scl[1] * layout.unit.bbox.pos[1].y);
                    union.bbox.pos[0].y = Math.min(union.bbox.pos[0].y, layout.pos[1] + layout.scl[1] * layout.unit.bbox.pos[0].y);
                    union.bbox.pos[1].z = Math.max(union.bbox.pos[1].z, layout.pos[2] + layout.scl[2] * layout.unit.bbox.pos[1].z);
                    union.bbox.pos[0].z = Math.min(union.bbox.pos[0].z, layout.pos[2] + layout.scl[2] * layout.unit.bbox.pos[0].z);

                    union.layouts.push(layout);
                }
            }
            else{
                const layout = new mog.Layout();
                layout.unit = union.units[0];
                union.layouts.push(layout);
                union.bbox = union.units[0].bbox;
            }
        }
        {
            const bbox = union.bbox;
            const sum = ((bbox.pos[1].x - bbox.pos[0].x) + (bbox.pos[1].y - bbox.pos[0].y) + (bbox.pos[1].z - bbox.pos[0].z)) / 2;
            let max = 0;
            max = Math.max(max, bbox.pos[1].x - bbox.pos[0].x);
            max = Math.max(max, bbox.pos[1].y - bbox.pos[0].y);
            max = Math.max(max, bbox.pos[1].z - bbox.pos[0].z);
            union.msize = Math.max(24, (max + sum) / 2);
        }

        return union;
    };

    const convert = function (dsize, palette, model, vmap, cmap) {
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

                            for (let n = 0; n < 2; n++) {
                                const v = (((i / 2) >> 0) + (n + 1)) % 3;
                                const av = a[v];
                                const sv = s[v];
                                const dsizev =  dsize[v];
                                for (let j = 1; j < dsizev - av; j++) {
                                    if ((vmap[p + j * sv] & bit) === 0) break;
                                    if (j > seq.l) {
                                        seq.v = v;
                                        seq.l = j;
                                    }
                                }
                            }
                            {
                                const sv = s[seq.v];
                                for (let j = 1; j < seq.l + 1; j++) {
                                    vmap[p + j * sv] ^= bit;
                                }
                            }

                            if (seq.l + 1 <= 2) {
                                if (tx + (seq.l + 1) >= tsize[0]) {
                                    tx = 0;
                                    ty++;
                                }
                                seq.tx = tx;
                                seq.ty = ty;
                                tx += (seq.l + 1);
                            }
                            else{
                                if (tx + (seq.l + 3) >= tsize[0]) {
                                    tx = 0;
                                    ty++;
                                }
                                seq.tx = tx;
                                seq.ty = ty;
                                tx += (seq.l + 3);
                            }
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
                            d[seq.v] = seq.l;

                            let tx0, tx1, ty0, ty1;
                            if (seq.l + 1 <= 2) {
                                for (let t = 0; t < (seq.l + 1); t++) {
                                    const c = cmap[p + t * s[seq.v]];
                                    model.buffer.dtex.data.set(palette[c], (seq.ty * tsize[0] + seq.tx + t) * 4);
                                }

                                tx0 = Math.round((seq.tx + 0 + 0.5) / tsize[0] * 65535);
                                tx1 = Math.round((seq.tx + 1 + seq.l - 0.5) / tsize[0] * 65535);
                                ty0 = Math.round((seq.ty + 0.5) / tsize[1] * 65535);
                                ty1 = Math.round((seq.ty + 0.5) / tsize[1] * 65535);
                            }
                            else{
                                for (let t = 0; t < (seq.l + 1); t++) {
                                    const c = cmap[p + t * s[seq.v]];
                                    model.buffer.dtex.data.set(palette[c], (seq.ty * tsize[0] + seq.tx + t + 1) * 4);
                                }
                                {
                                    const t = 0;
                                    const c = cmap[p + t * s[seq.v]];
                                    model.buffer.dtex.data.set(palette[c], (seq.ty * tsize[0] + seq.tx + t + 0) * 4);
                                }
                                {
                                    const t = seq.l + 1 - 1;
                                    const c = cmap[p + t * s[seq.v]];
                                    model.buffer.dtex.data.set(palette[c], (seq.ty * tsize[0] + seq.tx + t + 2) * 4);
                                }

                                tx0 = Math.round((seq.tx + 0 + 1.0) / tsize[0] * 65535);
                                tx1 = Math.round((seq.tx + 1 + seq.l + 1.0) / tsize[0] * 65535);
                                ty0 = Math.round((seq.ty + 0.5) / tsize[1] * 65535);
                                ty1 = Math.round((seq.ty + 0.5) / tsize[1] * 65535);
                            }

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
   
    //--------------------------------------------------------------------------------
    // code
    //--------------------------------------------------------------------------------

    function getBit(data, i) {
        return (data & (0x01 << i)) ? 1 : 0;
    }
    function getArrayBit(array, i) {
        const q = i / 8 >> 0;
        const r = i % 8;
        return (array[q] & (0x01 << r)) ? 1 : 0;
    }

    const Code = function () { };

    Code.prototype.get1BitArray = function (src, bits) {
        const dst = new Uint8Array(bits);
        for (let i = 0; i < dst.length; i++) {
            dst[i] = getArrayBit(src, i);
        }
        return dst;
    }

    Code.prototype.hmNode = function () {
        this.val = -1;
        this.child = [-1, -1];
    };

    Code.prototype.hmMakeNode = function (table) {
        var nodes = new Array(1);

        nodes[0] = new this.hmNode();

        for (let i = 0; i < table.length; i++) {
            const bits = table[i];
            if (bits.length == 0) continue;

            let node = nodes[0];
            for (let j = 0; j < bits.length; j++) {
                const bit = bits[j];
                if (node.child[bit] == -1) {
                    node.child[bit] = nodes.length;

                    node = new this.hmNode();
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

    Code.prototype.hmMakeTableFromLngs = function (lngs) {
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

    Code.prototype.hmMakeTableFromCnts = function (cnts) {
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
        return this.hmMakeTableFromLngs(lngs);
    }

    Code.prototype.decode = function (table, src, code, v0, v1) {
        let dst = [];

        const nodes = this.hmMakeNode(table);
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

    Code.prototype.table256 = function () {
        const cnts = new Uint8Array(256 + 1);

        for (let i = 0; i < 256; i++) {
            let sum = 0;
            for (let j = 0; j < 7; j++) {
                if (getBit(i, j) != getBit(i, j + 1)) sum++;
            }
            cnts[i] = Math.pow(2, 7 - sum);
        }
        cnts[256] = Math.pow(2, 7 - 0);
        return this.hmMakeTableFromCnts(cnts);
    }
})();

//--------------------------------------------------------------------------------
// web worker
//--------------------------------------------------------------------------------

// self.addEventListener('message', function(message) {
//         console.log('message', message);
//     const onload = function (union) {
//         this.postMessage({ union: union, });
//     };
//     mog._load(message.data.url, onload, message.data.params);
// }, false);