// @ts-nocheck
import * as THREE from 'three';

// jsdom には WebGL が無いので WebGLRenderer をモックする。
jest.spyOn(THREE, 'WebGLRenderer').mockImplementation(() => ({
    setClearColor() {},
    domElement: { width: 100, height: 100 },
    render() {},
    dispose() {},
    forceContextLoss() {},
}));

import { xnew } from '../../src/index';
import { xthree } from '../../src/addons/xthree';

function setup() {
    const canvas = document.createElement('canvas');
    return canvas;
}

test('nest: 親ユニットの nest が子ユニットの nest の親になる（入れ子が機能する）', () => {
    const canvas = setup();
    const group = new THREE.Object3D();
    const mesh = new THREE.Object3D();
    let scene;

    xnew(() => {
        xthree.initialize({ canvas });
        scene = xthree.scene;
        xnew(() => {                  // 親ユニット
            xthree.nest(group);
            xnew(() => {              // 子ユニット
                xthree.nest(mesh);
            });
        });
    });

    expect(group.parent).toBe(scene);
    expect(mesh.parent).toBe(group);
});

test('nest: 同一ユニットで2回呼ぶと2回目は1回目の子になる（状態を変える）', () => {
    const canvas = setup();
    const a = new THREE.Object3D();
    const b = new THREE.Object3D();
    let scene;

    xnew(() => {
        xthree.initialize({ canvas });
        scene = xthree.scene;
        xthree.nest(a);
        xthree.nest(b);
    });

    expect(a.parent).toBe(scene);
    expect(b.parent).toBe(a);
});

test('add: 現在の親に追加するが親を変えない（同一ユニットで複数 add しても兄弟）', () => {
    const canvas = setup();
    const a = new THREE.Object3D();
    const b = new THREE.Object3D();
    let scene;

    xnew(() => {
        xthree.initialize({ canvas });
        scene = xthree.scene;
        xthree.add(a);
        xthree.add(b);
    });

    expect(a.parent).toBe(scene);
    expect(b.parent).toBe(scene);
});

test('add: nest の中の add は nest の親に入り、後続の nest を汚染しない', () => {
    const canvas = setup();
    const group = new THREE.Object3D();
    const added = new THREE.Object3D();
    const nested = new THREE.Object3D();

    xnew(() => {
        xthree.initialize({ canvas });
        xnew(() => {
            xthree.nest(group);
            xnew(() => { xthree.add(added); });   // group の子になる
            xnew(() => { xthree.nest(nested); }); // group の子（add に影響されない）
        });
    });

    expect(added.parent).toBe(group);
    expect(nested.parent).toBe(group);
});

test('finalize: ユニット破棄で親から外れる', () => {
    const canvas = setup();
    const obj = new THREE.Object3D();
    let scene;
    let child;

    xnew(() => {
        xthree.initialize({ canvas });
        scene = xthree.scene;
        child = xnew(() => { xthree.add(obj); });
    });

    expect(obj.parent).toBe(scene);
    child.finalize();
    expect(obj.parent).toBe(null);
});

test('finalize: xthree.finalize で renderer が dispose / forceContextLoss される', () => {
    const canvas = setup();
    let disposeSpy;
    let lossSpy;

    xnew(() => {
        xthree.initialize({ canvas });
        const renderer = xthree.renderer;
        disposeSpy = jest.spyOn(renderer, 'dispose');
        lossSpy = jest.spyOn(renderer, 'forceContextLoss');
        xthree.finalize();
    });

    expect(disposeSpy).toHaveBeenCalled();
    expect(lossSpy).toHaveBeenCalled();
});

test('finalize: ユニット破棄でも renderer が dispose される（自動解放）', () => {
    const canvas = setup();
    let disposeSpy;

    const root = xnew(() => {
        xthree.initialize({ canvas });
        disposeSpy = jest.spyOn(xthree.renderer, 'dispose');
    });
    root.finalize();

    expect(disposeSpy).toHaveBeenCalled();
});

test('remove: その時点の親から外すだけで dispose はしない（共有リソース保護）', () => {
    const canvas = setup();
    const rig = new THREE.Object3D();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    rig.add(mesh); // rig は scene へ、mesh は rig の子（焼成リグ相当）

    const geoSpy = jest.spyOn(mesh.geometry, 'dispose');
    const matSpy = jest.spyOn(mesh.material, 'dispose');

    xnew(() => {
        xthree.initialize({ canvas });
        xthree.add(rig);
        xthree.remove(mesh); // 親(rig)から外すだけ
    });

    expect(mesh.parent).toBe(null);
    expect(rig.children).not.toContain(mesh);
    expect(geoSpy).not.toHaveBeenCalled();
    expect(matSpy).not.toHaveBeenCalled();
});

test('finalize: ユニット破棄では dispose しない（共有リソース保護）', () => {
    const canvas = setup();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());

    const geoSpy = jest.spyOn(mesh.geometry, 'dispose');
    const matSpy = jest.spyOn(mesh.material, 'dispose');

    let child;
    xnew(() => {
        xthree.initialize({ canvas });
        child = xnew(() => { xthree.add(mesh); });
    });
    child.finalize();

    expect(mesh.parent).toBe(null);
    expect(geoSpy).not.toHaveBeenCalled();
    expect(matSpy).not.toHaveBeenCalled();
});

test('dispose: 親から外して配下の geometry/material/texture を全解放する', () => {
    const canvas = setup();
    const texture = new THREE.Texture();
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);

    const geoSpy = jest.spyOn(mesh.geometry, 'dispose');
    const matSpy = jest.spyOn(material, 'dispose');
    const texSpy = jest.spyOn(texture, 'dispose');

    xnew(() => {
        xthree.initialize({ canvas });
        xthree.add(mesh);
        xthree.dispose(mesh); // 親から外して geometry/material/texture を dispose
    });

    expect(mesh.parent).toBe(null);
    expect(geoSpy).toHaveBeenCalled();
    expect(matSpy).toHaveBeenCalled();
    expect(texSpy).toHaveBeenCalled();
});
