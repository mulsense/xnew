---
sidebar_position: 502
---

# xthree

`xthree` は xnew のライフサイクルを Three.js のシーングラフに統合するアドオンです。各コンポーネントが自身の 3D オブジェクトを保持し、unit が破棄されるとメッシュやライトはシーンから自動的に取り除かれます。

## セットアップ

### CDN
```html
<script src="https://unpkg.com/@mulsense/xnew@0.7.x/dist/xnew.js"></script>
<script src="https://unpkg.com/@mulsense/xnew@0.7.x/dist/addons/xthree.js"></script>
```

### CDN (ESM)
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

### npm
```bash
npm install @mulsense/xnew@0.7.x
```
```js
import xnew from '@mulsense/xnew'
import xthree from '@mulsense/xnew/addons/xthree'
```

## コア API

### `xthree.initialize({ canvas, camera? })`

ルートコンポーネントで一度だけ呼び出し、WebGL レンダラーを生成します。呼び出し後、次のプロパティにアクセスできます。
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

`threeObject` を現在の Three.js 親オブジェクトの子として追加し、そのまま返します。unit が破棄されると、対象オブジェクトはシーンから自動的に取り除かれます。

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
