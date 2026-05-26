---
sidebar_position: 1
---

# Get Started

**10分で、最初のコンポーネントが動きます。**

## xnew とは?

`xnew` は、コンポーネント指向プログラミング向けの JavaScript / TypeScript ライブラリです。

考え方はシンプルで、コンポーネントはただの関数です。`xnew(MyComponent)` を呼び出せば、DOM・ライフサイクル・イベントを xnew が自動で扱います。クラスもボイラープレートも不要、振る舞いを書く関数があるだけです。

xnew の特長:

- **自動クリーンアップ** — コンポーネント内のタイマー、イベントリスナー、DOM 要素は破棄時にまとめて解放されます。メモリリークの心配は不要です。
- **組み込みアニメーションループ** — `update` イベントが毎フレーム (約60fps) 発火し、アニメーションを簡単に書けます。
- **柔軟なイベントシステム** — グローバル (`+event`) と内部 (`-event`) のカスタムイベントで、コンポーネント間を疎結合にやり取りできます。
- **ゲーム開発向けアドオン** — PixiJS / Three.js 連携により、同じモデルで複雑なインタラクティブアプリを構築できます。

## セットアップ

導入方法は以下から選べます:

### CDN 経由 (初心者向け)
HTML に次のスクリプトを記述します:
```html
<script src="https://unpkg.com/@mulsense/xnew@0.7.x/dist/xnew.js"></script>
```
### CDN 経由 (ESM)
`import map` で ES モジュール版を読み込みます:
```html
<script type="importmap">
{
  "imports": {
    "@mulsense/xnew": "https://unpkg.com/@mulsense/xnew@0.7.x/dist/xnew.mjs"
  }
}
</script>

<script type="module">
import xnew from '@mulsense/xnew';

// Your code here
</script>
```

### npm 経由
npm でインストールします:
```bash
npm install @mulsense/xnew@0.7.x
```

JavaScript からインポートして使います:
```js
import xnew from '@mulsense/xnew';
```

## チュートリアル

押さえる概念は2つだけです:

- **unit** — `xnew()` の戻り値です。コンポーネントインスタンスの DOM 要素、ライフサイクル制御、イベントリスナーを保持します。
- **コンポーネント** — `(unit, props)` を受け取り、その unit の振る舞いを定義する関数です。

### 基本構文
`xnew` の使い方は主に2通りです:

#### 1. コンポーネントの作成
```js
const unit = xnew(Component, props);

function Component(unit, props) {
  // Define behavior here
  // props = data passed to the component
}
```

#### 2. HTML 要素の作成
```js
const unit = xnew('<div class="my-class">', 'inner text');
unit.element; // Access the created DOM element
```

### 例1: はじめてのコンポーネント

最小の xnew プログラムです。コンポーネント1つ、要素1つ、5行のみ:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://unpkg.com/xnew@0.7.x/dist/xnew.js"></script>
</head>
<body>
  <script>
    // Create your first component
    xnew(MyFirstComponent);

    function MyFirstComponent(unit) {
      // Create a simple paragraph element
      xnew('<p>', 'Hello, xnew!');
    }
  </script>
</body>
</html>
```

生成される HTML:
```html
<body>
  <p>Hello, xnew!</p>
</body>
```

### 例2: 複数の要素を作る

`xnew.nest()` はネストのコンテキストを切り替え、以降の要素をコンテナ内に配置します。HTML を書き連ねずに、構造化されたレイアウトを組めます:

<iframe style={{width:'100%',height:'120px',border:'solid 1px #DDD',borderRadius:'6px'}} src="/xnew/0_manual/element.html" ></iframe>

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://unpkg.com/xnew@0.7.x/dist/xnew.js"></script>
</head>
<body>
  <script>
    // Create main component
    xnew(MainComponent);

    function MainComponent(unit) {
      // Create a paragraph element
      xnew('<p>', 'Create new HTML elements.');
    
      // Create a child component
      xnew(ColorBoxes);
    }

    function ColorBoxes(unit) {
      // Create a container and nest child elements inside it
      xnew.nest('<div style="display: flex;">');

      // The following elements will be nested inside the container
      xnew('<div style="width: 160px; height: 36px; background: #d66;">', '1');
      xnew('<div style="width: 160px; height: 36px; background: #6d6;">', '2');
      xnew('<div style="width: 160px; height: 36px; background: #66d;">', '3');
    }
  </script>
</body>
</html>
```

生成される HTML:
```html
<body>
  <p>Create new HTML elements.</p>
  <div style="display: flex;">
    <div style="width: 160px; height: 36px; background: #d66;">1</div>
    <div style="width: 160px; height: 36px; background: #6d6;">2</div>
    <div style="width: 160px; height: 36px; background: #66d;">3</div>
  </div>
</body>
```

**ポイント:**
- `xnew.nest()` はコンテナを作り、以降の要素をその中にネストします
- コンポーネントから他のコンポーネントを呼び出せます
- 各コンポーネントは再利用可能な関数です

### 例3: インタラクションを加える

ここからが本領です。下のボックスをクリックすると、CSS による回転アニメーションが開始・停止します。`start`・`update`・`stop` のライフサイクルイベントが処理を担うので、`requestAnimationFrame` を手動で管理する必要はありません:

<iframe style={{width:'100%',height:'300px',border:'solid 1px #DDD',borderRadius:'6px'}} src="/xnew/0_manual/box.html" ></iframe>

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://unpkg.com/xnew@0.7.x/dist/xnew.js"></script>
</head>
<body>
  <script>
    xnew(RotatingBox);

    function RotatingBox(unit) {
      // Create a centered blue box and nest content inside it
      xnew.nest('<div style="position: absolute; width: 200px; height: 200px; inset: 0; margin: auto; background: #08F; cursor: pointer;">');
      
      // Add text inside the box
      const text = xnew('<span style="color: white; font-size: 24px; display: flex; justify-content: center; align-items: center; height: 100%;">');

      // Handle click events - toggle start/stop
      let running = false;
      unit.on('click', ({ event }) => {
        running ? unit.stop() : unit.start();
      });

      // When animation starts
      unit.on('start', () => {
        running = true;
        text.element.textContent = 'start';
      });

      // Update animation frame
      let rotate = 0;
      unit.on('update', () => {
        rotate++;
        unit.element.style.transform = `rotate(${rotate}deg)`;
      });

      // When animation stops
      unit.on('stop', () => {
        running = false;
        text.element.textContent = 'stop';
      });
    }
  </script>
</body>
</html>
```

**ポイント:**
- `unit.on()` でイベントリスナーを追加します
- `unit.start()` / `unit.stop()` でアニメーションを制御します
- `update` イベントはアニメーション中、毎フレーム発火します

## 次のステップ

これで xnew を始める準備は整いました。次はこちらへ:

1. **[Basics — xnew](./basics/xnew)** — イベント、ライフサイクル、カスタムメソッドなどの API リファレンス
2. **[Basics — xnew.timeout / interval / transition](./basics/xnew.timeout)** — 自動クリーンアップ対応のタイマーとチェイン可能なトランジション
3. **[Addons — xpixi / xthree](./addons/xpixi)** — PixiJS / Three.js 連携
