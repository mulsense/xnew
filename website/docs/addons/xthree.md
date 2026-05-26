---
sidebar_position: 502
---

# xthree

`xthree` は xnew のコンポーネントライフサイクルと Three.js のシーングラフを橋渡しします。コンポーネントは自身の 3D オブジェクトを所有し、unit が finalize されると、そのメッシュやライトはシーンから自動的に削除されます。

## セットアップ

### CDN を使う
```html
<script src="https://unpkg.com/@mulsense/xnew@0.7.x/dist/xnew.js"></script>
<script src="https://unpkg.com/@mulsense/xnew@0.7.x/dist/addons/xthree.js"></script>
```

### CDN を使う (ESM)
```html
<script type="importmap">
{
  "imports": {
    "@mulsense/xnew": "https://unpkg.com/@mulsense/xnew@0.7.x/dist/xnew.mjs",
    "@mulsense/xnew/addons/xthree": "https://unpkg.com/@mulsense/xnew@0.7.x/dist/addons/xthree.mjs"
  }
}
</script>

<script type="module">
import xnew from '@mulsense/xnew'
import xthree from '@mulsense/xnew/addons/xthree'

// ...
</script>
```

### npm を使う
```bash
npm install @mulsense/xnew@0.7.x
```
```js
import xnew from '@mulsense/xnew'
import xthree from '@mulsense/xnew/addons/xthree'
```

## コア API

### `xthree.initialize({ canvas, camera? })`

ルートコンポーネントで一度だけ呼び出して、WebGL レンダラーを生成します。呼び出した後は、以下にアクセスできます。
- `xthree.renderer` — `THREE.WebGLRenderer`
- `xthree.scene` — ルートの `THREE.Scene`
- `xthree.camera` — アクティブなカメラ
- `xthree.canvas` — `<canvas>` 要素

```js
function Main(unit) {
  const canvas = xnew('<canvas width="800" height="600">');
  xthree.initialize({
    canvas: canvas.element,
    camera: new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 1000),
  });
  xthree.camera.position.set(0, 0, 10);

  unit.on('render', () => xthree.renderer.render(xthree.scene, xthree.camera));
}
```

### `xthree.nest(threeObject)`

`threeObject` を現在の Three.js の親の子として追加し、そのオブジェクトを返します。unit が finalize されると、オブジェクトはシーンから自動的に削除されます。

```js
function Box(unit) {
  const object = xthree.nest(new THREE.Object3D());
  object.position.set(0, 0, 0);

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x4488ff })
  );
  object.add(mesh);

  unit.on('update', () => object.rotation.y += 0.01);
}
```
