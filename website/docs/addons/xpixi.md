---
sidebar_position: 501
---

# xpixi

## setup
### via cdn
```html
<script src="https://unpkg.com/xnew@2.6.x/dist/xnew.js"></script>
<script src="https://unpkg.com/xnew@2.6.x/dist/addons/xpixi.js"></script>
```

### via cdn (ESM)
```html
<script type="importmap">
{
  "imports": {
    "xnew": "https://unpkg.com/xnew@2.6.x/dist/xnew.module.js",
    "xnew/addons/xpixi": "https://unpkg.com/xnew@2.6.x/dist/addons/xpixi.module.js"
  }
}
</script>

<script type="module">
import xnew from 'xnew'
import xpixi from 'xnew/addons/xpixi'

// ...
</script>
```

### via npm
```bash
npm install xnew@2.6.x
```
```js
import xnew from 'xnew'
import xpixi from 'xnew/addons/xpixi'
```

# basic API

## `xpixi.initialize`
```js
xpixi.initialize({
  renderer: PIXI.autoDetectRenderer({ width, height, view })
})
```

## `xpixi.nest`
```js
const object = xpixi.nest(new PIXI.Container());
```
