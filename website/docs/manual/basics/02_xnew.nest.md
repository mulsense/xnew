# xnew.nest

`xnew.nest` は子要素を生成し、`unit.element` をその要素に切り替えます。これ以降に生成される要素は新しい要素の中に配置されるため、親要素を手動で参照する必要はありません。

## 使い方

```js
const element = xnew.nest(htmlString);
```

**パラメータ:**
- `htmlString`: 要素を生成するための HTML 文字列 (例: `'<div>'`, `'<span class="highlight">'`)

**戻り値:**
- 生成された HTMLElement

**副作用:**
- `unit.element` が生成された要素を指すようになります

## 動作

`xnew.nest` は次の 2 つを同時に行います。

1. 現在の要素の子として新しい要素を生成します。
2. `unit.element` を切り替え、以降の `xnew()` がその内側に配置されるようにします。

`xnew(() => { ... })` でブロックを囲むと、コンテキストの切り替えはそのスコープ内に限定され、内部関数の終了時に親レベルへ戻ります。これにより多階層レイアウトを簡潔に構築できます。

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

### ネストレベルの管理

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

## ポイント

- **コンテキストの切り替え** — `xnew.nest` は `unit.element` を生成した要素に切り替えます。
- **スコープ付きネスト** — ブロックを `xnew()` で囲むことで切り替えをスコープ内に限定できます。内部関数の終了時に親レベルへ戻ります。
- **戻り値** — `xnew.nest` は生の `HTMLElement` を返すため、直接アクセスが必要なケースにも対応します。
- **自動クリーンアップ** — ネストされた要素は親 unit の finalize 時に削除されます。

:::tip
要素階層を保ちたい場合は、ネストしたブロックを `xnew()` で囲んでください。内部の `xnew()` が終了すると、コンテキストは親レベルに戻ります。
:::
