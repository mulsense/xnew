---
sidebar_position: 501
---

# xpixi

`xpixi` は xnew のコンポーネントライフサイクルと PixiJS のシーングラフを橋渡しします。PixiJS の高性能な 2D レンダラーの上に、xnew の自動クリーンアップとイベントシステムを利用できます。コンポーネントが破棄される際に、`addChild` / `removeChild` を手動で管理する必要はありません。

## セットアップ
### CDN を使う
```html
<script src="https://unpkg.com/@mulsense/xnew@0.7.x/dist/xnew.js"></script>
<script src="https://unpkg.com/@mulsense/xnew@0.7.x/dist/addons/xpixi.js"></script>
```

### CDN を使う (ESM)
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

### npm を使う
```bash
npm install @mulsense/xnew@0.7.x
```
```js
import xnew from '@mulsense/xnew'
import xpixi from '@mulsense/xnew/addons/xpixi'
```

## コア API

### `xpixi.initialize({ canvas })`

ルートコンポーネントで一度だけ呼び出して、PixiJS のレンダラーを生成します。呼び出した後は、以下にアクセスできます。
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

`xnew.nest` の PixiJS オブジェクト版です。`pixiObject` を現在の親コンテナに追加し、そのオブジェクトを返します。unit が finalize されると、オブジェクトはシーンから自動的に削除されます。

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
