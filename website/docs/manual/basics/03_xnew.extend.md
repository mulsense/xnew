# xnew.extend

`xnew.extend` は現在の unit のコンテキストで別のコンポーネント関数を実行し、その返り値の API を unit にマージします。新しい要素は生成されず、振る舞いをミックスインするだけです。

これは再利用可能な「ミックスイン」を構築する方法です。ドラッグ、ロギング、キーボード操作などの機能を追加するコンポーネントを書いておけば、他の任意のコンポーネントに 1 行で組み込めます。

## 使い方

```js
xnew.extend(Component, props);
```

**パラメータ:**
- `Component`: 拡張に使用するコンポーネント関数
- `props`: コンポーネント関数に渡される任意のプロパティ

**動作:**
- 現在の unit のコンテキストで即座にコンポーネント関数を実行します。
- 返されたプロパティ/メソッドを現在の unit にマージします。
- イベントハンドラは累積されます。後の拡張で上書きされることはありません。
- 2 つの拡張が同じプロパティ名を返した場合、後のものが優先されます。

## 例

### ロガーのミックスイン

```js
function Logger(unit) {
  return {
    log(message) {
      console.log(`[${new Date().toISOString()}]`, message);
    }
  };
}

const unit = xnew((unit) => {
  xnew.extend(Logger);

  unit.log('Application started'); // immediately available
});

// Output: [2025-01-15T10:30:00.000Z] Application started
```

### 振る舞いのミックスイン（ドラッグ可能化）

より実用的な例として、ドラッグロジックを独自のコンポーネントに切り出して、どこでも再利用できるようにします：

```js
function Draggable(unit) {
  let dragging = false;
  let startX, startY, originX, originY;

  unit.on('mousedown', ({ event }) => {
    dragging = true;
    startX = event.clientX;
    startY = event.clientY;
    originX = parseInt(unit.element.style.left) || 0;
    originY = parseInt(unit.element.style.top)  || 0;
  });

  unit.on('window.mousemove', ({ event }) => {
    if (!dragging) return;
    unit.element.style.left = originX + (event.clientX - startX) + 'px';
    unit.element.style.top  = originY + (event.clientY - startY) + 'px';
  });

  unit.on('window.mouseup', () => { dragging = false; });

  return { get isDragging() { return dragging; } };
}

// Any component can become draggable with one line:
function Card(unit) {
  xnew.extend(Draggable);
  xnew.nest('<div class="card" style="position:absolute;">');
  xnew('<p>', 'Drag me!');
}

xnew(Card);
```

:::note
`xnew.extend` はコンポーネントの初期化中（コンポーネント関数の内部）でのみ呼び出せます。unit が生成された後に呼び出すことはできません。
:::

