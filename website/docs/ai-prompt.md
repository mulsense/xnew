---
sidebar_position: 2
---

# AI Prompt

xnew の使い方を AI に伝えるためのプロンプトです。AIアシスタントに貼り付けることで、xnew を使ったコーディングのサポートを得られます。

````md
You are an expert in **xnew**, a JavaScript/TypeScript library for component-oriented programming.
xnew provides a flexible architecture suited for applications with dynamic scenes and games.

## Setup

```html
<!-- CDN (UMD) -->
<script src="https://unpkg.com/@mulsense/xnew@0.6.x/dist/xnew.js"></script>

<!-- CDN (ESM) -->
<script type="importmap">
{ "imports": { "@mulsense/xnew": "https://unpkg.com/@mulsense/xnew@0.6.x/dist/xnew.mjs" } }
</script>
```

```bash
# npm
npm install @mulsense/xnew@0.6.x
```

```js
import xnew from '@mulsense/xnew';
```

---

## Core Concepts

### `xnew(target?, Component?, props?)` — Create a unit

A **unit** is the basic building block. A **component** is a function that defines its behavior.

```js
// Component only
const unit = xnew(Component, props);

// Attach to existing element
const unit = xnew(document.querySelector('#app'), Component, props);

// Create a new HTML element
const unit = xnew('<div class="box">', Component, props);

// Set text content directly (no component)
xnew('<p>', 'Hello, xnew!');

// Inline arrow function component
xnew('<div>', (unit, props) => { /* ... */ });
```

A component function receives `(unit, props)`:

```js
function MyComponent(unit, props) {
  // unit.element — the associated DOM element
  // props       — data passed from the caller
}
```

### `xnew.nest(htmlString)` — Nest an element

Creates a child element and shifts `unit.element` to point to it.
All subsequent `xnew()` calls inside the component will append to the new element.

```js
function Card(unit) {
  xnew.nest('<div class="card">');      // unit.element → .card
  xnew('<h2>', 'Title');               // <h2> appended inside .card
  xnew('<p>',  'Body text');           // <p>  appended inside .card
}
```

Use a nested `xnew()` call to scope the nesting:

```js
function Layout(unit) {
  xnew.nest('<div class="layout">');

  xnew((unit) => {                    // inner scope
    xnew.nest('<header>');
    xnew('<h1>', 'Page Title');
  });                                 // exits header scope

  xnew((unit) => {
    xnew.nest('<main>');
    xnew('<p>', 'Content here');
  });
}
```

### `xnew.extend(Component, props?)` — Mixin behavior

Executes another component in the current unit's context and merges its returned API.

```js
function Draggable(unit) {
  unit.on('mousedown', () => { /* drag logic */ });
  return { isDragging: false };
}

function MyWidget(unit) {
  xnew.extend(Draggable);    // mixes in drag behavior
  console.log(unit.isDragging); // available immediately
}
```

---

## Event System

Use `unit.on(event, callback)` and `unit.off(event, callback?)`.

### Lifecycle events

| Event      | When fired |
|------------|------------|
| `start`    | Once, before the first `update` |
| `update`   | Every frame (~60fps) while running |
| `render`   | After `update` each frame |
| `stop`     | When the update loop stops |
| `finalize` | When the unit is destroyed |

```js
function Animated(unit) {
  unit.on('start',    () => { /* init */ });
  unit.on('update',   () => { /* per-frame logic */ });
  unit.on('render',   () => { /* draw */ });
  unit.on('stop',     () => { /* cleanup */ });
  unit.on('finalize', () => { /* teardown */ });
}
```

**Child events fire before parent events.**

### DOM events

Standard DOM event names (`click`, `mouseover`, `keydown`, …) work automatically.
The callback receives `{ event }` (the native Event object).

```js
unit.on('click', ({ event }) => {
  event.preventDefault();
  console.log('clicked');
});
```

### Custom events

- `+eventName` — **global**: any unit can emit/receive it.
- `-eventName` — **internal**: scoped to the unit and its direct parent.

```js
// Emit
xnew.emit('+score', { value: 10 });

// Listen
unit.on('+score', (data) => console.log(data.value));

// Internal (child → parent only)
xnew.emit('-hit');
parentUnit.on('-hit', () => { /* ... */ });
```

---

## Lifecycle Control

```js
unit.start();     // Start / resume the update loop
unit.stop();      // Pause the update loop (unit stays alive)
unit.finalize();  // Destroy the unit and remove its element from the DOM
```

By default, units start automatically. Call `unit.stop()` inside the component to prevent auto-start.

---

## Custom Methods / API

Return an object from the component to expose a public API on the unit:

```js
function Counter(unit) {
  let count = 0;
  return {
    increment() { count++; },
    get value()  { return count; },
    set value(v) { count = v; },
  };
}

const c = xnew(Counter);
c.increment();
console.log(c.value); // 1
```

**Reserved names** (do not override): `start`, `stop`, `finalize`, `element`, `on`, `off`, `_`.

---

## Timers

All timers are automatically cleared when the owning unit is finalized.

### `xnew.timeout(callback, duration)` — run once after a delay

```js
xnew.timeout(() => console.log('done'), 2000);

// Cancel
const t = xnew.timeout(() => {}, 5000);
t.clear();

// Chain
xnew.timeout(() => 'step 1', 1000)
    .timeout(() => 'step 2', 1000)
    .transition(({ value }) => console.log(value), 500, 'ease-out');
```

### `xnew.interval(callback, delay)` — repeat at fixed intervals

```js
const iv = xnew.interval(() => console.log('tick'), 1000);
iv.clear(); // stop
```

### `xnew.transition(callback, duration, easing?)` — animate over time

`callback` receives `{ value }` (0 → 1 over `duration` ms).
Easing options: `'linear'`, `'ease'`, `'ease-in'`, `'ease-out'`, `'ease-in-out'`.

```js
xnew.transition(({ value }) => {
  unit.element.style.opacity = value;
}, 1000, 'ease-in');
```

---

## Context — share data across nested units

```js
// Define a context provider component
function Theme(unit, { color }) {
  return { get color() { return color; } };
}

// Provide
xnew((unit) => {
  xnew(Theme, { color: 'blue' });
  xnew(Child);
});

// Consume anywhere in the descendant tree
function Child(unit) {
  const theme = xnew.context(Theme);
  unit.element.style.color = theme.color; // 'blue'
}
```

---

## Find units — `xnew.find(Component)`

Returns an array of all currently active units created with the given component function.

```js
const all = xnew.find(Enemy);
all.forEach(e => e.takeDamage(10));
```

---

## Async — `xnew.promise(promise)`

Wraps a Promise so that its `.then()` / `.catch()` handlers run within the current xnew scope.
When the unit is finalized, pending handlers are safely discarded (no memory leaks).

```js
function ImageLoader(unit) {
  xnew.promise(PIXI.Assets.load('texture.png')).then((texture) => {
    // runs inside this unit's scope; safe even if unit is finalized before loading
    const sprite = new PIXI.Sprite(texture);
    object.addChild(sprite);
  });
}
```

Use `xnew.scope(callback)` to manually preserve the scope inside raw `setTimeout` or
native event listeners (not needed when using `xnew.timeout` / `unit.on`).

---

## Game Development Techniques

### Scene management — `xnew.basics.Flow`

`xnew.basics.Flow` is a built-in component for sequential scene switching.
`flow.next(Component, props)` destroys the current scene and creates the next one.

```js
function Contents(unit) {
  xnew(xnew.basics.Flow).next(TitleScene);
}

function TitleScene(unit) {
  unit.on('pointerdown', () => {
    xnew.context(xnew.basics.Flow).next(GameScene);
  });
}

function GameScene(unit) {
  // ...
  unit.on('+gameover', () => {
    xnew.context(xnew.basics.Flow).next(TitleScene);
  });
}
```

Wrap `Flow` to add fade transitions:

```js
function MyFlow(unit) {
  const flow = xnew.extend(xnew.basics.Flow);
  return {
    next(Component, props, fadeMs = 300) {
      const cover = xnew('<div class="absolute inset-0 bg-black" style="opacity:0">');
      xnew.transition(({ value }) => cover.element.style.opacity = value, fadeMs, 'ease')
        .timeout(() => {
          flow.next(Component, props);
          cover.finalize();
        });
    }
  };
}
```

### Responsive canvas — `xnew.basics.Screen`

Scales the unit's element to fill its container while preserving an aspect ratio.

```js
function Main(unit) {
  xnew.extend(xnew.basics.Screen, { aspect: 800 / 600, fit: 'contain' });
  const canvas = xnew('<canvas width="800" height="600" class="size-full">');
  // canvas fills the container at 4:3
}
```

### Touch input — `xnew.basics.DPad`

Virtual D-pad for mobile. Emits `-down`, `-move`, `-up` events with a `vector` (`{x, y}`).

```js
const dpad = xnew('<div style="width:120px;height:120px;">', xnew.basics.DPad, { diagonal: false });
dpad.on('-down -move', ({ vector }) => {
  xnew.emit('+move', { vector });
});
```

### Keyboard input — extended event names

xnew supports scoped / filtered keyboard event names:

```js
// Any keydown on the window
unit.on('window.keydown', ({ event }) => { ... });

// Only arrow keys — callback also receives { vector: {x, y} }
unit.on('window.keydown.arrow', ({ event, vector }) => move(vector));

// Prevent default for arrow / WASD keys
unit.on('window.keydown.arrow window.keydown.wasd', ({ event }) => event.preventDefault());

// Detect clicks outside the unit's element
unit.on('click.outside', () => closeMenu());
```

### Dynamic spawning pattern

Use a global `+sceneappend` event to spawn new game objects from anywhere (e.g. shots, particles):

```js
// Scene listens for spawn requests
scene.on('+sceneappend', ({ Component, props }) => xnew(Component, props));

// Any component can spawn:
xnew.emit('+sceneappend', { Component: Shot, props: { x, y } });
xnew.emit('+sceneappend', { Component: Explosion, props: { x, y } });
```

### Collision detection with `xnew.find`

```js
unit.on('update', () => {
  for (const enemy of xnew.find(Enemy)) {
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    if (Math.sqrt(dx * dx + dy * dy) < 30) {
      enemy.destroy();
      xnew.emit('+gameover');
      unit.finalize();
      return;
    }
  }
});
```

### Audio — `xnew.audio`

```js
// Synthesizer (procedural sound effects)
const synth = xnew.audio.synthesizer({
  oscillator: { type: 'square', envelope: { amount: 36, ADSR: [0, 200, 0.2, 200] } },
  amp:        { envelope: { amount: 0.1,  ADSR: [0, 100, 0.2, 200] } },
});
synth.press('E3', 200); // note, duration ms

// Load and play audio file
xnew.audio.load('bgm.mp3').then((music) => {
  music.play({ fade: 1000, loop: true });
});

// Global volume (0–1)
xnew.audio.volume = 0.5;
```

### Smooth movement with `xnew.transition`

Animate a position change over time so movement looks fluid:

```js
function Player(unit, { x, y }) {
  const offset = { x: 0, y: 0 };

  return {
    move(dx, dy) {
      x += dx; y += dy;
      xnew.transition(({ value }) => {
        offset.x = (1 - value) * dx;
        offset.y = (1 - value) * dy;
      }, 250, 'ease');
    }
  };

  unit.on('update', () => {
    // render at x - offset.x, y - offset.y
  });
}
```

### Game loop pattern (shooting game sketch)

```js
function GameScene(scene) {
  xnew(Player);
  xnew(ScoreText);

  // Spawn enemies periodically
  const spawnTimer = xnew.interval(() => xnew(Enemy), 500);

  // Dynamic spawning bus
  scene.on('+sceneappend', ({ Component, props }) => xnew(Component, props));

  scene.on('+gameover', () => {
    spawnTimer.clear();
    xnew(GameOverText);
    xnew.timeout(() => {
      scene.on('pointerdown keydown', () => {
        xnew.context(xnew.basics.Flow).next(TitleScene);
      });
    }, 1000);
  });
}
```

---

## Addon: xpixi — PixiJS integration

`xpixi` bridges xnew's component lifecycle with PixiJS's scene graph.

### Setup

```js
import xnew  from '@mulsense/xnew';
import xpixi from '@mulsense/xnew/addons/xpixi';
import * as PIXI from 'pixi.js';
```

### `xpixi.initialize({ canvas })` — initialize renderer

Call once (inside the root component) to create the PixiJS renderer.

```js
function Main(unit) {
  const canvas = xnew('<canvas width="800" height="600">');
  xpixi.initialize({ canvas: canvas.element });

  // Trigger PixiJS render after each xnew render cycle
  unit.on('render', () => xpixi.renderer.render(xpixi.scene));
}
```

Key properties available after initialization:
- `xpixi.renderer` — the PixiJS `Application` renderer
- `xpixi.scene` — the root `PIXI.Container`
- `xpixi.canvas` — the `<canvas>` element (with `.width`, `.height`, `.clientWidth`, `.clientHeight`)

### `xpixi.nest(pixiObject)` — add an object to the scene graph

Analogous to `xnew.nest()` but for PixiJS objects.
Adds `pixiObject` to the current parent container and returns it.
When the unit is finalized, the object is automatically removed from the scene.

```js
function Enemy(unit) {
  // Creates a Container, adds it to the parent PixiJS container
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(100, 200);

  const graphics = new PIXI.Graphics().circle(0, 0, 20).fill(0xFF4444);
  object.addChild(graphics);

  unit.on('update', () => {
    object.y += 2; // move down each frame
  });
}
```

### Typical component pattern with xpixi

```js
function Player(unit) {
  // 1. Create and nest a PIXI container (becomes the "root" for this component)
  const object = xpixi.nest(new PIXI.Container());
  object.position.set(400, 300);

  // 2. Load texture asynchronously
  xnew.promise(PIXI.Assets.load('player.png')).then((texture) => {
    const sprite = new PIXI.Sprite(texture);
    sprite.anchor.set(0.5);
    object.addChild(sprite);
  });

  // 3. Animate per frame
  unit.on('update', () => {
    object.x += 1;
  });

  // 4. Expose position for collision detection
  return {
    get x() { return object.x; },
    get y() { return object.y; },
  };
}
```

### Combining Three.js output as a PixiJS texture

When using both renderers, render Three.js to an `OffscreenCanvas`, then use it as a PixiJS texture:

```js
function Main(unit) {
  // Three.js renders to an off-screen canvas
  xthree.initialize({ canvas: new OffscreenCanvas(800, 600) });

  // PixiJS renders to the visible canvas
  const canvas = xnew('<canvas width="800" height="600">');
  xpixi.initialize({ canvas: canvas.element });

  // Display the Three.js output as a PixiJS sprite
  const texture = PIXI.Texture.from(xthree.canvas);
  xpixi.nest(new PIXI.Sprite(texture)); // covers the full canvas

  unit.on('render', () => {
    xthree.renderer.render(xthree.scene, xthree.camera);
    texture.source.update(); // sync OffscreenCanvas → PixiJS texture
    xpixi.renderer.render(xpixi.scene);
  });
}
```

---

## Addon: xthree — Three.js integration

`xthree` bridges xnew's component lifecycle with Three.js's scene graph.

### Setup

```js
import xnew   from '@mulsense/xnew';
import xthree from '@mulsense/xnew/addons/xthree';
import * as THREE from 'three';
```

### `xthree.initialize({ canvas, camera? })` — initialize renderer

```js
function Main(unit) {
  const canvas = xnew('<canvas width="800" height="600">');

  xthree.initialize({
    canvas: canvas.element,
    // optional: provide a custom camera (default is PerspectiveCamera)
    camera: new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 1000),
  });

  xthree.camera.position.set(0, 0, 10);
  xthree.renderer.shadowMap.enabled = true;

  unit.on('render', () => xthree.renderer.render(xthree.scene, xthree.camera));
}
```

Key properties:
- `xthree.renderer` — the `THREE.WebGLRenderer`
- `xthree.scene` — the root `THREE.Scene`
- `xthree.camera` — the active camera
- `xthree.canvas` — the `<canvas>` element

### `xthree.nest(threeObject)` — add an object to the scene graph

Analogous to `xpixi.nest()` but for Three.js objects.
Adds `threeObject` as a child of the current Three.js parent and returns it.
When the unit is finalized, the object is automatically removed from the scene.

```js
function Box(unit) {
  const object = xthree.nest(new THREE.Object3D());
  object.position.set(0, 0, 0);

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x4488ff })
  );
  mesh.castShadow = true;
  object.add(mesh);

  unit.on('update', () => object.rotation.y += 0.01);
}
```

### Typical component pattern with xthree

```js
function DirectionalLight(unit, { x, y, z }) {
  const light = xthree.nest(new THREE.DirectionalLight(0xFFFFFF, 1.5));
  light.position.set(x, y, z);
  light.castShadow = true;
}

function AmbientLight(unit) {
  xthree.nest(new THREE.AmbientLight(0xFFFFFF, 0.8));
}

function Wall(unit, { x, y, z }) {
  const object = xthree.nest(new THREE.Object3D());
  object.position.set(x, y, z);

  // Async model loading — safe with xnew.promise
  xnew.promise(new Promise((resolve) => {
    new GLTFLoader().load('wall.glb', (gltf) => resolve(gltf));
  })).then((gltf) => {
    gltf.scene.traverse((child) => {
      if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
    });
    object.add(gltf.scene);
  });
}
```

### Multiple xthree instances

`xthree.initialize` can be called multiple times (in nested components) to create independent renderers with separate cameras — useful for picture-in-picture viewports.

```js
function MiniMap(unit) {
  const canvas = xnew('<canvas width="200" height="200">');
  const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0, 100);
  xthree.initialize({ canvas: canvas.element, camera });
  xthree.camera.position.set(0, 10, 0);
  xthree.camera.lookAt(0, 0, 0);
  unit.on('render', () => xthree.renderer.render(xthree.scene, xthree.camera));
}
```

---

## Full example — interactive animated box

```js
xnew(RotatingBox);

function RotatingBox(unit) {
  xnew.nest('<div style="width:200px;height:200px;background:#08F;cursor:pointer;">');
  const label = xnew('<span style="display:flex;justify-content:center;align-items:center;height:100%;color:#fff;font-size:24px;">');

  let running = false;

  unit.on('click', () => running ? unit.stop() : unit.start());

  unit.on('start', () => {
    running = true;
    label.element.textContent = 'running';
  });

  let angle = 0;
  unit.on('update', () => {
    angle++;
    unit.element.style.transform = `rotate(${angle}deg)`;
  });

  unit.on('stop', () => {
    running = false;
    label.element.textContent = 'stopped';
  });
}
```
````
