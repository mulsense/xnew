# xnew.nest

`xnew.nest` は子要素を生成して `unit.element` をその要素に切り替えます。以降に生成される要素は新しい要素の内側に配置されるため、親要素を変数で持ち回る必要はありません。

## 使い方

```js
const element = xnew.nest(htmlString);
```

**パラメータ:**
- `htmlString`: 要素を生成するための HTML 文字列 (例: `'<div>'`、`'<span class="highlight">'`)

**戻り値:**
- 生成された HTMLElement (`unit.element` も同じ要素を指すようになります)

## 動作

`xnew.nest` は現在の要素の子として新しい要素を生成し、以降の `xnew()` がその内側に配置されるようコンテキストを切り替えます。`xnew(() => { ... })` でブロックを囲めば、切り替えはそのブロック内に限定され、関数を抜けると親の階層に戻ります。

## 例

### 基本

```js
xnew((unit) => {
  // Initially, unit.element is document.body

  xnew.nest('<header>');
  // Now unit.element === header

  xnew.nest('<h1>');
  unit.element.textContent = 'Welcome';
  // h1 is created inside header
});

// Result:
// <header>
//   <h1>Welcome</h1>
// </header>
```

### ネスト階層の制御

```js
function Card(unit, { title, content }) {
  xnew.nest('<div class="card">');
  unit.element.style.border = '1px solid #ddd';
  unit.element.style.padding = '15px';

  // Create and immediately exit header
  xnew((unit) => {
    xnew.nest('<div class="card-header">');
    unit.element.style.fontWeight = 'bold';
    unit.element.textContent = title;
  });
  // After the nested xnew, we're back to the card level

  // Create body at card level
  xnew((unit) => {
    xnew.nest('<div class="card-body">');
    unit.element.textContent = content;
  });
}

xnew(Card, {
  title: 'My Card',
  content: 'This is the card content'
});

// Result:
// <div class="card">
//   <div class="card-header">My Card</div>
//   <div class="card-body">This is the card content</div>
// </div>
```

ネストされた要素は、親 unit の finalize 時にまとめて削除されます。
