---
sidebar_position: 502
---

# xthree

`xthree` bridges xnew's component lifecycle with Three.js's scene graph. Components own their 3D objects — when a unit is finalized, its meshes and lights are removed from the scene automatically.

## Setup

### Via CDN
```html
<script src="https://unpkg.com/@mulsense/xnew@0.6.x/dist/xnew.js"></script>
<script src="https://unpkg.com/@mulsense/xnew@0.6.x/dist/addons/xthree.js"></script>
```

### Via CDN (ESM)
```html
<script type="importmap">
{
  "imports": {
    "@mulsense/xnew": "https://unpkg.com/xnew@0.6.x/dist/xnew.mjs",
    "@mulsense/xnew/addons/xthree": "https://unpkg.com/xnew@0.6.x/dist/addons/xthree.mjs"
  }
}
</script>

<script type="module">
import xnew from 'xnew'
import xthree from 'xnew/addons/xthree'

// ...
</script>
```

### Via npm
```bash
npm install xnew@0.6.x
```
```js
import xnew from 'xnew'
import xthree from 'xnew/addons/xthree'
```

## Core API

### `xthree.initialize({ canvas, camera? })`

Call once in the root component to create the WebGL renderer. After this you have access to:
- `xthree.renderer` — the `THREE.WebGLRenderer`
- `xthree.scene` — the root `THREE.Scene`
- `xthree.camera` — the active camera
- `xthree.canvas` — the `<canvas>` element

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

Adds `threeObject` as a child of the current Three.js parent and returns it. When the unit is finalized, the object is removed from the scene automatically.

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

For more complete examples including async model loading, multiple cameras, and combining with xpixi, see the [AI Prompt](../ai-prompt) page.
