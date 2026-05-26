# xnew.nest

`xnew.nest` は子要素を生成し、`unit.element` をその要素に切り替えます。この呼び出し以降に生成される要素は、自動的に新しい要素の中に配置されます。親要素への手動参照は不要です。

## 使い方

```js
const element = xnew.nest(htmlString);
```

**パラメータ:**
- `htmlString`: 要素を生成するための HTML 文字列（例: `'<div>'`, `'<span class="highlight">'`）

**戻り値:**
- 新しく生成された HTMLElement

**副作用:**
- `unit.element` が新しく生成された要素を指すようになります

## 動作の仕組み

`xnew.nest` は同時に 2 つのことを行います：

1. 現在の要素の子として新しい要素を生成します。
2. `unit.element` を切り替え、次の `xnew()` 呼び出しがその内側に配置されるようにします。

ブロックをネストされた `xnew(() => { ... })` 呼び出しで包むと、コンテキストの切り替えがそのスコープに限定され、内部関数が終了すると親レベルに復元されます。これが多階層レイアウトをクリーンに構築する方法です。

## 例

### 基本的なネスト

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

## 主要な概念

- **コンテキストの切り替え** — `xnew.nest` は `unit.element` を新しく生成された要素に変更します。
- **スコープ付きネスト** — ブロックをネストされた `xnew()` 呼び出しで包むことで、コンテキストの切り替えを限定できます。内部関数が終了すると親レベルが復元されます。
- **戻り値** — `xnew.nest` は raw な `HTMLElement` を返すため、直接アクセスが必要な場合にも対応できます。
- **自動クリーンアップ** — ネストされた要素は親 unit が finalize されると削除されます。

:::tip
適切な要素階層を維持するためにネストされた `xnew()` 呼び出しを使用してください。ネストされた `xnew()` が完了すると、コンテキストは親レベルに戻ります。
:::
