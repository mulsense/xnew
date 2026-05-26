# xnew

`xnew` はライブラリの中核となる関数です。**unit** を生成します。unit とは自身の DOM 要素、イベントリスナー、ライフサイクルを所有する自己完結型のコンポーネントインスタンスです。

重要なポイントは、unit が破棄されたとき、その内部にあるすべて（タイマー、リスナー、子要素）が自動的にクリーンアップされることです。後片付けのコードを手書きする必要はありません。

## 概要

`xnew` が提供する機能：

- **再利用可能なコンポーネント** — クラス構文不要のプレーンな関数
- **自動的な DOM 管理** — 宣言的に要素を生成またはアタッチ
- **組み込みのイベントシステム** — DOM イベント、ライフサイクルイベント、カスタムイベントを統一 API で扱える
- **組み合わせ可能なビルディングブロック** — コンポーネントを互いにネストすることで任意の構造を構築可能

## 使い方

すべての引数はオプションのため、`xnew` は単一の使い捨て要素から完全なコンポーネントツリーまで柔軟に対応します。

```js
const unit = xnew(target, Component, props); // or xnew(Component, props)

function Component(unit, props) {
  // Define component behavior here
}
```
- `target` *(オプション)* — アタッチする HTML 要素。DOM 要素、`'<div class="box">'` のような HTML 文字列を渡すか、省略して親のコンテキストから継承します。
- `Component` *(オプション)* — この unit の動作を定義する関数。
- `props` *(オプション)* — コンポーネント関数の第二引数として渡されるデータ。

## コンポーネント

コンポーネントは単なる関数です。所属する unit と、呼び出し元から渡された props を受け取ります。継承や拡張に関する特別なルールはありません。

### シンプルなコンポーネントの例
```js
function MyComponent(unit, { message }) {
  // Access the HTML element
  console.log(unit.element);
  
  // Use props data
  unit.element.textContent = props.message;
}

// Create a unit with this component
const unit = xnew(MyComponent, { message: 'Hello World' });
```

### アロー関数コンポーネント
```js
const unit = xnew((unit, props) => {
  // Component logic here
  unit.element.style.color = 'blue';
});
```

## ターゲット指定

`target` パラメータは、コンポーネントがアタッチされる要素を決定します。コンポーネント内のどこからでも `unit.element` でアクセスできます。

### 既存要素をターゲットにする

要素参照を使って既存の HTML 要素をターゲットにします：

```html
<body>
  <div id="my-container"></div>
  <script>
    const element = document.querySelector('#my-container'); // HTML element
    xnew(element, (unit) => {
      unit.element.style.background = 'my text';
    });
  </script>
</body>
```

### 新しい要素の生成

HTML 文字列を target に渡すと、新しい HTML 要素を生成します：

```html
<body>
  <script>
    xnew('<div class="new-element">', (unit) => {
      unit.element.textContent = 'I am a new element!';
    });
  </script>
</body>
```

### 要素の継承

target を指定しない場合、xnew は親コンテキストから要素を継承します：

```html
<div id="parent"></div>
<script>
  xnew(document.querySelector('#parent'), (unit) => {
    // unit.element is the #parent div
    
    xnew((unit) => {
      // unit.element is inherited: still the #parent div
    });
    
    xnew('<span>', (unit) => {
      // unit.element is the new <span>, child of #parent
    });
  });
</script>
```

### textContent の設定

要素生成時に直接コンテンツを設定できます：

```js
// Create element with content
xnew('<p>', 'This is the paragraph content');

// Equivalent to:
xnew('<p>', (unit) => {
  unit.element.textContent = 'This is the paragraph content';
});
```

## イベントシステム

xnew は DOM イベント、ライフサイクルイベント、カスタムイベントのすべてに対して単一の統一 API（`unit.on` / `unit.off`）を使用します。カテゴリごとに追加で覚えることはありません。

### イベントリスナーの追加

```js
function MyComponent(unit) {
  xnew.nest('<div>', 'click here');

  // Listen for click events on the element
  unit.on('click', ({ event }) => {
    console.log('Element was clicked!');
  });
}

const unit = xnew(MyComponent);

// You can also add listeners from outside the component
unit.on('click', ({ event }) => {
  console.log('External click listener');
});
```

### イベントリスナーの削除

`unit.off()` でイベントリスナーを削除します：

```js
const unit = xnew(MyComponent);

// Remove all listeners
unit.off();

// Remove all listeners of a specific type
unit.off('click');

// Remove a specific listener function
function myClickHandler({ event }) {
  console.log('Clicked');
}
unit.on('click', myClickHandler);
unit.off('click', myClickHandler);
```

## ライフサイクルイベント

以下の 5 つのイベントがコンポーネントの全ライフサイクルをカバーします。必要なものだけリッスンすれば十分です。

### 利用可能なライフサイクルイベント

```js
function MyComponent(unit) {
  unit.on('start', () => {
    // Called once before the first update
    console.log('Component started');
  });

  unit.on('update', () => {
    // Called continuously at ~60fps (or your browser's refresh rate)
    // Use for animations and real-time updates
    console.log('update');
  });

  unit.on('render', () => {
    // render after update
    console.log('render');
  });

  unit.on('stop', () => {
    // Called when the update loop is stopped
    console.log('Component stopped');
  });

  unit.on('finalize', () => {
    // Called when the component is destroyed
    console.log('Component finalized');
  });
}

const unit = xnew(MyComponent);
```

### ライフサイクルの例：アニメーションカウンター

```js
function AnimatedCounter(unit, { maxCount }) {
  xnew.nest('<div>');

  unit.on('start', () => {
    unit.element.textContent = '0';
  });

  let count = 0;
  unit.on('update', (count) => {
    if (count < maxCount) {
      unit.element.textContent = count++;
    } else {
      unit.stop(); // Stop when target reached
    }
    unit.element.textContent = count;
  });

  unit.on('stop', () => {
    console.log('Counting finished!');
  });
}

const counter = xnew('<div>', AnimatedCounter, { maxCount: 50 });
```

## ライフサイクル制御メソッド

3 つのメソッドで unit のライフサイクルを完全に制御できます。`start` で開始、`stop` で停止、`finalize` で完全に破棄します。

### `unit.start()`
update ループを開始します。コンポーネントはデフォルトで自動的に開始されます。

```js
const unit = xnew((unit) => {
  unit.stop(); // Prevent auto-start

  unit.on('update', () => {
    console.log('Updating...');
  });
});

// Manually start later
xnew.timeout(() => {
  unit.start();
}, 2000);
```

### `unit.stop()`
update ループを停止します。コンポーネントは生存し続けますが、更新は行われません。

```js
const unit = xnew((unit) => {
  unit.on('click', () => {
    unit.stop(); // Stop updates when clicked
  });
});
```

### `unit.finalize()`
コンポーネントを完全に破棄し、要素を DOM から削除します。

```js
const unit = xnew('<div>', 'Click to destroy me');

unit.on('click', () => {
  unit.finalize(); // Element will be removed from DOM
});
```

```js
function RandomColor(unit) {
  const colors = ['red', 'blue', 'green', 'yellow'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  unit.element.style.background = randomColor;
}

const unit = xnew('<div style="width:100px;height:100px;">', RandomColor);

// Reboot to get a new random color
xnew.interval(() => {
  unit.reboot();
}, 1000);
```

### ライフサイクルの実行順序

子のイベントは必ず親のイベントよりも**先に**発火します。つまり、子は親の `start` が実行される前にセットアップを完了し、親の `stop` が実行される前に後片付けを完了します。

```js
function Parent(unit) {
  xnew(Child1);
  xnew(Child2);

  unit.on('start', () => console.log('Parent start'));
  unit.on('update', () => console.log('Parent update'));
  unit.on('render', () => console.log('Parent render'));
  unit.on('stop', () => console.log('Parent stop'));
}

function Child1(unit) {
  unit.on('start', () => console.log('Child1 start'));
  unit.on('update', () => console.log('Parent update'));
  unit.on('render', () => console.log('Child1 render'));
  unit.on('stop', () => console.log('Child1 stop'));
}

function Child2(unit) {
  unit.on('start', () => console.log('Child2 start'));
  unit.on('update', () => console.log('Parent update'));
  unit.on('render', () => console.log('Child2 render'));
  unit.on('stop', () => console.log('Child2 stop'));
}

const parent = xnew(Parent);
```

**出力:**
```
Child1 start
Child2 start
Parent start

Child1 update
Child2 update
Parent update
Child1 render
Child2 render
Parent render
(repeats...)

// When parent.stop() is called:
Child1 stop
Child2 stop
Parent stop
```

## DOM イベント

標準的な DOM イベント名は `unit.on` でそのまま利用できます。コールバックはネイティブの DOM Event オブジェクトを含む `{ event }` を受け取ります。

```js
function InteractiveButton(unit) {
  unit.on('click', ({ event }) => {
    console.log('Button clicked!');
    event.preventDefault(); // Standard DOM event object
  });
  
  unit.on('mouseover', ({ event }) => {
    unit.element.style.background = 'lightblue';
  });
  
  unit.on('mouseout', ({ event }) => {
    unit.element.style.background = '';
  });
}

const button = xnew('<button>Hover and click me</button>', InteractiveButton);
```

## カスタムイベント

コンポーネント同士は密結合にならずに通信する必要があります。xnew はプレフィックスベースのイベントシステムでこの問題を解決します。

### グローバルイベント（`+` プレフィックス）

`+` プレフィックスを付けたイベントは、アプリ内で動作中のすべてのコンポーネントから可視になります。スコア更新、ゲームオーバー通知、テーマ変更などに便利です：

```js
function Sender(unit) {
  xnew.nest('<button>', 'Send Message');

  unit.on('click', () => {
    // Emit global event
    xnew.emit('+message', { 
      text: 'Hello from sender!',
      timestamp: Date.now()
    });
  });
}

function Receiver(unit) {
  xnew.nest('<div>', 'Waiting for message...');
 
 // Listen for global events
  unit.on('+message', (data) => {
    console.log('Received message:', data.text);
    unit.element.textContent = data.text;
  });
}

// These components can communicate even though they're not related
xnew(Sender);
xnew(Receiver);
```

### 内部イベント（`-` プレフィックス）

`-` プレフィックスを付けたイベントは、そのコンポーネントと直接の親のみにスコープが限定されます。アプリの他の部分に漏れずに、子から親へ報告したい場合に最適です：

```js
function Timer(unit) {
  let seconds = 0;

  unit.on('update', () => {
    seconds++;
    if (seconds % 60 === 0) {
      // Emit internal event every minute
      xnew.emit('-message', { minutes: seconds / 60 });
    }
  });
}

// Parent can listen to child's internal events
const timer = xnew(Timer);
timer.on('-message', (data) => {
  console.log(`${data.minutes} minute(s) have passed!`);
});
```

## カスタムメソッド

コンポーネント関数からオブジェクトを返すと、そのプロパティが unit の公開 API に組み込まれます。これがカプセル化を保ちつつ、呼び出し元に振る舞いを公開する最もクリーンな方法です。

### 基本的なカスタムメソッド

```js
function Counter(unit) {
  let count = 0;
  
  // Return public API (methods, getter, setter)
  return {
    increment() {
      count++;
    },
    value() {
      return count;
    },
  };
}

const counter = xnew(Counter);

// Use custom methods
counter.increment();          // count: 1
console.log(counter.value()); // 1
```

### ゲッターとセッター

```js
function ColorBox(unit) {
  let currentColor = 'red';
  
  // Set initial color
  unit.element.style.background = currentColor;
  
  return {
    set color(newColor) {
      currentColor = newColor;
      unit.element.style.background = currentColor;
    },
    
    get color() {
      return currentColor;
    },
    
    randomize() {
      const colors = ['red', 'blue', 'green', 'yellow', 'purple'];
      this.color = colors[Math.floor(Math.random() * colors.length)];
    }
  };
}

const box = xnew('<div style="width:100px;height:100px;">', ColorBox);

// Use getters and setters
box.color = 'blue';        // Setter
console.log(box.color);    // Getter: "blue"
box.randomize();           // Custom method
```

### 予約済みプロパティ名

カスタムプロパティを定義する際は、以下の予約名を避けてください：
- `start`, `stop`, `finalize`
- `element`, `on`, `off`,
- `_` (内部利用)


次は [`xnew.nest`](./xnew.nest) を参照し、ネストされた要素構造をクリーンに構築する方法を確認してください。

