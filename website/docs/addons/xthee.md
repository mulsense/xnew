---
sidebar_position: 501
---

# xthree

## setup
### via cdn
```html
<script src="https://unpkg.com/@mulsense/xnew@0.2.x/dist/xnew.js"></script>
<script src="https://unpkg.com/@mulsense/xnew@0.2.x/dist/addons/xthree.js"></script>
```

### via cdn (ESM)
```html
<script type="importmap">
{
  "imports": {
    "@mulsense/xnew": "https://unpkg.com/xnew@0.2.x/dist/xnew.mjs",
    "@mulsense/xnew/addons/xthree": "https://unpkg.com/xnew@0.2.x/dist/addons/xthree.mjs"
  }
}
</script>

<script type="module">
import xnew from 'xnew'
import xthree from 'xnew/addons/xthree'

// ...
</script>
```

### via npm
```bash
npm install xnew@0.2.x
```
```js
import xnew from 'xnew'
import xthree from 'xnew/addons/xthree'
```

# basic API

## `xthree.initialize`
```js
xthree.initialize({
  canvas: canvas,
  camera: new THREE.PerspectiveCamera(degree, aspect);
})
```

## `xthree.nest`
```js
const object = xthree.nest(new THREE.Object3D()); 
```
