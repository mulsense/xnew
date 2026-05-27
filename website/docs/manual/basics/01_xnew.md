# xnew

`xnew` はライブラリの中核となる関数で、コンポーネントの実体である **unit** を生成します。unit が破棄されると、内部のタイマー・リスナー・子要素はまとめて自動で解放されるため、後片付けのコードは不要です。

## 使い方

引数はすべて省略可能で、単発の要素生成からコンポーネントツリーの構築まで柔軟に対応します。

```js
const unit = xnew(target, Component, props); // or xnew(Component, props)

function Component(unit, props) {
  // Define component behavior here
}
```
- `target` *(省略可)* — アタッチ先の HTML 要素です。DOM 要素または `'<div class="box">'` のような HTML 文字列を指定します。省略すると親のコンテキストを継承します。
- `Component` *(省略可)* — この unit の振る舞いを定義する関数です。
- `props` *(省略可)* — コンポーネント関数の第 2 引数として渡されるデータです。

## コンポーネント

コンポーネントは関数です。所属する unit と、呼び出し時に渡された props を受け取ります。継承や拡張のための特別な記法はありません。

### シンプルなコンポーネント
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

### アロー関数によるコンポーネント
```js
const unit = xnew((unit, props) => {
  // Component logic here
  unit.element.style.color = 'blue';
});
```

## ターゲット指定

`target` パラメータはコンポーネントのアタッチ先を決めます。コンポーネント内ではいつでも `unit.element` から参照できます。

### 既存要素へのアタッチ

要素参照を渡すと、その既存要素にアタッチします。

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

HTML 文字列を渡すと、新しい要素を生成してアタッチします。

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

`target` を省略すると、親のコンテキストから要素を継承します。

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

### textContent の指定

要素生成と同時にテキスト内容を指定できます。

```js
// Create element with content
xnew('<p>', 'This is the paragraph content');

// Equivalent to:
xnew('<p>', (unit) => {
  unit.element.textContent = 'This is the paragraph content';
});
```

## イベントシステム

DOM イベント・ライフサイクルイベント・カスタムイベントは、すべて `unit.on` / `unit.off` で扱います。

### イベントリスナーの登録

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

### イベントリスナーの解除

`unit.off()` でリスナーを解除します。

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

ライフサイクル全体は 5 つのイベントでカバーされます。必要なものだけを購読してください。

### 一覧

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

### 例: アニメーションカウンター

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

unit のライフサイクルは 3 つのメソッドで制御します。`start` で開始、`stop` で停止、`finalize` で破棄します。

### `unit.start()`
更新ループを開始します。コンポーネントは既定で自動的に開始されます。

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
更新ループを停止します。コンポーネント自体は生存し続けますが、`update` は呼ばれなくなります。

```js
const unit = xnew((unit) => {
  unit.on('click', () => {
    unit.stop(); // Stop updates when clicked
  });
});
```

### `unit.finalize()`
コンポーネントを破棄し、要素を DOM から削除します。

```js
const unit = xnew('<div>', 'Click to destroy me');

unit.on('click', () => {
  unit.finalize(); // Element will be removed from DOM
});
```

### ライフサイクルの実行順序

子のイベントは親より**先に**発火します。これにより、子は親の `start` より前に初期化を終え、親の `stop` より前に後片付けを完了できます。

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

標準の DOM イベント名はそのまま `unit.on` に渡せます。コールバックはネイティブの DOM Event を含む `{ event }` を受け取ります。

```js
function InteractiveButton(unit) {
  xnew.nest('<button>', 'Hover and click me');

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

const button = xnew(InteractiveButton);
```

## カスタムイベント

イベント名のプレフィックスで通信範囲を切り替え、コンポーネント間を疎結合に保ったまま通信できます。

### グローバルイベント (`+` プレフィックス)

`+` を付けたイベントは、起動中のすべてのコンポーネントから受信できます。スコア更新・ゲームオーバー通知・テーマ変更など、アプリ全体に届けたい通知に適しています。

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

### 内部イベント (`-` プレフィックス)

`-` を付けたイベントは、そのコンポーネントと直接の親のみが受信します。子から親への通知をアプリ全体に漏らしたくない場合に使います。

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

コンポーネント関数からオブジェクトを返すと、そのプロパティが unit に組み込まれます。内部状態をカプセル化しつつ、必要な操作だけを外部に公開できます。

### 基本

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

### 予約済みのプロパティ名

カスタムプロパティに次の名前は使えません。
- `start`, `stop`, `finalize`
- `element`, `on`, `off`,
- `_` (内部用)


次は [`xnew.nest`](./xnew.nest) で、ネスト構造を簡潔に組み立てる方法を確認してください。

