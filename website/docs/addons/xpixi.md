---
sidebar_position: 501
---

# xpixi

`xpixi` bridges xnew's component lifecycle with PixiJS's scene graph. You get xnew's automatic cleanup and event system on top of PixiJS's high-performance 2D renderer — no manual `addChild` / `removeChild` bookkeeping when components are destroyed.

## Setup
### Via CDN
```html
<script src="https://unpkg.com/@mulsense/xnew@0.7.x/dist/xnew.js"></script>
<script src="https://unpkg.com/@mulsense/xnew@0.7.x/dist/addons/xpixi.js"></script>
```

### Via CDN (ESM)
```html
<script type="importmap">
{
  "imports": {
    "@mulsense/xnew": "https://unpkg.com/@mulsense/xnew@0.7.x/dist/xnew.mjs",
    "@mulsense/xnew/addons/xpixi": "https://unpkg.com/@mulsense/xnew@0.7.x/dist/addons/xpixi.mjs"
  }
}
</script>

<script type="module">
import xnew from '@mulsense/xnew'
import xpixi from '@mulsense/xnew/addons/xpixi'

// ...
</script>
```

### Via npm
```bash
npm install @mulsense/xnew@0.7.x
```
```js
import xnew from '@mulsense/xnew'
import xpixi from '@mulsense/xnew/addons/xpixi'
```

## Core API

### `xpixi.initialize({ canvas })`

Call once in the root component to create the PixiJS renderer. After this you have access to:
- `xpixi.renderer` — the PixiJS renderer
- `xpixi.scene` — the root `PIXI.Container`
- `xpixi.canvas` — the `<canvas>` element

```js
function Main(unit) {
  const canvas = xnew('<canvas width="800" height="600">');
  xpixi.initialize({ canvas: canvas.element });

  unit.on('render', () => xpixi.renderer.render(xpixi.scene));
}
```

### `xpixi.nest(pixiObject)`

Analogous to `xnew.nest` but for PixiJS objects. Adds `pixiObject` to the current parent container and returns it. The object is automatically removed from the scene when the unit is finalized.

```js
function Enemy(unit) {
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(100, 200);

  const gfx = new PIXI.Graphics().circle(0, 0, 20).fill(0xFF4444);
  object.addChild(gfx);

  unit.on('update', () => {
    object.y += 2; // move down each frame
    if (object.y > 600) unit.finalize(); // auto-cleanup when off screen
  });
}
```

For more complete examples including scene management and collision detection, see the [AI Prompt](../ai-prompt) page.
