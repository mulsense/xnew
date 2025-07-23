//--------------------------------------------------------------------------------
// Copyright (c) 2019-2020, sanko-shoko. All rights reserved.
//--------------------------------------------------------------------------------

(function () { 
    'use strict';

    mog.build = function (union) {
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
                
                const texture = new THREE.DataTexture(buffer.dtex.data, buffer.dtex.dsize[0], buffer.dtex.dsize[1], THREE.RGBFormat, THREE.UnsignedByteType);
                texture.magFilter = THREE.NearestFilter;
                texture.minFilter = THREE.NearestFilter;
                texture.generateMipmaps = false;

                const mesh = new THREE.Mesh(bgeom, new THREE.MeshStandardMaterial({ map: texture, side: THREE.FrontSide, roughness: 1.0}));
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

    mog.load = function(url, onload, params = {}){
        const wk = new Worker(window.location.origin + '/js/mog3d.js');
        wk.onmessage = function(message) {
            if (message.data.union) { mog.build(message.data.union); }
            onload(message.data.union);
        };
        wk.postMessage({url: url, params: params, });
    }

    mog.gl = function(canvas, params = {}) {

        const fov = (params.fov === undefined) ? 60 : params.fov;
        const preserveDrawingBuffer = (params.preserveDrawingBuffer === undefined) ? false : params.preserveDrawingBuffer;

        const viewport = canvas.parentNode;
        const gl = this;

        gl.clock = new THREE.Clock();
        gl.canvas = canvas;

        {
            gl.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: (window.devicePixelRatio > 1) ? false : true, alpha: true, preserveDrawingBuffer: preserveDrawingBuffer, });
            gl.renderer.sortObjects = false;
            gl.renderer.setClearColor(0xFFFFFF, 0.0);
            gl.renderer.shadowMap.enabled = true;
            gl.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            gl.renderer.setPixelRatio(window.devicePixelRatio);

            gl.camera = new THREE.PerspectiveCamera(fov, viewport.clientWidth / viewport.clientHeight, 0.1, 1000.0);
        }

        function resize() {
            const w = viewport.clientWidth;
            const h = viewport.clientHeight;
            
            const rate = ((w / h > 1) ? (1.0 + (w / h - 1.0) * 0.2) * h : (h + w) / 2.0) / Math.sqrt(w * h);
            const modfov = fov * rate;

            let size = new THREE.Vector2();
            gl.renderer.getSize(size);

            if (w == size.x && h == size.y && gl.camera.fov == modfov) return;
            gl.renderer.setSize(w, h);
            gl.camera.aspect = w / h;
            gl.camera.fov = modfov;
            gl.camera.updateProjectionMatrix();
        }
        resize();
        window.addEventListener('resize', resize);

        gl.scene = new THREE.Scene();
        {
            gl.layers = new Array(3);
            for(let i = 0; i < gl.layers.length; i++){
                gl.layers[i] = new THREE.Object3D();
                gl.scene.add(gl.layers[i]);
            }

            gl.scene.fog = new THREE.Fog(0xFFFFFF, 0.1, 30.0);

            gl.drcLight1 = new THREE.DirectionalLight(0xFFFFFF, 0.34);
            gl.drcLight1.drc = [3.0, 6.0, 4.0];
            gl.scene.add(gl.drcLight1);

            gl.drcLight2 = new THREE.DirectionalLight(0xFFFFFF, 0.09);
            gl.drcLight2.drc = [3.0, 6.0, 4.0];
            gl.scene.add(gl.drcLight2);

            gl.ambLight = new THREE.AmbientLight(0xFFFFFF, 0.74, 0);
            gl.scene.add(gl.ambLight);

            gl.drcLight1.castShadow = true;
            gl.drcLight1.shadow.bias = -0.0001;
            gl.drcLight1.shadow.mapSize.width = 1024;
            gl.drcLight1.shadow.mapSize.height = 1024;
        }

        function remove (obj) { 
            while (obj.children.length > 0) { 
                remove(obj.children[0]) 
                obj.remove(obj.children[0]); 
            } 
            if (obj.geometry) obj.geometry.dispose() 
            if (obj.material) obj.material.dispose() 
            if (obj.texture) obj.texture.dispose() 
        }
    
        gl.remove = function (obj) { 
            const parent = obj.parent;
            remove(obj);
            parent.remove(obj);
        } 

        let frame = 0;
        let exit = false;
        gl.render = function(loop = false) {
            if (exit) {
                exit = false;
                return;
            }
            resize();

            if (loop) {
                requestAnimationFrame(function () { gl.render(true); });
                if ((frame++ % 2) == 0) return;
            }


            if (gl.update) gl.update();
            {
                const d = gl.camera.position.length();
                {
                    const f = Math.max(d, 5.0);
                    gl.scene.fog.near = f * 1.0;
                    gl.scene.fog.far = f * 30.0;

                    gl.camera.near = d * 0.1;
                    gl.camera.far = f * 60.0;
                }

                {
                    const s = Math.max(d, 1.4);
                    gl.drcLight1.position.set(s * gl.drcLight1.drc[0], s * gl.drcLight1.drc[1], s * gl.drcLight1.drc[2]);
                    gl.drcLight2.position.set(-s * gl.drcLight2.drc[0], -s * gl.drcLight2.drc[1] * 0.1, -s * gl.drcLight2.drc[2] * 0.5);

                    const r = Math.abs(gl.camera.position.y) / gl.camera.position.length();
                    const t = d * (2 - r);
                    gl.drcLight1.shadow.camera.left = -t;
                    gl.drcLight1.shadow.camera.right = +t;
                    gl.drcLight1.shadow.camera.top = -t;
                    gl.drcLight1.shadow.camera.bottom = +t;
                    gl.drcLight1.shadow.camera.near = +s * 0.1;
                    gl.drcLight1.shadow.camera.far = +s * 100.0;
                    gl.drcLight1.shadow.camera.updateProjectionMatrix();
                }

                gl.camera.updateProjectionMatrix();
                gl.renderer.render(gl.scene, gl.camera);
            }
        };

        gl.stop = function(){
            exit = true;
        };

        gl.mkDome = function (size, params) {
            const dome = { object: null };
            dome.object = new THREE.Mesh(new THREE.SphereGeometry(size, 25, 25), new THREE.MeshBasicMaterial(params));
            dome.object.material.side = THREE.BackSide;

            dome.upscale = function(scale){
                dome.object.scale.set(scale, scale, scale);
            }
            return dome;
        }

        gl.mkGround = function (size, params){
            const ground = { object: null };
            ground.object = new THREE.Mesh(new THREE.PlaneGeometry(size, size, 1, 1), new THREE.MeshLambertMaterial(params));
            ground.object.rotation.x = -90 / 180 * Math.PI
            ground.object.receiveShadow = true;
            ground.object.material.opacity = 0.7;
            return ground;
        }

        gl.capture = function(type = 'image/png'){
            const context = canvas.getContext("experimental-webgl", {preserveDrawingBuffer: true});
            return canvas.toDataURL(type);
        };
    }

    function genDomeTex(color0, color1) {
        const s = 32;
        const data = new Uint8Array(s * s * 3);

        for (let v = 0; v < s; v++) {
            for (let u = 0; u < s; u++) {
                const p = (v * s + u) * 3;
                const t = (s - 1) / 2;
                if(v > t){
                    data[p + 0] = Math.round(color0[0] + ((color1[0] - color0[0]) * (v - t) / t));
                    data[p + 1] = Math.round(color0[1] + ((color1[1] - color0[1]) * (v - t) / t));
                    data[p + 2] = Math.round(color0[2] + ((color1[2] - color0[2]) * (v - t) / t));
                }
                else{
                    data[p + 0] = color0[0];
                    data[p + 1] = color0[1];
                    data[p + 2] = color0[2];
                }
            }
        }
        const tex = new THREE.DataTexture(data, s, s, THREE.RGBFormat, THREE.UnsignedByteType);
        //tex.needsUpdate = true;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        return tex;
    };

    mog.tex = {};
    mog.tex.stddome = genDomeTex([ 238, 244, 248], [255, 255, 255]);
    mog.tex.skydome = genDomeTex([ 130, 240, 255], [ 40,  70, 205]);

    mog.viewer = function (canvas, path, onload, params = {}) {

        const preserveDrawingBuffer = (params.preserveDrawingBuffer === undefined) ? false : params.preserveDrawingBuffer;
        const fov = (params.fov === undefined) ? 60 : params.fov;
        const move = (params.move === undefined) ? true : params.move;
        const roll = (params.roll === undefined) ? move : params.roll;
        const pose = params.pose;
        
        const viewer = this;
        viewer.canvas = canvas;
        viewer.roll = roll;
        viewer.union = null;

        viewer.reset = function () {
            if (viewer.gl && viewer.union) {
                if (pose) {
                    viewer.gl.camera.position.set(pose[0], pose[1], pose[2]);
                    viewer.gl.scene.rotation.set(pose[3] / 180 * Math.PI, pose[4] / 180 * Math.PI, pose[5] / 180 * Math.PI);
                }
                else {
                    viewer.gl.camera.position.set(0.0, 0.0, 1.1 * viewer.union.msize);
                    viewer.gl.scene.rotation.set(+25 / 180 * Math.PI, -40 / 180 * Math.PI, 0 / 180 * Math.PI);
                    viewer.gl.camera.lookAt(new THREE.Vector3(0, 0, 0));
                }
            }
        }
        viewer.load = function (path, onload) {
            viewer.download = path;

            mog.load(path, union => {
                if (union) {
                    if (viewer.union) {
                        viewer.gl.remove(viewer.union.object);
                        viewer.union = union;
                        viewer.gl.layers[0].add(union.object);
                    }
                    else {
                        viewer.union = union;

                        const gl = new mog.gl(canvas, { fov: fov, preserveDrawingBuffer: preserveDrawingBuffer, });
                        viewer.gl = gl;

                        {
                            const dome = gl.mkDome(union.msize * 5.0, { map: mog.tex.stddome, });
                            const ground = gl.mkGround(union.msize * 10.0, { color: 0xEEEEF2, transparent: true, });

                            gl.layers[0].position.y -= (union.bbox.pos[1].y + 4.0) / 2.0;
                            gl.layers[0].add(dome.object);
                            gl.layers[0].add(ground.object);
                            gl.layers[0].add(union.object);
                        }

                        gl.update = function () {
                            if (viewer.roll) {
                                gl.scene.rotation.y -= Math.min(gl.clock.getDelta(), 0.1) * 0.1;
                            }
                            if (viewer.update) {
                                viewer.update();
                            }

                            gl.camera.position.z = Math.max(union.msize * 0.1, Math.min(union.msize * 3.0, gl.camera.position.z));
                        }

                        viewer.reset();
                        gl.render(move ? true : false);
                    }
                }
                if (onload) onload(viewer);
            });
        };

        if (path) {
            viewer.load(path, onload);
        }
    }

})();


