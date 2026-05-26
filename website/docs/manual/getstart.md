---
sidebar_position: 1
---

# Get Started

**10分以内に、あなたの最初のコンポーネントが動き出します。**

## xnew とは?

`xnew` は、コンポーネント指向プログラミングのための JavaScript / TypeScript ライブラリです。

考え方はシンプルです。コンポーネントはただの関数です。`xnew(MyComponent)` と呼び出せば、xnew が DOM、ライフサイクル、イベントの配線をすべて面倒見てくれます。クラスもボイラープレートもなく、コンポーネントの振る舞いを記述する関数があるだけです。

xnew が特に便利なポイント:

- **自動クリーンアップ** — コンポーネント内で作成したタイマー、イベントリスナー、DOM 要素は、コンポーネントが破棄されるときにまとめて片付けられます。メモリリークを追いかける必要はもうありません。
- **組み込みのアニメーションループ** — `update` イベントが毎フレーム (約60fps) 発火するので、アニメーションは簡単に書けます。
- **柔軟なイベントシステム** — コンポーネント同士は、グローバル (`+event`) または内部 (`-event`) のカスタムイベントを通じて、密結合にならずにやり取りできます。
- **ゲーム開発向けアドオン** — 公式の PixiJS / Three.js 連携により、同じコンポーネントモデルで複雑なインタラクティブアプリを構築できます。

## セットアップ

xnew をプロジェクトに組み込む方法は、以下から選んでください:

### CDN 経由 (初心者におすすめ)
HTML ファイルに以下のスクリプトを記述します:
```html
<script src="https://unpkg.com/@mulsense/xnew@0.7.x/dist/xnew.js"></script>
```
### CDN 経由 (ESM)
`import map` を使って ES モジュール版を読み込みます:
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
npm で `xnew` をインストールします:
```bash
npm install @mulsense/xnew@0.7.x
```

JavaScript ファイルでインポートして使います:
```js
import xnew from '@mulsense/xnew';
```

## チュートリアル

覚えるべき概念は2つだけです。それさえ押さえれば、あとは進むだけです:

- **unit** — `xnew()` が返すオブジェクトです。1つのコンポーネントインスタンスに対する DOM 要素、ライフサイクル制御、イベントリスナーを保持します。
- **コンポーネント** — `(unit, props)` を受け取り、その unit の振る舞いを定義する素の関数です。

### 基本構文
`xnew` の使い方は大きく2つあります:

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

考えられる最小の xnew プログラムです。コンポーネント1つ、要素1つ、5行だけ:

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

このコードは次の HTML を生成します:
```html
<body>
  <p>Hello, xnew!</p>
</body>
```

### 例2: 複数の要素を作る

`xnew.nest()` はネストのコンテキストをずらし、以降の要素がコンテナの中に配置されるようにします。これを使えば、HTML の壁を書かずに構造化されたレイアウトを組み立てられます:

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

生成される HTML はこちら:
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

**重要なポイント:**
- `xnew.nest()` はコンテナ要素を作成し、以降の要素をその中にネストします
- コンポーネントは他のコンポーネントを呼び出してコードを整理できます
- 各コンポーネントは再利用可能な関数です

### 例3: インタラクションを加える

ここからが xnew の本領発揮です。下のボックスをクリックすると、CSS による回転アニメーションが開始・停止します。`start`、`update`、`stop` のライフサイクルイベントがすべて面倒を見てくれるため、手動で `requestAnimationFrame` を管理する必要はありません:

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

**重要なポイント:**
- `unit.on()` でコンポーネントにイベントリスナーを追加できます
- `unit.start()` と `unit.stop()` でアニメーションを制御します
- `update` イベントはアニメーション中に連続して発火します

## 次のステップ

これで xnew で開発を始めるのに必要なことはすべて押さえました。次は以下を参考にしてください:

1. **[Basics — xnew](./basics/xnew)** — イベント、ライフサイクル、カスタムメソッドなどの完全な API リファレンス
2. **[Basics — xnew.timeout / interval / transition](./basics/xnew.timeout)** — 自動クリーンアップとチェイン可能なトランジションを備えたタイマー
3. **[Addons — xpixi / xthree](./addons/xpixi)** — PixiJS / Three.js との手軽な連携
