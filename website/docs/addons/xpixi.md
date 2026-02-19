---
sidebar_position: 501
---

# xpixi

## setup
### via cdn
```html
<script src="https://unpkg.com/@mulsense/xnew@0.6.x/dist/xnew.js"></script>
<script src="https://unpkg.com/@mulsense/xnew@0.6.x/dist/addons/xpixi.js"></script>
```

### via cdn (ESM)
```html
<script type="importmap">
{
  "imports": {
    "@mulsense/xnew": "https://unpkg.com/@mulsense/xnew@0.6.x/dist/xnew.mjs",
    "@mulsense/xnew/addons/xpixi": "https://unpkg.com/@mulsense/xnew@0.6.x/dist/addons/xpixi.mjs"
  }
}
</script>

<script type="module">
import xnew from '@mulsense/xnew'
import xpixi from '@mulsense/xnew/addons/xpixi'

// ...
</script>
```

### via npm
```bash
npm install @mulsense/xnew@0.6.x
```
```js
import xnew from '@mulsense/xnew'
import xpixi from '@mulsense/xnew/addons/xpixi'
```

# basic API

## `xpixi.initialize`
```js
xpixi.initialize({
  canvas: canvas
})
```

## `xpixi.nest`
```js
const object = xpixi.nest(new PIXI.Container());
```
