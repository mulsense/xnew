---
sidebar_position: 501
---

# xpixi

`xpixi` は xnew のライフサイクルを PixiJS のシーングラフに統合するアドオンです。各コンポーネントが自身の 2D オブジェクトを保持し、unit が破棄されるとシーンからも自動的に取り除かれます。

## セットアップ
### CDN
```html
<script src="https://unpkg.com/@mulsense/xnew@0.7.x/dist/xnew.js"></script>
<script src="https://unpkg.com/@mulsense/xnew@0.7.x/dist/addons/xpixi.js"></script>
```

### CDN (ESM)
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

### npm
```bash
npm install @mulsense/xnew@0.7.x
```
```js
import xnew from '@mulsense/xnew'
import xpixi from '@mulsense/xnew/addons/xpixi'
```

## コア API

### `xpixi.initialize({ canvas })`

ルートコンポーネントで一度だけ呼び出し、PixiJS のレンダラーを生成します。呼び出し後、次のプロパティにアクセスできます。
- `xpixi.renderer` — PixiJS のレンダラー
- `xpixi.scene` — ルートの `PIXI.Container`
- `xpixi.canvas` — `<canvas>` 要素

```js
function Main(unit) {
  const canvas = xnew('<canvas width="800" height="600">');
  xpixi.initialize({ canvas: canvas.element });

  unit.on('render', () => xpixi.renderer.render(xpixi.scene));
}
```

### `xpixi.nest(pixiObject)`

`xnew.nest` の PixiJS オブジェクト版です。`pixiObject` を現在の親コンテナに追加し、そのまま返します。unit が破棄されると、対象オブジェクトはシーンから自動的に取り除かれます。

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
