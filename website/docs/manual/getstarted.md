---
sidebar_position: 1
---

# get started

**10分で最初のステップ。**

## xnew とは?

`xnew` はコンポーネント指向プログラミング向けの JavaScript / TypeScript ライブラリです。

コンポーネントは関数として記述します。`xnew(MyComponent)` を呼び出すと、DOM・ライフサイクル・イベントの管理は xnew が引き受けます。クラスや継承、定型コードは必要ありません。

xnew の特徴は次のとおりです。

- **自動クリーンアップ** — コンポーネント内で生成したタイマー・イベントリスナー・DOM 要素は、破棄時にまとめて解放されます。
- **アニメーションループ内蔵** — `update` イベントが毎フレーム (約 60fps) 発火するため、アニメーションを簡潔に記述できます。
- **柔軟なイベントシステム** — グローバル (`+event`) と内部 (`-event`) のカスタムイベントにより、コンポーネント間を疎結合に保てます。
- **ゲーム向けアドオン** — PixiJS / Three.js 連携が公式提供されており、同じモデルで複雑なインタラクティブアプリも構築できます。

## セットアップ

導入方法は次の 3 通りから選べます。

### CDN (初心者向け)
HTML に次のスクリプトタグを追加します。
```html
<script src="https://unpkg.com/@mulsense/xnew@0.7.x/dist/xnew.js"></script>
```
### CDN (ESM)
ES モジュール版は import map で読み込みます。
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

### npm
npm でインストールします。
```bash
npm install @mulsense/xnew@0.7.x
```

JavaScript ファイルからインポートして使用します。
```js
import xnew from '@mulsense/xnew';
```

## チュートリアル

押さえるべき概念は 2 つだけです。

- **unit** — `xnew()` の戻り値です。1 つのコンポーネントインスタンスに対応し、DOM 要素・ライフサイクル制御・イベントリスナーを保持します。
- **コンポーネント** — `(unit, props)` を受け取り、その unit の振る舞いを定義する関数です。

### 基本構文
`xnew` の使い方は主に 2 通りです。

#### 1. コンポーネントの生成
```js
const unit = xnew(Component, props);

function Component(unit, props) {
  // Define behavior here
  // props = data passed to the component
}
```

#### 2. HTML 要素の生成
```js
const unit = xnew('<div class="my-class">', 'inner text');
unit.element; // Access the created DOM element
```

### 例 1: 最初のコンポーネント

コンポーネント 1 つ、要素 1 つ、わずか数行で動く最小のサンプルです。

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

実行結果の HTML は次のようになります。
```html
<body>
  <p>Hello, xnew!</p>
</body>
```

### 例 2: 複数の要素を並べる

`xnew.nest()` はネストの基準を切り替え、これ以降の要素を指定したコンテナの内側に配置します。HTML を直接書き連ねずに、構造化されたレイアウトを組み立てられます。

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

実行結果の HTML は次のようになります。
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
- `xnew.nest()` はコンテナ要素を生成し、後続の要素をその中にネストします
- コンポーネントから別のコンポーネントを呼び出して構造を分割できます
- 各コンポーネントは関数として再利用できます

### 例 3: インタラクションを追加する

下のボックスをクリックすると CSS 回転アニメーションが開始・停止します。`start` / `update` / `stop` のライフサイクルイベントが処理を担うため、`requestAnimationFrame` を手動で扱う必要はありません。

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
- `unit.on()` でイベントリスナーを登録します
- `unit.start()` / `unit.stop()` で更新ループを制御します
- `update` イベントは更新中、毎フレーム発火します

## 次のステップ

これで xnew を使い始める準備は整いました。次は以下のページに進んでください。

1. **[Basics — xnew](./basics/xnew)** — イベント・ライフサイクル・カスタムメソッドなどの API リファレンス
2. **[Basics — xnew.timeout / interval / transition](./basics/xnew.timeout)** — 自動クリーンアップ付きのタイマーと連鎖可能なトランジション
3. **[Addons — xpixi / xthree](./addons/xpixi)** — PixiJS / Three.js 連携
